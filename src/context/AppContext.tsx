/* eslint-disable react-hooks/purity */
import React, { createContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { StorageService } from '../services/storageService';
import { db, auth, uploadProductImageStorage, app } from '../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocFromServer,
  writeBatch,
  increment,
  serverTimestamp,
  runTransaction,
  query,
  where,
  getDocs,
  limit
} from 'firebase/firestore';
import { 
  onAuthStateChanged,
  signInAnonymously
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  handleFirestoreError,
  OperationType,
  isFirestorePermissionDenied,
  safeGetDoc,
  safeOnSnapshot,
} from '../lib/firestoreUtils';
import { sendExternalPush } from '../lib/pushNotifications';

function resolvePushChannelId(data: {
  title?: string;
  type?: string;
  role?: string;
  sound?: boolean;
}): string {
  const soundEnabled = data.sound !== false;
  const isFromAdmin =
    data.title?.includes('محلك') || !data.type || data.title?.includes('تحديث حالة المتجر');

  if (isFromAdmin) return 'admin_broadcasts_sound';

  if (data.role === 'customer') {
    if (data.type === 'order') {
      return soundEnabled ? 'customer_order_updates_sound' : 'customer_order_updates_silent';
    }
    if (data.type === 'promo') return 'customer_promos_sound';
    if (data.type === 'product') return 'customer_products_sound';
    if (data.type === 'system' && data.title?.includes('شحن محفظة نقاطك')) {
      return 'customer_promos_sound';
    }
    return soundEnabled ? 'customer_order_updates_sound' : 'customer_order_updates_silent';
  }

  if (data.role === 'merchant') {
    if (data.type === 'order') return 'merchant_orders_sound';
    if (data.type === 'activity' || data.type === 'system') {
      return soundEnabled ? 'merchant_orders_sound' : 'merchant_activity_silent';
    }
    if (data.type === 'social') return 'merchant_social_silent';
    return soundEnabled ? 'merchant_orders_sound' : 'merchant_activity_silent';
  }

  return 'admin_broadcasts_sound';
}

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
} from '../types';
import { IRAQ_PROVINCES, SUBSCRIPTION_PLANS } from '../constants';
import { validateUserStatus } from '../utils/userValidation';
import { normalizeIraqiPhone } from '../utils/phone';

const generateOrderId = () => 'ORD-' + Math.floor(Math.random() * 1000000);

export interface AppContextType {
  provinces: Province[];
  stores: Store[];
  products: Product[];
  customers: Customer[];
  orders: Order[];
  promoCodes: PromoCode[];
  notifications: AppNotification[];
  payoutRequests: PayoutRequest[];
  currentCustomer: Customer | null;
  currentMerchant: Store | null;
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
  registerCustomer: (data: any) => Promise<Customer>;
  lookupCustomerByPhone: (phone: string) => Promise<Customer | null>;
  linkCustomerAuthUid: (customerId: string) => Promise<string | null>;
  updateCustomerProfile: (data: Partial<Customer>) => Promise<void>;
  toggleFollowStore: (cid: string, sid: string) => void;
  toggleStoreNotification: (cid: string, sid: string) => void;
  placeOrder: (order: any, promoId?: string) => Promise<string>;
  convertPointsToPromo: (cid: string, points: number) => Promise<{ success: boolean; code?: string; message: string }>;
  addCustomerPoints: (cid: string, pts: number) => void;
  submitStoreReview: (review: any) => Promise<void>;
  updateStoreReview: (id: string, data: Partial<StoreReview>) => Promise<void>;
  deleteStoreReview: (id: string) => Promise<void>;
  registerMerchant: (data: any) => Promise<{ success: boolean; message: string } | undefined>;
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

  const [adminSettings, setAdminSettings] = useState(() => StorageService.get('ADMIN_SETTINGS') || { 
    autoApproveStores: true,
    featuredStoreIds: [],
    enableAutoNearby: true,
    nearbyStoreIds: [],
    ads: [{ id: 'ad1', type: 'image', url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800', title: 'خصومات الشتاء', desc: 'احصل على خصم 50%', targetType: 'none', targetId: '' }],
    adInterval: 5,
    lastSyncTime: null
  });

  const [subscriptionPlans] = useState<SubscriptionPlan[]>(SUBSCRIPTION_PLANS);

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

  // Auth Observer
  useEffect(() => {
    let isMounted = true;
    const fallbackTimer = setTimeout(() => {
      if (isMounted) setAuthLoading(false);
    }, 5000);

    // Ensure we always have an anonymous Firebase session for Firestore Security Rules
    signInAnonymously(auth).catch((e: any) => {
      if (e?.code === 'auth/admin-restricted-operation' || e?.code === 'auth/operation-not-allowed') {
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(fallbackTimer);
      if (!isMounted) return;
      setAuthLoading(true);
      const suppressAuthErrors = true;
      if (user) {
        try {
          // Try to identify if user is customer, merchant or admin
          try {
            let custDoc = await safeGetDoc(doc(db, 'customers', user.uid), { suppressPermissionDenied: suppressAuthErrors });
            if (!custDoc?.exists()) {
               // Fallback: check "users" collection if the user created it there manually
               const userDoc = await safeGetDoc(doc(db, 'users', user.uid), { suppressPermissionDenied: suppressAuthErrors });
               if (userDoc?.exists()) {
                 // Auto-migrate to customers collection so the rest of the app works predictably
                 try {
                   await setDoc(doc(db, 'customers', user.uid), userDoc.data());
                 } catch (migrationErr) {
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
              } else {
                 setCurrentCustomerState(null);
                 StorageService.remove('LOGGED_IN_CUSTOMER_ID');
              }
            } else {
            }
          } catch (e: any) {
            if (!isFirestorePermissionDenied(e)) {
            }
          }

        } catch (error: any) {
          if (error?.message?.includes('client is offline')) {
          } else if (!isFirestorePermissionDenied(error)) {
          }
          // If profile fails to load due to network or permission error, we should still stop loading
        }
      } else {
        setCurrentCustomerState(null);
      }

      // Check for persisted customer
      const persistedCustId = StorageService.get('LOGGED_IN_CUSTOMER_ID');
      if (persistedCustId && !currentCustomer) {
        try {
          let custDoc = await safeGetDoc(doc(db, 'customers', persistedCustId), { suppressPermissionDenied: suppressAuthErrors });
          if (!custDoc?.exists()) {
              const userDoc = await safeGetDoc(doc(db, 'users', persistedCustId), { suppressPermissionDenied: suppressAuthErrors });
              if(userDoc?.exists()) custDoc = userDoc;
          }
          if (custDoc?.exists()) {
             const data = custDoc.data() as Customer;
             const validation = validateUserStatus(data, 'customer');
             if (validation.valid) {
                 setCurrentCustomerState({ ...data, id: custDoc.id });
             } else {
                 StorageService.remove('LOGGED_IN_CUSTOMER_ID');
                 setCurrentCustomerState(null);
             }
          } else {
             StorageService.remove('LOGGED_IN_CUSTOMER_ID');
             setCurrentCustomerState(null);
          }
        } catch (e: any) {
          if (!isFirestorePermissionDenied(e)) {
          }
        }
      } else if (!persistedCustId && !user) {
        // Only set to null if neither Firebase Auth nor LocalStorage has a customer
      }

      // Check for persisted merchant
      const persistedMerchantId = StorageService.get('LOGGED_IN_MERCHANT_ID');
      if (persistedMerchantId && !currentMerchant) {
        try {
          const storeDoc = await safeGetDoc(doc(db, 'stores', persistedMerchantId), { suppressPermissionDenied: suppressAuthErrors });
          if (storeDoc?.exists()) {
             const data = storeDoc.data() as Store;
             const validation = validateUserStatus(data, 'merchant');
             if (validation.valid) {
                 setCurrentMerchantState({ ...data, id: storeDoc.id });
             } else {
                 StorageService.remove('LOGGED_IN_MERCHANT_ID');
                 setCurrentMerchantState(null);
             }
          } else {
             StorageService.remove('LOGGED_IN_MERCHANT_ID');
             setCurrentMerchantState(null);
          }
        } catch (e: any) {
          if (!isFirestorePermissionDenied(e)) {
          }
        }
      } else if (!persistedMerchantId) {
        setCurrentMerchantState(null);
      }

      if (isMounted) setAuthInitialized(true);
      setAuthLoading(false);
    }, (error) => {
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

  // Real-time Data Listeners (scoped by role) — only after Firebase Auth is ready
  useEffect(() => {
    if (!authInitialized || authLoading || !auth.currentUser) {
      return;
    }

    const unsubs: Array<() => void> = [];
    const mapDocs = <T,>(snap: { docs: Array<{ id: string; data: () => T }> }) =>
      Array.from(new Map(snap.docs.map(d => [d.id, { ...d.data(), id: d.id }])).values());

    const isStaffSession = !!currentMerchant?.id;
    let storesRaf = 0;
    let productsRaf = 0;

    const scheduleStores = (data: Store[]) => {
      cancelAnimationFrame(storesRaf);
      storesRaf = requestAnimationFrame(() => setStores(data));
    };
    const scheduleProducts = (data: Product[]) => {
      cancelAnimationFrame(productsRaf);
      productsRaf = requestAnimationFrame(() => setProducts(data));
    };

    const snapshotOpts = { suppressPermissionDenied: true as const };

    unsubs.push(safeOnSnapshot(collection(db, 'stores'), (snap) => {
      scheduleStores(mapDocs<Store>(snap));
    }, snapshotOpts));

    const productsQuery = isStaffSession
      ? collection(db, 'products')
      : query(collection(db, 'products'), where('status', '==', 'published'));
    unsubs.push(safeOnSnapshot(productsQuery, (snap) => {
      scheduleProducts(mapDocs<Product>(snap));
    }, snapshotOpts));

    unsubs.push(safeOnSnapshot(collection(db, 'flash_sales'), (snap) => {
      setFlashSales(mapDocs<FlashSale>(snap));
    }, snapshotOpts));

    unsubs.push(safeOnSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAdminSettings(data);
        StorageService.save('ADMIN_SETTINGS', data);
      }
    }, snapshotOpts));

    if (isStaffSession) {
      unsubs.push(safeOnSnapshot(collection(db, 'promo_codes'), (snap) => {
        setPromoCodes(mapDocs<PromoCode>(snap));
      }, snapshotOpts));
      unsubs.push(safeOnSnapshot(collection(db, 'store_reviews'), (snap) => {
        setStoreReviews(mapDocs<StoreReview>(snap));
      }, snapshotOpts));
    } else {
      let cancelled = false;
      getDocs(collection(db, 'promo_codes')).then((snap) => {
        if (!cancelled) setPromoCodes(mapDocs<PromoCode>(snap));
      }).catch((e) => {
        if (!isFirestorePermissionDenied(e)) console.warn('[Firestore]', e);
      });
      getDocs(collection(db, 'store_reviews')).then((snap) => {
        if (!cancelled) setStoreReviews(mapDocs<StoreReview>(snap));
      }).catch((e) => {
        if (!isFirestorePermissionDenied(e)) console.warn('[Firestore]', e);
      });
      unsubs.push(() => { cancelled = true; });
    }

    if (currentMerchant?.id) {
      const storeId = currentMerchant.id;
      unsubs.push(safeOnSnapshot(query(collection(db, 'orders'), where('storeId', '==', storeId)), (snap) => {
        setOrders(mapDocs<Order>(snap));
      }, snapshotOpts));
      unsubs.push(safeOnSnapshot(query(collection(db, 'notifications'), where('userId', '==', storeId)), (snap) => {
        setNotifications(mapDocs<AppNotification>(snap));
      }, snapshotOpts));
      unsubs.push(safeOnSnapshot(query(collection(db, 'flash_sale_requests'), where('storeId', '==', storeId)), (snap) => {
        setFlashSaleRequests(mapDocs<FlashSaleRequest>(snap));
      }, snapshotOpts));
      unsubs.push(safeOnSnapshot(query(collection(db, 'payoutRequests'), where('merchantId', '==', storeId)), (snap) => {
        setPayoutRequests(mapDocs<PayoutRequest>(snap));
      }, snapshotOpts));
      setCustomers([]);
    } else if (currentCustomer?.id) {
      const customerId = currentCustomer.id;
      unsubs.push(safeOnSnapshot(doc(db, 'customers', customerId), (snap) => {
        if (snap.exists()) {
          setCustomers([{ ...(snap.data() as Customer), id: snap.id }]);
        }
      }, snapshotOpts));
      unsubs.push(safeOnSnapshot(query(collection(db, 'orders'), where('customerId', '==', customerId)), (snap) => {
        setOrders(mapDocs<Order>(snap));
      }, snapshotOpts));
      unsubs.push(safeOnSnapshot(query(collection(db, 'notifications'), where('userId', '==', customerId)), (snap) => {
        setNotifications(mapDocs<AppNotification>(snap));
      }, snapshotOpts));
      setPayoutRequests([]);
      setFlashSaleRequests([]);
    } else {
      setCustomers([]);
      setOrders([]);
      setNotifications([]);
      setPayoutRequests([]);
      setFlashSaleRequests([]);
    }

    return () => {
      cancelAnimationFrame(storesRaf);
      cancelAnimationFrame(productsRaf);
      unsubs.forEach((unsub) => unsub());
    };
  }, [authInitialized, authLoading, currentMerchant?.id, currentCustomer?.id]);

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

  const lookupCustomerByPhone = async (phone: string): Promise<Customer | null> => {
    try {
      const fn = httpsCallable<{ phone: string }, Customer | null>(
        getFunctions(app),
        'lookupCustomerByPhone',
      );
      const result = await fn({ phone });
      const data = result.data;
      if (!data || typeof data !== 'object' || !('id' in data)) return null;
      return data as Customer;
    } catch (e) {
      console.warn('[AppContext] lookupCustomerByPhone:', e);
      return null;
    }
  };

  const linkCustomerAuthUid = async (customerId: string): Promise<string | null> => {
    const uid = auth.currentUser?.uid;
    if (!uid || !customerId) return null;
    try {
      await updateDoc(doc(db, 'customers', customerId), { authUid: uid });
      return uid;
    } catch (e) {
      console.warn('[AppContext] linkCustomerAuthUid:', e);
      return null;
    }
  };

  const registerCustomer = async (data: any) => {
    const normalizedPhone = normalizeIraqiPhone(data.phone || '');
    const existingByPhone = normalizedPhone ? await lookupCustomerByPhone(normalizedPhone) : null;
    if (existingByPhone || stores.some(s => normalizeIraqiPhone(s.phone) === normalizedPhone)) {
      throw new Error('رقم الهاتف مستخدم مسبقاً في النظام');
    }

    const currentMonth = new Date().toISOString().substring(0, 7);
    
    let nextNumId = 1;
    if (customers && customers.length > 0) {
      customers.forEach(c => {
        const num = parseInt(c.id);
        if (!isNaN(num) && num >= nextNumId) {
          nextNumId = num + 1;
        }
      });
    }
    const id = data.id || auth.currentUser?.uid || String(nextNumId);

    const newCust: any = { 
      ...data, 
      id,
      authUid: auth.currentUser?.uid || data.authUid || id,
      phone: normalizedPhone || data.phone,
      points: 50, 
      ordersCount: 0, 
      monthlyOrdersCount: 0,
      lastResetMonth: currentMonth,
      tier: 'Silver', 
      followedStores: [], 
      storeNotifications: [], 
      isBlocked: false,
      createdAt: serverTimestamp()
    };
    try {
      await setDoc(doc(db, 'customers', id), newCust);
      return newCust;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'customers/' + id);
    }
  };

  const updateCustomerProfile = async (data: Partial<Customer>) => {
    const idToUpdate = data.id || currentCustomer?.id;
    if (!idToUpdate) return;
    try {
      await updateDoc(doc(db, 'customers', idToUpdate), {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'customers/' + idToUpdate);
    }
  };

  const registerMerchant = async (data: any) => {
    // Phone global uniqueness validation
    if (customers.some(c => c.phone === data.phone) || stores.some(s => s.phone === data.phone)) {
      return { success: false, message: 'رقم الهاتف مستخدم مسبقاً في النظام' };
    }
    // Username validation over all stores
    if (stores.some(s => s.username === data.username)) {
      return { success: false, message: 'اسم المستخدم للتاجر مسجل مسبقاً' };
    }

    const expiry = new Date(); expiry.setFullYear(expiry.getFullYear() + 1);
    const id = 'store_' + Date.now();
    const newStore = { ...data, id, status: 'active', subscriptionExpiry: expiry.toISOString().split('T')[0], rating: 5.0, createdAt: serverTimestamp() };
    try {
      await setDoc(doc(db, 'stores', id), newStore);
      setCurrentMerchant(newStore);
      return { success: true, message: 'تم' };
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'stores/' + id);
    }
  };

  const updateStoreProfile = async (data: Partial<Store>) => {
    const idToUpdate = data.id || currentMerchant?.id;
    if (!idToUpdate) return;

    if (data.username && currentMerchant && data.username !== currentMerchant.username) {
      if (stores.some(s => s.username === data.username)) {
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
      await updateDoc(doc(db, 'stores', idToUpdate), data);
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
      try {
        imageUrl = await uploadProductImageStorage(imageUrl, id);
      } catch (uploadErr) {
        // Throw an error here to prevent the app from attempting to save a massive Base64 string to Firestore!
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
      // Intercept new base64 / data URL images on edit and upload to Firebase Storage
      if (imageUrl && imageUrl.startsWith('data:image')) {
        try {
          imageUrl = await uploadProductImageStorage(imageUrl, id);
        } catch (uploadErr) {
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
    const id = generateOrderId();
    
    // Clean up undefined values from data items
    const cleanItems = data.items?.map(item => 
      Object.fromEntries(Object.entries(item).filter(([_, v]) => v !== undefined))
    );
    
    const cleanData = Object.fromEntries(Object.entries({...data, items: cleanItems}).filter(([_, v]) => v !== undefined));

    const newOrder: any = { ...cleanData, id, status: 'pending', createdAt: serverTimestamp() };
    if (promoCodeText !== undefined) {
      newOrder.promoCode = promoCodeText;
    }
    try {
      await setDoc(doc(db, 'orders', id), newOrder);

      // Decrement Inventory (Cloud Functions would be better but doing here for now)
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          const prodDoc = doc(db, 'products', item.productId || item.id);
          await updateDoc(prodDoc, { inventory: increment(-(item.quantity || 1)) });
        }
      }

      // إشعار للمتجر بوجود طلب جديد
      await addNotification({
        userId: data.storeId,
        role: 'merchant',
        type: 'order',
        title: 'طلب جديد',
        message: `لديك طلب جديد برقم ${id} من ${data.customerName}`,
        targetId: id
      });

      // Handle Promo Code increment
      if (promoCodeText) {
        // Find promo code by code
        const pQuery = query(collection(db, 'promoCodes'), where('code', '==', promoCodeText), limit(1));
        const pSnapshot = await getDocs(pQuery);
        if (!pSnapshot.empty) {
          const promoDocRef = pSnapshot.docs[0].ref;
          await updateDoc(promoDocRef, {
            usedCount: increment(1),
            currentGlobalUses: increment(1)
          });
        }
      }
      return id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'orders/' + id);
      throw e;
    }
  };

  const createPromoCode = async (data: any) => {
    // eslint-disable-next-line
    const id = 'promo_' + Date.now();
    const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    const newPromo = { ...cleanData, id, usedCount: 0, status: 'active', createdAt: serverTimestamp() };
    try {
      await setDoc(doc(db, 'promo_codes', id), newPromo);
      
      // إشعار المتابعين بإطلاق بروموكود
      if (data.storeId && data.storeId !== 'ALL_STORES' && customers.length > 0) {
        const storeName = stores.find(s => s.id === data.storeId)?.shopName || 'متجر';
        const notifs = customers
          .filter(c => c.followedStores?.includes(data.storeId))
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
    const customer = customers.find(c => c.id === cid);
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

    try {
      await updateDoc(doc(db, 'customers', cid), { followedStores: updatedFollowedStores });
      
      if (!isFollowing) {
         // Send silent push to merchant when followed
         await addNotification({
           userId: sid,
           role: 'merchant',
           type: 'social',
           title: 'متابع جديد!',
           message: `${customer.name} قام بمتابعة متجرك.`,
           sound: false
         });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'customers/' + cid);
      // Revert on error
      if (currentCustomer?.id === cid) {
        setCurrentCustomerState(currentCustomer);
      }
    }
  };

  const toggleStoreNotification = async (cid: string, sid: string) => {
    const customer = customers.find(c => c.id === cid);
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

    try {
      await updateDoc(doc(db, 'customers', cid), { storeNotifications: updatedNotifs });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'customers/' + cid);
      // Revert on error
      if (currentCustomer?.id === cid) {
        setCurrentCustomerState(currentCustomer);
      }
    }
  };

  const submitStoreReview = async (reviewData: any) => {
    // eslint-disable-next-line
    const id = 'rev_' + Date.now();
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

      // إضافة 5 نقاط للزبون عند التقييم
      if (reviewData.customerId) {
        await addCustomerPoints(reviewData.customerId, 5);
        await addNotification({
          userId: reviewData.customerId,
          role: 'customer',
          type: 'system',
          title: '🎁 شكرًا على التقييم!',
          message: 'تمت إضافة 5 نقاط ولاء إلى محفظتك لتقييمك المتجر بنجاح!',
          sound: true
        });
      }

    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'store_reviews/' + id);
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
    // Default sound to true unless explicitly false
    const soundEnabled = data.sound !== undefined ? data.sound : true;
    const n = { ...data, id, read: false, sound: soundEnabled, createdAt: serverTimestamp() };
    try {
      await setDoc(doc(db, 'notifications', id), n);
      const channelId = resolvePushChannelId({ ...data, sound: soundEnabled });
      await sendExternalPush(data.userId, data.title || 'محلك', data.message, channelId);
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
        const n = { ...data, id, read: false, sound: soundEnabled, createdAt: serverTimestamp() };
        
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
        await new Promise(r => setTimeout(r, 500)); // space out batches
      }

      const pushesByChannel: Record<string, { userIds: string[]; title: string; message: string; channelId: string }> = {};
      for (const data of notifications) {
        const soundEnabled = data.sound !== undefined ? data.sound : true;
        const channelId = resolvePushChannelId({ ...data, sound: soundEnabled });
        const pushTitle = data.title || 'محلك';
        const key = `${channelId}_${pushTitle}_${data.message}`;
        pushesByChannel[key] = pushesByChannel[key] || { userIds: [], title: pushTitle, message: data.message, channelId };
        pushesByChannel[key].userIds.push(data.userId);
      }

      for (const key in pushesByChannel) {
        const info = pushesByChannel[key];
        for (let i = 0; i < info.userIds.length; i += 2000) {
          const chunk = info.userIds.slice(i, i + 2000);
          await sendExternalPush(chunk, info.title, info.message, info.channelId);
          await new Promise(r => setTimeout(r, 100));
        }
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
      const updateData: any = { 
        status, 
        updatedAt: serverTimestamp() 
      };
      if (status === 'rejected') updateData.rejectionReason = reason;
      if (status === 'returned' || status === 'replaced') updateData.returnReason = reason;
      
      const order = orders.find(o => o.id === id);

      if (status === 'delivered' && order && order.customerId) {
        // Run in transaction to securely increment points and wallet balance
        await runTransaction(db, async (transaction) => {
          // 1. Get references
          const custRef = doc(db, 'customers', order.customerId);
          const storeRef = doc(db, 'stores', order.storeId);
          
          const [orderSnap, custSnap, storeSnap] = await Promise.all([
            transaction.get(orderRef),
            transaction.get(custRef),
            transaction.get(storeRef)
          ]);
          
          if (!orderSnap.exists()) {
             throw new Error("Order document does not exist.");
          }
          
          if (orderSnap.data().status === 'delivered') {
             throw new Error("ALREADY_DELIVERED");
          }

          // 2. Perform Customer Points Updates
          if (custSnap.exists()) {
            const customerData = custSnap.data();
            const oldOrdersCount = customerData.monthlyOrdersCount || 0;
            const newOrdersCount = oldOrdersCount + 1;
            
            const purchaseTotal = orderSnap.data().total || 0;
            const orderPoints = Math.floor(purchaseTotal / 1000);
            
            let tierBonus = 0;
            const oldTier = customerData.tier || 'Silver';
            let newTier: 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
            
            if (newOrdersCount >= 15) newTier = 'Diamond';
            else if (newOrdersCount >= 10) newTier = 'Platinum';
            else if (newOrdersCount >= 5) newTier = 'Gold';
            else newTier = 'Silver';
            
            if (oldTier === 'Silver' && newTier === 'Gold') tierBonus = 100;
            else if (oldTier === 'Gold' && newTier === 'Platinum') tierBonus = 125;
            else if (oldTier === 'Platinum' && newTier === 'Diamond') tierBonus = 150;
            
            const totalAddedPoints = orderPoints + tierBonus;

            transaction.update(custRef, {
               points: increment(totalAddedPoints),
               monthlyOrdersCount: newOrdersCount,
               tier: newTier
            });
          }

          // 3. Perform Merchant Wallet Updates
          if (storeSnap.exists()) {
            let storeEarnings = 0;
            const promoCodeObj = orderSnap.data().promoCode;
            let isAdminSponsored = orderSnap.data().discountSponsor === 'ADMIN';
            
            if (promoCodeObj) {
              const usedPromo = promoCodes.find(p => p.code === promoCodeObj);
              if (usedPromo && (usedPromo.source === 'admin' || usedPromo.source === 'points')) {
                isAdminSponsored = true;
              }
            }
            
            if (isAdminSponsored) {
              storeEarnings = orderSnap.data().discountAmount || 0;
            }
            
            if (storeEarnings > 0) {
              transaction.update(storeRef, {
                 walletBalance: increment(storeEarnings)
              });
            }
          }
          
          // 4. Update the Order
          transaction.update(orderRef, updateData);
        });

        // 5. Send notification to customer
        const loyaltyMsg = `حصلت تلقائياً على +${Math.floor((order.total || 0) / 1000)} نقطة كفوز رائع بمشترياتك!`;
        await addNotification({
          userId: order.customerId,
          role: 'customer',
          type: 'system',
          title: '🎁 تم شحن محفظة نقاطك!',
          message: loyaltyMsg,
          targetId: id,
          sound: true
        });

      } else {
        // If not delivered, just update the order
        await updateDoc(orderRef, updateData);
      }

      // Notification logic for status updates
      if (order && order.customerId) {
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
    } catch (e: any) {
      if (e.message && e.message.includes('ALREADY_DELIVERED')) {
        return;
      }
      handleFirestoreError(e, OperationType.UPDATE, 'orders/' + id);
    }
  };

  const requestPayout = async (amount: number, methodUsed: 'zain_cash' | 'mastercard', methodDetails: string) => {
    if (!currentMerchant) return;
    try {
      const pId = 'PAY-' + Math.floor(Math.random() * 1000000);
      const req: PayoutRequest = {
        id: pId,
        merchantId: currentMerchant.id,
        requestedAmount: amount,
        payoutMethodUsed: methodUsed,
        payoutMethodDetails: methodDetails,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'payoutRequests', pId), req);
    } catch(e) {
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
    const normalized = codeStr.trim().toUpperCase();
    const snap = await getDocs(
      query(collection(db, 'recharge_codes'), where('code', '==', normalized), limit(1)),
    );
    if (snap.empty) throw new Error('الكود غير صالح أو مستخدم مسبقاً');
    const codeDoc = snap.docs[0];
    const codeData = { ...(codeDoc.data() as RechargeCode), id: codeDoc.id };
    if (codeData.status !== 'active') throw new Error('الكود غير صالح أو مستخدم مسبقاً');

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'recharge_codes', codeData.id), {
        status: 'used',
        usedBy: customerId,
        usedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'customers', customerId), {
        points: increment(codeData.points),
      });
      await batch.commit();
      return codeData.points;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'redeem_recharge');
      throw e;
    }
  };

  const convertPointsToPromo = async (cid: string, pointsRequired: number) => {
    const customer = customers.find(c => c.id === cid);
    if (!customer || customer.points < pointsRequired) return { success: false, message: 'عذراً، نقاطك غير كافية ❌' };
    
    const discount = Math.floor(pointsRequired / 150) * 5000;
    
    const newCode = 'LP-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const id = 'promo_' + Date.now();
    const promoData: any = {
      id,
      storeId: 'ALL_STORES',
      code: newCode,
      discountType: 'amount',
      discountValue: discount,
      amount: discount,
      maxUses: 1,
      usedCount: 0,
      status: 'active',
      source: 'points',
      ownerCustomerId: cid,
      createdAt: serverTimestamp()
    };
    
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'customers', cid), { points: increment(-pointsRequired) });
      batch.set(doc(db, 'promo_codes', id), promoData);
      
      // Optimistic update
      if (currentCustomer?.id === cid && currentCustomer.points >= pointsRequired) {
        setCurrentCustomerState({ ...currentCustomer, points: currentCustomer.points - pointsRequired });
      }

      await batch.commit();
      return { success: true, message: 'تم التحويل بنجاح ✅', code: newCode };
    } catch (e) {
      if (currentCustomer?.id === cid) {
        setCurrentCustomerState(currentCustomer); // revert
      }
      handleFirestoreError(e, OperationType.WRITE, 'convert_points');
      return { success: false, message: 'عذراً، حدث خطأ ما' };
    }
  };

  const addCustomerPoints = async (cid: string, pts: number) => {
    try {
      if (currentCustomer?.id === cid) {
        setCurrentCustomerState({ ...currentCustomer, points: currentCustomer.points + pts });
      }
      await updateDoc(doc(db, 'customers', cid), { points: increment(pts) });
    } catch (e) {
      if (currentCustomer?.id === cid) {
        setCurrentCustomerState(currentCustomer); // revert
      }
      handleFirestoreError(e, OperationType.UPDATE, 'customers/' + cid);
    }
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
    return index !== -1 ? String(index + 1) : '';
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
    const persistedMerchantId = StorageService.get('LOGGED_IN_MERCHANT_ID');
    const targetId = currentMerchant ? currentMerchant.id : persistedMerchantId;
    if (targetId && stores.length > 0) {
      const found = stores.find(s => s.id === targetId);
      if (found && found.status !== 'suspended') {
        setCurrentMerchantState(found);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores]);

  const checkAndTriggerSubscriptionExpiryAlerts = async () => {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      for (const store of stores) {
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
  /* eslint-enable react-hooks/set-state-in-effect */

  const contextValue = useMemo(() => ({
      provinces: IRAQ_PROVINCES, stores, products, customers, orders, promoCodes, notifications, payoutRequests,
      currentCustomer, currentMerchant, adminSettings, subscriptionPlans, flashSales, flashSaleRequests, storeReviews,
      getCustomerSeqId, getOrderSeqId,
      setOrders,
      setCurrentCustomer, setCurrentMerchant,
      registerCustomer, lookupCustomerByPhone, linkCustomerAuthUid, updateCustomerProfile,
      toggleFollowStore, toggleStoreNotification, placeOrder, convertPointsToPromo, addCustomerPoints,
      submitStoreReview, updateStoreReview, deleteStoreReview,
      registerMerchant, updateStoreProfile, addProduct, updateProduct, deleteProduct,
      createPromoCode, updatePromoCode, togglePromoCodeStatus, updateOrder, updateOrderStatus, requestPayout,
      addNotification, addBulkNotifications, markNotificationAsRead, markAllNotificationsAsRead,
      redeemRechargeCode, deletePromoCode, requestJoinFlashSale,
    }), [
      stores, products, customers, orders, promoCodes, notifications, payoutRequests,
      currentCustomer, currentMerchant, adminSettings, flashSales, flashSaleRequests, storeReviews,
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
