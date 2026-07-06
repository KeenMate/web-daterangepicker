import { test, expect, Page, Locator } from './fixtures';

/**
 * v2.0.0 unified-context wiring for the callback/event surfaces that previously
 * passed a raw `picker`/positional arg and had no e2e coverage:
 *   - ActionButton callbacks now receive ActionButtonContext { picker, action, button, data }
 *   - the custom-action event detail is now { data, picker }
 *
 * Fixture: test/context-callbacks.html (inline pickers #ctx-actions, #ctx-events).
 */

const PAGE = '/test/context-callbacks.html';

function pickerById(page: Page, id: string) {
    return page.locator(`#${id}`);
}
function calendarOf(p: Locator) { return p.locator('.drp__picker'); }
function buttonByText(p: Locator, text: string) {
    return p.locator('.drp__button', { hasText: text });
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await expect(calendarOf(pickerById(page, 'ctx-actions'))).toBeVisible();
});

// =============================================================================
// ActionButtonContext — the six ActionButton callbacks
// =============================================================================

test('getTextCallback receives a live ctx.picker (button text reflects it)', async ({ page }) => {
    const p = pickerById(page, 'ctx-actions');
    // Text is computed from ctx.picker.options — proves the instance is passed, not undefined.
    await expect(buttonByText(p, 'HASPICKER')).toHaveCount(1);
    await expect(buttonByText(p, 'NOPICKER')).toHaveCount(0);
});

test('getClassCallback receives ctx.action (class carries the action name)', async ({ page }) => {
    const p = pickerById(page, 'ctx-actions');
    await expect(buttonByText(p, 'HASPICKER')).toHaveClass(/ctxclass-custom/);
});

test('isVisibleCallback:false (via ctx) hides the button', async ({ page }) => {
    const p = pickerById(page, 'ctx-actions');
    await expect(buttonByText(p, 'HIDDEN')).toHaveCount(0);
});

test('isDisabledCallback:true (via ctx) disables the button', async ({ page }) => {
    const p = pickerById(page, 'ctx-actions');
    await expect(buttonByText(p, 'DISABLED')).toBeDisabled();
});

test('onClick receives ctx (ctx.picker + ctx.action) when the custom button is clicked', async ({ page }) => {
    const p = pickerById(page, 'ctx-actions');

    await buttonByText(p, 'HASPICKER').click();

    // onClick did `ctx.picker.showMessage('act:' + ctx.action)`.
    const msg = p.locator('.drp__message');
    await expect(msg).toHaveClass(/drp__message--visible/);
    await expect(msg).toContainText('act:custom');
});

test('getTooltipCallback receives ctx.action (action-button tooltip text)', async ({ page }) => {
    const p = pickerById(page, 'ctx-actions');

    await buttonByText(p, 'HASPICKER').hover();

    const visibleTip = p.locator('.drp__tooltip--visible');
    await expect(visibleTip).toContainText('tip-custom', { timeout: 2000 });
});

// =============================================================================
// custom-action event detail shape { data, picker }
// =============================================================================

test('custom-action detail is { data, picker }: data-* under detail.data, picker is the instance', async ({ page }) => {
    const p = pickerById(page, 'ctx-events');

    const cap = await p.evaluate(async (el: any) => {
        const captured: any[] = [];
        el.addEventListener('custom-action', (e: any) => {
            captured.push({
                keys: Object.keys(e.detail).sort(),
                data: e.detail.data,
                pickerIsInstance: e.detail.picker === el.picker
            });
        });
        // A custom button authored via showMessage carries the data-* attributes.
        el.showMessage(
            '<button data-action="custom" data-start-date="2026-06-01" data-reason="cheap">go</button>'
        );
        el.shadowRoot.querySelector('.drp__message [data-action="custom"]').click();
        return captured;
    });

    expect(cap.length).toBe(1);
    expect(cap[0].keys).toEqual(['data', 'picker']);
    // data-* attributes are exposed as camelCase keys under detail.data
    expect(cap[0].data.startDate).toBe('2026-06-01');
    expect(cap[0].data.reason).toBe('cheap');
    // data-action itself is excluded from the map
    expect(cap[0].data.action).toBeUndefined();
    // detail.picker is the core instance the web component wraps
    expect(cap[0].pickerIsInstance).toBe(true);
});
