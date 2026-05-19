import type { AgentSpec, AgentType, AgentCapability } from "../types/index.js";
export declare const AGENT_SPECS: Record<AgentType, AgentSpec>;
export declare class AgentFactory {
    static getSpec(type: AgentType): AgentSpec;
    static getAllSpecs(): AgentSpec[];
    static getSpecsByCapability(capability: AgentCapability): AgentSpec[];
    static createSubagentPrompt(type: AgentType, context: {
        task: string;
        sharedMemory?: string;
        skills?: string[];
        previousLearnings?: string[];
    }): string;
    static getSystemPrompt(type: AgentType): string;
}
export declare function classifyIntent(userRequest: string, hasImages?: boolean): AgentType[];
export interface ProviderInfo {
    name: string;
    baseUrl: string;
    models: string[];
    bestFor: string[];
}
export declare const FREE_PROVIDERS: Record<string, ProviderInfo>;
export default AgentFactory;
//# sourceMappingURL=factory.d.ts.map