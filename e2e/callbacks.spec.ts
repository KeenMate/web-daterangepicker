import { test, expect, Page, Locator } from '@playwright/test';

/**
 * Custom rendering + lifecycle callbacks:
 *   - renderDayContentCallback augments a day cell
 *   - getMonthHeaderCallback rewrites the per-month header text
 *   - beforeDateSelectCallback can restore (reject) a selection
 *   - beforeMonthChangedCallback can block navigation
 *   - getDateMetadataCallback can disable a date dynamically
 *
 * Fixture: test/callbacks.html
 */

const PAGE = '/test/callbacks.html';

function pickerById(page: Page, id: string) {
    return page.locator(`#${id}`);
}

function calendarOf(p: Locator) {
    return p.locator('.drp-date-picker');
}

function dayByDate(p: Locator, isoDate: string) {
    return p.locator(`.drp-date-picker__day[data-date="${isoDate}"]`);
}

function inputOf(p: Locator) {
    return p.locator('input');
}

async function open(page: Page, id: string) {
    const p = pickerById(page, id);
    await inputOf(p).click();
    await expect(calendarOf(p)).toBeVisible();
    return p;
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// renderDayContentCallback
// =============================================================================

test('renderDayContentCallback appends additional HTML into the matched day cell', async ({ page }) => {
    const p = await open(page, 'content');

    // Day 15 should have our mark element inside it.
    await expect(dayByDate(p, '2026-06-15').locator('[data-testid="mark"]')).toBeVisible();
    // Day 14 (not 15) should NOT have the mark.
    await expect(dayByDate(p, '2026-06-14').locator('[data-testid="mark"]')).toHaveCount(0);
});

// =============================================================================
// getMonthHeaderCallback
// =============================================================================

test('getMonthHeaderCallback overrides the month-year header text', async ({ page }) => {
    const p = await open(page, 'header');

    await expect(p.locator('.drp-date-picker__month-year').first()).toContainText('❄ June 2026 ❄');
});

// =============================================================================
// beforeDateSelectCallback
// =============================================================================

test('beforeDateSelectCallback action:"restore" rejects the selection (input stays empty)', async ({ page }) => {
    const p = await open(page, 'before-select');

    // Day 13 is configured for rejection.
    await dayByDate(p, '2026-06-13').click();

    // Selection is not committed.
    await expect(inputOf(p)).toHaveValue('');
});

test('beforeDateSelectCallback accepts non-rejected days normally', async ({ page }) => {
    const p = await open(page, 'before-select');

    await dayByDate(p, '2026-06-14').click();
    await expect(inputOf(p)).toHaveValue('2026-06-14');
});

// =============================================================================
// beforeMonthChangedCallback
// =============================================================================

test('beforeMonthChangedCallback action:"block" prevents navigation to the target month', async ({ page }) => {
    const p = await open(page, 'before-month');

    // June → July is allowed.
    await p.locator('.drp-date-picker__nav--next[data-month-index="0"]').click();
    await expect(p.locator('.drp-date-picker__month-year').first()).toContainText(/July\s+2026/);

    // July → August is blocked.
    await p.locator('.drp-date-picker__nav--next[data-month-index="0"]').click();
    await expect(p.locator('.drp-date-picker__month-year').first()).toContainText(/July\s+2026/);
});

// =============================================================================
// getDateMetadataCallback
// =============================================================================

test('getDateMetadataCallback can mark an individual date disabled via {isDisabled:true}', async ({ page }) => {
    const p = await open(page, 'metadata');

    await expect(dayByDate(p, '2026-06-17')).toHaveClass(/drp-date-picker__day--disabled/);
    // Adjacent day is still enabled.
    await expect(dayByDate(p, '2026-06-18')).not.toHaveClass(/drp-date-picker__day--disabled/);
});
