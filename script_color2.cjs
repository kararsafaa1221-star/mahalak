const fs = require('fs');
const files = ['src/views/Merchant/MerchantApp.tsx', 'src/views/Admin/AdminPanel.tsx', 'src/views/Customer/CustomerApp.tsx'];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
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

  fs.writeFileSync(file, content);
});
console.log('Done coloring all apps!');
