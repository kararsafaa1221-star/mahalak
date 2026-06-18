import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/useApp';

export const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentCustomer, currentMerchant } = useApp();
  const [step, setStep] = useState(1);

  // If already logged in, no need to show welcome screen
  if (currentCustomer) return <Navigate to="/customer" replace />;
  if (currentMerchant) return <Navigate to="/merchant" replace />;

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      navigate('/select');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden text-white" dir="rtl">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 max-w-lg w-full flex flex-col items-center">
        {/* Logo and Icon */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="mb-8"
        >
          <img
            src="/mahalak-logo.png"
            alt="محلك"
            className="w-48 h-48 md:w-60 md:h-60 object-contain mb-2"
          />
        </motion.div>

        {/* Introduction */}
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
                  تريد تسوق سريع وعروض حقيقية من العراق؟
                  ويا 'منصة محلك' كلشي صار بـ إيدك! إحنا المنصة الذكية الأولى بالعراق اللي تجمعك بأقرب المتاجر. تسوق واجمع نقاط ومكافآت، وإذا كنت صاحب محل، كبّر مشروعك وزيد مبيعاتك هسة!
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
                  تريد تجمع مكافآت حقيقية وتوفر بفلوسك؟
                  ويا 'محلك' مو بس تشتري، بكل طلبية تسويها من محلات منطقتك راح تجمع نقاط تتحول فوراً لهدايا وكاش باك وخصومات حصرية ما تتفوت. !
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
                  جاهز تغير طريقة تسوقك أو تكبّر مشروعك وتزيد مبيعاتك؟
                  الخطوة يمك هسة! اختار حسابك (تاجر أو زبون) وانطلق ويانا بأول منصة رقمية عراقية تخدم منطقتك وتدعم تجارتنا المحلية. خلينا نبلش!
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center space-x-2 space-x-reverse mb-8">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all duration-300 ${step === i ? 'w-8 bg-indigo-500' : 'w-2 bg-slate-700'}`}
            />
          ))}
        </div>

        {/* Buttons */}
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

      {/* Footer text */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="absolute bottom-6 text-slate-500 text-xs font-medium"
      >
        صُنع بحب للعراق © 2026
      </motion.p>
    </div>
  );
};
