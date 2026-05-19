# Playwright Skill — Browser Testing Expert

## Purpose
Enables the tester and coder agents to write, run, and debug Playwright end-to-end tests.

## When to Use
- When the task involves UI testing or browser automation
- When acceptance criteria include "user can click/navigate/see" scenarios
- When writing integration tests for web applications

## Playwright Patterns

### Test File Structure
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/path');
  });

  test('should do something', async ({ page }) => {
    await page.click('button[data-testid="submit"]');
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

### Locator Best Practices
- Prefer `data-testid` attributes: `page.locator('[data-testid="btn"]')`
- Use role-based: `page.getByRole('button', { name: 'Submit' })`
- Avoid CSS class selectors (fragile)
- Use `page.getByText()` for text matching

### Common Patterns

**Wait for network:**
```typescript
await page.waitForLoadState('networkidle');
```

**Fill forms:**
```typescript
await page.getByLabel('Email').fill('test@example.com');
await page.getByLabel('Password').fill('password');
await page.getByRole('button', { name: 'Sign In' }).click();
```

**Assert API response:**
```typescript
const [response] = await Promise.all([
  page.waitForResponse('/api/data'),
  page.click('#trigger'),
]);
expect(response.status()).toBe(200);
```

**Screenshot on failure:**
```typescript
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== 'passed') {
    await page.screenshot({ path: `failure-${testInfo.title}.png` });
  }
});
```

## Setup Commands
```bash
npx playwright install chromium
npx playwright test
npx playwright test --headed   # see browser
npx playwright show-report     # view HTML report
```

## Config Template
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: { command: 'npm run dev', port: 3000 },
});
```
