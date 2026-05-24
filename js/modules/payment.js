/* ========================================
   TMS - Payment Module (Multi-Channel)
   ======================================== */
TMS.Payment = (() => {
  const S = TMS.Store;

  // Payment method account mapping
  const METHOD_MAP = {
    cash:   { code: '1-1002', name: 'Kas Kasir',  label: 'Tunai (Cash)',           icon: '💵' },
    bank:   { code: '1-1001', name: 'Bank',        label: 'Transfer Bank',          icon: '🏦' },
    va:     { code: '1-1001', name: 'Bank',        label: 'Virtual Account',        icon: '📲' },
    cc:     { code: '1-1001', name: 'Bank',        label: 'Kartu Kredit',           icon: '💳' },
  };

  // --- OPEN PAYMENT MODAL ---
  function openModal(invoiceId) {
    const inv = S.getById('invoices', invoiceId);
    if (!inv) return;
    if (inv.paymentStatus === 'paid') { TMS.App.toast('Invoice ini sudah LUNAS', 'warning'); return; }

    // Check existing active payment
    const existing = S.getAll('payments').find(p => p.invoiceId === invoiceId && p.status === 'pending');
    if (existing) { TMS.App.toast('Sudah ada pembayaran menunggu verifikasi', 'warning'); openVerifyModal(existing.id); return; }

    document.getElementById('paymentModalBody').innerHTML = renderPaymentForm(inv);
    document.getElementById('paymentModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function renderPaymentForm(inv) {
    return `
    <form id="paymentForm" onsubmit="TMS.Payment.submit(event,'${inv.id}')">
      <div style="background:rgba(7,112,227,0.08);border:1px solid rgba(7,112,227,0.2);border-radius:12px;padding:16px;margin-bottom:20px;">
        <div style="font-size:12px;color:var(--text-muted);">Invoice</div>
        <div style="font-size:18px;font-weight:800;color:var(--primary-light);">${inv.invoiceNumber}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">${inv.customerName}</div>
        <div style="font-size:22px;font-weight:800;margin-top:8px;">${S.formatCurrency(inv.total)}</div>
      </div>

      <div class="form-group">
        <label class="form-label">Metode Pembayaran *</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px;" id="methodGrid">
          ${Object.entries(METHOD_MAP).map(([val, m]) => `
          <label style="display:flex;align-items:center;gap:10px;padding:12px;border:1px solid var(--border-color);border-radius:10px;cursor:pointer;transition:all .2s;" id="method_${val}" onclick="TMS.Payment.selectMethod('${val}')">
            <input type="radio" name="paymentMethod" value="${val}" style="display:none;">
            <span style="font-size:20px;">${m.icon}</span>
            <div><div style="font-weight:600;font-size:13px;">${m.label}</div><div style="font-size:10px;color:var(--text-muted);">${val !== 'cash' ? 'Butuh verifikasi' : 'Langsung lunas'}</div></div>
          </label>`).join('')}
        </div>
        <input type="hidden" name="paymentMethod" id="selectedMethod" required>
      </div>

      <div class="form-group" id="accountSelectionGroup" style="display:none;">
        <label class="form-label">Pilih Akun Kas/Bank *</label>
        <select class="form-control" name="paymentAccountCode" id="paymentAccountCode">
          <!-- Populated by selectMethod -->
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Jumlah Dibayar *</label>
        <div class="input-group"><span class="input-prefix">Rp</span>
          <input class="form-control" type="number" name="amountPaid" required min="1" value="${inv.total}" placeholder="0">
        </div>
      </div>

      <div id="bankFields" style="display:none;">
        <div class="form-group">
          <label class="form-label">Nama Bank / Platform</label>
          <input class="form-control" name="bankName" placeholder="BCA / Mandiri / BRI / GoPay...">
        </div>
        <div class="form-group">
          <label class="form-label">No. Rekening / VA / Referensi</label>
          <input class="form-control" name="accountRef" placeholder="xxxx-xxxx-xxxx (akan ditokenisasi)">
          <div class="form-help">🔒 Data rekening akan ditokenisasi untuk keamanan</div>
        </div>
        <div class="form-group">
          <label class="form-label">Upload Bukti Pembayaran *</label>
          <div id="dropZone" onclick="document.getElementById('proofFile').click()"
            style="border:2px dashed var(--border-color);border-radius:12px;padding:32px;text-align:center;cursor:pointer;transition:all .3s;"
            ondragover="event.preventDefault();this.style.borderColor='var(--primary)'"
            ondragleave="this.style.borderColor='var(--border-color)'"
            ondrop="TMS.Payment.handleDrop(event)">
            <div style="font-size:32px;margin-bottom:8px;">📎</div>
            <div style="font-weight:600;margin-bottom:4px;">Klik atau drag & drop file</div>
            <div class="text-muted" style="font-size:12px;">Format: JPG, PNG, PDF (maks. 5MB)</div>
          </div>
          <input type="file" id="proofFile" accept="image/*,.pdf" style="display:none;" onchange="TMS.Payment.handleFile(this)">
          <div id="proofPreview" style="margin-top:12px;display:none;"></div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Catatan</label>
        <input class="form-control" name="notes" placeholder="Keterangan pembayaran...">
      </div>

      <div id="fraudWarning" style="display:none;margin-bottom:16px;"></div>

      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="document.getElementById('paymentModal').classList.remove('active')">Batal</button>
        <button type="submit" class="btn btn-success" id="paySubmitBtn"><i data-lucide="credit-card"></i> Proses Pembayaran</button>
      </div>
    </form>`;
  }

  function selectMethod(val) {
    document.getElementById('selectedMethod').value = val;
    document.querySelectorAll('#methodGrid label').forEach(el => {
      el.style.borderColor = 'var(--border-color)';
      el.style.background = 'transparent';
    });
    const el = document.getElementById('method_' + val);
    if (el) { el.style.borderColor = 'var(--primary)'; el.style.background = 'rgba(7,112,227,0.1)'; }
    el?.querySelector('input[type=radio]').setAttribute('checked', true);
    const isCash = val === 'cash';
    document.getElementById('bankFields').style.display = isCash ? 'none' : 'block';
    
    // Populate account selection
    const accGroup = document.getElementById('accountSelectionGroup');
    const accSelect = document.getElementById('paymentAccountCode');
    if (accGroup && accSelect) {
      accGroup.style.display = 'block';
      let filteredAccounts = [];
      if (isCash) {
        filteredAccounts = S.getCOA().filter(a => a.type === 'asset' && a.code.startsWith('1-10') && a.code !== '1-1001'); // Kas/Kasir
      } else {
        filteredAccounts = S.getCOA().filter(a => a.type === 'asset' && a.code === '1-1001'); // Bank
      }
      
      accSelect.innerHTML = filteredAccounts.map(a => `<option value="${a.code}">${a.code} - ${a.name} (Saldo: ${S.formatCurrency(a.balance)})</option>`).join('');
      if (filteredAccounts.length === 0) {
        accSelect.innerHTML = `<option value="${methodInfo.code}">${methodInfo.code} - ${methodInfo.name}</option>`;
      }
    }

    const btn = document.getElementById('paySubmitBtn');
    if (btn) btn.textContent = isCash ? '✓ Tandai Lunas (Tunai)' : '⏳ Kirim untuk Verifikasi';
  }

  let _proofBase64 = null;
  let _proofType = null;

  function handleFile(input) {
    const file = input.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { TMS.App.toast('File terlalu besar (maks 5MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      _proofBase64 = e.target.result;
      _proofType = file.type;
      const preview = document.getElementById('proofPreview');
      preview.style.display = 'block';
      preview.innerHTML = file.type.startsWith('image/')
        ? `<img src="${e.target.result}" style="max-width:100%;max-height:200px;border-radius:8px;border:1px solid var(--border-color);">`
        : `<div style="padding:12px;background:rgba(7,112,227,0.08);border-radius:8px;display:flex;align-items:center;gap:8px;"><span>📄</span><span>${file.name}</span><span class="badge badge-success">✓ Siap upload</span></div>`;
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    document.getElementById('dropZone').style.borderColor = 'var(--border-color)';
    const file = e.dataTransfer.files[0]; if (!file) return;
    const dt = new DataTransfer(); dt.items.add(file);
    const inp = document.getElementById('proofFile'); inp.files = dt.files;
    handleFile(inp);
  }

  // --- SUBMIT PAYMENT ---
  function submit(e, invoiceId) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const method = fd.get('paymentMethod');
    if (!method) { TMS.App.toast('Pilih metode pembayaran!', 'error'); return; }

    const inv = S.getById('invoices', invoiceId);
    const amount = parseFloat(fd.get('amountPaid')) || inv.total;
    const methodInfo = METHOD_MAP[method];
    const isCash = method === 'cash';
    const accountRef = fd.get('accountRef') || '';

    if (!isCash && !_proofBase64) { TMS.App.toast('Harap upload bukti pembayaran!', 'error'); return; }

    // Build payment record
    const paymentCode = S.generateCode('payment');
    const payment = {
      paymentCode,
      invoiceId,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      method,
      methodLabel: methodInfo.label,
      accountCode: fd.get('paymentAccountCode') || methodInfo.code,
      accountName: S.getCOAByCode(fd.get('paymentAccountCode'))?.name || methodInfo.name,
      amount,
      bankName: fd.get('bankName') || '',
      accountRefToken: accountRef ? S.tokenize(accountRef) : null, // tokenized!
      proofBase64: !isCash ? _proofBase64 : null,
      proofType: !isCash ? _proofType : null,
      notes: fd.get('notes') || '',
      status: isCash ? 'approved' : 'pending',
      createdAt: new Date().toISOString(),
    };

    // Run fraud detection
    const fraudFlags = S.runFraudCheck(payment);
    if (fraudFlags.length > 0) {
      const warnEl = document.getElementById('fraudWarning');
      warnEl.style.display = 'block';
      warnEl.innerHTML = `<div style="background:var(--danger-bg);border:1px solid rgba(255,71,87,0.3);border-radius:10px;padding:14px;">
        <div style="font-weight:700;color:var(--danger);margin-bottom:8px;">⚠ Fraud Alert Terdeteksi</div>
        ${fraudFlags.map(f => `<div style="font-size:12px;color:var(--text-secondary);">• [${f.rule}] ${f.msg}</div>`).join('')}
        <div style="margin-top:10px;font-size:12px;color:var(--text-muted);">Transaksi tetap diproses namun dicatat untuk investigasi.</div>
      </div>`;
      setTimeout(() => processPayment(payment, inv, isCash), 2000);
    } else {
      processPayment(payment, inv, isCash);
    }
  }

  function processPayment(payment, inv, isCash) {
    // Save payment
    S.add('payments', payment);
    _proofBase64 = null; _proofType = null;

    if (isCash) {
      // Immediately approve cash
      S.update('invoices', inv.id, { paymentStatus: 'paid', paidAt: new Date().toISOString(), paymentMethod: 'cash', paymentCode: payment.paymentCode });
      // Update source booking
      if (inv.bookingType === 'flight') S.update('flights', inv.bookingId, { paymentStatus: 'paid' });
      if (inv.bookingType === 'hotel')  S.update('hotels',  inv.bookingId, { paymentStatus: 'paid' });
      if (inv.bookingType === 'rental') S.update('rentals', inv.bookingId, { paymentStatus: 'paid' });
      // Journal: Debit Kas Kasir / Kredit Piutang
      createPaymentJournal(payment, inv);
      document.getElementById('paymentModal').classList.remove('active');
      TMS.App.navigate('invoices');
      TMS.App.toast(`✓ Pembayaran TUNAI ${S.formatCurrency(payment.amount)} — Invoice LUNAS`, 'success');
    } else {
      // Non-cash: set pending verification
      S.update('invoices', inv.id, { paymentStatus: 'pending_verification', paymentCode: payment.paymentCode, paymentMethod: payment.method });
      document.getElementById('paymentModal').classList.remove('active');
      TMS.App.navigate('invoices');
      TMS.App.toast(`⏳ Bukti pembayaran dikirim. Menunggu verifikasi admin.`, 'warning');
    }
  }

  function createPaymentJournal(payment, inv) {
    const j = {
      journalNumber: S.generateCode('journal'),
      date: new Date().toISOString().split('T')[0],
      description: `Pembayaran ${payment.methodLabel} - ${inv.invoiceNumber} - ${inv.customerName}`,
      reference: payment.paymentCode,
      type: 'payment_received',
      entries: [
        { accountCode: payment.accountCode, accountName: payment.accountName, debit: payment.amount, credit: 0 },
        { accountCode: '1-1100', accountName: 'Piutang Usaha', debit: 0, credit: payment.amount }
      ]
    };
    S.add('journals', j);
    S.recalculateCOA();
  }

  // --- VERIFICATION (Admin) ---
  function openVerifyModal(paymentId) {
    const pay = S.getById('payments', paymentId); if (!pay) return;
    const inv = S.getById('invoices', pay.invoiceId);
    document.getElementById('verifyModalBody').innerHTML = renderVerifyForm(pay, inv);
    document.getElementById('verifyModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function renderVerifyForm(pay, inv) {
    return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div><div class="form-label">Kode Pembayaran</div><div class="font-mono text-primary">${pay.paymentCode}</div></div>
      <div><div class="form-label">Invoice</div><div class="font-mono">${pay.invoiceNumber}</div></div>
      <div><div class="form-label">Pelanggan</div><div style="font-weight:600;">${pay.customerName}</div></div>
      <div><div class="form-label">Metode</div><span class="badge badge-info">${pay.methodLabel}</span></div>
      <div><div class="form-label">Nominal</div><div style="font-weight:800;color:var(--primary-light);font-size:18px;">${S.formatCurrency(pay.amount)}</div></div>
      <div><div class="form-label">Bank</div><div>${pay.bankName || '-'}</div></div>
      <div><div class="form-label">Ref Token</div><div class="font-mono text-muted" style="font-size:11px;">${pay.accountRefToken || 'N/A'}<br><span style="font-size:10px;color:var(--success);">🔒 Ditokenisasi</span></div></div>
      <div><div class="form-label">Waktu</div><div>${S.formatDate(pay.createdAt)}</div></div>
    </div>
    ${pay.proofBase64 ? `
    <div class="form-label">Bukti Pembayaran</div>
    <div style="margin-bottom:16px;border:1px solid var(--border-color);border-radius:10px;overflow:hidden;">
      ${pay.proofType?.startsWith('image/') ? `<img src="${pay.proofBase64}" style="width:100%;max-height:400px;object-fit:contain;background:#000;">` : `<div style="padding:20px;text-align:center;"><a href="${pay.proofBase64}" download="bukti_${pay.paymentCode}.pdf" class="btn btn-primary"><i data-lucide="download"></i> Download Bukti PDF</a></div>`}
    </div>` : '<div class="badge badge-warning" style="margin-bottom:16px;">Tidak ada bukti (Tunai)</div>'}
    <div class="form-actions">
      <button class="btn btn-danger" onclick="TMS.Payment.rejectPayment('${pay.id}')"><i data-lucide="x-circle"></i> Tolak</button>
      <button class="btn btn-success" onclick="TMS.Payment.approvePayment('${pay.id}')"><i data-lucide="check-circle"></i> Verifikasi & Lunas</button>
    </div>`;
  }

  function approvePayment(paymentId) {
    const pay = S.getById('payments', paymentId); if (!pay) return;
    const inv = S.getById('invoices', pay.invoiceId); if (!inv) return;
    S.update('payments', paymentId, { status: 'approved', approvedAt: new Date().toISOString() });
    S.update('invoices', inv.id, { paymentStatus: 'paid', paidAt: new Date().toISOString() });
    if (inv.bookingType === 'flight') S.update('flights', inv.bookingId, { paymentStatus: 'paid' });
    if (inv.bookingType === 'hotel')  S.update('hotels',  inv.bookingId, { paymentStatus: 'paid' });
    if (inv.bookingType === 'rental') S.update('rentals', inv.bookingId, { paymentStatus: 'paid' });
    if (inv.bookingType === 'tour')   S.update('tours',   inv.bookingId, { paymentStatus: 'paid' });
    createPaymentJournal(pay, inv);
    document.getElementById('verifyModal').classList.remove('active');
    TMS.App.navigate('invoices');
    TMS.App.toast(`✓ Pembayaran ${pay.paymentCode} diverifikasi — Invoice LUNAS`, 'success');
  }

  function rejectPayment(paymentId) {
    if (!confirm('Tolak pembayaran ini?')) return;
    const pay = S.getById('payments', paymentId); if (!pay) return;
    S.update('payments', paymentId, { status: 'rejected', rejectedAt: new Date().toISOString() });
    S.update('invoices', pay.invoiceId, { paymentStatus: 'unpaid', paymentCode: null, paymentMethod: null });
    document.getElementById('verifyModal').classList.remove('active');
    TMS.App.navigate('invoices');
    TMS.App.toast('Pembayaran ditolak. Invoice kembali ke status Belum Lunas.', 'warning');
  }

  // --- FRAUD MONITOR PAGE ---
  function renderFraudMonitor() {
    const logs = S.getFraudLogs();
    const alerts = S.getFraudAlert();
    return `
    <div class="fade-in">
      <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px;">
        <div class="stat-card red"><div class="stat-icon red"><i data-lucide="shield-alert"></i></div><div class="stat-value">${alerts.length}</div><div class="stat-label">Alert Aktif</div></div>
        <div class="stat-card orange"><div class="stat-icon orange"><i data-lucide="eye"></i></div><div class="stat-value">${logs.length}</div><div class="stat-label">Total Deteksi</div></div>
        <div class="stat-card green"><div class="stat-icon green"><i data-lucide="shield-check"></i></div><div class="stat-value">${logs.filter(l=>l.resolved).length}</div><div class="stat-label">Diselesaikan</div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">🛡 Fraud Management System — Log Deteksi</div></div>
        <div class="table-container">
          <table>
            <thead><tr><th>Ref Pembayaran</th><th>Rule Terpicu</th><th>Pesan</th><th>Waktu</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              ${logs.length === 0 ? `<tr><td colspan="6" class="table-empty">🟢 Tidak ada aktivitas mencurigakan terdeteksi</td></tr>` :
              logs.slice().reverse().map(log => log.flags.map(f => `<tr>
                <td><span class="font-mono text-primary">${log.paymentRef}</span></td>
                <td><span class="badge badge-danger">${f.rule}</span></td>
                <td>${f.msg}</td>
                <td>${S.formatDate(log.detectedAt)}</td>
                <td>${log.resolved ? '<span class="badge badge-success">Resolved</span>' : '<span class="badge badge-danger badge-dot">Open</span>'}</td>
                <td>${!log.resolved ? `<button class="btn btn-sm btn-success" onclick="TMS.Payment.resolveFraud('${log.id}')">Resolve</button>` : '-'}</td>
              </tr>`).join('')).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  function resolveFraud(logId) {
    S.resolveFraudLog(logId);
    TMS.App.navigate('fraud');
    TMS.App.toast('Alert diselesaikan', 'success');
  }

  // --- PENDING VERIFICATIONS ---
  function renderPendingVerifications() {
    const payments = S.getAll('payments').filter(p => p.status === 'pending');
    return `
    <div class="fade-in">
      <div class="card-title mb-2">⏳ Pembayaran Menunggu Verifikasi</div>
      <div class="card">
        <div class="table-container">
          <table>
            <thead><tr><th>Kode</th><th>Invoice</th><th>Pelanggan</th><th>Metode</th><th>Nominal</th><th>Waktu</th><th>Aksi</th></tr></thead>
            <tbody>
              ${payments.length === 0 ? `<tr><td colspan="7" class="table-empty">Tidak ada pembayaran menunggu verifikasi</td></tr>` :
              payments.map(p => `<tr>
                <td><span class="font-mono text-primary">${p.paymentCode}</span></td>
                <td>${p.invoiceNumber}</td>
                <td><strong>${p.customerName}</strong></td>
                <td><span class="badge badge-info">${p.methodLabel}</span></td>
                <td><strong>${S.formatCurrency(p.amount)}</strong></td>
                <td>${S.formatDate(p.createdAt)}</td>
                <td><button class="btn btn-sm btn-primary" onclick="TMS.Payment.openVerifyModal('${p.id}')"><i data-lucide="eye"></i> Verifikasi</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  return {
    openModal, selectMethod, handleFile, handleDrop, submit,
    openVerifyModal, approvePayment, rejectPayment,
    renderFraudMonitor, renderPendingVerifications, resolveFraud
  };
})();
