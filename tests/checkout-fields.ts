import type { Page } from '@playwright/test';

export async function fillCheckoutFields(page: Page) {
    await page.getByLabel('Nome ENS *').fill('colecionador.eth');
    await page.getByLabel('Código de indicação *').fill('KURIO2026');
}
