import fs from 'fs';
import path from 'path';

const roots = [
  'apps/customer/src',
  'apps/merchant/src',
  'packages/shared/src/components',
];

const replacements = [
  ['bg-[#9952FF]', 'bg-vibrant-purple'],
  ['hover:bg-[#9952FF]', 'hover:bg-violet'],
  ['hover:bg-[#8746e6]', 'hover:bg-violet'],
  ['hover:bg-[#8640E6]', 'hover:bg-violet'],
  ['hover:bg-[#853df2]', 'hover:bg-violet'],
  ['hover:bg-[#7A3FE3]', 'hover:bg-violet'],
  ['hover:bg-[#6824f5]', 'hover:bg-violet'],
  ['text-[#9952FF]', 'text-vibrant-purple'],
  ['text-[#7B3DFF]', 'text-vibrant-purple'],
  ['border-[#9952FF]', 'border-vibrant-purple'],
  ['border-t-[#9952FF]', 'border-t-vibrant-purple'],
  ['ring-[#9952FF]', 'ring-vibrant-purple'],
  ['focus:ring-[#9952FF]', 'focus:ring-vibrant-purple'],
  ['focus:border-[#9952FF]', 'focus:border-vibrant-purple'],
  ['focus-within:border-[#9952FF]', 'focus-within:border-vibrant-purple'],
  ['from-[#4D2980]', 'from-vibrant-purple'],
  ['to-[#381a66]', 'to-deep-navy'],
  ['to-[#7A3FE3]', 'to-violet'],
  ['from-[#7A3FE3]', 'from-vibrant-purple'],
  ['bg-[#7B3DFF]', 'bg-vibrant-purple'],
  ['bg-[#e9daff]', 'bg-violet/20'],
  ['bg-[#f5eeff]', 'bg-violet/10'],
  ['border-[#e9daff]', 'border-violet/25'],
  ['border-[#f5eeff]', 'border-violet/15'],
  ['shadow-[#e9daff]', 'shadow-violet/20'],
  ['shadow-[#9952FF]', 'shadow-vibrant-purple/25'],
  ['text-[#4D2980]', 'text-violet'],
  ['text-[#7A3FE3]', 'text-vibrant-purple'],
  ['selection:bg-[#e9daff] selection:text-[#4D2980]', 'selection:bg-violet/30 selection:text-violet'],
  ['bg-slate-950', 'bg-deep-navy'],
  ['min-h-screen bg-slate-100', 'min-h-screen bg-deep-navy'],
  ['bg-gradient-to-b from-[#4D2980] to-[#381a66]', 'bg-gradient-to-b from-vibrant-purple to-deep-navy'],
  ['bg-gradient-to-l from-[#4D2980] to-[#381a66]', 'bg-gradient-to-l from-vibrant-purple to-deep-navy'],
  ['bg-gradient-to-br from-[#4D2980] to-[#7A3FE3]', 'bg-gradient-to-br from-vibrant-purple to-violet'],
  ['bg-[#4D2980]', 'bg-deep-navy'],
  ['#9952FF', '#7B3DFF'],
  ['#7A3FE3', '#B18CFF'],
  ['#4D2980', '#0B1320'],
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx|ts|css)$/.test(entry.name)) files.push(full);
  }
  return files;
}

let changed = 0;
for (const root of roots) {
  for (const file of walk(path.resolve(root))) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    for (const [from, to] of replacements) {
      content = content.split(from).join(to);
    }
    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      changed++;
      console.log('updated', path.relative(process.cwd(), file));
    }
  }
}

console.log(`\nDone. ${changed} file(s) updated.`);
