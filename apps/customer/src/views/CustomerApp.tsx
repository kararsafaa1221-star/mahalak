import React, { useState, useEffect, useMemo, useRef, useCallback, useTransition } from 'react';
import { useApp } from '@shared/context/useApp';
import { validateUserStatus } from '@shared/utils/userValidation';
import { isStoreVisibleToCustomer, isStoreSubscriptionActive } from '@shared/utils/store';
import { computeStoreRatingsMap, lookupStoreRating } from '@shared/utils/storeRatings';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '@shared/services/storageService';
import { Product, Store, Customer, CustomerSavedLocation } from '@shared/types';
import { authService } from '@shared/services/authService';
import { STORE_CATEGORIES, STORE_BADGES, getStoreCategoryLabel, storeCategoriesMatch } from '@shared/constants';
import {
  storeReviewRewardHintText,
} from '@shared/constants/loyaltyRewards';
import {
  formatLoyaltyTemplate,
  formatOrderDeliveryRewardDescription,
  formatTierResetNoteAr,
  getEffectiveCustomerTierState,
  getNextTierProgress,
  getSortedTiers,
  getTierConfig,
  getUpgradeableTiers,
  resolveLoyaltySettings,
} from '@shared/constants/loyaltySettings';
import {
  markWalletRewardsSeen,
  shouldShowProfileWalletGiftBadge,
} from '@shared/utils/walletRewardsBadge';
import {
  buildCustomerProductSharePayload,
  buildCustomerStoreSharePayload,
  buildPlatformShareAction,
  redirectLegacySharePath,
  tryNativeShare,
  type SharePlatform,
} from '@shared/utils/shareContent';
import {
  isShareTrackedUrl,
  recordShareVisit,
  splitHashPathAndQuery,
} from '@shared/lib/shareVisitTracking';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, Heart, Wallet, User, Users, Search, MapPin, Home,  Phone, Plus, Minus, Check, X, ClipboardList, Share2, Camera,
  Gift, Award, Bell, ShieldAlert, Store as StoreIcon, Trash2, LogOut,
  Ticket, Copy, Shield, Zap, ChevronRight, ChevronLeft, ShoppingCart, LayoutGrid, Sparkles, Shirt, ChevronDown, Star, Clock, CheckCircle, AlertCircle, AlertTriangle, Info, BellOff, Calendar, Lock, MessageCircle, RefreshCw, Send, FileText, Percent,
  Smartphone, Laptop, Tv, Lightbulb, Bed, Hammer, Car, Bike, BookOpen, Dumbbell, Gem, Candy, Flower2, Briefcase, Beef, Pill, Printer, Coffee, Flame, ArrowRightLeft, Loader2
} from 'lucide-react';
import { ProductComparePanel } from '../components/ProductComparePanel';
import { showToast, showModal, showConfirm } from '@shared/utils/alerts';
import { formatPromoDiscount } from '@shared/utils/promoCode';
import { getCallableErrorMessage } from '@shared/utils/firebaseErrors';
import { readHistoryScrollY, restoreAppScroll, saveScrollToHistoryState } from '@shared/utils/appScrollHistory';
import {
  canOrderProductQuantity,
  getProductAvailabilityLabel,
  hasTrackedInventory,
  isProductOutOfStock,
} from '@shared/utils/productInventory';
import { CustomerLocationPicker } from '@/components/CustomerLocationPicker';
import { VerifiedBadge } from '@shared/components/VerifiedBadge';
import { ProductImage } from '@shared/components/ProductImage';
import { prefetchImageUrls } from '@shared/utils/prefetchImages';
import { StoreGrid } from '@/components/customer/StoreGrid';
import { StoreProductSections } from '@shared/components/StoreProductSections';
import {
  resolveStoreTheme,
  storeGradientProps,
  storeGradientToLeftProps,
  storeInfoBarProps,
  storePageBackgroundProps,
  storePrimaryBgProps,
  storeThemeCssVars,
  themeFieldIconColor,
  themeFieldTextStyle,
} from '@shared/utils/storeTheme';
import { SavedLocationsModal } from '@/components/customer/SavedLocationsModal';
import { DeliveryLocationPickerSheet } from '@/components/customer/DeliveryLocationPickerSheet';
import { useCustomerAndroidBack } from '@/hooks/useCustomerAndroidBack';
import { CustomerAuthPage } from '@/components/CustomerAuthPage';
import { DeleteAccountSection } from '@shared/components/DeleteAccountSection';
import { PrivacyPolicyModal } from '@shared/components/PrivacyPolicyModal';
import { AboutUsModal } from '@shared/components/AboutUsModal';
import { ChangePasswordModal } from '@shared/components/ChangePasswordModal';
import { MyInfoModal } from '@shared/components/MyInfoModal';
import { LegalSheetModal } from '@shared/components/LegalSheetModal';
import { MahalakLogo, MahalakLogoIcon } from '@shared/components/MahalakLogo';
import { SponsoredAdSlider } from '@shared/components/SponsoredAdSlider';
import { WelcomeScreenBackground } from '@shared/components/WelcomeScreenBackground';
import { getPublishedSponsoredAds } from '@shared/utils/sponsoredAds';
import { getStoreOfferBadge, productHasActiveDiscount, storeHasActiveDiscounts, storeHasDiscountOnAllProducts } from '@shared/utils/storeOfferBadge';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getStoreDeliveryInfo } from '@shared/utils/delivery';
import { getTimestampMillis } from '@shared/utils/date';
import {
  formatSavedLocationAddress,
  getDefaultSavedLocation,
  isSavedLocationAddressComplete,
  locationsEqual,
  normalizeCustomerSavedLocations,
} from '@shared/utils/customerLocations';

// Fix leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

import { showLocalNotification, requestNotificationPermission, setupPushNotifications } from '@shared/lib/pushNotifications';
import { formatSafeDate, formatSafeTimeString, formatSafeDateTimeString } from '@shared/utils/date';

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
  pharmacy: 'صيدليات وعناية',
  office_equipment: 'أجهزة مكتبية',
  home_appliances: 'أدوات منزلية',
  smoking_hookah: 'سكائر وأراكيل'
};

// Helper to provide specific, appropriate icons for each of the 19 categories
const getCategoryIcon = (catId: string, isSelected: boolean, size = 14) => {
  const iconSize = size;
  const colorClass = isSelected ? "text-white" : "text-vibrant-purple";
  
  switch (catId) {
    case 'all':
      return <MahalakLogoIcon size={iconSize} className={isSelected ? '' : 'opacity-90'} />;
    case 'supermarket':
      return <ShoppingCart size={iconSize} className={colorClass} />;
    case 'meats':
      return <Beef size={iconSize} className={colorClass} />;
    case 'sweets':
      return <Candy size={iconSize} className={colorClass} />;
    case 'clothing':
    case 'fashion':
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
    case 'office_equipment':
      return <Printer size={iconSize} className={colorClass} />;
    case 'home_appliances':
      return <Coffee size={iconSize} className={colorClass} />;
    case 'smoking_hookah':
      return <Flame size={iconSize} className={colorClass} />;
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
    <div className="order-actions-container mt-4 pt-3 border-t border-white/20 flex items-stretch justify-center flex-wrap sm:flex-nowrap gap-3 w-full">
      <button
        onClick={() => onCancelClick(order)}
        className="group flex-1 w-full py-2.5 bg-white text-rose-500 border border-rose-100 hover:border-rose-300 hover:bg-rose-50 rounded-xl font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-2 shadow-sm hover:shadow active:scale-95 transition-all duration-300 min-w-[100px]"
      >
        <Clock size={16} className="group-hover:rotate-90 transition-transform duration-300 shrink-0 text-rose-400" />
        <span className="relative z-10">إلغاء الطلب (متاح لـ {timeLeft} ثانية)</span>
      </button>
    </div>
  );
};

function savedLocationIcon(label: string) {
  if (label === 'البيت') return Home;
  if (label === 'العمل') return Briefcase;
  return MapPin;
}

// ==========================================
// تطبيق الزبون - منصة محلك (Customer App)
// ==========================================

import { PushPermissionPrompt } from '@shared/components/PushPermissionPrompt';
import { requestLocationPermission, wasLocationPromptHandled, wasLocationOsGranted } from '@shared/lib/permissions';

export const CustomerApp: React.FC = () => {
  const navigate = useNavigate();
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const { 
    currentCustomer, setCurrentCustomer, setCurrentMerchant, logoutSession, deleteUserAccountSecure, registerCustomer, lookupCustomerByPhone, checkPhoneAvailable, verifyCustomerLogin, linkCustomerAuthUid, updateCustomerProfile, resetCustomerPasswordSecure,
    authLoading, authInitialized,
    stores: allStores, products: rawProducts, customerWalletPromos, orders, placeOrder, toggleFollowStore, toggleStoreNotification, validatePromoCode, refreshStore, subscribeToStore, refreshCustomerWalletPromos,
    notifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, deleteAllNotifications, convertPointsToPromo,
    customers, provinces, addCustomerPoints, adminSettings, submitStoreReview, submitProductReview, storeReviews,
    flashSales, flashSaleRequests,
    redeemRechargeCode, updateOrderStatus, getOrderSeqId
  } = useApp();

  const loyalty = useMemo(() => resolveLoyaltySettings(adminSettings), [adminSettings]);
  const loyaltyRedemptionPackages = useMemo(
    () => loyalty.redemptionPackages.filter((pkg) => pkg.enabled),
    [loyalty.redemptionPackages],
  );
  const minRedeemPoints = useMemo(() => {
    if (loyaltyRedemptionPackages.length === 0) return 100;
    return Math.min(...loyaltyRedemptionPackages.map((pkg) => pkg.points));
  }, [loyaltyRedemptionPackages]);
  const loyaltyEarnRules = useMemo(
    () => loyalty.earnRules.filter((rule) => rule.enabled),
    [loyalty.earnRules],
  );

  const stores = useMemo(() => {
    return allStores.filter((s) =>
      isStoreVisibleToCustomer(s, { blockedStoreIds: currentCustomer?.blockedStoreIds }),
    );
  }, [allStores, currentCustomer?.blockedStoreIds]);

  const visibleStoreIds = useMemo(() => new Set(stores.map(s => s.id)), [stores]);

  const products = useMemo(() => {
    const activeProducts = rawProducts.filter((p) => visibleStoreIds.has(p.storeId));
    if (flashSales.length === 0 || flashSaleRequests.length === 0) return activeProducts;

    const now = Date.now();
    const activeFlashIds = new Set(
      flashSales
        .filter((f) => {
          if (f.status === 'active') return true;
          if (f.status === 'upcoming') {
            const start = new Date(f.startTime).getTime();
            const end = new Date(f.endTime).getTime();
            return Number.isFinite(start) && Number.isFinite(end) && now >= start && now < end;
          }
          return false;
        })
        .map((f) => f.id),
    );
    if (activeFlashIds.size === 0) return activeProducts;

    const promoByProduct = new Map<string, number>();
    for (const r of flashSaleRequests) {
      if (r.status !== 'approved' || !activeFlashIds.has(r.flashSaleId)) continue;
      const prev = promoByProduct.get(r.productId);
      if (prev === undefined || r.promotionalPrice < prev) {
        promoByProduct.set(r.productId, r.promotionalPrice);
      }
    }
    if (promoByProduct.size === 0) return activeProducts;

    return activeProducts.map((p) => {
      const promoPrice = promoByProduct.get(p.id);
      if (promoPrice === undefined) return p;
      return {
        ...p,
        finalPrice: promoPrice,
        discountType: 'amount' as const,
        discountValue: p.price - promoPrice,
      };
    });
  }, [rawProducts, flashSales, flashSaleRequests, visibleStoreIds]);

  const MERCHANTS_PAGE_SIZE = 24;

  // واجهات الزبون: دخول، تسجيل، OTP، لوحة التطبيق
  const [view, setView] = useState<'login' | 'signup' | 'otp' | 'forgot' | 'dashboard'>(() =>
    StorageService.get('LOGGED_IN_CUSTOMER_ID') ? 'dashboard' : 'login',
  );
  
  // التابات النشطة في الـ Dashboard
  const [activeTab, setActiveTab] = useState<'stores' | 'merchants' | 'products' | 'orders' | 'wallet' | 'profile'>('stores');
  const [isTabPending, startTabTransition] = useTransition();
  const [visibleMerchantsCount, setVisibleMerchantsCount] = useState(MERCHANTS_PAGE_SIZE);
  const [showFollowedStoresPage, setShowFollowedStoresPage] = useState(false);
  const [followedStoresSearch, setFollowedStoresSearch] = useState('');
  
  // تتبع الطلب المحدد من الإشعارات
  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);

  // جلسة مقارنة الأسعار للمنتجات المشابهة
  const [compareSession, setCompareSession] = useState<{ baseProduct: Product; listOpen: boolean } | null>(null);

  // تتبع الطلب المراد إلغاؤه من قبل الزبون
  const [orderToCancel, setOrderToCancel] = useState<any | null>(null);
  
  // فلاتر موحّدة للمتاجر والمنتجات — تتبع موقع التوصيل الذي يحدده الزبون افتراضياً
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  /** null = محافظة موقع التوصيل الحالي، '' = كل المحافظات، أو اسم محافظة محددة */
  const [catalogProvinceFilter, setCatalogProvinceFilter] = useState<string | null>(null);
  const [catalogCategory, setCatalogCategory] = useState<{ id: string; name: string; sub?: string[] } | null>(null);
  const [catalogSubCategory, setCatalogSubCategory] = useState('');
  const [allProductsSortType, setAllProductsSortType] = useState<'default' | 'price-asc' | 'bestselling' | 'rating-desc'>('default');
  const [catalogFreeDeliveryOnly, setCatalogFreeDeliveryOnly] = useState<boolean>(false);
  const [catalogDiscountOnly, setCatalogDiscountOnly] = useState<boolean>(false);

  // خيارات الفرز لتبويب المتاجر
  const [storesSortType, setStoresSortType] = useState<'default' | 'rating-desc' | 'name-asc' | 'nearest'>('default');

  // خيارات الفرز والفلترة المتقدمة للمنتجات داخل المتجر
  const [storeProductsSearchQuery, setStoreProductsSearchQuery] = useState('');
  const [storeProductsSelectedSubCategory, setStoreProductsSelectedSubCategory] = useState('');
  const [showStoreProductCategories, setShowStoreProductCategories] = useState(false);
  const [showStoreProductSorting, setShowStoreProductSorting] = useState(false);
  const [prodSortType, setProdSortType] = useState<'default' | 'price-asc' | 'rating-desc'>('default');
  const [prodFreeDeliveryOnly, setProdFreeDeliveryOnly] = useState<boolean>(false);
  const [prodDiscountOnly, setProdDiscountOnly] = useState<boolean>(false);
  const [showOnlyDelivered, setShowOnlyDelivered] = useState<boolean>(false);

  // إدارة التصفح داخل المتجر المختار
  const [selectedStore, setRawSelectedStore] = useState<Store | null>(null);

  const setSelectedStore = useCallback((store: Store | null) => {
    // إعادة ضبط الفلترة والفرز المتقدم عند تغيير المتجر المفتوح
    setProdSortType('default');
    setProdFreeDeliveryOnly(false);
    setProdDiscountOnly(false);
    setStoreProductsSearchQuery('');
    setStoreProductsSelectedSubCategory('');
    setShowStoreProductCategories(false);
    setShowStoreProductSorting(false);

    if (store) {
      if (window['appScrollingStateActiveStoreId'] !== store.id) {
        window['appScrollingStateLastScrollY'] = window.scrollY;
      }
      window['appScrollingStateActiveStoreId'] = store.id;
      setRawSelectedStore(store);
      if (!isPopStateRef.current) {
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 0);
      }
    } else {
      window['appScrollingStateActiveStoreId'] = null;
      setRawSelectedStore(null);
      if (!isPopStateRef.current) {
        setTimeout(() => {
          window.scrollTo({ top: window['appScrollingStateLastScrollY'] || 0, behavior: 'instant' });
        }, 50);
      }
    }
  }, []);

  const uniqueStores = useMemo(() => {
    const map = new Map<string, Store>();
    stores.filter(s => !s.isBanned).forEach(s => {
      const key = s.phone || s.shopName;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, s);
      } else if (existing.id === s.id) {
        map.set(key, s);
      } else if (s.status === 'active' && existing.status !== 'active') {
        map.set(key, s);
      }
    });
    return Array.from(map.values());
  }, [stores]);

  const liveSelectedStore = useMemo(() => {
    if (!selectedStore?.id) return selectedStore;
    return stores.find((s) => s.id === selectedStore.id) ?? selectedStore;
  }, [selectedStore, stores]);

  const [showNearbyStoresPage, setShowNearbyStoresPage] = useState(false);
  const [nearbyStoresSearch, setNearbyStoresSearch] = useState('');
  const [showVerifiedStoresPage, setShowVerifiedStoresPage] = useState(false);
  const [verifiedStoresSearch, setVerifiedStoresSearch] = useState('');
  const [showFullOffers, setShowFullOffers] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showSorting, setShowSorting] = useState(false);
  const [showAllProductsSorting, setShowAllProductsSorting] = useState(false);
  const [showAllProductsCategories, setShowAllProductsCategories] = useState(false);
  
  // السلة (Cart)
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{ id: string; code: string; discountValue: number } | null>(null);
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');

  // تفاصيل المنتج المفتوح
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);
  const [productDetailFrom, setProductDetailFrom] = useState<'store' | 'products' | null>(null);

  const reopenCompareList = useCallback(() => {
    setCompareSession((prev) => (prev ? { ...prev, listOpen: true } : null));
    setSelectedProductDetail(null);
    setProductDetailFrom(null);
  }, []);
  const [detailQty, setDetailQty] = useState(1);

  // نظام المشاركة المطور
  const [showShareModal, setShowShareModal] = useState(false);
  const shareRewardGrantedRef = useRef(false);
  const [shareConfig, setShareConfig] = useState<{ type: 'store' | 'product'; data: any } | null>(null);
  const [shareText, setShareText] = useState('');

  // نظام التقييم
  const [showRateModal, setShowRateModal] = useState<{ type: 'store' | 'product'; data: any } | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewMessage, setReviewMessage] = useState('');
  
  // تأكيد الاستبدال
  const [showRedeemConfirm, setShowRedeemConfirm] = useState<number | null>(null);
  const [isRedeemingPoints, setIsRedeemingPoints] = useState(false);

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
  const [showWallet, setShowWallet] = useState(false);
  const [walletSeenRevision, setWalletSeenRevision] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showProfileGiftBadge = useMemo(() => {
    if (!currentCustomer?.id) return false;
    return shouldShowProfileWalletGiftBadge({
      customerId: currentCustomer.id,
      points: currentCustomer.points ?? 0,
      promos: customerWalletPromos,
      minRedeemPoints,
    });
  // walletSeenRevision forces re-check after marking wallet as seen
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCustomer?.id, currentCustomer?.points, customerWalletPromos, minRedeemPoints, walletSeenRevision]);

  useEffect(() => {
    if (!showWallet || !currentCustomer?.id) return;
    markWalletRewardsSeen(currentCustomer.id, currentCustomer.points ?? 0, customerWalletPromos);
    setWalletSeenRevision((n) => n + 1);
  }, [showWallet, currentCustomer?.id, currentCustomer?.points, customerWalletPromos]);

  useEffect(() => {
    if (!currentCustomer?.id) return;
    if (activeTab === 'profile' || showWallet) {
      void refreshCustomerWalletPromos();
    }
  }, [activeTab, showWallet, walletView, currentCustomer?.id, refreshCustomerWalletPromos]);

  // ==========================================
  // نظام التزامن مع تاريخ المتصفح لدعم رجوع الأندرويد وإيماءات اليد
  // ==========================================
  const isPopStateRef = React.useRef(false);
  const appNavDepthRef = React.useRef(1);

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
    return `#/dashboard${sub}`;
  };

  const parseHashToState = (hash: string) => {
    const { path: rawPath } = splitHashPathAndQuery(hash);
    const path = rawPath.replace(/^\/dashboard/, '');
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
    redirectLegacySharePath();
  }, []);

  React.useEffect(() => {
    if (!window.location.hash.startsWith('#/dashboard')) return;

    const initialState = parseHashToState(window.location.hash);
    isPopStateRef.current = true;
    setView(initialState.view);
    setActiveTab(initialState.activeTab);
    if (initialState.showCart) setShowCart(true);
    if (initialState.showNotifications) setShowNotifications(true);
    setTimeout(() => {
      isPopStateRef.current = false;
    }, 50);
  }, []);

  React.useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state || parseHashToState(window.location.hash);
      if (state && (state.isAppNav || window.location.hash.startsWith('#/dashboard'))) {
        isPopStateRef.current = true;
        appNavDepthRef.current = Math.max(1, appNavDepthRef.current - 1);

        if (state.view !== undefined && state.view !== view) {
          setView(state.view);
        }
        if (state.activeTab !== undefined && state.activeTab !== activeTab) {
          setActiveTab(state.activeTab);
        }
        
        // المتجر المختار
        if (state.selectedStoreId) {
          const foundStore = stores.find(s => s.id === state.selectedStoreId) || null;
          setSelectedStore(foundStore);
        } else {
          setSelectedStore(null);
        }

        // تفاصيل المنتج المختار
        if (state.selectedProductDetailId) {
          const foundProduct = products.find(p => p.id === state.selectedProductDetailId) || null;
          setSelectedProductDetail(foundProduct);
          setProductDetailFrom(
            foundProduct
              ? state.selectedStoreId
                ? 'store'
                : state.activeTab === 'products'
                  ? 'products'
                  : 'store'
              : null,
          );
        } else {
          setSelectedProductDetail(null);
          setProductDetailFrom(null);
        }

        // السلة والتنبيهات
        if (state.showCart !== undefined) {
          setShowCart(state.showCart);
        }
        if (state.showNotifications !== undefined) {
          setShowNotifications(state.showNotifications);
        }

        restoreAppScroll(readHistoryScrollY(state));

        setTimeout(() => {
          isPopStateRef.current = false;
        }, 50);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [view, activeTab, stores, products]);

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
        saveScrollToHistoryState();
        window.history.pushState({ ...currentState, scrollY: 0 }, "", hashUrl);
        appNavDepthRef.current += 1;
      }
    } else {
      window.history.replaceState({ ...currentState, isInitial: true, scrollY: window.scrollY }, "", hashUrl);
      appNavDepthRef.current = 1;
    }
  }, [view, activeTab, selectedStore, selectedProductDetail, showCart, showNotifications]);

  React.useEffect(() => {
    if (view !== 'dashboard') return;

    let timeoutId = 0;
    const onScroll = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(saveScrollToHistoryState, 120);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(timeoutId);
    };
  }, [view]);

  // استعادة المتجر/المنتج من الرابط عند تحميل البيانات (يدعم الرجوع والروابط العميقة)
  React.useEffect(() => {
    if (!window.location.hash.startsWith('#/dashboard')) return;

    const navState = window.history.state?.isAppNav
      ? window.history.state
      : parseHashToState(window.location.hash);

    if (navState.selectedStoreId && selectedStore?.id !== navState.selectedStoreId) {
      const foundStore = stores.find((s) => s.id === navState.selectedStoreId) || null;
      if (foundStore) setSelectedStore(foundStore);
    }

    if (navState.selectedProductDetailId && selectedProductDetail?.id !== navState.selectedProductDetailId) {
      const foundProduct = products.find((p) => p.id === navState.selectedProductDetailId) || null;
      if (foundProduct) {
        setSelectedProductDetail(foundProduct);
        setProductDetailFrom(navState.selectedStoreId ? 'store' : navState.activeTab === 'products' ? 'products' : 'store');
      }
    }
  }, [stores, products, selectedStore, selectedProductDetail, setSelectedStore]);

  React.useEffect(() => {
    if (view !== 'dashboard' || !isShareTrackedUrl(window.location.hash)) return;

    if (selectedProductDetail?.storeId && selectedProductDetail.id) {
      void recordShareVisit({
        storeId: selectedProductDetail.storeId,
        kind: 'product',
        productId: selectedProductDetail.id,
        productName: selectedProductDetail.name,
      });
      return;
    }

    if (selectedStore?.id) {
      void recordShareVisit({
        storeId: selectedStore.id,
        kind: 'store',
      });
    }
  }, [view, selectedStore?.id, selectedProductDetail?.id, selectedProductDetail?.storeId, selectedProductDetail?.name]);

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

  // استعادة الموقع بصمت فقط إذا سبق منح إذن النظام (بدون إظهار نافذة جديدة)
  useEffect(() => {
    if (view !== 'dashboard' || !wasLocationPromptHandled() || !wasLocationOsGranted() || userCoords) {
      return;
    }

    void requestLocationPermission().then((result) => {
      if (result.coords) {
        setUserCoords(result.coords);
      } else if (currentCustomer?.lat && currentCustomer?.lng) {
        setUserCoords({ lat: currentCustomer.lat, lng: currentCustomer.lng });
      }
    });
  }, [view, currentCustomer, userCoords]);

  useEffect(() => {
    if (view === 'dashboard' && wasLocationPromptHandled() && !wasLocationOsGranted() && !userCoords) {
      if (currentCustomer?.lat && currentCustomer?.lng) {
        setUserCoords({ lat: currentCustomer.lat, lng: currentCustomer.lng });
      }
    }
  }, [view, currentCustomer, userCoords]);

  useEffect(() => {
    if (!currentCustomer || customers.length === 0) return;

    const updatedCustomer = customers.find(c => c.id === currentCustomer.id);
    if (!updatedCustomer) return;

    const validation = validateUserStatus(updatedCustomer, 'customer');
    if (!validation.valid) {
      setTimeout(() => {
        setCurrentCustomer(null);
        setView('login');
        setLoginError(validation.message);
      }, 0);
    }
  }, [customers, currentCustomer, setCurrentCustomer]);

  // حالة تأكيد التغييرات غير المحفوظة
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingTab, setPendingTab] = useState<any>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  // حالة نموذج حسابي (البيانات الشخصية)
  const [profileForm, setProfileForm] = useState({ name: '' });
  const [savedLocations, setSavedLocations] = useState<CustomerSavedLocation[]>([]);
  const [orderDeliveryLocationId, setOrderDeliveryLocationId] = useState<string | null>(null);
  const [showHeaderLocationPicker, setShowHeaderLocationPicker] = useState(false);
  const [showCartLocationPicker, setShowCartLocationPicker] = useState(false);
  const [profileBaseline, setProfileBaseline] = useState<{ name: string; locations: CustomerSavedLocation[] } | null>(null);

  const isProfileDirty = useCallback(() => {
    if (!currentCustomer || activeTab !== 'profile' || !profileBaseline) return false;
    return (
      profileBaseline.name !== profileForm.name ||
      !locationsEqual(profileBaseline.locations, savedLocations)
    );
  }, [currentCustomer, activeTab, profileBaseline, profileForm.name, savedLocations]);

  const storeRatingsMap = useMemo(
    () => computeStoreRatingsMap(storeReviews),
    [storeReviews],
  );

  const getStoreRating = useCallback(
    (storeId: string, fallbackRating: number) =>
      lookupStoreRating(storeRatingsMap, storeId, fallbackRating),
    [storeRatingsMap],
  );

  const handleTabChange = (newTabId: typeof activeTab) => {
    if (activeTab === 'profile' && isProfileDirty()) {
      setPendingTab(newTabId);
      setShowUnsavedModal(true);
    } else {
      setSelectedStore(null);
      setShowFollowedStoresPage(false);
      setFollowedStoresSearch('');
      setShowVerifiedStoresPage(false);
      setVerifiedStoresSearch('');
      setShowNearbyStoresPage(false);
      setNearbyStoresSearch('');
      startTabTransition(() => setActiveTab(newTabId));
    }
  };

  const navigateToStore = useCallback((store: Store) => {
    if (store.isBanned) return;
    setShowFollowedStoresPage(false);
    setFollowedStoresSearch('');
    setShowVerifiedStoresPage(false);
    setVerifiedStoresSearch('');
    setShowNearbyStoresPage(false);
    setNearbyStoresSearch('');
    startTabTransition(() => {
      setActiveTab('stores');
      setSelectedStore(store);
    });
  }, [setSelectedStore, startTabTransition]);

  const openLoyaltyWallet = (view: 'points' | 'gifts' = 'points') => {
    setWalletView(view);
    setSelectedStore(null);
    setShowWallet(true);
  };

  const handleConfirmUnsaved = async (save: boolean) => {
    if (save) {
      const ok = await handleSaveProfile();
      if (!ok) return;
    } else if (profileBaseline) {
      setProfileForm({ name: profileBaseline.name });
      setSavedLocations(profileBaseline.locations);
      const defaultLocation = getDefaultSavedLocation(profileBaseline.locations);
      setOrderDeliveryLocationId(defaultLocation?.id ?? null);
    }
    
    if (pendingTab === 'logout') {
      handleLogout();
    } else if (pendingTab != null) {
      setSelectedStore(null);
      setActiveTab(pendingTab);
    }
    
    setShowUnsavedModal(false);
    setPendingTab(null);
  };

  const handleLogoutClick = () => {
    if (activeTab === 'profile' && isProfileDirty()) {
      setPendingTab('logout');
      setShowUnsavedModal(true);
      return;
    }
    handleLogout();
  };

  // حالة تغيير كلمة المرور
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [showMyInfo, setShowMyInfo] = useState(false);
  const [showSavedLocations, setShowSavedLocations] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [orderSummary, setOrderSummary] = useState('');
  const [pwStep, setPwStep] = useState(1); // 1: رقم الهاتف, 2: OTP + كلمة مرور جديدة
  const [otpPwCode, setOtpPwCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSendingPwOtp, setIsSendingPwOtp] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  const [isTogglingNotify, setIsTogglingNotify] = useState(false);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useCustomerAndroidBack({
    isPopStateRef,
    appNavDepthRef,
    getHashUrl,
    getSnapshot: () => ({
      view,
      activeTab,
      selectedStore,
      selectedProductDetail,
      showCart,
      showNotifications,
      showShareModal,
      showRateModal,
      showCompareModal: compareSession,
      showUnsavedModal,
      showRedeemConfirm,
      showCartLocationPicker,
      showHeaderLocationPicker,
      showPrivacyPolicy,
      showAboutUs,
      showMyInfo,
      showSavedLocations,
      showWallet,
      showOrderSuccess,
      showPasswordChange,
      showStoreProductCategories,
      showStoreProductSorting,
      showCategories,
      showSorting,
      showAllProductsSorting,
      showAllProductsCategories,
    }),
    actions: {
      setView,
      setActiveTab,
      setSelectedStore,
      setSelectedProductDetail,
      setShowCart,
      setShowNotifications,
      setShowShareModal,
      setShowRateModal,
      setShowCompareModal: setCompareSession,
      reopenCompareList,
      setShowUnsavedModal,
      setPendingTab,
      setShowRedeemConfirm,
      setShowCartLocationPicker,
      setShowHeaderLocationPicker,
      setShowPrivacyPolicy,
      setShowAboutUs,
      setShowMyInfo,
      setShowSavedLocations,
      setShowWallet,
      setShowOrderSuccess,
      setShowPasswordChange,
      setShowStoreProductCategories,
      setShowStoreProductSorting,
      setShowCategories,
      setShowSorting,
      setShowAllProductsSorting,
      setShowAllProductsCategories,
    },
  });

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

  // تحديث الجلسة وتعبئة بيانات الملف الشخصي عند تسجيل الدخول فقط (لا أثناء تعديلات الجلسة)
  useEffect(() => {
    if (authLoading || !authInitialized) return;

    if (currentCustomer) {
      Promise.resolve().then(() => {
        if (view !== 'dashboard') setView('dashboard');
      });
      return;
    }

    const hasPersistedSession = !!StorageService.get('LOGGED_IN_CUSTOMER_ID');
    if (!hasPersistedSession) {
      Promise.resolve().then(() => {
        if (view !== 'login' && view !== 'signup' && view !== 'otp' && view !== 'forgot') {
          setView('login');
        }
      });
    }
  }, [currentCustomer, view, authLoading, authInitialized]);

  useEffect(() => {
    if (!currentCustomer?.id) return;
    const normalizedLocations = normalizeCustomerSavedLocations(currentCustomer);
    const defaultLocation = getDefaultSavedLocation(normalizedLocations);
    setProfileForm({ name: currentCustomer.name });
    setSavedLocations(normalizedLocations);
    setProfileBaseline({ name: currentCustomer.name, locations: normalizedLocations });
    setOrderDeliveryLocationId((prev) => {
      if (prev && normalizedLocations.some((loc) => loc.id === prev)) return prev;
      return defaultLocation?.id ?? null;
    });
    // Sync profile/locations only when the logged-in customer id changes (login/switch).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCustomer?.id]);

  const activeOrderLocation = useMemo(() => {
    const sourceLocations = savedLocations.length
      ? savedLocations
      : (currentCustomer ? normalizeCustomerSavedLocations(currentCustomer) : []);
    return (
      sourceLocations.find((loc) => loc.id === orderDeliveryLocationId) ??
      getDefaultSavedLocation(sourceLocations)
    );
  }, [savedLocations, orderDeliveryLocationId, currentCustomer]);

  const customerDeliveryProvince = activeOrderLocation?.province || currentCustomer?.province || '';

  const customerDeliveryCoords = useMemo(() => {
    if (activeOrderLocation?.lat != null && activeOrderLocation?.lng != null) {
      return { lat: activeOrderLocation.lat, lng: activeOrderLocation.lng };
    }
    if (userCoords) return userCoords;
    if (currentCustomer?.lat != null && currentCustomer?.lng != null) {
      return { lat: currentCustomer.lat, lng: currentCustomer.lng };
    }
    return null;
  }, [activeOrderLocation, userCoords, currentCustomer?.lat, currentCustomer?.lng]);

  /** المحافظة الفعلية للفلترة: موقع الزبون افتراضياً، أو اختيار يدوي */
  const effectiveCatalogProvince = catalogProvinceFilter === null
    ? customerDeliveryProvince
    : catalogProvinceFilter;

  const catalogProvinceSelectValue = catalogProvinceFilter === null
    ? customerDeliveryProvince
    : catalogProvinceFilter;

  const handleCatalogProvinceChange = (value: string) => {
    if (value === '') {
      setCatalogProvinceFilter('');
    } else if (value === customerDeliveryProvince) {
      setCatalogProvinceFilter(null);
    } else {
      setCatalogProvinceFilter(value);
    }
  };

  const resetCatalogFilters = () => {
    setCatalogSearchQuery('');
    setCatalogProvinceFilter(null);
    setCatalogCategory(null);
    setCatalogSubCategory('');
    setStoresSortType('default');
    setAllProductsSortType('default');
    setCatalogFreeDeliveryOnly(false);
    setCatalogDiscountOnly(false);
  };

  const hasActiveCatalogFilters =
    catalogSearchQuery.trim() !== '' ||
    catalogProvinceFilter !== null ||
    catalogCategory !== null ||
    catalogSubCategory !== '' ||
    storesSortType !== 'default' ||
    allProductsSortType !== 'default' ||
    catalogFreeDeliveryOnly ||
    catalogDiscountOnly;

  const headerLocations = useMemo(() => {
    if (savedLocations.length) return savedLocations;
    if (currentCustomer) return normalizeCustomerSavedLocations(currentCustomer);
    return [];
  }, [savedLocations, currentCustomer]);

  const headerLocationSummary = useMemo(() => {
    if (activeOrderLocation) {
      const areaPart = activeOrderLocation.area?.trim() || activeOrderLocation.province;
      return `${activeOrderLocation.label} · ${areaPart}`;
    }
    if (currentCustomer?.province) return currentCustomer.province;
    return 'حدد موقع التوصيل';
  }, [activeOrderLocation, currentCustomer?.province]);

  const HeaderLocationIcon = activeOrderLocation
    ? savedLocationIcon(activeOrderLocation.label)
    : MapPin;

  // حفظ تعديلات البيانات الشخصية
  const handleSaveProfile = async (): Promise<boolean> => {
    if (isSavingProfile) return false;
    const defaultLocation = getDefaultSavedLocation(savedLocations);
    if (!defaultLocation) {
      alert('يرجى إضافة موقع واحد على الأقل 📍');
      return false;
    }
    if (!isSavedLocationAddressComplete(defaultLocation)) {
      alert('يرجى إكمال عنوان الموقع الافتراضي (المحافظة، المنطقة، وأقرب نقطة دالة)');
      return false;
    }
    if (defaultLocation.lat === undefined || defaultLocation.lng === undefined) {
      alert('يرجى تحديد موقع الافتراضي على الخريطة 📍');
      return false;
    }

    const fullAddress = formatSavedLocationAddress(defaultLocation);
    setIsSavingProfile(true);
    try {
      await updateCustomerProfile({
        id: currentCustomer?.id,
        name: profileForm.name,
        province: defaultLocation.province,
        address: fullAddress,
        savedLocations,
        defaultLocationId: defaultLocation.id,
        lat: defaultLocation.lat,
        lng: defaultLocation.lng
      });
      setProfileBaseline({ name: profileForm.name, locations: savedLocations });
      setOrderDeliveryLocationId(defaultLocation.id);
      alert('تم حفظ التعديلات بنجاح! ✅');
      return true;
    } catch {
      alert('تعذر حفظ التعديلات. حاول مرة أخرى.');
      return false;
    } finally {
      setIsSavingProfile(false);
    }
  };

  const [rechargeCodeInput, setRechargeCodeInput] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleRedeemCode = async () => {
    if (!rechargeCodeInput.trim() || !currentCustomer) return;
    setIsRedeeming(true);
    try {
      const p = await redeemRechargeCode(rechargeCodeInput.trim(), currentCustomer.id);
      alert(`🎉 تم شحن ${p.toLocaleString()} نقطة بنجاح لرصيدك!`);
      setRechargeCodeInput('');
    } catch (err: any) {
      alert(err.message || 'الكود غير صالح أو مستخدم مسبقاً ❌');
    } finally {
      setIsRedeeming(false);
    }
  };

  // تغيير كلمة المرور بعد تأكيد OTP
  const handleChangePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pwStep === 1) {
      if (!currentCustomer || isSendingPwOtp) return;
      setIsSendingPwOtp(true);
      try {
        const ok = await authService.requestOTP(currentCustomer.phone, "forgot");
        if (ok) {
          setPwStep(2);
          showToast("success", "تم إرسال رمز التحقق إلى واتساب!");
        } else {
          showModal("error", "فشل إرسال الرمز", "حاول مرة أخرى.");
        }
      } catch (err: any) {
        showModal("error", "خطأ في الاتصال", err.message || "حاول مرة أخرى.");
      } finally {
        setIsSendingPwOtp(false);
      }
    } else {
      if (!otpPwCode || otpPwCode.length < 6) {
        showToast("warning", "يرجى كتابة الرمز كاملاً");
        return;
      }
      if (newPassword.length < 8) {
        showToast("warning", "كلمة المرور يجب أن لا تقل عن 8 حروف أو رموز");
        return;
      }
      if (!currentCustomer || isUpdatingPassword) return;
      setIsUpdatingPassword(true);
      try {
        const result = await resetCustomerPasswordSecure(currentCustomer.phone, otpPwCode, newPassword);
        if (!result.success || !result.customer) {
          showModal("error", "فشل تغيير كلمة المرور", result.error || "تأكد من الرمز المرسل إلى رقم هاتفك.");
          return;
        }
        setCurrentCustomer(result.customer);
        setShowPasswordChange(false);
        setPwStep(1);
        setOtpPwCode('');
        setNewPassword('');
        setTimeout(() => showToast('success', "تم التغيير", 'تم تغيير كلمة المرور بنجاح! ✅'), 400);
      } catch (err: any) {
        showModal("error", "خطأ في تغيير كلمة المرور", err.message || "حاول مرة أخرى.");
      } finally {
        setIsUpdatingPassword(false);
      }
    }
  };

  const resolveStoreOfferBadge = useCallback(
    (store: Store) => getStoreOfferBadge(store, products),
    [products],
  );

  const getStoreDistanceLabel = useCallback(
    (store: Store) => {
      const coords =
        userCoords ||
        (currentCustomer?.lat && currentCustomer?.lng
          ? { lat: currentCustomer.lat, lng: currentCustomer.lng }
          : null);
      if (store.showMap === false || !coords || !store.lat || !store.lng) return null;
      return `${calculateDistance(coords.lat, coords.lng, store.lat, store.lng).toFixed(1)} كم`;
    },
    [userCoords, currentCustomer?.lat, currentCustomer?.lng],
  );

  const verifiedStores = useMemo(() => {
    if (view !== 'dashboard' || (activeTab !== 'stores' && !showVerifiedStoresPage)) return [];
    return uniqueStores.filter(
      (s) => (s.isVerified || (s as Store & { is_verified?: boolean }).is_verified) && isStoreSubscriptionActive(s),
    );
  }, [uniqueStores, view, activeTab, showVerifiedStoresPage]);

  const filteredVerifiedStores = useMemo(() => {
    const q = verifiedStoresSearch.trim().toLowerCase();
    if (!q) return verifiedStores;
    return verifiedStores.filter(
      (s) =>
        s.shopName.toLowerCase().includes(q) ||
        s.area.toLowerCase().includes(q) ||
        (s.username && s.username.toLowerCase().includes(q)),
    );
  }, [verifiedStores, verifiedStoresSearch]);

  const offerStores = useMemo(() => {
    if (view !== 'dashboard' || activeTab !== 'stores') return [];
    return uniqueStores
      .filter((s) => isStoreSubscriptionActive(s) && storeHasDiscountOnAllProducts(s, products))
      .sort((a, b) => {
        const badgeA = getStoreOfferBadge(a, products);
        const badgeB = getStoreOfferBadge(b, products);
        const percentA = badgeA ? parseInt(badgeA, 10) || 0 : 0;
        const percentB = badgeB ? parseInt(badgeB, 10) || 0 : 0;
        return percentB - percentA;
      });
  }, [uniqueStores, products, view, activeTab]);

  const nearbyStores = useMemo(() => {
    if (view !== 'dashboard' || (activeTab !== 'stores' && !showNearbyStoresPage)) return [];
    const active = uniqueStores.filter(isStoreSubscriptionActive);
    const filtered = active.filter((s) => {
      if (!adminSettings.enableAutoNearby) {
        const nearbyIds = adminSettings.nearbyStoreIds || [];
        if (nearbyIds.length > 0) return nearbyIds.includes(s.id);
        return s.province === (currentCustomer?.province || 'بغداد');
      }
      if (userCoords || (currentCustomer?.lat && currentCustomer?.lng)) return true;
      return s.province === (currentCustomer?.province || 'بغداد');
    });

    if (adminSettings.enableAutoNearby) {
      const coords =
        userCoords ||
        (currentCustomer?.lat && currentCustomer?.lng
          ? { lat: currentCustomer.lat, lng: currentCustomer.lng }
          : null);
      if (coords) {
        return [...filtered].sort((a, b) => {
          const distA =
            a.showMap !== false && a.lat && a.lng
              ? calculateDistance(coords.lat, coords.lng, a.lat, a.lng)
              : Infinity;
          const distB =
            b.showMap !== false && b.lat && b.lng
              ? calculateDistance(coords.lat, coords.lng, b.lat, b.lng)
              : Infinity;
          return distA - distB;
        });
      }
    }

    return filtered;
  }, [uniqueStores, adminSettings, currentCustomer?.province, currentCustomer?.lat, currentCustomer?.lng, userCoords, view, activeTab, showNearbyStoresPage]);

  const filteredNearbyStores = useMemo(() => {
    const q = nearbyStoresSearch.trim().toLowerCase();
    if (!q) return nearbyStores;
    return nearbyStores.filter(
      (s) =>
        s.shopName.toLowerCase().includes(q) ||
        s.area.toLowerCase().includes(q) ||
        (s.username && s.username.toLowerCase().includes(q)),
    );
  }, [nearbyStores, nearbyStoresSearch]);

  const storeGridCommonProps = {
    onStoreSelect: setSelectedStore,
    getOfferBadge: resolveStoreOfferBadge,
    getStoreRating: (store: Store) => getStoreRating(store.id, store.rating),
  } as const;

  const filteredStores = React.useMemo(() => {
    if (view !== 'dashboard' || activeTab !== 'merchants') return [];

    let result = uniqueStores.filter(s => {
      if (!isStoreSubscriptionActive(s)) return false;
      const q = catalogSearchQuery.toLowerCase().trim();
      const matchName = !q ||
                        s.shopName.toLowerCase().includes(q) ||
                        (s.username && s.username.toLowerCase().includes(q)) ||
                        s.area.toLowerCase().includes(q);
      const matchProvince = !effectiveCatalogProvince || s.province === effectiveCatalogProvince;
      
      const matchCategory = storeCategoriesMatch(s.category, catalogCategory?.id);

      const matchSubCat = !catalogSubCategory ||
                          s.shopName.includes(catalogSubCategory) ||
                          (s.showLandmark !== false && s.landmark && s.landmark.includes(catalogSubCategory));

      if (catalogFreeDeliveryOnly) {
        const delInfo = getStoreDeliveryInfo(s, customerDeliveryProvince || 'بغداد');
        if (!delInfo.isFree) return false;
      }

      if (catalogDiscountOnly && !storeHasActiveDiscounts(s, products)) {
        return false;
      }

      return matchName && matchProvince && matchCategory && matchSubCat;
    });

    if (storesSortType === 'rating-desc') {
      result = [...result].sort((a, b) => {
        const rA = storeRatingsMap.get(a.id)?.avg ?? a.rating;
        const rB = storeRatingsMap.get(b.id)?.avg ?? b.rating;
        return rB - rA;
      });
    } else if (storesSortType === 'name-asc') {
      result = [...result].sort((a, b) => a.shopName.localeCompare(b.shopName, 'ar'));
    } else if (storesSortType === 'nearest') {
      const coords = customerDeliveryCoords;
      result = [...result].sort((a, b) => {
        if (coords) {
          const distA = a.showMap !== false && a.lat && a.lng ? calculateDistance(coords.lat, coords.lng, a.lat, a.lng) : Infinity;
          const distB = b.showMap !== false && b.lat && b.lng ? calculateDistance(coords.lat, coords.lng, b.lat, b.lng) : Infinity;
          return distA - distB;
        }
        return 0;
      });
    } else {
      result = [...result].sort((a, b) => {
        const isVerifiedA = !!(a.isVerified || (a as any).is_verified);
        const isVerifiedB = !!(b.isVerified || (b as any).is_verified);
        if (isVerifiedA && !isVerifiedB) return -1;
        if (!isVerifiedA && isVerifiedB) return 1;

        const coords = customerDeliveryCoords;
        if (coords) {
          const distA = a.showMap !== false && a.lat && a.lng ? calculateDistance(coords.lat, coords.lng, a.lat, a.lng) : Infinity;
          const distB = b.showMap !== false && b.lat && b.lng ? calculateDistance(coords.lat, coords.lng, b.lat, b.lng) : Infinity;
          return distA - distB;
        }
        return 0;
      });
    }

    return result;
  }, [view, activeTab, uniqueStores, catalogSearchQuery, effectiveCatalogProvince, catalogCategory, catalogSubCategory, storesSortType, catalogFreeDeliveryOnly, catalogDiscountOnly, customerDeliveryCoords, customerDeliveryProvince, storeRatingsMap, products]);

  useEffect(() => {
    setVisibleMerchantsCount(MERCHANTS_PAGE_SIZE);
  }, [catalogSearchQuery, effectiveCatalogProvince, catalogCategory, catalogSubCategory, storesSortType, catalogFreeDeliveryOnly, catalogDiscountOnly, MERCHANTS_PAGE_SIZE]);

  const visibleFilteredStores = useMemo(
    () => filteredStores.slice(0, visibleMerchantsCount),
    [filteredStores, visibleMerchantsCount],
  );

  const followedStoreIds = useMemo(
    () => new Set(currentCustomer?.followedStores ?? []),
    [currentCustomer?.followedStores],
  );

  const followedStoresList = useMemo(() => {
    if (!currentCustomer || view !== 'dashboard' || (activeTab !== 'stores' && !showFollowedStoresPage && activeTab !== 'profile')) {
      return [];
    }
    return uniqueStores
      .filter((s) => followedStoreIds.has(s.id) && isStoreSubscriptionActive(s))
      .sort((a, b) => a.shopName.localeCompare(b.shopName, 'ar'));
  }, [uniqueStores, followedStoreIds, currentCustomer, view, activeTab, showFollowedStoresPage]);

  const filteredFollowedStores = useMemo(() => {
    const q = followedStoresSearch.trim().toLowerCase();
    if (!q) return followedStoresList;
    return followedStoresList.filter(
      (s) =>
        s.shopName.toLowerCase().includes(q) ||
        s.area.toLowerCase().includes(q) ||
        (s.username && s.username.toLowerCase().includes(q)),
    );
  }, [followedStoresList, followedStoresSearch]);

  // تصفية الطلبات الخاصة بالزبون الحالي
  const customerOrders = React.useMemo(() => {
    return [...orders].filter(o => o.customerId === currentCustomer?.id).sort((a, b) => {
      const timeA = (a.createdAt as any)?.toMillis ? (a.createdAt as any).toMillis() : Date.parse((a.createdAt as string) || '');
      const timeB = (b.createdAt as any)?.toMillis ? (b.createdAt as any).toMillis() : Date.parse((b.createdAt as string) || '');
      return (Number(timeB) || 0) - (Number(timeA) || 0);
    });
  }, [orders, currentCustomer?.id]);

  const pendingOrdersCount = useMemo(
    () => customerOrders.reduce((n, o) => (o.status === 'pending' ? n + 1 : n), 0),
    [customerOrders],
  );

  const ORDERS_TAB_LIMIT = 10;

  const displayedCustomerOrders = useMemo(() => {
    let list = targetOrderId ? customerOrders.filter((o) => o.id === targetOrderId) : customerOrders;
    if (showOnlyDelivered) {
      list = list.filter((o) => o.status === 'delivered');
    }
    // تبويب طلباتي: أحدث 10 طلبات فقط
    return targetOrderId ? list : list.slice(0, ORDERS_TAB_LIMIT);
  }, [customerOrders, targetOrderId, showOnlyDelivered]);

  const visibleCustomerOrders = displayedCustomerOrders;

  const customerNotifications = React.useMemo(() => {
    return notifications
      .filter(n => n.userId === currentCustomer?.id && n.role === 'customer')
      .sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
  }, [notifications, currentCustomer?.id]);
  const unreadNotifsCount = notifications.filter(n => n.userId === currentCustomer?.id && n.role === 'customer' && !n.read).length;
  const [lastNotifCount, setLastNotifCount] = useState(unreadNotifsCount);

  useEffect(() => {
    if (unreadNotifsCount > lastNotifCount) {
      const latestNotif = customerNotifications[0];
      if (latestNotif && !latestNotif.read) {
        if (view === 'dashboard') {
          // You can also show an alert if needed
        }
        showLocalNotification(latestNotif.title, latestNotif.message, { type: latestNotif.type, targetId: latestNotif.targetId });
      }
    }
    Promise.resolve().then(() => setLastNotifCount(unreadNotifsCount));
  }, [unreadNotifsCount, view, lastNotifCount, customerNotifications]);

  // تسجيل الدخول
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoadingAuth) return;
    if (!loginPhone.trim()) {
      setLoginError('يرجى إدخال رقم الهاتف');
      return;
    }
    if (!loginPassword) {
      setLoginError('يرجى إدخال كلمة المرور');
      return;
    }
    if (!isLoginPhoneValid) {
      setLoginError('اكتب الرقم المحلي 10 أو 11 رقم، ويبدأ بـ 77 أو 78 أو 79 أو 75، مع أو بدون صفر البداية');
      return;
    }
    if (loginPassword.length < 8) {
      setLoginError('كلمة المرور يجب أن لا تقل عن 8 حروف أو رموز');
      return;
    }

    setIsLoadingAuth(true);
    setLoginError('');
    try {
      const loginResult = await verifyCustomerLogin(loginPhone, loginPassword);
      if (!loginResult.success || !loginResult.customer) {
        if (loginResult.error === 'wrong_password') {
          setLoginError('كلمة المرور غير صحيحة.');
        } else if (loginResult.error === 'service_unavailable') {
          setLoginError('خدمة تسجيل الدخول قيد التحديث. انتظر دقيقة وحاول مجدداً.');
        } else if (loginResult.error === 'network' || loginResult.error === 'auth_required') {
          setLoginError('تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.');
        } else {
          setLoginError('الرقم غير مسجل، يرجى الانتقال لصفحة التسجيل لإنشاء حساب جديد.');
        }
        return;
      }

      const found = loginResult.customer;
      const validation = validateUserStatus(found, 'customer');
      if (!validation.valid) {
        setLoginError(validation.message);
        return;
      }

      const linkedUid = found.authUid;
      if (!linkedUid) {
        setLoginError('تعذر ربط الجلسة. حاول تسجيل الدخول مرة أخرى.');
        return;
      }
      setCurrentCustomer({ ...found, authUid: linkedUid });
      setShowPushPrompt(true);
      setView('dashboard');
      setLoginError('');
    } catch {
      setLoginError('تعذر التحقق من الحساب. حاول مرة أخرى.');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // تسجيل حساب زبون جديد
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoadingAuth) return;
    setLoginError('');
    
    if (!isSignupFormValid) {
      showToast('warning', 'حقول ناقصة', 'يرجى إكمال جميع الحقول المطلوبة.');
      return;
    }

    setIsLoadingAuth(true);

    try {
    // التحقق من عدم تكرار رقم الهاتف (زبون أو تاجر)
    const normalizedSignupPhone = normalizeIraqiPhone(custPhone);
    const phoneCheck = await checkPhoneAvailable(normalizedSignupPhone);
    if (!phoneCheck.available) {
      let message = 'رقم الهاتف مسجل مسبقاً! يرجى تسجيل الدخول أو استخدام رقم آخر.';
      if (phoneCheck.blocked || phoneCheck.entityType === 'blocked') {
        message = 'هذا الرقم محظور من قبل إدارة النظام. تواصل مع الدعم لرفع الحظر.';
      } else if (phoneCheck.entityType === 'store') {
        message = 'رقم الهاتف مسجل مسبقاً كتاجر! لا يمكن استخدامه لإنشاء حساب زبون.';
      }
      setLoginError(message);
      showModal('error', 'تعذر التسجيل', message);
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

      const success = await authService.requestOTP(normalizedSignupPhone, 'signup');
      if (success) {
        showToast("success", "تم إرسال الرمز", "تم إرسال رمز التحقق إلى رقم هاتفك. تحقق من واتساب!");
        setOtpMode('signup');
        setOtpCode('');
        setView('otp');
      } else {
        showModal("error", "فشل الإرسال", "فشل إرسال رمز OTP. يرجى المحاولة لاحقاً");
      }
    } catch (err: any) {
      showModal("error", "خطأ في الاتصال", err.message || "فشل إرسال رمز التحقق. يرجى التأكد من اتصالك بالإنترنت أو المحاولة لاحقاً");
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoadingAuth) return;
    if (!forgotPhone.trim()) {
      setLoginError('يرجى إدخال رقم الهاتف');
      return;
    }
    if (!forgotNewPassword) {
      setLoginError('يرجى إدخال كلمة المرور الجديدة');
      return;
    }
    const validPhone = iraqiPhoneRegex.test(forgotPhone);
    if (!validPhone) {
      setLoginError('اكتب الرقم المحلي 10 أو 11 رقم، ويبدأ بـ 77 أو 78 أو 79 أو 75، مع أو بدون صفر البداية');
      return;
    }
    if (forgotNewPassword.length < 8) {
      setLoginError('كلمة المرور الجديدة يجب أن لا تقل عن 8 حروف أو رموز');
      return;
    }
    setIsLoadingAuth(true);
    try {
      const normalizedForgotPhone = normalizeIraqiPhone(forgotPhone);
      const found =
        customers.find(c => normalizeIraqiPhone(c.phone) === normalizedForgotPhone) ||
        (await lookupCustomerByPhone(forgotPhone));
      if (!found) {
        setLoginError('رقم الهاتف غير مسجل.');
        return;
      }
      setOtpMode('forgot');
      setOtpCode('');
      setView('otp');

      const success = await authService.requestOTP(normalizedForgotPhone, 'forgot');
      if (success) {
        showToast("success", "تم إرسال الرمز", "تم إرسال رمز التحقق إلى رقم هاتفك. تحقق من واتساب!");
      } else {
        showModal("error", "فشل الإرسال", "فشل إرسال رمز OTP. يرجى المحاولة لاحقاً");
      }
    } catch (err: any) {
      showModal("error", "خطأ في الاتصال", err.message || "فشل إرسال رمز التحقق. يرجى التأكد من اتصالك بالإنترنت أو المحاولة لاحقاً");
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleOtpConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoadingAuth) return;

    if (!otpCode || otpCode.length < 6) {
      showToast("warning", "رمز التحقق ناقص", "يرجى إدخال رمز التحقق بالكامل.");
      return;
    }

    if (otpMode === 'forgot') {
      if (forgotNewPassword.length < 8) {
        showToast("warning", "كلمة المرور قصيرة", "كلمة المرور يجب أن لا تقل عن 8 حروف أو رموز");
        return;
      }
      setIsLoadingAuth(true);
      try {
        const result = await resetCustomerPasswordSecure(forgotPhone, otpCode, forgotNewPassword);
        setIsLoadingAuth(false);
        if (result.success && result.customer) {
          setCurrentCustomer(result.customer);
          setView('dashboard');
          setShowPushPrompt(true);
          setTimeout(() => showToast("success", "تم التغيير", "تم تغيير كلمة المرور وتسجيل الدخول بنجاح."), 400);
        } else {
          showModal("error", "فشل إعادة التعيين", result.error || "تأكد من الرمز المرسل إلى رقم هاتفك.");
        }
      } catch (err: any) {
        setIsLoadingAuth(false);
        showModal("error", "خطأ في إعادة التعيين", err.message || "حاول مرة أخرى.");
      }
      return;
    }

    setIsLoadingAuth(true);
    
    try {
      const phoneToVerify = pendingCustomerData?.phone || '';
      const normalizedPhone = normalizeIraqiPhone(phoneToVerify);
      
      const isValid = await authService.verifyOTP(normalizedPhone, otpCode);
      if (!isValid) {
        setLoginError(`رمز OTP غير صحيح. تأكد من الرمز المرسل إلى رقم هاتفك.`);
        showModal("error", "الرمز غير صحيح", "تأكد من الرمز المرسل إلى رقم هاتفك.");
        setIsLoadingAuth(false);
        return;
      }
    } catch (err: any) {
      setIsLoadingAuth(false);
      showModal("error", "خطأ في التحقق", err.message || "الرمز غير صحيح.");
      return;
    }

    if (otpMode === 'signup' && pendingCustomerData) {
      registerCustomer(pendingCustomerData).then(newCust => {
        setIsLoadingAuth(false);
        setCurrentCustomer(newCust);
        setView('dashboard');
        setShowPushPrompt(true);
        showModal("success", "تم التسجيل بنجاح!", `أهلاً بك يا ${newCust.name}! تم تسجيل حسابك بنجاح.`);
        setCustName(''); setCustPhone(''); setCustPassword(''); setCustProvince('بغداد');
        setCustArea(''); setCustMahalla(''); setCustZuqaq(''); setCustDar(''); setCustLandmark('');
        setPendingCustomerData(null);
      }).catch(err => {
        setIsLoadingAuth(false);
        showModal("error", "حدث خطأ", err.message || 'حدث خطأ أثناء إنشاء الحساب.');
        setOtpCode('');
      });
    } else {
      setIsLoadingAuth(false);
      showModal("error", "جلسة ناقصة", "تعذر إكمال العملية. أعد التسجيل من البداية.");
    }
  };

  // إدارة السلة: إضافة منتج (يسمح بالطلب من عدة متاجر بنفس الوقت)
  const addToCart = (product: Product, qty: number = 1) => {
    const existingQty = cart.find((item) => item.product.id === product.id)?.quantity || 0;
    const check = canOrderProductQuantity(product.inventory, qty, existingQty);
    if (!check.ok) {
      showToast('warning', 'الكمية غير متوفرة', check.message || 'تعذرت إضافة المنتج للسلة.');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + qty } : item);
      }
      return [...prev, { product, quantity: qty }];
    });
    const storeName = stores.find(s => s.id === product.storeId)?.shopName || 'المتجر';
    showToast('success', 'تمت الإضافة', `تمت إضافة "${product.name}" من متجر "${storeName}" إلى السلة`);
  };

  const openProductDetail = (product: Product, from: 'store' | 'products') => {
    setProductDetailFrom(from);
    setSelectedProductDetail(product);
    setDetailQty(1);
  };

  React.useEffect(() => {
    if (view !== 'dashboard' || activeTab !== 'products' || products.length === 0) return;
    const hash = window.location.hash;
    const queryIndex = hash.indexOf('?');
    if (queryIndex === -1) return;
    const params = new URLSearchParams(hash.slice(queryIndex + 1));
    const productId = params.get('product');
    if (!productId || selectedProductDetail?.id === productId) return;
    const found = products.find((p) => p.id === productId);
    if (found) openProductDetail(found, 'products');
  }, [view, activeTab, products, selectedProductDetail?.id]);

  const closeProductDetail = () => {
    setSelectedProductDetail(null);
    setProductDetailFrom(null);
  };

  const handleAppBack = useCallback(() => {
    if (appNavDepthRef.current > 1) {
      saveScrollToHistoryState();
      window.history.back();
      return true;
    }
    return false;
  }, []);

  const handleProductDetailBack = () => {
    if (compareSession && !compareSession.listOpen) {
      setCompareSession((prev) => (prev ? { ...prev, listOpen: true } : null));
      closeProductDetail();
      return;
    }
    if (!handleAppBack()) {
      closeProductDetail();
    }
  };

  React.useEffect(() => {
    if (!selectedProductDetail) setProductDetailFrom(null);
  }, [selectedProductDetail]);

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== productId));
      if (cart.length <= 1) setAppliedPromo(null);
      return;
    }
    const item = cart.find((entry) => entry.product.id === productId);
    if (!item) return;
    const check = canOrderProductQuantity(item.product.inventory, quantity, 0);
    if (!check.ok) {
      showToast('warning', 'الكمية غير متوفرة', check.message || 'تعذر تحديث الكمية.');
      return;
    }
    setCart(prev => prev.map(entry => entry.product.id === productId ? { ...entry, quantity } : entry));
  };

  // الطلب السريع: جلب آخر طلب مكتمل وإضافة منتجاته للسلة
  const lastCompletedOrder = currentCustomer
    ? orders
        .filter((o) => o.customerId === currentCustomer.id && o.status === 'delivered')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null;

  const handleQuickReorder = () => {
    if (!lastCompletedOrder) return;

    const itemsToAdd: { product: Product; quantity: number }[] = [];
    let someProductsMissing = false;
    let someQtyAdjusted = false;

    lastCompletedOrder.items.forEach((item: any) => {
      // الطلبات تُحفظ بصيغة { productId, productName, quantity, ... } وليس product.id
      const productId = item.productId || item.product?.id || item.id;
      if (!productId) {
        someProductsMissing = true;
        return;
      }

      const currentProduct = rawProducts.find((p) => p.id === productId);
      if (!currentProduct) {
        someProductsMissing = true;
        return;
      }

      const requestedQty = Math.max(1, Number(item.quantity) || 1);
      const check = canOrderProductQuantity(currentProduct.inventory, requestedQty, 0);
      if (!check.ok) {
        if (hasTrackedInventory(currentProduct.inventory) && (currentProduct.inventory as number) > 0) {
          itemsToAdd.push({ product: currentProduct, quantity: currentProduct.inventory as number });
          someQtyAdjusted = true;
        } else {
          someProductsMissing = true;
        }
        return;
      }

      itemsToAdd.push({ product: currentProduct, quantity: requestedQty });
    });

    if (itemsToAdd.length > 0) {
      setCart(itemsToAdd);
      if (someProductsMissing || someQtyAdjusted) {
        showToast(
          'warning',
          'تنبيه جزء من المنتجات',
          someProductsMissing
            ? 'تمت إضافة المنتجات المتوفرة فقط، بعض المنتجات لم تعد متاحة!'
            : 'تم تعديل بعض الكميات حسب المخزون المتاح.',
        );
      } else {
        showToast('success', 'تم الطلب السريع', 'تم تجهيز السلة بمنتجات طلبك السابق!');
      }
    } else {
      showModal('error', 'فشل الإضافة', 'جميع منتجات هذا الطلب لم تعد متوفرة.');
    }
  };

  // تجميع السلة حسب المتاجر (لحساب التوصيل لكل متجر)
  const cartByStore = useMemo(() => {
    const grouped: Record<string, { store: Store; items: { product: Product; quantity: number }[] }> = {};
    cart.forEach((item) => {
      const store = stores.find((s) => s.id === item.product.storeId);
      if (!store) return;
      if (!grouped[store.id]) {
        grouped[store.id] = { store, items: [] };
      }
      grouped[store.id].items.push(item);
    });
    return grouped;
  }, [cart, stores]);

  const subtotal = useMemo(
    () => cart.reduce((acc, curr) => acc + curr.product.finalPrice * curr.quantity, 0),
    [cart],
  );

  const deliveryCost = useMemo(
    () =>
      Object.values(cartByStore).reduce((acc, group) => {
        const hasFreeDeliveryItem = group.items.some((item) => item.product.isFreeDelivery);
        const province = activeOrderLocation?.province || currentCustomer?.province || 'بغداد';
        const delInfo = getStoreDeliveryInfo(group.store, province);
        if (delInfo.isFree || hasFreeDeliveryItem) return acc;
        return acc + delInfo.price;
      }, 0),
    [cartByStore, activeOrderLocation?.province, currentCustomer?.province],
  );

  const discountAmount = useMemo(() => {
    if (!appliedPromo) return 0;
    return appliedPromo.discountValue;
  }, [appliedPromo]);

  const total = Math.max(0, subtotal + deliveryCost - discountAmount);

  const storeMap = useMemo(() => {
    const map = new Map<string, Store>();
    stores.forEach(s => map.set(s.id, s));
    return map;
  }, [stores]);

  const bestsellerCounts = useMemo(() => {
    if (view !== 'dashboard' || activeTab !== 'products' || allProductsSortType !== 'bestselling') {
      return {} as Record<string, number>;
    }
    const counts: Record<string, number> = {};
    orders.forEach(order => {
      if (order.status !== 'returned' && order.status !== 'rejected') {
        order.items?.forEach(item => {
          const pid = item?.productId || item?.product?.id;
          if (pid) {
            counts[pid] = (counts[pid] || 0) + (item.quantity || 1);
          }
        });
      }
    });
    return counts;
  }, [orders, view, activeTab, allProductsSortType]);

  const filteredCatalogProducts = useMemo(() => {
    if (view !== 'dashboard' || activeTab !== 'products') return [];

    let filtered = products.filter(p => p.status === 'published');

    if (effectiveCatalogProvince) {
      filtered = filtered.filter(p => {
        const store = storeMap.get(p.storeId);
        return store?.province === effectiveCatalogProvince;
      });
    }

    if (catalogSearchQuery.trim()) {
      const q = catalogSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => {
        const store = storeMap.get(p.storeId);
        const nameMatch = p.name?.toLowerCase().includes(q);
        const descMatch = p.description?.toLowerCase().includes(q);
        const brandMatch = p.brand?.toLowerCase().includes(q);
        const catMatch = p.category?.toLowerCase().includes(q);
        const storeMatch = store?.shopName?.toLowerCase().includes(q) || store?.username?.toLowerCase().includes(q);
        const tagMatch = p.tags?.some(t => t.toLowerCase().includes(q));
        return nameMatch || descMatch || brandMatch || catMatch || storeMatch || tagMatch;
      });
    }

    // 3. Filter: Free delivery only
    if (catalogFreeDeliveryOnly) {
      filtered = filtered.filter(p => {
        if (p.isFreeDelivery) return true;
        const store = storeMap.get(p.storeId);
        if (store) {
          const storeDelInfo = getStoreDeliveryInfo(store, customerDeliveryProvince || 'بغداد');
          return storeDelInfo.isFree;
        }
        return false;
      });
    }

    if (catalogDiscountOnly) {
      filtered = filtered.filter(productHasActiveDiscount);
    }

    if (catalogCategory) {
      filtered = filtered.filter(p => {
        const store = storeMap.get(p.storeId);
        const matchesStoreCategory = storeCategoriesMatch(store?.category, catalogCategory.id);
        if (!matchesStoreCategory) return false;
        
        if (catalogSubCategory) {
          const sub = catalogSubCategory.toLowerCase();
          const pCat = p.category?.toLowerCase() || '';
          const pName = p.name?.toLowerCase() || '';
          const pTags = p.tags?.map(t => t.toLowerCase()) || [];
          return pCat.includes(sub) || pName.includes(sub) || pTags.some(t => t.includes(sub));
        }
        return true;
      });
    }

    // 4. Sort type: default, price-asc, rating-desc, bestselling
    if (allProductsSortType === 'price-asc') {
      filtered = [...filtered].sort((a, b) => {
        const pA = a.finalPrice !== undefined ? a.finalPrice : a.price;
        const pB = b.finalPrice !== undefined ? b.finalPrice : b.price;
        return pA - pB;
      });
    } else if (allProductsSortType === 'rating-desc') {
      filtered = [...filtered].sort((a, b) => {
        const rA = a.rating || 0;
        const rB = b.rating || 0;
        return rB - rA;
      });
    } else if (allProductsSortType === 'bestselling') {
      filtered = [...filtered].sort((a, b) => {
        const countA = bestsellerCounts[a.id] || 0;
        const countB = bestsellerCounts[b.id] || 0;
        return countB - countA;
      });
    }

    return filtered;
  }, [view, activeTab, products, catalogSearchQuery, allProductsSortType, catalogFreeDeliveryOnly, catalogDiscountOnly, effectiveCatalogProvince, storeMap, bestsellerCounts, customerDeliveryProvince, catalogCategory, catalogSubCategory]);

  const compareEligibleProducts = useMemo(
    () =>
      products.filter((p) => {
        if (p.status !== 'published') return false;
        const store = storeMap.get(p.storeId);
        return store && store.status === 'active' && !store.isBanned;
      }),
    [products, storeMap],
  );

  const catalogDisplayProducts = useMemo(
    () =>
      filteredCatalogProducts.filter((p) => {
        const store = storeMap.get(p.storeId);
        return store && store.status === 'active' && !store.isBanned;
      }),
    [filteredCatalogProducts, storeMap],
  );

  const storeSubCategories = useMemo(() => {
    if (!selectedStore) return [];
    const storeCategory = STORE_CATEGORIES.find((c) => c.id === selectedStore.category);
    const predefined = storeCategory?.sub || [];
    const dynamic = new Set<string>();

    products
      .filter((p) => p.storeId === selectedStore.id && p.status === 'published')
      .forEach((p) => {
        const category = (p.category || '').trim();
        if (category && !predefined.includes(category)) dynamic.add(category);
        (p.tags || []).forEach((tag) => {
          if (tag.trim() && !predefined.includes(tag)) dynamic.add(tag.trim());
        });
      });

    return [
      ...predefined,
      ...Array.from(dynamic).sort((a, b) => a.localeCompare(b, 'ar')),
    ];
  }, [selectedStore, products]);

  const storeProducts = useMemo(() => {
    if (!selectedStore) return [];
    let filtered = products.filter(p => p.storeId === selectedStore.id && p.status === 'published');

    if (storeProductsSearchQuery.trim()) {
      const q = storeProductsSearchQuery.toLowerCase().trim();
      filtered = filtered.filter((p) => {
        const nameMatch = p.name?.toLowerCase().includes(q);
        const descMatch = p.description?.toLowerCase().includes(q);
        const brandMatch = p.brand?.toLowerCase().includes(q);
        const catMatch = p.category?.toLowerCase().includes(q);
        const tagMatch = p.tags?.some((t) => t.toLowerCase().includes(q));
        return nameMatch || descMatch || brandMatch || catMatch || tagMatch;
      });
    }

    if (storeProductsSelectedSubCategory) {
      const sub = storeProductsSelectedSubCategory.toLowerCase();
      filtered = filtered.filter((p) => {
        const pCat = p.category?.toLowerCase() || '';
        const pName = p.name?.toLowerCase() || '';
        const pTags = p.tags?.map((t) => t.toLowerCase()) || [];
        return (
          p.category === storeProductsSelectedSubCategory ||
          p.tags?.includes(storeProductsSelectedSubCategory) ||
          pCat.includes(sub) ||
          pName.includes(sub) ||
          pTags.some((t) => t.includes(sub))
        );
      });
    }

    // تصفية: توصيل مجاني فقط
    if (prodFreeDeliveryOnly) {
      const storeDelInfo = getStoreDeliveryInfo(selectedStore, currentCustomer?.province || 'بغداد');
      const isStoreFree = storeDelInfo.isFree;
      filtered = filtered.filter(p => p.isFreeDelivery || isStoreFree);
    }

    if (prodDiscountOnly) {
      filtered = filtered.filter(productHasActiveDiscount);
    }

    // ترتيب بحسب التحديد
    if (prodSortType === 'price-asc') {
      filtered = [...filtered].sort((a, b) => {
        const pA = a.finalPrice !== undefined ? a.finalPrice : a.price;
        const pB = b.finalPrice !== undefined ? b.finalPrice : b.price;
        return pA - pB;
      });
    } else if (prodSortType === 'rating-desc') {
      filtered = [...filtered].sort((a, b) => {
        const rA = a.rating || 0;
        const rB = b.rating || 0;
        return rB - rA;
      });
    }

    return filtered;
  }, [
    selectedStore,
    products,
    storeProductsSearchQuery,
    storeProductsSelectedSubCategory,
    prodSortType,
    prodFreeDeliveryOnly,
    prodDiscountOnly,
    currentCustomer?.province,
  ]);

  // تحميل مسبق لصور المتاجر والمنتجات لتظهر فوراً عند فتح الصفحات
  useEffect(() => {
    if (view !== 'dashboard') return;
    prefetchImageUrls(uniqueStores.map((s) => s.logo));
  }, [view, uniqueStores]);

  useEffect(() => {
    if (view !== 'dashboard') return;
    prefetchImageUrls(
      products.filter((p) => p.status === 'published').map((p) => p.image),
    );
  }, [view, products]);

  useEffect(() => {
    if (view !== 'dashboard' || activeTab !== 'products') return;
    prefetchImageUrls(catalogDisplayProducts.slice(0, 30).map((p) => p.image));
  }, [view, activeTab, catalogDisplayProducts]);

  useEffect(() => {
    if (!selectedStore) return;
    prefetchImageUrls([selectedStore.logo, ...storeProducts.map((p) => p.image)]);
  }, [selectedStore, storeProducts]);

  // Leave store page if this customer was blocked from the store
  useEffect(() => {
    if (!selectedStore?.id || !currentCustomer?.blockedStoreIds?.length) return;
    if (currentCustomer.blockedStoreIds.includes(selectedStore.id)) {
      setSelectedStore(null);
      showToast('warning', 'غير متاح', 'أنت محظور من هذا المتجر.');
    }
  }, [selectedStore?.id, currentCustomer?.blockedStoreIds]);

  // Real-time per-store listener: fires immediately with latest data when the
  // user opens any store page (bypasses the collection snapshot cache entirely).
  useEffect(() => {
    if (!selectedStore?.id) return;
    const unsub = subscribeToStore(selectedStore.id, () => {/* stores state is updated inside */});
    return unsub;
  }, [selectedStore?.id, subscribeToStore]);

  useEffect(() => {
    if (!liveSelectedStore || !selectedStore) return;
    if (liveSelectedStore === selectedStore) return;
    const prevTheme = JSON.stringify(selectedStore.storeTheme ?? null);
    const nextTheme = JSON.stringify(liveSelectedStore.storeTheme ?? null);
    if (prevTheme !== nextTheme) {
      setRawSelectedStore(liveSelectedStore);
    }
  }, [liveSelectedStore, selectedStore]);

  const selectedStoreTheme = useMemo(() => resolveStoreTheme(liveSelectedStore), [liveSelectedStore]);

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError('');

    if (!promoInput.trim() || cart.length === 0 || !currentCustomer || isApplyingPromo) return;

    const storeIdsInCart = Object.keys(cartByStore);
    const promoProvince = activeOrderLocation?.province || currentCustomer.province;
    const totalCartPrice = cart.reduce((sum, item) => sum + (item.product.finalPrice * item.quantity), 0);

    setIsApplyingPromo(true);
    try {
      const result = await validatePromoCode({
        code: promoInput,
        customerId: currentCustomer.id,
        storeIdsInCart,
        customerProvince: promoProvince,
        subtotal: totalCartPrice,
      });

      if (!result.valid || result.discount == null || !result.code) {
        setPromoError(result.message || 'الكود غير صحيح أو منتهي الصلاحية ❌');
        return;
      }

      setAppliedPromo({
        id: result.id || result.code,
        code: result.code,
        discountValue: result.discount,
      });
      setPromoInput('');
    } catch (err: unknown) {
      setPromoError(err instanceof Error ? err.message : 'تعذر التحقق من الكود. حاول مرة أخرى.');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  // إرسال الطلب - يرسل طلب منفصل لكل متجر
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !currentCustomer || isPlacingOrder) return;

    const deliveryLocation = activeOrderLocation;
    if (!deliveryLocation) {
      showToast('warning', 'موقع التوصيل', 'يرجى اختيار موقع التوصيل أولاً.');
      setShowCartLocationPicker(true);
      return;
    }
    if (!isSavedLocationAddressComplete(deliveryLocation)) {
      showToast('warning', 'العنوان ناقص', 'يرجى إكمال عنوان موقع التوصيل.');
      setShowCartLocationPicker(true);
      return;
    }

    const deliveryAddress = formatSavedLocationAddress(deliveryLocation);
    const deliveryProvince = deliveryLocation.province || currentCustomer.province || 'بغداد';
    if (!deliveryProvince || !deliveryAddress) {
      showToast('warning', 'العنوان ناقص', 'يرجى تأكيد عنوان التوصيل كاملاً قبل الطلب.');
      setShowCartLocationPicker(true);
      return;
    }

    const storeGroups = Object.entries(cartByStore);
    if (storeGroups.length === 0) {
      showToast('warning', 'السلة', 'تعذر إرسال الطلب. أعد تحميل الصفحة أو أفرغ السلة وأضف المنتجات مجدداً.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      // placeOrderSecure validates the promo server-side; no need for a pre-flight
      // validatePromoCode call (which is a redundant Cloud Function round-trip and
      // requires authUid to be linked — causing failures with points-based LP- codes).
      const promoCodeForOrder: string | undefined = appliedPromo?.code;
      const promoDiscountForOrder = discountAmount;
      const firstStoreId = storeGroups[0][0];

      // Build per-store payloads
      const storePayloads = storeGroups.map(([storeId, group]) => {
        const store = group.store;
        const storeItems = group.items;
        const storeSubtotal = storeItems.reduce((acc, item) => acc + (item.product.finalPrice * item.quantity), 0);
        const delInfo = getStoreDeliveryInfo(store, deliveryProvince);
        const hasFreeDelivery = delInfo.isFree || storeItems.some((item) => item.product.isFreeDelivery);
        const storeDeliveryCost = hasFreeDelivery ? 0 : delInfo.price;
        const storeDiscount = storeId === firstStoreId ? promoDiscountForOrder : 0;
        const storeTotal = Math.max(0, storeSubtotal + storeDeliveryCost - storeDiscount);
        return {
          storeId,
          store,
          storeItems,
          storeSubtotal,
          storeDeliveryCost,
          storeDiscount,
          storeTotal,
          promoCode: storeId === firstStoreId ? promoCodeForOrder : undefined,
        };
      });

      // Place store orders; keep successful ones if some fail (avoid duplicate retry)
      const settled = await Promise.allSettled(
        storePayloads.map(({ store, storeItems, storeSubtotal, storeDeliveryCost, storeDiscount, storeTotal, promoCode }) =>
          placeOrder(
            {
              storeId: store.id,
              storeName: store.shopName,
              customerId: currentCustomer.id,
              customerName: currentCustomer.name,
              customerPhone: currentCustomer.phone,
              customerAddress: deliveryAddress,
              customerProvince: deliveryProvince,
              customerLat: deliveryLocation.lat,
              customerLng: deliveryLocation.lng,
              items: storeItems.map((item) => ({
                productId: item.product.id,
                productName: item.product.name,
                price: item.product.finalPrice,
                quantity: item.quantity,
                image: item.product.image,
              })),
              subtotal: storeSubtotal,
              deliveryPrice: storeDeliveryCost,
              discountAmount: storeDiscount,
              total: storeTotal,
            },
            promoCode,
          ).then((orderId) => ({ orderId, store, storeTotal, storeItems })),
        ),
      );

      const orderResults = settled
        .filter((r): r is PromiseFulfilledResult<{ orderId: string; store: typeof storePayloads[0]['store']; storeTotal: number; storeItems: typeof storePayloads[0]['storeItems'] }> => r.status === 'fulfilled')
        .map((r) => r.value);
      const failedCount = settled.filter((r) => r.status === 'rejected').length;

      if (orderResults.length === 0) {
        const firstReject = settled.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
        throw firstReject?.reason || new Error('تعذر إرسال الطلب. حاول مرة أخرى.');
      }

      const successStoreIds = new Set(orderResults.map((r) => r.store.id));
      setCart((prev) => prev.filter((item) => !successStoreIds.has(item.product.storeId)));
      if (failedCount === 0) {
        setAppliedPromo(null);
      }

      const placedOrderIds = orderResults.map((r) => r.orderId);
      let summary = '';
      let totalValue = 0;
      for (const { store, storeTotal, storeItems } of orderResults) {
        totalValue += storeTotal;
        summary += `📦 "${store.shopName}": ${storeItems.length} منتجات - ${(storeTotal || 0).toLocaleString()} د.ع\n`;
      }
      summary += `\n💰 الإجمالي الكلي: ${(totalValue || 0).toLocaleString()} د.ع`;
      if (failedCount > 0) {
        summary += `\n\n⚠️ فشل إرسال ${failedCount} طلب(ات) — بقيت منتجاتها في السلة.`;
        showToast('warning', 'طلب جزئي', `تم إرسال ${orderResults.length} وفشل ${failedCount}. راجع السلة للمتاجر المتبقية.`);
      }
      setOrderSummary(summary);

      setTargetOrderId(placedOrderIds.length === 1 ? placedOrderIds[0] : null);
      setShowOrderSuccess(true);
      setShowCart(false);
    } catch (err) {
      console.error('[handlePlaceOrder]', err);
      const msg = getCallableErrorMessage(err, 'تعذر إرسال الطلب. حاول مرة أخرى.');
      showToast('error', 'فشل الإرسال', msg);
    } finally {
      setIsPlacingOrder(false);
    }
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

  const ads = useMemo(() => getPublishedSponsoredAds(adminSettings.ads), [adminSettings.ads]);

  const handleCustomerSponsoredAdClick = useCallback((ad: { targetType?: string; targetId?: string; storeId?: string; targetStoreId?: string; link?: string }) => {
    if (ad.targetType === 'store') {
      const s = stores.find((store) => store.id === ad.targetId);
      if (s && !s.isBanned) setSelectedStore(s);
      return;
    }

    if (ad.targetType === 'product') {
      const storeId = ad.storeId || ad.targetStoreId;
      const store = stores.find((item) => item.id === storeId);
      const product = products.find((item) => item.id === ad.targetId);
      if (store && !store.isBanned) {
        setSelectedStore(store);
        if (product) {
          setProductDetailFrom('store');
          setSelectedProductDetail(product);
          setDetailQty(1);
        }
      }
      return;
    }

    if (ad.targetType === 'link' && ad.link) {
      openExternalUrl(ad.link);
      return;
    }

    if (ad.link?.trim()) {
      openExternalUrl(ad.link);
    }
  }, [stores, products]);

  const openShareModal = async (type: 'store' | 'product', data: any) => {
    shareRewardGrantedRef.current = false;

    const payload =
      type === 'store'
        ? buildCustomerStoreSharePayload(data)
        : buildCustomerProductSharePayload(data);

    setShareText(payload.text);
    setShareConfig({ type, data });

    const nativeResult = await tryNativeShare(payload);
    if (nativeResult === 'shared') {
      if (currentCustomer && !shareRewardGrantedRef.current) {
        shareRewardGrantedRef.current = true;
        addCustomerPoints(currentCustomer.id, loyalty.shareRewardPoints);
      }
      return;
    }
    if (nativeResult === 'cancelled') return;

    setShowShareModal(true);
  };

  const executeShare = async (platform: SharePlatform) => {
    if (!shareConfig) return;

    const payload =
      shareConfig.type === 'store'
        ? buildCustomerStoreSharePayload(shareConfig.data)
        : buildCustomerProductSharePayload(shareConfig.data);

    const action = buildPlatformShareAction(platform, shareText, payload.url);
    try {
      if (action.kind === 'copy') {
        await navigator.clipboard.writeText(shareText);
        alert(action.message);
      } else {
        openExternalUrl(action.shareUrl);
      }

      if (currentCustomer && !shareRewardGrantedRef.current) {
        shareRewardGrantedRef.current = true;
        addCustomerPoints(currentCustomer.id, loyalty.shareRewardPoints);
      }
    } catch {
      showToast('error', 'تعذر المشاركة', 'فشل النسخ أو فتح الرابط. حاول مرة أخرى.');
    }
  };

  // تحويل النقاط إلى كود خصم
  const handleRedeemPoints = async (pointsRequired: number) => {
    setShowRedeemConfirm(pointsRequired);
  };

  const confirmRedeemPoints = async () => {
    if (!showRedeemConfirm || isRedeemingPoints) return;
    const pointsRequired = showRedeemConfirm;
    setShowRedeemConfirm(null);
    setIsRedeemingPoints(true);
    try {
      const res = await convertPointsToPromo(currentCustomer!.id, pointsRequired);
      if (res.success) {
        showToast('success', 'تم الاستبدال!', `كود الخصم: ${res.code}`);
        setWalletView('gifts');
        setSelectedStore(null);
        setShowWallet(true);
      } else {
        showToast('error', 'تعذر الاستبدال', res.message);
      }
    } finally {
      setIsRedeemingPoints(false);
    }
  };

  // تسجيل الخروج للزبون
  const handleLogout = async () => {
    await logoutSession();
    setView('login');
    setActiveTab('stores');
    setSelectedStore(null);
    setCart([]);
    navigate('/', { replace: true });
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
                 setCatalogSearchQuery('');
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
      <div className={`min-h-screen max-w-[100vw] flex flex-col text-right font-sans selection:bg-violet/30 selection:text-violet pb-20 relative ${selectedStore ? (selectedStoreTheme.enabled ? 'overflow-x-hidden bg-mahalak-gradient' : 'overflow-x-hidden overflow-y-auto bg-deep-navy') : 'overflow-x-hidden overflow-y-auto bg-deep-navy'}`} dir="rtl">
        {showPushPrompt && (
          <PushPermissionPrompt
            userType="customer"
            onComplete={() => setShowPushPrompt(false)}
            onLocationGranted={(coords) => setUserCoords(coords)}
          />
        )}
        {/* خلفية ثابتة خفيفة جداً بدون blur ثقيل */}
        {!selectedStore && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            <div className="absolute inset-0 bg-mahalak-gradient" />
          </div>
        )}
        {selectedStore && !selectedStoreTheme.enabled && <WelcomeScreenBackground lite />}
        {selectedStore ? (
          <div
            className={`min-h-screen flex flex-col animate-slide-up relative z-10 ${
              selectedStoreTheme.enabled
                ? storePageBackgroundProps(selectedStoreTheme).className
                : 'bg-transparent'
            }`}
            style={{
              ...storeThemeCssVars(selectedStoreTheme),
              ...(selectedStoreTheme.enabled ? storePageBackgroundProps(selectedStoreTheme).style : {}),
            }}
          >
            {/* خلفية المتجر العلوية ومعلوماته */}
            <header
              className={`relative shadow-xs transition-all duration-300 ${
                selectedStoreTheme.enabled
                  ? 'bg-white'
                  : 'welcome-card-glow welcome-card-border-glow bg-white/5 border-b border-white/20 backdrop-blur-md'
              }`}
            >
              <div
                className={`h-16 sm:h-20 overflow-hidden relative ${
                  selectedStoreTheme.enabled
                    ? storeGradientToLeftProps(selectedStoreTheme).className
                    : 'bg-gradient-to-l from-vibrant-purple/80 to-deep-navy/90'
                }`}
                style={selectedStoreTheme.enabled ? storeGradientToLeftProps(selectedStoreTheme).style : undefined}
              >
                 <div
                   className="absolute inset-0 opacity-15"
                   style={{ background: selectedStoreTheme.headerBackground }}
                 />
              </div>
              
              <div className="absolute top-3 right-3 z-10 flex gap-2">
                <button 
                  onClick={() => { if (!handleAppBack()) setSelectedStore(null); }} 
                  className={`px-2.5 py-1 rounded-xl shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1 font-bold text-[9.5px] sm:text-xs font-tajawal ${
                    selectedStoreTheme.enabled
                      ? 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-100'
                      : 'welcome-btn-pulse bg-white/10 hover:bg-white/20 text-white border border-white/30 backdrop-blur-md'
                  }`}
                >
                  <ChevronRight size={14} />
                  <span>رجوع</span>
                </button>
              </div>

              <div
                className={`max-w-4xl mx-auto px-3 py-4 sm:p-5 flex flex-col md:flex-row items-center md:items-center relative gap-3 text-center md:text-right w-full ${
                  selectedStoreTheme.enabled
                    ? storeInfoBarProps(selectedStoreTheme).className
                    : 'welcome-card-border-glow bg-white/5 border border-white/20 backdrop-blur-md rounded-b-2xl'
                }`}
                style={selectedStoreTheme.enabled ? storeInfoBarProps(selectedStoreTheme).style : undefined}
              >
                <div className="relative shrink-0">
                  <ProductImage
                    src={selectedStore.logo}
                    alt={selectedStore.shopName}
                    size="custom"
                    priority
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 border-white/40 shadow-md -mt-10 bg-white relative z-10 overflow-hidden"
                    imageClassName="rounded-xl"
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
                      <h1
                        className={`text-sm sm:text-base md:text-lg font-black tracking-tight font-tajawal ${selectedStoreTheme.enabled ? '' : 'text-white'}`}
                        style={selectedStoreTheme.enabled ? themeFieldTextStyle(selectedStoreTheme.fields.shopNameColor) : undefined}
                      >
                        {selectedStore.shopName}
                      </h1>
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-md text-[9px] font-black border border-amber-100/50">
                        <Sparkles size={10} />
                        <span>{getStoreRating(selectedStore.id, selectedStore.rating)}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1.5 justify-center md:justify-start">
                      {(selectedStore.badges || [])
                        .filter((badgeId) => badgeId !== 'premium')
                        .map(badgeId => {
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
                    <div
                      className={`flex flex-wrap items-center gap-3 justify-center md:justify-start text-[9px] sm:text-[10px] font-bold ${
                        selectedStoreTheme.enabled ? '' : 'text-white/70'
                      }`}
                      style={selectedStoreTheme.enabled ? themeFieldTextStyle(selectedStoreTheme.fields.infoBarTextColor) : undefined}
                    >
                      <div className="flex items-center gap-1">
                        <MapPin
                          size={11}
                          style={selectedStoreTheme.enabled ? { color: themeFieldIconColor(selectedStoreTheme.fields.iconColor) } : undefined}
                          className={selectedStoreTheme.enabled ? '' : 'text-vibrant-purple'}
                        />
                        <span>{selectedStore.province}</span>
                      </div>
                      {selectedStore.showPhone !== false && (
                        <div className="flex items-center gap-1">
                          <Phone size={11} className={selectedStoreTheme.enabled ? '' : 'text-emerald-500'} style={selectedStoreTheme.enabled ? { color: selectedStoreTheme.iconColor } : undefined} />
                          <span className="tracking-wide" dir="ltr">{selectedStore.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2 justify-center md:justify-start">
                    {(() => {
                      const delInfo = getStoreDeliveryInfo(selectedStore, currentCustomer?.province || 'بغداد');
                      return (
                        <div className={`px-2 py-0.5 rounded-lg text-[8.5px] sm:text-[9.5px] font-black border transition-colors ${delInfo.isFree ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                          🚚 التوصيل: {delInfo.isFree ? 'مجاني بالكامل' : `${delInfo.price.toLocaleString()} د.ع`}
                        </div>
                      );
                    })()}
                    <div
                      className={`px-2 py-0.5 rounded-lg text-[8.5px] sm:text-[9.5px] font-black border ${
                        selectedStoreTheme.enabled ? '' : 'bg-violet/10 text-white border-violet/25'
                      }`}
                      style={
                        selectedStoreTheme.enabled
                          ? {
                              backgroundColor: `${selectedStoreTheme.primaryColor}22`,
                              color: selectedStoreTheme.infoBarTextColor,
                              borderColor: `${selectedStoreTheme.infoBarBorderColor}66`,
                            }
                          : undefined
                      }
                    >
                      📦 {storeProducts.length} منتج
                    </div>
                  </div>
                </div>

                {/* أزرار التفاعل المدمجة والأنيقة */}
                <div className="relative z-10 flex gap-1.5 items-center justify-center w-full md:w-auto mt-2.5 md:mt-0">
                  <button 
                    onClick={() => {
                      if (!currentCustomer) {
                        alert('يرجى تسجيل الدخول لتقييم المتجر');
                        return;
                      }
                      setShowRateModal({ type: 'store', data: selectedStore });
                    }}
                    className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl font-bold text-[9.5px] transition-all border border-white/50 font-tajawal active:scale-95 ${
                      selectedStoreTheme.enabled ? '' : 'welcome-btn-pulse'
                    }`}
                    style={
                      selectedStoreTheme.enabled
                        ? themeFieldTextStyle(selectedStoreTheme.fields.buttonTextColor)
                        : undefined
                    }
                  >
                    <Sparkles size={11} />
                    <span>قيّم المتجر</span>
                  </button>
                  <button 
                    onClick={async () => {
                      if (!currentCustomer) {
                        alert('يرجى تسجيل الدخول لمتابعة المتجر');
                        return;
                      }
                      if (isTogglingFollow) return;
                      setIsTogglingFollow(true);
                      try {
                        await toggleFollowStore(currentCustomer.id, selectedStore.id);
                      } finally {
                        setIsTogglingFollow(false);
                      }
                    }}
                    disabled={isTogglingFollow}
                    className={`flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-xl font-bold text-[9.5px] transition-all active:scale-95 border font-tajawal disabled:opacity-60 ${
                      selectedStoreTheme.enabled ? '' : 'welcome-btn-pulse'
                    } ${
                      isFollowing 
                      ? (selectedStoreTheme.enabled ? 'text-white shadow-2xs' : 'bg-vibrant-purple text-white border-vibrant-purple shadow-2xs')
                      : 'text-white border-white/50'
                    }`}
                    style={
                      isFollowing && selectedStoreTheme.enabled
                        ? {
                            backgroundColor: selectedStoreTheme.primaryColor,
                            borderColor: selectedStoreTheme.primaryColor,
                            ...themeFieldTextStyle(selectedStoreTheme.fields.buttonTextColor),
                          }
                        : !isFollowing && selectedStoreTheme.enabled
                          ? themeFieldTextStyle(selectedStoreTheme.fields.buttonTextColor)
                          : undefined
                    }
                  >
                    {isTogglingFollow ? <Loader2 size={11} className="animate-spin" /> : (isFollowing ? <Heart size={11} fill="currentColor" /> : <Plus size={11} />)}
                    <span>{isTogglingFollow ? 'جاري...' : (isFollowing ? 'متابع' : 'متابعة')}</span>
                  </button>
                  
                  <button 
                    onClick={async () => {
                      if (!currentCustomer) {
                        alert('يرجى تسجيل الدخول لتفعيل الإشعارات');
                        return;
                      }
                      if (isTogglingNotify) return;
                      setIsTogglingNotify(true);
                      try {
                        await toggleStoreNotification(currentCustomer.id, selectedStore.id);
                      } finally {
                        setIsTogglingNotify(false);
                      }
                    }}
                    disabled={isTogglingNotify}
                    className={`p-1.5 rounded-xl border transition-all active:scale-95 shadow-2xs ${
                      selectedStoreTheme.enabled || isNotifOn ? '' : 'welcome-btn-pulse'
                    } ${
                      isNotifOn 
                      ? 'bg-amber-50 text-amber-600 border-amber-100' 
                      : 'text-white border-white hover:border-white/50'
                    }`}
                    style={
                      !isNotifOn && selectedStoreTheme.enabled
                        ? themeFieldTextStyle(selectedStoreTheme.fields.buttonTextColor)
                        : undefined
                    }
                  >
                    <Bell size={12} fill={isNotifOn ? 'currentColor' : 'none'} />
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => openShareModal('store', selectedStore)}
                    className={`relative z-10 p-1.5 text-white border border-white rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer ${
                      selectedStoreTheme.enabled ? '' : 'welcome-btn-pulse'
                    }`}
                    style={
                      selectedStoreTheme.enabled
                        ? themeFieldTextStyle(selectedStoreTheme.fields.buttonTextColor)
                        : undefined
                    }
                    title="مشاركة المتجر"
                    aria-label="مشاركة المتجر"
                  >
                    <Share2 size={12} />
                  </button>
                </div>
              </div>
            </header>

            <main className="flex-1 p-3 sm:p-5 max-w-4xl mx-auto w-full min-w-0 overflow-x-hidden">
              {/* Promo Banner (Advanced Marketing) */}
              {(selectedStore as any).promoBanner?.isActive && (
                <div 
                  className="mb-6 p-4 sm:p-5 rounded-[1.5rem] flex flex-col items-center justify-center text-center shadow-lg hover:shadow-xl transition-all"
                  style={{ 
                    backgroundColor: (selectedStore as any).promoBanner.backgroundColor || "#7B3DFF", 
                    color: (selectedStore as any).promoBanner.textColor || "#ffffff" 
                  }}
                >
                  <h4 className="font-black text-lg sm:text-xl mb-1">{(selectedStore as any).promoBanner.title}</h4>
                  <p className="font-bold text-xs sm:text-sm opacity-95">{(selectedStore as any).promoBanner.subtitle}</p>
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-1.5 h-6 rounded-full ${selectedStoreTheme.enabled ? '' : 'bg-vibrant-purple'}`}
                    style={selectedStoreTheme.enabled ? { backgroundColor: selectedStoreTheme.primaryColor } : undefined}
                  />
                  <h2
                    className={`text-xs sm:text-sm font-black ${selectedStoreTheme.enabled ? '' : 'text-white'}`}
                    style={selectedStoreTheme.enabled ? themeFieldTextStyle(selectedStoreTheme.fields.sectionTitleColor) : undefined}
                  >
                    منتجات المتجر
                  </h2>
                </div>
                {cart.length > 0 && (
                  <button 
                    onClick={() => setShowCart(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg font-bold text-[9.5px] font-tajawal shadow-sm ${
                      selectedStoreTheme.enabled ? 'animate-pulse' : 'welcome-btn-pulse'
                    } ${storePrimaryBgProps(selectedStoreTheme).className}`}
                    style={{
                      ...storePrimaryBgProps(selectedStoreTheme).style,
                      ...(selectedStoreTheme.enabled ? themeFieldTextStyle(selectedStoreTheme.fields.buttonTextColor) : {}),
                    }}
                  >
                    <ShoppingBag size={12} />
                    <span>السلة ({cart.length})</span>
                  </button>
                )}
              </div>

              {/* لوحة البحث والفلترة — خاصة بالمتجر (بدون محافظة) */}
              <div
                id="store-product-filters"
                className={`p-4 sm:p-5 rounded-[2.2rem] shadow-sm space-y-4 mb-6 scroll-mt-28 font-tajawal ${
                  selectedStoreTheme.enabled
                    ? `border border-white/10 brand-gradient-border ${storeGradientProps(selectedStoreTheme).className}`
                    : 'welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md'
                }`}
                style={selectedStoreTheme.enabled ? storeGradientProps(selectedStoreTheme).style : undefined}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3
                    className={`font-black text-sm flex items-center gap-2 ${selectedStoreTheme.enabled ? '' : 'text-white'}`}
                    style={selectedStoreTheme.enabled ? themeFieldTextStyle(selectedStoreTheme.fields.buttonTextColor) : undefined}
                  >
                    <Search size={16} style={selectedStoreTheme.enabled ? { color: selectedStoreTheme.iconColor } : undefined} className={selectedStoreTheme.enabled ? '' : 'text-[#E9DAFF]'} />
                    <span>البحث والفلترة</span>
                  </h3>
                  {(storeProductsSearchQuery || storeProductsSelectedSubCategory || prodSortType !== 'default' || prodFreeDeliveryOnly || prodDiscountOnly) && (
                    <button
                      type="button"
                      onClick={() => {
                        setStoreProductsSearchQuery('');
                        setStoreProductsSelectedSubCategory('');
                        setProdSortType('default');
                        setProdFreeDeliveryOnly(false);
                        setProdDiscountOnly(false);
                      }}
                      className={`text-white hover:opacity-90 px-3 py-1.5 rounded-xl text-[10px] font-black transition-colors flex items-center gap-1 active:scale-95 cursor-pointer border ${
                        selectedStoreTheme.enabled ? storeGradientProps(selectedStoreTheme).className : 'welcome-btn-pulse bg-gradient-to-r from-[#7B3DFF] to-[#0B1320] border-[#7B3DFF]/60'
                      }`}
                      style={{
                        ...(selectedStoreTheme.enabled ? storeGradientProps(selectedStoreTheme).style : {}),
                        borderColor: selectedStoreTheme.enabled ? selectedStoreTheme.infoBarBorderColor : undefined,
                        ...(selectedStoreTheme.enabled ? themeFieldTextStyle(selectedStoreTheme.fields.buttonTextColor) : {}),
                      }}
                    >
                      <RefreshCw size={12} />
                      <span>مسح الفلاتر</span>
                    </button>
                  )}
                </div>

                <div className="relative group">
                  <Search size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-[#E9DAFF] transition-colors" />
                  <input
                    type="text"
                    value={storeProductsSearchQuery}
                    onChange={(e) => setStoreProductsSearchQuery(e.target.value)}
                    placeholder="البحث باسم المنتج، الماركة أو القسم..."
                    className="w-full bg-white/10 border border-white/20 pr-11 pl-4 py-3.5 rounded-2xl text-[11px] font-bold shadow-2xs focus:ring-2 focus:ring-vibrant-purple/20 transition-all placeholder:text-white/40 font-tajawal text-white text-right outline-none"
                  />
                </div>

                <div className="pt-2 border-t border-white/20 font-tajawal">
                  <button
                    type="button"
                    onClick={() => setShowStoreProductCategories(!showStoreProductCategories)}
                    className="w-full flex items-center justify-between text-white hover:text-white/80 transition-colors py-1 cursor-pointer select-none"
                  >
                    <span className="text-[11px] font-black flex items-center gap-1.5 flex-wrap">
                      🏷️ تصنيفات المنتجات الرئيسية
                      {selectedStore?.category && (
                        <span className="bg-white/15 text-[9.5px] px-2 py-0.5 rounded-full font-bold border border-white/20" style={selectedStoreTheme.enabled ? themeFieldTextStyle(selectedStoreTheme.fields.filterBadgeColor) : undefined}>
                          {getStoreCategoryLabel(selectedStore.category)}
                        </span>
                      )}
                      {storeProductsSelectedSubCategory && (
                        <span className="bg-white/15 text-white text-[9.5px] px-2 py-0.5 rounded-full font-bold border border-white/20">
                          {storeProductsSelectedSubCategory}
                        </span>
                      )}
                    </span>
                    <ChevronDown size={14} className={`text-white/70 hover:text-white transition-transform duration-300 ${showStoreProductCategories ? 'rotate-180' : ''}`} />
                  </button>

                  {showStoreProductCategories && (
                    <div className="space-y-3 pt-3.5 animate-fade-in">
                      {storeSubCategories.length === 0 ? (
                        <p className="text-[10px] font-bold text-white/60 px-1">
                          لا توجد تصنيفات فرعية محددة لهذا المتجر بعد.
                        </p>
                      ) : (
                        <>
                          <span className="text-[9.5px] font-black text-white/60 block px-1">التصنيف الفرعي:</span>
                          <div className="flex overflow-x-auto gap-1.5 pb-1.5 scrollbar-none" dir="rtl">
                            <button
                              type="button"
                              onClick={() => setStoreProductsSelectedSubCategory('')}
                              className={`px-3 py-1.5 rounded-xl text-[9.5px] font-bold border shrink-0 cursor-pointer active:scale-95 ${
                                storeProductsSelectedSubCategory === ''
                                  ? 'bg-white border-white font-extrabold shadow-sm'
                                  : 'bg-white/10 text-white border-white/25 hover:bg-white/20'
                              }`}
                              style={
                                storeProductsSelectedSubCategory === '' && selectedStoreTheme.enabled
                                  ? themeFieldTextStyle(selectedStoreTheme.fields.filterChipActiveText)
                                  : undefined
                              }
                            >
                              الكل
                            </button>
                            {storeSubCategories.map((sub) => (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => setStoreProductsSelectedSubCategory(sub)}
                                className={`px-3 py-1.5 rounded-xl text-[9.5px] font-bold border shrink-0 cursor-pointer active:scale-95 ${
                                  storeProductsSelectedSubCategory === sub
                                    ? 'bg-white border-white font-extrabold shadow-sm'
                                    : 'bg-white/10 text-white border-white/25 hover:bg-white/20'
                                }`}
                                style={
                                  storeProductsSelectedSubCategory === sub && selectedStoreTheme.enabled
                                    ? themeFieldTextStyle(selectedStoreTheme.fields.filterChipActiveText)
                                    : undefined
                                }
                              >
                                {sub}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-white/20 font-tajawal">
                  <button
                    type="button"
                    onClick={() => setShowStoreProductSorting(!showStoreProductSorting)}
                    className="w-full flex items-center justify-between text-white hover:text-white/80 transition-colors py-1 cursor-pointer select-none"
                  >
                    <span className="text-[11px] font-black flex items-center gap-1.5 flex-wrap">
                      📊 خيارات الفرز والترتيب للمنتجات
                      {prodSortType !== 'default' && (
                        <span className="bg-white/15 text-[9.5px] px-2 py-0.5 rounded-full font-bold border border-white/20" style={selectedStoreTheme.enabled ? themeFieldTextStyle(selectedStoreTheme.fields.filterBadgeColor) : undefined}>
                          {prodSortType === 'price-asc' ? 'السعر: الأقل للأعلى' : 'الأكثر تقييماً'}
                        </span>
                      )}
                      {prodFreeDeliveryOnly && (
                        <span className="bg-emerald-500/20 text-emerald-300 text-[9.5px] px-2 py-0.5 rounded-full border border-emerald-400/30 font-bold">
                          🚚 توصيل مجاني
                        </span>
                      )}
                      {prodDiscountOnly && (
                        <span className="bg-rose-500/20 text-rose-200 text-[9.5px] px-2 py-0.5 rounded-full border border-rose-400/30 font-bold">
                          🏷️ خصومات
                        </span>
                      )}
                    </span>
                    <ChevronDown size={14} className={`text-white/70 hover:text-white transition-transform duration-300 ${showStoreProductSorting ? 'rotate-180' : ''}`} />
                  </button>

                  {showStoreProductSorting && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 animate-fade-in">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9.5px] font-black text-white/60 ml-1">ترتيب حسب:</span>
                        <button
                          type="button"
                          onClick={() => setProdSortType('default')}
                          className={`px-3.5 py-2 rounded-xl text-[10px] font-black transition-all border cursor-pointer active:scale-95 ${
                            prodSortType === 'default'
                              ? 'bg-white border-white shadow-sm'
                              : 'bg-white/10 text-white border-white/25 hover:bg-white/20'
                          }`}
                          style={
                            prodSortType === 'default' && selectedStoreTheme.enabled
                              ? themeFieldTextStyle(selectedStoreTheme.fields.filterChipActiveText)
                              : undefined
                          }
                        >
                          🔄 الافتراضي
                        </button>
                        <button
                          type="button"
                          onClick={() => setProdSortType('price-asc')}
                          className={`px-3.5 py-2 rounded-xl text-[10px] font-black transition-all border cursor-pointer active:scale-95 ${
                            prodSortType === 'price-asc'
                              ? 'bg-white border-white shadow-sm'
                              : 'bg-white/10 text-white border-white/25 hover:bg-white/20'
                          }`}
                          style={
                            prodSortType === 'price-asc' && selectedStoreTheme.enabled
                              ? themeFieldTextStyle(selectedStoreTheme.fields.filterChipActiveText)
                              : undefined
                          }
                        >
                          📈 السعر من الأقل للأعلى
                        </button>
                        <button
                          type="button"
                          onClick={() => setProdSortType('rating-desc')}
                          className={`px-3.5 py-2 rounded-xl text-[10px] font-black transition-all border cursor-pointer active:scale-95 ${
                            prodSortType === 'rating-desc'
                              ? 'bg-white border-white shadow-sm'
                              : 'bg-white/10 text-white border-white/25 hover:bg-white/20'
                          }`}
                          style={
                            prodSortType === 'rating-desc' && selectedStoreTheme.enabled
                              ? themeFieldTextStyle(selectedStoreTheme.fields.filterChipActiveText)
                              : undefined
                          }
                        >
                          ⭐ الأكثر تقييماً
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setProdDiscountOnly((prev) => !prev)}
                          className={`px-3.5 py-2 rounded-xl text-[10px] font-black transition-all border flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                            prodDiscountOnly
                              ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                              : 'bg-white/10 text-white border-white/25 hover:bg-white/20'
                          }`}
                        >
                          <span>🏷️ خصومات فقط</span>
                          {prodDiscountOnly && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setProdFreeDeliveryOnly((prev) => !prev)}
                          className={`px-3.5 py-2 rounded-xl text-[10px] font-black transition-all border flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                            prodFreeDeliveryOnly
                              ? 'bg-emerald-400 text-deep-navy border-emerald-400 shadow-sm'
                              : 'bg-white/10 text-white border-white/25 hover:bg-white/20'
                          }`}
                        >
                          <span>🚚 توصيل مجاني فقط</span>
                          {prodFreeDeliveryOnly && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedStore && (
                <StoreProductSections
                  variant="onDark"
                  products={storeProducts}
                  storeCategoryId={selectedStore.category}
                  storeTheme={selectedStoreTheme}
                  showStoreName={false}
                  getStoreName={() => selectedStore.shopName}
                  onProductClick={(prod) => openProductDetail(prod, 'store')}
                  onAddToCart={addToCart}
                  onShareProduct={(prod) =>
                    openShareModal('product', { ...prod, shopName: selectedStore.shopName })
                  }
                />
              )}

              {/* آراء وتقييمات العملاء */}
              {selectedStore && (
                <div className={`mt-12 mb-8 p-6 rounded-[2.5rem] shadow-sm ${
                  selectedStoreTheme.enabled
                    ? 'card-dark'
                    : 'welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md'
                }`}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-2 h-8 rounded-full ${selectedStoreTheme.enabled ? 'bg-amber-400' : 'bg-vibrant-purple welcome-icon-pulse'}`}></div>
                    <h2 className="text-xl font-black text-white">تقييمات الزبائن</h2>
                    <span className="bg-white/10 text-white/70 text-xs font-bold px-3 py-1 rounded-full mr-auto border border-white/20 backdrop-blur-md">
                      {storeReviews.filter(r => r.storeId === selectedStore.id).length} تقييم
                    </span>
                  </div>
                  
                  {storeReviews.filter(r => r.storeId === selectedStore.id).length === 0 ? (
                    <div className="text-center py-8 text-white/60">
                      <p className="text-sm font-bold">لا توجد تقييمات لهذا المتجر بعد.</p>
                      <p className="text-xs">كن أول من يقيّم {selectedStore.shopName}!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {storeReviews.filter(r => r.storeId === selectedStore.id).map(review => (
                        <div key={review.id} className={`p-4 rounded-2xl ${
                          selectedStoreTheme.enabled
                            ? 'bg-white/5 border border-white/10'
                            : 'welcome-card-border-glow bg-white/5 border border-white/20 backdrop-blur-md'
                        }`}>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-white text-sm">{review.customerName}</h4>
                            <div className="flex text-amber-400 text-xs" dir="ltr">
                              {[1, 2, 3, 4, 5].map(star => (
                                <span key={star} className={star <= review.rating ? 'text-amber-400' : 'text-white/20'}>★</span>
                              ))}
                            </div>
                          </div>
                          {review.message && (
                            <p className="text-white/80 text-sm">{review.message}</p>
                          )}
                          <p className="text-[10px] text-white/50 mt-2">{formatSafeDateTimeString(review.createdAt, 'ar-IQ', { dateStyle: 'short', timeStyle: 'short' })}</p>
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
          <div className="relative z-10 flex flex-col flex-1 min-h-0">
            {/* الهيدر العلوي - تصميم موحد مع WelcomeScreen */}
            <header className={`sticky top-0 customer-welcome-header transition-all shadow-sm ${showNotifications ? 'z-50' : 'z-40'}`}>
              <div className="max-w-4xl mx-auto px-4 h-16 flex justify-between items-center gap-2">
                
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  {activeTab !== 'stores' && (
                    <button 
                      onClick={() => handleTabChange('stores')}
                      className="p-2 merchant-icon-tile text-slate-300 rounded-xl hover:bg-white/15 hover:text-white transition-all border border-transparent ml-1 flex items-center justify-center shrink-0"
                      title="الرجوع للرئيسية"
                    >
                      <ChevronRight size={20} />
                    </button>
                  )}
                  <MahalakLogo className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 object-contain" />
                  <div className="min-w-0 flex-1 text-right relative">
                    <h2 className="text-xs sm:text-sm font-black leading-tight truncate text-white">محلك</h2>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNotifications(false);
                        setShowHeaderLocationPicker((prev) => !prev);
                      }}
                      className="flex items-center gap-1 max-w-full text-[9px] sm:text-[10px] font-bold text-slate-300 hover:text-white transition-colors mt-0.5"
                      aria-expanded={showHeaderLocationPicker}
                      aria-label="تغيير موقع التوصيل"
                    >
                      <HeaderLocationIcon size={11} className="shrink-0 text-amber-400" />
                      <span className="truncate">{headerLocationSummary}</span>
                      <ChevronDown
                        size={12}
                        className={`shrink-0 transition-transform duration-200 ${showHeaderLocationPicker ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {showHeaderLocationPicker && (
                      <>
                        <button
                          type="button"
                          className="fixed inset-0 z-40 cursor-default"
                          aria-label="إغلاق قائمة المواقع"
                          onClick={() => setShowHeaderLocationPicker(false)}
                        />
                        <div className="absolute top-full right-0 left-0 sm:left-auto sm:w-80 mt-2 welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-deep-navy/95 border border-white/30 backdrop-blur-md rounded-2xl shadow-2xl z-50 animate-dropdown overflow-hidden text-right relative">
                          <WelcomeScreenBackground lite />
                          <div className="relative z-10">
                          <div className="p-3 border-b border-white/15 bg-white/5">
                            <p className="text-xs font-black text-white">موقع التوصيل</p>
                            <p className="text-[10px] text-white/55 font-bold mt-0.5">البيت، العمل، أو أي موقع آخر</p>
                          </div>
                          <div className="max-h-56 overflow-y-auto divide-y divide-white/10">
                            {headerLocations.map((loc) => {
                              const LocIcon = savedLocationIcon(loc.label);
                              const isActive = activeOrderLocation?.id === loc.id;
                              return (
                                <button
                                  key={loc.id}
                                  type="button"
                                  onClick={() => {
                                    setOrderDeliveryLocationId(loc.id);
                                    setShowHeaderLocationPicker(false);
                                  }}
                                  className={`w-full p-3 flex items-center gap-3 hover:bg-white/10 transition-colors ${isActive ? 'bg-white/10' : ''}`}
                                >
                                  <div className={`p-2 rounded-xl shrink-0 border ${isActive ? 'bg-vibrant-purple text-white border-white/30 welcome-icon-pulse' : 'bg-white/10 text-white/70 border-white/20'}`}>
                                    <LocIcon size={15} />
                                  </div>
                                  <div className="flex-1 min-w-0 text-right">
                                    <p className="text-xs font-black text-white">
                                      {loc.label}
                                      {loc.isDefault ? ' · الافتراضي' : ''}
                                    </p>
                                    <p className="text-[10px] text-white/50 font-bold truncate">
                                      {loc.province}{loc.area ? ` — ${loc.area}` : ''}
                                    </p>
                                  </div>
                                  {isActive && <Check size={15} className="text-[#fff700] shrink-0" />}
                                </button>
                              );
                            })}
                            {headerLocations.length === 0 && (
                              <p className="p-4 text-center text-[10px] text-white/45 font-bold">
                                لا توجد مواقع محفوظة بعد
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowHeaderLocationPicker(false);
                              handleTabChange('profile');
                              setShowSavedLocations(true);
                            }}
                            className="welcome-btn-pulse w-full p-3 flex items-center justify-center gap-2 border-t border-white/15 text-white bg-white/5 hover:bg-white/10 transition-colors"
                          >
                            <Plus size={15} />
                            <span className="text-xs font-black">إضافة أو تعديل موقع</span>
                          </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 relative">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowHeaderLocationPicker(false);
                      if (!showNotifications && unreadNotifsCount > 0 && currentCustomer) {
                        markAllNotificationsAsRead(currentCustomer.id, "customer");
                      }
                      setShowNotifications(!showNotifications);
                    }}
                    className={`relative p-2.5 bg-white/10 text-amber-300 hover:bg-white/20 rounded-full transition-all border flex items-center justify-center shadow-sm ${
                      showNotifications ? 'border-amber-300/60 bg-white/20' : 'border-white/25'
                    }`}
                  >
                    <Bell size={20} strokeWidth={1.75} />
                    {unreadNotifsCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-deep-navy">
                        {unreadNotifsCount}
                      </span>
                    )}
                  </button>

                  <button 
                    type="button"
                    onClick={() => {
                      setShowHeaderLocationPicker(false);
                      setShowNotifications(false);
                      setShowCart(true);
                    }}
                    className="relative p-2.5 bg-white/10 text-white hover:bg-white/20 rounded-full transition-all border border-white/20 flex items-center justify-center shadow-sm"
                  >
                    <ShoppingCart size={20} strokeWidth={1.75} />
                    {cart.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-vibrant-purple text-white text-[10px] font-black flex items-center justify-center rounded-full shadow-lg border-2 border-deep-navy">
                        {cart.reduce((sum, item) => sum + item.quantity, 0)}
                      </span>
                    )}
                  </button>

                  {/* قائمة التنبيهات — منسدلة صغيرة تحت الجرس بدون دفع السلايدر */}
                  {showNotifications && (
                    <>
                      <button
                        type="button"
                        aria-label="إغلاق التنبيهات"
                        className="fixed inset-0 z-40 cursor-default bg-transparent"
                        onClick={() => setShowNotifications(false)}
                      />
                      <div className="absolute left-0 top-12 z-50 w-[min(19rem,calc(100vw-1.5rem))] bg-[#0F1830] border border-white/20 rounded-2xl shadow-2xl overflow-hidden text-white">
                        <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between gap-2 bg-white/5">
                          <h3 className="text-xs font-black text-white">التنبيهات الأخيرة</h3>
                          <span className="text-[9px] font-black text-white/70 bg-white/10 border border-white/15 px-2 py-0.5 rounded-full">
                            {customerNotifications.length} تنبيه
                          </span>
                        </div>

                        <div className="max-h-56 overflow-y-auto overscroll-contain">
                          {customerNotifications.length === 0 ? (
                            <div className="px-4 py-6 text-center text-white/45">
                              <BellOff size={22} className="mx-auto mb-1.5 opacity-40" />
                              <p className="text-[10px] font-bold">لا توجد إشعارات جديدة</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-white/10">
                              {customerNotifications.slice(0, 20).map((n) => (
                                <div
                                  key={n.id}
                                  className={`px-3 py-2.5 text-right hover:bg-white/10 transition-colors cursor-pointer ${!n.read ? 'bg-white/5' : ''}`}
                                  onClick={() => {
                                    markNotificationAsRead(n.id);
                                    if (n.type === 'order') {
                                      if (n.targetId) setTargetOrderId(n.targetId);
                                      handleTabChange('orders');
                                    } else if (n.type === 'promo') {
                                      setSelectedStore(null);
                                      setWalletView('gifts');
                                      setShowWallet(true);
                                    } else if (n.type === 'system' && (n.title?.includes('نقاط') || n.title?.includes('محفظة'))) {
                                      setSelectedStore(null);
                                      setWalletView('points');
                                      setShowWallet(true);
                                    } else if (n.type === 'product' && n.targetId) {
                                      const prod = products.find((p) => p.id === n.targetId);
                                      if (prod) {
                                        const store = stores.find((s) => s.id === prod.storeId);
                                        if (store && !store.isBanned) {
                                          navigateToStore(store);
                                          openProductDetail(prod, 'store');
                                        }
                                      }
                                    } else {
                                      handleTabChange('stores');
                                    }
                                    setShowNotifications(false);
                                  }}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <h4 className={`text-[11px] font-black mb-0.5 leading-snug truncate ${!n.read ? 'text-white' : 'text-white/75'}`}>{n.title}</h4>
                                      <p className="text-[10px] text-white/50 font-medium leading-relaxed line-clamp-2">{n.message}</p>
                                      <span className="text-[8px] text-white/35 font-bold mt-1 block">
                                        {formatSafeDateTimeString(n.createdAt, 'ar-IQ', { dateStyle: 'short', timeStyle: 'short' })}
                                      </span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                                      {!n.read && <span className="w-1.5 h-1.5 bg-[#fff700] rounded-full" />}
                                      <button
                                        type="button"
                                        title="حذف التنبيه"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void deleteNotification(n.id);
                                        }}
                                        className="p-1 rounded-md text-white/30 hover:text-rose-300 hover:bg-rose-500/15 transition-colors"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {customerNotifications.length > 0 && (
                          <div className="px-3 py-2 border-t border-white/10 flex items-center justify-between gap-2 bg-white/[0.03]">
                            <button
                              type="button"
                              onClick={async () => {
                                if (!currentCustomer) return;
                                const confirmed = await showConfirm(
                                  'حذف كل التنبيهات؟',
                                  'سيتم حذف جميع التنبيهات نهائياً ولا يمكن استرجاعها.',
                                  'حذف الكل',
                                  'إلغاء',
                                );
                                if (!confirmed.isConfirmed) return;
                                const deleted = await deleteAllNotifications(currentCustomer.id, 'customer');
                                if (deleted > 0) showToast('success', `تم حذف ${deleted} تنبيه`);
                              }}
                              className="text-[9px] font-black text-rose-300/80 hover:text-rose-200 transition-colors"
                            >
                              حذف الكل
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowNotifications(false)}
                              className="text-[9px] font-black text-white/50 hover:text-white transition-colors"
                            >
                              إغلاق
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </header>

        {/* التاب المفتوح حالياً */}
        <main className="flex-1 p-3 sm:p-5 max-w-4xl mx-auto w-full min-w-0 overflow-x-hidden">
          
          {/* صفحة المتاجر الموثقة */}
          {activeTab === 'stores' && showVerifiedStoresPage && (
            <div className="space-y-5 animate-fade-in px-1 text-right font-tajawal" dir="rtl">
              <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.5rem] p-5 sm:p-6 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />
                <div className="relative z-10 space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowVerifiedStoresPage(false);
                      setVerifiedStoresSearch('');
                    }}
                    className="flex items-center gap-1.5 text-[10px] font-black text-[#E9DAFF] hover:text-white transition-colors"
                  >
                    <ChevronRight size={14} />
                    <span>رجوع للرئيسية</span>
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                      <VerifiedBadge size={20} />
                    </div>
                    <div>
                      <h1 className="text-lg sm:text-xl font-black font-tajawal">المتاجر الموثقة</h1>
                      <p className="text-[10px] text-purple-100 font-bold mt-0.5">
                        {verifiedStores.length} متجر موثّق
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {verifiedStores.length > 3 && (
                <div className="welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md p-4 rounded-[2.2rem] shadow-lg">
                  <div className="relative group">
                    <Search size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-vibrant-purple transition-colors" />
                    <input
                      type="text"
                      value={verifiedStoresSearch}
                      onChange={(e) => setVerifiedStoresSearch(e.target.value)}
                      placeholder="ابحث في المتاجر الموثقة..."
                      className="w-full bg-white/10 border border-white/20 pr-11 pl-4 py-3.5 rounded-2xl text-[11px] font-bold shadow-2xs focus:ring-2 focus:ring-vibrant-purple/10 focus:border-vibrant-purple transition-all placeholder:text-slate-350 text-white text-right outline-none"
                    />
                  </div>
                </div>
              )}

              {filteredVerifiedStores.length === 0 ? (
                <div className="py-20 text-center welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.5rem] shadow-lg">
                  <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <VerifiedBadge size={40} />
                  </div>
                  <p className="text-white font-black">
                    {verifiedStores.length === 0
                      ? 'لا توجد متاجر موثقة حالياً'
                      : 'لا توجد نتائج لهذا البحث'}
                  </p>
                  <p className="text-white text-[10px] mt-2 font-bold px-10 leading-relaxed text-center">
                    {verifiedStores.length === 0
                      ? 'ستظهر هنا المتاجر التي تحصل على شارة التوثيق من محلك.'
                      : 'جرّب كلمات بحث أخرى أو امسح البحث.'}
                  </p>
                  {verifiedStores.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowVerifiedStoresPage(false);
                        setVerifiedStoresSearch('');
                      }}
                      className="welcome-btn-pulse mt-6 px-5 py-2.5 bg-brand-horizontal text-white transition rounded-xl text-xs font-black cursor-pointer"
                    >
                      العودة للرئيسية
                    </button>
                  )}
                </div>
              ) : (
                <StoreGrid
                  {...storeGridCommonProps}
                  stores={filteredVerifiedStores}
                  className="px-1 animate-fade-in"
                  gridClassName="grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4"
                  variant="onDark"
                />
              )}
            </div>
          )}

          {/* صفحة المتاجر القريبة */}
          {activeTab === 'stores' && showNearbyStoresPage && (
            <div className="space-y-5 animate-fade-in px-1 text-right font-tajawal" dir="rtl">
              <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.5rem] p-5 sm:p-6 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />
                <div className="relative z-10 space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNearbyStoresPage(false);
                      setNearbyStoresSearch('');
                    }}
                    className="flex items-center gap-1.5 text-[10px] font-black text-[#E9DAFF] hover:text-white transition-colors"
                  >
                    <ChevronRight size={14} />
                    <span>رجوع للرئيسية</span>
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                      <MapPin size={20} className="text-white" />
                    </div>
                    <div>
                      <h1 className="text-lg sm:text-xl font-black font-tajawal">المتاجر القريبة منك</h1>
                      <p className="text-[10px] text-purple-100 font-bold mt-0.5">
                        {nearbyStores.length} متجر قريب
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {nearbyStores.length > 3 && (
                <div className="welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md p-4 rounded-[2.2rem] shadow-lg">
                  <div className="relative group">
                    <Search size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-vibrant-purple transition-colors" />
                    <input
                      type="text"
                      value={nearbyStoresSearch}
                      onChange={(e) => setNearbyStoresSearch(e.target.value)}
                      placeholder="ابحث في المتاجر القريبة..."
                      className="w-full bg-white/10 border border-white/20 pr-11 pl-4 py-3.5 rounded-2xl text-[11px] font-bold shadow-2xs focus:ring-2 focus:ring-vibrant-purple/10 focus:border-vibrant-purple transition-all placeholder:text-slate-350 text-white text-right outline-none"
                    />
                  </div>
                </div>
              )}

              {filteredNearbyStores.length === 0 ? (
                <div className="py-20 text-center welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.5rem] shadow-lg">
                  <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MapPin size={40} className="text-white" />
                  </div>
                  <p className="text-white font-black">
                    {nearbyStores.length === 0
                      ? 'لا توجد متاجر قريبة حالياً'
                      : 'لا توجد نتائج لهذا البحث'}
                  </p>
                  <p className="text-white text-[10px] mt-2 font-bold px-10 leading-relaxed text-center">
                    {nearbyStores.length === 0
                      ? 'فعّل الموقع أو حدّد محافظتك لعرض المتاجر الأقرب إليك.'
                      : 'جرّب كلمات بحث أخرى أو امسح البحث.'}
                  </p>
                  {nearbyStores.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowNearbyStoresPage(false);
                        setNearbyStoresSearch('');
                      }}
                      className="welcome-btn-pulse mt-6 px-5 py-2.5 bg-brand-horizontal text-white transition rounded-xl text-xs font-black cursor-pointer"
                    >
                      العودة للرئيسية
                    </button>
                  )}
                </div>
              ) : (
                <StoreGrid
                  {...storeGridCommonProps}
                  stores={filteredNearbyStores}
                  getDistanceLabel={getStoreDistanceLabel}
                  className="px-1 animate-fade-in"
                  gridClassName="grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4"
                  variant="onDark"
                />
              )}
            </div>
          )}

          {/* صفحة متاجر المتابعة */}
          {activeTab === 'stores' && showFollowedStoresPage && (
            <div className="space-y-5 animate-fade-in px-1 text-right font-tajawal" dir="rtl">
              <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.5rem] p-5 sm:p-6 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />
                <div className="relative z-10 space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFollowedStoresPage(false);
                      setFollowedStoresSearch('');
                    }}
                    className="flex items-center gap-1.5 text-[10px] font-black text-[#E9DAFF] hover:text-white transition-colors"
                  >
                    <ChevronRight size={14} />
                    <span>رجوع للرئيسية</span>
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                      <Heart size={20} className="text-white" fill="white" />
                    </div>
                    <div>
                      <h1 className="text-lg sm:text-xl font-black font-tajawal">المتاجر التي أتابعها</h1>
                      <p className="text-[10px] text-purple-100 font-bold mt-0.5">
                        {followedStoresList.length} متجر في قائمتك
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {followedStoresList.length > 3 && (
                <div className="welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md p-4 rounded-[2.2rem] shadow-lg">
                  <div className="relative group">
                    <Search size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-vibrant-purple transition-colors" />
                    <input
                      type="text"
                      value={followedStoresSearch}
                      onChange={(e) => setFollowedStoresSearch(e.target.value)}
                      placeholder="ابحث في متاجرك المتابَعة..."
                      className="w-full bg-white/10 border border-white/20 pr-11 pl-4 py-3.5 rounded-2xl text-[11px] font-bold shadow-2xs focus:ring-2 focus:ring-vibrant-purple/10 focus:border-vibrant-purple transition-all placeholder:text-slate-350 text-white text-right outline-none"
                    />
                  </div>
                </div>
              )}

              {filteredFollowedStores.length === 0 ? (
                <div className="py-20 text-center welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.5rem] shadow-lg">
                  <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Heart size={40} className="text-white" fill="white" />
                  </div>
                  <p className="text-white font-black">
                    {followedStoresList.length === 0
                      ? 'لم تتابع أي متجر بعد'
                      : 'لا توجد نتائج لهذا البحث'}
                  </p>
                  <p className="text-white text-[10px] mt-2 font-bold px-10 leading-relaxed text-center">
                    {followedStoresList.length === 0
                      ? 'اضغط «متابعة» على أي متجر ليظهر هنا وتصلك عروضه بسهولة.'
                      : 'جرّب كلمات بحث أخرى أو امسح البحث.'}
                  </p>
                  {followedStoresList.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowFollowedStoresPage(false);
                        setFollowedStoresSearch('');
                      }}
                      className="welcome-btn-pulse mt-6 px-5 py-2.5 bg-brand-horizontal text-white transition rounded-xl text-xs font-black cursor-pointer"
                    >
                      العودة للرئيسية
                    </button>
                  )}
                </div>
              ) : (
                <StoreGrid
                  {...storeGridCommonProps}
                  stores={filteredFollowedStores}
                  className="px-1 animate-fade-in"
                  variant="onDark"
                />
              )}
            </div>
          )}

          {/* تاب المتاجر والتصفح */}
          {activeTab === 'stores' && !showVerifiedStoresPage && !showNearbyStoresPage && !showFollowedStoresPage && (
            <div className="space-y-6">
              {/* شريط الإعلانات المتحرك (Slider) */}
              {ads.length > 0 && (
                <SponsoredAdSlider
                  ads={ads}
                  adInterval={adminSettings.adInterval || 5}
                  badgeLabel={adminSettings.adBadgeText}
                  className="mx-1"
                  onAdClick={handleCustomerSponsoredAdClick}
                />
              )}

              {/* عروض فلاش سيلز */}
              {(() => {
                const activeFlashSales = flashSales.filter(f => f.status === 'active' || (f.status === 'upcoming' && new Date() >= new Date(f.startTime) && new Date() < new Date(f.endTime)));
                if (activeFlashSales.length === 0) return null;
                return (
                  <div className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 shadow-2xl relative overflow-hidden group mx-1 mb-4 text-white">
                    <div className="absolute -top-10 -right-10 text-white/10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                      <Zap size={140} />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-l from-rose-600/25 to-transparent pointer-events-none" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="welcome-icon-pulse p-2 bg-white/15 border border-white/25 backdrop-blur-sm rounded-xl">
                            <Zap size={18} fill="currentColor" className="text-[#fff700]" />
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
                              className="w-40 shrink-0 welcome-card-border-glow bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/25 cursor-pointer hover:bg-white/20 transition-all text-center"
                            >
                                <span className="block text-[10px] font-bold text-white/80 truncate mb-1">{fs.title}</span>
                                {targetStore && (
                                  <div className="flex items-center gap-2 justify-center mt-2 bg-white/10 border border-white/20 rounded-xl p-1.5 text-white">
                                    <img src={targetStore.logo} className="w-6 h-6 rounded-lg shrink-0 object-cover border border-white/20" alt="" />
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

              {/* قسم العروض — متاجر لديها خصم على كل المنتجات المنشورة */}
              <div
                className="welcome-card-glow welcome-card-shimmer welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 shadow-2xl relative overflow-hidden group mx-1"
              >
                <div className="absolute top-0 left-0 w-24 h-24 bg-rose-500/5 rounded-full -ml-8 -mt-8"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-rose-500/15 border border-rose-400/25 text-rose-200 rounded-xl">
                        <Percent size={18} />
                      </div>
                      <h3 className="font-black text-white text-xs tracking-tight">العروض</h3>
                    </div>
                    {offerStores.length > 4 && (
                      <button
                        onClick={() => setShowFullOffers(!showFullOffers)}
                        className="text-[10px] font-black text-white hover:text-violet transition"
                      >
                        {showFullOffers ? 'أقل' : 'الكل'}
                      </button>
                    )}
                  </div>

                  {offerStores.length === 0 ? (
                    <div className="py-8 text-center text-white text-xs font-bold italic">لا توجد عروض حالياً</div>
                  ) : (
                    <StoreGrid
                      {...storeGridCommonProps}
                      stores={showFullOffers ? offerStores : offerStores.slice(0, 4)}
                      gridClassName="grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4"
                      variant="onDark"
                    />
                  )}
                </div>
              </div>

              {/* دخول صفحة المتاجر الموثقة */}
              <button
                type="button"
                onClick={() => setShowVerifiedStoresPage(true)}
                className="w-full flex items-center justify-between gap-3 welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.2rem] px-4 py-3 shadow-lg hover:bg-white/10 transition-all active:scale-[0.99] mx-1"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                    <VerifiedBadge size={15} />
                  </div>
                  <div className="text-right min-w-0">
                    <p className="text-[10.5px] font-black text-white leading-tight">المتاجر الموثقة</p>
                    <p className="text-[9px] font-bold text-purple-100 truncate">
                      {verifiedStores.length > 0
                        ? `${verifiedStores.length} متجر موثّق — اضغط للعرض`
                        : 'لا توجد متاجر موثقة حالياً'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 text-white">
                  {verifiedStores.length > 0 && (
                    <span className="text-[10px] font-black bg-white/15 border border-white/20 px-2 py-0.5 rounded-lg">
                      {verifiedStores.length}
                    </span>
                  )}
                  <ChevronLeft size={16} className="text-[#E9DAFF]" />
                </div>
              </button>

              {/* الفعاليات المركزية */}
              {flashSales.some(f => (f.status === 'active' || (f.status === 'upcoming' && new Date() >= new Date(f.startTime) && new Date() < new Date(f.endTime)))) && (
                <div className="space-y-4">
                  {flashSales.filter(f => (f.status === 'active' || (f.status === 'upcoming' && new Date() >= new Date(f.startTime) && new Date() < new Date(f.endTime)))).map(sale => {
                    const approvedReqs = flashSaleRequests.filter(r => r.flashSaleId === sale.id && r.status === 'approved');
                    if(approvedReqs.length === 0) return null;
                    return (
                      <div key={sale.id} className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-6 text-white shadow-2xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                          <Zap size={150} />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-l from-rose-600/20 via-transparent to-transparent pointer-events-none" />
                        <div className="relative z-10 text-right">
                           <div className="flex justify-between items-start mb-4">
                              <div>
                                <span className="bg-white/15 border border-white/25 text-[#fff700] text-[10px] font-black px-3 py-1 rounded-full mb-2 inline-flex items-center gap-1"><Zap size={12} className="fill-current" /> فعالية نشطة</span>
                                <h3 className="text-2xl font-black">{sale.title}</h3>
                                <p className="text-sm text-white/80 mt-1 max-w-lg">{sale.description}</p>
                              </div>
                              <div className="bg-white/10 border border-white/20 backdrop-blur px-4 py-2 rounded-2xl text-center min-w-[100px]">
                                <span className="text-[10px] font-bold block text-white/60 uppercase tracking-widest mb-1">ينتهي في</span>
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
                                     <div key={req.id} onClick={() => { setSelectedStore(store); openProductDetail(promoProduct, 'store'); }} className="welcome-card-border-glow bg-white/10 hover:bg-white/20 transition cursor-pointer backdrop-blur-md rounded-2xl p-3 border border-white/25 text-right group">
                                       <div className="overflow-hidden rounded-xl mb-3 h-24 relative shadow-inner bg-white/5 border border-white/15">
                                         <div className="absolute top-0 right-0 bg-rose-500/90 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg rounded-tr-xl z-20 shadow-md">عرض خاص</div>
                                         <ProductImage
                                           src={p.image}
                                           alt={p.name}
                                           size="custom"
                                           priority
                                           variant="dark"
                                           className="w-full h-full"
                                           imageClassName="group-hover:scale-110 transition duration-500"
                                         />
                                       </div>
                                       <h4 className="font-bold text-xs truncate drop-shadow-md mb-1">{p.name}</h4>
                                       <div className="flex gap-2 items-center flex-wrap">
                                          <span className="font-black text-[#fff700] text-sm bg-white/10 border border-white/20 px-2 py-0.5 rounded-lg shadow-sm">{req.promotionalPrice.toLocaleString()} <span className="text-[8px] text-white">د.ع</span></span>
                                          <del className="text-[10px] text-white/50">{p.price.toLocaleString()}</del>
                                       </div>
                                       <p className="text-[9px] font-bold text-white/70 mt-2 bg-white/10 border border-white/15 px-2 py-1 rounded-md text-center">{store.shopName}</p>
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

              {currentCustomer && (
                <button
                  type="button"
                  onClick={() => setShowFollowedStoresPage(true)}
                  className="w-full flex items-center justify-between gap-3 welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.2rem] px-4 py-3 shadow-lg hover:bg-white/10 transition-all active:scale-[0.99] mx-1"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                      <Heart size={15} className="text-white" fill="white" />
                    </div>
                    <div className="text-right min-w-0">
                      <p className="text-[10.5px] font-black text-white leading-tight">متاجري المتابَعة</p>
                      <p className="text-[9px] font-bold text-purple-100 truncate">
                        {followedStoresList.length > 0
                          ? `${followedStoresList.length} متجر — اضغط للعرض`
                          : 'لم تتابع متجراً بعد'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 text-white">
                    {followedStoresList.length > 0 && (
                      <span className="text-[10px] font-black bg-white/15 border border-white/20 px-2 py-0.5 rounded-lg">
                        {followedStoresList.length}
                      </span>
                    )}
                    <ChevronLeft size={16} className="text-[#E9DAFF]" />
                  </div>
                </button>
              )}

              {/* دخول صفحة المتاجر القريبة */}
              <button
                type="button"
                onClick={() => setShowNearbyStoresPage(true)}
                className="w-full flex items-center justify-between gap-3 welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.2rem] px-4 py-3 shadow-lg hover:bg-white/10 transition-all active:scale-[0.99] mx-1"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                    <MapPin size={15} className="text-white" />
                  </div>
                  <div className="text-right min-w-0">
                    <p className="text-[10.5px] font-black text-white leading-tight">المتاجر القريبة منك</p>
                    <p className="text-[9px] font-bold text-purple-100 truncate">
                      {nearbyStores.length > 0
                        ? `${nearbyStores.length} متجر — اضغط للعرض`
                        : 'لا توجد متاجر قريبة حالياً'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 text-white">
                  {nearbyStores.length > 0 && (
                    <span className="text-[10px] font-black bg-white/15 border border-white/20 px-2 py-0.5 rounded-lg">
                      {nearbyStores.length}
                    </span>
                  )}
                  <ChevronLeft size={16} className="text-[#E9DAFF]" />
                </div>
              </button>
            </div>
            )}

          {/* تبويب المتاجر والبحث المتقدم المطور */}
          {activeTab === 'merchants' && (
            <div className="space-y-6 animate-fade-in px-1 text-right animate-fade-in" dir="rtl">
              {/* ترويسة الصفحة الإبداعية للمتاجر */}
              <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.5rem] p-6 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />
                
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <MahalakLogo className="h-5 w-5 shrink-0 object-contain" />
                    <span className="text-[10px] uppercase font-black tracking-widest text-white">دليل المتاجر والأسواق في العراق</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black font-tajawal">المتاجر والبيجات العراقية</h1>
                  <p className="text-[10.5px] text-purple-100 font-bold max-w-xl leading-relaxed whitespace-pre-line" id="stores-sub-heading-para">
                    اتصفح وتسوق بسهولة .... جميع متاجر وبيجات جميع محافظات العراق في مكان واحد 
                    كل ما تطلب اكثر كل ما تحصل مكافئات ونقاط تكدر تحولها لخصومات
                  </p>
                </div>
              </div>

              {/* لوحة البحث المتقدم والفلترة المزدوجة للمتاجر */}
              <div className="welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md p-4 sm:p-5 rounded-[2.2rem] shadow-lg space-y-4 font-tajawal">
                {/* Header for Filter panel */}
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-black text-white text-sm flex items-center gap-2">
                    <Search size={16} className="text-vibrant-purple" />
                    <span>البحث والفلترة</span>
                  </h3>
                  {hasActiveCatalogFilters && (
                    <button
                      onClick={resetCatalogFilters}
                      className="welcome-btn-pulse text-white hover:opacity-95 px-3 py-1.5 rounded-xl text-[10px] font-black transition-colors flex items-center gap-1 active:scale-95 cursor-pointer"
                    >
                      <RefreshCw size={12} />
                      <span>مسح الفلاتر</span>
                    </button>
                  )}
                </div>
                
                {/* شريط البحث المطور واختيار المحافظة */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* شريط البحث باسم المتجر */}
                  <div className="relative group">
                    <Search size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-vibrant-purple transition-colors" />
                    <input 
                      type="text" 
                      value={catalogSearchQuery}
                      onChange={(e) => setCatalogSearchQuery(e.target.value)}
                      placeholder="ابحث باسم المتجر، أو المنطقة..." 
                      className="w-full bg-white/10 border border-white/20 pr-11 pl-4 py-3.5 rounded-2xl text-[11px] font-bold shadow-2xs focus:ring-2 focus:ring-vibrant-purple/10 focus:border-vibrant-purple transition-all placeholder:text-slate-350 text-white text-right outline-none"
                    />
                  </div>

                  {/* اختيار المحافظة — افتراضياً محافظة موقع التوصيل */}
                  <div className="relative">
                    <select 
                      value={catalogProvinceSelectValue}
                      onChange={(e) => handleCatalogProvinceChange(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 pr-4 pl-10 py-3.75 rounded-2xl text-[11px] font-bold shadow-2xs focus:ring-2 focus:ring-vibrant-purple/10 focus:border-vibrant-purple outline-none appearance-none text-white text-right hover:border-vibrant-purple/25 transition-all cursor-pointer"
                    >
                      <option value="" className="text-slate-800">كل محافظات العراق (18)</option>
                      {provinces.map(p => <option key={p.id} value={p.name} className="text-slate-800">{p.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                {catalogProvinceFilter === null && customerDeliveryProvince && (
                  <p className="text-[10px] font-bold text-white/90 px-1">
                    📍 يُعرض حسب موقع التوصيل: {customerDeliveryProvince}
                  </p>
                )}

                {/* تصفية التصنيفات كقائمة أفقية قابلة للتمرير - مخفية وتظهر عند ضغط ع السهم */}
                <div className="pt-2 border-t border-white/10 font-tajawal">
                  <button
                    type="button"
                    onClick={() => setShowCategories(!showCategories)}
                    className="w-full flex items-center justify-between text-white hover:text-white/80 transition-colors py-1 cursor-pointer select-none"
                    id="toggle-categories-btn"
                  >
                    <span className="text-[11px] font-black flex items-center gap-1.5">
                      🏷️ التصنيفات الرئيسية
                      {catalogCategory && (
                        <span className="bg-vibrant-purple/10 text-[#FFF700] text-[9.5px] px-2 py-0.5 rounded-full font-bold">
                          {CATEGORY_SHORT_NAMES[catalogCategory.id] || catalogCategory.name}
                        </span>
                      )}
                    </span>
                    <ChevronDown size={14} className={`text-slate-400 hover:text-vibrant-purple transition-transform duration-300 ${showCategories ? 'rotate-180' : ''}`} />
                  </button>

                  {showCategories && (
                    <div className="space-y-4 pt-3.5 animate-fade-in" id="categories-collapsible-container">
                      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none" dir="rtl">
                        {/* خيار "الكل" */}
                        <button
                          type="button"
                          onClick={() => { setCatalogCategory(null); setCatalogSubCategory(''); }}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black border transition-all shrink-0 cursor-pointer active:scale-95 ${
                            !catalogCategory
                              ? 'bg-vibrant-purple text-white border-vibrant-purple shadow-md shadow-purple-500/10'
                              : 'bg-white/10 text-white/80 border-white/20 hover:border-violet/25'
                          }`}
                        >
                          {getCategoryIcon('all', !catalogCategory, 14)}
                          <span>الكل</span>
                        </button>

                        {/* قائمة التصنيفات المستوردة */}
                        {STORE_CATEGORIES.map(cat => {
                          const isSelected = catalogCategory?.id === cat.id;
                          const shortName = CATEGORY_SHORT_NAMES[cat.id] || cat.name;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => { setCatalogCategory(cat); setCatalogSubCategory(''); }}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black border transition-all shrink-0 cursor-pointer active:scale-95 ${
                                isSelected
                                  ? 'bg-vibrant-purple text-white border-vibrant-purple shadow-md shadow-purple-500/10'
                                  : 'bg-white/10 text-white/80 border-white/20 hover:border-violet/25'
                              }`}
                            >
                              {getCategoryIcon(cat.id, isSelected, 14)}
                              <span>{shortName}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* التصنيفات الفرعية الذكية في حال تم التحديد */}
                      {catalogCategory && catalogCategory.sub && catalogCategory.sub.length > 0 && (
                        <div className="pt-2 border-t border-white/10 space-y-2 animate-fade-in">
                          <span className="text-[9.5px] font-black text-slate-300 block px-1">التصنيف الفرعي:</span>
                          <div className="flex overflow-x-auto gap-1.5 pb-1.5 scrollbar-none" dir="rtl">
                            <button
                              type="button"
                              onClick={() => setCatalogSubCategory('')}
                              className={`px-3 py-1.5 rounded-xl text-[9.5px] font-bold border shrink-0 cursor-pointer active:scale-95 ${
                                catalogSubCategory === ''
                                  ? 'bg-purple-100 text-vibrant-purple border-purple-200 font-extrabold'
                                  : 'bg-white/10 text-white/70 border-white/20'
                              }`}
                            >
                              الكل
                            </button>
                            {catalogCategory.sub.map((sub: string) => (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => setCatalogSubCategory(sub)}
                                className={`px-3 py-1.5 rounded-xl text-[9.5px] font-bold border shrink-0 cursor-pointer active:scale-95 ${
                                  catalogSubCategory === sub
                                    ? 'bg-purple-100 text-vibrant-purple border-purple-200 font-extrabold'
                                    : 'bg-white/10 text-white/70 border-white/20'
                                }`}
                              >
                                {sub}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* لوحة خيارات الترتيب والفرز المتقدمة للمتاجر - مخفية وتظهر عند ضغط ع السهم */}
                <div className="pt-2 border-t border-white/10 font-tajawal">
                  <button
                    type="button"
                    onClick={() => setShowSorting(!showSorting)}
                    className="w-full flex items-center justify-between text-white hover:text-white/80 transition-colors py-1 cursor-pointer select-none"
                    id="toggle-sorting-btn"
                  >
                    <span className="text-[11px] font-black flex items-center gap-1.5">
                      📊 خيارات الفرز والترتيب
                      {storesSortType !== 'default' && (
                        <span className="bg-vibrant-purple/10 text-[#FFF700] text-[9.5px] px-2 py-0.5 rounded-full font-bold">
                          {storesSortType === 'rating-desc' ? 'الكل الأعلى تقييماً' : storesSortType === 'name-asc' ? 'الاسم أ-ي' : 'الأقرب مسافة'}
                        </span>
                      )}
                      {catalogFreeDeliveryOnly && (
                        <span className="bg-emerald-50 text-emerald-600 text-[9.5px] px-2 py-0.5 rounded-full border border-emerald-100 font-bold">
                          🚚 توصيل مجاني
                        </span>
                      )}
                      {catalogDiscountOnly && (
                        <span className="bg-rose-50 text-rose-600 text-[9.5px] px-2 py-0.5 rounded-full border border-rose-100 font-bold">
                          🏷️ خصومات
                        </span>
                      )}
                    </span>
                    <ChevronDown size={14} className={`text-slate-400 hover:text-vibrant-purple transition-transform duration-300 ${showSorting ? 'rotate-180' : ''}`} />
                  </button>

                  {showSorting && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 animate-fade-in" id="sorting-collapsible-container">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9.5px] font-black text-slate-300 ml-1">ترتيب حسب:</span>
                        
                        {/* الافتراضي */}
                        <button
                          type="button"
                          onClick={() => setStoresSortType('default')}
                          className={`px-3.5 py-2 rounded-xl text-[10px] font-black transition-all border cursor-pointer active:scale-95 ${
                            storesSortType === 'default'
                              ? 'bg-vibrant-purple text-white border-vibrant-purple shadow-xs'
                              : 'bg-white/10 text-white/70 border-white/20 hover:border-violet/25'
                          }`}
                        >
                          🔄 الافتراضي
                        </button>

                        {/* الأكثر تقييماً */}
                        <button
                          type="button"
                          onClick={() => setStoresSortType('rating-desc')}
                          className={`px-3.5 py-2 rounded-xl text-[10px] font-black transition-all border cursor-pointer active:scale-95 ${
                            storesSortType === 'rating-desc'
                              ? 'bg-vibrant-purple text-white border-vibrant-purple shadow-xs'
                              : 'bg-white/10 text-white/70 border-white/20 hover:border-violet/25'
                          }`}
                        >
                          ⭐ الأعلى تقييماً
                        </button>

                        {/* الاسم الهجائي */}
                        <button
                          type="button"
                          onClick={() => setStoresSortType('name-asc')}
                          className={`px-3.5 py-2 rounded-xl text-[10px] font-black transition-all border cursor-pointer active:scale-95 ${
                            storesSortType === 'name-asc'
                              ? 'bg-vibrant-purple text-white border-vibrant-purple shadow-xs'
                              : 'bg-white/10 text-white/70 border-white/20 hover:border-violet/25'
                          }`}
                        >
                          🔤 الاسم أ-ي
                        </button>

                        {/* الأقرب مسافة */}
                        <button
                          type="button"
                          onClick={() => setStoresSortType('nearest')}
                          className={`px-3.5 py-2 rounded-xl text-[10px] font-black transition-all border cursor-pointer active:scale-95 ${
                            storesSortType === 'nearest'
                              ? 'bg-vibrant-purple text-white border-vibrant-purple shadow-xs'
                              : 'bg-white/10 text-white/70 border-white/20 hover:border-violet/25'
                          }`}
                        >
                          📍 الأقرب مسافة
                        </button>
                      </div>

                      {/* فلاتر إضافية */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setCatalogDiscountOnly(prev => !prev)}
                          className={`px-3.5 py-2 rounded-xl text-[10px] font-black transition-all border flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                            catalogDiscountOnly
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : 'bg-white/10 text-white/70 border-white/20'
                          }`}
                        >
                          <span>🏷️ خصومات فقط</span>
                          {catalogDiscountOnly && (
                            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCatalogFreeDeliveryOnly(prev => !prev)}
                          className={`px-3.5 py-2 rounded-xl text-[10px] font-black transition-all border flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                            catalogFreeDeliveryOnly
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white/10 text-white/70 border-white/20'
                          }`}
                        >
                          <span>🚚 توصيل مجاني للمحافظة</span>
                          {catalogFreeDeliveryOnly && (
                            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* شبكة عرض المتاجر المفلترة */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-black text-white flex items-center gap-2">
                    <MahalakLogo className="h-[18px] w-[18px] shrink-0 object-contain" />
                    <span>المتاجر ({filteredStores.length})</span>
                  </h2>
                </div>

                {filteredStores.length === 0 ? (
                  <div className="py-20 text-center welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.5rem] shadow-lg">
                    <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                       <Search size={40} className="text-white" />
                    </div>
                    <p className="text-white font-black">عذراً، لم نجد نتائج للمتاجر!</p>
                    <p className="text-white text-[10px] mt-2 font-bold px-10 leading-relaxed text-center">جرّب البحث بكلمات أخرى أو تغيير التصنيف أو المحافظة</p>
                    {hasActiveCatalogFilters && (
                      <button
                        onClick={resetCatalogFilters}
                        className="welcome-btn-pulse mt-6 px-5 py-2.5 bg-brand-horizontal text-white transition rounded-xl text-xs font-black cursor-pointer"
                      >
                        إعادة ضبط جميع خيارات البحث والفلاتر
                      </button>
                    )}
                  </div>
                ) : (
                  <StoreGrid
                    {...storeGridCommonProps}
                    stores={visibleFilteredStores}
                    className="px-1 animate-fade-in font-tajawal"
                    variant="onDark"
                  />
                )}
                {filteredStores.length > visibleMerchantsCount && (
                  <div className="flex justify-center pt-6">
                    <button
                      type="button"
                      onClick={() => setVisibleMerchantsCount(c => c + MERCHANTS_PAGE_SIZE)}
                      className="welcome-btn-pulse px-6 py-3 rounded-2xl bg-brand-horizontal text-white text-sm font-black transition"
                    >
                      عرض المزيد ({filteredStores.length - visibleMerchantsCount} متجر)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* تبويب المنتجات العام الجديد */}
          {activeTab === 'products' && (
            <div className="space-y-6 px-1" dir="rtl">
              {/* ترويسة الصفحة الإبداعية */}
              <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.5rem] p-6 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />
                
                <div className="relative z-10 space-y-2 text-right">
                  <div className="flex items-center gap-2.5">
                    <MahalakLogo className="h-5 w-5 shrink-0 object-contain" />
                    <span className="text-[10px] uppercase font-black tracking-widest text-white">دليل المنتجات الموحد</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black font-tajawal">استكشف المنتجات المتاحة</h1>
                  <p className="text-[10px] text-purple-150 font-bold max-w-sm">
                    ابحث عن منتجاتك المفضلة من المتاجر الموثقة والمميزة في كافة أنحاء العراق، قارن الأسعار والتقييم واطلب مباشرة.
                  </p>
                </div>
              </div>

              {/* لوحة البحث المتقدم والفلترة المزدوجة */}
              <div id="catalog-product-filters" className="welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md p-4 sm:p-5 rounded-[2.2rem] shadow-lg space-y-4 scroll-mt-28 font-tajawal">
                {/* Header for Filter panel */}
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-black text-white text-sm flex items-center gap-2">
                    <Search size={16} className="text-vibrant-purple" />
                    <span>البحث والفلترة</span>
                  </h3>
                  {hasActiveCatalogFilters && (
                    <button
                      onClick={resetCatalogFilters}
                      className="welcome-btn-pulse text-white hover:opacity-95 px-3 py-1.5 rounded-xl text-[10px] font-black transition-colors flex items-center gap-1 active:scale-95 cursor-pointer"
                    >
                      <RefreshCw size={12} />
                      <span>مسح الفلاتر</span>
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* شريط البحث المتقدم */}
                  <div className="relative group">
                    <Search size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-vibrant-purple transition-colors" />
                    <input 
                      type="text" 
                      value={catalogSearchQuery}
                      onChange={(e) => setCatalogSearchQuery(e.target.value)}
                      placeholder="البحث باسم المنتج، المتجر، الماركة أو القسم..." 
                      className="w-full bg-white/10 border border-white/20 pr-11 pl-4 py-3.5 rounded-2xl text-[11px] font-bold shadow-2xs focus:ring-2 focus:ring-vibrant-purple/10 focus:border-vibrant-purple transition-all placeholder:text-slate-350 font-tajawal text-white text-right outline-none"
                    />
                  </div>

                  {/* اختيار المحافظة — افتراضياً محافظة موقع التوصيل */}
                  <div className="relative">
                    <select 
                      value={catalogProvinceSelectValue}
                      onChange={(e) => handleCatalogProvinceChange(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 pr-4 pl-10 py-3.75 rounded-2xl text-[11px] font-bold shadow-2xs focus:ring-2 focus:ring-vibrant-purple/10 focus:border-vibrant-purple outline-none appearance-none font-tajawal text-white text-right"
                    >
                      <option value="" className="text-slate-800">كل محافظات العراق (18)</option>
                      {provinces.map(p => <option key={p.id} value={p.name} className="text-slate-800">{p.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                {catalogProvinceFilter === null && customerDeliveryProvince && (
                  <p className="text-[10px] font-bold text-white/90 px-1">
                    📍 يُعرض حسب موقع التوصيل: {customerDeliveryProvince}
                  </p>
                )}

                {/* تصفية التصنيفات كقائمة أفقية قابلة للتمرير للمنتجات - مخفية وتظهر عند ضغط ع السهم */}
                <div className="pt-2 border-t border-white/10 font-tajawal">
                  <button
                    type="button"
                    onClick={() => setShowAllProductsCategories(!showAllProductsCategories)}
                    className="w-full flex items-center justify-between text-white hover:text-white/80 transition-colors py-1 cursor-pointer select-none"
                    id="toggle-all-products-categories-btn"
                  >
                    <span className="text-[11px] font-black flex items-center gap-1.5">
                      🏷️ تصنيفات المنتجات الرئيسية
                      {catalogCategory && (
                        <span className="bg-vibrant-purple/10 text-[#FFF700] text-[9.5px] px-2 py-0.5 rounded-full font-bold">
                          {CATEGORY_SHORT_NAMES[catalogCategory.id] || catalogCategory.name}
                        </span>
                      )}
                    </span>
                    <ChevronDown size={14} className={`text-slate-400 hover:text-vibrant-purple transition-transform duration-300 ${showAllProductsCategories ? 'rotate-180' : ''}`} />
                  </button>

                  {showAllProductsCategories && (
                    <div className="space-y-4 pt-3.5 animate-fade-in" id="all-products-categories-collapsible-container">
                      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none" dir="rtl">
                        {/* خيار "الكل" */}
                        <button
                          type="button"
                          onClick={() => { setCatalogCategory(null); setCatalogSubCategory(''); }}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black border transition-all shrink-0 cursor-pointer active:scale-95 ${
                            !catalogCategory
                              ? 'bg-vibrant-purple text-white border-vibrant-purple shadow-md shadow-purple-500/10'
                              : 'bg-white/10 text-white/80 border-white/20 hover:border-violet/25'
                          }`}
                        >
                          {getCategoryIcon('all', !catalogCategory, 14)}
                          <span>الكل</span>
                        </button>

                        {/* قائمة التصنيفات المستوردة */}
                        {STORE_CATEGORIES.map(cat => {
                          const isSelected = catalogCategory?.id === cat.id;
                          const shortName = CATEGORY_SHORT_NAMES[cat.id] || cat.name;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => { setCatalogCategory(cat); setCatalogSubCategory(''); }}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black border transition-all shrink-0 cursor-pointer active:scale-95 ${
                                isSelected
                                  ? 'bg-vibrant-purple text-white border-vibrant-purple shadow-md shadow-purple-500/10'
                                  : 'bg-white/10 text-white/80 border-white/20 hover:border-violet/25'
                              }`}
                            >
                              {getCategoryIcon(cat.id, isSelected, 14)}
                              <span>{shortName}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* التصنيفات الفرعية الذكية في حال تم التحديد */}
                      {catalogCategory && catalogCategory.sub && catalogCategory.sub.length > 0 && (
                        <div className="pt-2 border-t border-white/10 space-y-2 animate-fade-in">
                          <span className="text-[9.5px] font-black text-slate-300 block px-1">التصنيف الفرعي:</span>
                          <div className="flex overflow-x-auto gap-1.5 pb-1.5 scrollbar-none" dir="rtl">
                            <button
                              type="button"
                              onClick={() => setCatalogSubCategory('')}
                              className={`px-3 py-1.5 rounded-xl text-[9.5px] font-bold border shrink-0 cursor-pointer active:scale-95 ${
                                catalogSubCategory === ''
                                  ? 'bg-purple-100 text-vibrant-purple border-purple-200 font-extrabold'
                                  : 'bg-white/10 text-white/70 border-white/20'
                              }`}
                            >
                              الكل
                            </button>
                            {catalogCategory.sub.map((sub: string) => (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => setCatalogSubCategory(sub)}
                                className={`px-3 py-1.5 rounded-xl text-[9.5px] font-bold border shrink-0 cursor-pointer active:scale-95 ${
                                  catalogSubCategory === sub
                                    ? 'bg-purple-100 text-vibrant-purple border-purple-200 font-extrabold'
                                    : 'bg-white/10 text-white/70 border-white/20'
                                }`}
                              >
                                {sub}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* لوحة خيارات الترتيب والفرز الاحترافي المطور */}
                <div className="pt-2 border-t border-white/10 font-tajawal">
                  <button
                    type="button"
                    onClick={() => setShowAllProductsSorting(!showAllProductsSorting)}
                    className="w-full flex items-center justify-between text-white hover:text-white/80 transition-colors py-1 cursor-pointer select-none"
                    id="toggle-all-products-sorting-btn"
                  >
                    <span className="text-[11px] font-black flex items-center gap-1.5">
                      📊 خيارات الفرز والترتيب للمنتجات
                      {allProductsSortType !== 'default' && (
                        <span className="bg-vibrant-purple/10 text-[#FFF700] text-[9.5px] px-2 py-0.5 rounded-full font-bold">
                          {allProductsSortType === 'price-asc' ? 'السعر: الأقل للأعلى' : allProductsSortType === 'bestselling' ? 'الأكثر مبيعاً' : 'الأكثر تقييماً'}
                        </span>
                      )}
                      {catalogFreeDeliveryOnly && (
                        <span className="bg-emerald-50 text-emerald-600 text-[9.5px] px-2 py-0.5 rounded-full border border-emerald-100 font-bold">
                          🚚 توصيل مجاني فقط
                        </span>
                      )}
                      {catalogDiscountOnly && (
                        <span className="bg-rose-50 text-rose-600 text-[9.5px] px-2 py-0.5 rounded-full border border-rose-100 font-bold">
                          🏷️ خصومات
                        </span>
                      )}
                    </span>
                    <ChevronDown size={14} className={`text-slate-400 hover:text-vibrant-purple transition-transform duration-300 ${showAllProductsSorting ? 'rotate-180' : ''}`} />
                  </button>

                  {showAllProductsSorting && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 animate-fade-in" id="all-products-sorting-collapsible">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9.5px] font-black text-slate-300 ml-1">ترتيب حسب:</span>
                        
                        {/* الافتراضي */}
                        <button
                          type="button"
                          onClick={() => setAllProductsSortType('default')}
                          className={`px-3.5 py-2 rounded-xl text-[10px] font-black transition-all border cursor-pointer active:scale-95 ${
                            allProductsSortType === 'default'
                              ? 'bg-vibrant-purple text-white border-vibrant-purple shadow-xs'
                              : 'bg-white/10 text-white/70 border-white/20 hover:border-violet/25 hover:text-white'
                          }`}
                        >
                          🔄 الافتراضي
                        </button>

                        {/* السعر من الأقل للأعلى */}
                        <button
                          type="button"
                          onClick={() => setAllProductsSortType('price-asc')}
                          className={`px-3.5 py-2 rounded-xl text-[10px] font-black transition-all border cursor-pointer active:scale-95 ${
                            allProductsSortType === 'price-asc'
                              ? 'bg-vibrant-purple text-white border-vibrant-purple shadow-xs'
                              : 'bg-white/10 text-white/70 border-white/20 hover:border-violet/25 hover:text-white'
                          }`}
                        >
                          📈 السعر: الأقل للأعلى
                        </button>

                        {/* الأكثر مبيعاً */}
                        <button
                          type="button"
                          onClick={() => setAllProductsSortType('bestselling')}
                          className={`px-3.5 py-2 rounded-xl text-[10px] font-black transition-all border cursor-pointer active:scale-95 ${
                            allProductsSortType === 'bestselling'
                              ? 'bg-vibrant-purple text-white border-vibrant-purple shadow-xs'
                              : 'bg-white/10 text-white/70 border-white/20 hover:border-violet/25 hover:text-white'
                          }`}
                        >
                          🔥 الأكثر مبيعاً
                        </button>

                        {/* الأكثر تقييماً */}
                        <button
                          type="button"
                          onClick={() => setAllProductsSortType('rating-desc')}
                          className={`px-3.5 py-2 rounded-xl text-[10px] font-black transition-all border cursor-pointer active:scale-95 ${
                            allProductsSortType === 'rating-desc'
                              ? 'bg-vibrant-purple text-white border-vibrant-purple shadow-xs'
                              : 'bg-white/10 text-white/70 border-white/20 hover:border-violet/25 hover:text-white'
                          }`}
                        >
                          ⭐ الأكثر تقييماً
                        </button>
                      </div>

                      {/* فلاتر إضافية */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setCatalogDiscountOnly(prev => !prev)}
                          className={`w-full sm:w-auto px-4 py-2 rounded-xl text-[10px] font-black transition-all border flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                            catalogDiscountOnly
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : 'bg-white/10 text-white/70 border-white/20 hover:border-rose-200 hover:text-rose-300'
                          }`}
                        >
                          <span>🏷️</span>
                          <span>خصومات فقط</span>
                          {catalogDiscountOnly && (
                            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCatalogFreeDeliveryOnly(prev => !prev)}
                          className={`w-full sm:w-auto px-4 py-2 rounded-xl text-[10px] font-black transition-all border flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                            catalogFreeDeliveryOnly
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white/10 text-white/70 border-white/20 hover:border-emerald-200 hover:text-emerald-300'
                          }`}
                        >
                          <span>🚚</span>
                          <span>توصيل مجاني فقط</span>
                          {catalogFreeDeliveryOnly && (
                            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* قائمة المنتجات */}
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-black text-white flex items-center gap-2">
                  <ShoppingBag size={18} className="text-vibrant-purple shrink-0" />
                  <span>المنتجات ({catalogDisplayProducts.length})</span>
                </h2>
              </div>
              {catalogDisplayProducts.length === 0 ? (
                <div className="py-24 text-center welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[3rem] shadow-lg px-10">
                  <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-white">
                    <Search size={32} />
                  </div>
                  <h3 className="text-lg font-black text-white font-tajawal mb-2">عذراً، لم نعثر على أي منتجات</h3>
                  <p className="text-xs text-white font-bold max-w-sm mx-auto leading-relaxed">
                    جرب استخدام كلمات بحث مختلفة أو قم بإلغاء بعض فلاتر التصفية النشطة حاليًا لعرض المزيد من منتجات المتاجر.
                  </p>
                  {hasActiveCatalogFilters && (
                    <button
                      onClick={resetCatalogFilters}
                      className="welcome-btn-pulse mt-6 px-5 py-2.5 bg-brand-horizontal text-white transition rounded-xl text-xs font-black cursor-pointer"
                    >
                      إعادة ضبط جميع خيارات البحث والفلاتر
                    </button>
                  )}
                </div>
              ) : (
                <StoreProductSections
                  variant="onDark"
                  products={catalogDisplayProducts}
                  storeCategoryId={catalogCategory?.id}
                  getStoreName={(product) => storeMap.get(product.storeId)?.shopName || 'المتجر'}
                  emptyTitle="عذراً، لم نعثر على أي منتجات"
                  emptySubtitle="جرّب تغيير البحث أو إلغاء بعض الفلاتر لعرض المزيد من المنتجات."
                  onProductClick={(product) => openProductDetail(product, 'products')}
                  onAddToCart={addToCart}
                  onShareProduct={(product) => {
                    const store = storeMap.get(product.storeId);
                    openShareModal('product', { ...product, shopName: store?.shopName });
                  }}
                  onStoreClick={(product) => {
                    const store = storeMap.get(product.storeId);
                    if (store && !store.isBanned) {
                      closeProductDetail();
                      setSelectedStore(store);
                    }
                  }}
                />
              )}
            </div>
          )}

          {/* تاب تتبع طلباتي */}
          {activeTab === 'orders' && (
            <div className={`space-y-4 px-1 ${isTabPending ? 'opacity-70' : ''}`}>
              {targetOrderId && (
                <div className="perf-list-card welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between text-right">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[#fff700]"></span>
                    </span>
                    <div>
                      <span className="text-xs font-black text-white font-tajawal block">عرض تفاصيل الطلب المحدد من التنبيهات</span>
                      <span className="text-[10px] font-bold text-[#E9DAFF] font-tajawal">رقم الطلب: #{getOrderSeqId(targetOrderId) || targetOrderId}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTargetOrderId(null)}
                    className="welcome-btn-pulse text-[10px] font-black text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-2xl border border-white/30 transition-colors cursor-pointer shrink-0"
                  >
                    إلغاء التصفية وعرض كل طلباتي
                  </button>
                </div>
              )}

              <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-sm font-black text-white flex items-center gap-2">
                  <div className="welcome-icon-pulse p-2 bg-white/10 border border-white/25 text-[#E9DAFF] rounded-xl">
                    <ClipboardList size={18} />
                  </div>
                  <span>تتبع طلباتك</span>
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOnlyDelivered(!showOnlyDelivered);
                    }}
                    className={`text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-colors cursor-pointer ${
                      showOnlyDelivered
                        ? 'border bg-emerald-500/20 text-emerald-200 border-emerald-400/40 hover:bg-emerald-500/30'
                        : 'text-white bg-white/10 border border-white/25 hover:bg-white/15'
                    }`}
                  >
                    {showOnlyDelivered ? 'عرض الكل' : 'الطلبات المكتملة فقط'}
                  </button>
                  <div className="text-[10px] text-white font-bold bg-white/10 border border-white/25 px-3 py-1.5 sm:py-2 rounded-full shrink-0">
                    إجمالي ({displayedCustomerOrders.length})
                  </div>
                </div>
              </div>

              {displayedCustomerOrders.length === 0 ? (
                <div className="py-20 text-center welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md rounded-2xl">
                  <div className="welcome-icon-pulse w-24 h-24 bg-white/10 border border-white/25 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingBag size={40} className="text-white" />
                  </div>
                  <p className="text-white font-black">لا توجد طلبات سابقة</p>
                  <p className="text-white/70 text-[10px] mt-2 px-10 font-bold leading-relaxed">ابدأ بالتسوق من المتاجر المفضلة لديك لتظهر طلباتك هنا</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleCustomerOrders.map((order) => {
                    const lat = (order as { customerLat?: number }).customerLat;
                    const lng = (order as { customerLng?: number }).customerLng;
                    const mapsUrl =
                      typeof lat === 'number' && typeof lng === 'number'
                        ? `https://www.google.com/maps?q=${lat},${lng}`
                        : null;

                    return (
                      <div
                        key={order.id}
                        className="perf-list-card welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md rounded-2xl p-4 text-right flex flex-col gap-4 min-w-0 w-full text-white"
                      >
                        <div className="flex justify-between items-start gap-3 min-w-0 w-full">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="welcome-icon-pulse p-2 bg-white/10 border border-white/25 text-[#E9DAFF] rounded-xl shrink-0">
                              <StoreIcon size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[9px] text-white/70 font-black block mb-0.5 whitespace-nowrap">من متجر</span>
                              <h4 className="text-xs sm:text-sm font-black text-white leading-tight truncate" title={order.storeName}>{order.storeName}</h4>
                              {getOrderSeqId(order.id) ? (
                                <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-black text-violet-200 bg-white/10 border border-white/25 rounded-lg px-2 py-0.5">
                                  #{getOrderSeqId(order.id)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="text-left shrink-0">
                            <span className="block text-[9px] font-black text-white/60 uppercase tracking-widest mb-1 leading-none">إجمالي الطلب</span>
                            <span className="text-sm font-black text-[#fff700] whitespace-nowrap">{(order.total || 0).toLocaleString()} <span className="text-[10px] text-white">د.ع</span></span>
                          </div>
                        </div>

                        <div className="bg-white/10 p-3 rounded-2xl border border-white/20 w-full min-w-0">
                          <div className="flex justify-between items-center mb-2 gap-2">
                            <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">تتبع الحالة</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 border ${
                              order.status === 'pending' ? 'bg-amber-500/20 text-amber-200 border-amber-400/30' :
                              order.status === 'accepted' ? 'bg-sky-500/20 text-sky-200 border-sky-400/30' :
                              order.status === 'shipped' ? 'bg-violet/20 text-[#b07aff] border-violet-400/30' :
                              order.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' :
                              order.status === 'cancelled' ? 'bg-white/10 text-white/70 border-white/20' :
                              'bg-rose-500/20 text-rose-200 border-rose-400/30'
                            }`}>
                              {order.status === 'pending' ? 'بانتظار المراجعة' :
                               order.status === 'accepted' ? 'قيد التحضير' :
                               order.status === 'shipped' ? 'في الطريق إليك' :
                               order.status === 'delivered' ? 'تم الاستلام' :
                               order.status === 'returned' ? 'مرتجع' :
                               order.status === 'replaced' ? 'تم الاستبدال' :
                               order.status === 'cancelled' ? 'ملغى' : 'مرفوض'}
                            </span>
                          </div>

                          <div className="relative h-1 bg-white/20 rounded-full mt-3 flex items-center justify-between">
                            <div className={`absolute top-0 right-0 h-full bg-vibrant-purple rounded-full ${
                              order.status === 'pending' ? 'w-0' :
                              order.status === 'accepted' ? 'w-1/3' :
                              order.status === 'shipped' ? 'w-2/3' :
                              order.status === 'delivered' ? 'w-full' : 'w-full !bg-rose-400'
                            }`} />
                            {['pending', 'accepted', 'shipped', 'delivered'].map((s) => {
                              const isActive = order.status === s || (
                                (s === 'pending' && ['accepted', 'shipped', 'delivered'].includes(order.status)) ||
                                (s === 'accepted' && ['shipped', 'delivered'].includes(order.status)) ||
                                (s === 'shipped' && order.status === 'delivered')
                              );
                              const isRejected = order.status === 'rejected' || order.status === 'returned';
                              return (
                                <div key={s} className="relative flex flex-col items-center">
                                  <div className={`w-3 h-3 rounded-full border-2 border-[#0B1320] z-10 ${
                                    isActive ? 'bg-vibrant-purple scale-110' : isRejected ? 'bg-rose-400' : 'bg-white/30'
                                  }`} />
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex justify-between mt-3 px-1">
                            {['استلام', 'موافقة', 'شحن', 'توصيل'].map((l) => (
                              <span key={l} className="text-[9px] font-black text-white/45">{l}</span>
                            ))}
                          </div>
                        </div>

                        {(order.status === 'cancelled' || order.rejectionReason || order.returnReason) && (
                          <div className={`p-3 rounded-2xl border flex items-start gap-3 min-w-0 w-full ${
                            order.status === 'cancelled' ? 'bg-white/10 border-white/20 text-white/80' :
                            order.status === 'rejected' ? 'bg-rose-500/15 border-rose-400/25 text-rose-200' : 'bg-amber-500/15 border-amber-400/25 text-amber-200'
                          }`}>
                            <Info size={16} className="shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                              <span className="text-[10px] font-black uppercase tracking-widest leading-none opacity-60">
                                {order.status === 'cancelled' ? 'حالة الطلب' :
                                 order.status === 'rejected' ? 'سبب الرفض' : 'معلومات الإرجاع'}
                              </span>
                              <p className="text-xs font-black truncate" title={
                                order.status === 'cancelled'
                                  ? 'قمتَ بإلغاء هذا الطلب'
                                  : (order.rejectionReason || order.returnReason)
                              }>
                                {order.status === 'cancelled'
                                  ? 'قمتَ بإلغاء هذا الطلب'
                                  : (order.rejectionReason || order.returnReason)}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="space-y-3 min-w-0 w-full">
                          <div className="flex items-center justify-between text-[9px] font-black text-white/70 uppercase tracking-widest gap-2 min-w-0">
                            <span className="shrink-0">المنتجات ({order.items.length})</span>
                            <div className="flex items-center gap-1 min-w-0 truncate">
                              <Calendar size={12} className="shrink-0" />
                              <span className="truncate text-white">{formatSafeDateTimeString(order.createdAt, 'ar-IQ', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                          </div>
                          <div className="grid gap-2 max-h-[120px] overflow-y-auto no-scrollbar">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center gap-3 min-w-0">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className="w-5 h-5 bg-white/15 border border-white/20 rounded-lg flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                                    {item.quantity}
                                  </div>
                                  <span className="text-xs font-bold text-white truncate flex-1" title={item.productName}>{item.productName}</span>
                                </div>
                                <span className="text-[11px] font-bold text-white whitespace-nowrap shrink-0">
                                  {((item.price || 0) * (item.quantity || 0)).toLocaleString()} د.ع
                                </span>
                              </div>
                            ))}
                          </div>

                          <CancelOrderButton order={order} onCancelClick={(o) => setOrderToCancel(o)} />

                          <div className="pt-3 border-t border-white/15 flex flex-col gap-2 min-w-0 w-full">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/20 rounded-lg shrink-0">
                                <MapPin size={12} />
                              </div>
                              <span className="text-[11px] font-bold text-white whitespace-normal break-words flex-1">
                                عنوان التوصيل: {order.customerProvince} - {order.customerAddress}
                              </span>
                            </div>
                            {mapsUrl && (
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-black text-[#b07aff] underline underline-offset-2 w-fit"
                              >
                                فتح الموقع على الخريطة
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* المحفظة والجوائز — ورقة بنفس أسلوب من نحن */}
          {showWallet && (() => {
            const walletTierState = currentCustomer
              ? getEffectiveCustomerTierState(currentCustomer, loyalty)
              : { monthlyOrdersCount: 0, tier: 'Silver' as const, lastResetMonth: '', needsPersistReset: false };
            const walletTier = walletTierState.tier;
            const walletMonthlyOrders = walletTierState.monthlyOrdersCount;
            const walletTierProgress = getNextTierProgress(walletTier, walletMonthlyOrders, loyalty.tiers);
            const sortedTiers = getSortedTiers(loyalty.tiers);
            const upgradeTiers = getUpgradeableTiers(loyalty.tiers);
            const upgradeGridClass =
              upgradeTiers.length <= 2
                ? 'grid-cols-2'
                : upgradeTiers.length === 4
                  ? 'grid-cols-4'
                  : 'grid-cols-3';

            return (
            <LegalSheetModal
              open={showWallet}
              onClose={() => setShowWallet(false)}
              title={loyalty.texts.pageTitle}
              icon={Wallet}
              variant="home"
            >
            <div className="space-y-4 animate-fade-in font-tajawal text-right" dir="rtl">
              <header className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.5rem] p-5 sm:p-6 text-white shadow-2xl relative overflow-hidden text-center">
                <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />
                <div className="relative z-10">
                  <div className="welcome-icon-pulse mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-[#fff700] bg-brand-horizontal border border-white shadow-brand-glow-lg">
                    <Wallet size={28} />
                  </div>
                  <h1 className="font-black text-[#fff700] mb-1.5 text-lg">{loyalty.texts.pageTitle}</h1>
                  <p className="text-[10px] sm:text-xs font-bold text-purple-100">
                    رصيدك {currentCustomer?.points ?? 0} {loyalty.texts.pointsUnit} — الأكواد والخصومات
                  </p>
                </div>
              </header>

              <div className="welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-1.5 flex gap-1 shadow-sm">
                <button
                  onClick={() => setWalletView('points')}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${walletView === 'points' ? 'welcome-btn-pulse text-white bg-brand-horizontal border border-white/30 shadow-brand-glow' : 'text-white/50 hover:bg-white/10 hover:text-white/80'}`}
                >
                  {loyalty.texts.pointsTabLabel}
                </button>
                <button
                  onClick={() => setWalletView('gifts')}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${walletView === 'gifts' ? 'welcome-btn-pulse text-white bg-brand-horizontal border border-white/30 shadow-brand-glow' : 'text-white/50 hover:bg-white/10 hover:text-white/80'}`}
                >
                  {loyalty.texts.giftsTabLabel}
                </button>
              </div>

              {walletView === 'points' && (
                <div className="space-y-6">
                  {/* كارد النقاط ونظام المستويات المحسن */}
                  <div className="welcome-card-glow welcome-card-shimmer welcome-card-border-glow relative overflow-hidden rounded-[2.5rem] p-5 text-white shadow-2xl border border-white/30 bg-white/5 backdrop-blur-md">
                    <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />
                    
                    <div className="relative z-10">
                      {/*Header: Balance & Badge*/}
                      <div className="flex justify-between items-center mb-5">
                        <div className="text-right">
                          <h2 className="text-[11px] font-black text-[#fff700] mb-1 flex items-center gap-1.5">
                             <Award size={14} className="text-[#fff700]" />
                             {loyalty.texts.balanceLabel}
                          </h2>
                          <div className="flex items-baseline gap-1">
                             <span className="text-3xl font-black text-[#fff700] leading-none tracking-tighter">
                                {currentCustomer?.points || 0}
                             </span>
                             <span className="text-[10px] font-black text-purple-100">{loyalty.texts.pointsUnit}</span>
                          </div>
                        </div>
                        
                        <div className={`p-2.5 rounded-2xl backdrop-blur-xl border flex flex-col items-center justify-center min-w-[65px] shadow-lg ${
                          walletTier === 'Diamond' ? 'bg-vibrant-purple/10 border-vibrant-purple/20 text-[#b07aff] shadow-vibrant-purple/25/50' : 
                          walletTier === 'Platinum' ? 'bg-slate-400/10 border-slate-400/20 text-slate-300 shadow-slate-400/10' : 
                          walletTier === 'Gold' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-amber-500/10' : 
                          'bg-orange-500/10 border-orange-500/20 text-orange-400 shadow-orange-500/10'
                        }`}>
                           <Star size={18} fill="currentColor" className="mb-0.5" />
                           <span className="text-[9px] font-black uppercase tracking-widest">{walletTier}</span>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-3xl p-4 border border-white/5">
                        <div className="flex justify-between items-end mb-3">
                           <div className="text-right">
                              <span className="text-[10px] text-white/50 font-bold block mb-1">{loyalty.texts.nextTierLabel}</span>
                              <p className="text-[11px] font-black text-white">
                                 {walletTierProgress.nextTier
                                   ? `${walletTierProgress.nextTier.labelAr} (متبقي ${walletTierProgress.remaining} طلب)`
                                   : loyalty.texts.maxTierMessage}
                              </p>
                           </div>
                           <span className="text-[10px] font-black text-white">
                              {walletMonthlyOrders} / {walletTierProgress.progressTarget || sortedTiers[sortedTiers.length - 1]?.ordersRequired || 0}
                           </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/10 relative">
                           <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${walletTierProgress.progressPercent}%` }}
                              className={`h-full rounded-full relative ${
                                walletTier === 'Diamond' ? 'bg-[#b07aff]' : 
                                walletTier === 'Platinum' ? 'bg-slate-300' : 
                                walletTier === 'Gold' ? 'bg-amber-400' : 'bg-orange-400'
                              }`}
                           >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                           </motion.div>
                        </div>

                        {/* Tiers Visual Indicator */}
                        <div className="flex justify-between mt-4 px-1">
                           {sortedTiers.map((tier) => {
                             const isCurrent = walletTier === tier.key;
                             const isAchieved = walletMonthlyOrders >= tier.ordersRequired;
                             
                             return (
                               <div key={tier.key} className="flex flex-col items-center gap-1.5 min-w-[40px]">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                                    isCurrent 
                                    ? tier.key === 'Diamond' ? 'bg-vibrant-purple text-white ring-4 ring-vibrant-purple/20 scale-110 shadow-lg' :
                                      tier.key === 'Platinum' ? 'bg-slate-400 text-white ring-4 ring-slate-400/20 scale-110 shadow-lg' :
                                      tier.key === 'Gold' ? 'bg-amber-500 text-white ring-4 ring-amber-500/20 scale-110 shadow-lg' :
                                      'bg-orange-500 text-white ring-4 ring-orange-500/20 scale-110 shadow-lg'
                                    : isAchieved 
                                      ? 'bg-vibrant-purple text-white opacity-60' 
                                      : 'bg-white/5 text-white/40 border border-white/10'
                                  }`}>
                                     {tier.shortIcon}
                                  </div>
                                  <span className={`text-[9px] font-black transition-colors ${
                                    isCurrent 
                                    ? tier.key === 'Diamond' ? 'text-[#b07aff]' :
                                      tier.key === 'Platinum' ? 'text-slate-300' :
                                      tier.key === 'Gold' ? 'text-amber-400' :
                                      'text-orange-400'
                                    : isAchieved ? 'text-[#b07aff]' : 'text-white/40'
                                  }`}>
                                     {tier.labelAr}
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
                     <h3 className="text-xs font-black text-[#fff700] mr-2 uppercase tracking-widest flex items-center gap-2">
                       <Gift size={14} className="text-[#fff700]" />
                       {loyalty.texts.rewardShopTitle}
                     </h3>
                     <div className="grid gap-3">
                        {loyaltyRedemptionPackages.map((pkg) => {
                          const userPoints = currentCustomer?.points || 0;
                          const canRedeem = userPoints >= pkg.points;
                          const progressPercent = Math.min(100, Math.round((userPoints / pkg.points) * 100));
                          
                          return (
                            <div key={pkg.id} className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.2rem] p-5 shadow-lg flex flex-col gap-4 group hover:bg-white/10 transition-all duration-300 relative overflow-hidden">
                               {/* الجزء العلوي: المعلومات والزر */}
                               <div className="flex items-center justify-between w-full">
                                 <div className="flex items-center gap-3.5 text-right bg-transparent">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border border-white/20 transition-all duration-300 ${
                                      canRedeem 
                                      ? 'welcome-icon-pulse bg-brand-horizontal text-[#fff700] scale-105 shadow-brand-glow' 
                                      : 'bg-white/10 text-[#fff700]'
                                    }`}>
                                       <Gift size={24} />
                                    </div>
                                    <div>
                                       <h4 className="font-extrabold text-[#fff700] text-sm leading-tight flex items-center gap-1.5 font-tajawal">
                                          <span>خصم {(pkg.discountIqd || 0).toLocaleString()} د.ع</span>
                                          {canRedeem && (
                                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-md font-black border border-emerald-400/30 font-tajawal">متاح</span>
                                          )}
                                       </h4>
                                       <p className="text-[10px] text-purple-100 font-bold mt-0.5 font-tajawal">{pkg.title}</p>
                                    </div>
                                 </div>
                                 
                                 <button 
                                   onClick={() => handleRedeemPoints(pkg.points)}
                                   disabled={!canRedeem}
                                   className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all duration-300 active:scale-95 ${
                                     canRedeem 
                                     ? 'welcome-btn-pulse bg-brand-horizontal text-white border border-white/30 shadow-brand-glow hover:opacity-95 cursor-pointer' 
                                     : 'bg-white/10 text-white/70 cursor-not-allowed border border-white/20 font-mono'
                                   }`}
                                 >
                                    {canRedeem ? loyalty.texts.redeemButton : formatLoyaltyTemplate(loyalty.texts.redeemRemainingTemplate, { remaining: pkg.points - userPoints })}
                                 </button>
                               </div>

                               {/* شريط التقدم المتدرج لتوضيح مدى قرب العميل للاستبدال */}
                               <div className="space-y-1.5 bg-white/10 p-2.5 rounded-[1.2rem] border border-white/20 text-white">
                                 <div className="flex justify-between items-center text-[9px] font-mono font-bold text-white">
                                   <span>{progressPercent}% مكتمل</span>
                                   <span>{userPoints.toLocaleString()} / {pkg.points.toLocaleString()} نقطة</span>
                                 </div>
                                 <div className="h-2 bg-white/20 rounded-full overflow-hidden relative">
                                   <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${progressPercent}%` }}
                                      transition={{ duration: 0.8, ease: "easeOut" }}
                                      className={`h-full rounded-full bg-gradient-to-r ${
                                        canRedeem 
                                        ? 'from-amber-400 to-[#7B3DFF]' 
                                        : 'from-[#b07aff] to-[#0B1320]'
                                      }`}
                                   />
                                 </div>
                               </div>
                            </div>
                          );
                        })}
                     </div>
                  </div>

                  {/* معلومات الشحن */}
                  <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-6 shadow-sm">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 rounded-xl bg-white/15 border border-white/20 text-[#fff700] shrink-0 shadow-sm">
                           <Zap size={16} />
                        </div>
                        <h3 className="font-black text-[#fff700] text-sm">{loyalty.texts.rechargeTitle}</h3>
                     </div>
                     <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder={loyalty.texts.rechargePlaceholder}
                          className="flex-1 bg-white/10 border border-white/20 px-4 py-3 rounded-2xl text-[10px] font-black outline-none focus:ring-4 focus:ring-white/10 focus:border-white/40 transition-all text-center tracking-widest uppercase text-white placeholder:text-white/50"
                          value={rechargeCodeInput}
                          onChange={(e) => setRechargeCodeInput(e.target.value.toUpperCase())}
                        />
                        <button 
                          onClick={handleRedeemCode}
                          disabled={isRedeeming || !rechargeCodeInput.trim()}
                          className="welcome-btn-pulse bg-brand-horizontal border border-white/30 text-white px-6 py-3 rounded-2xl font-black text-[10px] shadow-brand-glow hover:opacity-95 transition active:scale-95 disabled:opacity-50"
                        >
                          {isRedeeming ? '...' : loyalty.texts.rechargeButton}
                        </button>
                     </div>
                  </div>

                  <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md p-6 rounded-[2rem]">
                    <p className="text-[11px] font-black text-[#fff700] mb-3 flex items-center gap-2">
                       <Award size={16} className="text-[#fff700]" />
                       {loyalty.texts.earnSectionTitle}
                    </p>
                    <p className="text-[10px] text-purple-100/90 font-bold mb-4">
                       {loyalty.texts.earnSectionSubtitle}
                    </p>
                    <ul className="space-y-4 text-slate-600">
                       {loyaltyEarnRules.map((rule) => (
                         <li key={rule.id} className="flex items-start gap-3 text-[10.5px] font-bold text-right">
                           <span className="text-base select-none shrink-0 leading-none">{rule.emoji}</span>
                           <div className="flex-1">
                             <span className="block text-white font-black text-right">{rule.titleAr}</span>
                             {rule.type === 'tier_upgrade' ? (
                               <>
                                 <span className="text-[9.5px] text-white font-medium block text-right">{rule.descriptionAr}</span>
                                 <div className={`grid ${upgradeGridClass} gap-1.5 mt-2 p-2 rounded-xl text-center`}>
                                   {upgradeTiers.map((tier, idx) => (
                                     <div
                                       key={tier.key}
                                       className={idx > 0 && idx < upgradeTiers.length - 1 ? 'border-x border-white/20' : ''}
                                     >
                                       <span className="text-[8.5px] font-black block text-white">
                                         {tier.labelAr}
                                       </span>
                                       <span className="text-[9.5px] font-black text-white">
                                         +{tier.upgradeBonusPoints} نقطة
                                       </span>
                                     </div>
                                   ))}
                                 </div>
                                 <span className="text-[8.5px] text-white font-extrabold mt-1.5 block text-right">
                                   {formatTierResetNoteAr(loyalty.tierResetPeriodMonths)}
                                 </span>
                               </>
                             ) : rule.type === 'order_completed' ? (
                              <span className="text-[9.5px] text-white font-medium text-right block">
                                {formatOrderDeliveryRewardDescription(loyalty)}
                              </span>
                             ) : rule.type === 'share_app' ? (
                               <span className="text-[9.5px] text-white font-medium text-right block">
                                 {rule.descriptionAr || `احصل على ${rule.points || loyalty.shareRewardPoints} نقاط هدية.`}
                               </span>
                             ) : rule.type === 'store_review' ? (
                               <span className="text-[9.5px] text-white font-medium text-right block">{storeReviewRewardHintText(loyalty)}</span>
                             ) : (
                               <span className="text-[9.5px] text-white font-medium text-right block">
                                 {rule.descriptionAr}{rule.points > 0 ? ` (+${rule.points} نقطة)` : ''}
                               </span>
                             )}
                           </div>
                         </li>
                       ))}
                    </ul>
                  </div>
                </div>
              )}

              {walletView === 'gifts' && (() => {
                const now = Date.now();
                const isPromoStillValid = (p: typeof customerWalletPromos[number]) => {
                  if (p.status !== 'active') return false;
                  const expiry = p.expirationDate || p.expiresAt;
                  if (expiry && new Date(expiry).getTime() < now) return false;
                  const currentUses = p.currentGlobalUses ?? p.usedCount ?? 0;
                  const maxUses = p.maxGlobalUses ?? p.maxUses ?? 0;
                  if (maxUses > 0 && currentUses >= maxUses) return false;
                  return true;
                };

                const pointCodes = customerWalletPromos.filter(p =>
                  p.source === 'points'
                  && p.ownerCustomerId === currentCustomer?.id
                  && isPromoStillValid(p),
                );

                const storePromoCodes = customerWalletPromos.filter(p => {
                  if (p.source === 'points') return false;
                  if (!isPromoStillValid(p)) return false;
                  if (p.ownerCustomerId && p.ownerCustomerId !== currentCustomer?.id) return false;
                  return true;
                });

                const allCodes = [...pointCodes, ...storePromoCodes].filter((p, idx, arr) =>
                  arr.findIndex(x => (x.id || x.code) === (p.id || p.code)) === idx
                );

                const openPromoStore = (storeId?: string | null) => {
                  if (!storeId || storeId === 'ALL_STORES') return;
                  const store =
                    stores.find(s => s.id === storeId)
                    ?? allStores.find(s => s.id === storeId);
                  if (store && !store.isBanned) {
                    navigateToStore(store);
                  }
                };
                
                return (
                  <div className="space-y-6 animate-fade-in">
                    {/* Header Card */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden text-center"
                    >
                       <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                       <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />
                       
                       <div className="relative z-10">
                          <div className="welcome-icon-pulse mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-[#fff700] bg-brand-horizontal border border-white shadow-brand-glow-lg">
                             <Gift size={28} />
                          </div>
                          <h3 className="font-black text-[#fff700] text-lg mb-1.5">{loyalty.texts.giftsHeaderTitle}</h3>
                          <p className="text-[10px] sm:text-xs font-bold text-purple-100 leading-relaxed max-w-md mx-auto">
                             {loyalty.texts.giftsHeaderSubtitle}
                          </p>
                       </div>
                    </motion.div>

                    {allCodes.length === 0 ? (
                      <div className="py-16 text-center welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.5rem] shadow-sm px-8">
                        <div className="welcome-icon-pulse mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-[#fff700] bg-brand-horizontal border border-white shadow-brand-glow-lg">
                           <Ticket size={32} />
                        </div>
                        <h4 className="text-[#fff700] font-black text-lg mb-2">{loyalty.texts.giftsEmptyTitle}</h4>
                        <p className="text-purple-100/80 text-xs font-bold leading-relaxed max-w-xs mx-auto">
                           {loyalty.texts.giftsEmptyText}
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

                          const promoStoreId = p.merchantId || p.storeId;
                          const promoStore = promoStoreId && promoStoreId !== 'ALL_STORES'
                            ? stores.find(s => s.id === promoStoreId)
                            : undefined;
                          const isMerchantLaunch = p.source === 'merchant' || (p.sponsor === 'MERCHANT' && promoStoreId && promoStoreId !== 'ALL_STORES');
                          const isPointRedemption = p.source === 'points' && (!promoStoreId || promoStoreId === 'ALL_STORES');
                          
                          let promoHeader = p.source === 'points' ? loyalty.texts.promoHeaderPoints : loyalty.texts.promoHeaderStore;
                          if (p.sponsor === 'ADMIN') {
                            promoHeader = loyalty.texts.promoHeaderAdmin;
                          } else if (isMerchantLaunch && promoStore) {
                            promoHeader = `كود خصم من متجر ${promoStore.shopName}`;
                          } else if (p.sponsor === 'MERCHANT' && promoStore) {
                            promoHeader = `مكافأة من متجر ${promoStore.shopName}`;
                          }

                          const sideBadge = isPointRedemption
                            ? 'نقاط'
                            : isMerchantLaunch
                              ? 'متجر'
                              : 'هدية';
                          
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
                               <div className="welcome-card-border-glow bg-white/5 border border-white/20 backdrop-blur-md rounded-3xl shadow-lg hover:shadow-vibrant-purple/20 transition-all duration-300 overflow-hidden flex">
                                  {/* Left Section (Punch Box) */}
                                  <div className={`w-20 sm:w-28 flex flex-col items-center justify-center border-r border-dashed border-white/20 relative ${isPointRedemption ? 'bg-violet/10' : 'bg-amber-500/10'}`}>
                                     {/* Punch Holes */}
                                     <div className="absolute -top-3 -right-3 w-6 h-6 bg-deep-navy border border-white/10 rounded-full shadow-inner"></div>
                                     <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-deep-navy border border-white/10 rounded-full shadow-inner"></div>
                                     
                                     <div className={`p-3 rounded-2xl mb-2 ${isPointRedemption ? 'bg-violet/20 text-vibrant-purple' : 'bg-amber-100 text-amber-600'}`}>
                                        {p.sponsor === 'ADMIN' ? <Gift size={24} /> : (isPointRedemption ? <Sparkles size={24} /> : (isMerchantLaunch ? <StoreIcon size={24} /> : <Gift size={24} />))}
                                     </div>
                                     <span className={`text-[10px] font-black uppercase tracking-tighter ${isPointRedemption ? 'text-vibrant-purple' : 'text-amber-600'}`}>
                                        {sideBadge}
                                     </span>
                                  </div>

                                  {/* Middle Content */}
                                  <div className="flex-1 p-5 sm:p-7 text-right bg-brand-horizontal">
                                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                                        <div>
                                           <div className="flex items-center gap-2 mb-1">
                                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                              <h4 className="text-[10px] sm:text-xs font-black text-white">
                                                 {promoHeader}
                                              </h4>
                                           </div>
                                           {promoStore && (
                                             <button
                                               type="button"
                                               onClick={() => openPromoStore(promoStore.id)}
                                               className="text-[10px] font-bold text-[#fff700] hover:underline flex items-center gap-1 mb-1"
                                             >
                                               <StoreIcon size={12} />
                                               {promoStore.shopName}
                                             </button>
                                           )}
                                           <div className="flex items-baseline gap-1">
                                              <span className="text-2xl font-black text-[#fff700]">
                                                 {formatPromoDiscount(p)}
                                              </span>
                                           </div>
                                        </div>
                                        <div className="px-3 py-1 bg-brand-horizontal rounded-xl border border-vibrant-purple flex items-center gap-2 select-none">
                                           <Calendar size={12} className="text-white" />
                                           <span className="text-[9px] text-white font-bold">{formattedDate}</span>
                                        </div>
                                     </div>

                                     {/* Code Area */}
                                     <div className="relative group/code">
                                        <div className={`bg-slate-50 border-2 border-dashed text-vibrant-purple ${isCopied ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200'} p-4 rounded-2xl transition-all flex items-center justify-between group-hover/code:border-[#cba8ff]`}>
                                           <div className="flex items-center gap-3">
                                              <code className={`text-lg font-black tracking-widest ${isCopied ? 'text-emerald-600' : 'text-[#fff700]'}`}>
                                                 {p.code}
                                              </code>
                                           </div>
                                           
                                           <button 
                                              onClick={async () => {
                                                try {
                                                  await navigator.clipboard.writeText(p.code);
                                                  setCopiedId(p.objectId || p.id || idx.toString());
                                                  setTimeout(() => setCopiedId(null), 2000);
                                                } catch {
                                                  showToast('error', 'تعذر النسخ', 'انسخ الكود يدوياً.');
                                                }
                                              }}
                                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all ${
                                                isCopied 
                                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
                                                : 'bg-brand-horizontal text-white border border-white active:scale-95'
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
                                        <div className="mt-2 space-y-2">
                                           <p className="text-[9px] text-white font-bold flex items-center justify-center gap-1">
                                              <Info size={10} />
                                              {promoStore
                                                ? `صالح للاستخدام في متجر «${promoStore.shopName}» فقط`
                                                : 'استخدم هذا الكود عند الدفع للحصول على الخصم'}
                                           </p>
                                           {promoStore && (
                                             <button
                                               type="button"
                                               onClick={() => openPromoStore(promoStore.id)}
                                               className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-[#fff700] text-[10px] font-black transition-all active:scale-95 flex items-center justify-center gap-2"
                                             >
                                               <StoreIcon size={14} />
                                               الدخول إلى المتجر
                                             </button>
                                           )}
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
            </LegalSheetModal>
            );
          })()}

          {/* تاب حسابي - تصميم فاخر يجمع بين البيانات والإعدادات */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fade-in px-1">
              {/* بطاقة المستخدم الرئيسية */}
              <div className="welcome-card-glow welcome-card-shimmer welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden text-center group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-violet/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                 
                 <div className="relative z-10">
                    <div className="relative inline-block mb-4 sm:mb-4">
                       <div className="w-20 h-20 rounded-[1.8rem] bg-vibrant-purple flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-violet/20 border-4 border-white/40">
                          {currentCustomer?.name?.charAt(0)}
                       </div>
                       <div className="absolute -bottom-1 -left-1 w-8 h-8 bg-emerald-500 text-white border-4 border-white/40 rounded-2xl flex items-center justify-center shadow-lg">
                          <Check size={14} />
                       </div>
                    </div>
                    <h2 className="text-xl font-black text-white mb-0.5">{currentCustomer?.name}</h2>
                    <div className="flex items-center justify-center gap-1.5 mb-5 select-none">
                       <Phone size={10} className="text-white" />
                       <span className="text-white font-black text-[10px] tracking-widest">{currentCustomer?.phone}</span>
                    </div>
                    
                    <div className="flex items-center justify-center gap-3">
                       <button
                         type="button"
                         onClick={() => openLoyaltyWallet('points')}
                         className="welcome-btn-pulse px-5 py-2 bg-white/10 border border-white/30 backdrop-blur-md rounded-2xl shrink-0 text-white hover:bg-white/20 transition-colors active:scale-[0.98]"
                       >
                          <div className="flex items-baseline justify-center gap-1">
                             <span className="text-sm font-black">{currentCustomer?.points ?? 0}</span>
                             <span className="text-[10px] font-black">{loyalty.texts.pointsUnit}</span>
                          </div>
                       </button>
                    </div>
                 </div>
              </div>

              {/* أقسام البيانات والإعدادات */}
              <div className="space-y-4">
                  {/* 1. معلوماتي */}
                    <button
                      type="button"
                      onClick={() => setShowMyInfo(true)}
                      className="w-full text-right welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 shadow-sm flex items-center justify-between hover:bg-white/10 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 border border-white/20 text-white/80 rounded-2xl group-hover:bg-vibrant-purple group-hover:text-white transition-colors">
                          <User size={20} />
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-white block">معلوماتي</span>
                          <span className="text-[10px] text-white font-bold">رقم الهاتف والاسم الكامل</span>
                        </div>
                      </div>
                      <ChevronLeft size={18} className="text-white group-hover:translate-x-1 transition-transform" />
                    </button>

                  {/* 2. مواقع التوصيل المحفوظة */}
                    <button
                      type="button"
                      onClick={() => setShowSavedLocations(true)}
                      className="w-full text-right welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 shadow-sm flex items-center justify-between hover:bg-white/10 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 border border-white/20 text-white/80 rounded-2xl group-hover:bg-vibrant-purple group-hover:text-white transition-colors">
                          <MapPin size={20} />
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-white block">مواقع التوصيل المحفوظة</span>
                          <span className="text-[10px] text-white font-bold">
                            {savedLocations.length > 0
                              ? `${savedLocations.length} موقع محفوظ — البيت، العمل، وأماكن أخرى`
                              : 'أضف مواقع البيت والعمل وغيرها'}
                          </span>
                        </div>
                      </div>
                      <ChevronLeft size={18} className="text-white group-hover:translate-x-1 transition-transform" />
                    </button>

                  {/* 3. المحفظة والجوائز */}
                    <button
                      type="button"
                      onClick={() => openLoyaltyWallet('points')}
                      className="w-full text-right welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 shadow-sm flex items-center justify-between hover:bg-white/10 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 border border-white/20 text-white/80 rounded-2xl group-hover:bg-vibrant-purple group-hover:text-white transition-colors">
                          <Wallet size={20} />
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-white block">المحفظة والجوائز</span>
                          <span className="text-[10px] text-white font-bold">
                            رصيدك {currentCustomer?.points ?? 0} {loyalty.texts.pointsUnit} — الأكواد والخصومات
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {showProfileGiftBadge && (
                          <span className="bg-yellow-500 text-violet text-[8px] px-1.5 py-0.5 rounded-full font-black animate-bounce shadow-sm border border-white">
                            🎁
                          </span>
                        )}
                        <ChevronLeft size={18} className="text-white group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>

                  {/* 4. خيارات أخرى */}
                    <button 
                      type="button"
                      onClick={() => { setShowPasswordChange(true); setPwStep(1); }}
                      className="w-full text-right welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 shadow-sm flex items-center justify-between hover:bg-white/10 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                         <div className="p-3 bg-white/10 border border-white/20 text-white/80 rounded-2xl group-hover:bg-vibrant-purple group-hover:text-white transition-colors">
                            <Shield size={20} />
                         </div>
                         <div className="text-right">
                            <span className="text-sm font-black text-white block">تغيير كلمة المرور</span>
                            <span className="text-[10px] text-white font-bold">تحديث أمان حسابك</span>
                         </div>
                      </div>
                      <ChevronLeft size={18} className="text-white group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button 
                      type="button"
                      onClick={() => openExternalUrl("https://wa.me/9647735187868")} 
                      className="w-full text-right welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 shadow-sm flex items-center justify-between hover:bg-white/10 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                         <div className="p-3 bg-white/10 border border-white/20 text-white/80 rounded-2xl group-hover:bg-vibrant-purple group-hover:text-white transition-colors">
                            <MessageCircle size={20} />
                         </div>
                         <div className="text-right">
                            <span className="text-sm font-black text-white block">الدعم الفني والواتساب</span>
                            <span className="text-[10px] text-white font-bold">تحدث معنا مباشرة</span>
                         </div>
                      </div>
                      <ChevronLeft size={18} className="text-white group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAboutUs(true)}
                      className="w-full text-right welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 shadow-sm flex items-center justify-between hover:bg-white/10 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 border border-white/20 text-white/80 rounded-2xl group-hover:bg-vibrant-purple group-hover:text-white transition-colors">
                          <StoreIcon size={20} />
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-white block">من نحن</span>
                          <span className="text-[10px] text-white font-bold">تعرف على منصة محلك</span>
                        </div>
                      </div>
                      <ChevronLeft size={18} className="text-white group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPrivacyPolicy(true)}
                      className="w-full text-right welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 shadow-sm flex items-center justify-between hover:bg-white/10 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 border border-white/20 text-white/80 rounded-2xl group-hover:bg-vibrant-purple group-hover:text-white transition-colors">
                          <FileText size={20} />
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-white block">سياسة الخصوصية</span>
                          <span className="text-[10px] text-white font-bold">كيف نستخدم بياناتك</span>
                        </div>
                      </div>
                      <ChevronLeft size={18} className="text-white group-hover:translate-x-1 transition-transform" />
                    </button>

                    <DeleteAccountSection
                      variant="glass"
                      accountLabel={`حساب الزبون: ${currentCustomer?.name || ''}`}
                      onConfirmDelete={() => deleteUserAccountSecure('customer')}
                    />
              </div>

              {/* تسجيل الخروج */}
              <div className="pt-4 space-y-3 pb-20">
                 <button 
                  onClick={handleLogoutClick}
                  className="w-full py-5 bg-rose-500/10 text-rose-200 rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 border border-rose-400/30 backdrop-blur-md hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all shadow-sm active:scale-95"
                 >
                    <LogOut size={20} />
                    <span>تسجيل الخروج من الحساب</span>
                 </button>

              </div>

            </div>
          )}

        </main>
          </div>
        )}
        <nav className={`fixed bottom-0 left-0 right-0 z-50 select-none overflow-x-auto flex justify-around p-2 ${
          selectedStore && selectedStoreTheme.enabled ? 'merchant-nav-mobile' : 'customer-welcome-nav'
        }`}>
          <div className="max-w-4xl mx-auto w-full flex justify-around items-center">
            {[
              { id: 'stores', label: 'الرئيسية', icon: MahalakLogoIcon, iconSize: 24 },
              /*{ id: 'reels', label: 'الفيديو', icon: Tv },*/
              { id: 'merchants', label: 'المتاجر', icon: StoreIcon },
              { id: 'products', label: 'المنتجات', icon: ShoppingBag },
              { id: 'orders', label: 'طلباتي', icon: ClipboardList, badge: pendingOrdersCount },
              { id: 'profile', label: 'حسابي', icon: User, gift: showProfileGiftBadge }
            ].map((tab) => {
              const active = (activeTab === tab.id || (tab.id === 'profile' && showWallet)) && !selectedStore;
              const iconSize = 'iconSize' in tab ? tab.iconSize : 18;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex flex-col items-center px-2 py-1.5 rounded-xl transition-all duration-300 relative ${active ? (selectedStore ? 'text-violet' : 'text-white scale-105') : 'text-slate-400 hover:text-slate-300'}`}
                >
                  <div className={`p-1.5 rounded-lg mb-1 transition-all ${active ? 'bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white shadow-brand-glow' : 'bg-transparent'}`}>
                    {tab.id === 'stores' ? (
                      <MahalakLogoIcon size={iconSize} inverted={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-vibrant-purple'}`} />
                    ) : (
                      <tab.icon size={iconSize} className={`w-5 h-5 ${active ? 'text-white' : 'text-vibrant-purple'}`} />
                    )}
                  </div>
                  
                  {(tab.badge || 0) > 0 && (
                    <span className="absolute top-0 right-2 w-4 h-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white ring-px ring-rose-200 animate-pulse">
                      {tab.badge}
                    </span>
                  )}

                  {tab.gift && (
                    <span className="absolute top-0 right-2 bg-yellow-500 text-violet text-[8px] px-1.5 rounded-full font-black animate-bounce shadow-sm border border-white">
                      🎁
                    </span>
                  )}

                  <span className={`text-[9px] font-bold ${selectedStore ? 'text-slate-300' : active ? 'text-white' : 'text-slate-400'}`}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>


        {/* سلة المشتريات (Drawer) — تأثيرات الرئيسية */}
        {showCart && (
          <div className="fixed inset-0 bg-deep-navy/60 backdrop-blur-md z-55 flex justify-end">
            <div className="relative w-full max-w-[335px] h-full shadow-2xl flex flex-col animate-slide-left text-right border-r border-white/20 font-tajawal overflow-hidden bg-deep-navy">
              <WelcomeScreenBackground lite />
              
              <div className="relative z-10 customer-welcome-header welcome-card-border-glow p-3 text-white flex justify-between items-center shrink-0 border-b border-white/20">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { if (!handleAppBack()) setShowCart(false); }}
                    className="welcome-btn-pulse p-1 px-2 border border-white/30 rounded-lg bg-white/10 hover:bg-white/20 transition-all flex items-center gap-0.5 font-bold text-[9px] backdrop-blur-md"
                  >
                    <ChevronRight size={12} />
                    <span>رجوع</span>
                  </button>
                  <div className="flex items-center space-x-1.5 space-x-reverse">
                    <div className="welcome-icon-pulse p-1.5 bg-white/10 border border-white/20 rounded-lg">
                      <ShoppingBag size={14} />
                    </div>
                    <h3 className="text-xs font-black">سلة المشتريات ({cart.reduce((acc, curr) => acc + curr.quantity, 0)})</h3>
                  </div>
                </div>
                <button onClick={() => setShowCart(false)} className="p-1.5 hover:bg-white/10 rounded-lg shrink-0 border border-transparent hover:border-white/20 transition-all">
                  <X size={16} className="text-white/80" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
                  <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-8 w-full text-center">
                    <ShoppingBag size={48} className="mb-3 mx-auto text-white/30" />
                    <p className="font-bold text-xs text-white">سلة مشترياتك فارغة!</p>
                    <p className="text-[10px] mt-1 text-center text-white/60">أضف منتجات من المتاجر لبدء الطلب.</p>
                    <button onClick={() => setShowCart(false)} className="welcome-btn-pulse mt-4 px-4 py-1.5 bg-gradient-to-r from-[#7B3DFF] to-[#0B1320] border border-white/30 text-white font-bold text-[10px] rounded-lg shadow-xs transition">تصفح المتاجر الآن</button>
                    
                    {lastCompletedOrder && (
                      <button 
                        onClick={handleQuickReorder} 
                        className="welcome-btn-pulse mt-4 w-full py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 active:scale-95 backdrop-blur-md"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                        الطلب السريع (إعادة آخر طلب)
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* تنبيه الطلب من عدة متاجر */}
                  {Object.keys(cartByStore).length > 1 && (
                    <div className="relative z-10 px-3 py-1.5 bg-amber-500/15 border-b border-amber-400/30 text-[8.5px] font-bold text-amber-200 text-center backdrop-blur-md">
                      ⚠️ أنت تطلب من {Object.keys(cartByStore).length} متاجر مختلفة - سيتم إرسال طلب منفصل لكل متجر
                    </div>
                  )}

                  {lastCompletedOrder && cart.length > 0 && (
                    <div className="relative z-10 order-actions-container px-3 pt-3 flex w-full">
                      <button 
                        onClick={handleQuickReorder} 
                        className="welcome-btn-pulse group flex-1 w-full py-2.5 bg-emerald-500/15 text-emerald-200 border border-emerald-400/30 hover:bg-emerald-500/25 rounded-xl font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all duration-300 min-w-[100px] backdrop-blur-md"
                      >
                        <RefreshCw className="group-hover:rotate-180 transition-transform duration-500 shrink-0" size={16} />
                        <span>الطلب السريع (استبدال السلة بآخر طلب)</span>
                      </button>
                    </div>
                  )}

                  <div className="relative z-10 flex-1 overflow-y-auto p-3 space-y-3">
                    {/* معلومات العنوان المختار داخل السلة مع إمكانية التغيير */}
                    <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-xl p-2.5 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setShowCartLocationPicker(true)}
                          className="flex items-center gap-2 min-w-0 flex-1 text-right hover:opacity-90 transition-opacity"
                        >
                           <div className="welcome-icon-pulse p-1.5 bg-white/10 text-violet border border-white/20 rounded-lg shrink-0 backdrop-blur-md">
                              <MapPin size={14} />
                           </div>
                           <div className="min-w-0">
                              <p className="text-[8.5px] font-black text-white/70 mb-0.5">عنوان التوصيل الحالي</p>
                              <p className="text-[9.5px] font-black text-white leading-tight whitespace-normal break-words">
                                {activeOrderLocation
                                  ? `${activeOrderLocation.province} — ${formatSavedLocationAddress(activeOrderLocation)}`
                                  : `${currentCustomer?.province || ''}${currentCustomer?.address ? ` — ${currentCustomer.address}` : ''}`}
                              </p>
                              {activeOrderLocation && (
                                <p className="text-[8.5px] font-black text-white/70 mt-1">
                                  📍 موقع التوصيل: {activeOrderLocation.label}
                                </p>
                              )}
                           </div>
                        </button>
                        <button 
                          type="button"
                          onClick={() => setShowCartLocationPicker(true)}
                          className="p-1.5 text-violet hover:bg-white/10 rounded-lg transition-all shrink-0 border border-white/20"
                          title="تغيير موقع التوصيل"
                          aria-label="تغيير موقع التوصيل"
                        >
                           <RefreshCw size={14} />
                        </button>
                      </div>
                      
                      {/* الخريطة المصغرة في السلة */}
                      {adminSettings?.enableMaps !== false && activeOrderLocation && activeOrderLocation.lat != null && activeOrderLocation.lng != null && (
                        <div className="w-full h-24 rounded-xl overflow-hidden border border-white/20 pointer-events-none relative mt-2 z-0">
                          <MapContainer 
                            key={`customer-${currentCustomer?.id}-${activeOrderLocation.id}`}
                            center={[activeOrderLocation.lat, activeOrderLocation.lng]} 
                            zoom={14} 
                            style={{ height: "100%", width: "100%", zIndex: 0 }}
                            zoomControl={false}
                            attributionControl={false}
                            dragging={false}
                            scrollWheelZoom={false}
                            doubleClickZoom={false}
                          >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Marker position={[activeOrderLocation.lat, activeOrderLocation.lng]} />
                          </MapContainer>
                          <div className="absolute inset-0 z-[400] bg-transparent"></div>
                        </div>
                      )}
                    </div>

                    {/* عرض المنتجات مجمعة حسب المتجر */}
                    {Object.entries(cartByStore).map(([storeId, group]) => (
                      <div key={storeId} className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-xl p-2.5 space-y-2">
                        {/* اسم المتجر */}
                        <div className="flex items-center space-x-1.5 space-x-reverse pb-1.5 border-b border-dashed border-white/20">
                          <img src={group.store.logo || undefined} alt="" className="w-4.5 h-4.5 rounded object-cover border border-white/20" />
                          <span className="text-[10px] font-black text-white truncate max-w-[120px]">{group.store.shopName}</span>
                          <span className="text-[8.5px] text-white/70 mr-auto whitespace-nowrap">
                            🚚 {(() => {
                              const delInfo = getStoreDeliveryInfo(group.store, activeOrderLocation?.province || currentCustomer?.province || 'بغداد');
                              const isFree = delInfo.isFree || group.items.some(i => i.product.isFreeDelivery);
                              return isFree ? 'مجاني' : `${delInfo.price.toLocaleString()} د.ع`;
                            })()}
                          </span>
                        </div>
                        
                        {/* منتجات هذا المتجر */}
                        {group.items.map(item => (
                          <div key={item.product.id} className="flex items-center space-x-2 space-x-reverse py-1.5 border-b border-white/10 last:border-0 last:pb-0">
                            <img src={item.product.image || undefined} alt={item.product.name} className="w-8 h-8 object-cover rounded border border-white/20 shrink-0" />
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-white text-[10px] truncate leading-tight">{item.product.name}</h4>
                              <div className="flex flex-wrap items-baseline gap-1 mt-0.5">
                                <span className="text-[#FFF700] font-extrabold text-[10px] leading-tight">
                                  {((item.product?.finalPrice || 0) * (item.quantity || 0)).toLocaleString()} <span className="text-[7px] text-white/70 font-normal">د.ع</span>
                                </span>
                                {item.product?.discountType !== 'none' && (
                                  <span className="text-[8px] text-rose-300 line-through">
                                    {((item.product?.price || 0) * (item.quantity || 0)).toLocaleString()} د.ع
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center border border-white/30 bg-white/10 backdrop-blur-md rounded-md overflow-hidden shrink-0">
                              <button onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)} className="p-0.5 px-1 hover:bg-white/10 text-white border-l border-white/20">
                                {item.quantity === 1 ? <Trash2 size={9} className="text-rose-300" /> : <Minus size={9} />}
                              </button>
                              <span className="px-1.5 text-[10px] font-bold text-white">{item.quantity}</span>
                              <button onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)} className="p-0.5 px-1 hover:bg-white/10 text-white border-r border-white/20">
                                <Plus size={9} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="relative z-10 p-3 border-t border-white/20 welcome-card-border-glow bg-white/5 backdrop-blur-md shadow-[0_-3px_8px_rgba(0,0,0,0.15)] space-y-3 shrink-0 text-white">
                    
                    {!appliedPromo ? (
                      <form onSubmit={handleApplyPromo} className="space-y-1">
                        <div className="flex gap-1.5">
                          <input 
                            type="text" 
                            placeholder="أدخل بروموكود خصم..." 
                            value={promoInput}
                            onChange={(e) => setPromoInput(e.target.value)}
                            className="flex-1 border border-white/20 bg-white/10 p-1.5 rounded-lg text-[10px] text-center text-white placeholder:text-white/50 focus:ring-1 focus:ring-vibrant-purple focus:outline-none font-mono uppercase backdrop-blur-md"
                            style={{ direction: 'ltr', color: 'white' }}
                          />
                          <button
                            type="submit"
                            disabled={isApplyingPromo}
                            className="welcome-btn-pulse px-3 py-1.5 hover:opacity-90 text-white font-bold text-[10px] rounded-lg transition shrink-0 border border-white/30 disabled:opacity-60"
                          >
                            {isApplyingPromo ? 'جاري...' : 'تطبيق'}
                          </button>
                        </div>
                        {promoError && <p className="text-[8.5px] text-rose-300 font-semibold">{promoError}</p>}
                      </form>
                    ) : (
                      <div className="welcome-card-border-glow bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 p-2 rounded-lg flex justify-between items-center text-[10px] font-semibold backdrop-blur-md">
                        <span className="flex items-center space-x-1 space-x-reverse">
                          <Check size={12} />
                          <span>تم تطبيق الخصم: <strong className="font-mono bg-emerald-500/20 px-1 py-0.5 rounded">{appliedPromo.code}</strong></span>
                        </span>
                        <button onClick={() => setAppliedPromo(null)} className="p-0.5 text-emerald-200 hover:bg-emerald-500/20 rounded">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}

                    <div className="border-b border-dashed border-white/20 pb-2.5 text-[10px] font-semibold text-white space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-white/70">المجموع الفرعي:</span>
                        <span className="text-white">{(subtotal || 0).toLocaleString()} د.ع</span>
                      </div>
                      
                      {/* تفصيل رسوم التوصيل لكل متجر */}
                      {Object.entries(cartByStore).map(([storeId, group]) => {
                        const delInfo = getStoreDeliveryInfo(group.store, activeOrderLocation?.province || currentCustomer?.province || 'بغداد');
                        const hasFree = delInfo.isFree || group.items.some(i => i.product.isFreeDelivery);
                        return (
                          <div key={storeId} className="flex justify-between text-[8.5px]">
                            <span className="text-white/70">🚚 توصيل {group.store.shopName}:</span>
                            <span className={hasFree ? 'text-emerald-300' : 'text-white'}>
                              {hasFree ? 'مجاني' : `${delInfo.price.toLocaleString()} د.ع`}
                            </span>
                          </div>
                        );
                      })}
                      
                      <div className="flex justify-between border-t border-white/20 pt-1.5">
                        <span className="text-white/70">إجمالي التوصيل:</span>
                        <span className={deliveryCost === 0 ? 'text-emerald-300' : 'text-white'}>
                          {deliveryCost === 0 ? 'مجاني 🎉' : `${(deliveryCost || 0).toLocaleString()} د.ع`}
                        </span>
                      </div>
                      {appliedPromo && (
                        <div className="flex justify-between text-rose-300">
                          <span>خصم البروموكود:</span>
                          <span>- {(appliedPromo?.discountValue || 0).toLocaleString()} د.ع</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-[11px] font-black text-white border-t border-white/20 pt-2 mt-1">
                        <span>الإجمالي النهائي:</span>
                        <span className="text-[#FFF700] text-xs">{(total || 0).toLocaleString()} د.ع</span>
                      </div>
                    </div>

                    <div className="order-actions-container flex flex-wrap gap-2 items-stretch justify-center w-full mt-2">
                      <button 
                        type="button"
                        onClick={handlePlaceOrder}
                        disabled={isPlacingOrder}
                        className={`welcome-btn-pulse relative overflow-hidden group flex-1 w-full py-3 border border-white/30 text-white rounded-xl shadow-[0_4px_12px_rgba(153,82,255,0.3)] font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-2 transition-all duration-300 min-w-[100px] ${
                          isPlacingOrder
                            ? 'opacity-80 cursor-wait'
                            : 'hover:shadow-[0_8px_20px_rgba(153,82,255,0.4)] hover:-translate-y-1 active:scale-95'
                        }`}
                      >
                        {!isPlacingOrder && (
                          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0" />
                        )}
                        {isPlacingOrder ? (
                          <>
                            <RefreshCw className="relative z-10 animate-spin shrink-0" size={16} />
                            <span className="relative z-10">جار إرسال الطلب...</span>
                          </>
                        ) : (
                          <>
                            <Check className="relative z-10 group-hover:scale-125 transition-transform duration-300 shrink-0" size={16} />
                            <span className="relative z-10">
                              {Object.keys(cartByStore).length > 1 
                                ? `تأكيد وإرسال الطلبات إلى ${Object.keys(cartByStore).length} متاجر` 
                                : 'تأكيد وإرسال الطلب'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                    
                    <p className="text-[8px] text-white/60 text-center font-bold pb-1 pt-1">
                      💡 الدفع عند الاستلام | الطلبات ترسل منفصلة
                    </p>
                  </div>
                </>
              )}

            </div>
          </div>
        )}

        <DeliveryLocationPickerSheet
          open={showCartLocationPicker && showCart}
          onClose={() => setShowCartLocationPicker(false)}
          locations={headerLocations}
          activeLocationId={orderDeliveryLocationId ?? activeOrderLocation?.id ?? null}
          onSelect={setOrderDeliveryLocationId}
          onManageLocations={() => {
            setShowCartLocationPicker(false);
            setShowCart(false);
            handleTabChange('profile');
            setShowSavedLocations(true);
          }}
        />

        {/* مودال تفاصيل المنتج — تأثيرات الرئيسية */}
        <AnimatePresence>
          {selectedProductDetail && (
            <div className="fixed inset-0 bg-deep-navy/70 backdrop-blur-xl z-[80] flex items-start md:items-center justify-center p-0 md:p-6 overflow-y-auto">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 50 }}
                className="relative bg-deep-navy w-full max-w-4xl h-[100dvh] md:h-auto md:min-h-0 md:max-h-[88vh] md:rounded-[2.5rem] shadow-2xl overflow-hidden text-right flex flex-col border border-white/20 welcome-card-border-glow"
              >
                <WelcomeScreenBackground lite />

                {/* شريط علوي ثابت — زر الرجوع ومشاركة المنتج */}
                <div className="relative z-50 customer-welcome-header welcome-card-border-glow shrink-0 px-3 sm:px-4 py-3 flex items-center justify-between gap-2 border-b border-white/20 pt-[max(0.75rem,env(safe-area-inset-top))]">
                  <button
                    type="button"
                    onClick={handleProductDetailBack}
                    className="welcome-btn-pulse flex items-center gap-1.5 text-white bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-black transition-all active:scale-95 cursor-pointer font-tajawal shrink-0 backdrop-blur-md"
                    title={compareSession && !compareSession.listOpen ? 'رجوع لقائمة المقارنة' : 'رجوع'}
                  >
                    <ChevronRight size={18} strokeWidth={2.5} />
                    <span>{compareSession && !compareSession.listOpen ? 'رجوع للمقارنة' : 'رجوع'}</span>
                  </button>

                  <div className="flex-1 min-w-0 flex justify-center px-1">
                    <button
                      type="button"
                      onClick={() => {
                        const store = selectedStore ?? storeMap.get(selectedProductDetail.storeId);
                        if (!store || store.isBanned) return;
                        closeProductDetail();
                        setSelectedStore(store);
                      }}
                      className="inline-flex max-w-full px-3 py-1 rounded-full border border-white/30 bg-white/10 text-white text-[10px] sm:text-[11px] font-bold truncate cursor-pointer hover:bg-white/20 transition-colors active:scale-95 backdrop-blur-md"
                      title={selectedStore?.shopName ?? storeMap.get(selectedProductDetail.storeId)?.shopName ?? 'المتجر'}
                    >
                      {selectedStore?.shopName ?? storeMap.get(selectedProductDetail.storeId)?.shopName ?? 'المتجر'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const store = selectedStore ?? storeMap.get(selectedProductDetail.storeId);
                      openShareModal('product', { ...selectedProductDetail, shopName: store?.shopName });
                    }}
                    className="welcome-btn-pulse flex items-center gap-1.5 text-white bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl px-3 sm:px-3.5 py-2.5 text-[11px] sm:text-xs font-black transition-all active:scale-95 shrink-0 cursor-pointer font-tajawal backdrop-blur-md"
                    title="مشاركة المنتج"
                  >
                    <Share2 size={16} />
                    <span>مشاركة</span>
                  </button>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
                  {/* صورة المنتج */}
                  <div className="w-full md:w-5/12 h-[36vh] md:h-full bg-white/5 border-b md:border-b-0 md:border-l border-white/10 relative shrink-0 flex items-center justify-center">
                    <ProductImage
                      src={selectedProductDetail.image}
                      alt={selectedProductDetail.name}
                      size="custom"
                      priority
                      objectFit="contain"
                      className="w-full h-full"
                    />
                    <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-deep-navy/60 to-transparent pointer-events-none" />
                    {(selectedProductDetail.discountType !== 'none' || selectedProductDetail.isFreeDelivery) && (
                      <div className="absolute bottom-3 right-3 flex flex-wrap gap-1.5 justify-end">
                        {selectedProductDetail.discountType !== 'none' && (
                          <div className="bg-rose-500/90 text-white px-3 py-1.5 rounded-xl font-black text-[10px] shadow-lg border border-rose-300/30 backdrop-blur-md">
                            {selectedProductDetail.discountType === 'percent'
                              ? `خصم ${selectedProductDetail.discountValue}%`
                              : `توفير ${selectedProductDetail.discountValue.toLocaleString()} د.ع`}
                          </div>
                        )}
                        {selectedProductDetail.isFreeDelivery && (
                          <div className="welcome-btn-pulse bg-gradient-to-r from-[#7B3DFF] to-[#0B1320] text-white px-3 py-1.5 rounded-xl font-black text-[10px] shadow-lg flex items-center gap-1 border border-white/30">
                            <Zap size={10} className="fill-white" />
                            <span>توصيل مجاني</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* تفاصيل المنتج */}
                  <div className="w-full md:w-7/12 flex flex-col overflow-hidden relative flex-1">
                    <div className="p-5 md:p-6 overflow-y-auto flex-1 space-y-4 pb-36">

                      {/* التصنيف والتوفر */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black text-[#FFF700] px-3 py-1 bg-white/10 rounded-xl border border-white/25 backdrop-blur-md">
                          {selectedProductDetail.category || 'غير مصنف'}
                        </span>
                        {hasTrackedInventory(selectedProductDetail.inventory) ? (
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 shrink-0 backdrop-blur-md ${
                            Number(selectedProductDetail.inventory) > 0
                              ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30'
                              : 'bg-rose-500/15 text-rose-200 border border-rose-400/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${Number(selectedProductDetail.inventory) > 0 ? 'bg-emerald-300' : 'bg-rose-400'}`} />
                            {getProductAvailabilityLabel(selectedProductDetail.inventory)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 bg-white/10 text-white border border-white/25 shrink-0 backdrop-blur-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FFF700]" />
                            {getProductAvailabilityLabel(selectedProductDetail.inventory)}
                          </span>
                        )}
                      </div>

                      {/* العنوان والماركة */}
                      <div className="space-y-1">
                        {selectedProductDetail.brand?.trim() && (
                          <span className="text-white/70 font-mono text-[11px] font-bold tracking-wider block">
                            {selectedProductDetail.brand}
                          </span>
                        )}
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight break-words">
                          {selectedProductDetail.name}
                        </h2>
                      </div>

                      {/* الوسوم */}
                      {selectedProductDetail.tags && selectedProductDetail.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedProductDetail.tags.map((tag) => (
                            <span key={tag} className="px-2.5 py-0.5 bg-white/10 border border-white/20 text-white rounded-lg text-[9.5px] font-semibold backdrop-blur-md">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* السعر */}
                      {selectedProductDetail.discountType !== 'none' ? (
                        <div className="welcome-card-glow welcome-card-shimmer welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-2xl p-4 flex justify-between items-center shadow-lg">
                          <div>
                            <span className="text-[10px] text-[#FFF700] font-bold block mb-0.5">السعر بعد الخصم</span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl sm:text-3xl font-black text-[#FFF700]">
                                {selectedProductDetail.finalPrice.toLocaleString()}
                              </span>
                              <span className="text-xs font-black text-white/80">د.ع</span>
                            </div>
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] text-white/60 font-medium block mb-0.5">السعر الأصلي</span>
                            <span className="text-sm font-bold text-rose-300/80 line-through block">
                              {selectedProductDetail.price.toLocaleString()} د.ع
                            </span>
                            <span className="mt-1 inline-block bg-white/15 text-[#FFF700] text-[9px] font-black px-2 py-0.5 rounded-md border border-white/20">
                              خصم {selectedProductDetail.discountType === 'percent'
                                ? `${selectedProductDetail.discountValue}%`
                                : `${Math.round((selectedProductDetail.discountValue / selectedProductDetail.price) * 100)}%`}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="welcome-card-glow welcome-card-shimmer welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-2xl p-4 flex justify-between items-center shadow-lg">
                          <div>
                            <span className="text-[10px] text-white/70 font-bold block mb-0.5">السعر الشامل للمنتج</span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl sm:text-3xl font-black text-[#FFF700]">
                                {selectedProductDetail.price.toLocaleString()}
                              </span>
                              <span className="text-xs font-black text-white/80">د.ع</span>
                            </div>
                          </div>
                          <span className="text-[9.5px] text-white bg-white/10 border border-white/25 px-3 py-1.5 rounded-xl font-black backdrop-blur-md">
                            الدفع عند التوصيل
                          </span>
                        </div>
                      )}

                      {/* العرض الخاص */}
                      {selectedProductDetail.specialOffer?.trim() && (
                        <div className="welcome-card-border-glow bg-white/5 border border-white/30 border-dashed backdrop-blur-md rounded-2xl p-4 flex items-start gap-3">
                          <div className="welcome-icon-pulse p-2.5 bg-white/10 border border-white/20 text-violet rounded-xl shrink-0">
                            <Ticket size={18} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[9px] font-black uppercase text-[#FFF700] tracking-wider mb-0.5">عرض خاص</p>
                            <p className="text-xs font-black text-white">{selectedProductDetail.specialOffer}</p>
                          </div>
                        </div>
                      )}

                      {/* المواصفات */}
                      {((selectedProductDetail.condition?.trim()) ||
                        (selectedProductDetail.warranty?.trim()) ||
                        (selectedProductDetail.color?.trim()) ||
                        (selectedProductDetail.size?.trim()) ||
                        (selectedProductDetail.weight?.trim()) ||
                        (selectedProductDetail.length && String(selectedProductDetail.length).trim()) ||
                        (selectedProductDetail.width && String(selectedProductDetail.width).trim())) && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-black text-[#FFF700] border-r-4 border-vibrant-purple pr-2.5">
                            مواصفات المنتج
                          </h3>
                          <div className="grid grid-cols-2 gap-2 welcome-card-border-glow bg-white/5 border border-white/20 backdrop-blur-md p-2.5 rounded-2xl">
                            {selectedProductDetail.condition?.trim() && (
                              <div className="flex justify-between items-center p-2.5 bg-white/5 rounded-xl border border-white/15">
                                <span className="text-[#FFF700] text-[10px] font-bold">الحالة</span>
                                <span className="text-[10.5px] font-black text-white">
                                  {selectedProductDetail.condition === 'new' ? 'جديد' : selectedProductDetail.condition === 'used' ? 'مستعمل' : selectedProductDetail.condition}
                                </span>
                              </div>
                            )}
                            {selectedProductDetail.warranty?.trim() && (
                              <div className="flex justify-between items-center p-2.5 bg-white/5 rounded-xl border border-white/15">
                                <span className="text-[#FFF700] text-[10px] font-bold">الضمان</span>
                                <span className="text-[10.5px] font-black text-violet-200">{selectedProductDetail.warranty}</span>
                              </div>
                            )}
                            {selectedProductDetail.color?.trim() && (
                              <div className="flex justify-between items-center p-2.5 bg-white/5 rounded-xl border border-white/15">
                                <span className="text-[#FFF700] text-[10px] font-bold">اللون</span>
                                <span className="text-[10.5px] font-black text-white">{selectedProductDetail.color}</span>
                              </div>
                            )}
                            {selectedProductDetail.size?.trim() && (
                              <div className="flex justify-between items-center p-2.5 bg-white/5 rounded-xl border border-white/15">
                                <span className="text-[#FFF700] text-[10px] font-bold">المقاس</span>
                                <span className="text-[10.5px] font-black text-white bg-white/10 px-2 py-0.5 rounded border border-white/20">{selectedProductDetail.size}</span>
                              </div>
                            )}
                            {selectedProductDetail.weight?.trim() && (
                              <div className="flex justify-between items-center p-2.5 bg-white/5 rounded-xl border border-white/15">
                                <span className="text-[#FFF700] text-[10px] font-bold">الوزن</span>
                                <span className="text-[10.5px] font-black text-white font-mono">{selectedProductDetail.weight}</span>
                              </div>
                            )}
                            {((selectedProductDetail.length && String(selectedProductDetail.length).trim()) ||
                              (selectedProductDetail.width && String(selectedProductDetail.width).trim())) && (
                              <div className="flex justify-between items-center p-2.5 bg-white/5 rounded-xl border border-white/15 col-span-2">
                                <span className="text-[#FFF700] text-[10px] font-bold">الأبعاد</span>
                                <span className="text-[10.5px] font-black text-white font-mono" dir="ltr">
                                  {selectedProductDetail.length || '—'} × {selectedProductDetail.width || '—'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* الوصف */}
                      <div className="space-y-2">
                        <h3 className="text-xs font-black text-[#FFF700] border-r-4 border-vibrant-purple pr-2.5">
                          نبذة ووصف المنتج
                        </h3>
                        <div className="welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md p-4 rounded-2xl text-white/80 text-xs leading-relaxed font-tajawal break-words">
                          {selectedProductDetail.description || 'هذا المنتج المميز متوفر الآن في متجرنا الرسمي.'}
                        </div>
                      </div>

                    </div>

                    {/* شريط الإجراءات السفلي */}
                    <div className="absolute bottom-0 left-0 right-0 welcome-card-border-glow bg-white/5 backdrop-blur-md p-4 sm:p-5 border-t border-white/20 flex flex-col gap-3 z-10 shrink-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-white/70">الكمية:</span>
                        <div className="flex items-center bg-white/10 border border-white/25 rounded-2xl p-0.5 backdrop-blur-md">
                          <button
                            type="button"
                            onClick={() => setDetailQty(Math.max(1, detailQty - 1))}
                            className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/15 rounded-xl transition-all active:scale-95 cursor-pointer"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-10 text-center font-black text-white text-sm font-mono select-none">{detailQty}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (!selectedProductDetail) return;
                              const cartQty = cart.find((item) => item.product.id === selectedProductDetail.id)?.quantity || 0;
                              if (hasTrackedInventory(selectedProductDetail.inventory)) {
                                const remaining = Math.max(0, selectedProductDetail.inventory! - cartQty);
                                setDetailQty((q) => Math.min(q + 1, Math.max(1, remaining)));
                                return;
                              }
                              setDetailQty((q) => q + 1);
                            }}
                            disabled={(() => {
                              if (!selectedProductDetail || !hasTrackedInventory(selectedProductDetail.inventory)) return false;
                              const cartQty = cart.find((item) => item.product.id === selectedProductDetail.id)?.quantity || 0;
                              return detailQty >= Math.max(0, selectedProductDetail.inventory! - cartQty);
                            })()}
                            className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/15 rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2 w-full">
                        <button
                          type="button"
                          onClick={() => {
                            addToCart(selectedProductDetail, detailQty);
                            closeProductDetail();
                          }}
                          disabled={isProductOutOfStock(selectedProductDetail.inventory)}
                          className="welcome-btn-pulse flex-[4] bg-gradient-to-r from-[#7B3DFF] to-[#0B1320] hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm shadow-lg border border-white/30 transition-all active:scale-[0.97] flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <ShoppingCart size={16} />
                          <span>إضافة للسلة</span>
                          <span className="font-mono bg-white/15 px-2 py-0.5 rounded-lg text-[10px] sm:text-xs border border-white/20">
                            ({((selectedProductDetail.finalPrice || selectedProductDetail.price) * detailQty).toLocaleString()} د.ع)
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowRateModal({ type: 'product', data: selectedProductDetail })}
                          className="w-12 h-12 bg-white/10 hover:bg-white/20 border border-white/25 text-white rounded-2xl flex items-center justify-center transition-all active:scale-[0.95] shrink-0 cursor-pointer backdrop-blur-md"
                          title="التقييمات"
                        >
                          <Sparkles size={18} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedProductDetail) return;
                            setCompareSession({ baseProduct: selectedProductDetail, listOpen: true });
                          }}
                          className="w-12 h-12 bg-white/10 hover:bg-white/20 border border-white/25 text-white rounded-2xl flex items-center justify-center transition-all active:scale-[0.95] shrink-0 cursor-pointer backdrop-blur-md"
                          title="مقارنة الأسعار"
                        >
                          <ArrowRightLeft size={18} />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>


        {/* مودال تأكيد الاستبدال — تأثيرات الرئيسية */}
        {createPortal(
          <AnimatePresence>
            {showRedeemConfirm && (
              <div
                key="redeem-confirm"
                className="fixed inset-0 bg-deep-navy/60 backdrop-blur-md flex items-center justify-center p-4"
                style={{ zIndex: 10100 }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative welcome-card-glow welcome-card-border-glow bg-deep-navy border border-white/30 rounded-[2rem] shadow-2xl overflow-hidden w-full max-w-sm"
                >
                  <WelcomeScreenBackground lite />
                  <div className="relative z-10 p-6">
                    <div className="welcome-icon-pulse w-16 h-16 bg-amber-500/15 text-amber-300 border border-amber-400/30 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                      <Gift size={32} />
                    </div>
                    <h3 className="font-black text-white text-xl text-center mb-2">تأكيد الاستبدال</h3>
                    <p className="text-sm font-bold text-white/70 text-center mb-6">
                      هل أنت متأكد من رغبتك في استبدال {showRedeemConfirm} نقطة وتحويلها إلى كود خصم؟
                    </p>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={confirmRedeemPoints}
                        disabled={isRedeemingPoints}
                        className="welcome-btn-pulse flex-1 bg-gradient-to-r from-[#7B3DFF] to-[#0B1320] border border-white/30 text-white font-black py-4 rounded-2xl transition hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isRedeemingPoints ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>جاري التحويل...</span>
                          </>
                        ) : 'نعم، استبدل الآن'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (!isRedeemingPoints) setShowRedeemConfirm(null); }}
                        disabled={isRedeemingPoints}
                        className="flex-1 bg-white/10 border border-white/20 text-white/80 font-bold py-4 rounded-2xl transition hover:bg-white/20 disabled:opacity-50 backdrop-blur-md"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}

        {/* مودال التقييم — تأثيرات الرئيسية */}
        <AnimatePresence>
          {showRateModal && (
            <div className="fixed inset-0 bg-deep-navy/60 backdrop-blur-md z-[80] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative welcome-card-glow welcome-card-border-glow bg-deep-navy border border-white/30 rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl"
              >
                <WelcomeScreenBackground lite />
                <div className="relative z-10 p-6 text-center space-y-4 text-right">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-white text-lg">تقييم ال{showRateModal.type === 'store' ? 'متجر' : 'منتج'}</h3>
                    <button onClick={() => setShowRateModal(null)} className="p-2 bg-white/10 border border-white/20 text-white/70 hover:text-rose-300 rounded-full transition-colors backdrop-blur-md"><X size={16} /></button>
                  </div>
                  
                  <div className="flex flex-col items-center gap-2 py-4">
                    <p className="text-sm font-bold text-white/70 mb-2">كيف كانت تجربتك مع {showRateModal.type === 'store' ? showRateModal.data.shopName : showRateModal.data.name}؟</p>
                    <div className="flex gap-2 mb-4" dir="ltr">
                      {[1,2,3,4,5].map(star => (
                        <button 
                          key={star}
                          onClick={() => setRatingValue(star)}
                          className="text-4xl hover:scale-110 transition-transform active:scale-95 outline-none"
                        >
                          <span className={star <= ratingValue ? 'text-amber-400' : 'text-white/20'}>★</span>
                        </button>
                      ))}
                    </div>
                    {showRateModal.type === 'store' && (
                      <>
                        <p className="text-[11px] font-bold text-violet-300 mb-2">
                          🎁 ستحصل على {loyalty.storeReviewRewardPoints} نقطة ولاء عند إرسال تقييمك
                        </p>
                        <textarea
                        placeholder="شاركنا رأيك أو تجربتك مع المتجر..."
                        value={reviewMessage}
                        onChange={(e) => setReviewMessage(e.target.value)}
                        className="w-full text-sm p-3 border border-white/20 rounded-xl bg-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-vibrant-purple/30 resize-none h-24 backdrop-blur-md"
                      />
                      </>
                    )}
                    {showRateModal.type === 'product' && (
                      <textarea
                        placeholder="اختياري: اكتب ملاحظاتك عن المنتج..."
                        value={reviewMessage}
                        onChange={(e) => setReviewMessage(e.target.value)}
                        className="w-full text-sm p-3 border border-white/20 rounded-xl bg-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-vibrant-purple/30 resize-none h-24 backdrop-blur-md"
                      />
                    )}
                  </div>

                  <button 
                    onClick={async () => {
                      if (!currentCustomer || !showRateModal || isSubmittingReview) return;
                      if (ratingValue < 1) {
                        alert('يرجى اختيار تقييم بالنجوم أولاً');
                        return;
                      }
                      setIsSubmittingReview(true);
                      try {
                        if (showRateModal.type === 'store') {
                          await submitStoreReview({
                            storeId: showRateModal.data.id,
                            customerId: currentCustomer.id,
                            customerName: currentCustomer.name,
                            rating: ratingValue,
                            message: reviewMessage
                          });
                        } else {
                          await submitProductReview({
                            productId: showRateModal.data.id,
                            storeId: showRateModal.data.storeId,
                            customerId: currentCustomer.id,
                            customerName: currentCustomer.name,
                            rating: ratingValue,
                            message: reviewMessage || undefined,
                          });
                        }
                        alert(`شكرًا لك! تم إرسال تقييمك بنجاح (${ratingValue} نجوم)`);
                        setShowRateModal(null);
                        setRatingValue(5);
                        setReviewMessage('');
                      } catch (err: any) {
                        alert(err?.message || 'تعذر إرسال التقييم، حاول مجدداً');
                      } finally {
                        setIsSubmittingReview(false);
                      }
                    }}
                    disabled={isSubmittingReview}
                    className="welcome-btn-pulse w-full bg-transparent border border-white/30 text-white font-black py-4 rounded-2xl shadow-xl disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {isSubmittingReview ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      'إرسال التقييم'
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* لوحة مقارنة المنتجات المشابهة */}
        <AnimatePresence>
          {compareSession?.listOpen && (
            <ProductComparePanel
              baseProduct={compareSession.baseProduct}
              products={compareEligibleProducts}
              storeMap={storeMap}
              onClose={() => setCompareSession(null)}
              onBack={() => setCompareSession(null)}
              onSelectProduct={(product) => {
                setCompareSession((prev) => (prev ? { ...prev, listOpen: false } : null));
                const store = storeMap.get(product.storeId);
                if (store && !store.isBanned) setSelectedStore(store);
                openProductDetail(product, 'store');
              }}
              onAddToCart={addToCart}
            />
          )}
        </AnimatePresence>

        {/* مودال نجاح الطلب — تأثيرات الرئيسية */}
        <AnimatePresence>
          {showOrderSuccess && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-md bg-deep-navy/60 text-right">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative welcome-card-glow welcome-card-border-glow bg-deep-navy w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl text-center border border-white/30"
              >
                <WelcomeScreenBackground lite />
                <div className="relative z-10 welcome-card-shimmer bg-white/5 border-b border-white/20 p-10 flex flex-col items-center backdrop-blur-md">
                  <div className="welcome-icon-pulse w-20 h-20 bg-emerald-500/15 border border-emerald-400/40 rounded-[1.5rem] flex items-center justify-center shadow-inner mb-4">
                    <CheckCircle size={48} className="text-emerald-300" />
                  </div>
                  <h3 className="text-xl font-black text-white text-center">تم إرسال طلبك بنجاح! 🎉</h3>
                </div>
                <div className="relative z-10 p-8 space-y-6">
                  <div className="welcome-card-border-glow bg-white/5 rounded-2xl p-4 border border-white/20 backdrop-blur-md">
                    <p className="text-[10px] font-black text-white/50 mb-3 uppercase tracking-widest text-right">تفاصيل الطلبات</p>
                    <div className="text-[11px] font-black text-white/80 whitespace-pre-line leading-relaxed text-right">
                      {orderSummary}
                    </div>
                  </div>

                  <p className="text-[11px] text-white/60 font-bold leading-relaxed text-center">
                    شكراً لتسوقك من محلك! سيتم مراجعة الطلب من قبل المتاجر المختارة وتأكيده قريباً.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => { setShowOrderSuccess(false); handleTabChange('orders'); setSelectedStore(null); }}
                      className="welcome-btn-pulse py-4 border border-white/30 text-white font-black rounded-2xl shadow-lg hover:opacity-95 transition-all active:scale-95 text-[10px] sm:text-xs"
                    >
                      تتبع طلبي الآن
                    </button>
                    <button 
                      onClick={() => { setShowOrderSuccess(false); handleTabChange('stores'); setSelectedStore(null); }}
                      className="py-4 bg-white/10 text-white border border-white/25 font-black rounded-2xl shadow-sm hover:bg-white/20 transition-all active:scale-95 text-[10px] sm:text-xs backdrop-blur-md"
                    >
                      إكمال التسوق
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* مودال المشاركة — تأثيرات الرئيسية */}
        <AnimatePresence>
          {showShareModal && (
            <div className="fixed inset-0 bg-deep-navy/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative welcome-card-glow welcome-card-border-glow bg-deep-navy w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden text-right border border-white/30"
              >
                <WelcomeScreenBackground lite />
                <div className="relative z-10 p-8 pb-4">
                   <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setShowShareModal(false)}
                          className="welcome-btn-pulse p-2 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all ml-1 backdrop-blur-md"
                        >
                          <ChevronRight size={20} />
                        </button>
                        <h3 className="text-xl font-black text-white">مشاركة مع الأصدقاء</h3>
                      </div>
                      <button onClick={() => setShowShareModal(false)} className="p-2 text-white/50 hover:text-rose-300 transition-colors">
                        <X size={20} />
                      </button>
                   </div>

                   <p className="text-[10px] font-black text-white/50 mb-2 mr-1 uppercase tracking-widest">معاينة نص المشاركة</p>
                   <textarea 
                    value={shareText}
                    onChange={(e) => setShareText(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 p-4 rounded-2xl text-xs font-bold text-white placeholder:text-white/40 focus:ring-1 focus:ring-vibrant-purple outline-none leading-relaxed mb-4 min-h-[100px] backdrop-blur-md"
                   />

                   <p className="text-[10px] font-black text-white/50 mb-3 mr-1 uppercase tracking-widest text-center">اختر منصة المشاركة</p>
                   
                   <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => executeShare('whatsapp')} className="flex flex-col items-center gap-2 p-4 welcome-card-border-glow bg-emerald-500/15 text-emerald-200 border border-emerald-400/30 rounded-3xl hover:bg-emerald-500/25 transition-colors group backdrop-blur-md">
                        <div className="bg-white/10 border border-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform">
                          <MessageCircle size={24} />
                        </div>
                        <span className="text-[9px] font-black">واتساب</span>
                      </button>
                      <button onClick={() => executeShare('telegram')} className="flex flex-col items-center gap-2 p-4 welcome-card-border-glow bg-white/5 text-violet-200 border border-white/20 rounded-3xl hover:bg-white/10 transition-colors group backdrop-blur-md">
                        <div className="bg-white/10 border border-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform text-violet-200">
                           <Send size={24} />
                        </div>
                        <span className="text-[9px] font-black">تيليجرام</span>
                      </button>
                      <button onClick={() => executeShare('messenger')} className="flex flex-col items-center gap-2 p-4 welcome-card-border-glow bg-white/5 text-violet-200 border border-white/20 rounded-3xl hover:bg-white/10 transition-colors group backdrop-blur-md">
                        <div className="bg-white/10 border border-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform text-violet-200">
                          <MessageCircle size={24} />
                        </div>
                        <span className="text-[9px] font-black">ماسنجر</span>
                      </button>
                      <button onClick={() => executeShare('instagram')} className="flex flex-col items-center gap-2 p-4 welcome-card-border-glow bg-rose-500/15 text-rose-200 border border-rose-400/30 rounded-3xl hover:bg-rose-500/25 transition-colors group backdrop-blur-md">
                        <div className="bg-white/10 border border-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform text-rose-200">
                          <Camera size={24} />
                        </div>
                        <span className="text-[9px] font-black">انستقرام</span>
                      </button>
                      <button onClick={() => executeShare('facebook')} className="flex flex-col items-center gap-2 p-4 welcome-card-border-glow bg-white/5 text-violet-200 border border-white/20 rounded-3xl hover:bg-white/10 transition-colors group backdrop-blur-md">
                        <div className="bg-white/10 border border-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform text-violet-200">
                          <Users size={24} />
                        </div>
                        <span className="text-[9px] font-black">فيسبوك</span>
                      </button>
                      <button onClick={() => executeShare('copy')} className="flex flex-col items-center gap-2 p-4 welcome-card-border-glow bg-white/5 text-white/80 border border-white/20 rounded-3xl hover:bg-white/10 transition-colors group backdrop-blur-md">
                        <div className="bg-white/10 border border-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform">
                          <ClipboardList size={24} />
                        </div>
                        <span className="text-[9px] font-black">نسخ الرابط</span>
                      </button>
                   </div>
                </div>
                
                <div className="relative z-10 p-8 pt-0">
                  <p className="text-[9px] text-white/50 text-center font-bold">
                    سيتم منحك {loyalty.shareRewardPoints} نقاط مكافأة عند كل مشاركة ناجحة 🎁
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* مودال تأكيد التغييرات غير المحفوظة — تأثيرات الرئيسية */}
        <AnimatePresence>
          {showUnsavedModal && (
            <div className="fixed inset-0 bg-deep-navy/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative welcome-card-glow welcome-card-border-glow bg-deep-navy w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden text-right border border-white/30"
              >
                <WelcomeScreenBackground lite />
                <div className="relative z-10 p-8">
                  <div className="welcome-icon-pulse w-16 h-16 bg-amber-500/15 text-amber-300 border border-amber-400/30 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
                    <AlertCircle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-white text-center mb-2">تنبيه: تغييرات غير محفوظة</h3>
                  <p className="text-sm text-white/70 text-center leading-relaxed">
                    لقد قمت بتعديل بياناتك الشخصية ولكن لم تقم بحفظها بعد. هل تريد حفظ التغييرات قبل الانتقال؟
                  </p>
                </div>
                
                <div className="relative z-10 p-6 border-t border-white/15 bg-white/5 backdrop-blur-md flex flex-col gap-3">
                  <button 
                    onClick={() => handleConfirmUnsaved(true)}
                    disabled={isSavingProfile}
                    className="welcome-btn-pulse w-full py-4 bg-gradient-to-r from-[#7B3DFF] to-[#0B1320] border border-white/30 text-white rounded-2xl font-black text-sm shadow-lg hover:opacity-95 transition-all active:scale-[0.98] disabled:opacity-70"
                  >
                    {isSavingProfile ? 'جاري الحفظ...' : 'نعم، حفظ التغييرات'}
                  </button>
                  <button 
                    onClick={() => handleConfirmUnsaved(false)}
                    className="w-full py-4 bg-white/10 text-white/80 border border-white/20 rounded-2xl font-black text-sm hover:bg-white/20 transition-all active:scale-[0.98] backdrop-blur-md"
                  >
                    لا، تجاهل التغييرات
                  </button>
                  <button 
                    onClick={() => { setShowUnsavedModal(false); setPendingTab(null); }}
                    className="w-full py-2 text-xs font-bold text-white/50 hover:text-white transition-colors"
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
            <div className="fixed inset-0 bg-deep-navy/80 backdrop-blur-md z-[150] flex flex-col overflow-hidden animate-fade-in" dir="rtl">
              {/* شريط التحكم العلوي */}
              <div className="bg-gradient-to-l from-vibrant-purple to-deep-navy text-white py-3 px-4 flex items-center justify-between shadow-lg border-b border-white/10 z-50">
                <div className="flex items-center gap-2">
                  <MahalakLogo className="h-8 w-8 shrink-0 object-contain" />
                  <div className="max-w-[150px] sm:max-w-xs text-right">
                    <h3 className="text-xs sm:text-sm font-black text-white font-tajawal">مستعرض محلك الداخلي</h3>
                    <p className="text-[10px] text-slate-300 font-bold truncate leading-none mt-0.5">{iframeUrl}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(iframeUrl);
                        alert('تم نسخ الرابط بنجاح! ✅');
                      } catch {
                        alert('تعذر نسخ الرابط.');
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

        {/* نافذة تأكيد إلغاء الطلب — تأثيرات الرئيسية */}
        {createPortal(
          <AnimatePresence>
            {orderToCancel && (
              <div
                className="fixed inset-0 bg-deep-navy/60 backdrop-blur-md flex items-center justify-center p-4"
                style={{ zIndex: 10100 }}
                dir="rtl"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setOrderToCancel(null);
                }}
              >
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative welcome-card-glow welcome-card-border-glow bg-deep-navy w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden text-right border border-white/30 pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <WelcomeScreenBackground lite />
                  <div className="relative z-10 p-8 pointer-events-auto">
                    <div className="welcome-icon-pulse w-16 h-16 bg-rose-500/15 text-rose-300 border border-rose-400/30 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
                      <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-black text-white text-center mb-2">تأكيد إلغاء الطلب</h3>
                    <p className="text-sm text-white/70 text-center leading-relaxed font-tajawal">
                      هل أنت متأكد من رغبتك في إلغاء الطلب رقم <span className="font-sans font-black bg-white/10 text-violet-200 px-1.5 py-0.5 rounded-sm border border-white/20">#{getOrderSeqId(orderToCancel.id) || orderToCancel.orderNumber || '—'}</span> من متجر <span className="text-violet-200 font-black">{orderToCancel.storeName}</span>؟ هذا الإجراء فوري وسيتم إلغاء تحضير الطلب تلقائياً ولا يمكن الرجوع عنه.
                    </p>
                  </div>
                  
                  <div className="relative z-20 p-6 border-t border-white/15 bg-white/5 backdrop-blur-md flex flex-col gap-3 pointer-events-auto">
                    <button 
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const orderId = orderToCancel?.id;
                        if (!orderId || isCancellingOrder) return;
                        setIsCancellingOrder(true);
                        try {
                          await updateOrderStatus(orderId, 'cancelled', 'ألغاه الزبون خلال مهلة الإلغاء');
                          setOrderToCancel(null);
                        } catch (err) {
                          console.error(err);
                          alert('تعذر إلغاء الطلب حالياً، حاول مرة أخرى.');
                        } finally {
                          setIsCancellingOrder(false);
                        }
                      }}
                      disabled={isCancellingOrder}
                      className="relative z-20 welcome-btn-pulse w-full py-4 bg-gradient-to-r from-rose-500 to-[#0B1320] border border-white/30 text-white rounded-2xl font-black text-sm shadow-lg hover:opacity-95 transition-all active:scale-[0.98] cursor-pointer pointer-events-auto disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                      {isCancellingOrder ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          جاري الإلغاء...
                        </>
                      ) : (
                        'نعم، إلغاء الطلب'
                      )}
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOrderToCancel(null);
                      }}
                      className="relative z-20 w-full py-4 bg-white/10 text-white/80 border border-white/20 rounded-2xl font-black text-sm hover:bg-white/20 transition-all active:scale-[0.98] cursor-pointer backdrop-blur-md pointer-events-auto"
                    >
                      تراجع
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}

        <PrivacyPolicyModal open={showPrivacyPolicy} onClose={() => setShowPrivacyPolicy(false)} />
        <AboutUsModal open={showAboutUs} onClose={() => setShowAboutUs(false)} />
        <MyInfoModal
          open={showMyInfo}
          onClose={() => setShowMyInfo(false)}
          phone={currentCustomer?.phone ?? ''}
          name={profileForm.name}
          isSaving={isSavingProfile}
          onNameChange={(value) => setProfileForm((prev) => ({ ...prev, name: value }))}
          onSave={handleSaveProfile}
        />
        <SavedLocationsModal
          open={showSavedLocations}
          onClose={() => setShowSavedLocations(false)}
          locations={savedLocations}
          onChange={setSavedLocations}
          provinces={provinces}
          onSave={handleSaveProfile}
          isSaving={isSavingProfile}
        />
        <ChangePasswordModal
          open={showPasswordChange}
          onClose={() => {
            setShowPasswordChange(false);
            setPwStep(1);
            setOtpPwCode('');
            setNewPassword('');
            setIsSendingPwOtp(false);
            setIsUpdatingPassword(false);
          }}
          phone={currentCustomer?.phone ?? ''}
          pwStep={pwStep as 1 | 2}
          otpPwCode={otpPwCode}
          newPassword={newPassword}
          isSendingOtp={isSendingPwOtp}
          isUpdatingPassword={isUpdatingPassword}
          onOtpChange={setOtpPwCode}
          onNewPasswordChange={setNewPassword}
          onSubmit={handleChangePassword}
          onResendOtp={async () => {
            if (!currentCustomer || isSendingPwOtp) return;
            setIsSendingPwOtp(true);
            try {
              const ok = await authService.requestOTP(currentCustomer.phone, 'forgot');
              if (ok) {
                setPwStep(2);
                showToast('success', 'تم إرسال رمز التحقق إلى واتساب!');
              } else {
                showModal('error', 'فشل إرسال الرمز', 'حاول مرة أخرى.');
              }
            } catch (err: any) {
              showModal('error', 'خطأ في الاتصال', err.message || 'حاول مرة أخرى.');
            } finally {
              setIsSendingPwOtp(false);
            }
          }}
        />
      </div>
    );
  }

  // ==========================================
  // شاشات تسجيل دخول الزبون والتسجيل
  // ==========================================
  return (
    <CustomerAuthPage contentKey={view}>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black text-white">
            تطبيق محلك للزبائن
          </h1>
          <p className="mt-1 text-xs text-white">
            عالم من التسوق في قلب منطقتك
          </p>
        </div>

        {/* شاشة تسجيل الدخول */}
        {view === 'login' && (
          <form onSubmit={handleLogin} noValidate className="space-y-5">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-2xl font-bold flex items-center gap-2">
                <ShieldAlert size={16} />
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
                رقم الهاتف <span className="text-red-500">*</span>
              </label>
              <div
                className="flex items-center border border-slate-200 rounded-2xl overflow-hidden bg-gradient-to-r from-vibrant-purple to-deep-navy focus-within:border-slate-500 transition-all"
                dir="ltr"
              >
                <span className="px-4 py-3 bg-gradient-to-r from-vibrant-purple to-deep-navy text-white text-sm font-bold border-r border-white">
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
                  className="flex-1 bg-brand-horizontal p-3 text-sm focus:outline-none font-mono text-left text-white placeholder:text-white/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
                كلمة المرور <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-slate-200 p-3.5 rounded-2xl text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-slate-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setLoginError("");
                setForgotPhone(loginPhone);
                setView("forgot");
              }}
              className="text-xs font-bold text-[#FFF700] hover:underline px-1"
            >
              هل نسيت كلمة السر؟
            </button>
            <button
              type="submit"
              disabled={isLoadingAuth}
              className={`welcome-btn-pulse w-full py-4 font-black rounded-2xl transition-all flex items-center justify-center gap-2 ${
                isLoadingAuth
                  ? 'bg-vibrant-purple/70 text-white cursor-wait'
                  : 'bg-brand-horizontal text-white hover:opacity-95'
              }`}
            >
              {isLoadingAuth ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  <span>جارٍ تسجيل الدخول...</span>
                </>
              ) : (
                <>
                  <LogOut size={20} className="rotate-180" />
                  <span>تسجيل الدخول</span>
                </>
              )}
            </button>
            <div className="text-center pt-4 border-t border-vibrant-purple text-sm text-white">
              ليس لديك حساب؟{" "}
              <button
                type="button"
                onClick={() => { setLoginError(''); setView("signup"); }}
                className="font-bold text-[#FFF700]"
              >
                انشاء حساب جديد
              </button>
            </div>
          </form>
        )}

        {/* شاشة نسيت كلمة السر */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} noValidate className="space-y-5">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-2xl font-bold flex items-center gap-2">
                <ShieldAlert size={16} />
                {loginError}
              </div>
            )}
            <div className="text-center">
              <h3 className="text-xl font-black text-white">
                استعادة كلمة المرور
              </h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-white/80 mb-1.5">
                رقم الهاتف المسجل <span className="text-red-500">*</span>
              </label>
              <div
                className="flex items-center border border-slate-200 rounded-2xl overflow-hidden bg-gradient-to-r from-vibrant-purple to-deep-navy"
                dir="ltr"
              >
                <span className="px-4 py-3 bg-gradient-to-r from-vibrant-purple to-deep-navy text-white text-sm font-bold border-r border-white">
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
                  className="flex-1 bg-brand-horizontal p-3 text-sm font-mono text-left text-white placeholder:text-white/50 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-white/80 mb-1.5">
                كلمة المرور الجديدة <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={forgotNewPassword}
                onChange={(e) => setForgotNewPassword(e.target.value)}
                placeholder="لا تقل عن 8 حروف أو رموز"
                required
                className="w-full border border-slate-200 p-3.5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-slate-500 focus:outline-none placeholder:text-white/50"
              />
            </div>
            <button
              type="submit"
              disabled={isLoadingAuth}
              className={`welcome-btn-pulse w-full py-4 text-white font-black rounded-2xl transition-all ${
                isLoadingAuth ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-horizontal hover:opacity-95'
              }`}
            >
              {isLoadingAuth ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  جار ارسال رمز التحقق
                </span>
              ) : (
                'إرسال رمز OTP'
              )}
            </button>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setView("login")}
                className="text-xs font-bold text-slate-400 hover:text-vibrant-purple transition-colors"
              >
                العودة لتسجيل الدخول
              </button>
            </div>
          </form>
        )}

        {/* شاشة تأكيد OTP */}
        {view === 'otp' && (
          <form onSubmit={handleOtpConfirm} noValidate className="space-y-6">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-2xl font-bold flex items-center gap-2">
                <ShieldAlert size={16} />
                {loginError}
              </div>
            )}
            <div className="text-center">
              <h3 className="text-xl font-black text-white">تأكيد الرمز</h3>
              <p className="text-sm text-slate-300 mt-2">
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
              className="w-full border-2 border-slate-500 p-4 rounded-2xl text-center text-3xl font-black font-mono tracking-[0.5em] text-white focus:ring-4 focus:ring-slate-100 focus:outline-none placeholder:text-white/50"
            />
            <button
              type="submit"
              disabled={isLoadingAuth}
              className={`welcome-btn-pulse w-full py-4 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 ${
                isLoadingAuth ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-horizontal hover:opacity-95'
              }`}
            >
              {isLoadingAuth ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  <span>جاري التأكيد...</span>
                </>
              ) : (
                <>
                  <Check size={20} />
                  <span>تأكيد الرمز والدخول</span>
                </>
              )}
            </button>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() =>
                  setView(otpMode === "signup" ? "signup" : "forgot")
                }
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                العودة لتعديل البيانات
              </button>
            </div>
          </form>
        )}

        {/* شاشة تسجيل زبون جديد */}
        {view === 'signup' && (
          <form onSubmit={handleSignup} noValidate className="space-y-4">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-2xl font-bold flex items-center gap-2">
                <ShieldAlert size={16} />
                {loginError}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  الاسم الكامل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: محمد صفاء جبار"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  required
                  className={`w-full border p-3 rounded-2xl text-sm text-white placeholder:text-white/50 ${custName.trim() ? "border-green-400" : "border-slate-200"}`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  رقم الهاتف (WhatsApp) <span className="text-red-500">*</span>
                </label>
                <div
                  className={`flex items-center border rounded-2xl overflow-hidden bg-gradient-to-r from-vibrant-purple to-deep-navy ${isPhoneValid ? "border-green-400" : custPhone ? "border-red-400" : "border-slate-200"}`}
                  dir="ltr"
                >
                  <span className="px-4 py-3 bg-gradient-to-r from-vibrant-purple to-deep-navy text-white text-sm font-bold border-r border-white">
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
                    className="flex-1 bg-brand-horizontal p-3 text-sm font-mono text-left text-white placeholder:text-white/50 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  كلمة المرور <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={custPassword}
                  onChange={(e) => setCustPassword(e.target.value)}
                  placeholder="لا تقل عن 8 حروف"
                  required
                  className={`w-full border p-3 rounded-2xl text-sm text-white placeholder:text-white/50 ${isCustomerPasswordValid ? "border-green-400" : custPassword ? "border-red-400" : "border-slate-200"}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    المحافظة <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={custProvince}
                    onChange={(e) => setCustProvince(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-2xl text-sm input-brand"
                  >
                    {provinces.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white mb-1">المنطقة / الحي <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="مثال: حي العامل"
                    value={custArea}
                    onChange={(e) => setCustArea(e.target.value)}
                    required
                    className="w-full border border-slate-200 p-2.5 rounded-2xl text-xs text-white placeholder:text-white/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white mb-1">محلة</label>
                  <input
                    type="text"
                    placeholder="مثال: 809"
                    value={custMahalla}
                    onChange={(e) => setCustMahalla(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl text-sm text-white placeholder:text-white/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white mb-1">زقاق</label>
                  <input
                    type="text"
                    placeholder="مثال: 21"
                    value={custZuqaq}
                    onChange={(e) => setCustZuqaq(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl text-sm text-white placeholder:text-white/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white mb-1">دار</label>
                  <input
                    type="text"
                    placeholder="مثال: 4"
                    value={custDar}
                    onChange={(e) => setCustDar(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-2xl text-sm text-white placeholder:text-white/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1">أقرب نقطة دالة <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="مثال: ثانوية ........."
                  value={custLandmark}
                  onChange={(e) => setCustLandmark(e.target.value)}
                  required
                  className="w-full border border-slate-200 p-3 rounded-2xl text-sm text-white placeholder:text-white/50"
                />
              </div>

              {/* موقع الخارطة */}
              <div className="space-y-3 pt-2">
                <CustomerLocationPicker
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
              <p className="text-[10px] text-[#FFF700] text-center font-bold animate-pulse mt-1">
                ⚠️ أكمل جميع الحقول المطلوبة
              </p>
            )}
            <button
              type="submit"
              disabled={!isSignupFormValid || isLoadingAuth}
              className={`welcome-btn-pulse w-full py-4 font-black rounded-2xl transition-all flex items-center justify-center gap-2 ${
                !isSignupFormValid && !isLoadingAuth
                  ? 'bg-gray-200 text-slate-400 cursor-not-allowed'
                  : isLoadingAuth
                    ? 'bg-vibrant-purple/70 text-white cursor-wait'
                    : 'bg-brand-horizontal text-white hover:opacity-95'
              }`}
            >
              {isLoadingAuth ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  <span>جارٍ إنشاء الحساب...</span>
                </>
              ) : (
                "إنشاء حساب الزبون"
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setView("login")}
                className="text-xs font-bold text-white"
              >
                الرجوع لتسجيل الدخول
              </button>
            </div>
          </form>
        )}

    </CustomerAuthPage>
  );
};
