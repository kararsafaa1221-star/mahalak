import React, { useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, MapPinned, LayoutGrid, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAuthSession } from '@shared/context/AuthSessionContext';
import { WelcomeScreenBackground } from '@shared/components/WelcomeScreenBackground';
import { WelcomeScreenLogo } from '@shared/components/WelcomeScreenLogo';
import {
  welcomeIconVariants,
  welcomeSlideItemVariants,
  welcomeSlideVariants,
} from '@shared/components/welcomeScreenMotion';
import { LanguageSwitcher } from '@shared/i18n/LanguageSwitcher';

const SLIDE_ICONS = [MapPinned, LayoutGrid, ShieldCheck] as const;

export const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentCustomer } = useAuthSession();
  const [step, setStep] = useState(1);

  const slides = useMemo(
    () =>
      SLIDE_ICONS.map((Icon, i) => ({
        title: t(`welcome.customer.slide${i + 1}Title`),
        question: t(`welcome.customer.slide${i + 1}Question`),
        answer: t(`welcome.customer.slide${i + 1}Answer`),
        Icon,
      })),
    [t],
  );

  if (currentCustomer) return <Navigate to="/dashboard" replace />;

  const slide = slides[step - 1];
  const SlideIcon = slide.Icon;

  const handleNext = () => {
    if (step < slides.length) {
      setStep(step + 1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden text-white bg-deep-navy" dir="rtl">
      <WelcomeScreenBackground />

      <div className="absolute top-4 left-4 z-20">
        <LanguageSwitcher variant="compact" />
      </div>

      <div className="relative z-10 max-w-lg w-full flex flex-col items-center">
        <WelcomeScreenLogo step={step} />

        <div className="w-full mb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${step}-${slide.title}`}
              variants={welcomeSlideVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="welcome-card-glow border border-white/30 bg-white/10 rounded-3xl p-6 md:p-8 shadow-2xl text-right"
            >
              <motion.div
                variants={welcomeIconVariants}
                className="welcome-icon-pulse mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-white bg-brand-horizontal border border-white"
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
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-[width] duration-200 ${
                step === i + 1 ? 'w-9 bg-indigo-400' : 'w-2 bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className="flex flex-row gap-4 w-full max-w-sm">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex-1 bg-transparent text-gray-400 border border-gray-700 rounded-xl hover:text-white flex items-center justify-center px-4 py-4 font-black flex-row-reverse space-x-2 space-x-reverse text-lg transition-colors whitespace-nowrap touch-target"
            >
              <span>&larr; {t('common.back')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="welcome-btn-pulse flex-1 bg-brand-horizontal text-white flex items-center justify-center space-x-3 space-x-reverse px-8 py-4 rounded-xl font-black text-lg whitespace-nowrap group touch-target active:scale-[0.98]"
          >
            <span>{step < slides.length ? t('common.next') : t('welcome.start')}</span>
            <ArrowLeft size={20} />
          </button>
        </div>
      </div>

      <p className="absolute bottom-6 text-slate-500 text-xs font-medium">
        {t('app.madeInIraq')}
      </p>
    </div>
  );
};
