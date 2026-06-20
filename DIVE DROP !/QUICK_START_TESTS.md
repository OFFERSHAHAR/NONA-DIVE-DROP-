# Quick Start: Running Tests in DIVE DROP

## TL;DR

```bash
# Install dependencies
npm install

# Run all tests
npm run test

# View coverage
npm run test:coverage

# Run E2E tests (needs server)
npm run dev &
npx playwright test
```

---

## Test Commands

### Unit & Integration Tests

```bash
# All tests
npm run test

# Watch mode (auto-rerun on changes)
npm run test -- --watch

# Specific test file
npm run test -- src/__tests__/lib/schemas.test.ts

# With coverage report
npm run test:coverage

# Interactive UI
npm run test:ui

# Debug mode
npm run test:debug
```

### E2E Tests

```bash
# All E2E tests
npx playwright test

# Specific E2E test
npx playwright test src/__tests__/e2e/auth.e2e.test.ts

# With interactive UI
npx playwright test --ui

# Debug mode (opens browser)
npx playwright test --debug

# Specific browser
npx playwright test --project=firefox
```

---

## Test Files (Ready to Run)

### 1. Schema Validation Tests
```bash
npm run test -- src/__tests__/lib/schemas.test.ts
```
Tests: Auth, Equipment, Damage Reports, Filters
Lines: 450+, Cases: 60+

### 2. Rental Calculations
```bash
npm run test -- src/__tests__/lib/rental-utils.test.ts
```
Tests: Day calculations, Financial breakdowns, Date validation
Lines: 200+, Cases: 20+

### 3. Auth API Integration
```bash
npm run test -- src/__tests__/api/auth.integration.test.ts
```
Tests: Registration, Login, Session, Logout, Errors
Lines: 250+, Cases: 15+

### 4. Rental API Integration
```bash
npm run test -- src/__tests__/api/rental-endpoints.integration.test.ts
```
Tests: Requests, Validation, Conflicts, Calculations, Status
Lines: 400+, Cases: 20+

### 5. Auth E2E Workflows
```bash
npx playwright test src/__tests__/e2e/auth.e2e.test.ts
```
Tests: Register, Login, Logout, Sessions, Protected pages
Scenarios: 12, Browsers: 5

### 6. Admin E2E Workflows
```bash
npx playwright test src/__tests__/e2e/admin-workflows.e2e.test.ts
```
Tests: Dashboard, User Mgmt, Verification, Equipment, Audit
Scenarios: 25, Browsers: 5

---

## Coverage Report

```bash
# Generate coverage report
npm run test:coverage

# View in browser
open coverage/index.html
```

**Targets:**
- Lines: 70%+
- Functions: 70%+
- Branches: 60%+
- Statements: 70%+

---

## One-Command Test All

```bash
npm run test -- --run && npm run test:coverage
```

---

## Pre-Commit Hooks (Optional)

```bash
# Install husky
npm install husky --save-dev

# Setup
npx husky install

# Add hook
npx husky add .husky/pre-commit "npm run test -- --run --bail"
```

**Result:** Tests run automatically before each commit

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Playwright not installed | `npx playwright install` |
| Tests timeout | Increase timeout in vitest.config.ts |
| Mock not working | Add `vi.mock()` at top of test file |
| Coverage not showing | Check vitest.config.ts coverage config |
| E2E tests fail | Make sure dev server is running |
| Permission denied on hooks | `chmod +x .husky/pre-commit` |

---

## Test Organization

```
src/__tests__/
├── setup.ts                    # Global config & mocks
├── lib/                        # Unit tests
│   ├── schemas.test.ts         # ✅ 450+ lines
│   └── rental-utils.test.ts    # ✅ 200+ lines
├── api/                        # Integration tests
│   ├── auth.integration.test.ts # ✅ 250+ lines
│   └── rental-endpoints.integration.test.ts # ✅ 400+ lines
└── e2e/                        # End-to-end tests
    ├── auth.e2e.test.ts        # ✅ 300+ lines
    └── admin-workflows.e2e.test.ts # ✅ 500+ lines
```

---

## What's Tested

✅ **Authentication**
- Registration (validation, errors)
- Login (credentials, sessions)
- Logout and cleanup
- Admin authorization

✅ **Equipment Rentals**
- Schema validation
- Date validation
- Cost calculations
- Booking conflicts
- Availability checks
- Status management

✅ **Admin Features**
- User management
- Instructor verification
- Equipment updates
- Damage reviews
- Audit logging

---

## Performance

| Test Type | Speed | Count |
|-----------|-------|-------|
| Unit | < 1s | 80+ |
| Integration | 1-2s | 35+ |
| E2E | 5-10s | 37+ |
| **Total** | ~2-3 min | **150+** |

---

## IDE Support (VS Code)

Install extensions:
1. **Vitest** - vitest.explorer
2. **Playwright Test** - ms-playwright.playwright

Run tests from sidebar!

---

## Next Steps

1. Run tests: `npm run test`
2. Check coverage: `npm run test:coverage`
3. Set up hooks: `npx husky install`
4. Add to CI/CD (see TESTING_SETUP_INSTRUCTIONS.md)
5. Write more tests following existing patterns

---

## Key Files

- **vitest.config.ts** - Unit test configuration
- **playwright.config.ts** - E2E test configuration  
- **src/__tests__/setup.ts** - Global test setup
- **TEST_COVERAGE_GUIDE.md** - Detailed testing guide
- **TESTING_SETUP_INSTRUCTIONS.md** - Installation & setup

---

## Questions?

See full documentation:
- Setup: `TESTING_SETUP_INSTRUCTIONS.md`
- Guide: `TEST_COVERAGE_GUIDE.md`
- Summary: `TEST_AUDIT_SUMMARY.md`

Or check test files directly:
- Examples in `src/__tests__/` directory
- Pattern templates in existing tests

---

**Status:** ✅ All 2,000+ lines of tests ready to run!

Start with: `npm run test`
