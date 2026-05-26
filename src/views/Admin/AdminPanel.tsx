import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/useApp';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Store, Customer, Order, Reel } from '../../types';
import { STORE_CATEGORIES, STORE_BADGES } from '../../constants';
import { 
  Settings, Users, Store as StoreIcon, DollarSign, Shield, Bell, 
  Check, X, Ban, RefreshCw, Search, Edit, AlertTriangle, LogOut, 
  TrendingUp, Calendar, Package, Ticket, Eye, EyeOff, Trash2,
  Plus, Copy, Globe, Star, ShoppingBag, CreditCard, Archive, Car,
  BarChart3, Activity, Zap, Award, Crown, Palette, Menu, CheckCircle, MessageCircle, Send, Loader2, MapPin, Clock, Truck, Camera, Megaphone, Film, PlayCircle, Trash, Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReactToPrint } from 'react-to-print';
import { QRCodeSVG } from 'qrcode.react';
import { ImageUploader } from '../../components/ImageUploader';
import { sendWhatsAppMessage } from '../../services/otpService';
import { BackupService } from '../../services/backupService';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

import HeatmapLayer from '../../components/HeatmapLayer';
import { Map } from 'lucide-react';
import { showLocalNotification } from '../../lib/pushNotifications';
import { formatSafeDate, formatSafeTimeString, formatSafeDateTimeString } from '../../utils/date';
import { CopyButton } from '../../components/CopyButton';
import { VerifiedBadge } from '../../components/VerifiedBadge';

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
        <label className="block text-xs font-bold text-gray-500 mb-1">الجمهور المستهدف</label>
        <select 
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full border border-gray-200 p-3 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#9952FF] focus:outline-none"
        >
          <option value="all">جميع الزبائن ({customers.length})</option>
          {provinces.map(p => {
            const count = customers.filter(c => c.province === p.name).length;
            return <option key={p.id} value={p.name}>{p.name} ({count} زبون)</option>;
          })}
        </select>
      </div>

      <div className="bg-[#f5eeff] p-3 rounded-xl border border-[#e9daff]">
        <p className="text-xs text-[#4D2980] font-bold">
          📊 عدد الزبائن اللي راح يستلمون الإشعار: <span className="text-lg">{targetCount}</span> زبون
        </p>
        <p className="text-[10px] text-[#9952FF] mt-1">
          الإشعار يرسل باسم "محلك" ويظهر للزبائن في قائمة إشعاراتهم
        </p>
      </div>

      <button 
        type="submit"
        disabled={!title.trim() || !message.trim()}
        className="w-full py-3 bg-gradient-to-l from-[#9952FF] to-[#4D2980] hover:from-[#4D2980] hover:to-[#4D2980] text-white font-bold rounded-xl shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 space-x-reverse"
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
        stores, products, customers, orders, promoCodes, rechargeCodes, notifications, flashSales, adminSettings,
        generateVirtualData, deleteAllVirtualData, deleteStore
    } = useApp();

    const [numStores, setNumStores] = useState(5);
    const [numProducts, setNumProducts] = useState(3);
    const [generating, setGenerating] = useState(false);
    const [deletingAll, setDeletingAll] = useState(false);
    const [deletingStoreId, setDeletingStoreId] = useState<string | null>(null);

    const [alertState, setAlertState] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);
    const [customConfirm, setCustomConfirm] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);

    const virtualStores = stores.filter(s => s.is_virtual || s.id.startsWith('virtual-') || (s as any).isVirtual);
    const virtualProductsCount = products.filter(p => p.is_virtual || p.id.startsWith('virtual-') || (p as any).isVirtual || p.storeId.startsWith('virtual-')).length;

    const handleGenerate = async () => {
        if (numStores < 1 || numProducts < 1) {
            setAlertState({ message: '⚠️ الرجاء إدخال أعداد صحيحة أكبر من الصفر', type: 'warning' });
            return;
        }
        setGenerating(true);
        try {
            if (generateVirtualData) {
                const res = await generateVirtualData(numStores, numProducts);
                setAlertState({ message: res.message, type: 'success' });
            }
        } catch (e: any) {
            setAlertState({ message: '❌ فشل التوليد: ' + (e.message || e), type: 'error' });
        } finally {
            setGenerating(false);
        }
    };

    const handleDeleteAll = async () => {
        setCustomConfirm({
            title: 'تأكيد الحذف الشامل والنهائي',
            message: '🚨 تحذير هام جداً!\nهل أنت متأكد من رغبتك في حذف جميع المتاجر والمنتجات الافتراضية نهائياً من قاعدة البيانات مع كافة الطلبات والعروض والرموز والإشعارات المرتبطة بها؟',
            onConfirm: async () => {
                setDeletingAll(true);
                try {
                    if (deleteAllVirtualData) {
                        const res = await deleteAllVirtualData();
                        setAlertState({ message: res.message, type: 'success' });
                    }
                } catch (e: any) {
                    setAlertState({ message: '❌ فشل الحذف: ' + (e.message || e), type: 'error' });
                } finally {
                    setDeletingAll(false);
                }
            }
        });
    };

    const handleDeleteStore = async (sid: string, sname: string) => {
        setCustomConfirm({
            title: 'حذف متجر محدد',
            message: `هل أنت متأكد من حذف المتجر الافتراضي "${sname}" نهائياً مع كافة منتجاته وبياناته؟`,
            onConfirm: async () => {
                setDeletingStoreId(sid);
                try {
                    await deleteStore(sid);
                    setAlertState({ message: `🎉 تم حذف المتجر الافتراضي "${sname}" بنجاح.`, type: 'success' });
                } catch (e: any) {
                    setAlertState({ message: '❌ فشل الحذف: ' + (e.message || e), type: 'error' });
                } finally {
                    setDeletingStoreId(null);
                }
            }
        });
    };

    const collections = [
        { name: 'المتاجر (Stores)', count: stores.length, virtualCount: virtualStores.length, icon: <StoreIcon size={20} className="text-blue-500" /> },
        { name: 'المنتجات (Products)', count: products.length, virtualCount: virtualProductsCount, icon: <Package size={20} className="text-[#9952FF]" /> },
        { name: 'الزبائن (Customers)', count: customers.length, virtualCount: customers.filter(c => c.is_virtual).length, icon: <Users size={20} className="text-purple-500" /> },
        { name: 'الطلبات (Orders)', count: orders.length, virtualCount: 0, icon: <ShoppingBag size={20} className="text-orange-500" /> },
    ];

    return (
        <div className="space-y-6 animate-fade-in text-right" dir="rtl">
            {/* بطاقات الإحصائيات مع تمييز الافتراضي */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {collections.map((col, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-50 rounded-lg">
                                {col.icon}
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-500">{col.name}</h4>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-xl font-black text-slate-800">{col.count}</span>
                                    {col.virtualCount > 0 && (
                                        <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">
                                            {col.virtualCount} افتراضي
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* لوحة تحكم نظام البيانات الافتراضية */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                    <div className="flex items-center gap-2">
                        <Zap size={24} className="text-amber-500 shrink-0" />
                        <div>
                            <h3 className="text-md font-black text-slate-800">نظام البيانات الافتراضية الـ Dummy/Virtual Data</h3>
                            <p className="text-[10px] text-slate-400">تحكم بملء وملء قاعدة بيانات متجرك بمحتوى واقعي وتجريبي بضغطة زر واحدة</p>
                        </div>
                    </div>
                    {virtualStores.length > 0 && (
                        <button
                            onClick={handleDeleteAll}
                            disabled={deletingAll || generating}
                            className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 shrink-0 self-end sm:self-auto"
                        >
                            {deletingAll ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>جاري الإزالة...</span>
                                </>
                            ) : (
                                <>
                                    <Trash2 size={14} />
                                    <span>مسح كافة البيانات الافتراضية ( {virtualStores.length} متاجر )</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 block text-right">عدد المتاجر الافتراضية المراد توليدها (عدد غير محدود):</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="1"
                                max="100"
                                value={numStores <= 100 ? numStores : 100}
                                onChange={(e) => setNumStores(parseInt(e.target.value))}
                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#9952FF]"
                            />
                            <input
                                type="number"
                                min="1"
                                max="1000"
                                value={numStores}
                                onChange={(e) => setNumStores(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-16 bg-white border border-slate-200 px-2 py-1 rounded-xl font-bold font-mono text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#9952FF]"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 text-right">توليد أي عدد (١، ١٠، ٥٠، ١٠٠+) من المتاجر دفعة واحدة</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 block text-right">عدد المنتجات لكل متجر (عدد غير محدود):</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="1"
                                max="100"
                                value={numProducts <= 100 ? numProducts : 100}
                                onChange={(e) => setNumProducts(parseInt(e.target.value))}
                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#9952FF]"
                            />
                            <input
                                type="number"
                                min="1"
                                max="1000"
                                value={numProducts}
                                onChange={(e) => setNumProducts(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-16 bg-white border border-slate-200 px-2 py-1 rounded-xl font-bold font-mono text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#9952FF]"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 text-right">توليد أي عدد (١، ١٠، ٥٠، ١٠٠+) من المنتجات الفنية لكل متجر</p>
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={handleGenerate}
                            disabled={generating || deletingAll}
                            className="w-full bg-[#9952FF] hover:bg-[#803FE6] text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition disabled:opacity-50"
                        >
                            {generating ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>جاري توليد البيانات الافتراضية...</span>
                                </>
                            ) : (
                                <>
                                    <Plus size={16} />
                                    <span>توليد البيانات الافتراضية المقترحة</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* قائمة المتاجر الافتراضية الناشطة حالياً */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 justify-start">
                        <span>مستندات المتاجر الافتراضية النشطة حالياً في Firestore</span>
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[9px] font-bold">
                            {virtualStores.length} متجر افتراضي نشط
                        </span>
                    </h4>

                    {virtualStores.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400 font-bold">
                            لا يوجد حالياً أي متاجر افتراضية مُولّدة في قاعدة بياناتك. قم باستخدام النموذج أعلاه لملء التطبيق فورياً!
                        </div>
                    ) : (
                        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                            <div className="max-h-72 overflow-y-auto">
                                <table className="w-full text-right text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                                        <tr>
                                            <th className="px-4 py-3 text-right">المتجر</th>
                                            <th className="px-4 py-3 text-right">المالك</th>
                                            <th className="px-4 py-3 text-right">المجال / الفئة</th>
                                            <th className="px-4 py-3 text-right">المدينة والمنطقة</th>
                                            <th className="px-4 py-3 text-center">إجراء</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {virtualStores.map((vs) => {
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
                                            return (
                                                <tr key={vs.id} className="hover:bg-slate-50/50 transition">
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center gap-2 right-0 justify-start">
                                                            <img src={vs.logo} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                                                            <div className="text-right">
                                                                <span className="font-bold text-slate-800 block">{vs.shopName}</span>
                                                                <span className="text-[9px] text-[#9952FF] font-mono block">{vs.id}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold">{vs.ownerName}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                                            {categoryLabels[vs.category || ''] || vs.category}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">{vs.province} - {vs.area}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => handleDeleteStore(vs.id, vs.shopName)}
                                                            disabled={deletingStoreId === vs.id}
                                                            className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-xl transition disabled:opacity-50 inline-flex items-center justify-center"
                                                            title="حذف هذا المتجر الافتراضي بجميع منتجاته"
                                                        >
                                                            {deletingStoreId === vs.id ? (
                                                                <Loader2 size={14} className="animate-spin text-red-500" />
                                                            ) : (
                                                                <Trash2 size={14} />
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* معاينة تراكيب البيانات */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2 justify-start">
                    <Archive size={24} className="text-[#9952FF]" />
                    معاينة البيانات في الوقت الفعلي
                </h3>
                <div className="bg-[#4D2980] rounded-2xl p-6 font-mono text-[11px] text-emerald-400 overflow-x-auto text-left" dir="ltr">
                    <div className="flex flex-col gap-2">
                        <div><span className="text-slate-500">// Firestore Database Structure Preview</span></div>
                        <div><span className="text-blue-400">adminSettings:</span> {JSON.stringify(adminSettings, null, 2)}</div>
                        <div className="mt-4"><span className="text-slate-500">// Connected to:</span> settings/global</div>
                        <div><span className="text-slate-500">// Status:</span> <span className="text-green-500">LIVE SYNCED ✅</span></div>
                    </div>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl text-amber-800">
                <h4 className="font-bold mb-2 flex items-center gap-2 justify-start">
                    <AlertTriangle size={18} className="shrink-0" />
                    نصائح إدارة قاعدة البيانات والنظام الافتراضي
                </h4>
                <p className="text-xs leading-relaxed opacity-80 text-right">
                    يتم تخزين جميع الحسابات ذات الوسم الافتراضي <code className="font-mono font-bold bg-amber-100 px-1 rounded">is_virtual: true</code> في Firestore للتطوير والاختبار. بمجرد النقر على مسح كافة البيانات الافتراضية، يُزال كل الكيان بمنتوجاته فورياً دون حدوث أي تضارب مع بيانات عملائك أو متاجرك الحقيقية وتصميماتهم.
                </p>
            </div>

            {/* Custom Alert Modal */}
            {alertState && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-fade-in" dir="rtl">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-scale-in border border-slate-100 flex flex-col items-center text-center space-y-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-inner ${
                            alertState.type === 'success' ? 'bg-green-50 text-green-600' :
                            alertState.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                            {alertState.type === 'success' ? <CheckCircle size={32} /> : 
                             alertState.type === 'error' ? <AlertTriangle size={32} /> : <AlertTriangle size={32} />}
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 mb-1">تنبيه النظام</h3>
                            <p className="text-xs font-bold text-slate-500 whitespace-pre-line leading-relaxed">{alertState.message}</p>
                        </div>
                        <button
                            onClick={() => setAlertState(null)}
                            className="w-full py-2.5 bg-[#9952FF] hover:bg-[#823ce6] text-white font-bold rounded-xl transition shadow-md hover:shadow-lg text-xs"
                        >
                            موافق
                        </button>
                    </div>
                </div>
            )}

            {/* Custom Confirm Modal */}
            {customConfirm && (
                <div className="fixed inset-0 bg-[#4D2980]/50 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-fade-in" dir="rtl">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-scale-in">
                        <div className="flex flex-col items-center text-center space-y-4 mb-6">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center shadow-inner animate-pulse">
                                <Trash2 size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 mb-2">{customConfirm.title}</h3>
                                <p className="text-xs text-slate-500 font-bold bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-line">
                                    {customConfirm.message}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    customConfirm.onConfirm();
                                    setCustomConfirm(null);
                                }}
                                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs transition shadow-md"
                            >
                                تأكيد الحذف
                            </button>
                            <button
                                onClick={() => setCustomConfirm(null)}
                                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-200"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
        
        try {
          const success = await sendWhatsAppMessage(customer.phone, message);
          if (success) {
            setSentCount(c => c + 1);
            addLog(`✅ نجاح الإرسال للزبون: ${customer.name}`);
          } else {
            addLog(`❌ فشل الإرسال للزبون: ${customer.name}`);
          }
        } catch (msgErr: any) {
          addLog(`❌ فشل الإرسال للزبون: ${customer.name} - ${msgErr.message}`);
        }
        
        // Delay of 5.5 seconds between messages due to Account Protection limit on Wasender API
        await new Promise(r => setTimeout(r, 5500));
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
              <LogOut size={16} className="text-[#9952FF]"/>
              شريحة الاستهداف
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">الفلتر الذكي للزبائن</label>
                <select 
                  disabled={sending}
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#9952FF] outline-none transition"
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
                    className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#9952FF] outline-none transition"
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
                    className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#9952FF] outline-none transition text-center"
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
                    className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#9952FF] outline-none transition text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">صلاحية (أيام)</label>
                  <input 
                    disabled={sending}
                    type="number"
                    value={promoExpiryDays}
                    onChange={(e) => setPromoExpiryDays(Number(e.target.value))}
                    className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#9952FF] outline-none transition text-center"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-4 text-sm font-bold bg-[#f5eeff] text-[#4D2980] p-3 rounded-xl">
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
          <div className="fixed inset-0 bg-[#4D2980]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                  className="flex-1 py-3 text-white font-bold bg-[#9952FF] hover:bg-[#4D2980] rounded-xl shadow-lg shadow-[#e9daff] transition"
                >
                  نعم، ابدأ الحملة
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="lg:col-span-2">
          <div className="bg-[#4D2980] rounded-3xl p-6 shadow-xl border border-[#9952FF] h-full min-h-[400px] flex flex-col">
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
    adminSettings, updateSubscriptionPrice,
    updateStoreStatus, updateStoreBadges, adminUpdateStore, toggleCustomerBlock, deleteCustomer, toggleStoreBan, deleteStore, createPromoCode, togglePromoCodeStatus, deletePromoCode,
    currentAdmin, setCurrentAdmin, provinces, notifications, storeReviews,
    updateStoreReview, deleteStoreReview,
    markAllNotificationsAsRead,
    deleteProduct, updateProduct, updateAdminSettings,
    flashSales, flashSaleRequests, createFlashSale, updateFlashSaleStatus, updateFlashSaleRequestStatus, updateFlashSaleDates, deleteFlashSale,
    rechargeCodes, generateRechargeCodes, deleteRechargeCode, seedDatabase,
    generateVirtualData, deleteAllVirtualData,
    getCustomerSeqId,
  } = useApp();

  // ==========================================
  // الحالات (States)
  // ==========================================
  
  // التاب النشط
  const [activeTab, setActiveTab] = useState<
    'overview' | 'stores' | 'customers' | 'orders' | 'products' | 'recharge' | 'promos' | 'subscriptions' | 'broadcast' | 'heatmap' | 'settings' | 'flashsales' | 'whatsapp' | 'database' | 'reviews' | 'reels'
  >('overview');
  
  const [adminReels, setAdminReels] = useState<Reel[]>([]);
  const [reelToDelete, setReelToDelete] = useState<string | null>(null);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'reels'), (snap) => {
      setAdminReels(snap.docs.map(doc => ({ ...doc.data() as Reel, id: doc.id })));
    }, (error) => {
      console.warn("Could not fetch reels for admin:", error);
    });
    return () => unsub();
  }, []);
  
  // فلاتر البحث والتصفية
  const [storeFilter, setStoreFilter] = useState<'all' | 'active' | 'suspended' | 'verified' | 'subscribed' | 'expired_sub'>('all');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [promoFilter, setPromoFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [storeCategoryFilter, setStoreCategoryFilter] = useState('all');

  // إدارة تعديل وحذف التقييمات
  const [editingReview, setEditingReview] = useState<any | null>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editMessage, setEditMessage] = useState<string>('');
  const [isSavingReview, setIsSavingReview] = useState<boolean>(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [isDeletingReview, setIsDeletingReview] = useState<boolean>(false);

  const [deletingRechargeCodeId, setDeletingRechargeCodeId] = useState<string | null>(null);
  const [isDeletingRechargeCode, setIsDeletingRechargeCode] = useState<boolean>(false);

  const handleConfirmRechargeCodeDelete = async () => {
    if (!deletingRechargeCodeId) return;
    setIsDeletingRechargeCode(true);
    try {
      await deleteRechargeCode(deletingRechargeCodeId);
      setDeletingRechargeCodeId(null);
    } catch (err) {
      console.error('Error deleting recharge code:', err);
      alert('حدث خطأ أثناء حذف الكود');
    } finally {
      setIsDeletingRechargeCode(false);
    }
  };

  // تحضير بيانات الخريطة الحرارية
  const [rechargeCount, setRechargeCount] = useState(10);
  const [rechargePoints, setRechargePoints] = useState(1000);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleEditReviewClick = (review: any) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditMessage(review.message || '');
  };

  const handleSaveReviewEdit = async () => {
    if (!editingReview) return;
    setIsSavingReview(true);
    try {
      await updateStoreReview(editingReview.id, {
        rating: editRating,
        message: editMessage.trim()
      });
      setEditingReview(null);
    } catch (err) {
      console.error('Error saving review edit:', err);
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleConfirmReviewDelete = async () => {
    if (!deletingReviewId) return;
    setIsDeletingReview(true);
    try {
      await deleteStoreReview(deletingReviewId);
      setDeletingReviewId(null);
    } catch (err) {
      console.error('Error deleting review:', err);
    } finally {
      setIsDeletingReview(false);
    }
  };

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
  const [storeModalTab, setStoreModalTab] = useState<'info' | 'edit' | 'verify' | 'sub' | 'products'>('info');
  const [storeEditForm, setStoreEditForm] = useState<{
    shopName: string;
    ownerName: string;
    username: string;
    phone: string;
    province: string;
    area: string;
    landmark: string;
    deliveryPrice: number;
    isFreeDelivery: boolean;
    logo: string;
    status: 'pending' | 'active' | 'suspended';
  }>({
    shopName: '',
    ownerName: '',
    username: '',
    phone: '',
    province: '',
    area: '',
    landmark: '',
    deliveryPrice: 0,
    isFreeDelivery: false,
    logo: '',
    status: 'active'
  });
  const [verifyDuration, setVerifyDuration] = useState<number>(30);
  const [verifyDurationType, setVerifyDurationType] = useState<'days' | 'months' | 'years' | 'lifetime'>('days');
  const [subTypeSelection, setSubTypeSelection] = useState<string>('1_month');
  const [subDecreaseSelection, setSubDecreaseSelection] = useState<string>('1_day');
  
  // لتمثيل تعديل المنتجات الخاص بالمتجر النشط
  const [storeProductToEdit, setStoreProductToEdit] = useState<Product | null>(null);
  const [productEditForm, setProductEditForm] = useState<{
    name: string;
    description: string;
    price: number;
    discountType: 'none' | 'percent' | 'amount';
    discountValue: number;
    finalPrice: number;
    image: string;
    status: 'published' | 'draft' | 'archived';
  }>({
    name: '',
    description: '',
    price: 0,
    discountType: 'none',
    discountValue: 0,
    finalPrice: 0,
    image: '',
    status: 'published'
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const invoiceRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => invoiceRef.current,
    documentTitle: `Invoice-${selectedOrder?.id || 'Order'}`,
  });

  const handleShareWhatsAppInvoice = (order: Order) => {
    let msg = `*فاتورة طلب - منصة محلك*\n`;
    msg += `الطلب: ${order.id}\n`;
    msg += `الزبون: ${order.customerName}\n`;
    msg += `الهاتف: ${order.customerPhone}\n\n`;
    msg += `*المنتجات:*\n`;
    order.items.forEach(item => {
      msg += `- ${item.name} (${item.quantity}x)\n`;
    });
    msg += `\nالاجمالي: ${order.total.toLocaleString()} د.ع\n`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{type: 'store' | 'customer' | 'flashSale', id: string, name: string} | null>(null);
  const [editFlashSaleDatesModal, setEditFlashSaleDatesModal] = useState<{id: string, name: string, start: string, end: string} | null>(null);

  // تحديث الحقول بشكل تلقائي عند تغيير المتجر المختار للتعديل
  useEffect(() => {
    if (selectedStore) {
      const store = selectedStore;
      const timer = setTimeout(() => {
        setStoreModalTab('info');
        setStoreEditForm({
          shopName: store.shopName || '',
          ownerName: store.ownerName || '',
          username: store.username || '',
          phone: store.phone || '',
          province: store.province || '',
          area: store.area || '',
          landmark: store.landmark || '',
          deliveryPrice: store.deliveryPrice || 0,
          isFreeDelivery: !!store.isFreeDelivery,
          logo: store.logo || '',
          status: store.status || 'active'
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedStore]);

  // تحديث حقول تعديل المنتج للمتجر
  useEffect(() => {
    if (storeProductToEdit) {
      const product = storeProductToEdit;
      const timer = setTimeout(() => {
        setProductEditForm({
          name: product.name || '',
          description: product.description || '',
          price: product.price || 0,
          discountType: product.discountType || 'none',
          discountValue: product.discountValue || 0,
          finalPrice: product.finalPrice || 0,
          image: product.image || '',
          status: product.status || 'published'
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [storeProductToEdit]);

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

  const [seeding, setSeeding] = useState(false);
  const [numStoresToGen, setNumStoresToGen] = useState(5);
  const [numProdsToGen, setNumProdsToGen] = useState(3);
  const [virtualSeeding, setVirtualSeeding] = useState(false);
  const [virtualDeleting, setVirtualDeleting] = useState(false);

  const handleGenerateVirtualData = async () => {
    if (numStoresToGen < 1 || numProdsToGen < 1) {
      alert('⚠️ الرجاء إدخال أعداد صحيحة أكبر من الصفر');
      return;
    }
    const message = `هل أنت متأكد من رغبتك في توليد عدد ${numStoresToGen} متاجر افتراضية مع عدد ${numProdsToGen} منتجات لكل متجر؟`;
    if (!window.confirm(message)) {
      return;
    }
    setVirtualSeeding(true);
    try {
      const res = await generateVirtualData(numStoresToGen, numProdsToGen);
      if (res.success) {
        alert('🎉 ' + res.message);
      } else {
        alert('❌ ' + res.message);
      }
    } catch (err: any) {
      alert('❌ فشل توليد البيانات الافتراضية: ' + (err.message || err));
    } finally {
      setVirtualSeeding(false);
    }
  };

  const handleDeleteAllVirtualData = async () => {
    if (!window.confirm('🚨 تحذير هام! هل أنت متأكد من حذف الحسابات والبيانات الافتراضية بالكامل؟ (سيتم حذف جميع المتاجر والمنتجات التي تحمل وسم افتراضي، ولن تتأثر البيانات الحقيقية)')) {
      return;
    }
    setVirtualDeleting(true);
    try {
      const res = await deleteAllVirtualData();
      if (res.success) {
        alert('🎉 ' + res.message);
      } else {
        alert('❌ ' + res.message);
      }
    } catch (err: any) {
      alert('❌ فشل حذف البيانات الافتراضية: ' + (err.message || err));
    } finally {
      setVirtualDeleting(false);
    }
  };

  const handleSeedDatabase = async () => {
    if (stores.length > 0 && !window.confirm('🚨 يوجد بيانات بالفعل في المتاجر. هل تريد إضافة البيانات التجريبية الإضافية؟')) {
      return;
    }
    setSeeding(true);
    try {
      const res = await seedDatabase();
      if (res.success) {
        alert('🎉 ' + res.message);
      } else {
        alert('❌ ' + res.message);
      }
    } catch (err: any) {
      alert('❌ فشل توليد البيانات: ' + (err.message || err));
    } finally {
      setSeeding(false);
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

  // Auto Backup Logic
  useEffect(() => {
    if (adminSettings?.enableAutoBackup) {
      const lastBackup = adminSettings.lastAutoBackup;
      const now = new Date().getTime();
      const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      if (!lastBackup || now - parseInt(lastBackup) > oneDay) {
        if (typeof window !== 'undefined') {
          console.log("Triggering auto backup...");
          handleExportSystem();
          updateAdminSettings({ lastAutoBackup: now.toString() });
        }
      }
      
      const interval = setInterval(() => {
        const checkNow = new Date().getTime();
        const currentLastBackup = adminSettings?.lastAutoBackup ? parseInt(adminSettings.lastAutoBackup) : 0;
        if (checkNow - currentLastBackup > oneDay) {
          console.log("Triggering periodic auto backup...");
          handleExportSystem();
          updateAdminSettings({ lastAutoBackup: checkNow.toString() });
        }
      }, 60 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [adminSettings?.enableAutoBackup, adminSettings?.lastAutoBackup]);

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
    indigo:   { primary: 'bg-[#9952FF]', primaryHover: 'hover:bg-[#4D2980]', bg: 'bg-[#f5eeff]', light: 'text-[#9952FF]', text: 'text-[#4D2980]', dark: 'from-[#9952FF] to-[#4D2980]' },
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
    setSidebarOpen(false);
    setSearchQuery('');
    setSelectedProvince('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ==========================================
  // الحسابات والإحصائيات (Computed Values)
  // ==========================================
  
  const stats = useMemo(() => {
    // تصفية الطلبات لاستبعاد أي طلبات تابعة لمتاجر أو زبائن محذوفين نهائياً
    const validOrders = orders.filter(o => {
      const storeExists = stores.some(s => s.id === o.storeId);
      const customerExists = customers.some(c => c.id === o.customerId);
      return storeExists && customerExists;
    });

    const totalStores = stores.length;
    const activeStores = stores.filter(s => s.status === 'active').length;
    
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => !c.isBlocked).length;
    const blockedCustomers = customers.filter(c => c.isBlocked).length;
    
    // الريلز
    const totalReels = adminReels.length;
    const totalReelViews = adminReels.reduce((acc, r) => acc + (r.viewsCount || 0), 0);
    const totalReelLikes = adminReels.reduce((acc, r) => acc + (r.likes || 0), 0);
    
    // التقييمات
    const validReviews = storeReviews.filter(r => stores.some(s => s.id === r.storeId));
    const totalReviews = validReviews.length;
    
    // الفلاش سيلز (عروض التخفيضات)
    const activeFlashSales = flashSales.filter(f => f.status === 'active').length;
    const totalFlashSaleRequests = flashSaleRequests.length;
    
    // كودات الشحن
    const activeRechargeCodes = rechargeCodes.filter(c => c.status === 'active').length;
    const totalRechargePoints = rechargeCodes.filter(c => c.status === 'active').reduce((acc, c) => acc + c.points, 0);

    const totalOrders = validOrders.length;
    const pendingOrders = validOrders.filter(o => o.status === 'pending').length;
    const acceptedOrders = validOrders.filter(o => ['accepted', 'shipped', 'delivered'].includes(o.status)).length;
    const rejectedOrders = validOrders.filter(o => ['rejected', 'cancelled', 'returned', 'replaced'].includes(o.status)).length;
    
    const totalRevenue = validOrders.filter(o => o.status === 'delivered').reduce((acc, o) => acc + o.total, 0);
    const totalDeliveryFees = validOrders.filter(o => o.status === 'delivered').reduce((acc, o) => acc + o.deliveryPrice, 0);
    const totalDiscounts = validOrders.filter(o => o.status === 'delivered').reduce((acc, o) => acc + o.discountAmount, 0);
    
    // تصفية المنتجات للمتاجر الموجودة فقط
    const validProducts = products.filter(p => stores.some(s => s.id === p.storeId));
    const totalProducts = validProducts.length;
    const publishedProducts = validProducts.filter(p => p.status === 'published').length;
    const draftProducts = validProducts.filter(p => p.status === 'draft').length;
    const archivedProducts = validProducts.filter(p => p.status === 'archived').length;
    
    // تصفية كوبونات الخصم للمتاجر الموجودة فقط
    const validPromoCodes = promoCodes.filter(p => p.storeId === 'ALL_STORES' || stores.some(s => s.id === p.storeId));
    const totalPromos = validPromoCodes.length;
    const activePromos = validPromoCodes.filter(p => p.status === 'active').length;
    const expiredPromos = validPromoCodes.filter(p => p.status === 'expired').length;
    const totalPromoUsage = validPromoCodes.reduce((acc, p) => acc + p.usedCount, 0);
    
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

    // المتاجر الأكثر طلباً - تصفية المتاجر المحذوفة
    const storeOrderCounts: Record<string, number> = {};
    validOrders.forEach(o => {
      storeOrderCounts[o.storeId] = (storeOrderCounts[o.storeId] || 0) + 1;
    });
    const topStores = Object.entries(storeOrderCounts)
      .map(([storeId, count]) => ({
        store: stores.find(s => s.id === storeId),
        orderCount: count
      }))
      .filter(item => item.store !== undefined) // التأكد تماماً أن المتجر موجود وليس محذوفاً
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5);

    return {
      totalStores, activeStores,
      totalCustomers, activeCustomers, blockedCustomers,
      totalReels, totalReelViews, totalReelLikes,
      totalReviews,
      totalOrders, pendingOrders, acceptedOrders, rejectedOrders,
      totalRevenue, totalDeliveryFees, totalDiscounts,
      totalProducts, publishedProducts, draftProducts, archivedProducts,
      totalPromos, activePromos, expiredPromos, totalPromoUsage,
      totalPoints, storesByProvince, customersByTier, topStores,
      activeFlashSales, totalFlashSaleRequests, activeRechargeCodes, totalRechargePoints
    };
  }, [stores, customers, orders, products, promoCodes, adminReels, storeReviews, flashSales, flashSaleRequests, rechargeCodes]);

  // فلترة المتاجر
  const filteredStores = useMemo(() => {
    return stores.filter(s => {
      const isSubActive = (() => {
        if (!s.subscriptionExpiry || s.subscriptionExpiry === 'none' || s.subscriptionExpiry === 'منتهي') {
          return false;
        }
        if (s.subscriptionExpiry === 'Lifetime') {
          return true;
        }
        try {
          const now = new Date();
          const exprDate = new Date(s.subscriptionExpiry);
          return exprDate > now;
        } catch (e) {
          return false;
        }
      })();

      const matchStatus = (() => {
        if (storeFilter === 'all') return true;
        if (storeFilter === 'verified') return !!(s.isVerified || (s as any).is_verified);
        if (storeFilter === 'subscribed') return isSubActive;
        if (storeFilter === 'expired_sub') return !isSubActive;
        return s.status === storeFilter;
      })();

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

  // فلترة الطلبات - استبعاد الطلبات التابعة لمتاجر أو زبائن محذوفين نهائياً
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const storeExists = stores.some(s => s.id === o.storeId);
      const customerExists = customers.some(c => c.id === o.customerId);
      if (!storeExists || !customerExists) return false;

      const matchStatus = orderFilter === 'all' || 
        (orderFilter === 'pending' && o.status === 'pending') ||
        (orderFilter === 'accepted' && ['accepted', 'shipped', 'delivered'].includes(o.status)) || 
        (orderFilter === 'rejected' && ['rejected', 'cancelled', 'returned', 'replaced'].includes(o.status));
      const matchSearch = searchQuery === '' || 
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.storeName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [orders, stores, customers, orderFilter, searchQuery]);

  // فلترة المنتجات - استبعاد المنتجات التابعة لمتاجر محذوفة
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const storeExists = stores.some(s => s.id === p.storeId);
      if (!storeExists) return false;

      const matchSearch = searchQuery === '' || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.price.toString().includes(searchQuery) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [products, stores, searchQuery]);

  // فلترة البروموكودات - استبعاد الكوبونات التابعة لمتاجر محذوفة
  const filteredPromos = useMemo(() => {
    return promoCodes.filter(p => {
      const storeExists = p.storeId === 'ALL_STORES' || stores.some(s => s.id === p.storeId);
      if (!storeExists) return false;

      const matchStatus = promoFilter === 'all' || p.status === promoFilter;
      const matchSearch = searchQuery === '' || 
        p.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [promoCodes, stores, promoFilter, searchQuery]);

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
        <div className="fixed inset-0 bg-black/40 z-[900] lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* زر القائمة العائم للموبايل - على اليمين */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`fixed top-4 z-[999] lg:hidden w-12 h-12 rounded-full shadow-2xl border flex items-center justify-center transition-all active:scale-95 ${
          sidebarOpen
            ? 'bg-red-500 text-white border-red-400'
            : 'bg-white text-[#9952FF] border-[#e9daff]'
        }`}
        style={{ right: '16px', left: 'auto' }}
        aria-label={sidebarOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* ==========================================
          الشريط الجانبي (Sidebar) - ينغلق آلياً بالمحمول
          ========================================== */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar-open' : 'admin-sidebar-closed'} w-72 bg-gradient-to-b from-[#4D2980] to-[#381a66] text-white p-4 flex flex-col fixed right-0 top-0 h-screen z-[950] shadow-2xl transition-transform duration-300`}>
        
        {/* اللوغو */}
        <div className="flex items-center space-x-3 space-x-reverse border-b border-[#9952FF] pb-4 mb-4">
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
              activeTab === 'overview' ? 'bg-[#9952FF] text-white shadow-md' : 'text-slate-400 hover:bg-[#9952FF]/50'
            }`}
          >
            <BarChart3 size={18} />
            <span className="font-semibold">نظرة عامة</span>
          </button>

          {/* إدارة المتاجر */}
          <button 
            onClick={() => handleTabSelect('stores')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'stores' ? 'bg-[#9952FF] text-white shadow-md' : 'text-slate-400 hover:bg-[#9952FF]/50'
            }`}
          >
            <StoreIcon size={18} />
            <span className="font-semibold">إدارة المتاجر</span>
          </button>

          {/* إدارة الزبائن */}
          <button 
            onClick={() => handleTabSelect('customers')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'customers' ? 'bg-[#9952FF] text-white shadow-md' : 'text-slate-400 hover:bg-[#9952FF]/50'
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
              activeTab === 'orders' ? 'bg-[#9952FF] text-white shadow-md' : 'text-slate-400 hover:bg-[#9952FF]/50'
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
              activeTab === 'products' ? 'bg-[#9952FF] text-white shadow-md' : 'text-slate-400 hover:bg-[#9952FF]/50'
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
              activeTab === 'recharge' ? 'bg-[#9952FF] text-white shadow-md' : 'text-slate-400 hover:bg-[#9952FF]/50'
            }`}
          >
            <Zap size={18} className="text-emerald-400" />
            <span className="font-semibold">شحن الكودات (توليد)</span>
          </button>

          {/* أكواد الخصم */}
          <button 
            onClick={() => handleTabSelect('promos')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'promos' ? 'bg-[#9952FF] text-white shadow-md' : 'text-slate-400 hover:bg-[#9952FF]/50'
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
              activeTab === 'subscriptions' ? 'bg-[#9952FF] text-white shadow-md' : 'text-slate-400 hover:bg-[#9952FF]/50'
            }`}
          >
            <CreditCard size={18} />
            <span className="font-semibold">أسعار الاشتراكات</span>
          </button>

          {/* الفعاليات المركزية */}
          <button 
            onClick={() => handleTabSelect('flashsales')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'flashsales' ? 'bg-[#9952FF] text-white shadow-md' : 'text-slate-400 hover:bg-[#9952FF]/50'
            }`}
          >
            <Zap size={18} className="text-yellow-400" />
            <span className="font-semibold">الفعاليات المركزية</span>
          </button>


          {/* تقييمات المتاجر */}
          <button 
            onClick={() => handleTabSelect('reviews')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'reviews' ? 'bg-[#9952FF] text-white shadow-md' : 'text-slate-400 hover:bg-[#9952FF]/50'
            }`}
          >
            <Star size={18} />
            <span className="font-semibold">تقييمات المتاجر</span>
            {storeReviews.filter(r => !r.isReadByAdmin && stores.some(s => s.id === r.storeId)).length > 0 && (
              <span className="mr-auto bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-bounce">
                جديد ({storeReviews.filter(r => !r.isReadByAdmin && stores.some(s => s.id === r.storeId)).length})
              </span>
            )}
          </button>

          {/* إرسال إشعارات */}
          <button 
            onClick={() => handleTabSelect('broadcast')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'broadcast' ? 'bg-[#9952FF] text-white shadow-md' : 'text-slate-400 hover:bg-[#9952FF]/50'
            }`}
          >
            <Bell size={18} />
            <span className="font-semibold">إرسال إشعارات</span>
          </button>

          {/* حملات الواتساب */}
          <button 
            onClick={() => handleTabSelect('whatsapp')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'whatsapp' ? 'bg-[#9952FF] text-white shadow-md' : 'text-slate-400 hover:bg-[#9952FF]/50'
            }`}
          >
            <MessageCircle size={18} className="text-green-500" />
            <span className="font-semibold">حملات الواتساب</span>
          </button>

          {/* الخريطة الحرارية */}
          <button 
            onClick={() => handleTabSelect('heatmap')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'heatmap' ? 'bg-[#9952FF] text-white shadow-md' : 'text-slate-400 hover:bg-[#9952FF]/50'
            }`}
          >
            <Map size={18} />
            <span className="font-semibold">الخريطة الحرارية للطلبات</span>
          </button>

          {/* قاعدة البيانات */}
          <button 
            onClick={() => handleTabSelect('database')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'database' ? 'bg-[#9952FF] text-white shadow-md' : 'text-slate-400 hover:bg-[#9952FF]/50'
            }`}
          >
            <Archive size={18} className="text-amber-400" />
            <span className="font-semibold">قاعدة البيانات</span>
          </button>



          {/* الإعلانات الممولة */}
          <button 
            onClick={() => handleTabSelect('ads' as any)}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === ('ads' as any) ? 'bg-[#9952FF] text-white shadow-md' : 'text-slate-400 hover:bg-[#9952FF]/50'
            }`}
          >
            <Megaphone size={18} className="text-pink-400" />
            <span className="font-semibold">الإعلانات الممولة</span>
          </button>

          {/* ريلز */}
          {/* إدارة الريلز (مخفية مؤقتاً)
          <button 
            onClick={() => handleTabSelect('reels')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'reels' ? 'bg-[#9952FF] text-white shadow-md' : 'text-slate-400 hover:bg-[#9952FF]/50'
            }`}
          >
            <Film size={18} className="text-blue-400" />
            <span className="font-semibold">إدارة الريلز</span>
          </button>
          */}

          {/* الإعدادات */}
          <button 
            onClick={() => handleTabSelect('settings')}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              activeTab === 'settings' ? 'bg-[#9952FF] text-white shadow-md' : 'text-slate-400 hover:bg-[#9952FF]/50'
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
      <main className="flex-1 min-w-0 lg:mr-72 p-4 lg:p-6 pt-0 lg:pt-0 pb-20 lg:pb-6">
        
        {/* الهيدر العلوي */}
        <header className="sticky top-0 z-10 flex justify-between items-center mb-6 bg-white p-4 rounded-b-2xl md:rounded-2xl shadow-sm border border-slate-200 border-t-0">
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
                {activeTab === 'broadcast' && '📢 إرسال إشعارات للزبائن'}
                {activeTab === 'whatsapp' && '💬 حملات الواتساب الذكية'}
                {activeTab === 'heatmap' && '🗺️ الخريطة الحرارية للطلبات'}
                {activeTab === 'database' && '🗄️ إدارة قاعدة البيانات'}
                {activeTab === 'ads' && '📢 الإعلانات الممولة'}
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
                          c==='indigo'?'bg-[#9952FF]':c==='emerald'?'bg-emerald-500':c==='blue'?'bg-blue-500':c==='purple'?'bg-purple-500':c==='rose'?'bg-rose-500':'bg-amber-500'
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
              <div 
                onClick={() => handleTabSelect('stores')}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer"
              >
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
                  <span className="text-slate-400">جميع المحافظات</span>
                </div>
              </div>

              <div 
                onClick={() => handleTabSelect('customers')}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer"
              >
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

              <div 
                onClick={() => handleTabSelect('orders')}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer"
              >
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
                  <span className="text-green-600">مكتمل: {stats.acceptedOrders}</span>
                  <span className="text-red-600">مرفوض: {stats.rejectedOrders}</span>
                </div>
              </div>

              <div 
                onClick={() => handleTabSelect('orders')}
                className="bg-gradient-to-br from-emerald-500 to-green-600 p-5 rounded-2xl shadow-lg text-white cursor-pointer hover:shadow-xl transition"
              >
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

            {/* الإحصائيات الإضافية (ريلز وتقييمات ومنتجات) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/*
              <div 
                onClick={() => handleTabSelect('reels')}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition"
              >
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                    <Film size={20} />
                  </div>
                  <div>
                    <span className="text-lg font-black text-slate-800 block">{stats.totalReels}</span>
                    <span className="text-[10px] text-slate-400 font-bold">ريلز منشورة</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between text-[10px] font-semibold">
                  <span className="text-blue-500">مشاهدات: {(stats.totalReelViews || 0).toLocaleString()}</span>
                  <span className="text-pink-500">إعجابات: {(stats.totalReelLikes || 0).toLocaleString()}</span>
                </div>
              </div>
              */}

              <div 
                onClick={() => handleTabSelect('reviews')}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition"
              >
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                    <Star size={20} />
                  </div>
                  <div>
                    <span className="text-lg font-black text-slate-800 block">{stats.totalReviews}</span>
                    <span className="text-[10px] text-slate-400 font-bold">تقييم للمتاجر</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between text-[10px] font-semibold">
                  <span className="text-slate-400">من قبل زبائن موثوقين</span>
                </div>
              </div>

              <div 
                onClick={() => handleTabSelect('products')}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition"
              >
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    <Package size={20} />
                  </div>
                  <div>
                    <span className="text-lg font-black text-slate-800 block">{stats.totalProducts}</span>
                    <span className="text-[10px] text-slate-400 font-bold">منتج في النظام</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between text-[10px] font-semibold">
                  <span className="text-green-500">نشط: {stats.publishedProducts}</span>
                  <span className="text-slate-400">مسودة: {stats.draftProducts}</span>
                </div>
              </div>

              <div 
                onClick={() => handleTabSelect('promos')}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition"
              >
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="p-3 bg-pink-100 text-pink-600 rounded-xl">
                    <Ticket size={20} />
                  </div>
                  <div>
                    <span className="text-lg font-black text-slate-800 block">{stats.totalPromos}</span>
                    <span className="text-[10px] text-slate-400 font-bold">كود خصم</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between text-[10px] font-semibold">
                  <span className="text-green-500">فعال: {stats.activePromos}</span>
                  <span className="text-slate-400">استخدام: {stats.totalPromoUsage} مرة</span>
                </div>
              </div>
            </div>

            {/* الإحصائيات الإضافية 2 (فلاش سيلز ونقاط شحن) */}
            <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
              <div 
                onClick={() => handleTabSelect('flashsales')}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition"
              >
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                    <Zap size={20} />
                  </div>
                  <div>
                    <span className="text-lg font-black text-slate-800 block">{stats.activeFlashSales}</span>
                    <span className="text-[10px] text-slate-400 font-bold">عروض فلاش سيلز نشطة</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between text-[10px] font-semibold">
                  <span className="text-amber-500">طلبات انتظار: {stats.totalFlashSaleRequests}</span>
                </div>
              </div>

              <div 
                onClick={() => handleTabSelect('recharge')}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition"
              >
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <span className="text-lg font-black text-slate-800 block">{(stats.totalRechargePoints || 0).toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400 font-bold">نقاط الشحن المتاحة</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between text-[10px] font-semibold">
                  <span className="text-slate-400">أكواد فعالة: {stats.activeRechargeCodes}</span>
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
                          <span className="text-lg font-black text-[#9952FF]">{item.orderCount}</span>
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
                <Activity size={18} className="text-[#9952FF]" />
                <span>حالة إعدادات النظام</span>
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <span className="text-xs text-slate-500 block mb-1">نموذج الربح</span>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#e9daff] text-[#4D2980]">
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
                  className="w-full border border-slate-200 p-2 pr-9 rounded-xl text-xs text-right focus:ring-2 focus:ring-[#9952FF] focus:outline-none" 
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

              <div className="flex flex-wrap gap-2">
                {(['all', 'active', 'verified', 'subscribed', 'expired_sub'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStoreFilter(filter as any)}
                    className={`px-3 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                      storeFilter === filter 
                      ? (filter === 'active' ? 'bg-green-500 text-white' : 
                         filter === 'verified' ? 'bg-blue-500 text-white' : 
                         filter === 'subscribed' ? 'bg-emerald-600 text-white' : 
                         filter === 'expired_sub' ? 'bg-rose-500 text-white' : 
                         'bg-[#9952FF] text-white')
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filter === 'all' && `الكل (${stores.length})`}
                    {filter === 'active' && `نشط (${stores.filter(s => s.status === 'active').length})`}
                    {filter === 'verified' && `🛡️ الموثقة (${stores.filter(s => s.isVerified || (s as any).is_verified).length})`}
                    {filter === 'subscribed' && `💳 المشتركة (${stores.filter(s => {
                      if (!s.subscriptionExpiry || s.subscriptionExpiry === 'none' || s.subscriptionExpiry === 'منتهي') return false;
                      if (s.subscriptionExpiry === 'Lifetime') return true;
                      try {
                        return new Date(s.subscriptionExpiry) > new Date();
                      } catch {
                        return false;
                      }
                    }).length})`}
                    {filter === 'expired_sub' && `⚠️ المنتهية (${stores.filter(s => {
                      if (!s.subscriptionExpiry || s.subscriptionExpiry === 'none' || s.subscriptionExpiry === 'منتهي') return true;
                      if (s.subscriptionExpiry === 'Lifetime') return false;
                      try {
                        return new Date(s.subscriptionExpiry) <= new Date();
                      } catch {
                        return true;
                      }
                    }).length})`}
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
                              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                <span>{store.shopName}</span>
                                <CopyButton text={store.shopName} size={9} />
                                {store.is_virtual && (
                                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                                    افتراضي
                                  </span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <span>{store.ownerName}</span>
                              <CopyButton text={store.ownerName} size={9} />
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-[#9952FF] whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <span>@{store.username}</span>
                              <CopyButton text={store.username} size={9} />
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <span>{store.phone}</span>
                              <CopyButton text={store.phone} size={9} />
                            </span>
                          </td>
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
                            <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold ' + (
                              store.isBanned ? 'bg-red-100 text-red-700' :
                              store.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-slate-100 text-slate-700'
                            )}>
                              {store.isBanned ? 'محظور' :
                               store.status === 'active' ? 'نشط' :
                               'بانتظار الموافقة'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center sticky left-0 bg-white/95 backdrop-blur-sm z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.02)] whitespace-nowrap">
                            <button
                              onClick={() => setSelectedStore(store)}
                              className="px-2.5 py-1 text-[10px] font-bold bg-[#9952FF]/10 hover:bg-[#9952FF] text-[#9952FF] hover:text-white rounded-lg transition-all"
                            >
                              تفاصيل وتحكم
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* مودال تفاصيل المتجر والتحديثات الشاملة (Verification - Subscriptions - CRUD & Products Editing) */}
            {selectedStore && (() => {
              const activeStore = stores.find(s => s.id === selectedStore.id) || selectedStore;
              const storeProducts = products.filter(p => p.storeId === activeStore.id);
              
              // فحص إذا كان المتجر مشتركاً حالياً
              const isSubscriptionActive = (() => {
                if (!activeStore.subscriptionExpiry || activeStore.subscriptionExpiry === 'none' || activeStore.subscriptionExpiry === 'منتهي') {
                  return false;
                }
                if (activeStore.subscriptionExpiry === 'Lifetime') {
                  return true;
                }
                try {
                  const now = new Date();
                  const exprDate = new Date(activeStore.subscriptionExpiry);
                  return exprDate > now;
                } catch (e) {
                  return false;
                }
              })();

              return (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
                    
                    {/* الرأس الهيدر */}
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div className="flex items-center space-x-4 space-x-reverse min-w-0">
                        <div className="relative">
                          <img src={activeStore.logo || undefined} alt="" className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-200 shadow-sm" />
                          {(activeStore.isVerified || (activeStore as any).is_verified) && (
                            <div className="absolute -top-1.5 -right-1.5 z-10" title="رسمي موثق">
                              <VerifiedBadge size={18} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 text-right">
                          <h3 className="text-md font-black text-slate-800 flex items-center gap-1.5 flex-wrap">
                            <span>{activeStore.shopName}</span>
                            {(activeStore.isVerified || (activeStore as any).is_verified) && (
                              <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                <VerifiedBadge size={10} /> موثق رسمياً
                              </span>
                            )}
                          </h3>
                          <span className="text-xs text-slate-400 font-mono">@{activeStore.username}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => { setSelectedStore(null); setStoreProductToEdit(null); }} 
                        className="p-2 hover:bg-slate-200 text-slate-500 hover:text-slate-700 bg-slate-100 rounded-xl transition"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* التبويبات الداخلية */}
                    <div className="flex border-b border-slate-100 bg-slate-50 px-6 py-1 gap-1 overflow-x-auto scrollbar-none shrink-0">
                      {[
                        { id: 'info', label: '📊 التفاصيل', icon: <BarChart3 size={14} /> },
                        { id: 'edit', label: '✏️ تعديل المعلومات', icon: <Edit size={14} /> },
                        { id: 'verify', label: '🛡️ نظام التوثيق', icon: <Shield size={14} /> },
                        { id: 'sub', label: '💳 الباقة والاشتراك', icon: <CreditCard size={14} /> },
                        { id: 'products', label: '🛍️ المنتجات (' + storeProducts.length + ')', icon: <Package size={14} /> }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setStoreModalTab(tab.id as any)}
                          className={'flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all shrink-0 ' + (
                            storeModalTab === tab.id
                              ? 'border-[#9952FF] text-[#9952FF] bg-white'
                              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                          )}
                        >
                          {tab.icon}
                          <span>{tab.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* المحتوى الداخلي للتبويبات */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                      
                      {/* تبويب التفاصيل العامة */}
                      {storeModalTab === 'info' && (
                        <div className="space-y-4 text-slate-700">
                          {/* شارة التوثيق */}
                          {(activeStore.isVerified || (activeStore as any).is_verified) ? (
                            <div className="bg-gradient-to-l from-blue-500 to-indigo-600 text-white p-4 rounded-2xl shadow-sm flex items-center justify-between">
                              <div className="text-right">
                                <h4 className="font-black text-sm flex items-center gap-1">🛡️ شارة التوثيق الرسمية نشطة (زرقاء)</h4>
                                <p className="text-[10px] opacity-90 mt-1">
                                  هذا المتجر آمن وموثوق من قبل الإدارة. نوع التوثيق: <span className="font-bold underline">{activeStore.verificationType === 'lifetime' ? 'مدى الحياة' : 'مؤقت'}</span>
                                </p>
                                <p className="text-[10px] opacity-80 mt-0.5">
                                  ينتهي التوثيق في: <span className="font-mono font-bold text-yellow-300">{activeStore.verificationExpiresAt || 'غير محدد'}</span>
                                </p>
                              </div>
                              <div className="p-3 bg-white/10 rounded-2xl text-white">
                                <Award size={28} className="animate-bounce" />
                              </div>
                            </div>
                          ) : (
                            <div className="bg-slate-50 border border-dashed border-slate-200 p-4 rounded-2xl flex items-center justify-between">
                              <div>
                                <h4 className="font-bold text-slate-700 text-xs">شارة التوثيق معطّلة</h4>
                                <p className="text-[10px] text-slate-400 mt-1">لم يتم توثيق هذا المتجر بعد. يمكنك توثيقه وتفعيله فوراً من تبويب "نظام التوثيق".</p>
                              </div>
                              <Shield size={24} className="text-slate-300" />
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <span className="text-[10px] text-slate-400 font-bold block mb-1">المالك</span>
                              <span className="text-sm font-bold text-slate-800">{activeStore.ownerName}</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <span className="text-[10px] text-slate-400 font-bold block mb-1">رقم الهاتف</span>
                              <span className="text-sm font-bold text-slate-800 font-mono">{activeStore.phone}</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <span className="text-[10px] text-slate-400 font-bold block mb-1">المحافظة</span>
                              <span className="text-sm font-bold text-slate-800">{activeStore.province}</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <span className="text-[10px] text-slate-400 font-bold block mb-1">المنطقة والمنطقة بالتفصيل</span>
                              <span className="text-sm font-bold text-slate-800">{activeStore.area || 'غير محدد'}</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 col-span-2">
                              <span className="text-[10px] text-slate-400 font-bold block mb-1">أقرب نقطة دالة</span>
                              <span className="text-sm font-bold text-slate-800 mb-2 block">{activeStore.landmark || 'غير محدد'}</span>
                              {adminSettings?.enableMaps !== false && activeStore.lat && activeStore.lng && (
                                <div className="w-full h-32 rounded-xl overflow-hidden border border-slate-200 mt-2 pointer-events-none relative z-0">
                                  <MapContainer 
                                    center={[activeStore.lat, activeStore.lng]} 
                                    zoom={14} 
                                    style={{ height: "100%", width: "100%", zIndex: 0 }}
                                    zoomControl={false}
                                    attributionControl={false}
                                    dragging={false}
                                    scrollWheelZoom={false}
                                    doubleClickZoom={false}
                                  >
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <Marker position={[activeStore.lat, activeStore.lng]} />
                                  </MapContainer>
                                </div>
                              )}
                              {(activeStore.lat && activeStore.lng) && (
                                <div className="flex justify-end mt-2">
                                  <a 
                                    href={`https://www.google.com/maps?q=${activeStore.lat},${activeStore.lng}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-white p-2 rounded-lg text-[#9952FF] shadow-sm hover:shadow-md transition pointer-events-auto border border-slate-200 flex items-center gap-2 text-[10px]"
                                  >
                                    <Globe size={14} /> 
                                    <span>فتح في خرائط جوجل</span>
                                  </a>
                                </div>
                              )}
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <span className="text-[10px] text-slate-400 font-bold block mb-1">سعر التوصيل للمحافظة</span>
                              <span className="text-sm font-bold text-slate-800">
                                {activeStore.isFreeDelivery ? 'توصيل مجاني 🚚' : (activeStore.deliveryPrice || 0).toLocaleString() + ' د.ع'}
                              </span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <span className="text-[10px] text-slate-400 font-bold block mb-1">تقييم المتجر</span>
                              <span className="text-sm font-bold text-yellow-600 flex items-center-center">
                                <Star size={14} className="ml-1 shrink-0 text-yellow-500 fill-yellow-500" />
                                {activeStore.rating} / 5
                              </span>
                            </div>

                            {/* تفاصيل باقة الاشتراك الحالية */}
                            <div className="col-span-2 bg-gradient-to-l from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
                              <div>
                                <span className="text-[9px] text-emerald-600 font-black block mb-1 uppercase tracking-wider">حالة الاشتراك الحالية</span>
                                <div className="text-md font-black text-teal-800 flex items-center gap-1.5">
                                  <span>
                                    {activeStore.subscriptionId === 'sub_yearly' ? 'باقة التاجر الذهبي (سنوية)' : 
                                     activeStore.subscriptionId === 'sub_semi' ? 'باقة التاجر الفضي (نصف سنوية)' : 'الباقة الاقتصادية (شهرية)'}
                                  </span>
                                  <span className={'text-[9px] font-bold px-2 py-0.5 rounded-full ' + (isSubscriptionActive ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800 animate-pulse')}>
                                    {isSubscriptionActive ? 'نشط ومفعّل' : 'منتهي الصلاحية'}
                                  </span>
                                </div>
                                <p className="text-xs text-teal-600 mt-1 flex items-center gap-1 font-bold">
                                  <Clock size={12} /> ينتهي تاريخ الصلاحية في: <span className="font-mono bg-white/60 px-1.5 py-0.5 rounded border border-emerald-100/50 text-slate-700">{activeStore.subscriptionExpiry}</span>
                                </p>
                              </div>
                              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                                <CreditCard size={24} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* تبويب تعديل المعلومات الأساسية لمتجر (Full CRUD) */}
                      {storeModalTab === 'edit' && (
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          try {
                            await adminUpdateStore(activeStore.id, {
                              shopName: storeEditForm.shopName,
                              ownerName: storeEditForm.ownerName,
                              username: storeEditForm.username,
                              phone: storeEditForm.phone,
                              province: storeEditForm.province,
                              area: storeEditForm.area,
                              landmark: storeEditForm.landmark,
                              deliveryPrice: Number(storeEditForm.deliveryPrice),
                              isFreeDelivery: storeEditForm.isFreeDelivery,
                              logo: storeEditForm.logo,
                              status: storeEditForm.status
                            });
                            alert('🎉 تم تحديث بيانات المتجر بنجاح!');
                          } catch (err: any) {
                            alert('❌ حدث خطأ أثناء التحديث: ' + err.message);
                          }
                        }} className="space-y-4">
                          
                          <div className="text-right">
                             <span className="text-xs font-bold text-slate-500 block mb-1">اسم المتجر (Shop Name)</span>
                             <input 
                               type="text" 
                               value={storeEditForm.shopName}
                               onChange={(e) => setStoreEditForm({...storeEditForm, shopName: e.target.value})}
                               className="w-full text-xs font-bold border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#9952FF]" 
                               required 
                             />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                               <span className="text-xs font-bold text-slate-500 block mb-1">اسم المالك الثاني</span>
                               <input 
                                 type="text" 
                                 value={storeEditForm.ownerName}
                                 onChange={(e) => setStoreEditForm({...storeEditForm, ownerName: e.target.value})}
                                 className="w-full text-xs border rounded-xl p-3 focus:ring-2 focus:ring-[#9952FF]" 
                                 required 
                               />
                            </div>
                            <div>
                               <span className="text-xs font-bold text-slate-500 block mb-1">اسم المستخدم (@username)</span>
                               <input 
                                 type="text" 
                                 value={storeEditForm.username}
                                 onChange={(e) => setStoreEditForm({...storeEditForm, username: e.target.value})}
                                 className="w-full text-xs font-mono text-left border rounded-xl p-3 focus:ring-2 focus:ring-[#9952FF]" 
                                 required 
                               />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                               <span className="text-xs font-bold text-slate-500 block mb-1">رقم الهاتف</span>
                               <input 
                                 type="text" 
                                 value={storeEditForm.phone}
                                 onChange={(e) => setStoreEditForm({...storeEditForm, phone: e.target.value})}
                                 className="w-full text-xs font-mono border rounded-xl p-3 focus:ring-2 focus:ring-[#9952FF]" 
                                 required 
                               />
                            </div>
                            <div>
                               <span className="text-xs font-bold text-slate-500 block mb-1">المجلس / المحافظة</span>
                               <select 
                                 value={storeEditForm.province}
                                 onChange={(e) => setStoreEditForm({...storeEditForm, province: e.target.value})}
                                 className="w-full text-xs border rounded-xl p-3 bg-white"
                               >
                                 {provinces.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                               </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                               <span className="text-xs font-bold text-slate-500 block mb-1">المنطقة بالتفصيل</span>
                               <input 
                                 type="text" 
                                 value={storeEditForm.area}
                                 onChange={(e) => setStoreEditForm({...storeEditForm, area: e.target.value})}
                                 className="w-full text-xs border rounded-xl p-3" 
                               />
                            </div>
                            <div>
                               <span className="text-xs font-bold text-slate-500 block mb-1">أقرب نقطة دالة</span>
                               <input 
                                 type="text" 
                                 value={storeEditForm.landmark}
                                 onChange={(e) => setStoreEditForm({...storeEditForm, landmark: e.target.value})}
                                 className="w-full text-xs border rounded-xl p-3" 
                               />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div>
                               <span className="text-xs font-bold text-slate-500 block mb-1">سعر التوصيل د.ع</span>
                               <input 
                                 type="number" 
                                 value={storeEditForm.deliveryPrice}
                                 disabled={storeEditForm.isFreeDelivery}
                                 onChange={(e) => setStoreEditForm({...storeEditForm, deliveryPrice: Number(e.target.value)})}
                                 className="w-full text-xs border rounded-xl p-3 disabled:bg-slate-100" 
                               />
                            </div>
                            <div className="flex items-center gap-2 mt-5">
                              <input 
                                type="checkbox"
                                id="isFreeDel"
                                checked={storeEditForm.isFreeDelivery}
                                onChange={(e) => setStoreEditForm({...storeEditForm, isFreeDelivery: e.target.checked, deliveryPrice: e.target.checked ? 0 : storeEditForm.deliveryPrice})}
                                className="w-4 h-4 text-[#9952FF] accent-[#9952FF]"
                              />
                              <label htmlFor="isFreeDel" className="text-xs font-bold text-slate-700 cursor-pointer">سعر التوصيل للمتجر مجاني 🚚</label>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 items-center">
                            <div>
                              <span className="text-xs font-bold text-slate-500 block mb-1">حالة المتجر</span>
                              <select 
                                value={storeEditForm.status}
                                onChange={(e) => setStoreEditForm({...storeEditForm, status: e.target.value as any})}
                                className="w-full text-xs border rounded-xl p-3 bg-white"
                              >
                                <option value="active">نشط ومفعل</option>
                                <option value="pending">بانتظار الموافقة</option>
                              </select>
                            </div>
                            
                            <div>
                              <ImageUploader 
                                value={storeEditForm.logo}
                                onChange={(url) => setStoreEditForm({...storeEditForm, logo: url})}
                                label="شعار المتجر لوجو"
                                aspectRatio="square"
                                showUrlOption={true}
                              />
                            </div>
                          </div>

                          <button 
                            type="submit" 
                            className="w-full py-3 bg-gradient-to-l from-[#9952FF] to-[#4D2980] hover:from-[#4D2980] text-white font-bold rounded-xl shadow-md text-xs transition mt-2"
                          >
                            💾 حفظ وحفظ تعديلات المتجر الآن
                          </button>
                        </form>
                      )}

                      {/* تبويب نظام التوثيق وشارة التوثيق (Merchant Verification System) */}
                      {storeModalTab === 'verify' && (
                        <div className="space-y-6">
                          <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                            <span className="text-blue-600 text-lg">ℹ️</span>
                            <div className="text-right">
                              <h4 className="font-bold text-blue-900 text-xs">حول نظام شارة التوثيق المعتمدة (Verified Badge)</h4>
                              <p className="text-[10px] text-blue-700 leading-relaxed mt-1">
                                تعطي الشارة ثقة كاملة لزبائن المتجر وتظهر كصح أزرق بجانب اسم المتجر أينما تجول الزبون. يمكنك كأدمن إعطاء شارة التوثيق وتحديد مدتها بدقة أو إلغائها فوراً بأي وقت. الحقول المعنية هي (<span className="font-mono">isVerified, verificationType, verificationExpiresAt</span>).
                              </p>
                            </div>
                          </div>

                          {/* حالة التوثيق الحالية */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">حالة التوثيق الرسمية</span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={'w-3 h-3 rounded-full ' + (activeStore.isVerified ? 'bg-blue-500 animate-pulse' : 'bg-slate-300')}></span>
                                <span className="text-sm font-black text-slate-800">
                                  {activeStore.isVerified ? 'المتجر موثق حالياً شارة التوثيق نشطة' : 'المتجر غير موثق حالياً شارة التوثيق معطلة'}
                                </span>
                              </div>
                              {activeStore.isVerified && (
                                <p className="text-xs font-bold text-blue-600 mt-1">
                                  مدة وصلاحية التوثيق: <span className="underline">{activeStore.verificationType === 'lifetime' ? 'مدى الحياة' : (activeStore.verificationExpiresAt + ' (مؤقت)')}</span>
                                </p>
                              )}
                            </div>

                            {activeStore.isVerified && (
                              <button 
                                type="button"
                                onClick={async () => {
                                  if (confirm('هل أنت متأكد من إلغاء توثيق هذا المتجر وسحب الشارة الزرقاء منه؟')) {
                                    try {
                                      await adminUpdateStore(activeStore.id, {
                                        isVerified: false
                                      });
                                      alert('❌ تم إلغاء توثيق المتجر بنجاح!');
                                    } catch (err: any) {
                                      alert('خطأ: ' + err.message);
                                    }
                                  }
                                }}
                                className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-xl text-xs transition"
                              >
                                الغاء التوثيق
                              </button>
                            )}
                          </div>

                          {/* خيارات وإضافة توثيق جديد */}
                          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4 text-right">
                            <h4 className="font-extrabold text-slate-800 text-xs">🛠️ تفعيل / تجديد شارة التوثيق</h4>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">نوع مدة الصلاحية</label>
                                <select 
                                  value={verifyDurationType}
                                  onChange={(e: any) => setVerifyDurationType(e.target.value)}
                                  className="w-full text-xs rounded-xl border p-3 bg-white"
                                >
                                  <option value="days">أيام محددة</option>
                                  <option value="months">أشهر محددة</option>
                                  <option value="years">سنين محددة</option>
                                  <option value="lifetime">مدى الحياة (Lifetime)</option>
                                </select>
                              </div>

                              {verifyDurationType !== 'lifetime' && (
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-1">قيمة مدة التوثيق</label>
                                  <input 
                                    type="number" 
                                    min={1}
                                    value={verifyDuration}
                                    onChange={(e) => setVerifyDuration(Number(e.target.value))}
                                    className="w-full text-xs rounded-xl border p-3" 
                                  />
                                </div>
                              )}
                            </div>

                            <button 
                              onClick={async () => {
                                try {
                                  const base = new Date();
                                  let finalExpiryStr = 'Lifetime';
                                  
                                  if (verifyDurationType !== 'lifetime') {
                                    if (verifyDurationType === 'days') base.setDate(base.getDate() + verifyDuration);
                                    else if (verifyDurationType === 'months') base.setMonth(base.getMonth() + verifyDuration);
                                    else if (verifyDurationType === 'years') base.setFullYear(base.getFullYear() + verifyDuration);
                                    
                                    const y = base.getFullYear();
                                    const m = String(base.getMonth() + 1).padStart(2, '0');
                                    const d = String(base.getDate()).padStart(2, '0');
                                    finalExpiryStr = y + '-' + m + '-' + d;
                                  }

                                  await adminUpdateStore(activeStore.id, {
                                    isVerified: true,
                                    verificationType: verifyDurationType,
                                    verificationExpiresAt: finalExpiryStr
                                  });
                                  alert('🎉 تم توثيق المتجر بنجاح وتفعيل الشارة الرسمية! تاريخ الصلاحية: ' + finalExpiryStr);
                                } catch (e: any) {
                                  alert('خطأ: ' + e.message);
                                }
                              }}
                              className="w-full py-3 bg-[#9952FF] hover:bg-[#4D2980] text-white text-xs font-bold rounded-xl transition shadow-sm"
                            >
                              ✨ تفعيل شارة التوثيق الرسمية للمتجر الآن
                            </button>
                          </div>
                        </div>
                      )}

                      {/* تبويب إدارة الاشتراكات الذكية (Smart Subscription Management) */}
                      {storeModalTab === 'sub' && (
                        <div className="space-y-6">
                          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-right">
                            <h4 className="font-bold text-emerald-900 text-xs">💳 إدارة اشتراكات المتاجر الذكية (Smart Subscriptions)</h4>
                            <p className="text-[10px] text-emerald-700 leading-relaxed mt-1">
                              يمتاز هذا النظام بذكاء فحص صلاحية الاشتراك. للتاجر المسجل لأول مرة يظهر زر "تفعيل الاشتراك" وللتاجر المسجل سابقاً أو لمريدي التمديد يظهر زر "تجديد الباقة". إذا كان اشتراكه ساري المفعول، سيتم تمديد الصلاحية انطلاقاً من تاريخ انتهاءه الحالي، أما إذا كان منتهياً أو يسجل لأول مرة فتبدأ الصلاحية من اليوم!
                            </p>
                          </div>

                          {/* حالة الاشتراك الحالي */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex justify-between items-center text-right">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block mb-1">الوضع الحالي المتجر</span>
                              <div className="text-md font-black text-slate-800">
                                {isSubscriptionActive ? (
                                  <span className="text-emerald-600 flex items-center gap-1">🟢 متجر نشط وصلاحيته مفعّلة</span>
                                ) : (
                                  <span className="text-red-500 flex items-center gap-1">🔴 متجر يحتاج لتفعيل وتفعيل اشتراك</span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-slate-500 mt-1">تاريخ انتهاء الباقة الحالي: <span className="font-mono bg-slate-50 px-2 py-0.5 rounded text-slate-800">{activeStore.subscriptionExpiry || 'منتهي/غير مسجل'}</span></p>
                            </div>
                            
                            <div className="text-left">
                              <span className="text-xs font-black bg-[#9952FF]/10 text-[#9952FF] px-3 py-1.5 rounded-2xl block text-center">
                                {isSubscriptionActive ? 'مجدد للصلاحية' : 'غير مفعل أول مرة'}
                              </span>
                            </div>
                          </div>

                          {/* مدة وقيمة للتفعيل */}
                          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4 text-right">
                            <h4 className="font-black text-slate-800 text-xs">⚡ خيارات لتفعيل / تجديد الاشتراك الذكي</h4>
                            
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">اختر مدة صلاحية الباقة المطلوبة</label>
                              <select 
                                value={subTypeSelection}
                                onChange={(e) => setSubTypeSelection(e.target.value)}
                                className="w-full text-xs bg-white border rounded-xl p-3"
                              >
                                <option value="1_day">1 يوم (يوم واحد) ⏱️</option>
                                <option value="2_days">2 يوم (يومين) ⏱️</option>
                                <option value="3_days">3 أيام (ثلاثة أيام) ⏱️</option>
                                <option value="1_month">1 شهر (30 يوم) 🗓️</option>
                                <option value="2_months">2 شهر (ستين يوم) 🗓️</option>
                                <option value="3_months">3 أشهر (ربع سنوي) 🗓️</option>
                                <option value="6_months">6 أشهر (نصف سنوي) 👑</option>
                                <option value="1_year">1 سنة كاملة (عضوية سنوية) 👑</option>
                                <option value="lifetime">مدى الحياة (عضوية أزلية) 💎</option>
                              </select>
                            </div>

                            <button 
                              onClick={async () => {
                                try {
                                  const now = new Date();
                                  let baseDate = now;

                                  // ذكاء التواريخ: إذا كان الاشتراك الحالي لم ينتهي بعد، نقوم بالتمديد انطلاقاً منه!
                                  if (activeStore.subscriptionExpiry && activeStore.subscriptionExpiry !== 'none' && activeStore.subscriptionExpiry !== 'Lifetime') {
                                    try {
                                      const parsed = new Date(activeStore.subscriptionExpiry);
                                      if (parsed > now) {
                                        baseDate = parsed;
                                      }
                                    } catch (e) {
                                      console.error('Failed to parse subscription expiry date:', e);
                                    }
                                  }

                                  let finalExpiry = 'Lifetime';
                                  if (subTypeSelection !== 'lifetime') {
                                    const resultDate = new Date(baseDate);
                                    if (subTypeSelection === '1_day') resultDate.setDate(resultDate.getDate() + 1);
                                    else if (subTypeSelection === '2_days') resultDate.setDate(resultDate.getDate() + 2);
                                    else if (subTypeSelection === '3_days') resultDate.setDate(resultDate.getDate() + 3);
                                    else if (subTypeSelection === '1_month') resultDate.setMonth(resultDate.getMonth() + 1);
                                    else if (subTypeSelection === '2_months') resultDate.setMonth(resultDate.getMonth() + 2);
                                    else if (subTypeSelection === '3_months') resultDate.setMonth(resultDate.getMonth() + 3);
                                    else if (subTypeSelection === '6_months') resultDate.setMonth(resultDate.getMonth() + 6);
                                    else if (subTypeSelection === '1_year') resultDate.setFullYear(resultDate.getFullYear() + 1);

                                    const yr = resultDate.getFullYear();
                                    const mt = String(resultDate.getMonth() + 1).padStart(2, '0');
                                    const dy = String(resultDate.getDate()).padStart(2, '0');
                                    finalExpiry = yr + '-' + mt + '-' + dy;
                                  }

                                  let finalSubId = 'sub_monthly';
                                  if (subTypeSelection === '1_year' || subTypeSelection === 'lifetime') {
                                    finalSubId = 'sub_yearly';
                                  } else if (subTypeSelection === '6_months') {
                                    finalSubId = 'sub_semi';
                                  }

                                  await adminUpdateStore(activeStore.id, {
                                    subscriptionExpiry: finalExpiry,
                                    subscriptionId: finalSubId
                                  });
                                  alert('🎉 تم بنجاح تفعيل / تجديد الاشتراك المعتمد للمتجر! التاريخ الجديد: ' + finalExpiry);
                                } catch (err: any) {
                                  alert('خطأ أثناء حفظ الاشتراك: ' + err.message);
                                }
                              }}
                              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                            >
                              {activeStore.subscriptionExpiry && activeStore.subscriptionExpiry !== 'none' && activeStore.subscriptionExpiry !== 'منتهي' ? (
                                <span>💳 تجديد الاشتراك وتمديد صلاحية الباقة المعتمدة للمتجر</span>
                              ) : (
                                <span>💳 تفعيل وتأصيل تفعيل الاشتراك لأول مرة للمتجر</span>
                              )}
                            </button>
                          </div>

                          {/* تقليل مدة الاشتراك أو إلغائه */}
                          <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 space-y-4 text-right">
                            <h4 className="font-extrabold text-rose-800 text-xs flex items-center gap-1">⚠️ خيارات تقليل مدة الاشتراك أو إلغائه لمتجر التاجر</h4>
                            
                            {isSubscriptionActive ? (
                              <>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-500 mb-1">اختر المقدار لتقليل مدة صلاحية الباقة</label>
                                  <select 
                                    value={subDecreaseSelection}
                                    onChange={(e) => setSubDecreaseSelection(e.target.value)}
                                    className="w-full text-xs bg-white border border-rose-200 rounded-xl p-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                  >
                                    <option value="1_day">تقليل 1 يوم (يوم واحد) ⏱️</option>
                                    <option value="2_days">تقليل 2 يوم (يومين) ⏱️</option>
                                    <option value="3_days">تقليل 3 أيام (ثلاثة أيام) ⏱️</option>
                                    <option value="1_month">تقليل 1 شهر (30 يوم) 🗓️</option>
                                    <option value="2_months">تقليل 2 شهر (ستين يوم) 🗓️</option>
                                    <option value="3_months">تقليل 3 أشهر (ربع سنوي) 🗓️</option>
                                  </select>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                                  <button 
                                    onClick={async () => {
                                      if (activeStore.subscriptionExpiry === 'Lifetime') {
                                        alert('المتجر مشترك مدى الحياة، لا يمكن تقليل اشتراكه إلا عبر إلغائه أولاً!');
                                        return;
                                      }
                                      try {
                                        const currentExpiry = new Date(activeStore.subscriptionExpiry);
                                        if (isNaN(currentExpiry.getTime())) {
                                          alert('عذراً، لا يوجد تاريخ انتهاء باقة رقمي صالح لتقليله!');
                                          return;
                                        }

                                        const newDate = new Date(currentExpiry);
                                        if (subDecreaseSelection === '1_day') newDate.setDate(newDate.getDate() - 1);
                                        else if (subDecreaseSelection === '2_days') newDate.setDate(newDate.getDate() - 2);
                                        else if (subDecreaseSelection === '3_days') newDate.setDate(newDate.getDate() - 3);
                                        else if (subDecreaseSelection === '1_month') newDate.setMonth(newDate.getMonth() - 1);
                                        else if (subDecreaseSelection === '2_months') newDate.setMonth(newDate.getMonth() - 2);
                                        else if (subDecreaseSelection === '3_months') newDate.setMonth(newDate.getMonth() - 3);

                                        const yr = newDate.getFullYear();
                                        const mt = String(newDate.getMonth() + 1).padStart(2, '0');
                                        const dy = String(newDate.getDate()).padStart(2, '0');
                                        const finalExpiry = yr + '-' + mt + '-' + dy;

                                        await adminUpdateStore(activeStore.id, {
                                          subscriptionExpiry: finalExpiry
                                        });
                                        alert('📉 تم تقليل مدة الاشتراك بنجاح! التاريخ الجديد: ' + finalExpiry);
                                      } catch (err: any) {
                                        alert('خطأ أثناء تقليل الاشتراك: ' + err.message);
                                      }
                                    }}
                                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                                  >
                                    📉 تقليل مدة صلاحية باقة المتجر
                                  </button>

                                  <button 
                                    onClick={async () => {
                                      if (confirm('هل أنت متأكد من إنهاء اشتراك هذا المتجر فوراً؟ ستنتهي صلاحية اشتراكه وسيتوقف المتجر.')) {
                                        try {
                                          await adminUpdateStore(activeStore.id, {
                                            subscriptionExpiry: 'منتهي',
                                            subscriptionId: 'sub_monthly'
                                          });
                                          alert('❌ تم إنهاء اشتراك المتجر بنجاح!');
                                        } catch (err: any) {
                                          alert('خطأ أثناء إنهاء الاشتراك: ' + err.message);
                                        }
                                      }
                                    }}
                                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 duration-200"
                                  >
                                    🚫 إنهاء الاشتراك
                                  </button>
                                </div>
                              </>
                            ) : (
                              <p className="text-slate-400 text-xs italic">باقة الاشتراك الخاصة بالمتجر غير نشطة حالياً.</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* تبويب إدارة وعرض منتجات المتجر المسجلة (CRUD Products inside store view) */}
                      {storeModalTab === 'products' && (
                        <div className="space-y-4">
                          
                          {/* رأس التحكم بمنتجات المتجر بالمنتجات */}
                          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 flex-wrap gap-2">
                            <div className="text-right">
                              <h4 className="font-extrabold text-xs text-slate-800">🛍️ المنتجات المسجلة في {activeStore.shopName}</h4>
                              <p className="text-[10px] text-slate-400 mt-1">يبلغ إجمالي عدد المنتجات في هذا المتجر حوالي {storeProducts.length} منتجات.</p>
                            </div>
                            
                            <button 
                              onClick={() => {
                                setStoreProductToEdit({ id: 'NEW_PRODUCT' } as any);
                                setProductEditForm({
                                  name: '',
                                  description: '',
                                  price: 0,
                                  discountType: 'none',
                                  discountValue: 0,
                                  finalPrice: 0,
                                  image: '',
                                  status: 'published'
                                });
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition"
                            >
                              <Plus size={14} />
                              <span>إضافة منتج جديد للمتجر</span>
                            </button>
                          </div>

                          {/* لوحة تحرير / إضافة منتج مع شاري */}
                          {storeProductToEdit && (
                            <div className="bg-slate-50 p-5 rounded-2xl border border-[#9952FF]/30 space-y-4 text-right animate-fade-in">
                              <h4 className="font-black text-xs text-[#9952FF] flex items-center gap-1">
                                {storeProductToEdit.id === 'NEW_PRODUCT' ? '➕ إنشاء منتج جديد وتأصيله في المتجر' : '✏️ تحرير حقول المنتج وتعديل بياناته'}
                              </h4>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] text-slate-500 font-bold mb-1">اسم المنتج *</label>
                                  <input 
                                    type="text" 
                                    value={productEditForm.name}
                                    onChange={(e) => setProductEditForm({...productEditForm, name: e.target.value})}
                                    className="w-full text-xs p-3 rounded-xl border bg-white" required
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-500 font-bold mb-1">الحالة</label>
                                  <select 
                                    value={productEditForm.status}
                                    onChange={(e) => setProductEditForm({...productEditForm, status: e.target.value as any})}
                                    className="w-full text-xs p-3 rounded-xl border bg-white"
                                  >
                                    <option value="published">منشور وعام للزبائن</option>
                                    <option value="draft">مسودة خفية</option>
                                    <option value="archived">مؤرشف ومخفي</option>
                                  </select>
                                </div>
                              </div>

                              <div className="text-right">
                                <label className="block text-[10px] text-slate-500 font-bold mb-1">وصف المنتج</label>
                                <textarea 
                                  value={productEditForm.description}
                                  onChange={(e) => setProductEditForm({...productEditForm, description: e.target.value})}
                                  rows={2}
                                  className="w-full text-xs p-3 rounded-xl border bg-white resize-none"
                                />
                              </div>

                              <div className="grid grid-cols-3 gap-3 bg-white p-3 rounded-xl border">
                                <div>
                                  <label className="block text-[9px] text-slate-400 font-bold mb-1">السعر الأصلي د.ع</label>
                                  <input 
                                    type="number" 
                                    value={productEditForm.price}
                                    onChange={(e) => {
                                      const p = Number(e.target.value);
                                      const final = p - (productEditForm.discountType === 'percent' ? p * (productEditForm.discountValue / 100) : productEditForm.discountValue);
                                      setProductEditForm({...productEditForm, price: p, finalPrice: Math.max(0, final)});
                                    }}
                                    className="w-full text-xs text-center border p-1 rounded font-mono" 
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] text-slate-400 font-bold mb-1">نوع الخصم</label>
                                  <select 
                                    value={productEditForm.discountType}
                                    onChange={(e: any) => {
                                      const dt = e.target.value;
                                      const final = productEditForm.price - (dt === 'percent' ? productEditForm.price * (productEditForm.discountValue / 100) : productEditForm.discountValue);
                                      setProductEditForm({...productEditForm, discountType: dt, finalPrice: Math.max(0, final)});
                                    }}
                                    className="w-full text-[10px] border p-1 rounded text-center bg-white"
                                  >
                                    <option value="none">بدون خصم</option>
                                    <option value="percent">نسبة مئوية %</option>
                                    <option value="amount">مبلغ مباشر د.ع</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[9px] text-slate-400 font-bold mb-1">قيمة الخصم</label>
                                  <input 
                                    type="number"
                                    value={productEditForm.discountValue}
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      const final = productEditForm.price - (productEditForm.discountType === 'percent' ? productEditForm.price * (v / 100) : v);
                                      setProductEditForm({...productEditForm, discountValue: v, finalPrice: Math.max(0, final)});
                                    }}
                                    className="w-full text-xs text-center border p-1 rounded font-mono" 
                                  />
                                </div>
                              </div>

                              <div className="bg-[#f5eeff] px-4 py-2 rounded-xl text-center border border-[#9952FF]/10">
                                <span className="text-[10px] text-slate-500 font-bold block mb-0.5">السعر النهائي للزبون</span>
                                <span className="text-sm font-black text-[#9952FF] font-mono">{(productEditForm.finalPrice || 0).toLocaleString()} د.ع</span>
                              </div>

                              <div className="grid grid-cols-2 gap-4 items-center">
                                <ImageUploader 
                                  value={productEditForm.image}
                                  onChange={(url) => setProductEditForm({...productEditForm, image: url})}
                                  label="صورة المنتج"
                                  aspectRatio="square"
                                  showUrlOption={true}
                                />
                                
                                <div className="flex gap-2 justify-end">
                                  <button 
                                    type="button"
                                    onClick={() => setStoreProductToEdit(null)}
                                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition"
                                  >
                                    إلغاء الأمر
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={async () => {
                                      if (!productEditForm.name.trim()) return alert('الرجاء إدخال اسم المنتج!');
                                      try {
                                        if (storeProductToEdit.id === 'NEW_PRODUCT') {
                                          await addProduct({
                                            storeId: activeStore.id,
                                            name: productEditForm.name,
                                            description: productEditForm.description,
                                            price: Number(productEditForm.price),
                                            discountType: productEditForm.discountType,
                                            discountValue: Number(productEditForm.discountValue),
                                            finalPrice: Number(productEditForm.finalPrice),
                                            image: productEditForm.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
                                            status: productEditForm.status,
                                            isFreeDelivery: false,
                                            createdAt: new Date().toISOString()
                                          });
                                          alert('🎉 تم إنشاء المنتج وإضافته بنجاح!');
                                        } else {
                                          await updateProduct(storeProductToEdit.id, {
                                            name: productEditForm.name,
                                            description: productEditForm.description,
                                            price: Number(productEditForm.price),
                                            discountType: productEditForm.discountType,
                                            discountValue: Number(productEditForm.discountValue),
                                            finalPrice: Number(productEditForm.finalPrice),
                                            image: productEditForm.image,
                                            status: productEditForm.status
                                          });
                                          alert('🎉 تم تحديث بيانات وحقول المنتج بنجاح!');
                                        }
                                        setStoreProductToEdit(null);
                                      } catch (err: any) {
                                        alert('خطأ: ' + err.message);
                                      }
                                    }}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs transition"
                                  >
                                    💾 حفظ معلومات المنتج
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* قائمة منتجات المتجر */}
                          <div className="max-h-[300px] overflow-y-auto divide-y border rounded-2xl divide-slate-100 overflow-hidden bg-white">
                            {storeProducts.length === 0 ? (
                              <div className="p-8 text-center text-slate-400">
                                <p className="text-xs">المتجر لا يحتوي على أي منتجات بعد.</p>
                              </div>
                            ) : (
                              storeProducts.map((p) => (
                                <div key={p.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-2 text-right">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <img src={p.image || undefined} alt="" className="w-10 h-10 rounded-lg object-cover border" />
                                    <div className="min-w-0">
                                      <h5 className="text-xs font-black text-slate-800 truncate max-w-[150px]">{p.name}</h5>
                                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{(p.finalPrice || 0).toLocaleString()} د.ع</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className={'text-[8.5px] font-bold px-2 py-0.5 rounded-full ' + (p.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600')}>
                                      {p.status === 'published' ? 'منشور' : p.status === 'draft' ? 'مسودة' : 'مؤرشف'}
                                    </span>

                                    <button 
                                      onClick={() => {
                                        setStoreProductToEdit(p);
                                      }}
                                      className="p-1 hover:bg-blue-100 text-blue-600 rounded"
                                      title="تعديل المنتج"
                                    >
                                      <Edit size={12} />
                                    </button>

                                    <button 
                                      onClick={async () => {
                                        if (confirm('هل أنت متأكد من رغبتك بحذف هذا المنتج نهائياً من متجر التاجر؟')) {
                                          try {
                                            await deleteProduct(p.id, 'permanent');
                                            alert('🗑️ تم تدمير وحذف المنتج بنجاح!');
                                          } catch (err: any) {
                                            alert('خطأ: ' + err.message);
                                          }
                                        }
                                      }}
                                      className="p-1 hover:bg-red-100 text-red-500 rounded"
                                      title="حذف نهائي"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                    </div>

                    {/* الفوتر وأزرار التحكم العامة بالمتجر */}
                    <div className="p-6 border-t border-slate-100 flex gap-2 justify-end bg-slate-50 flex-wrap shrink-0">
                      {activeStore.status !== 'active' && (
                        <button 
                          onClick={() => { updateStoreStatus(activeStore.id, 'active'); setSelectedStore(null); }}
                          className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold text-xs rounded-xl transition"
                        >
                          تفعيل المتجر
                        </button>
                      )}
                      <button 
                        onClick={() => { toggleStoreBan(activeStore.id); setSelectedStore(null); }}
                        className={'px-4 py-2.5 font-bold text-xs rounded-xl transition ' + (activeStore.isBanned ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-slate-200 hover:bg-red-100 text-slate-600 hover:text-red-700')}
                      >
                        {activeStore.isBanned ? 'فك الحظر عن المتجر' : 'حظر المتجر نهائياً'}
                      </button>
                      <button 
                        onClick={() => { setDeleteConfirmModal({type: 'store', id: activeStore.id, name: activeStore.shopName}); setSelectedStore(null); }}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-red-500 hover:text-white text-slate-400 font-bold text-xs rounded-xl transition"
                      >
                        حذف المتجر
                      </button>
                      <button 
                        onClick={() => { setSelectedStore(null); setStoreProductToEdit(null); }}
                        className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition"
                      >
                        إغلاق
                      </button>
                    </div>

                  </div>
                </div>
              );
            })()}
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
                  className="w-full border border-slate-200 p-2 pr-9 rounded-xl text-xs text-right focus:ring-2 focus:ring-[#9952FF] focus:outline-none" 
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
                         filter === 'blocked' ? 'bg-red-500 text-white' : 'bg-[#9952FF] text-white')
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
                          <td className="px-4 py-3 font-mono text-xs text-[#9952FF] sticky right-0 bg-white/95 backdrop-blur-sm z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">{customer.id} <CopyButton text={customer.id} size={9} /></td>
                          <td className="px-4 py-3 font-bold sticky right-[80px] bg-white/95 backdrop-blur-sm z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)] whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <span>{customer.name}</span>
                              <CopyButton text={customer.name} size={10} />
                              {customer.is_virtual && (
                                <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                                  افتراضي
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <span>{customer.phone}</span>
                              <CopyButton text={customer.phone} size={9} />
                            </span>
                          </td>
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
                        <span className="text-sm font-bold text-slate-800 block mb-2">{selectedCustomer.address || 'غير محدد'}</span>
                        {adminSettings?.enableMaps !== false && selectedCustomer.lat && selectedCustomer.lng && (
                          <div className="w-full h-32 rounded-xl overflow-hidden border border-slate-200 mt-2 pointer-events-none relative z-0">
                            <MapContainer 
                              center={[selectedCustomer.lat, selectedCustomer.lng]} 
                              zoom={14} 
                              style={{ height: "100%", width: "100%", zIndex: 0 }}
                              zoomControl={false}
                              attributionControl={false}
                              dragging={false}
                              scrollWheelZoom={false}
                              doubleClickZoom={false}
                            >
                              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                              <Marker position={[selectedCustomer.lat, selectedCustomer.lng]} />
                            </MapContainer>
                          </div>
                        )}
                      </div>
                      {(selectedCustomer.lat && selectedCustomer.lng) && (
                        <div className="bg-[#f5eeff] p-4 rounded-xl col-span-2 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-[#b07aff] font-bold block mb-1">الموقع على الخريطة</span>
                            <span className="text-xs font-mono text-[#4D2980]">{selectedCustomer.lat.toFixed(6)}, {selectedCustomer.lng.toFixed(6)}</span>
                          </div>
                          <a 
                            href={`https://www.google.com/maps?q=${selectedCustomer.lat},${selectedCustomer.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-white p-2 rounded-lg text-[#9952FF] shadow-sm hover:shadow-md transition pointer-events-auto"
                          >
                            <Globe size={18} />
                          </a>
                        </div>
                      )}
                      <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                        <span className="text-[10px] text-yellow-600 font-bold block mb-1">رصيد النقاط</span>
                        <span className="text-lg font-black text-yellow-700">{selectedCustomer.points} نقطة</span>
                      </div>
                      <div className="bg-[#f5eeff] p-4 rounded-xl border border-[#e9daff]">
                        <span className="text-[10px] text-[#9952FF] font-bold block mb-1">المستوى</span>
                        <span className="text-lg font-black text-[#4D2980]">{selectedCustomer.tier}</span>
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
                  className="w-full border border-slate-200 p-2 pr-9 rounded-xl text-xs text-right focus:ring-2 focus:ring-[#9952FF] focus:outline-none" 
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
                         filter === 'rejected' ? 'bg-red-500 text-white' : 'bg-[#9952FF] text-white')
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filter === 'all' && `الكل (${stats.totalOrders})`}
                    {filter === 'pending' && `معلق (${stats.pendingOrders})`}
                    {filter === 'accepted' && `مقبول ومكتمل (${stats.acceptedOrders})`}
                    {filter === 'rejected' && `مرفوض وملغي (${stats.rejectedOrders})`}
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
                              order.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              order.status === 'cancelled' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-red-100 text-red-800'
                            }`}>
                              {order.status === 'pending' && 'قيد الانتظار'}
                              {order.status === 'accepted' && 'مقبول ✅'}
                              {order.status === 'rejected' && 'مرفوض ❌'}
                              {order.status === 'cancelled' && 'ملغي ⚠️'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {formatSafeDate(order.createdAt)} - {formatSafeTimeString(order.createdAt, 'ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-400 font-bold">المتجر:</span>
                            <span className="font-bold text-[#9952FF] mr-1">{order.storeName}</span>
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

                        {(order.status === 'rejected' || order.status === 'cancelled') && order.rejectionReason && (
                          <div className="mt-2 bg-rose-50 text-rose-600 text-[10px] px-3 py-2 rounded-lg border border-rose-100">
                            <strong>{order.status === 'cancelled' ? 'سبب الإلغاء:' : 'سبب الرفض:'}</strong> {order.rejectionReason}
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
                            <span className="text-[#9952FF]">{(order.total || 0).toLocaleString()} د.ع</span>
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
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setShowInvoiceModal(true)} 
                        className="p-2 bg-[#f5eeff] text-[#9952FF] hover:bg-[#e9daff] rounded-lg flex items-center gap-1 font-bold text-xs"
                      >
                        <Printer size={16} />
                        الفاتورة
                      </button>
                      <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                        <X size={20} />
                      </button>
                    </div>
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
                        <span className="font-bold text-[#9952FF]">{selectedOrder.storeName}</span>
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
                        <span className="mb-2 block">{selectedOrder.customerAddress}</span>
                        {adminSettings?.enableMaps !== false && (selectedOrder as any).customerLat && (selectedOrder as any).customerLng && (
                          <div className="w-full h-32 rounded-xl overflow-hidden border border-slate-200 mt-2 pointer-events-none relative z-0">
                            <MapContainer 
                              center={[(selectedOrder as any).customerLat, (selectedOrder as any).customerLng]} 
                              zoom={14} 
                              style={{ height: "100%", width: "100%", zIndex: 0 }}
                              zoomControl={false}
                              attributionControl={false}
                              dragging={false}
                              scrollWheelZoom={false}
                              doubleClickZoom={false}
                            >
                              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                              <Marker position={[(selectedOrder as any).customerLat, (selectedOrder as any).customerLng]} />
                            </MapContainer>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-[#f5eeff] p-4 rounded-xl border border-[#e9daff]">
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
                      <div className="flex justify-between text-lg font-black text-[#4D2980] pt-2 border-t border-[#e9daff]">
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
                  className="w-full border border-slate-200 p-2 pr-9 rounded-xl text-xs text-right focus:ring-2 focus:ring-[#9952FF] focus:outline-none" 
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
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-800 block text-xs truncate max-w-[150px]">{product.name}</span>
                                  {product.is_virtual && (
                                    <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                                      افتراضي
                                    </span>
                                  )}
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(product.id);
                                      alert(`تم نسخ معرف المنتج: ${product.id}`);
                                    }}
                                    className="p-1 text-slate-400 hover:text-[#9952FF] transition"
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
                    className="w-full bg-[#9952FF] text-white p-3 rounded-xl font-bold hover:bg-slate-700 transition flex items-center justify-center gap-2"
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
                      <th className="p-4 font-bold border-b w-20 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {rechargeCodes.slice(0, 50).map((code) => {
                      const user = customers.find(c => c.id === code.usedBy);
                      return (
                        <tr key={code.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 font-mono font-bold text-[#9952FF]">{code.code}</td>
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
                            {formatSafeDateTimeString(code.createdAt, 'ar-IQ', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => setDeletingRechargeCodeId(code.id)}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition border border-transparent mx-auto flex justify-center"
                              title="حذف الكود"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {deletingRechargeCodeId && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" dir="rtl">
                <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-xl border border-slate-100 animate-scale-in">
                  <div className="p-5 text-center space-y-3">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <AlertTriangle size={24} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">حذف كود الشحن نهائياً؟</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-bold">
                      هل أنت متأكد من حذف هذا الكود نهائياً من قاعدة البيانات؟ لن تظهر هذه القيمة مجدداً ولا يمكن التراجع عن هذا الإجراء.
                    </p>
                  </div>
                  <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                    <button
                      onClick={() => setDeletingRechargeCodeId(null)}
                      className="px-4 py-2 text-xs font-black text-slate-550 bg-slate-200 rounded-xl transition cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleConfirmRechargeCodeDelete}
                      disabled={isDeletingRechargeCode}
                      className="px-5 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      {isDeletingRechargeCode && <Loader2 size={12} className="animate-spin" />}
                      <span>{isDeletingRechargeCode ? 'جاري الحذف...' : 'نعم، احذف نهائياً'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                    className="w-full border border-slate-200 p-2 pr-9 rounded-xl text-xs text-right focus:ring-2 focus:ring-[#9952FF] focus:outline-none" 
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
                           filter === 'expired' ? 'bg-red-500 text-white' : 'bg-[#9952FF] text-white')
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
                                <span className="font-black bg-[#e9daff] text-[#4D2980] px-3 py-1.5 rounded-lg tracking-wider font-mono text-sm border border-[#e9daff]">
                                  {promo.code}
                                </span>
                                <button 
                                  onClick={() => copyToClipboard(promo.code)}
                                  className="p-1 text-slate-400 hover:text-[#9952FF] transition"
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
                                  (() => {
                                    const exp = new Date(promo.expiresAt);
                                    return !isNaN(exp.getTime()) && exp < new Date() ? 'text-red-600' : 'text-slate-600';
                                  })()
                                }`}>
                                  {promo.startDate && `${formatSafeDate(promo.startDate)} - `}
                                  {formatSafeDate(promo.expiresAt)}
                                  {(() => {
                                    const exp = new Date(promo.expiresAt);
                                    return !isNaN(exp.getTime()) && exp < new Date() ? ' (منتهي)' : '';
                                  })()}
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
                    <Calendar size={20} className="text-[#9952FF]" />
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
                          className="w-full text-center border border-slate-300 p-3 rounded-xl text-lg font-bold focus:ring-2 focus:ring-[#9952FF] focus:outline-none"
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
                        <span className="text-4xl font-black text-[#9952FF]">{(plan.price || 0).toLocaleString()}</span>
                        <span className="text-sm text-slate-500 font-bold block mt-1">دينار عراقي</span>
                        <span className="text-[10px] text-slate-400">المدة: {plan.durationMonths} شهر</span>
                      </>
                    )}
                  </div>

                  {editingPlanId !== plan.id && (
                    <button 
                      onClick={() => { setEditingPlanId(plan.id); setNewPlanPrice(plan.price); }}
                      className="w-full py-3 border border-[#e9daff] text-[#9952FF] bg-[#f5eeff] hover:bg-[#e9daff] font-bold text-sm rounded-xl transition flex items-center justify-center space-x-2 space-x-reverse"
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
            تاب تقييمات المتاجر
            ========================================== */}
        {activeTab === 'reviews' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 flex justify-between items-center">
                <span>سجل تقييمات المتاجر ({storeReviews.filter(r => stores.some(s => s.id === r.storeId)).length})</span>
              </div>
              
               {storeReviews.filter(review => {
                const storeExists = stores.some(s => s.id === review.storeId);
                const customerExists = customers.some(c => c.id === review.customerId);
                return storeExists && customerExists;
              }).length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Star size={48} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-bold">لا توجد تقييمات في النظام</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {storeReviews
                    .filter(review => {
                      const storeExists = stores.some(s => s.id === review.storeId);
                      const customerExists = customers.some(c => c.id === review.customerId);
                      return storeExists && customerExists;
                    })
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(review => {
                      const store = stores.find(s => s.id === review.storeId);
                      return (
                        <div key={review.id} className="p-4 hover:bg-slate-50 transition">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 space-x-reverse mb-1">
                                <span className="text-xs font-bold text-[#4D2980] bg-[#e9daff] px-2 py-0.5 rounded-full">
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
                                {formatSafeDate(review.createdAt)} - {formatSafeTimeString(review.createdAt, 'ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {/* أزرار التحكم في التقييم */}
                            <div className="flex items-center gap-2 mr-4">
                              <button
                                onClick={() => handleEditReviewClick(review)}
                                title="تعديل التقييم"
                                className="p-1.5 bg-slate-150 hover:bg-[#e9daff] text-slate-500 hover:text-[#9952FF] rounded-xl transition cursor-pointer"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => setDeletingReviewId(review.id)}
                                title="حذف التقييم نهائياً"
                                className="p-1.5 bg-slate-150 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl transition cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Modals for Editing and Deleting reviews */}
            {editingReview && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" dir="rtl">
                <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-xl border border-slate-100 animate-scale-in">
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Edit size={16} className="text-[#9952FF]" />
                      <span>تعديل تقييم العميل</span>
                    </h3>
                    <button 
                      onClick={() => setEditingReview(null)}
                      className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-[11px] font-black text-slate-550 mb-1">اسم العميل</label>
                      <p className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-2 rounded-xl">{editingReview.customerName}</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-550 mb-1.5">التقييم بالنجوم</label>
                      <div className="flex gap-2 text-xl" dir="ltr">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setEditRating(star)}
                            className={`transition-all hover:scale-110 ${star <= editRating ? 'text-amber-400' : 'text-slate-300'}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-550 mb-1">التعليق والرسالة</label>
                      <textarea
                        value={editMessage}
                        onChange={(e) => setEditMessage(e.target.value)}
                        rows={3}
                        placeholder="اكتب التعليق هنا..."
                        className="w-full text-xs font-bold text-slate-800 bg-[#FFFFFF] border border-slate-200 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-[#9952FF] focus:border-transparent resize-none"
                      />
                    </div>
                  </div>

                  <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditingReview(null)}
                      className="px-4 py-2 text-xs font-black text-slate-500 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleSaveReviewEdit}
                      disabled={isSavingReview}
                      className="px-5 py-2 text-xs font-black text-white bg-[#9952FF] hover:bg-[#8541E6] rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      {isSavingReview && <Loader2 size={12} className="animate-spin" />}
                      <span>{isSavingReview ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {deletingReviewId && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" dir="rtl">
                <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-xl border border-slate-100 animate-scale-in">
                  <div className="p-5 text-center space-y-3">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <AlertTriangle size={24} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">حذف التقييم نهائياً؟</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-bold">
                      هل أنت متأكد من حذف هذا التقييم نهائياً من قاعدة البيانات والتطبيق؟ لا يمكن التراجع عن هذا الإجراء وسيتم إعادة حساب متوسط تقييم المتجر تلقائياً.
                    </p>
                  </div>

                  <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setDeletingReviewId(null)}
                      className="px-4 py-2 text-xs font-black text-slate-550 bg-slate-200 rounded-xl transition cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleConfirmReviewDelete}
                      disabled={isDeletingReview}
                      className="px-5 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      {isDeletingReview && <Loader2 size={12} className="animate-spin" />}
                      <span>{isDeletingReview ? 'جاري الحذف...' : 'نعم، احذف نهائياً'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ==========================================
            تاب إرسال إشعارات عامة
            ========================================== */}
        {activeTab === 'broadcast' && (
          <div className="space-y-6 animate-fade-in max-w-2xl">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-bold text-slate-800 text-md mb-4 pb-2 border-b border-slate-100 flex items-center space-x-2 space-x-reverse">
                <Bell size={20} className="text-[#9952FF]" />
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
                className="px-6 py-2.5 bg-[#9952FF] text-white font-bold rounded-xl shadow-lg shadow-slate-200 hover:bg-slate-700 transition flex items-center gap-2"
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
                        className="py-2.5 bg-[#9952FF] text-white font-bold rounded-xl hover:bg-[#4D2980] transition text-sm flex items-center justify-center gap-2"
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
                      className="py-2.5 bg-[#f5eeff] text-[#4D2980] font-bold rounded-xl hover:bg-[#e9daff] transition text-sm flex items-center justify-center gap-2"
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
                                <p className="text-[10px] text-[#9952FF] font-bold mb-1">{store.shopName}</p>
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
                  <Map size={24} className="text-[#9952FF]" />
                  <span>الخريطة الحرارية للطلبات</span>
                </h3>
                <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-sm font-bold border border-amber-200">
                  إجمالي الطلبات: {orders.length}
                </div>
              </div>
              
              <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 relative z-0">
                <MapContainer center={[33.3152, 44.3661]} zoom={6} scrollWheelZoom={true} style={{ height: '100%', width: '100%', zIndex: 0 }}>
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
            تاب الريلز
            ========================================== */}
        {activeTab === 'reels' && (
          <div className="space-y-6 animate-in slide-in-from-bottom flex flex-col items-center">
            <h2 className="text-xl font-black text-slate-800 self-start mb-4">إدارة الريلز والمحتوى</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 w-full">
              {adminReels.length === 0 ? (
                <div className="col-span-full py-10 text-center text-slate-500 font-bold bg-white rounded-2xl border border-slate-100">لا توجد ريلز حالياً.</div>
              ) : (
                adminReels.map(reel => {
                  const store = stores.find(s => s.id === reel.merchantId);
                  const product = products.find(p => p.id === reel.linkedProductId);
                  return (
                    <div key={reel.id} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative group flex flex-col h-64 sm:h-72">
                      <video 
                        src={reel.videoUrl} 
                        className="w-full h-full object-cover rounded-t-2xl" 
                        controls={true}
                      />
                      <div className="absolute top-2 right-2 p-1 bg-black/60 rounded-lg text-white text-[9px] flex items-center gap-1 backdrop-blur-sm">
                        <Eye size={10} /> {reel.viewsCount || 0}
                      </div>
                      <button 
                        onClick={() => setReelToDelete(reel.id)}
                        className="absolute top-2 left-2 p-1.5 bg-rose-500 text-white rounded-lg shadow-sm hover:bg-rose-600 transition z-[100]"
                      >
                        <Trash size={12} />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <div className="flex items-center gap-1.5">
                          {store && store.logo && <img src={store.logo} className="w-5 h-5 rounded-full border border-white" alt="" />}
                          <p className="text-white text-[9px] font-bold truncate max-w-[80px]">{store?.shopName || 'متجر محذوف'}</p>
                        </div>
                        <p className="text-[9px] text-white/80 truncate mt-1">{product?.name || 'منتج محذوف'}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            تاب الإعلانات الممولة
            ========================================== */}
        {activeTab === 'ads' && (
          <div className="space-y-6 animate-fade-in max-w-4xl">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-bold text-slate-800 text-md mb-4 pb-2 border-b border-slate-100 flex items-center space-x-2 space-x-reverse">
                <Palette size={20} className="text-[#9952FF]" />
                <span>إعلانات تطبيق الزبون (Ads Slider)</span>
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
                              className={`flex-1 py-1 rounded-lg text-[9px] font-bold border transition ${ad.targetType === type ? 'bg-[#9952FF] text-white border-[#9952FF]' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
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
                              <div className="absolute z-20 w-full mt-1 bg-white border border-[#e9daff] rounded-xl shadow-xl max-h-40 overflow-y-auto">
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
                                      className="w-full p-2 text-right text-[10px] hover:bg-[#f5eeff] flex items-center space-x-2 space-x-reverse"
                                    >
                                      <img src={s.logo || undefined} className="w-5 h-5 rounded-full" />
                                      <span>{s.shopName}</span>
                                    </button>
                                  ))
                                ) : (
                                  // استهداف منتج - نبحث عن المتجر أولا
                                  stores.filter(s => s.shopName.toLowerCase().includes(adTargetSearch.toLowerCase())).map(s => (
                                    <div key={s.id} className="p-2 border-b last:border-0">
                                      <div className="text-[9px] font-black text-[#9952FF] mb-1">{s.shopName}</div>
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
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-[#9952FF] hover:border-[#e9daff] transition min-h-[250px]"
                  >
                    <Plus size={24} />
                    <span className="text-xs font-bold mt-2">إضافة إعلان جديد</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Delivery Ads */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mt-6">
              <h3 className="font-bold text-slate-800 text-md mb-4 pb-2 border-b border-slate-100 flex items-center space-x-2 space-x-reverse">
                <Truck size={20} className="text-[#9952FF]" />
                <span>إعلانات تطبيق التاجر - شركات التوصيل</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(adminSettings.merchantDeliveryAds || []).map((ad: any, index: number) => (
                  <div key={ad.id} className="p-4 border border-slate-100 rounded-2xl bg-white space-y-3 relative shadow-sm hover:shadow-md transition">
                    <button 
                      onClick={() => {
                        const updated = (adminSettings.merchantDeliveryAds || []).filter((_: any, i: number) => i !== index);
                        updateAdminSettings({ merchantDeliveryAds: updated });
                      }}
                      className="absolute top-2 left-2 p-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition z-10"
                    >
                      <Trash2 size={14} />
                    </button>
                    
                    <ImageUploader 
                      value={ad.url} 
                      onChange={(url) => {
                        const updated = [...(adminSettings.merchantDeliveryAds || [])];
                        updated[index].url = url;
                        updateAdminSettings({ merchantDeliveryAds: updated });
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
                          placeholder="شركة توصيل سريعة"
                          value={ad.title || ''} 
                          onChange={(e) => {
                            const updated = [...(adminSettings.merchantDeliveryAds || [])];
                            updated[index].title = e.target.value;
                            updateAdminSettings({ merchantDeliveryAds: updated });
                          }}
                          className="w-full border p-2 rounded-lg text-[10px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 mb-1">وصف قصير</label>
                        <input 
                          type="text" 
                          placeholder="توصيل بأفضل الأسعار"
                          value={ad.desc || ''} 
                          onChange={(e) => {
                            const updated = [...(adminSettings.merchantDeliveryAds || [])];
                            updated[index].desc = e.target.value;
                            updateAdminSettings({ merchantDeliveryAds: updated });
                          }}
                          className="w-full border p-2 rounded-lg text-[10px]"
                        />
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-slate-50">
                      <label className="block text-[9px] font-bold text-gray-400 mb-1">الرابط أو رقم الهاتف</label>
                      <input 
                        type="text" 
                        placeholder="https://... أو رقم هاتف"
                        value={ad.link || ''} 
                        onChange={(e) => {
                          const updated = [...(adminSettings.merchantDeliveryAds || [])];
                          updated[index].link = e.target.value;
                          updateAdminSettings({ merchantDeliveryAds: updated });
                        }}
                        className="w-full border p-2 rounded-lg text-[10px]"
                      />
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => {
                    const newAd = { 
                      id: 'delivery-ad-' + Date.now(), 
                      type: 'image', 
                      url: '', 
                      title: 'عنوان جديد', 
                      desc: 'أضف وصفاً هنا', 
                      link: '' 
                    };
                    updateAdminSettings({ merchantDeliveryAds: [...(adminSettings.merchantDeliveryAds || []), newAd] });
                  }}
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-[#9952FF] hover:border-[#e9daff] transition min-h-[250px]"
                >
                  <Plus size={24} />
                  <span className="text-xs font-bold mt-2">إضافة إعلان توصيل جديد</span>
                </button>
              </div>
            </div>

            {/* Media Ads */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mt-6 mb-6">
              <h3 className="font-bold text-slate-800 text-md mb-4 pb-2 border-b border-slate-100 flex items-center space-x-2 space-x-reverse">
                <Camera size={20} className="text-[#9952FF]" />
                <span>إعلانات تطبيق التاجر - شركات التصوير والإعلانات</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(adminSettings.merchantMediaAds || []).map((ad: any, index: number) => (
                  <div key={ad.id} className="p-4 border border-slate-100 rounded-2xl bg-white space-y-3 relative shadow-sm hover:shadow-md transition">
                    <button 
                      onClick={() => {
                        const updated = (adminSettings.merchantMediaAds || []).filter((_: any, i: number) => i !== index);
                        updateAdminSettings({ merchantMediaAds: updated });
                      }}
                      className="absolute top-2 left-2 p-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition z-10"
                    >
                      <Trash2 size={14} />
                    </button>
                    
                    <ImageUploader 
                      value={ad.url} 
                      onChange={(url) => {
                        const updated = [...(adminSettings.merchantMediaAds || [])];
                        updated[index].url = url;
                        updateAdminSettings({ merchantMediaAds: updated });
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
                          placeholder="شركة تصوير منتجات"
                          value={ad.title || ''} 
                          onChange={(e) => {
                            const updated = [...(adminSettings.merchantMediaAds || [])];
                            updated[index].title = e.target.value;
                            updateAdminSettings({ merchantMediaAds: updated });
                          }}
                          className="w-full border p-2 rounded-lg text-[10px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 mb-1">وصف قصير</label>
                        <input 
                          type="text" 
                          placeholder="تصوير احترافي بأسعار ممتازة"
                          value={ad.desc || ''} 
                          onChange={(e) => {
                            const updated = [...(adminSettings.merchantMediaAds || [])];
                            updated[index].desc = e.target.value;
                            updateAdminSettings({ merchantMediaAds: updated });
                          }}
                          className="w-full border p-2 rounded-lg text-[10px]"
                        />
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-slate-50">
                      <label className="block text-[9px] font-bold text-gray-400 mb-1">الرابط أو رقم الهاتف</label>
                      <input 
                        type="text" 
                        placeholder="https://... أو رقم هاتف"
                        value={ad.link || ''} 
                        onChange={(e) => {
                          const updated = [...(adminSettings.merchantMediaAds || [])];
                          updated[index].link = e.target.value;
                          updateAdminSettings({ merchantMediaAds: updated });
                        }}
                        className="w-full border p-2 rounded-lg text-[10px]"
                      />
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => {
                    const newAd = { 
                      id: 'media-ad-' + Date.now(), 
                      type: 'image', 
                      url: '', 
                      title: 'عنوان جديد', 
                      desc: 'أضف وصفاً هنا', 
                      link: '' 
                    };
                    updateAdminSettings({ merchantMediaAds: [...(adminSettings.merchantMediaAds || []), newAd] });
                  }}
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-[#9952FF] hover:border-[#e9daff] transition min-h-[250px]"
                >
                  <Plus size={24} />
                  <span className="text-xs font-bold mt-2">إضافة إعلان تصوير جديد</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            تاب إعدادات النظام
            ========================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in max-w-3xl">

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
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition flex items-center gap-2 ${adminSettings.featuredStoreIds?.includes(store.id) ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-white border-slate-200 text-slate-500 hover:border-[#cba8ff]'}`}
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
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border ${adminSettings.enableAutoNearby ? 'bg-[#9952FF] border-[#9952FF] text-white shadow-lg shadow-[#e9daff]' : 'bg-white border-slate-200 text-slate-500'}`}
                    >
                      <Zap size={14} fill={adminSettings.enableAutoNearby ? "currentColor" : "none"} />
                      <span className="text-[10px] font-black">{adminSettings.enableAutoNearby ? 'فرز تلقائي (حسب المسافة)' : 'تحكم يدوي (بالقائمة)'}</span>
                    </button>
                  </div>

                  {/* إعدادات الخرائط */}
                  <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-700">خرائط الموقع للطلبات</label>
                      <span className="text-[9px] text-slate-400 font-bold">تفعيل مصغرات الخريطة (Map) في تفاصيل الطلبات</span>
                    </div>
                    <button 
                      onClick={() => updateAdminSettings({ enableMaps: adminSettings.enableMaps === false ? true : false })}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border ${adminSettings.enableMaps !== false ? 'bg-[#9952FF] border-[#9952FF] text-white shadow-lg shadow-[#e9daff]' : 'bg-white border-slate-200 text-slate-500'}`}
                    >
                      <MapPin size={14} fill={adminSettings.enableMaps !== false ? "currentColor" : "none"} />
                      <span className="text-[10px] font-black">{adminSettings.enableMaps !== false ? 'مفعلة' : 'معطلة'}</span>
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
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition flex items-center gap-2 ${adminSettings.nearbyStoreIds?.includes(store.id) ? 'bg-[#f5eeff] border-[#e9daff] text-[#4D2980]' : 'bg-white border-slate-200 text-slate-500 hover:border-[#cba8ff]'}`}
                          >
                            <img src={store.logo || undefined} className="w-4 h-4 rounded-full" />
                            <span>{store.shopName}</span>
                            <span className="text-[8px] text-slate-400 opacity-70">@{store.username}</span>
                            {adminSettings.nearbyStoreIds?.includes(store.id) && <Check size={12} />}
                          </button>
                        ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-[#f5eeff]/50 rounded-2xl border border-[#e9daff]/50 text-center">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-[#e9daff] flex items-center justify-center mx-auto mb-2 text-[#9952FF]">
                        <MapPin size={20} />
                      </div>
                      <p className="text-[10px] font-black text-[#4D2980] mb-1">الفرز التلقائي مفعل ✅</p>
                      <p className="text-[9px] text-[#9952FF]/70 font-bold">سيقوم التطبيق بترتيب المتاجر تلقائياً للزبون بناءً على موقعه الجغرافي الفعلي.</p>
                    </div>
                  )}
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

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button 
                  onClick={handleExportSystem}
                  className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl hover:border-[#9952FF] hover:shadow-md transition group"
                >
                  <RefreshCw size={28} className="text-[#9952FF] group-hover:rotate-180 transition-transform duration-500" />
                  <span className="text-sm font-black text-slate-800 mt-2">تصدير قاعدة البيانات</span>
                  <span className="text-[10px] text-slate-400 mt-1">حفظ كل شيء في ملف واحد</span>
                </button>

                <button 
                  onClick={() => updateAdminSettings({ enableAutoBackup: !adminSettings.enableAutoBackup })}
                  className={`flex flex-col items-center justify-center p-6 bg-white border rounded-2xl hover:shadow-md transition group ${adminSettings.enableAutoBackup ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-500'}`}
                >
                  <Archive size={28} className={`${adminSettings.enableAutoBackup ? 'text-blue-600' : 'text-blue-400'} group-hover:scale-110 transition-transform`} />
                  <span className="text-sm font-black text-slate-800 mt-2">نسخ احتياطي تلقائي</span>
                  <span className="text-[10px] text-slate-500 mt-1 font-bold">{adminSettings.enableAutoBackup ? 'مفعل (يتم يومياً)' : 'غير مفعل'}</span>
                </button>

                <button 
                  onClick={() => systemBackupRef.current?.click()}
                  className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:shadow-md transition group"
                >
                  <Globe size={28} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-black text-slate-800 mt-2">استيراد قاعدة البيانات</span>
                  <span className="text-[10px] text-slate-400 mt-1">رفع ملف backup.json</span>
                </button>

                <button 
                  onClick={handleSeedDatabase}
                  disabled={seeding}
                  className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl hover:border-amber-500 hover:shadow-md transition group disabled:opacity-50"
                >
                  <Zap size={28} className={`text-amber-500 ${seeding ? 'animate-bounce' : 'group-hover:scale-110'} transition-transform`} />
                  <span className="text-sm font-black text-slate-800 mt-2">
                    {seeding ? 'جاري توليد البيانات...' : 'توليد قاعدة بيانات تجريبية'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">توليد متاجر ومنتجات عراقية تلقائياً</span>
                </button>

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
                  <span className="font-mono font-bold text-[#9952FF]">v2.0.0</span>
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

        {/* Modal: الفاتورة الإلكترونية المطورة في لوحة الادمن */}
        <AnimatePresence>
          {showInvoiceModal && selectedOrder && (
            <div className="fixed inset-0 bg-[#4D2980]/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* أزرار التحكم الفوقية */}
                <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                   <div className="flex gap-2">
                     <button
                        onClick={() => handleShareWhatsAppInvoice(selectedOrder)}
                        className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg hover:bg-emerald-600 transition-all flex items-center gap-2 text-xs font-black"
                     >
                       <MessageCircle size={18} />
                       <span>واتساب</span>
                     </button>
                     <button
                        onClick={handlePrint}
                        className="p-3 bg-[#9952FF] text-white rounded-2xl shadow-lg hover:bg-[#9952FF] transition-all flex items-center gap-2 text-xs font-black"
                     >
                       <Printer size={18} />
                       <span>طباعة</span>
                     </button>
                   </div>
                   <button
                    onClick={() => setShowInvoiceModal(false)}
                    className="p-3 bg-white text-slate-400 hover:text-rose-500 rounded-2xl shadow-sm border border-slate-100 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* محتوى الفاتورة القابل للطباعة */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-1">
                  <div 
                    ref={invoiceRef}
                    className="p-10 bg-white min-h-[600px] text-right font-sans"
                    dir="rtl"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-10 pb-6 border-b-2 border-slate-100">
                      <div>
                        {stores.find(s => s.id === selectedOrder.storeId)?.logo ? (
                          <img src={stores.find(s => s.id === selectedOrder.storeId)!.logo} className="w-20 h-20 rounded-2xl object-cover mb-4" alt="" />
                        ) : (
                          <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600 mb-4">
                            <StoreIcon size={40} />
                          </div>
                        )}
                        <h2 className="text-2xl font-black text-[#4D2980]">{stores.find(s => s.id === selectedOrder.storeId)?.shopName || selectedOrder.storeName}</h2>
                        <p className="text-xs font-bold text-slate-400 mt-1">متجركم المفضل</p>
                      </div>
                      <div className="text-left" dir="ltr">
                        <h1 className="text-4xl font-black text-slate-200 uppercase tracking-widest mb-4">INVOICE</h1>
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-slate-400 flex items-center justify-end gap-1">
                            <span>رقم الفاتورة: </span>
                            <span className="text-[#4D2980]">#{getOrderSeqId(selectedOrder.id)}</span>
                            <CopyButton text={getOrderSeqId(selectedOrder.id)} size={9} className="print:hidden" />
                          </div>
                          <p className="text-[10px] font-black text-slate-400">التاريخ: <span className="text-[#4D2980]">{formatSafeDateTimeString(selectedOrder.createdAt, 'ar-IQ', { dateStyle: 'short', timeStyle: 'short' })}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Customer & Merchant Details */}
                    <div className="grid grid-cols-2 gap-8 mb-10">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-3 border-r-4 border-slate-500 pr-3">مستلم الفاتورة:</p>
                        <p className="text-sm font-black text-[#4D2980] mb-1 flex items-center gap-1">
                          <span>{selectedOrder.customerName}</span>
                          <CopyButton text={selectedOrder.customerName} size={10} className="print:hidden" />
                        </p>
                        <p className="text-[10px] font-mono text-purple-600 mb-1 select-all inline-flex items-center gap-1">
                          <span>ID: #{getCustomerSeqId(selectedOrder.customerId)}</span>
                          <CopyButton text={getCustomerSeqId(selectedOrder.customerId)} size={9} className="print:hidden" />
                        </p>
                        <p className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                          <span>{selectedOrder.customerPhone}</span>
                          <CopyButton text={selectedOrder.customerPhone} size={9} className="print:hidden" />
                        </p>
                        <p className="text-xs font-bold text-slate-400 leading-relaxed italic mb-2">{selectedOrder.customerProvince} - {selectedOrder.customerAddress}</p>
                        {(selectedOrder as any).customerLat && (selectedOrder as any).customerLng && (
                          <div className="flex gap-2">
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${(selectedOrder as any).customerLat},${(selectedOrder as any).customerLng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[9px] font-black bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                            >
                              <MapPin size={12} className="text-red-500" />
                              خرائط جوجل
                            </a>
                            <a 
                              href={`https://waze.com/ul?ll=${(selectedOrder as any).customerLat},${(selectedOrder as any).customerLng}&navigate=yes`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[9px] font-black bg-[#f2fcfed9] border border-[#c2f2ff] text-[#00a9e0] px-2 py-1 rounded-lg shadow-sm hover:bg-[#e6faff] transition-colors"
                            >
                              <Car size={12} />
                              ويز (Waze)
                            </a>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-3 border-r-4 border-slate-200 pr-3">المصدر:</p>
                        <p className="text-sm font-black text-[#4D2980] mb-1">{stores.find(s => s.id === selectedOrder.storeId)?.shopName || selectedOrder.storeName}</p>
                        <p className="text-xs font-bold text-slate-500 mb-1">{stores.find(s => s.id === selectedOrder.storeId)?.phone}</p>
                        <p className="text-xs font-bold text-slate-400">{stores.find(s => s.id === selectedOrder.storeId)?.province} - {stores.find(s => s.id === selectedOrder.storeId)?.area}</p>
                      </div>
                    </div>

                    {/* Items Table */}
                    <table className="w-full mb-10">
                      <thead>
                        <tr className="bg-slate-50 text-right">
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase rounded-r-2xl text-right">المنتج</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">الكمية</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">السعر</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-left rounded-l-2xl text-left">المجموع</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {selectedOrder.items?.map((item: any, idx: number) => (
                          <tr key={idx} className="group">
                            <td className="p-4">
                              <p className="text-xs font-black text-slate-700">{item.productName}</p>
                            </td>
                            <td className="p-4 text-center">
                              <span className="text-xs font-black text-slate-500">{item.quantity}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="text-xs font-bold text-slate-500">{item.price?.toLocaleString()} د.ع</span>
                            </td>
                            <td className="p-4 text-left">
                              <span className="text-xs font-black text-[#4D2980]">{(item.price * item.quantity).toLocaleString()} د.ع</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Totals & QR */}
                    <div className="flex justify-between items-end border-t-2 border-slate-50 pt-10">
                      <div className="flex flex-col items-center gap-2">
                        <QRCodeSVG 
                          value={JSON.stringify({ 
                            id: selectedOrder.id, 
                            store: stores.find(s => s.id === selectedOrder.storeId)?.shopName || selectedOrder.storeName,
                            total: selectedOrder.total,
                            date: selectedOrder.createdAt 
                          })}
                          size={100}
                          level="H"
                          includeMargin={true}
                        />
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Scan for E-Invoice</p>
                      </div>
                      
                      <div className="w-64 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-400">المجموع الفرعي:</span>
                          <span className="font-black text-slate-600">{(selectedOrder.subtotal || 0).toLocaleString()} د.ع</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-400">سعر التوصيل:</span>
                          <span className="font-black text-slate-600">{(selectedOrder.deliveryPrice || 0).toLocaleString()} د.ع</span>
                        </div>
                        {selectedOrder.discountAmount > 0 && (
                          <div className="flex justify-between items-center text-xs text-emerald-600">
                            <span className="font-bold">خصم الكود:</span>
                            <span className="font-black">- {selectedOrder.discountAmount.toLocaleString()} د.ع</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center p-4 bg-[#9952FF] rounded-2xl text-white shadow-xl shadow-slate-100">
                          <span className="text-xs font-black uppercase">الإجمالي النهائي:</span>
                          <span className="text-lg font-black">{(selectedOrder.total || 0).toLocaleString()} د.ع</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Note */}
                    <div className="mt-16 text-center">
                      <p className="text-[10px] font-bold text-slate-400 italic">نأمل رؤيتكم مرة أخرى قريباً.</p>
                      <div className="w-16 h-1 bg-slate-100 mx-auto mt-4 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* مودال إدارة الأوسمة */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-[#4D2980]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
        <div className="fixed inset-0 bg-[#4D2980]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-in">
            <div className="bg-[#9952FF] p-4 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2">
                <Clock size={18} className="text-[#b07aff]" />
                تعديل مواعيد الفعالية
              </h3>
              <button onClick={() => setEditFlashSaleDatesModal(null)} className="bg-white/10 p-1.5 rounded-lg hover:bg-white/20 transition">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-slate-500 text-sm font-bold text-center mb-4 truncate text-[#9952FF] bg-[#f5eeff] p-2 rounded-lg">{editFlashSaleDatesModal.name}</p>
              
              <div className="space-y-4 text-right">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">وقت البدء الجديد</label>
                  <input 
                    type="datetime-local" 
                    className="w-full p-3 bg-slate-50 rounded-xl border focus:border-[#9952FF] outline-none transition font-mono text-sm text-left"
                    value={editFlashSaleDatesModal.start}
                    onChange={(e) => setEditFlashSaleDatesModal(prev => prev ? { ...prev, start: e.target.value } : null)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">وقت الانتهاء الجديد</label>
                  <input 
                    type="datetime-local" 
                    className="w-full p-3 bg-slate-50 rounded-xl border focus:border-[#9952FF] outline-none transition font-mono text-sm text-left"
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
                  className="flex-1 py-3 bg-[#9952FF] text-white font-bold rounded-xl shadow-lg hover:bg-[#4D2980] transition"
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
        <div className="fixed inset-0 bg-[#4D2980]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-in">
            <div className="bg-[#9952FF] p-4 flex justify-between items-center text-white">
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
                        isSelected ? 'bg-[#f5eeff] border-[#e9daff]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        className="w-5 h-5 rounded text-[#9952FF] focus:ring-0"
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
                  className="w-full py-3 bg-[#9952FF] text-white font-bold rounded-xl shadow-lg hover:bg-[#4D2980] transition"
                >
                  حفظ الأوسمة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* مودال تأكيد حذف الريلز */}
      {reelToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-scale-in border border-slate-100 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center shadow-inner">
              <Trash size={32} />
            </div>
            <h3 className="font-black text-slate-800 text-lg">تأكيد حذف الريلز</h3>
            <p className="text-sm font-bold text-slate-600">هل أنت متأكد من رغبتك في حذف هذا الريلز؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-2 w-full pt-2">
              <button
                onClick={async () => {
                  try {
                    await deleteDoc(doc(db, 'reels', reelToDelete));
                    setReelToDelete(null);
                  } catch (error) {
                    alert('حدث خطأ أثناء الحذف: ' + error);
                  }
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition shadow-md shadow-red-500/20"
              >
                تأكيد الحذف
              </button>
              <button
                onClick={() => setReelToDelete(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition border border-slate-200"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال إضافة فعالية جديدة */}
      {showFlashSaleModal && (
        <div className="fixed inset-0 bg-[#4D2980]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in">
            <div className="bg-[#9952FF] p-4 flex justify-between items-center text-white">
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-[#9952FF] focus:ring-1 focus:ring-[#9952FF] transition"
                  placeholder="حدث تخفيضات الشتاء..."
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">وصف الفعالية (اختياري)</label>
                <textarea 
                  value={newFlashSaleForm.description}
                  onChange={e => setNewFlashSaleForm(prev => ({...prev, description: e.target.value}))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-[#9952FF] focus:ring-1 focus:ring-[#9952FF] transition resize-none"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-[#9952FF] focus:ring-1 focus:ring-[#9952FF] transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">تاريخ وسائعة الانتهاء</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={newFlashSaleForm.endDate}
                    onChange={e => setNewFlashSaleForm(prev => ({...prev, endDate: e.target.value}))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-[#9952FF] focus:ring-1 focus:ring-[#9952FF] transition"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-2 space-x-reverse">
                <button type="button" onClick={() => setShowFlashSaleModal(false)} className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition text-sm">
                  إلغاء
                </button>
                <button type="submit" className="px-5 py-2.5 bg-[#9952FF] text-white font-bold rounded-xl shadow-lg shadow-[#e9daff] hover:bg-[#4D2980] transition flex items-center space-x-2 space-x-reverse text-sm">
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
