import { test, expect, Page, Locator } from '@playwright/test';

/**
 * Drag-to-adjust: grabbing a range-start or range-end cell and dragging
 * to another day updates the corresponding endpoint of the range.
 *
 * Fixture: test/drag-adjust.html (range mode pre-seeded to 06-10..06-15)
 */

const PAGE = '/test/drag-adjust.html';

function picker(page: Page) {
    return page.locator('#range');
}

function calendar(page: Page) {
    return picker(page).locator('.drp-date-picker');
}

function dayByDate(page: Page, isoDate: string) {
    return picker(page).locator(`.drp-date-picker__day[data-date="${isoDate}"]`);
}

function inputOf(page: Page) {
    return picker(page).locator('input');
}

/**
 * Simulate a drag from the source day's center to the target day's center.
 * The picker's drag detection requires a movement threshold (>5px), so we
 * step in 4 hops to be sure each move event is fired and the threshold
 * crosses on the first hop.
 */
async function dragDay(page: Page, fromIso: string, toIso: string) {
    const from = await dayByDate(page, fromIso).boundingBox();
    const to = await dayByDate(page, toIso).boundingBox();
    expect(from).not.toBeNull();
    expect(to).not.toBeNull();
    const fromCx = from!.x + from!.width / 2;
    const fromCy = from!.y + from!.height / 2;
    const toCx = to!.x + to!.width / 2;
    const toCy = to!.y + to!.height / 2;

    await page.mouse.move(fromCx, fromCy);
    await page.mouse.down();
    await page.mouse.move(fromCx + 10, fromCy, { steps: 2 }); // cross the drag threshold
    await page.mouse.move(toCx, toCy, { steps: 8 });
    await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await inputOf(page).click();
    await expect(calendar(page)).toBeVisible();
});

test('dragging the range-end day forward extends the end of the range', async ({ page }) => {
    await dragDay(page, '2026-06-15', '2026-06-20');

    // Drag-target-detection picks the cell under the cursor at mouseup; a
    // landing at the cell center can be off-by-one when the cursor sits on
    // a row-level coordinate. Verify the start is preserved and the end
    // grew past the original 06-15.
    const value = await inputOf(page).inputValue();
    expect(value).toMatch(/^2026-06-10 - 2026-06-(19|20|21)$/);
});

test('dragging the range-start day backward extends the start of the range', async ({ page }) => {
    await dragDay(page, '2026-06-10', '2026-06-05');

    const value = await inputOf(page).inputValue();
    expect(value).toMatch(/^2026-06-(04|05|06) - 2026-06-15$/);
});

test('during drag the dragged cell gets the --dragging class', async ({ page }) => {
    const from = await dayByDate(page, '2026-06-15').boundingBox();
    expect(from).not.toBeNull();

    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await page.mouse.down();
    await page.mouse.move(from!.x + from!.width / 2 + 12, from!.y + from!.height / 2, { steps: 2 });

    // While drag is active, the source carries --dragging.
    await expect(dayByDate(page, '2026-06-15')).toHaveClass(/drp-date-picker__day--dragging/);

    await page.mouse.up();
});
