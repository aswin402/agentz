// ============================================================================
// Agent Specifications
// ============================================================================
export const AGENT_SPECS = {
    planner: {
        type: "planner",
        name: "Planner",
        description: "Strategic planning agent that analyzes requirements, identifies gaps, and creates implementation plans",
        modelChain: [
            { provider: "groq", model: "llama-4-scout", reason: "Fast planning" },
            { provider: "cerebras", model: "cerebras-c4.1", reason: "Good reasoning" },
            { provider: "huggingchat", model: "mistral-coder", reason: "Fallback" },
        ],
        timeoutSeconds: 60,
        capabilities: ["code_read", "web_search", "web_fetch", "bash_execute"],
    },
    coder: {
        type: "coder",
        name: "Coder",
        description: "Implementation agent that writes actual code, creates files, and modifies existing code",
        modelChain: [
            { provider: "groq", model: "llama-4-scout", reason: "Fast coding" },
            { provider: "opencode", model: "qwen3.5-coder", reason: "Great at code" },
            { provider: "cerebras", model: "cerebras-c4.1", reason: "Strong reasoning" },
            { provider: "zai", model: "qwen-coder", reason: "Coding specialized" },
            { provider: "mistral", model: "codestral", reason: "Code focused" },
        ],
        timeoutSeconds: 120,
        capabilities: ["code_read", "code_write", "code_edit", "bash_execute", "file_create"],
    },
    tester: {
        type: "tester",
        name: "Tester",
        description: "Testing agent that writes tests, executes test suites, and verifies code behavior",
        modelChain: [
            { provider: "groq", model: "llama-4-scout", reason: "Fast test writing" },
            { provider: "cerebras", model: "cerebras-c4.1", reason: "Good test reasoning" },
            { provider: "opencode", model: "qwen3.5-coder", reason: "Can write tests" },
        ],
        timeoutSeconds: 90,
        capabilities: ["code_read", "test_write", "test_execute", "bash_execute"],
    },
    reviewer: {
        type: "reviewer",
        name: "Reviewer",
        description: "Code review agent that evaluates code quality, best practices, and provides improvement suggestions",
        modelChain: [
            { provider: "openai", model: "gpt-4o-mini", reason: "Code review" },
            { provider: "groq", model: "llama-4-scout", reason: "Fast review" },
            { provider: "cerebras", model: "cerebras-c4.1", reason: "Deep analysis" },
        ],
        timeoutSeconds: 60,
        capabilities: ["code_read", "web_search", "bash_execute"],
    },
    security: {
        type: "security",
        name: "Security",
        description: "Security agent that scans for vulnerabilities, checks for unsafe patterns, and validates authentication",
        modelChain: [
            { provider: "cerebras", model: "cerebras-c4.1", reason: "Security analysis" },
            { provider: "groq", model: "llama-4-scout", reason: "Fast scan" },
            { provider: "openai", model: "gpt-4o-mini", reason: "Security patterns" },
        ],
        timeoutSeconds: 60,
        capabilities: ["code_read", "security_scan", "web_search"],
    },
    docs: {
        type: "docs",
        name: "Docs",
        description: "Documentation agent that updates README, comments, and usage documentation",
        modelChain: [
            { provider: "groq", model: "llama-4-scout", reason: "Fast docs" },
            { provider: "google", model: "gemini-2.0-flash", reason: "Good at documentation" },
            { provider: "openai", model: "gpt-4o-mini", reason: "Writing quality" },
        ],
        timeoutSeconds: 90,
        capabilities: ["code_read", "docs_write", "file_create"],
    },
    refactor: {
        type: "refactor",
        name: "Refactor",
        description: "Refactoring agent that improves code architecture without changing behavior",
        modelChain: [
            { provider: "openai", model: "gpt-4o-mini", reason: "Refactoring patterns" },
            { provider: "groq", model: "llama-4-scout", reason: "Fast refactor" },
            { provider: "cerebras", model: "cerebras-c4.1", reason: "Deep analysis" },
        ],
        timeoutSeconds: 120,
        capabilities: ["code_read", "code_edit", "bash_execute"],
    },
    debugger: {
        type: "debugger",
        name: "Debugger",
        description: "Debugging agent that reproduces bugs, identifies root causes, and suggests fixes",
        modelChain: [
            { provider: "groq", model: "llama-4-scout", reason: "Fast debugging" },
            { provider: "openai", model: "gpt-4o-mini", reason: "Good at debugging" },
            { provider: "cerebras", model: "cerebras-c4.1", reason: "Deep reasoning" },
        ],
        timeoutSeconds: 90,
        capabilities: ["code_read", "code_edit", "bash_execute", "web_search"],
    },
    vision: {
        type: "vision",
        name: "Vision",
        description: "Vision agent that analyzes images, screenshots, and UI designs to provide context",
        modelChain: [
            { provider: "cosecure", model: "cosecure-vision", reason: "Vision specialized" },
            { provider: "google", model: "gemini-2.0-flash", reason: "Multi-modal" },
            { provider: "openai", model: "gpt-4o-mini", reason: "Vision support" },
        ],
        timeoutSeconds: 60,
        capabilities: ["image_analysis", "code_read", "web_fetch"],
    },
};
// ============================================================================
// Agent Factory
// ============================================================================
export class AgentFactory {
    static getSpec(type) {
        return AGENT_SPECS[type];
    }
    static getAllSpecs() {
        return Object.values(AGENT_SPECS);
    }
    static getSpecsByCapability(capability) {
        return Object.values(AGENT_SPECS).filter((spec) => spec.capabilities.includes(capability));
    }
    static createSubagentPrompt(type, context) {
        const spec = AGENT_SPECS[type];
        const capabilityList = spec.capabilities.join(", ");
        let prompt = `# ${spec.name} Agent

## Role
You are a ${spec.name.toLowerCase()} subagent operating under the AgentZ orchestration system. Your job is to ${spec.description.toLowerCase()}.

## Your Capabilities
${capabilityList}

## Current Task
${context.task}
`;
        if (context.sharedMemory) {
            prompt += `

## Shared Memory Context
${context.sharedMemory}
`;
        }
        if (context.previousLearnings && context.previousLearnings.length > 0) {
            prompt += `

## Previous Learnings (from other agents)
${context.previousLearnings.map((l) => `- ${l}`).join("\n")}
`;
        }
        if (context.skills && context.skills.length > 0) {
            prompt += `

## Active Skills
${context.skills.map((s) => `- ${s}`).join("\n")}
`;
        }
        prompt += `

## Output Format
Write your progress to the shared memory file. Structure your response as:

## {AgentName} @ {timestamp}

### Status
[STARTED | IN_PROGRESS | COMPLETED | FAILED | TIMEOUT]

### Work Performed
- What was done
- Files changed
- Decisions made

### Learnings (for future agents)
- Patterns discovered
- Conventions found
- Gotchas encountered

### Next Steps
- What should happen next
- Dependencies for other agents

### Output Artifacts
- Links to created/modified files
- Test results
- Verification status

---

## Execution Instructions
1. Read relevant files to understand context
2. Perform your designated task
3. Write results to shared memory
4. Report completion

Remember: You are a worker bee under the primary controller. Focus on execution, not planning.
`;
        return prompt;
    }
    static getSystemPrompt(type) {
        const spec = AGENT_SPECS[type];
        return `You are ${spec.name}, a ${spec.type} agent in the AgentZ system.

${spec.description}

Timeout: ${spec.timeoutSeconds} seconds
Capabilities: ${spec.capabilities.join(", ")}

You operate as part of a multi-agent team orchestrated by a primary controller model.
Focus on your specialization. Write results to shared memory.
Do not plan beyond your immediate task - let the controller handle orchestration.
`;
    }
}
// ============================================================================
// Intent Classification
// ============================================================================
export function classifyIntent(userRequest, hasImages = false) {
    const request = userRequest.toLowerCase();
    const agents = [];
    // Image attached → always include vision
    if (hasImages) {
        agents.push("vision");
    }
    // Intent classification
    if (request.includes("fix") ||
        request.includes("bug") ||
        request.includes("error") ||
        request.includes("broken") ||
        request.includes("crash")) {
        agents.push("debugger");
        if (request.includes("test"))
            agents.push("tester");
        return agents;
    }
    if (request.includes("implement") ||
        request.includes("create") ||
        request.includes("add") ||
        request.includes("build") ||
        request.includes("new")) {
        agents.push("coder");
        if (request.includes("test"))
            agents.push("tester");
        if (request.includes("document"))
            agents.push("docs");
        return agents;
    }
    if (request.includes("refactor") ||
        request.includes("improve") ||
        request.includes("clean") ||
        request.includes("restructure")) {
        agents.push("refactor");
        return agents;
    }
    if (request.includes("review") ||
        request.includes("check") ||
        request.includes("evaluate") ||
        request.includes("critique")) {
        agents.push("reviewer");
        return agents;
    }
    if (request.includes("document") ||
        request.includes("readme") ||
        request.includes("comment") ||
        request.includes("docs")) {
        agents.push("docs");
        return agents;
    }
    if (request.includes("security") ||
        request.includes("vulnerability") ||
        request.includes("auth") ||
        request.includes("unsafe")) {
        agents.push("security");
        return agents;
    }
    // Default: research/planning mode
    agents.push("planner");
    agents.push("coder");
    return agents;
}
export const FREE_PROVIDERS = {
    groq: {
        name: "Groq",
        baseUrl: "https://api.groq.com/openai/v1",
        models: ["llama-4-scout", "llama-4-marble", "mixtral-8x7b"],
        bestFor: ["fast coding", "planning", "quick tasks"],
    },
    cerebras: {
        name: "Cerebras",
        baseUrl: "https://api.cerebras.ai/v1",
        models: ["cerebras-c4.1", "llama-3.3-70b"],
        bestFor: ["reasoning", "security", "deep analysis"],
    },
    opencode: {
        name: "OpenCode",
        baseUrl: "https://opencode.ai/api/v1",
        models: ["qwen3.5-coder", "deepseek-coder"],
        bestFor: ["coding", "debugging"],
    },
    zai: {
        name: "Z.ai",
        baseUrl: "https://api.z.ai/v1",
        models: ["qwen-coder", "glm-coder"],
        bestFor: ["coding tasks"],
    },
    cosecure: {
        name: "Cosecure",
        baseUrl: "https://api.cosecure.ai/v1",
        models: ["cosecure-vision"],
        bestFor: ["vision tasks", "image analysis"],
    },
    google: {
        name: "Google AI",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        models: ["gemini-2.0-flash", "gemini-1.5-flash"],
        bestFor: ["docs", "fast tasks", "multi-modal"],
    },
    mistral: {
        name: "Mistral",
        baseUrl: "https://api.mistral.ai/v1",
        models: ["codestral", "pixtral"],
        bestFor: ["coding", "vision"],
    },
    openai: {
        name: "OpenAI",
        baseUrl: "https://api.openai.com/v1",
        models: ["gpt-4o-mini", "gpt-4o"],
        bestFor: ["review", "security", "quality"],
    },
    huggingchat: {
        name: "HuggingChat",
        baseUrl: "https://api.huggingface.co/v1",
        models: ["mistral-coder", "llama-3.1"],
        bestFor: ["light tasks", "fallback"],
    },
};
export default AgentFactory;
//# sourceMappingURL=factory.js.map