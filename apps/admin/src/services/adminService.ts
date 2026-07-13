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
import { db, uploadProductImageStorage, app } from '@shared/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { runAdminAction, type AdminActor } from '../lib/adminActionRunner';
import { classifyStoreUpdate, buildSettingsChangeLog } from '../lib/adminChangeLog';
import { normalizePromoCode, PROMO_CODE_DEFAULTS } from '@shared/utils/promoCode';
import { buildAutoSubscriptionPatch } from '@shared/utils/store';
import {
  normalizePhoneKey,
  normalizeUsernameKey,
  releasePhoneRegistry,
  releaseUsernameRegistry,
  blockPhoneRegistry,
  unblockPhoneRegistry,
  isPhoneBlocked,
} from '@shared/lib/uniquenessRegistry';
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
} from '@shared/types';
import { computeProductFinalPrice } from '@shared/utils/productPricing';
import { buildVirtualStore, buildVirtualProduct } from '../utils/virtualDataSeed';

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
    const { actionKey, meta } = classifyStoreUpdate(data, store);
    return runAdminAction(actor, 'stores', actionKey, storeId, meta, async () => {
      await updateDoc(doc(db, 'stores', storeId), data as Record<string, unknown>);
    });
  }

  async function toggleStoreBan(id: string, ctx: AdminServiceContext) {
    const store = ctx.stores.find((s) => s.id === id);
    if (!store) return;
    const willBan = !store.isBanned;
    return runAdminAction(
      actor,
      'stores',
      store.isBanned ? 'store.unban' : 'store.ban',
      id,
      { name: store.shopName },
      async () => {
        await updateDoc(doc(db, 'stores', id), { isBanned: willBan });
        if (store.phone) {
          if (willBan) {
            await blockPhoneRegistry(store.phone, {
              entityType: 'store',
              displayName: store.shopName || store.username || id,
              originalEntityId: id,
              blockedBy: actor.uid,
            });
          } else {
            await unblockPhoneRegistry(store.phone);
          }
        }
      },
    );
  }

  async function deleteStore(id: string, ctx: AdminServiceContext) {
    const store = ctx.stores.find((s) => s.id === id);
    return runAdminAction(actor, 'stores', 'store.delete', id, { name: store?.shopName }, async () => {
      const phoneKey = store?.phone ? normalizePhoneKey(store.phone) : '';
      const usernameKey = store?.username ? normalizeUsernameKey(store.username) : '';
      const phoneStillBlocked = store?.phone ? await isPhoneBlocked(store.phone) : false;

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

      if (!phoneStillBlocked) {
        if (phoneKey) await releasePhoneRegistry(phoneKey);
        if (usernameKey) await releaseUsernameRegistry(usernameKey);
      }
    });
  }

  // ─── Customers ────────────────────────────────────────────────────────────
  async function blockCustomer(id: string, ctx: AdminServiceContext) {
    const cust = ctx.customers.find((c) => c.id === id);
    const willBlock = !cust?.isBlocked;
    return runAdminAction(
      actor,
      'customers',
      cust?.isBlocked ? 'customer.unblock' : 'customer.block',
      id,
      { name: cust?.name },
      async () => {
        const fn = httpsCallable<
          { customerId: string; blocked: boolean },
          { success: boolean }
        >(getFunctions(app), 'setCustomerPlatformBlock');
        await fn({ customerId: id, blocked: willBlock });
        if (cust?.phone) {
          if (willBlock) {
            await blockPhoneRegistry(cust.phone, {
              entityType: 'customer',
              displayName: cust.name || id,
              originalEntityId: id,
              blockedBy: actor.uid,
            });
          } else {
            await unblockPhoneRegistry(cust.phone);
          }
        }
      },
    );
  }

  async function resetCustomerPoints(id: string, reason: string, ctx: AdminServiceContext) {
    const cust = ctx.customers.find((c) => c.id === id);
    const previousPoints = Number(cust?.points) || 0;
    if (previousPoints <= 0) return;
    return runAdminAction(
      actor,
      'customers',
      'customer.points_reset',
      id,
      { name: cust?.name, points: previousPoints, reason },
      async () => {
        await updateDoc(doc(db, 'customers', id), { points: 0 });
      },
    );
  }

  async function deleteCustomer(id: string, ctx: AdminServiceContext) {
    const cust = ctx.customers.find((c) => c.id === id);
    const phoneKey = cust?.phone ? normalizePhoneKey(cust.phone) : '';
    const phoneStillBlocked = cust?.phone ? await isPhoneBlocked(cust.phone) : false;
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
      if (phoneKey && !phoneStillBlocked) {
        await releasePhoneRegistry(phoneKey);
      }
    });
  }

  async function unblockBlockedPhone(phoneKey: string, ctx: AdminServiceContext) {
    return runAdminAction(actor, 'customers', 'customer.unblock', phoneKey, { name: phoneKey }, async () => {
      await unblockPhoneRegistry(phoneKey);
      const customer = ctx.customers.find((c) => normalizePhoneKey(c.phone) === phoneKey);
      if (customer) {
        const fn = httpsCallable<
          { customerId: string; blocked: boolean },
          { success: boolean }
        >(getFunctions(app), 'setCustomerPlatformBlock');
        await fn({ customerId: customer.id, blocked: false });
      }
      const store = ctx.stores.find((s) => normalizePhoneKey(s.phone) === phoneKey);
      if (store) {
        await updateDoc(doc(db, 'stores', store.id), { isBanned: false });
      }
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
        if (status === 'cancelled' && reason) updateData.rejectionReason = reason;
        if (status === 'returned' || status === 'replaced') updateData.returnReason = reason;

        const order = ctx.orders.find((o) => o.id === id);

        // Loyalty points and wallet credits are handled exclusively by the
        // onOrderDelivered Cloud Function trigger — never from the client.
        await updateDoc(orderRef, updateData);

        // لا نُرسل إشعاراً للزبون عند إلغاء الطلب من طرفه / أدمن بنفس منطق التطبيق
        if (status === 'cancelled') {
          return;
        }

        if (order?.customerId) {
          let statusText = status;
          if (status === 'accepted') statusText = 'تم قبول طلبك بنجاح';
          if (status === 'shipped') statusText = 'طلبك في الطريق إليك ومندوب التوصيل في طريقه';
          if (status === 'delivered') statusText = 'تم توصيل طلبك بنجاح. شكراً لك!';
          if (status === 'rejected') statusText = `تم رفض الطلب: ${reason || ''}`;
          if (status === 'returned') statusText = `تم إرجاع الطلب: ${reason || ''}`;
          if (status === 'replaced') statusText = `تم استبدال الطلب: ${reason || ''}`;
          const orderLabel =
            order.orderNumber != null && Number.isFinite(Number(order.orderNumber))
              ? `#${order.orderNumber}`
              : id;
          await ctx.addNotification({
            userId: order.customerId,
            role: 'customer',
            type: 'order',
            title: 'تحديث حالة الطلب',
            message: `طلب رقم ${orderLabel}: ${statusText}`,
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

        const secretsRef = doc(db, 'store_secrets', reqData.merchantId);
        const secretsSnap = await transaction.get(secretsRef);
        const currentBalance: number = (secretsSnap.data() as { walletBalance?: number } | undefined)?.walletBalance ?? 0;
        if (currentBalance < reqData.requestedAmount) {
          throw new Error(
            `Insufficient wallet balance: available ${currentBalance}, requested ${reqData.requestedAmount}`,
          );
        }

        transaction.update(reqRef, { status: 'completed' });
        transaction.set(
          secretsRef,
          {
            storeId: reqData.merchantId,
            walletBalance: increment(-reqData.requestedAmount),
          },
          { merge: true },
        );
      });
    });
  }

  // ─── Products ─────────────────────────────────────────────────────────────
  async function addProduct(data: Record<string, unknown>, ctx: AdminServiceContext) {
    const discountType = (data.discountType || 'none') as Product['discountType'];
    const discountValue = Number(data.discountValue) || 0;
    const price = Number(data.price) || 0;
    const finalPrice = computeProductFinalPrice(price, discountType, discountValue);
    const id = 'prod_' + Date.now();
    let imageUrl = data.image as string;
    if (imageUrl?.startsWith('data:image')) {
      imageUrl = await uploadProductImageStorage(imageUrl, id, String(data.storeId ?? ''));
    }
    const newProd = {
      ...data,
      id,
      image: imageUrl,
      price,
      discountType,
      discountValue,
      finalPrice,
      createdAt: serverTimestamp(),
    };
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
        imageUrl = await uploadProductImageStorage(
          imageUrl,
          id,
          String(data.storeId ?? product?.storeId ?? ''),
        );
      }
      const updatedData: Record<string, unknown> = { ...data };
      if (imageUrl !== undefined) {
        updatedData.image = imageUrl;
      }

      const pricingTouched =
        data.price !== undefined ||
        data.discountType !== undefined ||
        data.discountValue !== undefined;
      if (pricingTouched && data.finalPrice === undefined) {
        const price = Number(data.price ?? product?.price ?? 0);
        const discountType = (data.discountType ?? product?.discountType ?? 'none') as Product['discountType'];
        const discountValue = Number(
          data.discountValue !== undefined ? data.discountValue : (product?.discountValue ?? 0),
        );
        updatedData.price = price;
        updatedData.discountType = discountType;
        updatedData.discountValue = discountValue;
        updatedData.finalPrice = computeProductFinalPrice(price, discountType, discountValue);
      }

      Object.keys(updatedData).forEach((key) => {
        if (updatedData[key] === undefined) delete updatedData[key];
      });

      await updateDoc(doc(db, 'products', id), updatedData);
    });
  }

  // ─── Promos ───────────────────────────────────────────────────────────────
  async function createPromoCode(promo: Record<string, unknown>) {
    const id = 'promo_' + Date.now();
    const cleanPromo = Object.fromEntries(
      Object.entries({
        ...PROMO_CODE_DEFAULTS,
        ...promo,
        id,
        code: normalizePromoCode(String(promo.code ?? id)),
      }).filter(([, v]) => v !== undefined),
    );
    return runAdminAction(actor, 'promoCodes', 'promo.create', id, { name: String(promo.code ?? id) }, async () => {
      await setDoc(doc(db, 'promo_codes', id), { ...cleanPromo, createdAt: serverTimestamp() });
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
          batch.set(doc(db, 'recharge_codes', codeStr), {
            id: codeStr,
            code: codeStr,
            codeKey: codeStr,
            points,
            status: 'active',
            createdAt: serverTimestamp(),
          });
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
    const changeLog = buildSettingsChangeLog(ctx.adminSettings, data);
    ctx.setAdminSettings?.(updated);

    const shouldApprovePending =
      data.autoApproveStores === true && ctx.adminSettings?.autoApproveStores !== true;

    const persist = async () => {
      await setDoc(doc(db, 'settings', 'global'), updated);
      if (shouldApprovePending) {
        await approveAllPendingStores(ctx, updated);
      }
    };

    if (!changeLog) {
      await persist();
      return;
    }
    return runAdminAction(
      actor,
      'settings',
      changeLog.actionKey,
      'global',
      { description: changeLog.description },
      persist,
    );
  }

  async function approveAllPendingStores(ctx: AdminServiceContext, settings: Record<string, unknown>) {
    if (settings.autoApproveStores === false) return;

    const pending = ctx.stores.filter((s) => s.status === 'pending');
    if (!pending.length) return;

    for (const store of pending) {
      const patch: Record<string, unknown> = { status: 'active' };
      if (
        settings.autoSubscriptionEnabled === true
        && !store.autoSubscriptionDisabled
        && store.subscriptionStatus !== 'active'
      ) {
        Object.assign(
          patch,
          buildAutoSubscriptionPatch(
            Number(settings.autoSubscriptionDurationValue) || 1,
            (settings.autoSubscriptionDurationUnit as 'days' | 'months' | 'years') || 'months',
          ),
        );
      }
      await updateDoc(doc(db, 'stores', store.id), patch);
      await ctx.addNotification({
        userId: store.id,
        role: 'merchant',
        type: 'system',
        title: 'تم تفعيل متجرك',
        message: 'تم تفعيل حساب متجرك بنجاح. يمكنك الآن استقبال الطلبات!',
        targetId: store.id,
      });
    }
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
  function parseBroadcastTarget(target: string) {
    if (target === 'all' || target === 'ALL') {
      return { audience: 'customers' as const, scope: 'all' as const };
    }
    if (!target.includes(':')) {
      return { audience: 'customers' as const, scope: target };
    }
    const [audience, scope] = target.split(':');
    if (audience === 'customers' || audience === 'merchants' || audience === 'both') {
      return { audience, scope: scope || 'all' };
    }
    return { audience: 'customers' as const, scope: 'all' as const };
  }

  async function sendBroadcast(title: string, message: string, target: string, ctx: AdminServiceContext) {
    const { audience, scope } = parseBroadcastTarget(target);
    const isAll = scope === 'all' || scope === 'ALL';

    const eligibleCustomers = ctx.customers.filter((c) => !c.isBlocked);
    const eligibleMerchants = ctx.stores.filter(
      (s) => s.status === 'active' && !s.isBanned && !s.is_virtual,
    );

    const targetCustomers =
      audience === 'merchants'
        ? []
        : isAll
          ? eligibleCustomers
          : eligibleCustomers.filter((c) => c.province === scope);
    const targetMerchants =
      audience === 'customers'
        ? []
        : isAll
          ? eligibleMerchants
          : eligibleMerchants.filter((s) => s.province === scope);

    return runAdminAction(
      actor,
      'broadcast',
      'broadcast.send',
      target,
      {
        title,
        audience,
        province: isAll ? undefined : scope,
        customerCount: targetCustomers.length,
        merchantCount: targetMerchants.length,
      },
      async () => {
        const notifs = [
          ...targetCustomers.map((c) => ({
            userId: c.id,
            role: 'customer',
            title: title || 'محلك',
            message,
            type: 'broadcast',
          })),
          ...targetMerchants.map((s) => ({
            userId: s.id,
            role: 'merchant',
            title: title || 'محلك',
            message,
            type: 'broadcast',
          })),
        ];
        if (notifs.length === 0) return;
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
          subscriptionStatus: 'active' as const,
          subscriptionExpiry: '2027-12-31',
          subscriptionValidUntil: '2027-12-31T23:59:59.000Z',
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
          subscriptionStatus: 'active' as const,
          subscriptionExpiry: '2027-12-31',
          subscriptionValidUntil: '2027-12-31T23:59:59.000Z',
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
        const batchTs = Date.now();
        let batch = writeBatch(db);
        let count = 0;
        for (let i = 0; i < storeCount; i++) {
          const store = buildVirtualStore(i, batchTs);
          batch.set(doc(db, 'stores', store.storeId), {
            id: store.storeId,
            ownerName: store.ownerName,
            shopName: store.shopName,
            category: store.category,
            username: store.username,
            phone: store.phone,
            password: 'virtual123',
            province: store.province,
            area: store.area,
            landmark: store.landmark,
            lat: store.lat,
            lng: store.lng,
            logo: store.logo,
            deliveryPrice: 3000 + (i % 5) * 1000,
            isFreeDelivery: i % 4 === 0,
            status: 'active',
            subscriptionId: 'sub_monthly',
            subscriptionStatus: 'active',
            subscriptionExpiry: '2027-12-31',
            subscriptionValidUntil: '2027-12-31T23:59:59.000Z',
            rating: Math.round((4 + Math.random()) * 10) / 10,
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
            const product = buildVirtualProduct(store.storeId, store.category, i, j, batchTs);
            batch.set(doc(db, 'products', product.productId), {
              id: product.productId,
              storeId: product.storeId,
              name: product.name,
              description: product.description,
              price: product.price,
              discountType: 'none',
              discountValue: 0,
              finalPrice: product.finalPrice,
              image: product.image,
              status: 'published',
              isFreeDelivery: false,
              category: product.category,
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
    resetCustomerPoints,
    deleteCustomer,
    unblockBlockedPhone,
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
