#!/usr/bin/env node
/**
 * Sync app versions from config/app-versions.json to all platforms.
 * Android build.gradle is the canonical source — edit config to match Android, then run:
 *   npm run sync:versions
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const versionsPath = path.join(root, 'config', 'app-versions.json');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function write(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function updateAndroidGradle(gradlePath, versionName, versionCode) {
  if (!fs.existsSync(gradlePath)) return false;
  let content = read(gradlePath);
  content = content.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  content = content.replace(/versionName\s+"[^"]+"/, `versionName "${versionName}"`);
  write(gradlePath, content);
  return true;
}

function updateIosPbxproj(pbxprojPath, versionName, versionCode) {
  if (!fs.existsSync(pbxprojPath)) return false;
  let content = read(pbxprojPath);
  content = content.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${versionCode};`);
  content = content.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${versionName};`);
  write(pbxprojPath, content);
  return true;
}

function updatePackageJson(packagePath, versionName) {
  if (!fs.existsSync(packagePath)) return false;
  const pkg = JSON.parse(read(packagePath));
  pkg.version = versionName;
  write(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
  return true;
}

function updateCodemagicYaml(yamlPath, customerVersion, merchantVersion) {
  if (!fs.existsSync(yamlPath)) return false;
  let content = read(yamlPath);
  content = content.replace(
    /(customer-ios-app-store:[\s\S]*?MARKETING_VERSION:\s*")[^"]+(")/,
    `$1${customerVersion}$2`,
  );
  content = content.replace(
    /(merchant-ios-app-store:[\s\S]*?MARKETING_VERSION:\s*")[^"]+(")/,
    `$1${merchantVersion}$2`,
  );
  write(yamlPath, content);
  return true;
}

const versions = JSON.parse(read(versionsPath));
const updates = [];

for (const key of ['customer', 'merchant']) {
  const app = versions[key];
  const appDir = path.join(root, 'apps', key);
  const gradle = path.join(appDir, 'android', 'app', 'build.gradle');
  const pbxproj = path.join(appDir, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
  const pkg = path.join(appDir, 'package.json');

  if (updateAndroidGradle(gradle, app.versionName, app.versionCode)) {
    updates.push(`${key}: android/app/build.gradle → ${app.versionName} (${app.versionCode})`);
  }
  if (updateIosPbxproj(pbxproj, app.versionName, app.versionCode)) {
    updates.push(`${key}: ios/App.xcodeproj → ${app.versionName} (${app.versionCode})`);
  } else if (key === 'customer') {
    updates.push(`${key}: ios project not found (skip until cap add ios)`);
  }
  if (updatePackageJson(pkg, app.versionName)) {
    updates.push(`${key}: package.json → ${app.versionName}`);
  }
}

if (versions.admin?.versionName) {
  const adminPkg = path.join(root, 'apps', 'admin', 'package.json');
  if (updatePackageJson(adminPkg, versions.admin.versionName)) {
    updates.push(`admin: package.json → ${versions.admin.versionName}`);
  }
}

if (updateCodemagicYaml(
  path.join(root, 'codemagic.yaml'),
  versions.customer.versionName,
  versions.merchant.versionName,
)) {
  updates.push(`codemagic.yaml → customer ${versions.customer.versionName}, merchant ${versions.merchant.versionName}`);
}

console.log('\nSynced versions from config/app-versions.json:\n');
for (const line of updates) console.log(`  ✓ ${line}`);
console.log('\nTo change versions: edit config/app-versions.json, then run npm run sync:versions\n');
