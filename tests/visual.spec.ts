import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
});
test('home visual', async ({ page }) => {
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
    await expect(page).toHaveScreenshot('home.png', { fullPage: true, animations: 'disabled' });
});
test('detalhe visual', async ({ page }) => {
    await page.goto('/nft/1');
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible();
    await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true, animations: 'disabled' });
});
test('carrinho visual', async ({ page }) => {
    await page.locator('.nft-card').first().getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
    await expect(page.locator('.nft-card').first().getByRole('button', { name: 'Adicionar ao carrinho', exact: true })).toContainText('Adicionado');
    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: 'Carrinho de NFTs' })).toBeVisible();
    await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true, animations: 'disabled' });
});
test('checkout visual', async ({ page }) => {
    await page.locator('.nft-card').first().getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
    await expect(page.locator('.nft-card').first().getByRole('button', { name: 'Adicionar ao carrinho', exact: true })).toContainText('Adicionado');
    await page.goto('/login?redirect=%2Fcheckout');
    await page.getByLabel('E-mail', { exact: true }).fill('demo@kurio.test');
    await page.getByLabel('Senha', { exact: true }).fill('Demo123!');
    await page.getByRole('button', { name: 'Entrar', exact: true }).last().click();
    await expect(page.getByRole('heading', { name: 'Revisar pagamento' })).toBeVisible();
    await expect(page).toHaveScreenshot('checkout.png', { fullPage: true, animations: 'disabled' });
});

