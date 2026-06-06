import { EventEmitter } from "events";
import type { SubagentInstance, Plan } from "../types/index.js";
export declare class PrimaryController extends EventEmitter {
    private configManager;
    private modelRouter;
    private sharedMemory;
    private specWorkflow;
    private verificationPipeline;
    private activeSubagents;
    private currentTaskSlug;
    private currentPlan;
    private currentSpec;
    private primaryModel;
    private request;
    private loadedSkills;
    private taskQueue;
    constructor(projectRoot?: string);
    private loadSkills;
    private getSkillsForAgent;
    /**
     * Start a new task - main entry point for the controller
     */
    startTask(request: string, hasImages?: boolean): Promise<void>;
    /**
     * Resume an interrupted task
     */
    resumeTask(taskSlug?: string): Promise<void>;
    private executePlan;
    private executeTask;
    private executeTasksInParallel;
    /**
     * Drain the FIFO task queue, spawning queued tasks as concurrency allows.
     */
    private drainTaskQueue;
    private executeWithFallback;
    private executeSubagent;
    private verifyCurrentProgress;
    private attemptAutoFix;
    private finalizeTask;
    private createSubagent;
    private determineAgentForTask;
    private groupTasksForParallelism;
    private extractTaskName;
    private updateBoulder;
    private logDecision;
    private log;
    getActiveSubagents(): SubagentInstance[];
    getCurrentTaskSlug(): string | null;
    getCurrentPlan(): Plan | null;
    killSubagent(agentId: string): boolean;
    private getMimeType;
    getStatus(): {
        activeTask: string | null;
        activeSubagents: number;
        planProgress: {
            completed: number;
            total: number;
        };
        sessionId: string;
    };
}
export default PrimaryController;
//# sourceMappingURL=controller.d.ts.map