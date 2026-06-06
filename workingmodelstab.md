# AgentZ — Working Models & Providers Tab

> Last updated: 2026-05-19 | All models verified live via API calls

---

## 🔑 Configured Providers

| Provider | OpenCode ID | Free Tier | Auth Key Stored |
|----------|-------------|-----------|-----------------|
| **Google AI Studio** | `google` | 1,500 req/day (Flash), 30 req/min | ✅ `auth.json` |
| **Groq** | `groq` | 1,000–14,400 req/day, 30 RPM | ✅ `auth.json` |
| **Cerebras** | `cerebras` | 1M tokens/day, 30 RPM | ✅ `auth.json` |
| **Mistral** | `mistral` | Free tier (rate limited) | ✅ `auth.json` |
| **NVIDIA NIM** | `nvidia` | 40 RPM, unlimited days | ✅ `auth.json` |
| **OpenCode Zen** | `opencode` | Free models (deepseek-v4-flash, etc.) | ✅ `auth.json` |
| **Z.AI** | `zai` | Free tier | ✅ `auth.json` |
| **Ollama Cloud** | `ollama-cloud` | Generous free tier | ✅ `auth.json` |
| **MiniMax Coding Plan** | `minimax-coding-plan` | M2.7 free plan | ✅ `auth.json` |

---

## 🤖 AgentZ Subagent → Model Assignments

| Subagent | Primary Model | Fallback 1 | Fallback 2 | Fallback 3 |
|----------|--------------|------------|------------|------------|
| **controller** (agentz) | `minimax-coding-plan/MiniMax-M2.7` | — | — | — |
| **agentz-vision** | `mistral/pixtral-12b` | `nvidia/meta/llama-3.2-90b-vision-instruct` | `nvidia/meta/llama-3.2-11b-vision-instruct` | `openrouter/google/gemini-2.5-flash` |
| **planner** | `groq/meta-llama/llama-4-scout-17b-16e-instruct` | `cerebras/qwen-3-235b-a22b-instruct-2507` | `ollama-cloud/minimax-m2.7` | `opencode/qwen3.6-plus-free` |
| **coder** | `mistral/devstral-small-2507` | `groq/meta-llama/llama-4-scout-17b-16e-instruct` | `cerebras/gpt-oss-120b` | `nvidia/qwen/qwen3-coder-480b-a35b-instruct` |
| **tester** | `groq/meta-llama/llama-4-scout-17b-16e-instruct` | `cerebras/llama3.1-8b` | `mistral/codestral-latest` | `opencode/qwen3.6-plus-free` |
| **reviewer** | `minimax-coding-plan/MiniMax-M2.7` | `groq/qwen/qwen3-32b` | `cerebras/qwen-3-235b-a22b-instruct-2507` | `nvidia/meta/llama-3.3-70b-instruct` |
| **security** | `cerebras/qwen-3-235b-a22b-instruct-2507` | `groq/qwen/qwen3-32b` | `nvidia/meta/llama-guard-4-12b` | `groq/llama-3.3-70b-versatile` |
| **docs** | `groq/llama-3.3-70b-versatile` | `mistral/mistral-small-latest` | `cerebras/gpt-oss-120b` | `ollama-cloud/gemma4:31b` |
| **refactor** | `mistral/devstral-medium-latest` | `groq/qwen/qwen3-32b` | `cerebras/qwen-3-235b-a22b-instruct-2507` | `nvidia/qwen/qwen3.5-122b-a10b` |
| **debugger** | `groq/meta-llama/llama-4-scout-17b-16e-instruct` | `cerebras/qwen-3-235b-a22b-instruct-2507` | `nvidia/deepseek-ai/deepseek-v4-flash` | `groq/llama-3.3-70b-versatile` |

---

## 🟢 Groq — Working Models (Verified via API)

**Base URL:** `https://api.groq.com/openai/v1`  
**Free Tier:** 30 RPM, 1,000–14,400 RPD depending on model  
**Strength:** Extremely fast inference (hundreds tok/s), reliable uptime

| OpenCode Model ID | Model | Use Case | Context |
|-------------------|-------|----------|---------|
| `groq/meta-llama/llama-4-scout-17b-16e-instruct` | Llama 4 Scout 17B | **Best all-rounder** — planning, debugging, coding | 10M tokens |
| `groq/llama-3.3-70b-versatile` | Llama 3.3 70B | Docs, analysis, complex reasoning | 128K |
| `groq/qwen/qwen3-32b` | Qwen3 32B | Code review, security analysis | 128K |
| `groq/openai/gpt-oss-120b` | GPT-OSS 120B | Heavy reasoning tasks | 128K |
| `groq/openai/gpt-oss-20b` | GPT-OSS 20B | Lightweight fast tasks | 128K |
| `groq/llama-3.1-8b-instant` | Llama 3.1 8B | Ultra-fast simple tasks | 128K |
| `groq/moonshotai/kimi-k2-instruct-0905` | Kimi K2 | Agentic tasks | 128K |

> **Note:** `llama-4-maverick` was deprecated on Groq March 2026. Use `llama-4-scout` instead.

---

## 🔵 Cerebras — Working Models (Verified via API)

**Base URL:** `https://api.cerebras.ai/v1`  
**Free Tier:** 1M tokens/day, 30 RPM, 60K TPM  
**Strength:** World's fastest inference (2,000+ tok/s), great for agentic loops

| OpenCode Model ID | Model | Use Case |
|-------------------|-------|----------|
| `cerebras/qwen-3-235b-a22b-instruct-2507` | Qwen3 235B A22B | **Best reasoner** — planning, security, complex review |
| `cerebras/gpt-oss-120b` | GPT-OSS 120B | Coding, large context tasks |
| `cerebras/llama3.1-8b` | Llama 3.1 8B | **Ultra-fast** — testing, quick tasks (2000+ tok/s) |
| `cerebras/zai-glm-4.7` | GLM-4.7 | General purpose, Z.AI model |

---

## 🟠 Mistral — Working Models (Verified via API)

**Base URL:** `https://api.mistral.ai/v1`  
**Free Tier:** Rate-limited free models  
**Strength:** Best coding agents (Devstral), Codestral for code completion

| OpenCode Model ID | Model | Use Case |
|-------------------|-------|----------|
| `mistral/devstral-small-2507` | Devstral Small 24B | **Best free coding agent** — agentic coding, tool use |
| `mistral/devstral-medium-latest` | Devstral Medium | Refactoring, larger code changes |
| `mistral/codestral-latest` | Codestral | Code completion, test writing |
| `mistral/mistral-small-latest` | Mistral Small | Fast general tasks, docs |
| `mistral/ministral-3b-latest` | Ministral 3B | Ultra-lightweight tasks |
| `mistral/ministral-8b-latest` | Ministral 8B | Balanced speed/quality |
| `mistral/open-mistral-7b` | Mistral 7B | Legacy fallback |
| `mistral/mistral-nemo` | Mistral Nemo | Strong multilingual |

---

## 🟢 NVIDIA NIM — Working Models (Verified via API)

**Base URL:** `https://integrate.api.nvidia.com/v1`  
**Free Tier:** 40 RPM, no daily limit  
**Strength:** Huge model catalog (100+), vision models, specialized models

### 🖼️ Vision Models
| OpenCode Model ID | Model | Use Case |
|-------------------|-------|----------|
| `nvidia/meta/llama-3.2-11b-vision-instruct` | Llama 3.2 11B Vision | Image analysis, screenshots |
| `nvidia/meta/llama-3.2-90b-vision-instruct` | Llama 3.2 90B Vision | Complex image understanding |
| `nvidia/microsoft/phi-4-multimodal-instruct` | Phi-4 Multimodal | Multimodal reasoning |

### 💻 Coding Models
| OpenCode Model ID | Model | Use Case |
|-------------------|-------|----------|
| `nvidia/qwen/qwen3-coder-480b-a35b-instruct` | Qwen3-Coder 480B | **World's best open coder** |
| `nvidia/qwen/qwen2.5-coder-32b-instruct` | Qwen2.5-Coder 32B | Coding fallback |
| `nvidia/deepseek-ai/deepseek-v4-flash` | DeepSeek V4 Flash | Fast coding, debugging |
| `nvidia/deepseek-ai/deepseek-v4-pro` | DeepSeek V4 Pro | Deep reasoning, complex bugs |

### 🧠 General Models
| OpenCode Model ID | Model | Use Case |
|-------------------|-------|----------|
| `nvidia/meta/llama-4-maverick-17b-128e-instruct` | Llama 4 Maverick | General agentic tasks |
| `nvidia/meta/llama-3.3-70b-instruct` | Llama 3.3 70B | Code review, analysis |
| `nvidia/meta/llama-guard-4-12b` | Llama Guard 4 | **Security guard/safety** |
| `nvidia/qwen/qwen3-next-80b-a3b-instruct` | Qwen3-Next 80B | Reasoning, analysis |
| `nvidia/qwen/qwen3.5-397b-a17b` | Qwen3.5 397B | Heaviest reasoning tasks |
| `nvidia/z-ai/glm4.7` | GLM-4.7 | Z.AI model via NVIDIA |
| `nvidia/z-ai/glm-5.1` | GLM-5.1 | Newer Z.AI model |
| `nvidia/google/gemma-4-31b-it` | Gemma 4 31B | Google model on NVIDIA |
| `nvidia/mistralai/mistral-nemotron` | Mistral Nemotron | NVIDIA-optimized Mistral |

---

## 🟣 Google AI Studio — Working Models (Verified via API)

**Free Tier:** 1,500 req/day (Flash), 20/day (Flash-Lite!) — **USE FLASH NOT LITE!**  
**Strength:** Best vision model, multimodal, long context

| OpenCode Model ID | Model | Use Case | Quota |
|-------------------|-------|----------|-------|
| `google/gemini-2.5-flash` | Gemini 2.5 Flash | **⭐ Primary vision** — best quality+speed | 1,500/day |
| `google/gemini-2.5-flash-lite-preview-06-17` | Gemini 2.5 Flash Lite | Vision fallback | ⚠️ 20/day |
| `google/gemini-2.5-flash-preview-05-20` | Gemini 2.5 Flash Preview | Vision alternative | 1,500/day |
| `google/gemini-2.5-pro` | Gemini 2.5 Pro | Deep reasoning (limited free) | 50/day |
| `google/gemini-2.0-flash` | Gemini 2.0 Flash | Fast general tasks | High |
| `google/gemini-2.0-flash-lite` | Gemini 2.0 Flash Lite | Lightweight tasks | High |

> ⚠️ **CRITICAL:** `gemini-2.5-flash-lite` has **20 req/day** free limit — causes infinite loading! Always use `gemini-2.5-flash` (1,500/day).

---

## 🔴 OpenCode Zen — Working Models

**Strength:** Pre-tested models, all work reliably with OpenCode tools

| OpenCode Model ID | Model | Use Case |
|-------------------|-------|----------|
| `opencode/deepseek-v4-flash-free` | DeepSeek V4 Flash | Free coding, fast |
| `opencode/minimax-m2.5-free` | MiniMax M2.5 | Free general tasks |
| `opencode/nemotron-3-super-free` | Nemotron 3 Super | Free NVIDIA model |
| `opencode/qwen3.6-plus-free` | Qwen3.6 Plus | Free planning/reasoning |
| `opencode/big-pickle` | Big Pickle | General tasks |

---

## 🟤 Ollama Cloud — Working Models

**Strength:** Huge model selection, access to latest models, free tier

| OpenCode Model ID | Model | Use Case |
|-------------------|-------|----------|
| `ollama-cloud/minimax-m2.7` | MiniMax M2.7 | Large 456B controller |
| `ollama-cloud/devstral-small-2:24b` | Devstral Small 2 | Coding fallback |
| `ollama-cloud/devstral-2:123b` | Devstral 2 123B | Large coding agent |
| `ollama-cloud/deepseek-v4-flash` | DeepSeek V4 Flash | Fast coding |
| `ollama-cloud/deepseek-v4-pro` | DeepSeek V4 Pro | Deep reasoning |
| `ollama-cloud/glm-4.7` | GLM-4.7 | Z.AI general model |
| `ollama-cloud/glm-5.1` | GLM-5.1 | Newer GLM |
| `ollama-cloud/gemma4:31b` | Gemma 4 31B | Google model |
| `ollama-cloud/qwen3-coder:480b` | Qwen3-Coder 480B | Best open coder |
| `ollama-cloud/qwen3-next:80b` | Qwen3-Next 80B | Strong reasoning |
| `ollama-cloud/kimi-k2:1t` | Kimi K2 1T | 1T parameter MoE |
| `ollama-cloud/nemotron-3-super` | Nemotron 3 Super | NVIDIA reasoning |
| `ollama-cloud/gpt-oss:120b` | GPT-OSS 120B | OpenAI OSS model |

---

## ⚠️ Z.AI — Working Models

**Strength:** GLM series models, Chinese AI

| OpenCode Model ID | Model | Use Case |
|-------------------|-------|----------|
| `zai/glm-4.7` | GLM-4.7 | General tasks |
| Via `cerebras/zai-glm-4.7` | GLM-4.7 on Cerebras | Fast GLM inference |
| Via `nvidia/z-ai/glm4.7` | GLM-4.7 on NVIDIA | GLM via NVIDIA |
| Via `nvidia/z-ai/glm-5.1` | GLM-5.1 on NVIDIA | Latest GLM via NVIDIA |

---

## 🏆 Best Model per Use Case (Quick Reference)

| Use Case | Best Free Model | Provider | Why |
|----------|----------------|----------|-----|
| **Coding** | `mistral/devstral-small-2507` | Mistral | Built for agentic coding |
| **Heavy Coding** | `nvidia/qwen/qwen3-coder-480b-a35b-instruct` | NVIDIA | 480B world's best open coder |
| **Vision/Images** | `mistral/pixtral-12b` | Mistral | Best vision model via Mistral API |
| **Fast Planning** | `groq/meta-llama/llama-4-scout-17b-16e-instruct` | Groq | 10M ctx, fastest planning |
| **Deep Reasoning** | `cerebras/qwen-3-235b-a22b-instruct-2507` | Cerebras | 235B + ultra-fast chip |
| **Security** | `nvidia/meta/llama-guard-4-12b` | NVIDIA | Safety-specialized model |
| **Testing** | `groq/meta-llama/llama-4-scout-17b-16e-instruct` | Groq | Fast iteration with big ctx |
| **Code Review** | `groq/qwen/qwen3-32b` | Groq | Strong reviewer at Groq speed |
| **Documentation** | `groq/llama-3.3-70b-versatile` | Groq | Best writing quality free |
| **Refactoring** | `mistral/devstral-medium-latest` | Mistral | Agentic + larger context |
| **Debugging** | `groq/meta-llama/llama-4-scout-17b-16e-instruct` | Groq | 10M ctx = entire codebase |
| **Ultra-fast tasks** | `cerebras/llama3.1-8b` | Cerebras | 2,000+ tok/s |
| **Controller** | `minimax-coding-plan/MiniMax-M2.7` | MiniMax | 456B orchestrator |

---

## 🔁 Provider Reliability Ranking

1. **Groq** ⭐⭐⭐⭐⭐ — Most reliable, fast, good rate limits
2. **Cerebras** ⭐⭐⭐⭐⭐ — Ultra-fast, 1M tok/day generous
3. **Mistral** ⭐⭐⭐⭐ — Great coding models, reliable API
4. **Google** ⭐⭐⭐⭐ — Best vision, but Flash-Lite has tiny quota (20/day!)
5. **NVIDIA** ⭐⭐⭐⭐ — Huge catalog, 40 RPM free, no daily limit
6. **OpenCode Zen** ⭐⭐⭐⭐ — Pre-tested, reliable
7. **Ollama Cloud** ⭐⭐⭐ — Many models, free tier
8. **Z.AI** ⭐⭐⭐ — GLM models, better accessed via Cerebras/NVIDIA
9. **MiniMax** ⭐⭐⭐ — Controller only, good quality

---

## 🚫 Known Issues / Gotchas

| Issue | Detail | Fix |
|-------|--------|-----|
| `gemini-2.5-flash-lite` rate limit | Only **20 req/day** free → causes infinite loading | Use `gemini-2.5-flash` (1500/day) instead |
| `llama-4-maverick` on Groq | **Deprecated** March 2026 | Use `llama-4-scout` instead |
| `groq/llama-4-scout` model ID | Full ID: `groq/meta-llama/llama-4-scout-17b-16e-instruct` | Use the full ID in config |
| `cerebras/cerebras-c4.1` | Invalid model ID | Use `cerebras/qwen-3-235b-a22b-instruct-2507` |
| Z.AI direct API | Limited model list, unstable | Access GLM via `cerebras/zai-glm-4.7` or `nvidia/z-ai/glm4.7` |
| Vision via task tool | Image bytes not passed to subagent | Pass `IMAGE_PATH:` string in prompt, subagent reads file |
| `find /home/aswin` | Times out (2 min) | Use `find /tmp /home/aswin/Pictures /home/aswin/Downloads` |

---

## 📁 Config Files Location

| File | Purpose |
|------|---------|
| `~/.local/share/opencode/auth.json` | All API keys stored here |
| `~/.config/opencode/opencode.json` | OpenCode config, MCP, permissions |
| `~/.config/opencode/agentz-config.json` | AgentZ model chains per subagent |
| `~/.config/opencode/agent/agentz.md` | Primary controller agent definition |
| `~/.config/opencode/agent/agentz-vision.md` | Vision subagent (mistral/pixtral-12b) |
| `~/.config/opencode/agent/coder.md` | Coder (mistral/devstral-small-2507) |
| `~/.config/opencode/agent/planner.md` | Planner (groq/llama-4-scout) |
| `~/.config/opencode/agent/reviewer.md` | Reviewer (groq/qwen3-32b) |
| `~/.config/opencode/agent/security.md` | Security (cerebras/qwen-3-235b) |
| `~/.config/opencode/agent/docs.md` | Docs (groq/llama-3.3-70b) |
| `~/.config/opencode/agent/refactor.md` | Refactor (mistral/devstral-medium) |
| `~/.config/opencode/agent/debugger.md` | Debugger (groq/llama-4-scout) |
| `~/.config/opencode/agent/tester.md` | Tester (groq/llama-4-scout) |
