import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/useApp";
import { Product, Order } from "../../types";
import { STORE_CATEGORIES } from "../../constants";
import { StorageService } from "../../services/storageService";
import { showLocalNotification, requestNotificationPermission, setupPushNotifications } from "../../lib/pushNotifications";
import { formatSafeDate, formatSafeTimeString, formatSafeDateTimeString } from "../../utils/date";
import { motion, AnimatePresence } from "framer-motion";
import { useReactToPrint } from "react-to-print";
import { QRCodeSVG } from "qrcode.react";
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
} from "lucide-react";
import { ImageUploader } from "../../components/ImageUploader";
import { BackgroundRemover } from "../../components/BackgroundRemover";
import { LocationPicker } from "../../components/LocationPicker";
import { CopyButton } from "../../components/CopyButton";
import { sendOTP } from "../../services/otpService";
import { Html5QrcodeScanner } from "html5-qrcode";
import QRCode from "react-qr-code";

const notificationSound = new Audio(
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
);

// ==========================================
// لوحة التاجر - منصة محلك
// ==========================================

export const MerchantApp: React.FC = () => {
  const {
    currentMerchant,
    setCurrentMerchant,
    registerMerchant,
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
  } = useApp();

  const [isSyncing, setIsSyncing] = useState(false);
  const handleManualSync = async () => {
    setIsSyncing(true);
    // Locally data is already in state, but we can imagine a "Refresh" logic here if needed
    setTimeout(() => setIsSyncing(false), 1000);
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

  // ==========================================
  // الحالات (States)
  // ==========================================

  // واجهات التطبيق
  const [view, setView] = useState<
    "login" | "signup" | "otp" | "forgot" | "dashboard"
  >("login");
  // التحقق من حالة الاشتراك عند فتح التطبيق
  useEffect(() => {
    if (!currentMerchant || !currentMerchant.subscriptionExpiry) return;
    
    const expiryDate = new Date(currentMerchant.subscriptionExpiry);
    const today = new Date();
    const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // التحقق إذا كان الاشتراك ينتهي خلال 3 أيام
    if (diffDays <= 3 && diffDays > 0) {
      const alreadyNotified = notifications.some(n => 
        n.userId === currentMerchant.id && 
        n.type === 'subscription' && 
        new Date(n.createdAt).toDateString() === today.toDateString()
      );
      
      if (!alreadyNotified) {
        addNotification({
          userId: currentMerchant.id,
          role: 'merchant',
          title: 'تنبيه الاشتراك ⚠️',
          message: `اشتراكك ينتهي خلال ${diffDays} أيام. يرجى التجديد لضمان استمرارية الخدمة.`,
          type: 'subscription'
        });
      }
    }
  }, [currentMerchant, notifications, addNotification]);

  const [activeTab, setActiveTab] = useState<
    | "home"
    | "products"
    | "orders"
    | "promo"
    | "customers"
    | "profile"
    | "flashsales"
  >("home");
  const [showNotifications, setShowNotifications] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  // ==========================================
  // نظام التزامن مع تاريخ المتصفح لدعم رجوع الأندرويد وإيماءات اليد (للتاجر)
  // ==========================================
  const isPopStateRef = React.useRef(false);

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
    return `#/merchant${sub}`;
  };

  const parseMerchantHashToState = (hash: string) => {
    const path = hash.replace('#/merchant', '');
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
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state || parseMerchantHashToState(window.location.hash);
      if (state && (state.isAppNavMerchant || window.location.hash.startsWith('#/merchant'))) {
        isPopStateRef.current = true;

        if (state.view !== undefined && state.view !== view) {
          setView(state.view);
        }
        if (state.activeTab !== undefined && state.activeTab !== activeTab) {
          setActiveTab(state.activeTab);
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
      }
    } else {
      window.history.replaceState({ ...currentState, isInitialMerchant: true }, "", hashUrl);
    }
  }, [view, activeTab, showNotifications]);

  // نظام المشاركة المطور
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareConfig, setShareConfig] = useState<{
    type: "store" | "product";
    data: any;
  } | null>(null);
  const [shareText, setShareText] = useState("");

  const openShareModal = (type: "store" | "product", data: any) => {
    const text = type === "store"
      ? `أهلاً بكم في متجراً الرسمي "${data.shopName}"! يمكنكم تصفح أحدث المنتجات والطلب مباشرة من الرابط التالي:
https://mahallak.app/store/${data.id}`
      : `متوفر الآن في متجرنا: "${data.name}" بسعر ${data.price.toLocaleString()} د.ع.
سارع بالطلب الآن عبر تطبيق محلك: https://mahallak.app/product/${data.id}`;
    
    setShareText(text);
    setShareConfig({ type, data });
    setShowShareModal(true);
  };

  const executeShare = (
    platform:
      | "whatsapp"
      | "messenger"
      | "telegram"
      | "instagram"
      | "facebook"
      | "copy",
  ) => {
    const encodedText = encodeURIComponent(shareText);
    const url =
      shareConfig?.type === "store"
        ? `https://mahallak.app/store/${shareConfig!.data.id}`
        : `https://mahallak.app/product/${shareConfig!.data.id}`;

    let shareUrl = "";
    switch (platform) {
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodedText}`;
        break;
      case "telegram":
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodedText}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case "messenger":
        shareUrl = `fb-messenger://share/?link=${encodeURIComponent(url)}`;
        break;
      case "instagram":
        navigator.clipboard.writeText(shareText);
        alert(
          "تم نسخ نص المشاركة. يمكنك الآن لصقه في ستوري إنستقرام أو رسالة خاصة.",
        );
        return;
      case "copy":
        navigator.clipboard.writeText(shareText);
        alert("تم نسخ الرابط بنجاح! ✅");
        return;
    }
    if (shareUrl) openExternalUrl(shareUrl);
  };

  const merchantNotifications = notifications
    .filter((n) => n.userId === currentMerchant?.id && n.role === "merchant")
    .sort((a, b) => {
      const timeA = (a.createdAt as any)?.toMillis ? (a.createdAt as any).toMillis() : Date.parse((a.createdAt as string) || '');
      const timeB = (b.createdAt as any)?.toMillis ? (b.createdAt as any).toMillis() : Date.parse((b.createdAt as string) || '');
      return (Number(timeB) || 0) - (Number(timeA) || 0);
    });
  const unreadNotifsCount = merchantNotifications.filter((n) => !n.read).length;
  const [lastNotifCount, setLastNotifCount] = useState(unreadNotifsCount);

  useEffect(() => {
    if (unreadNotifsCount > lastNotifCount) {
      const latestNotif = merchantNotifications[0];
      if (latestNotif && !latestNotif.read) {
        notificationSound.play().catch((e) => console.log("Sound error:", e));
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
  const [showPhone, setShowPhone] = useState(true);
  const [categoryId, setCategoryId] = useState("fashion");
  const [logoUrl, setLogoUrl] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("sub_monthly");

  const [isProfileDirty, setIsProfileDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingTab, setPendingTab] = useState<any>(null);

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    ownerName: "",
    shopName: "",
    username: "",
    category: "fashion",
    province: "",
    area: "",
    landmark: "",
    deliveryPrice: 5000,
    isFreeDelivery: false,
    logo: "",
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
    showArea: true,
    showLandmark: true,
    showMap: true,
    showPhone: true,
  });

  const handleProfileFormChange = (updates: Partial<typeof profileForm>) => {
    setProfileForm((prev) => ({ ...prev, ...updates }));
    setIsProfileDirty(true);
  };

  const handleTabChange = (newTab: any) => {
    if (activeTab === "profile" && isProfileDirty) {
      setPendingTab(newTab);
      setShowUnsavedModal(true);
    } else {
      setActiveTab(newTab);
    }
  };
  const [showPasswordChange, setShowPasswordChange] = useState(false);
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

  const invoiceRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `فاتورة_طلب_${selectedInvoice?.id || ""}`,
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
  const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(null);

  // ==========================================
  // التحديث اللحظي للطلبات (Placeholder)
  // ==========================================
  useEffect(() => {
    // Note: Live Query removed as per user request to delete Back4App
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
    lng !== undefined;

  // ==========================================
  // تحديث الجلسة
  // ==========================================

  useEffect(() => {
    if (currentMerchant) {
      const updatedStore = stores.find(s => s.id === currentMerchant.id);
      if (!updatedStore) {
        setTimeout(() => {
           setCurrentMerchant(null);
           setView("login");
           setLoginError("تم حذف بيانات حسابك والمتجر نهائياً من قبل الإدارة.");
        }, 0);
        return;
      }
      if (updatedStore && updatedStore.isBanned) {
        setTimeout(() => {
           setCurrentMerchant(null);
           setView("login");
           setLoginError("تم حظر هذا الحساب من قبل الإدارة و تم تسجيل خروجك.");
        }, 0);
        return;
      }

      setTimeout(() => {
        if (view !== "dashboard") setView("dashboard");
        setProfileForm({
          ownerName: currentMerchant.ownerName,
          shopName: currentMerchant.shopName,
          username: currentMerchant.username,
          category: currentMerchant.category || "fashion",
          province: currentMerchant.province,
          area: currentMerchant.area,
          landmark: currentMerchant.landmark,
          deliveryPrice: currentMerchant.deliveryPrice || 5000,
          isFreeDelivery: currentMerchant.isFreeDelivery || false,
          logo: currentMerchant.logo || "",
          lat: currentMerchant.lat,
          lng: currentMerchant.lng,
          showArea: currentMerchant.showArea !== false,
          showLandmark: currentMerchant.showLandmark !== false,
          showMap: currentMerchant.showMap !== false,
          showPhone: currentMerchant.showPhone !== false,
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    let found;
    
    if (loginMethod === 'phone') {
      if (!isLoginPhoneValid) {
        setLoginError(
          "رقم الهاتف غير صحيح. يبدأ بـ 077/078/079/075 ويتكون من 11 رقم",
        );
        return;
      }
      
      const normalized = normalizeIraqiPhone(loginPhone);
      found = stores.find(
        (s) => normalizeIraqiPhone(s.phone) === normalized,
      );
    } else {
      if (!loginUsername.trim()) {
        setLoginError("يرجى إدخال اسم المستخدم");
        return;
      }
      found = stores.find(
        (s) => s.username === loginUsername.trim()
      );
    }

    if (loginPassword.length < 8) {
      setLoginError("كلمة المرور يجب أن لا تقل عن 8 حروف أو رموز");
      return;
    }

    if (!found) {
      setLoginError(loginMethod === 'phone' ? "الرقم غير مسجل. أنشئ حساباً جديداً." : "اسم المستخدم غير موجود.");
      return;
    }
    if (found.password !== loginPassword) {
      setLoginError("كلمة المرور غير صحيحة.");
      return;
    }
    if (found.isBanned) {
      setLoginError("تم حظر هذا الحساب من قبل الإدارة.");
      return;
    }
    setCurrentMerchant(found);
    requestNotificationPermission();
    setView("dashboard");
    setLoginError("");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    const normalized = normalizeIraqiPhone(phone);
    if (stores.some((s) => normalizeIraqiPhone(s.phone) === normalized)) {
      alert("رقم الهاتف مسجل مسبقاً كتاجر! لا يمكن إنشاء حساب جديد بنفس الرقم.");
      return;
    }
    if (customers.some((c) => normalizeIraqiPhone(c.phone) === normalized)) {
      alert("رقم الهاتف مسجل مسبقاً كزبون! لا يمكن استخدامه لإنشاء حساب تاجر.");
      return;
    }
    if (
      stores.some((s) => s.username.toLowerCase() === username.toLowerCase())
    ) {
      alert("اسم المستخدم مسجل مسبقاً!");
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
    });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentOtpCode(code);
    setOtpMode("signup");
    setOtpCode("");
    setOtpTimer(60);
    setCanResendOtp(false);
    setView("otp");
    try {
      console.log(`🔒 OTP DEBUG (Signup): The code is ${code}`);
      const ok = await sendOTP(normalized, code, "signup");
      if (ok) {
        alert("تم إرسال رمز OTP إلى واتساب!");
      } else {
        alert("فشل الإرسال. يرجى المحاولة لاحقاً");
      }
    } catch {
      alert("⚠️ فشل إرسال رمز التحقق. يرجى التأكد من اتصالك بالإنترنت أو المحاولة لاحقاً");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!iraqiPhoneRegex.test(forgotPhone)) {
      setLoginError("رقم الهاتف غير صحيح");
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
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentOtpCode(code);
    setOtpMode("forgot");
    setOtpCode("");
    setOtpTimer(60);
    setCanResendOtp(false);
    setView("otp");
    try {
      console.log(`🔒 OTP DEBUG (Forgot): The code is ${code}`);
      const ok = await sendOTP(normalized, code, "forgot");
      if (ok) {
        alert("تم إرسال رمز OTP إلى واتساب!");
      } else {
        alert("فشل الإرسال. يرجى المحاولة لاحقاً");
      }
    } catch {
      alert("⚠️ فشل إرسال رمز التحقق. يرجى التأكد من اتصالك بالإنترنت أو المحاولة لاحقاً");
    }
  };

  const handleOtpConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode !== sentOtpCode) {
      alert("الرمز غير صحيح!");
      return;
    }
    if (otpMode === "signup" && pendingData) {
      const res = await registerMerchant(pendingData);
      if (res?.success) {
        const fresh = stores.find((s) => s.username === pendingData.username);
        if (fresh) setCurrentMerchant(fresh);
        alert("تم إنشاء متجرك بنجاح! 🎉");
        setView("dashboard");
      } else {
        alert(res?.message || 'Empty response');
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
        setTimeout(() => alert("تم تغيير كلمة المرور بنجاح!"), 100);
      }
    }
  };

  const handleResendOtp = async () => {
    if (!canResendOtp) return;
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentOtpCode(code);
    setOtpTimer(60);
    setCanResendOtp(false);
    setOtpCode("");

    const targetPhone = otpMode === "signup" ? (pendingData?.phone || phone) : forgotPhone;
    const normalized = normalizeIraqiPhone(targetPhone);
    
    try {
      const ok = await sendOTP(normalized, code, otpMode);
      alert(ok ? "تم إعادة إرسال رمز OTP بنجاح!" : "فشل الإرسال. يرجى المحاولة لاحقاً");
    } catch (err: any) {
      alert("❌ خطأ في الاتصال: " + err.message);
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
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentOtpCode(code);
      const ok = await sendOTP(currentMerchant.phone, code, "forgot");
      if (ok) {
        setPwStep(2);
        alert("تم إرسال رمز OTP لتغيير كلمة المرور إلى واتساب!");
      } else {
        alert("فشل إرسال الرمز. حاول مرة أخرى.");
      }
    } else {
      if (otpPwCode !== sentOtpCode) {
        alert("رمز OTP غير صحيح!");
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

  const handleSaveProfile = async () => {
    if (profileForm.lat === undefined || profileForm.lng === undefined) {
      alert("يرجى تحديد موقعك على الخريطة أولاً 📍");
      return;
    }
    try {
      await updateStoreProfile(profileForm);
      setIsProfileDirty(false);
      alert("تم حفظ التعديلات ✅");
    } catch (e: any) {
      alert(e.message || "حدث خطأ أثناء حفظ التعديلات.");
    }
  };

  const handleLogout = () => {
    setCurrentMerchant(null);
    setView("login");
    setActiveTab("home");
    setIsProfileDirty(false);
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
        scanner.clear().catch((e) => console.error("Scanner clear error", e));
      };
    }
  }, [showScanner, products, currentMerchant]);

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
    } else {
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

    let finalEndDate = pEndDate;
    if (pExpiryType === "days") {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + pExpiryDays);
      finalEndDate = expDate.toISOString().split("T")[0];
    }

    const finalStartDate = pStartDate || new Date().toISOString().split("T")[0];

    const data = {
      storeId: currentMerchant!.id,
      code: pCode.toUpperCase().trim(),
      discountType: pDiscountType,
      discountValue: pDiscount,
      maxUses: pMaxUses,
      maxUsesPerUser: pMaxUsesPerUser,
      startDate: finalStartDate,
      expiresAt: finalEndDate,
      source: "merchant",
    };

    try {
      await createPromoCode(data);
      setPromoModal(false);
      setPCode("");
      setPDiscountType("amount");
      setPDiscount(0);
      setPMaxUses(10);
      setPMaxUsesPerUser(1);
      setPExpiryType("days");
      setPStartDate("");
      setPEndDate("");
      setPExpiryDays(30);
    } catch (err) {
      console.error("Error creating promo code:", err);
    }
  };

  const handleSendGift = async (e: React.FormEvent) => {
    e.preventDefault();
    const audId = giftModal.customerId;
    if (!audId) return;

    try {
      if (giftType === "promo") {
        const code = "GIFT-" + Math.floor(100000 + Math.random() * 900000);
        
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + giftExpiryDays);
        const expiresAt = expDate.toISOString().split("T")[0];
        const startDate = new Date().toISOString().split("T")[0];

        const promoData = {
          storeId: currentMerchant!.id,
          code: code,
          discountType: giftDiscountType,
          discountValue: giftAmount,
          maxUses: 1,
          maxUsesPerUser: 1,
          startDate: startDate,
          expiresAt: expiresAt,
          source: "points" as any,
          ownerCustomerId: audId,
        };

        await createPromoCode(promoData);

        await addNotification({
          userId: audId,
          role: "customer",
          title: "هدية خاصة من المتجر! 🎁🎟️",
          message: `أرسل لك متجر ${currentMerchant!.shopName} كود خصم خاص بقيمة ${giftAmount.toLocaleString()} ${giftDiscountType === "amount" ? "د.ع" : "%"}! الرمز: ${code} (صالح للاستخدام لمرة واحدة خلال ${giftExpiryDays} أيام).`,
          type: "promo"
        });

        alert(`تم إرسال كود الخصم الهدية #${code} بنجاح إلى ${giftModal.customerName}! 🎉`);
      } else {
        const selectedProd = products.find(p => p.id === giftProductId);
        if (!selectedProd) {
          alert("الرجاء اختيار منتج صحيح");
          return;
        }

        await addNotification({
          userId: audId,
          role: "customer",
          title: "لقد تلقيت هديّة منتج! 🎁🎉",
          message: `مبروك! لقد أهداك متجر ${currentMerchant!.shopName} منتج: "${selectedProd.name}" مجاناً كرمز تقدير لولائك! توصل مع المتجر لتنسيق الاستلام.`,
          type: "product"
        });

        alert(`تم إرسال هدية المنتج (${selectedProd.name}) بنجاح إلى ${giftModal.customerName}! 🎉`);
      }

      setGiftModal({ show: false, customerId: "", customerName: "" });
      setGiftType("promo");
      setGiftAmount(1000);
      setGiftDiscountType("amount");
      setGiftExpiryDays(30);
      setGiftProductId("");
    } catch (err) {
      console.error("Error sending gift:", err);
      alert("حدث خطأ أثناء إرسال الهدية. يرجى المحاولة لاحقاً.");
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
            setActiveTab('orders');
          } else if (data?.type === 'ratings') {
            setActiveTab('home');
          }
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentMerchant?.id]);

  // ==========================================
  // لوحة التحكم (Dashboard)
  // ==========================================

  if (view === "dashboard" && currentMerchant) {
    const merchantProducts = products.filter(
      (p) => p.storeId === currentMerchant.id,
    );
    const merchantOrders = orders.filter(
      (o) => o.storeId === currentMerchant.id,
    );
    const pendingOrders = merchantOrders.filter((o) => o.status === "pending");
    const merchantPromos = promoCodes.filter(
      (p) => p.storeId === currentMerchant.id,
    );

    return (
      <div className="min-h-screen bg-slate-50 flex">
        {/* Sidebar Desktop */}
        <aside className="hidden md:flex w-64 bg-gradient-to-b from-[#4D2980] to-[#381a66] text-white flex-col fixed right-0 top-0 h-screen z-30 shadow-2xl transition-all">
          <div className="p-6 border-b border-[#9952FF] flex items-center space-x-3 space-x-reverse">
            <div className="p-2 bg-[#9952FF] rounded-xl shadow-lg">
              <StoreIcon className="w-6 h-6" />
            </div>
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
              { id: "home", icon: StoreIcon, label: "الرئيسية" },
              { id: "products", icon: Package, label: "المنتجات" },
              { id: "orders", icon: ClipboardList, label: "الطلبات" },
              { id: "promo", icon: Ticket, label: "الخصومات" },
              { id: "flashsales", icon: Gift, label: "الفعاليات" },
              { id: "customers", icon: Users, label: "زبائني" },
              { id: "profile", icon: User, label: "حسابي" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id as any)}
                className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-xl transition ${activeTab === item.id ? "bg-[#9952FF] text-white shadow-md" : "text-slate-300 hover:bg-[#4D2980]"}`}
              >
                <item.icon size={20} />
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
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around p-2 z-20 shadow-[-0_10px_40px_-15px_rgba(0,0,0,0.1)] overflow-x-auto">
          {[
            { id: "home", icon: StoreIcon, label: "الرئيسية" },
            { id: "products", icon: Package, label: "المنتجات" },
            { id: "orders", icon: ClipboardList, label: "الطلبات" },
            { id: "promo", icon: Ticket, label: "الخصومات" },
            { id: "flashsales", icon: Gift, label: "الفعاليات" },
            { id: "customers", icon: Users, label: "زبائني" },
            { id: "profile", icon: User, label: "حسابي" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id as any)}
              className={`flex flex-col items-center px-2 py-1.5 rounded-xl transition-all ${activeTab === item.id ? "text-[#9952FF]" : "text-slate-400 hover:text-slate-600"}`}
            >
              <div className={`p-1.5 rounded-lg mb-1 transition-all ${activeTab === item.id ? 'bg-[#9952FF] text-white shadow-md' : 'bg-transparent'}`}>
                <item.icon size={18} className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-bold">{item.label}</span>
            </button>
          ))}
        </nav>

        <main className="flex-1 min-w-0 md:mr-64 p-4 md:p-6 lg:p-8 pt-0 md:pt-0 lg:pt-0 pb-24 md:pb-8 text-right w-full overflow-x-hidden">
          {/* Header Mobile / Info Bar */}
          <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-b-2xl md:rounded-2xl shadow-sm border border-slate-100 border-t-0 text-right">
            <div className="flex items-center gap-3 text-right">
              {activeTab !== "home" && (
                <button
                  onClick={() => handleTabChange("home")}
                  className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-[#9952FF] transition-all ml-1 flex items-center justify-center border border-transparent hover:border-slate-100"
                >
                  <ChevronRight size={20} />
                </button>
              )}
              <div className="md:hidden text-right">
                <h1 className="text-sm font-black text-[#4D2980]">
                  {currentMerchant.shopName}
                </h1>
              </div>
              <div className="hidden md:block text-right">
                <span className="text-xs font-bold text-slate-400">
                  لوحة التحكم السحابية - منصة محلك
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3 space-x-reverse relative text-right">
              <button
                onClick={handleManualSync}
                className={`p-2.5 rounded-xl transition-all ${isSyncing ? 'bg-slate-100 text-slate-400 animate-spin' : 'bg-slate-50 text-slate-500 hover:bg-orange-50 hover:text-orange-600'}`}
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
                className="p-2.5 bg-slate-50 text-slate-500 rounded-2xl hover:bg-slate-50 hover:text-[#9952FF] transition relative"
              >
                <BellRing size={20} />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-bounce">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute left-0 top-12 w-72 bg-white rounded-2xl shadow-2xl border border-slate-50 z-50 overflow-hidden animate-fade-in divide-y divide-gray-50 text-right">
                  <div className="p-3 bg-slate-50/50 flex justify-between items-center bg-white border-b text-right">
                    <span className="text-xs font-black text-[#4D2980]">
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
                          <div key={notif.id} className="p-3 hover:bg-slate-50 transition-colors text-right relative cursor-pointer" onClick={() => {
                            if (!notif.read) markNotificationAsRead(notif.id);
                            if (notif.type === 'order') {
                               setActiveTab('orders');
                            }
                            setShowNotifications(false);
                          }}>
                            <div className="flex items-start justify-between">
                              <p className={`text-xs font-black mb-1 ${!notif.read ? 'text-[#9952FF]' : 'text-slate-600'}`}>{notif.title}</p>
                              {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-[#9952FF] mt-1 shrink-0"></span>}
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{notif.message}</p>
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


              {/* قسم الإعلانات الممولة للشركات والخدمات */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* القسم الأول: شركات التوصيل */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-[#4D2980]">
                      <Truck size={20} className="stroke-[2.5]" />
                      <h4 className="text-sm font-black text-[#4D2980]">
                        شركات التوصيل الشريكة 🚚
                      </h4>
                      <span className="text-[9px] font-bold bg-slate-50 text-[#4D2980] px-2 py-0.5 rounded-full mr-auto">ممولة</span>
                    </div>

                    {(adminSettings.merchantDeliveryAds || []).length > 0 ? (
                      <div className="relative overflow-hidden rounded-2xl bg-slate-50 aspect-[2/1] border border-slate-100/50">
                        {(adminSettings.merchantDeliveryAds || []).map((ad: any, idx: number) => (
                          <div
                            key={ad.id}
                            className={`absolute inset-0 transition-opacity duration-500 flex flex-col justify-end ${idx === deliveryAdIndex ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                          >
                            <img src={ad.url || undefined} className="absolute inset-0 w-full h-full object-cover" alt={ad.title} />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                            <div className="relative p-4 text-white text-right z-10">
                              <h5 className="font-black text-sm mb-0.5 drop-shadow-md">{ad.title}</h5>
                              <p className="text-[10px] text-gray-200 line-clamp-2 leading-relaxed mb-2 drop-shadow-sm">{ad.desc}</p>
                              {ad.link && (
                                <a
                                  href={ad.link.startsWith('http') ? ad.link : `tel:${ad.link}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#9952FF] hover:bg-[#9952FF] text-white rounded-lg text-[10px] font-black transition-all active:scale-95"
                                >
                                  <span>تواصل الآن</span>
                                  <MessageCircle size={10} />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                        {/* Indicators */}
                        {(adminSettings.merchantDeliveryAds || []).length > 1 && (
                          <div className="absolute bottom-2 right-2 flex gap-1 z-15">
                            {(adminSettings.merchantDeliveryAds || []).map((_: any, idx: number) => (
                              <button
                                key={idx}
                                onClick={() => setDeliveryAdIndex(idx)}
                                className={`w-1.5 h-1.5 rounded-full transition-all ${idx === deliveryAdIndex ? 'bg-white w-3' : 'bg-white/40'}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      // Empty state
                      <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50 border border-dashed border-gray-150 rounded-2xl aspect-[2/1]">
                        <div className="w-8 h-8 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-2">
                          <Truck size={14} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400">لا توجد إعلانات نشطة حالياً</span>
                        <span className="text-[8px] text-gray-300 mt-1">تواصل مع الإدارة لإضافة عرضك المميز</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* القسم الثاني: شركات التصوير والاعلانات */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-emerald-600">
                      <Camera size={20} className="stroke-[2.5]" />
                      <h4 className="text-sm font-black text-[#4D2980]">
                        تصوير المنتجات وصناعة المحتوى 📸
                      </h4>
                      <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full mr-auto">ممولة</span>
                    </div>

                    {(adminSettings.merchantMediaAds || []).length > 0 ? (
                      <div className="relative overflow-hidden rounded-2xl bg-slate-50 aspect-[2/1] border border-slate-100/50">
                        {(adminSettings.merchantMediaAds || []).map((ad: any, idx: number) => (
                          <div
                            key={ad.id}
                            className={`absolute inset-0 transition-opacity duration-500 flex flex-col justify-end ${idx === mediaAdIndex ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                          >
                            <img src={ad.url || undefined} className="absolute inset-0 w-full h-full object-cover" alt={ad.title} />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                            <div className="relative p-4 text-white text-right z-10">
                              <h5 className="font-black text-sm mb-0.5 drop-shadow-md">{ad.title}</h5>
                              <p className="text-[10px] text-gray-200 line-clamp-2 leading-relaxed mb-2 drop-shadow-sm">{ad.desc}</p>
                              {ad.link && (
                                <a
                                  href={ad.link.startsWith('http') ? ad.link : `tel:${ad.link}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black transition-all active:scale-95"
                                >
                                  <span>تواصل الآن</span>
                                  <MessageCircle size={10} />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                        {/* Indicators */}
                        {(adminSettings.merchantMediaAds || []).length > 1 && (
                          <div className="absolute bottom-2 right-2 flex gap-1 z-15">
                            {(adminSettings.merchantMediaAds || []).map((_: any, idx: number) => (
                              <button
                                key={idx}
                                onClick={() => setMediaAdIndex(idx)}
                                className={`w-1.5 h-1.5 rounded-full transition-all ${idx === mediaAdIndex ? 'bg-white w-3' : 'bg-white/40'}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      // Empty state
                      <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50 border border-dashed border-gray-150 rounded-2xl aspect-[2/1]">
                        <div className="w-8 h-8 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-2">
                          <Camera size={14} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400">لا توجد إعلانات نشطة حالياً</span>
                        <span className="text-[8px] text-gray-300 mt-1">تواصل مع الإدارة لإضافة عرضك المميز</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: "إجمالي الطلبات",
                    val: merchantOrders.length,
                    color: "text-[#9952FF]",
                    tab: "orders"
                  },
                  {
                    label: "بانتظار التحضير",
                    val: pendingOrders.length,
                    color: "text-amber-500",
                    tab: "orders"
                  },
                  {
                    label: "المتابعين",
                    val: customers.filter(c => c.followedStores.includes(currentMerchant.id)).length,
                    color: "text-[#4D2980]",
                    tab: "customers"
                  },
                  {
                    label: "إجمالي المبيعات",
                    val:
                      merchantOrders
                        .filter((o) => o.status === "delivered")
                        .reduce((a, b) => a + b.total, 0)
                        .toLocaleString() + " د.ع",
                    color: "text-emerald-600",
                    tab: "home"
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    onClick={() => { if (s.tab !== 'home') setActiveTab(s.tab as any); }}
                    className={`p-4 rounded-2xl shadow-sm border border-slate-100 bg-white group hover:border-slate-100 transition-colors ${s.tab !== 'home' ? 'cursor-pointer hover:shadow-md' : ''}`}
                  >
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">
                      {s.label}
                    </span>
                    <span className={`text-xl font-black ${s.color}`}>
                      {s.val}
                    </span>
                  </div>
                ))}
              </div>

              {/* قسم مشاركة المتجر */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                  <Share2 size={64} className="text-[#4D2980]" />
                </div>
                <div className="relative">
                  <h4 className="text-lg font-black text-[#4D2980] mb-2">
                    شارك متجرك 📣
                  </h4>
                  <div className="flex items-center gap-1.5 mb-3 bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-xs font-mono text-slate-600 select-all max-w-md">
                    <span className="truncate">https://mahallak.app/store/{currentMerchant?.id}</span>
                    <CopyButton text={`https://mahallak.app/store/${currentMerchant?.id}`} size={11} className="shrink-0" />
                  </div>
                  <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                    قم بمشاركة رابط المتجر الرسمي الخاص بك على منصات التواصل
                    الاجتماعي لجذب المزيد من الزبائن وزيادة مبيعاتك.
                  </p>
                  <button
                    onClick={() => openShareModal("store", currentMerchant)}
                    className="w-full sm:w-auto px-8 py-3 bg-[#9952FF] text-white rounded-2xl font-black text-sm shadow-lg shadow-slate-100 hover:bg-[#9952FF] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Share2 size={18} />
                    مشاركة رابط المتجر
                  </button>
                </div>
              </div>
            </div>
          )}

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
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-100 gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-slate-100 text-slate-700 rounded-2xl">
                              <Package size={22} className="text-[#4D2980]" />
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
                              onClick={() => setShowScanner(true)}
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
                              className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-l from-[#4D2980] to-[#4D2980] text-white font-black rounded-2xl flex items-center justify-center space-x-2 space-x-reverse shadow-md shadow-slate-100 hover:shadow-lg active:scale-95 transition-all text-xs"
                            >
                              <Plus size={16} />
                              <span>إضافة منتج جديد</span>
                            </button>
                          </div>
                        </div>

                        {/* 2. تبويبات الفلترة للمنتجات */}
                        <div className="flex gap-2 p-1.5 bg-white rounded-2xl border border-slate-100 shadow-xs sticky top-0 z-10 font-bold">
                          {["published", "draft", "archived"].map((s) => (
                            <button
                              key={s}
                              onClick={() => {
                                setProductFilterStatus(s as any);
                                setSelectedProductIds([]);
                              }}
                              className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all ${
                                productFilterStatus === s
                                  ? "bg-[#9952FF] text-white shadow-md shadow-slate-100"
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
                        <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                          <div className="p-2 bg-slate-50 text-slate-400 rounded-xl">
                            <Search size={18} className="text-slate-600" />
                          </div>
                          <input
                            type="text"
                            placeholder="ابحث عن منتج بالاسم أو الباركود..."
                            value={productSearchQuery}
                            onChange={(e) => setProductSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-xl text-xs py-2 px-4 focus:ring-1 focus:ring-slate-200 outline-none text-[#4D2980] font-bold"
                          />
                        </div>

                                  {/* 4. ترتيب المنتجات في شبكة GridView متناسقة وسهلة التصفح */}
                        {filteredProductsForView.length === 0 ? (
                          <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
                            <div className="p-4 bg-slate-50 text-slate-400 rounded-full mb-3">
                              <Package size={40} className="text-slate-350" />
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
                                  <div className="flex items-center gap-2.5 bg-[#4D2980]/5 px-4 py-2.5 rounded-2xl border border-[#4D2980]/10 shrink-0 w-fit">
                                    <div className="w-1.5 h-5 bg-gradient-to-b from-[#9952FF] to-[#4D2980] rounded-full" />
                                    <h3 className="font-black text-[#4D2980] text-xs sm:text-sm">
                                      {group.name}
                                    </h3>
                                    <span className="bg-white text-[#9952FF] text-[10px] font-black px-2 py-0.5 rounded-lg border border-purple-100/50">
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

                                          {/* زر خيارات الـ "ثلاث نقاط" (PopupMenuButton) في الزاوية العلوية اليسرى */}
                                          <div className="absolute top-2.5 left-2.5 z-30 product-menu-container">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuProductId(activeMenuProductId === p.id ? null : p.id);
                                              }}
                                              className="p-1.5 bg-white/95 backdrop-blur-xs rounded-xl text-slate-700 shadow-md hover:bg-slate-50 hover:text-[#9952FF] transition-all border border-slate-100/80 active:scale-95"
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
                                                      className="w-full px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 hover:text-[#9952FF] rounded-xl flex items-center justify-start gap-2.5 transition"
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
                                                        className="w-full px-3 py-2 text-xs font-black text-slate-700 hover:bg-[#f5eeff] hover:text-[#9952FF] rounded-xl flex items-center justify-start gap-2.5 transition"
                                                      >
                                                        <Globe size={14} className="text-[#9952FF]" />
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
                                                        className="w-full px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100 hover:text-[#9952FF] rounded-xl flex items-center justify-start gap-2.5 transition"
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
                                              <div className="absolute bottom-2.5 right-2.5 bg-gradient-to-l from-amber-500 to-yellow-500 text-[#4D2980] text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
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
                                                className="font-black text-[#4D2980] text-[11px] sm:text-xs leading-tight line-clamp-2 min-h-[2rem] hover:text-[#9952FF] transition-colors"
                                                title={p.name}
                                              >
                                                {p.name}
                                              </h3>

                                              {/* مؤشر حالة المخزون بأسلوب نظيف */}
                                              <div className="flex items-center gap-1.5 mt-2">
                                                <div
                                                  className={`w-2 h-2 rounded-full ${
                                                    (p.inventory || 0) > 10
                                                      ? "bg-emerald-400"
                                                      : (p.inventory || 0) > 0
                                                        ? "bg-amber-400"
                                                        : "bg-red-400 animate-pulse"
                                                  }`}
                                                ></div>
                                                <span className="text-[10px] font-bold text-slate-400">
                                                  المتوفر: {p.inventory || 0}
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
            </div>
          )}

          {/* الطلبات */}
          {activeTab === "orders" && (() => {
            const displayOrdersList = (targetOrderId 
              ? merchantOrders.filter(o => o.id === targetOrderId)
              : merchantOrders.filter(
                  (o) =>
                    o.status === orderFilter ||
                    (orderFilter === "returned" && o.status === "replaced") ||
                    (orderFilter === "rejected" && o.status === "cancelled"),
                )
            ).sort((a, b) => {
              const seqA = parseInt(getOrderSeqId(a.id)) || 999999;
              const seqB = parseInt(getOrderSeqId(b.id)) || 999999;
              return seqA - seqB; // تصاعدياً من رقم 1 كما هو مطلوب
            });

            return (
              <div className="space-y-4 sm:space-y-6 min-w-0 w-full">
              {/* تتبع الطلب المحدد من الإشعارات */}
              {targetOrderId && (
                <div className="bg-slate-50 border border-slate-100 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between text-right shadow-2xs min-w-0">
                  <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-600"></span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-black text-[#4D2980] font-tajawal block truncate" title="عرض تفاصيل الطلب المحدد من الإشعارات">عرض تفاصيل الطلب المحدد من الإشعارات</span>
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

              {/* شريط الفرز المطور */}
              <div className="bg-white p-1.5 sm:p-2 rounded-2xl shadow-sm border flex gap-1 sm:gap-2 overflow-x-auto no-scrollbar w-full relative min-w-0 snap-x">
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
                        ? "bg-[#9952FF] text-white shadow-sm border-[#4D2980]"
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 border-slate-100"
                    }`}
                  >
                    {f.label} <span className={`inline-flex items-center justify-center min-w-[20px] h-5 rounded-md px-1 ml-1 ${orderFilter === f.id && !targetOrderId ? 'bg-white/20' : 'bg-slate-200 text-slate-700'}`}>{f.count}</span>
                  </button>
                ))}
              </div>

              {displayOrdersList.length === 0 ? (
                <div className="py-20 text-center text-slate-300 bg-white rounded-[3rem] border border-dashed border-slate-200">
                  <ClipboardList
                    size={48}
                    className="mx-auto mb-4 opacity-20"
                  />
                  <p className="font-bold">لا توجد طلبات في هذا القسم حالياً</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 w-full">
                  {displayOrdersList.map((o) => (
                      <div
                        key={o.id}
                        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md min-w-0 w-full"
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
                            <h3 className="text-sm font-black text-[#4D2980] flex items-center gap-1 truncate" title={o.customerName}>
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
                            <div className="text-sm font-black text-[#4D2980]">
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
                                  <div className="flex gap-2 mt-1.5">
                                    <a 
                                      href={`https://www.google.com/maps/search/?api=1&query=${(o as any).customerLat},${(o as any).customerLng}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-[8px] font-black bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded shadow-sm hover:bg-slate-50 transition-colors"
                                    >
                                      <MapPin size={10} className="text-red-500" />
                                      Maps
                                    </a>
                                    <a 
                                      href={`https://waze.com/ul?ll=${(o as any).customerLat},${(o as any).customerLng}&navigate=yes`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-[8px] font-black bg-[#f2fcfed9] border border-[#c2f2ff] text-[#00a9e0] px-2 py-0.5 rounded shadow-sm hover:bg-[#e6faff] transition-colors"
                                    >
                                      <Car size={10} />
                                      Waze
                                    </a>
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
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="w-5 h-5 bg-slate-100 rounded text-[9px] font-black text-slate-600 flex items-center justify-center shrink-0">
                                      {it.quantity}
                                    </span>
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
                            {(o.rejectionReason || o.returnReason || o.status === "cancelled") && (
                              <div className="mt-3 p-2 bg-rose-50 rounded-lg border border-rose-100 text-[9px] font-bold text-rose-600 truncate">
                                {o.status === "cancelled" ? "تم إلغاء الطلب تلقائياً من قبل الزبون خلال 30 ثانية ⚠️" : o.rejectionReason ? `رفض: ${o.rejectionReason}` : `إرجاع/استبدال: ${o.returnReason}`}
                              </div>
                            )}
                          </div>

                          {/* الأزرار (أفقية في الموبايل، عمودية في الشاشات الكبيرة) */}
                          <div className="p-3 sm:p-4 bg-slate-50/50 border-t md:border-t-0 md:border-r border-slate-100 flex flex-row md:flex-col gap-2 shrink-0 md:w-32 justify-center">
                            {o.status === "pending" && (
                              <>
                                <button onClick={() => updateOrderStatus(o.id, "accepted")} className="flex-1 py-2 bg-[#9952FF] text-white rounded-xl font-black text-[10px] flex items-center justify-center gap-1.5 hover:bg-slate-700 active:scale-95 transition-all w-full">
                                  <Check size={14} /> قبول
                                </button>
                                <button onClick={() => setActionModal({ show: true, orderId: o.id, type: "rejected" })} className="flex-1 py-2 bg-white text-rose-500 border border-slate-200 rounded-xl font-black text-[10px] flex items-center justify-center gap-1.5 hover:bg-rose-50 active:scale-95 transition-all w-full">
                                  <X size={14} /> رفض
                                </button>
                              </>
                            )}
                            {o.status === "accepted" && (
                              <button onClick={() => updateOrderStatus(o.id, "shipped")} className="flex-1 py-2 bg-amber-500 text-white rounded-xl font-black text-[10px] flex items-center justify-center gap-1.5 hover:bg-amber-600 active:scale-95 transition-all w-full">
                                <Truck size={14} /> شحن
                              </button>
                            )}
                            {o.status === "shipped" && (
                              <>
                                <button onClick={() => updateOrderStatus(o.id, "delivered")} className="flex-[2] py-2 bg-emerald-500 text-white rounded-xl font-black text-[10px] flex items-center justify-center gap-1 hover:bg-emerald-600 active:scale-95 transition-all w-full">
                                  <CheckCircle size={14} /> وصل
                                </button>
                                <div className="flex gap-1.5 w-full">
                                  <button onClick={() => setReplacementModal({ show: true, orderId: o.id, originalItems: o.items })} className="flex-1 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl font-black text-[9px] hover:bg-slate-50 active:scale-95 w-full">
                                    تبديل
                                  </button>
                                  <button onClick={() => handleReturnOrder(o.id)} className="flex-1 py-2 bg-white text-rose-500 border border-rose-200 rounded-xl font-black text-[9px] hover:bg-rose-50 active:scale-95 w-full">
                                    إرجاع
                                  </button>
                                </div>
                              </>
                            )}
                            <button onClick={() => { setSelectedInvoice(o); setShowInvoiceModal(true); }} className="flex-1 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl font-black text-[10px] flex items-center justify-center gap-1.5 hover:bg-slate-50 active:scale-95 transition-all mt-auto w-full">
                              <FileText size={14} /> فاتورة
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
            );
          })()}

          {/* الخصومات */}
          {activeTab === "promo" && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold">أكواد الخصم 🎫</h2>
                </div>
                <button
                  onClick={() => setPromoModal(true)}
                  className="px-4 py-2 bg-[#9952FF] text-white font-bold rounded-xl shadow-md flex items-center space-x-2 space-x-reverse"
                >
                  <Plus size={18} />
                  <span>إنشاء كود</span>
                </button>
              </div>
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
            </div>
          )}

          {/* زبائني */}
          {activeTab === "customers" && (
            <div className="space-y-6 text-right">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border text-center shadow-sm">
                  <Users size={24} className="text-[#4D2980] mx-auto mb-2" />
                  <span className="text-2xl font-black">
                    {
                      customers.filter((c) =>
                        c.followedStores.includes(currentMerchant.id),
                      ).length
                    }
                  </span>
                  <span className="text-xs text-slate-400 block font-bold">
                    المتابعين
                  </span>
                </div>
                <div className="bg-white p-5 rounded-2xl border text-center shadow-sm">
                  <BellRing size={24} className="text-rose-500 mx-auto mb-2" />
                  <span className="text-2xl font-black">
                    {
                      customers.filter((c) =>
                        c.storeNotifications.includes(currentMerchant.id),
                      ).length
                    }
                  </span>
                  <span className="text-xs text-slate-400 block font-bold">
                    الإشعارات
                  </span>
                </div>
                <div className="bg-white p-5 rounded-2xl border text-center shadow-sm col-span-2">
                  <ClipboardList
                    size={24}
                    className="text-emerald-500 mx-auto mb-2"
                  />
                  <span className="text-2xl font-black">
                    {
                      Array.from(
                        new Set(
                          orders
                            .filter((o) => o.storeId === currentMerchant.id)
                            .map((o) => o.customerId),
                        ),
                      ).length
                    }
                  </span>
                  <span className="text-xs text-slate-400 block font-bold">
                    زبائن قاموا بالطلب
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
                <div className="p-4 border-b bg-slate-50 font-black text-[#4D2980] flex justify-between items-center sm:flex-row flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span>قائمة الجمهور (المتابعين والزبائن)</span>
                    <span className="text-[10px] text-[#4D2980] bg-slate-50 px-3 py-1 rounded-full uppercase">
                      إدارة الجمهور
                    </span>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search
                      size={18}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="بحث بالاسم، الهاتف، المعرف..."
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                      value={audienceSearchQuery}
                      onChange={(e) => setAudienceSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-3.5">
                  {(() => {
                    const orderedCustomerIds = Array.from(
                      new Set(
                        orders
                          .filter((o) => o.storeId === currentMerchant.id)
                          .map((o) => o.customerId),
                      ),
                    );
                    let audience = customers.filter(
                      (c) =>
                        c.followedStores.includes(currentMerchant.id) ||
                        c.storeNotifications.includes(currentMerchant.id) ||
                        orderedCustomerIds.includes(c.id),
                    );
                    
                    if (audienceSearchQuery.trim()) {
                       const q = audienceSearchQuery.toLowerCase();
                       audience = audience.filter(c => 
                         c.name.toLowerCase().includes(q) ||
                         c.phone.includes(q) ||
                         c.id.toLowerCase().includes(q)
                       );
                    }

                    // ترتيب زبائن المتجر تصاعدياً حسب تسلسل تسجيلهم بالتطبيق من رقم 1 تصاعدياً
                    audience.sort((a, b) => {
                      const seqA = parseInt(getCustomerSeqId(a.id)) || 999999;
                      const seqB = parseInt(getCustomerSeqId(b.id)) || 999999;
                      return seqA - seqB;
                    });

                    if (audience.length === 0) {
                      return (
                        <div className="col-span-full p-10 text-center text-slate-400 font-bold bg-white rounded-xl border border-slate-100">
                          لا يوجد نتائج مطابقة للبحث أو لا تملك جمهوراً حالياً.
                        </div>
                      );
                    }

                    return audience.map((c) => (
                      <div
                        key={c.id}
                        className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col hover:shadow-md hover:border-slate-300 transition-all cursor-pointer min-w-0"
                        onClick={() => setSelectedAudienceId(c.id)}
                      >
                        <div className="flex justify-between items-start mb-3 min-w-0">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-black text-[#4D2980] text-sm truncate flex items-center gap-1" title={c.name}>
                              <span>{c.name}</span>
                              <CopyButton text={c.name} size={10} />
                            </h4>
                            <span className="text-[10px] font-mono text-purple-600 inline-flex items-center gap-1 leading-none mt-1 select-all" title={c.id}>
                              <span>ID: #{getCustomerSeqId(c.id)}</span>
                              <CopyButton text={getCustomerSeqId(c.id)} size={9} />
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 line-clamp-1 truncate mt-1 flex items-center gap-1" title={c.phone}>
                              <span>{c.phone}</span>
                              <CopyButton text={c.phone} size={9} />
                              <span>• {c.province}</span>
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-md font-black text-[9px] shadow-sm shrink-0 mr-2 ${
                              c.tier === "Diamond"
                                ? "bg-[#9952FF] text-white"
                                : c.tier === "Platinum"
                                  ? "bg-[#9952FF] text-white"
                                  : c.tier === "Gold"
                                    ? "bg-amber-400 text-amber-900"
                                    : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {c.tier}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-end mt-auto pt-3 border-t border-slate-50 min-w-0">
                          <div className="text-[10px] text-slate-500 font-bold bg-slate-50 px-2 py-1 rounded truncate">
                            {c.followedStores.includes(currentMerchant.id)
                              ? "متابع للمتجر"
                              : orderedCustomerIds.includes(c.id)
                                ? "قام بالطلب مسبقاً"
                                : "مهتم بالإشعارات"}
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setGiftModal({
                                show: true,
                                customerId: c.id,
                                customerName: c.name,
                              });
                            }}
                            className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-all font-bold text-[9px] flex items-center justify-center gap-1.5 shrink-0"
                            title="إرسال خصم خاص (هدية)"
                          >
                            <Gift size={14} />
                            <span>هدية</span>
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* تغيير كلمة المرور - مودال */}
          {showPasswordChange && (
            <div className="fixed inset-0 bg-[#4D2980]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
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
                  <div className="w-16 h-16 bg-slate-50 text-[#4D2980] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Shield size={32} />
                  </div>
                  <h3 className="text-xl font-black text-[#4D2980]">تغيير كلمة المرور</h3>
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
                        className="w-full py-4 bg-[#9952FF] text-white rounded-2xl text-sm font-black shadow-lg shadow-slate-100 hover:bg-[#9952FF] transition-all active:scale-[0.98]"
                      >
                        إرسال الرمز (OTP)
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-[#4D2980] uppercase tracking-widest px-1 mb-2">رمز التحقق (OTP)</label>
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
                        <label className="block text-[10px] font-black text-[#4D2980] uppercase tracking-widest px-1 mb-2">كلمة المرور الجديدة</label>
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
                        className="w-full py-4 bg-[#9952FF] text-white rounded-2xl text-sm font-black shadow-lg shadow-slate-100 hover:bg-[#9952FF] transition-all active:scale-[0.98]"
                      >
                        تحديث كلمة المرور
                      </button>
                      <button 
                        type="button"
                        onClick={() => setPwStep(1)}
                        className="w-full py-3 text-slate-400 text-xs font-black hover:text-[#9952FF] transition-colors"
                      >
                        لم يصلك الرمز؟ أعد الإرسال
                      </button>
                    </div>
                  )}
                </form>
              </motion.div>
            </div>
          )}

          {/* الهوية الرقمية QR */}
          {activeTab === "flashsales" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-l from-yellow-50 to-white rounded-2xl border shadow-sm p-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Zap size={100} className="text-yellow-500" />
                </div>
                <div className="relative z-10 text-right">
                  <h3 className="font-black text-2xl text-[#4D2980] flex items-center space-x-2 space-x-reverse mb-2">
                    <Zap size={24} className="text-yellow-500" />
                    <span>الفعاليات المركزية (Flash Sales)</span>
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm">
                    شارك بمنتجاتك في الفعاليات المركزية وحقق مبيعات ضخمة خلال
                    فترة قصيرة!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {flashSales.filter((s) => s.status !== "ended" && s.status !== "paused").length === 0 ? (
                  <div className="bg-white p-12 rounded-2xl border shadow-sm text-center">
                    <Gift size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="font-bold text-slate-400">
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
                          className="bg-white rounded-2xl border shadow-sm p-6"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-black text-lg text-[#4D2980]">
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
                                className="font-mono text-[#4D2980]"
                                dir="ltr"
                              >
                                {formatSafeDateTimeString(sale.startTime)}
                              </span>
                            </div>
                            <div>
                              ينتهي:{" "}
                              <span
                                className="font-mono text-[#4D2980]"
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
                                  className="px-3 py-1 bg-slate-50 text-[#4D2980] rounded-lg font-bold text-[10px] hover:bg-slate-100 transition"
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
                                      <h6 className="font-black text-[11px] text-[#4D2980]">
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
          )}

          {/* حسابي */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-gradient-to-l from-slate-50 to-white flex items-center space-x-3 space-x-reverse">
                  <div className="p-2 bg-slate-100 text-[#4D2980] rounded-xl">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-[#4D2980]">
                      البيانات الشخصية
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      يمكنك تعديل أي شيء ما عدا رقم الهاتف واسم المستخدم
                    </p>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        اسم المالك *
                      </label>
                      <input
                        type="text"
                        value={profileForm.ownerName}
                        onChange={(e) =>
                          handleProfileFormChange({ ownerName: e.target.value })
                        }
                        className="w-full border border-slate-200 p-2.5 rounded-2xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        اسم المتجر *
                      </label>
                      <input
                        type="text"
                        value={profileForm.shopName}
                        onChange={(e) =>
                          handleProfileFormChange({ shopName: e.target.value })
                        }
                        className="w-full border border-slate-200 p-2.5 rounded-2xl text-sm"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        صنف المتجر *
                      </label>
                      <select
                        value={profileForm.category}
                        onChange={(e) =>
                          handleProfileFormChange({ category: e.target.value })
                        }
                        className="w-full border border-slate-200 p-2.5 rounded-2xl text-sm bg-white"
                      >
                        {STORE_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        رقم الهاتف
                      </label>
                      <input
                        type="tel"
                        value={currentMerchant.phone}
                        disabled
                        className="w-full border bg-slate-50 p-2.5 rounded-2xl text-sm text-slate-400 font-mono mb-2"
                      />
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={profileForm.showPhone} onChange={(e) => handleProfileFormChange({ showPhone: e.target.checked })} className="rounded text-[#9952FF] focus:ring-[#9952FF]" />
                        <span className="text-xs">إظهار عند الزبون</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        اسم المستخدم (يمكن تغييره مرة كل 30 يوماً)
                      </label>
                      <input
                        type="text"
                        value={profileForm.username}
                        onChange={(e) => handleProfileFormChange({ username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "") })}
                        className="w-full border bg-white p-2.5 rounded-2xl text-sm font-mono"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        المحافظة *
                      </label>
                      <select
                        value={profileForm.province}
                        onChange={(e) =>
                          handleProfileFormChange({ province: e.target.value })
                        }
                        className="w-full border border-slate-200 p-2.5 rounded-2xl text-sm bg-white"
                      >
                        {provinces.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        المنطقة / الحي *
                      </label>
                      <input
                        type="text"
                        value={profileForm.area}
                        onChange={(e) =>
                          handleProfileFormChange({ area: e.target.value })
                        }
                        className="w-full border border-slate-200 p-2.5 rounded-2xl text-sm mb-2"
                      />
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={profileForm.showArea} onChange={(e) => handleProfileFormChange({ showArea: e.target.checked })} className="rounded text-[#9952FF] focus:ring-[#9952FF]" />
                        <span className="text-xs">إظهار عند الزبون</span>
                      </label>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        أقرب نقطة دالة *
                      </label>
                      <input
                        type="text"
                        value={profileForm.landmark}
                        onChange={(e) =>
                          handleProfileFormChange({ landmark: e.target.value })
                        }
                        className="w-full border border-slate-200 p-2.5 rounded-2xl text-sm mb-2"
                      />
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={profileForm.showLandmark} onChange={(e) => handleProfileFormChange({ showLandmark: e.target.checked })} className="rounded text-[#9952FF] focus:ring-[#9952FF]" />
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
                        height="h-48"
                        required={true}
                      />
                      <label className="flex items-center gap-2 cursor-pointer mt-2">
                        <input type="checkbox" checked={profileForm.showMap} onChange={(e) => handleProfileFormChange({ showMap: e.target.checked })} className="rounded text-[#9952FF] focus:ring-[#9952FF]" />
                        <span className="text-xs">إظهار عند الزبون</span>
                      </label>
                    </div>

                    <div className="md:col-span-2 grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          سعر التوصيل (د.ع)
                        </label>
                        <input
                          type="number"
                          value={profileForm.deliveryPrice}
                          onChange={(e) =>
                            handleProfileFormChange({
                              deliveryPrice: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full border border-slate-200 p-2.5 rounded-2xl text-sm"
                        />
                      </div>
                      <div className="flex items-end pb-1">
                        <button
                          onClick={() =>
                            handleProfileFormChange({
                              isFreeDelivery: !profileForm.isFreeDelivery,
                            })
                          }
                          className={`w-full py-2.5 rounded-2xl text-xs font-black transition-all border ${
                            profileForm.isFreeDelivery
                              ? "bg-emerald-500 text-white border-emerald-400"
                              : "bg-white text-slate-400 border-slate-200"
                          }`}
                        >
                          توصيل مجاني للكل:{" "}
                          {profileForm.isFreeDelivery ? "مفعل ✅" : "معطل ❌"}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="max-w-[120px] mx-auto">
                    <ImageUploader
                      value={profileForm.logo}
                      onChange={(url) => handleProfileFormChange({ logo: url })}
                      label="لوغو المحل (اختياري)"
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
                    className="w-full py-3 bg-[#9952FF] text-white font-bold rounded-2xl shadow-lg flex items-center justify-center space-x-2 space-x-reverse"
                  >
                    <Check size={18} />
                    <span>حفظ التعديلات</span>
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#4D2980]">الدعم الفني</h3>
                  <p className="text-xs text-slate-400">تواصل معنا عبر واتساب</p>
                </div>
                <a
                  href="https://wa.me/9647735187868"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-green-500 text-white rounded-2xl shadow-md"
                >
                  <Phone size={20} />
                </a>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-4 bg-red-50 text-red-500 font-bold rounded-2xl border border-red-100 flex items-center justify-center space-x-2 space-x-reverse"
              >
                <LogOut size={20} />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          )}
        </main>

        {/* Modal: طلب مشاركة في الفعالية */}
        {joinFlashSaleData && (
          <div className="fixed inset-0 bg-[#4D2980]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in">
              <div className="flex justify-between items-center mb-4 pb-3 border-b">
                <h3 className="font-black text-[#4D2980] flex items-center gap-2">
                  <Zap size={18} className="text-yellow-500" /> المشاركة بمنتج
                </h3>
                <button onClick={() => setJoinFlashSaleData(null)}>
                  <X size={20} className="text-slate-400 hover:text-[#9952FF]" />
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
                  className="w-full py-3 bg-[#9952FF] text-white font-bold rounded-2xl shadow-lg transition hover:bg-[#9952FF] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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
            <div className="fixed inset-0 bg-[#4D2980]/40 backdrop-blur-md z-[80] flex items-center justify-center p-4">
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
                  <h3 className="text-xl font-black text-center text-[#4D2980] mb-2">
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
            <div className="fixed inset-0 bg-[#4D2980]/45 backdrop-blur-md z-[120] flex items-center justify-center p-4">
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
                  <h3 className="text-xl font-black text-center text-[#4D2980] mb-2">
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
                          console.error("Error blocking:", err);
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
          <div className="fixed inset-0 bg-[#4D2980]/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-6 sm:p-8 shadow-2xl h-[90vh] overflow-y-auto animate-scale-in text-right">
              {/* رأس المودال الإحترافي */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-[#4D2980] flex items-center gap-2">
                    <span className="w-2.5 h-6 bg-[#9952FF] rounded-full block"></span>
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
                      onClick={() => setShowBgRemoverModal(true)}
                      className="mt-2.5 py-2 px-3 bg-violet-50 hover:bg-violet-100 border border-violet-100 text-[#4D2980] hover:text-violet-900 text-[10px] font-black rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs w-full"
                    >
                      <Sparkles size={12} className="animate-pulse text-[#9952FF]" />
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
                      className="w-full border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-bold text-[#4D2980] focus:bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all shadow-xs"
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
                      className="w-full border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-black text-[#4D2980] focus:bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all shadow-xs"
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
                      className="w-full border border-slate-200 px-4 py-3 rounded-2xl text-sm font-black text-[#4D2980] focus:ring-2 focus:ring-slate-500 outline-none focus:border-slate-500 shadow-xs"
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
                      <Ticket size={14} className="text-[#4D2980]" /> تطبيق خصم مباشر
                    </h4>
                    <select
                      value={prodDiscountType}
                      onChange={(e) => {
                        setProdDiscountType(e.target.value as any);
                        setProdDiscountValue(0);
                      }}
                      className="w-full border border-slate-200 p-2.5 rounded-2xl text-xs bg-white text-[#4D2980] font-bold outline-none"
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
                                ? "bg-[#9952FF] text-white border-[#9952FF]"
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
                      <span className="text-xs font-black text-[#4D2980]">📋 معلومات إضافية متقدمة</span>
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
                            className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-[#4D2980] focus:ring-1 focus:ring-slate-500 outline-none"
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
                            className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-[#4D2980] focus:ring-1 focus:ring-slate-500 outline-none"
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
                              className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-[#4D2980] outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">مدة الضمان</label>
                            <input
                              type="text"
                              value={prodWarranty}
                              onChange={(e) => setProdWarranty(e.target.value)}
                              placeholder="مثال: سنة واحدة"
                              className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-[#4D2980] outline-none"
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
                            className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-[#4D2980] outline-none"
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
                    className="w-full py-4 px-6 bg-gradient-to-l from-[#4D2980] to-[#4D2980] hover:from-slate-700 hover:to-[#4D2980] text-white font-black text-sm rounded-2xl shadow-lg shadow-slate-100 hover:shadow-xl hover:shadow-slate-200 transition-all flex items-center justify-center gap-2"
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
          <div className="fixed inset-0 bg-[#4D2980]/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-scale-in text-right">
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-xl text-[#4D2980]">
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
                              : "border-purple-500 bg-purple-50 text-[#9952FF] font-extrabold scale-105 shadow-sm"
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
                    className="flex-1 py-4 bg-[#9952FF] text-white font-black rounded-2xl shadow-xl shadow-slate-100 hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
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
          <div className="fixed inset-0 bg-[#4D2980]/80 backdrop-blur-sm z-[60] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl animate-fade-in relative">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                <h3 className="font-black text-[#4D2980] flex items-center gap-2">
                  <Camera size={18} /> الجرد الذكي
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
                  سيتم فتح صفحة المنتج تلقائياً للتعديل
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal: إنشاء بروموكود */}
        <AnimatePresence>
          {promoModal && (
            <div className="fixed inset-0 bg-[#4D2980]/40 backdrop-blur-md z-[110] flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
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
                    <div className="w-12 h-12 bg-purple-50 text-[#9952FF] rounded-2xl flex items-center justify-center border border-purple-100 shrink-0">
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
                        className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-[#9952FF] focus:ring-4 focus:ring-purple-50 p-4 rounded-2xl font-mono text-center text-lg font-black uppercase tracking-widest text-[#4D2980] transition-all"
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
                          className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-[#9952FF] p-3.5 rounded-2xl text-xs font-bold text-slate-700 appearance-none focus:outline-none focus:ring-4 focus:ring-purple-50 transition-all cursor-pointer"
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
                          className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-[#9952FF] focus:ring-4 focus:ring-purple-50 p-3.5 rounded-2xl text-center text-xs font-black text-slate-800 transition-all"
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
                          className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-[#9952FF] focus:ring-4 focus:ring-purple-50 p-3.5 rounded-2xl text-center text-xs font-black text-slate-800 transition-all"
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
                          className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-[#9952FF] focus:ring-4 focus:ring-purple-50 p-3.5 rounded-2xl text-center text-xs font-black text-slate-800 transition-all"
                        />
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-300">
                          <User size={14} />
                        </div>
                      </div>
                    </div>
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
                          className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-[#9952FF] p-3 rounded-2xl text-xs font-bold text-slate-700 appearance-none focus:outline-none focus:ring-4 focus:ring-purple-50 transition-all cursor-pointer"
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
                            className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-[#9952FF] focus:ring-4 focus:ring-purple-50 p-3 rounded-2xl text-center text-xs font-black text-slate-800 transition-all"
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
                              className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-[#9952FF] p-2.5 rounded-xl text-center text-xs font-bold text-slate-700 transition-all"
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
                              className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-[#9952FF] p-2.5 rounded-xl text-center text-xs font-bold text-slate-700 transition-all"
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
                      className="w-2/3 py-3.5 bg-gradient-to-r from-[#9952FF] to-[#8033FF] hover:from-[#8033FF] hover:to-[#6B24E2] active:scale-[0.98] text-white font-black rounded-2xl shadow-lg shadow-purple-100/50 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
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
          <div className="fixed inset-0 bg-[#4D2980]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden text-right p-8 border border-slate-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-[#4D2980]">
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
                        className="w-full p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-[#9952FF] rounded-2xl text-right font-black text-[10px] transition-all border border-slate-50"
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
                    className="w-full mt-3 py-3 bg-[#9952FF] text-white rounded-xl font-black text-xs disabled:opacity-50 shadow-lg shadow-slate-100"
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
          <div className="fixed inset-0 bg-[#4D2980]/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden text-right flex flex-col max-h-[85vh] border border-slate-100"
            >
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <h3 className="text-xl font-black text-[#4D2980]">استبدال المنتج 🔄</h3>
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
                              ? 'bg-[#9952FF] border-[#9952FF] text-white shadow-lg'
                              : 'bg-slate-50 border-slate-100 text-[#4D2980] hover:bg-slate-100'
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
                            <p className="font-black text-xs text-[#4D2980] line-clamp-1">{p.name}</p>
                            <p className="text-[10px] font-bold text-[#4D2980] mt-1">{p.finalPrice.toLocaleString()} د.ع</p>
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
                        <p className="font-black text-sm text-[#4D2980]">{replacementProduct.name}</p>
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
                  className="w-full py-4 bg-[#9952FF] text-white rounded-2xl font-black text-sm disabled:opacity-30 disabled:grayscale transition-all shadow-xl shadow-slate-100 flex items-center justify-center gap-3 active:scale-[0.98]"
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
            <div className="fixed inset-0 bg-[#4D2980]/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 text-right">
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
                  <h3 className="text-xl font-black text-[#4D2980]">تأكيد إرجاع الطلب</h3>
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
                   <div className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${skipReturnConfirm ? 'bg-[#9952FF] border-[#9952FF]' : 'bg-white border-slate-200 group-hover:border-slate-300'}`}>
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
                        onClick={() => handleShareWhatsAppInvoice(selectedInvoice)}
                        className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg hover:bg-emerald-600 transition-all flex items-center gap-2 text-xs font-black"
                     >
                       <MessageCircle size={18} />
                       <span>واتساب</span>
                     </button>
                     <button
                        onClick={handlePrint}
                        className="p-3 bg-[#9952FF] text-white rounded-2xl shadow-lg hover:bg-[#9952FF] transition-all flex items-center gap-2 text-xs font-black"
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
                  <div 
                    ref={invoiceRef}
                    className="p-10 bg-white min-h-[600px] text-right font-sans"
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
                        <h2 className="text-2xl font-black text-[#4D2980]">{currentMerchant?.shopName || currentMerchant?.ownerName}</h2>
                        <p className="text-xs font-bold text-slate-400 mt-1">{"متجركم المفضل"}</p>
                      </div>
                      <div className="text-left" dir="ltr">
                        <h1 className="text-4xl font-black text-slate-200 uppercase tracking-widest mb-4">INVOICE</h1>
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-slate-400 flex items-center justify-end gap-1">
                            <span>رقم الفاتورة: </span>
                            <span className="text-[#4D2980]">#{getOrderSeqId(selectedInvoice.id)}</span>
                            <CopyButton text={getOrderSeqId(selectedInvoice.id)} size={9} className="print:hidden" />
                          </div>
                          <p className="text-[10px] font-black text-slate-400">التاريخ: <span className="text-[#4D2980]">{formatSafeDateTimeString(selectedInvoice.createdAt, 'ar-IQ', { dateStyle: 'short', timeStyle: 'short' })}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Customer & Merchant Details */}
                    <div className="grid grid-cols-2 gap-8 mb-10">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-3 border-r-4 border-slate-500 pr-3">مستلم الفاتورة:</p>
                        <p className="text-sm font-black text-[#4D2980] mb-1 flex items-center gap-1">
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
                          <div className="flex gap-2">
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${(selectedInvoice as any).customerLat},${(selectedInvoice as any).customerLng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[9px] font-black bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                            >
                              <MapPin size={12} className="text-red-500" />
                              خرائط جوجل (Google Maps)
                            </a>
                            <a 
                              href={`https://waze.com/ul?ll=${(selectedInvoice as any).customerLat},${(selectedInvoice as any).customerLng}&navigate=yes`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[9px] font-black bg-[#f2fcfed9] border border-[#c2f2ff] text-[#00a9e0] px-2 py-1 rounded-lg shadow-sm hover:bg-[#e6faff] transition-colors"
                            >
                              <Car size={12} />
                              خرائط ويز (Waze)
                            </a>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-3 border-r-4 border-slate-200 pr-3">المصدر:</p>
                        <p className="text-sm font-black text-[#4D2980] mb-1">{currentMerchant?.shopName || currentMerchant?.ownerName}</p>
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
                          <span className="font-bold text-slate-400">المجموع الفرعي:</span>
                          <span className="font-black text-slate-600">{(selectedInvoice.subtotal || 0).toLocaleString()} د.ع</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-400">سعر التوصيل:</span>
                          <span className="font-black text-slate-600">{(selectedInvoice.deliveryPrice || 0).toLocaleString()} د.ع</span>
                        </div>
                        {selectedInvoice.discountAmount > 0 && (
                          <div className="flex justify-between items-center text-xs text-emerald-600">
                            <span className="font-bold">خصم الكود:</span>
                            <span className="font-black">- {selectedInvoice.discountAmount.toLocaleString()} د.ع</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center p-4 bg-[#9952FF] rounded-2xl text-white shadow-xl shadow-slate-100">
                          <span className="text-xs font-black uppercase">الإجمالي النهائي:</span>
                          <span className="text-lg font-black">{(selectedInvoice.total || 0).toLocaleString()} د.ع</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Note */}
                    <div className="mt-16 text-center">
                      <p className="text-[10px] font-bold text-slate-400 italic">شكراً لاختياركم {currentMerchant?.shopName || currentMerchant?.ownerName}! نأمل رؤيتكم مرة أخرى قريباً.</p>
                      <div className="w-16 h-1 bg-slate-100 mx-auto mt-4 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {showPasswordChange && (
          <div className="fixed inset-0 bg-[#4D2980]/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-in text-right">
              <div className="flex justify-between items-center mb-6 pb-2 border-b">
                <h3 className="font-black text-[#4D2980]">تغيير كلمة المرور</h3>
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
                        const code = Math.floor(
                          100000 + Math.random() * 900000,
                        ).toString();
                        setSentOtpCode(code);
                        const ok = await sendOTP(currentMerchant.phone, code, "forgot");
                        if (ok) {
                          setPwStep(2);
                          alert("تم إرسال رمز التحقق إلى واتساب!");
                        } else {
                          alert("فشل الإرسال. يرجى المحاولة لاحقاً");
                        }
                      }}
                      className="w-full py-3 bg-[#9952FF] text-white font-bold rounded-2xl shadow-md"
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
                          e.target.value.replace(/\D/g, "").slice(0, 6),
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
                      onClick={() => {
                        if (
                          otpPwCode === sentOtpCode &&
                          newPassword.length >= 8
                        ) {
                          updateStoreProfile({ password: newPassword });
                          setCurrentMerchant({ ...(currentMerchant as any), password: newPassword });
                          setShowPasswordChange(false);
                          setTimeout(() => alert("تم التغيير ✅"), 100);
                        } else {
                          alert("الرمز أو كلمة المرور غير صحيحة");
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
          <div className="fixed inset-0 bg-[#4D2980]/50 backdrop-blur-sm z-[115] flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
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
                          ? "bg-purple-50 border-[#9952FF] text-[#9952FF] shadow-sm"
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
                          ? "bg-purple-50 border-[#9952FF] text-[#9952FF] shadow-sm"
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
                            className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-[#9952FF] p-3 text-xs font-bold text-slate-700 appearance-none focus:outline-none focus:ring-4 focus:ring-purple-50 transition-all cursor-pointer"
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
                            className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-[#9952FF] focus:ring-4 focus:ring-purple-50 p-3 text-center text-xs font-black text-slate-800 transition-all"
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
                          className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-[#9952FF] focus:ring-4 focus:ring-purple-50 p-3 text-center text-xs font-black text-slate-800 transition-all"
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
                          className="w-full bg-white border border-slate-200 hover:border-purple-200 focus:border-[#9952FF] p-3 text-xs font-bold text-slate-700 appearance-none focus:outline-none focus:ring-4 focus:ring-purple-50 transition-all cursor-pointer"
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
                    className="w-2/3 py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-[0.98] text-white font-black rounded-2xl shadow-lg shadow-rose-100/50 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Gift size={16} />
                    <span>إرسال الهدية الآن 🎉</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
                    <h3 className="text-xl font-black text-[#4D2980]">
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
                      className="flex flex-col items-center gap-2 p-4 bg-[#f5eeff] text-[#9952FF] rounded-2xl hover:bg-[#e9daff] transition-colors group"
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
                      className="flex flex-col items-center gap-2 p-4 bg-[#f5eeff] text-[#4D2980] rounded-2xl hover:bg-[#e9daff] transition-colors group"
                    >
                      <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform text-[#4D2980]">
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
                  <p className="text-[10px] text-[#4D2980] font-black">
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
            <div className="fixed inset-0 bg-[#4D2980]/40 backdrop-blur-md z-[70] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl relative border-4 border-white"
              >
                <div className="p-6 pb-4">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-[#4D2980] text-lg flex items-center gap-2">
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
                    <h2 className="text-xl font-black text-[#4D2980]">
                      {currentMerchant.shopName}
                    </h2>
                    <p className="text-xs text-[#4D2980] font-bold bg-white px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm">
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
                    className="w-full py-4 bg-[#9952FF] hover:bg-[#9952FF] text-white font-black rounded-2xl shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-2"
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
            <div className="fixed inset-0 bg-[#4D2980]/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative overflow-hidden text-center"
              >
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                  <AlertTriangle className="text-amber-500 w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-[#4D2980] mb-2">
                  توجد تعديلات غير محفوظة!
                </h3>
                <p className="text-xs text-slate-500 mb-6 px-4">
                  هل تريد حفظ التعديلات في ملفك الشخصي قبل مغادرة الصفحة؟
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      updateStoreProfile(profileForm);
                      setIsProfileDirty(false);
                      setShowUnsavedModal(false);
                      setActiveTab(pendingTab);
                      setPendingTab(null);
                    }}
                    className="p-3 bg-[#9952FF] text-white rounded-2xl font-bold text-xs hover:bg-[#9952FF] transition"
                  >
                    حفظ ومغادرة
                  </button>
                  <button
                    onClick={() => {
                      // Discard changes by restoring form from currentMerchant
                      if (currentMerchant) {
                        setProfileForm({
                          ownerName: currentMerchant.ownerName,
                          shopName: currentMerchant.shopName,
                          username: currentMerchant.username,
                          category: currentMerchant.category || "fashion",
                          province: currentMerchant.province,
                          area: currentMerchant.area,
                          landmark: currentMerchant.landmark,
                          lat: currentMerchant.lat,
                          lng: currentMerchant.lng,
                          logo: currentMerchant.logo,
                          deliveryPrice: currentMerchant.deliveryPrice || 0,
                          isFreeDelivery:
                            currentMerchant.isFreeDelivery || false,
                          showArea: currentMerchant.showArea !== false,
                          showLandmark: currentMerchant.showLandmark !== false,
                          showMap: currentMerchant.showMap !== false,
                          showPhone: currentMerchant.showPhone !== false,
                        });
                      }
                      setIsProfileDirty(false);
                      setShowUnsavedModal(false);
                      setActiveTab(pendingTab);
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
             <div className="fixed inset-0 bg-[#4D2980]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative"
               >
                 <div className="bg-[#9952FF] p-6 text-white flex justify-between items-center rounded-b-3xl shadow-lg relative z-10">
                    <h3 className="text-xl font-black flex items-center gap-2">
                       <User size={24} /> تفاصيل المتابع
                    </h3>
                    <button onClick={() => setSelectedAudienceId(null)} className="p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition">
                       <X size={20} />
                    </button>
                 </div>
                 
                 <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="text-center pb-6 border-b border-slate-100 border-dashed">
                       <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 text-[#4D2980] flex items-center justify-center rounded-2xl mx-auto mb-4 shadow-inner">
                         <span className="text-4xl font-black">{aud.name.charAt(0)}</span>
                       </div>
                       <h2 className="text-2xl font-black text-[#4D2980] flex items-center justify-center gap-1.5">
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
                            aud.tier === "Platinum" ? "bg-[#9952FF] border-slate-700 text-white" :
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
                             {aud.followedStores.includes(currentMerchant!.id) && <span className="bg-[#f5eeff] text-[#9952FF] px-3 py-1 text-[10px] font-bold rounded-xl border border-[#9952FF]">يتابع المتجر</span>}
                             {aud.storeNotifications.includes(currentMerchant!.id) && <span className="bg-rose-50 text-rose-600 px-3 py-1 text-[10px] font-bold rounded-xl border border-rose-200">مفعل الإشعارات</span>}
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
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[150] flex flex-col overflow-hidden animate-fade-in" dir="rtl">
              {/* شريط التحكم العلوي */}
              <div className="bg-gradient-to-l from-[#4D2980] to-[#381a66] text-white py-3 px-4 flex items-center justify-between shadow-lg border-b border-white/10 z-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <StoreIcon size={18} className="text-amber-400" />
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
      </div>
    );
  }

  // ==========================================
  // واجهات تسجيل الدخول والتسجيل (مطابقة للزبون)
  // ==========================================

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-xl p-8 text-right animate-fade-in relative border-t-8 border-[#9952FF] max-h-[90vh] overflow-y-auto">
        {/* اللوغو */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-100 text-[#4D2980] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow">
            <StoreIcon size={32} />
          </div>
          <h1 className="text-2xl font-black text-[#4D2980]">
            محلك - لوحة التاجر
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            ابدأ بيع منتجاتك بكل سهولة
          </p>
        </div>

        {/* تسجيل الدخول */}
        {view === "login" && (
          <form onSubmit={handleLogin} className="space-y-5">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-2xl font-bold flex items-center gap-2">
                <AlertTriangle size={16} />
                {loginError}
              </div>
            )}
            
            <div className="flex p-1 bg-slate-100 rounded-xl mb-4">
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginMethod === 'phone' ? 'bg-white text-[#4D2980] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => { setLoginMethod('phone'); setLoginError(''); }}
              >
                رقم الهاتف
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginMethod === 'username' ? 'bg-white text-[#4D2980] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => { setLoginMethod('username'); setLoginError(''); }}
              >
                اسم المستخدم
              </button>
            </div>

            {loginMethod === 'phone' ? (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  رقم الهاتف <span className="text-red-500">*</span>
                </label>
                <div
                  className="flex items-center border border-slate-200 rounded-2xl overflow-hidden bg-white focus-within:border-slate-500 transition-all"
                  dir="ltr"
                >
                  <span className="px-4 py-3 bg-slate-50 text-slate-500 text-sm font-bold border-r">
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
                    className="flex-1 p-3 text-sm focus:outline-none font-mono text-left"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  اسم المستخدم (username) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: azeaa_alalmi"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                  className="w-full border border-slate-200 p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-slate-500 focus:outline-none text-left"
                  dir="ltr"
                />
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                كلمة المرور <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="لا تقل عن 8 حروف"
                required
                className="w-full border border-slate-200 p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-slate-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setLoginError("");
                setForgotPhone(loginPhone);
                setView("forgot");
              }}
              className="text-xs font-bold text-[#4D2980] hover:underline px-1"
            >
              نسيت كلمة السر؟
            </button>
            <button
              type="submit"
              className="w-full py-4 bg-[#9952FF] text-white font-black rounded-2xl shadow-lg shadow-slate-200 hover:bg-[#9952FF] transition-all"
            >
              تسجيل الدخول
            </button>
            <div className="text-center pt-4 border-t border-slate-100 text-sm text-slate-500">
              ليس لديك حساب؟{" "}
              <button
                type="button"
                onClick={() => setView("signup")}
                className="font-bold text-[#4D2980]"
              >
                انشاء حساب جديد
              </button>
            </div>
          </form>
        )}

        {/* إنشاء حساب */}
        {view === "signup" && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
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
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  رقم الهاتف (WhatsApp) <span className="text-red-500">*</span>
                </label>
                <div
                  className={`flex items-center border rounded-2xl overflow-hidden bg-white ${isPhoneValid ? "border-green-400" : phone ? "border-red-400" : "border-slate-200"}`}
                  dir="ltr"
                >
                  <span className="px-4 py-3 bg-slate-50 text-slate-500 text-sm font-bold border-r">
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
                    className="flex-1 p-3 text-sm font-mono text-left focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input type="checkbox" checked={showPhone} onChange={(e) => setShowPhone(e.target.checked)} className="rounded text-[#9952FF] focus:ring-[#9952FF]" />
                  <span className="text-xs">إظهار عند الزبون</span>
                </label>

              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
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
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  صنف المتجر <span className="text-red-500">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="w-full border p-3 rounded-2xl text-sm bg-white border-green-400"
                >
                  {STORE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
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
                <label className="block text-xs font-bold text-slate-500 mb-1">
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
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    المحافظة <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedProvince}
                    onChange={(e) => setSelectedProvince(e.target.value)}
                    required
                    className="w-full border p-2.5 rounded-2xl text-xs bg-white"
                  >
                    {provinces.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
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
                    <input type="checkbox" checked={showArea} onChange={(e) => setShowArea(e.target.checked)} className="rounded text-[#9952FF] focus:ring-[#9952FF]" />
                    <span className="text-xs">إظهار عند الزبون</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
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
                  <input type="checkbox" checked={showLandmark} onChange={(e) => setShowLandmark(e.target.checked)} className="rounded text-[#9952FF] focus:ring-[#9952FF]" />
                  <span className="text-xs">إظهار عند الزبون</span>
                </label>
              </div>
              <div className="mt-2">
                <LocationPicker
                  onLocationSelect={(lat, lng) => {
                    setLat(lat);
                    setLng(lng);
                  }}
                  initialLat={lat}
                  initialLng={lng}
                  label="تحديد الموقع على الخريطة"
                  height="h-48"
                  required={true}
                />
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input type="checkbox" checked={showMap} onChange={(e) => setShowMap(e.target.checked)} className="rounded text-[#9952FF] focus:ring-[#9952FF]" />
                  <span className="text-xs">إظهار عند الزبون</span>
                </label>
              </div>
              <div className="max-w-[120px] mx-auto">
                <ImageUploader
                  value={logoUrl}
                  onChange={setLogoUrl}
                  label="لوغو المحل (اختياري)"
                />
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[11px] font-black text-slate-700 block mb-3">
                  باقة الاشتراك:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {subscriptionPlans.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlan(p.id)}
                      className={`p-2 border rounded-2xl text-center cursor-pointer transition ${selectedPlan === p.id ? "border-[#9952FF] bg-white ring-4 ring-slate-50" : "border-slate-200 opacity-60"}`}
                    >
                      <span className="block text-[10px] font-bold text-[#4D2980]">
                        {p.name}
                      </span>
                      <span className="block text-[11px] font-black text-[#4D2980]">
                        {(p.price || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {!isFormValid && (
              <p className="text-[10px] text-orange-500 text-center font-bold animate-pulse">
                ⚠️ أكمل جميع الحقول المطلوبة
              </p>
            )}
            <button
              type="submit"
              disabled={!isFormValid}
              className={`w-full py-4 font-black rounded-2xl shadow-xl transition-all ${isFormValid ? "bg-[#9952FF] text-white" : "bg-gray-200 text-slate-400 cursor-not-allowed"}`}
            >
              إنشاء حساب التاجر
            </button>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setView("login")}
                className="text-xs font-bold text-slate-400"
              >
                الرجوع لتسجيل الدخول
              </button>
            </div>
          </form>
        )}

        {/* OTP */}
        {view === "otp" && (
          <form onSubmit={handleOtpConfirm} className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-black text-[#4D2980]">
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
                setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              required
              className="w-full border-2 border-slate-500 p-4 rounded-2xl text-center text-3xl font-mono tracking-[0.5em] focus:ring-4 focus:ring-slate-100 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full py-4 bg-green-600 text-white font-black rounded-2xl shadow-lg shadow-green-100"
            >
              تأكيد والدخول
            </button>
            <div className="flex flex-col items-center space-y-4">
              <button
                type="button"
                disabled={!canResendOtp}
                onClick={handleResendOtp}
                className={`text-sm font-bold transition-colors ${
                  canResendOtp 
                    ? "text-[#4D2980] hover:text-slate-700" 
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
          <form onSubmit={handleForgotPassword} className="space-y-5">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-2xl font-bold flex items-center gap-2">
                <AlertTriangle size={16} />
                {loginError}
              </div>
            )}
            <div className="text-center">
              <h3 className="text-xl font-black text-[#4D2980]">
                استعادة كلمة المرور
              </h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                رقم الهاتف المسجل <span className="text-red-500">*</span>
              </label>
              <div
                className="flex items-center border border-slate-200 rounded-2xl overflow-hidden bg-white"
                dir="ltr"
              >
                <span className="px-4 py-3 bg-slate-50 text-slate-500 text-sm font-bold border-r">
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
                  className="flex-1 p-3 text-sm font-mono text-left focus:outline-none"
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
              className="w-full py-4 bg-[#9952FF] text-white font-black rounded-2xl shadow-lg"
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
      </div>

      {/* نافذة عرض الروابط الخارجية داخل التطبيق مع زر الرجوع للتطبيق */}
      <AnimatePresence>
        {iframeUrl && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[150] flex flex-col overflow-hidden animate-fade-in" dir="rtl">
            {/* شريط التحكم العلوي */}
            <div className="bg-gradient-to-l from-[#4D2980] to-[#381a66] text-white py-3 px-4 flex items-center justify-between shadow-lg border-b border-white/10 z-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <StoreIcon size={18} className="text-amber-400" />
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
    </div>
  );
};
