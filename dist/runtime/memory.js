import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";
// ============================================================================
// Shared Memory System
// ============================================================================
export class SharedMemory {
    basePath;
    currentSessionId;
    constructor(basePath = ".agentz/runtime") {
        this.basePath = basePath;
        this.currentSessionId = this.generateSessionId();
        this.ensureDirectoryStructure();
    }
    generateSessionId() {
        return `session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    }
    ensureDirectoryStructure() {
        const dirs = [
            join(this.basePath, "active"),
            join(this.basePath, "active/subagent-status"),
            join(this.basePath, "sessions"),
            join(this.basePath, "history"),
        ];
        for (const dir of dirs) {
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
        }
    }
    // ============================================================================
    // Shared Memory Operations
    // ============================================================================
    /**
     * Write a shared memory entry from a subagent
     */
    writeEntry(entry) {
        const memoryPath = join(this.basePath, "active/shared-memory.md");
        const section = this.formatEntry(entry);
        const existing = this.readSharedMemory();
        const existingIndex = existing.findIndex((e) => e.agentId === entry.agentId && e.agentType === entry.agentType);
        let updated;
        if (existingIndex >= 0) {
            updated = [...existing];
            updated[existingIndex] = entry;
        }
        else {
            updated = [...existing, entry];
        }
        const content = this.serializeSharedMemory(updated);
        writeFileSync(memoryPath, content, "utf-8");
    }
    /**
     * Read all shared memory entries
     */
    readSharedMemory() {
        const memoryPath = join(this.basePath, "active/shared-memory.md");
        if (!existsSync(memoryPath)) {
            return [];
        }
        try {
            const content = readFileSync(memoryPath, "utf-8");
            return this.parseSharedMemory(content);
        }
        catch {
            return [];
        }
    }
    /**
     * Get entries for a specific agent
     */
    getEntriesForAgent(agentId) {
        const all = this.readSharedMemory();
        return all.filter((e) => e.agentId === agentId);
    }
    /**
     * Get entries for a specific agent type
     */
    getEntriesByType(agentType) {
        const all = this.readSharedMemory();
        return all.filter((e) => e.agentType === agentType);
    }
    /**
     * Clear all shared memory
     */
    clearSharedMemory() {
        const memoryPath = join(this.basePath, "active/shared-memory.md");
        if (existsSync(memoryPath)) {
            writeFileSync(memoryPath, "", "utf-8");
        }
    }
    // ============================================================================
    // Decision Log Operations
    // ============================================================================
    /**
     * Write a primary model decision
     */
    writeDecision(decision) {
        const logPath = join(this.basePath, "active/decision-log.md");
        const entry = this.formatDecision(decision);
        const existing = existsSync(logPath) ? readFileSync(logPath, "utf-8") : "";
        writeFileSync(logPath, existing + entry, "utf-8");
    }
    /**
     * Read decision log
     */
    readDecisionLog() {
        const logPath = join(this.basePath, "active/decision-log.md");
        if (!existsSync(logPath)) {
            return [];
        }
        try {
            const content = readFileSync(logPath, "utf-8");
            return this.parseDecisionLog(content);
        }
        catch {
            return [];
        }
    }
    // ============================================================================
    // Boulder Operations (Cross-Session State)
    // ============================================================================
    /**
     * Get current boulder state
     */
    getBoulder() {
        const boulderPath = join(this.basePath, "boulder.json");
        if (!existsSync(boulderPath)) {
            return null;
        }
        try {
            const content = readFileSync(boulderPath, "utf-8");
            return JSON.parse(content);
        }
        catch {
            return null;
        }
    }
    /**
     * Save boulder state
     */
    saveBoulder(boulder) {
        const boulderPath = join(this.basePath, "boulder.json");
        writeFileSync(boulderPath, JSON.stringify(boulder, null, 2), "utf-8");
    }
    /**
     * Update boulder state
     */
    updateBoulder(updates) {
        const current = this.getBoulder() || this.createDefaultBoulder();
        const updated = { ...current, ...updates };
        this.saveBoulder(updated);
    }
    /**
     * Clear boulder (end current task)
     */
    clearBoulder() {
        const boulderPath = join(this.basePath, "boulder.json");
        if (existsSync(boulderPath)) {
            execSync(`rm "${boulderPath}"`);
        }
    }
    createDefaultBoulder() {
        return {
            activeTask: "",
            startedAt: new Date(),
            planFile: "",
            completedTasks: [],
            currentTask: null,
            remainingTasks: [],
            learnings: [],
            sessionIds: [],
        };
    }
    // ============================================================================
    // Learnings Operations
    // ============================================================================
    /**
     * Get accumulated learnings from memory
     */
    getLearnings() {
        const entries = this.readSharedMemory();
        const learnings = [];
        for (const entry of entries) {
            learnings.push(...entry.learnings);
        }
        // Also check for a persistent learnings file
        const learningsPath = join(this.basePath, "..", "memory", "learnings.md");
        if (existsSync(learningsPath)) {
            try {
                const content = readFileSync(learningsPath, "utf-8");
                const parsed = this.parseLearningsFile(content);
                learnings.push(...parsed);
            }
            catch {
                // Ignore
            }
        }
        return [...new Set(learnings)]; // Dedupe
    }
    /**
     * Add a new learning
     */
    addLearning(learning) {
        const learningsPath = join(this.basePath, "..", "memory", "learnings.md");
        const dir = dirname(learningsPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        const existing = existsSync(learningsPath)
            ? readFileSync(learningsPath, "utf-8")
            : "";
        const entry = `\n- [${new Date().toISOString()}] ${learning}`;
        writeFileSync(learningsPath, existing + entry, "utf-8");
    }
    // ============================================================================
    // Subagent Status Operations
    // ============================================================================
    /**
     * Update subagent status
     */
    updateSubagentStatus(agentId, agentType, status, progress) {
        const statusPath = join(this.basePath, "active/subagent-status", `${agentId}.json`);
        const data = {
            agentId,
            agentType,
            status,
            progress,
            updatedAt: new Date().toISOString(),
            sessionId: this.currentSessionId,
        };
        writeFileSync(statusPath, JSON.stringify(data, null, 2), "utf-8");
    }
    /**
     * Get all active subagent statuses
     */
    getActiveSubagents() {
        const statusDir = join(this.basePath, "active/subagent-status");
        if (!existsSync(statusDir)) {
            return [];
        }
        const files = readdirSync(statusDir).filter((f) => f.endsWith(".json"));
        const subagents = [];
        for (const file of files) {
            try {
                const content = readFileSync(join(statusDir, file), "utf-8");
                const data = JSON.parse(content);
                if (data.sessionId === this.currentSessionId) {
                    subagents.push({
                        agentId: data.agentId,
                        agentType: data.agentType,
                        status: data.status,
                        progress: data.progress,
                    });
                }
            }
            catch {
                // Ignore invalid files
            }
        }
        return subagents;
    }
    /**
     * Clear subagent status
     */
    clearSubagentStatus(agentId) {
        const statusPath = join(this.basePath, "active/subagent-status", `${agentId}.json`);
        if (existsSync(statusPath)) {
            execSync(`rm "${statusPath}"`);
        }
    }
    // ============================================================================
    // Formatting & Parsing
    // ============================================================================
    formatEntry(entry) {
        const lines = [
            `## ${entry.agentType} @ ${entry.timestamp.toISOString()}`,
            "",
            "### Status",
            `[${entry.status.toUpperCase()}]`,
            "",
            "### Work Performed",
            ...entry.workPerformed.map((w) => `- ${w}`),
            "",
            "### Learnings",
            ...entry.learnings.map((l) => `- ${l}`),
            "",
            "### Next Steps",
            ...entry.nextSteps.map((n) => `- ${n}`),
            "",
            "### Artifacts",
            ...entry.artifacts.map((a) => `- ${a}`),
            "",
            "---",
            "",
        ];
        return lines.join("\n");
    }
    formatDecision(decision) {
        const timestamp = decision.timestamp || new Date();
        const lines = [
            `## ${decision.action.toUpperCase()} @ ${timestamp.toISOString()}`,
            "",
            `**Reason:** ${decision.reason}`,
            "",
        ];
        if (decision.agentId) {
            lines.push(`**Agent:** ${decision.agentId}`);
        }
        if (decision.model) {
            lines.push(`**Model:** ${decision.model.provider}/${decision.model.model}`);
        }
        if (decision.details) {
            lines.push("", "**Details:**", "```json", JSON.stringify(decision.details, null, 2), "```");
        }
        lines.push("", "---\n");
        return lines.join("\n");
    }
    serializeSharedMemory(entries) {
        return entries.map((e) => this.formatEntry(e)).join("\n");
    }
    parseSharedMemory(content) {
        const entries = [];
        const sections = content.split(/^## /m).filter(Boolean);
        for (const section of sections) {
            try {
                const entry = this.parseEntry(section);
                if (entry) {
                    entries.push(entry);
                }
            }
            catch {
                // Skip malformed sections
            }
        }
        return entries;
    }
    parseEntry(section) {
        const lines = section.split("\n");
        if (lines.length < 2)
            return null;
        // Parse header: "AgentType @ ISO timestamp"
        const headerMatch = lines[0].match(/^(.+?) @ (.+)$/);
        if (!headerMatch)
            return null;
        const [, agentType, timestamp] = headerMatch;
        const entry = {
            agentId: agentType, // Will be overwritten with real ID
            agentType: agentType,
            timestamp: new Date(timestamp),
            status: "running",
            workPerformed: [],
            learnings: [],
            nextSteps: [],
            artifacts: [],
        };
        // Parse sections
        let currentSection = "";
        for (const line of lines.slice(1)) {
            const trimmed = line.trim();
            if (trimmed.startsWith("### ")) {
                currentSection = trimmed.replace("### ", "").toLowerCase();
            }
            else if (trimmed.startsWith("- ") && currentSection) {
                const value = trimmed.replace("- ", "");
                if (currentSection === "work performed") {
                    entry.workPerformed.push(value);
                }
                else if (currentSection === "learnings") {
                    entry.learnings.push(value);
                }
                else if (currentSection === "next steps") {
                    entry.nextSteps.push(value);
                }
                else if (currentSection === "artifacts") {
                    entry.artifacts.push(value);
                }
                else if (currentSection === "status") {
                    entry.status = value.replace(/[\[\]]/g, "").toLowerCase();
                }
            }
        }
        return entry;
    }
    parseDecisionLog(content) {
        const decisions = [];
        const sections = content.split(/^## /m).filter(Boolean);
        for (const section of sections) {
            try {
                const lines = section.split("\n");
                if (lines.length < 2)
                    continue;
                const actionMatch = lines[0].match(/^(.+?) @ (.+)$/);
                if (!actionMatch)
                    continue;
                const [, action, timestamp] = actionMatch;
                const decision = {
                    action: action.toLowerCase(),
                    timestamp: new Date(timestamp),
                    reason: "",
                };
                for (const line of lines) {
                    if (line.startsWith("**Reason:**")) {
                        decision.reason = line.replace("**Reason:**", "").trim();
                    }
                    if (line.startsWith("**Agent:**")) {
                        decision.agentId = line.replace("**Agent:**", "").trim();
                    }
                    if (line.startsWith("**Model:**")) {
                        const modelStr = line.replace("**Model:**", "").trim();
                        const [provider, model] = modelStr.split("/");
                        decision.model = { provider, model };
                    }
                }
                decisions.push(decision);
            }
            catch {
                // Skip malformed entries
            }
        }
        return decisions;
    }
    parseLearningsFile(content) {
        const learnings = [];
        const lines = content.split("\n");
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("- [")) {
                const match = trimmed.match(/^\- \[.+\] (.+)$/);
                if (match) {
                    learnings.push(match[1]);
                }
            }
        }
        return learnings;
    }
    // ============================================================================
    // Session Management
    // ============================================================================
    getSessionId() {
        return this.currentSessionId;
    }
    /**
     * Clear all active session data
     */
    clearSession() {
        // Clear shared memory
        this.clearSharedMemory();
        // Clear decision log
        const decisionPath = join(this.basePath, "active/decision-log.md");
        if (existsSync(decisionPath)) {
            writeFileSync(decisionPath, "", "utf-8");
        }
        // Clear subagent statuses
        const statusDir = join(this.basePath, "active/subagent-status");
        if (existsSync(statusDir)) {
            const files = readdirSync(statusDir);
            for (const file of files) {
                execSync(`rm "${join(statusDir, file)}"`);
            }
        }
    }
    /**
     * Archive current session to history
     */
    archiveSession() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const archiveDir = join(this.basePath, "history", timestamp);
        mkdirSync(archiveDir, { recursive: true });
        // Archive shared memory
        const memoryPath = join(this.basePath, "active/shared-memory.md");
        if (existsSync(memoryPath)) {
            execSync(`cp "${memoryPath}" "${join(archiveDir, "shared-memory.md")}"`);
        }
        // Archive decision log
        const decisionPath = join(this.basePath, "active/decision-log.md");
        if (existsSync(decisionPath)) {
            execSync(`cp "${decisionPath}" "${join(archiveDir, "decision-log.md")}"`);
        }
        // Archive boulder if exists
        const boulderPath = join(this.basePath, "boulder.json");
        if (existsSync(boulderPath)) {
            execSync(`cp "${boulderPath}" "${join(archiveDir, "boulder.json")}"`);
        }
    }
}
// ============================================================================
// Convenience Functions
// ============================================================================
export function createSharedMemory(basePath) {
    return new SharedMemory(basePath);
}
export default SharedMemory;
//# sourceMappingURL=memory.js.map