const fs = require('fs');
const files = ['src/views/Merchant/MerchantApp.tsx', 'src/views/Admin/AdminPanel.tsx', 'src/views/Customer/CustomerApp.tsx'];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Change active tab text to primary
  content = content.replace(/\? "text-slate-800" :/g, '? "text-[#9952FF]" :');
  content = content.replace(/\? 'text-slate-800'/g, "? 'text-[#9952FF]'");
  
  // Replace hover:text-slate-800 with hover:text primary for buttons
  content = content.replace(/hover:text-slate-800/g, 'hover:text-[#9952FF]');

  fs.writeFileSync(file, content);
});
console.log('Done coloring active text!');
