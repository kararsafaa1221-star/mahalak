#!/usr/bin/env node
/**
 * Admin panel Web Push checklist (works on Android Chrome too).
 * Run: npm run verify:admin:notifications
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const adminDir = path.join(root, 'apps', 'admin');

function read(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function parseEnvOneSignal() {
  for (const name of ['.env', '.env.local']) {
    const raw = read(path.join(adminDir, name));
    if (!raw) continue;
    const m = raw.match(/^VITE_ONESIGNAL_APP_ID=(.+)$/m);
    if (m) return m[1].trim();
  }
  return null;
}

let fails = 0;

console.log('\n=== محلك — Admin Web Push Checklist ===\n');
console.log('OneSignal app: Mahalak Admin App');
console.log('Site URL:      https://mahalak-admin.web.app\n');

const oneSignal = parseEnvOneSignal();
const oneSignalOk =
  !!oneSignal && oneSignal.length >= 10 && !oneSignal.includes('YOUR_');
console.log(`  [${oneSignalOk ? 'x' : ' '}] VITE_ONESIGNAL_APP_ID in apps/admin/.env`);
if (!oneSignalOk) fails++;

const workerOk = fs.existsSync(path.join(adminDir, 'public', 'OneSignalSDKWorker.js'));
console.log(`  [${workerOk ? 'x' : ' '}] OneSignalSDKWorker.js`);
if (!workerOk) fails++;

const html = read(path.join(adminDir, 'index.html')) ?? '';
console.log(`  [${html.includes('OneSignalSDK.page.js') ? 'x' : ' '}] OneSignal Web SDK in index.html`);

const vite = read(path.join(adminDir, 'vite.config.ts')) ?? '';
console.log(`  [${vite.includes("base: '/'") ? 'x' : ' '}] Vite base '/' for Firebase Hosting`);

console.log('  [ ] OneSignal → Mahalak Admin App → Settings → Platforms → Web = Active');
console.log('  [ ] Site URL = https://mahalak-admin.web.app (or your custom domain)');
console.log('  [ ] npm run build:admin && firebase deploy --only hosting:admin');
console.log('  [ ] Open admin in Chrome → login → allow notifications');
console.log('');
console.log('Optional (server push TO admins):');
console.log('  [ ] ADMIN_ONESIGNAL_APP_ID + ADMIN_ONESIGNAL_REST_API_KEY in Firebase Secrets');
console.log('');

if (fails === 0) {
  console.log('Automated checks passed.\n');
  process.exit(0);
}

console.log(`${fails} automated check(s) need attention.\n`);
process.exit(1);
