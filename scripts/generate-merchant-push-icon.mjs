#!/usr/bin/env node
/**
 * Generate Android push-notification icon (ic_stat_onesignal_default.png)
 * for the Merchant app from a source image.
 *
 * Usage:
 *   node scripts/generate-merchant-push-icon.mjs [source-image]
 *
 * Default source: packages/shared/resources/icon.png
 *
 * The output is a white silhouette on a transparent background — the only
 * icon style Android 5+ (Lollipop+) accepts for status-bar notifications.
 * Coloured or opaque backgrounds will be rendered as a solid block on Android.
 *
 * Run after changing the merchant app icon or branding assets.
 */
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const defaultSrc = join(root, 'packages', 'shared', 'resources', 'icon.png');
const src = process.argv[2] ? join(process.cwd(), process.argv[2]) : defaultSrc;

if (!existsSync(src)) {
  console.error(`Source image not found: ${src}`);
  console.error(`Usage: node scripts/generate-merchant-push-icon.mjs [path/to/icon.png]`);
  process.exit(1);
}

const androidRes = join(
  root, 'apps', 'merchant', 'android', 'app', 'src', 'main', 'res',
);

const SIZES = {
  'drawable-mdpi':    24,
  'drawable-hdpi':    36,
  'drawable-xhdpi':   48,
  'drawable-xxhdpi':  72,
  'drawable-xxxhdpi': 96,
};

async function makeWhiteSilhouette(size, outputPath) {
  const resized = sharp(src).resize(size, size, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).ensureAlpha();

  const meta = await resized.metadata();
  const w = meta.width ?? size;
  const h = meta.height ?? size;
  const alphaMask = await resized.clone().extractChannel('alpha').toBuffer();

  await sharp({
    create: { width: w, height: h, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .joinChannel(alphaMask)
    .png()
    .toFile(outputPath);
}

console.log(`\nGenerating merchant push-notification icons from: ${src}\n`);

for (const [folder, size] of Object.entries(SIZES)) {
  const dir = join(androidRes, folder);
  mkdirSync(dir, { recursive: true });
  const out = join(dir, 'ic_stat_onesignal_default.png');
  await makeWhiteSilhouette(size, out);
  console.log(`  ✓  ${folder}/ic_stat_onesignal_default.png  (${size}×${size}px)`);
}

console.log('\nDone — sync the Android project to apply changes:\n');
console.log('  npm run cap:sync:merchant\n');
