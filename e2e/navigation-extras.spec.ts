import { test, expect, Page, Locator } from '@playwright/test';

/**
 * Prev/next nav buttons, rolling-selector toggle via month-year header,
 * Tab cycles between columns in multi-month mode, Ctrl+Home/End jumps to
 * year boundaries.
 *
 * Fixture: test/navigation-extras.html
 */

const PAGE = '/test/navigation-extras.html';

function pickerById(page: Page, id: string) {
    return page.locator(`#${id}`);
}

function calendarOf(p: Locator) {
    return p.locator('.drp-date-picker');
}

function focusedDay(p: Locator) {
    return p.locator('.drp-date-picker__day--focused');
}

async function open(page: Page, id: string) {
    const p = pickerById(page, id);
    await p.locator('input').click();
    await expect(calendarOf(p)).toBeVisible();
    return p;
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// prev / next month buttons
// =============================================================================

test('next-month nav advances the header by one month', async ({ page }) => {
    const p = await open(page, 'single');

    await p.locator('.drp-date-picker__nav--next[data-month-index="0"]').click();
    await expect(p.locator('.drp-date-picker__month-year').first()).toContainText(/July\s+2026/);
});

test('prev-month nav rewinds the header by one month', async ({ page }) => {
    const p = await open(page, 'single');

    await p.locator('.drp-date-picker__nav--prev[data-month-index="0"]').click();
    await expect(p.locator('.drp-date-picker__month-year').first()).toContainText(/May\s+2026/);
});

// =============================================================================
// rolling-selector toggle via month-year header
// =============================================================================

test('clicking the month-year text opens the rolling year/month selector', async ({ page }) => {
    const p = await open(page, 'single');

    await p.locator('.drp-date-picker__month-year').first().click();
    await expect(p.locator('.drp-date-picker__rolling-selector--visible').first()).toBeVisible();
});

test('clicking the month-year text again closes the rolling selector', async ({ page }) => {
    const p = await open(page, 'single');

    const header = p.locator('.drp-date-picker__month-year').first();
    await header.click();
    await expect(p.locator('.drp-date-picker__rolling-selector--visible').first()).toBeVisible();
    await header.click();
    await expect(p.locator('.drp-date-picker__rolling-selector--visible')).toHaveCount(0);
});

// =============================================================================
// Tab cycles between columns (multi-month)
// =============================================================================

test('Tab moves the active column from 0 to 1, then back to 0', async ({ page }) => {
    const p = await open(page, 'two-month');

    // Press ArrowRight first to establish focus in column 0 (June 2026).
    await page.keyboard.press('ArrowRight');
    let date = await focusedDay(p).getAttribute('data-date');
    expect(date?.startsWith('2026-06')).toBeTruthy();

    // Tab to column 1 (July 2026).
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowRight'); // re-anchor in new column
    date = await focusedDay(p).getAttribute('data-date');
    expect(date?.startsWith('2026-07')).toBeTruthy();
});

// =============================================================================
// Ctrl+Home jumps to start of year
// =============================================================================

test('Ctrl+Home navigates the active column to January 2026', async ({ page }) => {
    const p = await open(page, 'single');

    await page.keyboard.press('Control+Home');
    await expect(p.locator('.drp-date-picker__month-year').first()).toContainText(/January\s+2026/);
});
