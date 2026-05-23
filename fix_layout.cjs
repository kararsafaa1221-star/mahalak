const fs = require('fs');
const file = 'src/views/Merchant/MerchantApp.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<aside className="hidden md:flex w-64 bg-gradient-to-b from-slate-900 to-slate-950 text-white flex-col sticky top-0 h-screen shadow-2xl transition-all">',
  '<aside className="hidden md:flex w-64 bg-gradient-to-b from-slate-900 to-slate-950 text-white flex-col fixed right-0 top-0 h-screen z-30 shadow-2xl transition-all">'
);

content = content.replace(
  '<main className="flex-1 md:mr-64 p-4 md:p-8 pb-24 md:pb-8 text-right">',
  '<main className="flex-1 min-w-0 md:mr-64 p-4 md:p-6 lg:p-8 pb-24 md:pb-8 text-right w-full overflow-x-hidden">'
);

// Orders tab 
// Ensure table / grids are wrapped up and truncate text.
// Replace the flex containers inside orders if needed.

fs.writeFileSync(file, content);
console.log('Fixed main layout!');
