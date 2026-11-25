import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  increment,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

export const STORE_VISIT_STATS_COLLECTION = 'store_visit_stats';

export type StoreVisitStats = {
  storeId: string;
  visitCount: number;
  lastVisitAt?: unknown;
  updatedAt?: unknown;
};

export const EMPTY_STORE_VISIT_STATS = (storeId: string): StoreVisitStats => ({
  storeId,
  visitCount: 0,
});

function buildDedupeKey(storeId: string): string {
  return `mahalak_store_visit_${storeId}`;
}

function wasVisitRecorded(storeId: string): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(buildDedupeKey(storeId)) != null;
}

function markVisitRecorded(storeId: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(buildDedupeKey(storeId), String(Date.now()));
}

/**
 * Record a store page visit (once per browser session per store).
 * Called whenever the customer opens a store from map, stores list, products, etc.
 */
export async function recordStoreVisit(storeId: string): Promise<void> {
  if (!storeId) return;
  if (wasVisitRecorded(storeId)) return;

  // Mark early to avoid duplicate parallel writes from React Strict Mode / remounts.
  markVisitRecorded(storeId);

  const statsRef = doc(db, STORE_VISIT_STATS_COLLECTION, storeId);
  try {
    const existing = await getDoc(statsRef);
    if (!existing.exists()) {
      // Literal 1 on create — more reliable with security rules than increment-on-create.
      await setDoc(statsRef, {
        storeId,
        visitCount: 1,
        lastVisitAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(statsRef, {
        visitCount: increment(1),
        lastVisitAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    // Allow retry on next open if the write was rejected (e.g. rules not deployed yet).
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(buildDedupeKey(storeId));
    }
    console.warn('[storeVisitTracking] failed to record visit', err);
  }
}

/** @deprecated Use recordStoreVisit — kept for older call sites. */
export const recordStoreMapVisit = recordStoreVisit;

export function subscribeStoreVisitStats(
  storeId: string,
  onChange: (stats: StoreVisitStats) => void,
): Unsubscribe {
  if (!storeId) {
    onChange(EMPTY_STORE_VISIT_STATS(''));
    return () => undefined;
  }

  const statsRef = doc(db, STORE_VISIT_STATS_COLLECTION, storeId);
  return onSnapshot(
    statsRef,
    (snap) => {
      if (!snap.exists()) {
        onChange(EMPTY_STORE_VISIT_STATS(storeId));
        return;
      }
      const data = snap.data() as Partial<StoreVisitStats>;
      onChange({
        storeId,
        visitCount: Number(data.visitCount || 0),
        lastVisitAt: data.lastVisitAt,
        updatedAt: data.updatedAt,
      });
    },
    (err) => {
      // Don't zero the UI on transient permission/network blips.
      console.warn('[storeVisitTracking] subscribe error', err);
    },
  );
}

/** Compact Arabic-friendly visit count (e.g. 1200 → 1.2 ألف). */
export function formatStoreVisitCount(count: number, locale: 'ar' | 'ckb' | string = 'ar'): string {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  const thousandLabel = locale === 'ckb' ? 'هەزار' : 'ألف';
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (n >= 1000) {
    const k = n / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')} ${thousandLabel}`;
  }
  return n.toLocaleString('en-US');
}
