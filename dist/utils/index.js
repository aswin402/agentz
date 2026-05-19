import { execSync } from "child_process";
import { existsSync } from "fs";
import { join, extname } from "path";
// ============================================================================
// Logger
// ============================================================================
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (LogLevel = {}));
export class Logger {
    level;
    prefix;
    constructor(prefix = "AgentZ", level = LogLevel.INFO) {
        this.prefix = prefix;
        this.level = level;
    }
    debug(message, ...args) {
        if (this.level <= LogLevel.DEBUG) {
            console.debug(`[${this.prefix}]`, message, ...args);
        }
    }
    info(message, ...args) {
        if (this.level <= LogLevel.INFO) {
            console.info(`[${this.prefix}]`, message, ...args);
        }
    }
    warn(message, ...args) {
        if (this.level <= LogLevel.WARN) {
            console.warn(`[${this.prefix}]`, message, ...args);
        }
    }
    error(message, ...args) {
        if (this.level <= LogLevel.ERROR) {
            console.error(`[${this.prefix}]`, message, ...args);
        }
    }
    setLevel(level) {
        this.level = level;
    }
}
// ============================================================================
// File Utilities
// ============================================================================
export function getFileExtension(filePath) {
    return extname(filePath).toLowerCase().replace(".", "");
}
export function isImageFile(filePath) {
    const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico"];
    return imageExtensions.includes(extname(filePath).toLowerCase());
}
export function isCodeFile(filePath) {
    const codeExtensions = [
        ".ts", ".tsx", ".js", ".jsx", ".py", ".rs", ".go", ".java", ".cpp", ".c",
        ".cs", ".rb", ".php", ".swift", ".kt", ".scala", ".vue", ".svelte"
    ];
    return codeExtensions.includes(extname(filePath).toLowerCase());
}
export function findFilesByExtension(dir, extension, recursive = true) {
    if (!existsSync(dir))
        return [];
    try {
        const result = execSync(recursive
            ? `find "${dir}" -name "*.${extension}" -type f 2>/dev/null | head -100`
            : `find "${dir}" -maxdepth 1 -name "*.${extension}" -type f 2>/dev/null | head -100`, { encoding: "utf-8", stdio: "pipe" });
        return result.split("\n").filter(Boolean);
    }
    catch {
        return [];
    }
}
export function countLines(filePath) {
    if (!existsSync(filePath))
        return 0;
    try {
        const content = execSync(`wc -l "${filePath}" 2>/dev/null`, {
            encoding: "utf-8",
            stdio: "pipe",
        });
        return parseInt(content.split(" ")[0], 10) || 0;
    }
    catch {
        return 0;
    }
}
// ============================================================================
// String Utilities
// ============================================================================
export function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}
export function truncate(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    return text.substring(0, maxLength - 3) + "...";
}
export function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
export function camelToKebab(text) {
    return text.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}
export function kebabToCamel(text) {
    return text.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
// ============================================================================
// Time Utilities
// ============================================================================
export function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
}
export function formatTimestamp(date) {
    return date.toISOString();
}
export function parseTimestamp(timestamp) {
    return new Date(timestamp);
}
// ============================================================================
// Async Utilities
// ============================================================================
export async function retry(fn, options = {}) {
    const maxAttempts = options.maxAttempts || 3;
    const delayMs = options.delayMs || 1000;
    const backoff = options.backoff || 2;
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < maxAttempts) {
                if (options.onRetry) {
                    options.onRetry(attempt, lastError);
                }
                const delay = delayMs * Math.pow(backoff, attempt - 1);
                await sleep(delay);
            }
        }
    }
    throw lastError;
}
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export async function parallel(tasks, maxConcurrency = 5) {
    const results = [];
    const executing = [];
    for (const task of tasks) {
        const promise = task().then((result) => {
            results.push(result);
        });
        executing.push(promise);
        if (executing.length >= maxConcurrency) {
            await Promise.race(executing);
            // Remove completed promises
            const completed = executing.filter((p) => p.completed);
        }
    }
    await Promise.all(executing);
    return results;
}
// ============================================================================
// Event System
// ============================================================================
export class EventBus {
    listeners = new Map();
    on(eventType, listener) {
        const existing = this.listeners.get(eventType) || [];
        existing.push(listener);
        this.listeners.set(eventType, existing);
    }
    off(eventType, listener) {
        const existing = this.listeners.get(eventType) || [];
        const filtered = existing.filter((l) => l !== listener);
        this.listeners.set(eventType, filtered);
    }
    emit(event) {
        const listeners = this.listeners.get(event.type) || [];
        for (const listener of listeners) {
            try {
                listener(event);
            }
            catch (error) {
                console.error("Event listener error:", error);
            }
        }
    }
}
// ============================================================================
// Validation Utilities
// ============================================================================
export function isValidModelId(modelId) {
    return /^[a-z0-9_-]+\/[a-z0-9_-]+$/i.test(modelId);
}
export function isValidProvider(provider) {
    const validProviders = [
        "groq", "cerebras", "opencode", "zai", "cosecure", "google",
        "mistral", "openai", "huggingchat", "anthropic", "nvidia"
    ];
    return validProviders.includes(provider.toLowerCase());
}
export function isValidAgentType(type) {
    const validTypes = [
        "planner", "coder", "tester", "reviewer", "security",
        "docs", "refactor", "debugger", "vision"
    ];
    return validTypes.includes(type);
}
// ============================================================================
// Path Utilities
// ============================================================================
export function normalizePath(path) {
    return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}
export function relativeTo(from, to) {
    return normalizePath(join(from, "..", to));
}
export function isSubPath(parent, child) {
    const rel = relativeTo(child, parent);
    return !rel.startsWith("..") && !rel.startsWith("/");
}
// ============================================================================
// Export
// ============================================================================
export const logger = new Logger("AgentZ");
export default {
    Logger,
    LogLevel,
    EventBus,
    retry,
    sleep,
    parallel,
    slugify,
    truncate,
    capitalize,
    camelToKebab,
    kebabToCamel,
    formatDuration,
    formatTimestamp,
    parseTimestamp,
    getFileExtension,
    isImageFile,
    isCodeFile,
    findFilesByExtension,
    countLines,
    isValidModelId,
    isValidProvider,
    isValidAgentType,
    normalizePath,
    relativeTo,
    isSubPath,
};
//# sourceMappingURL=index.js.map