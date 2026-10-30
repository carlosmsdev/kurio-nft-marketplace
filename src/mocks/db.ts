import type { Account, CartLine, Nft, Order, Wallet } from '../types';
export type UserRecord = Account & {
    salt: string;
    passwordHash: string;
};
export type DB = {
    nfts: Nft[];
    users: UserRecord[];
    sessionId: string | null;
    sessionExpiresAt: number;
    carts: Record<string, CartLine[]>;
    coupons: Record<string, string | null>;
    favorites: Record<string, string[]>;
    wallets: Record<string, Wallet[]>;
    scenario: "normal" | "decline" | "timeout" | "slow" | "server-error" | "offline" | "session-expired" | "wallet-rejected";
    orders: Record<string, Order>;
    reviews: Record<string, {id:string; author:string; ownerId?:string; rating:number; text:string; createdAt:string}[]>;
    idempotency: Record<string, {
        signature: string;
        orderId: string;
    }>;
};
const initialNfts: Nft[] = [
    { id: '1', name: 'Emerald Ape #042', creator: 'Studio Genesis', price: '1.19', category: 'Arte digital', network: 'Ethereum', image: '/hero-emerald.webp', available: 12, version: 1 },
    { id: '2', name: 'Sage Nomad #009', creator: 'Wild Collective', price: '1.69', category: 'Colecionáveis', network: 'Polygon', image: '/nft-2.webp', available: 6, version: 1 },
    { id: '3', name: 'Neon Vessel #552', creator: 'Studio Genesis', price: '1.99', category: 'Arte 3D', network: 'Ethereum', image: '/nft-3.webp', available: 3, version: 1 },
    { id: '4', name: 'Cosmic Bloom #118', creator: 'Moon Labs', price: '1.29', category: 'Arte digital', network: 'Solana', image: '/nft-2.webp', available: 8, version: 1 },
    { id: '5', name: 'Violet Nomad #314', creator: 'Wild Collective', price: '1.39', category: 'Colecionáveis', network: 'Polygon', image: '/nft-2.webp', available: 5, version: 1 },
    { id: '6', name: 'Ivory Baron #088', creator: 'Moon Labs', price: '1.79', category: 'Arte 3D', network: 'Ethereum', image: '/nft-3.webp', available: 4, version: 1 },
    { id: '7', name: 'Golden Beat #207', creator: 'Golden Club', price: '0.99', category: 'Música', network: 'Solana', image: '/nft-4.webp', available: 18, version: 1 },
    { id: '8', name: 'Golden Signal #160', creator: 'Golden Club', price: '0.39', category: 'Música', network: 'Polygon', image: '/nft-4.webp', available: 9, version: 1 },
    { id: '9', name: 'Golden Echo #006', creator: 'Golden Club', price: '0.89', category: 'Música', network: 'Ethereum', image: '/nft-4.webp', available: 2, version: 1 },
    { id: '10', name: 'Ape Vision #027', creator: 'Wild Collective', price: '0.89', category: 'Fotografia', network: 'Solana', image: '/nft-1.webp', available: 8, version: 1 },
    { id: '11', name: 'Pixel Dream #331', creator: 'Moon Labs', price: '1.49', category: 'Generativa', network: 'Polygon', image: '/nft-3.webp', available: 7, version: 1 },
    { id: '12', name: 'Echoes #844', creator: 'Golden Club', price: '0.69', category: 'Jogos', network: 'Ethereum', image: '/nft-4.webp', available: 15, version: 1 },
];
const extraNames = [
    'Amber Horizon', 'Dream Archive', 'Golden Melody', 'Moon Walker',
    'Echo Nomad', 'Emerald Soul', 'Neon Eclipse', 'Cosmic Echo',
    'Pixel Wanderer', 'Golden Journey', 'Ivory Light', 'Sage Traveller',
    'Violet Wave', 'Emerald Muse', 'Golden Pulse', 'Wild Dream',
    'Genesis Echo', 'Nomad Vision', 'Neon Dream', 'Golden Horizon',
    'Amber Vision', 'Moon Bloom', 'Digital Echo', 'Cosmic Dawn'
];
for (const name of extraNames) {
    const number = initialNfts.length + 1;
    const image = ['/nft-4.webp', '/nft-2.webp', '/nft-1.webp', '/nft-3.webp'][number % 4];
    const category = ['Arte digital', 'Colecionáveis', 'Música', 'Fotografia', 'Arte 3D', 'Generativa', 'Jogos', 'Utilidade', 'Assinaturas'][number % 9];
    const network = ['Ethereum', 'Polygon', 'Solana'][number % 3];
    const price = (0.39 + (number % 10) * 0.19).toFixed(2);
    initialNfts.push({ id: String(number), name: `${name} #${String(number * 13).padStart(3,'0')}`, creator: 'Kurio Editions', price, category, network, image, available: number % 7 + 2, version: 1 });
}
for (const nft of initialNfts) {
    nft.collection = nft.creator === 'Studio Genesis' ? 'Kurio Edition' : nft.creator === 'Wild Collective' ? 'Wild Collective' : nft.creator === 'Moon Labs' ? 'Moon Digital' : 'Golden Club';
    nft.description = `${nft.name} é um colecionável digital de edição limitada, criado por ${nft.creator} para a coleção ${nft.collection}. Uma obra feita para entusiastas de arte digital, com informações de autoria, atributos e disponibilidade da coleção.`;
}
const initialUsers: UserRecord[] = [{ "id": "demo", "name": "Colecionador Demo", "email": "demo@kurio.test", "avatar": "", "salt": "demo-2026-simulated", "passwordHash": "41028efeaf79036265ecf529087fd28ad745e75f36f11650e5203d2a6e18a5d1" }, { "id": "alex", "name": "Alex Oliveira", "email": "alex@kurio.test", "avatar": "", "salt": "alex-2026-simulated", "passwordHash": "4b36d54583d22902f28b7aad9ab68cff5b19bc1e1dd436a7dc3205960b6b9b4c" }];
const STORAGE_KEY = 'kurio-mock-v3';
export function seed(): DB {
    return {
        nfts: structuredClone(initialNfts), users: structuredClone(initialUsers), sessionId: null, sessionExpiresAt: 0,
        carts: { guest: [], demo: [], alex: [] }, coupons: {}, favorites: { demo: [], alex: [] },
        wallets: { demo: [{ id: 'eth-demo', name: 'Minha carteira', address: '0x1234567890abcdef1234567890abcdef12345678', network: 'Ethereum', primary: true, connected: true }], alex: [] },
        scenario: "normal", orders: {}, reviews: { '1': [
            {id:'r1',author:'Colecionadora Aurora',rating:5,text:'O acabamento e as cores desta coleção são incríveis.',createdAt:'2026-08-12T12:00:00.000Z'},
            {id:'r2',author:'Pixel Hunter',rating:5,text:'Uma das minhas obras favoritas da edição.',createdAt:'2026-09-05T12:00:00.000Z'},
            ...Array.from({length:17},(_,index)=>({id:`r${index+3}`,author:['Arteira Digital','Colecionador Neo','Luna Art','Marcos NFT','Creative Wave','Maya Studio','Lucca Coleções','Jade Arts','Gabi Colors'][index%9],rating:index%6===0?4:5,text:['Excelente composição e atenção aos detalhes.','As cores e o estilo ficaram incríveis.','Gostei bastante da qualidade artística.','Uma obra que merece entrar na coleção.'][index%4],createdAt:new Date(Date.UTC(2026,8,8+index)).toISOString()}))
        ] }, idempotency: {}
    };
}
const catalogImages = new Map(initialNfts.map(nft => [nft.id, nft.image]));
export function migrateNftImages(db: DB): boolean {
    let updated = false;
    for (const nft of db.nfts ?? []) {
        const image = catalogImages.get(nft.id);
        if (image && nft.image !== image) {
            nft.image = image;
            updated = true;
        }
    }
    return updated;
}
export function readDb(): DB { try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const db = raw ? JSON.parse(raw) as DB : seed();
    db.reviews ??= seed().reviews;
    if (migrateNftImages(db)) saveDb(db);
    return db;
}
catch {
    return seed();
} }
export function saveDb(db: DB) { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }
export function resetDb() { localStorage.removeItem(STORAGE_KEY); }
export function getUser(db: DB): UserRecord | undefined { return db.sessionExpiresAt > Date.now() ? db.users.find(u => u.id === db.sessionId) : undefined; }
export function cartOwner(db: DB) { return getUser(db)?.id ?? 'guest'; }
export const mockStorageKey = STORAGE_KEY;

