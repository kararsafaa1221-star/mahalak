import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/useApp";
import { Product, Order } from "../../types";
import { STORE_CATEGORIES } from "../../constants";
import { StorageService } from "../../services/storageService";
import { showLocalNotification, requestNotificationPermission, setupPushNotifications } from "../../lib/pushNotifications";
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
} from "lucide-react";
import { ImageUploader } from "../../components/ImageUploader";
import { LocationPicker } from "../../components/LocationPicker";
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
  } = useApp();

  const [isSyncing, setIsSyncing] = useState(false);
  const handleManualSync = async () => {
    setIsSyncing(true);
    // Locally data is already in state, but we can imagine a "Refresh" logic here if needed
    setTimeout(() => setIsSyncing(false), 1000);
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
    if (shareUrl) window.open(shareUrl, "_blank");
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
  const [prodIsFreeDelivery, setProdIsFreeDelivery] = useState(false);
  const [prodStatus, setProdStatus] = useState<Product["status"]>("published");
  const [productFilterStatus, setProductFilterStatus] =
    useState<Product["status"]>("published");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [prodSpecialOffer, setProdSpecialOffer] = useState("");
  const [prodTags, setProdTags] = useState<string[]>([]);
  const [prodBarcode, setProdBarcode] = useState("");
  const [prodInventory, setProdInventory] = useState(0);
  const [showScanner, setShowScanner] = useState(false);

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState<{
    price?: number;
    status?: Product["status"];
    inventory?: number;
  }>({});

  const [showQRMenu, setShowQRMenu] = useState(false);

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
    if (
      !window.confirm(`هل أنت متأكد من تحديث ${count} منتج دفعة واحدة؟`)
    )
      return;

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
  const [giftAmount, setGiftAmount] = useState(1000);

  const invoiceRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `فاتورة_طلب_${selectedInvoice?.id || ""}`,
  });

  const handleShareWhatsAppInvoice = (order: Order) => {
    const itemsText = order.items
      .map((it) => `🔹 ${it.productName} (عدد ${it.quantity}) - ${it.price.toLocaleString()} د.ع`)
      .join("\n\n");

    const text = `📦 *فاتورة شراء من تطبيق محلك*\n\n` +
      `*رقم الطلب:* #${order.id}\n` +
      `*الزبون:* ${order.customerName}\n\n` +
      `*التفاصيل:*\n\n${itemsText}\n\n` +
      `*المجموع الكلي:* ${order.total?.toLocaleString()} د.ع\n\n` +
      `*الموقع:* ${order.customerProvince} - ${order.customerAddress}\n\n` +
      `✅ *تم قبول الطلب سوف يصلك الطلب بأسرع وقت*\n` +
      `شكراً لتسوقكم معنا! 🌹`;
    
    const encodedText = encodeURIComponent(text);
    const phone = order.customerPhone.replace(/\s+/g, "").replace(/^0/, "964");
    window.open(`https://wa.me/${phone}?text=${encodedText}`, "_blank");
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

  const [audienceSearchQuery, setAudienceSearchQuery] = useState("");
  const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(null);

  // ==========================================
  // التحديث اللحظي للطلبات (Placeholder)
  // ==========================================
  useEffect(() => {
    // Note: Live Query removed as per user request to delete Back4App
  }, [currentMerchant, view]);

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
            setProdInventory(existingProd.inventory || 0);
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
    const data = {
      storeId: currentMerchant!.id,
      name: prodName,
      description: prodDesc,
      price: prodPrice,
      costPrice: prodCostPrice,
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
      inventory: prodInventory,
    };
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

  const handleArchiveProduct = (id: string) => {
    updateProduct(id, { status: "archived" });
  };

  const handlePublishProduct = (id: string) => {
    updateProduct(id, { status: "published" });
  };

  const handleDraftProduct = (id: string) => {
    updateProduct(id, { status: "draft" });
  };

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pCode.trim() || pDiscount <= 0) {
      alert("يرجى إدخال بيانات صحيحة للبروموكود");
      return;
    }

    let expiryDate: string | undefined;
    let startDate = undefined;

    if (pExpiryType === "days") {
      expiryDate =
        pExpiryDays > 0
          ? new Date(Date.now() + pExpiryDays * 86400000).toISOString()
          : undefined;
    } else {
      startDate = pStartDate ? new Date(pStartDate).toISOString() : undefined;
      expiryDate = pEndDate ? new Date(pEndDate).toISOString() : undefined;
    }

    createPromoCode({
      storeId: currentMerchant!.id,
      code: pCode.toUpperCase().replace(/\s+/g, ""),
      discountType: pDiscountType,
      discountValue: pDiscount,
      maxUses: pMaxUses,
      maxUsesPerUser: pMaxUsesPerUser,
      startDate: startDate,
      expiresAt: expiryDate,
    });

    alert(`تم إنشاء كود الخصم "${pCode.toUpperCase()}" بنجاح! 🎉`);
    setPromoModal(false);
    setPCode("");
    setPDiscount(0);
    setPDiscountType("amount");
    setPMaxUses(10);
    setPMaxUsesPerUser(1);
    setPExpiryDays(30);
    setPExpiryType("days");
    setPStartDate("");
    setPEndDate("");
  };

  const handleSendGift = (e: React.FormEvent) => {
    e.preventDefault();
    const code =
      "GIFT-" + Math.random().toString(36).substring(7).toUpperCase();
    createPromoCode({
      storeId: currentMerchant!.id,
      code,
      discountValue: giftAmount,
      maxUses: 1,
      ownerCustomerId: giftModal.customerId,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    alert(
      `✅ تم إرسال هدية بقيمة ${(giftAmount || 0).toLocaleString()} د.ع للزبون ${giftModal.customerName}`,
    );
    setGiftModal({ show: false, customerId: "", customerName: "" });
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

    // Calculate Hidden Net Profit
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const deliveredOrdersThisWeek = merchantOrders.filter(
      (o) => o.status === "delivered" && new Date(o.createdAt) >= oneWeekAgo,
    );

    let netProfitThisWeek = 0;
    deliveredOrdersThisWeek.forEach((o) => {
      o.items.forEach((item) => {
        // Find product to get cost price
        const prod = merchantProducts.find(
          (p) => p.id === item.productId || p.id === item.id,
        );
        const costPrice = prod?.costPrice || 0;
        const sellingPrice = item.price || 0;
        const profitPerItem = sellingPrice - costPrice;
        netProfitThisWeek += profitPerItem * (item.quantity || 1);
      });
      // Deduct apportioned discount if needed, but for simplicity we skip promo logic per item
      // Alternatively, we could deduct a portion of the order discountAmount.
      if (o.discountAmount > 0) {
        netProfitThisWeek -= o.discountAmount;
      }
    });

    return (
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar Desktop */}
        <aside className="hidden md:flex w-64 bg-indigo-900 text-white flex-col sticky top-0 h-screen shadow-xl">
          <div className="p-6 border-b border-indigo-800 flex items-center space-x-3 space-x-reverse">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg">
              <StoreIcon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-black block">
                {currentMerchant.shopName}
              </span>
              <span className="text-[10px] text-indigo-300">
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
                className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-xl transition ${activeTab === item.id ? "bg-indigo-700 text-white shadow-md" : "text-indigo-200 hover:bg-indigo-800"}`}
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
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-20 shadow-lg overflow-x-auto">
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
              className={`flex flex-col items-center px-1 py-1 flex-1 min-w-0 shrink-0 ${activeTab === item.id ? "text-indigo-600" : "text-gray-400"}`}
            >
              <item.icon size={20} className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[9px] font-bold mt-1">{item.label}</span>
            </button>
          ))}
        </nav>

        <main className="flex-1 md:mr-64 p-4 md:p-8 pb-24 md:pb-8">
          {/* Header Mobile / Info Bar */}
          <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              {activeTab !== "home" && (
                <button
                  onClick={() => handleTabChange("home")}
                  className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all ml-1 flex items-center justify-center border border-transparent hover:border-indigo-100"
                >
                  <ChevronRight size={20} />
                </button>
              )}
              <div className="md:hidden">
                <h1 className="text-sm font-black text-indigo-900">
                  {currentMerchant.shopName}
                </h1>
              </div>
              <div className="hidden md:block">
                <span className="text-xs font-bold text-gray-400">
                  لوحة التحكم السحابية - منصة محلك
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3 space-x-reverse relative">
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
                className="p-2.5 bg-gray-50 text-gray-500 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition relative"
              >
                <BellRing size={20} />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-bounce">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute left-0 top-12 w-72 bg-white rounded-2xl shadow-2xl border border-indigo-50 z-50 overflow-hidden animate-fade-in divide-y divide-gray-50">
                  <div className="p-3 bg-indigo-50/50 flex justify-between items-center">
                    <span className="text-xs font-black text-indigo-900">
                      التنبيهات الأخيرة
                    </span>
                    <span className="text-[10px] font-bold bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full">
                      {merchantNotifications.length} تنبيه
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {merchantNotifications.length === 0 ? (
                      <p className="p-8 text-center text-[10px] text-gray-400 font-bold">
                        لا توجد إشعارات جديدة
                      </p>
                    ) : (
                      merchantNotifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationAsRead(n.id);
                            setShowNotifications(false);
                            if (n.type === 'order') {
                              setActiveTab('orders');
                            } else if (n.type === 'subscription') {
                              setActiveTab('profile');
                            }
                          }}
                          className={`p-3 text-right hover:bg-indigo-50/30 transition cursor-pointer relative ${!n.read ? "bg-indigo-50/5" : ""}`}
                        >
                          {!n.read && (
                            <div className="absolute right-2 top-4 w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                          )}
                          <div className={!n.read ? "pr-4" : ""}>
                            <h4 className="text-[11px] font-black text-gray-800">
                              {n.title}
                            </h4>
                            <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                              {n.message}
                            </p>
                            <span className="text-[8px] text-gray-400 mt-2 block">
                              {new Date(n.createdAt).toLocaleTimeString("ar-IQ")}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* الرئيسية */}
          {activeTab === "home" && (
            <div className="space-y-6">
              <div className="bg-gradient-to-l from-indigo-600 to-indigo-800 text-white p-6 rounded-3xl shadow-lg">
                <h2 className="text-2xl font-black mb-2">
                  أهلاً بك، {currentMerchant.ownerName}! 👋
                </h2>
                <p className="text-indigo-100 opacity-90">
                  متجرك "{currentMerchant.shopName}" متاح الآن في{" "}
                  {currentMerchant.province}.
                </p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: "إجمالي الطلبات",
                    val: merchantOrders.length,
                    color: "text-blue-600",
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
                    color: "text-indigo-600",
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
                    className={`p-4 rounded-3xl shadow-sm border border-gray-100 bg-white group hover:border-indigo-100 transition-colors ${s.tab !== 'home' ? 'cursor-pointer hover:shadow-md' : ''}`}
                  >
                    <span className="text-[10px] font-bold text-gray-400 block mb-1">
                      {s.label}
                    </span>
                    <span className={`text-xl font-black ${s.color}`}>
                      {s.val}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl text-emerald-900 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Ticket size={64} />
                </div>
                <h3 className="font-black text-emerald-800 text-lg mb-1 relative z-10 flex items-center gap-2">
                  صافي الأرباح (تقريبي) 💰
                </h3>
                <p className="text-xs text-emerald-600/80 mb-4 font-bold relative z-10">
                  حصيلتك خلال آخر 7 أيام بناءً على سعر الجملة للطلبات المكتملة.
                  (هذا الرقم سري ولا يظهر للزبائن)
                </p>
                <div className="text-3xl font-black relative z-10">
                  {netProfitThisWeek.toLocaleString()}{" "}
                  <span className="text-lg">د.ع</span>
                </div>
              </div>

              {/* قسم مشاركة المتجر */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                  <Share2 size={64} className="text-indigo-600" />
                </div>
                <div className="relative">
                  <h4 className="text-lg font-black text-gray-800 mb-2">
                    شارك متجرك 📣
                  </h4>
                  <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                    قم بمشاركة رابط المتجر الرسمي الخاص بك على منصات التواصل
                    الاجتماعي لجذب المزيد من الزبائن وزيادة مبيعاتك.
                  </p>
                  <button
                    onClick={() => openShareModal("store", currentMerchant)}
                    className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Share2 size={18} />
                    مشاركة رابط المتجر
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* المنتجات */}
          {activeTab === "products" && (
            <div className="space-y-6">
              <div className="p-6 h-full overflow-y-auto">
                <div className="space-y-6">
                  {/* قسم البحث */}
                  <div className="bg-white p-2 rounded-2xl border shadow-sm flex gap-2">
                    <input
                      type="text"
                      placeholder="ابحث عن منتج بالاسم أو الباركود..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-xl text-sm px-4 focus:ring-0 outline-none"
                    />
                  </div>

                  {/* تبويبات الفلترة للمنتجات */}
                  <div className="flex gap-2 p-1 bg-white rounded-2xl border shadow-sm sticky top-0 z-10">
                    {["published", "draft", "archived"].map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setProductFilterStatus(s as any);
                          setSelectedProductIds([]);
                        }}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${
                          productFilterStatus === s
                            ? "bg-indigo-600 text-white shadow-md"
                            : "text-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        {s === "published"
                          ? "المنشور"
                          : s === "draft"
                            ? "المسودة"
                            : "الأرشيف"}
                      </button>
                    ))}
                  </div>

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
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-3xl shadow-sm border gap-4">
                          <div className="flex items-center gap-3">
                            <h2 className="text-lg font-black text-gray-800">
                              المنتجات ({filteredProductsForView.length})
                            </h2>
                            {filteredProductsForView.length > 0 && (
                              <button
                                onClick={() =>
                                  handleSelectAllProducts(
                                    filteredProductsForView,
                                  )
                                }
                                className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                              >
                                {selectedProductIds.length ===
                                filteredProductsForView.length
                                  ? "إلغاء الكل"
                                  : "تحديد الكل"}
                              </button>
                            )}
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => setShowScanner(true)}
                              className="flex-1 sm:flex-none px-3 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-2xl flex items-center justify-center space-x-2 space-x-reverse shadow-sm hover:bg-indigo-100 transition"
                            >
                              <Camera size={18} />
                              <span className="hidden sm:inline">
                                الجرد الذكي
                              </span>
                            </button>
                            <button
                              onClick={() => {
                                setProdModal({ show: true, mode: "add" });
                                setProdName("");
                                setProdDesc("");
                                setProdPrice(0);
                                setProdCostPrice(0);
                                setProdInventory(0);
                                setProdDiscountType("none");
                                setProdDiscountValue(0);
                                setProdImage("");
                                setProdIsFreeDelivery(false);
                                setProdStatus("published");
                                setProdSpecialOffer("");
                                setProdTags([]);
                                setProdBarcode("");
                              }}
                              className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 space-x-reverse shadow-md hover:bg-indigo-700"
                            >
                              <Plus size={18} />
                              <span>إضافة منتج</span>
                            </button>
                          </div>
                        </div>

                        {selectedProductIds.length > 0 && (
                          <div className="fixed bottom-24 left-4 right-4 md:right-72 bg-white border-2 border-indigo-200 p-4 rounded-[2rem] shadow-2xl z-40 flex items-center justify-between animate-bounce-in">
                            <div className="flex items-center gap-3">
                              <div className="bg-indigo-100 text-indigo-700 p-2 rounded-xl">
                                <Zap size={20} />
                              </div>
                              <div>
                                <span className="text-xs font-black text-indigo-900 block">
                                  تم تحديد {selectedProductIds.length} منتج
                                </span>
                                <button
                                  onClick={() => setSelectedProductIds([])}
                                  className="text-[10px] font-bold text-red-500 hover:underline"
                                >
                                  إلغاء التحديد
                                </button>
                              </div>
                            </div>
                            <button
                              onClick={() => setShowBulkEditModal(true)}
                              className="px-6 py-2 bg-indigo-600 text-white font-black rounded-xl text-xs shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                            >
                              تعديل جماعي للمختار
                            </button>
                          </div>
                        )}

                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4 pb-20">
                          {filteredProductsForView.map((p) => (
                            <div
                              key={p.id}
                              className={`relative bg-white rounded-xl sm:rounded-2xl border overflow-hidden shadow-sm flex flex-col group transition-all ${
                                selectedProductIds.includes(p.id)
                                  ? "border-indigo-500 ring-2 ring-indigo-100"
                                  : "border-slate-100 hover:border-indigo-300"
                              }`}
                            >
                              {/* Selection Checkbox */}
                              <button
                                onClick={() => toggleSelectProduct(p.id)}
                                className={`absolute top-2 right-2 z-10 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                  selectedProductIds.includes(p.id)
                                    ? "bg-indigo-600 border-indigo-600 shadow-md"
                                    : "bg-white/80 border-slate-300 opacity-0 group-hover:opacity-100"
                                }`}
                              >
                                {selectedProductIds.includes(p.id) && (
                                  <Check size={12} className="text-white" />
                                )}
                              </button>

                              <div
                                className="aspect-square relative w-full bg-slate-100 shrink-0 cursor-pointer"
                                onClick={() => toggleSelectProduct(p.id)}
                              >
                                <img
                                  src={p.image || undefined}
                                  className="w-full h-full object-cover"
                                  alt=""
                                />
                                <div className="absolute top-1 left-1 right-1 flex justify-between items-start pointer-events-none">
                                  <div className="flex flex-wrap gap-1 max-w-[70%] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pointer-events-auto">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openShareModal("product", p);
                                      }}
                                      className="p-1 sm:p-1.5 bg-white/95 backdrop-blur-sm rounded-md text-green-600 shadow-sm hover:scale-110 transition-transform"
                                      title="مشاركة المنتج"
                                    >
                                      <Share2
                                        size={12}
                                        className="sm:w-4 sm:h-4"
                                      />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setProdModal({
                                          show: true,
                                          mode: "edit",
                                          product: p,
                                        });
                                        setProdName(p.name);
                                        setProdDesc(p.description || "");
                                        setProdPrice(p.price);
                                        setProdCostPrice(p.costPrice || 0);
                                        setProdInventory(p.inventory || 0);
                                        setProdDiscountType(p.discountType);
                                        setProdDiscountValue(p.discountValue);
                                        setProdImage(p.image);
                                        setProdIsFreeDelivery(p.isFreeDelivery);
                                        setProdStatus(p.status);
                                        setProdSpecialOffer(
                                          p.specialOffer || "",
                                        );
                                        setProdTags(p.tags || []);
                                        setProdBarcode(p.barcode || "");
                                      }}
                                      className="p-1 sm:p-1.5 bg-white/95 backdrop-blur-sm rounded-md text-indigo-600 shadow-sm hover:scale-110 transition-transform"
                                      title="تعديل المنتج"
                                    >
                                      <Edit
                                        size={12}
                                        className="sm:w-4 sm:h-4"
                                      />
                                    </button>
                                    {p.status !== "archived" && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleArchiveProduct(p.id);
                                        }}
                                        className="p-1 sm:p-1.5 bg-white/95 backdrop-blur-sm rounded-md text-amber-600 shadow-sm hover:scale-110 transition-transform"
                                        title="نقل للأرشيف"
                                      >
                                        <Archive
                                          size={12}
                                          className="sm:w-4 sm:h-4"
                                        />
                                      </button>
                                    )}
                                    {p.status !== "draft" && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDraftProduct(p.id);
                                        }}
                                        className="p-1 sm:p-1.5 bg-white/95 backdrop-blur-sm rounded-md text-slate-600 shadow-sm hover:scale-110 transition-transform"
                                        title="نقل للمسودة"
                                      >
                                        <FileText
                                          size={12}
                                          className="sm:w-4 sm:h-4"
                                        />
                                      </button>
                                    )}
                                    {p.status !== "published" && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePublishProduct(p.id);
                                        }}
                                        className="p-1 sm:p-1.5 bg-white/95 backdrop-blur-sm rounded-md text-blue-600 shadow-sm hover:scale-110 transition-transform"
                                        title="نشر المنتج"
                                      >
                                        <Globe
                                          size={12}
                                          className="sm:w-4 sm:h-4"
                                        />
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteProduct(p.id, p.name);
                                      }}
                                      className="p-1 sm:p-1.5 bg-white/95 backdrop-blur-sm rounded-md text-red-600 shadow-sm hover:scale-110 transition-transform"
                                      title="حذف نهائي"
                                    >
                                      <Trash2
                                        size={12}
                                        className="sm:w-4 sm:h-4"
                                      />
                                    </button>
                                  </div>
                                  <div
                                    className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black shadow-sm shrink-0 pointer-events-auto ${
                                      p.status === "published"
                                        ? "bg-emerald-500 text-white"
                                        : p.status === "draft"
                                          ? "bg-amber-500 text-white"
                                          : "bg-slate-500 text-white"
                                    }`}
                                  >
                                    {p.status === "published"
                                      ? "منشور"
                                      : p.status === "draft"
                                        ? "مسودة"
                                        : "مؤرشف"}
                                  </div>
                                </div>
                              </div>
                              <div
                                className="p-1.5 sm:p-3 flex-1 flex flex-col justify-between cursor-pointer"
                                onClick={() => toggleSelectProduct(p.id)}
                              >
                                <div>
                                  <h3
                                    className="font-bold text-gray-800 text-[10px] sm:text-xs leading-tight line-clamp-2"
                                    title={p.name}
                                  >
                                    {p.name}
                                  </h3>
                                  <div className="flex items-center gap-1 mt-1">
                                    <div
                                      className={`w-2 h-2 rounded-full ${
                                        (p.inventory || 0) > 10
                                          ? "bg-emerald-400"
                                          : (p.inventory || 0) > 0
                                            ? "bg-amber-400"
                                            : "bg-red-400"
                                      }`}
                                    ></div>
                                    <span className="text-[9px] font-bold text-slate-400">
                                      المتوفر: {p.inventory || 0}
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-1 flex justify-between items-end">
                                  <div className="flex flex-col">
                                    <span className="text-[11px] sm:text-sm font-black text-indigo-600 tracking-tight">
                                      {(p.finalPrice || 0).toLocaleString()}{" "}
                                      <span className="text-[8px] font-normal">
                                        د.ع
                                      </span>
                                    </span>
                                    {p.discountType !== "none" && (
                                      <span className="text-[8px] sm:text-[9px] text-gray-400 line-through">
                                        {(p.price || 0).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                  {p.isFreeDelivery && (
                                    <Truck
                                      size={10}
                                      className="text-emerald-500 shrink-0 mb-0.5"
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* الطلبات */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              {/* شريط الفرز المطور */}
              <div className="bg-white p-2 rounded-3xl shadow-sm border flex gap-1 overflow-x-auto no-scrollbar">
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
                    label: "مرفوض",
                    count: merchantOrders.filter((o) => o.status === "rejected")
                      .length,
                  },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setOrderFilter(f.id as any)}
                    className={`flex-1 min-w-[80px] py-2.5 rounded-2xl text-[10px] font-black transition-all ${
                      orderFilter === f.id
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                        : "bg-transparent text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>

              {merchantOrders.filter(
                (o) =>
                  o.status === orderFilter ||
                  (orderFilter === "returned" && o.status === "replaced"),
              ).length === 0 ? (
                <div className="py-20 text-center text-slate-300 bg-white rounded-[3rem] border border-dashed border-slate-200">
                  <ClipboardList
                    size={48}
                    className="mx-auto mb-4 opacity-20"
                  />
                  <p className="font-bold">لا توجد طلبات في هذا القسم حالياً</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {merchantOrders
                    .filter(
                      (o) =>
                        o.status === orderFilter ||
                        (orderFilter === "returned" && o.status === "replaced"),
                    )
                    .map((o) => (
                      <div
                        key={o.id}
                        className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md"
                      >
                        {/* ترويسة الفاتورة */}
                        <div className="p-6 pb-4 border-b border-slate-50 bg-slate-50/30 flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-black">
                                #{o.id}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {new Date(o.createdAt).toLocaleDateString(
                                  "ar-IQ",
                                )}
                              </span>
                            </div>
                            <h3 className="text-lg font-black text-slate-800">
                              {o.customerName}
                              {o.returnReason?.includes("استبدال") && (
                                <span className="mr-2 text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100 animate-pulse">
                                  استبدال 🔄
                                </span>
                              )}
                            </h3>
                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 mt-1">
                              <Phone size={12} className="text-emerald-500" />
                              <span className="tracking-widest">
                                {o.customerPhone}
                              </span>
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="text-[10px] font-black text-slate-400 uppercase mb-1">
                              إجمالي الفاتورة
                            </div>
                            <div className="text-xl font-black text-indigo-600">
                              {(o.total || 0).toLocaleString()}{" "}
                              <span className="text-xs">د.ع</span>
                            </div>
                          </div>
                        </div>

                        {/* معلومات الشحن */}
                        <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-3">
                          <div className="p-2 bg-indigo-50 text-indigo-500 rounded-xl">
                            <MapPin size={16} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-slate-400 mb-0.5">
                              عنوان التوصيل
                            </p>
                            <p className="text-xs font-bold text-slate-600">
                              {o.customerProvince} - {o.customerAddress}
                            </p>
                          </div>
                        </div>

                        {/* قائمة المنتجات */}
                        <div className="p-6 flex-1 bg-slate-50/10">
                          <p className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest border-r-2 border-indigo-200 pr-2">
                            محتويات الطلب
                          </p>
                          <div className="space-y-3">
                            {o.items.map((it, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-600 shadow-sm">
                                    {it.quantity}
                                  </div>
                                  <span className="text-xs font-bold text-slate-700">
                                    {it.productName}
                                  </span>
                                </div>
                                <span className="text-[11px] font-black text-slate-400 group-hover:text-slate-600 transition-colors">
                                  {(
                                    (it.price || 0) * (it.quantity || 0)
                                  ).toLocaleString()}{" "}
                                  د.ع
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* أسباب الرفض أو الإرجاع */}
                        {(o.rejectionReason || o.returnReason) && (
                          <div className="px-6 py-4 bg-rose-50/50 border-t border-slate-100 italic text-[11px] font-bold text-rose-500">
                            {o.rejectionReason
                              ? `سبب الرفض: ${o.rejectionReason}`
                              : o.returnReason?.includes("استبدال") 
                                ? `سبب الاستبدال: ${o.returnReason}`
                                : `سبب الإرجاع: ${o.returnReason}`}
                          </div>
                        )}

                        {/* أزرار الإجراءات */}
                        <div className="p-6 pt-0 mt-auto flex gap-3">
                          {o.status === "pending" && (
                            <>
                              <button
                                onClick={() =>
                                  updateOrderStatus(o.id, "accepted")
                                }
                                className="flex-1 h-12 bg-indigo-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
                              >
                                <Check size={16} />
                                قبول وتجهيز
                              </button>
                              <button
                                onClick={() =>
                                  setActionModal({
                                    show: true,
                                    orderId: o.id,
                                    type: "rejected",
                                  })
                                }
                                className="flex-1 h-12 bg-white text-rose-500 border border-slate-100 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-rose-50 active:scale-95 transition-all"
                              >
                                <X size={16} />
                                رفض الطلب
                              </button>
                            </>
                          )}
                          {o.status === "accepted" && (
                            <button
                              onClick={() => updateOrderStatus(o.id, "shipped")}
                              className="w-full h-12 bg-amber-500 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-100"
                            >
                              <Truck size={18} />
                              تسليم للمندوب
                            </button>
                          )}
                          {o.status === "shipped" && (
                            <div className="flex w-full gap-2">
                              <button
                                onClick={() =>
                                  updateOrderStatus(o.id, "delivered")
                                }
                                className="flex-[2] h-12 bg-emerald-500 text-white rounded-2xl font-black text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-2 shadow-lg shadow-emerald-100"
                              >
                                <CheckCircle size={16} />
                                تم التوصيل
                              </button>
                              <button
                                onClick={() =>
                                  setReplacementModal({
                                    show: true,
                                    orderId: o.id,
                                    originalItems: o.items,
                                  })
                                }
                                className="flex-1 h-12 bg-white text-indigo-500 border border-indigo-100 rounded-2xl font-black text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-2"
                              >
                                <RefreshCw size={14} />
                                استبدال
                              </button>
                              <button
                                onClick={() => handleReturnOrder(o.id)}
                                className="flex-1 h-12 bg-white text-rose-500 border border-rose-100 rounded-2xl font-black text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-2"
                              >
                                <X size={14} />
                                إرجاع
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="px-6 pb-6 pt-2 border-t border-slate-50 flex gap-3">
                          <button
                            onClick={() => {
                              setSelectedInvoice(o);
                              setShowInvoiceModal(true);
                            }}
                            className="flex-1 h-11 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-200"
                          >
                            <FileText size={16} />
                            عرض ومشاركة الفاتورة
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* الخصومات */}
          {activeTab === "promo" && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold">أكواد الخصم 🎫</h2>
                </div>
                <button
                  onClick={() => setPromoModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-md flex items-center space-x-2 space-x-reverse"
                >
                  <Plus size={18} />
                  <span>إنشاء كود</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {merchantPromos.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white p-5 rounded-3xl border shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <code className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl font-black tracking-wider">
                        {p.code}
                      </code>
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
                    <div className="flex justify-between mt-3 text-xs text-gray-500">
                      <p>
                        استخدام: {p.usedCount}/{p.maxUses}
                      </p>
                      {p.maxUsesPerUser && <p>حصة الفرد: {p.maxUsesPerUser}</p>}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 bg-slate-50 p-1.5 rounded-lg text-center">
                      {p.startDate
                        ? `${new Date(p.startDate).toLocaleDateString()} إلى `
                        : ""}
                      {p.expiresAt
                        ? new Date(p.expiresAt).toLocaleDateString()
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
                <div className="bg-white p-5 rounded-3xl border text-center shadow-sm">
                  <Users size={24} className="text-indigo-600 mx-auto mb-2" />
                  <span className="text-2xl font-black">
                    {
                      customers.filter((c) =>
                        c.followedStores.includes(currentMerchant.id),
                      ).length
                    }
                  </span>
                  <span className="text-xs text-gray-400 block font-bold">
                    المتابعين
                  </span>
                </div>
                <div className="bg-white p-5 rounded-3xl border text-center shadow-sm">
                  <BellRing size={24} className="text-rose-500 mx-auto mb-2" />
                  <span className="text-2xl font-black">
                    {
                      customers.filter((c) =>
                        c.storeNotifications.includes(currentMerchant.id),
                      ).length
                    }
                  </span>
                  <span className="text-xs text-gray-400 block font-bold">
                    الإشعارات
                  </span>
                </div>
                <div className="bg-white p-5 rounded-3xl border text-center shadow-sm col-span-2">
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
                  <span className="text-xs text-gray-400 block font-bold">
                    زبائن قاموا بالطلب
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-3xl border overflow-hidden shadow-sm">
                <div className="p-4 border-b bg-slate-50 font-black text-slate-800 flex justify-between items-center sm:flex-row flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span>قائمة الجمهور (المتابعين والزبائن)</span>
                    <span className="text-[10px] text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">
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
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={audienceSearchQuery}
                      onChange={(e) => setAudienceSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-slate-50 font-bold text-slate-500 border-b">
                      <tr>
                        <th className="p-4">الزبون</th>
                        <th className="p-4">الهاتف</th>
                        <th className="p-4">المحافظة</th>
                        <th className="p-4 text-center">المستوى</th>
                        <th className="p-4 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
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

                        return audience.map((c) => (
                          <tr
                            key={c.id}
                            className="hover:bg-slate-50 transition-colors cursor-pointer"
                            onClick={() => setSelectedAudienceId(c.id)}
                          >
                            <td className="p-4">
                              <div className="font-black text-indigo-600 hover:text-indigo-800">
                                {c.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-bold">
                                {c.followedStores.includes(currentMerchant.id)
                                  ? "متابع"
                                  : orderedCustomerIds.includes(c.id)
                                    ? "زبون سابق"
                                    : "مهتم"}
                              </div>
                            </td>
                            <td className="p-4 font-mono text-slate-500">
                              {c.phone}
                            </td>
                            <td className="p-4 text-slate-500">{c.province}</td>
                            <td className="p-4 text-center">
                              <span
                                className={`px-3 py-1 rounded-full font-black text-[10px] shadow-sm ${
                                  c.tier === "Diamond"
                                    ? "bg-indigo-600 text-white"
                                    : c.tier === "Platinum"
                                      ? "bg-slate-800 text-white"
                                      : c.tier === "Gold"
                                        ? "bg-amber-400 text-amber-900"
                                        : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {c.tier}
                              </span>
                            </td>
                            <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() =>
                                  setGiftModal({
                                    show: true,
                                    customerId: c.id,
                                    customerName: c.name,
                                  })
                                }
                                className="p-2.5 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-all shadow-sm border border-rose-100 group"
                                title="إرسال خصم خاص (هدية)"
                              >
                                <Gift
                                  size={18}
                                  className="group-hover:scale-110 transition-transform"
                                />
                              </button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                  {customers.filter(
                    (c) =>
                      c.followedStores.includes(currentMerchant.id) ||
                      c.storeNotifications.includes(currentMerchant.id) ||
                      Array.from(
                        new Set(
                          orders
                            .filter((o) => o.storeId === currentMerchant.id)
                            .map((o) => o.customerId),
                        ),
                      ).includes(c.id),
                  ).length === 0 && (
                    <div className="p-10 text-center text-slate-400 font-bold">
                      لا يوجد متابعون أو زبائن لهذا المتجر حالياً.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* تغيير كلمة المرور - مودال */}
          {showPasswordChange && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl relative"
              >
                <button 
                  onClick={() => setShowPasswordChange(false)}
                  className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Shield size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-800">تغيير كلمة المرور</h3>
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
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]"
                      >
                        إرسال الرمز (OTP)
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1 mb-2">رمز التحقق (OTP)</label>
                        <input 
                          type="text" 
                          maxLength={6}
                          placeholder="0 0 0 0 0 0"
                          value={otpPwCode}
                          onChange={(e) => setOtpPwCode(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 px-4 py-4 rounded-2xl text-center text-xl font-black tracking-[0.5em] focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1 mb-2">كلمة المرور الجديدة</label>
                        <input 
                          type="password" 
                          placeholder="كلمة مرور قوية (8+ رموز)"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 px-4 py-4 rounded-2xl text-sm font-black focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none"
                        />
                      </div>
                      <button 
                        type="submit"
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]"
                      >
                        تحديث كلمة المرور
                      </button>
                      <button 
                        type="button"
                        onClick={() => setPwStep(1)}
                        className="w-full py-3 text-slate-400 text-xs font-black hover:text-indigo-600 transition-colors"
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
              <div className="bg-gradient-to-l from-yellow-50 to-white rounded-3xl border shadow-sm p-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Zap size={100} className="text-yellow-500" />
                </div>
                <div className="relative z-10 text-right">
                  <h3 className="font-black text-2xl text-slate-800 flex items-center space-x-2 space-x-reverse mb-2">
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
                  <div className="bg-white p-12 rounded-3xl border shadow-sm text-center">
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
                          className="bg-white rounded-3xl border shadow-sm p-6"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-black text-lg text-slate-800">
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
                                className="font-mono text-indigo-600"
                                dir="ltr"
                              >
                                {new Date(sale.startTime).toLocaleString(
                                  "ar-IQ",
                                )}
                              </span>
                            </div>
                            <div>
                              ينتهي:{" "}
                              <span
                                className="font-mono text-indigo-600"
                                dir="ltr"
                              >
                                {new Date(sale.endTime).toLocaleString("ar-IQ")}
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
                                  className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-[10px] hover:bg-indigo-100 transition"
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
                                      <h6 className="font-black text-[11px] text-slate-800">
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
              <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-gradient-to-l from-indigo-50 to-white flex items-center space-x-3 space-x-reverse">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-800">
                      البيانات الشخصية
                    </h3>
                    <p className="text-[10px] text-gray-400">
                      يمكنك تعديل أي شيء ما عدا رقم الهاتف واسم المستخدم
                    </p>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        اسم المالك *
                      </label>
                      <input
                        type="text"
                        value={profileForm.ownerName}
                        onChange={(e) =>
                          handleProfileFormChange({ ownerName: e.target.value })
                        }
                        className="w-full border border-gray-200 p-2.5 rounded-2xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        اسم المتجر *
                      </label>
                      <input
                        type="text"
                        value={profileForm.shopName}
                        onChange={(e) =>
                          handleProfileFormChange({ shopName: e.target.value })
                        }
                        className="w-full border border-gray-200 p-2.5 rounded-2xl text-sm"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        صنف المتجر *
                      </label>
                      <select
                        value={profileForm.category}
                        onChange={(e) =>
                          handleProfileFormChange({ category: e.target.value })
                        }
                        className="w-full border border-gray-200 p-2.5 rounded-2xl text-sm bg-white"
                      >
                        {STORE_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        رقم الهاتف
                      </label>
                      <input
                        type="tel"
                        value={currentMerchant.phone}
                        disabled
                        className="w-full border bg-gray-50 p-2.5 rounded-2xl text-sm text-gray-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">
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
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        المحافظة *
                      </label>
                      <select
                        value={profileForm.province}
                        onChange={(e) =>
                          handleProfileFormChange({ province: e.target.value })
                        }
                        className="w-full border border-gray-200 p-2.5 rounded-2xl text-sm bg-white"
                      >
                        {provinces.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        المنطقة / الحي *
                      </label>
                      <input
                        type="text"
                        value={profileForm.area}
                        onChange={(e) =>
                          handleProfileFormChange({ area: e.target.value })
                        }
                        className="w-full border border-gray-200 p-2.5 rounded-2xl text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        أقرب نقطة دالة *
                      </label>
                      <input
                        type="text"
                        value={profileForm.landmark}
                        onChange={(e) =>
                          handleProfileFormChange({ landmark: e.target.value })
                        }
                        className="w-full border border-gray-200 p-2.5 rounded-2xl text-sm"
                      />
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
                    </div>

                    <div className="md:col-span-2 grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">
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
                          className="w-full border border-gray-200 p-2.5 rounded-2xl text-sm"
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
                    className="w-full py-2.5 bg-gray-100 text-gray-700 font-bold rounded-2xl flex items-center justify-center space-x-2 space-x-reverse"
                  >
                    <Shield size={16} />
                    <span>تغيير كلمة المرور</span>
                  </button>
                  <button
                    onClick={() => setShowQRMenu(true)}
                    className="w-full py-2.5 bg-indigo-50 text-indigo-700 font-bold rounded-2xl flex items-center justify-center space-x-2 space-x-reverse"
                  >
                    <Camera size={16} />
                    <span>الهوية الرقمية (QR)</span>
                  </button>

                  <button
                    onClick={handleSaveProfile}
                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center space-x-2 space-x-reverse"
                  >
                    <Check size={18} />
                    <span>حفظ التعديلات</span>
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-800">الدعم الفني</h3>
                  <p className="text-xs text-gray-400">تواصل معنا عبر واتساب</p>
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
                className="w-full py-4 bg-red-50 text-red-500 font-bold rounded-3xl border border-red-100 flex items-center justify-center space-x-2 space-x-reverse"
              >
                <LogOut size={20} />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          )}
        </main>

        {/* Modal: طلب مشاركة في الفعالية */}
        {joinFlashSaleData && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-scale-in">
              <div className="flex justify-between items-center mb-4 pb-3 border-b">
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                  <Zap size={18} className="text-yellow-500" /> المشاركة بمنتج
                </h3>
                <button onClick={() => setJoinFlashSaleData(null)}>
                  <X size={20} className="text-gray-400 hover:text-gray-800" />
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
                      className="w-full border border-slate-200 p-3 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
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
                      className="w-full border border-slate-200 p-3 rounded-2xl text-sm font-bold text-rose-600 outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[80] flex items-center justify-center p-4">
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
                  <h3 className="text-xl font-black text-center text-slate-800 mb-2">
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

        {/* Modal: إضافة/تعديل منتج */}
        {prodModal.show && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl h-[85vh] overflow-y-auto animate-fade-in">
              <div className="flex justify-between items-center mb-6 pb-3 border-b">
                <h3 className="font-black text-gray-800">
                  {prodModal.mode === "add"
                    ? "إضافة منتج جديد"
                    : "تعديل المنتج"}
                </h3>
                <button
                  onClick={() => setProdModal({ show: false, mode: "add" })}
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              <form
                onSubmit={handleSaveProduct}
                className="space-y-4 text-right"
              >
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    اسم المنتج *
                  </label>
                  <input
                    type="text"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    required
                    className="w-full border p-3 rounded-2xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    رمز الباركود (اختياري)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={prodBarcode}
                      onChange={(e) => setProdBarcode(e.target.value)}
                      placeholder="امسح او ادخل الباركود"
                      className="w-full border p-3 rounded-2xl text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setProdModal({ ...prodModal, show: false });
                        setShowScanner(true);
                      }}
                      className="px-3 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center"
                    >
                      <Camera size={18} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    عرض خاص (اختياري)
                  </label>
                  <input
                    type="text"
                    value={prodSpecialOffer}
                    onChange={(e) => setProdSpecialOffer(e.target.value)}
                    placeholder="مثال: اشتري 2 واحصل على 1 مجاناً"
                    className="w-full border p-3 rounded-2xl text-sm text-green-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    الوصف
                  </label>
                  <textarea
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    className="w-full border p-3 rounded-2xl text-sm h-20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      السعر (د.ع) للزبون *
                    </label>
                    <input
                      type="number"
                      value={prodPrice || ""}
                      onChange={(e) =>
                        setProdPrice(parseInt(e.target.value) || 0)
                      }
                      required
                      className="w-full border p-3 rounded-2xl text-sm"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-black text-emerald-600 mb-1 flex items-center gap-1">
                      <Lock size={12} />
                      سعر الجملة (سري)💰
                    </label>
                    <input
                      type="number"
                      value={prodCostPrice || ""}
                      onChange={(e) =>
                        setProdCostPrice(parseInt(e.target.value) || 0)
                      }
                      placeholder="مخفي عن الزبون"
                      className="w-full border border-emerald-200 bg-emerald-50/30 focus:bg-white p-3 rounded-2xl text-sm transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    الكمية المتوفرة في المخزن (Inventory)
                  </label>
                  <input
                    type="number"
                    value={prodInventory || ""}
                    onChange={(e) =>
                      setProdInventory(parseInt(e.target.value) || 0)
                    }
                    className="w-full border p-3 rounded-2xl text-sm font-bold text-indigo-600"
                    placeholder="أدخل عدد القطع المتوفرة"
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setProdIsFreeDelivery(!prodIsFreeDelivery)}
                    className={`w-full py-3 rounded-2xl text-xs font-black transition-all border flex items-center justify-center gap-2 ${
                      prodIsFreeDelivery
                        ? "bg-emerald-500 text-white border-emerald-400"
                        : "bg-slate-50 text-slate-400 border-slate-100"
                    }`}
                  >
                    <Truck size={16} />
                    توصيل مجاني للمنتج
                  </button>
                </div>
                <div className="max-w-48 mx-auto">
                  <ImageUploader
                    value={prodImage}
                    onChange={setProdImage}
                    label="صورة المنتج"
                  />
                </div>

                {availableTags.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-3xl border space-y-2">
                    <h4 className="text-xs font-black text-gray-600 flex items-center gap-1">
                      الكلمات المفتاحية (تصنيف المنتج)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() =>
                            setProdTags((prev) =>
                              prev.includes(tag)
                                ? prev.filter((t) => t !== tag)
                                : [...prev, tag],
                            )
                          }
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition ${
                            prodTags.includes(tag)
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 p-4 rounded-3xl border space-y-3">
                  <h4 className="text-xs font-black text-gray-600 flex items-center gap-1">
                    <Ticket size={14} /> الخصومات
                  </h4>
                  <select
                    value={prodDiscountType}
                    onChange={(e) => {
                      setProdDiscountType(e.target.value as any);
                      setProdDiscountValue(0);
                    }}
                    className="w-full border p-2.5 rounded-2xl text-sm bg-white"
                  >
                    <option value="none">بدون خصم</option>
                    <option value="percent">خصم نسبة (%)</option>
                    <option value="amount">خصم مبلغ (د.ع)</option>
                  </select>
                  {prodDiscountType !== "none" && (
                    <input
                      type="number"
                      value={prodDiscountValue || ""}
                      onChange={(e) =>
                        setProdDiscountValue(parseInt(e.target.value) || 0)
                      }
                      className="w-full border p-3 rounded-2xl text-sm"
                    />
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    onClick={() => setProdStatus("published")}
                    className="w-full py-3 bg-indigo-600 text-white font-black rounded-2xl shadow-lg flex-1"
                  >
                    نشر مباشرة
                  </button>
                  <button
                    type="submit"
                    onClick={() => setProdStatus("draft")}
                    className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black rounded-2xl shadow-sm flex-1"
                  >
                    حفظ كمسودة
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Bulk Edit */}
        {showBulkEditModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-scale-in text-right">
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-xl text-slate-800">
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
                      className="w-full border p-4 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
                      className="w-full border p-4 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
                        onClick={() =>
                          setBulkUpdateData((prev) => ({
                            ...prev,
                            status: s.id as any,
                          }))
                        }
                        className={`py-3 rounded-2xl text-[11px] font-bold border-2 transition-all ${
                          bulkUpdateData.status === s.id
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                            : "border-transparent " + s.color
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleBulkUpdate}
                    className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
                  >
                    تحديث المنتجات المختارة
                  </button>
                  <button
                    onClick={() => setShowBulkEditModal(false)}
                    className="px-8 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all"
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl animate-fade-in relative">
              <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-black text-gray-800 flex items-center gap-2">
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
                <p className="text-center text-xs text-gray-500 mt-4 font-bold">
                  وجه الكاميرا نحو باركود المنتج
                  <br />
                  سيتم فتح صفحة المنتج تلقائياً للتعديل
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal: إنشاء بروموكود */}
        {promoModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-fade-in text-right max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 pb-2 border-b">
                <h3 className="font-black text-gray-800">إنشاء كود خصم</h3>
                <button onClick={() => setPromoModal(false)}>
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleCreatePromo} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    الكود
                  </label>
                  <input
                    type="text"
                    value={pCode}
                    onChange={(e) => setPCode(e.target.value.toUpperCase())}
                    required
                    className="w-full border p-3 rounded-2xl font-mono text-center uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      نوع الخصم
                    </label>
                    <select
                      value={pDiscountType}
                      onChange={(e) => setPDiscountType(e.target.value as any)}
                      className="w-full border p-3 rounded-2xl bg-white text-sm"
                    >
                      <option value="amount">مبلغ ثابت</option>
                      <option value="percent">نسبة مئوية (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      القيمة
                    </label>
                    <input
                      type="number"
                      value={pDiscount || ""}
                      onChange={(e) =>
                        setPDiscount(parseInt(e.target.value) || 0)
                      }
                      required
                      className="w-full border p-3 rounded-2xl text-center text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      إجمالي الاستخدام
                    </label>
                    <input
                      type="number"
                      value={pMaxUses || ""}
                      onChange={(e) =>
                        setPMaxUses(parseInt(e.target.value) || 0)
                      }
                      required
                      className="w-full border p-3 rounded-2xl text-center text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      للشخص الواحد
                    </label>
                    <input
                      type="number"
                      value={pMaxUsesPerUser || ""}
                      onChange={(e) =>
                        setPMaxUsesPerUser(parseInt(e.target.value) || 0)
                      }
                      required
                      className="w-full border p-3 rounded-2xl text-center text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    تحديد مدة الصلاحية
                  </label>
                  <select
                    value={pExpiryType}
                    onChange={(e) => setPExpiryType(e.target.value as any)}
                    className="w-full border p-3 rounded-2xl bg-white mb-2 text-sm"
                  >
                    <option value="days">بالأيام المتبقية</option>
                    <option value="date">بتاريخ محدد</option>
                  </select>

                  {pExpiryType === "days" ? (
                    <input
                      type="number"
                      placeholder="عدد الأيام"
                      value={pExpiryDays || ""}
                      onChange={(e) =>
                        setPExpiryDays(parseInt(e.target.value) || 0)
                      }
                      className="w-full border p-3 rounded-2xl text-center text-sm"
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1">
                          البدء (اختياري)
                        </label>
                        <input
                          type="date"
                          value={pStartDate}
                          onChange={(e) => setPStartDate(e.target.value)}
                          className="w-full border p-2 rounded-xl text-center text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1">
                          الانتهاء
                        </label>
                        <input
                          type="date"
                          value={pEndDate}
                          onChange={(e) => setPEndDate(e.target.value)}
                          className="w-full border p-2 rounded-xl text-center text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg mt-4 text-sm mt-6"
                >
                  تفعيل الكود
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal: إجراءات الطلب (رفض/إرجاع/استبدال) */}
        {actionModal.show && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden text-right p-8 border border-slate-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800">
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
                        className="w-full p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-2xl text-right font-black text-[10px] transition-all border border-slate-50"
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
                    className="w-full bg-slate-50 border border-slate-100 p-3 rounded-2xl text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500 min-h-[80px]"
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
                    className="w-full mt-3 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs disabled:opacity-50 shadow-lg shadow-indigo-100"
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden text-right flex flex-col max-h-[85vh] border border-slate-100"
            >
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <h3 className="text-xl font-black text-slate-800">استبدال المنتج 🔄</h3>
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
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                              : 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100'
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
                      className="w-full bg-slate-50 border border-slate-100 p-4 pr-12 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
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
                              ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100 shadow-sm' 
                              : 'bg-white border-slate-100 hover:border-indigo-100 hover:bg-slate-50'
                          }`}
                        >
                          <img src={p.image || undefined} className="w-12 h-12 rounded-xl object-cover border border-white shadow-sm" alt="" />
                          <div className="flex-1">
                            <p className="font-black text-xs text-slate-800 line-clamp-1">{p.name}</p>
                            <p className="text-[10px] font-bold text-indigo-600 mt-1">{p.finalPrice.toLocaleString()} د.ع</p>
                          </div>
                          {replacementProduct?.id === p.id && <CheckCircle size={18} className="text-indigo-500" />}
                        </button>
                      ))}
                  </div>
                )}

                {replacementProduct && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-emerald-50 rounded-[2rem] border border-emerald-100 space-y-4"
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
                        <p className="font-black text-sm text-slate-800">{replacementProduct.name}</p>
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
                  className="w-full py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm disabled:opacity-30 disabled:grayscale transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-[0.98]"
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
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 text-right">
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
                  <h3 className="text-xl font-black text-slate-800">تأكيد إرجاع الطلب</h3>
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
                   <div className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${skipReturnConfirm ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200 group-hover:border-indigo-300'}`}>
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
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
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
                        className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 text-xs font-black"
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
                          <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 mb-4">
                            <StoreIcon size={40} />
                          </div>
                        )}
                        <h2 className="text-2xl font-black text-slate-800">{currentMerchant?.shopName || currentMerchant?.ownerName}</h2>
                        <p className="text-xs font-bold text-slate-400 mt-1">{"متجركم المفضل"}</p>
                      </div>
                      <div className="text-left" dir="ltr">
                        <h1 className="text-4xl font-black text-slate-200 uppercase tracking-widest mb-4">INVOICE</h1>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400">رقم الفاتورة: <span className="text-slate-800">#{selectedInvoice.id}</span></p>
                          <p className="text-[10px] font-black text-slate-400">التاريخ: <span className="text-slate-800">{new Date(selectedInvoice.createdAt).toLocaleDateString("ar-IQ")}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Customer & Merchant Details */}
                    <div className="grid grid-cols-2 gap-8 mb-10">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-3 border-r-4 border-indigo-500 pr-3">مستلم الفاتورة:</p>
                        <p className="text-sm font-black text-slate-800 mb-1">{selectedInvoice.customerName}</p>
                        <p className="text-xs font-bold text-slate-500 mb-1">{selectedInvoice.customerPhone}</p>
                        <p className="text-xs font-bold text-slate-400 leading-relaxed italic">{selectedInvoice.customerProvince} - {selectedInvoice.customerAddress}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-3 border-r-4 border-slate-200 pr-3">المصدر:</p>
                        <p className="text-sm font-black text-slate-800 mb-1">{currentMerchant?.shopName || currentMerchant?.ownerName}</p>
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
                              <span className="text-xs font-black text-indigo-600">{(item.price * item.quantity).toLocaleString()} د.ع</span>
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
                        <div className="flex justify-between items-center p-4 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-100">
                          <span className="text-xs font-black uppercase">الإجمالي النهائي:</span>
                          <span className="text-lg font-black">{(selectedInvoice.total || 0).toLocaleString()} د.ع</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Note */}
                    <div className="mt-16 text-center">
                      <p className="text-[10px] font-bold text-slate-400 italic">شكراً لاختياركم {currentMerchant?.shopName || currentMerchant?.ownerName}! نأمل رؤيتكم مرة أخرى قريباً.</p>
                      <div className="w-16 h-1 bg-indigo-100 mx-auto mt-4 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {showPasswordChange && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-fade-in text-right">
              <div className="flex justify-between items-center mb-6 pb-2 border-b">
                <h3 className="font-black text-gray-800">تغيير كلمة المرور</h3>
                <button onClick={() => setShowPasswordChange(false)}>
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              <div className="space-y-4">
                {pwStep === 1 ? (
                  <>
                    <p className="text-xs text-gray-500 font-bold">
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
                      className="w-full py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-md"
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-fade-in text-right">
              <div className="flex justify-between items-center mb-6 pb-2 border-b">
                <h3 className="font-black text-gray-800">
                  إرسال هدية لـ {giftModal.customerName}
                </h3>
                <button
                  onClick={() =>
                    setGiftModal({
                      show: false,
                      customerId: "",
                      customerName: "",
                    })
                  }
                >
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleSendGift} className="space-y-4">
                <p className="text-xs text-gray-500">
                  سيتم إنشاء كود خصم خاص بشراء واحد فقط وإرساله كإشعار للزبون.
                </p>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    قيمة الخصم (د.ع)
                  </label>
                  <input
                    type="number"
                    value={giftAmount}
                    onChange={(e) =>
                      setGiftAmount(parseInt(e.target.value) || 0)
                    }
                    required
                    className="w-full border p-3 rounded-2xl text-center text-lg font-black text-indigo-600"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-pink-600 text-white font-black rounded-2xl shadow-lg shadow-pink-100 flex items-center justify-center gap-2"
                >
                  <Gift size={20} />
                  <span>إرسال الهدية الآن</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* مودال المشاركة المطور */}
        <AnimatePresence>
          {showShareModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden text-right border border-slate-100"
              >
                <div className="p-8 pb-4">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-slate-800">
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
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs font-bold text-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none leading-relaxed mb-4 min-h-[100px]"
                  />

                  <p className="text-[10px] font-black text-slate-400 mb-3 mr-1 uppercase tracking-widest text-center">
                    أين تريد النشر؟
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => executeShare("whatsapp")}
                      className="flex flex-col items-center gap-2 p-4 bg-emerald-50 text-emerald-600 rounded-3xl hover:bg-emerald-100 transition-colors group"
                    >
                      <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                        <MessageCircle size={24} />
                      </div>
                      <span className="text-[9px] font-black">واتساب</span>
                    </button>
                    <button
                      onClick={() => executeShare("telegram")}
                      className="flex flex-col items-center gap-2 p-4 bg-blue-50 text-blue-500 rounded-3xl hover:bg-blue-100 transition-colors group"
                    >
                      <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform text-blue-400">
                        <Send size={24} />
                      </div>
                      <span className="text-[9px] font-black">تيليجرام</span>
                    </button>
                    <button
                      onClick={() => executeShare("messenger")}
                      className="flex flex-col items-center gap-2 p-4 bg-indigo-50 text-indigo-500 rounded-3xl hover:bg-indigo-100 transition-colors group"
                    >
                      <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform text-indigo-400">
                        <MessageCircle size={24} />
                      </div>
                      <span className="text-[9px] font-black">ماسنجر</span>
                    </button>
                    <button
                      onClick={() => executeShare("instagram")}
                      className="flex flex-col items-center gap-2 p-4 bg-rose-50 text-rose-500 rounded-3xl hover:bg-rose-100 transition-colors group"
                    >
                      <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform text-rose-400">
                        <Camera size={24} />
                      </div>
                      <span className="text-[9px] font-black">انستقرام</span>
                    </button>
                    <button
                      onClick={() => executeShare("facebook")}
                      className="flex flex-col items-center gap-2 p-4 bg-blue-50 text-blue-800 rounded-3xl hover:bg-blue-100 transition-colors group"
                    >
                      <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform text-blue-700">
                        <Users size={24} />
                      </div>
                      <span className="text-[9px] font-black">فيسبوك</span>
                    </button>
                    <button
                      onClick={() => executeShare("copy")}
                      className="flex flex-col items-center gap-2 p-4 bg-slate-50 text-slate-600 rounded-3xl hover:bg-slate-100 transition-colors group"
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
                  <p className="text-[10px] text-indigo-600 font-black">
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
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[70] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl relative border-4 border-white"
              >
                <div className="p-6 pb-4">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                      <Camera size={20} className="text-indigo-500" /> الهوية
                      الرقمية
                    </h3>
                    <button
                      onClick={() => setShowQRMenu(false)}
                      className="p-2 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="bg-indigo-50 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-inner border border-indigo-100">
                    <div className="bg-white p-4 rounded-3xl shadow-md border">
                      <QRCode
                        value={`https://e-mahalak.com/store/${currentMerchant.username}`}
                        size={180}
                        fgColor="#4F46E5"
                      />
                    </div>
                    <h2 className="text-xl font-black text-indigo-900">
                      {currentMerchant.shopName}
                    </h2>
                    <p className="text-xs text-indigo-600 font-bold bg-white px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm">
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
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-2"
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
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl relative overflow-hidden text-center"
              >
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                  <AlertTriangle className="text-amber-500 w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-2">
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
                    className="p-3 bg-indigo-600 text-white rounded-2xl font-bold text-xs hover:bg-indigo-700 transition"
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
             <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden relative"
               >
                 <div className="bg-indigo-600 p-6 text-white flex justify-between items-center rounded-b-3xl shadow-lg relative z-10">
                    <h3 className="text-xl font-black flex items-center gap-2">
                       <User size={24} /> تفاصيل المتابع
                    </h3>
                    <button onClick={() => setSelectedAudienceId(null)} className="p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition">
                       <X size={20} />
                    </button>
                 </div>
                 
                 <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="text-center pb-6 border-b border-slate-100 border-dashed">
                       <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 flex items-center justify-center rounded-3xl mx-auto mb-4 shadow-inner">
                         <span className="text-4xl font-black">{aud.name.charAt(0)}</span>
                       </div>
                       <h2 className="text-2xl font-black text-slate-800">{aud.name}</h2>
                       <p className="text-sm text-slate-500 font-mono mt-1" dir="ltr">{aud.phone}</p>
                       <div className="flex justify-center gap-2 mt-4">
                          <span className={`px-4 py-1.5 rounded-xl font-black text-xs shadow-sm border ${
                            aud.tier === "Diamond" ? "bg-indigo-50 border-indigo-200 text-indigo-700" :
                            aud.tier === "Platinum" ? "bg-slate-800 border-slate-700 text-white" :
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

                       <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 col-span-2">
                          <span className="text-[10px] text-slate-400 font-bold block mb-1">الحالة مع متجرك</span>
                          <div className="flex gap-2 flex-wrap mt-2">
                             {aud.followedStores.includes(currentMerchant!.id) && <span className="bg-blue-50 text-blue-600 px-3 py-1 text-[10px] font-bold rounded-xl border border-blue-200">يتابع المتجر</span>}
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
                           window.open(`https://wa.me/${aud.phone.replace(/[^0-9]/g, '')}`, '_blank');
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
      </div>
    );
  }

  // ==========================================
  // واجهات تسجيل الدخول والتسجيل (مطابقة للزبون)
  // ==========================================

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-xl p-8 text-right animate-fade-in relative border-t-8 border-indigo-600 max-h-[90vh] overflow-y-auto">
        {/* اللوغو */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow">
            <StoreIcon size={32} />
          </div>
          <h1 className="text-2xl font-black text-gray-800">
            محلك - لوحة التاجر
          </h1>
          <p className="text-xs text-gray-400 mt-1">
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
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginMethod === 'phone' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => { setLoginMethod('phone'); setLoginError(''); }}
              >
                رقم الهاتف
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginMethod === 'username' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => { setLoginMethod('username'); setLoginError(''); }}
              >
                اسم المستخدم
              </button>
            </div>

            {loginMethod === 'phone' ? (
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">
                  رقم الهاتف <span className="text-red-500">*</span>
                </label>
                <div
                  className="flex items-center border border-gray-200 rounded-2xl overflow-hidden bg-white focus-within:border-indigo-500 transition-all"
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
                <label className="block text-xs font-bold text-gray-500 mb-1.5">
                  اسم المستخدم (username) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: azeaa_alalmi"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                  className="w-full border border-gray-200 p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-left"
                  dir="ltr"
                />
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">
                كلمة المرور <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="لا تقل عن 8 حروف"
                required
                className="w-full border border-gray-200 p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setLoginError("");
                setForgotPhone(loginPhone);
                setView("forgot");
              }}
              className="text-xs font-bold text-indigo-600 hover:underline px-1"
            >
              نسيت كلمة السر؟
            </button>
            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
            >
              تسجيل الدخول
            </button>
            <div className="text-center pt-4 border-t border-gray-100 text-sm text-gray-500">
              ليس لديك حساب؟{" "}
              <button
                type="button"
                onClick={() => setView("signup")}
                className="font-bold text-indigo-600"
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
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  الاسم الكامل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: حسين صفاء جبار"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                  className={`w-full border p-3 rounded-2xl text-sm ${ownerName.trim() ? "border-green-400" : "border-gray-200"}`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  رقم الهاتف (WhatsApp) <span className="text-red-500">*</span>
                </label>
                <div
                  className={`flex items-center border rounded-2xl overflow-hidden bg-white ${isPhoneValid ? "border-green-400" : phone ? "border-red-400" : "border-gray-200"}`}
                  dir="ltr"
                >
                  <span className="px-4 py-3 bg-gray-50 text-gray-500 text-sm font-bold border-r">
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

              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  اسم المحل / البيج <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: ازياء العالمي"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  required
                  className={`w-full border p-3 rounded-2xl text-sm ${shopName.trim() ? "border-green-400" : "border-gray-200"}`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
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
                <label className="block text-xs font-bold text-gray-500 mb-1">
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
                  className={`w-full border p-3 rounded-2xl text-sm font-mono ${isUsernameValid ? "border-green-400" : username ? "border-red-400" : "border-gray-200"}`}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  كلمة المرور <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="8 حروف أو أكثر"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`w-full border p-3 rounded-2xl text-sm ${isPasswordValid ? "border-green-400" : password ? "border-red-400" : "border-gray-200"}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
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
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    المنطقة / الحي <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: حي العامل"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    required
                    className="w-full border p-2.5 rounded-2xl text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  أقرب نقطة دالة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: متوسطة ........."
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  required
                  className="w-full border p-3 rounded-2xl text-sm"
                />
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
              </div>
              <div className="max-w-[120px] mx-auto">
                <ImageUploader
                  value={logoUrl}
                  onChange={setLogoUrl}
                  label="لوغو المحل (اختياري)"
                />
              </div>
              <div className="bg-indigo-50 p-4 rounded-3xl border border-indigo-100">
                <span className="text-[11px] font-black text-indigo-700 block mb-3">
                  باقة الاشتراك:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {subscriptionPlans.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlan(p.id)}
                      className={`p-2 border rounded-2xl text-center cursor-pointer transition ${selectedPlan === p.id ? "border-indigo-600 bg-white ring-4 ring-indigo-50" : "border-gray-200 opacity-60"}`}
                    >
                      <span className="block text-[10px] font-bold text-gray-800">
                        {p.name}
                      </span>
                      <span className="block text-[11px] font-black text-indigo-600">
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
              className={`w-full py-4 font-black rounded-2xl shadow-xl transition-all ${isFormValid ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
            >
              إنشاء حساب التاجر
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

        {/* OTP */}
        {view === "otp" && (
          <form onSubmit={handleOtpConfirm} className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-black text-gray-800">
                تأكيد رقم الهاتف
              </h3>
              <p className="text-sm text-gray-400 mt-2">
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
              className="w-full border-2 border-indigo-500 p-4 rounded-3xl text-center text-3xl font-mono tracking-[0.5em] focus:ring-4 focus:ring-indigo-100 focus:outline-none"
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
                    ? "text-indigo-600 hover:text-indigo-700" 
                    : "text-gray-400 cursor-not-allowed"
                }`}
              >
                {canResendOtp ? "إعادة إرسال الرمز" : `إعادة الإرسال خلال ${otpTimer} ثانية`}
              </button>
              
              <button
                type="button"
                onClick={() =>
                  setView(otpMode === "signup" ? "signup" : "forgot")
                }
                className="text-xs font-bold text-gray-400 hover:text-gray-600"
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
              <h3 className="text-xl font-black text-gray-800">
                استعادة كلمة المرور
              </h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">
                رقم الهاتف المسجل <span className="text-red-500">*</span>
              </label>
              <div
                className="flex items-center border border-gray-200 rounded-2xl overflow-hidden bg-white"
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
              <label className="block text-xs font-bold text-gray-500 mb-1.5">
                كلمة المرور الجديدة <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={forgotNewPassword}
                onChange={(e) => setForgotNewPassword(e.target.value)}
                placeholder="8 حروف أو أكثر"
                required
                className="w-full border border-gray-200 p-3.5 rounded-2xl text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg"
            >
              إرسال رمز OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setView("login");
                setLoginError("");
              }}
              className="w-full text-xs font-bold text-gray-400"
            >
              الرجوع لتسجيل الدخول
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
