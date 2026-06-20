# Testing Setup Instructions for DIVE DROP

Complete guide to set up comprehensive test coverage with Vitest and Playwright.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git installed
- Terminal/Command line access

## Step 1: Install Test Dependencies

Add required testing packages:

```bash
npm install --save-dev \
  vitest@^1.6.1 \
  @vitest/ui@^1.6.1 \
  @playwright/test@^1.61.0 \
  happy-dom@^12.10.3 \
  @testing-library/user-event@^14.5.1 \
  @testing-library/dom@^9.3.4
```

Or add to `package.json` devDependencies:

```json
"devDependencies": {
  "vitest": "^1.6.1",
  "@vitest/ui": "^1.6.1",
  "@playwright/test": "^1.61.0",
  "happy-dom": "^12.10.3",
  "@testing-library/user-event": "^14.5.1",
  "@testing-library/dom": "^9.3.4"
}
```

Then run: `npm install`

## Step 2: Update npm Scripts

Update `package.json` scripts section:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage",
  "test:debug": "vitest --inspect-brk --inspect --single-thread",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:debug": "playwright test --debug",
  "test:all": "npm run test -- --run && npm run test:coverage"
}
```

## Step 3: Copy Test Configuration Files

Copy the following files to your project root:

### A. `vitest.config.ts`
Already created - includes:
- Test environment setup (happy-dom)
- Coverage thresholds (70%+ overall)
- Path aliases (@/)
- Setup file configuration

### B. `playwright.config.ts`
Already created - includes:
- E2E test directory configuration
- Multi-browser testing (Chromium, Firefox, WebKit)
- Mobile viewport testing
- Screenshot and video capture on failure
- Base URL and timeout settings

### C. `src/__tests__/setup.ts`
Already created - includes:
- Environment variable mocks
- Next.js and Supabase mocks
- Custom test matchers
- Global test utilities

## Step 4: Copy Test Files

Test files have been created in the following structure:

```
src/__tests__/
├── setup.ts                          # Test configuration
├── lib/
│   ├── schemas.test.ts              # (NEW) Zod validation tests
│   ├── rental-utils.test.ts         # (NEW) Rental calculation tests
│   └── auth.test.ts                 # Auth utilities
├── api/
│   ├── auth.integration.test.ts     # (NEW) Auth endpoint tests
│   ├── rental-endpoints.integration.test.ts  # (NEW) Rental API tests
│   ├── payment-integration.test.ts  # (Existing)
│   └── payment-service.test.ts      # (Existing)
└── e2e/
    ├── auth.e2e.test.ts             # (NEW) Auth flow E2E tests
    └── admin-workflows.e2e.test.ts  # (NEW) Admin workflow E2E tests
```

**Files already created and ready to use:**
1. ✅ `src/__tests__/lib/schemas.test.ts` - 450+ lines
2. ✅ `src/__tests__/lib/rental-utils.test.ts` - 200+ lines
3. ✅ `src/__tests__/api/auth.integration.test.ts` - 250+ lines
4. ✅ `src/__tests__/api/rental-endpoints.integration.test.ts` - 400+ lines
5. ✅ `src/__tests__/e2e/auth.e2e.test.ts` - 300+ lines
6. ✅ `src/__tests__/e2e/admin-workflows.e2e.test.ts` - 500+ lines

## Step 5: Set Up Pre-Commit Hooks (Optional but Recommended)

### Option A: Manual Setup

```bash
# Install husky
npm install husky --save-dev

# Initialize husky
npx husky install

# Create pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🧪 Running pre-commit tests..."
npm run test -- --run --bail

if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Commit aborted."
  exit 1
fi

echo "✅ Tests passed!"
EOF

# Make executable
chmod +x .husky/pre-commit
```

### Option B: Using Git Hooks Directly

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
npm run test -- --run --bail
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

## Step 6: Verify Installation

Run the following commands to verify everything works:

```bash
# Test unit tests
npm run test

# Test with coverage report
npm run test:coverage

# Test E2E (requires server running)
npm run dev &  # Start dev server in background
npm run test:e2e

# View test UI
npm run test:ui
```

## Step 7: Environment Configuration for E2E Tests

Create `.env.local` with test credentials:

```env
# E2E Test Configuration
E2E_BASE_URL=http://localhost:3000

# Test user account (create this first or use existing)
E2E_TEST_EMAIL=test@example.com
E2E_TEST_PASSWORD=TestPass123

# Admin test account (for admin workflow tests)
E2E_ADMIN_EMAIL=admin@example.com
E2E_ADMIN_PASSWORD=AdminPass123
```

## Step 8: Configure IDE (VS Code)

Install extensions for better testing experience:

1. **Vitest** - `vitest.explorer`
   - Adds test explorer sidebar
   - Run tests directly from editor

2. **Playwright Test for VSCode**
   - Better E2E test integration
   - Debug support

Configuration in `.vscode/settings.json`:

```json
{
  "vitest.enable": true,
  "vitest.showTestsPrefixWarning": false,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## Quick Start Commands

```bash
# Run all unit tests (fast)
npm run test

# Run with watch mode
npm run test -- --watch

# Run specific test file
npm run test -- src/__tests__/lib/schemas.test.ts

# Run with coverage
npm run test:coverage

# Run E2E tests (requires server)
npm run test:e2e

# Run with UI dashboard
npm run test:ui

# Debug tests in VS Code
npm run test:debug
```

## Test File Organization

### Unit Tests (src/__tests__/lib/)
- **Purpose:** Test pure functions and utilities
- **Speed:** Very fast (< 1s each)
- **No dependencies:** Everything mocked
- **Focus:** Input validation, calculations, transformations

### Integration Tests (src/__tests__/api/)
- **Purpose:** Test API endpoints and flows
- **Speed:** Fast (1-2s each)
- **External mocked:** Supabase, Next.js utilities
- **Focus:** Request validation, error handling, data processing

### E2E Tests (src/__tests__/e2e/)
- **Purpose:** Test complete user workflows
- **Speed:** Slower (5-10s each)
- **Real browser:** Chromium, Firefox, Safari, Mobile
- **Focus:** User interactions, page flows, navigation

## Coverage Goals

**Overall Target:** 70%+
**Critical Modules:** 80%+

Critical modules:
- `src/lib/auth/**` - Authentication
- `src/lib/equipment/**` - Equipment management
- `src/lib/rentals/**` - Rental calculations
- `src/app/api/admin/**` - Admin features

## Troubleshooting

### Issue: "Cannot find module @/"
**Solution:** Verify alias in vitest.config.ts
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### Issue: "Supabase mock not working"
**Solution:** Add mock to test file top:
```typescript
import { vi } from 'vitest';
vi.mock('@/lib/supabase/server');
```

### Issue: E2E tests timeout
**Solution:** Increase timeout in playwright.config.ts
```typescript
timeout: 60000,  // 60 seconds
```

### Issue: Browser not found for E2E
**Solution:** Install Playwright browsers
```bash
npx playwright install
```

### Issue: Permission denied on git hooks
**Solution:** Make hooks executable
```bash
chmod +x .git/hooks/pre-commit
chmod +x .husky/pre-commit
```

## Next Steps

1. **Run tests:** `npm run test`
2. **View coverage:** `npm run test:coverage` (opens HTML report)
3. **Check admin workflows:** `npm run test:e2e`
4. **Watch for changes:** `npm run test -- --watch`
5. **Set up pre-commit:** Follow Step 5 above

## CI/CD Integration

### GitHub Actions

Add `.github/workflows/test.yml`:

```yaml
name: Tests
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test -- --run
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Documentation References

- [TEST_COVERAGE_GUIDE.md](./TEST_COVERAGE_GUIDE.md) - Detailed testing patterns
- [Vitest Docs](https://vitest.dev) - Testing framework
- [Playwright Docs](https://playwright.dev) - E2E testing
- [Zod Docs](https://zod.dev) - Schema validation

## Summary

You now have:
- ✅ Unit tests for schemas (450+ lines)
- ✅ Unit tests for utilities (200+ lines)
- ✅ Integration tests for auth API (250+ lines)
- ✅ Integration tests for rental endpoints (400+ lines)
- ✅ E2E tests for auth flows (300+ lines)
- ✅ E2E tests for admin workflows (500+ lines)
- ✅ Test configuration and setup
- ✅ Coverage thresholds (70%+ overall)
- ✅ Pre-commit hook templates
- ✅ CI/CD integration guides

**Total test coverage:** 2,000+ lines of tests ready to run!

Run `npm run test` to get started.
