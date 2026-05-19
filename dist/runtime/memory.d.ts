import type { SharedMemoryEntry, PrimaryDecision, BoulderState, SubagentStatus, AgentType } from "../types/index.js";
export declare class SharedMemory {
    private basePath;
    private currentSessionId;
    constructor(basePath?: string);
    private generateSessionId;
    private ensureDirectoryStructure;
    /**
     * Write a shared memory entry from a subagent
     */
    writeEntry(entry: SharedMemoryEntry): void;
    /**
     * Read all shared memory entries
     */
    readSharedMemory(): SharedMemoryEntry[];
    /**
     * Get entries for a specific agent
     */
    getEntriesForAgent(agentId: string): SharedMemoryEntry[];
    /**
     * Get entries for a specific agent type
     */
    getEntriesByType(agentType: AgentType): SharedMemoryEntry[];
    /**
     * Clear all shared memory
     */
    clearSharedMemory(): void;
    /**
     * Write a primary model decision
     */
    writeDecision(decision: PrimaryDecision): void;
    /**
     * Read decision log
     */
    readDecisionLog(): PrimaryDecision[];
    /**
     * Get current boulder state
     */
    getBoulder(): BoulderState | null;
    /**
     * Save boulder state
     */
    saveBoulder(boulder: BoulderState): void;
    /**
     * Update boulder state
     */
    updateBoulder(updates: Partial<BoulderState>): void;
    /**
     * Clear boulder (end current task)
     */
    clearBoulder(): void;
    private createDefaultBoulder;
    /**
     * Get accumulated learnings from memory
     */
    getLearnings(): string[];
    /**
     * Add a new learning
     */
    addLearning(learning: string): void;
    /**
     * Update subagent status
     */
    updateSubagentStatus(agentId: string, agentType: AgentType, status: SubagentStatus, progress?: string): void;
    /**
     * Get all active subagent statuses
     */
    getActiveSubagents(): Array<{
        agentId: string;
        agentType: AgentType;
        status: SubagentStatus;
        progress?: string;
    }>;
    /**
     * Clear subagent status
     */
    clearSubagentStatus(agentId: string): void;
    private formatEntry;
    private formatDecision;
    private serializeSharedMemory;
    private parseSharedMemory;
    private parseEntry;
    private parseDecisionLog;
    private parseLearningsFile;
    getSessionId(): string;
    /**
     * Clear all active session data
     */
    clearSession(): void;
    /**
     * Archive current session to history
     */
    archiveSession(): void;
}
export declare function createSharedMemory(basePath?: string): SharedMemory;
export default SharedMemory;
//# sourceMappingURL=memory.d.ts.map