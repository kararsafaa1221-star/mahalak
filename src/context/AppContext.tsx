import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { motion } from 'motion/react';
import { StorageService } from '../services/storageService';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  getDoc,
  getDocFromServer,
  writeBatch,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { 
  onAuthStateChanged
} from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { sendExternalPush } from '../lib/pushNotifications';

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
  StoreReview
} from '../types';
import { IRAQ_PROVINCES, SUBSCRIPTION_PLANS } from '../constants';

const generateOrderId = () => 'ORD-' + Math.floor(Math.random() * 1000000);

export interface AppContextType {
  provinces: Province[]; stores: Store[]; products: Product[]; customers: Customer[]; orders: Order[]; promoCodes: PromoCode[]; notifications: AppNotification[]; currentCustomer: Customer | null; currentMerchant: Store | null; currentAdmin: boolean; adminSettings: any; subscriptionPlans: SubscriptionPlan[]; flashSales: FlashSale[]; flashSaleRequests: FlashSaleRequest[]; storeReviews: StoreReview[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  setCurrentCustomer: (c: Customer | null) => void;
  setCurrentMerchant: (s: Store | null) => void;
  setCurrentAdmin: (b: boolean) => void;
  registerCustomer: (data: any) => Promise<Customer>;
  updateCustomerProfile: (data: Partial<Customer>) => Promise<void>;
  toggleFollowStore: (cid: string, sid: string) => void;
  toggleStoreNotification: (cid: string, sid: string) => void;
  placeOrder: (order: any, promoId?: string) => Promise<void>;
  convertPointsToPromo: (cid: string, points: number) => Promise<{ success: boolean; code?: string; message: string }>;
  addCustomerPoints: (cid: string, pts: number) => void;
  submitStoreReview: (review: any) => Promise<void>;
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
  addNotification: (notif: any) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: (userId: string, role: 'customer' | 'merchant' | 'admin') => void;
  sendAdminNotification: (t: string, m: string, target: string) => void;
  rechargeCodes: RechargeCode[];
  generateRechargeCodes: (count: number, points: number) => Promise<void>;
  redeemRechargeCode: (code: string, customerId: string) => Promise<number>;
  toggleAutoApprove: () => void;
  updateSubscriptionPrice: (id: string, p: number) => void;
  updateStoreStatus: (id: string, s: string) => void;
  updateStoreBadges: (id: string, badges: string[]) => void;
  toggleCustomerBlock: (id: string) => void;
  deleteCustomer: (id: string) => void;
  toggleStoreBan: (id: string) => void;
  deleteStore: (id: string) => void;
  deletePromoCode: (id: string) => void;
  updateAdminSettings: (data: Partial<any>) => void;
  createFlashSale: (data: Omit<FlashSale, 'id'>) => Promise<void>;
  updateFlashSaleStatus: (id: string, status: FlashSale['status']) => void;
  updateFlashSaleDates: (id: string, startTime: string, endTime: string) => void;
  deleteFlashSale: (id: string) => void;
  requestJoinFlashSale: (request: Omit<FlashSaleRequest, 'id'>) => Promise<void>;
  updateFlashSaleRequestStatus: (id: string, status: FlashSaleRequest['status']) => void;
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
  const [rechargeCodes, setRechargeCodes] = useState<RechargeCode[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [flashSaleRequests, setFlashSaleRequests] = useState<FlashSaleRequest[]>([]);
  const [storeReviews, setStoreReviews] = useState<StoreReview[]>([]);

  // Auth States
  const [currentCustomer, setCurrentCustomerState] = useState<Customer | null>(null);
  const [currentMerchant, setCurrentMerchantState] = useState<Store | null>(null);
  const [currentAdmin, setCurrentAdminState] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState(true);

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
        console.log("Firestore connection test: STARTING...");
        const testDoc = await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("Firestore connection test: SUCCESS.", testDoc.exists() ? "(Test doc exists)" : "(Database is reachable)");
      } catch (error: any) {
        console.warn("Firestore connection check failed:", error?.message);
        
        if (error?.message?.includes('the client is offline')) {
          console.info("Connectivity Tip: If you see 'the client is offline', it may be a temporary network issue or the database may still be initializing. Try refreshing the page.");
        }
      }
    }
    testConnection();
  }, []);

  // Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthLoading(true);
      if (user) {
        try {
          // Try to identify if user is customer, merchant or admin
          const custDoc = await getDoc(doc(db, 'customers', user.uid));
          if (custDoc.exists()) {
            setCurrentCustomerState({ ...custDoc.data() as Customer, id: user.uid });
          }

          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          if (adminDoc.exists() || user.email === 'kararsafaa1221@gmail.com') setCurrentAdminState(true);
        } catch (error) {
          console.error("Error loading user profile:", error);
          // If profile fails to load due to network or permission error, we should still stop loading
        }
      } else {
        setCurrentCustomerState(null);
        setCurrentMerchantState(null);
        setCurrentAdminState(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Data Listeners
  useEffect(() => {
    // Stores
    const unsubStores = onSnapshot(collection(db, 'stores'), (snap) => {
      const uniqueStores = Array.from(new Map(snap.docs.map(d => [d.id, { ...d.data() as Store, id: d.id }])).values());
      setStores(uniqueStores);
    }, () => handleFirestoreError(new Error('Permission denied'), OperationType.LIST, 'stores'));

    // Products
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      const uniqueProducts = Array.from(new Map(snap.docs.map(d => [d.id, { ...d.data() as Product, id: d.id }])).values());
      setProducts(uniqueProducts);
    }, () => handleFirestoreError(new Error('Permission denied'), OperationType.LIST, 'products'));

    // Customers (Admins only see all, customers see themselves)
    const unsubCust = onSnapshot(collection(db, 'customers'), (snap) => {
      const uniqueCustomers = Array.from(new Map(snap.docs.map(d => [d.id, { ...d.data() as Customer, id: d.id }])).values());
      setCustomers(uniqueCustomers);
    }, () => {
      // If permission denied, it's expected for non-admins, but we handle it
      console.warn("Limited access to customers list");
    });

    // Orders
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      setOrders(Array.from(new Map(snap.docs.map(d => [d.id, { ...d.data() as Order, id: d.id }])).values()));
    }, () => console.warn("Order stream filtered by security rules"));

    // Notifications
    const unsubNotifs = onSnapshot(collection(db, 'notifications'), (snap) => {
      setNotifications(Array.from(new Map(snap.docs.map(d => [d.id, { ...d.data() as AppNotification, id: d.id }])).values()));
    }, () => console.warn("Notification stream filtered by security rules"));

    // Rehab Codes
    const unsubRecharge = onSnapshot(collection(db, 'recharge_codes'), (snap) => {
      setRechargeCodes(Array.from(new Map(snap.docs.map(d => [d.id, { ...d.data() as RechargeCode, id: d.id }])).values()));
    }, () => console.warn("Recharge codes stream filtered"));

    // Promo Codes
    const unsubPromo = onSnapshot(collection(db, 'promo_codes'), (snap) => {
      setPromoCodes(Array.from(new Map(snap.docs.map(d => [d.id, { ...d.data() as PromoCode, id: d.id }])).values()));
    });

    // Flash Sales
    const unsubFlash = onSnapshot(collection(db, 'flash_sales'), (snap) => {
      setFlashSales(Array.from(new Map(snap.docs.map(d => [d.id, { ...d.data() as FlashSale, id: d.id }])).values()));
    });
    
    // Flash Sale Requests
    const unsubFlashRequests = onSnapshot(collection(db, 'flash_sale_requests'), (snap) => {
      setFlashSaleRequests(Array.from(new Map(snap.docs.map(d => [d.id, { ...d.data() as FlashSaleRequest, id: d.id }])).values()));
    });

    // Store Reviews
    const unsubReviews = onSnapshot(collection(db, 'store_reviews'), (snap) => {
      setStoreReviews(Array.from(new Map(snap.docs.map(d => [d.id, { ...d.data() as StoreReview, id: d.id }])).values()));
    }, () => console.warn("Store reviews stream filtered"));

    // Global Settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAdminSettings(data);
        StorageService.save('ADMIN_SETTINGS', data);
      }
    });

    return () => {
      unsubStores(); unsubProducts(); unsubCust(); unsubOrders(); unsubNotifs(); unsubRecharge(); unsubPromo(); unsubFlash(); unsubFlashRequests(); unsubReviews(); unsubSettings();
    };
  }, []);

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

  const setCurrentAdmin = (b: boolean) => {
    setCurrentAdminState(b);
  };

  const registerCustomer = async (data: any) => {
    // Phone global uniqueness validation
    if (customers.some(c => c.phone === data.phone) || stores.some(s => s.phone === data.phone)) {
      throw new Error('رقم الهاتف مستخدم مسبقاً في النظام');
    }

    const currentMonth = new Date().toISOString().substring(0, 7);
    const id = data.id || 'cust_' + Date.now();
    const newCust: any = { 
      ...data, 
      id,
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
    const newProd = { ...data, id, finalPrice, createdAt: serverTimestamp() };
    try {
      await setDoc(doc(db, 'products', id), newProd);

      // We should send a notification to customers who enabled notifications for this store
      if (customers.length > 0) {
        const storeName = stores.find(s => s.id === data.storeId)?.shopName || 'متجر';
        customers.forEach(async (c) => {
          if (c.storeNotifications?.includes(data.storeId)) {
            await addNotification({
              userId: c.id,
              role: 'customer',
              title: `منتج جديد من ${storeName} ✨`,
              message: `تمت إضافة منتج جديد: ${data.name}. سارع بالشراء الآن!`,
              type: 'product',
              targetId: id
            });
          }
        });
      }

    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'products/' + id);
    }
  };

  const updateProduct = async (id: string, data: any) => {
    try {
      await updateDoc(doc(db, 'products', id), data);
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
        // Reserved for future use
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'orders/' + id);
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
        customers.forEach(async (c) => {
          if (c.followedStores?.includes(data.storeId)) {
            await addNotification({
              userId: c.id,
              role: 'customer',
              title: `بروموكود جديد من ${storeName} 🎁`,
              message: `تم إطلاق كود خصم جديد: ${data.code}. استفد منه الآن!`,
              type: 'promo',
              targetId: id,
              sound: true
            });
          }
        });
      } else if (data.storeId === 'ALL_STORES' && customers.length > 0) {
        // إشعار جميع المستخدمين بالبروموكود العام
        customers.forEach(async (c) => {
          await addNotification({
            userId: c.id,
            role: 'customer',
            title: `محلك 🎁`,
            message: `عرض جديد بمناسبة العيد أو الفعاليات الخاصة! كود الخصم: ${data.code}`,
            type: 'promo',
            targetId: id,
            sound: true
          });
        });
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

    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'store_reviews/' + id);
    }
  };

  const addNotification = async (data: any) => {
    const id = 'notif_' + Date.now();
    // Default sound to true unless explicitly false
    const soundEnabled = data.sound !== undefined ? data.sound : true;
    const n = { ...data, id, read: false, sound: soundEnabled, createdAt: serverTimestamp() };
    try {
      await setDoc(doc(db, 'notifications', id), n);

      // Determine correct OneSignal Channel based on business rules
      let channelId = 'admin_broadcasts_sound'; // Default fallback
      
      if (data.role === 'customer') {
        if (data.type === 'order') {
           channelId = soundEnabled ? 'customer_order_updates_sound' : 'customer_order_updates_silent';
        } else if (data.type === 'promo') {
           channelId = 'customer_promos_sound';
        } else if (data.type === 'product') {
           channelId = 'customer_products_sound';
        }
      } else if (data.role === 'merchant') {
        if (data.type === 'order') {
           channelId = 'merchant_orders_sound';
        } else if (data.type === 'activity' || data.type === 'system') {
           channelId = soundEnabled ? 'merchant_orders_sound' : 'merchant_activity_silent';
        } else if (data.type === 'social') {
           channelId = 'merchant_social_silent';
        }
      }

      // Check if this is explicitly an admin broadcast (usually no specific type or type='system')
      if (!data.type && data.title === 'محلك') {
         channelId = 'admin_broadcasts_sound';
      }

      await sendExternalPush(data.userId, data.title || "محلك", data.message, channelId);

    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'notifications/' + id);
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
      
      await updateDoc(orderRef, updateData);

      // إشعار للزبون بتحديث حالة الطلب
      const order = orders.find(o => o.id === id);
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
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'orders/' + id);
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

  const generateRechargeCodes = async (count: number, points: number) => {
    const batch = writeBatch(db);
    for (let i = 0; i < count; i++) {
        const codeStr = Math.random().toString(36).substring(2, 10).toUpperCase();
        const id = 'rc_' + Date.now() + '_' + i;
        const n = {
            id,
            code: codeStr,
            points,
            status: 'active',
            createdAt: serverTimestamp()
        };
        batch.set(doc(db, 'recharge_codes', id), n);
    }
    try {
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'recharge_codes_batch');
    }
  };

  const redeemRechargeCode = async (codeStr: string, customerId: string) => {
    // In real app, we query by code
    // Simplified logic for brevity:
    const codeData = rechargeCodes.find(c => c.code === codeStr && c.status === 'active');
    if (!codeData) throw new Error('الكود غير صالح أو مستخدم مسبقاً');

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'recharge_codes', codeData.id), { 
        status: 'used', 
        usedBy: customerId, 
        usedAt: serverTimestamp() 
      });
      batch.update(doc(db, 'customers', customerId), { 
        points: increment(codeData.points) 
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
    
    let discount = 0;
    if (pointsRequired === 100) discount = 5000;
    else if (pointsRequired === 200) discount = 12000;
    else if (pointsRequired === 500) discount = 35000;
    
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
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'notifications/' + id);
    }
  };

  const markAllNotificationsAsRead = async (userId: string, role: string) => {
    const unread = notifications.filter(n => n.userId === userId && n.role === role && !n.read);
    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    try {
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'mark_all_read');
    }
  };

  const sendAdminNotification = (_t: string, m: string, target: string) => {
    // Collect all valid targets
    const allUsers = [
      ...customers.map(c => ({ id: c.id, role: 'customer' })),
      ...stores.map(s => ({ id: s.id, role: 'merchant' }))
    ];
    
    const targets = target === 'ALL' ? allUsers : allUsers.filter(u => u.id === target);
    
    targets.forEach(t => {
      addNotification({
        userId: t.id,
        role: t.role,
        title: 'محلك',
        message: m
      });
    });
  };

  const toggleAutoApprove = () => updateAdminSettings({ autoApproveStores: !adminSettings.autoApproveStores });
  const updateSubscriptionPrice = (id: string, price: number) => {
    const updatedPlans = { ...(adminSettings.plans || {}) };
    updatedPlans[id] = price;
    updateAdminSettings({ plans: updatedPlans });
  };

  const updateStoreStatus = async (id: string, s: string) => {
    try {
      await updateDoc(doc(db, 'stores', id), { status: s });
      
      let msg = '';
      if (s === 'active') msg = 'تم تفعيل حساب متجرك بنجاح. يمكنك الآن استقبال الطلبات!';
      if (s === 'suspended') msg = 'تم إيقاف حساب متجرك مؤقتاً. يرجى التواصل مع الدعم الفني.';
      
      if (msg) {
        await addNotification({
          userId: id, // storeId is used as merchant userId
          role: 'merchant',
          type: 'system',
          title: 'تحديث حالة المتجر',
          message: msg,
          targetId: id
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'stores/' + id);
    }
  };

  const updateStoreBadges = async (id: string, badges: string[]) => {
    try {
      await updateDoc(doc(db, 'stores', id), { badges });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'stores/' + id);
    }
  };

  const toggleCustomerBlock = async (id: string) => {
    const cust = customers.find(c => c.id === id);
    try {
       await updateDoc(doc(db, 'customers', id), { isBlocked: !cust?.isBlocked });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'customers/' + id);
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      // مسح جميع طلبات الزبون
      const customerOrders = orders.filter(o => o.customerId === id);
      for (const order of customerOrders) {
        await deleteDoc(doc(db, 'orders', order.id));
      }
      
      // مسح جميع تقييمات الزبون
      const customerReviews = storeReviews.filter(r => r.customerId === id);
      for (const review of customerReviews) {
        await deleteDoc(doc(db, 'store_reviews', review.id));
      }

      // مسح الزبون
      await deleteDoc(doc(db, 'customers', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'customers/' + id);
    }
  };

  const toggleStoreBan = async (id: string) => {
    const store = stores.find(s => s.id === id);
    if (!store) return;
    try {
      await updateDoc(doc(db, 'stores', id), { isBanned: !store.isBanned });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'stores/' + id);
    }
  };

  const deleteStore = async (id: string) => {
    try {
      // Delete all products for this store
      const storeProducts = products.filter(p => p.storeId === id);
      for (const product of storeProducts) {
        await deleteDoc(doc(db, 'products', product.id));
      }
      
      // Delete all promo codes for this store
      const storePromoCodes = promoCodes.filter(p => p.storeId === id);
      for (const code of storePromoCodes) {
        await deleteDoc(doc(db, 'promo_codes', code.id));
      }

      // Delete all orders for this store
      const storeOrders = orders.filter(o => o.storeId === id);
      for (const order of storeOrders) {
        await deleteDoc(doc(db, 'orders', order.id));
      }

      // Delete all flash sale requests
      const storeReqs = flashSaleRequests.filter(r => r.storeId === id);
      for (const req of storeReqs) {
        await deleteDoc(doc(db, 'flash_sale_requests', req.id));
      }

      // Delete all store reviews
      const storeRevs = storeReviews.filter(r => r.storeId === id);
      for (const rev of storeRevs) {
        await deleteDoc(doc(db, 'store_reviews', rev.id));
      }

      // Delete store document
      await deleteDoc(doc(db, 'stores', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'stores/' + id);
    }
  };

  const deletePromoCode = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'promo_codes', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'promo_codes/' + id);
    }
  };

  const updateAdminSettings = async (data: Partial<any>) => {
    const updated = { ...adminSettings, ...data };
    setAdminSettings(updated);
    try {
      await setDoc(doc(db, 'settings', 'global'), updated);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'settings/global');
    }
  };

  const createFlashSale = async (data: Omit<FlashSale, 'id'>) => {
    const id = 'fs_' + Date.now();
    try {
      await setDoc(doc(db, 'flash_sales', id), { ...data, id, createdAt: serverTimestamp() });
      
      // Notify all active merchants
      stores.filter(s => s.status === 'active' && !s.isBanned).forEach(async store => {
        try {
          await addNotification({
            userId: store.id,
            role: 'merchant',
            title: 'محلك',
            message: `فعالية جديدة معلنة! "${data.title}"، يمكنك الآن طلب المشاركة بمنتجاتك!`,
            type: 'system',
            targetId: id
          });
        } catch(_e) { /* ignore */ }
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'flash_sales/' + id);
    }
  };

  const updateFlashSaleStatus = async (id: string, status: FlashSale['status']) => {
    try {
      const sale = flashSales.find(f => f.id === id);
      await updateDoc(doc(db, 'flash_sales', id), { status });
      
      if (status === 'active' && sale) {
        customers.filter(c => !c.isBlocked).forEach(async customer => {
          try {
            await addNotification({
              userId: customer.id,
              role: 'customer',
              title: 'محلك',
              message: `بدأت الآن الفعالية الكبرى "${sale.title}"! تصفح أفضل العروض والخصومات.`,
              type: 'system',
              targetId: id
            });
          } catch(_e) { /* ignore */ }
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'flash_sales/' + id);
    }
  };

  const updateFlashSaleDates = async (id: string, startTime: string, endTime: string) => {
    try {
      await updateDoc(doc(db, 'flash_sales', id), { startTime, endTime });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'flash_sales/' + id);
    }
  };

  const deleteFlashSale = async (id: string) => {
    try {
      const requests = flashSaleRequests.filter(r => r.flashSaleId === id);
      for (const req of requests) {
        await deleteDoc(doc(db, 'flash_sale_requests', req.id));
      }
      await deleteDoc(doc(db, 'flash_sales', id));
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
      await updateDoc(doc(db, 'flash_sale_requests', id), { status });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'flash_sale_requests/' + id);
    }
  };

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
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <AppContext.Provider value={{
      provinces: IRAQ_PROVINCES, stores, products, customers, orders, promoCodes, notifications, currentCustomer, currentMerchant, currentAdmin, adminSettings, subscriptionPlans, flashSales, flashSaleRequests, storeReviews,
      setOrders,
      setCurrentCustomer, setCurrentMerchant, setCurrentAdmin, registerCustomer, updateCustomerProfile, toggleFollowStore, toggleStoreNotification, placeOrder, convertPointsToPromo, addCustomerPoints, submitStoreReview, registerMerchant, updateStoreProfile, addProduct, updateProduct, deleteProduct, createPromoCode, updatePromoCode, togglePromoCodeStatus, updateOrder, updateOrderStatus, addNotification, markNotificationAsRead, markAllNotificationsAsRead, sendAdminNotification,
      rechargeCodes, generateRechargeCodes, redeemRechargeCode,
      toggleAutoApprove, updateSubscriptionPrice, updateStoreStatus, updateStoreBadges, toggleCustomerBlock, deleteCustomer, toggleStoreBan, deleteStore, deletePromoCode, updateAdminSettings,
      createFlashSale, updateFlashSaleStatus, updateFlashSaleDates, deleteFlashSale, requestJoinFlashSale, updateFlashSaleRequestStatus
    }}>
      {!authLoading ? children : (
        <div className="fixed inset-0 w-full h-full z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
              <motion.div 
                className="absolute inset-0 rounded-full border-[3px] border-purple-100 dark:border-slate-800 border-t-purple-600 dark:border-t-purple-500"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              />
              <img src="/icon.png" alt="محلك" className="w-20 h-20 object-contain rounded-2xl shadow-sm" />
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center"
            >
              <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">محلك</h2>
              <div className="text-slate-500 dark:text-slate-400 font-medium text-sm flex items-center justify-center gap-1">
                <span>جاري إعداد محلك</span>
                <span className="flex">
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
