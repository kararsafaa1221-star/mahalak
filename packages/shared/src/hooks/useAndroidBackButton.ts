import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export type AndroidBackHandler = () => boolean;

const backHandlers = new Set<AndroidBackHandler>();

/** Register an in-app back handler (return true if the press was consumed). */
export function registerAndroidBackHandler(handler: AndroidBackHandler): () => void {
  backHandlers.add(handler);
  return () => {
    backHandlers.delete(handler);
  };
}

function runAndroidBackHandlers(): boolean {
  for (const handler of Array.from(backHandlers).reverse()) {
    if (handler()) return true;
  }
  return false;
}

/**
 * Intercepts the Android hardware back button via @capacitor/app.
 * App-specific handlers run first; then the WebView history stack is used.
 * Does not exit the app automatically — screens should register handlers for in-app navigation.
 */
export function useAndroidBackButton() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    const handler = App.addListener('backButton', () => {
      if (runAndroidBackHandlers()) return;

      const state = window.history.state;
      if (state?.isAppNav || state?.isAppNavMerchant) {
        window.history.back();
      }
    });

    return () => {
      handler.then((listener) => listener.remove());
    };
  }, []);
}
