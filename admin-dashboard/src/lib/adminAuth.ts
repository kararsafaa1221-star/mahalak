import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
  hasPermission,
  canAccessOverview,
  resolvePermissions,
  type PageKey,
  type DashboardPermission,
} from './permissions';
import type { Admin } from '../types';

export const DASHBOARD_ADMIN_ROLES = [
  'owner',
  'admin',
  'supervisor',
  'accountant',
  'support',
] as const;

export type DashboardAdminRole = (typeof DASHBOARD_ADMIN_ROLES)[number];

export type AdminVerifyReason = 'missing_doc' | 'suspended' | 'invalid_role';

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
  if (!isDashboardAdminRole(role)) return null;

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
  };
}

function isAdminLoginBlocked(admin: Admin): boolean {
  return admin.role !== 'owner' && (admin.status === 'suspended' || admin.isSuspended === true);
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

  if (isAdminLoginBlocked(admin)) {
    return { authorized: false, reason: 'suspended' };
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
  return 'ليس لديك صلاحيات للوصول إلى لوحة الإدارة. تواصل مع الدعم الفني إذا كنت مسؤولاً معتمداً.';
}

export type { DashboardPermission };
