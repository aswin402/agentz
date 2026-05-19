import type { AgentType, ModelConfig, ModelChainEntry } from "../types/index.js";
import { ConfigManager } from "../core/config.js";
import { FREE_PROVIDERS } from "./factory.js";
export declare class ModelRouter {
    private configManager;
    private activeRequests;
    private modelUsageCount;
    constructor(configManager: ConfigManager);
    /**
     * Get the next model in the fallback chain for an agent
     */
    getNextModel(agentType: AgentType, currentIndex?: number): ModelConfig | null;
    /**
     * Get the timeout for an agent type
     */
    getTimeout(agentType: AgentType): number;
    /**
     * Check if we can spawn a new agent given concurrency limits
     */
    canSpawn(provider: string, model: string, parallelConfig: {
        maxAgents: number;
        perProvider: Record<string, number>;
        perModel: Record<string, number>;
    }): {
        canSpawn: boolean;
        reason?: string;
    };
    /**
     * Record that we're starting a request with a model
     */
    recordRequestStart(provider: string, model: string): void;
    /**
     * Record that a request with a model has ended
     */
    recordRequestEnd(provider: string, model: string): void;
    /**
     * Get the fallback index for retry
     */
    shouldFallback(agentType: AgentType, attemptIndex: number, error?: string): {
        shouldFallback: boolean;
        nextIndex: number;
    };
    /**
     * Get the best model for a task based on agent type and task complexity
     */
    getOptimalModel(agentType: AgentType, taskComplexity: "low" | "medium" | "high"): ModelConfig | null;
    /**
     * Get provider info
     */
    getProviderInfo(provider: string): typeof FREE_PROVIDERS[string] | undefined;
    /**
     * Get all available providers for an agent type
     */
    getAvailableProviders(agentType: AgentType): string[];
    /**
     * Get model usage statistics
     */
    getUsageStats(): {
        totalRequests: number;
        byModel: Record<string, number>;
        byProvider: Record<string, number>;
    };
    private getTotalActiveRequests;
    private getActiveRequestsByProvider;
    private getActiveRequestsByModel;
    /**
     * Reset all usage tracking
     */
    reset(): void;
}
export declare function formatModelId(provider: string, model: string): string;
export declare function parseModelId(modelId: string): {
    provider: string;
    model: string;
} | null;
export declare function getModelDisplayName(provider: string, model: string): string;
/**
 * Create a complete model configuration with defaults
 */
export declare function createModelConfig(provider: string, model: string, options?: {
    reasoning?: boolean;
    temperature?: number;
    maxTokens?: number;
}): ModelConfig;
/**
 * Validate model chain has no duplicates
 */
export declare function validateModelChain(chain: ModelChainEntry[]): {
    valid: boolean;
    duplicates: string[];
};
export default ModelRouter;
//# sourceMappingURL=router.d.ts.map