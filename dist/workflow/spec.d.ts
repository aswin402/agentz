import type { Spec, Plan, Task } from "../types/index.js";
export declare class SpecWorkflow {
    private projectRoot;
    private tasksDir;
    constructor(projectRoot?: string);
    /**
     * Create a new task directory with all required files
     */
    createTaskDir(taskName: string): string;
    /**
     * Get the path to a task directory
     */
    getTaskDir(taskSlug: string): string;
    /**
     * List all task directories
     */
    listTasks(): Array<{
        slug: string;
        path: string;
        modified: Date;
    }>;
    /**
     * Save the original user request
     */
    saveRequest(taskSlug: string, request: string): void;
    /**
     * Read the user request
     */
    readRequest(taskSlug: string): string | null;
    /**
     * Generate a spec from user request
     */
    generateSpec(taskSlug: string, request: string): Spec;
    /**
     * Save a spec to file
     */
    saveSpec(taskSlug: string, spec: Spec): void;
    /**
     * Read a spec from file
     */
    readSpec(taskSlug: string): Spec | null;
    /**
     * Generate a plan from spec
     */
    generatePlan(spec: Spec): Plan;
    /**
     * Save a plan to file
     */
    savePlan(taskSlug: string, plan: Plan): void;
    /**
     * Read a plan from file
     */
    readPlan(taskSlug: string): Plan | null;
    /**
     * Update task status in plan
     */
    updateTaskStatus(taskSlug: string, taskId: string, status: Task["status"]): void;
    /**
     * Append to implementation log
     */
    appendImplementationLog(taskSlug: string, entry: string): void;
    /**
     * Read implementation log
     */
    readImplementationLog(taskSlug: string): string | null;
    /**
     * Save verification report
     */
    saveVerificationReport(taskSlug: string, report: string): void;
    /**
     * Read verification report
     */
    readVerificationReport(taskSlug: string): string | null;
    /**
     * Save final summary
     */
    saveFinalSummary(taskSlug: string, summary: {
        objective: string;
        completedTasks: string[];
        failedTasks: string[];
        artifacts: string[];
        learnings: string[];
        verificationResult: string;
    }): void;
    /**
     * Read final summary
     */
    readFinalSummary(taskSlug: string): string | null;
    /**
     * Save files to change list
     */
    saveFilesToChange(taskSlug: string, files: {
        create: string[];
        modify: string[];
        delete: string[];
    }): void;
    /**
     * Save acceptance checklist
     */
    saveAcceptanceChecklist(taskSlug: string, criteria: string[]): void;
    /**
     * Mark acceptance criterion as verified
     */
    markAcceptanceCriterion(taskSlug: string, index: number, verified: boolean): void;
    private extractObjective;
    private extractInScope;
    private extractOutOfScope;
    private extractFunctionalRequirements;
    private generateAcceptanceCriteria;
    private generateTasks;
    private formatSpec;
    private parseSpec;
    private formatPlan;
    private parsePlan;
}
export declare function createSpecWorkflow(projectRoot?: string): SpecWorkflow;
export default SpecWorkflow;
//# sourceMappingURL=spec.d.ts.map