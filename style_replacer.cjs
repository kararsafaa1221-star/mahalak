const fs = require('fs');
const file = 'src/views/Merchant/MerchantApp.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace indigo with slate for the main interactive feel
content = content.replace(/bg-indigo-900/g, 'bg-slate-950');
content = content.replace(/bg-indigo-800/g, 'bg-slate-900');
content = content.replace(/bg-indigo-700/g, 'bg-slate-800');
content = content.replace(/bg-indigo-600/g, 'bg-slate-800');
content = content.replace(/bg-indigo-500/g, 'bg-slate-600');
content = content.replace(/bg-indigo-400/g, 'bg-slate-400');
content = content.replace(/bg-indigo-300/g, 'bg-slate-300');
content = content.replace(/bg-indigo-200/g, 'bg-slate-200');
content = content.replace(/bg-indigo-100/g, 'bg-slate-100');
content = content.replace(/bg-indigo-50/g, 'bg-slate-50');

content = content.replace(/text-indigo-900/g, 'text-slate-900');
content = content.replace(/text-indigo-800/g, 'text-slate-800');
content = content.replace(/text-indigo-700/g, 'text-slate-700');
content = content.replace(/text-indigo-600/g, 'text-slate-800'); // main active text
content = content.replace(/text-indigo-500/g, 'text-slate-600');
content = content.replace(/text-indigo-400/g, 'text-slate-500');
content = content.replace(/text-indigo-300/g, 'text-slate-400');
content = content.replace(/text-indigo-200/g, 'text-slate-300');
content = content.replace(/text-indigo-100/g, 'text-slate-200');
content = content.replace(/text-indigo-50/g, 'text-slate-100');

content = content.replace(/border-indigo-600/g, 'border-slate-800');
content = content.replace(/border-indigo-/g, 'border-slate-');
content = content.replace(/shadow-indigo-/g, 'shadow-slate-');
content = content.replace(/ring-indigo-/g, 'ring-slate-');
content = content.replace(/from-indigo-/g, 'from-slate-');
content = content.replace(/to-indigo-/g, 'to-slate-');

fs.writeFileSync(file, content);
console.log('Done!');
