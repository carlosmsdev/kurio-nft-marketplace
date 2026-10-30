export type Nft = {
    id: string;
    name: string;
    creator: string;
    price: string;
    category: string;
    network: string;
    image: string;
    available: number;
    version: number;
    collection?: string;
    description?: string;
};
export type CartLine = {
    nftId: string;
    quantity: number;
};
export type Account = {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    username?: string;
    ens?: string;
    nickname?: string;
};
export type Session = {
    user: Account;
} | null;
export type Cart = {
    items: CartLine[];
};
export type QuoteLine = {
    nft: Nft;
    quantity: number;
    lineTotal: string;
};
export type Quote = {
    items: QuoteLine[];
    subtotal: string;
    discount: string;
    networkFee: string;
    total: string;
    couponCode: string | null;
    version: string;
};
export type Order = {
    id: string;
    ownerId: string;
    status: 'pending' | 'confirmed' | 'declined';
    outcome: 'confirmed' | 'declined';
    quote: Quote;
    createdAt: string;
    dueAt: number;
    collector?: { name: string; email: string; username?:string; profile?:string; ens?:string; note?:string; referralCode?:string; walletAlias?:string; secondaryWallet?:string; walletNetwork?:string; walletProvider?:string; walletAddress?:string };
    version: number;
};
export type Wallet = {
    id: string;
    name: string;
    address: string;
    network: string;
    primary: boolean;
    connected?: boolean;
    provider?: string;
    alias?:string;
    profileName?:string;
    email?:string;
    referral?:string;
    ens?:string;
    secondaryAddress?:string;
};
export type UpdatedNftEvent = {
    id: string;
    version: number;
    price: string;
    available: number;
};
export type UpdatedOrderEvent = {
    id: string;
    userId: string;
    version: number;
    status: Order['status'];
};

