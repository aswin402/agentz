import { execSync } from "child_process";
import { existsSync } from "fs";
import { join, extname } from "path";
import type { AgentZEvent, AgentZEventType } from "../types/index.js";

// ============================================================================
// Logger
// ============================================================================

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(prefix: string = "AgentZ", level: LogLevel = LogLevel.INFO) {
    this.prefix = prefix;
    this.level = level;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`[${this.prefix}]`, message, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(`[${this.prefix}]`, message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[${this.prefix}]`, message, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[${this.prefix}]`, message, ...args);
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

// ============================================================================
// File Utilities
// ============================================================================

export function getFileExtension(filePath: string): string {
  return extname(filePath).toLowerCase().replace(".", "");
}

export function isImageFile(filePath: string): boolean {
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico"];
  return imageExtensions.includes(extname(filePath).toLowerCase());
}

export function isCodeFile(filePath: string): boolean {
  const codeExtensions = [
    ".ts", ".tsx", ".js", ".jsx", ".py", ".rs", ".go", ".java", ".cpp", ".c",
    ".cs", ".rb", ".php", ".swift", ".kt", ".scala", ".vue", ".svelte"
  ];
  return codeExtensions.includes(extname(filePath).toLowerCase());
}

export function findFilesByExtension(
  dir: string,
  extension: string,
  recursive: boolean = true
): string[] {
  if (!existsSync(dir)) return [];

  try {
    const result = execSync(
      recursive
        ? `find "${dir}" -name "*.${extension}" -type f 2>/dev/null | head -100`
        : `find "${dir}" -maxdepth 1 -name "*.${extension}" -type f 2>/dev/null | head -100`,
      { encoding: "utf-8", stdio: "pipe" }
    );
    return result.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export function countLines(filePath: string): number {
  if (!existsSync(filePath)) return 0;

  try {
    const content = execSync(`wc -l "${filePath}" 2>/dev/null`, {
      encoding: "utf-8",
      stdio: "pipe",
    });
    return parseInt(content.split(" ")[0], 10) || 0;
  } catch {
    return 0;
  }
}

// ============================================================================
// String Utilities
// ============================================================================

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function camelToKebab(text: string): string {
  return text.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

export function kebabToCamel(text: string): string {
  return text.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

// ============================================================================
// Time Utilities
// ============================================================================

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function formatTimestamp(date: Date): string {
  return date.toISOString();
}

export function parseTimestamp(timestamp: string): Date {
  return new Date(timestamp);
}

// ============================================================================
// Async Utilities
// ============================================================================

export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    backoff?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts || 3;
  const delayMs = options.delayMs || 1000;
  const backoff = options.backoff || 2;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
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

  throw lastError!;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function parallel<T>(
  tasks: (() => Promise<T>)[],
  maxConcurrency: number = 5
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const promise = task().then((result) => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= maxConcurrency) {
      await Promise.race(executing);
      // Remove completed promises
      const completed = executing.filter(
        (p) => (p as Promise<void> & { completed?: boolean }).completed
      );
    }
  }

  await Promise.all(executing);
  return results;
}

// ============================================================================
// Event System
// ============================================================================

export class EventBus {
  private listeners: Map<AgentZEventType, ((event: AgentZEvent) => void)[]> = new Map();

  on(eventType: AgentZEventType, listener: (event: AgentZEvent) => void): void {
    const existing = this.listeners.get(eventType) || [];
    existing.push(listener);
    this.listeners.set(eventType, existing);
  }

  off(eventType: AgentZEventType, listener: (event: AgentZEvent) => void): void {
    const existing = this.listeners.get(eventType) || [];
    const filtered = existing.filter((l) => l !== listener);
    this.listeners.set(eventType, filtered);
  }

  emit(event: AgentZEvent): void {
    const listeners = this.listeners.get(event.type) || [];
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Event listener error:", error);
      }
    }
  }
}

// ============================================================================
// Validation Utilities
// ============================================================================

export function isValidModelId(modelId: string): boolean {
  return /^[a-z0-9_-]+\/[a-z0-9_-]+$/i.test(modelId);
}

export function isValidProvider(provider: string): boolean {
  const validProviders = [
    "groq", "cerebras", "opencode", "zai", "cosecure", "google",
    "mistral", "openai", "huggingchat", "anthropic", "nvidia"
  ];
  return validProviders.includes(provider.toLowerCase());
}

export function isValidAgentType(type: string): boolean {
  const validTypes = [
    "planner", "coder", "tester", "reviewer", "security",
    "docs", "refactor", "debugger", "vision"
  ];
  return validTypes.includes(type);
}

// ============================================================================
// Path Utilities
// ============================================================================

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

export function relativeTo(from: string, to: string): string {
  return normalizePath(join(from, "..", to));
}

export function isSubPath(parent: string, child: string): boolean {
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