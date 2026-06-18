import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase';
import type { DashboardAdminRole } from '../lib/adminAuth';

export interface CreateAdminAccountPayload {
  email: string;
  password: string;
  name: string;
  phone?: string;
  province?: string;
  area?: string;
  role: DashboardAdminRole;
  permissions?: string[];
}

export interface UpdateAdminAccountPayload {
  uid: string;
  email?: string;
  password?: string;
}

function getCallable<TPayload, TResult>(name: string) {
  return httpsCallable<TPayload, TResult>(getFunctions(app), name);
}

export async function createUserAccount(payload: CreateAdminAccountPayload) {
  const fn = getCallable<CreateAdminAccountPayload, { success: boolean; uid: string }>('createUserAccount');
  const result = await fn(payload);
  return result.data;
}

export async function updateUserAccount(payload: UpdateAdminAccountPayload) {
  const fn = getCallable<UpdateAdminAccountPayload, { success: boolean }>('updateUserAccount');
  const result = await fn(payload);
  return result.data;
}

export async function deleteUserAccount(uid: string) {
  const fn = getCallable<{ uid: string }, { success: boolean }>('deleteUserAccount');
  const result = await fn({ uid });
  return result.data;
}

export function mapCallableError(error: unknown): string {
  const err = error as { code?: string; message?: string };
  const code = err?.code ?? '';
  if (code.includes('functions/not-found') || code.includes('not-found') && err?.message?.includes('internal')) {
    return 'الخدمة غير متوفرة حالياً. تواصل مع الدعم أو أعد المحاولة لاحقاً.';
  }
  if (code.includes('already-exists')) return 'البريد الإلكتروني مسجّل مسبقاً';
  if (code.includes('permission-denied')) return err.message || 'ليس لديك صلاحية لتنفيذ هذا الإجراء';
  if (code.includes('invalid-argument')) return err.message || 'بيانات غير صالحة';
  if (code.includes('unauthenticated')) return 'يجب تسجيل الدخول أولاً';
  if (code.includes('internal')) return 'فشل تنفيذ العملية على السيرفر. حاول مرة أخرى.';
  if (code.includes('unavailable') || code.includes('deadline-exceeded')) {
    return 'تعذر الاتصال بالسيرفر. تحقق من الشبكة وحاول مجدداً.';
  }
  return err?.message || 'حدث خطأ غير متوقع';
}
