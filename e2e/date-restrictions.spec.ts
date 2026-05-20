import { test, expect, Page, Locator } from '@playwright/test';

/**
 * Disable strategies: min-date / max-date bounds, disabled-weekdays, the
 * initial-date opening month, and the rolling year range that constrains
 * the year-list in the month/year selector.
 *
 * Fixture: test/date-restrictions.html
 */

const PAGE = '/test/date-restrictions.html';

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
// min-date / max-date
// =============================================================================

test.describe('min-date / max-date', () => {
    test('a day inside the [min, max] window has the --selectable class set', async ({ page }) => {
        const p = await open(page, 'minmax');
        // June 15 is between 10 and 20.
        await expect(dayByDate(p, '2026-06-15')).not.toHaveClass(/drp-date-picker__day--disabled/);
    });

    test('a day before min-date is marked --disabled', async ({ page }) => {
        const p = await open(page, 'minmax');
        await expect(dayByDate(p, '2026-06-05')).toHaveClass(/drp-date-picker__day--disabled/);
    });

    test('a day after max-date is marked --disabled', async ({ page }) => {
        const p = await open(page, 'minmax');
        await expect(dayByDate(p, '2026-06-25')).toHaveClass(/drp-date-picker__day--disabled/);
    });

    test('clicking a disabled day does not commit a selection', async ({ page }) => {
        const p = await open(page, 'minmax');
        await dayByDate(p, '2026-06-05').click();
        await expect(inputOf(p)).toHaveValue('');
        // And calendar stays open.
        await expect(calendarOf(p)).toBeVisible();
    });

    test('clicking an enabled day commits normally', async ({ page }) => {
        const p = await open(page, 'minmax');
        await dayByDate(p, '2026-06-15').click();
        await expect(inputOf(p)).toHaveValue('2026-06-15');
    });
});

// =============================================================================
// disabled-weekdays
// =============================================================================

test.describe('disabled-weekdays', () => {
    test('Saturday and Sunday cells render with --disabled', async ({ page }) => {
        const p = await open(page, 'weekdays');
        // June 2026: 6 = Sat, 7 = Sun
        await expect(dayByDate(p, '2026-06-06')).toHaveClass(/drp-date-picker__day--disabled/);
        await expect(dayByDate(p, '2026-06-07')).toHaveClass(/drp-date-picker__day--disabled/);
    });

    test('weekdays Mon-Fri remain enabled', async ({ page }) => {
        const p = await open(page, 'weekdays');
        await expect(dayByDate(p, '2026-06-08')).not.toHaveClass(/drp-date-picker__day--disabled/);
        await expect(dayByDate(p, '2026-06-12')).not.toHaveClass(/drp-date-picker__day--disabled/);
    });
});

// =============================================================================
// initial-date
// =============================================================================

test('initial-date controls the month/year shown on first open', async ({ page }) => {
    const p = await open(page, 'initial');
    await expect(p.locator('.drp-date-picker__month-year').first()).toContainText(/March\s+2027/);
});

// =============================================================================
// rolling-year-range
// =============================================================================

test('rolling-year-range="2025-2027" limits the year list to exactly those years', async ({ page }) => {
    const p = await open(page, 'rolling');

    // Open the rolling selector via the month-year header.
    await p.locator('.drp-date-picker__month-year').first().click();
    const yearList = p.locator('.drp-date-picker__rolling-list[data-list="years"]');
    await expect(yearList).toBeVisible();

    const items = yearList.locator('.drp-date-picker__rolling-item');
    await expect(items).toHaveCount(3);

    // First and last are 2025 and 2027.
    await expect(items.first()).toHaveText('2025');
    await expect(items.last()).toHaveText('2027');
});
