import { z } from "zod";
// ============================================================================
// Intent Types
// ============================================================================
export const IntentTypeSchema = z.enum([
    "research",
    "implementation",
    "fix",
    "refactor",
    "review",
    "docs",
    "mixed",
]);
// ============================================================================
// Agent Types
// ============================================================================
export const AgentTypeSchema = z.enum([
    "planner",
    "coder",
    "tester",
    "reviewer",
    "security",
    "docs",
    "refactor",
    "debugger",
    "vision",
]);
export const SubagentStatusSchema = z.enum([
    "spawned",
    "running",
    "waiting",
    "completed",
    "failed",
    "timeout",
    "killed",
]);
export const TaskStatusSchema = z.enum([
    "pending",
    "in_progress",
    "completed",
    "failed",
    "skipped",
]);
export const VerificationCriterionStatusSchema = z.enum([
    "pending",
    "passed",
    "failed",
    "skipped",
]);
//# sourceMappingURL=index.js.map