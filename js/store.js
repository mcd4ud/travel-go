/* ========================================
   TMS - Data Store (localStorage)
   ======================================== */
window.TMS = window.TMS || {};
const TMS = window.TMS;

TMS.Store = (() => {
  const STORAGE_KEY = 'tms_data';

  const DEFAULT_COA = [
    { code: '1-1000', name: 'Kas', type: 'asset', balance: 0, isDefault: true },
    { code: '1-1001', name: 'Bank', type: 'asset', balance: 0, isDefault: true },
    { code: '1-1002', name: 'Kas Kasir', type: 'asset', balance: 0, isDefault: true },
    { code: '1-1100', name: 'Piutang Usaha', type: 'asset', balance: 0, isDefault: true },
    { code: '1-1200', name: 'Piutang Lain-lain', type: 'asset', balance: 0, isDefault: false },
    { code: '2-2000', name: 'Utang Usaha', type: 'liability', balance: 0, isDefault: true },
    { code: '2-2100', name: 'Utang Pajak', type: 'liability', balance: 0, isDefault: false },
    { code: '2-2200', name: 'Utang Lain-lain', type: 'liability', balance: 0, isDefault: false },
    { code: '3-3000', name: 'Modal Disetor', type: 'equity', balance: 0, isDefault: true },
    { code: '3-3100', name: 'Laba Ditahan', type: 'equity', balance: 0, isDefault: true },
    { code: '4-4000', name: 'Pendapatan Tiket Pesawat', type: 'revenue', balance: 0, isDefault: true },
    { code: '4-4100', name: 'Pendapatan Voucher Hotel', type: 'revenue', balance: 0, isDefault: true },
    { code: '4-4200', name: 'Pendapatan Rental Mobil', type: 'revenue', balance: 0, isDefault: true },
    { code: '4-4300', name: 'Pendapatan Paket Wisata', type: 'revenue', balance: 0, isDefault: true },
    { code: '4-4400', name: 'Pendapatan Lain-lain', type: 'revenue', balance: 0, isDefault: false },
    { code: '5-5000', name: 'BPP Tiket Pesawat', type: 'cogs', balance: 0, isDefault: true },
    { code: '5-5100', name: 'BPP Voucher Hotel', type: 'cogs', balance: 0, isDefault: true },
    { code: '5-5200', name: 'BPP Rental Mobil', type: 'cogs', balance: 0, isDefault: true },
    { code: '5-5300', name: 'BPP Paket Wisata', type: 'cogs', balance: 0, isDefault: true },
    { code: '6-6000', name: 'Beban Gaji', type: 'expense', balance: 0, isDefault: false },
    { code: '6-6100', name: 'Beban Sewa Kantor', type: 'expense', balance: 0, isDefault: false },
    { code: '6-6200', name: 'Beban Utilitas', type: 'expense', balance: 0, isDefault: false },
    { code: '6-6300', name: 'Beban Pemasaran', type: 'expense', balance: 0, isDefault: false },
    { code: '6-6400', name: 'Beban Administrasi', type: 'expense', balance: 0, isDefault: false },
    { code: '6-6500', name: 'Beban Penyusutan', type: 'expense', balance: 0, isDefault: false },
    { code: '6-6900', name: 'Beban Operasional Lain', type: 'expense', balance: 0, isDefault: false },
    { code: '1-1300', name: 'Deposit Vendor', type: 'asset', balance: 0, isDefault: true },
  ];

  function getDefaultData() {
    return {
      flights: [],
      hotels: [],
      rentals: [],
      tours: [],
      invoices: [],
      refunds: [],
      db_hotels: [],
      db_rentals: [],
      coa: [...DEFAULT_COA],
      journals: [],
      expenses: [],
      payments: [],
      customers: [],
      vendors: [],
      airlines: [],
      airports: [],
      vendor_deposits: [],
      fraudLogs: [],
      payment_banks: [],
      users: [
        { id: 'u1', username: 'admin', password: '123', name: 'Power User', role: 'admin', permissions: ['all'] }
      ],
      currentUser: null,
      settings: { companyName: 'PT. Travela Nusantara', companyAddress: 'Jl. Sudirman No.123, Jakarta 10220', companyPhone: '(021) 555-1234', companyEmail: 'info@travelanusantara.co.id', taxEnabled: true, taxRate: 11 },
      counters: { flight: 0, hotel: 0, rental: 0, tour: 0, invoice: 0, refund: 0, journal: 0, expense: 0, payment: 0, customer: 0, vendor: 0, airline: 0, airport: 0, db_hotel: 0, db_rental: 0, user: 1 }
    };
  }

  function loadData() {
    try {
      let raw = null;
      // 1. Coba ambil data dari file PC melalui Local Server (Synchronous request)
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', '/api/data', false); // false = synchronous
        xhr.send(null);
        if (xhr.status === 200 && xhr.responseText && xhr.responseText.length > 5) {
          raw = xhr.responseText;
        }
      } catch (err) {
        console.warn('Local server API tidak tersedia, beralih ke localStorage browser.');
      }

      // 2. Jika server gagal/kosong, ambil dari localStorage (backup)
      if (!raw) {
        raw = localStorage.getItem(STORAGE_KEY);
      }

      if (!raw) return getDefaultData();

      const data = JSON.parse(raw);
      // merge defaults for missing keys
      const defaults = getDefaultData();
      let changed = false;

      for (const key in defaults) {
        if (!(key in data)) {
          data[key] = defaults[key];
          changed = true;
        }
      }
      
      // Ensure all default COA accounts exist
      defaults.coa.forEach(defAcc => {
        if (!data.coa.find(a => a.code === defAcc.code)) {
          data.coa.push(defAcc);
          changed = true;
        }
      });

      // Sync counters
      for (const key in defaults.counters) {
        if (!(key in data.counters)) {
          data.counters[key] = defaults.counters[key];
          changed = true;
        }
      }

      // Initialize airlines/airports from data files if empty
      if (data.airlines.length === 0 && typeof TMS_AIRLINES !== 'undefined') {
        data.airlines = TMS_AIRLINES.map(a => ({
          ...a,
          id: 'air-' + Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString()
        }));
        changed = true;
      }
      if (data.airports.length === 0 && typeof TMS_AIRPORTS !== 'undefined') {
        data.airports = TMS_AIRPORTS.map(a => ({
          ...a,
          id: 'apt-' + Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString()
        }));
        changed = true;
      }

      if (changed) {
        // We don't call saveData(data) directly here because it might trigger 
        // another load/save cycle depending on implementation. 
        // But we should ensure the data is consistent.
      }

      syncVendorSubAccounts(data);

      return data;
    } catch (e) {
      console.error('Store load error:', e);
      return getDefaultData();
    }
  }

  function saveData(data) {
    try {
      syncVendorSubAccounts(data);
      // 1. Simpan ke localStorage sebagai backup (sama seperti sebelumnya)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      // 2. Kirim data ke Local Server untuk disimpan permanen ke dalam file PC
      fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }).catch(err => console.error('Gagal menyimpan ke penyimpanan PC:', err));

    } catch (e) {
      console.error('Store save error:', e);
    }
  }

  let data = loadData();
  saveData(data); // Simpan perubahan migrasi jika ada

  let currentTenantId = null;
  function setCurrentTenantId(id) { currentTenantId = id; }
  function getTenantId() { return currentTenantId; }

  function getDbRef(collectionName) {
    const db = window.TMS && window.TMS.Firebase ? window.TMS.Firebase.getDB() : null;
    if (!db) return null;
    if (collectionName === 'users' || collectionName === 'companies' || collectionName === 'fraudLogs') return db.collection(collectionName);
    if (!currentTenantId) return null;
    if (currentTenantId === 'SUPERADMIN') return db.collection(collectionName);
    return db.collection('companies').doc(currentTenantId).collection(collectionName);
  }

  function getQueryRef(collectionName) {
    let ref = getDbRef(collectionName);
    if (!ref) return null;
    if (collectionName === 'users' && currentTenantId && currentTenantId !== 'SUPERADMIN') {
      return ref.where('tenantId', '==', currentTenantId);
    }
    return ref;
  }

  async function initFirebase() {
    const db = window.TMS && window.TMS.Firebase ? window.TMS.Firebase.getDB() : null;
    if (!db) return false;

    const collections = ['flights', 'hotels', 'rentals', 'tours', 'invoices', 'refunds', 'journals', 'expenses', 'payments', 'customers', 'vendors', 'airlines', 'airports', 'coa', 'users', 'fraudLogs'];

    if (!currentTenantId) return false;

    try {
      const snap = await getDbRef('settings').doc('config').get();
      if (!snap.exists) {
        console.log('Firebase kosong. Melakukan sinkronisasi data lokal ke cloud...');
        await getDbRef('settings').doc('config').set(data.settings || {});
        await getDbRef('settings').doc('counters').set(data.counters || {});
        
        for (const coll of collections) {
          if (data[coll] && data[coll].length > 0) {
            const batch = db.batch();
            data[coll].forEach(item => {
              if (!item.id) item.id = item.code || generateId();
              const docRef = getDbRef(coll).doc(item.id);
              batch.set(docRef, item);
            });
            await batch.commit();
          }
        }
        console.log('Sinkronisasi selesai.');
      } else {
        console.log('Memuat data cloud ke memori...');
        data.settings = snap.data();
        const cntSnap = await getDbRef('settings').doc('counters').get();
        if (cntSnap.exists) data.counters = cntSnap.data();
        
        for (const coll of collections) {
          const qRef = getQueryRef(coll);
          if (qRef) {
            const colSnap = await qRef.get();
            data[coll] = colSnap.docs.map(d => d.data());
          }
        }
        saveData(data);
      }
      
      // Setup realtime listeners
      collections.forEach(coll => {
        const qRef = getQueryRef(coll);
        if (qRef) {
          qRef.onSnapshot(snapshot => {
            data[coll] = snapshot.docs.map(d => d.data());
          });
        }
      });
      
      getDbRef('settings').doc('counters').onSnapshot(snap => {
        if (snap.exists) data.counters = snap.data();
      });
      getDbRef('settings').doc('config').onSnapshot(snap => {
        if (snap.exists) data.settings = snap.data();
      });
      
      return true;
    } catch(e) {
      console.error('Firebase Error:', e);
      return false;
    }
  }

  function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 6); }

  function generateCode(prefix) {
    data.counters[prefix] = (data.counters[prefix] || 0) + 1;
    saveData(data);
    if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) {
        getDbRef('settings').doc('counters').set(data.counters).catch(console.error);
    }
    const num = String(data.counters[prefix]).padStart(5, '0');
    const prefixMap = { flight: 'FLT', hotel: 'HTL', rental: 'RNT', tour: 'TOR', invoice: 'INV', refund: 'RFD', journal: 'JRN', expense: 'EXP', customer: 'CST', vendor: 'VND', db_hotel: 'DBH', db_rental: 'DBR' };
    return `${prefixMap[prefix] || prefix.toUpperCase()}-${num}`;
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // CRUD helpers
  function getAll(collection) { return data[collection] || []; }
  function getById(collection, id) { return (data[collection] || []).find(item => item.id === id); }

  function add(collection, item) {
    item.id = item.id || generateId();
    item.createdAt = item.createdAt || new Date().toISOString();
    data[collection].push(item);
    saveData(data);
    if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) {
       getDbRef(collection).doc(item.id).set(item).catch(console.error);
    }
    return item;
  }

  function update(collection, id, updates) {
    const idx = data[collection].findIndex(item => item.id === id);
    if (idx === -1) return null;
    data[collection][idx] = { ...data[collection][idx], ...updates, updatedAt: new Date().toISOString() };
    saveData(data);
    if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) {
       getDbRef(collection).doc(id).update(updates).catch(console.error);
    }
    return data[collection][idx];
  }

  function remove(collection, id) {
    data[collection] = data[collection].filter(item => item.id !== id);
    saveData(data);
    if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) {
       getDbRef(collection).doc(id).delete().catch(console.error);
    }
  }

  // COA
  function getCOA() { return data.coa; }
  function getCOAByType(type) { return data.coa.filter(a => a.type === type); }
  function getCOAByCode(code) { return data.coa.find(a => a.code === code); }
  function addCOA(account) { 
    if (!account.id) account.id = account.code || generateId();
    data.coa.push(account); 
    saveData(data); 
    if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) getDbRef('coa').doc(account.id).set(account).catch(console.error);
  }
  function updateCOA(code, updates) {
    const idx = data.coa.findIndex(a => a.code === code);
    if (idx !== -1) { 
      data.coa[idx] = { ...data.coa[idx], ...updates }; 
      saveData(data); 
      if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) getDbRef('coa').doc(data.coa[idx].id || code).update(updates).catch(console.error);
    }
  }
  function removeCOA(code) {
    const acc = data.coa.find(a => a.code === code);
    const id = acc ? (acc.id || code) : code;
    data.coa = data.coa.filter(a => a.code !== code);
    saveData(data);
    if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) getDbRef('coa').doc(id).delete().catch(console.error);
  }

  // Update COA balance
  function updateCOABalance(code, amount) {
    const acc = data.coa.find(a => a.code === code);
    if (acc) { 
      acc.balance = (acc.balance || 0) + amount; 
      saveData(data); 
      if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) getDbRef('coa').doc(acc.id || code).update({ balance: acc.balance }).catch(console.error);
    }
  }

  function syncVendorSubAccounts(targetData) {
    const d = targetData || data;
    if (!d) return;
    (d.vendors || []).forEach((v, index) => {
      if (!v.vendorCode) {
        const num = String(index + 1).padStart(5, '0');
        v.vendorCode = `VND-${num}`;
      }
      
      const suffix = (v.vendorCode || '').split('-')[1] || String(index + 1).padStart(5, '0');
      const subCode = `1-1300-${suffix}`;
      const subName = `Deposit Vendor ${v.name}`;
      
      const exists = d.coa.find(a => a.code === subCode);
      if (!exists) {
        d.coa.push({
          code: subCode,
          name: subName,
          type: 'asset',
          balance: 0,
          isDefault: false
        });
      } else {
        exists.name = subName;
      }
    });
  }

  // Recalculate all COA balances from journals
  function recalculateCOA(startDate, endDate) {
    syncVendorSubAccounts(data);
    data.coa.forEach(a => a.balance = 0);
    data.journals.forEach(j => {
      if (startDate && j.date < startDate) return;
      if (endDate && j.date > endDate) return;
      (j.entries || []).forEach(e => {
        const acc = data.coa.find(a => a.code === e.accountCode);
        if (!acc) return;
        if (['asset', 'cogs', 'expense'].includes(acc.type)) {
          acc.balance += (e.debit || 0) - (e.credit || 0);
        } else {
          acc.balance += (e.credit || 0) - (e.debit || 0);
        }
      });
    });

    // Sync sub-accounts balances back to vendor records
    (data.vendors || []).forEach(v => {
      const suffix = (v.vendorCode || '').split('-')[1] || '001';
      const subCode = `1-1300-${suffix}`;
      const acc = data.coa.find(a => a.code === subCode);
      if (acc) {
        v.balance = acc.balance;
      }
    });

    saveData(data);
  }

  // Calculate balances for a specific period without modifying the main store
  function calculatePeriodBalances(startDate, endDate, asOfEndDate = false) {
    syncVendorSubAccounts(data);
    const periodCOA = JSON.parse(JSON.stringify(data.coa));
    periodCOA.forEach(a => a.balance = 0);
    data.journals.forEach(j => {
      if (!asOfEndDate && startDate && j.date < startDate) return;
      if (endDate && j.date > endDate) return;
      (j.entries || []).forEach(e => {
        const acc = periodCOA.find(a => a.code === e.accountCode);
        if (!acc) return;
        if (['asset', 'cogs', 'expense'].includes(acc.type)) {
          acc.balance += (e.debit || 0) - (e.credit || 0);
        } else {
          acc.balance += (e.credit || 0) - (e.debit || 0);
        }
      });
    });
    return periodCOA;
  }

  function getSettings() { return data.settings; }
  async function updateSettings(s) { 
    data.settings = { ...data.settings, ...s }; 
    saveData(data); 
    if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) {
      try {
        await getDbRef('settings').doc('config').set(data.settings);
      } catch (err) {
        console.error("Firebase updateSettings error:", err);
        alert("Gagal menyimpan ke database online. Pastikan koneksi internet stabil dan Database Firebase sudah diaktifkan. Error: " + err.message);
      }
    }
  }

  function clearAllData() {
    data.flights = [];
    data.hotels = [];
    data.rentals = [];
    data.tours = [];
    data.invoices = [];
    data.journals = [];
    data.expenses = [];
    data.payments = [];
    data.customers = [];
    data.fraudLogs = [];
    data.counters = { flight: 0, hotel: 0, rental: 0, tour: 0, invoice: 0, journal: 0, expense: 0, payment: 0, customer: 0 };
    recalculateCOA();
    saveData(data);
  }

  function resetData() { data = getDefaultData(); saveData(data); }

  // Dashboard stats
  function getStats() {
    const flights = data.flights || [];
    const hotels = data.hotels || [];
    const rentals = data.rentals || [];
    const tours = data.tours || [];
    const invoices = data.invoices || [];

    const totalRevenue = [...flights, ...hotels, ...rentals, ...tours].reduce((s, b) => s + (b.sellingPrice || 0), 0);
    const totalCost = [...flights, ...hotels, ...rentals, ...tours].reduce((s, b) => s + (b.costPrice || 0), 0);
    const paidInvoices = invoices.filter(i => i.paymentStatus === 'paid');
    const unpaidInvoices = invoices.filter(i => i.paymentStatus === 'unpaid');

    return {
      totalFlights: flights.length,
      totalHotels: hotels.length,
      totalRentals: rentals.length,
      totalTours: tours.length,
      totalInvoices: invoices.length,
      totalRevenue,
      totalCost,
      grossProfit: totalRevenue - totalCost,
      paidCount: paidInvoices.length,
      unpaidCount: unpaidInvoices.length,
      paidAmount: paidInvoices.reduce((s, i) => s + (i.total || 0), 0),
      unpaidAmount: unpaidInvoices.reduce((s, i) => s + (i.total || 0), 0),
    };
  }

  // ---- SECURITY UTILITIES ----
  // Tokenization: replace sensitive values with non-reversible tokens
  function tokenize(value) {
    if (!value) return null;
    const hash = Array.from(String(value)).reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0);
    return 'TKN-' + Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  }

  // Simple symmetric "encryption" for localStorage data (XOR + base64)
  function encryptPayload(obj) {
    const key = 'TMS-SEC-256';
    const str = JSON.stringify(obj);
    const enc = Array.from(str).map((c, i) =>
      String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join('');
    return btoa(unescape(encodeURIComponent(enc)));
  }

  function decryptPayload(token) {
    try {
      const key = 'TMS-SEC-256';
      const dec = decodeURIComponent(escape(atob(token)));
      const plain = Array.from(dec).map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))
      ).join('');
      return JSON.parse(plain);
    } catch { return null; }
  }

  // ---- FRAUD DETECTION ENGINE ----
  function runFraudCheck(payment) {
    const flags = [];
    const now = Date.now();
    const recentPayments = (data.payments || []).filter(p =>
      now - new Date(p.createdAt).getTime() < 3600000 // last 1 hour
    );
    // Rule 1: High-value transaction (> Rp 50 juta)
    if ((payment.amount || 0) > 50000000) flags.push({ rule: 'HIGH_VALUE', msg: 'Transaksi melebihi Rp 50.000.000' });
    // Rule 2: Too many transactions in short time (> 10 per hour)
    if (recentPayments.length >= 10) flags.push({ rule: 'HIGH_FREQUENCY', msg: 'Lebih dari 10 transaksi dalam 1 jam' });
    // Rule 3: Duplicate invoice payment
    const dupes = (data.payments || []).filter(p => p.invoiceId === payment.invoiceId && p.status !== 'rejected');
    if (dupes.length > 0) flags.push({ rule: 'DUPLICATE', msg: 'Invoice ini sudah memiliki pembayaran aktif' });

    if (flags.length > 0) {
      const log = { id: generateId(), paymentRef: payment.paymentCode, flags, detectedAt: new Date().toISOString(), resolved: false };
      if (!data.fraudLogs) data.fraudLogs = [];
      data.fraudLogs.push(log);
      saveData(data);
      if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) getDbRef('fraudLogs').doc(log.id).set(log).catch(console.error);
    }
    return flags;
  }

  function getFraudLogs() { return data.fraudLogs || []; }
  function getFraudAlert() { return (data.fraudLogs || []).filter(f => !f.resolved); }
  function resolveFraudLog(id) {
    const log = (data.fraudLogs || []).find(l => l.id === id);
    if (log) { 
      log.resolved = true; 
      log.resolvedAt = new Date().toISOString(); 
      saveData(data); 
      if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) getDbRef('fraudLogs').doc(log.id).update({ resolved: true, resolvedAt: log.resolvedAt }).catch(console.error);
    }
  }

  return {
    getAll, getById, add, update, remove,
    getCOA, getCOAByType, getCOAByCode, addCOA, updateCOA, removeCOA,
    updateCOABalance, recalculateCOA, calculatePeriodBalances,
    generateId, generateCode, formatCurrency, formatDate, formatDateTime,
    getSettings, updateSettings, getStats, resetData, clearAllData, DEFAULT_COA,
    tokenize, encryptPayload, decryptPayload, runFraudCheck, getFraudLogs, getFraudAlert, resolveFraudLog,
    // User Management
    getCurrentUser: () => data.currentUser,
    setCurrentUser: (user) => { data.currentUser = user; saveData(data); },
    getUsers: () => data.users,
    addUser: (user) => { 
      user.id = generateId(); 
      data.users.push(user); 
      saveData(data); 
      if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) getDbRef('users').doc(user.id).set(user).catch(console.error);
      return user; 
    },
    updateUser: (id, updates) => {
      const idx = data.users.findIndex(u => u.id === id);
      if (idx !== -1) { 
        data.users[idx] = { ...data.users[idx], ...updates }; 
        saveData(data); 
        if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) getDbRef('users').doc(id).update(updates).catch(console.error);
      }
    },
    removeUser: (id) => { 
      data.users = data.users.filter(u => u.id !== id); 
      saveData(data); 
      if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) getDbRef('users').doc(id).delete().catch(console.error);
    },
    initFirebase,
    setCurrentTenantId, getTenantId
  };
})();

// window.TMS already set above
