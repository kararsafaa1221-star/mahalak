import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
  hasPermission,
  canAccessOverview,
  resolvePermissions,
  type PageKey,
  type DashboardPermission,
} from './permissions';
import type { Admin } from '@shared/types';

export const DASHBOARD_ADMIN_ROLES = [
  'owner',
  'admin',
  'supervisor',
  'accountant',
  'support',
] as const;

export type DashboardAdminRole = (typeof DASHBOARD_ADMIN_ROLES)[number];

export type AdminVerifyReason = 'missing_doc' | 'suspended' | 'invalid_role' | 'time_restricted';

export interface AdminVerifyResult {
  authorized: boolean;
  admin?: Admin;
  reason?: AdminVerifyReason;
}

export function isDashboardAdminRole(role: unknown): role is DashboardAdminRole {
  return typeof role === 'string' && (DASHBOARD_ADMIN_ROLES as readonly string[]).includes(role);
}

export function isOwnerRole(role: string | null | undefined): boolean {
  return role === 'owner';
}

export function mapAdminDoc(uid: string, data: Record<string, unknown>): Admin | null {
  const role = data.role;
  // Accepts the 5 built-in roles as well as any custom role id defined in
  // settings/global.customRoles — actual page-access validity for those is
  // checked afterwards in verifyDashboardAdmin via resolvePermissions().
  if (typeof role !== 'string' || !role.trim()) return null;

  const isSuspended = data.status === 'suspended' || data.isSuspended === true;

  const adminDoc = {
    role,
    permissions: data.permissions,
    status: typeof data.status === 'string' ? data.status : isSuspended ? 'suspended' : 'active',
    isSuspended,
    email: typeof data.email === 'string' ? data.email : undefined,
    name: typeof data.name === 'string' ? data.name : undefined,
  };

  return {
    id: uid,
    email: adminDoc.email,
    name: adminDoc.name,
    phone: typeof data.phone === 'string' ? data.phone : undefined,
    province: typeof data.province === 'string' ? data.province : undefined,
    area: typeof data.area === 'string' ? data.area : undefined,
    role,
    permissions: resolvePermissions(adminDoc),
    rawPermissions: normalizeRawPermissions(data.permissions),
    status: adminDoc.status,
    isSuspended: adminDoc.isSuspended,
    lastLogin: typeof data.lastLogin === 'string' ? data.lastLogin : undefined,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined,
    photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : undefined,
    isOnline: data.isOnline === true,
    lastActiveAt:
      typeof data.lastActiveAt === 'string'
        ? data.lastActiveAt
        : (data.lastActiveAt as { toDate?: () => Date })?.toDate?.()?.toISOString?.(),
    workStartTime: typeof data.workStartTime === 'string' ? data.workStartTime : undefined,
    workEndTime: typeof data.workEndTime === 'string' ? data.workEndTime : undefined,
    isTimeRestricted: data.isTimeRestricted === true,
  };
}

/**
 * Minutes-since-midnight comparison of "HH:mm" strings against the current
 * clock, supporting overnight windows (e.g. 22:00 → 06:00). Never applies to
 * the owner — this must be checked by the caller as well, but is repeated
 * here so this helper is safe to call standalone.
 */
export function isOutsideWorkHours(admin: Pick<Admin, 'role' | 'isTimeRestricted' | 'workStartTime' | 'workEndTime'>, now: Date = new Date()): boolean {
  if (admin.role === 'owner') return false;
  if (!admin.isTimeRestricted) return false;
  if (!admin.workStartTime || !admin.workEndTime) return false;

  const toMinutes = (value: string) => {
    const [h, m] = value.split(':').map((n) => parseInt(n, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };
  const start = toMinutes(admin.workStartTime);
  const end = toMinutes(admin.workEndTime);
  if (start === null || end === null || start === end) return false;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (start < end) {
    return !(nowMinutes >= start && nowMinutes < end);
  }
  // Overnight window wrapping midnight.
  return !(nowMinutes >= start || nowMinutes < end);
}

function normalizeRawPermissions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((p): p is string => typeof p === 'string');
}

/** Delegates to hasPermission — owner override inherited automatically. */
export function adminHasPermission(admin: Admin | null | undefined, permissionKey: string): boolean {
  return hasPermission(admin ?? undefined, permissionKey);
}

export { hasPermission, canAccessOverview };

/** Authorizes dashboard access from admins/{uid} using granular permissions. */
export async function verifyDashboardAdmin(uid: string): Promise<AdminVerifyResult> {
  const snap = await getDoc(doc(db, 'admins', uid));
  if (!snap.exists()) {
    return { authorized: false, reason: 'missing_doc' };
  }

  const data = snap.data() as Record<string, unknown>;
  const admin = mapAdminDoc(uid, data);
  if (!admin) {
    return { authorized: false, reason: 'invalid_role' };
  }

  if (admin.status === 'suspended' || admin.isSuspended === true) {
    if (admin.role !== 'owner') {
      return { authorized: false, reason: 'suspended' };
    }
  } else if (isOutsideWorkHours(admin)) {
    return { authorized: false, reason: 'time_restricted' };
  }

  // Owner always authorized regardless of permissions[] content
  if (admin.role === 'owner') {
    return { authorized: true, admin };
  }

  const rolePages = resolvePermissions({ role: admin.role });
  if (rolePages.length === 0) {
    return { authorized: false, reason: 'invalid_role' };
  }

  return { authorized: true, admin };
}

export function getAdminAuthErrorMessage(reason?: AdminVerifyReason): string {
  if (reason === 'suspended') {
    return 'تم إيقاف حسابك. تواصل مع المالك لإعادة التفعيل.';
  }
  if (reason === 'time_restricted') {
    return 'الدخول مسموح فقط خلال ساعات العمل المحددة لحسابك. حاول مرة أخرى ضمن هذا النطاق الزمني.';
  }
  return 'ليس لديك صلاحيات للوصول إلى لوحة الإدارة. تواصل مع الدعم الفني إذا كنت مسؤولاً معتمداً.';
}

export type { DashboardPermission };
