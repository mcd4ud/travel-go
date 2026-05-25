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
          <button class="btn btn-primary" onclick="TMS.SuperAdmin.showAddCompany()"><i data-lucide="plus"></i> Tambah Perusahaan</button>
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
      <div class="modal fade-in" id="saModal">
        <div class="modal-content" style="max-width:500px;">
          <div class="modal-header">
            <h3>Tambah Perusahaan Baru</h3>
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
    const name = document.getElementById('sa_compName').value;
    const id = document.getElementById('sa_compId').value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const user = document.getElementById('sa_compUser').value;
    const pass = document.getElementById('sa_compPass').value;
    
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
      await db.collection('users').doc(userId).set({
        id: userId,
        username: user,
        password: pass,
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

  return { render, showAddCompany, saveCompany };
})();
