import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Save, RotateCcw, Eye, Send, Search, Volume2, VolumeX, Volume1, Check, X, Loader2 } from 'lucide-react';
import {
  NOTIFICATION_TEMPLATE_DEFS,
  fillNotificationTemplate,
  getDefaultNotificationTemplatesMap,
  resolveAllNotificationTemplates,
  type ResolvedNotificationTemplate,
  type NotificationSoundProfile,
} from '@shared/constants/notificationTemplates';
import type { ReadyMadeNotificationTarget } from '../services/adminService';
import { useApp } from '../context/useApp';
import { showConfirm, showToast } from '../utils/alerts';

type Props = {
  adminSettings: Record<string, unknown>;
  updateAdminSettings: (data: Partial<Record<string, unknown>>) => Promise<void>;
  canBroadcast: boolean;
  canEditTemplates: boolean;
};

type FormMap = Record<string, ResolvedNotificationTemplate>;
type BroadcastAudience = 'customers' | 'merchants' | 'both';

const SAMPLE_VARS: Record<string, string> = {
  storeName: 'متجر تجريبي',
  productName: 'منتج تجريبي',
  code: 'SALE50',
  orderLabel: '#1024',
  statusText: 'تم قبول طلبك بنجاح',
  reason: 'نفاذ المخزون',
  points: '50',
  shopName: 'متجر تجريبي',
  valueLabel: '5,000 د.ع',
  days: '7',
  saleTitle: 'يوم الجمعة',
  discountLabel: '10%',
  customerName: 'أحمد',
  totalCost: '25,000',
  rating: '5',
  productId: 'prod_123',
  ownerName: 'التاجر',
  expiryDate: '2026-12-31',
  diffDays: '3',
  tierLabel: 'ذهبي',
  bonusPoints: '100',
  percent: '20',
  planLabel: 'شهر واحد',
};

const SOUND_PROFILES: { id: NotificationSoundProfile; label: string; hint: string; icon: React.ReactNode }[] = [
  {
    id: 'sound_both',
    label: 'صوتي (خارجي وداخلي)',
    hint: 'صوت عادي عند إغلاق التطبيق وأيضاً عند فتحه',
    icon: <Volume2 size={13} />,
  },
  {
    id: 'silent_inapp',
    label: 'صامت داخلي فقط',
    hint: 'صوت خارجي طبيعي، لكن صامت إن كان المستخدم داخل التطبيق فعلاً',
    icon: <Volume1 size={13} />,
  },
  {
    id: 'silent_both',
    label: 'صامت كلياً',
    hint: 'بدون صوت في الحالتين — إشعار بصري فقط',
    icon: <VolumeX size={13} />,
  },
];

/** يبني الأدوات المتبقية في نص القالب التي لا تُحسب تلقائياً من المتجر/الزبون المستهدف */
function extractManualPlaceholders(placeholders: string[], autoKeys: string[]): string[] {
  return placeholders
    .map((p) => p.replace(/[{}]/g, ''))
    .filter((key) => !autoKeys.includes(key));
}

const AUTO_KEYS_STORE = ['shopName', 'ownerName', 'expiryDate', 'diffDays'];
const AUTO_KEYS_CUSTOMER = ['customerName'];

export const NotificationCenterPanel: React.FC<Props> = ({
  adminSettings,
  updateAdminSettings,
  canBroadcast,
  canEditTemplates,
}) => {
  const { provinces, customers, stores, sendAdminNotification, sendReadyMadeNotification } = useApp();

  const [section, setSection] = useState<'free' | 'templates'>(canBroadcast ? 'free' : 'templates');
  const [audience, setAudience] = useState<'customer' | 'merchant'>('customer');
  const [form, setForm] = useState<FormMap>(() => resolveAllNotificationTemplates(adminSettings));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(resolveAllNotificationTemplates(adminSettings));
  }, [adminSettings]);

  const defs = useMemo(
    () => NOTIFICATION_TEMPLATE_DEFS.filter((d) => d.audience === audience),
    [audience],
  );

  const patchKey = (key: string, partial: Partial<ResolvedNotificationTemplate>) => {
    setForm((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...partial, key },
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([key, v]) => [
          key,
          { title: v.title, body: v.body, titleCkb: v.titleCkb, bodyCkb: v.bodyCkb, enabled: v.enabled, soundProfile: v.soundProfile },
        ]),
      );
      await updateAdminSettings({ notificationTemplates: payload });
      showToast('success', 'تم الحفظ', 'تم تحديث نصوص وأصوات إشعارات النظام (عربي + كردي).');
    } catch {
      showToast('error', 'فشل الحفظ', 'تعذر حفظ القوالب. حاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetAll = () => {
    if (!window.confirm('إعادة كل قوالب الإشعارات إلى النصوص والأصوات الافتراضية؟')) return;
    const defaults = getDefaultNotificationTemplatesMap();
    setForm(
      Object.fromEntries(
        Object.entries(defaults).map(([key, v]) => [key, { key, ...v }]),
      ),
    );
  };

  const handleResetOne = (key: string) => {
    const defaults = getDefaultNotificationTemplatesMap()[key];
    if (!defaults) return;
    patchKey(key, defaults);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#f5eeff] text-[#9952FF] rounded-xl">
            <Bell size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-base">مركز الإشعارات</h3>
            <p className="text-xs text-slate-500 font-medium">
              رسائل حرة، نصوص وأصوات القوالب الجاهزة، وإرسال فوري لأي قالب — كل شيء بمكان واحد
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-5 flex-wrap">
          {canBroadcast && (
            <button
              type="button"
              onClick={() => setSection('free')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                section === 'free' ? 'bg-[#9952FF] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              📢 رسالة حرة (بث جماعي)
            </button>
          )}
          {canEditTemplates && (
            <button
              type="button"
              onClick={() => setSection('templates')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                section === 'templates' ? 'bg-[#9952FF] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              📝 القوالب الجاهزة (نص + صوت + إرسال)
            </button>
          )}
        </div>
      </div>

      {section === 'free' && canBroadcast && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <FreeBroadcastForm
            provinces={provinces}
            customers={customers}
            stores={stores}
            sendAdminNotification={sendAdminNotification}
          />
        </div>
      )}

      {section === 'templates' && canEditTemplates && (
        <>
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex gap-2">
                {(
                  [
                    { id: 'customer' as const, label: 'إشعارات الزبائن' },
                    { id: 'merchant' as const, label: 'إشعارات التجّار' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAudience(tab.id)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                      audience === tab.id ? 'bg-[#9952FF] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 flex items-center gap-1.5"
                >
                  <RotateCcw size={14} />
                  افتراضي للكل
                </button>
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-black text-white bg-[#9952FF] rounded-xl hover:bg-[#4D2980] disabled:opacity-60 flex items-center gap-1.5 shadow-md shadow-[#e9daff]"
                >
                  <Save size={14} />
                  {saving ? 'جاري الحفظ...' : 'حفظ كل القوالب'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {defs.map((def) => {
              const item = form[def.key] || {
                key: def.key,
                title: def.defaultTitle,
                body: def.defaultBody,
                titleCkb: '',
                bodyCkb: '',
                enabled: true,
                soundProfile: def.defaultSoundProfile ?? 'sound_both',
              };
              const previewTitle = fillNotificationTemplate(item.title, SAMPLE_VARS);
              const previewBody = fillNotificationTemplate(item.body, SAMPLE_VARS);
              const previewTitleCkb = fillNotificationTemplate(item.titleCkb || '', SAMPLE_VARS);
              const previewBodyCkb = fillNotificationTemplate(item.bodyCkb || '', SAMPLE_VARS);
              const isStatusLabel = def.key.startsWith('customer.status.');

              return (
                <div
                  key={def.key}
                  className={`bg-white rounded-2xl border shadow-sm p-4 sm:p-5 space-y-3 ${
                    item.enabled ? 'border-slate-100' : 'border-rose-100 bg-rose-50/30'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0 text-right">
                      <h4 className="font-black text-slate-800 text-sm">{def.labelAr}</h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">{def.descriptionAr}</p>
                      {def.placeholders.length > 0 && (
                        <p className="text-[10px] text-[#9952FF] font-bold mt-1.5" dir="ltr">
                          {def.placeholders.join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={(e) => patchKey(def.key, { enabled: e.target.checked })}
                          className="w-4 h-4 accent-[#9952FF]"
                        />
                        مفعّل
                      </label>
                      <button
                        type="button"
                        onClick={() => handleResetOne(def.key)}
                        className="px-2.5 py-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
                      >
                        افتراضي
                      </button>
                    </div>
                  </div>

                  {!isStatusLabel && (
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-1">العنوان (عربي)</label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => patchKey(def.key, { title: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-[#9952FF]/20 focus:border-[#9952FF] outline-none"
                        disabled={!item.enabled}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-1">
                      {isStatusLabel ? 'نص الحالة (عربي)' : 'النص (عربي)'}
                    </label>
                    <textarea
                      rows={isStatusLabel ? 2 : 3}
                      value={item.body}
                      onChange={(e) => patchKey(def.key, { body: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-[#9952FF]/20 focus:border-[#9952FF] outline-none resize-none"
                      disabled={!item.enabled}
                    />
                  </div>

                  {!isStatusLabel && (
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-1">العنوان (کوردی سۆرانی)</label>
                      <input
                        type="text"
                        value={item.titleCkb || ''}
                        onChange={(e) => patchKey(def.key, { titleCkb: e.target.value })}
                        className="w-full border border-violet-100 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-[#9952FF]/20 focus:border-[#9952FF] outline-none bg-violet-50/30"
                        disabled={!item.enabled}
                        dir="rtl"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-1">
                      {isStatusLabel ? 'نص الحالة (کوردی)' : 'النص (کوردی سۆرانی)'}
                    </label>
                    <textarea
                      rows={isStatusLabel ? 2 : 3}
                      value={item.bodyCkb || ''}
                      onChange={(e) => patchKey(def.key, { bodyCkb: e.target.value })}
                      className="w-full border border-violet-100 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-[#9952FF]/20 focus:border-[#9952FF] outline-none resize-none bg-violet-50/30"
                      disabled={!item.enabled}
                      dir="rtl"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-1.5">وضع الصوت</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {SOUND_PROFILES.map((sp) => (
                        <button
                          key={sp.id}
                          type="button"
                          disabled={!item.enabled}
                          onClick={() => patchKey(def.key, { soundProfile: sp.id })}
                          title={sp.hint}
                          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-bold border transition text-right disabled:opacity-50 ${
                            item.soundProfile === sp.id
                              ? 'bg-[#f5eeff] border-[#9952FF] text-[#4D2980]'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {sp.icon}
                          <span className="truncate">{sp.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-gradient-to-l from-[#1a1430] to-[#0b1320] p-3 text-white space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-2 text-[#fff700]">
                        <Eye size={12} />
                        <span className="text-[10px] font-black">معاينة عربي</span>
                        {!item.enabled && (
                          <span className="text-[9px] font-bold text-rose-300 mr-auto">معطّل — لن يُرسل</span>
                        )}
                      </div>
                      {previewTitle ? (
                        <p className="text-xs font-black mb-1">{previewTitle}</p>
                      ) : null}
                      <p className="text-[11px] text-white/80 font-medium leading-relaxed">{previewBody}</p>
                    </div>
                    {(previewTitleCkb || previewBodyCkb) && (
                      <div className="border-t border-white/10 pt-3">
                        <div className="flex items-center gap-1.5 mb-2 text-violet-300">
                          <Eye size={12} />
                          <span className="text-[10px] font-black">معاينة کوردی</span>
                        </div>
                        {previewTitleCkb ? (
                          <p className="text-xs font-black mb-1" dir="rtl">{previewTitleCkb}</p>
                        ) : null}
                        <p className="text-[11px] text-white/80 font-medium leading-relaxed" dir="rtl">{previewBodyCkb}</p>
                      </div>
                    )}
                  </div>

                  {def.sendable && (
                    <SendNowControl
                      def={def}
                      enabled={item.enabled}
                      stores={stores}
                      customers={customers}
                      sendReadyMadeNotification={sendReadyMadeNotification}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// ==========================================
// رسالة حرة (بث جماعي) — منقولة من BroadcastForm
// ==========================================
type FreeBroadcastProps = {
  provinces: { id: string; name: string }[];
  customers: { id: string; province?: string; isBlocked?: boolean }[];
  stores: { id: string; province?: string; status?: string; isBanned?: boolean; is_virtual?: boolean }[];
  sendAdminNotification: (t: string, m: string, target: string) => Promise<void>;
};

const FreeBroadcastForm: React.FC<FreeBroadcastProps> = ({
  provinces,
  customers,
  stores,
  sendAdminNotification,
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<BroadcastAudience>('customers');
  const [scope, setScope] = useState<'all' | string>('all');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const eligibleCustomers = customers.filter((c) => !c.isBlocked);
  const eligibleMerchants = stores.filter(
    (s) => s.status === 'active' && !s.isBanned && !s.is_virtual,
  );

  const customersInScope =
    scope === 'all' ? eligibleCustomers : eligibleCustomers.filter((c) => c.province === scope);
  const merchantsInScope =
    scope === 'all' ? eligibleMerchants : eligibleMerchants.filter((s) => s.province === scope);

  const customerCount = audience === 'merchants' ? 0 : customersInScope.length;
  const merchantCount = audience === 'customers' ? 0 : merchantsInScope.length;
  const totalCount = customerCount + merchantCount;

  const buildTarget = () => `${audience}:${scope}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim() || totalCount === 0) return;

    setSending(true);
    try {
      await sendAdminNotification(title.trim(), message.trim(), buildTarget());
      setSent(true);
      setTitle('');
      setMessage('');
      setAudience('customers');
      setScope('all');
      setTimeout(() => setSent(false), 3000);
    } catch {
      showToast('error', 'فشل الإرسال', 'تعذر إرسال الإشعار. حاول مرة أخرى.');
    } finally {
      setSending(false);
    }
  };

  const audienceSummary =
    audience === 'customers'
      ? `${customerCount} زبون`
      : audience === 'merchants'
        ? `${merchantCount} تاجر`
        : `${customerCount} زبون و ${merchantCount} تاجر (${totalCount} إجمالاً)`;

  const deliveryHint =
    audience === 'customers'
      ? 'يظهر للزبائن في قائمة إشعاراتهم وتطبيق محلك'
      : audience === 'merchants'
        ? 'يظهر للتجار في قائمة إشعاراتهم وتطبيق التاجر'
        : 'يظهر للزبائن والتجار في تطبيقاتهم وقوائم الإشعارات';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {sent && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-sm font-bold flex items-center space-x-2 space-x-reverse animate-fade-in">
          <Check size={18} />
          <span>تم إرسال الإشعار بنجاح! 📢</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">عنوان الإشعار *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: عروض رمضان الكبرى"
          required
          className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-[#9952FF] focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">نص الإشعار *</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="اكتب محتوى الإشعار هنا..."
          required
          rows={4}
          className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-[#9952FF] focus:outline-none resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">نوع الجمهور</label>
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value as BroadcastAudience)}
          className="w-full border border-gray-200 p-3 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#9952FF] focus:outline-none"
        >
          <option value="customers">الزبائن فقط ({eligibleCustomers.length})</option>
          <option value="merchants">التجار فقط ({eligibleMerchants.length})</option>
          <option value="both">الزبائن والتجار معاً ({eligibleCustomers.length + eligibleMerchants.length})</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">النطاق الجغرافي</label>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="w-full border border-gray-200 p-3 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#9952FF] focus:outline-none"
        >
          <option value="all">
            {audience === 'customers'
              ? `جميع الزبائن (${eligibleCustomers.length})`
              : audience === 'merchants'
                ? `جميع التجار (${eligibleMerchants.length})`
                : `الجميع — زبائن وتجار (${eligibleCustomers.length + eligibleMerchants.length})`}
          </option>
          {provinces.map((p) => {
            const cCount = eligibleCustomers.filter((c) => c.province === p.name).length;
            const mCount = eligibleMerchants.filter((s) => s.province === p.name).length;
            const label =
              audience === 'customers'
                ? `${p.name} (${cCount} زبون)`
                : audience === 'merchants'
                  ? `${p.name} (${mCount} تاجر)`
                  : `${p.name} (${cCount} زبون، ${mCount} تاجر)`;
            return (
              <option key={p.id} value={p.name}>
                {label}
              </option>
            );
          })}
        </select>
      </div>

      <div className="bg-[#f5eeff] p-3 rounded-xl border border-[#e9daff]">
        <p className="text-xs text-[#4D2980] font-bold">
          📊 عدد المستلمين: <span className="text-lg">{audienceSummary}</span>
        </p>
        <p className="text-[10px] text-[#9952FF] mt-1">
          الإشعار يرسل باسم "محلك" — {deliveryHint}
        </p>
        {totalCount === 0 && (
          <p className="text-[10px] text-red-600 mt-2 font-bold">
            لا يوجد مستلمون في النطاق المحدد.
          </p>
        )}
      </div>

      {(title.trim() || message.trim()) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 mb-3">معاينة شكل الإشعار</p>
          {title.trim() ? (
            <h4 className="text-base font-black text-slate-900 mb-1 leading-snug">{title}</h4>
          ) : (
            <h4 className="text-base font-black text-slate-300 mb-1 leading-snug">عنوان الإشعار</h4>
          )}
          {message.trim() ? (
            <p className="text-sm text-slate-500 font-normal leading-relaxed whitespace-pre-line">{message}</p>
          ) : (
            <p className="text-sm text-slate-300 font-normal leading-relaxed">نص الإشعار يظهر هنا...</p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={!title.trim() || !message.trim() || totalCount === 0 || sending}
        className="w-full py-3 bg-gradient-to-l from-[#9952FF] to-[#4D2980] hover:from-[#4D2980] hover:to-[#4D2980] text-white font-bold rounded-xl shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 space-x-reverse"
      >
        {sending ? <Loader2 size={18} className="animate-spin" /> : <Bell size={18} />}
        <span>{sending ? 'جاري الإرسال...' : 'إرسال الإشعار الآن'}</span>
      </button>
    </form>
  );
};

// ==========================================
// زر "إرسال الآن" لكل قالب جاهز — بث أو مستهدف
// ==========================================
type SendNowProps = {
  def: (typeof NOTIFICATION_TEMPLATE_DEFS)[number];
  enabled: boolean;
  stores: { id: string; shopName?: string }[];
  customers: { id: string; name?: string }[];
  sendReadyMadeNotification: (
    templateKey: string,
    target: ReadyMadeNotificationTarget,
    manualVars: Record<string, string>,
  ) => Promise<void>;
};

const SendNowControl: React.FC<SendNowProps> = ({ def, enabled, stores, customers, sendReadyMadeNotification }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [manualVars, setManualVars] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const entityType: 'store' | 'customer' = def.audience === 'merchant' ? 'store' : 'customer';
  const isTargeted = def.sendable === 'targeted';

  const manualKeys = useMemo(
    () => extractManualPlaceholders(def.placeholders, isTargeted ? (entityType === 'store' ? AUTO_KEYS_STORE : AUTO_KEYS_CUSTOMER) : []),
    [def.placeholders, isTargeted, entityType],
  );

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (entityType === 'store') {
      const list = stores as { id: string; shopName?: string }[];
      const filtered = q ? list.filter((s) => (s.shopName || '').toLowerCase().includes(q) || s.id.toLowerCase().includes(q)) : list;
      return filtered.slice(0, 30);
    }
    const list = customers as { id: string; name?: string }[];
    const filtered = q ? list.filter((c) => (c.name || '').toLowerCase().includes(q) || c.id.toLowerCase().includes(q)) : list;
    return filtered.slice(0, 30);
  }, [search, entityType, stores, customers]);

  const resetPanel = () => {
    setOpen(false);
    setSearch('');
    setSelectedId('');
    setManualVars({});
  };

  const handleBroadcastSend = async () => {
    const ok = await showConfirm(
      'تأكيد الإرسال',
      `سيتم إرسال "${def.labelAr}" فوراً إلى كل ${def.audience === 'customer' ? 'الزبائن' : 'التجار'} المؤهلين. متابعة؟`,
      'إرسال الآن',
    );
    if (!ok.isConfirmed) return;
    setSending(true);
    try {
      await sendReadyMadeNotification(def.key, { mode: 'broadcast' }, {});
      showToast('success', 'تم الإرسال', 'تم إرسال الإشعار بنجاح.');
    } catch (e: any) {
      showToast('error', 'فشل الإرسال', e?.message || 'تعذر إرسال الإشعار.');
    } finally {
      setSending(false);
    }
  };

  const handleTargetedSend = async () => {
    if (!selectedId) return;
    setSending(true);
    try {
      await sendReadyMadeNotification(
        def.key,
        { mode: 'targeted', entityType, entityId: selectedId },
        manualVars,
      );
      showToast('success', 'تم الإرسال', 'تم إرسال الإشعار بنجاح.');
      resetPanel();
    } catch (e: any) {
      showToast('error', 'فشل الإرسال', e?.message || 'تعذر إرسال الإشعار.');
    } finally {
      setSending(false);
    }
  };

  if (def.sendable === 'broadcast') {
    return (
      <div className="pt-1">
        <button
          type="button"
          disabled={!enabled || sending}
          onClick={handleBroadcastSend}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50 shadow-md shadow-emerald-100"
        >
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          إرسال الآن (بث جماعي)
        </button>
      </div>
    );
  }

  // targeted
  return (
    <div className="pt-1">
      {!open ? (
        <button
          type="button"
          disabled={!enabled}
          onClick={() => setOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-[#9952FF] hover:bg-[#4D2980] rounded-xl disabled:opacity-50 shadow-md shadow-[#e9daff]"
        >
          <Send size={13} />
          إرسال الآن (لمتجر/زبون محدد)
        </button>
      ) : (
        <div className="border border-[#e9daff] bg-[#faf7ff] rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black text-[#4D2980]">
              اختر {entityType === 'store' ? 'المتجر' : 'الزبون'} المستهدف
            </p>
            <button type="button" onClick={resetPanel} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          </div>

          <div className="relative">
            <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={entityType === 'store' ? 'ابحث باسم المتجر...' : 'ابحث باسم الزبون...'}
              className="w-full border border-slate-200 rounded-lg pr-8 pl-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#9952FF]/20 focus:border-[#9952FF] outline-none"
            />
          </div>

          <div className="max-h-32 overflow-y-auto space-y-1 border border-slate-100 rounded-lg bg-white p-1">
            {searchResults.length === 0 && (
              <p className="text-[10px] text-slate-400 text-center py-2">لا نتائج</p>
            )}
            {searchResults.map((r: any) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedId(r.id)}
                className={`w-full text-right px-2.5 py-1.5 rounded-md text-[11px] font-bold transition ${
                  selectedId === r.id ? 'bg-[#9952FF] text-white' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                {entityType === 'store' ? r.shopName || r.id : r.name || r.id}
              </button>
            ))}
          </div>

          {manualKeys.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-[#e9daff]">
              <p className="text-[10px] font-black text-slate-500">أكمل باقي بيانات الرسالة</p>
              {manualKeys.map((key) => (
                <input
                  key={key}
                  type="text"
                  value={manualVars[key] || ''}
                  onChange={(e) => setManualVars((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={`{${key}} — مثال: ${SAMPLE_VARS[key] ?? ''}`}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#9952FF]/20 focus:border-[#9952FF] outline-none"
                />
              ))}
            </div>
          )}

          <button
            type="button"
            disabled={!selectedId || sending}
            onClick={handleTargetedSend}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50"
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            تأكيد الإرسال
          </button>
        </div>
      )}
    </div>
  );
};
