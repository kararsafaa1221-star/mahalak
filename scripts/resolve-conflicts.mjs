#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function resolve(content, side) {
  const lines = content.split(/\r?\n/);
  const out = [];
  let mode = 'normal';
  let ours = [];
  let theirs = [];

  for (const line of lines) {
    if (line.startsWith('<<<<<<<')) {
      if (mode !== 'normal') throw new Error('Nested conflict');
      mode = 'ours';
      ours = [];
      theirs = [];
      continue;
    }
    if (line === '=======' && mode === 'ours') {
      mode = 'theirs';
      continue;
    }
    if (line.startsWith('>>>>>>>') && mode === 'theirs') {
      const picked = side === 'theirs' ? theirs : ours;
      if (picked.length) out.push(...picked);
      mode = 'normal';
      continue;
    }
    if (mode === 'ours') ours.push(line);
    else if (mode === 'theirs') theirs.push(line);
    else out.push(line);
  }

  if (mode !== 'normal') throw new Error('Unclosed conflict block');
  return out.join('\n');
}

const allFiles = [
  'vite.config.ts',
  'capacitor.config.ts',
  'server.ts',
  '.env.example',
  'firestore.rules',
  'src/services/otpService.ts',
  'src/lib/pushNotifications.ts',
  'src/lib/firebase.ts',
  'src/context/AppContext.tsx', // removed — use packages/shared/src/context/AppContext.tsx
  'src/constants.ts',
  'src/types.ts',
  'src/utils/date.ts',
  'src/main.tsx',
  'src/App.tsx',
  'src/components/ProductOverlay.tsx',
  'src/components/ImageUploader.tsx',
  'src/views/Merchant/MerchantApp.tsx',
  'src/views/Customer/CustomerApp.tsx',
  'src/views/Admin/AdminPanel.tsx',
];

const theirsFiles = new Set(['firestore.rules']);
let failed = 0;

for (const rel of allFiles) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  const raw = fs.readFileSync(file, 'utf8');
  if (!raw.includes('<<<<<<<')) continue;
  const side = theirsFiles.has(rel) ? 'theirs' : 'ours';
  try {
    const resolved = resolve(raw, side);
    fs.writeFileSync(file, resolved);
    const left = (resolved.match(/<<<<<<</g) || []).length;
    if (left) {
      console.error(`REMAINING ${left} in ${rel}`);
      failed++;
    } else {
      console.log(`OK (${side}): ${rel}`);
    }
  } catch (e) {
    console.error(`FAIL ${rel}: ${e.message}`);
    failed++;
  }
}
process.exit(failed ? 1 : 0);
