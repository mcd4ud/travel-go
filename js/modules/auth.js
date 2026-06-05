/* ========================================
   TMS - Authentication & Authorization
   ======================================== */
window.TMS = window.TMS || {};

TMS.Auth = (() => {
  
  async function hashPassword(password) {
    if (!password) return '';
    
    // Jika kata sandi sudah berupa hash SHA-256 (64 karakter heksadesimal), kembalikan langsung
    if (/^[0-9a-f]{64}$/i.test(password)) {
      return password;
    }
    
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch(e) {
      console.warn("Natif crypto.subtle gagal, menggunakan fallback hashing sederhana (insecure but offline compatible):", e);
      // Fallback: DJB2 hash sederhana (agar tetap berfungsi jika dalam lingkungan non-HTTPS tanpa crypto API)
      let hash = 5381;
      for (let i = 0; i < password.length; i++) {
        hash = ((hash << 5) + hash) + password.charCodeAt(i);
      }
      return (hash >>> 0).toString(16).padStart(16, '0');
    }
  }

  async function login(username, password) {
    let user = null;
    let isPlaintextMatch = false;
    const hashedEnteredPassword = await hashPassword(password);

    // 1. Coba cari langsung dari Firestore (Source of truth) untuk seluruh tenant
    if (window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) {
      try {
        const snap = await window.TMS.Firebase.getDB().collection('users').where('username', '==', username).get();
        const firestoreUsers = snap.docs.map(d => d.data());
        
        // Cari yang cocok dengan hash
        user = firestoreUsers.find(u => u.password === hashedEnteredPassword);
        
        // Jika tidak ditemukan, coba cari yang cocok dengan plain text (untuk migrasi otomatis)
        if (!user) {
          user = firestoreUsers.find(u => u.password === password);
          if (user) {
            isPlaintextMatch = true;
          }
        }
      } catch (e) {
        console.error("Gagal melakukan query user langsung dari Firestore:", e);
      }
    }

    // 2. Jika offline / Firestore gagal, gunakan data lokal sebagai fallback
    if (!user) {
      let localUsers = TMS.Store.getUsers();
      user = localUsers.find(u => u.username === username && u.password === hashedEnteredPassword);
      if (!user) {
        user = localUsers.find(u => u.username === username && u.password === password);
        if (user) {
          isPlaintextMatch = true;
        }
      }
    }
    
    // 3. Khusus superadmin bypass (menggunakan kredensial superadmin dinamis dari Store)
    const saConfig = TMS.Store.getSuperadminConfig();
    const isSaUsernameMatch = username === saConfig.username;
    let isSaPasswordMatch = hashedEnteredPassword === saConfig.password;
    let isSaPlaintextMatch = false;
    
    if (!isSaPasswordMatch && password === saConfig.password) {
      isSaPasswordMatch = true;
      isSaPlaintextMatch = true;
    }

    if (isSaUsernameMatch && isSaPasswordMatch) {
      if (isSaPlaintextMatch) {
        try {
          TMS.Store.updateSuperadminConfig({ password: hashedEnteredPassword });
          console.log("Kata sandi superadmin berhasil dimigrasikan ke hash SHA-256.");
        } catch(err) {
          console.warn("Gagal menyimpan migrasi password superadmin secara asinkron:", err);
        }
      }
      const su = { id: 'su_1', username: saConfig.username, name: 'Super Administrator', role: 'superadmin', tenantId: 'SUPERADMIN', permissions: ['all'] };
      TMS.Store.setCurrentUser(su);
      TMS.Store.setCurrentTenantId('SUPERADMIN');
      return { success: true, user: su };
    }

    if (user) {
      // Jika login berhasil menggunakan password plain text, lakukan migrasi otomatis ke hash
      if (isPlaintextMatch) {
        try {
          TMS.Store.updateUser(user.id, { password: hashedEnteredPassword });
          user.password = hashedEnteredPassword;
          console.log(`User ${username} berhasil dimigrasikan ke password hash SHA-256.`);
        } catch(err) {
          console.warn("Gagal menyimpan migrasi password secara asinkron:", err);
        }
      }

      // Hilangkan password dari session demi keamanan
      const sessionUser = { ...user };
      delete sessionUser.password;
      
      TMS.Store.setCurrentUser(sessionUser);
      TMS.Store.setCurrentTenantId(sessionUser.tenantId || 'SUPERADMIN');
      return { success: true, user: sessionUser };
    }
    return { success: false, message: 'ID User atau Password salah!' };
  }

  function logout() {
    if (confirm('Apakah Anda yakin ingin keluar dari sistem?')) {
      TMS.Store.setCurrentUser(null);
      TMS.Store.setCurrentTenantId(null);
      TMS.Store.clearSessionData(); // Bersihkan seluruh memori & local file pada saat keluar
      // Bersihkan hash untuk kembali ke dashboard saat login nanti
      window.location.hash = '';
      TMS.App.handleRoute();
    }
  }

  function checkAccess(permissionKey) {
    const user = TMS.Store.getCurrentUser();
    if (!user) return false;
    
    // Admin punya akses ke semuanya
    if (user.role === 'admin' || (user.permissions && user.permissions.includes('all'))) {
      return true;
    }
    
    if (!user.permissions) return false;
    
    const key = permissionKey.toLowerCase();
    
    // 1. Cek izin spesifik langsung
    if (user.permissions.includes(key)) return true;
    
    // 2. Pemetaan dua arah (Bidirectional mappings) untuk backward & forward compatibility
    const mapping = {
      // Jika sistem mengecek page key (flights, verify, dll)
      'flights': 'flight',
      'refunds': 'refund',
      'umroh': 'umroh',
      'hotels': 'hotel',
      'rentals': 'rental',
      'tours': 'tour',
      'invoices': 'invoice',
      'customers': 'customer',
      'vendors': 'vendor',
      'database': 'database',
      'coa': 'coa',
      'expenses': 'expenses',
      'journals': 'accounting',
      'verify': 'payment',
      'fraud': 'payment',
      'users': 'usermgmt',
      
      // Jika sistem mengecek module name (flight, payment, dll)
      'flight': 'flights',
      'refund': 'refunds',
      'umroh': 'umroh',
      'hotel': 'hotels',
      'rental': 'rentals',
      'tour': 'tours',
      'invoice': 'invoices',
      'customer': 'customers',
      'vendor': 'vendors',
    };
    
    const mapped = mapping[key];
    if (mapped && user.permissions.includes(mapped)) return true;
    
    // 3. Pengecekan multi-izin (jika mengecek module induk, periksa apakah user punya salah satu sub-fiturnya)
    if (key === 'payment' && (user.permissions.includes('verify') || user.permissions.includes('fraud'))) return true;
    if (key === 'accounting' && (user.permissions.includes('journals') || user.permissions.includes('accounting'))) return true;
    if (key === 'usermgmt' && (user.permissions.includes('users') || user.permissions.includes('usermgmt'))) return true;
    
    return false;
  }

  function renderLogin() {
    const s = TMS.Store.getSettings();
    const logoSrc = 'img/logo.png';
    const compName = s.companyName || 'Travel Go';

    return `
      <div class="login-screen" style="position:fixed;top:0;left:0;width:100%;height:100%;background:var(--bg-sidebar);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;background-image: radial-gradient(circle at 20% 30%, rgba(184, 158, 103, 0.05) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(184, 158, 103, 0.05) 0%, transparent 40%);">
        <div class="card" style="width:100%;max-width:380px;padding:40px;box-shadow:0 20px 50px rgba(0,0,0,0.3);border-radius:24px;background:var(--bg-card);border:2px solid var(--primary);">
          <div style="text-align:center;margin-bottom:32px;">
            <img src="${logoSrc}?v=5" width="180" height="180" style="width:180px;height:180px;object-fit:contain;margin:0 auto 16px;display:block;border-radius:0;background:transparent;" alt="Logo">
            <p class="text-muted" style="font-size:14px;">Silakan login untuk mengakses sistem</p>
          </div>
          
          <form id="loginForm" onsubmit="event.preventDefault(); TMS.Auth.handleLoginSubmit()">
            <div style="margin-bottom:20px;">
              <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-main);">User ID</label>
              <div style="position:relative;">
                <input type="text" id="loginUsername" class="form-control" placeholder="Masukkan User ID" required style="padding-left:40px;">
                <i data-lucide="user" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:18px;height:18px;color:var(--text-muted);"></i>
              </div>
            </div>
            
            <div style="margin-bottom:24px;">
              <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-main);">Password</label>
              <div style="position:relative;">
                <input type="password" id="loginPassword" class="form-control" placeholder="••••••••" required style="padding-left:40px;">
                <i data-lucide="lock" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:18px;height:18px;color:var(--text-muted);"></i>
              </div>
            </div>
            
            <button type="submit" id="loginBtn" class="btn btn-primary" style="width:100%;height:48px;font-weight:700;border-radius:12px;">Masuk ke Sistem</button>
            
            <div style="margin-top:24px;padding:12px;background:var(--bg-app);border-radius:12px;font-size:12px;color:var(--text-muted);text-align:center;border:1px solid var(--border-color);">
              <i data-lucide="shield-check" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i>
              Sistem Manajemen Terenkripsi
            </div>
          </form>
        </div>
      </div>
    `;
  }

  async function handleLoginSubmit() {
    const userEl = document.getElementById('loginUsername');
    const passEl = document.getElementById('loginPassword');
    const btn = document.getElementById('loginBtn');
    
    if (btn.disabled) return;
    
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner-sm"></div> Memproses...';
    
    // Langsung proses tanpa delay untuk respon cepat
    const result = await login(userEl.value, passEl.value);
    
    if (result.success) {
      TMS.App.toast('Selamat datang kembali, ' + result.user.name);
      
      // Inisialisasi Firebase untuk tenant ini
      if (TMS.Store.initFirebase) {
        TMS.Store.initFirebase().then(() => {
          TMS.App.handleRoute();
        });
      } else {
        TMS.App.handleRoute();
      }
    } else {
      TMS.App.toast(result.message, 'error');
      btn.disabled = false;
      btn.innerHTML = 'Masuk ke Sistem';
    }
  }

  return { login, logout, checkAccess, renderLogin, handleLoginSubmit, hashPassword };
})();
