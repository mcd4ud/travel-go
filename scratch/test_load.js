const vm = require('vm');
const fs = require('fs');

const context = {
  window: { location: { hash: '' }, addEventListener: () => {}, scrollTo: () => {}, document: { querySelectorAll: () => [], getElementById: () => ({}), querySelector: () => ({}) } },
  document: { querySelectorAll: () => [], getElementById: () => ({}), querySelector: () => ({}) },
  setTimeout: setTimeout,
  console: console
};
context.window.TMS = context.TMS = {};
vm.createContext(context);

const files = [
  'js/store.js',
  'js/modules/auth.js',
  'js/modules/superadmin.js',
  'js/app.js'
];

try {
  files.forEach(file => {
    console.log('Loading', file);
    const code = fs.readFileSync('d:/Project/Travel Go/' + file, 'utf8');
    vm.runInContext(code, context, { filename: file });
  });
  console.log('All loaded successfully');
} catch(e) {
  console.error(e);
}
