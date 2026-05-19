import { z } from "zod";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";
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
        .record(z.enum([
        "planner",
        "coder",
        "tester",
        "reviewer",
        "security",
        "docs",
        "refactor",
        "debugger",
        "vision",
    ]), AgentModelChainSchema)
        .default({}),
    parallel: ParallelConfigSchema.default({}),
    verification: VerificationConfigSchema.default({}),
    skills: SkillsConfigSchema.default({}),
    specWorkflow: SpecWorkflowConfigSchema.default({}),
});
// ============================================================================
// Default Configuration
// ============================================================================
export const DEFAULT_MODEL_CHAINS = {
    planner: {
        modelChain: [
            { provider: "groq", model: "llama-4-scout", reason: "Fast planning" },
            { provider: "cerebras", model: "cerebras-c4.1", reason: "Good reasoning" },
            { provider: "huggingchat", model: "mistral-coder", reason: "Fallback" },
        ],
        timeoutSeconds: 60,
        fallbackTrigger: "no_output",
    },
    coder: {
        modelChain: [
            { provider: "groq", model: "llama-4-scout", reason: "Fast coding" },
            { provider: "opencode", model: "qwen3.5-coder", reason: "Great at code" },
            { provider: "cerebras", model: "cerebras-c4.1", reason: "Strong reasoning" },
            { provider: "zai", model: "qwen-coder", reason: "Coding specialized" },
            { provider: "mistral", model: "codestral", reason: "Code focused" },
        ],
        timeoutSeconds: 120,
        fallbackTrigger: "no_output",
    },
    tester: {
        modelChain: [
            { provider: "groq", model: "llama-4-scout", reason: "Fast test writing" },
            { provider: "cerebras", model: "cerebras-c4.1", reason: "Good test reasoning" },
            { provider: "opencode", model: "qwen3.5-coder", reason: "Can write tests" },
        ],
        timeoutSeconds: 90,
        fallbackTrigger: "no_output",
    },
    reviewer: {
        modelChain: [
            { provider: "openai", model: "gpt-4o-mini", reason: "Code review" },
            { provider: "groq", model: "llama-4-scout", reason: "Fast review" },
            { provider: "cerebras", model: "cerebras-c4.1", reason: "Deep analysis" },
        ],
        timeoutSeconds: 60,
        fallbackTrigger: "no_output",
    },
    security: {
        modelChain: [
            { provider: "cerebras", model: "cerebras-c4.1", reason: "Security analysis" },
            { provider: "groq", model: "llama-4-scout", reason: "Fast scan" },
            { provider: "openai", model: "gpt-4o-mini", reason: "Security patterns" },
        ],
        timeoutSeconds: 60,
        fallbackTrigger: "error",
    },
    docs: {
        modelChain: [
            { provider: "groq", model: "llama-4-scout", reason: "Fast docs" },
            { provider: "google", model: "gemini-2.0-flash", reason: "Good at documentation" },
            { provider: "openai", model: "gpt-4o-mini", reason: "Writing quality" },
        ],
        timeoutSeconds: 90,
        fallbackTrigger: "no_output",
    },
    refactor: {
        modelChain: [
            { provider: "openai", model: "gpt-4o-mini", reason: "Refactoring patterns" },
            { provider: "groq", model: "llama-4-scout", reason: "Fast refactor" },
            { provider: "cerebras", model: "cerebras-c4.1", reason: "Deep analysis" },
        ],
        timeoutSeconds: 120,
        fallbackTrigger: "no_output",
    },
    debugger: {
        modelChain: [
            { provider: "groq", model: "llama-4-scout", reason: "Fast debugging" },
            { provider: "openai", model: "gpt-4o-mini", reason: "Good at debugging" },
            { provider: "cerebras", model: "cerebras-c4.1", reason: "Deep reasoning" },
        ],
        timeoutSeconds: 90,
        fallbackTrigger: "no_output",
    },
    vision: {
        modelChain: [
            { provider: "cosecure", model: "cosecure-vision", reason: "Vision specialized" },
            { provider: "google", model: "gemini-2.0-flash", reason: "Multi-modal" },
            { provider: "openai", model: "gpt-4o-mini", reason: "Vision support" },
        ],
        timeoutSeconds: 60,
        fallbackTrigger: "error",
    },
};
const DEFAULT_CONFIG = {
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
    config;
    configPath;
    projectRoot;
    constructor(projectRoot = process.cwd()) {
        this.projectRoot = projectRoot;
        this.configPath = join(projectRoot, ".agentz", "config.json");
        this.config = this.loadConfig();
    }
    loadConfig() {
        // Try to load existing config
        if (existsSync(this.configPath)) {
            try {
                const raw = readFileSync(this.configPath, "utf-8");
                const parsed = JSON.parse(raw);
                const result = AgentZConfigSchema.safeParse(parsed);
                if (result.success) {
                    return result.data;
                }
                console.warn(`[AgentZ] Config validation failed: ${result.error.message}. Using defaults.`);
            }
            catch (error) {
                console.warn(`[AgentZ] Failed to load config: ${error instanceof Error ? error.message : "Unknown error"}. Using defaults.`);
            }
        }
        // Return default config
        return { ...DEFAULT_CONFIG };
    }
    getConfig() {
        return { ...this.config };
    }
    getAgentChain(agentType) {
        return (this.config.agents[agentType] || DEFAULT_MODEL_CHAINS[agentType]);
    }
    getPrimaryModel() {
        return this.config.primary.model;
    }
    getParallelConfig() {
        return { ...this.config.parallel };
    }
    getVerificationConfig() {
        return { ...this.config.verification };
    }
    updateConfig(updates) {
        const result = AgentZConfigSchema.safeParse({
            ...this.config,
            ...updates,
        });
        if (result.success) {
            this.config = result.data;
            this.saveConfig();
        }
        else {
            throw new Error(`Invalid config updates: ${result.error.message}`);
        }
    }
    updateAgentChain(agentType, chain) {
        this.config.agents[agentType] = chain;
        this.saveConfig();
    }
    saveConfig() {
        const dir = join(this.projectRoot, ".agentz");
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), "utf-8");
    }
    resetToDefaults() {
        this.config = { ...DEFAULT_CONFIG };
        this.saveConfig();
    }
    validate() {
        const result = AgentZConfigSchema.safeParse(this.config);
        if (result.success) {
            return { valid: true, errors: [] };
        }
        return {
            valid: false,
            errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        };
    }
    getModelForAgent(agentType, fallbackIndex = 0) {
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
export function findConfigFile(startDir) {
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
export function generateConfigTemplate() {
    return JSON.stringify(DEFAULT_CONFIG, null, 2);
}
// ============================================================================
// Exports
// ============================================================================
export const configManager = new ConfigManager();
export default ConfigManager;
//# sourceMappingURL=config.js.map