import React, { useState } from 'react';
import { useApp } from '../context/useApp';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ShoppingBag, User, Phone, MapPin, CheckCircle, AlertCircle, ShoppingCart, Loader2 } from 'lucide-react';
import { Product, Store } from '../types';

// Helper functions placed outside the component to preserve purity
const generateOrderId = (customerId: string | undefined): { orderId: string; customerIdVal: string } => {
  const now = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  return {
    orderId: 'order_reels_' + now + '_' + rand,
    customerIdVal: customerId || 'guest_reels_' + now
  };
};

const generateNotifId = (): string => {
  return 'notif_' + Date.now();
};

interface ProductOverlayProps {
  product: Product;
  merchantId: string; // The store/merchant ID
  storeDetails?: Store | null;
  onOrderSuccess?: () => void;
}

export const ProductOverlay: React.FC<ProductOverlayProps> = ({
  product,
  merchantId,
  storeDetails,
  onOrderSuccess
}) => {
  const { currentCustomer, stores } = useApp();
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: currentCustomer?.name || '',
    phone: currentCustomer?.phone || '',
    province: currentCustomer?.province || 'بغداد',
    address: currentCustomer?.address || '',
  });

  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasDiscount = product.discountType && product.discountType !== 'none' && product.discountValue > 0;
  const storeInstance = storeDetails || stores.find(s => s.id === merchantId);

  // Quick Order Action via COD
  const handleQuickCODOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name.trim()) {
      setError("الرجاء إدخال اسم المستلم بالكامل.");
      return;
    }
    if (!customerForm.phone.trim() || customerForm.phone.trim().length < 10) {
      setError("الرجاء إدخال رقم هاتف هاتف عراقي صالح (10+ أرقام).");
      return;
    }
    if (!customerForm.address.trim()) {
      setError("الرجاء تحديد عنوان السكن/التوصيل بالتفصيل.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Generate unique order ID using pure helper defined outside
      const { orderId, customerIdVal } = generateOrderId(currentCustomer?.id);
      
      // Calculate final prices and delivery
      const itemSubtotal = product.finalPrice;
      const deliveryPrice = storeInstance?.deliveryPrice || 0;
      const totalCost = itemSubtotal + deliveryPrice;

      // Make sure we include all properties matching the requested and existing order collections schema
      const newOrderData: any = {
        id: orderId,
        orderId: orderId, // requested field
        productId: product.id, // requested field
        merchantId: merchantId, // requested field
        storeId: merchantId,
        storeName: storeInstance?.shopName || 'متجر ريلز',
        customerId: customerIdVal,
        customerName: customerForm.name,
        customerPhone: customerForm.phone,
        customerAddress: customerForm.address,
        customerProvince: customerForm.province,
        customerInfo: { // requested field
          name: customerForm.name,
          phone: customerForm.phone,
          address: customerForm.address,
          province: customerForm.province,
          device: navigator.userAgent
        },
        items: [
          {
            id: product.id,
            productId: product.id,
            name: product.name,
            price: product.price,
            discountType: product.discountType,
            discountValue: product.discountValue,
            finalPrice: product.finalPrice,
            image: product.image,
            quantity: 1
          }
        ],
        subtotal: itemSubtotal,
        deliveryPrice: deliveryPrice,
        discountAmount: product.price - product.finalPrice,
        total: totalCost,
        status: 'pending', // requested: 'Pending'
        createdAt: serverTimestamp() // server authoritative timestamp
      };

      // Create new Order document in Firestore under '/orders' collection
      await setDoc(doc(db, 'orders', orderId), newOrderData);

      // Create a merchant notification
      try {
        const notifId = generateNotifId();
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          userId: merchantId,
          role: 'merchant',
          title: 'طلب ريلز جديد! 🎬🛍️',
          message: `طلب زبون جديد من مقطع الفيديو الخاص بـ: ${product.name}. بقيمة إجمالية ${totalCost} د.ع.`,
          read: false,
          createdAt: serverTimestamp(),
          type: 'order',
          targetId: orderId
        });
      } catch (notifErr) {
        console.error("Failed to generate merchant notification:", notifErr);
      }

      setOrderSuccess(true);
      setTimeout(() => {
        setIsClosing();
      }, 3500);

    } catch (err: any) {
      console.error("Direct reels COD ordering error:", err);
      setError("فشل تسجيل الطلب الإقتراحي. يرجى تكرار المحاولة في غضون لحظات.");
    } finally {
      setLoading(false);
    }
  };

  const setIsClosing = () => {
    setShowCheckoutModal(false);
    setOrderSuccess(false);
    if (onOrderSuccess) onOrderSuccess();
  };

  return (
    <>
      <div className="absolute bottom-16 left-4 right-4 bg-slate-950/70 backdrop-blur-md rounded-3xl p-4 border border-white/10 text-white z-40 flex flex-col justify-between gap-4 animate-fade-in font-tajawal shadow-2xl">
        {/* Row 1: Item specs */}
        <div className="flex gap-3 justify-between items-start">
          <div className="flex gap-2.5 items-center">
            {product.image && (
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-12 h-12 object-cover rounded-xl border border-white/20 shadow-md"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="max-w-[190px] sm:max-w-xs">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md inline-block mb-1">
                توصيل سريع بالدفع COD
              </span>
              <h4 className="text-xs sm:text-sm font-black text-white truncate drop-shadow-md leading-tight">
                {product.name}
              </h4>
              <p className="text-[10px] text-slate-300 font-bold mt-0.5 truncate max-w-[180px]">
                المتجر: {storeInstance?.shopName || 'جاري التحميل...'}
              </p>
            </div>
          </div>

          <div className="text-left shrink-0">
            {hasDiscount ? (
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-white/50 line-through font-bold">
                  {product.price.toLocaleString()} د.ع
                </span>
                <span className="text-[#00AA4F] text-xs sm:text-sm font-black drop-shadow-md">
                  {product.finalPrice.toLocaleString()} د.ع
                </span>
              </div>
            ) : (
              <span className="text-[#00AA4F] text-xs sm:text-sm font-black drop-shadow-md">
                {product.price.toLocaleString()} د.ع
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <button
          onClick={() => setShowCheckoutModal(true)}
          className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-amber-500/10 active:scale-[0.97] transition-all"
        >
          <ShoppingCart size={16} />
          <span>اطلب الآن ودفع عند الاستلام (COD)</span>
        </button>
      </div>

      {/* Slide-Up Checkout Bottom Sheets/Modals */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[160] flex items-end justify-center animate-fade-in" dir="rtl">
          <div className="bg-white rounded-t-[2.5rem] w-full max-w-lg p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-slide-up pb-10 shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-500">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-850 font-tajawal">شراء فوري مباشر</h3>
                  <p className="text-[10px] text-slate-400 font-bold">الدفع كاش عند الاستلام وسريع التوصيل</p>
                </div>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition active:scale-90"
              >
                ✕
              </button>
            </div>

            {orderSuccess ? (
              <div className="py-6 flex flex-col items-center text-center space-y-4 font-tajawal">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center animate-bounce">
                  <CheckCircle size={36} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-black text-slate-800">تم تسجيل طلبك بنجاح! 🎉</h4>
                  <p className="text-xs text-slate-500 font-medium">سيتواصل معك متجر <strong className="text-[#9952FF]">{storeInstance?.shopName}</strong> لتأكيد الشحن الفوري.</p>
                </div>
                <p className="text-xs text-slate-400 font-bold bg-slate-50 px-4 py-1.5 rounded-xl">سيتم العودة لمشاهدة المقطع خلال ثوانٍ...</p>
              </div>
            ) : (
              <form onSubmit={handleQuickCODOrder} className="space-y-4 font-tajawal">
                
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-[11px] font-bold flex items-start gap-1.5">
                    <AlertCircle size={14} className="text-rose-600 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Sub-item review */}
                <div className="bg-slate-50 p-3 rounded-2xl flex justify-between items-center text-xs">
                  <div className="flex gap-2 items-center">
                    {product.image && (
                      <img src={product.image} className="w-10 h-10 object-cover rounded-lg border border-slate-200" referrerPolicy="no-referrer" alt="" />
                    )}
                    <div className="font-bold">
                      <p className="text-slate-800 truncate max-w-[150px]">{product.name}</p>
                      <p className="text-[10px] text-slate-400 font-normal">شحن بواسطة: {storeInstance?.shopName}</p>
                    </div>
                  </div>
                  <div className="text-left font-extrabold text-[#00AA4F]">
                    {product.finalPrice.toLocaleString()} د.ع
                  </div>
                </div>

                {/* Receiver Info */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                      <User size={12} className="text-indigo-500" />
                      <span>اسم المستلم بالكامل <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="text"
                      value={customerForm.name}
                      onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                      placeholder="امجد احمد محمد"
                      className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs sm:text-sm font-bold focus:ring-4 focus:ring-[#9952FF]/5 focus:border-[#9952FF] outline-none transition"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                      <Phone size={12} className="text-emerald-500" />
                      <span>رقم الهاتف <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="tel"
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value.replace(/\D/g, '') })}
                      placeholder="077XXXXXXXX"
                      className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs sm:text-sm font-bold text-left tracking-widest focus:ring-4 focus:ring-[#9952FF]/5 focus:border-[#9952FF] outline-none transition"
                      required
                    />
                  </div>

                  {/* Province Selection */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                        <MapPin size={12} className="text-rose-500" />
                        <span>المحافظة <span className="text-rose-500">*</span></span>
                      </label>
                      <select
                        value={customerForm.province}
                        onChange={(e) => setCustomerForm({ ...customerForm, province: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs font-bold focus:ring-4 focus:ring-[#9952FF]/5 focus:border-[#9952FF] outline-none transition"
                      >
                        {['بغداد', 'البصرة', 'نينوى', 'أربيل', 'النجف', 'كربلاء', 'بابل', 'الأنبار', 'كركوك', 'ديالى', 'واسط', 'ميسان', 'القادسية', 'المثنى', 'ذي قار', 'صلاح الدين', 'دهوك', 'السليمانية'].map(prov => (
                          <option key={prov} value={prov}>{prov}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                        <MapPin size={12} className="text-pink-500" />
                        <span>العنوان والتفاصيل <span className="text-rose-500">*</span></span>
                      </label>
                      <input
                        type="text"
                        value={customerForm.address}
                        onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                        placeholder="المنطقة، قرب المعلم الشهير"
                        className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs font-bold focus:ring-4 focus:ring-[#9952FF]/5 focus:border-[#9952FF] outline-none transition"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Complete Order */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#00AA4F] hover:bg-[#009143] text-white font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/10 active:scale-[0.97] transition-all cursor-pointer mt-4"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-white" />
                      <span>جاري تأكيد وتسجيل طلبك...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      <span>تأكيد الشراء الفوري (دفع عند الاستلام) 📦</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
