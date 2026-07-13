/* eslint-disable react-hooks/purity */
import React, { createContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { StorageService } from '@shared/services/storageService';
import { isStoreSubscriptionActive } from '@shared/utils/store';
import { sanitizeStoreThemeForFirestore } from '@shared/utils/storeTheme';
import { prefetchImageUrls } from '@shared/utils/prefetchImages';
import { db, auth, uploadProductImageStorage, app, mahalakFunctions } from '@shared/lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocFromServer,
  onSnapshot as onDocSnapshot,
  writeBatch,
  increment,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  runTransaction,
} from 'firebase/firestore';
import { 
  onAuthStateChanged,
  signInAnonymously,
  signOut,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import {
  handleFirestoreError,
  OperationType,
  isFirestoreOfflineError,
  isFirestorePermissionDenied,
  safeGetDoc,
  safeOnSnapshot,
} from '@shared/lib/firestoreUtils';
import { STORES_PUBLIC_COLLECTION } from '@shared/lib/publicStore';

// Catalog listener caps — prevents loading the entire platform into memory.
// Raise these once pagination / infinite-scroll is added to the catalog.
const APP_STORES_LIMIT    = 500;
const APP_PRODUCTS_LIMIT  = 1000;
import {
  mergeStoreWithSecrets,
  upsertStoreSecretsPayout,
} from '@shared/lib/storeSecrets';
import { ensureStoreSessionForStorage, linkStoreToAuthSession, withStoreOwnerId } from '@shared/lib/storeAuth';
import { logoutOneSignalSession, resetPushNotificationSetup } from '@shared/lib/pushNotifications';
import {
  normalizePromoCode,
  PROMO_CODE_DEFAULTS,
} from '@shared/utils/promoCode';
import { getCallableErrorMessage } from '@shared/utils/firebaseErrors';
import { resolveLoyaltySettings, getTierPeriodStart, getEffectiveCustomerTierState, storeReviewRewardNotificationMessage } from '@shared/constants/loyaltySettings';

// ==========================================
// Interfaces
// ==========================================
import { 
  Province, 
  SubscriptionPlan, 
  Store, 
  Product, 
  Customer, 
  Order, 
  PromoCode, 
  RechargeCode, 
  AppNotification, 
  FlashSale, 
  FlashSaleRequest,
  StoreReview,
  PayoutRequest
} from '@shared/types';
import { IRAQ_PROVINCES, SUBSCRIPTION_PLANS } from '@shared/constants';
import { resolveAllSubscriptionPlans } from '@shared/constants/merchantRenewalPlans';
import { validateUserStatus } from '@shared/utils/userValidation';
import { normalizeIraqiPhone } from '@shared/utils/phone';
import {
  createCustomerWithUniquePhone,
  createStoreWithUniquePhoneAndUsername,
} from '@shared/lib/uniquenessRegistry';
import { createSavedLocation, parseCustomerAddress } from '@shared/utils/customerLocations';
import { formatCustomerSeqId } from '@shared/utils/customerId';

const generateOrderId = () => 'ORD-' + Math.floor(Math.random() * 1000000);

export interface AppContextType {
  provinces: Province[];
  stores: Store[];
  products: Product[];
  customers: Customer[];
  orders: Order[];
  promoCodes: PromoCode[];
  customerWalletPromos: PromoCode[];
  notifications: AppNotification[];
  payoutRequests: PayoutRequest[];
  currentCustomer: Customer | null;
  currentMerchant: Store | null;
  authLoading: boolean;
  authInitialized: boolean;
  adminSettings: any;
  subscriptionPlans: SubscriptionPlan[];
  flashSales: FlashSale[];
  flashSaleRequests: FlashSaleRequest[];
  storeReviews: StoreReview[];
  getCustomerSeqId: (id: string | undefined | null) => string;
  getOrderSeqId: (id: string | undefined | null) => string;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  setCurrentCustomer: (c: Customer | null) => void;
  setCurrentMerchant: (s: Store | null) => void;
  logoutSession: () => Promise<void>;
  deleteUserAccountSecure: (accountType: 'customer' | 'merchant') => Promise<void>;
  registerCustomer: (data: any) => Promise<Customer>;
  lookupCustomerByPhone: (phone: string) => Promise<Customer | null>;
  checkPhoneAvailable: (phone: string) => Promise<{ available: boolean; entityType?: string | null; blocked?: boolean }>;
  checkUsernameAvailable: (username: string, exceptStoreId?: string) => Promise<{ available: boolean }>;
  verifyCustomerLogin: (phone: string, password: string) => Promise<{ success: boolean; customer?: Customer; error?: string }>;
  verifyMerchantLogin: (payload: { phone?: string; username?: string; password: string }) => Promise<{ success: boolean; store?: Store; error?: string }>;
  linkCustomerAuthUid: (customerId: string, credentials?: { phone: string; password: string }) => Promise<string | null>;
  updateCustomerProfile: (data: Partial<Customer>) => Promise<void>;
  toggleFollowStore: (cid: string, sid: string) => void;
  toggleStoreNotification: (cid: string, sid: string) => void;
  placeOrder: (order: any, promoId?: string) => Promise<string>;
  convertPointsToPromo: (cid: string, points: number) => Promise<{ success: boolean; code?: string; message: string }>;
  addCustomerPoints: (cid: string, pts: number, reason?: 'share' | 'review' | 'promo') => void;
  submitStoreReview: (review: any) => Promise<void>;
  submitProductReview: (review: any) => Promise<void>;
  resetCustomerPasswordSecure: (phone: string, otpCode: string, newPassword: string) => Promise<{ success: boolean; customer?: Customer; error?: string }>;
  validatePromoCode: (payload: {
    code: string;
    customerId: string;
    storeIdsInCart: string[];
    customerProvince?: string;
    subtotal: number;
  }) => Promise<{ valid: boolean; code?: string; discount?: number; id?: string; message?: string }>;
  refreshCustomerWalletPromos: () => Promise<void>;
  updateStoreReview: (id: string, data: Partial<StoreReview>) => Promise<void>;
  deleteStoreReview: (id: string) => Promise<void>;
  registerMerchant: (data: any) => Promise<{ success: boolean; message: string } | undefined>;
  refreshStore: (storeId: string) => Promise<void>;
  subscribeToStore: (storeId: string, onUpdate: (store: Store) => void) => () => void;
  updateStoreProfile: (data: Partial<Store>) => Promise<void>;
  addProduct: (data: any) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string, mode?: string) => Promise<void>;
  createPromoCode: (promo: any) => Promise<void>;
  updatePromoCode: (id: string, data: Partial<PromoCode>) => Promise<void>;
  togglePromoCodeStatus: (id: string) => void;
  updateOrder: (id: string, data: Partial<Order>) => Promise<void>;
  updateOrderStatus: (id: string, status: string, reason?: string) => void;
  requestPayout: (amount: number, methodUsed: 'zain_cash' | 'mastercard', methodDetails: string) => Promise<void>;
  addNotification: (notif: any) => void;
  addBulkNotifications: (notifs: any[]) => Promise<void>;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: (userId: string, role: 'customer' | 'merchant') => void;
  redeemRechargeCode: (code: string, customerId: string) => Promise<number>;
  deletePromoCode: (id: string) => void;
  requestJoinFlashSale: (request: Omit<FlashSaleRequest, 'id'>) => Promise<void>;
  sendMerchantFollowerNotifications: (storeId: string, title: string, message: string, type?: string) => Promise<number>;
  refreshStoreAudience: () => Promise<void>;
  sendCustomerGift: (params: {
    customerId: string;
    giftType: 'promo' | 'product';
    discountType?: 'amount' | 'percent';
    discountValue?: number;
    expiryDays?: number;
    productId?: string;
  }) => Promise<{ promoCode?: string; productName?: string }>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Data States
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [customerWalletPromos, setCustomerWalletPromos] = useState<PromoCode[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [flashSaleRequests, setFlashSaleRequests] = useState<FlashSaleRequest[]>([]);
  const [storeReviews, setStoreReviews] = useState<StoreReview[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);

  // Auth States
  const [currentCustomer, setCurrentCustomerState] = useState<Customer | null>(null);
  const [currentMerchant, setCurrentMerchantState] = useState<Store | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  /** True after the first onAuthStateChanged callback (user may still be anonymous). */
  const [authInitialized, setAuthInitialized] = useState(false);
  /** Restore persisted customer/merchant only once on cold start — not after signOut. */
  const initialSessionRestoredRef = useRef(false);
  const explicitSignOutRef = useRef(false);

  const [adminSettings, setAdminSettings] = useState(() => StorageService.get('ADMIN_SETTINGS') || { 
    autoApproveStores: true,
    featuredStoreIds: [],
    enableAutoNearby: true,
    nearbyStoreIds: [],
    ads: [{ id: 'ad1', type: 'image', url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800', title: 'خصومات الشتاء', desc: 'احصل على خصم 50%', targetType: 'none', targetId: '' }],
    adInterval: 5,
    merchantAdInterval: 5,
    merchantAdsSectionOrder: ['delivery', 'media'],
    lastSyncTime: null,
    autoSubscriptionEnabled: true,
    autoSubscriptionDurationValue: 1,
    autoSubscriptionDurationUnit: 'months',
  });

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

  const tierResetAppliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentCustomer?.id) return;
    const loyalty = resolveLoyaltySettings(adminSettings);
    const state = getEffectiveCustomerTierState(currentCustomer, loyalty);
    if (!state.needsPersistReset) return;

    const resetKey = `${currentCustomer.id}:${state.lastResetMonth}`;
    if (tierResetAppliedRef.current === resetKey) return;
    tierResetAppliedRef.current = resetKey;

    updateDoc(doc(db, 'customers', currentCustomer.id), {
      monthlyOrdersCount: 0,
      tier: 'Silver',
      lastResetMonth: state.lastResetMonth,
    })
      .then(() => {
        setCurrentCustomerState({
          ...currentCustomer,
          monthlyOrdersCount: 0,
          tier: 'Silver',
          lastResetMonth: state.lastResetMonth,
        });
      })
      .catch((err) => {
        console.warn('[AppContext] tier period reset:', err);
        tierResetAppliedRef.current = null;
      });
  }, [
    currentCustomer?.id,
    currentCustomer?.lastResetMonth,
    currentCustomer?.monthlyOrdersCount,
    currentCustomer?.tier,
    adminSettings,
  ]);

  // Validate Connection to Firestore (Per Instructions)
  useEffect(() => {
    async function testConnection() {
      // Small delay for initial stability
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      try {
        // Fast fail: test connection
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error?.message?.includes("Database '(default)' not found")) {
           // Provide a hint to the user
        }
        
        if (error?.message?.includes('the client is offline')) {
        }
      }
    }
    testConnection();
  }, []);

  // Auth Observer — wait for Firebase persistence before restoring sessions
  useEffect(() => {
    let isMounted = true;
    const fallbackTimer = setTimeout(() => {
      if (isMounted) {
        setAuthInitialized(true);
        setAuthLoading(false);
      }
    }, 8000);

    const restorePersistedCustomer = async (
      user: NonNullable<typeof auth.currentUser>,
      suppressAuthErrors: boolean,
    ) => {
      const persistedCustId = StorageService.get('LOGGED_IN_CUSTOMER_ID');
      if (!persistedCustId) return;

      try {
        let custDoc = await safeGetDoc(doc(db, 'customers', persistedCustId), {
          suppressPermissionDenied: suppressAuthErrors,
        });
        if (!custDoc?.exists()) {
          const userDoc = await safeGetDoc(doc(db, 'users', persistedCustId), {
            suppressPermissionDenied: suppressAuthErrors,
          });
          if (userDoc?.exists()) custDoc = userDoc;
        }

        if (!custDoc?.exists()) return;

        const data = custDoc.data() as Customer;
        const validation = validateUserStatus(data, 'customer');
        if (!validation.valid) {
          StorageService.remove('LOGGED_IN_CUSTOMER_ID');
          setCurrentCustomerState(null);
          return;
        }

        const currentUid = user.uid;
        if (data.authUid && data.authUid !== currentUid) {
          // Keep stored session id — user may need to sign in again if Firebase issued a new uid.
          return;
        }

        setCurrentCustomerState({
          ...data,
          id: custDoc.id,
          authUid: currentUid,
        });
      } catch (e: unknown) {
        if (!isFirestorePermissionDenied(e) && !isFirestoreOfflineError(e)) {
          console.warn('[AppContext] restore customer session:', e);
        }
      }
    };

    const restorePersistedMerchant = async (
      user: NonNullable<typeof auth.currentUser>,
      suppressAuthErrors: boolean,
    ) => {
      const persistedMerchantId = StorageService.get('LOGGED_IN_MERCHANT_ID');
      if (!persistedMerchantId) return;

      try {
        const storeDoc = await safeGetDoc(doc(db, 'stores', persistedMerchantId), {
          suppressPermissionDenied: suppressAuthErrors,
        });
        if (!storeDoc?.exists()) return;

        const data = storeDoc.data() as Store;
        const validation = validateUserStatus(data, 'merchant');
        if (!validation.valid) {
          StorageService.remove('LOGGED_IN_MERCHANT_ID');
          setCurrentMerchantState(null);
          return;
        }

        const storeWithId = { ...data, id: storeDoc.id };
        if (data.ownerId === user.uid) {
          setCurrentMerchantState(storeWithId);
          return;
        }

        const linked = await linkStoreToAuthSession(storeWithId);
        if (linked) {
          setCurrentMerchantState(linked);
        }
      } catch (e: unknown) {
        if (!isFirestorePermissionDenied(e) && !isFirestoreOfflineError(e)) {
          console.warn('[AppContext] restore merchant session:', e);
        }
      }
    };

    const loadCustomerFromAuthUser = async (
      user: NonNullable<typeof auth.currentUser>,
      suppressAuthErrors: boolean,
    ) => {
      try {
        let custDoc = await safeGetDoc(doc(db, 'customers', user.uid), {
          suppressPermissionDenied: suppressAuthErrors,
        });
        if (!custDoc?.exists()) {
          const userDoc = await safeGetDoc(doc(db, 'users', user.uid), {
            suppressPermissionDenied: suppressAuthErrors,
          });
          if (userDoc?.exists()) {
            try {
              await setDoc(doc(db, 'customers', user.uid), userDoc.data());
            } catch {
              // ignore migration errors
            }
            custDoc = userDoc;
          }
        }
        if (!custDoc?.exists()) {
          try {
            const authUidSnap = await getDocs(
              query(collection(db, 'customers'), where('authUid', '==', user.uid), limit(1)),
            );
            if (!authUidSnap.empty) {
              custDoc = authUidSnap.docs[0];
            }
          } catch (e) {
            if (!isFirestorePermissionDenied(e)) throw e;
          }
        }

        if (custDoc?.exists()) {
          const data = custDoc.data() as Customer;
          const validation = validateUserStatus(data, 'customer');
          if (validation.valid) {
            setCurrentCustomerState({ ...data, id: custDoc.id });
          } else if (explicitSignOutRef.current) {
            setCurrentCustomerState(null);
            StorageService.remove('LOGGED_IN_CUSTOMER_ID');
          }
        }
      } catch (e: unknown) {
        if (!isFirestorePermissionDenied(e) && !isFirestoreOfflineError(e)) {
          console.warn('[AppContext] load customer from auth:', e);
        }
      }
    };

    const bootstrap = async () => {
      try {
        await auth.authStateReady();
      } catch {
        // ignore — onAuthStateChanged still runs
      }

      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch {
          // anonymous session is optional for some flows
        }
      }
    };

    void bootstrap();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(fallbackTimer);
      if (!isMounted) return;
      setAuthLoading(true);
      const suppressAuthErrors = true;

      if (user) {
        explicitSignOutRef.current = false;
        await loadCustomerFromAuthUser(user, suppressAuthErrors);

        if (!initialSessionRestoredRef.current) {
          initialSessionRestoredRef.current = true;
          await restorePersistedCustomer(user, suppressAuthErrors);
          await restorePersistedMerchant(user, suppressAuthErrors);
        }
      } else if (explicitSignOutRef.current) {
        setCurrentCustomerState(null);
        setCurrentMerchantState(null);
      }

      if (isMounted) {
        setAuthInitialized(true);
        setAuthLoading(false);
      }
    }, () => {
      clearTimeout(fallbackTimer);
      if (isMounted) {
        setAuthInitialized(true);
        setAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  const mapFirestoreDocs = <T,>(snap: { docs: Array<{ id: string; data: () => T }> }) =>
    Array.from(new Map(snap.docs.map(d => [d.id, { ...d.data(), id: d.id }])).values());

  // Public catalog listeners — stable across customer login/logout (customer + merchant apps).
  useEffect(() => {
    if (!authInitialized || authLoading || !auth.currentUser) {
      return;
    }

    const unsubs: Array<() => void> = [];
    const isStaffSession = !!currentMerchant?.id;
    let storesRaf = 0;
    let productsRaf = 0;

    const scheduleStores = (data: Store[]) => {
      prefetchImageUrls(data.slice(0, 20).map((s) => s.logo));
      cancelAnimationFrame(storesRaf);
      storesRaf = requestAnimationFrame(() => {
        setStores(data);
        setCurrentMerchantState((prev) => {
          if (!prev?.id) return prev;
          const fresh = data.find((s) => s.id === prev.id);
          if (!fresh) return prev;
          const merged = mergeStoreWithSecrets(fresh, {
            storeId: prev.id,
            walletBalance: prev.walletBalance,
            payoutMethods: prev.payoutMethods,
            mastercardNumber: prev.mastercardNumber,
            zainCashNumber: prev.zainCashNumber,
          });
          return {
            ...merged,
            dashboardTourCompletedAt:
              prev.dashboardTourCompletedAt ?? merged.dashboardTourCompletedAt,
            contractAgreedAt: prev.contractAgreedAt ?? merged.contractAgreedAt,
            terms_accepted: prev.terms_accepted ?? merged.terms_accepted,
            signed_at: prev.signed_at ?? merged.signed_at,
            ownerId: prev.ownerId ?? merged.ownerId,
          };
        });
      });
    };
    const scheduleProducts = (data: Product[]) => {
      prefetchImageUrls(data.slice(0, 24).map((p) => p.image));
      cancelAnimationFrame(productsRaf);
      productsRaf = requestAnimationFrame(() => setProducts(data));
    };

    const snapshotOpts = { suppressPermissionDenied: true as const };

    unsubs.push(safeOnSnapshot(
      query(collection(db, STORES_PUBLIC_COLLECTION), limit(APP_STORES_LIMIT)),
      (snap) => scheduleStores(mapFirestoreDocs<Store>(snap)),
      snapshotOpts,
    ));

    const productsQuery = isStaffSession
      ? query(collection(db, 'products'), limit(APP_PRODUCTS_LIMIT))
      : query(collection(db, 'products'), where('status', '==', 'published'), limit(APP_PRODUCTS_LIMIT));
    unsubs.push(safeOnSnapshot(productsQuery, (snap) => {
      scheduleProducts(mapFirestoreDocs<Product>(snap));
    }, snapshotOpts));

    unsubs.push(safeOnSnapshot(
      query(collection(db, 'flash_sales'), limit(100)),
      (snap) => setFlashSales(mapFirestoreDocs<FlashSale>(snap)),
      snapshotOpts,
    ));

    unsubs.push(safeOnSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAdminSettings(data);
        StorageService.save('ADMIN_SETTINGS', data);
      }
    }, snapshotOpts));

    unsubs.push(safeOnSnapshot(
      query(collection(db, 'store_reviews'), orderBy('createdAt', 'desc'), limit(500)),
      (snap) => setStoreReviews(mapFirestoreDocs<StoreReview>(snap)),
      snapshotOpts,
    ));

    return () => {
      cancelAnimationFrame(storesRaf);
      cancelAnimationFrame(productsRaf);
      unsubs.forEach((unsub) => unsub());
    };
  }, [authInitialized, authLoading, currentMerchant?.id]);

  // Session-scoped listeners (orders, notifications, merchant secrets, etc.)
  useEffect(() => {
    if (!authInitialized || authLoading || !auth.currentUser) {
      return;
    }

    const unsubs: Array<() => void> = [];
    const snapshotOpts = { suppressPermissionDenied: true as const };

    if (currentMerchant?.id) {
      const storeId = currentMerchant.id;
      unsubs.push(safeOnSnapshot(
        query(collection(db, 'promo_codes'), where('storeId', '==', storeId)),
        (snap) => setPromoCodes(mapFirestoreDocs<PromoCode>(snap)),
        snapshotOpts,
      ));
      unsubs.push(safeOnSnapshot(
        query(collection(db, 'orders'), where('storeId', '==', storeId), orderBy('createdAt', 'desc'), limit(400)),
        (snap) => setOrders(mapFirestoreDocs<Order>(snap)),
        snapshotOpts,
      ));
      unsubs.push(safeOnSnapshot(
        query(collection(db, 'notifications'), where('userId', '==', storeId), orderBy('createdAt', 'desc'), limit(100)),
        (snap) => setNotifications(mapFirestoreDocs<AppNotification>(snap)),
        snapshotOpts,
      ));
      unsubs.push(safeOnSnapshot(query(collection(db, 'flash_sale_requests'), where('storeId', '==', storeId)), (snap) => {
        setFlashSaleRequests(mapFirestoreDocs<FlashSaleRequest>(snap));
      }, snapshotOpts));
      unsubs.push(safeOnSnapshot(
        query(collection(db, 'payoutRequests'), where('merchantId', '==', storeId), orderBy('createdAt', 'desc'), limit(50)),
        (snap) => setPayoutRequests(mapFirestoreDocs<PayoutRequest>(snap)),
        snapshotOpts,
      ));
      unsubs.push(safeOnSnapshot(doc(db, 'stores', storeId), (snap) => {
        if (!snap.exists()) return;
        const privateStore = { ...(snap.data() as Store), id: snap.id };
        setCurrentMerchantState((prev) => {
          if (!prev || prev.id !== storeId) return prev;
          return mergeStoreWithSecrets(
            { ...prev, ...privateStore, id: storeId },
            {
              storeId,
              walletBalance: prev.walletBalance,
              payoutMethods: prev.payoutMethods,
            },
          );
        });
      }, snapshotOpts));
      unsubs.push(safeOnSnapshot(doc(db, 'store_secrets', storeId), (snap) => {
        const secrets = snap.exists()
          ? { ...(snap.data() as Record<string, unknown>), storeId: snap.id }
          : null;
        setCurrentMerchantState((prev) => {
          if (!prev || prev.id !== storeId) return prev;
          return mergeStoreWithSecrets(prev, secrets as Parameters<typeof mergeStoreWithSecrets>[1]);
        });
      }, snapshotOpts));
      unsubs.push(safeOnSnapshot(collection(db, 'store_audience', storeId, 'members'), (snap) => {
        setCustomers(
          snap.docs.map((memberDoc) => {
            const data = memberDoc.data() as Record<string, unknown>;
            return {
              id: memberDoc.id,
              name: String(data.name || ''),
              phone: String(data.phone || ''),
              province: String(data.province || ''),
              tier: (data.tier as Customer['tier']) || 'Silver',
              followedStores: data.followed ? [storeId] : [],
              storeNotifications: data.notifications ? [storeId] : [],
              points: 0,
              ordersCount: 0,
              monthlyOrdersCount: 0,
              isBlocked: false,
              joinedAt: '',
            } as Customer;
          }),
        );
      }, snapshotOpts));
    } else if (currentCustomer?.id) {
      const customerId = currentCustomer.id;
      unsubs.push(safeOnSnapshot(doc(db, 'customers', customerId), (snap) => {
        if (snap.exists()) {
          const data = { ...(snap.data() as Customer), id: snap.id };
          setCustomers([data]);
          setCurrentCustomerState(data);
        }
      }, snapshotOpts));
      unsubs.push(safeOnSnapshot(
        query(collection(db, 'orders'), where('customerId', '==', customerId), orderBy('createdAt', 'desc'), limit(200)),
        (snap) => setOrders(mapFirestoreDocs<Order>(snap)),
        snapshotOpts,
      ));
      unsubs.push(safeOnSnapshot(
        query(collection(db, 'notifications'), where('userId', '==', customerId), orderBy('createdAt', 'desc'), limit(50)),
        (snap) => setNotifications(mapFirestoreDocs<AppNotification>(snap)),
        snapshotOpts,
      ));
      setPromoCodes([]);
      setPayoutRequests([]);
      setFlashSaleRequests([]);
    } else {
      setPromoCodes([]);
      setCustomers([]);
      setOrders([]);
      setNotifications([]);
      setPayoutRequests([]);
      setFlashSaleRequests([]);
    }

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [authInitialized, authLoading, currentMerchant?.id, currentCustomer?.id]);

  useEffect(() => {
    if (!authInitialized || authLoading || !currentMerchant?.id) return;

    const fn = httpsCallable<{ storeId: string }, { customers: Customer[] }>(
      mahalakFunctions,
      'getStoreAudience',
    );
    fn({ storeId: currentMerchant.id }).catch((e) => {
      console.warn('[AppContext] getStoreAudience backfill:', e);
    });
  }, [authInitialized, authLoading, currentMerchant?.id]);

  const setCurrentCustomer = (c: Customer | null) => {
    setCurrentCustomerState(c);
    if (c) {
      StorageService.save('LOGGED_IN_CUSTOMER_ID', c.id);
    } else {
      StorageService.remove('LOGGED_IN_CUSTOMER_ID');
    }
  };

  const setCurrentMerchant = (s: Store | null) => {
    setCurrentMerchantState(s);
    if (s) {
      StorageService.save('LOGGED_IN_MERCHANT_ID', s.id);
    } else {
      StorageService.remove('LOGGED_IN_MERCHANT_ID');
    }
  };

  const logoutSession = useCallback(async () => {
    explicitSignOutRef.current = true;
    StorageService.remove('LOGGED_IN_CUSTOMER_ID');
    StorageService.remove('LOGGED_IN_MERCHANT_ID');
    setCurrentCustomerState(null);
    setCurrentMerchantState(null);
    StorageService.clearAll();
    resetPushNotificationSetup();
    await logoutOneSignalSession();
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    try {
      await signInAnonymously(auth);
    } catch {
      // ignore — anonymous session is optional for Firestore rules
    }
  }, []);

  const deleteUserAccountSecure = useCallback(async (accountType: 'customer' | 'merchant') => {
    const fn = httpsCallable<
      { accountType: 'customer' | 'merchant'; customerId?: string; storeId?: string },
      { success: boolean }
    >(mahalakFunctions, 'deleteUserAccountSecure');

    const payload =
      accountType === 'customer'
        ? { accountType, customerId: currentCustomer?.id || auth.currentUser?.uid }
        : { accountType, storeId: currentMerchant?.id };

    if (accountType === 'customer' && !payload.customerId) {
      throw new Error('لا يوجد حساب زبون مسجّل للحذف.');
    }
    if (accountType === 'merchant' && !payload.storeId) {
      throw new Error('لا يوجد حساب تاجر مسجّل للحذف.');
    }

    try {
      await fn(payload);
    } catch (e) {
      throw new Error(getCallableErrorMessage(e));
    }
    await logoutSession();
  }, [currentCustomer?.id, currentMerchant?.id, logoutSession]);

  const lookupCustomerByPhone = async (phone: string): Promise<Customer | null> => {
    try {
      const fn = httpsCallable<{ phone: string }, { exists?: boolean }>(
        mahalakFunctions,
        'lookupCustomerByPhone',
      );
      const result = await fn({ phone: normalizeIraqiPhone(phone) });
      const data = result.data;
      if (data && typeof data === 'object' && data.exists) {
        return { id: '__exists__', phone: normalizeIraqiPhone(phone), name: '' } as Customer;
      }
      return null;
    } catch (e) {
      console.warn('[AppContext] lookupCustomerByPhone:', e);
      return null;
    }
  };

  const checkPhoneAvailable = async (phone: string) => {
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      const fn = httpsCallable<
        { phone: string },
        { available: boolean; entityType?: string | null; blocked?: boolean }
      >(mahalakFunctions, 'checkPhoneAvailable');
      const result = await fn({ phone: normalizeIraqiPhone(phone) });
      return result.data ?? { available: true };
    } catch (e) {
      console.warn('[AppContext] checkPhoneAvailable:', e);
      return { available: true };
    }
  };

  const checkUsernameAvailable = async (username: string, exceptStoreId = '') => {
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      const fn = httpsCallable<
        { username: string; exceptStoreId?: string },
        { available: boolean }
      >(mahalakFunctions, 'checkUsernameAvailable');
      const result = await fn({ username: String(username).trim(), exceptStoreId });
      return result.data ?? { available: true };
    } catch (e) {
      console.warn('[AppContext] checkUsernameAvailable:', e);
      return { available: true };
    }
  };

  const verifyCustomerLogin = async (phone: string, password: string) => {
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      const fn = httpsCallable<
        { phone: string; password: string },
        { success: boolean; customer?: Customer; error?: string }
      >(mahalakFunctions, 'verifyCustomerLogin');
      const result = await fn({ phone: normalizeIraqiPhone(phone), password: password.trim() });
      return result.data ?? { success: false, error: 'unknown' };
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? '';
      console.warn('[AppContext] verifyCustomerLogin:', e);
      if (code === 'functions/not-found' || code === 'functions/unavailable' || code === 'functions/internal') {
        return { success: false, error: 'service_unavailable' };
      }
      if (code === 'functions/unauthenticated' || code === 'unauthenticated') {
        return { success: false, error: 'auth_required' };
      }
      return { success: false, error: 'network' };
    }
  };

  const verifyMerchantLogin = async (payload: { phone?: string; username?: string; password: string }) => {
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      const fn = httpsCallable<
        { phone?: string; username?: string; password: string },
        { success: boolean; store?: Store; error?: string }
      >(mahalakFunctions, 'verifyMerchantLogin');
      const result = await fn({
        ...payload,
        password: payload.password.trim(),
        phone: payload.phone ? normalizeIraqiPhone(payload.phone) : undefined,
      });
      return result.data ?? { success: false, error: 'unknown' };
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? '';
      const message = String((e as { message?: string })?.message ?? '');
      console.warn('[AppContext] verifyMerchantLogin:', e);
      if (code === 'functions/not-found' || code === 'functions/unavailable' || code === 'functions/internal') {
        return { success: false, error: 'service_unavailable' };
      }
      if (code === 'functions/unauthenticated' || code === 'unauthenticated') {
        return { success: false, error: 'auth_required' };
      }
      if (
        code === 'auth/operation-not-allowed' ||
        message.includes('auth/admin-restricted-operation')
      ) {
        return { success: false, error: 'auth_required' };
      }
      return { success: false, error: 'network' };
    }
  };

  const linkCustomerAuthUid = async (
    customerId: string,
    credentials?: { phone: string; password: string },
  ): Promise<string | null> => {
    if (!customerId) return null;
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      const uid = auth.currentUser?.uid;
      if (!uid) return null;

      // Skip redundant callable when session is already linked (e.g. after verifyCustomerLogin).
      const existing = await safeGetDoc(doc(db, 'customers', customerId), {
        suppressPermissionDenied: true,
      });
      if (existing?.exists() && existing.data()?.authUid === uid) {
        return uid;
      }

      if (!credentials?.phone || !credentials?.password) {
        return null;
      }

      const sync = httpsCallable<
        { customerId: string; phone?: string; password?: string },
        { success: boolean; authUid: string; customer?: Customer }
      >(mahalakFunctions, 'linkCustomerAuthUidSecure');
      const result = await sync({
        customerId,
        phone: credentials.phone,
        password: credentials.password,
      });
      return result.data?.authUid ?? uid;
    } catch (e) {
      console.warn('[AppContext] linkCustomerAuthUid:', e);
      return null;
    }
  };

  const registerCustomer = async (data: any) => {
    const normalizedPhone = normalizeIraqiPhone(data.phone || '');
    const phoneCheck = await checkPhoneAvailable(normalizedPhone);
    if (!phoneCheck.available) {
      if (phoneCheck.blocked || phoneCheck.entityType === 'blocked') {
        throw new Error('هذا الرقم محظور من قبل إدارة النظام. تواصل مع الدعم لرفع الحظر.');
      }
      if (phoneCheck.entityType === 'store') {
        throw new Error('رقم الهاتف مسجل مسبقاً كتاجر! لا يمكن استخدامه لإنشاء حساب زبون.');
      }
      throw new Error('رقم الهاتف مسجل مسبقاً! يرجى تسجيل الدخول أو استخدام رقم آخر.');
    }

    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    const id = auth.currentUser!.uid;

    const loyalty = resolveLoyaltySettings(adminSettings);

    const parsedAddress = parseCustomerAddress(data.address || '');
    const savedLocations = data.savedLocations ?? (
      data.lat != null && data.lng != null
        ? [createSavedLocation({
            label: 'البيت',
            lat: data.lat,
            lng: data.lng,
            province: data.province || parsedAddress.province || 'بغداد',
            area: parsedAddress.area,
            mahalla: parsedAddress.mahalla,
            zuqaq: parsedAddress.zuqaq,
            dar: parsedAddress.dar,
            landmark: parsedAddress.landmark,
            isDefault: true,
          })]
        : []
    );
    const defaultLocationId = data.defaultLocationId ?? savedLocations.find((loc: { isDefault?: boolean }) => loc.isDefault)?.id ?? savedLocations[0]?.id;

    const { password: signupPassword, lat, lng, ...customerFields } = data;
    const newCust: any = { 
      ...customerFields, 
      id,
      authUid: id,
      phone: normalizedPhone || data.phone,
      savedLocations,
      ...(lat != null ? { lat } : {}),
      ...(lng != null ? { lng } : {}),
      ...(defaultLocationId ? { defaultLocationId } : {}),
      points: loyalty.signupBonusPoints, 
      ordersCount: 0, 
      monthlyOrdersCount: 0,
      lastResetMonth: getTierPeriodStart(new Date(), loyalty.tierResetPeriodMonths),
      tier: 'Silver', 
      followedStores: [], 
      storeNotifications: [], 
      isBlocked: false,
      joinedAt: new Date().toISOString(),
      createdAt: serverTimestamp()
    };
    try {
      const customerRef = doc(db, 'customers', id);
      await createCustomerWithUniquePhone(customerRef, newCust, normalizedPhone);
      if (signupPassword) {
        const initPw = httpsCallable<{ customerId: string; password: string }, { success: boolean }>(
          mahalakFunctions,
          'initializeCustomerPassword',
        );
        await initPw({ customerId: id, password: String(signupPassword) });
      }
      return newCust;
    } catch (e) {
      if (e instanceof Error && !e.message.includes('Missing or insufficient permissions')) {
        throw e;
      }
      if (isFirestorePermissionDenied(e)) {
        throw new Error('تعذر إنشاء الحساب. تأكد من الاتصال وحاول مرة أخرى.');
      }
      handleFirestoreError(e, OperationType.CREATE, 'customers/' + id);
    }
  };

  const updateCustomerProfile = async (data: Partial<Customer>) => {
    const idToUpdate = data.id || currentCustomer?.id;
    if (!idToUpdate) return;
    const { password: _password, points: _points, authUid: _authUid, ...safeData } = data as Partial<Customer> & {
      password?: string;
    };
    try {
      await updateDoc(doc(db, 'customers', idToUpdate), {
        ...safeData,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'customers/' + idToUpdate);
    }
  };

  const resetCustomerPasswordSecure = async (phone: string, otpCode: string, newPassword: string) => {
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      const fn = httpsCallable<
        { phone: string; otpCode: string; newPassword: string },
        { success: boolean; customer?: Customer; error?: string }
      >(mahalakFunctions, 'resetCustomerPasswordSecure');
      const result = await fn({
        phone: normalizeIraqiPhone(phone),
        otpCode,
        newPassword,
      });
      return result.data ?? { success: false, error: 'unknown' };
    } catch (e) {
      console.warn('[AppContext] resetCustomerPasswordSecure:', e);
      return { success: false, error: getCallableErrorMessage(e) };
    }
  };

  const validatePromoCode = async (payload: {
    code: string;
    customerId: string;
    storeIdsInCart: string[];
    customerProvince?: string;
    subtotal: number;
  }) => {
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      const fn = httpsCallable<
        typeof payload,
        { valid: boolean; code?: string; discount?: number; id?: string; message?: string }
      >(mahalakFunctions, 'validatePromoCode');
      const result = await fn(payload);
      return result.data ?? { valid: false, message: 'تعذر التحقق من الكود' };
    } catch (e) {
      return { valid: false, message: getCallableErrorMessage(e) };
    }
  };

  const refreshCustomerWalletPromos = useCallback(async () => {
    if (!currentCustomer?.id) {
      setCustomerWalletPromos([]);
      return;
    }
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      const fn = httpsCallable<
        { customerId: string },
        { promos: PromoCode[] }
      >(mahalakFunctions, 'listCustomerWalletPromos');
      const result = await fn({ customerId: currentCustomer.id });
      setCustomerWalletPromos(result.data?.promos ?? []);
    } catch (e) {
      console.warn('[AppContext] refreshCustomerWalletPromos:', e);
      setCustomerWalletPromos([]);
    }
  }, [currentCustomer?.id]);

  const registerMerchant = async (data: any) => {
    const normalizedPhone = normalizeIraqiPhone(data.phone || '');
    const phoneCheck = await checkPhoneAvailable(normalizedPhone);
    if (!phoneCheck.available) {
      if (phoneCheck.blocked || phoneCheck.entityType === 'blocked') {
        return { success: false, message: 'هذا الرقم محظور من قبل إدارة النظام. تواصل مع الدعم لرفع الحظر.' };
      }
      if (phoneCheck.entityType === 'customer') {
        return { success: false, message: 'رقم الهاتف مسجل مسبقاً كزبون! لا يمكن استخدامه لإنشاء حساب تاجر.' };
      }
      return { success: false, message: 'رقم الهاتف مسجل مسبقاً كتاجر! لا يمكن إنشاء حساب جديد بنفس الرقم.' };
    }

    const usernameCheck = await checkUsernameAvailable(data.username);
    if (!usernameCheck.available) {
      return { success: false, message: 'اسم المستخدم مسجل مسبقاً من متجر آخر!' };
    }

    const { password: signupPassword, ...storeFields } = data;
    const id = 'store_' + Date.now();
    const autoApprove = adminSettings?.autoApproveStores !== false;
    const newStore = withStoreOwnerId({
      ...storeFields,
      phone: normalizedPhone,
      id,
      status: autoApprove ? 'active' : 'pending',
      subscriptionStatus: 'none',
      subscriptionExpiry: 'none',
      subscriptionExpiryDate: 'none',
      autoSubscriptionDisabled: false,
      rating: 5.0,
      createdAt: serverTimestamp(),
    });

    // Auto-subscription is applied server-side by onStoreCreated (Admin SDK).
    try {
      const storeRef = doc(db, 'stores', id);
      await createStoreWithUniquePhoneAndUsername(
        storeRef,
        newStore,
        normalizedPhone,
        String(data.username || ''),
      );
      if (signupPassword) {
        try {
          const initPw = httpsCallable<{ storeId: string; password: string }, { success: boolean }>(
            mahalakFunctions,
            'initializeStorePassword',
          );
          await initPw({ storeId: id, password: String(signupPassword) });
        } catch (pwErr) {
          console.warn('[AppContext] initializeStorePassword after signup:', pwErr);
        }
      }
      setCurrentMerchant(newStore);
      return { success: true, message: 'تم' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('رقم الهاتف') || msg.includes('اسم المستخدم')) {
        return { success: false, message: msg };
      }
      console.error('[AppContext] registerMerchant:', e);
      return { success: false, message: 'تعذر إنشاء المتجر. حاول مجدداً أو تواصل مع الدعم.' };
    }
  };

  /** Subscribes to a single stores_public document with a real-time listener.
   *  Fires immediately with current data, then on every server update.
   *  Returns an unsubscribe function. */
  const subscribeToStore = useCallback(
    (storeId: string, onUpdate: (store: Store) => void): (() => void) => {
      if (!storeId) return () => {};
      const ref = doc(db, STORES_PUBLIC_COLLECTION, storeId);
      const unsub = onDocSnapshot(
        ref,
        (snap) => {
          if (!snap.exists()) return;
          const fresh = { ...(snap.data() as Store), id: snap.id };
          setStores((prev) =>
            prev.some((s) => s.id === storeId)
              ? prev.map((s) => (s.id === storeId ? fresh : s))
              : [...prev, fresh],
          );
          onUpdate(fresh);
        },
        () => {/* permission errors suppressed */},
      );
      return unsub;
    },
    [],
  );

  /** Fetches a single stores_public document straight from the server (no cache),
   *  then patches the in-memory stores array so the UI reflects the latest theme. */
  const refreshStore = useCallback(async (storeId: string) => {
    if (!storeId) return;
    try {
      const snap = await getDocFromServer(doc(db, STORES_PUBLIC_COLLECTION, storeId));
      if (!snap.exists()) return;
      const fresh = { ...(snap.data() as Store), id: snap.id };
      setStores((prev) => prev.map((s) => (s.id === storeId ? fresh : s)));
    } catch {
      // silent — realtime listener will catch it eventually
    }
  }, []);

  const updateStoreProfile = async (data: Partial<Store>) => {
    const idToUpdate = data.id || currentMerchant?.id;
    if (!idToUpdate) return;

    const ownerId = auth.currentUser?.uid || currentMerchant?.ownerId || '';
    const { payoutMethods } = data as Partial<Store> & { password?: string };

    if (data.username && currentMerchant && data.username !== currentMerchant.username) {
      const usernameCheck = await checkUsernameAvailable(data.username, idToUpdate);
      if (!usernameCheck.available) {
         throw new Error("اسم المستخدم هذا مستخدم مسبقاً من قبل تاجر آخر.");
      }
      
      if (currentMerchant.lastUsernameChange) {
        const lastChangeDate = new Date(currentMerchant.lastUsernameChange);
        const diffTime = Math.abs(new Date().getTime() - lastChangeDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (diffDays < 30) {
           throw new Error(`لا يمكنك تغيير اسم المستخدم إلا مرة واحدة كل 30 يوم. آخر تغيير لك كان قبل ${diffDays} يوم.`);
        }
      }
      
      data.lastUsernameChange = new Date().toISOString();
    }

    try {
      if (payoutMethods) {
        await upsertStoreSecretsPayout(idToUpdate, ownerId, payoutMethods);
      }
      const storePatch: Partial<Store> = { ...data };
      delete (storePatch as Partial<Store> & { password?: string }).password;
      delete storePatch.walletBalance;
      delete storePatch.payoutMethods;
      delete storePatch.id;
      if (storePatch.storeTheme !== undefined) {
        storePatch.storeTheme = sanitizeStoreThemeForFirestore(storePatch.storeTheme);
      }
      // Eagerly update currentMerchant so the UI reflects changes immediately
      // (especially important when the user navigates away then comes back).
      if (currentMerchant?.id === idToUpdate) {
        setCurrentMerchantState((prev) => {
          if (!prev) return prev;
          const next = { ...prev, ...storePatch };
          if (payoutMethods) {
            return mergeStoreWithSecrets(next, { storeId: idToUpdate, payoutMethods });
          }
          return next;
        });
      } else if (payoutMethods) {
        setCurrentMerchantState((prev) =>
          prev ? mergeStoreWithSecrets(prev, { storeId: idToUpdate, payoutMethods }) : prev,
        );
      }

      if (Object.keys(storePatch).length > 0) {
        await updateDoc(doc(db, 'stores', idToUpdate), storePatch);
        setStores((prev) =>
          prev.map((s) => (s.id === idToUpdate ? { ...s, ...storePatch } : s)),
        );
        if (storePatch.storeTheme !== undefined) {
          try {
            await setDoc(
              doc(db, STORES_PUBLIC_COLLECTION, idToUpdate),
              { storeTheme: storePatch.storeTheme },
              { merge: true },
            );
          } catch {
            // Cloud Function may still sync stores → stores_public
          }
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'stores/' + idToUpdate);
    }
  };

  const addProduct = async (data: any) => {
    const finalPrice = data.discountType === 'percent' ? data.price - (data.price * (data.discountValue / 100)) : data.price - (data.discountValue || 0);
    // eslint-disable-next-line
    const id = 'prod_' + Date.now();
    
    let imageUrl = data.image;
    // Intercept base64 / data URL images and upload to Firebase Storage to prevent Firestore 1MB limits
    if (imageUrl && imageUrl.startsWith('data:image')) {
      const storeId = String(data.storeId ?? '');
      try {
        await ensureStoreSessionForStorage(storeId);
        imageUrl = await uploadProductImageStorage(imageUrl, id, storeId);
      } catch (uploadErr) {
        alert("فشل رفع الصورة إلى الخادم (Firebase Storage). يرجى التأكد من تفعيل Storage وقواعد الأمان (Storage Rules).");
        throw new Error("Storage Upload Failed: " + (uploadErr instanceof Error ? uploadErr.message : String(uploadErr)), { cause: uploadErr });
      }
    }

    const newProd = { ...data, id, image: imageUrl, finalPrice, createdAt: serverTimestamp() };
    try {
      await setDoc(doc(db, 'products', id), newProd);

      // We should send a notification to customers who enabled notifications for this store
      if (customers.length > 0) {
        const storeName = stores.find(s => s.id === data.storeId)?.shopName || 'متجر';
        const notifs = customers
          .filter(c => c.storeNotifications?.includes(data.storeId))
          .map(c => ({
            userId: c.id,
            role: 'customer',
            title: `منتج جديد من ${storeName} ✨`,
            message: `تمت إضافة منتج جديد: ${data.name}. سارع بالشراء الآن!`,
            type: 'product',
            targetId: id
          }));
        
        if (notifs.length > 0) addBulkNotifications(notifs);
      }

    } catch (e: any) {
      handleFirestoreError(e, OperationType.CREATE, 'products/' + id);
    }
  };

  const updateProduct = async (id: string, data: any) => {
    try {
      let imageUrl = data.image;
      const storeId = String(data.storeId ?? products.find((p) => p.id === id)?.storeId ?? '');
      // Intercept new base64 / data URL images on edit and upload to Firebase Storage
      if (imageUrl && imageUrl.startsWith('data:image')) {
        try {
          if (storeId) {
            await ensureStoreSessionForStorage(storeId);
          }
          imageUrl = await uploadProductImageStorage(imageUrl, id, storeId);
        } catch (uploadErr) {
          alert("فشل رفع الصورة إلى الخادم (Firebase Storage). يرجى تسجيل الدخول مرة أخرى إذا استمر الخطأ.");
          throw uploadErr;
        }
      }
      
      const updatedData = imageUrl ? { ...data, image: imageUrl } : data;
      await updateDoc(doc(db, 'products', id), updatedData);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'products/' + id);
    }
  };

  const deleteProduct = async (id: string, mode?: string) => {
    try {
      // mode can be used later if needed
      const pReqs = flashSaleRequests.filter(r => r.productId === id);
      for (const req of pReqs) {
        await deleteDoc(doc(db, 'flash_sale_requests', req.id));
      }
      await deleteDoc(doc(db, 'products', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'products/' + id);
    }
  };

  const placeOrder = async (data: Omit<Order, 'id' | 'status' | 'createdAt'>, promoCodeText?: string) => {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    if (!auth.currentUser) {
      throw new Error('يجب تسجيل الدخول أولاً.');
    }
    // linkCustomerAuthUid is intentionally omitted here: placeOrderSecure already
    // validates ownership via customerAuthOwnsId server-side, and the auth session
    // is linked during login (verifyCustomerLogin). Calling it here adds an extra
    // Firestore read on every order with no benefit.
    const fn = httpsCallable<
      Record<string, unknown>,
      { orderId: string; total: number; subtotal: number }
    >(mahalakFunctions, 'placeOrderSecure');
    const result = await fn({
      ...data,
      promoCode: promoCodeText || undefined,
    });
    const orderId = result.data?.orderId ?? '';
    if (!orderId) {
      throw new Error('تعذر إنشاء الطلب. حاول مرة أخرى.');
    }
    if (promoCodeText) {
      refreshCustomerWalletPromos().catch(() => undefined);
    }
    return orderId;
  };

  const createPromoCode = async (data: any) => {
    // eslint-disable-next-line
    const id = 'promo_' + Date.now();
    const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    const newPromo = {
      ...PROMO_CODE_DEFAULTS,
      ...cleanData,
      id,
      code: normalizePromoCode(String(cleanData.code ?? id)),
      createdAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'promo_codes', id), newPromo);
      
      // إشعار المتابعين بإطلاق بروموكود (تخطّي أكواد الهدايا المخصصة لزبون واحد)
      if (
        data.storeId
        && data.storeId !== 'ALL_STORES'
        && !data.ownerCustomerId
        && customers.length > 0
      ) {
        const storeName = stores.find(s => s.id === data.storeId)?.shopName || 'متجر';
        await sendMerchantFollowerNotifications(
          data.storeId,
          `Promo ${storeName}`,
          `Code: ${data.code}`,
          'promo',
        ).catch(() => undefined);
        const notifs = customers
          .filter(() => false)
          .map(c => ({
            userId: c.id,
            role: 'customer',
            title: `بروموكود جديد من ${storeName} 🎁`,
            message: `تم إطلاق كود خصم جديد: ${data.code}. استفد منه الآن!`,
            type: 'promo',
            targetId: id,
            sound: true
          }));
        if (notifs.length > 0) addBulkNotifications(notifs);
      } else if (data.storeId === 'ALL_STORES') {
        const notifs = [];
        
        // Notify customers
        for (const c of customers) {
          let shouldNotify = true;
          if (data.targetProvinces?.length > 0 && !data.targetProvinces.includes(c.province)) shouldNotify = false;
          if (shouldNotify) {
            notifs.push({
              userId: c.id,
              role: 'customer',
              title: `محلك 🎁`,
              message: `عرض جديد بمناسبة العيد أو الفعاليات الخاصة! كود الخصم: ${data.code}`,
              type: 'promo',
              targetId: id,
              sound: true
            });
          }
        }

        // Notify merchants
        for (const s of stores) {
          let shouldNotify = true;
          if (data.targetProvinces?.length > 0 && !data.targetProvinces.includes(s.province)) shouldNotify = false;
          if (data.targetStores?.length > 0 && !data.targetStores.includes(s.id)) shouldNotify = false;
          if (shouldNotify) {
            notifs.push({
              userId: s.id,
              role: 'merchant',
              title: `محلك 🎁`,
              message: `تم إطلاق كود خصم جديد لزيادة مبيعاتك! كود الخصم: ${data.code}`,
              type: 'system',
              targetId: id,
              sound: true
            });
          }
        }
        
        if (notifs.length > 0) addBulkNotifications(notifs);
      }

    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'promo_codes/' + id);
    }
  };

  const toggleFollowStore = async (cid: string, sid: string) => {
    const customer = customers.find(c => c.id === cid) ?? (currentCustomer?.id === cid ? currentCustomer : null);
    if (!customer) return;
    const currentFollowed = customer.followedStores || [];
    const isFollowing = currentFollowed.includes(sid);
    const updatedFollowedStores = isFollowing 
      ? currentFollowed.filter(id => id !== sid) 
      : [...currentFollowed, sid];
    
    // Optimistic UI update
    if (currentCustomer?.id === cid) {
      setCurrentCustomerState({ ...currentCustomer, followedStores: updatedFollowedStores });
    }
    setCustomers((prev) =>
      prev.map((c) => (c.id === cid ? { ...c, followedStores: updatedFollowedStores } : c)),
    );

    try {
      const fn = httpsCallable<
        { customerId: string; storeId: string; action: string },
        { followedStores: string[]; storeNotifications: string[] }
      >(mahalakFunctions, 'toggleStoreEngagement');
      const result = await fn({
        customerId: cid,
        storeId: sid,
        action: isFollowing ? 'unfollow' : 'follow',
      });
      const { followedStores: savedFollowed, storeNotifications: savedNotifs } = result.data;
      if (currentCustomer?.id === cid) {
        setCurrentCustomerState({
          ...currentCustomer,
          followedStores: savedFollowed,
          storeNotifications: savedNotifs,
        });
      }
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === cid
            ? { ...c, followedStores: savedFollowed, storeNotifications: savedNotifs }
            : c,
        ),
      );
    } catch (e) {
      console.warn('[AppContext] toggleFollowStore:', e);
      if (currentCustomer?.id === cid) {
        setCurrentCustomerState(currentCustomer);
      }
      setCustomers((prev) =>
        prev.map((c) => (c.id === cid ? { ...c, followedStores: currentFollowed } : c)),
      );
    }
  };

  const toggleStoreNotification = async (cid: string, sid: string) => {
    const customer = customers.find(c => c.id === cid) ?? (currentCustomer?.id === cid ? currentCustomer : null);
    if (!customer) return;
    const currentNotifs = customer.storeNotifications || [];
    const isSub = currentNotifs.includes(sid);
    const updatedNotifs = isSub 
      ? currentNotifs.filter(id => id !== sid) 
      : [...currentNotifs, sid];
    
    // Optimistic UI update
    if (currentCustomer?.id === cid) {
      setCurrentCustomerState({ ...currentCustomer, storeNotifications: updatedNotifs });
    }
    setCustomers((prev) =>
      prev.map((c) => (c.id === cid ? { ...c, storeNotifications: updatedNotifs } : c)),
    );

    try {
      const fn = httpsCallable<
        { customerId: string; storeId: string; action: string },
        { followedStores: string[]; storeNotifications: string[] }
      >(mahalakFunctions, 'toggleStoreEngagement');
      const result = await fn({
        customerId: cid,
        storeId: sid,
        action: isSub ? 'notify_off' : 'notify_on',
      });
      const { followedStores: savedFollowed, storeNotifications: savedNotifs } = result.data;
      if (currentCustomer?.id === cid) {
        setCurrentCustomerState({
          ...currentCustomer,
          followedStores: savedFollowed,
          storeNotifications: savedNotifs,
        });
      }
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === cid
            ? { ...c, followedStores: savedFollowed, storeNotifications: savedNotifs }
            : c,
        ),
      );
    } catch (e) {
      console.warn('[AppContext] toggleStoreNotification:', e);
      if (currentCustomer?.id === cid) {
        setCurrentCustomerState(currentCustomer);
      }
      setCustomers((prev) =>
        prev.map((c) => (c.id === cid ? { ...c, storeNotifications: currentNotifs } : c)),
      );
    }
  };

  const submitStoreReview = async (reviewData: any) => {
    const authUid = auth.currentUser?.uid;
    const storeId = String(reviewData?.storeId || '');
    if (!authUid || !storeId) {
      throw new Error('يجب تسجيل الدخول قبل إرسال التقييم.');
    }
    const id = `${storeId}_${authUid}`;
    const newReview = { ...reviewData, id, createdAt: new Date().toISOString(), isReadByAdmin: false };
    try {
      await setDoc(doc(db, 'store_reviews', id), newReview);
      
      // Send notification to the merchant
      await addNotification({
        userId: reviewData.storeId,
        role: 'merchant',
        title: 'تقييم جديد!',
        message: `حصلت على استعراض ${reviewData.rating} نجوم من ${reviewData.customerName}`,
        type: 'system',
      });
      
      // We could also recalculate the store's average rating here or on the backend
      const storeReviewsForStore = storeReviews.filter(r => r.storeId === reviewData.storeId);
      const allRatings = [...storeReviewsForStore.map(r => r.rating), reviewData.rating];
      if (allRatings.length > 0) {
        const averageRating = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
        await updateDoc(doc(db, 'stores', reviewData.storeId), { rating: averageRating });
      }

      // نقاط التقييم تُمنح تلقائياً عبر onStoreReviewCreated Cloud Function
      if (reviewData.customerId) {
        await addNotification({
          userId: reviewData.customerId,
          role: 'customer',
          type: 'system',
          title: '🎁 شكرًا على التقييم!',
          message: storeReviewRewardNotificationMessage(resolveLoyaltySettings(adminSettings)),
          sound: true
        });
      }

    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'store_reviews/' + id);
    }
  };

  const submitProductReview = async (reviewData: {
    productId: string;
    storeId: string;
    customerId: string;
    customerName: string;
    rating: number;
    message?: string;
  }) => {
    const id = `prev_${Date.now()}`;
    const newReview = {
      ...reviewData,
      id,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'product_reviews', id), newReview);
      await addNotification({
        userId: reviewData.storeId,
        role: 'merchant',
        title: 'تقييم منتج جديد',
        message: `تقييم ${reviewData.rating} نجوم على ${reviewData.productId}`,
        type: 'system',
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'product_reviews/' + id);
    }
  };

  const updateStoreReview = async (id: string, data: Partial<StoreReview>) => {
    try {
      await updateDoc(doc(db, 'store_reviews', id), data);
      
      // If rating was changed, recalculate the store's average rating
      const review = storeReviews.find(r => r.id === id);
      if (review && data.rating !== undefined) {
        const storeId = review.storeId;
        const otherReviews = storeReviews.filter(r => r.storeId === storeId && r.id !== id);
        const allRatings = [...otherReviews.map(r => r.rating), data.rating];
        const averageRating = allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;
        await updateDoc(doc(db, 'stores', storeId), { rating: averageRating });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'store_reviews/' + id);
    }
  };

  const deleteStoreReview = async (id: string) => {
    try {
      const review = storeReviews.find(r => r.id === id);
      await deleteDoc(doc(db, 'store_reviews', id));
      
      // Recalculate store's average rating without this deleted review
      if (review) {
        const storeId = review.storeId;
        const remainingReviews = storeReviews.filter(r => r.storeId === storeId && r.id !== id);
        const averageRating = remainingReviews.length > 0 ? remainingReviews.reduce((a, b) => a + b, 0) / remainingReviews.length : 0;
        await updateDoc(doc(db, 'stores', storeId), { rating: averageRating });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'store_reviews/' + id);
    }
  };

  const addNotification = async (data: any) => {
    const id = 'notif_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
    const soundEnabled = data.sound !== undefined ? data.sound : true;
    const n = {
      ...data,
      id,
      read: false,
      sound: soundEnabled,
      createdAt: serverTimestamp(),
      ...(currentMerchant?.id && data.userId !== currentMerchant.id
        ? { senderStoreId: currentMerchant.id }
        : {}),
    };
    try {
      await setDoc(doc(db, 'notifications', id), n);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'notifications/' + id);
    }
  };

  const addBulkNotifications = async (notifications: any[]) => {
    try {
      const batches = [];
      let batch = writeBatch(db);
      let count = 0;

      for (const data of notifications) {
        const id = 'notif_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
        const soundEnabled = data.sound !== undefined ? data.sound : true;
        const n = {
          ...data,
          id,
          read: false,
          sound: soundEnabled,
          createdAt: serverTimestamp(),
          ...(currentMerchant?.id && data.userId !== currentMerchant.id
            ? { senderStoreId: currentMerchant.id }
            : {}),
        };
        
        batch.set(doc(db, 'notifications', id), n);
        count++;

        if (count >= 400) {
          batches.push(batch);
          batch = writeBatch(db);
          count = 0;
        }
      }
      
      if (count > 0) {
        batches.push(batch);
      }

      for (const b of batches) {
        await b.commit();
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (e) {
    }
  };

  const updateOrder = async (id: string, data: Partial<Order>) => {
    try {
      await updateDoc(doc(db, 'orders', id), data);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'orders/' + id);
    }
  };

  const updateOrderStatus = async (id: string, status: string, reason?: string) => {
    try {
      const orderRef = doc(db, 'orders', id);
      const order = orders.find(o => o.id === id);
      if (status === 'delivered' && order?.status === 'delivered') {
        return;
      }

      const updateData: Record<string, unknown> = {
        status,
        updatedAt: serverTimestamp(),
      };
      if (status === 'rejected') updateData.rejectionReason = reason;
      if (status === 'returned' || status === 'replaced') updateData.returnReason = reason;

      // Loyalty points and wallet credits are handled exclusively by the
      // onOrderDelivered Cloud Function trigger — never from the client.
      // This prevents the double-award race between client transaction and CF.
      await updateDoc(orderRef, updateData);

      if (order?.customerId) {
        let statusText = status;
        let pSound = true;
        if (status === 'accepted') { statusText = 'تم قبول طلبك بنجاح'; pSound = true; }
        if (status === 'preparing') { statusText = 'طلبك قيد التجهيز'; pSound = false; }
        if (status === 'shipped') { statusText = 'طلبك في الطريق إليك ومندوب التوصيل في طريقه'; pSound = false; }
        if (status === 'delivered') { statusText = 'تم توصيل طلبك بنجاح. شكراً لك!'; pSound = true; }
        if (status === 'rejected') { statusText = `تم رفض الطلب: ${reason || ''}`; pSound = true; }
        if (status === 'returned') { statusText = `تم إرجاع الطلب: ${reason || ''}`; pSound = true; }
        if (status === 'replaced') { statusText = `تم استبدال الطلب: ${reason || ''}`; pSound = true; }

        await addNotification({
          userId: order.customerId,
          role: 'customer',
          type: 'order',
          title: 'تحديث حالة الطلب',
          message: `طلب رقم ${id}: ${statusText}`,
          targetId: id,
          sound: pSound
        });
      }
    } catch (e: unknown) {
      handleFirestoreError(e, OperationType.UPDATE, 'orders/' + id);
    }
  };

  const requestPayout = async (amount: number, methodUsed: 'zain_cash' | 'mastercard', methodDetails: string) => {
    if (!currentMerchant) return;
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('المبلغ المطلوب غير صالح');
    }
    try {
      const merchantId = currentMerchant.id;
      const pId = 'PAY-' + Math.floor(Math.random() * 1000000);

      await runTransaction(db, async (transaction) => {
        // Read current wallet balance inside the transaction to prevent
        // concurrent over-withdrawal before the admin completes any request.
        const secretsSnap = await transaction.get(doc(db, 'store_secrets', merchantId));
        const currentBalance: number =
          (secretsSnap.data() as { walletBalance?: number } | undefined)?.walletBalance ?? 0;
        if (amount > currentBalance) {
          throw new Error(
            `رصيدك الحالي (${currentBalance.toLocaleString()} د.ع) أقل من المبلغ المطلوب`,
          );
        }
        const req: PayoutRequest = {
          id: pId,
          merchantId,
          requestedAmount: amount,
          payoutMethodUsed: methodUsed,
          payoutMethodDetails: methodDetails,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        transaction.set(doc(db, 'payoutRequests', pId), req);
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'payoutRequests');
    }
  };

  const updatePromoCode = async (id: string, data: Partial<PromoCode>) => {
    try {
      const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
      await updateDoc(doc(db, 'promo_codes', id), cleanData);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'promo_codes/' + id);
    }
  };

  const togglePromoCodeStatus = async (id: string) => {
    const p = promoCodes.find(x => x.id === id);
    if (!p) return;
    const newStatus = p.status === 'active' ? 'expired' : 'active';
    try {
      await updateDoc(doc(db, 'promo_codes', id), { status: newStatus });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'promo_codes/' + id);
    }
  };

  const redeemRechargeCode = async (codeStr: string, customerId: string) => {
    try {
      const fn = httpsCallable<{ code: string; customerId: string }, { points: number }>(
        mahalakFunctions,
        'redeemRechargeCode',
      );
      const result = await fn({ code: codeStr, customerId });
      return result.data?.points ?? 0;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'redeem_recharge');
      throw e;
    }
  };

  const convertPointsToPromo = async (cid: string, pointsRequired: number) => {
    const customer = customers.find(c => c.id === cid) ?? (currentCustomer?.id === cid ? currentCustomer : null);
    if (!customer || customer.points < pointsRequired) return { success: false, message: 'عذراً، نقاطك غير كافية ❌' };

    try {
      const fn = httpsCallable<
        { customerId: string; pointsRequired: number },
        { success: boolean; code?: string; discount?: number }
      >(mahalakFunctions, 'convertPointsToPromoSecure');
      const result = await fn({ customerId: cid, pointsRequired });
      const data = result.data;
      if (!data?.success || !data.code) {
        return { success: false, message: 'عذراً، حدث خطأ ما' };
      }

      // Optimistic: deduct points locally so UI reflects immediately
      if (currentCustomer?.id === cid) {
        setCurrentCustomerState({
          ...currentCustomer,
          points: Math.max(0, currentCustomer.points - pointsRequired),
        });
      }

      // Optimistic: inject the new promo into local state immediately
      // so the customer sees the coupon without a second cloud-function round-trip.
      const optimisticPromo: PromoCode = {
        id: `promo_optimistic_${Date.now()}`,
        storeId: 'ALL_STORES',
        code: data.code,
        discountType: 'amount',
        discountValue: data.discount ?? 0,
        maxUses: 1,
        usedCount: 0,
        status: 'active',
        source: 'points',
        ownerCustomerId: cid,
        createdAt: new Date().toISOString(),
      } as PromoCode;
      setCustomerWalletPromos(prev => {
        const withoutDupes = prev.filter(p => p.code !== data.code);
        return [optimisticPromo, ...withoutDupes];
      });

      // Refresh in background to get the real Firestore document
      refreshCustomerWalletPromos().catch(() => undefined);

      return { success: true, message: 'تم التحويل بنجاح ✅', code: data.code };
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'convert_points');
      return { success: false, message: 'عذراً، حدث خطأ ما' };
    }
  };

  const addCustomerPoints = async (cid: string, pts: number, reason: 'share' | 'review' | 'promo' = 'share') => {
    try {
      const fn = httpsCallable<
        { customerId: string; points: number; reason: string },
        { pointsAwarded: number }
      >(mahalakFunctions, 'awardCustomerPoints');
      const result = await fn({ customerId: cid, points: pts, reason });
      const awarded = result.data?.pointsAwarded ?? pts;
      if (currentCustomer?.id === cid) {
        setCurrentCustomerState({ ...currentCustomer, points: currentCustomer.points + awarded });
      }
    } catch (e) {
      const code =
        e && typeof e === 'object' && 'code' in e
          ? String((e as { code?: string }).code)
          : '';
      if (code === 'functions/resource-exhausted') return;
      console.warn('[AppContext] addCustomerPoints:', e);
    }
  };

  const sendMerchantFollowerNotifications = async (
    storeId: string,
    title: string,
    message: string,
    type = 'promo',
  ) => {
    try {
      const fn = httpsCallable<
        { storeId: string; title: string; message: string; type?: string },
        { sent: number }
      >(mahalakFunctions, 'sendMerchantFollowerNotifications');
      const result = await fn({ storeId, title, message, type });
      await refreshStoreAudience();
      return result.data?.sent ?? 0;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'follower_notifications');
      return 0;
    }
  };

  const refreshStoreAudience = useCallback(async () => {
    const storeId = currentMerchant?.id;
    if (!storeId || !auth.currentUser) return;
    try {
      const fn = httpsCallable<{ storeId: string }, { customers: Customer[] }>(
        mahalakFunctions,
        'getStoreAudience',
      );
      const result = await fn({ storeId });
      setCustomers(result.data?.customers ?? []);
    } catch (e) {
      console.warn('[AppContext] refreshStoreAudience:', e);
    }
  }, [currentMerchant?.id]);

  const sendCustomerGift = async (params: {
    customerId: string;
    giftType: 'promo' | 'product';
    discountType?: 'amount' | 'percent';
    discountValue?: number;
    expiryDays?: number;
    productId?: string;
  }) => {
    const storeId = currentMerchant?.id;
    if (!storeId) {
      throw new Error('يجب تسجيل الدخول كتاجر لإرسال الهدية.');
    }
    const fn = httpsCallable<
      {
        storeId: string;
        customerId: string;
        giftType: string;
        discountType?: string;
        discountValue?: number;
        expiryDays?: number;
        productId?: string;
      },
      { success: boolean; promoCode?: string; productName?: string }
    >(mahalakFunctions, 'sendMerchantCustomerGift');
    const result = await fn({
      storeId,
      customerId: params.customerId,
      giftType: params.giftType,
      discountType: params.discountType,
      discountValue: params.discountValue,
      expiryDays: params.expiryDays,
      productId: params.productId,
    });
    return {
      promoCode: result.data?.promoCode,
      productName: result.data?.productName,
    };
  };

  const markNotificationAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n))
      );
      handleFirestoreError(e, OperationType.UPDATE, 'notifications/' + id);
    }
  };

  const markAllNotificationsAsRead = async (userId: string, role: string) => {
    const unread = notifications.filter(n => n.userId === userId && n.role === role && !n.read);
    if (unread.length === 0) return;

    setNotifications((prev) =>
      prev.map((n) =>
        n.userId === userId && n.role === role && !n.read ? { ...n, read: true } : n
      )
    );

    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    try {
      await batch.commit();
    } catch (e) {
      setNotifications((prev) =>
        prev.map((n) => {
          const wasUnread = unread.some((u) => u.id === n.id);
          return wasUnread ? { ...n, read: false } : n;
        })
      );
      handleFirestoreError(e, OperationType.WRITE, 'mark_all_read');
    }
  };

  const deletePromoCode = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'promo_codes', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'promo_codes/' + id);
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

 const getCustomerSeqId = useCallback((id: string | undefined | null) => {
    if (!id) return '';
    const customer = customers.find((c) => c.id === id);
    if (customer?.customerNumber != null && customer.customerNumber > 0) {
      return formatCustomerSeqId(customer.customerNumber);
    }
    const sorted = [...customers].sort((a, b) => {
      const getVal = (cust: Customer) => {
        if (cust.joinedAt) return new Date(cust.joinedAt).getTime();
        if ((cust as any).createdAt) {
          const timestamp = (cust as any).createdAt;
          if (timestamp && typeof timestamp.toMillis === 'function') {
            return timestamp.toMillis();
          }
          if (timestamp && typeof timestamp.seconds === 'number') {
            return timestamp.seconds * 1000;
          }
          return new Date(timestamp).getTime();
        }
        if (cust.id.startsWith('cust_')) {
          const num = parseInt(cust.id.substring(5));
          if (!isNaN(num)) return num;
        }
        return 0;
      };
      const valA = getVal(a);
      const valB = getVal(b);
      if (valA !== valB) return valA - valB;
      return a.id.localeCompare(b.id);
    });
    const index = sorted.findIndex(c => c.id === id);
    return index !== -1 ? formatCustomerSeqId(index + 1) : '';
  }, [customers]);

  const getOrderSeqId = useCallback((id: string | undefined | null) => {
    if (!id) return '';
    const sorted = [...orders].sort((a, b) => {
      const getVal = (order: Order) => {
        if (order.createdAt) {
          const timestamp = (order as any).createdAt;
          if (timestamp && typeof timestamp.toMillis === 'function') {
            return timestamp.toMillis();
          }
          if (timestamp && typeof timestamp.seconds === 'number') {
            return timestamp.seconds * 1000;
          }
          return new Date(timestamp).getTime();
        }
        return 0;
      };
      const valA = getVal(a);
      const valB = getVal(b);
      if (valA !== valB) return valA - valB;
      return a.id.localeCompare(b.id);
    });
    const index = sorted.findIndex(o => o.id === id);
    return index !== -1 ? String(index + 1) : '';
  }, [orders]);

  // Auto-restore logic for persistency without Firebase Auth login
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const persistedCustId = StorageService.get('LOGGED_IN_CUSTOMER_ID');
    if (!currentCustomer && !persistedCustId) return;
    const targetId = currentCustomer ? currentCustomer.id : persistedCustId;
    if (targetId && customers.length > 0) {
      const found = customers.find(c => c.id === targetId);
      if (found && !found.isBlocked) {
        setCurrentCustomerState(found);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const persistedMerchantId = StorageService.get('LOGGED_IN_MERCHANT_ID');
    if (!currentMerchant && !persistedMerchantId) return;
    const targetId = currentMerchant ? currentMerchant.id : persistedMerchantId;
    if (!targetId || stores.length === 0) return;
    const found = stores.find(s => s.id === targetId);
    if (!found || found.status === 'suspended') return;
    if (found.ownerId === uid) {
      if (!currentMerchant || currentMerchant.id !== found.id || currentMerchant.ownerId !== uid) {
        setCurrentMerchantState({ ...found, ownerId: uid });
      }
      return;
    }
    void linkStoreToAuthSession(found).then((linked) => {
      if (linked) {
        setCurrentMerchantState(linked);
      } else if (!currentMerchant) {
        setCurrentMerchantState(found);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores]);

  const checkAndTriggerSubscriptionExpiryAlerts = async () => {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      for (const store of stores) {
        if (!isStoreSubscriptionActive(store)) continue;
        if (!store.subscriptionExpiry || store.subscriptionExpiry === 'none' || store.subscriptionExpiry === 'Lifetime') {
          continue;
        }

        try {
          const exprDate = new Date(store.subscriptionExpiry);
          exprDate.setHours(0, 0, 0, 0);

          const diffTime = exprDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 7 || diffDays === 2 || diffDays === 1) {
            const hasExisting = notifications.some(
              n => n.userId === store.id && 
                   n.role === 'merchant' && 
                   n.type === 'subscription' && 
                   n.objectId === store.subscriptionExpiry && 
                   n.targetId === String(diffDays)
            );

            if (!hasExisting) {
              const id = 'sub_alert_' + store.id + '_' + diffDays + '_' + store.subscriptionExpiry.replace(/[^0-9]/g, '');
              let message = '';
              let title = '';

              if (diffDays === 7) {
                title = '⚠️ اقتراب انتهاء الاشتراك (7 أيام)';
                message = 'مرحباً ' + store.ownerName + '، ينتهي اشتراك متجرك المميز "' + store.shopName + '" خلال 7 أيام بتاريخ ' + store.subscriptionExpiry + '. يرجى التجديد الآن لضمان بقاء المتجر مفعلاً واستمرار تلقي الطلبات.';
              } else if (diffDays === 2) {
                title = '🚨 تنبيه هام: يومين فقط لانتهاء الاشتراك!';
                message = 'عزيزي التاجر، اشتراكك سينتهي بعد 48 ساعة فقط (' + store.subscriptionExpiry + '). لم يتلقى المتجر أي تجديد بعد. يرجى تجديد اشتراكك فوراً تلافياً لتعليق المتجر أو إخفاء منتجاتك عن زبائنك.';
              } else if (diffDays === 1) {
                title = '🔥 تنبيه حرج جداً: اشتراكك ينتهي غداً!';
                message = 'انتباه! غداً سيتم وقف اشتراك متجر "' + store.shopName + '" تلقائياً. الموعد النهائي هو ' + store.subscriptionExpiry + '. يرجى تجديد الباقة فوراً لمنع تعليق المتجر.';
              }

              const n = {
                id,
                userId: store.id,
                role: 'merchant' as const,
                title,
                message,
                read: false,
                createdAt: new Date().toISOString(),
                type: 'subscription' as const,
                targetId: String(diffDays),
                objectId: store.subscriptionExpiry
              };

              await setDoc(doc(db, 'notifications', id), n);
            }
          }
        } catch (err) {
        }
      }
    } catch (e) {
    }
  };

  useEffect(() => {
    if (currentMerchant && stores.length > 0) {
      checkAndTriggerSubscriptionExpiryAlerts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores.length, notifications.length, currentMerchant]);

  useEffect(() => {
    if (!authInitialized || authLoading || !auth.currentUser || !currentCustomer?.id) {
      setCustomerWalletPromos([]);
      return;
    }
    refreshCustomerWalletPromos();
  }, [authInitialized, authLoading, currentCustomer?.id, refreshCustomerWalletPromos]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const contextValue = useMemo(() => ({
      provinces: IRAQ_PROVINCES, stores, products, customers, orders, promoCodes, customerWalletPromos, notifications, payoutRequests,
      currentCustomer, currentMerchant, authLoading, authInitialized, adminSettings, subscriptionPlans, flashSales, flashSaleRequests, storeReviews,
      getCustomerSeqId, getOrderSeqId,
      setOrders,
      setCurrentCustomer, setCurrentMerchant, logoutSession, deleteUserAccountSecure,
      registerCustomer, lookupCustomerByPhone, checkPhoneAvailable, checkUsernameAvailable, verifyCustomerLogin, verifyMerchantLogin, linkCustomerAuthUid, updateCustomerProfile, resetCustomerPasswordSecure,
      validatePromoCode, refreshCustomerWalletPromos,
      toggleFollowStore, toggleStoreNotification, placeOrder, convertPointsToPromo, addCustomerPoints,
      submitStoreReview, submitProductReview, updateStoreReview, deleteStoreReview,
      registerMerchant, refreshStore, subscribeToStore, updateStoreProfile, addProduct, updateProduct, deleteProduct,
      createPromoCode, updatePromoCode, togglePromoCodeStatus, updateOrder, updateOrderStatus, requestPayout,
      addNotification, addBulkNotifications, markNotificationAsRead, markAllNotificationsAsRead,
      redeemRechargeCode, deletePromoCode, requestJoinFlashSale, sendMerchantFollowerNotifications,
      refreshStoreAudience, sendCustomerGift,
    }), [
      stores, products, customers, orders, promoCodes, customerWalletPromos, notifications, payoutRequests,
      currentCustomer, currentMerchant, authLoading, authInitialized, adminSettings, flashSales, flashSaleRequests, storeReviews,
      refreshStoreAudience,
    ]);

  return (
    <AppContext.Provider value={contextValue}>
      {!authLoading ? children : (
        <div className="fixed inset-0 w-full h-full z-50 flex flex-col items-center justify-center bg-[#0B1320]">
          {/* Subtle brand ambient blobs */}
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
            <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
              {/* Brand-purple spinner ring */}
              <motion.div
                className="absolute inset-0 rounded-[2rem] border-[3px] border-white/5 border-t-[#7B3DFF]"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              />
              <img
                src="/mahalak-logo.png"
                alt="محلك"
                className="w-20 h-20 object-contain rounded-2xl shadow-[0_0_40px_rgba(123,61,255,0.3)]"
              />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center"
            >
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-l from-[#7B3DFF] to-[#B18CFF] mb-3 tracking-tight">
                محلك
              </h2>
              <div className="text-gray-200 font-bold text-sm flex items-center justify-center gap-1">
                <span>جاري إعداد النظام</span>
                <span className="flex text-[#B18CFF]">
                  <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}>.</motion.span>
                  <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}>.</motion.span>
                  <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}>.</motion.span>
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AppContext.Provider>
  );
};
