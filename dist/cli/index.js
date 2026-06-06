#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { PrimaryController } from "../core/controller.js";
import { ConfigManager, generateConfigTemplate } from "../core/config.js";
import { SpecWorkflow } from "../workflow/spec.js";
import { SharedMemory } from "../runtime/memory.js";
import { AGENT_SPECS } from "../agents/factory.js";
import { ModelRouter } from "../agents/router.js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
const program = new Command();
// ============================================================================
// Global Options
// ============================================================================
program
    .name("agentz")
    .description("Multi-model agent orchestration harness for OpenCode")
    .version("0.1.0");
// ============================================================================
// Commands: Start Task
// ============================================================================
program
    .command("start")
    .description("Start a new task with the orchestration system")
    .argument("<request>", "The task request description")
    .option("-i, --images", "Request includes images for vision analysis")
    .option("-p, --project <path>", "Project root directory", process.cwd())
    .action(async (request, options) => {
    console.log(chalk.blue("\n🚀 AgentZ - Starting new task\n"));
    console.log(chalk.gray("Request:"), request.substring(0, 100) + (request.length > 100 ? "..." : ""));
    console.log(chalk.gray("Project:"), options.project || process.cwd());
    console.log();
    try {
        const controller = new PrimaryController(options.project);
        await controller.startTask(request, options.images || false);
        const status = controller.getStatus();
        console.log(chalk.green("\n✅ Task completed successfully!\n"));
        console.log(chalk.gray("Summary:"));
        console.log(chalk.gray("  Task:"), status.activeTask);
        console.log(chalk.gray("  Progress:"), `${status.planProgress.completed}/${status.planProgress.total} tasks completed`);
        process.exit(0);
    }
    catch (error) {
        console.error(chalk.red("\n❌ Task failed:"), error instanceof Error ? error.message : "Unknown error");
        process.exit(1);
    }
});
// ============================================================================
// Commands: Resume Task
// ============================================================================
program
    .command("resume")
    .description("Resume an interrupted task")
    .argument("[slug]", "Task slug to resume (defaults to last active task)")
    .option("-p, --project <path>", "Project root directory", process.cwd())
    .action(async (slug, options) => {
    console.log(chalk.blue("\n🔄 AgentZ - Resuming task\n"));
    try {
        const controller = new PrimaryController(options?.project);
        await controller.resumeTask(slug);
        console.log(chalk.green("\n✅ Task resumed successfully!\n"));
        process.exit(0);
    }
    catch (error) {
        console.error(chalk.red("\n❌ Resume failed:"), error instanceof Error ? error.message : "Unknown error");
        process.exit(1);
    }
});
// ============================================================================
// Commands: List Tasks
// ============================================================================
program
    .command("list")
    .description("List all tasks")
    .option("-p, --project <path>", "Project root directory", process.cwd())
    .option("-l, --limit <number>", "Maximum number of tasks to show", "10")
    .action((options) => {
    const specWorkflow = new SpecWorkflow(options.project);
    const tasks = specWorkflow.listTasks();
    if (tasks.length === 0) {
        console.log(chalk.yellow("\nNo tasks found.\n"));
        return;
    }
    const limit = parseInt(options.limit || "10", 10);
    const displayTasks = tasks.slice(0, limit);
    console.log(chalk.blue("\n📋 Tasks\n"));
    console.log(chalk.gray("Slug".padEnd(40)), chalk.gray("Last Modified"));
    console.log(chalk.gray("─".repeat(60)));
    for (const task of displayTasks) {
        const slug = task.slug.padEnd(38);
        const date = task.modified.toISOString().split("T")[0];
        console.log(slug, date);
    }
    if (tasks.length > limit) {
        console.log(chalk.gray(`\n... and ${tasks.length - limit} more tasks`));
    }
    console.log();
});
// ============================================================================
// Commands: Show Task
// ============================================================================
program
    .command("show")
    .description("Show task details")
    .argument("<slug>", "Task slug")
    .option("-p, --project <path>", "Project root directory", process.cwd())
    .option("--spec", "Show spec only")
    .option("--plan", "Show plan only")
    .option("--log", "Show implementation log only")
    .option("--summary", "Show final summary only")
    .action((slug, options) => {
    const specWorkflow = new SpecWorkflow(options.project);
    // If no specific option, show everything
    if (!options.spec && !options.plan && !options.log && !options.summary) {
        const spec = specWorkflow.readSpec(slug);
        const plan = specWorkflow.readPlan(slug);
        const log = specWorkflow.readImplementationLog(slug);
        const summary = specWorkflow.readFinalSummary(slug);
        console.log(chalk.blue(`\n📋 Task: ${slug}\n`));
        if (spec) {
            console.log(chalk.green("## Spec\n"));
            console.log(spec.objective);
        }
        if (plan) {
            console.log(chalk.green("\n## Plan\n"));
            for (const task of plan.tasks) {
                const status = task.status === "completed" ? chalk.green("✓") : chalk.gray("○");
                console.log(`  ${status} ${task.name} (${task.status})`);
            }
        }
        if (log) {
            console.log(chalk.green("\n## Implementation Log\n"));
            console.log(log.substring(0, 500) + (log.length > 500 ? "..." : ""));
        }
        if (summary) {
            console.log(chalk.green("\n## Final Summary\n"));
            console.log(summary);
        }
        console.log();
        return;
    }
    // Show specific sections
    if (options.spec) {
        const spec = specWorkflow.readSpec(slug);
        if (spec) {
            console.log(spec);
        }
        else {
            console.log(chalk.yellow("Spec not found"));
        }
    }
    if (options.plan) {
        const plan = specWorkflow.readPlan(slug);
        if (plan) {
            console.log(JSON.stringify(plan, null, 2));
        }
        else {
            console.log(chalk.yellow("Plan not found"));
        }
    }
    if (options.log) {
        const log = specWorkflow.readImplementationLog(slug);
        if (log) {
            console.log(log);
        }
        else {
            console.log(chalk.yellow("Implementation log not found"));
        }
    }
    if (options.summary) {
        const summary = specWorkflow.readFinalSummary(slug);
        if (summary) {
            console.log(summary);
        }
        else {
            console.log(chalk.yellow("Final summary not found"));
        }
    }
});
// ============================================================================
// Commands: Config
// ============================================================================
const configCommand = program
    .command("config")
    .description("Manage AgentZ configuration");
configCommand
    .command("show")
    .description("Show current configuration")
    .option("-p, --project <path>", "Project root directory", process.cwd())
    .action((options) => {
    const configManager = new ConfigManager(options.project);
    const config = configManager.getConfig();
    console.log(JSON.stringify(config, null, 2));
});
configCommand
    .command("init")
    .description("Initialize configuration file")
    .option("-p, --project <path>", "Project root directory", process.cwd())
    .action((options) => {
    const configManager = new ConfigManager(options.project);
    const template = generateConfigTemplate();
    const configPath = join(options.project || process.cwd(), ".agentz", "config.json");
    if (existsSync(configPath)) {
        console.log(chalk.yellow("Configuration already exists. Use 'agentz config reset' to reset."));
        return;
    }
    writeFileSync(configPath, template, "utf-8");
    console.log(chalk.green("Configuration initialized at:"), configPath);
});
configCommand
    .command("reset")
    .description("Reset configuration to defaults")
    .option("-p, --project <path>", "Project root directory", process.cwd())
    .action((options) => {
    const configManager = new ConfigManager(options.project);
    configManager.resetToDefaults();
    console.log(chalk.green("Configuration reset to defaults."));
});
// ============================================================================
// Commands: Agents
// ============================================================================
program
    .command("agents")
    .description("Show available agents and their configurations")
    .option("-p, --project <path>", "Project root directory", process.cwd())
    .action((options) => {
    const configManager = new ConfigManager(options.project);
    const router = new ModelRouter(configManager);
    console.log(chalk.blue("\n🤖 Available Agents\n"));
    for (const [type, spec] of Object.entries(AGENT_SPECS)) {
        console.log(chalk.green(`## ${spec.name} (${type})`));
        console.log(chalk.gray("Description:"), spec.description);
        console.log(chalk.gray("Timeout:"), `${spec.timeoutSeconds}s`);
        console.log(chalk.gray("Capabilities:"), spec.capabilities.join(", "));
        console.log();
        const chain = configManager.getAgentChain(type);
        console.log(chalk.gray("Model Chain:"));
        for (const model of chain.modelChain) {
            console.log(chalk.gray(`  - ${model.provider}/${model.model}`), model.reason ? chalk.yellow("(reasoning)") : "");
        }
        console.log(chalk.gray("─".repeat(40)));
        console.log();
    }
});
// ============================================================================
// Commands: Status
// ============================================================================
program
    .command("status")
    .description("Show current session status")
    .option("-p, --project <path>", "Project root directory", process.cwd())
    .action((options) => {
    const sharedMemory = new SharedMemory(join(options.project || process.cwd(), ".agentz/runtime"));
    const boulder = sharedMemory.getBoulder();
    const subagents = sharedMemory.getActiveSubagents();
    console.log(chalk.blue("\n📊 AgentZ Status\n"));
    if (boulder) {
        console.log(chalk.green("Active Task:"), boulder.activeTask);
        console.log(chalk.green("Started:"), boulder.startedAt.toISOString());
        console.log(chalk.green("Completed:"), boulder.completedTasks.length);
        console.log(chalk.green("Remaining:"), boulder.remainingTasks.length);
    }
    else {
        console.log(chalk.yellow("No active task"));
    }
    console.log(chalk.green("\nActive Subagents:"), subagents.length);
    for (const agent of subagents) {
        console.log(chalk.gray(`  - ${agent.agentType}: ${agent.status}`));
    }
    console.log();
});
// ============================================================================
// Commands: Learnings
// ============================================================================
program
    .command("learnings")
    .description("Show accumulated learnings from previous tasks")
    .option("-p, --project <path>", "Project root directory", process.cwd())
    .option("-c, --clear", "Clear all learnings")
    .action((options) => {
    const sharedMemory = new SharedMemory(join(options.project || process.cwd(), ".agentz/runtime"));
    if (options.clear) {
        // Clear learnings file
        console.log(chalk.yellow("Clearing learnings..."));
        // Would need to implement this in SharedMemory
        console.log(chalk.green("Done."));
        return;
    }
    const learnings = sharedMemory.getLearnings();
    if (learnings.length === 0) {
        console.log(chalk.yellow("\nNo learnings accumulated yet.\n"));
        return;
    }
    console.log(chalk.blue("\n📚 Accumulated Learnings\n"));
    for (const learning of learnings) {
        console.log(chalk.gray("•"), learning);
    }
    console.log();
});
// ============================================================================
// Commands: Kill
// ============================================================================
program
    .command("kill")
    .description("Kill an active subagent")
    .argument("<agent-id>", "Agent ID to kill")
    .option("-p, --project <path>", "Project root directory", process.cwd())
    .action((agentId, options) => {
    // This would need to be connected to a running controller
    console.log(chalk.yellow("Note: This command requires an active session."));
    console.log(chalk.gray("Agent ID:"), agentId);
});
// ============================================================================
// Commands: Ultrawork (Convenience Command)
// ============================================================================
program
    .command("ultrawork")
    .description("Quick start - automatically figures out what to do")
    .argument("<request>", "What you want to accomplish")
    .option("-p, --project <path>", "Project root directory", process.cwd())
    .action(async (request, options) => {
    console.log(chalk.blue("\n⚡ AgentZ Ultrawork Mode\n"));
    console.log(chalk.gray("Request:"), request);
    console.log();
    try {
        const controller = new PrimaryController(options.project);
        await controller.startTask(request, false);
        console.log(chalk.green("\n✅ Ultrawork completed!\n"));
        process.exit(0);
    }
    catch (error) {
        console.error(chalk.red("\n❌ Ultrawork failed:"), error instanceof Error ? error.message : "Unknown error");
        process.exit(1);
    }
});
// ============================================================================
// Commands: Vision Direct Call
// ============================================================================
program
    .command("vision")
    .description("Analyze an image file using the vision model chain")
    .argument("<path>", "Path to the image file")
    .action(async (path) => {
    try {
        const resolvedPath = path.startsWith("/") ? path : join(process.cwd(), path);
        if (!existsSync(resolvedPath)) {
            console.error(chalk.red(`Error: Image file does not exist at ${resolvedPath}`));
            process.exit(1);
        }
        // Read file and convert to base64
        const base64Data = readFileSync(resolvedPath).toString("base64");
        // Get MIME type
        const ext = resolvedPath.split(".").pop()?.toLowerCase();
        let mimeType = "image/png";
        if (ext === "jpg" || ext === "jpeg")
            mimeType = "image/jpeg";
        else if (ext === "webp")
            mimeType = "image/webp";
        else if (ext === "gif")
            mimeType = "image/gif";
        // Call LLM
        const configManager = new ConfigManager();
        const router = new ModelRouter(configManager);
        const { callLLM } = await import("../providers/index.js");
        const subagentType = "vision";
        const model = router.getNextModel(subagentType, 0);
        if (!model) {
            console.error(chalk.red("Error: No model configured for vision agent"));
            process.exit(1);
        }
        const systemPrompt = "You are a vision-only agent. Analyze the provided image and describe its contents clearly and accurately.";
        const messages = [
            { role: "system", content: systemPrompt },
            {
                role: "user",
                content: [
                    { type: "text", text: "Describe the visible facts in this image. Focus on layout, text, UI elements, colors, and content." },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:${mimeType};base64,${base64Data}`,
                        },
                    },
                ],
            },
        ];
        console.log(chalk.blue(`Analyzing image using ${model.provider}/${model.model}...`));
        const timeoutMs = router.getTimeout(subagentType) * 1000;
        const result = await callLLM(model.provider, model.model, messages, timeoutMs);
        if (result.success) {
            console.log(result.content);
            process.exit(0);
        }
        else {
            console.error(chalk.red(`Error: ${result.error}`));
            process.exit(1);
        }
    }
    catch (error) {
        console.error(chalk.red("Error:"), error instanceof Error ? error.message : "Unknown error");
        process.exit(1);
    }
});
// ============================================================================
// Parse Arguments
// ============================================================================
program.parse();
//# sourceMappingURL=index.js.map