import { test, expect, Page, Locator } from './fixtures';

/**
 * Form association. `<web-daterangepicker>` is a form-associated custom element
 * (`static formAssociated = true`): it exposes `el.form` (via core's
 * BlissElement), submits its formatted value under its `name`, and clears with
 * `form.reset()`. This is the surface host frameworks depend on — e.g. Phoenix
 * LiveView resolves the parent form via `event.target.form`.
 *
 * Real Chromium wires ElementInternals fully (jsdom does not), so these assert
 * the actual browser behaviour.
 *
 * Fixture: test/form-association.html
 */

const PAGE = '/test/form-association.html';

function inputOf(p: Locator) {
    return p.locator('input');
}

function dayByDate(p: Locator, isoDate: string) {
    return p.locator(`.drp__day[data-date="${isoDate}"]`);
}

function formValue(page: Page) {
    return page.evaluate(() => new FormData(document.getElementById('f') as HTMLFormElement).get('range'));
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('el.form resolves the containing form (and event.target.form does too)', async ({ page }) => {
    const resolved = await page.locator('#picker').evaluate((el: any) => {
        const byGetter = el.form === document.getElementById('f');
        // event.target.form — the exact shape LiveView's phx-change reads.
        const byEventTarget = ({ target: el }).target.form === document.getElementById('f');
        return { byGetter, byEventTarget };
    });
    expect(resolved.byGetter).toBe(true);
    expect(resolved.byEventTarget).toBe(true);
});

test('selecting a date submits the formatted value under the name', async ({ page }) => {
    const p = page.locator('#picker');

    // Nothing selected yet → empty form value.
    expect(await formValue(page)).toBe('');

    await inputOf(p).click();
    await dayByDate(p, '2026-06-15').click();

    expect(await formValue(page)).toBe('2026-06-15');
});

test('a programmatic value is reflected into the form submission', async ({ page }) => {
    await page.locator('#picker').evaluate(async (el: any) => {
        el.value = '2026-07-04';
        await el.whenSettled();
    });
    expect(await formValue(page)).toBe('2026-07-04');
});

test('form.reset() clears the selection and the submitted value', async ({ page }) => {
    const p = page.locator('#picker');

    await inputOf(p).click();
    await dayByDate(p, '2026-06-15').click();
    expect(await formValue(page)).toBe('2026-06-15');

    await page.locator('#reset').click();

    expect(await formValue(page)).toBe('');
    await expect(inputOf(p)).toHaveValue('');
});
