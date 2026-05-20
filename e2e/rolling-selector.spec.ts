import { test, expect, Page } from '@playwright/test';

/**
 * Verifies the rolling year/month selector overlays its container correctly
 * (no overflow into elements below) and applies `overscroll-behavior: contain`
 * so scrolling the list to its end doesn't chain to the page.
 *
 * Fixture: test/rolling-selector.html — single picker, defaults.
 */

const PAGE = '/test/rolling-selector.html';

function picker(page: Page) {
    return page.locator('#picker');
}

function calendar(page: Page) {
    return picker(page).locator('.drp-date-picker');
}

function rollingSelector(page: Page) {
    return picker(page).locator('.drp-date-picker__rolling-selector');
}

function rollingLists(page: Page) {
    return picker(page).locator('.drp-date-picker__rolling-list');
}

async function openCalendarAndRollingSelector(page: Page) {
    await page.goto(PAGE);
    await picker(page).locator('input').click();
    await expect(calendar(page)).toBeVisible();

    // Clicking the month-year header toggles the rolling year/month picker.
    await picker(page).locator('.drp-date-picker__month-year').first().click();
    await expect(rollingSelector(page).first()).toBeVisible();
}

test('rolling-list has box-sizing: border-box (so 100% + border does not overflow)', async ({ page }) => {
    await openCalendarAndRollingSelector(page);

    const boxSizing = await rollingLists(page).first().evaluate(el => getComputedStyle(el).boxSizing);
    expect(boxSizing).toBe('border-box');
});

test('rolling-list applies overscroll-behavior to prevent page-scroll chaining', async ({ page }) => {
    await openCalendarAndRollingSelector(page);

    // contain or none both prevent chaining; the fix specifically sets contain.
    const overscroll = await rollingLists(page).first().evaluate(el => getComputedStyle(el).overscrollBehaviorY);
    expect(['contain', 'none']).toContain(overscroll);
});

test('rolling-list does not extend past its parent rolling-selector container', async ({ page }) => {
    await openCalendarAndRollingSelector(page);

    // Compare bottom edges. With the border-box fix the list fits inside.
    // Without it, the 1px top+bottom border pushed the list 2px past the
    // container, visibly overlapping whatever sat below.
    const selectorBox = await rollingSelector(page).first().boundingBox();
    const listBox = await rollingLists(page).first().boundingBox();

    expect(selectorBox).not.toBeNull();
    expect(listBox).not.toBeNull();

    const selectorBottom = selectorBox!.y + selectorBox!.height;
    const listBottom = listBox!.y + listBox!.height;

    // Allow sub-pixel rounding (≤ 0.5px) but no more.
    expect(listBottom).toBeLessThanOrEqual(selectorBottom + 0.5);
});
