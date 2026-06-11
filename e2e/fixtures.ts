import { test as base } from '@playwright/test';

export { expect } from '@playwright/test';
export type { Page, Locator } from '@playwright/test';

const FIXED_TODAY = new Date('2026-05-22T10:00:00');

export const test = base.extend({
    page: async ({ page }, use) => {
        await page.clock.setFixedTime(FIXED_TODAY);
        await use(page);
    }
});
