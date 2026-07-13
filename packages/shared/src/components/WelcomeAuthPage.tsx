import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WelcomeScreenBackground } from './WelcomeScreenBackground';
import { WelcomeScreenLogo } from './WelcomeScreenLogo';
import { welcomeSlideVariants } from './welcomeScreenMotion';

interface WelcomeAuthPageProps {
  children: React.ReactNode;
  contentKey?: string;
  ariaLabel: string;
}

export const WelcomeAuthPage: React.FC<WelcomeAuthPageProps> = ({
  children,
  contentKey = 'auth',
  ariaLabel,
}) => {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 text-center relative overflow-x-hidden overflow-y-auto text-white bg-deep-navy"
      dir="rtl"
    >
      <WelcomeScreenBackground />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center py-4 sm:py-6">
        <WelcomeScreenLogo step={1} />

        <div className="w-full">
          <AnimatePresence mode="wait">
            <motion.section
              key={contentKey}
              variants={welcomeSlideVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="welcome-card-glow welcome-card-shimmer welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl text-right"
              aria-label={ariaLabel}
            >
              {children}
            </motion.section>
          </AnimatePresence>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-6 text-center text-xs font-medium text-slate-500"
          >
            صُنع بأيادي عراقية © 2026
          </motion.p>
        </div>
      </div>
    </div>
  );
};
