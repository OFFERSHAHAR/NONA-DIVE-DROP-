# Test Coverage Guide for DIVE DROP

This guide outlines the comprehensive test coverage setup for DIVE DROP Next.js 16 app with Vitest.

## Test Structure Overview

```
src/__tests__/
├── lib/
│   ├── schemas.test.ts           # Zod schema validation tests
│   ├── rental-utils.test.ts      # Rental calculation utilities
│   └── auth.test.ts              # Auth utility functions
├── api/
│   ├── auth.integration.test.ts  # Auth endpoint integration tests
│   ├── rental.integration.test.ts# Rental API integration tests
│   └── admin.integration.test.ts # Admin API integration tests
└── e2e/
    ├── auth.e2e.test.ts          # Auth flow E2E tests
    └── admin-workflows.e2e.test.ts# Admin workflow E2E tests
```

## Coverage Targets

### Critical Paths (80%+ coverage target)

1. **Authentication Module** (`src/lib/auth/`)
   - User registration with validation
   - Login and session management
   - Password reset and security
   - Admin authorization checks

2. **Equipment Rental** (`src/lib/equipment/`, `src/lib/rentals/`)
   - Equipment creation and listing
   - Rental date validation
   - Financial calculations (commission, deposits, insurance)
   - Damage reports and equipment status updates

3. **Admin Features** (`src/lib/admin/`, `src/app/api/admin/`)
   - User management and moderation
   - Instructor verification workflows
   - Equipment and rental auditing
   - Audit logging

### Current Test Coverage

Run coverage report:
```bash
npm run test:coverage
```

## Running Tests

### Unit Tests (Fast, Local)
```bash
# Run all unit tests
npm run test

# Run with UI dashboard
npm run test:ui

# Run specific test file
npm run test -- src/__tests__/lib/schemas.test.ts

# Run tests in watch mode
npm run test -- --watch

# Run with coverage
npm run test:coverage
```

### Integration Tests
```bash
# Run integration tests only
npm run test -- src/__tests__/api

# With coverage report
npm run test:coverage -- src/__tests__/api
```

### E2E Tests (Requires running server)
```bash
# Install Playwright dependencies (first time only)
npx playwright install

# Run E2E tests
npx playwright test

# Run specific E2E test file
npx playwright test src/__tests__/e2e/auth.e2e.test.ts

# Run with UI
npx playwright test --ui

# Debug mode (opens browser inspector)
npx playwright test --debug

# Run on specific browser
npx playwright test --project=chromium
```

## Test Files Reference

### 1. **schemas.test.ts** - Zod Schema Validation
Tests all validation schemas for:
- User registration and login
- Equipment creation and updates
- Damage reports and problematic users
- Rental filters and queries

**Key test cases:**
- Valid input acceptance
- Invalid input rejection
- Enum validation
- Range validation (ratings, prices)
- Email and URL validation
- Rental date validation

**Coverage target:** 95%+

### 2. **rental-utils.test.ts** - Rental Calculations
Tests financial and date utilities:
- `calculateRentalDays()` - Date duration calculations
- `calculateRentalFinancials()` - Cost breakdown calculations
- `validateRentalDates()` - Date validation

**Key test cases:**
- Single day and multi-day rentals
- Commission calculations (various rates)
- Deposit inclusion
- Insurance costs
- Net-to-lister calculations
- Floating point precision

**Coverage target:** 95%+

### 3. **auth.integration.test.ts** - Auth API Integration
Tests complete auth flows with mocked Supabase:
- User registration with validation
- Login with error handling
- Logout and session clearing
- Current user retrieval

**Key test cases:**
- Successful registration and login
- Password mismatch detection
- Weak password rejection
- Supabase error handling
- Network error handling

**Coverage target:** 85%+

### 4. **auth.e2e.test.ts** - Auth Flow E2E
Tests real user interactions in the browser:
- Registration flow and validation
- Login flow and redirects
- Session persistence
- Logout functionality
- Protected page access
- Admin authorization

**Key test cases:**
- Form submission and validation
- Error message display
- Redirect verification
- Network error handling
- Form accessibility

### 5. **admin-workflows.e2e.test.ts** - Admin Operations
Tests complete admin workflows:
- Dashboard navigation
- User management and search
- Instructor verification approval/rejection
- Equipment status management
- Audit log viewing

**Key test cases:**
- List pagination and filtering
- Details view access
- Status updates
- Credential verification
- Search functionality
- Export/download features

## Coverage Thresholds

Configured in `vitest.config.ts`:

```typescript
thresholds: {
  lines: 70,      // 70% of lines must be covered
  functions: 70,  // 70% of functions must be covered
  branches: 60,   // 60% of branches must be covered (hard)
  statements: 70, // 70% of statements must be covered
}
```

**Critical modules** (checked strictly):
- `src/lib/auth/**` - 85%+
- `src/lib/equipment/**` - 80%+
- `src/lib/rentals/**` - 85%+
- `src/app/api/admin/**` - 75%+

## Pre-Commit Test Hooks

Set up automatic testing before commits:

### Manual Setup
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

# Run fast unit tests only
npm run test -- --run --bail || exit 1

echo "✅ Tests passed!"
EOF

chmod +x .husky/pre-commit
```

### What Gets Tested
- Unit tests for modified files
- Schema validation tests
- Critical path coverage

### Skip Pre-Commit Tests
```bash
git commit --no-verify  # Use with caution!
```

## Coverage Reports

### View HTML Report
```bash
npm run test:coverage
# Open coverage/index.html in browser
```

### Metrics Explained
- **Lines**: Percentage of executable code lines tested
- **Functions**: Percentage of functions/methods tested
- **Branches**: Percentage of conditional branches tested
- **Statements**: Percentage of statements executed

### Improve Coverage

1. **Identify gaps:**
   ```bash
   npm run test:coverage
   # Look for red/pink lines in coverage/index.html
   ```

2. **Write tests for uncovered code:**
   - Add tests to `src/__tests__/lib/*.test.ts`
   - Add API tests to `src/__tests__/api/*.test.ts`

3. **Verify coverage improved:**
   ```bash
   npm run test:coverage
   ```

## Test Best Practices

### Do's
- ✅ Write tests for critical business logic
- ✅ Use descriptive test names
- ✅ Group related tests with `describe()`
- ✅ Test both happy path and error cases
- ✅ Mock external dependencies (Supabase, etc.)
- ✅ Use custom matchers from setup.ts
- ✅ Keep tests focused and isolated

### Don'ts
- ❌ Don't test framework code (Next.js, React)
- ❌ Don't hardcode values, use constants
- ❌ Don't make real API calls in unit tests
- ❌ Don't create test interdependencies
- ❌ Don't test implementation details

## Custom Test Utilities

Available in setup.ts:

```typescript
// Custom matchers
expect(uuid).toBeValidUUID();
expect(email).toBeValidEmail();
expect(number).toBeWithinRange(min, max);

// Mock Supabase (auto-mocked)
// Mock Next.js utilities (auto-mocked)
```

## Debugging Tests

### Run Single Test
```bash
npm run test -- --reporter=verbose src/__tests__/lib/schemas.test.ts -t "registerSchema"
```

### Debug in Browser (E2E)
```bash
npx playwright test --debug
```

### View Test Output
```bash
npm run test -- --reporter=verbose
```

### Slow Test Analysis
```bash
npm run test -- --reporter=verbose --reporter=json > test-results.json
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
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
```

## Common Issues

### Issue: Tests timeout
**Solution:** Increase timeout in vitest.config.ts
```typescript
test: {
  testTimeout: 60000,  // 60 seconds
}
```

### Issue: Mock not working
**Solution:** Import vi mock at top of test file
```typescript
import { vi } from 'vitest';
vi.mock('@/lib/...');
```

### Issue: Coverage not showing
**Solution:** Ensure coverage config in vitest.config.ts
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'html'],
}
```

## Resources

- [Vitest Documentation](https://vitest.dev)
- [Playwright Testing Guide](https://playwright.dev/docs/intro)
- [Testing Library Best Practices](https://testing-library.com/docs)
- [Zod Validation](https://zod.dev)

## Next Steps

1. **Run tests:** `npm run test`
2. **Check coverage:** `npm run test:coverage`
3. **View HTML report:** Open `coverage/index.html`
4. **Add more tests:** Follow the patterns in existing test files
5. **Set up pre-commit hooks:** Follow "Pre-Commit Test Hooks" section
6. **Integrate with CI/CD:** Add GitHub Actions workflow

## Support

For questions or issues:
1. Check test output: `npm run test -- --reporter=verbose`
2. View coverage gaps: `npm run test:coverage`
3. Review test patterns in existing files
4. Consult [Vitest docs](https://vitest.dev) for framework questions
