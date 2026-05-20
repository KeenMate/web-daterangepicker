import { test, expect, Page } from '@playwright/test';

/**
 * Two v1.12.1 behaviors:
 *   - In floating mode, autoUpdate runs with `elementResize: false`, so the
 *     calendar's own size changes (e.g. summary growing on a hover) don't
 *     re-anchor the popover. The calendar's top stays put; the bottom grows
 *     downward. Without this, with a flipped placement the new top would be
 *     `inputTop − newHeight − offset`, sliding the hovered day under the
 *     cursor and looping into hover-jitter.
 *   - As a follow-up to that, viewport resize is wired explicitly to close
 *     the picker (since `elementResize: false` also disables the input's own
 *     resize trigger).
 *
 * Fixture: test/anchor-stability.html — range picker pushed near the bottom
 * of the viewport so it flips above the input.
 */

const PAGE = '/test/anchor-stability.html';

function picker(page: Page) {
    return page.locator('#picker');
}

function calendar(page: Page) {
    return picker(page).locator('.drp-date-picker');
}

async function openPicker(page: Page) {
    await page.goto(PAGE);
    await picker(page).locator('input').click();
    await expect(calendar(page)).toBeVisible();
}

test('calendar top stays put when its own size changes (no reposition on growth)', async ({ page }) => {
    await openPicker(page);

    const beforeBox = await calendar(page).boundingBox();
    expect(beforeBox).not.toBeNull();

    // Inflate the summary slot artificially via min-height. This forces a
    // calendar-height change, which would have triggered Floating UI's
    // ResizeObserver and re-positioned the calendar — moving its top edge
    // upward when flipped above the input.
    await calendar(page).evaluate(cal => {
        const summary = cal.querySelector('.drp-date-picker__summary') as HTMLElement | null;
        if (summary) summary.style.minHeight = '120px';
        else {
            // Single mode has no summary; fall back to padding the actions.
            const actions = cal.querySelector('.drp-date-picker__actions') as HTMLElement | null;
            if (actions) actions.style.paddingBottom = '100px';
        }
    });

    // Give layout a frame to settle, then a generous window to confirm no
    // delayed reposition was queued.
    await page.waitForTimeout(150);

    const afterBox = await calendar(page).boundingBox();
    expect(afterBox).not.toBeNull();

    // Top edge must not have moved (allow sub-pixel rounding).
    expect(Math.abs(afterBox!.y - beforeBox!.y)).toBeLessThanOrEqual(0.5);
});

test('viewport resize closes the floating picker', async ({ page }) => {
    await openPicker(page);

    // Picker is open.
    await expect(calendar(page)).toBeVisible();

    // Shrink the viewport. Since elementResize is off in autoUpdate, the
    // picker can't gracefully adapt — it dismisses instead.
    await page.setViewportSize({ width: 1200, height: 900 });

    // Calendar should no longer have the --visible class.
    await expect(calendar(page)).toBeHidden();
});

test('viewport expand also closes the picker', async ({ page }) => {
    await openPicker(page);
    await expect(calendar(page)).toBeVisible();

    await page.setViewportSize({ width: 1600, height: 1100 });
    await expect(calendar(page)).toBeHidden();
});
