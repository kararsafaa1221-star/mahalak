/**
 * Centralized admin mutations + activity logging.
 * All dashboard write operations live here — pages/context only delegate.
 */
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  increment,
  serverTimestamp,
  runTransaction,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db, uploadProductImageStorage } from '../lib/firebase';
import { runAdminAction, type AdminActor } from '../lib/adminActionRunner';
import type { ActivityLogMeta } from '../lib/activityLogI18n';
import type {
  Store,
  Customer,
  Order,
  Product,
  PromoCode,
  FlashSale,
  FlashSaleRequest,
  StoreReview,
  PayoutRequest,
  AppNotification,
} from '../types';
import { IRAQ_PROVINCES } from '../constants';

export interface AdminServiceContext {
  stores: Store[];
  customers: Customer[];
  orders: Order[];
  products: Product[];
  promoCodes: PromoCode[];
  flashSales: FlashSale[];
  flashSaleRequests: FlashSaleRequest[];
  storeReviews: StoreReview[];
  notifications: AppNotification[];
  adminSettings: Record<string, unknown>;
  adminStaff?: { id: string; name?: string; email?: string }[];
  addNotification: (notif: Record<string, unknown>) => Promise<void>;
  addBulkNotifications: (notifs: Record<string, unknown>[]) => Promise<void>;
  setAdminSettings?: (settings: Record<string, unknown>) => void;
}

export type AdminService = ReturnType<typeof createAdminService>;

export function createAdminService(actor: AdminActor) {
  // ─── Stores ───────────────────────────────────────────────────────────────
  async function updateStoreStatus(id: string, status: string, ctx: AdminServiceContext) {
    const store = ctx.stores.find((s) => s.id === id);
    return runAdminAction(actor, 'stores', 'store.status_update', id, { name: store?.shopName, status }, async () => {
      await updateDoc(doc(db, 'stores', id), { status });
      let msg = '';
      if (status === 'active') msg = 'تم تفعيل حساب متجرك بنجاح. يمكنك الآن استقبال الطلبات!';
      if (status === 'suspended') msg = 'تم إيقاف حساب متجرك مؤقتاً. يرجى التواصل مع الدعم الفني.';
      if (msg) {
        await ctx.addNotification({ userId: id, role: 'merchant', type: 'system', title: 'تحديث حالة المتجر', message: msg, targetId: id });
      }
    });
  }

  async function updateStoreBadges(id: string, badges: string[], ctx: AdminServiceContext) {
    const store = ctx.stores.find((s) => s.id === id);
    return runAdminAction(actor, 'stores', 'store.badges_update', id, { name: store?.shopName }, async () => {
      await updateDoc(doc(db, 'stores', id), { badges });
    });
  }

  async function adminUpdateStore(storeId: string, data: Partial<Store>, ctx: AdminServiceContext) {
    const store = ctx.stores.find((s) => s.id === storeId);
    return runAdminAction(actor, 'stores', 'store.update', storeId, { name: store?.shopName ?? data.shopName as string }, async () => {
      await updateDoc(doc(db, 'stores', storeId), data as Record<string, unknown>);
    });
  }

  async function toggleStoreBan(id: string, ctx: AdminServiceContext) {
    const store = ctx.stores.find((s) => s.id === id);
    if (!store) return;
    return runAdminAction(
      actor,
      'stores',
      store.isBanned ? 'store.unban' : 'store.ban',
      id,
      { name: store.shopName },
      async () => {
        await updateDoc(doc(db, 'stores', id), { isBanned: !store.isBanned });
      },
    );
  }

  async function deleteStore(id: string, ctx: AdminServiceContext) {
    const store = ctx.stores.find((s) => s.id === id);
    return runAdminAction(actor, 'stores', 'store.delete', id, { name: store?.shopName }, async () => {
      const refsToDelete: ReturnType<typeof doc>[] = [];
      const [productsSnap, promoSnap, ordersSnap, flashReqSnap, reviewsSnap, notifSnap, payoutSnap] = await Promise.all([
        getDocs(query(collection(db, 'products'), where('storeId', '==', id))),
        getDocs(query(collection(db, 'promo_codes'), where('storeId', '==', id))),
        getDocs(query(collection(db, 'orders'), where('storeId', '==', id))),
        getDocs(query(collection(db, 'flash_sale_requests'), where('storeId', '==', id))),
        getDocs(query(collection(db, 'store_reviews'), where('storeId', '==', id))),
        getDocs(query(collection(db, 'notifications'), where('userId', '==', id))),
        getDocs(query(collection(db, 'payoutRequests'), where('merchantId', '==', id))),
      ]);
      [productsSnap, promoSnap, ordersSnap, flashReqSnap, reviewsSnap, notifSnap, payoutSnap].forEach((snap) => {
        snap.forEach((d) => refsToDelete.push(d.ref));
      });
      refsToDelete.push(doc(db, 'stores', id));

      let batch = writeBatch(db);
      let count = 0;
      for (const ref of refsToDelete) {
        batch.delete(ref);
        count++;
        if (count === 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) await batch.commit();

      const [followedSnap, notifCustSnap] = await Promise.all([
        getDocs(query(collection(db, 'customers'), where('followedStores', 'array-contains', id))),
        getDocs(query(collection(db, 'customers'), where('storeNotifications', 'array-contains', id))),
      ]);
      for (const d of followedSnap.docs) {
        const data = d.data();
        await updateDoc(d.ref, { followedStores: (data.followedStores || []).filter((fid: string) => fid !== id) });
      }
      for (const d of notifCustSnap.docs) {
        const data = d.data();
        await updateDoc(d.ref, { storeNotifications: (data.storeNotifications || []).filter((nid: string) => nid !== id) });
      }
    });
  }

  // ─── Customers ────────────────────────────────────────────────────────────
  async function blockCustomer(id: string, ctx: AdminServiceContext) {
    const cust = ctx.customers.find((c) => c.id === id);
    return runAdminAction(
      actor,
      'customers',
      cust?.isBlocked ? 'customer.unblock' : 'customer.block',
      id,
      { name: cust?.name },
      async () => {
        await updateDoc(doc(db, 'customers', id), { isBlocked: !cust?.isBlocked });
      },
    );
  }

  async function deleteCustomer(id: string, ctx: AdminServiceContext) {
    const cust = ctx.customers.find((c) => c.id === id);
    return runAdminAction(actor, 'customers', 'customer.delete', id, { name: cust?.name }, async () => {
      for (const o of ctx.orders.filter((x) => x.customerId === id)) {
        await deleteDoc(doc(db, 'orders', o.id));
      }
      for (const r of ctx.storeReviews.filter((x) => x.customerId === id)) {
        await deleteDoc(doc(db, 'store_reviews', r.id));
      }
      for (const n of ctx.notifications.filter((x) => x.userId === id)) {
        await deleteDoc(doc(db, 'notifications', n.id));
      }
      for (const p of ctx.promoCodes.filter((x) => x.ownerCustomerId === id)) {
        await deleteDoc(doc(db, 'promo_codes', p.id));
      }
      await deleteDoc(doc(db, 'customers', id));
    });
  }

  // ─── Orders ───────────────────────────────────────────────────────────────
  async function updateOrder(id: string, data: Partial<Order>, ctx: AdminServiceContext) {
    const order = ctx.orders.find((o) => o.id === id);
    return runAdminAction(actor, 'orders', 'order.update', id, { name: order?.id ?? id }, async () => {
      await updateDoc(doc(db, 'orders', id), data as Record<string, unknown>);
    });
  }

  async function updateOrderStatus(id: string, status: string, ctx: AdminServiceContext, reason?: string) {
    return runAdminAction(
      actor,
      'orders',
      'order.status_update',
      id,
      { status, reason },
      async () => {
        const orderRef = doc(db, 'orders', id);
        const updateData: Record<string, unknown> = { status, updatedAt: serverTimestamp() };
        if (status === 'rejected') updateData.rejectionReason = reason;
        if (status === 'returned' || status === 'replaced') updateData.returnReason = reason;

        const order = ctx.orders.find((o) => o.id === id);

        if (status === 'delivered' && order?.customerId) {
          await runTransaction(db, async (transaction) => {
            const custRef = doc(db, 'customers', order.customerId);
            const storeRef = doc(db, 'stores', order.storeId);
            const [orderSnap, custSnap, storeSnap] = await Promise.all([
              transaction.get(orderRef),
              transaction.get(custRef),
              transaction.get(storeRef),
            ]);
            if (!orderSnap.exists()) throw new Error('Order not found.');
            if (orderSnap.data().status === 'delivered') throw new Error('ALREADY_DELIVERED');

            if (custSnap.exists()) {
              const cData = custSnap.data();
              const newCount = (cData.monthlyOrdersCount || 0) + 1;
              const orderPoints = Math.floor((orderSnap.data().total || 0) / 1000);
              let newTier: Customer['tier'] = 'Silver';
              if (newCount >= 15) newTier = 'Diamond';
              else if (newCount >= 10) newTier = 'Platinum';
              else if (newCount >= 5) newTier = 'Gold';
              transaction.update(custRef, { points: increment(orderPoints), monthlyOrdersCount: newCount, tier: newTier });
            }

            if (storeSnap.exists()) {
              const promoCodeObj = orderSnap.data().promoCode;
              let isAdminSponsored = orderSnap.data().discountSponsor === 'ADMIN';
              if (promoCodeObj) {
                const usedPromo = ctx.promoCodes.find((p) => p.code === promoCodeObj);
                if (usedPromo && (usedPromo.source === 'admin' || usedPromo.source === 'points')) isAdminSponsored = true;
              }
              if (isAdminSponsored) {
                const storeEarnings = orderSnap.data().discountAmount || 0;
                if (storeEarnings > 0) transaction.update(storeRef, { walletBalance: increment(storeEarnings) });
              }
            }
            transaction.update(orderRef, updateData);
          });
        } else {
          await updateDoc(orderRef, updateData);
        }

        if (order?.customerId) {
          let statusText = status;
          if (status === 'accepted') statusText = 'تم قبول طلبك بنجاح';
          if (status === 'shipped') statusText = 'طلبك في الطريق إليك';
          if (status === 'delivered') statusText = 'تم توصيل طلبك بنجاح. شكراً لك!';
          if (status === 'rejected') statusText = `تم رفض الطلب: ${reason || ''}`;
          await ctx.addNotification({
            userId: order.customerId,
            role: 'customer',
            type: 'order',
            title: 'تحديث حالة الطلب',
            message: `طلب رقم ${id}: ${statusText}`,
            targetId: id,
          });
        }
      },
    );
  }

  async function completePayout(requestId: string) {
    return runAdminAction(actor, 'payouts', 'payout.complete', requestId, { name: requestId }, async () => {
      await runTransaction(db, async (transaction) => {
        const reqRef = doc(db, 'payoutRequests', requestId);
        const reqSnap = await transaction.get(reqRef);
        if (!reqSnap.exists()) throw new Error('Payout request not found!');
        const reqData = reqSnap.data() as PayoutRequest;
        if (reqData.status === 'completed') throw new Error('Already completed.');
        const storeRef = doc(db, 'stores', reqData.merchantId);
        transaction.update(reqRef, { status: 'completed' });
        transaction.update(storeRef, { walletBalance: increment(-reqData.requestedAmount) });
      });
    });
  }

  // ─── Products ─────────────────────────────────────────────────────────────
  async function addProduct(data: Record<string, unknown>, ctx: AdminServiceContext) {
    const finalPrice =
      data.discountType === 'percent'
        ? (data.price as number) - (data.price as number) * ((data.discountValue as number) / 100)
        : (data.price as number) - ((data.discountValue as number) || 0);
    const id = 'prod_' + Date.now();
    let imageUrl = data.image as string;
    if (imageUrl?.startsWith('data:image')) {
      imageUrl = await uploadProductImageStorage(imageUrl, id);
    }
    const newProd = { ...data, id, image: imageUrl, finalPrice, createdAt: serverTimestamp() };
    return runAdminAction(actor, 'products', 'product.create', id, { name: String(data.name ?? id) }, async () => {
      await setDoc(doc(db, 'products', id), newProd);
    });
  }

  async function deleteProduct(id: string, ctx: AdminServiceContext) {
    const product = ctx.products.find((p) => p.id === id);
    return runAdminAction(actor, 'products', 'product.delete', id, { name: product?.name }, async () => {
      for (const req of ctx.flashSaleRequests.filter((r) => r.productId === id)) {
        await deleteDoc(doc(db, 'flash_sale_requests', req.id));
      }
      await deleteDoc(doc(db, 'products', id));
    });
  }

  async function updateProduct(id: string, data: Record<string, unknown>, ctx: AdminServiceContext) {
    const product = ctx.products.find((p) => p.id === id);
    return runAdminAction(actor, 'products', 'product.update', id, { name: product?.name ?? String(data.name ?? id) }, async () => {
      let imageUrl = data.image as string | undefined;
      if (imageUrl?.startsWith('data:image')) {
        imageUrl = await uploadProductImageStorage(imageUrl, id);
      }
      const updatedData = imageUrl ? { ...data, image: imageUrl } : data;
      await updateDoc(doc(db, 'products', id), updatedData);
    });
  }

  // ─── Promos ───────────────────────────────────────────────────────────────
  async function createPromoCode(promo: Record<string, unknown>) {
    const id = 'promo_' + Date.now();
    return runAdminAction(actor, 'promoCodes', 'promo.create', id, { name: String(promo.code ?? id) }, async () => {
      await setDoc(doc(db, 'promo_codes', id), { ...promo, id, createdAt: serverTimestamp() });
    });
  }

  async function updatePromoCode(id: string, data: Partial<PromoCode>, ctx: AdminServiceContext) {
    const promo = ctx.promoCodes.find((p) => p.id === id);
    return runAdminAction(actor, 'promoCodes', 'promo.update', id, { name: promo?.code ?? id }, async () => {
      const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
      await updateDoc(doc(db, 'promo_codes', id), cleanData);
    });
  }

  async function togglePromoCodeStatus(id: string, ctx: AdminServiceContext) {
    const p = ctx.promoCodes.find((x) => x.id === id);
    if (!p) return;
    return runAdminAction(
      actor,
      'promoCodes',
      'promo.toggle_status',
      id,
      { name: p.code, status: p.status === 'active' ? 'expired' : 'active' },
      async () => {
        await updateDoc(doc(db, 'promo_codes', id), { status: p.status === 'active' ? 'expired' : 'active' });
      },
    );
  }

  async function deletePromoCode(id: string, ctx: AdminServiceContext) {
    const promo = ctx.promoCodes.find((p) => p.id === id);
    return runAdminAction(actor, 'promoCodes', 'promo.delete', id, { name: promo?.code ?? id }, async () => {
      await deleteDoc(doc(db, 'promo_codes', id));
    });
  }

  // ─── Recharge ─────────────────────────────────────────────────────────────
  async function generateRechargeCodes(count: number, points: number) {
    return runAdminAction(
      actor,
      'rechargeCodes',
      'recharge.generate',
      null,
      { count, points },
      async () => {
        const batch = writeBatch(db);
        for (let i = 0; i < count; i++) {
          const codeStr = Math.random().toString(36).substring(2, 10).toUpperCase();
          const id = 'rc_' + Date.now() + '_' + i;
          batch.set(doc(db, 'recharge_codes', id), { id, code: codeStr, points, status: 'active', createdAt: serverTimestamp() });
        }
        await batch.commit();
      },
    );
  }

  async function deleteRechargeCode(id: string) {
    return runAdminAction(actor, 'rechargeCodes', 'recharge.delete', id, { name: id }, async () => {
      await deleteDoc(doc(db, 'recharge_codes', id));
    });
  }

  // ─── Settings / Subscriptions ─────────────────────────────────────────────
  async function updateAdminSettings(data: Partial<Record<string, unknown>>, ctx: AdminServiceContext) {
    const updated = { ...ctx.adminSettings, ...data };
    ctx.setAdminSettings?.(updated);
    return runAdminAction(actor, 'settings', 'settings.update', 'global', {}, async () => {
      await setDoc(doc(db, 'settings', 'global'), updated);
    });
  }

  async function updateSubscriptionPrice(planId: string, price: number, ctx: AdminServiceContext) {
    const updatedPlans = { ...((ctx.adminSettings.plans as Record<string, number>) || {}) };
    updatedPlans[planId] = price;
    const updated = { ...ctx.adminSettings, plans: updatedPlans };
    ctx.setAdminSettings?.(updated);
    return runAdminAction(actor, 'subscriptions', 'subscription.price_update', planId, { name: planId, price }, async () => {
      await setDoc(doc(db, 'settings', 'global'), updated);
    });
  }

  // ─── Broadcast ────────────────────────────────────────────────────────────
  async function sendBroadcast(title: string, message: string, target: string, ctx: AdminServiceContext) {
    return runAdminAction(
      actor,
      'broadcast',
      'broadcast.send',
      target,
      { title, province: target === 'all' || target === 'ALL' ? undefined : target },
      async () => {
        const isAll = target === 'all' || target === 'ALL';
        const targetCustomers = isAll ? ctx.customers : ctx.customers.filter((c) => c.province === target);
        const notifs = targetCustomers.map((c) => ({
          userId: c.id,
          role: 'customer',
          title: title || 'محلك',
          message,
        }));
        await ctx.addBulkNotifications(notifs);
      },
    );
  }

  // ─── Flash sales ──────────────────────────────────────────────────────────
  async function createFlashSale(data: Omit<FlashSale, 'id'>, ctx: AdminServiceContext) {
    const id = 'fs_' + Date.now();
    return runAdminAction(actor, 'flashSales', 'flash_sale.create', id, { title: data.title }, async () => {
      await setDoc(doc(db, 'flash_sales', id), { ...data, id, createdAt: serverTimestamp() });
      const notifs = ctx.stores
        .filter((s) => s.status === 'active' && !s.isBanned)
        .map((store) => ({
          userId: store.id,
          role: 'merchant',
          title: 'محلك',
          message: `فعالية جديدة معلنة! "${data.title}"، يمكنك الآن طلب المشاركة بمنتجاتك!`,
          type: 'system',
          targetId: id,
        }));
      if (notifs.length > 0) await ctx.addBulkNotifications(notifs);
    });
  }

  async function updateFlashSaleStatus(id: string, status: FlashSale['status'], ctx: AdminServiceContext) {
    const sale = ctx.flashSales.find((f) => f.id === id);
    return runAdminAction(actor, 'flashSales', 'flash_sale.status_update', id, { title: sale?.title, status }, async () => {
      await updateDoc(doc(db, 'flash_sales', id), { status });
      if (status === 'active' && sale) {
        const notifs = ctx.customers
          .filter((c) => !c.isBlocked)
          .map((customer) => ({
            userId: customer.id,
            role: 'customer',
            title: 'محلك',
            message: `بدأت الآن الفعالية الكبرى "${sale.title}"! تصفح أفضل العروض والخصومات.`,
            type: 'system',
            targetId: id,
          }));
        if (notifs.length > 0) await ctx.addBulkNotifications(notifs);
      }
    });
  }

  async function updateFlashSaleDates(id: string, startTime: string, endTime: string, ctx: AdminServiceContext) {
    const sale = ctx.flashSales.find((f) => f.id === id);
    return runAdminAction(actor, 'flashSales', 'flash_sale.dates_update', id, { title: sale?.title }, async () => {
      await updateDoc(doc(db, 'flash_sales', id), { startTime, endTime });
    });
  }

  async function deleteFlashSale(id: string, ctx: AdminServiceContext) {
    return runAdminAction(actor, 'flashSales', 'flash_sale.delete', id, { title: ctx.flashSales.find((f) => f.id === id)?.title }, async () => {
      for (const req of ctx.flashSaleRequests.filter((r) => r.flashSaleId === id)) {
        await deleteDoc(doc(db, 'flash_sale_requests', req.id));
      }
      await deleteDoc(doc(db, 'flash_sales', id));
    });
  }

  async function updateFlashSaleRequestStatus(id: string, status: FlashSaleRequest['status'], ctx: AdminServiceContext) {
    const req = ctx.flashSaleRequests.find((r) => r.id === id);
    const product = ctx.products.find((p) => p.id === req?.productId);
    return runAdminAction(actor, 'flashSales', 'flash_sale_request.update', id, { name: product?.name ?? id, status }, async () => {
      await updateDoc(doc(db, 'flash_sale_requests', id), { status });
    });
  }

  // ─── Reviews ──────────────────────────────────────────────────────────────
  async function updateStoreReview(id: string, data: Partial<StoreReview>) {
    return runAdminAction(actor, 'reviews', 'review.update', id, { name: id }, async () => {
      await updateDoc(doc(db, 'store_reviews', id), data as Record<string, unknown>);
    });
  }

  async function deleteStoreReview(id: string) {
    return runAdminAction(actor, 'reviews', 'review.delete', id, { name: id }, async () => {
      await deleteDoc(doc(db, 'store_reviews', id));
    });
  }

  // ─── Staff (adminManagement) ──────────────────────────────────────────────
  async function updateStaff(uid: string, payload: Record<string, unknown>, meta?: ActivityLogMeta) {
    return runAdminAction(actor, 'adminManagement', 'staff.updated', uid, meta, async () => {
      await updateDoc(doc(db, 'admins', uid), payload);
    });
  }

  async function createStaff(email: string, createFn: () => Promise<{ uid: string }>) {
    const result = await runAdminAction(actor, 'adminManagement', 'staff.created', null, { email }, createFn);
    return result;
  }

  async function toggleStaffStatus(uid: string, active: boolean, meta?: ActivityLogMeta) {
    return runAdminAction(
      actor,
      'adminManagement',
      active ? 'staff.activated' : 'staff.suspended',
      uid,
      meta,
      async () => {
        await updateDoc(doc(db, 'admins', uid), {
          status: active ? 'active' : 'suspended',
          isSuspended: !active,
          updatedAt: serverTimestamp(),
        });
      },
    );
  }

  async function deleteStaff(uid: string, deleteFn: () => Promise<void>, meta?: ActivityLogMeta) {
    return runAdminAction(actor, 'adminManagement', 'staff.deleted', uid, meta, deleteFn);
  }

  async function updateStaffCredentials(uid: string, updateFn: () => Promise<void>, meta?: ActivityLogMeta) {
    return runAdminAction(actor, 'adminManagement', 'staff.credentials_updated', uid, meta, updateFn);
  }

  // ─── Database tools ───────────────────────────────────────────────────────
  async function seedDatabase() {
    return runAdminAction(actor, 'database', 'database.seed', null, {}, async () => {
      const batch = writeBatch(db);
      const sampleStores = [
        {
          id: 'store-rafidain',
          ownerName: 'أسعد الموسوي',
          shopName: 'سوبرماركت الرافدين',
          category: 'supermarket',
          username: 'rafidain',
          phone: '07701234567',
          password: 'storepassword',
          province: 'بغداد',
          area: 'الكرادة',
          landmark: 'قرب ساحة التحريات',
          lat: 33.3152,
          lng: 44.3661,
          logo: 'https://img.icons8.com/color/144/shopping-cart.png',
          deliveryPrice: 3000,
          isFreeDelivery: false,
          status: 'active' as const,
          subscriptionId: 'sub_premium',
          subscriptionExpiry: '2027-12-31',
          rating: 4.8,
          badges: ['verified', 'premium'],
        },
        {
          id: 'store-babylon',
          ownerName: 'حيدر الكعبي',
          shopName: 'أزياء بابل للرجال',
          category: 'clothing',
          username: 'babylon',
          phone: '07801234567',
          password: 'storepassword',
          province: 'البصرة',
          area: 'العباسية',
          landmark: 'شارع الوطن',
          lat: 30.5081,
          lng: 47.7835,
          logo: 'https://img.icons8.com/color/144/t-shirt.png',
          deliveryPrice: 5000,
          isFreeDelivery: false,
          status: 'active' as const,
          subscriptionId: 'sub_premium',
          subscriptionExpiry: '2027-12-31',
          rating: 4.5,
          badges: ['verified'],
        },
      ];
      for (const store of sampleStores) {
        batch.set(doc(db, 'stores', store.id), { ...store, createdAt: serverTimestamp() });
      }
      await batch.commit();
    });
  }

  async function generateVirtualData(storeCount: number, productCount: number) {
    return runAdminAction(
      actor,
      'database',
      'database.generate_virtual',
      null,
      { count: storeCount },
      async () => {
        const categories = ['supermarket', 'clothing', 'mobiles', 'cosmetics', 'shoes_bags', 'sweets'];
        const provinces = IRAQ_PROVINCES.slice(0, 6).map((p) => p.name);
        let batch = writeBatch(db);
        let count = 0;
        for (let i = 0; i < storeCount; i++) {
          const storeId = `virtual-store-${Date.now()}-${i}`;
          const cat = categories[i % categories.length];
          const province = provinces[i % provinces.length];
          batch.set(doc(db, 'stores', storeId), {
            id: storeId,
            ownerName: `تاجر افتراضي ${i + 1}`,
            shopName: `متجر افتراضي ${i + 1}`,
            category: cat,
            username: `virtual_store_${i + 1}_${Date.now()}`,
            phone: `0770${String(i).padStart(7, '0')}`,
            password: 'virtual123',
            province,
            area: 'منطقة افتراضية',
            landmark: 'موقع افتراضي',
            lat: 33 + Math.random(),
            lng: 44 + Math.random(),
            logo: 'https://img.icons8.com/color/144/store.png',
            deliveryPrice: 3000,
            isFreeDelivery: false,
            status: 'active',
            subscriptionId: 'sub_monthly',
            subscriptionExpiry: '2027-12-31',
            rating: 4.0 + Math.random(),
            is_virtual: true,
            createdAt: serverTimestamp(),
          });
          count++;
          if (count === 400) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
          for (let j = 0; j < productCount; j++) {
            const productId = `virtual-prod-${Date.now()}-${i}-${j}`;
            batch.set(doc(db, 'products', productId), {
              id: productId,
              storeId,
              name: `منتج افتراضي ${j + 1}`,
              description: 'وصف المنتج الافتراضي',
              price: 5000 + Math.floor(Math.random() * 50000),
              discountType: 'none',
              discountValue: 0,
              finalPrice: 5000 + Math.floor(Math.random() * 50000),
              image: 'https://source.unsplash.com/200x200?product',
              status: 'published',
              isFreeDelivery: false,
              category: cat,
              is_virtual: true,
              createdAt: serverTimestamp(),
            });
            count++;
            if (count === 400) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }
        }
        if (count > 0) await batch.commit();
      },
    );
  }

  async function deleteAllVirtualData(ctx: AdminServiceContext) {
    const virtualStores = ctx.stores.filter((s) => s.is_virtual || s.id.startsWith('virtual-'));
    return runAdminAction(actor, 'database', 'database.delete_virtual', null, { count: virtualStores.length }, async () => {
      const virtualProducts = ctx.products.filter((p) => p.is_virtual || p.id.startsWith('virtual-'));
      const virtualStoreIds = new Set(virtualStores.map((s) => s.id));
      const allPaths = [
        ...virtualStores.map((s) => `stores/${s.id}`),
        ...virtualProducts.map((p) => `products/${p.id}`),
        ...ctx.promoCodes.filter((p) => virtualStoreIds.has(p.storeId || '') || p.id.startsWith('virtual-')).map((p) => `promo_codes/${p.id}`),
        ...ctx.orders.filter((o) => virtualStoreIds.has(o.storeId || '') || o.id.startsWith('virtual-')).map((o) => `orders/${o.id}`),
        ...ctx.storeReviews.filter((r) => virtualStoreIds.has(r.storeId || '') || r.id.startsWith('virtual-')).map((r) => `store_reviews/${r.id}`),
        ...ctx.flashSaleRequests.filter((r) => virtualStoreIds.has(r.storeId || '') || r.id.startsWith('virtual-')).map((r) => `flash_sale_requests/${r.id}`),
        ...ctx.notifications.filter((n) => virtualStoreIds.has(n.userId) || n.id.startsWith('virtual-')).map((n) => `notifications/${n.id}`),
      ];
      for (let offset = 0; offset < allPaths.length; offset += 400) {
        const chunk = allPaths.slice(offset, offset + 400);
        const batch = writeBatch(db);
        for (const itemPath of chunk) {
          const [col, docId] = itemPath.split('/');
          batch.delete(doc(db, col, docId));
        }
        await batch.commit();
      }
    });
  }

  return {
    updateStoreStatus,
    updateStoreBadges,
    adminUpdateStore,
    toggleStoreBan,
    deleteStore,
    blockCustomer,
    deleteCustomer,
    updateOrder,
    updateOrderStatus,
    completePayout,
    addProduct,
    deleteProduct,
    updateProduct,
    createPromoCode,
    updatePromoCode,
    togglePromoCodeStatus,
    deletePromoCode,
    generateRechargeCodes,
    deleteRechargeCode,
    updateAdminSettings,
    updateSubscriptionPrice,
    sendBroadcast,
    createFlashSale,
    updateFlashSaleStatus,
    updateFlashSaleDates,
    deleteFlashSale,
    updateFlashSaleRequestStatus,
    updateStoreReview,
    deleteStoreReview,
    updateStaff,
    createStaff,
    toggleStaffStatus,
    deleteStaff,
    updateStaffCredentials,
    seedDatabase,
    generateVirtualData,
    deleteAllVirtualData,
  };
}
