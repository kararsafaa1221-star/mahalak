/* eslint-disable react-hooks/purity */
import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { motion } from 'motion/react';
import { StorageService } from '../services/storageService';
import { db, auth, uploadProductImageStorage } from '../lib/firebase';
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
  getCustomerSeqId: (id: string | undefined | null) => string;
  getOrderSeqId: (id: string | undefined | null) => string;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  setCurrentCustomer: (c: Customer | null) => void;
  setCurrentMerchant: (s: Store | null) => void;
  setCurrentAdmin: (b: boolean) => void;
  registerCustomer: (data: any) => Promise<Customer>;
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
  addNotification: (notif: any) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: (userId: string, role: 'customer' | 'merchant' | 'admin') => void;
  sendAdminNotification: (t: string, m: string, target: string) => void;
  rechargeCodes: RechargeCode[];
  generateRechargeCodes: (count: number, points: number) => Promise<void>;
  redeemRechargeCode: (code: string, customerId: string) => Promise<number>;
  deleteRechargeCode: (id: string) => Promise<void>;
  toggleAutoApprove: () => void;
  updateSubscriptionPrice: (id: string, p: number) => void;
  updateStoreStatus: (id: string, s: string) => void;
  updateStoreBadges: (id: string, badges: string[]) => void;
  adminUpdateStore: (storeId: string, data: Partial<Store>) => Promise<void>;
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
  seedDatabase: () => Promise<{ success: boolean; message: string }>;
  generateVirtualData: (storeCount: number, productCount: number) => Promise<{ success: boolean; message: string }>;
  deleteAllVirtualData: () => Promise<{ success: boolean; message: string }>;
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
    let isMounted = true;
    const fallbackTimer = setTimeout(() => {
      if (isMounted) setAuthLoading(false);
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(fallbackTimer);
      if (!isMounted) return;
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
    }, (error) => {
      console.error("Auth state observer error:", error);
      clearTimeout(fallbackTimer);
      if (isMounted) setAuthLoading(false);
    });
    
    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
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
    
    let nextNumId = 1;
    if (customers && customers.length > 0) {
      customers.forEach(c => {
        const num = parseInt(c.id);
        if (!isNaN(num) && num >= nextNumId) {
          nextNumId = num + 1;
        }
      });
    }
    const id = data.id || String(nextNumId);

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
    
    let imageUrl = data.image;
    // Intercept base64 / data URL images and upload to Firebase Storage to prevent Firestore 1MB limits
    if (imageUrl && imageUrl.startsWith('data:image')) {
      try {
        console.log("Uploading product image base64 directly to Firebase Storage...");
        imageUrl = await uploadProductImageStorage(imageUrl, id);
      } catch (uploadErr) {
        console.error("Failed to upload image during creation, keeping original or default:", uploadErr);
      }
    }

    const newProd = { ...data, id, image: imageUrl, finalPrice, createdAt: serverTimestamp() };
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
      let imageUrl = data.image;
      // Intercept new base64 / data URL images on edit and upload to Firebase Storage
      if (imageUrl && imageUrl.startsWith('data:image')) {
        try {
          console.log("Uploading updated product image base64 to Firebase Storage...");
          imageUrl = await uploadProductImageStorage(imageUrl, id);
        } catch (uploadErr) {
          console.error("Failed to upload updated image, keeping original:", uploadErr);
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
        // Reserved for future use
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
        // حاسب النقاط والترقيات في حال اكتمال الطلب وتوصيله
        if (status === 'delivered') {
          const customer = customers.find(c => c.id === order.customerId);
          if (customer) {
            const oldOrdersCount = customer.monthlyOrdersCount || 0;
            const newOrdersCount = oldOrdersCount + 1;
            
            // احتساب نقاط المشتريات: نقطة واحدة لكل 1000 د.ع من إجمالي الطلب
            const purchaseTotal = order.total || 0;
            const orderPoints = Math.floor(purchaseTotal / 1000);
            
            // تحديد المستوى الجديد وترقية بونص وصعود الرتبة
            let tierBonus = 0;
            const oldTier = customer.tier || 'Silver';
            let newTier: 'Silver' | 'Gold' | 'Platinum' | 'Diamond' = 'Silver';
            
            if (newOrdersCount >= 15) {
              newTier = 'Diamond';
            } else if (newOrdersCount >= 10) {
              newTier = 'Platinum';
            } else if (newOrdersCount >= 5) {
              newTier = 'Gold';
            } else {
              newTier = 'Silver';
            }
            
            if (oldTier === 'Silver' && newTier === 'Gold') {
              tierBonus = 100; // المستوى الثاني: 100 نقطة
            } else if (oldTier === 'Gold' && newTier === 'Platinum') {
              tierBonus = 125; // المستوى الثالث: 125 نقطة
            } else if (oldTier === 'Platinum' && newTier === 'Diamond') {
              tierBonus = 150; // المستوى الرابع: 150 نقطة
            }
            
            const totalAddedPoints = orderPoints + tierBonus;
            
            // تحديث الحساب في قاعدة البيانات
            const custRef = doc(db, 'customers', order.customerId);
            await updateDoc(custRef, {
              points: increment(totalAddedPoints),
              monthlyOrdersCount: newOrdersCount,
              tier: newTier
            });
            
            // تحديث الحالة المحلية تلقائياً إن وافق المستخدم الحالي
            if (currentCustomer && currentCustomer.id === order.customerId) {
              setCurrentCustomerState({
                ...currentCustomer,
                points: (currentCustomer.points || 0) + totalAddedPoints,
                monthlyOrdersCount: newOrdersCount,
                tier: newTier
              });
            }
            
            // إشعار ممتع للزبون بالمكاسب
            let loyaltyMsg = `حصلت تلقائياً على +${orderPoints} نقطة كفوز رائع بمشترياتك!`;
            if (tierBonus > 0) {
              loyaltyMsg += ` 🆙 مبارك صعودك للمستوى ${newTier === 'Gold' ? 'الذهبي' : newTier === 'Platinum' ? 'البلاتيني' : 'الماسي'}! تم إهداؤك +${tierBonus} نقطة إضافية!`;
            }
            
            await addNotification({
              userId: order.customerId,
              role: 'customer',
              type: 'system',
              title: '🎁 تم شحن محفظة نقاطك!',
              message: loyaltyMsg,
              targetId: id,
              sound: true
            });
          }
        }

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

  const deleteRechargeCode = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'recharge_codes', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'delete_recharge');
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

  const adminUpdateStore = async (storeId: string, data: Partial<Store>) => {
    try {
      await updateDoc(doc(db, 'stores', storeId), data);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'stores/' + storeId);
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

      // مسح جميع إشعارات الزبون
      const customerNotifs = (notifications || []).filter(n => n.userId === id);
      for (const notif of customerNotifs) {
        await deleteDoc(doc(db, 'notifications', notif.id));
      }

      // مسح بروموكودات الزبون إن وجدت
      const customerPromos = promoCodes.filter(p => p.ownerCustomerId === id);
      for (const promo of customerPromos) {
        await deleteDoc(doc(db, 'promo_codes', promo.id));
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
      const batch = writeBatch(db);

      // Delete all products for this store
      const storeProducts = products.filter(p => p.storeId === id);
      for (const product of storeProducts) {
        batch.delete(doc(db, 'products', product.id));
      }
      
      // Delete all promo codes for this store
      const storePromoCodes = promoCodes.filter(p => p.storeId === id);
      for (const code of storePromoCodes) {
        batch.delete(doc(db, 'promo_codes', code.id));
      }

      // Delete all orders for this store
      const storeOrders = orders.filter(o => o.storeId === id);
      for (const order of storeOrders) {
        batch.delete(doc(db, 'orders', order.id));
      }

      // Delete all flash sale requests
      const storeReqs = flashSaleRequests.filter(r => r.storeId === id);
      for (const req of storeReqs) {
        batch.delete(doc(db, 'flash_sale_requests', req.id));
      }

      // Delete all store reviews
      const storeRevs = storeReviews.filter(r => r.storeId === id);
      for (const rev of storeRevs) {
        batch.delete(doc(db, 'store_reviews', rev.id));
      }

      // Delete all notifications for this store
      const storeNotifs = (notifications || []).filter(n => n.userId === id);
      for (const notif of storeNotifs) {
        batch.delete(doc(db, 'notifications', notif.id));
      }

      // Delete store document itself
      batch.delete(doc(db, 'stores', id));

      await batch.commit();

      // Update customers who follow this store
      const affectedCustomers = customers.filter(c => c.followedStores?.includes(id) || c.storeNotifications?.includes(id));
      for (const cust of affectedCustomers) {
        const updatedFollowed = (cust.followedStores || []).filter(fid => fid !== id);
        const updatedNotifs = (cust.storeNotifications || []).filter(nid => nid !== id);
        await updateDoc(doc(db, 'customers', cust.id), {
          followedStores: updatedFollowed,
          storeNotifications: updatedNotifs
        });
      }
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

  const seedDatabase = async (): Promise<{ success: boolean; message: string }> => {
    try {
      console.log("Seeding database start...");
      const batch = writeBatch(db);

      // 1. Seed Stores
      const sampleStores = [
        {
          id: "store-rafidain",
          ownerName: "أسعد الموسوي",
          shopName: "سوبرماركت الرافدين",
          category: "supermarket",
          username: "rafidain",
          phone: "07701234567",
          password: "storepassword",
          province: "بغداد",
          area: "الكرادة",
          landmark: "قرب ساحة التحريات",
          lat: 33.3152,
          lng: 44.3661,
          logo: "https://img.icons8.com/color/144/shopping-cart.png",
          deliveryPrice: 3000,
          isFreeDelivery: false,
          status: "active" as const,
          subscriptionId: "sub_premium",
          subscriptionExpiry: "2027-12-31",
          rating: 4.8,
          badges: ["verified", "premium"]
        },
        {
          id: "store-babylon",
          ownerName: "حيدر الكعبي",
          shopName: "أزياء بابل للرجال",
          category: "clothing",
          username: "babylon",
          phone: "07801234567",
          password: "storepassword",
          province: "البصرة",
          area: "العباسية",
          landmark: "شارع الوطن",
          lat: 30.5081,
          lng: 47.7835,
          logo: "https://img.icons8.com/color/144/t-shirt.png",
          deliveryPrice: 5000,
          isFreeDelivery: false,
          status: "active" as const,
          subscriptionId: "sub_premium",
          subscriptionExpiry: "2027-12-31",
          rating: 4.5,
          badges: ["verified"]
        },
        {
          id: "store-storm",
          ownerName: "كاروان هوليري",
          shopName: "موبايلات العاصفة",
          category: "mobiles",
          username: "storm",
          phone: "07501234567",
          password: "storepassword",
          province: "أربيل",
          area: "عينكاوة",
          landmark: "خلف ماجدة مول",
          lat: 36.1901,
          lng: 44.0089,
          logo: "https://img.icons8.com/color/144/iphone.png",
          deliveryPrice: 4000,
          isFreeDelivery: true,
          status: "active" as const,
          subscriptionId: "sub_premium",
          subscriptionExpiry: "2027-12-31",
          rating: 4.9,
          badges: ["premium"]
        },
        {
          id: "store-yasmine",
          ownerName: "نور الهدى",
          shopName: "كوزمتك الياسمين",
          category: "cosmetics",
          username: "yasmine",
          phone: "07712345678",
          password: "storepassword",
          province: "كربلاء",
          area: "شارع السناتر",
          landmark: "مجاور صيدلية الياسمين",
          lat: 32.6160,
          lng: 44.0249,
          logo: "https://img.icons8.com/color/144/makeup-brush.png",
          deliveryPrice: 3000,
          isFreeDelivery: false,
          status: "active" as const,
          subscriptionId: "sub_basic",
          subscriptionExpiry: "2027-12-31",
          rating: 4.7,
          badges: ["verified"]
        },
        {
          id: "store-honey",
          ownerName: "ستار الشمري",
          shopName: "حلويات العسل المصفى",
          category: "sweets",
          username: "honey",
          phone: "07812345678",
          password: "storepassword",
          province: "النجف",
          area: "شارع الروان",
          landmark: "مقابل كوفي شوب الروان",
          lat: 32.0259,
          lng: 44.3463,
          logo: "https://img.icons8.com/color/144/honeycomb.png",
          deliveryPrice: 2000,
          isFreeDelivery: true,
          status: "active" as const,
          subscriptionId: "sub_basic",
          subscriptionExpiry: "2027-12-31",
          rating: 4.6,
          badges: ["popular"]
        }
      ];

      for (const st of sampleStores) {
        batch.set(doc(db, 'stores', st.id), st);
      }

      // 2. Seed Products
      const sampleProducts = [
        {
          id: "prod-rafidain-1",
          storeId: "store-rafidain",
          name: "كيس أرز بسمتي فاخر 5كغ",
          description: "أرز هندي حبة طويلة فاخر مناسب للعزائم والوجبات العائلية المميزة.",
          price: 12500,
          discountType: "none" as const,
          discountValue: 0,
          finalPrice: 12500,
          image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300",
          status: "published" as const,
          isFreeDelivery: false,
          createdAt: new Date().toISOString(),
          category: "أرز وحبوب"
        },
        {
          id: "prod-rafidain-2",
          storeId: "store-rafidain",
          name: "حليب نيدو كامل الدسم 900غ",
          description: "مسحوق حليب مالت فورت المدعم بالفيتامينات والمعادن الهامة للأطفال والكبار.",
          price: 14000,
          discountType: "amount" as const,
          discountValue: 1500,
          finalPrice: 12500,
          image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=300",
          status: "published" as const,
          isFreeDelivery: false,
          createdAt: new Date().toISOString(),
          category: "حليب وأجبان"
        },
        {
          id: "prod-rafidain-3",
          storeId: "store-rafidain",
          name: "علبة شاي الكوزي الأصلي 100 كيس",
          description: "شاي سيلاني أسود نقي منتقى بعناية من أفضل المزارع لجلسات الشاي المميزة.",
          price: 4500,
          discountType: "none" as const,
          discountValue: 0,
          finalPrice: 4500,
          image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=300",
          status: "published" as const,
          isFreeDelivery: false,
          createdAt: new Date().toISOString(),
          category: "مشروبات"
        },
        {
          id: "prod-babylon-1",
          storeId: "store-babylon",
          name: "قميص كلاسك رسمي رجالي",
          description: "قميص قطن 100% مناسب للمناسبات الرسمية والعمل بتصميم مريح وأنيق.",
          price: 25000,
          discountType: "percent" as const,
          discountValue: 10,
          finalPrice: 22500,
          image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=300",
          status: "published" as const,
          isFreeDelivery: false,
          createdAt: new Date().toISOString(),
          category: "قمصان"
        },
        {
          id: "prod-babylon-2",
          storeId: "store-babylon",
          name: "بنطلون جينز كحلي فاخر",
          description: "جينز مستورد جودة عالية مضاد للتمدد والتلف بتفصيل كلاسيكي مميز.",
          price: 35000,
          discountType: "none" as const,
          discountValue: 0,
          finalPrice: 35000,
          image: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=300",
          status: "published" as const,
          isFreeDelivery: false,
          createdAt: new Date().toISOString(),
          category: "بنطلونات"
        },
        {
          id: "prod-storm-1",
          storeId: "store-storm",
          name: "آيفون 15 برو ماكس 256 غيغا",
          description: "هاتف آيفون الجديد باللون التيتانيوم الطبيعي مستورد مع ضمان حقيقي لمدة سنة بالكرتونة.",
          price: 1650000,
          discountType: "amount" as const,
          discountValue: 50000,
          finalPrice: 1600000,
          image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=300",
          status: "published" as const,
          isFreeDelivery: true,
          createdAt: new Date().toISOString(),
          category: "أجهزة آبل"
        },
        {
          id: "prod-storm-2",
          storeId: "store-storm",
          name: "سامسونج جالكسي S24 الترا",
          description: "جهاز سامسونج الرائد يدعم الذكاء الاصطناعي مع القلم ومساحة تخزين 512 غيغا بضمان الوكيل.",
          price: 1500000,
          discountType: "none" as const,
          discountValue: 0,
          finalPrice: 1500000,
          image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=300",
          status: "published" as const,
          isFreeDelivery: true,
          createdAt: new Date().toISOString(),
          category: "أجهزة سامسونج"
        },
        {
          id: "prod-yasmine-1",
          storeId: "store-yasmine",
          name: "مجموعة العناية بالبشرة ريتينول",
          description: "مجموعة متكاملة لتفتيح وتجديد خلايا البشرة والتخلص من التصبغات وعلامات التقدم بالسن.",
          price: 45000,
          discountType: "percent" as const,
          discountValue: 15,
          finalPrice: 38250,
          image: "https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&w=300",
          status: "published" as const,
          isFreeDelivery: false,
          createdAt: new Date().toISOString(),
          category: "سيروم وكريمات"
        },
        {
          id: "prod-yasmine-2",
          storeId: "store-yasmine",
          name: "عطر لافندر فرنسي أصلي 100مل",
          description: "عطر باريسي راقي برائحة اللافندر والياسمين المنعش بفوحان مميز وثبات يدوم 24 ساعة.",
          price: 60000,
          discountType: "none" as const,
          discountValue: 0,
          finalPrice: 60000,
          image: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=300",
          status: "published" as const,
          isFreeDelivery: false,
          createdAt: new Date().toISOString(),
          category: "عطور"
        },
        {
          id: "prod-honey-1",
          storeId: "store-honey",
          name: "علبة بقلاوة بالفستق الحلبي 1كغ",
          description: "بقلاوة بغدادية أصيلة خفيفة الشيرة ومقرمشة محشوة بأفخر أنواع الفستق الحلبي الطازج.",
          price: 25000,
          discountType: "none" as const,
          discountValue: 0,
          finalPrice: 25000,
          image: "https://images.unsplash.com/photo-1519676867240-f03562e65777?auto=format&fit=crop&w=300",
          status: "published" as const,
          isFreeDelivery: true,
          createdAt: new Date().toISOString(),
          category: "شرقيات وعربي"
        },
        {
          id: "prod-honey-2",
          storeId: "store-honey",
          name: "كليجة عراقية فاخرة مشكلة",
          description: "كليجة العيد مشكلة بالتمر والهيل والجوز المفروم والسمسم بطعم دهن الحر الأصيل.",
          price: 12000,
          discountType: "amount" as const,
          discountValue: 2000,
          finalPrice: 10000,
          image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300",
          status: "published" as const,
          isFreeDelivery: true,
          createdAt: new Date().toISOString(),
          category: "معجنات"
        }
      ];

      for (const pr of sampleProducts) {
        batch.set(doc(db, 'products', pr.id), pr);
      }

      // 3. Seed Recharge Codes
      const sampleRechargeCodes = [
        { id: "code-100", code: "IQ-100PTS-FREE", points: 100, status: "active" as const, createdAt: new Date().toISOString() },
        { id: "code-250", code: "IQ-250PTS-BONUS", points: 250, status: "active" as const, createdAt: new Date().toISOString() },
        { id: "code-500", code: "IQ-500PTS-GIFT", points: 500, status: "active" as const, createdAt: new Date().toISOString() },
        { id: "code-1000", code: "IQ-1000PTS-VIP", points: 1000, status: "active" as const, createdAt: new Date().toISOString() }
      ];

      for (const rc of sampleRechargeCodes) {
        batch.set(doc(db, 'recharge_codes', rc.id), rc);
      }

      // 4. Seed Settings / Global Banners
      const globalSettingsSeed = {
        autoApproveStores: true,
        featuredStoreIds: ["store-rafidain", "store-storm"],
        enableAutoNearby: true,
        nearbyStoreIds: ["store-rafidain", "store-honey"],
        adInterval: 5,
        ads: [
          {
            id: "banner-1",
            title: "مهرجان كليجة العيد",
            desc: "احصل على هدايا ونقاط مجانية عند التسوق والطلب من أرقى محلات العسل المصفى.",
            url: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200",
            targetType: "store",
            targetStoreId: "store-honey"
          },
          {
            id: "banner-2",
            title: "عروض السوبر ماركت!",
            desc: "أرز وبسمتي وحليب نيدو بجانبه توصيل مخفض بقيمة 3000 دينار فقط.",
            url: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200",
            targetType: "store",
            targetStoreId: "store-rafidain"
          },
          {
            id: "banner-3",
            title: "أحدث هواتف الآبل والسامسونج",
            desc: "بضمان حقيقي وصيانة معتمدة لجميع الأجهزة المستوردة توصيل آمن ومباشر لأربيل وجميع المحافظات.",
            url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200",
            targetType: "store",
            targetStoreId: "store-storm"
          }
        ]
      };

      batch.set(doc(db, 'settings', 'global'), globalSettingsSeed);

      await batch.commit();
      console.log("Seeding database success!");
      return { success: true, message: "تم توليد قاعدة البيانات التجريبية بنجاح" };
    } catch (err: any) {
      console.error("Seeding failed:", err);
      return { success: false, message: "فشل توليد البيانات: " + (err.message || err) };
    }
  };

  const generateVirtualData = async (storeCount: number, productCount: number): Promise<{ success: boolean; message: string }> => {
    try {
      console.log(`Generating ${storeCount} virtual stores and ${productCount} products per store...`);
      
      // 19 categories based strictly on user design guidelines (restaurants excluded)
      const storeCategories = [
        'supermarket',
        'meats',
        'sweets',
        'clothing',
        'shoes_bags',
        'cosmetics',
        'watches_jewelry',
        'mobiles',
        'computers',
        'appliances',
        'power',
        'furniture',
        'building_materials',
        'car_parts',
        'motorcycles',
        'stationary',
        'flowers',
        'sports',
        'pharmacy'
      ];

      const categoryLabels: Record<string, string> = {
        supermarket: 'سوبرماركت',
        meats: 'لحوم ومجمدات',
        sweets: 'حلويات ومكسرات',
        clothing: 'ملابس وأزياء',
        shoes_bags: 'أحذية وحقائب',
        cosmetics: 'كوزمتك وتجميل',
        watches_jewelry: 'ساعات وهدايا',
        mobiles: 'موبايلات وأجهزة',
        computers: 'حاسبات وشبكات',
        appliances: 'أجهزة منزلية',
        power: 'طاقة وإنارة',
        furniture: 'أثاث وديكور',
        building_materials: 'مواد إنشائية',
        car_parts: 'أدوات سيارات',
        motorcycles: 'دراجات نارية',
        stationary: 'قرطاسية وألعاب',
        flowers: 'زهور وهدايا',
        sports: 'تجهيزات رياضية',
        pharmacy: 'صيدليات وعناية'
      };

      const categoryIcons: Record<string, string> = {
        supermarket: 'shopping-cart',
        meats: 'food-and-wine',
        sweets: 'honeycomb',
        clothing: 't-shirt',
        shoes_bags: 'briefcase',
        cosmetics: 'makeup-brush',
        watches_jewelry: 'gem',
        mobiles: 'iphone',
        computers: 'laptop',
        appliances: 'tv',
        power: 'lightbulb',
        furniture: 'bed',
        building_materials: 'wrench',
        car_parts: 'car',
        motorcycles: 'motorcycle',
        stationary: 'open-book',
        flowers: 'flowery-heart',
        sports: 'dumbbell',
        pharmacy: 'pill'
      };

      const provincesList = ['بغداد', 'البصرة', 'الموصل', 'النجف', 'كربلاء', 'بابل', 'أربيل', 'السليمانية'];
      const areasList = ['الكرادة', 'المنصور', 'الجادرية', 'العرصات', 'الحارثية', 'زيونة', 'الغدير', 'الدورة'];
      const landmarksList = ['شارع المندلاوي', 'قرب مول النخبة', 'مقابل ساحة كهرمانة', 'خلف مطعم صاج الأمير'];
      const owners = ['مقتدى الحيدري', 'سرمد الخفاجي', 'مصطفى البابلي', 'زيد البغدادي', 'أمير الجبوري', 'نور الأسدي', 'حسين التميمي', 'زهراء الفتلاوي', 'رانية العبيدي', 'مرتضى الكناني'];

      const shopNamesTemplates: Record<string, string[]> = {
        supermarket: ['أسواق الهدى', 'سوبرماركت البركة', 'مجمع النخبة الغذائي', 'سوبرماركت دجلة والفرات', 'أسواق النرجس'],
        meats: ['مذبح الرافدين للحوم', 'قصابة بغداد الحديثة', 'لحوم ومجمدات دجلة الخير', 'الباشا للحوم الطازجة'],
        sweets: ['حلويات الجوادين الشهيرة', 'معجنات الأمير الحديثة', 'بيت الكنافة العراقية', 'شربت وحلويات زبيبة'],
        clothing: ['بوتيك الأناقة للرجال', 'أزياء بغداد الحديثة', 'معرض الملوك للألبسة', 'بوتيك إيف الحريري'],
        shoes_bags: ['خطوات الأناقة للأحذية', 'عالم الحقائب الفاخرة', 'معرض فلورنسا للأحذية', 'حقائب وجلود الرافدين'],
        cosmetics: ['جمال الياسمين ومكياج', 'كوزمتك فكتوريا شيك', 'تاج التجميل والمكياج', 'أفخم عطور دبي والماركات'],
        watches_jewelry: ['الزمرد للساعات والمجوهرات', 'ساعات بغداد الكلاسيكية', 'مجوهرات النخبة الفاخرة', 'تاج الصياغة الإيطالي'],
        mobiles: ['مركز النيزك للهواتف', 'عالم الآيفون والسامسونج', 'الرافدين للاتصالات', 'برق للهواتف الذكية'],
        computers: ['عالم الشبكات والحواسيب', 'الكومبيوتر السريع للتقنية', 'مجمع آي تي بغداد', 'حلول لابتوب الذكية'],
        appliances: ['الرافدين للأجهزة المنزلية', 'معرض كينود وال جي وشاومي', 'مجمع النور للتجهيزات الكهربائية'],
        power: ['شركة شمس للطاقة الشمسية', 'بغداد للإنارة والكهرباء', 'البرق لحلول التوفير الذكي'],
        furniture: ['مفروشات دبي الراقية', 'أثاث المنزل العصري والتركي', 'بيت الإنترير الحديث', 'خشب صاج عراقي فاخر'],
        building_materials: ['مستودع الفولاذ والمواد الإنشائية', 'الأمير للمقاولات والعدد والأدوات', 'منهل البناء الهندسي'],
        car_parts: ['الخلود لقطع وأدوات السيارات', 'عراقي كار للإكسسوارات', 'مركز العناية الفائقة بالسيارات'],
        motorcycles: ['السرعة للدراجات النارية', 'صيانة ومعدات الدراجات الحديثة', 'معرض بايكرز بغداد'],
        stationary: ['قرطاسية ومكتبة دجلة', 'عالم الألعاب والتعليم المرح', 'مطبعة النخلة للأدوات المدرسية'],
        flowers: ['زهور التوليب الحمراء', 'مشاتل الياسمين وهدايا بغداد', 'تنسيقات ورد جوري الساحرة'],
        sports: ['باور فيتنس للأدوات الرياضية', 'العراق لملابس وتجهيزات الرياضة', 'محارب الحديد لبناء الأجسام'],
        pharmacy: ['صيدلية الشفاء والعناية الطبية', 'صيدلية بغداد المركزية الحديثة', 'مستلزمات وعناية العائلة الطبية']
      };

      const productTemplates: Record<string, { nouns: string[], adjectives: string[], basePrice: number, imageKeywords: string[] }> = {
        supermarket: {
          nouns: ['كيس أرز بسمتي فاخر 5كغ', 'حليب نيدو كامل الدسم 900غ', 'علبة شاي الكوزي الأصلي', 'زيت طبخ عافية 1.5 لتر', 'معجون طماطم حمراء نضرة', 'علبة تونة بالزيت النباتي', 'صلصة الكاتشب الممتازة', 'جبنة موزاريلا مبشورة'],
          adjectives: ['درجة أولى', 'طبيعي ومميز', 'مستورد عالي الجودة', 'مغذي وصحي لجميع الأعمار', 'مضاعف التركيز ونقي', 'خفيف ولذيذ'],
          basePrice: 5000,
          imageKeywords: ['rice', 'milk', 'tea', 'cooking-oil', 'tomato-paste', 'tuna', 'cheese']
        },
        meats: {
          nouns: ['كباب دجاج مبرد', 'لحم عجل عراقي مفروم', 'ستيك لحم تندرلوين بقري', 'شيش طاووق متبل ببهارات يدوية', 'أفخاذ دجاج طازجة', 'كبة عراقية جاهزة للقلي', 'برجر لحم غنم مشوي', 'ضلوع لحم بقري'],
          adjectives: ['طازج وحلال ١٠٠٪', 'مبرد درجة أولى للطهي', 'لحم بلدي بلذة طازجة', 'متبل وجاهز ب خلطة سرية', 'ذات جودة مذهلة'],
          basePrice: 15000,
          imageKeywords: ['meat', 'beef', 'steak', 'chicken', 'kebab', 'burger']
        },
        sweets: {
          nouns: ['بقلاوة بالفستق والدهن الحر', 'كليجة عراقية بنكهة الهيل', 'صينية زنود الست بالقيمر البغدادي', 'ترافل الشيكولاتة البلجيكية الفاخرة', 'تارت الفواكه الطازجة', 'تشيز كيك الفراولة', 'علبة تمر محشي بالمكسرات والكراميل'],
          adjectives: ['طازجة يومياً بخفة مذهلة', 'محشوة بالمكسرات الممتازة', 'تذوب بالفم وطعم رائع جداً', 'صناعة تليق بضيوفك الكرام'],
          basePrice: 12000,
          imageKeywords: ['baklava', 'cookies', 'sweets', 'chocolate-truffles', 'cake', 'cheesecake', 'dates']
        },
        clothing: {
          nouns: ['قميص كلاسيك سليم فت', 'بنطلون جينز مريح ومتين', 'تيشيرت قطني صيفي ناعم', 'فستان سهرة حريري رائع', 'معطف جاكيت شتوي ودافئ', 'عباءة نسائية راقية ومطرزة', 'بذلة رسمية كاملة قطعتين'],
          adjectives: ['خامات ممتازة وباردة الملمس', 'تصميم تركي عصري مميز', 'ألوان زاهية ومقاومة للبهتان', 'مقاس مثالي وتفصيل يدوي دقيق'],
          basePrice: 25000,
          imageKeywords: ['shirt', 'jeans-pants', 't-shirt', 'dress', 'jacket', 'mens-suit']
        },
        shoes_bags: {
          nouns: ['حذاء رياضي مريح للمشي', 'حقيبة يد جلد طبيعي أنيقة', 'حذاء رسمي كلاسيك رجالي', 'حقيبة ظهر للابتوب والجامعة مضادة للماء', 'محفظة جيب كلاسيكية للبطاقات', 'صندل صيفي خفيف ومرن'],
          adjectives: ['جلد طبيعي عالي المتانة', 'تصميم أنيق يدعم القدم بامتياز', 'مقاوم للصدمات والخدش تماماً', 'لمسة كلاسيكية إيطالية'],
          basePrice: 30000,
          imageKeywords: ['sports-shoes', 'leather-handbag', 'classic-shoes', 'backpack', 'wallet', 'sandal']
        },
        cosmetics: {
          nouns: ['سيروم نياسيناميد مغذ للبشرة', 'كريم ترطيب مكثف بالهيالورونيك', 'عطر فرنسي فواح ومقاوم للاختفاء', 'ملمع شفاه طبيعي بالكرز الخالص', 'زيت الأرغان المغربي لتغذية الشعر', 'واقي شمس حماية قصوى خفيف الوجه'],
          adjectives: ['مواد طبيعية آمنة للبشرة بامتياز', 'ثبات مضمون ورائحة ساحرة', 'معالج تجميلي وموصى به طبياً', 'يعطي حيوية ونضارة تامة'],
          basePrice: 18000,
          imageKeywords: ['serum', 'moisturizer', 'perfume', 'lipstick', 'hair-oil', 'sunscreen']
        },
        watches_jewelry: {
          nouns: ['ساعة يد كلاسيكية من الفولاذ الدائم', 'ساعة ذكية بشاشة عالية السطوع', 'خاتم فضة عيار 925 مرصع بالعقيق', 'قلادة رقيقة بتفاصيل ذهبية فرنسية', 'سوار يد مريح وجذاب'],
          adjectives: ['مقاومة للماء والخدش بجودة فائقة', 'تصميم استثنائي يبرز معصمك', 'ذهب خالص بطلاء يدوم طويلاً', 'جذابة تتماشى مع كل الملابس'],
          basePrice: 45000,
          imageKeywords: ['watch', 'smartwatch', 'silver-ring', 'necklace', 'bracelet']
        },
        mobiles: {
          nouns: ['شاحن جداري سريع 45 واط معتمد', 'سماعات أذن لاسلكية بعزل ضوضاء ممتاز', 'بنك طاقة محمول سعة 20 ألف', 'كابل شحن سريع مجدول غير قابل للتلف', 'قاعدة تثبيت للهواتف في السيارة بالمغناطيس'],
          adjectives: ['سرعة وكفاءة ممتازة', 'عمر بطارية رائع ومعتمد', 'متانة فائقة وكيبلات مرنة للغاية', 'تصميم يناسب جميع السيارات'],
          basePrice: 15000,
          imageKeywords: ['charger', 'earphones', 'power-bank', 'usb-cable', 'phone-holder']
        },
        computers: {
          nouns: ['لوحة مفاتيح ميكانيكية ملونة آر جي بي', 'ماوس قيمنق احترافي حساس للغاية', 'راوتر منزلي واي فاي 6 تغطية جبارة', 'سماعة عزل صوتي للألعاب والاجتماعات', 'وحدة تخزين إس إس دي سريعة جداً 1 تيرا'],
          adjectives: ['أداء فائق مع استجابة بملي ثانية', 'مريحة للاستعمال لساعات ممتدة', 'تأمين بنظام حماية كاملة', 'جودة أصلية ممتازة للتقنية'],
          basePrice: 40000,
          imageKeywords: ['keyboard', 'gaming-mouse', 'wifi-router', 'headphones', 'ssd']
        },
        appliances: {
          nouns: ['خلاط كهربائي عالي العزم', 'مكواة بخار عامودية سريعة', 'جهاز صانع القهوة والاسبريسو المحترف', 'غلاية مياه ستانلس متينة', 'مكنسة كهربائية لاسلكية ذكية شفط قوي'],
          adjectives: ['توفير هائل في استهلاك الكهرباء', 'تصميم متطور وتكنولوجيا تعمر طويلاً', 'تحضير سريع للقهوة اللذيذة وبسيطة', 'تشغيل هادئ بدون ضوضاء'],
          basePrice: 65000,
          imageKeywords: ['blender', 'ironing', 'coffee-maker', 'kettle', 'vacuum-cleaner']
        },
        power: {
          nouns: ['مصباح ليد ذكي بـ16 مليون لون', 'كشاف طاقة شمسية خارجي قوي ومقاوم للظروف', 'شريط إضاءة ليد مرن 5 أمتار بريموت', 'لوح شحن شمسي للجوالات'],
          adjectives: ['إضاءة ناعمة وصديقة للعين ومريحة', 'مقاوم للأمطار والحرارة الشديدة', 'توفير خارق للكهرباء بنسبة 80%'],
          basePrice: 8000,
          imageKeywords: ['lightbulb', 'solar-light', 'strip-light', 'solar-panel']
        },
        furniture: {
          nouns: ['كرسي مكتب مريح بمسند طبي الظهر', 'طاولة قهوة خشبية بتصميم مميز', 'رف جداري لتنظيم الكتب من الصاج', 'وسادة نوم ميموري فوم طبية مريحة'],
          adjectives: ['أخشاب متينة تدوم لأجيال', 'يضفي مظهر راق على منزلك وغرفتك', 'تصميم يحمي رقبتك والعمود الفقري', 'سهلة الترتيب وتوفير المساحة'],
          basePrice: 35000,
          imageKeywords: ['office-chair', 'coffee-table', 'bookshelf', 'pillow']
        },
        building_materials: {
          nouns: ['حقيبة يدوية ٢٤ قطعة توليفية متكاملة', 'شريط قياس يدوي ليزر ذكي', 'مفك براغي كهربائي لاسلكي ببطارية وعزم', 'لاصق سيليكون طبيعي مقاوم للماء'],
          adjectives: ['صلب عالي التحمل ومقاوم للتصدع', 'قياس ليزري دقيق وواضح لثوانٍ', 'بطارية تدوم لعمل متواصل وشاق'],
          basePrice: 20000,
          imageKeywords: ['tools-kit', 'laser-measure', 'electric-screwdriver', 'silicone-glue']
        },
        car_parts: {
          nouns: ['معطر هواء برائحة الغابات الاستوائية للسيارة', 'مضخة هواء محول للإطارات سريع النفاذ', 'شاحن سيارة ذكي مزدوج المنافذ', 'ممسحة زجاج نانو ناعمة لمنع تضاريس الماء'],
          adjectives: ['روائح طبيعية تبعث على الانتعاش والنشاط', 'سريعة ومحمولة ومثالية للحالات الطارئة', 'شحن آمن كلياً يمنع الحرارة الزائدة'],
          basePrice: 10000,
          imageKeywords: ['car-freshener', 'tire-pump', 'car-charger', 'wiper-blades']
        },
        motorcycles: {
          nouns: ['خوذة رأس رياضية دراجات بعزل هيدروليكي', 'قفازات دراجات نارية مضادة للانزلاق ومبطنة', 'قفل دراجات حديد ثقيل مشفر للأمان', 'غطاء دراجات نانو معالج للأشعة الشمسية'],
          adjectives: ['حماية قصوى وتخفيف الصدمات والرياح', 'حياكة واقية متينة تمنع الكسور والخدوش', 'صعب الاختراق ويضمن راحة بالك التامة'],
          basePrice: 45000,
          imageKeywords: ['helmet', 'motorcycle-gloves', 'bike-lock', 'motorcycle-cover']
        },
        stationary: {
          nouns: ['دفتر ملاحظات بغلاف جلدي وورق سميك', 'قلم حبر يدوي منمق كلاسيكي وبدقة خط', 'حقيبة تلوين وألغاز تعليمية للأطفال', 'لوح رسم ذكي باللمس بشاشة الكترونية مريحة'],
          adjectives: ['ورق ناعم يدعم الحبر ولا يتلف', 'تعليمي وممتع وآمن كلياً للأطفال الصغار', 'تنظيم وحمالات ممتازة تحمي الكراسات'],
          basePrice: 6000,
          imageKeywords: ['notebook', 'classic-pen', 'coloring-lessons', 'drawing-tablet']
        },
        flowers: {
          nouns: ['باقة ورد جوري أحمر منسق بشكل نقي وطبيعي', 'علبة هدايا راقية بشريط ستان ومكتوب بالذهب', 'فازة زهور زجاجية بتصميم كلاسيكي للطاولة', 'نبتة صبار الصخور للمكتب ذكية العناية'],
          adjectives: ['رائحة فواحة تفوح في أرجاء المكان لثلاثة أيام', 'تنسيق يدوي فني يشرح الصدر ويسعد المستقبل', 'عناية سهلة ومظهر متفرد'],
          basePrice: 15000,
          imageKeywords: ['red-roses', 'flowers-gift', 'flower-vase', 'cactus-plant']
        },
        sports: {
          nouns: ['سجادة يوجا صحية مقاومة للتزحلق سميكة', 'طقم أوزان دمبل قابل للتجميع بوزن 15كج', 'حبل قفز مغناطيسي يحسب القفز والسعرات الحرارية', 'مطرة مياه رياضية بمعدلات شرب لترية'],
          adjectives: ['صنع لممارسة التمرين في منزلك بكل راحة وأمان', 'سلس ومحسب بدقة ويأتي بغلاف تخزين مميز', 'خامات خالية من الروائح وتتحمل الضغط والتعرق'],
          basePrice: 12000,
          imageKeywords: ['yoga-mat', 'dumbbells-set', 'jump-rope', 'water-bottle']
        },
        pharmacy: {
          nouns: ['مرطب شفاه طبي ومعالج بجوز الهند والشوفان', 'جهاز قياس الضغط الالكتروني بشاشة دقيقة رقمية', 'معقم يدين طبي رغوة خالي من الحساسية والكحول الجاف', 'لاصق طبي للظهر لتخفيف المفاصل بالنعناع والحرارة'],
          adjectives: ['آمن ومرخص ومعتمد من وزارة الصحة والرقابة', 'يعطي حماية تدوم لأربع وعشرين ساعة', 'تسكين دقيق وفوري يمنحك راحة وسكينة بالحركة'],
          basePrice: 9000,
          imageKeywords: ['lip-balm', 'blood-pressure', 'hand-sanitizer', 'pain-patch']
        }
      };

      const generatedStoresList: Store[] = [];
      const generatedProductsList: Product[] = [];

      for (let i = 0; i < storeCount; i++) {
        const cat = storeCategories[i % storeCategories.length];
        const label = categoryLabels[cat];
        const iconName = categoryIcons[cat];
        const storeId = `virtual-store-${Date.now()}-${Math.floor(Math.random() * 100000)}-${i}`;
        
        const templates = shopNamesTemplates[cat];
        const shopTemplate = templates[Math.floor(Math.random() * templates.length)];
        const shopName = shopTemplate;
        
        const virtualStore: Store = {
          id: storeId,
          ownerName: owners[Math.floor(Math.random() * owners.length)],
          shopName: shopName,
          category: cat,
          username: `vstore_${Math.floor(Math.random() * 90000 + 10000)}`,
          phone: `07${Math.floor(Math.random() * 900000000 + 100000000)}`,
          password: 'vpassword',
          province: provincesList[Math.floor(Math.random() * provincesList.length)],
          area: areasList[Math.floor(Math.random() * areasList.length)],
          landmark: landmarksList[Math.floor(Math.random() * landmarksList.length)],
          lat: 33 + Math.random() * 2,
          lng: 44 + Math.random() * 2,
          logo: `https://img.icons8.com/color/144/${iconName}.png`,
          deliveryPrice: 3000 + Math.floor(Math.random() * 3) * 1000,
          isFreeDelivery: Math.random() > 0.7,
          status: 'active',
          subscriptionId: 'sub_monthly',
          subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          rating: 4.2 + Math.random() * 0.8,
          badges: Math.random() > 0.5 ? ['verified'] : [],
          is_virtual: true
        };

        generatedStoresList.push(virtualStore);

        // Procedural Infinite Generators for Products! Guaranteed unique names & dynamic images
        const prodData = productTemplates[cat];
        
        for (let j = 0; j < productCount; j++) {
          const noun = prodData.nouns[j % prodData.nouns.length];
          const adjective = prodData.adjectives[(j + i) % prodData.adjectives.length];
          const keyword = prodData.imageKeywords[j % prodData.imageKeywords.length];
          
          // Generate unique product details even if generating 100s of products per store
          const uniquePart = j >= prodData.nouns.length ? ` - موديل رقم ${j + 1}` : '';
          const productName = `${noun} ${adjective}${uniquePart}`;
          const productDesc = `منتج ممتاز من ${shopName}. ${productName} مصمم خصيصاً لتوفير الفائدة القصوى والراحة لزبائننا وعائلاتهم الكرام. منتج ذو مواصفات جودة متماشية مع المقاييس وتجربة مستخدم مذهلة ويدوم طويلاً.`;
          
          const variationPricePercent = 0.8 + ((j % 5) * 0.1); 
          const productPrice = Math.round((prodData.basePrice * variationPricePercent) / 250) * 250; // rounded to nearest Iraqi dinar quarters
          
          const productId = `virtual-prod-${Date.now()}-${Math.floor(Math.random() * 100000)}-${i}-${j}`;
          
          // Using a high quality stock image search query with random seed to guarantee completely distinct images and no duplicates
          const productImage = `https://images.unsplash.com/photo-${getProductImageByKeyword(keyword, j)}?auto=format&fit=crop&w=400&q=75`;

          const virtualProduct: Product = {
            id: productId,
            storeId: storeId,
            name: productName,
            description: productDesc,
            price: productPrice,
            discountType: Math.random() > 0.8 ? 'percent' : 'none',
            discountValue: Math.random() > 0.8 ? 10 : 0,
            finalPrice: productPrice,
            image: productImage,
            status: 'published',
            isFreeDelivery: virtualStore.isFreeDelivery || Math.random() > 0.8,
            createdAt: new Date().toISOString(),
            category: label, // Categorization label mapped properly for store product directories 
            is_virtual: true
          };

          generatedProductsList.push(virtualProduct);
        }
      }

      // Chunked sequential batch operations to write any arbitrary count safely to Firestore without hitches (max 400 per batch)
      const allOps = [
        ...generatedStoresList.map(s => ({ type: 'set' as const, path: `stores/${s.id}`, data: s })),
        ...generatedProductsList.map(p => ({ type: 'set' as const, path: `products/${p.id}`, data: p }))
      ];

      const chunkSize = 400;
      for (let offset = 0; offset < allOps.length; offset += chunkSize) {
        const chunk = allOps.slice(offset, offset + chunkSize);
        const batch = writeBatch(db);
        for (const op of chunk) {
          batch.set(doc(db, op.path.split('/')[0], op.path.split('/')[1]), op.data);
        }
        await batch.commit();
        console.log(`Committed chunk of ${chunk.length} items to Firestore...`);
      }

      return { success: true, message: `🎉 تم توليد عدد ${storeCount} متاجر بنجاح بمهام تصنيفية كاملة مع عدد ${productCount} منتجات فريدة لكل منها (المجموع: ${generatedProductsList.length} منتجات ترويجية جاهزة للاستخدام)!` };
    } catch (err: any) {
      console.error("Failed to generate virtual data:", err);
      return { success: false, message: 'فشل التوليد: ' + (err.message || err) };
    }
  };

  // Helper to map specific keywords to distinct, real high-quality images
  const getProductImageByKeyword = (keyword: string, fallbackIndex: number): string => {
    const keywordHashes: Record<string, string> = {
      // supermarket
      'rice': '1586201375748-25d2c4b31278',
      'milk': '1563636619-e9143da7973b',
      'tea': '1576092768241-dec231879fc3',
      'cooking-oil': '1474979266404-7eaacbcd87c5',
      'tomato-paste': '1607305387299-a3d9611cd46f',
      'tuna': '1544551763-46a013bb70d5',
      'cheese': '1486297066381-33ad74335474',
      'ketchup': '1607305387299-a3d9611cd46f',
      // meats
      'meat': '1607623814075-e51df1bdc82f',
      'beef': '1544025162-d76694265947',
      'steak': '1603048588665-791ca8aea617',
      'chicken': '1532550900-a75e1a7600ab',
      'kebab': '1615557960901-b4187a51d731',
      'burger': '1568901346375-23c9450c58cd',
      // sweets
      'baklava': '1519676867240-f03562e65777',
      'cookies': '1499636136210-6f4ee91a5b6e',
      'sweets': '1587314168485-3236d6710814',
      'chocolate-truffles': '1544967082-d9d25d772223',
      'cake': '1578985545062-69928b1d9587',
      'cheesecake': '1533134242443-d4fd215305ad',
      'dates': '1528825871115-3581a5387919',
      // clothing
      'shirt': '1521572267360-ee0c2909d518',
      'jeans-pants': '1542272604-787c3835535d',
      't-shirt': '1521572267360-ee0c2909d518',
      'dress': '1596755094514-f87e34085b2c',
      'jacket': '1551028719-00167b16eac5',
      'mens-suit': '1594938298603-c8148c4dae35',
      // shoes_bags
      'sports-shoes': '1542291026-7eec264c27ff',
      'leather-handbag': '1584917865442-de89df76afd3',
      'classic-shoes': '1533867617858-e4023cdd82e2',
      'backpack': '1553062407-98eeb64c6a62',
      'wallet': '1627252891391-4ade1ecdd294',
      'sandal': '1562273138-05202ed9a0cd',
      // cosmetics
      'serum': '1626806787461-102c1624abf2',
      'moisturizer': '1608248597481-496100c80836',
      'perfume': '1541643600914-78b084683601',
      'lipstick': '1586495777744-441ca0a70244',
      'hair-oil': '1615396899166-ef1f6cdd75f2',
      'sunscreen': '1598440947619-2c35fc9aa908',
      // watches_jewelry
      'watch': '1524592094714-0f0654e20314',
      'smartwatch': '1508685096483-a784e5dc4c8f',
      'silver-ring': '1605100804763-247f67b3557d',
      'necklace': '1599643478518-a784e5dc4c8f',
      'bracelet': '1611591437281-46061498b311',
      // mobiles
      'charger': '1583863788434-e58a36330cf0',
      'earphones': '1505740420928-5e560c06d30e',
      'power-bank': '1609081219099-40fab910b2df',
      'usb-cable': '1550136513-0b05b324d309',
      'phone-holder': '1586495777744-441ca0a70244',
      // computers
      'keyboard': '1587831990711-23ca6441447b',
      'gaming-mouse': '1615663245857-ac93bb7c39e7',
      'wifi-router': '1544244015-0df4b3ffc6b0',
      'headphones': '1603302576837-37561b2fe53b',
      'ssd': '1555664424-001d24472ef0',
      // appliances
      'blender': '1578640325350-2dbe6573c734',
      'ironing': '1474136450637-299f0e3f88bc',
      'coffee-maker': '1495474472288-44224151b7a2',
      'kettle': '1574269665809-0c3de85b1fd9',
      'vacuum-cleaner': '1558317373-14df471a5f97',
      // power
      'lightbulb': '1550523298-50b3dced93cf',
      'solar-light': '1509395171717-111111ba1ba9',
      'strip-light': '1565814636199-ae8133055c1c',
      'solar-panel': '1509395171717-11e2f1ba1ba9',
      // furniture
      'office-chair': '1505693416388',
      'coffee-table': '1532372320572-cda456417aba',
      'bookshelf': '1544816155-7dfdd4a3c963',
      'pillow': '1584100936595-c0654bc57b52',
      // building_materials
      'tools-kit': '1581147036324-c17ac41dfa6c',
      'laser-measure': '1504148455328-c376907d081c',
      'electric-screwdriver': '1530124564343-686112c39053',
      'silicone-glue': '1595225484874',
      // car_parts
      'car-freshener': '1515372039777',
      'tire-pump': '1507136566006-188414b3a4FC',
      'car-charger': '1563720223185',
      'wiper-blades': '1486006920555',
      // motorcycles
      'helmet': '1449426468159',
      'motorcycle-gloves': '1558981806',
      'bike-lock': '1568772585407',
      'motorcycle-cover': '1591974989141',
      // stationary
      'notebook': '1456513080510',
      'classic-pen': '1513542789411',
      'coloring-lessons': '1506880018603',
      'drawing-tablet': '1586075010923',
      // flowers
      'red-roses': '1526047932273',
      'flowers-gift': '1561181286',
      'flower-vase': '1525310072745',
      'cactus-plant': '1490757960794',
      // sports
      'yoga-mat': '1517838277536',
      'dumbbells-set': '1518611012118',
      'jump-rope': '1584735935682',
      'water-bottle': '1521412644188',
      // pharmacy
      'lip-balm': '1584017911766',
      'blood-pressure': '1584308666744',
      'hand-sanitizer': '1550572017',
      'pain-patch': '1476137682828'
    };
    return keywordHashes[keyword] || '1542838132-92c53300491e';
  };

  // Helper utility to supply reliable stock image hashes to prevent broken Unsplash images
  const getPresetImageHash = (cat: string, index: number): string => {
    const hashes: Record<string, string[]> = {
      supermarket: ['1542838132-92c53300491e', '1578916171728-46686eac8d58', '1588964895597-cfccd6e2dbf9', '1543083503-0872714be854'],
      meats: ['1607623814075-e51df1bdc82f', '1544025162-d76694265947', '1603048588665-791ca8aea617', '1532550900-a75e1a7600ab'],
      sweets: ['1509440159596-0249088772ff', '1519676867240-f03562e65777', '1587314168485-3236d6710814', '1551024601-bec78aea704b'],
      clothing: ['1521572267360-ee0c2909d518', '1596755094514-f87e34085b2c', '1542272604-787c3835535d', '1434389677669-e08b4cac3105'],
      shoes_bags: ['1549298916-b41d501d3772', '1590874103328-eac38a683ce7', '1584917865442-de89df76afd3', '1553062407-98eeb64c6a62'],
      cosmetics: ['1608248597481-496100c80836', '1598440947619-2c35fc9aa908', '1556228720-195a672e8a03', '1541643600914-78b084683601'],
      watches_jewelry: ['1524592094714-0f0654e20314', '1539874754764-5a96559165b0', '1599643478518-a784e5dc4c8f', '1509198397868-475647b2a1e5'],
      mobiles: ['1511707171634-5f897ff02aa9', '1583863788434-e58a36330cf0', '1505740420928-5e560c06d30e', '1601784551486-292ef53665c3'],
      computers: ['1587831990711-23ca6441447b', '1615663245857-ac93bb7c39e7', '1544244015-0df4b3ffc6b0', '1603302576837-37561b2fe53b'],
      appliances: ['1588854337236-6889d631faa8', '1574269665809-0c3de85b1fd9', '1522335789203-aabd1fc54bc9', '1585238342024-78d387f1a62f'],
      power: ['1565814636199-ae8133055c1c', '1507646227500-4d389b0012be', '1513506003901-1e6a229e2d15', '1470489996057-07ab68038b36'],
      furniture: ['1524758631624-e2822e304c36', '1586023492125-27b2c045efd7', '1505693416388-ac5ce068fe85', '1555041469-a586c61ea9bc'],
      building_materials: ['1581147036324-c17ac41dfa6c', '1530124564343-686112c39053', '1504148455328-c376907d081c', '1513694203232-719a280e022f'],
      car_parts: ['1486006920555-c77dce18193b', '1563720223185-11003d516935', '1617886322168-72b886573c3c', '1507136566006-188414b3a4FC'],
      motorcycles: ['1449426468159-d96dbf08f19f', '1558981806-ec527fa84c39', '1568772585407-9361f9bf3a87', '1591974989141-ee0a9057b56f'],
      stationary: ['1456513080510-7bf3a84b82f8', '1513542789411-b6a5d4f31634', '1506880018603-83d5b814b5a6', '1586075010923-2dd4570fb338'],
      flowers: ['1526047932273-341f2a7631f9', '1561181286-d3fee7d55364', '1525310072745-f49212b5ac6d', '1490757960794-48f90295977a'],
      sports: ['1517838277536-f5f99be501cd', '1518611012118-696072aa579a', '1584735935682-2f2b69dff9d2', '1521412644188-1486cdfa09c5'],
      pharmacy: ['1584017911766-d451b3d0e843', '1584308666744-24d5c474f2ae', '1550572017-edd951b55104', '1476137682828-57e0f68e0a13']
    };
    const list = hashes[cat] || hashes['supermarket'];
    return list[index % list.length];
  };

  const deleteAllVirtualData = async (): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('Deleting all virtual stores and products...');
      // Get all virtual stores and products
      const virtualStores = stores.filter(s => s.is_virtual || s.id.startsWith('virtual-') || (s as any).isVirtual);
      const virtualProducts = products.filter(p => p.is_virtual || p.id.startsWith('virtual-') || (p as any).isVirtual);
      
      const virtualStoreIds = new Set(virtualStores.map(s => s.id));
      
      // Get all associated collections for virtual stores
      const virtualPromoCodes = promoCodes.filter(p => virtualStoreIds.has(p.storeId || '') || p.id.startsWith('virtual-'));
      const virtualOrders = orders.filter(o => virtualStoreIds.has(o.storeId || '') || o.id.startsWith('virtual-'));
      const virtualReviews = storeReviews.filter(r => virtualStoreIds.has(r.storeId || '') || r.id.startsWith('virtual-'));
      const virtualFlashSaleRequests = flashSaleRequests.filter(req => virtualStoreIds.has(req.storeId || '') || req.id.startsWith('virtual-'));
      const virtualNotifications = (notifications || []).filter(n => virtualStoreIds.has(n.userId) || n.id.startsWith('virtual-') || n.id.startsWith('sub_alert_virtual-'));

      const allOps: string[] = [
        ...virtualStores.map(s => `stores/${s.id}`),
        ...virtualProducts.map(p => `products/${p.id}`),
        ...virtualPromoCodes.map(p => `promo_codes/${p.id}`),
        ...virtualOrders.map(o => `orders/${o.id}`),
        ...virtualReviews.map(r => `store_reviews/${r.id}`),
        ...virtualFlashSaleRequests.map(req => `flash_sale_requests/${req.id}`),
        ...virtualNotifications.map(n => `notifications/${n.id}`)
      ];

      const chunkSize = 400;
      for (let offset = 0; offset < allOps.length; offset += chunkSize) {
        const chunk = allOps.slice(offset, offset + chunkSize);
        const batch = writeBatch(db);
        for (const itemPath of chunk) {
          const [colName, docId] = itemPath.split('/');
          batch.delete(doc(db, colName, docId));
        }
        await batch.commit();
        console.log(`Deleted chunk of ${chunk.length} items from Firestore...`);
      }

      return { success: true, message: `تم بنجاح إزالة جميع البيانات الافتراضية (${virtualStores.length} متاجر، ${virtualProducts.length} منتجات) مع كافة الطلبات والعروض والإشعارات والرموز المرتبطة بها!` };
    } catch (err: any) {
      console.error("Failed to delete all virtual data:", err);
      return { success: false, message: 'فشل الحذف: ' + (err.message || err) };
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
              console.log('[WhatsApp API Simulation] Link sent: https://iraqicart.com/renew?storeId=' + store.id);
            }
          }
        } catch (err) {
          console.error('Subscription alert check error:', err);
        }
      }
    } catch (e) {
      console.error('Error running automated subscription check:', e);
    }
  };

  useEffect(() => {
    if (stores.length > 0) {
      checkAndTriggerSubscriptionExpiryAlerts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores.length, notifications.length]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <AppContext.Provider value={{
      provinces: IRAQ_PROVINCES, stores, products, customers, orders, promoCodes, notifications, currentCustomer, currentMerchant, currentAdmin, adminSettings, subscriptionPlans, flashSales, flashSaleRequests, storeReviews,
      getCustomerSeqId, getOrderSeqId,
      setOrders,
      setCurrentCustomer, setCurrentMerchant, setCurrentAdmin, registerCustomer, updateCustomerProfile, toggleFollowStore, toggleStoreNotification, placeOrder, convertPointsToPromo, addCustomerPoints, submitStoreReview, updateStoreReview, deleteStoreReview, registerMerchant, updateStoreProfile, addProduct, updateProduct, deleteProduct, createPromoCode, updatePromoCode, togglePromoCodeStatus, updateOrder, updateOrderStatus, addNotification, markNotificationAsRead, markAllNotificationsAsRead, sendAdminNotification,
      rechargeCodes, generateRechargeCodes, redeemRechargeCode, deleteRechargeCode,
      toggleAutoApprove, updateSubscriptionPrice, updateStoreStatus, updateStoreBadges, adminUpdateStore, toggleCustomerBlock, deleteCustomer, toggleStoreBan, deleteStore, deletePromoCode, updateAdminSettings,
      createFlashSale, updateFlashSaleStatus, updateFlashSaleDates, deleteFlashSale, requestJoinFlashSale, updateFlashSaleRequestStatus, seedDatabase,
      generateVirtualData, deleteAllVirtualData
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
