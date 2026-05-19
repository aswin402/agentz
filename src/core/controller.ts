import { EventEmitter } from "events";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import type {
  AgentType,
  ModelConfig,
  SubagentInstance,
  SubagentResult,
  SubagentStatus,
  PrimaryAction,
  PrimaryDecision,
  IntentType,
  Task,
  Plan,
  Spec,
  BoulderState,
} from "../types/index.js";
import { ConfigManager } from "../core/config.js";
import { ModelRouter } from "../agents/router.js";
import { AgentFactory, classifyIntent } from "../agents/factory.js";
import { SharedMemory } from "../runtime/memory.js";
import { SpecWorkflow } from "../workflow/spec.js";
import { VerificationPipeline } from "../verification/pipeline.js";

// ============================================================================
// Primary Controller Orchestrator
// ============================================================================

export class PrimaryController extends EventEmitter {
  private configManager: ConfigManager;
  private modelRouter: ModelRouter;
  private sharedMemory: SharedMemory;
  private specWorkflow: SpecWorkflow;
  private verificationPipeline: VerificationPipeline;

  private activeSubagents: Map<string, SubagentInstance> = new Map();
  private currentTaskSlug: string | null = null;
  private currentPlan: Plan | null = null;
  private currentSpec: Spec | null = null;
  private primaryModel: string;
  private request: string = "";
  private loadedSkills: Map<string, string> = new Map();
  // FIFO queue for tasks that couldn't spawn due to concurrency limits
  private taskQueue: Array<{ task: Task; intent: AgentType[] }> = [];

  constructor(projectRoot: string = process.cwd()) {
    super();

    this.configManager = new ConfigManager(projectRoot);
    this.modelRouter = new ModelRouter(this.configManager);
    this.sharedMemory = new SharedMemory(join(projectRoot, ".agentz/runtime"));
    this.specWorkflow = new SpecWorkflow(projectRoot);
    this.verificationPipeline = new VerificationPipeline(projectRoot);

    this.primaryModel = this.configManager.getPrimaryModel();
    this.loadSkills(projectRoot);
  }

  // ============================================================================
  // Skills Loading
  // ============================================================================

  private loadSkills(projectRoot: string): void {
    const skillsConfig = this.configManager.getConfig().skills;
    for (const source of skillsConfig.sources) {
      for (const skillName of skillsConfig.enable) {
        const skillPath = join(projectRoot, source, skillName, "SKILL.md");
        if (existsSync(skillPath)) {
          try {
            const content = readFileSync(skillPath, "utf-8");
            this.loadedSkills.set(skillName, content);
            this.log("info", `Loaded skill: ${skillName}`);
          } catch {
            this.log("warn", `Failed to load skill: ${skillName}`);
          }
        }
      }
    }
  }

  private getSkillsForAgent(agentType: AgentType): string[] {
    const skillMapping: Record<AgentType, string[]> = {
      planner: [],
      coder: ["git-master", "frontend-ui-ux"],
      tester: ["playwright", "git-master"],
      reviewer: ["git-master"],
      security: [],
      docs: ["git-master"],
      refactor: ["git-master"],
      debugger: ["git-master"],
      vision: ["frontend-ui-ux"],
    };
    return (skillMapping[agentType] || []).filter((s) => this.loadedSkills.has(s));
  }

  // ============================================================================
  // Main Entry Point
  // ============================================================================

  /**
   * Start a new task - main entry point for the controller
   */
  async startTask(request: string, hasImages: boolean = false): Promise<void> {
    this.request = request;
    this.log("info", `Starting task with request: ${request.substring(0, 100)}...`);

    // Step 1: Intent Classification
    const intent = classifyIntent(request, hasImages);
    this.log("info", `Classified intent: ${intent.join(", ")}`);

    // Step 2: Create task directory
    const taskName = this.extractTaskName(request);
    this.currentTaskSlug = this.specWorkflow.createTaskDir(taskName);
    this.specWorkflow.saveRequest(this.currentTaskSlug, request);

    // Step 3: Generate spec
    this.currentSpec = this.specWorkflow.generateSpec(this.currentTaskSlug, request);
    this.specWorkflow.saveSpec(this.currentTaskSlug, this.currentSpec);

    // Step 4: Generate plan
    this.currentPlan = this.specWorkflow.generatePlan(this.currentSpec);
    this.specWorkflow.savePlan(this.currentTaskSlug, this.currentPlan);

    // Step 5: Update boulder for cross-session continuity
    this.updateBoulder();

    // Step 6: Execute plan
    await this.executePlan(intent);

    // Step 7: Verify and complete
    await this.finalizeTask();
  }

  /**
   * Resume an interrupted task
   */
  async resumeTask(taskSlug?: string): Promise<void> {
    const boulder = this.sharedMemory.getBoulder();
    if (!boulder) {
      throw new Error("No interrupted task to resume");
    }

    this.currentTaskSlug = taskSlug || boulder.activeTask;
    this.currentPlan = this.specWorkflow.readPlan(this.currentTaskSlug!);

    if (!this.currentPlan) {
      throw new Error(`Cannot find plan for task: ${this.currentTaskSlug}`);
    }

    this.log("info", `Resuming task: ${this.currentTaskSlug}`);

    // Continue execution
    const intent = classifyIntent(this.request);
    await this.executePlan(intent);
    await this.finalizeTask();
  }

  // ============================================================================
  // Plan Execution
  // ============================================================================

  private async executePlan(intent: AgentType[]): Promise<void> {
    if (!this.currentPlan || !this.currentTaskSlug) {
      throw new Error("No active plan to execute");
    }

    const pendingTasks = this.currentPlan.tasks.filter(
      (t) => t.status === "pending"
    );

    this.log("info", `Executing ${pendingTasks.length} pending tasks`);

    // Determine parallel groups based on dependencies
    const parallelGroups = this.groupTasksForParallelism(pendingTasks);

    for (const group of parallelGroups) {
      if (group.length === 1) {
        // Sequential execution
        await this.executeTask(group[0], intent);
      } else {
        // Parallel execution
        await this.executeTasksInParallel(group, intent);
      }

      // After each group, verify results
      const verificationResult = await this.verifyCurrentProgress();
      if (!verificationResult.success && this.configManager.getVerificationConfig().autoFix) {
        this.log("warn", "Verification failed, attempting auto-fix...");
        await this.attemptAutoFix(group[0]);
      }
    }
  }

  private async executeTask(task: Task, intent: AgentType[]): Promise<void> {
    if (!this.currentTaskSlug) return;

    // Determine which agent should handle this task
    const agentType = this.determineAgentForTask(task, intent);
    const model = this.modelRouter.getNextModel(agentType, 0);

    if (!model) {
      throw new Error(`No model available for agent type: ${agentType}`);
    }

    // Log decision
    this.logDecision({
      action: "spawn",
      reason: `Task "${task.name}" assigned to ${agentType} using ${model.provider}/${model.model}`,
      agentId: task.id,
      model,
    });

    // Create subagent instance
    const subagent = this.createSubagent(task, agentType, model);

    // Execute with timeout handling
    const result = await this.executeWithFallback(subagent, task);

    // Process result
    if (result.success) {
      this.specWorkflow.updateTaskStatus(this.currentTaskSlug, task.id, "completed");
      this.specWorkflow.appendImplementationLog(
        this.currentTaskSlug,
        `Task "${task.name}" completed by ${agentType}\n\nOutput:\n${result.output}`
      );
    } else {
      this.specWorkflow.updateTaskStatus(this.currentTaskSlug, task.id, "failed");
      this.log("error", `Task "${task.name}" failed: ${result.error}`);
    }

    // Record learnings
    if (result.learnings) {
      for (const learning of result.learnings) {
        this.sharedMemory.addLearning(learning);
      }
    }
  }

  private async executeTasksInParallel(tasks: Task[], intent: AgentType[]): Promise<void> {
    const parallelConfig = this.configManager.getParallelConfig();
    const promises: Promise<void>[] = [];

    for (const task of tasks) {
      const agentType = this.determineAgentForTask(task, intent);
      const model = this.modelRouter.getNextModel(agentType, 0);

      if (!model) {
        this.log("warn", `No model available for agent type: ${agentType}, queuing task "${task.name}".`);
        this.taskQueue.push({ task, intent });
        continue;
      }

      const canSpawn = this.modelRouter.canSpawn(model.provider, model.model, parallelConfig);

      if (canSpawn.canSpawn) {
        promises.push(this.executeTask(task, intent));
      } else {
        // Queue instead of silently dropping
        this.log("warn", `Cannot spawn agent: ${canSpawn.reason}. Queuing task "${task.name}".`);
        this.taskQueue.push({ task, intent });
      }
    }

    await Promise.all(promises);

    // Drain the queue now that slots have freed up
    await this.drainTaskQueue();
  }

  /**
   * Drain the FIFO task queue, spawning queued tasks as concurrency allows.
   */
  private async drainTaskQueue(): Promise<void> {
    const parallelConfig = this.configManager.getParallelConfig();

    while (this.taskQueue.length > 0) {
      const entry = this.taskQueue[0]!;
      const { task, intent } = entry;
      const agentType = this.determineAgentForTask(task, intent);
      const model = this.modelRouter.getNextModel(agentType, 0);

      if (!model) {
        this.log("error", `No model for agent type "${agentType}", skipping queued task "${task.name}".`);
        this.taskQueue.shift();
        continue;
      }

      const canSpawn = this.modelRouter.canSpawn(model.provider, model.model, parallelConfig);
      if (!canSpawn.canSpawn) {
        // Still blocked — stop draining for now, will retry in next wave
        this.log("info", `Queue blocked: ${canSpawn.reason}. Remaining: ${this.taskQueue.length} task(s).`);
        break;
      }

      this.taskQueue.shift();
      await this.executeTask(task, intent);
    }
  }

  // ============================================================================
  // Subagent Execution with Fallback
  // ============================================================================

  private async executeWithFallback(
    subagent: SubagentInstance,
    task: Task
  ): Promise<SubagentResult> {
    let attemptIndex = 0;
    let lastError: string = "";
    const maxAttempts = this.configManager.getVerificationConfig().maxAttempts;
    // Per-agent wall-clock timeout from the agent spec
    const timeoutSeconds = this.modelRouter.getTimeout(subagent.type);

    while (attemptIndex < maxAttempts) {
      const model = this.modelRouter.getNextModel(subagent.type, attemptIndex);

      if (!model) {
        return {
          success: false,
          error: `All models exhausted for agent type: ${subagent.type}`,
        };
      }

      try {
        // Update subagent with current model
        subagent.model = model;
        subagent.status = "running";
        this.modelRouter.recordRequestStart(model.provider, model.model);

        // Update shared memory
        this.sharedMemory.updateSubagentStatus(
          subagent.id,
          subagent.type,
          "running",
          `Attempt ${attemptIndex + 1} using ${model.provider}/${model.model}`
        );

        // Log decision
        this.logDecision({
          action: "spawn",
          reason: `Attempt ${attemptIndex + 1} for task "${task.name}" using ${model.provider}/${model.model}`,
          agentId: subagent.id,
          model,
        });

        // Enforce wall-clock timeout via Promise.race — if agent stalls, the
        // timeout rejects and the catch block triggers the fallback chain.
        const timeoutPromise = new Promise<SubagentResult>((_, reject) =>
          setTimeout(
            () => reject(new Error(`timeout after ${timeoutSeconds}s`)),
            timeoutSeconds * 1000
          )
        );

        const result = await Promise.race([
          this.executeSubagent(subagent, task),
          timeoutPromise,
        ]);

        this.modelRouter.recordRequestEnd(model.provider, model.model);

        if (result.success) {
          subagent.status = "completed";
          subagent.result = result;
          this.sharedMemory.updateSubagentStatus(subagent.id, subagent.type, "completed");
          return result;
        }

        lastError = result.error || "Unknown error";
        this.log("warn", `Attempt ${attemptIndex + 1} failed: ${lastError}`);

      } catch (error) {
        lastError = error instanceof Error ? error.message : "Unknown error";
        this.modelRouter.recordRequestEnd(model.provider, model.model);
        this.log("warn", `Attempt ${attemptIndex + 1} error: ${lastError}`);
      }

      // Check if we should fallback
      const fallback = this.modelRouter.shouldFallback(subagent.type, attemptIndex, lastError);

      if (fallback.shouldFallback) {
        attemptIndex = fallback.nextIndex;
        this.logDecision({
          action: "fallback",
          reason: `Fallback triggered: ${lastError}`,
          agentId: subagent.id,
          details: { nextAttempt: attemptIndex, lastError },
        });
      } else {
        break;
      }
    }

    return {
      success: false,
      error: `All ${maxAttempts} attempts failed. Last error: ${lastError}`,
    };
  }

  private async executeSubagent(
    subagent: SubagentInstance,
    task: Task
  ): Promise<SubagentResult> {
    // Build subagent prompt with context, shared memory, and skills
    const sharedMemorySummary = this.sharedMemory
      .readSharedMemory()
      .map((e) => `[${e.agentType}] ${e.workPerformed.join(", ")}`)
      .join("\n");

    const previousLearnings = this.sharedMemory.getLearnings();
    const relevantSkillNames = this.getSkillsForAgent(subagent.type);
    const skills = relevantSkillNames.map((name) => this.loadedSkills.get(name) || "").filter(Boolean);

    const prompt = AgentFactory.createSubagentPrompt(subagent.type, {
      task: task.description,
      sharedMemory: sharedMemorySummary || undefined,
      previousLearnings: previousLearnings.length > 0 ? previousLearnings : undefined,
      skills: relevantSkillNames.length > 0 ? skills : undefined,
      artifacts: task.artifacts,
    });

    // Write the dispatch record to shared memory so the primary agent
    // and OpenCode task tool can track this agent's work.
    this.sharedMemory.writeEntry({
      agentId: subagent.id,
      agentType: subagent.type,
      timestamp: new Date(),
      status: "running",
      workPerformed: [`Dispatched: ${task.name}`],
      learnings: [],
      nextSteps: [],
      artifacts: task.artifacts,
    });

    // Return the structured prompt so the primary agent (running in OpenCode)
    // can dispatch via its `task` tool with the correct model and prompt.
    // The primary agent's system prompt instructs it to use the task tool;
    // this method provides the fully-formed prompt for that dispatch.
    return {
      success: true,
      output: prompt,
      artifacts: task.artifacts,
      learnings: [
        `Dispatched ${subagent.type} agent for: ${task.name} via ${subagent.model.provider}/${subagent.model.model}`,
        ...(relevantSkillNames.length > 0 ? [`Skills injected: ${relevantSkillNames.join(", ")}`] : []),
      ],
    };
  }

  // ============================================================================
  // Verification & Auto-fix
  // ============================================================================

  private async verifyCurrentProgress(): Promise<{ success: boolean; details: string }> {
    if (!this.currentTaskSlug || !this.currentPlan) {
      return { success: true, details: "No active task" };
    }

    try {
      const verification = await this.verificationPipeline.verify({
        id: "current",
        name: "Verification",
        description: "Current progress verification",
        status: "in_progress",
        dependencies: [],
        artifacts: this.currentPlan.tasks.flatMap((t) => t.artifacts),
        verificationCriteria: [],
      });

      const summary = this.verificationPipeline.getSummary();

      return {
        success: summary.failed === 0,
        details: `Passed: ${summary.passed}, Failed: ${summary.failed}, Skipped: ${summary.skipped}`,
      };
    } catch (error) {
      return {
        success: false,
        details: error instanceof Error ? error.message : "Verification failed",
      };
    }
  }

  private async attemptAutoFix(task: Task): Promise<void> {
    this.log("info", `Attempting auto-fix for task: ${task.name}`);

    // Spawn debugger subagent to attempt a fix
    const debuggerModel = this.modelRouter.getNextModel("debugger", 0);
    if (debuggerModel) {
      const fixSubagent = this.createSubagent(
        { ...task, name: `auto-fix: ${task.name}` },
        "debugger",
        debuggerModel
      );
      const result = await this.executeWithFallback(fixSubagent, {
        ...task,
        description: `AUTO-FIX ATTEMPT: The following task failed verification. Analyze the issue and fix it.\n\nOriginal task: ${task.name}\nDescription: ${task.description}\nArtifacts: ${task.artifacts.join(", ")}`,
      });

      this.specWorkflow.appendImplementationLog(
        this.currentTaskSlug!,
        result.success
          ? `Auto-fix succeeded for "${task.name}"\n\n${result.output}`
          : `Auto-fix failed for "${task.name}": ${result.error}`
      );
    } else {
      this.specWorkflow.appendImplementationLog(
        this.currentTaskSlug!,
        `Auto-fix skipped for "${task.name}" — no debugger model available`
      );
    }
  }

  // ============================================================================
  // Task Finalization
  // ============================================================================

  private async finalizeTask(): Promise<void> {
    if (!this.currentTaskSlug || !this.currentPlan) {
      return;
    }

    // Verify all tasks completed
    const failedTasks = this.currentPlan.tasks.filter((t) => t.status === "failed");
    const completedTasks = this.currentPlan.tasks.filter(
      (t) => t.status === "completed"
    );

    // Generate final summary
    this.specWorkflow.saveFinalSummary(this.currentTaskSlug, {
      objective: this.currentSpec?.objective || this.request,
      completedTasks: completedTasks.map((t) => t.name),
      failedTasks: failedTasks.map((t) => t.name),
      artifacts: this.currentPlan.tasks.flatMap((t) => t.artifacts),
      learnings: this.sharedMemory.getLearnings(),
      verificationResult: "See verification report for details",
    });

    // Archive session
    this.sharedMemory.archiveSession();

    // Clear boulder if task is complete
    if (failedTasks.length === 0) {
      this.sharedMemory.clearBoulder();
    }

    this.log("info", `Task ${this.currentTaskSlug} finalized. Completed: ${completedTasks.length}, Failed: ${failedTasks.length}`);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private createSubagent(task: Task, type: AgentType, model: ModelConfig): SubagentInstance {
    const id = `${type}-${randomUUID()}`;
    const instance: SubagentInstance = {
      id,
      type,
      model,
      status: "spawned",
      startedAt: new Date(),
      taskId: task.id,
    };

    this.activeSubagents.set(id, instance);
    return instance;
  }

  private determineAgentForTask(task: Task, intent: AgentType[]): AgentType {
    // Simple logic - could be more sophisticated
    const taskName = task.name.toLowerCase();

    if (taskName.includes("create") || taskName.includes("implement")) {
      return "coder";
    }
    if (taskName.includes("test")) {
      return "tester";
    }
    if (taskName.includes("fix") || taskName.includes("debug")) {
      return "debugger";
    }
    if (taskName.includes("review") || taskName.includes("check")) {
      return "reviewer";
    }
    if (taskName.includes("document") || taskName.includes("readme")) {
      return "docs";
    }
    if (taskName.includes("security")) {
      return "security";
    }
    if (taskName.includes("refactor")) {
      return "refactor";
    }

    // Default based on intent
    return intent[0] || "coder";
  }

  private groupTasksForParallelism(tasks: Task[]): Task[][] {
    // Kahn's topological sort — emits parallel waves of tasks whose deps are met.
    // Never drops tasks; cycles fall back to sequential execution with a warning.
    const completed = new Set<string>();
    const remaining = new Map<string, Task>(tasks.map((t) => [t.id, t]));
    const groups: Task[][] = [];

    let safetyLimit = tasks.length + 1; // prevent infinite loop on unresolvable cycles

    while (remaining.size > 0 && safetyLimit-- > 0) {
      // Collect all tasks whose dependencies are already satisfied
      const ready: Task[] = [];
      for (const task of remaining.values()) {
        const depsOk = task.dependencies.every((dep) => completed.has(dep));
        if (depsOk) {
          ready.push(task);
        }
      }

      if (ready.length === 0) {
        // Circular dependency detected — emit remaining tasks one-by-one to unblock
        this.log(
          "warn",
          `Circular dependency detected among ${remaining.size} task(s). ` +
          `Forcing sequential execution to prevent deadlock.`
        );
        for (const task of remaining.values()) {
          groups.push([task]);
        }
        break;
      }

      // Emit this set as a parallel group, then mark them complete for the next wave
      groups.push(ready);
      for (const task of ready) {
        completed.add(task.id);
        remaining.delete(task.id);
      }
    }

    return groups;
  }

  private extractTaskName(request: string): string {
    const firstLine = request.split("\n")[0];
    return firstLine
      .replace(/^#+\s*/, "")
      .replace(/[`*_]/g, "")
      .substring(0, 50);
  }

  private updateBoulder(): void {
    if (!this.currentTaskSlug || !this.currentPlan) return;

    const boulder: BoulderState = {
      activeTask: this.currentTaskSlug,
      startedAt: new Date(),
      planFile: join(".agentz/tasks", this.currentTaskSlug, "plan.json"),
      completedTasks: [],
      currentTask: null,
      remainingTasks: this.currentPlan.tasks.map((t) => ({
        name: t.name,
        agentType: t.assignedAgent,
        dependencies: t.dependencies,
      })),
      learnings: [],
      sessionIds: [this.sharedMemory.getSessionId()],
    };

    this.sharedMemory.saveBoulder(boulder);
  }

  private logDecision(decision: PrimaryDecision): void {
    this.sharedMemory.writeDecision(decision);
    this.emit("decision", decision);
  }

  private log(level: "info" | "warn" | "error", message: string): void {
    console.log(`[${level.toUpperCase()}] [PrimaryController] ${message}`);
    this.emit("log", { level, message, timestamp: new Date() });
  }

  // ============================================================================
  // Public API
  // ============================================================================

  getActiveSubagents(): SubagentInstance[] {
    return Array.from(this.activeSubagents.values());
  }

  getCurrentTaskSlug(): string | null {
    return this.currentTaskSlug;
  }

  getCurrentPlan(): Plan | null {
    return this.currentPlan;
  }

  killSubagent(agentId: string): boolean {
    const subagent = this.activeSubagents.get(agentId);
    if (subagent) {
      subagent.status = "killed";
      subagent.endedAt = new Date();
      this.sharedMemory.updateSubagentStatus(agentId, subagent.type, "killed");
      this.logDecision({
        action: "kill",
        reason: "Manually killed by controller",
        agentId,
      });
      return true;
    }
    return false;
  }

  getStatus(): {
    activeTask: string | null;
    activeSubagents: number;
    planProgress: { completed: number; total: number };
    sessionId: string;
  } {
    return {
      activeTask: this.currentTaskSlug,
      activeSubagents: this.activeSubagents.size,
      planProgress: this.currentPlan
        ? {
            completed: this.currentPlan.tasks.filter(
              (t) => t.status === "completed"
            ).length,
            total: this.currentPlan.tasks.length,
          }
        : { completed: 0, total: 0 },
      sessionId: this.sharedMemory.getSessionId(),
    };
  }
}

export default PrimaryController;