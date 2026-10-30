import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        window.addEventListener('kurio:connection', (event: Event) => {
            (window as Window & { __kurioSocketStatus?: string }).__kurioSocketStatus = (event as CustomEvent<string>).detail;
        });
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
});

test('alteração por REST chega ao catálogo por Socket.IO, sem invalidar cache manualmente', async ({ page }) => {
    await expect.poll(() => page.evaluate(() => (window as Window & { __kurioSocketStatus?: string }).__kurioSocketStatus), { timeout: 12000 }).toBe('connected');
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
    await expect(page.getByText('1.19 ETH').first()).toBeVisible();
    const response = await page.evaluate(async () => {
        const result = await fetch('/api/dev/nfts/1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price: '1.39' }),
        });
        return result.status;
    });
    expect(response).toBe(200);
    await expect(page.getByText('1.39 ETH').first()).toBeVisible({ timeout: 10000 });
});

test('chave idempotente produz um único pedido e rejeita conteúdo divergente', async ({ page }) => {
    const result = await page.evaluate(async () => {
        const post = async (path: string, data: unknown, key?: string) => {
            const response = await fetch(`/api${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) },
                body: JSON.stringify(data),
            });
            return { status: response.status, body: await response.json() };
        };
        await post('/login', { email: 'demo@kurio.test', password: 'Demo123!' });
        await post('/cart', { nftId: '1', quantity: 1 });
        const quoteResponse = await fetch('/api/quote');
        const quote = await quoteResponse.json();
        const body = { expectedTotal: quote.total, version: quote.version, walletId: 'eth-demo' };
        const first = await post('/orders', body, 'fixed-key-retry');
        const retry = await post('/orders', body, 'fixed-key-retry');
        const mismatch = await post('/orders', { ...body, expectedTotal: '999' }, 'fixed-key-retry');
        return { first, retry, mismatch };
    });
    expect(result.first.status).toBe(202);
    expect(result.retry.body.id).toBe(result.first.body.id);
    expect(result.mismatch.status).toBe(409);
});

test('favoritos de um usuário não vazam para outro', async ({ page }) => {
    const result = await page.evaluate(async () => {
        const call = async (path: string, method = 'GET', body?: unknown) => {
            const response = await fetch(`/api${path}`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: body === undefined ? undefined : JSON.stringify(body),
            });
            return response.json();
        };
        await call('/login', 'POST', { email: 'demo@kurio.test', password: 'Demo123!' });
        await call('/favorites/1', 'POST');
        const first = await call('/favorites');
        await call('/logout', 'POST');
        await call('/login', 'POST', { email: 'alex@kurio.test', password: 'Demo123!' });
        const second = await call('/favorites');
        return { first, second };
    });
    expect(result.first.ids).toContain('1');
    expect(result.second.ids).not.toContain('1');
});
