/* ========================================
   TMS - Accounting & Financial Reports
   ======================================== */
TMS.Accounting = (() => {
  const S = TMS.Store;

  // Format tanggal lokal (bukan UTC) untuk menghindari bug timezone
  function localDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const _now = new Date();
  let startDate = localDate(new Date(_now.getFullYear(), _now.getMonth(), 1));
  let endDate   = localDate(_now);

  function setPeriod(start, end) {
    startDate = start;
    endDate = end;
    const currentPath = window.location.hash.replace('#', '') || 'accounting/income';
    TMS.App.navigate(currentPath);
  }

  function resetPeriod() {
    const now = new Date();
    const s = localDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const e = localDate(now);

    // Update variabel internal
    startDate = s;
    endDate = e;

    // Langsung update nilai input di DOM agar tampilan berubah seketika
    const startInput = document.getElementById('filterStartDate');
    const endInput = document.getElementById('filterEndDate');
    if (startInput) startInput.value = s;
    if (endInput) endInput.value = e;

    // Paksa re-render halaman
    TMS.App.handleRoute();
  }

  function renderPeriodFilter() {
    return `
    <div class="card mb-2 p-1" style="background:var(--bg-secondary);border:1px solid var(--border-color);">
      <div style="display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <label style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Mulai:</label>
          <input id="filterStartDate" type="date" class="form-control form-control-sm" value="${startDate}" onchange="TMS.Accounting.setPeriod(this.value, document.getElementById('filterEndDate').value)" style="width:150px;">
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <label style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Sampai:</label>
          <input id="filterEndDate" type="date" class="form-control form-control-sm" value="${endDate}" onchange="TMS.Accounting.setPeriod(document.getElementById('filterStartDate').value, this.value)" style="width:150px;">
        </div>
        <div style="flex:1;text-align:right;">
          <button class="btn btn-sm btn-outline" onclick="TMS.Accounting.resetPeriod()"><i data-lucide="refresh-cw" style="width:12px;height:12px;"></i> Bulan Ini</button>
        </div>
      </div>
    </div>`;
  }

  // ---- DATA COMPUTATION ----
  function getBalanceData(asOfEndDate = false) {
    const coa = S.calculatePeriodBalances(startDate, endDate, asOfEndDate);

    // Sum all sub-accounts starting with 1-1300-
    const subDeposits = coa.filter(a => a.code.startsWith('1-1300-'));
    const totalSubDepositBalance = subDeposits.reduce((sum, sa) => sum + (sa.balance || 0), 0);

    // Set parent balance to represent the sum of all sub-accounts (plus any general/manual entries)
    const parentDeposit = coa.find(a => a.code === '1-1300');
    if (parentDeposit) {
      parentDeposit.balance = totalSubDepositBalance + (parentDeposit.balance || 0);
    }

    // Sum assets excluding sub-accounts starting with 1-1300- (so the parent balance represents them all)
    const totalAsset = coa.filter(a => a.type === 'asset' && !a.code.startsWith('1-1300-')).reduce((s, a) => s + (a.balance || 0), 0);
    const totalLiability = coa.filter(a => a.type === 'liability').reduce((s, a) => s + (a.balance || 0), 0);
    const totalEquity = coa.filter(a => a.type === 'equity').reduce((s, a) => s + (a.balance || 0), 0);
    const totalRevenue = coa.filter(a => a.type === 'revenue').reduce((s, a) => s + (a.balance || 0), 0);
    const totalCOGS = coa.filter(a => a.type === 'cogs').reduce((s, a) => s + (a.balance || 0), 0);
    const totalExpense = coa.filter(a => a.type === 'expense').reduce((s, a) => s + (a.balance || 0), 0);
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpense;

    return { coa, totalAsset, totalLiability, totalEquity, totalRevenue, totalCOGS, totalExpense, grossProfit, netProfit };
  }

  // ---- INCOME STATEMENT ----
  function renderIncomeStatement() {
    const d = getBalanceData();
    const revenues = d.coa.filter(a => a.type === 'revenue').sort((a, b) => a.code.localeCompare(b.code));
    const cogs = d.coa.filter(a => a.type === 'cogs').sort((a, b) => a.code.localeCompare(b.code));
    const expenses = d.coa.filter(a => a.type === 'expense').sort((a, b) => a.code.localeCompare(b.code));
    const periodStr = `${S.formatDate(startDate)} - ${S.formatDate(endDate)}`;

    return `
    <div class="fade-in">
      ${renderPeriodFilter()}
      <div class="toolbar">
        <div>
          <div class="card-title">Laporan Laba Rugi</div>
          <div class="card-subtitle">Periode: ${periodStr}</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-secondary" onclick="TMS.Accounting.exportIncomeExcel()"><i data-lucide="sheet"></i> Export Excel</button>
          <button class="btn btn-primary" onclick="TMS.Accounting.downloadIncome()"><i data-lucide="download"></i> Unduh PDF</button>
        </div>
      </div>
      <div class="card">
        <div class="table-container">
          <table class="financial-table" id="incomeTable">
            <thead><tr><th>Keterangan</th><th>Akun</th><th class="text-right">Jumlah</th><th class="text-right">Total</th></tr></thead>
            <tbody>
              <tr class="section-header"><td colspan="4">I. PENDAPATAN</td></tr>
              ${revenues.map(a => `<tr class="indent"><td>${a.name}</td><td class="font-mono text-muted">${a.code}</td><td class="text-right">${S.formatCurrency(a.balance)}</td><td></td></tr>`).join('')}
              <tr class="total-row"><td colspan="2"><strong>Total Pendapatan</strong></td><td></td><td class="text-right amount-positive"><strong>${S.formatCurrency(d.totalRevenue)}</strong></td></tr>

              <tr class="section-header"><td colspan="4">II. BEBAN POKOK PENJUALAN (BPP)</td></tr>
              ${cogs.map(a => `<tr class="indent"><td>${a.name}</td><td class="font-mono text-muted">${a.code}</td><td class="text-right">${S.formatCurrency(a.balance)}</td><td></td></tr>`).join('')}
              <tr class="total-row"><td colspan="2"><strong>Total BPP</strong></td><td></td><td class="text-right amount-negative"><strong>(${S.formatCurrency(d.totalCOGS)})</strong></td></tr>

              <tr class="grand-total"><td colspan="3"><strong>LABA KOTOR</strong></td><td class="text-right ${d.grossProfit >= 0 ? 'amount-positive' : 'amount-negative'}"><strong>${S.formatCurrency(d.grossProfit)}</strong></td></tr>

              <tr class="section-header"><td colspan="4">III. BEBAN OPERASIONAL</td></tr>
              ${expenses.map(a => `<tr class="indent"><td>${a.name}</td><td class="font-mono text-muted">${a.code}</td><td class="text-right">${S.formatCurrency(a.balance)}</td><td></td></tr>`).join('')}
              <tr class="total-row"><td colspan="2"><strong>Total Beban Operasional</strong></td><td></td><td class="text-right amount-negative"><strong>(${S.formatCurrency(d.totalExpense)})</strong></td></tr>

              <tr class="grand-total"><td colspan="3"><strong>LABA BERSIH</strong></td><td class="text-right ${d.netProfit >= 0 ? 'amount-positive' : 'amount-negative'}"><strong>${S.formatCurrency(d.netProfit)}</strong></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="stat-grid" style="margin-top:20px;">
        <div class="stat-card blue"><div class="stat-icon blue"><i data-lucide="arrow-up-circle"></i></div><div class="stat-value" style="font-size:18px;">${S.formatCurrency(d.totalRevenue)}</div><div class="stat-label">Total Pendapatan</div></div>
        <div class="stat-card orange"><div class="stat-icon orange"><i data-lucide="package"></i></div><div class="stat-value" style="font-size:18px;">${S.formatCurrency(d.totalCOGS)}</div><div class="stat-label">Total BPP</div></div>
        <div class="stat-card ${d.grossProfit >= 0 ? 'green' : 'red'}"><div class="stat-icon ${d.grossProfit >= 0 ? 'green' : 'red'}"><i data-lucide="trending-up"></i></div><div class="stat-value" style="font-size:18px;">${S.formatCurrency(d.grossProfit)}</div><div class="stat-label">Laba Kotor</div></div>
        <div class="stat-card ${d.netProfit >= 0 ? 'green' : 'red'}"><div class="stat-icon ${d.netProfit >= 0 ? 'green' : 'red'}"><i data-lucide="star"></i></div><div class="stat-value" style="font-size:18px;">${S.formatCurrency(d.netProfit)}</div><div class="stat-label">Laba Bersih</div></div>
      </div>
    </div>`;
  }

  // ---- BALANCE SHEET ----
  function renderBalanceSheet() {
    const d = getBalanceData(true);
    const assets = d.coa.filter(a => a.type === 'asset').sort((a, b) => a.code.localeCompare(b.code));
    const liabilities = d.coa.filter(a => a.type === 'liability').sort((a, b) => a.code.localeCompare(b.code));
    const equities = d.coa.filter(a => a.type === 'equity').sort((a, b) => a.code.localeCompare(b.code));
    const retainedEarnings = d.netProfit;
    const totalEquityWithEarnings = d.totalEquity + retainedEarnings;
    const totalLiabEquity = d.totalLiability + totalEquityWithEarnings;

    // Filter and sort assets to group sub-deposits under the parent Deposit Vendor
    const regularAssets = assets.filter(a => a.code !== '1-1300' && !a.code.startsWith('1-1300-')).sort((a, b) => a.code.localeCompare(b.code));
    const parentDeposit = assets.find(a => a.code === '1-1300');
    const subDeposits = assets.filter(a => a.code.startsWith('1-1300-')).sort((a, b) => a.code.localeCompare(b.code));

    return `
    <div class="fade-in">
      ${renderPeriodFilter()}
      <div class="toolbar">
        <div>
          <div class="card-title">Neraca (Balance Sheet)</div>
          <div class="card-subtitle">Per Tanggal: ${S.formatDate(endDate)}</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-secondary" onclick="TMS.Accounting.exportBalanceExcel()"><i data-lucide="sheet"></i> Export Excel</button>
          <button class="btn btn-primary" onclick="TMS.Accounting.downloadBalance()"><i data-lucide="download"></i> Unduh PDF</button>
        </div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">ASET</div></div>
          <div class="table-container">
            <table class="financial-table">
            <tbody>
              ${regularAssets.map(a => `<tr><td>${a.name}<br><span class="font-mono text-muted" style="font-size:10px">${a.code}</span></td><td class="text-right">${S.formatCurrency(a.balance)}</td></tr>`).join('')}
              
              ${parentDeposit ? `
                <tr style="font-weight: 700; background: rgba(7, 112, 227, 0.02);">
                  <td>${parentDeposit.name}<br><span class="font-mono text-muted" style="font-size:10px">${parentDeposit.code}</span></td>
                  <td class="text-right"><strong>${S.formatCurrency(parentDeposit.balance)}</strong></td>
                </tr>
                ${subDeposits.map(sa => `
                  <tr>
                    <td style="padding-left: 24px; font-size: 12px; color: var(--text-muted);">
                      <span style="color:var(--primary-light); margin-right: 6px; font-weight:bold;">•</span>
                      ${sa.name}<br>
                      <span class="font-mono text-muted" style="font-size:9px; padding-left: 10px;">${sa.code}</span>
                    </td>
                    <td class="text-right text-muted" style="font-size: 12px; padding-right: 12px;">${S.formatCurrency(sa.balance)}</td>
                  </tr>
                `).join('')}
              ` : ''}
              
              <tr class="grand-total"><td><strong>TOTAL ASET</strong></td><td class="text-right amount-positive"><strong>${S.formatCurrency(d.totalAsset)}</strong></td></tr>
            </tbody>
          </table>
          </div>
        </div>
        <div>
          <div class="card mb-2">
            <div class="card-header"><div class="card-title">KEWAJIBAN</div></div>
            <div class="table-container">
              <table class="financial-table">
              <tbody>
                ${liabilities.map(a => `<tr><td>${a.name}<br><span class="font-mono text-muted" style="font-size:10px">${a.code}</span></td><td class="text-right">${S.formatCurrency(a.balance)}</td></tr>`).join('')}
                <tr class="total-row"><td><strong>Total Kewajiban</strong></td><td class="text-right amount-negative"><strong>${S.formatCurrency(d.totalLiability)}</strong></td></tr>
              </tbody>
            </table>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">EKUITAS</div></div>
            <div class="table-container">
              <table class="financial-table">
              <tbody>
                ${equities.map(a => `<tr><td>${a.name}<br><span class="font-mono text-muted" style="font-size:10px">${a.code}</span></td><td class="text-right">${S.formatCurrency(a.balance)}</td></tr>`).join('')}
                <tr><td>Laba Bersih Berjalan</td><td class="text-right ${retainedEarnings >= 0 ? 'amount-positive' : 'amount-negative'}">${S.formatCurrency(retainedEarnings)}</td></tr>
                <tr class="total-row"><td><strong>Total Ekuitas</strong></td><td class="text-right"><strong>${S.formatCurrency(totalEquityWithEarnings)}</strong></td></tr>
                <tr class="grand-total"><td><strong>TOTAL KEWAJIBAN + EKUITAS</strong></td><td class="text-right ${Math.abs(d.totalAsset - totalLiabEquity) < 1 ? 'amount-positive' : 'amount-negative'}"><strong>${S.formatCurrency(totalLiabEquity)}</strong></td></tr>
              </tbody>
            </table>
            </div>
            ${Math.abs(d.totalAsset - totalLiabEquity) < 1
              ? `<div style="margin-top:12px;padding:10px;background:var(--success-bg);border-radius:8px;color:var(--success);font-size:12px;font-weight:600;text-align:center;">✓ Neraca Seimbang (Balance)</div>`
              : `<div style="margin-top:12px;padding:10px;background:var(--danger-bg);border-radius:8px;color:var(--danger);font-size:12px;font-weight:600;text-align:center;">⚠ Neraca Tidak Seimbang — Selisih: ${S.formatCurrency(Math.abs(d.totalAsset - totalLiabEquity))}</div>`}
          </div>
        </div>
      </div>
    </div>`;
  }

  // ---- CASH FLOW ----
  function renderCashFlow() {
    S.recalculateCOA();
    const journals = S.getAll('journals');
    let opIn = 0, opOut = 0;

    journals.forEach(j => {
      if (j.date < startDate || j.date > endDate) return;
      j.entries?.forEach(e => {
        if (e.accountCode === '1-1000' || e.accountCode === '1-1001') {
          opIn += (e.debit || 0);
          opOut += (e.credit || 0);
        }
      });
    });

    const netCash = opIn - opOut;
    const currentCOA = S.calculatePeriodBalances(startDate, endDate, true);
    const getBal = (code) => currentCOA.find(a => a.code === code)?.balance || 0;
    const kasBalance = getBal('1-1000') + getBal('1-1001');
    
    const paidInvoices = S.getAll('invoices').filter(i => i.paymentStatus === 'paid' && i.paidAt >= startDate && i.paidAt <= endDate);
    const totalReceived = paidInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const totalExpensePaid = S.getAll('expenses').filter(e => e.date >= startDate && e.date <= endDate).reduce((s, e) => s + (e.amount || 0), 0);
    const totalVendorDeposit = S.getAll('vendor_deposits').filter(d => d.date >= startDate && d.date <= endDate).reduce((s, d) => s + (d.amount || 0), 0);

    return `
    <div class="fade-in">
      ${renderPeriodFilter()}
      <div class="toolbar">
        <div>
          <div class="card-title">Laporan Arus Kas</div>
          <div class="card-subtitle">Periode: ${S.formatDate(startDate)} - ${S.formatDate(endDate)}</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-secondary" onclick="TMS.Accounting.exportCashFlowExcel()"><i data-lucide="sheet"></i> Export Excel</button>
          <button class="btn btn-primary" onclick="TMS.Accounting.downloadCashFlow()"><i data-lucide="download"></i> Unduh PDF</button>
        </div>
      </div>
      <div class="card">
        <div class="table-container">
          <table class="financial-table">
          <thead><tr><th>Keterangan</th><th class="text-right">Jumlah</th><th class="text-right">Total</th></tr></thead>
          <tbody>
            <tr class="section-header"><td colspan="3">A. ARUS KAS DARI AKTIVITAS OPERASIONAL</td></tr>
            <tr class="indent"><td>Penerimaan dari Pelanggan (Invoice Lunas)</td><td class="text-right amount-positive">${S.formatCurrency(totalReceived)}</td><td></td></tr>
            <tr class="indent"><td>Pembayaran Beban Operasional</td><td class="text-right amount-negative">(${S.formatCurrency(totalExpensePaid)})</td><td></td></tr>
            <tr class="indent"><td>Top Up Deposit Vendor</td><td class="text-right amount-negative">(${S.formatCurrency(totalVendorDeposit)})</td><td></td></tr>
            <tr class="total-row"><td colspan="1"><strong>Arus Kas Bersih - Operasional</strong></td><td></td><td class="text-right ${(totalReceived - totalExpensePaid - totalVendorDeposit) >= 0 ? 'amount-positive' : 'amount-negative'}"><strong>${S.formatCurrency(totalReceived - totalExpensePaid - totalVendorDeposit)}</strong></td></tr>

            <tr class="section-header"><td colspan="3">B. ARUS KAS DARI AKTIVITAS INVESTASI</td></tr>
            <tr class="indent"><td>Tidak ada aktivitas investasi</td><td class="text-right">-</td><td></td></tr>
            <tr class="total-row"><td colspan="1"><strong>Arus Kas Bersih - Investasi</strong></td><td></td><td class="text-right"><strong>Rp 0</strong></td></tr>

            <tr class="section-header"><td colspan="3">C. ARUS KAS DARI AKTIVITAS PENDANAAN</td></tr>
            <tr class="indent"><td>Tidak ada aktivitas pendanaan</td><td class="text-right">-</td><td></td></tr>
            <tr class="total-row"><td colspan="1"><strong>Arus Kas Bersih - Pendanaan</strong></td><td></td><td class="text-right"><strong>Rp 0</strong></td></tr>

            <tr class="grand-total"><td colspan="2"><strong>KENAIKAN (PENURUNAN) KAS BERSIH</strong></td><td class="text-right ${(totalReceived - totalExpensePaid - totalVendorDeposit) >= 0 ? 'amount-positive' : 'amount-negative'}"><strong>${S.formatCurrency(totalReceived - totalExpensePaid - totalVendorDeposit)}</strong></td></tr>
            <tr><td colspan="2">Saldo Kas & Bank Akhir Periode</td><td class="text-right"><strong style="color:var(--primary-light);">${S.formatCurrency(kasBalance)}</strong></td></tr>
          </tbody>
        </table>
        </div>
      </div>

      <div class="stat-grid" style="margin-top:20px;">
        <div class="stat-card green"><div class="stat-icon green"><i data-lucide="arrow-down-circle"></i></div><div class="stat-value" style="font-size:18px;">${S.formatCurrency(totalReceived)}</div><div class="stat-label">Total Kas Masuk</div></div>
        <div class="stat-card red"><div class="stat-icon red"><i data-lucide="arrow-up-circle"></i></div><div class="stat-value" style="font-size:18px;">${S.formatCurrency(totalExpensePaid)}</div><div class="stat-label">Total Kas Keluar</div></div>
        <div class="stat-card ${kasBalance >= 0 ? 'blue' : 'red'}"><div class="stat-icon ${kasBalance >= 0 ? 'blue' : 'red'}"><i data-lucide="landmark"></i></div><div class="stat-value" style="font-size:18px;">${S.formatCurrency(kasBalance)}</div><div class="stat-label">Saldo Kas & Bank</div></div>
      </div>
    </div>`;
  }

  // ---- GENERAL LEDGER ----
  function renderLedger() {
    const coa = S.getCOA().slice().sort((a, b) => a.code.localeCompare(b.code));
    const journals = S.getAll('journals');
    const selectedCode = window._ledgerAccount || coa[0]?.code;

    // Build ledger entries for selected account
    const entries = [];
    journals.forEach(j => {
      if (j.date < startDate || j.date > endDate) return;
      (j.entries || []).forEach(e => {
        if (e.accountCode === selectedCode) {
          entries.push({ date: j.date, description: j.description, ref: j.journalNumber, debit: e.debit || 0, credit: e.credit || 0 });
        }
      });
    });
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Running balance
    let runningBal = 0;
    const rows = entries.map(e => {
      const acc = coa.find(a => a.code === selectedCode);
      if (['asset', 'cogs', 'expense'].includes(acc?.type)) runningBal += e.debit - e.credit;
      else runningBal += e.credit - e.debit;
      return { ...e, balance: runningBal };
    });

    return `
    <div class="fade-in">
      ${renderPeriodFilter()}
      <div class="toolbar">
        <div class="card-title">Buku Besar (General Ledger)</div>
        <div class="btn-group">
          <select class="form-control" style="width:auto;min-width:320px;" onchange="window._ledgerAccount=this.value;TMS.App.navigate('accounting/ledger')">
            ${coa.map(a => `<option value="${a.code}" ${a.code === selectedCode ? 'selected' : ''}>${a.code} - ${a.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">${coa.find(a => a.code === selectedCode)?.name || '-'}</div>
            <div class="card-subtitle font-mono">${selectedCode}</div>
          </div>
          <div style="text-align:right;">
            <div class="form-label">Saldo Akhir</div>
            <div style="font-size:20px;font-weight:800;color:var(--primary-light);">${S.formatCurrency(rows[rows.length - 1]?.balance || 0)}</div>
          </div>
        </div>
        <div class="table-container">
          <table>
            <thead><tr><th>Tanggal</th><th>Deskripsi</th><th>No. Jurnal</th><th class="text-right">Debit</th><th class="text-right">Kredit</th><th class="text-right">Saldo</th></tr></thead>
            <tbody>
              ${rows.length === 0 ? `<tr><td colspan="6" class="table-empty">Tidak ada transaksi untuk akun ini</td></tr>` :
              rows.map(r => `<tr>
                <td>${S.formatDate(r.date)}</td>
                <td>${r.description}</td>
                <td><a href="javascript:void(0)" onclick="TMS.Accounting.viewDetailByNumber('${r.ref}')" class="font-mono text-primary" style="text-decoration:none;font-weight:600;">${r.ref}</a></td>
                <td class="text-right ${r.debit ? 'amount-positive' : 'text-muted'}">${r.debit ? S.formatCurrency(r.debit) : '-'}</td>
                <td class="text-right ${r.credit ? 'amount-negative' : 'text-muted'}">${r.credit ? S.formatCurrency(r.credit) : '-'}</td>
                <td class="text-right"><strong>${S.formatCurrency(r.balance)}</strong></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  // ---- JOURNAL LIST ----
  function renderJournals() {
    const journals = S.getAll('journals').filter(j => j.date >= startDate && j.date <= endDate).slice().reverse();
    let grandTotalDebit = 0;
    journals.forEach(j => {
      grandTotalDebit += (j.entries || []).reduce((s, e) => s + (e.debit || 0), 0);
    });

    return `
    <div class="fade-in">
      ${renderPeriodFilter()}
      <div class="toolbar">
        <div>
          <div class="card-title">Jurnal Umum</div>
          <div class="card-subtitle">Periode: ${S.formatDate(startDate)} - ${S.formatDate(endDate)}</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-primary" onclick="TMS.Accounting.showForm()"><i data-lucide="plus"></i> Jurnal Baru</button>
        </div>
      </div>
      <div class="card">
        <div class="table-container">
          <table>
            <thead><tr><th>No. Jurnal</th><th>Tanggal</th><th>Deskripsi</th><th>Referensi</th><th>Tipe</th><th class="text-right">Total Debit</th><th>Aksi</th></tr></thead>
            <tbody>
              ${journals.length === 0 ? `<tr><td colspan="7" class="table-empty">Belum ada jurnal</td></tr>` :
              journals.map(j => {
                const totalDebit = (j.entries || []).reduce((s, e) => s + (e.debit || 0), 0);
                return `<tr>
                  <td><a href="javascript:void(0)" onclick="TMS.Accounting.viewDetail('${j.id}')" class="font-mono text-primary" style="text-decoration:none;font-weight:700;">${j.journalNumber}</a></td>
                  <td>${S.formatDate(j.date)}</td>
                  <td>${j.description}</td>
                  <td><span class="font-mono text-muted">${j.reference || '-'}</span></td>
                  <td><span class="badge ${j.type === 'expense' ? 'badge-danger' : j.type === 'payment_received' ? 'badge-success' : 'badge-primary'}">${j.type || 'manual'}</span></td>
                  <td class="text-right"><strong>${S.formatCurrency(totalDebit)}</strong></td>
                  <td>
                    <div class="btn-group">
                      <button class="btn btn-sm btn-outline" onclick="TMS.Accounting.viewDetail('${j.id}')" title="Detail">
                        <i data-lucide="eye" style="width:14px;height:14px;"></i>
                      </button>
                      ${j.type === 'manual' ? `<button class="btn btn-sm btn-outline" onclick="TMS.Accounting.showForm('${j.id}')" title="Edit">
                        <i data-lucide="edit-3" style="width:14px;height:14px;"></i>
                      </button>` : ''}
                      <button class="btn btn-sm btn-ghost text-danger" onclick="TMS.Accounting.deleteJournal('${j.id}')" title="Hapus Jurnal">
                        <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
                      </button>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
            ${journals.length > 0 ? `<tfoot style="background:var(--bg-secondary);font-weight:800;">
              <tr>
                <td colspan="5" class="text-right">TOTAL DEBIT PERIODE INI</td>
                <td class="text-right" style="color:var(--primary-light);font-size:16px;">${S.formatCurrency(grandTotalDebit)}</td>
                <td></td>
              </tr>
            </tfoot>` : ''}
          </table>
        </div>
      </div>
    </div>`;
  }

  function showForm(id = null) {
    const j = id ? S.getById('journals', id) : null;
    document.getElementById('journalModalTitle').textContent = j ? 'Edit Jurnal Umum' : 'Buat Jurnal Umum Baru';
    document.getElementById('journalModalBody').innerHTML = renderForm(j);
    document.getElementById('journalModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
    if (j) calcJournalTotal();
  }

  function renderForm(j = null) {
    const coa = S.getCOA().slice().sort((a, b) => a.code.localeCompare(b.code));
    const nextCode = j ? j.journalNumber : S.generateCode('journal');
    return `
    <form id="journalForm" onsubmit="TMS.Accounting.saveJournal(event, ${j ? `'${j.id}'` : 'null'})">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">No. Jurnal</label>
          <input class="form-control font-mono" name="journalNumber" value="${nextCode}" readonly style="background:var(--bg-secondary);">
        </div>
        <div class="form-group">
          <label class="form-label">Tanggal *</label>
          <input type="date" class="form-control" name="date" value="${j ? j.date : new Date().toISOString().split('T')[0]}" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Deskripsi / Keterangan *</label>
          <input class="form-control" name="description" value="${j ? j.description : ''}" placeholder="Contoh: Penyesuaian Saldo Awal" required>
        </div>
        <div class="form-group">
          <label class="form-label">Referensi</label>
          <input class="form-control font-mono" name="reference" value="${j ? j.reference || '' : ''}" placeholder="Ref #">
        </div>
      </div>

      <div style="margin-top:1.5rem;margin-bottom:0.5rem;font-weight:700;font-size:12px;color:var(--primary-light);text-transform:uppercase;letter-spacing:1px;">Item Jurnal (Double Entry)</div>
      <div class="table-container mb-2">
        <table class="table-sm" id="journalEntryTable">
          <thead><tr><th>Akun</th><th>Debit</th><th>Kredit</th><th style="width:40px;"></th></tr></thead>
          <tbody id="journalEntryBody">
            ${j ? (j.entries || []).map(e => renderEntryRow(coa, e)).join('') : `
              ${renderEntryRow(coa)}
              ${renderEntryRow(coa)}
            `}
          </tbody>
          <tfoot>
            <tr>
              <td class="text-right"><strong>TOTAL</strong></td>
              <td id="totalDebitDisplay" class="text-right font-mono" style="font-weight:700;">Rp 0</td>
              <td id="totalCreditDisplay" class="text-right font-mono" style="font-weight:700;">Rp 0</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <button type="button" class="btn btn-sm btn-outline mb-2" onclick="TMS.Accounting.addEntryRow()">
        <i data-lucide="plus"></i> Tambah Baris
      </button>

      <div id="journalBalanceWarning" style="display:none;padding:10px;background:var(--danger-bg);border-radius:8px;color:var(--danger);font-size:12px;font-weight:600;margin-bottom:1rem;text-align:center;">
        ⚠ Jurnal tidak seimbang (Balance). Total Debit harus sama dengan Total Kredit.
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="document.getElementById('journalModal').classList.remove('active')">Batal</button>
        <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> ${j ? 'Simpan Perubahan' : 'Simpan Jurnal'}</button>
      </div>
    </form>`;
  }

  function renderEntryRow(coa, e = null) {
    return `
    <tr class="entry-row">
      <td>
        <select class="form-control form-control-sm" name="accountCode[]" required>
          <option value="">-- Pilih Akun --</option>
          ${coa.map(a => `<option value="${a.code}" ${e && e.accountCode === a.code ? 'selected' : ''}>${a.code} - ${a.name}</option>`).join('')}
        </select>
      </td>
      <td><input type="text" class="form-control form-control-sm text-right font-mono" name="debit[]" value="${S.formatInt(e ? e.debit || 0 : 0)}" oninput="TMS.App.formatNumberInput(this); TMS.Accounting.calcJournalTotal()"></td>
      <td><input type="text" class="form-control form-control-sm text-right font-mono" name="credit[]" value="${S.formatInt(e ? e.credit || 0 : 0)}" oninput="TMS.App.formatNumberInput(this); TMS.Accounting.calcJournalTotal()"></td>
      <td><button type="button" class="btn btn-sm btn-ghost text-danger p-0" onclick="this.closest('tr').remove();TMS.Accounting.calcJournalTotal();">✕</button></td>
    </tr>`;
  }

  function addEntryRow() {
    const body = document.getElementById('journalEntryBody');
    const tr = document.createElement('tr');
    tr.className = 'entry-row';
    tr.innerHTML = renderEntryRow(S.getCOA().slice().sort((a, b) => a.code.localeCompare(b.code)));
    body.appendChild(tr);
  }

  function calcJournalTotal() {
    let totalD = 0, totalC = 0;
    document.querySelectorAll('[name="debit[]"]').forEach(el => totalD += S.parseNumber(el.value) || 0);
    document.querySelectorAll('[name="credit[]"]').forEach(el => totalC += S.parseNumber(el.value) || 0);
    
    const dDisplay = document.getElementById('totalDebitDisplay');
    const cDisplay = document.getElementById('totalCreditDisplay');
    const warning = document.getElementById('journalBalanceWarning');

    if (dDisplay) dDisplay.textContent = S.formatCurrency(totalD);
    if (cDisplay) cDisplay.textContent = S.formatCurrency(totalC);
    
    if (warning) {
      if (Math.abs(totalD - totalC) > 0.01) {
        warning.style.display = 'block';
        warning.textContent = `⚠ Jurnal tidak seimbang. Selisih: ${S.formatCurrency(Math.abs(totalD - totalC))}`;
      } else {
        warning.style.display = 'none';
      }
    }
  }

  function saveJournal(e, existingId = null) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    
    const accCodes = fd.getAll('accountCode[]');
    const debits = fd.getAll('debit[]').map(v => S.parseNumber(v) || 0);
    const credits = fd.getAll('credit[]').map(v => S.parseNumber(v) || 0);
    
    let totalD = debits.reduce((a, b) => a + b, 0);
    let totalC = credits.reduce((a, b) => a + b, 0);
    
    if (Math.abs(totalD - totalC) > 0.01) {
      alert('Gagal: Total Debit dan Kredit harus seimbang!');
      return;
    }
    
    if (totalD === 0) {
      alert('Gagal: Nominal jurnal tidak boleh nol!');
      return;
    }

    const entries = accCodes.map((code, i) => ({
      accountCode: code,
      accountName: S.getCOAByCode(code)?.name || 'Unknown',
      debit: debits[i],
      credit: credits[i]
    })).filter(e => e.debit > 0 || e.credit > 0);

    const journal = {
      journalNumber: fd.get('journalNumber'),
      date: fd.get('date'),
      description: fd.get('description'),
      reference: fd.get('reference'),
      type: 'manual',
      entries: entries
    };

    if (existingId) {
      S.update('journals', existingId, journal);
    } else {
      S.add('journals', journal);
    }
    
    S.recalculateCOA();
    document.getElementById('journalModal').classList.remove('active');
    
    // Check where we are
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('accounting')) {
      TMS.App.navigate(hash);
    } else {
      TMS.App.navigate('journals');
    }
    
    TMS.App.toast(existingId ? 'Jurnal umum berhasil diperbarui' : 'Jurnal umum berhasil disimpan', 'success');
  }

  function viewDetailByNumber(journalNumber) {
    const j = S.getAll('journals').find(j => j.journalNumber === journalNumber);
    if (j) viewDetail(j.id);
    else TMS.App.toast('Jurnal tidak ditemukan', 'error');
  }

  function viewDetail(id) {
    const j = S.getById('journals', id);
    if (!j) return;
    document.getElementById('journalModalTitle').textContent = 'Rincian Jurnal Umum';
    document.getElementById('journalModalBody').innerHTML = renderDetail(j);
    document.getElementById('journalModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function renderDetail(j) {
    const totalDebit = (j.entries || []).reduce((s, e) => s + (e.debit || 0), 0);
    return `
    <div class="detail-view">
      <div class="flex-between mb-2">
        <div>
          <div class="text-muted" style="font-size:12px;">No. Jurnal</div>
          <div style="font-size:22px;font-weight:800;color:var(--primary-light);">${j.journalNumber}</div>
        </div>
        <div style="text-align:right;">
          <div class="text-muted" style="font-size:12px;">Tanggal</div>
          <div style="font-weight:700;">${S.formatDate(j.date)}</div>
        </div>
      </div>
      
      <div class="card mb-2 p-1" style="background:var(--bg-secondary);">
        <div class="form-row">
          <div><label class="form-label">Deskripsi</label><div style="font-weight:600;">${j.description}</div></div>
          <div><label class="form-label">Referensi</label><div class="font-mono">${j.reference || '-'}</div></div>
          <div><label class="form-label">Tipe</label><div><span class="badge badge-primary">${j.type || 'manual'}</span></div></div>
        </div>
      </div>

      <div class="table-container mb-2">
        <table>
          <thead><tr><th>Kode Akun</th><th>Nama Akun</th><th class="text-right">Debit</th><th class="text-right">Kredit</th></tr></thead>
          <tbody>
            ${(j.entries || []).map(e => `
              <tr>
                <td class="font-mono text-muted">${e.accountCode}</td>
                <td style="${e.credit > 0 ? 'padding-left:2.5rem;' : 'font-weight:600;'}">${e.accountName}</td>
                <td class="text-right">${e.debit ? S.formatCurrency(e.debit) : '-'}</td>
                <td class="text-right">${e.credit ? S.formatCurrency(e.credit) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot style="background:var(--bg-secondary);font-weight:800;">
            <tr>
              <td colspan="2" class="text-right">TOTAL</td>
              <td class="text-right">${S.formatCurrency(totalDebit)}</td>
              <td class="text-right">${S.formatCurrency(totalDebit)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <div class="form-actions">
        <button class="btn btn-outline" onclick="document.getElementById('journalModal').classList.remove('active')">Tutup</button>
        <button class="btn btn-primary" onclick="TMS.Accounting.downloadVoucher('${j.id}')"><i data-lucide="printer"></i> Cetak Voucher</button>
        ${j.type === 'manual' ? `<button class="btn btn-warning" onclick="TMS.Accounting.showForm('${j.id}')"><i data-lucide="edit-3"></i> Edit</button>` : ''}
        <button class="btn btn-danger" onclick="TMS.Accounting.deleteJournal('${j.id}')"><i data-lucide="trash-2"></i> Hapus Jurnal</button>
      </div>
    </div>`;
  }

  function downloadVoucher(id) {
    const j = S.getById('journals', id);
    if (!j) return;
    const totalDebit = (j.entries || []).reduce((s, e) => s + (e.debit || 0), 0);
    const rows = (j.entries || []).map(e => [
      e.accountCode,
      e.accountName,
      e.debit ? S.formatCurrency(e.debit) : '-',
      e.credit ? S.formatCurrency(e.credit) : '-'
    ]);
    rows.push([{ content: 'TOTAL', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } }, S.formatCurrency(totalDebit), S.formatCurrency(totalDebit)]);
    
    const subtitle = `No: ${j.journalNumber} | Tanggal: ${S.formatDate(j.date)} | Ref: ${j.reference || '-'} | Deskripsi: ${j.description}`;
    TMS.PDF.generateFinancialReport('Voucher Jurnal Umum', ['Kode Akun', 'Nama Akun', 'Debit', 'Kredit'], rows, subtitle);
  }

  // ---- PDF DOWNLOADS ----
  function downloadIncome() {
    const d = getBalanceData();
    const rows = [];
    rows.push(['PENDAPATAN', '', '', '']);
    d.coa.filter(a => a.type === 'revenue').sort((a, b) => a.code.localeCompare(b.code)).forEach(a => rows.push(['  ' + a.name, a.code, S.formatCurrency(a.balance), '']));
    rows.push(['Total Pendapatan', '', '', S.formatCurrency(d.totalRevenue)]);
    rows.push(['BEBAN POKOK PENJUALAN (BPP)', '', '', '']);
    d.coa.filter(a => a.type === 'cogs').sort((a, b) => a.code.localeCompare(b.code)).forEach(a => rows.push(['  ' + a.name, a.code, S.formatCurrency(a.balance), '']));
    rows.push(['Total BPP', '', '', '(' + S.formatCurrency(d.totalCOGS) + ')']);
    rows.push(['LABA KOTOR', '', '', S.formatCurrency(d.grossProfit)]);
    rows.push(['BEBAN OPERASIONAL', '', '', '']);
    d.coa.filter(a => a.type === 'expense').sort((a, b) => a.code.localeCompare(b.code)).forEach(a => rows.push(['  ' + a.name, a.code, S.formatCurrency(a.balance), '']));
    rows.push(['Total Beban Operasional', '', '', '(' + S.formatCurrency(d.totalExpense) + ')']);
    rows.push(['LABA BERSIH', '', '', S.formatCurrency(d.netProfit)]);
    const subtitle = `Periode: ${S.formatDate(startDate)} - ${S.formatDate(endDate)}`;
    TMS.PDF.generateFinancialReport('Laporan Laba Rugi', ['Keterangan', 'Kode Akun', 'Jumlah', 'Total'], rows, subtitle);
  }

  function exportIncomeExcel() {
    const d = getBalanceData();
    const rows = [];
    rows.push(['PENDAPATAN', '', '', '']);
    d.coa.filter(a => a.type === 'revenue').sort((a, b) => a.code.localeCompare(b.code)).forEach(a => rows.push(['  ' + a.name, a.code, a.balance, '']));
    rows.push(['Total Pendapatan', '', '', d.totalRevenue]);
    rows.push(['BEBAN POKOK PENJUALAN (BPP)', '', '', '']);
    d.coa.filter(a => a.type === 'cogs').sort((a, b) => a.code.localeCompare(b.code)).forEach(a => rows.push(['  ' + a.name, a.code, a.balance, '']));
    rows.push(['Total BPP', '', '', -Math.abs(d.totalCOGS)]);
    rows.push(['LABA KOTOR', '', '', d.grossProfit]);
    rows.push(['BEBAN OPERASIONAL', '', '', '']);
    d.coa.filter(a => a.type === 'expense').sort((a, b) => a.code.localeCompare(b.code)).forEach(a => rows.push(['  ' + a.name, a.code, a.balance, '']));
    rows.push(['Total Beban Operasional', '', '', -Math.abs(d.totalExpense)]);
    rows.push(['LABA BERSIH', '', '', d.netProfit]);
    TMS.Excel.exportReport('Laporan Laba Rugi', ['Keterangan', 'Kode Akun', 'Jumlah', 'Total'], rows);
  }

  function downloadBalance() {
    const d = getBalanceData(true);
    const rows = [];
    rows.push(['ASET', '', '']);
    
    // Regular assets
    d.coa.filter(a => a.type === 'asset' && a.code !== '1-1300' && !a.code.startsWith('1-1300-')).sort((a, b) => a.code.localeCompare(b.code)).forEach(a => {
      rows.push(['  ' + a.name, a.code, S.formatCurrency(a.balance)]);
    });

    // Parent deposit
    const parentDeposit = d.coa.find(a => a.code === '1-1300');
    if (parentDeposit) {
      rows.push(['  ' + parentDeposit.name, parentDeposit.code, S.formatCurrency(parentDeposit.balance)]);
      
      // Sub deposits
      d.coa.filter(a => a.code.startsWith('1-1300-')).sort((a, b) => a.code.localeCompare(b.code)).forEach(sa => {
        rows.push(['      - ' + sa.name, sa.code, S.formatCurrency(sa.balance)]);
      });
    }

    rows.push(['TOTAL ASET', '', S.formatCurrency(d.totalAsset)]);
    rows.push(['KEWAJIBAN', '', '']);
    d.coa.filter(a => a.type === 'liability').sort((a, b) => a.code.localeCompare(b.code)).forEach(a => rows.push(['  ' + a.name, a.code, S.formatCurrency(a.balance)]));
    rows.push(['EKUITAS', '', '']);
    d.coa.filter(a => a.type === 'equity').sort((a, b) => a.code.localeCompare(b.code)).forEach(a => rows.push(['  ' + a.name, a.code, S.formatCurrency(a.balance)]));
    rows.push(['  Laba Bersih Berjalan', '-', S.formatCurrency(d.netProfit)]);
    rows.push(['TOTAL KEWAJIBAN + EKUITAS', '', S.formatCurrency(d.totalLiability + d.totalEquity + d.netProfit)]);
    const subtitle = `Per Tanggal: ${S.formatDate(endDate)}`;
    TMS.PDF.generateFinancialReport('Neraca', ['Keterangan', 'Kode Akun', 'Nilai'], rows, subtitle);
  }

  function exportBalanceExcel() {
    const d = getBalanceData(true);
    const rows = [];
    rows.push(['ASET', '', '']);
    
    // Regular assets
    d.coa.filter(a => a.type === 'asset' && a.code !== '1-1300' && !a.code.startsWith('1-1300-')).sort((a, b) => a.code.localeCompare(b.code)).forEach(a => {
      rows.push(['  ' + a.name, a.code, a.balance]);
    });

    // Parent deposit
    const parentDeposit = d.coa.find(a => a.code === '1-1300');
    if (parentDeposit) {
      rows.push(['  ' + parentDeposit.name, parentDeposit.code, parentDeposit.balance]);
      
      // Sub deposits
      d.coa.filter(a => a.code.startsWith('1-1300-')).sort((a, b) => a.code.localeCompare(b.code)).forEach(sa => {
        rows.push(['      - ' + sa.name, sa.code, sa.balance]);
      });
    }

    rows.push(['TOTAL ASET', '', d.totalAsset]);
    rows.push(['KEWAJIBAN', '', '']);
    d.coa.filter(a => a.type === 'liability').sort((a, b) => a.code.localeCompare(b.code)).forEach(a => rows.push(['  ' + a.name, a.code, a.balance]));
    rows.push(['EKUITAS', '', '']);
    d.coa.filter(a => a.type === 'equity').sort((a, b) => a.code.localeCompare(b.code)).forEach(a => rows.push(['  ' + a.name, a.code, a.balance]));
    rows.push(['  Laba Bersih Berjalan', '-', d.netProfit]);
    rows.push(['TOTAL KEWAJIBAN + EKUITAS', '', d.totalLiability + d.totalEquity + d.netProfit]);
    TMS.Excel.exportReport('Neraca', ['Keterangan', 'Kode Akun', 'Nilai'], rows);
  }

  function downloadCashFlow() {
    const paidInvoices = S.getAll('invoices').filter(i => i.paymentStatus === 'paid');
    const totalReceived = paidInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const totalExpensePaid = S.getAll('expenses').reduce((s, e) => s + (e.amount || 0), 0);
    const kasBalance = (S.getCOAByCode('1-1000')?.balance || 0) + (S.getCOAByCode('1-1001')?.balance || 0);
    const rows = [
      ['A. ARUS KAS OPERASIONAL', ''],
      ['  Penerimaan dari Pelanggan', S.formatCurrency(totalReceived)],
      ['  Pembayaran Beban Operasional', '(' + S.formatCurrency(totalExpensePaid) + ')'],
      ['Arus Kas Bersih - Operasional', S.formatCurrency(totalReceived - totalExpensePaid)],
      ['KENAIKAN KAS BERSIH', S.formatCurrency(totalReceived - totalExpensePaid)],
      ['Saldo Kas & Bank Akhir', S.formatCurrency(kasBalance)],
    ];
    const subtitle = `Periode: ${S.formatDate(startDate)} - ${S.formatDate(endDate)}`;
    TMS.PDF.generateFinancialReport('Laporan Arus Kas', ['Keterangan', 'Jumlah'], rows, subtitle);
  }

  function exportCashFlowExcel() {
    const paidInvoices = S.getAll('invoices').filter(i => i.paymentStatus === 'paid');
    const totalReceived = paidInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const totalExpensePaid = S.getAll('expenses').reduce((s, e) => s + (e.amount || 0), 0);
    const kasBalance = (S.getCOAByCode('1-1000')?.balance || 0) + (S.getCOAByCode('1-1001')?.balance || 0);
    const rows = [
      ['A. ARUS KAS OPERASIONAL', ''],
      ['  Penerimaan dari Pelanggan', totalReceived],
      ['  Pembayaran Beban Operasional', -Math.abs(totalExpensePaid)],
      ['Arus Kas Bersih - Operasional', totalReceived - totalExpensePaid],
      ['KENAIKAN KAS BERSIH', totalReceived - totalExpensePaid],
      ['Saldo Kas & Bank Akhir', kasBalance],
    ];
    TMS.Excel.exportReport('Laporan Arus Kas', ['Keterangan', 'Jumlah'], rows);
  }

  let selectedGroupBookingId = null;

  function setSelectedGroupBookingId(id) {
    selectedGroupBookingId = id;
  }

  function calculateGroupProfitability(bookingId) {
    const umroh = S.getAll('umroh') || [];
    const tours = S.getAll('tours') || [];
    let booking = umroh.find(u => u.id === bookingId);
    let type = 'umroh';
    if (!booking) {
      booking = tours.find(t => t.id === bookingId);
      type = 'tour';
    }
    if (!booking) return null;

    // 1. Pendapatan Kotor (Gross Revenue)
    const revenueAccrual = booking.sellingPrice || 0;
    
    // Payments received (Cash)
    const invoices = S.getAll('invoices').filter(inv => inv.bookingId === booking.id);
    let revenueCash = 0;
    invoices.forEach(inv => {
      const payments = S.getAll('payments').filter(p => p.invoiceId === inv.id && p.status === 'verified');
      revenueCash += payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    });

    // 2. Direct COGS (BPP / Biaya Pokok Penjualan)
    // Base cost price (est. COGS per jemaah * Pax count)
    const baseCOGS = booking.costPrice || 0;

    // Flights COGS
    const flights = S.getAll('flights').filter(f => f.bookingCode === booking.bookingCode || f.reference === booking.bookingCode);
    const flightsCOGS = flights.reduce((sum, f) => sum + (f.costPrice || 0), 0);

    // Hotels COGS
    const hotels = S.getAll('hotels').filter(h => h.bookingCode === booking.bookingCode || h.reference === booking.bookingCode);
    const hotelsCOGS = hotels.reduce((sum, h) => sum + (h.costPrice || 0), 0);

    // Logistics COGS (Only for Umroh)
    let logisticsCOGS = 0;
    let ihramCount = 0;
    let koperCount = 0;
    let batikCount = 0;
    if (type === 'umroh') {
      (booking.participants || []).forEach(p => {
        if (p.ihramSerah) { logisticsCOGS += 150000; ihramCount++; }
        if (p.koperSerah) { logisticsCOGS += 450000; koperCount++; }
        if (p.batikSerah) { logisticsCOGS += 100000; batikCount++; }
      });
    }

    // Total Direct COGS (BPP)
    const totalCOGS = baseCOGS + flightsCOGS + hotelsCOGS + logisticsCOGS;

    // 3. Extra Expenses (Direct Operational Expenses from GL Jurnal)
    const journals = S.getAll('journals').filter(j => j.reference === booking.bookingCode);
    // Find debit entries in expense accounts (starting with '5-' or '6-', but not BPP which is handled as direct COGS)
    let extraExpenses = 0;
    const directExpensesList = [];
    journals.forEach(j => {
      j.entries.forEach(e => {
        if ((e.accountCode.startsWith('5-') || e.accountCode.startsWith('6-')) && e.accountCode !== '5-5350' && e.accountCode !== '5-5300') {
          if (e.debit > 0) {
            extraExpenses += e.debit;
            directExpensesList.push({
              date: j.date,
              journalNumber: j.journalNumber,
              description: j.description,
              accountCode: e.accountCode,
              accountName: e.accountName,
              amount: e.debit
            });
          }
        }
      });
    });

    // 4. Net Profit Margins
    const grossProfit = revenueAccrual - totalCOGS;
    const grossMarginPct = revenueAccrual > 0 ? (grossProfit / revenueAccrual) * 100 : 0;

    const netProfit = grossProfit - extraExpenses;
    const netMarginPct = revenueAccrual > 0 ? (netProfit / revenueAccrual) * 100 : 0;

    return {
      booking,
      type,
      revenueAccrual,
      revenueCash,
      baseCOGS,
      flightsCOGS,
      hotelsCOGS,
      logisticsCOGS,
      ihramCount,
      koperCount,
      batikCount,
      totalCOGS,
      extraExpenses,
      directExpensesList,
      grossProfit,
      grossMarginPct,
      netProfit,
      netMarginPct
    };
  }

  window.TMS_simulateForex = function() {
    const usdRate = parseFloat(document.getElementById('forex_usd_rate').value) || 16200;
    const sarRate = parseFloat(document.getElementById('forex_sar_rate').value) || 4300;

    const baseUSD = parseFloat(document.getElementById('forex_base_usd').value) || 0;
    const baseSAR = parseFloat(document.getElementById('forex_base_sar').value) || 0;

    const simulatedFlightCOGS = baseUSD * usdRate;
    const simulatedHotelCOGS = baseSAR * sarRate;

    const baseCOGS = parseFloat(document.getElementById('forex_base_cogs').value) || 0;
    const logisticsCOGS = parseFloat(document.getElementById('forex_logistics_cogs').value) || 0;
    const extraExpenses = parseFloat(document.getElementById('forex_extra_expenses').value) || 0;
    const revenueAccrual = parseFloat(document.getElementById('forex_revenue_accrual').value) || 0;

    const totalSimulatedCOGS = baseCOGS + simulatedFlightCOGS + simulatedHotelCOGS + logisticsCOGS;
    const simulatedNetProfit = revenueAccrual - totalSimulatedCOGS - extraExpenses;
    const simulatedNetPct = revenueAccrual > 0 ? (simulatedNetProfit / revenueAccrual) * 100 : 0;

    document.getElementById('sim_flight_cogs').textContent = TMS.Store.formatCurrency(simulatedFlightCOGS);
    document.getElementById('sim_hotel_cogs').textContent = TMS.Store.formatCurrency(simulatedHotelCOGS);
    document.getElementById('sim_total_cogs').textContent = TMS.Store.formatCurrency(totalSimulatedCOGS);
    
    const profitEl = document.getElementById('sim_net_profit');
    profitEl.textContent = TMS.Store.formatCurrency(simulatedNetProfit);
    if (simulatedNetProfit >= 0) {
      profitEl.style.color = 'var(--success)';
    } else {
      profitEl.style.color = 'var(--danger)';
    }
    document.getElementById('sim_net_pct').textContent = '(' + simulatedNetPct.toFixed(1) + '%)';
  };

  function downloadGroupProfitabilityPDF(bookingId) {
    const analysis = calculateGroupProfitability(bookingId);
    if (!analysis) return;

    const u = analysis.booking;
    const rows = [];
    rows.push(['PENDAPATAN ROMBONGAN', '', '', '']);
    rows.push(['  Harga Jual Paket Rombongan (Accrual)', u.bookingCode, S.formatCurrency(analysis.revenueAccrual), '']);
    rows.push(['  Total Kas Diterima (Realized)', '', S.formatCurrency(analysis.revenueCash), '']);
    rows.push(['Total Pendapatan (Accrual)', '', '', S.formatCurrency(analysis.revenueAccrual)]);
    
    rows.push(['HARGA POKOK PENJUALAN (BPP / COGS)', '', '', '']);
    rows.push(['  HPP Dasar Paket', '', S.formatCurrency(analysis.baseCOGS), '']);
    if (analysis.flightsCOGS > 0) rows.push(['  Beban Tiket Penerbangan Maskapai', '', S.formatCurrency(analysis.flightsCOGS), '']);
    if (analysis.hotelsCOGS > 0) rows.push(['  Beban Akomodasi Hotel', '', S.formatCurrency(analysis.hotelsCOGS), '']);
    if (analysis.logisticsCOGS > 0) rows.push(['  Beban Inventori Logistik Jemaah', '', S.formatCurrency(analysis.logisticsCOGS), '']);
    rows.push(['Total BPP / Direct COGS', '', '', '(' + S.formatCurrency(analysis.totalCOGS) + ')']);
    
    rows.push(['LABA KOTOR ROMBONGAN', '', '', S.formatCurrency(analysis.grossProfit)]);
    
    rows.push(['BEBAN OPERASIONAL LANGSUNG (GL)', '', '', '']);
    analysis.directExpensesList.forEach(e => {
      rows.push([`  ${e.description} (${S.formatDate(e.date)})`, e.accountCode, S.formatCurrency(e.amount), '']);
    });
    rows.push(['Total Beban Operasional Langsung', '', '', '(' + S.formatCurrency(analysis.extraExpenses) + ')']);
    
    rows.push(['LABA BERSIH ROMBONGAN', '', '', S.formatCurrency(analysis.netProfit)]);
    
    const subtitle = `Rombongan: ${u.packageName || u.tourName} (${u.bookingCode}) - Keberangkatan: ${S.formatDate(u.departureDate)}`;
    TMS.PDF.generateFinancialReport('Laporan Laba Rugi Rombongan', ['Keterangan', 'Referensi / Akun', 'Jumlah', 'Total'], rows, subtitle);
  }

  function renderGroupProfitability() {
    const allBookings = [
      ...S.getAll('umroh').map(b => ({ id: b.id, code: b.bookingCode, name: `🕋 [UMROH] ${b.packageName || b.tourName} (${b.bookingCode})`, type: 'umroh' })),
      ...S.getAll('tours').map(b => ({ id: b.id, code: b.bookingCode, name: `🌴 [WISATA] ${b.tourName} (${b.bookingCode})`, type: 'tour' }))
    ];

    let currentBookingId = selectedGroupBookingId;
    if (!currentBookingId && allBookings.length > 0) {
      currentBookingId = allBookings[0].id;
    }

    if (!currentBookingId) {
      return `
      <div class="card p-3" style="text-align:center;">
        <div class="table-empty" style="padding: 60px;">
          <i data-lucide="line-chart" style="width: 48px; height: 48px; opacity: 0.3; display: block; margin: 0 auto 16px;"></i>
          Belum ada Paket Rombongan aktif (Umroh atau Wisata) untuk dianalisis.
        </div>
      </div>`;
    }

    const analysis = calculateGroupProfitability(currentBookingId);
    if (!analysis) {
      return `<div class="card p-3"><div class="table-empty">Rombongan tidak ditemukan atau terhapus.</div></div>`;
    }

    const u = analysis.booking;
    const optionsHtml = allBookings.map(b => `
      <option value="${b.id}" ${b.id === currentBookingId ? 'selected' : ''}>${b.name}</option>
    `).join('');

    // Cost percentages
    const totalCOGS = analysis.totalCOGS || 1;
    const pctBase = (analysis.baseCOGS / totalCOGS) * 100;
    const pctFlights = (analysis.flightsCOGS / totalCOGS) * 100;
    const pctHotels = (analysis.hotelsCOGS / totalCOGS) * 100;
    const pctLogistics = (analysis.logisticsCOGS / totalCOGS) * 100;

    // Forex simulator multipliers
    const defaultUSDPrice = analysis.flightsCOGS;
    const defaultSARPrice = analysis.hotelsCOGS;
    const defaultUSDQty = Math.round(defaultUSDPrice / 16200);
    const defaultSARQty = Math.round(defaultSARPrice / 4300);

    // Participant rows
    const participants = u.participants || [];
    const participantRowsHtml = participants.map((p, idx) => {
      const sellPortion = analysis.revenueAccrual / (participants.length || 1);
      const basePortion = analysis.baseCOGS / (participants.length || 1);
      const flightPortion = analysis.flightsCOGS / (participants.length || 1);
      const hotelPortion = analysis.hotelsCOGS / (participants.length || 1);
      
      let logPortion = 0;
      if (analysis.type === 'umroh') {
        if (p.ihramSerah) logPortion += 150000;
        if (p.koperSerah) logPortion += 450000;
        if (p.batikSerah) logPortion += 100000;
      }
      
      const totalJemaahCost = basePortion + flightPortion + hotelPortion + logPortion;
      const jemaahNetProfit = sellPortion - totalJemaahCost;
      
      return `
      <tr>
        <td style="text-align:left; padding:10px;">${idx+1}</td>
        <td style="text-align:left; font-weight:700; padding:10px;">${p.name}</td>
        <td style="padding:10px; font-weight:600;" class="font-mono">${S.formatCurrency(sellPortion)}</td>
        <td style="padding:10px;" class="font-mono">${S.formatCurrency(totalJemaahCost)}</td>
        <td style="padding:10px; font-weight:700; color:${jemaahNetProfit >= 0 ? 'var(--success)' : 'var(--danger)'};" class="font-mono">${S.formatCurrency(jemaahNetProfit)}</td>
      </tr>
      `;
    }).join('') || `<tr><td colspan="5" class="table-empty">Belum ada manifest jemaah terdaftar</td></tr>`;

    // Direct operational expenses rows
    const expenseRowsHtml = analysis.directExpensesList.map((e, idx) => `
      <tr>
        <td style="text-align:left; padding:10px;">${S.formatDate(e.date)}</td>
        <td style="text-align:left; font-weight:700; padding:10px;" class="font-mono">${e.journalNumber}</td>
        <td style="text-align:left; padding:10px;">${e.description}</td>
        <td style="text-align:left; padding:10px;"><span class="badge badge-outline" style="font-family:monospace;">${e.accountCode} - ${e.accountName}</span></td>
        <td style="padding:10px; font-weight:700; color:var(--danger);" class="font-mono">${S.formatCurrency(e.amount)}</td>
      </tr>
    `).join('') || `<tr><td colspan="5" class="table-empty">Belum ada beban operasional GL yang dirujuk ke rombongan ini</td></tr>`;

    return `
    <div style="display:flex; flex-direction:column; gap:20px; width:100%;">
      <!-- Selector & PDF Export Toolbar -->
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(184,158,103,0.03); border:1px solid rgba(184,158,103,0.15); border-radius:12px; padding:14px 20px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
          <label style="font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-secondary);">Pilih Rombongan:</label>
          <select class="form-control" style="width:340px; font-weight:700; border-color:rgba(184,158,103,0.25);" onchange="TMS.Accounting.setSelectedGroupBookingId(this.value); TMS.App.navigate('accounting/group-profitability');">
            ${optionsHtml}
          </select>
        </div>
        <div>
          <button type="button" class="btn btn-primary" onclick="TMS.Accounting.downloadGroupProfitabilityPDF('${currentBookingId}')" style="font-weight:700; display:flex; align-items:center; gap:6px;"><i data-lucide="download" style="width:16px;height:16px;"></i> Unduh PDF Laba Rugi</button>
        </div>
      </div>

      <!-- KPI Summary Cards Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">
        <!-- Card 1: Total Pendapatan -->
        <div class="card" style="background: linear-gradient(135deg, rgba(7, 112, 227, 0.05), rgba(7, 112, 227, 0.01)); border: 1px solid rgba(7, 112, 227, 0.15); border-left: 5px solid var(--primary); padding: 18px; border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow-sm);">
          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Pendapatan Kotor (Accrual)</div>
            <div style="font-size: 20px; font-weight: 800; color: var(--text-primary); margin-top: 8px; font-family: monospace;">${S.formatCurrency(analysis.revenueAccrual)}</div>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); border-top: 1px solid var(--border-color); margin-top: 12px; padding-top: 8px; display: flex; justify-content: space-between;">
            <span>Realisasi Kas (Terbayar):</span>
            <span style="font-weight: 700; color: var(--success);">${S.formatCurrency(analysis.revenueCash)}</span>
          </div>
        </div>

        <!-- Card 2: Biaya Pokok (Direct COGS) -->
        <div class="card" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(245, 158, 11, 0.01)); border: 1px solid rgba(245, 158, 11, 0.15); border-left: 5px solid #f59e0b; padding: 18px; border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow-sm);">
          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Biaya Langsung (Direct COGS)</div>
            <div style="font-size: 20px; font-weight: 800; color: var(--text-primary); margin-top: 8px; font-family: monospace;">${S.formatCurrency(analysis.totalCOGS)}</div>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); border-top: 1px solid var(--border-color); margin-top: 12px; padding-top: 8px; display: flex; justify-content: space-between;">
            <span>HPP Dasar & Tiket:</span>
            <span style="font-weight: 700;">${S.formatCurrency(analysis.baseCOGS + analysis.flightsCOGS)}</span>
          </div>
        </div>

        <!-- Card 3: Beban Tambahan Jurnal -->
        <div class="card" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.01)); border: 1px solid rgba(239, 68, 68, 0.15); border-left: 5px solid var(--danger); padding: 18px; border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow-sm);">
          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Beban Operasional Langsung</div>
            <div style="font-size: 20px; font-weight: 800; color: var(--text-primary); margin-top: 8px; font-family: monospace;">${S.formatCurrency(analysis.extraExpenses)}</div>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); border-top: 1px solid var(--border-color); margin-top: 12px; padding-top: 8px; display: flex; justify-content: space-between;">
            <span>Jurnal Beban Ter-tag:</span>
            <span style="font-weight: 700;">${analysis.directExpensesList.length} Transaksi</span>
          </div>
        </div>

        <!-- Card 4: Laba Bersih Rombongan -->
        <div class="card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.06), rgba(16, 185, 129, 0.02)); border: 1px solid rgba(16, 185, 129, 0.18); border-left: 5px solid var(--success); padding: 18px; border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow-sm);">
          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Estimasi Laba Bersih</div>
            <div style="font-size: 20px; font-weight: 800; color: var(--success); margin-top: 8px; font-family: monospace;">${S.formatCurrency(analysis.netProfit)}</div>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); border-top: 1px solid var(--border-color); margin-top: 12px; padding-top: 8px; display: flex; justify-content: space-between;">
            <span>Margin Laba Bersih:</span>
            <span style="font-weight: 800; color: var(--success);">${analysis.netMarginPct.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <!-- Cost Charts & Forex Simulator Grid -->
      <div style="display:flex; gap:20px; flex-wrap:wrap; width:100%;">
        <!-- Cost & Cash Visualizer Charts -->
        <div class="card" style="border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; background: var(--bg-card); flex: 1.5; min-width: 340px; box-shadow: var(--shadow-sm); display:flex; flex-direction:column; gap:24px;">
          
          <!-- Cost Breakdown Chart -->
          <div>
            <div style="font-weight:800; font-size:13px; color:var(--text-primary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--primary);"></span>
              Alokasi Biaya Pokok (Direct COGS)
            </div>
            
            <div style="height: 24px; border-radius: 8px; overflow: hidden; display: flex; width: 100%; background: var(--bg-secondary); margin-bottom: 20px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);">
              ${analysis.baseCOGS > 0 ? `<div style="width: ${pctBase}%; background: var(--primary); height: 100%;" title="HPP Dasar: ${pctBase.toFixed(1)}%"></div>` : ''}
              ${analysis.flightsCOGS > 0 ? `<div style="width: ${pctFlights}%; background: #3b82f6; height: 100%;" title="Tiket Pesawat: ${pctFlights.toFixed(1)}%"></div>` : ''}
              ${analysis.hotelsCOGS > 0 ? `<div style="width: ${pctHotels}%; background: #f59e0b; height: 100%;" title="Akomodasi Hotel: ${pctHotels.toFixed(1)}%"></div>` : ''}
              ${analysis.logisticsCOGS > 0 ? `<div style="width: ${pctLogistics}%; background: #10b981; height: 100%;" title="Logistik: ${pctLogistics.toFixed(1)}%"></div>` : ''}
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:11px; color:var(--text-muted);">
              <div style="display:flex; align-items:center; gap:6px;"><span style="display:inline-block; width:10px; height:10px; border-radius:3px; background:var(--primary);"></span> <strong>HPP Dasar:</strong> ${S.formatCurrency(analysis.baseCOGS)} (${pctBase.toFixed(1)}%)</div>
              <div style="display:flex; align-items:center; gap:6px;"><span style="display:inline-block; width:10px; height:10px; border-radius:3px; background:#3b82f6;"></span> <strong>Tiket Maskapai:</strong> ${S.formatCurrency(analysis.flightsCOGS)} (${pctFlights.toFixed(1)}%)</div>
              <div style="display:flex; align-items:center; gap:6px;"><span style="display:inline-block; width:10px; height:10px; border-radius:3px; background:#f59e0b;"></span> <strong>Akomodasi Hotel:</strong> ${S.formatCurrency(analysis.hotelsCOGS)} (${pctHotels.toFixed(1)}%)</div>
              <div style="display:flex; align-items:center; gap:6px;"><span style="display:inline-block; width:10px; height:10px; border-radius:3px; background:#10b981;"></span> <strong>Logistik Jemaah:</strong> ${S.formatCurrency(analysis.logisticsCOGS)} (${pctLogistics.toFixed(1)}%)</div>
            </div>
          </div>

          <!-- Cash Position Chart -->
          <div style="border-top:1px solid var(--border-color); padding-top:20px;">
            <div style="font-weight:800; font-size:13px; color:var(--text-primary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--success);"></span>
              Realisasi Pembayaran Kas (vs. Piutang)
            </div>

            <div style="height: 24px; border-radius: 8px; overflow: hidden; display: flex; width: 100%; background: var(--bg-secondary); margin-bottom: 20px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);">
              ${analysis.revenueCash > 0 ? `<div style="width: ${(analysis.revenueCash / analysis.revenueAccrual * 100)}%; background: var(--success); height: 100%;" title="Kas Diterima: ${(analysis.revenueCash / analysis.revenueAccrual * 100).toFixed(1)}%"></div>` : ''}
              ${(analysis.revenueAccrual - analysis.revenueCash) > 0 ? `<div style="width: ${((analysis.revenueAccrual - analysis.revenueCash) / analysis.revenueAccrual * 100)}%; background: var(--danger); height: 100%;" title="Sisa Piutang: ${((analysis.revenueAccrual - analysis.revenueCash) / analysis.revenueAccrual * 100).toFixed(1)}%"></div>` : ''}
            </div>

            <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted); flex-wrap:wrap; gap:10px;">
              <div style="display:flex; align-items:center; gap:6px;"><span style="display:inline-block; width:10px; height:10px; border-radius:3px; background:var(--success);"></span> <strong>Kas Diterima (Realized):</strong> ${S.formatCurrency(analysis.revenueCash)} (${(analysis.revenueCash / analysis.revenueAccrual * 100).toFixed(1)}%)</div>
              <div style="display:flex; align-items:center; gap:6px;"><span style="display:inline-block; width:10px; height:10px; border-radius:3px; background:var(--danger);"></span> <strong>Sisa Piutang Jemaah:</strong> ${S.formatCurrency(analysis.revenueAccrual - analysis.revenueCash)} (${((analysis.revenueAccrual - analysis.revenueCash) / analysis.revenueAccrual * 100).toFixed(1)}%)</div>
            </div>
          </div>
        </div>

        <!-- Simulator Kurs Valuta Asing (USD/SAR to IDR) -->
        <div class="card" style="border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; background: var(--bg-card); flex: 1; min-width: 300px; box-shadow: var(--shadow-sm);">
          <div style="font-weight: 800; font-size: 14px; color: var(--primary); margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="calculator" style="width: 18px; height: 18px;"></i>
            Simulator Kurs Valuta Asing (Manual Forex)
          </div>
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
            Simulasikan pergeseran laba bersih akibat fluktuasi kurs mata uang asing pada transaksi Tiket Pesawat (USD) dan Hotel (SAR).
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div class="form-group">
              <label style="font-size: 10px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; display: block;">Kurs USD ke IDR *</label>
              <input class="form-control form-control-sm" type="number" id="forex_usd_rate" value="16200" oninput="TMS_simulateForex()" style="font-weight: 700;">
            </div>
            <div class="form-group">
              <label style="font-size: 10px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; display: block;">Kurs SAR ke IDR *</label>
              <input class="form-control form-control-sm" type="number" id="forex_sar_rate" value="4300" oninput="TMS_simulateForex()" style="font-weight: 700;">
            </div>
          </div>

          <input type="hidden" id="forex_base_usd" value="${defaultUSDQty}">
          <input type="hidden" id="forex_base_sar" value="${defaultSARQty}">
          <input type="hidden" id="forex_base_cogs" value="${analysis.baseCOGS}">
          <input type="hidden" id="forex_logistics_cogs" value="${analysis.logisticsCOGS}">
          <input type="hidden" id="forex_extra_expenses" value="${analysis.extraExpenses}">
          <input type="hidden" id="forex_revenue_accrual" value="${analysis.revenueAccrual}">

          <div style="background: var(--bg-secondary); border-radius: 8px; padding: 12px; font-size: 12px; display: flex; flex-direction: column; gap: 8px;">
            <div class="flex-between">
              <span>Estimasi Tiket Pesawat ($${defaultUSDQty} USD):</span>
              <strong id="sim_flight_cogs" class="font-mono">${S.formatCurrency(analysis.flightsCOGS)}</strong>
            </div>
            <div class="flex-between">
              <span>Estimasi Hotel Makkah/Madinah (${defaultSARQty} SAR):</span>
              <strong id="sim_hotel_cogs" class="font-mono">${S.formatCurrency(analysis.hotelsCOGS)}</strong>
            </div>
            <div class="flex-between" style="border-top: 1px dashed var(--border-color); padding-top: 8px;">
              <span>Simulasi Total Biaya Pokok (BPP):</span>
              <strong id="sim_total_cogs" class="font-mono" style="color: var(--text-primary); font-weight: 700;">${S.formatCurrency(analysis.totalCOGS)}</strong>
            </div>
            <div class="flex-between" style="border-top: 1px dashed var(--border-color); padding-top: 8px; font-size: 13px;">
              <span style="font-weight: 700;">Simulasi Laba Bersih Rombongan:</span>
              <div>
                <strong id="sim_net_profit" class="font-mono" style="font-weight: 800; color: ${analysis.netProfit >= 0 ? 'var(--success)' : 'var(--danger)'};">${S.formatCurrency(analysis.netProfit)}</strong>
                <span id="sim_net_pct" style="font-size: 11px; color: var(--success); font-weight: 800; margin-left: 4px;">(${analysis.netMarginPct.toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Participant Ledger Table -->
      <div class="card" style="border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; background: var(--bg-card); box-shadow: var(--shadow-sm);">
        <div style="font-weight: 800; font-size: 14px; color: var(--primary); margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; display: flex; align-items: center; gap: 8px;">
          <i data-lucide="users" style="width: 18px; height: 18px;"></i>
          Kontribusi Keuangan Per Jemaah (Participant Ledger)
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="width:60px; text-align:left; padding:10px;">No</th>
                <th style="text-align:left; padding:10px;">Nama Jemaah</th>
                <th style="padding:10px;">Pendapatan Kotor (Accrual)</th>
                <th style="padding:10px;">Biaya Langsung (Direct COGS)</th>
                <th style="padding:10px;">Estimasi Margin Kontribusi</th>
              </tr>
            </thead>
            <tbody>
              ${participantRowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tagged Direct Expenses Table -->
      <div class="card" style="border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; background: var(--bg-card); box-shadow: var(--shadow-sm);">
        <div style="font-weight: 800; font-size: 14px; color: var(--primary); margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; display: flex; align-items: center; gap: 8px;">
          <i data-lucide="clipboard-list" style="width: 18px; height: 18px;"></i>
          Beban Operasional Langsung Rombongan (GL Journal Tags)
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="width:110px; text-align:left; padding:10px;">Tanggal</th>
                <th style="width:140px; text-align:left; padding:10px;">No. Jurnal</th>
                <th style="text-align:left; padding:10px;">Keterangan</th>
                <th style="text-align:left; padding:10px;">Perkiraan Akun</th>
                <th style="padding:10px;">Jumlah Pengeluaran</th>
              </tr>
            </thead>
            <tbody>
              ${expenseRowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    `;
  }

  function render(subpage) {
    S.recalculateCOA();
    const tabs = [
      { id: 'income', label: '📊 Laba Rugi' },
      { id: 'group-profitability', label: '📈 Laba Rugi Rombongan' },
      { id: 'balance', label: '⚖️ Neraca' },
      { id: 'cashflow', label: '💧 Arus Kas' },
      { id: 'ledger', label: '📒 Buku Besar' },
    ];
    const active = subpage || 'income';
    let content = '';
    if (active === 'income') content = renderIncomeStatement();
    else if (active === 'balance') content = renderBalanceSheet();
    else if (active === 'cashflow') content = renderCashFlow();
    else if (active === 'ledger') content = renderLedger();
    else if (active === 'journals') content = renderJournals();
    else if (active === 'group-profitability') content = renderGroupProfitability();

    if (active === 'journals') return content;

    return `
    <div class="fade-in">
      <div class="tabs">
        ${tabs.map(t => `<button class="tab-btn ${active === t.id ? 'active' : ''}" onclick="TMS.App.navigate('accounting/${t.id}')">${t.label}</button>`).join('')}
      </div>
      <div>${content}</div>
    </div>`;
  }

  function deleteJournal(id) {
    const j = S.getById('journals', id);
    if (!j) return;
    
    if (confirm(`Hapus Jurnal ${j.journalNumber}?\nTindakan ini akan mempengaruhi seluruh laporan keuangan (Laba Rugi, Neraca, Arus Kas).`)) {
      S.remove('journals', id);
      S.recalculateCOA();
      document.getElementById('journalModal').classList.remove('active');
      TMS.App.navigate('journals');
      TMS.App.toast('Jurnal berhasil dihapus', 'success');
    }
  }

  return { render, renderIncomeStatement, renderBalanceSheet, renderCashFlow, renderLedger, renderJournals, showForm, saveJournal, addEntryRow, calcJournalTotal, viewDetail, viewDetailByNumber, deleteJournal, downloadIncome, downloadBalance, downloadCashFlow, downloadVoucher, exportIncomeExcel, exportBalanceExcel, exportCashFlowExcel, setPeriod, resetPeriod, setSelectedGroupBookingId, calculateGroupProfitability, downloadGroupProfitabilityPDF };
})();
