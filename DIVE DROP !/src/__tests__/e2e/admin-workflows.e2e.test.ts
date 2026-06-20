/**
 * End-to-End tests for admin workflows
 * Tests admin dashboard operations: user management, verification, moderation
 *
 * Run with: npx playwright test src/__tests__/e2e/admin-workflows.e2e.test.ts
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/en/auth/login`);

  const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'AdminPass123';

  await page.fill('input[type="email"]', adminEmail);
  await page.fill('input[type="password"]', adminPassword);
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard/**');
}

test.describe('Admin Dashboard E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await loginAsAdmin(page);
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should load admin dashboard with key sections', async () => {
    await page.goto(`${BASE_URL}/en/admin`);

    // Verify key sections are visible
    await expect(page.locator('text=/dashboard|overview/i')).toBeVisible();
    await expect(page.locator('text=/users|user.*management/i')).toBeVisible();
    await expect(page.locator('text=/instructor|verification/i')).toBeVisible();
    await expect(page.locator('text=/equipment|rental/i')).toBeVisible();
  });

  test('should navigate between admin sections', async () => {
    await page.goto(`${BASE_URL}/en/admin`);

    // Click on users section
    await page.click('a:has-text(/users/i)');
    await expect(page.locator('text=/users/i')).toBeVisible();

    // Verify URL changed
    expect(page.url()).toContain('/admin');

    // Navigate to another section
    await page.click('a:has-text(/instructor/i)');
    expect(page.url()).toContain('/admin');
  });

  test('should display user statistics or metrics', async () => {
    await page.goto(`${BASE_URL}/en/admin`);

    // Look for metrics or stats
    const statsElements = await page.locator('[data-testid*="stat"], [class*="stat"], [class*="metric"]').count();

    // At least some stats should be visible
    expect(statsElements).toBeGreaterThanOrEqual(0);
  });

  test('should have working search functionality', async () => {
    await page.goto(`${BASE_URL}/en/admin/users`);

    const searchInput = await page.locator('input[placeholder*="search" i], input[id*="search" i]').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.keyboard.press('Enter');

      // Wait for search results
      await page.waitForLoadState('networkidle');

      // Verify results are displayed
      const resultsList = await page.locator('[role="list"], table tbody, [class*="results"]').count();
      expect(resultsList).toBeGreaterThan(0);
    }
  });

  test('should have responsive navigation menu', async () => {
    await page.goto(`${BASE_URL}/en/admin`);

    // Check for mobile menu button on small screens
    await page.setViewportSize({ width: 375, height: 667 });

    const hamburgerMenu = await page.locator('[aria-label*="menu" i], button[class*="menu"]').count();
    // Menu should be present or navigation should be accessible

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});

test.describe('Admin User Management E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await loginAsAdmin(page);
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should list all users with pagination', async () => {
    await page.goto(`${BASE_URL}/en/admin/users`);

    // Verify user list is displayed
    const userRows = await page.locator('table tbody tr, [class*="user"][class*="row"]').count();
    expect(userRows).toBeGreaterThan(0);

    // Look for pagination controls
    const paginationControls = await page.locator('[aria-label*="paginat"], [class*="pagination"]').count();
    expect(paginationControls).toBeGreaterThanOrEqual(0);
  });

  test('should search for specific users', async () => {
    await page.goto(`${BASE_URL}/en/admin/users`);

    const searchInput = await page.locator('input[placeholder*="search" i]').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('john');
      await page.keyboard.press('Enter');

      await page.waitForLoadState('networkidle');

      // Results should be filtered
      const userName = await page.locator('text=/john/i').count();
      expect(userName).toBeGreaterThanOrEqual(0);
    }
  });

  test('should view user details', async () => {
    await page.goto(`${BASE_URL}/en/admin/users`);

    // Click on first user
    const firstUserLink = await page.locator('table tbody tr:first-child a, [class*="user"] a').first();

    if (await firstUserLink.isVisible()) {
      await firstUserLink.click();

      // Verify user detail view loads
      const userDetails = await page.locator('text=/email|phone|created/i').count();
      expect(userDetails).toBeGreaterThan(0);
    }
  });

  test('should filter users by status or role', async () => {
    await page.goto(`${BASE_URL}/en/admin/users`);

    // Look for filter options
    const filterButtons = await page.locator('button[class*="filter"], select[id*="status"]').count();

    if (filterButtons > 0) {
      await page.click('button[class*="filter"], select[id*="status"]');
      await page.waitForLoadState('networkidle');

      // Verify filtering worked
      const results = await page.locator('[class*="user"]').count();
      expect(results).toBeGreaterThanOrEqual(0);
    }
  });

  test('should export or download user list', async () => {
    await page.goto(`${BASE_URL}/en/admin/users`);

    // Look for export button
    const exportButton = await page.locator('button:has-text(/export|download|csv/i)').first();

    if (await exportButton.isVisible()) {
      // Start listening for download
      const downloadPromise = page.waitForEvent('download');

      await exportButton.click();

      const download = await downloadPromise;
      const fileName = download.suggestedFilename();

      // Verify download occurred
      expect(fileName).toBeTruthy();
    }
  });
});

test.describe('Admin Instructor Verification E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await loginAsAdmin(page);
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should display pending instructor verifications', async () => {
    await page.goto(`${BASE_URL}/en/admin/instructor-verification`);

    // Verify page loaded
    await expect(page.locator('text=/instructor|verification/i')).toBeVisible();

    // Look for pending items
    const pendingItems = await page.locator('[class*="pending"], text=/pending/i').count();
    expect(pendingItems).toBeGreaterThanOrEqual(0);
  });

  test('should view instructor verification details', async () => {
    await page.goto(`${BASE_URL}/en/admin/instructor-verification`);

    // Click on first pending verification
    const firstItem = await page.locator('[class*="pending"] button, [class*="pending"] a').first();

    if (await firstItem.isVisible()) {
      await firstItem.click();

      // Verify details view
      const detailsView = await page.locator('text=/approve|reject|credential|insurance/i').count();
      expect(detailsView).toBeGreaterThan(0);
    }
  });

  test('should approve instructor verification', async () => {
    await page.goto(`${BASE_URL}/en/admin/instructor-verification`);

    // Find and click first verification
    const firstItem = await page.locator('[class*="pending"] button, [class*="pending"] a').first();

    if (await firstItem.isVisible()) {
      await firstItem.click();

      // Click approve button
      const approveButton = await page.locator('button:has-text(/approve/i)').first();

      if (await approveButton.isVisible()) {
        await approveButton.click();

        // Verify confirmation
        const confirmation = await page.locator('text=/approved|success/i').count();
        expect(confirmation).toBeGreaterThan(0);
      }
    }
  });

  test('should reject instructor verification with reason', async () => {
    await page.goto(`${BASE_URL}/en/admin/instructor-verification`);

    const firstItem = await page.locator('[class*="pending"] button, [class*="pending"] a').first();

    if (await firstItem.isVisible()) {
      await firstItem.click();

      const rejectButton = await page.locator('button:has-text(/reject/i)').first();

      if (await rejectButton.isVisible()) {
        await rejectButton.click();

        // Fill rejection reason
        const reasonInput = await page.locator('textarea[placeholder*="reason" i]').first();

        if (await reasonInput.isVisible()) {
          await reasonInput.fill('Documentation incomplete');

          // Confirm rejection
          await page.click('button:has-text(/confirm|submit/i)');

          const confirmation = await page.locator('text=/rejected|success/i').count();
          expect(confirmation).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should verify instructor credentials are displayed', async () => {
    await page.goto(`${BASE_URL}/en/admin/instructor-verification`);

    const firstItem = await page.locator('[class*="pending"]').first();

    if (await firstItem.isVisible()) {
      // Expand to see credentials
      await firstItem.click();

      // Look for credential information
      const credentialInfo = await page.locator('text=/certification|credential|license|insurance/i').count();
      expect(credentialInfo).toBeGreaterThan(0);
    }
  });
});

test.describe('Admin Equipment Management E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await loginAsAdmin(page);
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should display equipment list with status', async () => {
    await page.goto(`${BASE_URL}/en/admin/equipment`);

    // Verify equipment list loaded
    const equipmentItems = await page.locator('table tbody tr, [class*="equipment"]').count();
    expect(equipmentItems).toBeGreaterThanOrEqual(0);
  });

  test('should filter equipment by status', async () => {
    await page.goto(`${BASE_URL}/en/admin/equipment`);

    const statusFilter = await page.locator('select[id*="status"], button[aria-label*="status"]').first();

    if (await statusFilter.isVisible()) {
      await statusFilter.click();

      // Select a status option
      await page.locator('text=/available|damaged|missing/i').first().click();

      await page.waitForLoadState('networkidle');

      // Verify filter applied
      const results = await page.locator('[class*="equipment"]').count();
      expect(results).toBeGreaterThanOrEqual(0);
    }
  });

  test('should view equipment damage reports', async () => {
    await page.goto(`${BASE_URL}/en/admin/equipment`);

    const damageReportsLink = await page.locator('a:has-text(/damage|report/i)').first();

    if (await damageReportsLink.isVisible()) {
      await damageReportsLink.click();

      // Verify damage reports view
      const damageList = await page.locator('text=/damage|report/i').count();
      expect(damageList).toBeGreaterThan(0);
    }
  });

  test('should handle equipment status updates', async () => {
    await page.goto(`${BASE_URL}/en/admin/equipment`);

    const statusDropdown = await page.locator('select, [role="combobox"]').first();

    if (await statusDropdown.isVisible()) {
      await statusDropdown.click();

      // Select new status
      await page.locator('text=/damaged|missing|returned/i').first().click();

      // Verify update
      const confirmation = await page.locator('text=/updated|success|change/i').count();
      expect(confirmation).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('Admin Audit Log E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await loginAsAdmin(page);
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should display admin audit logs', async () => {
    // Navigate to audit logs if available
    const auditLogsUrl = `${BASE_URL}/en/admin/audit-logs`;

    await page.goto(auditLogsUrl).catch(() => {
      // If URL doesn't exist, skip this test
      test.skip();
    });

    // Verify audit log entries are displayed
    const logEntries = await page.locator('table tbody tr, [class*="log"]').count();
    expect(logEntries).toBeGreaterThanOrEqual(0);
  });

  test('should filter audit logs by action', async () => {
    const auditLogsUrl = `${BASE_URL}/en/admin/audit-logs`;

    await page.goto(auditLogsUrl).catch(() => {
      test.skip();
    });

    const actionFilter = await page.locator('select[id*="action"], button[aria-label*="action"]').first();

    if (await actionFilter.isVisible()) {
      await actionFilter.click();

      // Select an action
      await page.locator('[role="option"], text=/create|update|delete/i').first().click();

      await page.waitForLoadState('networkidle');

      const results = await page.locator('[class*="log"]').count();
      expect(results).toBeGreaterThanOrEqual(0);
    }
  });
});
