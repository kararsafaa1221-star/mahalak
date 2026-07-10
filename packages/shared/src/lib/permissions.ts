import { Capacitor } from '@capacitor/core';
import { isOneSignalConfigured } from './onesignalConfig';

export type PermissionOutcome = 'granted' | 'denied' | 'unsupported';

export interface LocationResult {
  outcome: PermissionOutcome;
  coords?: { lat: number; lng: number };
}

export const LOCATION_REQUESTED_KEY = 'location_requested';
export const LOCATION_GRANTED_KEY = 'location_granted';
export const NOTIFICATIONS_DISMISSED_KEY = 'notifications_prompt_dismissed';

export function wasLocationPromptHandled(): boolean {
  return localStorage.getItem(LOCATION_REQUESTED_KEY) === 'true';
}

export function markLocationPromptHandled() {
  localStorage.setItem(LOCATION_REQUESTED_KEY, 'true');
}

export function wasLocationOsGranted(): boolean {
  return localStorage.getItem(LOCATION_GRANTED_KEY) === 'true';
}

export function markLocationOsGranted() {
  localStorage.setItem(LOCATION_GRANTED_KEY, 'true');
}

export function wasNotificationPromptDismissed(): boolean {
  return localStorage.getItem(NOTIFICATIONS_DISMISSED_KEY) === 'true';
}

export function markNotificationPromptDismissed() {
  localStorage.setItem(NOTIFICATIONS_DISMISSED_KEY, 'true');
}

export function needsNotificationPrompt(): boolean {
  if (wasNotificationPromptDismissed()) return false;
  if (Capacitor.isNativePlatform() && isOneSignalConfigured()) return true;
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission !== 'default') return false;
  return true;
}

/** Native-aware check — uses OS permission state on Android/iOS. */
export async function shouldShowLocationPrompt(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const current = await Geolocation.checkPermissions();
      return current.location !== 'granted';
    } catch {
      return !wasLocationPromptHandled();
    }
  }
  return !wasLocationPromptHandled();
}

/** Native-aware check — skips prompt when OS permission already granted. */
export async function shouldShowNotificationPrompt(): Promise<boolean> {
  if (!isOneSignalConfigured()) return false;

  if (Capacitor.isNativePlatform()) {
    if (Capacitor.getPlatform() === 'android') {
      const androidState = await readAndroidNotificationPermission();
      if (androidState === 'granted') return false;
      if (androidState === 'denied') return false;
    }

    try {
      const module = await import('onesignal-cordova-plugin');
      const granted = await module.default.Notifications.getPermissionAsync();
      return !granted;
    } catch {
      return !wasNotificationPromptDismissed();
    }
  }

  if (wasNotificationPromptDismissed()) return false;
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission !== 'default') return false;
  return true;
}

async function readAndroidNotificationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (Capacitor.getPlatform() !== 'android') return 'prompt';
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const status = await PushNotifications.checkPermissions();
    if (status.receive === 'granted') return 'granted';
    if (status.receive === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'prompt';
  }
}

/** Requests Android 13+ POST_NOTIFICATIONS so the toggle appears in system settings. */
export async function requestAndroidNotificationPermission(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'android') return true;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const status = await PushNotifications.requestPermissions();
    return status.receive === 'granted';
  } catch {
    return false;
  }
}

/** Requests OS location permission — call only after the user taps agree in custom UI. */
export async function requestLocationPermission(): Promise<LocationResult> {
  if (!('geolocation' in navigator) && !Capacitor.isNativePlatform()) {
    return { outcome: 'unsupported' };
  }

  try {
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import('@capacitor/geolocation');
      const requested = await Geolocation.requestPermissions();
      if (requested.location !== 'granted' && requested.coarseLocation !== 'granted') {
        return { outcome: 'denied' };
      }

      // Native: permission alone is enough — getCurrentPosition crashes on some builds
      // (Kotlin SpillingKt mismatch). Coords can be fetched later via LocationPicker.
      if (Capacitor.isNativePlatform()) {
        return { outcome: 'granted' };
      }

      try {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 120_000,
        });
        return {
          outcome: 'granted',
          coords: { lat: position.coords.latitude, lng: position.coords.longitude },
        };
      } catch {
        return { outcome: 'granted' };
      }
    }

    return await new Promise<LocationResult>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            outcome: 'granted',
            coords: { lat: position.coords.latitude, lng: position.coords.longitude },
          });
        },
        () => resolve({ outcome: 'denied' }),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });
  } catch {
    return { outcome: 'denied' };
  }
}
