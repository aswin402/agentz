import { z } from "zod";
import type { AgentZConfig, AgentType } from "../types/index.js";
declare const AgentModelChainSchema: z.ZodObject<{
    modelChain: z.ZodArray<z.ZodObject<{
        provider: z.ZodString;
        model: z.ZodString;
        reasoning: z.ZodOptional<z.ZodBoolean>;
        temperature: z.ZodOptional<z.ZodNumber>;
        maxTokens: z.ZodOptional<z.ZodNumber>;
        reason: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        provider: string;
        model: string;
        reasoning?: boolean | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        reason?: string | undefined;
    }, {
        provider: string;
        model: string;
        reasoning?: boolean | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        reason?: string | undefined;
    }>, "many">;
    timeoutSeconds: z.ZodDefault<z.ZodNumber>;
    fallbackTrigger: z.ZodOptional<z.ZodEnum<["no_output", "error", "timeout"]>>;
}, "strip", z.ZodTypeAny, {
    modelChain: {
        provider: string;
        model: string;
        reasoning?: boolean | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        reason?: string | undefined;
    }[];
    timeoutSeconds: number;
    fallbackTrigger?: "no_output" | "error" | "timeout" | undefined;
}, {
    modelChain: {
        provider: string;
        model: string;
        reasoning?: boolean | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        reason?: string | undefined;
    }[];
    timeoutSeconds?: number | undefined;
    fallbackTrigger?: "no_output" | "error" | "timeout" | undefined;
}>;
export declare const AgentZConfigSchema: z.ZodObject<{
    primary: z.ZodObject<{
        model: z.ZodString;
        role: z.ZodLiteral<"controller">;
    }, "strip", z.ZodTypeAny, {
        model: string;
        role: "controller";
    }, {
        model: string;
        role: "controller";
    }>;
    agents: z.ZodDefault<z.ZodRecord<z.ZodEnum<["planner", "coder", "tester", "reviewer", "security", "docs", "refactor", "debugger", "vision"]>, z.ZodObject<{
        modelChain: z.ZodArray<z.ZodObject<{
            provider: z.ZodString;
            model: z.ZodString;
            reasoning: z.ZodOptional<z.ZodBoolean>;
            temperature: z.ZodOptional<z.ZodNumber>;
            maxTokens: z.ZodOptional<z.ZodNumber>;
            reason: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            provider: string;
            model: string;
            reasoning?: boolean | undefined;
            temperature?: number | undefined;
            maxTokens?: number | undefined;
            reason?: string | undefined;
        }, {
            provider: string;
            model: string;
            reasoning?: boolean | undefined;
            temperature?: number | undefined;
            maxTokens?: number | undefined;
            reason?: string | undefined;
        }>, "many">;
        timeoutSeconds: z.ZodDefault<z.ZodNumber>;
        fallbackTrigger: z.ZodOptional<z.ZodEnum<["no_output", "error", "timeout"]>>;
    }, "strip", z.ZodTypeAny, {
        modelChain: {
            provider: string;
            model: string;
            reasoning?: boolean | undefined;
            temperature?: number | undefined;
            maxTokens?: number | undefined;
            reason?: string | undefined;
        }[];
        timeoutSeconds: number;
        fallbackTrigger?: "no_output" | "error" | "timeout" | undefined;
    }, {
        modelChain: {
            provider: string;
            model: string;
            reasoning?: boolean | undefined;
            temperature?: number | undefined;
            maxTokens?: number | undefined;
            reason?: string | undefined;
        }[];
        timeoutSeconds?: number | undefined;
        fallbackTrigger?: "no_output" | "error" | "timeout" | undefined;
    }>>>;
    parallel: z.ZodDefault<z.ZodObject<{
        maxAgents: z.ZodDefault<z.ZodNumber>;
        perProvider: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        perModel: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        maxAgents: number;
        perProvider: Record<string, number>;
        perModel: Record<string, number>;
    }, {
        maxAgents?: number | undefined;
        perProvider?: Record<string, number> | undefined;
        perModel?: Record<string, number> | undefined;
    }>>;
    verification: z.ZodDefault<z.ZodObject<{
        autoFix: z.ZodDefault<z.ZodBoolean>;
        maxAttempts: z.ZodDefault<z.ZodNumber>;
        requireTests: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        autoFix: boolean;
        maxAttempts: number;
        requireTests: boolean;
    }, {
        autoFix?: boolean | undefined;
        maxAttempts?: number | undefined;
        requireTests?: boolean | undefined;
    }>>;
    skills: z.ZodDefault<z.ZodObject<{
        enable: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        sources: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        enable: string[];
        sources: string[];
    }, {
        enable?: string[] | undefined;
        sources?: string[] | undefined;
    }>>;
    specWorkflow: z.ZodDefault<z.ZodObject<{
        autoApproveSimple: z.ZodDefault<z.ZodBoolean>;
        requireReviewComplex: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        autoApproveSimple: boolean;
        requireReviewComplex: boolean;
    }, {
        autoApproveSimple?: boolean | undefined;
        requireReviewComplex?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    primary: {
        model: string;
        role: "controller";
    };
    agents: Partial<Record<"refactor" | "docs" | "planner" | "coder" | "tester" | "reviewer" | "security" | "debugger" | "vision", {
        modelChain: {
            provider: string;
            model: string;
            reasoning?: boolean | undefined;
            temperature?: number | undefined;
            maxTokens?: number | undefined;
            reason?: string | undefined;
        }[];
        timeoutSeconds: number;
        fallbackTrigger?: "no_output" | "error" | "timeout" | undefined;
    }>>;
    parallel: {
        maxAgents: number;
        perProvider: Record<string, number>;
        perModel: Record<string, number>;
    };
    verification: {
        autoFix: boolean;
        maxAttempts: number;
        requireTests: boolean;
    };
    skills: {
        enable: string[];
        sources: string[];
    };
    specWorkflow: {
        autoApproveSimple: boolean;
        requireReviewComplex: boolean;
    };
}, {
    primary: {
        model: string;
        role: "controller";
    };
    agents?: Partial<Record<"refactor" | "docs" | "planner" | "coder" | "tester" | "reviewer" | "security" | "debugger" | "vision", {
        modelChain: {
            provider: string;
            model: string;
            reasoning?: boolean | undefined;
            temperature?: number | undefined;
            maxTokens?: number | undefined;
            reason?: string | undefined;
        }[];
        timeoutSeconds?: number | undefined;
        fallbackTrigger?: "no_output" | "error" | "timeout" | undefined;
    }>> | undefined;
    parallel?: {
        maxAgents?: number | undefined;
        perProvider?: Record<string, number> | undefined;
        perModel?: Record<string, number> | undefined;
    } | undefined;
    verification?: {
        autoFix?: boolean | undefined;
        maxAttempts?: number | undefined;
        requireTests?: boolean | undefined;
    } | undefined;
    skills?: {
        enable?: string[] | undefined;
        sources?: string[] | undefined;
    } | undefined;
    specWorkflow?: {
        autoApproveSimple?: boolean | undefined;
        requireReviewComplex?: boolean | undefined;
    } | undefined;
}>;
export declare const DEFAULT_MODEL_CHAINS: Record<AgentType, z.infer<typeof AgentModelChainSchema>>;
export declare class ConfigManager {
    private config;
    private configPath;
    private projectRoot;
    constructor(projectRoot?: string);
    private loadConfig;
    getConfig(): AgentZConfig;
    getAgentChain(agentType: AgentType): z.infer<typeof AgentModelChainSchema>;
    getPrimaryModel(): string;
    getParallelConfig(): {
        maxAgents: number;
        perProvider: Record<string, number>;
        perModel: Record<string, number>;
    };
    getVerificationConfig(): {
        autoFix: boolean;
        maxAttempts: number;
        requireTests: boolean;
    };
    updateConfig(updates: Partial<AgentZConfig>): void;
    updateAgentChain(agentType: AgentType, chain: z.infer<typeof AgentModelChainSchema>): void;
    private saveConfig;
    resetToDefaults(): void;
    validate(): {
        valid: boolean;
        errors: string[];
    };
    getModelForAgent(agentType: AgentType, fallbackIndex?: number): {
        provider: string;
        model: string;
    } | null;
}
export declare function findConfigFile(startDir: string): string | null;
export declare function generateConfigTemplate(): string;
export declare const configManager: ConfigManager;
export default ConfigManager;
//# sourceMappingURL=config.d.ts.map