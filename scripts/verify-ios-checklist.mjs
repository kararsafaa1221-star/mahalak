#!/usr/bin/env node
/**
 * iOS readiness checklist for customer + merchant apps.
 * Run: npm run verify:ios
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const APPS = [
  {
    key: 'customer',
    label: 'تطبيق الزبون',
    dir: path.join(root, 'apps', 'customer'),
    expectedAppId: 'iq.mahalak.app',
    expectedDisplayName: 'محلك - زبون',
    envPlaceholder: 'YOUR_CUSTOMER',
  },
  {
    key: 'merchant',
    label: 'تطبيق التاجر',
    dir: path.join(root, 'apps', 'merchant'),
    expectedAppId: 'iq.mahalak.merchant',
    expectedDisplayName: 'محلك - تاجر',
    envPlaceholder: 'YOUR_MERCHANT',
  },
];

function read(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function parseEnvOneSignal(appDir, placeholder) {
  for (const name of ['.env', '.env.local']) {
    const raw = read(path.join(appDir, name));
    if (!raw) continue;
    const m = raw.match(/^VITE_ONESIGNAL_APP_ID=(.+)$/m);
    if (m) return m[1].trim();
  }
  return null;
}

let failCount = 0;

console.log('\nMahalak — iOS checklist (customer + merchant)\n');

for (const app of APPS) {
  console.log(`--- ${app.label} (${app.expectedAppId}) ---`);

  const iosDir = path.join(app.dir, 'ios');
  const iosExists = fs.existsSync(path.join(iosDir, 'App'));
  console.log(`${iosExists ? '✓' : '✗'} ios/App project exists`);
  if (!iosExists) {
    failCount++;
    console.log('  → Run: npx cap add ios (inside apps/' + app.key + ') then cap sync ios');
    console.log('');
    continue;
  }

  const xcodeproj = path.join(iosDir, 'App', 'App.xcodeproj', 'project.pbxproj');
  const pbx = read(xcodeproj);
  const bundleOk = pbx?.includes(`PRODUCT_BUNDLE_IDENTIFIER = ${app.expectedAppId};`) ?? false;
  console.log(`${bundleOk ? '✓' : '✗'} Bundle ID ${app.expectedAppId}`);
  if (!bundleOk) failCount++;

  const infoPlist = read(path.join(iosDir, 'App', 'App', 'Info.plist'));
  const pushBgOk = infoPlist?.includes('remote-notification') ?? false;
  console.log(`${pushBgOk ? '✓' : '✗'} Push background mode (remote-notification)`);
  if (!pushBgOk) failCount++;

  const displayOk = infoPlist?.includes(app.expectedDisplayName) ?? false;
  console.log(`${displayOk ? '✓' : '✗'} Arabic display name`);
  if (!displayOk) failCount++;

  const cap = read(path.join(app.dir, 'capacitor.config.ts'));
  const capOk = cap?.includes(`appId: '${app.expectedAppId}'`) ?? false;
  console.log(`${capOk ? '✓' : '✗'} Capacitor appId`);
  if (!capOk) failCount++;

  const oneSignal = parseEnvOneSignal(app.dir, app.envPlaceholder);
  const oneSignalOk =
    Boolean(oneSignal) &&
    oneSignal.length >= 10 &&
    !oneSignal.includes('YOUR_') &&
    !oneSignal.includes('REPLACE');
  console.log(
    `${oneSignalOk ? '✓' : '✗'} OneSignal App ID ${oneSignalOk ? 'configured' : 'missing in .env'}`,
  );
  if (!oneSignalOk) failCount++;

  console.log('  [ ] Push Notifications capability enabled in Xcode (Signing & Capabilities)');
  console.log('  [ ] APNs key/certificate uploaded to OneSignal dashboard');
  console.log('');
}

console.log(
  failCount === 0
    ? 'All automated iOS checks passed.'
    : `${failCount} automated check(s) need attention.`,
);
console.log('');
process.exit(failCount > 0 ? 1 : 0);
