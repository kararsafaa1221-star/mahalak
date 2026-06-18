/** Arabic labels for activity log rows (action, target, description). */

export interface ActivityLogMeta {
  /** Display name of the target entity (store name, customer name, email, …). */
  name?: string;
  status?: string;
  reason?: string;
  email?: string;
  title?: string;
  count?: number;
  points?: number;
  price?: number;
  province?: string;
  /** Override auto-generated description. */
  description?: string;
}

const ACTION_LABELS_AR: Record<string, string> = {
  'store.status_update': 'تحديث حالة متجر',
  'store.badges_update': 'تحديث شارات متجر',
  'store.update': 'تعديل بيانات متجر',
  'store.ban': 'حظر متجر',
  'store.unban': 'إلغاء حظر متجر',
  'store.delete': 'حذف متجر',
  'customer.block': 'حظر زبون',
  'customer.unblock': 'إلغاء حظر زبون',
  'customer.delete': 'حذف زبون',
  'order.update': 'تعديل طلب',
  'order.status_update': 'تحديث حالة طلب',
  'payout.complete': 'إتمام طلب سحب',
  'product.create': 'إضافة منتج',
  'product.delete': 'حذف منتج',
  'product.update': 'تعديل منتج',
  'promo.create': 'إنشاء كود خصم',
  'promo.update': 'تعديل كود خصم',
  'promo.toggle_status': 'تغيير حالة كود خصم',
  'promo.delete': 'حذف كود خصم',
  'recharge.generate': 'توليد أكواد شحن',
  'recharge.delete': 'حذف كود شحن',
  'settings.update': 'تحديث الإعدادات',
  'subscription.price_update': 'تحديث سعر اشتراك',
  'broadcast.send': 'إرسال إشعار جماعي',
  'flash_sale.create': 'إنشاء فعالية',
  'flash_sale.status_update': 'تحديث حالة فعالية',
  'flash_sale.dates_update': 'تحديث مواعيد فعالية',
  'flash_sale.delete': 'حذف فعالية',
  'flash_sale_request.update': 'تحديث طلب مشاركة فعالية',
  'review.update': 'تعديل تقييم',
  'review.delete': 'حذف تقييم',
  'staff.updated': 'تعديل موظف',
  'staff.created': 'إنشاء موظف',
  'staff.activated': 'تفعيل موظف',
  'staff.suspended': 'إيقاف موظف',
  'staff.deleted': 'حذف موظف',
  'staff.credentials_updated': 'تحديث بيانات دخول موظف',
  'database.seed': 'تهيئة قاعدة البيانات',
  'database.generate_virtual': 'توليد بيانات افتراضية',
  'database.delete_virtual': 'حذف بيانات افتراضية',
};

const ENTITY_LABELS_AR: Record<string, string> = {
  store: 'متجر',
  customer: 'زبون',
  order: 'طلب',
  product: 'منتج',
  promo: 'كود خصم',
  recharge: 'كود شحن',
  payout: 'طلب سحب',
  flash_sale: 'فعالية',
  flash_sale_request: 'طلب فعالية',
  review: 'تقييم',
  staff: 'موظف',
  settings: 'إعدادات',
  subscription: 'اشتراك',
  broadcast: 'إشعار',
  database: 'قاعدة البيانات',
};

const STATUS_LABELS_AR: Record<string, string> = {
  active: 'نشط',
  suspended: 'موقوف',
  expired: 'منتهي',
  pending: 'قيد الانتظار',
  accepted: 'مقبول',
  shipped: 'قيد الشحن',
  delivered: 'تم التوصيل',
  rejected: 'مرفوض',
  returned: 'مرتجع',
  replaced: 'مستبدل',
  completed: 'مكتمل',
  cancelled: 'ملغى',
  approved: 'موافق عليه',
  declined: 'مرفوض',
  global: 'عام',
  all: 'الكل',
};

const ROLE_LABELS_AR: Record<string, string> = {
  owner: 'مالك',
  admin: 'مدير',
  supervisor: 'مشرف',
  support: 'دعم',
  accountant: 'محاسب',
};

function entityKeyFromAction(actionKey: string): string {
  return actionKey.split('.')[0] ?? actionKey;
}

function statusAr(status?: string): string {
  if (!status) return '';
  const lower = status.toLowerCase();
  return STATUS_LABELS_AR[lower] ?? status;
}

function displayRef(id?: string | null, name?: string): string {
  if (name?.trim()) return name.trim();
  if (!id) return '';
  if (id.length <= 12) return id;
  return `…${id.slice(-8)}`;
}

export function getActionLabelAr(actionKey: string): string {
  return ACTION_LABELS_AR[actionKey] ?? actionKey.replace(/[._]/g, ' ');
}

export function getRoleLabelAr(role?: string | null): string {
  if (!role) return '—';
  return ROLE_LABELS_AR[role] ?? role;
}

export function formatTargetAr(actionKey: string, targetId?: string | null, meta?: ActivityLogMeta): string {
  const entityKey = entityKeyFromAction(actionKey);
  const entity = ENTITY_LABELS_AR[entityKey] ?? 'عنصر';

  if (actionKey === 'settings.update' || targetId === 'global') {
    return 'الإعدادات العامة';
  }

  if (actionKey === 'broadcast.send') {
    if (!targetId || targetId === 'all' || targetId === 'ALL') return 'جميع الزبائن';
    return `زبائن ${meta?.province ?? targetId}`;
  }

  if (actionKey === 'database.seed' || actionKey === 'database.generate_virtual' || actionKey === 'database.delete_virtual') {
    return 'قاعدة البيانات';
  }

  if (actionKey === 'staff.created' && !targetId) {
    return meta?.email ? `موظف: ${meta.email}` : 'موظف جديد';
  }

  if (!targetId) return entity;

  const ref = displayRef(targetId, meta?.name ?? meta?.email ?? meta?.title);
  return ref ? `${entity}: ${ref}` : entity;
}

export function buildDescriptionAr(actionKey: string, targetId?: string | null, meta?: ActivityLogMeta): string {
  if (meta?.description) return meta.description;

  const name = meta?.name ?? meta?.email ?? meta?.title;
  const ref = displayRef(targetId ?? undefined, name);
  const st = statusAr(meta?.status);

  switch (actionKey) {
    case 'store.status_update':
      return ref ? `تم تغيير حالة المتجر «${ref}» إلى ${st || meta?.status || '—'}.` : `تم تحديث حالة متجر إلى ${st || '—'}.`;
    case 'store.badges_update':
      return ref ? `تم تحديث شارات المتجر «${ref}».` : 'تم تحديث شارات متجر.';
    case 'store.update':
      return ref ? `تم تعديل بيانات المتجر «${ref}».` : 'تم تعديل بيانات متجر.';
    case 'store.ban':
      return ref ? `تم حظر المتجر «${ref}».` : 'تم حظر متجر.';
    case 'store.unban':
      return ref ? `تم إلغاء حظر المتجر «${ref}».` : 'تم إلغاء حظر متجر.';
    case 'store.delete':
      return ref ? `تم حذف المتجر «${ref}» وجميع بياناته المرتبطة.` : 'تم حذف متجر وجميع بياناته المرتبطة.';
    case 'customer.block':
      return ref ? `تم حظر الزبون «${ref}».` : 'تم حظر زبون.';
    case 'customer.unblock':
      return ref ? `تم إلغاء حظر الزبون «${ref}».` : 'تم إلغاء حظر زبون.';
    case 'customer.delete':
      return ref ? `تم حذف الزبون «${ref}» وجميع سجلاته.` : 'تم حذف زبون وجميع سجلاته.';
    case 'order.update':
      return ref ? `تم تعديل الطلب «${ref}».` : 'تم تعديل طلب.';
    case 'order.status_update':
      return ref
        ? `تم تحديث حالة الطلب «${ref}» إلى ${st || meta?.status || '—'}${meta?.reason ? ` — ${meta.reason}` : ''}.`
        : `تم تحديث حالة طلب إلى ${st || '—'}.`;
    case 'payout.complete':
      return ref ? `تم إتمام طلب السحب «${ref}».` : 'تم إتمام طلب سحب.';
    case 'product.create':
      return ref ? `تمت إضافة المنتج «${ref}».` : 'تمت إضافة منتج جديد.';
    case 'product.delete':
      return ref ? `تم حذف المنتج «${ref}».` : 'تم حذف منتج.';
    case 'product.update':
      return ref ? `تم تعديل المنتج «${ref}».` : 'تم تعديل منتج.';
    case 'promo.create':
      return ref ? `تم إنشاء كود الخصم «${ref}».` : 'تم إنشاء كود خصم جديد.';
    case 'promo.update':
      return ref ? `تم تعديل كود الخصم «${ref}».` : 'تم تعديل كود خصم.';
    case 'promo.toggle_status':
      return ref ? `تم تغيير حالة كود الخصم «${ref}» إلى ${st || meta?.status || '—'}.` : 'تم تغيير حالة كود خصم.';
    case 'promo.delete':
      return ref ? `تم حذف كود الخصم «${ref}».` : 'تم حذف كود خصم.';
    case 'recharge.generate':
      return `تم توليد ${meta?.count ?? 0} كود شحن (${meta?.points ?? 0} نقطة لكل كود).`;
    case 'recharge.delete':
      return ref ? `تم حذف كود الشحن «${ref}».` : 'تم حذف كود شحن.';
    case 'settings.update':
      return 'تم تحديث الإعدادات العامة للتطبيق.';
    case 'subscription.price_update':
      return ref
        ? `تم تحديث سعر خطة «${ref}» إلى ${meta?.price ?? '—'} د.ع.`
        : `تم تحديث سعر اشتراك إلى ${meta?.price ?? '—'} د.ع.`;
    case 'broadcast.send':
      return meta?.title
        ? `تم إرسال إشعار «${meta.title}» إلى ${formatTargetAr(actionKey, targetId, meta)}.`
        : `تم إرسال إشعار جماعي إلى ${formatTargetAr(actionKey, targetId, meta)}.`;
    case 'flash_sale.create':
      return ref ? `تم إنشاء فعالية «${ref}».` : 'تم إنشاء فعالية جديدة.';
    case 'flash_sale.status_update':
      return ref ? `تم تحديث حالة الفعالية «${ref}» إلى ${st || meta?.status || '—'}.` : 'تم تحديث حالة فعالية.';
    case 'flash_sale.dates_update':
      return ref ? `تم تحديث مواعيد الفعالية «${ref}».` : 'تم تحديث مواعيد فعالية.';
    case 'flash_sale.delete':
      return ref ? `تم حذف الفعالية «${ref}».` : 'تم حذف فعالية.';
    case 'flash_sale_request.update':
      return ref ? `تم تحديث طلب المشاركة «${ref}» إلى ${st || meta?.status || '—'}.` : 'تم تحديث طلب مشاركة فعالية.';
    case 'review.update':
      return ref ? `تم تعديل التقييم «${ref}».` : 'تم تعديل تقييم.';
    case 'review.delete':
      return ref ? `تم حذف التقييم «${ref}».` : 'تم حذف تقييم.';
    case 'staff.updated':
      return ref ? `تم تعديل بيانات الموظف «${ref}».` : 'تم تعديل بيانات موظف.';
    case 'staff.created':
      return meta?.email ? `تم إنشاء حساب موظف جديد: ${meta.email}.` : 'تم إنشاء حساب موظف جديد.';
    case 'staff.activated':
      return ref ? `تم تفعيل حساب الموظف «${ref}».` : 'تم تفعيل حساب موظف.';
    case 'staff.suspended':
      return ref ? `تم إيقاف حساب الموظف «${ref}».` : 'تم إيقاف حساب موظف.';
    case 'staff.deleted':
      return ref ? `تم حذف حساب الموظف «${ref}» نهائياً من لوحة الإدارة والسيرفر.` : 'تم حذف حساب موظف نهائياً من النظام.';
    case 'staff.credentials_updated':
      return ref ? `تم تحديث بيانات الدخول للموظف «${ref}».` : 'تم تحديث بيانات دخول موظف.';
    case 'database.seed':
      return 'تم تهيئة البيانات الأولية في قاعدة البيانات.';
    case 'database.generate_virtual':
      return `تم توليد ${meta?.count ?? 0} متجر افتراضي.`;
    case 'database.delete_virtual':
      return `تم حذف ${meta?.count ?? 0} متجر افتراضي وبياناته.`;
    default:
      return getActionLabelAr(actionKey);
  }
}

export function buildLocalizedLogFields(
  actionKey: string,
  targetId?: string | null,
  meta?: ActivityLogMeta,
): { action: string; targetLabel: string; description: string } {
  return {
    action: getActionLabelAr(actionKey),
    targetLabel: formatTargetAr(actionKey, targetId, meta),
    description: buildDescriptionAr(actionKey, targetId, meta),
  };
}

/** Normalize legacy English logs and pass through new Arabic records. */
export function localizeActivityLogForDisplay(log: {
  actionKey?: string | null;
  action?: string;
  targetId?: string | null;
  description?: string;
  details?: string;
}): { action: string; target: string; description: string } {
  const rawAction = log.action ?? '';

  // New rows already stored in Arabic (actionKey + localized fields).
  if (log.actionKey) {
    return {
      action: rawAction || getActionLabelAr(log.actionKey),
      target: log.targetId ? String(log.targetId) : '—',
      description: log.description || log.details || buildDescriptionAr(log.actionKey),
    };
  }

  const actionKey =
    (ACTION_LABELS_AR[rawAction] ? rawAction : null) ??
    (rawAction.includes('.') ? rawAction : null);

  if (actionKey) {
    const fields = buildLocalizedLogFields(actionKey, log.targetId);
    return { action: fields.action, target: fields.targetLabel, description: fields.description };
  }

  return {
    action: rawAction || '—',
    target: log.targetId ? String(log.targetId) : '—',
    description: log.description || log.details || '—',
  };
}
