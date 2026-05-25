const fs = require('fs');
const file = 'd:/Project/Travel Go/js/store.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Add currentTenantId variable
content = content.replace(
  'let data = loadData();\n  saveData(data); // Simpan perubahan migrasi jika ada\n\n  async function initFirebase() {',
  `let data = loadData();\n  saveData(data); // Simpan perubahan migrasi jika ada\n\n  let currentTenantId = null;\n  function setCurrentTenantId(id) { currentTenantId = id; }\n  function getTenantId() { return currentTenantId; }\n\n  async function initFirebase() {`
);

// 2. Modify initFirebase logic
// Replace db.collection('settings') with db.collection('companies').doc(currentTenantId).collection('settings')
content = content.replace(/db\.collection\('settings'\)/g, "db.collection('companies').doc(currentTenantId).collection('settings')");

// Replace db.collection(coll) with db.collection('companies').doc(currentTenantId).collection(coll)
// Note: We only want to replace db.collection(coll) inside the loops.
content = content.replace(/db\.collection\(coll\)/g, "db.collection('companies').doc(currentTenantId).collection(coll)");

// Add condition for SUPERADMIN
content = content.replace(
  `const collections = ['flights', 'hotels', 'rentals', 'tours', 'invoices', 'refunds', 'journals', 'expenses', 'payments', 'customers', 'vendors', 'airlines', 'airports', 'coa', 'users', 'fraudLogs'];\n\n    try {`,
  `const collections = ['flights', 'hotels', 'rentals', 'tours', 'invoices', 'refunds', 'journals', 'expenses', 'payments', 'customers', 'vendors', 'airlines', 'airports', 'coa', 'users', 'fraudLogs'];\n\n    if (!currentTenantId) return false;\n    if (currentTenantId === 'SUPERADMIN') return true; // Super admin handles its own queries\n\n    try {`
);

// 3. Modify generateCode's Firebase update
content = content.replace(
  `TMS.Firebase.getDB().collection('settings').doc('counters').set(data.counters).catch(console.error);`,
  `TMS.Firebase.getDB().collection('companies').doc(currentTenantId).collection('settings').doc('counters').set(data.counters).catch(console.error);`
);

// 4. Modify S.save and S.add and S.update and S.remove to use currentTenantId
// They use window.TMS.Firebase.getDB().collection(key).doc(...)
content = content.replace(/TMS\.Firebase\.getDB\(\)\.collection\(key\)/g, "TMS.Firebase.getDB().collection('companies').doc(currentTenantId).collection(key)");
content = content.replace(/TMS\.Firebase\.getDB\(\)\.collection\(collectionName\)/g, "TMS.Firebase.getDB().collection('companies').doc(currentTenantId).collection(collectionName)");

// 5. Expose setCurrentTenantId and getTenantId
content = content.replace(
  `return { getAll, getById, add, update, remove, save, generateCode, generateId, formatCurrency, formatDate, getCOA, getCOAByCode, calculatePeriodBalances, recalculateCOA, getSettings, setSettings, getUsers, setCurrentUser, getCurrentUser, initFirebase };`,
  `return { getAll, getById, add, update, remove, save, generateCode, generateId, formatCurrency, formatDate, getCOA, getCOAByCode, calculatePeriodBalances, recalculateCOA, getSettings, setSettings, getUsers, setCurrentUser, getCurrentUser, initFirebase, setCurrentTenantId, getTenantId };`
);

fs.writeFileSync(file, content);
console.log('Store updated for multi-tenant');
