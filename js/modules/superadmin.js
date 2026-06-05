/* ========================================
   TMS - Super Admin Module
   ======================================== */
window.TMS = window.TMS || {};

TMS.SuperAdmin = (() => {
  
  let companies = [];
  let users = [];
  
  async function loadData() {
    const db = window.TMS && window.TMS.Firebase ? window.TMS.Firebase.getDB() : null;
    if (!db) return;
    
    try {
      const compSnap = await db.collection('companies').get();
      companies = compSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const userSnap = await db.collection('users').get();
      users = userSnap.docs.map(d => d.data());
      
      document.getElementById('superadmin-content').innerHTML = renderContent();
      if (window.lucide) lucide.createIcons();
    } catch (e) {
      console.error(e);
      document.getElementById('superadmin-content').innerHTML = '<div class="alert alert-danger">Gagal memuat data.</div>';
    }
  }

  function render() {
    setTimeout(loadData, 100);
    return `
      <div class="fade-in">
        <div class="toolbar">
          <div>
            <div class="card-title">Super Admin Dashboard</div>
            <div class="card-subtitle">Kelola Perusahaan / Tenant</div>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <button class="btn btn-outline" onclick="TMS.SuperAdmin.showSettings()"><i data-lucide="user-cog"></i> Kredensial Super Admin</button>
            <button class="btn btn-primary" onclick="TMS.SuperAdmin.showAddCompany()"><i data-lucide="plus"></i> Tambah Perusahaan</button>
          </div>
        </div>
        <div id="superadmin-content">
          <div class="spinner"></div> Memuat data...
        </div>
      </div>
    `;
  }

  function renderContent() {
    if (companies.length === 0) {
      return `<div class="card"><div class="table-empty">Belum ada perusahaan yang terdaftar.</div></div>`;
    }
    
    return `
      <div class="grid-3" style="margin-bottom: 24px;">
        <div class="card stat-card">
          <div class="stat-icon"><i data-lucide="building"></i></div>
          <div class="stat-value">${companies.length}</div>
          <div class="stat-label">Total Perusahaan</div>
        </div>
        <div class="card stat-card">
          <div class="stat-icon"><i data-lucide="users"></i></div>
          <div class="stat-value">${users.filter(u => u.role !== 'superadmin').length}</div>
          <div class="stat-label">Total Pengguna</div>
        </div>
      </div>
      <div class="card">
        <div class="table-container">
          <table>
            <thead><tr><th>ID</th><th>Nama Perusahaan</th><th>Status</th><th>Total Pengguna</th><th>Aksi</th></tr></thead>
            <tbody>
              ${companies.map(c => {
                const compUsers = users.filter(u => u.tenantId === c.id).length;
                return `
                  <tr>
                    <td class="font-mono">${c.id}</td>
                    <td><strong>${c.name}</strong></td>
                    <td><span class="badge badge-${c.isActive ? 'success' : 'danger'}">${c.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
                    <td>${compUsers} User</td>
                    <td>
                      <button class="btn btn-sm btn-outline" onclick="TMS.SuperAdmin.editCompany('${c.id}')"><i data-lucide="edit"></i> Edit</button>
                      <button class="btn btn-sm btn-outline" onclick="TMS.SuperAdmin.deleteCompany('${c.id}')" style="margin-left: 6px; color: var(--danger); border-color: rgba(220,53,69,0.3);"><i data-lucide="trash"></i> Hapus</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  function showAddCompany() {
    const html = `
      <div class="modal-overlay fade-in active" id="saModal">
        <div class="modal" style="max-width:500px;">
          <div class="modal-header">
            <span class="modal-title">Tambah Perusahaan Baru</span>
            <button class="modal-close" onclick="document.getElementById('saModal').remove()">✕</button>
          </div>
          <div class="modal-body">
            <form onsubmit="event.preventDefault(); TMS.SuperAdmin.saveCompany()">
              <div class="form-group">
                <label>Nama Perusahaan</label>
                <input type="text" id="sa_compName" class="form-control" required>
              </div>
              <div class="form-group">
                <label>ID Perusahaan (Kecil, tanpa spasi)</label>
                <input type="text" id="sa_compId" class="form-control" required placeholder="contoh: travelku">
              </div>
              <div class="form-group">
                <label>Admin Username (Untuk Login awal)</label>
                <input type="text" id="sa_compUser" class="form-control" required>
              </div>
              <div class="form-group">
                <label>Admin Password</label>
                <input type="password" id="sa_compPass" class="form-control" required>
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%;margin-top:16px;">Buat Perusahaan</button>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  async function saveCompany() {
    const saCompIdEl = document.getElementById('sa_compId');
    const saCompNameEl = document.getElementById('sa_compName');
    const saCompUserEl = document.getElementById('sa_compUser');
    const saCompPassEl = document.getElementById('sa_compPass');
    
    const name = saCompNameEl.value;
    const id = saCompIdEl.value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const user = saCompUserEl.value;
    const pass = saCompPassEl.value;
    
    if (companies.find(c => c.id === id)) {
      alert("ID Perusahaan sudah digunakan!"); return;
    }
    
    const db = window.TMS && window.TMS.Firebase ? window.TMS.Firebase.getDB() : null;
    if (!db) return;
    
    const btn = document.querySelector('#saModal button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = "Memproses...";
    
    try {
      // 1. Buat company
      await db.collection('companies').doc(id).set({
        name: name,
        isActive: true,
        createdAt: new Date().toISOString()
      });
      
      // 2. Buat user admin awal untuk company tersebut
      const userId = TMS.Store.generateId();
      const hashedPass = await TMS.Auth.hashPassword(pass || 'admin123');
      await db.collection('users').doc(userId).set({
        id: userId,
        username: user,
        password: hashedPass,
        name: 'Admin ' + name,
        role: 'admin',
        tenantId: id,
        permissions: ['all']
      });
      
      document.getElementById('saModal').remove();
      TMS.App.toast('Perusahaan berhasil dibuat!');
      loadData();
    } catch (e) {
      console.error(e);
      alert("Gagal membuat perusahaan");
      btn.disabled = false;
      btn.innerHTML = "Buat Perusahaan";
    }
  }

  function editCompany(id) {
    const comp = companies.find(c => c.id === id);
    if (!comp) return;
    
    // Find the admin user for this company
    const adminUser = users.find(u => u.tenantId === id && u.role === 'admin') || { username: '', password: '' };

    const html = `
      <div class="modal-overlay fade-in active" id="saModal">
        <div class="modal" style="max-width:500px;">
          <div class="modal-header">
            <span class="modal-title">Edit Perusahaan & Admin</span>
            <button class="modal-close" onclick="document.getElementById('saModal').remove()">✕</button>
          </div>
          <div class="modal-body">
            <form onsubmit="event.preventDefault(); TMS.SuperAdmin.updateCompany('${id}', '${adminUser.id || ''}')">
              <div class="form-group">
                <label>Nama Perusahaan</label>
                <input type="text" id="sa_compName" class="form-control" value="${comp.name}" required>
              </div>
              <div class="form-group">
                <label>ID Perusahaan (Tidak dapat diubah)</label>
                <input type="text" class="form-control" value="${comp.id}" disabled style="background: var(--bg-app); cursor: not-allowed;">
              </div>
              <div class="form-group">
                <label>Status Perusahaan</label>
                <select id="sa_compStatus" class="form-control">
                  <option value="true" ${comp.isActive ? 'selected' : ''}>Aktif</option>
                  <option value="false" ${!comp.isActive ? 'selected' : ''}>Nonaktif</option>
                </select>
              </div>
              <div class="form-group" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                <label style="font-weight: bold; color: var(--primary);">Kredensial Admin Perusahaan</label>
              </div>
              <div class="form-group">
                <label>Admin Username</label>
                <input type="text" id="sa_compUser" class="form-control" value="${adminUser.username || ''}" required>
              </div>
              <div class="form-group">
                <label>Admin Password</label>
                <input type="password" id="sa_compPass" class="form-control" placeholder="Biarkan kosong jika tidak diubah">
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%;margin-top:16px;">Simpan Perubahan</button>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  async function updateCompany(id, adminUserId) {
    const saCompNameEl = document.getElementById('sa_compName');
    const saCompStatusEl = document.getElementById('sa_compStatus');
    const saCompUserEl = document.getElementById('sa_compUser');
    const saCompPassEl = document.getElementById('sa_compPass');

    const name = saCompNameEl.value;
    const isActive = saCompStatusEl.value === 'true';
    const user = saCompUserEl.value;
    const pass = saCompPassEl.value;
    
    const db = window.TMS && window.TMS.Firebase ? window.TMS.Firebase.getDB() : null;
    if (!db) return;
    
    const btn = document.querySelector('#saModal button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = "Memproses...";
    
    try {
      // 1. Update company
      await db.collection('companies').doc(id).update({
        name: name,
        isActive: isActive
      });
      
      // 2. Update atau buat user admin
      let uid = adminUserId;
      if (!uid || uid === 'undefined') {
        uid = TMS.Store.generateId();
        const hashedPass = await TMS.Auth.hashPassword(pass || 'admin123');
        await db.collection('users').doc(uid).set({
          id: uid,
          username: user,
          password: hashedPass,
          name: 'Admin ' + name,
          role: 'admin',
          tenantId: id,
          permissions: ['all']
        });
      } else {
        const updateData = {
          username: user,
          name: 'Admin ' + name
        };
        if (pass) {
          updateData.password = await TMS.Auth.hashPassword(pass);
        }
        await db.collection('users').doc(uid).update(updateData);
      }
      
      document.getElementById('saModal').remove();
      TMS.App.toast('Data perusahaan & admin berhasil diperbarui!');
      loadData();
    } catch (e) {
      console.error(e);
      alert("Gagal memperbarui data perusahaan");
      btn.disabled = false;
      btn.innerHTML = "Simpan Perubahan";
    }
  }

  async function deleteCompany(id) {
    const comp = companies.find(c => c.id === id);
    if (!comp) return;
    
    if (confirm(`Apakah Anda yakin ingin menghapus perusahaan "${comp.name}" dan seluruh pengguna (user) miliknya?\nTindakan ini tidak dapat dibatalkan.`)) {
      const db = window.TMS && window.TMS.Firebase ? window.TMS.Firebase.getDB() : null;
      if (!db) return;
      
      try {
        // 1. Hapus perusahaan
        await db.collection('companies').doc(id).delete();
        
        // 2. Hapus seluruh pengguna perusahaan ini
        const compUsers = users.filter(u => u.tenantId === id);
        const deletePromises = compUsers.map(u => db.collection('users').doc(u.id).delete());
        await Promise.all(deletePromises);
        
        TMS.App.toast(`Perusahaan "${comp.name}" dan seluruh penggunanya berhasil dihapus.`);
        loadData();
      } catch (e) {
        console.error(e);
        alert('Gagal menghapus perusahaan');
      }
    }
  }

  function showSettings() {
    const saConfig = TMS.Store.getSuperadminConfig();
    const html = `
      <div class="modal-overlay fade-in active" id="saSettingsModal">
        <div class="modal" style="max-width:400px; padding:24px; border-radius:16px;">
          <div class="modal-header" style="margin-bottom:20px; padding-bottom:12px; border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
            <span class="modal-title" style="font-size:16px; font-weight:700;">⚙️ Kredensial Super Admin</span>
            <button class="modal-close" onclick="document.getElementById('saSettingsModal').remove()">✕</button>
          </div>
          <div class="modal-body">
            <form id="saSettingsForm" onsubmit="event.preventDefault(); TMS.SuperAdmin.saveSettings()">
              <div class="form-group" style="margin-bottom:16px;">
                <label class="form-label" style="display:block;font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-main);">Username Baru</label>
                <input type="text" id="saNewUsername" class="form-control" value="${saConfig.username}" required>
              </div>
              <div class="form-group" style="margin-bottom:20px;">
                <label class="form-label" style="display:block;font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-main);">Password Baru</label>
                <input type="password" id="saNewPassword" class="form-control" placeholder="Biarkan kosong jika tidak diubah">
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%;height:44px;font-weight:700;border-radius:10px;">Simpan Kredensial</button>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    if (window.lucide) lucide.createIcons();
  }

  async function saveSettings() {
    const newUsername = document.getElementById('saNewUsername').value.trim();
    const newPassword = document.getElementById('saNewPassword').value;
    
    if (!newUsername) {
      TMS.App.toast("Username tidak boleh kosong!", "warning");
      return;
    }
    
    const updates = { username: newUsername };
    if (newPassword) {
      updates.password = await TMS.Auth.hashPassword(newPassword);
    }
    
    try {
      TMS.Store.updateSuperadminConfig(updates);
      TMS.App.toast("Kredensial Super Admin berhasil diperbarui!");
      document.getElementById('saSettingsModal').remove();
      TMS.App.handleRoute(); // Refresh view
    } catch(err) {
      console.error(err);
      TMS.App.toast("Gagal memperbarui kredensial!", "error");
    }
  }

  return { render, showAddCompany, saveCompany, editCompany, updateCompany, deleteCompany, showSettings, saveSettings };
})();
