import { test, expect, Page, Locator } from '@playwright/test';

/**
 * Programmatic property setters: selectedDate, selectedRanges. Message API:
 * showMessage / hideMessage. displayFormatMask vs dateFormatMask.
 *
 * Fixture: test/api-extras.html
 */

const PAGE = '/test/api-extras.html';

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

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// selectedDate setter
// =============================================================================

test('selectedDate setter populates the input and marks the day --selected', async ({ page }) => {
    const p = pickerById(page, 'single-setter');

    await p.evaluate((el: any) => { el.selectedDate = new Date(2026, 5, 18); });

    await expect(inputOf(p)).toHaveValue('2026-06-18');

    await inputOf(p).click();
    await expect(dayByDate(p, '2026-06-18')).toHaveClass(/drp-date-picker__day--selected/);
});

// =============================================================================
// selectedRanges setter
// =============================================================================

test('selectedRanges setter populates a range and applies range-start / range-end classes', async ({ page }) => {
    const p = pickerById(page, 'range-setter');

    await p.evaluate((el: any) => {
        el.selectedRanges = [{ start: new Date(2026, 5, 10), end: new Date(2026, 5, 14) }];
    });

    await inputOf(p).click();
    await expect(dayByDate(p, '2026-06-10')).toHaveClass(/drp-date-picker__day--range-start/);
    await expect(dayByDate(p, '2026-06-14')).toHaveClass(/drp-date-picker__day--range-end/);
});

// =============================================================================
// showMessage / hideMessage
// =============================================================================

test('showMessage renders the message element with the configured type class', async ({ page }) => {
    const p = pickerById(page, 'messages');

    await inputOf(p).click();
    await expect(calendarOf(p)).toBeVisible();

    await p.evaluate((el: any) => el.showMessage('Heads up', 'warning'));

    const msg = p.locator('.drp-date-picker__message');
    await expect(msg).toHaveClass(/drp-date-picker__message--visible/);
    await expect(msg).toHaveClass(/drp-date-picker__message--warning/);
    await expect(msg).toContainText('Heads up');
});

test('hideMessage removes the --visible modifier', async ({ page }) => {
    const p = pickerById(page, 'messages');

    await inputOf(p).click();
    await p.evaluate((el: any) => el.showMessage('Heads up', 'info'));
    const msg = p.locator('.drp-date-picker__message');
    await expect(msg).toHaveClass(/drp-date-picker__message--visible/);

    await p.evaluate((el: any) => el.hideMessage());
    await expect(msg).not.toHaveClass(/drp-date-picker__message--visible/);
});

test('showMessage auto-hides after the supplied timeout', async ({ page }) => {
    const p = pickerById(page, 'messages');

    await inputOf(p).click();
    await p.evaluate((el: any) => el.showMessage('Brief', 'info', 200));

    const msg = p.locator('.drp-date-picker__message');
    await expect(msg).toHaveClass(/drp-date-picker__message--visible/);
    await expect(msg).not.toHaveClass(/drp-date-picker__message--visible/, { timeout: 2000 });
});

// displayFormatMask intentionally not tested — the option is declared and
// stored on options but never consumed (see test/FINDINGS.md #12).
