import { FREE_PROVIDERS } from "./factory.js";
// ============================================================================
// Model Routing Engine
// ============================================================================
export class ModelRouter {
    configManager;
    activeRequests = new Map();
    modelUsageCount = new Map();
    constructor(configManager) {
        this.configManager = configManager;
    }
    /**
     * Get the next model in the fallback chain for an agent
     */
    getNextModel(agentType, currentIndex = 0) {
        const chain = this.configManager.getAgentChain(agentType);
        if (currentIndex >= chain.modelChain.length) {
            return null;
        }
        return chain.modelChain[currentIndex];
    }
    /**
     * Get the timeout for an agent type
     */
    getTimeout(agentType) {
        const chain = this.configManager.getAgentChain(agentType);
        return chain.timeoutSeconds;
    }
    /**
     * Check if we can spawn a new agent given concurrency limits
     */
    canSpawn(provider, model, parallelConfig) {
        const totalActive = this.getTotalActiveRequests();
        if (totalActive >= parallelConfig.maxAgents) {
            return { canSpawn: false, reason: `Max agents limit reached (${parallelConfig.maxAgents})` };
        }
        const providerKey = provider;
        const providerLimit = parallelConfig.perProvider[providerKey];
        if (providerLimit) {
            const providerActive = this.getActiveRequestsByProvider(providerKey);
            if (providerActive >= providerLimit) {
                return {
                    canSpawn: false,
                    reason: `Provider ${provider} limit reached (${providerLimit})`,
                };
            }
        }
        const modelKey = `${provider}/${model}`;
        const modelLimit = parallelConfig.perModel[modelKey];
        if (modelLimit) {
            const modelActive = this.getActiveRequestsByModel(modelKey);
            if (modelActive >= modelLimit) {
                return {
                    canSpawn: false,
                    reason: `Model ${modelKey} limit reached (${modelLimit})`,
                };
            }
        }
        return { canSpawn: true };
    }
    /**
     * Record that we're starting a request with a model
     */
    recordRequestStart(provider, model) {
        const key = `${provider}/${model}`;
        this.activeRequests.set(key, (this.activeRequests.get(key) || 0) + 1);
        this.modelUsageCount.set(key, (this.modelUsageCount.get(key) || 0) + 1);
    }
    /**
     * Record that a request with a model has ended
     */
    recordRequestEnd(provider, model) {
        const key = `${provider}/${model}`;
        const current = this.activeRequests.get(key);
        if (current && current > 0) {
            this.activeRequests.set(key, current - 1);
        }
    }
    /**
     * Get the fallback index for retry
     */
    shouldFallback(agentType, attemptIndex, error) {
        const chain = this.configManager.getAgentChain(agentType);
        // If we've exhausted the chain, don't fallback further
        if (attemptIndex >= chain.modelChain.length - 1) {
            return { shouldFallback: false, nextIndex: attemptIndex };
        }
        // Check error type to decide if we should fallback immediately
        if (error) {
            // API errors, timeout errors → immediate fallback
            if (error.includes("401") ||
                error.includes("403") ||
                error.includes("429") ||
                error.includes("500") ||
                error.includes("503") ||
                error.includes("timeout") ||
                error.includes("network")) {
                return { shouldFallback: true, nextIndex: attemptIndex + 1 };
            }
        }
        // Default: allow fallback
        return { shouldFallback: true, nextIndex: attemptIndex + 1 };
    }
    /**
     * Get the best model for a task based on agent type and task complexity
     */
    getOptimalModel(agentType, taskComplexity) {
        const chain = this.configManager.getAgentChain(agentType);
        // For high complexity, prefer reasoning-capable models
        if (taskComplexity === "high") {
            const reasoningModel = chain.modelChain.find((m) => m.reasoning);
            if (reasoningModel) {
                return reasoningModel;
            }
        }
        // For low complexity, prefer fast models (first in chain)
        if (taskComplexity === "low") {
            return chain.modelChain[0];
        }
        // For medium, try second in chain if first is too slow
        return chain.modelChain[0];
    }
    /**
     * Get provider info
     */
    getProviderInfo(provider) {
        return FREE_PROVIDERS[provider];
    }
    /**
     * Get all available providers for an agent type
     */
    getAvailableProviders(agentType) {
        const chain = this.configManager.getAgentChain(agentType);
        return chain.modelChain.map((m) => m.provider);
    }
    /**
     * Get model usage statistics
     */
    getUsageStats() {
        const byModel = {};
        const byProvider = {};
        for (const [key, count] of this.modelUsageCount) {
            byModel[key] = count;
            const [provider] = key.split("/");
            byProvider[provider] = (byProvider[provider] || 0) + count;
        }
        const totalRequests = Array.from(this.modelUsageCount.values()).reduce((a, b) => a + b, 0);
        return { totalRequests, byModel, byProvider };
    }
    // Private helpers
    getTotalActiveRequests() {
        return Array.from(this.activeRequests.values()).reduce((a, b) => a + b, 0);
    }
    getActiveRequestsByProvider(provider) {
        let count = 0;
        for (const [key, value] of this.activeRequests) {
            if (key.startsWith(`${provider}/`)) {
                count += value;
            }
        }
        return count;
    }
    getActiveRequestsByModel(modelKey) {
        return this.activeRequests.get(modelKey) || 0;
    }
    /**
     * Reset all usage tracking
     */
    reset() {
        this.activeRequests.clear();
    }
}
// ============================================================================
// Model Chain Utilities
// ============================================================================
export function formatModelId(provider, model) {
    return `${provider}/${model}`;
}
export function parseModelId(modelId) {
    const parts = modelId.split("/");
    if (parts.length !== 2) {
        return null;
    }
    return { provider: parts[0], model: parts[1] };
}
export function getModelDisplayName(provider, model) {
    const info = FREE_PROVIDERS[provider];
    if (info) {
        return `${info.name} ${model}`;
    }
    return `${provider}:${model}`;
}
/**
 * Create a complete model configuration with defaults
 */
export function createModelConfig(provider, model, options) {
    return {
        provider,
        model,
        reasoning: options?.reasoning,
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens,
    };
}
/**
 * Validate model chain has no duplicates
 */
export function validateModelChain(chain) {
    const seen = new Set();
    const duplicates = [];
    for (const entry of chain) {
        const id = formatModelId(entry.provider, entry.model);
        if (seen.has(id)) {
            duplicates.push(id);
        }
        seen.add(id);
    }
    return { valid: duplicates.length === 0, duplicates };
}
export default ModelRouter;
//# sourceMappingURL=router.js.map