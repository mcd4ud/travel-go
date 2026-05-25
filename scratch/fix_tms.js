const fs = require('fs');
const files = [
  'd:/Project/Travel Go/js/store.js',
  'd:/Project/Travel Go/js/app.js',
  'd:/Project/Travel Go/js/modules/auth.js',
  'd:/Project/Travel Go/js/modules/superadmin.js'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/(?<!window\.)TMS\.Firebase/g, 'window.TMS.Firebase');
    fs.writeFileSync(file, content);
  }
});

console.log('Fixed TMS.Firebase references');
