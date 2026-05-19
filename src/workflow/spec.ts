import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";
import type {
  Spec,
  Plan,
  Task,
  AcceptanceCriterion,
  IntentType,
} from "../types/index.js";
import { classifyIntent } from "../agents/factory.js";

// ============================================================================
// Spec-First Workflow
// ============================================================================

export class SpecWorkflow {
  private projectRoot: string;
  private tasksDir: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.tasksDir = join(projectRoot, ".agentz", "tasks");

    if (!existsSync(this.tasksDir)) {
      mkdirSync(this.tasksDir, { recursive: true });
    }
  }

  // ============================================================================
  // Task Directory Management
  // ============================================================================

  /**
   * Create a new task directory with all required files
   */
  createTaskDir(taskName: string): string {
    const date = new Date().toISOString().split("T")[0];
    const slug = taskName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const dirName = `${date}-${slug}`;
    const taskDir = join(this.tasksDir, dirName);

    mkdirSync(taskDir, { recursive: true });

    // Create required files
    const files = [
      "request.md",
      "spec.md",
      "plan.md",
      "files-to-change.md",
      "acceptance-checklist.md",
      "implementation-log.md",
      "verification-report.md",
      "final-summary.md",
    ];

    for (const file of files) {
      const filePath = join(taskDir, file);
      if (!existsSync(filePath)) {
        writeFileSync(filePath, "", "utf-8");
      }
    }

    return dirName;
  }

  /**
   * Get the path to a task directory
   */
  getTaskDir(taskSlug: string): string {
    return join(this.tasksDir, taskSlug);
  }

  /**
   * List all task directories
   */
  listTasks(): Array<{ slug: string; path: string; modified: Date }> {
    if (!existsSync(this.tasksDir)) {
      return [];
    }

    const entries = readdirSync(this.tasksDir, { withFileTypes: true });
    const tasks: Array<{ slug: string; path: string; modified: Date }> = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const stat = statSync(join(this.tasksDir, entry.name));
        tasks.push({
          slug: entry.name,
          path: join(this.tasksDir, entry.name),
          modified: stat.mtime,
        });
      }
    }

    // Sort by modification time, newest first
    tasks.sort((a, b) => b.modified.getTime() - a.modified.getTime());

    return tasks;
  }

  // ============================================================================
  // Request Management
  // ============================================================================

  /**
   * Save the original user request
   */
  saveRequest(taskSlug: string, request: string): void {
    const requestPath = join(this.tasksDir, taskSlug, "request.md");
    writeFileSync(requestPath, `# User Request\n\n${request}`, "utf-8");
  }

  /**
   * Read the user request
   */
  readRequest(taskSlug: string): string | null {
    const requestPath = join(this.tasksDir, taskSlug, "request.md");
    if (!existsSync(requestPath)) {
      return null;
    }
    return readFileSync(requestPath, "utf-8");
  }

  // ============================================================================
  // Spec Generation & Management
  // ============================================================================

  /**
   * Generate a spec from user request
   */
  generateSpec(taskSlug: string, request: string): Spec {
    const intent = classifyIntent(request);
    const id = `spec-${Date.now()}`;

    const spec: Spec = {
      id,
      objective: this.extractObjective(request),
      scope: {
        inScope: this.extractInScope(request),
        outOfScope: this.extractOutOfScope(request),
      },
      requirements: {
        functional: this.extractFunctionalRequirements(request),
        nonFunctional: {
          performance: "Reasonable response times",
          security: "No obvious vulnerabilities",
          maintainability: "Clean, readable code",
        },
      },
      acceptanceCriteria: this.generateAcceptanceCriteria(request),
      fileChanges: {
        create: [],
        modify: [],
        delete: [],
      },
      dependencies: [],
      verificationPlan: "Tests pass, lint clean, manual verification",
      createdAt: new Date(),
    };

    return spec;
  }

  /**
   * Save a spec to file
   */
  saveSpec(taskSlug: string, spec: Spec): void {
    const specPath = join(this.tasksDir, taskSlug, "spec.md");
    const content = this.formatSpec(spec);
    writeFileSync(specPath, content, "utf-8");
  }

  /**
   * Read a spec from file
   */
  readSpec(taskSlug: string): Spec | null {
    const specPath = join(this.tasksDir, taskSlug, "spec.md");
    if (!existsSync(specPath)) {
      return null;
    }

    try {
      const content = readFileSync(specPath, "utf-8");
      return this.parseSpec(content);
    } catch {
      return null;
    }
  }

  // ============================================================================
  // Plan Generation & Management
  // ============================================================================

  /**
   * Generate a plan from spec
   */
  generatePlan(spec: Spec): Plan {
    const planId = `plan-${Date.now()}`;
    const tasks = this.generateTasks(spec);

    const plan: Plan = {
      id: planId,
      name: spec.objective,
      objective: spec.objective,
      scope: spec.scope,
      tasks,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return plan;
  }

  /**
   * Save a plan to file
   */
  savePlan(taskSlug: string, plan: Plan): void {
    const planPath = join(this.tasksDir, taskSlug, "plan.md");
    const content = this.formatPlan(plan);
    writeFileSync(planPath, content, "utf-8");

    // Also save as JSON for programmatic access
    const planJsonPath = join(this.tasksDir, taskSlug, "plan.json");
    writeFileSync(planJsonPath, JSON.stringify(plan, null, 2), "utf-8");
  }

  /**
   * Read a plan from file
   */
  readPlan(taskSlug: string): Plan | null {
    const planJsonPath = join(this.tasksDir, taskSlug, "plan.json");
    if (existsSync(planJsonPath)) {
      try {
        const content = readFileSync(planJsonPath, "utf-8");
        return JSON.parse(content);
      } catch {
        // Fall through to markdown parsing
      }
    }

    const planPath = join(this.tasksDir, taskSlug, "plan.md");
    if (!existsSync(planPath)) {
      return null;
    }

    try {
      const content = readFileSync(planPath, "utf-8");
      return this.parsePlan(content);
    } catch {
      return null;
    }
  }

  /**
   * Update task status in plan
   */
  updateTaskStatus(
    taskSlug: string,
    taskId: string,
    status: Task["status"]
  ): void {
    const plan = this.readPlan(taskSlug);
    if (!plan) return;

    const task = plan.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = status;
      plan.updatedAt = new Date();
      this.savePlan(taskSlug, plan);
    }
  }

  // ============================================================================
  // Implementation Log
  // ============================================================================

  /**
   * Append to implementation log
   */
  appendImplementationLog(taskSlug: string, entry: string): void {
    const logPath = join(this.tasksDir, taskSlug, "implementation-log.md");
    const existing = existsSync(logPath) ? readFileSync(logPath, "utf-8") : "";
    const timestamp = new Date().toISOString();
    const newEntry = `\n\n## Entry @ ${timestamp}\n\n${entry}`;
    writeFileSync(logPath, existing + newEntry, "utf-8");
  }

  /**
   * Read implementation log
   */
  readImplementationLog(taskSlug: string): string | null {
    const logPath = join(this.tasksDir, taskSlug, "implementation-log.md");
    if (!existsSync(logPath)) {
      return null;
    }
    return readFileSync(logPath, "utf-8");
  }

  // ============================================================================
  // Verification Report
  // ============================================================================

  /**
   * Save verification report
   */
  saveVerificationReport(taskSlug: string, report: string): void {
    const reportPath = join(this.tasksDir, taskSlug, "verification-report.md");
    writeFileSync(reportPath, report, "utf-8");
  }

  /**
   * Read verification report
   */
  readVerificationReport(taskSlug: string): string | null {
    const reportPath = join(this.tasksDir, taskSlug, "verification-report.md");
    if (!existsSync(reportPath)) {
      return null;
    }
    return readFileSync(reportPath, "utf-8");
  }

  // ============================================================================
  // Final Summary
  // ============================================================================

  /**
   * Save final summary
   */
  saveFinalSummary(
    taskSlug: string,
    summary: {
      objective: string;
      completedTasks: string[];
      failedTasks: string[];
      artifacts: string[];
      learnings: string[];
      verificationResult: string;
    }
  ): void {
    const summaryPath = join(this.tasksDir, taskSlug, "final-summary.md");
    const content = `# Final Summary

## Objective
${summary.objective}

## Completed Tasks
${summary.completedTasks.map((t) => `- ${t}`).join("\n")}

## Failed Tasks
${summary.failedTasks.length > 0 ? summary.failedTasks.map((t) => `- ${t}`).join("\n") : "None"}

## Artifacts Created
${summary.artifacts.map((a) => `- ${a}`).join("\n")}

## Learnings
${summary.learnings.map((l) => `- ${l}`).join("\n")}

## Verification Result
${summary.verificationResult}

---
*Generated on ${new Date().toISOString()}*
`;
    writeFileSync(summaryPath, content, "utf-8");
  }

  /**
   * Read final summary
   */
  readFinalSummary(taskSlug: string): string | null {
    const summaryPath = join(this.tasksDir, taskSlug, "final-summary.md");
    if (!existsSync(summaryPath)) {
      return null;
    }
    return readFileSync(summaryPath, "utf-8");
  }

  // ============================================================================
  // Files to Change Management
  // ============================================================================

  /**
   * Save files to change list
   */
  saveFilesToChange(taskSlug: string, files: { create: string[]; modify: string[]; delete: string[] }): void {
    const path = join(this.tasksDir, taskSlug, "files-to-change.md");
    const content = `# Files to Change

## Create
${files.create.map((f) => `- \`${f}\``).join("\n")}

## Modify
${files.modify.map((f) => `- \`${f}\``).join("\n")}

## Delete
${files.delete.map((f) => `- \`${f}\``).join("\n")}
`;
    writeFileSync(path, content, "utf-8");
  }

  // ============================================================================
  // Acceptance Checklist
  // ============================================================================

  /**
   * Save acceptance checklist
   */
  saveAcceptanceChecklist(taskSlug: string, criteria: string[]): void {
    const path = join(this.tasksDir, taskSlug, "acceptance-checklist.md");
    const content = `# Acceptance Checklist

${criteria.map((c, i) => `- [ ] ${i + 1}. ${c}`).join("\n")}
`;
    writeFileSync(path, content, "utf-8");
  }

  /**
   * Mark acceptance criterion as verified
   */
  markAcceptanceCriterion(taskSlug: string, index: number, verified: boolean): void {
    const path = join(this.tasksDir, taskSlug, "acceptance-checklist.md");
    if (!existsSync(path)) return;

    const content = readFileSync(path, "utf-8");
    const lines = content.split("\n");
    const lineIndex = lines.findIndex((l) => l.match(/^\- \[ \] \d+\./));
    if (lineIndex >= 0) {
      const newLine = verified ? lines[lineIndex].replace("[ ]", "[x]") : lines[lineIndex];
      lines[lineIndex] = newLine;
      writeFileSync(path, lines.join("\n"), "utf-8");
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private extractObjective(request: string): string {
    // Simple extraction - take first sentence or line
    const firstLine = request.split("\n")[0];
    return firstLine.replace(/^#+\s*/, "").trim();
  }

  private extractInScope(request: string): string[] {
    // Look for "in scope" sections
    const inScopeMatch = request.match(/in scope[:\s]*(.+?)(?:\n\n|$)/is);
    if (inScopeMatch) {
      return inScopeMatch[1]
        .split(/[-•*]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return ["Core functionality as described"];
  }

  private extractOutOfScope(request: string): string[] {
    // Look for "out of scope" sections
    const outOfScopeMatch = request.match(/out of scope[:\s]*(.+?)(?:\n\n|$)/is);
    if (outOfScopeMatch) {
      return outOfScopeMatch[1]
        .split(/[-•*]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return ["Extended features not mentioned"];
  }

  private extractFunctionalRequirements(request: string): string[] {
    // Look for requirement-like patterns
    const patterns = [
      /should\s+(.+?)(?:\.|$)/gi,
      /must\s+(.+?)(?:\.|$)/gi,
      /requires?\s+(.+?)(?:\.|$)/gi,
    ];

    const requirements: string[] = [];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(request)) !== null) {
        requirements.push(match[1].trim());
      }
    }

    return requirements.length > 0
      ? requirements.slice(0, 10)
      : ["Implement described functionality"];
  }

  private generateAcceptanceCriteria(request: string): AcceptanceCriterion[] {
    return [
      {
        id: "ac-1",
        description: "Code compiles/builds without errors",
        verified: false,
      },
      {
        id: "ac-2",
        description: "Core functionality works as specified",
        verified: false,
      },
      {
        id: "ac-3",
        description: "Tests pass (if applicable)",
        verified: false,
      },
      {
        id: "ac-4",
        description: "No lint errors",
        verified: false,
      },
    ];
  }

  private generateTasks(spec: Spec): Task[] {
    const tasks: Task[] = [];

    // Create task for each file to create
    for (const file of spec.fileChanges.create) {
      tasks.push({
        id: `task-${tasks.length + 1}`,
        name: `Create ${file}`,
        description: `Create new file: ${file}`,
        status: "pending",
        dependencies: [],
        artifacts: [file],
        verificationCriteria: [
          { id: "vc-1", description: "File exists", type: "manual", status: "pending" },
        ],
      });
    }

    // Create task for each file to modify
    for (const file of spec.fileChanges.modify) {
      tasks.push({
        id: `task-${tasks.length + 1}`,
        name: `Modify ${file}`,
        description: `Modify existing file: ${file}`,
        status: "pending",
        dependencies: [],
        artifacts: [file],
        verificationCriteria: [
          { id: "vc-1", description: "Changes applied", type: "manual", status: "pending" },
        ],
      });
    }

    return tasks;
  }

  // ============================================================================
  // Formatting Methods
  // ============================================================================

  private formatSpec(spec: Spec): string {
    return `# Specification

## Objective
${spec.objective}

## Scope
### In Scope
${spec.scope.inScope.map((s) => `- ${s}`).join("\n")}

### Out of Scope
${spec.scope.outOfScope.map((s) => `- ${s}`).join("\n")}

## Requirements
### Functional
${spec.requirements.functional.map((r) => `- ${r}`).join("\n")}

### Non-Functional
${Object.entries(spec.requirements.nonFunctional)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}

## Acceptance Criteria
${spec.acceptanceCriteria
  .map((ac) => `- [ ] ${ac.description}`)
  .join("\n")}

## File Changes
### Create
${spec.fileChanges.create.map((f) => `- ${f}`).join("\n")}

### Modify
${spec.fileChanges.modify.map((f) => `- ${f}`).join("\n")}

### Delete
${spec.fileChanges.delete.map((f) => `- ${f}`).join("\n")}

## Dependencies
${spec.dependencies.map((d) => `- ${d}`).join("\n")}

## Verification Plan
${spec.verificationPlan}

---
*Generated on ${spec.createdAt.toISOString()}*
`;
  }

  private parseSpec(content: string): Spec {
    // Simple markdown parser for spec
    const lines = content.split("\n");
    const spec: Spec = {
      id: `spec-parsed-${Date.now()}`,
      objective: "",
      scope: { inScope: [], outOfScope: [] },
      requirements: { functional: [], nonFunctional: {} },
      acceptanceCriteria: [],
      fileChanges: { create: [], modify: [], delete: [] },
      dependencies: [],
      verificationPlan: "",
      createdAt: new Date(),
    };

    let currentSection = "";
    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith("## ")) {
        currentSection = trimmed.replace("## ", "").toLowerCase();
      } else if (trimmed.startsWith("### ")) {
        currentSection = trimmed.replace("### ", "").toLowerCase();
      } else if (trimmed.startsWith("- [ ]") || trimmed.startsWith("- ")) {
        const text = trimmed.replace(/^- [\[\]x] /, "").trim();
        if (currentSection === "acceptance criteria") {
          spec.acceptanceCriteria.push({
            id: `ac-${spec.acceptanceCriteria.length + 1}`,
            description: text,
            verified: trimmed.includes("[x]"),
          });
        } else if (currentSection === "in scope") {
          spec.scope.inScope.push(text);
        } else if (currentSection === "out of scope") {
          spec.scope.outOfScope.push(text);
        } else if (currentSection === "functional") {
          spec.requirements.functional.push(text);
        } else if (currentSection === "create") {
          spec.fileChanges.create.push(text);
        } else if (currentSection === "modify") {
          spec.fileChanges.modify.push(text);
        } else if (currentSection === "delete") {
          spec.fileChanges.delete.push(text);
        } else if (currentSection === "dependencies") {
          spec.dependencies.push(text);
        }
      } else if (currentSection === "objective" && trimmed) {
        spec.objective = trimmed;
      } else if (currentSection === "verification plan" && trimmed) {
        spec.verificationPlan = trimmed;
      }
    }

    return spec;
  }

  private formatPlan(plan: Plan): string {
    const taskList = plan.tasks
      .map(
        (t) =>
          `- [${t.status === "completed" ? "x" : " "}] ${t.name} (${t.status})`
      )
      .join("\n");

    return `# Plan: ${plan.name}

## Objective
${plan.objective}

## Scope
### In Scope
${plan.scope.inScope.map((s) => `- ${s}`).join("\n")}

### Out of Scope
${plan.scope.outOfScope.map((s) => `- ${s}`).join("\n")}

## Tasks
${taskList}

---
*Generated on ${plan.createdAt.toISOString()}*
*Updated on ${plan.updatedAt.toISOString()}*
`;
  }

  private parsePlan(content: string): Plan {
    const plan: Plan = {
      id: `plan-parsed-${Date.now()}`,
      name: "",
      objective: "",
      scope: { inScope: [], outOfScope: [] },
      tasks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const lines = content.split("\n");
    let currentSection = "";
    let currentTask: Task | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith("# ")) {
        plan.name = trimmed.replace(/^# Plan: /, "");
      } else if (trimmed.startsWith("## ")) {
        currentSection = trimmed.replace("## ", "").toLowerCase();
      } else if (trimmed.startsWith("### ")) {
        currentSection = trimmed.replace("### ", "").toLowerCase();
      } else if (trimmed.startsWith("- [")) {
        const isCompleted = trimmed.includes("[x]");
        const text = trimmed.replace(/^\- \[[ x]\] /, "").replace(/ \(.+\)$/, "");
        const statusMatch = trimmed.match(/\((.+)\)$/);
        const status = statusMatch
          ? (statusMatch[1] as Task["status"])
          : isCompleted
          ? "completed"
          : "pending";

        currentTask = {
          id: `task-${plan.tasks.length + 1}`,
          name: text,
          description: text,
          status,
          dependencies: [],
          artifacts: [],
          verificationCriteria: [],
        };
        plan.tasks.push(currentTask);
      } else if (currentSection === "in scope" && trimmed.startsWith("- ")) {
        plan.scope.inScope.push(trimmed.replace("- ", ""));
      } else if (currentSection === "out of scope" && trimmed.startsWith("- ")) {
        plan.scope.outOfScope.push(trimmed.replace("- ", ""));
      }
    }

    return plan;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

export function createSpecWorkflow(projectRoot?: string): SpecWorkflow {
  return new SpecWorkflow(projectRoot);
}

export default SpecWorkflow;