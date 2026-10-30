import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
});
test('login, perfil e logout preservam a separação de dados', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill('demo@kurio.test');
    await page.getByLabel('Senha', { exact: true }).fill('Demo123!');
    await page.getByRole('button', { name: 'Entrar', exact: true }).last().click();
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible();
    await page.getByRole('link', { name: 'Minhas carteiras' }).click();
    await expect(page.getByText('Minha carteira')).toBeVisible();
    await page.goto('/');
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
    if ((page.viewportSize()?.width ?? 1440) <= 767) {
        const mobileNavigation = page.getByRole('navigation', { name: 'Navegação mobile' });
        await expect(mobileNavigation).toBeVisible();
        await mobileNavigation.getByRole('link', { name: 'Meu perfil' }).click();
        await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible();
        await page.getByRole('button', { name: 'Sair da conta' }).click();
    } else {
        await page.getByRole('button', { name: 'Sair', exact: true }).click();
    }
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(async () => page.evaluate(async () => {
        const response = await fetch('/api/session');
        return (await response.json()) === null;
    })).toBe(true);
    await page.goto('/wallets');
    await expect(page.getByText('Entre para acessar sua conta')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Fazer login' })).toBeVisible();
});
test('cadastro valida conflito de e-mail e permite usuário novo', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Nome completo').fill('Visitante Teste');
    await page.getByLabel('E-mail', { exact: true }).fill('demo@kurio.test');
    await page.getByLabel('Senha', { exact: true }).fill('MinhaSenha123!');
    await page.getByPlaceholder('Confirmar senha').fill('MinhaSenha123!');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.getByRole('alert')).toContainText('E-mail já cadastrado');
    await page.getByLabel('E-mail', { exact: true }).fill(`novo-${Date.now()}@kurio.test`);
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible();
});
test('senha incorreta exibe erro e não autentica', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill('demo@kurio.test');
    await page.getByLabel('Senha', { exact: true }).fill('senha-incorreta');
    await page.getByRole('button', { name: 'Entrar', exact: true }).last().click();
    await expect(page.getByRole('alert')).toContainText('E-mail ou senha inválidos');
});
test('sessão expirada impede acessar dados privados', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill('demo@kurio.test');
    await page.getByLabel('Senha', { exact: true }).fill('Demo123!');
    await page.getByRole('button', { name: 'Entrar', exact: true }).last().click();
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible();
    await page.evaluate(async () => {
        await fetch('/api/dev/scenario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario: 'session-expired' }) });
    });
    await page.goto('/wallets');
    await expect(page.getByText('Entre para acessar sua conta')).toBeVisible();
});
test('carteira pode ser desconectada e reconectada', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill('demo@kurio.test');
    await page.getByLabel('Senha', { exact: true }).fill('Demo123!');
    await page.getByRole('button', { name: 'Entrar', exact: true }).last().click();
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible();
    await page.goto('/wallets');
    await expect(page.getByRole('heading', { name: 'Minhas carteiras' })).toBeVisible();
    await page.getByRole('button', { name: 'Desconectar' }).click();
    await expect(page.getByRole('button', { name: 'Conectar', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Conectar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Desconectar' })).toBeVisible();
});


test('modal segue as abas do Figma, confirma senha e permite fechar com Escape', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByPlaceholder('contato@email.com')).toBeVisible();
    await page.getByRole('button', { name: 'Mostrar conteúdo' }).click();
    await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute('type', 'text');
    await page.getByRole('link', { name: 'Criar conta' }).click();
    await expect(page.getByPlaceholder('Nome de usuário')).toBeVisible();
    await page.getByLabel('Nome completo').fill('Conta Visual');
    await page.getByLabel('E-mail', { exact: true }).fill('conta@kurio.test');
    await page.getByLabel('Senha', { exact: true }).fill('Senha1234!');
    await page.getByPlaceholder('Confirmar senha').fill('SenhaDiferente!');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.getByRole('alert')).toContainText('As senhas não coincidem');
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/$/);
});

test('modal de login não bloqueia a rolagem e exibe a Home funcional', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /SEJA DONO DO FUTURO/ })).toBeVisible();
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
    await page.evaluate(() => window.scrollTo(0, 650));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await page.getByRole('link', { name: 'Fechar janela' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
});
