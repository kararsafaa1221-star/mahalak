#!/usr/bin/env node
/**
 * Generate Android push-notification icon (ic_stat_onesignal_default.png)
 * for the Customer app from a source image.
 *
 * Usage:
 *   node scripts/generate-customer-push-icon.mjs [source-image]
 *
 * Default source: apps/customer/resources/icon.png
 * The output is a white silhouette on a transparent background, which is the
 * only icon style Android 5+ (Lollipop+) accepts for status-bar notifications.
 *
 * Run after changing the app icon or branding assets.
 */
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const defaultSrc = join(root, 'apps', 'customer', 'resources', 'icon.png');
const src = process.argv[2] ? join(process.cwd(), process.argv[2]) : defaultSrc;

if (!existsSync(src)) {
  console.error(`Source image not found: ${src}`);
  process.exit(1);
}

const androidRes = join(
  root, 'apps', 'customer', 'android', 'app', 'src', 'main', 'res',
);

/**
 * Size map for Android notification icon densities.
 * Android renders the status-bar icon at 24×24 dp; multiply by density ratio.
 */
const SIZES = {
  'drawable-mdpi':    24,
  'drawable-hdpi':    36,
  'drawable-xhdpi':   48,
  'drawable-xxhdpi':  72,
  'drawable-xxxhdpi': 96,
};

/**
 * Converts the source image into a white-silhouette PNG with a transparent
 * background — the only format Android accepts for notification icons.
 * Coloured pixels (including the launcher icon purple) are NOT valid here.
 */
async function makeWhiteSilhouette(size, outputPath) {
  // Step 1: resize and extract the alpha channel.
  const resized = sharp(src).resize(size, size, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).ensureAlpha();

  const meta = await resized.metadata();
  const w = meta.width ?? size;
  const h = meta.height ?? size;
  const alphaMask = await resized.clone().extractChannel('alpha').toBuffer();

  // Step 2: create a solid white image and mask it with the source alpha.
  await sharp({
    create: { width: w, height: h, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .joinChannel(alphaMask)
    .png()
    .toFile(outputPath);
}

console.log(`\nGenerating push-notification icons from: ${src}\n`);

for (const [folder, size] of Object.entries(SIZES)) {
  const dir = join(androidRes, folder);
  mkdirSync(dir, { recursive: true });
  const out = join(dir, 'ic_stat_onesignal_default.png');
  await makeWhiteSilhouette(size, out);
  console.log(`  ✓  ${folder}/ic_stat_onesignal_default.png  (${size}×${size}px)`);
}

console.log('\nDone — sync the Android project to apply changes:\n');
console.log('  npm run cap:sync:customer\n');
