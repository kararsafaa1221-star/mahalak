/**
 * خدمة التخزين المحلي - منصة محلك
 * يدعم JSON + تخزين بمدة صلاحية (TTL) للبيانات شبه الثابتة على شبكات ضعيفة.
 */

type CacheEnvelope<T> = {
  v: T;
  exp: number | null;
};

function prefixed(key: string) {
  return key.startsWith('mahalak_') ? key : `mahalak_${key}`;
}

export const StorageService = {
  save: (key: string, data: unknown) => {
    try {
      localStorage.setItem(prefixed(key), JSON.stringify(data));
    } catch {
      /* quota / private mode */
    }
  },

  get: <T = unknown>(key: string): T | null => {
    try {
      const data = localStorage.getItem(prefixed(key));
      return data ? (JSON.parse(data) as T) : null;
    } catch {
      return null;
    }
  },

  /** Persist with optional TTL (ms). Expired entries return null. */
  setCached: <T>(key: string, data: T, ttlMs?: number) => {
    try {
      const envelope: CacheEnvelope<T> = {
        v: data,
        exp: typeof ttlMs === 'number' && ttlMs > 0 ? Date.now() + ttlMs : null,
      };
      localStorage.setItem(prefixed(`cache_${key}`), JSON.stringify(envelope));
    } catch {
      /* ignore */
    }
  },

  getCached: <T>(key: string): T | null => {
    try {
      const raw = localStorage.getItem(prefixed(`cache_${key}`));
      if (!raw) return null;
      const envelope = JSON.parse(raw) as CacheEnvelope<T>;
      if (envelope.exp != null && Date.now() > envelope.exp) {
        localStorage.removeItem(prefixed(`cache_${key}`));
        return null;
      }
      return envelope.v ?? null;
    } catch {
      return null;
    }
  },

  removeCached: (key: string) => {
    try {
      localStorage.removeItem(prefixed(`cache_${key}`));
    } catch {
      /* ignore */
    }
  },

  remove: (key: string) => {
    try {
      localStorage.removeItem(prefixed(key));
    } catch {
      /* ignore */
    }
  },

  clearAll: () => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  },
};
