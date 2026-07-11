#!/usr/bin/env node
/**
 * iOS readiness checklist for customer app.
 * Run: npm run verify:ios
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appDir = path.join(root, 'apps', 'customer');
const iosDir = path.join(appDir, 'ios');
const xcodeproj = path.join(iosDir, 'App', 'App.xcodeproj', 'project.pbxproj');
const infoPlist = path.join(iosDir, 'App', 'App', 'Info.plist');

function read(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

const checks = [];

function add(name, ok, detail) {
  checks.push({ name, ok, detail });
}

add('ios/App exists', fs.existsSync(path.join(iosDir, 'App')), iosDir);
add('App.xcodeproj exists', fs.existsSync(xcodeproj), xcodeproj);

const pbx = read(xcodeproj);
add('Bundle ID iq.mahalak.app', pbx?.includes('PRODUCT_BUNDLE_IDENTIFIER = iq.mahalak.app;') ?? false, 'project.pbxproj');
add('Marketing version 1.0.5', pbx?.includes('MARKETING_VERSION = 1.0.5;') ?? false, 'project.pbxproj');
add('Build number 8', pbx?.includes('CURRENT_PROJECT_VERSION = 8;') ?? false, 'project.pbxproj');

const plist = read(infoPlist);
add('Location permission text', plist?.includes('NSLocationWhenInUseUsageDescription') ?? false, 'Info.plist');
add('Push background mode', plist?.includes('remote-notification') ?? false, 'Info.plist');
add('Arabic display name', plist?.includes('محلك - زبون') ?? false, 'Info.plist');

const cap = read(path.join(appDir, 'capacitor.config.ts'));
add('Capacitor appId', cap?.includes("appId: 'iq.mahalak.app'") ?? false, 'capacitor.config.ts');
add('Capacitor ios path', cap?.includes("path: 'ios'") ?? false, 'capacitor.config.ts');

const env = read(path.join(appDir, '.env')) ?? read(path.join(appDir, '.env.local'));
const oneSignal = env?.match(/^VITE_ONESIGNAL_APP_ID=(.+)$/m)?.[1]?.trim();
add(
  'OneSignal App ID configured',
  Boolean(oneSignal && !oneSignal.includes('YOUR_CUSTOMER')),
  oneSignal ? 'set in .env' : 'missing — copy apps/customer/.env.example → .env'
);

console.log('\nMahalak — iOS checklist (customer)\n');
for (const c of checks) {
  console.log(`${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
}

const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) need attention.`}\n`);
process.exit(failed > 0 ? 1 : 0);
