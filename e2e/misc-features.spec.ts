import { test, expect, Page, Locator } from './fixtures';

/**
 * Round-out for several smaller features:
 *   - badge tooltip via specialDates.badgeTooltip
 *   - invalid-range error styling (showInvalidRange:true on restore)
 *   - unified-header-interactive opens unified rolling selector
 *   - mobile-modal-breakpoint auto-engages modal mode on narrow viewports
 *
 * Fixture: test/misc-features.html
 */

const PAGE = '/test/misc-features.html';

function pickerById(page: Page, id: string) {
    return page.locator(`#${id}`);
}

function calendarOf(p: Locator) {
    return p.locator('.drp__picker');
}

function dayByDate(p: Locator, isoDate: string) {
    return p.locator(`.drp__day[data-date="${isoDate}"]`);
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
// badge tooltip
// =============================================================================

test('badge tooltip appears on hover of a badge with badgeTooltip text', async ({ page }) => {
    const p = await open(page, 'badge-tip');

    const badge = p.locator('.drp__badge-cell').filter({ hasText: 'B' });
    await expect(badge).toBeVisible();
    await badge.hover();

    // Day-tooltip mechanism is shared with badge tooltips — look for visible
    // tooltip element containing our text.
    const visibleTip = p.locator('.drp__tooltip--visible');
    await expect(visibleTip).toContainText('Special badge tooltip', { timeout: 2000 });
});

// =============================================================================
// invalid-range error styling
// =============================================================================

test('showInvalidRange:true on restore keeps the invalid range visible with --invalid-range-start/end classes', async ({ page }) => {
    const p = await open(page, 'invalid-range');

    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-14').click();

    // The before-select callback restores with showInvalidRange:true, so the
    // rejected range stays visible with the dedicated invalid-* classes.
    await expect(dayByDate(p, '2026-06-10')).toHaveClass(/drp__day--invalid-range-start/);
    await expect(dayByDate(p, '2026-06-14')).toHaveClass(/drp__day--invalid-range-end/);
});

// =============================================================================
// unified-header-interactive
// =============================================================================

test('unified-header-interactive: clicking the unified range header opens the unified rolling selector', async ({ page }) => {
    const p = await open(page, 'unified-click');

    await p.locator('.drp__unified-range').click();
    await expect(p.locator('.drp__unified-rolling-selector--visible')).toBeVisible();
});

// =============================================================================
// mobile-modal-breakpoint
// =============================================================================

test('mobile-modal-breakpoint="600": viewport narrower than 600px auto-engages modal mode', async ({ page }) => {
    // Open at the default 1440 viewport — positioning is floating.
    const p = pickerById(page, 'mobile-modal');
    const positioningModeBefore = await p.evaluate(el => el.getAttribute('positioning-mode') || 'floating');
    expect(positioningModeBefore).toBe('floating');

    // Shrink the viewport — the matchMedia listener should swap positioning-mode
    // attribute to 'modal'.
    await page.setViewportSize({ width: 480, height: 800 });
    await expect.poll(
        () => p.evaluate(el => el.getAttribute('positioning-mode')),
        { timeout: 2000 }
    ).toBe('modal');
});
