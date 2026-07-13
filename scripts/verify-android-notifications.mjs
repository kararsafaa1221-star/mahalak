#!/usr/bin/env node
/**
 * Android + Admin Web Push readiness (no Mac/iOS required).
 * Run: npm run verify:android:notifications
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const NATIVE_APPS = [
  {
    key: 'customer',
    label: 'تطبيق الزبون (APK)',
    oneSignalName: 'Mahalak App',
    packageName: 'iq.mahalak.app',
    fcmPackage: 'iq.mahalak.app',
  },
  {
    key: 'merchant',
    label: 'تطبيق التاجر (APK)',
    oneSignalName: 'Mahalak Merchant App',
    packageName: 'iq.mahalak.merchant',
    fcmPackage: 'iq.mahalak.merchant',
  },
];

const ADMIN = {
  label: 'لوحة الإدارة (Web على Android Chrome)',
  oneSignalName: 'Mahalak Admin App',
  siteUrl: 'https://mahalak-admin.web.app',
  workerPath: 'apps/admin/public/OneSignalSDKWorker.js',
};

function read(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function parseEnvOneSignal(appDir) {
  for (const name of ['.env', '.env.local']) {
    const raw = read(path.join(appDir, name));
    if (!raw) continue;
    const m = raw.match(/^VITE_ONESIGNAL_APP_ID=(.+)$/m);
    if (m) return m[1].trim();
  }
  return null;
}

let fails = 0;

console.log('\n=== محلك — Android Notifications Checklist ===\n');

for (const app of NATIVE_APPS) {
  console.log(`--- ${app.label} ---`);
  console.log(`    OneSignal: ${app.oneSignalName}`);
  console.log(`    Package:   ${app.packageName}`);
  console.log('');

  const appDir = path.join(root, 'apps', app.key);
  const gsPath = path.join(appDir, 'android', 'app', 'google-services.json');
  const gsOk = fs.existsSync(gsPath);
  console.log(`  [${gsOk ? 'x' : ' '}] google-services.json`);
  if (!gsOk) fails++;

  const oneSignal = parseEnvOneSignal(appDir);
  const oneSignalOk =
    !!oneSignal && oneSignal.length >= 10 && !oneSignal.includes('YOUR_');
  console.log(`  [${oneSignalOk ? 'x' : ' '}] VITE_ONESIGNAL_APP_ID in apps/${app.key}/.env`);
  if (!oneSignalOk) fails++;

  const plugins = read(path.join(appDir, 'android', 'app', 'src', 'main', 'assets', 'capacitor.plugins.json')) ?? '';
  const pushPluginOk = plugins.includes('@capacitor/push-notifications');
  console.log(`  [${pushPluginOk ? 'x' : ' '}] Capacitor push-notifications native plugin`);
  if (!pushPluginOk) fails++;

  const iconPath = path.join(
    appDir,
    'android',
    'app',
    'src',
    'main',
    'res',
    'drawable-mdpi',
    'ic_stat_onesignal_default.png',
  );
  const iconOk = fs.existsSync(iconPath);
  console.log(`  [${iconOk ? 'x' : ' '}] Notification icon ic_stat_onesignal_default.png`);
  if (!iconOk) fails++;

  console.log('  [ ] OneSignal → Settings → Platforms → Google Android (FCM) = Active');
  console.log(`  [ ] FCM package name in OneSignal matches: ${app.fcmPackage}`);
  console.log('');
}

console.log(`--- ${ADMIN.label} ---`);
console.log(`    OneSignal: ${ADMIN.oneSignalName}`);
console.log(`    Site URL:  ${ADMIN.siteUrl}`);
console.log('');

const adminDir = path.join(root, 'apps', 'admin');
const adminOneSignal = parseEnvOneSignal(adminDir);
const adminOneSignalOk =
  !!adminOneSignal && adminOneSignal.length >= 10 && !adminOneSignal.includes('YOUR_');
console.log(`  [${adminOneSignalOk ? 'x' : ' '}] VITE_ONESIGNAL_APP_ID in apps/admin/.env`);
if (!adminOneSignalOk) fails++;

const workerOk = fs.existsSync(path.join(root, ADMIN.workerPath));
console.log(`  [${workerOk ? 'x' : ' '}] OneSignalSDKWorker.js in admin public/`);
if (!workerOk) fails++;

const adminHtml = read(path.join(adminDir, 'index.html')) ?? '';
const sdkOk = adminHtml.includes('OneSignalSDK.page.js');
console.log(`  [${sdkOk ? 'x' : ' '}] OneSignal Web SDK in admin index.html`);
if (!sdkOk) fails++;

console.log('  [ ] OneSignal → Mahalak Admin App → Settings → Platforms → Web = Active');
console.log(`  [ ] Web Site URL in OneSignal = ${ADMIN.siteUrl}`);
console.log('  [ ] Open admin on Android Chrome → allow notifications when prompted');
console.log('');

console.log('--- Firebase Cloud Functions (server push) ---');
console.log('  [ ] ONESIGNAL_APP_ID + ONESIGNAL_REST_API_KEY (زبون)');
console.log('  [ ] MERCHANT_ONESIGNAL_APP_ID + MERCHANT_ONESIGNAL_REST_API_KEY (تاجر)');
console.log('      Run: npm run setup:onesignal-secrets (with both REST keys)');
console.log('');

if (fails === 0) {
  console.log('All automated checks passed.\n');
  process.exit(0);
}

console.log(`${fails} automated check(s) need attention.\n`);
process.exit(1);
