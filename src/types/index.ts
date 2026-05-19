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
export type IntentType = z.infer<typeof IntentTypeSchema>;

// ============================================================================
// Model & Provider Types
// ============================================================================

export interface ModelConfig {
  provider: string;
  model: string;
  reasoning?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface ModelChainEntry extends ModelConfig {
  reason?: string;
}

export interface AgentModelChain {
  modelChain: ModelChainEntry[];
  timeoutSeconds: number;
  fallbackTrigger?: "no_output" | "error" | "timeout";
}

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
export type AgentType = z.infer<typeof AgentTypeSchema>;

export interface AgentSpec {
  type: AgentType;
  name: string;
  description: string;
  modelChain: ModelChainEntry[];
  timeoutSeconds: number;
  systemPromptPath?: string;
  capabilities: AgentCapability[];
}

export type AgentCapability =
  | "code_read"
  | "code_write"
  | "code_edit"
  | "bash_execute"
  | "web_search"
  | "web_fetch"
  | "file_create"
  | "file_delete"
  | "image_analysis"
  | "test_write"
  | "test_execute"
  | "lint_check"
  | "security_scan"
  | "docs_write";

// ============================================================================
// Subagent Types
// ============================================================================

export interface SubagentInstance {
  id: string;
  type: AgentType;
  model: ModelConfig;
  status: SubagentStatus;
  startedAt: Date;
  endedAt?: Date;
  taskId: string;
  result?: SubagentResult;
  progress?: string;
}

export const SubagentStatusSchema = z.enum([
  "spawned",
  "running",
  "waiting",
  "completed",
  "failed",
  "timeout",
  "killed",
]);
export type SubagentStatus = z.infer<typeof SubagentStatusSchema>;

export interface SubagentResult {
  success: boolean;
  output?: string;
  error?: string;
  artifacts?: string[];
  learnings?: string[];
  verificationStatus?: VerificationStatus;
}

// ============================================================================
// Task & Plan Types
// ============================================================================

export interface Task {
  id: string;
  name: string;
  description: string;
  assignedAgent?: AgentType;
  status: TaskStatus;
  dependencies: string[];
  artifacts: string[];
  verificationCriteria: VerificationCriterion[];
}

export const TaskStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "failed",
  "skipped",
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export interface Plan {
  id: string;
  name: string;
  objective: string;
  scope: {
    inScope: string[];
    outOfScope: string[];
  };
  tasks: Task[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Verification Types
// ============================================================================

export interface VerificationCriterion {
  id: string;
  description: string;
  type: VerificationType;
  status: VerificationCriterionStatus;
  details?: string;
}

export type VerificationType =
  | "syntax"
  | "lint"
  | "tests"
  | "security"
  | "behavior"
  | "manual";

export const VerificationCriterionStatusSchema = z.enum([
  "pending",
  "passed",
  "failed",
  "skipped",
]);
export type VerificationCriterionStatus = z.infer<
  typeof VerificationCriterionStatusSchema
>;

export interface VerificationStatus {
  overall: "pass" | "fail" | "partial";
  criteria: VerificationCriterion[];
  timestamp: Date;
}

// ============================================================================
// Shared Memory Types
// ============================================================================

export interface SharedMemoryEntry {
  agentId: string;
  agentType: AgentType;
  timestamp: Date;
  status: SubagentStatus;
  workPerformed: string[];
  learnings: string[];
  nextSteps: string[];
  artifacts: string[];
}

export interface PrimaryDecision {
  timestamp?: Date;
  action: PrimaryAction;
  reason: string;
  agentId?: string;
  model?: ModelConfig;
  details?: Record<string, unknown>;
}

export type PrimaryAction =
  | "spawn"
  | "kill"
  | "fallback"
  | "verify"
  | "continue"
  | "retry"
  | "escalate"
  | "complete";

// ============================================================================
// Session & Boulder Types
// ============================================================================

export interface BoulderState {
  activeTask: string;
  startedAt: Date;
  planFile: string;
  completedTasks: CompletedTaskRecord[];
  currentTask: CurrentTaskState | null;
  remainingTasks: PendingTask[];
  learnings: string[];
  sessionIds: string[];
}

export interface CompletedTaskRecord {
  name: string;
  verified: boolean;
  verifiedAt?: Date;
}

export interface CurrentTaskState {
  name: string;
  status: "in_progress" | "waiting" | "retry";
  assignedAgent?: AgentType;
  assignedModel?: ModelConfig;
  startedAt: Date;
  attemptCount: number;
}

export interface PendingTask {
  name: string;
  agentType?: AgentType;
  dependencies: string[];
}

// ============================================================================
// Spec Types
// ============================================================================

export interface Spec {
  id: string;
  objective: string;
  scope: {
    inScope: string[];
    outOfScope: string[];
  };
  requirements: {
    functional: string[];
    nonFunctional: Record<string, string>;
  };
  acceptanceCriteria: AcceptanceCriterion[];
  fileChanges: {
    create: string[];
    modify: string[];
    delete: string[];
  };
  dependencies: string[];
  verificationPlan: string;
  createdAt: Date;
}

export interface AcceptanceCriterion {
  id: string;
  description: string;
  verified: boolean;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AgentZConfig {
  primary: {
    model: string;
    role: "controller";
  };
  agents: Partial<Record<AgentType, AgentModelChain>>;
  parallel: {
    maxAgents: number;
    perProvider: Record<string, number>;
    perModel: Record<string, number>;
  };
  verification: {
    autoFix: boolean;
    maxAttempts: number;
    requireTests: boolean;
  };
  skills: {
    enable: string[];
    sources: string[];
  };
  specWorkflow: {
    autoApproveSimple: boolean;
    requireReviewComplex: boolean;
  };
}

// ============================================================================
// Event Types
// ============================================================================

export type AgentZEventType =
  | "agent:spawned"
  | "agent:progress"
  | "agent:completed"
  | "agent:failed"
  | "agent:timeout"
  | "agent:killed"
  | "verification:started"
  | "verification:passed"
  | "verification:failed"
  | "task:started"
  | "task:completed"
  | "task:failed"
  | "plan:created"
  | "plan:approved"
  | "memory:updated"
  | "decision:made";

export interface AgentZEvent {
  type: AgentZEventType;
  timestamp: Date;
  payload: Record<string, unknown>;
}

// ============================================================================
// Provider Types
// ============================================================================

export interface ModelProvider {
  name: string;
  baseUrl: string;
  apiKey?: string;
  capabilities: string[];
  rateLimits: {
    requestsPerMinute?: number;
    requestsPerDay?: number;
    tokensPerMinute?: number;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type AsyncResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}
