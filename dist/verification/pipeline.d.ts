import type { VerificationStatus, VerificationCriterion, Task } from "../types/index.js";
export declare class VerificationPipeline {
    private projectRoot;
    private results;
    constructor(projectRoot?: string);
    /**
     * Run all verification checks for a task
     */
    verify(task: Task): Promise<VerificationStatus>;
    /**
     * Run syntax check on files
     */
    checkSyntax(files: string[]): Promise<VerificationCriterion[]>;
    /**
     * Run lint check on files
     */
    checkLint(files: string[]): Promise<VerificationCriterion[]>;
    /**
     * Run tests for modified files
     */
    checkTests(files: string[]): Promise<VerificationCriterion[]>;
    /**
     * Run security scan on files
     */
    checkSecurity(files: string[]): Promise<VerificationCriterion[]>;
    /**
     * Manual security check for common patterns
     */
    private manualSecurityCheck;
    /**
     * Check behavior against acceptance criteria
     */
    checkBehavior(criteria: string[]): Promise<VerificationCriterion[]>;
    /**
     * Auto-fix issues if possible
     */
    autoFix(criterion: VerificationCriterion): Promise<boolean>;
    /**
     * Calculate overall verification status
     */
    private calculateOverall;
    /**
     * Get verification summary
     */
    getSummary(): {
        passed: number;
        failed: number;
        skipped: number;
        pending: number;
        overall: "pass" | "fail" | "partial";
    };
}
export declare function createVerificationPipeline(projectRoot?: string): VerificationPipeline;
export default VerificationPipeline;
//# sourceMappingURL=pipeline.d.ts.map