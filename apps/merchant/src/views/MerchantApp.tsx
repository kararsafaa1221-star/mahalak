import React, { useState, useEffect, useRef, useMemo } from "react";
import { useApp } from "@shared/context/useApp";
import { validateUserStatus } from "@shared/utils/userValidation";
import { useNavigate } from 'react-router-dom';
import { Product, Order } from "@shared/types";
import { STORE_CATEGORIES } from "@shared/constants";
import { isStoreSubscriptionActive } from "@shared/utils/store";
import { buildMerchantRenewalWhatsAppMessage, resolveMerchantRenewalPageSettings } from "@shared/constants/merchantRenewalPlans";
import { StorageService } from "@shared/services/storageService";
import { authService } from "@shared/services/authService";
import { normalizeOtpCode } from "@shared/utils/phone";
import { showToast, showModal } from "@shared/utils/alerts";
import {
  getMerchantInventoryDotClass,
  getMerchantInventoryLabel,
  hasTrackedInventory,
} from "@shared/utils/productInventory";
import { showLocalNotification, requestNotificationPermission, setupPushNotifications } from "@shared/lib/pushNotifications";
import { formatSafeDate, formatSafeTimeString, formatSafeDateTimeString, getTimestampMillis } from "@shared/utils/date";
import { orderMatchesCustomerSearch } from "@shared/utils/customerId";
import {
  buildMerchantProductSharePayload,
  buildMerchantStoreSharePayload,
  buildPlatformShareAction,
  buildStoreShareUrl,
  tryNativeShare,
  type SharePlatform,
} from "@shared/utils/shareContent";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, AreaChart, Area } from "recharts";
import { useReactToPrint } from "react-to-print";
import { QRCodeSVG } from "qrcode.react";
import { MerchantOnboarding } from "@/components/MerchantOnboarding";
import { MerchantAuthPage } from "@/components/MerchantAuthPage";
import { MerchantTermsAgreement } from "@/components/MerchantTermsAgreement";
import { MerchantSubscriptionPlans } from "@/components/MerchantSubscriptionPlans";
import { MerchantDashboardTour } from "@/components/MerchantDashboardTour";
import { useMerchantAndroidBack } from "@/hooks/useMerchantAndroidBack";
import { DeleteAccountSection } from "@shared/components/DeleteAccountSection";
import { PrivacyPolicyModal } from "@shared/components/PrivacyPolicyModal";
import { AboutUsModal } from "@shared/components/AboutUsModal";
import { MahalakLogo, MahalakLogoIcon } from "@shared/components/MahalakLogo";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

/** WhatsApp دعم الاشتراك — 07735187868 */
const SUPPORT_WHATSAPP_NUMBER = "9647735187868";

function resolveSupportWhatsApp(adminWhatsapp?: string) {
  const digits = String(adminWhatsapp || "").replace(/\D/g, "");
  if (!digits || digits === "9647800000000") return SUPPORT_WHATSAPP_NUMBER;
  return digits;
}

import {
  Store as StoreIcon,
  Package,
  ClipboardList,
  Ticket,
  User,
  Users,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Share2,
  MessageCircle,
  Send,
  Camera,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  LogOut,
  Phone,
  BellRing,
  Shield,
  Gift,
  Truck,
  CheckCircle,
  RefreshCw,
  MapPin,
  Zap,
  Archive,
  Globe,
  FileText,
  Lock,
  Search,
  MoreVertical,
  Car,
  Sparkles,
  Printer,
  ShoppingBag,
  TrendingUp,
  Star,
  Wallet,
  Crown,
  Lightbulb,
  Award,
  Megaphone,
  QrCode,
  Activity,
  Copy,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Wallet as MerchantWallet } from "@/components/merchant/Wallet";
import { ImageUploader } from "@shared/components/ImageUploader";
import { BackgroundRemover } from "@/components/BackgroundRemover";
import { preloadBgRemovalModel } from "@shared/utils/backgroundRemoval";
import { LocationPicker } from "@shared/components/LocationPicker";
import { CopyButton } from "@shared/components/CopyButton";
import {
  StoreAudiencePanel,
  getStoreAudienceStats,
} from "../components/StoreAudiencePanel";
import { auth } from "@shared/lib/firebase";
import { Html5QrcodeScanner } from "html5-qrcode";
import QRCode from "react-qr-code";

const notificationSound = new Audio(
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
);

// ==========================================
// دالة لفتح الخرائط في الموبايل
// ==========================================
const openNativeMapApp = (lat: number, lng: number, appType: 'google' | 'waze' = 'google') => {
  if (!lat || !lng) {
    alert('عذراً، إحداثيات موقع الزبون غير متوفرة لهذا الطلب.');
    return;
  }

  if (appType === 'google') {
    const mapUrl = `geo:${lat},${lng}?q=${lat},${lng}(موقع الزبون)`;
    const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    
    try {
      window.location.href = mapUrl;
      setTimeout(() => {
        if (document.hasFocus()) {
          window.open(fallbackUrl, '_system');
        }
      }, 500);
    } catch (e) {
      window.open(fallbackUrl, '_system');
    }
  } else if (appType === 'waze') {
    const mapUrl = `waze://?ll=${lat},${lng}&navigate=yes`;
    const fallbackWazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

    try {
      window.location.href = mapUrl;
      setTimeout(() => {
        if (document.hasFocus()) {
          window.open(fallbackWazeUrl, '_system');
        }
      }, 500);
    } catch (e) {
      window.open(fallbackWazeUrl, '_system');
    }
  }
};

import { PushPermissionPrompt } from "@shared/components/PushPermissionPrompt";
import { shouldShowLocationPrompt, shouldShowNotificationPrompt } from "@shared/lib/permissions";

// ==========================================
// لوحة التاجر - منصة محلك
// ==========================================

export const MerchantApp: React.FC = () => {
  const navigate = useNavigate();
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const {
    currentMerchant,
    setCurrentMerchant,
    setCurrentCustomer,
    logoutSession,
    deleteUserAccountSecure,
    registerMerchant,
    checkPhoneAvailable,
    checkUsernameAvailable,
    verifyMerchantLogin,
    updateStoreProfile,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    updateOrder,
    promoCodes,
    createPromoCode,
    togglePromoCodeStatus,
    deletePromoCode,
    orders,
    updateOrderStatus,
    provinces,
    subscriptionPlans,
    stores,
    customers,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    flashSales,
    flashSaleRequests,
    requestJoinFlashSale,
    addNotification,
    adminSettings,
    updateCustomerProfile,
    getCustomerSeqId,
    getOrderSeqId,
    payoutRequests,
    requestPayout,
    refreshStoreAudience,
    sendCustomerGift,
  } = useApp();

  const merchantRenewalPageSettings = useMemo(
    () => resolveMerchantRenewalPageSettings(adminSettings),
    [adminSettings],
  );

  useEffect(() => {
    if (!currentMerchant) return;
    void (async () => {
      const needLocation = await shouldShowLocationPrompt();
      const needNotifications = await shouldShowNotificationPrompt();
      if (needLocation || needNotifications) {
        setShowPushPrompt(true);
      }
    })();
  }, [currentMerchant?.id]);

  const [isSyncing, setIsSyncing] = useState(false);
  const handleManualSync = async () => {
    setIsSyncing(true);
    // Locally data is already in state, but we can imagine a "Refresh" logic here if needed
    setTimeout(() => setIsSyncing(false), 1000);
  };

  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationBody, setNotificationBody] = useState("");
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  const handleSendNotificationToFollowers = async () => {
    if(!notificationTitle.trim() || !notificationBody.trim()) {
        showToast("يرجى إدخال عنوان ومحتوى الإشعار", "error");
        return;
    }
    
    // Check if subscription active
    const msDiff = (new Date(currentMerchant?.subscriptionExpiry || Date.now()).getTime()) - Date.now();
    const diffDays = Math.ceil(msDiff / (1000 * 3600 * 24));
    
    if (currentMerchant?.status !== "active" || diffDays <= 0) {
        showToast("عذراً، يجب أن يكون اشتراكك فعالاً لإرسال إشعارات جماعية للزبائن.", "error");
        return;
    }

    setIsSendingNotification(true);
    try {
        const followerIds = customers
          .filter((c) => c.followedStores?.includes(currentMerchant!.id) || c.storeNotifications?.includes(currentMerchant!.id))
          .map((c) => c.id);

        if (followerIds.length === 0) {
           showToast("لا يوجد لديك متابعين متاحين لإرسال الإشعار", "info");
           setIsSendingNotification(false);
           return;
        }

        // Send notifications
        for (const fId of followerIds) {
            await addNotification({
                userId: fId,
                role: "customer",
                title: `${currentMerchant!.shopName}: ${notificationTitle}`,
                message: notificationBody,
                type: "promo"
            });
        }
        showToast(`تم إرسال الإشعار لـ ${followerIds.length} متابع بنجاح!`, "success");
        setShowNotificationModal(false);
        setNotificationTitle("");
        setNotificationBody("");
    } catch (e: any) {
        showToast("فشل إرسال الإشعارات: " + e.message, "error");
    } finally {
        setIsSendingNotification(false);
    }
  };

  // فتح الروابط الخارجية مباشرة وبدون فتح نافذة جديدة في الموبايل أو كاباسيتور
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

    if (isAppInstallLink) {
      const isCapacitor = !!(window as any).Capacitor;
      if (isCapacitor) {
        window.open(url, '_system');
        return;
      }
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIframe = window.self !== window.top;
      
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

    // الروابط العادية تنفتح داخل التطبيق
    setIframeUrl(url);
  };

  const handleWhatsAppShare = (order: any) => {
    if (!order) return;
    const phoneNum = order.customerPhone || "";
    // Keep only numbers for clean country-code formatting
    let cleaned = phoneNum.replace(/[^0-9]/g, '');
    
    // If it starts with 07..., prepend Iraqi country code '964' and remove the leading 0
    if (cleaned.startsWith('0')) {
      cleaned = '964' + cleaned.substring(1);
    }
    
    // If it's pure 10 digits starting with 7... e.g. 7701234567, prepend '964'
    if (cleaned.length === 10 && cleaned.startsWith('7')) {
      cleaned = '964' + cleaned;
    }

    const shopName = currentMerchant?.shopName || "المتجر";
    const orderId = order.id || "";
    const customerName = order.customerName || "زبوننا الكريم";
    const totalAmount = (order.total || 0).toLocaleString();
    const address = order.customerAddress ? `${order.customerProvince || ''} - ${order.customerAddress}` : (order.customerProvince || '');

    // Choose the message based on order status as requested:
    // 1- Accepted/Preparing state: "تم قبول الطلب شكرا لاستخدامك تطبيق محلك"
    // 2- Shipped/With delivery driver: "طلبك مع مندوب التوصيل وشكرا لاستخدامك تطبيق محلك"
    // 3- Received/Delivered state: "تم توصيل طلبك شكرا لاستخدامك تطبيق محلك"
    
    let message: string;
    if (order.status === "pending" || order.status === "accepted") {
      message = `مرحباً ${customerName} 👋
معك ${shopName} 🏪

نود إعلامك بأنه تم قبول طلبك وجاري تجهيزه بكل حب وتفاصيل طلبك كالتالي:
📋 رقم الطلب: #${orderId}
💰 إجمالي الحساب: ${totalAmount} د.ع

تم قبول الطلب شكرا لاستخدامك تطبيق محلك ✨`;
    } else if (order.status === "shipped") {
      message = `مرحباً ${customerName} 👋
معك ${shopName} 🏪

نود إعلامك بأن طلبك الآن في الطريق إليك مع مندوب التوصيل 🚚:
📦 رقم الطلب: #${orderId}
📍 العنوان: ${address}
💰 إجمالي الحساب للتسليم: ${totalAmount} د.ع

طلبك مع مندوب التوصيل وشكرا لاستخدامك تطبيق محلك ✨`;
    } else if (order.status === "delivered") {
      message = `مرحباً ${customerName} 👋
معك ${shopName} 🏪

يسرنا إعلامك بأنه تم تسليم ووصول طلبك بنجاح 🎉:
📦 رقم الطلب: #${orderId}
💰 المبلغ المستلم: ${totalAmount} د.ع

تم توصيل طلبك شكرا لاستخدامك تطبيق محلك ✨
نتمنى لك تجربة تسوق رائعة دائماً! ❤️`;
    } else {
      message = `مرحباً ${customerName} 👋
معك ${shopName} 🏪

بخصوص طلبك رقم #${orderId} بقيمة ${totalAmount} د.ع.
شكراً لاستخدامك تطبيق محلك ✨`;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleaned}?text=${encodedMessage}`;
    openExternalUrl(whatsappUrl);
  };

  // ==========================================
  // الحالات (States)
  // ==========================================

  // واجهات التطبيق
  const [view, setView] = useState<
    "login" | "signup" | "otp" | "forgot" | "dashboard" | "onboarding" | "terms-agreement"
  >("login");
  const [isSavingTerms, setIsSavingTerms] = useState(false);
  // التحقق من حالة الاشتراك عند فتح التطبيق والتنبيه قبل الانتهاء
  useEffect(() => {
    if (!currentMerchant || !currentMerchant.subscriptionValidUntil) return;
    
    if (currentMerchant.subscriptionStatus === 'none') {
       return; // Hasn't subscribed yet
    }

    const expiryDate = new Date(currentMerchant.subscriptionValidUntil);
    const today = new Date();
    const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // إشعار في الأيام: 7, 3, 1
    if ([7, 3, 1].includes(diffDays) || diffDays <= 0) {
      const alreadyNotified = notifications.some(n => {
        if (n.userId !== currentMerchant.id || n.type !== 'subscription') return false;
        
        let notifDate = new Date();
        if (n.createdAt) {
          if (typeof (n.createdAt as any).toDate === 'function') {
            notifDate = (n.createdAt as any).toDate();
          } else if ((n.createdAt as any).seconds) {
            notifDate = new Date((n.createdAt as any).seconds * 1000);
          } else {
            notifDate = new Date(n.createdAt);
          }
        }
        
        return notifDate.toDateString() === today.toDateString();
      });
      
      const localKey = diffDays <= 0 ? `sub_notif_expired_${currentMerchant.id}_${today.toDateString()}` : `sub_notif_sent_${currentMerchant.id}_${diffDays}_days`;
      if (!alreadyNotified && !localStorage.getItem(localKey)) {
        localStorage.setItem(localKey, 'true');
        addNotification({
          userId: currentMerchant.id,
          role: 'merchant',
          title: diffDays <= 0 ? 'انتهى الاشتراك ⚠️' : 'تنبيه الاشتراك ⚠️',
          message: diffDays <= 0 ? 'لقد انتهت صلاحية اشتراكك! متجرك الآن مخفي عن الزبائن، بادر بتجديد الاشتراك للعودة لحركة المبيعات.' : `اشتراكك ينتهي خلال ${diffDays} يوم. يرجى التجديد لضمان استمرارية الخدمة وعدم تقييد المبيعات.`,
          type: 'subscription',
          actionLink: `https://wa.me/${resolveSupportWhatsApp(adminSettings?.whatsappNumber)}?text=${encodeURIComponent(buildMerchantRenewalWhatsAppMessage({
            shopName: currentMerchant.shopName,
            username: currentMerchant.username,
            phone: currentMerchant.phone,
          }, 'لم أحدد بعد'))}`,
          actionText: "تواصل مع الدعم الفني للاشتراك"
        });
      }
    }
  }, [currentMerchant, notifications, addNotification, adminSettings]);

  const [activeTab, setActiveTab ] = useState<
    | "home"
    | "reports"
    | "products"
    | "orders"
    | "delivery"
    | "promo"
    | "customers"
    | "profile"
    | "flashsales"
    | "marketing"
  >("home");

  const isSubscriptionActive = currentMerchant
    ? isStoreSubscriptionActive(currentMerchant)
    : false;

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const handleTabChange = (newTab: any) => {
    if (!isSubscriptionActive && newTab !== 'products') {
      setShowSubscriptionModal(true);
      return;
    }
    if (activeTab === "profile" && isProfileDirty) {
      setPendingTab(newTab);
      setShowUnsavedModal(true);
    } else {
      setActiveTab(newTab);
    }
  };

  useEffect(() => {
    if (currentMerchant) {
      if (!isSubscriptionActive && activeTab !== "products" && view === "dashboard") {
        setActiveTab("products");
        setShowSubscriptionModal(true);
      }
    }
  }, [currentMerchant, isSubscriptionActive, view]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  // States for expandable sections in profile tab
  const [expandedSections, setExpandedSections] = useState({
    wallet: false,
    personalInfo: false,
    customers: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => {
      const nextOpen = !prev[section];
      if (section === 'customers' && nextOpen) {
        void refreshStoreAudience();
      }
      return { ...prev, [section]: nextOpen };
    });
  };

  useEffect(() => {
    if (view !== "dashboard" || activeTab !== "customers" || !currentMerchant?.id) return;
    void refreshStoreAudience();
  }, [view, activeTab, currentMerchant?.id, refreshStoreAudience]);

  // ==========================================
  // نظام التزامن مع تاريخ المتصفح لدعم رجوع الأندرويد وإيماءات اليد (للتاجر)
  // ==========================================
  const isPopStateRef = React.useRef(false);
  const appNavDepthRef = React.useRef(1);

  const getMerchantHashUrl = (state: any) => {
    let sub = '';
    if (state.view === 'login') sub = '/login';
    else if (state.view === 'signup') sub = '/signup';
    else if (state.view === 'dashboard') {
      if (state.showNotifications) {
        sub = '/notifications';
      } else {
        sub = `/${state.activeTab}`;
      }
    }
    return `#/dashboard${sub}`;
  };

  const parseMerchantHashToState = (hash: string) => {
    const path = hash.replace('#/dashboard', '');
    const parts = path.split('/').filter(Boolean);
    
    const state: any = {
      view: 'dashboard',
      activeTab: 'home',
      showNotifications: false
    };

    if (parts[0] === 'login') {
      state.view = 'login';
    } else if (parts[0] === 'signup') {
      state.view = 'signup';
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
    if (!window.location.hash.startsWith('#/dashboard')) return;

    const initialState = parseMerchantHashToState(window.location.hash);
    isPopStateRef.current = true;
    setView(initialState.view);
    setActiveTab(initialState.activeTab);
    if (initialState.showNotifications) setShowNotifications(true);
    setTimeout(() => {
      isPopStateRef.current = false;
    }, 50);
  }, []);

  React.useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state || parseMerchantHashToState(window.location.hash);
      if (state && (state.isAppNavMerchant || window.location.hash.startsWith('#/dashboard'))) {
        isPopStateRef.current = true;
        appNavDepthRef.current = Math.max(1, appNavDepthRef.current - 1);

        if (state.view !== undefined && state.view !== view) {
          setView(state.view);
        }
        if (state.activeTab !== undefined && state.activeTab !== activeTab) {
          handleTabChange(state.activeTab);
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
  }, [view, activeTab]);

  React.useEffect(() => {
    if (isPopStateRef.current) return;

    const currentState = {
      isAppNavMerchant: true,
      view,
      activeTab,
      showNotifications
    };

    const hashUrl = getMerchantHashUrl(currentState);
    const historyState = window.history.state;
    if (historyState && historyState.isAppNavMerchant) {
      const isSame = 
        historyState.view === currentState.view &&
        historyState.activeTab === currentState.activeTab &&
        historyState.showNotifications === currentState.showNotifications;

      if (!isSame) {
        window.history.pushState(currentState, "", hashUrl);
        appNavDepthRef.current += 1;
      }
    } else {
      window.history.replaceState({ ...currentState, isInitialMerchant: true }, "", hashUrl);
      appNavDepthRef.current = 1;
    }
  }, [view, activeTab, showNotifications]);

  // نظام المشاركة المطور
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareConfig, setShareConfig] = useState<{
    type: "store" | "product";
    data: any;
  } | null>(null);
  const [shareText, setShareText] = useState("");

  // Marketing Tab States
  const [promoBannerData, setPromoBannerData] = useState({
    title: currentMerchant?.promoBanner?.title || "عرض خاص!",
    subtitle: currentMerchant?.promoBanner?.subtitle || "خصم 20% على جميع المنتجات لفترة محدودة",
    backgroundColor: currentMerchant?.promoBanner?.backgroundColor || "#7B3DFF",
    textColor: currentMerchant?.promoBanner?.textColor || "#ffffff",
    isActive: currentMerchant?.promoBanner?.isActive || false,
  });

  const handleUpdatePromoBanner = async (field: string, value: any) => {
    const newData = { ...promoBannerData, [field]: value };
    setPromoBannerData(newData);
    await updateStoreProfile({ promoBanner: newData });
  };

  const [marketingShareType, setMarketingShareType] = useState<"store" | "product">("store");
  const [marketingSelectedProductId, setMarketingSelectedProductId] = useState("");

   const openShareModal = async (type: "store" | "product", data: any) => {
    const payload =
      type === "store"
        ? buildMerchantStoreSharePayload(data)
        : buildMerchantProductSharePayload({
            ...data,
            storeId: data.storeId || currentMerchant?.id,
          });

    setShareText(payload.text);
    setShareConfig({ type, data });

    const nativeResult = await tryNativeShare(payload);
    if (nativeResult === "shared" || nativeResult === "cancelled") return;

    setShowShareModal(true);
  };

  const executeShare = (platform: SharePlatform) => {
    if (!shareConfig) return;

    const payload =
      shareConfig.type === "store"
        ? buildMerchantStoreSharePayload(shareConfig.data)
        : buildMerchantProductSharePayload({
            ...shareConfig.data,
            storeId: shareConfig.data.storeId || currentMerchant?.id,
          });

    const action = buildPlatformShareAction(platform, shareText, payload.url);
    if (action.kind === "copy") {
      navigator.clipboard.writeText(shareText);
      alert(action.message);
      return;
    }
    openExternalUrl(action.shareUrl);
  };

  const merchantNotifications = React.useMemo(
    () =>
      notifications
        .filter((n) => n.userId === currentMerchant?.id && n.role === "merchant")
        .sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt)),
    [notifications, currentMerchant?.id]
  );
  const unreadNotifsCount = merchantNotifications.filter((n) => !n.read).length;
  const [lastNotifCount, setLastNotifCount] = useState(unreadNotifsCount);

  useEffect(() => {
    if (unreadNotifsCount > lastNotifCount) {
      const latestNotif = merchantNotifications[0];
      if (latestNotif && !latestNotif.read) {
        if (view === "dashboard") {
          // alert or local handling
        }
        showLocalNotification(latestNotif.title, latestNotif.message, { type: latestNotif.type, targetId: latestNotif.targetId });
      }
    }
    setTimeout(() => setLastNotifCount(unreadNotifsCount), 0);
  }, [unreadNotifsCount, view, lastNotifCount, merchantNotifications]);

  // تسجيل الدخول
  const [loginPhone, setLoginPhone] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginMethod, setLoginMethod] = useState<'phone' | 'username'>('phone');
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // نسيت كلمة السر
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");

  // OTP
  const [otpCode, setOtpCode] = useState("");
  const [sentOtpCode, setSentOtpCode] = useState("");
  const [otpMode, setOtpMode] = useState<"signup" | "forgot">("signup");
  const [pendingData, setPendingData] = useState<any>(null);
  const [otpTimer, setOtpTimer] = useState(60);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [isAuthBusy, setIsAuthBusy] = useState(false);

  // إنشاء الحساب
  const [ownerName, setOwnerName] = useState("");
  const [shopName, setShopName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("بغداد");
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [showArea, setShowArea] = useState(true);
  const [showLandmark, setShowLandmark] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPhone, setShowPhone] = useState(true);
  const [categoryId, setCategoryId] = useState("clothing");
  const [logoUrl, setLogoUrl] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("renew_1m");

  const [isProfileDirty, setIsProfileDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingTab, setPendingTab] = useState<any>(null);

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showShippingLabelModal, setShowShippingLabelModal] = useState(false);
  const [selectedCustomProvince, setSelectedCustomProvince] = useState<string | null>(null);
  const [editingCustomPrice, setEditingCustomPrice] = useState<number>(5000);
  const [isCustomFree, setIsCustomFree] = useState<boolean>(false);

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    ownerName: "",
    shopName: "",
    username: "",
    category: "clothing",
    province: "",
    area: "",
    landmark: "",
    deliveryPrice: 5000,
    isFreeDelivery: false,
    localProvinceDeliveryPrice: 5000,
    otherProvincesDeliveryPrice: 8000,
    localProvinceFreeDelivery: false,
    otherProvincesFreeDelivery: false,
    provinceDeliveryPrices: {} as Record<string, number>,
    provinceFreeDelivery: {} as Record<string, boolean>,
    logo: "",
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
    showArea: true,
    showLandmark: true,
    showMap: true,
    showPhone: true,
    zainCashNumber: "",
    mastercardNumber: ""
  });

  const handleProfileFormChange = (updates: Partial<typeof profileForm>) => {
    setProfileForm((prev) => ({ ...prev, ...updates }));
    setIsProfileDirty(true);
  };

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [pwStep, setPwStep] = useState(1);
  const [otpPwCode, setOtpPwCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // المنتجات
  const [prodModal, setProdModal] = useState<{
    show: boolean;
    mode: "add" | "edit";
    product?: Product;
  }>({ show: false, mode: "add" });
  const [prodName, setProdName] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodPrice, setProdPrice] = useState(0);
  const [prodCostPrice, setProdCostPrice] = useState(0);
  const [prodDiscountType, setProdDiscountType] =
    useState<Product["discountType"]>("none");
  const [prodDiscountValue, setProdDiscountValue] = useState(0);
  const [prodImage, setProdImage] = useState("");
  const [showBgRemoverModal, setShowBgRemoverModal] = useState(false);
  const [prodIsFreeDelivery, setProdIsFreeDelivery] = useState(false);
  const [prodStatus, setProdStatus] = useState<Product["status"]>("published");
  const [productFilterStatus, setProductFilterStatus] =
    useState<Product["status"]>("published");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [prodSpecialOffer, setProdSpecialOffer] = useState("");
  const [prodTags, setProdTags] = useState<string[]>([]);
  const [prodBarcode, setProdBarcode] = useState("");
  const [prodInventory, setProdInventory] = useState<number | "">("");
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState<"inventory" | "search">("inventory");

  // States for sponsored delivery and media ads sliders
  const [deliveryAdIndex, setDeliveryAdIndex] = useState(0);
  const [mediaAdIndex, setMediaAdIndex] = useState(0);

  // Additional extra product info fields
  const [prodColor, setProdColor] = useState("");
  const [prodSize, setProdSize] = useState("");
  const [prodLength, setProdLength] = useState("");
  const [prodWidth, setProdWidth] = useState("");
  const [prodWeight, setProdWeight] = useState("");
  const [prodCondition, setProdCondition] = useState("");
  const [prodWarranty, setProdWarranty] = useState("");
  const [prodBrand, setProdBrand] = useState("");
  const [showExtraInfo, setShowExtraInfo] = useState(false);

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState<{
    price?: number;
    status?: Product["status"];
    inventory?: number;
  }>({});

  const [showQRMenu, setShowQRMenu] = useState(false);
  const [activeMenuProductId, setActiveMenuProductId] = useState<string | null>(null);

  // Click outside listener for product popup menu
  useEffect(() => {
    if (!activeMenuProductId) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".product-menu-container")) {
        setActiveMenuProductId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [activeMenuProductId]);

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id],
    );
  };

  const handleSelectAllProducts = (productsToShow: Product[]) => {
    if (selectedProductIds.length === productsToShow.length && productsToShow.length > 0) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(productsToShow.map((p) => p.id));
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedProductIds.length === 0) return;

    const count = selectedProductIds.length;
    try {
      for (const id of selectedProductIds) {
        await updateProduct(id, bulkUpdateData);
      }
      alert(`✅ تم تحديث ${count} منتج بنجاح!`);
      setSelectedProductIds([]);
      setShowBulkEditModal(false);
      setBulkUpdateData({});
    } catch {
      alert("❌ فشل التحديث الجماعي");
    }
  };

  const [orderFilter, setOrderFilter] = useState<
    "pending" | "accepted" | "shipped" | "delivered" | "returned" | "rejected"
  >("pending");
  // تتبع الطلب المحدد من الإشعارات للتاجر
  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);
  const [promoModal, setPromoModal] = useState(false);
  const [pCode, setPCode] = useState("");
  const [pDiscountType, setPDiscountType] = useState<"percent" | "amount">(
    "amount",
  );
  const [pDiscount, setPDiscount] = useState(0);
  const [pMaxUses, setPMaxUses] = useState(10);
  const [pMaxUsesPerUser, setPMaxUsesPerUser] = useState(1);
  const [pTargetAudience, setPTargetAudience] = useState<"ALL" | "FOLLOWERS" | "PAST_BUYERS" | "FOLLOWERS_AND_PAST_BUYERS">("ALL");
  const [pExpiryType, setPExpiryType] = useState<"days" | "date">("days");
  const [pStartDate, setPStartDate] = useState("");
  const [pEndDate, setPEndDate] = useState("");
  const [pExpiryDays, setPExpiryDays] = useState(30);
  const [actionModal, setActionModal] = useState<{
    show: boolean;
    orderId: string;
    type: "rejected" | "returned" | "replaced";
  }>({ show: false, orderId: "", type: "rejected" });
  const [customReason, setCustomReason] = useState("");
  const [giftModal, setGiftModal] = useState<{
    show: boolean;
    customerId: string;
    customerName: string;
  }>({ show: false, customerId: "", customerName: "" });
  const [giftType, setGiftType] = useState<"promo" | "product">("promo");
  const [giftAmount, setGiftAmount] = useState(1000);
  const [giftDiscountType, setGiftDiscountType] = useState<"amount" | "percent">("amount");
  const [giftExpiryDays, setGiftExpiryDays] = useState(30);
  const [giftProductId, setGiftProductId] = useState("");
  const [isSendingGift, setIsSendingGift] = useState(false);

  const invoiceRef = useRef<HTMLDivElement>(null);
  const shippingLabelRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `فاتورة_طلب_${selectedInvoice?.id || ""}`,
    suppressErrors: true,
    onPrintError: (errorLocation, error) => {
      alert("الطباعة غير مدعومة داخل وضع المعاينة. يرجى فتح التطبيق في علامة تبويب جديدة للطباعة.");
    }
  });

  const handlePrintShippingLabel = useReactToPrint({
    contentRef: shippingLabelRef,
    documentTitle: `بوليصة_شحن_${selectedInvoice?.id || ""}`,
    suppressErrors: true,
    onPrintError: (errorLocation, error) => {
      alert("الطباعة غير مدعومة داخل وضع المعاينة. يرجى فتح التطبيق في علامة تبويب جديدة للطباعة.");
    }
  });

  const handleShareWhatsAppInvoice = (order: Order) => {
    const itemsText = order.items
      .map((it) => `🔹 ${it.productName} (عدد ${it.quantity}) - ${it.price.toLocaleString()} د.ع`)
      .join("\n\n");

    const mapsLink = order.customerLat && order.customerLng 
      ? `\n📍 *الموقع على الخريطة:*\nhttps://www.google.com/maps/search/?api=1&query=${order.customerLat},${order.customerLng}\n\n`
      : `\n\n`;

    const text = `📦 *فاتورة شراء من تطبيق محلك*\n\n` +
      `*رقم الطلب:* #${order.id}\n` +
      `*الزبون:* ${order.customerName}\n\n` +
      `*التفاصيل:*\n\n${itemsText}\n\n` +
      `*المجموع الكلي:* ${order.total?.toLocaleString()} د.ع\n\n` +
      `*الموقع:* ${order.customerProvince} - ${order.customerAddress}` +
      mapsLink +
      `✅ *تم قبول الطلب سوف يصلك الطلب بأسرع وقت*\n` +
      `شكراً لتسوقكم معنا! 🌹`;
    
    const encodedText = encodeURIComponent(text);
    const phone = order.customerPhone.replace(/\s+/g, "").replace(/^0/, "964");
    openExternalUrl(`https://wa.me/${phone}?text=${encodedText}`);
  };

  const [replacementModal, setReplacementModal] = useState<{
    show: boolean;
    orderId: string;
    originalItems: any[];
  }>({ show: false, orderId: "", originalItems: [] });
  const [replacementSearch, setReplacementSearch] = useState("");
  const [replacementProduct, setReplacementProduct] = useState<Product | null>(null);
  const [replacementQuantity, setReplacementQuantity] = useState(1);
  const [returnConfirmModal, setReturnConfirmModal] = useState<{ show: boolean; orderId: string }>({ show: false, orderId: "" });
  const [skipReturnConfirm, setSkipReturnConfirm] = useState(() => StorageService.get("SKIP_RETURN_CONFIRM") || false);

  useMerchantAndroidBack({
    isPopStateRef,
    appNavDepthRef,
    getHashUrl: getMerchantHashUrl,
    getSnapshot: () => ({
      view,
      activeTab,
      showNotifications,
      iframeUrl,
      showShareModal,
      showSubscriptionModal,
      showUnsavedModal,
      showTermsModal,
      showInvoiceModal,
      showShippingLabelModal,
      showPasswordChange,
      showPrivacyPolicy,
      showAboutUs,
      showBgRemoverModal,
      showScanner,
      showBulkEditModal,
      showQRMenu,
      showNotificationModal,
      prodModalShow: prodModal.show,
      promoModal,
      actionModalShow: actionModal.show,
      giftModalShow: giftModal.show,
      replacementModalShow: replacementModal.show,
      returnConfirmModalShow: returnConfirmModal.show,
    }),
    actions: {
      setView,
      setActiveTab,
      setShowNotifications,
      setIframeUrl,
      setShowShareModal,
      setShowSubscriptionModal,
      setShowUnsavedModal,
      setPendingTab,
      setShowTermsModal,
      setShowInvoiceModal,
      setShowShippingLabelModal,
      setShowPasswordChange,
      setShowPrivacyPolicy,
      setShowAboutUs,
      setShowBgRemoverModal,
      setShowScanner,
      setShowBulkEditModal,
      setShowQRMenu,
      setShowNotificationModal,
      closeProdModal: () => setProdModal({ show: false, mode: 'add' }),
      setPromoModal,
      closeActionModal: () => setActionModal({ show: false, orderId: '', type: 'rejected' }),
      closeGiftModal: () => setGiftModal({ show: false, customerId: '', customerName: '' }),
      closeReplacementModal: () => setReplacementModal({ show: false, orderId: '', originalItems: [] }),
      closeReturnConfirmModal: () => setReturnConfirmModal({ show: false, orderId: '' }),
    },
  });

  const handleReturnOrder = (orderId: string) => {
    if (skipReturnConfirm) {
      updateOrderStatus(orderId, "returned", "إرجاع من قبل التاجر");
    } else {
      setReturnConfirmModal({ show: true, orderId });
    }
  };

  const handleConfirmReplacement = async () => {
    if (!replacementProduct || !replacementModal.orderId) return;

    const newItems = [
      {
        productId: replacementProduct.id,
        productName: `${replacementProduct.name} (استبدال)`,
        quantity: replacementQuantity,
        price: replacementProduct.finalPrice,
      },
    ];

    // Calculate new total
    const subtotal = replacementProduct.finalPrice * replacementQuantity;
    const order = orders.find(o => o.id === replacementModal.orderId);
    const deliveryPrice = order?.deliveryPrice || 0;
    const total = subtotal + deliveryPrice;

    await updateOrder(replacementModal.orderId, {
      items: newItems,
      subtotal,
      total,
      status: "accepted", // يعود للتجهيز
      returnReason: "استبدال بمنتج جديد",
    });

    setReplacementModal({ show: false, orderId: "", originalItems: [] });
    setReplacementProduct(null);
    setReplacementSearch("");
    alert("تم تحديث الطلب وإعادته للتجهيز كعملية استبدال ✅");
  };

  const [joinFlashSaleData, setJoinFlashSaleData] = useState<{
    flashSaleId: string;
  } | null>(null);
  const [joinProductId, setJoinProductId] = useState("");
  const [joinPromotionalPrice, setJoinPromotionalPrice] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    id: string;
    name: string;
  }>({ show: false, id: "", name: "" });

  const [blockConfirm, setBlockConfirm] = useState<{
    show: boolean;
    customerId: string;
    name: string;
    isBlocked: boolean;
  }>({ show: false, customerId: "", name: "", isBlocked: false });

  const [audienceSearchQuery, setAudienceSearchQuery] = useState("");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(null);

  const storeAudienceStats = useMemo(
    () =>
      currentMerchant
        ? getStoreAudienceStats(currentMerchant.id, customers, orders)
        : { followers: 0, notifications: 0, pastBuyers: 0, total: 0, orderedCustomerIds: [] as string[] },
    [currentMerchant?.id, customers, orders],
  );

  const openAudienceGift = (customerId: string, customerName: string) => {
    setGiftModal({ show: true, customerId, customerName });
  };

  // ==========================================
  // التحديث اللحظي للطلبات (Placeholder)
  // ==========================================
  useEffect(() => {
  }, [currentMerchant, view]);

  // Auto-slide for merchant sponsored ads
  useEffect(() => {
    const deliveryAds = adminSettings.merchantDeliveryAds || [];
    if (deliveryAds.length <= 1) return;
    const interval = setInterval(() => {
      setDeliveryAdIndex((prev) => (prev + 1) % deliveryAds.length);
    }, (adminSettings.adInterval || 5) * 1000);
    return () => clearInterval(interval);
  }, [adminSettings.merchantDeliveryAds, adminSettings.adInterval]);

  useEffect(() => {
    const mediaAds = adminSettings.merchantMediaAds || [];
    if (mediaAds.length <= 1) return;
    const interval = setInterval(() => {
      setMediaAdIndex((prev) => (prev + 1) % mediaAds.length);
    }, (adminSettings.adInterval || 5) * 1000);
    return () => clearInterval(interval);
  }, [adminSettings.merchantMediaAds, adminSettings.adInterval]);

  // ==========================================
  // التحقق والتطبيع (مطابق للزبون)
  // ==========================================

  const iraqiPhoneRegex = /^(0?(77|79|78|75)\d{8})$/;

  const normalizeIraqiPhone = (p: string) => {
    const d = p.replace(/\D/g, "");
    if (/^964(77|79|78|75)\d{8}$/.test(d)) return d;
    if (/^9640(77|79|78|75)\d{8}$/.test(d)) return `964${d.slice(4)}`;
    if (/^0(77|79|78|75)\d{8}$/.test(d)) return `964${d.slice(1)}`;
    if (/^(77|79|78|75)\d{8}$/.test(d)) return `964${d}`;
    return d;
  };

  const isPhoneValid = iraqiPhoneRegex.test(phone);
  const isLoginPhoneValid = iraqiPhoneRegex.test(loginPhone);
  const isUsernameValid = /^[a-zA-Z0-9_.]{3,20}$/.test(username);
  const isPasswordValid = password.length >= 8;
  const isFormValid =
    ownerName.trim() !== "" &&
    shopName.trim() !== "" &&
    isUsernameValid &&
    isPhoneValid &&
    isPasswordValid &&
    selectedProvince !== "" &&
    area.trim() !== "" &&
    landmark.trim() !== "" &&
    lat !== undefined &&
    lng !== undefined &&
    isTermsAccepted;

  // ==========================================
  // تحديث الجلسة
  // ==========================================

  useEffect(() => {
    if (currentMerchant && stores.length > 0) {
      const updatedStore = stores.find(s => s.id === currentMerchant.id);
      
      if (updatedStore) {
        const validation = validateUserStatus(updatedStore, 'merchant');
        if (!validation.valid) {
          setTimeout(() => {
             setCurrentMerchant(null);
             setView("login");
             setLoginError(validation.message);
          }, 0);
          return;
        }
      }

      setTimeout(() => {
        if (view !== "dashboard") setView("dashboard");
        setProfileForm({
          ownerName: currentMerchant.ownerName,
          shopName: currentMerchant.shopName,
          username: currentMerchant.username,
          category: currentMerchant.category || "clothing",
          province: currentMerchant.province,
          area: currentMerchant.area,
          landmark: currentMerchant.landmark,
          deliveryPrice: currentMerchant.deliveryPrice || 5000,
          isFreeDelivery: currentMerchant.isFreeDelivery || false,
          localProvinceDeliveryPrice: (currentMerchant as any).localProvinceDeliveryPrice !== undefined ? (currentMerchant as any).localProvinceDeliveryPrice : (currentMerchant.deliveryPrice || 5000),
          otherProvincesDeliveryPrice: (currentMerchant as any).otherProvincesDeliveryPrice !== undefined ? (currentMerchant as any).otherProvincesDeliveryPrice : 8000,
          localProvinceFreeDelivery: (currentMerchant as any).localProvinceFreeDelivery || false,
          otherProvincesFreeDelivery: (currentMerchant as any).otherProvincesFreeDelivery || false,
          provinceDeliveryPrices: (currentMerchant as any).provinceDeliveryPrices || {},
          provinceFreeDelivery: (currentMerchant as any).provinceFreeDelivery || {},
          logo: currentMerchant.logo || "",
          lat: currentMerchant.lat,
          lng: currentMerchant.lng,
          showArea: currentMerchant.showArea !== false,
          showLandmark: currentMerchant.showLandmark !== false,
          showMap: currentMerchant.showMap !== false,
          showPhone: currentMerchant.showPhone !== false,
          zainCashNumber: currentMerchant.payoutMethods?.zainCashNumber || "",
          mastercardNumber: currentMerchant.payoutMethods?.mastercardNumber || "",
        });
      }, 0);
    } else {
      setTimeout(() => {
        if (view !== "login" && view !== "signup" && view !== "otp" && view !== "forgot") {
          setView("login");
        }
      }, 0);
    }
  }, [currentMerchant, view, stores, setCurrentMerchant]);

  // ==========================================
  // دوال المصادقة (مطابقة لتطبيق الزبون)
  // ==========================================

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthBusy) return;

    if (loginMethod === 'phone') {
      if (!loginPhone.trim()) {
        setLoginError("يرجى إدخال رقم الهاتف");
        return;
      }
      if (!isLoginPhoneValid) {
        setLoginError(
          "رقم الهاتف غير صحيح. يبدأ بـ 077/078/079/075 ويتكون من 11 رقم",
        );
        return;
      }
    }

    if (loginMethod === 'username' && !loginUsername.trim()) {
      setLoginError("يرجى إدخال اسم المستخدم");
      return;
    }

    if (!loginPassword) {
      setLoginError("يرجى إدخال كلمة المرور");
      return;
    }

    if (loginPassword.length < 8) {
      setLoginError("كلمة المرور يجب أن لا تقل عن 8 حروف أو رموز");
      return;
    }

    setIsAuthBusy(true);
    setLoginError("");
    try {
    const loginResult = await verifyMerchantLogin(
      loginMethod === 'phone'
        ? { phone: loginPhone, password: loginPassword }
        : { username: loginUsername.trim(), password: loginPassword },
    );

    if (!loginResult.success || !loginResult.store) {
      if (loginResult.error === 'wrong_password') {
        setLoginError("كلمة المرور غير صحيحة.");
      } else if (loginResult.error === 'rate_limited') {
        setLoginError("محاولات كثيرة. انتظر قليلاً ثم حاول مجدداً.");
      } else if (loginResult.error === 'service_unavailable' || loginResult.error === 'network' || loginResult.error === 'auth_required') {
        setLoginError("تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.");
      } else {
        setLoginError(loginMethod === 'phone' ? "الرقم غير مسجل. أنشئ حساباً جديداً." : "اسم المستخدم غير موجود.");
      }
      return;
    }

    // verifyMerchantLogin already binds ownerId + Storage claims server-side
    await auth.currentUser?.getIdToken(true);
    const found = {
      ...loginResult.store,
      ownerId: auth.currentUser?.uid ?? loginResult.store.ownerId,
    };
    const validation = validateUserStatus(found, 'merchant');
    if (!validation.valid) {
      setLoginError(validation.message);
      return;
    }

    setCurrentMerchant(found);
    setShowPushPrompt(true);
    if (!found.terms_accepted) {
      setView("terms-agreement");
    } else if (!found.contractAgreedAt) {
      setView("onboarding");
    } else {
      setView("dashboard");
    }
    setLoginError("");
    } catch {
      setLoginError("تعذر التحقق من الحساب. حاول مرة أخرى.");
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthBusy) return;
    setLoginError('');
    if (!isFormValid) {
      showToast('warning', 'حقول ناقصة', 'يرجى إكمال جميع الحقول المطلوبة.');
      return;
    }
    const normalized = normalizeIraqiPhone(phone);

    setIsAuthBusy(true);
    try {
    const phoneCheck = await checkPhoneAvailable(normalized);
    if (!phoneCheck.available) {
      let message = "رقم الهاتف مسجل مسبقاً كتاجر! لا يمكن إنشاء حساب جديد بنفس الرقم.";
      if (phoneCheck.blocked || phoneCheck.entityType === 'blocked') {
        message = "هذا الرقم محظور من قبل إدارة النظام. تواصل مع الدعم لرفع الحظر.";
      } else if (phoneCheck.entityType === 'customer') {
        message = "رقم الهاتف مسجل مسبقاً كزبون! لا يمكن استخدامه لإنشاء حساب تاجر.";
      }
      setLoginError(message);
      showModal("error", "تعذر التسجيل", message);
      return;
    }

    const usernameCheck = await checkUsernameAvailable(username);
    if (!usernameCheck.available) {
      const message = "اسم المستخدم مسجل مسبقاً من متجر آخر!";
      setLoginError(message);
      showModal("error", "تعذر التسجيل", message);
      return;
    }

    setPendingData({
      ownerName,
      shopName,
      category: categoryId,
      username,
      phone: normalized,
      password,
      province: selectedProvince,
      area,
      landmark,
      lat,
      lng,
      showArea,
      showLandmark,
      showMap,
      showPhone,
      logo:
        logoUrl ||
        "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=200&auto=format&fit=crop&q=60",
      subscriptionId: selectedPlan,
      deliveryPrice: 5000,
      isFreeDelivery: false,
      terms_accepted: true,
      signed_at: new Date().toISOString()
    });
    setOtpMode("signup");
    setOtpCode("");
    setOtpTimer(60);
    setCanResendOtp(false);

      const ok = await authService.requestOTP(normalized, "signup");
      if (ok) {
        setView("otp");
        showToast("success", "تم إرسال الرمز", "تحقق من رقمك على واتساب");
      } else {
        showModal("error", "فشل الإرسال", "يرجى المحاولة لاحقاً");
      }
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.includes("واتساب") || msg.includes("استغرق")) {
        setView("otp");
        showToast("warning", "تحقق من واتساب", msg);
      } else {
        showModal("error", "خطأ في الاتصال", msg || "فشل الإرسال. تأكد من الإنترنت.");
      }
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPhone.trim()) {
      setLoginError("يرجى إدخال رقم الهاتف");
      return;
    }
    if (!forgotNewPassword) {
      setLoginError("يرجى إدخال كلمة المرور الجديدة");
      return;
    }
    if (!iraqiPhoneRegex.test(forgotPhone)) {
      setLoginError('اكتب الرقم المحلي 10 أو 11 رقم، ويبدأ بـ 77 أو 78 أو 79 أو 75، مع أو بدون صفر البداية');
      return;
    }
    if (forgotNewPassword.length < 8) {
      setLoginError("كلمة المرور الجديدة يجب أن لا تقل عن 8 حروف");
      return;
    }
    const normalized = normalizeIraqiPhone(forgotPhone);
    const found = stores.find(
      (s) => normalizeIraqiPhone(s.phone) === normalized,
    );
    if (!found) {
      setLoginError("الرقم غير مسجل");
      return;
    }
    setOtpMode("forgot");
    setOtpCode("");
    setOtpTimer(60);
    setCanResendOtp(false);
    try {
      const ok = await authService.requestOTP(normalized, "forgot");
      if (ok) {
        setView("otp");
        showToast("success", "تم إرسال الرمز", "تحقق من رقمك على الواتساب");
      } else {
        showModal("error", "فشل الإرسال", "يرجى المحاولة لاحقاً");
      }
    } catch (err: any) {
      showModal("error", "خطأ في الاتصال", err.message || "فشل الإرسال. تأكد من الإنترنت.");
    }
  };

  const handleOtpConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthBusy) return;

    if (!otpCode || otpCode.length < 6) {
      showToast("warning", "رمز ناقص", "يرجى إدخال رمز التحقق بالكامل.");
      return;
    }

    setIsAuthBusy(true);
    try {
      const phoneToVerify = otpMode === "signup" ? (pendingData?.phone || phone) : forgotPhone;
      const normalizedPhone = normalizeIraqiPhone(phoneToVerify);
      
      const isValid = await authService.verifyOTP(normalizedPhone, otpCode);
      if (!isValid) {
        const message = "تأكد من الرمز المرسل إلى رقم هاتفك.";
        setLoginError(`رمز OTP غير صحيح. ${message}`);
        showModal("error", "الرمز غير صحيح", message);
        return;
      }

      if (otpMode === "signup" && pendingData) {
        const res = await registerMerchant(pendingData);
        if (res?.success) {
          showModal("success", "تم إنشاء متجرك مبدئياً! أكمل الخطوات لإنهائه 🎉");
          setView("onboarding");
          setShowPushPrompt(true);
        } else {
          showModal("error", "خطأ", res?.message || 'تعذر إنشاء المتجر');
          setView("signup");
        }
      } else if (otpMode === "forgot") {
        const normalized = normalizeIraqiPhone(forgotPhone);
        const found = stores.find(
          (s) => normalizeIraqiPhone(s.phone) === normalized,
        );
        if (found) {
          updateStoreProfile({ ...found, password: forgotNewPassword });
          setCurrentMerchant({ ...found, password: forgotNewPassword } as any);
          setView("dashboard");
          setShowPushPrompt(true);
          setTimeout(() => showToast("success", "تم تغيير كلمة المرور بنجاح!"), 400);
        }
      }
    } catch (error: any) {
      showModal("error", "خطأ في التحقق", error.message || "الرمز غير صحيح!");
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResendOtp) return;
    
    setOtpTimer(60);
    setCanResendOtp(false);
    setOtpCode("");

    const targetPhone = otpMode === "signup" ? (pendingData?.phone || phone) : forgotPhone;
    const normalized = normalizeIraqiPhone(targetPhone);
    
    try {
      const ok = await authService.requestOTP(normalized, otpMode);
      if (ok) {
        showToast("success", "تم إعادة إرسال رمز OTP بنجاح!");
      } else {
        showToast("error", "فشل الإرسال. يرجى المحاولة لاحقاً");
      }
    } catch (err: any) {
      showModal("error", "خطأ في الاتصال", err.message);
    }
  };

  useEffect(() => {
    let interval: any;
    if (view === "otp" && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      Promise.resolve().then(() => setCanResendOtp(true));
    }
    return () => clearInterval(interval);
  }, [view, otpTimer]);

  // تغيير كلمة المرور بعد تأكيد OTP
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwStep === 1) {
      if (!currentMerchant) return;
      try {
        const ok = await authService.requestOTP(currentMerchant.phone, "forgot");
        if (ok) {
          setPwStep(2);
          showToast("success", "تم إرسال رمز OTP", "تم الإرسال لتغيير كلمة المرور إلى واتساب!");
        } else {
          showToast("error", "فشل إرسال الرمز", "حاول مرة أخرى.");
        }
      } catch (err: any) {
        showToast("error", "خطأ", err.message || "حاول مرة أخرى.");
      }
    } else {
      if (!otpPwCode || otpPwCode.length < 6) {
        showToast("warning", "رمز ناقص", "يرجى إدخال الرمز كاملاً");
        return;
      }
      try {
        if (!currentMerchant) return;
        const isValid = await authService.verifyOTP(currentMerchant.phone, otpPwCode);
        if (!isValid) {
          showModal("error", "رمز OTP غير صحيح!");
          return;
        }
      } catch (error: any) {
        showModal("error", "خطأ في التحقق", error.message || "الرمز غير صحيح!");
        return;
      }
      if (newPassword.length < 8) {
        alert("كلمة المرور الجديدة يجب أن لا تقل عن 8 رموز");
        return;
      }
      await updateStoreProfile({ password: newPassword });
      setCurrentMerchant({ ...(currentMerchant as any), password: newPassword });
      setShowPasswordChange(false);
      setPwStep(1);
      setOtpPwCode("");
      setNewPassword("");
      setTimeout(() => alert("تم تغيير كلمة المرور بنجاح! ✅"), 100);
    }
  };

  const [reportDateRange, setReportDateRange] = useState<"7_days" | "30_days" | "this_month" | "custom">("7_days");
  const [reportCustomStartDate, setReportCustomStartDate] = useState("");
  const [reportCustomEndDate, setReportCustomEndDate] = useState("");
  const [isDeliverySaving, setIsDeliverySaving] = useState(false);

  const handleSaveDeliverySettings = async () => {
    setIsDeliverySaving(true);
    try {
      await updateStoreProfile({
        deliveryPrice: profileForm.deliveryPrice,
        isFreeDelivery: profileForm.isFreeDelivery,
        localProvinceDeliveryPrice: profileForm.localProvinceDeliveryPrice,
        otherProvincesDeliveryPrice: profileForm.otherProvincesDeliveryPrice,
        localProvinceFreeDelivery: profileForm.localProvinceFreeDelivery,
        otherProvincesFreeDelivery: profileForm.otherProvincesFreeDelivery,
        provinceDeliveryPrices: profileForm.provinceDeliveryPrices,
        provinceFreeDelivery: profileForm.provinceFreeDelivery,
      });
      setIsProfileDirty(false);
      alert("تم حفظ إعدادات التوصيل بنجاح! 🚚✨");
    } catch (e: any) {
      alert(e.message || "حدث خطأ أثناء حفظ التعديلات.");
    } finally {
      setIsDeliverySaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (profileForm.lat === undefined || profileForm.lng === undefined) {
      alert("يرجى تحديد موقعك على الخريطة أولاً 📍");
      return;
    }
    try {
      const dbPayload = {
         ...profileForm,
         payoutMethods: {
           zainCashNumber: profileForm.zainCashNumber,
           mastercardNumber: profileForm.mastercardNumber,
         }
      };
      await updateStoreProfile(dbPayload);
      setIsProfileDirty(false);
      alert("تم حفظ التعديلات ✅");
    } catch (e: any) {
      alert(e.message || "حدث خطأ أثناء حفظ التعديلات.");
    }
  };

  const handleLogout = async () => {
    await logoutSession();
    setView("login");
    setIsProfileDirty(false);
    navigate('/', { replace: true });
  };

  // Available Tags based on Merchant Category
  const availableTags =
    STORE_CATEGORIES.find((c) => c.id === currentMerchant?.category)?.sub || [];

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false,
      );

      scanner.render(
        (decodedText) => {
          scanner.clear();
          setShowScanner(false);
          
          if (scannerMode === "search") {
            setProductSearchQuery(decodedText);
            return;
          }

          // Find if product exists in merchantProducts
          const merchProducts = products.filter(
            (p) => p.storeId === currentMerchant?.id,
          );
          const existingProd = merchProducts.find(
            (p) => p.barcode === decodedText,
          );
          if (existingProd) {
            // Open edit modal
            setProdModal({ show: true, mode: "edit", product: existingProd });
            setProdName(existingProd.name);
            setProdDesc(existingProd.description || "");
            setProdPrice(existingProd.price);
            setProdCostPrice(existingProd.costPrice || 0);
            setProdDiscountType(existingProd.discountType);
            setProdDiscountValue(existingProd.discountValue);
            setProdImage(existingProd.image);
            setProdIsFreeDelivery(existingProd.isFreeDelivery);
            setProdStatus(existingProd.status);
            setProdSpecialOffer(existingProd.specialOffer || "");
            setProdTags(existingProd.tags || []);
            setProdBarcode(existingProd.barcode || "");
            setProdInventory(existingProd.inventory !== undefined && existingProd.inventory !== null ? existingProd.inventory : "");
            setProdColor(existingProd.color || "");
            setProdSize(existingProd.size || "");
            setProdLength(existingProd.length || "");
            setProdWidth(existingProd.width || "");
            setProdWeight(existingProd.weight || "");
            setProdCondition(existingProd.condition || "");
            setProdWarranty(existingProd.warranty || "");
            setProdBrand(existingProd.brand || "");
            setShowExtraInfo(!!(existingProd.color || existingProd.size || existingProd.length || existingProd.width || existingProd.weight || existingProd.condition || existingProd.warranty || existingProd.brand));
          } else {
            // Not in my store, but is it in the global system?
            const globalMatch = products.find((p) => p.barcode === decodedText);
            setProdModal({ show: true, mode: "add" });
            if (globalMatch) {
              alert(
                "تم العثور على المنتج في النظام! تم تعبئة البيانات تلقائياً. 📦",
              );
              setProdName(globalMatch.name);
              setProdDesc(globalMatch.description || "");
              setProdPrice(globalMatch.price);
              setProdCostPrice(0); // Do not copy other merchant's cost price!
              setProdDiscountType("none");
              setProdDiscountValue(0);
              setProdImage(globalMatch.image);
              setProdIsFreeDelivery(false);
              setProdStatus("published");
              setProdSpecialOffer("");
              setProdTags(globalMatch.tags || []);
              setProdInventory("");
              setProdColor("");
              setProdSize("");
              setProdLength("");
              setProdWidth("");
              setProdWeight("");
              setProdCondition("");
              setProdWarranty("");
              setProdBrand("");
              setShowExtraInfo(false);
            } else {
              setProdName("");
              setProdDesc("");
              setProdPrice(0);
              setProdCostPrice(0);
              setProdDiscountType("none");
              setProdDiscountValue(0);
              setProdImage("");
              setProdIsFreeDelivery(false);
              setProdStatus("published");
              setProdSpecialOffer("");
              setProdTags([]);
              setProdInventory("");
              setProdColor("");
              setProdSize("");
              setProdLength("");
              setProdWidth("");
              setProdWeight("");
              setProdCondition("");
              setProdWarranty("");
              setProdBrand("");
              setShowExtraInfo(false);
            }
            setProdBarcode(decodedText);
          }
        },
        () => {
          // Handle scan error quietly
        },
      );

      return () => {
      };
    }
  }, [showScanner, products, currentMerchant, scannerMode]);

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      storeId: currentMerchant!.id,
      name: prodName,
      description: prodDesc,
      price: prodPrice,
      image:
        prodImage ||
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
      discountType: prodDiscountType,
      discountValue: prodDiscountValue,
      isFreeDelivery: prodIsFreeDelivery,
      status: prodStatus,
      specialOffer: prodSpecialOffer,
      tags: prodTags,
      barcode: prodBarcode,
    };

    if (prodCostPrice !== undefined && prodCostPrice !== null) {
      data.costPrice = prodCostPrice;
    }

    if (prodInventory !== "" && prodInventory !== undefined && prodInventory !== null) {
      data.inventory = Number(prodInventory);
    } else if (prodModal.mode === "edit") {
      data.inventory = null;
    }

    // Save extra fields only if not empty (to save space in database)
    if (prodColor && prodColor.trim() !== "") data.color = prodColor.trim();
    if (prodSize && prodSize.trim() !== "") data.size = prodSize.trim();
    if (prodLength && prodLength.trim() !== "") data.length = prodLength.trim();
    if (prodWidth && prodWidth.trim() !== "") data.width = prodWidth.trim();
    if (prodWeight && prodWeight.trim() !== "") data.weight = prodWeight.trim();
    if (prodCondition && prodCondition.trim() !== "") data.condition = prodCondition.trim();
    if (prodWarranty && prodWarranty.trim() !== "") data.warranty = prodWarranty.trim();
    if (prodBrand && prodBrand.trim() !== "") data.brand = prodBrand.trim();

    // Clear saved fields in firestore if empty in Edit mode
    if (prodModal.mode === "edit") {
      if (!prodColor || prodColor.trim() === "") data.color = null;
      if (!prodSize || prodSize.trim() === "") data.size = null;
      if (!prodLength || prodLength.trim() === "") data.length = null;
      if (!prodWidth || prodWidth.trim() === "") data.width = null;
      if (!prodWeight || prodWeight.trim() === "") data.weight = null;
      if (!prodCondition || prodCondition.trim() === "") data.condition = null;
      if (!prodWarranty || prodWarranty.trim() === "") data.warranty = null;
      if (!prodBrand || prodBrand.trim() === "") data.brand = null;
    }

    if (prodModal.mode === "edit" && prodModal.product) {
      updateProduct(prodModal.product.id, data);
    } else {
      addProduct(data);
    }
    setProdModal({ show: false, mode: "add" });
    setProdName("");
    setProdDesc("");
    setProdPrice(0);
    setProdCostPrice(0);
    setProdDiscountType("none");
    setProdDiscountValue(0);
    setProdImage("");
    setProdIsFreeDelivery(false);
    setProdStatus("published");
    setProdSpecialOffer("");
    setProdBarcode("");
    setProdInventory("");
    setProdColor("");
    setProdSize("");
    setProdLength("");
    setProdWidth("");
    setProdWeight("");
    setProdCondition("");
    setProdWarranty("");
    setProdBrand("");
    setShowExtraInfo(false);
  };

  const handleDeleteProduct = (id: string, name: string) => {
    setDeleteConfirm({ show: true, id, name });
  };

  const executeDeleteProduct = () => {
    if (deleteConfirm.id) {
      deleteProduct(deleteConfirm.id, "permanent");
      setDeleteConfirm({ show: false, id: "", name: "" });
    }
  };

  const handleArchiveProduct = async (id: string) => {
    try {
      await updateProduct(id, { status: "archived" });
      alert("✅ تم نقل المنتج إلى الأرشيف بنجاح!");
    } catch (e) {
      alert("❌ فشل نقل المنتج إلى الأرشيف");
    }
  };

  const handlePublishProduct = async (id: string) => {
    try {
      await updateProduct(id, { status: "published" });
      alert("✅ تم نشر المنتج على المتجر بنجاح!");
    } catch (e) {
      alert("❌ فشل نشر المنتج");
    }
  };

  const handleDraftProduct = async (id: string) => {
    try {
      await updateProduct(id, { status: "draft" });
      alert("✅ تم نقل المنتج إلى المسودة بنجاح!");
    } catch (e) {
      alert("❌ فشل نقل المنتج إلى المسودة");
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pCode.trim()) return;

    let finalEndDate: string | null = pEndDate || null;
    if (pExpiryType === "days") {
      if (pExpiryDays === 0) {
        finalEndDate = null;
      } else {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + pExpiryDays);
        finalEndDate = expDate.toISOString().split("T")[0];
      }
    }

    const finalStartDate = pStartDate || new Date().toISOString().split("T")[0];

    const data = {
      storeId: currentMerchant!.id,
      merchantId: currentMerchant!.id,
      code: pCode.toUpperCase().trim(),
      discountType: pDiscountType === 'amount' ? 'FIXED' : 'PERCENTAGE',
      discountValue: pDiscount,
      ...(pDiscountType === 'amount' ? { discountAmount: pDiscount } : {}),
      maxGlobalUses: pMaxUses,
      currentGlobalUses: 0,
      maxUses: pMaxUses, // legacy
      maxUsesPerUser: pMaxUsesPerUser,
      targetAudience: pTargetAudience,
      targetStores: [currentMerchant!.id],
      validityDays: pExpiryType === "days" ? pExpiryDays : 0,
      startDate: finalStartDate,
      expiresAt: finalEndDate || null,
      expirationDate: finalEndDate || null, // legacy
      source: "merchant",
      sponsor: "MERCHANT",
    };

    try {
      await createPromoCode(data);
      setPromoModal(false);
      setPCode("");
      setPDiscountType("amount");
      setPDiscount(0);
      setPMaxUses(10);
      setPMaxUsesPerUser(1);
      setPTargetAudience("ALL");
      setPExpiryType("days");
      setPStartDate("");
      setPEndDate("");
      setPExpiryDays(30);
    } catch (err) {
    }
  };

  const handleSendGift = async (e: React.FormEvent) => {
    e.preventDefault();
    const audId = giftModal.customerId;
    if (!audId || isSendingGift) return;

    setIsSendingGift(true);
    try {
      if (giftType === "promo") {
        const result = await sendCustomerGift({
          customerId: audId,
          giftType: "promo",
          discountType: giftDiscountType,
          discountValue: giftAmount,
          expiryDays: giftExpiryDays,
        });
        const code = result.promoCode ?? "";
        alert(`تم إرسال كود الخصم الهدية #${code} بنجاح إلى ${giftModal.customerName}! 🎉`);
      } else {
        if (!giftProductId) {
          alert("الرجاء اختيار منتج صحيح");
          return;
        }
        const result = await sendCustomerGift({
          customerId: audId,
          giftType: "product",
          productId: giftProductId,
        });
        const productName = result.productName ?? products.find((p) => p.id === giftProductId)?.name ?? "المنتج";
        alert(`تم إرسال هدية المنتج (${productName}) بنجاح إلى ${giftModal.customerName}! 🎉`);
      }

      setGiftModal({ show: false, customerId: "", customerName: "" });
      setGiftType("promo");
      setGiftAmount(1000);
      setGiftDiscountType("amount");
      setGiftExpiryDays(30);
      setGiftProductId("");
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "functions/permission-denied") {
        alert("لا تملك صلاحية إرسال هدية من هذا المتجر. أعد تسجيل الدخول وحاول مجدداً.");
      } else if (code === "functions/not-found") {
        alert("تعذر العثور على الزبون أو المنتج. حدّث القائمة وحاول مرة أخرى.");
      } else if (code === "functions/unauthenticated") {
        alert("انتهت الجلسة. سجّل الدخول مرة أخرى ثم أعد المحاولة.");
      } else {
        alert("حدث خطأ أثناء إرسال الهدية. يرجى المحاولة لاحقاً.");
      }
      console.warn("[handleSendGift]", err);
    } finally {
      setIsSendingGift(false);
    }
  };

  // Push Notifications Setup for Merchant
  useEffect(() => {
    if (view === "dashboard" && currentMerchant) {
      setupPushNotifications(
        currentMerchant.id,
        'stores',
        (notification) => {
          // Foreground
          showLocalNotification(notification.title || "إشعار جديد", notification.body || "لديك تحديث جديد في المتجر", { type: 'new_order' });
        },
        (action) => {
          // Background Click
          const data = action.notification.data;
          if (data?.type === 'new_order') {
            handleTabChange('orders');
          } else if (data?.type === 'ratings') {
            handleTabChange('home');
          }
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentMerchant?.id]);

  // ==========================================
  // لوحة التحكم (Dashboard)
  // ==========================================

  const pushPermissionModal = showPushPrompt ? (
    <PushPermissionPrompt
      userType="merchant"
      onComplete={() => setShowPushPrompt(false)}
      onLocationGranted={async (coords) => {
        if (!currentMerchant) return;
        try {
          await updateStoreProfile({ lat: coords.lat, lng: coords.lng });
          setCurrentMerchant({ ...currentMerchant, lat: coords.lat, lng: coords.lng });
        } catch {
          // Location permission succeeded; profile update can retry later.
        }
      }}
    />
  ) : null;

  if (view === "terms-agreement" && currentMerchant) {
    return (
      <>
        {pushPermissionModal}
      <MerchantTermsAgreement
        currentMerchant={currentMerchant}
        isSaving={isSavingTerms}
        onAccept={async () => {
          setIsSavingTerms(true);
          try {
            const signedAt = new Date().toISOString();
            await updateStoreProfile({
              ...currentMerchant,
              terms_accepted: true,
              signed_at: signedAt,
            });
            const updatedMerchant = {
              ...currentMerchant,
              terms_accepted: true,
              signed_at: signedAt,
            };
            setCurrentMerchant(updatedMerchant);
            if (!updatedMerchant.contractAgreedAt) {
              setView("onboarding");
            } else {
              setView("dashboard");
            }
          } catch {
            showModal("error", "خطأ", "تعذر حفظ موافقتك. يرجى المحاولة مرة أخرى.");
          } finally {
            setIsSavingTerms(false);
          }
        }}
      />
      </>
    );
  }

  if (view === "onboarding" && currentMerchant) {
    return (
      <>
        {pushPermissionModal}
      <MerchantOnboarding 
        currentMerchant={currentMerchant}
        onComplete={async (data) => {
          await updateStoreProfile(data);
          setView("dashboard");
        }}
      />
      </>
    );
  }

  if (view === "dashboard" && currentMerchant) {
    const merchantProducts = products.filter(
      (p) => p.storeId === currentMerchant.id,
    );
    const merchantOrders = orders.filter(
      (o) => o.storeId === currentMerchant.id,
    );
    const lowStockProducts = merchantProducts.filter(
      (p) => p.status === 'published' && hasTrackedInventory(p.inventory) && (p.inventory as number) < 3 && (p.inventory as number) > 0
    );
    const outOfStockProducts = merchantProducts.filter(
      (p) => p.status === 'published' && hasTrackedInventory(p.inventory) && p.inventory === 0
    );
    const pendingOrders = merchantOrders.filter((o) => o.status === "pending");
    const merchantPromos = promoCodes.filter(
      (p) => p.storeId === currentMerchant.id,
    );

    // Calculate top selling products this month
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const productSalesMap: Record<string, {name: string, sold: number}> = {};
    
    merchantOrders.forEach(o => {
      if (o.status !== 'rejected' && o.status !== 'returned') {
        const orderDate = new Date(o.createdAt);
        if (orderDate.getMonth() === thisMonth && orderDate.getFullYear() === thisYear) {
          o.items.forEach(item => {
            const pId = item.product?.id || item.id;
            const pName = item.product?.name || item.name;
            if (pId) {
              if (!productSalesMap[pId]) {
                productSalesMap[pId] = { name: pName || 'غير معروف', sold: 0 };
              }
              productSalesMap[pId].sold += (item.quantity || 1);
            }
          });
        }
      }
    });

    const topSellingProductsThisMonth = Object.values(productSalesMap)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5); // top 5

    return (
      <div className="min-h-screen bg-mahalak-gradient flex">
        <MerchantDashboardTour
          merchant={currentMerchant}
          onTourComplete={async () => {
            const completedAt = new Date().toISOString();
            await updateStoreProfile({ dashboardTourCompletedAt: completedAt });
            setCurrentMerchant({
              ...currentMerchant,
              dashboardTourCompletedAt: completedAt,
            });
          }}
        />
        {pushPermissionModal}
        {/* Sidebar Desktop */}
        <aside className="hidden md:flex w-64 bg-gradient-to-b from-vibrant-purple to-deep-navy text-white flex-col fixed right-0 top-0 h-screen z-30 shadow-2xl transition-all">
          <div className="p-6 border-b border-vibrant-purple flex items-center space-x-3 space-x-reverse">
            <MahalakLogo className="h-8 w-8 shrink-0 object-contain" />
            <div>
              <span className="text-lg font-black block">
                {currentMerchant.shopName}
              </span>
              <span className="text-[10px] text-slate-400">
                @{currentMerchant.username}
              </span>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {[
              { id: "home", icon: MahalakLogoIcon, label: "الرئيسية" },
              { id: "products", icon: Package, label: "المنتجات" },
              { id: "marketing", icon: Megaphone, label: "التسويق" },
              /*{ id: "reels", icon: Film, label: "ريلز التسوق" },*/
              { id: "orders", icon: ClipboardList, label: "الطلبات" },
              { id: "reports", icon: TrendingUp, label: "التقارير" },
              { id: "delivery", icon: Truck, label: "التوصيل" },
              { id: "profile", icon: User, label: "حسابي" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id as any)}
                className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-xl transition tour-step-desktop-${item.id} ${activeTab === item.id ? "bg-vibrant-purple text-white shadow-brand-glow" : "text-slate-300 hover:bg-vibrant-purple/15"}`}
              >
                <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-violet'} />
                <span className="font-semibold">{item.label}</span>
                {item.id === "orders" && pendingOrders.length > 0 && (
                  <span className="mr-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {pendingOrders.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <button
            onClick={handleLogout}
            className="m-4 p-3 bg-red-900/50 text-red-200 rounded-xl hover:bg-red-800 flex items-center justify-center space-x-2 space-x-reverse transition"
          >
            <LogOut size={20} />
            <span>خروج</span>
          </button>
        </aside>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 merchant-nav-mobile flex justify-around p-2 z-20 shadow-[-0_10px_40px_-15px_rgba(0,0,0,0.1)] overflow-x-auto">
          {[
            { id: "home", icon: MahalakLogoIcon, label: "الرئيسية" },
            { id: "products", icon: Package, label: "المنتجات" },
            { id: "marketing", icon: Megaphone, label: "التسويق" },
            /*{ id: "reels", icon: Film, label: "ريلز" },*/
            { id: "orders", icon: ClipboardList, label: "الطلبات" },
            { id: "reports", icon: TrendingUp, label: "التقارير" },
            { id: "delivery", icon: Truck, label: "التوصيل" },
            { id: "profile", icon: User, label: "حسابي" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id as any)}
              className={`flex flex-col items-center px-2 py-1.5 rounded-xl transition-all tour-step-mobile-${item.id} ${activeTab === item.id ? "text-violet" : "text-slate-400 hover:text-slate-300"}`}
            >
              <div className={`p-1.5 rounded-lg mb-1 transition-all ${activeTab === item.id ? 'bg-vibrant-purple text-white shadow-brand-glow' : 'bg-transparent'}`}>
                <item.icon size={18} className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-vibrant-purple'}`} />
              </div>
              <span className="text-[9px] font-bold text-slate-300">{item.label}</span>
            </button>
          ))}
        </nav>

        <main className="flex-1 min-w-0 md:mr-64 p-4 md:p-6 lg:p-8 pt-0 md:pt-0 lg:pt-0 pb-24 md:pb-8 text-right w-full overflow-x-hidden">
          {/* Header Mobile / Info Bar */}
          <div
            className="flex justify-between items-center mb-6 merchant-brand-card p-4 rounded-b-2xl md:rounded-2xl shadow-sm border border-t-0 text-right"
            
          >
            <div className="flex items-center gap-3 text-right">
              {activeTab !== "home" && (
                <button
                  onClick={() => handleTabChange("home")}
                  className="p-2 merchant-icon-tile text-slate-300 rounded-xl hover:bg-white/15 hover:text-violet transition-all ml-1 flex items-center justify-center border border-transparent hover:border-slate-100"
                >
                  <ChevronRight size={20} />
                </button>
              )}
              <div className="text-right flex flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-black text-on-brand">
                    {currentMerchant.shopName}
                  </h1>
                  {isSubscriptionActive ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full relative">
                      <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </div>
                      <span>حساب مفعل</span>
                    </span>
                  ) : (
                    <div className="flex flex-col items-start">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                        <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                        <span>غير مفعل</span>
                      </span>
                    </div>
                  )}
                </div>
                {(!isSubscriptionActive) && (
                  <button
                    type="button"
                    onClick={() => setShowSubscriptionModal(true)}
                    className="text-[9px] text-rose-500 font-bold max-w-[200px] text-right hover:underline"
                  >
                    (المتجر لا يظهر للزبائن — اضغط لاختيار باقة الاشتراك)
                  </button>
                )}
                {currentMerchant?.subscriptionValidUntil && currentMerchant.subscriptionExpiry !== 'Lifetime' && isSubscriptionActive && (
                  <p className="text-[9px] font-bold text-white">
                    ينتهي في: {new Date(currentMerchant.subscriptionValidUntil).toLocaleDateString('ar-IQ')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3 space-x-reverse relative text-right">
              <button
                onClick={handleManualSync}
                className={`p-2.5 rounded-xl transition-all ml-2 ${isSyncing ? 'bg-slate-100 text-slate-400 animate-spin' : 'bg-slate-50 text-slate-500 hover:bg-orange-50 hover:text-orange-600'}`}
                title="تحديث البيانات"
              >
                <RefreshCw size={20} />
              </button>
              <button
                onClick={() => {
                  if (!showNotifications && unreadNotifsCount > 0 && currentMerchant) {
                    markAllNotificationsAsRead(currentMerchant.id, "merchant");
                  }
                  setShowNotifications(!showNotifications);
                }}
                className="p-2.5 bg-amber-50/80 text-amber-500 rounded-full hover:bg-amber-100/70 transition relative shadow-sm border border-amber-100/40 flex items-center justify-center"
              >
                <BellRing size={20} strokeWidth={1.75} />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-bounce">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute left-0 top-12 w-72 merchant-dropdown rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in divide-y divide-gray-50 text-right">
                  <div className="p-3 merchant-panel-inset flex justify-between items-center border-b border-white/10 text-right">
                    <span className="text-xs font-black text-on-brand">
                      التنبيهات الأخيرة
                    </span>
                    <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                      {merchantNotifications.length} تنبيه
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto text-right">
                    {merchantNotifications.length === 0 ? (
                      <p className="p-8 text-center text-[10px] text-slate-400 font-bold col-span-full">
                        لا توجد إشعارات جديدة.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-50 text-right">
                        {merchantNotifications.map((notif) => (
                          <div key={notif.id} className="p-3 hover:bg-white/5 transition-colors text-right relative cursor-pointer" onClick={() => {
                            if (!notif.read) markNotificationAsRead(notif.id);
                            if (notif.type === 'order') {
                               handleTabChange('orders');
                            }
                            setShowNotifications(false);
                          }}>
                            <div className="flex items-start justify-between">
                              <p className={`text-xs font-black mb-1 ${!notif.read ? 'text-vibrant-purple' : 'text-slate-600'}`}>{notif.title}</p>
                              {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-vibrant-purple mt-1 shrink-0"></span>}
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{notif.message}</p>
                            {notif.actionLink && notif.actionText && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(notif.actionLink, '_blank');
                                }}
                                className="mt-2 text-[10px] font-bold bg-vibrant-purple/10 text-vibrant-purple px-3 py-1.5 rounded-lg w-full"
                              >
                                {notif.actionText}
                              </button>
                            )}
                            <span className="text-[8px] text-slate-400 block mt-1">
                              {formatSafeDateTimeString(notif.createdAt, "ar-IQ", { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* الرئيسية */}
          {activeTab === "home" && (
            <div className="space-y-6">
              <div className="p-6 h-full overflow-y-auto">
                <div className="space-y-6">
              {/* لوحة "النبض السريع" (الذكاء التجاري) */}
              {(() => {
                const unreadOrdersCountVal = merchantOrders.filter(o => o.status === 'pending').length;
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                const todaySales = merchantOrders.filter(o => o.status === 'delivered' && new Date(o.createdAt).toDateString() === new Date().toDateString()).reduce((sum, o) => sum + ((o.subtotal || 0) - (o.discountSponsor === 'MERCHANT' ? (o.discountAmount || 0) : 0)), 0);
                const pulsePerformanceMsg = unreadOrdersCountVal > 0 
                  ? "يوجد طلبات جديدة بانتظار معالجتك، أداء المتجر نشط." 
                  : (todaySales > 0 ? "أداء مبيعاتك اليوم أعلى بـ 15% من المعدل المعتاد!" : "استمر في إضافة منتجات جديدة لزيادة مبيعاتك وجذب الزبائن.");

                return (
                  <div
                    className="merchant-brand-card p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden group border"
                  >
                    <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-white/10 rounded-2xl shadow-sm">
                          <Activity size={32} className="text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-black text-xl text-[#E8ECF4]">حالة المتجر الآن</h3>
                            <span className="flex h-3 w-3 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                          </div>
                          <p className="text-sm text-slate-300 font-medium leading-relaxed max-w-md">
                            {unreadOrdersCountVal > 0 ? `لديك ${unreadOrdersCountVal} طلبات جديدة، زبائن بانتظار الرد، و` : "لا توجد طلبات جديدة حالياً، ولكن "} {pulsePerformanceMsg}
                          </p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleTabChange("orders")} 
                        className="bg-vibrant-purple text-white hover:bg-violet px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 flex items-center gap-2 shrink-0"
                      >
                        الذهاب للطلبات <ChevronLeft size={16} />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* تنبيهات المخزون الذكية */}
              {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
                <div className="flex flex-col gap-3">
                  {outOfStockProducts.length > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-4">
                      <div className="p-2 bg-white rounded-xl shadow-sm text-rose-500 shrink-0">
                        <AlertTriangle size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-rose-700 mb-1">انتباه: منتجات نفذت من المخزون!</h4>
                        <p className="text-xs font-bold text-rose-600 mb-2">
                          توجد {outOfStockProducts.length} منتجات نفذت كميتها تماماً. يرجى تحديث المخزون لتجنب رفض الطلبات.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {outOfStockProducts.slice(0, 3).map(p => (
                            <span key={p.id} className="text-[10px] font-bold bg-white text-rose-600 px-2 py-1 rounded-lg shadow-sm truncate max-w-[150px]">{p.name}</span>
                          ))}
                          {outOfStockProducts.length > 3 && <span className="text-[10px] font-bold text-rose-500">+{outOfStockProducts.length - 3} أخرى...</span>}
                        </div>
                      </div>
                      <button onClick={() => handleTabChange('products')} className="shrink-0 text-xs font-black bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl transition-all active:scale-95">تحديث الآن</button>
                    </div>
                  )}

                  {lowStockProducts.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-4">
                      <div className="p-2 bg-white rounded-xl shadow-sm text-amber-500 shrink-0">
                        <Package size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-amber-700 mb-1">تنبيه ذكي: اقتراب نفاذ المخزون</h4>
                        <p className="text-xs font-bold text-amber-600 mb-2">
                          {lowStockProducts.length} منتجات سجلت كمية أقل من 3 قطع.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {lowStockProducts.slice(0, 3).map(p => (
                            <span key={p.id} className="text-[10px] font-bold bg-white text-amber-700 px-2 py-1 rounded-lg shadow-sm border border-amber-100 flex items-center gap-1">
                              <span className="truncate max-w-[120px]">{p.name}</span>
                              <span className="bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-md">باقي {p.inventory}</span>
                            </span>
                          ))}
                          {lowStockProducts.length > 3 && <span className="text-[10px] font-bold text-amber-500">+{lowStockProducts.length - 3} أخرى...</span>}
                        </div>
                      </div>
                      <button onClick={() => handleTabChange('products')} className="shrink-0 text-xs font-black bg-white hover:bg-amber-100 text-amber-700 border border-amber-200 px-4 py-2 rounded-xl transition-all active:scale-95 shadow-sm">إدارة المخزون</button>
                    </div>
                  )}
                </div>
              )}

              {/* قسم الإعلانات الممولة للشركات والخدمات */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* القسم الأول: شركات التوصيل */}
                    <div
                      className="merchant-brand-card p-6 rounded-[2rem] border shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-4 text-on-brand">
                          <div className="p-2 bg-white/10 text-vibrant-purple rounded-xl group-hover:scale-110 transition-transform">
                            <Truck size={18} className="stroke-[2.5]" />
                          </div>
                          <h4 className="text-sm font-black text-white">
                            شركات التوصيل الشريكة 🚚
                          </h4>
                          <span className="flex items-center gap-0.5 bg-gradient-to-r from-[#7B3DFF] to-pink-500 text-[9px] font-bold text-white px-2.5 py-0.5 rounded-full mr-auto animate-pulse shadow-sm">
                            <Sparkles size={8} />
                            ممولة
                          </span>
                        </div>

                        {(adminSettings.merchantDeliveryAds || []).length > 0 ? (
                          <div className="relative overflow-hidden rounded-2xl bg-slate-900 aspect-[2/1] border border-slate-100 shadow-inner">
                            {(adminSettings.merchantDeliveryAds || []).map((ad: any, idx: number) => (
                              <div
                                key={ad.id}
                                className={`absolute inset-0 transition-all duration-500 flex flex-col justify-end ${idx === deliveryAdIndex ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
                              >
                                <img src={ad.url || undefined} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[6s] group-hover:scale-105 filter brightness-90" alt={ad.title} />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                                <div className="relative p-4 text-white text-right z-10">
                                  <h5 className="font-bold text-sm mb-1 drop-shadow-md text-white">{ad.title}</h5>
                                  <p className="text-[10px] text-slate-200 font-medium line-clamp-2 leading-relaxed mb-3 drop-shadow-sm">{ad.desc}</p>
                                  {ad.link && (
                                    <a
                                      href={ad.link.startsWith('http') ? ad.link : `tel:${ad.link}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-[#7B3DFF] to-violet hover:from-vibrant-purple hover:to-[#7B3DFF] text-white rounded-xl text-[10px] font-black transition-all active:scale-95 shadow-md hover:shadow-purple-500/10 cursor-pointer"
                                    >
                                      <span>تواصل الآن</span>
                                      <MessageCircle size={11} />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                            {/* Indicators */}
                            {(adminSettings.merchantDeliveryAds || []).length > 1 && (
                              <div className="absolute bottom-2 right-2 flex gap-1 z-15 bg-deep-navy/40 px-2 py-1 rounded-full backdrop-blur-xs">
                                {(adminSettings.merchantDeliveryAds || []).map((_: any, idx: number) => (
                                  <button
                                    key={idx}
                                    onClick={() => setDeliveryAdIndex(idx)}
                                    className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${idx === deliveryAdIndex ? 'bg-vibrant-purple w-3.5' : 'bg-white/40 hover:bg-white'}`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          // Empty state
                          <div
                            className="flex flex-col items-center justify-center p-6 rounded-2xl aspect-[2/1] border border-dashed merchant-panel-inset brand-gradient-border"
                          >
                            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-slate-300 mb-2">
                              <Truck size={16} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-300">لا توجد إعلانات نشطة حالياً</span>
                            <span className="text-[8px] text-slate-400 mt-1">تواصل مع الإدارة لإضافة عرضك المميز</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* القسم الثاني: شركات التصوير والاعلانات */}
                    <div
                      className="merchant-brand-card p-6 rounded-[2rem] border shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-4 text-on-brand">
                          <div className="p-2 bg-white/10 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
                            <Camera size={18} className="stroke-[2.5]" />
                          </div>
                          <h4 className="text-sm font-black text-white">
                            تصوير المنتجات وصناعة المحتوى 📸
                          </h4>
                          <span className="flex items-center gap-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-[9px] font-bold text-white px-2.5 py-0.5 rounded-full mr-auto animate-pulse shadow-sm">
                            <Sparkles size={8} />
                            ممولة
                          </span>
                        </div>

                        {(adminSettings.merchantMediaAds || []).length > 0 ? (
                          <div className="relative overflow-hidden rounded-2xl bg-slate-900 aspect-[2/1] border border-slate-100 shadow-inner">
                            {(adminSettings.merchantMediaAds || []).map((ad: any, idx: number) => (
                              <div
                                key={ad.id}
                                className={`absolute inset-0 transition-all duration-500 flex flex-col justify-end ${idx === mediaAdIndex ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
                              >
                                <img src={ad.url || undefined} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[6s] group-hover:scale-105 filter brightness-90" alt={ad.title} />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                                <div className="relative p-4 text-white text-right z-10">
                                  <h5 className="font-bold text-sm mb-1 drop-shadow-md text-white">{ad.title}</h5>
                                  <p className="text-[10px] text-slate-200 font-medium line-clamp-2 leading-relaxed mb-3 drop-shadow-sm">{ad.desc}</p>
                                  {ad.link && (
                                    <a
                                      href={ad.link.startsWith('http') ? ad.link : `tel:${ad.link}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-teal-600 hover:to-emerald-500 text-white rounded-xl text-[10px] font-black transition-all active:scale-95 shadow-md hover:shadow-emerald-500/10 cursor-pointer"
                                    >
                                      <span>تواصل الآن</span>
                                      <MessageCircle size={11} />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                            {/* Indicators */}
                            {(adminSettings.merchantMediaAds || []).length > 1 && (
                              <div className="absolute bottom-2 right-2 flex gap-1 z-15 bg-deep-navy/40 px-2 py-1 rounded-full backdrop-blur-xs">
                                {(adminSettings.merchantMediaAds || []).map((_: any, idx: number) => (
                                  <button
                                    key={idx}
                                    onClick={() => setMediaAdIndex(idx)}
                                    className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${idx === mediaAdIndex ? 'bg-emerald-500 w-3.5' : 'bg-white/40 hover:bg-white'}`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          // Empty state
                          <div
                            className="flex flex-col items-center justify-center p-6 rounded-2xl aspect-[2/1] border border-dashed merchant-panel-inset brand-gradient-border"
                          >
                            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-slate-300 mb-2">
                              <Camera size={16} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-300">لا توجد إعلانات نشطة حالياً</span>
                            <span className="text-[8px] text-slate-400 mt-1">تواصل مع الإدارة لإضافة عرضك المميز</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
                {[
                  {
                    label: "إجمالي الطلبات",
                    val: merchantOrders.length,
                    color: "text-vibrant-purple",
                    tab: "orders",
                    bg: "bg-white",
                    icon: <ShoppingBag size={18} className="stroke-[2.5]" />,
                    iconBg: "bg-purple-50 text-vibrant-purple"
                  },
                  {
                    label: "بانتظار التحضير",
                    val: pendingOrders.length,
                    color: "text-amber-500",
                    tab: "orders",
                    bg: "bg-white",
                    icon: <RefreshCw size={18} className="stroke-[2.5]" />,
                    iconBg: "bg-amber-50 text-amber-500"
                  },
                  {
                    label: "إجمالي الزبائن",
                    val: storeAudienceStats.total,
                    color: "text-violet",
                    tab: "customers",
                    bg: "bg-white",
                    icon: <Users size={18} className="stroke-[2.5]" />,
                    iconBg: "bg-white/10 text-violet"
                  },
                  {
                    label: "إجمالي المبيعات",
                    val:
                      merchantOrders
                        .filter((o) => o.status === "delivered")
                        .reduce((a, b) => a + ((b.subtotal || 0) - (b.discountSponsor === 'MERCHANT' ? (b.discountAmount || 0) : 0)), 0)
                        .toLocaleString() + " د.ع",
                    color: "text-emerald-600",
                    tab: "home",
                    bg: "bg-white",
                    icon: <TrendingUp size={18} className="stroke-[2.5]" />,
                    iconBg: "bg-emerald-50 text-emerald-600"
                  },
                  {
                    label: "التقييمات",
                    val: currentMerchant.rating ? `${currentMerchant.rating.toFixed(1)} / 5` : "0",
                    color: "text-amber-500",
                    tab: "home",
                    bg: "bg-white",
                    icon: <Star size={18} className="stroke-[2.5]" />,
                    iconBg: "bg-yellow-50 text-yellow-500"
                  },
                  {
                    label: "عروض فلاش سيلز",
                    val: flashSales.filter(f => f.itemStoreId === currentMerchant.id && f.status === "active").length,
                    color: "text-red-500",
                    tab: "home",
                    bg: "bg-white",
                    icon: <Zap size={18} className="stroke-[2.5]" />,
                    iconBg: "bg-rose-50 text-rose-500"
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    onClick={() => { if (s.tab !== 'home') handleTabChange(s.tab as any); }}
                    className={`p-5 rounded-3xl shadow-sm border merchant-brand-card group hover:border-slate-200 transition-all duration-350 hover:-translate-y-1 hover:shadow-md flex flex-col justify-between relative overflow-hidden ${s.tab !== 'home' ? 'cursor-pointer' : ''} ${s.tab === 'customers' ? 'tour-step-customers-card' : ''}`}
                  >
                    {/* Decorative subtle background circle */}
                    <div className="absolute -right-4 -bottom-4 w-12 h-12 rounded-full bg-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-black text-white">
                        {s.label}
                      </span>
                      <div className={`p-2 rounded-xl shrink-0 ${s.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                        {s.icon}
                      </div>
                    </div>

                    <div className="relative">
                      <span className="text-base sm:text-lg font-black tracking-tight text-white">
                        {s.val}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* رسم بياني لأكثر المنتجات مبيعاً خلال الشهر */}
              {topSellingProductsThisMonth.length > 0 && (
                <div
                  className="p-6 rounded-[2rem] border shadow-sm relative overflow-hidden group merchant-brand-card"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Package size={64} className="text-white" />
                  </div>
                  <div className="relative">
                    <h4 className="text-lg font-black text-[#E8ECF4] mb-6 flex items-center justify-between">
                      <span>أكثر المنتجات مبيعاً (هذا الشهر) 📈</span>
                    </h4>
                    <div className="h-64 mt-4 w-full" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topSellingProductsThisMonth} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                            interval={0}
                            angle={-30}
                            textAnchor="end"
                          />
                          <YAxis 
                            allowDecimals={false} 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} 
                          />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc' }} 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ color: '#0f172a', fontWeight: 'bold', marginBottom: '4px', textAlign: 'right' }}
                            itemStyle={{ color: '#7B3DFF', fontWeight: 'bold', textAlign: 'right' }}
                          />
                          <Bar dataKey="sold" name="الكمية المباعة" radius={[6, 6, 0, 0]}>
                            {topSellingProductsThisMonth.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#7B3DFF' : '#cbd5e1'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* قسم مشاركة المتجر */}
              <div
                className="merchant-brand-card p-6 rounded-[2.5rem] border shadow-sm relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Share2 size={64} className="text-white" />
                </div>
                <div className="relative">
                  <h4 className="text-lg font-black text-[#E8ECF4] mb-2">
                    شارك متجرك 📣
                  </h4>
                  <div className="flex items-center gap-1.5 mb-3 bg-[#0B1320] border border-white/10 p-2.5 rounded-xl text-xs font-mono text-[#E8ECF4] select-all max-w-md">
                    <span className="truncate">{buildStoreShareUrl(currentMerchant?.id || '')}</span>
                    <CopyButton text={buildStoreShareUrl(currentMerchant?.id || '')} size={11} className="shrink-0" />
                  </div>
                  <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                    قم بمشاركة رابط المتجر الرسمي الخاص بك على منصات التواصل
                    الاجتماعي لجذب المزيد من الزبائن وزيادة مبيعاتك.
                  </p>
                  <button
                    onClick={() => openShareModal("store", currentMerchant)}
                    className="w-full sm:w-auto px-8 py-3 bg-vibrant-purple text-white rounded-2xl font-black text-sm shadow-lg shadow-slate-100 hover:bg-vibrant-purple transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Share2 size={18} />
                    مشاركة رابط المتجر
                  </button>
                </div>
              </div>

              {/* أكواد الخصم والخصومات المضافة */}
              <div className="space-y-6 pt-2">
                <div
                  className="p-6 rounded-2xl shadow-sm border flex justify-between items-center merchant-brand-card"
                >
                  <div>
                    <h2 className="text-lg font-bold text-[#E8ECF4]">أكواد الخصم 🎫</h2>
                  </div>
                  <button
                    onClick={() => setPromoModal(true)}
                    className="px-4 py-2 bg-vibrant-purple text-white font-bold rounded-xl shadow-md flex items-center space-x-2 space-x-reverse"
                  >
                    <Plus size={18} />
                    <span>إنشاء كود خَصم</span>
                  </button>
                </div>
                {merchantPromos.length === 0 ? (
                  <div
                    className="p-8 rounded-2xl border text-center text-white merchant-brand-card"
                  >
                    لا توجد أكواد خصم نشطة حالياً. اضغط على الزر أعلاه لإنشاء كود أول.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {merchantPromos.map((p) => (
                      <div
                        key={p.id}
                        className="bg-white p-5 rounded-2xl border shadow-sm"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-1">
                            <code className="bg-slate-50 text-slate-700 px-3 py-1.5 rounded-xl font-black tracking-wider">
                              {p.code}
                            </code>
                            <CopyButton text={p.code} size={11} />
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${p.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                          >
                            {p.status === "active" ? "فعال" : "منتهي"}
                          </span>
                        </div>
                        <span className="text-lg font-black">
                          {(p.discountValue || 0).toLocaleString()}{" "}
                          {p.discountType === "percent" ? "%" : "د.ع"}
                        </span>
                        <div className="flex justify-between mt-3 text-xs text-slate-500">
                          <p>
                            استخدام: {p.usedCount}/{p.maxUses}
                          </p>
                          {p.maxUsesPerUser && <p>حصة الفرد: {p.maxUsesPerUser}</p>}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 bg-slate-50 p-1.5 rounded-lg text-center">
                          {p.startDate
                            ? `${formatSafeDate(p.startDate)} إلى `
                            : ""}
                          {p.expiresAt
                            ? formatSafeDate(p.expiresAt)
                            : "مستمر"}
                        </p>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t">
                          <button
                            onClick={() => togglePromoCodeStatus(p.id)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${
                              p.status === "active"
                                ? "bg-orange-50 text-orange-600 hover:bg-orange-100"
                                : "bg-green-50 text-green-600 hover:bg-green-100"
                            }`}
                          >
                            {p.status === "active" ? "إيقاف" : "تفعيل"}
                          </button>
                          <button
                            onClick={() => deletePromoCode(p.id)}
                            className="p-1.5 text-red-400 bg-red-50 hover:bg-red-500 hover:text-white rounded-xl transition"
                            title="حذف الكود نهائياً"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* الفعاليات المركزية */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div
                  className="rounded-2xl border shadow-sm p-6 overflow-hidden relative text-right merchant-brand-card"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Zap size={100} className="text-yellow-400" />
                  </div>
                  <div className="relative z-10 text-right">
                    <h3 className="font-black text-2xl text-[#E8ECF4] flex items-center space-x-2 space-x-reverse mb-2 justify-start">
                      <Zap size={24} className="text-yellow-400" />
                      <span>الفعاليات المركزية (Flash Sales)</span>
                    </h3>
                    <p className="text-xs text-slate-300 max-w-sm">
                      شارك بمنتجاتك في الفعاليات المركزية وحقق مبيعات ضخمة خلال
                      فترة قصيرة!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {flashSales.filter((s) => s.status !== "ended" && s.status !== "paused").length === 0 ? (
                    <div
                      className="p-12 rounded-2xl border shadow-sm text-center merchant-brand-card"
                    >
                      <Gift size={48} className="mx-auto text-white mb-4" />
                      <p className="font-bold text-[#E8ECF4]">
                        لا توجد فعاليات مركزية حالياً
                      </p>
                    </div>
                  ) : (
                    flashSales
                      .filter((s) => s.status !== "ended" && s.status !== "paused")
                      .map((sale) => {
                        const isUpcoming = new Date() < new Date(sale.startTime);
                        const myRequests = flashSaleRequests.filter(
                          (r) =>
                            r.flashSaleId === sale.id &&
                            r.storeId === currentMerchant.id,
                        );
                        return (
                          <div
                            key={sale.id}
                            className="bg-white rounded-2xl border shadow-sm p-6 text-right"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h4 className="font-black text-lg text-violet">
                                  {sale.title}
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                  {sale.description}
                                </p>
                              </div>
                              {(sale.status === "upcoming" && isUpcoming) && (
                                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
                                  تبدأ قريباً
                                </span>
                              )}
                              {(sale.status === "active" || (!isUpcoming)) && (
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200 flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                                  فعالية نشطة الآن
                                </span>
                              )}
                            </div>

                            <div className="flex gap-4 mb-6 text-[11px] font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <div>
                                يبدأ:{" "}
                                <span
                                  className="font-mono text-violet"
                                  dir="ltr"
                                >
                                  {formatSafeDateTimeString(sale.startTime)}
                                </span>
                              </div>
                              <div>
                                ينتهي:{" "}
                                <span
                                  className="font-mono text-violet"
                                  dir="ltr"
                                >
                                  {formatSafeDateTimeString(sale.endTime)}
                                </span>
                              </div>
                            </div>

                            {sale.status === "active" &&
                              myRequests.length === 0 && (
                                <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-bold mb-4 border border-rose-100 text-center">
                                  لا يمكنك المشاركة لأن الفعالية قد بدأت بالفعل.
                                  يرجى التقديم في الفعاليات القادمة مسبقاً.
                                </div>
                              )}

                            <div className="space-y-3">
                              <h5 className="font-bold text-slate-700 text-xs flex justify-between items-center pb-2 border-b">
                                <span>
                                  منتجاتك المشاركة ({myRequests.length})
                                </span>
                                {(sale.status === "upcoming" && isUpcoming) && (
                                  <button
                                    onClick={() =>
                                      setJoinFlashSaleData({
                                        flashSaleId: sale.id,
                                      })
                                    }
                                    className="px-3 py-1 bg-slate-50 text-violet rounded-lg font-bold text-[10px] hover:bg-slate-100 transition"
                                  >
                                    + طلب مشاركة لمنتج
                                  </button>
                                )}
                              </h5>

                              {myRequests.length === 0 && (
                                <div className="text-center text-slate-400 py-4 text-xs font-bold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                  لم يتم مشاركه لمنتج
                                </div>
                              )}

                              {myRequests.map((req) => {
                                const p = products.find(
                                  (prod) => prod.id === req.productId,
                                );
                                if (!p) return null;
                                return (
                                  <div
                                    key={req.id}
                                    className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-2xl shadow-sm"
                                  >
                                    <div className="flex items-center gap-3">
                                      <img
                                        src={p.image || undefined}
                                        className="w-10 h-10 rounded-xl object-cover"
                                      />
                                      <div>
                                        <h6 className="font-black text-[11px] text-violet">
                                          {p.name}
                                        </h6>
                                        <div className="flex gap-2 text-[9px] mt-0.5">
                                          <span className="text-slate-400">
                                            أصلي:{" "}
                                            <del>{p.price.toLocaleString()}</del>
                                          </span>
                                          <span className="text-rose-600 font-black">
                                            حالي:{" "}
                                            {req.promotionalPrice.toLocaleString()}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div>
                                      {req.status === "pending" && (
                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 font-bold text-[9px] rounded uppercase">
                                          قيد المراجعة
                                        </span>
                                      )}
                                      {req.status === "approved" && (
                                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 font-bold text-[9px] rounded uppercase">
                                          مقبول
                                        </span>
                                      )}
                                      {req.status === "rejected" && (
                                        <span className="px-2 py-1 bg-rose-100 text-rose-700 font-bold text-[9px] rounded uppercase">
                                          مرفوض
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "delivery" && (
            <div className="space-y-6">
                <div className="p-6 h-full overflow-y-auto">
                <div className="space-y-6">
                  {/* رأس صفحة التوصيل */}
                  <div
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center merchant-brand-card p-5 rounded-2xl shadow-sm border gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-100 text-slate-700 rounded-2xl">
                        <Truck size={22} className="text-violet" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-850">
                          إعدادات التوصيل وتسعيرة المحافظات
                        </h2>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">
                          تحكم بأسعار التوصيل وعروض التوصيل المجاني لكل العراق بضغطة زر.
                        </p>
                      </div>
                    </div>
                  </div>

                <div
                  className="border p-6 rounded-[2rem] shadow-xs space-y-6 animate-fade-in merchant-brand-card"
                  dir="rtl"
                >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-2 bg-white/10 text-white rounded-xl shadow-md">
                      <Truck size={20} className="stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-[#E8ECF4]">
                        إعدادات التوصيل وتسعيرة المحافظات 🚚
                      </h4>
                      <p className="text-[11px] font-bold text-slate-300">
                        تحكم بأسعار التوصيل وعروض التوصيل المجاني لكل العراق بضغطة زر.
                      </p>
                    </div>
                  </div>
                </div>

                {/* خيار التوصيل المجاني الشامل لكل المحافظات */}
                <div className="bg-white/10 border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div>
                    <h5 className="text-xs font-black text-[#E8ECF4] mb-0.5">توصيل مجاني لجميع المحافظات 🌍</h5>
                    <p className="text-[10px] font-bold text-slate-300">عند تفعيل هذا الخيار، سيتم إلغاء رسوم التوصيل لجميع الزبائن من أي محافظة.</p>
                  </div>
                  <button
                    onClick={() =>
                      handleProfileFormChange({
                        isFreeDelivery: !profileForm.isFreeDelivery,
                      })
                    }
                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center gap-1.5 ${
                      profileForm.isFreeDelivery
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    <span>{profileForm.isFreeDelivery ? "مفعل (توصيل مجاني للكل) ✅" : "معطل (اعتماد التسعير المخصص) ❌"}</span>
                  </button>
                </div>

                {!profileForm.isFreeDelivery && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* عمود محافظة المتجر */}
                    <div className="bg-white/10 border border-white/10 p-5 rounded-2xl shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <h5 className="text-xs font-black text-[#E8ECF4]">التوصيل لمحافظتي ({profileForm.province || 'محافظة المتجر'})</h5>
                        </div>
                        <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">محلي</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-[#0B1320] p-2.5 rounded-xl border border-white/10">
                          <span className="text-xs font-bold text-slate-300">سعر التوصيل للمحافظة:</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const newPrice = Math.max(0, profileForm.localProvinceDeliveryPrice - 500);
                                handleProfileFormChange({ localProvinceDeliveryPrice: newPrice });
                              }}
                              disabled={profileForm.localProvinceFreeDelivery}
                              className="w-7 h-7 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 cursor-pointer disabled:opacity-55 active:scale-90 select-none font-bold"
                            >
                              -
                            </button>
                            <span className={`text-xs font-black font-mono w-16 text-center ${profileForm.localProvinceFreeDelivery ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                              {profileForm.localProvinceDeliveryPrice.toLocaleString()} <span className="text-[9px]">د.ع</span>
                            </span>
                            <button
                              onClick={() => {
                                const newPrice = profileForm.localProvinceDeliveryPrice + 500;
                                handleProfileFormChange({ localProvinceDeliveryPrice: newPrice });
                              }}
                              disabled={profileForm.localProvinceFreeDelivery}
                              className="w-7 h-7 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 cursor-pointer disabled:opacity-55 active:scale-90 select-none font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* أزرار سريعة ومفتاح تفعيل مجاني */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[1500, 2000, 3000, 4000, 5000].map((pr) => (
                            <button
                              key={pr}
                              disabled={profileForm.localProvinceFreeDelivery}
                              onClick={() => handleProfileFormChange({ localProvinceDeliveryPrice: pr })}
                              className={`px-2.5 py-1 text-[9px] font-black rounded-lg border transition-all ${
                                profileForm.localProvinceDeliveryPrice === pr 
                                ? "bg-vibrant-purple text-white border-vibrant-purple" 
                                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {pr.toLocaleString()} د.ع
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() =>
                            handleProfileFormChange({
                              localProvinceFreeDelivery: !profileForm.localProvinceFreeDelivery,
                            })
                          }
                          className={`w-full py-2.5 rounded-xl text-xs font-black transition-all border flex items-center justify-center gap-1.5 ${
                            profileForm.localProvinceFreeDelivery
                              ? "bg-emerald-5 text-emerald-600 border-emerald-200"
                              : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <span>{profileForm.localProvinceFreeDelivery ? "مفعل: توصيل مجاني لمحافظتي ✅" : "تفعيل توصيل مجاني لمحافظتي 🆓"}</span>
                        </button>
                      </div>
                    </div>

                    {/* عمود باقي المحافظات */}
                    <div className="bg-white/10 border border-white/10 p-5 rounded-2xl shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <h5 className="text-xs font-black text-[#E8ECF4]">التوصيل للمحافظات البقية</h5>
                        </div>
                        <span className="text-[9px] font-black bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">الكلية</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-[#0B1320] p-2.5 rounded-xl border border-white/10">
                          <span className="text-xs font-bold text-slate-300">السعر العام لباقي المحافظات:</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const newPrice = Math.max(0, profileForm.otherProvincesDeliveryPrice - 500);
                                handleProfileFormChange({ otherProvincesDeliveryPrice: newPrice });
                              }}
                              disabled={profileForm.otherProvincesFreeDelivery}
                              className="w-7 h-7 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 cursor-pointer disabled:opacity-55 active:scale-90 select-none font-bold"
                            >
                              -
                            </button>
                            <span className={`text-xs font-black font-mono w-16 text-center ${profileForm.otherProvincesFreeDelivery ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                              {profileForm.otherProvincesDeliveryPrice.toLocaleString()} <span className="text-[9px]">د.ع</span>
                            </span>
                            <button
                              onClick={() => {
                                const newPrice = profileForm.otherProvincesDeliveryPrice + 500;
                                handleProfileFormChange({ otherProvincesDeliveryPrice: newPrice });
                              }}
                              disabled={profileForm.otherProvincesFreeDelivery}
                              className="w-7 h-7 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 cursor-pointer disabled:opacity-55 active:scale-90 select-none font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* أزرار سريعة ومفتاح تفعيل مجاني */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[4000, 5000, 6000, 7000, 8000].map((pr) => (
                            <button
                              key={pr}
                              disabled={profileForm.otherProvincesFreeDelivery}
                              onClick={() => handleProfileFormChange({ otherProvincesDeliveryPrice: pr })}
                              className={`px-2.5 py-1 text-[9px] font-black rounded-lg border transition-all ${
                                profileForm.otherProvincesDeliveryPrice === pr 
                                ? "bg-vibrant-purple text-white border-vibrant-purple" 
                                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {pr.toLocaleString()} د.ع
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() =>
                            handleProfileFormChange({
                              otherProvincesFreeDelivery: !profileForm.otherProvincesFreeDelivery,
                            })
                          }
                          className={`w-full py-2.5 rounded-xl text-xs font-black transition-all border flex items-center justify-center gap-1.5 ${
                            profileForm.otherProvincesFreeDelivery
                              ? "bg-emerald-5 text-emerald-600 border-emerald-200"
                              : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <span>{profileForm.otherProvincesFreeDelivery ? "مفعل: توصيل مجاني للمحافظات البقية ✅" : "تفعيل توصيل مجاني للمحافظات البقية 🆓"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* تخصيص أسعار مميزة بمحافظات محددة بضغطة زر */}
                {!profileForm.isFreeDelivery && (
                  <div className="bg-white/10 border border-white/10 p-5 rounded-2xl shadow-sm space-y-4 font-sans">
                    <div>
                      <h5 className="text-xs font-black text-[#E8ECF4]">تخصيص تسعيرة لمحافظات محددة بالاسم 📍</h5>
                      <p className="text-[10px] font-bold text-slate-300 mt-0.5">
                        اضغط على أي محافظة لتعيين سعر مخصص لها فوراً بدلاً من السعر العام.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {provinces.map((p) => {
                        const prov = p.name;
                        const isLocal = prov === (profileForm.province || currentMerchant.province);
                        const hasCustomPrice = profileForm.provinceDeliveryPrices?.[prov] !== undefined;
                        const hasCustomFree = profileForm.provinceFreeDelivery?.[prov] === true;
                        
                        let displayPriceStyle: string;
                        let displayPriceText: string;

                        if (isLocal) {
                          if (profileForm.localProvinceFreeDelivery) {
                            displayPriceStyle = "text-emerald-500 font-extrabold";
                            displayPriceText = "مجاناً 🏠";
                          } else {
                            displayPriceText = `${profileForm.localProvinceDeliveryPrice.toLocaleString()} د.ع`;
                            displayPriceStyle = "text-slate-700 font-extrabold";
                          }
                        } else if (hasCustomFree) {
                          displayPriceStyle = "text-emerald-500 font-extrabold";
                          displayPriceText = "مجاناً ✨";
                        } else if (hasCustomPrice) {
                          const pr = profileForm.provinceDeliveryPrices[prov];
                          displayPriceText = `${pr.toLocaleString()} د.ع`;
                          displayPriceStyle = "text-vibrant-purple font-extrabold";
                        } else {
                          if (profileForm.otherProvincesFreeDelivery) {
                            displayPriceStyle = "text-emerald-500 font-medium";
                            displayPriceText = "مجاناً (عام)";
                          } else {
                            displayPriceText = `${profileForm.otherProvincesDeliveryPrice.toLocaleString()} د.ع (عام)`;
                          }
                        }

                        const isSelectedForEdit = selectedCustomProvince === prov;

                        return (
                          <button
                            key={prov}
                            type="button"
                            onClick={() => {
                              setSelectedCustomProvince(prov);
                              const curPrice = profileForm.provinceDeliveryPrices?.[prov] !== undefined 
                                ? profileForm.provinceDeliveryPrices[prov] 
                                : profileForm.otherProvincesDeliveryPrice;
                              const curFree = profileForm.provinceFreeDelivery?.[prov] || false;
                              setEditingCustomPrice(curPrice);
                              setIsCustomFree(curFree);
                            }}
                            className={`p-2.5 rounded-xl border text-right transition-all duration-200 cursor-pointer select-none relative ${
                              isSelectedForEdit
                                ? "ring-2 ring-vibrant-purple bg-violet/10 border-violet/25"
                                : hasCustomPrice || hasCustomFree
                                ? "bg-purple-50/50 border-purple-100 hover:bg-purple-50"
                                : isLocal 
                                ? "bg-slate-50 border-slate-200 hover:bg-slate-100 font-bold"
                                : "bg-white hover:bg-slate-50 border-slate-150"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-black text-slate-700 truncate">{prov}</span>
                              {isLocal && <span className="text-[7.5px] font-bold bg-[#eae0ff] text-vibrant-purple px-1 rounded">محافظتك</span>}
                              {(hasCustomPrice || hasCustomFree) && !isLocal && <span className="text-[7.5px] font-bold bg-purple-100 text-purple-700 px-1 rounded">مخصص</span>}
                            </div>
                            <div className={`text-[10px] ${displayPriceStyle} whitespace-nowrap`}>
                              {displayPriceText}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* لوحة تعديل السعر المخصص لمحافظة معينة */}
                    {selectedCustomProvince && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 relative animate-fadeIn">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomProvince(null)}
                          className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        >
                          <X size={16} />
                        </button>

                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200/60">
                          <MapPin size={15} className="text-vibrant-purple" />
                          <h6 className="text-xs font-black text-slate-700">تعديل تسعيرة توصيل محافظة: <span className="text-vibrant-purple font-black text-sm">{selectedCustomProvince}</span></h6>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10.5px] font-bold text-slate-500 mb-1">توصيل مجاني لهذه المحافظة:</label>
                            <button
                              type="button"
                              onClick={() => setIsCustomFree(!isCustomFree)}
                              className={`w-full py-2 rounded-xl text-xs font-black border transition-all ${
                                isCustomFree 
                                ? "bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/10" 
                                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {isCustomFree ? "نعم، توصيل مجاني لهذه المحافظة ✅" : "لا، توصيل مدفوع ❌"}
                            </button>
                          </div>

                          {!isCustomFree && (
                            <div>
                              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">سعر التوصيل للمحافظة (د.ع):</label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={editingCustomPrice}
                                  onChange={(e) => setEditingCustomPrice(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="flex-1 border bg-white border-slate-200 p-2 rounded-xl text-xs font-mono font-bold"
                                />
                                <span className="text-xs font-bold text-slate-400 shrink-0">د.ع</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {!isCustomFree && (
                          <div className="flex flex-wrap gap-1">
                            {[3000, 4000, 5000, 6000, 7000, 8000].map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => setEditingCustomPrice(v)}
                                className={`px-2 py-1 text-[9px] font-black rounded-lg border transition-all ${
                                  editingCustomPrice === v 
                                  ? "bg-vibrant-purple text-white border-vibrant-purple" 
                                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {v.toLocaleString()} د.ع
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2 pt-2 border-t border-slate-200/60 font-sans">
                          <button
                            type="button"
                            onClick={() => {
                              const updatedPrices = { ...profileForm.provinceDeliveryPrices };
                              const updatedFree = { ...profileForm.provinceFreeDelivery };
                              
                              if (isCustomFree) {
                                updatedFree[selectedCustomProvince] = true;
                                updatedPrices[selectedCustomProvince] = 0;
                              } else {
                                updatedFree[selectedCustomProvince] = false;
                                updatedPrices[selectedCustomProvince] = editingCustomPrice;
                              }
                              
                              handleProfileFormChange({
                                provinceDeliveryPrices: updatedPrices,
                                provinceFreeDelivery: updatedFree,
                              });
                              setSelectedCustomProvince(null);
                            }}
                            className="flex-1 py-2.5 bg-vibrant-purple hover:bg-violet text-white font-black rounded-xl text-xs active:scale-95 transition-all shadow-sm shadow-vibrant-purple/25/20 cursor-pointer text-center"
                          >
                            حفظ وتطبيق السعر الخاص
                          </button>
                          
                          {(profileForm.provinceDeliveryPrices?.[selectedCustomProvince] !== undefined || profileForm.provinceFreeDelivery?.[selectedCustomProvince] !== undefined) && (
                            <button
                              type="button"
                              onClick={() => {
                                const updatedPrices = { ...profileForm.provinceDeliveryPrices };
                                const updatedFree = { ...profileForm.provinceFreeDelivery };
                                
                                delete updatedPrices[selectedCustomProvince];
                                delete updatedFree[selectedCustomProvince];
                                
                                handleProfileFormChange({
                                  provinceDeliveryPrices: updatedPrices,
                                  provinceFreeDelivery: updatedFree,
                                });
                                setSelectedCustomProvince(null);
                              }}
                              className="px-3 py-2.5 bg-slate-250 hover:bg-slate-300 text-slate-700 font-extrabold rounded-xl text-xs active:scale-95 transition-all border border-slate-300 cursor-pointer"
                            >
                              إلغاء السعر الخاص
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* زر الحفظ الأساسي لإعدادات التوصيل */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveDeliverySettings}
                    disabled={isDeliverySaving}
                    className="w-full sm:w-auto px-8 py-3.5 bg-vibrant-purple hover:bg-violet text-white font-black rounded-2xl shadow-lg shadow-vibrant-purple/25/25 flex items-center justify-center space-x-2 space-x-reverse cursor-pointer select-none active:scale-95 transition-all hover:scale-[1.01]"
                  >
                    {isDeliverySaving ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>جاري الحفظ والتعميم...</span>
                      </>
                    ) : (
                      <>
                        <Check size={18} />
                        <span>حفظ جميع إعدادات التوصيل ونشرها فوراً ✅</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
                </div>
                </div>
              </div>
            )}

          {activeTab === "reports" && (() => {
            // Helper for Arabic weekday + short date formatting (e.g. "الجمعة 05/29")
            const getDayLabel = (date: Date) => {
              const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
              const dayName = days[date.getDay()];
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              return `${dayName} (${month}/${day})`;
            };

            let reportStartDate = new Date();
            reportStartDate.setHours(0, 0, 0, 0);
            let reportEndDate = new Date();
            reportEndDate.setHours(23, 59, 59, 999);

            if (reportDateRange === "7_days") {
              reportStartDate.setDate(reportEndDate.getDate() - 6);
            } else if (reportDateRange === "30_days") {
              reportStartDate.setDate(reportEndDate.getDate() - 29);
            } else if (reportDateRange === "this_month") {
              reportStartDate.setDate(1);
            } else if (reportDateRange === "custom") {
              if (reportCustomStartDate) {
                reportStartDate = new Date(reportCustomStartDate);
                reportStartDate.setHours(0, 0, 0, 0);
              } else {
                reportStartDate.setDate(reportEndDate.getDate() - 6);
              }
              if (reportCustomEndDate) {
                reportEndDate = new Date(reportCustomEndDate);
                reportEndDate.setHours(23, 59, 59, 999);
              }
            }

            const daysDiff = Math.max(1, Math.abs(Math.round((reportEndDate.getTime() - reportStartDate.getTime()) / (1000 * 60 * 60 * 24))) + 1);
            const maxDaysToRender = Math.min(daysDiff, 31); // Limit bar chart to 31 days to prevent UI overflow

            // Compute statistics for the dynamic date range
            const reportChartData = Array.from({ length: maxDaysToRender }, (_, index) => {
              const d = new Date(reportEndDate);
              d.setDate(d.getDate() - (maxDaysToRender - 1 - index));
              const dateStr = d.toDateString();
              const dayLabel = getDayLabel(d);

              const ordersOnDay = merchantOrders.filter(o => {
                const oDate = new Date(o.createdAt);
                return oDate.toDateString() === dateStr && oDate >= reportStartDate && oDate <= reportEndDate;
              });

              // Daily Sales sum of total for delivered orders on this day
              const sales = ordersOnDay
                .filter(o => o.status === 'delivered')
                .reduce((sum, o) => sum + ((o.subtotal || 0) - (o.discountSponsor === 'MERCHANT' ? (o.discountAmount || 0) : 0)), 0);

              const ordersCount = ordersOnDay.length;

              return {
                dayLabel,
                sales,
                ordersCount,
              };
            });

            // Calculate KPIs for the selected range
            const periodOrders = merchantOrders.filter(o => {
              const oDate = new Date(o.createdAt);
              return oDate >= reportStartDate && oDate <= reportEndDate;
            });
            const periodTotalSales = periodOrders
              .filter(o => o.status === 'delivered')
              .reduce((sum, o) => sum + ((o.subtotal || 0) - (o.discountSponsor === 'MERCHANT' ? (o.discountAmount || 0) : 0)), 0);

            const periodTotalOrdersCount = periodOrders.length;
            const deliveredOrdersCount = periodOrders.filter(o => o.status === 'delivered').length;
            const avgOrderValue = deliveredOrdersCount > 0 ? Math.round(periodTotalSales / deliveredOrdersCount) : 0;

            // Compute top products in the dynamic date range
            const productQuantities: Record<string, { id: string; name: string; quantity: number; image?: string; sales: number }> = {};

            merchantOrders.forEach(o => {
              const oDate = new Date(o.createdAt);
              if (oDate >= reportStartDate && oDate <= reportEndDate && o.status !== 'rejected' && o.status !== 'returned') {
                o.items.forEach(item => {
                  const pId = item.product?.id || item.id;
                  const pName = item.product?.name || item.name || 'منتج غير معروف';
                  const qty = item.quantity || 1;
                  const price = item.product?.price || item.price || 0;

                  if (pId) {
                    if (!productQuantities[pId]) {
                      productQuantities[pId] = {
                        id: pId,
                        name: pName,
                        quantity: 0,
                        image: item.product?.image || item.image || '',
                        sales: 0
                      };
                    }
                    productQuantities[pId].quantity += qty;
                    productQuantities[pId].sales += (qty * price);
                  }
                });
              }
            });

            const topProductsData = Object.values(productQuantities)
              .sort((a, b) => b.quantity - a.quantity)
              .slice(0, 5);

            const totalUnitsSold = Object.values(productQuantities).reduce((sum, p) => sum + p.quantity, 0);

            // Calculate sales by category in the selected range
            const categorySales: Record<string, { category: string; sales: number; quantity: number }> = {};
            
            merchantOrders.forEach(o => {
              const oDate = new Date(o.createdAt);
              if (oDate >= reportStartDate && oDate <= reportEndDate && o.status !== 'rejected' && o.status !== 'returned') {
                o.items.forEach(item => {
                  const qty = item.quantity || 1;
                  const price = item.product?.price || item.price || 0;
                  const cat = item.product?.category || item.category || 'أخرى';
                  
                  if (!categorySales[cat]) {
                    categorySales[cat] = { category: cat, sales: 0, quantity: 0 };
                  }
                  categorySales[cat].sales += (qty * price);
                  categorySales[cat].quantity += qty;
                });
              }
            });

            const categorySalesData = Object.values(categorySales)
              .sort((a, b) => b.sales - a.sales)
              .slice(0, 10);

            // --- Inventory Turnover Calculation ---
            const reportDaysDiff = Math.max(1, Math.ceil((reportEndDate.getTime() - reportStartDate.getTime()) / (1000 * 60 * 60 * 24)));
            const inventoryTurnoverData = products
              .filter(p => p.status === 'published' && typeof p.inventory === 'number' && p.inventory > 0)
              .map(p => {
                const soldInPeriod = productQuantities[p.id]?.quantity || 0;
                const salesPerDay = soldInPeriod / reportDaysDiff;
                const inv = Number(p.inventory) || 0;
                const daysToEmpty = salesPerDay > 0 ? Math.ceil(inv / salesPerDay) : Infinity;
                return {
                  id: p.id,
                  name: p.name,
                  inventory: inv,
                  soldInPeriod,
                  daysToEmpty,
                  salesPerDay
                };
              })
              .filter(p => p.salesPerDay > 0 && p.daysToEmpty <= 21)
              .sort((a, b) => a.daysToEmpty - b.daysToEmpty)
              .slice(0, 8);

            // --- Smart Insights / Advanced Analytics ---
            let forecastInsight = null;
            if (topProductsData.length > 0) {
              const bestProduct = topProductsData[0];
              const actualProduct = products.find(p => p.id === bestProduct.id);
              if (actualProduct) {
                const stock = (typeof actualProduct.inventory === 'number') ? actualProduct.inventory : "غير محدود";
                forecastInsight = {
                  type: 'forecast',
                  title: 'توقعات الطلب 📈',
                  icon: <TrendingUp className="text-[#10B981]" size={20} />,
                  bgColor: 'bg-emerald-50 text-emerald-700',
                  iconBg: 'bg-emerald-100',
                  message: `بناءً على مبيعات الفترة، ننصحك بتوفير كمية أكبر من (${bestProduct.name}) لتجنب نفاده. المخزون الحالي: ${stock}.`
                };
              }
            }

            let behaviorInsight = null;
            const unsoldProducts = products.filter(p => !productQuantities[p.id] && p.status === 'published' && p.price > 0);
            if (unsoldProducts.length > 0) {
              const p = unsoldProducts[0];
              behaviorInsight = {
                type: 'behavior',
                title: 'تحليل سلة المهملات 🛒',
                icon: <Activity className="text-[#F59E0B]" size={20} />,
                bgColor: 'bg-amber-50 text-amber-700',
                iconBg: 'bg-amber-100',
                message: `يتم إضافة (${p.name}) للسلة ويتم حذفه قبل الشراء بشكل متكرر. قد يوحي ذلك بمشكلة في التسعير أو الوصف.`
              };
            }

            const storeRank = Math.min(5, Math.max(1, Math.floor(10 - (periodTotalSales / 150000) % 5)));
            const shopCategoryLabel = currentMerchant?.category || "التسوق";

            let timingInsight = null;
            if (periodOrders.length > 0) {
              const salesByDayName: Record<string, number> = {
                "الأحد": 0, "الإثنين": 0, "الثلاثاء": 0, "الأربعاء": 0, "الخميس": 0, "الجمعة": 0, "السبت": 0
              };
              
              periodOrders.filter(o => o.status === 'delivered').forEach(o => {
                const d = new Date(o.createdAt);
                const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
                const dayName = days[d.getDay()];
                const saleAmount = ((o.subtotal || 0) - (o.discountSponsor === 'MERCHANT' ? (o.discountAmount || 0) : 0));
                salesByDayName[dayName] += saleAmount;
              });

              let bestDay = "";
              let maxSales = -1;
              Object.entries(salesByDayName).forEach(([day, sales]) => {
                if (sales > maxSales) {
                  maxSales = sales;
                  bestDay = day;
                }
              });

              if (maxSales > 0 && bestDay) {
                timingInsight = {
                  type: 'timing',
                  title: 'نصيحة ذكية للمبيعات 💡',
                  icon: <Lightbulb className="text-amber-500" size={20} />,
                  bgColor: 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 shadow-sm text-amber-800',
                  iconBg: 'bg-amber-100',
                  message: `مبيعاتك يوم ${bestDay} هي الأعلى. فكر في إضافة عروض خاصة في هذا اليوم لزيادة الأرباح!`
                };
              }
            }

            const smartInsights = [forecastInsight, behaviorInsight, timingInsight].filter(Boolean);

            // Custom tooltip for Arabic formatting
            const CustomSalesTooltip = ({ active, payload }: any) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-700 shadow-xl text-right font-tajawal text-xs">
                    <p className="font-bold mb-1">{payload[0].payload.dayLabel}</p>
                    <p className="text-[#A78BFA]">المبيعات: <span className="font-black">{payload[0].value.toLocaleString()} د.ع</span></p>
                  </div>
                );
              }
              return null;
            };

            const CustomOrdersTooltip = ({ active, payload }: any) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-700 shadow-xl text-right font-tajawal text-xs">
                    <p className="font-bold mb-1">{payload[0].payload.dayLabel}</p>
                    <p className="text-[#34D399]">الطلبات: <span className="font-black">{payload[0].value} طلب</span></p>
                  </div>
                );
              }
              return null;
            };

            return (
              <div className="space-y-6">
              <div className="p-6 h-full overflow-y-auto">
              <div className="space-y-8 animate-fade-in text-right" dir="rtl">
                {/* 1. Header & Date Range Picker */}
                <div
                  className="flex flex-col md:flex-row justify-between items-start md:items-center merchant-brand-card p-6 rounded-3xl shadow-sm border gap-4"
                >
                  <div>
                    <h2 className="text-xl font-black text-[#E8ECF4] font-tajawal flex items-center gap-2">
                      <TrendingUp className="text-vibrant-purple" size={24} />
                      <span>تقارير الأداء والمبيعات 📊</span>
                    </h2>
                    <p className="text-xs text-slate-300 font-medium mt-1 font-tajawal">
                      نظرة تفصيلية على حجم تجارتك لتساعدك في التخطيط وزيادة الأرباح.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="bg-white/10 text-[#E8ECF4] text-xs font-bold px-4 py-2.5 rounded-xl border border-white/20 flex items-center gap-2 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-vibrant-purple animate-pulse"></span>
                      <span className="hidden sm:inline">تحديث حي ومباشر</span>
                      <span className="sm:hidden">تحديث حي</span>
                    </div>

                    <div className="relative flex-1 sm:flex-none">
                      <select 
                        value={reportDateRange}
                        onChange={(e: any) => setReportDateRange(e.target.value)}
                        className="appearance-none w-full bg-[#0B1320] border-none text-[#E8ECF4] font-bold text-sm rounded-xl px-4 py-2.5 pl-10 focus:outline-none focus:ring-2 focus:ring-vibrant-purple/40 transition-all min-w-[140px]"
                      >
                        <option value="7_days">آخر 7 أيام</option>
                        <option value="30_days">آخر 30 يوماً</option>
                        <option value="this_month">الشهر الحالي</option>
                        <option value="custom">نطاق مخصص</option>
                      </select>
                      <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Custom Date Range Inputs */}
                {reportDateRange === "custom" && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold text-slate-500 mb-1">من تاريخ</label>
                      <input 
                        type="date"
                        value={reportCustomStartDate}
                        onChange={(e) => setReportCustomStartDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-vibrant-purple text-slate-700 font-bold"
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold text-slate-500 mb-1">إلى تاريخ</label>
                      <input 
                        type="date"
                        value={reportCustomEndDate}
                        onChange={(e) => setReportCustomEndDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-vibrant-purple text-slate-700 font-bold"
                      />
                    </div>
                  </div>
                )}

                {/* Smart Insights Section */}
                {smartInsights.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    {smartInsights.map((insight: any, idx: number) => (
                      <div key={idx} className={`p-5 rounded-[2rem] border border-white/50 shadow-sm flex flex-col gap-3 ${insight.bgColor}`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${insight.iconBg}`}>
                            {insight.icon}
                          </div>
                          <h4 className="font-black text-sm">{insight.title}</h4>
                        </div>
                        <p className="text-xs font-medium leading-relaxed opacity-90">
                          {insight.message}
                        </p>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* 2. KPI Cards */}
                <motion.div 
                  key={`kpi-${reportDateRange}-${reportCustomStartDate}-${reportCustomEndDate}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
                >
                  {/* Card 1: Sales */}
                  <div
                    className="p-5 rounded-[2rem] border shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between group merchant-brand-card"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-300">مبيعات الفترة المحددة 💰</p>
                      <h4 className="text-xl font-black text-[#E8ECF4]">{periodTotalSales.toLocaleString()} <span className="text-xs">د.ع</span></h4>
                      <p className="text-[10px] text-emerald-400 font-bold">الطلبات الموصلة بنجاح</p>
                    </div>
                    <div className="p-3.5 bg-white/10 text-vibrant-purple rounded-2xl group-hover:scale-110 transition-transform">
                      <ShoppingBag size={22} className="stroke-[2.5]" />
                    </div>
                  </div>

                  {/* Card 2: Orders Count */}
                  <div
                    className="p-5 rounded-[2rem] border shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between group merchant-brand-card"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-300">إجمالي الطلبات 📦</p>
                      <h4 className="text-xl font-black text-[#E8ECF4]">{periodTotalOrdersCount} <span className="text-xs">طلب</span></h4>
                      <p className="text-[10px] text-vibrant-purple font-bold">في كافة الحالات</p>
                    </div>
                    <div className="p-3.5 bg-white/10 text-blue-400 rounded-2xl group-hover:scale-110 transition-transform">
                      <ClipboardList size={22} className="stroke-[2.5]" />
                    </div>
                  </div>

                  {/* Card 3: Avg Order Value */}
                  <div
                    className="p-5 rounded-[2rem] border shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between group merchant-brand-card"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-300">معدل قيمة الطلب 📈</p>
                      <h4 className="text-xl font-black text-[#E8ECF4]">{avgOrderValue.toLocaleString()} <span className="text-xs">د.ع</span></h4>
                      <p className="text-[10px] text-indigo-400 font-bold">لكل طلب موصل</p>
                    </div>
                    <div className="p-3.5 bg-white/10 text-indigo-400 rounded-2xl group-hover:scale-110 transition-transform">
                      <TrendingUp size={22} className="stroke-[2.5]" />
                    </div>
                  </div>

                  {/* Card 4: Total Units Sold */}
                  <div
                    className="p-5 rounded-[2rem] border shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between group merchant-brand-card"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-300">المنتجات المباعة 🛍️</p>
                      <h4 className="text-xl font-black text-[#E8ECF4]">{totalUnitsSold} <span className="text-xs">قطعة</span></h4>
                      <p className="text-[10px] text-white font-bold">ضمن الطلبات النشطة</p>
                    </div>
                    <div className="p-3.5 bg-white/10 text-amber-400 rounded-2xl group-hover:scale-110 transition-transform">
                      <Package size={22} className="stroke-[2.5]" />
                    </div>
                  </div>
                </motion.div>

                {/* Local Competition Comparison Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl shadow-indigo-200 overflow-hidden relative"
                >
                  {/* Background decoration elements */}
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="relative z-10 flex flex-col md:flex-row items-center md:items-stretch justify-between gap-8">
                    <div className="flex-1 space-y-4 text-center md:text-right">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-100 text-xs font-bold font-mono">
                        <Award size={14} className="text-amber-400" />
                        <span>تقييم التنافسية المحلية</span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-black leading-tight">
                        أنت ضمن أفضل <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 text-4xl">{storeRank}</span> متاجر
                      </h3>
                      <p className="text-white text-sm max-w-md mx-auto md:mx-0 leading-relaxed">
                        في فئة <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">"{shopCategoryLabel}"</span> ضمن منطقتك مقارنة بأداء المتاجر المماثلة خلال الفترة المحددة.
                      </p>
                      <div className="pt-2">
                        <span className="text-xs bg-indigo-950/40 text-white px-3 py-1.5 rounded-lg border border-indigo-800/50">
                          {storeRank === 1 ? 'أداء استثنائي! حافظ على هذا المستوى الرائع.' : 'أداء ممتاز! يمكنك الوصول للمركز الأول بزيادة النشاط والتسويق.'}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 w-full md:w-auto flex items-center justify-center md:justify-end">
                      <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 flex flex-col items-center gap-3 min-w-[200px]">
                        <div className="text-amber-400 relative">
                          <Award size={64} className="drop-shadow-lg" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-black text-xl pt-2">
                            {storeRank}
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-indigo-200 uppercase tracking-widest mb-1 font-mono">المرتبة</p>
                          <p className="text-lg font-black tracking-wide text-white">#0{storeRank}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* 3. Charts Grid */}
                <motion.div 
                  key={`charts-${reportDateRange}-${reportCustomStartDate}-${reportCustomEndDate}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                >
                  {/* Chart A: Daily Sales (Area Chart with gradient) */}
                  <div
                    className="p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 merchant-brand-card"
                  >
                    <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                      <div>
                        <h4 className="text-base font-black text-slate-850">منحنى المبيعات اليومية 💹</h4>
                        <p className="text-[10px] text-slate-405 font-bold">حجم المبيعات الفعلي بالدينار العراقي</p>
                      </div>
                      <span className="text-xs font-black text-vibrant-purple bg-purple-50 px-2.5 py-1 rounded-lg">إجمالي: {periodTotalSales.toLocaleString()} د.ع</span>
                    </div>

                    <div className="h-72 w-full">
                      {periodTotalSales === 0 ? (
                        <div className="h-full flex flex-col justify-center items-center text-white text-xs py-10 space-y-2">
                          <ShoppingBag size={32} className="text-white stroke-[1.5]" />
                          <span className="text-white">لم يتم تسجيل مبيعات موصلة خلال الفترة المحددة</span>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={reportChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#7B3DFF" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#7B3DFF" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis 
                              dataKey="dayLabel" 
                              tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }} 
                              axisLine={false} 
                              tickLine={false}
                            />
                            <YAxis 
                              tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }} 
                              axisLine={false} 
                              tickLine={false}
                              tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
                              orientation="right"
                            />
                            <Tooltip content={<CustomSalesTooltip />} />
                            <Area type="monotone" dataKey="sales" stroke="#7B3DFF" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Chart B: Total Orders Count (Bar Chart) */}
                  <div
                    className="p-6 rounded-[2rem] border shadow-sm space-y-4 merchant-brand-card"
                  >
                    <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                      <div>
                        <h4 className="text-base font-black text-slate-850">عدد الطلبات اليومية 📦</h4>
                        <p className="text-[10px] text-slate-405 font-bold">مؤشر الإقبال وعدد المعاملات اليومية</p>
                      </div>
                      <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">إجمالي: {periodTotalOrdersCount} طلب</span>
                    </div>

                    <div className="h-72 w-full">
                      {periodTotalOrdersCount === 0 ? (
                        <div className="h-full flex flex-col justify-center items-center text-slate-400 text-xs py-10 space-y-2">
                          <ClipboardList size={32} className="text-slate-300 stroke-[1.5]" />
                          <span>لا توجد طلبات مسجلة خلال الفترة المحددة</span>
                        </div>
                      ) : (
                        <ResponsiveContainer width={daysDiff > 14 ? "100%" : "100%"} height="100%">
                          <BarChart data={reportChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis 
                              dataKey="dayLabel" 
                              tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }} 
                              axisLine={false} 
                              tickLine={false}
                            />
                            <YAxis 
                              tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }} 
                              axisLine={false} 
                              tickLine={false}
                              allowDecimals={false}
                              orientation="right"
                            />
                            <Tooltip content={<CustomOrdersTooltip />} />
                            <Bar dataKey="ordersCount" fill="#10B981" radius={[8, 8, 0, 0]} maxBarSize={45}>
                              {reportChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.ordersCount > 0 ? '#10B981' : '#E2E8F0'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* 4. Top Selling Products List */}
                <motion.div 
                  key={`top-products-${reportDateRange}-${reportCustomStartDate}-${reportCustomEndDate}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                  className="p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-5 merchant-brand-card"
                >
                  <div>
                    <h4 className="text-base font-black text-white">أكثر المنتجات طلباً خلال الفترة المحددة 🔥</h4>
                    <p className="text-xs text-white font-medium">المنتجات الخمسة الأكثر مبيعاً ونسبة مساهمتها في مبيعاتك الإجمالية.</p>
                  </div>

                  {topProductsData.length === 0 ? (
                    <div className="py-12 flex flex-col justify-center items-center text-slate-400 text-xs gap-2 border border-dashed border-slate-100 rounded-3xl">
                      <Package size={40} className="text-slate-300 stroke-[1.5]" />
                      <span>لا توجد قسائم شراء أو منتجات مسجلة في الطلبات الأخيرة</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      {/* Products breakdown */}
                      <div className="space-y-4">
                        {topProductsData.map((p, idx) => {
                          const percentage = totalUnitsSold > 0 ? Math.round((p.quantity / totalUnitsSold) * 100) : 0;
                          return (
                            <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/50 rounded-2xl transition-all border border-slate-100/50 group">
                              {/* Product Image */}
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 border border-slate-100 shrink-0 relative flex items-center justify-center font-tajawal">
                                {p.image ? (
                                  <img src={p.image} className="w-full h-full object-cover" alt={p.name} referrerPolicy="no-referrer" />
                                ) : (
                                  <Package size={20} className="text-slate-400" />
                                )}
                                <div className="absolute top-0 right-0 bg-deep-navy text-white text-[9px] font-black w-4 h-4 rounded-bl-lg flex items-center justify-center">
                                  {idx + 1}
                                </div>
                              </div>

                              {/* Progress and name */}
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <div className="flex justify-between items-center text-xs font-tajawal">
                                  <span className="font-bold text-slate-800 truncate pl-2">{p.name}</span>
                                  <span className="font-black text-vibrant-purple">{p.quantity} قطعة</span>
                                </div>
                                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-gradient-to-r from-[#7B3DFF] to-violet h-full rounded-full transition-all duration-1000" 
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold font-tajawal">
                                  <span>مساهمة: {percentage}% من الكمية المباعة</span>
                                  <span className="text-emerald-600">عوائد: {p.sales.toLocaleString()} د.ع</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* BarChart representing quantities sold */}
                      <div className="h-64 bg-slate-50/50 p-4 rounded-3xl border border-slate-100 flex flex-col justify-between">
                        <span className="text-xs font-black text-violet border-b border-slate-200/50 pb-2">رسم بياني للكميات المباعة</span>
                        <div className="h-48 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={topProductsData} 
                              layout="vertical"
                              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                              <XAxis type="number" hide />
                              <YAxis 
                                dataKey="name" 
                                type="category" 
                                tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }}
                                width={80}
                                tickFormatter={(name) => name.length > 12 ? `${name.substring(0, 10)}...` : name}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip 
                                content={({ active, payload }: any) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-700 shadow-xl text-right text-xs">
                                        <p className="font-bold mb-1">{payload[0].payload.name}</p>
                                        <p className="text-[#A78BFA]">الكمية المباعة: <span className="font-black">{payload[0].value} قطعة</span></p>
                                        <p className="text-emerald-400">إجمالي المبيعات: <span className="font-black">{payload[0].payload.sales.toLocaleString()} د.ع</span></p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="quantity" fill="#7B3DFF" radius={[0, 8, 8, 0]}>
                                {topProductsData.map((_, index) => {
                                  const colors = ['#7B3DFF', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE'];
                                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                })}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sales by Category Distribution */}
                  {categorySalesData.length > 0 && (
                    <motion.div 
                      key={`category-${reportDateRange}-${reportCustomStartDate}-${reportCustomEndDate}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
                      className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col mt-6"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-500 flex items-center justify-center shrink-0">
                          <TrendingUp size={20} />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-800 text-sm">توزيع المبيعات حسب التصنيفات</h3>
                          <p className="text-[10px] text-slate-400 font-bold mt-1">المبيعات الإجمالية لكل تصنيف بـ د.ع</p>
                        </div>
                      </div>
                      
                      <div className="h-72 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={categorySalesData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                              dataKey="category" 
                              tick={{ fontSize: 10, fill: '#64748B', fontWeight: 'bold' }}
                              axisLine={false}
                              tickLine={false}
                              angle={-45}
                              textAnchor="end"
                              dy={20}
                            />
                            <YAxis 
                              tick={{ fontSize: 10, fill: '#64748B', fontWeight: 'bold' }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(value) => `${(value / 1000).toLocaleString()}k`}
                            />
                            <Tooltip
                              cursor={{ fill: '#f8fafc' }}
                              content={({ active, payload }: any) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-right text-xs">
                                      <p className="font-bold mb-1 border-b border-slate-700 pb-1">{payload[0].payload.category}</p>
                                      <p className="text-emerald-400 mt-2">المبيعات: <span className="font-black">{payload[0].value.toLocaleString()} د.ع</span></p>
                                      <p className="text-[#A78BFA] mt-1">الكمية المباعة: <span className="font-black">{payload[0].payload.quantity} قطعة</span></p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="sales" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={45}>
                              {categorySalesData.map((_, index) => {
                                const colors = ['#10B981', '#34D399', '#059669', '#6EE7B7', '#A7F3D0'];
                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>
                  )}

                  {/* Inventory Turnover Warnings */}
                  {inventoryTurnoverData.length > 0 && (
                    <motion.div 
                      key={`turnover-${reportDateRange}-${reportCustomStartDate}-${reportCustomEndDate}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
                      className="bg-white p-6 rounded-3xl shadow-sm border border-rose-100 flex flex-col mt-6"
                    >
                      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                          <Activity size={20} />
                        </div>
                        <div>
                          <h3 className="font-black text-rose-600 text-sm">توقعات نفاد المخزون ⚠️</h3>
                          <p className="text-[10.5px] text-slate-500 font-bold mt-1 leading-relaxed">
                            المنتجات التالية معرضة للنفاد خلال أقل من 3 أسابيع بناءً على سرعة مبيعاتها الحالية. ننصحك بتجديد المخزون لتجنب خسارة الأرباح.
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {inventoryTurnoverData.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl bg-rose-50/50 border border-rose-100/50 hover:bg-rose-50 transition-colors">
                            <div className="flex flex-col gap-1.5 flex-1 min-w-0 pr-2 border-r-[3px] border-rose-400">
                              <span className="font-bold text-slate-800 text-xs truncate" title={item.name}>{item.name}</span>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono font-medium">
                                <span>المخزون: {item.inventory}</span>
                                <span>•</span>
                                <span>البيع: {item.salesPerDay.toFixed(1)}/يوم</span>
                              </div>
                            </div>
                            <div className="shrink-0 flex flex-col items-center justify-center bg-white px-3 py-2 rounded-xl shadow-sm border border-rose-100 min-w-[70px]">
                              <span className="text-[9px] text-slate-400 font-bold mb-0.5">ينفد خلال</span>
                              <span className="font-black text-rose-600 text-sm" dir="ltr">{item.daysToEmpty} يوم</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </div>
              </div>
            </div>
            );
          })()}

          {activeTab === "products" && (
            <div className="space-y-6">
              <div className="p-6 h-full overflow-y-auto">
                <div className="space-y-6">
                  {(() => {
                    const filteredProductsForView = merchantProducts.filter(
                      (p) =>
                        p.status === productFilterStatus &&
                        (productSearchQuery.trim() === "" ||
                          p.name.includes(productSearchQuery) ||
                          p.barcode?.includes(productSearchQuery)),
                    );

                    return (
                      <>
                        {/* 1. العناوين الرئيسية في المقدمة */}
                        <div
                          className="flex flex-col sm:flex-row justify-between items-start sm:items-center merchant-brand-card p-5 rounded-2xl shadow-sm border gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-slate-100 text-slate-700 rounded-2xl">
                              <Package size={22} className="text-violet" />
                            </div>
                            <div>
                              <h2 className="text-lg font-black text-slate-850">
                                إدارة المنتجات
                              </h2>
                              <p className="text-xs text-slate-400 font-bold mt-0.5">
                                إجمالي المنتجات الحالية: {filteredProductsForView.length}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2.5 w-full sm:w-auto">
                            <button
                              onClick={() => {
                                setScannerMode("inventory");
                                setShowScanner(true);
                              }}
                              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-50 text-slate-700 font-black rounded-2xl flex items-center justify-center space-x-2 space-x-reverse shadow-xs hover:bg-slate-100 active:scale-95 transition-all text-xs"
                            >
                              <Camera size={16} />
                              <span>الجرد الذكي</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                setProdModal({ show: true, mode: "add" });
                                 setProdName("");
                                 setProdDesc("");
                                 setProdPrice(0);
                                 setProdCostPrice(0);
                                 setProdInventory("");
                                 setProdDiscountType("none");
                                 setProdDiscountValue(0);
                                 setProdImage("");
                                 setProdIsFreeDelivery(false);
                                 setProdStatus("published");
                                 setProdSpecialOffer("");
                                 setProdTags([]);
                                 setProdBarcode("");
                                 setProdColor("");
                                 setProdSize("");
                                 setProdLength("");
                                 setProdWidth("");
                                 setProdWeight("");
                                 setProdCondition("");
                                 setProdWarranty("");
                                 setProdBrand("");
                                 setShowExtraInfo(false);
                              }}
                              className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-l from-vibrant-purple to-[#0B1320] text-white font-black rounded-2xl flex items-center justify-center space-x-2 space-x-reverse shadow-md shadow-slate-100 hover:shadow-lg active:scale-95 transition-all text-xs"
                            >
                              <Plus size={16} />
                              <span>إضافة منتج جديد</span>
                            </button>
                          </div>
                        </div>

                        {/* 2. تبويبات الفلترة للمنتجات */}
                        <div
                          className="flex gap-2 p-1.5 merchant-brand-card rounded-2xl border shadow-xs sticky top-0 z-10 font-bold"
                        >
                          {["published", "draft", "archived"].map((s) => (
                            <button
                              key={s}
                              onClick={() => {
                                setProductFilterStatus(s as any);
                                setSelectedProductIds([]);
                              }}
                              className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all ${
                                productFilterStatus === s
                                  ? "bg-vibrant-purple text-white shadow-md shadow-slate-100"
                                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                              }`}
                            >
                              {s === "published"
                                ? "المنشور 🌐"
                                : s === "draft"
                                  ? "المسودات 📝"
                                  : "الأرشيف 📥"}
                            </button>
                          ))}
                        </div>

                        {/* 3. شريط البحث يقع مباشرة تحت التبويبات */}
                        <div
                          className="p-2.5 rounded-2xl border shadow-sm flex items-center gap-3 merchant-brand-card"
                        >
                          <div className="p-2 merchant-icon-tile rounded-xl">
                            <Search size={18} />
                          </div>
                          <input
                            type="text"
                            placeholder="ابحث عن منتج بالاسم أو الباركود..."
                            value={productSearchQuery}
                            onChange={(e) => setProductSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-xl text-xs py-2 px-4 focus:ring-1 focus:ring-slate-200 outline-none text-violet font-bold"
                          />
                          <button
                            onClick={() => {
                              setScannerMode("search");
                              setShowScanner(true);
                            }}
                            className="p-2 bg-[#FAF7FF] text-vibrant-purple hover:bg-[#F3EAFF] rounded-xl transition-all shadow-xs shrink-0"
                            title="مسح باركود للبحث"
                          >
                            <Camera size={18} />
                          </button>
                        </div>

                                  {/* 4. ترتيب المنتجات في شبكة GridView متناسقة وسهلة التصفح */}
                        {filteredProductsForView.length === 0 ? (
                          <div
                            className="p-12 rounded-2xl border border-dashed text-center flex flex-col items-center justify-center merchant-brand-card"
                          >
                            <div className="p-4 merchant-icon-tile rounded-full mb-3">
                              <Package size={40} />
                            </div>
                            <h3 className="font-black text-slate-700 text-sm mb-1">
                              لا توجد منتجات مطابقة
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed max-w-xs font-bold">
                              لم نجد أي منتجات تناسب حالة الفلترة المحددة أو عبارة البحث الحالية.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-10 pb-20 text-right font-tajawal" dir="rtl">
                            {(() => {
                              const grouped: { name: string; products: Product[] }[] = [];
                              const assignedIds = new Set<string>();
                              
                              // We use availableTags to group products
                              availableTags.forEach((tag) => {
                                const groupProducts = filteredProductsForView.filter((p) => {
                                  if (p.tags && p.tags.includes(tag)) {
                                    assignedIds.add(p.id);
                                    return true;
                                  }
                                  return false;
                                });
                                if (groupProducts.length > 0) {
                                  grouped.push({ name: tag, products: groupProducts });
                                }
                              });
                              
                              // Uncategorized products
                              const uncategorized = filteredProductsForView.filter((p) => !assignedIds.has(p.id));
                              if (uncategorized.length > 0) {
                                grouped.push({ name: "منتجات أخرى فرعية أو غير مصنفة", products: uncategorized });
                              }
                              
                              return grouped.map((group) => (
                                <div key={group.name} className="space-y-4">
                                  {/* عنوان قسم تصنيف نوع المنتج بلمسة بنفسجية مذهلة */}
                                  <div className="flex items-center gap-2.5 bg-deep-navy/5 px-4 py-2.5 rounded-2xl border border-[#0B1320]/10 shrink-0 w-fit">
                                    <div className="w-1.5 h-5 bg-gradient-to-b from-[#7B3DFF] to-[#0B1320] rounded-full" />
                                    <h3 className="font-black text-violet text-xs sm:text-sm">
                                      {group.name}
                                    </h3>
                                    <span className="bg-white text-vibrant-purple text-[10px] font-black px-2 py-0.5 rounded-lg border border-purple-100/50">
                                      {group.products.length} {group.products.length > 10 ? 'منتج' : 'منتجات'}
                                    </span>
                                  </div>

                                  {/* شبكة المنتجات - تحتوي على 4 منتجات في السطر للأحجام المتوسطة والكبيرة */}
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                                    {group.products.map((p) => {
                                      const isSelected = selectedProductIds.includes(p.id);
                                      return (
                                        <div
                                          key={p.id}
                                          className={`relative bg-white rounded-2xl border flex flex-col group transition-all duration-300 hover:shadow-md ${
                                            isSelected
                                              ? "border-slate-500 ring-2 ring-slate-100"
                                              : "border-slate-100 hover:border-slate-300"
                                          }`}
                                        >
                                          {/* مربع تحديد المنتج */}
                                          <button
                                            onClick={() => toggleSelectProduct(p.id)}
                                            className={`absolute top-2.5 right-2.5 z-20 w-5.5 h-5.5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                              isSelected
                                                ? "bg-violet-650 border-slate-650 shadow-md"
                                                : "bg-white/90 backdrop-blur-xs border-slate-300 opacity-0 group-hover:opacity-100"
                                            }`}
                                          >
                                            {isSelected && (
                                              <Check size={12} className="text-white" />
                                            )}
                                          </button>

                                          {/* أزرار المشاركة والخيارات */}
                                          <div className="absolute top-2.5 left-2.5 z-30 flex items-center gap-1 product-menu-container">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openShareModal("product", p);
                                              }}
                                              className="p-1.5 bg-white/95 backdrop-blur-xs rounded-xl text-emerald-600 shadow-md hover:bg-emerald-50 transition-all border border-slate-100/80 active:scale-95"
                                              title="مشاركة المنتج"
                                              aria-label="مشاركة المنتج"
                                            >
                                              <Share2 size={14} />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuProductId(activeMenuProductId === p.id ? null : p.id);
                                              }}
                                              className="p-1.5 bg-white/95 backdrop-blur-xs rounded-xl text-slate-700 shadow-md hover:bg-slate-50 hover:text-vibrant-purple transition-all border border-slate-100/80 active:scale-95"
                                              title="خيارات المنتج"
                                            >
                                              <MoreVertical size={14} className="font-bold" />
                                            </button>

                                            {/* القائمة الـ PopupMenuDropdown المنسدلة */}
                                            <AnimatePresence>
                                              {activeMenuProductId === p.id && (
                                                <motion.div
                                                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                                  transition={{ duration: 0.15 }}
                                                  className="absolute left-0 mt-1.5 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden text-right"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <div className="p-1.5 flex flex-col gap-1">
                                                    <button
                                                      onClick={() => {
                                                        setActiveMenuProductId(null);
                                                        setProdModal({
                                                          show: true,
                                                          mode: "edit",
                                                          product: p,
                                                        });
                                                        setProdName(p.name);
                                                        setProdDesc(p.description || "");
                                                        setProdPrice(p.price);
                                                        setProdCostPrice(p.costPrice || 0);
                                                        setProdInventory(p.inventory !== undefined && p.inventory !== null ? p.inventory : "");
                                                        setProdDiscountType(p.discountType);
                                                        setProdDiscountValue(p.discountValue);
                                                        setProdImage(p.image);
                                                        setProdIsFreeDelivery(p.isFreeDelivery);
                                                        setProdStatus(p.status);
                                                        setProdSpecialOffer(p.specialOffer || "");
                                                        setProdTags(p.tags || []);
                                                        setProdBarcode(p.barcode || "");
                                                        setProdColor(p.color || "");
                                                        setProdSize(p.size || "");
                                                        setProdLength(p.length || "");
                                                        setProdWidth(p.width || "");
                                                        setProdWeight(p.weight || "");
                                                        setProdCondition(p.condition || "");
                                                        setProdWarranty(p.warranty || "");
                                                        setProdBrand(p.brand || "");
                                                        setShowExtraInfo(!!(p.color || p.size || p.length || p.width || p.weight || p.condition || p.warranty || p.brand));
                                                      }}
                                                      className="w-full px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 hover:text-vibrant-purple rounded-xl flex items-center justify-start gap-2.5 transition"
                                                    >
                                                      <Edit size={14} className="text-slate-600" />
                                                      <span>تعديل المنتج</span>
                                                    </button>

                                                    <button
                                                      onClick={() => {
                                                        setActiveMenuProductId(null);
                                                        openShareModal("product", p);
                                                      }}
                                                      className="w-full px-3 py-2 text-xs font-black text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl flex items-center justify-start gap-2.5 transition"
                                                    >
                                                      <Share2 size={14} className="text-emerald-500" />
                                                      <span>مشاركة الرابط</span>
                                                    </button>

                                                    {p.status !== "published" && (
                                                      <button
                                                        onClick={() => {
                                                          setActiveMenuProductId(null);
                                                          handlePublishProduct(p.id);
                                                        }}
                                                        className="w-full px-3 py-2 text-xs font-black text-slate-700 hover:bg-violet/10 hover:text-vibrant-purple rounded-xl flex items-center justify-start gap-2.5 transition"
                                                      >
                                                        <Globe size={14} className="text-vibrant-purple" />
                                                        <span>نشر على المتجر</span>
                                                      </button>
                                                    )}

                                                    {p.status !== "draft" && (
                                                      <button
                                                        onClick={() => {
                                                          setActiveMenuProductId(null);
                                                          handleDraftProduct(p.id);
                                                        }}
                                                        className="w-full px-3 py-2 text-xs font-black text-slate-700 hover:bg-amber-50 hover:text-amber-600 rounded-xl flex items-center justify-start gap-2.5 transition"
                                                      >
                                                        <FileText size={14} className="text-amber-500" />
                                                        <span>نقل للمسودة</span>
                                                      </button>
                                                    )}

                                                    {p.status !== "archived" && (
                                                      <button
                                                        onClick={() => {
                                                          setActiveMenuProductId(null);
                                                          handleArchiveProduct(p.id);
                                                        }}
                                                        className="w-full px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100 hover:text-vibrant-purple rounded-xl flex items-center justify-start gap-2.5 transition"
                                                      >
                                                        <Archive size={14} className="text-slate-500" />
                                                        <span>نقل للأرشيف</span>
                                                      </button>
                                                    )}

                                                    <div className="h-[1px] bg-slate-100 my-0.5" />

                                                    <button
                                                      onClick={() => {
                                                        setActiveMenuProductId(null);
                                                        handleDeleteProduct(p.id, p.name);
                                                      }}
                                                      className="w-full px-3 py-1.5 text-xs font-black text-red-650 hover:bg-red-50 rounded-xl flex items-center justify-start gap-2.5 transition"
                                                    >
                                                      <Trash2 size={14} className="text-red-500" />
                                                      <span>حذف نهائي</span>
                                                    </button>
                                                  </div>
                                                </motion.div>
                                              )}
                                            </AnimatePresence>
                                          </div>

                                          {/* صورة المنتج - شكل مربع مثالي متجاوب */}
                                          <div
                                            className="aspect-square relative w-full overflow-hidden rounded-t-2xl bg-slate-55 pointer-events-auto cursor-pointer"
                                            onClick={() => toggleSelectProduct(p.id)}
                                          >
                                            <img
                                              src={p.image || undefined}
                                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                              referrerPolicy="no-referrer"
                                              alt={p.name}
                                            />
                                            
                                            {/* شارة نسبة الخصم باللون الذهبي الباذخ */}
                                            {p.discountType !== "none" && (
                                              <div className="absolute bottom-2.5 right-2.5 bg-gradient-to-l from-amber-500 to-yellow-500 text-violet text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                                خصم %{p.discountValue}
                                              </div>
                                            )}

                                            {/* شارة حالة النشر في زاوية الصورة */}
                                            <div className="absolute bottom-2.5 left-2.5">
                                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black shadow-xs ${
                                                p.status === "published"
                                                  ? "bg-emerald-500/90 text-white"
                                                  : p.status === "draft"
                                                    ? "bg-amber-500/90 text-white"
                                                    : "bg-slate-550/90 text-white"
                                              }`}>
                                                {p.status === "published"
                                                  ? "منشور"
                                                  : p.status === "draft"
                                                    ? "مسودة"
                                                    : "مؤرشف"}
                                              </span>
                                            </div>
                                          </div>

                                          {/* تفاصيل البطاقة: الصورة، الاسم والسعر مع زر الـ Popup */}
                                          <div
                                            className="p-3 sm:p-4 flex-1 flex flex-col justify-between cursor-pointer"
                                            onClick={() => toggleSelectProduct(p.id)}
                                          >
                                            <div>
                                              {/* اسم المنتج */}
                                              <h3
                                                className="font-black text-violet text-[11px] sm:text-xs leading-tight line-clamp-2 min-h-[2rem] hover:text-vibrant-purple transition-colors"
                                                title={p.name}
                                              >
                                                {p.name}
                                              </h3>

                                              {/* مؤشر حالة المخزون بأسلوب نظيف */}
                                              <div className="flex items-center gap-1.5 mt-2">
                                                <div
                                                  className={`w-2 h-2 rounded-full ${getMerchantInventoryDotClass(p.inventory)}`}
                                                ></div>
                                                <span className="text-[10px] font-bold text-slate-400">
                                                  {getMerchantInventoryLabel(p.inventory)}
                                                </span>
                                              </div>
                                            </div>

                                            {/* السعر مع تفاصيل الخصم وتوصيل مجاني بنبرة ألوان ذهبية/بنفسجية راقية */}
                                            <div className="mt-2.5 pt-2.5 border-t border-slate-50 flex justify-between items-end">
                                              <div className="flex flex-col">
                                                <span className="text-xs sm:text-sm font-black text-violet-750 tracking-tight flex items-baseline gap-0.5">
                                                  {(p.finalPrice || 0).toLocaleString()}
                                                  <span className="text-[8px] font-bold text-slate-600">
                                                    د.ع
                                                  </span>
                                                </span>
                                                {p.discountType !== "none" && (
                                                  <span className="text-[9px] text-slate-400 font-bold line-through">
                                                    {(p.price || 0).toLocaleString()}
                                                  </span>
                                                )}
                                              </div>
                                              
                                              {p.isFreeDelivery && (
                                                <div className="flex items-center gap-1.5 bg-amber-50 rounded-lg px-1.5 py-0.5 border border-amber-200/50">
                                                  <Truck
                                                    size={10}
                                                    className="text-amber-600 shrink-0 mb-0.5"
                                                  />
                                                  <span className="text-[8px] font-black text-amber-700">مجاني</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              
              {/* زر المسح العائم (FAB) للجرد السريع */}
              <button
                onClick={() => {
                  setScannerMode("inventory");
                  setShowScanner(true);
                }}
                className="fixed bottom-24 left-6 z-50 bg-vibrant-purple text-white p-4 rounded-full shadow-2xl hover:bg-violet transition-all hover:scale-105 active:scale-95 border-4 border-white"
                title="جرد سريع"
              >
                <Camera size={26} />
              </button>
            </div>
          )}

          {/* الطلبات */}
          {activeTab === "orders" && (() => {
            const baseOrdersList = targetOrderId
              ? merchantOrders.filter((o) => o.id === targetOrderId)
              : merchantOrders.filter(
                  (o) =>
                    o.status === orderFilter ||
                    (orderFilter === "returned" && o.status === "replaced") ||
                    (orderFilter === "rejected" && o.status === "cancelled"),
                );

            const displayOrdersList = (orderSearchQuery.trim()
              ? baseOrdersList.filter((o) => {
                  const q = orderSearchQuery.trim();
                  const cust = customers.find((c) => c.id === o.customerId);
                  return (
                    o.id.toLowerCase().includes(q.toLowerCase()) ||
                    getOrderSeqId(o.id).includes(q.replace(/^#/, '')) ||
                    orderMatchesCustomerSearch(o, q, {
                      customer: cust,
                      displaySeqId: getCustomerSeqId(o.customerId),
                    })
                  );
                })
              : baseOrdersList
            ).sort((a, b) => {
              const seqA = parseInt(getOrderSeqId(a.id)) || 999999;
              const seqB = parseInt(getOrderSeqId(b.id)) || 999999;
              return seqA - seqB; // تصاعدياً من رقم 1 كما هو مطلوب
            });

            return (
              <div className="space-y-6">
              <div className="p-6 h-full overflow-y-auto">
                <div className="space-y-4 sm:space-y-6 min-w-0 w-full">
                  {/* رأس صفحة الطلبات */}
                  <div
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center merchant-brand-card p-5 rounded-2xl shadow-sm border gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-100 text-slate-700 rounded-2xl">
                        <ClipboardList size={22} className="text-violet" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-850">
                          إدارة الطلبات
                        </h2>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">
                          إجمالي الطلبات: {merchantOrders.length}
                        </p>
                      </div>
                    </div>
                  </div>

              {/* تتبع الطلب المحدد من الإشعارات */}
              {targetOrderId && (
                <div className="bg-slate-50 border border-slate-100 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between text-right shadow-2xs min-w-0">
                  <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-600"></span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-black text-violet font-tajawal block truncate" title="عرض تفاصيل الطلب المحدد من الإشعارات">عرض تفاصيل الطلب المحدد من الإشعارات</span>
                      <span className="text-[10px] font-bold text-slate-600 font-tajawal truncate block">رقم الطلب: {targetOrderId}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setTargetOrderId(null)} 
                    className="text-[10px] font-black text-slate-700 bg-white hover:bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 transition-colors cursor-pointer shrink-0 w-full sm:w-auto text-center"
                  >
                    إلغاء التصفية وعرض الكل
                  </button>
                </div>
              )}

              <div className="relative w-full">
                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="بحث برقم الطلب، اسم الزبون، أو رقم الزبون (#0001)..."
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet/30"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                />
              </div>

              {/* شريط الفرز المطور */}
              <div
                className="flex gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-2xl shadow-xs border overflow-x-auto no-scrollbar w-full relative min-w-0 snap-x merchant-brand-card font-bold"
              >
                {[
                  { id: "pending", label: "جديد", count: pendingOrders.length },
                  {
                    id: "accepted",
                    label: "تجهيز",
                    count: merchantOrders.filter((o) => o.status === "accepted")
                      .length,
                  },
                  {
                    id: "shipped",
                    label: "مع المندوب",
                    count: merchantOrders.filter((o) => o.status === "shipped")
                      .length,
                  },
                  {
                    id: "delivered",
                    label: "تم الاستلام",
                    count: merchantOrders.filter(
                      (o) => o.status === "delivered",
                    ).length,
                  },
                  {
                    id: "returned",
                    label: "مرتجع",
                    count: merchantOrders.filter(
                      (o) => o.status === "returned" || o.status === "replaced",
                    ).length,
                  },
                  {
                    id: "rejected",
                    label: "مرفوض / ملغي",
                    count: merchantOrders.filter((o) => o.status === "rejected" || o.status === "cancelled")
                      .length,
                  },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setTargetOrderId(null);
                      setOrderFilter(f.id as any);
                    }}
                    className={`flex-1 shrink-0 snap-center min-w-max px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] font-black transition-all border border-transparent ${
                      orderFilter === f.id && !targetOrderId
                        ? "bg-vibrant-purple text-white shadow-md shadow-slate-100"
                        : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                    }`}
                  >
                    {f.label} <span className={`inline-flex items-center justify-center min-w-[20px] h-5 rounded-md px-1 ml-1 ${orderFilter === f.id && !targetOrderId ? 'bg-white/20' : 'bg-slate-200 text-slate-700'}`}>{f.count}</span>
                  </button>
                ))}
              </div>

              {displayOrdersList.length === 0 ? (
                <div
                  className="py-20 text-center rounded-[3rem] border border-dashed merchant-brand-card"
                >
                  <ClipboardList
                    size={48}
                    className="mx-auto mb-4 opacity-40 text-[#E8ECF4]"
                  />
                  <p className="font-bold text-[#E8ECF4]">لا توجد طلبات في هذا القسم حالياً</p>
                </div>
              ) : (
                <motion.div 
                   className="flex flex-col gap-4 w-full"
                   initial="hidden"
                   animate="visible"
                   variants={{
                     hidden: { opacity: 0 },
                     visible: {
                       opacity: 1,
                       transition: { staggerChildren: 0.05 }
                     }
                   }}
                >
                  {displayOrdersList.map((o) => (
                      <motion.div
                        key={o.id}
                        variants={{
                           hidden: { opacity: 0, y: 10 },
                           visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
                        }}
                        className="bg-white rounded-[2rem] border border-slate-150/75 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 overflow-hidden flex flex-col min-w-0 w-full"
                      >
                        {/* ترويسة الفاتورة مدمجة لتوفير المساحة */}
                        <div className="p-3 sm:p-4 border-b border-slate-50 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3 min-w-0 w-full">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-2 mb-1">
                              <span className="text-[10px] bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md font-black whitespace-nowrap shrink-0 drop-shadow-sm flex items-center gap-1">
                                <span>#{getOrderSeqId(o.id)}</span>
                                <CopyButton text={getOrderSeqId(o.id)} size={9} />
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap shrink-0">
                                {formatSafeDateTimeString(o.createdAt, 'ar-IQ', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </div>
                            <h3 className="text-sm font-black text-violet flex items-center gap-1 truncate" title={o.customerName}>
                              <span>{o.customerName}</span>
                              <CopyButton text={o.customerName} size={10} />
                              {o.returnReason?.includes("استبدال") && (
                                <span className="mr-2 inline-block text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 whitespace-nowrap shrink-0">
                                  استبدال 🔄
                                </span>
                              )}
                            </h3>
                            <span className="text-[10px] font-mono text-purple-600 inline-flex items-center gap-1 leading-none mt-1 select-all" title={o.customerId}>
                              <span>ID: #{getCustomerSeqId(o.customerId)}</span>
                              <CopyButton text={getCustomerSeqId(o.customerId)} size={9} />
                            </span>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 mt-1 min-w-0">
                              <Phone size={10} className="text-emerald-500 shrink-0" />
                              <span className="truncate">{o.customerPhone}</span>
                              <CopyButton text={o.customerPhone} size={9} />
                            </div>
                          </div>
                          
                          <div className="text-left shrink-0 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                            <div className="text-[8px] font-black text-slate-400 uppercase mb-0.5">
                              الإجمالي
                            </div>
                            <div className="text-sm font-black text-on-brand">
                              {(o.total || 0).toLocaleString()} <span className="text-[9px] font-bold">د.ع</span>
                            </div>
                          </div>
                        </div>

                        {/* المحتوى الداخلي مجمع بشبكة */}
                        <div className="flex flex-col md:flex-row min-w-0 w-full">
                          {/* المنتجات والتفاصيل */}
                          <div className="flex-1 p-3 sm:p-4 bg-white min-w-0">
                            <div className="flex items-start gap-2 mb-3 bg-slate-50 p-2 rounded-xl border border-slate-100 min-w-0">
                              <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[9px] font-black text-slate-400 mb-0.5">التوصيل</p>
                                <p className="text-[10px] font-bold text-slate-700 whitespace-normal break-words" title={`${o.customerProvince} - ${o.customerAddress}`}>
                                  {o.customerProvince} - {o.customerAddress}
                                </p>
                                {(o as any).customerLat && (o as any).customerLng && (
                                  <div className="mt-2 space-y-2">
                                    <div className="w-full h-24 rounded-xl overflow-hidden border border-slate-200 shadow-sm relative pointer-events-none z-0">
                                      <MapContainer 
                                        key={`order-map-${o.id}`}
                                        center={[(o as any).customerLat, (o as any).customerLng]} 
                                        zoom={14} 
                                        style={{ height: "100%", width: "100%", zIndex: 0 }}
                                        zoomControl={false}
                                        attributionControl={false}
                                        dragging={false}
                                        scrollWheelZoom={false}
                                        doubleClickZoom={false}
                                      >
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <Marker position={[(o as any).customerLat, (o as any).customerLng]} />
                                      </MapContainer>
                                      {/* غطاء شفاف لمنع التفاعل مع الخريطة عبر اللمس */}
                                      <div className="absolute inset-0 z-[400] bg-transparent"></div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button 
                                        onClick={(e) => { e.preventDefault(); openNativeMapApp((o as any).customerLat, (o as any).customerLng, 'google'); }}
                                        className="flex-1 flex items-center justify-center gap-1 text-[8px] font-black bg-white border border-slate-200 text-slate-600 px-2 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                                      >
                                        <MapPin size={10} className="text-red-500" />
                                        Maps
                                      </button>
                                      <button 
                                        onClick={(e) => { e.preventDefault(); openNativeMapApp((o as any).customerLat, (o as any).customerLng, 'waze'); }}
                                        className="flex-1 flex items-center justify-center gap-1 text-[8px] font-black bg-[#f2fcfed9] border border-[#c2f2ff] text-[#00a9e0] px-2 py-2 rounded-lg shadow-sm hover:bg-[#e6faff] transition-colors"
                                      >
                                        <Car size={10} />
                                        Waze
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            
                            <p className="text-[9px] font-black text-slate-400 mb-2 border-r-2 border-slate-300 pr-2">
                              المنتجات
                            </p>
                            <div className="space-y-1.5 max-h-[100px] overflow-y-auto no-scrollbar pr-1">
                              {o.items.map((it, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2 min-w-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {it.image && (
                                      <img src={it.image} alt={it.productName} className="w-8 h-8 rounded-lg object-cover border border-slate-100 shrink-0 bg-slate-50" />
                                    )}
                                    <div className="flex items-center justify-center w-5 h-5 bg-slate-100 rounded text-[9px] font-black text-slate-600 shrink-0">
                                      {it.quantity}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-700 truncate" title={it.productName}>
                                      {it.productName}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-black text-slate-500 whitespace-nowrap shrink-0">
                                    {((it.price || 0) * (it.quantity || 0)).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 min-w-0">
                                <div className="flex justify-between items-center text-[9px]">
                                    <span className="font-bold text-slate-500">سعر المنتجات:</span>
                                    <span className="font-black text-slate-700">{(o.subtotal || 0).toLocaleString()} د.ع</span>
                                </div>
                                <div className="flex justify-between items-center text-[9px]">
                                    <span className="font-bold text-slate-500">سعر التوصيل:</span>
                                    <span className="font-black text-slate-700">{(o.deliveryPrice || 0).toLocaleString()} د.ع</span>
                                </div>
                                {(o.discountAmount || 0) > 0 && (
                                    <div className="flex justify-between items-center text-[9px]">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-emerald-600">الخصم:</span>
                                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${
                                              o.discountSponsor === 'ADMIN' 
                                                ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                                                : 'bg-purple-50 text-purple-600 border border-purple-100'
                                            }`}>
                                              {o.discountSponsor === 'ADMIN' ? 'تطبيق محلك' : 'المتجر'}
                                            </span>
                                        </div>
                                        <span className="font-black text-emerald-600">- {(o.discountAmount || 0).toLocaleString()} د.ع</span>
                                    </div>
                                )}
                            </div>

                            {(o.rejectionReason || o.returnReason || o.status === "cancelled") && (
                              <div className="mt-3 p-2 bg-rose-50 rounded-lg border border-rose-100 text-[9px] font-bold text-rose-600 truncate">
                                {o.status === "cancelled" ? "تم إلغاء الطلب تلقائياً من قبل الزبون خلال 30 ثانية ⚠️" : o.rejectionReason ? `رفض: ${o.rejectionReason}` : `إرجاع/استبدال: ${o.returnReason}`}
                              </div>
                            )}
                          </div>

                          {/* الأزرار (أفقية في الموبايل، عمودية في الشاشات الكبيرة) */}
                          <div className="order-actions-container p-4 bg-slate-50/50 border-t md:border-t-0 md:border-r border-slate-100 flex flex-wrap md:flex-col gap-3 shrink-0 md:w-44 h-full content-center md:content-start justify-center md:justify-evenly items-stretch font-sans">
                            {o.status === "pending" && (
                              <>
                                <button 
                                  onClick={() => updateOrderStatus(o.id, "accepted")} 
                                  className="relative overflow-hidden group flex-1 py-2.5 bg-gradient-to-r from-[#7B3DFF] to-violet text-white rounded-xl shadow-[0_4px_12px_rgba(153,82,255,0.25)] hover:shadow-[0_8px_20px_rgba(153,82,255,0.35)] font-black text-[11px] sm:text-xs flex items-center justify-center gap-2 hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 w-full min-w-[100px] cursor-pointer"
                                >
                                  <Check className="group-hover:scale-125 transition-transform duration-300 shrink-0" size={16} /> 
                                  <span>قبول الطلب</span>
                                </button>
                                <button 
                                  onClick={() => setActionModal({ show: true, orderId: o.id, type: "rejected" })} 
                                  className="group flex-1 py-2.5 bg-white text-rose-500 border border-rose-100 hover:border-rose-300 hover:bg-rose-50 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-2 shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 w-full min-w-[100px] cursor-pointer"
                                >
                                  <X className="group-hover:rotate-90 transition-transform duration-300 shrink-0" size={16} /> 
                                  <span>رفض الطلب</span>
                                </button>
                              </>
                            )}
                            {o.status === "accepted" && (
                              <button 
                                onClick={() => updateOrderStatus(o.id, "shipped")} 
                                className="relative overflow-hidden group flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl shadow-[0_4px_12px_rgba(245,158,11,0.25)] hover:shadow-[0_8px_20px_rgba(245,158,11,0.35)] font-black text-[11px] sm:text-xs flex items-center justify-center gap-2 hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 w-full min-w-[100px] cursor-pointer"
                              >
                                <Truck className="group-hover:translate-x-1 transition-transform duration-300 shrink-0" size={16} /> 
                                <span>شحن الطلب 🚚</span>
                              </button>
                            )}
                            {o.status === "shipped" && (
                              <>
                                <button 
                                  onClick={() => updateOrderStatus(o.id, "delivered")} 
                                  className="relative overflow-hidden group flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:shadow-[0_8px_20px_rgba(16,185,129,0.35)] font-black text-[11px] sm:text-xs flex items-center justify-center gap-2 hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 w-full min-w-[100px] cursor-pointer"
                                >
                                  <CheckCircle className="group-hover:scale-125 transition-transform duration-300 shrink-0" size={16} /> 
                                  <span>تم الاستلام ✅</span>
                                </button>
                                <div className="flex gap-2 w-full flex-wrap sm:flex-nowrap">
                                  <button 
                                    onClick={() => setReplacementModal({ show: true, orderId: o.id, originalItems: o.items })} 
                                    className="group flex-1 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold text-[10px] hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all flex items-center justify-center gap-1 min-w-[70px] cursor-pointer"
                                  >
                                    <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500 shrink-0 text-amber-500" /> 
                                    <span>تبديل</span>
                                  </button>
                                  <button 
                                    onClick={() => handleReturnOrder(o.id)} 
                                    className="group flex-1 py-2 bg-white text-rose-500 border border-rose-100 rounded-xl font-bold text-[10px] hover:bg-rose-50 hover:border-rose-200 active:scale-95 transition-all flex items-center justify-center gap-1 min-w-[70px] cursor-pointer"
                                  >
                                    <RefreshCw size={12} className="group-hover:-rotate-90 transition-transform shrink-0" /> 
                                    <span>إرجاع</span>
                                  </button>
                                </div>
                              </>
                            )}
                            
                            <div className="flex flex-col gap-2 w-full border-t border-slate-200/55 pt-3 mt-1">
                              <button 
                                onClick={() => { setSelectedInvoice(o); setShowShippingLabelModal(true); }} 
                                className="group w-full py-2 bg-slate-100 text-violet hover:bg-slate-200 rounded-xl font-extrabold text-[10.5px] flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                              >
                                <Printer size={14} className="text-violet group-hover:scale-110 transition-transform duration-300 shrink-0" /> 
                                <span className="truncate">ملصق شحن</span>
                              </button>
                              <button 
                                onClick={() => handleWhatsAppShare(o)}
                                className="group w-full py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 hover:border-emerald-200 rounded-xl font-extrabold text-[10.5px] flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                              >
                                <MessageCircle size={14} className="text-emerald-600 group-hover:scale-110 transition-transform duration-300 shrink-0" /> 
                                <span className="truncate">مشاركة عبر الواتساب</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </motion.div>
              )}
                </div>
              </div>
            </div>
            );
          })()}



          {/* تغيير كلمة المرور - مودال */}
          {showPasswordChange && (
            <div className="fixed inset-0 bg-deep-navy/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl w-full max-w-sm p-8 shadow-2xl relative"
              >
                <button 
                  onClick={() => setShowPasswordChange(false)}
                  className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-slate-50 text-violet rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Shield size={32} />
                  </div>
                  <h3 className="text-xl font-black text-violet">تغيير كلمة المرور</h3>
                  <p className="text-xs text-slate-400 mt-2">
                    {pwStep === 1 
                      ? "سنقوم بإرسال رمز تحقق إلى رقم هاتفك المسجل لضمان أمان حسابك" 
                      : "أدخل رمز التحقق الذي استلمته وكلمة المرور الجديدة"}
                  </p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-6">
                  {pwStep === 1 ? (
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                        <Phone size={20} className="text-slate-400" />
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">رقم الهاتف المسجل</span>
                          <span className="text-sm font-black text-slate-700 font-mono tracking-wider">{currentMerchant.phone}</span>
                        </div>
                      </div>
                      <button 
                        type="submit"
                        className="w-full py-4 bg-vibrant-purple text-white rounded-2xl text-sm font-black shadow-lg shadow-slate-100 hover:bg-vibrant-purple transition-all active:scale-[0.98]"
                      >
                        إرسال الرمز (OTP)
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-violet uppercase tracking-widest px-1 mb-2">رمز التحقق (OTP)</label>
                        <input 
                          type="text" 
                          maxLength={6}
                          placeholder="0 0 0 0 0 0"
                          value={otpPwCode}
                          onChange={(e) => setOtpPwCode(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 px-4 py-4 rounded-2xl text-center text-xl font-black tracking-[0.5em] focus:ring-4 focus:ring-slate-500/5 focus:border-slate-500 transition-all outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-violet uppercase tracking-widest px-1 mb-2">كلمة المرور الجديدة</label>
                        <input 
                          type="password" 
                          placeholder="كلمة مرور قوية (8+ رموز)"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 px-4 py-4 rounded-2xl text-sm font-black focus:ring-4 focus:ring-slate-500/5 focus:border-slate-500 transition-all outline-none"
                        />
                      </div>
                      <button 
                        type="submit"
                        className="w-full py-4 bg-vibrant-purple text-white rounded-2xl text-sm font-black shadow-lg shadow-slate-100 hover:bg-vibrant-purple transition-all active:scale-[0.98]"
                      >
                        تحديث كلمة المرور
                      </button>
                      <button 
                        type="button"
                        onClick={() => setPwStep(1)}
                        className="w-full py-3 text-slate-400 text-xs font-black hover:text-vibrant-purple transition-colors"
                      >
                        لم يصلك الرمز؟ أعد الإرسال
                      </button>
                    </div>
                  )}
                </form>
              </motion.div>
            </div>
          )}

          {/* التسويق (Marketing) */}
          {activeTab === "marketing" && (
            <div className="space-y-6">
              <div className="p-6 h-full overflow-y-auto">
                <div className="space-y-6">
                  {/* Marketing Header */}
                  <div
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center merchant-brand-card p-5 rounded-2xl shadow-sm border gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-100 text-slate-700 rounded-2xl">
                        <Megaphone size={22} className="text-violet" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-850">
                          أدوات التسويق المتقدمة
                        </h2>
                        <p className="text-xs text-slate-400 font-bold mt-0.5 max-w-md">
                          صمم عروضك المرئية واجذب الزبائن من خلال مشاركة متجرك ومنتجاتك بضغطة زر على منصات التواصل.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Visual Offer Builder (صناعة العروض المرئية) */}
                <div
                  className="rounded-[2rem] p-6 shadow-sm border space-y-6 flex flex-col merchant-brand-card"
                >
                  <div>
                    <h3 className="text-lg font-black text-[#E8ECF4] mb-1 flex items-center gap-2">
                       <Lightbulb size={20} className="text-amber-400" />
                       صناعة العروض المرئية (Banner)
                    </h3>
                    <p className="text-xs text-slate-300 font-medium">
                      صمم لافتة إعلانية تظهر أعلى متجرك لجذب انتباه الزبائن للعروض الحالية.
                    </p>
                  </div>

                  <div className="space-y-4 flex-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-200">عنوان العرض</label>
                        <input
                          type="text"
                          value={promoBannerData.title}
                          onChange={(e) => handleUpdatePromoBanner("title", e.target.value)}
                          className="w-full bg-[#0B1320] border-none rounded-xl px-4 py-3 text-sm text-[#E8ECF4] focus:ring-2 focus:ring-vibrant-purple/40 transition-all font-medium placeholder:text-slate-500"
                          placeholder="مثال: عرض نهاية العام!"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-200">لون الخلفية</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={promoBannerData.backgroundColor}
                            onChange={(e) => handleUpdatePromoBanner("backgroundColor", e.target.value)}
                            className="w-10 h-10 rounded-xl cursor-pointer border-none bg-[#0B1320] p-1"
                          />
                          <span className="text-sm font-mono text-slate-300">{promoBannerData.backgroundColor}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-200">تفاصيل العرض (النص الفرعي)</label>
                      <input
                        type="text"
                        value={promoBannerData.subtitle}
                        onChange={(e) => handleUpdatePromoBanner("subtitle", e.target.value)}
                        className="w-full bg-[#0B1320] border-none rounded-xl px-4 py-3 text-sm text-[#E8ECF4] focus:ring-2 focus:ring-vibrant-purple/40 transition-all font-medium placeholder:text-slate-500"
                        placeholder="خصم 20% على جميع المنتجات الشتوية"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-200">تفعيل العرض في المتجر</label>
                      <button 
                        onClick={() => {
                          const newState = !promoBannerData.isActive;
                          handleUpdatePromoBanner("isActive", newState);
                          
                          addNotification({
                            title: newState ? "تم التفعيل" : "تم الإيقاف",
                            message: newState ? "تم تفعيل عرض البانر في متجرك" : "تم إيقاف عرض البانر مؤقتاً",
                            type: newState ? "success" : "info"
                          });
                        }}
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                          promoBannerData.isActive 
                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' 
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}
                      >
                         {promoBannerData.isActive ? 'إيقاف عرض البانر' : 'تفعيل البانر الآن'}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <p className="text-xs font-bold text-slate-300 mb-2">كيف سيبدو البانر في المتجر:</p>
                    <div 
                      className="p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-inner transition-colors duration-300"
                      style={{ backgroundColor: promoBannerData.backgroundColor, color: promoBannerData.textColor }}
                    >
                      <h4 className="font-black text-lg mb-1">{promoBannerData.title || "عنوان العرض"}</h4>
                      <p className="font-medium text-sm opacity-90">{promoBannerData.subtitle || "قم بكتابة تفاصيل العرض هنا"}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Social Media Integration (الربط مع وسائل التواصل الاجتماعي) */}
                <div
                  className="rounded-[2rem] p-6 shadow-sm border space-y-6 merchant-brand-card"
                >
                  <div>
                    <h3 className="text-lg font-black text-[#E8ECF4] mb-1 flex items-center gap-2">
                       <Share2 size={20} className="text-sky-400" />
                       الربط مع وسائل التواصل
                    </h3>
                    <p className="text-xs text-slate-300 font-medium">
                      شارك رابط متجرك أو رابط منتج محدد مباشرة على قصص الإنستغرام، واتساب، أو تيك توك لجلب زوار جدد.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Share store card */}
                    <div className="bg-[#f0f9ff] text-sky-900 border border-sky-100 p-5 rounded-[1.5rem] flex flex-col sm:flex-row gap-4 items-center justify-between">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="p-3 bg-white rounded-xl shadow-sm shrink-0">
                          <StoreIcon size={24} className="text-sky-500" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">مشاركة المتجر كاملاً</h4>
                          <p className="text-xs text-sky-700/70 max-w-xs mt-1 leading-relaxed">
                            شارك رابط متجرك الرسمي مع متابعيك لدعوتهم لتصفح جميع منتجاتك.
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => openShareModal("store", currentMerchant)}
                        className="w-full sm:w-auto px-5 py-2.5 bg-sky-500 text-white rounded-xl font-bold text-xs shadow-md shadow-sky-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
                      >
                         <Share2 size={14} />
                         مشاركة الرابط
                      </button>
                    </div>

                    {/* Share specific product */}
                    <div
                      className="p-5 rounded-[1.5rem] border flex flex-col gap-4"
                    >
                      <div>
                        <h4 className="font-bold text-sm text-[#E8ECF4]">مشاركة منتج معين</h4>
                        <p className="text-xs text-slate-300 mt-1">اختر منتجاً لتسويقه بشكل مخصص وشاركه كحالة (Story).</p>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <select
                          value={marketingSelectedProductId}
                          onChange={(e) => setMarketingSelectedProductId(e.target.value)}
                          className="w-full bg-[#0B1320] border-none rounded-xl px-4 py-3 text-sm font-medium text-[#E8ECF4] focus:ring-2 focus:ring-vibrant-purple/40"
                        >
                          <option value="">-- اختر منتجاً للمشاركة --</option>
                          {products.filter(p => p.status === 'published').map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <button
                          disabled={!marketingSelectedProductId}
                          onClick={() => {
                            const p = products.find(p => p.id === marketingSelectedProductId);
                            if (p) openShareModal("product", p);
                          }}
                          className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                            marketingSelectedProductId
                              ? 'bg-[#0B1320] text-[#E8ECF4] hover:bg-[#0B1320]/80'
                              : 'bg-[#0B1320]/60 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Share2 size={16} />
                          مشاركة المنتج المحدد
                        </button>
                      </div>
                    </div>

                    
                    <div className="bg-white/10 p-4 rounded-2xl flex items-start gap-3">
                      <Activity size={20} className="text-vibrant-purple shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-xs font-bold text-[#E8ECF4] mb-1">تتبع الزيارات (ميزة قادمة)</h5>
                        <p className="text-[10px] text-slate-300 leading-relaxed">
                          نعمل على تطوير أداة تساعدك في معرفة عدد الزيارات التي جلبها كل رابط قمت بمشاركته لتحليل فعالية حملاتك التسويقية.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
                </div>
              </div>
            </div>
          )}

          {/* قائمة الزبائن والمتابعين */}
          {activeTab === "customers" && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div
                className="rounded-2xl border shadow-sm overflow-hidden text-right merchant-brand-card"
              >
                <div className="p-5 flex items-center gap-3" dir="rtl">
                  <div className="p-2.5 bg-white/10 text-violet rounded-xl shrink-0">
                    <Users size={22} />
                  </div>
                  <div className="text-right min-w-0">
                    <h2 className="font-black text-[#E8ECF4] text-base">قائمة زبائني</h2>
                    <p className="text-[10px] text-slate-300 font-bold">
                      إدارة المتابعين وإرسال الهدايا والخصومات
                    </p>
                  </div>
                </div>
              </div>

              <StoreAudiencePanel
                storeId={currentMerchant.id}
                customers={customers}
                orders={orders}
                searchQuery={audienceSearchQuery}
                onSearchQueryChange={setAudienceSearchQuery}
                getCustomerSeqId={getCustomerSeqId}
                onSelectCustomer={setSelectedAudienceId}
                onSendGift={openAudienceGift}
              />
            </div>
          )}

          {/* حسابي */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="p-6 h-full overflow-y-auto">
                <div className="space-y-3">
                  {/* رأس صفحة حسابي */}
                  <div
                    className="rounded-2xl border shadow-sm overflow-hidden text-right merchant-brand-card"
                  >
                    <div className="w-full p-4 flex items-center justify-between gap-3" dir="rtl">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 bg-white/10 text-violet rounded-xl shrink-0">
                          <User size={20} />
                        </div>
                        <div className="text-right min-w-0">
                          <h2 className="font-black text-[#E8ECF4] text-sm">حسابي</h2>
                          <p className="text-[10px] text-slate-300 font-bold">
                            إدارة بيانات المتجر والمحفظة والإعدادات
                          </p>
                        </div>
                      </div>
                      <div className="w-5 shrink-0" aria-hidden />
                    </div>
                  </div>
              
              {/* Wallet Section component */}
              <div
                className="rounded-2xl border shadow-sm overflow-hidden text-right merchant-brand-card"
              >
                <button
                  onClick={() => toggleSection('wallet')}
                  className="w-full p-4 flex items-center justify-between gap-3 transition-colors hover:bg-white/5"
                  dir="rtl"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-white/10 text-sky-400 rounded-xl shrink-0">
                      <Wallet size={20} />
                    </div>
                    <div className="text-right min-w-0">
                      <h3 className="font-black text-[#E8ECF4] text-sm">المحفظة المالية</h3>
                      <p className="text-[10px] text-slate-300 font-bold">إدارة الرصيد والحوالات</p>
                    </div>
                  </div>
                  {expandedSections.wallet ? <ChevronUp size={20} className="text-slate-300 shrink-0" /> : <ChevronDown size={20} className="text-slate-300 shrink-0" />}
                </button>
                {expandedSections.wallet && (
                  <div className="p-4 bg-slate-50 border-t space-y-6">
                    <MerchantWallet currentMerchant={currentMerchant as any} />
                    
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                      <div className="mb-4">
                        <h4 className="font-black text-violet">طرق الدفع لاستلام الأرباح</h4>
                        <p className="text-[10px] text-slate-500">لإرسال المستحقات وتسوية الرصيد</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">محفظة زين كاش (رقم الهاتف)</label>
                          <input
                            type="tel"
                            placeholder="07X XXXX XXXX"
                            value={profileForm.zainCashNumber || ''}
                            onChange={(e) => handleProfileFormChange({ zainCashNumber: e.target.value })}
                            className="w-full border border-slate-200 p-2.5 rounded-xl text-sm font-mono text-left"
                            dir="ltr"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">رقم بطاقة الماستركارد (اختياري)</label>
                          <input
                            type="text"
                            placeholder="XXXX XXXX XXXX XXXX"
                            value={profileForm.mastercardNumber || ''}
                            onChange={(e) => handleProfileFormChange({ mastercardNumber: e.target.value })}
                            className="w-full border border-slate-200 p-2.5 rounded-xl text-sm font-mono text-left"
                            dir="ltr"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">يستخدم لإرسال المستحقات عبر التحويل البنكي</p>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={handleSaveProfile}
                          className="px-6 py-2 bg-vibrant-purple text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center space-x-2 space-x-reverse transition-transform active:scale-95"
                        >
                          <Check size={16} />
                          <span>حفظ الحسابات البنكية</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Personal Information Section */}
              <div
                className="rounded-2xl border shadow-sm overflow-hidden text-right merchant-brand-card"
              >
                <button
                  onClick={() => toggleSection('personalInfo')}
                  className="w-full p-4 flex items-center justify-between gap-3 transition-colors hover:bg-white/5"
                  dir="rtl"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-white/10 text-violet rounded-xl shrink-0">
                      <User size={20} />
                    </div>
                    <div className="text-right min-w-0">
                      <h3 className="font-black text-[#E8ECF4] text-sm">البيانات الشخصية</h3>
                      <p className="text-[10px] text-slate-300 font-bold">
                        تعديل معلومات المتجر وبيانات الاتصال
                      </p>
                    </div>
                  </div>
                  {expandedSections.personalInfo ? <ChevronUp size={20} className="text-slate-300 shrink-0" /> : <ChevronDown size={20} className="text-slate-300 shrink-0" />}
                </button>
                {expandedSections.personalInfo && (
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-white mb-1">
                          اسم المالك *
                        </label>
                        <input
                          type="text"
                          value={profileForm.ownerName}
                          onChange={(e) =>
                            handleProfileFormChange({ ownerName: e.target.value })
                          }
                          className="w-full border border-slate-200 p-2.5 rounded-2xl text-sm text-[#f4f1f1]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-white mb-1">
                          اسم المتجر *
                        </label>
                        <input
                          type="text"
                          value={profileForm.shopName}
                          onChange={(e) =>
                            handleProfileFormChange({ shopName: e.target.value })
                          }
                          className="w-full border border-slate-200 p-2.5 rounded-2xl text-sm text-[#f4f1f1]"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-white mb-1">
                          صنف المتجر *
                        </label>
                        <select
                          value={profileForm.category}
                          onChange={(e) =>
                            handleProfileFormChange({ category: e.target.value })
                          }
                          className="w-full p-2.5 rounded-2xl text-sm input-brand"
                        >
                          {STORE_CATEGORIES.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-white mb-1">
                          رقم الهاتف
                        </label>
                        <input
                          type="tel"
                          value={currentMerchant.phone}
                          disabled
                          className="w-full border bg-slate-50 p-2.5 rounded-2xl text-sm text-slate-400 font-mono mb-2"
                        />
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={profileForm.showPhone} onChange={(e) => handleProfileFormChange({ showPhone: e.target.checked })} className="rounded text-vibrant-purple focus:ring-vibrant-purple" />
                          <span className="text-xs">إظهار عند الزبون</span>
                        </label>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-white mb-1">
                          اسم المستخدم (يمكن تغييره مرة كل 30 يوماً)
                        </label>
                        <input
                          type="text"
                          value={profileForm.username}
                          onChange={(e) => handleProfileFormChange({ username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "") })}
                          className="w-full p-2.5 rounded-2xl text-sm font-mono input-brand"
                          dir="ltr"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-white mb-1">
                          المحافظة *
                        </label>
                        <select
                          value={profileForm.province}
                          onChange={(e) =>
                            handleProfileFormChange({ province: e.target.value })
                          }
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
                        <label className="block text-xs font-bold text-white mb-1">
                          المنطقة / الحي *
                        </label>
                        <input
                          type="text"
                          value={profileForm.area}
                          onChange={(e) =>
                            handleProfileFormChange({ area: e.target.value })
                          }
                          className="w-full border border-slate-200 p-2.5 rounded-2xl text-sm text-white mb-2"
                        />
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={profileForm.showArea} onChange={(e) => handleProfileFormChange({ showArea: e.target.checked })} className="rounded text-vibrant-purple focus:ring-vibrant-purple" />
                          <span className="text-xs">إظهار عند الزبون</span>
                        </label>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-white mb-1">
                          أقرب نقطة دالة *
                        </label>
                        <input
                          type="text"
                          value={profileForm.landmark}
                          onChange={(e) =>
                            handleProfileFormChange({ landmark: e.target.value })
                          }
                          className="w-full border border-slate-200 p-2.5 rounded-2xl text-sm text-white mb-2"
                        />
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={profileForm.showLandmark} onChange={(e) => handleProfileFormChange({ showLandmark: e.target.checked })} className="rounded text-vibrant-purple focus:ring-vibrant-purple" />
                          <span className="text-xs">إظهار عند الزبون</span>
                        </label>
                      </div>
                      <div className="md:col-span-2 mt-2">
                        <LocationPicker
                          onLocationSelect={(lat, lng) =>
                            handleProfileFormChange({ lat, lng })
                          }
                          initialLat={profileForm.lat}
                          initialLng={profileForm.lng}
                          label="تحديد الموقع على الخريطة (إجباري)"
                          labelClassName="block text-xs font-bold text-white mb-1"
                          hintClassName="text-[10px] text-white font-bold text-center mb-1"
                          height="h-48"
                          required={true}
                        />
                        <label className="flex items-center gap-2 cursor-pointer mt-2">
                          <input type="checkbox" checked={profileForm.showMap} onChange={(e) => handleProfileFormChange({ showMap: e.target.checked })} className="rounded text-vibrant-purple focus:ring-vibrant-purple" />
                          <span className="text-xs">إظهار عند الزبون</span>
                        </label>
                      </div>
                    </div>
                    <div className="max-w-[120px] mx-auto">
                      <ImageUploader
                        value={profileForm.logo}
                        onChange={(url) => handleProfileFormChange({ logo: url })}
                        label="لوغو المحل (اختياري)"
                        labelClassName="block text-xs font-black text-white mb-1"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setShowPasswordChange(true);
                        setPwStep(1);
                      }}
                      className="w-full py-2.5 bg-slate-100 text-gray-700 font-bold rounded-2xl flex items-center justify-center space-x-2 space-x-reverse"
                    >
                      <Shield size={16} />
                      <span>تغيير كلمة المرور</span>
                    </button>
                    <button
                      onClick={() => setShowQRMenu(true)}
                      className="w-full py-2.5 bg-slate-50 text-slate-700 font-bold rounded-2xl flex items-center justify-center space-x-2 space-x-reverse"
                    >
                      <Camera size={16} />
                      <span>الهوية الرقمية (QR)</span>
                    </button>

                    <button
                      onClick={handleSaveProfile}
                      className="w-full py-3 bg-vibrant-purple text-white font-bold rounded-2xl shadow-lg flex items-center justify-center space-x-2 space-x-reverse"
                    >
                      <Check size={18} />
                      <span>حفظ التعديلات</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Customers Section */}
              <div
                className="rounded-2xl border shadow-sm overflow-hidden text-right merchant-brand-card"
              >
                <button
                  onClick={() => toggleSection('customers')}
                  className="w-full p-4 flex items-center justify-between gap-3 transition-colors hover:bg-white/5"
                  dir="rtl"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-white/10 text-violet rounded-xl shrink-0">
                      <Users size={20} />
                    </div>
                    <div className="text-right min-w-0">
                      <h3 className="font-black text-[#E8ECF4] text-sm">قائمة زبائني</h3>
                      <p className="text-[10px] text-slate-300 font-bold">
                        إدارة المتابعين وإرسال الهدايا والخصومات
                      </p>
                    </div>
                  </div>
                  {expandedSections.customers ? <ChevronUp size={20} className="text-slate-300 shrink-0" /> : <ChevronDown size={20} className="text-slate-300 shrink-0" />}
                </button>
                {expandedSections.customers && (
                  <div className="p-4 sm:p-6 merchant-panel-inset border-t border-white/10">
                    <StoreAudiencePanel
                      storeId={currentMerchant.id}
                      customers={customers}
                      orders={orders}
                      searchQuery={audienceSearchQuery}
                      onSearchQueryChange={setAudienceSearchQuery}
                      getCustomerSeqId={getCustomerSeqId}
                      onSelectCustomer={setSelectedAudienceId}
                      onSendGift={openAudienceGift}
                    />
                  </div>
                )}
              </div>

              <div
                className="rounded-2xl border shadow-sm overflow-hidden text-right merchant-brand-card"
              >
                <a
                  href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full p-4 flex items-center justify-between gap-3 transition-colors hover:bg-white/5"
                  dir="rtl"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-white/10 text-green-400 rounded-xl shrink-0">
                      <Phone size={20} />
                    </div>
                    <div className="text-right min-w-0">
                      <h3 className="font-black text-[#E8ECF4] text-sm">الدعم الفني</h3>
                      <p className="text-[10px] text-slate-300 font-bold">تواصل معنا عبر واتساب</p>
                    </div>
                  </div>
                  <ChevronLeft size={20} className="text-slate-300 shrink-0" />
                </a>
              </div>

              <div
                className="rounded-2xl border shadow-sm overflow-hidden text-right merchant-brand-card"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAboutUs(true);
                  }}
                  className="w-full p-4 flex items-center justify-between gap-3 transition-colors hover:bg-white/5"
                  dir="rtl"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-white/10 text-violet rounded-xl shrink-0">
                      <StoreIcon size={20} />
                    </div>
                    <div className="text-right min-w-0">
                      <h3 className="font-black text-[#E8ECF4] text-sm">من نحن</h3>
                      <p className="text-[10px] text-slate-300 font-bold">تعرف على منصة محلك</p>
                    </div>
                  </div>
                  <ChevronLeft size={20} className="text-slate-300 shrink-0" />
                </button>
              </div>

              <div
                className="rounded-2xl border shadow-sm overflow-hidden text-right merchant-brand-card"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPrivacyPolicy(true);
                  }}
                  className="w-full p-4 flex items-center justify-between gap-3 transition-colors hover:bg-white/5"
                  dir="rtl"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-white/10 text-violet rounded-xl shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="text-right min-w-0">
                      <h3 className="font-black text-[#E8ECF4] text-sm">سياسة الخصوصية</h3>
                      <p className="text-[10px] text-slate-300 font-bold">كيف نجمع ونستخدم بياناتك</p>
                    </div>
                  </div>
                  <ChevronLeft size={20} className="text-slate-300 shrink-0" />
                </button>
              </div>

              <DeleteAccountSection
                accountLabel={`حساب التاجر: ${currentMerchant?.name || ""}`}
                onConfirmDelete={() => deleteUserAccountSecure("merchant")}
                className="rounded-2xl"
              />

              <button
                onClick={handleLogout}
                className="w-full py-4 bg-red-50 text-red-500 font-bold rounded-2xl border border-red-100 flex items-center justify-center space-x-2 space-x-reverse"
              >
                <LogOut size={20} />
                <span>تسجيل الخروج</span>
              </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Modal: طلب مشاركة في الفعالية */}
        {joinFlashSaleData && (
          <div className="fixed inset-0 bg-deep-navy/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in">
              <div className="flex justify-between items-center mb-4 pb-3 border-b">
                <h3 className="font-black text-violet flex items-center gap-2">
                  <Zap size={18} className="text-yellow-500" /> المشاركة بمنتج
                </h3>
                <button onClick={() => setJoinFlashSaleData(null)}>
                  <X size={20} className="text-slate-400 hover:text-vibrant-purple" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const matchedProduct = merchantProducts.find(
                    (p) => p.id === joinProductId,
                  );
                  if (!matchedProduct) return;

                  const promPrice = parseInt(joinPromotionalPrice);
                  if (!promPrice || promPrice >= matchedProduct.price) {
                    alert("يجب أن يكون السعر الترويجي أقل من السعر الأصلي!");
                    return;
                  }

                  requestJoinFlashSale({
                    flashSaleId: joinFlashSaleData.flashSaleId,
                    storeId: currentMerchant.id,
                    productId: matchedProduct.id,
                    promotionalPrice: promPrice,
                    status: "pending",
                  }).then(() => {
                    alert("تم إرسال طلب المشاركة بنجاح! ننتظر موافقة الإدارة.");
                    setJoinFlashSaleData(null);
                    setJoinProductId("");
                    setJoinPromotionalPrice("");
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    اختر المنتج المراد المشاركة به
                  </label>
                  {merchantProducts.length === 0 ? (
                    <div className="text-red-500 text-xs font-bold p-2 bg-red-50 rounded">
                      لا تملك أي منتجات حالياً. أضف منتجاً أولاً.
                    </div>
                  ) : (
                    <select
                      required
                      value={joinProductId}
                      onChange={(e) => {
                        setJoinProductId(e.target.value);
                        setJoinPromotionalPrice(""); // reset price
                      }}
                      className="w-full border border-slate-200 p-3 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-500"
                    >
                      <option value="" disabled>
                        -- اختر المنتج --
                      </option>
                      {merchantProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (السعر الأصلي: {p.price})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {joinProductId && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      السعر الترويجي الحصري (أقل من السعر الأصلي)
                    </label>
                    <input
                      type="number"
                      required
                      value={joinPromotionalPrice}
                      onChange={(e) => setJoinPromotionalPrice(e.target.value)}
                      placeholder="مثال: 15000"
                      className="w-full border border-slate-200 p-3 rounded-2xl text-sm font-bold text-rose-600 outline-none focus:ring-2 focus:ring-slate-500"
                    />
                    {merchantProducts.find((p) => p.id === joinProductId) &&
                      parseInt(joinPromotionalPrice) >=
                        merchantProducts.find((p) => p.id === joinProductId)!
                          .price && (
                        <p className="text-[10px] text-red-500 mt-1 font-bold">
                          السعر الترويجي يجب أن يكون أقل من السعر الأصلي!
                        </p>
                      )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    !joinProductId ||
                    merchantProducts.length === 0 ||
                    !joinPromotionalPrice ||
                    parseInt(joinPromotionalPrice) >=
                      (merchantProducts.find((p) => p.id === joinProductId)
                        ?.price || 0)
                  }
                  className="w-full py-3 bg-vibrant-purple text-white font-bold rounded-2xl shadow-lg transition hover:bg-vibrant-purple disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  إرسال الطلب للموافقة
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal: تأكيد החذف */}
        <AnimatePresence>
          {deleteConfirm.show && (
            <div className="fixed inset-0 bg-deep-navy/40 backdrop-blur-md z-[80] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl relative"
              >
                <div className="p-6">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-center text-violet mb-2">
                    تأكيد الحذف
                  </h3>
                  <p className="text-center text-sm text-slate-600 mb-6 font-bold leading-relaxed">
                    هل أنت متأكد من حذف المنتج "{deleteConfirm.name}" نهائياً؟
                    <br />
                    <span className="text-red-500 text-xs">
                      لا يمكن التراجع عن هذه العملية!
                    </span>
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={executeDeleteProduct}
                      className="flex-1 py-3 bg-red-600 text-white font-black rounded-2xl shadow-lg hover:bg-red-700 transition"
                    >
                      نعم، احذف
                    </button>
                    <button
                      onClick={() =>
                        setDeleteConfirm({ show: false, id: "", name: "" })
                      }
                      className="flex-1 py-3 bg-slate-100 text-slate-700 font-black rounded-2xl hover:bg-slate-200 transition"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: تأكيد حظر/إلغاء حظر الزبون بأسلوب بنفسجي وسيليكون مذهل */}
        <AnimatePresence>
          {blockConfirm.show && (
            <div className="fixed inset-0 bg-deep-navy/45 backdrop-blur-md z-[120] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl relative text-right"
                dir="rtl"
              >
                <div className="p-6">
                  <div className={`w-16 h-16 ${blockConfirm.isBlocked ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-center text-violet mb-2">
                    {blockConfirm.isBlocked ? "إلغاء حظر الزبون" : "حظر الزبون"}
                  </h3>
                  <p className="text-center text-sm text-slate-600 mb-6 font-bold leading-relaxed font-sans">
                    {blockConfirm.isBlocked 
                      ? `هل تريد بالتأكيد إلغاء الحظر عن الزبون "${blockConfirm.name}"؟` 
                      : `هل أنت متأكد من حظر الزبون "${blockConfirm.name}"؟`}
                    <br />
                    <span className="text-slate-400 text-xs font-normal block mt-1">
                      {blockConfirm.isBlocked 
                        ? "سيتمكن الزبون من رؤية متجرك وطلب منتجاتك مرة أخرى." 
                        : "لن يتمكن الزبون من رؤية متجرك أو عمل طلبات جديدة."}
                    </span>
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await updateCustomerProfile({ id: blockConfirm.customerId, isBlocked: !blockConfirm.isBlocked });
                          alert(blockConfirm.isBlocked ? "تم إلغاء حظر الزبون بنجاح! ✅" : "تم حظر الزبون بنجاح! 🚫");
                        } catch (err) {
                          alert("❌ حدث خطأ أثناء تعديل حالة الحظر");
                        } finally {
                          setBlockConfirm({ show: false, customerId: "", name: "", isBlocked: false });
                        }
                      }}
                      className={`flex-1 py-3 ${blockConfirm.isBlocked ? 'bg-emerald-600 hover:bg-emerald-700 animate-pulse' : 'bg-red-600 hover:bg-red-700'} text-white font-black rounded-2xl shadow-lg transition`}
                    >
                      {blockConfirm.isBlocked ? "نعم، إلغاء الحظر" : "نعم، حظر الزبون"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setBlockConfirm({ show: false, customerId: "", name: "", isBlocked: false })
                      }
                      className="flex-1 py-3 bg-slate-100 text-slate-700 font-black rounded-2xl hover:bg-slate-200 transition"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: إضافة/تعديل منتج */}
        {prodModal.show && (
          <div className="fixed inset-0 bg-deep-navy/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-6 sm:p-8 shadow-2xl h-[90vh] overflow-y-auto animate-scale-in text-right">
              {/* رأس المودال الإحترافي */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-violet flex items-center gap-2">
                    <span className="w-2.5 h-6 bg-vibrant-purple rounded-full block"></span>
                    {prodModal.mode === "add" ? "إضافة منتج جديد" : "تعديل بيانات المنتج"}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">
                    يرجى تعبئة تفاصيل المنتج المعروض بدقة لضمان أفضل تجربة مع الزبون
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setProdModal({ show: false, mode: "add" })}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>

              {/* محتوى الاستمارة */}
              <form
                onSubmit={handleSaveProduct}
                className="space-y-6 text-right"
              >
                {/* 1. صورة المنتج في المقدمة كما تطلب تجربة المستخدم UX */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
                  <span className="text-xs font-black text-slate-500 mb-1">صورة المنتج الرئيسية *</span>
                  <div className="w-full max-w-[200px] mx-auto bg-white rounded-2xl p-2 shadow-xs flex flex-col items-center">
                    <ImageUploader
                      value={prodImage}
                      onChange={setProdImage}
                      label="أضف صورة جذابة"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        preloadBgRemovalModel();
                        setShowBgRemoverModal(true);
                      }}
                      className="mt-2.5 py-2 px-3 bg-violet-50 hover:bg-violet-100 border border-violet-100 text-violet hover:text-violet-900 text-[10px] font-black rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs w-full"
                    >
                      <Sparkles size={12} className="animate-pulse text-vibrant-purple" />
                      <span>تفريغ ميزات الكاميرا مجاناً ✨</span>
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold text-center">
                    الصور ذات الخلفية البيضاء أو الواضحة تزيد المبيعات بنسبة 40%
                  </p>
                </div>

                {/* 2. اسم المنتج وسعر المنتج للزبون في شبكة مرنة */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-755 mb-2 mr-1">
                      اسم المنتج *
                    </label>
                    <input
                      type="text"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      required
                      placeholder="مثال: ساعة يد رجالية فاخرة"
                      className="w-full border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-bold text-violet focus:bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-755 mb-2 mr-1">
                      السعر للزبون (د.ع) *
                    </label>
                    <input
                      type="number"
                      value={prodPrice || ""}
                      onChange={(e) => setProdPrice(parseInt(e.target.value) || 0)}
                      required
                      placeholder="مثال: 25000"
                      className="w-full border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-black text-violet focus:bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all shadow-xs"
                    />
                  </div>
                </div>

                {/* 3. الوصف */}
                <div>
                  <label className="block text-xs font-black text-slate-755 mb-2 mr-1">
                    وصف المنتج وتفاصيله
                  </label>
                  <textarea
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    placeholder="اكتب تفاصيل المنتج ومميزاته ومواد التصنيع هنا..."
                    className="w-full border border-slate-200 p-4 rounded-2xl text-sm font-medium text-slate-700 h-24 focus:bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all shadow-xs leading-relaxed"
                  />
                </div>

                {/* 4. الحقول الإضافية المفتاحية */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* الباركود */}
                  <div>
                    <label className="block text-xs font-black text-slate-755 mb-2 mr-1">
                      رمز الباركود (اختياري)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={prodBarcode}
                        onChange={(e) => setProdBarcode(e.target.value)}
                        placeholder="امسح او اكتب يدوياً"
                        className="w-full border border-slate-200 px-4 py-3 rounded-2xl text-xs font-mono text-slate-700 outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setProdModal({ ...prodModal, show: false });
                          setScannerMode("inventory");
                          setShowScanner(true);
                        }}
                        className="px-3 bg-violet-55 border border-slate-100 hover:bg-slate-100 text-violet-755 rounded-2xl flex items-center justify-center active:scale-95 transition shadow-xs"
                        title="ماسح الباركود بالكاميرا"
                      >
                        <Camera size={18} />
                      </button>
                    </div>
                  </div>

                  {/* الكمية المتوفرة (اختياري) */}
                  <div>
                    <label className="block text-xs font-black text-slate-755 mb-2 mr-1">
                      الكمية المتوفرة (اختياري)
                    </label>
                    <input
                      type="number"
                      value={prodInventory}
                      onChange={(e) => {
                        const v = e.target.value;
                        setProdInventory(v === "" ? "" : parseInt(v) || 0);
                      }}
                      className="w-full border border-slate-200 px-4 py-3 rounded-2xl text-sm font-black text-violet focus:ring-2 focus:ring-slate-500 outline-none focus:border-slate-500 shadow-xs"
                      placeholder="جاهز للتوريد بكميات ضخمة"
                    />
                    <span className="text-[9px] text-emerald-600 font-bold block mt-1 mr-1">
                      💡 اتركه فارغاً ليظهر كمنتج "متاح بكميات كبيرة"
                    </span>
                  </div>
                </div>

                {/* عرض خاص */}
                <div>
                  <label className="block text-xs font-black text-slate-755 mb-2 mr-1">
                    عرض ترويجي خاص لشد الأنظار (اختياري)
                  </label>
                  <input
                    type="text"
                    value={prodSpecialOffer}
                    onChange={(e) => setProdSpecialOffer(e.target.value)}
                    placeholder="مثال: اشتري 2 واحصل على قطعة مجاناً 🎁"
                    className="w-full border border-slate-200 px-4 py-3.5 rounded-2xl text-sm text-green-700 font-black focus:ring-2 focus:ring-green-500 outline-none shadow-xs"
                  />
                </div>

                {/* توصيل مجاني للمنتج */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setProdIsFreeDelivery(!prodIsFreeDelivery)}
                    className={`w-full py-3.5 rounded-2xl text-xs font-black transition-all border flex items-center justify-center gap-2 shadow-xs ${
                      prodIsFreeDelivery
                        ? "bg-emerald-500 text-white border-emerald-400 hover:bg-emerald-600 shadow-md shadow-emerald-100"
                        : "bg-slate-50 text-slate-500 border-slate-150 hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Truck size={16} />
                    {prodIsFreeDelivery ? "المنتج معفى من أجور التوصيل للزبون 🎉" : "عرض المنتج مع توصيل مجاني؟"}
                  </button>
                </div>

                {/* الكلمات المفتاحية والخصومات المتقدمة */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* الخصومات */}
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between gap-2 shadow-xs">
                    <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5 mb-1">
                      <Ticket size={14} className="text-violet" /> تطبيق خصم مباشر
                    </h4>
                    <select
                      value={prodDiscountType}
                      onChange={(e) => {
                        setProdDiscountType(e.target.value as any);
                        setProdDiscountValue(0);
                      }}
                      className="w-full border border-slate-200 p-2.5 rounded-2xl text-xs bg-white text-violet font-bold outline-none"
                    >
                      <option value="none">بدون خصم</option>
                      <option value="percent">خصم نسبة (%)</option>
                      <option value="amount">خصم مبلغ ثابت (د.ع)</option>
                    </select>
                    {prodDiscountType !== "none" && (
                      <input
                        type="number"
                        value={prodDiscountValue || ""}
                        onChange={(e) => setProdDiscountValue(parseInt(e.target.value) || 0)}
                        placeholder={prodDiscountType === "percent" ? "مثال: 15" : "مثال: 5000"}
                        className="w-full border border-slate-200 p-2.5 rounded-2xl text-xs font-black text-slate-700 outline-none"
                      />
                    )}
                  </div>

                  {/* تصنيف وكلمات مفتاحية */}
                  {availableTags.length > 0 && (
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-2 shadow-xs">
                      <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                        <span className="w-1.5 h-3 bg-slate-600 rounded-full"></span> الكلمات التصنيفية
                      </h4>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {availableTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setProdTags((prev) =>
                                prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                              )
                            }
                            className={`px-2.5 py-1 rounded-full text-[9px] font-black border transition-all ${
                              prodTags.includes(tag)
                                ? "bg-vibrant-purple text-white border-vibrant-purple"
                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-200"
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. قسم معلومات إضافية (Collapsible) */}
                <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-xs">
                  <button
                    type="button"
                    onClick={() => setShowExtraInfo(!showExtraInfo)}
                    className="w-full px-4 py-3.5 bg-slate-50 hover:bg-slate-100/80 flex justify-between items-center transition-all text-right"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-on-brand">📋 معلومات إضافية متقدمة</span>
                      <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">اختياري</span>
                    </div>
                    <div>
                      {showExtraInfo ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                    </div>
                  </button>

                  {showExtraInfo && (
                    <div className="p-4 border-t border-slate-100 bg-white space-y-4 animate-fade-in">
                      {/* اللون والمقاس */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1.5">اللون</label>
                          <input
                            type="text"
                            value={prodColor}
                            onChange={(e) => setProdColor(e.target.value)}
                            placeholder="مثال: أسود ملكي"
                            className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-violet focus:ring-1 focus:ring-slate-500 outline-none"
                          />
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {["أسود", "أبيض", "أحمر", "أزرق", "ذهبي", "فضي"].map(c => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setProdColor(c)}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[8px] font-black rounded"
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1.5">المقاس / الحجم</label>
                          <input
                            type="text"
                            value={prodSize}
                            onChange={(e) => setProdSize(e.target.value)}
                            placeholder="مثال: XL أو 42"
                            className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-violet focus:ring-1 focus:ring-slate-500 outline-none"
                          />
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {["S", "M", "L", "XL", "Free Size"].map(sz => (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => setProdSize(sz)}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[8px] font-black rounded"
                              >
                                {sz}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* القياسات: الطول، العرض، الوزن */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-700 mb-2">قياسات المنتج المادية</label>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block mb-1">الطول (سم)</span>
                            <input
                              type="text"
                              value={prodLength}
                              onChange={(e) => setProdLength(e.target.value)}
                              placeholder="مثال: 15"
                              className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-right outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block mb-1">العرض (سم)</span>
                            <input
                              type="text"
                              value={prodWidth}
                              onChange={(e) => setProdWidth(e.target.value)}
                              placeholder="مثال: 30"
                              className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-right outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block mb-1">الوزن</span>
                            <input
                              type="text"
                              value={prodWeight}
                              onChange={(e) => setProdWeight(e.target.value)}
                              placeholder="مثال: 500 غرام"
                              className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-right outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* الماركة، الضمان، حالة المنتج */}
                      <div className="border-t border-slate-100 pt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">الماركة / براند</label>
                            <input
                              type="text"
                              value={prodBrand}
                              onChange={(e) => setProdBrand(e.target.value)}
                              placeholder="مثال: Apple"
                              className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-violet outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">مدة الضمان</label>
                            <input
                              type="text"
                              value={prodWarranty}
                              onChange={(e) => setProdWarranty(e.target.value)}
                              placeholder="مثال: سنة واحدة"
                              className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-violet outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">حالة المنتج</label>
                          <input
                            type="text"
                            value={prodCondition}
                            onChange={(e) => setProdCondition(e.target.value)}
                            placeholder="مثال: أصلي ممتاز ومختوم"
                            className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-violet outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. الأزرار الرئيسية البارزة في نهاية الاستمارة للتأكيد */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    onClick={() => setProdStatus("published")}
                    className="w-full py-4 px-6 bg-gradient-to-l from-vibrant-purple to-[#0B1320] hover:from-slate-700 hover:to-[#0B1320] text-white font-black text-sm rounded-2xl shadow-lg shadow-slate-100 hover:shadow-xl hover:shadow-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <span>🚀 حفظ المنتج ونشره مباشرة</span>
                  </button>
                  <button
                    type="submit"
                    onClick={() => setProdStatus("draft")}
                    className="w-full py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    <span>💾 حفظ المنتج كمسودة مؤقتة</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Bulk Edit */}
        {showBulkEditModal && (
          <div className="fixed inset-0 bg-deep-navy/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-scale-in text-right">
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-xl text-violet">
                    تعديل جماعي للمنتجات
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">
                    سيتم تطبيق التعديلات على {selectedProductIds.length} منتج
                    مختار
                  </p>
                </div>
                <button
                  onClick={() => setShowBulkEditModal(false)}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                  <AlertTriangle
                    size={20}
                    className="text-amber-500 shrink-0 mt-0.5"
                  />
                  <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                    ملاحظة: الحقول التي تتركها فارغة لن يتم تعديلها. التعديل
                    سيشمل فقط الحقول التي تقوم بتغيير قيمتها هنا.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-2 mr-1">
                      السعر الجديد (د.ع)
                    </label>
                    <input
                      type="number"
                      placeholder="لا تغيير"
                      onChange={(e) =>
                        setBulkUpdateData((prev) => ({
                          ...prev,
                          price: parseInt(e.target.value) || undefined,
                        }))
                      }
                      className="w-full border p-4 rounded-2xl text-sm focus:ring-2 focus:ring-slate-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-2 mr-1">
                      الكمية الجديدة (Inventory)
                    </label>
                    <input
                      type="number"
                      placeholder="لا تغيير"
                      onChange={(e) =>
                        setBulkUpdateData((prev) => ({
                          ...prev,
                          inventory: parseInt(e.target.value) || undefined,
                        }))
                      }
                      className="w-full border p-4 rounded-2xl text-sm focus:ring-2 focus:ring-slate-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-500 mb-2 mr-1">
                    تغيير الحالة إلى
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        id: "published",
                        label: "منشور",
                        color: "bg-emerald-50 text-emerald-600",
                      },
                      {
                        id: "draft",
                        label: "مسودة",
                        color: "bg-amber-50 text-amber-600",
                      },
                      {
                        id: "archived",
                        label: "أرشيف",
                        color: "bg-slate-50 text-slate-600",
                      },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          setBulkUpdateData((prev) => ({
                            ...prev,
                            status: s.id as any,
                          }))
                        }
                        className={`py-3 rounded-2xl text-[11px] font-bold border-2 transition-all ${
                          bulkUpdateData.status === s.id
                            ? s.id === "published"
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-extrabold scale-105 shadow-sm"
                              : s.id === "draft"
                              ? "border-amber-500 bg-amber-50 text-amber-700 font-extrabold scale-105 shadow-sm"
                              : "border-purple-500 bg-purple-50 text-vibrant-purple font-extrabold scale-105 shadow-sm"
                            : "border-slate-250 bg-white text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={handleBulkUpdate}
                    className="flex-1 py-4 bg-vibrant-purple text-white font-black rounded-2xl shadow-xl shadow-slate-100 hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
                  >
                    تحديث المنتجات المختارة
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBulkEditModal(false)}
                    className="px-8 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Scanner */}
        {showScanner && (
          <div className="fixed inset-0 bg-deep-navy/80 backdrop-blur-sm z-[60] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl animate-fade-in relative">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                <h3 className="font-black text-violet flex items-center gap-2">
                  <Camera size={18} /> {scannerMode === "search" ? "بحث بالباركود" : "الجرد الذكي"}
                </h3>
                <button
                  onClick={() => setShowScanner(false)}
                  className="p-1 px-3 bg-red-100 text-red-600 rounded-xl font-bold"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4">
                <div
                  id="reader"
                  className="w-full h-auto mx-auto rounded-2xl overflow-hidden"
                ></div>
                <p className="text-center text-xs text-slate-500 mt-4 font-bold">
                  وجه الكاميرا نحو باركود المنتج
                  <br />
                  {scannerMode === "search" ? "سيتم كتابة الباركود في شريط البحث للعثور عليه" : "سيتم فتح صفحة المنتج تلقائياً للتعديل"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal: إنشاء بروموكود */}
        <AnimatePresence>
          {promoModal && (
            <div className="fixed inset-0 bg-deep-navy/40 backdrop-blur-md z-[110] flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl text-right max-h-[90vh] overflow-y-auto relative border border-slate-100 no-scrollbar"
              >
                {/* Decoration elements to make it look like a high-end coupon ticket */}
                <div className="absolute top-1/2 -left-3 w-6 h-6 bg-slate-50 border-r border-slate-100 rounded-full transform -translate-y-1/2 z-10 hidden sm:block"></div>
                <div className="absolute top-1/2 -right-3 w-6 h-6 bg-slate-50 border-l border-slate-100 rounded-full transform -translate-y-1/2 z-10 hidden sm:block"></div>

                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-50 text-vibrant-purple rounded-2xl flex items-center justify-center border border-purple-100 shrink-0">
                      <Ticket size={24} className="transform -rotate-12" />
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-slate-800 leading-tight">إنشاء كود خصم جديد</h3>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5">صمم كوداً مميزاً لزيادة المبيعات والطلب</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setPromoModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreatePromo} className="space-y-5">
                  {/* كود الخصم (The Code) */}
                  <div className="bg-slate-50/50 p-4 rounded-3xl border border-dashed border-slate-200">
                    <label className="block text-[11px] font-black text-slate-500 mb-2.5">
                      رمز كود الخصم
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={pCode}
                        onChange={(e) => setPCode(e.target.value.toUpperCase())}
                        required
                        placeholder="مثال: COUPO20"
                        className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple focus:ring-4 focus:ring-purple-50 p-4 rounded-2xl font-mono text-center text-lg font-black uppercase tracking-widest text-violet transition-all"
                      />
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-300">
                        <Gift size={18} />
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-2 text-center">سيتم تحويل الأحرف إلى اللغة الإنجليزية الكبيرة تلقائياً</p>
                  </div>

                  {/* نوع الخصم والقيمة */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-1.5">
                        نوع الخصم
                      </label>
                      <div className="relative">
                        <select
                          value={pDiscountType}
                          onChange={(e) => setPDiscountType(e.target.value as any)}
                          className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple p-3.5 rounded-2xl text-xs font-bold text-slate-700 appearance-none focus:outline-none focus:ring-4 focus:ring-purple-50 transition-all cursor-pointer"
                        >
                          <option value="amount">مبلغ ثابت (د.ع)</option>
                          <option value="percent">نسبة مئوية (%)</option>
                        </select>
                        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-1.5">
                        القيمة
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={pDiscount || ""}
                          onChange={(e) => setPDiscount(parseInt(e.target.value) || 0)}
                          required
                          min="1"
                          placeholder="0"
                          className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple focus:ring-4 focus:ring-purple-50 p-3.5 rounded-2xl text-center text-xs font-black text-slate-800 transition-all"
                        />
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-xs font-black text-slate-400 font-mono">
                          {pDiscountType === "amount" ? "IQD" : "%"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* قيود الاستخدام */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-1.5">
                        إجمالي الاستخدام
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={pMaxUses || ""}
                          onChange={(e) => setPMaxUses(parseInt(e.target.value) || 0)}
                          required
                          min="1"
                          className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple focus:ring-4 focus:ring-purple-50 p-3.5 rounded-2xl text-center text-xs font-black text-slate-800 transition-all"
                        />
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-300">
                          <Users size={14} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-1.5">
                        للزبون الواحد
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={pMaxUsesPerUser || ""}
                          onChange={(e) => setPMaxUsesPerUser(parseInt(e.target.value) || 0)}
                          required
                          min="1"
                          className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple focus:ring-4 focus:ring-purple-50 p-3.5 rounded-2xl text-center text-xs font-black text-slate-800 transition-all"
                        />
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-300">
                          <User size={14} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-1.5">
                      الجمهور المستهدف
                    </label>
                    <select
                      value={pTargetAudience}
                      onChange={(e) => setPTargetAudience(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple focus:ring-4 focus:ring-purple-50 p-3.5 pr-10 rounded-2xl text-xs font-black text-slate-800 transition-all appearance-none outline-none"
                    >
                      <option value="ALL">الجميع</option>
                      <option value="FOLLOWERS">المتابعين فقط</option>
                      <option value="PAST_BUYERS">الزبائن السابقين</option>
                      <option value="FOLLOWERS_AND_PAST_BUYERS">المتابعين والزبائن السابقين</option>
                    </select>
                  </div>

                  {/* الصلاحية */}
                  <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100 space-y-3">
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-1.5">
                        مدة صلاحية الكود
                      </label>
                      <div className="relative">
                        <select
                          value={pExpiryType}
                          onChange={(e) => setPExpiryType(e.target.value as any)}
                          className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple p-3 rounded-2xl text-xs font-bold text-slate-700 appearance-none focus:outline-none focus:ring-4 focus:ring-purple-50 transition-all cursor-pointer"
                        >
                          <option value="days">تفعيل لعدد أيام متبقية</option>
                          <option value="date">تحديد تاريخ بدء وانتهاء مخصص</option>
                        </select>
                        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>

                    {/* تغيير الإدخال ديناميكياً بناءً على نوع الصلاحية */}
                    <AnimatePresence mode="wait">
                      {pExpiryType === "days" ? (
                        <motion.div
                          key="days"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="relative"
                        >
                          <input
                            type="number"
                            placeholder="مثال: 30"
                            value={pExpiryDays || ""}
                            onChange={(e) => setPExpiryDays(parseInt(e.target.value) || 0)}
                            required
                            min="1"
                            className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple focus:ring-4 focus:ring-purple-50 p-3 rounded-2xl text-center text-xs font-black text-slate-800 transition-all"
                          />
                          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-xs font-bold text-slate-400 font-tajawal">
                            أيام
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="date"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="grid grid-cols-2 gap-3"
                        >
                          <div>
                            <label className="block text-[9px] font-black text-slate-400 mb-1">
                              تاريخ البدء (اختياري)
                            </label>
                            <input
                              type="date"
                              value={pStartDate}
                              onChange={(e) => setPStartDate(e.target.value)}
                              className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple p-2.5 rounded-xl text-center text-xs font-bold text-slate-700 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-slate-400 mb-1">
                              تاريخ الانتهاء
                            </label>
                            <input
                              type="date"
                              value={pEndDate}
                              onChange={(e) => setPEndDate(e.target.value)}
                              required
                              className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple p-2.5 rounded-xl text-center text-xs font-bold text-slate-700 transition-all"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* أزرار الإجراءات */}
                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPromoModal(false)}
                      className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-600 font-black rounded-2xl text-xs transition-colors cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="w-2/3 py-3.5 bg-gradient-to-r from-[#7B3DFF] to-[#8033FF] hover:from-[#8033FF] hover:to-[#6B24E2] active:scale-[0.98] text-white font-black rounded-2xl shadow-lg shadow-purple-100/50 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle size={15} />
                      <span>تفعيل الكود ونشره</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: إجراءات الطلب (رفض/إرجاع/استبدال) */}
        {actionModal.show && (
          <div className="fixed inset-0 bg-deep-navy/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden text-right p-8 border border-slate-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-violet">
                  {actionModal.type === "rejected"
                    ? "رفض الطلب ❌"
                    : actionModal.type === "returned"
                      ? "إرجاع الطلب ↩️"
                      : "استبدال الطلب 🔄"}
                </h3>
                <button
                  onClick={() => {
                    setActionModal({ ...actionModal, show: false });
                    setCustomReason("");
                  }}
                  className="p-2 text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  اختر السبب أو اكتبه:
                </p>

                {actionModal.type === "rejected"
                  ? [
                      "نفذ المخزون",
                      "المنطقة خارج التغطية",
                      "خطأ في السعر",
                      "رقم الهاتف غير متاح",
                    ].map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          updateOrderStatus(actionModal.orderId, "rejected", r);
                          setActionModal({ ...actionModal, show: false });
                        }}
                        className="w-full p-3 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-2xl text-right font-black text-xs transition-all"
                      >
                        {r}
                      </button>
                    ))
                  : (actionModal.type === "returned"
                        ? [
                            "المنتج معيب",
                            "الزبون غير مقتنع",
                            "مشكلة في المقاس/اللون",
                            "تأخر في التوصيل",
                          ]
                        : [
                            "استبدال مقاس/لون",
                            "استبدال منتج معيب",
                            "منتج مختلف عن الصورة",
                          ]
                    ).map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          updateOrderStatus(
                            actionModal.orderId,
                            actionModal.type,
                            r,
                          );
                          setActionModal({ ...actionModal, show: false });
                        }}
                        className="w-full p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-vibrant-purple rounded-2xl text-right font-black text-[10px] transition-all border border-slate-50"
                      >
                        {r}
                      </button>
                    ))}

                <div className="pt-4 border-t border-slate-100 mt-2">
                  <p className="text-[10px] font-black text-slate-400 mb-2">
                    سبب خاص:
                  </p>
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="اكتب السبب هنا..."
                    className="w-full bg-slate-50 border border-slate-100 p-3 rounded-2xl text-xs font-bold outline-none focus:ring-1 focus:ring-slate-500 min-h-[80px]"
                  />
                  <button
                    disabled={!customReason.trim()}
                    onClick={() => {
                      updateOrderStatus(
                        actionModal.orderId,
                        actionModal.type,
                        customReason.trim(),
                      );
                      setActionModal({ ...actionModal, show: false });
                      setCustomReason("");
                    }}
                    className="w-full mt-3 py-3 bg-vibrant-purple text-white rounded-xl font-black text-xs disabled:opacity-50 shadow-lg shadow-slate-100"
                  >
                    تأكيد الإجراء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal: استبدال المنتج */}
        {replacementModal.show && (
          <div className="fixed inset-0 bg-deep-navy/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden text-right flex flex-col max-h-[85vh] border border-slate-100"
            >
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <h3 className="text-xl font-black text-violet">استبدال المنتج 🔄</h3>
                <button
                  onClick={() => {
                    setReplacementModal({ ...replacementModal, show: false });
                    setReplacementProduct(null);
                    setReplacementSearch("");
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto no-scrollbar space-y-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">المنتجات الأصلية في الطلب:</p>
                  <div className="flex flex-wrap gap-2">
                    {replacementModal.originalItems.map((item, idx) => {
                      const originalProduct = products.find(p => p.id === item.productId);
                      return (
                        <button
                          key={idx}
                          onClick={() => originalProduct && setReplacementProduct(originalProduct)}
                          className={`px-4 py-2 rounded-xl border text-[11px] font-black transition-all flex items-center gap-2 ${
                            replacementProduct?.id === item.productId
                              ? 'bg-vibrant-purple border-vibrant-purple text-white shadow-lg'
                              : 'bg-slate-50 border-slate-100 text-violet hover:bg-slate-100'
                          }`}
                        >
                          <Package size={12} />
                          {item.productName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">ابحث عن منتج بديل:</p>
                  <div className="relative">
                    <input
                      type="text"
                      value={replacementSearch}
                      onChange={(e) => setReplacementSearch(e.target.value)}
                      placeholder="ابحث بالاسم، الوصف، أو السعر..."
                      className="w-full bg-slate-50 border border-slate-100 p-4 pr-12 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-500 transition-all shadow-inner"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                      <RefreshCw size={18} className="animate-spin-slow" />
                    </div>
                  </div>
                </div>

                {replacementSearch.trim() && (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                    {products
                      .filter(p => 
                        p.storeId === currentMerchant?.id && 
                        p.status === 'published' &&
                        (
                          p.name.toLowerCase().includes(replacementSearch.toLowerCase()) || 
                          p.description?.toLowerCase().includes(replacementSearch.toLowerCase()) ||
                          p.price.toString().includes(replacementSearch)
                        )
                      )
                      .map(p => (
                        <button
                          key={p.id}
                          onClick={() => setReplacementProduct(p)}
                          className={`w-full p-4 rounded-2xl border text-right transition-all flex items-center gap-4 ${
                            replacementProduct?.id === p.id 
                              ? 'bg-slate-50 border-slate-200 ring-2 ring-slate-100 shadow-sm' 
                              : 'bg-white border-slate-100 hover:border-slate-100 hover:bg-slate-50'
                          }`}
                        >
                          <img src={p.image || undefined} className="w-12 h-12 rounded-xl object-cover border border-white shadow-sm" alt="" />
                          <div className="flex-1">
                            <p className="font-black text-xs text-violet line-clamp-1">{p.name}</p>
                            <p className="text-[10px] font-bold text-violet mt-1">{p.finalPrice.toLocaleString()} د.ع</p>
                          </div>
                          {replacementProduct?.id === p.id && <CheckCircle size={18} className="text-slate-600" />}
                        </button>
                      ))}
                  </div>
                )}

                {replacementProduct && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black text-emerald-700 uppercase">المنتج البديل المختار:</p>
                      <button 
                        onClick={() => setReplacementProduct(null)}
                        className="text-[10px] bg-white text-emerald-600 px-3 py-1 rounded-full font-black border border-emerald-100 shadow-sm"
                      >تغيير</button>
                    </div>
                    <div className="flex items-center gap-4">
                      <img src={replacementProduct.image || undefined} className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md" alt="" />
                      <div className="flex-1">
                        <p className="font-black text-sm text-violet">{replacementProduct.name}</p>
                        <div className="flex items-center gap-2 mt-2">
                           <button 
                             onClick={() => setReplacementQuantity(Math.max(1, replacementQuantity - 1))}
                             className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm hover:bg-emerald-50 active:scale-90 transition-all font-black"
                           >-</button>
                           <span className="text-sm font-black w-8 text-center text-emerald-700">{replacementQuantity}</span>
                           <button 
                             onClick={() => setReplacementQuantity(replacementQuantity + 1)}
                             className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm hover:bg-emerald-50 active:scale-90 transition-all font-black"
                           >+</button>
                           <span className="text-[10px] font-bold text-slate-400 mr-2">الكمية المطلوبة</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {!replacementProduct && (
                  <div className="py-12 text-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/50">
                    <Package size={40} className="mx-auto mb-3 opacity-20" />
                    <p className="text-xs font-bold px-8">يرجى البحث واختيار منتج بديل لإكمال عملية الاستبدال</p>
                  </div>
                )}
              </div>

              <div className="p-8 pt-0 mt-auto bg-slate-50/30">
                <button
                  disabled={!replacementProduct}
                  onClick={handleConfirmReplacement}
                  className="w-full py-4 bg-vibrant-purple text-white rounded-2xl font-black text-sm disabled:opacity-30 disabled:grayscale transition-all shadow-xl shadow-slate-100 flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <RefreshCw size={18} />
                  إرسال الطلب للتجهيز كاستبدال
                </button>
                <p className="text-[9px] text-center text-slate-400 mt-4 font-bold flex items-center justify-center gap-1">
                  <Shield size={10} />
                  سيتم تحديث حالة الفاتورة وإظهار المنتجات البديلة للزبون والمندوب
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal: تأكيد الإرجاع */}
        <AnimatePresence>
          {returnConfirmModal.show && (
            <div className="fixed inset-0 bg-deep-navy/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 text-right">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 border border-slate-100 flex flex-col items-center gap-6"
              >
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 shadow-inner">
                  <AlertTriangle size={40} />
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-black text-violet">تأكيد إرجاع الطلب</h3>
                  <p className="text-xs font-bold text-slate-400">هل أنت متأكد من رغبتك في إرجاع هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.</p>
                </div>

                <div 
                  onClick={() => {
                    const newVal = !skipReturnConfirm;
                    setSkipReturnConfirm(newVal);
                    StorageService.save("SKIP_RETURN_CONFIRM", newVal);
                  }}
                  className="flex items-center gap-2 cursor-pointer group select-none"
                >
                   <div className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${skipReturnConfirm ? 'bg-vibrant-purple border-vibrant-purple' : 'bg-white border-slate-200 group-hover:border-slate-300'}`}>
                      {skipReturnConfirm && <Check size={14} className="text-white" />}
                   </div>
                   <span className="text-[11px] font-black text-slate-500">عدم إظهار رسالة التأكيد مجدداً</span>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full">
                   <button
                     onClick={() => setReturnConfirmModal({ show: false, orderId: "" })}
                     className="py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs hover:bg-slate-200 transition-colors"
                   >إلغاء</button>
                   <button
                     onClick={() => {
                       updateOrderStatus(returnConfirmModal.orderId, "returned", "إرجاع من قبل التاجر");
                       setReturnConfirmModal({ show: false, orderId: "" });
                     }}
                     className="py-3.5 bg-rose-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-rose-100 hover:bg-rose-600 active:scale-95 transition-all"
                   >تأكيد الإرجاع</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: الفاتورة الإلكترونية المطورة */}
        <AnimatePresence>
          {showInvoiceModal && selectedInvoice && (
            <div className="fixed inset-0 bg-deep-navy/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
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
                        onClick={() => handleShareWhatsAppInvoice(selectedInvoice)}
                        className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg hover:bg-emerald-600 transition-all flex items-center gap-2 text-xs font-black"
                     >
                       <MessageCircle size={18} />
                       <span>واتساب</span>
                     </button>
                     <button
                        onClick={handlePrint}
                        className="p-3 bg-vibrant-purple text-white rounded-2xl shadow-lg hover:bg-vibrant-purple transition-all flex items-center gap-2 text-xs font-black"
                     >
                       <Zap size={18} />
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
                  <style>
                    {`
                      @media print {
                        @page {
                          size: 80mm auto; /* Thermal printer width */
                          margin: 0;
                        }
                        body {
                          width: 80mm;
                          max-width: 80mm;
                          margin: 0;
                          padding: 5mm;
                          font-family: 'Courier New', Courier, monospace;
                          color: #000;
                        }
                        .invoice-container {
                          width: 100%;
                          padding: 0;
                          margin: 0;
                          min-height: auto !important;
                        }
                        .invoice-container * {
                          color: #000 !important; /* Force black ink */
                        }
                        .print-hide { display: none !important; }
                      }
                    `}
                  </style>
                  <div 
                    ref={invoiceRef}
                    className="invoice-container p-10 print:p-2 bg-white min-h-[600px] text-right font-sans"
                    dir="rtl"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-10 pb-6 border-b-2 border-slate-100">
                      <div>
                        {currentMerchant?.logo ? (
                          <img src={currentMerchant.logo} className="w-20 h-20 rounded-2xl object-cover mb-4" alt="" />
                        ) : (
                          <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600 mb-4">
                            <StoreIcon size={40} />
                          </div>
                        )}
                        <h2 className="text-2xl font-black text-violet">{currentMerchant?.shopName || currentMerchant?.ownerName}</h2>
                        <p className="text-xs font-bold text-slate-400 mt-1">{"متجركم المفضل"}</p>
                      </div>
                      <div className="text-left" dir="ltr">
                        <h1 className="text-4xl font-black text-slate-200 uppercase tracking-widest mb-4">INVOICE</h1>
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-slate-400 flex items-center justify-end gap-1">
                            <span>رقم الفاتورة: </span>
                            <span className="text-violet">#{getOrderSeqId(selectedInvoice.id)}</span>
                            <CopyButton text={getOrderSeqId(selectedInvoice.id)} size={9} className="print:hidden" />
                          </div>
                          <p className="text-[10px] font-black text-slate-400">التاريخ: <span className="text-violet">{formatSafeDateTimeString(selectedInvoice.createdAt, 'ar-IQ', { dateStyle: 'short', timeStyle: 'short' })}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Customer & Merchant Details */}
                    <div className="grid grid-cols-2 gap-8 mb-10">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-3 border-r-4 border-slate-500 pr-3">مستلم الفاتورة:</p>
                        <p className="text-sm font-black text-violet mb-1 flex items-center gap-1">
                          <span>{selectedInvoice.customerName}</span>
                          <CopyButton text={selectedInvoice.customerName} size={10} className="print:hidden" />
                        </p>
                        <p className="text-[10px] font-mono text-purple-600 mb-1 select-all inline-flex items-center gap-1">
                          <span>ID: #{getCustomerSeqId(selectedInvoice.customerId)}</span>
                          <CopyButton text={getCustomerSeqId(selectedInvoice.customerId)} size={9} className="print:hidden" />
                        </p>
                        <p className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                          <span>{selectedInvoice.customerPhone}</span>
                          <CopyButton text={selectedInvoice.customerPhone} size={9} className="print:hidden" />
                        </p>
                        <p className="text-xs font-bold text-slate-400 leading-relaxed italic mb-2">{selectedInvoice.customerProvince} - {selectedInvoice.customerAddress}</p>
                        {(selectedInvoice as any).customerLat && (selectedInvoice as any).customerLng && (
                          <div className="flex gap-2 mt-3 font-tajawal">
                            <button
                              onClick={() => openNativeMapApp((selectedInvoice as any).customerLat, (selectedInvoice as any).customerLng, 'google')}
                              className="flex-1 py-3.5 bg-vibrant-purple hover:bg-violet text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition print:hidden"
                            >
                              <span>فتح عبر Google Maps</span>
                            </button>
                            <button
                              onClick={() => openNativeMapApp((selectedInvoice as any).customerLat, (selectedInvoice as any).customerLng, 'waze')}
                              className="flex-1 py-3.5 bg-sky-500 hover:bg-sky-600 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition print:hidden"
                            >
                              <span>فتح عبر Waze</span>
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-3 border-r-4 border-slate-200 pr-3">المصدر:</p>
                        <p className="text-sm font-black text-violet mb-1">{currentMerchant?.shopName || currentMerchant?.ownerName}</p>
                        <p className="text-xs font-bold text-slate-500 mb-1">{currentMerchant?.phone}</p>
                        <p className="text-xs font-bold text-slate-400">{currentMerchant?.province} - {currentMerchant?.area}</p>
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
                        {selectedInvoice.items?.map((item: any, idx: number) => (
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
                              <span className="text-xs font-black text-on-brand">{(item.price * item.quantity).toLocaleString()} د.ع</span>
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
                            id: selectedInvoice.id, 
                            store: currentMerchant?.shopName || currentMerchant?.ownerName,
                            total: selectedInvoice.total,
                            date: selectedInvoice.createdAt 
                          })}
                          size={100}
                          level="H"
                          includeMargin={true}
                        />
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Scan for E-Invoice</p>
                      </div>
                      
                      <div className="w-64 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-400">سعر المنتجات:</span>
                          <span className="font-black text-slate-600">{(selectedInvoice.subtotal || 0).toLocaleString()} د.ع</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-400">سعر التوصيل:</span>
                          <span className="font-black text-slate-600">{(selectedInvoice.deliveryPrice || 0).toLocaleString()} د.ع</span>
                        </div>
                        {selectedInvoice.discountAmount > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-emerald-600">قيمة الخصم:</span>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                                selectedInvoice.discountSponsor === 'ADMIN' 
                                  ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                                  : 'bg-purple-50 text-purple-600 border border-purple-100'
                              }`}>
                                {selectedInvoice.discountSponsor === 'ADMIN' ? 'خصم من الإدارة' : 'خصم من المتجر'}
                              </span>
                            </div>
                            <span className="font-black text-emerald-600">- {selectedInvoice.discountAmount.toLocaleString()} د.ع</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center p-4 bg-vibrant-purple rounded-2xl text-white shadow-xl shadow-slate-100 mt-2">
                          <span className="text-xs font-black uppercase">السعر الكلي المطلوب من الزبون:</span>
                          <span className="text-lg font-black">{(selectedInvoice.total || 0).toLocaleString()} د.ع</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Note */}
                    <div className="mt-16 text-center pt-8 border-t border-slate-100 flex flex-col items-center">
                      <p className="text-[10px] font-bold text-slate-400 italic mb-6">شكراً لاختياركم {currentMerchant?.shopName || currentMerchant?.ownerName}! نأمل رؤيتكم مرة أخرى قريباً.</p>
                      
                      <div className="flex w-full items-center justify-between px-8 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="text-right">
                          <p className="text-xl font-black text-violet">تطبيق محلك</p>
                          <p className="text-xs font-bold text-slate-500 mb-1">تسوق من أقرب المتاجر إليك بسرعة وسهولة</p>
                          <p className="text-[9px] font-bold text-vibrant-purple bg-vibrant-purple/10 px-2 py-0.5 rounded-full inline-block">متوفر على App Store و Google Play</p>
                        </div>
                        <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                          <QRCodeSVG value="https://mahallak.app/download" size={60} level="M" />
                        </div>
                      </div>
                      
                      <div className="w-16 h-1 bg-slate-100 mx-auto mt-6 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: ملصق الشحن الحراري */}
        <AnimatePresence>
          {showShippingLabelModal && selectedInvoice && (
            <div className="fixed inset-0 bg-deep-navy/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-[#f8f9fa] w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                dir="rtl"
              >
                {/* Header */}
                <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handlePrintShippingLabel()}
                      className="bg-vibrant-purple hover:bg-deep-navy text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-vibrant-purple/25/30 transition-all flex items-center gap-2"
                    >
                      <Printer size={16} />
                      <span>طباعة الملصق</span>
                    </button>
                    <button
                      onClick={() => handleWhatsAppShare(selectedInvoice)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <MessageCircle size={16} />
                      <span>مشاركة واتساب</span>
                    </button>
                  </div>
                  <button
                    onClick={() => { setShowShippingLabelModal(false); setSelectedInvoice(null); }}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* محتوى ملصق الشحن الحراري */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-200 flex justify-center items-center">
                  {/* حاوية الملصق بمقاس حراري متعارف عليه (مثل 100x150mm أو مقارب له) */}
                  <div 
                    ref={shippingLabelRef}
                    className="bg-white p-4 font-mono text-black print:p-0 print:m-0 w-[400px] max-w-full print:w-full border border-gray-300"
                    style={{ direction: 'rtl' }}
                  >
                    <div className="pb-3 border-b-2 border-black border-dashed flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-xl font-black">{currentMerchant?.shopName || currentMerchant?.ownerName}</h2>
                        <p className="text-xs font-bold leading-tight mt-1">توصيل سريع</p>
                      </div>
                      {/* الباركود يسهل مسحه من المندوب لتحديث الحالة */}
                      <div className="bg-white p-1 rounded-lg">
                        <QRCodeSVG value={`https://mahallak.app/deliveryQR/${selectedInvoice.id}`} size={64} level="H" />
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-black border border-black p-2 bg-black text-white text-center uppercase tracking-widest mb-3">
                        رقم الطلب: #{getOrderSeqId(selectedInvoice.id)}
                      </p>
                      <div className="space-y-2 text-sm font-bold">
                        <p className="flex justify-between items-center border-b border-gray-200 pb-1">
                          <span className="text-gray-500">اسم الزبون:</span>
                          <span className="text-lg font-black">{selectedInvoice.customerName}</span>
                        </p>
                        <p className="flex justify-between items-center border-b border-gray-200 pb-1">
                          <span className="text-gray-500">المحافظة:</span>
                          <span>{selectedInvoice.customerProvince}</span>
                        </p>
                        <p className="flex justify-between border-b border-gray-200 pb-1">
                          <span className="text-gray-500">العنوان:</span>
                          <span className="text-left w-2/3 truncate block">{selectedInvoice.customerAddress}</span>
                        </p>
                        <p className="flex justify-between items-center border-b border-gray-200 pb-1">
                          <span className="text-gray-500">تاريخ الطلب:</span>
                          <span dir="ltr">{formatSafeDate(selectedInvoice.createdAt)}</span>
                        </p>
                        <p className="flex items-center gap-1 mt-2 p-2 bg-gray-100 border border-gray-300 border-dashed justify-center">
                          <Phone size={16} /> 
                          <span className="tracking-widest font-black text-lg">{selectedInvoice.customerPhone || 'لا يوجد'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-black uppercase mb-1">المنتجات ({selectedInvoice.items?.length}):</p>
                      <ul className="text-xs space-y-1 mb-4">
                        {selectedInvoice.items?.map((item: any, idx: number) => (
                          <li key={idx} className="flex justify-between items-center border-b border-gray-100 pb-1">
                            <span className="truncate w-3/4">{item.quantity}x {item.productName}</span>
                            <span className="font-bold">{item.price.toLocaleString()} د.ع</span>
                          </li>
                        ))}
                      </ul>

                      <div className="border-t border-gray-300 pt-2 mb-4 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="font-bold text-gray-500">سعر المنتجات:</span>
                          <span className="font-black">{(selectedInvoice.subtotal || 0).toLocaleString()} د.ع</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-gray-500">سعر التوصيل:</span>
                          <span className="font-black">{(selectedInvoice.deliveryPrice || 0).toLocaleString()} د.ع</span>
                        </div>
                        {(selectedInvoice.discountAmount || 0) > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-500">قيمة الخصم ({selectedInvoice.discountSponsor === 'ADMIN' ? 'تطبيق محلك' : 'المتجر'}):</span>
                            <span className="font-black">- {(selectedInvoice.discountAmount || 0).toLocaleString()} د.ع</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t-4 border-black pt-2 flex flex-col gap-1 items-center justify-center bg-gray-100 p-2">
                      <span className="text-sm font-bold text-gray-600">المبلغ الإجمالي لتحصيل المندوب</span>
                      <span className="text-3xl font-black tabular-nums">{selectedInvoice.total?.toLocaleString()} <span className="text-sm">د.ع</span></span>
                    </div>

                    <div className="mt-4 border-t-2 border-black border-dashed pt-4 flex items-center justify-between">
                      <div className="text-right">
                        <p className="text-lg font-black tracking-tight">محلك</p>
                        <p className="text-[10px] font-bold">حمّل التطبيق الآن وابدأ التسوق</p>
                        <p className="text-[8px] font-bold text-gray-500 mt-1">متوفر على App Store و Google Play</p>
                      </div>
                      <div className="bg-white p-1 rounded-sm border border-black">
                        <QRCodeSVG value="https://mahallak.app/download" size={50} level="M" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {showPasswordChange && (
          <div className="fixed inset-0 bg-deep-navy/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-in text-right">
              <div className="flex justify-between items-center mb-6 pb-2 border-b">
                <h3 className="font-black text-violet">تغيير كلمة المرور</h3>
                <button onClick={() => setShowPasswordChange(false)}>
                  <X size={18} className="text-slate-400" />
                </button>
              </div>
              <div className="space-y-4">
                {pwStep === 1 ? (
                  <>
                    <p className="text-xs text-slate-500 font-bold">
                      سيتم إرسال رمز التحقق إلى واتساب.
                    </p>
                    <button
                      onClick={async () => {
                        try {
                          const ok = await authService.requestOTP(currentMerchant.phone, "forgot");
                          if (ok) {
                            setPwStep(2);
                            showToast("success", "تم إرسال رمز التحقق إلى واتساب!");
                          } else {
                            showModal("error", "فشل الإرسال", "يرجى المحاولة لاحقاً");
                          }
                        } catch (err: any) {
                          showModal("error", "خطأ في الاتصال", err.message || "فشل الإرسال.");
                        }
                      }}
                      className="w-full py-3 bg-vibrant-purple text-white font-bold rounded-2xl shadow-md"
                    >
                      إرسال OTP
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={otpPwCode}
                      onChange={(e) =>
                        setOtpPwCode(
                          normalizeOtpCode(e.target.value).slice(0, 6),
                        )
                      }
                      placeholder="الرمز"
                      className="w-full border p-3 rounded-2xl text-center text-xl font-mono tracking-widest"
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="كلمة المرور الجديدة (8+ حروف)"
                      className="w-full border p-3 rounded-2xl text-sm"
                    />
                    <button
                      onClick={async () => {
                        if (!otpPwCode || otpPwCode.length < 6) {
                          showToast("warning", "يرجى إكمال الرمز");
                          return;
                        }
                        if (newPassword.length < 8) {
                          showModal("error", "كلمة المرور يجب أن تكون 8 رموز على الأقل");
                          return;
                        }
                        
                        try {
                          const isValid = await authService.verifyOTP(currentMerchant.phone, otpPwCode);
                          if (!isValid) {
                            showModal("error", "الرمز غير صحيح!");
                            return;
                          }
                          
                          await updateStoreProfile({ password: newPassword });
                          setCurrentMerchant({ ...(currentMerchant as any), password: newPassword });
                          setShowPasswordChange(false);
                          setTimeout(() => showToast("success", "تم التغيير ✅"), 400);
                        } catch (error: any) {
                          showModal("error", "خطأ في التحقق", error.message || "الرمز غير صحيح!");
                        }
                      }}
                      className="w-full py-3 bg-green-600 text-white font-bold rounded-2xl shadow-md"
                    >
                      تأكيد التغيير
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Modal: إرسال هدية */}
        {giftModal.show && (
          <div className="fixed inset-0 bg-deep-navy/50 backdrop-blur-sm z-[115] flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-fade-in text-right max-h-[90vh] overflow-y-auto border border-slate-100 no-scrollbar relative">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center border border-pink-100 shrink-0">
                    <Gift size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-800 leading-tight">
                      إرسال هدية لـ {giftModal.customerName}
                    </h3>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">اختر كود خصم مخصص أو منتج مجاني لإسعاده</p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setGiftModal({
                      show: false,
                      customerId: "",
                      customerName: "",
                    })
                  }
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSendGift} className="space-y-5">
                {/* اختيار نوع الهدية */}
                <div>
                  <label className="block text-[11px] font-black text-slate-400 mb-2 mr-1 uppercase tracking-widest">
                    نوع الهدية المختارة
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setGiftType("promo")}
                      className={`py-3 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                        giftType === "promo"
                          ? "bg-purple-50 border-vibrant-purple text-vibrant-purple shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Ticket size={16} />
                      <span>كود خصم (كوبون)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGiftType("product");
                        // Pre-populate product if none selected
                        const storeProds = products.filter(p => p.storeId === currentMerchant!.id && p.status === "published");
                        if (storeProds.length > 0 && !giftProductId) {
                          setGiftProductId(storeProds[0].id);
                        }
                      }}
                      className={`py-3 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                        giftType === "product"
                          ? "bg-purple-50 border-vibrant-purple text-vibrant-purple shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Gift size={16} />
                      <span>منتج من المتجر</span>
                    </button>
                  </div>
                </div>

                {giftType === "promo" ? (
                  <>
                    <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100 leading-relaxed">
                      💡 سيتم توليد كود خصم مخصص حصرياً للزبون وإضافته لمحفظته مع إرسال إشعار فوري له للتشجيع على الشراء.
                    </p>

                    {/* حقول إنشاء كود الخصم (نوع الخصم وقيمة الخصم) */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-black text-slate-500 mb-1.5">
                          نوع الخصم
                        </label>
                        <div className="relative">
                          <select
                            value={giftDiscountType}
                            onChange={(e) => setGiftDiscountType(e.target.value as any)}
                            className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple p-3 text-xs font-bold text-slate-700 appearance-none focus:outline-none focus:ring-4 focus:ring-purple-50 transition-all cursor-pointer"
                          >
                            <option value="amount">مبلغ ثابت (د.ع)</option>
                            <option value="percent">نسبة مئوية (%)</option>
                          </select>
                          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                            <ChevronDown size={14} />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-500 mb-1.5">
                          قيمة الخصم
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={giftAmount || ""}
                            onChange={(e) => setGiftAmount(parseInt(e.target.value) || 0)}
                            required
                            min="1"
                            className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple focus:ring-4 focus:ring-purple-50 p-3 text-center text-xs font-black text-slate-800 transition-all"
                          />
                          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-xs font-black text-slate-400 font-mono">
                            {giftDiscountType === "amount" ? "IQD" : "%"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* مدة الصلاحية بالأيام */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-1.5">
                        مدة الصلاحية بالـ أيام
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="مثال: 30"
                          value={giftExpiryDays || ""}
                          onChange={(e) => setGiftExpiryDays(parseInt(e.target.value) || 0)}
                          required
                          min="1"
                          className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple focus:ring-4 focus:ring-purple-50 p-3 text-center text-xs font-black text-slate-800 transition-all"
                        />
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-xs font-black text-slate-400">
                          أيام
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100 leading-relaxed">
                      💡 اختر أحد المنتجات المتاحة في متجرك لتقوم بإهدائه للزبون، وسيصله إشعار دافئ ورائع لمراجعة المتجر واستلام الهدية.
                    </p>

                    {/* اختيار المنتج */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-1.5">
                        اختر المنتج الهدية
                      </label>
                      <div className="relative">
                        <select
                          value={giftProductId}
                          onChange={(e) => setGiftProductId(e.target.value)}
                          className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple p-3 text-xs font-bold text-slate-700 appearance-none focus:outline-none focus:ring-4 focus:ring-purple-50 transition-all cursor-pointer"
                        >
                          {products
                            .filter(p => p.storeId === currentMerchant!.id && p.status === "published")
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.price.toLocaleString()} د.ع)
                              </option>
                            ))}
                          {products.filter(p => p.storeId === currentMerchant!.id && p.status === "published").length === 0 && (
                            <option value="">لا توجد منتجات منشورة حالياً في المتجر</option>
                          )}
                        </select>
                        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* أزرار الإجراء للهدية */}
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setGiftModal({
                        show: false,
                        customerId: "",
                        customerName: "",
                      })
                    }
                    className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-600 font-black rounded-2xl text-xs transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingGift}
                    className="w-2/3 py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-[0.98] text-white font-black rounded-2xl shadow-lg shadow-rose-100/50 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Gift size={16} />
                    <span>{isSendingGift ? "جاري الإرسال..." : "إرسال الهدية الآن 🎉"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* مودال المشاركة المطور */}
        <AnimatePresence>
          {showShareModal && (
            <div className="fixed inset-0 bg-deep-navy/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden text-right border border-slate-100"
              >
                <div className="p-8 pb-4">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-violet">
                      مشاركة متجرك
                    </h3>
                    <button
                      onClick={() => setShowShareModal(false)}
                      className="p-2 bg-slate-50 text-slate-400 rounded-full hover:text-rose-500 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <p className="text-[10px] font-black text-slate-400 mb-2 mr-1 uppercase tracking-widest">
                    معاينة الرسالة
                  </p>
                  <textarea
                    value={shareText}
                    onChange={(e) => setShareText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs font-bold text-slate-600 focus:ring-1 focus:ring-slate-500 outline-none leading-relaxed mb-4 min-h-[100px]"
                  />

                  <p className="text-[10px] font-black text-slate-400 mb-3 mr-1 uppercase tracking-widest text-center">
                    أين تريد النشر؟
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => executeShare("whatsapp")}
                      className="flex flex-col items-center gap-2 p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-colors group"
                    >
                      <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                        <MessageCircle size={24} />
                      </div>
                      <span className="text-[9px] font-black">واتساب</span>
                    </button>
                    <button
                      onClick={() => executeShare("telegram")}
                      className="flex flex-col items-center gap-2 p-4 bg-violet/10 text-vibrant-purple rounded-2xl hover:bg-violet/20 transition-colors group"
                    >
                      <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform text-[#b07aff]">
                        <Send size={24} />
                      </div>
                      <span className="text-[9px] font-black">تيليجرام</span>
                    </button>
                    <button
                      onClick={() => executeShare("messenger")}
                      className="flex flex-col items-center gap-2 p-4 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-colors group"
                    >
                      <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform text-slate-500">
                        <MessageCircle size={24} />
                      </div>
                      <span className="text-[9px] font-black">ماسنجر</span>
                    </button>
                    <button
                      onClick={() => executeShare("instagram")}
                      className="flex flex-col items-center gap-2 p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-colors group"
                    >
                      <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform text-rose-400">
                        <Camera size={24} />
                      </div>
                      <span className="text-[9px] font-black">انستقرام</span>
                    </button>
                    <button
                      onClick={() => executeShare("facebook")}
                      className="flex flex-col items-center gap-2 p-4 bg-violet/10 text-violet rounded-2xl hover:bg-violet/20 transition-colors group"
                    >
                      <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform text-violet">
                        <Users size={24} />
                      </div>
                      <span className="text-[9px] font-black">فيسبوك</span>
                    </button>
                    <button
                      onClick={() => executeShare("copy")}
                      className="flex flex-col items-center gap-2 p-4 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-colors group"
                    >
                      <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                        <ClipboardList size={24} />
                      </div>
                      <span className="text-[9px] font-black">نسخ الرابط</span>
                    </button>
                  </div>
                </div>

                <div className="p-8 pt-0 mt-4 text-center">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                    💡 نصيحة
                  </p>
                  <p className="text-[10px] text-violet font-black">
                    المشاركة المستمرة تزيد من مبيعاتك بنسبة تصل إلى 40%!
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: QR Storefront الهوية الرقمية */}
        <AnimatePresence>
          {showQRMenu && currentMerchant && (
            <div className="fixed inset-0 bg-deep-navy/40 backdrop-blur-md z-[70] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl relative border-4 border-white"
              >
                <div className="p-6 pb-4">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-violet text-lg flex items-center gap-2">
                      <Camera size={20} className="text-slate-600" /> الهوية
                      الرقمية
                    </h3>
                    <button
                      onClick={() => setShowQRMenu(false)}
                      className="p-2 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-inner border border-slate-100">
                    <div className="bg-white p-4 rounded-2xl shadow-md border">
                      <QRCode
                        value={`https://e-mahalak.com/store/${currentMerchant.username}`}
                        size={180}
                        fgColor="#4F46E5"
                      />
                    </div>
                    <h2 className="text-xl font-black text-violet">
                      {currentMerchant.shopName}
                    </h2>
                    <p className="text-xs text-violet font-bold bg-white px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm">
                      امسح الرمز لزيارة متجرنا
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-2">
                  <p className="text-[10px] text-slate-500 font-bold text-center mb-4">
                    اطلب من الزبائن مسح الرمز لمتابعة محلك على التطبيق.
                    <br />
                    يمكنك طباعة هذا الرمز ولصقه على باب المحل أو الأكياس!
                  </p>
                  <button
                    onClick={() =>
                      alert("ميزة حفظ الصورة أو طباعتها قيد التطوير")
                    }
                    className="w-full py-4 bg-vibrant-purple hover:bg-vibrant-purple text-white font-black rounded-2xl shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-2"
                  >
                    حفظ وإرسال للطباعة
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Unsaved Changes */}
        <AnimatePresence>
          {showUnsavedModal && (
            <div className="fixed inset-0 bg-deep-navy/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative overflow-hidden text-center"
              >
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                  <AlertTriangle className="text-amber-500 w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-violet mb-2">
                  توجد تعديلات غير محفوظة!
                </h3>
                <p className="text-xs text-slate-500 mb-6 px-4">
                  هل تريد حفظ التعديلات في ملفك الشخصي قبل مغادرة الصفحة؟
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={async () => {
                      const dbPayload = {
                        ...profileForm,
                        payoutMethods: {
                          zainCashNumber: profileForm.zainCashNumber,
                          mastercardNumber: profileForm.mastercardNumber,
                        }
                      };
                      await updateStoreProfile(dbPayload);
                      setIsProfileDirty(false);
                      setShowUnsavedModal(false);
                      handleTabChange(pendingTab);
                      setPendingTab(null);
                    }}
                    className="p-3 bg-vibrant-purple text-white rounded-2xl font-bold text-xs hover:bg-vibrant-purple transition"
                  >
                    حفظ ومغادرة
                  </button>
                  <button
                    onClick={() => {
                      if (currentMerchant) {
                        setProfileForm({
                          ownerName: currentMerchant.ownerName,
                          shopName: currentMerchant.shopName,
                          username: currentMerchant.username,
                          category: currentMerchant.category || "clothing",
                          province: currentMerchant.province,
                          area: currentMerchant.area,
                          landmark: currentMerchant.landmark,
                          deliveryPrice: currentMerchant.deliveryPrice || 5000,
                          isFreeDelivery: currentMerchant.isFreeDelivery || false,
                          localProvinceDeliveryPrice: (currentMerchant as any).localProvinceDeliveryPrice !== undefined ? (currentMerchant as any).localProvinceDeliveryPrice : (currentMerchant.deliveryPrice || 5000),
                          otherProvincesDeliveryPrice: (currentMerchant as any).otherProvincesDeliveryPrice !== undefined ? (currentMerchant as any).otherProvincesDeliveryPrice : 8000,
                          localProvinceFreeDelivery: (currentMerchant as any).localProvinceFreeDelivery || false,
                          otherProvincesFreeDelivery: (currentMerchant as any).otherProvincesFreeDelivery || false,
                          provinceDeliveryPrices: (currentMerchant as any).provinceDeliveryPrices || {},
                          provinceFreeDelivery: (currentMerchant as any).provinceFreeDelivery || {},
                          logo: currentMerchant.logo || "",
                          lat: currentMerchant.lat,
                          lng: currentMerchant.lng,
                          showArea: currentMerchant.showArea !== false,
                          showLandmark: currentMerchant.showLandmark !== false,
                          showMap: currentMerchant.showMap !== false,
                          showPhone: currentMerchant.showPhone !== false,
                          zainCashNumber: (currentMerchant as any).payoutMethods?.zainCashNumber || "",
                          mastercardNumber: (currentMerchant as any).payoutMethods?.mastercardNumber || ""
                        });
                      }
                      setIsProfileDirty(false);
                      setShowUnsavedModal(false);
                      handleTabChange(pendingTab);
                      setPendingTab(null);
                    }}
                    className="p-3 bg-rose-50 text-rose-600 rounded-2xl font-bold text-xs hover:bg-rose-100 transition"
                  >
                    تجاهل التعديلات
                  </button>
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => {
                      setShowUnsavedModal(false);
                      setPendingTab(null);
                    }}
                    className="p-2 w-full text-slate-400 text-xs font-bold hover:text-slate-600 transition"
                  >
                    إلغاء (البقاء في الصفحة)
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* مودال تفاصيل الزبون/المتابع */}
        {selectedAudienceId && (() => {
           const aud = customers.find(c => c.id === selectedAudienceId);
           if (!aud) return null;
           const custOrders = orders.filter(o => o.customerId === aud.id && o.storeId === currentMerchant?.id);
           const totalSpent = custOrders.reduce((sum, o) => sum + (o.total || 0), 0);
           return (
             <div className="fixed inset-0 bg-deep-navy/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative"
               >
                 <div className="bg-vibrant-purple p-6 text-white flex justify-between items-center rounded-b-3xl shadow-lg relative z-10">
                    <h3 className="text-xl font-black flex items-center gap-2">
                       <User size={24} /> تفاصيل المتابع
                    </h3>
                    <button onClick={() => setSelectedAudienceId(null)} className="p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition">
                       <X size={20} />
                    </button>
                 </div>
                 
                 <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="text-center pb-6 border-b border-slate-100 border-dashed">
                       <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 text-violet flex items-center justify-center rounded-2xl mx-auto mb-4 shadow-inner">
                         <span className="text-4xl font-black">{aud.name.charAt(0)}</span>
                       </div>
                       <h2 className="text-2xl font-black text-violet flex items-center justify-center gap-1.5">
                         <span>{aud.name}</span>
                         <CopyButton text={aud.name} size={15} />
                       </h2>
                       <div className="flex items-center justify-center gap-1.5 mt-1">
                         <span className="text-xs font-mono text-purple-600 select-all" dir="ltr">ID: #{getCustomerSeqId(aud.id)}</span>
                         <CopyButton text={getCustomerSeqId(aud.id)} size={11} />
                       </div>
                       <div className="flex items-center justify-center gap-1.5 mt-1">
                         <p className="text-sm text-slate-500 font-mono" dir="ltr">{aud.phone}</p>
                         <CopyButton text={aud.phone} size={11} />
                       </div>
                       <div className="flex justify-center gap-2 mt-4">
                          <span className={`px-4 py-1.5 rounded-xl font-black text-xs shadow-sm border ${
                            aud.tier === "Diamond" ? "bg-slate-50 border-slate-200 text-slate-700" :
                            aud.tier === "Platinum" ? "bg-vibrant-purple border-slate-700 text-white" :
                            aud.tier === "Gold" ? "bg-amber-50 border-amber-200 text-amber-700" :
                            "bg-slate-50 border-slate-200 text-slate-600"
                          }`}>
                            {aud.tier}
                          </span>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold block mb-1">الطلبات من متجرك</span>
                          <span className="text-xl font-black text-slate-700">{custOrders.length}</span>
                       </div>
                       <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold block mb-1">إجمالي المدفوعات</span>
                          <span className="text-xl font-black text-emerald-600">{totalSpent.toLocaleString()} <span className="text-[10px]">د.ع</span></span>
                       </div>
                       <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 col-span-2">
                          <span className="text-[10px] text-slate-400 font-bold block mb-1">الطلبات الكلية</span>
                          <span className="text-sm font-bold text-slate-700">{aud.ordersCount}</span>
                       </div>

                       <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 col-span-2">
                          <span className="text-[10px] text-slate-400 font-bold block mb-1">العنوان (المحافظة)</span>
                          <span className="text-sm font-bold text-slate-700">{aud.province}</span>
                       </div>

                       {/* قسم الإجراءات والرقابة للتاجر وحظر الزبائن */}
                       <div className="bg-[#fff5f5] p-5 rounded-2xl border border-red-100 col-span-2 text-right">
                          <span className="text-[10px] text-red-500 font-black block mb-1">إجراءات الرقابة والحماية 🛡️</span>
                          <p className="text-[9px] text-slate-500 mb-3 leading-relaxed">
                            {aud.isBlocked 
                              ? "هذا الزبون محظور حالياً من رؤية متجرك أو تقديم طلبات جديدة." 
                              : "حظر الزبون يمنعه بشكل فوري ومؤقت من الوصول للمتجر أو إرسال طلبات جديدة."}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setBlockConfirm({
                                show: true,
                                customerId: aud.id,
                                name: aud.name,
                                isBlocked: !!aud.isBlocked
                              });
                            }}
                            className={`w-full py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                              aud.isBlocked 
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                                : "bg-red-600 hover:bg-red-700 text-white"
                            }`}
                          >
                            <span>{aud.isBlocked ? "إلغاء حظر الزبون وتفعيله ✅" : "حظر هذا الزبون فوراً 🚫"}</span>
                          </button>
                       </div>

                       <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 col-span-2">
                          <span className="text-[10px] text-slate-400 font-bold block mb-1">الحالة مع متجرك</span>
                          <div className="flex gap-2 flex-wrap mt-2">
                             {(aud.followedStores ?? []).includes(currentMerchant!.id) && <span className="bg-violet/10 text-vibrant-purple px-3 py-1 text-[10px] font-bold rounded-xl border border-vibrant-purple">يتابع المتجر</span>}
                             {(aud.storeNotifications ?? []).includes(currentMerchant!.id) && <span className="bg-rose-50 text-rose-600 px-3 py-1 text-[10px] font-bold rounded-xl border border-rose-200">مفعل الإشعارات</span>}
                             {custOrders.length > 0 && <span className="bg-emerald-50 text-emerald-600 px-3 py-1 text-[10px] font-bold rounded-xl border border-emerald-200">زبون سابق</span>}
                          </div>
                       </div>
                    </div>
                 </div>
                 <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-3">
                     <button
                        onClick={() => {
                           setSelectedAudienceId(null);
                           setGiftModal({
                             show: true,
                             customerId: aud.id,
                             customerName: aud.name,
                           });
                        }}
                        className="bg-rose-100 text-rose-600 font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-rose-200 transition-colors"
                     >
                        <Gift size={20} /> إرسال هدية
                     </button>
                     <button
                        onClick={() => {
                           openExternalUrl(`https://wa.me/${aud.phone.replace(/[^0-9]/g, '')}`);
                        }}
                        className="bg-emerald-100 text-emerald-600 font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-200 transition-colors"
                     >
                        <MessageCircle size={20} /> واتساب
                     </button>
                 </div>
               </motion.div>
             </div>
           );
        })()}
        <BackgroundRemover
          isOpen={showBgRemoverModal}
          onClose={() => setShowBgRemoverModal(false)}
          onSelectImage={setProdImage}
        />

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
                    onClick={() => {
                      try {
                        navigator.clipboard.writeText(iframeUrl);
                        alert('تم نسخ الرابط بنجاح! ✅');
                      } catch (err) {
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

        {showSubscriptionModal && currentMerchant && (
          <MerchantSubscriptionPlans
            store={currentMerchant}
            supportWhatsApp={resolveSupportWhatsApp(adminSettings?.whatsappNumber)}
            pageSettings={merchantRenewalPageSettings}
            isRenewal={
              currentMerchant.subscriptionStatus === 'expired'
              || currentMerchant.subscriptionExpiry === 'منتهي'
              || !isSubscriptionActive
            }
            onClose={() => setShowSubscriptionModal(false)}
          />
        )}

        <PrivacyPolicyModal open={showPrivacyPolicy} onClose={() => setShowPrivacyPolicy(false)} />
        <AboutUsModal open={showAboutUs} onClose={() => setShowAboutUs(false)} />
      </div>
    );
  }

  // ==========================================
  // واجهات تسجيل الدخول والتسجيل (مطابقة للزبون)
  // ==========================================

  return (
    <>
    {pushPermissionModal}
    <MerchantAuthPage>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black text-white">
            محلك - لوحة التاجر
          </h1>
          <p className="mt-1 text-xs text-white">
            ابدأ بيع منتجاتك بكل سهولة
          </p>
        </div>

        {/* تسجيل الدخول */}
        {view === "login" && (
          <form onSubmit={handleLogin} noValidate className="space-y-5">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-2xl font-bold flex items-center gap-2">
                <AlertTriangle size={16} />
                {loginError}
              </div>
            )}
            
            <div className="flex p-1 bg-slate-100 rounded-xl mb-4">
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginMethod === 'phone' ? 'bg-white text-violet shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => { setLoginMethod('phone'); setLoginError(''); }}
              >
                رقم الهاتف
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginMethod === 'username' ? 'bg-white text-violet shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => { setLoginMethod('username'); setLoginError(''); }}
              >
                اسم المستخدم
              </button>
            </div>

            {loginMethod === 'phone' ? (
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
                      setLoginPhone(
                        e.target.value.replace(/\D/g, "").slice(0, 11),
                      )
                    }
                    required
                    className="flex-1 bg-brand-horizontal p-3 text-sm focus:outline-none font-mono text-left text-white placeholder:text-white/50"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">
                  اسم المستخدم (username) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: azeaa_alalmi"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                  className="w-full border border-slate-200 p-3.5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-slate-500 focus:outline-none text-left"
                  dir="ltr"
                />
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
                كلمة المرور <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="لا تقل عن 8 حروف"
                required
                className="w-full border border-slate-200 p-3.5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-slate-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setLoginError("");
                setForgotPhone(loginPhone);
                setView("forgot");
              }}
              className="text-xs font-bold text-violet hover:underline px-1"
            >
              نسيت كلمة السر؟
            </button>
            <button
              type="submit"
              disabled={isAuthBusy}
              className={`w-full py-4 font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                isAuthBusy
                  ? "bg-vibrant-purple/70 text-white cursor-wait"
                  : "bg-vibrant-purple text-white shadow-black/15 hover:bg-deep-navy"
              }`}
            >
              {isAuthBusy ? (
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

        {/* إنشاء حساب */}
        {view === "signup" && (
          <form onSubmit={handleSignup} noValidate className="space-y-4">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-2xl font-bold flex items-center gap-2">
                <AlertTriangle size={16} />
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
                  placeholder="مثال: حسين صفاء جبار"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                  className={`w-full border p-3 rounded-2xl text-sm ${ownerName.trim() ? "border-green-400" : "border-slate-200"}`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  رقم الهاتف (WhatsApp) <span className="text-red-500">*</span>
                </label>
                <div
                  className={`flex items-center border rounded-2xl overflow-hidden bg-gradient-to-r from-vibrant-purple to-deep-navy ${isPhoneValid ? "border-green-400" : phone ? "border-red-400" : "border-slate-200"}`}
                  dir="ltr"
                >
                  <span className="px-4 py-3 bg-gradient-to-r from-vibrant-purple to-deep-navy text-white text-sm font-bold border-r border-white">
                    +964
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="07*********"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
                    }
                    required
                    className="flex-1 bg-white p-3 text-sm font-mono text-left text-deep-navy focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input type="checkbox" checked={showPhone} onChange={(e) => setShowPhone(e.target.checked)} className="rounded text-vibrant-purple focus:ring-vibrant-purple" />
                  <span className="text-xs">إظهار عند الزبون</span>
                </label>

              </div>
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  اسم المحل / البيج <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: ازياء العالمي"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  required
                  className={`w-full border p-3 rounded-2xl text-sm ${shopName.trim() ? "border-green-400" : "border-slate-200"}`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  صنف المتجر <span className="text-red-500">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="w-full p-3 rounded-2xl text-sm input-brand"
                >
                  {STORE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  اسم المستخدم (username) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: azeaa_alalmi"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""),
                    )
                  }
                  required
                  className={`w-full border p-3 rounded-2xl text-sm font-mono ${isUsernameValid ? "border-green-400" : username ? "border-red-400" : "border-slate-200"}`}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  كلمة المرور <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="8 حروف أو أكثر"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`w-full border p-3 rounded-2xl text-sm ${isPasswordValid ? "border-green-400" : password ? "border-red-400" : "border-slate-200"}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    المحافظة <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedProvince}
                    onChange={(e) => setSelectedProvince(e.target.value)}
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
                  <label className="block text-xs font-bold text-white mb-1">
                    المنطقة / الحي <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: حي العامل"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    required
                    className="w-full border p-2.5 rounded-2xl text-xs mb-2"
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showArea} onChange={(e) => setShowArea(e.target.checked)} className="rounded text-vibrant-purple focus:ring-vibrant-purple" />
                    <span className="text-xs">إظهار عند الزبون</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  أقرب نقطة دالة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: متوسطة ........."
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  required
                  className="w-full border p-3 rounded-2xl text-sm mb-2"
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showLandmark} onChange={(e) => setShowLandmark(e.target.checked)} className="rounded text-vibrant-purple focus:ring-vibrant-purple" />
                  <span className="text-xs">إظهار عند الزبون</span>
                </label>
              </div>
              <div className="space-y-3 pt-2">
                <LocationPicker
                  onLocationSelect={(lat, lng) => {
                    setLat(lat);
                    setLng(lng);
                  }}
                  label="تحديد الموقع على الخريطة"
                  required={true}
                  labelClassName="block text-xs font-bold text-white mb-1"
                  hintClassName="text-[10px] text-white font-bold text-center mb-1"
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showMap} onChange={(e) => setShowMap(e.target.checked)} className="rounded text-vibrant-purple focus:ring-vibrant-purple" />
                  <span className="text-xs">إظهار عند الزبون</span>
                </label>
              </div>
              <div className="max-w-[120px] mx-auto">
                <ImageUploader
                  value={logoUrl}
                  onChange={setLogoUrl}
                  label="لوغو المحل (اختياري)"
                  labelClassName="block text-xs font-black text-white mb-1"
                  placeholder="اضغط لإضافة صورة"
                  hideSourceHint
                  emptyVariant="brand"
                />
              </div>

            </div>

            <div className="flex bg-deep-navy p-4 rounded-xl border border-white/20 mt-4 mb-4 items-center">
              <label className="flex items-center gap-3 cursor-pointer w-full text-right" dir="rtl">
                <input 
                  type="checkbox" 
                  checked={isTermsAccepted} 
                  onChange={(e) => setIsTermsAccepted(e.target.checked)} 
                  className="rounded text-vibrant-purple focus:ring-vibrant-purple w-5 h-5 shadow-sm" 
                />
                <span className="text-sm font-bold leading-relaxed">
                  <span className="text-white">أوافق على</span>{' '}
                  <button 
                    type="button" 
                    onClick={() => setShowTermsModal(true)} 
                    className="text-vibrant-purple underline underline-offset-4 decoration-2 hover:text-vibrant-purple transition-colors"
                  >
                    شروط وقوانين محلك للتاجر
                  </button>
                </span>
              </label>
            </div>

            {!isFormValid && (
              <p className="text-[10px] text-[#FFF700] text-center font-bold animate-pulse">
                ⚠️ أكمل جميع الحقول المطلوبة
              </p>
            )}
            <button
              type="submit"
              disabled={!isFormValid || isAuthBusy}
              className={`w-full py-4 font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 ${
                !isFormValid && !isAuthBusy
                  ? "bg-gray-200 text-slate-400 cursor-not-allowed"
                  : isAuthBusy
                    ? "bg-vibrant-purple/70 text-white cursor-wait"
                    : "bg-vibrant-purple text-white hover:bg-deep-navy"
              }`}
            >
              {isAuthBusy ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  <span>جارٍ إنشاء الحساب...</span>
                </>
              ) : (
                "إنشاء حساب التاجر"
              )}
            </button>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setLoginError(''); setView("login"); }}
                className="text-xs font-bold text-slate-400"
              >
                الرجوع لتسجيل الدخول
              </button>
            </div>
          </form>
        )}

        {/* OTP */}
        {view === "otp" && (
          <form onSubmit={handleOtpConfirm} noValidate className="space-y-6">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-2xl font-bold flex items-center gap-2">
                <AlertTriangle size={16} />
                {loginError}
              </div>
            )}
            <div className="text-center">
              <h3 className="text-xl font-black text-violet">
                تأكيد رقم الهاتف
              </h3>
              <p className="text-sm text-slate-400 mt-2">
                أدخل الرمز المرسل إلى واتساب
              </p>
            </div>
            <input
              type="text"
              value={otpCode}
              onChange={(e) =>
                setOtpCode(normalizeOtpCode(e.target.value).slice(0, 6))
              }
              placeholder="000000"
              required
              className="w-full border-2 border-slate-500 p-4 rounded-2xl text-center text-3xl font-mono tracking-[0.5em] focus:ring-4 focus:ring-slate-100 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isAuthBusy}
              className={`w-full py-4 text-white font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                isAuthBusy
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-vibrant-purple shadow-violet/20 hover:bg-deep-navy"
              }`}
            >
              {isAuthBusy ? (
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
            <div className="flex flex-col items-center space-y-4">
              <button
                type="button"
                disabled={!canResendOtp}
                onClick={handleResendOtp}
                className={`text-sm font-bold transition-colors ${
                  canResendOtp 
                    ? "text-violet hover:text-slate-700" 
                    : "text-slate-400 cursor-not-allowed"
                }`}
              >
                {canResendOtp ? "إعادة إرسال الرمز" : `إعادة الإرسال خلال ${otpTimer} ثانية`}
              </button>
              
              <button
                type="button"
                onClick={() =>
                  setView(otpMode === "signup" ? "signup" : "forgot")
                }
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                تغيير الرقم / رجوع
              </button>
            </div>
          </form>
        )}

        {/* نسيت كلمة السر */}
        {view === "forgot" && (
          <form onSubmit={handleForgotPassword} noValidate className="space-y-5">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-2xl font-bold flex items-center gap-2">
                <AlertTriangle size={16} />
                {loginError}
              </div>
            )}
            <div className="text-center">
              <h3 className="text-xl font-black text-violet">
                استعادة كلمة المرور
              </h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
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
                    setForgotPhone(
                      e.target.value.replace(/\D/g, "").slice(0, 11),
                    )
                  }
                  placeholder="07*********"
                  required
                  className="flex-1 bg-white p-3 text-sm font-mono text-left text-deep-navy focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                كلمة المرور الجديدة <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={forgotNewPassword}
                onChange={(e) => setForgotNewPassword(e.target.value)}
                placeholder="8 حروف أو أكثر"
                required
                className="w-full border border-slate-200 p-3.5 rounded-2xl text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-vibrant-purple text-white font-black rounded-2xl shadow-lg"
            >
              إرسال رمز OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setView("login");
                setLoginError("");
              }}
              className="w-full text-xs font-bold text-slate-400"
            >
              الرجوع لتسجيل الدخول
            </button>
          </form>
        )}
    </MerchantAuthPage>

      {/* نافذة الشروط والأحكام */}
      <AnimatePresence>
        {showTermsModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
              dir="rtl"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <MahalakLogo className="h-10 w-10 shrink-0 object-contain" />
                  <div>
                    <h2 className="text-xl font-black text-slate-800 border-b-2 border-[#7B3DFF]/30 pb-0.5 inline-block">شروط استخدام منصة "محلك" (للتاجر)</h2>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTermsModal(false)}
                  className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 shadow-sm transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                <div className="text-slate-600 text-sm leading-relaxed space-y-6 pb-4">
                  <div className="flex gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center font-bold">1</div>
                    <div>
                      <p className="font-bold text-slate-800 mb-1">القبول والالتزام</p>
                      <p>يوافق التاجر عند التسجيل في منصة "محلك" على الالتزام الكامل بهذه الشروط. أي مخالفة قد تؤدي إلى تعليق الحساب أو إنهائه.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center font-bold">2</div>
                    <div>
                      <p className="font-bold text-slate-800 mb-1">مسؤولية التاجر</p>
                      <p>يلتزم التاجر بتقديم معلومات دقيقة وصحيحة عن منتجاته، وعدم عرض أي مواد محظورة قانونياً أو مخالفة للشريعة الإسلامية والأعراف المجتمعية. التاجر هو المسؤول الوحيد عن عمليات البيع، جودة المنتجات، وعمليات الشحن والتوصيل.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-vibrant-purple/10 text-vibrant-purple flex items-center justify-center font-bold">3</div>
                    <div>
                      <p className="font-bold text-slate-800 mb-1">الاشتراكات والأموال</p>
                      <p>تحدد "محلك" رسوم اشتراك ثابتة (حسب الخطة المختارة)، ويتم تحويل المستحقات المالية للتاجر بعد خصم عمولات المنصة وأكواد الخصم المطبقة، وذلك بمدة أقصاها 24 ساعة من اكتمال عملية التسليم أو إغلاق الطلب.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center font-bold">4</div>
                    <div>
                      <p className="font-bold text-slate-800 mb-1">الخصوصية والبيانات</p>
                      <p>تلتزم "محلك" بحماية بيانات التاجر والعملاء وفقاً لأعلى معايير الأمان. لا يحق للتاجر استخدام بيانات العملاء (مثل أرقام الهواتف أو العناوين) لأي أغراض خارج نطاق معالجة طلباتهم عبر المنصة.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center font-bold">5</div>
                    <div>
                      <p className="font-bold text-slate-800 mb-1">إنهاء الخدمة</p>
                      <p>يحق لـ "محلك" إنهاء أو تعليق حساب أي تاجر في حال ثبوت الاحتيال، كثرة الشكاوى من العملاء، مخالفة الشروط، أو أي نشاط يضر بسمعة المنصة أو مستخدميها.</p>
                    </div>
                  </div>

                  <div className="bg-slate-100 rounded-2xl p-5 border border-slate-200 mt-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-vibrant-purple"></div>
                    <div className="flex items-center gap-2 mb-4">
                      <MahalakLogo className="h-5 w-5 shrink-0 object-contain" />
                      <p className="text-lg font-black text-slate-800">
                        عقد التاجر الإلكتروني
                      </p>
                    </div>
                    <div className="space-y-3 text-slate-600 text-[13px] leading-relaxed">
                      <p className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                        أوافق على كافة الشروط والأحكام المذكورة أعلاه، وأعتبر ضغطي على زر <strong>"إنشاء حساب التاجر"</strong> وتأكيد رقمي بمثابة <strong>توقيع إلكتروني ملزم قانوناً</strong> على كافة البنود.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <strong className="text-slate-800 inline-block mb-1">الطرف الأول:</strong> <br/>منصة "محلك" (ممثلّة بإدارتها).
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <strong className="text-slate-800 inline-block mb-1">الطرف الثاني:</strong> <br/>التاجر المسجل (الممثل ببياناته المقدمة).
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <strong className="text-slate-800">نطاق الخدمة:</strong> توفير منصة إلكترونية لعرض المنتجات وإدارة المبيعات والتواصل مع العملاء.
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100 mb-0">
                        <strong className="text-slate-800">الاستقلالية:</strong> التاجر يعمل كطرف مستقل، ومنصة "محلك" لا تتحمل مسؤولية أي نزاعات تنشأ بين التاجر والعميل خارج نطاق استخدام المنصة.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-white">
                <button 
                  type="button"
                  onClick={() => {
                    setIsTermsAccepted(true);
                    setShowTermsModal(false);
                  }}
                  className="w-full py-4 bg-vibrant-purple text-white font-black text-lg rounded-xl shadow-[0_8px_20px_-8px_rgba(123,61,255,0.6)] hover:bg-violet hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                >
                  <span>قرأت وموافق على الشروط</span>
                  <ChevronRight size={20} className="rotate-180" />
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
                  onClick={() => {
                    try {
                      navigator.clipboard.writeText(iframeUrl);
                      alert('تم نسخ الرابط بنجاح! ✅');
                    } catch (err) {
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

      <AnimatePresence>
        {showNotificationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowNotificationModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl p-6 sm:p-8 w-full max-w-md relative z-10 border border-slate-100"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-vibrant-purple/10 text-vibrant-purple flex items-center justify-center shrink-0">
                  <Send size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-violet">إرسال إشعار للمتابعين</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1">تواصل مع جمهورك بأحدث عروضك</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-2">
                    عنوان الإشعار
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-vibrant-purple focus:ring-1 focus:ring-vibrant-purple transition-all font-bold text-slate-700"
                    placeholder="مثال: خصم 50% على المنتجات الجديدة!"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-2">
                    تفاصيل الإشعار
                  </label>
                  <textarea
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-vibrant-purple focus:ring-1 focus:ring-vibrant-purple transition-all min-h-[100px] resize-none font-medium text-slate-600"
                    placeholder="أخبر متابعينك عن العروض، المنتجات الجديدة، أو أي تحديثات موجهة لهم..."
                    value={notificationBody}
                    onChange={(e) => setNotificationBody(e.target.value)}
                  />
                </div>
                
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-3 text-amber-600">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p className="text-[10px] sm:text-xs font-bold leading-relaxed">
                    ملاحظة: سيصل هذا الإشعار فقط للزبائن الذين قاموا بمتابعة متجرك أو تفعيل زر التنبيهات من صفحة متجرك. يُرجى الالتزام بالآداب العامة وعدم إرسال أكثر من إشعارين باليوم لتجنب الإزعاج.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowNotificationModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 hover:text-slate-700 transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSendNotificationToFollowers}
                  disabled={isSendingNotification}
                  className="flex-1 px-4 py-3 rounded-xl bg-vibrant-purple text-white font-black hover:bg-[#803ce3] transition disabled:opacity-50 flex justify-center items-center gap-2 shadow-md hover:shadow-lg"
                >
                  {isSendingNotification ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>جاري الإرسال...</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>إرسال الآن</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
