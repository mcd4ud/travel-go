/* ========================================
   TMS - User Management Module
   ======================================== */
window.TMS = window.TMS || {};

TMS.UserMgmt = (() => {
  
  const MODULE_LIST = [
    // Section: Reservasi & Dokumen
    { id: 'flight', name: 'E-Tiket Pesawat', section: 'Reservasi & Dokumen' },
    { id: 'hotel', name: 'Voucher Hotel', section: 'Reservasi & Dokumen' },
    { id: 'rental', name: 'Voucher Rental', section: 'Reservasi & Dokumen' },
    { id: 'tour', name: 'Paket Wisata', section: 'Reservasi & Dokumen' },
    { id: 'invoice', name: 'Invoice', section: 'Reservasi & Dokumen' },
    { id: 'verify', name: 'Verifikasi Bayar', section: 'Reservasi & Dokumen' },
    { id: 'customer', name: 'Manajemen Pelanggan', section: 'Reservasi & Dokumen' },
    { id: 'vendor', name: 'Manajemen Vendor', section: 'Reservasi & Dokumen' },
    { id: 'database', name: 'Manajemen Database', section: 'Reservasi & Dokumen' },
    
    // Section: Akuntansi
    { id: 'coa', name: 'Chart of Accounts', section: 'Akuntansi' },
    { id: 'expenses', name: 'Beban Operasional', section: 'Akuntansi' },
    { id: 'journals', name: 'Jurnal Umum', section: 'Akuntansi' },
    { id: 'accounting', name: 'Laporan Keuangan', section: 'Akuntansi' },
    
    // Section: Admin & Keamanan
    { id: 'fraud', name: 'Fraud Management', section: 'Admin & Keamanan' },
    { id: 'usermgmt', name: 'Manajemen User', section: 'Admin & Keamanan' },
    { id: 'settings', name: 'Pengaturan Sistem', section: 'Admin & Keamanan' }
  ];

  function renderPermissions() {
    const sections = ['Reservasi & Dokumen', 'Akuntansi', 'Admin & Keamanan'];
    return sections.map(sec => {
      const items = MODULE_LIST.filter(m => m.section === sec);
      return `
        <div style="margin-bottom:16px;">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px; letter-spacing:0.5px; border-bottom:1px solid var(--border-color); padding-bottom:4px;">${sec}</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            ${items.map(m => `
              <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; cursor:pointer; padding:6px 10px; background:var(--bg-app); border:1px solid var(--border-color); border-radius:8px; transition: all 0.2s; user-select:none;">
                <input type="checkbox" name="permissions" value="${m.id}" style="accent-color:var(--primary);">
                <span>${m.name}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  function render() {
    const users = TMS.Store.getUsers();
    
    return `
      <div class="animate-fade-in">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
          <div>
            <h2 style="font-size:20px; font-weight:800;">Manajemen User & Hak Akses</h2>
            <p class="text-muted">Kelola siapa saja yang bisa mengakses sistem dan batasi modul mereka.</p>
          </div>
          <button class="btn btn-primary" onclick="TMS.UserMgmt.showAddModal()">
            <i data-lucide="user-plus"></i> Tambah User Baru
          </button>
        </div>

        <div class="card">
          <div class="table-container">
            <table class="table">
            <thead>
              <tr>
                <th>Nama Lengkap</th>
                <th>User ID (Username)</th>
                <th>Role</th>
                <th>Hak Akses Modul</th>
                <th style="text-align:right;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(user => `
                <tr>
                  <td>
                    <div style="display:flex; align-items:center; gap:12px;">
                      <div style="width:32px;height:32px;border-radius:50%;background:var(--bg-primary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;">
                        ${user.name.charAt(0)}
                      </div>
                      <span style="font-weight:600;">${user.name}</span>
                    </div>
                  </td>
                  <td><code>${user.username}</code></td>
                  <td>
                    <span class="badge ${user.role === 'admin' ? 'badge-success' : 'badge-info'}">
                      ${user.role.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div style="display:flex; flex-wrap:wrap; gap:4px; max-width:300px;">
                      ${user.permissions.includes('all') 
                        ? '<span style="font-size:10px; padding:2px 8px; background:var(--bg-primary); border-radius:4px; color:var(--primary); font-weight:600;">SEMUA AKSES</span>'
                        : user.permissions.map(p => {
                            const mod = MODULE_LIST.find(m => m.id === p);
                            let displayName = p;
                            if (mod) {
                              displayName = mod.name;
                            } else {
                              const oldMappings = {
                                'payment': 'Verifikasi & Fraud',
                                'accounting': 'Akuntansi',
                                'usermgmt': 'Manajemen User'
                              };
                              displayName = oldMappings[p] || p;
                            }
                            return `<span style="font-size:10px; padding:2px 8px; background:var(--bg-primary); border-radius:4px;">${displayName}</span>`;
                          }).join('')
                      }
                    </div>
                  </td>
                  <td style="text-align:right;">
                    <button class="btn btn-ghost btn-icon" onclick="TMS.UserMgmt.showEditModal('${user.id}')" title="Edit User">
                      <i data-lucide="edit-3"></i>
                    </button>
                    ${user.role !== 'admin' ? `
                      <button class="btn btn-ghost btn-icon text-danger" onclick="TMS.UserMgmt.deleteUser('${user.id}')" title="Hapus User">
                        <i data-lucide="trash-2"></i>
                      </button>
                    ` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal User -->
      <div class="modal-overlay" id="userModal">
        <div class="modal" style="max-width:500px;">
          <div class="modal-header">
            <span class="modal-title" id="userModalTitle">Tambah User</span>
            <button class="modal-close" onclick="TMS.UserMgmt.closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <form id="userForm">
              <input type="hidden" id="userId">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
                <div>
                  <label class="form-label">Nama Lengkap</label>
                  <input type="text" id="userName" class="form-control" placeholder="Contoh: Budi Santoso" required>
                </div>
                <div>
                  <label class="form-label">Role</label>
                  <select id="userRole" class="form-control" onchange="TMS.UserMgmt.togglePerms()">
                    <option value="staff">Staff / Operator</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                </div>
              </div>
              
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
                <div>
                  <label class="form-label">User ID (Login)</label>
                  <input type="text" id="userUsername" class="form-control" placeholder="budi123" required>
                </div>
                <div>
                  <label class="form-label">Password</label>
                  <input type="password" id="userPassword" class="form-control" placeholder="••••••••" required>
                </div>
              </div>

              <div id="permsSection" style="margin-top: 16px;">
                <label class="form-label" style="display:block; margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px; font-weight:700;">Hak Akses Modul & Fitur Sidebar</label>
                ${renderPermissions()}
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="TMS.UserMgmt.closeModal()">Batal</button>
            <button class="btn btn-primary" onclick="TMS.UserMgmt.saveUser()">Simpan User</button>
          </div>
          </div>
        </div>
      </div>
    `;
  }

  function showAddModal() {
    document.getElementById('userModalTitle').textContent = 'Tambah User Baru';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('userModal').classList.add('active');
    togglePerms();
    if (window.lucide) lucide.createIcons();
  }

  function showEditModal(id) {
    const user = TMS.Store.getUsers().find(u => u.id === id);
    if (!user) return;

    document.getElementById('userModalTitle').textContent = 'Edit User';
    document.getElementById('userId').value = user.id;
    document.getElementById('userName').value = user.name;
    document.getElementById('userUsername').value = user.username;
    document.getElementById('userPassword').value = user.password;
    document.getElementById('userRole').value = user.role;
    
    // Set checkboxes
    const checks = document.querySelectorAll('input[name="permissions"]');
    checks.forEach(c => {
      let hasPerm = user.permissions.includes(c.value) || user.permissions.includes('all');
      
      // Backward compatibility check for old permission keys
      if (!hasPerm) {
        if (c.value === 'verify' && user.permissions.includes('payment')) hasPerm = true;
        if (c.value === 'fraud' && user.permissions.includes('payment')) hasPerm = true;
        if (c.value === 'journals' && user.permissions.includes('accounting')) hasPerm = true;
        if (c.value === 'accounting' && user.permissions.includes('accounting')) hasPerm = true;
      }
      
      c.checked = hasPerm;
    });

    document.getElementById('userModal').classList.add('active');
    togglePerms();
  }

  function closeModal() {
    document.getElementById('userModal').classList.remove('active');
  }

  function togglePerms() {
    const role = document.getElementById('userRole').value;
    const permsSection = document.getElementById('permsSection');
    permsSection.style.opacity = role === 'admin' ? '0.5' : '1';
    permsSection.style.pointerEvents = role === 'admin' ? 'none' : 'auto';
  }

  function saveUser() {
    const id = document.getElementById('userId').value;
    const name = document.getElementById('userName').value;
    const username = document.getElementById('userUsername').value;
    const password = document.getElementById('userPassword').value;
    const role = document.getElementById('userRole').value;
    
    if (!name || !username || !password) {
      TMS.App.toast('Mohon lengkapi data user!', 'warning');
      return;
    }

    let permissions = [];
    if (role === 'admin') {
      permissions = ['all'];
    } else {
      const checks = document.querySelectorAll('input[name="permissions"]:checked');
      permissions = Array.from(checks).map(c => c.value);
    }

    const userData = { name, username, password, role, permissions };

    if (id) {
      TMS.Store.updateUser(id, userData);
      TMS.App.toast('Data user berhasil diperbarui');
    } else {
      TMS.Store.addUser(userData);
      TMS.App.toast('User baru berhasil ditambahkan');
    }

    closeModal();
    TMS.App.handleRoute(); // Refresh view
  }

  function deleteUser(id) {
    if (confirm('Apakah Anda yakin ingin menghapus user ini?')) {
      TMS.Store.removeUser(id);
      TMS.App.toast('User telah dihapus');
      TMS.App.handleRoute();
    }
  }

  return { render, showAddModal, showEditModal, closeModal, saveUser, deleteUser, togglePerms };
})();
