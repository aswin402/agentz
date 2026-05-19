import type {
  AgentType,
  ModelConfig,
  ModelChainEntry,
  SubagentStatus,
} from "../types/index.js";
import { ConfigManager } from "../core/config.js";
import { FREE_PROVIDERS } from "./factory.js";

// ============================================================================
// Model Routing Engine
// ============================================================================

export class ModelRouter {
  private configManager: ConfigManager;
  private activeRequests: Map<string, number> = new Map();
  private modelUsageCount: Map<string, number> = new Map();

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  /**
   * Get the next model in the fallback chain for an agent
   */
  getNextModel(
    agentType: AgentType,
    currentIndex: number = 0
  ): ModelConfig | null {
    const chain = this.configManager.getAgentChain(agentType);
    if (currentIndex >= chain.modelChain.length) {
      return null;
    }
    return chain.modelChain[currentIndex];
  }

  /**
   * Get the timeout for an agent type
   */
  getTimeout(agentType: AgentType): number {
    const chain = this.configManager.getAgentChain(agentType);
    return chain.timeoutSeconds;
  }

  /**
   * Check if we can spawn a new agent given concurrency limits
   */
  canSpawn(
    provider: string,
    model: string,
    parallelConfig: { maxAgents: number; perProvider: Record<string, number>; perModel: Record<string, number> }
  ): { canSpawn: boolean; reason?: string } {
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
  recordRequestStart(provider: string, model: string): void {
    const key = `${provider}/${model}`;
    this.activeRequests.set(key, (this.activeRequests.get(key) || 0) + 1);
    this.modelUsageCount.set(key, (this.modelUsageCount.get(key) || 0) + 1);
  }

  /**
   * Record that a request with a model has ended
   */
  recordRequestEnd(provider: string, model: string): void {
    const key = `${provider}/${model}`;
    const current = this.activeRequests.get(key);
    if (current && current > 0) {
      this.activeRequests.set(key, current - 1);
    }
  }

  /**
   * Get the fallback index for retry
   */
  shouldFallback(
    agentType: AgentType,
    attemptIndex: number,
    error?: string
  ): { shouldFallback: boolean; nextIndex: number } {
    const chain = this.configManager.getAgentChain(agentType);

    // If we've exhausted the chain, don't fallback further
    if (attemptIndex >= chain.modelChain.length - 1) {
      return { shouldFallback: false, nextIndex: attemptIndex };
    }

    // Check error type to decide if we should fallback immediately
    if (error) {
      // API errors, timeout errors → immediate fallback
      if (
        error.includes("401") ||
        error.includes("403") ||
        error.includes("429") ||
        error.includes("500") ||
        error.includes("503") ||
        error.includes("timeout") ||
        error.includes("network")
      ) {
        return { shouldFallback: true, nextIndex: attemptIndex + 1 };
      }
    }

    // Default: allow fallback
    return { shouldFallback: true, nextIndex: attemptIndex + 1 };
  }

  /**
   * Get the best model for a task based on agent type and task complexity
   */
  getOptimalModel(
    agentType: AgentType,
    taskComplexity: "low" | "medium" | "high"
  ): ModelConfig | null {
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
  getProviderInfo(provider: string): typeof FREE_PROVIDERS[string] | undefined {
    return FREE_PROVIDERS[provider];
  }

  /**
   * Get all available providers for an agent type
   */
  getAvailableProviders(agentType: AgentType): string[] {
    const chain = this.configManager.getAgentChain(agentType);
    return chain.modelChain.map((m) => m.provider);
  }

  /**
   * Get model usage statistics
   */
  getUsageStats(): {
    totalRequests: number;
    byModel: Record<string, number>;
    byProvider: Record<string, number>;
  } {
    const byModel: Record<string, number> = {};
    const byProvider: Record<string, number> = {};

    for (const [key, count] of this.modelUsageCount) {
      byModel[key] = count;
      const [provider] = key.split("/");
      byProvider[provider] = (byProvider[provider] || 0) + count;
    }

    const totalRequests = Array.from(this.modelUsageCount.values()).reduce(
      (a, b) => a + b,
      0
    );

    return { totalRequests, byModel, byProvider };
  }

  // Private helpers
  private getTotalActiveRequests(): number {
    return Array.from(this.activeRequests.values()).reduce((a, b) => a + b, 0);
  }

  private getActiveRequestsByProvider(provider: string): number {
    let count = 0;
    for (const [key, value] of this.activeRequests) {
      if (key.startsWith(`${provider}/`)) {
        count += value;
      }
    }
    return count;
  }

  private getActiveRequestsByModel(modelKey: string): number {
    return this.activeRequests.get(modelKey) || 0;
  }

  /**
   * Reset all usage tracking
   */
  reset(): void {
    this.activeRequests.clear();
  }
}

// ============================================================================
// Model Chain Utilities
// ============================================================================

export function formatModelId(provider: string, model: string): string {
  return `${provider}/${model}`;
}

export function parseModelId(
  modelId: string
): { provider: string; model: string } | null {
  const parts = modelId.split("/");
  if (parts.length !== 2) {
    return null;
  }
  return { provider: parts[0], model: parts[1] };
}

export function getModelDisplayName(
  provider: string,
  model: string
): string {
  const info = FREE_PROVIDERS[provider];
  if (info) {
    return `${info.name} ${model}`;
  }
  return `${provider}:${model}`;
}

/**
 * Create a complete model configuration with defaults
 */
export function createModelConfig(
  provider: string,
  model: string,
  options?: {
    reasoning?: boolean;
    temperature?: number;
    maxTokens?: number;
  }
): ModelConfig {
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
export function validateModelChain(chain: ModelChainEntry[]): {
  valid: boolean;
  duplicates: string[];
} {
  const seen = new Set<string>();
  const duplicates: string[] = [];

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