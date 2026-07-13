import React from 'react';
import { motion } from 'motion/react';
import { MahalakLogo } from './MahalakLogo';

interface WelcomeScreenLogoProps {
  step: number;
}

export const WelcomeScreenLogo: React.FC<WelcomeScreenLogoProps> = ({ step }) => {
  const isLarge = step === 1;

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0, rotate: -12 }}
      animate={{
        scale: 1,
        opacity: 1,
        rotate: 0,
        y: isLarge ? [0, -16, 0] : 0,
      }}
      transition={{
        scale: { type: 'spring', stiffness: 180, damping: 12 },
        opacity: { duration: 0.6 },
        rotate: { type: 'spring', stiffness: 120, damping: 14 },
        y: isLarge ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.35 },
      }}
      className={`relative ${isLarge ? 'mb-8' : 'mb-5'}`}
    >
      <motion.div
        className="absolute inset-[-28%] rounded-full border-2 border-vibrant-purple/50"
        animate={{ scale: [1, 1.2, 1], opacity: [0.35, 0.85, 0.35], rotate: [0, 360] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        aria-hidden
      />
      <motion.div
        className="absolute inset-[-14%] rounded-full border border-violet/40"
        animate={{ scale: [1.15, 0.92, 1.15], opacity: [0.5, 0.9, 0.5], rotate: [360, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        aria-hidden
      />
      <motion.div
        className="absolute inset-0 rounded-full bg-vibrant-purple/50 blur-3xl"
        animate={{ scale: [1, 1.55, 1], opacity: [0.45, 0.95, 0.45] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      />
      <motion.div
        className="absolute inset-[-6%] rounded-full bg-violet/35 blur-2xl"
        animate={{ scale: [1.25, 0.88, 1.25] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        aria-hidden
      />

      <MahalakLogo
        className={`relative object-contain drop-shadow-[0_0_28px_rgba(123,61,255,0.65)] ${isLarge ? 'mb-2 h-48 w-48 md:h-60 md:w-60' : 'h-24 w-24 md:h-28 md:w-28 opacity-95'}`}
      />
    </motion.div>
  );
};
