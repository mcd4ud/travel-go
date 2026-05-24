/* ========================================
   TMS - Vendor & Deposit Management
   ======================================== */
TMS.Vendor = (() => {
  const S = TMS.Store;

  function render() {
    const vendors = S.getAll('vendors');
    return `
    <div class="fade-in">
      <div class="toolbar">
        <div class="search-box">
          <i data-lucide="search"></i>
          <input type="text" placeholder="Cari vendor..." oninput="TMS.Vendor.search(this.value)">
        </div>
        <div class="btn-group">
          <button class="btn btn-outline" onclick="TMS.App.navigate('database')"><i data-lucide="database"></i> Impor Maskapai</button>
          <button class="btn btn-primary" onclick="TMS.Vendor.showForm()">
            <i data-lucide="plus"></i> Tambah Vendor
          </button>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Daftar Vendor</div>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama Vendor</th>
                  <th>Kategori</th>
                  <th class="text-right">Saldo Deposit</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody id="vendorBody">${renderRows(vendors)}</tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">Riwayat Deposit Terbaru</div>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Vendor</th>
                  <th class="text-right">Jumlah</th>
                  <th>Metode</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>${renderDepositHistory()}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Vendor -->
    <div class="modal-overlay" id="vendorModal">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Tambah Vendor</span>
          <button class="modal-close" onclick="TMS.Vendor.closeForm()">✕</button>
        </div>
        <div class="modal-body" id="vendorModalBody">${renderForm()}</div>
      </div>
    </div>

    <!-- Modal Deposit -->
    <div class="modal-overlay" id="depositModal">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Top Up Deposit</span>
          <button class="modal-close" onclick="TMS.Vendor.closeDepositForm()">✕</button>
        </div>
        <div class="modal-body">${renderDepositForm()}</div>
      </div>
    </div>`;
  }

  function renderRows(vendors) {
    if (!vendors.length) return '<tr><td colspan="5" class="table-empty">Belum ada vendor</td></tr>';
    return vendors.map(v => `
      <tr>
        <td><span class="font-mono text-muted">${v.vendorCode}</span></td>
        <td><strong>${v.name}</strong></td>
        <td><span class="badge badge-primary">${v.category}</span></td>
        <td class="text-right"><strong style="color:var(--success);">${S.formatCurrency(v.balance || 0)}</strong></td>
        <td>
          <div class="btn-group">
            <button class="btn btn-sm btn-success" onclick="TMS.Vendor.showDepositForm('${v.id}')" title="Top Up"><i data-lucide="plus-circle"></i></button>
            <button class="btn btn-sm btn-outline" onclick="TMS.Vendor.delete('${v.id}')" title="Hapus"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  }
  function renderDepositHistory() {
    const deposits = S.getAll('vendor_deposits').sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    if (!deposits.length) return '<tr><td colspan="5" class="table-empty">Belum ada riwayat deposit</td></tr>';
    return deposits.map(d => {
      const v = S.getById('vendors', d.vendorId);
      return `
        <tr>
          <td>${S.formatDate(d.date)}</td>
          <td>${v ? v.name : 'Unknown'}</td>
          <td class="text-right amount-positive">${S.formatCurrency(d.amount)}</td>
          <td>${d.paymentMethod}</td>
          <td>
            <button class="btn btn-sm btn-ghost text-danger" onclick="TMS.Vendor.deleteDeposit('${d.id}')" title="Hapus Deposit">
              <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderForm(data = {}) {
    return `
    <form onsubmit="TMS.Vendor.save(event)">
      <div class="form-group">
        <label class="form-label">Nama Vendor *</label>
        <input class="form-control" name="name" required value="${data.name || ''}" placeholder="Contoh: Lion Air, Traveloka, Hotel Indonesia">
      </div>
      <div class="form-group">
        <label class="form-label">Kategori *</label>
        <select class="form-control" name="category" required>
          <option value="Airline" ${data.category === 'Airline' ? 'selected' : ''}>Airline</option>
          <option value="Hotel" ${data.category === 'Hotel' ? 'selected' : ''}>Hotel</option>
          <option value="Transport" ${data.category === 'Transport' ? 'selected' : ''}>Transport</option>
          <option value="Aggregator" ${data.category === 'Aggregator' ? 'selected' : ''}>Aggregator / B2B</option>
          <option value="Lainnya" ${data.category === 'Lainnya' ? 'selected' : ''}>Lainnya</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Kontak / Sales</label>
        <input class="form-control" name="contact" value="${data.contact || ''}" placeholder="Nama sales atau nomor telepon">
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="TMS.Vendor.closeForm()">Batal</button>
        <button type="submit" class="btn btn-primary">Simpan Vendor</button>
      </div>
    </form>`;
  }

  function renderDepositForm() {
    const vendors = S.getAll('vendors');
    return `
    <form onsubmit="TMS.Vendor.saveDeposit(event)">
      <input type="hidden" name="vendorId" id="depositVendorId">
      <div class="form-group">
        <label class="form-label">Vendor</label>
        <input class="form-control" id="depositVendorName" readonly style="background:var(--bg-secondary);">
      </div>
      <div class="form-group">
        <label class="form-label">Jumlah Top Up *</label>
        <div class="input-group">
          <span class="input-prefix">Rp</span>
          <input class="form-control" type="number" name="amount" required min="1000">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Metode Pembayaran *</label>
        <select class="form-control" name="paymentMethod" required>
          <option value="Transfer Bank">Transfer Bank</option>
          <option value="Kas">Kas Tunai</option>
          <option value="Kartu Kredit">Kartu Kredit</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Tanggal *</label>
        <input class="form-control" type="date" name="date" required value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="TMS.Vendor.closeDepositForm()">Batal</button>
        <button type="submit" class="btn btn-success">Konfirmasi Top Up</button>
      </div>
    </form>`;
  }

  function showForm() {
    document.getElementById('vendorModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function closeForm() {
    document.getElementById('vendorModal').classList.remove('active');
  }

  function showDepositForm(vendorId) {
    const v = S.getById('vendors', vendorId);
    if (!v) return;
    document.getElementById('depositVendorId').value = v.id;
    document.getElementById('depositVendorName').value = v.name;
    document.getElementById('depositModal').classList.add('active');
  }

  function closeDepositForm() {
    document.getElementById('depositModal').classList.remove('active');
  }

  function save(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const vendor = Object.fromEntries(fd.entries());
    vendor.vendorCode = S.generateCode('vendor');
    vendor.balance = 0;
    S.add('vendors', vendor);
    closeForm();
    TMS.App.navigate('vendors');
    TMS.App.toast('Vendor berhasil ditambahkan', 'success');
  }

  function saveDeposit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const deposit = Object.fromEntries(fd.entries());
    deposit.amount = parseFloat(deposit.amount);
    
    // Update Vendor Balance
    const v = S.getById('vendors', deposit.vendorId);
    if (v) {
      const newBalance = (v.balance || 0) + deposit.amount;
      S.update('vendors', v.id, { balance: newBalance });
      
      // Create Accounting Journal
      const journalNumber = S.generateCode('journal');
      const accCode = deposit.paymentMethod === 'Kas' ? '1-1000' : '1-1001';
      const suffix = (v.vendorCode || '').split('-')[1] || '001';
      const subCode = `1-1300-${suffix}`;
      const subName = `Deposit Vendor ${v.name}`;
      const j = {
        journalNumber: journalNumber,
        date: deposit.date,
        description: `Top Up Deposit Vendor: ${v.name}`,
        reference: v.vendorCode,
        type: 'vendor_deposit',
        entries: [
          { accountCode: subCode, accountName: subName, debit: deposit.amount, credit: 0 },
          { accountCode: accCode, accountName: deposit.paymentMethod === 'Kas' ? 'Kas' : 'Bank', debit: 0, credit: deposit.amount }
        ]
      };
      S.add('journals', j);
      
      // Link journal to deposit
      deposit.journalNumber = journalNumber;
      S.add('vendor_deposits', deposit);

      S.recalculateCOA();

      closeDepositForm();
      TMS.App.navigate('vendors');
      TMS.App.toast(`Berhasil Top Up ${S.formatCurrency(deposit.amount)} ke ${v.name}`, 'success');
    }
  }

  function deleteDeposit(id) {
    const d = S.getById('vendor_deposits', id);
    if (!d) return;

    if (confirm(`Hapus riwayat deposit sebesar ${S.formatCurrency(d.amount)}? \nIni akan memotong saldo vendor dan menghapus jurnal akuntansi terkait.`)) {
      // 1. Update Vendor Balance (Decrease)
      const v = S.getById('vendors', d.vendorId);
      if (v) {
        const newBalance = (v.balance || 0) - d.amount;
        S.update('vendors', v.id, { balance: newBalance });
      }

      // 2. Remove Journal Entry
      const journals = S.getAll('journals');
      const journal = journals.find(j => {
        if (d.journalNumber && j.journalNumber === d.journalNumber) return true;
        
        if (j.type === 'vendor_deposit' && j.date === d.date) {
          const hasVendorRef = v ? j.reference === v.vendorCode : true;
          const hasMatchingAmount = j.entries.some(e => e.accountCode.startsWith('1-1300') && Math.abs(e.debit - d.amount) < 0.1);
          return hasVendorRef && hasMatchingAmount;
        }
        return false;
      });
      
      if (journal) {
        S.remove('journals', journal.id);
      } else {
        console.warn('Journal entry not found for deposit removal, manual adjustment might be needed.');
      }

      // 3. Remove Deposit Record
      S.remove('vendor_deposits', id);

      // 4. Recalculate
      S.recalculateCOA();

      TMS.App.navigate('vendors');
      TMS.App.toast('Deposit berhasil dihapus', 'success');
    }
  }

  function del(id) {
    if (confirm('Hapus vendor ini? Data riwayat deposit tidak akan dihapus dari laporan keuangan namun vendor akan hilang dari daftar.')) {
      S.remove('vendors', id);
      TMS.App.navigate('vendors');
    }
  }

  function search(q) {
    const vendors = S.getAll('vendors').filter(v => 
      v.name.toLowerCase().includes(q.toLowerCase()) || 
      v.vendorCode.toLowerCase().includes(q.toLowerCase())
    );
    document.getElementById('vendorBody').innerHTML = renderRows(vendors);
    if (window.lucide) lucide.createIcons();
  }

  return { render, showForm, closeForm, showDepositForm, closeDepositForm, save, saveDeposit, deleteDeposit, delete: del, search };
})();
