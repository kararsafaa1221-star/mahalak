const fs = require('fs');

function applyColors(file) {
  if (!fs.existsSync(file)) return;
  let c = fs.readFileSync(file, 'utf8');

  // Replace blue colors
  c = c.replace(/bg-blue-600/g, 'bg-[#9952FF]');
  c = c.replace(/bg-blue-500/g, 'bg-[#9952FF]');
  c = c.replace(/bg-blue-400/g, 'bg-[#b07aff]');
  c = c.replace(/bg-blue-300/g, 'bg-[#cba8ff]');
  c = c.replace(/bg-blue-200/g, 'bg-[#e9daff]');
  c = c.replace(/bg-blue-100/g, 'bg-[#e9daff]');
  c = c.replace(/bg-blue-50/g, 'bg-[#f5eeff]');
  
  c = c.replace(/text-blue-900/g, 'text-[#4D2980]');
  c = c.replace(/text-blue-800/g, 'text-[#4D2980]');
  c = c.replace(/text-blue-700/g, 'text-[#4D2980]');
  c = c.replace(/text-blue-600/g, 'text-[#9952FF]');
  c = c.replace(/text-blue-500/g, 'text-[#9952FF]');
  c = c.replace(/text-blue-400/g, 'text-[#b07aff]');
  c = c.replace(/text-blue-300/g, 'text-[#cba8ff]');
  c = c.replace(/text-blue-200/g, 'text-[#e9daff]');
  
  c = c.replace(/border-blue-[0-9]+/g, 'border-[#9952FF]');
  c = c.replace(/ring-blue-[0-9]+/g, 'ring-[#9952FF]');
  c = c.replace(/shadow-blue-[0-9]+\/[0-9]+/g, 'shadow-[#9952FF]/50');

  // Replace black/dark colors
  c = c.replace(/text-slate-800/g, 'text-[#4D2980]');
  c = c.replace(/text-slate-900/g, 'text-[#4D2980]');
  c = c.replace(/bg-black/g, 'bg-[#4D2980]');
  c = c.replace(/group-hover:text-slate-900/g, 'group-hover:text-[#4D2980]');
  c = c.replace(/hover:text-slate-800/g, 'hover:text-[#4D2980]');
  c = c.replace(/hover:text-slate-900/g, 'hover:text-[#4D2980]');
  
  // also bg-slate-900 if there's any left
  c = c.replace(/bg-slate-900/g, 'bg-[#4D2980]');

  fs.writeFileSync(file, c);
}

applyColors('src/views/Customer/CustomerApp.tsx');
applyColors('src/views/Merchant/MerchantApp.tsx');
console.log("Replaced blue and black colors in Customer and Merchant!");
