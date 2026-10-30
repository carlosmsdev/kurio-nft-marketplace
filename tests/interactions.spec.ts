import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
});
test('favoritos exigem login e persistem após atualização', async ({ page }) => {
    await page.locator('.nft-card').first().getByRole('button', { name: 'Adicionar aos favoritos' }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel('E-mail', { exact: true }).fill('demo@kurio.test');
    await page.getByLabel('Senha', { exact: true }).fill('Demo123!');
    await page.getByRole('button', { name: 'Entrar', exact: true }).last().click();
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible();
    await page.goto('/');
    await page.locator('.nft-card').first().getByRole('button', { name: 'Adicionar aos favoritos' }).click();
    await expect(page.locator('.nft-card').first().getByRole('button', { name: 'Remover favorito' })).toBeVisible();
    await page.reload();
    await expect(page.locator('.nft-card').first().getByRole('button', { name: 'Remover favorito' })).toBeVisible();
});
test('carrinho persiste após login e alteração da quantidade', async ({ page }) => {
    await page.locator('.nft-card').first().getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
    await expect(page.locator('.nft-card').first().getByRole('button', { name: 'Adicionar ao carrinho', exact: true })).toContainText('Adicionado');
    await page.goto('/cart');
    await page.getByRole('button', { name: 'Aumentar Emerald Ape #042' }).click();
    await page.reload();
    await expect(page.locator('.cart-item').first()).toContainText('Emerald Ape #042');
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill('demo@kurio.test');
    await page.getByLabel('Senha', { exact: true }).fill('Demo123!');
    await page.getByRole('button', { name: 'Entrar', exact: true }).last().click();
    await page.goto('/cart');
    await expect(page.locator('.cart-item').first()).toContainText('Emerald Ape #042');
    await page.getByRole('button', { name: 'Remover Emerald Ape #042' }).click();
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible();
});
test('um NFT inexistente mostra página de recuperação', async ({ page }) => {
    await page.goto('/nft/id-inexistente');
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible();
    await page.getByRole('link', { name: 'Voltar ao catálogo' }).click();
    await expect(page.getByRole('heading', { name: 'SEJA DONO DO FUTURO DA ARTE DIGITAL' })).toBeVisible();
});
test('navegação por teclado é funcional e tem foco visível', async ({ page }) => {
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus-visible');
    await expect(focused).toHaveCount(1);
    await expect(focused).toHaveCSS('outline-style', 'solid');
});
test('não apresenta rolagem horizontal nas principais larguras', async ({ page }) => {
    for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 850 });
        await page.goto('/');
        await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
        expect(overflow).toBe(false);
    }
});


test('perfil mostra obras favoritas persistentes em uma seção própria', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill('demo@kurio.test');
    await page.getByLabel('Senha', { exact: true }).fill('Demo123!');
    await page.getByRole('button', { name: 'Entrar', exact: true }).last().click();
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible();
    await page.goto('/');
    await page.locator('.nft-card').first().getByRole('button', { name: 'Adicionar aos favoritos' }).click();
    await expect(page.locator('.nft-card').first().getByRole('button', { name: 'Remover favorito' })).toBeEnabled();
    await page.goto('/account');
    const favorites = page.locator('.collection-section').filter({ hasText: 'Obras favoritas' });
    await expect(favorites.getByText('Emerald Ape #042')).toBeVisible();
    await page.reload();
    await expect(favorites.getByText('Emerald Ape #042')).toBeVisible();
});

test('página de detalhe permite iniciar a compra diretamente', async ({ page }) => {
    await page.goto('/nft/1');
    await page.getByRole('button', { name: 'Comprar agora' }).click();
    await expect(page.getByText('Faça login para finalizar')).toBeVisible();
});
