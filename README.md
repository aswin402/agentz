# AgentZ

> Multi-model agent orchestration harness for OpenCode. Your primary model is the conductor. Free models are the orchestra.

## Overview

AgentZ transforms a single AI agent into a coordinated development team. The primary model (e.g., MiniMax 2.7) acts as the **Controller** - seeing all, deciding all, spawning/killing subagents. Subagents execute tasks using **free models** from providers like Groq, Cerebras, Cosecure, etc.

## Architecture

```
User Request → Primary Model (Controller)
                    ↓
              [Intent Classification]
                    ↓
              [Spawn Subagents] ← parallel, automatic
              /     |     \
        [Planner] [Coder] [Vision]
             ↓
        [Verification Gate]
             ↓
        [Fallback on Timeout] ← if stuck, switch model
             ↓
        [Primary Reviews Output]
             ↓
        [Kill/Continue/Iterate]
             ↓
        Final Report
```

## Features

- **Spec-First Workflow**: Request → Spec → Plan → Implement → Verify → Report
- **9 Specialised Subagents**: Planner, Coder, Tester, Reviewer, Security, Docs, Refactor, Debugger, Vision
- **Automatic Fallback**: If a model times out or fails, automatically switch to the next in chain
- **Parallel Execution**: Run multiple agents simultaneously (configurable concurrency limits)
- **Vision Agent**: Analyze images when your primary model doesn't support vision
- **Session Continuity**: Resume interrupted tasks with the Boulder system
- **Learned Patterns**: Accumulated learnings stored in memory

## Quick Start

```bash
# Initialize AgentZ in your project
agentz config init

# Run ultrawork (automatic execution)
agentz ultrawork "add user authentication to my app"

# Start a task with spec-first workflow
agentz start "build a blog admin panel"

# Resume interrupted task
agentz resume
```

## Configuration

Edit `.agentz/config.json` to customize:

```jsonc
{
  "primary": {
    "model": "minimax/m2.7",
    "role": "controller"
  },
  "agents": {
    "coder": {
      "modelChain": [
        { "provider": "groq", "model": "llama-4-scout" },
        { "provider": "opencode", "model": "qwen3.5-coder" },
        { "provider": "cerebras", "model": "cerebras-c4.1" }
      ],
      "timeoutSeconds": 120
    }
  }
}
```

## Subagent Model Chains

> All models verified live via API. See [workingmodelstab.md](./workingmodelstab.md) for full provider reference.

| Agent | Primary Model | Fallback Chain | Timeout |
|-------|--------------|----------------|---------|
| **Planner** | `groq/llama-4-scout-17b-16e-instruct` | Cerebras Qwen3-235B → Ollama MiniMax-M2.7 → OpenCode | 60s |
| **Coder** | `mistral/devstral-small-2507` | Groq Llama-4-Scout → Cerebras GPT-OSS-120B → NVIDIA Qwen3-Coder-480B | 120s |
| **Tester** | `groq/llama-4-scout-17b-16e-instruct` | Cerebras Llama3.1-8B → Mistral Codestral → OpenCode | 90s |
| **Reviewer** | `groq/qwen/qwen3-32b` | Cerebras Qwen3-235B → NVIDIA Llama-3.3-70B → Ollama Qwen3-Next-80B | 60s |
| **Security** | `cerebras/qwen-3-235b-a22b-instruct-2507` | Groq Qwen3-32B → NVIDIA Llama Guard 4 → Groq Llama-3.3-70B | 60s |
| **Docs** | `groq/llama-3.3-70b-versatile` | Mistral Small → Cerebras GPT-OSS-120B → Ollama Gemma4-31B | 90s |
| **Refactor** | `mistral/devstral-medium-latest` | Groq Qwen3-32B → Cerebras Qwen3-235B → NVIDIA Qwen3.5-122B | 120s |
| **Debugger** | `groq/llama-4-scout-17b-16e-instruct` | Cerebras Qwen3-235B → NVIDIA DeepSeek-V4-Flash → Groq Llama-3.3-70B | 90s |
| **Vision** | `google/gemini-2.5-flash` | Google Flash-Preview → NVIDIA Llama-3.2-11B-Vision → NVIDIA Llama-3.2-90B-Vision | 60s |

## Commands

```bash
agentz start <request>        # Start new task
agentz resume [slug]          # Resume interrupted task
agentz ultrawork <request>   # Quick automatic execution
agentz list                  # List all tasks
agentz show <slug>           # Show task details
agentz status                # Show current session status
agentz agents                # Show available agents
agentz learnings             # Show accumulated learnings
agentz config show           # Show current configuration
agentz config init           # Initialize configuration
agentz config reset          # Reset to defaults
```

## Task Directory Structure

```
.agentz/
├── tasks/
│   └── 2026-05-18-user-auth/
│       ├── request.md              # Original request
│       ├── spec.md                 # Generated specification
│       ├── plan.md                 # Implementation plan
│       ├── files-to-change.md      # Files to create/modify/delete
│       ├── acceptance-checklist.md # Verification checklist
│       ├── implementation-log.md   # Execution log
│       ├── verification-report.md   # Verification results
│       └── final-summary.md        # Final report
├── agents/                         # Subagent specifications
├── config/config.json             # Configuration
├── memory/learnings.md            # Accumulated learnings
└── runtime/                       # Active session state
    ├── active/
    │   ├── shared-memory.md       # All agents write here
    │   ├── decision-log.md        # Primary model decisions
    │   └── subagent-status/       # Active agent tracking
    └── boulder.json              # Cross-session progress
```

## Integration with OpenCode

AgentZ is designed to work as an OpenCode agent. When you select AgentZ in OpenCode:

1. Choose your **primary model** (e.g., MiniMax 2.7)
2. AgentZ automatically uses free models for subagents
3. Attach images → Vision agent auto-spawns
4. The primary model orchestrates everything

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Type check
npm run typecheck

# Run tests
npm test

# Development mode
npm run dev
```

## License

MIT