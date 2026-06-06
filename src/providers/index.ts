// ============================================================================
// LLM Provider Client — actual fetch-based API calls to model providers
// ============================================================================

export interface ProviderConfig {
  name: string;
  baseUrl: string;
  apiKeyEnvVar: string;
  apiKeyHeader?: string;      // default: "Authorization"
  apiKeyPrefix?: string;      // default: "Bearer "
  useQueryParam?: string;     // if key goes as query param (Google Gemini)
  models: string[];           // known model names this provider serves
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ChatMessagePart[];
}

export type ChatMessagePart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type LLMResponse =
  | { success: true; content: string; model: string; provider: string; latencyMs: number }
  | { success: false; error: string; provider: string };

const PROVIDER_REGISTRY: Record<string, ProviderConfig> = {
  groq: {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKeyEnvVar: "GROQ_API_KEY",
    models: ["meta-llama/llama-4-scout-17b-16e-instruct", "llama-3.3-70b-versatile", "qwen/qwen3-32b"],
  },
  cerebras: {
    name: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    apiKeyEnvVar: "CEREBRAS_API_KEY",
    models: ["qwen-3-235b-a22b-instruct-2507", "gpt-oss-120b", "llama3.1-8b"],
  },
  mistral: {
    name: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    apiKeyEnvVar: "MISTRAL_API_KEY",
    models: ["devstral-small-2507", "devstral-medium-latest", "codestral-latest", "mistral-small-latest"],
  },
  nvidia: {
    name: "NVIDIA NIM",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    apiKeyEnvVar: "NVIDIA_API_KEY",
    models: ["meta/llama-3.3-70b-instruct", "meta/llama-guard-4-12b", "deepseek-ai/deepseek-v4-flash", "qwen/qwen3-coder-480b-a35b-instruct", "qwen/qwen3.5-122b-a10b"],
  },
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnvVar: "OPENROUTER_API_KEY",
    models: ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite", "google/gemini-3.1-flash-lite", "meta-llama/llama-3.2-90b-vision-instruct"],
  },
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnvVar: "OPENAI_API_KEY",
    models: ["gpt-4o-mini", "gpt-4o"],
  },
  google: {
    name: "Google AI",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKeyEnvVar: "GEMINI_API_KEY",
    apiKeyHeader: "x-goog-api-key",
    apiKeyPrefix: "",
    models: ["gemini-2.5-flash", "gemini-2.0-flash"],
  },
  "ollama-cloud": {
    name: "Ollama Cloud",
    baseUrl: "https://api.ollama.cloud/v1",
    apiKeyEnvVar: "OLLAMA_API_KEY",
    models: ["minimax-m2.7", "qwen3-next:80b", "gemma4:31b"],
  },
};

// ============================================================================
// API Key lookup
// ============================================================================

function getApiKey(provider: string): string | null {
  const config = PROVIDER_REGISTRY[provider];
  if (!config) return null;
  return process.env[config.apiKeyEnvVar] || null;
}

/** List providers that have API keys set */
export function getAvailableProviders(): string[] {
  return Object.keys(PROVIDER_REGISTRY).filter((p) => getApiKey(p) !== null);
}

/** Check if a specific provider+model is usable */
export function isModelAvailable(provider: string, model: string): boolean {
  return getApiKey(provider) !== null;
}

// ============================================================================
// OpenAI-compatible chat completion (covers Groq, Cerebras, Mistral, NVIDIA,
// OpenRouter, OpenAI, Ollama Cloud)
// ============================================================================

async function callOpenAICompatible(
  providerKey: string,
  config: ProviderConfig,
  model: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<LLMResponse> {
  const apiKey = getApiKey(providerKey);
  if (!apiKey) {
    return { success: false, error: `No API key for ${config.name} (set ${config.apiKeyEnvVar})`, provider: config.name };
  }

  const url = `${config.baseUrl}/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  headers[config.apiKeyHeader || "Authorization"] = `${config.apiKeyPrefix || "Bearer "}${apiKey}`;

  const start = Date.now();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      signal,
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 8192,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        success: false,
        error: `${config.name} returned ${response.status}: ${body.slice(0, 200)}`,
        provider: config.name,
      };
    }

    const json = await response.json() as any;
    const content = json?.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: `${config.name}: empty response`, provider: config.name };
    }

    return {
      success: true,
      content,
      model,
      provider: config.name,
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { success: false, error: `${config.name} timeout after ${config.name}`, provider: config.name };
    }
    return { success: false, error: `${config.name}: ${err.message}`, provider: config.name };
  }
}

// ============================================================================
// Google Gemini chat completion
// ============================================================================

async function callGemini(
  model: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<LLMResponse> {
  const config = PROVIDER_REGISTRY["google"];
  const apiKey = getApiKey("google");
  if (!apiKey) {
    return { success: false, error: `No API key for Google (set ${config!.apiKeyEnvVar})`, provider: "Google AI" };
  }

  // Convert chat messages to Gemini format
  const contents = messages.map((m) => {
    const role = m.role === "assistant" ? "model" : "user";
    if (typeof m.content === "string") {
      return {
        role,
        parts: [{ text: m.content }],
      };
    } else {
      const parts = m.content.map((part) => {
        if (part.type === "text") {
          return { text: part.text };
        } else if (part.type === "image_url") {
          const match = part.image_url.url.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            return {
              inlineData: {
                mimeType: match[1],
                data: match[2],
              },
            };
          }
        }
        return null;
      }).filter((p): p is { text: string } | { inlineData: { mimeType: string; data: string } } => p !== null);
      return { role, parts };
    }
  });

  const url = `${config!.baseUrl}/models/${model}:generateContent?key=${apiKey}`;
  const start = Date.now();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { success: false, error: `Google returned ${response.status}: ${body.slice(0, 200)}`, provider: "Google AI" };
    }

    const json = await response.json() as any;
    const content = json?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      return { success: false, error: "Google: empty response", provider: "Google AI" };
    }

    return {
      success: true,
      content,
      model,
      provider: "Google AI",
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { success: false, error: "Google timeout", provider: "Google AI" };
    }
    return { success: false, error: `Google: ${err.message}`, provider: "Google AI" };
  }
}

// ============================================================================
// Public dispatch — routes to correct provider implementation
// ============================================================================

export async function callLLM(
  provider: string,
  model: string,
  messages: ChatMessage[],
  timeoutMs: number = 60_000,
): Promise<LLMResponse> {
  const config = PROVIDER_REGISTRY[provider];
  if (!config) {
    return { success: false, error: `Unknown provider: ${provider}`, provider };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (provider === "google") {
      return await callGemini(model, messages, controller.signal);
    }
    return await callOpenAICompatible(provider, config, model, messages, controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

export default { callLLM, getAvailableProviders, isModelAvailable };
