import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import axios from 'axios';
import { Link, Outlet, useLocation, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScanLine, ArrowLeft, ArrowRight, Check, CheckCircle2, Heart, Menu, Minus, Plus, Search, ShoppingCart, Trash2, UserRound, Wallet, ShieldCheck, ZoomIn, X, Copy, SlidersHorizontal, Home as HomeIcon, ChevronRight, BookOpen, Instagram, Facebook, Linkedin, Youtube, Twitter, Star, Eye, EyeOff } from 'lucide-react';
import { Button } from './components/ui/button';
import { NftScanner } from './components/NftScanner';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
import { Skeleton } from './components/ui/skeleton';
import { api, get, message } from './lib/api';
import { eth } from './lib/eth';
import type { Account as UserAccount, Cart, Nft, Order, Quote, Session, Wallet as WalletType } from './types';
const categories = ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Colecionáveis', 'Generativa', 'Jogos', 'Assinaturas', 'Utilidade'];
const networks = ['Ethereum', 'Polygon', 'Solana'];
const useSession = () => useQuery({ queryKey: ['session'], queryFn: ({ signal }) => get<Session>('/session', signal), staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: true });
const useCart = () => useQuery({ queryKey: ['cart'], queryFn: ({ signal }) => get<Cart>('/cart', signal) });
const useQuote = (refreshInterval?: number) => useQuery({ queryKey: ['quote'], queryFn: ({ signal }) => get<Quote>('/quote', signal), refetchInterval: refreshInterval || false });
const useRefresh = () => { const qc = useQueryClient(); return () => Promise.all([qc.invalidateQueries({ queryKey: ['cart'] }), qc.invalidateQueries({ queryKey: ['quote'] })]); };
function ErrorNote({ error }: {
    error: unknown;
}) { return <p className="notice" role="alert">{message(error)}</p>; }
function LoadingCards({ count = 6 }: {
    count?: number;
}) { return <div className="grid-nfts">{Array.from({ length: count }, (_, i) => <Skeleton key={i}/>)}</div>; }
export function Shell() {
    const { data: session } = useSession(), { data: cart } = useCart();
    const [menu, setMenu] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [connection, setConnection] = useState('connecting');
    const [connectionErrorVisible, setConnectionErrorVisible] = useState(false);
    const [expired, setExpired] = useState(false);
    const qc = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();
    const section = location.hash.replace(/^#/, '');
    const navigateSection = (sectionId: string) => {
        setMenu(false);
        void navigate({ to: '/', search: {}, hash: sectionId, hashScrollIntoView: false, resetScroll: false }).then(() => {
            if (sectionId) document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            else window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    };
    const homeTab = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register' ? section === 'marketplace' ? 'marketplace' : section === 'criadores' ? 'criadores' : section === 'aprender' ? 'aprender' : 'home' : ['/nft/', '/cart', '/checkout'].some(part => location.pathname.startsWith(part)) ? 'marketplace' : '';
    useEffect(() => {
        const online = (event: Event) => setConnection((event as CustomEvent<string>).detail);
        const expire = () => { setExpired(true); qc.setQueryData(['session'], null); for (const key of ['favorites', 'wallets', 'profile', 'order', 'cart', 'quote'])
            qc.removeQueries({ queryKey: [key] }); };
        window.addEventListener('kurio:connection', online);
        window.addEventListener('kurio:auth-expired', expire);
        return () => { window.removeEventListener('kurio:connection', online); window.removeEventListener('kurio:auth-expired', expire); };
    }, [qc]);
    useEffect(() => { if (session)
        setExpired(false); }, [session?.user.id]);
    useEffect(() => {
        if (connection === 'connected') { setConnectionErrorVisible(false); return; }
        if (connection !== 'disconnected') return;
        const timer = window.setTimeout(() => setConnectionErrorVisible(true), 3500);
        return () => window.clearTimeout(timer);
    }, [connection]);
    const logout = useMutation({ mutationFn: () => api.post('/logout'), onSuccess: async () => { await qc.cancelQueries(); qc.removeQueries({ predicate: query => query.queryKey[0] !== 'session' }); qc.setQueryData(['session'], null); await qc.invalidateQueries({ queryKey: ['session'] }); setExpired(false); await navigate({ to: '/' }); } });
    return <>
  <header className="container header">
   <Link to="/" className="brand">KURIO</Link>
   <nav aria-label="Navegação principal" className={menu ? 'nav is-open' : 'nav'}>
    <button type="button" aria-current={homeTab==='home'?'page':undefined} className={homeTab==='home'?'nav-current':''} onClick={()=>navigateSection('')}>Início</button>
    <button type="button" aria-current={homeTab==='marketplace'?'page':undefined} className={homeTab==='marketplace'?'nav-current':''} onClick={()=>navigateSection('marketplace')}>Mercado</button>
    <button type="button" aria-current={homeTab==='criadores'?'page':undefined} className={homeTab==='criadores'?'nav-current':''} onClick={()=>navigateSection('criadores')}>Criadores</button>
    <button type="button" aria-current={homeTab==='aprender'?'page':undefined} className={homeTab==='aprender'?'nav-current':''} onClick={()=>navigateSection('aprender')}>Aprenda</button>
    {session && <button type="button" className="mobile-nav-logout" disabled={logout.isPending} onClick={() => { setMenu(false); logout.mutate(); }}>Sair</button>}
   </nav>
   <div className="header-actions">
    <button type="button" onClick={()=>navigateSection('marketplace')} aria-label="Procurar NFTs"><Search size={19}/></button>
    <Link to="/cart" aria-label="Abrir carrinho" className="cart-shortcut"><ShoppingCart size={19}/><span className="cart-count">{cart?.items.reduce((sum, line) => sum + line.quantity, 0) ?? 0}</span></Link>
    {session ? <><Link to="/account" aria-label="Meu perfil"><UserRound size={20}/></Link><button className="text-button" disabled={logout.isPending} onClick={() => logout.mutate()}>Sair</button></> : <Button asChild size="sm"><Link to="/login">Entrar</Link></Button>}
    <button type="button" aria-label="Abrir menu" aria-expanded={menu} className="mobile-toggle" onClick={() => setMenu(!menu)}><Menu size={23}/></button>
   </div>
  </header>
  {expired && <div className="system-banner" role="alert">Sua sessão expirou. O carrinho foi preservado. <Link to="/login">Entrar novamente</Link><button aria-label="Dispensar alerta" onClick={() => setExpired(false)}>×</button></div>}
  {connectionErrorVisible && connection === 'disconnected' && <div className="system-banner connection-banner" role="status">Atualizações em tempo real indisponíveis. Os dados serão sincronizados ao reconectar.</div>}
  <Outlet />
  <SiteFooter />
  <nav className="mobile-bottom-nav" aria-label="Navegação mobile">
   <Link to="/" className={location.pathname === '/' ? 'active' : ''} aria-label="Início"><HomeIcon size={22}/><span>Início</span></Link>
   <Link to="/account" hash="favorites" aria-label="Favoritos"><Heart size={22}/><span>Favoritos</span></Link>
   <button type="button" className="mobile-bottom-scan" aria-label="Escanear NFT" onClick={()=>setScannerOpen(true)}><ScanLine size={25}/></button>
   <Link to="/cart" aria-label="Abrir carrinho"><ShoppingCart size={22}/><span>Carrinho</span></Link>
   <Link to="/account" aria-label="Meu perfil"><UserRound size={22}/><span>Perfil</span></Link>
  </nav>
  {scannerOpen && <NftScanner onClose={()=>setScannerOpen(false)}/>}
 </>;
}
function AddButton({ id, quantity = 1, disabled = false }: {
    id: string;
    quantity?: number;
    disabled?: boolean;
}) {
    const refresh = useRefresh();
    const [added, setAdded] = useState(false);
    const mutation = useMutation({ mutationFn: () => api.post('/cart', { nftId: id, quantity }), onSuccess: async () => { await refresh(); setAdded(true); } });
    return <div className="add-inline"><Button size="sm" aria-label={disabled ? 'Esgotado' : 'Adicionar ao carrinho'} disabled={mutation.isPending || disabled} onClick={() => mutation.mutate()}>{disabled ? 'Esgotado' : mutation.isPending ? 'Adicionando...' : added ? '✓ Adicionado' : 'Adicionar'}</Button>{mutation.isError && <ErrorNote error={mutation.error}/>}</div>;
}
function BuyNowButton({ id, quantity, disabled }: { id: string; quantity: number; disabled: boolean }) {
    const refresh = useRefresh();
    const navigate = useNavigate();
    const purchase = useMutation({
        mutationFn: () => api.post('/cart', { nftId: id, quantity }),
        onSuccess: async () => { await refresh(); await navigate({ to: '/checkout' }); },
    });
    return <div className="add-inline"><Button variant="outline" size="sm" aria-label="Comprar agora" disabled={disabled || purchase.isPending} onClick={() => purchase.mutate()}>{purchase.isPending ? 'Preparando...' : 'COMPRAR'}<ArrowRight size={16}/></Button>{purchase.isError && <ErrorNote error={purchase.error}/>}</div>;
}
function FavButton({ id }: {
    id: string;
}) {
    const { data: session } = useSession(), navigate = useNavigate(), qc = useQueryClient();
    const query = useQuery({ queryKey: ['favorites', session?.user.id], queryFn: ({ signal }) => get<{
            ids: string[];
        }>('/favorites', signal), enabled: !!session });
    const liked = !!query.data?.ids.includes(id);
    const mutate = useMutation({ mutationFn: () => liked ? api.delete(`/favorites/${id}`) : api.post(`/favorites/${id}`), onMutate: async () => {
            await qc.cancelQueries({ queryKey: ['favorites', session?.user.id] });
            const previous = qc.getQueryData<{
                ids: string[];
            }>(['favorites', session?.user.id]);
            qc.setQueryData(['favorites', session?.user.id], { ids: liked ? previous?.ids.filter(x => x !== id) ?? [] : [...(previous?.ids ?? []), id], items: previous && 'items' in previous ? previous.items : [] });
            return { previous };
        }, onError: (_err, _vars, ctx) => qc.setQueryData(['favorites', session?.user.id], ctx?.previous), onSettled: () => qc.invalidateQueries({ queryKey: ['favorites', session?.user.id] }) });
    return <button className="heart" aria-label={liked ? 'Remover favorito' : 'Adicionar aos favoritos'} aria-pressed={liked} disabled={mutate.isPending} onClick={() => { if (!session) {
        void navigate({ to: '/login' });
        return;
    } mutate.mutate(); }}><Heart size={19} fill={liked ? 'currentColor' : 'none'}/></button>;
}
function NFTCard({ nft }: { nft: Nft }) {
    return <article className="nft-card">
        <Link to="/nft/$id" params={{ id: nft.id }} className="nft-card-link">
            <div className="nft-image">
                <img src={nft.image} alt={`Ilustração do NFT ${nft.name}`} loading="lazy" />
                {nft.available <= 3 && <span className="nft-rare">RARO</span>}
            </div>
            <h3 className="nft-name">{nft.name}</h3>
            <p className="price">{eth(nft.price)}</p>
        </Link>
        <div className="card-actions"><AddButton id={nft.id} disabled={nft.available === 0}/><FavButton id={nft.id}/></div>
    </article>;
}
const heroSlides = [
    { image: '/hero-emerald.webp', kicker: 'Bem-vindo à Kurio', title: 'SEJA DONO DO FUTURO DA ARTE DIGITAL', description: 'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.', alt: 'Emerald Ape, macaco de jaqueta verde e óculos' },
    { image: '/nft-2.webp', kicker: 'Coleções exclusivas', title: 'ARTE RARA. NOVAS POSSIBILIDADES.', description: 'Explore obras digitais de edição limitada, descubra novos artistas e comece sua coleção.', alt: 'Sage Nomad, macaco de moletom roxo' },
    { image: '/nft-4.webp', kicker: 'Curadoria Kurio', title: 'DESCUBRA O PRÓXIMO ÍCONE DIGITAL', description: 'Encontre criações de artistas independentes e acompanhe suas coleções favoritas em um só lugar.', alt: 'Golden Beat, macaco dourado' },
];
const stories = [
    { image: '/nft-3.webp', date: '12 de setembro', minutes: 6, title: 'Como funciona a propriedade de NFTs', description: 'Aprenda a colecionar, negociar e verificar ativos digitais.', body: 'Os NFTs são registros digitais de propriedade. Em um marketplace, cada coleção reúne obras, atributos e informações de autoria. Antes de comprar, confira a rede, a edição e o histórico do ativo.' },
    { image: '/nft-1.webp', date: '13 de setembro', minutes: 2, title: '10 artistas digitais para acompanhar', description: 'Conheça criadores que moldam a cultura digital.', body: 'A arte digital cresce com novas formas de expressão. Acompanhar artistas, pesquisar coleções e entender o processo criativo ajuda a descobrir obras com significado.' },
    { image: '/nft-2.webp', date: '15 de setembro', minutes: 3, title: 'Raridade, atributos e procedência', description: 'Entenda raridade, procedência, direitos autorais e utilidade.', body: 'A raridade depende das características de cada coleção. Verifique as informações da obra, edições disponíveis e o histórico de procedência antes de adquirir um colecionável.' },
    { image: '/nft-4.webp', date: '15 de setembro', minutes: 2, title: 'Como proteger sua carteira', description: 'Proteja sua carteira, seus ativos e sua identidade.', body: 'Nunca compartilhe sua frase de recuperação, confira endereços e conheça os riscos de links suspeitos.' },
];
function SiteFooter() {
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);
    const links = [
        { label: 'Meu perfil', to: '/account' as const },
        { label: 'Minha coleção', to: '/account' as const, hash: 'collection' },
        { label: 'Atividade', to: '/account' as const, hash: 'activity' },
        { label: 'Estúdio do criador', to: '/help' as const, hash: 'criadores' },
        { label: 'Lista de interesse', to: '/account' as const, hash: 'favorites' }
    ];
    const helpLinks = [
        { label: 'Central de ajuda', hash: '' },
        { label: 'Como comprar NFTs', hash: 'comprar' },
        { label: 'Carteira e segurança', hash: 'carteiras' },
        { label: 'Política do mercado', hash: 'politica' },
        { label: 'Denunciar item', hash: 'denunciar' }
    ];
    return <footer className="footer container">
        <div className="footer-top">
            <div><span className="footer-round">W</span><h3>Segurança da carteira</h3><p>Proteja sua carteira e colecione arte digital verificada com confiança.</p></div>
            <div><span className="footer-round">C</span><h3>Criadores em destaque</h3><p>Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.</p></div>
            <div><span className="footer-round">D</span><h3>Alertas de lançamentos</h3><p>Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.</p></div>
            <form onSubmit={event => { event.preventDefault(); if (email.trim()) { localStorage.setItem('kurio:newsletter', email.trim()); setSubscribed(true); } }}>
                <h3>Antecipe-se ao próximo lançamento</h3>
                <div className="newsletter-input"><input type="email" required aria-label="Receber novidades da Kurio" placeholder="digite seu e-mail..." value={email} onChange={event => setEmail(event.target.value)}/><button type="submit">Enviar</button></div>
                <p>{subscribed ? 'Preferência salva neste navegador.' : 'Receba lançamentos selecionados, histórias de criadores e novidades do mercado.'}</p>
            </form>
        </div>
        <div className="footer-brand"><strong>KURIO</strong><span>Feito para colecionadores,<br/>criadores e cultura</span><span>contato@email.com</span><span>+55 11 4002 8922</span></div>
        <div className="footer-columns">
            <div><h3>Meu perfil</h3>{links.map(link=><Link key={link.label} to={link.to} hash={'hash' in link ? link.hash : undefined}>{link.label}</Link>)}</div>
            <div><h3>Central de ajuda</h3>{helpLinks.map(link=><Link key={link.label} to="/help" hash={link.hash}>{link.label}</Link>)}</div>
            <div><h3>Coleções</h3>{['Arte digital','Fotografia','Música','Arte 3D','Utilidade'].map(category=><Link key={category} to="/" search={{category,page:1}} hash="marketplace">{category}</Link>)}</div>
            <div><h3>Redes sociais</h3><div className="footer-social" aria-label="Redes sociais">
                <a aria-label="Facebook" href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer"><Facebook/></a>
                <a aria-label="Instagram" href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer"><Instagram/></a>
                <a aria-label="Twitter" href="https://x.com/" target="_blank" rel="noopener noreferrer"><Twitter/></a>
                <a aria-label="LinkedIn" href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer"><Linkedin/></a>
                <a aria-label="YouTube" href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer"><Youtube/></a>
            </div><h3>Carteiras compatíveis</h3><span className="wallet-brand-list">METAMASK · WALLETCONNECT · COINBASE</span></div>
        </div>
        <p className="footer-copy">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>;
}
export function Home() {
    const [heroIndex, setHeroIndex] = useState(0);
    const [filterOpen, setFilterOpen] = useState(false);
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [story, setStory] = useState<(typeof stories)[number] | null>(null);
    const hero = heroSlides[heroIndex];
    const search = useSearch({ strict: false }) as { q?: string; category?: string; network?: string; sort?: 'low' | 'high' | 'recent' | 'new' | 'popular'; page?: number; min?: string; max?: string; };
    const navigate = useNavigate();
    const q = search.q ?? '';
    const category = search.category ?? '';
    const network = search.network ?? '';
    const sort = search.sort ?? 'recent';
    const page = search.page ?? 1;
    const [draft, setDraft] = useState(q);
    const catalogRef = useRef<HTMLElement>(null);
    const savedScroll = useRef<number | null>(null);
    useEffect(() => setDraft(q), [q]);
    useEffect(() => { setMinPrice(search.min ?? ''); setMaxPrice(search.max ?? ''); }, [search.min, search.max]);
    const { data: facets } = useQuery({queryKey:['facets'], queryFn: ({signal}) => get<{categories: Record<string, number>; networks: Record<string, number>}>('/collections', signal)});
    const update = (patch: Partial<typeof search>) => {
        savedScroll.current = window.scrollY;
        void navigate({to:'/', search: previous => ({...previous,...patch,page: patch.page ?? 1}), hash:'marketplace', hashScrollIntoView:false, resetScroll: false, replace: false});
    };
    const changePage = (newPage: number) => {
        savedScroll.current = null;
        void navigate({to:'/', search: previous => ({...previous,page:newPage}), hash:'marketplace', hashScrollIntoView:false, resetScroll: false});
        window.requestAnimationFrame(() => catalogRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'}));
    };
    useEffect(() => {
        const timer = window.setTimeout(() => { if (draft !== q) update({q:draft}); }, 350);
        return () => window.clearTimeout(timer);
    }, [draft,q]);
    useLayoutEffect(() => {
        if (savedScroll.current === null) return;
        const y = savedScroll.current;
        savedScroll.current = null;
        window.scrollTo({top:y,behavior:'instant'});
    }, [q,category,network,sort,page,search.min,search.max]);
    const params = new URLSearchParams({q,category,network,sort,page:String(page)});
    if (search.min) params.set('min',search.min);
    if (search.max) params.set('max',search.max);
    const {data,isPending,isError,error,refetch,isFetching} = useQuery({queryKey:['nfts',q,category,network,sort,page,search.min,search.max],queryFn:({signal})=>get<{items:Nft[];total:number;pages:number}>(`/nfts?${params}`,signal),placeholderData: previous=>previous});
    const clearFilters = () => update({q:'',category:'',network:'',sort:'recent',min:undefined,max:undefined,page:1});
    return <main className="container home-page">
        <div className="mobile-explore-bar">
            <label className="mobile-search"><Search size={19}/><input aria-label="Buscar NFTs" placeholder="Explorar coleções" value={draft} onChange={event=>setDraft(event.target.value)}/></label>
            <button type="button" aria-label="Abrir filtros" aria-expanded={filterOpen} onClick={()=>setFilterOpen(v=>!v)}><SlidersHorizontal size={20}/></button>
        </div>
        <section className="hero" aria-label="Coleções em destaque">
            <div className="hero-copy"><span className="eyebrow">{hero.kicker}</span><h1>{hero.title}</h1><p className="muted">{hero.description}</p><a className="button hero-button" href="#marketplace">EXPLORAR <ArrowRight size={16}/></a></div>
            <div className="hero-media"><img key={hero.image} src={hero.image} alt={hero.alt} fetchPriority="high" decoding="async"/></div>
            <div className="carousel-dots" role="group" aria-label="Selecionar destaque">{heroSlides.map((slide,index)=><button key={slide.image} type="button" className={index===heroIndex?'dot selected':'dot'} aria-label={`Ver destaque ${index+1}`} aria-pressed={index===heroIndex} onClick={()=>setHeroIndex(index)} />)}</div>
        </section>
        <section className="market" id="marketplace" ref={catalogRef}>
            <aside className={`sidebar ${filterOpen?'filter-open':''}`} aria-label="Filtros do catálogo">
                <div className="side-panel">
                    <div className="filter-heading"><h2>Coleções</h2><button className="mobile-filter-close" type="button" aria-label="Fechar filtros" onClick={()=>setFilterOpen(false)}><X size={20}/></button></div>
                    <div className="filters">{categories.map(c=><button key={c} type="button" className={`category ${category===c?'selected':''}`} aria-pressed={category===c} onClick={()=>update({category:category===c?'':c})}><span>{c}</span><span className="count">({facets?.categories[c]??0})</span></button>)}</div>
                    <h3>Faixa de preço</h3>
                    <div className="range-controls"><input type="range" min="0" max="12.3" step="0.01" aria-label="Preço mínimo" value={minPrice||'0'} onChange={e=>setMinPrice(e.target.value)}/><input type="range" min="0" max="12.3" step="0.01" aria-label="Preço máximo" value={maxPrice||'12.3'} onChange={e=>setMaxPrice(e.target.value)}/></div>
                    <p className="range-label">Preço: {minPrice||'0,02'} – {maxPrice||'12,30'} ETH</p>
                    <div className="price-fields"><Input className="field" aria-label="Valor mínimo em ETH" type="number" min="0" step="0.01" placeholder="Mín." value={minPrice} onChange={e=>setMinPrice(e.target.value)}/><Input className="field" aria-label="Valor máximo em ETH" type="number" min="0" step="0.01" placeholder="Máx." value={maxPrice} onChange={e=>setMaxPrice(e.target.value)}/></div>
                    <button className="filter-apply" type="button" onClick={()=>{if (minPrice && maxPrice && Number(minPrice)>Number(maxPrice)) {setMaxPrice(minPrice);update({min:minPrice,max:minPrice});} else {update({min:minPrice||undefined,max:maxPrice||undefined});}setFilterOpen(false);}}>Aplicar</button>
                    <h3>Rede</h3>{networks.map(n=><button type="button" key={n} className={`category ${network===n?'selected':''}`} aria-pressed={network===n} onClick={()=>update({network:network===n?'':n})}><span>{n}</span><span className="count">({facets?.networks[n]??0})</span></button>)}
                    {(category||network||search.min||search.max)&&<button className="clear-filters" type="button" onClick={clearFilters}>Limpar filtros</button>}
                </div>
                <div className="featured"><h3>NFT EM DESTAQUE</h3><strong>OFERTA LIMITADA</strong><img src="/nft-2.webp" alt="Sage Nomad em destaque" loading="lazy"/></div>
            </aside>
            <div className="catalog">
                <div className="market-top">
                    <div className="tabs" role="group" aria-label="Ordenar catálogo">
                        <button className={!search.sort||sort==='recent'?'selected':''} onClick={()=>update({sort:'recent'})}>Todos os NFTs</button>
                        <button className={sort==='new'?'selected':''} onClick={()=>update({sort:'new'})}>Novos lançamentos</button>
                        <button className={sort==='popular'?'selected':''} onClick={()=>update({sort:'popular'})}>Em alta</button>
                    </div>
                    <label className="catalog-sort">Ordenar por:<select aria-label="Ordenar NFTs" value={sort} onChange={e=>update({sort:e.target.value as typeof sort})}><option value="recent">Listados recentemente</option><option value="new">Novos lançamentos</option><option value="popular">Em alta</option><option value="low">Menor preço</option><option value="high">Maior preço</option></select></label>
                    <label className="search-wrap"><Search size={15}/><input aria-label="Buscar NFTs" placeholder="Buscar NFTs..." value={draft} onChange={e=>setDraft(e.target.value)}/></label>
                </div>
                <span className="results" aria-live="polite">{data?.total??0} NFTs encontrados {isFetching&&!isPending?'· Atualizando...':''}</span>
                {isPending?<LoadingCards/>:isError?<div role="alert" className="notice">{message(error)} <button onClick={()=>void refetch()}>Tentar novamente</button></div>:!data?.items.length?<div className="empty-state"><p>Nenhum NFT encontrado.</p><button className="button secondary" onClick={clearFilters}>Limpar filtros</button></div>:<div className={`grid-nfts ${isFetching?'catalog-updating':''}`}>{data.items.map(nft=><NFTCard key={nft.id} nft={nft}/>)}</div>}
                <nav className="pagination" aria-label="Paginação">{Array.from({length:data?.pages??0},(_,i)=><button key={i} aria-label={`Página ${i+1}`} aria-current={page===i+1?'page':undefined} className={page===i+1?'current':''} onClick={()=>changePage(i+1)}>{i+1}</button>)}{page<(data?.pages??1)&&<button type="button" aria-label="Próxima página" onClick={()=>changePage(page+1)}><ChevronRight size={18}/></button>}</nav>
            </div>
        </section>
        <section className="promo-grid" id="criadores" aria-label="Coleções especiais"><div className="promo-card"><img src="/nft-1.webp" alt="Coleção Genesis" loading="lazy"/><div><h2>Lançamentos gênesis de edição limitada</h2><p>Colecione edições escassas diretamente dos criadores antes da revelação pública.</p><a className="button" href="#marketplace">Explorar <ArrowRight size={15}/></a></div></div><div className="promo-card"><img src="/nft-3.webp" alt="Coleção de arte digital" loading="lazy"/><div><h2>Arte digital selecionada e muito mais</h2><p>Explore novos artistas, coleções verificadas e obras digitais.</p><a className="button" href="#marketplace">Explorar <ArrowRight size={15}/></a></div></div></section>
        <section className="journal" id="aprender" aria-label="Diário da Cunhagem"><h2>Diário da Cunhagem</h2><p className="muted">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p><div className="journal-grid">{stories.map(item=><article key={item.title}><img src={item.image} alt="Arte digital colecionável" loading="lazy"/><div><small>{item.date}　|　Leitura de {item.minutes} min</small><h3>{item.title}</h3><p>{item.description}</p><button type="button" onClick={()=>setStory(item)}>Ler mais →</button></div></article>)}</div></section>
        {story&&<div className="story-overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setStory(null);}}><article className="story-dialog" role="dialog" aria-modal="true" aria-label={story.title}><button type="button" className="story-close" aria-label="Fechar artigo" onClick={()=>setStory(null)}><X size={22}/></button><img src={story.image} alt=""/><div><p className="eyebrow">Diário da Cunhagem · {story.date}</p><h2>{story.title}</h2><p>{story.body}</p><button className="button" onClick={()=>setStory(null)}>Voltar ao diário</button></div></article></div>}
    </main>;
}
function RelatedNfts({ currentId }: { currentId: string }) {
    const { data } = useQuery({ queryKey: ['nfts', 'related'], queryFn: ({ signal }) => get<{ items: Nft[] }>('/nfts?page=1', signal) });
    const items = data?.items.filter(nft => nft.id !== currentId).slice(0, 4) ?? [];
    if (!items.length) return null;
    return <section className="related-section" aria-label="Outras obras"><div className="section-title"><div><span className="eyebrow">CONTINUE EXPLORANDO</span><h2>Mais para sua coleção</h2></div><Link to="/" hash="marketplace" className="text-link">Ver marketplace <ArrowRight size={16}/></Link></div><div className="related-grid">{items.map(nft => <NFTCard key={nft.id} nft={nft}/>)}</div></section>;
}
type CollectorReview = {
    id: string;
    author: string;
    rating: number;
    text: string;
    createdAt: string;
};

type ReviewResponse = {
    items: CollectorReview[];
    total: number;
    average: number;
};

const imagePositions = ['center center', '50% 25%', '30% 50%', '70% 45%'];
const imageScales = [1, 1.45, 1.6, 1.55];

function NftGallery({ nft }: { nft: Nft }) {
    const [activeImage, setActiveImage] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const closeButton = useRef<HTMLButtonElement>(null);
    const zoomButton = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        setActiveImage(0);
        setIsOpen(false);
    }, [nft.id]);

    useEffect(() => {
        if (!isOpen) return;

        closeButton.current?.focus();

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') setIsOpen(false);
            if (event.key === 'Tab') {
                event.preventDefault();
                closeButton.current?.focus();
            }
        }

        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            zoomButton.current?.focus();
        };
    }, [isOpen]);

    return (
        <div className="nft-gallery" aria-label={`Galeria de imagens de ${nft.name}`}>
            <div className="gallery-thumbnails" aria-label="Escolher enquadramento da obra">
                {imagePositions.map((position, index) => (
                    <button
                        key={index}
                        type="button"
                        className={`gallery-thumb ${activeImage === index ? 'selected' : ''}`}
                        aria-label={`Imagem ${index + 1} de 4`}
                        aria-pressed={activeImage === index}
                        onClick={() => setActiveImage(index)}
                    >
                        <img src={nft.image} alt="" style={{ transformOrigin: position, transform: `scale(${imageScales[index]})` }} />
                    </button>
                ))}
            </div>
            <div className="gallery-main">
                <img
                    className="detail-image"
                    src={nft.image}
                    alt={`Arte digital ${nft.name}`}
                    style={{ transformOrigin: imagePositions[activeImage], transform: `scale(${imageScales[activeImage]})` }}
                />
                <button
                    ref={zoomButton}
                    type="button"
                    className="gallery-zoom"
                    aria-label="Ampliar arte digital"
                    onClick={() => setIsOpen(true)}
                >
                    <ZoomIn size={19} />
                </button>
            </div>
            {isOpen && (
                <div
                    className="gallery-lightbox"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Visualização ampliada de ${nft.name}`}
                    onMouseDown={event => {
                        if (event.target === event.currentTarget) setIsOpen(false);
                    }}
                >
                    <div className="gallery-lightbox-content">
                        <button
                            ref={closeButton}
                            type="button"
                            aria-label="Fechar visualização ampliada"
                            onClick={() => setIsOpen(false)}
                        >
                            <X size={20} />
                        </button>
                        <img src={nft.image} alt={`Imagem ampliada de ${nft.name}`} />
                        <p>{nft.name} · {nft.creator}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function NftRating({nftId,openReviews}: {nftId:string;openReviews:()=>void}) {
    const {data} = useQuery({queryKey:['nft-reviews',nftId],queryFn:({signal})=>get<ReviewResponse>(`/nfts/${nftId}/reviews`,signal)});
    const total = data?.total ?? 0;
    const average = data?.average ?? 0;
    return <button className="nft-rating" type="button" onClick={openReviews} aria-label={`Ver ${total} avaliações de colecionadores`}><span aria-hidden="true">{'★'.repeat(Math.round(average))}{'☆'.repeat(5-Math.round(average))}</span><span>{total ? `${average.toFixed(1)} · ${total} avaliações de colecionadores` : 'Seja o primeiro a avaliar esta obra'}</span></button>;
}
function NftInformation({ nft, tab, setTab }: { nft: Nft; tab: 'details' | 'reviews'; setTab: (tab: 'details' | 'reviews') => void }) {
    const { data: reviewSession } = useSession();
    const qc = useQueryClient();
    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState('');
    const [showAllReviews, setShowAllReviews] = useState(false);
    const submitReview = useMutation({
        mutationFn: () => api.post(`/nfts/${nft.id}/reviews`, { rating, text: reviewText.trim() }),
        onSuccess: async () => { setReviewText(''); await qc.invalidateQueries({queryKey: ['nft-reviews', nft.id]}); }
    });
    const reviews = useQuery({
        queryKey: ['nft-reviews', nft.id],
        queryFn: ({ signal }) => get<ReviewResponse>(`/nfts/${nft.id}/reviews`, signal),
        enabled: tab === 'reviews',
    });

    return (
        <section className="nft-information" aria-label="Informações da obra">
            <div className="nft-info-tabs" role="tablist" aria-label="Conteúdo do NFT">
                <button
                    type="button"
                    role="tab"
                    aria-controls="nft-information-panel"
                    aria-selected={tab === 'details'}
                    className={tab === 'details' ? 'selected' : ''}
                    onClick={() => setTab('details')}
                >
                    Detalhes do NFT
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-controls="nft-information-panel"
                    aria-selected={tab === 'reviews'}
                    className={tab === 'reviews' ? 'selected' : ''}
                    onClick={() => setTab('reviews')}
                >
                    Avaliações de colecionadores
                </button>
            </div>
            <div id="nft-information-panel" role="tabpanel" className="nft-info-content" tabIndex={0}>
                {tab === 'details' ? (
                    <>
                        <p>{nft.description ?? `Uma obra digital de ${nft.creator}.`}</p>
                        <div className="nft-specs">
                            <span>Artista<strong>{nft.creator}</strong></span>
                            <span>Coleção<strong>{nft.collection ?? nft.category}</strong></span>
                            <span>Rede<strong>{nft.network}</strong></span>
                            <span>Disponibilidade<strong>{nft.available} unidades</strong></span>
                        </div>
                        
                    </>
                ) : reviews.isPending ? (
                    <p role="status">Carregando avaliações...</p>
                ) : reviews.isError ? (
                    <ErrorNote error={reviews.error} />
                ) : (
                    <div className="reviews-section">
                        <div className="review-score"><strong>{(reviews.data?.average ?? 0).toFixed(1)} <span aria-hidden="true">★</span></strong><span>{reviews.data?.total ?? 0} avaliações de colecionadores</span></div>
                        <div className="nft-reviews">{reviews.data?.items.slice(0,showAllReviews?undefined:4).map(review => (
                            <article key={review.id} className="nft-review">
                                <div className="nft-review-head"><span className="nft-review-avatar" aria-hidden="true">{review.author.trim().slice(0,1).toUpperCase()}</span><div className="nft-review-person"><strong>{review.author}</strong><small>{new Date(review.createdAt).toLocaleDateString('pt-BR')}</small></div><span className="nft-review-stars" aria-label={`${review.rating} de 5 estrelas`}>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</span></div>
                                <p>{review.text}</p>
                            </article>
                        ))}</div>
                        {(reviews.data?.items.length??0)>4&&<button type="button" className="review-show-more" onClick={()=>setShowAllReviews(value=>!value)}>{showAllReviews?'Mostrar menos avaliações':`Ver todas as ${reviews.data?.total} avaliações`}</button>}
                        {reviewSession ? <form className="review-form" onSubmit={event => {event.preventDefault();submitReview.mutate();}}>
                            <h3>Avaliar esta obra</h3>
                            <label>Nota <select className="field" aria-label="Nota da avaliação" value={rating} onChange={event=>setRating(Number(event.target.value))}>{[5,4,3,2,1].map(value=><option key={value} value={value}>{value} estrela{value>1?'s':''}</option>)}</select></label>
                            <label>Comentário <textarea className="field" required minLength={10} maxLength={500} rows={3} value={reviewText} onChange={event=>setReviewText(event.target.value)} placeholder="O que você achou desta obra?"/></label>
                            {submitReview.isError&&<ErrorNote error={submitReview.error}/>}
                            {submitReview.isSuccess&&<p role="status">Sua avaliação foi publicada.</p>}
                            <Button disabled={submitReview.isPending||reviewText.trim().length<10}>Publicar avaliação</Button>
                        </form> : <p><Link to="/login" search={{redirect:`/nft/${nft.id}`}}>Entre na sua conta</Link> para avaliar esta obra.</p>}
                    </div>
                )}
            </div>
        </section>
    );
}

export function Detail() {
    const { id } = useParams({ from: '/nft/$id' });
    const [quantity, setQuantity] = useState(1);
    const [copied, setCopied] = useState(false);
    const [infoTab, setInfoTab] = useState<'details' | 'reviews'>('details');
    const nftQuery = useQuery({
        queryKey: ['nft', id],
        queryFn: ({ signal }) => get<Nft>(`/nfts/${id}`, signal),
    });

    useEffect(() => {
        setQuantity(1);
        setCopied(false);
    }, [id]);

    if (nftQuery.isPending) {
        return (
            <main className="container page">
                <div className="detail-layout">
                    <div className="gallery-loading"><Skeleton /><Skeleton /><Skeleton /></div>
                    <div className="detail-loading"><Skeleton /><Skeleton /><Skeleton /></div>
                </div>
            </main>
        );
    }

    if (nftQuery.isError || !nftQuery.data) {
        const missing = axios.isAxiosError(nftQuery.error) && nftQuery.error.response?.status === 404;
        return (
            <main className="container page">
                <h1>{missing ? 'NFT não encontrado' : 'Não foi possível carregar este NFT'}</h1>
                <ErrorNote error={nftQuery.error} />
                <div className="detail-actions">
                    <Button onClick={() => void nftQuery.refetch()}>Tentar novamente</Button>
                    <Button asChild variant="outline"><Link to="/">Voltar ao catálogo</Link></Button>
                </div>
            </main>
        );
    }

    const nft = nftQuery.data;

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2500);
        } catch {
            setCopied(false);
        }
    }

    return (
        <main className="container page detail-page">
            <nav className="detail-breadcrumb" aria-label="Localização">
                <Link to="/">Início</Link>
                <span>/</span>
                <Link to="/" hash="marketplace">Mercado</Link>
            </nav>
            <div className="detail-layout">
                <NftGallery nft={nft} />
                <div className="detail-copy">
                    <h1>{nft.name}</h1>
                    <p className="detail-price">{eth(nft.price)}</p>
                    <NftRating nftId={nft.id} openReviews={() => {setInfoTab('reviews');window.requestAnimationFrame(() => document.getElementById('nft-information-panel')?.scrollIntoView({behavior:'smooth',block:'center'}));}} />
                    <h2>Sobre este NFT</h2>
                    <p className="muted">{nft.description ?? `Obra digital de ${nft.creator}.`}</p>
                    <p className="eyebrow edition-label">Edição:</p>
                    <div className="edition-options" aria-label="Edições disponíveis">
                        <span className="selected">1/{nft.available}</span><span>ABERTA</span>
                    </div>
                    <div className="quantity">
                        <button
                            type="button"
                            aria-label="Diminuir quantidade"
                            disabled={quantity <= 1 || nft.available === 0}
                            onClick={() => setQuantity(current => Math.max(1, current - 1))}
                        >
                            <Minus size={18} />
                        </button>
                        <output aria-label="Quantidade">{quantity}</output>
                        <button
                            type="button"
                            aria-label="Aumentar quantidade"
                            disabled={quantity >= nft.available}
                            onClick={() => setQuantity(current => Math.min(nft.available, current + 1))}
                        >
                            <Plus size={18} />
                        </button>
                        
                    </div>
                    <div className="detail-actions">
                        <BuyNowButton id={nft.id} quantity={quantity} disabled={nft.available === 0} />
                        <FavButton id={nft.id} />
                        <AddButton id={nft.id} quantity={quantity} disabled={nft.available === 0} />
                    </div>
                    <div className="nft-quick-info">
                        <span>ID do token: #{nft.id.padStart(4, '0')}</span>
                        <span>Coleção: {nft.collection ?? nft.category}</span>
                        <span>Atributos: {nft.category}, {nft.network}</span>
                        <button type="button" className="share-link" onClick={() => void copyLink()}>
                            <Copy size={14} />{copied ? 'Link copiado' : 'Copiar link da obra'}
                        </button>
                    </div>

                </div>
            </div>
            <NftInformation nft={nft} tab={infoTab} setTab={setInfoTab} />
            <RelatedNfts currentId={nft.id} />
        </main>
    );
}

export function CartPage() {
    const { data: cart, isPending, isError: cartError, error: cartIssue, refetch: retryCart } = useCart();
    const { data: quote, isPending: quoteLoading, isError: quoteError, error: quoteIssue } = useQuote(3000);
    const refresh = useRefresh();
    const [coupon, setCoupon] = useState('');
    const edit = useMutation({
        mutationFn: ({ id, quantity }: { id: string; quantity: number }) => quantity === 0 ? api.delete(`/cart/${id}`) : api.patch(`/cart/${id}`, { quantity }),
        onSuccess: refresh,
    });
    const couponMutation = useMutation({
        mutationFn: (code: string) => code ? api.post('/coupon', { code }) : api.delete('/coupon'),
        onSuccess: refresh,
    });
    return <main className="container page cart-page">
        <nav className="detail-breadcrumb"><Link to="/">Início</Link> / <Link to="/" hash="marketplace">Mercado</Link> / Carrinho</nav>
        <h1 className="page-heading">Carrinho de NFTs</h1>
        {isPending ? <LoadingCards count={3}/> : cartError ? <div role="alert" className="notice">{message(cartIssue)} <button onClick={() => void retryCart()}>Tentar novamente</button></div> : !cart?.items.length ?
            <div className="empty-state"><h2>Seu carrinho está vazio</h2><p className="muted">Explore o marketplace e comece sua coleção.</p><Button asChild><Link to="/" hash="marketplace">Explorar NFTs</Link></Button></div> :
            <>
                <div className="cart-layout">
                    <div className="cart-items">
                        <div className="cart-table-head" aria-hidden="true"><span>NFTs</span><span>Preço</span><span>Edições</span><span>Total</span><span></span></div>
                        {quote?.items.map(({ nft, quantity, lineTotal }) =>
                            <div className="cart-item" key={nft.id}>
                                <div className="cart-product"><img src={nft.image} alt={nft.name}/><div className="cart-item-body"><Link to="/nft/$id" params={{id:nft.id}} className="item-title">{nft.name}</Link><span className="muted">ID do token: #{nft.id.padStart(4,'0')}</span><small>{nft.network} · {nft.available} disponíveis</small></div></div>
                                <strong className="cart-unit-price">{eth(nft.price)}</strong>
                                <div className="quantity compact cart-quantity"><button type="button" aria-label={`Diminuir ${nft.name}`} disabled={edit.isPending} onClick={() => edit.mutate({id:nft.id,quantity:Math.max(0,quantity-1)})}>−</button><output>{quantity}</output><button type="button" aria-label={`Aumentar ${nft.name}`} disabled={edit.isPending||quantity>=nft.available} onClick={() => edit.mutate({id:nft.id,quantity:quantity+1})}>+</button></div>
                                <strong className="price cart-line-total">{eth(lineTotal)}</strong>
                                <button type="button" className="cart-remove" aria-label={`Remover ${nft.name}`} title={`Remover ${nft.name}`} disabled={edit.isPending} onClick={() => edit.mutate({id:nft.id,quantity:0})}><Trash2 size={21}/></button>
                            </div>
                        )}
                        {edit.isError && <ErrorNote error={edit.error}/>}
                    </div>
                    <aside className="panel summary cart-summary">
                        <h2>Resumo da carteira</h2>
                        <form className="coupon" onSubmit={event => {event.preventDefault();couponMutation.mutate(coupon.trim());}}><label htmlFor="coupon">Código promocional</label><div><input id="coupon" aria-label="Cupom" className="field" placeholder="Digite o código promocional..." value={coupon} onChange={event => setCoupon(event.target.value)}/><Button type="submit" size="sm">Aplicar</Button></div></form>
                        {quote?.couponCode && <button type="button" className="text-button" onClick={() => couponMutation.mutate('')}>Remover cupom {quote.couponCode}</button>}
                        {couponMutation.isError && <ErrorNote error={couponMutation.error}/>}
                        <div className="line"><span>Subtotal</span><strong>{quote ? eth(quote.subtotal) : '—'}</strong></div>
                        <div className="line"><span>Desconto do lançamento</span><strong>{quote ? eth(quote.discount) : '—'}</strong></div>
                        <div className="line"><span>Taxa de rede</span><strong>{quote ? eth(quote.networkFee) : '—'}</strong></div>
                        <div className="line total"><strong>Total</strong><strong className="price">{quote ? eth(quote.total) : '—'}</strong></div>
                        {quoteLoading && <div className="quote-skeleton"><Skeleton /></div>}
                        {quoteError && <ErrorNote error={quoteIssue}/>}
                        <Button asChild className="full" aria-disabled={quoteLoading || quoteError}><Link to="/checkout" disabled={quoteLoading || quoteError}>Conectar e finalizar <ArrowRight size={16}/></Link></Button>
                        <Link className="cart-continue" to="/" hash="marketplace">Continuar explorando</Link>
                    </aside>
                </div>
                <RelatedNfts currentId="" />
            </>
        }
    </main>;
}
function AuthForm({ mode }: { mode: 'login' | 'register' }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [socialError, setSocialError] = useState('');
    const [formError, setFormError] = useState('');
    const dialogRef = useRef<HTMLDivElement>(null);
    const qc = useQueryClient();
    const navigate = useNavigate();
    const search = useSearch({ strict: false });
    const target = 'redirect' in search && typeof search.redirect === 'string' ? search.redirect : '';
    const redirect = target.startsWith('/') && !target.startsWith('//') ? target : '/account';
    const mutation = useMutation({
        mutationFn: () => api.post(mode === 'login' ? '/login' : '/register', mode === 'login' ? { email:email.trim(), password } : { name:name.trim(), email:email.trim(), password }),
        onSuccess: async () => { qc.clear(); await navigate({ to: redirect }); }
    });
    useEffect(() => {
        dialogRef.current?.querySelector<HTMLInputElement>('input')?.focus();
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') void navigate({ to: '/' });
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [navigate]);
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError('');
        if (mode === 'register' && password !== confirmPassword) { setFormError('As senhas não coincidem.'); return; }
        mutation.mutate();
    };
    return <>
        <Home/>
        <div className="auth-overlay">
            <div className="auth-modal" role="dialog" aria-modal="false" aria-labelledby="auth-title" ref={dialogRef}>
                <Link className="auth-close" to="/" aria-label="Fechar janela"><X size={18}/></Link>
                <h1 id="auth-title" className="auth-tabs">
                    <Link className={mode==='login'?'selected':''} to="/login" search={{redirect:target||undefined}}>Entrar</Link>
                    <span>|</span>
                    <Link className={mode==='register'?'selected':''} to="/register" search={{redirect:target||undefined}}>Criar conta</Link>
                </h1>
                <p className="auth-description">{mode==='login'?'Entre para gerenciar sua carteira, coleção e perfil de criador.':'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'}</p>
                <form className="auth-modal-form" onSubmit={submit}>
                    {mode==='register'&&<label className="auth-field"><span>Nome completo</span><Input className="field" required minLength={2} maxLength={80} autoComplete="name" placeholder="Nome de usuário" value={name} onChange={e=>setName(e.target.value)}/></label>}
                    <label className="auth-field"><span>E-mail</span><Input className="field" type="email" autoComplete="email" required placeholder={mode==='login'?'contato@email.com':'Digite seu e-mail'} value={email} onChange={e=>setEmail(e.target.value)}/></label>
                    <label className="auth-field"><span>Senha</span><span className="auth-password"><Input className="field" aria-label="Senha" type={showPassword?'text':'password'} autoComplete={mode==='login'?'current-password':'new-password'} minLength={mode==='register'?8:1} required placeholder={mode==='login'?'Senha':'Senha'} value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" aria-label={showPassword?'Ocultar conteúdo':'Mostrar conteúdo'} title={showPassword?'Ocultar senha':'Mostrar senha'} onClick={()=>setShowPassword(value=>!value)}>{showPassword?<Eye size={19}/>:<EyeOff size={19}/>}</button></span></label>
                    {mode==='register'&&<label className="auth-field"><span>Confirmação</span><Input className="field" type={showPassword?'text':'password'} required minLength={8} autoComplete="new-password" placeholder="Confirmar senha" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></label>}
                    {mode==='login'&&<Link className="auth-forgot" to="/help">Esqueceu a senha?</Link>}
                    {formError&&<p className="auth-error" role="alert">{formError}</p>}
                    {mutation.isError&&<ErrorNote error={mutation.error}/>}
                    <Button className="auth-submit" disabled={mutation.isPending}>{mutation.isPending?'Aguarde...':mode==='login'?'Entrar':'Criar conta'}</Button>
                </form>
                <div className="auth-social-divider"><span>Ou continue com</span></div>
                <div className="auth-social">
                    <button type="button" onClick={()=>setSocialError('Entre com seu e-mail e senha. A conexão com Google não está habilitada.')}><span className="google-mark" aria-hidden="true">G</span>Continuar com Google</button>
                    <button type="button" onClick={()=>setSocialError('Entre com seu e-mail e senha. A conexão com Facebook não está habilitada.')}><Facebook size={20} color="#4476c7" fill="#4476c7"/>Continuar com Facebook</button>
                    {socialError&&<p className="auth-social-notice" role="status">{socialError}</p>}
                </div>
            </div>
        </div>
    </>;
}
export function Login() { return <AuthForm mode="login"/>; }
export function Register() { return <AuthForm mode="register"/>; }
function PrivateNotice() { const location = useLocation(); return <div className="empty-state"><h2>Entre para acessar sua conta</h2><p className="muted">Esta área é reservada a colecionadores autenticados.</p><Button asChild><Link to="/login" search={{ redirect: location.pathname }}>Fazer login</Link></Button></div>; }
function AccountSidebar() {
    const location = useLocation();
    const qc = useQueryClient();
    const navigate = useNavigate();
    const logout = useMutation({ mutationFn: () => api.post('/logout'), onSuccess: async () => { await qc.cancelQueries(); qc.removeQueries({ predicate: query => query.queryKey[0] !== 'session' }); qc.setQueryData(['session'], null); await qc.invalidateQueries({ queryKey: ['session'] }); await navigate({to:'/'}); } });
    return <aside className="account-sidebar" aria-label="Menu do perfil">
        <h2>Meu perfil</h2>
        <Link to="/account" className={location.pathname==='/account'?'selected':''}><UserRound size={16}/> Dados do perfil</Link>
        <Link to="/wallets" className={location.pathname==='/wallets'?'selected':''}><Wallet size={16}/> Carteiras</Link>
        <Link to="/account" hash="activity"><ShoppingCart size={16}/> Atividade</Link>
        <Link to="/account" hash="favorites"><Heart size={16}/> Lista de interesse</Link>
        <Link to="/" hash="marketplace"><Star size={16}/> Ofertas</Link>
        <button className="account-logout" type="button" disabled={logout.isPending} onClick={()=>logout.mutate()}>Sair da conta</button>
    </aside>;
}
export function Account() {
    const {data: session,isPending} = useSession();
    const qc = useQueryClient();
    const profile = useQuery({queryKey:['profile',session?.user.id],queryFn:({signal})=>get<UserAccount>('/profile',signal),enabled:!!session});
    const favorites = useQuery({queryKey:['favorites',session?.user.id],queryFn:({signal})=>get<{ids:string[];items:Nft[]}>('/favorites',signal),enabled:!!session});
    const orders = useQuery({queryKey:['orders',session?.user.id],queryFn:({signal})=>get<{items:Order[]}>('/orders',signal),enabled:!!session});
    const [name,setName] = useState('');
    const [email,setEmail] = useState('');
    const [username,setUsername] = useState('');
    const [ens,setEns] = useState('');
    const [nickname,setNickname] = useState('');
    const [avatar,setAvatar] = useState('');
    const [currentPassword,setCurrentPassword] = useState('');
    const [newPassword,setNewPassword] = useState('');
    const [confirmedPassword,setConfirmedPassword] = useState('');
    const uploadRef = useRef<HTMLInputElement>(null);
    useEffect(()=>{
        if (!profile.data) return;
        setName(profile.data.name);
        setEmail(profile.data.email);
        setUsername(profile.data.username??'');
        setEns(profile.data.ens??'');
        setNickname(profile.data.nickname??'');
        setAvatar(profile.data.avatar??'');
    },[profile.data]);
    const save = useMutation({mutationFn:()=>api.patch('/profile',{name,email,username,ens,nickname,avatar}),onSuccess:()=>{
        void qc.invalidateQueries({queryKey:['profile']});
        void qc.invalidateQueries({queryKey:['session']});
    }});
    const password = useMutation({mutationFn:()=>api.patch('/profile/password',{currentPassword,newPassword}),onSuccess:()=>{
        setCurrentPassword('');setNewPassword('');setConfirmedPassword('');
    }});
    function uploadAvatar(file?:File) {
        if (!file || !file.type.startsWith('image/') || file.size>450000) return;
        const reader = new FileReader();
        reader.onload=()=>{if(typeof reader.result==='string')setAvatar(reader.result);};
        reader.readAsDataURL(file);
    }
    if(isPending)return <main className="container page">Carregando sessão...</main>;
    if(!session)return <main className="container page"><PrivateNotice/></main>;
    return <main className="container page account-page"><div className="account-scaffold">
        <AccountSidebar/>
        <div className="account-content">
            <div className="account-heading"><div><h1 className="page-heading">Perfil do colecionador</h1><p className="muted">Seus dados, preferências e obras favoritas.</p></div><Button asChild variant="outline"><Link to="/wallets"><Wallet size={16}/> Minhas carteiras</Link></Button></div>
            <form className="collector-profile-form" onSubmit={event=>{event.preventDefault();save.mutate();}}>
                <div className="profile-field-grid">
                    <label>Nome de exibição *<Input className="field" required maxLength={80} value={name} onChange={event=>setName(event.target.value)}/></label>
                    <label>Nome do usuário *<Input className="field" required placeholder="nome_de_usuario" pattern="[a-zA-Z0-9_.-]{3,24}" value={username} onChange={event=>setUsername(event.target.value)}/></label>
                    <label>E-mail *<Input className="field" type="email" required value={email} onChange={event=>setEmail(event.target.value)}/></label>
                    <label>Nome ENS *<Input className="field" required placeholder="colecionador.eth" pattern="[a-z0-9-]+\.eth" value={ens} onChange={event=>setEns(event.target.value)}/></label>
                    <label>Apelido da carteira *<Input className="field" required maxLength={60} placeholder="Minha carteira principal" value={nickname} onChange={event=>setNickname(event.target.value)}/></label>
                    <div className="profile-avatar-field"><span>Avatar</span><div className="avatar-controls">{avatar?<img className="avatar-round" src={avatar} alt="Avatar atual"/>:<span className="avatar-round avatar-placeholder"><UserRound size={23}/></span>}<input ref={uploadRef} type="file" accept="image/png,image/jpeg,image/webp" className="visually-hidden" onChange={event=>uploadAvatar(event.target.files?.[0])}/><Button type="button" onClick={()=>uploadRef.current?.click()}>Alterar</Button>{avatar&&<button type="button" className="text-button" onClick={()=>setAvatar('')}>Remover</button>}</div><small>Imagem PNG, JPG ou WebP até 450 KB.</small></div>
                </div>
                {save.isError&&<ErrorNote error={save.error}/>}
                <div className="profile-save"><Button disabled={save.isPending}>{save.isPending?'Salvando...':'Salvar'}</Button>{save.isSuccess&&<span role="status"><Check size={16}/> Perfil atualizado</span>}</div>
            </form>
            <form className="password-form" onSubmit={event=>{event.preventDefault();if(newPassword===confirmedPassword)password.mutate();}}>
                <h2>Alterar senha</h2>
                <label>Senha atual<Input className="field" type="password" autoComplete="current-password" required value={currentPassword} onChange={event=>setCurrentPassword(event.target.value)}/></label>
                <label>Nova senha<Input className="field" type="password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={event=>setNewPassword(event.target.value)}/></label>
                <label>Confirmar nova senha<Input className="field" type="password" autoComplete="new-password" required minLength={8} value={confirmedPassword} onChange={event=>setConfirmedPassword(event.target.value)}/></label>
                {confirmedPassword&&newPassword!==confirmedPassword&&<span role="alert" className="notice">As senhas não coincidem.</span>}
                {password.isError&&<ErrorNote error={password.error}/>}
                <div className="profile-save"><Button disabled={password.isPending||newPassword!==confirmedPassword}>Atualizar senha</Button>{password.isSuccess&&<span role="status">Senha atualizada</span>}</div>
            </form>
            <section className="collection-section" id="favorites"><div className="section-head"><div><p className="eyebrow">SUA CURADORIA</p><h2>Obras favoritas</h2></div></div>
                {favorites.isError&&<ErrorNote error={favorites.error}/>}
                {favorites.isPending?<LoadingCards count={3}/>:!favorites.data?.items.length?<p className="muted">Você ainda não salvou nenhum NFT. <Link to="/" hash="marketplace">Explorar marketplace</Link></p>:<div className="grid-nfts">{favorites.data.items.map(nft=><NFTCard key={nft.id} nft={nft}/>)}</div>}
            </section>
            <section className="collection-section" id="activity"><div className="section-head"><div><p className="eyebrow">HISTÓRICO</p><h2>Meus pedidos</h2></div></div>
                {orders.isError&&<ErrorNote error={orders.error}/>}
                {orders.isPending?<p className="muted">Carregando pedidos...</p>:!orders.data?.items.length?<p className="muted">Nenhuma compra realizada ainda.</p>:<div className="orders-list">{orders.data.items.map(order=><Link key={order.id} className="order-row" to="/order/$id" params={{id:order.id}}><span><strong>{order.id}</strong><small>{new Date(order.createdAt).toLocaleDateString('pt-BR')} · {order.quote.items.length} obra(s)</small></span><strong>{eth(order.quote.total)}</strong><span className={`order-pill ${order.status}`}>{order.status==='confirmed'?'Confirmado':order.status==='pending'?'Pendente':'Recusado'}</span><ArrowRight size={18}/></Link>)}</div>}
            </section>
        </div>
    </div></main>;
}
export function Wallets() {
    const {data:session,isPending} = useSession();
    const qc = useQueryClient();
    const {data,isError,error} = useQuery({queryKey:['wallets',session?.user.id],queryFn:({signal})=>get<{items:WalletType[]}>('/wallets',signal),enabled:!!session});
    const [name,setName] = useState('');
    const [address,setAddress] = useState('');
    const [network,setNetwork] = useState('Ethereum');
    const [provider,setProvider] = useState('MetaMask');
    const [alias,setAlias] = useState('');
    const [profileName,setProfileName] = useState('');
    const [email,setEmail] = useState('');
    const [referral,setReferral] = useState('');
    const [ens,setEns] = useState('');
    const [secondaryAddress,setSecondaryAddress] = useState('');
    const [editing,setEditing] = useState<string|null>(null);
    const [editName,setEditName] = useState('');
    const [editAddress,setEditAddress] = useState('');
    const [editNetwork,setEditNetwork] = useState('Ethereum');
    const [editProvider,setEditProvider] = useState('MetaMask');
    const save = useMutation({mutationFn:()=>api.post('/wallets',{name,address,network,provider,alias,profileName,email,referral,ens,secondaryAddress}),onSuccess:()=>{
        setAddress('');setName('');setAlias('');setProfileName('');setReferral('');setEns('');setSecondaryAddress('');void qc.invalidateQueries({queryKey:['wallets']});
    }});
    const primary = useMutation({mutationFn:(id:string)=>api.patch(`/wallets/${id}`,{primary:true}),onSuccess:()=>void qc.invalidateQueries({queryKey:['wallets']})});
    const connection = useMutation({mutationFn:({id,connected}:{id:string;connected:boolean})=>api.post(`/wallets/${id}/${connected?'disconnect':'connect'}`),onSuccess:()=>void qc.invalidateQueries({queryKey:['wallets']})});
    const rename = useMutation({mutationFn:({id,name,address,network,provider}:{id:string;name:string;address:string;network:string;provider:string})=>api.patch(`/wallets/${id}`,{name,address,network,provider}),onSuccess:()=>{setEditing(null);void qc.invalidateQueries({queryKey:['wallets']});}});
    if(isPending)return <main className="container page">Carregando sessão...</main>;
    if(!session)return <main className="container page"><PrivateNotice/></main>;
    return <main className="container page account-page"><div className="account-scaffold"><AccountSidebar/><div className="account-content">
        <div className="account-heading"><div><h1 className="page-heading">Minhas carteiras</h1><p className="muted">Gerencie suas carteiras, redes e conexões neste marketplace.</p></div></div>
        <h2 className="wallet-section-title">Carteira principal</h2>
        <p className="muted">As carteiras cadastradas ficam disponíveis no pagamento e na sua coleção.</p>
        <div className="wallet-list">{isError&&<ErrorNote error={error}/>}{!data?.items.length?<p className="muted">Você ainda não cadastrou uma carteira.</p>:data.items.map(w=><article className={`wallet-row ${w.primary?'primary-wallet':''}`} key={w.id}>
            <div className="wallet-identity"><span className="wallet-provider"><Wallet size={20}/></span><div><strong>{w.name} {w.primary?'· Principal':''}</strong><p>{w.provider??'MetaMask'} · {w.network}</p><small>{w.address.slice(0,8)}…{w.address.slice(-6)}</small></div></div>
            <div className="wallet-actions">{!w.primary&&<Button size="sm" variant="outline" disabled={primary.isPending} onClick={()=>primary.mutate(w.id)}>Tornar principal</Button>}<Button size="sm" variant="outline" disabled={connection.isPending} onClick={()=>connection.mutate({id:w.id,connected:!!w.connected})}>{w.connected?'Desconectar':'Conectar'}</Button><button className="text-button" type="button" onClick={()=>{setEditing(w.id);setEditName(w.name);setEditAddress(w.address);setEditNetwork(w.network);setEditProvider(w.provider??'MetaMask');}}>Editar</button></div>
            {editing===w.id&&<form className="wallet-rename wallet-edit" onSubmit={event=>{event.preventDefault();rename.mutate({id:w.id,name:editName.trim(),address:editAddress.trim(),network:editNetwork,provider:editProvider});}}>
            <label>Nome da carteira *<Input className="field" value={editName} maxLength={70} required onChange={event=>setEditName(event.target.value)}/></label>
            <label>Rede *<select className="field" required value={editNetwork} onChange={event=>setEditNetwork(event.target.value)}>{networks.map(net=><option key={net}>{net}</option>)}</select></label>
            <label>Endereço *<Input className="field" value={editAddress} required pattern={editNetwork==='Solana'?'[1-9A-HJ-NP-Za-km-z]{32,44}':'0x[a-fA-F0-9]{40}'} onChange={event=>setEditAddress(event.target.value)}/></label>
            <label>Tipo *<select className="field" required value={editProvider} onChange={event=>setEditProvider(event.target.value)}><option>MetaMask</option><option>WalletConnect</option><option>Coinbase Wallet</option></select></label>
            <Button size="sm" disabled={rename.isPending}>Salvar alterações</Button><Button size="sm" type="button" variant="outline" onClick={()=>setEditing(null)}>Cancelar</Button>
        </form>}
        </article>)}{connection.isError&&<ErrorNote error={connection.error}/>}{rename.isError&&<ErrorNote error={rename.error}/>}</div>
        <form className="wallet-register" onSubmit={event=>{event.preventDefault();save.mutate();}}>
            <h2>Adicionar carteira</h2>
            <div className="profile-field-grid">
                <label>Nome de exibição *<Input className="field" value={name} required placeholder="Minha carteira" onChange={event=>setName(event.target.value)}/></label>
                <label>Rede *<select className="field" value={network} onChange={event=>setNetwork(event.target.value)}>{networks.map(n=><option key={n}>{n}</option>)}</select></label>
                <label>Endereço da carteira *<Input className="field" value={address} required pattern={network==='Solana'?'[1-9A-HJ-NP-Za-km-z]{32,44}':'0x[a-fA-F0-9]{40}'} placeholder={network==='Solana'?'Endereço Solana':'0x...'} onChange={event=>setAddress(event.target.value)}/></label>
                <label>Tipo de carteira *<select className="field" value={provider} required onChange={event=>setProvider(event.target.value)}><option>MetaMask</option><option>WalletConnect</option><option>Coinbase Wallet</option></select></label>
                <label>Apelido da carteira *<Input className="field" required value={alias} onChange={event=>setAlias(event.target.value)} placeholder="Principal"/></label>
                <label>Nome do perfil *<Input className="field" required value={profileName} onChange={event=>setProfileName(event.target.value)} placeholder="Nome do colecionador"/></label>
                <label>Código de indicação *<Input className="field" required minLength={3} value={referral} onChange={event=>setReferral(event.target.value)} placeholder="Código de indicação"/></label>
                <label>E-mail *<Input className="field" type="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="email@exemplo.com"/></label>
                <label>Nome ENS *<Input className="field" required pattern="[a-zA-Z0-9-]{2,40}\.eth" value={ens} onChange={event=>setEns(event.target.value)} placeholder="nome.eth"/></label>
                <label>Carteira secundária (opcional)<Input className="field" value={secondaryAddress} onChange={event=>setSecondaryAddress(event.target.value)} placeholder="ENS ou endereço secundário"/></label>
            </div>
            {save.isError&&<ErrorNote error={save.error}/>}
            <Button disabled={save.isPending}>{save.isPending?'Salvando...':'Salvar carteira'}</Button>
            {save.isSuccess&&<p role="status">Carteira cadastrada com sucesso.</p>}

        </form>
    </div></div></main>;
}
export function Checkout() {
    const { data: session, isPending } = useSession(), { data: quote, isPending: quoteLoading, isError: quoteError, error: quoteIssue, refetch } = useQuote(1000);
    const { data: wallets } = useQuery({ queryKey: ['wallets', session?.user.id], queryFn: ({ signal }) => get<{
            items: WalletType[];
        }>('/wallets', signal), enabled: !!session });
    const [walletId, setWalletId] = useState(''), [reviewed, setReviewed] = useState(false);
    const [collectorName, setCollectorName] = useState('');
    const [collectorEmail, setCollectorEmail] = useState('');
    const [collectorUsername, setCollectorUsername] = useState('');
    const [collectorProfile, setCollectorProfile] = useState('');
    const [collectorEns, setCollectorEns] = useState('');
    const [collectorNote, setCollectorNote] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [walletAlias, setWalletAlias] = useState('');
    const [secondaryWallet, setSecondaryWallet] = useState('');
    const [collectorNetwork, setCollectorNetwork] = useState('');
    const [walletType, setWalletType] = useState('');
    useEffect(() => {
        if (session) {
            setCollectorName(session.user.name);
            setCollectorEmail(session.user.email);
            setCollectorUsername(session.user.username || session.user.email.split('@')[0]);
            setCollectorProfile(session.user.nickname || session.user.name);
            setCollectorEns(session.user.ens??'');
        }
    }, [session?.user.id]);
    const key = useRef<string>(crypto.randomUUID());
    const qc = useQueryClient();
    const navigate = useNavigate();
    const saveAttempt = () => {
        if (!session || !quote)
            return key.current;
        const signature = JSON.stringify({ userId: session.user.id, version: quote.version, total: quote.total, walletId, collectorName: collectorName.trim(), collectorEmail: collectorEmail.trim(), collectorUsername, collectorProfile, collectorEns, collectorNote, referralCode, walletAlias, secondaryWallet, collectorNetwork, walletType });
        const stored = localStorage.getItem('kurio:checkout-attempt');
        try {
            const data = stored ? JSON.parse(stored) as {
                signature: string;
                key: string;
            } : null;
            if (data?.signature === signature) {
                key.current = data.key;
                return data.key;
            }
        }
        catch {
            localStorage.removeItem('kurio:checkout-attempt');
        }
        key.current = crypto.randomUUID();
        localStorage.setItem('kurio:checkout-attempt', JSON.stringify({ signature, key: key.current }));
        return key.current;
    };
    const clearAttempt = () => localStorage.removeItem('kurio:checkout-attempt');
    useEffect(() => { if (wallets?.items.length && !walletId)
        setWalletId(wallets.items.find(w => w.primary)?.id ?? wallets.items[0].id); }, [wallets, walletId]);
    useEffect(() => setReviewed(false), [quote?.version]);
    const connectWallet = useMutation({ mutationFn: () => api.post(`/wallets/${walletId}/connect`), onSuccess: () => void qc.invalidateQueries({ queryKey: ['wallets'] }) });
    const selectedWallet = wallets?.items.find(w => w.id === walletId);
    useEffect(() => { if (selectedWallet) { setCollectorNetwork(selectedWallet.network);setWalletType(selectedWallet.provider??'MetaMask');setWalletAlias(selectedWallet.name); } }, [selectedWallet?.id]);
    const collectorValid = !!collectorName.trim() && !!collectorUsername.trim() && !!collectorProfile.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(collectorEmail) && !!collectorNetwork && !!selectedWallet?.address && !!walletType && !!walletAlias.trim() && referralCode.trim().length >= 3 && /^[a-zA-Z0-9-]{2,40}\.eth$/.test(collectorEns.trim());
    const mutation = useMutation({ mutationFn: async () => {
            const freshQuote = await get<Quote>('/quote');
            if (!quote || freshQuote.version !== quote.version || freshQuote.total !== quote.total) {
                await qc.invalidateQueries({ queryKey: ['quote'] });
                setReviewed(false);
                throw new Error('A cotação foi alterada. Revise os novos valores antes de confirmar.');
            }
            const idempotencyKey = saveAttempt();
            try {
                const response = await api.post<Order>('/orders', { expectedTotal: freshQuote.total, version: freshQuote.version, walletId, collector: { name: collectorName.trim(), email: collectorEmail.trim(), username:collectorUsername.trim(), profile:collectorProfile.trim(), ens:collectorEns.trim(), note:collectorNote.trim(), referralCode:referralCode.trim(), walletAlias:walletAlias.trim(), secondaryWallet:secondaryWallet.trim(), walletNetwork:collectorNetwork, walletProvider:walletType, walletAddress:selectedWallet?.address??'' } }, { headers: { 'Idempotency-Key': idempotencyKey } });
                return response.data;
            }
            catch (error) {
                try {
                    const response = await api.get<Order>(`/orders/recover/${idempotencyKey}`);
                    return response.data;
                }
                catch {
                    throw error;
                }
            }
        }, onSuccess: async (order) => { if (order.status === 'pending') { const stored = localStorage.getItem('kurio:checkout-attempt'); if (stored) { try { const attempt = JSON.parse(stored) as { signature: string; key: string }; localStorage.setItem('kurio:checkout-attempt', JSON.stringify({ ...attempt, orderId: order.id })); } catch { clearAttempt(); } } } else { clearAttempt(); } await Promise.all([qc.invalidateQueries({ queryKey: ['cart'] }), qc.invalidateQueries({ queryKey: ['quote'] })]); await navigate({ to: '/order/$id', params: { id: order.id } }); }, onError: () => { void refetch(); } });
    if (isPending)
        return <main className="container page">Verificando sessão...</main>;
    if (!session)
        return <main className="container page"><div className="empty-state"><h1>Faça login para finalizar</h1><p className="muted">Seu carrinho será preservado.</p><Button asChild><Link to="/login" search={{ redirect: '/checkout' }}>Fazer login</Link></Button></div></main>;
    if (quoteLoading)
        return <main className="container page"><h1>Preparando pagamento</h1><div className="quote-skeleton"><Skeleton /></div></main>;
    if (quoteError)
        return <main className="container page"><h1>Não foi possível consultar sua cotação</h1><ErrorNote error={quoteIssue}/><Button onClick={() => void refetch()}>Recarregar cotação</Button></main>;
    if (!quote?.items.length)
        return <main className="container page"><h1>Carrinho vazio</h1><Button asChild><Link to="/cart">Voltar ao carrinho</Link></Button></main>;
    return <main className="container page checkout-page">
        <nav className="detail-breadcrumb"><Link to="/">Início</Link> / <Link to="/" hash="marketplace">Mercado</Link> / Pagamento</nav>
        <h1 className="page-heading">Revisar pagamento</h1>
        <div className="cart-layout checkout-layout">
            <div className="checkout-form-panel">
                <h2>Perfil do colecionador</h2>
                <form id="checkout-collector-form" className="profile-field-grid checkout-fields" onSubmit={event=>{event.preventDefault();if(collectorValid&&reviewed&&selectedWallet?.connected&&!mutation.isPending)mutation.mutate();}}>
                    <label>Nome de exibição *<Input className="field" required maxLength={80} value={collectorName} onChange={event=>{setCollectorName(event.target.value);setReviewed(false);}}/></label>
                    <label>Nome de usuário *<Input className="field" required minLength={3} maxLength={40} value={collectorUsername} onChange={event=>{setCollectorUsername(event.target.value);setReviewed(false);}}/></label>
                    <label>Rede *<select className="field" required value={collectorNetwork} onChange={event=>{setCollectorNetwork(event.target.value);setReviewed(false);}}><option value="">Selecione uma rede</option>{networks.map(n=><option key={n} value={n}>{n}</option>)}</select></label>
                    <label>Nome do perfil *<Input className="field" required maxLength={80} value={collectorProfile} onChange={event=>{setCollectorProfile(event.target.value);setReviewed(false);}}/></label>
                    <label>Endereço da carteira *<Input className="field" readOnly required value={selectedWallet?.address??''} placeholder="Cadastre uma carteira"/></label>
                    <label>Carteira secundária (opcional)<Input className="field" value={secondaryWallet} placeholder="ENS ou carteira secundária" onChange={event=>setSecondaryWallet(event.target.value)}/></label>
                    <label>Tipo de carteira *<select className="field" required value={walletType} onChange={event=>{setWalletType(event.target.value);setReviewed(false);}}><option value="">Selecione uma carteira</option><option value="MetaMask">MetaMask</option><option value="WalletConnect">WalletConnect</option><option value="Coinbase Wallet">Coinbase Wallet</option></select></label>
                    <label>Código de indicação *<Input className="field" required minLength={3} maxLength={32} value={referralCode} onChange={event=>{setReferralCode(event.target.value);setReviewed(false);}} placeholder="Seu código de indicação"/></label>
                    <label>E-mail *<Input className="field" type="email" required value={collectorEmail} onChange={event=>{setCollectorEmail(event.target.value);setReviewed(false);}}/></label>
                    <label>Nome ENS *<Input className="field" required pattern="[a-zA-Z0-9-]{2,40}\.eth" placeholder="exemplo.eth" value={collectorEns} onChange={event=>{setCollectorEns(event.target.value);setReviewed(false);}}/></label>
                </form>
                <label className="checkout-note">Observação do colecionador (opcional)<textarea className="field" rows={4} maxLength={400} value={collectorNote} onChange={event=>setCollectorNote(event.target.value)} placeholder="Adicione uma observação ao seu pedido"/></label>
                <h2>Pagamento com carteira</h2>
                {selectedWallet?<div className="wallet-connection"><div><strong>{selectedWallet.name}</strong><p>{selectedWallet.provider??'MetaMask'} · {selectedWallet.network} · {selectedWallet.address.slice(0,7)}…{selectedWallet.address.slice(-4)}</p><span className={selectedWallet.connected?'status-connected':'muted'}>{selectedWallet.connected?'Conectada':'Desconectada'}</span></div>{!selectedWallet.connected&&<Button size="sm" variant="outline" disabled={connectWallet.isPending} onClick={()=>connectWallet.mutate()}>Conectar</Button>}</div>:<p className="notice">Cadastre uma carteira para continuar. <Link to="/wallets">Gerenciar carteiras</Link></p>}
                {connectWallet.isError&&<ErrorNote error={connectWallet.error}/>}

            </div>
            <aside className="panel summary checkout-summary">
                <h2>Seus NFTs</h2>
                <div className="checkout-list">{quote.items.map(item=><div className="checkout-item" key={item.nft.id}><img src={item.nft.image} alt={item.nft.name}/><div><strong>{item.nft.name}</strong><span>ID do token: #{item.nft.id.padStart(4,'0')} · × {item.quantity}</span></div><b>{eth(item.lineTotal)}</b></div>)}</div>
                <div className="line"><span>Subtotal</span><strong>{eth(quote.subtotal)}</strong></div>
                <div className="line"><span>Desconto do lançamento</span><strong>{eth(quote.discount)}</strong></div>
                <div className="line"><span>Taxa de rede</span><strong>{eth(quote.networkFee)}</strong></div>
                <div className="line total"><strong>Total</strong><strong className="price">{eth(quote.total)}</strong></div>
                {quote.items.some(item=>item.quantity>item.nft.available)&&<p className="notice" role="alert">A disponibilidade mudou. Ajuste os itens no carrinho antes de continuar.</p>}
                <h2>Carteira e rede</h2>
                <div className="checkout-wallet-choice">{wallets?.items.map(w=><label key={w.id}><input type="radio" name="checkout-wallet" value={w.id} checked={walletId===w.id} onChange={()=>{setWalletId(w.id);setReviewed(false);}}/><span><strong>{w.name}</strong><small>{w.provider??'MetaMask'} · {w.network}</small></span></label>)}</div>
                <label className="review"><input type="checkbox" checked={reviewed} onChange={event=>setReviewed(event.target.checked)}/> Revisei o total, as quantidades e a carteira selecionada.</label>
                {mutation.isError&&<div role="alert" className="notice">{message(mutation.error)} <button className="text-button" type="button" onClick={()=>{mutation.reset();void refetch();setReviewed(false);}}>Atualizar cotação</button></div>}
                <Button type="submit" form="checkout-collector-form" className="full" disabled={!selectedWallet?.connected||!collectorValid||!reviewed||mutation.isPending||quote.items.some(item=>item.quantity>item.nft.available)}>{mutation.isPending?'Processando...':'Confirmar compra'}</Button>
            </aside>
        </div>
    </main>;
}
function ReceiptEnvelopeIcon() {
    return <svg className="receipt-envelope" width="78" height="94" viewBox="0 0 78 94" fill="none" role="img" aria-label="Obrigado pela compra">
        <path d="M15 23V10H63V23M13 31L39 52L65 31V77H13V31Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"/>
        <path d="M13 76L35 55M65 76L43 55M13 31L39 49L65 31" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"/>
        <path d="M25 10V4H53V10" stroke="currentColor" strokeWidth="2.2"/>
        <text x="39" y="23" fill="currentColor" fontSize="11" fontWeight="bold" textAnchor="middle">THANK</text>
        <text x="39" y="35" fill="currentColor" fontSize="11" fontWeight="bold" textAnchor="middle">YOU</text>
    </svg>;
}
function tokenReference(nft: Nft) {
    const suffix = nft.name.match(/#(\d+)$/)?.[1] ?? nft.id;
    return `#${suffix.padStart(4, '0')}`;
}
export function Confirmation() {
    const {id} = useParams({from:'/order/$id'});
    const [explorerOpen, setExplorerOpen] = useState(false);
    const {data,isPending,isError,error} = useQuery({queryKey:['order',id],queryFn:({signal})=>get<Order>(`/orders/${id}`,signal),refetchInterval:query=>query.state.data?.status==='pending'?1200:false});
    useEffect(()=>{
        if(data&&data.status!=='pending'){
            const stored=localStorage.getItem('kurio:checkout-attempt');
            if(stored){try{const attempt=JSON.parse(stored) as {orderId?:string};if(attempt.orderId===data.id)localStorage.removeItem('kurio:checkout-attempt');}catch{localStorage.removeItem('kurio:checkout-attempt');}}
        }
    },[data?.id,data?.status]);
    const transactionRef = data ? data.id.startsWith('0x') ? data.id : `0x${Array.from(data.id).map(char=>char.charCodeAt(0).toString(16)).join('').padEnd(40,'0').slice(0,40)}` : '';
    return <main className="container page confirmation-page">
        {isPending?<div className="panel">Carregando recibo...</div>:isError?<ErrorNote error={error}/>:data?<article className="receipt">
            <header className="receipt-header">
                {data.status==='confirmed'?<ReceiptEnvelopeIcon/>:<CheckCircle2 className="receipt-status-icon" size={58}/>}
                <h1>{data.status==='pending'?'Processando pedido':data.status==='confirmed'?'Seus NFTs agora estão na sua carteira':'Pagamento recusado'}</h1>
                <span className="receipt-status" role="status">{data.status==='confirmed'?'Pedido confirmado':data.status==='pending'?'Pedido pendente':'Pedido recusado'}</span>
                <button type="button" className="receipt-close" aria-label="Fechar comprovante" onClick={()=>window.location.assign('/account#activity')}><X size={19}/></button>
            </header>
            <div className="receipt-meta">
                <span><small>ID da transação</small><strong title={transactionRef}>{transactionRef.slice(0,6)}...{transactionRef.slice(-4)}</strong></span>
                <span><small>Data</small><strong>{new Date(data.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}).replace(/(\d{2} \w{3}) (\d{4})/, '$1, $2')}</strong></span>
                <span><small>Total</small><strong>{eth(data.quote.total)}</strong></span>
                <span><small>Carteira</small><strong>{data.collector?.walletProvider || 'MetaMask'}</strong></span>
            </div>
            <div className="receipt-content">
                <h2>Detalhes da transação</h2>
                <div className="receipt-table-head"><span>NFTs</span><span>Edições</span><span>Subtotal</span></div>
                {data.quote.items.map(line=><div className="receipt-item" key={line.nft.id}>
                    <img src={line.nft.image} alt={line.nft.name}/>
                    <div><Link to="/nft/$id" params={{id:line.nft.id}}><strong>{line.nft.name}</strong></Link><small>ID do token: {tokenReference(line.nft)}</small></div>
                    <span>(× {line.quantity})</span><strong>{eth(line.lineTotal)}</strong>
                </div>)}
                <div className="receipt-total">
                    <span>Taxa de rede</span><span>{eth(data.quote.networkFee)}</span>
                    <strong>Total</strong><strong className="price">{eth(data.quote.total)}</strong>
                </div>
                <p className="receipt-description">{data.status==='confirmed'?'Transação confirmada na Ethereum. A propriedade foi transferida para sua carteira conectada e registrada na rede.':data.status==='pending'?'Seu pedido está sendo processado. Você pode acompanhar o resultado no histórico.':'O pagamento não foi concluído. Os itens continuam no seu carrinho.'}</p>
                <div className="receipt-links"><Button type="button" onClick={()=>setExplorerOpen(true)}>Ver no Etherscan</Button></div>
            </div>
            {explorerOpen&&<div className="receipt-explorer-backdrop" role="presentation" onClick={()=>setExplorerOpen(false)}><div className="receipt-explorer" role="dialog" aria-modal="true" aria-label="Dados da transação" onClick={event=>event.stopPropagation()}><button type="button" className="receipt-explorer-close" aria-label="Fechar detalhes" onClick={()=>setExplorerOpen(false)}><X/></button><h2>Dados da transação</h2><p>ID da transação</p><code>{transactionRef}</code><p>Status: {data.status==='confirmed'?'Confirmado':data.status==='pending'?'Pendente':'Recusado'}</p><Button type="button" onClick={()=>void navigator.clipboard?.writeText(transactionRef)}>Copiar ID</Button></div></div>}
        </article>:null}
    </main>;
}

export function Help() {
    const topics=[
        {id:'comprar',title:'Como comprar NFTs?',text:'Entre na sua conta, selecione um NFT, escolha a quantidade e adicione-o ao carrinho. Na etapa de pagamento, escolha uma carteira cadastrada, revise os valores e confirme o pedido. O histórico fica salvo no perfil.'},
        {id:'carteiras',title:'Como funcionam as carteiras?',text:'Na área Minhas carteiras você pode cadastrar, renomear, definir como principal, conectar e desconectar uma carteira de teste. Não é necessário fornecer chave privada nem frase de recuperação.'},
        {id:'politica',title:'Política e limites do marketplace',text:'Consulte dados de coleções, rede, edição e disponibilidade antes de confirmar uma compra. Proteja suas credenciais e revise os valores apresentados no checkout.'},
        {id:'criadores',title:'Estúdio do criador',text:'Conheça coleções e as obras publicadas no catálogo. As ferramentas de publicação não fazem parte deste marketplace.'},
        {id:'denunciar',title:'Denunciar item',text:'Caso encontre um item suspeito, não conclua a compra e registre os dados do NFT para encaminhar ao suporte da plataforma.'},
        {id:'ajuda',title:'O que fazer se uma ação falhar?',text:'O sistema apresenta mensagens de erro quando a rede ou o pagamento falha. Você pode tentar novamente, atualizar o catálogo ou voltar ao carrinho sem perder seus itens.'},
    ];
    return <main className="container page help-page"><nav className="detail-breadcrumb"><Link to="/">Início</Link> / Ajuda</nav><h1>Central de ajuda</h1><p className="muted">Encontre respostas sobre a coleção, a compra de NFTs e a segurança da sua carteira.</p><div className="help-grid">{topics.map(topic=><section key={topic.id} id={topic.id} className="help-topic"><h2>{topic.title}</h2><p>{topic.text}</p></section>)}</div><div className="help-links"><Button asChild><Link to="/" hash="marketplace">Explorar coleções</Link></Button><Button asChild variant="outline"><Link to="/wallets">Minhas carteiras</Link></Button></div></main>;
}
