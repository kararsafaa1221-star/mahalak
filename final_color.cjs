const fs = require('fs');

function applyColors(file) {
  if (!fs.existsSync(file)) return;
  let c = fs.readFileSync(file, 'utf8');

  // Replace remaining gradient from/to slate-800, slate-900
  c = c.replace(/from-slate-800/g, 'from-[#4D2980]');
  c = c.replace(/to-slate-800/g, 'to-[#4D2980]');
  c = c.replace(/from-slate-900/g, 'from-[#4D2980]');
  c = c.replace(/to-slate-900/g, 'to-[#4D2980]');
  
  c = c.replace(/from-slate-600/g, 'from-[#4D2980]');
  c = c.replace(/hover:from-slate-700 hover:to-slate-900/g, 'hover:from-[#381a66] hover:to-[#381a66]');
  c = c.replace(/from-slate-900 via-slate-950 to-black/g, 'from-[#4D2980] via-[#381a66] to-[#381a66]');

  fs.writeFileSync(file, c);
}

applyColors('src/views/Customer/CustomerApp.tsx');
applyColors('src/views/Merchant/MerchantApp.tsx');
console.log("Replaced final leftover colors in Customer and Merchant!");
