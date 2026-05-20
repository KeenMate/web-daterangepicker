import { test, expect, Page } from '@playwright/test';

/**
 * Verifies the floating-mode positioning escapes an ancestor with
 * `overflow: auto`. This is the SPFx-workbench / micro-frontend regression
 * the v1.12.1 fix addressed (calendar uses position:fixed + strategy:fixed
 * so it's anchored to the viewport, not clipped by the scroll container).
 *
 * Fixture: test/floating-overflow.html — picker is inside a 200px scroll
 * container with a 600px spacer. With the fix, the opened calendar's bottom
 * edge must extend past the container's bottom edge.
 */

const PAGE = '/test/floating-overflow.html';

function picker(page: Page) {
    return page.locator('#picker');
}

function calendar(page: Page) {
    // Calendar is rendered inside the web-component's shadow DOM. Playwright's
    // locators pierce open shadow roots transparently.
    return page.locator('#picker').locator('.drp-date-picker');
}

async function openPicker(page: Page) {
    await page.goto(PAGE);
    // The input is the focusable child inside the web component's shadow root.
    await picker(page).locator('input').click();
    await expect(calendar(page)).toBeVisible();
}

test('calendar uses position: fixed so it escapes overflow:auto ancestor', async ({ page }) => {
    await openPicker(page);

    const positionStyle = await calendar(page).evaluate(el => getComputedStyle(el).position);
    expect(positionStyle).toBe('fixed');
});

test('opened calendar extends past the bottom edge of its scroll-clipping ancestor', async ({ page }) => {
    await openPicker(page);

    const clipBox = await page.locator('#clip').boundingBox();
    const calendarBox = await calendar(page).boundingBox();

    expect(clipBox).not.toBeNull();
    expect(calendarBox).not.toBeNull();

    // The whole point: with position:absolute the calendar would be clipped
    // (its bottom would not exceed clip's bottom). With position:fixed, it's
    // viewport-anchored and overflows the clip box.
    const clipBottom = clipBox!.y + clipBox!.height;
    const calendarBottom = calendarBox!.y + calendarBox!.height;
    expect(calendarBottom).toBeGreaterThan(clipBottom);
});
