import React, { useState, useEffect } from 'react';
import { isOneSignalConfigured } from '../lib/onesignalConfig';
import { requestNotificationPermission } from '../lib/pushNotifications';

interface PushPermissionPromptProps {
  userType: 'customer' | 'merchant';
  onComplete: () => void;
}

export const PushPermissionPrompt: React.FC<PushPermissionPromptProps> = ({ userType, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        if (!isOneSignalConfigured()) {
          onComplete();
          return;
        }

        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          setIsVisible(true);
          return;
        }

        onComplete();
      } catch {
        onComplete();
      }
    };

    const timer = setTimeout(checkPermission, 500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleEnable = async () => {
    try {
      await requestNotificationPermission();
    } catch {
      // ignore
    } finally {
      setIsVisible(false);
      onComplete();
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    onComplete();
  };

  if (!isVisible) return null;

  const content =
    userType === 'customer'
      ? {
          title: 'لا تفوتك التحديثات! 🔔',
          body: 'فعل الإشعارات حتى يوصلك إشعار فوري وتتبع مباشر أول ما يتغير وضع طلبك، وتكون أول من يعلم بالعروض والخصومات الحصرية بمحلك!',
        }
      : {
          title: 'تابع مبيعاتك أول بأول! 📈',
          body: 'يرجى تفعيل الإشعارات لتصلك تنبيهات فورية عند دخول طلب جديد، تحديثات الدفع، أو أي نشاط بمتجرك لتبقى دائماً على اطلاع.',
        };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">{content.title}</h3>
          <p className="text-[15px] text-slate-500 leading-relaxed font-medium px-2">{content.body}</p>
        </div>
        <div className="p-5 space-y-3 bg-slate-50/80 border-t border-slate-100">
          <button
            type="button"
            onClick={handleEnable}
            className="w-full py-4 bg-[#9952FF] text-white font-black text-base rounded-2xl shadow-xl shadow-[#9952FF]/20 hover:bg-[#8640E6] transition-all active:scale-[0.98]"
          >
            تفعيل الآن
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="w-full py-3 text-slate-500 font-bold text-sm rounded-2xl hover:bg-slate-200/50 transition-colors"
          >
            ليس الآن
          </button>
        </div>
      </div>
    </div>
  );
};
