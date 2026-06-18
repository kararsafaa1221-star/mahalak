#!/usr/bin/env node
/**
 * Upload Wasender credentials to Firebase Functions secrets.
 *
 * 1. Add to functions/.env:
 *    WASENDER_ACCESS_TOKEN=your_token
 *    WASENDER_INSTANCE_ID=your_instance_id
 * 2. Run: node scripts/configure-wasender.mjs
 * 3. Deploy: firebase deploy --only functions:otpRequest,functions:sendWhatsAppMessage
 */
import { existsSync, readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, 'functions/.env');

if (!existsSync(envPath)) {
  console.error('Missing functions/.env — copy .env.example and set Wasender values.');
  process.exit(1);
}

function parseEnv(content) {
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

const vars = parseEnv(readFileSync(envPath, 'utf8'));
const keys = ['WASENDER_ACCESS_TOKEN', 'WASENDER_INSTANCE_ID'];

for (const key of keys) {
  const value = vars[key]?.trim();
  if (!value) {
    console.error(`Missing ${key} in functions/.env`);
    process.exit(1);
  }
  console.log(`Setting secret ${key}...`);
  const result = spawnSync('firebase', ['functions:secrets:set', key], {
    input: value,
    stdio: ['pipe', 'inherit', 'inherit'],
    cwd: root,
    shell: true,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('\nDone. Deploy functions:');
console.log('  firebase deploy --only functions:otpRequest,functions:sendWhatsAppMessage');
