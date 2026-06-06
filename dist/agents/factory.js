// ============================================================================
// Agent Specifications
// ============================================================================
export const AGENT_SPECS = {
    planner: {
        type: "planner",
        name: "Planner",
        description: "Strategic planning agent that analyzes requirements, identifies gaps, and creates implementation plans",
        modelChain: [
            { provider: "groq", model: "meta-llama/llama-4-scout-17b-16e-instruct", reason: "Fast planning" },
            { provider: "cerebras", model: "qwen-3-235b-a22b-instruct-2507", reason: "Good reasoning" },
            { provider: "ollama-cloud", model: "minimax-m2.7", reason: "Fallback" },
            { provider: "opencode", model: "qwen3.6-plus-free", reason: "Secondary fallback" },
        ],
        timeoutSeconds: 60,
        capabilities: ["code_read", "web_search", "web_fetch", "bash_execute"],
    },
    coder: {
        type: "coder",
        name: "Coder",
        description: "Implementation agent that writes actual code, creates files, and modifies existing code",
        modelChain: [
            { provider: "mistral", model: "devstral-small-2507", reason: "Best free coding agent" },
            { provider: "groq", model: "meta-llama/llama-4-scout-17b-16e-instruct", reason: "Fast coding fallback" },
            { provider: "cerebras", model: "gpt-oss-120b", reason: "Strong reasoning" },
            { provider: "nvidia", model: "qwen/qwen3-coder-480b-a35b-instruct", reason: "Heavy coding fallback" },
        ],
        timeoutSeconds: 120,
        capabilities: ["code_read", "code_write", "code_edit", "bash_execute", "file_create"],
    },
    tester: {
        type: "tester",
        name: "Tester",
        description: "Testing agent that writes tests, executes test suites, and verifies code behavior",
        modelChain: [
            { provider: "groq", model: "meta-llama/llama-4-scout-17b-16e-instruct", reason: "Fast test writing" },
            { provider: "cerebras", model: "llama3.1-8b", reason: "Ultra-fast testing" },
            { provider: "mistral", model: "codestral-latest", reason: "Code completion" },
            { provider: "opencode", model: "qwen3.6-plus-free", reason: "Secondary fallback" },
        ],
        timeoutSeconds: 90,
        capabilities: ["code_read", "test_write", "test_execute", "bash_execute"],
    },
    reviewer: {
        type: "reviewer",
        name: "Reviewer",
        description: "Code review agent that evaluates code quality, best practices, and provides improvement suggestions",
        modelChain: [
            { provider: "groq", model: "qwen/qwen3-32b", reason: "Strong reviewer" },
            { provider: "cerebras", model: "qwen-3-235b-a22b-instruct-2507", reason: "Deep analysis" },
            { provider: "nvidia", model: "meta/llama-3.3-70b-instruct", reason: "Complex review" },
            { provider: "ollama-cloud", model: "qwen3-next:80b", reason: "Secondary fallback" },
        ],
        timeoutSeconds: 60,
        capabilities: ["code_read", "web_search", "bash_execute"],
    },
    security: {
        type: "security",
        name: "Security",
        description: "Security agent that scans for vulnerabilities, checks for unsafe patterns, and validates authentication",
        modelChain: [
            { provider: "cerebras", model: "qwen-3-235b-a22b-instruct-2507", reason: "Security analysis" },
            { provider: "groq", model: "qwen/qwen3-32b", reason: "Fast scan" },
            { provider: "nvidia", model: "meta/llama-guard-4-12b", reason: "Safety specialized" },
            { provider: "groq", model: "llama-3.3-70b-versatile", reason: "Secondary fallback" },
        ],
        timeoutSeconds: 60,
        capabilities: ["code_read", "security_scan", "web_search"],
    },
    docs: {
        type: "docs",
        name: "Docs",
        description: "Documentation agent that updates README, comments, and usage documentation",
        modelChain: [
            { provider: "groq", model: "llama-3.3-70b-versatile", reason: "Best writing quality" },
            { provider: "mistral", model: "mistral-small-latest", reason: "Fast general tasks" },
            { provider: "cerebras", model: "gpt-oss-120b", reason: "Deep reasoning" },
            { provider: "ollama-cloud", model: "gemma4:31b", reason: "Secondary fallback" },
        ],
        timeoutSeconds: 90,
        capabilities: ["code_read", "docs_write", "file_create"],
    },
    refactor: {
        type: "refactor",
        name: "Refactor",
        description: "Refactoring agent that improves code architecture without changing behavior",
        modelChain: [
            { provider: "mistral", model: "devstral-medium-latest", reason: "Agentic + larger context" },
            { provider: "groq", model: "qwen/qwen3-32b", reason: "Fast refactor" },
            { provider: "cerebras", model: "qwen-3-235b-a22b-instruct-2507", reason: "Deep analysis" },
            { provider: "nvidia", model: "qwen/qwen3.5-122b-a10b", reason: "Secondary fallback" },
        ],
        timeoutSeconds: 120,
        capabilities: ["code_read", "code_edit", "bash_execute"],
    },
    debugger: {
        type: "debugger",
        name: "Debugger",
        description: "Debugging agent that reproduces bugs, identifies root causes, and suggests fixes",
        modelChain: [
            { provider: "groq", model: "meta-llama/llama-4-scout-17b-16e-instruct", reason: "Fast debugging" },
            { provider: "cerebras", model: "qwen-3-235b-a22b-instruct-2507", reason: "Deep reasoning" },
            { provider: "nvidia", model: "deepseek-ai/deepseek-v4-flash", reason: "Fast coding" },
            { provider: "groq", model: "llama-3.3-70b-versatile", reason: "Secondary fallback" },
        ],
        timeoutSeconds: 90,
        capabilities: ["code_read", "code_edit", "bash_execute", "web_search"],
    },
    vision: {
        type: "vision",
        name: "Vision",
        description: "Vision agent that analyzes images, screenshots, and UI designs to provide context",
        modelChain: [
            { provider: "google", model: "gemini-2.5-flash", reason: "Primary vision - Google AI Studio Gemini 2.5 Flash" },
            { provider: "openrouter", model: "google/gemini-2.5-flash", reason: "Fallback Gemini 2.5 Flash on OpenRouter" },
            { provider: "nvidia", model: "meta/llama-3.2-90b-vision-instruct", reason: "Fallback Llama 3.2 90B Vision on NVIDIA" },
            { provider: "openrouter", model: "meta-llama/llama-3.2-90b-vision-instruct", reason: "Fallback Llama 3.2 90B Vision on OpenRouter" },
            { provider: "openrouter", model: "google/gemini-2.5-flash-lite", reason: "Fallback Gemini 2.5 Flash Lite on OpenRouter" },
            { provider: "openrouter", model: "google/gemini-3.1-flash-lite", reason: "Fallback Gemini 3.1 Flash Lite on OpenRouter" },
        ],
        timeoutSeconds: 60,
        capabilities: ["image_analysis", "code_read", "web_fetch"],
    },
    researcher: {
        type: "researcher",
        name: "Researcher",
        description: "Technical research agent that fetches documentation, reads files, and gathers API references",
        modelChain: [
            { provider: "groq", model: "meta-llama/llama-4-scout-17b-16e-instruct", reason: "10M context — ideal for reading long docs" },
            { provider: "groq", model: "llama-3.3-70b-versatile", reason: "Strong reading + summarization" },
            { provider: "mistral", model: "mistral-small-latest", reason: "Good web doc reader" },
            { provider: "cerebras", model: "gpt-oss-120b", reason: "Deep context fallback" },
        ],
        timeoutSeconds: 180,
        capabilities: ["code_read", "web_search", "web_fetch"],
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
        if (context.artifacts && context.artifacts.length > 0) {
            prompt += `
## Attached Artifacts
${context.artifacts.map((a) => `- ${a}`).join("\n")}
`;
            if (type === "vision") {
                prompt += `\nIMAGE_PATH: ${context.artifacts.join(", ")}\n`;
            }
        }
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
    const agents = new Set();
    // Image attached → always include vision
    if (hasImages) {
        agents.add("vision");
    }
    // Aggregate all matching intents (no early returns)
    const debugMatch = /fix|bug|error|broken|crash/i.test(request);
    const codeMatch = /implement|create|add|build|new|make|write/i.test(request);
    const refactorMatch = /refactor|improve|clean|restructure|reorganize/i.test(request);
    const reviewMatch = /review|check|evaluate|critique|audit/i.test(request);
    const docsMatch = /document|readme|comment|docs/i.test(request);
    const securityMatch = /security|vulnerability|auth|unsafe|injection/i.test(request);
    const testMatch = /test|spec|coverage|assert/i.test(request);
    const researchMatch = /research|investigate|explore|find|lookup|fetch/i.test(request);
    if (debugMatch)
        agents.add("debugger");
    if (codeMatch)
        agents.add("coder");
    if (refactorMatch)
        agents.add("refactor");
    if (reviewMatch)
        agents.add("reviewer");
    if (docsMatch)
        agents.add("docs");
    if (securityMatch)
        agents.add("security");
    if (testMatch)
        agents.add("tester");
    if (researchMatch)
        agents.add("researcher");
    // Default: no intents matched → research/planning mode
    if (agents.size === 0) {
        agents.add("planner");
        agents.add("coder");
    }
    return Array.from(agents);
}
export const FREE_PROVIDERS = {
    groq: {
        name: "Groq",
        baseUrl: "https://api.groq.com/openai/v1",
        models: ["meta-llama/llama-4-scout-17b-16e-instruct", "llama-3.3-70b-versatile", "qwen/qwen3-32b", "openai/gpt-oss-120b"],
        bestFor: ["fast coding", "planning", "quick tasks"],
    },
    cerebras: {
        name: "Cerebras",
        baseUrl: "https://api.cerebras.ai/v1",
        models: ["qwen-3-235b-a22b-instruct-2507", "gpt-oss-120b", "llama3.1-8b"],
        bestFor: ["reasoning", "security", "deep analysis"],
    },
    opencode: {
        name: "OpenCode Zen",
        baseUrl: "https://opencode.ai/api/v1",
        models: ["qwen3.6-plus-free", "deepseek-v4-flash-free"],
        bestFor: ["coding", "debugging"],
    },
    zai: {
        name: "Z.ai",
        baseUrl: "https://api.z.ai/v1",
        models: ["glm-4.7", "glm-5.1"],
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
        models: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-preview-05-20"],
        bestFor: ["vision", "docs", "multi-modal"],
    },
    mistral: {
        name: "Mistral",
        baseUrl: "https://api.mistral.ai/v1",
        models: ["devstral-small-2507", "devstral-medium-latest", "codestral-latest", "mistral-small-latest"],
        bestFor: ["coding", "refactoring"],
    },
    nvidia: {
        name: "NVIDIA NIM",
        baseUrl: "https://integrate.api.nvidia.com/v1",
        models: ["meta/llama-3.2-11b-vision-instruct", "meta/llama-3.2-90b-vision-instruct", "qwen/qwen3-coder-480b-a35b-instruct", "meta/llama-3.3-70b-instruct", "meta/llama-guard-4-12b", "deepseek-ai/deepseek-v4-flash"],
        bestFor: ["heavy coding", "vision", "security"],
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
    "ollama-cloud": {
        name: "Ollama Cloud",
        baseUrl: "https://api.ollama.cloud/v1",
        models: ["minimax-m2.7", "qwen3-next:80b", "gemma4:31b"],
        bestFor: ["fallback", "variety"],
    },
};
export default AgentFactory;
//# sourceMappingURL=factory.js.map