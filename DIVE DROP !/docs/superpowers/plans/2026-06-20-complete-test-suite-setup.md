# Complete Vitest and Playwright Test Suite Setup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up a complete, production-ready test suite with Vitest for unit and integration tests, Playwright for E2E tests, comprehensive coverage tracking (70%+ thresholds), and automated pre-commit test enforcement.

**Architecture:** The test suite is organized in three layers:
1. **Unit tests** (vitest + happy-dom) for schemas, utilities, and business logic
2. **Integration tests** (vitest + mocked APIs) for endpoint and auth flows
3. **E2E tests** (Playwright) for complete user workflows across Chromium, Firefox, WebKit, and mobile browsers

All configurations are centralized in `vitest.config.ts`, `playwright.config.ts`, and `src/__tests__/setup.ts`. The pre-commit hook enforces test pass before commits. Coverage thresholds enforce 70%+ lines/functions/statements and 60%+ branches on all production code.

**Tech Stack:** 
- Vitest ^1.6.1 (unit/integration testing)
- Playwright ^1.61.0 (E2E testing, multi-browser)
- Happy-DOM (lightweight DOM emulation)
- @testing-library/* (utilities for user-centric testing)
- @vitest/ui for interactive test development

## Global Constraints

- **Node version:** ^20
- **TypeScript:** ^5
- **Next.js:** 16.2.9 (breaking changes — read node_modules/next/dist/docs before modifying routes)
- **Coverage minimum:** Lines 70%, Functions 70%, Branches 60%, Statements 70%
- **All test files must:** Use `.test.ts` suffix for unit/integration, `.e2e.test.ts` for E2E
- **E2E tests only** run against http://localhost:3000 (set via E2E_BASE_URL)
- **Pre-commit hook** must block commits with failing tests or coverage shortfalls

---

## Summary of Current State

✅ **Already in place:**
- Test files created (6 files: schemas.test.ts, rental-utils.test.ts, auth.integration.test.ts, rental-endpoints.integration.test.ts, auth.e2e.test.ts, admin-workflows.e2e.test.ts)
- vitest.config.ts with coverage thresholds and setup file reference
- playwright.config.ts with multi-browser configuration
- src/__tests__/setup.ts with mocks, custom matchers, and utilities
- package.json scripts (test, test:ui, test:coverage)

❌ **Missing / needs validation:**
- Pre-commit hook for test enforcement
- Verify all test files have content and pass
- Validate coverage thresholds are enforced
- Ensure package.json has all necessary test scripts
- Confirm playwright config is executable

---

## Tasks

### Task 1: Verify and Complete Vitest Configuration

**Files:**
- Modify: `vitest.config.ts:1-48`
- Reference: `src/__tests__/setup.ts`

**Interfaces:**
- Consumes: None (root config)
- Produces: Global test environment with 70%+ coverage thresholds, happy-dom environment, path aliases

**Details:** The vitest.config.ts is mostly complete but needs validation and potential refinement. Verify:
1. Coverage thresholds are set to Lines 70%, Functions 70%, Branches 60%, Statements 70%
2. Setup file path is correct (`./src/__tests__/setup.ts`)
3. Test patterns include unit, integration, AND exclude e2e tests
4. Happy-dom environment is configured
5. Path aliases (`@` → `./src`) are set
6. HTML coverage reporter is enabled for CI visibility

- [ ] **Step 1: Read current vitest.config.ts**

Run: `cat c:\Users\GamingPC\Desktop\DIVE\ DROP\ !\vitest.config.ts`
Expected: Current file with coverage thresholds visible

- [ ] **Step 2: Verify all thresholds are present**

Check lines 30-36 match these thresholds:
```typescript
thresholds: {
  lines: 70,
  functions: 70,
  branches: 60,
  statements: 70,
},
```

If thresholds differ, update them to match above.

- [ ] **Step 3: Verify setup file reference**

Check line 10: `setupFiles: ['./src/__tests__/setup.ts']`
Expected: Exact path match

If path is wrong, update to `./src/__tests__/setup.ts`

- [ ] **Step 4: Verify exclude patterns**

Check line 14 excludes e2e tests:
```typescript
exclude: ['src/**/*.e2e.test.ts', 'node_modules', 'dist'],
```

Expected: e2e tests explicitly excluded from unit/integration suite

- [ ] **Step 5: Run test command to validate config**

Run: `cd c:\Users\GamingPC\Desktop\DIVE\ DROP\ \! && npm test -- --run 2>&1 | head -50`

Expected output shows:
- "happy-dom" environment initialized
- Test files discovered (schemas.test.ts, rental-utils.test.ts, auth.integration.test.ts, rental-endpoints.integration.test.ts)
- E2E files NOT included in run
- No parsing errors

If errors occur, note them — they will be addressed in later tasks.

- [ ] **Step 6: No changes needed if validation passes**

If vitest.config.ts already matches spec, commit validation:

```bash
git add vitest.config.ts
git commit -m "chore: verify vitest configuration meets 70%+ coverage thresholds"
```

---

### Task 2: Verify and Complete Playwright Configuration

**Files:**
- Modify: `playwright.config.ts:1-74`

**Interfaces:**
- Consumes: None (root config)
- Produces: E2E test environment with Chrome, Firefox, WebKit, mobile viewports; trace/screenshot/video on failure

**Details:** The playwright.config.ts is mostly complete but needs validation. Verify:
1. Test directory and pattern point to `src/__tests__/e2e` and `**/*.e2e.test.ts`
2. Multi-browser projects cover Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
3. Screenshots/video/trace are captured on failure (not all runs — saves storage)
4. Base URL defaults to localhost:3000 with E2E_BASE_URL override
5. Web server auto-starts on `npm run dev`
6. Timeouts are reasonable (60s global, 30s expect)

- [ ] **Step 1: Read current playwright.config.ts**

Run: `cat c:\Users\GamingPC\Desktop\DIVE\ DROP\ !\playwright.config.ts`
Expected: Current multi-browser configuration visible

- [ ] **Step 2: Verify test directory and patterns**

Check lines 11-12:
```typescript
testDir: './src/__tests__/e2e',
testMatch: '**/*.e2e.test.ts',
```

Expected: E2E tests only, excluded from vitest runs

- [ ] **Step 3: Verify multi-browser projects**

Check lines 34-59. Expected browsers:
- Chromium (Desktop Chrome)
- Firefox (Desktop Firefox)
- WebKit (Desktop Safari)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

If any browsers missing, add them using devices from @playwright/test

- [ ] **Step 4: Verify failure capture settings**

Check lines 28-30:
```typescript
trace: 'on-first-retry',
screenshot: 'only-on-failure',
video: 'retain-on-failure',
```

Expected: Captures only on failures to save storage

- [ ] **Step 5: Verify web server configuration**

Check lines 62-67:
```typescript
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120000,
},
```

Expected: Auto-starts dev server, reuses existing unless in CI

- [ ] **Step 6: Verify base URL and timeouts**

Check line 26: `baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000'`
Check line 69: `timeout: 60000,`
Check line 71: `timeout: 30000,` (expect timeout)

Expected: All timeouts present and reasonable

- [ ] **Step 7: No changes needed if validation passes**

If playwright.config.ts already matches spec, commit validation:

```bash
git add playwright.config.ts
git commit -m "chore: verify playwright configuration for multi-browser E2E testing"
```

---

### Task 3: Verify and Complete Setup File (src/__tests__/setup.ts)

**Files:**
- Modify: `src/__tests__/setup.ts:1-124`

**Interfaces:**
- Consumes: Vitest environment (vi, expect, hooks)
- Produces: Mocked Next.js modules, environment variables, custom matchers (toBeValidUUID, toBeValidEmail, toBeWithinRange)

**Details:** The setup.ts file provides global test utilities. Verify:
1. Environment variables are set (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NODE_ENV)
2. Next.js modules are mocked (next/server, next/headers)
3. Custom matchers are defined (toBeValidUUID, toBeValidEmail, toBeWithinRange)
4. Global types are extended for TypeScript support
5. Console errors are suppressed selectively (only for known happy-dom warnings)

- [ ] **Step 1: Read current setup.ts**

Run: `cat c:\Users\GamingPC\Desktop\DIVE\ DROP\ !\src\__tests__\setup.ts`
Expected: Current mocks and custom matchers visible

- [ ] **Step 2: Verify environment variables**

Check lines 9-11:
```typescript
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.NODE_ENV = 'test';
```

Expected: Test environment configured; values are placeholders, not real credentials

- [ ] **Step 3: Verify Next.js module mocks**

Check lines 14-26 (next/server) and 29-46 (next/headers).

Expected:
- NextResponse.json() returns object with json(), status fields
- NextRequest class exists
- cookies() returns mock with getAll, set, delete, get, has
- headers() returns mock with get that returns test values

If any mocks missing, add them.

- [ ] **Step 4: Verify custom matchers**

Check lines 59-91. Expected matchers:
- `toBeValidUUID()` — validates UUID regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- `toBeValidEmail()` — validates email regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- `toBeWithinRange(min, max)` — checks number within range

If matchers missing or incomplete, add them.

- [ ] **Step 5: Verify global type extensions**

Check lines 94-102. Expected:
```typescript
declare global {
  namespace Vi {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidEmail(): R;
      toBeWithinRange(min: number, max: number): R;
    }
  }
}
```

If missing, add the declaration so TypeScript knows about custom matchers.

- [ ] **Step 6: Verify console error suppression**

Check lines 105-121. Expected:
- beforeEach hook wraps console.error
- Suppresses "Not implemented: HTMLFormElement" and "Not implemented: navigation" messages
- Restores original error handler in afterEach

If missing, add selective error suppression.

- [ ] **Step 7: No changes needed if validation passes**

If setup.ts already matches spec, commit validation:

```bash
git add src/__tests__/setup.ts
git commit -m "chore: verify test setup file with mocks and custom matchers"
```

---

### Task 4: Verify Test Files Exist and Have Content

**Files:**
- Verify: `src/__tests__/lib/schemas.test.ts`
- Verify: `src/__tests__/lib/rental-utils.test.ts`
- Verify: `src/__tests__/api/auth.integration.test.ts`
- Verify: `src/__tests__/api/rental-endpoints.integration.test.ts`
- Verify: `src/__tests__/e2e/auth.e2e.test.ts`
- Verify: `src/__tests__/e2e/admin-workflows.e2e.test.ts`

**Interfaces:**
- Consumes: Schemas, utilities, and API implementations from src/lib
- Produces: Test results and coverage data

**Details:** Each test file must exist and contain meaningful test cases. Verify:
1. File exists and is not empty
2. Test structure follows vitest conventions (describe, it, expect)
3. Mocks are set up for external dependencies (Supabase, next/server, etc.)
4. Both positive and negative cases are tested

- [ ] **Step 1: List all test files**

Run: `find c:\Users\GamingPC\Desktop\DIVE\ DROP\ !\src\__tests__ -name "*.test.ts" -type f | sort`

Expected output shows 6 files:
- src/__tests__/api/auth.integration.test.ts
- src/__tests__/api/rental-endpoints.integration.test.ts
- src/__tests__/e2e/admin-workflows.e2e.test.ts
- src/__tests__/e2e/auth.e2e.test.ts
- src/__tests__/lib/rental-utils.test.ts
- src/__tests__/lib/schemas.test.ts

- [ ] **Step 2: Verify schemas.test.ts has content**

Run: `wc -l c:\Users\GamingPC\Desktop\DIVE\ DROP\ !\src\__tests__\lib\schemas.test.ts`

Expected: At least 100 lines (contains auth and equipment schema tests)

- [ ] **Step 3: Verify rental-utils.test.ts has content**

Run: `wc -l c:\Users\GamingPC\Desktop\DIVE\ DROP\ !\src\__tests__\lib\rental-utils.test.ts`

Expected: At least 50 lines (contains utility function tests)

- [ ] **Step 4: Verify auth.integration.test.ts has content**

Run: `wc -l c:\Users\GamingPC\Desktop\DIVE\ DROP\ !\src\__tests__\api\auth.integration.test.ts`

Expected: At least 80 lines (contains signUp, signIn, getCurrentUser, signOut tests with Supabase mocks)

- [ ] **Step 5: Verify rental-endpoints.integration.test.ts has content**

Run: `wc -l c:\Users\GamingPC\Desktop\DIVE\ DROP\ !\src\__tests__\api\rental-endpoints.integration.test.ts`

Expected: At least 80 lines (contains GET/POST/PUT/DELETE endpoint tests)

- [ ] **Step 6: Verify auth.e2e.test.ts has content**

Run: `wc -l c:\Users\GamingPC\Desktop\DIVE\ DROP\ !\src\__tests__\e2e\auth.e2e.test.ts`

Expected: At least 100 lines (contains Playwright register, login, logout flows)

- [ ] **Step 7: Verify admin-workflows.e2e.test.ts has content**

Run: `wc -l c:\Users\GamingPC\Desktop\DIVE\ DROP\ !\src\__tests__\e2e\admin-workflows.e2e.test.ts`

Expected: At least 100 lines (contains Playwright admin dashboard flows)

- [ ] **Step 8: No changes needed if all files exist with content**

If all 6 test files exist with substantial content, commit verification:

```bash
git add src/__tests__/lib/schemas.test.ts src/__tests__/lib/rental-utils.test.ts src/__tests__/api/auth.integration.test.ts src/__tests__/api/rental-endpoints.integration.test.ts src/__tests__/e2e/auth.e2e.test.ts src/__tests__/e2e/admin-workflows.e2e.test.ts
git commit -m "chore: verify all 6 test files exist with content"
```

---

### Task 5: Verify and Update package.json Test Scripts

**Files:**
- Modify: `package.json:5-13`

**Interfaces:**
- Consumes: None (root scripts)
- Produces: npm scripts for test, test:ui, test:coverage, plus new test:integration and test:e2e

**Details:** The package.json already has basic test scripts. Verify and add missing ones:
- `test` — runs unit + integration tests (vitest, excludes e2e)
- `test:ui` — interactive test UI
- `test:coverage` — coverage report with thresholds
- ADD: `test:integration` — integration tests only
- ADD: `test:e2e` — E2E tests only (playwright)
- ADD: `test:e2e:ui` — E2E tests with Playwright UI
- ADD: `test:all` — runs all tests (unit + integration + e2e)

- [ ] **Step 1: Read current package.json scripts section**

Run: `sed -n '5,13p' c:\Users\GamingPC\Desktop\DIVE\ DROP\ !\package.json`

Expected output:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage"
},
```

- [ ] **Step 2: Identify missing scripts**

Check if these exist. If missing, add them:
- `test:integration` — runs integration tests only
- `test:e2e` — runs E2E tests with Playwright
- `test:e2e:ui` — runs E2E tests with UI mode
- `test:all` — runs all tests

- [ ] **Step 3: Update package.json with new scripts**

Edit package.json lines 5-13 to include:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest --run",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage --run",
  "test:integration": "vitest --run --grep integration",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:all": "npm run test && npm run test:e2e"
},
```

Changes:
- Add `--run` to `test` and `test:coverage` to exit after run (not watch)
- Add `test:integration` — filters by "integration" in test names
- Add `test:e2e` — delegates to playwright test
- Add `test:e2e:ui` — Playwright interactive UI
- Add `test:all` — sequential execution

- [ ] **Step 4: Validate updated scripts by running test script**

Run: `cd c:\Users\GamingPC\Desktop\DIVE\ DROP\ \! && npm run test -- --help 2>&1 | head -10`

Expected: vitest help output, confirming test script resolves correctly

- [ ] **Step 5: Commit updated scripts**

```bash
git add package.json
git commit -m "feat: add test:integration, test:e2e, test:e2e:ui, test:all npm scripts"
```

---

### Task 6: Create Pre-Commit Hook for Test Enforcement

**Files:**
- Create: `.git/hooks/pre-commit`
- Create: `.husky/pre-commit` (as fallback if husky is configured)

**Interfaces:**
- Consumes: Test suite (npm test, npm run test:coverage)
- Produces: Hook that blocks commits if tests fail or coverage drops below thresholds

**Details:** A pre-commit hook prevents committing code with failing tests or insufficient coverage. The hook:
1. Runs unit and integration tests (`npm test`)
2. Runs coverage check (`npm run test:coverage`)
3. Blocks commit if either command fails
4. Allows bypass with `git commit --no-verify` (for emergency fixes)

- [ ] **Step 1: Check if git is initialized and hooks directory exists**

Run: `ls -la c:\Users\GamingPC\Desktop\DIVE\ DROP\ !\\.git\\hooks\\`

Expected: Directory exists with sample hooks (pre-commit.sample, etc.)

- [ ] **Step 2: Check if husky is installed (optional)**

Run: `grep -i husky c:\Users\GamingPC\Desktop\DIVE\ DROP\ !\package.json`

If husky is present, skip to Step 4 (husky handles hooks).
If not present, continue to Step 3.

- [ ] **Step 3: Create .git/hooks/pre-commit script**

Create file: `c:\Users\GamingPC\Desktop\DIVE DROP !\\.git\hooks\pre-commit`

Content:
```bash
#!/bin/sh

# Pre-commit hook: run tests and coverage checks
# Blocks commit if tests fail or coverage drops below thresholds

set -e

echo "Running tests before commit..."

# Run unit and integration tests
if ! npm test; then
  echo "❌ Tests failed. Commit blocked."
  exit 1
fi

# Run coverage check
if ! npm run test:coverage; then
  echo "❌ Coverage threshold not met. Commit blocked."
  exit 1
fi

echo "✅ All tests passed and coverage thresholds met."
exit 0
```

- [ ] **Step 4: Make pre-commit hook executable**

Run: `chmod +x c:\Users\GamingPC\Desktop\DIVE\ DROP\ !\\.git\\hooks\\pre-commit`

Expected: No output (permission changed)

- [ ] **Step 5: Test the hook manually**

Run: `c:\Users\GamingPC\Desktop\DIVE\ DROP\ !\\.git\\hooks\\pre-commit`

Expected output:
```
Running tests before commit...
[vitest output showing tests passing]
✅ All tests passed and coverage thresholds met.
```

If tests fail, review test files and fix (separate task).

- [ ] **Step 6: Document hook in project README or CONTRIBUTING.md**

Add to docs (e.g., CONTRIBUTING.md or README.md):

```markdown
## Test Requirements

This project enforces tests at commit time:

1. **Unit & Integration Tests** (`npm test`) — must pass
2. **Coverage Thresholds** — minimum 70% lines/functions, 60% branches
3. **E2E Tests** (`npm run test:e2e`) — must pass before pushing

**Pre-commit Hook:** Automatically runs tests before each commit. Bypass with `--no-verify`:
```bash
git commit --no-verify  # Emergency only
```
```

- [ ] **Step 7: Commit the hook**

The hook itself is not typically committed (it's in .git/hooks which is often in .gitignore).
Instead, document how to set it up:

```bash
git add CONTRIBUTING.md  # or whichever file you documented the hook in
git commit -m "docs: document pre-commit test enforcement"
```

Alternatively, if you want to track the hook in the repo, add it to a `scripts/hooks/` directory and document setup:

```bash
mkdir -p scripts/hooks
cp <hook-content> scripts/hooks/pre-commit
git add scripts/hooks/pre-commit
git commit -m "chore: add pre-commit hook script"
```

Then add to CONTRIBUTING.md:
```markdown
### Setup Pre-Commit Hook

```bash
cp scripts/hooks/pre-commit .git/hooks/
chmod +x .git/hooks/pre-commit
```
```

---

### Task 7: Run Full Test Suite and Verify Coverage

**Files:**
- No new files (validates existing test suite)

**Interfaces:**
- Consumes: All test files, configurations, mocks
- Produces: Test results and coverage report

**Details:** Verify the complete test suite runs successfully and coverage meets thresholds.

- [ ] **Step 1: Run unit and integration tests**

Run: `cd c:\Users\GamingPC\Desktop\DIVE\ DROP\ \! && npm test -- --run 2>&1 | tail -50`

Expected output:
```
✓ src/__tests__/lib/schemas.test.ts (XX tests)
✓ src/__tests__/lib/rental-utils.test.ts (XX tests)
✓ src/__tests__/api/auth.integration.test.ts (XX tests)
✓ src/__tests__/api/rental-endpoints.integration.test.ts (XX tests)

Test Files  4 passed (4)
Tests      100+ passed
Duration   XXXms
```

If any tests fail, note which file and run with verbose output:
```bash
npm test -- --run src/__tests__/lib/schemas.test.ts
```

Fix test file or implementation before proceeding.

- [ ] **Step 2: Run coverage report**

Run: `cd c:\Users\GamingPC\Desktop\DIVE\ DROP\ \! && npm run test:coverage -- --run 2>&1 | tail -80`

Expected output shows coverage table with columns:
- File (or %)
- Lines (target: 70%)
- Functions (target: 70%)
- Branches (target: 60%)
- Statements (target: 70%)

Example:
```
✓ coverage/index.html (static coverage report generated)

------------|---------|---------|---------|---------|
File        | Lines   | Funcs   | Branches| Stmts   |
------------|---------|---------|---------|---------|
All files   | 72.3%   | 71.5%   | 61.2%   | 72.1%   |
src/lib     | 75%     | 74%     | 62%     | 75%     |
------------|---------|---------|---------|---------|
```

If any threshold is below target, identify under-tested files and add tests in a follow-up task.

- [ ] **Step 3: Verify coverage HTML report**

Run: `ls -lh c:\Users\GamingPC\Desktop\DIVE\ DROP\ !\coverage\index.html`

Expected: HTML report file exists (can open in browser to explore coverage)

- [ ] **Step 4: Run E2E tests (optional, requires app running)**

For this task, skip if app not running. E2E tests require:
- Node modules installed
- Next.js dev server running (`npm run dev`)
- Playwright browsers installed

If environment ready:

Run: `cd c:\Users\GamingPC\Desktop\DIVE\ DROP\ \! && npx playwright test --headed 2>&1 | tail -50`

Expected output:
```
Running 10 tests using 5 workers

[chromium] › auth.e2e.test.ts (4 tests)
[firefox] › auth.e2e.test.ts (4 tests)
[webkit] › auth.e2e.test.ts (4 tests)
...

10 passed (5s)
```

If E2E tests fail, note which browser/test and debug separately.

- [ ] **Step 5: Verify pre-commit hook integration**

Test the hook by attempting a commit with a passing test state:

Run: `cd c:\Users\GamingPC\Desktop\DIVE\ DROP\ \! && git commit --allow-empty -m "test: verify pre-commit hook" 2>&1 | head -20`

Expected output:
```
Running tests before commit...
✓ Tests passed
✓ Coverage met
[<branch> <hash>] test: verify pre-commit hook
```

If hook is blocked due to test failure, fix tests first.

- [ ] **Step 6: Document test suite status**

Create or update TEST_SUITE_STATUS.md:

```markdown
# Test Suite Status

## Coverage (as of [DATE])
- Lines: XX%
- Functions: XX%
- Branches: XX%
- Statements: XX%

**Status:** ✅ All thresholds met

## Test Counts
- Unit tests: XX
- Integration tests: XX
- E2E tests: XX
- Total: XX

## Last Update
- Date: [TODAY]
- Commit: [HASH]
- All tests passing: ✅
- Coverage enforced: ✅
- Pre-commit hook active: ✅
```

- [ ] **Step 7: Final commit**

```bash
git add TEST_SUITE_STATUS.md coverage/
git commit -m "chore: document test suite completion and coverage status"
```

---

## Verification Checklist

Before declaring complete, verify:

- [ ] vitest.config.ts has 70%+ coverage thresholds (lines, functions, statements)
- [ ] playwright.config.ts covers 5+ browser/device combinations
- [ ] src/__tests__/setup.ts has mocks, custom matchers, and environment setup
- [ ] All 6 test files exist and have content (100+ lines each)
- [ ] package.json has test, test:ui, test:coverage, test:integration, test:e2e scripts
- [ ] .git/hooks/pre-commit exists and blocks failed tests
- [ ] `npm test` passes with 70%+ coverage
- [ ] `npm run test:e2e` runs 2+ E2E test files
- [ ] Coverage HTML report is generated in coverage/index.html
- [ ] Pre-commit hook prevents commits with failing tests

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-20-complete-test-suite-setup.md`.**

**Two execution options:**

### Option 1: Subagent-Driven (Recommended)
Fresh subagent per task, review between tasks, fast iteration. Recommended for validating complex configurations and debugging test failures.

**Skill:** `superpowers:subagent-driven-development`

### Option 2: Inline Execution
Batch execution with checkpoints for review. Good for quick validation of existing setup.

**Skill:** `superpowers:executing-plans`

**Which approach would you like to use?**
