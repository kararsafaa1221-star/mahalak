#!/usr/bin/env node
/**
 * Generates web + Android + iOS launcher icons for the customer app.
 * Run: node scripts/generate-customer-app-icons.mjs
 */
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'apps', 'customer', 'resources', 'icon.png');
const androidRes = join(root, 'apps', 'customer', 'android', 'app', 'src', 'main', 'res');
const iosIcon = join(
  root,
  'apps',
  'customer',
  'ios',
  'App',
  'App',
  'Assets.xcassets',
  'AppIcon.appiconset',
  'AppIcon-512@2x.png',
);
const iosSplashDir = join(
  root,
  'apps',
  'customer',
  'ios',
  'App',
  'App',
  'Assets.xcassets',
  'Splash.imageset',
);

const BACKGROUND = { r: 11, g: 19, b: 32, alpha: 1 }; // #0B1320

const SPLASH_SIZES = {
  'drawable': 480,
  'drawable-port-mdpi': 320,
  'drawable-port-hdpi': 480,
  'drawable-port-xhdpi': 720,
  'drawable-port-xxhdpi': 1080,
  'drawable-port-xxxhdpi': 1440,
  'drawable-land-mdpi': 320,
  'drawable-land-hdpi': 480,
  'drawable-land-xhdpi': 720,
  'drawable-land-xxhdpi': 1080,
  'drawable-land-xxxhdpi': 1440,
};

const LEGACY_SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const FOREGROUND_SIZES = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

async function writeSquareIcon(size, outputPath) {
  await sharp(src)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png()
    .toFile(outputPath);
}

async function writeForegroundIcon(size, outputPath) {
  const inset = Math.round(size * 0.12);
  const inner = size - inset * 2;
  const resized = await sharp(src)
    .resize(inner, inner, { fit: 'contain', background: BACKGROUND })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { ...BACKGROUND, alpha: 0 },
    },
  })
    .composite([{ input: resized, top: inset, left: inset }])
    .png()
    .toFile(outputPath);
}

async function writeSplash(width, height, outputPath) {
  const iconSize = Math.round(Math.min(width, height) * 0.42);
  const icon = await sharp(src)
    .resize(iconSize, iconSize, { fit: 'contain', background: BACKGROUND })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: BACKGROUND,
    },
  })
    .composite([{ input: icon, gravity: 'centre' }])
    .png()
    .toFile(outputPath);
}

async function main() {
  if (!existsSync(src)) {
    console.error(`Source icon not found: ${src}`);
    process.exit(1);
  }

  console.log('Generating customer app icons…');

  for (const [folder, size] of Object.entries(LEGACY_SIZES)) {
    const dir = join(androidRes, folder);
    mkdirSync(dir, { recursive: true });
    await writeSquareIcon(size, join(dir, 'ic_launcher.png'));
    await writeSquareIcon(size, join(dir, 'ic_launcher_round.png'));
    console.log(`  ✓ ${folder}/ic_launcher*.png (${size}px)`);
  }

  for (const [folder, size] of Object.entries(FOREGROUND_SIZES)) {
    const dir = join(androidRes, folder);
    mkdirSync(dir, { recursive: true });
    await writeForegroundIcon(size, join(dir, 'ic_launcher_foreground.png'));
    console.log(`  ✓ ${folder}/ic_launcher_foreground.png (${size}px)`);
  }

  mkdirSync(dirname(iosIcon), { recursive: true });
  await writeSquareIcon(1024, iosIcon);
  console.log('  ✓ iOS AppIcon-512@2x.png (1024px)');

  for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    await writeSplash(2732, 2732, join(iosSplashDir, name));
  }
  console.log('  ✓ iOS Splash.imageset (2732px)');

  for (const [folder, size] of Object.entries(SPLASH_SIZES)) {
    const dir = join(androidRes, folder);
    mkdirSync(dir, { recursive: true });
    const isLandscape = folder.includes('land');
    const width = isLandscape ? Math.round(size * 1.78) : size;
    const height = isLandscape ? size : Math.round(size * 1.78);
    await writeSplash(width, height, join(dir, 'splash.png'));
    console.log(`  ✓ ${folder}/splash.png (${width}x${height})`);
  }

  console.log('\nDone.\n');
}

await main();
