/**
 * Generates Android launcher icons for a Capacitor project:
 *  - Legacy flat PNGs  (mipmap-*)   — for Android < 8
 *  - Adaptive icon PNGs (mipmap-* foreground + mipmap-anydpi-v26 XML) — for Android 8+
 *
 * Adaptive icon anatomy (108dp total canvas):
 *   - Outer bleed zone: 18dp each side (can be cropped by launcher)
 *   - Safe zone:        72dp x 72dp  (inner 66.67 %) — always visible
 *
 * Strategy: purple background color (#6B21A8) + icon scaled to fill
 * the 72dp safe zone, centred on the 108dp canvas.
 */
import sharp from 'sharp';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src  = join(root, 'resources', 'icon.png');
const res  = join(root, 'android', 'app', 'src', 'main', 'res');

// Brand colour sampled from the icon (dark deep-purple background)
const BRAND_COLOR = '#180828';

// Legacy flat icons — simple square crop / cover
const FLAT_SIZES = {
  'mipmap-ldpi':    36,
  'mipmap-mdpi':    48,
  'mipmap-hdpi':    72,
  'mipmap-xhdpi':   96,
  'mipmap-xxhdpi':  144,
  'mipmap-xxxhdpi': 192,
};

// Adaptive foreground images: 108dp canvas per density
// Canvas px = 108 * (dpi_factor); safe zone = 72dp = canvas * (72/108)
const ADAPTIVE_SIZES = {
  'mipmap-mdpi':    108,   // mdpi  = 1×
  'mipmap-hdpi':    162,   // hdpi  = 1.5×
  'mipmap-xhdpi':   216,   // xhdpi = 2×
  'mipmap-xxhdpi':  324,   // xxhdpi = 3×
  'mipmap-xxxhdpi': 432,   // xxxhdpi = 4×
};

if (!existsSync(src)) {
  console.error(`Source icon not found: ${src}`);
  process.exit(1);
}

function ensure(dir) { mkdirSync(dir, { recursive: true }); }

// ── 1. Legacy flat icons ────────────────────────────────────────────────────
async function generateFlat() {
  console.log('\n📦 Generating legacy flat icons…');
  for (const [folder, size] of Object.entries(FLAT_SIZES)) {
    const dir = join(res, folder);
    ensure(dir);
    const opts = { fit: 'cover', width: size, height: size };
    await sharp(src).resize(opts).png().toFile(join(dir, 'ic_launcher.png'));
    await sharp(src).resize(opts).png().toFile(join(dir, 'ic_launcher_round.png'));
    console.log(`  ✓ ${folder.padEnd(18)} ${size}×${size}px`);
  }
}

// ── 2. Adaptive foreground PNGs (108dp canvas, icon in safe zone) ───────────
async function generateAdaptiveForegrounds() {
  console.log('\n🎨 Generating adaptive foreground images…');
  for (const [folder, canvas] of Object.entries(ADAPTIVE_SIZES)) {
    const dir = join(res, folder);
    ensure(dir);

    // Safe zone = inner 66.67 % of canvas
    const safeZone = Math.round(canvas * (72 / 108));
    // Padding each side to centre the safe zone
    const pad = Math.floor((canvas - safeZone) / 2);

    const foregroundPath = join(dir, 'ic_launcher_foreground.png');

    // Resize icon to safe-zone dimensions, then extend to full 108dp canvas
    await sharp(src)
      .resize(safeZone, safeZone, { fit: 'contain', background: { r: 24, g: 8, b: 40, alpha: 1 } })
      .extend({ top: pad, bottom: pad, left: pad, right: pad,
                background: { r: 24, g: 8, b: 40, alpha: 1 } })
      .png()
      .toFile(foregroundPath);

    console.log(`  ✓ ${folder.padEnd(18)} ${canvas}×${canvas}px  (safe zone: ${safeZone}px)`);
  }
}

// ── 3. Update background colour XML ────────────────────────────────────────
function updateBackgroundColor() {
  console.log('\n🎨 Updating ic_launcher_background.xml…');
  const xmlPath = join(res, 'values', 'ic_launcher_background.xml');
  const content = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BRAND_COLOR}</color>\n</resources>\n`;
  writeFileSync(xmlPath, content, 'utf8');
  console.log(`  ✓ Background colour set to ${BRAND_COLOR}`);
}

// ── 4. Create mipmap-anydpi-v26 adaptive icon XMLs ─────────────────────────
function createAdaptiveIconXmls() {
  console.log('\n📋 Creating mipmap-anydpi-v26 adaptive icon XMLs…');
  const dir = join(res, 'mipmap-anydpi-v26');
  ensure(dir);

  const xml = (round) => `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>\n`;

  writeFileSync(join(dir, 'ic_launcher.xml'),       xml(false), 'utf8');
  writeFileSync(join(dir, 'ic_launcher_round.xml'),  xml(true),  'utf8');
  console.log('  ✓ ic_launcher.xml');
  console.log('  ✓ ic_launcher_round.xml');
}

// ── 5. Remove the old generic vector foreground (no longer needed) ──────────
function removeOldForegroundVector() {
  const old = join(res, 'drawable-v24', 'ic_launcher_foreground.xml');
  if (existsSync(old)) {
    // Leave it but it won't be referenced; adaptive XMLs now point to @mipmap/
    console.log('\n  ℹ️  Old vector foreground left in place (no longer referenced by adaptive icons)');
  }
}

// ── 6. Update public/icon.png for PWA ───────────────────────────────────────
async function updateWebIcon() {
  const webIcon = join(root, 'public', 'icon.png');
  await sharp(src).resize(1024, 1024, { fit: 'cover' }).png().toFile(webIcon);
  console.log('\n  ✓ public/icon.png  1024×1024px  (PWA)');
}

const SMALL_NOTIFICATION_SIZES = {
  'drawable-mdpi': 24,
  'drawable-hdpi': 36,
  'drawable-xhdpi': 48,
  'drawable-xxhdpi': 72,
  'drawable-xxxhdpi': 96,
};

/** White silhouette on transparent — required for Android status-bar icon. */
async function writeWhiteSilhouetteIcon(size, outputPath) {
  const resized = sharp(src).resize(size, size, {
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

async function generateNotificationIcons() {
  console.log('\n🔔 Generating OneSignal / FCM notification icons…');

  for (const [folder, size] of Object.entries(SMALL_NOTIFICATION_SIZES)) {
    const dir = join(res, folder);
    ensure(dir);
    const output = join(dir, 'ic_stat_onesignal_default.png');
    await writeWhiteSilhouetteIcon(size, output);
    console.log(`  ✓ ${folder.padEnd(18)} ic_stat_onesignal_default.png  ${size}×${size}px`);
  }

  const largeDir = join(res, 'drawable-xxxhdpi');
  ensure(largeDir);
  const largePath = join(largeDir, 'ic_onesignal_large_icon_default.png');
  await sharp(src).resize(256, 256, { fit: 'contain', background: { r: 24, g: 8, b: 40, alpha: 1 } }).png().toFile(largePath);
  console.log('  ✓ drawable-xxxhdpi     ic_onesignal_large_icon_default.png  256×256px');
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  await generateFlat();
  await generateAdaptiveForegrounds();
  updateBackgroundColor();
  createAdaptiveIconXmls();
  removeOldForegroundVector();
  await updateWebIcon();
  await generateNotificationIcons();
  console.log('\n🎉  All icons generated — icon will render full & unclipped on every Android launcher.\n');
}

main().catch(e => { console.error(e); process.exit(1); });
