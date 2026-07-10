import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '@shared/context/useApp';
import { MahalakLogo } from '@shared/components/MahalakLogo';

export const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentMerchant } = useApp();
  const [step, setStep] = useState(1);

  if (currentMerchant) return <Navigate to="/dashboard" replace />;

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-mahalak-gradient flex flex-col items-center justify-center p-6 text-center relative overflow-hidden text-white" dir="rtl">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-vibrant-purple/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-violet/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 max-w-lg w-full flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="mb-8"
        >
          <MahalakLogo className="mb-2 h-48 w-48 object-contain md:h-60 md:w-60" />
        </motion.div>

        <div className="w-full mb-10">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl"
              >
                <p className="text-slate-300 text-base md:text-lg leading-relaxed font-medium whitespace-pre-line">
                  تريد توسّع مشروعك وتصل لزبائن جدد من منطقتك؟
                  ويا 'منصة محلك' متجرك يصير أونلاين بخطوات بسيطة! إحنا المنصة الذكية الأولى بالعراق اللي تجمع الزبائن بأقرب المتاجر. استقبل طلبات، زيد مبيعاتك، وكبّر مشروعك هسة!
                </p>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl"
              >
                <p className="text-slate-300 text-base md:text-lg leading-relaxed font-medium whitespace-pre-line">
                  تريد إدارة سهلة وعروض تلفت الزبائن؟
                  ويا 'محلك' تقدر تنشر منتجاتك، تعمل خصومات وأكواد ترويجية، وتوصل إشعارات لزبائنك. كل طلب يوصلك فوراً وتقدر تتابع مبيعاتك من لوحة واحدة!
                </p>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl"
              >
                <p className="text-slate-300 text-base md:text-lg leading-relaxed font-medium whitespace-pre-line">
                  جاهز تغير طريقة تسويقك أو تكبّر مشروعك وتزيد مبيعاتك؟
                  الخطوة يمك هسة! سجّل حسابك كتاجر وانطلق ويانا بأول منصة رقمية عراقية تخدم منطقتك وتدعم تجارتنا المحلية. خلينا نبلش!
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center space-x-2 space-x-reverse mb-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${step === i ? 'w-8 bg-indigo-500' : 'w-2 bg-slate-700'}`}
            />
          ))}
        </div>

        <motion.div layout className="flex flex-row gap-4 w-full max-w-sm">
          <AnimatePresence>
            {step > 1 && (
              <motion.button
                key="back"
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, width: 0, paddingLeft: 0, paddingRight: 0, margin: 0, overflow: 'hidden' }}
                transition={{ duration: 0.3 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setStep(step - 1)}
                className="flex-1 bg-transparent text-gray-400 border border-gray-700 rounded-xl hover:text-white flex items-center justify-center px-4 py-4 font-black flex-row-reverse space-x-2 space-x-reverse text-lg transition-colors whitespace-nowrap"
              >
                <span>&larr; رجوع</span>
              </motion.button>
            )}
          </AnimatePresence>

          <motion.button
            layout
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            className="flex-1 bg-white text-slate-900 flex items-center justify-center space-x-3 space-x-reverse px-8 py-4 rounded-xl font-black text-lg shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] transition-all whitespace-nowrap group"
          >
            <motion.span layout>{step < 3 ? 'التالي' : 'للبدء'}</motion.span>
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </motion.button>
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="absolute bottom-6 text-slate-500 text-xs font-medium"
      >
        صُنع بأيادي عراقية © 2026
      </motion.p>
    </div>
  );
};
