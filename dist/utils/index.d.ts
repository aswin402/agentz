import type { AgentZEvent, AgentZEventType } from "../types/index.js";
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}
export declare class Logger {
    private level;
    private prefix;
    constructor(prefix?: string, level?: LogLevel);
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
    setLevel(level: LogLevel): void;
}
export declare function getFileExtension(filePath: string): string;
export declare function isImageFile(filePath: string): boolean;
export declare function isCodeFile(filePath: string): boolean;
export declare function findFilesByExtension(dir: string, extension: string, recursive?: boolean): string[];
export declare function countLines(filePath: string): number;
export declare function slugify(text: string): string;
export declare function truncate(text: string, maxLength: number): string;
export declare function capitalize(text: string): string;
export declare function camelToKebab(text: string): string;
export declare function kebabToCamel(text: string): string;
export declare function formatDuration(ms: number): string;
export declare function formatTimestamp(date: Date): string;
export declare function parseTimestamp(timestamp: string): Date;
export declare function retry<T>(fn: () => Promise<T>, options?: {
    maxAttempts?: number;
    delayMs?: number;
    backoff?: number;
    onRetry?: (attempt: number, error: Error) => void;
}): Promise<T>;
export declare function sleep(ms: number): Promise<void>;
export declare function parallel<T>(tasks: (() => Promise<T>)[], maxConcurrency?: number): Promise<T[]>;
export declare class EventBus {
    private listeners;
    on(eventType: AgentZEventType, listener: (event: AgentZEvent) => void): void;
    off(eventType: AgentZEventType, listener: (event: AgentZEvent) => void): void;
    emit(event: AgentZEvent): void;
}
export declare function isValidModelId(modelId: string): boolean;
export declare function isValidProvider(provider: string): boolean;
export declare function isValidAgentType(type: string): boolean;
export declare function normalizePath(path: string): string;
export declare function relativeTo(from: string, to: string): string;
export declare function isSubPath(parent: string, child: string): boolean;
export declare const logger: Logger;
declare const _default: {
    Logger: typeof Logger;
    LogLevel: typeof LogLevel;
    EventBus: typeof EventBus;
    retry: typeof retry;
    sleep: typeof sleep;
    parallel: typeof parallel;
    slugify: typeof slugify;
    truncate: typeof truncate;
    capitalize: typeof capitalize;
    camelToKebab: typeof camelToKebab;
    kebabToCamel: typeof kebabToCamel;
    formatDuration: typeof formatDuration;
    formatTimestamp: typeof formatTimestamp;
    parseTimestamp: typeof parseTimestamp;
    getFileExtension: typeof getFileExtension;
    isImageFile: typeof isImageFile;
    isCodeFile: typeof isCodeFile;
    findFilesByExtension: typeof findFilesByExtension;
    countLines: typeof countLines;
    isValidModelId: typeof isValidModelId;
    isValidProvider: typeof isValidProvider;
    isValidAgentType: typeof isValidAgentType;
    normalizePath: typeof normalizePath;
    relativeTo: typeof relativeTo;
    isSubPath: typeof isSubPath;
};
export default _default;
//# sourceMappingURL=index.d.ts.map