/* eslint-disable */
import React, { createContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { StorageService } from '@shared/services/storageService';
import { db, auth, app } from '@shared/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  collection, doc, setDoc, updateDoc,
  onSnapshot, getDoc, writeBatch, increment, serverTimestamp,
  query, orderBy, limit, where,
} from 'firebase/firestore';

// Caps for admin real-time listeners — large enough for daily operations but
// prevents loading the entire database into memory on every admin login.
const ADMIN_STORES_LIMIT     = 2000;
const ADMIN_PRODUCTS_LIMIT   = 3000;
const ADMIN_CUSTOMERS_LIMIT  = 2000;
const ADMIN_ORDERS_LIMIT     = 500;
const ADMIN_NOTIFS_LIMIT     = 300;
const ADMIN_REVIEWS_LIMIT    = 300;
const ADMIN_PAYOUTS_LIMIT    = 200;
const ADMIN_FLASH_REQS_LIMIT = 200;
const ADMIN_PROMO_LIMIT      = 500;
const ADMIN_RECHARGE_LIMIT   = 500;
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from 'firebase/auth';
import { handleFirestoreError, OperationType } from '@shared/lib/firestoreUtils';
import { BLOCKED_PHONES, type BlockedPhoneRecord } from '@shared/lib/uniquenessRegistry';
import { setupPushNotifications } from '../lib/pushNotifications';
import { warnIfOneSignalNotConfigured } from '../lib/onesignalConfig';
import { getAdminAuthErrorMessage, verifyDashboardAdmin, mapAdminDoc } from '../lib/adminAuth';
import { syncAdminStorageClaims } from '@shared/lib/storeAuth';
import type { DashboardAdminRole } from '../lib/adminAuth';
import {
  canAccessTab as checkTabAccess,
  hasPermission,
  canAccessAdminManagement,
  canModifyAdminRecord,
  canDeleteAdminRecord,
  canReadActivityLogs,
  resolvePermissions,
  type AdminPanelTab,
  type DashboardPermission,
} from '../lib/permissions';
import { buildAdminActor } from '../lib/adminActionRunner';
import { formatCustomerSeqId } from '@shared/utils/customerId';
import { buildLocalizedLogFields } from '../lib/activityLogI18n';
import { logActivity } from '../services/activityLogger';
import { createAdminService, type AdminServiceContext } from '../services/adminService';
import {
  createUserAccount,
  updateUserAccount,
  deleteUserAccount,
  type CreateAdminAccountPayload,
} from '../services/adminManagementService';
import {
  Province, SubscriptionPlan, Store, Product, Customer, Order,
  PromoCode, RechargeCode, AppNotification, FlashSale,
  FlashSaleRequest, StoreReview, PayoutRequest, Admin, ActivityLog,
} from '@shared/types';
import { IRAQ_PROVINCES, SUBSCRIPTION_PLANS } from '@shared/constants';
import { resolveAllSubscriptionPlans } from '@shared/constants/merchantRenewalPlans';

// ==========================================
// Admin Context Interface
// ==========================================
export interface AdminContextType {
  provinces: Province[];
  stores: Store[];
  products: Product[];
  customers: Customer[];
  orders: Order[];
  promoCodes: PromoCode[];
  rechargeCodes: RechargeCode[];
  notifications: AppNotification[];
  payoutRequests: PayoutRequest[];
  flashSales: FlashSale[];
  flashSaleRequests: FlashSaleRequest[];
  storeReviews: StoreReview[];
  currentAdmin: boolean;
  adminEmail: string | null;
  adminUid: string | null;
  currentAdminDoc: Admin | null;
  adminRole: DashboardAdminRole | null;
  adminPermissions: DashboardPermission[];
  adminStaff: Admin[];
  activityLogs: ActivityLog[];
  hasPermission: (perm: DashboardPermission | string) => boolean;
  canAccessTab: (tab: AdminPanelTab) => boolean;
  updateAdminStaff: (
    uid: string,
    data: {
      role: DashboardAdminRole;
      permissions?: string[];
      name?: string;
      status?: string;
      phone?: string;
      province?: string;
      area?: string;
      isSuspended?: boolean;
    },
  ) => Promise<void>;
  createAdminStaff: (data: CreateAdminAccountPayload) => Promise<{ uid: string }>;
  toggleAdminStatus: (uid: string, active: boolean) => Promise<void>;
  deleteAdminStaff: (uid: string) => Promise<void>;
  updateAdminCredentials: (uid: string, data: { email?: string; password?: string }) => Promise<void>;
  logAdminActivity: (action: string, details?: string) => Promise<void>;
  adminSettings: any;
  subscriptionPlans: SubscriptionPlan[];
  authLoading: boolean;

  // Utility
  getCustomerSeqId: (id: string | undefined | null) => string;
  getOrderSeqId: (id: string | undefined | null) => string;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;

  // Auth
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  adminLogout: () => Promise<void>;
  // Stubs for compatibility with AdminPanel (admin app never sets customers/merchants)
  setCurrentAdmin: (b: boolean) => void;
  setCurrentCustomer: (c: unknown) => void;
  setCurrentMerchant: (s: unknown) => void;

  // Notifications
  addNotification: (notif: Record<string, unknown>) => void;
  addBulkNotifications: (notifs: Record<string, unknown>[]) => Promise<void>;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: (userId: string, role: 'customer' | 'merchant' | 'admin') => void;
  sendAdminNotification: (t: string, m: string, target: string) => Promise<void>;

  // Orders
  updateOrder: (id: string, data: Partial<Order>) => Promise<void>;
  updateOrderStatus: (id: string, status: string, reason?: string) => void;
  completePayout: (requestId: string) => Promise<void>;

  // Promo Codes
  createPromoCode: (promo: Record<string, unknown>) => Promise<void>;
  updatePromoCode: (id: string, data: Partial<PromoCode>) => Promise<void>;
  togglePromoCodeStatus: (id: string) => void;
  deletePromoCode: (id: string) => Promise<void>;

  // Recharge Codes
  generateRechargeCodes: (count: number, points: number) => Promise<void>;
  redeemRechargeCode: (code: string, customerId: string) => Promise<number>;
  deleteRechargeCode: (id: string) => Promise<void>;

  // Store management (admin)
  toggleAutoApprove: () => void;
  updateSubscriptionPrice: (id: string, p: number) => void;
  updateStoreStatus: (id: string, s: string) => void;
  updateStoreBadges: (id: string, badges: string[]) => void;
  adminUpdateStore: (storeId: string, data: Partial<Store>) => Promise<void>;
  toggleStoreBan: (id: string) => void;
  deleteStore: (id: string) => void;

  // Customer management (admin)
  toggleCustomerBlock: (id: string) => void;
  resetCustomerPoints: (id: string, reason: string) => Promise<void>;
  deleteCustomer: (id: string) => void;
  blockedAccounts: BlockedPhoneRecord[];
  unblockBlockedPhone: (phoneKey: string) => Promise<void>;

  // Admin settings
  updateAdminSettings: (data: Partial<any>) => void;

  // Flash Sales
  createFlashSale: (data: Omit<FlashSale, 'id'>) => Promise<void>;
  updateFlashSaleStatus: (id: string, status: FlashSale['status']) => void;
  updateFlashSaleDates: (id: string, startTime: string, endTime: string) => void;
  deleteFlashSale: (id: string) => void;
  requestJoinFlashSale: (request: Omit<FlashSaleRequest, 'id'>) => Promise<void>;
  updateFlashSaleRequestStatus: (id: string, status: FlashSaleRequest['status']) => void;

  // Database seeding
  seedDatabase: () => Promise<{ success: boolean; message: string }>;
  generateVirtualData: (storeCount: number, productCount: number) => Promise<{ success: boolean; message: string }>;
  deleteAllVirtualData: () => Promise<{ success: boolean; message: string }>;

  // Product management (admin can also manage products)
  addProduct: (data: Record<string, unknown>) => Promise<void>;
  deleteProduct: (id: string, mode?: string) => Promise<void>;
  updateProduct: (id: string, data: Record<string, unknown>) => Promise<void>;
  submitStoreReview: (review: Record<string, unknown>) => Promise<void>;
  updateStoreReview: (id: string, data: Partial<StoreReview>) => Promise<void>;
  deleteStoreReview: (id: string) => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Data
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [rechargeCodes, setRechargeCodes] = useState<RechargeCode[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [flashSaleRequests, setFlashSaleRequests] = useState<FlashSaleRequest[]>([]);
  const [storeReviews, setStoreReviews] = useState<StoreReview[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [blockedAccounts, setBlockedAccounts] = useState<BlockedPhoneRecord[]>([]);

  // Auth
  const [currentAdmin, setCurrentAdminState] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [adminUid, setAdminUid] = useState<string | null>(null);
  const [currentAdminDoc, setCurrentAdminDoc] = useState<Admin | null>(null);
  const [adminRole, setAdminRole] = useState<DashboardAdminRole | null>(null);
  const [adminPermissions, setAdminPermissions] = useState<DashboardPermission[]>([]);
  const [adminStaff, setAdminStaff] = useState<Admin[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [authLoading, setAuthLoading] = useState(true);

  const [adminSettings, setAdminSettings] = useState<any>(() =>
    StorageService.get('ADMIN_SETTINGS') || {
      autoApproveStores: true,
      featuredStoreIds: [],
      enableAutoNearby: true,
      nearbyStoreIds: [],
      ads: [],
      adInterval: 5,
      merchantAdInterval: 5,
      merchantAdsSectionOrder: ['delivery', 'media'],
      lastSyncTime: null,
      autoSubscriptionEnabled: true,
      autoSubscriptionDurationValue: 1,
      autoSubscriptionDurationUnit: 'months',
    }
  );

  const subscriptionPlans = useMemo<SubscriptionPlan[]>(
    () =>
      resolveAllSubscriptionPlans(adminSettings).map((p) => ({
        id: p.id,
        name: p.labelAr,
        durationMonths: Math.max(1, Math.round(p.durationDays / 30)),
        price: p.priceIqd,
        discountText: p.badge ?? '',
      })),
    [adminSettings],
  );

  const hasPermissionFn = useCallback(
    (perm: DashboardPermission | string) => hasPermission(currentAdminDoc, perm),
    [currentAdminDoc],
  );

  const canAccessTab = useCallback(
    (tab: AdminPanelTab) => checkTabAccess(currentAdminDoc, tab),
    [currentAdminDoc],
  );

  const adminActor = useMemo(
    () =>
      buildAdminActor({
        uid: adminUid,
        name: currentAdminDoc?.name,
        email: adminEmail ?? currentAdminDoc?.email,
        role: adminRole ?? currentAdminDoc?.role,
        adminDoc: currentAdminDoc,
      }),
    [adminUid, adminEmail, currentAdminDoc, adminRole],
  );

  const adminService = useMemo(() => createAdminService(adminActor), [adminActor]);

  const logAdminActivity = useCallback(
    async (actionKey: string, targetId?: string, meta?: { name?: string; email?: string; description?: string }) => {
      if (!adminUid) return;
      const localized = buildLocalizedLogFields(actionKey, targetId, meta);
      await logActivity({
        actionKey,
        action: localized.action,
        targetId: localized.targetLabel,
        description: localized.description,
        adminUid,
        adminName: adminActor.name ?? adminActor.email ?? adminUid,
        adminEmail: adminActor.email ?? undefined,
        adminRole: adminActor.role ?? undefined,
        adminPermissions: resolvePermissions(adminActor.adminDoc),
      });
    },
    [adminUid, adminActor],
  );

  const staffLogMeta = (uid: string) => {
    const member = adminStaff.find((m) => m.id === uid);
    return { name: member?.name, email: member?.email };
  };

  const updateAdminStaff = async (
    uid: string,
    data: {
      role: DashboardAdminRole;
      permissions?: string[];
      name?: string;
      status?: string;
      phone?: string;
      province?: string;
      area?: string;
      isSuspended?: boolean;
    },
  ) => {
    const target = adminStaff.find((member) => member.id === uid);
    if (!canModifyAdminRecord(currentAdminDoc, target ?? { role: data.role, id: uid }, adminUid)) {
      throw new Error('You do not have permission to update this admin.');
    }
    if (data.role === 'owner' && currentAdminDoc?.role !== 'owner') {
      throw new Error('Only owner can assign owner role.');
    }
    const payload: Record<string, unknown> = {
      role: data.role,
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.province !== undefined ? { province: data.province } : {}),
      ...(data.area !== undefined ? { area: data.area } : {}),
      updatedAt: serverTimestamp(),
    };
    if (data.status !== undefined) payload.status = data.status;
    if (data.isSuspended !== undefined) {
      payload.isSuspended = data.isSuspended;
      if (!payload.status) {
        payload.status = data.isSuspended ? 'suspended' : 'active';
      }
    }
    if (data.permissions !== undefined) {
      payload.permissions = data.permissions;
    }
    await adminService.updateStaff(uid, payload, staffLogMeta(uid));
  };

  const createAdminStaff = async (data: CreateAdminAccountPayload) => {
    if (!canAccessAdminManagement(currentAdminDoc)) {
      throw new Error('Admin management access required.');
    }
    if (data.role === 'owner' && currentAdminDoc?.role !== 'owner') {
      throw new Error('Only owner can create owner accounts.');
    }
    const result = await adminService.createStaff(data.email, () => createUserAccount(data));
    return { uid: result.uid };
  };

  const toggleAdminStatus = async (uid: string, active: boolean) => {
    const target = adminStaff.find((member) => member.id === uid);
    if (!canModifyAdminRecord(currentAdminDoc, target ?? { id: uid }, adminUid)) {
      throw new Error('You do not have permission to change this admin status.');
    }
    await adminService.toggleStaffStatus(uid, active, staffLogMeta(uid));
  };

  const deleteAdminStaff = async (uid: string) => {
    const target = adminStaff.find((member) => member.id === uid);
    if (!canDeleteAdminRecord(currentAdminDoc, target ?? { id: uid })) {
      throw new Error('You do not have permission to delete this admin.');
    }
    await adminService.deleteStaff(uid, () => deleteUserAccount(uid), staffLogMeta(uid));
  };

  const updateAdminCredentials = async (uid: string, data: { email?: string; password?: string }) => {
    const target = adminStaff.find((member) => member.id === uid);
    if (!canModifyAdminRecord(currentAdminDoc, target ?? { id: uid }, adminUid)) {
      throw new Error('You do not have permission to update credentials.');
    }
    if (!data.email && !data.password) return;
    await adminService.updateStaffCredentials(uid, () => updateUserAccount({ uid, ...data }), staffLogMeta(uid));
  };

  // ==========================================
  // Auth Observer — admin-only: check /admins collection
  // ==========================================
  useEffect(() => {
    let isMounted = true;
    const fallbackTimer = setTimeout(() => {
      if (isMounted) setAuthLoading(false);
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(fallbackTimer);
      if (!isMounted) return;

      if (user) {
        try {
          const result = await verifyDashboardAdmin(user.uid);

          if (result.authorized && result.admin) {
            setCurrentAdminState(true);
            setAdminEmail(user.email);
            setAdminUid(user.uid);
            setCurrentAdminDoc(result.admin);
            setAdminRole(result.admin.role);
            setAdminPermissions(result.admin.permissions as DashboardPermission[]);
            try {
              await updateDoc(doc(db, 'admins', user.uid), {
                lastLogin: serverTimestamp(),
              });
            } catch {
              /* best-effort — doc must already exist with a valid role */
            }
            try {
              await syncAdminStorageClaims();
            } catch {
              /* Storage uploads may fail until claims sync */
            }
          } else {
            setCurrentAdminState(false);
            setAdminEmail(null);
            setAdminUid(null);
            setCurrentAdminDoc(null);
            setAdminRole(null);
            setAdminPermissions([]);
            await signOut(auth);
          }
        } catch (e) {
          setCurrentAdminState(false);
          setAdminEmail(null);
          setAdminUid(null);
          setCurrentAdminDoc(null);
          setAdminRole(null);
          setAdminPermissions([]);
        }
      } else {
      setCurrentAdminState(false);
      setAdminEmail(null);
      setAdminUid(null);
      setCurrentAdminDoc(null);
      setAdminRole(null);
      setAdminPermissions([]);
      }

      if (isMounted) setAuthLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    warnIfOneSignalNotConfigured();
    if (!currentAdmin || !adminUid) return;
    void setupPushNotifications(adminUid, 'admins');
  }, [currentAdmin, adminUid]);

  useEffect(() => {
    if (!currentAdmin || !canAccessAdminManagement(currentAdminDoc)) {
      setAdminStaff([]);
      return;
    }

    const unsub = onSnapshot(collection(db, 'admins'), (snap) => {
      const rows: Admin[] = [];
      snap.forEach((docSnap) => {
        const mapped = mapAdminDoc(docSnap.id, docSnap.data() as Record<string, unknown>);
        if (mapped) rows.push(mapped);
      });
      setAdminStaff(rows);
    });

    return () => unsub();
  }, [currentAdmin, currentAdminDoc?.role]);

  useEffect(() => {
    if (!currentAdmin || !canReadActivityLogs(currentAdminDoc)) {
      setActivityLogs([]);
      return;
    }

    const q = query(collection(db, 'activityLogs'), orderBy('createdAt', 'desc'), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      setActivityLogs(
        snap.docs.map((docSnap) => {
          const data = docSnap.data();
          const description =
            typeof data.description === 'string'
              ? data.description
              : typeof data.details === 'string'
                ? data.details
                : undefined;
          return {
            id: docSnap.id,
            actionKey: typeof data.actionKey === 'string' ? data.actionKey : undefined,
            action: String(data.action ?? ''),
            targetId: typeof data.targetId === 'string' ? data.targetId : undefined,
            description,
            details: description,
            adminUid: String(data.adminUid ?? ''),
            adminEmail: data.adminEmail,
            adminName: data.adminName,
            adminRole: data.adminRole,
            adminPermissions: data.adminPermissions,
            createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
          };
        }),
      );
    });

    return () => unsub();
  }, [currentAdmin, currentAdminDoc]);

  // Real-time Firestore listeners (admin session only)
  useEffect(() => {
    if (!currentAdmin) {
      setStores([]);
      setProducts([]);
      setCustomers([]);
      setOrders([]);
      setPromoCodes([]);
      setRechargeCodes([]);
      setNotifications([]);
      setFlashSales([]);
      setFlashSaleRequests([]);
      setStoreReviews([]);
      setPayoutRequests([]);
      return;
    }

    const mapDocs = <T,>(snap: { docs: Array<{ id: string; data: () => T }> }) =>
      Array.from(new Map(snap.docs.map(d => [d.id, { ...d.data(), id: d.id }])).values());

    const loadCustomersViaFunction = async () => {
      try {
        const fn = httpsCallable(getFunctions(app), 'listDashboardCustomers');
        const result = await fn();
        const rows = Array.isArray(result.data) ? result.data : [];
        setCustomers(rows as Customer[]);
      } catch (e) {
        console.warn('[AdminContext] listDashboardCustomers failed:', e);
      }
    };

    const unsubStores = onSnapshot(
      query(collection(db, 'stores'), limit(ADMIN_STORES_LIMIT)),
      snap => setStores(mapDocs<Store>(snap)),
    );

    const unsubProducts = onSnapshot(
      query(collection(db, 'products'), limit(ADMIN_PRODUCTS_LIMIT)),
      snap => setProducts(mapDocs<Product>(snap)),
    );

    // Single source of truth: live listener with callable as error fallback.
    // Do NOT call loadCustomersViaFunction() eagerly — the listener handles
    // the initial load and avoids a duplicate full-collection fetch on login.
    const unsubCust = onSnapshot(
      query(collection(db, 'customers'), limit(ADMIN_CUSTOMERS_LIMIT)),
      (snap) => setCustomers(mapDocs<Customer>(snap)),
      (err) => {
        console.warn('[AdminContext] customers listener error, falling back to callable:', err);
        void loadCustomersViaFunction();
      },
    );

    const unsubOrders = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(ADMIN_ORDERS_LIMIT)),
      snap => setOrders(mapDocs<Order>(snap)),
    );

    const unsubNotifs = onSnapshot(
      query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(ADMIN_NOTIFS_LIMIT)),
      snap => setNotifications(mapDocs<AppNotification>(snap)),
    );

    const unsubRecharge = onSnapshot(
      query(collection(db, 'recharge_codes'), limit(ADMIN_RECHARGE_LIMIT)),
      snap => setRechargeCodes(mapDocs<RechargeCode>(snap)),
    );

    const unsubPromo = onSnapshot(
      query(collection(db, 'promo_codes'), limit(ADMIN_PROMO_LIMIT)),
      snap => setPromoCodes(mapDocs<PromoCode>(snap)),
    );

    const unsubFlash = onSnapshot(
      query(collection(db, 'flash_sales'), limit(100)),
      snap => setFlashSales(mapDocs<FlashSale>(snap)),
    );

    const unsubFlashReqs = onSnapshot(
      query(collection(db, 'flash_sale_requests'), orderBy('createdAt', 'desc'), limit(ADMIN_FLASH_REQS_LIMIT)),
      snap => setFlashSaleRequests(mapDocs<FlashSaleRequest>(snap)),
    );

    const unsubReviews = onSnapshot(
      query(collection(db, 'store_reviews'), orderBy('createdAt', 'desc'), limit(ADMIN_REVIEWS_LIMIT)),
      snap => setStoreReviews(mapDocs<StoreReview>(snap)),
    );

    const unsubPayouts = onSnapshot(
      query(collection(db, 'payoutRequests'), orderBy('createdAt', 'desc'), limit(ADMIN_PAYOUTS_LIMIT)),
      snap => setPayoutRequests(mapDocs<PayoutRequest>(snap)),
    );

    const unsubBlocked = onSnapshot(
      query(collection(db, BLOCKED_PHONES), limit(2000)),
      snap => setBlockedAccounts(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BlockedPhoneRecord, 'id'>) })),
      ),
    );

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), snap => {
      if (snap.exists()) {
        const data = snap.data() as Record<string, unknown>;
        setAdminSettings(data);
        StorageService.save('ADMIN_SETTINGS', data);
      }
    });

    return () => {
      unsubStores(); unsubProducts(); unsubCust(); unsubOrders(); unsubNotifs();
      unsubRecharge(); unsubPromo(); unsubFlash(); unsubFlashReqs(); unsubReviews();
      unsubPayouts(); unsubBlocked(); unsubSettings();
    };
  }, [currentAdmin]);

  // ==========================================
  // Auth Actions
  // ==========================================
  const adminLogin = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const result = await verifyDashboardAdmin(cred.user.uid);

      if (!result.authorized) {
        await signOut(auth);
        return { success: false, message: getAdminAuthErrorMessage(result.reason) };
      }
      try {
        await syncAdminStorageClaims();
      } catch {
        /* non-fatal */
      }
      return { success: true, message: 'تم تسجيل الدخول بنجاح' };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      let msg = 'حدث خطأ غير متوقع';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      } else if (code === 'auth/too-many-requests') {
        msg = 'عدد كبير من المحاولات الفاشلة. يرجى الانتظار قبل المحاولة مجدداً';
      } else if (code === 'auth/network-request-failed') {
        msg = 'فشل الاتصال بالخادم. تحقق من اتصالك بالإنترنت';
      }
      return { success: false, message: msg };
    }
  };

  const adminLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
    }
  };

  // ==========================================
  // Utility
  // ==========================================
  const getCustomerSeqId = useCallback((id: string | undefined | null): string => {
    if (!id) return '';
    const customer = customers.find((c) => c.id === id);
    if (customer?.customerNumber != null && customer.customerNumber > 0) {
      return formatCustomerSeqId(customer.customerNumber);
    }
    const sorted = [...customers].sort((a, b) => {
      const getVal = (c: Customer) => {
        if (c.joinedAt) return new Date(c.joinedAt).getTime();
        const ts = (c as unknown as Record<string, unknown>).createdAt as { toMillis?: () => number; seconds?: number } | undefined;
        if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
        if (ts && typeof ts.seconds === 'number') return ts.seconds * 1000;
        return 0;
      };
      return getVal(a) - getVal(b);
    });
    const idx = sorted.findIndex((c) => c.id === id);
    return idx >= 0 ? formatCustomerSeqId(idx + 1) : '0000';
  }, [customers]);

  const getOrderSeqId = useCallback((id: string | undefined | null): string => {
    if (!id) return '';
    const order = orders.find(o => o.id === id);
    if (order?.orderNumber != null && Number.isFinite(Number(order.orderNumber))) {
      return String(order.orderNumber);
    }
    const sorted = [...orders].sort((a, b) => {
      const getVal = (o: Order) => {
        if (o.createdAt) return new Date(o.createdAt).getTime();
        return 0;
      };
      return getVal(a) - getVal(b);
    });
    const idx = sorted.findIndex(o => o.id === id);
    return idx >= 0 ? String(idx + 1).padStart(6, '0') : '000000';
  }, [orders]);

  // ==========================================
  // Notifications
  // ==========================================
  const addNotification = async (notif: Record<string, unknown>) => {
    const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const n = { ...notif, id, read: false, createdAt: new Date().toISOString() };
    try {
      await setDoc(doc(db, 'notifications', id), n);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'notifications/' + id);
    }
  };

  const addBulkNotifications = async (notifs: Record<string, unknown>[]) => {
    const batchSize = 400;
    for (let i = 0; i < notifs.length; i += batchSize) {
      const chunk = notifs.slice(i, i + batchSize);
      const batch = writeBatch(db);
      for (const data of chunk) {
        const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const n = { ...data, id, read: false, createdAt: data.createdAt || new Date().toISOString() };
        batch.set(doc(db, 'notifications', id), n);
      }
      await batch.commit();
    }
    // Push notifications are dispatched by the onNotificationCreated Cloud Function
    // trigger, so no manual sendExternalPush call is needed here — doing so would
    // cause every broadcast recipient to receive two identical pushes.
  };

  const markNotificationAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
    }
  };

  const markAllNotificationsAsRead = async (userId: string, role: string) => {
    const unread = notifications.filter(n => n.userId === userId && n.role === role && !n.read);
    if (!unread.length) return;
    setNotifications(prev => prev.map(n => n.userId === userId && n.role === role && !n.read ? { ...n, read: true } : n));
    const batch = writeBatch(db);
    unread.forEach(n => batch.update(doc(db, 'notifications', n.id), { read: true }));
    try {
      await batch.commit();
    } catch {
      setNotifications(prev => prev.map(n => {
        const was = unread.some(u => u.id === n.id);
        return was ? { ...n, read: false } : n;
      }));
    }
  };

  const buildSvcCtx = (): AdminServiceContext => ({
    stores,
    customers,
    orders,
    products,
    promoCodes,
    flashSales,
    flashSaleRequests,
    storeReviews,
    notifications,
    adminSettings,
    adminStaff: adminStaff.map((m) => ({ id: m.id, name: m.name, email: m.email })),
    addNotification,
    addBulkNotifications,
    setAdminSettings,
  });

  const sendAdminNotification = async (t: string, m: string, target: string) => {
    await adminService.sendBroadcast(t, m, target, buildSvcCtx());
  };

  // ==========================================
  // Orders
  // ==========================================
  const updateOrder = async (id: string, data: Partial<Order>) => {
    try {
      await adminService.updateOrder(id, data, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'orders/' + id);
    }
  };

  const updateOrderStatus = async (id: string, status: string, reason?: string) => {
    try {
      await adminService.updateOrderStatus(id, status, buildSvcCtx(), reason);
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('ALREADY_DELIVERED')) return;
      handleFirestoreError(e, OperationType.UPDATE, 'orders/' + id);
    }
  };

  const completePayout = async (requestId: string) => {
    await adminService.completePayout(requestId);
  };

  // ==========================================
  // Promo Codes
  // ==========================================
  const createPromoCode = async (promo: Record<string, unknown>) => {
    try {
      await adminService.createPromoCode(promo);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'promo_codes');
    }
  };

  const updatePromoCode = async (id: string, data: Partial<PromoCode>) => {
    try {
      await adminService.updatePromoCode(id, data, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'promo_codes/' + id);
    }
  };

  const togglePromoCodeStatus = async (id: string) => {
    try {
      await adminService.togglePromoCodeStatus(id, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'promo_codes/' + id);
    }
  };

  const deletePromoCode = async (id: string) => {
    try {
      await adminService.deletePromoCode(id, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'promo_codes/' + id);
    }
  };

  // ==========================================
  // Recharge Codes
  // ==========================================
  const generateRechargeCodes = async (count: number, points: number) => {
    try {
      await adminService.generateRechargeCodes(count, points);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'recharge_codes_batch');
    }
  };

  const redeemRechargeCode = async (codeStr: string, customerId: string): Promise<number> => {
    const codeData = rechargeCodes.find(c => c.code === codeStr && c.status === 'active');
    if (!codeData) throw new Error('الكود غير صالح أو مستخدم مسبقاً');
    const batch = writeBatch(db);
    batch.update(doc(db, 'recharge_codes', codeData.id), { status: 'used', usedBy: customerId, usedAt: serverTimestamp() });
    batch.update(doc(db, 'customers', customerId), { points: increment(codeData.points) });
    await batch.commit();
    return codeData.points;
  };

  const deleteRechargeCode = async (id: string) => {
    try {
      await adminService.deleteRechargeCode(id);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'recharge_codes/' + id);
    }
  };

  // ==========================================
  // Admin Settings
  // ==========================================
  const updateAdminSettings = async (data: Partial<any>) => {
    try {
      await adminService.updateAdminSettings(data, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'settings/global');
    }
  };

  const toggleAutoApprove = () => updateAdminSettings({ autoApproveStores: !adminSettings.autoApproveStores });

  const updateSubscriptionPrice = (id: string, price: number) => {
    void adminService.updateSubscriptionPrice(id, price, buildSvcCtx()).catch((e) =>
      handleFirestoreError(e, OperationType.UPDATE, 'settings/global'),
    );
  };

  // ==========================================
  // Store Management
  // ==========================================
  const updateStoreStatus = async (id: string, s: string) => {
    try {
      await adminService.updateStoreStatus(id, s, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'stores/' + id);
    }
  };

  const updateStoreBadges = async (id: string, badges: string[]) => {
    try {
      await adminService.updateStoreBadges(id, badges, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'stores/' + id);
    }
  };

  const adminUpdateStore = async (storeId: string, data: Partial<Store>) => {
    try {
      await adminService.adminUpdateStore(storeId, data, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'stores/' + storeId);
    }
  };

  const toggleStoreBan = async (id: string) => {
    try {
      await adminService.toggleStoreBan(id, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'stores/' + id);
    }
  };

  const deleteStore = async (id: string) => {
    try {
      await adminService.deleteStore(id, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'stores/' + id);
    }
  };

  // ==========================================
  // Customer Management
  // ==========================================
  const toggleCustomerBlock = async (id: string) => {
    try {
      await adminService.blockCustomer(id, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'customers/' + id);
    }
  };

  const resetCustomerPoints = async (id: string, reason: string) => {
    try {
      await adminService.resetCustomerPoints(id, reason, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'customers/' + id);
      throw e;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      await adminService.deleteCustomer(id, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'customers/' + id);
    }
  };

  const unblockBlockedPhone = async (phoneKey: string) => {
    try {
      await adminService.unblockBlockedPhone(phoneKey, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'blocked_phones/' + phoneKey);
    }
  };

  // ==========================================
  // Flash Sales
  // ==========================================
  const createFlashSale = async (data: Omit<FlashSale, 'id'>) => {
    try {
      await adminService.createFlashSale(data, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'flash_sales');
    }
  };

  const updateFlashSaleStatus = async (id: string, status: FlashSale['status']) => {
    try {
      await adminService.updateFlashSaleStatus(id, status, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'flash_sales/' + id);
    }
  };

  const updateFlashSaleDates = async (id: string, startTime: string, endTime: string) => {
    try {
      await adminService.updateFlashSaleDates(id, startTime, endTime, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'flash_sales/' + id);
    }
  };

  const deleteFlashSale = async (id: string) => {
    try {
      await adminService.deleteFlashSale(id, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'flash_sales/' + id);
    }
  };

  const requestJoinFlashSale = async (request: Omit<FlashSaleRequest, 'id'>) => {
    const id = 'fsr_' + Date.now();
    try {
      await setDoc(doc(db, 'flash_sale_requests', id), { ...request, id, createdAt: serverTimestamp() });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'flash_sale_requests/' + id);
    }
  };

  const updateFlashSaleRequestStatus = async (id: string, status: FlashSaleRequest['status']) => {
    try {
      await adminService.updateFlashSaleRequestStatus(id, status, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'flash_sale_requests/' + id);
    }
  };

  // ==========================================
  // Store Reviews (for admin moderation)
  // ==========================================
  const submitStoreReview = async (review: Record<string, unknown>) => {
    const id = 'review_' + Date.now();
    try {
      await setDoc(doc(db, 'store_reviews', id), { ...review, id, createdAt: new Date().toISOString() });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'store_reviews/' + id);
    }
  };

  const updateStoreReview = async (id: string, data: Partial<StoreReview>) => {
    try {
      await adminService.updateStoreReview(id, data);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'store_reviews/' + id);
    }
  };

  const deleteStoreReview = async (id: string) => {
    try {
      await adminService.deleteStoreReview(id);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'store_reviews/' + id);
    }
  };

  // ==========================================
  // Database Seeding (from original AppContext)
  // ==========================================
  const seedDatabase = async (): Promise<{ success: boolean; message: string }> => {
    try {
      await adminService.seedDatabase();
      return { success: true, message: 'تم تهيئة البيانات الأولية بنجاح!' };
    } catch (err: unknown) {
      return { success: false, message: 'فشل تهيئة البيانات: ' + (err instanceof Error ? err.message : String(err)) };
    }
  };

  const generateVirtualData = async (storeCount: number, productCount: number): Promise<{ success: boolean; message: string }> => {
    try {
      await adminService.generateVirtualData(storeCount, productCount);
      return { success: true, message: `تم توليد ${storeCount} متجر افتراضي مع ${storeCount * productCount} منتج بنجاح!` };
    } catch (err: unknown) {
      return { success: false, message: 'فشل التوليد: ' + (err instanceof Error ? err.message : String(err)) };
    }
  };

  const deleteAllVirtualData = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const virtualStores = stores.filter(s => s.is_virtual || s.id.startsWith('virtual-'));
      const virtualProducts = products.filter(p => p.is_virtual || p.id.startsWith('virtual-'));
      await adminService.deleteAllVirtualData(buildSvcCtx());
      return { success: true, message: `تم إزالة ${virtualStores.length} متجراً و${virtualProducts.length} منتجاً افتراضياً بنجاح!` };
    } catch (err: unknown) {
      return { success: false, message: 'فشل الحذف: ' + (err instanceof Error ? err.message : String(err)) };
    }
  };

  // ==========================================
  // Product Management (admin)
  // ==========================================
  const addProduct = async (data: Record<string, unknown>) => {
    try {
      await adminService.addProduct(data, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'products');
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await adminService.deleteProduct(id, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'products/' + id);
    }
  };

  const updateProduct = async (id: string, data: Record<string, unknown>) => {
    try {
      await adminService.updateProduct(id, data, buildSvcCtx());
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'products/' + id);
    }
  };

  // Compatibility stubs — the admin app owns auth; these are no-ops
  // setCurrentAdmin triggers logout when called with false (from the panel's handleAdminLogout)
  const setCurrentAdmin = async (b: boolean) => {
    if (!b) await adminLogout();
  };
  const setCurrentCustomer = (_c: unknown) => { /* no-op in admin app */ };
  const setCurrentMerchant = (_s: unknown) => { /* no-op in admin app */ };

  // ==========================================
  // Loading Screen
  // ==========================================
  if (authLoading) {
    return (
      <div className="fixed inset-0 w-full h-full z-50 flex flex-col items-center justify-center bg-[#0B1320]" dir="rtl">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-15%] right-[-10%] w-80 h-80 bg-[#7B3DFF]/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-72 h-72 bg-[#B18CFF]/8 rounded-full blur-[100px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center relative z-10"
        >
          <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
            <motion.div
              className="absolute inset-0 rounded-2xl border-[3px] border-white/5 border-t-[#7B3DFF]"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            />
            <div className="w-16 h-16 rounded-xl bg-[#7B3DFF]/20 flex items-center justify-center">
              <span className="text-2xl">🛡️</span>
            </div>
          </div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-l from-[#7B3DFF] to-[#B18CFF] mb-2">
            لوحة الإدارة
          </h2>
          <p className="text-slate-400 text-sm font-arabic">جاري التحقق من الصلاحيات...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{
      provinces: IRAQ_PROVINCES, stores, products, customers, orders, promoCodes, rechargeCodes,
      notifications, payoutRequests, flashSales, flashSaleRequests, storeReviews,
      currentAdmin, adminEmail, adminUid, currentAdminDoc, adminRole, adminPermissions, adminStaff,
      activityLogs, hasPermission: hasPermissionFn, canAccessTab, updateAdminStaff,
      createAdminStaff, toggleAdminStatus, deleteAdminStaff, updateAdminCredentials,
      logAdminActivity,
      adminSettings, subscriptionPlans, authLoading,
      getCustomerSeqId, getOrderSeqId, setOrders,
      adminLogin, adminLogout, setCurrentAdmin, setCurrentCustomer, setCurrentMerchant,
      addNotification, addBulkNotifications, markNotificationAsRead, markAllNotificationsAsRead, sendAdminNotification,
      updateOrder, updateOrderStatus, completePayout,
      createPromoCode, updatePromoCode, togglePromoCodeStatus, deletePromoCode,
      generateRechargeCodes, redeemRechargeCode, deleteRechargeCode,
      toggleAutoApprove, updateSubscriptionPrice, updateStoreStatus, updateStoreBadges,
      adminUpdateStore, toggleStoreBan, deleteStore,
      toggleCustomerBlock, resetCustomerPoints, deleteCustomer, blockedAccounts, unblockBlockedPhone,
      updateAdminSettings,
      createFlashSale, updateFlashSaleStatus, updateFlashSaleDates, deleteFlashSale,
      requestJoinFlashSale, updateFlashSaleRequestStatus,
      submitStoreReview, updateStoreReview, deleteStoreReview,
      addProduct, deleteProduct, updateProduct,
      seedDatabase, generateVirtualData, deleteAllVirtualData,
    }}>
      {children}
    </AdminContext.Provider>
  );
};
