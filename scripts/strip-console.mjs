#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const targets = [
  'apps/customer/src',
  'apps/merchant/src',
  'apps/admin/src',
  'packages/shared/src',
  'functions/index.js',
];

const keepErrorIn = new Set([
  'ErrorBoundary.tsx',
  'functions/index.js',
]);

function stripFile(filePath) {
  const base = path.basename(filePath);
  const src = fs.readFileSync(filePath, 'utf8');
  const lines = src.split(/\r?\n/);
  const out = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const isConsole =
      /console\.(log|warn|info|debug)\s*\(/.test(trimmed) ||
      (/console\.error\s*\(/.test(trimmed) && !keepErrorIn.has(base));

    if (isConsole) {
      continue;
    }
    out.push(line);
  }

  const next = out.join('\n');
  if (next !== src) {
    fs.writeFileSync(filePath, next);
    return true;
  }
  return false;
}

function walk(dir, changed) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, changed);
    } else if (/\.(tsx?|jsx?|js)$/.test(entry.name)) {
      if (stripFile(full)) changed.push(full);
    }
  }
}

const changed = [];
for (const rel of targets) {
  const full = path.join(root, rel);
  if (fs.statSync(full).isFile()) {
    if (stripFile(full)) changed.push(full);
  } else {
    walk(full, changed);
  }
}

console.log(`Stripped console statements from ${changed.length} files.`);
