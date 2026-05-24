/* ========================================
   TMS - Chart of Accounts (COA) Module
   ======================================== */
TMS.COA = (() => {
  const S = TMS.Store;

  const TYPE_LABELS = { asset: 'Aset', liability: 'Kewajiban', equity: 'Ekuitas', revenue: 'Pendapatan', cogs: 'BPP', expense: 'Beban' };
  const TYPE_COLORS = { asset: 'badge-primary', liability: 'badge-danger', equity: 'badge-info', revenue: 'badge-success', cogs: 'badge-warning', expense: 'badge-warning' };

  function renderList() {
    const coa = S.getCOA();
    const groups = {};
    coa.forEach(a => { if (!groups[a.type]) groups[a.type] = []; groups[a.type].push(a); });

    return `
    <div class="fade-in">
      <div class="toolbar">
        <div class="search-box"><i data-lucide="search"></i><input type="text" placeholder="Cari kode/nama akun..." oninput="TMS.COA.search(this.value)"></div>
        <button class="btn btn-primary" onclick="TMS.COA.showForm()"><i data-lucide="plus"></i> Tambah Akun</button>
      </div>

      ${Object.keys(TYPE_LABELS).map(type => {
        const accounts = groups[type] || [];
        if (!accounts.length) return '';
        const totalBal = accounts.reduce((s, a) => s + (a.balance || 0), 0);
        return `
        <div class="card mb-2">
          <div class="card-header">
            <div class="flex" style="align-items:center;gap:12px;">
              <span class="badge ${TYPE_COLORS[type]}" style="font-size:13px;padding:6px 14px;">${TYPE_LABELS[type]}</span>
              <span class="text-muted" style="font-size:12px;">${accounts.length} akun</span>
            </div>
            <span style="font-weight:700;color:var(--text-primary);">${S.formatCurrency(totalBal)}</span>
          </div>
          <div class="table-container">
            <table class="coa-table-${type}">
              <thead><tr><th>Kode Akun</th><th>Nama Akun</th><th>Tipe</th><th class="text-right">Saldo</th><th>Default</th><th>Aksi</th></tr></thead>
              <tbody>
                ${accounts.sort((a,b) => a.code.localeCompare(b.code)).map(acc => `<tr>
                  <td><span class="font-mono" style="color:var(--primary-light)">${acc.code}</span></td>
                  <td><strong>${acc.name}</strong></td>
                  <td><span class="badge ${TYPE_COLORS[acc.type]}">${TYPE_LABELS[acc.type]}</span></td>
                  <td class="text-right ${acc.balance > 0 ? 'amount-positive' : ''}">${S.formatCurrency(acc.balance)}</td>
                  <td>${acc.isDefault ? '<span class="badge badge-primary">Sistem</span>' : '<span class="badge" style="background:rgba(255,255,255,0.05)">Custom</span>'}</td>
                  <td><div class="btn-group">
                    <button class="btn btn-sm btn-outline" onclick="TMS.COA.showEditForm('${acc.code}')" title="Edit"><i data-lucide="edit-2"></i></button>
                    ${!acc.isDefault && (acc.balance || 0) === 0 ? `<button class="btn btn-sm btn-danger" onclick="TMS.COA.delete('${acc.code}')" title="Hapus"><i data-lucide="trash-2"></i></button>` : ''}
                  </div></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div class="modal-overlay" id="coaModal">
      <div class="modal"><div class="modal-header"><span class="modal-title" id="coaModalTitle">Tambah Akun Baru</span><button class="modal-close" onclick="TMS.COA.closeForm()">✕</button></div>
      <div class="modal-body" id="coaModalBody">${renderForm()}</div></div>
    </div>`;
  }

  function renderForm(data = {}) {
    return `
    <form id="coaForm" onsubmit="TMS.COA.save(event)" data-edit-code="${data.code||''}">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Kode Akun *</label>
          <input class="form-control font-mono" name="code" value="${data.code||''}" required placeholder="X-XXXX" ${data.code ? 'readonly style="opacity:.6"' : ''}>
          <div class="form-help">Format: [tipe]-[nomor] contoh: 1-1010, 6-6010</div>
        </div>
        <div class="form-group">
          <label class="form-label">Tipe Akun *</label>
          <select class="form-control" name="type" required ${data.isDefault ? 'disabled' : ''}>
            ${Object.entries(TYPE_LABELS).map(([v,l]) => `<option value="${v}" ${data.type===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Nama Akun *</label>
        <input class="form-control" name="name" value="${data.name||''}" required placeholder="Nama akun perkiraan">
      </div>
      <div class="form-group">
        <label class="form-label">Saldo Awal</label>
        <div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="number" name="balance" value="${data.balance||0}" min="0"></div>
        <div class="form-help">Untuk akun baru, masukkan saldo awal jika ada</div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="TMS.COA.closeForm()">Batal</button>
        <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> ${data.code ? 'Simpan Perubahan' : 'Tambah Akun'}</button>
      </div>
    </form>`;
  }

  function showForm() {
    document.getElementById('coaModalTitle').textContent = 'Tambah Akun Baru';
    document.getElementById('coaModalBody').innerHTML = renderForm();
    document.getElementById('coaModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function showEditForm(code) {
    const acc = S.getCOAByCode(code); if (!acc) return;
    document.getElementById('coaModalTitle').textContent = 'Edit Akun';
    document.getElementById('coaModalBody').innerHTML = renderForm(acc);
    document.getElementById('coaModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function closeForm() { document.getElementById('coaModal').classList.remove('active'); }

  function save(e) {
    e.preventDefault();
    const fd = new FormData(e.target); const data = Object.fromEntries(fd.entries());
    const editCode = e.target.dataset.editCode;
    data.balance = parseFloat(data.balance) || 0;

    if (editCode) {
      // Preserve balance if editing default account
      const existing = S.getCOAByCode(editCode);
      if (existing?.isDefault) data.balance = existing.balance || 0;
      S.updateCOA(editCode, { name: data.name, balance: data.balance });
      TMS.App.toast('Akun berhasil diperbarui', 'success');
    } else {
      const existing = S.getCOAByCode(data.code);
      if (existing) { TMS.App.toast('Kode akun sudah ada!', 'error'); return; }
      data.isDefault = false;
      S.addCOA(data);
      TMS.App.toast('Akun baru berhasil ditambahkan', 'success');
    }
    closeForm();
    TMS.App.navigate('coa');
  }

  function del(code) {
    const acc = S.getCOAByCode(code);
    if (!acc) return;
    if ((acc.balance || 0) !== 0) { TMS.App.toast('Tidak dapat menghapus akun dengan saldo', 'error'); return; }
    if (!confirm(`Hapus akun "${acc.name}"?`)) return;
    S.removeCOA(code);
    TMS.App.navigate('coa');
    TMS.App.toast('Akun dihapus', 'warning');
  }

  function search(q) {
    const rows = document.querySelectorAll('[class^="coa-table-"] tbody tr, [class*=" coa-table-"] tbody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = !q || text.includes(q.toLowerCase()) ? '' : 'none';
    });
  }

  return { renderList, showForm, showEditForm, closeForm, save, delete: del, search };
})();
