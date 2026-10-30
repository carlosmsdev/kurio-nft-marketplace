import { test, expect } from '@playwright/test';
test('galeria do NFT, informações e avaliação funcionam com teclado', async ({ page }) => {
    await page.goto('/nft/1');
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible();
    await page.getByRole('button', { name: 'Imagem 2 de 4' }).click();
    await expect(page.getByRole('button', { name: 'Imagem 2 de 4' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Ampliar arte digital' }).click();
    await expect(page.getByRole('dialog', { name: /Visualização ampliada/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('tab', { name: 'Avaliações de colecionadores' }).click();
    await expect(page.getByText('Colecionadora Aurora')).toBeVisible();
    await page.getByRole('tab', { name: 'Detalhes do NFT' }).click();
    await expect(page.getByText('Studio Genesis').last()).toBeVisible();
});
