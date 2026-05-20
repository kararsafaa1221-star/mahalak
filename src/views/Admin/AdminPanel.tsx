import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/useApp';
import { Store, Customer, Order } from '../../types';
import { STORE_CATEGORIES, STORE_BADGES } from '../../constants';
import { 
  Settings, Users, Store as StoreIcon, DollarSign, Shield, Bell, 
  Check, X, Ban, RefreshCw, Search, Edit, AlertTriangle, LogOut, 
  TrendingUp, Calendar, Package, Ticket, Eye, EyeOff, Trash2,
  Plus, Copy, Globe, Star, ShoppingBag, CreditCard, Archive,
  BarChart3, Activity, Zap, Award, Crown, Palette, Menu, CheckCircle, MessageCircle, Send, Loader2, MapPin, Clock
} from 'lucide-react';
import { ImageUploader } from '../../components/ImageUploader';
import { sendWhatsAppMessage } from '../../services/otpService';
import { BackupService } from '../../services/backupService';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import HeatmapLayer from '../../components/HeatmapLayer';
import { Map } from 'lucide-react';
import { showLocalNotification } from '../../lib/pushNotifications';

const notificationSound = new Audio(
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
);

// ==========================================
// مكون نموذج إرسال الإشعارات العامة
// ==========================================
const BroadcastForm: React.FC = () => {
  const { sendAdminNotification, provinces, customers } = useApp();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | string>('all');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    
    sendAdminNotification(title.trim(), message.trim(), target);
    setSent(true);
    setTitle('');
    setMessage('');
    setTarget('all');
    setTimeout(() => setSent(false), 3000);
  };

  const targetCount = target === 'all' 
    ? customers.length 
    : customers.filter(c => c.province === target).length;

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
          className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
          className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">الجمهور المستهدف</label>
        <select 
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full border border-gray-200 p-3 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="all">جميع الزبائن ({customers.length})</option>
          {provinces.map(p => {
            const count = customers.filter(c => c.province === p.name).length;
            return <option key={p.id} value={p.name}>{p.name} ({count} زبون)</option>;
          })}
        </select>
      </div>

      <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
        <p className="text-xs text-indigo-700 font-bold">
          📊 عدد الزبائن اللي راح يستلمون الإشعار: <span className="text-lg">{targetCount}</span> زبون
        </p>
        <p className="text-[10px] text-indigo-500 mt-1">
          الإشعار يرسل باسم "محلك" ويظهر للزبائن في قائمة إشعاراتهم
        </p>
      </div>

      <button 
        type="submit"
        disabled={!title.trim() || !message.trim()}
        className="w-full py-3 bg-gradient-to-l from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-xl shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 space-x-reverse"
      >
        <Bell size={18} />
        <span>إرسال الإشعار الآن</span>
      </button>
    </form>
  );
};

// ==========================================
// Database Management Panel
// ==========================================
const DatabasePanel: React.FC = () => {
    const { 
        stores, products, customers, orders, promoCodes, rechargeCodes, notifications, flashSales, adminSettings 
    } = useApp();

    const collections = [
        { name: 'المتاجر (Stores)', count: stores.length, icon: <StoreIcon size={20} className="text-blue-500" /> },
        { name: 'المنتجات (Products)', count: products.length, icon: <Package size={20} className="text-indigo-500" /> },
        { name: 'الزبائن (Customers)', count: customers.length, icon: <Users size={20} className="text-purple-500" /> },
        { name: 'الطلبات (Orders)', count: orders.length, icon: <ShoppingBag size={20} className="text-orange-500" /> },
        { name: 'أكواد الخصم (Promo Codes)', count: promoCodes.length, icon: <Ticket size={20} className="text-green-500" /> },
        { name: 'أكواد الشحن (Recharge)', count: rechargeCodes.length, icon: <Zap size={20} className="text-yellow-500" /> },
        { name: 'الإشعارات (Notifications)', count: notifications.length, icon: <Bell size={20} className="text-rose-500" /> },
        { name: 'الفعاليات (Flash Sales)', count: flashSales.length, icon: <Zap size={20} className="text-amber-500" /> },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {collections.map((col, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-50 rounded-lg">
                                {col.icon}
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-500">{col.name}</h4>
                                <span className="text-xl font-black text-slate-800">{col.count}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                    <Archive size={24} className="text-amber-500" />
                    معاينة البيانات في الوقت الفعلي
                </h3>
                <div className="bg-slate-900 rounded-2xl p-6 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                    <div className="flex flex-col gap-2">
                        <div><span className="text-slate-500">// Firestore Database Structure Preview</span></div>
                        <div><span className="text-blue-400">adminSettings:</span> {JSON.stringify(adminSettings, null, 2)}</div>
                        <div className="mt-4"><span className="text-slate-500">// Connected to:</span> settings/global</div>
                        <div><span className="text-slate-500">// Status:</span> <span className="text-green-500">LIVE SYNCED ✅</span></div>
                    </div>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl text-amber-800">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                    <AlertTriangle size={18} />
                    نصائح إدارة القاعدة
                </h4>
                <p className="text-xs leading-relaxed opacity-80">
                    يتم تخزين جميع البيانات في Google Firebase Firestore. هذا النظام يدعم المزامنة اللحظية (Real-time)، مما يعني أن أي تغيير يتم هنا سينعكس فوراً على هواتف الزبائن وأجهزة التجار. يرجى الحذر عند حذف المنتجات أو تعطيل المتاجر.
                </p>
            </div>
        </div>
    );
};

// ==========================================
// WhatsApp Retargeting Panel
// ==========================================
const WhatsappRetargetingPanel: React.FC = () => {
  const { customers, orders, createPromoCode } = useApp();
  const [filterType, setFilterType] = useState<'inactive_30_days' | 'inactive_60_days' | 'all'>('inactive_30_days');
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [promoDiscountType, setPromoDiscountType] = useState<'percent' | 'amount'>('amount');
  const [promoAmount, setPromoAmount] = useState(5000);
  const [promoExpiryDays, setPromoExpiryDays] = useState(7);
  const [promoMaxUsesPerUser, setPromoMaxUsesPerUser] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);

  const getTargetCustomers = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    return customers.filter(customer => {
      if (filterType === 'all') return true;
      
      const customerOrders = orders.filter(o => o.customerId === customer.id);
      if (customerOrders.length === 0) return true;

      const lastOrderDate = new Date(Math.max(...customerOrders.map(o => new Date(o.createdAt).getTime())));
      
      if (filterType === 'inactive_30_days') return lastOrderDate < thirtyDaysAgo;
      if (filterType === 'inactive_60_days') return lastOrderDate < sixtyDaysAgo;

      return true;
    });
  };

  const targetCustomers = getTargetCustomers();

  const handleStartCampaignClick = () => {
    if (targetCustomers.length === 0) {
      return; // UI already prevents clicking if 0
    }
    setShowConfirm(true);
  };

  const startCampaign = async () => {
    setShowConfirm(false);
    setSending(true);
    setSentCount(0);
    setLogs([]);

    const addLog = (msg: string) => setLogs(prev => [msg, ...prev]);

    try {
      const promoCodeString = `COMEBACK${promoAmount}`;
      addLog(`✨ جاري توليد كود الخصم: ${promoCodeString}`);
      
      await createPromoCode({
        storeId: 'ALL_STORES',
        code: promoCodeString,
        discountType: promoDiscountType,
        discountValue: promoAmount,
        maxUses: targetCustomers.length * 2,
        maxUsesPerUser: promoMaxUsesPerUser,
        usedCount: 0,
        status: 'active',
        source: 'admin',
        expiresAt: promoExpiryDays > 0 ? new Date(Date.now() + promoExpiryDays * 24 * 60 * 60 * 1000).toISOString() : undefined
      });

      addLog(`✅ تم توليد كود الخصم بنجاح!`);

      for (let i = 0; i < targetCustomers.length; i++) {
        const customer = targetCustomers[i];
        addLog(`💬 جاري الإرسال للزبون: ${customer.name} (${customer.phone})...`);
        const discountString = promoDiscountType === 'percent' ? `${promoAmount}%` : `${promoAmount.toLocaleString()} د.ع`;
        const expiryString = promoExpiryDays > 0 ? `\n\nصالح لمدة ${promoExpiryDays} أيام للتسوق من أي متجر! 🚀` : `\n\nصالح دائماً للتسوق من أي متجر! 🚀`;
        const message = `مرحباً ${customer.name} من منصة محلك! اشتقنالك 💙\n\nلأنك زبون مميز، نهيدك كود خصم بقيمة ${discountString} لطلبك الجاي.\n\nاستخدم الكود:\n${promoCodeString}${expiryString}`;
        
        const success = await sendWhatsAppMessage(customer.phone, message);
        if (success) {
          setSentCount(c => c + 1);
          addLog(`✅ نجاح الإرسال للزبون: ${customer.name}`);
        } else {
          addLog(`❌ فشل الإرسال للزبون: ${customer.name} (قد يكون بسبب حد الـ API)`);
        }
        await new Promise(r => setTimeout(r, 1000));
      }

      addLog(`🎉 اكتملت الحملة بنجاح! الإجمالي: ${targetCustomers.length}`);
    } catch (err: any) {
      addLog(`❌ حدث خطأ أثناء إطلاق الحملة: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div>
           <h2 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
             <MessageCircle size={28} className="text-green-500" />
             حملات الواتساب الذكية (WhatsApp Retargeting)
           </h2>
           <p className="text-sm text-slate-500 font-medium max-w-xl">
             استخرج الزبائن غير النشطين وأرسل لهم رسالة واتساب تلقائية باسم "محلك" تحتوي على كود خصم محفز بضغطة زر واحدة، لضمان عدم خسارة أي زبون.
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-3">
              <LogOut size={16} className="text-indigo-500"/>
              شريحة الاستهداف
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">الفلتر الذكي للزبائن</label>
                <select 
                  disabled={sending}
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                >
                  <option value="inactive_30_days">لم يشتروا منذ 30 يوماً</option>
                  <option value="inactive_60_days">لم يشتروا منذ 60 يوماً</option>
                  <option value="all">جميع الزبائن</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">نوع الخصم</label>
                  <select 
                    disabled={sending}
                    value={promoDiscountType}
                    onChange={(e) => setPromoDiscountType(e.target.value as any)}
                    className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  >
                    <option value="amount">مبلغ ثابت</option>
                    <option value="percent">نسبة (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">القيمة</label>
                  <input 
                    disabled={sending}
                    type="number"
                    value={promoAmount}
                    onChange={(e) => setPromoAmount(Number(e.target.value))}
                    className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">الاستخدام للفرد</label>
                  <input 
                    disabled={sending}
                    type="number"
                    value={promoMaxUsesPerUser}
                    onChange={(e) => setPromoMaxUsesPerUser(Number(e.target.value))}
                    className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">صلاحية (أيام)</label>
                  <input 
                    disabled={sending}
                    type="number"
                    value={promoExpiryDays}
                    onChange={(e) => setPromoExpiryDays(Number(e.target.value))}
                    className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition text-center"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-4 text-sm font-bold bg-indigo-50 text-indigo-700 p-3 rounded-xl">
                  <span>عدد المستهدفين:</span>
                  <span className="text-lg bg-white px-2 py-0.5 rounded shadow-sm">{targetCustomers.length} زبون</span>
                </div>

                <button 
                  onClick={handleStartCampaignClick}
                  disabled={sending || targetCustomers.length === 0}
                  className="w-full py-3.5 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      جاري الإرسال ({sentCount}/{targetCustomers.length})
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      تفعيل الحملة الآن
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {showConfirm && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl animate-scale-in">
              <h3 className="text-xl font-black text-slate-800 mb-2">تأكيد إرسال الحملة</h3>
              <p className="text-slate-600 mb-6 font-medium">سيتم إرسال رسائل وتس اب إلى {targetCustomers.length} زبون. هل أنت متأكد من الاستمرار؟</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 text-slate-500 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  إلغاء
                </button>
                <button 
                  onClick={startCampaign}
                  className="flex-1 py-3 text-white font-bold bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition"
                >
                  نعم، ابدأ الحملة
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="lg:col-span-2">
          <div className="bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800 h-full min-h-[400px] flex flex-col">
            <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2">
              <Activity size={16} className="text-green-400"/>
              سجل العمليات المباشر (Logs)
            </h3>
            
            <div className="flex-1 bg-black/50 rounded-2xl p-4 font-mono text-[11px] md:text-xs overflow-y-auto w-full h-[300px]">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600">
                  <p>في انتظار بدء الحملة...</p>
                </div>
              ) : (
                <div className="flex flex-col-reverse gap-2 text-slate-300">
                  {logs.map((log, index) => (
                    <div key={index} className="border-b border-white/5 pb-2">
                      <span className="text-slate-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// ==========================================
// لوحة تحكم الأدمن الشاملة (Admin Dashboard)
// منصة محلك - إدارة كاملة للنظام
// ==========================================

const provinceCoordinates: Record<string, [number, number]> = {
  'بغداد': [33.3152, 44.3661],
  'البصرة': [30.5081, 47.7835],
  'أربيل': [36.1911, 44.0114],
  'بابل': [32.4682, 44.4361],
  'النجف': [31.9972, 44.3149],
  'كربلاء': [32.6160, 44.0249],
  'نينوى': [36.3400, 43.1300],
  'كركوك': [35.4667, 44.3833],
  'ميسان': [31.8333, 47.1500],
  'ذي قار': [31.0500, 46.2500],
  'واسط': [32.5000, 45.8333],
  'المثنى': [31.3167, 45.2833],
  'القادسية': [31.9833, 44.9333],
  'ديالى': [33.7500, 44.6333],
  'صلاح الدين': [34.6000, 43.6833],
  'الأنبار': [33.4167, 43.3000],
  'السليمانية': [35.5500, 45.4333],
  'دهوك': [36.8667, 42.9833]
};

export const AdminPanel: React.FC = () => {
  const { 
    stores, products, customers, orders, promoCodes, subscriptionPlans,
    adminSettings, toggleAutoApprove, updateSubscriptionPrice,
    updateStoreStatus, updateStoreBadges, toggleCustomerBlock, deleteCustomer, toggleStoreBan, deleteStore, createPromoCode, togglePromoCodeStatus, deletePromoCode,
    currentAdmin, setCurrentAdmin, provinces, notifications, storeReviews,
    markAllNotificationsAsRead,
    deleteProduct, updateProduct, updateAdminSettings,
    flashSales, flashSaleRequests, createFlashSale, updateFlashSaleStatus, updateFlashSaleRequestStatus, updateFlashSaleDates, deleteFlashSale,
    rechargeCodes, generateRechargeCodes
  } = useApp();

  // ==========================================
  // الحالات (States)
  // ==========================================
  
  // التاب النشط
  const [activeTab, setActiveTab] = useState<
    'overview' | 'stores' | 'customers' | 'orders' | 'products' | 'recharge' | 'promos' | 'subscriptions' | 'notifications' | 'broadcast' | 'heatmap' | 'settings' | 'flashsales' | 'whatsapp' | 'database' | 'reviews'
  >('overview');
  
  // فلاتر البحث والتصفية
  const [storeFilter, setStoreFilter] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [promoFilter, setPromoFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [storeCategoryFilter, setStoreCategoryFilter] = useState('all');

  // تحضير بيانات الخريطة الحرارية
  const [rechargeCount, setRechargeCount] = useState(10);
  const [rechargePoints, setRechargePoints] = useState(1000);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateCodes = async () => {
    setIsGenerating(true);
    await generateRechargeCodes(rechargeCount, rechargePoints);
    setIsGenerating(false);
    alert(`تم توليد ${rechargeCount} كود بنجاح!`);
  };
  const heatmapPoints = useMemo(() => {
    return orders.map(order => {
      const baseCoord = provinceCoordinates[order.customerProvince] || [33.3152, 44.3661];
      
      // deterministic offsets based on order id
      const hash = (str: string) => {
        let h = 0;
        for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
        return h;
      };
      
      const seed = hash(order.id);
      const latOffset = ((Math.abs(seed) % 1000) / 1000 - 0.5) * 0.05;
      const lngOffset = ((Math.abs(Math.imul(seed, 31)) % 1000) / 1000 - 0.5) * 0.05;
      
      const intensity = Math.min(order.total / 100000, 1) * 0.6 + 0.4;
      return [baseCoord[0] + latOffset, baseCoord[1] + lngOffset, intensity] as [number, number, number];
    });
  }, [orders]);
  
  // تعديل الاشتراكات
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [newPlanPrice, setNewPlanPrice] = useState(0);

  // إنشاء بروموكود جديد
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscountType, setNewPromoDiscountType] = useState<'percent' | 'amount'>('amount');
  const [newPromoDiscount, setNewPromoDiscount] = useState(0);
  const [newPromoMaxUses, setNewPromoMaxUses] = useState(100);
  const [newPromoMaxUsesPerUser, setNewPromoMaxUsesPerUser] = useState(1);
  const [newPromoExpiryType, setNewPromoExpiryType] = useState<'days' | 'date'>('days');
  const [newPromoStartDate, setNewPromoStartDate] = useState('');
  const [newPromoEndDate, setNewPromoEndDate] = useState('');
  const [newPromoExpiryDays, setNewPromoExpiryDays] = useState<number>(30);
  const [newPromoTargetMode, setNewPromoTargetMode] = useState<'all' | 'store' | 'province'>('all');
  const [newPromoSelectedStores, setNewPromoSelectedStores] = useState<string[]>([]);
  const [newPromoSelectedProvinces, setNewPromoSelectedProvinces] = useState<string[]>([]);

  // الفعاليات المركزية والأوسمة
  const [showFlashSaleModal, setShowFlashSaleModal] = useState(false);
  const [newFlashSaleForm, setNewFlashSaleForm] = useState({ title: '', description: '', startDate: '', endDate: '' });
  const [badgeModal, setBadgeModal] = useState<{ show: boolean, storeId: string, selectedBadges: string[] }>({ show: false, storeId: '', selectedBadges: [] });

  // عرض تفاصيل العناصر
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{type: 'store' | 'customer' | 'flashSale', id: string, name: string} | null>(null);
  const [editFlashSaleDatesModal, setEditFlashSaleDatesModal] = useState<{id: string, name: string, start: string, end: string} | null>(null);

  // نظام النسخ الاحتياطي للنظام
  const systemBackupRef = React.useRef<HTMLInputElement>(null);

  const handleExportSystem = () => {
    const systemData = {
      stores,
      products,
      customers,
      orders,
      promoCodes: promoCodes.filter(p => p.source === 'admin'),
      adminSettings,
      backupType: 'Full_System_Backup',
      timestamp: new Date().toISOString()
    };
    BackupService.exportToJson(systemData, 'Mahalak_System_Backup');
    alert('✅ تم تصدير بيانات النظام بالكامل بنجاح!');
  };

  const handleImportSystem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('🚨 تحذير خطير: استيراد بيانات النظام قد يؤدي إلى تضارب في البيانات إذا لم يكن النظام فارغاً. هل أنت متأكد من الاستمرار؟')) {
      e.target.value = '';
      return;
    }

    try {
      const data = await BackupService.importFromJson(file);
      if (data.backupType !== 'Full_System_Backup') {
        alert('❌ خطأ: ملف النسخ الاحتياطي غير صالح لهذا النظام.');
        return;
      }

      console.log('Importing system data:', data);
      alert('⚠️ ميزة الاستيراد الكامل للنظام تتطلب أدوات خاصة للمزامنة مع السيرفر. تم قراءة البيانات بنجاح في الكونسول للمعاينة.');
      // NOTE: In a real app, I would iterate and save to Back4App here if requested.
    } catch {
      alert('❌ فشل قراءة الملف.');
    } finally {
      e.target.value = '';
    }
  };

  // مصادقة الأدمن
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const adminNotifications = notifications
    .filter(n => n.role === 'admin')
    .sort((a, b) => {
      const timeA = (a.createdAt as any)?.toMillis ? (a.createdAt as any).toMillis() : Date.parse((a.createdAt as string) || '');
      const timeB = (b.createdAt as any)?.toMillis ? (b.createdAt as any).toMillis() : Date.parse((b.createdAt as string) || '');
      return (Number(timeB) || 0) - (Number(timeA) || 0);
    });
  const unreadNotifsCount = adminNotifications.filter(n => !n.read).length;
  const [lastNotifCount, setLastNotifCount] = useState(unreadNotifsCount);

  useEffect(() => {
    if (unreadNotifsCount > lastNotifCount) {
      const latestNotif = adminNotifications[0];
      if (latestNotif && !latestNotif.read) {
        notificationSound.play().catch((e) => console.log("Sound error:", e));
        showLocalNotification(latestNotif.title, latestNotif.message, { type: latestNotif.type, targetId: latestNotif.targetId });
      }
    }
    setTimeout(() => setLastNotifCount(unreadNotifsCount), 0);
  }, [unreadNotifsCount, lastNotifCount, adminNotifications]);

  // قائمة الألوان - ثيم التطبيق
  const [themeColor, setThemeColor] = useState<'indigo' | 'emerald' | 'blue' | 'purple' | 'rose' | 'amber'>('indigo');
  const [showThemePicker, setShowThemePicker] = useState(false);

  // حالات البحث في اختيار المتاجر المميزة والقريبة وفي الإعلانات
  const [storeSearch, setStoreSearch] = useState('');
  const [adTargetSearch, setAdTargetSearch] = useState('');
  const [selectedAdForTarget, setSelectedAdForTarget] = useState<number | null>(null);

  // قاموس الألوان لكل ثيم
  const themeColors: Record<string, { primary: string; primaryHover: string; bg: string; light: string; text: string; dark: string }> = {
    indigo:   { primary: 'bg-indigo-600', primaryHover: 'hover:bg-indigo-700', bg: 'bg-indigo-50', light: 'text-indigo-600', text: 'text-indigo-700', dark: 'from-indigo-500 to-indigo-700' },
    emerald:  { primary: 'bg-emerald-600', primaryHover: 'hover:bg-emerald-700', bg: 'bg-emerald-50', light: 'text-emerald-600', text: 'text-emerald-700', dark: 'from-emerald-500 to-emerald-700' },
    blue:     { primary: 'bg-blue-600', primaryHover: 'hover:bg-blue-700', bg: 'bg-blue-50', light: 'text-blue-600', text: 'text-blue-700', dark: 'from-blue-500 to-blue-700' },
    purple:   { primary: 'bg-purple-600', primaryHover: 'hover:bg-purple-700', bg: 'bg-purple-50', light: 'text-purple-600', text: 'text-purple-700', dark: 'from-purple-500 to-purple-700' },
    rose:     { primary: 'bg-rose-600', primaryHover: 'hover:bg-rose-700', bg: 'bg-rose-50', light: 'text-rose-600', text: 'text-rose-700', dark: 'from-rose-500 to-rose-700' },
    amber:    { primary: 'bg-amber-600', primaryHover: 'hover:bg-amber-700', bg: 'bg-amber-50', light: 'text-amber-600', text: 'text-amber-700', dark: 'from-amber-500 to-amber-700' },
  };
  const tc = themeColors[themeColor];

  // عند اختيار تاب يغلق القائمة الجانبية تلقائياً (للموبايل)
  const handleTabSelect = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === 'notifications' && unreadNotifsCount > 0) {
      markAllNotificationsAsRead('admin', 'admin');
    }
    setSidebarOpen(false);
    setSearchQuery('');
    setSelectedProvince('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ==========================================
  // الحسابات والإحصائيات (Computed Values)
  // ==========================================
  
  const stats = useMemo(() => {
    const totalStores = stores.length;
    const activeStores = stores.filter(s => s.status === 'active').length;
    const pendingStores = stores.filter(s => s.status === 'pending').length;
    const suspendedStores = stores.filter(s => s.status === 'suspended').length;
    
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => !c.isBlocked).length;
    const blockedCustomers = customers.filter(c => c.isBlocked).length;
    
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const acceptedOrders = orders.filter(o => o.status === 'accepted').length;
    const rejectedOrders = orders.filter(o => o.status === 'rejected').length;
    
    const totalRevenue = orders.filter(o => o.status === 'accepted').reduce((acc, o) => acc + o.total, 0);
    const totalDeliveryFees = orders.filter(o => o.status === 'accepted').reduce((acc, o) => acc + o.deliveryPrice, 0);
    const totalDiscounts = orders.filter(o => o.status === 'accepted').reduce((acc, o) => acc + o.discountAmount, 0);
    
    const totalProducts = products.length;
    const publishedProducts = products.filter(p => p.status === 'published').length;
    const draftProducts = products.filter(p => p.status === 'draft').length;
    const archivedProducts = products.filter(p => p.status === 'archived').length;
    
    const totalPromos = promoCodes.length;
    const activePromos = promoCodes.filter(p => p.status === 'active').length;
    const expiredPromos = promoCodes.filter(p => p.status === 'expired').length;
    const totalPromoUsage = promoCodes.reduce((acc, p) => acc + p.usedCount, 0);
    
    const totalPoints = customers.reduce((acc, c) => acc + c.points, 0);
    
    // إحصائيات حسب المحافظة
    const storesByProvince: Record<string, number> = {};
    stores.forEach(s => {
      storesByProvince[s.province] = (storesByProvince[s.province] || 0) + 1;
    });
    
    // إحصائيات حسب مستوى الزبائن
    const customersByTier = {
      Silver: customers.filter(c => c.tier === 'Silver').length,
      Gold: customers.filter(c => c.tier === 'Gold').length,
      Platinum: customers.filter(c => c.tier === 'Platinum').length,
      Diamond: customers.filter(c => c.tier === 'Diamond').length,
    };

    // المتاجر الأكثر طلباً
    const storeOrderCounts: Record<string, number> = {};
    orders.forEach(o => {
      storeOrderCounts[o.storeId] = (storeOrderCounts[o.storeId] || 0) + 1;
    });
    const topStores = Object.entries(storeOrderCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([storeId, count]) => ({
        store: stores.find(s => s.id === storeId),
        orderCount: count
      }));

    return {
      totalStores, activeStores, pendingStores, suspendedStores,
      totalCustomers, activeCustomers, blockedCustomers,
      totalOrders, pendingOrders, acceptedOrders, rejectedOrders,
      totalRevenue, totalDeliveryFees, totalDiscounts,
      totalProducts, publishedProducts, draftProducts, archivedProducts,
      totalPromos, activePromos, expiredPromos, totalPromoUsage,
      totalPoints, storesByProvince, customersByTier, topStores
    };
  }, [stores, customers, orders, products, promoCodes]);

  // فلترة المتاجر
  const filteredStores = useMemo(() => {
    return stores.filter(s => {
      const matchStatus = storeFilter === 'all' || s.status === storeFilter;
      const matchProvince = selectedProvince === '' || s.province === selectedProvince;
      const matchCategory = storeCategoryFilter === 'all' || s.category === storeCategoryFilter;
      const matchSearch = searchQuery === '' || 
        s.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery) ||
        s.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchProvince && matchCategory && matchSearch;
    });
  }, [stores, storeFilter, selectedProvince, storeCategoryFilter, searchQuery]);

  // فلترة الزبائن
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchStatus = customerFilter === 'all' || 
        (customerFilter === 'active' && !c.isBlocked) ||
        (customerFilter === 'blocked' && c.isBlocked);
      const matchProvince = selectedProvince === '' || c.province === selectedProvince;
      const matchSearch = searchQuery === '' || 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        c.id.includes(searchQuery);
      return matchStatus && matchProvince && matchSearch;
    });
  }, [customers, customerFilter, selectedProvince, searchQuery]);

  // فلترة الطلبات
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchStatus = orderFilter === 'all' || o.status === orderFilter;
      const matchSearch = searchQuery === '' || 
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.storeName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [orders, orderFilter, searchQuery]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = searchQuery === '' || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.price.toString().includes(searchQuery) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [products, searchQuery]);

  // فلترة البروموكودات
  const filteredPromos = useMemo(() => {
    return promoCodes.filter(p => {
      const matchStatus = promoFilter === 'all' || p.status === promoFilter;
      const matchSearch = searchQuery === '' || 
        p.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [promoCodes, promoFilter, searchQuery]);

  // ==========================================
  // الدوال (Functions)
  // ==========================================

  // تسجيل دخول الأدمن
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'Koree2004@') {
      setCurrentAdmin(true);
      setAuthError('');
    } else {
      setAuthError('كلمة المرور غير صحيحة، حاول مرة أخرى.');
    }
  };

  // تسجيل خروج الأدمن
  const handleAdminLogout = () => {
    setCurrentAdmin(false);
    setAdminPassword('');
    setActiveTab('overview');
  };

  // حفظ سعر الاشتراك
  const handleSavePrice = (planId: string) => {
    if (newPlanPrice > 0) {
      updateSubscriptionPrice(planId, newPlanPrice);
      setEditingPlanId(null);
      setNewPlanPrice(0);
      alert('تم تحديث سعر الاشتراك بنجاح!');
    }
  };

  // إنشاء بروموكود جديد
  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.trim() || newPromoDiscount <= 0) {
      alert('يرجى إدخال بيانات صحيحة للبروموكود');
      return;
    }

    // التحقق من عدم تكرار الكود
    const existingPromo = promoCodes.find(p => p.code.toUpperCase() === newPromoCode.toUpperCase());
    if (existingPromo) {
      alert('هذا الكود موجود مسبقاً! اختر كوداً آخر.');
      return;
    }

    let expiryDate: string | undefined;
    let startDate: string | undefined;

    if (newPromoExpiryType === 'days') {
      expiryDate = newPromoExpiryDays > 0 
        ? new Date(Date.now() + newPromoExpiryDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;
    } else {
      startDate = newPromoStartDate ? new Date(newPromoStartDate).toISOString() : undefined;
      expiryDate = newPromoEndDate ? new Date(newPromoEndDate).toISOString() : undefined;
    }

    let tStores: string[] | undefined = undefined;
    if (newPromoTargetMode === 'store' && newPromoSelectedStores.length > 0) tStores = newPromoSelectedStores;

    let tProvinces: string[] | undefined = undefined;
    if (newPromoTargetMode === 'province' && newPromoSelectedProvinces.length > 0) tProvinces = newPromoSelectedProvinces;

    createPromoCode({
      storeId: 'ALL_STORES',
      code: newPromoCode.toUpperCase().replace(/\s+/g, ''),
      discountType: newPromoDiscountType,
      discountValue: newPromoDiscount,
      maxUses: newPromoMaxUses,
      maxUsesPerUser: newPromoMaxUsesPerUser,
      targetStores: tStores,
      targetProvinces: tProvinces,
      startDate: startDate,
      expiresAt: expiryDate
    });

    alert(`تم إنشاء كود الخصم "${newPromoCode.toUpperCase()}" بنجاح! 🎉`);
    setShowPromoModal(false);
    setNewPromoCode('');
    setNewPromoDiscountType('amount');
    setNewPromoDiscount(0);
    setNewPromoMaxUses(100);
    setNewPromoMaxUsesPerUser(1);
    setNewPromoExpiryType('days');
    setNewPromoStartDate('');
    setNewPromoEndDate('');
    setNewPromoExpiryDays(30);
    setNewPromoTargetMode('all');
    setNewPromoSelectedStores([]);
    setNewPromoSelectedProvinces([]);
  };

  // نسخ كود البروموكود
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`تم نسخ الكود: ${text}`);
  };

  const handleCreateFlashSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlashSaleForm.title || !newFlashSaleForm.startDate || !newFlashSaleForm.endDate) return;
    try {
      await createFlashSale({
        title: newFlashSaleForm.title,
        description: newFlashSaleForm.description,
        startTime: new Date(newFlashSaleForm.startDate).toISOString(),
        endTime: new Date(newFlashSaleForm.endDate).toISOString(),
        status: 'upcoming'
      });
      setShowFlashSaleModal(false);
      setNewFlashSaleForm({ title: '', description: '', startDate: '', endDate: '' });
      alert('تم إنشاء الفعالية بنجاح');
    } catch {
      alert('حدث خطأ أثناء إنشاء الفعالية');
    }
  };

  // ==========================================
  // شاشة تسجيل الدخول
  // ==========================================
  if (!currentAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-right border-t-4 border-red-600">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Shield size={32} />
            </div>
            <h1 className="text-2xl font-black text-gray-800">لوحة تحكم الأدمن</h1>
            <p className="text-xs text-gray-400 mt-1">الدخول للمشرفين فقط</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            {authError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl font-bold flex items-center space-x-1 space-x-reverse">
                <AlertTriangle size={14} />
                <span>{authError}</span>
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">كلمة المرور السرية *</label>
              <input 
                type="password" 
                placeholder="أدخل كلمة مرور الإدارة" 
                value={adminPassword} 
                onChange={(e) => setAdminPassword(e.target.value)} 
                required 
                className="w-full text-right border border-gray-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" 
              />
            </div>

            <button type="submit" className="w-full py-3 bg-gradient-to-l from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl shadow-lg transition">
              تسجيل الدخول
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // لوحة التحكم الرئيسية
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-100 flex">
      
      {/* الظل الخلفي عند فتح القائمة في الموبايل */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* زر القائمة العائم للموبايل - على اليمين */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`fixed top-4 z-[80] lg:hidden w-12 h-12 rounded-full shadow-2xl border flex items-center justify-center transition-all active:scale-95 ${
          sidebarOpen
            ? 'bg-red-500 text-white border-red-400'
            : 'bg-white text-indigo-600 border-indigo-100'
        }`}
        style={{ right: '16px', left: 'auto' }}
        aria-label={sidebarOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* ==========================================
          الشريط الجانبي (Sidebar) - ينغلق آلياً بالمحمول
          ========================================== */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar-open' : 'admin-sidebar-closed'} w-72 bg-gradient-to-b from-slate-900 to-slate-950 text-white p-4 flex flex-col fixed right-0 top-0 h-screen z-30 shadow-2xl transition-transform duration-300`}>
        
        {/* اللوغو */}
        <div className="flex items-center space-x-3 space-x-reverse border-b border-slate-800 pb-4 mb-4">
          <div className="p-2 bg-gradient-to-br from-red-500 to-red-700 rounded-xl shadow-lg">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <span className="text-lg font-black block leading-none">لوحة تحكم محلك</span>
            <span className="text-[10px] text-slate-400">إدارة النظام الشاملة</span>
          </div>
        </div>

        {/* قائمة التنقل */}
        <nav className="flex-1 space-y-1 overflow-y-auto">
          
          {/* نظرة عامة */}
          <button 
            onClick={() => handleTabSelect('overview')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'overview' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 size={18} />
            <span className="font-semibold">نظرة عامة</span>
          </button>

          {/* إدارة المتاجر */}
          <button 
            onClick={() => handleTabSelect('stores')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'stores' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            <StoreIcon size={18} />
            <span className="font-semibold">إدارة المتاجر</span>
            {stats.pendingStores > 0 && (
              <span className="mr-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse font-bold">
                {stats.pendingStores}
              </span>
            )}
          </button>

          {/* إدارة الزبائن */}
          <button 
            onClick={() => handleTabSelect('customers')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'customers' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            <Users size={18} />
            <span className="font-semibold">إدارة الزبائن</span>
            <span className="mr-auto bg-slate-700 text-xs px-2 py-0.5 rounded-full">{stats.totalCustomers}</span>
          </button>

          {/* إدارة الطلبات */}
          <button 
            onClick={() => handleTabSelect('orders')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'orders' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            <ShoppingBag size={18} />
            <span className="font-semibold">إدارة الطلبات</span>
            {stats.pendingOrders > 0 && (
              <span className="mr-auto bg-yellow-500 text-slate-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {stats.pendingOrders}
              </span>
            )}
          </button>

          {/* إدارة المنتجات */}
          <button 
            onClick={() => handleTabSelect('products')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'products' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            <Package size={18} />
            <span className="font-semibold">إدارة المنتجات</span>
            <span className="mr-auto bg-slate-700 text-xs px-2 py-0.5 rounded-full">{stats.totalProducts}</span>
          </button>

          {/* شحن الكودات */}
          <button 
            onClick={() => handleTabSelect('recharge')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'recharge' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            <Zap size={18} className="text-emerald-400" />
            <span className="font-semibold">شحن الكودات (توليد)</span>
          </button>

          {/* أكواد الخصم */}
          <button 
            onClick={() => handleTabSelect('promos')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'promos' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            <Ticket size={18} />
            <span className="font-semibold">أكواد الخصم</span>
            <span className="mr-auto bg-green-600 text-xs px-2 py-0.5 rounded-full">{stats.activePromos}</span>
          </button>

          {/* الاشتراكات */}
          <button 
            onClick={() => handleTabSelect('subscriptions')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'subscriptions' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            <CreditCard size={18} />
            <span className="font-semibold">أسعار الاشتراكات</span>
          </button>

          {/* الفعاليات المركزية */}
          <button 
            onClick={() => handleTabSelect('flashsales')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'flashsales' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            <Zap size={18} className="text-yellow-400" />
            <span className="font-semibold">الفعاليات المركزية</span>
          </button>

          {/* الإشعارات */}
          <button 
            onClick={() => handleTabSelect('notifications')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'notifications' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            <Bell size={18} />
            <span className="font-semibold">سجل الإشعارات</span>
            {unreadNotifsCount > 0 ? (
              <span className="mr-auto bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-bounce">
                {unreadNotifsCount}
              </span>
            ) : (
              <span className="mr-auto bg-slate-700 text-xs px-2 py-0.5 rounded-full">{notifications.length}</span>
            )}
          </button>

          {/* تقييمات المتاجر */}
          <button 
            onClick={() => handleTabSelect('reviews')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'reviews' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            <Star size={18} />
            <span className="font-semibold">تقييمات المتاجر</span>
            {storeReviews.filter(r => !r.isReadByAdmin).length > 0 && (
              <span className="mr-auto bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-bounce">
                جديد ({storeReviews.filter(r => !r.isReadByAdmin).length})
              </span>
            )}
          </button>

          {/* إرسال إشعارات */}
          <button 
            onClick={() => handleTabSelect('broadcast')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'broadcast' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            <Bell size={18} />
            <span className="font-semibold">إرسال إشعارات</span>
          </button>

          {/* حملات الواتساب */}
          <button 
            onClick={() => handleTabSelect('whatsapp')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'whatsapp' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            <MessageCircle size={18} className="text-green-500" />
            <span className="font-semibold">حملات الواتساب</span>
          </button>

          {/* الخريطة الحرارية */}
          <button 
            onClick={() => handleTabSelect('heatmap')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'heatmap' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            <Map size={18} />
            <span className="font-semibold">الخريطة الحرارية للطلبات</span>
          </button>

          {/* قاعدة البيانات */}
          <button 
            onClick={() => handleTabSelect('database')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'database' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            <Archive size={18} className="text-amber-400" />
            <span className="font-semibold">قاعدة البيانات</span>
          </button>



          {/* الإعدادات */}
          <button 
            onClick={() => handleTabSelect('settings')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'settings' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            <Settings size={18} />
            <span className="font-semibold">إعدادات النظام</span>
          </button>
        </nav>

        {/* زر تسجيل الخروج */}
        <button 
          onClick={handleAdminLogout}
          className="mt-4 w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-xl text-red-300 hover:bg-red-900/30 hover:text-white transition border border-red-900/30"
        >
          <LogOut size={18} />
          <span className="font-semibold">تسجيل الخروج</span>
        </button>
      </aside>

      {/* ==========================================
          المحتوى الرئيسي
          ========================================== */}
      <main className="flex-1 min-w-0 lg:mr-72 p-4 lg:p-6 pt-20 lg:pt-6">
        
        {/* الهيدر العلوي */}
        <header className="sticky top-0 z-10 flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-black text-slate-800">
              {activeTab === 'overview' && '📊 نظرة عامة على النظام'}
              {activeTab === 'stores' && '🏪 إدارة المتاجر المسجلة'}
              {activeTab === 'customers' && '👥 إدارة الزبائن والمستخدمين'}
              {activeTab === 'orders' && '📦 إدارة الطلبات'}
              {activeTab === 'products' && '🛍️ إدارة المنتجات'}
              {activeTab === 'recharge' && '⚡ توليد كودات شحن النقاط'}
              {activeTab === 'promos' && '🎫 إدارة أكواد الخصم والعروض'}
              {activeTab === 'subscriptions' && '💳 أسعار وحزم الاشتراكات'}
                {activeTab === 'notifications' && '🔔 سجل الإشعارات'}
                {activeTab === 'broadcast' && '📢 إرسال إشعارات للزبائن'}
                {activeTab === 'whatsapp' && '💬 حملات الواتساب الذكية'}
                {activeTab === 'heatmap' && '🗺️ الخريطة الحرارية للطلبات'}
                {activeTab === 'database' && '🗄️ إدارة قاعدة البيانات'}
                {activeTab === 'settings' && '⚙️ إعدادات النظام'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">لوحة تحكم المشرفين - منصة محلك</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 space-x-reverse gap-2">
            {/* زر اختيار الألوان */}
            <div className="relative">
              <button 
                onClick={() => setShowThemePicker(!showThemePicker)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="تغيير ألوان الثيم"
              >
                <Palette size={18} className="text-gray-600" />
              </button>
              
              {showThemePicker && (
                <div className="absolute left-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-3 z-50 animate-fade-in">
                  <h4 className="text-xs font-bold text-gray-500 mb-2 text-right">🎨 اختر لون الواجهة:</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {(['indigo','emerald','blue','purple','rose','amber'] as const).map(c => (
                      <button
                        key={c}
                        onClick={() => { setThemeColor(c); setShowThemePicker(false); }}
                        className={`w-full h-10 rounded-xl transition border-2 ${
                          themeColor === c ? 'border-gray-800 scale-110 shadow-lg' : 'border-gray-200 hover:scale-105'
                        } ${
                          c==='indigo'?'bg-indigo-500':c==='emerald'?'bg-emerald-500':c==='blue'?'bg-blue-500':c==='purple'?'bg-purple-500':c==='rose'?'bg-rose-500':'bg-amber-500'
                        }`}
                        title={c==='indigo'?'نيلي':c==='emerald'?'زمردي':c==='blue'?'أزرق':c==='purple'?'بنفسجي':c==='rose'?'وردي':'عنبري'}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center space-x-2 space-x-reverse">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>جلسة أدمن نشطة</span>
            </div>
          </div>
        </header>

        {/* ==========================================
            تاب نظرة عامة (Overview)
            ========================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* الإحصائيات الرئيسية */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div className={`p-3 ${tc.bg} ${tc.light} rounded-xl`}>
                    <StoreIcon size={24} />
                  </div>
                  <div className="text-left">
                    <span className="text-2xl font-black text-slate-800 block">{stats.totalStores}</span>
                    <span className="text-[10px] text-slate-400 font-bold">متجر مسجل</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between text-[10px] font-semibold">
                  <span className="text-green-600">نشط: {stats.activeStores}</span>
                  <span className="text-yellow-600">معلق: {stats.pendingStores}</span>
                  <span className="text-red-600">موقف: {stats.suspendedStores}</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                    <Users size={24} />
                  </div>
                  <div className="text-left">
                    <span className="text-2xl font-black text-slate-800 block">{stats.totalCustomers}</span>
                    <span className="text-[10px] text-slate-400 font-bold">زبون مسجل</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between text-[10px] font-semibold">
                  <span className="text-green-600">نشط: {stats.activeCustomers}</span>
                  <span className="text-red-600">محظور: {stats.blockedCustomers}</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
                    <ShoppingBag size={24} />
                  </div>
                  <div className="text-left">
                    <span className="text-2xl font-black text-slate-800 block">{stats.totalOrders}</span>
                    <span className="text-[10px] text-slate-400 font-bold">طلب إجمالي</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between text-[10px] font-semibold">
                  <span className="text-yellow-600">معلق: {stats.pendingOrders}</span>
                  <span className="text-green-600">مقبول: {stats.acceptedOrders}</span>
                  <span className="text-red-600">مرفوض: {stats.rejectedOrders}</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-5 rounded-2xl shadow-lg text-white">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <DollarSign size={24} />
                  </div>
                  <div className="text-left">
                    <span className="text-xl font-black block">{(stats.totalRevenue || 0).toLocaleString()}</span>
                    <span className="text-[10px] text-green-100 font-bold">د.ع إجمالي المبيعات</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/20 flex justify-between text-[10px] font-semibold text-green-100">
                  <span>توصيل: {(stats.totalDeliveryFees || 0).toLocaleString()}</span>
                  <span>خصومات: {(stats.totalDiscounts || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* صف ثاني من الإحصائيات */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    <Package size={20} />
                  </div>
                  <div>
                    <span className="text-lg font-black text-slate-800 block">{stats.totalProducts}</span>
                    <span className="text-[10px] text-slate-400 font-bold">منتج في النظام</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="p-3 bg-pink-100 text-pink-600 rounded-xl">
                    <Ticket size={20} />
                  </div>
                  <div>
                    <span className="text-lg font-black text-slate-800 block">{stats.totalPromos}</span>
                    <span className="text-[10px] text-slate-400 font-bold">كود خصم ({stats.activePromos} فعال)</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl">
                    <Award size={20} />
                  </div>
                  <div>
                    <span className="text-lg font-black text-slate-800 block">{(stats.totalPoints || 0).toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400 font-bold">نقطة موزعة على الزبائن</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="p-3 bg-teal-100 text-teal-600 rounded-xl">
                    <Zap size={20} />
                  </div>
                  <div>
                    <span className="text-lg font-black text-slate-800 block">{stats.totalPromoUsage}</span>
                    <span className="text-[10px] text-slate-400 font-bold">مرة استخدام للأكواد</span>
                  </div>
                </div>
              </div>
            </div>

            {/* الرسوم البيانية والتفاصيل */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* توزيع مستويات الزبائن */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-700 text-sm mb-4 flex items-center space-x-2 space-x-reverse">
                  <Crown size={18} className="text-yellow-500" />
                  <span>توزيع مستويات الزبائن</span>
                </h3>
                <div className="space-y-3">
                  {[
                    { tier: 'Diamond', label: 'الماسي', color: 'bg-blue-500', count: stats.customersByTier.Diamond },
                    { tier: 'Platinum', label: 'البلاتيني', color: 'bg-slate-400', count: stats.customersByTier.Platinum },
                    { tier: 'Gold', label: 'الذهبي', color: 'bg-yellow-500', count: stats.customersByTier.Gold },
                    { tier: 'Silver', label: 'الفضي', color: 'bg-orange-400', count: stats.customersByTier.Silver },
                  ].map(item => (
                    <div key={item.tier} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                        <span className="text-xs font-semibold text-slate-600">{item.label}</span>
                      </div>
                      <span className="text-xs font-black text-slate-800">{item.count} زبون</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* أفضل المتاجر */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
                <h3 className="font-bold text-slate-700 text-sm mb-4 flex items-center space-x-2 space-x-reverse">
                  <TrendingUp size={18} className="text-green-500" />
                  <span>أفضل المتاجر حسب عدد الطلبات</span>
                </h3>
                {stats.topStores.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">لا توجد طلبات حتى الآن</p>
                ) : (
                  <div className="space-y-3">
                    {stats.topStores.map((item, index) => (
                      <div key={item.store?.id || index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center space-x-3 space-x-reverse">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-black ${
                            index === 0 ? 'bg-yellow-500 text-white' : 
                            index === 1 ? 'bg-slate-400 text-white' : 
                            index === 2 ? 'bg-orange-400 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {index + 1}
                          </span>
                          <img 
                            src={item.store?.logo || undefined} 
                            alt="" 
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                          <div>
                            <span className="text-sm font-bold text-slate-800 block">{item.store?.shopName || 'غير معروف'}</span>
                            <span className="text-[10px] text-slate-400">{item.store?.province}</span>
                          </div>
                        </div>
                        <div className="text-left">
                          <span className="text-lg font-black text-indigo-600">{item.orderCount}</span>
                          <span className="text-[10px] text-slate-400 block">طلب</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* حالة النظام */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-700 text-sm mb-4 flex items-center space-x-2 space-x-reverse">
                <Activity size={18} className="text-indigo-500" />
                <span>حالة إعدادات النظام</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <span className="text-xs text-slate-500 block mb-1">الموافقة التلقائية</span>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                    adminSettings.autoApproveStores ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {adminSettings.autoApproveStores ? 'مفعّلة ✅' : 'معطّلة ❌'}
                  </span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <span className="text-xs text-slate-500 block mb-1">نموذج الربح</span>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                    اشتراكات (بدون عمولة)
                  </span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <span className="text-xs text-slate-500 block mb-1">عدد المحافظات</span>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                    {provinces.length} محافظة
                  </span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <span className="text-xs text-slate-500 block mb-1">حزم الاشتراك</span>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                    {subscriptionPlans.length} باقات
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            تاب إدارة المتاجر
            ========================================== */}
        {activeTab === 'stores' && (
          <div className="space-y-4 animate-fade-in">
            
            {/* شريط البحث والفلترة */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-3">
              <div className="flex-1 relative">
                <Search size={16} className="absolute right-3 top-2.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="ابحث باسم المتجر، المالك، اسم المستخدم، أو رقم الهاتف..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-slate-200 p-2 pr-9 rounded-xl text-xs text-right focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                />
              </div>
              
              <select 
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="border border-slate-200 p-2 rounded-xl text-xs font-semibold focus:outline-none bg-white"
              >
                <option value="">كل المحافظات</option>
                {provinces.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
              
              <select 
                value={storeCategoryFilter}
                onChange={(e) => setStoreCategoryFilter(e.target.value)}
                className="border border-slate-200 p-2 rounded-xl text-xs font-semibold focus:outline-none bg-white"
              >
                <option value="all">كل التصنيفات</option>
                {STORE_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>

              <div className="flex gap-2">
                {(['all', 'pending', 'active', 'suspended'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStoreFilter(filter)}
                    className={`px-3 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                      storeFilter === filter 
                      ? (filter === 'pending' ? 'bg-yellow-500 text-white' : 
                         filter === 'active' ? 'bg-green-500 text-white' : 
                         filter === 'suspended' ? 'bg-red-500 text-white' : 'bg-slate-800 text-white')
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filter === 'all' && `الكل (${stats.totalStores})`}
                    {filter === 'pending' && `بانتظار (${stats.pendingStores})`}
                    {filter === 'active' && `نشط (${stats.activeStores})`}
                    {filter === 'suspended' && `معلق (${stats.suspendedStores})`}
                  </button>
                ))}
              </div>
            </div>

            {/* جدول المتاجر */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {filteredStores.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <StoreIcon size={48} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-bold">لا توجد متاجر مطابقة للبحث</p>
                </div>
              ) : (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-right border-collapse min-w-[1000px]">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 sticky right-0 bg-slate-50 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] w-[200px]">المتجر</th>
                        <th className="px-4 py-3">المالك</th>
                        <th className="px-4 py-3">اسم المستخدم</th>
                        <th className="px-4 py-3">رقم الهاتف</th>
                        <th className="px-4 py-3">المحافظة</th>
                        <th className="px-4 py-3">الباقة</th>
                        <th className="px-4 py-3">انتهاء الاشتراك</th>
                        <th className="px-4 py-3">التقييم</th>
                        <th className="px-4 py-3">الحالة</th>
                        <th className="px-4 py-3 text-center sticky left-0 bg-slate-50 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                      {filteredStores.map((store) => (
                        <tr key={store.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3 sticky right-0 bg-white/95 backdrop-blur-sm z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                            <div className="flex items-center space-x-3 space-x-reverse whitespace-nowrap">
                              <img src={store.logo || undefined} alt={store.shopName} className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                              <span className="font-bold text-slate-800">{store.shopName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">{store.ownerName}</td>
                          <td className="px-4 py-3 font-mono text-xs text-indigo-600 whitespace-nowrap">@{store.username}</td>
                          <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{store.phone}</td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">{store.province}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {store.subscriptionId === 'sub_yearly' ? 'سنوية' : 
                               store.subscriptionId === 'sub_semi' ? 'نصف سنوية' : 'شهرية'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold">{store.subscriptionExpiry}</td>
                          <td className="px-4 py-3">
                            <span className="flex items-center text-xs font-bold text-yellow-600">
                              <Star size={12} className="ml-1" fill="currentColor" />
                              {store.rating}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              store.status === 'active' ? 'bg-green-100 text-green-800' :
                              store.status === 'pending' ? 'bg-yellow-100 text-yellow-800 animate-pulse' : 'bg-red-100 text-red-800'
                            }`}>
                              {store.status === 'active' && 'نشط'}
                              {store.status === 'pending' && 'بانتظار الموافقة'}
                              {store.status === 'suspended' && 'معلق'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button 
                                onClick={() => setSelectedStore(store)}
                                className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition"
                                title="عرض التفاصيل"
                              >
                                <Eye size={14} />
                              </button>
                              <button 
                                onClick={() => setBadgeModal({ show: true, storeId: store.id, selectedBadges: store.badges || [] })}
                                className="p-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-600 rounded-lg transition"
                                title="إدارة الأوسمة"
                              >
                                <Award size={14} />
                              </button>
                              {store.status === 'pending' && (
                                <>
                                  <button 
                                    onClick={() => updateStoreStatus(store.id, 'active')}
                                    className="p-1.5 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition"
                                    title="قبول وتفعيل"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button 
                                    onClick={() => updateStoreStatus(store.id, 'suspended')}
                                    className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition"
                                    title="رفض"
                                  >
                                    <X size={14} />
                                  </button>
                                </>
                              )}
                              {store.status === 'active' && (
                                <button 
                                  onClick={() => updateStoreStatus(store.id, 'suspended')}
                                  className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition"
                                  title="تعليق المتجر"
                                >
                                  <Ban size={14} />
                                </button>
                              )}
                              {store.status === 'suspended' && (
                                <button 
                                  onClick={() => updateStoreStatus(store.id, 'active')}
                                  className="p-1.5 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition"
                                  title="إعادة تفعيل"
                                >
                                  <RefreshCw size={14} />
                                </button>
                              )}
                              <button 
                                onClick={() => setDeleteConfirmModal({type: 'store', id: store.id, name: store.shopName})}
                                className="p-1.5 bg-slate-100 hover:bg-red-500 hover:text-white text-slate-400 rounded-lg transition"
                                title="حذف المتجر نهائياً"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* مودال تفاصيل المتجر */}
            {selectedStore && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white z-10">
                    <div className="flex items-center space-x-4 space-x-reverse">
                      <img src={selectedStore.logo || undefined} alt="" className="w-16 h-16 rounded-xl object-cover border-2 border-slate-200" />
                      <div>
                        <h3 className="text-lg font-black text-slate-800">{selectedStore.shopName}</h3>
                        <span className="text-xs text-slate-400 font-mono">@{selectedStore.username}</span>
                      </div>
                    </div>
                    <button onClick={() => setSelectedStore(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">المالك</span>
                        <span className="text-sm font-bold text-slate-800">{selectedStore.ownerName}</span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">رقم الهاتف</span>
                        <span className="text-sm font-bold text-slate-800 font-mono">{selectedStore.phone}</span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">المحافظة</span>
                        <span className="text-sm font-bold text-slate-800">{selectedStore.province}</span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">المنطقة</span>
                        <span className="text-sm font-bold text-slate-800">{selectedStore.area}</span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl col-span-2">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">أقرب نقطة دالة</span>
                        <span className="text-sm font-bold text-slate-800">{selectedStore.landmark}</span>
                      </div>
                      {(selectedStore.lat && selectedStore.lng) && (
                        <div className="bg-indigo-50 p-4 rounded-xl col-span-2 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-indigo-400 font-bold block mb-1">الموقع على الخريطة</span>
                            <span className="text-xs font-mono text-indigo-700">{selectedStore.lat.toFixed(6)}, {selectedStore.lng.toFixed(6)}</span>
                          </div>
                          <a 
                            href={`https://www.google.com/maps?q=${selectedStore.lat},${selectedStore.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-white p-2 rounded-lg text-indigo-600 shadow-sm hover:shadow-md transition"
                          >
                            <Globe size={18} />
                          </a>
                        </div>
                      )}
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">سعر التوصيل</span>
                        <span className="text-sm font-bold text-slate-800">
                          {selectedStore.isFreeDelivery ? 'مجاني' : `${(selectedStore.deliveryPrice || 0).toLocaleString()} د.ع`}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">التقييم</span>
                        <span className="text-sm font-bold text-yellow-600 flex items-center">
                          <Star size={14} className="ml-1" fill="currentColor" />
                          {selectedStore.rating}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">الباقة الحالية</span>
                        <span className="text-sm font-bold text-indigo-600">
                          {selectedStore.subscriptionId === 'sub_yearly' ? 'سنوية' : 
                           selectedStore.subscriptionId === 'sub_semi' ? 'نصف سنوية' : 'شهرية'}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">انتهاء الاشتراك</span>
                        <span className="text-sm font-bold text-slate-800">{selectedStore.subscriptionExpiry}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-slate-100 flex-wrap">
                      {selectedStore.status !== 'active' && (
                        <button 
                          onClick={() => { updateStoreStatus(selectedStore.id, 'active'); setSelectedStore(null); }}
                          className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold text-sm rounded-xl transition"
                        >
                          تفعيل المتجر
                        </button>
                      )}
                      {selectedStore.status !== 'suspended' && (
                        <button 
                          onClick={() => { updateStoreStatus(selectedStore.id, 'suspended'); setSelectedStore(null); }}
                          className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm rounded-xl transition"
                        >
                          تعليق المتجر
                        </button>
                      )}
                      <button 
                        onClick={() => { toggleStoreBan(selectedStore.id); setSelectedStore(null); }}
                        className={`flex-1 py-2.5 font-bold text-sm rounded-xl transition ${selectedStore.isBanned ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600'}`}
                      >
                        {selectedStore.isBanned ? 'فك الحظر' : 'حظر نهائي'}
                      </button>
                      <button 
                        onClick={() => { setDeleteConfirmModal({type: 'store', id: selectedStore.id, name: selectedStore.shopName}); setSelectedStore(null); }}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-red-500 hover:text-white text-slate-400 font-bold text-sm rounded-xl transition"
                      >
                        حذف المتجر
                      </button>
                      <button 
                        onClick={() => setSelectedStore(null)}
                        className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition"
                      >
                        إغلاق
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            تاب إدارة الزبائن
            ========================================== */}
        {activeTab === 'customers' && (
          <div className="space-y-4 animate-fade-in">
            
            {/* شريط البحث والفلترة */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-3">
              <div className="flex-1 relative">
                <Search size={16} className="absolute right-3 top-2.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="ابحث بالاسم، رقم الهاتف، أو ID الزبون..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-slate-200 p-2 pr-9 rounded-xl text-xs text-right focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                />
              </div>
              
              <select 
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="border border-slate-200 p-2 rounded-xl text-xs font-semibold focus:outline-none bg-white"
              >
                <option value="">كل المحافظات</option>
                {provinces.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
              
              <div className="flex gap-2">
                {(['all', 'active', 'blocked'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setCustomerFilter(filter)}
                    className={`px-3 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                      customerFilter === filter 
                      ? (filter === 'active' ? 'bg-green-500 text-white' : 
                         filter === 'blocked' ? 'bg-red-500 text-white' : 'bg-slate-800 text-white')
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filter === 'all' && `الكل (${stats.totalCustomers})`}
                    {filter === 'active' && `نشط (${stats.activeCustomers})`}
                    {filter === 'blocked' && `محظور (${stats.blockedCustomers})`}
                  </button>
                ))}
              </div>
            </div>

            {/* جدول الزبائن */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {filteredCustomers.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Users size={48} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-bold">لا يوجد زبائن مطابقين للبحث</p>
                </div>
              ) : (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-right border-collapse min-w-[1100px]">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 sticky right-0 bg-slate-50 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] w-[80px]">ID الزبون</th>
                        <th className="px-4 py-3 sticky right-[80px] bg-slate-50 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">الاسم</th>
                        <th className="px-4 py-3">رقم الهاتف</th>
                        <th className="px-4 py-3">المحافظة</th>
                        <th className="px-4 py-3">العنوان</th>
                        <th className="px-4 py-3">النقاط</th>
                        <th className="px-4 py-3">المستوى</th>
                        <th className="px-4 py-3">الطلبات</th>
                        <th className="px-4 py-3">المتابعة</th>
                        <th className="px-4 py-3">الحالة</th>
                        <th className="px-4 py-3 text-center sticky left-0 bg-slate-50 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                      {filteredCustomers.map((customer) => (
                        <tr key={customer.id} className={`hover:bg-slate-50/50 transition ${customer.isBlocked ? 'bg-red-50/30' : ''}`}>
                          <td className="px-4 py-3 font-mono text-xs text-indigo-600 sticky right-0 bg-white/95 backdrop-blur-sm z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">{customer.id}</td>
                          <td className="px-4 py-3 font-bold sticky right-[80px] bg-white/95 backdrop-blur-sm z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)] whitespace-nowrap">{customer.name}</td>
                          <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{customer.phone}</td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">{customer.province}</td>
                          <td className="px-4 py-3 text-xs min-w-[200px]" title={customer.address}>{customer.address}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">{customer.points}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              customer.tier === 'Diamond' ? 'bg-blue-100 text-blue-800' : 
                              customer.tier === 'Platinum' ? 'bg-slate-200 text-slate-800' : 
                              customer.tier === 'Gold' ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {customer.tier}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-center">{customer.ordersCount}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-center">{customer.followedStores.length}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              customer.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {customer.isBlocked ? 'محظور ⛔' : 'نشط ✅'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button 
                                onClick={() => setSelectedCustomer(customer)}
                                className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition"
                                title="عرض التفاصيل"
                              >
                                <Eye size={14} />
                              </button>
                              <button 
                                onClick={() => toggleCustomerBlock(customer.id)}
                                className={`p-1.5 rounded-lg transition ${
                                  customer.isBlocked 
                                  ? 'bg-green-100 hover:bg-green-200 text-green-600' 
                                  : 'bg-red-100 hover:bg-red-200 text-red-600'
                                }`}
                                title={customer.isBlocked ? 'إلغاء الحظر' : 'حظر الزبون'}
                              >
                                {customer.isBlocked ? <RefreshCw size={14} /> : <Ban size={14} />}
                              </button>
                              <button 
                                onClick={() => setDeleteConfirmModal({type: 'customer', id: customer.id, name: customer.name})}
                                className="p-1.5 bg-slate-100 hover:bg-red-500 hover:text-white text-slate-400 rounded-lg transition"
                                title="حذف الزبون نهائياً"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* مودال تفاصيل الزبون */}
            {selectedCustomer && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <div>
                      <h3 className="text-lg font-black text-slate-800">{selectedCustomer.name}</h3>
                      <span className="text-xs text-slate-400">ID: {selectedCustomer.id}</span>
                    </div>
                    <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">رقم الهاتف</span>
                        <span className="text-sm font-bold text-slate-800 font-mono">{selectedCustomer.phone}</span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">المحافظة</span>
                        <span className="text-sm font-bold text-slate-800">{selectedCustomer.province}</span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl col-span-2">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">العنوان الكامل</span>
                        <span className="text-sm font-bold text-slate-800">{selectedCustomer.address || 'غير محدد'}</span>
                      </div>
                      {(selectedCustomer.lat && selectedCustomer.lng) && (
                        <div className="bg-indigo-50 p-4 rounded-xl col-span-2 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-indigo-400 font-bold block mb-1">الموقع على الخريطة</span>
                            <span className="text-xs font-mono text-indigo-700">{selectedCustomer.lat.toFixed(6)}, {selectedCustomer.lng.toFixed(6)}</span>
                          </div>
                          <a 
                            href={`https://www.google.com/maps?q=${selectedCustomer.lat},${selectedCustomer.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-white p-2 rounded-lg text-indigo-600 shadow-sm hover:shadow-md transition"
                          >
                            <Globe size={18} />
                          </a>
                        </div>
                      )}
                      <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                        <span className="text-[10px] text-yellow-600 font-bold block mb-1">رصيد النقاط</span>
                        <span className="text-lg font-black text-yellow-700">{selectedCustomer.points} نقطة</span>
                      </div>
                      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <span className="text-[10px] text-indigo-600 font-bold block mb-1">المستوى</span>
                        <span className="text-lg font-black text-indigo-700">{selectedCustomer.tier}</span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">عدد الطلبات</span>
                        <span className="text-sm font-bold text-slate-800">{selectedCustomer.ordersCount} طلب</span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">المتاجر المتابعة</span>
                        <span className="text-sm font-bold text-slate-800">{selectedCustomer.followedStores.length} متجر</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-slate-100">
                      <button 
                        onClick={() => { toggleCustomerBlock(selectedCustomer.id); setSelectedCustomer(null); }}
                        className={`flex-1 py-2.5 font-bold text-sm rounded-xl transition ${
                          selectedCustomer.isBlocked 
                          ? 'bg-green-500 hover:bg-green-600 text-white' 
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                        }`}
                      >
                        {selectedCustomer.isBlocked ? 'إلغاء الحظر' : 'حظر الزبون'}
                      </button>
                      <button 
                        onClick={() => { setDeleteConfirmModal({type: 'customer', id: selectedCustomer.id, name: selectedCustomer.name}); setSelectedCustomer(null); }}
                        className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2"
                      >
                        <Trash2 size={16} />
                        حذف نهائي
                      </button>
                      <button 
                        onClick={() => setSelectedCustomer(null)}
                        className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition"
                      >
                        إغلاق
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            تاب إدارة الطلبات
            ========================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-4 animate-fade-in">
            
            {/* شريط الفلترة */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-3">
              <div className="flex-1 relative">
                <Search size={16} className="absolute right-3 top-2.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="ابحث برقم الطلب، اسم الزبون، أو اسم المتجر..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-slate-200 p-2 pr-9 rounded-xl text-xs text-right focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                />
              </div>
              
              <div className="flex gap-2">
                {(['all', 'pending', 'accepted', 'rejected'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setOrderFilter(filter)}
                    className={`px-3 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                      orderFilter === filter 
                      ? (filter === 'pending' ? 'bg-yellow-500 text-white' : 
                         filter === 'accepted' ? 'bg-green-500 text-white' : 
                         filter === 'rejected' ? 'bg-red-500 text-white' : 'bg-slate-800 text-white')
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filter === 'all' && `الكل (${stats.totalOrders})`}
                    {filter === 'pending' && `معلق (${stats.pendingOrders})`}
                    {filter === 'accepted' && `مقبول (${stats.acceptedOrders})`}
                    {filter === 'rejected' && `مرفوض (${stats.rejectedOrders})`}
                  </button>
                ))}
              </div>
            </div>

            {/* قائمة الطلبات */}
            <div className="space-y-3">
              {filteredOrders.length === 0 ? (
                <div className="bg-white p-12 text-center text-slate-400 rounded-2xl shadow-sm border border-slate-100">
                  <ShoppingBag size={48} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-bold">لا توجد طلبات مطابقة</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 relative">
                    <div className="flex flex-col lg:flex-row gap-4">
                      
                      {/* معلومات الطلب */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <span className="text-xs font-black bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">{order.id}</span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {order.status === 'pending' && 'قيد الانتظار'}
                              {order.status === 'accepted' && 'مقبول ✅'}
                              {order.status === 'rejected' && 'مرفوض ❌'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(order.createdAt).toLocaleDateString('ar-IQ')} - {new Date(order.createdAt).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-400 font-bold">المتجر:</span>
                            <span className="font-bold text-indigo-600 mr-1">{order.storeName}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold">الزبون:</span>
                            <span className="font-bold text-slate-800 mr-1">{order.customerName}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold">الهاتف:</span>
                            <span className="font-mono mr-1">{order.customerPhone}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold">المحافظة:</span>
                            <span className="mr-1">{order.customerProvince}</span>
                          </div>
                        </div>

                        {order.status === 'rejected' && order.rejectionReason && (
                          <div className="mt-2 bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg border border-red-100">
                            <strong>سبب الرفض:</strong> {order.rejectionReason}
                          </div>
                        )}
                      </div>

                      {/* ملخص الفاتورة */}
                      <div className="lg:w-48 bg-slate-50 p-3 rounded-xl text-xs">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500">المنتجات ({order.items.length}):</span>
                            <span className="font-bold">{(order.subtotal || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">التوصيل:</span>
                            <span className={order.deliveryPrice === 0 ? 'text-green-600 font-bold' : 'font-bold'}>
                              {order.deliveryPrice === 0 ? 'مجاني' : (order.deliveryPrice || 0).toLocaleString()}
                            </span>
                          </div>
                          {order.discountAmount > 0 && (
                            <div className="flex justify-between text-red-600">
                              <span>الخصم:</span>
                              <span className="font-bold">-{(order.discountAmount || 0).toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-black">
                            <span>الإجمالي:</span>
                            <span className="text-indigo-600">{(order.total || 0).toLocaleString()} د.ع</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* زر عرض التفاصيل */}
                    <button 
                      onClick={() => setSelectedOrder(order)}
                      className="absolute top-4 left-4 p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* مودال تفاصيل الطلب */}
            {selectedOrder && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <div>
                      <h3 className="text-lg font-black text-slate-800">تفاصيل الطلب {selectedOrder.id}</h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        selectedOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        selectedOrder.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedOrder.status === 'pending' && 'قيد الانتظار'}
                        {selectedOrder.status === 'accepted' && 'مقبول'}
                        {selectedOrder.status === 'rejected' && 'مرفوض'}
                      </span>
                    </div>
                    <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                      <h4 className="text-xs font-bold text-slate-600 mb-2">المنتجات المطلوبة:</h4>
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                          <span>{item.productName} × {item.quantity}</span>
                          <span className="font-bold">{( (item.price || 0) * (item.quantity || 0) ).toLocaleString()} د.ع</span>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold block">المتجر</span>
                        <span className="font-bold text-indigo-600">{selectedOrder.storeName}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold block">الزبون</span>
                        <span className="font-bold">{selectedOrder.customerName}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold block">الهاتف</span>
                        <span className="font-mono">{selectedOrder.customerPhone}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold block">المحافظة</span>
                        <span>{selectedOrder.customerProvince}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl col-span-2">
                        <span className="text-[10px] text-slate-400 font-bold block">العنوان</span>
                        <span>{selectedOrder.customerAddress}</span>
                      </div>
                    </div>

                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                      <div className="flex justify-between text-sm mb-1">
                        <span>المجموع الفرعي:</span>
                        <span>{(selectedOrder.subtotal || 0).toLocaleString()} د.ع</span>
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>التوصيل:</span>
                        <span>{selectedOrder.deliveryPrice === 0 ? 'مجاني' : `${(selectedOrder.deliveryPrice || 0).toLocaleString()} د.ع`}</span>
                      </div>
                      {selectedOrder.discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-red-600 mb-1">
                          <span>الخصم:</span>
                          <span>-{(selectedOrder.discountAmount || 0).toLocaleString()} د.ع</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-black text-indigo-700 pt-2 border-t border-indigo-200">
                        <span>الإجمالي:</span>
                        <span>{(selectedOrder.total || 0).toLocaleString()} د.ع</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => setSelectedOrder(null)}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition"
                    >
                      إغلاق
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            تاب إدارة المنتجات
            ========================================== */}
        {activeTab === 'products' && (
          <div className="space-y-4 animate-fade-in">
            
            {/* إحصائيات المنتجات */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center">
                <span className="text-2xl font-black text-slate-800">{stats.totalProducts}</span>
                <span className="text-xs text-slate-400 block">إجمالي المنتجات</span>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center">
                <span className="text-2xl font-black text-green-600">{stats.publishedProducts}</span>
                <span className="text-xs text-slate-400 block">منشورة</span>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center">
                <span className="text-2xl font-black text-yellow-600">{stats.draftProducts}</span>
                <span className="text-xs text-slate-400 block">مسودات</span>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center">
                <span className="text-2xl font-black text-red-600">{stats.archivedProducts}</span>
                <span className="text-xs text-slate-400 block">مؤرشفة</span>
              </div>
            </div>

            {/* شريط البحث */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="relative">
                <Search size={16} className="absolute right-3 top-2.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="ابحث باسم المنتج، الوصف، السعر، أو المعرف..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-slate-200 p-2 pr-9 rounded-xl text-xs text-right focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                />
              </div>
            </div>

            {/* قائمة المنتجات */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-right border-collapse min-w-[1000px]">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 sticky right-0 bg-slate-50 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] w-[250px]">المنتج</th>
                      <th className="px-4 py-3">المتجر</th>
                      <th className="px-4 py-3">السعر الأصلي</th>
                      <th className="px-4 py-3">الخصم</th>
                      <th className="px-4 py-3">السعر النهائي</th>
                      <th className="px-4 py-3">التوصيل</th>
                      <th className="px-4 py-3">الحالة</th>
                      <th className="px-4 py-3 text-center sticky left-0 bg-slate-50 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {filteredProducts.slice(0, 50).map((product) => {
                      const store = stores.find(s => s.id === product.storeId);
                      return (
                        <tr key={product.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3 sticky right-0 bg-white/95 backdrop-blur-sm z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                            <div className="flex items-center space-x-3 space-x-reverse whitespace-nowrap">
                              <img src={product.image || undefined} alt="" className="w-10 h-10 rounded-lg object-cover border shrink-0" />
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className="font-bold text-slate-800 block text-xs truncate max-w-[150px]">{product.name}</span>
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(product.id);
                                      alert(`تم نسخ معرف المنتج: ${product.id}`);
                                    }}
                                    className="p-1 text-slate-400 hover:text-indigo-600 transition"
                                    title="نسخ معرف المنتج"
                                  >
                                    <Copy size={10} />
                                  </button>
                                </div>
                                <span className="text-[10px] text-slate-400 line-clamp-1 max-w-[180px]">{product.description || 'بدون وصف'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">{store?.shopName || 'غير معروف'}</td>
                          <td className="px-4 py-3 text-xs font-mono whitespace-nowrap">{(product.price || 0).toLocaleString()} د.ع</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {product.discountType !== 'none' ? (
                              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                {product.discountType === 'percent' ? `${product.discountValue}%` : `${(product.discountValue || 0).toLocaleString()} د.ع`}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs font-bold font-mono text-green-600">{(product.finalPrice || 0).toLocaleString()} د.ع</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              product.isFreeDelivery ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {product.isFreeDelivery ? 'مجاني' : 'عادي'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              product.status === 'published' ? 'bg-green-100 text-green-800' :
                              product.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {product.status === 'published' && 'منشور'}
                              {product.status === 'draft' && 'مسودة'}
                              {product.status === 'archived' && 'مؤرشف'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {product.status === 'published' && (
                                <button 
                                  onClick={() => updateProduct(product.id, { status: 'archived' })}
                                  className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition"
                                  title="أرشفة"
                                >
                                  <EyeOff size={14} />
                                </button>
                              )}
                              {product.status !== 'published' && (
                                <button 
                                  onClick={() => updateProduct(product.id, { status: 'published' })}
                                  className="p-1.5 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition"
                                  title="نشر"
                                >
                                  <Eye size={14} />
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  if (confirm('هل أنت متأكد من حذف هذا المنتج نهائياً؟')) {
                                    deleteProduct(product.id, 'permanent');
                                  }
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                                title="حذف نهائي"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {products.length > 20 && (
                <div className="p-4 text-center text-xs text-slate-400 border-t border-slate-100">
                  يتم عرض أول 20 منتج فقط من إجمالي {products.length} منتج
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            تاب أكواد الخصم
            ========================================== */}
        {activeTab === 'recharge' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Zap size={20} className="text-amber-500" />
                توليد كودات شحن جديدة
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">عدد الكودات (1-100)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="100"
                    value={rechargeCount}
                    onChange={(e) => setRechargeCount(Number(e.target.value))}
                    className="w-full border border-slate-200 p-3 rounded-xl text-sm"
                  />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-2">عدد النقاط للكود الواحد</label>
                  <input 
                    type="number" 
                    value={rechargePoints}
                    onChange={(e) => setRechargePoints(Number(e.target.value))}
                    className="w-full border border-slate-200 p-3 rounded-xl text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={handleGenerateCodes}
                    disabled={isGenerating}
                    className="w-full bg-slate-800 text-white p-3 rounded-xl font-bold hover:bg-slate-700 transition flex items-center justify-center gap-2"
                  >
                    {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                    توليد الكودات الآن
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
               <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">سجل الكودات المولدة</h3>
                <span className="text-xs text-slate-400">إجمالي: {rechargeCodes.length}</span>
              </div>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-right border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase tracking-wider">
                      <th className="p-4 font-bold border-b">الكود</th>
                      <th className="p-4 font-bold border-b">النقاط</th>
                      <th className="p-4 font-bold border-b">الحالة</th>
                      <th className="p-4 font-bold border-b">بواسطة</th>
                      <th className="p-4 font-bold border-b">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {rechargeCodes.slice(0, 50).map((code) => {
                      const user = customers.find(c => c.id === code.usedBy);
                      return (
                        <tr key={code.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 font-mono font-bold text-indigo-600">{code.code}</td>
                          <td className="p-4 font-bold">{code.points.toLocaleString()}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              code.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                            }`}>
                              {code.status === 'active' ? 'نشط' : 'مستخدم'}
                            </span>
                          </td>
                          <td className="p-4">
                            {user ? (
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold">{user.name}</span>
                                    <span className="text-[10px] text-slate-400">{user.phone}</span>
                                </div>
                            ) : '-'}
                          </td>
                          <td className="p-4 text-xs text-slate-400">
                            {new Date(code.createdAt).toLocaleString('ar-IQ')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            تاب أكواد الخصم
            ========================================== */}
        {activeTab === 'promos' && (
          <div className="space-y-4 animate-fade-in">
            
            {/* شريط الإجراءات */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-3 justify-between">
              <div className="flex gap-3 flex-1">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute right-3 top-2.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="ابحث بكود الخصم..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-slate-200 p-2 pr-9 rounded-xl text-xs text-right focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                  />
                </div>
                
                <div className="flex gap-2">
                  {(['all', 'active', 'expired'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setPromoFilter(filter)}
                      className={`px-3 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                        promoFilter === filter 
                        ? (filter === 'active' ? 'bg-green-500 text-white' : 
                           filter === 'expired' ? 'bg-red-500 text-white' : 'bg-slate-800 text-white')
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {filter === 'all' && `الكل (${stats.totalPromos})`}
                      {filter === 'active' && `فعال (${stats.activePromos})`}
                      {filter === 'expired' && `منتهي (${stats.expiredPromos})`}
                    </button>
                  ))}
                </div>
              </div>
              
              <button 
                onClick={() => setShowPromoModal(true)}
                className="px-4 py-2 bg-gradient-to-l from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center space-x-2 space-x-reverse"
              >
                <Plus size={18} />
                <span>إنشاء كود خصم جديد</span>
              </button>
            </div>

            {/* جدول أكواد الخصم */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {filteredPromos.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Ticket size={48} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-bold">لا توجد أكواد خصم</p>
                  <button 
                    onClick={() => setShowPromoModal(true)}
                    className="mt-4 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold text-sm rounded-xl transition"
                  >
                    أنشئ أول كود خصم
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-right border-collapse min-w-[900px]">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 sticky right-0 bg-slate-50 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">الكود</th>
                        <th className="px-4 py-3">المتجر المستهدف</th>
                        <th className="px-4 py-3">قيمة الخصم</th>
                        <th className="px-4 py-3">الاستخدام</th>
                        <th className="px-4 py-3">الحد الأقصى</th>
                        <th className="px-4 py-3">الصلاحية</th>
                        <th className="px-4 py-3">الحالة</th>
                        <th className="px-4 py-3 text-center sticky left-0 bg-slate-50 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                      {filteredPromos.map((promo) => {
                        let targetText = 'متجر واحد';
                        if (promo.storeId === 'ALL_STORES' && !promo.targetStores?.length && !promo.targetProvinces?.length) {
                          targetText = 'جميع المتاجر';
                        } else if (promo.targetStores?.length) {
                           targetText = `${promo.targetStores.length} متاجر مخصصة`;
                        } else if (promo.targetProvinces?.length) {
                           targetText = `متاجر ${promo.targetProvinces.join(', ')}`;
                        } else if (promo.storeId !== 'ALL_STORES') {
                          targetText = stores.find(s => s.id === promo.storeId)?.shopName || 'متجر غير معروف';
                        }

                        return (
                          <tr key={promo.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-4 py-3 sticky right-0 bg-white/95 backdrop-blur-sm z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                              <div className="flex items-center space-x-2 space-x-reverse whitespace-nowrap">
                                <span className="font-black bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg tracking-wider font-mono text-sm border border-indigo-200">
                                  {promo.code}
                                </span>
                                <button 
                                  onClick={() => copyToClipboard(promo.code)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 transition"
                                  title="نسخ الكود"
                                >
                                  <Copy size={14} />
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {promo.storeId === 'ALL_STORES' && !promo.targetStores?.length && !promo.targetProvinces?.length ? (
                                <span className="font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg flex items-center w-fit space-x-1 space-x-reverse">
                                  <Globe size={12} />
                                  <span>{targetText}</span>
                                </span>
                              ) : (
                                <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-1 rounded-lg">{targetText}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-black text-red-600">{(promo.discountValue || 0).toLocaleString()} {promo.discountType === 'percent' ? '%' : 'د.ع'}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold">{promo.usedCount}</span>
                              <span className="text-slate-400"> مرة</span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-xs">
                               <p>إجمالي: {promo.maxUses}</p>
                               {promo.maxUsesPerUser && <p className="text-slate-400">شخص: {promo.maxUsesPerUser}</p>}
                            </td>
                            <td className="px-4 py-3">
                              {promo.expiresAt ? (
                                <span className={`text-xs font-bold ${
                                  new Date(promo.expiresAt) < new Date() ? 'text-red-600' : 'text-slate-600'
                                }`}>
                                  {promo.startDate && `${new Date(promo.startDate).toLocaleDateString('ar-IQ')} - `}
                                  {new Date(promo.expiresAt).toLocaleDateString('ar-IQ')}
                                  {new Date(promo.expiresAt) < new Date() && ' (منتهي)'}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">دائم</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                promo.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {promo.status === 'active' ? 'فعّال ✅' : 'منتهي ❌'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex justify-center items-center gap-2">
                                <button 
                                  onClick={() => togglePromoCodeStatus(promo.id)}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                                    promo.status === 'active' 
                                    ? 'border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100' 
                                    : 'border-green-200 text-green-600 bg-green-50 hover:bg-green-100'
                                  }`}
                                >
                                  {promo.status === 'active' ? 'إيقاف' : 'تفعيل'}
                                </button>
                                <button 
                                  onClick={() => deletePromoCode(promo.id)}
                                  className="p-1.5 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition"
                                  title="حذف الكود نهائياً"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* مودال إنشاء بروموكود جديد */}
            {showPromoModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <div className="p-2 bg-green-100 text-green-600 rounded-xl">
                        <Ticket size={20} />
                      </div>
                      <h3 className="text-lg font-black text-slate-800">إنشاء كود خصم جديد</h3>
                    </div>
                    <button onClick={() => setShowPromoModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <form onSubmit={handleCreatePromo} className="p-6 space-y-4 overflow-y-auto max-h-[85vh]">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">كود الخصم (أحرف وأرقام إنكليزية) *</label>
                      <input 
                        type="text" 
                        value={newPromoCode}
                        onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                        placeholder="مثال: IRAQ2026 أو SALE50"
                        required
                        className="w-full border border-slate-200 p-3 rounded-xl text-sm font-mono uppercase text-left focus:ring-2 focus:ring-green-500 focus:outline-none"
                        style={{ direction: 'ltr' }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">نوع الخصم</label>
                          <select value={newPromoDiscountType} onChange={e => setNewPromoDiscountType(e.target.value as any)} className="w-full border border-slate-200 p-3 rounded-xl bg-white text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
                             <option value="amount">مبلغ ثابت</option>
                             <option value="percent">نسبة مئوية (%)</option>
                          </select>
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">القيمة *</label>
                          <input type="number" value={newPromoDiscount || ''} onChange={e => setNewPromoDiscount(parseInt(e.target.value) || 0)} required className="w-full border border-slate-200 p-3 rounded-xl text-center text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">إجمالي الاستخدام</label>
                          <input type="number" value={newPromoMaxUses || ''} onChange={e => setNewPromoMaxUses(parseInt(e.target.value) || 0)} required className="w-full border border-slate-200 p-3 rounded-xl text-center text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">للشخص الواحد</label>
                          <input type="number" value={newPromoMaxUsesPerUser || ''} onChange={e => setNewPromoMaxUsesPerUser(parseInt(e.target.value) || 0)} required className="w-full border border-slate-200 p-3 rounded-xl text-center text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
                       </div>
                    </div>

                    <div>
                       <label className="block text-xs font-bold text-slate-500 mb-1">تحديد مدة الصلاحية</label>
                       <select value={newPromoExpiryType} onChange={e => setNewPromoExpiryType(e.target.value as any)} className="w-full border border-slate-200 p-3 rounded-xl bg-white mb-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
                          <option value="days">بالأيام المتبقية</option>
                          <option value="date">بتاريخ محدد</option>
                       </select>
                       
                       {newPromoExpiryType === 'days' ? (
                          <>
                             <input type="number" placeholder="عدد الأيام" value={newPromoExpiryDays || ''} onChange={e => setNewPromoExpiryDays(parseInt(e.target.value) || 0)} className="w-full border border-slate-200 p-3 rounded-xl text-center text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
                             <p className="text-[10px] text-slate-400 mt-1">ادخل 0 لكود دائم (بدون انتهاء)</p>
                          </>
                       ) : (
                          <div className="grid grid-cols-2 gap-2">
                             <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">البدء (اختياري)</label>
                                <input type="date" value={newPromoStartDate} onChange={e => setNewPromoStartDate(e.target.value)} className="w-full border border-slate-200 p-2 rounded-xl text-center text-xs focus:ring-2 focus:ring-green-500 focus:outline-none" />
                             </div>
                             <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">الانتهاء</label>
                                <input type="date" value={newPromoEndDate} onChange={e => setNewPromoEndDate(e.target.value)} className="w-full border border-slate-200 p-2 rounded-xl text-center text-xs focus:ring-2 focus:ring-green-500 focus:outline-none" />
                             </div>
                          </div>
                       )}
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                       <label className="block text-xs font-bold text-slate-500 mb-2">استهداف المتاجر</label>
                       <select value={newPromoTargetMode} onChange={(e) => {
                          setNewPromoTargetMode(e.target.value as any);
                          setNewPromoSelectedStores([]);
                          setNewPromoSelectedProvinces([]);
                       }} className="w-full border border-slate-200 p-3 rounded-xl bg-white text-sm focus:ring-2 focus:ring-green-500 focus:outline-none mb-3">
                          <option value="all">جميع المتاجر في النظام</option>
                          <option value="store">متجر محدد (أو عدة متاجر)</option>
                          <option value="province">متاجر محافظة معينة</option>
                       </select>

                       {newPromoTargetMode === 'store' && (
                          <div className="space-y-2 max-h-32 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                             {stores.map(store => (
                                <label key={store.id} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer p-1 hover:bg-slate-100 rounded">
                                   <input type="checkbox" checked={newPromoSelectedStores.includes(store.id)} onChange={(e) => {
                                      if(e.target.checked) setNewPromoSelectedStores(prev => [...prev, store.id]);
                                      else setNewPromoSelectedStores(prev => prev.filter(id => id !== store.id));
                                   }} className="rounded text-green-500 focus:ring-green-500"/>
                                   {store.shopName} ({store.province})
                                </label>
                             ))}
                          </div>
                       )}

                       {newPromoTargetMode === 'province' && (
                          <div className="space-y-2 max-h-32 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                             {provinces.map(prov => (
                                <label key={prov.id} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer p-1 hover:bg-slate-100 rounded">
                                   <input type="checkbox" checked={newPromoSelectedProvinces.includes(prov.name)} onChange={(e) => {
                                      if(e.target.checked) setNewPromoSelectedProvinces(prev => [...prev, prov.name]);
                                      else setNewPromoSelectedProvinces(prev => prev.filter(n => n !== prov.name));
                                   }} className="rounded text-green-500 focus:ring-green-500"/>
                                   {prov.name}
                                </label>
                             ))}
                          </div>
                       )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                      <button 
                        type="submit"
                        className="flex-1 py-3 bg-gradient-to-l from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl shadow-md transition"
                      >
                        إنشاء وتفعيل الكود
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowPromoModal(false)}
                        className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            تاب أسعار الاشتراكات
            ========================================== */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6 animate-fade-in">
            
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-2xl text-sm font-semibold leading-relaxed">
              <strong>💡 ملاحظة هامة:</strong> منصة "محلك" تعمل بنظام الاشتراكات الشهرية والسنوية <span className="underline">بدون أي عمولة على مبيعات المتاجر</span>. كل أرباح المبيعات تذهب للتاجر بالكامل!
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {subscriptionPlans.map((plan, index) => (
                <div key={plan.id} className={`bg-white rounded-2xl shadow-sm border p-6 text-right relative overflow-hidden hover:shadow-lg transition ${
                  index === 2 ? 'border-emerald-300 ring-2 ring-emerald-200' : 'border-slate-200'
                }`}>
                  {index === 2 && (
                    <div className="absolute -top-1 -left-8 bg-gradient-to-l from-emerald-500 to-green-600 text-white text-[10px] font-black px-10 py-1 rotate-[-45deg] transform shadow">
                      الأكثر توفيراً!
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 space-x-reverse mb-3">
                    <Calendar size={20} className="text-indigo-500" />
                    <h3 className="text-lg font-black text-slate-800">باقة {plan.name}</h3>
                  </div>
                  
                  <p className="text-xs text-green-600 font-bold mb-4">{plan.discountText}</p>
                  
                  <div className="text-center py-6 border-t border-b border-slate-100 mb-4">
                    {editingPlanId === plan.id ? (
                      <div className="space-y-3">
                        <input 
                          type="number" 
                          value={newPlanPrice || plan.price}
                          onChange={(e) => setNewPlanPrice(parseInt(e.target.value) || 0)}
                          className="w-full text-center border border-slate-300 p-3 rounded-xl text-lg font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleSavePrice(plan.id)}
                            className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white font-bold text-xs rounded-xl transition"
                          >
                            حفظ
                          </button>
                          <button 
                            onClick={() => { setEditingPlanId(null); setNewPlanPrice(0); }}
                            className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="text-4xl font-black text-indigo-600">{(plan.price || 0).toLocaleString()}</span>
                        <span className="text-sm text-slate-500 font-bold block mt-1">دينار عراقي</span>
                        <span className="text-[10px] text-slate-400">المدة: {plan.durationMonths} شهر</span>
                      </>
                    )}
                  </div>

                  {editingPlanId !== plan.id && (
                    <button 
                      onClick={() => { setEditingPlanId(plan.id); setNewPlanPrice(plan.price); }}
                      className="w-full py-3 border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 font-bold text-sm rounded-xl transition flex items-center justify-center space-x-2 space-x-reverse"
                    >
                      <Edit size={16} />
                      <span>تعديل السعر</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-700 text-sm mb-4">📊 إحصائيات الاشتراكات</h3>
              <div className="grid grid-cols-3 gap-4">
                {subscriptionPlans.map(plan => {
                  const count = stores.filter(s => s.subscriptionId === plan.id).length;
                  return (
                    <div key={plan.id} className="bg-slate-50 p-4 rounded-xl text-center">
                      <span className="text-2xl font-black text-slate-800">{count}</span>
                      <span className="text-xs text-slate-500 block">متجر في باقة {plan.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            تاب سجل الإشعارات
            ========================================== */}
        {activeTab === 'notifications' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700">
                سجل الإشعارات الأخيرة ({notifications.length})
              </div>
              
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Bell size={48} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-bold">لا توجد إشعارات في النظام</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {notifications.slice(0, 50).map(notif => (
                    <div key={notif.id} className={`p-4 hover:bg-slate-50 transition ${!notif.read ? 'bg-indigo-50/30' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 space-x-reverse mb-1">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              notif.role === 'merchant' ? 'bg-indigo-100 text-indigo-800' :
                              notif.role === 'customer' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {notif.role === 'merchant' && 'تاجر'}
                              {notif.role === 'customer' && 'زبون'}
                              {notif.role === 'admin' && 'أدمن'}
                            </span>
                            <span className="text-xs font-bold text-slate-800">{notif.title}</span>
                          </div>
                          <p className="text-xs text-slate-600">{notif.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(notif.createdAt).toLocaleDateString('ar-IQ')} - {new Date(notif.createdAt).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {!notif.read && <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            تاب تقييمات المتاجر
            ========================================== */}
        {activeTab === 'reviews' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 flex justify-between items-center">
                <span>سجل تقييمات المتاجر ({storeReviews.length})</span>
              </div>
              
              {storeReviews.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Star size={48} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-bold">لا توجد تقييمات في النظام</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {storeReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(review => {
                    const store = stores.find(s => s.id === review.storeId);
                    return (
                      <div key={review.id} className="p-4 hover:bg-slate-50 transition">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 space-x-reverse mb-1">
                              <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full">
                                {store ? store.shopName : 'متجر غير معروف'}
                              </span>
                              <span className="text-xs font-bold text-slate-800">{review.customerName}</span>
                              <div className="flex text-amber-400 text-[10px]" dir="ltr">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <span key={star} className={star <= review.rating ? 'text-amber-400' : 'text-slate-300'}>★</span>
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 mt-2">{review.message || <span className="text-slate-400 italic">لا توجد رسالة</span>}</p>
                            <span className="text-[10px] text-slate-400 mt-2 block">
                              {new Date(review.createdAt).toLocaleDateString('ar-IQ')} - {new Date(review.createdAt).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            تاب إرسال إشعارات عامة
            ========================================== */}
        {activeTab === 'broadcast' && (
          <div className="space-y-6 animate-fade-in max-w-2xl">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-bold text-slate-800 text-md mb-4 pb-2 border-b border-slate-100 flex items-center space-x-2 space-x-reverse">
                <Bell size={20} className="text-indigo-500" />
                <span>📢 إرسال إشعار عام للزبائن</span>
              </h3>
              
              <BroadcastForm />
            </div>
          </div>
        )}

        {/* ==========================================
            تاب حملات الواتساب الذكية
            ========================================== */}
        {activeTab === 'whatsapp' && (
          <WhatsappRetargetingPanel />
        )}

        {/* ==========================================
            تاب الفعاليات المركزية (Flash Sales)
            ========================================== */}
        {activeTab === 'flashsales' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 text-yellow-600 rounded-xl">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg">الفعاليات المركزية (Flash Sales)</h3>
                  <p className="text-xs text-slate-500">قم بإنشاء فعاليات مؤقتة لاستقبال طلبات المتاجر والموافقة عليها</p>
                </div>
              </div>
              <button 
                onClick={() => setShowFlashSaleModal(true)}
                className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-200 hover:bg-slate-700 transition flex items-center gap-2"
              >
                <Zap size={18} />
                <span>إنشاء فعالية جديدة</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {flashSales.map(sale => (
                <div key={sale.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="text-xl font-black text-slate-800 mb-2">{sale.title}</h4>
                      <p className="text-sm text-slate-500 max-w-2xl">{sale.description}</p>
                    </div>
                    {sale.status === 'upcoming' && <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200">تبدأ قريباً</span>}
                    {sale.status === 'active' && <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>فعالية نشطة</span>}
                    {sale.status === 'ended' && <span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full border border-slate-200">منتهية</span>}
                  </div>
                  
                  <div className="flex gap-6 mb-6 text-sm font-bold text-slate-600 bg-slate-50 p-4 rounded-2xl">
                    <div>يبدأ: <span className="font-mono" dir="ltr">{new Date(sale.startTime).toLocaleString('ar-IQ')}</span></div>
                    <div>ينتهي: <span className="font-mono" dir="ltr">{new Date(sale.endTime).toLocaleString('ar-IQ')}</span></div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                    {(sale.status === 'upcoming' || sale.status === 'paused') && (
                      <button 
                        onClick={() => updateFlashSaleStatus(sale.id, 'active')}
                        className="py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition text-sm flex items-center justify-center gap-2"
                      >
                        <Zap size={16} /> تفعيل الفعالية
                      </button>
                    )}
                    {sale.status === 'active' && (
                      <button 
                        onClick={() => updateFlashSaleStatus(sale.id, 'paused')}
                        className="py-2.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition text-sm flex items-center justify-center gap-2"
                      >
                         إيقاف مؤقت
                      </button>
                    )}
                    {sale.status !== 'ended' && (
                      <button 
                        onClick={() => updateFlashSaleStatus(sale.id, 'ended')}
                        className="py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition text-sm flex items-center justify-center gap-2"
                      >
                        إنهاء الفعالية
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setEditFlashSaleDatesModal({
                          id: sale.id, 
                          name: sale.title, 
                          start: sale.startTime.slice(0,16), 
                          end: sale.endTime.slice(0,16)
                        });
                      }}
                      className="py-2.5 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition text-sm flex items-center justify-center gap-2"
                    >
                       تعديل المواعيد
                    </button>
                    <button 
                      onClick={() => {
                        setDeleteConfirmModal({type: 'flashSale', id: sale.id, name: sale.title});
                      }}
                      className="py-2.5 bg-rose-50 text-rose-700 font-bold rounded-xl hover:bg-rose-100 transition text-sm flex items-center justify-center gap-2"
                    >
                      <Trash2 size={16} /> حذف بالكامل
                    </button>
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-700 mb-4 border-b pb-2">طلبات المتاجر للمشاركة ({flashSaleRequests.filter(r => r.flashSaleId === sale.id).length})</h5>
                    <div className="space-y-3">
                      {flashSaleRequests.filter(r => r.flashSaleId === sale.id).map(req => {
                        const store = stores.find(s => s.id === req.storeId);
                        const product = products.find(p => p.id === req.productId);
                        if (!store || !product) return null;

                        return (
                          <div key={req.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border rounded-2xl shadow-sm hover:border-slate-300 transition">
                            <div className="flex items-center gap-4">
                              <img src={product.image || undefined} alt="" className="w-16 h-16 rounded-xl object-cover border" />
                              <div>
                                <h6 className="font-black text-slate-800 text-sm">{product.name}</h6>
                                <p className="text-[10px] text-indigo-600 font-bold mb-1">{store.shopName}</p>
                                <div className="flex gap-4 text-[11px] text-slate-500 font-medium bg-slate-50 px-2 py-1 rounded">
                                  <span>السعر الأصلي: <del>{product.price.toLocaleString()}</del></span>
                                  <span className="text-rose-600 font-black">سعر العرض: {req.promotionalPrice.toLocaleString()} د.ع</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4 md:mt-0 items-center">
                              {req.status === 'pending' && (
                                <>
                                  <button onClick={() => updateFlashSaleRequestStatus(req.id, 'approved')} className="px-5 py-2 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-200">موافقة</button>
                                  <button onClick={() => updateFlashSaleRequestStatus(req.id, 'rejected')} className="px-5 py-2 bg-rose-100 text-rose-700 font-bold text-xs rounded-xl hover:bg-rose-200">رفض</button>
                                </>
                              )}
                              {req.status === 'approved' && <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 font-bold text-xs rounded-lg border border-emerald-100 flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span> تمت الموافقة</span>}
                              {req.status === 'rejected' && <span className="px-3 py-1.5 bg-rose-50 text-rose-600 font-bold text-xs rounded-lg border border-rose-100 flex items-center gap-1"><span className="w-2 h-2 bg-rose-500 rounded-full"></span> مرفوض</span>}
                            </div>
                          </div>
                        );
                      })}
                      {flashSaleRequests.filter(r => r.flashSaleId === sale.id).length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-sm">لا توجد طلبات مشاركة متوفرة ضمن هذه الفعالية</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {flashSales.length === 0 && (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
                  <Zap size={48} className="mx-auto text-slate-200 mb-4" />
                  <h4 className="text-lg font-bold text-slate-500">لا توجد فعاليات مسجلة</h4>
                  <p className="text-sm text-slate-400 mt-2">قم بإنشاء فعالية جديدة لاستقبال عروض المتاجر</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            تاب الخريطة الحرارية
            ========================================== */}
        {activeTab === 'heatmap' && (
          <div className="space-y-6 animate-fade-in h-[calc(100vh-120px)] flex flex-col">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 text-lg flex items-center space-x-2 space-x-reverse">
                  <Map size={24} className="text-indigo-500" />
                  <span>الخريطة الحرارية للطلبات</span>
                </h3>
                <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-sm font-bold border border-amber-200">
                  إجمالي الطلبات: {orders.length}
                </div>
              </div>
              
              <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 relative">
                <MapContainer center={[33.3152, 44.3661]} zoom={6} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {heatmapPoints.length > 0 && <HeatmapLayer points={heatmapPoints} />}
                </MapContainer>
              </div>

              <div className="mt-4 flex gap-4 text-xs font-bold text-slate-600">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500"></span> طلبيات قليلة</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-lime-500"></span> متوسطة</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500"></span> كثيفة (نقاط ساخنة)</div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            تاب قاعدة البيانات
            ========================================== */}
        {activeTab === 'database' && <DatabasePanel />}

        {/* ==========================================
            تاب إعدادات النظام
            ========================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in max-w-3xl">
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-bold text-slate-800 text-md mb-4 pb-2 border-b border-slate-100 flex items-center space-x-2 space-x-reverse">
                <Settings size={20} className="text-indigo-500" />
                <span>إعدادات النظام العامة</span>
              </h3>

              <div className="space-y-4">
                
                {/* الموافقة التلقائية */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-right flex-1">
                    <h4 className="font-bold text-slate-700 text-sm">الموافقة التلقائية على المتاجر الجديدة</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      عند التفعيل، يتم قبول جميع المتاجر المسجلة تلقائياً بدون مراجعة يدوية من الأدمن.
                    </p>
                  </div>
                  
                  <button 
                    onClick={toggleAutoApprove}
                    className={`px-5 py-2.5 text-xs font-bold rounded-xl transition flex items-center space-x-2 space-x-reverse shadow-sm ${
                      adminSettings.autoApproveStores 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'bg-red-100 hover:bg-red-200 text-red-600 border border-red-200'
                    }`}
                  >
                    {adminSettings.autoApproveStores ? (
                      <>
                        <Check size={16} />
                        <span>مفعّلة</span>
                      </>
                    ) : (
                      <>
                        <X size={16} />
                        <span>معطّلة</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-xs font-semibold leading-relaxed border border-blue-100">
                  💡 <strong>تلميح:</strong> إذا عطّلت الموافقة التلقائية، ستظهر المتاجر الجديدة في قسم "بانتظار الموافقة" ويمكنك قبولها أو رفضها يدوياً.
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-bold text-slate-800 text-md mb-4 pb-2 border-b border-slate-100 flex items-center space-x-2 space-x-reverse">
                <Award size={20} className="text-yellow-500" />
                <span>إدارة المتاجر المميزة والقريبة</span>
              </h3>
              
              <div className="space-y-6">
                {/* إدارة المتاجر المميزة */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-black text-slate-700">المتاجر المميزة (يظهر 4 في الواحدة)</label>
                    <div className="relative w-48">
                      <Search size={14} className="absolute right-2 top-2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="بحث باسم المتجر..." 
                        value={storeSearch}
                        onChange={(e) => setStoreSearch(e.target.value)}
                        className="w-full pr-7 py-1.5 border rounded-lg text-[10px]"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100">
                    {stores
                      .filter(s => s.status === 'active' && (s.shopName.toLowerCase().includes(storeSearch.toLowerCase()) || s.username.toLowerCase().includes(storeSearch.toLowerCase())))
                      .map(store => (
                        <button 
                          key={`feat-${store.id}`}
                          onClick={() => {
                            const current = adminSettings.featuredStoreIds || [];
                            const updated = current.includes(store.id)
                              ? current.filter((id: string) => id !== store.id)
                              : [...current, store.id];
                            updateAdminSettings({ featuredStoreIds: updated });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition flex items-center gap-2 ${adminSettings.featuredStoreIds?.includes(store.id) ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'}`}
                        >
                          <img src={store.logo || undefined} className="w-4 h-4 rounded-full" />
                          <span>{store.shopName}</span>
                          <span className="text-[8px] text-slate-400 opacity-70">@{store.username}</span>
                          {adminSettings.featuredStoreIds?.includes(store.id) && <Check size={12} />}
                        </button>
                      ))}
                  </div>
                </div>

                {/* إدارة المتاجر القريبة */}
                <div>
                  <div className="flex items-center justify-between mb-3 pt-4 border-t border-slate-50">
                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-700">المتاجر القريبة</label>
                      <span className="text-[9px] text-slate-400 font-bold">تحكم بطريقة عرض المتاجر القريبة للزبون</span>
                    </div>
                    <button 
                      onClick={() => updateAdminSettings({ enableAutoNearby: !adminSettings.enableAutoNearby })}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border ${adminSettings.enableAutoNearby ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-200 text-slate-500'}`}
                    >
                      <Zap size={14} fill={adminSettings.enableAutoNearby ? "currentColor" : "none"} />
                      <span className="text-[10px] font-black">{adminSettings.enableAutoNearby ? 'فرز تلقائي (حسب المسافة)' : 'تحكم يدوي (بالقائمة)'}</span>
                    </button>
                  </div>

                  {!adminSettings.enableAutoNearby ? (
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100">
                     {stores
                        .filter(s => s.status === 'active' && (s.shopName.toLowerCase().includes(storeSearch.toLowerCase()) || s.username.toLowerCase().includes(storeSearch.toLowerCase())))
                        .map(store => (
                          <button 
                            key={`near-${store.id}`}
                            onClick={() => {
                              const current = adminSettings.nearbyStoreIds || [];
                              const updated = current.includes(store.id)
                                ? current.filter((id: string) => id !== store.id)
                                : [...current, store.id];
                              updateAdminSettings({ nearbyStoreIds: updated });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition flex items-center gap-2 ${adminSettings.nearbyStoreIds?.includes(store.id) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'}`}
                          >
                            <img src={store.logo || undefined} className="w-4 h-4 rounded-full" />
                            <span>{store.shopName}</span>
                            <span className="text-[8px] text-slate-400 opacity-70">@{store.username}</span>
                            {adminSettings.nearbyStoreIds?.includes(store.id) && <Check size={12} />}
                          </button>
                        ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 text-center">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-indigo-100 flex items-center justify-center mx-auto mb-2 text-indigo-600">
                        <MapPin size={20} />
                      </div>
                      <p className="text-[10px] font-black text-indigo-900 mb-1">الفرز التلقائي مفعل ✅</p>
                      <p className="text-[9px] text-indigo-600/70 font-bold">سيقوم التطبيق بترتيب المتاجر تلقائياً للزبون بناءً على موقعه الجغرافي الفعلي.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-bold text-slate-800 text-md mb-4 pb-2 border-b border-slate-100 flex items-center space-x-2 space-x-reverse">
                <Palette size={20} className="text-indigo-500" />
                <span>إدارة الإعلانات (Ads Slider)</span>
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">سرعة التقليب التلقائي</span>
                    <span className="text-[10px] text-slate-400">كم عدد الثواني قبل الانتقال للإعلان التالي</span>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <input 
                      type="number" 
                      value={adminSettings.adInterval || 5} 
                      onChange={(e) => updateAdminSettings({ adInterval: parseInt(e.target.value) || 3 })}
                      className="w-16 border p-2 rounded-lg text-center font-bold"
                      min="1"
                    />
                    <span className="text-xs text-slate-500">ثانية</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {adminSettings.ads?.map((ad: any, index: number) => (
                    <div key={ad.id} className="p-4 border border-slate-100 rounded-2xl bg-white space-y-3 relative shadow-sm hover:shadow-md transition">
                      <button 
                        onClick={() => {
                          const updated = adminSettings.ads.filter((_: any, i: number) => i !== index);
                          updateAdminSettings({ ads: updated });
                        }}
                        className="absolute top-2 left-2 p-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition z-10"
                      >
                        <Trash2 size={14} />
                      </button>
                      
                      <ImageUploader 
                        value={ad.url} 
                        onChange={(url) => {
                          const updated = [...adminSettings.ads];
                          updated[index].url = url;
                          updateAdminSettings({ ads: updated });
                        }}
                        label="صورة الإعلان"
                        aspectRatio="landscape"
                        showUrlOption={true}
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-gray-400 mb-1">عنوان الإعلان</label>
                          <input 
                            type="text" 
                            placeholder="خصومات ضخمة"
                            value={ad.title || ''} 
                            onChange={(e) => {
                              const updated = [...adminSettings.ads];
                              updated[index].title = e.target.value;
                              updateAdminSettings({ ads: updated });
                            }}
                            className="w-full border p-2 rounded-lg text-[10px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-400 mb-1">وصف قصير</label>
                          <input 
                            type="text" 
                            placeholder="تسوّق الآن"
                            value={ad.desc || ''} 
                            onChange={(e) => {
                              const updated = [...adminSettings.ads];
                              updated[index].desc = e.target.value;
                              updateAdminSettings({ ads: updated });
                            }}
                            className="w-full border p-2 rounded-lg text-[10px]"
                          />
                        </div>
                      </div>

                      {/* وجهة النقر */}
                      <div className="pt-2 border-t border-slate-50">
                        <label className="block text-[9px] font-bold text-gray-400 mb-2">وجهة الإعلان (عند النقر)</label>
                        <div className="flex gap-2 mb-2">
                          {['none', 'store', 'product'].map(type => (
                            <button 
                              key={type}
                              onClick={() => {
                                const updated = [...adminSettings.ads];
                                updated[index].targetType = type;
                                updated[index].targetId = '';
                                updateAdminSettings({ ads: updated });
                              }}
                              className={`flex-1 py-1 rounded-lg text-[9px] font-bold border transition ${ad.targetType === type ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                              {type === 'none' ? 'بدون' : type === 'store' ? 'متجر' : 'منتج'}
                            </button>
                          ))}
                        </div>

                        {ad.targetType !== 'none' && (
                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder={ad.targetType === 'store' ? "ابحث عن متجر..." : "ابحث عن متجر لاختيار منتج..."}
                              className="w-full border p-2 rounded-lg text-[10px] pr-8"
                              onFocus={() => setSelectedAdForTarget(index)}
                              onChange={(e) => setAdTargetSearch(e.target.value)}
                            />
                            <Search size={14} className="absolute right-2 top-2 text-slate-400" />
                            
                            {selectedAdForTarget === index && adTargetSearch && (
                              <div className="absolute z-20 w-full mt-1 bg-white border border-indigo-100 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                                {ad.targetType === 'store' ? (
                                  stores.filter(s => s.shopName.toLowerCase().includes(adTargetSearch.toLowerCase())).map(s => (
                                    <button 
                                      key={s.id}
                                      onClick={() => {
                                        const updated = [...adminSettings.ads];
                                        updated[index].targetId = s.id;
                                        updated[index].targetTitle = s.shopName;
                                        updateAdminSettings({ ads: updated });
                                        setAdTargetSearch('');
                                        setSelectedAdForTarget(null);
                                      }}
                                      className="w-full p-2 text-right text-[10px] hover:bg-indigo-50 flex items-center space-x-2 space-x-reverse"
                                    >
                                      <img src={s.logo || undefined} className="w-5 h-5 rounded-full" />
                                      <span>{s.shopName}</span>
                                    </button>
                                  ))
                                ) : (
                                  // استهداف منتج - نبحث عن المتجر أولا
                                  stores.filter(s => s.shopName.toLowerCase().includes(adTargetSearch.toLowerCase())).map(s => (
                                    <div key={s.id} className="p-2 border-b last:border-0">
                                      <div className="text-[9px] font-black text-indigo-600 mb-1">{s.shopName}</div>
                                      <div className="space-y-1">
                                        {products.filter(p => p.storeId === s.id).map(p => (
                                          <button 
                                            key={p.id}
                                            onClick={() => {
                                              const updated = [...adminSettings.ads];
                                              updated[index].targetId = p.id;
                                              updated[index].storeId = s.id; // نحتاج معرفة المتجر لفتحه لاحقا
                                              updated[index].targetTitle = p.name;
                                              updateAdminSettings({ ads: updated });
                                              setAdTargetSearch('');
                                              setSelectedAdForTarget(null);
                                            }}
                                            className="w-full p-1 text-right text-[9px] hover:bg-slate-100 rounded"
                                          >
                                            {p.name}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {ad.targetId && (
                           <div className="mt-2 p-1.5 bg-green-50 text-green-700 text-[10px] font-bold rounded-lg flex items-center justify-between">
                              <span>الوجهة: {ad.targetTitle}</span>
                              <Check size={12} />
                           </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const newAd = { 
                        id: 'ad' + Date.now(), 
                        type: 'image', 
                        url: '', 
                        title: 'عنوان جديد', 
                        desc: 'أضف وصفاً هنا', 
                        targetType: 'none', 
                        targetId: '', 
                        targetTitle: '', 
                        link: '' 
                      };
                      updateAdminSettings({ ads: [...(adminSettings.ads || []), newAd] });
                    }}
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition min-h-[250px]"
                  >
                    <Plus size={24} />
                    <span className="text-xs font-bold mt-2">إضافة إعلان جديد</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-bold text-slate-800 text-md mb-4 pb-2 border-b border-slate-100 flex items-center space-x-2 space-x-reverse">
                <RefreshCw size={20} className="text-orange-500" />
                <span>إدارة النسخ الاحتياطي (System Backup)</span>
              </h3>
              
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl mb-4">
                <p className="text-xs text-orange-700 font-bold leading-relaxed">
                  ⚠️ تنبيه: النسخ الاحتياطي هو ميزة أمان تتيح لك حفظ نسخة من قاعدة بيانات المتجر بالكامل (المتاجر، المنتجات، الزبائن، والطلبات) في ملف JSON خارجي لاستعادته لاحقاً في حالة الطوارئ.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={handleExportSystem}
                  className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl hover:border-indigo-500 hover:shadow-md transition group"
                >
                  <RefreshCw size={28} className="text-indigo-600 group-hover:rotate-180 transition-transform duration-500" />
                  <span className="text-sm font-black text-slate-800 mt-2">تصدير قاعدة البيانات</span>
                  <span className="text-[10px] text-slate-400 mt-1">حفظ كل شيء في ملف واحد</span>
                </button>

                <button 
                  onClick={() => systemBackupRef.current?.click()}
                  className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:shadow-md transition group"
                >
                  <Globe size={28} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-black text-slate-800 mt-2">استيراد قاعدة البيانات</span>
                  <span className="text-[10px] text-slate-400 mt-1">رفع ملف backup.json</span>
                </button>

                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-2xl opacity-60">
                   <Shield size={28} className="text-slate-400" />
                   <span className="text-sm font-black text-slate-500 mt-2">نظام الأمان</span>
                   <span className="text-[10px] text-slate-400 mt-1">محمي بـ LocalStorage ✅</span>
                </div>

                <input 
                  type="file" 
                  ref={systemBackupRef} 
                  onChange={handleImportSystem} 
                  accept=".json" 
                  className="hidden" 
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-bold text-slate-800 text-md mb-4 pb-2 border-b border-slate-100">📊 معلومات النظام</h3>
              
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex justify-between border-b border-dashed border-slate-100 pb-2">
                  <span>إصدار النظام:</span>
                  <span className="font-mono font-bold text-indigo-600">v2.0.0</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-100 pb-2">
                  <span>تاريخ الإطلاق:</span>
                  <span className="font-bold">يناير 2026</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-100 pb-2">
                  <span>المنطقة المدعومة:</span>
                  <span className="font-bold">العراق - {provinces.length} محافظة</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-100 pb-2">
                  <span>تقنيات البناء:</span>
                  <span className="font-bold">React + TypeScript + Tailwind CSS</span>
                </div>
                <div className="flex justify-between">
                  <span>نموذج الربح:</span>
                  <span className="font-bold text-green-600">اشتراكات ثابتة (بدون عمولات)</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-l from-slate-800 to-slate-900 rounded-2xl shadow-lg p-6 text-white">
              <h3 className="font-bold text-md mb-3 flex items-center space-x-2 space-x-reverse">
                <Crown size={20} className="text-yellow-400" />
                <span>منصة محلك - إدارة شاملة</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                نظام متكامل لربط المتاجر المحلية بالزبائن في جميع أنحاء العراق. يدعم نظام النقاط والمكافآت، الاشتراكات المرنة، وأكواد الخصم العامة والخاصة.
              </p>
            </div>
          </div>
        )}

      </main>

      {/* مودال إدارة الأوسمة */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-scale-in">
            <div className="flex flex-col items-center text-center space-y-4 mb-6">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center shadow-inner">
                <Trash2 size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 mb-2">تأكيد الحذف النهائي</h3>
                <p className="text-sm text-slate-500 font-bold bg-slate-50 p-3 rounded-xl border border-slate-100">
                  هل أنت متأكد من حذف {deleteConfirmModal.type === 'flashSale' ? 'الفعالية' : 'الحساب'} <br />
                  <span className="text-slate-800 text-base">{deleteConfirmModal.name}</span> <br />
                  نهائياً من النظام؟
                </p>
                {deleteConfirmModal.type === 'store' && (
                  <p className="text-xs text-red-500 font-bold mt-3 max-w-[280px] mx-auto bg-red-50 p-2 rounded-lg">
                    سيتم مسح جميع منتجات التاجر والطلبات وأكواد الخصم التابعة له نهائياً ولا يمكن التراجع.
                  </p>
                )}
                {deleteConfirmModal.type === 'customer' && (
                  <p className="text-xs text-red-500 font-bold mt-3 max-w-[280px] mx-auto bg-red-50 p-2 rounded-lg">
                    سيتم مسح جميع طلبات وتقييمات الزبون التابعة له نهائياً ولا يمكن التراجع.
                  </p>
                )}
                {deleteConfirmModal.type === 'flashSale' && (
                  <p className="text-xs text-red-500 font-bold mt-3 max-w-[280px] mx-auto bg-red-50 p-2 rounded-lg">
                    سيتم مسح الفعالية وجميع طلبات المشاركة الخاصة بها نهائياً ولن تظهر في التطبيقات.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (deleteConfirmModal.type === 'store') {
                    deleteStore(deleteConfirmModal.id);
                  } else if (deleteConfirmModal.type === 'customer') {
                    deleteCustomer(deleteConfirmModal.id);
                  } else if (deleteConfirmModal.type === 'flashSale') {
                    deleteFlashSale(deleteConfirmModal.id);
                  }
                  setDeleteConfirmModal(null);
                }}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition"
              >
                تأكيد الحذف
              </button>
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition border border-slate-200"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {editFlashSaleDatesModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-in">
            <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2">
                <Clock size={18} className="text-indigo-400" />
                تعديل مواعيد الفعالية
              </h3>
              <button onClick={() => setEditFlashSaleDatesModal(null)} className="bg-white/10 p-1.5 rounded-lg hover:bg-white/20 transition">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-slate-500 text-sm font-bold text-center mb-4 truncate text-indigo-600 bg-indigo-50 p-2 rounded-lg">{editFlashSaleDatesModal.name}</p>
              
              <div className="space-y-4 text-right">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">وقت البدء الجديد</label>
                  <input 
                    type="datetime-local" 
                    className="w-full p-3 bg-slate-50 rounded-xl border focus:border-indigo-500 outline-none transition font-mono text-sm text-left"
                    value={editFlashSaleDatesModal.start}
                    onChange={(e) => setEditFlashSaleDatesModal(prev => prev ? { ...prev, start: e.target.value } : null)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">وقت الانتهاء الجديد</label>
                  <input 
                    type="datetime-local" 
                    className="w-full p-3 bg-slate-50 rounded-xl border focus:border-indigo-500 outline-none transition font-mono text-sm text-left"
                    value={editFlashSaleDatesModal.end}
                    onChange={(e) => setEditFlashSaleDatesModal(prev => prev ? { ...prev, end: e.target.value } : null)}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    const start = editFlashSaleDatesModal.start;
                    const end = editFlashSaleDatesModal.end;
                    if(start && end) {
                      updateFlashSaleDates(editFlashSaleDatesModal.id, new Date(start).toISOString(), new Date(end).toISOString());
                      setEditFlashSaleDatesModal(null);
                    }
                  }}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition"
                >
                  حفظ التعديلات
                </button>
                <button
                  onClick={() => setEditFlashSaleDatesModal(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl transition hover:bg-slate-200"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {badgeModal.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-in">
            <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2">
                <Award size={18} className="text-yellow-400" />
                إدارة أوسمة المتجر
              </h3>
              <button onClick={() => setBadgeModal({ show: false, storeId: '', selectedBadges: [] })} className="bg-white/10 p-1.5 rounded-lg hover:bg-white/20 transition">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-slate-500 text-sm font-bold text-center mb-4">اختر الأوسمة التي تريد منحها لهذا المتجر لتظهر للزبائن.</p>
              
              <div className="space-y-3">
                {STORE_BADGES.map(badge => {
                  const isSelected = badgeModal.selectedBadges.includes(badge.id);
                  return (
                    <label 
                      key={badge.id}
                      className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition border ${
                        isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        className="w-5 h-5 rounded text-indigo-600 focus:ring-0"
                        checked={isSelected}
                        onChange={(e) => {
                          const newBadges = e.target.checked 
                            ? [...badgeModal.selectedBadges, badge.id]
                            : badgeModal.selectedBadges.filter(id => id !== badge.id);
                          setBadgeModal(prev => ({ ...prev, selectedBadges: newBadges }));
                        }}
                      />
                      <span className={`px-3 py-1 font-bold text-xs rounded-lg border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="pt-6">
                <button 
                  onClick={() => {
                    updateStoreBadges(badgeModal.storeId, badgeModal.selectedBadges);
                    setBadgeModal({ show: false, storeId: '', selectedBadges: [] });
                  }}
                  className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition"
                >
                  حفظ الأوسمة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* مودال إضافة فعالية جديدة */}
      {showFlashSaleModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in">
            <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2">
                <Zap size={18} className="text-yellow-400" />
                إنشاء فعالية جديدة
              </h3>
              <button onClick={() => setShowFlashSaleModal(false)} className="bg-white/10 p-1.5 rounded-lg hover:bg-white/20 transition">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleCreateFlashSale} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">عنوان الفعالية (مثال: خصومات الجمعة السوداء)</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  value={newFlashSaleForm.title}
                  onChange={e => setNewFlashSaleForm(prev => ({...prev, title: e.target.value}))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  placeholder="حدث تخفيضات الشتاء..."
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">وصف الفعالية (اختياري)</label>
                <textarea 
                  value={newFlashSaleForm.description}
                  onChange={e => setNewFlashSaleForm(prev => ({...prev, description: e.target.value}))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-none"
                  placeholder="الوصف يظهر للمتاجر كدعوة للمشاركة..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">تاريخ وسائعة البدء</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={newFlashSaleForm.startDate}
                    onChange={e => setNewFlashSaleForm(prev => ({...prev, startDate: e.target.value}))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">تاريخ وسائعة الانتهاء</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={newFlashSaleForm.endDate}
                    onChange={e => setNewFlashSaleForm(prev => ({...prev, endDate: e.target.value}))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-2 space-x-reverse">
                <button type="button" onClick={() => setShowFlashSaleModal(false)} className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition text-sm">
                  إلغاء
                </button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition flex items-center space-x-2 space-x-reverse text-sm">
                  <CheckCircle size={16} />
                  <span>إنشاء الفعالية</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
