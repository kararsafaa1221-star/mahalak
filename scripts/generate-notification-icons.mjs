#!/usr/bin/env node
/**
 * Generates ic_stat_onesignal_default.png for customer + merchant Android apps.
 * Run: node scripts/generate-notification-icons.mjs
 */
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sharedSrc = join(root, 'packages', 'shared', 'resources', 'icon.png');
const customerSrc = join(root, 'apps', 'customer', 'resources', 'icon.png');

const APPS = [
  { key: 'customer', src: customerSrc },
  { key: 'merchant', src: sharedSrc },
];

const SMALL_NOTIFICATION_SIZES = {
  'drawable-mdpi': 24,
  'drawable-hdpi': 36,
  'drawable-xhdpi': 48,
  'drawable-xxhdpi': 72,
  'drawable-xxxhdpi': 96,
};

async function writeWhiteSilhouetteIcon(source, size, outputPath) {
  const resized = sharp(source).resize(size, size, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).ensureAlpha();

  const meta = await resized.metadata();
  const width = meta.width ?? size;
  const height = meta.height ?? size;
  const alphaMask = await resized.clone().extractChannel('alpha').toBuffer();

  await sharp({
    create: { width, height, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .joinChannel(alphaMask)
    .png()
    .toFile(outputPath);
}

async function generateForApp(appKey, source) {
  const res = join(root, 'apps', appKey, 'android', 'app', 'src', 'main', 'res');
  console.log(`\n--- ${appKey} ---`);

  for (const [folder, size] of Object.entries(SMALL_NOTIFICATION_SIZES)) {
    const dir = join(res, folder);
    mkdirSync(dir, { recursive: true });
    const output = join(dir, 'ic_stat_onesignal_default.png');
    await writeWhiteSilhouetteIcon(source, size, output);
    console.log(`  ✓ ${folder}/ic_stat_onesignal_default.png (${size}px)`);
  }

  const largeDir = join(res, 'drawable-xxxhdpi');
  mkdirSync(largeDir, { recursive: true });
  const largePath = join(largeDir, 'ic_onesignal_large_icon_default.png');
  await sharp(source)
    .resize(256, 256, { fit: 'contain', background: { r: 11, g: 19, b: 32, alpha: 1 } })
    .png()
    .toFile(largePath);
  console.log('  ✓ drawable-xxxhdpi/ic_onesignal_large_icon_default.png');
}

for (const app of APPS) {
  if (!existsSync(app.src)) {
    console.error(`Source icon not found: ${app.src}`);
    process.exit(1);
  }
  await generateForApp(app.key, app.src);
}
console.log('\nDone.\n');
