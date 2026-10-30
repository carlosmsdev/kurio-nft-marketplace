import { test, expect } from '@playwright/test';
import { fillCheckoutFields } from './checkout-fields';

test('leitor mobile abre NFT pelo ID sem navegação quebrada', async ({ page }) => {
    await page.setViewportSize({ width:390, height:844 });
    await page.goto('/');
    await page.getByRole('button',{name:'Escanear NFT'}).click();
    const dialog = page.getByRole('dialog',{name:'Escanear NFT'});
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Link do NFT ou ID da obra').fill('/nft/1');
    await dialog.getByRole('button',{name:'Abrir obra'}).click();
    await expect(page).toHaveURL(/\/nft\/1$/);
    await expect(page.getByRole('heading',{name:'Emerald Ape #042'})).toBeVisible();
});

test('checkout não permite enviar sem os campos com asterisco', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
    const add = page.locator('.nft-card').first().getByRole('button',{name:'Adicionar ao carrinho',exact:true});
    await add.click();
    await expect(add).toContainText('Adicionado');
    await page.goto('/login?redirect=%2Fcheckout');
    await page.getByLabel('E-mail', { exact: true }).fill('demo@kurio.test');
    await page.getByLabel('Senha', { exact: true }).fill('Demo123!');
    await page.getByRole('button',{name:'Entrar',exact:true}).last().click();
    await expect(page.getByRole('heading',{name:'Revisar pagamento'})).toBeVisible();
    await page.getByRole('checkbox').check();
    await expect(page.getByRole('button',{name:'Confirmar compra'})).toBeDisabled();
    await fillCheckoutFields(page);
    await page.getByRole('checkbox').check();
    await expect(page.getByRole('button',{name:'Confirmar compra'})).toBeEnabled();
});

test('avaliações carregam da API e admitem publicação com conta', async ({ page }) => {
    await page.goto('/login?redirect=%2Fnft%2F1');
    await page.getByLabel('E-mail', { exact: true }).fill('demo@kurio.test');
    await page.getByLabel('Senha', { exact: true }).fill('Demo123!');
    await page.getByRole('button',{name:'Entrar',exact:true}).last().click();
    await expect(page.getByRole('heading',{name:'Emerald Ape #042'})).toBeVisible();
    await page.getByRole('tab',{name:'Avaliações de colecionadores'}).click();
    await expect(page.getByText('Colecionadora Aurora')).toBeVisible();
    await page.getByLabel('Nota da avaliação').selectOption('4');
    await page.getByPlaceholder('O que você achou desta obra?').fill('Ótima arte e detalhes muito bem feitos.');
    await page.getByRole('button',{name:'Publicar avaliação'}).click();
    await expect(page.getByText('Ótima arte e detalhes muito bem feitos.')).toBeVisible();
});


test('perfil salva alterações obrigatórias e mantém os dados após refresh', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill('demo@kurio.test');
    await page.getByLabel('Senha', { exact: true }).fill('Demo123!');
    await page.getByRole('button',{name:'Entrar',exact:true}).last().click();
    await expect(page.getByRole('heading',{name:'Perfil do colecionador'})).toBeVisible();
    await page.getByLabel('Nome do usuário *').fill('colecionador_demo');
    await page.getByLabel('Nome ENS *').fill('colecionador.eth');
    await page.getByLabel('Apelido da carteira *').fill('Carteira principal');
    await page.getByRole('button',{name:'Salvar',exact:true}).click();
    await expect(page.getByText('Perfil atualizado')).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Nome do usuário *')).toHaveValue('colecionador_demo');
});

test('carteira existente pode ser editada sem perder informações', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill('demo@kurio.test');
    await page.getByLabel('Senha', { exact: true }).fill('Demo123!');
    await page.getByRole('button',{name:'Entrar',exact:true}).last().click();
    await expect(page.getByRole('heading',{name:'Perfil do colecionador'})).toBeVisible();
    await page.goto('/wallets');
    await expect(page.getByRole('heading',{name:'Minhas carteiras'})).toBeVisible();
    await page.getByRole('button',{name:'Editar'}).first().click();
    await page.getByLabel('Nome da carteira *').fill('Carteira Kurio');
    await page.getByRole('button',{name:'Salvar alterações'}).click();
    await expect(page.getByText('Carteira Kurio')).toBeVisible();
    await page.reload();
    await expect(page.getByText('Carteira Kurio')).toBeVisible();
});
