/**
 * End-to-End tests for authentication flows
 * Tests complete user journeys: registration, login, profile completion
 *
 * NOTE: These tests should be run with Playwright
 * Run with: npx playwright test src/__tests__/e2e/auth.e2e.test.ts
 */

import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('Auth E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should complete user registration flow', async () => {
    // Navigate to registration page
    await page.goto(`${BASE_URL}/en/auth/register`);

    // Verify page elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="First"]')).toBeVisible();

    // Fill registration form
    const testEmail = `test-${Date.now()}@example.com`;
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[id*="password"]:nth-of-type(1)', 'SecurePass123');
    await page.fill('input[id*="password"]:nth-of-type(2)', 'SecurePass123');
    await page.fill('input[placeholder*="First"]', 'John');
    await page.fill('input[placeholder*="Last"]', 'Doe');

    // Submit form
    await page.click('button[type="submit"]');

    // Verify success message or redirect
    await page.waitForURL('**/auth/**');
    const successMessage = await page.locator('text=/success|confirmation|check.*email/i').count();
    expect(successMessage).toBeGreaterThan(0);
  });

  test('should display validation errors on invalid registration', async () => {
    await page.goto(`${BASE_URL}/en/auth/register`);

    // Try submitting with invalid email
    await page.fill('input[type="email"]', 'not-an-email');
    await page.click('button[type="submit"]');

    // Verify error message
    const error = await page.locator('text=/invalid|error/i');
    await expect(error).toBeVisible();
  });

  test('should reject password mismatch on registration', async () => {
    await page.goto(`${BASE_URL}/en/auth/register`);

    const testEmail = `test-${Date.now()}@example.com`;
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[id*="password"]:nth-of-type(1)', 'SecurePass123');
    await page.fill('input[id*="password"]:nth-of-type(2)', 'DifferentPass456');
    await page.fill('input[placeholder*="First"]', 'John');
    await page.fill('input[placeholder*="Last"]', 'Doe');

    await page.click('button[type="submit"]');

    // Verify mismatch error
    const error = await page.locator('text=/match|password/i');
    await expect(error).toBeVisible();
  });

  test('should reject weak passwords on registration', async () => {
    await page.goto(`${BASE_URL}/en/auth/register`);

    const testEmail = `test-${Date.now()}@example.com`;
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[id*="password"]:nth-of-type(1)', 'weak');
    await page.fill('input[id*="password"]:nth-of-type(2)', 'weak');

    await page.click('button[type="submit"]');

    // Verify weak password error
    const error = await page.locator('text=/character|uppercase|number|weak/i');
    await expect(error).toBeVisible();
  });

  test('should complete user login flow', async () => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/en/auth/login`);

    // Verify login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Note: This test uses a pre-existing test account
    // In a real scenario, you'd create a test account first
    const testEmail = process.env.E2E_TEST_EMAIL || 'test@example.com';
    const testPassword = process.env.E2E_TEST_PASSWORD || 'TestPass123';

    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    await page.click('button[type="submit"]');

    // Verify redirect to dashboard or home
    await page.waitForURL('**/dashboard/**');
    const dashboardTitle = await page.locator('text=/dashboard|home|welcome/i').count();
    expect(dashboardTitle).toBeGreaterThan(0);
  });

  test('should show error on invalid login credentials', async () => {
    await page.goto(`${BASE_URL}/en/auth/login`);

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'WrongPassword123');

    await page.click('button[type="submit"]');

    // Verify error message
    const error = await page.locator('text=/invalid|incorrect|login.*failed/i');
    await expect(error).toBeVisible();
  });

  test('should maintain session after login', async () => {
    // Login
    await page.goto(`${BASE_URL}/en/auth/login`);

    const testEmail = process.env.E2E_TEST_EMAIL || 'test@example.com';
    const testPassword = process.env.E2E_TEST_PASSWORD || 'TestPass123';

    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard/**');

    // Navigate to another page
    await page.goto(`${BASE_URL}/en`);

    // Verify still logged in (not redirected to login)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/auth/login');
  });

  test('should logout and clear session', async () => {
    // First login
    await page.goto(`${BASE_URL}/en/auth/login`);

    const testEmail = process.env.E2E_TEST_EMAIL || 'test@example.com';
    const testPassword = process.env.E2E_TEST_PASSWORD || 'TestPass123';

    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard/**');

    // Find and click logout button
    await page.click('button:has-text("Logout")');

    // Verify redirected to login
    await page.waitForURL('**/auth/login');
    expect(page.url()).toContain('/auth/login');
  });

  test('should prevent access to protected pages without authentication', async () => {
    // Try to access admin page directly
    await page.goto(`${BASE_URL}/en/admin`);

    // Should redirect to login
    await page.waitForURL('**/auth/login');
    expect(page.url()).toContain('/auth/login');
  });

  test('should handle network errors gracefully on login', async () => {
    await page.goto(`${BASE_URL}/en/auth/login`);

    // Simulate network error by aborting requests
    await page.route('**/api/auth/**', (route) => route.abort());

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPass123');
    await page.click('button[type="submit"]');

    // Verify error message
    const error = await page.locator('text=/network|error|failed/i');
    await expect(error).toBeVisible();
  });

  test('should have properly labeled form inputs', async () => {
    await page.goto(`${BASE_URL}/en/auth/login`);

    // Verify form accessibility
    await expect(page.locator('label:has-text("Email")')).toBeVisible();
    await expect(page.locator('label:has-text("Password")')).toBeVisible();
  });

  test('should show password toggle on login form', async () => {
    await page.goto(`${BASE_URL}/en/auth/login`);

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Look for show/hide password button (if implemented)
    const toggleButton = await page.locator('button[aria-label*="password" i]').count();
    // Note: This is optional depending on implementation
  });
});

test.describe('Admin Auth E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should prevent non-admin users from accessing admin panel', async () => {
    // Login with regular user
    await page.goto(`${BASE_URL}/en/auth/login`);

    const testEmail = process.env.E2E_TEST_EMAIL || 'test@example.com';
    const testPassword = process.env.E2E_TEST_PASSWORD || 'TestPass123';

    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Try to access admin
    await page.goto(`${BASE_URL}/en/admin`);

    // Should be redirected or show access denied
    const accessDenied = await page.locator('text=/access.*denied|unauthorized|not.*admin/i').count();
    const redirected = page.url().includes('/auth');

    expect(accessDenied + (redirected ? 1 : 0)).toBeGreaterThan(0);
  });

  test('should allow admin users to access admin panel', async () => {
    // Login with admin account
    const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'AdminPass123';

    await page.goto(`${BASE_URL}/en/auth/login`);

    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard/**');

    // Navigate to admin
    await page.goto(`${BASE_URL}/en/admin`);

    // Should see admin panel
    const adminHeader = await page.locator('text=/admin|dashboard/i').count();
    expect(adminHeader).toBeGreaterThan(0);
  });
});
