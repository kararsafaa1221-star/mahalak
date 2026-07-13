import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  increment,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

export const MARKETING_SHARE_STATS_COLLECTION = 'marketing_share_stats';

export type MarketingShareProductStat = {
  visits: number;
  name?: string;
  lastVisitAt?: unknown;
};

export type MarketingShareStats = {
  storeId: string;
  totalVisits: number;
  storeLinkVisits: number;
  productLinkVisits: number;
  lastVisitAt?: unknown;
  updatedAt?: unknown;
  products?: Record<string, MarketingShareProductStat>;
};

export const EMPTY_MARKETING_SHARE_STATS = (storeId: string): MarketingShareStats => ({
  storeId,
  totalVisits: 0,
  storeLinkVisits: 0,
  productLinkVisits: 0,
  products: {},
});

const SHARE_TRACKING_PARAM = 'src';
const SHARE_TRACKING_VALUE = 'share';

export function appendShareTrackingQuery(url: string): string {
  if (!url) return url;
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}${SHARE_TRACKING_PARAM}=${SHARE_TRACKING_VALUE}`;
}

export function isShareTrackedUrl(urlOrHash: string): boolean {
  const queryStart = urlOrHash.indexOf('?');
  if (queryStart === -1) return false;
  const params = new URLSearchParams(urlOrHash.slice(queryStart + 1));
  return params.get(SHARE_TRACKING_PARAM) === SHARE_TRACKING_VALUE;
}

export function splitHashPathAndQuery(hash: string): { path: string; query: string } {
  const withoutHash = hash.startsWith('#') ? hash.slice(1) : hash;
  const queryIndex = withoutHash.indexOf('?');
  if (queryIndex === -1) {
    return { path: withoutHash, query: '' };
  }
  return {
    path: withoutHash.slice(0, queryIndex),
    query: withoutHash.slice(queryIndex + 1),
  };
}

function buildDedupeKey(storeId: string, kind: 'store' | 'product', productId?: string): string {
  return `mahalak_share_visit_${storeId}_${kind}_${productId || 'store'}`;
}

function markVisitRecorded(storeId: string, kind: 'store' | 'product', productId?: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(buildDedupeKey(storeId, kind, productId), String(Date.now()));
}

function wasVisitRecorded(storeId: string, kind: 'store' | 'product', productId?: string): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(buildDedupeKey(storeId, kind, productId)) != null;
}

export async function recordShareVisit(params: {
  storeId: string;
  kind: 'store' | 'product';
  productId?: string;
  productName?: string;
}): Promise<void> {
  const { storeId, kind, productId, productName } = params;
  if (!storeId) return;
  if (kind === 'product' && !productId) return;
  if (wasVisitRecorded(storeId, kind, productId)) return;

  const statsRef = doc(db, MARKETING_SHARE_STATS_COLLECTION, storeId);

  try {
    if (kind === 'store') {
      await setDoc(
        statsRef,
        {
          storeId,
          totalVisits: increment(1),
          storeLinkVisits: increment(1),
          lastVisitAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } else {
      const productRef = doc(collection(statsRef, 'product_stats'), productId!);
      await setDoc(
        statsRef,
        {
          storeId,
          totalVisits: increment(1),
          productLinkVisits: increment(1),
          lastVisitAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      await setDoc(
        productRef,
        {
          productId,
          name: productName || '',
          visits: increment(1),
          lastVisitAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
    markVisitRecorded(storeId, kind, productId);
  } catch (err) {
    console.warn('[shareVisitTracking] failed to record visit', err);
  }
}

export function subscribeMarketingShareStats(
  storeId: string,
  onChange: (stats: MarketingShareStats) => void,
): Unsubscribe {
  if (!storeId) {
    onChange(EMPTY_MARKETING_SHARE_STATS(''));
    return () => undefined;
  }

  const statsRef = doc(db, MARKETING_SHARE_STATS_COLLECTION, storeId);
  const productsRef = collection(statsRef, 'product_stats');

  let latestMain: MarketingShareStats = EMPTY_MARKETING_SHARE_STATS(storeId);
  let latestProducts: Record<string, MarketingShareProductStat> = {};

  const emit = () => {
    onChange({
      ...latestMain,
      storeId,
      products: latestProducts,
    });
  };

  const unsubMain = onSnapshot(
    statsRef,
    (snap) => {
      if (!snap.exists()) {
        latestMain = EMPTY_MARKETING_SHARE_STATS(storeId);
      } else {
        const data = snap.data() as Partial<MarketingShareStats>;
        latestMain = {
          ...EMPTY_MARKETING_SHARE_STATS(storeId),
          ...data,
          storeId,
          totalVisits: Number(data.totalVisits || 0),
          storeLinkVisits: Number(data.storeLinkVisits || 0),
          productLinkVisits: Number(data.productLinkVisits || 0),
        };
      }
      emit();
    },
    () => {
      latestMain = EMPTY_MARKETING_SHARE_STATS(storeId);
      emit();
    },
  );

  const unsubProducts = onSnapshot(
    productsRef,
    (snap) => {
      const next: Record<string, MarketingShareProductStat> = {};
      snap.docs.forEach((d) => {
        const data = d.data() as MarketingShareProductStat;
        next[d.id] = {
          visits: Number(data.visits || 0),
          name: data.name,
          lastVisitAt: data.lastVisitAt,
        };
      });
      latestProducts = next;
      emit();
    },
    () => {
      latestProducts = {};
      emit();
    },
  );

  return () => {
    unsubMain();
    unsubProducts();
  };
}

export function getTopSharedProducts(
  stats: MarketingShareStats,
  products: Array<{ id: string; name: string }>,
  limit = 5,
): Array<{ id: string; name: string; visits: number }> {
  const fromStats = Object.entries(stats.products || {})
    .map(([id, row]) => ({
      id,
      name: row.name || products.find((p) => p.id === id)?.name || 'منتج',
      visits: row.visits || 0,
    }))
    .filter((row) => row.visits > 0);

  return fromStats.sort((a, b) => b.visits - a.visits).slice(0, limit);
}
