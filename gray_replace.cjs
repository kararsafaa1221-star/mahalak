const fs = require('fs');

function applyColors(file) {
  if (!fs.existsSync(file)) return;
  let c = fs.readFileSync(file, 'utf8');

  // Replace gray/zinc/neutral colors
  c = c.replace(/gray-800/g, '[#4D2980]');
  c = c.replace(/gray-900/g, '[#4D2980]');
  c = c.replace(/zinc-800/g, '[#4D2980]');
  c = c.replace(/zinc-900/g, '[#4D2980]');
  c = c.replace(/neutral-800/g, '[#4D2980]');
  c = c.replace(/neutral-900/g, '[#4D2980]');
  
  c = c.replace(/bg-gray-800/g, 'bg-[#4D2980]');
  c = c.replace(/bg-gray-900/g, 'bg-[#4D2980]');
  c = c.replace(/text-gray-800/g, 'text-[#4D2980]');
  c = c.replace(/text-gray-900/g, 'text-[#4D2980]');

  fs.writeFileSync(file, c);
}

applyColors('src/views/Customer/CustomerApp.tsx');
applyColors('src/views/Merchant/MerchantApp.tsx');
console.log("Replaced gray/zinc/neutral colors in Customer and Merchant!");
