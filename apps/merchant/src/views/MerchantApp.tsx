import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense, lazy, useTransition } from "react";
import { useApp } from "@shared/context/useApp";
import { validateUserStatus } from "@shared/utils/userValidation";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Product, Order } from "@shared/types";
import { STORE_CATEGORIES, getStoreCategoryFullLabel, getProvinceLabel } from "@shared/constants";
import { isStoreSubscriptionActive } from "@shared/utils/store";
import { buildMerchantRenewalWhatsAppMessage, resolveMerchantRenewalPageSettings } from "@shared/constants/merchantRenewalPlans";
import { buildNotificationContent, notificationDeliveryFields, getNotificationDisplayText } from "@shared/constants/notificationTemplates";
import { StorageService } from "@shared/services/storageService";
import { LanguageSwitcher } from "@shared/i18n/LanguageSwitcher";
import { useLocale } from "@shared/i18n/LocaleProvider";
import { authService } from "@shared/services/authService";
import { normalizeOtpCode } from "@shared/utils/phone";
import { showToast, showModal, showConfirm } from "@shared/utils/alerts";
import { computeProductFinalPrice } from "@shared/utils/productPricing";
import {
  getMerchantInventoryDotClass,
  getMerchantInventoryLabel,
  hasTrackedInventory,
} from "@shared/utils/productInventory";
import { showLocalNotification, requestNotificationPermission, setupPushNotifications } from "@shared/lib/pushNotifications";
import {
  formatStoreVisitCount,
  subscribeStoreVisitStats,
} from "@shared/lib/storeVisitTracking";
import { formatSafeDate, formatSafeTimeString, formatSafeDateTimeString, getTimestampMillis } from "@shared/utils/date";
import { orderMatchesCustomerSearch } from "@shared/utils/customerId";
import { isOrderVisibleToMerchant, isOrderShownInMerchantInbox, isMerchantInboxClearableStatus } from "@shared/utils/orderMerchantVisibility";
import {
  buildMerchantProductSharePayload,
  buildMerchantStoreSharePayload,
  buildPlatformShareAction,
  tryNativeShare,
  type SharePlatform,
} from "@shared/utils/shareContent";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid, AreaChart, Area } from "recharts";
import { SafeChartContainer } from "@/components/SafeChartContainer";
import { useReactToPrint } from "react-to-print";
import { QRCodeSVG } from "qrcode.react";
const LazyOrderMap = lazy(() => import("@/components/OrderMap"));
import { MerchantOnboarding } from "@/components/MerchantOnboarding";
import { MerchantAuthPage } from "@/components/MerchantAuthPage";
import { MerchantTermsAgreement } from "@/components/MerchantTermsAgreement";
import { MerchantSubscriptionPlans } from "@/components/MerchantSubscriptionPlans";
import { MerchantVerificationPage } from "@/components/MerchantVerificationPage";
import { MerchantDashboardTour, markMerchantTourEligible } from "@/components/MerchantDashboardTour";
import { MerchantLocationPicker } from "@/components/MerchantLocationPicker";
import { useMerchantAndroidBack } from "@/hooks/useMerchantAndroidBack";
import { DeleteAccountSection } from "@shared/components/DeleteAccountSection";
import { PrivacyPolicyModal } from "@shared/components/PrivacyPolicyModal";
import { AboutUsModal } from "@shared/components/AboutUsModal";
import { ChangePasswordModal } from "@shared/components/ChangePasswordModal";
import { StoreIdentity } from "@shared/components/StoreIdentity";
import { VerifiedBadge } from "@shared/components/VerifiedBadge";
import { isStoreVerified } from "@shared/utils/storeVerification";
import { MahalakLogo, MahalakLogoIcon } from "@shared/components/MahalakLogo";
import { SponsoredAdSlider, type SponsoredAdItem } from "@shared/components/SponsoredAdSlider";
import { getPublishedSponsoredAds, getMerchantAdsSectionOrder } from "@shared/utils/sponsoredAds";
import { scrollAppToTop } from "@shared/utils/appScrollHistory";
import {
  buildMerchantOrderDeepLink,
  extractOrderIdFromScanPayload,
} from "@shared/utils/merchantOrderDeepLink";
import { applyHtml5QrcodeScannerTranslations } from "@/utils/html5QrcodeI18n";

/** WhatsApp دعم الاشتراك — 07735187868 */
const SUPPORT_WHATSAPP_NUMBER = "9647735187868";

function resolveSupportWhatsApp(adminWhatsapp?: string) {
  const digits = String(adminWhatsapp || "").replace(/\D/g, "");
  if (!digits || digits === "9647800000000") return SUPPORT_WHATSAPP_NUMBER;
  return digits;
}

import {
  Settings,
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
  Image as ImageIcon,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  LogOut,
  Phone,
  Bell,
  BellOff,
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
  Download,
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
  Percent,
  Copy,
  AlertCircle,
  Loader2,
  BadgeCheck,
  Eye,
} from "lucide-react";
import { ImageUploader } from "@shared/components/ImageUploader";
const BackgroundRemover = lazy(() => import("@/components/BackgroundRemover").then(m => ({ default: m.BackgroundRemover })));
const PromoBannerBuilderLazy = lazy(() => import("@/components/PromoBannerBuilder").then(m => ({ default: m.PromoBannerBuilder })));
const MerchantStorePreview = lazy(() =>
  import("@/components/MerchantStorePreview").then((m) => ({ default: m.MerchantStorePreview })),
);
const MerchantWallet = lazy(() => import("@/components/merchant/Wallet").then(m => ({ default: m.Wallet })));
const MerchantPromoCodesManager = lazy(() => import("@/components/MerchantPromoCodesManager").then(m => ({ default: m.MerchantPromoCodesManager })));
const StoreAudiencePanel = lazy(() => import("../components/StoreAudiencePanel").then(m => ({ default: m.StoreAudiencePanel })));
import type { PromoBannerFormData } from "@/components/PromoBannerBuilder";
import { CopyButton } from "@shared/components/CopyButton";
import { DashboardChunkFallback } from "@shared/components/DashboardChunkFallback";
import { ProductImage } from "@shared/components/ProductImage";
import { VirtualizedGrid } from "@shared/components/VirtualizedGrid";
import { VirtualizedList } from "@shared/components/VirtualizedList";
import { prefetchImageUrls } from "@shared/utils/prefetchImages";
import {
  getStoreAudienceStats,
  type StoreAudienceSegment,
} from "../utils/storeAudience";
import { auth } from "@shared/lib/firebase";
import { Html5Qrcode, Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";

const notificationSound = new Audio(
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
);

// ==========================================
// دالة لفتح الخرائط في الموبايل
// ==========================================
const openNativeMapApp = (lat: number, lng: number, appType: 'google' | 'waze' = 'google', noCoordsMessage?: string) => {
  if (!lat || !lng) {
    if (noCoordsMessage) alert(noCoordsMessage);
    return;
  }

  if (appType === 'google') {
    const mapUrl = `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent('Customer')})`;
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

import {
  captureElementPngBlob,
  downloadPngBlob,
  openWhatsAppInvoiceText,
  shareInvoiceTextAndImage,
} from "@/utils/shareOrderInvoice";
import { PushPermissionPrompt } from "@shared/components/PushPermissionPrompt";
import { WelcomeScreenBackground } from "@shared/components/WelcomeScreenBackground";
import { shouldShowLocationPrompt, shouldShowNotificationPrompt } from "@shared/lib/permissions";

// ==========================================
// لوحة التاجر - منصة محلك
// ==========================================

export const MerchantApp: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language } = useLocale();
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
    deleteNotification,
    deleteAllNotifications,
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
    sendMerchantFollowerNotifications,
    replaceOrderItems,
    resetStorePasswordSecure,
    setStoreCustomerBlock,
    authLoading,
    authInitialized,
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

  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationBody, setNotificationBody] = useState("");
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  const handleSendNotificationToFollowers = async () => {
    if(!notificationTitle.trim() || !notificationBody.trim()) {
        showToast("error", t("merchant.notifications.bulk.missingFieldsTitle"), t("merchant.notifications.bulk.missingFields"));
        return;
    }
    
    // Check if subscription active
    if (currentMerchant?.status !== "active" || !isStoreSubscriptionActive(currentMerchant)) {
        showToast("error", t("merchant.notifications.bulk.subscriptionInactiveTitle"), t("merchant.notifications.bulk.subscriptionInactive"));
        return;
    }

    setIsSendingNotification(true);
    try {
        const sent = await sendMerchantFollowerNotifications(
          currentMerchant!.id,
          notificationTitle.trim(),
          notificationBody.trim(),
          "promo",
        );
        if (sent <= 0) {
           showToast("info", t("merchant.notifications.bulk.noFollowersTitle"), t("merchant.notifications.bulk.noFollowers"));
           return;
        }
        showToast("success", t("merchant.notifications.bulk.sentTitle"), t("merchant.notifications.bulk.sentSuccess", { count: sent }));
        setShowNotificationModal(false);
        setNotificationTitle("");
        setNotificationBody("");
    } catch (e: any) {
        showToast("error", t("merchant.notifications.bulk.sendFailedTitle"), e.message || t("merchant.notifications.bulk.sendFailed"));
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
      lowerUrl.includes('whatsapp://') || 
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

  // مشاركة واتساب للطلب/الفاتورة تُعرَّف لاحقاً بعد refs الفاتورة

  // ==========================================
  // الحالات (States)
  // ==========================================

  // واجهات التطبيق
  const [view, setView] = useState<
    "login" | "signup" | "otp" | "forgot" | "dashboard" | "onboarding" | "terms-agreement"
  >(() => (StorageService.get('LOGGED_IN_MERCHANT_ID') ? "dashboard" : "login"));
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
        const subKey =
          diffDays <= 0
            ? 'merchant.subscription.expired'
            : diffDays === 1
              ? 'merchant.subscription.1day'
              : diffDays === 3
                ? 'merchant.subscription.3days'
                : 'merchant.subscription.7days';
        const content = buildNotificationContent(adminSettings as Record<string, unknown>, subKey, {
          ownerName: currentMerchant.ownerName,
          shopName: currentMerchant.shopName,
          expiryDate: currentMerchant.subscriptionExpiry || currentMerchant.subscriptionValidUntil || '',
          diffDays,
        });
        if (content) {
          addNotification({
            userId: currentMerchant.id,
            role: 'merchant',
            title: content.title,
            message: content.message,
            type: 'subscription',
            templateKey: subKey,
            actionLink: `https://wa.me/${resolveSupportWhatsApp(adminSettings?.whatsappNumber)}?text=${encodeURIComponent(buildMerchantRenewalWhatsAppMessage({
              shopName: currentMerchant.shopName,
              username: currentMerchant.username,
              phone: currentMerchant.phone,
            }, t("merchant.subscription.planNotSelectedYet")))}`,
            actionText: t("merchant.subscription.supportAction"),
            ...notificationDeliveryFields(adminSettings as Record<string, unknown>, subKey),
          });
        }
      }
    }
  }, [currentMerchant, notifications, addNotification, adminSettings]);

  const [activeTab, setActiveTab ] = useState<
    | "home"
    | "reports"
    | "products"
    | "orders"
    | "delivery"
    | "customers"
    | "profile"
    | "flashsales"
    | "marketing"
    | "mystore"
  >("home");

  const [isTabPending, startTabTransition] = useTransition();

  const [myStoreSubPage, setMyStoreSubPage] = useState<
    null | "reports" | "marketing" | "delivery" | "customers"
  >(null);
  const [audienceSegment, setAudienceSegment] = useState<StoreAudienceSegment | null>(null);
  const [audienceSearchQuery, setAudienceSearchQuery] = useState("");

  const isSubscriptionActive = currentMerchant
    ? isStoreSubscriptionActive(currentMerchant)
    : false;

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const applyTabChange = (newTab: any) => {
    if (!isSubscriptionActive && newTab !== "products") {
      setShowSubscriptionModal(true);
      return;
    }
    setMyStoreSubPage(null);
    setProfileSubPage(null);
    setAudienceSegment(null);
    setShowNotifications(false);
    setIframeUrl(null);
    scrollAppToTop();
    startTabTransition(() => setActiveTab(newTab));
  };

  const handleTabChange = (newTab: any) => {
    // تنبيه التغييرات غير المحفوظة فقط داخل صفحات التعديل (معلومات المتجر / الموقع)
    if (isProfileDirty && isProfileFormSubPage) {
      setPendingTab(newTab);
      setShowUnsavedModal(true);
      return;
    }
    applyTabChange(newTab);
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
  const [showStorePreview, setShowStorePreview] = useState(false);

  const [profileSubPage, setProfileSubPage] = useState<
    null | "storeInfo" | "location" | "wallet" | "verification" | "settings"
  >(null);
  const isProfileFormSubPage =
    profileSubPage === "storeInfo" || profileSubPage === "location";

  const openProfileSubPage = (page: "storeInfo" | "location" | "wallet" | "verification" | "settings") => {
    if (isProfileDirty && isProfileFormSubPage && profileSubPage !== page) {
      setPendingTab(`__profile_${page}`);
      setShowUnsavedModal(true);
      return;
    }
    setMyStoreSubPage(null);
    setShowNotifications(false);
    setIframeUrl(null);
    setProfileSubPage(page);
    scrollAppToTop();
    if (activeTab !== "profile") {
      startTabTransition(() => setActiveTab("profile"));
    }
  };

  const openMyStoreSubPage = (page: "reports" | "marketing" | "delivery" | "customers") => {
    if (!isSubscriptionActive) {
      setShowSubscriptionModal(true);
      return;
    }
    if (isProfileDirty && isProfileFormSubPage) {
      setPendingTab(`__mystore_${page}`);
      setShowUnsavedModal(true);
      return;
    }
    setProfileSubPage(null);
    setShowNotifications(false);
    setIframeUrl(null);
    if (page === "customers") {
      setAudienceSegment(null);
      setAudienceSearchQuery("");
      void refreshStoreAudience();
    }
    setMyStoreSubPage(page);
    scrollAppToTop();
    if (activeTab !== "mystore") {
      startTabTransition(() => setActiveTab("mystore"));
    }
  };

  /** توجيه التاجر لصفحة مرتبطة بموضوع الإشعار */
  const navigateFromNotification = (n: {
    id: string;
    type?: string;
    title?: string;
    message?: string;
    targetId?: string;
    actionLink?: string;
    templateKey?: string;
  }) => {
    markNotificationAsRead(n.id);
    setShowNotifications(false);

    const key = n.templateKey || "";
    const text = `${n.title || ""} ${n.message || ""}`;
    const type = n.type || "system";

    const goOrders = () => {
      if (n.targetId) setTargetOrderId(n.targetId);
      handleTabChange("orders");
    };
    const goSubscription = () => setShowSubscriptionModal(true);
    const goCustomers = () => openMyStoreSubPage("customers");
    const goVerification = () => openProfileSubPage("verification");
    const goProducts = () => handleTabChange("products");
    const goReports = () => openMyStoreSubPage("reports");
    const goMarketing = () => openMyStoreSubPage("marketing");
    const goProfile = () => handleTabChange("profile");
    const goHome = () => handleTabChange("home");

    if (type === "order" || key.includes("newOrder") || key.includes("reelsOrder") || /طلب|داواکاری/.test(n.title || "")) {
      goOrders();
      return;
    }
    if (type === "subscription" || key.includes("subscription") || /اشتراك|بەشداری|ئابوونە/.test(text)) {
      goSubscription();
      return;
    }
    if (type === "social" || key.includes("newFollower") || /متابع|شوێنکەوت/.test(text)) {
      goCustomers();
      return;
    }
    if (key.includes("verification") || /توثيق|پشتڕاست/.test(text)) {
      goVerification();
      return;
    }
    if (type === "product" || key.includes("productReview") || /تقييم منتج|هەڵسەنگاندنی بەرهەم/.test(text)) {
      goProducts();
      return;
    }
    if (key.includes("storeReview") || /تقييم|هەڵسەنگاندن/.test(text)) {
      goReports();
      return;
    }
    if (
      type === "promo" ||
      type === "event" ||
      key.includes("flashSale") ||
      key.includes("banner") ||
      key.includes("platformPromo") ||
      /فلاش|فعالية|بانر|لافتة|كود خصم/.test(text)
    ) {
      goMarketing();
      return;
    }
    if (key.includes("storeActivated") || key.includes("storeSuspended") || /تفعيل|إيقاف|حالة المتجر/.test(text)) {
      goProfile();
      return;
    }
    if (n.actionLink) {
      window.open(n.actionLink, "_blank");
      return;
    }
    goHome();
  };

  useEffect(() => {
    if (
      view !== "dashboard" ||
      activeTab !== "mystore" ||
      myStoreSubPage !== "customers" ||
      !currentMerchant?.id
    ) {
      return;
    }
    void refreshStoreAudience();
  }, [view, activeTab, myStoreSubPage, currentMerchant?.id, refreshStoreAudience]);

  // روابط قديمة #/dashboard/customers → متجري / جمهوري
  useEffect(() => {
    if (activeTab !== "customers") return;
    setActiveTab("mystore");
    setMyStoreSubPage("customers");
    void refreshStoreAudience();
  }, [activeTab, refreshStoreAudience]);

  // ==========================================
  // نظام التزامن مع تاريخ المتصفح لدعم رجوع الأندرويد وإيماءات اليد (للتاجر)
  // ==========================================
  const isPopStateRef = React.useRef(false);
  const appNavDepthRef = React.useRef(1);

  // أي تبويب أو صفحة داخلية: ابدأ من الأعلى (ما عدا الرجوع من التاريخ)
  useEffect(() => {
    if (isPopStateRef.current) return;
    if (view !== "dashboard") return;
    scrollAppToTop();
  }, [
    view,
    activeTab,
    myStoreSubPage,
    profileSubPage,
    showNotifications,
    iframeUrl,
    showStorePreview,
    audienceSegment,
  ]);

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
    const raw = hash.startsWith("#") ? hash.slice(1) : hash;
    const [pathOnly, query = ""] = raw.split("?");
    const path = pathOnly.replace(/^\/?dashboard\/?/, "");
    const parts = path.split("/").filter(Boolean);
    const params = new URLSearchParams(query);
    
    const state: any = {
      view: 'dashboard',
      activeTab: 'home',
      showNotifications: false,
      orderId: null as string | null,
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

    const orderId = params.get("orderId") || params.get("order");
    if (orderId) {
      state.view = "dashboard";
      state.activeTab = "orders";
      state.orderId = orderId;
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
    if (initialState.orderId) setTargetOrderId(initialState.orderId);
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
        if (state.orderId) {
          setTargetOrderId(state.orderId);
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
    type: "store" | "product" | "location";
    data: any;
  } | null>(null);
  const [shareText, setShareText] = useState("");

  const handlePromoBannerSave = useCallback(
    async (data: PromoBannerFormData) => {
      await updateStoreProfile({ promoBanner: data });
    },
    [updateStoreProfile],
  );

  const [marketingSelectedProductId, setMarketingSelectedProductId] = useState("");
  const [bulkStoreDiscountPercent, setBulkStoreDiscountPercent] = useState(10);
  const [bulkStoreDiscountScope, setBulkStoreDiscountScope] = useState<
    "published" | "all" | "draft" | "archived"
  >("published");
  const [bulkStoreDiscountApplying, setBulkStoreDiscountApplying] = useState(false);

  // تحميل مسبق محدود لصور منتجات التاجر (أول شاشة فقط)
  useEffect(() => {
    if (!currentMerchant?.id || view !== "dashboard") return;
    prefetchImageUrls(
      products.filter((p) => p.storeId === currentMerchant.id && p.image).slice(0, 12).map((p) => p.image),
    );
  }, [view, currentMerchant?.id, products]);

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

    const shareUrl =
      shareConfig.type === "location"
        ? String(shareConfig.data?.url || "")
        : shareConfig.type === "store"
          ? buildMerchantStoreSharePayload(shareConfig.data).url
          : buildMerchantProductSharePayload({
              ...shareConfig.data,
              storeId: shareConfig.data.storeId || currentMerchant?.id,
            }).url;

    const action = buildPlatformShareAction(platform, shareText, shareUrl);
    if (action.kind === "copy") {
      navigator.clipboard.writeText(shareText);
      showToast("success", t("share.copied"), action.message);
      setShowShareModal(false);
      return;
    }
    openExternalUrl(action.shareUrl);
    setShowShareModal(false);
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
        // الصوت الداخلي: يُعطَّل فقط إن كان soundProfile للقالب المرسل منه = صامت داخلياً
        if ((latestNotif as any).inAppSound !== false) {
          notificationSound.play().catch(() => {});
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
  /** يعيد رسم الطلبات المخفية خلال نافذة إلغاء الزبون (15ث) */
  const [orderGraceTick, setOrderGraceTick] = useState(0);

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

  const isProfileDirtyRef = useRef(false);
  isProfileDirtyRef.current = isProfileDirty;

  const buildProfileFormFromMerchant = (merchant: typeof currentMerchant) => {
    if (!merchant) return null;
    return {
      ownerName: merchant.ownerName,
      shopName: merchant.shopName,
      username: merchant.username,
      category: merchant.category || "clothing",
      province: merchant.province,
      area: merchant.area,
      landmark: merchant.landmark,
      deliveryPrice: merchant.deliveryPrice || 5000,
      isFreeDelivery: merchant.isFreeDelivery || false,
      localProvinceDeliveryPrice: (merchant as any).localProvinceDeliveryPrice !== undefined ? (merchant as any).localProvinceDeliveryPrice : (merchant.deliveryPrice || 5000),
      otherProvincesDeliveryPrice: (merchant as any).otherProvincesDeliveryPrice !== undefined ? (merchant as any).otherProvincesDeliveryPrice : 8000,
      localProvinceFreeDelivery: (merchant as any).localProvinceFreeDelivery || false,
      otherProvincesFreeDelivery: (merchant as any).otherProvincesFreeDelivery || false,
      provinceDeliveryPrices: (merchant as any).provinceDeliveryPrices || {},
      provinceFreeDelivery: (merchant as any).provinceFreeDelivery || {},
      logo: merchant.logo || "",
      lat: merchant.lat,
      lng: merchant.lng,
      showArea: merchant.showArea !== false,
      showLandmark: merchant.showLandmark !== false,
      showMap: merchant.showMap !== false,
      showPhone: merchant.showPhone !== false,
      zainCashNumber: merchant.payoutMethods?.zainCashNumber || "",
      mastercardNumber: merchant.payoutMethods?.mastercardNumber || "",
    };
  };

  const profileSaveErrorMessage = (err: unknown) => {
    const raw = err instanceof Error ? err.message : String(err || "");
    let msg = raw;
    try {
      const parsed = JSON.parse(raw) as { error?: string };
      if (parsed?.error) msg = parsed.error;
    } catch {
      /* keep raw */
    }
    if (/insufficient permissions|permission-denied|PERMISSION_DENIED/i.test(msg)) {
      return t("merchant.profileForm.permissionDenied");
    }
    return msg || t("merchant.profileForm.saveErrorGeneric");
  };

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [pwStep, setPwStep] = useState(1);
  const [otpPwCode, setOtpPwCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSendingPwOtp, setIsSendingPwOtp] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [isUpdatingProductStatus, setIsUpdatingProductStatus] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [isJoiningFlashSale, setIsJoiningFlashSale] = useState(false);
  const [isConfirmingReplacement, setIsConfirmingReplacement] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

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
  /** Caps DOM nodes in the products grid (lazy window / virtualization companion). */
  const [visibleProductsLimit, setVisibleProductsLimit] = useState(32);
  const [prodSpecialOffer, setProdSpecialOffer] = useState("");
  const [prodTags, setProdTags] = useState<string[]>([]);
  const [prodBarcode, setProdBarcode] = useState("");
  const [prodInventory, setProdInventory] = useState<number | "">("");
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState<"inventory" | "search" | "order">("inventory");
  const [isScanningOrderFile, setIsScanningOrderFile] = useState(false);
  const orderGalleryInputRef = useRef<HTMLInputElement>(null);

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

  // أظهر الطلب فور انتهاء نافذة إلغاء الزبون حتى لو تأخر إشعار Cloud Function
  useEffect(() => {
    const hasHeldPending = orders.some(
      (o) =>
        o.storeId === currentMerchant?.id &&
        o.status === "pending" &&
        o.merchantNotified === false,
    );
    if (!hasHeldPending) return;
    const id = window.setInterval(() => setOrderGraceTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [orders, currentMerchant?.id]);

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
    if (selectedProductIds.length === 0 || isBulkUpdating) return;

    const count = selectedProductIds.length;
    setIsBulkUpdating(true);
    try {
      for (const id of selectedProductIds) {
        await updateProduct(id, bulkUpdateData);
      }
      alert(t("merchant.products.alert.bulkUpdateSuccess", { count }));
      setSelectedProductIds([]);
      setShowBulkEditModal(false);
      setBulkUpdateData({});
    } catch {
      alert(t("merchant.products.alert.bulkUpdateFailed"));
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const getBulkStoreDiscountTargets = useCallback(() => {
    if (!currentMerchant?.id) return [];
    const storeProducts = products.filter((p) => p.storeId === currentMerchant.id);
    if (bulkStoreDiscountScope === "all") return storeProducts;
    return storeProducts.filter((p) => p.status === bulkStoreDiscountScope);
  }, [currentMerchant?.id, products, bulkStoreDiscountScope]);

  const applyBulkStoreDiscount = async () => {
    const percent = Number(bulkStoreDiscountPercent);
    if (!Number.isFinite(percent) || percent < 1 || percent > 99) {
      showToast("warning", t("merchant.products.toast.invalidDiscountTitle"), t("merchant.products.toast.invalidDiscount"));
      return;
    }

    const targets = getBulkStoreDiscountTargets();
    if (targets.length === 0) {
      showToast("info", t("merchant.products.toast.noProductsTitle"), t("merchant.products.toast.noProducts"));
      return;
    }

    const confirm = await showConfirm(
      t("merchant.products.confirm.applyDiscountTitle"),
      t("merchant.products.confirm.applyDiscountBody", { percent, count: targets.length }),
      t("merchant.products.confirm.applyDiscountBtn"),
    );
    if (!confirm.isConfirmed) return;

    setBulkStoreDiscountApplying(true);
    try {
      for (const product of targets) {
        await updateProduct(product.id, {
          discountType: "percent",
          discountValue: percent,
          finalPrice: computeProductFinalPrice(product.price, "percent", percent),
        });
      }
      if (currentMerchant?.id) {
        const saleContent = buildNotificationContent(adminSettings as Record<string, unknown>, "customer.storeWideSale", {
          storeName: currentMerchant.shopName,
          percent,
        });
        if (saleContent) {
          sendMerchantFollowerNotifications(
            currentMerchant.id,
            saleContent.title,
            saleContent.message,
            "promo",
            "customer.storeWideSale",
          ).catch(() => undefined);
        }
      }
      showToast("success", t("merchant.products.toast.applyDiscountSuccessTitle"), t("merchant.products.toast.applyDiscountSuccess", { percent, count: targets.length }));
    } catch {
      showToast("error", t("merchant.products.toast.applyDiscountFailedTitle"), t("merchant.products.toast.applyDiscountFailed"));
    } finally {
      setBulkStoreDiscountApplying(false);
    }
  };

  const removeBulkStoreDiscount = async () => {
    const targets = getBulkStoreDiscountTargets().filter((p) => p.discountType !== "none");
    if (targets.length === 0) {
      showToast("info", t("merchant.products.toast.noDiscountTitle"), t("merchant.products.toast.noDiscount"));
      return;
    }

    const confirm = await showConfirm(
      t("merchant.products.confirm.removeDiscountTitle"),
      t("merchant.products.confirm.removeDiscountBody", { count: targets.length }),
      t("merchant.products.confirm.removeDiscountBtn"),
    );
    if (!confirm.isConfirmed) return;

    setBulkStoreDiscountApplying(true);
    try {
      for (const product of targets) {
        await updateProduct(product.id, {
          discountType: "none",
          discountValue: 0,
          finalPrice: product.price,
        });
      }
      showToast("success", t("merchant.products.toast.removeDiscountSuccessTitle"), t("merchant.products.toast.removeDiscountSuccess", { count: targets.length }));
    } catch {
      showToast("error", t("merchant.products.toast.removeDiscountFailedTitle"), t("merchant.products.toast.removeDiscountFailed"));
    } finally {
      setBulkStoreDiscountApplying(false);
    }
  };

  const [orderFilter, setOrderFilter] = useState<
    "pending" | "accepted" | "shipped" | "delivered" | "returned" | "rejected"
  >("pending");
  const [isClearingInbox, setIsClearingInbox] = useState(false);
  // تتبع الطلب المحدد من الإشعارات للتاجر
  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);

  const openOrderFromScan = useCallback((orderId: string) => {
    const id = String(orderId || "").trim();
    if (!id) return;
    if (view !== "dashboard" || !currentMerchant) {
      try {
        sessionStorage.setItem("mahalak_pending_order_id", id);
      } catch {
        // ignore storage failures
      }
    }
    setShowShippingLabelModal(false);
    setShowInvoiceModal(false);
    setShowScanner(false);
    setSelectedInvoice(null);
    setTargetOrderId(id);
    setMyStoreSubPage(null);
    setProfileSubPage(null);
    setShowNotifications(false);
    scrollAppToTop();
    if (view === "dashboard") {
      startTabTransition(() => setActiveTab("orders"));
      showToast(
        "success",
        t("merchant.orders.shippingLabel.orderQrHint"),
        `#${getOrderSeqId(id) || id}`,
      );
    }
  }, [startTabTransition, t, view, currentMerchant, getOrderSeqId]);

  const tryOpenOrderFromPayload = useCallback(
    (raw: string) => {
      const orderId = extractOrderIdFromScanPayload(raw);
      if (!orderId) return false;
      openOrderFromScan(orderId);
      return true;
    },
    [openOrderFromScan],
  );

  const handleOrderBarcodeDecoded = useCallback(
    (decodedText: string) => {
      if (tryOpenOrderFromPayload(decodedText)) return true;

      const raw = String(decodedText || "").trim();
      const storeOrders = orders.filter((o) => o.storeId === currentMerchant?.id);
      const byId = storeOrders.find((o) => o.id === raw);
      if (byId) {
        openOrderFromScan(byId.id);
        return true;
      }
      const seq = raw.replace(/^#/, "");
      const bySeq = storeOrders.find((o) => getOrderSeqId(o.id) === seq);
      if (bySeq) {
        openOrderFromScan(bySeq.id);
        return true;
      }
      showToast("error", t("merchant.orders.scanOrderTitle"), t("merchant.orders.scanOrderNotFound"));
      return false;
    },
    [tryOpenOrderFromPayload, orders, currentMerchant?.id, openOrderFromScan, getOrderSeqId, t],
  );

  const handleScanOrderFromGallery = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      setIsScanningOrderFile(true);
      showToast("info", t("merchant.orders.scanOrderTitle"), t("merchant.orders.scanOrderGalleryScanning"));
      const readerId = "order-qr-file-reader";
      let scanner: Html5Qrcode | null = null;
      try {
        let host = document.getElementById(readerId);
        if (!host) {
          host = document.createElement("div");
          host.id = readerId;
          host.className = "hidden";
          document.body.appendChild(host);
        }
        scanner = new Html5Qrcode(readerId);
        const decodedText = await scanner.scanFile(file, false);
        setShowScanner(false);
        handleOrderBarcodeDecoded(decodedText);
      } catch {
        showToast("error", t("merchant.orders.scanOrderTitle"), t("merchant.orders.scanOrderGalleryFailed"));
      } finally {
        try {
          await scanner?.clear();
        } catch {
          // ignore cleanup errors
        }
        setIsScanningOrderFile(false);
        if (orderGalleryInputRef.current) orderGalleryInputRef.current.value = "";
      }
    },
    [handleOrderBarcodeDecoded, t],
  );

  // After login, resume order deep-link if the scan happened while logged out
  React.useEffect(() => {
    if (view !== "dashboard" || !currentMerchant) return;
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem("mahalak_pending_order_id");
      if (pending) sessionStorage.removeItem("mahalak_pending_order_id");
    } catch {
      pending = null;
    }
    if (pending) openOrderFromScan(pending);
  }, [view, currentMerchant, openOrderFromScan]);

  // Deep links / QR scan via OS camera or Capacitor app open
  React.useEffect(() => {
    const applyIncomingUrl = (url: string) => {
      tryOpenOrderFromPayload(url);
    };

    applyIncomingUrl(window.location.href);

    const onHashChange = () => applyIncomingUrl(window.location.href);
    window.addEventListener("hashchange", onHashChange);

    let removeCapListener: (() => void) | undefined;
    void (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import("@capacitor/app");
        const launch = await App.getLaunchUrl();
        if (launch?.url) applyIncomingUrl(launch.url);
        const handle = await App.addListener("appUrlOpen", ({ url }) => applyIncomingUrl(url));
        removeCapListener = () => {
          void handle.remove();
        };
      } catch {
        // Capacitor unavailable in web preview
      }
    })();

    return () => {
      window.removeEventListener("hashchange", onHashChange);
      removeCapListener?.();
    };
  }, [tryOpenOrderFromPayload]);

  const [promoModal, setPromoModal] = useState(false);
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
  const [isSharingInvoice, setIsSharingInvoice] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: t("merchant.orders.print.invoiceDocTitle", { id: selectedInvoice?.id || "" }),
    suppressErrors: true,
    onPrintError: (errorLocation, error) => {
      alert(t("merchant.orders.print.notSupported"));
    }
  });

  const handlePrintShippingLabel = useReactToPrint({
    contentRef: shippingLabelRef,
    documentTitle: t("merchant.orders.print.shippingDocTitle", { id: selectedInvoice?.id || "" }),
    suppressErrors: true,
    onPrintError: (errorLocation, error) => {
      alert(t("merchant.orders.print.notSupported"));
    }
  });

  const buildFullInvoiceWhatsAppText = useCallback(
    (order: Order) => {
      const itemsText = (order.items || [])
        .map((it: any) =>
          t("merchant.orders.whatsapp.invoice.itemLine", {
            name: it.productName,
            qty: it.quantity,
            price: Number(it.price || 0).toLocaleString(),
          }),
        )
        .join("\n\n");

      const mapsLink =
        order.customerLat && order.customerLng
          ? t("merchant.orders.whatsapp.invoice.mapLink", {
              lat: order.customerLat,
              longitude: order.customerLng,
            })
          : "\n\n";

      const discountAmount = Number(order.discountAmount || 0);
      const discountLine =
        discountAmount > 0
          ? t("merchant.orders.whatsapp.invoice.discountLine", {
              discount: discountAmount.toLocaleString(),
            })
          : "";

      return t("merchant.orders.whatsapp.invoice.body", {
        shopName: currentMerchant?.shopName || currentMerchant?.ownerName || t("merchant.orders.whatsapp.defaultShop"),
        orderId: getOrderSeqId(order.id) || order.id,
        customerName: order.customerName || t("merchant.orders.whatsapp.defaultCustomer"),
        phone: order.customerPhone || "",
        items: itemsText,
        subtotal: Number(order.subtotal || 0).toLocaleString(),
        delivery: Number(order.deliveryPrice || 0).toLocaleString(),
        discountLine,
        total: Number(order.total || 0).toLocaleString(),
        location: `${order.customerProvince || ""} - ${order.customerAddress || ""}`.trim(),
        mapLink: mapsLink,
      });
    },
    [t, currentMerchant?.shopName, currentMerchant?.ownerName, getOrderSeqId],
  );

  const runInvoiceShare = useCallback(
    async (order: Order) => {
      const el = shippingLabelRef.current;
      if (!el) throw new Error("invoice_not_ready");

      const seq = getOrderSeqId(order.id) || order.id;
      const text = buildFullInvoiceWhatsAppText(order);
      const title = t("merchant.orders.whatsapp.invoice.shareTitle", { orderId: seq });

      try {
        // Scroll label into view so off-screen clipping doesn't break capture
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        const { blob, file } = await captureElementPngBlob(el, `invoice-${seq}.png`);
        const result = await shareInvoiceTextAndImage({
          title,
          text,
          file,
          blob,
          customerPhone: order.customerPhone,
          openExternalUrl,
        });

        if (result === "shared") {
          showToast("success", title, t("merchant.orders.whatsapp.invoice.shareSuccess"));
        } else if (result === "partial") {
          showToast("success", title, t("merchant.orders.whatsapp.invoice.sharePartial"));
        } else if (result === "failed") {
          showToast("error", title, t("merchant.orders.whatsapp.invoice.shareFailed"));
        }
      } catch {
        // Capture failed — still send full invoice text via WhatsApp
        openWhatsAppInvoiceText({
          text,
          customerPhone: order.customerPhone,
          openExternalUrl,
        });
        showToast("success", title, t("merchant.orders.whatsapp.invoice.sharePartial"));
      }
    },
    [buildFullInvoiceWhatsAppText, getOrderSeqId, openExternalUrl, t],
  );

  const handleWhatsAppShare = useCallback(
    async (order: Order | null | undefined, opts?: { captureImage?: boolean }) => {
      if (!order?.id || isSharingInvoice) return;

      const invoiceOpen =
        showShippingLabelModal && selectedInvoice?.id === order.id && !!shippingLabelRef.current;
      const shouldCaptureImage = opts?.captureImage === true || invoiceOpen;

      // من بطاقة الطلب: فتح واتساب مباشرة بدون فتح الفاتورة
      if (!shouldCaptureImage) {
        setIsSharingInvoice(true);
        try {
          const text = buildFullInvoiceWhatsAppText(order);
          openWhatsAppInvoiceText({
            text,
            customerPhone: order.customerPhone,
            openExternalUrl,
          });
        } finally {
          setIsSharingInvoice(false);
        }
        return;
      }

      // من نافذة الفاتورة: التقاط صورة + مشاركة
      setIsSharingInvoice(true);
      showToast(
        "info",
        t("merchant.orders.whatsapp.invoice.shareTitle", {
          orderId: getOrderSeqId(order.id) || order.id,
        }),
        t("merchant.orders.whatsapp.invoice.capturing"),
      );

      try {
        await runInvoiceShare(order);
      } catch {
        const text = buildFullInvoiceWhatsAppText(order);
        openWhatsAppInvoiceText({
          text,
          customerPhone: order.customerPhone,
          openExternalUrl,
        });
        showToast(
          "success",
          t("merchant.orders.whatsapp.invoice.shareTitle", {
            orderId: getOrderSeqId(order.id) || order.id,
          }),
          t("merchant.orders.whatsapp.invoice.sharePartial"),
        );
      } finally {
        setIsSharingInvoice(false);
      }
    },
    [
      buildFullInvoiceWhatsAppText,
      getOrderSeqId,
      isSharingInvoice,
      openExternalUrl,
      runInvoiceShare,
      selectedInvoice?.id,
      showShippingLabelModal,
      t,
    ],
  );

  const handleSaveShippingLabel = useCallback(async () => {
    const order = selectedInvoice;
    const el = shippingLabelRef.current;
    if (!order?.id || !el || isSharingInvoice) return;

    setIsSharingInvoice(true);
    const seq = getOrderSeqId(order.id) || order.id;
    try {
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const { blob } = await captureElementPngBlob(el, `invoice-${seq}.png`, { pixelRatio: 4 });
      downloadPngBlob(blob, `invoice-${seq}.png`);
      showToast(
        "success",
        t("merchant.orders.shippingLabel.saveLabel"),
        t("merchant.orders.shippingLabel.saveSuccess"),
      );
    } catch {
      showToast(
        "error",
        t("merchant.orders.shippingLabel.saveLabel"),
        t("merchant.orders.shippingLabel.saveFailed"),
      );
    } finally {
      setIsSharingInvoice(false);
    }
  }, [getOrderSeqId, isSharingInvoice, selectedInvoice, t]);

  const handleShareWhatsAppInvoice = useCallback(
    (order: Order) => {
      void handleWhatsAppShare(order);
    },
    [handleWhatsAppShare],
  );

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
      showStorePreview,
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
      profileSubPage,
      myStoreSubPage,
      audienceSegment,
    }),
    actions: {
      setView,
      setActiveTab,
      setShowNotifications,
      setIframeUrl,
      setShowStorePreview,
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
      setProfileSubPage,
      setMyStoreSubPage,
      setAudienceSegment,
      requestLeaveProfileSubPage: () => {
        if (isProfileDirty && isProfileFormSubPage) {
          setPendingTab("__profile_hub__");
          setShowUnsavedModal(true);
          return true;
        }
        return false;
      },
    },
  });

  const handleReturnOrder = (orderId: string) => {
    if (skipReturnConfirm) {
      void runOrderStatusUpdate(orderId, "returned", t("merchant.orders.returnByMerchant"));
    } else {
      setReturnConfirmModal({ show: true, orderId });
    }
  };

  const handleConfirmReplacement = async () => {
    if (!replacementProduct || !replacementModal.orderId || isConfirmingReplacement) return;
    setIsConfirmingReplacement(true);
    try {
      const result = await replaceOrderItems(
        replacementModal.orderId,
        replacementProduct.id,
        replacementQuantity,
      );
      if (!result.success) {
        showToast("error", t("merchant.orders.update.replacementFailedTitle"), t("merchant.orders.update.replacementFailed"));
        return;
      }
      setReplacementModal({ show: false, orderId: "", originalItems: [] });
      setReplacementProduct(null);
      setReplacementSearch("");
      showToast("success", t("merchant.orders.update.replacementSuccessTitle"), t("merchant.orders.update.replacementSuccess"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("merchant.orders.update.replacementFailed");
      showToast("error", t("merchant.orders.update.replacementFailedTitle"), msg.includes("{") ? t("merchant.orders.update.replacementPermissionFailed") : msg);
    } finally {
      setIsConfirmingReplacement(false);
    }
  };

  const runOrderStatusUpdate = async (orderId: string, status: string, reason?: string) => {
    if (updatingOrderId) return;
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, status, reason);
      const bodyKey =
        status === "accepted"
          ? "merchant.orders.update.successAccepted"
          : status === "shipped"
            ? "merchant.orders.update.successShipped"
            : status === "delivered"
              ? "merchant.orders.update.successDelivered"
              : status === "rejected"
                ? "merchant.orders.update.successRejected"
                : status === "returned"
                  ? "merchant.orders.update.successReturned"
                  : "merchant.orders.update.successGeneric";
      showToast("success", t("merchant.orders.update.success"), t(bodyKey));
    } catch {
      showToast("error", t("merchant.orders.update.statusFailedTitle"), t("merchant.orders.update.statusFailed"));
    } finally {
      setUpdatingOrderId(null);
    }
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

  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(null);

  const storeAudienceStats = useMemo(
    () =>
      currentMerchant
        ? getStoreAudienceStats(currentMerchant.id, customers, orders)
        : { followers: 0, notifications: 0, pastBuyers: 0, total: 0, orderedCustomerIds: [] as string[] },
    [currentMerchant?.id, customers, orders],
  );

  const [mapVisitCount, setMapVisitCount] = useState(0);
  useEffect(() => {
    if (!currentMerchant?.id) {
      setMapVisitCount(0);
      return;
    }
    const unsub = subscribeStoreVisitStats(currentMerchant.id, (stats) => {
      setMapVisitCount(stats.visitCount);
    });
    return () => unsub();
  }, [currentMerchant?.id]);

  const openAudienceGift = useCallback((customerId: string, customerName: string) => {
    setGiftModal({ show: true, customerId, customerName });
  }, []);

  const handleMerchantSponsoredAdClick = useCallback((ad: SponsoredAdItem) => {
    if (!ad.link) return;
    const url = ad.link.startsWith("http") ? ad.link : `tel:${ad.link}`;
    openExternalUrl(url);
  }, []);

  const merchantDeliveryAds = useMemo(
    () => getPublishedSponsoredAds(adminSettings.merchantDeliveryAds),
    [adminSettings.merchantDeliveryAds],
  );

  const merchantMediaAds = useMemo(
    () => getPublishedSponsoredAds(adminSettings.merchantMediaAds),
    [adminSettings.merchantMediaAds],
  );

  const merchantAdSections = useMemo(() => {
    const sections = {
      delivery: {
        key: 'delivery' as const,
        ads: merchantDeliveryAds,
        defaultTitle: t('merchant.partnerAds.deliveryTitle'),
        defaultDesc: t('merchant.partnerAds.deliveryDesc'),
      },
      media: {
        key: 'media' as const,
        ads: merchantMediaAds,
        defaultTitle: t('merchant.partnerAds.mediaTitle'),
        defaultDesc: t('merchant.partnerAds.mediaDesc'),
      },
    };

    return getMerchantAdsSectionOrder(adminSettings.merchantAdsSectionOrder).map((key) => sections[key]);
  }, [adminSettings.merchantAdsSectionOrder, merchantDeliveryAds, merchantMediaAds, t]);

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
    if (authLoading || !authInitialized) return;

    if (currentMerchant) {
      if (stores.length > 0) {
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
      }

      setTimeout(() => {
        if (view !== "dashboard") setView("dashboard");
        // لا تمسح تعديلات المستخدم الجارية عند تحديث stores / currentMerchant
        if (isProfileDirtyRef.current) return;
        const nextForm = buildProfileFormFromMerchant(currentMerchant);
        if (nextForm) setProfileForm(nextForm);
      }, 0);
      return;
    }

    const hasPersistedSession = !!StorageService.get('LOGGED_IN_MERCHANT_ID');
    if (!hasPersistedSession) {
      setTimeout(() => {
        if (view !== "login" && view !== "signup" && view !== "otp" && view !== "forgot") {
          setView("login");
        }
      }, 0);
    }
  }, [currentMerchant, view, stores, setCurrentMerchant, authLoading, authInitialized]);

  // ==========================================
  // دوال المصادقة (مطابقة لتطبيق الزبون)
  // ==========================================

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthBusy) return;

    if (loginMethod === 'phone') {
      if (!loginPhone.trim()) {
        setLoginError(t("auth.errors.phoneEnter"));
        return;
      }
      if (!isLoginPhoneValid) {
        setLoginError(t("auth.errors.phoneInvalid"));
        return;
      }
    }

    if (loginMethod === 'username' && !loginUsername.trim()) {
      setLoginError(t("auth.errors.usernameEnter"));
      return;
    }

    if (!loginPassword) {
      setLoginError(t("auth.errors.passwordEnter"));
      return;
    }

    if (loginPassword.length < 8) {
      setLoginError(t("auth.errors.passwordMin8"));
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
        setLoginError(t("auth.errors.passwordWrong"));
      } else if (loginResult.error === 'rate_limited') {
        setLoginError(t("auth.errors.rateLimited"));
      } else if (loginResult.error === 'service_unavailable' || loginResult.error === 'network' || loginResult.error === 'auth_required') {
        setLoginError(t("auth.errors.serviceUnavailable"));
      } else {
        setLoginError(loginMethod === 'phone' ? t("auth.errors.phoneNotRegisteredMerchant") : t("auth.errors.usernameNotFound"));
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
      setLoginError(t("auth.errors.verifyFailed"));
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthBusy) return;
    setLoginError('');
    if (!isFormValid) {
      showToast('warning', t('auth.toast.missingFieldsTitle'), t('auth.toast.missingFields'));
      return;
    }
    const normalized = normalizeIraqiPhone(phone);

    setIsAuthBusy(true);
    try {
    const phoneCheck = await checkPhoneAvailable(normalized);
    if (!phoneCheck.available) {
      let message = t("auth.errors.phoneTakenMerchant");
      if (phoneCheck.blocked || phoneCheck.entityType === 'blocked') {
        message = t("auth.errors.phoneBlocked");
      } else if (phoneCheck.entityType === 'customer') {
        message = t("auth.errors.phoneTakenCustomer");
      }
      setLoginError(message);
      showModal("error", t("auth.toast.registerFailedTitle"), message);
      return;
    }

    const usernameCheck = await checkUsernameAvailable(username);
    if (!usernameCheck.available) {
      const message = t("auth.errors.usernameTakenMerchant");
      setLoginError(message);
      showModal("error", t("auth.toast.registerFailedTitle"), message);
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
        showToast("success", t("auth.toast.otpSentTitle"), t("auth.toast.otpSent"));
      } else {
        showModal("error", t("auth.toast.sendFailedTitle"), t("auth.toast.sendFailed"));
      }
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.includes("واتساب") || msg.includes("استغرق")) {
        setView("otp");
        showToast("warning", t("auth.toast.checkWhatsApp"), msg);
      } else {
        showModal("error", t("auth.toast.connectionErrorTitle"), msg || t("auth.toast.connectionError"));
      }
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthBusy) return;
    if (!forgotPhone.trim()) {
      setLoginError(t("auth.errors.phoneEnter"));
      return;
    }
    if (!forgotNewPassword) {
      setLoginError(t("auth.errors.newPasswordEnter"));
      return;
    }
    if (!iraqiPhoneRegex.test(forgotPhone)) {
      setLoginError(t("auth.errors.phoneLocalFormat"));
      return;
    }
    if (forgotNewPassword.length < 8) {
      setLoginError(t("auth.errors.newPasswordMin8"));
      return;
    }
    setIsAuthBusy(true);
    try {
      const normalized = normalizeIraqiPhone(forgotPhone);
      const found = stores.find(
        (s) => normalizeIraqiPhone(s.phone) === normalized,
      );
      if (!found) {
        setLoginError(t("auth.errors.phoneNotRegistered"));
        return;
      }
      setOtpMode("forgot");
      setOtpCode("");
      setOtpTimer(60);
      setCanResendOtp(false);
      const ok = await authService.requestOTP(normalized, "forgot");
      if (ok) {
        setView("otp");
        showToast("success", t("auth.toast.otpSentTitle"), t("auth.toast.otpSentWhatsApp"));
      } else {
        showModal("error", t("auth.toast.sendFailedTitle"), t("auth.toast.sendFailed"));
      }
    } catch (err: any) {
      showModal("error", t("auth.toast.connectionErrorTitle"), err.message || t("auth.toast.connectionError"));
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleOtpConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthBusy) return;

    if (!otpCode || otpCode.length < 6) {
      showToast("warning", t("auth.toast.otpIncompleteTitle"), t("auth.toast.otpIncomplete"));
      return;
    }

    if (otpMode === "forgot") {
      if (forgotNewPassword.length < 8) {
        showToast("warning", t("auth.toast.passwordShortTitle"), t("auth.toast.passwordShort"));
        return;
      }
      setIsAuthBusy(true);
      try {
        const result = await resetStorePasswordSecure(forgotPhone, otpCode, forgotNewPassword);
        if (!result.success) {
          showModal("error", t("auth.modal.resetFailedTitle"), result.error || t("auth.modal.resetFailedHint"));
          return;
        }
        const login = await verifyMerchantLogin({
          phone: normalizeIraqiPhone(forgotPhone),
          password: forgotNewPassword,
        });
        if (login?.success && login.store) {
          setCurrentMerchant(login.store as any);
          setView("dashboard");
          setShowPushPrompt(true);
          setTimeout(() => showToast("success", t("auth.toast.passwordChangedAndLogin")), 400);
        } else {
          showToast("success", t("auth.toast.passwordChanged"));
          setView("login");
        }
      } catch (error: any) {
        showModal("error", t("auth.modal.resetErrorTitle"), error.message || t("auth.toast.tryAgain"));
      } finally {
        setIsAuthBusy(false);
      }
      return;
    }

    setIsAuthBusy(true);
    try {
      const phoneToVerify = pendingData?.phone || phone;
      const normalizedPhone = normalizeIraqiPhone(phoneToVerify);
      
      const isValid = await authService.verifyOTP(normalizedPhone, otpCode);
      if (!isValid) {
        const message = t("auth.errors.otpInvalidWithHint");
        setLoginError(message);
        showModal("error", t("auth.toast.otpInvalid"), message);
        return;
      }

      if (otpMode === "signup" && pendingData) {
        const res = await registerMerchant(pendingData);
        if (res?.success) {
          if (res.storeId) markMerchantTourEligible(res.storeId);
          showModal("success", t("auth.modal.storeCreatedSuccess"));
          setView("onboarding");
          setShowPushPrompt(true);
        } else {
          showModal("error", t("auth.toast.errorTitle"), res?.message || t("auth.modal.storeCreateFailed"));
          setView("signup");
        }
      }
    } catch (error: any) {
      showModal("error", t("auth.modal.verifyErrorTitle"), error.message || t("auth.modal.otpWrong"));
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResendOtp || isResendingOtp) return;
    setIsResendingOtp(true);
    setOtpTimer(60);
    setCanResendOtp(false);
    setOtpCode("");

    const targetPhone = otpMode === "signup" ? (pendingData?.phone || phone) : forgotPhone;
    const normalized = normalizeIraqiPhone(targetPhone);
    
    try {
      const ok = await authService.requestOTP(normalized, otpMode);
      if (ok) {
        showToast("success", t("auth.toast.otpResent"));
      } else {
        showToast("error", t("auth.toast.otpResendFailed"));
      }
    } catch (err: any) {
      showModal("error", t("auth.toast.connectionErrorTitle"), err.message);
    } finally {
      setIsResendingOtp(false);
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
      if (!currentMerchant || isSendingPwOtp) return;
      setIsSendingPwOtp(true);
      try {
        const ok = await authService.requestOTP(currentMerchant.phone, "forgot");
        if (ok) {
          setPwStep(2);
          showToast("success", t("auth.toast.otpSentTitle"), t("auth.toast.otpSentWhatsApp"));
        } else {
          showToast("error", t("auth.toast.sendFailedTitle"), t("auth.toast.sendFailed"));
        }
      } catch (err: any) {
        showToast("error", t("auth.toast.connectionErrorTitle"), err.message || t("auth.errors.generic"));
      } finally {
        setIsSendingPwOtp(false);
      }
    } else {
      if (!otpPwCode || otpPwCode.length < 6) {
        showToast("warning", t("auth.toast.otpIncompleteTitle"), t("auth.toast.otpIncomplete"));
        return;
      }
      if (newPassword.length < 8) {
        alert(t("auth.toast.passwordShort"));
        return;
      }
      if (!currentMerchant || isUpdatingPassword) return;
      setIsUpdatingPassword(true);
      try {
        const result = await resetStorePasswordSecure(currentMerchant.phone, otpPwCode, newPassword);
        if (!result.success) {
          showModal("error", t("auth.modal.passwordChangeFailedTitle"), result.error || t("auth.modal.otpVerifyRetry"));
          return;
        }
        setShowPasswordChange(false);
        setPwStep(1);
        setOtpPwCode("");
        setNewPassword("");
        setTimeout(() => alert(t("auth.toast.passwordChangedSuccessAlert")), 100);
      } finally {
        setIsUpdatingPassword(false);
      }
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
      alert(t("merchant.delivery.saveSuccess"));
    } catch (e: any) {
      alert(e.message || t("merchant.delivery.saveError"));
    } finally {
      setIsDeliverySaving(false);
    }
  };

  const handleSaveProfile = async (section: "storeInfo" | "location" = "storeInfo") => {
    if (isSavingProfile) return;

    if (section === "storeInfo") {
      if (!profileForm.ownerName.trim() || !profileForm.shopName.trim()) {
        showToast("error", t("merchant.profileForm.incompleteData"), t("merchant.profileForm.ownerShopRequired"));
        return;
      }
      if (!profileForm.username.trim() || profileForm.username.trim().length < 3) {
        showToast("error", t("merchant.profileForm.usernameTitle"), t("merchant.profileForm.usernameMin"));
        return;
      }
    }

    if (section === "location") {
      if (!profileForm.province?.trim() || !profileForm.area?.trim() || !profileForm.landmark?.trim()) {
        showToast("error", t("merchant.profileForm.incompleteData"), t("merchant.profileForm.locationRequired"));
        return;
      }
      if (profileForm.lat === undefined || profileForm.lng === undefined) {
        showToast("error", t("merchant.profileForm.mapRequiredTitle"), t("merchant.profileForm.mapRequired"));
        return;
      }
    }

    setIsSavingProfile(true);
    try {
      const dbPayload =
        section === "storeInfo"
          ? {
              ownerName: profileForm.ownerName.trim(),
              shopName: profileForm.shopName.trim(),
              username: profileForm.username.trim().toLowerCase(),
              category: profileForm.category,
              showPhone: profileForm.showPhone,
              logo: profileForm.logo || "",
            }
          : {
              province: profileForm.province,
              area: profileForm.area.trim(),
              landmark: profileForm.landmark.trim(),
              lat: profileForm.lat,
              lng: profileForm.lng,
              showArea: profileForm.showArea,
              showLandmark: profileForm.showLandmark,
              showMap: profileForm.showMap,
            };

      await updateStoreProfile(dbPayload);
      setIsProfileDirty(false);
      showToast("success", t("profile.saveSuccess"), t("merchant.profileForm.saveSuccessDetail"));
    } catch (e: unknown) {
      showToast("error", t("profile.saveFailed"), profileSaveErrorMessage(e));
    } finally {
      setIsSavingProfile(false);
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
      applyHtml5QrcodeScannerTranslations(t);
      const scanner = new Html5QrcodeScanner(
        "reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        },
        false,
      );

      scanner.render(
        (decodedText) => {
          scanner.clear();
          setShowScanner(false);

          if (tryOpenOrderFromPayload(decodedText)) {
            return;
          }

          if (scannerMode === "order") {
            handleOrderBarcodeDecoded(decodedText);
            return;
          }
          
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
              alert(t("merchant.products.form.barcodeFound"));
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
        try {
          scanner.clear().catch(() => undefined);
        } catch {
          // ignore
        }
      };
    }
  }, [showScanner, products, currentMerchant, scannerMode, tryOpenOrderFromPayload, handleOrderBarcodeDecoded, t, language]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProduct) return;
    if (!prodName.trim()) {
      showToast("warning", t("merchant.products.toast.nameRequiredTitle"), t("merchant.products.toast.nameRequired"));
      return;
    }
    if (!Number.isFinite(prodPrice) || prodPrice <= 0) {
      showToast("warning", t("merchant.products.toast.invalidPriceTitle"), t("merchant.products.toast.invalidPrice"));
      return;
    }

    const data: any = {
      storeId: currentMerchant!.id,
      name: prodName.trim(),
      description: prodDesc,
      price: Number(prodPrice),
      image:
        prodImage ||
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
      discountType: prodDiscountType,
      discountValue: prodDiscountType === "none" ? 0 : Number(prodDiscountValue) || 0,
      isFreeDelivery: prodIsFreeDelivery,
      status: prodStatus,
      specialOffer: prodSpecialOffer,
      tags: prodTags,
      barcode: prodBarcode,
      finalPrice: computeProductFinalPrice(
        Number(prodPrice),
        prodDiscountType,
        prodDiscountType === "none" ? 0 : Number(prodDiscountValue) || 0,
      ),
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

    setIsSavingProduct(true);
    try {
      if (prodModal.mode === "edit" && prodModal.product) {
        await updateProduct(prodModal.product.id, data);
        showToast("success", t("merchant.products.toast.saveSuccessTitle"), t("merchant.products.toast.saveUpdated"));
      } else {
        await addProduct(data);
        showToast("success", t("merchant.products.toast.saveAddedTitle"), t("merchant.products.toast.saveAdded"));
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
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : t("merchant.products.toast.saveFailed");
      showToast("error", t("merchant.products.toast.saveFailedTitle"), msg);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = (id: string, name: string) => {
    setDeleteConfirm({ show: true, id, name });
  };

  const executeDeleteProduct = async () => {
    if (!deleteConfirm.id || isDeletingProduct) return;
    setIsDeletingProduct(true);
    try {
      await deleteProduct(deleteConfirm.id, "permanent");
      setDeleteConfirm({ show: false, id: "", name: "" });
      showToast("success", t("merchant.products.toast.deleteSuccessTitle"), t("merchant.products.toast.deleteSuccess"));
    } catch {
      showToast("error", t("merchant.products.toast.deleteFailedTitle"), t("merchant.products.toast.deleteFailed"));
    } finally {
      setIsDeletingProduct(false);
    }
  };

  const handleArchiveProduct = async (id: string) => {
    if (isUpdatingProductStatus) return;
    setIsUpdatingProductStatus(true);
    try {
      await updateProduct(id, { status: "archived" });
      alert(t("merchant.products.alert.archiveSuccess"));
    } catch (e) {
      alert(t("merchant.products.alert.archiveFailed"));
    } finally {
      setIsUpdatingProductStatus(false);
    }
  };

  const handlePublishProduct = async (id: string) => {
    if (isUpdatingProductStatus) return;
    setIsUpdatingProductStatus(true);
    try {
      await updateProduct(id, { status: "published" });
      alert(t("merchant.products.alert.publishSuccess"));
    } catch (e) {
      alert(t("merchant.products.alert.publishFailed"));
    } finally {
      setIsUpdatingProductStatus(false);
    }
  };

  const handleDraftProduct = async (id: string) => {
    if (isUpdatingProductStatus) return;
    setIsUpdatingProductStatus(true);
    try {
      await updateProduct(id, { status: "draft" });
      alert(t("merchant.products.alert.draftSuccess"));
    } catch (e) {
      alert(t("merchant.products.alert.draftFailed"));
    } finally {
      setIsUpdatingProductStatus(false);
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
        alert(t("merchant.gifts.alertPromoSuccess", { code, name: giftModal.customerName }));
      } else {
        if (!giftProductId) {
          alert(t("merchant.gifts.alertSelectProduct"));
          return;
        }
        const result = await sendCustomerGift({
          customerId: audId,
          giftType: "product",
          productId: giftProductId,
        });
        const productName = result.productName ?? products.find((p) => p.id === giftProductId)?.name ?? t("merchant.gifts.typeProduct");
        alert(t("merchant.gifts.alertProductSuccess", { product: productName, name: giftModal.customerName }));
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
        alert(t("merchant.gifts.alertPermissionDenied"));
      } else if (code === "functions/not-found") {
        alert(t("merchant.gifts.alertNotFound"));
      } else if (code === "functions/unauthenticated") {
        alert(t("merchant.gifts.alertUnauthenticated"));
      } else {
        alert(t("merchant.gifts.alertGenericError"));
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
          showLocalNotification(notification.title || t("notifications.newNotification"), notification.body || t("merchant.push.storeUpdateBody"), { type: 'new_order' });
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
            showModal("error", t("common.error"), t("merchant.terms.saveFailed"));
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
          markMerchantTourEligible(currentMerchant.id);
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
      (o) => o.storeId === currentMerchant.id && isOrderVisibleToMerchant(o),
    );
    void orderGraceTick; // يعتمد التكت لإعادة الفلترة كل ثانية خلال نافذة الإلغاء
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
      if (o.status !== 'rejected' && o.status !== 'returned' && o.status !== 'cancelled') {
        const ms = getTimestampMillis(o.createdAt);
        if (!ms) return;
        const orderDate = new Date(ms);
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
            <StoreIdentity
              name={currentMerchant.shopName}
              username={currentMerchant.username}
              verified={isStoreVerified(currentMerchant)}
              size="md"
              nameClassName="text-white text-lg"
              usernameClassName="text-slate-300 opacity-100"
            />
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {[
              { id: "home", icon: MahalakLogoIcon, label: t("merchant.nav.home") },
              { id: "products", icon: Package, label: t("merchant.nav.products") },
              { id: "orders", icon: ClipboardList, label: t("merchant.nav.orders") },
              { id: "mystore", icon: StoreIcon, label: t("merchant.nav.myStore") },
              { id: "profile", icon: User, label: t("merchant.nav.account") },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id as any)}
                className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-xl transition tour-step-desktop-${item.id} ${activeTab === item.id ? "bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white shadow-brand-glow" : "text-slate-300 hover:bg-vibrant-purple/15"}`}
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
            <span>{t("profile.logout")}</span>
          </button>
        </aside>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 customer-welcome-nav flex justify-around p-2 z-50 select-none overflow-x-auto">
          <div className="max-w-4xl mx-auto w-full flex justify-around items-center">
          {[
            { id: "home", icon: MahalakLogoIcon, label: t("merchant.nav.home"), iconSize: 24 },
            { id: "products", icon: Package, label: t("merchant.nav.products") },
            { id: "orders", icon: ClipboardList, label: t("merchant.nav.orders") },
            { id: "mystore", icon: StoreIcon, label: t("merchant.nav.myStore") },
            { id: "profile", icon: User, label: t("merchant.nav.account") },
          ].map((item) => {
            const active = activeTab === item.id;
            const iconSize = 'iconSize' in item ? item.iconSize : 18;
            return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id as any)}
              className={`flex flex-col items-center px-2 py-1.5 rounded-xl transition-all duration-300 relative tour-step-mobile-${item.id} ${active ? "text-violet" : "text-slate-400 hover:text-slate-300"}`}
            >
              <div className={`p-1.5 rounded-lg mb-1 transition-all ${active ? 'bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white shadow-brand-glow' : 'bg-transparent'}`}>
                {item.id === 'home' ? (
                  <MahalakLogoIcon size={iconSize} inverted={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-vibrant-purple'}`} />
                ) : (
                  <item.icon size={iconSize} className={`w-5 h-5 ${active ? 'text-white' : 'text-vibrant-purple'}`} />
                )}
              </div>
              <span className="text-[9px] font-bold text-slate-300">{item.label}</span>
            </button>
            );
          })}
          </div>
        </nav>

        <main className="flex-1 min-w-0 md:mr-64 p-4 md:p-6 lg:p-8 pt-0 md:pt-0 lg:pt-0 pb-24 md:pb-8 text-right w-full overflow-x-hidden">
          {/* Header Mobile / Info Bar — z مرتفع عند فتح الإشعارات حتى لا تغطيها بطاقات الصفحة (backdrop-blur ينشئ stacking context) */}
          <div
            className={`flex justify-between items-center mb-6 welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md p-4 rounded-b-2xl md:rounded-2xl shadow-lg text-white text-right relative ${
              showNotifications ? "z-[120]" : "z-20"
            }`}
          >
            <div className="flex items-center gap-3 text-right">
              {(activeTab !== "home") && (
                <button
                  onClick={() => {
                    if (activeTab === "mystore" && myStoreSubPage !== null) {
                      if (myStoreSubPage === "customers" && audienceSegment) {
                        setAudienceSegment(null);
                        setAudienceSearchQuery("");
                      } else {
                        setMyStoreSubPage(null);
                      }
                    } else if (activeTab === "profile" && profileSubPage !== null) {
                      if (isProfileDirty && isProfileFormSubPage) {
                        setPendingTab("__profile_hub__");
                        setShowUnsavedModal(true);
                      } else {
                        setProfileSubPage(null);
                      }
                    } else {
                      handleTabChange("home");
                    }
                  }}
                  className="p-2 merchant-icon-tile text-slate-300 rounded-xl hover:bg-white/15 hover:text-violet transition-all ml-1 flex items-center justify-center border border-transparent hover:border-slate-100"
                >
                  <ChevronRight size={20} />
                </button>
              )}
              <div className="text-right flex flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                  <StoreIdentity
                    name={currentMerchant.shopName}
                    username={currentMerchant.username}
                    verified={isStoreVerified(currentMerchant)}
                    size="sm"
                    nameAs="h1"
                    nameClassName="text-white"
                    usernameClassName="text-white/75 opacity-100"
                  />
                  {isSubscriptionActive ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full relative">
                      <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </div>
                      <span>{t("merchant.home.accountActive")}</span>
                    </span>
                  ) : (
                    <div className="flex flex-col items-start">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                        <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                        <span>{t("merchant.home.accountInactive")}</span>
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
                    {t("merchant.home.storeHiddenHint")}
                  </button>
                )}
                {currentMerchant?.subscriptionValidUntil && currentMerchant.subscriptionExpiry !== 'Lifetime' && isSubscriptionActive && (
                  <p className="text-[9px] font-bold text-white">
                    {t("merchant.home.expiresOn", {
                      date: new Date(currentMerchant.subscriptionValidUntil).toLocaleDateString('ar-IQ'),
                    })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3 space-x-reverse relative text-right">
              <button
                type="button"
                onClick={() => {
                  if (!showNotifications && unreadNotifsCount > 0 && currentMerchant) {
                    markAllNotificationsAsRead(currentMerchant.id, "merchant");
                  }
                  setShowNotifications(!showNotifications);
                }}
                className={`relative p-2.5 bg-white/10 text-amber-300 hover:bg-white/20 rounded-full transition-all border flex items-center justify-center shadow-sm ${
                  showNotifications ? "border-amber-300/60 bg-white/20" : "border-white/25"
                }`}
              >
                <Bell size={20} strokeWidth={1.75} />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-deep-navy">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <button
                    type="button"
                    aria-label={t("notifications.closeAria")}
                    className="fixed inset-0 z-[129] cursor-default bg-transparent"
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute left-0 top-12 z-[130] w-[min(19rem,calc(100vw-1.5rem))] bg-[#0F1830] border border-white/20 rounded-2xl shadow-2xl overflow-hidden text-white">
                    <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between gap-2 bg-white/5">
                      <h3 className="text-xs font-black text-white">{t("notifications.title")}</h3>
                      <span className="text-[9px] font-black text-white/70 bg-white/10 border border-white/15 px-2 py-0.5 rounded-full">
                        {t("notifications.count", { count: merchantNotifications.length })}
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto overscroll-contain">
                      {merchantNotifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-white/45">
                          <BellOff size={22} className="mx-auto mb-1.5 opacity-40" />
                          <p className="text-[10px] font-bold">{t("notifications.empty")}</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-white/10">
                          {merchantNotifications.slice(0, 20).map((n) => (
                            <div
                              key={n.id}
                              className={`px-3 py-2.5 text-right hover:bg-white/10 transition-colors cursor-pointer ${!n.read ? "bg-white/5" : ""}`}
                              onClick={() => navigateFromNotification(n)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  {(() => {
                                    const display = getNotificationDisplayText(n, language, adminSettings);
                                    return (
                                      <>
                                        <h4 className={`text-[11px] font-black mb-0.5 leading-snug truncate ${!n.read ? "text-white" : "text-white/75"}`}>
                                          {display.title}
                                        </h4>
                                        <p className="text-[10px] text-white/50 font-medium leading-relaxed line-clamp-2">{display.message}</p>
                                      </>
                                    );
                                  })()}
                                  {n.actionLink && n.actionText && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(n.actionLink, "_blank");
                                      }}
                                      className="mt-1.5 text-[9px] font-bold bg-white/10 text-amber-200 border border-white/15 px-2.5 py-1 rounded-lg"
                                    >
                                      {n.actionText}
                                    </button>
                                  )}
                                  <span className="text-[8px] text-white/35 font-bold mt-1 block">
                                    {formatSafeDateTimeString(n.createdAt, "ar-IQ", { dateStyle: "short", timeStyle: "short" })}
                                  </span>
                                </div>
                                <div className="flex flex-col items-center gap-1.5 shrink-0">
                                  {!n.read && <span className="w-1.5 h-1.5 bg-[#fff700] rounded-full" />}
                                  <button
                                    type="button"
                                    title={t("notifications.deleteOne")}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await deleteNotification(n.id);
                                        showToast("success", t("notifications.deleteOneSuccess"));
                                      } catch {
                                        showToast("error", t("notifications.deleteFailedTitle"), t("notifications.deleteFailedBody"));
                                      }
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

                    {merchantNotifications.length > 0 && (
                      <div className="px-3 py-2 border-t border-white/10 flex items-center justify-between gap-2 bg-white/[0.03]">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!currentMerchant) return;
                            const confirmed = await showConfirm(
                              t("notifications.deleteAllConfirmTitle"),
                              t("notifications.deleteAllConfirmBody"),
                              t("notifications.deleteAll"),
                              t("common.cancel"),
                            );
                            if (!confirmed.isConfirmed) return;
                            try {
                              const deleted = await deleteAllNotifications(currentMerchant.id, "merchant");
                              if (deleted > 0) {
                                showToast("success", t("notifications.deleteAllSuccess", { count: deleted }));
                              } else {
                                showToast("info", t("notifications.deleteAllEmpty"));
                              }
                            } catch {
                              showToast("error", t("notifications.deleteFailedTitle"), t("notifications.deleteFailedBody"));
                            }
                          }}
                          className="text-[9px] font-black text-rose-300/80 hover:text-rose-200 transition-colors"
                        >
                          {t("notifications.deleteAll")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowNotifications(false)}
                          className="text-[9px] font-black text-white/50 hover:text-white transition-colors"
                        >
                          {t("common.close")}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* الرئيسية */}
          {activeTab === "home" && (
            <div className="space-y-6">
              {/* قسم الإعلانات الممولة — في بداية الرئيسية */}
              <div className="space-y-4">
                {merchantAdSections
                  .filter((section) => section.ads.length > 0)
                  .map((section) => (
                  <section key={section.key}>
                    <SponsoredAdSlider
                      ads={section.ads}
                      adInterval={adminSettings.merchantAdInterval ?? adminSettings.adInterval ?? 5}
                      badgeLabel={adminSettings.adBadgeText}
                      size="full"
                      className="mx-1"
                      onAdClick={handleMerchantSponsoredAdClick}
                      defaultTitle={section.defaultTitle}
                      defaultDesc={section.defaultDesc}
                    />
                  </section>
                ))}
              </div>

              <div className="px-1 sm:px-2 h-full">
                <div className="space-y-6 animate-fade-in text-right text-white" dir="rtl">
              {/* لوحة "النبض السريع" (الذكاء التجاري) */}
              {(() => {
                const unreadOrdersCountVal = merchantOrders.filter(o => o.status === 'pending').length;
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                const todaySales = merchantOrders.filter(o => {
                  if (o.status !== 'delivered') return false;
                  const ms = getTimestampMillis(o.createdAt);
                  if (!ms) return false;
                  return new Date(ms).toDateString() === new Date().toDateString();
                }).reduce((sum, o) => sum + ((o.subtotal || 0) - (o.discountSponsor === 'MERCHANT' ? (o.discountAmount || 0) : 0)), 0);
                const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                const weekSales = merchantOrders.filter(o => {
                  if (o.status !== 'delivered') return false;
                  const ms = getTimestampMillis(o.createdAt);
                  return ms >= weekAgo;
                }).reduce((sum, o) => sum + ((o.subtotal || 0) - (o.discountSponsor === 'MERCHANT' ? (o.discountAmount || 0) : 0)), 0);
                const avgDailyWeek = Math.round(weekSales / 7);
                const pulsePerformanceMsg = unreadOrdersCountVal > 0 
                  ? t("merchant.home.pulseActiveOrders")
                  : (todaySales > 0
                    ? (avgDailyWeek > 0 && todaySales >= avgDailyWeek
                        ? t("merchant.home.pulseTodayAboveAvg", {
                            today: todaySales.toLocaleString(),
                            avg: avgDailyWeek.toLocaleString(),
                          })
                        : t("merchant.home.pulseTodaySales", { today: todaySales.toLocaleString() }))
                    : t("merchant.home.pulseNoSales"));

                return (
                  <div
                    className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md p-6 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group"
                  >
                    <div className="absolute -top-10 -right-10 text-white/10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                      <Activity size={140} />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-l from-vibrant-purple/20 to-transparent pointer-events-none" />
                    <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                      <div className="flex items-center gap-4">
                        <div className="welcome-icon-pulse p-2.5 bg-white/15 border border-white/25 backdrop-blur-sm rounded-2xl shadow-sm">
                          <Activity size={32} className="text-[#fff700]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-black text-xl text-white">{t("merchant.home.storePulseTitle")}</h3>
                            <span className="flex h-3 w-3 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fff700] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#fff700]"></span>
                            </span>
                          </div>
                          <p className="text-sm text-white/75 font-medium leading-relaxed max-w-md">
                            {unreadOrdersCountVal > 0
                              ? t("merchant.home.pulseIntroWithOrders", { count: unreadOrdersCountVal })
                              : t("merchant.home.pulseIntroNoOrders")}{" "}
                            {pulsePerformanceMsg}
                          </p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleTabChange("orders")} 
                        className="bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-brand-glow active:scale-95 flex items-center gap-2 shrink-0"
                      >
                        {t("merchant.home.goToOrders")} <ChevronLeft size={16} />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* تنبيهات المخزون الذكية */}
              {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
                <div className="flex flex-col gap-3">
                  {outOfStockProducts.length > 0 && (
                    <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-rose-400/35 backdrop-blur-md rounded-[2rem] p-4 flex items-start gap-4 text-white shadow-lg relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-l from-rose-600/20 to-transparent pointer-events-none" />
                      <div className="relative z-10 p-2 bg-rose-500/20 border border-rose-400/30 rounded-xl shadow-sm text-rose-300 shrink-0">
                        <AlertTriangle size={24} />
                      </div>
                      <div className="relative z-10 flex-1 min-w-0">
                        <h4 className="text-sm font-black text-rose-200 mb-1">{t("merchant.home.stock.outOfStockTitle")}</h4>
                        <p className="text-xs font-bold text-rose-200/80 mb-2">
                          {t("merchant.home.stock.outOfStockBody", { count: outOfStockProducts.length })}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {outOfStockProducts.slice(0, 3).map(p => (
                            <span key={p.id} className="text-[10px] font-bold bg-white/10 text-white px-2 py-1 rounded-lg border border-white/15 truncate max-w-[150px]">{p.name}</span>
                          ))}
                          {outOfStockProducts.length > 3 && <span className="text-[10px] font-bold text-rose-300">{t("merchant.home.stock.moreOthers", { count: outOfStockProducts.length - 3 })}</span>}
                        </div>
                      </div>
                      <button onClick={() => handleTabChange('products')} className="relative z-10 shrink-0 text-xs font-black bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl transition-all active:scale-95">{t("merchant.home.stock.updateNow")}</button>
                    </div>
                  )}

                  {lowStockProducts.length > 0 && (
                    <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-amber-400/35 backdrop-blur-md rounded-[2rem] p-4 flex items-start gap-4 text-white shadow-lg relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-l from-amber-500/15 to-transparent pointer-events-none" />
                      <div className="relative z-10 p-2 bg-amber-500/20 border border-amber-400/30 rounded-xl shadow-sm text-amber-300 shrink-0">
                        <Package size={24} />
                      </div>
                      <div className="relative z-10 flex-1 min-w-0">
                        <h4 className="text-sm font-black text-amber-200 mb-1">{t("merchant.home.stock.lowStockTitle")}</h4>
                        <p className="text-xs font-bold text-amber-200/80 mb-2">
                          {t("merchant.home.stock.lowStockBody", { count: lowStockProducts.length })}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {lowStockProducts.slice(0, 3).map(p => (
                            <span key={p.id} className="text-[10px] font-bold bg-white/10 text-[#E8ECF4] px-2 py-1 rounded-lg border border-white/15 flex items-center gap-1">
                              <span className="truncate max-w-[120px]">{p.name}</span>
                              <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-md">{t("merchant.home.stock.remaining", { count: p.inventory })}</span>
                            </span>
                          ))}
                          {lowStockProducts.length > 3 && <span className="text-[10px] font-bold text-amber-300">{t("merchant.home.stock.moreOthers", { count: lowStockProducts.length - 3 })}</span>}
                        </div>
                      </div>
                      <button onClick={() => handleTabChange('products')} className="relative z-10 shrink-0 text-xs font-black bg-white/10 hover:bg-white/20 text-white border border-white/25 px-4 py-2 rounded-xl transition-all active:scale-95 shadow-sm">{t("merchant.home.stock.manageStock")}</button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 sm:gap-5">
                {[
                  {
                    label: t("merchant.home.stats.totalOrders"),
                    val: merchantOrders.length,
                    tab: "orders",
                    icon: <ShoppingBag size={18} className="stroke-[2.5]" />,
                  },
                  {
                    label: t("merchant.home.stats.pendingPrep"),
                    val: pendingOrders.length,
                    tab: "orders",
                    icon: <RefreshCw size={18} className="stroke-[2.5]" />,
                  },
                  {
                    label: t("merchant.home.stats.audience"),
                    val: storeAudienceStats.total,
                    tab: "customers",
                    icon: <Users size={18} className="stroke-[2.5]" />,
                  },
                  {
                    label: t("merchant.home.stats.mapVisits"),
                    val: formatStoreVisitCount(mapVisitCount, language),
                    tab: "home",
                    icon: <Eye size={18} className="stroke-[2.5]" />,
                  },
                  {
                    label: t("merchant.home.stats.totalSales"),
                    val:
                      merchantOrders
                        .filter((o) => o.status === "delivered")
                        .reduce((a, b) => a + ((b.subtotal || 0) - (b.discountSponsor === 'MERCHANT' ? (b.discountAmount || 0) : 0)), 0)
                        .toLocaleString() + " د.ع",
                    tab: "home",
                    icon: <TrendingUp size={18} className="stroke-[2.5]" />,
                  },
                  {
                    label: t("merchant.home.stats.ratings"),
                    val: currentMerchant.rating ? `${currentMerchant.rating.toFixed(1)} / 5` : "0",
                    tab: "home",
                    icon: <Star size={18} className="stroke-[2.5]" />,
                  },
                  {
                    label: t("merchant.home.stats.flashSales"),
                    val: flashSales.filter(f => f.itemStoreId === currentMerchant.id && f.status === "active").length,
                    tab: "home",
                    icon: <Zap size={18} className="stroke-[2.5]" />,
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      if (s.tab === "customers") openMyStoreSubPage("customers");
                      else if (s.tab !== "home") handleTabChange(s.tab as any);
                    }}
                    className={`welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md p-5 rounded-[2rem] shadow-lg hover:bg-white/10 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden text-white ${s.tab !== 'home' ? 'cursor-pointer active:scale-[0.99]' : ''} ${s.tab === 'customers' ? 'tour-step-customers-card' : ''}`}
                  >
                    <div className="absolute -right-4 -bottom-4 w-12 h-12 rounded-full bg-vibrant-purple/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-black text-white/80">
                        {s.label}
                      </span>
                      <div className="p-2 rounded-xl shrink-0 bg-white/10 border border-white/20 text-[#fff700] transition-transform duration-300 group-hover:scale-110">
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
                  className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md p-6 rounded-[2rem] shadow-2xl relative overflow-hidden group text-white"
                >
                  <div className="absolute top-0 right-0 p-4 text-white/10 group-hover:scale-110 transition-transform">
                    <Package size={64} />
                  </div>
                  <div className="relative">
                    <h4 className="text-lg font-black text-white mb-6 flex items-center justify-between">
                      <span>{t("merchant.home.topProducts.titleMonth")}</span>
                    </h4>
                    <div className="h-64 mt-4 w-full min-w-0" dir="ltr">
                      <SafeChartContainer className="h-full w-full min-w-0">
                        <BarChart data={topSellingProductsThisMonth} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.12)" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: 'rgba(232,236,244,0.7)', fontSize: 10, fontWeight: 'bold' }}
                            interval={0}
                            angle={-30}
                            textAnchor="end"
                          />
                          <YAxis 
                            allowDecimals={false} 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: 'rgba(232,236,244,0.7)', fontSize: 11, fontWeight: 'bold' }} 
                          />
                          <Tooltip 
                            cursor={{ fill: 'rgba(123,61,255,0.12)' }} 
                            contentStyle={{ borderRadius: '16px', border: '1px solid rgba(123,61,255,0.35)', background: 'rgba(11,19,32,0.95)', boxShadow: '0 0 24px -6px rgba(123,61,255,0.45)', color: '#E8ECF4' }}
                            labelStyle={{ color: '#E8ECF4', fontWeight: 'bold', marginBottom: '4px', textAlign: 'right' }}
                            itemStyle={{ color: '#B18CFF', fontWeight: 'bold', textAlign: 'right' }}
                          />
                          <Bar dataKey="sold" name={t("merchant.home.topProducts.qtySold")} radius={[6, 6, 0, 0]}>
                            {topSellingProductsThisMonth.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#7B3DFF' : 'rgba(177,140,255,0.45)'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </SafeChartContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* الفعاليات المركزية */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div
                  className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] shadow-2xl p-6 overflow-hidden relative text-right text-white group"
                >
                  <div className="absolute -top-10 -right-10 text-white/10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                    <Zap size={140} />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-l from-rose-600/25 to-transparent pointer-events-none" />
                  <div className="relative z-10 text-right">
                    <h3 className="font-black text-2xl text-white flex items-center space-x-2 space-x-reverse mb-2 justify-start">
                      <span className="welcome-icon-pulse p-2 bg-white/15 border border-white/25 backdrop-blur-sm rounded-xl">
                        <Zap size={20} fill="currentColor" className="text-[#fff700]" />
                      </span>
                      <span>{t("merchant.flashSales.title")}</span>
                    </h3>
                    <p className="text-xs text-white/70 max-w-sm">
                      {t("merchant.flashSales.subtitle")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {flashSales.filter((s) => s.status !== "ended" && s.status !== "paused").length === 0 ? (
                    <div
                      className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-dashed border-white/25 backdrop-blur-md p-12 rounded-[2rem] shadow-lg text-center text-white"
                    >
                      <Gift size={48} className="mx-auto text-[#fff700] mb-4" />
                      <p className="font-bold text-white/80">
                        {t("merchant.flashSales.empty")}
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
                            className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] shadow-2xl p-6 text-right text-white relative overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-l from-rose-600/15 to-transparent pointer-events-none" />
                            <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h4 className="font-black text-lg text-white">
                                  {sale.title}
                                </h4>
                                <p className="text-xs text-white/60 mt-1">
                                  {sale.description}
                                </p>
                              </div>
                              {(sale.status === "upcoming" && isUpcoming) && (
                                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-full border border-amber-400/30">
                                  {t("merchant.flashSales.startsSoon")}
                                </span>
                              )}
                              {(sale.status === "active" || (!isUpcoming)) && (
                                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-400/30 flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></div>
                                  {t("merchant.flashSales.activeNow")}
                                </span>
                              )}
                            </div>

                            <div className="flex gap-4 mb-6 text-[11px] font-bold text-[#E8ECF4] bg-white/5 border border-white/15 p-3 rounded-xl">
                              <div>
                                {t("merchant.flashSales.starts")}{" "}
                                <span
                                  className="font-mono text-[#fff700]"
                                  dir="ltr"
                                >
                                  {formatSafeDateTimeString(sale.startTime)}
                                </span>
                              </div>
                              <div>
                                {t("merchant.flashSales.ends")}{" "}
                                <span
                                  className="font-mono text-[#fff700]"
                                  dir="ltr"
                                >
                                  {formatSafeDateTimeString(sale.endTime)}
                                </span>
                              </div>
                            </div>

                            {sale.status === "active" &&
                              myRequests.length === 0 && (
                                <div className="bg-rose-500/15 text-rose-300 p-3 rounded-xl text-xs font-bold mb-4 border border-rose-400/30 text-center">
                                  {t("merchant.flashSales.tooLate")}
                                </div>
                              )}

                            <div className="space-y-3">
                              <h5 className="font-bold text-white text-xs flex justify-between items-center pb-2 border-b border-white/10">
                                <span>
                                  {t("merchant.flashSales.yourProducts", { count: myRequests.length })}
                                </span>
                                {(sale.status === "upcoming" && isUpcoming) && (
                                  <button
                                    onClick={() =>
                                      setJoinFlashSaleData({
                                        flashSaleId: sale.id,
                                      })
                                    }
                                    className="px-3 py-1 bg-white/10 text-white rounded-lg font-bold text-[10px] hover:bg-white/20 transition border border-white/20"
                                  >
                                    {t("merchant.flashSales.joinProduct")}
                                  </button>
                                )}
                              </h5>

                              {myRequests.length === 0 && (
                                <div className="text-center text-white/50 py-4 text-xs font-bold bg-white/5 rounded-xl border border-dashed border-white/15">
                                  {t("merchant.flashSales.noProductsJoined")}
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
                                    className="flex justify-between items-center p-3 bg-white/5 border border-white/15 rounded-2xl shadow-sm"
                                  >
                                    <div className="flex items-center gap-3">
                                      <img
                                        src={p.image || undefined}
                                        className="w-10 h-10 rounded-xl object-cover border border-white/10"
                                      />
                                      <div>
                                        <h6 className="font-black text-[11px] text-white">
                                          {p.name}
                                        </h6>
                                        <div className="flex gap-2 text-[9px] mt-0.5">
                                          <span className="text-white/50">
                                            {t("merchant.flashSales.original")}{" "}
                                            <del>{p.price.toLocaleString()}</del>
                                          </span>
                                          <span className="text-rose-300 font-black">
                                            {t("merchant.flashSales.current")}{" "}
                                            {req.promotionalPrice.toLocaleString()}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div>
                                      {req.status === "pending" && (
                                        <span className="px-2 py-1 bg-white/10 text-white/70 font-bold text-[9px] rounded uppercase border border-white/10">
                                          {t("merchant.flashSales.statusPending")}
                                        </span>
                                      )}
                                      {req.status === "approved" && (
                                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 font-bold text-[9px] rounded uppercase border border-emerald-400/30">
                                          {t("merchant.flashSales.statusApproved")}
                                        </span>
                                      )}
                                      {req.status === "rejected" && (
                                        <span className="px-2 py-1 bg-rose-500/20 text-rose-300 font-bold text-[9px] rounded uppercase border border-rose-400/30">
                                          {t("merchant.flashSales.statusRejected")}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
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

          {/* صفحة متجري - الواجهة الرئيسية */}
          {activeTab === "mystore" && myStoreSubPage === null && (
            <div className="space-y-6">
              <div className="px-1 sm:px-2 h-full overflow-y-auto">
                <div className="merchant-glass-page space-y-6 animate-fade-in text-right text-white" dir="rtl">
                  {/* رأس الصفحة */}
                  <div className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-[2rem] shadow-2xl gap-4 relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 text-white/10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                      <StoreIcon size={140} />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-l from-vibrant-purple/20 to-transparent pointer-events-none" />
                    <div className="relative z-10">
                      <h2 className="text-xl font-black text-white font-tajawal flex items-center gap-2">
                        <span className="welcome-icon-pulse p-2 bg-white/15 border border-white/25 backdrop-blur-sm rounded-xl">
                          <StoreIcon size={22} className="text-[#fff700]" />
                        </span>
                        {t("merchant.mystore.title")}
                      </h2>
                      <p className="text-xs text-white/75 font-medium mt-1 font-tajawal">
                        {t("merchant.mystore.subtitle")}
                      </p>
                    </div>
                    <div className="relative z-10 flex items-center gap-2 shrink-0">
                      <div className="bg-white/10 border border-white/25 px-3 py-1.5 rounded-2xl">
                        <StoreIdentity
                          name={currentMerchant.shopName}
                          username={currentMerchant.username}
                          verified={isStoreVerified(currentMerchant)}
                          size="xs"
                          align="center"
                          nameClassName="text-white"
                          usernameClassName="text-white/75 opacity-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* معاينة واجهة المتجر كما يراها الزبون */}
                  <button
                    type="button"
                    onClick={() => setShowStorePreview(true)}
                    className="w-full welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-gradient-to-l from-amber-500/20 via-white/5 to-vibrant-purple/20 border border-amber-300/35 backdrop-blur-md rounded-[2rem] p-5 shadow-2xl hover:bg-white/10 transition-all duration-300 group flex items-center gap-4 text-right relative overflow-hidden text-white active:scale-[0.99]"
                  >
                    <div className="relative z-10 w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                      <Eye size={28} className="text-[#fff700]" />
                    </div>
                    <div className="relative z-10 min-w-0 flex-1">
                      <h3 className="text-lg font-black text-white mb-1">{t("merchant.mystore.preview.title")}</h3>
                      <p className="text-[11px] text-white/75 leading-relaxed">
                        {t("merchant.mystore.preview.desc")}
                      </p>
                    </div>
                    <div className="relative z-10 shrink-0 rounded-xl bg-amber-400 text-slate-900 px-3 py-2 text-[10px] font-black">
                      {t("merchant.mystore.preview.action")}
                    </div>
                  </button>

                  {/* الكروت */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* كرت التقارير */}
                    <button
                      onClick={() => openMyStoreSubPage("reports")}
                      className="tour-step-desktop-reports tour-step-mobile-reports welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-8 shadow-2xl hover:bg-white/10 transition-all duration-300 group flex flex-col items-center gap-5 text-center relative overflow-hidden text-white active:scale-[0.99]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-l from-vibrant-purple/15 to-transparent pointer-events-none" />
                      <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none flex items-center justify-center">
                        <TrendingUp size={120} />
                      </div>
                      <div className="relative z-10 w-16 h-16 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                        <TrendingUp size={32} className="text-[#fff700]" />
                      </div>
                      <div className="relative z-10">
                        <h3 className="text-xl font-black text-white mb-2">{t("merchant.mystore.reports.title")}</h3>
                        <p className="text-xs text-white/70 leading-relaxed">
                          {t("merchant.mystore.reports.desc")}
                        </p>
                      </div>
                      <div className="relative z-10 mt-auto w-full py-3 rounded-2xl bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white text-sm font-black flex items-center justify-center gap-2 shadow-brand-glow transition-all duration-300">
                        <ChevronLeft size={16} />
                        {t("merchant.mystore.reports.action")}
                      </div>
                    </button>

                    {/* كرت التسويق */}
                    <button
                      onClick={() => openMyStoreSubPage("marketing")}
                      className="tour-step-desktop-marketing tour-step-mobile-marketing welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-8 shadow-2xl hover:bg-white/10 transition-all duration-300 group flex flex-col items-center gap-5 text-center relative overflow-hidden text-white active:scale-[0.99]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-l from-rose-600/15 to-transparent pointer-events-none" />
                      <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none flex items-center justify-center">
                        <Megaphone size={120} />
                      </div>
                      <div className="relative z-10 w-16 h-16 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                        <Megaphone size={32} className="text-[#fff700]" />
                      </div>
                      <div className="relative z-10">
                        <h3 className="text-xl font-black text-white mb-2">{t("merchant.mystore.marketing.title")}</h3>
                        <p className="text-xs text-white/70 leading-relaxed">
                          {t("merchant.mystore.marketing.desc")}
                        </p>
                      </div>
                      <div className="relative z-10 mt-auto w-full py-3 rounded-2xl bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white text-sm font-black flex items-center justify-center gap-2 shadow-brand-glow transition-all duration-300">
                        <ChevronLeft size={16} />
                        {t("merchant.mystore.marketing.action")}
                      </div>
                    </button>

                    {/* كرت التوصيل */}
                    <button
                      onClick={() => openMyStoreSubPage("delivery")}
                      className="tour-step-desktop-delivery tour-step-mobile-delivery welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-8 shadow-2xl hover:bg-white/10 transition-all duration-300 group flex flex-col items-center gap-5 text-center relative overflow-hidden text-white active:scale-[0.99]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-l from-emerald-500/15 to-transparent pointer-events-none" />
                      <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none flex items-center justify-center">
                        <Truck size={120} />
                      </div>
                      <div className="relative z-10 w-16 h-16 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                        <Truck size={32} className="text-[#fff700]" />
                      </div>
                      <div className="relative z-10">
                        <h3 className="text-xl font-black text-white mb-2">{t("merchant.mystore.delivery.title")}</h3>
                        <p className="text-xs text-white/70 leading-relaxed">
                          {t("merchant.mystore.delivery.desc")}
                        </p>
                      </div>
                      <div className="relative z-10 mt-auto w-full py-3 rounded-2xl bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white text-sm font-black flex items-center justify-center gap-2 shadow-brand-glow transition-all duration-300">
                        <ChevronLeft size={16} />
                        {t("merchant.mystore.delivery.action")}
                      </div>
                    </button>

                    {/* كرت جمهوري */}
                    <button
                      onClick={() => openMyStoreSubPage("customers")}
                      className="tour-step-mystore-customers welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-8 shadow-2xl hover:bg-white/10 transition-all duration-300 group flex flex-col items-center gap-5 text-center relative overflow-hidden text-white active:scale-[0.99]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-l from-sky-500/15 to-transparent pointer-events-none" />
                      <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none flex items-center justify-center">
                        <Users size={120} />
                      </div>
                      <div className="relative z-10 w-16 h-16 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                        <Users size={32} className="text-[#fff700]" />
                      </div>
                      <div className="relative z-10">
                        <h3 className="text-xl font-black text-white mb-2">{t("merchant.mystore.audience.title")}</h3>
                        <p className="text-xs text-white/70 leading-relaxed">
                          {t("merchant.mystore.audience.desc")}
                        </p>
                      </div>
                      <div className="relative z-10 mt-auto w-full py-3 rounded-2xl bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white text-sm font-black flex items-center justify-center gap-2 shadow-brand-glow transition-all duration-300">
                        <ChevronLeft size={16} />
                        {t("merchant.mystore.audience.action")}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activeTab === "delivery" || (activeTab === "mystore" && myStoreSubPage === "delivery")) && (
            <div className="space-y-6">
                <div className="px-1 sm:px-2 h-full overflow-y-auto">
                <div className="merchant-glass-page reports-page space-y-6 animate-fade-in text-right text-white" dir="rtl">
                  {/* رأس صفحة التوصيل */}
                  <div
                    className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-[2rem] shadow-2xl gap-4 relative overflow-hidden group"
                  >
                    <div className="absolute -top-10 -right-10 text-white/10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                      <Truck size={140} />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-l from-emerald-500/15 to-transparent pointer-events-none" />
                    <div className="relative z-10">
                      <h2 className="text-xl font-black text-white font-tajawal flex items-center gap-2">
                        <span className="welcome-icon-pulse p-2 bg-white/15 border border-white/25 backdrop-blur-sm rounded-xl">
                          <Truck className="text-[#fff700]" size={22} />
                        </span>
                        <span>{t("merchant.delivery.title")}</span>
                      </h2>
                      <p className="text-xs text-white/75 font-medium mt-1 font-tajawal">
                        {t("merchant.delivery.subtitle")}
                      </p>
                    </div>
                    <div className="relative z-10 bg-white/10 text-[#E8ECF4] text-xs font-bold px-4 py-2.5 rounded-xl border border-white/25 flex items-center gap-2 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-[#fff700] animate-pulse"></span>
                      <span className="hidden sm:inline">{t("merchant.delivery.liveUpdate")}</span>
                      <span className="sm:hidden">{t("merchant.delivery.liveUpdateShort")}</span>
                    </div>
                  </div>

                <div
                  className="border p-6 rounded-[2rem] shadow-xs space-y-6 merchant-brand-card"
                  dir="rtl"
                >

                {/* خيار التوصيل المجاني الشامل لكل المحافظات */}
                <div className="bg-white/10 border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div>
                    <h5 className="text-xs font-black text-[#E8ECF4] mb-0.5">{t("merchant.delivery.freeAllProvinces")}</h5>
                    <p className="text-[10px] font-bold text-slate-300">{t("merchant.delivery.freeAllProvincesDesc")}</p>
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
                        : "bg-white/10 text-[#fff700] border border-white/20 hover:bg-white/20"
                    }`}
                  >
                    <span>{profileForm.isFreeDelivery ? t("merchant.delivery.freeAllEnabled") : t("merchant.delivery.freeAllDisabled")}</span>
                  </button>
                </div>

                {!profileForm.isFreeDelivery && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* عمود محافظة المتجر */}
                    <div className="bg-white/10 border border-white/10 p-5 rounded-2xl shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <h5 className="text-xs font-black text-[#E8ECF4]">{t("merchant.delivery.localProvince", { province: profileForm.province || t("merchant.delivery.storeProvinceFallback") })}</h5>
                        </div>
                        <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">{t("merchant.delivery.localBadge")}</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-[#0B1320] p-2.5 rounded-xl border border-white/10">
                          <span className="text-xs font-bold text-slate-300">{t("merchant.delivery.deliveryPriceLabel")}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const newPrice = Math.max(0, profileForm.localProvinceDeliveryPrice - 500);
                                handleProfileFormChange({ localProvinceDeliveryPrice: newPrice });
                              }}
                              disabled={profileForm.localProvinceFreeDelivery}
                              className="w-7 h-7 bg-white/10 rounded-lg border border-white/10 flex items-center justify-center text-[#E8ECF4] cursor-pointer disabled:opacity-55 active:scale-90 select-none font-bold"
                            >
                              -
                            </button>
                            <span className={`text-xs font-black font-mono w-16 text-center ${profileForm.localProvinceFreeDelivery ? 'line-through text-white/40' : 'text-brand-white'}`}>
                              {profileForm.localProvinceDeliveryPrice.toLocaleString()} <span className="text-[9px]">{t("merchant.delivery.currency")}</span>
                            </span>
                            <button
                              onClick={() => {
                                const newPrice = profileForm.localProvinceDeliveryPrice + 500;
                                handleProfileFormChange({ localProvinceDeliveryPrice: newPrice });
                              }}
                              disabled={profileForm.localProvinceFreeDelivery}
                              className="w-7 h-7 bg-white/10 rounded-lg border border-white/10 flex items-center justify-center text-[#E8ECF4] cursor-pointer disabled:opacity-55 active:scale-90 select-none font-bold"
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
                                ? "bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white" 
                                : "bg-white/10 text-[#fff700] border border-white/20 hover:bg-white/20"
                              }`}
                            >
                              {pr.toLocaleString()} {t("merchant.delivery.currency")}
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
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                              : "bg-white/10 text-white/60 border-white/20 hover:bg-white/20"
                          }`}
                        >
                          <span>{profileForm.localProvinceFreeDelivery ? t("merchant.delivery.localFreeEnabled") : t("merchant.delivery.localFreeDisabled")}</span>
                        </button>
                      </div>
                    </div>

                    {/* عمود باقي المحافظات */}
                    <div className="bg-white/10 border border-white/10 p-5 rounded-2xl shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <h5 className="text-xs font-black text-[#E8ECF4]">{t("merchant.delivery.otherProvinces")}</h5>
                        </div>
                        <span className="text-[9px] font-black bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{t("merchant.delivery.globalBadge")}</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-[#0B1320] p-2.5 rounded-xl border border-white/10">
                          <span className="text-xs font-bold text-slate-300">{t("merchant.delivery.otherProvincesPriceLabel")}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const newPrice = Math.max(0, profileForm.otherProvincesDeliveryPrice - 500);
                                handleProfileFormChange({ otherProvincesDeliveryPrice: newPrice });
                              }}
                              disabled={profileForm.otherProvincesFreeDelivery}
                              className="w-7 h-7 bg-white/10 rounded-lg border border-white/10 flex items-center justify-center text-[#E8ECF4] cursor-pointer disabled:opacity-55 active:scale-90 select-none font-bold"
                            >
                              -
                            </button>
                            <span className={`text-xs font-black font-mono w-16 text-center ${profileForm.otherProvincesFreeDelivery ? 'line-through text-white/40' : 'text-brand-white'}`}>
                              {profileForm.otherProvincesDeliveryPrice.toLocaleString()} <span className="text-[9px]">{t("merchant.delivery.currency")}</span>
                            </span>
                            <button
                              onClick={() => {
                                const newPrice = profileForm.otherProvincesDeliveryPrice + 500;
                                handleProfileFormChange({ otherProvincesDeliveryPrice: newPrice });
                              }}
                              disabled={profileForm.otherProvincesFreeDelivery}
                              className="w-7 h-7 bg-white/10 rounded-lg border border-white/10 flex items-center justify-center text-[#E8ECF4] cursor-pointer disabled:opacity-55 active:scale-90 select-none font-bold"
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
                                ? "bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white" 
                                : "bg-white/10 text-[#fff700] border border-white/20 hover:bg-white/20"
                              }`}
                            >
                              {pr.toLocaleString()} {t("merchant.delivery.currency")}
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
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                              : "bg-white/10 text-white/60 border-white/20 hover:bg-white/20"
                          }`}
                        >
                          <span>{profileForm.otherProvincesFreeDelivery ? t("merchant.delivery.otherFreeEnabled") : t("merchant.delivery.otherFreeDisabled")}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* تخصيص أسعار مميزة بمحافظات محددة بضغطة زر */}
                {!profileForm.isFreeDelivery && (
                  <div className="bg-white/10 border border-white/10 p-5 rounded-2xl shadow-sm space-y-4 font-sans">
                    <div>
                      <h5 className="text-xs font-black text-[#E8ECF4]">{t("merchant.delivery.customPricingTitle")}</h5>
                      <p className="text-[10px] font-bold text-slate-300 mt-0.5">
                        {t("merchant.delivery.customPricingDesc")}
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
                            displayPriceText = t("merchant.delivery.freeHome");
                          } else {
                            displayPriceText = t("merchant.delivery.priceAmount", { price: profileForm.localProvinceDeliveryPrice.toLocaleString() });
                            displayPriceStyle = "text-brand-white font-extrabold";
                          }
                        } else if (hasCustomFree) {
                          displayPriceStyle = "text-emerald-400 font-extrabold";
                          displayPriceText = t("merchant.delivery.freeCustom");
                        } else if (hasCustomPrice) {
                          const pr = profileForm.provinceDeliveryPrices[prov];
                          displayPriceText = t("merchant.delivery.priceAmount", { price: pr.toLocaleString() });
                          displayPriceStyle = "text-[#fff700] font-extrabold";
                        } else {
                          if (profileForm.otherProvincesFreeDelivery) {
                            displayPriceStyle = "text-emerald-500 font-medium";
                            displayPriceText = t("merchant.delivery.freeGeneral");
                          } else {
                            displayPriceText = t("merchant.delivery.generalPrice", { price: profileForm.otherProvincesDeliveryPrice.toLocaleString() });
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
                                ? "ring-2 ring-[#fff700] bg-white/10 border-[#fff700]/30"
                                : hasCustomPrice || hasCustomFree
                                ? "bg-white/10 border-violet/25 hover:bg-white/15"
                                : isLocal 
                                ? "bg-white/10 border-white/20 hover:bg-white/15 font-bold"
                                : "bg-white/5 hover:bg-white/10 border-white/10"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-black text-[#fff700] truncate">{prov}</span>
                              {isLocal && <span className="text-[7.5px] font-bold bg-white/10 text-[#fff700] px-1 rounded border border-white/20">{t("merchant.delivery.yourProvince")}</span>}
                              {(hasCustomPrice || hasCustomFree) && !isLocal && <span className="text-[7.5px] font-bold bg-white/10 text-[#fff700] px-1 rounded border border-white/20">{t("merchant.delivery.custom")}</span>}
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
                      <div className="p-4 merchant-panel-inset border border-white/10 rounded-2xl space-y-3 relative animate-fadeIn">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomProvince(null)}
                          className="absolute left-3 top-3 text-white/40 hover:text-white/80 p-1 cursor-pointer"
                        >
                          <X size={16} />
                        </button>

                        <div className="flex items-center gap-1.5 pb-2 border-b border-white/10">
                          <MapPin size={15} className="text-[#fff700]" />
                          <h6 className="text-xs font-black text-[#fff700]">{t("merchant.delivery.editProvinceTitle")} <span className="text-brand-white font-black text-sm">{selectedCustomProvince}</span></h6>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10.5px] font-bold text-white/70 mb-1">{t("merchant.delivery.freeForProvince")}</label>
                            <button
                              type="button"
                              onClick={() => setIsCustomFree(!isCustomFree)}
                              className={`w-full py-2 rounded-xl text-xs font-black border transition-all ${
                                isCustomFree 
                                ? "bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/10" 
                                : "bg-white/10 text-white/60 border-white/20 hover:bg-white/20"
                              }`}
                            >
                              {isCustomFree ? t("merchant.delivery.freeYes") : t("merchant.delivery.freeNo")}
                            </button>
                          </div>

                          {!isCustomFree && (
                            <div>
                              <label className="block text-[10.5px] font-bold text-white/70 mb-1">{t("merchant.delivery.provincePriceLabel")}</label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={editingCustomPrice}
                                  onChange={(e) => setEditingCustomPrice(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="flex-1 border bg-[#0B1320] border-white/10 p-2 rounded-xl text-xs font-mono font-bold text-[#E8ECF4]"
                                />
                                <span className="text-xs font-bold text-white/60 shrink-0">{t("merchant.delivery.currency")}</span>
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
                                  ? "bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white" 
                                  : "bg-white/10 text-[#fff700] border border-white/20 hover:bg-white/20"
                                }`}
                              >
                                {v.toLocaleString()} {t("merchant.delivery.currency")}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2 pt-2 border-t border-white/10 font-sans">
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
                            className="flex-1 py-2.5 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white font-black rounded-xl text-xs active:scale-95 transition-all shadow-sm shadow-vibrant-purple/25/20 cursor-pointer text-center"
                          >
                            {t("merchant.delivery.saveCustomPrice")}
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
                              className="px-3 py-2.5 bg-white/10 hover:bg-white/20 text-[#fff700] font-extrabold rounded-xl text-xs active:scale-95 transition-all border border-white/20 cursor-pointer"
                            >
                              {t("merchant.delivery.removeCustomPrice")}
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
                    className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white font-black rounded-2xl shadow-lg shadow-vibrant-purple/25/25 flex items-center justify-center space-x-2 space-x-reverse cursor-pointer select-none active:scale-95 transition-all hover:scale-[1.01]"
                  >
                    {isDeliverySaving ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>{t("merchant.delivery.saving")}</span>
                      </>
                    ) : (
                      <>
                        <Check size={18} />
                        <span>{t("merchant.delivery.saveBtn")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
                </div>
                </div>
              </div>
            )}

          {(activeTab === "reports" || (activeTab === "mystore" && myStoreSubPage === "reports")) && (() => {
            // Helper for Arabic weekday + short date formatting (e.g. "الجمعة 05/29")
            const getDayLabel = (date: Date) => {
              const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
              const dayName = t(`common.weekdays.${dayKeys[date.getDay()]}`);
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              return `${dayName} (${month}/${day})`;
            };

            const orderDate = (createdAt: unknown): Date | null => {
              const ms = getTimestampMillis(createdAt);
              if (!ms) return null;
              const d = new Date(ms);
              return Number.isNaN(d.getTime()) ? null : d;
            };

            const orderInRange = (createdAt: unknown, start: Date, end: Date) => {
              const d = orderDate(createdAt);
              return !!d && d >= start && d <= end;
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
                const oDate = orderDate(o.createdAt);
                return !!oDate && oDate.toDateString() === dateStr && oDate >= reportStartDate && oDate <= reportEndDate;
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
            const periodOrders = merchantOrders.filter(o => orderInRange(o.createdAt, reportStartDate, reportEndDate));
            const periodTotalSales = periodOrders
              .filter(o => o.status === 'delivered')
              .reduce((sum, o) => sum + ((o.subtotal || 0) - (o.discountSponsor === 'MERCHANT' ? (o.discountAmount || 0) : 0)), 0);

            const periodTotalOrdersCount = periodOrders.length;
            const deliveredOrdersCount = periodOrders.filter(o => o.status === 'delivered').length;
            const acceptedLikeCount = periodOrders.filter(o =>
              o.status === 'accepted' || o.status === 'shipped' || o.status === 'delivered'
            ).length;
            const rejectedCount = periodOrders.filter(o =>
              o.status === 'rejected' || o.status === 'cancelled' || o.status === 'returned'
            ).length;
            const deliveryRate = periodTotalOrdersCount > 0
              ? Math.round((deliveredOrdersCount / periodTotalOrdersCount) * 100)
              : 0;
            const avgOrderValue = deliveredOrdersCount > 0 ? Math.round(periodTotalSales / deliveredOrdersCount) : 0;

            // Compute top products in the dynamic date range
            const productQuantities: Record<string, { id: string; name: string; quantity: number; image?: string; sales: number }> = {};

            merchantOrders.forEach(o => {
              if (orderInRange(o.createdAt, reportStartDate, reportEndDate) && o.status !== 'rejected' && o.status !== 'returned' && o.status !== 'cancelled') {
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
              if (orderInRange(o.createdAt, reportStartDate, reportEndDate) && o.status !== 'rejected' && o.status !== 'returned' && o.status !== 'cancelled') {
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

            // --- Inventory Turnover Calculation (store products only) ---
            const reportDaysDiff = Math.max(1, Math.ceil((reportEndDate.getTime() - reportStartDate.getTime()) / (1000 * 60 * 60 * 24)));
            const inventoryTurnoverData = merchantProducts
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
              const actualProduct = merchantProducts.find(p => p.id === bestProduct.id);
              if (actualProduct) {
                const stock = (typeof actualProduct.inventory === 'number') ? actualProduct.inventory : "غير محدود";
                forecastInsight = {
                  type: 'forecast',
                  title: t('merchant.reportsPage.insights.forecastTitle'),
                  icon: <TrendingUp className="text-[#fff700]" size={20} />,
                  bgColor: 'merchant-brand-card text-[#fff700]',
                  iconBg: 'bg-white/10',
                  borderClass: 'border border-white/20',
                  message: t('merchant.reportsPage.insights.forecastMsg', { name: bestProduct.name, stock })
                };
              }
            }

            let behaviorInsight = null;
            const unsoldProducts = merchantProducts.filter(p => !productQuantities[p.id] && p.status === 'published' && (p.price || 0) > 0);
            if (unsoldProducts.length > 0) {
              const p = unsoldProducts[0];
              behaviorInsight = {
                type: 'behavior',
                title: t('merchant.reportsPage.insights.behaviorTitle'),
                icon: <Activity className="text-[#FFF700]" size={20} />,
                bgColor: 'merchant-brand-card text-[#fff700]',
                iconBg: 'bg-white/10',
                borderClass: 'border border-white/20',
                message: t('merchant.reportsPage.insights.behaviorMsg', { count: unsoldProducts.length, name: p.name })
              };
            }

            const shopCategoryLabel = currentMerchant?.category || "التسوق";

            let timingInsight = null;
            if (periodOrders.length > 0) {
              const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
              const salesByDayIdx: Record<number, number> = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
              
              periodOrders.filter(o => o.status === 'delivered').forEach(o => {
                const d = orderDate(o.createdAt);
                if (!d) return;
                const saleAmount = ((o.subtotal || 0) - (o.discountSponsor === 'MERCHANT' ? (o.discountAmount || 0) : 0));
                salesByDayIdx[d.getDay()] = (salesByDayIdx[d.getDay()] || 0) + saleAmount;
              });

              let bestDayIdx = -1;
              let maxSales = -1;
              Object.entries(salesByDayIdx).forEach(([idx, sales]) => {
                if (sales > maxSales) {
                  maxSales = sales;
                  bestDayIdx = Number(idx);
                }
              });

              if (maxSales > 0 && bestDayIdx >= 0) {
                const bestDayLabel = t(`common.weekdays.${dayKeys[bestDayIdx]}`);
                timingInsight = {
                  type: 'timing',
                  title: t('merchant.reportsPage.insights.timingTitle'),
                  icon: <Lightbulb className="text-[#fff700]" size={20} />,
                  bgColor: 'merchant-brand-card text-[#fff700]',
                  iconBg: 'bg-white/10',
                  borderClass: 'border border-white/20',
                  message: t('merchant.reportsPage.insights.timingMsg', { day: bestDayLabel })
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
                    <p className="text-[#A78BFA]">{t('merchant.reportsPage.charts.tooltipSales', { value: payload[0].value.toLocaleString() })}</p>
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
              <div className="px-1 sm:px-2 h-full overflow-y-auto">
              <div className="merchant-glass-page reports-page space-y-6 animate-fade-in text-right text-white" dir="rtl">
                {/* 1. Header & Date Range Picker */}
                <div
                  className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-[2rem] shadow-2xl gap-4 relative overflow-hidden group"
                >
                  <div className="absolute -top-10 -right-10 text-white/10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                    <TrendingUp size={140} />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-l from-vibrant-purple/20 to-transparent pointer-events-none" />
                  <div className="relative z-10">
                    <h2 className="text-xl font-black text-white font-tajawal flex items-center gap-2">
                      <span className="welcome-icon-pulse p-2 bg-white/15 border border-white/25 backdrop-blur-sm rounded-xl">
                        <TrendingUp className="text-[#fff700]" size={22} />
                      </span>
                      <span>{t('merchant.reportsPage.title')}</span>
                    </h2>
                    <p className="text-xs text-white/80 font-medium mt-1 font-tajawal">
                      {t('merchant.reportsPage.subtitle')}
                    </p>
                  </div>
                  <div className="relative z-10 flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="bg-white/10 text-[#E8ECF4] text-xs font-bold px-4 py-2.5 rounded-xl border border-white/25 flex items-center gap-2 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-[#fff700] animate-pulse"></span>
                      <span className="hidden sm:inline">مبيعات الموصل فقط ضمن النطاق</span>
                      <span className="sm:hidden">موصل فقط</span>
                    </div>

                    <div className="relative flex-1 sm:flex-none">
                      <select
                        value={reportDateRange}
                        onChange={(e: any) => setReportDateRange(e.target.value)}
                        className="welcome-select welcome-select--sm welcome-select--with-chevron min-w-[140px]"
                      >
                        <option value="7_days">{t('merchant.reportsPage.range.7days')}</option>
                        <option value="30_days">{t('merchant.reportsPage.range.30days')}</option>
                        <option value="this_month">{t('merchant.reportsPage.range.thisMonth')}</option>
                        <option value="custom">{t('merchant.reportsPage.range.custom')}</option>
                      </select>
                      <ChevronDown size={16} className="welcome-select-chevron" aria-hidden />
                    </div>
                  </div>
                </div>

                {/* Custom Date Range Inputs */}
                {reportDateRange === "custom" && (
                  <div className="merchant-panel-inset p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold text-[#fff700] mb-1">{t('merchant.reportsPage.from')}</label>
                      <input 
                        type="date"
                        value={reportCustomStartDate}
                        onChange={(e) => setReportCustomStartDate(e.target.value)}
                        className="w-full bg-[#0B1320] border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vibrant-purple/40 text-[#E8ECF4] font-bold"
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold text-[#fff700] mb-1">{t('merchant.reportsPage.to')}</label>
                      <input 
                        type="date"
                        value={reportCustomEndDate}
                        onChange={(e) => setReportCustomEndDate(e.target.value)}
                        className="w-full bg-[#0B1320] border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vibrant-purple/40 text-[#E8ECF4] font-bold"
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
                      <div
                        key={idx}
                        className={`p-5 rounded-[2rem] ${insight.borderClass ?? 'border border-white/50'} shadow-sm flex flex-col gap-3 ${insight.bgColor}`}
                        style={insight.cardStyle}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${insight.iconBg}`}>
                            {insight.icon}
                          </div>
                          <h4 className="font-black text-sm">{insight.title}</h4>
                        </div>
                        <p className={`text-xs font-medium leading-relaxed${insight.type === 'behavior' ? ' text-[#FFFFFF]/80' : ' opacity-90'}`}>
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
                      <p className="text-xs font-bold text-[#fff700]">{t('merchant.reportsPage.kpi.salesLabel')}</p>
                      <h4 className="text-xl font-black text-[#E8ECF4]">{periodTotalSales.toLocaleString()} <span className="text-xs">{t('common.currency')}</span></h4>
                      <p className="text-[10px] text-[#FFFFFF] font-bold">{t('merchant.reportsPage.kpi.salesSub')}</p>
                    </div>
                    <div className="p-3.5 bg-white/10 text-[#fff700] rounded-2xl group-hover:scale-110 transition-transform">
                      <ShoppingBag size={22} className="stroke-[2.5]" />
                    </div>
                  </div>

                  {/* Card 2: Orders Count */}
                  <div
                    className="p-5 rounded-[2rem] border shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between group merchant-brand-card"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-[#fff700]">{t('merchant.reportsPage.kpi.ordersLabel')}</p>
                      <h4 className="text-xl font-black text-[#E8ECF4]">{periodTotalOrdersCount} <span className="text-xs">{t('merchant.reportsPage.kpi.ordersUnit')}</span></h4>
                      <p className="text-[10px] text-[#FFFFFF] font-bold">{t('merchant.reportsPage.kpi.ordersSub')}</p>
                    </div>
                    <div className="p-3.5 bg-white/10 text-[#fff700] rounded-2xl group-hover:scale-110 transition-transform">
                      <ClipboardList size={22} className="stroke-[2.5]" />
                    </div>
                  </div>

                  {/* Card 3: Avg Order Value */}
                  <div
                    className="p-5 rounded-[2rem] border shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between group merchant-brand-card"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-[#fff700]">{t('merchant.reportsPage.kpi.avgLabel')}</p>
                      <h4 className="text-xl font-black text-[#E8ECF4]">{avgOrderValue.toLocaleString()} <span className="text-xs">{t('common.currency')}</span></h4>
                      <p className="text-[10px] text-[#FFFFFF] font-bold">{t('merchant.reportsPage.kpi.avgSub')}</p>
                    </div>
                    <div className="p-3.5 bg-white/10 text-[#fff700] rounded-2xl group-hover:scale-110 transition-transform">
                      <TrendingUp size={22} className="stroke-[2.5]" />
                    </div>
                  </div>

                  {/* Card 4: Total Units Sold */}
                  <div
                    className="p-5 rounded-[2rem] border shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between group merchant-brand-card"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-[#fff700]">{t('merchant.reportsPage.kpi.unitsLabel')}</p>
                      <h4 className="text-xl font-black text-[#E8ECF4]">{totalUnitsSold} <span className="text-xs">{t('merchant.reportsPage.kpi.unitsUnit')}</span></h4>
                      <p className="text-[10px] text-[#FFFFFF] font-bold">{t('merchant.reportsPage.kpi.unitsSub')}</p>
                    </div>
                    <div className="p-3.5 bg-white/10 text-[#fff700] rounded-2xl group-hover:scale-110 transition-transform">
                      <Package size={22} className="stroke-[2.5]" />
                    </div>
                  </div>
                </motion.div>

                {/* Order funnel summary (real metrics) */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="merchant-brand-card rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl overflow-hidden relative border"
                >
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-vibrant-purple/20 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-deep-navy/40 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="relative z-10 flex flex-col md:flex-row items-center md:items-stretch justify-between gap-8">
                    <div className="flex-1 space-y-4 text-center md:text-right">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-[#fff700] text-xs font-bold font-mono">
                        <Award size={14} className="text-[#fff700]" />
                        <span>{t('merchant.reportsPage.funnel.badge')}</span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-black leading-tight text-[#fff700]">
                        {t('merchant.reportsPage.funnel.deliveryRate')} <span className="text-brand-white text-4xl">{deliveryRate}%</span>
                      </h3>
                      <p className="text-white text-sm max-w-md mx-auto md:mx-0 leading-relaxed">
                        {t('merchant.reportsPage.funnel.fromOrders', { count: periodTotalOrdersCount })}
                        {shopCategoryLabel ? <> {t('merchant.reportsPage.funnel.withCategory')} <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">"{shopCategoryLabel}"</span></> : null}.
                        {t('merchant.reportsPage.funnel.acceptedRejected', { accepted: acceptedLikeCount, rejected: rejectedCount })}.
                      </p>
                      <div className="pt-2">
                        <span className="text-xs bg-white/10 text-white/80 px-3 py-1.5 rounded-lg border border-white/20">
                          {deliveryRate >= 70
                            ? t('merchant.reportsPage.funnel.rateGood')
                            : periodTotalOrdersCount === 0
                              ? t('merchant.reportsPage.funnel.rateNoOrders')
                              : t('merchant.reportsPage.funnel.rateImprove')}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 w-full md:w-auto flex items-center justify-center md:justify-end">
                      <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 flex flex-col items-center gap-3 min-w-[200px]">
                        <div className="text-[#fff700] relative">
                          <Award size={64} className="drop-shadow-lg" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-white font-black text-lg pt-2">
                            {deliveryRate}%
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-white/60 uppercase tracking-widest mb-1 font-mono">{t('merchant.reportsPage.funnel.delivered')}</p>
                          <p className="text-lg font-black tracking-wide text-brand-white">{deliveredOrdersCount}/{periodTotalOrdersCount}</p>
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
                  className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0"
                >
                  {/* Chart A: Daily Sales (Area Chart with gradient) */}
                  <div
                    className="p-6 rounded-[2rem] border border-white/10 shadow-sm space-y-4 merchant-brand-card"
                  >
                    <div className="flex justify-between items-center border-b border-white/10 pb-3">
                      <div>
                        <h4 className="text-base font-black text-[#fff700]">{t('merchant.reportsPage.charts.salesTitle')}</h4>
                        <p className="text-[10px] text-[#ffffff] font-bold">{t('merchant.reportsPage.charts.salesSub')}</p>
                      </div>
                      <span className="text-xs font-black report-stat-badge px-2.5 py-1 rounded-lg">{t('merchant.reportsPage.charts.salesTotal', { total: periodTotalSales.toLocaleString() })}</span>
                    </div>

                    <div className="h-72 w-full min-w-0">
                      {periodTotalSales === 0 ? (
                        <div className="h-full flex flex-col justify-center items-center text-white text-xs py-10 space-y-2">
                          <ShoppingBag size={32} className="text-white stroke-[1.5]" />
                          <span className="text-[#ffffff]">{t('merchant.reportsPage.charts.salesEmpty')}</span>
                        </div>
                      ) : (
                        <SafeChartContainer className="h-full w-full min-w-0">
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
                        </SafeChartContainer>
                      )}
                    </div>
                  </div>

                  {/* Chart B: Total Orders Count (Bar Chart) */}
                  <div
                    className="p-6 rounded-[2rem] border shadow-sm space-y-4 merchant-brand-card"
                  >
                    <div className="flex justify-between items-center border-b border-white/10 pb-3">
                      <div>
                        <h4 className="text-base font-black text-[#fff700]">{t('merchant.reportsPage.charts.ordersTitle')}</h4>
                        <p className="text-[10px] text-[#ffffff] font-bold">{t('merchant.reportsPage.charts.ordersSub')}</p>
                      </div>
                      <span className="text-xs font-black report-stat-badge px-2.5 py-1 rounded-lg">{t('merchant.reportsPage.charts.ordersTotal', { count: periodTotalOrdersCount })}</span>
                    </div>

                    <div className="h-72 w-full min-w-0">
                      {periodTotalOrdersCount === 0 ? (
                        <div className="h-full flex flex-col justify-center items-center text-[#ffffff] text-xs py-10 space-y-2">
                          <ClipboardList size={32} className="text-[#fff700] stroke-[1.5]" />
                          <span className="text-[#ffffff]">{t('merchant.reportsPage.charts.ordersEmpty')}</span>
                        </div>
                      ) : (
                        <SafeChartContainer className="h-full w-full min-w-0">
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
                        </SafeChartContainer>
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
                  className="p-6 rounded-[2rem] border border-white/10 shadow-sm space-y-5 merchant-brand-card"
                >
                  <div>
                    <h4 className="text-base font-black text-[#fff700]">{t('merchant.reportsPage.topProducts.title')}</h4>
                    <p className="text-xs text-[#ffffff] font-medium">{t('merchant.reportsPage.topProducts.subtitle')}</p>
                  </div>

                  {topProductsData.length === 0 ? (
                    <div className="py-12 flex flex-col justify-center items-center text-white/70 text-xs gap-2 border border-dashed border-white/20 rounded-3xl">
                      <Package size={40} className="text-[#fff700] stroke-[1.5]" />
                      <span className="text-[#ffffff]">{t('merchant.reportsPage.topProducts.empty')}</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      {/* Products breakdown */}
                      <div className="space-y-4">
                        {topProductsData.map((p, idx) => {
                          const percentage = totalUnitsSold > 0 ? Math.round((p.quantity / totalUnitsSold) * 100) : 0;
                          return (
                            <div key={p.id} className="flex items-center gap-3 p-3 merchant-panel-inset hover:bg-white/5 rounded-2xl transition-all border border-white/10 group">
                              {/* Product Image */}
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 border border-white/10 shrink-0 relative flex items-center justify-center font-tajawal">
                                {p.image ? (
                                  <img src={p.image} className="w-full h-full object-cover" alt={p.name} referrerPolicy="no-referrer" />
                                ) : (
                                  <Package size={20} className="text-[#fff700]" />
                                )}
                                <div className="absolute top-0 right-0 bg-deep-navy text-[#fff700] text-[9px] font-black w-4 h-4 rounded-bl-lg flex items-center justify-center">
                                  {idx + 1}
                                </div>
                              </div>

                              {/* Progress and name */}
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <div className="flex justify-between items-center text-xs font-tajawal">
                                  <span className="font-bold text-brand-white truncate pl-2">{p.name}</span>
                                  <span className="font-black text-[#fff700]">{t('merchant.reportsPage.topProducts.unitsBadge', { count: p.quantity })}</span>
                                </div>
                                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-gradient-to-r from-[#7B3DFF] to-violet h-full rounded-full transition-all duration-1000" 
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-white/60 font-bold font-tajawal">
                                  <span>{t('merchant.reportsPage.topProducts.contribution', { percent: percentage })}</span>
                                  <span className="text-emerald-400">{t('merchant.reportsPage.topProducts.revenue', { value: p.sales.toLocaleString() })}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* BarChart representing quantities sold */}
                      <div className="h-64 merchant-panel-inset p-4 rounded-3xl border border-white/10 flex flex-col justify-between min-w-0">
                        <span className="text-xs font-black text-[#fff700] border-b border-white/10 pb-2">{t('merchant.reportsPage.topProducts.chartTitle')}</span>
                        <div className="h-48 w-full min-w-0">
                          <SafeChartContainer className="h-full w-full min-w-0">
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
                                        <p className="text-[#A78BFA]">{t('merchant.reportsPage.charts.tooltipSalesBar', { count: payload[0].value })}</p>
                                        <p className="text-emerald-400">{t('merchant.reportsPage.charts.tooltipRevenue', { value: payload[0].payload.sales.toLocaleString() })}</p>
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
                          </SafeChartContainer>
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
                      className="merchant-brand-card p-6 rounded-3xl shadow-sm border border-white/10 flex flex-col mt-6"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-white/10 text-[#fff700] flex items-center justify-center shrink-0">
                          <TrendingUp size={20} />
                        </div>
                        <div>
                          <h3 className="font-black text-[#fff700] text-sm">{t('merchant.reportsPage.categorySales.title')}</h3>
                          <p className="text-[10px] text-white/70 font-bold mt-1">{t('merchant.reportsPage.categorySales.subtitle')}</p>
                        </div>
                      </div>
                      
                      <div className="h-72 w-full min-w-0" dir="ltr">
                        <SafeChartContainer className="h-full w-full min-w-0">
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
                                      <p className="text-emerald-400 mt-2">{t('merchant.reportsPage.categorySales.tooltipSales', { value: payload[0].value.toLocaleString() })}</p>
                                      <p className="text-[#A78BFA] mt-1">{t('merchant.reportsPage.categorySales.tooltipQty', { count: payload[0].payload.quantity })}</p>
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
                        </SafeChartContainer>
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
                      className="merchant-brand-card p-6 rounded-3xl shadow-sm border border-rose-400/20 flex flex-col mt-6"
                    >
                      <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center shrink-0">
                          <Activity size={20} />
                        </div>
                        <div>
                          <h3 className="font-black text-[#fff700] text-sm">{t('merchant.reportsPage.inventory.title')}</h3>
                          <p className="text-[10.5px] text-white/70 font-bold mt-1 leading-relaxed">
                            {t('merchant.reportsPage.inventory.subtitle')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {inventoryTurnoverData.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl merchant-panel-inset border border-rose-400/20 hover:bg-white/5 transition-colors">
                            <div className="flex flex-col gap-1.5 flex-1 min-w-0 pr-2 border-r-[3px] border-rose-400/50">
                              <span className="font-bold text-brand-white text-xs truncate" title={item.name}>{item.name}</span>
                              <div className="flex items-center gap-2 text-[10px] text-white/60 font-mono font-medium">
                                <span>{t('merchant.reportsPage.inventory.stockLabel', { count: item.inventory })}</span>
                                <span>•</span>
                                <span>{t('merchant.reportsPage.inventory.salesPerDay', { rate: item.salesPerDay.toFixed(1) })}</span>
                              </div>
                            </div>
                            <div className="shrink-0 flex flex-col items-center justify-center bg-white/10 px-3 py-2 rounded-xl border border-rose-400/20 min-w-[70px]">
                              <span className="text-[9px] text-white/60 font-bold mb-0.5">{t('merchant.reportsPage.inventory.runsOutIn')}</span>
                              <span className="font-black text-rose-300 text-sm" dir="ltr">{t('merchant.reportsPage.inventory.daysUnit', { count: item.daysToEmpty })}</span>
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
              <div className="px-1 sm:px-2 h-full overflow-y-auto">
                <div className="space-y-6 animate-fade-in text-right text-white" dir="rtl">
                  {(() => {
                    const filteredProductsForView = merchantProducts.filter(
                      (p) =>
                        p.status === productFilterStatus &&
                        (productSearchQuery.trim() === "" ||
                          p.name.includes(productSearchQuery) ||
                          p.barcode?.includes(productSearchQuery)),
                    );
                    const windowedProductsForView = filteredProductsForView.slice(
                      0,
                      visibleProductsLimit,
                    );

                    return (
                      <>
                        {/* 1. العناوين الرئيسية في المقدمة */}
                        <div
                          className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-[2rem] shadow-2xl gap-4 relative overflow-hidden group text-white"
                        >
                          <div className="absolute -top-10 -right-10 text-white/10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                            <Package size={140} />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-l from-vibrant-purple/20 to-transparent pointer-events-none" />
                          <div className="relative z-10">
                            <h2 className="text-xl font-black text-white font-tajawal flex items-center gap-2">
                              <span className="welcome-icon-pulse p-2 bg-white/15 border border-white/25 backdrop-blur-sm rounded-xl">
                                <Package className="text-[#fff700]" size={22} />
                              </span>
                              <span>{t('merchant.products.pageTitle')}</span>
                            </h2>
                            <p className="text-xs text-white/75 font-medium mt-1 font-tajawal">
                              {t('merchant.products.pageSubtitle', { count: filteredProductsForView.length })}
                            </p>
                          </div>
                          
                          <div className="relative z-10 flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <div className="bg-white/10 text-[#E8ECF4] text-xs font-bold px-4 py-2.5 rounded-xl border border-white/25 flex items-center gap-2 shrink-0">
                              <span className="w-2 h-2 rounded-full bg-[#fff700] animate-pulse"></span>
                              <span className="hidden sm:inline">{t('merchant.orders.liveUpdate')}</span>
                              <span className="sm:hidden">{t('merchant.orders.liveUpdateShort')}</span>
                            </div>
                            
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
                              className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white font-black rounded-2xl flex items-center justify-center space-x-2 space-x-reverse shadow-brand-glow hover:shadow-lg active:scale-95 transition-all text-xs"
                            >
                              <Plus size={16} />
                              <span>{t("merchant.products.addNew")}</span>
                            </button>
                          </div>
                        </div>

                        {/* 2. تبويبات الفلترة للمنتجات */}
                        <div
                          className="flex gap-2 p-1.5 welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-2xl shadow-lg sticky top-0 z-10 font-bold"
                        >
                          {["published", "draft", "archived"].map((s) => (
                            <button
                              key={s}
                              onClick={() => {
                                setProductFilterStatus(s as any);
                                setSelectedProductIds([]);
                                setVisibleProductsLimit(32);
                              }}
                              className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all ${
                                productFilterStatus === s
                                  ? "bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white shadow-brand-glow"
                                  : "text-white/60 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              {s === "published"
                                ? t("merchant.products.filterPublished")
                                : s === "draft"
                                  ? t("merchant.products.filterDraft")
                                  : t("merchant.products.filterArchived")}
                            </button>
                          ))}
                        </div>

                        {/* 3. شريط البحث يقع مباشرة تحت التبويبات */}
                        <div
                          className="p-2.5 rounded-2xl welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md shadow-lg flex items-center gap-3"
                        >
                          <div className="p-2 bg-white/10 border border-white/20 rounded-xl text-[#fff700]">
                            <Search size={18} />
                          </div>
                          <input
                            type="text"
                            placeholder={t("merchant.products.searchPlaceholder")}
                            value={productSearchQuery}
                            onChange={(e) => {
                              setProductSearchQuery(e.target.value);
                              setVisibleProductsLimit(32);
                            }}
                            className="w-full bg-[#0B1320]/60 border border-white/10 rounded-xl text-xs py-2 px-4 focus:ring-2 focus:ring-vibrant-purple/40 outline-none text-[#E8ECF4] font-bold placeholder:text-slate-500"
                          />
                          <button
                            onClick={() => {
                              setScannerMode("search");
                              setShowScanner(true);
                            }}
                            className="p-2 bg-white/10 text-[#fff700] hover:bg-white/20 rounded-xl transition-all shadow-xs shrink-0 border border-white/20"
                            title={t("merchant.products.scanBarcode")}
                          >
                            <Camera size={18} />
                          </button>
                        </div>

                                  {/* 4. ترتيب المنتجات في شبكة GridView متناسقة وسهلة التصفح */}
                        {filteredProductsForView.length === 0 ? (
                          <div
                            className="p-12 rounded-[2rem] welcome-card-glow welcome-card-border-glow bg-white/5 border border-dashed border-white/25 backdrop-blur-md text-center flex flex-col items-center justify-center shadow-lg text-white"
                          >
                            <div className="p-4 bg-white/10 border border-white/20 rounded-full mb-3">
                              <Package size={40} className="text-[#fff700]" />
                            </div>
                            <h3 className="font-black text-white text-sm mb-1">
                              {t("merchant.products.emptySearchTitle")}
                            </h3>
                            <p className="text-xs text-white/70 leading-relaxed max-w-xs font-bold">
                              {t("merchant.products.emptySearchHint")}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-10 pb-20 text-right font-tajawal" dir="rtl">
                            {(() => {
                              const grouped: { name: string; products: Product[] }[] = [];
                              const assignedIds = new Set<string>();
                              
                              // We use availableTags to group products
                              availableTags.forEach((tag) => {
                                const groupProducts = windowedProductsForView.filter((p) => {
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
                              const uncategorized = windowedProductsForView.filter((p) => !assignedIds.has(p.id));
                              if (uncategorized.length > 0) {
                                grouped.push({ name: t('merchant.products.uncategorized'), products: uncategorized });
                              }
                              
                              return (
                                <>
                                  {grouped.map((group) => (
                                <div key={group.name} className="space-y-4">
                                  {/* عنوان قسم تصنيف نوع المنتج بلمسة بنفسجية مذهلة */}
                                  <div className="flex items-center gap-2.5 welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/25 backdrop-blur-md px-4 py-2.5 rounded-2xl shrink-0 w-fit shadow-md">
                                    <div className="w-1.5 h-5 bg-gradient-to-b from-[#7B3DFF] to-[#0B1320] rounded-full" />
                                    <h3 className="font-black text-white text-xs sm:text-sm">
                                      {group.name}
                                    </h3>
                                    <span className="bg-white/10 text-[#E8ECF4] border border-white/15 text-[10px] font-black px-2 py-0.5 rounded-lg">
                                      {group.products.length}
                                    </span>
                                  </div>

                                  {/* شبكة المنتجات - تحتوي على 4 منتجات في السطر للأحجام المتوسطة والكبيرة */}
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                                    {group.products.map((p) => {
                                      const isSelected = selectedProductIds.includes(p.id);
                                      return (
                                        <div
                                          key={p.id}
                                          className={`relative isolate welcome-card-glow welcome-card-border-glow bg-white/5 border backdrop-blur-md rounded-2xl flex flex-col group transition-all duration-300 hover:bg-white/10 hover:shadow-2xl overflow-hidden text-white ${
                                            isSelected
                                              ? "border-[#fff700] ring-2 ring-[#fff700]/30 shadow-brand-glow"
                                              : "border-white/30 hover:border-white/40"
                                          }`}
                                        >
                                          {/* صورة المنتج - شكل مربع مثالي متجاوب */}
                                          <div
                                            className="aspect-square relative w-full rounded-t-2xl bg-white/5 pointer-events-auto cursor-pointer"
                                            onClick={() => toggleSelectProduct(p.id)}
                                          >
                                            <div className="absolute inset-0 overflow-hidden rounded-t-2xl">
                                              <ProductImage
                                                src={p.image}
                                                alt={p.name}
                                                size="custom"
                                                variant="dark"
                                                className="w-full h-full"
                                                imageClassName="transition-transform duration-500 group-hover:scale-105"
                                              />
                                            </div>

                                            {/* مربع تحديد المنتج */}
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSelectProduct(p.id);
                                              }}
                                              className={`absolute top-2.5 right-2.5 z-10 w-5.5 h-5.5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                                isSelected
                                                  ? "bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white shadow-md"
                                                  : "bg-white/10 backdrop-blur-xs border-white/30 opacity-0 group-hover:opacity-100"
                                              }`}
                                            >
                                              {isSelected && (
                                                <Check size={12} className="text-white" />
                                              )}
                                            </button>

                                            {/* أزرار المشاركة والخيارات — داخل الصورة لمنع تداخل الطبقات */}
                                            <div
                                              className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 product-menu-container"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <button
                                                type="button"
                                                onClick={() => openShareModal("product", p)}
                                                className="p-1.5 bg-black/40 backdrop-blur-sm rounded-xl text-emerald-400 shadow-md hover:bg-emerald-500/30 transition-all border border-white/20 active:scale-95 shrink-0"
                                                title={t('merchant.products.shareLink')}
                                                aria-label={t('merchant.products.shareLink')}
                                              >
                                                <Share2 size={14} />
                                              </button>
                                              <button
                                                onClick={() =>
                                                  setActiveMenuProductId(activeMenuProductId === p.id ? null : p.id)
                                                }
                                                className="p-1.5 bg-black/40 backdrop-blur-sm rounded-xl text-[#E8ECF4] shadow-md hover:bg-white/20 hover:text-[#fff700] transition-all border border-white/20 active:scale-95 shrink-0"
                                                title={t("merchant.products.optionsTitle")}
                                              >
                                                <MoreVertical size={14} className="font-bold" />
                                              </button>

                                              {/* القائمة المنسدلة */}
                                              <AnimatePresence>
                                                {activeMenuProductId === p.id && (
                                                  <motion.div
                                                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="absolute top-full left-0 mt-1.5 w-48 welcome-card-glow welcome-card-border-glow bg-deep-navy/95 border border-white/30 backdrop-blur-md rounded-2xl shadow-2xl z-20 overflow-hidden text-right"
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
                                                      className="w-full px-3 py-2 text-xs font-black text-[#E8ECF4] hover:bg-white/10 hover:text-[#fff700] rounded-xl flex items-center justify-start gap-2.5 transition"
                                                    >
                                                      <Edit size={14} className="text-[#fff700]" />
                                                      <span>{t("merchant.products.editProduct")}</span>
                                                    </button>

                                                    <button
                                                      onClick={() => {
                                                        setActiveMenuProductId(null);
                                                        openShareModal("product", p);
                                                      }}
                                                      className="w-full px-3 py-2 text-xs font-black text-[#E8ECF4] hover:bg-emerald-500/15 hover:text-emerald-300 rounded-xl flex items-center justify-start gap-2.5 transition"
                                                    >
                                                      <Share2 size={14} className="text-emerald-400" />
                                                      <span>{t('merchant.products.shareLink')}</span>
                                                    </button>

                                                    {p.status !== "published" && (
                                                      <button
                                                        onClick={() => {
                                                          setActiveMenuProductId(null);
                                                          handlePublishProduct(p.id);
                                                        }}
                                                        className="w-full px-3 py-2 text-xs font-black text-[#E8ECF4] hover:bg-violet/20 hover:text-[#fff700] rounded-xl flex items-center justify-start gap-2.5 transition"
                                                      >
                                                        <Globe size={14} className="text-[#fff700]" />
                                                        <span>{t('merchant.products.publishToStore')}</span>
                                                      </button>
                                                    )}

                                                    {p.status !== "draft" && (
                                                      <button
                                                        onClick={() => {
                                                          setActiveMenuProductId(null);
                                                          handleDraftProduct(p.id);
                                                        }}
                                                        className="w-full px-3 py-2 text-xs font-black text-[#E8ECF4] hover:bg-amber-500/15 hover:text-amber-300 rounded-xl flex items-center justify-start gap-2.5 transition"
                                                      >
                                                        <FileText size={14} className="text-amber-400" />
                                                        <span>{t('merchant.products.moveToDraft')}</span>
                                                      </button>
                                                    )}

                                                    {p.status !== "archived" && (
                                                      <button
                                                        onClick={() => {
                                                          setActiveMenuProductId(null);
                                                          handleArchiveProduct(p.id);
                                                        }}
                                                        className="w-full px-3 py-2 text-xs font-black text-[#E8ECF4] hover:bg-white/10 hover:text-[#fff700] rounded-xl flex items-center justify-start gap-2.5 transition"
                                                      >
                                                        <Archive size={14} className="text-white/60" />
                                                        <span>{t('merchant.products.moveToArchive')}</span>
                                                      </button>
                                                    )}

                                                    <div className="h-[1px] bg-white/10 my-0.5" />

                                                    <button
                                                      onClick={() => {
                                                        setActiveMenuProductId(null);
                                                        handleDeleteProduct(p.id, p.name);
                                                      }}
                                                      className="w-full px-3 py-1.5 text-xs font-black text-rose-300 hover:bg-rose-500/15 rounded-xl flex items-center justify-start gap-2.5 transition"
                                                    >
                                                      <Trash2 size={14} className="text-rose-400" />
                                                      <span>{t('merchant.products.deletePermanent')}</span>
                                                    </button>
                                                  </div>
                                                </motion.div>
                                              )}
                                            </AnimatePresence>
                                            </div>

                                            {/* شارة نسبة الخصم باللون الذهبي الباذخ */}
                                            {p.discountType !== "none" && (
                                              <div className="absolute bottom-2.5 right-2.5 z-10 bg-gradient-to-l from-amber-500 to-yellow-500 text-brand-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                                {t('merchant.products.discountBadge', { value: p.discountValue })}
                                              </div>
                                            )}

                                            {/* شارة حالة النشر في زاوية الصورة */}
                                            <div className="absolute bottom-2.5 left-2.5 z-10">
                                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black shadow-xs ${
                                                p.status === "published"
                                                  ? "bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-brand-white"
                                                  : p.status === "draft"
                                                    ? "bg-amber-500/90 text-brand-white"
                                                    : "bg-slate-550/90 text-brand-white"
                                              }`}>
                                                {p.status === "published"
                                                  ? t("merchant.products.status.published")
                                                  : p.status === "draft"
                                                    ? t("merchant.products.status.draft")
                                                    : t("merchant.products.status.archived")}
                                              </span>
                                            </div>
                                          </div>

                                          {/* تفاصيل البطاقة: الاسم والسعر */}
                                          <div
                                            className="p-3 sm:p-4 flex-1 flex flex-col justify-between cursor-pointer"
                                            onClick={() => toggleSelectProduct(p.id)}
                                          >
                                            <div>
                                              {/* اسم المنتج */}
                                              <h3
                                                className="font-black text-white text-[11px] sm:text-xs leading-tight line-clamp-2 min-h-[2rem] hover:text-[#fff700] transition-colors"
                                                title={p.name}
                                              >
                                                {p.name}
                                              </h3>

                                              {/* مؤشر حالة المخزون بأسلوب نظيف */}
                                              <div className="flex items-center gap-1.5 mt-2">
                                                <div
                                                  className={`w-2 h-2 rounded-full ${getMerchantInventoryDotClass(p.inventory)}`}
                                                ></div>
                                                <span className="text-[10px] font-bold text-white/60">
                                                  {getMerchantInventoryLabel(p.inventory)}
                                                </span>
                                              </div>
                                            </div>

                                            {/* السعر مع تفاصيل الخصم وتوصيل مجاني */}
                                            <div className="mt-2.5 pt-2.5 border-t border-white/10 flex justify-between items-end">
                                              <div className="flex flex-col">
                                                <span className="text-xs sm:text-sm font-black text-[#E8ECF4] tracking-tight flex items-baseline gap-0.5">
                                                  {(p.finalPrice || 0).toLocaleString()}
                                                  <span className="text-[8px] font-bold text-white/60">
                                                    د.ع
                                                  </span>
                                                </span>
                                                {p.discountType !== "none" && (
                                                  <span className="text-[9px] text-white/40 font-bold line-through">
                                                    {(p.price || 0).toLocaleString()}
                                                  </span>
                                                )}
                                              </div>
                                              
                                              {p.isFreeDelivery && (
                                                <div className="flex items-center gap-1.5 bg-amber-500/20 rounded-lg px-1.5 py-0.5 border border-amber-400/30">
                                                  <Truck
                                                    size={10}
                                                    className="text-amber-400 shrink-0 mb-0.5"
                                                  />
                                                  <span className="text-[8px] font-black text-amber-300">{t("merchant.products.freeDelivery")}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                                  {filteredProductsForView.length > visibleProductsLimit && (
                                    <div className="flex justify-center pt-2 pb-6">
                                      <button
                                        type="button"
                                        onClick={() => setVisibleProductsLimit((n) => n + 32)}
                                        className="px-5 py-2.5 rounded-2xl bg-white/10 border border-white/25 text-white text-xs font-black hover:bg-white/20 transition"
                                      >
                                        {t("merchant.products.loadMore", { count: filteredProductsForView.length - visibleProductsLimit })}
                                      </button>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              
            </div>
          )}

          {/* الطلبات */}
          {activeTab === "orders" && (() => {
            const clearedOrderIds = currentMerchant.inboxClearedOrderIds || [];
            const matchesFilter = (o: Order) =>
              o.status === orderFilter ||
              (orderFilter === "returned" && o.status === "replaced") ||
              (orderFilter === "rejected" && o.status === "cancelled");

            const baseOrdersList = targetOrderId
              ? merchantOrders.filter((o) => o.id === targetOrderId)
              : merchantOrders.filter(
                  (o) => matchesFilter(o) && isOrderShownInMerchantInbox(o, clearedOrderIds),
                );

            const clearableInboxOrders = !targetOrderId
              ? merchantOrders.filter(
                  (o) =>
                    matchesFilter(o) &&
                    isMerchantInboxClearableStatus(o.status) &&
                    isOrderShownInMerchantInbox(o, clearedOrderIds),
                )
              : [];

            const canClearInbox =
              !targetOrderId &&
              (orderFilter === "delivered" ||
                orderFilter === "returned" ||
                orderFilter === "rejected") &&
              clearableInboxOrders.length > 0;

            const handleClearInbox = async () => {
              if (!canClearInbox || isClearingInbox) return;
              const confirm = await showConfirm(
                t("merchant.orders.clearInbox.clearBtn"),
                t("merchant.orders.clearInbox.confirmMsg", { count: clearableInboxOrders.length }),
                t("merchant.orders.clearInbox.clearBtn"),
                t("common.cancel"),
              );
              if (!confirm.isConfirmed) return;
              setIsClearingInbox(true);
              try {
                const nextIds = [
                  ...new Set([
                    ...clearedOrderIds,
                    ...clearableInboxOrders.map((o) => o.id),
                  ]),
                ].slice(-2000);
                await updateStoreProfile({ inboxClearedOrderIds: nextIds });
                showToast(
                  "success",
                  t("merchant.orders.clearInbox.clearedTitle"),
                  t("merchant.orders.clearInbox.clearedBody"),
                );
              } catch (e: any) {
                showToast(
                  "error",
                  t("merchant.orders.clearInbox.failedTitle"),
                  typeof e?.message === "string" ? e.message : t("common.retry"),
                );
              } finally {
                setIsClearingInbox(false);
              }
            };

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
              <div className="px-1 sm:px-2 h-full overflow-y-auto">
                <div className="space-y-6 animate-fade-in text-right text-white" dir="rtl">
                  {/* رأس صفحة الطلبات */}
                  <div
                    className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-[2rem] shadow-2xl gap-4 relative overflow-hidden group text-white"
                  >
                    <div className="absolute -top-10 -right-10 text-white/10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                      <ClipboardList size={140} />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-l from-vibrant-purple/20 to-transparent pointer-events-none" />
                    <div className="relative z-10">
                      <h2 className="text-xl font-black text-white font-tajawal flex items-center gap-2">
                        <span className="welcome-icon-pulse p-2 bg-white/15 border border-white/25 backdrop-blur-sm rounded-xl">
                          <ClipboardList className="text-[#fff700]" size={22} />
                        </span>
                        <span>{t("merchant.orders.title")}</span>
                      </h2>
                      <p className="text-xs text-white/75 font-medium mt-1 font-tajawal">
                        {t("merchant.orders.subtitle", { count: merchantOrders.length })}
                      </p>
                    </div>
                    <div className="relative z-10 flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      <div className="bg-white/10 text-[#E8ECF4] text-xs font-bold px-4 py-2.5 rounded-xl border border-white/25 flex items-center gap-2 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-[#fff700] animate-pulse"></span>
                        <span className="hidden sm:inline">{t("merchant.orders.liveUpdate")}</span>
                        <span className="sm:hidden">{t("merchant.orders.liveUpdateShort")}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setScannerMode("order");
                          setShowScanner(true);
                        }}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-brand-glow hover:opacity-95 active:scale-95 transition-all text-xs"
                      >
                        <Camera size={16} />
                        <span>{t("merchant.orders.scanOrderBtn")}</span>
                      </button>
                    </div>
                  </div>

              {/* تتبع الطلب المحدد من الإشعارات */}
              {targetOrderId && (
                <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md p-4 sm:p-5 rounded-[2rem] flex flex-col sm:flex-row gap-3 items-center justify-between text-right shadow-lg min-w-0 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-l from-amber-500/15 to-transparent pointer-events-none" />
                  <div className="relative z-10 flex items-center gap-3 min-w-0 w-full sm:w-auto">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fff700] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[#fff700]"></span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-black text-white font-tajawal block truncate" title="عرض تفاصيل الطلب المحدد من الإشعارات">عرض تفاصيل الطلب المحدد من الإشعارات</span>
                      <span className="text-[10px] font-bold text-white/70 font-tajawal truncate block">رقم الطلب: #{getOrderSeqId(targetOrderId)}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setTargetOrderId(null)} 
                    className="relative z-10 text-[10px] font-black text-[#E8ECF4] bg-white/10 hover:bg-white/20 px-4 py-2 rounded-2xl border border-white/25 transition-colors cursor-pointer shrink-0 w-full sm:w-auto text-center"
                  >
                    إلغاء التصفية وعرض الكل
                  </button>
                </div>
              )}

              <div
                className="p-2.5 rounded-2xl welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md shadow-lg flex items-center gap-3"
              >
                <div className="p-2 bg-white/10 border border-white/20 rounded-xl text-[#fff700]">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  placeholder={t("merchant.orders.searchPlaceholder")}
                  className="w-full bg-[#0B1320]/60 border border-white/10 text-[#E8ECF4] rounded-xl py-2 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-vibrant-purple/40 placeholder:text-slate-500"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                />
              </div>

              {/* شريط الفرز المطور */}
              <div
                className="flex gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-2xl welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md shadow-lg overflow-x-auto no-scrollbar w-full relative min-w-0 snap-x font-bold"
              >
                {[
                  { id: "pending", label: t("merchant.orders.tabs.new"), count: pendingOrders.length },
                  {
                    id: "accepted",
                    label: t("merchant.orders.tabs.preparing"),
                    count: merchantOrders.filter((o) => o.status === "accepted")
                      .length,
                  },
                  {
                    id: "shipped",
                    label: t("merchant.orders.tabs.withCourier"),
                    count: merchantOrders.filter((o) => o.status === "shipped")
                      .length,
                  },
                  {
                    id: "delivered",
                    label: t("merchant.orders.tabs.delivered"),
                    count: merchantOrders.filter(
                      (o) =>
                        o.status === "delivered" &&
                        isOrderShownInMerchantInbox(o, clearedOrderIds),
                    ).length,
                  },
                  {
                    id: "returned",
                    label: t("merchant.orders.tabs.returned"),
                    count: merchantOrders.filter(
                      (o) =>
                        (o.status === "returned" || o.status === "replaced") &&
                        isOrderShownInMerchantInbox(o, clearedOrderIds),
                    ).length,
                  },
                  {
                    id: "rejected",
                    label: t("merchant.orders.tabs.rejected"),
                    count: merchantOrders.filter(
                      (o) =>
                        (o.status === "rejected" || o.status === "cancelled") &&
                        isOrderShownInMerchantInbox(o, clearedOrderIds),
                    ).length,
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
                        ? "bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white shadow-brand-glow"
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {f.label} <span className={`inline-flex items-center justify-center min-w-[20px] h-5 rounded-md px-1 ml-1 ${orderFilter === f.id && !targetOrderId ? 'bg-white/20' : 'bg-white/10 text-[#E8ECF4]'}`}>{f.count}</span>
                  </button>
                ))}
              </div>

              {canClearInbox && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 welcome-card-glow welcome-card-border-glow bg-white/5 border border-rose-400/30 backdrop-blur-md rounded-[2rem] p-4 shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-l from-rose-600/15 to-transparent pointer-events-none" />
                  <div className="relative z-10 text-right min-w-0">
                    <p className="text-xs font-black text-white">{t("merchant.orders.clearInbox.title")}</p>
                    <p className="text-[10px] text-white/65 font-bold mt-1 leading-relaxed">
                      {t("merchant.orders.clearInbox.body", { count: clearableInboxOrders.length })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearInbox}
                    disabled={isClearingInbox}
                    className="relative z-10 shrink-0 px-5 py-3 rounded-xl bg-white/10 hover:bg-rose-500/20 border border-rose-400/30 text-rose-200 font-black text-xs flex items-center justify-center gap-2 transition disabled:opacity-60"
                  >
                    {isClearingInbox ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {t("merchant.orders.clearInbox.clearing")}
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        {t("merchant.orders.clearInbox.clearBtn")}
                      </>
                    )}
                  </button>
                </div>
              )}

              {displayOrdersList.length === 0 ? (
                <div
                  className="py-20 text-center rounded-[2rem] welcome-card-glow welcome-card-border-glow bg-white/5 border border-dashed border-white/25 backdrop-blur-md shadow-lg text-white"
                >
                  <ClipboardList
                    size={48}
                    className="mx-auto mb-4 opacity-60 text-[#fff700]"
                  />
                  <p className="font-bold text-white/80">
                    {(orderFilter === "delivered" || orderFilter === "returned" || orderFilter === "rejected") &&
                    merchantOrders.some(
                      (o) =>
                        matchesFilter(o) &&
                        !isOrderShownInMerchantInbox(o, clearedOrderIds),
                    )
                      ? t("merchant.orders.clearInbox.clearedEmpty")
                      : t("merchant.orders.clearInbox.emptySection")}
                  </p>
                </div>
              ) : (
                <VirtualizedList
                  items={displayOrdersList}
                  estimateSize={280}
                  overscan={4}
                  maxHeight="72vh"
                  getItemKey={(o) => o.id}
                  className="w-full"
                  renderItem={(o) => (
                      <div className="pb-4 w-full">
                      <div
                        className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] shadow-lg hover:bg-white/10 hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col min-w-0 w-full text-white"
                      >
                        {/* ترويسة الفاتورة مدمجة لتوفير المساحة */}
                        <div className="p-3 sm:p-4 border-b border-white/15 bg-white/5 flex flex-wrap justify-between items-center gap-3 min-w-0 w-full">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-2 mb-1">
                              <span className="text-[10px] bg-white/10 text-[#E8ECF4] border border-white/15 px-2 py-0.5 rounded-md font-black whitespace-nowrap shrink-0 flex items-center gap-1">
                                <span>#{getOrderSeqId(o.id)}</span>
                                <CopyButton text={getOrderSeqId(o.id)} size={9} />
                              </span>
                              <span className="text-[9px] font-bold text-white/50 whitespace-nowrap shrink-0">
                                {formatSafeDateTimeString(o.createdAt, 'ar-IQ', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </div>
                            <h3 className="text-sm font-black text-white flex items-center gap-1 truncate" title={o.customerName}>
                              <span>{o.customerName}</span>
                              <CopyButton text={o.customerName} size={10} />
                              {o.returnReason?.includes("استبدال") && (
                                <span className="mr-2 inline-block text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/30 whitespace-nowrap shrink-0">
                                  {t("merchant.orders.card.replacement")}
                                </span>
                              )}
                            </h3>
                            <span className="text-[10px] font-mono text-[#E8ECF4] inline-flex items-center gap-1 leading-none mt-1 select-all" title={o.customerId}>
                              <span>ID: #{getCustomerSeqId(o.customerId)}</span>
                              <CopyButton text={getCustomerSeqId(o.customerId)} size={9} />
                            </span>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-white/70 mt-1 min-w-0">
                              <Phone size={10} className="text-[#fff700] shrink-0" />
                              <span className="truncate">{o.customerPhone}</span>
                              <CopyButton text={o.customerPhone} size={9} />
                            </div>
                          </div>
                          
                          <div className="text-left shrink-0 bg-white/5 border border-white/15 p-2 rounded-xl shadow-sm">
                            <div className="text-[8px] font-black text-white/50 uppercase mb-0.5">
                              {t("merchant.orders.card.total")}
                            </div>
                            <div className="text-sm font-black text-[#fff700]">
                              {(o.total || 0).toLocaleString()} <span className="text-[9px] font-bold">{t("merchant.delivery.currency")}</span>
                            </div>
                          </div>
                        </div>

                        {/* المحتوى الداخلي مجمع بشبكة */}
                        <div className="flex flex-col md:flex-row min-w-0 w-full">
                          {/* المنتجات والتفاصيل */}
                          <div className="flex-1 p-3 sm:p-4 min-w-0">
                            <div className="flex items-start gap-2 mb-3 bg-white/5 border border-white/15 p-2 rounded-xl min-w-0">
                              <MapPin size={14} className="text-[#fff700] mt-0.5 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[9px] font-black text-white/50 mb-0.5">{t("merchant.orders.card.delivery")}</p>
                                <p className="text-[10px] font-bold text-[#E8ECF4] whitespace-normal break-words" title={`${o.customerProvince} - ${o.customerAddress}`}>
                                  {o.customerProvince} - {o.customerAddress}
                                </p>
                                {(o as any).customerLat && (o as any).customerLng && (
                                    <div className="mt-2 space-y-2">
                                    <div className="w-full h-24 rounded-xl overflow-hidden border border-white/10 shadow-sm relative pointer-events-none z-0">
                                      <Suspense fallback={<div className="w-full h-full bg-white/5 animate-pulse rounded-xl" />}>
                                        <LazyOrderMap lat={(o as any).customerLat} lng={(o as any).customerLng} orderId={o.id} />
                                      </Suspense>
                                      {/* غطاء شفاف لمنع التفاعل مع الخريطة عبر اللمس */}
                                      <div className="absolute inset-0 z-[400] bg-transparent"></div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.preventDefault();
                                          const lat = Number((o as any).customerLat);
                                          const lng = Number((o as any).customerLng);
                                          if (!lat || !lng) {
                                            showToast("error", t("merchant.orders.map.shareLocation"), t("merchant.orders.map.noCoordinates"));
                                            return;
                                          }
                                          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                                          const address = `${o.customerProvince || ""} - ${o.customerAddress || ""}`.trim();
                                          const title = t("merchant.orders.map.shareLocationTitle");
                                          const body = t("merchant.orders.map.shareLocationText", {
                                            orderId: getOrderSeqId(o.id),
                                            address,
                                          });
                                          const text = `${body}\n${mapsUrl}`;

                                          setShareText(text);
                                          setShareConfig({ type: "location", data: { url: mapsUrl } });

                                          const result = await tryNativeShare({ title, text, url: mapsUrl });
                                          if (result === "shared" || result === "cancelled") return;

                                          // على الويب أو عند تعذر مشاركة النظام: قائمة واتساب والتطبيقات
                                          setShowShareModal(true);
                                        }}
                                        className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black bg-white/10 border border-white/20 text-[#E8ECF4] px-2 py-2.5 rounded-lg shadow-sm hover:bg-white/20 transition-colors"
                                      >
                                        <Share2 size={12} className="text-[#fff700]" />
                                        {t("merchant.orders.map.shareLocation")}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            
                            <p className="text-[9px] font-black text-white/80 mb-2 border-r-2 border-white/20 pr-2">
                              {t("merchant.orders.card.products")}
                            </p>
                            <div className="space-y-1.5 max-h-[100px] overflow-y-auto no-scrollbar pr-1">
                              {o.items.map((it, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2 min-w-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {it.image && (
                                      <img src={it.image} alt={it.productName} className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0 bg-white/5" />
                                    )}
                                    <div className="flex items-center justify-center w-5 h-5 bg-white/10 rounded text-[9px] font-black text-[#E8ECF4] shrink-0">
                                      {it.quantity}
                                    </div>
                                    <span className="text-[10px] font-bold text-[#E8ECF4] truncate" title={it.productName}>
                                      {it.productName}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-black text-white/70 whitespace-nowrap shrink-0">
                                    {((it.price || 0) * (it.quantity || 0)).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5 min-w-0">
                                <div className="flex justify-between items-center text-[9px]">
                                    <span className="font-bold text-white/60">{t("merchant.orders.card.productsPrice")}</span>
                                    <span className="font-black text-[#E8ECF4]">{(o.subtotal || 0).toLocaleString()} {t("merchant.delivery.currency")}</span>
                                </div>
                                <div className="flex justify-between items-center text-[9px]">
                                    <span className="font-bold text-white/60">{t("merchant.orders.card.deliveryPrice")}</span>
                                    <span className="font-black text-[#E8ECF4]">{(o.deliveryPrice || 0).toLocaleString()} {t("merchant.delivery.currency")}</span>
                                </div>
                                {(o.discountAmount || 0) > 0 && (
                                    <div className="flex justify-between items-center text-[9px]">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-emerald-400">{t("merchant.orders.card.discount")}</span>
                                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${
                                              o.discountSponsor === 'ADMIN' 
                                                ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30' 
                                                : 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                                            }`}>
                                              {o.discountSponsor === 'ADMIN' ? t("merchant.orders.card.sponsoredByApp") : t("merchant.orders.card.sponsoredByStore")}
                                            </span>
                                        </div>
                                        <span className="font-black text-emerald-400">- {(o.discountAmount || 0).toLocaleString()} {t("merchant.delivery.currency")}</span>
                                    </div>
                                )}
                            </div>

                            {(o.rejectionReason || o.returnReason || o.status === "cancelled") && (
                              <div className="mt-3 p-2 bg-rose-500/15 rounded-lg border border-rose-400/30 text-[9px] font-bold text-rose-300 truncate">
                                {o.status === "cancelled" ? t("merchant.orders.card.cancelledByCustomer") : o.rejectionReason ? t("merchant.orders.card.rejectionPrefix", { reason: o.rejectionReason }) : t("merchant.orders.card.returnPrefix", { reason: o.returnReason ?? "" })}
                              </div>
                            )}
                          </div>

                          {/* الأزرار (أفقية في الموبايل، عمودية في الشاشات الكبيرة) */}
                          <div className="order-actions-container p-4 bg-white/5 border-t md:border-t-0 md:border-r border-white/10 flex flex-wrap md:flex-col gap-3 shrink-0 md:w-44 h-full content-center md:content-start justify-center md:justify-evenly items-stretch font-sans">
                            {o.status === "pending" && (
                              <>
                                <button 
                                  onClick={() => void runOrderStatusUpdate(o.id, "accepted")}
                                  disabled={updatingOrderId === o.id} 
                                  className="relative overflow-hidden group flex-1 py-2.5 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white rounded-xl shadow-brand-glow font-black text-[11px] sm:text-xs flex items-center justify-center gap-2 hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 w-full min-w-[100px] cursor-pointer"
                                >
                                  <Check className="group-hover:scale-125 transition-transform duration-300 shrink-0" size={16} /> 
                                  <span>{t("merchant.orders.actions.accept")}</span>
                                </button>
                                <button 
                                  onClick={() => setActionModal({ show: true, orderId: o.id, type: "rejected" })} 
                                  className="group flex-1 py-2.5 bg-white/10 text-rose-300 border border-rose-400/30 hover:border-rose-400/50 hover:bg-rose-500/15 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-2 shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 w-full min-w-[100px] cursor-pointer"
                                >
                                  <X className="group-hover:rotate-90 transition-transform duration-300 shrink-0" size={16} /> 
                                  <span>{t("merchant.orders.actions.reject")}</span>
                                </button>
                              </>
                            )}
                            {o.status === "accepted" && (
                              <button 
                                onClick={() => void runOrderStatusUpdate(o.id, "shipped")}
                                disabled={updatingOrderId === o.id} 
                                className="relative overflow-hidden group flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl shadow-[0_4px_12px_rgba(245,158,11,0.25)] hover:shadow-[0_8px_20px_rgba(245,158,11,0.35)] font-black text-[11px] sm:text-xs flex items-center justify-center gap-2 hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 w-full min-w-[100px] cursor-pointer"
                              >
                                <Truck className="group-hover:translate-x-1 transition-transform duration-300 shrink-0" size={16} /> 
                                <span>{t("merchant.orders.actions.ship")}</span>
                              </button>
                            )}
                            {o.status === "shipped" && (
                              <>
                                <button 
                                  onClick={() => void runOrderStatusUpdate(o.id, "delivered")}
                                  disabled={updatingOrderId === o.id} 
                                  className="relative overflow-hidden group flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:shadow-[0_8px_20px_rgba(16,185,129,0.35)] font-black text-[11px] sm:text-xs flex items-center justify-center gap-2 hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 w-full min-w-[100px] cursor-pointer"
                                >
                                  <CheckCircle className="group-hover:scale-125 transition-transform duration-300 shrink-0" size={16} /> 
                                  <span>{t("merchant.orders.actions.delivered")}</span>
                                </button>
                                <div className="flex gap-2 w-full flex-wrap sm:flex-nowrap">
                                  <button 
                                    onClick={() => setReplacementModal({ show: true, orderId: o.id, originalItems: o.items })} 
                                    className="group flex-1 py-2 bg-white/10 text-[#E8ECF4] border border-white/20 rounded-xl font-bold text-[10px] hover:bg-white/20 hover:border-white/30 active:scale-95 transition-all flex items-center justify-center gap-1 min-w-[70px] cursor-pointer"
                                  >
                                    <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500 shrink-0 text-amber-400" /> 
                                    <span>{t("merchant.orders.actions.replace")}</span>
                                  </button>
                                  <button 
                                    onClick={() => handleReturnOrder(o.id)} 
                                    className="group flex-1 py-2 bg-white/10 text-rose-300 border border-rose-400/30 rounded-xl font-bold text-[10px] hover:bg-rose-500/15 hover:border-rose-400/50 active:scale-95 transition-all flex items-center justify-center gap-1 min-w-[70px] cursor-pointer"
                                  >
                                    <RefreshCw size={12} className="group-hover:-rotate-90 transition-transform shrink-0" /> 
                                    <span>{t("merchant.orders.actions.return")}</span>
                                  </button>
                                </div>
                              </>
                            )}
                            
                            <div className="flex flex-col gap-2 w-full border-t border-white/10 pt-3 mt-1">
                              <button 
                                onClick={() => { setSelectedInvoice(o); setShowShippingLabelModal(true); }} 
                                className="group w-full py-2 bg-white/10 text-[#fff700] hover:bg-white/20 rounded-xl font-extrabold text-[10.5px] flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer border border-white/10"
                              >
                                <Printer size={14} className="text-[#fff700] group-hover:scale-110 transition-transform duration-300 shrink-0" /> 
                                <span className="truncate">{t("merchant.orders.actions.printLabel")}</span>
                              </button>
                              <button 
                                onClick={() => handleWhatsAppShare(o)}
                                disabled={isSharingInvoice}
                                className="group w-full py-2 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-400/30 hover:border-emerald-400/50 rounded-xl font-extrabold text-[10.5px] flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                              >
                                <MessageCircle size={14} className="text-emerald-400 group-hover:scale-110 transition-transform duration-300 shrink-0" /> 
                                <span className="truncate">{t("merchant.orders.actions.shareWhatsApp")}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      </div>
                  )}
                />
              )}
                </div>
              </div>
            </div>
            );
          })()}



          {/* التسويق (Marketing) */}
          {(activeTab === "marketing" || (activeTab === "mystore" && myStoreSubPage === "marketing")) && (
            <div className="space-y-6">
              <div className="px-1 sm:px-2 h-full overflow-y-auto">
                <div className="merchant-glass-page reports-page space-y-6 animate-fade-in text-right text-white" dir="rtl">
                  {/* Marketing Header */}
                  <div
                    className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-[2rem] shadow-2xl gap-4 relative overflow-hidden group"
                  >
                    <div className="absolute -top-10 -right-10 text-white/10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                      <Megaphone size={140} />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-l from-rose-600/20 to-transparent pointer-events-none" />
                    <div className="relative z-10">
                      <h2 className="text-xl font-black text-white font-tajawal flex items-center gap-2">
                        <span className="welcome-icon-pulse p-2 bg-white/15 border border-white/25 backdrop-blur-sm rounded-xl">
                          <Megaphone className="text-[#fff700]" size={22} />
                        </span>
                        <span>{t('merchant.marketingPage.title')}</span>
                      </h2>
                      <p className="text-xs text-white/75 font-medium mt-1 font-tajawal max-w-md">
                        {t('merchant.marketingPage.subtitle')}
                      </p>
                    </div>
                    <div className="relative z-10 bg-white/10 text-[#E8ECF4] text-xs font-bold px-4 py-2.5 rounded-xl border border-white/25 flex items-center gap-2 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-[#fff700] animate-pulse"></span>
                      <span className="hidden sm:inline">{t('merchant.orders.liveUpdate')}</span>
                      <span className="sm:hidden">{t('merchant.orders.liveUpdateShort')}</span>
                    </div>
                  </div>

                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label: t('merchant.marketingPage.kpi.promoCodes'), val: merchantPromos.filter((p) => p.status === "active").length, icon: <Gift size={18} className="stroke-[2.5]" /> },
                      { label: t('merchant.marketingPage.kpi.publishedProducts'), val: merchantProducts.filter((p) => p.status === "published").length, icon: <Package size={18} className="stroke-[2.5]" /> },
                      { label: t('merchant.marketingPage.kpi.flashSales'), val: flashSales.filter((s) => s.status !== "ended" && s.status !== "paused").length, icon: <Zap size={18} className="stroke-[2.5]" /> },
                    ].map((s, i) => (
                      <div key={i} className="p-5 rounded-[2rem] border shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group merchant-brand-card relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold text-[#fff700]">{s.label}</p>
                          <div className="p-2 rounded-xl shrink-0 bg-white/10 text-[#fff700] transition-transform duration-300 group-hover:scale-110">{s.icon}</div>
                        </div>
                        <span className="text-base sm:text-lg font-black tracking-tight text-brand-white">{s.val}</span>
                      </div>
                    ))}
                  </div>

                  {/* خصم شامل على كل المنتجات */}
                  {(() => {
                    const bulkTargets = getBulkStoreDiscountTargets();
                    const discountedInScope = bulkTargets.filter((p) => p.discountType !== "none").length;
                    const sample = bulkTargets[0];
                    const previewPercent = Number(bulkStoreDiscountPercent) || 0;
                    const previewFinal =
                      sample && previewPercent >= 1 && previewPercent <= 99
                        ? computeProductFinalPrice(sample.price, "percent", previewPercent)
                        : null;

                    return (
                      <div className="merchant-brand-card rounded-[2rem] p-6 border shadow-sm space-y-5 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 p-4 opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
                          <Percent size={72} className="text-[#fff700]" />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-black text-[#fff700] flex items-center gap-2">
                              <Percent size={20} className="text-[#fff700]" />
                              {t("merchant.marketingPage.bulk.title")}
                            </h3>
                            <p className="text-xs text-white/70 mt-1 max-w-lg">
                              {t("merchant.marketingPage.bulk.subtitle")}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-[#fff700] bg-white/10 border border-white/20 px-3 py-1.5 rounded-full shrink-0">
                            {t("merchant.marketingPage.bulk.scopeCount", { count: bulkTargets.length })}
                          </span>
                        </div>

                        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 merchant-panel-inset border border-white/10 p-4 rounded-2xl">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[#fff700]">{t("merchant.marketingPage.bulk.discountLabel")}</label>
                            <input
                              type="number"
                              min={1}
                              max={99}
                              value={bulkStoreDiscountPercent}
                              onChange={(e) => setBulkStoreDiscountPercent(Number(e.target.value))}
                              className="w-full bg-[#0B1320] border border-white/10 rounded-xl px-4 py-3 text-sm font-black text-[#fff700] focus:ring-2 focus:ring-vibrant-purple/40"
                              placeholder={t("merchant.marketingPage.bulk.discountPlaceholder")}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[#fff700]">{t("merchant.marketingPage.bulk.scopeLabel")}</label>
                            <select
                              value={bulkStoreDiscountScope}
                              onChange={(e) =>
                                setBulkStoreDiscountScope(
                                  e.target.value as "published" | "all" | "draft" | "archived",
                                )
                              }
                              className="welcome-select welcome-select--sm"
                            >
                              <option value="published">{t("merchant.marketingPage.bulk.scopePublished")}</option>
                              <option value="all">{t("merchant.marketingPage.bulk.scopeAll")}</option>
                              <option value="draft">{t("merchant.marketingPage.bulk.scopeDraft")}</option>
                              <option value="archived">{t("merchant.marketingPage.bulk.scopeArchived")}</option>
                            </select>
                          </div>
                        </div>

                        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="merchant-panel-inset border border-white/10 rounded-xl p-3 text-center">
                            <p className="text-[9px] text-white/60 font-bold">{t("merchant.marketingPage.bulk.statsTarget")}</p>
                            <p className="text-lg font-black text-brand-white mt-1">{bulkTargets.length}</p>
                          </div>
                          <div className="merchant-panel-inset border border-white/10 rounded-xl p-3 text-center">
                            <p className="text-[9px] text-white/60 font-bold">{t("merchant.marketingPage.bulk.statsDiscounted")}</p>
                            <p className="text-lg font-black text-[#fff700] mt-1">{discountedInScope}</p>
                          </div>
                          <div className="merchant-panel-inset border border-white/10 rounded-xl p-3 text-center">
                            <p className="text-[9px] text-white/60 font-bold">{t("merchant.marketingPage.bulk.statsPreview")}</p>
                            {sample && previewFinal !== null ? (
                              <p className="text-xs font-black text-brand-white mt-1 leading-snug">
                                <span className="line-through text-white/50 block">{sample.price.toLocaleString()}</span>
                                <span className="text-[#fff700]">{previewFinal.toLocaleString()} {t("common.currency")}</span>
                              </p>
                            ) : (
                              <p className="text-xs text-white/50 mt-1">—</p>
                            )}
                          </div>
                        </div>

                        <div className="relative z-10 flex flex-col sm:flex-row gap-3">
                          <button
                            type="button"
                            disabled={bulkStoreDiscountApplying || bulkTargets.length === 0}
                            onClick={() => void applyBulkStoreDiscount()}
                            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white text-sm font-black flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {bulkStoreDiscountApplying ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <Percent size={18} />
                            )}
                            {t("merchant.marketingPage.bulk.applyBtn")}
                          </button>
                          <button
                            type="button"
                            disabled={bulkStoreDiscountApplying || discountedInScope === 0}
                            onClick={() => void removeBulkStoreDiscount()}
                            className="flex-1 py-3 rounded-2xl bg-white/10 border border-white/20 text-[#E8ECF4] text-sm font-black flex items-center justify-center gap-2 hover:bg-white/15 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <RefreshCw size={18} />
                            {t("merchant.marketingPage.bulk.removeBtn")}
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Suspense fallback={<div className="rounded-[2rem] p-6 h-48 bg-white/5 animate-pulse" />}>
                  <PromoBannerBuilderLazy
                    storeId={currentMerchant.id}
                    initialData={{
                      title: currentMerchant.promoBanner?.title || t("merchant.banner.defaultTitle"),
                      subtitle:
                        currentMerchant.promoBanner?.subtitle ||
                        t("merchant.banner.defaultSubtitle"),
                      backgroundColor: currentMerchant.promoBanner?.backgroundColor || "#7B3DFF",
                      textColor: currentMerchant.promoBanner?.textColor || "#ffffff",
                      isActive: currentMerchant.promoBanner?.isActive || false,
                    }}
                    onSave={handlePromoBannerSave}
                    onToggleActive={async (active) => {
                      try {
                        const next = {
                          title: currentMerchant.promoBanner?.title || t("merchant.banner.defaultTitle"),
                          subtitle:
                            currentMerchant.promoBanner?.subtitle ||
                            t("merchant.banner.defaultSubtitle"),
                          backgroundColor: currentMerchant.promoBanner?.backgroundColor || "#7B3DFF",
                          textColor: currentMerchant.promoBanner?.textColor || "#ffffff",
                          isActive: active,
                        };
                        await updateStoreProfile({ promoBanner: next });
                        showToast(
                          "success",
                          active ? t("merchant.banner.toggleOnTitle") : t("merchant.banner.toggleOffTitle"),
                          active ? t("merchant.banner.toggleOnBody") : t("merchant.banner.toggleOffBody"),
                        );
                        if (currentMerchant?.id) {
                          const bannerKey = active ? "merchant.bannerOn" : "merchant.bannerOff";
                          const bannerContent = buildNotificationContent(
                            adminSettings as Record<string, unknown>,
                            bannerKey,
                          );
                          if (bannerContent) {
                            await addNotification({
                              userId: currentMerchant.id,
                              role: "merchant",
                              title: bannerContent.title,
                              message: bannerContent.message,
                              type: "system",
                              templateKey: bannerKey,
                              ...notificationDeliveryFields(adminSettings as Record<string, unknown>, bannerKey),
                            });
                          }
                        }
                      } catch {
                        showToast("error", t("merchant.banner.toggleFailedTitle"), t("merchant.banner.toggleFailedBody"));
                      }
                    }}
                  />
                </Suspense>

                {/* 2. Social Media Integration */}
                <div className="rounded-[2rem] p-6 shadow-sm border space-y-6 merchant-brand-card relative overflow-hidden group hover:shadow-md transition-all duration-300">
                  <div className="absolute top-0 left-0 p-4 opacity-10 group-hover:scale-110 transition-transform pointer-events-none">
                    <Share2 size={72} className="text-[#fff700]" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-lg font-black text-[#fff700] mb-1 flex items-center gap-2">
                      <div className="p-2 bg-white/10 rounded-xl"><Share2 size={18} className="text-[#fff700]" /></div>
                      {t("merchant.marketingPage.share.title")}
                    </h3>
                    <p className="text-xs text-white/80 font-medium">{t("merchant.marketingPage.share.subtitle")}</p>
                  </div>

                  <div className="space-y-4 relative z-10">
                    <div className="merchant-panel-inset border border-white/10 p-5 rounded-[1.5rem] flex flex-col sm:flex-row gap-4 items-center justify-between">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="p-3 merchant-icon-tile rounded-xl shrink-0"><StoreIcon size={22} /></div>
                        <div>
                          <h4 className="font-bold text-sm text-[#fff700]">{t("merchant.marketingPage.share.storeTitle")}</h4>
                          <p className="text-xs text-white/70 max-w-xs mt-1 leading-relaxed">{t("merchant.marketingPage.share.storeSubtitle")}</p>
                        </div>
                      </div>
                      <button onClick={() => openShareModal("store", currentMerchant)} className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0">
                        <Share2 size={14} /> {t("merchant.marketingPage.share.shareBtn")}
                      </button>
                    </div>

                    <div className="p-5 rounded-[1.5rem] border border-white/10 merchant-panel-inset flex flex-col gap-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 merchant-icon-tile rounded-xl shrink-0"><Package size={16} /></div>
                        <div>
                          <h4 className="font-bold text-sm text-[#fff700]">{t("merchant.marketingPage.share.productTitle")}</h4>
                          <p className="text-xs text-white/70 mt-0.5">{t("merchant.marketingPage.share.productSubtitle")}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <select value={marketingSelectedProductId} onChange={(e) => setMarketingSelectedProductId(e.target.value)} className="welcome-select welcome-select--sm">
                          <option value="">{t("merchant.marketingPage.share.selectProduct")}</option>
                          {products.filter(p => p.status === 'published').map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                        </select>
                        <button disabled={!marketingSelectedProductId} onClick={() => { const p = products.find(p => p.id === marketingSelectedProductId); if (p) openShareModal("product", p); }} className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border active:scale-95 ${marketingSelectedProductId ? "bg-gradient-to-r from-vibrant-purple to-deep-navy border-white text-white hover:opacity-90" : "bg-white/10 text-white/40 border-white/10 cursor-not-allowed"}`}>
                          <Share2 size={16} /> {t("merchant.marketingPage.share.shareProductBtn")}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

              {/* أكواد الخصم */}
              <Suspense fallback={<DashboardChunkFallback label="جارٍ تحميل أكواد الخصم..." />}>
                <MerchantPromoCodesManager
                  storeId={currentMerchant.id}
                  promos={merchantPromos}
                  allPromoCodes={promoCodes}
                  createPromoCode={createPromoCode}
                  togglePromoCodeStatus={togglePromoCodeStatus}
                  deletePromoCode={deletePromoCode}
                  modalOpen={promoModal}
                  onModalOpenChange={setPromoModal}
                />
              </Suspense>


              {/* الفعاليات المركزية */}
              <div className="space-y-4 pt-2 border-t border-white/10">
                <div className="rounded-[2rem] border shadow-sm p-6 overflow-hidden relative text-right merchant-brand-card group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform pointer-events-none"><Zap size={100} className="text-[#fff700]" /></div>
                  <div className="relative z-10">
                    <h3 className="font-black text-2xl text-[#fff700] flex items-center gap-2 mb-2"><Zap size={24} className="text-[#fff700]" /><span>{t("merchant.flashSales.title")}</span></h3>
                    <p className="text-xs text-white/70 max-w-sm">{t("merchant.flashSales.subtitle")}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {flashSales.filter((s) => s.status !== "ended" && s.status !== "paused").length === 0 ? (
                    <div className="p-12 rounded-[2rem] border border-dashed border-white/20 shadow-sm text-center merchant-brand-card">
                      <Gift size={48} className="mx-auto text-[#fff700] mb-4" />
                      <p className="font-bold text-brand-white">{t("merchant.flashSales.empty")}</p>
                      <p className="text-xs text-white/60 mt-2">{t("merchant.flashSales.emptyHint")}</p>
                    </div>
                  ) : (
                    flashSales.filter((s) => s.status !== "ended" && s.status !== "paused").map((sale) => {
                      const isUpcoming = new Date() < new Date(sale.startTime);
                      const myRequests = flashSaleRequests.filter((r) => r.flashSaleId === sale.id && r.storeId === currentMerchant.id);
                      return (
                        <div key={sale.id} className="merchant-brand-card rounded-[2rem] border shadow-sm p-6 text-right hover:shadow-md transition-all duration-300">
                          <div className="flex justify-between items-start mb-4 gap-3">
                            <div>
                              <h4 className="font-black text-lg text-[#fff700]">{sale.title}</h4>
                              <p className="text-xs text-white/60 mt-1">{sale.description}</p>
                            </div>
                            {(sale.status === "upcoming" && isUpcoming) && <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-full border border-amber-400/30 shrink-0">{t("merchant.flashSales.startsSoon")}</span>}
                            {(sale.status === "active" || !isUpcoming) && <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-400/30 flex items-center gap-1 shrink-0"><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></div>{t("merchant.flashSales.activeNow")}</span>}
                          </div>
                          <div className="flex flex-wrap gap-4 mb-6 text-[11px] font-bold text-[#E8ECF4] merchant-panel-inset p-3 rounded-xl border border-white/10">
                            <div>{t("merchant.flashSales.starts")} <span className="font-mono text-[#fff700]" dir="ltr">{formatSafeDateTimeString(sale.startTime)}</span></div>
                            <div>{t("merchant.flashSales.ends")} <span className="font-mono text-[#fff700]" dir="ltr">{formatSafeDateTimeString(sale.endTime)}</span></div>
                          </div>
                          {sale.status === "active" && myRequests.length === 0 && (
                            <div className="bg-rose-500/15 text-rose-300 p-3 rounded-xl text-xs font-bold mb-4 border border-rose-400/30 text-center">{t("merchant.flashSales.tooLate")}</div>
                          )}
                          <div className="space-y-3">
                            <h5 className="font-bold text-[#fff700] text-xs flex justify-between items-center pb-2 border-b border-white/10">
                              <span>{t("merchant.flashSales.yourProducts", { count: myRequests.length })}</span>
                              {(sale.status === "upcoming" && isUpcoming) && (
                                <button onClick={() => setJoinFlashSaleData({ flashSaleId: sale.id })} className="px-3 py-1 bg-white/10 text-[#fff700] rounded-lg font-bold text-[10px] hover:bg-white/20 transition border border-white/10">{t("merchant.flashSales.joinProduct")}</button>
                              )}
                            </h5>
                            {myRequests.length === 0 && <div className="text-center text-white/50 py-4 text-xs font-bold merchant-panel-inset rounded-xl border border-dashed border-white/10">{t("merchant.flashSales.noProductsJoined")}</div>}
                            {myRequests.map((req) => {
                              const p = products.find((prod) => prod.id === req.productId);
                              if (!p) return null;
                              return (
                                <div key={req.id} className="flex justify-between items-center p-3 merchant-panel-inset border border-white/10 rounded-2xl shadow-sm">
                                  <div className="flex items-center gap-3">
                                    <img src={p.image || undefined} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                                    <div>
                                      <h6 className="font-black text-[11px] text-[#fff700]">{p.name}</h6>
                                      <div className="flex gap-2 text-[9px] mt-0.5">
                                        <span className="text-white/50">{t("merchant.flashSales.original")} <del>{p.price.toLocaleString()}</del></span>
                                        <span className="text-rose-300 font-black">{t("merchant.flashSales.current")} {req.promotionalPrice.toLocaleString()}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    {req.status === "pending" && <span className="px-2 py-1 bg-white/10 text-white/70 font-bold text-[9px] rounded uppercase border border-white/10">{t("merchant.flashSales.statusPending")}</span>}
                                    {req.status === "approved" && <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 font-bold text-[9px] rounded uppercase border border-emerald-400/30">{t("merchant.flashSales.statusApproved")}</span>}
                                    {req.status === "rejected" && <span className="px-2 py-1 bg-rose-500/20 text-rose-300 font-bold text-[9px] rounded uppercase border border-rose-400/30">{t("merchant.flashSales.statusRejected")}</span>}
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

          {/* جمهوري ضمن متجري */}
          {activeTab === "mystore" && myStoreSubPage === "customers" && (
            <div className="merchant-glass-page space-y-4 animate-fade-in px-1 pb-20">
              <div className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md p-5 rounded-[2rem] shadow-2xl relative overflow-hidden text-white">
                <div className="absolute inset-0 bg-gradient-to-l from-sky-500/15 to-transparent pointer-events-none" />
                <div className="relative z-10 flex items-center gap-3">
                  <span className="welcome-icon-pulse p-2 bg-white/15 border border-white/25 rounded-xl">
                    <Users className="text-[#fff700]" size={20} />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-white">
                      {audienceSegment
                        ? t(`merchant.audience.${audienceSegment === "pastBuyers" ? "pastBuyers" : audienceSegment}`)
                        : t("merchant.audience.title")}
                    </h2>
                    <p className="text-[10px] text-white/70 font-bold">
                      {audienceSegment
                        ? t("merchant.audience.listBySegment")
                        : t("merchant.audience.pickSegment")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-4 sm:p-6 shadow-lg text-white">
                <Suspense fallback={<DashboardChunkFallback label="جارٍ تحميل جمهوري..." />}>
                  <StoreAudiencePanel
                    storeId={currentMerchant.id}
                    customers={customers}
                    orders={orders}
                    searchQuery={audienceSearchQuery}
                    onSearchQueryChange={setAudienceSearchQuery}
                    getCustomerSeqId={getCustomerSeqId}
                    onSelectCustomer={setSelectedAudienceId}
                    onSendGift={openAudienceGift}
                    activeSegment={audienceSegment}
                    onSegmentChange={setAudienceSegment}
                  />
                </Suspense>
              </div>
            </div>
          )}

          {/* حسابي — قائمة + صفحات فرعية مثل تطبيق محلك */}
          {activeTab === "profile" && (
            <div className="space-y-6 animate-fade-in px-1">
              <div className="merchant-glass-page space-y-4 pb-20">
              {profileSubPage === null && (
              <>
              {/* بطاقة المتجر الرئيسية */}
              <div className="welcome-card-glow welcome-card-shimmer welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden text-center group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                <div className="relative z-10">
                  <div className="relative inline-block mb-4">
                    {profileForm.logo || currentMerchant.logo ? (
                      <img
                        src={profileForm.logo || currentMerchant.logo}
                        alt={currentMerchant.shopName}
                        className="w-20 h-20 rounded-[1.8rem] object-cover shadow-xl shadow-violet/20 border-4 border-white/40"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-[1.8rem] bg-vibrant-purple flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-violet/20 border-4 border-white/40">
                        {(currentMerchant.shopName || currentMerchant.ownerName || "م").charAt(0)}
                      </div>
                    )}
                  </div>
                  <StoreIdentity
                    name={currentMerchant.shopName}
                    username={currentMerchant.username}
                    verified={isStoreVerified(currentMerchant)}
                    size="lg"
                    align="center"
                    nameAs="h2"
                    nameClassName="text-white text-xl"
                    usernameClassName="welcome-btn-pulse mt-1 px-4 py-1 bg-white/10 border border-white/30 backdrop-blur-md rounded-2xl text-white text-[11px] font-black opacity-100"
                  />
                  <p className="text-[11px] text-white/70 font-bold mt-2 mb-2">{currentMerchant.ownerName}</p>
                  <div className="flex items-center justify-center gap-1.5 select-none">
                    <Phone size={10} className="text-white" />
                    <span className="text-white font-black text-[10px] tracking-widest">{currentMerchant.phone}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
              <button
                type="button"
                onClick={() => openProfileSubPage("storeInfo")}
                className="w-full text-right welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 shadow-sm flex items-center justify-between hover:bg-white/10 transition-colors group"
                dir="rtl"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 border border-white/20 text-white/80 rounded-2xl group-hover:bg-vibrant-purple group-hover:text-white transition-colors">
                    <User size={20} />
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-white block">{t("profile.storeInfo")}</span>
                    <span className="text-[10px] text-white/70 font-bold">{t("profile.storeInfoHint")}</span>
                  </div>
                </div>
                <ChevronLeft size={18} className="text-white group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => openProfileSubPage("location")}
                className="w-full text-right welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 shadow-sm flex items-center justify-between hover:bg-white/10 transition-colors group"
                dir="rtl"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 border border-white/20 text-white/80 rounded-2xl group-hover:bg-vibrant-purple group-hover:text-white transition-colors">
                    <MapPin size={20} />
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-white block">{t("profile.storeLocation")}</span>
                    <span className="text-[10px] text-white/70 font-bold">{t("profile.storeLocationHint")}</span>
                  </div>
                </div>
                <ChevronLeft size={18} className="text-white group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => openProfileSubPage("wallet")}
                className="w-full text-right welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 shadow-sm flex items-center justify-between hover:bg-white/10 transition-colors group"
                dir="rtl"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 border border-white/20 text-white/80 rounded-2xl group-hover:bg-vibrant-purple group-hover:text-white transition-colors">
                    <Wallet size={20} />
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-white block">{t("profile.walletFinance")}</span>
                    <span className="text-[10px] text-white/70 font-bold">{t("profile.walletFinanceHint")}</span>
                  </div>
                </div>
                <ChevronLeft size={18} className="text-white group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => openProfileSubPage("verification")}
                className="w-full text-right welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 shadow-sm flex items-center justify-between hover:bg-white/10 transition-colors group"
                dir="rtl"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 border border-white/20 text-white/80 rounded-2xl group-hover:bg-sky-500 group-hover:text-white transition-colors">
                    <BadgeCheck size={20} />
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-white flex items-center gap-1.5">
                      {t("profile.verification.title")}
                      {isStoreVerified(currentMerchant) && (
                        <VerifiedBadge size={14} className="shrink-0" />
                      )}
                    </span>
                    <span className="text-[10px] text-white/70 font-bold">
                      {isStoreVerified(currentMerchant)
                        ? currentMerchant.verificationType === 'lifetime' || currentMerchant.verificationExpiresAt === 'Lifetime'
                          ? t("profile.verification.lifetimeActive")
                          : t("profile.verification.activeUntil", { date: currentMerchant.verificationExpiresAt || '—' })
                        : t("profile.verification.activateHint")}
                    </span>
                  </div>
                </div>
                <ChevronLeft size={18} className="text-white group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => { setShowPasswordChange(true); setPwStep(1); }}
                className="w-full text-right welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 shadow-sm flex items-center justify-between hover:bg-white/10 transition-colors group"
                dir="rtl"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 border border-white/20 text-white/80 rounded-2xl group-hover:bg-vibrant-purple group-hover:text-white transition-colors">
                    <Shield size={20} />
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-white block">{t("profile.changePassword")}</span>
                    <span className="text-[10px] text-white/70 font-bold">{t("profile.passwordHint")}</span>
                  </div>
                </div>
                <ChevronLeft size={18} className="text-white group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => setShowQRMenu(true)}
                className="w-full text-right welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 shadow-sm flex items-center justify-between hover:bg-white/10 transition-colors group"
                dir="rtl"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 border border-white/20 text-white/80 rounded-2xl group-hover:bg-vibrant-purple group-hover:text-white transition-colors">
                    <Camera size={20} />
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-white block">{t("profile.qr")}</span>
                    <span className="text-[10px] text-white/70 font-bold">{t("profile.qrHint")}</span>
                  </div>
                </div>
                <ChevronLeft size={18} className="text-white group-hover:translate-x-1 transition-transform" />
              </button>

              <a
                href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-right welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 shadow-sm flex items-center justify-between hover:bg-white/10 transition-colors group"
                dir="rtl"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 border border-white/20 text-white/80 rounded-2xl group-hover:bg-vibrant-purple group-hover:text-white transition-colors">
                    <MessageCircle size={20} />
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-white block">{t("profile.support")}</span>
                    <span className="text-[10px] text-white/70 font-bold">{t("profile.supportHint")}</span>
                  </div>
                </div>
                <ChevronLeft size={18} className="text-white group-hover:translate-x-1 transition-transform" />
              </a>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAboutUs(true);
                }}
                className="w-full text-right welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 shadow-sm flex items-center justify-between hover:bg-white/10 transition-colors group"
                dir="rtl"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 border border-white/20 text-white/80 rounded-2xl group-hover:bg-vibrant-purple group-hover:text-white transition-colors">
                    <StoreIcon size={20} />
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-white block">{t("profile.about")}</span>
                    <span className="text-[10px] text-white/70 font-bold">{t("profile.aboutHint")}</span>
                  </div>
                </div>
                <ChevronLeft size={18} className="text-white group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPrivacyPolicy(true);
                }}
                className="w-full text-right welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 shadow-sm flex items-center justify-between hover:bg-white/10 transition-colors group"
                dir="rtl"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 border border-white/20 text-white/80 rounded-2xl group-hover:bg-vibrant-purple group-hover:text-white transition-colors">
                    <FileText size={20} />
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-white block">{t("profile.privacy")}</span>
                    <span className="text-[10px] text-white/70 font-bold">{t("profile.privacyHint")}</span>
                  </div>
                </div>
                <ChevronLeft size={18} className="text-white group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => openProfileSubPage("settings")}
                className="w-full text-right welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 shadow-sm flex items-center justify-between hover:bg-white/10 transition-colors group"
                dir="rtl"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 border border-white/20 text-white/80 rounded-2xl group-hover:bg-vibrant-purple group-hover:text-white transition-colors">
                    <Settings size={20} />
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-white block">{t("profile.accountSettings")}</span>
                    <span className="text-[10px] text-white/70 font-bold">{t("profile.accountSettingsHint")}</span>
                  </div>
                </div>
                <ChevronLeft size={18} className="text-white group-hover:translate-x-1 transition-transform" />
              </button>
              </div>

              <div className="pt-2 space-y-3">
                <button
                  onClick={handleLogout}
                  className="w-full py-5 bg-rose-500/10 text-rose-200 rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 border border-rose-400/30 backdrop-blur-md hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all shadow-sm active:scale-95"
                >
                  <LogOut size={20} />
                  <span>{t("merchant.common.logoutFull")}</span>
                </button>
              </div>
              </>
              )}

              {profileSubPage === "storeInfo" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md p-5 rounded-[2rem] shadow-2xl relative overflow-hidden text-white">
                    <div className="absolute inset-0 bg-gradient-to-l from-vibrant-purple/15 to-transparent pointer-events-none" />
                    <div className="relative z-10 flex items-center gap-3">
                      <span className="welcome-icon-pulse p-2 bg-white/15 border border-white/25 rounded-xl">
                        <User className="text-[#fff700]" size={20} />
                      </span>
                      <div>
                        <h2 className="text-lg font-black text-white">{t("profile.storeInfo")}</h2>
                        <p className="text-[10px] text-white/70 font-bold">{t("merchant.profileForm.storeInfoSubtitle")}</p>
                      </div>
                    </div>
                  </div>

                  <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 sm:p-6 space-y-4 text-white shadow-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-white/80 mb-1">{t("merchant.profileForm.ownerName")}</label>
                        <input
                          type="text"
                          value={profileForm.ownerName}
                          onChange={(e) => handleProfileFormChange({ ownerName: e.target.value })}
                          className="w-full bg-white/5 border border-white/20 p-2.5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-vibrant-purple/40 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-white/80 mb-1">{t("merchant.profileForm.shopName")}</label>
                        <input
                          type="text"
                          value={profileForm.shopName}
                          onChange={(e) => handleProfileFormChange({ shopName: e.target.value })}
                          className="w-full bg-white/5 border border-white/20 p-2.5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-vibrant-purple/40 outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-white/80 mb-1">{t("merchant.profileForm.category")}</label>
                        <select
                          value={profileForm.category}
                          onChange={(e) => handleProfileFormChange({ category: e.target.value })}
                          className="welcome-select welcome-select--sm"
                        >
                          {STORE_CATEGORIES.map((c) => (
                            <option key={c.id} value={c.id}>{getStoreCategoryFullLabel(c.id)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-white/80 mb-1">{t("merchant.profileForm.phone")}</label>
                        <input
                          type="tel"
                          value={currentMerchant.phone}
                          disabled
                          className="w-full bg-white/5 border border-white/15 p-2.5 rounded-2xl text-sm text-white/50 font-mono mb-2"
                        />
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={profileForm.showPhone} onChange={(e) => handleProfileFormChange({ showPhone: e.target.checked })} className="rounded text-vibrant-purple focus:ring-vibrant-purple" />
                          <span className="text-xs text-white/70">{t("merchant.common.showToCustomer")}</span>
                        </label>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-white/80 mb-1">{t("merchant.profileForm.username")}</label>
                        <input
                          type="text"
                          value={profileForm.username}
                          onChange={(e) => handleProfileFormChange({ username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "") })}
                          className="w-full bg-white/5 border border-white/20 p-2.5 rounded-2xl text-sm font-mono text-white focus:ring-2 focus:ring-vibrant-purple/40 outline-none"
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div className="max-w-[120px] mx-auto">
                      <ImageUploader
                        value={profileForm.logo}
                        onChange={(url) => handleProfileFormChange({ logo: url })}
                        label={t("merchant.profileForm.logoOptional")}
                        labelClassName="block text-xs font-black text-white mb-1"
                      />
                    </div>
                    <button
                      onClick={() => void handleSaveProfile("storeInfo")}
                      disabled={isSavingProfile}
                      className="w-full py-3 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white font-bold rounded-2xl shadow-brand-glow flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-70"
                    >
                      {isSavingProfile ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                      <span>{isSavingProfile ? t("merchant.common.saving") : t("merchant.common.saveChanges")}</span>
                    </button>
                  </div>
                </div>
              )}

              {profileSubPage === "location" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md p-5 rounded-[2rem] shadow-2xl relative overflow-hidden text-white">
                    <div className="absolute inset-0 bg-gradient-to-l from-emerald-500/15 to-transparent pointer-events-none" />
                    <div className="relative z-10 flex items-center gap-3">
                      <span className="welcome-icon-pulse p-2 bg-white/15 border border-white/25 rounded-xl">
                        <MapPin className="text-[#fff700]" size={20} />
                      </span>
                      <div>
                        <h2 className="text-lg font-black text-white">{t("profile.storeLocation")}</h2>
                        <p className="text-[10px] text-white/70 font-bold">{t("merchant.profileForm.locationSubtitle")}</p>
                      </div>
                    </div>
                  </div>

                  <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 sm:p-6 space-y-4 text-white shadow-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-white/80 mb-1">{t("merchant.profileForm.province")}</label>
                        <select
                          value={profileForm.province}
                          onChange={(e) => handleProfileFormChange({ province: e.target.value })}
                          className="welcome-select welcome-select--sm"
                        >
                          {provinces.map((p) => (
                            <option key={p.id} value={p.name}>{getProvinceLabel(p)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-white/80 mb-1">{t("merchant.profileForm.area")}</label>
                        <input
                          type="text"
                          value={profileForm.area}
                          onChange={(e) => handleProfileFormChange({ area: e.target.value })}
                          className="w-full bg-white/5 border border-white/20 p-2.5 rounded-2xl text-sm text-white mb-2 focus:ring-2 focus:ring-vibrant-purple/40 outline-none"
                        />
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={profileForm.showArea} onChange={(e) => handleProfileFormChange({ showArea: e.target.checked })} className="rounded text-vibrant-purple focus:ring-vibrant-purple" />
                          <span className="text-xs text-white/70">{t("merchant.common.showToCustomer")}</span>
                        </label>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-white/80 mb-1">{t("merchant.profileForm.landmark")}</label>
                        <input
                          type="text"
                          value={profileForm.landmark}
                          onChange={(e) => handleProfileFormChange({ landmark: e.target.value })}
                          className="w-full bg-white/5 border border-white/20 p-2.5 rounded-2xl text-sm text-white mb-2 focus:ring-2 focus:ring-vibrant-purple/40 outline-none"
                        />
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={profileForm.showLandmark} onChange={(e) => handleProfileFormChange({ showLandmark: e.target.checked })} className="rounded text-vibrant-purple focus:ring-vibrant-purple" />
                          <span className="text-xs text-white/70">{t("merchant.common.showToCustomer")}</span>
                        </label>
                      </div>
                      <div className="md:col-span-2 mt-2">
                        <MerchantLocationPicker
                          onLocationSelect={(lat, lng) => handleProfileFormChange({ lat, lng })}
                          initialLat={profileForm.lat}
                          initialLng={profileForm.lng}
                          label={t("merchant.profileForm.mapPickerLabel")}
                          height="h-48"
                          required={true}
                        />
                        <label className="flex items-center gap-2 cursor-pointer mt-2">
                          <input type="checkbox" checked={profileForm.showMap} onChange={(e) => handleProfileFormChange({ showMap: e.target.checked })} className="rounded text-vibrant-purple focus:ring-vibrant-purple" />
                          <span className="text-xs text-white/70">{t("merchant.common.showToCustomer")}</span>
                        </label>
                      </div>
                    </div>
                    <button
                      onClick={() => void handleSaveProfile("location")}
                      disabled={isSavingProfile}
                      className="w-full py-3 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white font-bold rounded-2xl shadow-brand-glow flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-70"
                    >
                      {isSavingProfile ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                      <span>{isSavingProfile ? t("merchant.common.saving") : t("merchant.common.saveChanges")}</span>
                    </button>
                  </div>
                </div>
              )}

              {profileSubPage === "wallet" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md p-5 rounded-[2rem] shadow-2xl relative overflow-hidden text-white">
                    <div className="absolute inset-0 bg-gradient-to-l from-sky-500/15 to-transparent pointer-events-none" />
                    <div className="relative z-10 flex items-center gap-3">
                      <span className="welcome-icon-pulse p-2 bg-white/15 border border-white/25 rounded-xl">
                        <Wallet className="text-[#fff700]" size={20} />
                      </span>
                      <div>
                        <h2 className="text-lg font-black text-white">{t("profile.walletFinance")}</h2>
                        <p className="text-[10px] text-white/70 font-bold">{t("merchant.profileForm.walletSubtitle")}</p>
                      </div>
                    </div>
                  </div>
                  <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-4 shadow-lg text-white">
                    <Suspense fallback={<DashboardChunkFallback label={t("merchant.common.loadingWallet")} />}>
                      <MerchantWallet
                        currentMerchant={currentMerchant as Store}
                        payoutRequests={payoutRequests}
                        requestPayout={requestPayout}
                        updateStoreProfile={updateStoreProfile}
                      />
                    </Suspense>
                  </div>
                </div>
              )}

              {profileSubPage === "verification" && (
                <MerchantVerificationPage
                  store={currentMerchant as Store}
                  adminSettings={adminSettings as Record<string, unknown>}
                  supportWhatsApp={resolveSupportWhatsApp(adminSettings?.whatsappNumber)}
                />
              )}

              {profileSubPage === "settings" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md p-5 rounded-[2rem] shadow-2xl relative overflow-hidden text-white">
                    <div className="absolute inset-0 bg-gradient-to-l from-vibrant-purple/15 to-transparent pointer-events-none" />
                    <div className="relative z-10 flex items-center gap-3">
                      <span className="welcome-icon-pulse p-2 bg-white/15 border border-white/25 rounded-xl">
                        <Settings className="text-[#fff700]" size={20} />
                      </span>
                      <div>
                        <h2 className="text-lg font-black text-white">{t("profile.accountSettings")}</h2>
                        <p className="text-[10px] text-white/70 font-bold">{t("profile.accountSettingsHint")}</p>
                      </div>
                    </div>
                  </div>

                  <div className="welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-[2rem] p-5 shadow-sm" dir="rtl">
                    <LanguageSwitcher variant="row" />
                  </div>

                  <DeleteAccountSection
                    variant="glass"
                    accountLabel={t("merchant.common.merchantAccount", { name: currentMerchant?.name || currentMerchant?.shopName || "" })}
                    onConfirmDelete={() => deleteUserAccountSecure("merchant")}
                  />
                </div>
              )}

              </div>
            </div>
          )}
        </main>

        {/* Modal: طلب مشاركة في الفعالية */}
        {joinFlashSaleData && (
          <div className="fixed inset-0 bg-deep-navy/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in text-white">
              <div className="flex justify-between items-center mb-4 pb-3 border-b">
                <h3 className="font-black text-violet flex items-center gap-2">
                  <Zap size={18} className="text-yellow-500" /> {t("merchant.flashSales.joinModal.title")}
                </h3>
                <button onClick={() => setJoinFlashSaleData(null)}>
                  <X size={20} className="text-slate-400 hover:text-vibrant-purple" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (isJoiningFlashSale) return;
                  const matchedProduct = merchantProducts.find(
                    (p) => p.id === joinProductId,
                  );
                  if (!matchedProduct) return;

                  const promPrice = parseInt(joinPromotionalPrice);
                  if (!promPrice || promPrice >= matchedProduct.price) {
                    alert(t("merchant.flashSales.joinModal.promoPriceInvalid"));
                    return;
                  }

                  setIsJoiningFlashSale(true);
                  try {
                    await requestJoinFlashSale({
                      flashSaleId: joinFlashSaleData.flashSaleId,
                      storeId: currentMerchant.id,
                      productId: matchedProduct.id,
                      promotionalPrice: promPrice,
                      status: "pending",
                    });
                    showToast("success", t("merchant.flashSales.joinSuccessTitle"), t("merchant.flashSales.joinSuccessBody"));
                    setJoinFlashSaleData(null);
                    setJoinProductId("");
                    setJoinPromotionalPrice("");
                  } catch (err: unknown) {
                    const message =
                      err instanceof Error && err.message && !err.message.startsWith('{')
                        ? err.message
                        : t("merchant.flashSales.joinFailedBody");
                    showToast("error", t("merchant.flashSales.joinFailedTitle"), message);
                  } finally {
                    setIsJoiningFlashSale(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t("merchant.flashSales.pickProduct")}
                  </label>
                  {merchantProducts.length === 0 ? (
                    <div className="text-red-500 text-xs font-bold p-2 bg-red-50 rounded">
                      {t("merchant.flashSales.joinModal.noProducts")}
                    </div>
                  ) : (
                    <select
                      required
                      value={joinProductId}
                      onChange={(e) => {
                        setJoinProductId(e.target.value);
                        setJoinPromotionalPrice(""); // reset price
                      }}
                      className="welcome-select welcome-select--lg"
                    >
                      <option value="" disabled>
                        {t("merchant.flashSales.joinModal.selectProduct")}
                      </option>
                      {merchantProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({t("merchant.flashSales.joinModal.originalPrice", { price: p.price })})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {joinProductId && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      {t("merchant.flashSales.joinModal.promoPriceLabel")}
                    </label>
                    <input
                      type="number"
                      required
                      value={joinPromotionalPrice}
                      onChange={(e) => setJoinPromotionalPrice(e.target.value)}
                      placeholder={t("merchant.flashSales.joinModal.promoPricePlaceholder")}
                      className="w-full border border-slate-200 p-3 rounded-2xl text-sm font-bold text-rose-600 outline-none focus:ring-2 focus:ring-slate-500"
                    />
                    {merchantProducts.find((p) => p.id === joinProductId) &&
                      parseInt(joinPromotionalPrice) >=
                        merchantProducts.find((p) => p.id === joinProductId)!
                          .price && (
                        <p className="text-[10px] text-red-500 mt-1 font-bold">
                          {t("merchant.flashSales.joinModal.promoPriceTooHigh")}
                        </p>
                      )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    isJoiningFlashSale ||
                    !joinProductId ||
                    merchantProducts.length === 0 ||
                    !joinPromotionalPrice ||
                    parseInt(joinPromotionalPrice) >=
                      (merchantProducts.find((p) => p.id === joinProductId)
                        ?.price || 0)
                  }
                  className="w-full py-3 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white font-bold rounded-2xl shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {isJoiningFlashSale ? t("merchant.common.sending") : t("merchant.flashSales.joinModal.submitBtn")}
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
                className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl relative text-white"
              >
                <div className="p-6">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-center text-violet mb-2">
                    {t("merchant.products.deleteConfirm.title")}
                  </h3>
                  <p className="text-center text-sm text-slate-600 mb-6 font-bold leading-relaxed">
                    {t("merchant.products.deleteConfirm.body", { name: deleteConfirm.name })}
                    <br />
                    <span className="text-red-500 text-xs">
                      {t("merchant.products.deleteConfirm.irrevocable")}
                    </span>
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={executeDeleteProduct}
                      disabled={isDeletingProduct}
                      className="flex-1 py-3 bg-red-600 text-white font-black rounded-2xl shadow-lg hover:bg-red-700 transition disabled:opacity-70"
                    >
                      {isDeletingProduct ? t("merchant.products.deleteConfirm.deleting") : t("merchant.products.deleteConfirm.confirmBtn")}
                    </button>
                    <button
                      onClick={() =>
                        setDeleteConfirm({ show: false, id: "", name: "" })
                      }
                      className="flex-1 py-3 bg-slate-100 text-slate-700 font-black rounded-2xl hover:bg-slate-200 transition"
                    >
                      {t("common.cancel")}
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
                className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl relative text-right text-white"
                dir="rtl"
              >
                <div className="p-6">
                  <div className={`w-16 h-16 ${blockConfirm.isBlocked ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-center text-violet mb-2">
                    {blockConfirm.isBlocked ? t("merchant.confirms.block.unblockTitle") : t("merchant.confirms.block.blockTitle")}
                  </h3>
                  <p className="text-center text-sm text-slate-600 mb-6 font-bold leading-relaxed font-sans">
                    {blockConfirm.isBlocked 
                      ? t("merchant.confirms.block.unblockBody", { name: blockConfirm.name })
                      : t("merchant.confirms.block.blockBody", { name: blockConfirm.name })}
                    <br />
                    <span className="text-slate-400 text-xs font-normal block mt-1">
                      {blockConfirm.isBlocked 
                        ? t("merchant.confirms.block.unblockEffect")
                        : t("merchant.confirms.block.blockEffect")}
                    </span>
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const ok = await setStoreCustomerBlock(
                            currentMerchant!.id,
                            blockConfirm.customerId,
                            !blockConfirm.isBlocked,
                          );
                          if (!ok) {
                            alert(t("merchant.confirms.block.updateFailed"));
                            return;
                          }
                          alert(blockConfirm.isBlocked ? t("merchant.confirms.block.unblockSuccess") : t("merchant.confirms.block.blockSuccess"));
                        } catch (err) {
                          alert(t("merchant.confirms.block.updateError"));
                        } finally {
                          setBlockConfirm({ show: false, customerId: "", name: "", isBlocked: false });
                        }
                      }}
                      className={`flex-1 py-3 ${blockConfirm.isBlocked ? 'bg-emerald-600 hover:bg-emerald-700 animate-pulse' : 'bg-red-600 hover:bg-red-700'} text-white font-black rounded-2xl shadow-lg transition`}
                    >
                      {blockConfirm.isBlocked ? t("merchant.confirms.block.confirmUnblock") : t("merchant.confirms.block.confirmBlock")}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setBlockConfirm({ show: false, customerId: "", name: "", isBlocked: false })
                      }
                      className="flex-1 py-3 bg-slate-100 text-slate-700 font-black rounded-2xl hover:bg-slate-200 transition"
                    >
                      {t("common.cancel")}
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
            <div className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow rounded-[2.5rem] w-full max-w-lg p-6 sm:p-8 shadow-2xl h-[90vh] overflow-y-auto animate-scale-in text-right text-white">
              {/* رأس المودال الإحترافي */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-violet flex items-center gap-2">
                    <span className="w-2.5 h-6 bg-vibrant-purple rounded-full block"></span>
                    {prodModal.mode === "add" ? t("merchant.products.form.addTitle") : t("merchant.products.form.editTitle")}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">
                    {t("merchant.products.form.subtitle")}
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
                  <span className="text-xs font-black text-slate-500 mb-1">{t("merchant.products.form.mainImage")}</span>
                  <div className="w-full max-w-[200px] mx-auto bg-white rounded-2xl p-2 shadow-xs flex flex-col items-center">
                    <ImageUploader
                      value={prodImage}
                      onChange={setProdImage}
                      label={t("merchant.products.form.addImageLabel")}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowBgRemoverModal(true);
                      }}
                      className="mt-2.5 py-2 px-3 bg-violet-50 hover:bg-violet-100 border border-violet-100 text-violet hover:text-violet-900 text-[10px] font-black rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs w-full"
                    >
                      <Sparkles size={12} className="animate-pulse text-vibrant-purple" />
                      <span>{t("merchant.products.form.bgRemoverBtn")}</span>
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold text-center">
                    {t("merchant.products.form.imageTip")}
                  </p>
                </div>

                {/* 2. اسم المنتج وسعر المنتج للزبون في شبكة مرنة */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-755 mb-2 mr-1">
                      {t("merchant.products.form.name")}
                    </label>
                    <input
                      type="text"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      required
                      placeholder={t("merchant.products.form.namePlaceholder")}
                      className="w-full border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-bold text-violet focus:bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-755 mb-2 mr-1">
                      {t("merchant.products.form.price")}
                    </label>
                    <input
                      type="number"
                      value={prodPrice || ""}
                      onChange={(e) => setProdPrice(parseInt(e.target.value) || 0)}
                      required
                      placeholder={t("merchant.products.form.pricePlaceholder")}
                      className="w-full border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-black text-violet focus:bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all shadow-xs"
                    />
                  </div>
                </div>

                {/* 3. الوصف */}
                <div>
                  <label className="block text-xs font-black text-slate-755 mb-2 mr-1">
                    {t("merchant.products.form.description")}
                  </label>
                  <textarea
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    placeholder={t("merchant.products.form.descriptionPlaceholder")}
                    className="w-full border border-slate-200 p-4 rounded-2xl text-sm font-medium text-slate-700 h-24 focus:bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all shadow-xs leading-relaxed"
                  />
                </div>

                {/* 4. الحقول الإضافية المفتاحية */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* الباركود */}
                  <div>
                    <label className="block text-xs font-black text-slate-755 mb-2 mr-1">
                      {t("merchant.products.form.barcode")}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={prodBarcode}
                        onChange={(e) => setProdBarcode(e.target.value)}
                        placeholder={t("merchant.products.form.barcodePlaceholder")}
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
                        title={t("merchant.products.form.barcodeScannerTitle")}
                      >
                        <Camera size={18} />
                      </button>
                    </div>
                  </div>

                  {/* الكمية المتوفرة (اختياري) */}
                  <div>
                    <label className="block text-xs font-black text-slate-755 mb-2 mr-1">
                      {t("merchant.products.form.inventory")}
                    </label>
                    <input
                      type="number"
                      value={prodInventory}
                      onChange={(e) => {
                        const v = e.target.value;
                        setProdInventory(v === "" ? "" : parseInt(v) || 0);
                      }}
                      className="w-full border border-slate-200 px-4 py-3 rounded-2xl text-sm font-black text-violet focus:ring-2 focus:ring-slate-500 outline-none focus:border-slate-500 shadow-xs"
                      placeholder={t("merchant.products.form.inventoryPlaceholder")}
                    />
                    <span className="text-[9px] text-emerald-600 font-bold block mt-1 mr-1">
                      {t("merchant.products.form.inventoryHint")}
                    </span>
                  </div>
                </div>

                {/* عرض خاص */}
                <div>
                  <label className="block text-xs font-black text-slate-755 mb-2 mr-1">
                    {t("merchant.products.form.specialOffer")}
                  </label>
                  <input
                    type="text"
                    value={prodSpecialOffer}
                    onChange={(e) => setProdSpecialOffer(e.target.value)}
                    placeholder={t("merchant.products.form.specialOfferPlaceholder")}
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
                    {prodIsFreeDelivery ? t("merchant.products.form.freeDeliveryOn") : t("merchant.products.form.freeDeliveryOff")}
                  </button>
                </div>

                {/* الكلمات المفتاحية والخصومات المتقدمة */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* الخصومات */}
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between gap-2 shadow-xs">
                    <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5 mb-1">
                      <Ticket size={14} className="text-violet" /> {t("merchant.products.form.discountSection")}
                    </h4>
                    <select
                      value={prodDiscountType}
                      onChange={(e) => {
                        setProdDiscountType(e.target.value as any);
                        setProdDiscountValue(0);
                      }}
                      className="welcome-select welcome-select--sm"
                    >
                      <option value="none">{t("merchant.products.form.discountNone")}</option>
                      <option value="percent">{t("merchant.products.form.discountPercent")}</option>
                      <option value="amount">{t("merchant.products.form.discountAmount")}</option>
                    </select>
                    {prodDiscountType !== "none" && (
                      <input
                        type="number"
                        value={prodDiscountValue || ""}
                        onChange={(e) => setProdDiscountValue(parseInt(e.target.value) || 0)}
                        placeholder={prodDiscountType === "percent" ? t("merchant.products.form.discountPercentPlaceholder") : t("merchant.products.form.discountAmountPlaceholder")}
                        className="w-full border border-slate-200 p-2.5 rounded-2xl text-xs font-black text-slate-700 outline-none"
                      />
                    )}
                  </div>

                  {/* تصنيف وكلمات مفتاحية */}
                  {availableTags.length > 0 && (
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-2 shadow-xs">
                      <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                        <span className="w-1.5 h-3 bg-slate-600 rounded-full"></span> {t("merchant.products.form.tagsSection")}
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
                                ? "bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white"
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
                      <span className="text-xs font-black text-on-brand">{t("merchant.products.form.extraInfo")}</span>
                      <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{t("common.optional")}</span>
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
                          <label className="block text-[11px] font-bold text-slate-600 mb-1.5">{t("merchant.products.form.color")}</label>
                          <input
                            type="text"
                            value={prodColor}
                            onChange={(e) => setProdColor(e.target.value)}
                            placeholder={t("merchant.products.form.colorPlaceholder")}
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
                          <label className="block text-[11px] font-bold text-slate-600 mb-1.5">{t("merchant.products.form.size")}</label>
                          <input
                            type="text"
                            value={prodSize}
                            onChange={(e) => setProdSize(e.target.value)}
                            placeholder={t("merchant.products.form.sizePlaceholder")}
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
                        <label className="block text-[11px] font-black text-slate-700 mb-2">{t("merchant.products.form.dimensions")}</label>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block mb-1">{t("merchant.products.form.length")}</span>
                            <input
                              type="text"
                              value={prodLength}
                              onChange={(e) => setProdLength(e.target.value)}
                              placeholder={t("merchant.products.form.lengthPlaceholder")}
                              className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-right outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block mb-1">{t("merchant.products.form.width")}</span>
                            <input
                              type="text"
                              value={prodWidth}
                              onChange={(e) => setProdWidth(e.target.value)}
                              placeholder={t("merchant.products.form.widthPlaceholder")}
                              className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-right outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block mb-1">{t("merchant.products.form.weight")}</span>
                            <input
                              type="text"
                              value={prodWeight}
                              onChange={(e) => setProdWeight(e.target.value)}
                              placeholder={t("merchant.products.form.weightPlaceholder")}
                              className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-right outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* الماركة، الضمان، حالة المنتج */}
                      <div className="border-t border-slate-100 pt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">{t("merchant.products.form.brand")}</label>
                            <input
                              type="text"
                              value={prodBrand}
                              onChange={(e) => setProdBrand(e.target.value)}
                              placeholder={t("merchant.products.form.brandPlaceholder")}
                              className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-violet outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">{t("merchant.products.form.warranty")}</label>
                            <input
                              type="text"
                              value={prodWarranty}
                              onChange={(e) => setProdWarranty(e.target.value)}
                              placeholder={t("merchant.products.form.warrantyPlaceholder")}
                              className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-violet outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">{t("merchant.products.form.condition")}</label>
                          <input
                            type="text"
                            value={prodCondition}
                            onChange={(e) => setProdCondition(e.target.value)}
                            placeholder={t("merchant.products.form.conditionPlaceholder")}
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
                    disabled={isSavingProduct}
                    className="w-full py-4 px-6 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white font-black text-sm rounded-2xl shadow-lg shadow-slate-100 hover:shadow-xl hover:shadow-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    <span>{isSavingProduct ? t("merchant.common.saving") : t("merchant.products.form.savePublish")}</span>
                  </button>
                  <button
                    type="submit"
                    onClick={() => setProdStatus("draft")}
                    disabled={isSavingProduct}
                    className="w-full py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    <span>{isSavingProduct ? t("merchant.common.saving") : t("merchant.products.form.saveDraft")}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Bulk Edit */}
        {showBulkEditModal && (
          <div className="fixed inset-0 bg-deep-navy/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-scale-in text-right text-white">
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
                    disabled={isBulkUpdating}
                    className="flex-1 py-4 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white font-black rounded-2xl shadow-xl shadow-slate-100 active:scale-95 transition-all cursor-pointer disabled:opacity-70"
                  >
                    {isBulkUpdating ? 'جاري التحديث...' : 'تحديث المنتجات المختارة'}
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
            <div className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-fade-in relative text-white">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                <h3 className="font-black text-violet flex items-center gap-2">
                  <Camera size={18} />{" "}
                  {scannerMode === "order"
                    ? t("merchant.orders.scanOrderTitle")
                    : scannerMode === "search"
                      ? "بحث بالباركود"
                      : "الجرد الذكي"}
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
                  {scannerMode === "order" ? (
                    t("merchant.orders.scanOrderHint")
                  ) : (
                    <>
                      وجه الكاميرا نحو باركود المنتج
                      <br />
                      {scannerMode === "search"
                        ? "سيتم كتابة الباركود في شريط البحث للعثور عليه"
                        : "سيتم فتح صفحة المنتج تلقائياً للتعديل"}
                    </>
                  )}
                </p>
                {scannerMode === "order" && (
                  <>
                    <button
                      type="button"
                      disabled={isScanningOrderFile}
                      onClick={() => orderGalleryInputRef.current?.click()}
                      className="mt-4 w-full py-3 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-black rounded-2xl flex items-center justify-center gap-2 text-xs transition active:scale-95 disabled:opacity-60"
                    >
                      <ImageIcon size={16} />
                      <span>{t("merchant.orders.scanOrderFromGallery")}</span>
                    </button>
                    <input
                      ref={orderGalleryInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        void handleScanOrderFromGallery(e.target.files?.[0]);
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        )}


        {/* Modal: إجراءات الطلب (رفض/إرجاع/استبدال) */}
        {actionModal.show && (
          <div className="fixed inset-0 bg-deep-navy/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden text-right p-8 text-white"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-violet">
                  {actionModal.type === "rejected"
                    ? t("merchant.orders.actionModal.rejectTitle")
                    : actionModal.type === "returned"
                      ? t("merchant.orders.actionModal.returnTitle")
                      : t("merchant.orders.actionModal.replaceTitle")}
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
                  {t("merchant.orders.actionModal.pickReason")}
                </p>

                {actionModal.type === "rejected"
                  ? (["outOfStock", "outOfCoverage", "priceError", "phoneUnavailable"] as const).map((key) => {
                      const r = t(`merchant.orders.actionModal.rejectReasons.${key}`);
                      return (
                      <button
                        key={key}
                        onClick={() => {
                          void runOrderStatusUpdate(actionModal.orderId, "rejected", r);
                          setActionModal({ ...actionModal, show: false });
                        }}
                        disabled={updatingOrderId === actionModal.orderId}
                        className="w-full p-3 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-2xl text-right font-black text-xs transition-all"
                      >
                        {r}
                      </button>
                    );})
                  : (actionModal.type === "returned"
                        ? (["defective", "unconvinced", "sizeColor", "deliveryDelay"] as const)
                        : (["sizeColor", "defective", "differentImage"] as const)
                    ).map((key) => {
                      const reasonNs = actionModal.type === "returned" ? "returnReasons" : "replaceReasons";
                      const r = t(`merchant.orders.actionModal.${reasonNs}.${key}`);
                      return (
                      <button
                        key={key}
                        onClick={() => {
                          void runOrderStatusUpdate(
                            actionModal.orderId,
                            actionModal.type,
                            r,
                          );
                          setActionModal({ ...actionModal, show: false });
                        }}
                        disabled={updatingOrderId === actionModal.orderId}
                        className="w-full p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-vibrant-purple rounded-2xl text-right font-black text-[10px] transition-all border border-slate-50 disabled:opacity-60"
                      >
                        {r}
                      </button>
                    );})}

                <div className="pt-4 border-t border-slate-100 mt-2">
                  <p className="text-[10px] font-black text-slate-400 mb-2">
                    {t("merchant.orders.actionModal.customReason")}
                  </p>
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder={t("merchant.orders.actionModal.customReasonPlaceholder")}
                    className="w-full bg-slate-50 border border-slate-100 p-3 rounded-2xl text-xs font-bold outline-none focus:ring-1 focus:ring-slate-500 min-h-[80px]"
                  />
                  <button
                    disabled={!customReason.trim() || updatingOrderId === actionModal.orderId}
                    onClick={() => {
                      void runOrderStatusUpdate(
                        actionModal.orderId,
                        actionModal.type,
                        customReason.trim(),
                      );
                      setActionModal({ ...actionModal, show: false });
                      setCustomReason("");
                    }}
                    className="w-full mt-3 py-3 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white rounded-xl font-black text-xs disabled:opacity-50 shadow-lg shadow-slate-100"
                  >
                    {updatingOrderId === actionModal.orderId ? t("merchant.common.updating") : t("merchant.orders.actionModal.confirmAction")}
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
              className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden text-right flex flex-col max-h-[85vh] text-white"
            >
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <h3 className="text-xl font-black text-violet">{t("merchant.orders.replacementModal.title")}</h3>
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
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">{t("merchant.orders.replacementModal.originalItems")}</p>
                  <div className="flex flex-wrap gap-2">
                    {replacementModal.originalItems.map((item, idx) => {
                      const originalProduct = products.find(p => p.id === item.productId);
                      return (
                        <button
                          key={idx}
                          onClick={() => originalProduct && setReplacementProduct(originalProduct)}
                          className={`px-4 py-2 rounded-xl border text-[11px] font-black transition-all flex items-center gap-2 ${
                            replacementProduct?.id === item.productId
                              ? 'bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white shadow-lg'
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
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">{t("merchant.orders.replacementModal.searchReplacement")}</p>
                  <div className="relative">
                    <input
                      type="text"
                      value={replacementSearch}
                      onChange={(e) => setReplacementSearch(e.target.value)}
                      placeholder={t("merchant.orders.replacementModal.searchPlaceholder")}
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
                      <p className="text-[10px] font-black text-emerald-700 uppercase">{t("merchant.orders.replacementModal.selectedReplacement")}</p>
                      <button 
                        onClick={() => setReplacementProduct(null)}
                        className="text-[10px] bg-white text-emerald-600 px-3 py-1 rounded-full font-black border border-emerald-100 shadow-sm"
                      >{t("merchant.orders.replacementModal.change")}</button>
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
                           <span className="text-[10px] font-bold text-slate-400 mr-2">{t("merchant.orders.replacementModal.qtyRequired")}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {!replacementProduct && (
                  <div className="py-12 text-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/50">
                    <Package size={40} className="mx-auto mb-3 opacity-20" />
                    <p className="text-xs font-bold px-8">{t("merchant.orders.replacementModal.searchHint")}</p>
                  </div>
                )}
              </div>

              <div className="p-8 pt-0 mt-auto bg-slate-50/30">
                <button
                  disabled={!replacementProduct || isConfirmingReplacement}
                  onClick={handleConfirmReplacement}
                  className="w-full py-4 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white rounded-2xl font-black text-sm disabled:opacity-30 disabled:grayscale transition-all shadow-xl shadow-slate-100 flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  {isConfirmingReplacement ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                  {isConfirmingReplacement ? t("merchant.orders.replacementModal.confirming") : t("merchant.orders.replacementModal.confirmBtn")}
                </button>
                <p className="text-[9px] text-center text-slate-400 mt-4 font-bold flex items-center justify-center gap-1">
                  <Shield size={10} />
                  {t("merchant.orders.replacementModal.footerNote")}
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
                className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 flex flex-col items-center gap-6 text-white"
              >
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 shadow-inner">
                  <AlertTriangle size={40} />
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-black text-violet">{t("merchant.orders.returnConfirm.title")}</h3>
                  <p className="text-xs font-bold text-slate-400">{t("merchant.orders.returnConfirm.body")}</p>
                </div>

                <div 
                  onClick={() => {
                    const newVal = !skipReturnConfirm;
                    setSkipReturnConfirm(newVal);
                    StorageService.save("SKIP_RETURN_CONFIRM", newVal);
                  }}
                  className="flex items-center gap-2 cursor-pointer group select-none"
                >
                   <div className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${skipReturnConfirm ? 'bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white' : 'bg-white border-slate-200 group-hover:border-slate-300'}`}>
                      {skipReturnConfirm && <Check size={14} className="text-white" />}
                   </div>
                   <span className="text-[11px] font-black text-slate-500">{t("merchant.orders.returnConfirm.skipConfirm")}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full">
                   <button
                     onClick={() => setReturnConfirmModal({ show: false, orderId: "" })}
                     className="py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs hover:bg-slate-200 transition-colors"
                   >{t("common.cancel")}</button>
                   <button
                     onClick={() => {
                       void runOrderStatusUpdate(returnConfirmModal.orderId, "returned", t("merchant.orders.returnByMerchant"));
                       setReturnConfirmModal({ show: false, orderId: "" });
                     }}
                     disabled={!!updatingOrderId}
                     className="py-3.5 bg-rose-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-rose-100 hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-70"
                   >{updatingOrderId ? t("merchant.common.updating") : t("merchant.orders.returnConfirm.confirmReturn")}</button>
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
                className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white"
              >
                {/* أزرار التحكم الفوقية */}
                <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                   <div className="flex gap-2">
                     <button
                        onClick={() => handleShareWhatsAppInvoice(selectedInvoice)}
                        className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg hover:bg-emerald-600 transition-all flex items-center gap-2 text-xs font-black"
                     >
                       <MessageCircle size={18} />
                       <span>{t("merchant.orders.invoice.whatsapp")}</span>
                     </button>
                     <button
                        onClick={handlePrint}
                        className="p-3 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white rounded-2xl shadow-lg transition-all flex items-center gap-2 text-xs font-black"
                     >
                       <Zap size={18} />
                       <span>{t("merchant.orders.invoice.print")}</span>
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
                    className="invoice-container keep-white p-10 print:p-2 bg-white min-h-[600px] text-right font-sans text-black"
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
                        <p className="text-xs font-bold text-slate-400 mt-1">{t("merchant.orders.invoice.favoriteStore")}</p>
                      </div>
                      <div className="text-left" dir="ltr">
                        <h1 className="text-4xl font-black text-slate-200 uppercase tracking-widest mb-4">INVOICE</h1>
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-slate-400 flex items-center justify-end gap-1">
                            <span>{t("merchant.orders.invoice.invoiceNumber")} </span>
                            <span className="text-violet">#{getOrderSeqId(selectedInvoice.id)}</span>
                            <CopyButton text={getOrderSeqId(selectedInvoice.id)} size={9} className="print:hidden" />
                          </div>
                          <p className="text-[10px] font-black text-slate-400">{t("merchant.orders.invoice.date")} <span className="text-violet">{formatSafeDateTimeString(selectedInvoice.createdAt, 'ar-IQ', { dateStyle: 'short', timeStyle: 'short' })}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Customer & Merchant Details */}
                    <div className="grid grid-cols-2 gap-8 mb-10">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-3 border-r-4 border-slate-500 pr-3">{t("merchant.orders.invoice.billTo")}</p>
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
                              onClick={() => openNativeMapApp((selectedInvoice as any).customerLat, (selectedInvoice as any).customerLng, 'google', t("merchant.orders.map.noCoordinates"))}
                              className="flex-1 py-3.5 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition print:hidden"
                            >
                              <span>{t("merchant.orders.invoice.openGoogleMaps")}</span>
                            </button>
                            <button
                              onClick={() => openNativeMapApp((selectedInvoice as any).customerLat, (selectedInvoice as any).customerLng, 'waze', t("merchant.orders.map.noCoordinates"))}
                              className="flex-1 py-3.5 bg-sky-500 hover:bg-sky-600 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition print:hidden"
                            >
                              <span>{t("merchant.orders.invoice.openWaze")}</span>
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-3 border-r-4 border-slate-200 pr-3">{t("merchant.orders.invoice.source")}</p>
                        <p className="text-sm font-black text-violet mb-1">{currentMerchant?.shopName || currentMerchant?.ownerName}</p>
                        <p className="text-xs font-bold text-slate-500 mb-1">{currentMerchant?.phone}</p>
                        <p className="text-xs font-bold text-slate-400">{currentMerchant?.province} - {currentMerchant?.area}</p>
                      </div>
                    </div>

                    {/* Items Table */}
                    <table className="w-full mb-10">
                      <thead>
                        <tr className="bg-slate-50 text-right">
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase rounded-r-2xl text-right">{t("merchant.orders.invoice.colProduct")}</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">{t("merchant.orders.invoice.colQty")}</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">{t("merchant.orders.invoice.colPrice")}</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-left rounded-l-2xl text-left">{t("merchant.orders.invoice.colTotal")}</th>
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
                          <span className="font-bold text-slate-400">{t("merchant.orders.invoice.productsPrice")}</span>
                          <span className="font-black text-slate-600">{(selectedInvoice.subtotal || 0).toLocaleString()} د.ع</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-400">{t("merchant.orders.invoice.deliveryPrice")}</span>
                          <span className="font-black text-slate-600">{(selectedInvoice.deliveryPrice || 0).toLocaleString()} د.ع</span>
                        </div>
                        {selectedInvoice.discountAmount > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-emerald-600">{t("merchant.orders.invoice.discountValue")}</span>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                                selectedInvoice.discountSponsor === 'ADMIN' 
                                  ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                                  : 'bg-purple-50 text-purple-600 border border-purple-100'
                              }`}>
                                {selectedInvoice.discountSponsor === 'ADMIN' ? t("merchant.orders.invoice.discountFromAdmin") : t("merchant.orders.invoice.discountFromStore")}
                              </span>
                            </div>
                            <span className="font-black text-emerald-600">- {selectedInvoice.discountAmount.toLocaleString()} د.ع</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center p-4 bg-vibrant-purple rounded-2xl text-white shadow-xl shadow-slate-100 mt-2">
                          <span className="text-xs font-black uppercase">{t("merchant.orders.invoice.grandTotal")}</span>
                          <span className="text-lg font-black">{(selectedInvoice.total || 0).toLocaleString()} د.ع</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Note */}
                    <div className="mt-16 text-center pt-8 border-t border-slate-100 flex flex-col items-center">
                      <p className="text-[10px] font-bold text-slate-400 italic mb-6">{t("merchant.orders.invoice.thankYou", { shopName: currentMerchant?.shopName || currentMerchant?.ownerName })}</p>
                      
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
                className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white"
                dir="rtl"
              >
                {/* Header */}
                <div className="px-3 py-3 bg-white/5 border-b border-white/15 flex items-center gap-1.5 shrink-0">
                  <div className="flex-1 grid grid-cols-3 gap-1.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => handlePrintShippingLabel()}
                      className="min-w-0 w-full justify-center bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white px-1 py-2 rounded-xl text-[8px] leading-tight font-black shadow-lg shadow-vibrant-purple/25 transition-all flex flex-col items-center gap-0.5 active:scale-[0.98] sm:flex-row sm:gap-1 sm:text-[9px]"
                    >
                      <Printer size={12} className="shrink-0" />
                      <span className="text-center whitespace-normal">{t("merchant.orders.shippingLabel.printLabel")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveShippingLabel()}
                      disabled={isSharingInvoice}
                      className="min-w-0 w-full justify-center bg-white/10 hover:bg-white/20 border border-white/30 text-white px-1 py-2 rounded-xl text-[8px] leading-tight font-black shadow-lg transition-all flex flex-col items-center gap-0.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait sm:flex-row sm:gap-1 sm:text-[9px]"
                    >
                      <Download size={12} className="shrink-0 text-[#fff700]" />
                      <span className="text-center whitespace-normal">{t("merchant.orders.shippingLabel.saveLabel")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWhatsAppShare(selectedInvoice, { captureImage: true })}
                      disabled={isSharingInvoice}
                      className="min-w-0 w-full justify-center bg-emerald-600 hover:bg-emerald-700 border border-emerald-400/40 text-white px-1 py-2 rounded-xl text-[8px] leading-tight font-black shadow-lg shadow-emerald-500/30 transition-all flex flex-col items-center gap-0.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait sm:flex-row sm:gap-1 sm:text-[9px]"
                    >
                      <MessageCircle size={12} className="shrink-0" />
                      <span className="text-center whitespace-normal">{t("merchant.orders.shippingLabel.shareWhatsApp")}</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowShippingLabelModal(false); setSelectedInvoice(null); }}
                    className="p-1.5 hover:bg-white/15 rounded-full text-white/60 hover:text-white transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* محتوى ملصق الشحن الحراري — يبقى أبيض للطباعة */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-black/20">
                  {/* حاوية الملصق بمقاس حراري متعارف عليه (مثل 100x150mm أو مقارب له) */}
                  <div 
                    ref={shippingLabelRef}
                    className="keep-white bg-white p-4 font-mono text-black print:p-0 print:m-0 w-[400px] max-w-full mx-auto print:w-full border border-gray-300"
                    style={{ direction: 'rtl' }}
                  >
                    {/* هيدر الملصق: تحميل تطبيق محلك */}
                    <div className="pb-3 border-b-2 border-black border-dashed flex items-center justify-between gap-3 mb-3">
                      <div className="text-right min-w-0 flex-1">
                        <p className="text-lg font-black tracking-tight leading-none">محلك</p>
                        <p className="text-[10px] font-bold leading-snug mt-1" style={{ color: '#000000' }}>
                          {t("merchant.orders.shippingLabel.downloadApp")}
                        </p>
                        <p className="text-[10px] font-bold leading-snug mt-0.5" style={{ color: '#000000' }}>
                          {t("merchant.orders.shippingLabel.downloadAppProvinces")}
                        </p>
                        <p className="text-[9px] font-bold leading-snug mt-0.5" style={{ color: '#000000' }}>
                          {t("merchant.orders.shippingLabel.downloadAppStores")}
                        </p>
                      </div>
                      <div className="bg-white p-1 rounded-sm border border-black shrink-0">
                        <img
                          src="/mahalak-app-qr.png"
                          alt={t("merchant.orders.shippingLabel.downloadApp")}
                          width={64}
                          height={64}
                          className="block w-16 h-16 object-contain"
                          draggable={false}
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <p
                        className="text-xl font-black text-center mb-2"
                        style={{ color: '#000000' }}
                      >
                        {selectedInvoice.storeName || currentMerchant?.shopName || currentMerchant?.ownerName}
                      </p>
                      <p className="text-sm font-black border border-black p-2 bg-black text-white text-center uppercase tracking-widest mb-3">
                        {t("merchant.orders.shippingLabel.orderNumber")} #{getOrderSeqId(selectedInvoice.id)}
                      </p>
                      <div className="space-y-2 text-sm font-bold">
                        <p className="flex justify-between items-center border-b border-gray-200 pb-1">
                          <span className="text-gray-500">{t("merchant.orders.shippingLabel.customerName")}</span>
                          <span className="text-lg font-black">{selectedInvoice.customerName}</span>
                        </p>
                        <p className="flex justify-between items-center border-b border-gray-200 pb-1">
                          <span className="text-gray-500">{t("merchant.orders.shippingLabel.province")}</span>
                          <span>{selectedInvoice.customerProvince}</span>
                        </p>
                        <p className="flex justify-between border-b border-gray-200 pb-1">
                          <span className="text-gray-500">{t("merchant.orders.shippingLabel.address")}</span>
                          <span className="text-left w-2/3 truncate block">{selectedInvoice.customerAddress}</span>
                        </p>
                        <p className="flex justify-between items-center border-b border-gray-200 pb-1">
                          <span className="text-gray-500">{t("merchant.orders.shippingLabel.orderDate")}</span>
                          <span dir="ltr">{formatSafeDate(selectedInvoice.createdAt)}</span>
                        </p>
                        <p className="flex items-center gap-1 mt-2 p-2 bg-gray-100 border border-gray-300 border-dashed justify-center">
                          <Phone size={16} /> 
                          <span className="tracking-widest font-black text-lg">{selectedInvoice.customerPhone || t("merchant.orders.shippingLabel.noPhone")}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-black uppercase mb-1">{t("merchant.orders.shippingLabel.products", { count: selectedInvoice.items?.length })}</p>
                      <ul className="text-xs space-y-1.5 mb-4">
                        {selectedInvoice.items?.map((item: any, idx: number) => (
                          <li key={idx} className="flex justify-between items-center gap-3 border-b border-gray-100 pb-1.5">
                            <span className="min-w-0 flex-1 truncate text-right">{item.quantity}x {item.productName}</span>
                            <span className="shrink-0 inline-flex items-baseline gap-1 font-bold tabular-nums whitespace-nowrap" dir="ltr">
                              <span>{Number(item.price || 0).toLocaleString()}</span>
                              <span className="text-[10px] font-bold">د.ع</span>
                            </span>
                          </li>
                        ))}
                      </ul>

                      <div className="border-t border-gray-300 pt-2 mb-4 space-y-2 text-xs">
                        <div className="flex justify-between items-center gap-3">
                          <span className="font-bold text-gray-500 shrink-0">{t("merchant.orders.shippingLabel.productsPrice")}</span>
                          <span className="shrink-0 inline-flex items-baseline gap-1 font-black tabular-nums whitespace-nowrap" dir="ltr">
                            <span>{(selectedInvoice.subtotal || 0).toLocaleString()}</span>
                            <span className="text-[10px] font-bold">د.ع</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center gap-3">
                          <span className="font-bold text-gray-500 shrink-0">{t("merchant.orders.shippingLabel.deliveryPrice")}</span>
                          <span className="shrink-0 inline-flex items-baseline gap-1 font-black tabular-nums whitespace-nowrap" dir="ltr">
                            <span>{(selectedInvoice.deliveryPrice || 0).toLocaleString()}</span>
                            <span className="text-[10px] font-bold">د.ع</span>
                          </span>
                        </div>
                        {(selectedInvoice.discountAmount || 0) > 0 && (
                          <div className="flex justify-between items-center gap-3">
                            <span className="font-bold text-gray-500 min-w-0">{t("merchant.orders.shippingLabel.discountValue", { sponsor: selectedInvoice.discountSponsor === 'ADMIN' ? t("merchant.orders.shippingLabel.discountSponsorApp") : t("merchant.orders.shippingLabel.discountSponsorStore") })}</span>
                            <span className="shrink-0 inline-flex items-baseline gap-1 font-black tabular-nums whitespace-nowrap" dir="ltr">
                              <span>-{(selectedInvoice.discountAmount || 0).toLocaleString()}</span>
                              <span className="text-[10px] font-bold">د.ع</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t-4 border-black pt-3 pb-2 flex flex-col gap-2 items-center justify-center bg-gray-100 px-3">
                      <span className="text-[11px] font-bold text-gray-600 text-center leading-snug">
                        {t("merchant.orders.shippingLabel.collectorTotal")}
                      </span>
                      <div className="inline-flex items-baseline gap-2" dir="ltr">
                        <span className="text-3xl font-black tabular-nums leading-none">
                          {Number(selectedInvoice.total || 0).toLocaleString()}
                        </span>
                        <span className="text-sm font-bold leading-none">د.ع</span>
                      </div>
                    </div>

                    {/* تذييل الملصق: نفس باركود الطلب */}
                    <div className="mt-4 border-t-2 border-black border-dashed pt-4 flex items-center justify-between gap-3">
                      <div className="text-right min-w-0 flex-1">
                        <p className="text-lg font-black tracking-tight leading-none">تاجرنا</p>
                        <p className="text-[10px] font-bold leading-snug mt-1">
                          {t("merchant.orders.shippingLabel.scanOrderQr")}
                        </p>
                      </div>
                      <div className="bg-white p-1 rounded-sm border border-black shrink-0">
                        <QRCodeSVG
                          value={buildMerchantOrderDeepLink(selectedInvoice.id)}
                          size={64}
                          level="H"
                          fgColor="#000000"
                          bgColor="#FFFFFF"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: إرسال هدية */}
        {giftModal.show && (
          <div className="fixed inset-0 bg-deep-navy/50 backdrop-blur-sm z-[115] flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
            <div className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-fade-in text-right max-h-[90vh] overflow-y-auto no-scrollbar relative text-white">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center border border-pink-100 shrink-0">
                    <Gift size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-800 leading-tight">
                      {t("merchant.gifts.title", { name: giftModal.customerName })}
                    </h3>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">{t("merchant.gifts.subtitle")}</p>
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
                    {t("merchant.gifts.giftTypeLabel")}
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
                      <span>{t("merchant.gifts.typePromo")}</span>
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
                      <span>{t("merchant.gifts.typeProduct")}</span>
                    </button>
                  </div>
                </div>

                {giftType === "promo" ? (
                  <>
                    <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100 leading-relaxed">
                      {t("merchant.gifts.promoHint")}
                    </p>

                    {/* حقول إنشاء كود الخصم (نوع الخصم وقيمة الخصم) */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-black text-slate-500 mb-1.5">
                          {t("merchant.gifts.discountType")}
                        </label>
                        <div className="relative">
                          <select
                            value={giftDiscountType}
                            onChange={(e) => setGiftDiscountType(e.target.value as any)}
                            className="welcome-select welcome-select--sm welcome-select--with-chevron"
                          >
                            <option value="amount">{t("merchant.gifts.discountAmount")}</option>
                            <option value="percent">{t("merchant.gifts.discountPercent")}</option>
                          </select>
                          <ChevronDown size={14} className="welcome-select-chevron" aria-hidden />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-500 mb-1.5">
                          {t("merchant.gifts.discountValue")}
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
                        {t("merchant.gifts.expiryDays")}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder={t("merchant.gifts.expiryPlaceholder")}
                          value={giftExpiryDays || ""}
                          onChange={(e) => setGiftExpiryDays(parseInt(e.target.value) || 0)}
                          required
                          min="1"
                          className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-vibrant-purple focus:ring-4 focus:ring-purple-50 p-3 text-center text-xs font-black text-slate-800 transition-all"
                        />
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-xs font-black text-slate-400">
                          {t("merchant.gifts.days")}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100 leading-relaxed">
                      {t("merchant.gifts.productHint")}
                    </p>

                    {/* اختيار المنتج */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-1.5">
                        {t("merchant.gifts.selectProduct")}
                      </label>
                      <div className="relative">
                        <select
                          value={giftProductId}
                          onChange={(e) => setGiftProductId(e.target.value)}
                          className="welcome-select welcome-select--sm welcome-select--with-chevron"
                        >
                          {products
                            .filter(p => p.storeId === currentMerchant!.id && p.status === "published")
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.price.toLocaleString()} {t("merchant.delivery.currency")})
                              </option>
                            ))}
                          {products.filter(p => p.storeId === currentMerchant!.id && p.status === "published").length === 0 && (
                            <option value="">{t("merchant.gifts.noPublishedProducts")}</option>
                          )}
                        </select>
                        <ChevronDown size={14} className="welcome-select-chevron" aria-hidden />
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
                    {t("merchant.gifts.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingGift}
                    className="w-2/3 py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-[0.98] text-white font-black rounded-2xl shadow-lg shadow-rose-100/50 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Gift size={16} />
                    <span>{isSendingGift ? t("merchant.gifts.sending") : t("merchant.gifts.sendNow")}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* مودال المشاركة — نفس تصميم تطبيق الزبون */}
        <AnimatePresence>
          {showShareModal && (
            <div className="fixed inset-0 bg-deep-navy/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative welcome-card-glow welcome-card-border-glow bg-deep-navy w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden text-right border border-white/30"
                dir="rtl"
              >
                <WelcomeScreenBackground lite />
                <div className="relative z-10 p-8 pb-4">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowShareModal(false)}
                        className="welcome-btn-pulse p-2 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all ml-1 backdrop-blur-md"
                      >
                        <ChevronRight size={20} />
                      </button>
                      <h3 className="text-xl font-black text-white">
                        {shareConfig?.type === "location"
                          ? t("merchant.orders.map.shareLocation")
                          : t("share.modalTitle")}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowShareModal(false)}
                      className="p-2 text-white/50 hover:text-rose-300 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <p className="text-[10px] font-black text-white/50 mb-2 mr-1 uppercase tracking-widest">
                    {t("share.previewLabel")}
                  </p>
                  <textarea
                    value={shareText}
                    onChange={(e) => setShareText(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 p-4 rounded-2xl text-xs font-bold text-white placeholder:text-white/40 focus:ring-1 focus:ring-vibrant-purple outline-none leading-relaxed mb-4 min-h-[100px] backdrop-blur-md"
                  />

                  <p className="text-[10px] font-black text-white/50 mb-3 mr-1 uppercase tracking-widest text-center">
                    {t("share.choosePlatform")}
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => executeShare("whatsapp")}
                      className="flex flex-col items-center gap-2 p-4 welcome-card-border-glow bg-emerald-500/15 text-emerald-200 border border-emerald-400/30 rounded-3xl hover:bg-emerald-500/25 transition-colors group backdrop-blur-md"
                    >
                      <div className="bg-white/10 border border-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform">
                        <MessageCircle size={24} />
                      </div>
                      <span className="text-[9px] font-black">{t("share.viaWhatsApp")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => executeShare("telegram")}
                      className="flex flex-col items-center gap-2 p-4 welcome-card-border-glow bg-white/5 text-violet-200 border border-white/20 rounded-3xl hover:bg-white/10 transition-colors group backdrop-blur-md"
                    >
                      <div className="bg-white/10 border border-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform text-violet-200">
                        <Send size={24} />
                      </div>
                      <span className="text-[9px] font-black">{t("share.viaTelegram")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => executeShare("messenger")}
                      className="flex flex-col items-center gap-2 p-4 welcome-card-border-glow bg-white/5 text-violet-200 border border-white/20 rounded-3xl hover:bg-white/10 transition-colors group backdrop-blur-md"
                    >
                      <div className="bg-white/10 border border-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform text-violet-200">
                        <MessageCircle size={24} />
                      </div>
                      <span className="text-[9px] font-black">{t("share.viaMessenger")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => executeShare("instagram")}
                      className="flex flex-col items-center gap-2 p-4 welcome-card-border-glow bg-rose-500/15 text-rose-200 border border-rose-400/30 rounded-3xl hover:bg-rose-500/25 transition-colors group backdrop-blur-md"
                    >
                      <div className="bg-white/10 border border-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform text-rose-200">
                        <Camera size={24} />
                      </div>
                      <span className="text-[9px] font-black">{t("share.viaInstagram")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => executeShare("facebook")}
                      className="flex flex-col items-center gap-2 p-4 welcome-card-border-glow bg-white/5 text-violet-200 border border-white/20 rounded-3xl hover:bg-white/10 transition-colors group backdrop-blur-md"
                    >
                      <div className="bg-white/10 border border-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform text-violet-200">
                        <Users size={24} />
                      </div>
                      <span className="text-[9px] font-black">{t("share.viaFacebook")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => executeShare("copy")}
                      className="flex flex-col items-center gap-2 p-4 welcome-card-border-glow bg-white/5 text-white/80 border border-white/20 rounded-3xl hover:bg-white/10 transition-colors group backdrop-blur-md"
                    >
                      <div className="bg-white/10 border border-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform">
                        <ClipboardList size={24} />
                      </div>
                      <span className="text-[9px] font-black">{t("share.copyLink")}</span>
                    </button>
                  </div>
                </div>

                <div className="relative z-10 p-8 pt-0">
                  <p className="text-[9px] text-white/50 text-center font-bold">
                    {shareConfig?.type === "location"
                      ? t("merchant.orders.map.shareLocationTip")
                      : t("share.rewardHint", { points: 1 })}
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
                className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl relative border border-white/30 text-white"
              >
                <div className="p-6 pb-4">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-violet text-lg flex items-center gap-2">
                      <Camera size={20} className="text-slate-600" /> {t("profile.qrModal.title")}
                    </h3>
                    <button
                      onClick={() => setShowQRMenu(false)}
                      className="p-2 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-inner border border-slate-100">
                    <div id="merchant-store-qr-print" className="keep-white bg-white p-3 rounded-2xl shadow-md border w-full max-w-[280px]">
                      <img
                        src="/mahalak-app-qr.png"
                        alt={t("profile.qrModal.title")}
                        className="w-full h-auto rounded-xl select-none"
                        draggable={false}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-2">
                  <p className="text-[10px] text-slate-500 font-bold text-center mb-4">
                    {t("profile.qrModal.instruction")}
                    <br />
                    {t("profile.qrModal.instructionPrint")}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const imgEl = document.querySelector("#merchant-store-qr-print img") as HTMLImageElement | null;
                        if (!imgEl?.src) {
                          showToast("error", t("profile.qrModal.errorTitle"), t("profile.qrModal.prepareError"));
                          return;
                        }
                        const a = document.createElement("a");
                        a.href = imgEl.src;
                        a.download = `qr-${currentMerchant.username || "store"}-mahalak.png`;
                        a.click();
                      }}
                      className="min-w-0 py-3 px-1 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white font-black rounded-2xl shadow-lg transition-transform active:scale-95 flex flex-col items-center justify-center gap-1 text-[11px] leading-tight"
                    >
                      <Download size={16} className="shrink-0" />
                      <span className="truncate max-w-full">{t("profile.qrModal.save")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!document.querySelector("#merchant-store-qr-print img")) {
                          showToast("error", t("profile.qrModal.errorTitle"), t("profile.qrModal.prepareError"));
                          return;
                        }
                        window.print();
                      }}
                      className="min-w-0 py-3 px-1 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white font-black rounded-2xl shadow-lg transition-transform active:scale-95 flex flex-col items-center justify-center gap-1 text-[11px] leading-tight"
                    >
                      <Printer size={16} className="shrink-0" />
                      <span className="truncate max-w-full text-center">{t("profile.qrModal.print")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const imgEl = document.querySelector("#merchant-store-qr-print img") as HTMLImageElement | null;
                        if (!imgEl?.src) {
                          showToast("error", t("profile.qrModal.errorTitle"), t("profile.qrModal.prepareError"));
                          return;
                        }
                        try {
                          const res = await fetch(imgEl.currentSrc || imgEl.src);
                          const blob = await res.blob();
                          const fileName = `qr-${currentMerchant.username || "store"}-mahalak.png`;
                          const file = new File([blob], fileName, { type: blob.type || "image/png" });
                          const shareData: ShareData = {
                            title: t("profile.qrModal.title"),
                            text: t("profile.qrModal.instruction"),
                            files: [file],
                          };

                          if (typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare(shareData)) {
                            await navigator.share(shareData);
                            showToast("success", t("profile.qrModal.title"), t("profile.qrModal.shareSuccess"));
                            return;
                          }

                          const absoluteUrl = new URL(imgEl.currentSrc || imgEl.src || "/mahalak-app-qr.png", window.location.href).href;
                          const nativeResult = await tryNativeShare({
                            title: t("profile.qrModal.title"),
                            text: t("profile.qrModal.instruction"),
                            url: absoluteUrl,
                          });
                          if (nativeResult === "shared") {
                            showToast("success", t("profile.qrModal.title"), t("profile.qrModal.shareSuccess"));
                            return;
                          }
                          if (nativeResult === "cancelled") return;

                          const a = document.createElement("a");
                          a.href = imgEl.src;
                          a.download = fileName;
                          a.click();
                          showToast("success", t("profile.qrModal.title"), t("profile.qrModal.shareSuccess"));
                        } catch {
                          showToast("error", t("profile.qrModal.errorTitle"), t("profile.qrModal.shareFailed"));
                        }
                      }}
                      className="min-w-0 py-3 px-1 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white font-black rounded-2xl shadow-lg transition-transform active:scale-95 flex flex-col items-center justify-center gap-1 text-[11px] leading-tight"
                    >
                      <Share2 size={16} className="shrink-0" />
                      <span className="truncate max-w-full">{t("profile.qrModal.share")}</span>
                    </button>
                  </div>
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
                className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow rounded-2xl w-full max-w-sm p-6 shadow-2xl relative overflow-hidden text-center text-white"
              >
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                  <AlertTriangle className="text-amber-500 w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-violet mb-2">
                  {t("profile.unsaved.title")}
                </h3>
                <p className="text-xs text-slate-500 mb-6 px-4">
                  {t("profile.unsaved.body")}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={async () => {
                      if (isSavingProfile) return;
                      setIsSavingProfile(true);
                      try {
                        const dbPayload = {
                          ownerName: profileForm.ownerName.trim(),
                          shopName: profileForm.shopName.trim(),
                          username: profileForm.username.trim().toLowerCase(),
                          category: profileForm.category,
                          province: profileForm.province,
                          area: profileForm.area.trim(),
                          landmark: profileForm.landmark.trim(),
                          logo: profileForm.logo || "",
                          showPhone: profileForm.showPhone,
                          showArea: profileForm.showArea,
                          showLandmark: profileForm.showLandmark,
                          showMap: profileForm.showMap,
                          ...(profileForm.lat !== undefined ? { lat: profileForm.lat } : {}),
                          ...(profileForm.lng !== undefined ? { lng: profileForm.lng } : {}),
                          payoutMethods: {
                            zainCashNumber: profileForm.zainCashNumber,
                            mastercardNumber: profileForm.mastercardNumber,
                          },
                        };
                        await updateStoreProfile(dbPayload);
                        setIsProfileDirty(false);
                        setShowUnsavedModal(false);
                        showToast("success", t("profile.saveSuccess"), t("merchant.profileForm.saveSuccessDetail"));
                        const next = pendingTab;
                        setPendingTab(null);
                        if (next === "__profile_hub__") {
                          setProfileSubPage(null);
                        } else if (typeof next === "string" && next.startsWith("__profile_")) {
                          const page = next.replace("__profile_", "") as
                            | "storeInfo"
                            | "location"
                            | "wallet"
                            | "verification"
                            | "settings";
                          setMyStoreSubPage(null);
                          setShowNotifications(false);
                          setIframeUrl(null);
                          setProfileSubPage(page);
                          startTabTransition(() => setActiveTab("profile"));
                        } else if (typeof next === "string" && next.startsWith("__mystore_")) {
                          const page = next.replace("__mystore_", "") as
                            | "reports"
                            | "marketing"
                            | "delivery"
                            | "customers";
                          setProfileSubPage(null);
                          setShowNotifications(false);
                          setIframeUrl(null);
                          if (page === "customers") void refreshStoreAudience();
                          setMyStoreSubPage(page);
                          startTabTransition(() => setActiveTab("mystore"));
                        } else if (next != null) {
                          applyTabChange(next);
                        }
                      } catch (e: unknown) {
                        showToast("error", t("common.error"), profileSaveErrorMessage(e));
                      } finally {
                        setIsSavingProfile(false);
                      }
                    }}
                    disabled={isSavingProfile}
                    className="p-3 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white rounded-2xl font-bold text-xs transition disabled:opacity-70"
                  >
                    {isSavingProfile ? t("common.loading") : t("profile.unsaved.saveAndLeave")}
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
                      const next = pendingTab;
                      setPendingTab(null);
                      if (next === "__profile_hub__") {
                        setProfileSubPage(null);
                      } else if (typeof next === "string" && next.startsWith("__profile_")) {
                        const page = next.replace("__profile_", "") as
                          | "storeInfo"
                          | "location"
                          | "wallet"
                          | "verification"
                          | "settings";
                        setMyStoreSubPage(null);
                        setShowNotifications(false);
                        setIframeUrl(null);
                        setProfileSubPage(page);
                        startTabTransition(() => setActiveTab("profile"));
                      } else if (typeof next === "string" && next.startsWith("__mystore_")) {
                        const page = next.replace("__mystore_", "") as
                          | "reports"
                          | "marketing"
                          | "delivery"
                          | "customers";
                        setProfileSubPage(null);
                        setShowNotifications(false);
                        setIframeUrl(null);
                        if (page === "customers") void refreshStoreAudience();
                        setMyStoreSubPage(page);
                        startTabTransition(() => setActiveTab("mystore"));
                      } else if (next != null) {
                        applyTabChange(next);
                      }
                    }}
                    className="p-3 bg-rose-50 text-rose-600 rounded-2xl font-bold text-xs hover:bg-rose-100 transition"
                  >
                    {t("profile.unsaved.discard")}
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
                    {t("profile.unsaved.stay")}
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
                 className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative text-white"
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
                          <span className="text-[10px] text-red-500 font-black block mb-1">{t("merchant.confirms.block.moderationTitle")}</span>
                          <p className="text-[9px] text-slate-500 mb-3 leading-relaxed">
                            {aud.isBlocked 
                              ? t("merchant.confirms.block.blockedNow")
                              : t("merchant.confirms.block.blockHint")}
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
                            <span>{aud.isBlocked ? t("merchant.confirms.block.confirmUnblockAction") : t("merchant.confirms.block.confirmBlockAction")}</span>
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
        {showBgRemoverModal && (
          <Suspense fallback={null}>
            <BackgroundRemover
              isOpen={showBgRemoverModal}
              onClose={() => setShowBgRemoverModal(false)}
              onSelectImage={setProdImage}
            />
          </Suspense>
        )}

        {showStorePreview && currentMerchant && (
          <Suspense
            fallback={
              <div className="fixed inset-0 z-[160] flex items-center justify-center bg-deep-navy text-white">
                <Loader2 size={28} className="animate-spin" />
              </div>
            }
          >
            <MerchantStorePreview
              store={currentMerchant}
              products={products}
              onClose={() => setShowStorePreview(false)}
            />
          </Suspense>
        )}

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
                        alert(t("common.browser.linkCopied"));
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
        <ChangePasswordModal
          open={showPasswordChange}
          onClose={() => {
            setShowPasswordChange(false);
            setPwStep(1);
            setOtpPwCode("");
            setNewPassword("");
            setIsSendingPwOtp(false);
            setIsUpdatingPassword(false);
          }}
          phone={currentMerchant?.phone ?? ""}
          pwStep={pwStep as 1 | 2}
          otpPwCode={otpPwCode}
          newPassword={newPassword}
          isSendingOtp={isSendingPwOtp}
          isUpdatingPassword={isUpdatingPassword}
          onOtpChange={setOtpPwCode}
          onNewPasswordChange={setNewPassword}
          onSubmit={handleChangePassword}
          onResendOtp={async () => {
            if (!currentMerchant || isSendingPwOtp) return;
            setIsSendingPwOtp(true);
            try {
              const ok = await authService.requestOTP(currentMerchant.phone, "forgot");
              if (ok) {
                setPwStep(2);
                showToast("success", t("auth.toast.otpSentTitle"), t("auth.toast.otpSentForPasswordChange"));
              } else {
                showToast("error", t("auth.toast.sendFailedTitle"), t("auth.toast.sendFailed"));
              }
            } catch (err: any) {
              showToast("error", t("auth.toast.errorTitle"), err.message || t("auth.toast.tryAgain"));
            } finally {
              setIsSendingPwOtp(false);
            }
          }}
        />
      </div>
    );
  }

  // ==========================================
  // واجهات تسجيل الدخول والتسجيل (مطابقة للزبون)
  // ==========================================

  return (
    <>
    {pushPermissionModal}
    <MerchantAuthPage contentKey={view}>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black text-white">
            {t("auth.merchantPanelTitle")}
          </h1>
          <p className="mt-1 text-xs text-white">
            {t("auth.merchantPanelSubtitle")}
          </p>
        </div>

        {/* تسجيل الدخول */}
        {view === "login" && (
          <form onSubmit={handleLogin} noValidate className="space-y-5">
            {loginError && (
              <div className="welcome-inline-alert welcome-card-glow" role="alert">
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
                {t("auth.loginByPhone")}
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginMethod === 'username' ? 'bg-white text-violet shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => { setLoginMethod('username'); setLoginError(''); }}
              >
                {t("auth.loginByUsername")}
              </button>
            </div>

            {loginMethod === 'phone' ? (
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">
                  {t("auth.phone")} <span className="text-red-500">*</span>
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
                  {t("auth.usernameLabel")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t("auth.example.username")}
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                  className="w-full border border-slate-200 p-3.5 rounded-2xl text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-slate-500 focus:outline-none text-left"
                  dir="ltr"
                />
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
                {t("auth.password")} <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder={t("auth.passwordMinPlaceholder")}
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
              {t("auth.forgotPasswordShort")}
            </button>
            <button
              type="submit"
              disabled={isAuthBusy}
              className={`welcome-btn-pulse w-full py-4 font-black rounded-2xl transition-all flex items-center justify-center gap-2 ${
                isAuthBusy
                  ? 'bg-vibrant-purple/70 text-white cursor-wait'
                  : 'bg-brand-horizontal text-white hover:opacity-95'
              }`}
            >
              {isAuthBusy ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  <span>{t("auth.loggingIn")}</span>
                </>
              ) : (
                <>
                  <LogOut size={20} className="rotate-180" />
                  <span>{t("auth.login")}</span>
                </>
              )}
            </button>
            <div className="text-center pt-4 border-t border-vibrant-purple text-sm text-white">
              {t("auth.noAccount")}{" "}
              <button
                type="button"
                onClick={() => { setLoginError(''); setView("signup"); }}
                className="font-bold text-[#FFF700]"
              >
                {t("auth.createAccountLink")}
              </button>
            </div>
          </form>
        )}

        {/* إنشاء حساب */}
        {view === "signup" && (
          <form onSubmit={handleSignup} noValidate className="space-y-4">
            {loginError && (
              <div className="welcome-inline-alert welcome-card-glow" role="alert">
                <AlertTriangle size={16} />
                {loginError}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  {t("auth.fullName")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t("auth.example.fullName")}
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                  className={`w-full border p-3 rounded-2xl text-sm text-white placeholder:text-white/50 ${ownerName.trim() ? "border-green-400" : "border-slate-200"}`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  {t("auth.phoneWhatsApp")} <span className="text-red-500">*</span>
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
                    className="flex-1 bg-brand-horizontal p-3 text-sm font-mono text-left text-white placeholder:text-white/50 focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input type="checkbox" checked={showPhone} onChange={(e) => setShowPhone(e.target.checked)} className="rounded text-vibrant-purple focus:ring-vibrant-purple" />
                  <span className="text-xs">{t("auth.showToCustomer")}</span>
                </label>

              </div>
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  {t("auth.shopName")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t("auth.example.shopName")}
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  required
                  className={`w-full border p-3 rounded-2xl text-sm text-white placeholder:text-white/50 ${shopName.trim() ? "border-green-400" : "border-slate-200"}`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  {t("auth.shopCategory")} <span className="text-red-500">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="welcome-select welcome-select--lg"
                >
                  {STORE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getStoreCategoryFullLabel(c.id)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  {t("auth.usernameLabel")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t("auth.example.username")}
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""),
                    )
                  }
                  required
                  className={`w-full border p-3 rounded-2xl text-sm font-mono text-white placeholder:text-white/50 ${isUsernameValid ? "border-green-400" : username ? "border-red-400" : "border-slate-200"}`}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  {t("auth.password")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder={t("auth.passwordPlaceholder8")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`w-full border p-3 rounded-2xl text-sm text-white placeholder:text-white/50 ${isPasswordValid ? "border-green-400" : password ? "border-red-400" : "border-slate-200"}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    {t("auth.province")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedProvince}
                    onChange={(e) => setSelectedProvince(e.target.value)}
                    required
                    className="welcome-select welcome-select--sm"
                  >
                    {provinces.map((p) => (
                      <option key={p.id} value={p.name}>
                        {getProvinceLabel(p)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    {t("auth.area")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={t("auth.example.area")}
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    required
                    className="w-full border p-2.5 rounded-2xl text-xs text-white placeholder:text-white/50 mb-2"
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showArea} onChange={(e) => setShowArea(e.target.checked)} className="rounded text-vibrant-purple focus:ring-vibrant-purple" />
                    <span className="text-xs">{t("auth.showToCustomer")}</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  {t("auth.landmark")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t("auth.example.landmark")}
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  required
                  className="w-full border p-3 rounded-2xl text-sm text-white placeholder:text-white/50 mb-2"
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showLandmark} onChange={(e) => setShowLandmark(e.target.checked)} className="rounded text-vibrant-purple focus:ring-vibrant-purple" />
                  <span className="text-xs">{t("auth.showToCustomer")}</span>
                </label>
              </div>
              <div className="space-y-3 pt-2">
                <MerchantLocationPicker
                  onLocationSelect={(lat, lng) => {
                    setLat(lat);
                    setLng(lng);
                  }}
                  label={t("auth.mapLocation")}
                  required={true}
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showMap} onChange={(e) => setShowMap(e.target.checked)} className="rounded text-vibrant-purple focus:ring-vibrant-purple" />
                  <span className="text-xs">{t("auth.showToCustomer")}</span>
                </label>
              </div>
              <div className="max-w-[120px] mx-auto">
                <ImageUploader
                  value={logoUrl}
                  onChange={setLogoUrl}
                  label={t("auth.shopLogoOptional")}
                  labelClassName="block text-xs font-black text-white mb-1"
                  placeholder={t("auth.addImagePlaceholder")}
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
                  <span className="text-white">{t("auth.agreeTerms")}</span>{' '}
                  <button 
                    type="button" 
                    onClick={() => setShowTermsModal(true)} 
                    className="text-[#FFF700] underline underline-offset-4 decoration-2 hover:text-[#FFF700] transition-colors"
                  >
                    {t("auth.merchantTermsLink")}
                  </button>
                </span>
              </label>
            </div>

            {!isFormValid && (
              <p className="text-[10px] text-[#FFF700] text-center font-bold animate-pulse">
                {t("auth.completeRequiredFields")}
              </p>
            )}
            <button
              type="submit"
              disabled={!isFormValid || isAuthBusy}
              className={`welcome-btn-pulse w-full py-4 font-black rounded-2xl transition-all flex items-center justify-center gap-2 ${
                !isFormValid && !isAuthBusy
                  ? 'bg-gray-200 text-slate-400 cursor-not-allowed'
                  : isAuthBusy
                    ? 'bg-vibrant-purple/70 text-white cursor-wait'
                    : 'bg-brand-horizontal text-white hover:opacity-95'
              }`}
            >
              {isAuthBusy ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  <span>{t("auth.creatingAccount")}</span>
                </>
              ) : (
                t("auth.createMerchantAccount")
              )}
            </button>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setLoginError(''); setView("login"); }}
                className="text-xs font-bold text-white"
              >
                {t("auth.backToLogin")}
              </button>
            </div>
          </form>
        )}

        {/* OTP */}
        {view === "otp" && (
          <form onSubmit={handleOtpConfirm} noValidate className="space-y-6">
            {loginError && (
              <div className="welcome-inline-alert welcome-card-glow" role="alert">
                <AlertTriangle size={16} />
                {loginError}
              </div>
            )}
            <div className="text-center">
              <h3 className="text-xl font-black text-white">
                {t("auth.otpPhoneConfirmTitle")}
              </h3>
              <p className="text-sm text-slate-300 mt-2">
                {t("auth.otpWhatsAppHint")}
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
              className="w-full border-2 border-slate-500 p-4 rounded-2xl text-center text-3xl font-mono tracking-[0.5em] text-white placeholder:text-white/50 focus:ring-4 focus:ring-slate-100 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isAuthBusy}
              className={`welcome-btn-pulse w-full py-4 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 ${
                isAuthBusy ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-horizontal hover:opacity-95'
              }`}
            >
              {isAuthBusy ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  <span>{t("auth.confirmingOtp")}</span>
                </>
              ) : (
                <>
                  <Check size={20} />
                  <span>{t("auth.confirmOtpAndLogin")}</span>
                </>
              )}
            </button>
            <div className="flex flex-col items-center space-y-4">
              <button
                type="button"
                disabled={!canResendOtp || isResendingOtp}
                onClick={handleResendOtp}
                className={`text-sm font-bold transition-colors ${
                  canResendOtp && !isResendingOtp
                    ? "text-violet hover:text-slate-700" 
                    : "text-slate-400 cursor-not-allowed"
                }`}
              >
                {isResendingOtp
                  ? t("auth.resendingOtp")
                  : canResendOtp
                    ? t("auth.resendOtp")
                    : t("auth.resendIn", { seconds: otpTimer })}
              </button>
              
              <button
                type="button"
                onClick={() =>
                  setView(otpMode === "signup" ? "signup" : "forgot")
                }
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                {t("auth.changePhoneBack")}
              </button>
            </div>
          </form>
        )}

        {/* نسيت كلمة السر */}
        {view === "forgot" && (
          <form onSubmit={handleForgotPassword} noValidate className="space-y-5">
            {loginError && (
              <div className="welcome-inline-alert welcome-card-glow" role="alert">
                <AlertTriangle size={16} />
                {loginError}
              </div>
            )}
            <div className="text-center">
              <h3 className="text-xl font-black text-white">
                {t("auth.recoverPasswordTitle")}
              </h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-white/80 mb-1.5">
                {t("auth.registeredPhone")} <span className="text-red-500">*</span>
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
                  className="flex-1 bg-brand-horizontal p-3 text-sm font-mono text-left text-white placeholder:text-white/50 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-white/80 mb-1.5">
                {t("auth.newPassword")} <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={forgotNewPassword}
                onChange={(e) => setForgotNewPassword(e.target.value)}
                placeholder="8 حروف أو أكثر"
                required
                className="w-full border border-slate-200 p-3.5 rounded-2xl text-sm text-white placeholder:text-white/50"
              />
            </div>
            <button
              type="submit"
              disabled={isAuthBusy}
              className={`welcome-btn-pulse w-full py-4 text-white font-black rounded-2xl transition-all ${
                isAuthBusy ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-horizontal hover:opacity-95'
              }`}
            >
              {isAuthBusy ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  {t("auth.sendingOtpForgot")}
                </span>
              ) : (
                t("auth.sendOtpBtn")
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setView("login");
                setLoginError("");
              }}
              className="w-full text-xs font-bold text-slate-400"
            >
              {t("auth.backToLogin")}
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
              className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-white"
              dir="rtl"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <MahalakLogo className="h-10 w-10 shrink-0 object-contain" />
                  <div>
                    <h2 className="text-xl font-black text-slate-800 border-b-2 border-[#7B3DFF]/30 pb-0.5 inline-block">{t("merchant.terms.signupTitle")}</h2>
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
                  {(["acceptance", "responsibility", "billing", "privacy", "termination"] as const).map((key, index) => (
                    <div key={key} className="flex gap-3">
                      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? "bg-blue-50 text-blue-500"
                          : index === 1 ? "bg-indigo-50 text-indigo-500"
                          : index === 2 ? "bg-vibrant-purple/10 text-vibrant-purple"
                          : index === 3 ? "bg-emerald-50 text-emerald-500"
                          : "bg-rose-50 text-rose-500"
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 mb-1">{t(`merchant.terms.sections.${key}.title`)}</p>
                        <p>{t(`merchant.terms.sections.${key}.body`)}</p>
                      </div>
                    </div>
                  ))}

                  <div className="bg-slate-100 rounded-2xl p-5 border border-slate-200 mt-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-vibrant-purple"></div>
                    <div className="flex items-center gap-2 mb-4">
                      <MahalakLogo className="h-5 w-5 shrink-0 object-contain" />
                      <p className="text-lg font-black text-slate-800">
                        {t("merchant.terms.contractTitle")}
                      </p>
                    </div>
                    <div className="space-y-3 text-slate-600 text-[13px] leading-relaxed">
                      <p className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                        {t("merchant.terms.signupContractBody")}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <strong className="text-slate-800 inline-block mb-1">{t("merchant.terms.party1Label")}</strong> <br/>{t("merchant.terms.party1Value")}
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <strong className="text-slate-800 inline-block mb-1">{t("merchant.terms.party2Label")}</strong> <br/>{t("merchant.terms.party2Value")}
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <strong className="text-slate-800">{t("merchant.terms.serviceScopeLabel")}</strong> {t("merchant.terms.serviceScopeValue")}
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100 mb-0">
                        <strong className="text-slate-800">{t("merchant.terms.independenceLabel")}</strong> {t("merchant.terms.independenceValue")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-white/15 bg-white/5">
                <button 
                  type="button"
                  onClick={() => {
                    setIsTermsAccepted(true);
                    setShowTermsModal(false);
                  }}
                  className="w-full py-4 bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white font-black text-lg rounded-xl shadow-[0_8px_20px_-8px_rgba(123,61,255,0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                >
                  <span>{t("merchant.terms.readAndAgree")}</span>
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
                      alert(t("common.browser.linkCopied"));
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
              className="merchant-glass-sheet welcome-card-glow welcome-card-border-glow rounded-[2rem] shadow-2xl p-6 sm:p-8 w-full max-w-md relative z-10 text-white"
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
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-vibrant-purple to-deep-navy border border-white text-white font-black transition disabled:opacity-50 flex justify-center items-center gap-2 shadow-md hover:shadow-lg"
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
