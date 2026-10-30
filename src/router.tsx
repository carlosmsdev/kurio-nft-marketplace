import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { Shell, Home, Detail, CartPage, Login, Register, Checkout, Confirmation, Account, Wallets, Help } from './screens';
const root = createRootRoute({ component: Shell });
type CatalogSearch = {
    q?: string;
    category?: string;
    network?: string;
    sort?: 'low' | 'high' | 'recent' | 'new' | 'popular';
    page?: number;
    min?: string;
    max?: string;
};
const validCatalogSearch = (input: Record<string, unknown>): CatalogSearch => ({
    q: typeof input.q === 'string' ? input.q : undefined,
    category: typeof input.category === 'string' ? input.category : undefined,
    network: typeof input.network === 'string' ? input.network : undefined,
    sort: input.sort === 'low' || input.sort === 'high' || input.sort === 'recent' || input.sort === 'new' || input.sort === 'popular' ? input.sort : undefined,
    page: Number.isInteger(Number(input.page)) && Number(input.page) > 0 ? Number(input.page) : undefined,
    min: typeof input.min === 'string' ? input.min : undefined,
    max: typeof input.max === 'string' ? input.max : undefined,
});
const home = createRoute({ getParentRoute: () => root, path: '/', validateSearch: validCatalogSearch, component: Home });
const detail = createRoute({ getParentRoute: () => root, path: '/nft/$id', component: Detail });
const cart = createRoute({ getParentRoute: () => root, path: '/cart', component: CartPage });
const login = createRoute({ getParentRoute: () => root, path: '/login', validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({ redirect: typeof search.redirect === 'string' ? search.redirect : undefined }), component: Login });
const register = createRoute({ getParentRoute: () => root, path: '/register', validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({ redirect: typeof search.redirect === 'string' ? search.redirect : undefined }), component: Register });
const checkout = createRoute({ getParentRoute: () => root, path: '/checkout', component: Checkout });
const order = createRoute({ getParentRoute: () => root, path: '/order/$id', component: Confirmation });
const account = createRoute({ getParentRoute: () => root, path: '/account', component: Account });
const help = createRoute({ getParentRoute: () => root, path: '/help', component: Help });
const wallets = createRoute({ getParentRoute: () => root, path: '/wallets', component: Wallets });
const routeTree = root.addChildren([home, detail, cart, login, register, checkout, order, account, wallets, help]);
export const router = createRouter({ routeTree, defaultNotFoundComponent: () => <main className="container page"><h1>Página não encontrada</h1><p>Confira o endereço e volte ao catálogo.</p></main> });
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}

