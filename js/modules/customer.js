/* ========================================
   TMS - Customer Management Module
   ======================================== */
TMS.Customer = (() => {
  const S = TMS.Store;

  function renderList() {
    const customers = S.getAll('customers');
    return `
    <div class="fade-in">
      <div class="toolbar">
        <div class="search-box"><i data-lucide="search"></i><input type="text" placeholder="Cari pelanggan..." oninput="TMS.Customer.search(this.value)"></div>
        <button class="btn btn-primary" onclick="TMS.Customer.showForm()"><i data-lucide="user-plus"></i> Tambah Pelanggan</button>
      </div>
      <div class="card">
        <div class="table-container">
          <table>
            <thead><tr><th>ID</th><th>Nama Pelanggan</th><th>Email</th><th>Telepon</th><th>Identitas</th><th>Aksi</th></tr></thead>
            <tbody id="customerBody">${renderRows(customers)}</tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="modal-overlay" id="customerModal">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title" id="customerModalTitle">Data Pelanggan</span>
          <button class="modal-close" onclick="TMS.Customer.closeForm()">✕</button>
        </div>
        <div class="modal-body" id="customerModalBody">${renderForm()}</div>
      </div>
    </div>`;
  }

  function renderRows(customers) {
    if (!customers.length) return `<tr><td colspan="6" class="table-empty">Belum ada data pelanggan</td></tr>`;
    return customers.map(c => `<tr>
      <td><span class="font-mono text-primary">${c.customerCode}</span></td>
      <td><strong>${c.name}</strong></td>
      <td>${c.email || '-'}</td>
      <td>${c.phone || '-'}</td>
      <td><span class="text-muted" style="font-size:11px;">${c.idType || ''} ${c.idNumber || ''}</span></td>
      <td>
      <td>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline" onclick="TMS.Customer.showDetail('${c.id}')" title="Detail"><i data-lucide="eye"></i></button>
          <button class="btn btn-sm btn-outline" onclick="TMS.Customer.showForm('${c.id}')" title="Edit"><i data-lucide="edit-2"></i></button>
          <button class="btn btn-sm btn-danger" onclick="TMS.Customer.delete('${c.id}')" title="Hapus"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
      </td>
    </tr>`).join('');
  }

  function renderForm(data = {}) {
    return `
    <form id="customerForm" onsubmit="TMS.Customer.save(event)" data-id="${data.id || ''}">
      <div class="form-group">
        <label class="form-label">Nama Lengkap *</label>
        <input class="form-control" name="name" value="${data.name || ''}" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-control" type="email" name="email" value="${data.email || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Telepon</label>
          <input class="form-control" name="phone" value="${data.phone || ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tipe Identitas</label>
          <select class="form-control" name="idType">
            <option value="KTP" ${data.idType === 'KTP' ? 'selected' : ''}>KTP</option>
            <option value="Paspor" ${data.idType === 'Paspor' ? 'selected' : ''}>Paspor</option>
            <option value="SIM" ${data.idType === 'SIM' ? 'selected' : ''}>SIM</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">No. Identitas</label>
          <input class="form-control" name="idNumber" value="${data.idNumber || ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Alamat</label>
        <textarea class="form-control" name="address" rows="2">${data.address || ''}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="TMS.Customer.closeForm()">Batal</button>
        <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Simpan Pelanggan</button>
      </div>
    </form>`;
  }

  function showForm(id) {
    const data = id ? S.getById('customers', id) : {};
    const modal = document.getElementById('customerModal');
    modal.querySelector('.modal-title').textContent = id ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru';
    modal.querySelector('.modal-body').innerHTML = renderForm(data);
    modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function closeForm() { document.getElementById('customerModal').classList.remove('active'); }

  function showDetail(id) {
    const c = S.getById('customers', id);
    if (!c) return;
    const modal = document.getElementById('customerModal');
    modal.querySelector('.modal-title').textContent = 'Detail Profil Pelanggan';
    modal.querySelector('.modal-body').innerHTML = renderDetail(c);
    modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function renderDetail(c) {
    const bookingsCount = [
      ...S.getAll('flights').filter(f => f.passengers && f.passengers.some(p => p.idNumber === c.idNumber)),
      ...S.getAll('hotels').filter(h => h.guestName === c.name),
      ...S.getAll('rentals').filter(r => r.renterName === c.name)
    ].length;

    return `
    <div class="detail-view">
      <div class="detail-header mb-2" style="border-bottom:1px solid var(--border-color);padding-bottom:1rem;">
        <div class="flex-between">
          <div style="display:flex;align-items:center;gap:1rem;">
            <div style="width:48px;height:48px;border-radius:50%;background:var(--primary-light);color:white;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;">
              ${c.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 class="mb-0" style="color:var(--primary-light);">${c.name}</h3>
              <div class="text-muted">${c.customerCode}</div>
            </div>
          </div>
          <div class="text-right">
            <span class="badge badge-success">ACTIVE</span>
            <div class="mt-1" style="font-size:11px;color:var(--text-muted);">Joined ${S.formatDate(c.createdAt)}</div>
          </div>
        </div>
      </div>

      <div class="form-row mb-2">
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">KONTAK</div>
          <div style="font-weight:600;"><i data-lucide="mail" style="width:12px;height:12px;margin-right:4px;vertical-align:middle;"></i> ${c.email || '-'}</div>
          <div style="font-weight:600;"><i data-lucide="phone" style="width:12px;height:12px;margin-right:4px;vertical-align:middle;"></i> ${c.phone || '-'}</div>
        </div>
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">IDENTITAS</div>
          <div style="font-weight:600;">${c.idType || 'ID'}: ${c.idNumber || '-'}</div>
        </div>
      </div>

      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="map-pin" style="width:14px;height:14px;vertical-align:middle;"></i> ALAMAT</div>
      <div class="card mb-2 p-1" style="background:var(--bg-secondary);">
        ${c.address || 'Alamat tidak tersedia'}
      </div>

      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="briefcase" style="width:14px;height:14px;vertical-align:middle;"></i> RIWAYAT SINGKAT</div>
      <div class="card p-1" style="background:var(--bg-secondary);display:flex;gap:1rem;align-items:center;">
        <div style="text-align:center;flex:1;border-right:1px solid var(--border-color);">
          <div style="font-size:24px;font-weight:800;color:var(--primary-light);">${bookingsCount}</div>
          <div style="font-size:10px;color:var(--text-muted);">TOTAL BOOKING</div>
        </div>
        <div style="flex:2;font-size:12px;color:var(--text-muted);">
          Pelanggan ini telah melakukan ${bookingsCount} transaksi melalui sistem Travel Go.
        </div>
      </div>
      
      <div class="form-actions mt-2">
        <button class="btn btn-outline" onclick="TMS.Customer.closeForm()">Tutup</button>
        <button class="btn btn-primary" onclick="TMS.Customer.showForm('${c.id}')"><i data-lucide="edit-2"></i> Edit Profil</button>
      </div>
    </div>`;
  }

  function save(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    const id = e.target.dataset.id;
    if (id) {
      S.update('customers', id, data);
      TMS.App.toast('Data pelanggan diperbarui', 'success');
    } else {
      data.customerCode = S.generateCode('customer');
      S.add('customers', data);
      TMS.App.toast('Pelanggan baru ditambahkan', 'success');
    }
    closeForm();
    TMS.App.navigate('customers');
  }

  function del(id) {
    if (!confirm('Hapus pelanggan ini?')) return;
    S.remove('customers', id);
    TMS.App.navigate('customers');
    TMS.App.toast('Pelanggan dihapus', 'warning');
  }

  function search(q) {
    const customers = S.getAll('customers').filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.email?.toLowerCase().includes(q.toLowerCase()));
    document.getElementById('customerBody').innerHTML = renderRows(customers);
    if (window.lucide) lucide.createIcons();
  }

  return { renderList, showForm, closeForm, save, delete: del, search, showDetail };
})();
