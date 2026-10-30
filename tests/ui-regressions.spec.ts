import { test, expect } from '@playwright/test';

test('menu mantém apenas a seção correta ativa', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
    if (testInfo.project.name === 'chromium-mobile') {
        const mobile = page.getByRole('navigation', { name: 'Navegação mobile' });
        await expect(mobile.getByRole('link', { name: 'Início' })).toHaveClass(/active/);
        await mobile.getByRole('button', { name: 'Escanear NFT' }).click();
        await expect(page.getByRole('dialog', { name: 'Escanear NFT' })).toBeVisible();
        await page.keyboard.press('Escape');
        return;
    }
    const menu = page.getByRole('navigation', { name: 'Navegação principal' });
    await expect(menu.locator('button.nav-current')).toHaveCount(1);
    await menu.getByRole('button', { name: 'Mercado' }).click();
    await expect(menu.locator('button.nav-current')).toHaveCount(1);
    await expect(menu.locator('button.nav-current')).toHaveText('Mercado');
    await menu.getByRole('button', { name: 'Criadores' }).click();
    await expect(menu.locator('button.nav-current')).toHaveText('Criadores');
    await menu.getByRole('button', { name: 'Aprenda' }).click();
    await expect(menu.locator('button.nav-current')).toHaveText('Aprenda');
});

test('filtros preservam a posição da página', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
    if (testInfo.project.name === 'chromium-mobile') await page.getByRole('button', { name: 'Abrir filtros' }).click();
    const category = page.getByRole('complementary', { name: 'Filtros do catálogo' }).getByRole('button', { name: /Arte digital/ });
    await category.scrollIntoViewIfNeeded();
    const previous = await page.evaluate(() => window.scrollY);
    await category.click();
    await expect(category).toHaveAttribute('aria-pressed', 'true');
    const current = await page.evaluate(() => window.scrollY);
    expect(Math.abs(current - previous)).toBeLessThan(150);
});

test('cards não ultrapassam a largura disponível no mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
    const cards = page.locator('.market .nft-card');
    await expect(cards.first()).toBeVisible();
    for (const index of [0, 1, 2, 3]) {
        const box = await cards.nth(index).boundingBox();
        expect(box).not.toBeNull();
        if (box) {
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(391);
        }
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
});

test('nota leva às avaliações carregadas pelo catálogo', async ({ page }) => {
    await page.goto('/nft/1');
    await page.getByRole('button', { name: /avaliações de colecionadores/ }).click();
    await expect(page.getByRole('tab', { name: 'Avaliações de colecionadores' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Colecionadora Aurora')).toBeVisible();
});
