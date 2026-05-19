import { PrimaryController } from "./core/controller.js";
import { ConfigManager, generateConfigTemplate, DEFAULT_MODEL_CHAINS } from "./core/config.js";
import { ModelRouter } from "./agents/router.js";
import { AgentFactory, AGENT_SPECS, classifyIntent, FREE_PROVIDERS } from "./agents/factory.js";
import { SharedMemory, createSharedMemory } from "./runtime/memory.js";
import { SpecWorkflow, createSpecWorkflow } from "./workflow/spec.js";
import { VerificationPipeline, createVerificationPipeline } from "./verification/pipeline.js";
import * as utils from "./utils/index.js";

// Re-export types
export type {
  AgentType,
  IntentType,
  ModelConfig,
  SubagentInstance,
  SubagentStatus,
  SubagentResult,
  Task,
  TaskStatus,
  Plan,
  Spec,
  BoulderState,
  PrimaryDecision,
  PrimaryAction,
  SharedMemoryEntry,
  VerificationStatus,
  VerificationCriterion,
  AgentCapability,
} from "./types/index.js";

// Export classes
export {
  PrimaryController,
  ConfigManager,
  ModelRouter,
  AgentFactory,
  SharedMemory,
  SpecWorkflow,
  VerificationPipeline,
  AGENT_SPECS,
  DEFAULT_MODEL_CHAINS,
  FREE_PROVIDERS,
  classifyIntent,
  generateConfigTemplate,
  createSharedMemory,
  createSpecWorkflow,
  createVerificationPipeline,
};

// Export utilities
export { utils as utils };

// Default export
export default {
  PrimaryController,
  ConfigManager,
  ModelRouter,
  AgentFactory,
  SharedMemory,
  SpecWorkflow,
  VerificationPipeline,
  AGENT_SPECS,
  classifyIntent,
  generateConfigTemplate,
};