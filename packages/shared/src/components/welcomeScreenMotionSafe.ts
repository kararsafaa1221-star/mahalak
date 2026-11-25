import {
  welcomeIconVariants,
  welcomeSlideItemVariants,
  welcomeSlideVariants,
} from './welcomeScreenMotion';

/** All platforms use the same light motion set. */
export function getWelcomeMotionVariants(_reduceEffects = true) {
  return {
    slide: welcomeSlideVariants,
    item: welcomeSlideItemVariants,
    icon: welcomeIconVariants,
  };
}
