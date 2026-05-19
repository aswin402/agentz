# AgentZ - Multi-Model Agent Orchestration System

> "Your primary model is the conductor. Subagents are the orchestra. Free models do the work."

---

## 1. Concept & Vision

**AgentZ** is a spec-first, multi-model agent orchestration harness that transforms a single primary AI agent into a coordinated development team. Unlike single-agent tools, AgentZ uses specialized subagents powered by free/cheap API providers while reserving expensive primary models for orchestration and quality control.

**Core Philosophy:**
- Primary model = **Controller/Brain** — sees all, decides all, spawns/kills subagents, routes to fallbacks
- Subagents = **Worker Bees** — execute tasks using best free models available
- Vision = **Eyes** — dedicated vision subagent for image understanding (since primary may not support it)
- Zero cost for workers, maximum intelligence for orchestration

**The Workflow:**
```
User Request → Primary Model (MiniMax 2.7 or any selected model)
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

---

## 2. Architecture

### 2.1 Directory Structure

```
.agentz/
├── config.json              # Global configuration
├── memory/                  # Learned patterns (cross-session)
│   ├── conventions.md       # Code style, naming patterns
│   ├── gotchas.md           # Known issues, fixes applied
│   ├── commands.md          # What worked, what didn't
│   └── learnings.md         # Cumulative agent learnings
├── agents/                  # Subagent specifications
│   ├── planner.md           # Strategic planning agent
│   ├── coder.md             # Implementation agent
│   ├── tester.md            # Testing agent
│   ├── reviewer.md          # Code review agent
│   ├── security.md          # Security check agent
│   ├── docs.md              # Documentation agent
│   ├── refactor.md          # Refactoring agent
│   ├── debugger.md          # Bug fixing agent
│   └── vision.md            # Image understanding agent
├── tasks/                   # Per-task working directories
│   └── {date}-{task-name}/
│       ├── request.md        # Original user request
│       ├── spec.md           # Generated specification
│       ├── plan.md           # Implementation plan
│       ├── files-to-change.md
│       ├── acceptance-checklist.md
│       ├── implementation-log.md
│       ├── verification-report.md
│       └── final-summary.md
├── runtime/                 # Active session state
│   ├── active/
│   │   ├── shared-memory.md  # All subagents write here
│   │   ├── decision-log.md   # Primary model decisions
│   │   └── subagent-status/  # Tracking running agents
│   └── boulder.json          # Cross-session progress
└── skills/                  # Domain-specific expertise
    └── {skill-name}/
        └── SKILL.md
```

### 2.2 Agent Types

#### Primary Agent (Controller)
The primary model chosen by user in OpenCode becomes the **Controller**. It:
- Receives user requests
- Classifies intent via IntentGate
- Spawns appropriate subagents
- Monitors subagent progress
- Kills stuck/timeout agents
- Routes to fallback models
- Produces final report

**Configured per user selection in OpenCode:**
```json
{
  "primary": {
    "model": "minimax/m2.7",
    "role": "controller"
  }
}
```

#### Subagents (Workers)
Specialized agents that execute tasks using free models. Each has:
- **Model routing** — fallback chain of free providers
- **Specialization** — specific domain expertise
- **Timeout** — max time before fallback triggers
- **Output format** — structured response to controller

| Agent | Specialization | Default Model Chain | Timeout |
|-------|---------------|---------------------|---------|
| **Planner** | Requirement analysis, gap detection | groq → cerebras → huggingchat | 60s |
| **Coder** | Implementation, file editing | groq → opencode → cerebras → zai | 120s |
| **Tester** | Test generation, verification | groq → cerebras → opencode | 90s |
| **Reviewer** | Code quality, best practices | openai → groq → cerebras | 60s |
| **Security** | Vulnerability detection, auth checks | cerebras → groq → openai | 60s |
| **Docs** | README, comments, usage docs | groq → gemini-flash → openai | 90s |
| **Refactor** | Architecture improvement | openai → groq → cerebras | 120s |
| **Debugger** | Bug reproduction, fix suggestion | groq → openai → cerebras | 90s |
| **Vision** | Image understanding, screenshot analysis | cosecure → gemini → openai | 60s |

---

## 3. IntentGate System

Before spawning agents, the primary model classifies user intent:

```typescript
type IntentType = 
  | "research"      // Explore, understand, investigate
  | "implementation" // Write code, create features
  | "fix"          // Debug, repair, patch
  | "refactor"     // Improve structure without behavior change
  | "review"       // Evaluate, critique, suggest
  | "docs"         // Documentation, comments
  | "mixed"        // Multiple intents combined
```

**Classification Logic (in primary model prompt):**
```
IF request contains "fix", "bug", "error", "broken" → intent = "fix"
ELSE IF request contains "implement", "create", "add", "build" → intent = "implementation"
ELSE IF request contains "refactor", "improve", "clean" → intent = "refactor"
ELSE IF request contains "review", "check", "evaluate" → intent = "review"
ELSE IF request contains "document", "readme", "comment" → intent = "docs"
ELSE IF request contains image attachment → spawn Vision first, then route result
ELSE → intent = "research" OR "mixed"
```

---

## 4. Subagent Model Routing

### 4.1 Free Provider Fallback Chain

Each subagent has a prioritized list of free models. Primary model attempts them in order until success.

```jsonc
{
  "agents": {
    "coder": {
      "model_chain": [
        { "provider": "groq", "model": "llama-4-scout", "reasoning": false },
        { "provider": "opencode", "model": "qwen3.5-coder", "reasoning": false },
        { "provider": "cerebras", "model": "cerebras-c4.1", "reasoning": true },
        { "provider": "zai", "model": "qwen-coder", "reasoning": false },
        { "provider": "mistral", "model": "codestral", "reasoning": false },
        { "provider": "nvidia", "model": "nemotron-coder", "reasoning": true }
      ],
      "timeout_seconds": 120,
      "fallback_trigger": "no_output_for_60s OR api_error"
    },
    "vision": {
      "model_chain": [
        { "provider": "cosecure", "model": "cosecure-vision", "reasoning": false },
        { "provider": "google", "model": "gemini-2.0-flash", "reasoning": false },
        { "provider": "openai", "model": "gpt-4o-mini", "reasoning": true }
      ],
      "timeout_seconds": 60
    }
  }
}
```

### 4.2 Model Routing Decision Tree

```
Primary Model Decision:
  1. Analyze task complexity (lines of code, files affected, domain)
  2. Select agent type based on IntentGate
  3. Check shared memory for learned patterns
  4. Spawn subagent with first model in chain
  5. Monitor: 
     - IF progress in shared-memory.md → continue
     - IF no progress for 60s → kill, try next model
     - IF api error → try next model immediately
     - IF all models exhausted → report failure to primary
  6. Primary model decides: retry, skip task, or escalate
```

---

## 5. Communication Protocol

### 5.1 Shared Memory Format

All subagents write to `shared-memory.md` with structured output:

```markdown
## {SubagentName} @ {timestamp}

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
```

### 5.2 Primary Model Decision Log

```markdown
## Decision Log @ {timestamp}

### Spawned
- Agent: {name}, Model: {model}, Reason: {why this agent}

### Monitoring
- Agent: {name}, Status: {status}, Elapsed: {time}

### Action Taken
- Agent: {name}, Action: {kill/fallback/continue}, Reason: {why}
- New Model: {model} OR N/A

### Verification
- Task: {name}, Result: {pass/fail}, Fixes needed: {list}
```

---

## 6. Spec-First Workflow

### 6.1 Task Initialization Flow

```
User Request
    ↓
Primary Model analyzes
    ↓
Create .agentz/tasks/{date}-{slug}/
    ├── request.md    ← copy of user request
    ├── spec.md       ← structured specification (auto-generated)
    └── plan.md       ← implementation plan
    ↓
User reviews spec (or auto-approve if simple)
    ↓
Primary spawns subagents based on plan
    ↓
Parallel execution with verification gates
    ↓
Primary produces final-summary.md
```

### 6.2 Spec Template

```markdown
# Specification: {Task Name}

## Objective
Clear statement of what needs to be built/fixed/changed

## Scope
### In Scope
- List of specific features/behaviors

### Out of Scope
- What this spec does NOT cover

## Requirements
### Functional
- R1: {requirement}
- R2: {requirement}

### Non-Functional
- Performance: {criteria}
- Security: {criteria}
- Compatibility: {criteria}

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## File Changes
### Create
- file path

### Modify
- file path

### Delete
- file path

## Dependencies
- External libraries
- API integrations

## Verification Plan
How to test this spec was implemented correctly
```

---

## 7. Verification Gates

After each subagent completes, verification occurs before proceeding:

### Gate Types

| Gate | Checks | Action on Failure |
|------|--------|-------------------|
| **Syntax** | LSP diagnostics pass | Auto-fix or route to coder |
| **Tests** | Unit tests green | Route to tester for fixes |
| **Lint** | No lint errors | Auto-fix or route to coder |
| **Security** | No vulnerabilities found | Route to security agent |
| **Behavior** | Matches spec acceptance criteria | Route to debugger |

### Verification Flow

```
Subagent completes task
    ↓
Run verification checks (parallel where possible)
    ↓
All pass?
    ├─ YES → Continue to next task
    └─ NO → Route to appropriate fix agent
             ↓
             Retry until pass or max attempts
             ↓
             If max attempts reached → Flag for human review
```

---

## 8. Parallel Execution

### 8.1 When to Parallelize

Primary model decides to spawn in parallel when:
- Tasks have no dependencies
- Multiple file changes in different areas
- Testing can happen alongside documentation
- Vision analysis can happen during code review

### 8.2 Parallel Spawn Example

```
Plan has 4 independent tasks:
- Task A: Create user model (coder)
- Task B: Create product model (coder)
- Task C: Write unit tests for user (tester)
- Task D: Write unit tests for product (tester)

Primary spawns:
- [coder] for Task A (groq)
- [coder] for Task B (cerebras)
- [tester] for Task C (groq)
- [tester] for Task D (cerebras)

Max parallel: 4 (configurable in config.json)
```

### 8.3 Concurrency Limits

```json
{
  "parallel": {
    "max_agents": 5,
    "per_provider": {
      "groq": 3,
      "cerebras": 2,
      "opencode": 2,
      "cosecure": 1
    },
    "per_model": {
      "groq/llama-4-scout": 2
    }
  }
}
```

---

## 9. Vision Agent Special Handling

### 9.1 Image Routing

When user attaches image(s):
1. Primary model receives request
2. Spawn Vision agent with image(s)
3. Vision agent analyzes and returns description
4. Primary model incorporates vision context into task
5. Route to appropriate subagent with image context

### 9.2 Vision Output Format

```markdown
## Vision Analysis @ {timestamp}

### Images Analyzed
- image_1.png: {description}
- image_2.png: {description}

### Relevant Findings
- UI elements detected
- Layout patterns
- Design language clues

### Recommendations
- Frameworks that match style
- Component patterns to follow
- Color/typography approach

### Confidence
- Overall: {high/medium/low}
- Reasoning: {why}
```

---

## 10. Skills System

Skills provide domain-specific expertise to subagents. Unlike omo's embedded MCPs, AgentZ skills are prompt templates that augment subagent prompts.

### 10.1 Skill Structure

```
.agentz/skills/
├── playwright/
│   └── SKILL.md
├── git-master/
│   └── SKILL.md
├── frontend-ui-ux/
│   └── SKILL.md
└── custom-skill/
    └── SKILL.md
```

### 10.2 Skill Loading

When a subagent needs specialized knowledge:
1. Primary model detects skill requirement from task type
2. Reads skill file
3. Injects skill content into subagent prompt
4. Subagent executes with enhanced context

---

## 11. Session Continuity (Boulder System)

Cross-session progress tracking similar to omo's boulder.json:

### 11.1 State File

```json
{
  "active_task": "2026-05-18-user-auth",
  "started_at": "2026-05-18T10:30:00Z",
  "plan_file": ".agentz/tasks/2026-05-18-user-auth/plan.md",
  "completed_tasks": [
    { "name": "Create user model", "verified": true },
    { "name": "Add validation", "verified": true }
  ],
  "current_task": {
    "name": "Implement login",
    "status": "in_progress",
    "assigned_agent": "coder",
    "assigned_model": "groq/llama-4-scout",
    "started_at": "2026-05-18T11:00:00Z"
  },
  "remaining_tasks": [
    { "name": "Implement logout" },
    { "name": "Add session management" },
    { "name": "Write integration tests" }
  ],
  "learnings": [
    "Project uses TypeScript strict mode",
    "Auth middleware is in middleware/auth.ts"
  ]
}
```

### 11.2 Resume Flow

```
User starts new session + types "continue" or "/start-work"
    ↓
Read .agentz/runtime/boulder.json
    ↓ 
Inject context: completed tasks, current task, learnings
    ↓
Primary model continues from checkpoint
    ↓
Spawn subagents for remaining tasks
```

---

## 12. Configuration Reference

### 12.1 Full Configuration Schema

```jsonc
{
  "$schema": "./agentz.schema.json",

  // Primary model settings
  "primary": {
    "model": "minimax/m2.7",
    "role": "controller"
  },

  // Subagent model chains
  "agents": {
    "planner": {
      "model_chain": [
        { "provider": "groq", "model": "llama-4-scout" },
        { "provider": "cerebras", "model": "cerebras-c4.1" },
        { "provider": "huggingchat", "model": "mistral-coder" }
      ],
      "timeout_seconds": 60
    },
    "coder": {
      "model_chain": [
        { "provider": "groq", "model": "llama-4-scout" },
        { "provider": "opencode", "model": "qwen3.5-coder" },
        { "provider": "cerebras", "model": "cerebras-c4.1" },
        { "provider": "zai", "model": "qwen-coder" }
      ],
      "timeout_seconds": 120
    },
    "tester": {
      "model_chain": [
        { "provider": "groq", "model": "llama-4-scout" },
        { "provider": "cerebras", "model": "cerebras-c4.1" }
      ],
      "timeout_seconds": 90
    },
    "reviewer": {
      "model_chain": [
        { "provider": "openai", "model": "gpt-4o-mini" },
        { "provider": "groq", "model": "llama-4-scout" }
      ],
      "timeout_seconds": 60
    },
    "security": {
      "model_chain": [
        { "provider": "cerebras", "model": "cerebras-c4.1" },
        { "provider": "groq", "model": "llama-4-scout" }
      ],
      "timeout_seconds": 60
    },
    "docs": {
      "model_chain": [
        { "provider": "groq", "model": "llama-4-scout" },
        { "provider": "google", "model": "gemini-2.0-flash" }
      ],
      "timeout_seconds": 90
    },
    "refactor": {
      "model_chain": [
        { "provider": "openai", "model": "gpt-4o-mini" },
        { "provider": "groq", "model": "llama-4-scout" },
        { "provider": "cerebras", "model": "cerebras-c4.1" }
      ],
      "timeout_seconds": 120
    },
    "debugger": {
      "model_chain": [
        { "provider": "groq", "model": "llama-4-scout" },
        { "provider": "openai", "model": "gpt-4o-mini" },
        { "provider": "cerebras", "model": "cerebras-c4.1" }
      ],
      "timeout_seconds": 90
    },
    "vision": {
      "model_chain": [
        { "provider": "cosecure", "model": "cosecure-vision" },
        { "provider": "google", "model": "gemini-2.0-flash" },
        { "provider": "openai", "model": "gpt-4o-mini" }
      ],
      "timeout_seconds": 60
    }
  },

  // Parallel execution limits
  "parallel": {
    "max_agents": 5,
    "per_provider": {
      "groq": 3,
      "cerebras": 2,
      "openai": 2,
      "cosecure": 1
    }
  },

  // Verification settings
  "verification": {
    "auto_fix": true,
    "max_attempts": 3,
    "require_tests": true
  },

  // Skills configuration
  "skills": {
    "enable": ["playwright", "git-master", "frontend-ui-ux"],
    "sources": [".agentz/skills"]
  },

  // Spec workflow settings
  "spec_workflow": {
    "auto_approve_simple": true,
    "require_review_complex": true
  }
}
```

---

## 13. Implementation Phases

### Phase 1: Core Orchestrator (MVP)
- [ ] Primary model controller prompt
- [ ] Basic subagent spawning
- [ ] Simple model chain routing
- [ ] Shared memory system
- [ ] Basic verification (syntax only)

### Phase 2: Full Agent Suite
- [ ] All 9 subagent specifications
- [ ] IntentGate classification
- [ ] Parallel execution with limits
- [ ] Fallback chain management
- [ ] Timeout handling

### Phase 3: Verification & Quality
- [ ] Verification gates (syntax, lint, tests)
- [ ] Cross-agent review
- [ ] Security scanning
- [ ] Learning accumulation

### Phase 4: Advanced Features
- [ ] Vision agent with image handling
- [ ] Session continuity (boulder)
- [ ] Skills system
- [ ] Spec-first workflow UI

---

## 14. Comparison with oh-my-openagent

| Aspect | oh-my-openagent | AgentZ |
|--------|-----------------|--------|
| **Primary Role** | Orchestrator (Sisyphus) | Controller (user-selected model) |
| **Worker Models** | Mix of paid & free | All free (cost optimization) |
| **Model Selection** | Category-based routing | Intent-based + fallback chains |
| **Vision** | Multimodal Looker (GPT-5.5) | Vision agent (free providers) |
| **Verification** | LSP + diagnostics | LSP + tests + lint + security |
| **Planning** | Prometheus (separate agent) | Integrated in primary |
| **Session Continuity** | boulder.json | Same (boulder.json) |
| **Skills** | Embedded MCPs | Prompt-based skill templates |

### AgentZ Advantages
1. **Cost**: All subagents use free models only
2. **Flexibility**: User chooses primary model per task
3. **Vision**: Explicit vision agent handles images
4. **Simplicity**: Primary model handles all orchestration decisions

### omo Advantages We Adopt
1. Category-based task routing
2. Wisdom accumulation (learnings.md)
3. Parallel execution with concurrency limits
4. Hash-anchored edits (Hashline)
5. IntentGate classification
6. Session continuity via boulder tracking

---

## 15. Free Model Provider Reference

| Provider | Models Available | Best For | Rate Limits |
|----------|-----------------|----------|-------------|
| **Groq** | llama-4-scout, llama-4-marble | Fast coding, planning | 100 req/min |
| **Cerebras** | cerebras-c4.1 | Reasoning, analysis | 1000 req/day |
| **OpenCode** | qwen3.5-coder, deepseek-coder | Coding, debugging | Varies |
| **Cosecure** | cosecure-vision | Vision tasks | 100 req/min |
| **Google** | gemini-2.0-flash | Docs, fast tasks | 15 req/min |
| **Mistral** | codestral, pixtral | Coding, vision | 100 req/min |
| **Nvidia** | nemotron-coder | Coding, reasoning | Varies |
| **Z.ai** | qwen-coder | Coding tasks | 60 req/min |
| **HuggingChat** | mistral-coder, llama | Light tasks | Varies |

---

## 16. Getting Started

1. **Install AgentZ** in OpenCode:
   ```
   Install agentz by following: [installation guide]
   ```

2. **Select Primary Model** in OpenCode (e.g., MiniMax 2.7)

3. **Configure** `.agentz/config.json` with your preferred subagent chains

4. **Start Working**:
   - Type `ultrawork` for automatic execution
   - Type `@plan "task"` for spec-first workflow
   - Attach images → Vision agent auto-spawns

5. **Review** results in `.agentz/tasks/{date}-{name}/`

---

*AgentZ: Your primary model is the conductor. Free models are the orchestra.*