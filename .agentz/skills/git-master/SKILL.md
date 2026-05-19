# Git Master Skill — Advanced Git Operations

## Purpose
Enables agents to use Git effectively: branching, commits, merges, conflict resolution, history inspection.

## When to Use
- When committing code changes after implementation
- When creating feature branches
- When resolving merge conflicts
- When reviewing git history to understand context

## Commit Best Practices

### Commit Message Format (Conventional Commits)
```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`

**Examples:**
```
feat(auth): add JWT token refresh endpoint
fix(api): handle null response from payment gateway
refactor(users): extract validation to separate module
test(auth): add integration tests for login flow
```

### Atomic Commits
- One logical change per commit
- Build must pass at every commit
- Include tests with the feature, not as a separate commit

## Common Git Workflows

### Feature Branch
```bash
git checkout -b feat/user-authentication
# ... make changes ...
git add -p                     # interactive staging
git commit -m "feat(auth): add login endpoint"
git push origin feat/user-authentication
```

### Check What Changed
```bash
git diff                       # unstaged changes
git diff --staged              # staged changes
git log --oneline -20          # recent commits
git show HEAD                  # last commit details
git log --follow src/file.ts   # file history
```

### Undo Operations
```bash
git restore src/file.ts        # discard unstaged changes
git restore --staged src/file  # unstage file
git reset --soft HEAD~1        # undo last commit, keep changes
git stash                      # temporarily save changes
git stash pop                  # restore stashed changes
```

### Conflict Resolution
```bash
git merge main
# If conflicts:
git status                     # see conflicted files
# Edit files to resolve <<<< >>>> markers
git add src/resolved.ts
git commit -m "fix: resolve merge conflict with main"
```

## Pre-commit Checklist
1. `git diff --staged` — review all changes
2. Run tests: `npm test`
3. Run lint: `npm run lint`
4. Commit with meaningful message
5. Push and verify CI passes

## Useful Aliases
```bash
git log --oneline --graph --all   # visual branch history
git shortlog -sn                  # commit count by author
git blame src/file.ts             # who wrote each line
```
