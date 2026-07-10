import type { DashboardAdminRole } from './adminAuth';

/** Canonical page keys used by routes, sidebar, and permission checks. */
export const PAGE_KEYS = [
  'overview',
  'stores',
  'customers',
  'blockedAccounts',
  'orders',
  'products',
  'rechargeCodes',
  'loyaltyWallet',
  'promoCodes',
  'subscriptions',
  'payouts',
  'accounts',
  'flashSales',
  'reviews',
  'broadcast',
  'whatsapp',
  'heatmap',
  'database',
  'ads',
  'activityLogs',
  'adminManagement',
  'settings',
] as const;

export type PageKey = (typeof PAGE_KEYS)[number];

/** @deprecated Use PageKey — kept for Firestore / legacy callers. */
export type DashboardPermission = PageKey;
export type PermissionKey = PageKey;

export const DASHBOARD_PERMISSIONS = PAGE_KEYS;
export const ALL_DASHBOARD_PERMISSIONS: PageKey[] = [...PAGE_KEYS];

export type DashboardRole = DashboardAdminRole;

/** Core matrix rows from the RBAC specification (images). */
const MATRIX_CORE: Record<
  'owner' | 'admin' | 'supervisor' | 'accountant' | 'support',
  PageKey[]
> = {
  owner: [
    'stores',
    'customers',
    'blockedAccounts',
    'orders',
    'products',
    'rechargeCodes',
    'promoCodes',
    'subscriptions',
    'payouts',
    'accounts',
    'flashSales',
  ],
  admin: [
    'stores',
    'customers',
    'blockedAccounts',
    'orders',
    'products',
    'rechargeCodes',
    'promoCodes',
    'subscriptions',
    'payouts',
    'accounts',
    'flashSales',
  ],
  supervisor: ['stores', 'orders'],
  support: ['customers', 'blockedAccounts', 'orders'],
  accountant: ['subscriptions', 'payouts', 'accounts'],
};

/** Supervisor-only pages beyond the core matrix. */
const SUPERVISOR_EXTRA: PageKey[] = ['activityLogs'];

/** Owner/Admin-only pages beyond the 9-row matrix. */
const OWNER_ADMIN_EXTRA: PageKey[] = [
  'overview',
  'reviews',
  'broadcast',
  'whatsapp',
  'heatmap',
  'database',
  'ads',
  'loyaltyWallet',
  'adminManagement',
  'settings',
];

/** Owner-only pages (activity log read is owner + supervisor via SUPERVISOR_EXTRA). */
const OWNER_EXTRA: PageKey[] = ['activityLogs', ...OWNER_ADMIN_EXTRA];

/**
 * Role → allowed pageKeys.
 * UI access is driven strictly by role (not Firestore permissions[]).
 */
export const ROLE_PERMISSION_MATRIX: Record<DashboardRole, PageKey[]> = {
  owner: [...MATRIX_CORE.owner, ...OWNER_EXTRA],
  admin: [...MATRIX_CORE.admin, ...OWNER_ADMIN_EXTRA],
  supervisor: [...MATRIX_CORE.supervisor, ...SUPERVISOR_EXTRA],
  accountant: [...MATRIX_CORE.accountant],
  support: [...MATRIX_CORE.support],
};

export type AdminPanelTab =
  | 'overview'
  | 'stores'
  | 'customers'
  | 'orders'
  | 'products'
  | 'recharge'
  | 'loyaltyWallet'
  | 'promos'
  | 'subscriptions'
  | 'broadcast'
  | 'heatmap'
  | 'settings'
  | 'flashsales'
  | 'whatsapp'
  | 'database'
  | 'reviews'
  | 'payouts'
  | 'accounts'
  | 'ads'
  | 'activityLogs'
  | 'adminManagement'
  | 'blocked';

/** Maps internal tab ids to route pageKeys. */
export const TAB_TO_PAGE_KEY: Record<AdminPanelTab, PageKey> = {
  overview: 'overview',
  stores: 'stores',
  customers: 'customers',
  orders: 'orders',
  products: 'products',
  recharge: 'rechargeCodes',
  loyaltyWallet: 'loyaltyWallet',
  promos: 'promoCodes',
  subscriptions: 'subscriptions',
  broadcast: 'broadcast',
  heatmap: 'heatmap',
  settings: 'settings',
  flashsales: 'flashSales',
  whatsapp: 'whatsapp',
  database: 'database',
  reviews: 'reviews',
  payouts: 'payouts',
  accounts: 'accounts',
  ads: 'ads',
  activityLogs: 'activityLogs',
  adminManagement: 'adminManagement',
  blocked: 'blockedAccounts',
};

export const PAGE_KEY_TO_TAB: Partial<Record<PageKey, AdminPanelTab>> = Object.fromEntries(
  Object.entries(TAB_TO_PAGE_KEY).map(([tab, key]) => [key, tab as AdminPanelTab]),
) as Partial<Record<PageKey, AdminPanelTab>>;

/** @deprecated Use TAB_TO_PAGE_KEY */
export const TAB_PERMISSION_MAP = TAB_TO_PAGE_KEY;

export interface AdminDocLike {
  role?: string;
  permissions?: unknown;
  status?: string;
  isSuspended?: boolean;
  email?: string;
  name?: string;
}

export function isValidPageKey(key: string): key is PageKey {
  return (PAGE_KEYS as readonly string[]).includes(key);
}

export function isValidPermissionKey(key: string): key is PageKey {
  return isValidPageKey(key);
}

export function isOwnerRole(adminDoc: AdminDocLike | null | undefined): boolean {
  return adminDoc?.role === 'owner';
}

function isActiveAdmin(adminDoc: AdminDocLike | null | undefined): boolean {
  if (!adminDoc?.role) return false;
  if (adminDoc.role === 'owner') return true;
  return !(adminDoc.status === 'suspended' || adminDoc.isSuspended === true);
}

function normalizeRole(role: unknown): DashboardRole | null {
  if (typeof role !== 'string') return null;
  return role in ROLE_PERMISSION_MATRIX ? (role as DashboardRole) : null;
}

/** Effective pageKeys for a role (ignores Firestore permissions[] overrides). */
export function resolvePermissions(adminDoc: AdminDocLike | null | undefined): PageKey[] {
  if (!isActiveAdmin(adminDoc)) return [];
  const role = normalizeRole(adminDoc?.role);
  if (!role) return [];
  return [...ROLE_PERMISSION_MATRIX[role]];
}

/** @deprecated Use resolvePermissions */
export const resolveEffectivePermissions = resolvePermissions;

export function hasPageAccess(role: DashboardRole | string | null | undefined, pageKey: PageKey): boolean {
  if (!role || !(role in ROLE_PERMISSION_MATRIX)) return false;
  return ROLE_PERMISSION_MATRIX[role as DashboardRole].includes(pageKey);
}

export function hasPermission(adminDoc: AdminDocLike | null | undefined, pageKey: string): boolean {
  if (!isActiveAdmin(adminDoc)) return false;
  if (!isValidPageKey(pageKey)) return false;
  return hasPageAccess(adminDoc?.role, pageKey);
}

/** Full CRUD write access for a page the role can view. */
export function canWritePage(adminDoc: AdminDocLike | null | undefined, pageKey: PageKey): boolean {
  return hasPermission(adminDoc, pageKey);
}

export function assertWritePage(adminDoc: AdminDocLike | null | undefined, pageKey: PageKey): void {
  if (!canWritePage(adminDoc, pageKey)) {
    throw new Error(`Permission denied for page: ${pageKey}`);
  }
}

/** @alias hasPermission */
export function checkPermission(adminDoc: AdminDocLike | null | undefined, pageKey: string): boolean {
  return hasPermission(adminDoc, pageKey);
}

export function canAccessOverview(adminDoc: AdminDocLike | null | undefined): boolean {
  return hasPermission(adminDoc, 'overview');
}

export function canAccessTab(adminDoc: AdminDocLike | null | undefined, tab: AdminPanelTab): boolean {
  const pageKey = TAB_TO_PAGE_KEY[tab];
  return hasPermission(adminDoc, pageKey);
}

export const DEFAULT_FALLBACK_TAB: AdminPanelTab = 'stores';

const TAB_PRIORITY: AdminPanelTab[] = [
  'stores',
  'overview',
  'orders',
  'customers',
  'products',
  'recharge',
  'loyaltyWallet',
  'promos',
  'subscriptions',
  'payouts',
  'accounts',
  'flashsales',
  'reviews',
  'broadcast',
  'whatsapp',
  'heatmap',
  'database',
  'ads',
  'activityLogs',
  'adminManagement',
  'settings',
];

export function getFirstAllowedTab(adminDoc: AdminDocLike | null | undefined): AdminPanelTab | null {
  for (const tab of TAB_PRIORITY) {
    if (canAccessTab(adminDoc, tab)) return tab;
  }
  return null;
}

export function getFirstAllowedPageKey(adminDoc: AdminDocLike | null | undefined): PageKey | null {
  const tab = getFirstAllowedTab(adminDoc);
  return tab ? TAB_TO_PAGE_KEY[tab] : null;
}

export function canAccessAdminManagement(adminDoc: AdminDocLike | null | undefined): boolean {
  return hasPermission(adminDoc, 'adminManagement');
}

/** @alias canAccessAdminManagement */
export function canManageStaff(adminDoc: AdminDocLike | null | undefined): boolean {
  return canAccessAdminManagement(adminDoc);
}

export function canAssignOwnerRole(adminDoc: AdminDocLike | null | undefined): boolean {
  return adminDoc?.role === 'owner';
}

export function canModifyAdminRecord(
  actor: AdminDocLike | null | undefined,
  target: AdminDocLike & { id?: string },
  actorUid?: string | null,
): boolean {
  if (!canAccessAdminManagement(actor)) return false;
  if (actor?.role === 'owner') return true;
  if (target.role === 'owner') return false;
  if (actorUid && target.id === actorUid) return false;
  return false;
}

export function canDeleteAdminRecord(
  actor: AdminDocLike | null | undefined,
  target: AdminDocLike & { id?: string },
): boolean {
  if (actor?.role !== 'owner') return false;
  return target.role !== 'owner';
}

/** Activity log read — owner and supervisor only (matches Firestore isSuperAdmin). */
export function canReadActivityLogs(adminDoc: AdminDocLike | null | undefined): boolean {
  if (!isActiveAdmin(adminDoc)) return false;
  return adminDoc?.role === 'owner' || adminDoc?.role === 'supervisor';
}

/** @deprecated Use resolvePermissions */
export function resolveAdminPermissions(
  role: DashboardAdminRole | null | undefined,
): PageKey[] {
  if (!role) return [];
  return [...(ROLE_PERMISSION_MATRIX[role] ?? [])];
}

/** Labels for staff UI (Arabic). */
export const PAGE_KEY_LABELS_AR: Record<PageKey, string> = {
  overview: 'نظرة عامة',
  stores: 'إدارة المتاجر',
  customers: 'إدارة الزبائن',
  blockedAccounts: 'الحسابات المحظورة',
  orders: 'إدارة الطلبات',
  products: 'إدارة المنتجات',
  rechargeCodes: 'شحن الكودات (توليد)',
  loyaltyWallet: 'محفظة النقاط والولاء',
  promoCodes: 'أكواد الخصم',
  subscriptions: 'الاشتراكات والتفعيل التلقائي',
  payouts: 'أرباح المتاجر (مستحقات)',
  accounts: 'الحسابات — أرباح الاشتراكات',
  flashSales: 'الفعاليات المركزية',
  reviews: 'تقييمات المتاجر',
  broadcast: 'إرسال إشعارات',
  whatsapp: 'حملات الواتساب',
  heatmap: 'الخريطة الحرارية',
  database: 'قاعدة البيانات',
  ads: 'الإعلانات الممولة',
  activityLogs: 'سجل النشاط',
  adminManagement: 'إدارة المدراء',
  settings: 'إعدادات النظام',
};
