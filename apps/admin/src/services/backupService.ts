/**
 * Backup Service - Mahalak Platform
 * Handles exporting and importing user data as JSON files.
 */

import {
  collection,
  doc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';

const BATCH_LIMIT = 450;

export interface SystemBackupPayload {
  backupType: 'Full_System_Backup';
  timestamp?: string;
  stores?: Array<Record<string, unknown> & { id: string }>;
  products?: Array<Record<string, unknown> & { id: string }>;
  customers?: Array<Record<string, unknown> & { id: string }>;
  orders?: Array<Record<string, unknown> & { id: string }>;
  promoCodes?: Array<Record<string, unknown> & { id: string }>;
  adminSettings?: Record<string, unknown>;
}

export interface RestoreProgress {
  collection: string;
  written: number;
  total: number;
}

function stripUndefined<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as T;
}

async function writeCollectionBatch(
  db: Firestore,
  collectionName: string,
  items: Array<Record<string, unknown> & { id: string }> | undefined,
  onProgress?: (progress: RestoreProgress) => void,
): Promise<number> {
  if (!items?.length) return 0;

  let written = 0;
  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = items.slice(i, i + BATCH_LIMIT);
    for (const item of chunk) {
      const { id, ...rest } = item;
      if (!id) continue;
      const payload = stripUndefined({ ...rest, id });
      if (collectionName === 'customers') {
        delete payload.password;
      }
      batch.set(doc(db, collectionName, id), payload, { merge: true });
    }
    await batch.commit();
    written += chunk.length;
    onProgress?.({ collection: collectionName, written, total: items.length });
  }
  return written;
}

export const BackupService = {
  exportToJson: (data: unknown, fileName: string) => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
  },

  importFromJson: (file: File): Promise<SystemBackupPayload> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string) as SystemBackupPayload;
          resolve(json);
        } catch {
          reject(new Error('Invalid JSON file format'));
        }
      };
      reader.onerror = () => reject(new Error('File reading error'));
      reader.readAsText(file);
    });
  },

  /** Restore a full system backup into Firestore (owner-only — gate in UI). */
  restoreSystemBackup: async (
    db: Firestore,
    data: SystemBackupPayload,
    onProgress?: (progress: RestoreProgress) => void,
  ): Promise<{ written: Record<string, number> }> => {
    if (data.backupType !== 'Full_System_Backup') {
      throw new Error('Invalid backup file type');
    }

    const written: Record<string, number> = {};

    written.stores = await writeCollectionBatch(db, 'stores', data.stores, onProgress);
    written.products = await writeCollectionBatch(db, 'products', data.products, onProgress);
    written.customers = await writeCollectionBatch(db, 'customers', data.customers, onProgress);
    written.orders = await writeCollectionBatch(db, 'orders', data.orders, onProgress);
    written.promo_codes = await writeCollectionBatch(db, 'promo_codes', data.promoCodes, onProgress);

    if (data.adminSettings && typeof data.adminSettings === 'object') {
      const settingsPayload = stripUndefined({ ...data.adminSettings });
      const batch = writeBatch(db);
      batch.set(doc(db, 'settings', 'global'), settingsPayload, { merge: true });
      await batch.commit();
      written.settings = 1;
      onProgress?.({ collection: 'settings', written: 1, total: 1 });
    }

    return { written };
  },
};
