import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
});
test('carrega catálogo e abre detalhe diretamente', async ({ page }) => {
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
    await page.getByText('Emerald Ape #042').first().click();
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible();
});
test('busca, histórico e vazio', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Buscar NFTs' }).fill('Golden Beat');
    await expect(page.getByText('Golden Beat #207').first()).toBeVisible();
    await expect(page).toHaveURL(/q=Golden/);
    await page.getByRole('textbox', { name: 'Buscar NFTs' }).fill('nao-existe-xyz');
    await expect(page.getByText('Nenhum NFT encontrado.')).toBeVisible();
    await page.goBack();
    await expect(page.getByText('Golden Beat #207').first()).toBeVisible();
});
test('filtra categoria e rede combinados', async ({ page }) => {
    const filters = page.getByRole('button', { name: 'Abrir filtros' });
    if (await filters.isVisible()) await filters.click();
    await page.getByRole('button', { name: /Arte digital/ }).first().click();
    await page.getByRole('button', { name: /Ethereum/ }).first().click();
    await expect(page).toHaveURL(/category=Arte/);
    await expect(page).toHaveURL(/network=Ethereum/);
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
    await expect(page.getByText('Sage Nomad #009')).toHaveCount(0);
});

