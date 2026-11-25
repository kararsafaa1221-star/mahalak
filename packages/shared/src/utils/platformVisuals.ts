import { Capacitor } from '@capacitor/core';

/** True for Capacitor Android or Android Chrome/WebView browsers. */
export function isAndroidClient(): boolean {
  if (typeof window === 'undefined') return false;
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') return true;
  return /Android/i.test(navigator.userAgent || '');
}

/** Always true — heavy blur/motion effects are disabled on all platforms. */
export function shouldReduceVisualEffects(): boolean {
  return true;
}
