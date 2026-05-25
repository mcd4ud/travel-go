const fs = require('fs');
const file = 'd:/Project/Travel Go/js/store.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Add currentTenantId and getDbRef
content = content.replace(
  'let data = loadData();\n  saveData(data); // Simpan perubahan migrasi jika ada\n\n  async function initFirebase() {',
  `let data = loadData();\n  saveData(data); // Simpan perubahan migrasi jika ada\n\n  let currentTenantId = null;\n  function setCurrentTenantId(id) { currentTenantId = id; }\n  function getTenantId() { return currentTenantId; }\n\n  function getDbRef(collectionName) {\n    const db = window.TMS && window.TMS.Firebase ? window.TMS.Firebase.getDB() : null;\n    if (!db) return null;\n    if (collectionName === 'users' || collectionName === 'companies' || collectionName === 'fraudLogs') return db.collection(collectionName);\n    if (!currentTenantId) return null;\n    if (currentTenantId === 'SUPERADMIN') return db.collection(collectionName);\n    return db.collection('companies').doc(currentTenantId).collection(collectionName);\n  }\n\n  async function initFirebase() {`
);

// 2. Replace db.collection inside initFirebase
// Replace db.collection('settings')
content = content.replace(/db\.collection\('settings'\)/g, "getDbRef('settings')");
// Replace db.collection(coll)
content = content.replace(/db\.collection\(coll\)/g, "getDbRef(coll)");

// 3. Replace all manual TMS.Firebase.getDB().collection(...)
content = content.replace(/TMS\.Firebase\.getDB\(\)\.collection/g, "getDbRef");

// Replace await db.collection -> await getDbRef
// wait, the regex replaced `await db.collection('settings')` but `db.collection` was ALREADY replaced by `getDbRef`
// So it actually became `await getDbRef('settings')` directly from step 2!
// I don't need step 4 for `await getDbRef` if I just rely on step 2.

// 4. Update the exports
content = content.replace(
  `    initFirebase\n  };\n})();`,
  `    initFirebase,\n    setCurrentTenantId, getTenantId\n  };\n})();`
);

// We need to fix the case where initFirebase is called without auth.
content = content.replace(
  `const collections = ['flights', 'hotels', 'rentals', 'tours', 'invoices', 'refunds', 'journals', 'expenses', 'payments', 'customers', 'vendors', 'airlines', 'airports', 'coa', 'users', 'fraudLogs'];\n\n    try {`,
  `const collections = ['flights', 'hotels', 'rentals', 'tours', 'invoices', 'refunds', 'journals', 'expenses', 'payments', 'customers', 'vendors', 'airlines', 'airports', 'coa', 'users', 'fraudLogs'];\n\n    if (!currentTenantId) return false;\n\n    try {`
);

fs.writeFileSync(file, content);
console.log('Store updated cleanly v2');
