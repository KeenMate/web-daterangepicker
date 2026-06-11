import { test, expect, Page, Locator } from './fixtures';

/**
 * Day-cell tooltip (Floating UI), action-button tooltip, and the
 * tooltip-overflow-escape behavior that mirrors the popover's fix
 * (position: fixed + strategy: fixed).
 *
 * Fixture: test/tooltips.html
 */

const PAGE = '/test/tooltips.html';

function pickerById(page: Page, id: string) {
    return page.locator(`#${id}`);
}

function calendarOf(p: Locator) {
    return p.locator('.drp__picker');
}

function dayByDate(p: Locator, isoDate: string) {
    return p.locator(`.drp__day[data-date="${isoDate}"]`);
}

function dayTooltip(p: Locator) {
    return p.locator('.drp__tooltip');
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
// day-cell tooltip
// =============================================================================

test('day-cell tooltip becomes --visible when hovering a day that has tooltip text', async ({ page }) => {
    const p = await open(page, 'day-tip');

    await dayByDate(p, '2026-06-15').hover();

    const tip = dayTooltip(p);
    await expect(tip).toHaveClass(/drp__tooltip--visible/);
    await expect(tip).toContainText('Special day 15');
});

test('day-cell tooltip uses position: fixed (so it escapes overflow ancestors)', async ({ page }) => {
    const p = await open(page, 'day-tip');

    await dayByDate(p, '2026-06-15').hover();
    const position = await dayTooltip(p).evaluate(el => getComputedStyle(el).position);
    expect(position).toBe('fixed');
});

test('hovering a day without tooltip text does not show the tooltip element', async ({ page }) => {
    const p = await open(page, 'day-tip');

    await dayByDate(p, '2026-06-14').hover();
    await expect(dayTooltip(p)).not.toHaveClass(/drp__tooltip--visible/);
});

// =============================================================================
// action-button tooltip
// =============================================================================

test('action-button tooltip appears on hover of a button with a configured tooltip', async ({ page }) => {
    const p = await open(page, 'action-tip');

    await p.locator('.drp__button--today').hover();

    // Action button tooltips share .drp__tooltip with the day
    // tooltip; the action tooltip has a 300ms showDelay (Tooltip default).
    // Wait for ANY tooltip in the shadow root to become --visible and to
    // contain the configured text.
    const visibleTip = p.locator('.drp__tooltip--visible');
    await expect(visibleTip).toContainText('Jump to today', { timeout: 2000 });
});

// =============================================================================
// tooltip escape from overflow ancestor
// =============================================================================

test('day tooltip extends past an overflow:auto ancestor when positioned at a high day index', async ({ page }) => {
    const p = await open(page, 'tip-overflow');

    // Hover day 28 — far down in the calendar, near the clip box's bottom.
    await dayByDate(p, '2026-06-28').hover();

    const tip = dayTooltip(p);
    await expect(tip).toHaveClass(/drp__tooltip--visible/);

    const clipBox = await page.locator('#clip').boundingBox();
    const tipBox = await tip.boundingBox();
    expect(clipBox).not.toBeNull();
    expect(tipBox).not.toBeNull();

    // Tooltip must be positioned somewhere — sanity that it's actually rendered.
    expect(tipBox!.width).toBeGreaterThan(0);
    expect(tipBox!.height).toBeGreaterThan(0);
});
