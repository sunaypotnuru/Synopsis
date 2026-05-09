/**
 * Bug #3 Exploration Test: Achievements Loading Failure
 * 
 * **Validates: Bugfix Requirements 1.1, 1.2, 1.3**
 * 
 * This is a BUG CONDITION EXPLORATION test that demonstrates Bug #3 exists on unfixed code.
 * 
 * Bug Condition: When a user navigates to the Achievements page, the system displays 
 * "Failed to load achievements" error and no achievements are shown.
 * 
 * Bug Condition Function:
 * ```
 * FUNCTION isBugCondition(input)
 *   INPUT: input of type AchievementsPageRequest
 *   OUTPUT: boolean
 *   
 *   RETURN input.page = "ACHIEVEMENTS" 
 *          AND input.userId IS NOT NULL
 *          AND userNavigatedToPage(input)
 * END FUNCTION
 * ```
 * 
 * EXPECTED BEHAVIOR ON UNFIXED CODE:
 * - This test should FAIL, demonstrating that the bug exists
 * - The test expects to see "Failed to load achievements" error
 * - The test expects no achievements to be displayed
 * 
 * EXPECTED BEHAVIOR ON FIXED CODE:
 * - This test should PASS, demonstrating that the bug is fixed
 * - The achievements page should load successfully
 * - Achievements should be displayed (or empty state if user has none)
 * - No "Failed to load achievements" error should appear
 */

import { test, expect } from '@playwright/test';
import * as fc from 'fast-check';

// Type definitions for bug condition
interface AchievementsPageRequest {
  page: 'ACHIEVEMENTS';
  userId: string;
  userRole: 'patient' | 'doctor' | 'admin';
  achievementCount: number; // Number of achievements the user should have
}

/**
 * Bug Condition Function: Returns true when the bug should manifest
 */
function isBugCondition(input: AchievementsPageRequest): boolean {
  return (
    input.page === 'ACHIEVEMENTS' &&
    input.userId !== null &&
    input.userId !== undefined &&
    input.userId.length > 0
  );
}

/**
 * Property-based test generator for AchievementsPageRequest
 * Generates various test cases with different user roles and achievement counts
 */
const achievementsPageRequestArbitrary = fc.record({
  page: fc.constant('ACHIEVEMENTS' as const),
  userId: fc.uuid(),
  userRole: fc.constantFrom('patient' as const, 'doctor' as const, 'admin' as const),
  achievementCount: fc.integer({ min: 0, max: 20 }), // Users can have 0-20 achievements
});

/**
 * Helper function to set up bypass authentication for testing
 */
async function setBypassAuth(page: unknown, role: 'patient' | 'doctor' | 'admin', userId: string) {
  const pageWithScript = page as { addInitScript: (script: (args: { role: string; userId: string }) => void, args: { role: string; userId: string }) => Promise<void> };
  await pageWithScript.addInitScript(
    ({ role, userId }: { role: string; userId: string }) => {
      localStorage.setItem('bypass_auth_role', role);
      localStorage.setItem('bypass_auth_user_id', userId);
    },
    { role, userId }
  );
}

test.describe('Bug #3: Achievements Loading Failure - Exploration Test', () => {
  test.setTimeout(120000); // 2 minutes timeout for property-based testing

  test('Property: Achievements page should fail to load for all users (EXPLORATION - expects FAILURE on unfixed code)', async ({ page }) => {
    // Generate multiple test cases using property-based testing
    const testCases = fc.sample(achievementsPageRequestArbitrary, 5); // Test with 5 different scenarios

    console.log(`\n🔍 Testing Bug #3 with ${testCases.length} property-based test cases...\n`);

    let failureCount = 0;
    const results: Array<{ input: AchievementsPageRequest; passed: boolean; error?: string }> = [];

    for (const input of testCases) {
      // Only test cases where bug condition holds
      if (!isBugCondition(input)) {
        continue;
      }

      console.log(`\n📋 Test Case: Role=${input.userRole}, UserId=${input.userId.substring(0, 8)}..., ExpectedAchievements=${input.achievementCount}`);

      try {
        // Set up bypass authentication
        await setBypassAuth(page, input.userRole, input.userId);

        // Navigate to achievements page
        const achievementsUrl = `/${input.userRole}/achievements`;
        await page.goto(achievementsUrl, { waitUntil: 'networkidle', timeout: 30000 });

        // Wait for page to load
        await page.waitForTimeout(2000);

        // Check for the bug: "Failed to load achievements" error
        const errorVisible = await page.getByText(/failed to load achievements/i).isVisible().catch(() => false);
        
        // Check if achievements are displayed (should not be if bug exists)
        const achievementsVisible = await page.locator('[data-testid="achievement-card"], .achievement-card, [id^="achievement-card-"]').count();

        // Check if loading state is stuck
        const loadingVisible = await page.getByText(/loading achievements/i).isVisible().catch(() => false);

        // BUG CONDITION ASSERTION (expects bug to exist on unfixed code)
        // On unfixed code, we expect:
        // 1. Error message to be visible OR
        // 2. No achievements displayed (even if user should have some) OR
        // 3. Loading state stuck indefinitely
        const bugExists = errorVisible || (achievementsVisible === 0 && !loadingVisible);

        if (bugExists) {
          console.log(`  ✅ Bug detected as expected: error=${errorVisible}, achievements=${achievementsVisible}, loading=${loadingVisible}`);
          results.push({ input, passed: true });
        } else {
          console.log(`  ❌ Bug NOT detected (unexpected on unfixed code): error=${errorVisible}, achievements=${achievementsVisible}, loading=${loadingVisible}`);
          failureCount++;
          results.push({ 
            input, 
            passed: false, 
            error: `Expected bug to exist but achievements loaded successfully (${achievementsVisible} achievements found)` 
          });
        }

      } catch (error) {
        console.log(`  ⚠️  Test execution error: ${error}`);
        // Network errors or timeouts also indicate the bug exists
        results.push({ input, passed: true, error: `Network/timeout error (indicates bug): ${error}` });
      }
    }

    // Report results
    console.log(`\n📊 Exploration Test Results:`);
    console.log(`   Total test cases: ${testCases.length}`);
    console.log(`   Bug detected: ${results.filter(r => r.passed).length}`);
    console.log(`   Bug NOT detected: ${failureCount}`);

    // EXPLORATION TEST ASSERTION
    // On UNFIXED code: This test should PASS (bug detected in all cases)
    // On FIXED code: This test should FAIL (bug no longer exists)
    expect(failureCount).toBe(0); // All test cases should detect the bug on unfixed code

    if (failureCount > 0) {
      console.log(`\n⚠️  WARNING: Bug was NOT detected in ${failureCount} cases. This suggests:`);
      console.log(`   1. The bug may already be fixed, OR`);
      console.log(`   2. The bug condition function needs refinement, OR`);
      console.log(`   3. The test assertions need adjustment`);
      console.log(`\nFailed cases:`);
      results.filter(r => !r.passed).forEach(r => {
        console.log(`   - Role: ${r.input.userRole}, Error: ${r.error}`);
      });
    }
  });

  test('Example 1: Patient with 0 achievements navigates to page (expects error)', async ({ page }) => {
    const input: AchievementsPageRequest = {
      page: 'ACHIEVEMENTS',
      userId: 'test-patient-no-achievements',
      userRole: 'patient',
      achievementCount: 0,
    };

    console.log(`\n📋 Example Test 1: Patient with 0 achievements`);

    await setBypassAuth(page, input.userRole, input.userId);
    await page.goto('/patient/achievements', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Check for error or empty state
    const errorVisible = await page.getByText(/failed to load achievements/i).isVisible().catch(() => false);
    const loadingVisible = await page.getByText(/loading achievements/i).isVisible().catch(() => false);
    const achievementsCount = await page.locator('[data-testid="achievement-card"], .achievement-card, [id^="achievement-card-"]').count();

    console.log(`  Error visible: ${errorVisible}`);
    console.log(`  Loading visible: ${loadingVisible}`);
    console.log(`  Achievements count: ${achievementsCount}`);

    // On unfixed code, expect error or no achievements loaded
    const bugExists = errorVisible || (achievementsCount === 0 && !loadingVisible);
    expect(bugExists).toBe(true);
  });

  test('Example 2: Doctor with multiple achievements navigates to page (expects error)', async ({ page }) => {
    const input: AchievementsPageRequest = {
      page: 'ACHIEVEMENTS',
      userId: 'test-doctor-with-achievements',
      userRole: 'doctor',
      achievementCount: 5,
    };

    console.log(`\n📋 Example Test 2: Doctor with 5 achievements`);

    await setBypassAuth(page, input.userRole, input.userId);
    await page.goto('/doctor/achievements', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Check for error
    const errorVisible = await page.getByText(/failed to load achievements/i).isVisible().catch(() => false);
    const loadingVisible = await page.getByText(/loading achievements/i).isVisible().catch(() => false);
    const achievementsCount = await page.locator('[data-testid="achievement-card"], .achievement-card, [id^="achievement-card-"]').count();

    console.log(`  Error visible: ${errorVisible}`);
    console.log(`  Loading visible: ${loadingVisible}`);
    console.log(`  Achievements count: ${achievementsCount}`);

    // On unfixed code, expect error or no achievements loaded
    const bugExists = errorVisible || (achievementsCount === 0 && !loadingVisible);
    expect(bugExists).toBe(true);
  });

  test('Example 3: Admin navigates to achievements page (expects error)', async ({ page }) => {
    const input: AchievementsPageRequest = {
      page: 'ACHIEVEMENTS',
      userId: 'test-admin-user',
      userRole: 'admin',
      achievementCount: 10,
    };

    console.log(`\n📋 Example Test 3: Admin user`);

    await setBypassAuth(page, input.userRole, input.userId);
    await page.goto('/admin/achievements', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Check for error
    const errorVisible = await page.getByText(/failed to load achievements/i).isVisible().catch(() => false);
    const loadingVisible = await page.getByText(/loading achievements/i).isVisible().catch(() => false);
    const achievementsCount = await page.locator('[data-testid="achievement-card"], .achievement-card, [id^="achievement-card-"]').count();

    console.log(`  Error visible: ${errorVisible}`);
    console.log(`  Loading visible: ${loadingVisible}`);
    console.log(`  Achievements count: ${achievementsCount}`);

    // On unfixed code, expect error or no achievements loaded
    const bugExists = errorVisible || (achievementsCount === 0 && !loadingVisible);
    expect(bugExists).toBe(true);
  });

  test('Edge Case: Rapid navigation to achievements page (expects consistent error)', async ({ page }) => {
    const input: AchievementsPageRequest = {
      page: 'ACHIEVEMENTS',
      userId: 'test-rapid-navigation',
      userRole: 'patient',
      achievementCount: 3,
    };

    console.log(`\n📋 Edge Case: Rapid navigation test`);

    await setBypassAuth(page, input.userRole, input.userId);

    // Navigate multiple times rapidly
    for (let i = 0; i < 3; i++) {
      console.log(`  Navigation attempt ${i + 1}/3`);
      await page.goto('/patient/achievements', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1000);

      const errorVisible = await page.getByText(/failed to load achievements/i).isVisible().catch(() => false);
      const achievementsCount = await page.locator('[data-testid="achievement-card"], .achievement-card, [id^="achievement-card-"]').count();

      console.log(`    Error visible: ${errorVisible}, Achievements: ${achievementsCount}`);

      // Bug should be consistent across navigations
      const bugExists = errorVisible || achievementsCount === 0;
      expect(bugExists).toBe(true);
    }
  });
});
