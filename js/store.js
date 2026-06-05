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
    { code: '4-4350', name: 'Pendapatan Paket Umroh & Haji', type: 'revenue', balance: 0, isDefault: true },
    { code: '5-5350', name: 'BPP Paket Umroh & Haji', type: 'cogs', balance: 0, isDefault: true },
  ];

  function getDefaultData() {
    return {
      flights: [],
      hotels: [],
      rentals: [],
      tours: [],
      umroh: [],
      master_tours: [],
      master_umrohs: [],
      inventory: [],
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
      users: [],
      superadmin_config: { username: 'superadmin', password: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9' },
      currentUser: null,
      settings: { companyName: '', companyAddress: '', companyPhone: '', companyEmail: '', companyLogo: '', taxEnabled: true, taxRate: 11 },
      counters: { flight: 0, hotel: 0, rental: 0, tour: 0, umroh: 0, invoice: 0, refund: 0, journal: 0, expense: 0, payment: 0, customer: 0, vendor: 0, airline: 0, airport: 0, db_hotel: 0, db_rental: 0, user: 1 }
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

      // Ensure default inventory items exist (Self-healing schema migration)
      const defaultInventory = [
        { id: 'inv-1', code: 'INV-IHRAM', name: 'Kain Ihram & Mukena', stock: 100, minThreshold: 15, updatedAt: new Date().toISOString() },
        { id: 'inv-2', code: 'INV-KOPER', name: 'Koper Kustom Travel', stock: 100, minThreshold: 15, updatedAt: new Date().toISOString() },
        { id: 'inv-3', code: 'INV-BATIK', name: 'Bahan Seragam Batik', stock: 100, minThreshold: 15, updatedAt: new Date().toISOString() }
      ];
      if (!data.inventory) {
        data.inventory = [];
        changed = true;
      }
      defaultInventory.forEach(defItem => {
        if (!data.inventory.find(i => i.code === defItem.code)) {
          data.inventory.push(defItem);
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

      // Auto-cleanup: hapus paket sample yang mungkin masih tersimpan di cache browser
      const SAMPLE_TOUR_IDS = ['mstr_tour_bali','mstr_tour_japan','mstr_tour_corp_lembang','tour_prem_bali','tour_sakura_jp','tour_corp_lembang'];
      const SAMPLE_TOUR_CODES = ['TOR-PREM-BALI','TOR-SAKURA-JP','TOR-CORP-LEMBANG'];
      const SAMPLE_UMROH_IDS = ['mstr_umr_reg_hemat','mstr_umr_vip_prem','mstr_umr_plus_turki','mstr_umr_group_saver','umr_reg_hemat','umr_vip_prem','umr_plus_turki','umr_group_saver'];
      const SAMPLE_UMROH_CODES = ['UMR-REG-HEMAT','UMR-VIP-PREM','UMR-PLUS-TURKI','UMR-GROUP-SAVER'];

      ['master_tours','tours'].forEach(col => {
        if (data[col]) data[col] = data[col].filter(t => !SAMPLE_TOUR_IDS.includes(t.id) && !SAMPLE_TOUR_CODES.includes(t.bookingCode));
      });
      ['master_umrohs','umrohs','umroh'].forEach(col => {
        if (data[col]) data[col] = data[col].filter(u => !SAMPLE_UMROH_IDS.includes(u.id) && !SAMPLE_UMROH_CODES.includes(u.bookingCode));
      });

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
      return fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }).catch(err => {
        console.error('Gagal menyimpan ke penyimpanan PC:', err);
      });

    } catch (e) {
      console.error('Store save error:', e);
      return Promise.resolve();
    }
  }

  let data = loadData();
  saveData(data); // Simpan perubahan migrasi jika ada

  let currentTenantId = data && data.currentUser ? (data.currentUser.tenantId || 'SUPERADMIN') : null;
  function setCurrentTenantId(id) { currentTenantId = id; }
  function getTenantId() { return currentTenantId; }
  
  let renderTimeout = null;
  function triggerUIRefresh() {
    if (renderTimeout) clearTimeout(renderTimeout);
    renderTimeout = setTimeout(() => {
      if (window.TMS && window.TMS.App && window.TMS.App.handleRoute) {
        window.TMS.App.handleRoute();
      }
    }, 150);
  }

  // Seed master packages disabled - do not auto-inject sample packages
  // seedMasterPackagesIfEmpty();

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

    const collections = ['flights', 'hotels', 'rentals', 'tours', 'umroh', 'inventory', 'invoices', 'refunds', 'journals', 'expenses', 'payments', 'customers', 'vendors', 'airlines', 'airports', 'coa', 'users', 'fraudLogs', 'master_tours', 'master_umrohs'];

    if (!currentTenantId) return false;
    if (currentTenantId === 'SUPERADMIN') {
      // Untuk SUPERADMIN, setup listener real-time untuk data pengguna global secara Offline-First
      try {
        const saUnsub = db.collection('users').onSnapshot(snap => {
          const freshUsers = snap.docs.map(d => d.data());
          if (JSON.stringify(data.users) !== JSON.stringify(freshUsers)) {
            data.users = freshUsers;
            saveData(data);
            triggerUIRefresh();
          }
        });
        if (window.TMS) {
          window.TMS.activeListeners = window.TMS.activeListeners || [];
          window.TMS.activeListeners.push(saUnsub);
        }
        return true;
      } catch(err) {
        console.error("Gagal melakukan sinkronisasi pengguna global untuk Super Admin:", err);
        return false;
      }
    }

    try {
      const snap = await getDbRef('settings').doc('config').get();
      if (!snap.exists) {
        console.log('Perusahaan baru terdeteksi. Menginisialisasi basis data cloud bersih...');
        
        // 1. Inisialisasi pengaturan cloud & memori lokal yang bersih
        const cleanSettings = {
          companyName: '',
          companyAddress: '',
          companyPhone: '',
          companyEmail: '',
          companyLogo: '',
          taxEnabled: true,
          taxRate: 11
        };
        await getDbRef('settings').doc('config').set(cleanSettings);
        data.settings = cleanSettings;

        // 2. Inisialisasi counters cloud & lokal
        const cleanCounters = { 
          flight: 0, hotel: 0, rental: 0, tour: 0, invoice: 0, 
          refund: 0, journal: 0, expense: 0, payment: 0, customer: 0,
          vendor: 0, airline: 0, airport: 0, db_hotel: 0, db_rental: 0, user: 1
        };
        await getDbRef('settings').doc('counters').set(cleanCounters);
        data.counters = cleanCounters;

        // 3. Kosongkan semua data transaksi di memori lokal
        data.flights = [];
        data.hotels = [];
        data.rentals = [];
        data.tours = [];
        data.invoices = [];
        data.refunds = [];
        data.journals = [];
        data.expenses = [];
        data.payments = [];
        data.customers = [];
        data.fraudLogs = [];
        data.vendors = [];
        data.vendor_deposits = [];

        // 4. Inisialisasi COA default
        data.coa = [...DEFAULT_COA];
        
        // Tulis COA default ke Firestore
        const coaBatch = db.batch();
        data.coa.forEach(acc => {
          const docRef = getDbRef('coa').doc(acc.id);
          coaBatch.set(docRef, acc);
        });
        await coaBatch.commit();

        // 5. Inisialisasi Inventori default ke Firestore
        data.inventory = [
          { id: 'inv-1', code: 'INV-IHRAM', name: 'Kain Ihram & Mukena', stock: 100, minThreshold: 15, updatedAt: new Date().toISOString() },
          { id: 'inv-2', code: 'INV-KOPER', name: 'Koper Kustom Travel', stock: 100, minThreshold: 15, updatedAt: new Date().toISOString() },
          { id: 'inv-3', code: 'INV-BATIK', name: 'Bahan Seragam Batik', stock: 100, minThreshold: 15, updatedAt: new Date().toISOString() }
        ];
        const invBatch = db.batch();
        data.inventory.forEach(item => {
          const docRef = getDbRef('inventory').doc(item.id);
          invBatch.set(docRef, item);
        });
        await invBatch.commit();

        saveData(data);
        console.log('Inisialisasi perusahaan baru berhasil diselesaikan.');
      } else {
        console.log('Memuat data cloud ke memori (Background Sync via Listeners)...');
        let cloudSettings = snap.data() || {};
        

        
        // Jaminan pemulihan (Self-Healing): jika cloudSettings kosong tetapi lokal sudah diisi secara kustom, gunakan lokal!
        if ((!cloudSettings.companyName || cloudSettings.companyName === '') && data.settings && data.settings.companyName) {
          console.log("Pengaturan cloud kosong tetapi lokal ada. Mengunggah pengaturan lokal ke cloud...");
          cloudSettings = data.settings;
          getDbRef('settings').doc('config').set(cloudSettings).catch(console.error);
        }
        
        data.settings = cloudSettings;
        saveData(data);
      }
      
      // Setup realtime listeners untuk seluruh transaksi (Offline-First Background Sync)
      collections.forEach(coll => {
        const qRef = getQueryRef(coll);
        if (qRef) {
          const unsub = qRef.onSnapshot(snapshot => {
            const freshCollData = snapshot.docs.map(d => d.data());
            if (JSON.stringify(data[coll]) !== JSON.stringify(freshCollData)) {
              data[coll] = freshCollData;
              
              // Self-healing: Ensure default COA accounts (like 4-4350 and 5-5350) exist when pulling from Firestore
              if (coll === 'coa') {
                const defaults = getDefaultData();
                defaults.coa.forEach(defAcc => {
                  if (!data.coa.find(a => a.code === defAcc.code)) {
                    data.coa.push(defAcc);
                    if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) {
                      getDbRef('coa').doc(defAcc.code || defAcc.id || generateId()).set(defAcc).catch(console.error);
                    }
                  }
                });
              }
              
              // Auto-seed disabled - do not inject sample packages into empty tenants
              // if ((coll === 'master_tours' || coll === 'master_umrohs') && freshCollData.length === 0) {
              //   seedMasterPackagesIfEmpty();
              // }
              
              saveData(data);
              triggerUIRefresh();
            }
          });
          if (window.TMS) {
            window.TMS.activeListeners = window.TMS.activeListeners || [];
            window.TMS.activeListeners.push(unsub);
          }
        }
      });
      
      const countersUnsub = getDbRef('settings').doc('counters').onSnapshot(snap => {
        if (snap.exists) {
          const freshCounters = snap.data();
          if (JSON.stringify(data.counters) !== JSON.stringify(freshCounters)) {
            data.counters = freshCounters;
            saveData(data);
            triggerUIRefresh();
          }
        }
      });
      const configUnsub = getDbRef('settings').doc('config').onSnapshot(snap => {
        if (snap.exists) {
          const freshSettings = snap.data();
          if (JSON.stringify(data.settings) !== JSON.stringify(freshSettings)) {
            data.settings = freshSettings;
            saveData(data);
            triggerUIRefresh();
          }
        }
      });
      if (window.TMS) {
        window.TMS.activeListeners = window.TMS.activeListeners || [];
        window.TMS.activeListeners.push(countersUnsub);
        window.TMS.activeListeners.push(configUnsub);
      }
      
      return true;
    } catch(e) {
      console.error('Firebase Error:', e);
      return false;
    }
  }

  function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 6); }

  function generateCode(prefix) {
    const s = data.settings || {};
    const numberingFormat = s.numberingFormat || 'PREFIX-DDMMYYYYURUT';
    const includeDate = s.numberingIncludeDate !== false;
    const includeMonth = s.numberingIncludeMonth !== false;
    const includeYear = s.numberingIncludeYear !== false;
    const digits = parseInt(s.numberingDigits) || 5;
    const resetYearly = s.numberingResetYearly !== false;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentDay = String(now.getDate()).padStart(2, '0');

    if (!data.counters._years) {
      data.counters._years = {};
    }

    const lastYear = data.counters._years[prefix] || currentYear;
    if (resetYearly && currentYear !== lastYear) {
      data.counters[prefix] = 0;
    }
    data.counters._years[prefix] = currentYear;

    data.counters[prefix] = (data.counters[prefix] || 0) + 1;
    saveData(data);
    if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) {
        getDbRef('settings').doc('counters').set(data.counters).catch(console.error);
    }

    let datePart = '';
    if (includeDate) datePart += currentDay;
    if (includeMonth) datePart += currentMonth;
    if (includeYear) datePart += currentYear;

    const num = String(data.counters[prefix]).padStart(digits, '0');
    const prefixMap = { 
      flight: 'FLT', hotel: 'HTL', rental: 'RNT', tour: 'TOR', umroh: 'UMR', 
      invoice: 'INV', refund: 'RFD', journal: 'JRN', expense: 'EXP', 
      customer: 'CST', vendor: 'VND', db_hotel: 'DBH', db_rental: 'DBR' 
    };
    const codePrefix = prefixMap[prefix] || prefix.toUpperCase();
    
    if (numberingFormat === 'PREFIX-DDMMYYYYURUT' || numberingFormat === 'custom') {
      return `${codePrefix}-${datePart}${num}`;
    } else {
      return `${codePrefix}-${num}`;
    }
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0);
  }

  function parseNumber(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(val.toString().replace(/\./g, '')) || 0;
  }

  function formatInt(val) {
    if (val === null || val === undefined || val === '') return '';
    const num = parseInt(val.toString().replace(/\./g, ''), 10);
    if (isNaN(num)) return '';
    return num.toLocaleString('id-ID');
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

  function addMasterPackage(type, packageData) {
    const collection = type === 'tour' ? 'master_tours' : 'master_umrohs';
    return add(collection, packageData);
  }

  function updateMasterPackage(type, id, updates) {
    const collection = type === 'tour' ? 'master_tours' : 'master_umrohs';
    return update(collection, id, updates);
  }

  function removeMasterPackage(type, id) {
    const collection = type === 'tour' ? 'master_tours' : 'master_umrohs';
    return remove(collection, id);
  }

  function seedMasterPackagesIfEmpty() {
    // Disabled: auto-injection of sample master packages is turned off
    return;

    const tours = data.master_tours || [];
    const umrohs = data.master_umrohs || [];
    let seeded = false;

    if (tours.length === 0) {
      console.log("Seeding master tours...");
      const tourSeeds = [
        {
          id: 'mstr_tour_bali',
          bookingCode: 'TOR-PREM-BALI',
          tourName: '3D2N Bali Premium Getaway (Nusa Penida & Uluwatu Tour)',
          destination: 'Bali, Indonesia',
          days: 3,
          sellingPricePerPax: 3450000,
          costPricePerPax: 2600000,
          marginPerPax: 850000,
          inclusions: 'Transportasi AC Private Avanza/Hiace (sesuai jumlah peserta) selama tour, Tiket Fastboat Sanur - Nusa Penida (Pulang-Pergi), Akomodasi Hotel 2 Malam termasuk sarapan pagi (MP) Bintang 4, Tiket masuk seluruh objek wisata sesuai program, Makan sesuai program (3x Makan Siang, 2x Makan Malam), Pengemudi merangkap Guide profesional berbahasa Indonesia, Air mineral 1 botol per orang per hari.',
          itinerary: [
            { day: 1, title: 'Arrival Bali - South Coast Tour & Sunset Dinner (MS, MM)', description: 'Penjemputan oleh Driver/Tour Guide kami di Bandara Internasional Ngurah Rai Bali. Makan siang di Ayam Betutu Khas Gilimanuk. Mengunjungi Pantai Pandawa / Pantai Melasti yang berpasir putih bersih. Menuju tebing Pura Uluwatu untuk melihat matahari terbenam yang megah. Sunset Dinner romantis seafood di Pantai Jimbaran. Check-in hotel dan istirahat.' },
            { day: 2, title: 'West Nusa Penida Island Tour - Speedboat Cruise (MP, MS, MM)', description: 'Sarapan pagi di hotel. Menuju Pelabuhan Sanur untuk menyeberang ke Nusa Penida dengan Fastboat. Tiba di Nusa Penida, mengunjungi tebing ikonik Kelingking Beach, Broken Beach, dan kolam alami Angel\'s Billabong. Makan siang prasmanan di restoran lokal Nusa Penida. Berfoto di Crystal Bay Beach sebelum kembali ke pelabuhan penyeberangan. Sore hari kembali ke Sanur, makan malam di Bebek Tepi Sawah / Bebek Bengil Ubud, kembali ke hotel.' },
            { day: 3, title: 'Ubud Cultural Tour - Krisna Oleh-oleh - Departure (MP, MS)', description: 'Sarapan pagi dan check-out hotel. Mengmengunjungi pusat seni Pasar Seni Ubud dan Monkey Forest Ubud. Makan siang bebek krispi legendaris khas Ubud. Berbelanja oleh-oleh khas Bali di Krisna Agung / Agung Bali. Pengantaran kembali ke Bandara Ngurah Rai untuk penerbangan pulang ke kota asal.' }
          ],
          createdAt: new Date().toISOString()
        },
        {
          id: 'mstr_tour_japan',
          bookingCode: 'TOR-SAKURA-JP',
          tourName: '5D4N Japan Sakura Golden Route (Tokyo - Mt. Fuji - Kyoto - Osaka)',
          destination: 'Tokyo - Fuji - Kyoto - Osaka, Jepang',
          days: 5,
          sellingPricePerPax: 23900000,
          costPricePerPax: 19500000,
          marginPerPax: 4400000,
          inclusions: 'Tiket Pesawat Internasional PP (Jakarta - Tokyo // Osaka - Jakarta) kelas ekonomi (Garuda Indonesia / Japan Airlines), Akomodasi Hotel Bintang 4 selama 4 malam (Twin/Triple share), Tiket kereta cepat Shinkansen (1-way), Bus AC pariwisata premium selama tour, Makanan Halal/Muslim-friendly sesuai itinerary, Tiket masuk objek wisata Iyashi no Sato, Tour Leader profesional dari Jakarta merangkap Local Guide berbahasa Indonesia.',
          itinerary: [
            { day: 1, title: 'Jakarta - Tokyo (Haneda/Narita) (On Board)', description: 'Jemaah berkumpul di Bandara Soekarno-Hatta Terminal 3 (3 jam sebelum keberangkatan). Penerbangan menuju Tokyo menggunakan Garuda Indonesia / Japan Airlines (Direct Flight). Tiba di Tokyo malam hari, proses imigrasi, penjemputan dengan Bus AC Premium, langsung menuju hotel untuk beristirahat.' },
            { day: 2, title: 'Tokyo City Tour - Asakusa Sensoji - Shibuya Crossing (MP, MS)', description: 'Sarapan pagi di hotel. Mengmengunjungi kuil tertua di Tokyo, Asakusa Sensoji Temple dan berbelanja cinderamata di Nakamise Street. Makan siang khas Jepang (Bento Set) bersertifikat halal. Berfoto berlatar belakang menara tertinggi Tokyo Skytree dari Sumida Park. Berjalan menyusuri penyeberangan tersibuk di dunia, Shibuya Crossing, dan berfoto bersama patung anjing setia Hachiko. Sore hari bebas di kawasan belanja Shinjuku, makan malam mandiri (personal expenses), kembali ke hotel.' },
            { day: 3, title: 'Mt. Fuji Iyashi no Sato - Bullet Train Shinkansen to Nagoya (MP, MS, MM)', description: 'Sarapan pagi dan check-out hotel. Perjalanan menuju Gunung Fuji. Mengmengunjungi desa tradisional beratapkan jerami Iyashi no Sato sembari menyewa Kimono/Samurai Armor dengan latar Gunung Fuji yang megah. Makan siang menu Japanese Udon/Hotpot khas kaki gunung. Menuju Stasiun Mishima, menaiki kereta cepat legendaris Shinkansen menuju kawasan Toyohashi/Nagoya. Check-in hotel, makan malam di restoran hotel, istirahat.' },
            { day: 4, title: 'Nagoya - Kyoto (Arashiyama Bamboo Forest) - Osaka (MP, MS)', description: 'Sarapan pagi dan check-out hotel. Berkendara menuju kota budaya Kyoto. Mengmengunjungi Arashiyama Bamboo Grove (hutan bambu yang tenang) dan jembatan ikonik Togetsukyo Bridge. Makan siang otentik Kyoto, dilanjutkan perjalanan menuju kota metropolitan Osaka. Mengmengunjungi Osaka Castle (spot foto luar) yang dikelilingi taman pohon Sakura yang mekar indah. Berbelanja kuliner dan pakaian di pusat keramaian Shinsaibashi and Dotonbori. Check-in hotel di Osaka dan istirahat.' },
            { day: 5, title: 'Osaka Departure - Jakarta (MP, On Board)', description: 'Sarapan pagi di hotel, check-out. Pengantaran ke Bandara Internasional Kansai (KIX). Penerbangan kembali ke Jakarta dengan Garuda Indonesia / Singapore Airlines. Tiba di Jakarta sore hari, program tour selesai.' }
          ],
          createdAt: new Date().toISOString()
        },
        {
          id: 'mstr_tour_corp_lembang',
          bookingCode: 'TOR-CORP-LEMBANG',
          tourName: '2D1N Corporate Gathering & Offroad Adventure Lembang',
          destination: 'Bandung, Indonesia',
          days: 2,
          sellingPricePerPax: 1850000,
          costPricePerPax: 1450000,
          marginPerPax: 400000,
          inclusions: 'Transportasi Bus Executive pariwisata terbaru (seat 2-2) termasuk Tol, Parkir, dan Tips Driver, Akomodasi hotel Green Forest Resort Lembang 1 Malam sesuai pilihan paket (Twin/Triple share), Konsumsi lengkap: 2x Makan Siang, 1x Sarapan Pagi, 1x Gala Dinner Buffet, Program Outbound Profesional: Instruktur bersertifikat, sewa lapangan, perlengkapan games, dan P3K, Tiket sewa mobil Land Rover Offroad Lembang (termasuk driver dan bbm), Paket Gala Dinner: Ballroom, Panggung, Backdrop spanduk, Sound System 3000 Watt, MC Profesional, dan Hiburan Live Music, Spanduk Utama Acara (Welcome Banner) ukuran 4x1 meter untuk dokumentasi foto bersama, Dokumentasi foto & video selama acara berlangsung.',
          itinerary: [
            { day: 1, title: 'Penjemputan - Fun Outbound & Team Building - Gala Dinner (MS, MM)', description: '06.00 - 09.30: Penjemputan di Kantor Perusahaan Jakarta/Bekasi menggunakan Bus Executive Pariwisata (59 Seats). Perjalanan via Tol Cipularang menuju Lembang. 10.00 - 12.00: Program Fun Outbound & Team Building di area terbuka hijau hotel/resort. 12.00 - 13.30: Makan siang prasmanan khas sunda dan check-in. 13.30 - 18.00: Waktu bebas menikmati fasilitas resort. 19.00 - 22.00: Gala Dinner & Awarding Night di Ballroom Hotel, prasmanan, live music, doorprize.' },
            { day: 2, title: 'Land Rover Offroad Adventure Lembang Forest - Departure (MP, MS)', description: '07.00 - 08.30: Sarapan pagi di hotel dan check-out. 09.00 - 12.00: Petualangan ekstrem Land Rover Offroad Adventure menembus jalur berlumpur Hutan Pinus Cikole Lembang (1 unit mobil Land Rover diisi oleh 6 orang). 12.30 - 14.00: Makan siang prasmanan di Restoran Kampung Daun / Dusun Bambu. 14.30 - 16.00: Singgah di pusat belanja Kartika Sari / Amanda Brownies. 16.00 - 19.30: Perjalanan kembali ke Jakarta.' }
          ],
          createdAt: new Date().toISOString()
        }
      ];
      tourSeeds.forEach(item => {
        data.master_tours.push(item);
        if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB() && currentTenantId && currentTenantId !== 'SUPERADMIN') {
          getDbRef('master_tours').doc(item.id).set(item).catch(console.error);
        }
      });
      seeded = true;
    }

    if (umrohs.length === 0) {
      console.log("Seeding master umrohs...");
      const umrohSeeds = [
        {
          id: 'mstr_umr_reg_hemat',
          bookingCode: 'UMR-REG-HEMAT',
          packageName: 'Umroh Reguler Hemat Bintang 3/4 (9 Hari)',
          mutawwif: 'Ustadz Pembimbing Berpengalaman',
          airline: 'Garuda Indonesia / Saudi Arabian Airlines (Direct Flight)',
          hotelMadinah: 'Dyar Al Habib / Dyar Al Taqwa / similar (Bintang 3/4) [± 150 meter]',
          hotelMakkah: 'Fajr Al Badea 4 / Fajar Badea 2 / similar (Bintang 4) [± 350-400 meter]',
          days: 9,
          sellingPricePerPax: 28500000,
          costPricePerPax: 24500000,
          marginPerPax: 4000000,
          inclusions: 'Tiket pesawat internasional PP kelas ekonomi, Visa Umroh Resmi, Akomodasi hotel di Makkah & Madinah sesuai paket, Makan 3x sehari menu khas Indonesia (Fullboard), Transportasi bus AC Executive selama di Arab Saudi, Air Zam-zam 5 Liter per jamaah, Muthawwif pembimbing ibadah berpengalaman Timur Tengah, Handling bandara Jakarta & Arab Saudi saat keberangkatan dan kepulangan.',
          itinerary: [
            { day: 1, title: 'Jakarta - Madinah', description: 'Berkumpul di Bandara Soekarno-Hatta Terminal 3. Keberangkatan menuju Madinah. Tiba di Madinah, proses imigrasi, transfer menuju hotel, check-in, dan istirahat.' },
            { day: 2, title: 'Ibadah Nabawi & Ziarah Dalam', description: 'Melaksanakan ibadah wajib di Masjid Nabawi. Ziarah dalam ke Makam Rasulullah SAW, Abu Bakar Ash-Shiddiq, Umar bin Khattab, dan pemakaman Baqi. Memasuki Raudhah dipandu oleh Muthawwif.' },
            { day: 3, title: 'Ziarah Luar Kota Madinah', description: 'Mengmengunjungi Masjid Quba (shalat sunnah 2 rakaat), kebun kurma, Jabal Uhud, dan melewati Masjid Qiblatain serta Masjid Khandaq.' },
            { day: 4, title: 'Madinah - Makkah (Ambil Miqat di Bir Ali) - Umroh Pertama', description: 'Check-out hotel Madinah. Menuju Makkah menggunakan bus AC. Singgah di Bir Ali untuk berihram dan mengambil niat Miqat Umroh. Tiba di Makkah, check-in hotel, bersiap menuju Masjidil Haram untuk melaksanakan prosesi Thawaf, Sa\'i, dan Tahallul (Umroh Pertama).' },
            { day: 5, title: 'Ibadah Mandiri di Makkah', description: 'Memperbanyak ibadah wajib dan sunnah di Masjidil Haram secara mandiri.' },
            { day: 6, title: 'Ziarah Kota Makkah & Miqat Umroh Kedua', description: 'Mengmengunjungi Jabal Tsur, Padang Arafah (Jabal Rahmah), Muzdalifah, Mina, dan Jabal Nur. Singgah di Ji\'ranah untuk mengambil Miqat bagi jamaah yang ingin melaksanakan Umroh Kedua.' },
            { day: 7, title: 'Ibadah Mandiri & Thawaf Wada', description: 'Memperbanyak ibadah secara mandiri. Malam hari melaksanakan Thawaf Wada (Thawaf perpisahan).' },
            { day: 8, title: 'Makkah - Jeddah - Departure', description: 'Check-out hotel Makkah. Perjalanan menuju Jeddah, city tour singkat melewati Masjid Terapung Laut Merah and berbelanja di Balad/Corniche. Menuju Bandara King Abdul Aziz Jeddah untuk penerbangan kembali ke Jakarta.' },
            { day: 9, title: 'Tiba di Jakarta', description: 'Tiba di Jakarta. Pembagian air zam-zam dan koper bagasi. Program ibadah umroh bersama Travel Go selesai dengan mabrur, insya Allah.' }
          ],
          createdAt: new Date().toISOString()
        },
        {
          id: 'mstr_umr_vip_prem',
          bookingCode: 'UMR-VIP-PREM',
          packageName: 'Umroh VIP Clock Tower Bintang 5 (9 Hari)',
          mutawwif: 'Ustadz Lulusan Universitas Islam Madinah (UIM)',
          airline: 'Saudi Arabian Airlines (Direct Flight Jakarta - Madinah // Jeddah - Jakarta)',
          hotelMadinah: 'Pullman Zamzam Madinah / Anwar Al Madinah Moevenpick Bintang 5 [0 meter]',
          hotelMakkah: 'Fairmont Makkah Clock Royal Tower / Swissotel Al Maqam Bintang 5 [0 meter]',
          days: 9,
          sellingPricePerPax: 46500000,
          costPricePerPax: 39500000,
          marginPerPax: 7000000,
          inclusions: 'Tiket pesawat internasional PP kelas ekonomi (upgrade Business Class +15jt), Visa Umroh Resmi, Akomodasi hotel Makkah & Madinah Bintang 5, Makan prasmanan menu Internasional & Indonesia, Bus AC Executive premium di Saudi, Kereta Cepat Haramain (Madinah-Makkah), Muthawwif khusus lulusan UIM, VIP Lounge Bandara, Air Zam-zam 5L.',
          itinerary: [
            { day: 1, title: 'Jakarta - Madinah', description: 'Nikmati VIP Lounge Bandara Soetta T3 sebelum terbang. Keberangkatan langsung ke Madinah dengan Saudia. Tiba Madinah, check-in hotel Bintang 5 pelataran (0m) & istirahat.' },
            { day: 2, title: 'Ziarah Nabawi & Raudhah VIP', description: 'Ibadah di Masjid Nabawi. Ziarah dalam makam Rasulullah SAW & Baqi. Masuk Raudhah VIP dibimbing ustadz UIM.' },
            { day: 3, title: 'Ziarah Luar Madinah', description: 'Kunjungan Masjid Quba, kebun kurma, Jabal Uhud, Masjid Qiblatain & Khandaq dengan bus premium.' },
            { day: 4, title: 'Kereta Cepat Haramain ke Makkah - Umroh 1', description: 'Check-out, menuju Makkah menggunakan Haramain High-Speed Railway (Kereta Cepat, 2 jam). Ambil Miqat di Bir Ali. Tiba Makkah, check-in Fairmont/similar Clock Tower, Thawaf, Sa\'i, Tahallul.' },
            { day: 5, title: 'Ibadah Mandiri Fairmont', description: 'Ibadah khusyuk di Masjidil Haram, akses lift langsung dari hotel ke pelataran masjid.' },
            { day: 6, title: 'Ziarah Makkah VIP & Umroh 2', description: 'Ziarah Jabal Tsur, Arafah, Jabal Rahmah, Muzdalifah, Mina, Jabal Nur, ambil Miqat di Ji\'ranah untuk Umroh Kedua.' },
            { day: 7, title: 'Ibadah Mandiri & Thawaf Wada', description: 'Ibadah mandiri di Masjidil Haram, dilanjutkan Thawaf Wada.' },
            { day: 8, title: 'Makkah - Jeddah - Kepulangan', description: 'Check-out, transfer ke Jeddah dengan bus eksekutif, city tour singkat di Laut Merah & Corniche, menuju Bandara Jeddah untuk penerbangan pulang.' },
            { day: 9, title: 'Tiba di Jakarta', description: 'Tiba di Jakarta, pembagian Zam-zam & bagasi selesai.' }
          ],
          createdAt: new Date().toISOString()
        },
        {
          id: 'mstr_umr_plus_turki',
          bookingCode: 'UMR-PLUS-TURKI',
          packageName: 'Umroh Plus Turki Cappadocia 12 Hari',
          mutawwif: 'Ustadz Pembimbing Umroh & Guide Lokal Turki',
          airline: 'Turkish Airlines (Jakarta - Istanbul - Madinah // Jeddah - Istanbul - Jakarta)',
          hotelMadinah: 'Leader Al Muna / Grand Plaza Madinah (Bintang 4)',
          hotelMakkah: 'Pullman Zamzam Makkah / Swissotel Makkah (Bintang 5)',
          days: 12,
          sellingPricePerPax: 39900000,
          costPricePerPax: 34500000,
          marginPerPax: 5400000,
          inclusions: 'Tiket pesawat internasional PP (Turkish Airlines) + tiket domestik Turki PP, E-Visa Resmi Turki & Visa Umroh Resmi, Akomodasi hotel Bintang 5 di Turki & Makkah dan Bintang 4 di Madinah, Makan 3x sehari halal muslim-friendly, Tiket masuk Hagia Sophia & Goreme Museum & Kaymakli, Guide lokal berbahasa Indonesia, Bus AC pariwisata premium.',
          itinerary: [
            { day: 1, title: 'Jakarta - Istanbul (Turki)', description: 'Penerbangan malam dari Soekarno-Hatta menuju Istanbul dengan Turkish Airlines, tiba Istanbul langsung check-in hotel.' },
            { day: 2, title: 'Istanbul - Cappadocia City Tour', description: 'Mengmengunjungi Blue Mosque & Hagia Sophia, makan siang halal, terbang domestik ke Cappadocia, check-in hotel gua/resort.' },
            { day: 3, title: 'Cappadocia Cave & Balloon Tour', description: 'Pagi hari (opsional) menikmati pemandangan balon udara, mengunjungi Kaymakli Underground City, Goreme Open Air Museum, makan malam tradisional Turki.' },
            { day: 4, title: 'Cappadocia - Istanbul - Madinah', description: 'Terbang dari Cappadocia ke Istanbul, lanjut penerbangan ke Madinah Arab Saudi, check-in hotel Madinah.' },
            { day: 5, title: 'Madinah - Ziarah Nabawi & Raudhah', description: 'Ibadah wajib Masjid Nabawi, ziarah makam Rasulullah SAW dan Baqi, bimbingan masuk Raudhah.' },
            { day: 6, title: 'Ziarah Luar Madinah', description: 'Kunjungan Masjid Quba, kebun kurma, Jabal Uhud, Masjid Qiblatain & Khandaq.' },
            { day: 7, title: 'Madinah - Makkah (Bir Ali) - Umroh 1', description: 'Check-out Madinah, bus AC ke Makkah, ambil Miqat Bir Ali, check-in hotel Makkah, Thawaf, Sa\'i, Tahallul.' },
            { day: 8, title: 'Ibadah Mandiri Makkah', description: 'Memperbanyak ibadah di Masjidil Haram secara mandiri.' },
            { day: 9, title: 'Ziarah Makkah & Umroh 2', description: 'Ziarah Jabal Tsur, Arafah, Jabal Rahmah, Muzdalifah, Mina, Jabal Nur, ambil Miqat Ji\'ranah untuk Umroh Kedua.' },
            { day: 10, title: 'Ibadah Mandiri Makkah', description: 'Memperbanyak ibadah di Masjidil Haram secara mandiri.' },
            { day: 11, title: 'Thawaf Wada - Jeddah - Departure', description: 'Thawaf Wada, check-out Makkah, city tour Jeddah, menuju Bandara Jeddah untuk penerbangan pulang ke Jakarta.' },
            { day: 12, title: 'Tiba di Jakarta', description: 'Tiba kembali di Jakarta Soetta T3. Program Umroh Plus Turki Cappadocia selesai.' }
          ],
          createdAt: new Date().toISOString()
        }
      ];
      umrohSeeds.forEach(item => {
        data.master_umrohs.push(item);
        if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB() && currentTenantId && currentTenantId !== 'SUPERADMIN') {
          getDbRef('master_umrohs').doc(item.id).set(item).catch(console.error);
        }
      });
      seeded = true;
    }

    if (seeded) {
      saveData(data);
      triggerUIRefresh();
    }
  }

  function injectPremiumSamplesIfMissing() {
    // Disabled auto-injection of sample data as requested
    return;

    // Check if tours premium are already added
    const tours = data.tours || [];
    const existingTourCodes = tours.map(t => t.bookingCode);
    
    const premiumTours = [
      {
        id: "tour_prem_bali",
        bookingCode: "TOR-PREM-BALI",
        tourName: "BALI PREMIUM GETAWAY",
        destination: "NUSA PENIDA & ULUWATU",
        days: 3,
        pax: 4,
        sellingPrice: 13800000,
        costPrice: 11200000,
        sellingPricePerPax: 3450000,
        costPricePerPax: 2800000,
        marginPerPax: 650000,
        inclusions: "Harper Kuta Hotel, Private AC Transport, Fastboat Sanur-Penida PP, 3x Lunch, 2x Sunset Seafood Dinner Jimbaran, Entrance Tickets, Driver merangkap Tour Guide, Mineral Water.",
        itinerary: [
          { day: 1, title: "Arrival Bali - South Coast Tour", description: "Penjemputan di Bandara Ngurah Rai, makan siang Ayam Betutu, Pantai Melasti, sunset di Pura Uluwatu, seafood dinner di Jimbaran." },
          { day: 2, title: "Nusa Penida West Coast Tour", description: "Sarapan pagi, penyeberangan Sanur-Penida PP, Kelingking Beach, Broken Beach, Angel Billabong, makan siang prasmanan, Crystal Bay." },
          { day: 3, title: "Ubud Art Market & Oleh-Oleh", description: "Sarapan pagi, check-out, Ubud Monkey Forest, belanja Krisna Oleh-oleh khas Bali, makan siang bebek krispi Ubud, drop bandara." }
        ],
        participants: [{ name: "Andi Pratama", category: "Dewasa" }, { name: "Siti Aminah", category: "Dewasa" }, { name: "Rudi Pratama", category: "Dewasa" }, { name: "Lia Pratama", category: "Anak" }],
        customerName: "Bapak Andi Pratama",
        customerPhone: "081234567890",
        customerEmail: "andi.pratama@gmail.com",
        customerAddress: "Jakarta Selatan",
        status: "quotation",
        paymentStatus: "unpaid",
        paymentAccount: "1-1001",
        transactionDate: "2026-06-01",
        departureDate: "2026-06-15",
        itineraryId: "TOR-00035"
      },
      {
        id: "tour_sakura_jp",
        bookingCode: "TOR-SAKURA-JP",
        tourName: "JAPAN SAKURA GOLDEN ROUTE",
        destination: "TOKYO - MT. FUJI - KYOTO - OSAKA",
        days: 5,
        pax: 15,
        sellingPrice: 358500000,
        costPrice: 300000000,
        sellingPricePerPax: 23900000,
        costPricePerPax: 20000000,
        marginPerPax: 3900000,
        inclusions: "Tiket Pesawat Internasional PP (Jakarta-Tokyo // Osaka-Jakarta) kelas ekonomi Garuda Indonesia, Hotel Bintang 4 (Twin Share), Shinkansen Bullet Train Ticket (1-way), Bus Pariwisata Premium, Makanan Halal sesuai itinerary, Tour Leader dari Jakarta, Tiket Masuk Iyashi no Sato.",
        itinerary: [
          { day: 1, title: "Departure & Arrival Tokyo", description: "Penerbangan kelas premium dari Soekarno-Hatta ke Tokyo (Narita/Haneda), proses imigrasi cepat, penjemputan bus AC premium, check-in hotel." },
          { day: 2, title: "Tokyo City Tour", description: "Sarapan pagi, Asakusa Sensoji Temple, Nakamise shopping street, foto stop Tokyo Skytree, Sumida Park Sakura, Shibuya Crossing & Hachiko." },
          { day: 3, title: "Mt. Fuji Iyashi no Sato & Shinkansen", description: "Sarapan pagi, check-out, sewa Kimono/Samurai di desa tradisional Iyashi no Sato berlatar Gunung Fuji, makan siang Udon, naik Shinkansen ke Nagoya." },
          { day: 4, title: "Kyoto Arashiyama & Osaka Castle", description: "Sarapan pagi, Kyoto Arashiyama Bamboo Grove, makan siang otentik, perjalanan ke Osaka Castle Sakura Park, belanja Dotonbori & Shinsaibashi." },
          { day: 5, title: "Osaka Departure to Jakarta", description: "Sarapan pagi, check-out, pengantaran ke Bandara Kansai (KIX) untuk penerbangan kembali ke Jakarta." }
        ],
        participants: [{ name: "Rina Wijaya", category: "Dewasa" }],
        customerName: "Ibu Rina Wijaya",
        customerPhone: "081122334455",
        customerEmail: "rina.wijaya@gmail.com",
        customerAddress: "Surabaya Pusat",
        status: "quotation",
        paymentStatus: "unpaid",
        paymentAccount: "1-1001",
        transactionDate: "2026-06-01",
        departureDate: "2026-04-15",
        itineraryId: "TOR-00036"
      },
      {
        id: "tour_corp_lembang",
        bookingCode: "TOR-CORP-LEMBANG",
        tourName: "CORPORATE GATHERING LEMBANG",
        destination: "GREEN FOREST & OFFROAD CIKOLE",
        days: 2,
        pax: 80,
        sellingPrice: 148000000,
        costPrice: 120000000,
        sellingPricePerPax: 1850000,
        costPricePerPax: 1500000,
        marginPerPax: 350000,
        inclusions: "Bus Pariwisata Executive AC (59 seats) PP Tol & Tips, Hotel Green Forest Lembang 1 Malam (Twin Share), Fun Outbound & Team Building instuktur berlisensi, 2x Lunch sunda/Kampung Daun, Gala Dinner Buffet di Ballroom, sewa Land Rover Offroad Lembang Forest, MC & Live Music Band, Spanduk & Backdrop, Dokumentasi Foto & Video.",
        itinerary: [
          { day: 1, title: "Outbound, Team Building & Gala Dinner", description: "Penjemputan bus eksekutif ke Lembang, Fun Outbound & team synergy games dipandu HR Specialist, makan siang sunda, check-in, Malam Gala Dinner & Awarding Night di Ballroom dimeriahkan Live Band." },
          { day: 2, title: "Land Rover Offroad Adventure & Belanja", description: "Sarapan pagi, check-out, petualangan ekstrim Land Rover Offroad di hutan pinus Cikole Lembang, makan siang di Kampung Daun, belanja Kartika Sari, kembali ke Jakarta." }
        ],
        participants: [{ name: "HRD PT STI", category: "Dewasa" }],
        customerName: "PT Solusi Teknologi Indonesia (HRD)",
        customerPhone: "0219876543",
        customerEmail: "hrd@solusitek.co.id",
        customerAddress: "Sudirman Central Business District, Jakarta",
        status: "quotation",
        paymentStatus: "unpaid",
        paymentAccount: "1-1001",
        transactionDate: "2026-06-01",
        departureDate: "2026-07-10",
        itineraryId: "TOR-00037"
      }
    ];

    premiumTours.forEach(pt => {
      if (!existingTourCodes.includes(pt.bookingCode)) {
        pt.id = pt.id || generateId();
        pt.createdAt = pt.createdAt || new Date().toISOString();
        data.tours.push(pt);
        if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) {
          getDbRef('tours').doc(pt.id).set(pt).catch(console.error);
        }
        console.log(`Auto-injected premium tour: ${pt.tourName}`);
      }
    });

    // Check if umroh premium are already added
    const umrohs = data.umroh || [];
    const existingUmrohCodes = umrohs.map(u => u.bookingCode);

    const premiumUmrohs = [
      {
        id: "umr_reg_hemat",
        bookingCode: "UMR-REG-HEMAT",
        packageName: "Umroh Reguler Hemat Bintang 3/4",
        mutawwif: "Ustadz Ahmad Al-Mubarak",
        airline: "Garuda Indonesia",
        hotelMakkah: "Fajr Al Badea 4 (350m)",
        hotelMadinah: "Dyar Al Habib (150m)",
        days: 9,
        pax: 4,
        sellingPrice: 114000000,
        costPrice: 100000000,
        sellingPricePerPax: 28500000,
        costPricePerPax: 25000000,
        marginPerPax: 3500000,
        inclusions: "Tiket Pesawat PP Garuda Indonesia Jakarta-Jeddah Direct, Visa Umroh Resmi, Hotel Makkah/Madinah sesuai paket, Makan 3x sehari Fullboard Menu Indonesia, Bus AC VIP, Muthawwif pembimbing ibadah Timur Tengah, Air Zam-zam 5L.",
        itinerary: [
          { day: 1, title: "Jakarta - Madinah Arrival", description: "Berkumpul di Terminal 3 Soekarno-Hatta, penerbangan langsung Garuda Indonesia ke Madinah, proses imigrasi cepat, check-in hotel Madinah, istirahat." },
          { day: 2, title: "Raudhah & Makam Rasulullah", description: "Shalat di Masjid Nabawi, ziarah dalam ke Makam Rasulullah SAW, Abu Bakar, Umar, komplek Baqi, dibimbing mutawwif masuk ke Raudhah Al-Syarifah." },
          { day: 3, title: "Ziarah Kota Madinah", description: "Sarapan pagi, mengunjungi Masjid Quba (shalat sunnah 2 rakaat), kebun kurma pilihan, Jabal Uhud, foto stop Masjid Qiblatain dan Masjid Khandaq." },
          { day: 4, title: "Madinah - Bir Ali Miqat - Makkah", description: "Check-out hotel Madinah, perjalanan bus AC VIP ke Makkah, singgah Bir Ali untuk berihram & niat Miqat, tiba di Makkah check-in, Thawaf, Sa i & Tahallul (Umroh Pertama)." },
          { day: 5, title: "Ibadah Mandiri Masjidil Haram", description: "Memperbanyak ibadah wajib dan sunnah, tilawah Al-Qur an, serta Thawaf Sunnah di pelataran Ka bah." },
          { day: 6, title: "Ziarah Makkah & Umroh Kedua", description: "Ziarah Jabal Tsur, Padang Arafah (Jabal Rahmah), Mina, Jabal Nur, singgah di Ji ranah mengambil Miqat Umroh Kedua bagi jamaah." },
          { day: 7, title: "Ibadah Mandiri & Thawaf Wada", description: "Memperbanyak ibadah secara khusyu, malam hari ditutup dengan Thawaf Wada bersama Mutawwif." },
          { day: 8, title: "Makkah - City Tour Jeddah - Departure", description: "Check-out hotel Makkah, perjalanan ke Jeddah, mengunjungi Laut Merah & Masjid Terapung, belanja Corniche, transfer Bandara Jeddah penerbangan PP." },
          { day: 9, title: "Arrival Jakarta", description: "Tiba di Bandara Soekarno-Hatta Jakarta. Pembagian air Zam-zam dan koper. Ibadah Umroh selesai." }
        ],
        participants: [{ name: "Bapak Haji Rahmat", category: "Dewasa" }],
        customerName: "Bapak Haji Rahmat",
        customerPhone: "081299887766",
        customerEmail: "rahmat.haji@gmail.com",
        customerAddress: "Tangerang Kota",
        status: "quotation",
        paymentStatus: "unpaid",
        paymentAccount: "1-1001",
        transactionDate: "2026-06-01",
        departureDate: "2026-09-10"
      },
      {
        id: "umr_vip_prem",
        bookingCode: "UMR-VIP-PREM",
        packageName: "Umroh VIP Clock Tower Bintang 5",
        mutawwif: "Ustadz Dr. Yasir Lc, MA",
        airline: "Saudi Arabian Airlines",
        hotelMakkah: "Fairmont Clock Tower (0m)",
        hotelMadinah: "Pullman Zamzam Madinah (0m)",
        days: 9,
        pax: 2,
        sellingPrice: 108000000,
        costPrice: 90000000,
        sellingPricePerPax: 54000000,
        costPricePerPax: 45000000,
        marginPerPax: 9000000,
        inclusions: "Tiket Pesawat PP Saudia Airlines Direct, Visa Umroh VIP, Hotel Bintang 5 Premium teras masjid & Clock Tower, Makan Fullboard Buffet Internasional Bintang 5, Kereta Cepat Haramain Bullet Train Madinah-Makkah (Business Class), Muthawwif Lulusan UIM Madinah, VIP lounge bandara, Air Zam-zam 5L.",
        itinerary: [
          { day: 1, title: "Jakarta VIP Lounge - Madinah Arrival", description: "Berkumpul di Airport VIP Lounge Soetta, penerbangan Saudia Airlines Direct Madinah, VIP Handling Bandara, check-in kamar suite teras Masjid Nabawi." },
          { day: 2, title: "Eksklusif Raudhah & Nabawi Ibadah", description: "Bimbingan ibadah intensif fiqih umroh oleh Ustadz S2 Madinah, VIP booking antrean Raudhah, ziarah makam Rasulullah SAW tanpa antre lama." },
          { day: 3, title: "Ziarah VIP Madinah", description: "Ziarah privat menggunakan GMC premium ke Masjid Quba, Jabal Uhud, dan kebun kurma eksklusif Ajwa." },
          { day: 4, title: "Kereta Cepat Haramain Express to Makkah", description: "Check-out hotel Madinah, naik Kereta Cepat Haramain Express kelas Bisnis hanya 2 jam tiba di Makkah, check-in Fairmont Clock Tower suite Kaaba View, Thawaf, Sa i & Tahallul (Umroh Pertama)." },
          { day: 5, title: "Khusyu Ibadah depan Ka bah", description: "Memperbanyak tawajuh ibadah di Masjidil Haram, akses langsung eskalator hotel ke pelataran Thawaf." },
          { day: 6, title: "Ziarah Makkah & Miqat Ji ranah", description: "Privat ziarah sejarah Arafah, Mina, Jabal Rahmah, Miqat di Masjid Ji ranah untuk Umroh Kedua." },
          { day: 7, title: "Ibadah Mandiri & Thawaf Wada VIP", description: "Konsultasi agama privat dengan Ustadz pembimbing, ibadah khusyu, malam hari Thawaf Wada." },
          { day: 8, title: "Jeddah Corniche Tour - Departure", description: "Check-out, privat transfer GMC ke Jeddah Balad Corniche, VIP check-in Bandara Jeddah, penerbangan kembali ke Soetta." },
          { day: 9, title: "Arrival Jakarta VIP Handling", description: "Tiba di Jakarta Soetta, koper & air Zam-zam 5L diurus penuh oleh tim handling kami. Umroh VIP selesai." }
        ],
        participants: [{ name: "Haji Muhammad Yusuf", category: "Dewasa" }],
        customerName: "Haji Muhammad Yusuf (Executive)",
        customerPhone: "0811998877",
        customerEmail: "yusuf.muhammad@bumn.co.id",
        customerAddress: "Menteng, Jakarta Pusat",
        status: "quotation",
        paymentStatus: "unpaid",
        paymentAccount: "1-1001",
        transactionDate: "2026-06-01",
        departureDate: "2026-10-15"
      },
      {
        id: "umr_plus_turki",
        bookingCode: "UMR-PLUS-TURKI",
        packageName: "Umroh Plus Turki Cappadocia 12 Hari",
        mutawwif: "Ustadz Hanan Attaki Lc",
        airline: "Turkish Airlines",
        hotelMakkah: "Pullman Zamzam Makkah (Bintang 5)",
        hotelMadinah: "Leader Al Muna Madinah (Bintang 4)",
        days: 12,
        pax: 2,
        sellingPrice: 87600000,
        costPrice: 74000000,
        sellingPricePerPax: 43800000,
        costPricePerPax: 37000000,
        marginPerPax: 6800000,
        inclusions: "Tiket Pesawat PP Turkish Airlines (Jakarta-Istanbul-Madinah-Jeddah-Jakarta), E-Visa Turki Resmi, Tiket Pesawat Domestik Turki (Istanbul-Cappadocia PP), Hotel Bintang 5 Istanbul/Cappadocia, Hotel Makkah Bintang 5, Hotel Madinah Bintang 4, Tiket Masuk Hagia Sophia & Underground City, Guide Lokal Turki & Muthawwif Arab Saudi, Makan Fullboard.",
        itinerary: [
          { day: 1, title: "Jakarta - Istanbul Arrival", description: "Penerbangan Turkish Airlines berkelas dunia ke Istanbul, penjemputan oleh pemandu lokal berlisensi, check-in hotel Pullman Istanbul Bintang 5." },
          { day: 2, title: "Istanbul City Tour & Fly to Cappadocia", description: "Sarapan pagi, mengunjungi masjid legendaris Blue Mosque, Hagia Sophia, makan siang kebab otentik, penerbangan domestik ke Cappadocia, check-in hotel gua mewah." },
          { day: 3, title: "Hot Air Balloon Cappadocia & Underground City", description: "Menyaksikan keindahan ribuan balon udara di atas tebing Cappadocia, tur kota bawah tanah kuno Kaymakli, Goreme Open Air Museum, makan malam." },
          { day: 4, title: "Cappadocia - Istanbul - Madinah Arrival", description: "Penerbangan Cappadocia ke Istanbul, dilanjutkan penerbangan internasional menuju kota suci Madinah Arab Saudi, check-in hotel Madinah, istirahat." },
          { day: 5, title: "Ibadah Nabawi & Makam Rasulullah", description: "Shalat di Masjid Nabawi, Raudhah Al-Syarifah, ziarah makam baginda Rasulullah SAW beserta sahabat." },
          { day: 6, title: "Ziarah Luar Kota Madinah", description: "Ziarah Masjid Quba, perkebunan kurma pilihan, Jabal Uhud, Masjid Qiblatain." },
          { day: 7, title: "Madinah - Bir Ali Miqat - Makkah Umroh", description: "Check-out Madinah, perjalanan bus AC VIP ke Bir Ali mengambil niat ihram, tiba Makkah check-in Pullman Zamzam, Thawaf, Sa i & Tahallul (Umroh Pertama)." },
          { day: 8, title: "Ibadah Mandiri Masjidil Haram", description: "Memperbanyak tadarus Al-Qur an, shalat fardhu di pelataran Ka bah." },
          { day: 9, title: "Ziarah Makkah & Miqat Umroh Kedua", description: "Mengunjungi tempat bersejarah Jabal Nur, Arafah, Mina, Miqat di Ji ranah untuk melaksanakan Umroh Kedua bagi jamaah." },
          { day: 10, title: "Ibadah Mandiri Khusyu", description: "Memperbanyak iktikaf dan Thawaf sunnah di Masjidil Haram." },
          { day: 11, title: "Thawaf Wada - Jeddah - Departure", description: "Thawaf Wada perpisahan, perjalanan ke Jeddah Corniche, makan malam, transfer Bandara Jeddah untuk penerbangan kembali ke Jakarta." },
          { day: 12, title: "Arrival Jakarta", description: "Tiba di Bandara Soekarno-Hatta Jakarta. Program Umroh Plus Turki Cappadocia selesai dengan berkah." }
        ],
        participants: [{ name: "Bapak Fahri", category: "Dewasa" }, { name: "Ibu Aminah", category: "Dewasa" }],
        customerName: "Bapak Fahri & Keluarga",
        customerPhone: "081399882233",
        customerEmail: "fahri.family@outlook.com",
        customerAddress: "Dago, Bandung Utara",
        status: "quotation",
        paymentStatus: "unpaid",
        paymentAccount: "1-1001",
        transactionDate: "2026-06-01",
        departureDate: "2026-11-05"
      }
    ];

    premiumUmrohs.forEach(pu => {
      if (!existingUmrohCodes.includes(pu.bookingCode)) {
        pu.id = pu.id || generateId();
        pu.createdAt = pu.createdAt || new Date().toISOString();
        data.umroh.push(pu);
        if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) {
          getDbRef('umroh').doc(pu.id).set(pu).catch(console.error);
        }
        console.log(`Auto-injected premium umroh: ${pu.packageName}`);
      }
    });

    data.settings.premiumSamplesInjected = true;
    saveData(data);

    if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) {
      getDbRef('settings').doc('config').set(data.settings).catch(console.error);
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
    const savePromise = saveData(data); 
    if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) {
      try {
        await getDbRef('settings').doc('config').set(data.settings);
      } catch (err) {
        console.error("Firebase updateSettings error:", err);
        alert("Gagal menyimpan ke database online. Pastikan koneksi internet stabil dan Database Firebase sudah diaktifkan. Error: " + err.message);
      }
    }
    await savePromise;
  }

  async function clearAllData() {
    data.flights = [];
    data.hotels = [];
    data.rentals = [];
    data.tours = [];
    data.umroh = [];
    data.invoices = [];
    data.refunds = [];
    data.journals = [];
    data.expenses = [];
    data.payments = [];
    data.customers = [];
    data.fraudLogs = [];
    data.vendor_deposits = [];
    data.inventory = [
      { id: 'inv-1', code: 'INV-IHRAM', name: 'Kain Ihram & Mukena', stock: 100, minThreshold: 15, updatedAt: new Date().toISOString() },
      { id: 'inv-2', code: 'INV-KOPER', name: 'Koper Kustom Travel', stock: 100, minThreshold: 15, updatedAt: new Date().toISOString() },
      { id: 'inv-3', code: 'INV-BATIK', name: 'Bahan Seragam Batik', stock: 100, minThreshold: 15, updatedAt: new Date().toISOString() }
    ];
    
    data.counters = { 
      flight: 0, hotel: 0, rental: 0, tour: 0, umroh: 0, invoice: 0, 
      refund: 0, journal: 0, expense: 0, payment: 0, customer: 0,
      vendor: 0, airline: 0, airport: 0, db_hotel: 0, db_rental: 0, user: 1
    };
    
    recalculateCOA();
    const savePromise = saveData(data);

    // Hapus data transaksi dari Firestore online (jika terkoneksi)
    const db = window.TMS && window.TMS.Firebase ? window.TMS.Firebase.getDB() : null;
    if (db && currentTenantId && currentTenantId !== 'SUPERADMIN') {
      const collectionsToClear = ['flights', 'hotels', 'rentals', 'tours', 'umroh', 'invoices', 'refunds', 'journals', 'expenses', 'payments', 'customers', 'vendor_deposits'];
      try {
        console.log("Memulai pembersihan data transaksi di Firestore...");
        
        // Buat batch delete untuk setiap koleksi
        const deletePromises = collectionsToClear.map(async (collName) => {
          const qRef = getQueryRef(collName);
          if (qRef) {
            const snap = await qRef.get();
            const docs = snap.docs;
            if (docs.length > 0) {
              const batch = db.batch();
              docs.forEach(doc => {
                batch.delete(doc.ref);
              });
              await batch.commit();
              console.log(`Koleksi cloud ${collName} berhasil dibersihkan.`);
            }
          }
        });

        // Perbarui counters di cloud
        const countersRef = getDbRef('settings').doc('counters');
        if (countersRef) {
          deletePromises.push(countersRef.set(data.counters));
        }

        await Promise.all(deletePromises);
        console.log("Semua data transaksi cloud berhasil dibersihkan.");
      } catch (err) {
        console.error("Gagal membersihkan data cloud:", err);
      }
    }

    await savePromise;
  }

  async function resetData() {
    if (!currentTenantId || currentTenantId === 'SUPERADMIN') return;

    // 1. Reset data transaksi lokal
    data.flights = [];
    data.hotels = [];
    data.rentals = [];
    data.tours = [];
    data.umroh = [];
    data.invoices = [];
    data.refunds = [];
    data.journals = [];
    data.expenses = [];
    data.payments = [];
    data.customers = [];
    data.fraudLogs = [];
    data.vendor_deposits = [];
    
    // 2. Reset data master lokal
    data.vendors = [];
    data.coa = [...DEFAULT_COA]; // Kembalikan ke COA default dengan saldo 0
    
    // 3. Reset pengaturan lokal ke kosong/default
    data.settings = { 
      companyName: '', 
      companyAddress: '', 
      companyPhone: '', 
      companyEmail: '', 
      companyLogo: '', 
      taxEnabled: true, 
      taxRate: 11 
    };

    // 4. Reset counters lokal
    data.counters = { 
      flight: 0, hotel: 0, rental: 0, tour: 0, umroh: 0, invoice: 0, 
      refund: 0, journal: 0, expense: 0, payment: 0, customer: 0,
      vendor: 0, airline: 0, airport: 0, db_hotel: 0, db_rental: 0, user: 1
    };

    const savePromise = saveData(data);

    // 5. Hapus data dari Firestore online (jika terkoneksi)
    const db = window.TMS && window.TMS.Firebase ? window.TMS.Firebase.getDB() : null;
    if (db) {
      const collectionsToClear = ['flights', 'hotels', 'rentals', 'tours', 'umroh', 'invoices', 'refunds', 'journals', 'expenses', 'payments', 'customers', 'vendors', 'vendor_deposits', 'coa'];
      try {
        console.log("Memulai reset total data perusahaan di Firestore...");
        
        // Buat batch delete untuk setiap koleksi
        const deletePromises = collectionsToClear.map(async (collName) => {
          const qRef = getQueryRef(collName);
          if (qRef) {
            const snap = await qRef.get();
            const docs = snap.docs;
            if (docs.length > 0) {
              const batch = db.batch();
              docs.forEach(doc => {
                batch.delete(doc.ref);
              });
              await batch.commit();
              console.log(`Koleksi cloud ${collName} berhasil dibersihkan.`);
            }
          }
        });

        // Setel ulang konfigurasi pengaturan (settings) dan counters di cloud
        const configRef = getDbRef('settings').doc('config');
        if (configRef) {
          deletePromises.push(configRef.set(data.settings));
        }

        const countersRef = getDbRef('settings').doc('counters');
        if (countersRef) {
          deletePromises.push(countersRef.set(data.counters));
        }

        // Tulis ulang COA default ke Firestore agar tenant baru punya COA awal
        data.coa.forEach(acc => {
          const coaRef = getDbRef('coa').doc(acc.id);
          deletePromises.push(coaRef.set(acc));
        });

        await Promise.all(deletePromises);
        console.log("Reset total data perusahaan di Firestore berhasil diselesaikan.");
      } catch (err) {
        console.error("Gagal melakukan reset cloud Firestore:", err);
      }
    }

    await savePromise;
  }

  function clearSessionData() {
    // Unsubscribe all active listeners to prevent leaks between tenant logins
    if (window.TMS && window.TMS.activeListeners) {
      window.TMS.activeListeners.forEach(unsub => {
        if (typeof unsub === 'function') {
          try { unsub(); } catch(e) {}
        }
      });
      window.TMS.activeListeners = [];
    }

    data.flights = [];
    data.hotels = [];
    data.rentals = [];
    data.tours = [];
    data.umroh = [];
    data.invoices = [];
    data.refunds = [];
    data.journals = [];
    data.expenses = [];
    data.payments = [];
    data.customers = [];
    data.fraudLogs = [];
    data.vendors = [];
    data.vendor_deposits = [];
    data.coa = [...DEFAULT_COA];
    
    // Kembalikan users ke kosong
    data.users = [];

    data.settings = { 
      companyName: '', 
      companyAddress: '', 
      companyPhone: '', 
      companyEmail: '', 
      companyLogo: '', 
      taxEnabled: true, 
      taxRate: 11 
    };
    data.counters = { 
      flight: 0, hotel: 0, rental: 0, tour: 0, umroh: 0, invoice: 0, 
      refund: 0, journal: 0, expense: 0, payment: 0, customer: 0,
      vendor: 0, airline: 0, airport: 0, db_hotel: 0, db_rental: 0, user: 1
    };
    saveData(data);
  }

  // Dashboard stats
  function getStats() {
    const flights = data.flights || [];
    const hotels = data.hotels || [];
    const rentals = data.rentals || [];
    const tours = data.tours || [];
    const umrohs = data.umroh || [];
    const invoices = data.invoices || [];

    const totalRevenue = [...flights, ...hotels, ...rentals, ...tours, ...umrohs].reduce((s, b) => s + (b.sellingPrice || 0), 0);
    const totalCost = [...flights, ...hotels, ...rentals, ...tours, ...umrohs].reduce((s, b) => s + (b.costPrice || 0), 0);
    const paidInvoices = invoices.filter(i => i.paymentStatus === 'paid');
    const unpaidInvoices = invoices.filter(i => i.paymentStatus === 'unpaid');

    return {
      totalFlights: flights.length,
      totalHotels: hotels.length,
      totalRentals: rentals.length,
      totalTours: tours.length,
      totalUmroh: umrohs.length,
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

  function getInventoryAlerts() {
    return (data.inventory || []).filter(item => (item.stock || 0) <= (item.minThreshold || 0));
  }

  function updateInventoryStock(code, delta) {
    const item = (data.inventory || []).find(i => i.code === code);
    if (item) {
      item.stock = Math.max(0, (item.stock || 0) + delta);
      item.updatedAt = new Date().toISOString();
      saveData(data);
      if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) {
        getDbRef('inventory').doc(item.id).set(item).catch(console.error);
      }
    }
  }

  function setInventoryStockAndThreshold(code, stock, threshold) {
    const item = (data.inventory || []).find(i => i.code === code);
    if (item) {
      item.stock = Math.max(0, stock);
      item.minThreshold = Math.max(0, threshold);
      item.updatedAt = new Date().toISOString();
      saveData(data);
      if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) {
        getDbRef('inventory').doc(item.id).set(item).catch(console.error);
      }
    }
  }

  return {
    getAll, getById, add, update, remove,
    addMasterPackage, updateMasterPackage, removeMasterPackage, seedMasterPackagesIfEmpty,
    getCOA, getCOAByType, getCOAByCode, addCOA, updateCOA, removeCOA,
    updateCOABalance, recalculateCOA, calculatePeriodBalances,
    generateId, generateCode, formatCurrency, formatDate, formatDateTime, parseNumber, formatInt,
    getSettings, updateSettings, getStats, resetData, clearAllData, clearSessionData, DEFAULT_COA,
    injectPremiumSamplesIfMissing,
    tokenize, encryptPayload, decryptPayload, runFraudCheck, getFraudLogs, getFraudAlert, resolveFraudLog,
    getInventoryAlerts, updateInventoryStock, setInventoryStockAndThreshold,
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
    setCurrentTenantId, getTenantId,
    getSuperadminConfig: () => data.superadmin_config || { username: 'superadmin', password: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9' },
    setSuperadminConfigLocal: (config) => {
      data.superadmin_config = { ...data.superadmin_config, ...config };
      saveData(data);
    },
    updateSuperadminConfig: (config) => {
      data.superadmin_config = { ...data.superadmin_config, ...config };
      saveData(data);
      if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) {
        window.TMS.Firebase.getDB().collection('settings').doc('superadmin').set(data.superadmin_config).catch(console.error);
      }
    }
  };
})();

// window.TMS already set above
