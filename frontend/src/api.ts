export type User = {
  id: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'STORE_MANAGER' | 'ADMIN';
  tier: string;
  preferences?: { categories?: string[]; budget?: number; storeId?: string };
};
export type Product = {
  id: string;
  name: string;
  sku: string;
  brand: string;
  category: string;
  description: string;
  price: string;
  originalPrice: string | null;
  rating: string;
  color: string;
  availability?: number;
  specifications: { highlights?: string[]; attributes?: Record<string, string> };
  inventory?: { quantity: number; location: Store }[];
};
export type Store = { id: string; name: string; city: string; address: string };
export type Catalogue = {
  items: Product[];
  total: number;
  page: number;
  pages: number;
  limit: number;
  categories: string[];
  brands: string[];
  attributeOptions: Record<string, string[]>;
};
export type CartLine = { productId: string; product: Product; quantity: number };
export type Quote = {
  quoteHash: string;
  subtotal: string;
  deliveryCharge: string;
  total: string;
  locationName: string;
};
export type Order = {
  id: string;
  number: string;
  status: string;
  total: string;
  fulfillment: string;
  location: Store;
  createdAt: string;
  items: { name: string; quantity: number }[];
};
export type Ticket = {
  id: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
  order: { id: string; number: string; fulfillment: string } | null;
  location: { id: string; name: string; city: string } | null;
  user: { name: string };
  replies: {
    id: string;
    body: string;
    authorRole: User['role'];
    author: { name: string };
    createdAt: string;
  }[];
};
export type Inventory = {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  reorderPoint: number;
  targetStock: number;
  product: Product;
  location: Store;
};
export type Proposal = {
  id: string;
  quantity: number;
  status: string;
  reason: string;
  product: Product;
  location: Store;
};
export type Knowledge = {
  id: string;
  title: string;
  version: string;
  status: string;
  active: boolean;
  retrievalMode: string;
  error: string | null;
  _count: { chunks: number };
};
export type Answer = {
  answer: string;
  confidence: string;
  mode: string;
  sources: { chunkId: string; document: string; section: string; version: string }[];
  followUpRequired: boolean;
};
export type Recommendations = {
  interpretedRequirement: string;
  recommendations: { productId: string; reason: string; availability: string; product: Product }[];
  clarifyingQuestion: string | null;
};
let accessToken = '';
export function setToken(token: string) {
  accessToken = token;
}
let refreshPending: Promise<{ accessToken: string; user: User }> | null = null;
export async function restoreSession() {
  // Share one refresh request across concurrent API calls to avoid rotating the same cookie twice.
  if (!refreshPending)
    refreshPending = fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'x-requested-with': 'RetailPulse' },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error('Please sign in.');
        const body = (await r.json()) as { accessToken: string; user: User };
        setToken(body.accessToken);
        return body;
      })
      .finally(() => {
        refreshPending = null;
      });
  return refreshPending;
}
export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('x-requested-with', 'RetailPulse');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (options.body && !(options.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  const r = await fetch(`/api/v1${path}`, { ...options, headers, credentials: 'include' });
  if (r.status === 401 && retry && !path.startsWith('/auth/')) {
    await restoreSession();
    return api<T>(path, options, false);
  }
  if (r.status === 204) return undefined as T;
  let body;
  try {
    body = await r.json();
  } catch {
    throw new Error('The service is unavailable. Please try again in a moment.');
  }
  if (!r.ok) throw new Error(body.error?.message || 'Request failed. Please retry.');
  return body as T;
}
export const money = (value: string | number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value));
