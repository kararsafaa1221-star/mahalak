const fs = require('fs');
const file = 'src/views/Merchant/MerchantApp.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace backgrounds
content = content.replace(/bg-slate-800/g, 'bg-[#9952FF]');
content = content.replace(/bg-slate-900/g, 'bg-[#4D2980]');
content = content.replace(/bg-slate-950/g, 'bg-[#4D2980]');
content = content.replace(/from-slate-900 to-slate-950/g, 'from-[#4D2980] to-[#381a66]');

// Replace hover backgrounds
content = content.replace(/hover:bg-slate-800/g, 'hover:bg-[#8040DF]');
content = content.replace(/hover:bg-slate-900/g, 'hover:bg-[#381a66]');

// Replace borders matching new colors
content = content.replace(/border-slate-800/g, 'border-[#9952FF]');
content = content.replace(/border-slate-900/g, 'border-[#4D2980]');

// Also change icons/text that should be primary (e.g. active tab text in mobile, maybe not all text)
// A common pattern: text-slate-800 for active state, wait, text-slate-800 is used for ALL headings. We don't want all headings to be purple.
// So let's leave text-slate-800 alone.

fs.writeFileSync(file, content);
console.log('Done coloring MerchantApp!');
