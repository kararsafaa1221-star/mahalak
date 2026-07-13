#!/usr/bin/env node
/**
 * Golden checklist: customer vs merchant Android separation.
 * Run: npm run verify:android
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const versions = JSON.parse(fs.readFileSync(path.join(root, 'config', 'app-versions.json'), 'utf8'));

const APPS = [
  {
    key: 'customer',
    label: 'تطبيق الزبون',
    dir: path.join(root, 'apps', 'customer'),
    expectedAppId: 'iq.mahalak.app',
    expectedAppName: 'محلك - زبون',
    expectedLauncherBg: '#10B981',
    expectedVersionCode: versions.customer.versionCode,
    expectedVersionName: versions.customer.versionName,
    expectedKeystoreFile: 'mahalak-release.keystore',
    envExample: 'YOUR_CUSTOMER_ONESIGNAL_APP_ID',
  },
  {
    key: 'merchant',
    label: 'تطبيق التاجر',
    dir: path.join(root, 'apps', 'merchant'),
    expectedAppId: 'iq.mahalak.merchant',
    expectedAppName: 'محلك - تاجر',
    expectedLauncherBg: '#6366F1',
    expectedVersionCode: versions.merchant.versionCode,
    expectedVersionName: versions.merchant.versionName,
    expectedKeystoreFile: 'mahalak-merchant.jks',
    envExample: 'YOUR_MERCHANT_ONESIGNAL_APP_ID',
  },
];

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function extractGradleValue(content, key) {
  const m = content?.match(new RegExp(`${key}\\s+"([^"]+)"`));
  return m?.[1] ?? null;
}

function extractVersionCode(content) {
  const m = content?.match(/versionCode\s+(\d+)/);
  return m ? Number(m[1]) : null;
}

function extractVersionName(content) {
  const m = content?.match(/versionName\s+"([^"]+)"/);
  return m?.[1] ?? null;
}

function getGoogleServicesPackage(jsonPath) {
  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const clients = data.client ?? [];
    return clients.map((c) => c?.client_info?.android_client_info?.package_name).filter(Boolean);
  } catch {
    return null;
  }
}

function parseEnvOneSignal(appDir) {
  for (const name of ['.env', '.env.local']) {
    const raw = readText(path.join(appDir, name));
    if (!raw) continue;
    const m = raw.match(/^VITE_ONESIGNAL_APP_ID=(.+)$/m);
    if (m) return m[1].trim();
  }
  return null;
}

function check(capacitorPath, expectedAppId) {
  const raw = readText(capacitorPath);
  if (!raw) return { ok: false, detail: 'capacitor.config.ts missing' };
  const m = raw.match(/appId:\s*['"]([^'"]+)['"]/);
  if (!m) return { ok: false, detail: 'appId not found' };
  return m[1] === expectedAppId
    ? { ok: true, detail: m[1] }
    : { ok: false, detail: `found ${m[1]}, expected ${expectedAppId}` };
}

const results = [];
let failCount = 0;

console.log('\n=== محلك — Golden Android Checklist ===\n');

for (const app of APPS) {
  console.log(`--- ${app.label} (${app.expectedAppId}) ---`);

  const cap = check(path.join(app.dir, 'capacitor.config.ts'), app.expectedAppId);
  results.push(['Capacitor appId', cap.ok]);
  console.log(`  [${cap.ok ? 'x' : ' '}] Capacitor appId: ${cap.detail}`);
  if (!cap.ok) failCount++;

  const gradlePath = path.join(app.dir, 'android', 'app', 'build.gradle');
  const gradle = readText(gradlePath);
  const applicationId = extractGradleValue(gradle, 'applicationId');
  const gradleOk = applicationId === app.expectedAppId;
  results.push(['Gradle applicationId', gradleOk]);
  console.log(
    `  [${gradleOk ? 'x' : ' '}] Gradle applicationId: ${applicationId ?? 'missing'}`
  );
  if (!gradleOk) failCount++;

  const versionCode = extractVersionCode(gradle);
  const expectedVersion = app.expectedVersionCode ?? 1;
  const versionOk = versionCode === expectedVersion;
  results.push([`versionCode = ${expectedVersion}`, versionOk]);
  console.log(`  [${versionOk ? 'x' : ' '}] versionCode: ${versionCode ?? 'missing'} (expected ${expectedVersion})`);
  if (!versionOk) failCount++;

  const versionName = extractVersionName(gradle);
  const versionNameOk = versionName === app.expectedVersionName;
  results.push([`versionName = ${app.expectedVersionName}`, versionNameOk]);
  console.log(`  [${versionNameOk ? 'x' : ' '}] versionName: ${versionName ?? 'missing'} (expected ${app.expectedVersionName})`);
  if (!versionNameOk) failCount++;

  const stringsPath = path.join(app.dir, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
  const strings = readText(stringsPath) ?? '';
  const labelOk = strings.includes(`<string name="app_name">${app.expectedAppName}</string>`);
  results.push(['Android label (strings.xml)', labelOk]);
  console.log(`  [${labelOk ? 'x' : ' '}] android:label → "${app.expectedAppName}"`);
  if (!labelOk) failCount++;

  const bgPath = path.join(
    app.dir,
    'android',
    'app',
    'src',
    'main',
    'res',
    'values',
    'ic_launcher_background.xml'
  );
  const bg = readText(bgPath) ?? '';
  const iconOk = bg.includes(app.expectedLauncherBg);
  results.push(['Distinct launcher icon color', iconOk]);
  console.log(`  [${iconOk ? 'x' : ' '}] Launcher background: ${app.expectedLauncherBg}`);
  if (!iconOk) failCount++;

  const gsPath = path.join(app.dir, 'android', 'app', 'google-services.json');
  const gsExists = fs.existsSync(gsPath);
  let gsOk = false;
  let gsDetail = 'file missing — download from Firebase Console';
  if (gsExists) {
    const packages = getGoogleServicesPackage(gsPath);
    gsOk = packages?.includes(app.expectedAppId) ?? false;
    gsDetail = gsOk
      ? `package_name OK (${app.expectedAppId})`
      : `wrong package_name: ${packages?.join(', ') || 'unreadable'}`;
  }
  results.push(['google-services.json', gsOk]);
  console.log(`  [${gsOk ? 'x' : ' '}] google-services.json: ${gsDetail}`);
  if (!gsOk) failCount++;

  const oneSignal = parseEnvOneSignal(app.dir);
  const oneSignalOk =
    !!oneSignal &&
    oneSignal.length >= 10 &&
    !oneSignal.includes('YOUR_') &&
    !oneSignal.includes('REPLACE');
  results.push(['OneSignal App ID (.env)', oneSignalOk]);
  console.log(
    `  [${oneSignalOk ? 'x' : ' '}] OneSignal: ${
      oneSignalOk ? oneSignal : oneSignal ?? `set apps/${app.key}/.env → VITE_ONESIGNAL_APP_ID`
    }`
  );
  if (!oneSignalOk) failCount++;

  const manifestPath = path.join(app.dir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  const manifest = readText(manifestPath) ?? '';
  const postNotifOk = manifest.includes('android.permission.POST_NOTIFICATIONS');
  results.push(['POST_NOTIFICATIONS permission', postNotifOk]);
  console.log(`  [${postNotifOk ? 'x' : ' '}] POST_NOTIFICATIONS in AndroidManifest.xml`);
  if (!postNotifOk) failCount++;

  const pluginsJsonPath = path.join(app.dir, 'android', 'app', 'src', 'main', 'assets', 'capacitor.plugins.json');
  const pluginsJson = readText(pluginsJsonPath) ?? '';
  const pushPluginOk = pluginsJson.includes('@capacitor/push-notifications');
  results.push(['Capacitor push-notifications plugin', pushPluginOk]);
  console.log(
    `  [${pushPluginOk ? 'x' : ' '}] @capacitor/push-notifications synced (run cap sync if missing)`,
  );
  if (!pushPluginOk) failCount++;

  const notifIconPath = path.join(
    app.dir,
    'android',
    'app',
    'src',
    'main',
    'res',
    'drawable-mdpi',
    'ic_stat_onesignal_default.png',
  );
  const notifIconOk = fs.existsSync(notifIconPath);
  results.push(['Notification status-bar icon', notifIconOk]);
  console.log(
    `  [${notifIconOk ? 'x' : ' '}] ic_stat_onesignal_default.png: ${
      notifIconOk ? 'present' : 'missing — run node scripts/generate-notification-icons.mjs'
    }`,
  );
  if (!notifIconOk) failCount++;

  const keystorePropsPath = path.join(app.dir, 'android', 'keystore.properties');
  let keystoreOk = false;
  let keystoreDetail = 'keystore.properties missing';
  if (fs.existsSync(keystorePropsPath)) {
    const kp = readText(keystorePropsPath) ?? '';
    const storeMatch = kp.match(/^storeFile=(.+)$/m);
    const storeFile = storeMatch?.[1]?.trim();
    if (storeFile) {
      const resolved = path.isAbsolute(storeFile)
        ? storeFile
        : path.join(app.dir, 'android', storeFile);
      keystoreOk = fs.existsSync(resolved);
      keystoreDetail = keystoreOk
        ? `${storeFile} OK`
        : `${storeFile} not found at ${resolved}`;
    }
  }
  results.push(['Release keystore', keystoreOk]);
  console.log(`  [${keystoreOk ? 'x' : ' '}] Keystore: ${keystoreDetail}`);
  if (!keystoreOk) failCount++;

  console.log('');
}

// Cross-check: same google-services file must not be shared
const customerGs = path.join(root, 'apps', 'customer', 'android', 'app', 'google-services.json');
const merchantGs = path.join(root, 'apps', 'merchant', 'android', 'app', 'google-services.json');
if (fs.existsSync(customerGs) && fs.existsSync(merchantGs)) {
  const sameFile =
    fs.readFileSync(customerGs).equals?.(fs.readFileSync(merchantGs)) ??
    fs.readFileSync(customerGs).toString() === fs.readFileSync(merchantGs).toString();
  const crossOk = !sameFile;
  console.log('--- Cross-app safety ---');
  console.log(
    `  [${crossOk ? 'x' : ' '}] google-services.json files are NOT identical copies`
  );
  if (!crossOk) {
    failCount++;
    console.log('  ⚠ WARNING: Customer and merchant use the SAME google-services.json!');
  }
  console.log('');
}

console.log('--- Build step (manual) ---');
console.log('  [ ] Clean Project in Android Studio (Build → Clean Project) per app');
console.log('  [ ] Build APK after npm run cap:sync:customer / cap:sync:merchant');
console.log('');

if (failCount === 0) {
  console.log('✅ All automated checks passed.\n');
  process.exit(0);
}

console.log(`⚠ ${failCount} check(s) need attention. See config/android/README.md\n`);
process.exit(1);
