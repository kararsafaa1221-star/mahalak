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
  'spinWheel',
  'promoCodes',
  'subscriptions',
  'payouts',
  'accounts',
  'flashSales',
  'reviews',
  'broadcast',
  'notificationTemplates',
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
  'notificationTemplates',
  'whatsapp',
  'heatmap',
  'database',
  'ads',
  'loyaltyWallet',
  'spinWheel',
  'adminManagement',
  'settings',
];

/** Owner-only pages (activity log read is owner + supervisor via SUPERVISOR_EXTRA). */
const OWNER_EXTRA: PageKey[] = ['activityLogs', ...OWNER_ADMIN_EXTRA];

/**
 * Role → default allowed pageKeys. This is only the *fallback* used when an
 * admin doc has no explicit permissions[] override (see resolvePermissions).
 * Owner is the sole exception — it always resolves to every page and can
 * never be narrowed by a custom permissions[] list.
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
  | 'spinWheel'
  | 'promos'
  | 'subscriptions'
  | 'broadcast'
  | 'notificationTemplates'
  | 'notificationCenter'
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
  spinWheel: 'spinWheel',
  promos: 'promoCodes',
  subscriptions: 'subscriptions',
  broadcast: 'broadcast',
  notificationTemplates: 'notificationTemplates',
  // مركز الإشعارات الموحّد يعرض قسمي البث والقوالب معاً — بوابة الوصول للتاب نفسه
  // مبنية على صلاحية "notificationTemplates"، وكل قسم داخل الصفحة يُخفى بشكل مستقل
  // حسب صلاحية الموظف الفعلية (broadcast / notificationTemplates).
  notificationCenter: 'notificationTemplates',
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

function normalizeExplicitPermissions(raw: unknown): PageKey[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((p): p is PageKey => typeof p === 'string' && isValidPageKey(p));
}

/**
 * Effective pageKeys for an admin doc. Owner always gets every page and can
 * never be restricted. For every other role, an explicit non-empty
 * `permissions[]` array on the Firestore doc — set per-employee from the
 * Admin Management UI — fully overrides the role's default page set, letting
 * the owner grant any employee access to all pages or just a hand-picked
 * subset. Leaving `permissions[]` empty falls back to the role's defaults —
 * but that fallback only exists for the 5 built-in roles (ROLE_PERMISSION_MATRIX).
 * Custom roles (settings/global.customRoles) have no matrix entry, so the
 * Admin Management UI always writes a non-empty explicit permissions[] for
 * them at creation/edit time; if one somehow arrives empty here, the admin
 * simply resolves to zero pages rather than crashing.
 */
export function resolvePermissions(adminDoc: AdminDocLike | null | undefined): PageKey[] {
  if (!isActiveAdmin(adminDoc)) return [];
  const role = adminDoc?.role;
  if (typeof role !== 'string' || !role) return [];
  if (role === 'owner') return [...ROLE_PERMISSION_MATRIX.owner];
  const explicit = normalizeExplicitPermissions(adminDoc?.permissions);
  if (explicit.length > 0) return explicit;
  if (role in ROLE_PERMISSION_MATRIX) return [...ROLE_PERMISSION_MATRIX[role as DashboardRole]];
  return [];
}

/** @deprecated Use resolvePermissions */
export const resolveEffectivePermissions = resolvePermissions;

export function hasPageAccess(role: DashboardRole | string | null | undefined, pageKey: PageKey): boolean {
  if (!role || !(role in ROLE_PERMISSION_MATRIX)) return false;
  return ROLE_PERMISSION_MATRIX[role as DashboardRole].includes(pageKey);
}

export function hasPermission(adminDoc: AdminDocLike | null | undefined, pageKey: string): boolean {
  if (!isValidPageKey(pageKey)) return false;
  // Routed through resolvePermissions (not the static hasPageAccess matrix)
  // so per-employee custom permissions[] and custom roles are both honored —
  // hasPageAccess alone can't see either of those.
  return resolvePermissions(adminDoc).includes(pageKey);
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
  'spinWheel',
  'promos',
  'subscriptions',
  'payouts',
  'accounts',
  'flashsales',
  'reviews',
  'notificationCenter',
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

/**
 * Restricts a requested page-access list to only the pages the acting admin
 * can themself access — nobody with adminManagement access can grant another
 * employee a page they don't have access to. Owner is exempt (always full
 * access, so no cap is ever needed there).
 */
export function capPermissionsToActor(
  actor: AdminDocLike | null | undefined,
  requested: PageKey[],
): PageKey[] {
  if (actor?.role === 'owner') return requested;
  const actorPages = resolvePermissions(actor);
  return requested.filter((p) => actorPages.includes(p));
}

/**
 * The owner account is fully protected — no one (not even another owner, and
 * not even the owner themself) may edit or delete an existing owner's admin
 * record from the dashboard. Any legitimate change to the owner's own record
 * must happen outside this admin-management flow.
 */
export function canModifyAdminRecord(
  actor: AdminDocLike | null | undefined,
  target: AdminDocLike & { id?: string },
  actorUid?: string | null,
): boolean {
  if (!canAccessAdminManagement(actor)) return false;
  if (target.role === 'owner') return false;
  if (actor?.role === 'owner') return true;
  if (actorUid && target.id === actorUid) return false;
  return false;
}

/** Owner accounts can never be deleted, by anyone — including another owner. */
export function canDeleteAdminRecord(
  actor: AdminDocLike | null | undefined,
  target: AdminDocLike & { id?: string },
): boolean {
  if (actor?.role !== 'owner') return false;
  return target.role !== 'owner';
}

/** Activity log read — owner, supervisor, or anyone explicitly granted the 'activityLogs' page (matches Firestore isSuperAdmin). */
export function canReadActivityLogs(adminDoc: AdminDocLike | null | undefined): boolean {
  if (!isActiveAdmin(adminDoc)) return false;
  if (adminDoc?.role === 'owner' || adminDoc?.role === 'supervisor') return true;
  return hasPermission(adminDoc, 'activityLogs');
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
  spinWheel: 'عجلة الحظ',
  promoCodes: 'أكواد الخصم',
  subscriptions: 'الاشتراكات والتفعيل التلقائي',
  payouts: 'أرباح المتاجر (مستحقات)',
  accounts: 'الحسابات — أرباح الاشتراكات',
  flashSales: 'الفعاليات المركزية',
  reviews: 'تقييمات المتاجر',
  broadcast: 'إرسال إشعارات',
  notificationTemplates: 'نصوص الإشعارات',
  whatsapp: 'حملات الواتساب',
  heatmap: 'الخريطة الحرارية',
  database: 'قاعدة البيانات',
  ads: 'الإعلانات الممولة',
  activityLogs: 'سجل النشاط',
  adminManagement: 'إدارة المدراء',
  settings: 'إعدادات النظام',
};

/**
 * Owner-defined role, stored in settings/global.customRoles, that behaves
 * exactly like a built-in role except it has no entry in ROLE_PERMISSION_MATRIX
 * — its default page set is `permissions` here instead. Admins assigned a
 * custom role always carry an explicit, non-empty permissions[] on their doc
 * (forked from this default at creation/edit time), since there is no
 * fallback matrix to resolve to if it were left empty.
 */
export interface CustomRoleDef {
  id: string;
  label: string;
  description: string;
  permissions: PageKey[];
}

export function isBuiltInRole(role: string | null | undefined): role is DashboardRole {
  return !!role && role in ROLE_PERMISSION_MATRIX;
}

/** Default page set for a role — built-in matrix first, then custom role definitions. */
export function getRoleDefaultPages(
  role: string | null | undefined,
  customRoles: CustomRoleDef[] = [],
): PageKey[] {
  if (!role) return [];
  if (role in ROLE_PERMISSION_MATRIX) return [...ROLE_PERMISSION_MATRIX[role as DashboardRole]];
  const custom = customRoles.find((r) => r.id === role);
  return custom ? [...custom.permissions] : [];
}
