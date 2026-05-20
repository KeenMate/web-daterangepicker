import { test, expect, Page, Locator } from '@playwright/test';

/**
 * renderDayCallback (full replacement), customStylesCallback,
 * specialDates with default + custom *Member mapping,
 * getUnifiedHeaderCallback.
 *
 * Fixture: test/callbacks-extra.html
 */

const PAGE = '/test/callbacks-extra.html';

function pickerById(page: Page, id: string) {
    return page.locator(`#${id}`);
}

function calendarOf(p: Locator) {
    return p.locator('.drp-date-picker');
}

function dayByDate(p: Locator, isoDate: string) {
    return p.locator(`.drp-date-picker__day[data-date="${isoDate}"]`);
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
// renderDayCallback
// =============================================================================

test('renderDayCallback returning an HTMLElement fully replaces the day content', async ({ page }) => {
    const p = await open(page, 'full-render');

    // Day 20 should now contain our injected element.
    await expect(dayByDate(p, '2026-06-20').locator('[data-testid="fullday"]')).toBeVisible();
    await expect(dayByDate(p, '2026-06-20').locator('[data-testid="fullday"]')).toHaveText('★');
});

// =============================================================================
// customStylesCallback
// =============================================================================

test('customStylesCallback adds a <style class="drp-custom-styles"> inside the shadow root', async ({ page }) => {
    const p = pickerById(page, 'custom-styles');

    // Style element should be present in the shadow root.
    const has = await p.evaluate((el: any) => {
        const styles = el.shadowRoot?.querySelector('style.drp-custom-styles');
        return styles ? styles.textContent : null;
    });
    expect(has).toContain('my-flag');
    expect(has).toContain('magenta');
});

// =============================================================================
// specialDates
// =============================================================================

test('specialDates with default member names renders badge cells with the configured text', async ({ page }) => {
    const p = await open(page, 'specials');

    // Badges are rendered in .drp-date-picker__badge-cell elements
    // sibling-to the day cells, not inside them. We just check that the
    // badge cells exist with the configured text values.
    const badges = p.locator('.drp-date-picker__badge-cell');
    await expect(badges.filter({ hasText: 'A' })).toHaveCount(1);
    await expect(badges.filter({ hasText: 'B' })).toHaveCount(1);
});

test('specialDates with custom *Member mapping consumes the renamed fields', async ({ page }) => {
    const p = await open(page, 'specials-custom');

    // dateMember="when", badgeTextMember="tag" — so { when: '2026-06-19', tag: 'X' }
    // produces a badge cell containing "X".
    const xBadge = p.locator('.drp-date-picker__badge-cell').filter({ hasText: 'X' });
    await expect(xBadge).toHaveCount(1);
});

// =============================================================================
// getUnifiedHeaderCallback
// =============================================================================

test('getUnifiedHeaderCallback replaces the unified-header range text', async ({ page }) => {
    const p = await open(page, 'unified-header');

    await expect(p.locator('.drp-date-picker__unified-range')).toContainText('June → August');
});
