import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/useApp';
import { MerchantApp } from './views/Merchant/MerchantApp';
import { CustomerApp } from './views/Customer/CustomerApp';
import { AdminPanel } from './views/Admin/AdminPanel';
import { registerServiceWorker, requestNotificationPermission, setupPushNotifications } from './lib/pushNotifications';
import { Store, ShoppingBag, Shield, Smartphone, Globe, Zap, Heart, Award, WifiOff, Loader2, Bell } from 'lucide-react';

// ==========================================
// مكون حالة الاتصال والتحميل
// ==========================================
const StatusIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const conn = (navigator as any).connection;
    const checkSlow = () => {
      if (conn) {
        setIsSlow(conn.saveData || conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g');
      }
    };
    
    if (conn) {
      conn.addEventListener('change', checkSlow);
      checkSlow();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (conn) conn.removeEventListener('change', checkSlow);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[10000] bg-red-600 text-white text-[10px] font-bold py-1 px-4 flex items-center justify-center space-x-2 space-x-reverse animate-pulse">
        <WifiOff size={14} />
        <span>فقدت الاتصال بالإنترنت، يرجى محاولة الاتصال بالإنترنت</span>
      </div>
    );
  }

  return (
    <>
      <div className="fixed bottom-20 right-4 z-[9999] flex flex-col items-end gap-2 pointer-events-none">
        {isSlow && (
          <div className="bg-amber-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black shadow-lg flex items-center gap-2 animate-bounce-in pointer-events-auto">
            <Loader2 size={12} className="animate-spin" />
            <span>اتصال ضعيف</span>
          </div>
        )}
      </div>
    </>
  );
};

// ==========================================
// التطبيق الرئيسي - منصة محلك
// نظام متكامل لربط المتاجر المحلية بالزبائن في العراق
// ==========================================

// مكون الصفحة الرئيسية للاختيار بين التطبيقات
const LandingPage: React.FC<{ onSelect: (app: 'merchant' | 'customer' | 'admin') => void }> = ({ onSelect }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white overflow-hidden relative">
      
      {/* خلفية ديكورية */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute top-20 right-20 w-96 h-96 bg-indigo-500 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-purple-500 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500 rounded-full blur-[100px] transform -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="relative z-10 min-h-screen flex flex-col">
        
        {/* الهيدر العلوي */}
        <header className="p-4 md:p-6 flex justify-between items-center">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black leading-none">محلك</h1>
              <span className="text-[10px] text-indigo-300">Mahalak Platform</span>
            </div>
          </div>
          
          <button 
            onClick={() => onSelect('admin')}
            className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-bold transition backdrop-blur-sm"
          >
            <Shield size={16} />
            <span>لوحة الأدمن</span>
          </button>
        </header>

        {/* قسم البطل (Hero Section) */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
          <div className="mb-8 animate-fade-in">
            <span className="inline-block bg-indigo-500/20 text-indigo-300 text-xs font-bold px-4 py-1.5 rounded-full border border-indigo-500/30 mb-4">
              🇮🇶 منصة عراقية 100% - بدون عمولات على المبيعات
            </span>
            
            <h2 className="text-3xl md:text-5xl font-black leading-tight mb-4 max-w-3xl">
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 via-purple-400 to-pink-400">
                محلك
              </span>
              <span className="block text-white mt-2">
                نظام ذكي يربط المتاجر بالزبائن
              </span>
            </h2>
            
            <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
              منصة رقمية متكاملة تتيح للتاجر إدارة متجره ومنتجاته بسهولة، وللزبون التسوق من المحلات المحلية القريبة مع نظام نقاط ومكافآت ذكي.
            </p>
          </div>

          {/* كروت اختيار التطبيق */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full mb-12 animate-slide-up">
            
            {/* كارد تطبيق التاجر */}
            <button 
              onClick={() => onSelect('merchant')}
              className="order-2 md:order-1 group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/50 rounded-3xl p-6 text-right transition-all duration-300 backdrop-blur-sm hover:shadow-2xl hover:shadow-indigo-500/10"
            >
              <div className="flex items-start space-x-4 space-x-reverse">
                <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                  <Store size={32} className="text-white" />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full">للتجار</span>
                  <h3 className="text-xl font-black text-white mt-2 group-hover:text-indigo-300 transition-colors">لوحة التاجر</h3>
                  <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                    سجل متجرك، أضف منتجاتك، واستقبل الطلبات من الزبائن مباشرة
                  </p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-2">
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded-lg">إدارة المنتجات</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded-lg">استقبال الطلبات</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded-lg">أكواد الخصم</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded-lg">إشعارات فورية</span>
              </div>
            </button>

            {/* كارد تطبيق الزبون */}
            <button 
              onClick={() => onSelect('customer')}
              className="order-1 md:order-2 group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-green-500/50 rounded-3xl p-6 text-right transition-all duration-300 backdrop-blur-sm hover:shadow-2xl hover:shadow-green-500/10"
            >
              <div className="flex items-start space-x-4 space-x-reverse">
                <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                  <ShoppingBag size={32} className="text-white" />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full">للزبائن</span>
                  <h3 className="text-xl font-black text-white mt-2 group-hover:text-green-300 transition-colors">تطبيق الزبون</h3>
                  <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                    تصفح المتاجر المحلية، اطلب منتجاتك المفضلة، واكسب نقاط ومكافآت
                  </p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-2">
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded-lg">تصفح المتاجر</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded-lg">نظام النقاط</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded-lg">المفضلة</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded-lg">تتبع الطلبات</span>
              </div>
            </button>
          </div>

          {/* ميزات المنصة */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full animate-fade-in">
            <div className="flex flex-col items-center text-center p-4">
              <div className="p-3 bg-white/5 rounded-xl mb-2 border border-white/10">
                <Smartphone size={20} className="text-indigo-400" />
              </div>
              <span className="text-xs font-bold text-white">تصميم متجاوب</span>
              <span className="text-[10px] text-slate-500">يعمل على كل الأجهزة</span>
            </div>
            
            <div className="flex flex-col items-center text-center p-4">
              <div className="p-3 bg-white/5 rounded-xl mb-2 border border-white/10">
                <Globe size={20} className="text-green-400" />
              </div>
              <span className="text-xs font-bold text-white">دعم العربية</span>
              <span className="text-[10px] text-slate-500">واجهة RTL كاملة</span>
            </div>
            
            <div className="flex flex-col items-center text-center p-4">
              <div className="p-3 bg-white/5 rounded-xl mb-2 border border-white/10">
                <Zap size={20} className="text-yellow-400" />
              </div>
              <span className="text-xs font-bold text-white">إشعارات فورية</span>
              <span className="text-[10px] text-slate-500">تنبيهات الطلبات</span>
            </div>
            
            <div className="flex flex-col items-center text-center p-4">
              <div className="p-3 bg-white/5 rounded-xl mb-2 border border-white/10">
                <Award size={20} className="text-pink-400" />
              </div>
              <span className="text-xs font-bold text-white">نظام الولاء</span>
              <span className="text-[10px] text-slate-500">نقاط ومكافآت</span>
            </div>
          </div>
        </main>

        {/* الفوتر */}
        <footer className="p-4 text-center text-slate-500 text-xs border-t border-white/5">
          <p className="flex items-center justify-center space-x-1 space-x-reverse">
            <span>صُنع بـ</span>
            <Heart size={12} className="text-red-400" fill="currentColor" />
            <span>للعراق - منصة محلك © 2026</span>
          </p>
        </footer>
      </div>
    </div>
  );
};

// ==========================================
// المكون الرئيسي للتطبيق مع التنقل
// ==========================================
const AppRoutes = () => {
  const { currentCustomer, currentMerchant, currentAdmin } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotificationOnboarding, setShowNotificationOnboarding] = useState(false);
  const [foregroundNotification, setForegroundNotification] = useState<{title: string, body: string, data?: any} | null>(null);

  useEffect(() => {
    if (foregroundNotification) {
      const timer = setTimeout(() => {
        setForegroundNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [foregroundNotification]);

  useEffect(() => {
    // Register Service Worker for Push Notifications
    registerServiceWorker();
    
    const isAuth = currentCustomer || currentMerchant || currentAdmin;
    if (isAuth) {
      const hasSeenOnboarding = localStorage.getItem('push_onboarding_shown');
      
      let role: 'customers' | 'stores' | 'admins' = 'customers';
      let id = 'admin';
      if (currentCustomer) { role = 'customers'; id = currentCustomer.id; }
      else if (currentMerchant) { role = 'stores'; id = currentMerchant.id; }
      else if (currentAdmin) { role = 'admins'; id = 'admin'; }

      const handleReceived = (notification: any) => {
        // الإشعارات الداخلية (In-App)
        setForegroundNotification({
          title: notification.title || 'إشعار جديد',
          body: notification.body || '',
          data: notification.data
        });
      };

      const handleAction = (action: any) => {
        // الإشعارات الخارجية وتوجيه المستخدم
        const data = action.notification.data;
        if (data && data.route) {
          navigate(data.route);
        } else {
          if (role === 'customers') navigate('/customer');
          else if (role === 'stores') navigate('/merchant');
          else if (role === 'admins') navigate('/admin');
        }
      };

      if (hasSeenOnboarding !== 'true') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowNotificationOnboarding(true);
      } else {
        setupPushNotifications(id, role, handleReceived, handleAction);
        requestNotificationPermission();
      }
    }
  }, [currentCustomer, currentMerchant, currentAdmin, navigate]);

  const handleGrantPermission = async () => {
    let role: 'customers' | 'stores' | 'admins' = 'customers';
    let id = 'admin';
    if (currentCustomer) { role = 'customers'; id = currentCustomer.id; }
    else if (currentMerchant) { role = 'stores'; id = currentMerchant.id; }
    else if (currentAdmin) { role = 'admins'; id = 'admin'; }
    
    const handleReceived = (notification: any) => {
      setForegroundNotification({
        title: notification.title || 'إشعار جديد',
        body: notification.body || '',
        data: notification.data
      });
    };

    const handleAction = (action: any) => {
      const data = action.notification.data;
      if (data && data.route) navigate(data.route);
    };

    await setupPushNotifications(id, role, handleReceived, handleAction);
    await requestNotificationPermission();
    localStorage.setItem('push_onboarding_shown', 'true');
    setShowNotificationOnboarding(false);
  };
  
  const handleSkipPermission = () => {
    localStorage.setItem('push_onboarding_shown', 'true');
    setShowNotificationOnboarding(false);
  };

  // استرجاع التطبيق الأخير تلقائياً من التخزين (اختياري، هنا سنعتمد على الحساب الحالي)
  useEffect(() => {
    if (currentCustomer && !location.pathname.startsWith('/customer')) navigate('/customer');
    else if (currentMerchant && !location.pathname.startsWith('/merchant')) navigate('/merchant');
    else if (currentAdmin && !location.pathname.startsWith('/admin')) navigate('/admin');
  }, [currentCustomer, currentMerchant, currentAdmin, navigate, location.pathname]);

  const handleSelectApp = (app: 'merchant' | 'customer' | 'admin') => {
    navigate(`/${app}`);
  };

  const handleBackToLanding = () => {
    if (currentCustomer || currentMerchant || currentAdmin) return;
    navigate('/');
  };

  const isAnyAuthenticated = currentCustomer || currentMerchant || currentAdmin;

  return (
    <div className="font-sans">
      <StatusIndicator />
      
      {foregroundNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100000] w-[90%] max-w-sm animate-slide-down">
          <div className="bg-white rounded-2xl shadow-2xl p-4 border border-slate-100 flex items-start gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Bell size={24} />
            </div>
            <div className="flex-1 mt-1">
              <h4 className="font-black text-slate-800 text-sm mb-1">{foregroundNotification.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">{foregroundNotification.body}</p>
            </div>
            <button 
              onClick={() => setForegroundNotification(null)}
              className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg p-1.5 transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {showNotificationOnboarding && (
        <div className="fixed inset-0 z-[100000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl relative w-full max-w-sm overflow-hidden animate-slide-up">
            <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-8 flex justify-center pb-12">
              <div className="bg-white/20 p-4 rounded-full backdrop-blur-md animate-pulse">
                <Bell size={48} className="text-white" />
              </div>
            </div>
            
            <div className="px-6 pb-6 pt-0 text-center relative z-10 -mt-6">
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h3 className="text-xl font-black text-slate-800 mb-2">لا تفوّت المبيعات والعروض!</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-semibold">
                  قم بتفعيل الإشعارات الآن لتصلك تحديثات الطلبات ورسائل محلك فوراً، حتى وإن كان التطبيق مغلقاً.
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleGrantPermission}
                  className="w-full bg-gradient-to-l from-purple-600 to-indigo-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-[1.02] transition-all"
                >
                  تفعيل الإشعارات 🔔
                </button>
                <button 
                  onClick={handleSkipPermission}
                  className="w-full text-slate-400 font-bold py-3 hover:bg-slate-50 rounded-2xl transition"
                >
                  تخطي الآن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* زر العودة للصفحة الرئيسية (يخفى تماماً إذا كان مسجلاً للدخول) */}
      {location.pathname !== '/' && !isAnyAuthenticated && (
        <button 
          onClick={handleBackToLanding}
          className="fixed top-4 left-4 z-50 px-3 py-2 bg-slate-900/80 hover:bg-slate-800 text-white text-xs font-bold rounded-xl backdrop-blur-sm shadow-lg transition flex items-center space-x-2 space-x-reverse border border-slate-700"
        >
          <Store size={14} />
          <span>العودة للرئيسية</span>
        </button>
      )}

      {/* عرض التطبيق المناسب */}
      <Routes>
        <Route path="/" element={<LandingPage onSelect={handleSelectApp} />} />
        <Route path="/merchant/*" element={<MerchantApp />} />
        <Route path="/customer/*" element={<CustomerApp />} />
        <Route path="/admin/*" element={<AdminPanel />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <HashRouter>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
    </HashRouter>
  );
}

export default App;
