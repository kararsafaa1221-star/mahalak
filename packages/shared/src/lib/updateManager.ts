import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  ensureInitialized,
  fetchAndActivate,
  getBoolean,
  getRemoteConfig,
  getString,
  isSupported,
} from 'firebase/remote-config';
import { app as firebaseApp } from './firebase';

const FETCH_TIMEOUT_MS = 8_000;
const MINIMUM_FETCH_INTERVAL_MS = 60 * 60 * 1_000;

export type UpdatePlatform = 'android' | 'ios';

export interface UpdateCheckResult {
  /** True when the installed version is below the Remote Config minimum. */
  required: boolean;
  platform?: UpdatePlatform;
  currentVersion?: string;
  minimumVersion?: string;
  forceUpdate: boolean;
  updateTitle: string;
  updateMessage: string;
  updateButtonText: string;
}

export interface UpdateManagerDefaults {
  updateTitle: string;
  updateMessage: string;
  updateButtonText: string;
}

let startupCheck: Promise<UpdateCheckResult> | undefined;

function parseVersion(version: string): number[] | null {
  const normalized = version.trim().replace(/^v/i, '').split(/[+-]/, 1)[0];
  if (!/^\d+(?:\.\d+)*$/.test(normalized)) return null;
  return normalized.split('.').map(Number);
}

export function isVersionLower(currentVersion: string, minimumVersion: string): boolean {
  const current = parseVersion(currentVersion);
  const minimum = parseVersion(minimumVersion);
  if (!current || !minimum) return false;

  const segmentCount = Math.max(current.length, minimum.length);
  for (let index = 0; index < segmentCount; index += 1) {
    const currentSegment = current[index] ?? 0;
    const minimumSegment = minimum[index] ?? 0;
    if (currentSegment !== minimumSegment) return currentSegment < minimumSegment;
  }
  return false;
}

function applyMessagePlaceholders(message: string, appName?: string): string {
  return message.replace(/\{appName\}/g, appName?.trim() || 'التطبيق');
}

async function runUpdateCheck(
  fallbackVersion: string,
  defaults: UpdateManagerDefaults,
  appName?: string,
): Promise<UpdateCheckResult> {
  const platform = Capacitor.getPlatform();
  const baseResult: UpdateCheckResult = {
    required: false,
    forceUpdate: true,
    updateTitle: defaults.updateTitle,
    updateMessage: defaults.updateMessage,
    updateButtonText: defaults.updateButtonText,
  };

  if (platform !== 'android' && platform !== 'ios') return baseResult;
  if (!(await isSupported())) return baseResult;

  let currentVersion = fallbackVersion;
  try {
    currentVersion = (await App.getInfo()).version || fallbackVersion;
  } catch (error) {
    console.warn('[UpdateManager] Native package version unavailable; using build version.', error);
  }

  const remoteConfig = getRemoteConfig(firebaseApp);
  remoteConfig.defaultConfig = {
    min_version_android: '0.0.0',
    min_version_ios: '0.0.0',
    update_title: defaults.updateTitle,
    update_message: defaults.updateMessage,
    update_button_text: defaults.updateButtonText,
    force_update: 'true',
  };
  remoteConfig.settings.fetchTimeoutMillis = FETCH_TIMEOUT_MS;
  remoteConfig.settings.minimumFetchIntervalMillis = MINIMUM_FETCH_INTERVAL_MS;

  await ensureInitialized(remoteConfig);
  try {
    await fetchAndActivate(remoteConfig);
  } catch (error) {
    console.warn('[UpdateManager] Remote Config fetch failed; using cached values.', error);
  }

  const minimumParameter = platform === 'android' ? 'min_version_android' : 'min_version_ios';
  const minimumVersion = getString(remoteConfig, minimumParameter).trim();
  const updateTitle = getString(remoteConfig, 'update_title').trim() || defaults.updateTitle;
  const updateMessage =
    applyMessagePlaceholders(
      getString(remoteConfig, 'update_message').trim() || defaults.updateMessage,
      appName,
    );
  const updateButtonText =
    getString(remoteConfig, 'update_button_text').trim() || defaults.updateButtonText;
  const forceUpdate = getBoolean(remoteConfig, 'force_update');

  return {
    required: isVersionLower(currentVersion, minimumVersion),
    platform,
    currentVersion,
    minimumVersion,
    forceUpdate,
    updateTitle,
    updateMessage,
    updateButtonText,
  };
}

export function checkForAppUpdate(
  fallbackVersion: string,
  defaults: UpdateManagerDefaults,
  appName?: string,
): Promise<UpdateCheckResult> {
  startupCheck ??= runUpdateCheck(fallbackVersion, defaults, appName).catch((error) => {
    console.error('[UpdateManager] Startup version check failed.', error);
    return {
      required: false,
      forceUpdate: false,
      updateTitle: defaults.updateTitle,
      updateMessage: defaults.updateMessage,
      updateButtonText: defaults.updateButtonText,
    };
  });
  return startupCheck;
}
