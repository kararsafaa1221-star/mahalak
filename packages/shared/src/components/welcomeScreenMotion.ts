export const welcomeSlideVariants = {
  hidden: {
    opacity: 0,
    x: -64,
    scale: 0.86,
    filter: 'blur(12px)',
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.45,
      staggerChildren: 0.11,
      delayChildren: 0.06,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    x: 64,
    scale: 0.9,
    filter: 'blur(8px)',
    transition: { duration: 0.28 },
  },
};

export const welcomeSlideItemVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  },
};

export const welcomeIconVariants = {
  hidden: { opacity: 0, scale: 0.2, rotate: -180 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 320, damping: 14 },
  },
};
