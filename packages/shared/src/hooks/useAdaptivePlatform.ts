import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { isAndroidClient } from '../utils/platformVisuals';

/**
 * Marks the document with platform classes for adaptive CSS
 * while keeping Mahalak brand. Heavy visual effects are always disabled.
 */
export function useAdaptivePlatform() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('platform-ios', 'platform-android', 'platform-web');
    root.classList.add('reduce-visual-effects');

    if (isAndroidClient()) {
      root.classList.add('platform-android');
    } else if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      root.classList.add('platform-ios');
    } else {
      root.classList.add('platform-web');
    }
  }, []);
}
