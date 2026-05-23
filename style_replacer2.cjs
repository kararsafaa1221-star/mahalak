const fs = require('fs');
const file = 'src/views/Merchant/MerchantApp.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/rounded-3xl/g, 'rounded-2xl');
content = content.replace(/rounded-\[2rem\]/g, 'rounded-2xl');
content = content.replace(/rounded-\[1\.5rem\]/g, 'rounded-2xl');

content = content.replace(/border-gray-100/g, 'border-slate-100');
content = content.replace(/bg-gray-50/g, 'bg-slate-50');
content = content.replace(/text-gray-400/g, 'text-slate-400');
content = content.replace(/text-gray-500/g, 'text-slate-500');
content = content.replace(/text-gray-600/g, 'text-slate-600');
content = content.replace(/text-gray-850/g, 'text-slate-800');
content = content.replace(/text-gray-800/g, 'text-slate-800');
content = content.replace(/bg-gray-100/g, 'bg-slate-100');
content = content.replace(/border-gray-200/g, 'border-slate-200');

// Replace the aside class for gradient
content = content.replace(
  'hidden md:flex w-64 bg-slate-950 text-white flex-col sticky top-0 h-screen shadow-xl',
  'hidden md:flex w-64 bg-gradient-to-b from-slate-900 to-slate-950 text-white flex-col sticky top-0 h-screen shadow-2xl transition-all'
);

fs.writeFileSync(file, content);
console.log('Done!');
