import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useApp } from '../../context/useApp';
import { Product, Store, Customer } from '../../types';
import { STORE_CATEGORIES, STORE_BADGES } from '../../constants';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, Heart, Wallet, User, Users, Search, MapPin, Home,  Phone, Plus, Minus, Check, X, ClipboardList, Share2, Camera,
  Gift, Award, Bell, ShieldAlert, Store as StoreIcon, Trash2, LogOut,
  Ticket, Copy, Shield, Zap, ChevronRight, ChevronLeft, ShoppingCart, LayoutGrid, Sparkles, Shirt, ChevronDown, Star, Clock, CheckCircle, AlertCircle, AlertTriangle, Info, BellOff, Calendar, Lock, MessageCircle, RefreshCw, Send,
  Smartphone, Laptop, Tv, Lightbulb, Bed, Hammer, Car, Bike, BookOpen, Dumbbell, Gem, Candy, Flower2, Briefcase, Beef, Pill
} from 'lucide-react';
import { sendOTP } from '../../services/otpService';
import { LocationPicker } from '../../components/LocationPicker';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { ReelsFeed } from '../../components/ReelsFeed';
import { ReelsProfileList } from '../../components/ReelsProfileList';
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

import { showLocalNotification, requestNotificationPermission, setupPushNotifications } from '../../lib/pushNotifications';
import { formatSafeDate, formatSafeTimeString, formatSafeDateTimeString } from '../../utils/date';

const notificationSound = new Audio(
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
);

const CATEGORY_SHORT_NAMES: Record<string, string> = {
  all: 'الكل',
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

// Helper to provide specific, appropriate icons for each of the 19 categories
const getCategoryIcon = (catId: string, isSelected: boolean, size = 14) => {
  const iconSize = size;
  const colorClass = isSelected ? "text-white" : "text-[#9952FF]";
  
  switch (catId) {
    case 'all':
      return <ShoppingBag size={iconSize} className={colorClass} />;
    case 'supermarket':
      return <ShoppingCart size={iconSize} className={colorClass} />;
    case 'meats':
      return <Beef size={iconSize} className={colorClass} />;
    case 'sweets':
      return <Candy size={iconSize} className={colorClass} />;
    case 'clothing':
      return <Shirt size={iconSize} className={colorClass} />;
    case 'shoes_bags':
      return <Briefcase size={iconSize} className={colorClass} />;
    case 'cosmetics':
      return <Sparkles size={iconSize} className={colorClass} />;
    case 'watches_jewelry':
      return <Gem size={iconSize} className={colorClass} />;
    case 'mobiles':
      return <Smartphone size={iconSize} className={colorClass} />;
    case 'computers':
      return <Laptop size={iconSize} className={colorClass} />;
    case 'appliances':
      return <Tv size={iconSize} className={colorClass} />;
    case 'power':
      return <Lightbulb size={iconSize} className={colorClass} />;
    case 'furniture':
      return <Bed size={iconSize} className={colorClass} />;
    case 'building_materials':
      return <Hammer size={iconSize} className={colorClass} />;
    case 'car_parts':
      return <Car size={iconSize} className={colorClass} />;
    case 'motorcycles':
      return <Bike size={iconSize} className={colorClass} />;
    case 'stationary':
      return <BookOpen size={iconSize} className={colorClass} />;
    case 'flowers':
      return <Flower2 size={iconSize} className={colorClass} />;
    case 'sports':
      return <Dumbbell size={iconSize} className={colorClass} />;
    case 'pharmacy':
      return <Pill size={iconSize} className={colorClass} />;
    default:
      return <Sparkles size={iconSize} className={colorClass} />;
  }
};

// ==========================================
// مكون زر إلغاء الطلب بفترة سماح 30 ثانية
// ==========================================
interface CancelOrderButtonProps {
  order: any;
  onCancelClick: (order: any) => void;
}

const CancelOrderButton: React.FC<CancelOrderButtonProps> = ({ order, onCancelClick }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const checkTime = () => {
      if (order.status !== 'pending') {
        setTimeLeft(0);
        return;
      }
      
      let orderTime: number;
      if (order.createdAt) {
        if (typeof order.createdAt.toDate === 'function') {
          orderTime = order.createdAt.toDate().getTime();
        } else if (typeof order.createdAt.seconds === 'number') {
          orderTime = order.createdAt.seconds * 1000;
        } else {
          orderTime = new Date(order.createdAt).getTime();
        }
      } else {
        orderTime = Date.now();
      }

      const elapsed = Math.floor((Date.now() - orderTime) / 1000);
      const remaining = 30 - elapsed;
      setTimeLeft(remaining > 0 ? remaining : 0);
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [order]);

  if (order.status !== 'pending' || timeLeft <= 0) return null;

  return (
    <button
      onClick={() => onCancelClick(order)}
      className="mt-4 w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-2xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
    >
      <Clock size={12} className="animate-pulse" />
      <span>إلغاء الطلب (متاح لـ {timeLeft} ثانية)</span>
    </button>
  );
};

// ==========================================
// تطبيق الزبون - منصة محلك (Customer App)
// ==========================================

export const CustomerApp: React.FC = () => {
  const { 
    currentCustomer, setCurrentCustomer, registerCustomer, updateCustomerProfile,
    stores, products: rawProducts, promoCodes, orders, placeOrder, toggleFollowStore, toggleStoreNotification,
    notifications, markNotificationAsRead, markAllNotificationsAsRead, convertPointsToPromo,
    customers, provinces, addCustomerPoints, adminSettings, submitStoreReview, storeReviews,
    flashSales, flashSaleRequests,
    redeemRechargeCode, seedDatabase, updateOrderStatus
  } = useApp();

  const products = useMemo(() => {
    const activeFlashSales = flashSales.filter(f => f.status === 'active' || (f.status === 'upcoming' && new Date() >= new Date(f.startTime) && new Date() < new Date(f.endTime)));
    if (activeFlashSales.length === 0) return rawProducts;

    return rawProducts.map(p => {
      const activeRequests = flashSaleRequests.filter(r => 
        r.productId === p.id && 
        r.status === 'approved' && 
        activeFlashSales.some(f => f.id === r.flashSaleId)
      );

      if (activeRequests.length > 0) {
        const promoPrice = Math.min(...activeRequests.map(r => r.promotionalPrice));
        // We override finalPrice so everywhere in cart and UI it honors the flash sale price
        return { 
          ...p, 
          finalPrice: promoPrice, 
          discountType: 'amount' as const, 
          discountValue: p.price - promoPrice 
        };
      }
      return p;
    });
  }, [rawProducts, flashSales, flashSaleRequests]);

  // واجهات الزبون: دخول، تسجيل، OTP، لوحة التطبيق
  const [view, setView] = useState<'login' | 'signup' | 'otp' | 'forgot' | 'dashboard'>('login');
  
  // التابات النشطة في الـ Dashboard
  const [activeTab, setActiveTab] = useState<'stores' | 'merchants' | 'orders' | 'wallet' | 'profile'>('stores');
  
  // تتبع الطلب المحدد من الإشعارات
  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);

  // تتبع الطلب المراد إلغاؤه من قبل الزبون
  const [orderToCancel, setOrderToCancel] = useState<any | null>(null);
  
  // إدارة التصفح داخل المتجر المختار
  const [selectedStore, setRawSelectedStore] = useState<Store | null>(null);
  const lastScrollY = useRef(0);
  const selectedStoreRef = useRef<Store | null>(null);

  const setSelectedStore = useCallback((store: Store | null) => {
    if (store) {
      if (!selectedStoreRef.current) {
        lastScrollY.current = window.scrollY;
      }
      selectedStoreRef.current = store;
      setRawSelectedStore(store);
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 0); // Scroll to top when opening store
    } else {
      selectedStoreRef.current = null;
      setRawSelectedStore(null);
      // Ensure the DOM has a moment to render the previous list before scrolling
      setTimeout(() => {
        window.scrollTo({ top: lastScrollY.current, behavior: 'instant' });
      }, 50);
    }
  }, []);

  const uniqueStores = useMemo(() => {
    const map = new Map<string, Store>();
    stores.filter(s => !s.isBanned).forEach(s => {
      const key = s.phone || s.shopName;
      if (!map.has(key)) {
        map.set(key, s);
      } else {
        if (s.status === 'active' && map.get(key)?.status !== 'active') {
          map.set(key, s);
        }
      }
    });
    return Array.from(map.values());
  }, [stores]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const [selectedProductTag, setSelectedProductTag] = useState<string>('');
  const [showFullFeatured, setShowFullFeatured] = useState(false);
  const [showFullNearby, setShowFullNearby] = useState(false);
  const [showFullVerified, setShowFullVerified] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  
  // السلة (Cart)
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{ id: string; code: string; discountValue: number } | null>(null);
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');

  // تفاصيل المنتج المفتوح
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);
  const [detailQty, setDetailQty] = useState(1);

  // نظام المشاركة المطور
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareConfig, setShareConfig] = useState<{ type: 'store' | 'product'; data: any } | null>(null);
  const [shareText, setShareText] = useState('');

  // نظام التقييم
  const [showRateModal, setShowRateModal] = useState<{ type: 'store' | 'product'; data: any } | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewMessage, setReviewMessage] = useState('');
  
  // تأكيد الاستبدال
  const [showRedeemConfirm, setShowRedeemConfirm] = useState<number | null>(null);

  // تعديل العنوان السريع من السلة

  // بيانات تسجيل الدخول العادية (لأغراض العرض)
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [sentOtpCode, setSentOtpCode] = useState(''); // الرمز الفعلي المرسل (للتحقق)
  const [otpMode, setOtpMode] = useState<'signup' | 'forgot'>('signup');
  const [pendingCustomerData, setPendingCustomerData] = useState<null | { name: string; phone: string; password: string; province: string; address: string; lat?: number; lng?: number }>(null);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');

  // بيانات التسجيل الكاملة
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custPassword, setCustPassword] = useState('');
  const [custProvince, setCustProvince] = useState('بغداد');
  const [custArea, setCustArea] = useState(''); // المنطقة / الحي
  const [custMahalla, setCustMahalla] = useState('');
  const [custZuqaq, setCustZuqaq] = useState('');
  const [custDar, setCustDar] = useState('');
  const [custLandmark, setCustLandmark] = useState(''); // أقرب نقطة دالة
  const [custLat, setCustLat] = useState<number | undefined>(undefined);
  const [custLng, setCustLng] = useState<number | undefined>(undefined);

  const [showNotifications, setShowNotifications] = useState(false);
  const [walletView, setWalletView] = useState<'points' | 'gifts'>('points');
  const [promoCode, setPromoCode] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // ==========================================
  // نظام التزامن مع تاريخ المتصفح لدعم رجوع الأندرويد وإيماءات اليد
  // ==========================================
  const isPopStateRef = React.useRef(false);

  const getHashUrl = (state: any) => {
    let sub = '';
    if (state.view === 'login') sub = '/login';
    else if (state.view === 'signup') sub = '/signup';
    else if (state.view === 'otp') sub = '/otp';
    else if (state.view === 'forgot') sub = '/forgot';
    else if (state.view === 'dashboard') {
      if (state.selectedStoreId) {
        if (state.selectedProductDetailId) {
          sub = `/store/${state.selectedStoreId}/product/${state.selectedProductDetailId}`;
        } else {
          sub = `/store/${state.selectedStoreId}`;
        }
      } else if (state.showCart) {
        sub = '/cart';
      } else if (state.showNotifications) {
        sub = '/notifications';
      } else {
        sub = `/${state.activeTab}`;
      }
    }
    return `#/customer${sub}`;
  };

  const parseHashToState = (hash: string) => {
    const path = hash.replace('#/customer', '');
    const parts = path.split('/').filter(Boolean);
    
    const state: any = {
      view: 'dashboard',
      activeTab: 'stores',
      selectedStoreId: null,
      selectedProductDetailId: null,
      showCart: false,
      showNotifications: false
    };

    if (parts[0] === 'login') {
      state.view = 'login';
    } else if (parts[0] === 'signup') {
      state.view = 'signup';
    } else if (parts[0] === 'otp') {
      state.view = 'otp';
    } else if (parts[0] === 'forgot') {
      state.view = 'forgot';
    } else if (parts[0] === 'store') {
      state.view = 'dashboard';
      state.selectedStoreId = parts[1] || null;
      if (parts[2] === 'product') {
        state.selectedProductDetailId = parts[3] || null;
      }
    } else if (parts[0] === 'cart') {
      state.view = 'dashboard';
      state.showCart = true;
    } else if (parts[0] === 'notifications') {
      state.view = 'dashboard';
      state.showNotifications = true;
    } else if (parts[0]) {
      state.view = 'dashboard';
      state.activeTab = parts[0] as any;
    }
    return state;
  };

  React.useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state || parseHashToState(window.location.hash);
      if (state && (state.isAppNav || window.location.hash.startsWith('#/customer'))) {
        isPopStateRef.current = true;

        if (state.view !== undefined && state.view !== view) {
          setView(state.view);
        }
        if (state.activeTab !== undefined && state.activeTab !== activeTab) {
          setActiveTab(state.activeTab);
        }
        
        // المتجر المختار
        if (state.selectedStoreId) {
          const foundStore = uniqueStores.find(s => s.id === state.selectedStoreId) || null;
          setSelectedStore(foundStore);
        } else {
          setSelectedStore(null);
        }

        // تفاصيل المنتج المختار
        if (state.selectedProductDetailId) {
          const foundProduct = products.find(p => p.id === state.selectedProductDetailId) || null;
          setSelectedProductDetail(foundProduct);
        } else {
          setSelectedProductDetail(null);
        }

        // السلة والتنبيهات
        if (state.showCart !== undefined) {
          setShowCart(state.showCart);
        }
        if (state.showNotifications !== undefined) {
          setShowNotifications(state.showNotifications);
        }

        setTimeout(() => {
          isPopStateRef.current = false;
        }, 50);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [view, activeTab, uniqueStores, products]);

  React.useEffect(() => {
    if (isPopStateRef.current) return;

    const currentState = {
      isAppNav: true,
      view,
      activeTab,
      selectedStoreId: selectedStore?.id || null,
      selectedProductDetailId: selectedProductDetail?.id || null,
      showCart,
      showNotifications
    };

    const hashUrl = getHashUrl(currentState);
    const historyState = window.history.state;
    if (historyState && historyState.isAppNav) {
      const isSame = 
        historyState.view === currentState.view &&
        historyState.activeTab === currentState.activeTab &&
        historyState.selectedStoreId === currentState.selectedStoreId &&
        historyState.selectedProductDetailId === currentState.selectedProductDetailId &&
        historyState.showCart === currentState.showCart &&
        historyState.showNotifications === currentState.showNotifications;

      if (!isSame) {
        window.history.pushState(currentState, "", hashUrl);
      }
    } else {
      window.history.replaceState({ ...currentState, isInitial: true }, "", hashUrl);
    }
  }, [view, activeTab, selectedStore, selectedProductDetail, showCart, showNotifications]);

  // نظام التتبع والموقع
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // حساب المسافة (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const requestLocation = React.useCallback(() => {
    localStorage.setItem('location_requested', 'true');
    setShowLocationModal(false);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserCoords(coords);
        console.log('📍 User location obtained:', coords);
      },
      (error) => {
        console.error('❌ Error getting location:', error);
        if (currentCustomer?.lat && currentCustomer?.lng) {
          setUserCoords({ lat: currentCustomer.lat, lng: currentCustomer.lng });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [currentCustomer]);

  // طلب الموقع عند الدخول
  useEffect(() => {
    if (view === 'dashboard' && 'geolocation' in navigator) {
      const hasPermissionBefore = localStorage.getItem('location_requested') === 'true';
      
      if (!hasPermissionBefore) {
        Promise.resolve().then(() => setShowLocationModal(true));
      } else {
        setTimeout(() => requestLocation(), 0);
      }
    }
  }, [view, requestLocation]);

  useEffect(() => {
    if (currentCustomer) {
      const updatedCustomer = customers.find(c => c.id === currentCustomer.id);
      if (!updatedCustomer) {
        setTimeout(() => {
          setCurrentCustomer(null);
          setView('login');
          setLoginError('تم حذف حسابك.');
        }, 0);
      } else if (updatedCustomer.isBlocked) {
        setTimeout(() => {
          setCurrentCustomer(null);
          setView('login');
          setLoginError('⚠️ عذراً، لقد تم حظر حسابك من قبل إدارة النظام.');
        }, 0);
      }
    }
  }, [customers, currentCustomer, setCurrentCustomer]);

  // حالة تأكيد التغييرات غير المحفوظة
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingTab, setPendingTab] = useState<any>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  // التحقق من وجود تغييرات غير محفوظة في الملف الشخصي
  const isProfileDirty = () => {
    if (!currentCustomer || activeTab !== 'profile') return false;
    
    const mMatch = currentCustomer.address.match(/محلة ([\s\S]+?)( -|$|\()/);
    const zMatch = currentCustomer.address.match(/زقاق ([\s\S]+?)( -|$|\()/);
    const dMatch = currentCustomer.address.match(/دار ([\s\S]+?)( -|$|\()/);
    const lMatch = currentCustomer.address.match(/\(أقرب نقطة: (.*)\)/);
    const areaPart = currentCustomer.address.split(' - ')[0] || '';

    const pristine = {
      name: currentCustomer.name,
      province: currentCustomer.province,
      area: areaPart.replace(/\(أقرب نقطة: .*\)/, '').trim(),
      mahalla: mMatch ? mMatch[1].trim() : '',
      zuqaq: zMatch ? zMatch[1].trim() : '',
      dar: dMatch ? dMatch[1].trim() : '',
      landmark: lMatch ? lMatch[1].trim() : '',
      lat: currentCustomer.lat,
      lng: currentCustomer.lng
    };

    return (
      pristine.name !== profileForm.name ||
      pristine.province !== profileForm.province ||
      pristine.area !== profileForm.area ||
      pristine.mahalla !== profileForm.mahalla ||
      pristine.zuqaq !== profileForm.zuqaq ||
      pristine.dar !== profileForm.dar ||
      pristine.landmark !== profileForm.landmark ||
      pristine.lat !== profileForm.lat ||
      pristine.lng !== profileForm.lng
    );
  };

  // حساب التقييم الحقيقي للمتجر
  const getStoreRating = (storeId: string, fallbackRating: number) => {
    const reviews = storeReviews.filter(r => r.storeId === storeId);
    if (reviews.length === 0) return fallbackRating.toFixed(1);
    const avg = reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length;
    return avg.toFixed(1);
  };

  // التحكم في التنقل مع التحقق من التغييرات
  const handleTabChange = (newTabId: any) => {
    if (activeTab === 'profile' && isProfileDirty()) {
      setPendingTab(newTabId);
      setShowUnsavedModal(true);
    } else {
      setSelectedStore(null);
      setActiveTab(newTabId);
    }
  };

  const handleConfirmUnsaved = (save: boolean) => {
    if (save) {
      handleSaveProfile();
    }
    
    if (pendingTab === 'logout') {
      handleLogout();
    } else {
      setSelectedStore(null);
      setActiveTab(pendingTab);
    }
    
    setShowUnsavedModal(false);
    setPendingTab(null);
  };

  // حالة نموذج حسابي (البيانات الشخصية)
  const [profileForm, setProfileForm] = useState({ name: '', province: 'بغداد', area: '', mahalla: '', zuqaq: '', dar: '', landmark: '', lat: undefined as number | undefined, lng: undefined as number | undefined });

  // حالة تغيير كلمة المرور
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [orderSummary, setOrderSummary] = useState('');
  const [pwStep, setPwStep] = useState(1); // 1: رقم الهاتف, 2: OTP + كلمة مرور جديدة
  const [otpPwCode, setOtpPwCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // التحقق من صحة البيانات
  const iraqiPhoneRegex = /^(0?(77|79|78|75)\d{8})$/;
  const normalizeIraqiPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (/^964(77|79|78|75)\d{8}$/.test(digits)) return digits;
    if (/^0(77|79|78|75)\d{8}$/.test(digits)) return `964${digits.slice(1)}`;
    if (/^(77|79|78|75)\d{8}$/.test(digits)) return `964${digits}`;
    return digits;
  };
  const isPhoneValid = iraqiPhoneRegex.test(custPhone);
  const isLoginPhoneValid = iraqiPhoneRegex.test(loginPhone);
  const isCustomerPasswordValid = custPassword.length >= 8;
  const isSignupFormValid = custName.trim() !== '' && 
                            isPhoneValid && 
                            isCustomerPasswordValid &&
                            custProvince !== '' && 
                            custArea.trim() !== '' &&
                            custLandmark.trim() !== '' &&
                            custLat !== undefined &&
                            custLng !== undefined;

  useEffect(() => {
    Promise.resolve().then(() => setSelectedProductTag(''));
  }, [selectedStore, view]);

  // تحديث الجلسة وتعبئة بيانات الملف الشخصي عند تسجيل الدخول
  useEffect(() => {
    if (currentCustomer) {
      Promise.resolve().then(() => {
        if (view !== 'dashboard') setView('dashboard');
        
        // محاولة استخراج أجزاء العنوان بذكاء
        const mMatch = currentCustomer.address.match(/محلة ([\s\S]+?)( -|$|\()/);
        const zMatch = currentCustomer.address.match(/زقاق ([\s\S]+?)( -|$|\()/);
        const dMatch = currentCustomer.address.match(/دار ([\s\S]+?)( -|$|\()/);
        const lMatch = currentCustomer.address.match(/\(أقرب نقطة: (.*)\)/);
        const areaPart = currentCustomer.address.split(' - ')[0] || '';

        setProfileForm({
          name: currentCustomer.name,
          province: currentCustomer.province,
          area: areaPart.replace(/\(أقرب نقطة: .*\)/, '').trim(),
          mahalla: mMatch ? mMatch[1].trim() : '',
          zuqaq: zMatch ? zMatch[1].trim() : '',
          dar: dMatch ? dMatch[1].trim() : '',
          landmark: lMatch ? lMatch[1].trim() : '',
          lat: currentCustomer.lat,
          lng: currentCustomer.lng
        });
      });
    } else {
      Promise.resolve().then(() => {
        if (view !== 'login' && view !== 'signup' && view !== 'otp' && view !== 'forgot') {
          setView('login');
        }
      });
    }
  }, [currentCustomer, view]);

  // حفظ تعديلات البيانات الشخصية
  const handleSaveProfile = () => {
    if (profileForm.lat === undefined || profileForm.lng === undefined) {
      alert('يرجى تحديد موقعك على الخريطة أولاً 📍');
      return;
    }
    const optionalAddressParts = [
      profileForm.mahalla ? `محلة ${profileForm.mahalla}` : '',
      profileForm.zuqaq ? `زقاق ${profileForm.zuqaq}` : '',
      profileForm.dar ? `دار ${profileForm.dar}` : '',
    ].filter(Boolean).join(' - ');
    const fullAddress = `${profileForm.area}${optionalAddressParts ? ` - ${optionalAddressParts}` : ''} (أقرب نقطة: ${profileForm.landmark})`;
    
    updateCustomerProfile({
      id: currentCustomer?.id,
      name: profileForm.name,
      province: profileForm.province,
      address: fullAddress,
      lat: profileForm.lat,
      lng: profileForm.lng
    });
    alert('تم حفظ التعديلات بنجاح! ✅');
  };

  const [rechargeCodeInput, setRechargeCodeInput] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleRedeemCode = async () => {
    if (!rechargeCodeInput.trim() || !currentCustomer) return;
    setIsRedeeming(true);
    try {
      const p = await redeemRechargeCode(rechargeCodeInput.trim().toUpperCase(), currentCustomer.id);
      alert(`🎉 تم شحن ${p} نقطة بنجاح لرصيدك!`);
      setRechargeCodeInput('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsRedeeming(false);
    }
  };

  // تفعيل كود شحن النقاط
  const handleActivatePromo = async () => {
    if (!promoCode.trim()) return;
    if (!currentCustomer) return;

    const code = promoCode.trim().toUpperCase();
    const found = promoCodes.find(p => p.code === code && p.status === 'active');

    if (!found) {
      alert('الرمز غير صحيح أو منتهي الصلاحية ❌');
      return;
    }

    // التحقق إذا كان الكود مخصص لشحن النقاط أو هدايا
    if (found.storeId === 'ALL_STORES' || found.source === 'points' || found.source === 'admin') {
      addCustomerPoints(currentCustomer.id, found.discountValue);
      alert(`✅ تم تفعيل الكود بنجاح!\nحصلت على ${(found.discountValue || 0).toLocaleString()} نقطة مكافأة في محفظتك.`);
      setPromoCode('');
    } else {
      alert('هذا الكود مخصص لمتجر معين، يمكنك استخدامه في صفحة السلة عند الشراء من ذلك المتجر 🛍️');
    }
  };

  // تغيير كلمة المرور بعد تأكيد OTP
  const handleChangePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pwStep === 1) {
      if (!currentCustomer) return;
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentOtpCode(code);
      const ok = await sendOTP(currentCustomer.phone, code, "forgot");
      if (ok) {
        setPwStep(2);
        alert("تم إرسال رمز OTP لتغيير كلمة المرور إلى واتساب!");
      } else {
        alert("فشل إرسال الرمز. حاول مرة أخرى.");
      }
    } else {
      if (otpPwCode !== sentOtpCode) {
        alert('رمز OTP غير صحيح! تأكد من الرمز المرسل إلى رقم هاتفك.');
        return;
      }
      if (newPassword.length < 8) {
        alert('كلمة المرور يجب أن لا تقل عن 8 حروف أو رموز');
        return;
      }
      updateCustomerProfile({ password: newPassword });
      setCurrentCustomer({ ...currentCustomer!, password: newPassword });
      setShowPasswordChange(false);
      setPwStep(1);
      setOtpPwCode('');
      setNewPassword('');
      setTimeout(() => alert('تم تغيير كلمة المرور بنجاح! ✅'), 100);
    }
  };

  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const ads = adminSettings.ads || [];

  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentAdIndex(prev => (prev + 1) % ads.length);
    }, (adminSettings.adInterval || 5) * 1000);
    return () => clearInterval(interval);
  }, [ads.length, adminSettings.adInterval]);

  const nextAd = () => setCurrentAdIndex(prev => (prev + 1) % ads.length);
  const prevAd = () => setCurrentAdIndex(prev => (prev - 1 + ads.length) % ads.length);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe) nextAd();
    if (isRightSwipe) prevAd();
    setTouchStart(null);
    setTouchEnd(null);
  };

  const filteredStores = uniqueStores.filter(s => {
    if (s.status !== 'active') return false;
    const matchName = s.shopName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      (s.username && s.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
                      s.area.toLowerCase().includes(searchQuery.toLowerCase());
    const matchProvince = selectedProvince === '' || s.province === selectedProvince;
    
    // الفلترة حسب التصنيف
    const matchCategory = !selectedCategory || s.category === selectedCategory.id;

    // الفلترة حسب التصنيف الفرعي (هنا نستخدم الوصف أو حقل النوع إذا توفر، سنبسطها بالاسم/الوصف)
    const matchSubCat = selectedSubCategory === '' || 
                        s.shopName.includes(selectedSubCategory) || 
                        (s.showLandmark !== false && s.landmark && s.landmark.includes(selectedSubCategory));

    return matchName && matchProvince && matchCategory && matchSubCat;
  }).sort((a, b) => {
    // الترتيب حسب التوثيق أولاً: المتجر الموثق يظهر في البداية
    const isVerifiedA = !!(a.isVerified || (a as any).is_verified);
    const isVerifiedB = !!(b.isVerified || (b as any).is_verified);
    if (isVerifiedA && !isVerifiedB) return -1;
    if (!isVerifiedA && isVerifiedB) return 1;

    // ثم الترتيب حسب المسافة إذا توفرت الإحداثيات
    const coords = userCoords || (currentCustomer?.lat && currentCustomer?.lng ? { lat: currentCustomer.lat, lng: currentCustomer.lng } : null);
    if (coords) {
      const distA = a.showMap !== false && a.lat && a.lng ? calculateDistance(coords.lat, coords.lng, a.lat, a.lng) : Infinity;
      const distB = b.showMap !== false && b.lat && b.lng ? calculateDistance(coords.lat, coords.lng, b.lat, b.lng) : Infinity;
      return distA - distB;
    }
    return 0;
  });

  // تصفية الطلبات الخاصة بالزبون الحالي
  const customerOrders = React.useMemo(() => {
    return [...orders].filter(o => o.customerId === currentCustomer?.id).sort((a, b) => {
      const timeA = (a.createdAt as any)?.toMillis ? (a.createdAt as any).toMillis() : Date.parse((a.createdAt as string) || '');
      const timeB = (b.createdAt as any)?.toMillis ? (b.createdAt as any).toMillis() : Date.parse((b.createdAt as string) || '');
      return (Number(timeB) || 0) - (Number(timeA) || 0);
    });
  }, [orders, currentCustomer?.id]);

  const customerNotifications = React.useMemo(() => {
    return notifications
      .filter(n => n.userId === currentCustomer?.id && n.role === 'customer')
      .sort((a, b) => {
        const timeA = (a.createdAt as any)?.toMillis ? (a.createdAt as any).toMillis() : Date.parse((a.createdAt as string) || '');
        const timeB = (b.createdAt as any)?.toMillis ? (b.createdAt as any).toMillis() : Date.parse((b.createdAt as string) || '');
        return (Number(timeB) || 0) - (Number(timeA) || 0);
      });
  }, [notifications, currentCustomer?.id]);
  const unreadNotifsCount = notifications.filter(n => n.userId === currentCustomer?.id && n.role === 'customer' && !n.read).length;
  const [lastNotifCount, setLastNotifCount] = useState(unreadNotifsCount);

  useEffect(() => {
    if (unreadNotifsCount > lastNotifCount) {
      const latestNotif = customerNotifications[0];
      if (latestNotif && !latestNotif.read) {
        notificationSound.play().catch(e => console.log('Sound error:', e));
        if (view === 'dashboard') {
          // You can also show an alert if needed
        }
        showLocalNotification(latestNotif.title, latestNotif.message, { type: latestNotif.type, targetId: latestNotif.targetId });
      }
    }
    Promise.resolve().then(() => setLastNotifCount(unreadNotifsCount));
  }, [unreadNotifsCount, view, lastNotifCount, customerNotifications]);

  // تسجيل الدخول
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoginPhoneValid) {
      setLoginError('اكتب الرقم المحلي 10 أو 11 رقم، ويبدأ بـ 77 أو 78 أو 79 أو 75، مع أو بدون صفر البداية');
      return;
    }
    if (loginPassword.length < 8) {
      setLoginError('كلمة المرور يجب أن لا تقل عن 8 حروف أو رموز');
      return;
    }
    const allCustomers = customers;
    const normalizedLoginPhone = normalizeIraqiPhone(loginPhone);
    const found = allCustomers.find((c: Customer) => normalizeIraqiPhone(c.phone) === normalizedLoginPhone);
    
    if (found) {
      if (found.isBlocked) {
        setLoginError('⚠️ عذراً، لقد تم حظر حسابك من قبل إدارة النظام لمخالفة الشروط.');
        return;
      }
      if (found.password !== loginPassword) {
        setLoginError('كلمة المرور غير صحيحة.');
        return;
      }
      setCurrentCustomer(found);
      requestNotificationPermission();
      setView('dashboard');
      setLoginError('');
    } else {
      setLoginError('الرقم غير مسجل، يرجى الانتقال لصفحة التسجيل لإنشاء حساب جديد.');
    }
  };

  // تسجيل حساب زبون جديد
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isSignupFormValid) {
      alert('يرجى إكمال جميع الحقول المطلوبة.');
      return;
    }

    // التحقق من عدم تكرار رقم الهاتف
    const normalizedSignupPhone = normalizeIraqiPhone(custPhone);
    const existingCustomer = customers.find(c => normalizeIraqiPhone(c.phone) === normalizedSignupPhone);
    if (existingCustomer) {
      alert('رقم الهاتف مسجل مسبقاً! يرجى تسجيل الدخول أو استخدام رقم آخر.');
      return;
    }
    const existingStore = stores.find(s => normalizeIraqiPhone(s.phone) === normalizedSignupPhone);
    if (existingStore) {
      alert('رقم الهاتف مسجل مسبقاً كتاجر! لا يمكن استخدامه لإنشاء حساب زبون.');
      return;
    }

    // إنشاء العنوان الكامل مع الحقول الاختيارية
    const optionalAddressParts = [
      custMahalla ? `محلة ${custMahalla}` : '',
      custZuqaq ? `زقاق ${custZuqaq}` : '',
      custDar ? `دار ${custDar}` : '',
    ].filter(Boolean).join(' - ');
    const fullAddress = `${custArea}${optionalAddressParts ? ` - ${optionalAddressParts}` : ''} (أقرب نقطة: ${custLandmark})`;

    setPendingCustomerData({
      name: custName,
      phone: normalizedSignupPhone,
      password: custPassword,
      province: custProvince,
      address: fullAddress,
      lat: custLat,
      lng: custLng
    });
    setOtpMode('signup');
    setOtpCode('');
    setView('otp');

    // إنشاء رمز OTP عشوائي (في الوضع الحقيقي يتم إرساله عبر WasenderAPI)
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    setSentOtpCode(generatedCode);

    // إرسال OTP عبر WasenderAPI أو الوضع التجريبي
    try {
      console.log(`🔒 OTP DEBUG: The code is ${generatedCode}`);
      const success = await sendOTP(normalizedSignupPhone, generatedCode, 'signup');
      if (success) {
        alert('تم إرسال رمز OTP إلى رقم هاتفك. تحقق من واتساب!');
      } else {
        alert('فشل إرسال رمز OTP. يرجى المحاولة لاحقاً');
      }
    } catch {
      alert("⚠️ فشل إرسال رمز التحقق. يرجى التأكد من اتصالك بالإنترنت أو المحاولة لاحقاً");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const validPhone = iraqiPhoneRegex.test(forgotPhone);
    if (!validPhone) {
      setLoginError('اكتب الرقم المحلي 10 أو 11 رقم، ويبدأ بـ 77 أو 78 أو 79 أو 75، مع أو بدون صفر البداية');
      return;
    }
    if (forgotNewPassword.length < 8) {
      setLoginError('كلمة المرور الجديدة يجب أن لا تقل عن 8 حروف أو رموز');
      return;
    }
    const normalizedForgotPhone = normalizeIraqiPhone(forgotPhone);
    const found = customers.find(c => normalizeIraqiPhone(c.phone) === normalizedForgotPhone);
    if (!found) {
      setLoginError('رقم الهاتف غير مسجل.');
      return;
    }
    setOtpMode('forgot');
    setOtpCode('');
    setView('otp');

    // إنشاء رمز OTP عشوائي
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    setSentOtpCode(generatedCode);

    // إرسال OTP عبر WasenderAPI أو الوضع التجريبي
    try {
      console.log(`🔒 OTP DEBUG: The code is ${generatedCode}`);
      const success = await sendOTP(normalizedForgotPhone, generatedCode, 'forgot');
      if (success) {
        alert('تم إرسال رمز OTP إلى رقم هاتفك. تحقق من واتساب!');
      } else {
        alert('فشل إرسال رمز OTP. يرجى المحاولة لاحقاً');
      }
    } catch {
      alert("⚠️ فشل إرسال رمز التحقق. يرجى التأكد من اتصالك بالإنترنت أو المحاولة لاحقاً");
    }
  };

  const handleOtpConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode !== sentOtpCode) {
      setLoginError(`رمز OTP غير صحيح. تأكد من الرمز المرسل إلى رقم هاتفك.`);
      return;
    }
    if (otpMode === 'signup' && pendingCustomerData) {
      registerCustomer(pendingCustomerData).then(newCust => {
        setCurrentCustomer(newCust);
        setView('dashboard');
        alert(`أهلاً بك يا ${newCust.name}! تم إنشاء حسابك بنجاح.`);
        setCustName(''); setCustPhone(''); setCustPassword(''); setCustProvince('بغداد');
        setCustArea(''); setCustMahalla(''); setCustZuqaq(''); setCustDar(''); setCustLandmark('');
        setPendingCustomerData(null);
      });
      return;
    }
    if (otpMode === 'forgot') {
      const found = customers.find(c => normalizeIraqiPhone(c.phone) === normalizeIraqiPhone(forgotPhone));
      if (found) {
        updateCustomerProfile({ ...found, password: forgotNewPassword });
        setCurrentCustomer({ ...found, password: forgotNewPassword });
        setView('dashboard');
        setTimeout(() => alert('تم تغيير كلمة المرور وتسجيل الدخول بنجاح.🚪'), 100);
      }
    }
  };

  // إدارة السلة: إضافة منتج (يسمح بالطلب من عدة متاجر بنفس الوقت)
  const addToCart = (product: Product, qty: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + qty } : item);
      }
      return [...prev, { product, quantity: qty }];
    });
    const storeName = stores.find(s => s.id === product.storeId)?.shopName || 'المتجر';
    alert(`✅ تمت إضافة ${qty > 1 ? qty + ' من' : ''} "${product.name}" من متجر "${storeName}" إلى السلة 🛒`);
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== productId));
      if (cart.length <= 1) setAppliedPromo(null);
      return;
    }
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity } : item));
  };

  // تجميع السلة حسب المتاجر (لحساب التوصيل لكل متجر)
  const cartByStore: Record<string, { store: Store; items: { product: Product; quantity: number }[] }> = {};
  cart.forEach(item => {
    const store = stores.find(s => s.id === item.product.storeId);
    if (!store) return;
    if (!cartByStore[store.id]) {
      cartByStore[store.id] = { store, items: [] };
    }
    cartByStore[store.id].items.push(item);
  });

  // حساب أسعار السلة
  const subtotal = cart.reduce((acc, curr) => acc + (curr.product.finalPrice * curr.quantity), 0);

  // رسوم التوصيل = مجموع رسوم كل متجر (إذا ماكو توصيل مجاني)
  const deliveryCost = Object.values(cartByStore).reduce((acc, group) => {
    const hasFreeDeliveryItem = group.items.some(item => item.product.isFreeDelivery);
    if (group.store.isFreeDelivery || hasFreeDeliveryItem) return acc; // توصيل مجاني
    return acc + (group.store.deliveryPrice || 0);
  }, 0);

  const discountAmount = useMemo(() => {
    if (!appliedPromo) return 0;
    const promo = promoCodes.find(p => p.id === appliedPromo.id);
    if (!promo) return appliedPromo.discountValue;
    
    if (promo.discountType === 'percent') {
       return (subtotal * promo.discountValue) / 100;
    }
    return promo.discountValue || appliedPromo.discountValue;
  }, [appliedPromo, subtotal, promoCodes]);

  const total = Math.max(0, subtotal + deliveryCost - discountAmount);

  // شاشة عرض منتجات المتجر المختار (Store Details)
  const storeProducts = useMemo(() => {
    return selectedStore ? products.filter(p => p.storeId === selectedStore.id && p.status === 'published') : [];
  }, [selectedStore, products]);

  // استخراج جميع الوسوم (Tags) الفريدة لمنتجات هذا المتجر
  const storeTags = useMemo(() => {
    const tags = new Set<string>();
    storeProducts.forEach(p => {
      if (p.tags) p.tags.forEach(t => tags.add(t));
    });
    return Array.from(tags);
  }, [storeProducts]);

  // تم استخدام groupedStoreProducts بدلاً من filteredStoreProducts لتقسيم المنتجات حسب الأقسام ديناميكياً

  const groupedStoreProducts = useMemo(() => {
    const selectedStoreCategory = STORE_CATEGORIES.find(c => c.id === selectedStore?.category);
    const predefinedSubs = selectedStoreCategory?.sub || [];
    
    // Any product tags that exist on actual products but are not in the predefined list
    const dynamicTags = storeTags.filter(t => !predefinedSubs.includes(t));
    const allSections = [...predefinedSubs, ...dynamicTags];
    
    const groups: { sectionName: string; products: typeof storeProducts }[] = [];
    
    // Group products into predefined and dynamic tags sections
    allSections.forEach(section => {
      const productsInSec = storeProducts.filter(p => p.tags && p.tags.includes(section));
      if (productsInSec.length > 0) {
        // filter if selectedProductTag is applied (must match)
        const finalProducts = selectedProductTag 
          ? productsInSec.filter(p => p.tags && p.tags.includes(selectedProductTag))
          : productsInSec;
        
        if (finalProducts.length > 0) {
          groups.push({
            sectionName: section,
            products: finalProducts
          });
        }
      }
    });
    
    // Group any remaining products that do not have tags or whose tags are not matched in any section
    const remainingProducts = storeProducts.filter(p => !p.tags || p.tags.length === 0 || p.tags.every(t => !allSections.includes(t)));
    if (remainingProducts.length > 0) {
      const finalRemaining = selectedProductTag
        ? [] // if we filtered by a tag, uncategorized wouldn't match any tag
        : remainingProducts;
      
      if (finalRemaining.length > 0) {
        groups.push({
          sectionName: 'أخرى',
          products: finalRemaining
        });
      }
    }
    
    return groups;
  }, [storeProducts, storeTags, selectedStore, selectedProductTag]);

  // تطبيق بروموكود الخصم (يصلح لأي متجر في السلة)
  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError('');

    if (!promoInput.trim() || cart.length === 0) return;

    const code = promoInput.trim().toUpperCase();

    const foundPromo = promoCodes.find(p => p.code === code && p.status === 'active');

    if (!foundPromo) {
      setPromoError('الكود غير صحيح أو منتهي الصلاحية ❌');
      return;
    }
    
    if (foundPromo.startDate && new Date(foundPromo.startDate) > new Date()) {
      setPromoError('هذا الكود لم يبدأ بعد ⏳');
      return;
    }

    if (foundPromo.expiresAt && new Date(foundPromo.expiresAt) < new Date()) {
      setPromoError('هذا الكود منتهي الصلاحية ❌');
      return;
    }

    if (foundPromo.maxUsesPerUser && currentCustomer) {
       const userPromoUsage = orders.filter(o => o.customerId === currentCustomer.id && o.promoCode === foundPromo.code).length;
       if (userPromoUsage >= foundPromo.maxUsesPerUser) {
          setPromoError(`عذراً، لقد استنفدت الحد الأقصى لاستخدام هذا الكود (${foundPromo.maxUsesPerUser} مرات) ❌`);
          return;
       }
    }

    // الكود العام يصلح لكل المتاجر المنطبقة عليه الشروط، الكود الخاص لمتجر معين
    const storeIdsInCart = Object.keys(cartByStore);
    
    // فحص ملاءمة الكود لمتاجر السلة
    const isPromoValid = (() => {
      if (foundPromo.storeId === 'ALL_STORES') {
        if (foundPromo.targetStores?.length && foundPromo.targetStores.length > 0) {
          return storeIdsInCart.some(id => foundPromo.targetStores!.includes(id));
        } else if (foundPromo.targetProvinces?.length && foundPromo.targetProvinces.length > 0) {
          // جلب محافظات المتاجر في السلة
          const cartStoreProvinces = storeIdsInCart.map(id => stores.find(s => s.id === id)?.province).filter(Boolean) as string[];
          return cartStoreProvinces.some(prov => foundPromo.targetProvinces!.includes(prov));
        } else {
          return true; // كود عام لكل المتاجر والمحافظات
        }
      } else {
        return storeIdsInCart.includes(foundPromo.storeId);
      }
    })();

    if (!isPromoValid) {
      setPromoError('عذراً، هذا الكود مخصص لمتجر غير موجود في سلتك أو لمحافظة أخرى ⚠️');
      return;
    }

    if (foundPromo.usedCount >= foundPromo.maxUses) {
      setPromoError('عذراً، انتهت مرات استخدام هذا الكود ❌');
      return;
    }

    // حساب الخصم لو كان نسبة
    let discountVal = foundPromo.discountValue;
    if (foundPromo.discountType === 'percent') {
       const totalCartPrice = cart.reduce((sum, item) => sum + (item.product.finalPrice * item.quantity), 0);
       discountVal = (totalCartPrice * foundPromo.discountValue) / 100;
    }

    setAppliedPromo({
      id: foundPromo.id,
      code: foundPromo.code,
      discountValue: discountVal
    });
    setPromoInput('');
  };

  // إرسال الطلب - يرسل طلب منفصل لكل متجر
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !currentCustomer) return;
    if (!currentCustomer.province || !currentCustomer.address) {
      alert('يرجى مراجعة صفحة الإعدادات وتأكيد عنوان التوصيل كاملاً قبل الطلب!');
      setActiveTab('profile');
      setShowCart(false);
      return;
    }

    // تجميع السلة حسب المتجر وإرسال طلب منفصل لكل متجر
    const storeGroups = Object.entries(cartByStore);
    let summary = '';
    let totalValue = 0;
    const placedOrderIds: string[] = [];

    for (const [storeId, group] of storeGroups) {
      const store = group.store;
      const storeItems = group.items;
      
      const storeSubtotal = storeItems.reduce((acc, item) => acc + (item.product.finalPrice * item.quantity), 0);
      const hasFreeDelivery = store.isFreeDelivery || storeItems.some(item => item.product.isFreeDelivery);
      const storeDeliveryCost = hasFreeDelivery ? 0 : (store.deliveryPrice || 0);
      const storeDiscount = storeId === storeGroups[0][0] ? discountAmount : 0;
      const storeTotal = Math.max(0, storeSubtotal + storeDeliveryCost - storeDiscount);

      totalValue += storeTotal;

      const newOrderId = await placeOrder({
        storeId: store.id,
        storeName: store.shopName,
        customerId: currentCustomer.id,
        customerName: currentCustomer.name,
        customerPhone: currentCustomer.phone,
        customerAddress: currentCustomer.address,
        customerProvince: currentCustomer.province,
        customerLat: currentCustomer.lat,
        customerLng: currentCustomer.lng,
        items: storeItems.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          price: item.product.finalPrice,
          quantity: item.quantity,
          image: item.product.image
        })),
        subtotal: storeSubtotal,
        deliveryPrice: storeDeliveryCost,
        discountAmount: storeDiscount,
        total: storeTotal
      }, storeId === storeGroups[0][0] ? appliedPromo?.id : undefined);

      placedOrderIds.push(newOrderId);
      summary += `📦 "${store.shopName}": ${storeItems.length} منتجات - ${(storeTotal || 0).toLocaleString()} د.ع\n`;
    }

    summary += `\n💰 الإجمالي الكلي: ${(totalValue || 0).toLocaleString()} د.ع`;
    setOrderSummary(summary);
    
    // حفظ الايديات الخاصة بالطلبات الجديدة ليتم التوجيه اليها مباشرتاً
    if (placedOrderIds.length === 1) {
      setTargetOrderId(placedOrderIds[0]);
    } else {
      setTargetOrderId(null);
    }

    setShowOrderSuccess(true);
    setCart([]);
    setAppliedPromo(null);
    setShowCart(false);
  };

  // فتح الروابط الخارجية مباشرة وبدون فتح نافذة جديدة في الموبايل لتجنب القيود الأمنية وعرض الصحفة الزرقاء
  const openExternalUrl = (url: string) => {
    if (!url) return;

    const lowerUrl = url.toLowerCase();

    // التحقق مما إذا كان الرابط هو لأحد تطبيقات التواصل الاجتماعي، الخرائط أو الاتصال (جوجل ماب، ويز، واتساب، تليغرام، مسنجر، إنستقرام، فيسبوك، ويب، هواتف)
    const isAppInstallLink = 
      lowerUrl.includes('wa.me') || 
      lowerUrl.includes('whatsapp') || 
      lowerUrl.includes('t.me') || 
      lowerUrl.includes('telegram') || 
      lowerUrl.includes('maps.google') || 
      lowerUrl.includes('google.com/maps') || 
      lowerUrl.includes('google.co.id/maps') || 
      lowerUrl.includes('google.iq/maps') || 
      lowerUrl.includes('maps.apple.com') || 
      lowerUrl.includes('waze.com') || 
      lowerUrl.includes('waze://') || 
      lowerUrl.includes('messenger') || 
      lowerUrl.includes('facebook.com') || 
      lowerUrl.includes('instagram.com') || 
      lowerUrl.startsWith('tel:') || 
      lowerUrl.startsWith('mailto:');

    // إذا كان رابط تطبيق خارجي، نقوم بفتحه خارجياً مباشرةً (ينقله لتطبيق آخر)
    if (isAppInstallLink) {
      // التحقق مما إذا كان التطبيق يعمل كـ Capacitor (أي تطبيق أندرويد/آيفون مثبت)
      // في بيئة كاباسيتور، استخدام '_system' يوجه الرابط ليُفتح بالتطبيق الأصلي للنظام أو المتصفح الخارجي لحل مشكلة واتساب والاتصال
      const isCapacitor = !!(window as any).Capacitor;
      if (isCapacitor) {
        window.open(url, '_system');
        return;
      }

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIframe = window.self !== window.top;
      
      // في الهواتف أو عند العرض داخل إطار تفاعلي (iframe)، الانتقال في الموضع الحالي (window.location.assign) 
      // هو الأضمن لفتح تطبيق واتساب/تليغرام/مسنجر مباشرة وتجنب إعتراض المتصفح أو ظهور صفحة زرقاء
      if (isMobile || isIframe) {
        window.location.assign(url);
      } else {
        try {
          const win = window.open(url, '_blank');
          if (!win) {
            window.location.assign(url);
          }
        } catch (_e) {
          window.location.assign(url);
        }
      }
      return;
    }

    // إذا كان الرابط عادي وليس تطبيق تواصل أو خرائط، نفتحه في الـ Iframe داخل التطبيق لكي يسهل للمستخدم الرجوع للتطبيق بلمسة زر!
    setIframeUrl(url);
  };

  // مشاركة المتجر (WhatsApp)
  // نظام المشاركة الشامل
  const openShareModal = (type: 'store' | 'product' | 'reel', data: any) => {
    let text = '';
    if (type === 'store') {
      text = `ألقِ نظرة على متجر "${data.shopName}" في تطبيق محلك! محل رهيب يعرض منتجات رائعة في منطقة ${data.area}.
رابط المتجر: https://mahallak.app/store/${data.id}`;
    } else if (type === 'product') {
      text = `شاهد هذا المنتج: "${data.name}" بسعر ${data.price.toLocaleString()} د.ع في متجر "${data.shopName}".
رابط المنتج: https://mahallak.app/product/${data.id}`;
    } else if (type === 'reel') {
      text = `شاهد هذا الفيديو الممتع لمنتج رائع في تطبيق محلك! 🎬✨
رابط المقطع: https://mahallak.app/reel/${data.id}`;
    }
    
    setShareText(text);
    setShareConfig({ type, data });
    setShowShareModal(true);
  };

  const executeShare = (platform: 'whatsapp' | 'messenger' | 'telegram' | 'instagram' | 'facebook' | 'copy') => {
    const encodedText = encodeURIComponent(shareText);
    const url = shareConfig?.type === 'store' 
      ? `https://mahallak.app/store/${shareConfig?.data?.id}` 
      : shareConfig?.type === 'product'
      ? `https://mahallak.app/product/${shareConfig?.data?.id}`
      : `https://mahallak.app/reel/${shareConfig?.data?.id}`;
    
    let shareUrl = '';
    switch(platform) {
      case 'whatsapp': shareUrl = `https://wa.me/?text=${encodedText}`; break;
      case 'telegram': shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodedText}`; break;
      case 'facebook': shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`; break;
      case 'messenger': shareUrl = `fb-messenger://share/?link=${encodeURIComponent(url)}`; break;
      case 'instagram': 
        // إنستقرام غالباً يتطلب تطبيق، لكن يمكن نسخ النص لستوري يدوياً أو استخدام روابط الويب المحدودة
        navigator.clipboard.writeText(shareText);
        alert('تم نسخ نص المشاركة. يمكنك الآن لصقه في ستوري إنستقرام أو رسالة خاصة.');
        return;
      case 'copy':
        navigator.clipboard.writeText(shareText);
        alert('تم نسخ رابط المشاركة بنجاح! ✅');
        return;
    }

    if (shareUrl) openExternalUrl(shareUrl);
    
    // مكافأة النقاط (مرة واحدة في الدقيقة تقريباً لتجنب سوء الاستخدام)
    if (currentCustomer) {
      addCustomerPoints(currentCustomer.id, 5);
    }
  };

  // تحويل النقاط إلى كود خصم
  const handleRedeemPoints = async (pointsRequired: number) => {
    setShowRedeemConfirm(pointsRequired);
  };

  const confirmRedeemPoints = async () => {
    if (!showRedeemConfirm) return;
    const res = await convertPointsToPromo(currentCustomer!.id, showRedeemConfirm);
    setShowRedeemConfirm(null);
    alert(res.message);
  };

  // تسجيل الخروج للزبون
  const handleLogout = () => {
    setCurrentCustomer(null);
    setView('login');
    setActiveTab('stores');
    setSelectedStore(null);
    setCart([]);
  };

  // ==========================================
  // Push Notifications Setup for Customer
  // ==========================================
  useEffect(() => {
    if (view === 'dashboard' && currentCustomer) {
      setupPushNotifications(
        currentCustomer.id,
        'customers',
        (notification) => {
          // Foreground
          showLocalNotification(notification.title || 'محلك', notification.body || 'لديك إشعار جديد', notification.data);
        },
        (action) => {
          // Background Click Routing
          const data = action.notification.data;
          if (data?.type === 'order_update') {
            setActiveTab('orders');
          } else if (data?.type === 'new_product' || data?.type === 'promo') {
            setActiveTab('stores');
            if (data?.storeId) {
               const st = stores.find(s => s.id === data.storeId);
               if (st) {
                 setSelectedStore(st);
                 setSearchQuery('');
               }
            }
          }
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentCustomer?.id]);

  // ==========================================
  // الشاشات الرئيسية لتطبيق الزبون
  // ==========================================
  
  if (view === 'dashboard' && currentCustomer) {
    
    const isFollowing = selectedStore ? (currentCustomer.followedStores || []).includes(selectedStore.id) : false;
    const isNotifOn = selectedStore ? (currentCustomer.storeNotifications || []).includes(selectedStore.id) : false;

    // ==========================================
    // الشاشة العامة للزبون (Customer Main Tabs)
    // ==========================================
    return (
      <div className="min-h-screen max-w-[100vw] overflow-x-hidden bg-slate-50 flex flex-col text-right font-sans selection:bg-[#e9daff] selection:text-[#4D2980] pb-20" dir="rtl">
        {/* مودال طلب الموقع */}
        <AnimatePresence>
          {showLocationModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#4D2980]/60 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl text-center"
              >
                <div className="w-20 h-20 bg-[#f5eeff] rounded-3xl flex items-center justify-center mx-auto mb-6 text-[#9952FF]">
                  <MapPin size={40} className="animate-bounce" />
                </div>
                <h3 className="text-xl font-black text-[#4D2980] mb-2">تفعيل الموقع الجغرافي</h3>
                <p className="text-sm text-slate-500 font-bold mb-8 leading-relaxed">
                  يرجى السماح بالوصول لموقعك لنتمكن من عرض المتاجر الأقرب إليك وحساب دقيق لمسافات التوصيل.
                </p>
                <div className="space-y-3">
                  <button 
                    onClick={requestLocation}
                    className="w-full bg-[#9952FF] text-white py-4 rounded-2xl font-black shadow-lg shadow-[#e9daff] hover:bg-[#4D2980] transition active:scale-95"
                  >
                    حسناً، تفعيل الموقع
                  </button>
                  <button 
                    onClick={() => setShowLocationModal(false)}
                    className="w-full bg-slate-50 text-slate-400 py-4 rounded-2xl font-bold hover:bg-slate-100 transition"
                  >
                    ليس الآن
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {selectedStore ? (
          <div className="min-h-screen bg-gray-50 flex flex-col animate-slide-up">
            {/* خلفية المتجر العلوية ومعلوماته */}
            <header className="relative bg-white shadow-xs transition-all duration-300">
              <div className="h-16 sm:h-20 bg-gradient-to-l from-[#4D2980] to-[#381a66] overflow-hidden relative">
                 <div className="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
              </div>
              
              <div className="absolute top-3 right-3 z-10 flex gap-2">
                <button 
                  onClick={() => setSelectedStore(null)} 
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 rounded-xl text-slate-700 shadow-xs border border-slate-100 hover:scale-105 active:scale-95 transition-all flex items-center gap-1 font-bold text-[9.5px] sm:text-xs font-tajawal"
                >
                  <ChevronRight size={14} />
                  <span>رجوع</span>
                </button>
              </div>

              <div className="max-w-4xl mx-auto px-3 py-4 sm:p-5 flex flex-col md:flex-row items-center md:items-center relative gap-3 text-center md:text-right w-full">
                <div className="relative shrink-0">
                  <img 
                    src={selectedStore.logo || undefined} 
                    alt={selectedStore.shopName} 
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border-2 border-white shadow-md -mt-10 bg-white relative z-10"
                  />
                  {(selectedStore.isVerified || (selectedStore as any).is_verified) && (
                    <div className="absolute -bottom-1 -left-1 z-20" title="موثق رسمياً">
                      <VerifiedBadge size={18} />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 text-center md:text-right mt-1 md:mt-0 md:mr-3 w-full">
                  <div className="flex flex-col md:flex-row md:items-center gap-1.5 justify-center md:justify-start">
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <h1 className="text-sm sm:text-base md:text-lg font-black text-[#4D2980] tracking-tight font-tajawal">{selectedStore.shopName}</h1>
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-md text-[9px] font-black border border-amber-100/50">
                        <Sparkles size={10} />
                        <span>{getStoreRating(selectedStore.id, selectedStore.rating)}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1.5 justify-center md:justify-start">
                      {adminSettings.featuredStoreIds?.includes(selectedStore.id) && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-md text-[8.5px] font-black shadow-xs">
                          <Zap size={9} fill="currentColor" /> مميز
                        </div>
                      )}
                      {(selectedStore.badges || []).map(badgeId => {
                        const badgeInfo = STORE_BADGES.find(b => b.id === badgeId);
                        if (!badgeInfo) return null;
                        return (
                          <div key={badgeId} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8.5px] font-black border ${badgeInfo.color}`}>
                            {badgeInfo.label}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center md:items-start gap-1.5 mt-1.5">
                    <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start text-[9px] sm:text-[10px] font-bold text-slate-400">
                      <div className="flex items-center gap-1">
                        <MapPin size={11} className="text-[#9952FF]" />
                        <span>{selectedStore.province}</span>
                      </div>
                      {selectedStore.showPhone !== false && (
                        <div className="flex items-center gap-1">
                          <Phone size={11} className="text-emerald-500" />
                          <span className="tracking-wide" dir="ltr">{selectedStore.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2 justify-center md:justify-start">
                    <div className={`px-2 py-0.5 rounded-lg text-[8.5px] sm:text-[9.5px] font-black border transition-colors ${selectedStore.isFreeDelivery ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                      🚚 التوصيل: {selectedStore.isFreeDelivery ? 'مجاني بالكامل' : `${(selectedStore.deliveryPrice || 0).toLocaleString()} د.ع`}
                    </div>
                    <div className="px-2 py-0.5 bg-[#f5eeff] text-[#9952FF] border border-[#e9daff] rounded-lg text-[8.5px] sm:text-[9.5px] font-black">
                      📦 {storeProducts.length} منتج
                    </div>
                  </div>
                </div>

                {/* أزرار التفاعل المدمجة والأنيقة */}
                <div className="flex gap-1.5 items-center justify-center w-full md:w-auto mt-2.5 md:mt-0">
                  <button 
                    onClick={() => {
                      if (!currentCustomer) {
                        alert('يرجى تسجيل الدخول لتقييم المتجر');
                        return;
                      }
                      setShowRateModal({ type: 'store', data: selectedStore });
                    }}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100/80 text-amber-600 rounded-xl font-bold text-[9.5px] transition-all border border-amber-100/50 font-tajawal active:scale-95"
                  >
                    <Sparkles size={11} />
                    <span>قيّم المتجر</span>
                  </button>
                  <button 
                    onClick={() => {
                      if (!currentCustomer) {
                        alert('يرجى تسجيل الدخول لمتابعة المتجر');
                        return;
                      }
                      toggleFollowStore(currentCustomer.id, selectedStore.id);
                    }}
                    className={`flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-xl font-bold text-[9.5px] transition-all active:scale-95 border font-tajawal ${
                      isFollowing 
                      ? 'bg-[#9952FF] text-white border-[#9952FF] shadow-2xs' 
                      : 'bg-white text-slate-600 border-slate-150 hover:border-[#e9daff]'
                    }`}
                  >
                    {isFollowing ? <Heart size={11} fill="currentColor" /> : <Plus size={11} />}
                    <span>{isFollowing ? 'متابع' : 'متابعة'}</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      if (!currentCustomer) {
                        alert('يرجى تسجيل الدخول لتفعيل الإشعارات');
                        return;
                      }
                      toggleStoreNotification(currentCustomer.id, selectedStore.id);
                    }}
                    className={`p-1.5 rounded-xl border transition-all active:scale-95 shadow-2xs ${
                      isNotifOn 
                      ? 'bg-amber-50 text-amber-600 border-amber-100' 
                      : 'bg-white text-slate-400 border-slate-100 hover:border-[#e9daff]'
                    }`}
                  >
                    <Bell size={12} fill={isNotifOn ? 'currentColor' : 'none'} />
                  </button>
                  
                  <button 
                    onClick={() => openShareModal('store', selectedStore)}
                    className="p-1.5 bg-white text-slate-600 border border-slate-100 hover:border-[#e9daff] hover:text-[#9952FF] rounded-xl shadow-2xs transition-all active:scale-95"
                  >
                    <Share2 size={12} />
                  </button>
                </div>
              </div>
            </header>

            <main className="flex-1 p-3 sm:p-5 max-w-4xl mx-auto w-full min-w-0 overflow-x-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-[#9952FF] rounded-full"></div>
                  <h2 className="text-xs sm:text-sm font-black text-[#4D2980]">منتجات المتجر</h2>
                </div>
                {cart.length > 0 && (
                  <button 
                    onClick={() => setShowCart(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#9952FF] text-white rounded-lg font-bold text-[9.5px] font-tajawal animate-pulse shadow-sm shadow-[#e9daff]"
                  >
                    <ShoppingBag size={12} />
                    <span>السلة ({cart.length})</span>
                  </button>
                )}
              </div>

              {/* فلتر بحسب الوسوم (Tags Filtering) - تصميم مدمج */}
              {storeTags.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-3.5 scrollbar-hide w-full min-w-0 min-h-min snap-x">
                  <button
                    onClick={() => setSelectedProductTag('')}
                    className={`px-3 py-1.5 rounded-lg text-[9.5px] font-black whitespace-nowrap transition-all border ${
                      selectedProductTag === '' 
                      ? 'bg-[#9952FF] text-white border-[#9952FF] shadow-2xs' 
                      : 'bg-white text-slate-500 border-slate-100 hover:border-[#e9daff]'
                    }`}
                  >
                    الكل
                  </button>
                  {storeTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setSelectedProductTag(tag === selectedProductTag ? '' : tag)}
                      className={`px-3 py-1.5 rounded-lg text-[9.5px] font-black whitespace-nowrap transition-all border ${
                        selectedProductTag === tag 
                        ? 'bg-[#9952FF] text-white border-[#9952FF] shadow-2xs' 
                        : 'bg-white text-slate-500 border-slate-100 hover:border-[#e9daff]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              {groupedStoreProducts.length === 0 ? (
                <div className="py-24 text-center bg-white rounded-[3rem] border border-slate-100 shadow-sm px-10">
                  <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-slate-200">
                    <ShoppingBag size={48} />
                  </div>
                  <h4 className="text-[#4D2980] font-black text-lg mb-2">
                    {storeProducts.length === 0 ? 'لا توجد منتجات حالياً' : 'لا توجد نتائج لهذا الفلتر'}
                  </h4>
                  <p className="text-slate-400 text-xs font-bold leading-relaxed max-w-xs mx-auto">
                    {storeProducts.length === 0 
                      ? 'هذا المتجر لم يقم بنشر أي منتجات في الوقت الحالي. يرجى مراجعة المتاجر الأخرى.'
                      : 'لم نجد أي منتج يطابق الوسم المختار. جرب اختيار وسم آخر أو عرض الكل.'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-8 sm:space-y-10 w-full">
                  {groupedStoreProducts.map(group => (
                    <div key={group.sectionName} className="bg-white rounded-3xl p-3 sm:p-4.5 border border-slate-100 shadow-2xs">
                      {/* عنوان القسم */}
                      <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-dashed border-slate-100">
                        <div className="w-1.5 h-4.5 bg-[#9952FF] rounded-full"></div>
                        <h3 className="font-extrabold text-[12.5px] sm:text-[14px] text-slate-700 font-tajawal">
                          {group.sectionName}
                        </h3>
                        <span className="text-[9.5px] sm:text-xs text-slate-400 font-bold">({group.products.length} منتج)</span>
                      </div>

                      {/* شبكة المنتجات - 8 في كل سطر في شاشات الميديم واللارج والالعريضة */}
                      <div className="grid grid-cols-2 min-[420px]:grid-cols-3 min-[540px]:grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-8 xl:grid-cols-8 gap-2.5 sm:gap-3 w-full animate-fade-in">
                        {group.products.map(prod => (
                          <motion.div 
                            key={prod.id} 
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={() => {
                              setSelectedProductDetail(prod);
                              setDetailQty(1);
                            }}
                            className="bg-white rounded-2xl overflow-hidden border border-slate-100 flex flex-col hover:shadow-md transition-all duration-300 cursor-pointer group relative p-1.5 sm:p-2"
                          >
                            <div className="aspect-square overflow-hidden bg-slate-50 relative rounded-xl shrink-0">
                              <img 
                                src={prod.image || undefined} 
                                alt={prod.name} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                              />
                              
                              <div className="absolute top-1 left-1 right-1 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                 {prod.isFreeDelivery && (
                                   <div className="bg-emerald-500 text-white text-[7.5px] sm:text-[8.5px] font-black px-1.5 py-0.5 rounded shadow-xs">
                                     توصيل مجاني
                                   </div>
                                 )}
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     openShareModal('product', { ...prod, shopName: selectedStore?.shopName });
                                   }}
                                   className="p-1 bg-white/95 text-slate-600 rounded shadow-2xs hover:text-[#9952FF] transition-colors mr-auto"
                                 >
                                   <Share2 size={10} />
                                 </button>
                              </div>

                              {prod.discountType !== 'none' && (
                                <div className="absolute bottom-1 right-1 bg-rose-500 text-white text-[7.5px] sm:text-[8.5px] font-black px-1.5 py-0.5 rounded shadow-xs">
                                  {prod.discountType === 'percent' ? `-${prod.discountValue}%` : `خصم`}
                                </div>
                              )}
                            </div>

                            <div className="p-1 flex-1 flex flex-col text-right min-w-0 mt-1">
                              <span className="text-[7.5px] sm:text-[8.5px] font-bold text-[#b07aff] uppercase tracking-wide block truncate mb-0.5">{prod.category || 'عام'}</span>
                              <h4 className="font-extrabold text-[#4D2980] text-[9.5px] min-[360px]:text-[10.5px] sm:text-[11.5px] line-clamp-1 leading-tight font-tajawal mb-0.5">{prod.name}</h4>
                              <p className="text-slate-400 font-medium text-[8px] min-[360px]:text-[9px] sm:text-[9.5px] line-clamp-1 leading-tight font-tajawal mb-1">{prod.description || 'لا يوجد وصف متاح للمنتج'}</p>
                              
                              {prod.specialOffer && (
                                <div className="inline-flex items-center gap-1 mb-1 self-start">
                                  <span className="text-[7.5px] sm:text-[8.5px] font-black text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100/50">{prod.specialOffer}</span>
                                </div>
                              )}
                              
                              <div className="mt-auto pt-1.5 border-t border-slate-50 flex flex-col w-full">
                                {prod.discountType !== 'none' && (
                                  <span className="text-[7.5px] min-[360px]:text-[8.5px] sm:text-[9px] text-red-500 line-through font-bold leading-none mb-0.5">
                                    {(prod.price || 0).toLocaleString()} د.ع
                                  </span>
                                )}
                                <div className="flex items-center justify-between w-full gap-1">
                                  <span className="font-black text-[#9952FF] text-[9px] min-[360px]:text-[10.5px] sm:text-[12px] leading-none">
                                    {(prod.finalPrice || 0).toLocaleString()} <span className="text-[6.5px] font-bold text-slate-400">د.ع</span>
                                  </span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addToCart(prod);
                                    }}
                                    className="w-4.5 h-4.5 min-[360px]:w-5.5 min-[360px]:h-5.5 bg-[#4D2980] text-white rounded-md flex items-center justify-center hover:bg-[#9952FF] transition-colors active:scale-95 shrink-0 cursor-pointer"
                                    title="أضف إلى السلة"
                                  >
                                    <Plus size={10} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* آراء وتقييمات العملاء */}
              {selectedStore && (
                <div className="mt-12 mb-8 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-2 h-8 bg-amber-400 rounded-full"></div>
                    <h2 className="text-xl font-black text-[#4D2980]">تقييمات الزبائن</h2>
                    <span className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full mr-auto">
                      {storeReviews.filter(r => r.storeId === selectedStore.id).length} تقييم
                    </span>
                  </div>
                  
                  {storeReviews.filter(r => r.storeId === selectedStore.id).length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <p className="text-sm font-bold">لا توجد تقييمات لهذا المتجر بعد.</p>
                      <p className="text-xs">كن أول من يقيّم {selectedStore.shopName}!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {storeReviews.filter(r => r.storeId === selectedStore.id).map(review => (
                        <div key={review.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-[#4D2980] text-sm">{review.customerName}</h4>
                            <div className="flex text-amber-400 text-xs" dir="ltr">
                              {[1, 2, 3, 4, 5].map(star => (
                                <span key={star} className={star <= review.rating ? 'text-amber-400' : 'text-slate-300'}>★</span>
                              ))}
                            </div>
                          </div>
                          {review.message && (
                            <p className="text-slate-600 text-sm">{review.message}</p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-2">{formatSafeDateTimeString(review.createdAt, 'ar-IQ', { dateStyle: 'short', timeStyle: 'short' })}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </main>
            
            {/* تم حذف زر السلة العائم لتنظيف واجهة المستخدم */}
          </div>
        ) : (
          <>
            {/* الهيدر العلوي - تصميم عصري */}
            {activeTab !== 'reels' && (
              <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60 transition-all">
              <div className="max-w-4xl mx-auto px-4 h-16 flex justify-between items-center text-[#4D2980]">
                
                <div className="flex items-center gap-3">
                  {activeTab !== 'stores' && (
                    <button 
                      onClick={() => handleTabChange('stores')}
                      className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-all border border-slate-100 ml-1 flex items-center justify-center shadow-sm"
                      title="الرجوع للرئيسية"
                    >
                      <ChevronRight size={20} />
                    </button>
                  )}
                  <div className="w-10 h-10 bg-[#e9daff] text-[#9952FF] rounded-xl flex items-center justify-center shadow-sm border border-[#f5eeff]">
                    <ShoppingBag size={22} />
                  </div>
                  <div className="hidden sm:block text-right">
                    <h2 className="text-sm font-black leading-tight">تطبيق محلك</h2>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <MapPin size={10} />
                      <span>{currentCustomer.province}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      if (!showNotifications && unreadNotifsCount > 0 && currentCustomer) {
                        markAllNotificationsAsRead(currentCustomer.id, "customer");
                      }
                      setShowNotifications(!showNotifications);
                    }}
                    className="relative p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 hover:text-[#9952FF] transition-all border border-slate-100"
                  >
                    <Bell size={20} />
                    {unreadNotifsCount > 0 && (
                      <span className="absolute top-2 right-2 w-3.5 h-3.5 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white ring-px ring-rose-200">
                        {unreadNotifsCount}
                      </span>
                    )}
                  </button>

                  <button 
                    onClick={() => setShowCart(true)}
                    className="relative p-2.5 bg-[#f5eeff] text-[#9952FF] rounded-xl hover:bg-[#e9daff] transition-all border border-[#e9daff]"
                  >
                    <ShoppingCart size={20} />
                    {cart.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#9952FF] text-white text-[10px] font-black flex items-center justify-center rounded-full shadow-lg border-2 border-white">
                        {cart.reduce((sum, item) => sum + item.quantity, 0)}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </header>
            )}

        {/* قائمة الإشعارات المنسدلة - تصميم جديد */}
        {showNotifications && (
          <div className="fixed inset-x-4 top-20 max-w-sm mx-auto bg-white rounded-3xl shadow-2xl shadow-[#e9daff]/40 border border-slate-100 z-50 animate-dropdown text-[#4D2980] overflow-hidden">
                <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-white">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        if (unreadNotifsCount > 0 && currentCustomer) markAllNotificationsAsRead(currentCustomer.id, "customer");
                        setShowNotifications(false);
                      }}
                      className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-all ml-1"
                    >
                      <ChevronRight size={20} />
                    </button>
                    <h3 className="text-xl font-black text-[#4D2980]">التنبيهات الأخيرة</h3>
                  </div>
                  <span className="text-[10px] font-black text-[#9952FF] bg-[#f5eeff] px-2.5 py-1 rounded-full">{customerNotifications.length} تنبيه</span>
                </div>
            
            <div className="max-h-80 overflow-y-auto">
              {customerNotifications.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <BellOff size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-xs font-bold">لا يوجد أي إشعارات حالياً</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {customerNotifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`p-4 text-right hover:bg-slate-50 transition-colors cursor-pointer group ${!n.read ? 'bg-[#f5eeff]/30' : ''}`}
                      onClick={() => {
                        markNotificationAsRead(n.id);
                        if (n.type === 'order') {
                          if (n.targetId) {
                            setTargetOrderId(n.targetId);
                          }
                          handleTabChange('orders');
                        } else if (n.type === 'promo') {
                          setWalletView('gifts');
                          handleTabChange('wallet');
                        } else if (n.type === 'product' && n.targetId) {
                          const prod = products.find(p => p.id === n.targetId);
                          if (prod) {
                            const store = stores.find(s => s.id === prod.storeId);
                            if (store && !store.isBanned) {
                              setSelectedStore(store);
                              setSelectedProductDetail(prod);
                              setDetailQty(1);
                              handleTabChange('stores');
                            }
                          }
                        } else {
                          // system / events / general notifications
                          handleTabChange('stores');
                        }
                        setShowNotifications(false);
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-xs mb-1 ${!n.read ? 'font-black text-[#4D2980] group-hover:text-[#9952FF]' : 'font-bold text-slate-600'}`}>{n.title}</h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{n.message}</p>
                          <div className="flex items-center gap-1.5 mt-2 opacity-60">
                            <Clock size={10} />
                            <span className="text-[9px] font-bold">
                              {formatSafeDateTimeString(n.createdAt, 'ar-IQ', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                        </div>
                        {!n.read && <span className="w-2 h-2 bg-[#9952FF] rounded-full mt-1.5 shadow-sm shadow-[#e9daff]"></span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {customerNotifications.length > 0 && (
              <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                <button 
                  onClick={() => {
                    if (unreadNotifsCount > 0 && currentCustomer) markAllNotificationsAsRead(currentCustomer.id, "customer");
                    setShowNotifications(false);
                  }}
                  className="text-[10px] font-black text-slate-400 hover:text-[#9952FF] transition-colors"
                >
                  إغلاق التنبيهات
                </button>
              </div>
            )}
          </div>
        )}

        {/* التاب المفتوح حالياً */}
        <main className={activeTab === 'reels' ? "w-full min-h-screen bg-black" : "flex-1 p-3 sm:p-5 max-w-4xl mx-auto w-full min-w-0 overflow-x-hidden"}>
          
          {/* تاب المتاجر والتصفح */}
          {activeTab === 'stores' && (
            <div className="space-y-6">
              {/* شريط الإعلانات المتحرك (Slider) */}
              {ads.length > 0 && (
                <div 
                  className="relative overflow-hidden rounded-3xl shadow-xl border border-[#e9daff]/50 bg-white group h-48 md:h-64 mx-1"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {ads.map((ad: any, idx: number) => (
                    <div 
                      key={ad.id} 
                      onClick={() => {
                        if (ad.targetType === 'store') {
                          const s = stores.find(store => store.id === ad.targetId);
                          if (s && !s.isBanned) setSelectedStore(s);
                        } else if (ad.targetType === 'product') {
                          const s = stores.find(store => store.id === (ad.storeId || ad.targetStoreId));
                          if (s && !s.isBanned) {
                            setSelectedStore(s);
                            // Note: we might want to automatically open the product modal here if we had a state for it
                          }
                        } else if (ad.targetType === 'link' && ad.link) {
                          openExternalUrl(ad.link);
                        }
                      }}
                      className={`absolute inset-0 transition-all duration-700 ease-in-out cursor-pointer ${idx === currentAdIndex ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}
                    >
                      <img src={ad.url || undefined} className="w-full h-full object-cover" alt="إعلان" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 text-white text-right">
                        <span className="bg-[#9952FF] text-[10px] font-black px-3 py-1 rounded-full mb-3 w-fit shadow-lg tracking-widest border border-[#b07aff]">إعلان ممول</span>
                        <h3 className="text-xl font-black leading-tight drop-shadow-xl mb-1">{ad.title || 'اكتشف أفضل العروض في منطقتك!'}</h3>
                        <p className="text-sm text-[#e9daff] opacity-90 drop-shadow-lg">{ad.desc || 'تسوّق الآن مع محلك'}</p>
                      </div>
                    </div>
                  ))}

                  {/* أزرار التنقل */}
                  {ads.length > 1 && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); prevAd(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#4D2980]/30 hover:bg-[#9952FF]/60 backdrop-blur-md text-white rounded-full transition-all z-20 flex items-center justify-center border border-white/20">
                        <ChevronLeft size={24} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); nextAd(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#4D2980]/30 hover:bg-[#9952FF]/60 backdrop-blur-md text-white rounded-full transition-all z-20 flex items-center justify-center border border-white/20">
                        <ChevronRight size={24} />
                      </button>
                    </>
                  )}
                  
                  {/* مؤشرات النقاط */}
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex space-x-2 space-x-reverse z-20">
                    {ads.map((_: any, idx: number) => (
                      <div key={idx} className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentAdIndex ? 'w-8 bg-[#9952FF]' : 'w-2 bg-white/40'}`} />
                    ))}
                  </div>
                </div>
              )}

              {/* عروض فلاش سيلز */}
              {(() => {
                const activeFlashSales = flashSales.filter(f => f.status === 'active' || (f.status === 'upcoming' && new Date() >= new Date(f.startTime) && new Date() < new Date(f.endTime)));
                if (activeFlashSales.length === 0) return null;
                return (
                  <div className="bg-gradient-to-l from-red-600 to-rose-500 rounded-[2rem] p-5 shadow-lg relative overflow-hidden group mx-1 mb-4 text-white">
                    <div className="absolute -top-10 -right-10 text-white/10 group-hover:scale-110 transition-transform duration-500">
                      <Zap size={140} />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                            <Zap size={18} fill="currentColor" />
                          </div>
                          <h3 className="font-black text-white text-xs sm:text-sm tracking-tight drop-shadow-sm">فلاش سيلز - خصومات لفترة محدودة!</h3>
                        </div>
                      </div>
                      <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-thin">
                        {activeFlashSales.map(fs => {
                          const targetStore = stores.find(s => s.id === fs.itemStoreId);
                          return (
                            <div 
                              key={fs.id} 
                              onClick={() => { if(targetStore && !targetStore.isBanned) setSelectedStore(targetStore); }}
                              className="w-40 shrink-0 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 cursor-pointer hover:bg-white/20 transition-all text-center"
                            >
                                <span className="block text-[10px] font-bold text-rose-100 truncate mb-1">{fs.title}</span>
                                {targetStore && (
                                  <div className="flex items-center gap-2 justify-center mt-2 bg-white rounded-xl p-1.5 shadow-sm text-slate-800">
                                    <img src={targetStore.logo} className="w-6 h-6 rounded-lg shrink-0 object-cover" alt="" />
                                    <span className="text-[10px] font-black truncate">{targetStore.shopName}</span>
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* قسم المتاجر الموثقة - يظهر مباشرة تحت الإعلان المميز */}
              <div className="bg-white rounded-[2rem] border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group mx-1">
                <div className="absolute top-0 left-0 w-24 h-24 bg-blue-500/5 rounded-full -ml-8 -mt-8"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                        <VerifiedBadge size={18} />
                      </div>
                      <h3 className="font-black text-[#4D2980] text-xs tracking-tight">المتاجر الموثقة</h3>
                    </div>
                    <button 
                      onClick={() => setShowFullVerified(!showFullVerified)}
                      className="text-[10px] font-black text-[#9952FF] hover:text-[#4D2980] transition"
                    >
                      {showFullVerified ? 'أقل' : 'الكل'}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {(() => {
                      const verifiedStores = uniqueStores.filter(s => (s.isVerified || (s as any).is_verified) && s.status === 'active');
                      const displayStores = showFullVerified ? verifiedStores : verifiedStores.slice(0, 2);
                      if (displayStores.length === 0) {
                        return <div className="col-span-2 sm:col-span-4 py-8 text-center text-slate-400 text-xs font-bold italic">لا توجد متاجر موثقة حالياً</div>;
                      }
                      return displayStores.map(store => {
                        const categoryLabel = CATEGORY_SHORT_NAMES[store.category || ''] || store.category || 'عام';
                        return (
                          <div 
                            key={`verif-${store.id}`}
                            onClick={() => setSelectedStore(store)}
                            className="w-full bg-white p-3 sm:p-4 rounded-[2rem] border border-slate-100 hover:border-[#9952FF]/30 shadow-2xs hover:shadow-md transition-all duration-300 hover:scale-[1.04] active:scale-95 text-center flex flex-col items-center gap-2.5 cursor-pointer group"
                          >
                            {/* شعار المتجر مربع */}
                            <div className="relative w-full aspect-square rounded-2xl border border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center shadow-2xs shrink-0">
                              <img 
                                src={store.logo || undefined} 
                                alt={store.shopName} 
                                className="w-full h-full object-cover group-hover:scale-110 transition duration-500" 
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute bottom-2 left-2 z-10 animate-fade-in" title="موثق رسمياً">
                                <VerifiedBadge size={20} />
                              </div>
                              {adminSettings.featuredStoreIds?.includes(store.id) && (
                                <div className="absolute top-2 right-2 bg-gradient-to-tr from-amber-400 to-amber-500 text-white p-1 rounded-md shadow-xs z-10 animate-fade-in" title="متجر مميز">
                                  <Zap size={10} fill="currentColor" />
                                </div>
                              )}
                            </div>
                            
                            {/* البيانات تحت الشعار */}
                            <div className="w-full flex flex-col items-center gap-1">
                              {/* اسم المتجر وبجانبه علامة التوثيق */}
                              <div className="w-full flex items-center justify-center gap-1 leading-none">
                                <span className="font-tajawal text-xs sm:text-[13.5px] font-black text-[#4D2980] select-none text-center block px-0.5 group-hover:text-[#9952FF] transition-colors" title={store.shopName}>
                                  {store.shopName}
                                </span>
                              </div>
                              
                              {/* التقييم */}
                              <div className="flex items-center gap-1 justify-center">
                                <div className="flex items-center gap-0.5 text-amber-500 bg-amber-50 px-1.5 py-[2px] rounded-md shrink-0 border border-amber-100/30">
                                  <Sparkles size={9} className="fill-amber-400 text-amber-500" />
                                  <span className="text-[9.5px] font-bold">{getStoreRating(store.id, store.rating)}</span>
                                </div>
                              </div>
                              
                              {/* المحافظة */}
                              <span className="font-tajawal text-[9px] sm:text-[10px] font-bold text-slate-400 leading-[1.1] truncate text-center w-full select-none" title={store.province}>
                                📍 {store.province}
                              </span>
                              
                              {/* فئة المتجر */}
                              <span className="font-tajawal text-[8px] sm:text-[9px] font-extrabold text-[#9952FF] bg-[#9952FF]/5 px-2 py-0.5 rounded-full leading-[1.1] truncate text-center w-full select-none" title={categoryLabel}>
                                {categoryLabel}
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* الفعاليات المركزية */}
              {flashSales.some(f => (f.status === 'active' || (f.status === 'upcoming' && new Date() >= new Date(f.startTime) && new Date() < new Date(f.endTime)))) && (
                <div className="space-y-4">
                  {flashSales.filter(f => (f.status === 'active' || (f.status === 'upcoming' && new Date() >= new Date(f.startTime) && new Date() < new Date(f.endTime)))).map(sale => {
                    const approvedReqs = flashSaleRequests.filter(r => r.flashSaleId === sale.id && r.status === 'approved');
                    if(approvedReqs.length === 0) return null;
                    return (
                      <div key={sale.id} className="bg-gradient-to-l from-rose-600 to-pink-500 rounded-[2rem] p-6 text-white shadow-xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                          <Zap size={150} />
                        </div>
                        <div className="relative z-10 text-right">
                           <div className="flex justify-between items-start mb-4">
                              <div>
                                <span className="bg-white text-rose-600 text-[10px] font-black px-3 py-1 rounded-full mb-2 inline-flex items-center gap-1"><Zap size={12} className="fill-current" /> فعالية نشطة</span>
                                <h3 className="text-2xl font-black">{sale.title}</h3>
                                <p className="text-sm opacity-90 mt-1 max-w-lg">{sale.description}</p>
                              </div>
                              <div className="bg-[#4D2980]/20 backdrop-blur px-4 py-2 rounded-2xl text-center min-w-[100px]">
                                <span className="text-[10px] font-bold block opacity-80 uppercase tracking-widest mb-1">ينتهي في</span>
                                <span className="font-mono font-black text-sm tracking-wider select-none">{formatSafeDate(sale.endTime, 'en-GB')} {formatSafeTimeString(sale.endTime, 'en-US', {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                           </div>

                           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                              {approvedReqs.slice(0, 4).map(req => {
                                 const p = products.find(prod => prod.id === req.productId);
                                 const store = stores.find(s => s.id === req.storeId);
                                 if(!p || !store || store.isBanned) return null;
                                 const promoProduct = {
                                    ...p,
                                    finalPrice: req.promotionalPrice,
                                    discountType: 'amount' as const,
                                    discountValue: p.price - req.promotionalPrice,
                                    isSpecialOffer: true
                                 };
                                 return (
                                     <div key={req.id} onClick={() => { setSelectedStore(store); setSelectedProductDetail(promoProduct); }} className="bg-white/10 hover:bg-white/20 transition cursor-pointer backdrop-blur-md rounded-2xl p-3 border border-white/20 text-right group">
                                       <div className="overflow-hidden rounded-xl mb-3 h-24 relative shadow-inner bg-white/5">
                                         <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg rounded-tr-xl z-20 shadow-md">عرض خاص</div>
                                         <img src={p.image || undefined} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" alt="" />
                                       </div>
                                       <h4 className="font-bold text-xs truncate drop-shadow-md mb-1">{p.name}</h4>
                                       <div className="flex gap-2 items-center flex-wrap">
                                          <span className="font-black text-white text-sm bg-rose-500 px-2 py-0.5 rounded-lg shadow-sm">{req.promotionalPrice.toLocaleString()} <span className="text-[8px]">د.ع</span></span>
                                          <del className="text-[10px] opacity-70">{p.price.toLocaleString()}</del>
                                       </div>
                                       <p className="text-[9px] font-bold opacity-80 mt-2 bg-[#4D2980]/10 px-2 py-1 rounded-md text-center">{store.shopName}</p>
                                     </div>
                                 )
                              })}
                           </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* قسم المتاجر المميزة والقريبة - تصميم Bento عصري */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-1">
                {/* المتاجر المميزة */}
                <div className="bg-white rounded-[2rem] border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-24 h-24 bg-amber-500/5 rounded-full -ml-8 -mt-8"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                          <Award size={18} />
                        </div>
                        <h3 className="font-black text-[#4D2980] text-xs tracking-tight">المميزة</h3>
                      </div>
                      <button 
                        onClick={() => setShowFullFeatured(!showFullFeatured)}
                        className="text-[10px] font-black text-[#9952FF] hover:text-[#4D2980] transition"
                      >
                        {showFullFeatured ? 'أقل' : 'الكل'}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {(showFullFeatured 
                        ? uniqueStores.filter(s => adminSettings.featuredStoreIds?.includes(s.id))
                        : uniqueStores.filter(s => adminSettings.featuredStoreIds?.includes(s.id)).slice(0, 2)
                      ).map(store => {
                        const categoryLabel = CATEGORY_SHORT_NAMES[store.category || ''] || store.category || 'عام';
                        return (
                          <div 
                            key={`feat-${store.id}`}
                            onClick={() => setSelectedStore(store)}
                            className="w-full bg-white p-3 sm:p-4 rounded-[2rem] border border-slate-100 hover:border-[#9952FF]/30 shadow-2xs hover:shadow-md transition-all duration-300 hover:scale-[1.04] active:scale-95 text-center flex flex-col items-center gap-2.5 cursor-pointer group"
                          >
                            {/* شعار المتجر مربع */}
                            <div className="relative w-full aspect-square rounded-2xl border border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center shadow-2xs shrink-0">
                              <img 
                                src={store.logo || undefined} 
                                alt={store.shopName} 
                                className="w-full h-full object-cover group-hover:scale-110 transition duration-500" 
                                referrerPolicy="no-referrer"
                              />
                              {(store.isVerified || (store as any).is_verified) && (
                                <div className="absolute bottom-2 left-2 z-10 animate-fade-in" title="موثق رسمياً">
                                  <VerifiedBadge size={20} />
                                </div>
                              )}
                              {adminSettings.featuredStoreIds?.includes(store.id) && (
                                <div className="absolute top-2 right-2 bg-gradient-to-tr from-amber-400 to-amber-500 text-white p-1 rounded-md shadow-sm z-10 animate-fade-in" title="متجر مميز">
                                  <Zap size={10} fill="currentColor" />
                                </div>
                              )}
                            </div>
                            
                            {/* البيانات تحت الشعار */}
                            <div className="w-full flex flex-col items-center gap-1">
                              {/* اسم المتجر وبجانبه علامة التوثيق */}
                              <div className="w-full flex items-center justify-center gap-1 leading-none">
                                <span className="font-tajawal text-xs sm:text-[13.5px] font-black text-[#4D2980] select-none text-center block px-0.5 group-hover:text-[#9952FF] transition-colors" title={store.shopName}>
                                  {store.shopName}
                                </span>
                              </div>
                              
                              {/* التقييم */}
                              <div className="flex items-center gap-1 justify-center">
                                <div className="flex items-center gap-0.5 text-amber-500 bg-amber-50 px-1.5 py-[2px] rounded-md shrink-0 border border-amber-100/30">
                                  <Sparkles size={9} className="fill-amber-400 text-amber-500" />
                                  <span className="text-[9.5px] font-bold">{getStoreRating(store.id, store.rating)}</span>
                                </div>
                              </div>
                              
                              {/* المحافظة */}
                              <span className="font-tajawal text-[9px] sm:text-[10px] font-bold text-slate-400 leading-[1.1] truncate text-center w-full select-none" title={store.province}>
                                📍 {store.province}
                              </span>
                              
                              {/* فئة المتجر */}
                              <span className="font-tajawal text-[8px] sm:text-[9px] font-extrabold text-[#9952FF] bg-[#9952FF]/5 px-2 py-0.5 rounded-full leading-[1.1] truncate text-center w-full select-none" title={categoryLabel}>
                                {categoryLabel}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* المتاجر القريبة */}
                <div className="bg-gradient-to-br from-[#9952FF] to-[#4D2980] rounded-[2rem] p-5 shadow-xl shadow-[#e9daff] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-white/20 text-white rounded-xl backdrop-blur-md">
                          <MapPin size={18} />
                        </div>
                        <h3 className="font-black text-white text-xs tracking-tight">قريبة منك</h3>
                      </div>
                      <button 
                        onClick={() => setShowFullNearby(!showFullNearby)}
                        className="text-[10px] font-black text-[#e9daff] hover:text-white transition"
                      >
                        {showFullNearby ? 'أقل' : 'الكل'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-auto">
                      {(() => {
                        const coords = userCoords || (currentCustomer?.lat && currentCustomer?.lng ? { lat: currentCustomer.lat, lng: currentCustomer.lng } : null);

                        const baseStores = (() => {
                          if (adminSettings.enableAutoNearby) {
                            // الفرز التلقائي حسب المسافة
                            const filtered = [...uniqueStores].filter(s => s.status === 'active');
                            if (coords) {
                              return [...filtered].sort((a, b) => {
                                const distA = a.showMap !== false && a.lat && a.lng ? calculateDistance(coords.lat, coords.lng, a.lat, a.lng) : Infinity;
                                const distB = b.showMap !== false && b.lat && b.lng ? calculateDistance(coords.lat, coords.lng, b.lat, b.lng) : Infinity;
                                return distA - distB;
                              });
                            } else {
                              return filtered.filter(s => s.province === (currentCustomer?.province || 'بغداد'));
                            }
                          } else {
                            // التحكم اليدوي من الإدارة
                            const nearbyIds = adminSettings.nearbyStoreIds || [];
                            if (nearbyIds.length > 0) {
                              return uniqueStores.filter(s => nearbyIds.includes(s.id) && s.status === 'active');
                            } else {
                              return uniqueStores.filter(s => s.province === (currentCustomer?.province || 'بغداد') && s.status === 'active');
                            }
                          }
                        })();

                        const displayStores = showFullNearby ? baseStores : baseStores.slice(0, 2);

                        if (displayStores.length === 0) return <div className="col-span-2 py-4 text-center text-[#cba8ff] text-[10px] font-bold italic">لا توجد متاجر حالياً</div>;

                        return displayStores.map(store => {
                          const dist = (store.showMap !== false && coords && store.lat && store.lng) 
                            ? calculateDistance(coords.lat, coords.lng, store.lat, store.lng).toFixed(1) 
                            : null;
                          const categoryLabel = CATEGORY_SHORT_NAMES[store.category || ''] || store.category || 'عام';

                          return (
                            <div 
                              key={`near-${store.id}`}
                              onClick={() => setSelectedStore(store)}
                              className="w-full bg-white p-3 sm:p-4 rounded-[2rem] border border-slate-100 hover:border-[#9952FF]/30 shadow-2xs hover:shadow-md transition-all duration-300 hover:scale-[1.04] active:scale-95 text-center flex flex-col items-center gap-2.5 cursor-pointer group"
                            >
                              {/* شعار المتجر مربع */}
                              <div className="relative w-full aspect-square rounded-2xl border border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center shadow-2xs shrink-0">
                                <img 
                                  src={store.logo || undefined} 
                                  alt={store.shopName} 
                                  className="w-full h-full object-cover group-hover:scale-110 transition duration-500" 
                                  referrerPolicy="no-referrer"
                                />
                                {(store.isVerified || (store as any).is_verified) && (
                                  <div className="absolute bottom-2 left-2 z-10 animate-fade-in" title="موثق رسمياً">
                                    <VerifiedBadge size={20} />
                                  </div>
                                )}
                                {dist && (
                                  <div className="absolute top-2 right-2 bg-[#9952FF] text-white px-1.5 py-0.5 rounded-md shadow-sm border border-[#e9daff]">
                                    <span className="text-[8px] sm:text-[9.5px] font-black leading-none">{dist}كم</span>
                                  </div>
                                )}
                                {adminSettings.featuredStoreIds?.includes(store.id) && (
                                  <div className={`absolute top-2 ${dist ? 'left-2' : 'right-2'} bg-gradient-to-tr from-amber-400 to-amber-500 text-white p-1 rounded-md shadow-sm z-10 animate-fade-in`} title="متجر مميز">
                                    <Zap size={10} fill="currentColor" />
                                  </div>
                                )}
                              </div>
                              
                              {/* البيانات تحت الشعار */}
                              <div className="w-full flex flex-col items-center gap-1">
                                {/* اسم المتجر وبجانبه علامة التوثيق */}
                                <div className="w-full flex items-center justify-center gap-1 leading-none">
                                  <span className="font-tajawal text-xs sm:text-[13.5px] font-black text-[#4D2980] select-none text-center block px-0.5 group-hover:text-[#9952FF] transition-colors" title={store.shopName}>
                                    {store.shopName}
                                  </span>
                                </div>
                                
                                {/* التقييم */}
                                <div className="flex items-center gap-1 justify-center">
                                  <div className="flex items-center gap-0.5 text-amber-500 bg-amber-50 px-1.5 py-[2px] rounded-md shrink-0 border border-amber-100/30">
                                    <Sparkles size={9} className="fill-amber-400 text-amber-500" />
                                    <span className="text-[9.5px] font-bold">{getStoreRating(store.id, store.rating)}</span>
                                  </div>
                                </div>
                                
                                {/* المحافظة */}
                                <span className="font-tajawal text-[9px] sm:text-[10px] font-bold text-slate-400 leading-[1.1] truncate text-center w-full select-none" title={store.province}>
                                  📍 {store.province}
                                </span>
                                
                                {/* فئة المتجر */}
                                <span className="font-tajawal text-[8px] sm:text-[9px] font-extrabold text-[#9952FF] bg-[#9952FF]/5 px-2 py-0.5 rounded-full leading-[1.1] truncate text-center w-full select-none" title={categoryLabel}>
                                  {categoryLabel}
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* تاب مقاطع الفيديو التسوقية الجديد */}
          {activeTab === 'reels' && (
            <div className="w-full h-full animate-fade-in bg-black">
              <ReelsFeed 
                onBack={() => handleTabChange('stores')}
                onShowCart={() => setShowCart(true)}
                cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
                onAddToCart={(p) => addToCart(p, 1)}
                currentCustomer={currentCustomer}
                onShareReel={(reel) => openShareModal('reel', reel)}
                onVisitStore={(storeId) => {
                  const foundStore = stores.find(s => s.id === storeId);
                  if (foundStore) {
                    setSelectedStore(foundStore);
                  }
                }}
              />
            </div>
          )}

          {/* تاب المتاجر الجديد - نقل الفئات والبحث والمتاجر */}
          {activeTab === 'merchants' && (
            <div className="space-y-4">
              {/* اختيار المحافظة والبحث - تصميم مدمج ومصغر للغاية */}
              <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs space-y-2">
                {/* اختيار المحافظة فوق */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-slate-500 whitespace-nowrap font-tajawal">المحافظة:</span>
                  <div className="flex-1 relative">
                    <select 
                      value={selectedProvince}
                      onChange={(e) => setSelectedProvince(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-[9.5px] font-bold shadow-2xs focus:ring-2 focus:ring-[#9952FF]/10 focus:border-[#9952FF] outline-none appearance-none font-tajawal text-slate-700"
                    >
                      <option value="">كل محافظات العراق (18)</option>
                      {provinces.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                    <ChevronDown size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* البحث تحتها */}
                <div className="relative group">
                  <Search size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#9952FF] transition-colors" />
                  <input 
                    type="text" 
                    placeholder="ابحث باسم المتجر أو المعرف الخاص به (اليوزر)..." 
                    className="w-full bg-slate-50 border border-slate-100 pr-9 pl-3 py-1.5 rounded-xl text-[9.5px] font-bold shadow-2xs focus:ring-2 focus:ring-[#9952FF]/10 focus:border-[#9952FF] transition-all placeholder:text-slate-300 font-tajawal text-slate-700 text-right"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* الفئات - تصميم شبكة (Grid) متناسق ومصغر */}
              <div className="space-y-3 bg-white p-2.5 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black text-[#4D2980] flex items-center gap-1.5 font-tajawal">
                    <LayoutGrid size={14} className="text-[#9952FF]" />
                    <span className="text-xs font-bold text-[#4D2980]">الفئات</span>
                    {selectedCategory && (
                      <span className="bg-[#f5eeff]/70 text-[#9952FF] px-1.5 py-0.5 rounded-md text-[8.5px] font-black font-tajawal">
                        {CATEGORY_SHORT_NAMES[selectedCategory.id] || selectedCategory.name}
                      </span>
                    )}
                  </h3>
                  <button 
                    onClick={() => setShowCategories(!showCategories)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[#f5eeff]/50 hover:bg-[#f5eeff] border border-[#e9daff]/50 rounded-lg text-[9px] font-black text-[#9952FF] font-tajawal transition-all"
                  >
                    {showCategories ? 'إخفاء الفئات' : 'عرض الفئات'}
                    <ChevronDown size={11} className={`transform transition-transform duration-300 ${showCategories ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                
                {showCategories && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="grid grid-cols-10 gap-x-0.5 sm:gap-x-1.5 gap-y-2.5 w-full justify-items-center">
                      {(() => {
                        const allCategories = [
                           { id: 'all', name: 'الكل' },
                           ...STORE_CATEGORIES
                        ];
                        return allCategories.map((cat) => {
                          const isSelected = cat.id === 'all' ? !selectedCategory : selectedCategory?.id === cat.id;
                          return (
                            <button 
                              key={cat.id}
                              onClick={() => {
                                if (cat.id === 'all') {
                                  setSelectedCategory(null);
                                  setSelectedSubCategory('');
                                } else {
                                  setSelectedCategory(cat as any);
                                  setSelectedSubCategory('');
                                }
                              }}
                              className={`w-full flex flex-col items-center gap-1 transition-all duration-300 ${isSelected ? 'scale-105' : 'opacity-85 hover:opacity-100'}`}
                            >
                              <div className={`w-[24px] h-[24px] min-[360px]:w-[28px] min-[360px]:h-[28px] min-[400px]:w-[32px] min-[400px]:h-[32px] sm:w-[38px] sm:h-[38px] md:w-[42px] md:h-[42px] rounded-lg flex items-center justify-center border transition-all ${
                                isSelected 
                                  ? 'bg-[#9952FF] text-white border-[#b07aff] shadow-xs' 
                                  : 'bg-slate-50 text-slate-500 border-slate-100/80 hover:bg-slate-100'
                              }`}>
                                {getCategoryIcon(cat.id, isSelected, 13)}
                              </div>
                              <span className={`font-tajawal text-[5.8px] min-[360px]:text-[6.8px] min-[400px]:text-[7.8px] sm:text-[9px] font-bold text-center leading-[1.1] tracking-tight min-h-[22px] sm:min-h-[26px] max-w-full flex items-start justify-center select-none break-words ${
                                isSelected ? 'text-[#9952FF] font-extrabold' : 'text-slate-600'
                              }`}
                              >
                                {CATEGORY_SHORT_NAMES[cat.id] || cat.name}
                              </span>
                            </button>
                          );
                        });
                      })()}
                    </div>

                    {selectedCategory && (
                      <div className="flex flex-wrap gap-1.5 animate-fade-in px-1 mt-2.5 justify-start border-t border-slate-100 pt-2.5">
                        {(selectedCategory as any).sub.map((sub: string) => (
                          <button 
                            key={sub}
                            onClick={() => setSelectedSubCategory(selectedSubCategory === sub ? '' : sub)}
                            className={`px-2.5 py-1 rounded-md text-[8.5px] sm:text-[9.5px] font-bold font-tajawal whitespace-nowrap border transition-all ${
                              selectedSubCategory === sub 
                                ? 'bg-[#9952FF] text-white border-[#9952FF] shadow-xs' 
                                : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-[#e9daff] hover:bg-slate-100'
                            }`}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* المتاجر والبحث */}
              <div className="space-y-4 px-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-[#4D2980] flex items-center gap-2">
                    <StoreIcon size={18} className="text-[#9952FF]" />
                    <span>المتاجر ({filteredStores.length})</span>
                  </h2>
                </div>

                {filteredStores.length === 0 ? (
                  stores.length === 0 ? (
                    <div className="py-16 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 sm:p-12 animate-fade-in">
                      <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                         <Zap size={36} className="text-amber-500" />
                      </div>
                      <p className="text-[#4D2980] font-black text-lg">التطبيق فارغ حالياً مابي بيانات!</p>
                      <p className="text-slate-400 text-xs mt-2 font-bold max-w-md mx-auto leading-relaxed text-center px-4">
                        هذه أول مرة يتم فيها تشغيل التطبيق وقاعدة بيانات Firebase الخاصة بك فارغة تماماً. يمكنك بكبسة زر واحدة من توليد بيانات واقعية متكاملة لتجربة التطبيق فوراً.
                      </p>
                      <button 
                        onClick={async () => {
                          const conf = window.confirm('هل تود توليد متاجر ومنتجات تجريبية واقعية بالعراق والترويج لها بالكامل؟');
                          if (!conf) return;
                          try {
                            const res = await seedDatabase();
                            alert(res.message);
                          } catch (err: any) {
                            alert('فشل التوليد: ' + err.message);
                          }
                        }}
                        className="mt-6 px-6 py-3 bg-[#9952FF] hover:bg-[#803ce3] text-white text-xs font-black rounded-full shadow-lg transition duration-300 transform active:scale-95 flex items-center gap-2 mx-auto cursor-pointer"
                      >
                        <Zap size={14} className="fill-current" />
                        توليد قاعدة بيانات تجريبية بالكامل
                      </button>
                    </div>
                  ) : (
                    <div className="py-20 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
                      <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                         <Search size={40} className="text-slate-200" />
                      </div>
                      <p className="text-slate-500 font-black">عذراً، لم نجد نتائج!</p>
                      <p className="text-slate-400 text-[10px] mt-2 font-bold px-10 leading-relaxed text-center">جرّب البحث بكلمات أخرى أو تغيير تصنيف المتجر والمحافظة</p>
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 sm:gap-6 px-1 w-full justify-items-center">
                    {filteredStores.map(store => {
                      const categoryLabel = CATEGORY_SHORT_NAMES[store.category || ''] || store.category || 'عام';
                      return (
                        <div 
                          key={store.id} 
                          onClick={() => setSelectedStore(store)}
                          className="w-full bg-white p-3.5 sm:p-5 rounded-[2rem] border border-slate-100 hover:border-[#9952FF]/30 shadow-2xs hover:shadow-md transition-all duration-300 hover:scale-[1.04] active:scale-95 text-center flex flex-col items-center gap-3 cursor-pointer group"
                        >
                          {/* شعار المتجر مربع */}
                          <div className="relative w-full aspect-square rounded-2xl border border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center shadow-2xs shrink-0 max-w-[130px]">
                            <img 
                              src={store.logo || undefined} 
                              alt={store.shopName} 
                              className="w-full h-full object-cover group-hover:scale-110 transition duration-500" 
                              referrerPolicy="no-referrer"
                            />
                            {(store.isVerified || (store as any).is_verified) && (
                              <div className="absolute bottom-2 left-2 z-10 animate-fade-in" title="موثق رسمياً">
                                <VerifiedBadge size={22} />
                              </div>
                            )}
                            {adminSettings.featuredStoreIds?.includes(store.id) && (
                              <div className="absolute top-2 right-2 bg-gradient-to-tr from-amber-400 to-amber-500 text-white p-1 rounded-md shadow-xs z-10 animate-fade-in" title="متجر مميز">
                                <Zap size={10} fill="currentColor" />
                              </div>
                            )}
                          </div>
                          
                          {/* البيانات تحت الشعار */}
                          <div className="w-full flex flex-col items-center gap-1">
                            {/* اسم المتجر وبجانبه علامة التوثيق */}
                            <div className="w-full flex items-center justify-center gap-1.5 leading-none">
                              <span className="font-tajawal text-xs sm:text-[13.5px] font-black text-[#4D2980] select-none text-center block px-0.5 group-hover:text-[#9952FF] transition-colors" title={store.shopName}>
                                {store.shopName}
                              </span>
                            </div>
                            
                            {/* التقييم */}
                            <div className="flex items-center gap-1 justify-center">
                              <div className="flex items-center gap-0.5 text-amber-500 bg-amber-50 px-1.5 py-[2px] rounded-md shrink-0 border border-amber-100/30">
                                <Sparkles size={9} className="fill-amber-400 text-amber-500" />
                                <span className="text-[9.5px] font-bold">{getStoreRating(store.id, store.rating)}</span>
                              </div>
                            </div>
                            
                            {/* المحافظة */}
                            <span className="font-tajawal text-[9px] sm:text-[10px] font-bold text-slate-400 leading-[1.1] truncate text-center w-full select-none" title={store.province}>
                              📍 {store.province}
                            </span>
                            
                            {/* فئة المتجر */}
                            <span className="font-tajawal text-[8px] sm:text-[9px] font-extrabold text-[#9952FF] bg-[#9952FF]/5 px-2 py-0.5 rounded-full leading-[1.1] truncate text-center w-full select-none" title={categoryLabel}>
                              {categoryLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* تاب تتبع طلباتي */}
          {activeTab === 'orders' && (
            <div className="space-y-6 animate-fade-in px-1">
              {/* تتبع الطلب المحدد من الإشعارات */}
              {targetOrderId && (
                <div className="bg-[#f5eeff] border border-[#e9daff] p-5 rounded-[2.5rem] flex flex-col sm:flex-row gap-3 items-center justify-between text-right shadow-2xs">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#b07aff] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[#9952FF]"></span>
                    </span>
                    <div>
                      <span className="text-xs font-black text-[#4D2980] font-tajawal block">عرض تفاصيل الطلب المحدد من التنبيهات</span>
                      <span className="text-[10px] font-bold text-[#9952FF] font-tajawal">رقم الطلب: {targetOrderId}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setTargetOrderId(null)} 
                    className="text-[10px] font-black text-[#4D2980] bg-white hover:bg-slate-50 px-4 py-2 rounded-2xl border border-[#e9daff] transition-colors cursor-pointer shrink-0"
                  >
                    إلغاء التصفية وعرض كل طلباتي
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-[#4D2980] flex items-center gap-2">
                  <div className="p-2 bg-[#e9daff] text-[#9952FF] rounded-xl">
                    <ClipboardList size={18} />
                  </div>
                  <span>تتبع طلباتك</span>
                </h2>
                <div className="text-[10px] text-slate-400 font-bold bg-slate-100 px-3 py-1 rounded-full">
                  إجمالي ({(targetOrderId ? customerOrders.filter(o => o.id === targetOrderId) : customerOrders).length})
                </div>
              </div>

              {(targetOrderId ? customerOrders.filter(o => o.id === targetOrderId) : customerOrders).length === 0 ? (
                <div className="py-20 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingBag size={40} className="text-slate-200" />
                  </div>
                  <p className="text-slate-500 font-black">لا توجد طلبات سابقة</p>
                  <p className="text-slate-400 text-[10px] mt-2 px-10 font-bold leading-relaxed">ابدأ بالتسوق من المتاجر المفضلة لديك لتظهر طلباتك هنا</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(targetOrderId ? customerOrders.filter(o => o.id === targetOrderId) : customerOrders).map(order => (
                    <div key={order.id} className="bg-white rounded-[2rem] border border-slate-100 p-4 sm:p-6 text-right shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col gap-5 min-w-0 w-full">
                      
                      {/* ترويسة الطلب */}
                      <div className="flex justify-between items-start gap-3 min-w-0 w-full">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                           <div className="p-2 sm:p-2.5 bg-[#9952FF] text-white rounded-2xl shadow-lg shadow-[#e9daff] shrink-0">
                             <StoreIcon size={18} />
                           </div>
                           <div className="min-w-0 flex-1">
                             <span className="text-[9px] sm:text-[10px] text-slate-400 font-black block mb-0.5 whitespace-nowrap">من متجر</span>
                             <h4 className="text-xs sm:text-sm font-black text-[#4D2980] leading-tight truncate" title={order.storeName}>{order.storeName}</h4>
                           </div>
                        </div>
                        <div className="text-left shrink-0">
                           <span className="block text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">إجمالي الطلب</span>
                           <span className="text-sm sm:text-base font-black text-[#9952FF] whitespace-nowrap">{(order.total || 0).toLocaleString()} <span className="text-[10px]">د.ع</span></span>
                        </div>
                      </div>

                      {/* حالة الطلب - الرسم البياني للتتبع */}
                      <div className="bg-slate-50/50 p-3 sm:p-4 rounded-3xl border border-slate-100 w-full min-w-0">
                        <div className="flex justify-between items-center mb-2 gap-2">
                           <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">تتبع الحالة</span>
                           <span className={`text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                              order.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                              order.status === 'accepted' ? 'bg-[#e9daff] text-[#9952FF]' :
                              order.status === 'shipped' ? 'bg-[#e9daff] text-[#9952FF]' :
                              order.status === 'delivered' ? 'bg-emerald-100 text-emerald-600' :
                              'bg-rose-100 text-rose-600'
                           }`}>
                             {order.status === 'pending' ? 'بانتظار المراجعة' :
                              order.status === 'accepted' ? 'قيد التحضير' :
                              order.status === 'shipped' ? 'في الطريق إليك' :
                              order.status === 'delivered' ? 'تم الاستلام' :
                              order.status === 'returned' ? 'مرتجع' :
                              order.status === 'replaced' ? 'تم الاستبدال' : 'مرفوض'}
                           </span>
                        </div>

                        {/* الخط الزمني المطور */}
                        <div className="relative h-1 bg-slate-200 rounded-full mt-4 flex items-center justify-between">
                           {/* مستوى التقدم */}
                           <div className={`absolute top-0 right-0 h-full bg-[#9952FF] rounded-full transition-all duration-700 ${
                              order.status === 'pending' ? 'w-0' :
                              order.status === 'accepted' ? 'w-1/3' :
                              order.status === 'shipped' ? 'w-2/3' :
                              order.status === 'delivered' ? 'w-full' : 'w-full !bg-rose-400'
                           }`} />
                           
                           {/* نقاط الحالة */}
                           {['pending', 'accepted', 'shipped', 'delivered'].map((s) => {
                              const isActive = order.status === s || (
                                 (s === 'pending' && ['accepted', 'shipped', 'delivered'].includes(order.status)) ||
                                 (s === 'accepted' && ['shipped', 'delivered'].includes(order.status)) ||
                                 (s === 'shipped' && order.status === 'delivered')
                              );
                              const isRejected = order.status === 'rejected' || order.status === 'returned';

                              return (
                                <div key={s} className="relative flex flex-col items-center">
                                  <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 transition-colors ${
                                    isActive ? 'bg-[#9952FF] scale-125' : isRejected ? 'bg-rose-400' : 'bg-slate-300'
                                  }`} />
                                </div>
                              );
                           })}
                        </div>
                        
                        <div className="flex justify-between mt-3 px-1">
                           {['استلام', 'موافقة', 'شحن', 'توصيل'].map((l, i) => (
                             <span key={i} className="text-[9px] font-black text-slate-400">{l}</span>
                           ))}
                        </div>
                      </div>

                      {/* تفاصيل الهوية والرفض */}
                      {(order.rejectionReason || order.returnReason) && (
                        <div className={`p-3 rounded-2xl border flex items-start gap-3 min-w-0 w-full ${
                          order.status === 'rejected' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-amber-50 border-amber-100 text-amber-700'
                        }`}>
                           <Info size={16} className="shrink-0 mt-0.5" />
                           <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                              <span className="text-[10px] font-black uppercase tracking-widest leading-none opacity-60">
                                {order.status === 'rejected' ? 'سبب الرفض' : 'معلومات الإرجاع'}
                              </span>
                              <p className="text-xs font-black truncate" title={order.rejectionReason || order.returnReason}>{order.rejectionReason || order.returnReason}</p>
                           </div>
                        </div>
                      )}

                      {/* المنتجات والتفاصيل المالية */}
                      <div className="space-y-3 min-w-0 w-full">
                         <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest gap-2 min-w-0">
                            <span className="shrink-0">المنتجات ({order.items.length})</span>
                            <div className="flex items-center gap-1 min-w-0 truncate">
                               <Calendar size={12} className="shrink-0" />
                               <span className="truncate">{formatSafeDateTimeString(order.createdAt, 'ar-IQ', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                         </div>
                         <div className="grid gap-2 max-h-[120px] overflow-y-auto no-scrollbar">
                           {order.items.map((item, idx) => (
                             <div key={idx} className="flex justify-between items-center gap-3 group min-w-0">
                               <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-slate-100 rounded-lg flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0">
                                    {item.quantity}
                                  </div>
                                  <span className="text-xs font-bold text-slate-700 truncate flex-1" title={item.productName}>{item.productName}</span>
                                </div>
                               <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap shrink-0">
                                 {((item.price || 0) * (item.quantity || 0)).toLocaleString()} د.ع
                               </span>
                             </div>
                           ))}
                         </div>
                         
                         {/* زر إلغاء الطلب الموقت */}
                         <CancelOrderButton order={order} onCancelClick={(o) => setOrderToCancel(o)} />

                         {/* تفاصيل التوصيل */}
                         <div className="pt-3 border-t border-slate-50 flex flex-col gap-2 min-w-0 w-full">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                                 <MapPin size={12} />
                              </div>
                              <span className="text-[11px] font-bold text-slate-500 whitespace-normal break-words flex-1" title={`عنوان التوصيل: ${order.customerProvince} - ${order.customerAddress}`}>
                                 عنوان التوصيل: {order.customerProvince} - {order.customerAddress}
                              </span>
                            </div>
                            {adminSettings?.enableMaps !== false && (order as any).customerLat && (order as any).customerLng && (
                              <div className="w-full h-24 rounded-xl overflow-hidden border border-slate-200 pointer-events-none relative mt-1 z-0">
                                <MapContainer 
                                  center={[(order as any).customerLat, (order as any).customerLng]} 
                                  zoom={14} 
                                  style={{ height: "100%", width: "100%", zIndex: 0 }}
                                  zoomControl={false}
                                  attributionControl={false}
                                  dragging={false}
                                  scrollWheelZoom={false}
                                  doubleClickZoom={false}
                                >
                                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                  <Marker position={[(order as any).customerLat, (order as any).customerLng]} />
                                </MapContainer>
                                <div className="absolute inset-0 z-[400] bg-transparent"></div>
                              </div>
                            )}
                         </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* تاب المحفظة ونظام النقاط */}
          {activeTab === 'wallet' && (
            <div className="space-y-6 animate-fade-in px-1">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-[#4D2980] flex items-center gap-2">
                  <div className="p-2 bg-[#e9daff] text-[#9952FF] rounded-xl">
                    <Wallet size={18} />
                  </div>
                  <span>محفظة النقاط والولاء</span>
                </h2>
              </div>

              <div className="bg-white rounded-[2rem] border border-slate-100 p-1.5 flex gap-1 shadow-sm">
                <button
                  onClick={() => setWalletView('points')}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${walletView === 'points' ? 'bg-[#9952FF] text-white shadow-lg shadow-[#e9daff]' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  النقاط والاستبدال
                </button>
                <button
                  onClick={() => setWalletView('gifts')}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${walletView === 'gifts' ? 'bg-amber-500 text-[#4D2980] shadow-lg shadow-amber-100' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  الجوائز والأكواد
                </button>
              </div>

              {walletView === 'points' && (
                <div className="space-y-6">
                  {/* كارد النقاط ونظام المستويات المحسن */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-[#4D2980] via-slate-950 to-black rounded-[2.5rem] p-5 text-white shadow-2xl shadow-slate-200 border-b border-white/5">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#9952FF]/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full -ml-24 -mb-24 blur-3xl"></div>
                    
                    <div className="relative z-10">
                      {/*Header: Balance & Badge*/}
                      <div className="flex justify-between items-center mb-5">
                        <div className="text-right">
                          <h2 className="text-[11px] font-black text-slate-400 mb-1 flex items-center gap-1.5">
                             <Award size={14} className="text-[#b07aff]" />
                             رصيدك من النقاط
                          </h2>
                          <div className="flex items-baseline gap-1">
                             <span className="text-3xl font-black text-white leading-none tracking-tighter">
                                {currentCustomer?.points || 0}
                             </span>
                             <span className="text-[10px] font-black text-[#b07aff]">نقطة</span>
                          </div>
                        </div>
                        
                        <div className={`p-2.5 rounded-2xl backdrop-blur-xl border flex flex-col items-center justify-center min-w-[65px] shadow-lg ${
                          currentCustomer?.tier === 'Diamond' ? 'bg-[#9952FF]/10 border-[#9952FF]/20 text-[#b07aff] shadow-[#9952FF]/50' : 
                          currentCustomer?.tier === 'Platinum' ? 'bg-slate-400/10 border-slate-400/20 text-slate-300 shadow-slate-400/10' : 
                          currentCustomer?.tier === 'Gold' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-amber-500/10' : 
                          'bg-orange-500/10 border-orange-500/20 text-orange-400 shadow-orange-500/10'
                        }`}>
                           <Star size={18} fill="currentColor" className="mb-0.5" />
                           <span className="text-[9px] font-black uppercase tracking-widest">{currentCustomer?.tier || 'Silver'}</span>
                        </div>
                      </div>

                      {/* Levels Progress Section */}
                      <div className="bg-white/5 rounded-3xl p-4 border border-white/5">
                        <div className="flex justify-between items-end mb-3">
                           <div className="text-right">
                              <span className="text-[10px] text-slate-400 font-bold block mb-1">المستوى التالي</span>
                              <p className="text-[11px] font-black text-white">
                                 {currentCustomer?.tier === 'Silver' && 'الذهبي (متبقي ' + (Math.max(0, 5 - (currentCustomer?.monthlyOrdersCount || 0))) + ' طلب)'}
                                 {currentCustomer?.tier === 'Gold' && 'البلاتيني (متبقي ' + (Math.max(0, 10 - (currentCustomer?.monthlyOrdersCount || 0))) + ' طلب)'}
                                 {currentCustomer?.tier === 'Platinum' && 'الماسي (متبقي ' + (Math.max(0, 15 - (currentCustomer?.monthlyOrdersCount || 0))) + ' طلب)'}
                                 {currentCustomer?.tier === 'Diamond' && 'أعلى مستوى متاح 🔥'}
                              </p>
                           </div>
                           <span className="text-[10px] font-black text-[#b07aff]">
                              {currentCustomer?.monthlyOrdersCount} / {currentCustomer?.tier === 'Silver' ? 5 : currentCustomer?.tier === 'Gold' ? 10 : 15}
                           </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/10 relative">
                           <motion.div 
                              initial={{ width: 0 }}
                              animate={{ 
                                width: currentCustomer?.tier === 'Silver' ? `${Math.min(((currentCustomer?.monthlyOrdersCount || 0) / 5) * 100, 100)}%` :
                                       currentCustomer?.tier === 'Gold' ? `${Math.min(((currentCustomer?.monthlyOrdersCount || 0) / 10) * 100, 100)}%` :
                                       currentCustomer?.tier === 'Platinum' ? `${Math.min(((currentCustomer?.monthlyOrdersCount || 0) / 15) * 100, 100)}%` : '100%'
                              }}
                              className={`h-full rounded-full relative ${
                                currentCustomer?.tier === 'Diamond' ? 'bg-[#b07aff]' : 
                                currentCustomer?.tier === 'Platinum' ? 'bg-slate-300' : 
                                currentCustomer?.tier === 'Gold' ? 'bg-amber-400' : 'bg-orange-400'
                              }`}
                           >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                           </motion.div>
                        </div>

                        {/* Tiers Visual Indicator */}
                        <div className="flex justify-between mt-4 px-1">
                           {[
                             { name: 'فضي', icon: 'S', color: 'orange', orders: 0, key: 'Silver' },
                             { name: 'ذهبي', icon: 'G', color: 'amber', orders: 5, key: 'Gold' },
                             { name: 'بلاتيني', icon: 'P', color: 'slate', orders: 10, key: 'Platinum' },
                             { name: 'ماسي', icon: 'D', color: 'blue', orders: 15, key: 'Diamond' }
                           ].map((tier, i) => {
                             const isCurrent = currentCustomer?.tier === tier.key;
                             const isAchieved = (currentCustomer?.monthlyOrdersCount || 0) >= tier.orders;
                             
                             return (
                               <div key={i} className="flex flex-col items-center gap-1.5 min-w-[40px]">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                                    isCurrent 
                                    ? tier.key === 'Diamond' ? 'bg-[#9952FF] text-white ring-4 ring-[#9952FF]/20 scale-110 shadow-lg' :
                                      tier.key === 'Platinum' ? 'bg-slate-400 text-white ring-4 ring-slate-400/20 scale-110 shadow-lg' :
                                      tier.key === 'Gold' ? 'bg-amber-500 text-white ring-4 ring-amber-500/20 scale-110 shadow-lg' :
                                      'bg-orange-500 text-white ring-4 ring-orange-500/20 scale-110 shadow-lg'
                                    : isAchieved 
                                      ? 'bg-[#9952FF] text-white opacity-60' 
                                      : 'bg-white/5 text-slate-500 border border-white/10'
                                  }`}>
                                     {tier.icon}
                                  </div>
                                  <span className={`text-[9px] font-black transition-colors ${
                                    isCurrent 
                                    ? tier.key === 'Diamond' ? 'text-[#b07aff]' :
                                      tier.key === 'Platinum' ? 'text-slate-300' :
                                      tier.key === 'Gold' ? 'text-amber-400' :
                                      'text-orange-400'
                                    : isAchieved ? 'text-[#b07aff]' : 'text-slate-600'
                                  }`}>
                                     {tier.name}
                                  </span>
                               </div>
                             );
                           })}
                        </div>
                      </div>
                    </div>
                  </div>


                  {/* عروض استبدال النقاط */}
                  <div className="space-y-4">
                     <h3 className="text-xs font-black text-slate-500 mr-2 uppercase tracking-widest">متجر المكافآت</h3>
                     <div className="grid gap-3">
                        {[
                          { points: 150, discount: 5000, title: 'كوبون برونزي للخصم المباشر' },
                          { points: 300, discount: 10000, title: 'كوبون فضي للتوفير السريع' },
                          { points: 450, discount: 15000, title: 'كوبون ذهبي مذهل للمشتريات' },
                          { points: 600, discount: 20000, title: 'كوبون بلاتيني فخم ومميز' },
                          { points: 750, discount: 25000, title: 'كوبون ماسي ملكي فائق التوفير' },
                        ].map((pkg, idx) => {
                          const canRedeem = (currentCustomer?.points || 0) >= pkg.points;
                          return (
                            <div key={idx} className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow relative overflow-hidden">
                               <div className="flex items-center gap-4 text-right">
                                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${canRedeem ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-300'}`}>
                                     <Gift size={24} />
                                  </div>
                                  <div>
                                     <h4 className="font-black text-[#4D2980] text-sm">خصم {(pkg.discount || 0).toLocaleString()} د.ع</h4>
                                     <p className="text-[10px] text-slate-400 font-bold">{pkg.title}</p>
                                  </div>
                               </div>
                               <button 
                                 onClick={() => handleRedeemPoints(pkg.points)}
                                 disabled={!canRedeem}
                                 className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all active:scale-95 ${
                                   canRedeem ? 'bg-[#9952FF] text-white shadow-lg shadow-[#e9daff]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                 }`}
                               >
                                  استبدال بـ {pkg.points}
                               </button>
                            </div>
                          );
                        })}
                     </div>
                  </div>

                  {/* معلومات الشحن */}
                  <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                           <Zap size={18} />
                        </div>
                        <h3 className="font-black text-[#4D2980] text-sm">شحن نقاط عبر كود</h3>
                     </div>
                     <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="أدخل الكود هنا..." 
                          className="flex-1 bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl text-[10px] font-black outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all text-center tracking-widest uppercase"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                        />
                        <button 
                          onClick={handleActivatePromo}
                          className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] hover:bg-emerald-700 transition shadow-lg shadow-emerald-100 active:scale-95"
                        >
                          تفعيل
                        </button>
                     </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100/50">
                    <p className="text-[11px] font-black text-[#4D2980] mb-3 flex items-center gap-2">
                       <Award size={16} className="text-[#9952FF]" />
                       💰 كيف تكسب النقاط؟
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold mb-4">
                       يمكنك زيادة رصيد نقاطك بطرق سهلة وممتعة:
                    </p>
                    <ul className="space-y-4 text-slate-600">
                       <li className="flex items-start gap-3 text-[10.5px] font-bold text-right">
                          <span className="text-base select-none shrink-0 leading-none">🛒</span>
                          <div>
                            <span className="block text-[#4D2980] font-black text-right">عند كل طلب مكتمل</span>
                            <span className="text-[9.5px] text-slate-400 font-medium text-right block">كل 1000 د.ع تنفقها تمنحك نقطة واحدة تلقائياً.</span>
                          </div>
                       </li>
                       <li className="flex items-start gap-3 text-[10.5px] font-bold text-right">
                          <span className="text-base select-none shrink-0 leading-none">🆙</span>
                          <div>
                            <span className="block text-[#4D2980] font-black text-right">ترقية المستوى</span>
                            <span className="text-[9.5px] text-slate-400 font-medium block text-right">احصل على نقاط هدية عند صعود مستواك:</span>
                            <div className="grid grid-cols-3 gap-1.5 mt-2 bg-white/60 p-2 rounded-xl border border-slate-200/50 text-center">
                              <div>
                                <span className="text-[8.5px] font-black text-amber-600 block">المستوى الثاني</span>
                                <span className="text-[9.5px] font-black text-[#4D2980]">+100 نقطة</span>
                              </div>
                              <div className="border-x border-slate-200">
                                <span className="text-[8.5px] font-black text-slate-500 block">المستوى الثالث</span>
                                <span className="text-[9.5px] font-black text-[#4D2980]">+125 نقطة</span>
                              </div>
                              <div>
                                <span className="text-[8.5px] font-black text-[#9952FF] block">المستوى الرابع</span>
                                <span className="text-[9.5px] font-black text-[#4D2980]">+150 نقطة</span>
                              </div>
                            </div>
                            <span className="text-[8.5px] text-rose-500 font-extrabold mt-1.5 block text-right">💡 ملاحظة: يتم تصفير المستوى شهرياً.</span>
                          </div>
                       </li>
                       <li className="flex items-start gap-3 text-[10.5px] font-bold text-right">
                          <span className="text-base select-none shrink-0 leading-none">📱</span>
                          <div>
                            <span className="block text-[#4D2980] font-black text-right">مشاركة التطبيق</span>
                            <span className="text-[9.5px] text-slate-400 font-medium text-right block">شارك رابط التطبيق عبر الواتساب واحصل على 5 نقاط هدية.</span>
                          </div>
                       </li>
                       <li className="flex items-start gap-3 text-[10.5px] font-bold text-right">
                          <span className="text-base select-none shrink-0 leading-none">⭐</span>
                          <div>
                            <span className="block text-[#4D2980] font-black text-right">تقييم المتجر</span>
                            <span className="text-[9.5px] text-slate-400 font-medium text-right block">شاركنا رأيك وقيّمنا لتحصل على 5 نقاط إضافية.</span>
                          </div>
                       </li>
                    </ul>
                    
                    {/* القاعدة الذهبية */}
                    <div className="mt-5 pt-4 border-t border-dashed border-slate-200">
                      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start gap-2.5">
                        <span className="text-lg leading-none shrink-0">👑</span>
                        <div>
                          <h4 className="font-black text-amber-800 text-[11px] mb-0.5 text-right">قاعدة ذهبية</h4>
                          <p className="text-[10px] font-black text-amber-700 leading-relaxed text-right">
                            كل 150 نقطة تعادل 5,000 دينار عراقي خصم مباشر من مشترياتك!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {walletView === 'gifts' && (() => {
                const pointCodes = promoCodes.filter(p => p.source === 'points' && p.ownerCustomerId === currentCustomer?.id);
                const giftCodes = promoCodes.filter(p => p.status === 'active' && (
                  p.storeId === 'ALL_STORES' || currentCustomer?.storeNotifications.includes(p.storeId || '') || currentCustomer?.followedStores.includes(p.storeId || '')
                ));
                const allCodes = [...pointCodes, ...giftCodes];
                
                return (
                  <div className="space-y-6 animate-fade-in">
                    {/* Header Card */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-[#9952FF] via-[#8040DF] to-[#4D2980] rounded-[2.5rem] p-8 text-white shadow-2xl shadow-[#e9daff] relative overflow-hidden"
                    >
                       <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse"></div>
                       <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#b07aff]/20 rounded-full -ml-24 -mb-24 blur-2xl"></div>
                       
                       <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-right">
                          <div className="p-4 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20">
                             <Gift size={48} className="text-amber-400" />
                          </div>
                          <div className="flex-1">
                             <h3 className="font-black text-2xl mb-2">الأكواد والجوائز</h3>
                             <p className="text-sm font-medium opacity-80 leading-relaxed max-w-md mx-auto md:mr-0">
                                استمتع بمكافآتك الحصرية! هنا تجد جميع كوبونات الخصم التي حصلت عليها من استبدال النقاط أو هدايا المتاجر.
                             </p>
                          </div>
                       </div>
                    </motion.div>

                    {/* شحن نقاط عبر كود */}
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col gap-4"
                    >
                        <div className="flex items-center justify-between">
                            <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
                                <Zap size={24} />
                            </div>
                            <div className="text-right">
                                <h3 className="text-sm font-black text-[#4D2980]">شحن نقاط عبر كود</h3>
                                <p className="text-[10px] text-slate-400 font-bold">أدخل كود الشحن للحصول على نقاط فورية</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="أدخل الكود هنا..."
                                value={rechargeCodeInput}
                                onChange={(e) => setRechargeCodeInput(e.target.value.toUpperCase())}
                                className="flex-1 bg-slate-50 border-none p-4 rounded-3xl text-sm text-center font-black focus:ring-2 focus:ring-emerald-500 transition-all placeholder:font-bold"
                            />
                            <button 
                                onClick={handleRedeemCode}
                                disabled={isRedeeming || !rechargeCodeInput.trim()}
                                className="bg-emerald-600 text-white px-8 rounded-3xl font-black text-xs hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isRedeeming ? <RefreshCw className="animate-spin" size={18} /> : 'تفعيل'}
                            </button>
                        </div>
                    </motion.div>

                    {allCodes.length === 0 ? (
                      <div className="py-24 text-center bg-white rounded-[3rem] border border-slate-100 shadow-sm px-10">
                        <div className="relative inline-block mb-8">
                           <div className="w-24 h-24 bg-[#f5eeff] rounded-full flex items-center justify-center animate-bounce duration-[3000ms]">
                              <Ticket size={48} className="text-[#e9daff]" />
                           </div>
                           <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white shadow-md rounded-2xl flex items-center justify-center">
                              <Search size={20} className="text-[#9952FF]" />
                           </div>
                        </div>
                        <h4 className="text-[#4D2980] font-black text-lg mb-2">لا توجد أكواد حالياً</h4>
                        <p className="text-slate-400 text-xs font-bold leading-relaxed max-w-xs mx-auto">
                           يمكنك الحصول على أكواد عبر استبدال نقاطك أو بمتابعة متاجرك المفضلة للحصول على هداياهم الحصرية.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-6">
                        <AnimatePresence>
                        {allCodes.map((p, idx) => {
                          const isCopied = copiedId === (p.objectId || p.id || idx.toString());
                          const dateObj = p.createdAt ? new Date(p.createdAt) : null;
                          const formattedDate = dateObj && !isNaN(dateObj.getTime()) 
                            ? dateObj.toLocaleDateString('ar-IQ', { day: 'numeric', month: 'long' }) 
                            : 'كود جديد';
                          
                          return (
                            <motion.div 
                              key={p.objectId || p.id || idx}
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3, delay: idx * 0.05 }}
                              className="group relative"
                            >
                               {/* Coupon Card */}
                               <div className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex">
                                  {/* Left Section (Punch Box) */}
                                  <div className={`w-20 sm:w-28 flex flex-col items-center justify-center border-r border-dashed border-slate-200 relative ${p.source === 'points' ? 'bg-[#f5eeff]' : 'bg-amber-50'}`}>
                                     {/* Punch Holes */}
                                     <div className="absolute -top-3 -right-3 w-6 h-6 bg-slate-50 rounded-full border border-slate-100 shadow-inner"></div>
                                     <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-slate-50 rounded-full border border-slate-100 shadow-inner"></div>
                                     
                                     <div className={`p-3 rounded-2xl mb-2 ${p.source === 'points' ? 'bg-[#e9daff] text-[#9952FF]' : 'bg-amber-100 text-amber-600'}`}>
                                        {p.source === 'points' ? <Sparkles size={24} /> : <Gift size={24} />}
                                     </div>
                                     <span className={`text-[10px] font-black uppercase tracking-tighter ${p.source === 'points' ? 'text-[#9952FF]' : 'text-amber-600'}`}>
                                        {p.source === 'points' ? 'نقاط' : 'هدية'}
                                     </span>
                                  </div>

                                  {/* Middle Content */}
                                  <div className="flex-1 p-5 sm:p-7 text-right">
                                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                                        <div>
                                           <div className="flex items-center gap-2 mb-1">
                                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                              <h4 className="text-[10px] sm:text-xs font-black text-slate-400">
                                                 {p.source === 'points' ? 'كوبون استبدال النقاط' : 'مكافأة من المتجر'}
                                              </h4>
                                           </div>
                                           <div className="flex items-baseline gap-1">
                                              <span className="text-2xl font-black text-[#4D2980]">
                                                 {(p.discountValue || p.amount || 0).toLocaleString()}
                                              </span>
                                              <span className="text-xs font-black text-slate-500">د.ع</span>
                                           </div>
                                        </div>
                                        <div className="px-3 py-1 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2 select-none">
                                           <Calendar size={12} className="text-slate-400" />
                                           <span className="text-[9px] text-slate-500 font-bold">{formattedDate}</span>
                                        </div>
                                     </div>

                                     {/* Code Area */}
                                     <div className="relative group/code">
                                        <div className={`bg-slate-50 border-2 border-dashed ${isCopied ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200'} p-4 rounded-2xl transition-all flex items-center justify-between group-hover/code:border-[#cba8ff]`}>
                                           <div className="flex items-center gap-3">
                                              <code className={`text-lg font-black tracking-widest ${isCopied ? 'text-emerald-600' : 'text-[#9952FF]'}`}>
                                                 {p.code}
                                              </code>
                                           </div>
                                           
                                           <button 
                                              onClick={() => {
                                                navigator.clipboard.writeText(p.code);
                                                setCopiedId(p.objectId || p.id || idx.toString());
                                                setTimeout(() => setCopiedId(null), 2000);
                                              }}
                                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all ${
                                                isCopied 
                                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
                                                : 'bg-white text-slate-600 border border-slate-200 hover:border-[#9952FF] hover:text-[#9952FF] active:scale-95'
                                              }`}
                                           >
                                              {isCopied ? (
                                                <>
                                                  <Check size={14} />
                                                  تم النسخ
                                                </>
                                              ) : (
                                                <>
                                                  <Copy size={14} />
                                                  نسخ الكود
                                                </>
                                              )}
                                           </button>
                                        </div>
                                        
                                        {/* Mobile Tap Tip */}
                                        <div className="mt-2 text-center">
                                           <p className="text-[9px] text-slate-400 font-bold flex items-center justify-center gap-1">
                                              <Info size={10} />
                                              استخدم هذا الكود عند الدفع للحصول على الخصم
                                           </p>
                                        </div>
                                     </div>
                                  </div>
                               </div>
                            </motion.div>
                          );
                        })}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* تاب حسابي - تصميم فاخر يجمع بين البيانات والإعدادات */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fade-in px-1">
              {/* بطاقة المستخدم الرئيسية */}
              <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm relative overflow-hidden text-center group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-[#f5eeff] rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                 
                 <div className="relative z-10">
                    <div className="relative inline-block mb-4 sm:mb-4">
                       <div className="w-20 h-20 rounded-[1.8rem] bg-[#9952FF] flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-[#e9daff] border-4 border-white">
                          {currentCustomer?.name?.charAt(0)}
                       </div>
                       <div className="absolute -bottom-1 -left-1 w-8 h-8 bg-emerald-500 text-white border-4 border-white rounded-2xl flex items-center justify-center shadow-lg">
                          <Check size={14} />
                       </div>
                    </div>
                    <h2 className="text-xl font-black text-[#4D2980] mb-0.5">{currentCustomer?.name}</h2>
                    <div className="flex items-center justify-center gap-1.5 mb-5 select-none">
                       <Phone size={10} className="text-[#b07aff]" />
                       <span className="text-slate-400 font-black text-[10px] tracking-widest">{currentCustomer?.phone}</span>
                    </div>
                    
                    <div className="flex items-center justify-center gap-3">
                       <div className="px-5 py-2 bg-slate-50 border border-slate-100 rounded-2xl shrink-0">
                          <span className="text-[10px] text-slate-400 font-black block">الرصيد</span>
                          <span className="text-sm font-black text-[#4D2980]">{(currentCustomer as any)?.balance?.toLocaleString() || '0'} د.ع</span>
                       </div>
                       <div className="px-5 py-2 bg-amber-50 border border-amber-100 rounded-2xl shrink-0">
                          <span className="text-[10px] text-amber-500 font-black block">النقاط</span>
                          <span className="text-sm font-black text-amber-600">{currentCustomer?.points} 🪙</span>
                       </div>
                    </div>
                 </div>
              </div>

              {/* قائمة الفيديوهات المحفوظة والمعجب بها التفاعلية الجديدة */}
              <ReelsProfileList 
                currentCustomer={currentCustomer}
                onAddToCart={(p) => addToCart(p, 1)}
                onShareReel={(reel) => openShareModal('reel', reel)}
                onVisitStore={(storeId) => {
                  const foundStore = stores.find(s => s.id === storeId);
                  if (foundStore) {
                    setSelectedStore(foundStore);
                  }
                }}
              />

              {/* أقسام البيانات والإعدادات */}
              <div className="space-y-4">
                  {/* 1. البيانات الشخصية */}
                  <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                     <div className="p-6 space-y-6">
                       <div className="grid md:grid-cols-2 gap-4">
                           <div>
                             <label className="block text-[10px] font-black text-slate-400 mb-2 mr-1">رقم الهاتف (لا يمكن تغييره)</label>
                             <div className="flex items-center gap-3 bg-slate-100 border border-slate-200 px-4 py-3.5 rounded-2xl opacity-60">
                                <Phone size={14} className="text-slate-400" />
                                <span className="text-xs font-black text-slate-500 tracking-wider">
                                   {currentCustomer?.phone}
                                </span>
                                <div className="mr-auto">
                                   <Lock size={12} className="text-slate-400" />
                                </div>
                             </div>
                           </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 mb-2 mr-1">الاسم الكامل</label>
                            <input 
                              type="text" 
                              value={profileForm.name} 
                              onChange={e => setProfileForm(prev => ({...prev, name: e.target.value}))} 
                              className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 rounded-2xl text-xs font-black focus:ring-4 focus:ring-[#9952FF]/5 focus:border-[#9952FF] transition-all outline-none" 
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-2 mr-1">المحافظة</label>
                                <select 
                                  value={profileForm.province} 
                                  onChange={e => setProfileForm(prev => ({...prev, province: e.target.value}))} 
                                  className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 rounded-2xl text-xs font-black focus:ring-4 focus:ring-[#9952FF]/5 focus:border-[#9952FF] transition-all outline-none appearance-none"
                                >
                                   {provinces.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                </select>
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-2 mr-1">المنطقة</label>
                                <input 
                                  type="text" 
                                  value={profileForm.area} 
                                  onChange={e => setProfileForm(prev => ({...prev, area: e.target.value}))} 
                                  className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 rounded-2xl text-xs font-black focus:ring-4 focus:ring-[#9952FF]/5 focus:border-[#9952FF] transition-all outline-none" 
                                />
                             </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-2 mr-1">محلة</label>
                                <input type="text" placeholder="محلة" value={profileForm.mahalla} onChange={e => setProfileForm(prev => ({...prev, mahalla: e.target.value}))} className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-xs font-black focus:outline-none focus:ring-2 focus:ring-[#9952FF]/20" />
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-2 mr-1">زقاق</label>
                                <input type="text" placeholder="زقاق" value={profileForm.zuqaq} onChange={e => setProfileForm(prev => ({...prev, zuqaq: e.target.value}))} className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-xs font-black focus:outline-none focus:ring-2 focus:ring-[#9952FF]/20" />
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-2 mr-1">دار</label>
                                <input type="text" placeholder="دار" value={profileForm.dar} onChange={e => setProfileForm(prev => ({...prev, dar: e.target.value}))} className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-xs font-black focus:outline-none focus:ring-2 focus:ring-[#9952FF]/20" />
                             </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 mb-2 mr-1">أقرب نقطة دالة</label>
                            <input type="text" value={profileForm.landmark} onChange={e => setProfileForm(prev => ({...prev, landmark: e.target.value}))} className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 rounded-2xl text-xs font-black focus:ring-4 focus:ring-[#9952FF]/5 focus:border-[#9952FF] transition-all outline-none" />
                          </div>
                       </div>
              {/* موقع الخارطة */}
              <div className="space-y-3 pt-4 border-t border-slate-50 mt-4">
                 <h4 className="text-[10px] font-black text-[#9952FF] uppercase tracking-widest px-1 flex items-center gap-1.5">
                    <MapPin size={12} />
                    تحديث موقعك على الخريطة
                 </h4>
                 <LocationPicker 
                   initialLat={profileForm.lat}
                   initialLng={profileForm.lng}
                   onLocationSelect={(lat, lng) => {
                     setProfileForm(prev => ({...prev, lat, lng}));
                   }}
                   label="تحديد موقع التوصيل بدقة"
                 />
              </div>

              <div className="pt-4 px-2">
                          <button 
                            onClick={handleSaveProfile}
                            className="w-full py-4 bg-[#9952FF] text-white rounded-2xl text-sm font-black shadow-lg shadow-[#e9daff] hover:bg-[#4D2980] transition-all active:scale-[0.98]"
                          >
                            حفظ التغييرات
                          </button>
                       </div>


                    </div>
                  </div>

                  {/* 2. خيارات أخرى */}
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => { setShowPasswordChange(true); setPwStep(1); }}
                      className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:border-[#e9daff] transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                         <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl group-hover:bg-[#9952FF] group-hover:text-white transition-colors">
                            <Shield size={20} />
                         </div>
                         <div className="text-right">
                            <span className="text-sm font-black text-[#4D2980] block">تغيير كلمة المرور</span>
                            <span className="text-[10px] text-slate-400 font-bold">تحديث أمان حسابك</span>
                         </div>
                      </div>
                      <ChevronLeft size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </button>



                    <button 
                      onClick={() => openExternalUrl("https://wa.me/9647735187868")} 
                      className="w-full text-right bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:border-emerald-200 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                         <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <MessageCircle size={20} />
                         </div>
                         <div className="text-right">
                            <span className="text-sm font-black text-[#4D2980] block">الدعم الفني والواتساب</span>
                            <span className="text-[10px] text-slate-400 font-bold">تحدث معنا مباشرة</span>
                         </div>
                      </div>
                      <ChevronLeft size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform animate-pulse" />
                    </button>
                  </div>
              </div>

              {/* تسجيل الخروج */}
              <div className="pt-4 space-y-4 pb-20">
                 <button 
                  onClick={handleLogout}
                  className="w-full py-5 bg-rose-50 text-rose-600 rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 border border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95"
                 >
                    <LogOut size={20} />
                    <span>تسجيل الخروج من الحساب</span>
                 </button>

              </div>

              {/* مودال تغيير كلمة المرور */}
              {showPasswordChange && (
                <div className="fixed inset-0 bg-[#4D2980]/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                  <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-scale-up overflow-hidden border border-white/20">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-[#e9daff] text-[#9952FF] rounded-xl">
                             <Shield size={18} />
                          </div>
                          <h3 className="font-black text-[#4D2980] text-sm">تغيير كلمة المرور</h3>
                       </div>
                       <button onClick={() => { setShowPasswordChange(false); setPwStep(1); setOtpPwCode(''); setNewPassword(''); }} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all"><X size={18} className="text-slate-400" /></button>
                    </div>
                    <div className="p-8 space-y-6">
                      {pwStep === 1 ? (
                        <>
                          <div className="text-center bg-[#f5eeff] p-6 rounded-3xl mb-4 border border-[#e9daff]">
                             <p className="text-[11px] font-black text-[#9952FF] leading-relaxed">سنقوم بإرسال رمز التحقق (OTP) إلى رقم هاتفك المسجل لتأكيد هويتك</p>
                          </div>
                          <div className="space-y-4">
                             <input type="tel" value={currentCustomer?.phone} disabled className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center text-sm font-black text-slate-400" />
                             <button onClick={async () => {
                                if (!currentCustomer) return;
                                const code = Math.floor(100000 + Math.random() * 900000).toString();
                                setSentOtpCode(code);
                                const ok = await sendOTP(currentCustomer.phone, code, 'forgot');
                                setPwStep(2);
                                if (ok) alert("تم الإرسال!");
                             }} className="w-full py-4 bg-[#9952FF] text-white font-black text-sm rounded-2xl shadow-xl shadow-[#e9daff] hover:bg-[#4D2980] transition active:scale-95">إرسال رمز التحقق</button>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-5">
                          <div className="space-y-4">
                             <input 
                               type="text" 
                               value={otpPwCode} 
                               onChange={e => setOtpPwCode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                               placeholder="إدخال الرمز" 
                               className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center text-lg font-black tracking-[0.5em] focus:ring-4 focus:ring-[#9952FF]/5 focus:border-[#9952FF] outline-none transition-all placeholder:tracking-normal placeholder:text-[10px]" 
                             />
                             <div className="relative">
                                <input 
                                  type="password" 
                                  value={newPassword} 
                                  onChange={e => setNewPassword(e.target.value)} 
                                  placeholder="كلمة المرور الجديدة (8+ رموز)" 
                                  className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center text-sm font-black focus:ring-4 focus:ring-[#9952FF]/5 focus:border-[#9952FF] outline-none transition-all" 
                                />
                             </div>
                             <button onClick={handleChangePassword} className="w-full py-4 bg-emerald-600 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition active:scale-95">تحديث كلمة المرور</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
        </>
        )}
        {activeTab !== 'reels' && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200/60 z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.03)] select-none">
          <div className="max-w-4xl mx-auto w-full flex justify-around items-center px-4 py-3">
            {[
              { id: 'stores', label: 'الرئيسية', icon: Home },
              { id: 'reels', label: 'الفيديو', icon: Tv },
              { id: 'merchants', label: 'المتاجر', icon: StoreIcon },
              { id: 'orders', label: 'طلباتي', icon: ClipboardList, badge: customerOrders.filter(o => o.status === 'pending').length },
              { id: 'wallet', label: 'المحفظة', icon: Wallet, gift: currentCustomer.points >= 100 },
              { id: 'profile', label: 'حسابي', icon: User }
            ].map((tab) => {
              const active = activeTab === tab.id && !selectedStore;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex flex-col items-center px-2 py-1.5 rounded-xl transition-all duration-300 relative ${active ? 'text-[#9952FF] scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <div className={`p-1.5 rounded-lg mb-1 transition-all ${active ? 'bg-[#9952FF] text-white shadow-md' : 'bg-transparent'}`}>
                    <tab.icon size={18} className="w-5 h-5" />
                  </div>
                  
                  {(tab.badge || 0) > 0 && (
                    <span className="absolute top-0 right-2 w-4 h-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white ring-px ring-rose-200 animate-pulse">
                      {tab.badge}
                    </span>
                  )}

                  {tab.gift && (
                    <span className="absolute top-0 right-2 bg-yellow-500 text-[#4D2980] text-[8px] px-1.5 rounded-full font-black animate-bounce shadow-sm border border-white">
                      🎁
                    </span>
                  )}

                  <span className={`text-[9px] font-bold tracking-tighter transition-all ${active ? 'opacity-100' : 'opacity-70'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
        )}

        {/* زر عائم تفاعلي للرجوع للمتاجر عند التصفح كلياً */}
        {selectedStore && (
          <div className="fixed bottom-24 left-6 z-[60]">
            <button 
              onClick={() => setSelectedStore(null)}
              className="px-4 py-3 bg-gradient-to-r from-[#4D2980] to-[#9952FF] text-white hover:from-[#381a66] hover:to-[#4D2980] rounded-full flex items-center gap-2 shadow-xl shadow-purple-500/30 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer font-black text-xs border border-white/20 font-tajawal"
              title="رجوع"
            >
              <ChevronRight size={16} />
              <span>رجوع</span>
            </button>
          </div>
        )}

        {/* سلة المشتريات (Drawer) - تصميم مصغر ومحسن ليتناسق مع المتجر */}
        {showCart && (
          <div className="fixed inset-0 bg-[#4D2980]/40 backdrop-blur-xs z-55 flex justify-end">
            <div className="bg-white w-full max-w-[335px] h-full shadow-xl flex flex-col animate-slide-left text-right border-r border-slate-100 font-tajawal">
              
              <div className="p-3 bg-[#4D2980] text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowCart(false)}
                    className="p-1 px-2 border border-white/20 rounded-lg hover:bg-white/10 transition-all flex items-center gap-0.5 font-bold text-[9px]"
                  >
                    <ChevronRight size={12} />
                    <span>رجوع</span>
                  </button>
                  <div className="flex items-center space-x-1.5 space-x-reverse">
                    <ShoppingBag size={16} />
                    <h3 className="text-xs font-black">سلة المشتريات ({cart.reduce((acc, curr) => acc + curr.quantity, 0)})</h3>
                  </div>
                </div>
                <button onClick={() => setShowCart(false)} className="p-1 hover:bg-[#4D2980] rounded-lg shrink-0">
                  <X size={16} />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-gray-400">
                  <ShoppingBag size={48} className="mb-3 text-gray-200" />
                  <p className="font-bold text-xs">سلة مشترياتك فارغة!</p>
                  <p className="text-[10px] mt-1 text-center text-slate-400">أضف منتجات من المتاجر لبدء الطلب.</p>
                  <button onClick={() => setShowCart(false)} className="mt-4 px-4 py-1.5 bg-[#9952FF] hover:bg-[#4D2980] text-white font-bold text-[10px] rounded-lg shadow-xs transition">تصفح المتاجر الآن</button>
                </div>
              ) : (
                <>
                  {/* تنبيه الطلب من عدة متاجر */}
                  {Object.keys(cartByStore).length > 1 && (
                    <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-100 text-[8.5px] font-bold text-amber-700 text-center">
                      ⚠️ أنت تطلب من {Object.keys(cartByStore).length} متاجر مختلفة - سيتم إرسال طلب منفصل لكل متجر
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {/* معلومات العنوان المختار داخل السلة مع إمكانية التغيير */}
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <div className="p-1.5 bg-white text-[#9952FF] rounded-lg shadow-3xs border border-slate-100 shrink-0">
                              <MapPin size={14} />
                           </div>
                           <div className="text-right min-w-0">
                              <p className="text-[8.5px] font-black text-slate-400 mb-0.5">عنوان التوصيل الحالي</p>
                              <p className="text-[9.5px] font-black text-slate-700 leading-tight whitespace-normal break-words">
                                {currentCustomer?.province} {currentCustomer?.address ? `- ${currentCustomer.address}` : ''}
                              </p>
                           </div>
                        </div>
                        <button 
                          onClick={() => { setShowCart(false); setActiveTab('profile'); }}
                          className="p-1.5 text-[#9952FF] hover:bg-[#f5eeff] rounded-lg transition-all shrink-0"
                          title="تغيير العنوان"
                        >
                           <RefreshCw size={14} />
                        </button>
                      </div>
                      
                      {/* الخريطة المصغرة في السلة */}
                      {adminSettings?.enableMaps !== false && currentCustomer?.lat && currentCustomer?.lng && (
                        <div className="w-full h-24 rounded-xl overflow-hidden border border-slate-200 pointer-events-none relative mt-2 z-0">
                          <MapContainer 
                            center={[currentCustomer.lat, currentCustomer.lng]} 
                            zoom={14} 
                            style={{ height: "100%", width: "100%", zIndex: 0 }}
                            zoomControl={false}
                            attributionControl={false}
                            dragging={false}
                            scrollWheelZoom={false}
                            doubleClickZoom={false}
                          >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Marker position={[currentCustomer.lat, currentCustomer.lng]} />
                          </MapContainer>
                          <div className="absolute inset-0 z-[400] bg-transparent"></div>
                        </div>
                      )}
                    </div>

                    {/* عرض المنتجات مجمعة حسب المتجر */}
                    {Object.entries(cartByStore).map(([storeId, group]) => (
                      <div key={storeId} className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-100 space-y-2">
                        {/* اسم المتجر */}
                        <div className="flex items-center space-x-1.5 space-x-reverse pb-1.5 border-b border-dashed border-gray-200">
                          <img src={group.store.logo || undefined} alt="" className="w-4.5 h-4.5 rounded object-cover" />
                          <span className="text-[10px] font-black text-[#9952FF] truncate max-w-[120px]">{group.store.shopName}</span>
                          <span className="text-[8.5px] text-gray-400 mr-auto whitespace-nowrap">
                            🚚 {group.store.isFreeDelivery || group.items.some(i => i.product.isFreeDelivery) ? 'مجاني' : `${group.store.deliveryPrice?.toLocaleString() || '0'} د.ع`}
                          </span>
                        </div>
                        
                        {/* منتجات هذا المتجر */}
                        {group.items.map(item => (
                          <div key={item.product.id} className="flex items-center space-x-2 space-x-reverse py-1.5 border-b border-gray-100 last:border-0 last:pb-0">
                            <img src={item.product.image || undefined} alt={item.product.name} className="w-8 h-8 object-cover rounded border border-gray-150 shrink-0" />
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-[#4D2980] text-[10px] truncate leading-tight">{item.product.name}</h4>
                              <div className="flex flex-wrap items-baseline gap-1 mt-0.5">
                                <span className="text-[#9952FF] font-extrabold text-[10px] leading-tight">
                                  {((item.product?.finalPrice || 0) * (item.quantity || 0)).toLocaleString()} <span className="text-[7px] text-slate-400 font-normal">د.ع</span>
                                </span>
                                {item.product?.discountType !== 'none' && (
                                  <span className="text-[8px] text-red-400 line-through">
                                    {((item.product?.price || 0) * (item.quantity || 0)).toLocaleString()} د.ع
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center border border-gray-250 bg-white rounded-md overflow-hidden shrink-0">
                              <button onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)} className="p-0.5 px-1 hover:bg-gray-100 text-gray-600 border-l border-gray-100">
                                {item.quantity === 1 ? <Trash2 size={9} className="text-red-500" /> : <Minus size={9} />}
                              </button>
                              <span className="px-1.5 text-[10px] font-bold text-[#4D2980]">{item.quantity}</span>
                              <button onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)} className="p-0.5 px-1 hover:bg-gray-100 text-gray-600 border-r border-gray-100">
                                <Plus size={9} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="p-3 border-t border-gray-100 bg-white shadow-[0_-3px_8px_rgba(0,0,0,0.02)] space-y-3 shrink-0">
                    
                    {!appliedPromo ? (
                      <form onSubmit={handleApplyPromo} className="space-y-1">
                        <div className="flex gap-1.5">
                          <input 
                            type="text" 
                            placeholder="أدخل بروموكود خصم..." 
                            value={promoInput}
                            onChange={(e) => setPromoInput(e.target.value)}
                            className="flex-1 border border-gray-200 p-1.5 rounded-lg text-[10px] text-center focus:ring-1 focus:ring-[#9952FF] focus:outline-none font-mono uppercase"
                            style={{ direction: 'ltr' }}
                          />
                          <button type="submit" className="px-3 py-1.5 bg-[#4D2980] hover:bg-[#4D2980] text-white font-bold text-[10px] rounded-lg transition shrink-0">تطبيق</button>
                        </div>
                        {promoError && <p className="text-[8.5px] text-red-500 font-semibold">{promoError}</p>}
                        <p className="text-[8px] text-gray-400">تلميح: جرب كود <span className="font-mono bg-gray-100 px-0.5 rounded text-gray-600">OFF15</span></p>
                      </form>
                    ) : (
                      <div className="bg-green-50 border border-green-200 text-green-700 p-2 rounded-lg flex justify-between items-center text-[10px] font-semibold">
                        <span className="flex items-center space-x-1 space-x-reverse">
                          <Check size={12} />
                          <span>تم تطبيق الخصم: <strong className="font-mono bg-green-200/50 px-1 py-0.5 rounded">{appliedPromo.code}</strong></span>
                        </span>
                        <button onClick={() => setAppliedPromo(null)} className="p-0.5 text-green-700 hover:bg-green-100 rounded">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}

                    <div className="border-b border-dashed border-gray-200 pb-2.5 text-[10px] font-semibold text-gray-600 space-y-1.5">
                      <div className="flex justify-between">
                        <span>المجموع الفرعي:</span>
                        <span className="text-[#4D2980]">{(subtotal || 0).toLocaleString()} د.ع</span>
                      </div>
                      
                      {/* تفصيل رسوم التوصيل لكل متجر */}
                      {Object.entries(cartByStore).map(([storeId, group]) => {
                        const hasFree = group.store.isFreeDelivery || group.items.some(i => i.product.isFreeDelivery);
                        return (
                          <div key={storeId} className="flex justify-between text-[8.5px]">
                            <span className="text-gray-400">🚚 توصيل {group.store.shopName}:</span>
                            <span className={hasFree ? 'text-green-600' : 'text-gray-600'}>
                              {hasFree ? 'مجاني' : `${group.store.deliveryPrice?.toLocaleString() || '0'} د.ع`}
                            </span>
                          </div>
                        );
                      })}
                      
                      <div className="flex justify-between border-t border-gray-100 pt-1.5">
                        <span>إجمالي التوصيل:</span>
                        <span className={deliveryCost === 0 ? 'text-green-600' : 'text-[#4D2980]'}>
                          {deliveryCost === 0 ? 'مجاني 🎉' : `${(deliveryCost || 0).toLocaleString()} د.ع`}
                        </span>
                      </div>
                      {appliedPromo && (
                        <div className="flex justify-between text-red-600">
                          <span>خصم البروموكود:</span>
                          <span>- {(appliedPromo?.discountValue || 0).toLocaleString()} د.ع</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-[11px] font-black text-[#4D2980] border-t border-gray-100 pt-2 mt-1">
                        <span>الإجمالي النهائي:</span>
                        <span className="text-[#9952FF] text-xs">{(total || 0).toLocaleString()} د.ع</span>
                      </div>
                    </div>

                    <button 
                      onClick={handlePlaceOrder}
                      className="w-full py-2 bg-[#9952FF] hover:bg-[#4D2980] text-white font-black rounded-lg shadow-sm transition text-center flex items-center justify-center space-x-1.5 space-x-reverse text-[11px]"
                    >
                      <Check size={14} />
                      <span>
                        {Object.keys(cartByStore).length > 1 
                          ? `تأكيد وإرسال الطلبات إلى ${Object.keys(cartByStore).length} متاجر` 
                          : 'تأكيد وإرسال الطلب'}
                      </span>
                    </button>
                    
                    <p className="text-[8px] text-gray-400 text-center font-bold pb-1">
                      💡 الدفع عند الاستلام | الطلبات ترسل منفصلة
                    </p>
                  </div>
                </>
              )}

            </div>
          </div>
        )}

        {/* مودال تفاصيل المنتج المطور */}
        <AnimatePresence>
          {selectedProductDetail && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[80] flex items-center justify-center p-0 md:p-6 overflow-y-auto">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 50 }}
                className="bg-slate-50 w-full max-w-4xl min-h-screen md:min-h-0 md:max-h-[88vh] md:rounded-[2.5rem] shadow-2xl overflow-hidden text-right flex flex-col relative border border-slate-100/50"
              >
                {/* زر الرجوع للمتجر الثابت التفاعلي */}
                <button 
                  onClick={() => setSelectedProductDetail(null)}
                  className="absolute top-4 left-4 z-40 px-3.5 py-2.5 bg-white/95 backdrop-blur-md text-slate-800 hover:text-[#4D2980] rounded-full flex items-center gap-1.5 shadow-lg border border-slate-200/60 hover:scale-105 active:scale-95 transition-all text-xs font-black cursor-pointer font-tajawal"
                  title="الرجوع للمتجر"
                >
                  <ChevronRight size={16} className="text-[#4D2980]" />
                  <span>رجوع للمتجر</span>
                </button>

                <div className="flex flex-col md:flex-row h-full md:max-h-[88vh] overflow-y-auto md:overflow-hidden flex-1">
                  {/* قسم الصورة عالي الدقة المعزز بالمؤثرات */}
                  <div className="w-full md:w-5/12 h-[45vh] md:h-full bg-slate-150 relative shrink-0 group">
                    <img 
                      src={selectedProductDetail.image || undefined} 
                      alt={selectedProductDetail.name} 
                      className="w-full h-full object-cover select-none"
                    />
                    
                    {/* التافسات الملقاة على الصورة */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                      {selectedProductDetail.discountType !== 'none' && (
                        <div className="bg-rose-500 text-white px-3 py-1.5 rounded-xl font-black text-[10px] sm:text-xs shadow-lg shadow-rose-200/40 flex items-center gap-1.5">
                          <span>{selectedProductDetail.discountType === 'percent' ? `خصم ${selectedProductDetail.discountValue}%` : `توفير ${selectedProductDetail.discountValue.toLocaleString()} د.ع`}</span>
                        </div>
                      )}
                      {selectedProductDetail.isFreeDelivery && (
                        <div className="bg-[#9952FF] text-white px-3 py-1.5 rounded-xl font-black text-[10px] sm:text-xs shadow-lg shadow-purple-200/40 flex items-center gap-1.5">
                          <Zap size={10} className="fill-white" />
                          <span>توصيل مجاني</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* تفاصيل ومعلومات المنتج المرتبة والمنسقة بشكل فني */}
                  <div className="w-full md:w-7/12 flex flex-col bg-white overflow-hidden relative">
                    {/* تفاصيل قابلة للتمرير في ديسكتوب وموبايل */}
                    <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-5 pb-32">
                      
                      {/* القسم العلوي: تصنيف المنتج وحالة التوفر */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black tracking-wider text-[#9952FF] uppercase px-3 py-1 bg-[#f5eeff] rounded-lg border border-[#e9daff]/30">
                          {selectedProductDetail.category || 'غير مصنف'}
                        </span>
                        
                        {/* حالة التوفر في المخزن */}
                        {selectedProductDetail.inventory !== undefined ? (
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
                            selectedProductDetail.inventory > 0 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-150' 
                              : 'bg-rose-50 text-rose-600 border border-rose-150'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${selectedProductDetail.inventory > 0 ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                            {selectedProductDetail.inventory > 0 ? `متوفر في المخزن (${selectedProductDetail.inventory} قطعة)` : 'نفذت الكمية'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-150">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            جاهز للتوصيل السريع
                          </span>
                        )}
                      </div>

                      {/* عنوان المنتج الفخم والبراند */}
                      <div className="space-y-1">
                        {selectedProductDetail.brand && selectedProductDetail.brand.trim() !== '' && (
                          <span className="text-slate-400 font-mono text-[11px] font-bold tracking-wider block">
                            الماركة: {selectedProductDetail.brand}
                          </span>
                        )}
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 leading-tight whitespace-normal break-words max-w-full">
                          {selectedProductDetail.name}
                        </h2>
                      </div>

                      {/* الوسوم المتداخلة */}
                      {selectedProductDetail.tags && selectedProductDetail.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedProductDetail.tags.map(tag => (
                            <span key={tag} className="px-2.5 py-0.5 bg-slate-50 text-slate-500 rounded-lg text-[9.5px] font-semibold border border-slate-100">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* السعر الحالي والخصم مع خط الدعم الهادئ */}
                      {selectedProductDetail.discountType !== 'none' ? (
                        <div className="bg-gradient-to-br from-[#fcfafe] to-white border border-[#e9daff]/50 rounded-2xl p-4 flex justify-between items-center shadow-2xs">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">السعر الحالي الجديد</span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl sm:text-3xl font-black text-[#9952FF]">
                                {selectedProductDetail.finalPrice.toLocaleString()}
                              </span>
                              <span className="text-xs font-black text-[#9952FF]">د.ع</span>
                            </div>
                          </div>
                          
                          <div className="text-left">
                            <span className="text-[10px] text-slate-400 font-medium block mb-0.5">السعر الأصلي السابق</span>
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-bold text-slate-400/90 line-through">
                                {selectedProductDetail.price.toLocaleString()} د.ع
                              </span>
                              <span className="bg-rose-50 text-rose-600 text-[9px] font-black px-2 py-0.5 rounded-md border border-rose-100 mt-1">
                                وفرت {selectedProductDetail.discountType === 'percent' ? `${selectedProductDetail.discountValue}%` : `${selectedProductDetail.discountValue.toLocaleString()} د.ع`}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 flex justify-between items-center shadow-2xs">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">السعر الشامل للمنتج</span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl sm:text-3xl font-black text-slate-800">
                                {selectedProductDetail.price.toLocaleString()}
                              </span>
                              <span className="text-xs font-black text-slate-500">د.ع</span>
                            </div>
                          </div>
                          <span className="text-[9.5px] text-[#4D2980] bg-[#f5eeff] border border-[#e9daff]/60 px-3 py-1 rounded-lg font-black">الدفع عند التوصيل</span>
                        </div>
                      )}

                      {/* العرض الخاص المميز */}
                      {selectedProductDetail.specialOffer && selectedProductDetail.specialOffer.trim() !== '' && (
                        <div className="bg-[#FAF7FF] border-2 border-dashed border-[#e9daff] rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
                          <div className="p-2.5 bg-[#f5eeff] text-[#9952FF] rounded-xl self-center shrink-0">
                            <Ticket size={20} className="animate-pulse" />
                          </div>
                          <div className="flex-1 mt-0.5 text-right">
                            <p className="text-[9px] font-black uppercase text-[#9952FF] tracking-wider mb-0.5">عرض خاص وحصري متوفر الآن</p>
                            <p className="text-xs font-black text-[#4D2980]">{selectedProductDetail.specialOffer}</p>
                          </div>
                        </div>
                      )}

                      {/* مواصفات وتفاصيل المنتج الكثيفة مصفوفة بطريقة رائعة */}
                      {((selectedProductDetail.condition && selectedProductDetail.condition.trim() !== '') || 
                        (selectedProductDetail.warranty && selectedProductDetail.warranty.trim() !== '') || 
                        (selectedProductDetail.color && selectedProductDetail.color.trim() !== '') || 
                        (selectedProductDetail.size && selectedProductDetail.size.trim() !== '') || 
                        (selectedProductDetail.weight && selectedProductDetail.weight.trim() !== '') || 
                        (selectedProductDetail.length && String(selectedProductDetail.length).trim() !== '') || 
                        (selectedProductDetail.width && String(selectedProductDetail.width).trim() !== '')) && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-black text-slate-800 border-r-4 border-[#9952FF] pr-2.5 py-0.5">
                            مواصفات وفهرس المنتج
                          </h3>
                          
                          <div className="grid grid-cols-2 gap-2 bg-slate-50/70 p-2.5 rounded-2xl border border-slate-100">
                            {/* تفاصيل الماركتينغ والحالة */}
                            {selectedProductDetail.condition && selectedProductDetail.condition.trim() !== '' && (
                              <div className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-slate-150/40">
                                <span className="text-slate-400 text-[10px] font-bold">الحالة الفنية</span>
                                <span className="text-[10.5px] font-black text-slate-700 bg-slate-50 px-2.5 py-0.5 rounded-md border border-slate-100">
                                  {selectedProductDetail.condition === 'new' ? 'جديد بالكامل' : selectedProductDetail.condition === 'used' ? 'مستعمل مميز' : selectedProductDetail.condition}
                                </span>
                              </div>
                            )}

                            {selectedProductDetail.warranty && selectedProductDetail.warranty.trim() !== '' && (
                              <div className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-slate-150/40">
                                <span className="text-slate-400 text-[10px] font-bold">الضمان والصيانة</span>
                                <span className="text-[10.5px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-150">
                                  {selectedProductDetail.warranty}
                                </span>
                              </div>
                            )}

                            {selectedProductDetail.color && selectedProductDetail.color.trim() !== '' && (
                              <div className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-slate-150/40">
                                <span className="text-slate-400 text-[10px] font-bold">اللون المتاح</span>
                                <span className="text-[10.5px] font-black text-slate-700">{selectedProductDetail.color}</span>
                              </div>
                            )}

                            {selectedProductDetail.size && selectedProductDetail.size.trim() !== '' && (
                              <div className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-slate-150/40">
                                <span className="text-slate-400 text-[10px] font-bold">المقاس المطلوب</span>
                                <span className="text-[10.5px] font-black font-mono text-[#9952FF] bg-[#f5eeff] px-2 py-0.5 rounded">
                                  {selectedProductDetail.size}
                                </span>
                              </div>
                            )}

                            {selectedProductDetail.weight && selectedProductDetail.weight.trim() !== '' && (
                              <div className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-slate-150/40">
                                <span className="text-slate-400 text-[10px] font-bold">الوزن التقريبي</span>
                                <span className="text-[10.5px] font-black text-slate-700 font-mono">{selectedProductDetail.weight}</span>
                              </div>
                            )}

                            {((selectedProductDetail.length && String(selectedProductDetail.length).trim() !== '') || 
                              (selectedProductDetail.width && String(selectedProductDetail.width).trim() !== '')) && (
                              <div className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-slate-150/40 col-span-2">
                                <span className="text-slate-400 text-[10px] font-bold">أبعاد المنتج (طول × عرض)</span>
                                <span className="text-[10.5px] font-black text-slate-700 font-mono" dir="ltr">
                                  {selectedProductDetail.length || '—'} × {selectedProductDetail.width || '—'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* الوصف المعزز الفاخر */}
                      <div className="space-y-2">
                        <h3 className="text-xs font-black text-slate-800 border-r-4 border-[#9952FF] pr-2.5 py-0.5">
                          نبذة ووصف المنتج تفصيليلاً
                        </h3>
                        <div className="bg-slate-50/40 p-4 rounded-2xl border border-slate-100 text-slate-600 text-xs leading-relaxed font-tajawal whitespace-normal break-words">
                          {selectedProductDetail.description || 'هذا المنتج المميز متوفر الآن في متجرنا الرسمي.'}
                        </div>
                      </div>

                    </div>

                    {/* شريط الإجراءات والتحكم التفاعلي بالطلب (عائم بتثبيت ذكي) */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md p-4 sm:p-5 border-t border-slate-200/50 flex flex-col gap-3.5 z-10 w-full shrink-0">
                      
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-500">الكمية المراد طلبها:</span>
                        
                        <div className="flex items-center bg-slate-100 border border-slate-200/60 rounded-2xl p-0.5 shadow-2xs">
                          <button 
                            onClick={() => setDetailQty(Math.max(1, detailQty - 1))}
                            className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-white rounded-xl transition-all active:scale-95 cursor-pointer"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-10 text-center font-black text-[#4D2980] text-sm font-mono select-none">{detailQty}</span>
                          <button 
                            onClick={() => setDetailQty(detailQty + 1)}
                            className="w-9 h-9 flex items-center justify-center text-[#9952FF] hover:bg-white rounded-xl transition-all active:scale-95 cursor-pointer"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2 w-full">
                        <button 
                          onClick={() => {
                            addToCart(selectedProductDetail, detailQty);
                            setSelectedProductDetail(null);
                          }}
                          className="flex-[4] bg-[#4D2980] hover:bg-[#381a66] text-white py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm shadow-lg shadow-[#4D2980]/15 hover:shadow-[#4D2980]/25 transition-all active:scale-[0.97] flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <ShoppingCart size={16} />
                          <span>إضافة للسلة</span>
                          <span className="font-mono bg-white/10 px-2 py-0.5 rounded-lg text-[10px] sm:text-xs">
                            ({((selectedProductDetail.finalPrice || selectedProductDetail.price) * detailQty).toLocaleString()} د.ع)
                          </span>
                        </button>

                        <button 
                          onClick={() => openShareModal('product', { ...selectedProductDetail, shopName: selectedStore?.shopName })}
                          className="w-12 h-12 bg-slate-50 hover:bg-[#FAF7FF] border border-slate-200 hover:border-[#9952FF]/30 text-slate-600 hover:text-[#9952FF] rounded-2xl flex items-center justify-center transition-all shadow-2xs active:scale-[0.95] shrink-0 cursor-pointer"
                          title="مشاركة المنتج"
                        >
                          <Share2 size={18} />
                        </button>

                        <button 
                          onClick={() => setShowRateModal({ type: 'product', data: selectedProductDetail })}
                          className="w-12 h-12 bg-amber-50 hover:bg-amber-100/60 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center transition-all shadow-2xs active:scale-[0.95] shrink-0 cursor-pointer"
                          title="قراءة المراجعات والتقييم"
                        >
                          <Sparkles size={18} className="fill-amber-400 text-amber-600" />
                        </button>
                      </div>

                    </div>

                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>


        {/* مودال تأكيد الاستبدال */}
        <AnimatePresence>
          {showRedeemConfirm && (
            <div className="fixed inset-0 bg-[#4D2980]/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[2rem] shadow-2xl overflow-hidden w-full max-w-sm"
              >
                <div className="p-6">
                  <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Gift size={32} />
                  </div>
                  <h3 className="font-black text-[#4D2980] text-xl text-center mb-2">تأكيد الاستبدال</h3>
                  <p className="text-sm font-bold text-slate-500 text-center mb-6">
                    هل أنت متأكد من رغبتك في استبدال {showRedeemConfirm} نقطة وتحويلها إلى كود خصم؟
                  </p>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={confirmRedeemPoints}
                      className="flex-1 bg-[#9952FF] text-white font-black py-4 rounded-2xl transition hover:bg-[#4D2980]"
                    >
                      نعم، استبدل الآن
                    </button>
                    <button 
                      onClick={() => setShowRedeemConfirm(null)}
                      className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl transition hover:bg-slate-200"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* مودال التقييم */}
        <AnimatePresence>
          {showRateModal && (
            <div className="fixed inset-0 bg-[#4D2980]/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl"
              >
                <div className="p-6 text-center space-y-4 text-right">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-[#4D2980] text-lg">تقييم ال{showRateModal.type === 'store' ? 'متجر' : 'منتج'}</h3>
                    <button onClick={() => setShowRateModal(null)} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full transition-colors"><X size={16} /></button>
                  </div>
                  
                  <div className="flex flex-col items-center gap-2 py-4">
                    <p className="text-sm font-bold text-slate-500 mb-2">كيف كانت تجربتك مع {showRateModal.type === 'store' ? showRateModal.data.shopName : showRateModal.data.name}؟</p>
                    <div className="flex gap-2 mb-4" dir="ltr">
                      {[1,2,3,4,5].map(star => (
                        <button 
                          key={star}
                          onClick={() => setRatingValue(star)}
                          className="text-4xl hover:scale-110 transition-transform active:scale-95 outline-none"
                        >
                          <span className={star <= ratingValue ? 'text-amber-400' : 'text-slate-200'}>★</span>
                        </button>
                      ))}
                    </div>
                    {showRateModal.type === 'store' && (
                      <textarea
                        placeholder="شاركنا رأيك أو تجربتك مع المتجر..."
                        value={reviewMessage}
                        onChange={(e) => setReviewMessage(e.target.value)}
                        className="w-full text-sm p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#9952FF]/20 resize-none h-24"
                      />
                    )}
                  </div>

                  <button 
                    onClick={() => {
                      if (showRateModal.type === 'store' && currentCustomer) {
                        submitStoreReview({
                          storeId: showRateModal.data.id,
                          customerId: currentCustomer.id,
                          customerName: currentCustomer.name,
                          rating: ratingValue,
                          message: reviewMessage
                        }).then(() => {
                          alert(`شكرًا لك! تم إرسال تقييمك بنجاح (${ratingValue} نجوم)`);
                        });
                      } else {
                        alert(`شكرًا لك! تم إرسال تقييمك بنجاح (${ratingValue} نجوم)`);
                      }
                      setShowRateModal(null);
                      setRatingValue(5);
                      setReviewMessage('');
                    }}
                    className="w-full bg-[#9952FF] text-white font-black py-4 rounded-2xl shadow-xl shadow-[#e9daff]"
                  >
                    إرسال التقييم
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* مودال نجاح الطلب */}
        <AnimatePresence>
          {showOrderSuccess && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-md bg-[#4D2980]/40 text-right">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl text-center relative border border-slate-100"
              >
                <div className="bg-[#9952FF] p-10 flex flex-col items-center relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  <div className="w-20 h-20 bg-white rounded-[1.5rem] flex items-center justify-center shadow-inner mb-4 relative z-10">
                    <CheckCircle size={48} className="text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-black text-white relative z-10 text-center">تم إرسال طلبك بنجاح! 🎉</h3>
                </div>
                <div className="p-8 space-y-6">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/50">
                    <p className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest text-right">تفاصيل الطلبات</p>
                    <div className="text-[11px] font-black text-slate-600 whitespace-pre-line leading-relaxed text-right">
                      {orderSummary}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 font-bold leading-relaxed text-center">
                    شكراً لتسوقك من محلك! سيتم مراجعة الطلب من قبل المتاجر المختارة وتأكيده قريباً.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => { setShowOrderSuccess(false); handleTabChange('orders'); setSelectedStore(null); }}
                      className="py-4 bg-[#9952FF] text-white font-black rounded-2xl shadow-lg shadow-[#e9daff] hover:bg-[#4D2980] transition-all active:scale-95 text-[10px] sm:text-xs"
                    >
                      تتبع طلبي الآن
                    </button>
                    {activeTab === 'reels' ? (
                      <button 
                        onClick={() => { setShowOrderSuccess(false); }}
                        className="py-4 bg-white text-[#9952FF] border border-[#e9daff] font-black rounded-2xl shadow-sm hover:bg-[#f5eeff] transition-all active:scale-95 text-[10px] sm:text-xs"
                      >
                        العودة للفيديو
                      </button>
                    ) : (
                      <button 
                        onClick={() => { setShowOrderSuccess(false); handleTabChange('stores'); setSelectedStore(null); }}
                        className="py-4 bg-white text-[#9952FF] border border-[#e9daff] font-black rounded-2xl shadow-sm hover:bg-[#f5eeff] transition-all active:scale-95 text-[10px] sm:text-xs"
                      >
                        إكمال التسوق
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* مودال المشاركة المطور */}
        <AnimatePresence>
          {showShareModal && (
            <div className="fixed inset-0 bg-[#4D2980]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden text-right border border-slate-100"
              >
                <div className="p-8 pb-4">
                   <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setShowShareModal(false)}
                          className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-all ml-1"
                        >
                          <ChevronRight size={20} />
                        </button>
                        <h3 className="text-xl font-black text-[#4D2980]">مشاركة مع الأصدقاء</h3>
                      </div>
                      <button onClick={() => setShowShareModal(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                        <X size={20} />
                      </button>
                   </div>

                   <p className="text-[10px] font-black text-slate-400 mb-2 mr-1 uppercase tracking-widest">معاينة نص المشاركة</p>
                   <textarea 
                    value={shareText}
                    onChange={(e) => setShareText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs font-bold text-slate-600 focus:ring-1 focus:ring-[#9952FF] outline-none leading-relaxed mb-4 min-h-[100px]"
                   />

                   <p className="text-[10px] font-black text-slate-400 mb-3 mr-1 uppercase tracking-widest text-center">اختر منصة المشاركة</p>
                   
                   <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => executeShare('whatsapp')} className="flex flex-col items-center gap-2 p-4 bg-emerald-50 text-emerald-600 rounded-3xl hover:bg-emerald-100 transition-colors group">
                        <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                          <MessageCircle size={24} />
                        </div>
                        <span className="text-[9px] font-black">واتساب</span>
                      </button>
                      <button onClick={() => executeShare('telegram')} className="flex flex-col items-center gap-2 p-4 bg-[#f5eeff] text-[#9952FF] rounded-3xl hover:bg-[#e9daff] transition-colors group">
                        <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform text-[#b07aff]">
                           <Send size={24} />
                        </div>
                        <span className="text-[9px] font-black">تيليجرام</span>
                      </button>
                      <button onClick={() => executeShare('messenger')} className="flex flex-col items-center gap-2 p-4 bg-[#f5eeff] text-[#9952FF] rounded-3xl hover:bg-[#e9daff] transition-colors group">
                        <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform text-[#b07aff]">
                          <MessageCircle size={24} />
                        </div>
                        <span className="text-[9px] font-black">ماسنجر</span>
                      </button>
                      <button onClick={() => executeShare('instagram')} className="flex flex-col items-center gap-2 p-4 bg-rose-50 text-rose-500 rounded-3xl hover:bg-rose-100 transition-colors group">
                        <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform text-rose-400">
                          <Camera size={24} />
                        </div>
                        <span className="text-[9px] font-black">انستقرام</span>
                      </button>
                      <button onClick={() => executeShare('facebook')} className="flex flex-col items-center gap-2 p-4 bg-[#f5eeff] text-[#4D2980] rounded-3xl hover:bg-[#e9daff] transition-colors group">
                        <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform text-[#4D2980]">
                          <Users size={24} />
                        </div>
                        <span className="text-[9px] font-black">فيسبوك</span>
                      </button>
                      <button onClick={() => executeShare('copy')} className="flex flex-col items-center gap-2 p-4 bg-slate-50 text-slate-600 rounded-3xl hover:bg-slate-100 transition-colors group">
                        <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                          <ClipboardList size={24} />
                        </div>
                        <span className="text-[9px] font-black">نسخ الرابط</span>
                      </button>
                   </div>
                </div>
                
                <div className="p-8 pt-0">
                  <p className="text-[9px] text-slate-400 text-center font-bold">
                    سيتم منحك 5 نقاط مكافأة عند كل مشاركة ناجحة 🎁
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* مودال تأكيد التغييرات غير المحفوظة */}
        <AnimatePresence>
          {showUnsavedModal && (
            <div className="fixed inset-0 bg-[#4D2980]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden text-right border border-slate-100"
              >
                <div className="p-8">
                  <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <AlertCircle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-[#4D2980] text-center mb-2">تنبيه: تغييرات غير محفوظة</h3>
                  <p className="text-sm text-slate-500 text-center leading-relaxed">
                    لقد قمت بتعديل بياناتك الشخصية ولكن لم تقم بحفظها بعد. هل تريد حفظ التغييرات قبل الانتقال؟
                  </p>
                </div>
                
                <div className="p-6 bg-slate-50 flex flex-col gap-3">
                  <button 
                    onClick={() => handleConfirmUnsaved(true)}
                    className="w-full py-4 bg-[#9952FF] text-white rounded-2xl font-black text-sm shadow-lg shadow-[#e9daff] hover:bg-[#4D2980] transition-all active:scale-[0.98]"
                  >
                    نعم، حفظ التغييرات
                  </button>
                  <button 
                    onClick={() => handleConfirmUnsaved(false)}
                    className="w-full py-4 bg-white text-slate-600 border border-slate-200 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all active:scale-[0.98]"
                  >
                    لا، تجاهل التغييرات
                  </button>
                  <button 
                    onClick={() => setShowUnsavedModal(false)}
                    className="w-full py-2 text-xs font-bold text-slate-400 hover:text-[#9952FF] transition-colors"
                  >
                    إلغاء والبقاء في الصفحة
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* نافذة عرض الروابط الخارجية داخل التطبيق مع زر الرجوع للتطبيق */}
        <AnimatePresence>
          {iframeUrl && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[150] flex flex-col overflow-hidden animate-fade-in" dir="rtl">
              {/* شريط التحكم العلوي */}
              <div className="bg-gradient-to-l from-[#4D2980] to-[#381a66] text-white py-3 px-4 flex items-center justify-between shadow-lg border-b border-white/10 z-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <ShoppingBag size={18} className="text-amber-400" />
                  </div>
                  <div className="max-w-[150px] sm:max-w-xs text-right">
                    <h3 className="text-xs sm:text-sm font-black text-white font-tajawal">مستعرض محلك الداخلي</h3>
                    <p className="text-[10px] text-slate-300 font-bold truncate leading-none mt-0.5">{iframeUrl}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      try {
                        navigator.clipboard.writeText(iframeUrl);
                        alert('تم نسخ الرابط بنجاح! ✅');
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors animate-pulse"
                    title="نسخ الرابط"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={() => setIframeUrl(null)}
                    className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 active:scale-95 text-slate-900 font-extrabold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5"
                  >
                    <ChevronRight size={16} className="rotate-180" />
                    <span>الرجوع للتطبيق</span>
                  </button>
                </div>
              </div>

              {/* محتوى الصفحة الخارجي */}
              <div className="flex-1 bg-white relative">
                <iframe
                  src={iframeUrl}
                  className="w-full h-full border-none"
                  title="موقع خارجي"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* نافذة تأكيد إلغاء الطلب بفترة الـ 30 ثانية */}
        <AnimatePresence>
          {orderToCancel && (
            <div className="fixed inset-0 bg-[#4D2980]/50 backdrop-blur-xs z-[100] flex items-center justify-center p-4" dir="rtl">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden text-right border border-slate-100"
              >
                <div className="p-8">
                  <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-100">
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 text-center mb-2">تأكيد إلغاء الطلب</h3>
                  <p className="text-sm text-slate-500 text-center leading-relaxed font-tajawal">
                    هل أنت متأكد من رغبتك في إلغاء الطلب رقم <span className="font-sans font-black bg-slate-100 text-[#4D2980] px-1.5 py-0.5 rounded-sm">#{orderToCancel.id}</span> من متجر <span className="text-[#9952FF] font-black">{orderToCancel.storeName}</span>؟ هذا الإجراء فوري وسيتم إلغاء تحضير الطلب تلقائياً ولا يمكن الرجوع عنه.
                  </p>
                </div>
                
                <div className="p-6 bg-slate-50 flex flex-col gap-3">
                  <button 
                    onClick={async () => {
                      try {
                        await updateOrderStatus(orderToCancel.id, 'cancelled', 'تم إلغاء الطلب تلقائياً من قبل الزبون خلال 30 ثانية');
                        setOrderToCancel(null);
                      } catch (e) {
                        console.error("Failed to cancel order", e);
                      }
                    }}
                    className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-rose-100 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    نعم، إلغاء الطلب
                  </button>
                  <button 
                    onClick={() => setOrderToCancel(null)}
                    className="w-full py-4 bg-white text-slate-600 border border-slate-200 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    تراجع
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    );
  }

  // ==========================================
  // شاشات تسجيل دخول الزبون والتسجيل
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-xl p-8 text-right animate-fade-in relative border-t-8 border-[#9952FF] max-h-[90vh] overflow-y-auto">
        
        {/* اللوغو والعنوان */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#e9daff] text-[#9952FF] rounded-3xl flex items-center justify-center mx-auto mb-4 shadow">
            <ShoppingBag size={32} />
          </div>
          <h1 className="text-2xl font-black text-[#4D2980]">
            تطبيق محلك للزبائن
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            عالم من التسوق في قلب منطقتك
          </p>
        </div>

        {/* شاشة تسجيل الدخول */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-5">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-2xl font-bold flex items-center gap-2">
                <ShieldAlert size={16} />
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">
                رقم الهاتف <span className="text-red-500">*</span>
              </label>
              <div
                className="flex items-center border border-gray-200 rounded-2xl overflow-hidden bg-white focus-within:border-[#9952FF] transition-all"
                dir="ltr"
              >
                <span className="px-4 py-3 bg-gray-50 text-gray-500 text-sm font-bold border-r">
                  +964
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="07*********"
                  value={loginPhone}
                  onChange={(e) =>
                    setLoginPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
                  }
                  required
                  className="flex-1 p-3 text-sm focus:outline-none font-mono text-left"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">
                كلمة المرور <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-gray-200 p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-[#9952FF] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setLoginError("");
                setForgotPhone(loginPhone);
                setView("forgot");
              }}
              className="text-xs font-bold text-[#9952FF] hover:underline px-1"
            >
              هل نسيت كلمة السر؟
            </button>
            <button
              type="submit"
              className="w-full py-4 bg-[#9952FF] text-white font-black rounded-2xl shadow-lg shadow-[#e9daff] hover:bg-[#4D2980] transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={20} className="rotate-180" />
              <span>تسجيل الدخول</span>
            </button>
            <div className="text-center pt-4 border-t border-gray-100 text-sm text-gray-500">
              ليس لديك حساب؟{" "}
              <button
                type="button"
                onClick={() => setView("signup")}
                className="font-bold text-[#9952FF]"
              >
                انشاء حساب جديد
              </button>
            </div>
          </form>
        )}

        {/* شاشة نسيت كلمة السر */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-5">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-2xl font-bold flex items-center gap-2">
                <ShieldAlert size={16} />
                {loginError}
              </div>
            )}
            <div className="text-center">
              <h3 className="text-xl font-black text-[#4D2980]">
                استعادة كلمة المرور
              </h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">
                رقم الهاتف المسجل <span className="text-red-500">*</span>
              </label>
              <div
                className="flex items-center border border-gray-200 rounded-2xl overflow-hidden bg-white focus-within:border-[#9952FF] transition-all"
                dir="ltr"
              >
                <span className="px-4 py-3 bg-gray-50 text-gray-500 text-sm font-bold border-r">
                  +964
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={forgotPhone}
                  onChange={(e) =>
                    setForgotPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
                  }
                  placeholder="07*********"
                  required
                  className="flex-1 p-3 text-sm font-mono text-left focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">
                كلمة المرور الجديدة <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={forgotNewPassword}
                onChange={(e) => setForgotNewPassword(e.target.value)}
                placeholder="لا تقل عن 8 حروف أو رموز"
                required
                className="w-full border border-gray-200 p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-[#9952FF] focus:outline-none placeholder:text-gray-400"
              />
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-[#9952FF] text-white font-black rounded-2xl shadow-lg shadow-[#e9daff] hover:bg-[#4D2980] transition-all"
            >
              إرسال رمز OTP
            </button>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setView("login")}
                className="text-xs font-bold text-gray-500 hover:text-[#9952FF] transition-colors"
              >
                العودة لتسجيل الدخول
              </button>
            </div>
          </form>
        )}

        {/* شاشة تأكيد OTP */}
        {view === 'otp' && (
          <form onSubmit={handleOtpConfirm} className="space-y-6">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-2xl font-bold flex items-center gap-2">
                <ShieldAlert size={16} />
                {loginError}
              </div>
            )}
            <div className="text-center">
              <h3 className="text-xl font-black text-[#4D2980]">تأكيد الرمز</h3>
              <p className="text-sm text-gray-500 mt-2">
                أدخل الرمز المكون من 6 أرقام المرسل إليك
              </p>
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={otpCode}
              onChange={(e) =>
                setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="0 0 0 0 0 0"
              required
              className="w-full border border-gray-200 p-4 rounded-2xl text-center text-3xl font-black font-mono tracking-[0.5em] focus:ring-2 focus:ring-[#9952FF] focus:outline-none placeholder:text-gray-300"
            />
            <button
              type="submit"
              className="w-full py-4 bg-[#9952FF] text-white font-black rounded-2xl shadow-lg shadow-[#e9daff] hover:bg-[#4D2980] transition-all flex items-center justify-center gap-2"
            >
              <Check size={20} />
              <span>تأكيد الرمز والدخول</span>
            </button>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() =>
                  setView(otpMode === "signup" ? "signup" : "forgot")
                }
                className="text-xs font-bold text-gray-500 hover:text-[#9952FF] transition-colors"
              >
                العودة لتعديل البيانات
              </button>
            </div>
          </form>
        )}

        {/* شاشة تسجيل زبون جديد */}
        {view === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  الاسم الكامل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: محمد صفاء جبار"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  required
                  className={`w-full border p-3 rounded-2xl text-sm ${custName.trim() ? "border-green-400" : "border-gray-200 focus:ring-2 focus:ring-[#9952FF] focus:outline-none"}`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  رقم الهاتف (WhatsApp) <span className="text-red-500">*</span>
                </label>
                <div
                  className={`flex items-center border rounded-2xl overflow-hidden bg-white ${isPhoneValid ? "border-green-400" : custPhone ? "border-red-400" : "border-gray-200 focus-within:ring-2 focus-within:ring-[#9952FF] focus-within:outline-none"}`}
                  dir="ltr"
                >
                  <span className="px-4 py-3 bg-gray-50 text-gray-500 text-sm font-bold border-r">
                    +964
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="07*********"
                    value={custPhone}
                    onChange={(e) =>
                      setCustPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
                    }
                    required
                    className="flex-1 p-3 text-sm font-mono text-left focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  كلمة المرور <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={custPassword}
                  onChange={(e) => setCustPassword(e.target.value)}
                  placeholder="لا تقل عن 8 حروف"
                  required
                  className={`w-full border p-3 rounded-2xl text-sm ${isCustomerPasswordValid ? "border-green-400" : custPassword ? "border-red-400" : "border-gray-200 focus:ring-2 focus:ring-[#9952FF] focus:outline-none"}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    المحافظة <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={custProvince}
                    onChange={(e) => setCustProvince(e.target.value)}
                    required
                    className="w-full border border-gray-200 p-3 rounded-2xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#9952FF] focus:border-[#9952FF]"
                  >
                    {provinces.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">المنطقة / الحي <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="مثال: حي العامل"
                    value={custArea}
                    onChange={(e) => setCustArea(e.target.value)}
                    required
                    className="w-full border border-gray-200 p-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9952FF] focus:border-[#9952FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">محلة</label>
                  <input
                    type="text"
                    placeholder="مثال: 809"
                    value={custMahalla}
                    onChange={(e) => setCustMahalla(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9952FF] focus:border-[#9952FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">زقاق</label>
                  <input
                    type="text"
                    placeholder="مثال: 21"
                    value={custZuqaq}
                    onChange={(e) => setCustZuqaq(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9952FF] focus:border-[#9952FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">دار</label>
                  <input
                    type="text"
                    placeholder="مثال: 4"
                    value={custDar}
                    onChange={(e) => setCustDar(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9952FF] focus:border-[#9952FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">أقرب نقطة دالة <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="مثال: ثانوية ........."
                  value={custLandmark}
                  onChange={(e) => setCustLandmark(e.target.value)}
                  required
                  className="w-full border border-gray-200 p-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9952FF] focus:border-[#9952FF]"
                />
              </div>

              {/* موقع الخارطة */}
              <div className="space-y-3 pt-2">
                <LocationPicker 
                  onLocationSelect={(lat, lng) => {
                    setCustLat(lat);
                    setCustLng(lng);
                  }}
                  label="تحديد الموقع على الخريطة"
                  required={true}
                />
              </div>

            </div>

            {!isSignupFormValid && (
              <p className="text-[10px] text-orange-500 text-center font-bold animate-pulse mt-1">
                ⚠️ أكمل جميع الحقول المطلوبة
              </p>
            )}
            <button
              type="submit"
              disabled={!isSignupFormValid}
              className={`w-full py-4 font-black rounded-2xl shadow-xl transition-all ${
                isSignupFormValid
                  ? "bg-[#9952FF] text-white hover:bg-[#4D2980]"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              إنشاء حساب الزبون
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setView("login")}
                className="text-xs font-bold text-gray-400"
              >
                الرجوع لتسجيل الدخول
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
