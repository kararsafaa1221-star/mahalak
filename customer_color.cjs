const fs = require('fs');
const file = 'src/views/Customer/CustomerApp.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace backgrounds
content = content.replace(/bg-indigo-600/g, 'bg-[#9952FF]');
content = content.replace(/bg-indigo-500/g, 'bg-[#9952FF]');
content = content.replace(/bg-indigo-700/g, 'bg-[#4D2980]');
content = content.replace(/bg-indigo-800/g, 'bg-[#4D2980]');
content = content.replace(/bg-indigo-900/g, 'bg-[#4D2980]');
content = content.replace(/bg-indigo-950/g, 'bg-[#4D2980]');
content = content.replace(/bg-indigo-400/g, 'bg-[#b07aff]');
content = content.replace(/bg-indigo-300/g, 'bg-[#cba8ff]');
content = content.replace(/bg-indigo-200/g, 'bg-[#e9daff]');
content = content.replace(/bg-indigo-100/g, 'bg-[#e9daff]');
content = content.replace(/bg-indigo-50/g, 'bg-[#f5eeff]');

content = content.replace(/from-indigo-600/g, 'from-[#9952FF]');
content = content.replace(/from-indigo-900/g, 'from-[#4D2980]');
content = content.replace(/to-indigo-800/g, 'to-[#4D2980]');
content = content.replace(/to-indigo-900/g, 'to-[#4D2980]');

// Replace hover backgrounds
content = content.replace(/hover:bg-indigo-700/g, 'hover:bg-[#4D2980]');
content = content.replace(/hover:bg-indigo-600/g, 'hover:bg-[#8040DF]');
content = content.replace(/hover:bg-indigo-100/g, 'hover:bg-[#e9daff]');
content = content.replace(/hover:bg-indigo-50/g, 'hover:bg-[#f5eeff]');

// Replace text
content = content.replace(/text-indigo-900/g, 'text-[#4D2980]');
content = content.replace(/text-indigo-800/g, 'text-[#4D2980]');
content = content.replace(/text-indigo-700/g, 'text-[#4D2980]');
content = content.replace(/text-indigo-600/g, 'text-[#9952FF]');
content = content.replace(/text-indigo-500/g, 'text-[#9952FF]');
content = content.replace(/text-indigo-400/g, 'text-[#b07aff]');
content = content.replace(/text-indigo-300/g, 'text-[#cba8ff]');
content = content.replace(/text-indigo-200/g, 'text-[#e9daff]');
content = content.replace(/text-indigo-100/g, 'text-[#e9daff]');
content = content.replace(/text-indigo-50/g, 'text-[#f5eeff]');
content = content.replace(/hover:text-indigo-700/g, 'hover:text-[#4D2980]');
content = content.replace(/hover:text-indigo-600/g, 'hover:text-[#9952FF]');
content = content.replace(/hover:text-indigo-800/g, 'hover:text-[#381a66]');

// Replace borders
content = content.replace(/border-indigo-600/g, 'border-[#9952FF]');
content = content.replace(/border-indigo-500/g, 'border-[#9952FF]');
content = content.replace(/border-indigo-400/g, 'border-[#b07aff]');
content = content.replace(/border-indigo-300/g, 'border-[#cba8ff]');
content = content.replace(/border-indigo-200/g, 'border-[#e9daff]');
content = content.replace(/border-indigo-150/g, 'border-[#e9daff]');
content = content.replace(/border-indigo-100/g, 'border-[#e9daff]');
content = content.replace(/border-indigo-50/g, 'border-[#f5eeff]');
content = content.replace(/hover:border-indigo-600/g, 'hover:border-[#9952FF]');
content = content.replace(/hover:border-indigo-300/g, 'hover:border-[#cba8ff]');

// Replace rings and shadows
content = content.replace(/ring-indigo-600/g, 'ring-[#9952FF]');
content = content.replace(/ring-indigo-500/g, 'ring-[#9952FF]');
content = content.replace(/ring-indigo-200/g, 'ring-[#e9daff]');
content = content.replace(/shadow-indigo-500\/50/g, 'shadow-[#9952FF]/50');
content = content.replace(/shadow-indigo-500\/20/g, 'shadow-[#9952FF]/20');
content = content.replace(/shadow-indigo-500/g, 'shadow-[#9952FF]');
content = content.replace(/shadow-indigo-100/g, 'shadow-[#e9daff]');
content = content.replace(/shadow-indigo-200/g, 'shadow-[#e9daff]');

fs.writeFileSync(file, content);
console.log('Customer colors replaced!');
