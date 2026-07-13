import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, MapPinned, LayoutDashboard, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '@shared/context/useApp';
import { WelcomeScreenBackground } from '@shared/components/WelcomeScreenBackground';
import { WelcomeScreenLogo } from '@shared/components/WelcomeScreenLogo';
import {
  welcomeIconVariants,
  welcomeSlideItemVariants,
  welcomeSlideVariants,
} from '@shared/components/welcomeScreenMotion';

const WELCOME_SLIDES = [
  {
    title: 'توسيع نطاق العمل',
    question: 'ليش تبقى محصور بزبائن محلك وبس؟',
    answer:
      'وية «محلك»، محلك راح يوصل لكل العراق! افتح باب رزقك للكل، وخلّي بضاعتك تنعرض وتنباع للزبائن بكل المحافظات، وأنت بمكانك وبدون تعب.',
    Icon: MapPinned,
  },
  {
    title: 'تنظيم الإدارة',
    question: 'تعبت من السجلات، الورقة والقلم، والدوخة بطلبات الزبائن؟',
    answer:
      '«محلك» يخلي إدارتك أسهل بـ 180 درجة. كل طلباتك، ومخزنك، وحساباتك بمكان واحد، منظمة وبشكل ذكي يخليك تتابع شغلك وتعرف أرباحك بضغطة زر.',
    Icon: LayoutDashboard,
  },
  {
    title: 'النمو والنجاح',
    question: 'تريد تكبّر تجارتك وتزيد مبيعاتك بأقل مجهود؟',
    answer:
      'إحنا وياك خطوة بخطوة. وية «محلك» راح تكسب زبائن جدد يومية، وتطور تجارتك بطريقة حديثة ومحترفة تضمن لك الاستمرارية والأرباح.',
    Icon: TrendingUp,
  },
] as const;

export const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentMerchant } = useApp();
  const [step, setStep] = useState(1);

  if (currentMerchant) return <Navigate to="/dashboard" replace />;

  const slide = WELCOME_SLIDES[step - 1];
  const SlideIcon = slide.Icon;

  const handleNext = () => {
    if (step < WELCOME_SLIDES.length) {
      setStep(step + 1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden text-white bg-deep-navy" dir="rtl">
      <WelcomeScreenBackground />

      <div className="relative z-10 max-w-lg w-full flex flex-col items-center">
        <WelcomeScreenLogo step={step} />

        <div className="w-full mb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={welcomeSlideVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="welcome-card-glow welcome-card-shimmer welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl text-right"
            >
              <motion.div
                variants={welcomeIconVariants}
                className="welcome-icon-pulse mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-white bg-brand-horizontal border border-white shadow-brand-glow-lg"
              >
                <SlideIcon size={32} strokeWidth={2.2} aria-hidden />
              </motion.div>

              <motion.p
                variants={welcomeSlideItemVariants}
                className="text-[11px] font-black uppercase tracking-widest text-violet-300/90 mb-3 text-center"
              >
                {slide.title}
              </motion.p>

              <motion.h2
                variants={welcomeSlideItemVariants}
                className="text-white text-lg md:text-xl font-black leading-snug mb-4 text-center"
              >
                {slide.question}
              </motion.h2>

              <motion.p
                variants={welcomeSlideItemVariants}
                className="text-slate-300 text-base md:text-[17px] leading-relaxed font-medium"
              >
                {slide.answer}
              </motion.p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {WELCOME_SLIDES.map((_, i) => (
            <div key={i} className="relative flex items-center justify-center">
              {step === i + 1 && (
                <motion.span
                  className="absolute h-2 w-8 rounded-full bg-indigo-400"
                  animate={{ scale: [1, 2.5], opacity: [0.7, 0] }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'easeOut' }}
                  aria-hidden
                />
              )}
              <motion.div
                layout
                className={`relative h-2 rounded-full ${step === i + 1 ? 'bg-indigo-400 shadow-[0_0_20px_rgba(129,140,248,0.9)]' : 'bg-slate-700'}`}
                animate={{ width: step === i + 1 ? 36 : 8 }}
                transition={{ type: 'spring', stiffness: 500, damping: 24 }}
              />
            </div>
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
            className="welcome-btn-pulse flex-1 bg-brand-horizontal text-white flex items-center justify-center space-x-3 space-x-reverse px-8 py-4 rounded-xl font-black text-lg transition-all whitespace-nowrap group"
          >
            <motion.span layout>{step < WELCOME_SLIDES.length ? 'التالي' : 'للبدء'}</motion.span>
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
