import { fillCheckoutFields } from './checkout-fields';
import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
});
test('carrinho, login e compra simulada com recibo', async ({ page }) => {
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
    await page.locator('.nft-card').first().getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
    await expect(page.locator('.nft-card').first().getByRole('button', { name: 'Adicionar ao carrinho', exact: true })).toContainText('Adicionado');
    await page.getByRole('link', { name: 'Abrir carrinho' }).click();
    await expect(page.getByRole('heading', { name: 'Carrinho de NFTs' })).toBeVisible();
    await page.getByRole('link', { name: /Conectar e finalizar/ }).click();
    await page.getByRole('link', { name: 'Fazer login' }).click();
    await page.getByLabel('E-mail', { exact: true }).fill('demo@kurio.test');
    await page.getByLabel('Senha', { exact: true }).fill('Demo123!');
    await page.getByRole('button', { name: 'Entrar', exact: true }).last().click();
    await expect(page.getByRole('heading', { name: 'Revisar pagamento' })).toBeVisible();
    await fillCheckoutFields(page);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Confirmar compra' }).click();
    await expect(page.getByText('Pedido confirmado')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Emerald Ape #042')).toBeVisible();
});
test('cupom válido altera o resumo do pedido', async ({ page }) => {
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
    await page.locator('.nft-card').first().getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
    await expect(page.locator('.nft-card').first().getByRole('button', { name: 'Adicionar ao carrinho', exact: true })).toContainText('Adicionado');
    await page.getByRole('link', { name: 'Abrir carrinho' }).click();
    await page.getByRole('textbox', { name: 'Cupom' }).fill('SAVE10');
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await expect(page.getByText('Remover cupom SAVE10')).toBeVisible();
    await expect(page.getByText('0.119 ETH')).toBeVisible();
});

