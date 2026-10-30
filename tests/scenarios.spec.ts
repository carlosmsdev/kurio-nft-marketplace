import { fillCheckoutFields } from './checkout-fields';
import { test, expect } from '@playwright/test';
async function scenario(page: import('@playwright/test').Page, name: string) {
    await page.evaluate(async (scenario) => {
        const response = await fetch('/api/dev/scenario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario }) });
        if (!response.ok)
            throw Error('Não foi possível ativar o cenário');
    }, name);
}
test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
});
test('rede indisponível exibe erro e recuperação', async ({ page }) => {
    await scenario(page, 'server-error');
    await page.reload();
    await expect(page.getByText('Serviço de catálogo indisponível. Tente novamente.')).toBeVisible();
    await scenario(page, 'normal');
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
});
test('pedido com pagamento recusado preserva o carrinho', async ({ page }) => {
    await page.locator('.nft-card').first().getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
    await expect(page.locator('.nft-card').first().getByRole('button', { name: 'Adicionar ao carrinho', exact: true })).toContainText('Adicionado');
    await page.goto('/login?redirect=%2Fcheckout');
    await page.getByLabel('E-mail', { exact: true }).fill('demo@kurio.test');
    await page.getByLabel('Senha', { exact: true }).fill('Demo123!');
    await page.getByRole('button', { name: 'Entrar', exact: true }).last().click();
    await expect(page.getByRole('heading', { name: 'Revisar pagamento' })).toBeVisible();
    await scenario(page, 'decline');
    await fillCheckoutFields(page);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Confirmar compra' }).click();
    await expect(page.getByText('Pagamento recusado')).toBeVisible({ timeout: 15000 });
    await page.goto('/cart');
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
});
test('timeout após criação recupera o mesmo pedido', async ({ page }) => {
    await page.locator('.nft-card').first().getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
    await expect(page.locator('.nft-card').first().getByRole('button', { name: 'Adicionar ao carrinho', exact: true })).toContainText('Adicionado');
    await page.goto('/login?redirect=%2Fcheckout');
    await page.getByLabel('E-mail', { exact: true }).fill('demo@kurio.test');
    await page.getByLabel('Senha', { exact: true }).fill('Demo123!');
    await page.getByRole('button', { name: 'Entrar', exact: true }).last().click();
    await scenario(page, 'timeout');
    await fillCheckoutFields(page);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Confirmar compra' }).click();
    await expect(page.getByText('Pedido confirmado')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Emerald Ape #042')).toBeVisible();
});
test('alteração de preço exige revisar cotação novamente', async ({ page }) => {
    await page.locator('.nft-card').first().getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
    await expect(page.locator('.nft-card').first().getByRole('button', { name: 'Adicionar ao carrinho', exact: true })).toContainText('Adicionado');
    await page.goto('/login?redirect=%2Fcheckout');
    await page.getByLabel('E-mail', { exact: true }).fill('demo@kurio.test');
    await page.getByLabel('Senha', { exact: true }).fill('Demo123!');
    await page.getByRole('button', { name: 'Entrar', exact: true }).last().click();
    await page.getByRole('checkbox').check();
    const responseStatus = await page.evaluate(async () => { const response = await fetch('/api/dev/nfts/1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ price: '1.39' }) }); return response.status; });
    expect(responseStatus).toBe(200);
    await expect(page.getByRole('checkbox')).not.toBeChecked({ timeout: 12000 });
    await expect(page.getByRole('complementary').getByText('1.39 ETH', { exact: true }).first()).toBeVisible({ timeout: 12000 });
});
test('cenário de falha pode ser restaurado pela API simulada sem interface de laboratório', async ({ page }) => {
    await scenario(page, 'server-error');
    await page.reload();
    await expect(page.getByRole('alert')).toContainText('Serviço de catálogo indisponível');
    await scenario(page, 'normal');
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
});
