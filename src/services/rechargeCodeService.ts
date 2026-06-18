import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { RechargeCode } from '../types';

const RECHARGE_CODE_KEY_PATTERN = /^[A-Z0-9][A-Z0-9-]*[A-Z0-9]$|^[A-Z0-9]{4,32}$/;

/** Normalized document id / codeKey on recharge_codes docs (matches firestore.rules). */
export function normalizeRechargeCodeKey(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

export function isValidRechargeCodeKey(codeKey: string): boolean {
  return RECHARGE_CODE_KEY_PATTERN.test(codeKey);
}

export function mapRechargeCodeDoc(id: string, data: Record<string, unknown>): RechargeCode {
  return { ...data, id } as RechargeCode;
}

/** Direct get by document id — no collection list/query. */
export async function getRechargeCodeById(codeId: string): Promise<RechargeCode | null> {
  const trimmed = codeId.trim();
  if (!trimmed) return null;
  const snap = await getDoc(doc(db, 'recharge_codes', trimmed));
  if (!snap.exists()) return null;
  return mapRechargeCodeDoc(snap.id, snap.data() as Record<string, unknown>);
}

/** Point lookup by user-entered code (doc id == normalized codeKey). */
export async function getRechargeCodeByCode(code: string): Promise<RechargeCode | null> {
  const codeKey = normalizeRechargeCodeKey(code);
  if (!isValidRechargeCodeKey(codeKey)) return null;
  return getRechargeCodeById(codeKey);
}
