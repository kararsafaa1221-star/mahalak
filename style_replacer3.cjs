const fs = require('fs');
const file = 'src/views/Merchant/MerchantApp.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace violet with slate
content = content.replace(/bg-violet-900/g, 'bg-slate-900');
content = content.replace(/bg-violet-800/g, 'bg-slate-900');
content = content.replace(/bg-violet-700/g, 'bg-slate-800');
content = content.replace(/bg-violet-600/g, 'bg-slate-800');
content = content.replace(/bg-violet-500/g, 'bg-slate-600');
content = content.replace(/bg-violet-400/g, 'bg-slate-400');
content = content.replace(/bg-violet-300/g, 'bg-slate-300');
content = content.replace(/bg-violet-200/g, 'bg-slate-200');
content = content.replace(/bg-violet-100/g, 'bg-slate-100');
content = content.replace(/bg-violet-50/g, 'bg-slate-50');

content = content.replace(/text-violet-900/g, 'text-slate-900');
content = content.replace(/text-violet-800/g, 'text-slate-800');
content = content.replace(/text-violet-700/g, 'text-slate-700');
content = content.replace(/text-violet-600/g, 'text-slate-800'); 
content = content.replace(/text-violet-500/g, 'text-slate-600');
content = content.replace(/text-violet-400/g, 'text-slate-500');
content = content.replace(/text-violet-300/g, 'text-slate-400');
content = content.replace(/text-violet-200/g, 'text-slate-300');
content = content.replace(/text-violet-100/g, 'text-slate-200');
content = content.replace(/text-violet-50/g, 'text-slate-100');

content = content.replace(/border-violet-600/g, 'border-slate-800');
content = content.replace(/border-violet-/g, 'border-slate-');
content = content.replace(/shadow-violet-/g, 'shadow-slate-');
content = content.replace(/ring-violet-/g, 'ring-slate-');
content = content.replace(/from-violet-600/g, 'from-slate-800');
content = content.replace(/from-violet-/g, 'from-slate-');
content = content.replace(/to-violet-/g, 'to-slate-');
content = content.replace(/to-slate-600/g, 'to-slate-800'); // if it was from-violet to-slate

fs.writeFileSync(file, content);
console.log('Done violet replacement!');
