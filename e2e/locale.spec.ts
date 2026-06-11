import { test, expect, Page, Locator } from './fixtures';

/**
 * locale, customStrings, monthNames override, week-start-day.
 *
 * Fixture: test/locale.html
 */

const PAGE = '/test/locale.html';

function pickerById(page: Page, id: string) {
    return page.locator(`#${id}`);
}

function calendarOf(p: Locator) {
    return p.locator('.drp__picker');
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
// explicit locale
// =============================================================================

test('locale="de" uses German month names ("Juni 2026")', async ({ page }) => {
    const p = await open(page, 'de');
    await expect(p.locator('.drp__month-year').first()).toContainText('Juni 2026');
});

test('locale="de" uses German weekday headers (Mo Di Mi Do Fr Sa So)', async ({ page }) => {
    const p = await open(page, 'de');
    // Weekday header row text. Don't pin exact spacing/order — just spot
    // a few German abbreviations.
    const weekdays = await p.locator('.drp__weekdays').first().innerText();
    expect(weekdays).toMatch(/Mo/i);
    expect(weekdays).toMatch(/Di/i);
    expect(weekdays).toMatch(/Fr/i);
});

// =============================================================================
// customStrings
// =============================================================================

test('customStrings overrides individual button labels (Today → "Jump")', async ({ page }) => {
    const p = await open(page, 'custom-strings');

    const todayBtn = p.locator('.drp__button--today');
    await expect(todayBtn).toHaveText('Jump');
});

// =============================================================================
// monthNames override
// =============================================================================

test('monthNames override replaces the localized month names with the supplied array', async ({ page }) => {
    const p = await open(page, 'numeric-months');

    // June (index 5) → '06'
    await expect(p.locator('.drp__month-year').first()).toContainText('06 2026');
});

// =============================================================================
// week-start-day
// =============================================================================

test('week-start-day="0": first weekday header column is Sunday', async ({ page }) => {
    const p = await open(page, 'sunday');

    const firstWeekday = p.locator('.drp__weekdays > *').first();
    await expect(firstWeekday).toContainText(/Sun|Sun\.|Sunday|Su/i);
});

test('week-start-day="1": first weekday header column is Monday', async ({ page }) => {
    const p = await open(page, 'monday');

    const firstWeekday = p.locator('.drp__weekdays > *').first();
    await expect(firstWeekday).toContainText(/Mon|Mon\.|Monday|Mo/i);
});
