import { test, expect, Page, Locator } from '@playwright/test';

/**
 * Progressive input masking: as the user types digits, the picker auto-inserts
 * the configured separator at each segment boundary. All three pickers use
 * calendar-open-trigger="manual" so the calendar doesn't pop up during typing
 * and accidentally consume keys.
 *
 * Fixture: test/input-behavior.html
 */

const PAGE = '/test/input-behavior.html';

function pickerById(page: Page, id: string) {
    return page.locator(`#${id}`);
}

function inputOf(p: Locator) {
    return p.locator('input');
}

async function typeInto(p: Locator, text: string) {
    const inp = inputOf(p);
    await inp.click();
    await inp.pressSequentially(text);
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// default YYYY-MM-DD
// =============================================================================

test('YYYY-MM-DD: typing a full year segment eagerly appends the separator', async ({ page }) => {
    const p = pickerById(page, 'iso');

    await typeInto(p, '2026');
    // The mask inserts the next separator as soon as the current segment is
    // fully consumed, so the user can keep typing month digits without
    // having to type the dash themselves.
    await expect(inputOf(p)).toHaveValue('2026-');
});

test('YYYY-MM-DD: a partial year does not yet have a separator', async ({ page }) => {
    const p = pickerById(page, 'iso');

    await typeInto(p, '202');
    await expect(inputOf(p)).toHaveValue('202');
});

test('YYYY-MM-DD: a complete date is fully formatted to YYYY-MM-DD', async ({ page }) => {
    const p = pickerById(page, 'iso');

    await typeInto(p, '20260615');
    await expect(inputOf(p)).toHaveValue('2026-06-15');
});

test('YYYY-MM-DD: typing past the max length is truncated', async ({ page }) => {
    const p = pickerById(page, 'iso');

    await typeInto(p, '202606159');
    await expect(inputOf(p)).toHaveValue('2026-06-15');
});

// =============================================================================
// custom DD.MM.YYYY
// =============================================================================

test('DD.MM.YYYY: complete date uses dot separators (15.06.2026 for 15062026)', async ({ page }) => {
    const p = pickerById(page, 'eu');

    await typeInto(p, '15062026');
    await expect(inputOf(p)).toHaveValue('15.06.2026');
});

test('DD.MM.YYYY: progressive separators after day, then after month', async ({ page }) => {
    const p = pickerById(page, 'eu');

    // Full day → eager dot
    await typeInto(p, '15');
    await expect(inputOf(p)).toHaveValue('15.');

    // Partial month → no extra separator
    await typeInto(p, '0');
    await expect(inputOf(p)).toHaveValue('15.0');

    // Finish the month → second dot is added, then start of year
    await typeInto(p, '62');
    await expect(inputOf(p)).toHaveValue('15.06.2');
});

// =============================================================================
// range
// =============================================================================

test('range: completing the start date auto-appends " to " so the user can type the end immediately', async ({ page }) => {
    const p = pickerById(page, 'range');

    await typeInto(p, '20260610');
    // Once the start side is fully masked (matches maxLength), the picker
    // injects " to " as a hint for the second date.
    await expect(inputOf(p)).toHaveValue('2026-06-10 to ');
});

test('range: typing both halves produces "start to end" (typing separator differs from committed " - ")', async ({ page }) => {
    const p = pickerById(page, 'range');

    await typeInto(p, '2026061020260615');
    await expect(inputOf(p)).toHaveValue('2026-06-10 to 2026-06-15');
});
