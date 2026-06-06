import { exec } from "child_process";
import { promisify } from "util";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const execAsync = promisify(exec);
import type {
  VerificationStatus,
  VerificationCriterion,
  VerificationCriterionStatus,
  Task,
} from "../types/index.js";

// ============================================================================
// Verification Pipeline
// ============================================================================

export class VerificationPipeline {
  private projectRoot: string;
  private results: Map<string, VerificationCriterion> = new Map();

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Run all verification checks for a task
   */
  async verify(task: Task): Promise<VerificationStatus> {
    this.results.clear();

    const checks = await Promise.all([
      this.checkSyntax(task.artifacts),
      this.checkLint(task.artifacts),
      this.checkTests(task.artifacts),
      this.checkSecurity(task.artifacts),
      this.checkBehavior((task.verificationCriteria || []).map((c) => c.description)),
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
  async checkSyntax(files: string[]): Promise<VerificationCriterion[]> {
    const criteria: VerificationCriterion[] = [];

    for (const file of files) {
      const fullPath = join(this.projectRoot, file);
      if (!existsSync(fullPath)) continue;

      const ext = file.split(".").pop()?.toLowerCase();
      const criterion: VerificationCriterion = {
        id: `syntax-${file}`,
        description: `Syntax check for ${file}`,
        type: "syntax",
        status: "pending",
      };

      try {
        switch (ext) {
          case "ts":
          case "tsx":
            await execAsync(`npx tsc --noEmit --skipLibCheck "${fullPath}"`, {
              cwd: this.projectRoot,
            });
            criterion.status = "passed";
            break;

          case "js":
          case "jsx":
            await execAsync(`node --check "${fullPath}"`, {
              cwd: this.projectRoot,
            });
            criterion.status = "passed";
            break;

          case "py":
            await execAsync(`python -m py_compile "${fullPath}"`, {
              cwd: this.projectRoot,
            });
            criterion.status = "passed";
            break;

          case "rs":
            await execAsync(`rustc --edition 2021 --emit=metadata -o /dev/null "${fullPath}"`, {
              cwd: this.projectRoot,
            });
            criterion.status = "passed";
            break;

          default:
            criterion.status = "skipped";
            criterion.details = "No syntax check available for this file type";
        }
      } catch (error) {
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
  async checkLint(files: string[]): Promise<VerificationCriterion[]> {
    const criteria: VerificationCriterion[] = [];

    const criterion: VerificationCriterion = {
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
        try {
          const { stdout } = await execAsync(`npx eslint ${tsFiles.join(" ")}`, {
            cwd: this.projectRoot,
          });
          if (stdout.includes("0 problems")) {
            criterion.status = "passed";
          } else {
            criterion.status = "failed";
            criterion.details = stdout.substring(0, 500);
          }
        } catch (e) {
          criterion.status = "failed";
          criterion.details = e instanceof Error ? e.message.substring(0, 500) : "ESLint failed";
        }
      } else if (hasPrettier && tsFiles.length > 0) {
        try {
          await execAsync(`npx prettier --check ${tsFiles.join(" ")}`, {
            cwd: this.projectRoot,
          });
          criterion.status = "passed";
        } catch {
          criterion.status = "failed";
          criterion.details = "Prettier formatting issues detected";
        }
      } else if (hasRubocop) {
        const rubyFiles = files.filter((f) => f.endsWith(".rb"));
        if (rubyFiles.length > 0) {
          try {
            await execAsync(`bundle exec rubocop ${rubyFiles.join(" ")}`, {
              cwd: this.projectRoot,
            });
            criterion.status = "passed";
          } catch (e) {
            criterion.status = "failed";
            criterion.details = e instanceof Error ? e.message.substring(0, 500) : "RuboCop failed";
          }
        } else {
          criterion.status = "skipped";
        }
      } else if (hasRustfmt) {
        const rustFiles = files.filter((f) => f.endsWith(".rs"));
        if (rustFiles.length > 0) {
          try {
            await execAsync(`rustfmt --check ${rustFiles.join(" ")}`, {
              cwd: this.projectRoot,
            });
            criterion.status = "passed";
          } catch {
            criterion.status = "failed";
            criterion.details = "rustfmt formatting issues detected";
          }
        } else {
          criterion.status = "skipped";
        }
      } else {
        criterion.status = "skipped";
        criterion.details = "No lint configuration found";
      }
    } catch (error) {
      criterion.status = "failed";
      criterion.details = error instanceof Error ? error.message : "Lint check failed";
    }

    criteria.push(criterion);
    return criteria;
  }

  /**
   * Run tests for modified files
   */
  async checkTests(files: string[]): Promise<VerificationCriterion[]> {
    const criteria: VerificationCriterion[] = [];

    const criterion: VerificationCriterion = {
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
        try {
          const { stdout } = await execAsync(`npx vitest run --reporter=verbose`, {
            cwd: this.projectRoot,
          });
          criterion.status = stdout.includes("passed") ? "passed" : "failed";
          criterion.details = stdout.substring(0, 500);
        } catch (e) {
          criterion.status = "failed";
          criterion.details = e instanceof Error ? e.message.substring(0, 500) : "Vitest failed";
        }
      } else if (hasJest) {
        try {
          const { stdout } = await execAsync(`npx jest`, {
            cwd: this.projectRoot,
          });
          criterion.status = stdout.includes("PASS") ? "passed" : "failed";
          criterion.details = stdout.substring(0, 500);
        } catch (e) {
          criterion.status = "failed";
          criterion.details = e instanceof Error ? e.message.substring(0, 500) : "Jest failed";
        }
      } else if (hasPytest) {
        try {
          const { stdout } = await execAsync(`python -m pytest`, {
            cwd: this.projectRoot,
          });
          criterion.status = stdout.includes("passed") ? "passed" : "failed";
          criterion.details = stdout.substring(0, 500);
        } catch (e) {
          criterion.status = "failed";
          criterion.details = e instanceof Error ? e.message.substring(0, 500) : "pytest failed";
        }
      } else if (hasRustTests) {
        try {
          const { stdout } = await execAsync(`cargo test`, {
            cwd: this.projectRoot,
          });
          criterion.status = stdout.includes("test result: ok") ? "passed" : "failed";
          criterion.details = stdout.substring(0, 500);
        } catch (e) {
          criterion.status = "failed";
          criterion.details = e instanceof Error ? e.message.substring(0, 500) : "Cargo test failed";
        }
      } else {
        criterion.status = "skipped";
        criterion.details = "No test framework configuration found";
      }
    } catch (error) {
      criterion.status = "failed";
      criterion.details = error instanceof Error ? error.message : "Test execution failed";
    }

    criteria.push(criterion);
    return criteria;
  }

  /**
   * Run security scan on files
   */
  async checkSecurity(files: string[]): Promise<VerificationCriterion[]> {
    const criteria: VerificationCriterion[] = [];

    const criterion: VerificationCriterion = {
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
        try {
          await execAsync(`npm audit --audit-level=high`, {
            cwd: this.projectRoot,
          });
          criterion.status = "passed";
          criterion.details = "No high/critical vulnerabilities found";
        } catch {
          criterion.status = "failed";
          criterion.details = "Vulnerabilities detected — run npm audit for details";
        }
      } else if (hasSafety) {
        try {
          await execAsync(`pip safety check --json`, {
            cwd: this.projectRoot,
          });
          criterion.status = "passed";
        } catch {
          criterion.status = "failed";
          criterion.details = "Safety check found issues";
        }
      } else {
        const securityIssues = this.manualSecurityCheck(files);
        if (securityIssues.length === 0) {
          criterion.status = "passed";
          criterion.details = "No obvious security issues detected";
        } else {
          criterion.status = "failed";
          criterion.details = securityIssues.join("\n");
        }
      }
    } catch (error) {
      criterion.status = "failed";
      criterion.details = error instanceof Error ? error.message : "Security check failed";
    }

    criteria.push(criterion);
    return criteria;
  }

  /**
   * Manual security check for common patterns
   */
  private manualSecurityCheck(files: string[]): string[] {
    const issues: string[] = [];
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
        const content = readFileSync(join(this.projectRoot, file), "utf-8");

        for (const { pattern, message } of dangerousPatterns) {
          if (pattern.test(content)) {
            issues.push(`[${file}] ${message}`);
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return issues;
  }

  /**
   * Check behavior against acceptance criteria
   */
  async checkBehavior(
    criteria: string[]
  ): Promise<VerificationCriterion[]> {
    const verificationCriteria: VerificationCriterion[] = [];

    for (const criterionText of criteria) {
      const criterion: VerificationCriterion = {
        id: `behavior-${criterionText.substring(0, 20)}`,
        description: criterionText,
        type: "behavior",
        status: "pending",
        details: "Behavior verification requires running the application",
      };

      // Check if criterion mentions specific files — verify they exist
      const fileMatch = criterionText.match(/`([^`]+)`/);
      if (fileMatch) {
        const filePath = join(this.projectRoot, fileMatch[1]);
        if (!existsSync(filePath)) {
          criterion.status = "failed";
          criterion.details = `Referenced file does not exist: ${fileMatch[1]}`;
        } else {
          criterion.status = "passed";
          criterion.details = `Referenced file exists: ${fileMatch[1]}`;
        }
      }

      verificationCriteria.push(criterion);
    }

    return verificationCriteria;
  }

  /**
   * Auto-fix issues if possible
   */
  async autoFix(criterion: VerificationCriterion): Promise<boolean> {
    if (criterion.type !== "lint" || criterion.status !== "failed") {
      return false;
    }

    try {
      const hasPrettier = existsSync(join(this.projectRoot, ".prettierrc"));
      if (hasPrettier) {
        // Extract file from criterion id
        const fileMatch = criterion.id.match(/^lint-(.+)$/);
        if (fileMatch) {
          await execAsync(`npx prettier --write "${fileMatch[1]}"`, {
            cwd: this.projectRoot,
          });
          return true;
        }
      }
    } catch {
      // Auto-fix failed
    }

    return false;
  }

  /**
   * Calculate overall verification status
   */
  private calculateOverall(criteria: VerificationCriterion[]): "pass" | "fail" | "partial" {
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
  getSummary(): {
    passed: number;
    failed: number;
    skipped: number;
    pending: number;
    overall: "pass" | "fail" | "partial";
  } {
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

export function createVerificationPipeline(
  projectRoot?: string
): VerificationPipeline {
  return new VerificationPipeline(projectRoot);
}

export default VerificationPipeline;