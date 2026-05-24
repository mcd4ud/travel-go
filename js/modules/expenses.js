/* ========================================
   TMS - Operational Expenses Module
   ======================================== */
TMS.Expenses = (() => {
  const S = TMS.Store;

  function getExpenseAccounts() {
    return S.getCOA().filter(a => a.type === 'expense');
  }

  function renderList() {
    const expenses = S.getAll('expenses');
    const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);

    return `
    <div class="fade-in">
      <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px;">
        <div class="stat-card red">
          <div class="stat-icon red"><i data-lucide="trending-down"></i></div>
          <div class="stat-value">${expenses.length}</div>
          <div class="stat-label">Total Entri Beban</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-icon orange"><i data-lucide="dollar-sign"></i></div>
          <div class="stat-value" style="font-size:20px;">${S.formatCurrency(total)}</div>
          <div class="stat-label">Total Beban Operasional</div>
        </div>
        <div class="stat-card purple">
          <div class="stat-icon purple"><i data-lucide="calendar"></i></div>
          <div class="stat-value">${expenses.filter(e => e.date?.startsWith(new Date().toISOString().slice(0,7))).length}</div>
          <div class="stat-label">Beban Bulan Ini</div>
        </div>
      </div>

      <div class="toolbar">
        <div class="search-box"><i data-lucide="search"></i><input type="text" placeholder="Cari deskripsi beban..." oninput="TMS.Expenses.search(this.value)"></div>
        <button class="btn btn-primary" onclick="TMS.Expenses.showForm()"><i data-lucide="plus"></i> Input Beban Operasional</button>
      </div>

      <div class="card">
        <div class="table-container">
          <table>
            <thead><tr><th>No. Entri</th><th>Tanggal</th><th>Akun Beban</th><th>Deskripsi</th><th>Referensi</th><th class="text-right">Jumlah</th><th>Pembayaran</th><th>Aksi</th></tr></thead>
            <tbody id="expenseBody">${renderRows(expenses)}</tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="modal-overlay" id="expenseModal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <span class="modal-title">Input Beban Operasional</span>
          <button class="modal-close" onclick="TMS.Expenses.closeForm()">✕</button>
        </div>
        <div class="modal-body">${renderForm()}</div>
      </div>
    </div>`;
  }

  function renderRows(expenses) {
    if (!expenses.length) return `<tr><td colspan="8" class="table-empty"><i data-lucide="trending-down" style="width:32px;height:32px;display:block;margin:0 auto 8px;opacity:.3;"></i>Belum ada entri beban operasional</td></tr>`;
    const sorted = [...expenses].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sorted.map(exp => `<tr>
      <td><span class="font-mono text-primary">${exp.expenseNumber}</span></td>
      <td>${S.formatDate(exp.date)}</td>
      <td>
        <span class="font-mono" style="font-size:11px;color:var(--text-muted)">${exp.accountCode}</span><br>
        <strong>${exp.accountName}</strong>
      </td>
      <td>${exp.description}</td>
      <td class="text-muted">${exp.reference || '-'}</td>
      <td class="text-right amount-negative"><strong>${S.formatCurrency(exp.amount)}</strong></td>
      <td>
        ${exp.paymentMethod === 'cash'
          ? '<span class="badge badge-primary">Kas</span>'
          : '<span class="badge badge-info">Bank</span>'}
      </td>
      <td>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline" onclick="TMS.Expenses.showDetail('${exp.id}')" title="Detail"><i data-lucide="eye"></i></button>
          <button class="btn btn-sm btn-danger" onclick="TMS.Expenses.delete('${exp.id}')" title="Hapus">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </td>
    </tr>`).join('');
  }

  function renderForm() {
    const expAccounts = getExpenseAccounts();
    return `
    <form id="expenseForm" onsubmit="TMS.Expenses.save(event)">
      <div class="form-section-title"><i data-lucide="file-minus"></i> Detail Beban</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tanggal Beban *</label>
          <input class="form-control" type="date" name="date" required value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
          <label class="form-label">Akun Beban *</label>
          <select class="form-control" name="accountCode" required onchange="TMS.Expenses.onAccountChange(this)">
            <option value="">-- Pilih Akun Beban --</option>
            ${expAccounts.map(a => `<option value="${a.code}" data-name="${a.name}">${a.code} - ${a.name}</option>`).join('')}
          </select>
          <div class="form-help">
            Akun tidak ada? <a href="#" onclick="TMS.App.navigate('coa');TMS.COA.showForm();return false;" style="color:var(--primary-light)">Tambah akun baru</a>
          </div>
        </div>
      </div>
      <input type="hidden" name="accountName" id="expenseAccountName">
      <div class="form-group">
        <label class="form-label">Deskripsi Beban *</label>
        <input class="form-control" name="description" required placeholder="Contoh: Pembayaran gaji bulan Mei 2026">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Jumlah *</label>
          <div class="input-group">
            <span class="input-prefix">Rp</span>
            <input class="form-control" type="number" name="amount" required min="1" placeholder="0">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Metode Pembayaran *</label>
          <select class="form-control" name="paymentMethod" required>
            <option value="cash">Kas (Tunai)</option>
            <option value="bank">Transfer Bank</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">No. Referensi / Bukti</label>
        <input class="form-control" name="reference" placeholder="No. kwitansi, nota, atau bukti bayar">
      </div>
      <div class="form-group">
        <label class="form-label">Catatan</label>
        <input class="form-control" name="notes" placeholder="Keterangan tambahan...">
      </div>

      <div class="card" style="background:rgba(255,71,87,0.06);border-color:rgba(255,71,87,0.2);margin-top:16px;">
        <div class="form-section-title" style="margin-top:0;border-bottom:none;"><i data-lucide="book-open"></i> Jurnal Otomatis yang Akan Dibuat</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">
          <div style="padding:10px;background:rgba(255,71,87,0.08);border-radius:8px;">
            <div style="color:var(--text-muted);margin-bottom:4px;">DEBIT</div>
            <div id="journalDebitPreview" style="font-weight:600;color:var(--danger);">Pilih akun beban dulu</div>
          </div>
          <div style="padding:10px;background:rgba(0,196,140,0.08);border-radius:8px;">
            <div style="color:var(--text-muted);margin-bottom:4px;">KREDIT</div>
            <div id="journalCreditPreview" style="font-weight:600;color:var(--success);">Kas / Bank (sesuai metode)</div>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="TMS.Expenses.closeForm()">Batal</button>
        <button type="submit" class="btn btn-danger"><i data-lucide="save"></i> Catat Beban</button>
      </div>
    </form>`;
  }

  function onAccountChange(sel) {
    const opt = sel.options[sel.selectedIndex];
    const nameEl = document.getElementById('expenseAccountName');
    const debitEl = document.getElementById('journalDebitPreview');
    if (nameEl) nameEl.value = opt.dataset.name || '';
    if (debitEl) debitEl.textContent = opt.value ? `${opt.value} - ${opt.dataset.name}` : 'Pilih akun beban dulu';
  }

  function showForm() {
    const modal = document.getElementById('expenseModal');
    modal.querySelector('.modal-title').textContent = 'Input Beban Operasional';
    modal.querySelector('.modal-body').innerHTML = renderForm();
    modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function closeForm() {
    document.getElementById('expenseModal').classList.remove('active');
  }

  function showDetail(id) {
    const exp = S.getById('expenses', id);
    if (!exp) return;
    const modal = document.getElementById('expenseModal');
    modal.querySelector('.modal-title').textContent = 'Detail Beban Operasional';
    modal.querySelector('.modal-body').innerHTML = renderDetail(exp);
    modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function renderDetail(exp) {
    const creditCode = exp.paymentMethod === 'bank' ? '1-1001' : '1-1000';
    const creditName = exp.paymentMethod === 'bank' ? 'Bank' : 'Kas';

    return `
    <div class="detail-view">
      <div class="detail-header mb-2" style="border-bottom:1px solid var(--border-color);padding-bottom:1rem;">
        <div class="flex-between">
          <div>
            <h3 class="mb-0" style="color:var(--danger);">${exp.accountName}</h3>
            <div class="text-muted">${exp.expenseNumber} • ${S.formatDate(exp.date)}</div>
          </div>
          <div class="text-right">
            <span class="badge badge-danger">OUTGOING</span>
            <div class="font-mono mt-1" style="font-weight:700;font-size:18px;color:var(--danger);">${S.formatCurrency(exp.amount)}</div>
          </div>
        </div>
      </div>

      <div class="card mb-2 p-1" style="background:var(--bg-secondary);">
        <div class="flex-between mb-1"><span>Deskripsi</span><strong>${exp.description}</strong></div>
        <div class="flex-between mb-1"><span>Referensi</span><strong>${exp.reference || '-'}</strong></div>
        <div class="flex-between mb-1"><span>Metode Bayar</span><strong>${exp.paymentMethod === 'cash' ? 'Kas (Tunai)' : 'Transfer Bank'}</strong></div>
        <div class="flex-between"><span>Akun Sumber</span><strong>${creditCode} - ${creditName}</strong></div>
      </div>

      ${exp.notes ? `
      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--text-muted);"><i data-lucide="message-square" style="width:14px;height:14px;vertical-align:middle;"></i> CATATAN</div>
      <div class="card mb-2 p-1" style="background:rgba(0,0,0,0.02);border-left:3px solid var(--border-color);">
        ${exp.notes}
      </div>` : ''}

      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="book-open" style="width:14px;height:14px;vertical-align:middle;"></i> ENTRI JURNAL TERKAIT</div>
      <div class="card mb-2" style="overflow:hidden;">
        <table class="table-sm">
          <thead style="background:var(--bg-secondary);"><tr><th>Akun</th><th class="text-right">Debit</th><th class="text-right">Kredit</th></tr></thead>
          <tbody>
            <tr>
              <td>${exp.accountCode} - ${exp.accountName}</td>
              <td class="text-right text-danger">${S.formatCurrency(exp.amount)}</td>
              <td class="text-right">-</td>
            </tr>
            <tr>
              <td>${creditCode} - ${creditName}</td>
              <td class="text-right">-</td>
              <td class="text-right text-success">${S.formatCurrency(exp.amount)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="form-actions mt-2">
        <button class="btn btn-outline" onclick="TMS.Expenses.closeForm()">Tutup</button>
        <button class="btn btn-primary" onclick="window.print()"><i data-lucide="printer"></i> Cetak Bukti</button>
      </div>
    </div>`;
  }

  function save(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    data.amount = parseFloat(data.amount) || 0;
    data.expenseNumber = S.generateCode('expense');

    // Determine cash/bank account for credit
    const creditCode = data.paymentMethod === 'bank' ? '1-1001' : '1-1000';
    const creditName = data.paymentMethod === 'bank' ? 'Bank' : 'Kas';

    // Create journal entry
    const j = {
      journalNumber: S.generateCode('journal'),
      date: data.date,
      description: `Beban Operasional - ${data.description}`,
      reference: data.reference || data.expenseNumber,
      type: 'expense',
      entries: [
        { accountCode: data.accountCode, accountName: data.accountName, debit: data.amount, credit: 0 },
        { accountCode: creditCode, accountName: creditName, debit: 0, credit: data.amount }
      ]
    };
    S.add('journals', j);
    S.recalculateCOA();
    S.add('expenses', data);

    closeForm();
    TMS.App.navigate('expenses');
    TMS.App.toast(`Beban operasional ${S.formatCurrency(data.amount)} berhasil dicatat`, 'success');
  }

  function del(id) {
    if (!confirm('Hapus entri beban ini? Jurnal terkait juga akan dihapus untuk menjaga konsistensi laporan.')) return;
    const exp = S.getById('expenses', id);
    if (exp) {
      // Remove associated journal entry
      const journals = S.getAll('journals');
      const journalToDelete = journals.find(j => j.reference === exp.expenseNumber);
      if (journalToDelete) {
        S.remove('journals', journalToDelete.id);
      }
      S.remove('expenses', id);
      S.recalculateCOA();
      TMS.App.navigate('expenses');
      TMS.App.toast('Entri beban dan jurnal terkait berhasil dihapus', 'success');
    }
  }

  function search(q) {
    const expenses = S.getAll('expenses').filter(e =>
      !q || e.description?.toLowerCase().includes(q.toLowerCase()) ||
      e.accountName?.toLowerCase().includes(q.toLowerCase()) ||
      e.expenseNumber?.toLowerCase().includes(q.toLowerCase())
    );
    document.getElementById('expenseBody').innerHTML = renderRows(expenses);
    if (window.lucide) lucide.createIcons();
  }

  return { renderList, showForm, closeForm, save, delete: del, search, onAccountChange, showDetail };
})();
