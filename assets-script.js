const fs = require('fs'); fs.mkdirSync('assets', { recursive: true }); fs.copyFileSync('public/icon.png', 'assets/logo.png');
