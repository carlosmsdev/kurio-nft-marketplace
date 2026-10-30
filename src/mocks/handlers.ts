import { delay, http, HttpResponse } from 'msw';
import { cartOwner, getUser, readDb, resetDb, saveDb, type DB } from './db';
import { emitNftUpdated, emitOrderUpdated, socketHandlers } from './socket';
import { fromWei, toWei } from '../lib/eth';
import type { Account, CartLine, Order, Quote, Wallet } from '../types';
const error = (message: string, status = 400) => HttpResponse.json({ message }, { status });
const publicUser = (user: Account): Account => ({ id: user.id, name: user.name, email: user.email, avatar: user.avatar, username:user.username, ens:user.ens, nickname:user.nickname });
const auth = (db: DB) => getUser(db);
const hash = async (password: string, salt: string) => {
    const encoded = new TextEncoder().encode(`${salt}:${password}`);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};
const mergeCarts = (db: DB, a: CartLine[], b: CartLine[]) => {
    const lines = new Map(a.map(x => [x.nftId, { ...x }]));
    for (const line of b) {
        const nft = db.nfts.find(n => n.id === line.nftId);
        if (!nft)
            continue;
        const qty = Math.min(nft.available, (lines.get(line.nftId)?.quantity ?? 0) + line.quantity);
        if (qty > 0)
            lines.set(line.nftId, { nftId: line.nftId, quantity: qty });
    }
    return [...lines.values()];
};
const quote = (db: DB): Quote => {
    const owner = cartOwner(db);
    const items = (db.carts[owner] ?? []).flatMap(line => {
        const nft = db.nfts.find(n => n.id === line.nftId);
        return nft ? [{ nft, quantity: line.quantity, lineTotal: fromWei(toWei(nft.price) * BigInt(line.quantity)) }] : [];
    });
    const subtotal = items.reduce((sum, item) => sum + toWei(item.lineTotal), 0n);
    const couponCode = db.coupons[owner] ?? null;
    const discount = couponCode === 'SAVE10' ? subtotal / 10n : 0n;
    const networkFee = items.length ? toWei('0.02') : 0n;
    const version = items.map(i => `${i.nft.id}:${i.nft.version}:${i.quantity}`).join('|') + `|${couponCode ?? ''}`;
    return { items, subtotal: fromWei(subtotal), discount: fromWei(discount), networkFee: fromWei(networkFee), total: fromWei(subtotal - discount + networkFee), couponCode, version };
};
function settleOrder(db: DB, id: string) {
    const order = db.orders[id];
    if (order?.status === 'pending' && Date.now() >= order.dueAt) {
        order.status = order.outcome;
        order.version++;
        if (order.status === 'confirmed') {
            for (const item of order.quote.items) {
                const nft = db.nfts.find(n => n.id === item.nft.id);
                if (nft) {
                    nft.available = Math.max(0, nft.available - item.quantity);
                    nft.version++;
                    emitNftUpdated({ id: nft.id, price: nft.price, available: nft.available, version: nft.version });
                }
            }
            db.carts[order.ownerId] = (db.carts[order.ownerId] ?? []).flatMap(line => {
                const bought = order.quote.items.find(i => i.nft.id === line.nftId)?.quantity ?? 0;
                return line.quantity > bought ? [{ ...line, quantity: line.quantity - bought }] : [];
            });
        }
        saveDb(db);
        emitOrderUpdated({ id: order.id, userId: order.ownerId, status: order.status, version: order.version });
    }
    return order;
}
export const handlers = [
    ...socketHandlers,
    http.get('/api/nfts/:id/reviews', ({ params }) => {
        const db = readDb();
        const nft = db.nfts.find(item => item.id === String(params.id));
        if (!nft) return error('NFT não encontrado', 404);
        const items = db.reviews[nft.id] ?? [];
        return HttpResponse.json({ items, total: items.length, average: items.length ? Math.round(items.reduce((sum,item)=>sum+item.rating,0)/items.length*10)/10 : 0 });
    }),
    http.post('/api/nfts/:id/reviews', async ({ params, request }) => {
        const db = readDb();
        const user = auth(db);
        if (!user) return error('Entre para avaliar esta obra', 401);
        if (!db.nfts.some(item => item.id === String(params.id))) return error('NFT não encontrado', 404);
        const body = await request.json() as {rating?:number;text?:string};
        if (!Number.isInteger(body.rating) || (body.rating??0)<1 || (body.rating??0)>5 || typeof body.text!=='string' || body.text.trim().length<10 || body.text.trim().length>500) return error('Informe uma nota e comentário válido',422);
        const items = db.reviews[String(params.id)] ?? [];
        if (items.some(review=>review.ownerId===user.id)) return error('Você já avaliou esta obra',409);
        const item = {id:crypto.randomUUID(),ownerId:user.id,author:user.name,rating:body.rating!,text:body.text.trim(),createdAt:new Date().toISOString()};
        db.reviews[String(params.id)] = [item,...items];
        saveDb(db);
        return HttpResponse.json(item,{status:201});
    }),
    http.get('/api/nfts', async ({ request }) => {
        const url = new URL(request.url);
        const db = readDb();
        if (db.scenario === 'offline')
            return HttpResponse.error();
        if (db.scenario === 'server-error')
            return error('Serviço de catálogo indisponível. Tente novamente.', 503);
        if (db.scenario === 'slow')
            await delay(1200);
        else
            await delay(120);
        const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
        const category = url.searchParams.get('category') ?? '';
        const network = url.searchParams.get('network') ?? '';
        const sort = url.searchParams.get('sort') ?? 'recent';
        const requestedPage = Number(url.searchParams.get('page') ?? 1);
        const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
        const min = url.searchParams.get('min');
        const max = url.searchParams.get('max');
        try {
            if (min !== null)
                toWei(min);
            if (max !== null)
                toWei(max);
        }
        catch {
            return error('Faixa de preço inválida', 422);
        }
        const results = db.nfts.filter(n => (!q || `${n.name} ${n.creator}`.toLowerCase().includes(q)) && (!category || n.category === category) && (!network || n.network === network) && (min === null || toWei(n.price) >= toWei(min)) && (max === null || toWei(n.price) <= toWei(max)));
        if (sort === 'new') results.sort((a, b) => Number(b.id) - Number(a.id));
        if (sort === 'popular') results.sort((a, b) => b.available - a.available);
        if (sort === 'low')
            results.sort((a, b) => toWei(a.price) < toWei(b.price) ? -1 : 1);
        if (sort === 'high')
            results.sort((a, b) => toWei(a.price) > toWei(b.price) ? -1 : 1);
        const total = results.length;
        const pages = Math.max(1, Math.ceil(total / 9));
        return HttpResponse.json({ items: results.slice((page - 1) * 9, page * 9), total, pages });
    }),
    http.get('/api/collections', () => {
        const nfts = readDb().nfts;
        const categories: Record<string, number> = {}, networks: Record<string, number> = {};
        for (const nft of nfts) {
            categories[nft.category] = (categories[nft.category] ?? 0) + 1;
            networks[nft.network] = (networks[nft.network] ?? 0) + 1;
        }
        return HttpResponse.json({ categories, networks });
    }),
    http.get('/api/nfts/:id', ({ params }) => {
        const nft = readDb().nfts.find(n => n.id === String(params.id));
        return nft ? HttpResponse.json(nft) : error('NFT não encontrado', 404);
    }),
    http.get('/api/session', () => {
        const db = readDb();
        if (db.scenario === 'session-expired') {
            db.sessionExpiresAt = 0;
            saveDb(db);
        }
        const user = auth(db);
        return HttpResponse.json(user ? { user: publicUser(user) } : null);
    }),
    http.post('/api/login', async ({ request }) => {
        const data = await request.json() as {
            email: string;
            password: string;
        };
        const db = readDb();
        const user = db.users.find(u => u.email.toLowerCase() === data.email?.toLowerCase());
        if (!user || await hash(data.password ?? '', user.salt) !== user.passwordHash)
            return error('E-mail ou senha inválidos', 401);
        db.sessionId = user.id;
        db.sessionExpiresAt = Date.now() + 60 * 60 * 1000;
        db.scenario = 'normal';
        db.carts[user.id] = mergeCarts(db, db.carts[user.id] ?? [], db.carts.guest ?? []);
        db.carts.guest = [];
        db.coupons[user.id] ??= db.coupons.guest ?? null;
        db.coupons.guest = null;
        saveDb(db);
        return HttpResponse.json({ user: publicUser(user) });
    }),
    http.post('/api/register', async ({ request }) => {
        const data = await request.json() as {
            name: string;
            email: string;
            password: string;
        };
        if (!data.name?.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email ?? '') || (data.password?.length ?? 0) < 8)
            return error('Confira nome, e-mail e senha de no mínimo 8 caracteres', 422);
        const db = readDb();
        if (db.users.some(u => u.email.toLowerCase() === data.email.toLowerCase()))
            return error('E-mail já cadastrado', 409);
        const id = crypto.randomUUID();
        const salt = crypto.randomUUID();
        const user = { id, salt, name: data.name.trim(), email: data.email.toLowerCase(), avatar: '', passwordHash: await hash(data.password, salt) };
        db.users.push(user);
        db.sessionId = id;
        db.sessionExpiresAt = Date.now() + 3600000;
        db.scenario = 'normal';
        db.carts[id] = mergeCarts(db, [], db.carts.guest ?? []);
        db.carts.guest = [];
        db.favorites[id] = [];
        db.wallets[id] = [];
        saveDb(db);
        return HttpResponse.json({ user: publicUser(user) }, { status: 201 });
    }),
    http.post('/api/logout', () => { const db = readDb(); db.sessionId = null; db.sessionExpiresAt = 0; saveDb(db); return HttpResponse.json({ ok: true }); }),
    http.get('/api/cart', () => { const db = readDb(); return HttpResponse.json({ items: db.carts[cartOwner(db)] ?? [] }); }),
    http.post('/api/cart', async ({ request }) => {
        const { nftId, quantity } = await request.json() as {
            nftId: string;
            quantity: number;
        };
        const db = readDb(), nft = db.nfts.find(n => n.id === nftId);
        if (!nft)
            return error('NFT inexistente', 404);
        const owner = cartOwner(db), lines = db.carts[owner] ?? [], current = lines.find(i => i.nftId === nftId);
        const updated = (current?.quantity ?? 0) + quantity;
        if (!Number.isInteger(quantity) || quantity < 1 || updated > nft.available)
            return error('Quantidade indisponível', 409);
        if (current)
            current.quantity = updated;
        else
            lines.push({ nftId, quantity });
        db.carts[owner] = lines;
        saveDb(db);
        return HttpResponse.json({ items: lines });
    }),
    http.patch('/api/cart/:id', async ({ params, request }) => {
        const { quantity } = await request.json() as {
            quantity: number;
        };
        const db = readDb(), owner = cartOwner(db), nft = db.nfts.find(n => n.id === params.id);
        if (!nft || !Number.isInteger(quantity) || quantity < 1 || quantity > nft.available)
            return error('Quantidade indisponível', 409);
        const lines = db.carts[owner] ?? [], item = lines.find(i => i.nftId === params.id);
        if (!item)
            return error('Item não encontrado', 404);
        item.quantity = quantity;
        saveDb(db);
        return HttpResponse.json({ items: lines });
    }),
    http.delete('/api/cart/:id', ({ params }) => {
        const db = readDb(), owner = cartOwner(db);
        db.carts[owner] = (db.carts[owner] ?? []).filter(x => x.nftId !== params.id);
        saveDb(db);
        return HttpResponse.json({ items: db.carts[owner] });
    }),
    http.get('/api/quote', () => HttpResponse.json(quote(readDb()))),
    http.post('/api/coupon', async ({ request }) => {
        const { code } = await request.json() as {
            code: string;
        };
        const normalized = code.trim().toUpperCase();
        if (normalized === 'EXPIRED')
            return error('Cupom expirado', 422);
        if (normalized !== 'SAVE10')
            return error('Cupom inválido', 422);
        const db = readDb();
        db.coupons[cartOwner(db)] = normalized;
        saveDb(db);
        return HttpResponse.json(quote(db));
    }),
    http.delete('/api/coupon', () => { const db = readDb(); db.coupons[cartOwner(db)] = null; saveDb(db); return HttpResponse.json(quote(db)); }),
    http.get('/api/favorites', () => { const db = readDb(), u = auth(db); if (!u) return error('Faça login', 401); const ids = db.favorites[u.id] ?? []; return HttpResponse.json({ ids, items: ids.flatMap(id => { const nft = db.nfts.find(item => item.id === id); return nft ? [nft] : []; }) }); }),
    http.post('/api/favorites/:id', ({ params }) => {
        const db = readDb(), u = auth(db);
        if (!u)
            return error('Faça login', 401);
        const id = String(params.id);
        if (!db.nfts.some(n => n.id === id))
            return error('NFT não encontrado', 404);
        const favorites = db.favorites[u.id] ?? [];
        if (!favorites.includes(id))
            favorites.push(id);
        db.favorites[u.id] = favorites;
        saveDb(db);
        return HttpResponse.json({ ids: favorites });
    }),
    http.delete('/api/favorites/:id', ({ params }) => {
        const db = readDb(), u = auth(db);
        if (!u)
            return error('Faça login', 401);
        const favorites = (db.favorites[u.id] ?? []).filter(id => id !== params.id);
        db.favorites[u.id] = favorites;
        saveDb(db);
        return HttpResponse.json({ ids: favorites });
    }),
    http.get('/api/profile', () => { const db = readDb(), u = auth(db); return u ? HttpResponse.json(publicUser(u)) : error('Sessão expirada', 401); }),
    http.patch('/api/profile', async ({ request }) => {
        const db = readDb(), u = auth(db);
        if (!u)
            return error('Sessão expirada', 401);
        const { name, email, avatar, username, ens, nickname } = await request.json() as {
            email?: string;
            name: string;
            avatar: string;
            username?: string;
            ens?: string;
            nickname?: string;
        };
        if (!name?.trim() || name.length > 80)
            return error('Informe um nome válido', 422);
        if (!username?.trim() || !nickname?.trim() || !ens?.trim()) return error('Preencha os campos obrigatórios do perfil', 422);
        if (username && !/^[a-zA-Z0-9_.-]{3,24}$/.test(username.trim()))
            return error('O nome de usuário deve ter de 3 a 24 caracteres, sem espaços', 422);
        if (ens && !/^[a-z0-9-]+\.eth$/.test(ens.trim().toLowerCase()))
            return error('Use um nome ENS com final .eth', 422);
        if (email && (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || db.users.some(item=>item.id!==u.id && item.email.toLowerCase()===email.trim().toLowerCase())))
            return error('E-mail inválido ou já cadastrado',422);
        if (email) u.email = email.trim().toLowerCase();
        u.name = name.trim();
        u.avatar = avatar?.slice(0, 800000) ?? '';
        u.username = username?.trim() ?? '';
        u.ens = ens?.trim().toLowerCase() ?? '';
        u.nickname = nickname?.trim().slice(0,60) ?? '';
        saveDb(db);
        return HttpResponse.json(publicUser(u));
    }),
    http.patch('/api/profile/password', async ({ request }) => {
        const db = readDb(), u = auth(db);
        if (!u)
            return error('Sessão expirada', 401);
        const { currentPassword, newPassword } = await request.json() as {
            currentPassword: string;
            newPassword: string;
        };
        if (await hash(currentPassword ?? '', u.salt) !== u.passwordHash)
            return error('Senha atual incorreta', 422);
        if ((newPassword?.length ?? 0) < 8)
            return error('A nova senha deve conter pelo menos 8 caracteres', 422);
        u.salt = crypto.randomUUID();
        u.passwordHash = await hash(newPassword, u.salt);
        saveDb(db);
        return HttpResponse.json({ ok: true });
    }),
    http.get('/api/wallets', () => { const db = readDb(), u = auth(db); return u ? HttpResponse.json({ items: db.wallets[u.id] ?? [] }) : error('Faça login', 401); }),
    http.post('/api/wallets', async ({ request }) => {
        const db = readDb(), u = auth(db);
        if (!u)
            return error('Faça login', 401);
        const data = await request.json() as {
            name: string;
            address: string;
            network: string;
            primary?: boolean;
            provider?: string;
            alias?: string;
            profileName?: string;
            email?: string;
            referral?: string;
            ens?: string;
            secondaryAddress?: string;
        };
        if (!data.alias?.trim() || !data.profileName?.trim() || !data.referral?.trim() || data.referral.trim().length<3 || !data.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email) || !/^[a-zA-Z0-9-]{2,40}\.eth$/.test(data.ens??'')) return error('Preencha os campos obrigatórios da carteira', 422);
        if (!data.name?.trim() || (data.provider && !['MetaMask','WalletConnect','Coinbase Wallet'].includes(data.provider)) || !['Ethereum', 'Polygon', 'Solana'].includes(data.network) || (data.network === 'Solana' ? !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(data.address) : !/^0x[a-fA-F0-9]{40}$/.test(data.address)))
            return error('Verifique nome, endereço da carteira e rede selecionada', 422);
        const items = db.wallets[u.id] ?? [];
        if (items.some(w => w.address === data.address))
            return error('Carteira já cadastrada', 409);
        if (data.primary || items.length === 0)
            items.forEach(w => w.primary = false);
        const wallet: Wallet = { id: crypto.randomUUID(), name: data.name.trim(), address: data.address, network: data.network, primary: data.primary || items.length === 0, connected: false, provider:data.provider??'MetaMask', alias:data.alias?.trim(), profileName:data.profileName?.trim(), email:data.email?.trim(), referral:data.referral?.trim(), ens:data.ens?.trim(), secondaryAddress:data.secondaryAddress?.trim() };
        items.push(wallet);
        db.wallets[u.id] = items;
        saveDb(db);
        return HttpResponse.json(wallet, { status: 201 });
    }),
    http.patch('/api/wallets/:id', async ({ request, params }) => {
        const db = readDb(), u = auth(db);
        if (!u)
            return error('Faça login', 401);
        const items = db.wallets[u.id] ?? [], wallet = items.find(w => w.id === params.id);
        if (!wallet)
            return error('Carteira não encontrada', 404);
        const { name, primary, address, network, provider } = await request.json() as {
            name?: string;
            primary?: boolean;
            address?: string;
            network?: string;
            provider?: string;
        };
        if (name !== undefined) {
            if (!name.trim())
                return error('Informe um nome', 422);
            wallet.name = name.trim();
        }
        if (address !== undefined || network !== undefined || provider !== undefined) {
            const updatedNetwork = network??wallet.network;
            const updatedAddress = address??wallet.address;
            const updatedProvider = provider??wallet.provider??'MetaMask';
            if (!['Ethereum','Polygon','Solana'].includes(updatedNetwork) || !['MetaMask','WalletConnect','Coinbase Wallet'].includes(updatedProvider) || (updatedNetwork==='Solana'?!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(updatedAddress):!/^0x[a-fA-F0-9]{40}$/.test(updatedAddress))) return error('Verifique rede, endereço e tipo de carteira',422);
            if (items.some(item=>item.id!==wallet.id && item.address===updatedAddress)) return error('Carteira já cadastrada',409);
            if (updatedNetwork!==wallet.network || updatedAddress!==wallet.address) wallet.connected=false;
            wallet.address=updatedAddress;
            wallet.network=updatedNetwork;
            wallet.provider=updatedProvider;
        }
        if (primary) {
            items.forEach(w => w.primary = false);
            wallet.primary = true;
        }
        saveDb(db);
        return HttpResponse.json(wallet);
    }),
    http.post('/api/wallets/:id/connect', ({ params }) => {
        const db = readDb(), user = auth(db);
        if (!user)
            return error('Faça login', 401);
        const wallet = (db.wallets[user.id] ?? []).find(item => item.id === params.id);
        if (!wallet)
            return error('Carteira não encontrada', 404);
        if (db.scenario === 'wallet-rejected')
            return error('Conexão de carteira recusada na simulação', 409);
        wallet.connected = true;
        saveDb(db);
        return HttpResponse.json(wallet);
    }),
    http.post('/api/wallets/:id/disconnect', ({ params }) => {
        const db = readDb(), user = auth(db);
        if (!user)
            return error('Faça login', 401);
        const wallet = (db.wallets[user.id] ?? []).find(item => item.id === params.id);
        if (!wallet)
            return error('Carteira não encontrada', 404);
        wallet.connected = false;
        saveDb(db);
        return HttpResponse.json(wallet);
    }),
    http.post('/api/orders', async ({ request }) => {
        const db = readDb(), u = auth(db);
        if (!u)
            return error('Faça login para finalizar', 401);
        const key = request.headers.get('Idempotency-Key');
        if (!key)
            return error('Chave de idempotência obrigatória', 400);
        const body = await request.json() as {
            expectedTotal: string;
            version: string;
            walletId: string;
            collector?: {name:string;email:string;username?:string;profile?:string;ens?:string;referralCode?:string;walletAlias?:string;secondaryWallet?:string;walletNetwork?:string;walletProvider?:string;walletAddress?:string;note?:string};
        };
        if (body.collector && (!body.collector.name?.trim() || body.collector.name.length > 80 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.collector.email)))
            return error('Confira os dados do colecionador', 422);
        if (body.collector && (!body.collector.username?.trim() || !body.collector.profile?.trim() || !body.collector.referralCode?.trim() || body.collector.referralCode.trim().length<3 || !/^[a-zA-Z0-9-]{2,40}\.eth$/.test(body.collector.ens??'') || !body.collector.walletAlias?.trim() || !body.collector.walletProvider?.trim() || !body.collector.walletNetwork?.trim()))
            return error('Preencha todos os campos obrigatórios do colecionador',422);
        const wallet = db.wallets[u.id]?.find(w=>w.id===body.walletId);
        if (body.collector && (!wallet || wallet.address!==body.collector.walletAddress || wallet.network!==body.collector.walletNetwork))
            return error('A rede ou a carteira selecionada não confere com o cadastro',422);
        const signature = JSON.stringify({ userId: u.id, body });
        const previous = db.idempotency[`${u.id}:${key}`];
        if (previous) {
            if (previous.signature !== signature)
                return error('Chave reutilizada com conteúdo diferente', 409);
            return HttpResponse.json(settleOrder(db, previous.orderId));
        }
        if (!db.wallets[u.id]?.some(w => w.id === body.walletId && w.connected))
            return error('Conecte uma carteira cadastrada antes de comprar', 422);
        const current = quote(db);
        if (!current.items.length)
            return error('Carrinho vazio', 409);
        if (current.total !== body.expectedTotal || current.version !== body.version)
            return error('Preços, descontos ou disponibilidade mudaram. Revise antes de confirmar.', 409);
        if (current.items.some(i => i.quantity > i.nft.available))
            return error('Edição esgotada', 409);
        const order: Order = { id: `KUR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, ownerId: u.id, status: 'pending', outcome: db.scenario === 'decline' ? 'declined' : 'confirmed', quote: structuredClone(current), collector: body.collector ?? { name: u.name, email: u.email }, createdAt: new Date().toISOString(), dueAt: Date.now() + 1400, version: 1 };
        db.orders[order.id] = order;
        db.idempotency[`${u.id}:${key}`] = { signature, orderId: order.id };
        saveDb(db);
        if (db.scenario !== 'timeout')
            setTimeout(() => { const db = readDb(); settleOrder(db, order.id); }, 1500);
        if (db.scenario === 'timeout')
            return HttpResponse.error();
        return HttpResponse.json(order, { status: 202 });
    }),
    http.get('/api/orders', () => {
        const db = readDb(), u = auth(db);
        if (!u) return error('Faça login', 401);
        const items = Object.values(db.orders).filter(item => item.ownerId === u.id).map(order => settleOrder(db, order.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return HttpResponse.json({ items });
    }),
    http.get('/api/orders/recover/:key', ({ params }) => {
        const db = readDb(), user = auth(db);
        if (!user)
            return error('Faça login para recuperar pedido', 401);
        const attempt = db.idempotency[`${user.id}:${String(params.key)}`];
        if (!attempt)
            return error('Tentativa não encontrada', 404);
        return HttpResponse.json(settleOrder(db, attempt.orderId));
    }),
    http.get('/api/orders/:id', ({ params }) => {
        const db = readDb(), u = auth(db);
        if (!u)
            return error('Faça login', 401);
        const order = db.orders[String(params.id)];
        if (!order || order.ownerId !== u.id)
            return error('Pedido não encontrado', 404);
        return HttpResponse.json(settleOrder(db, order.id));
    }),
    http.get('/api/dev/scenario', () => HttpResponse.json({ scenario: readDb().scenario })),
    http.post('/api/dev/scenario', async ({ request }) => {
        const { scenario } = await request.json() as {
            scenario: DB['scenario'];
        };
        if (!['normal', 'decline', 'timeout', 'slow', 'server-error', 'offline', 'session-expired', 'wallet-rejected'].includes(scenario))
            return error('Cenário inválido', 422);
        const db = readDb();
        db.scenario = scenario;
        if (scenario === 'session-expired')
            db.sessionExpiresAt = 0;
        saveDb(db);
        return HttpResponse.json({ scenario });
    }),
    http.post('/api/dev/nfts/:id', async ({ request, params }) => {
        const db = readDb(), nft = db.nfts.find(n => n.id === params.id);
        if (!nft)
            return error('NFT não encontrado', 404);
        const payload = await request.json() as {
            price?: string;
            available?: number;
        };
        if (payload.price !== undefined) {
            try {
                toWei(payload.price);
            }
            catch {
                return error('Preço inválido', 422);
            }
            nft.price = payload.price;
        }
        if (payload.available !== undefined) {
            if (!Number.isInteger(payload.available) || payload.available < 0)
                return error('Estoque inválido', 422);
            nft.available = payload.available;
        }
        nft.version++;
        saveDb(db);
        emitNftUpdated({ id: nft.id, version: nft.version, price: nft.price, available: nft.available });
        return HttpResponse.json(nft);
    }),
    http.post('/api/dev/replay/:id', ({ params }) => {
        const nft = readDb().nfts.find(item => item.id === String(params.id));
        if (!nft)
            return error('NFT não encontrado', 404);
        emitNftUpdated({ id: nft.id, version: Math.max(0, nft.version - 1), price: nft.price, available: nft.available });
        return HttpResponse.json({ ok: true });
    }),
    http.post('/api/dev/reset', () => { resetDb(); return HttpResponse.json({ ok: true }); }),
];

