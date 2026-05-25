/* ========================================
   TMS - Authentication & Authorization
   ======================================== */
window.TMS = window.TMS || {};

TMS.Auth = (() => {
  
  async function login(username, password) {
    let users = TMS.Store.getUsers();
    
    // Fallback: fetch directly from Firebase if store hasn't initialized users yet
    if ((!users || users.length === 0) && window.TMS && window.TMS.Firebase && window.TMS.Firebase.getDB()) {
      try {
        const snap = await window.TMS.Firebase.getDB().collection('users').get();
        users = snap.docs.map(d => d.data());
      } catch (e) {
        console.error("Gagal mengambil users dari Firebase", e);
      }
    }

    const user = users.find(u => u.username === username && u.password === password);
    
    if (username === 'superadmin' && password === 'admin123') {
      const su = { id: 'su_1', username: 'superadmin', name: 'Super Administrator', role: 'superadmin', tenantId: 'SUPERADMIN', permissions: ['all'] };
      TMS.Store.setCurrentUser(su);
      TMS.Store.setCurrentTenantId('SUPERADMIN');
      return { success: true, user: su };
    }

    if (user) {
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
      'refunds': 'flight',
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
      'refund': 'flights',
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
            <img src="${logoSrc}?v=4" style="width:180px;height:auto;object-fit:contain;margin:0 auto 16px;display:block;border-radius:0;background:transparent;" alt="Logo">
            <h1 style="font-size:24px;font-weight:800;margin-bottom:8px;color:var(--text-main);">${compName}</h1>
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
    
    // Beri sedikit delay agar user merasa ada proses
    setTimeout(async () => {
      const result = await login(userEl.value, passEl.value);
      
      if (result.success) {
        TMS.App.toast('Selamat datang kembali, ' + result.user.name);
        
        // Inisialisasi Firebase untuk tenant ini
        if (TMS.Store.initFirebase) {
          await TMS.Store.initFirebase();
        }

        TMS.App.handleRoute();
      } else {
        TMS.App.toast(result.message, 'error');
        btn.disabled = false;
        btn.innerHTML = 'Masuk ke Sistem';
      }
    }, 600);
  }

  return { login, logout, checkAccess, renderLogin, handleLoginSubmit };
})();
