import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/useApp';
import { Product, Store, Customer } from '../../types';
import { STORE_CATEGORIES, STORE_BADGES } from '../../constants';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, Heart, Wallet, User, Users, Search, MapPin, 
  Phone, Plus, Minus, Check, X, ClipboardList, Share2, Camera,
  Gift, Award, Bell, ShieldAlert, Store as StoreIcon, Trash2, LogOut,
  Ticket, Copy, Shield, Zap, ChevronRight, ChevronLeft, ShoppingCart, LayoutGrid, Sparkles, Cpu, Utensils, Shirt, ChevronDown, Star, Clock, CheckCircle, AlertCircle, Info, BellOff, Calendar, Lock, MessageCircle, RefreshCw, Send
} from 'lucide-react';
import { sendOTP } from '../../services/otpService';
import { LocationPicker } from '../../components/LocationPicker';
import { showLocalNotification, requestNotificationPermission, setupPushNotifications } from '../../lib/pushNotifications';

const notificationSound = new Audio(
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
);

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
    redeemRechargeCode
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
  const [activeTab, setActiveTab] = useState<'stores' | 'orders' | 'wallet' | 'profile'>('stores');
  
  // إدارة التصفح داخل المتجر المختار
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

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
                      s.area.toLowerCase().includes(searchQuery.toLowerCase());
    const matchProvince = selectedProvince === '' || s.province === selectedProvince;
    
    // الفلترة حسب التصنيف الفرعي (هنا نستخدم الوصف أو حقل النوع إذا توفر، سنبسطها بالاسم/الوصف)
    const matchSubCat = selectedSubCategory === '' || 
                        s.shopName.includes(selectedSubCategory) || 
                        (s.landmark && s.landmark.includes(selectedSubCategory));

    return matchName && matchProvince && matchSubCat;
  }).sort((a, b) => {
    // ترتيب حسب المسافة إذا توفرت الإحداثيات
    const coords = userCoords || (currentCustomer?.lat && currentCustomer?.lng ? { lat: currentCustomer.lat, lng: currentCustomer.lng } : null);
    if (coords && a.lat && a.lng && b.lat && b.lng) {
      const distA = calculateDistance(coords.lat, coords.lng, a.lat, a.lng);
      const distB = calculateDistance(coords.lat, coords.lng, b.lat, b.lng);
      return distA - distB;
    }
    return 0;
  });

  // تصفية الطلبات الخاصة بالزبون الحالي
  const customerOrders = orders.filter(o => o.customerId === currentCustomer?.id);
  const customerNotifications = notifications
    .filter(n => n.userId === currentCustomer?.id && n.role === 'customer')
    .sort((a, b) => {
      const timeA = (a.createdAt as any)?.toMillis ? (a.createdAt as any).toMillis() : Date.parse((a.createdAt as string) || '');
      const timeB = (b.createdAt as any)?.toMillis ? (b.createdAt as any).toMillis() : Date.parse((b.createdAt as string) || '');
      return (Number(timeB) || 0) - (Number(timeA) || 0);
    });
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

  const filteredStoreProducts = useMemo(() => {
    if (!selectedProductTag) return storeProducts;
    return storeProducts.filter(p => p.tags && p.tags.includes(selectedProductTag));
  }, [storeProducts, selectedProductTag]);

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

    for (const [storeId, group] of storeGroups) {
      const store = group.store;
      const storeItems = group.items;
      
      const storeSubtotal = storeItems.reduce((acc, item) => acc + (item.product.finalPrice * item.quantity), 0);
      const hasFreeDelivery = store.isFreeDelivery || storeItems.some(item => item.product.isFreeDelivery);
      const storeDeliveryCost = hasFreeDelivery ? 0 : (store.deliveryPrice || 0);
      const storeDiscount = storeId === storeGroups[0][0] ? discountAmount : 0;
      const storeTotal = Math.max(0, storeSubtotal + storeDeliveryCost - storeDiscount);

      totalValue += storeTotal;

      await placeOrder({
        storeId: store.id,
        storeName: store.shopName,
        customerId: currentCustomer.id,
        customerName: currentCustomer.name,
        customerPhone: currentCustomer.phone,
        customerAddress: currentCustomer.address,
        customerProvince: currentCustomer.province,
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

      summary += `📦 "${store.shopName}": ${storeItems.length} منتجات - ${(storeTotal || 0).toLocaleString()} د.ع\n`;
    }

    summary += `\n💰 الإجمالي الكلي: ${(totalValue || 0).toLocaleString()} د.ع`;
    setOrderSummary(summary);
    setShowOrderSuccess(true);
    setCart([]);
    setAppliedPromo(null);
    setShowCart(false);
  };

  // مشاركة المتجر (WhatsApp)
  // نظام المشاركة الشامل
  const openShareModal = (type: 'store' | 'product', data: any) => {
    const text = type === 'store' 
      ? `ألقِ نظرة على متجر "${data.shopName}" في تطبيق محلك! محل رهيب يعرض منتجات رائعة في منطقة ${data.area}.
رابط المتجر: https://mahallak.app/store/${data.id}`
      : `شاهد هذا المنتج: "${data.name}" بسعر ${data.price.toLocaleString()} د.ع في متجر "${data.shopName}".
رابط المنتج: https://mahallak.app/product/${data.id}`;
    
    setShareText(text);
    setShareConfig({ type, data });
    setShowShareModal(true);
  };

  const executeShare = (platform: 'whatsapp' | 'messenger' | 'telegram' | 'instagram' | 'facebook' | 'copy') => {
    const encodedText = encodeURIComponent(shareText);
    const url = shareConfig?.type === 'store' 
      ? `https://mahallak.app/store/${shareConfig?.data?.id}` 
      : `https://mahallak.app/product/${shareConfig?.data?.id}`;
    
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

    if (shareUrl) window.open(shareUrl, '_blank');
    
    // مكافأة النقاط (مرة واحدة في الدقيقة تقريباً لتجنب سوء الاستخدام)
    addCustomerPoints(currentCustomer!.id, 5);
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
      <div className="min-h-screen bg-slate-50 flex flex-col text-right font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20" dir="rtl">
        {/* مودال طلب الموقع */}
        <AnimatePresence>
          {showLocationModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl text-center"
              >
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
                  <MapPin size={40} className="animate-bounce" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">تفعيل الموقع الجغرافي</h3>
                <p className="text-sm text-slate-500 font-bold mb-8 leading-relaxed">
                  يرجى السماح بالوصول لموقعك لنتمكن من عرض المتاجر الأقرب إليك وحساب دقيق لمسافات التوصيل.
                </p>
                <div className="space-y-3">
                  <button 
                    onClick={requestLocation}
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition active:scale-95"
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
            <header className="relative bg-white shadow-sm transition-all duration-300">
              <div className="h-32 bg-gradient-to-l from-indigo-700 to-indigo-900 overflow-hidden relative">
                 <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
              </div>
              
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button 
                  onClick={() => setSelectedStore(null)} 
                  className="px-4 py-2 bg-white/90 hover:bg-white rounded-2xl text-slate-700 shadow-xl border border-white hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-black text-xs"
                >
                  <ChevronRight size={18} />
                  <span>رجوع للمتاجر</span>
                </button>
              </div>

              <div className="p-6 flex flex-col md:flex-row items-start md:items-center relative">
                <div className="relative">
                  <img 
                    src={selectedStore.logo || undefined} 
                    alt={selectedStore.shopName} 
                    className="w-24 h-24 rounded-[2rem] object-cover border-4 border-white shadow-2xl -mt-14 bg-white relative z-10"
                  />
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 bg-emerald-500 text-white border-4 border-white rounded-2xl flex items-center justify-center shadow-lg z-20">
                    <Check size={14} />
                  </div>
                </div>
                
                <div className="flex-1 text-right mt-4 md:mt-0 md:mr-6">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">{selectedStore.shopName}</h1>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-black border border-amber-100/50">
                      <Sparkles size={12} />
                      <span>{selectedStore.rating} تقييم</span>
                    </div>
                    {adminSettings.featuredStoreIds?.includes(selectedStore.id) && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-full text-xs font-black shadow-md">
                        <Zap size={12} fill="currentColor" /> مميز
                      </div>
                    )}
                    {(selectedStore.badges || []).map(badgeId => {
                      const badgeInfo = STORE_BADGES.find(b => b.id === badgeId);
                      if (!badgeInfo) return null;
                      return (
                        <div key={badgeId} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${badgeInfo.color}`}>
                          {badgeInfo.label}
                        </div>
                      )
                    })}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-indigo-500" />
                      <span>{selectedStore.province} • {selectedStore.area}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone size={14} className="text-emerald-500" />
                      <span className="tracking-widest">{selectedStore.phone}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-4">
                    <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black border transition-colors ${selectedStore.isFreeDelivery ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                      🚚 التوصيل: {selectedStore.isFreeDelivery ? 'مجاني بالكامل' : `${(selectedStore.deliveryPrice || 0).toLocaleString()} د.ع`}
                    </div>
                    <div className="px-4 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-[10px] font-black">
                      📦 {storeProducts.length} منتج
                    </div>
                  </div>
                </div>

                {/* أزرار التفاعل */}
                <div className="flex gap-2.5 mt-6 md:mt-0 self-stretch md:self-center">
                  <button 
                    onClick={() => {
                      if (!currentCustomer) {
                        alert('يرجى تسجيل الدخول لتقييم المتجر');
                        return;
                      }
                      setShowRateModal({ type: 'store', data: selectedStore });
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 text-amber-600 rounded-2xl font-black text-xs transition-all hover:bg-amber-100 shadow-sm border border-amber-100"
                  >
                    <Sparkles size={16} />
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
                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-xs transition-all active:scale-95 shadow-sm border ${
                      isFollowing 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-100' 
                      : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-200'
                    }`}
                  >
                    {isFollowing ? <Heart size={18} fill="currentColor" /> : <Plus size={18} />}
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
                    className={`p-3 rounded-2xl border transition-all active:scale-95 shadow-sm ${
                      isNotifOn 
                      ? 'bg-amber-50 text-amber-600 border-amber-100' 
                      : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-100'
                    }`}
                  >
                    <Bell size={20} fill={isNotifOn ? 'currentColor' : 'none'} />
                  </button>
                  
                  <button 
                    onClick={() => openShareModal('store', selectedStore)}
                    className="p-3 bg-white text-slate-600 border border-slate-100 hover:border-indigo-200 hover:text-indigo-600 rounded-2xl shadow-sm transition-all active:scale-95"
                  >
                    <Share2 size={20} />
                  </button>
                </div>
              </div>
            </header>

            <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
                  <h2 className="text-xl font-black text-slate-800">منتجات المتجر</h2>
                </div>
                {cart.length > 0 && (
                  <button 
                    onClick={() => setShowCart(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] animate-pulse shadow-lg shadow-indigo-200"
                  >
                    <ShoppingBag size={14} />
                    <span>السلة ({cart.length})</span>
                  </button>
                )}
              </div>

              {/* فلتر بحسب الوسوم (Tags Filtering) */}
              {storeTags.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-hide">
                  <button
                    onClick={() => setSelectedProductTag('')}
                    className={`px-5 py-2.5 rounded-2xl text-[11px] font-black whitespace-nowrap transition-all border ${
                      selectedProductTag === '' 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100' 
                      : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-200'
                    }`}
                  >
                    الكل
                  </button>
                  {storeTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setSelectedProductTag(tag === selectedProductTag ? '' : tag)}
                      className={`px-5 py-2.5 rounded-2xl text-[11px] font-black whitespace-nowrap transition-all border ${
                        selectedProductTag === tag 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100' 
                        : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              {filteredStoreProducts.length === 0 ? (
                <div className="py-24 text-center bg-white rounded-[3rem] border border-slate-100 shadow-sm px-10">
                  <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-slate-200">
                    <ShoppingBag size={48} />
                  </div>
                  <h4 className="text-slate-800 font-black text-lg mb-2">
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
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredStoreProducts.map(prod => (
                    <motion.div 
                      key={prod.id} 
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => {
                        setSelectedProductDetail(prod);
                        setDetailQty(1);
                      }}
                      className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 flex flex-col shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer group relative"
                    >
                      <div className="aspect-[4/5] overflow-hidden bg-slate-100 relative">
                        <img 
                          src={prod.image || undefined} 
                          alt={prod.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        />
                        
                        <div className="absolute top-4 left-4 right-4 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                           {prod.isFreeDelivery && (
                             <div className="bg-emerald-500 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg">
                               توصيل مجاني
                             </div>
                           )}
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               openShareModal('product', { ...prod, shopName: selectedStore?.shopName });
                             }}
                             className="p-2 bg-white/90 backdrop-blur-sm text-slate-600 rounded-xl shadow-lg border border-white hover:text-indigo-600 transition-colors"
                           >
                             <Share2 size={14} />
                           </button>
                        </div>

                        <div className="pt-4">
                           <p className="text-[10px] font-black text-slate-300 text-center flex items-center justify-center gap-1">
                              <Lock size={10} />
                              رقم الهاتف {currentCustomer?.phone} مربوط بالحساب
                           </p>
                        </div>

                        <div className="pt-4">
                           <p className="text-[10px] font-black text-slate-300 text-center flex items-center justify-center gap-1">
                              <Lock size={10} />
                              رقم الهاتف {currentCustomer?.phone} مربوط بالحساب
                           </p>
                        </div>

                        <div className="pt-4">
                           <p className="text-[10px] font-black text-slate-300 text-center flex items-center justify-center gap-1">
                              <Lock size={10} />
                              رقم الهاتف {currentCustomer?.phone} مربوط بالحساب
                           </p>
                        </div>

                        {prod.discountType !== 'none' && (
                          <div className="absolute bottom-4 right-4 bg-rose-500 text-white text-[10px] font-black px-3 py-1.5 rounded-2xl shadow-xl shadow-rose-200">
                            {prod.discountType === 'percent' ? `-${prod.discountValue}%` : `-${(prod.discountValue || 0).toLocaleString()}`}
                          </div>
                        )}
                      </div>

                      <div className="p-5 flex-1 flex flex-col text-right">
                        <span className="text-[9px] font-black text-indigo-400 mb-1 uppercase tracking-widest">{prod.category}</span>
                        <h4 className="font-black text-slate-800 text-sm mb-3 line-clamp-1">{prod.name}</h4>
                        {prod.tags && prod.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {prod.tags.map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-bold">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {prod.specialOffer && (
                          <div className="flex items-center gap-1.5 mb-3">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                            <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">{prod.specialOffer}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                          <div className="flex flex-col">
                            {prod.discountType !== 'none' && (
                              <span className="text-[10px] text-slate-300 line-through font-bold">{(prod.price || 0).toLocaleString()}</span>
                            )}
                            <div className="flex items-baseline gap-1">
                              <span className="font-black text-indigo-600 text-base">{(prod.finalPrice || 0).toLocaleString()}</span>
                              <span className="text-[9px] font-black text-slate-400">د.ع</span>
                            </div>
                          </div>

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(prod);
                            }}
                            className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-600 transition-colors shadow-lg shadow-slate-100 group-hover:scale-110 duration-300"
                          >
                            <Plus size={20} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* آراء وتقييمات العملاء */}
              {selectedStore && (
                <div className="mt-12 mb-8 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-2 h-8 bg-amber-400 rounded-full"></div>
                    <h2 className="text-xl font-black text-slate-800">تقييمات الزبائن</h2>
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
                            <h4 className="font-bold text-slate-800 text-sm">{review.customerName}</h4>
                            <div className="flex text-amber-400 text-xs" dir="ltr">
                              {[1, 2, 3, 4, 5].map(star => (
                                <span key={star} className={star <= review.rating ? 'text-amber-400' : 'text-slate-300'}>★</span>
                              ))}
                            </div>
                          </div>
                          {review.message && (
                            <p className="text-slate-600 text-sm">{review.message}</p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-2">{new Date(review.createdAt).toLocaleDateString('ar-IQ')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </main>
            
            {/* زر السلة العائم للموبايل */}
            <button 
              onClick={() => setShowCart(true)}
              className={`fixed bottom-24 left-6 p-5 bg-slate-900 text-white rounded-[2rem] shadow-2xl transition-all z-40 flex items-center gap-3 active:scale-95 sm:hidden ${cart.length > 0 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
            >
              <div className="relative">
                <ShoppingBag size={24} />
                <span className="absolute -top-3 -right-3 w-6 h-6 bg-indigo-600 border-4 border-slate-900 rounded-full flex items-center justify-center text-[10px] font-black">
                  {cart.length}
                </span>
              </div>
              <span className="font-black text-xs">عرض السلة</span>
            </button>
          </div>
        ) : (
          <>
            {/* الهيدر العلوي - تصميم عصري */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60 transition-all">
              <div className="max-w-4xl mx-auto px-4 h-16 flex justify-between items-center text-slate-800">
                
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
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm border border-indigo-50">
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
                    className="relative p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 hover:text-indigo-600 transition-all border border-slate-100"
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
                    className="relative p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100"
                  >
                    <ShoppingCart size={20} />
                    {cart.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center rounded-full shadow-lg border-2 border-white">
                        {cart.reduce((sum, item) => sum + item.quantity, 0)}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </header>

        {/* قائمة الإشعارات المنسدلة - تصميم جديد */}
        {showNotifications && (
          <div className="fixed inset-x-4 top-20 max-w-sm mx-auto bg-white rounded-3xl shadow-2xl shadow-indigo-200/40 border border-slate-100 z-50 animate-dropdown text-slate-800 overflow-hidden">
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
                    <h3 className="text-xl font-black text-slate-800">التنبيهات الأخيرة</h3>
                  </div>
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">{customerNotifications.length} تنبيه</span>
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
                      className={`p-4 text-right hover:bg-slate-50 transition-colors cursor-pointer group ${!n.read ? 'bg-indigo-50/30' : ''}`}
                      onClick={() => {
                        markNotificationAsRead(n.id);
                        if (n.type === 'order' || n.type === 'promo') {
                          handleTabChange('orders');
                        } else if (n.type === 'product' && n.targetId) {
                          const prod = products.find(p => p.id === n.targetId);
                          if (prod) {
                            const store = stores.find(s => s.id === prod.storeId);
                            if (store && !store.isBanned) {
                              setSelectedStore(store);
                              handleTabChange('stores');
                            }
                          }
                        }
                        setShowNotifications(false);
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-xs mb-1 ${!n.read ? 'font-black text-slate-900 group-hover:text-indigo-600' : 'font-bold text-slate-600'}`}>{n.title}</h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{n.message}</p>
                          <div className="flex items-center gap-1.5 mt-2 opacity-60">
                            <Clock size={10} />
                            <span className="text-[9px] font-bold">
                              {new Date(n.createdAt).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        {!n.read && <span className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 shadow-sm shadow-indigo-200"></span>}
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
                  className="text-[10px] font-black text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  إغلاق التنبيهات
                </button>
              </div>
            )}
          </div>
        )}

        {/* التاب المفتوح حالياً */}
        <main className="flex-1 p-4 overflow-y-auto">
          
          {/* تاب المتاجر والتصفح */}
          {activeTab === 'stores' && (
            <div className="space-y-6">
              {/* شريط الإعلانات المتحرك (Slider) */}
              {ads.length > 0 && (
                <div 
                  className="relative overflow-hidden rounded-3xl shadow-xl border border-indigo-100/50 bg-white group h-48 md:h-64 mx-1"
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
                          window.open(ad.link, '_blank');
                        }
                      }}
                      className={`absolute inset-0 transition-all duration-700 ease-in-out cursor-pointer ${idx === currentAdIndex ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}
                    >
                      <img src={ad.url || undefined} className="w-full h-full object-cover" alt="إعلان" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 text-white text-right">
                        <span className="bg-indigo-600 text-[10px] font-black px-3 py-1 rounded-full mb-3 w-fit shadow-lg tracking-widest border border-indigo-400">إعلان ممول</span>
                        <h3 className="text-xl font-black leading-tight drop-shadow-xl mb-1">{ad.title || 'اكتشف أفضل العروض في منطقتك!'}</h3>
                        <p className="text-sm text-indigo-100 opacity-90 drop-shadow-lg">{ad.desc || 'تسوّق الآن مع محلك'}</p>
                      </div>
                    </div>
                  ))}

                  {/* أزرار التنقل */}
                  {ads.length > 1 && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); prevAd(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-indigo-600/60 backdrop-blur-md text-white rounded-full transition-all z-20 flex items-center justify-center border border-white/20">
                        <ChevronLeft size={24} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); nextAd(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-indigo-600/60 backdrop-blur-md text-white rounded-full transition-all z-20 flex items-center justify-center border border-white/20">
                        <ChevronRight size={24} />
                      </button>
                    </>
                  )}
                  
                  {/* مؤشرات النقاط */}
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex space-x-2 space-x-reverse z-20">
                    {ads.map((_: any, idx: number) => (
                      <div key={idx} className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentAdIndex ? 'w-8 bg-indigo-500' : 'w-2 bg-white/40'}`} />
                    ))}
                  </div>
                </div>
              )}

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
                              <div className="bg-black/20 backdrop-blur px-4 py-2 rounded-2xl text-center min-w-[100px]">
                                <span className="text-[10px] font-bold block opacity-80 uppercase tracking-widest mb-1">ينتهي في</span>
                                <span className="font-mono font-black text-sm tracking-wider select-none">{new Date(sale.endTime).toLocaleDateString('en-GB')} {new Date(sale.endTime).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</span>
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
                                       <p className="text-[9px] font-bold opacity-80 mt-2 truncate bg-black/10 px-2 py-1 rounded-md">{store.shopName}</p>
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
                        <h3 className="font-black text-slate-800 text-xs tracking-tight">المميزة</h3>
                      </div>
                      <button 
                        onClick={() => setShowFullFeatured(!showFullFeatured)}
                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 transition"
                      >
                        {showFullFeatured ? 'أقل' : 'الكل'}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {(showFullFeatured 
                        ? uniqueStores.filter(s => adminSettings.featuredStoreIds?.includes(s.id))
                        : uniqueStores.filter(s => adminSettings.featuredStoreIds?.includes(s.id)).slice(0, 4)
                      ).map(store => (
                        <div 
                          key={`feat-${store.id}`}
                          onClick={() => setSelectedStore(store)}
                          className="flex flex-col items-center gap-2 cursor-pointer group/item"
                        >
                          <div className="relative">
                            <img src={store.logo || undefined} className="w-12 h-12 rounded-2xl object-cover ring-4 ring-slate-50 group-hover/item:ring-amber-200 transition-all shadow-sm" />
                            <div className="absolute -bottom-1 -right-1 bg-amber-400 text-white p-0.5 rounded-md shadow-sm">
                              <Zap size={10} fill="currentColor" />
                            </div>
                          </div>
                          <span className="text-[10px] font-black text-slate-700 truncate w-full text-center">{store.shopName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* المتاجر القريبة */}
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2rem] p-5 shadow-xl shadow-indigo-100 relative overflow-hidden group">
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
                        className="text-[10px] font-black text-indigo-100 hover:text-white transition"
                      >
                        {showFullNearby ? 'أقل' : 'الكل'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-auto">
                      {(() => {
                        const coords = userCoords || (currentCustomer?.lat && currentCustomer?.lng ? { lat: currentCustomer.lat, lng: currentCustomer.lng } : null);

                        const baseStores = (() => {
                          if (adminSettings.enableAutoNearby) {
                            // الفرز التلقائي حسب المسافة
                            const filtered = [...uniqueStores].filter(s => s.status === 'active');
                            if (coords) {
                              return [...filtered].sort((a, b) => {
                                if (a.lat && a.lng && b.lat && b.lng) {
                                  const distA = calculateDistance(coords.lat, coords.lng, a.lat, a.lng);
                                  const distB = calculateDistance(coords.lat, coords.lng, b.lat, b.lng);
                                  return distA - distB;
                                }
                                return 0;
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

                        const displayStores = showFullNearby ? baseStores : baseStores.slice(0, 4);

                        if (displayStores.length === 0) return <div className="col-span-2 py-4 text-center text-indigo-300 text-[10px] font-bold italic">لا توجد متاجر حالياً</div>;

                        return displayStores.map(store => {
                          const dist = (coords && store.lat && store.lng) 
                            ? calculateDistance(coords.lat, coords.lng, store.lat, store.lng).toFixed(1) 
                            : null;

                          return (
                            <div 
                              key={`near-${store.id}`}
                              onClick={() => setSelectedStore(store)}
                              className="flex flex-col items-center gap-2 cursor-pointer group/item bg-white/5 p-2 rounded-2xl hover:bg-white/10 transition-all border border-white/5"
                            >
                              <div className="relative">
                                <img src={store.logo || undefined} className="w-12 h-12 rounded-2xl object-cover ring-4 ring-white/10 group-hover/item:ring-white/30 transition-all shadow-lg" />
                                {dist && (
                                  <div className="absolute -bottom-1 -left-1 bg-white px-1.5 py-0.5 rounded-lg shadow-sm border border-indigo-100 flex items-center gap-0.5">
                                    <span className="text-[7px] font-black text-indigo-600 leading-none">{dist}كم</span>
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] font-black text-white truncate w-full text-center">{store.shopName}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* تصفح التصنيفات - تصميم أفقي أنيق */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                    <LayoutGrid size={16} className="text-indigo-600" />
                    <span>تصفح حسب الفئة</span>
                  </h3>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide px-1">
                  <button 
                    onClick={() => { setSelectedCategory(null); setSelectedSubCategory(''); }}
                    className={`flex flex-col items-center gap-2 min-w-[70px] transition-all duration-300 ${!selectedCategory ? 'scale-110' : 'opacity-60'}`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border transition-all ${!selectedCategory ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-200' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
                      <ShoppingBag size={24} />
                    </div>
                    <span className={`text-[10px] font-black ${!selectedCategory ? 'text-indigo-600' : 'text-slate-500'}`}>الكل</span>
                  </button>
                  {STORE_CATEGORIES.map(cat => (
                    <button 
                      key={cat.id}
                      onClick={() => { setSelectedCategory(cat); setSelectedSubCategory(''); }}
                      className={`flex flex-col items-center gap-2 min-w-[70px] transition-all duration-300 ${selectedCategory?.id === cat.id ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border transition-all ${selectedCategory?.id === cat.id ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-200' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
                        {cat.id === 'rest' ? <Utensils size={24} /> : 
                         cat.id === 'mark' ? <StoreIcon size={24} /> :
                         cat.id === 'clot' ? <Shirt size={24} /> :
                         cat.id === 'tech' ? <Cpu size={24} /> : <Sparkles size={24} />}
                      </div>
                      <span className={`text-[10px] font-black ${selectedCategory?.id === cat.id ? 'text-indigo-600' : 'text-slate-500'}`}>{cat.name}</span>
                    </button>
                  ))}
                </div>

                {selectedCategory && (
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide animate-fade-in px-1">
                    {(selectedCategory as any).sub.map((sub: string) => (
                      <button 
                        key={sub}
                        onClick={() => setSelectedSubCategory(selectedSubCategory === sub ? '' : sub)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black whitespace-nowrap border transition-all ${selectedSubCategory === sub ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-100' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* المتاجر والبحث */}
              <div className="space-y-5 px-1">
                <div className="flex flex-col gap-3">
                  <div className="relative group">
                    <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="ابحث عن متجر، علامة تجارية، أو نشاط..." 
                      className="w-full bg-white border border-slate-100 pr-12 py-4 rounded-2xl text-xs font-black shadow-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-[10px] font-black text-slate-400 whitespace-nowrap">عرض في:</label>
                    <div className="flex-1 relative">
                      <select 
                        value={selectedProvince}
                        onChange={(e) => setSelectedProvince(e.target.value)}
                        className="w-full bg-white border border-slate-100 px-4 py-3 rounded-2xl text-[10px] font-black shadow-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none appearance-none"
                      >
                        <option value="">كل محافظات العراق (18)</option>
                        {provinces.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <StoreIcon size={18} className="text-indigo-600" />
                    <span>المتاجر ({filteredStores.length})</span>
                  </h2>
                </div>

                {filteredStores.length === 0 ? (
                  <div className="py-20 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                       <Search size={40} className="text-slate-200" />
                    </div>
                    <p className="text-slate-500 font-black">عذراً، لم نجد نتائج!</p>
                    <p className="text-slate-400 text-[10px] mt-2 font-bold px-10 leading-relaxed text-center">جرّب البحث بكلمات أخرى أو تغيير تصنيف المتجر والمحافظة</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredStores.map(store => (
                      <div 
                        key={store.id} 
                        onClick={() => setSelectedStore(store)}
                        className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all cursor-pointer flex items-center gap-4 group"
                      >
                        <div className="relative shrink-0">
                          <img src={store.logo || undefined} className="w-20 h-20 rounded-[1.5rem] object-cover shadow-sm group-hover:scale-105 transition-transform duration-500 border border-slate-50" />
                          <div className={`absolute -bottom-1 -left-1 w-5 h-5 rounded-full border-[3px] border-white shadow-sm ${store.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1 text-right">
                            <h3 className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors truncate">{store.shopName}</h3>
                            <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg shrink-0">
                              <Star size={10} fill="currentColor" />
                              <span className="text-[10px] font-black">{store.rating}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold mb-3 text-right">
                            <MapPin size={10} />
                            <span className="truncate">{store.province} • {store.area}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 justify-start">
                             <span className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-xl text-[9px] font-black border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">{store.category || 'متجر منوع'}</span>
                             {adminSettings.featuredStoreIds?.includes(store.id) && (
                               <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-xl text-[9px] font-black flex items-center gap-1 border border-amber-100">
                                 <Zap size={8} fill="currentColor" />
                                 مميز
                               </span>
                             )}
                             {(store.badges || []).map(badgeId => {
                               const badgeInfo = STORE_BADGES.find(b => b.id === badgeId);
                               if (!badgeInfo) return null;
                               return (
                                 <span key={badgeId} className={`px-2.5 py-1 rounded-xl text-[9px] font-black flex items-center gap-1 border ${badgeInfo.color}`}>
                                   {badgeInfo.label}
                                 </span>
                               )
                             })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* تاب تتبع طلباتي */}
          {activeTab === 'orders' && (
            <div className="space-y-6 animate-fade-in px-1">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                    <ClipboardList size={18} />
                  </div>
                  <span>تتبع طلباتك</span>
                </h2>
                <div className="text-[10px] text-slate-400 font-bold bg-slate-100 px-3 py-1 rounded-full">
                  إجمالي ({customerOrders.length})
                </div>
              </div>

              {customerOrders.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingBag size={40} className="text-slate-200" />
                  </div>
                  <p className="text-slate-500 font-black">لا توجد طلبات سابقة</p>
                  <p className="text-slate-400 text-[10px] mt-2 px-10 font-bold leading-relaxed">ابدأ بالتسوق من المتاجر المفضلة لديك لتظهر طلباتك هنا</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {customerOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-6 text-right shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col gap-6">
                      
                      {/* ترويسة الطلب */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                           <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
                             <StoreIcon size={18} />
                           </div>
                           <div>
                             <span className="text-[10px] text-slate-400 font-black block mb-0.5">من متجر</span>
                             <h4 className="text-sm font-black text-slate-800 leading-none">{order.storeName}</h4>
                           </div>
                        </div>
                        <div className="text-left">
                           <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">إجمالي الطلب</span>
                           <span className="text-base font-black text-indigo-600">{(order.total || 0).toLocaleString()} <span className="text-[10px]">د.ع</span></span>
                        </div>
                      </div>

                      {/* حالة الطلب - الرسم البياني للتتبع */}
                      <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                        <div className="flex justify-between mb-2">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تتبع الحالة</span>
                           <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              order.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                              order.status === 'accepted' ? 'bg-indigo-100 text-indigo-600' :
                              order.status === 'shipped' ? 'bg-blue-100 text-blue-600' :
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
                           <div className={`absolute top-0 right-0 h-full bg-indigo-500 rounded-full transition-all duration-700 ${
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
                                    isActive ? 'bg-indigo-600 scale-125' : isRejected ? 'bg-rose-400' : 'bg-slate-300'
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
                        <div className={`px-4 py-3 rounded-2xl border flex items-start gap-3 ${
                          order.status === 'rejected' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-amber-50 border-amber-100 text-amber-700'
                        }`}>
                           <Info size={16} className="shrink-0 mt-0.5" />
                           <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-black uppercase tracking-widest leading-none opacity-60">
                                {order.status === 'rejected' ? 'سبب الرفض' : 'معلومات الإرجاع'}
                              </span>
                              <p className="text-xs font-black">{order.rejectionReason || order.returnReason}</p>
                           </div>
                        </div>
                      )}

                      {/* المنتجات والتفاصيل المالية */}
                      <div className="space-y-4">
                         <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>المنتجات ({order.items.length})</span>
                            <div className="flex items-center gap-1">
                               <Calendar size={12} />
                               <span>{new Date(order.createdAt).toLocaleDateString('ar-IQ')}</span>
                            </div>
                         </div>
                         <div className="grid gap-2">
                           {order.items.map((item, idx) => (
                             <div key={idx} className="flex justify-between items-center group">
                               <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-[9px] font-bold text-slate-500">
                                    {item.quantity}
                                  </div>
                                  <span className="text-xs font-black text-slate-700">{item.productName}</span>
                               </div>
                               <span className="text-[11px] font-bold text-slate-400">
                                 {((item.price || 0) * (item.quantity || 0)).toLocaleString()} د.ع
                               </span>
                             </div>
                           ))}
                         </div>
                         
                         {/* تفاصيل التوصيل */}
                         <div className="pt-4 border-t border-slate-50 flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                               <MapPin size={12} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">
                               عنوان التوصيل: {order.customerProvince} - {order.customerAddress}
                            </span>
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
                <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                    <Wallet size={18} />
                  </div>
                  <span>محفظة النقاط والولاء</span>
                </h2>
              </div>

              <div className="bg-white rounded-[2rem] border border-slate-100 p-1.5 flex gap-1 shadow-sm">
                <button
                  onClick={() => setWalletView('points')}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${walletView === 'points' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  النقاط والاستبدال
                </button>
                <button
                  onClick={() => setWalletView('gifts')}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${walletView === 'gifts' ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-100' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  الجوائز والأكواد
                </button>
              </div>

              {walletView === 'points' && (
                <div className="space-y-6">
                  {/* كارد النقاط ونظام المستويات المحسن */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-black rounded-[2.5rem] p-5 text-white shadow-2xl shadow-slate-200 border-b border-white/5">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full -ml-24 -mb-24 blur-3xl"></div>
                    
                    <div className="relative z-10">
                      {/*Header: Balance & Badge*/}
                      <div className="flex justify-between items-center mb-5">
                        <div className="text-right">
                          <h2 className="text-[11px] font-black text-slate-400 mb-1 flex items-center gap-1.5">
                             <Award size={14} className="text-indigo-400" />
                             رصيدك من النقاط
                          </h2>
                          <div className="flex items-baseline gap-1">
                             <span className="text-3xl font-black text-white leading-none tracking-tighter">
                                {currentCustomer?.points || 0}
                             </span>
                             <span className="text-[10px] font-black text-indigo-400">نقطة</span>
                          </div>
                        </div>
                        
                        <div className={`p-2.5 rounded-2xl backdrop-blur-xl border flex flex-col items-center justify-center min-w-[65px] shadow-lg ${
                          currentCustomer?.tier === 'Diamond' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-blue-500/10' : 
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
                           <span className="text-[10px] font-black text-indigo-400">
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
                                currentCustomer?.tier === 'Diamond' ? 'bg-blue-400' : 
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
                                    ? tier.key === 'Diamond' ? 'bg-blue-500 text-white ring-4 ring-blue-500/20 scale-110 shadow-lg' :
                                      tier.key === 'Platinum' ? 'bg-slate-400 text-white ring-4 ring-slate-400/20 scale-110 shadow-lg' :
                                      tier.key === 'Gold' ? 'bg-amber-500 text-white ring-4 ring-amber-500/20 scale-110 shadow-lg' :
                                      'bg-orange-500 text-white ring-4 ring-orange-500/20 scale-110 shadow-lg'
                                    : isAchieved 
                                      ? 'bg-indigo-500 text-white opacity-60' 
                                      : 'bg-white/5 text-slate-500 border border-white/10'
                                  }`}>
                                     {tier.icon}
                                  </div>
                                  <span className={`text-[9px] font-black transition-colors ${
                                    isCurrent 
                                    ? tier.key === 'Diamond' ? 'text-blue-400' :
                                      tier.key === 'Platinum' ? 'text-slate-300' :
                                      tier.key === 'Gold' ? 'text-amber-400' :
                                      'text-orange-400'
                                    : isAchieved ? 'text-indigo-400' : 'text-slate-600'
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
                          { points: 100, discount: 5000, title: 'كوبون فضي للخصم' },
                          { points: 200, discount: 12000, title: 'كوبون ذهبي للتوفير' },
                          { points: 500, discount: 35000, title: 'كوبون ملكي محترف' },
                        ].map((pkg, idx) => {
                          const canRedeem = (currentCustomer?.points || 0) >= pkg.points;
                          return (
                            <div key={idx} className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow relative overflow-hidden">
                               <div className="flex items-center gap-4 text-right">
                                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${canRedeem ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-300'}`}>
                                     <Gift size={24} />
                                  </div>
                                  <div>
                                     <h4 className="font-black text-slate-800 text-sm">خصم {(pkg.discount || 0).toLocaleString()} د.ع</h4>
                                     <p className="text-[10px] text-slate-400 font-bold">{pkg.title}</p>
                                  </div>
                               </div>
                               <button 
                                 onClick={() => handleRedeemPoints(pkg.points)}
                                 disabled={!canRedeem}
                                 className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all active:scale-95 ${
                                   canRedeem ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
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
                        <h3 className="font-black text-slate-800 text-sm">شحن نقاط عبر كود</h3>
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

                  <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100/50">
                    <p className="text-[10px] font-black text-slate-500 mb-3 flex items-center gap-2">
                       <Info size={14} className="text-indigo-600" />
                       كيفية جمع النقاط؟
                    </p>
                    <ul className="space-y-2">
                       <li className="flex items-center gap-2 text-[9px] font-bold text-slate-400">
                          <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
                          ترقية المستوى تمنحك (100، 125، 200) نقطة هدية حسب المستوى. يتم تصفير المستوى شهرياً.
                       </li>
                       <li className="flex items-center gap-2 text-[9px] font-bold text-slate-400">
                          <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
                          تكسب نقاطاً تلقائياً عند كل طلب مكتمل (1000 د.ع = نقطة واحدة).
                       </li>
                       <li className="flex items-center gap-2 text-[9px] font-bold text-slate-400">
                          <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
                          تكسب 5 نقاط هدية عند مشاركة رابط المتجر عبر الواتساب.
                       </li>
                       <li className="flex items-center gap-2 text-[9px] font-bold text-slate-400">
                          <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
                          تكسب 20 نقطة إضافية عند تقييم المتجر بعد إكمال طلبك.
                       </li>
                    </ul>
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
                      className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden"
                    >
                       <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse"></div>
                       <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full -ml-24 -mb-24 blur-2xl"></div>
                       
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
                                <h3 className="text-sm font-black text-slate-800">شحن نقاط عبر كود</h3>
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
                           <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center animate-bounce duration-[3000ms]">
                              <Ticket size={48} className="text-indigo-200" />
                           </div>
                           <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white shadow-md rounded-2xl flex items-center justify-center">
                              <Search size={20} className="text-indigo-600" />
                           </div>
                        </div>
                        <h4 className="text-slate-800 font-black text-lg mb-2">لا توجد أكواد حالياً</h4>
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
                                  <div className={`w-20 sm:w-28 flex flex-col items-center justify-center border-r border-dashed border-slate-200 relative ${p.source === 'points' ? 'bg-indigo-50' : 'bg-amber-50'}`}>
                                     {/* Punch Holes */}
                                     <div className="absolute -top-3 -right-3 w-6 h-6 bg-slate-50 rounded-full border border-slate-100 shadow-inner"></div>
                                     <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-slate-50 rounded-full border border-slate-100 shadow-inner"></div>
                                     
                                     <div className={`p-3 rounded-2xl mb-2 ${p.source === 'points' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {p.source === 'points' ? <Sparkles size={24} /> : <Gift size={24} />}
                                     </div>
                                     <span className={`text-[10px] font-black uppercase tracking-tighter ${p.source === 'points' ? 'text-indigo-500' : 'text-amber-600'}`}>
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
                                              <span className="text-2xl font-black text-slate-800">
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
                                        <div className={`bg-slate-50 border-2 border-dashed ${isCopied ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200'} p-4 rounded-2xl transition-all flex items-center justify-between group-hover/code:border-indigo-300`}>
                                           <div className="flex items-center gap-3">
                                              <code className={`text-lg font-black tracking-widest ${isCopied ? 'text-emerald-600' : 'text-indigo-600'}`}>
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
                                                : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 active:scale-95'
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
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                 
                 <div className="relative z-10">
                    <div className="relative inline-block mb-4 sm:mb-4">
                       <div className="w-20 h-20 rounded-[1.8rem] bg-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-indigo-100 border-4 border-white">
                          {currentCustomer?.name?.charAt(0)}
                       </div>
                       <div className="absolute -bottom-1 -left-1 w-8 h-8 bg-emerald-500 text-white border-4 border-white rounded-2xl flex items-center justify-center shadow-lg">
                          <Check size={14} />
                       </div>
                    </div>
                    <h2 className="text-xl font-black text-slate-800 mb-0.5">{currentCustomer?.name}</h2>
                    <div className="flex items-center justify-center gap-1.5 mb-5 select-none">
                       <Phone size={10} className="text-indigo-400" />
                       <span className="text-slate-400 font-black text-[10px] tracking-widest">{currentCustomer?.phone}</span>
                    </div>
                    
                    <div className="flex items-center justify-center gap-3">
                       <div className="px-5 py-2 bg-slate-50 border border-slate-100 rounded-2xl shrink-0">
                          <span className="text-[10px] text-slate-400 font-black block">الرصيد</span>
                          <span className="text-sm font-black text-slate-800">{(currentCustomer as any)?.balance?.toLocaleString() || '0'} د.ع</span>
                       </div>
                       <div className="px-5 py-2 bg-amber-50 border border-amber-100 rounded-2xl shrink-0">
                          <span className="text-[10px] text-amber-500 font-black block">النقاط</span>
                          <span className="text-sm font-black text-amber-600">{currentCustomer?.points} 🪙</span>
                       </div>
                    </div>
                 </div>
              </div>

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
                              className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 rounded-2xl text-xs font-black focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none" 
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-2 mr-1">المحافظة</label>
                                <select 
                                  value={profileForm.province} 
                                  onChange={e => setProfileForm(prev => ({...prev, province: e.target.value}))} 
                                  className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 rounded-2xl text-xs font-black focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none appearance-none"
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
                                  className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 rounded-2xl text-xs font-black focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none" 
                                />
                             </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-2 mr-1">محلة</label>
                                <input type="text" placeholder="محلة" value={profileForm.mahalla} onChange={e => setProfileForm(prev => ({...prev, mahalla: e.target.value}))} className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-2 mr-1">زقاق</label>
                                <input type="text" placeholder="زقاق" value={profileForm.zuqaq} onChange={e => setProfileForm(prev => ({...prev, zuqaq: e.target.value}))} className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-2 mr-1">دار</label>
                                <input type="text" placeholder="دار" value={profileForm.dar} onChange={e => setProfileForm(prev => ({...prev, dar: e.target.value}))} className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                             </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 mb-2 mr-1">أقرب نقطة دالة</label>
                            <input type="text" value={profileForm.landmark} onChange={e => setProfileForm(prev => ({...prev, landmark: e.target.value}))} className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 rounded-2xl text-xs font-black focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none" />
                          </div>
                       </div>
              {/* موقع الخارطة */}
              <div className="space-y-3 pt-4 border-t border-slate-50 mt-4">
                 <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1 flex items-center gap-1.5">
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
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]"
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
                      className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:border-indigo-200 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                         <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl group-hover:bg-slate-800 group-hover:text-white transition-colors">
                            <Shield size={20} />
                         </div>
                         <div className="text-right">
                            <span className="text-sm font-black text-slate-800 block">تغيير كلمة المرور</span>
                            <span className="text-[10px] text-slate-400 font-bold">تحديث أمان حسابك</span>
                         </div>
                      </div>
                      <ChevronLeft size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button 
                      onClick={() => setShowNotifications(true)}
                      className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:border-indigo-200 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                         <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
                            <Bell size={20} />
                         </div>
                         <div className="text-right">
                            <span className="text-sm font-black text-slate-800 block">مركز التنبيهات</span>
                            <span className="text-[10px] text-slate-400 font-bold">إدارة الإشعارات والعروض</span>
                         </div>
                      </div>
                      <ChevronLeft size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <a href="https://wa.me/9647735187868" target="_blank" rel="noopener noreferrer" className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:border-emerald-200 transition-colors group">
                      <div className="flex items-center gap-4">
                         <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <MessageCircle size={20} />
                         </div>
                         <div className="text-right">
                            <span className="text-sm font-black text-slate-800 block">الدعم الفني والواتساب</span>
                            <span className="text-[10px] text-slate-400 font-bold">تحدث معنا مباشرة</span>
                         </div>
                      </div>
                      <ChevronLeft size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </a>
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
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                  <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-scale-up overflow-hidden border border-white/20">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                             <Shield size={18} />
                          </div>
                          <h3 className="font-black text-slate-800 text-sm">تغيير كلمة المرور</h3>
                       </div>
                       <button onClick={() => { setShowPasswordChange(false); setPwStep(1); setOtpPwCode(''); setNewPassword(''); }} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all"><X size={18} className="text-slate-400" /></button>
                    </div>
                    <div className="p-8 space-y-6">
                      {pwStep === 1 ? (
                        <>
                          <div className="text-center bg-indigo-50 p-6 rounded-3xl mb-4 border border-indigo-100">
                             <p className="text-[11px] font-black text-indigo-600 leading-relaxed">سنقوم بإرسال رمز التحقق (OTP) إلى رقم هاتفك المسجل لتأكيد هويتك</p>
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
                             }} className="w-full py-4 bg-indigo-600 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition active:scale-95">إرسال رمز التحقق</button>
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
                               className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center text-lg font-black tracking-[0.5em] focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all placeholder:tracking-normal placeholder:text-[10px]" 
                             />
                             <div className="relative">
                                <input 
                                  type="password" 
                                  value={newPassword} 
                                  onChange={e => setNewPassword(e.target.value)} 
                                  placeholder="كلمة المرور الجديدة (8+ رموز)" 
                                  className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center text-sm font-black focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all" 
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
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200/60 flex justify-around items-center px-4 py-3 z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.03)] select-none">
          {[
            { id: 'stores', label: 'الرئيسية', icon: LayoutGrid },
            { id: 'orders', label: 'طلباتي', icon: ClipboardList, badge: customerOrders.filter(o => o.status === 'pending').length },
            { id: 'wallet', label: 'المحفظة', icon: Wallet, gift: currentCustomer.points >= 100 },
            { id: 'profile', label: 'حسابي', icon: User }
          ].map((tab) => {
            const active = activeTab === tab.id && !selectedStore;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex flex-col items-center gap-1.5 px-3 py-1 rounded-2xl transition-all duration-300 relative ${active ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <div className={`p-2 rounded-xl transition-colors ${active ? 'bg-indigo-100/50' : 'bg-transparent'}`}>
                  <tab.icon size={22} className={active ? 'stroke-[2.5]' : ''} />
                </div>
                
                {(tab.badge || 0) > 0 && (
                  <span className="absolute top-1 right-2 w-4 h-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white ring-px ring-rose-200 animate-pulse">
                    {tab.badge}
                  </span>
                )}

                {tab.gift && (
                  <span className="absolute top-1 right-2 bg-yellow-500 text-slate-900 text-[8px] px-1.5 rounded-full font-black animate-bounce shadow-sm border border-white">
                    🎁
                  </span>
                )}

                <span className={`text-[10px] font-black tracking-tighter transition-all ${active ? 'opacity-100' : 'opacity-70'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* سلة المشتريات (Drawer) */}
        {showCart && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
            <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-slide-left text-right">
              
              <div className="p-4 bg-indigo-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowCart(false)}
                    className="p-1 px-2 border border-white/20 rounded-xl hover:bg-white/10 transition-all flex items-center gap-1 font-black text-[10px]"
                  >
                    <ChevronRight size={16} />
                    <span>رجوع</span>
                  </button>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <ShoppingBag size={20} />
                    <h3 className="text-md font-black">سلة المشتريات ({cart.reduce((acc, curr) => acc + curr.quantity, 0)})</h3>
                  </div>
                </div>
                <button onClick={() => setShowCart(false)} className="p-1 hover:bg-indigo-800 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-400">
                  <ShoppingBag size={64} className="mb-4 text-gray-200" />
                  <p className="font-bold">سلة مشترياتك فارغة!</p>
                  <p className="text-xs mt-1 text-center">أضف منتجات من المتاجر لبدء الطلب.</p>
                  <button onClick={() => setShowCart(false)} className="mt-6 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition">تصفح المتاجر الآن</button>
                </div>
              ) : (
                <>
                  {/* تنبيه الطلب من عدة متاجر */}
                  {Object.keys(cartByStore).length > 1 && (
                    <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-[10px] font-bold text-amber-700 text-center">
                      ⚠️ أنت تطلب من {Object.keys(cartByStore).length} متاجر مختلفة - سيتم إرسال طلب منفصل لكل متجر
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* معلومات العنوان المختار داخل السلة مع إمكانية التغيير */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-white text-indigo-600 rounded-xl shadow-sm border border-slate-100">
                            <MapPin size={18} />
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 mb-0.5">عنوان التوصيل الحالي</p>
                            <p className="text-[11px] font-black text-slate-700 leading-tight">
                              {currentCustomer?.province} {currentCustomer?.address ? `- ${currentCustomer.address}` : ''}
                            </p>
                         </div>
                      </div>
                      <button 
                        onClick={() => { setShowCart(false); setActiveTab('profile'); }}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="تغيير العنوان"
                      >
                         <RefreshCw size={18} />
                      </button>
                    </div>

                    {/* عرض المنتجات مجمعة حسب المتجر */}
                    {Object.entries(cartByStore).map(([storeId, group]) => (
                      <div key={storeId} className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100">
                        {/* اسم المتجر */}
                        <div className="flex items-center space-x-2 space-x-reverse mb-2 pb-2 border-b border-dashed border-gray-200">
                          <img src={group.store.logo || undefined} alt="" className="w-6 h-6 rounded-lg object-cover" />
                          <span className="text-xs font-black text-indigo-600">{group.store.shopName}</span>
                          <span className="text-[10px] text-gray-400 mr-auto">
                            🚚 {group.store.isFreeDelivery || group.items.some(i => i.product.isFreeDelivery) ? 'توصيل مجاني' : `توصيل: ${group.store.deliveryPrice?.toLocaleString() || '0'} د.ع`}
                          </span>
                        </div>
                        
                        {/* منتجات هذا المتجر */}
                        {group.items.map(item => (
                          <div key={item.product.id} className="flex items-center space-x-3 space-x-reverse py-2 border-b border-gray-100 last:border-0 last:pb-0">
                            <img src={item.product.image || undefined} alt={item.product.name} className="w-10 h-10 object-cover rounded-lg border" />
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-800 text-[11px] truncate">{item.product.name}</h4>
                              <span className="text-indigo-600 font-bold text-[11px]">{((item.product?.finalPrice || 0) * (item.quantity || 0)).toLocaleString()} د.ع</span>
                              {item.product?.discountType !== 'none' && <span className="text-[9px] text-gray-400 line-through mr-1">{((item.product?.price || 0) * (item.quantity || 0)).toLocaleString()} د.ع</span>}
                            </div>

                            <div className="flex items-center border border-gray-200 bg-white rounded-lg overflow-hidden">
                              <button onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)} className="p-1 hover:bg-gray-100 text-gray-600 border-l border-gray-100">
                                {item.quantity === 1 ? <Trash2 size={12} className="text-red-500" /> : <Minus size={12} />}
                              </button>
                              <span className="px-2 text-[11px] font-bold text-gray-800">{item.quantity}</span>
                              <button onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)} className="p-1 hover:bg-gray-100 text-gray-600 border-r border-gray-100">
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="p-4 border-t border-gray-100 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.03)] space-y-4">
                    
                    {!appliedPromo ? (
                      <form onSubmit={handleApplyPromo} className="space-y-1">
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="أدخل بروموكود خصم..." 
                            value={promoInput}
                            onChange={(e) => setPromoInput(e.target.value)}
                            className="flex-1 border border-gray-200 p-2 rounded-xl text-xs text-center focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono uppercase"
                            style={{ direction: 'ltr' }}
                          />
                          <button type="submit" className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs rounded-xl transition">تطبيق</button>
                        </div>
                        {promoError && <p className="text-[10px] text-red-500 font-semibold">{promoError}</p>}
                        <p className="text-[9px] text-gray-400">تلميح: جرب كود <span className="font-mono bg-gray-100 px-1 rounded text-gray-600">OFF15</span></p>
                      </form>
                    ) : (
                      <div className="bg-green-50 border border-green-200 text-green-700 p-2.5 rounded-xl flex justify-between items-center text-xs font-semibold">
                        <span className="flex items-center space-x-1 space-x-reverse">
                          <Check size={16} />
                          <span>تم تطبيق الخصم: <strong className="font-mono bg-green-200/50 px-1.5 py-0.5 rounded">{appliedPromo.code}</strong></span>
                        </span>
                        <button onClick={() => setAppliedPromo(null)} className="p-1 text-green-700 hover:bg-green-100 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}

                    <div className="border-b border-dashed border-gray-200 pb-3 text-xs font-semibold text-gray-600 space-y-2">
                      <div className="flex justify-between">
                        <span>المجموع الفرعي:</span>
                        <span className="text-gray-800">{(subtotal || 0).toLocaleString()} د.ع</span>
                      </div>
                      
                      {/* تفصيل رسوم التوصيل لكل متجر */}
                      {Object.entries(cartByStore).map(([storeId, group]) => {
                        const hasFree = group.store.isFreeDelivery || group.items.some(i => i.product.isFreeDelivery);
                        return (
                          <div key={storeId} className="flex justify-between text-[10px]">
                            <span className="text-gray-400">🚚 توصيل {group.store.shopName}:</span>
                            <span className={hasFree ? 'text-green-600' : 'text-gray-600'}>
                              {hasFree ? 'مجاني' : `${group.store.deliveryPrice?.toLocaleString() || '0'} د.ع`}
                            </span>
                          </div>
                        );
                      })}
                      
                      <div className="flex justify-between border-t border-gray-100 pt-2">
                        <span>إجمالي التوصيل:</span>
                        <span className={deliveryCost === 0 ? 'text-green-600' : 'text-gray-800'}>
                          {deliveryCost === 0 ? 'مجاني 🎉' : `${(deliveryCost || 0).toLocaleString()} د.ع`}
                        </span>
                      </div>
                      {appliedPromo && (
                        <div className="flex justify-between text-red-600">
                          <span>خصم البروموكود:</span>
                          <span>- {(appliedPromo?.discountValue || 0).toLocaleString()} د.ع</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-sm font-black text-gray-800 border-t border-gray-100 pt-3 mt-2">
                        <span>الإجمالي النهائي:</span>
                        <span className="text-indigo-600 text-base">{(total || 0).toLocaleString()} د.ع</span>
                      </div>
                    </div>

                    <button 
                      onClick={handlePlaceOrder}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg transition text-center flex items-center justify-center space-x-2 space-x-reverse"
                    >
                      <Check size={20} />
                      <span>
                        {Object.keys(cartByStore).length > 1 
                          ? `تأكيد وإرسال الطلبات إلى ${Object.keys(cartByStore).length} متاجر` 
                          : 'تأكيد وإرسال الطلب'}
                      </span>
                    </button>
                    
                    <p className="text-[9px] text-gray-400 text-center font-bold">
                      💡 الدفع عند الاستلام (COD) | الطلبات ترسل لكل متجر بشكل منفصل
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
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[80] flex items-center justify-center p-0 md:p-4 overflow-y-auto">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 50 }}
                className="bg-white w-full max-w-2xl min-h-screen md:min-h-0 md:rounded-[3rem] shadow-2xl overflow-hidden text-right flex flex-col relative"
              >
                {/* زر الرجوع المطور */}
                <button 
                  onClick={() => setSelectedProductDetail(null)}
                  className="absolute top-6 left-6 z-20 px-4 py-2 bg-white/95 backdrop-blur-sm text-slate-800 rounded-2xl flex items-center gap-2 shadow-2xl border border-slate-100 hover:scale-105 active:scale-95 transition-all font-black text-xs"
                >
                  <ChevronRight size={18} />
                  <span>رجوع</span>
                </button>

                <div className="flex flex-col md:flex-row h-full">
                  {/* الصورة الكبيرة */}
                  <div className="w-full md:w-1/2 h-[50vh] md:h-auto bg-slate-100 relative group">
                    <img 
                      src={selectedProductDetail.image || undefined} 
                      alt={selectedProductDetail.name} 
                      className="w-full h-full object-cover"
                    />
                    {selectedProductDetail.discountType !== 'none' && (
                      <div className="absolute bottom-6 right-6 bg-rose-500 text-white px-4 py-2 rounded-2xl font-black text-sm shadow-xl shadow-rose-200">
                        {selectedProductDetail.discountType === 'percent' ? `خصم ${selectedProductDetail.discountValue}%` : `توفير ${selectedProductDetail.discountValue.toLocaleString()} د.ع`}
                      </div>
                    )}
                  </div>

                  {/* المحتوى */}
                  <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <span className="text-[10px] font-black tracking-widest text-indigo-500 uppercase px-3 py-1 bg-indigo-50 rounded-full inline-block mb-3">
                          {selectedProductDetail.category}
                        </span>
                        <h2 className="text-2xl font-black text-slate-800 leading-tight mb-2">
                          {selectedProductDetail.name}
                        </h2>

                        {selectedProductDetail.tags && selectedProductDetail.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {selectedProductDetail.tags.map(tag => (
                              <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black border border-slate-200">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {selectedProductDetail.specialOffer && (
                          <div className="bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
                            <Ticket size={24} className="text-emerald-500" />
                            <div className="flex-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 opacity-60">عرض خاص متوفر</p>
                                <p className="text-sm font-black">{selectedProductDetail.specialOffer}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-slate-500 text-sm leading-relaxed mb-8 flex-1">
                      {selectedProductDetail.description || 'هذا المنتج المميز متوفر الآن في متجرنا. جودة عالية وسعر مناسب.'}
                    </p>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-3xl">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 mb-1">السعر الحالي</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-indigo-600">
                              {(selectedProductDetail.finalPrice || selectedProductDetail.price).toLocaleString()}
                            </span>
                            <span className="text-xs font-black text-slate-400">د.ع</span>
                          </div>
                        </div>

                        <div className="flex items-center bg-white rounded-2xl shadow-sm border border-slate-100 p-1">
                          <button 
                            onClick={() => setDetailQty(Math.max(1, detailQty - 1))}
                            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <Minus size={18} />
                          </button>
                          <span className="w-10 text-center font-black text-slate-800">{detailQty}</span>
                          <button 
                            onClick={() => setDetailQty(detailQty + 1)}
                            className="w-10 h-10 flex items-center justify-center text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button 
                          onClick={() => {
                            addToCart(selectedProductDetail, detailQty);
                            setSelectedProductDetail(null);
                          }}
                          className="flex-[3] bg-slate-900 hover:bg-black text-white py-4 rounded-[1.5rem] font-black text-sm shadow-xl shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                          <ShoppingCart size={20} />
                          إضافة للسلة ({( (selectedProductDetail.finalPrice || selectedProductDetail.price) * detailQty).toLocaleString()} د.ع)
                        </button>
                        <button 
                          onClick={() => openShareModal('product', { ...selectedProductDetail, shopName: selectedStore?.shopName })}
                          className="flex-1 bg-white border border-slate-200 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 py-4 rounded-[1.5rem] flex items-center justify-center transition-all shadow-sm"
                        >
                          <Share2 size={24} />
                        </button>
                        <button 
                          onClick={() => setShowRateModal({ type: 'product', data: selectedProductDetail })}
                          className="flex-1 bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100 py-4 rounded-[1.5rem] flex items-center justify-center transition-all shadow-sm"
                        >
                          <Sparkles size={24} />
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
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
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
                  <h3 className="font-black text-slate-800 text-xl text-center mb-2">تأكيد الاستبدال</h3>
                  <p className="text-sm font-bold text-slate-500 text-center mb-6">
                    هل أنت متأكد من رغبتك في استبدال {showRedeemConfirm} نقطة وتحويلها إلى كود خصم؟
                  </p>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={confirmRedeemPoints}
                      className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl transition hover:bg-indigo-700"
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
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl"
              >
                <div className="p-6 text-center space-y-4 text-right">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-slate-800 text-lg">تقييم ال{showRateModal.type === 'store' ? 'متجر' : 'منتج'}</h3>
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
                        className="w-full text-sm p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none h-24"
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
                    className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-200"
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
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-md bg-indigo-950/40 text-right">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl text-center relative border border-slate-100"
              >
                <div className="bg-indigo-600 p-10 flex flex-col items-center relative">
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
                      className="py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 text-[10px] sm:text-xs"
                    >
                      تتبع طلبي الآن
                    </button>
                    <button 
                      onClick={() => { setShowOrderSuccess(false); handleTabChange('stores'); setSelectedStore(null); }}
                      className="py-4 bg-white text-indigo-600 border border-indigo-100 font-black rounded-2xl shadow-sm hover:bg-indigo-50 transition-all active:scale-95 text-[10px] sm:text-xs"
                    >
                      إكمال التسوق
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setShowShareModal(false)}
                          className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-all ml-1"
                        >
                          <ChevronRight size={20} />
                        </button>
                        <h3 className="text-xl font-black text-slate-800">مشاركة مع الأصدقاء</h3>
                      </div>
                      <button onClick={() => setShowShareModal(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                        <X size={20} />
                      </button>
                   </div>

                   <p className="text-[10px] font-black text-slate-400 mb-2 mr-1 uppercase tracking-widest">معاينة نص المشاركة</p>
                   <textarea 
                    value={shareText}
                    onChange={(e) => setShareText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs font-bold text-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none leading-relaxed mb-4 min-h-[100px]"
                   />

                   <p className="text-[10px] font-black text-slate-400 mb-3 mr-1 uppercase tracking-widest text-center">اختر منصة المشاركة</p>
                   
                   <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => executeShare('whatsapp')} className="flex flex-col items-center gap-2 p-4 bg-emerald-50 text-emerald-600 rounded-3xl hover:bg-emerald-100 transition-colors group">
                        <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                          <MessageCircle size={24} />
                        </div>
                        <span className="text-[9px] font-black">واتساب</span>
                      </button>
                      <button onClick={() => executeShare('telegram')} className="flex flex-col items-center gap-2 p-4 bg-blue-50 text-blue-500 rounded-3xl hover:bg-blue-100 transition-colors group">
                        <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform text-blue-400">
                           <Send size={24} />
                        </div>
                        <span className="text-[9px] font-black">تيليجرام</span>
                      </button>
                      <button onClick={() => executeShare('messenger')} className="flex flex-col items-center gap-2 p-4 bg-indigo-50 text-indigo-500 rounded-3xl hover:bg-indigo-100 transition-colors group">
                        <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform text-indigo-400">
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
                      <button onClick={() => executeShare('facebook')} className="flex flex-col items-center gap-2 p-4 bg-blue-50 text-blue-800 rounded-3xl hover:bg-blue-100 transition-colors group">
                        <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform text-blue-700">
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
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
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
                  <h3 className="text-xl font-black text-slate-800 text-center mb-2">تنبيه: تغييرات غير محفوظة</h3>
                  <p className="text-sm text-slate-500 text-center leading-relaxed">
                    لقد قمت بتعديل بياناتك الشخصية ولكن لم تقم بحفظها بعد. هل تريد حفظ التغييرات قبل الانتقال؟
                  </p>
                </div>
                
                <div className="p-6 bg-slate-50 flex flex-col gap-3">
                  <button 
                    onClick={() => handleConfirmUnsaved(true)}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]"
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
                    className="w-full py-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    إلغاء والبقاء في الصفحة
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
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-xl p-8 text-right animate-fade-in relative border-t-8 border-indigo-600 max-h-[90vh] overflow-y-auto">
        
        {/* اللوغو والعنوان */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow">
            <ShoppingBag size={32} />
          </div>
          <h1 className="text-2xl font-black text-gray-800">
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
              هل نسيت كلمة السر؟
            </button>
            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={20} className="rotate-180" />
              <span>تسجيل الدخول</span>
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
              <h3 className="text-xl font-black text-gray-800">
                استعادة كلمة المرور
              </h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">
                رقم الهاتف المسجل <span className="text-red-500">*</span>
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
                className="w-full border border-gray-200 p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-gray-400"
              />
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
            >
              إرسال رمز OTP
            </button>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setView("login")}
                className="text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors"
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
              <h3 className="text-xl font-black text-gray-800">تأكيد الرمز</h3>
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
              className="w-full border border-gray-200 p-4 rounded-2xl text-center text-3xl font-black font-mono tracking-[0.5em] focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-gray-300"
            />
            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
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
                className="text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors"
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
                  className={`w-full border p-3 rounded-2xl text-sm ${custName.trim() ? "border-green-400" : "border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"}`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  رقم الهاتف (WhatsApp) <span className="text-red-500">*</span>
                </label>
                <div
                  className={`flex items-center border rounded-2xl overflow-hidden bg-white ${isPhoneValid ? "border-green-400" : custPhone ? "border-red-400" : "border-gray-200 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:outline-none"}`}
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
                  className={`w-full border p-3 rounded-2xl text-sm ${isCustomerPasswordValid ? "border-green-400" : custPassword ? "border-red-400" : "border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"}`}
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
                    className="w-full border border-gray-200 p-3 rounded-2xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="w-full border border-gray-200 p-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="w-full border border-gray-200 p-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">زقاق</label>
                  <input
                    type="text"
                    placeholder="مثال: 21"
                    value={custZuqaq}
                    onChange={(e) => setCustZuqaq(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">دار</label>
                  <input
                    type="text"
                    placeholder="مثال: 4"
                    value={custDar}
                    onChange={(e) => setCustDar(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full border border-gray-200 p-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
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
