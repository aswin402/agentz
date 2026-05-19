import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
// ============================================================================
// Verification Pipeline
// ============================================================================
export class VerificationPipeline {
    projectRoot;
    results = new Map();
    constructor(projectRoot = process.cwd()) {
        this.projectRoot = projectRoot;
    }
    /**
     * Run all verification checks for a task
     */
    async verify(task) {
        this.results.clear();
        const checks = await Promise.all([
            this.checkSyntax(task.artifacts),
            this.checkLint(task.artifacts),
            this.checkTests(task.artifacts),
            this.checkSecurity(task.artifacts),
        ]);
        const allCriteria = checks.flat();
        for (const criterion of allCriteria) {
            this.results.set(criterion.id, criterion);
        }
        const overall = this.calculateOverall(allCriteria);
        return {
            overall,
            criteria: allCriteria,
            timestamp: new Date(),
        };
    }
    /**
     * Run syntax check on files
     */
    async checkSyntax(files) {
        const criteria = [];
        for (const file of files) {
            const fullPath = join(this.projectRoot, file);
            if (!existsSync(fullPath))
                continue;
            const ext = file.split(".").pop()?.toLowerCase();
            const criterion = {
                id: `syntax-${file}`,
                description: `Syntax check for ${file}`,
                type: "syntax",
                status: "pending",
            };
            try {
                switch (ext) {
                    case "ts":
                    case "tsx":
                        // TypeScript syntax check
                        execSync(`npx tsc --noEmit --skipLibCheck "${fullPath}" 2>&1`, {
                            cwd: this.projectRoot,
                            stdio: "pipe",
                        });
                        criterion.status = "passed";
                        break;
                    case "js":
                    case "jsx":
                        execSync(`node --check "${fullPath}" 2>&1`, {
                            cwd: this.projectRoot,
                            stdio: "pipe",
                        });
                        criterion.status = "passed";
                        break;
                    case "py":
                        execSync(`python -m py_compile "${fullPath}" 2>&1`, {
                            cwd: this.projectRoot,
                            stdio: "pipe",
                        });
                        criterion.status = "passed";
                        break;
                    case "rs":
                        execSync(`rustc --edition 2021 --emit=metadata -o /dev/null "${fullPath}" 2>&1`, {
                            cwd: this.projectRoot,
                            stdio: "pipe",
                        });
                        criterion.status = "passed";
                        break;
                    default:
                        criterion.status = "skipped";
                        criterion.details = "No syntax check available for this file type";
                }
            }
            catch (error) {
                criterion.status = "failed";
                criterion.details =
                    error instanceof Error ? error.message : "Syntax check failed";
            }
            criteria.push(criterion);
        }
        return criteria;
    }
    /**
     * Run lint check on files
     */
    async checkLint(files) {
        const criteria = [];
        const criterion = {
            id: "lint-all",
            description: "Run linting on modified files",
            type: "lint",
            status: "pending",
        };
        // Determine lint tool by checking package.json
        const hasEslint = existsSync(join(this.projectRoot, ".eslintrc.json")) ||
            existsSync(join(this.projectRoot, ".eslintrc.js")) ||
            existsSync(join(this.projectRoot, "eslint.config.js"));
        const hasRubocop = existsSync(join(this.projectRoot, ".rubocop.yml"));
        const hasRustfmt = existsSync(join(this.projectRoot, "rustfmt.toml"));
        const hasPrettier = existsSync(join(this.projectRoot, ".prettierrc")) ||
            existsSync(join(this.projectRoot, ".prettierrc.json"));
        const tsFiles = files.filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
        try {
            if (hasEslint && tsFiles.length > 0) {
                const result = execSync(`npx eslint ${tsFiles.join(" ")} 2>&1`, {
                    cwd: this.projectRoot,
                    stdio: "pipe",
                });
                if (result.toString().includes("0 problems")) {
                    criterion.status = "passed";
                }
                else {
                    criterion.status = "failed";
                    criterion.details = result.toString();
                }
            }
            else if (hasPrettier && tsFiles.length > 0) {
                const unformatted = execSync(`npx prettier --check ${tsFiles.join(" ")} 2>&1`, { cwd: this.projectRoot, stdio: "pipe" });
                criterion.status = "passed";
            }
            else if (hasRubocop) {
                const rubyFiles = files.filter((f) => f.endsWith(".rb"));
                if (rubyFiles.length > 0) {
                    const result = execSync(`bundle exec rubocop ${rubyFiles.join(" ")} 2>&1`, {
                        cwd: this.projectRoot,
                        stdio: "pipe",
                    });
                    criterion.status = "passed";
                }
                else {
                    criterion.status = "skipped";
                }
            }
            else if (hasRustfmt) {
                const rustFiles = files.filter((f) => f.endsWith(".rs"));
                if (rustFiles.length > 0) {
                    execSync(`rustfmt --check ${rustFiles.join(" ")} 2>&1`, {
                        cwd: this.projectRoot,
                        stdio: "pipe",
                    });
                    criterion.status = "passed";
                }
                else {
                    criterion.status = "skipped";
                }
            }
            else {
                criterion.status = "skipped";
                criterion.details = "No lint configuration found";
            }
        }
        catch (error) {
            criterion.status = "failed";
            criterion.details = error instanceof Error ? error.message : "Lint check failed";
        }
        criteria.push(criterion);
        return criteria;
    }
    /**
     * Run tests for modified files
     */
    async checkTests(files) {
        const criteria = [];
        const criterion = {
            id: "tests-all",
            description: "Run tests for modified files",
            type: "tests",
            status: "pending",
        };
        // Check for test frameworks
        const hasVitest = existsSync(join(this.projectRoot, "vitest.config.ts")) ||
            existsSync(join(this.projectRoot, "vitest.config.js"));
        const hasJest = existsSync(join(this.projectRoot, "jest.config.js"));
        const hasPytest = existsSync(join(this.projectRoot, "pytest.ini")) ||
            existsSync(join(this.projectRoot, "pyproject.toml"));
        const hasRustTests = files.some((f) => f.endsWith(".rs"));
        try {
            if (hasVitest) {
                const result = execSync(`npx vitest run --reporter=verbose 2>&1`, {
                    cwd: this.projectRoot,
                    stdio: "pipe",
                });
                criterion.status = result.toString().includes("passed") ? "passed" : "failed";
                criterion.details = result.toString().substring(0, 500);
            }
            else if (hasJest) {
                const result = execSync(`npx jest 2>&1`, {
                    cwd: this.projectRoot,
                    stdio: "pipe",
                });
                criterion.status = result.toString().includes("PASS") ? "passed" : "failed";
                criterion.details = result.toString().substring(0, 500);
            }
            else if (hasPytest) {
                const result = execSync(`python -m pytest 2>&1`, {
                    cwd: this.projectRoot,
                    stdio: "pipe",
                });
                criterion.status = result.toString().includes("passed") ? "passed" : "failed";
                criterion.details = result.toString().substring(0, 500);
            }
            else if (hasRustTests) {
                const result = execSync(`cargo test 2>&1`, {
                    cwd: this.projectRoot,
                    stdio: "pipe",
                });
                criterion.status = result.toString().includes("test result: ok") ? "passed" : "failed";
                criterion.details = result.toString().substring(0, 500);
            }
            else {
                criterion.status = "skipped";
                criterion.details = "No test framework configuration found";
            }
        }
        catch (error) {
            criterion.status = "failed";
            criterion.details = error instanceof Error ? error.message : "Test execution failed";
        }
        criteria.push(criterion);
        return criteria;
    }
    /**
     * Run security scan on files
     */
    async checkSecurity(files) {
        const criteria = [];
        const criterion = {
            id: "security-all",
            description: "Security scan for common vulnerabilities",
            type: "security",
            status: "pending",
        };
        // Check for security tools
        const hasNpmAudit = existsSync(join(this.projectRoot, "package-lock.json"));
        const hasSafety = existsSync(join(this.projectRoot, "requirements.txt")) ||
            existsSync(join(this.projectRoot, "Pipfile"));
        try {
            if (hasNpmAudit) {
                const result = execSync(`npm audit --audit-level=high 2>&1`, {
                    cwd: this.projectRoot,
                    stdio: "pipe",
                });
                // npm audit returns 0 if no high/critical vulnerabilities
                criterion.status = "passed";
                criterion.details = "No high/critical vulnerabilities found";
            }
            else if (hasSafety) {
                const result = execSync(`pip safety check --json 2>&1`, {
                    cwd: this.projectRoot,
                    stdio: "pipe",
                });
                criterion.status = "passed";
            }
            else {
                // Manual security checks for common patterns
                const securityIssues = this.manualSecurityCheck(files);
                if (securityIssues.length === 0) {
                    criterion.status = "passed";
                    criterion.details = "No obvious security issues detected";
                }
                else {
                    criterion.status = "failed";
                    criterion.details = securityIssues.join("\n");
                }
            }
        }
        catch (error) {
            // npm audit returns non-zero if vulnerabilities found
            if (error instanceof Error && error.message.includes("vulnerabilities")) {
                criterion.status = "failed";
                criterion.details = "Vulnerabilities detected - see npm audit output";
            }
            else {
                criterion.status = "failed";
                criterion.details = error instanceof Error ? error.message : "Security check failed";
            }
        }
        criteria.push(criterion);
        return criteria;
    }
    /**
     * Manual security check for common patterns
     */
    manualSecurityCheck(files) {
        const issues = [];
        const dangerousPatterns = [
            { pattern: /eval\s*\(/, message: "Use of eval() detected - potential code injection" },
            { pattern: /dangerouslySetInnerHTML/, message: "Dangerous inner HTML detected - XSS risk" },
            { pattern: /innerHTML\s*=/, message: "Direct innerHTML assignment - XSS risk" },
            { pattern: /password\s*=\s*["'][^"']+["']/i, message: "Hardcoded password detected" },
            { pattern: /api[_-]?key\s*=\s*["'][^"']+["']/i, message: "Hardcoded API key detected" },
            { pattern: /secret\s*=\s*["'][^"']+["']/i, message: "Hardcoded secret detected" },
            { pattern: /SELECT \* FROM/, message: "SELECT * query detected - use explicit columns" },
            { pattern: /exec\s*\(\s*.*\+/, message: "String concatenation in exec() - potential injection" },
        ];
        for (const file of files) {
            if (!file.endsWith(".ts") && !file.endsWith(".js") && !file.endsWith(".py")) {
                continue;
            }
            try {
                const content = execSync(`cat "${join(this.projectRoot, file)}"`, {
                    encoding: "utf-8",
                    stdio: "pipe",
                });
                for (const { pattern, message } of dangerousPatterns) {
                    if (pattern.test(content)) {
                        issues.push(`[${file}] ${message}`);
                    }
                }
            }
            catch {
                // Skip files that can't be read
            }
        }
        return issues;
    }
    /**
     * Check behavior against acceptance criteria
     */
    async checkBehavior(criteria) {
        const verificationCriteria = [];
        for (const criterionText of criteria) {
            const criterion = {
                id: `behavior-${criterionText.substring(0, 20)}`,
                description: criterionText,
                type: "behavior",
                status: "pending",
                details: "Manual verification required",
            };
            // This is a placeholder - actual behavior verification
            // would require more sophisticated analysis
            // For now, mark as pending for manual review
            verificationCriteria.push(criterion);
        }
        return verificationCriteria;
    }
    /**
     * Auto-fix issues if possible
     */
    async autoFix(criterion) {
        if (criterion.type !== "lint" || criterion.status !== "failed") {
            return false;
        }
        try {
            const hasPrettier = existsSync(join(this.projectRoot, ".prettierrc"));
            if (hasPrettier) {
                // Extract file from criterion id
                const fileMatch = criterion.id.match(/^lint-(.+)$/);
                if (fileMatch) {
                    execSync(`npx prettier --write "${fileMatch[1]}" 2>&1`, {
                        cwd: this.projectRoot,
                        stdio: "pipe",
                    });
                    return true;
                }
            }
        }
        catch {
            // Auto-fix failed
        }
        return false;
    }
    /**
     * Calculate overall verification status
     */
    calculateOverall(criteria) {
        if (criteria.length === 0) {
            return "pass";
        }
        const statuses = criteria.map((c) => c.status);
        const passed = statuses.filter((s) => s === "passed").length;
        const failed = statuses.filter((s) => s === "failed").length;
        const total = statuses.length;
        if (failed === 0) {
            return "pass";
        }
        if (passed / total >= 0.5) {
            return "partial";
        }
        return "fail";
    }
    /**
     * Get verification summary
     */
    getSummary() {
        const criteria = Array.from(this.results.values());
        return {
            passed: criteria.filter((c) => c.status === "passed").length,
            failed: criteria.filter((c) => c.status === "failed").length,
            skipped: criteria.filter((c) => c.status === "skipped").length,
            pending: criteria.filter((c) => c.status === "pending").length,
            overall: this.calculateOverall(criteria),
        };
    }
}
// ============================================================================
// Convenience Functions
// ============================================================================
export function createVerificationPipeline(projectRoot) {
    return new VerificationPipeline(projectRoot);
}
export default VerificationPipeline;
//# sourceMappingURL=pipeline.js.map