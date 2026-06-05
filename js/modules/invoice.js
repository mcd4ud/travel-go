/* ========================================
   TMS - Invoice Module (Updated with Payment)
   ======================================== */
TMS.Invoice = (() => {
  const S = TMS.Store;

  let activeSubView = 'list';
  let editingBankId = null;

  const METHOD_LABELS = { cash:'Tunai', bank:'Transfer Bank', va:'Virtual Account', cc:'Kartu Kredit' };

  function statusBadge(inv) {
    if (inv.paymentStatus === 'paid') return '<span class="badge badge-success badge-dot">Lunas</span>';
    if (inv.paymentStatus === 'pending_verification') return '<span class="badge badge-warning badge-dot">Menunggu Verifikasi</span>';
    return '<span class="badge badge-danger badge-dot">Belum Lunas</span>';
  }

  function renderList() {
    if (activeSubView === 'banks') {
      return renderBankManager();
    }
    const invoices = S.getAll('invoices');
    const paid = invoices.filter(i => i.paymentStatus === 'paid').length;
    const pending = invoices.filter(i => i.paymentStatus === 'pending_verification').length;
    const unpaid = invoices.filter(i => i.paymentStatus === 'unpaid').length;

    return `
    <div class="fade-in">
      <div class="stat-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px;">
        <div class="stat-card blue"><div class="stat-icon blue"><i data-lucide="file-text"></i></div><div class="stat-value">${invoices.length}</div><div class="stat-label">Total Invoice</div></div>
        <div class="stat-card green"><div class="stat-icon green"><i data-lucide="check-circle"></i></div><div class="stat-value">${paid}</div><div class="stat-label">Lunas</div></div>
        <div class="stat-card orange"><div class="stat-icon orange"><i data-lucide="clock"></i></div><div class="stat-value">${pending}</div><div class="stat-label">Menunggu Verifikasi</div></div>
        <div class="stat-card red"><div class="stat-icon red"><i data-lucide="alert-circle"></i></div><div class="stat-value">${unpaid}</div><div class="stat-label">Belum Lunas</div></div>
      </div>
      <div class="toolbar">
        <div class="search-box"><i data-lucide="search"></i><input type="text" placeholder="Cari invoice, pelanggan..." oninput="TMS.Invoice.search(this.value)"></div>
        <div class="btn-group">
          <select class="form-control" id="invoiceFilter" onchange="TMS.Invoice.filter()" style="width:auto;padding:8px 32px 8px 12px;">
            <option value="all">Semua Status</option>
            <option value="paid">Lunas</option>
            <option value="pending_verification">Menunggu Verifikasi</option>
            <option value="unpaid">Belum Lunas</option>
          </select>
          <select class="form-control" id="invoiceTypeFilter" onchange="TMS.Invoice.filter()" style="width:auto;padding:8px 32px 8px 12px;">
            <option value="all">Semua Tipe</option>
            <option value="flight">Pesawat</option>
            <option value="hotel">Hotel</option>
            <option value="rental">Rental</option>
            <option value="tour">Paket Wisata</option>
            <option value="umroh">Umroh</option>
          </select>
          <button class="btn btn-warning btn-sm" onclick="TMS.App.navigate('verify')"><i data-lucide="shield-check"></i> Verifikasi Bayar</button>
          <button class="btn btn-primary btn-sm" onclick="TMS.Invoice.manageBanks()"><i data-lucide="credit-card"></i> Kelola Bank</button>
        </div>
      </div>
      <div class="card">
        <div class="table-container">
          <table>
            <thead><tr><th>No. Invoice</th><th>Booking</th><th>Tipe</th><th>Pelanggan</th><th>Tanggal</th><th>Total</th><th>Metode</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody id="invoiceBody">${renderRows(invoices)}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  function typeLabel(type) {
    const m = { 
      flight:'<span class="badge badge-primary">✈ Pesawat</span>', 
      hotel:'<span class="badge badge-info">🏨 Hotel</span>', 
      rental:'<span class="badge badge-warning">🚗 Rental</span>', 
      tour:'<span class="badge badge-success">🗺 Paket</span>',
      umroh:'<span class="badge" style="background: rgba(184, 158, 103, 0.15); color: #B89E67; font-weight: 600;">🕌 Umroh</span>'
    };
    return m[type] || type;
  }

  function renderRows(invoices) {
    if (!invoices.length) return `<tr><td colspan="9" class="table-empty"><i data-lucide="file-text" style="width:32px;height:32px;display:block;margin:0 auto 8px;opacity:.3;"></i>Belum ada invoice</td></tr>`;
    return invoices.slice().reverse().map(inv => {
      const pay = S.getAll('payments').find(p => p.invoiceId === inv.id && p.status !== 'rejected');
      return `<tr>
        <td><span class="font-mono text-primary">${inv.invoiceNumber}</span></td>
        <td><span class="font-mono" style="color:var(--text-muted)">${inv.bookingCode}</span></td>
        <td>${typeLabel(inv.bookingType)}</td>
        <td><strong>${inv.customerName}</strong></td>
        <td>${S.formatDate(inv.createdAt)}</td>
        <td><strong>${S.formatCurrency(inv.total)}</strong></td>
        <td>${inv.paymentMethod ? `<span class="badge badge-primary">${METHOD_LABELS[inv.paymentMethod]||inv.paymentMethod}</span>` : '<span class="text-muted">-</span>'}</td>
        <td>
          ${statusBadge(inv)}
          ${inv.paymentStatus==='paid' ? `<br><span class="text-muted" style="font-size:10px;">${S.formatDate(inv.paidAt)}</span>` : ''}
        </td>
        <td><div class="btn-group">
          <button class="btn btn-sm btn-success" ${inv.paymentStatus === 'paid' ? `disabled style="opacity:0.5;cursor:not-allowed;" title="Sudah Lunas"` : `onclick="TMS.Payment.openModal('${inv.id}')" title="Bayar"`}><i data-lucide="credit-card"></i></button>
          ${inv.paymentStatus==='pending_verification' && pay ? `<button class="btn btn-sm btn-warning" onclick="TMS.Payment.openVerifyModal('${pay.id}')" title="Verifikasi"><i data-lucide="shield-check"></i></button>` : ''}
          <button class="btn btn-sm btn-whatsapp" onclick="TMS.App.shareToWhatsApp('invoice', '${inv.id}')" title="Kirim WhatsApp"><i data-lucide="message-square"></i></button>
          <button class="btn btn-sm btn-primary" onclick="TMS.PDF.generateInvoice(${JSON.stringify({...inv, paymentMethod: inv.paymentMethod||null}).split('"').join('&quot;')})" title="Unduh Invoice"><i data-lucide="download"></i></button>
          ${inv.paymentStatus === 'paid' ? `<button class="btn btn-sm btn-success" onclick="TMS.PDF.generatePaymentReceipt(${JSON.stringify({...inv, paymentMethod: inv.paymentMethod||null}).split('"').join('&quot;')})" title="Bukti Bayar"><i data-lucide="check-circle"></i></button>` : ''}
          <button class="btn btn-sm btn-outline" onclick="TMS.Invoice.viewDetail('${inv.id}')" title="Detail"><i data-lucide="eye"></i></button>
          <button class="btn btn-sm btn-danger" onclick="TMS.Invoice.delete('${inv.id}')" title="Hapus"><i data-lucide="trash-2"></i></button>
        </div></td>
      </tr>`;
    }).join('');
  }

  function viewDetail(id) {
    const inv = S.getById('invoices', id); if (!inv) return;
    const pay = S.getAll('payments').find(p => p.invoiceId === id && p.status !== 'rejected');
    document.getElementById('invoiceDetailBody').innerHTML = `
      <div class="flex-between mb-2">
        <div><div style="font-size:12px;color:var(--text-muted);">No. Invoice</div><div style="font-size:20px;font-weight:800;color:var(--primary-light);">${inv.invoiceNumber}</div></div>
        <div style="text-align:right;">${statusBadge(inv)}</div>
      </div>
      <div class="form-row" style="margin-bottom:16px;">
        <div><span class="form-label">Pelanggan</span><div style="font-weight:600;">${inv.customerName}</div><div class="text-muted">${inv.customerEmail||''}</div></div>
        <div>
          <span class="form-label">Tanggal</span><div>${S.formatDate(inv.createdAt)}</div>
          <span class="form-label mt-1">Jatuh Tempo</span><div>${S.formatDate(inv.dueDate)}</div>
          ${inv.paymentMethod?`<span class="form-label mt-1">Metode Bayar</span><div><span class="badge badge-info">${METHOD_LABELS[inv.paymentMethod]||inv.paymentMethod}</span></div>`:''}
        </div>
      </div>
      ${pay ? `<div style="background:rgba(7,112,227,0.06);border:1px solid rgba(7,112,227,0.15);border-radius:10px;padding:12px;margin-bottom:16px;font-size:12px;">
        <div style="font-weight:600;margin-bottom:6px;">🔒 Info Pembayaran</div>
        <div>Kode: <span class="font-mono">${pay.paymentCode}</span></div>
        ${pay.accountRefToken ? `<div>Token Rekening: <span class="font-mono text-muted">${pay.accountRefToken}</span> <span class="badge badge-success" style="font-size:10px;">Ditokenisasi</span></div>` : ''}
        ${pay.proofBase64 && pay.proofType?.startsWith('image/') ? `<div style="margin-top:8px;"><img src="${pay.proofBase64}" style="max-width:100%;max-height:150px;border-radius:6px;border:1px solid var(--border-color);"></div>` : ''}
      </div>` : ''}
      <div class="table-container" style="margin-bottom:16px;">
        <table><thead><tr><th>Deskripsi</th><th>Qty</th><th class="text-right">Harga</th><th class="text-right">Total</th></tr></thead>
        <tbody>${(inv.items||[]).map(i=>`<tr><td style="white-space:pre-line;line-height:1.6;">${i.description}</td><td>${i.qty}</td><td class="text-right">${S.formatCurrency(i.unitPrice)}</td><td class="text-right"><strong>${S.formatCurrency(i.total)}</strong></td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;margin-bottom:20px;">
        <div class="flex-between" style="width:280px;"><span class="text-muted">Subtotal</span><span>${S.formatCurrency(inv.subtotal)}</span></div>
        <div class="flex-between" style="width:280px;"><span class="text-muted">PPN (${inv.taxRate||11}%)</span><span>${S.formatCurrency(inv.tax)}</span></div>
        <div class="flex-between" style="width:280px;padding-top:8px;border-top:2px solid var(--border-color);"><strong>TOTAL</strong><strong style="font-size:18px;color:var(--primary-light);">${S.formatCurrency(inv.total)}</strong></div>
      </div>
      
      <!-- Rekening Penerimaan / Payment Details Form Section -->
      <div class="card p-2 mb-2" style="background:var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px; margin-top: 16px;">
        <div style="font-weight:700; font-size:12px; color:var(--primary-light); margin-bottom:12px; text-transform:uppercase; display:flex; align-items:center; gap:8px;">
          <i data-lucide="building"></i> Metode & Rekening Penerimaan Pembayaran
        </div>
        <div class="form-row" style="margin-bottom:10px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11px;">Metode Pembayaran</label>
            <select class="form-control" id="invPaymentMethod" onchange="TMS.Invoice.toggleBankFields(this.value)">
              <option value="">-- Pilih Metode --</option>
              <option value="cash" ${inv.paymentMethod === 'cash' ? 'selected' : ''}>Tunai (Cash)</option>
              <option value="bank" ${inv.paymentMethod === 'bank' ? 'selected' : ''}>Transfer Bank</option>
              <option value="va" ${inv.paymentMethod === 'va' ? 'selected' : ''}>Virtual Account</option>
              <option value="cc" ${inv.paymentMethod === 'cc' ? 'selected' : ''}>Kartu Kredit</option>
            </select>
          </div>
        </div>
        <div id="invBankFields" style="display: ${inv.paymentMethod === 'bank' ? 'block' : 'none'};">
          <div class="form-row" style="margin-bottom:10px; margin-top:10px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 11px;">Nama Bank Penerima</label>
              <input class="form-control" type="text" id="invRecBankName" value="${inv.receivingBankName || ''}" placeholder="Contoh: Bank BCA">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 11px;">Nomor Rekening Penerima</label>
              <input class="form-control" type="text" id="invRecAccountNo" value="${inv.receivingAccountNo || ''}" placeholder="Contoh: 8000778899">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 11px;">Nama Pemilik Rekening</label>
              <input class="form-control" type="text" id="invRecAccountName" value="${inv.receivingAccountName || ''}" placeholder="Contoh: PT. Travela Nusantara">
            </div>
          </div>
        </div>
        <div style="text-align: right; margin-top: 12px;">
          <button class="btn btn-sm btn-primary" onclick="TMS.Invoice.savePaymentDetails('${inv.id}')">
            <i data-lucide="save"></i> Simpan Detail Pembayaran
          </button>
        </div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px; border-top:1px solid var(--border-color); padding-top:15px;">
        <button class="btn btn-whatsapp" onclick="TMS.App.shareToWhatsApp('invoice', '${inv.id}')"><i data-lucide="message-square"></i> Kirim WhatsApp</button>
        <button class="btn btn-primary" onclick="TMS.PDF.generateInvoice(${JSON.stringify({...inv, paymentMethod: inv.paymentMethod||null}).split('"').join('&quot;')})"><i data-lucide="download"></i> Unduh Invoice</button>
        ${inv.paymentStatus === 'paid'
          ? `<button class="btn btn-success" onclick="TMS.PDF.generatePaymentReceipt(${JSON.stringify({...inv, paymentMethod: inv.paymentMethod||null}).split('"').join('&quot;')})"><i data-lucide="check-circle"></i> Unduh Bukti Bayar</button>`
          : ''
        }
      </div>`;
    document.getElementById('invoiceDetailModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function savePaymentDetails(id) {
    const method = document.getElementById('invPaymentMethod')?.value || '';
    const bankName = document.getElementById('invRecBankName')?.value || '';
    const accountNo = document.getElementById('invRecAccountNo')?.value || '';
    const accountName = document.getElementById('invRecAccountName')?.value || '';
    
    S.update('invoices', id, {
      paymentMethod: method || null,
      receivingBankName: bankName,
      receivingAccountNo: accountNo,
      receivingAccountName: accountName
    });
    
    TMS.App.toast('Detail pembayaran invoice berhasil disimpan!', 'success');
    viewDetail(id); // Reload view
  }

  function toggleBankFields(val) {
    const fields = document.getElementById('invBankFields');
    if (fields) {
      fields.style.display = val === 'bank' ? 'block' : 'none';
    }
  }

  function search(q) {
    const status = document.getElementById('invoiceFilter')?.value||'all';
    const type = document.getElementById('invoiceTypeFilter')?.value||'all';
    let invoices = S.getAll('invoices');
    if (q) invoices = invoices.filter(i => i.customerName?.toLowerCase().includes(q.toLowerCase())||i.invoiceNumber?.toLowerCase().includes(q.toLowerCase()));
    if (status!=='all') invoices = invoices.filter(i=>i.paymentStatus===status);
    if (type!=='all') invoices = invoices.filter(i=>i.bookingType===type);
    document.getElementById('invoiceBody').innerHTML = renderRows(invoices);
    if (window.lucide) lucide.createIcons();
  }

  function filter() { search(''); }

  function del(id) {
    if (!confirm('Hapus invoice ini? Seluruh laporan keuangan, data pembayaran, dan data pemesanan terkait juga akan dihapus secara permanen.')) return;
    const inv = S.getById('invoices', id);
    if (!inv) return;

    // 1. Hapus Jurnal terkait (berdasarkan bookingCode)
    const journals = S.getAll('journals');
    journals.forEach(j => {
      if (j.reference === inv.bookingCode) S.remove('journals', j.id);
    });

    // 2. Hapus Pembayaran terkait
    const payments = S.getAll('payments');
    payments.forEach(p => {
      if (p.invoiceId === inv.id) S.remove('payments', p.id);
    });

    // 3. Hapus Data Pemesanan (Flight/Hotel/Rental)
    if (inv.bookingType === 'flight') S.remove('flights', inv.bookingId);
    if (inv.bookingType === 'hotel') S.remove('hotels', inv.bookingId);
    if (inv.bookingType === 'rental') S.remove('rentals', inv.bookingId);
    if (inv.bookingType === 'tour')   S.remove('tours',   inv.bookingId);

    // 4. Hapus Invoice itu sendiri
    S.remove('invoices', id);

    // 5. Rekalkulasi Saldo Akun (COA)
    S.recalculateCOA();

    TMS.App.navigate('invoices');
    TMS.App.toast('Invoice dan seluruh data terkait telah dihapus.', 'warning');
  }

  function manageBanks() {
    activeSubView = 'banks';
    editingBankId = null;
    TMS.App.navigate('invoices');
  }

  function backToInvoices() {
    activeSubView = 'list';
    editingBankId = null;
    TMS.App.navigate('invoices');
  }

  function renderBankManager() {
    const banks = S.getAll('payment_banks');
    const editRecord = editingBankId ? S.getById('payment_banks', editingBankId) : null;
    
    const rows = banks.length === 0 
      ? `<tr><td colspan="6" class="table-empty" style="text-align:center;padding:30px;"><i data-lucide="credit-card" style="width:32px;height:32px;display:block;margin:0 auto 8px;opacity:.3;"></i>Belum ada rekening pembayaran terdaftar.</td></tr>`
      : banks.map((b, idx) => `
        <tr>
          <td><strong style="color:var(--text-main);">${idx + 1}</strong></td>
          <td>
            <div style="font-weight:700;color:var(--primary-light);font-size:14px;">${b.bankName}</div>
            <div style="font-size:11px;color:var(--text-muted);">Master Bank Account</div>
          </td>
          <td><span style="font-family:monospace;font-size:14px;font-weight:700;letter-spacing:0.5px;">${b.accountNo}</span></td>
          <td><strong>${b.accountName}</strong></td>
          <td>
            <span class="badge ${b.isActive !== false ? 'badge-success' : 'badge-danger'}">
              ${b.isActive !== false ? 'Aktif' : 'Nonaktif'}
            </span>
          </td>
          <td>
            <div class="btn-group">
              <button class="btn btn-sm btn-primary" onclick="TMS.Invoice.editBank('${b.id}')" title="Edit"><i data-lucide="edit-3"></i></button>
              <button class="btn btn-sm btn-danger" onclick="TMS.Invoice.deleteBank('${b.id}')" title="Hapus"><i data-lucide="trash-2"></i></button>
            </div>
          </td>
        </tr>
      `).join('');

    return `
    <div class="fade-in">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:15px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:40px;height:40px;background:rgba(214,189,150,0.1);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--primary);">
            <i data-lucide="credit-card"></i>
          </div>
          <div>
            <h2 style="margin:0;font-size:20px;font-weight:800;color:var(--text-main);">Kelola Bank Pembayaran</h2>
            <p class="text-muted" style="margin:0;font-size:12px;">Daftar rekening bank perusahaan untuk menerima transfer dari semua invoice</p>
          </div>
        </div>
        <button class="btn btn-sm btn-outline" onclick="TMS.Invoice.backToInvoices()"><i data-lucide="arrow-left"></i> Kembali ke Invoice</button>
      </div>

      <div class="grid-2" style="gap:25px;align-items:flex-start;">
        
        <!-- DAFTAR REKENING BANK -->
        <div class="card" style="padding:0;overflow:hidden;">
          <div class="card-header" style="background:var(--bg-secondary);border-bottom:1px solid var(--border-color);padding:15px 20px;">
            <div class="card-title" style="font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px;">
              <i data-lucide="list"></i> Rekening Terdaftar
            </div>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th style="width:40px;">#</th>
                  <th>Nama Bank</th>
                  <th>Nomor Rekening</th>
                  <th>Atas Nama (Pemilik)</th>
                  <th>Status</th>
                  <th style="width:100px;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- FORM TAMBAH / EDIT BANK -->
        <div class="card">
          <div class="card-header" style="border-bottom:1px solid var(--border-color);padding-bottom:10px;margin-bottom:15px;">
            <div class="card-title" style="font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px;">
              <i data-lucide="${editRecord ? 'edit-3' : 'plus-circle'}"></i> 
              ${editRecord ? 'Edit Rekening Pembayaran' : 'Tambah Rekening Pembayaran'}
            </div>
          </div>
          <form onsubmit="TMS.Invoice.addOrUpdateBank(event)" style="display:flex;flex-direction:column;gap:15px;">
            <input type="hidden" id="bankId" value="${editRecord ? editRecord.id : ''}">
            
            <div class="form-group">
              <label class="form-label" style="font-weight:600;font-size:13px;">Nama Bank</label>
              <input type="text" id="bankName" class="form-control" placeholder="Contoh: Bank BCA, Bank Mandiri" value="${editRecord ? editRecord.bankName : ''}" required>
            </div>
            
            <div class="form-group">
              <label class="form-label" style="font-weight:600;font-size:13px;">Nomor Rekening</label>
              <input type="text" id="accountNo" class="form-control" placeholder="Masukkan nomor rekening saja" value="${editRecord ? editRecord.accountNo : ''}" required style="font-family:monospace;letter-spacing:1px;">
            </div>
            
            <div class="form-group">
              <label class="form-label" style="font-weight:600;font-size:13px;">Atas Nama (Pemilik Rekening)</label>
              <input type="text" id="accountName" class="form-control" placeholder="Nama pemilik rekening sesuai buku tabungan" value="${editRecord ? editRecord.accountName : ''}" required>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-weight:600;font-size:13px;display:flex;align-items:center;gap:8px;">
                <input type="checkbox" id="bankIsActive" ${!editRecord || editRecord.isActive !== false ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">
                <span>Aktifkan Rekening ini</span>
              </label>
              <span class="form-help">Jika dinonaktifkan, rekening tidak akan dicantumkan pada cetakan invoice baru.</span>
            </div>

            <div style="display:flex;gap:10px;margin-top:10px;">
              <button type="submit" class="btn btn-primary" style="flex:1;">
                <i data-lucide="save"></i> ${editRecord ? 'Simpan Perubahan' : 'Daftarkan Rekening'}
              </button>
              ${editRecord ? `<button type="button" class="btn btn-outline" onclick="TMS.Invoice.cancelEditBank()">Batal</button>` : ''}
            </div>
          </form>
        </div>

      </div>
    </div>`;
  }

  function addOrUpdateBank(e) {
    e.preventDefault();
    const id = document.getElementById('bankId').value;
    const name = document.getElementById('bankName').value;
    const no = document.getElementById('accountNo').value;
    const owner = document.getElementById('accountName').value;
    const active = document.getElementById('bankIsActive').checked;

    const data = {
      bankName: name,
      accountNo: no,
      accountName: owner,
      isActive: active
    };

    if (id) {
      S.update('payment_banks', id, data);
      TMS.App.toast('Data rekening bank berhasil diperbarui!', 'success');
    } else {
      S.add('payment_banks', data);
      TMS.App.toast('Rekening bank baru berhasil didaftarkan!', 'success');
    }

    editingBankId = null;
    TMS.App.navigate('invoices');
  }

  function editBank(id) {
    editingBankId = id;
    TMS.App.navigate('invoices');
  }

  function cancelEditBank() {
    editingBankId = null;
    TMS.App.navigate('invoices');
  }

  function deleteBank(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus rekening bank ini?')) return;
    S.remove('payment_banks', id);
    TMS.App.toast('Rekening bank berhasil dihapus.', 'warning');
    if (editingBankId === id) editingBankId = null;
    TMS.App.navigate('invoices');
  }

  return { renderList, viewDetail, search, filter, delete: del, savePaymentDetails, toggleBankFields, manageBanks, backToInvoices, renderBankManager, addOrUpdateBank, editBank, cancelEditBank, deleteBank };
})();
