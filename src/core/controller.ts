import { EventEmitter } from "events";
import { existsSync, readFileSync } from "fs";
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
      // Check if we can spawn more agents
      const model = this.modelRouter.getNextModel(
        this.determineAgentForTask(task, intent),
        0
      );

      if (!model) continue;

      const canSpawn = this.modelRouter.canSpawn(model.provider, model.model, parallelConfig);

      if (canSpawn.canSpawn) {
        promises.push(this.executeTask(task, intent));
      } else {
        this.log("warn", `Cannot spawn agent: ${canSpawn.reason}. Queuing task.`);
        // Could implement a queue here
      }
    }

    await Promise.all(promises);
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

        // Execute subagent
        const result = await this.executeSubagent(subagent, task);

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
    const id = `${type}-${uuidv4()}`;
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
    // Simple grouping - tasks with no dependencies can run in parallel
    const groups: Task[][] = [];
    const assigned = new Set<string>();

    for (const task of tasks) {
      if (assigned.has(task.id)) continue;

      // Find all tasks that can run in parallel (no dependencies on each other)
      const parallelGroup = tasks.filter(
        (t) =>
          !assigned.has(t.id) &&
          t.dependencies.every((d) => assigned.has(d))
      );

      if (parallelGroup.length > 0) {
        parallelGroup.forEach((t) => assigned.add(t.id));
        groups.push(parallelGroup);
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

// ============================================================================
// Utilities
// ============================================================================

function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Import join for boulder path
import { join } from "path";

export default PrimaryController;