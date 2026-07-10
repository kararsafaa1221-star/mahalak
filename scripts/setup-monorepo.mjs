#!/usr/bin/env node
/**
 * One-time monorepo migration: copies source files and rewrites imports.
 * Run: node scripts/setup-monorepo.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    return true;
  }
  console.warn('Missing:', src);
  return false;
}

function copyDir(srcDir, destDir, filter) {
  if (!fs.existsSync(srcDir)) return;
  ensureDir(destDir);
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest, filter);
    } else if (!filter || filter(src)) {
      copyFile(src, dest);
    }
  }
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else if (/\.(tsx?|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function rewriteImports(filePath, rules) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [from, to] of rules) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(filePath, content, 'utf8');
}

const sharedSrc = path.join(root, 'packages', 'shared', 'src');
const customerSrc = path.join(root, 'apps', 'customer', 'src');
const merchantSrc = path.join(root, 'apps', 'merchant', 'src');
const adminSrc = path.join(root, 'apps', 'admin', 'src');
const legacySrc = path.join(root, 'src');

console.log('Creating monorepo structure...');

// --- packages/shared ---
const sharedDirs = ['context', 'lib', 'services', 'utils', 'hooks', 'shims'];
for (const d of sharedDirs) {
  copyDir(path.join(legacySrc, d), path.join(sharedSrc, d));
}
const sharedFiles = [
  'types.ts',
  'constants.ts',
  'index.css',
  'declarations.d.ts',
  'vite-env.d.ts',
];
for (const f of sharedFiles) {
  copyFile(path.join(legacySrc, f), path.join(sharedSrc, f));
}
const sharedComponents = [
  'ErrorBoundary.tsx',
  'OnlineGate.tsx',
  'ProductImage.tsx',
  'VerifiedBadge.tsx',
  'CopyButton.tsx',
  'ImageUploader.tsx',
  'HeatmapLayer.tsx',
  'PushPermissionPrompt.tsx',
  'LocationPicker.tsx',
];
for (const c of sharedComponents) {
  copyFile(path.join(legacySrc, 'components', c), path.join(sharedSrc, 'components', c));
}

// --- apps/customer ---
copyFile(path.join(legacySrc, 'views', 'Customer', 'CustomerApp.tsx'), path.join(customerSrc, 'views', 'CustomerApp.tsx'));
copyFile(path.join(legacySrc, 'views', 'WelcomeScreen.tsx'), path.join(customerSrc, 'views', 'WelcomeScreen.tsx'));
copyDir(path.join(legacySrc, 'components', 'customer'), path.join(customerSrc, 'components', 'customer'));

// --- apps/merchant ---
copyFile(path.join(legacySrc, 'views', 'Merchant', 'MerchantApp.tsx'), path.join(merchantSrc, 'views', 'MerchantApp.tsx'));
copyDir(path.join(legacySrc, 'components', 'merchant'), path.join(merchantSrc, 'components', 'merchant'));
const merchantComponents = [
  'MerchantOnboarding.tsx',
  'MerchantDashboardTour.tsx',
  'UploadReel.tsx',
  'ReelsProfileList.tsx',
  'ReelsFeed.tsx',
  'ProductUploader.tsx',
  'ProductOverlay.tsx',
  'BackgroundRemover.tsx',
];
for (const c of merchantComponents) {
  copyFile(path.join(legacySrc, 'components', c), path.join(merchantSrc, 'components', c));
}

// --- apps/admin (from admin-dashboard) ---
const adminLegacy = path.join(root, 'admin-dashboard');
copyDir(path.join(adminLegacy, 'src'), adminSrc);
copyDir(path.join(adminLegacy, 'public'), path.join(root, 'apps', 'admin', 'public'));
copyFile(path.join(adminLegacy, 'index.html'), path.join(root, 'apps', 'admin', 'index.html'));

// --- Import rewrites ---
const toShared = [
  ["from '../../context/", "from '@shared/context/"],
  ["from '../../lib/", "from '@shared/lib/"],
  ["from '../../services/", "from '@shared/services/"],
  ["from '../../utils/", "from '@shared/utils/"],
  ["from '../../hooks/", "from '@shared/hooks/"],
  ["from '../../types'", "from '@shared/types'"],
  ["from '../../constants'", "from '@shared/constants'"],
  ["from '../../components/ErrorBoundary'", "from '@shared/components/ErrorBoundary'"],
  ["from '../../components/OnlineGate'", "from '@shared/components/OnlineGate'"],
  ["from '../../components/ProductImage'", "from '@shared/components/ProductImage'"],
  ["from '../../components/VerifiedBadge'", "from '@shared/components/VerifiedBadge'"],
  ["from '../../components/CopyButton'", "from '@shared/components/CopyButton'"],
  ["from '../../components/ImageUploader'", "from '@shared/components/ImageUploader'"],
  ["from '../../components/HeatmapLayer'", "from '@shared/components/HeatmapLayer'"],
  ["from '../../components/PushPermissionPrompt'", "from '@shared/components/PushPermissionPrompt'"],
  ["from '../../components/LocationPicker'", "from '@shared/components/LocationPicker'"],
  ["from '../context/", "from '@shared/context/"],
  ["from '../lib/", "from '@shared/lib/"],
  ["from '../utils/", "from '@shared/utils/"],
  ["from '../services/", "from '@shared/services/"],
  ["from '../types'", "from '@shared/types'"],
  ["from '../constants'", "from '@shared/constants'"],
];

const customerLocal = [
  ["from '../../components/customer/", "from '@/components/customer/"],
  ["from '../context/useApp'", "from '@shared/context/useApp'"],
  ["navigate('/select')", "navigate('/')"],
  ["<Navigate to=\"/customer\" replace />", "<Navigate to=\"/dashboard\" replace />"],
  ["if (currentCustomer) return <Navigate to=\"/customer\" replace />;", "if (currentCustomer) return <Navigate to=\"/dashboard\" replace />;"],
  ["if (currentMerchant) return <Navigate to=\"/merchant\" replace />;", ""],
];

const merchantLocal = [
  ["from '../../components/merchant/", "from '@/components/merchant/"],
  ["from '../../components/MerchantOnboarding'", "from '@/components/MerchantOnboarding'"],
  ["from '../../components/MerchantDashboardTour'", "from '@/components/MerchantDashboardTour'"],
  ["from '../../components/UploadReel'", "from '@/components/UploadReel'"],
  ["from '../../components/ReelsProfileList'", "from '@/components/ReelsProfileList'"],
  ["from '../../components/ReelsFeed'", "from '@/components/ReelsFeed'"],
  ["from '../../components/ProductUploader'", "from '@/components/ProductUploader'"],
  ["from '../../components/ProductOverlay'", "from '@/components/ProductOverlay'"],
  ["from '../../components/BackgroundRemover'", "from '@/components/BackgroundRemover'"],
  ["from \"../../components/merchant/", "from \"@/components/merchant/"],
  ["from \"../../components/MerchantOnboarding\"", "from \"@/components/MerchantOnboarding\""],
  ["from \"../../components/MerchantDashboardTour\"", "from \"@/components/MerchantDashboardTour\""],
  ["from \"../../components/ImageUploader\"", "from \"@shared/components/ImageUploader\""],
  ["from \"../../components/BackgroundRemover\"", "from \"@/components/BackgroundRemover\""],
  ["from \"../../components/LocationPicker\"", "from \"@shared/components/LocationPicker\""],
  ["from \"../../components/CopyButton\"", "from \"@shared/components/CopyButton\""],
  ["from \"../../components/PushPermissionPrompt\"", "from \"@shared/components/PushPermissionPrompt\""],
  ["from \"../../context/", "from \"@shared/context/"],
  ["from \"../../utils/", "from \"@shared/utils/"],
  ["from \"../../services/", "from \"@shared/services/"],
  ["from \"../../types\"", "from \"@shared/types\""],
  ["from \"../../constants\"", "from \"@shared/constants\""],
  ["from \"../../lib/", "from \"@shared/lib/"],
];

for (const file of walkFiles(sharedSrc)) {
  rewriteImports(file, [
    ["from '../types'", "from '@shared/types'"],
    ["from '../constants'", "from '@shared/constants'"],
    ["from './types'", "from '@shared/types'"],
    ["from '../lib/", "from '@shared/lib/"],
    ["from '../utils/", "from '@shared/utils/"],
    ["from '../services/", "from '@shared/services/"],
    ["from '../context/", "from '@shared/context/"],
    ["from '../components/", "from '@shared/components/"],
  ]);
}

for (const file of walkFiles(customerSrc)) {
  rewriteImports(file, [...toShared, ...customerLocal]);
}

for (const file of walkFiles(merchantSrc)) {
  rewriteImports(file, [...toShared, ...merchantLocal]);
}

// Admin: point duplicated modules to @shared where applicable
const adminSharedRules = [
  ["from '../lib/firebase'", "from '@shared/lib/firebase'"],
  ["from '../lib/firebaseConfig'", "from '@shared/lib/firebaseConfig'"],
  ["from '../lib/firestoreUtils'", "from '@shared/lib/firestoreUtils'"],
  ["from '../lib/checkFirebaseConnection'", "from '@shared/lib/checkFirebaseConnection'"],
  ["from '../lib/onesignalConfig'", "from '@shared/lib/onesignalConfig'"],
  ["from '../lib/pushNotifications'", "from '@shared/lib/pushNotifications'"],
  ["from '../types'", "from '@shared/types'"],
  ["from '../constants'", "from '@shared/constants'"],
  ["from '../utils/cn'", "from '@shared/utils/cn'"],
  ["from '../utils/alerts'", "from '@shared/utils/alerts'"],
  ["from '../utils/delivery'", "from '@shared/utils/delivery'"],
  ["from '../utils/distance'", "from '@shared/utils/distance'"],
  ["from '../utils/date'", "from '@shared/utils/date'"],
  ["from '../utils/promoCode'", "from '@shared/utils/promoCode'"],
  ["from '../components/ErrorBoundary'", "from '@shared/components/ErrorBoundary'"],
  ["from '../components/VerifiedBadge'", "from '@shared/components/VerifiedBadge'"],
  ["from '../components/HeatmapLayer'", "from '@shared/components/HeatmapLayer'"],
  ["from '../components/ImageUploader'", "from '@shared/components/ImageUploader'"],
  ["from '../services/otpService'", "from '@shared/services/otpService'"],
  ["from '../services/storageService'", "from '@shared/services/storageService'"],
  ["from '../services/backupService'", "from '@shared/services/backupService'"],
];

for (const file of walkFiles(adminSrc)) {
  rewriteImports(file, adminSharedRules);
}

console.log('Monorepo file migration complete.');
