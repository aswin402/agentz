import { z } from "zod";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import type { AgentZConfig, AgentType } from "../types/index.js";

// ============================================================================
// Zod Schemas
// ============================================================================

const ModelChainEntrySchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  reasoning: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  reason: z.string().optional(),
});

const AgentModelChainSchema = z.object({
  modelChain: z.array(ModelChainEntrySchema).min(1),
  timeoutSeconds: z.number().positive().default(60),
  fallbackTrigger: z.enum(["no_output", "error", "timeout"]).optional(),
});

const ParallelConfigSchema = z.object({
  maxAgents: z.number().positive().default(5),
  perProvider: z.record(z.string(), z.number()).default({}),
  perModel: z.record(z.string(), z.number()).default({}),
});

const VerificationConfigSchema = z.object({
  autoFix: z.boolean().default(true),
  maxAttempts: z.number().positive().default(3),
  requireTests: z.boolean().default(true),
});

const SkillsConfigSchema = z.object({
  enable: z.array(z.string()).default([]),
  sources: z.array(z.string()).default([".agentz/skills"]),
});

const SpecWorkflowConfigSchema = z.object({
  autoApproveSimple: z.boolean().default(true),
  requireReviewComplex: z.boolean().default(true),
});

const PrimaryConfigSchema = z.object({
  model: z.string().min(1),
  role: z.literal("controller"),
});

export const AgentZConfigSchema = z.object({
  primary: PrimaryConfigSchema,
  agents: z
    .record(
      z.enum([
        "planner",
        "coder",
        "tester",
        "reviewer",
        "security",
        "docs",
        "refactor",
        "debugger",
        "vision",
      ]),
      AgentModelChainSchema
    )
    .default({}),
  parallel: ParallelConfigSchema.default({}),
  verification: VerificationConfigSchema.default({}),
  skills: SkillsConfigSchema.default({}),
  specWorkflow: SpecWorkflowConfigSchema.default({}),
});

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_MODEL_CHAINS: Record<AgentType, z.infer<typeof AgentModelChainSchema>> = {
  planner: {
    modelChain: [
      { provider: "groq", model: "meta-llama/llama-4-scout-17b-16e-instruct", reason: "Fast planning" },
      { provider: "cerebras", model: "qwen-3-235b-a22b-instruct-2507", reason: "Good reasoning" },
      { provider: "ollama-cloud", model: "minimax-m2.7", reason: "Fallback" },
      { provider: "opencode", model: "qwen3.6-plus-free", reason: "Secondary fallback" },
    ],
    timeoutSeconds: 60,
    fallbackTrigger: "no_output",
  },
  coder: {
    modelChain: [
      { provider: "mistral", model: "devstral-small-2507", reason: "Best free coding agent" },
      { provider: "groq", model: "meta-llama/llama-4-scout-17b-16e-instruct", reason: "Fast coding fallback" },
      { provider: "cerebras", model: "gpt-oss-120b", reason: "Strong reasoning" },
      { provider: "nvidia", model: "qwen/qwen3-coder-480b-a35b-instruct", reason: "Heavy coding fallback" },
    ],
    timeoutSeconds: 120,
    fallbackTrigger: "no_output",
  },
  tester: {
    modelChain: [
      { provider: "groq", model: "meta-llama/llama-4-scout-17b-16e-instruct", reason: "Fast test writing" },
      { provider: "cerebras", model: "llama3.1-8b", reason: "Ultra-fast testing" },
      { provider: "mistral", model: "codestral-latest", reason: "Code completion" },
      { provider: "opencode", model: "qwen3.6-plus-free", reason: "Secondary fallback" },
    ],
    timeoutSeconds: 90,
    fallbackTrigger: "no_output",
  },
  reviewer: {
    modelChain: [
      { provider: "groq", model: "qwen/qwen3-32b", reason: "Strong reviewer" },
      { provider: "cerebras", model: "qwen-3-235b-a22b-instruct-2507", reason: "Deep analysis" },
      { provider: "nvidia", model: "meta/llama-3.3-70b-instruct", reason: "Complex review" },
      { provider: "ollama-cloud", model: "qwen3-next:80b", reason: "Secondary fallback" },
    ],
    timeoutSeconds: 60,
    fallbackTrigger: "no_output",
  },
  security: {
    modelChain: [
      { provider: "cerebras", model: "qwen-3-235b-a22b-instruct-2507", reason: "Security analysis" },
      { provider: "groq", model: "qwen/qwen3-32b", reason: "Fast scan" },
      { provider: "nvidia", model: "meta/llama-guard-4-12b", reason: "Safety specialized" },
      { provider: "groq", model: "llama-3.3-70b-versatile", reason: "Secondary fallback" },
    ],
    timeoutSeconds: 60,
    fallbackTrigger: "error",
  },
  docs: {
    modelChain: [
      { provider: "groq", model: "llama-3.3-70b-versatile", reason: "Best writing quality" },
      { provider: "mistral", model: "mistral-small-latest", reason: "Fast general tasks" },
      { provider: "cerebras", model: "gpt-oss-120b", reason: "Deep reasoning" },
      { provider: "ollama-cloud", model: "gemma4:31b", reason: "Secondary fallback" },
    ],
    timeoutSeconds: 90,
    fallbackTrigger: "no_output",
  },
  refactor: {
    modelChain: [
      { provider: "mistral", model: "devstral-medium-latest", reason: "Agentic + larger context" },
      { provider: "groq", model: "qwen/qwen3-32b", reason: "Fast refactor" },
      { provider: "cerebras", model: "qwen-3-235b-a22b-instruct-2507", reason: "Deep analysis" },
      { provider: "nvidia", model: "qwen/qwen3.5-122b-a10b", reason: "Secondary fallback" },
    ],
    timeoutSeconds: 120,
    fallbackTrigger: "no_output",
  },
  debugger: {
    modelChain: [
      { provider: "groq", model: "meta-llama/llama-4-scout-17b-16e-instruct", reason: "Fast debugging" },
      { provider: "cerebras", model: "qwen-3-235b-a22b-instruct-2507", reason: "Deep reasoning" },
      { provider: "nvidia", model: "deepseek-ai/deepseek-v4-flash", reason: "Fast coding" },
      { provider: "groq", model: "llama-3.3-70b-versatile", reason: "Secondary fallback" },
    ],
    timeoutSeconds: 90,
    fallbackTrigger: "no_output",
  },
  vision: {
    modelChain: [
      { provider: "google", model: "gemini-2.5-flash", reason: "Primary vision - best quality+speed" },
      { provider: "nvidia", model: "meta/llama-3.2-11b-vision-instruct", reason: "Vision fallback" },
      { provider: "nvidia", model: "meta/llama-3.2-90b-vision-instruct", reason: "Complex image understanding" },
      { provider: "google", model: "gemini-2.5-flash-preview-05-20", reason: "Vision alternative" },
    ],
    timeoutSeconds: 60,
    fallbackTrigger: "error",
  },
};

const DEFAULT_CONFIG: AgentZConfig = {
  primary: {
    model: "minimax/m2.7",
    role: "controller",
  },
  agents: {
    planner: DEFAULT_MODEL_CHAINS.planner,
    coder: DEFAULT_MODEL_CHAINS.coder,
    tester: DEFAULT_MODEL_CHAINS.tester,
    reviewer: DEFAULT_MODEL_CHAINS.reviewer,
    security: DEFAULT_MODEL_CHAINS.security,
    docs: DEFAULT_MODEL_CHAINS.docs,
    refactor: DEFAULT_MODEL_CHAINS.refactor,
    debugger: DEFAULT_MODEL_CHAINS.debugger,
    vision: DEFAULT_MODEL_CHAINS.vision,
  },
  parallel: {
    maxAgents: 5,
    perProvider: {
      groq: 3,
      cerebras: 2,
      openai: 2,
      cosecure: 1,
    },
    perModel: {},
  },
  verification: {
    autoFix: true,
    maxAttempts: 3,
    requireTests: true,
  },
  skills: {
    enable: ["playwright", "git-master", "frontend-ui-ux"],
    sources: [".agentz/skills"],
  },
  specWorkflow: {
    autoApproveSimple: true,
    requireReviewComplex: true,
  },
};

// ============================================================================
// Configuration Manager
// ============================================================================

export class ConfigManager {
  private config: AgentZConfig;
  private configPath: string;
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.configPath = join(projectRoot, ".agentz", "config.json");
    this.config = this.loadConfig();
  }

  private loadConfig(): AgentZConfig {
    // Try to load existing config
    if (existsSync(this.configPath)) {
      try {
        const raw = readFileSync(this.configPath, "utf-8");
        const parsed = JSON.parse(raw);
        const result = AgentZConfigSchema.safeParse(parsed);
        if (result.success) {
          return result.data;
        }
        console.warn(
          `[AgentZ] Config validation failed: ${result.error.message}. Using defaults.`
        );
      } catch (error) {
        console.warn(
          `[AgentZ] Failed to load config: ${error instanceof Error ? error.message : "Unknown error"}. Using defaults.`
        );
      }
    }

    // Return default config
    return { ...DEFAULT_CONFIG };
  }

  getConfig(): AgentZConfig {
    return { ...this.config };
  }

  getAgentChain(agentType: AgentType): z.infer<typeof AgentModelChainSchema> {
    return (
      this.config.agents[agentType] || DEFAULT_MODEL_CHAINS[agentType]
    );
  }

  getPrimaryModel(): string {
    return this.config.primary.model;
  }

  getParallelConfig() {
    return { ...this.config.parallel };
  }

  getVerificationConfig() {
    return { ...this.config.verification };
  }

  updateConfig(updates: Partial<AgentZConfig>): void {
    const result = AgentZConfigSchema.safeParse({
      ...this.config,
      ...updates,
    });
    if (result.success) {
      this.config = result.data;
      this.saveConfig();
    } else {
      throw new Error(`Invalid config updates: ${result.error.message}`);
    }
  }

  updateAgentChain(
    agentType: AgentType,
    chain: z.infer<typeof AgentModelChainSchema>
  ): void {
    this.config.agents[agentType] = chain;
    this.saveConfig();
  }

  private saveConfig(): void {
    const dir = join(this.projectRoot, ".agentz");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), "utf-8");
  }

  resetToDefaults(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.saveConfig();
  }

  validate(): { valid: boolean; errors: string[] } {
    const result = AgentZConfigSchema.safeParse(this.config);
    if (result.success) {
      return { valid: true, errors: [] };
    }
    return {
      valid: false,
      errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
    };
  }

  getModelForAgent(
    agentType: AgentType,
    fallbackIndex: number = 0
  ): { provider: string; model: string } | null {
    const chain = this.getAgentChain(agentType);
    if (fallbackIndex >= chain.modelChain.length) {
      return null;
    }
    return chain.modelChain[fallbackIndex];
  }
}

// ============================================================================
// Config File Locations
// ============================================================================

export function findConfigFile(startDir: string): string | null {
  let dir = resolve(startDir);
  const home = resolve(process.env.HOME || "/");

  while (true) {
    const configPath = join(dir, ".agentz", "config.json");
    if (existsSync(configPath)) {
      return configPath;
    }

    // Stop at home directory or filesystem root
    if (dir === home || dir === "/") {
      break;
    }

    // Move up one directory
    dir = resolve(dir, "..");
  }

  return null;
}

// ============================================================================
// Config Templates
// ============================================================================

export function generateConfigTemplate(): string {
  return JSON.stringify(DEFAULT_CONFIG, null, 2);
}

// ============================================================================
// Exports
// ============================================================================

export const configManager = new ConfigManager();

export default ConfigManager;
