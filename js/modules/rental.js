/* ========================================
   TMS - Car Rental Module
   ======================================== */
TMS.Rental = (() => {
  const S = TMS.Store;

  function createJournal(booking) {
    const revenue = booking.sellingPrice || 0, cost = booking.costPrice || 0;
    const payAccCode = booking.paymentAccount || '2-2000';
    const payAccName = S.getCOAByCode(payAccCode)?.name || 'Utang Usaha';

    const j = { journalNumber: S.generateCode('journal'), date: booking.transactionDate || booking.pickupDate || new Date().toISOString().split('T')[0], description: `Penjualan Rental Mobil - ${booking.bookingCode} - ${booking.renterName}`, reference: booking.bookingCode, type: 'rental_sale', entries: [{ accountCode: '1-1100', accountName: 'Piutang Usaha', debit: revenue, credit: 0 }, { accountCode: '4-4200', accountName: 'Pendapatan Rental Mobil', debit: 0, credit: revenue }, { accountCode: '5-5200', accountName: 'BPP Rental Mobil', debit: cost, credit: 0 }, { accountCode: payAccCode, accountName: payAccName, debit: 0, credit: cost }] };
    S.add('journals', j); S.recalculateCOA();
  }

  function createInvoice(booking) {
    const s = S.getSettings();
    const subtotal = booking.sellingPrice || 0;
    const taxRate = s.taxEnabled ? (s.taxRate || 0) : 0;
    const tax = Math.round(subtotal * taxRate / 100);
    const total = subtotal + tax;
    const inv = { invoiceNumber: S.generateCode('invoice'), bookingId: booking.id, bookingCode: booking.bookingCode, bookingType: 'rental', customerName: booking.customerName || booking.renterName, customerEmail: booking.customerEmail || booking.renterEmail, items: [{ description: `Rental ${booking.vehicleType} - ${booking.vehicleName} (${booking.days} hari)`, qty: booking.days, unitPrice: Math.round(subtotal / (booking.days || 1)), total: subtotal }], subtotal, taxRate, tax, total, paymentStatus: 'unpaid', dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], createdAt: booking.transactionDate || new Date().toISOString() };
    return S.add('invoices', inv);
  }

  let currentSort = { col: '', asc: true };

  function getSortedRentals(dataList) {
    if (!currentSort.col) return dataList;
    return dataList.sort((a, b) => {
      let valA, valB;
      switch(currentSort.col) {
        case 'bookingCode': valA = (a.bookingCode||'').toLowerCase(); valB = (b.bookingCode||'').toLowerCase(); break;
        case 'customerName': valA = (a.customerName||a.renterName||'').toLowerCase(); valB = (b.customerName||b.renterName||'').toLowerCase(); break;
        case 'vehicleName': valA = (a.vehicleName||'').toLowerCase(); valB = (b.vehicleName||'').toLowerCase(); break;
        case 'pickupDate': valA = a.pickupDate||''; valB = b.pickupDate||''; break;
        case 'returnDate': valA = a.returnDate||''; valB = b.returnDate||''; break;
        case 'days': valA = a.days||0; valB = b.days||0; break;
        case 'sellingPrice': valA = a.sellingPrice || 0; valB = b.sellingPrice || 0; break;
        case 'margin': valA = (a.sellingPrice||0)-(a.costPrice||0); valB = (b.sellingPrice||0)-(b.costPrice||0); break;
        case 'status': valA = (a.paymentStatus||'').toLowerCase(); valB = (b.paymentStatus||'').toLowerCase(); break;
        default: return 0;
      }
      if (valA < valB) return currentSort.asc ? -1 : 1;
      if (valA > valB) return currentSort.asc ? 1 : -1;
      return 0;
    });
  }

  function sortTable(col) {
    if (currentSort.col === col) {
      currentSort.asc = !currentSort.asc;
    } else {
      currentSort.col = col;
      currentSort.asc = true;
    }
    const content = document.getElementById('pageContent');
    if (content) content.innerHTML = renderList();
    
    const searchInp = document.getElementById('rentalSearch');
    if (searchInp && searchInp.value) search(searchInp.value);
    
    if (window.lucide) lucide.createIcons();
  }

  function renderList() {
    const rentals = getSortedRentals(S.getAll('rentals'));
    const getSortIcon = (col) => currentSort.col === col ? (currentSort.asc ? ' &uarr;' : ' &darr;') : '';
    return `
    <div class="fade-in">
      <div class="toolbar">
        <div class="search-box"><i data-lucide="search"></i><input type="text" id="rentalSearch" placeholder="Cari pelanggan, kode booking..." oninput="TMS.Rental.search(this.value)"></div>
        <div class="btn-group">
          <button class="btn btn-secondary" onclick="TMS.Excel.triggerImport('rentals')"><i data-lucide="upload"></i> Import</button>
          <button class="btn btn-secondary" onclick="TMS.Excel.exportData('rentals')"><i data-lucide="download"></i> Export</button>
          <button class="btn btn-primary" onclick="TMS.Rental.showForm()"><i data-lucide="plus"></i> Buat Voucher Rental</button>
        </div>
      </div>
      <div class="card">
        <div class="table-container">
          <table class="table-sortable">
            <thead><tr>
              <th style="cursor:pointer;" onclick="TMS.Rental.sortTable('transactionDate')">Tgl Transaksi${getSortIcon('transactionDate')}</th>
              <th style="cursor:pointer;" onclick="TMS.Rental.sortTable('bookingCode')">Kode Booking${getSortIcon('bookingCode')}</th>
              <th style="cursor:pointer;" onclick="TMS.Rental.sortTable('customerName')">Pelanggan${getSortIcon('customerName')}</th>
              <th style="cursor:pointer;" onclick="TMS.Rental.sortTable('vehicleName')">Kendaraan${getSortIcon('vehicleName')}</th>
              <th style="cursor:pointer;" onclick="TMS.Rental.sortTable('pickupDate')">Pickup${getSortIcon('pickupDate')}</th>
              <th style="cursor:pointer;" onclick="TMS.Rental.sortTable('returnDate')">Return${getSortIcon('returnDate')}</th>
              <th style="cursor:pointer;" onclick="TMS.Rental.sortTable('days')">Hari${getSortIcon('days')}</th>
              <th style="cursor:pointer;" onclick="TMS.Rental.sortTable('sellingPrice')">Harga Jual${getSortIcon('sellingPrice')}</th>
              <th style="cursor:pointer;" onclick="TMS.Rental.sortTable('margin')">Margin${getSortIcon('margin')}</th>
              <th style="cursor:pointer;" onclick="TMS.Rental.sortTable('status')">Status${getSortIcon('status')}</th>
              <th>Aksi</th>
            </tr></thead>
            <tbody id="rentalBody">${renderRows(rentals)}</tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="modal-overlay" id="rentalModal">
      <div class="modal modal-full"><div class="modal-header"><span class="modal-title" id="rentalModalTitle">Buat Voucher Rental Mobil</span><button class="modal-close" onclick="TMS.Rental.closeForm()">✕</button></div>
      <div class="modal-body" id="rentalModalBody">${renderForm()}</div></div>
    </div>`;
  }

  function renderRows(rentals) {
    if (!rentals.length) return `<tr><td colspan="10" class="table-empty"><i data-lucide="car" style="width:32px;height:32px;display:block;margin:0 auto 8px;opacity:.3;"></i>Belum ada voucher rental</td></tr>`;
    return rentals.map(r => {
      const margin = (r.sellingPrice || 0) - (r.costPrice || 0);
      return `<tr>
        <td>${S.formatDate(r.transactionDate || r.createdAt)}</td>
        <td><span class="font-mono text-primary">${r.bookingCode}</span></td>
        <td><strong>${r.customerName || r.renterName}</strong><br><span class="text-muted" style="font-size:11px;">${r.customerEmail || ''}</span></td>
        <td>${r.vehicleName}<br><span class="text-muted" style="font-size:11px;">${r.vehicleType} • ${r.licensePlate||'-'}</span></td>
        <td>${S.formatDate(r.pickupDate)}<br><span class="text-muted" style="font-size:11px;">${r.pickupLocation||'-'}</span></td>
        <td>${S.formatDate(r.returnDate)}<br><span class="text-muted" style="font-size:11px;">${r.returnLocation||'-'}</span></td>
        <td>${r.days} hari</td>
        <td><strong>${S.formatCurrency(r.sellingPrice)}</strong></td>
        <td class="${margin >= 0 ? 'amount-positive' : 'amount-negative'}">${S.formatCurrency(margin)}</td>
        <td>${r.paymentStatus === 'paid' ? '<span class="badge badge-success badge-dot">Lunas</span>' : '<span class="badge badge-danger badge-dot">Belum Lunas</span>'}</td>
        <td><div class="btn-group">
          <button class="btn btn-sm btn-outline" onclick="TMS.Rental.showDetail('${r.id}')" title="Detail"><i data-lucide="eye"></i></button>
          <button class="btn btn-sm btn-outline" style="color:var(--primary-light);border-color:var(--primary-light);" onclick="TMS.Rental.showForm('${r.id}')" title="Edit"><i data-lucide="edit-3"></i></button>
          <button class="btn btn-sm btn-outline" style="color:var(--warning);border-color:var(--warning);" onclick="TMS.Refund.launchRefund('${r.id}', 'rental')" title="Ajukan Refund / Void"><i data-lucide="rotate-ccw"></i></button>
          <button class="btn btn-sm btn-whatsapp" onclick="TMS.App.shareToWhatsApp('rental', '${r.id}')" title="Kirim WhatsApp"><i data-lucide="message-square"></i></button>
          <button class="btn btn-sm btn-primary" onclick="TMS.Rental.download('${r.id}')" title="Unduh Voucher"><i data-lucide="download"></i></button>
          <button class="btn btn-sm btn-danger" onclick="TMS.Rental.delete('${r.id}')" title="Hapus"><i data-lucide="trash-2"></i></button>
        </div></td>
      </tr>`;
    }).join('');
  }

  function renderForm(data = {}) {
    const generatedCode = S.generateCode('rental');
    return `
    <form id="rentalForm" onsubmit="TMS.Rental.save(event)">
      <input type="hidden" name="id" value="${data.id || ''}">
      <div class="form-section-title"><i data-lucide="hash"></i> Administrasi</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tanggal Transaksi *</label>
          <input class="form-control" type="date" name="transactionDate" value="${data.transactionDate || new Date().toISOString().split('T')[0]}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Itinerary ID (Internal)</label>
          <input class="form-control font-mono" name="itineraryId" value="${data.itineraryId || generatedCode}" readonly style="background:var(--bg-secondary);">
        </div>
      </div>
      <input type="hidden" name="bookingCode" value="${data.bookingCode || data.itineraryId || generatedCode}">

      <div class="form-section-title"><i data-lucide="user"></i> Data Pemesan (Customer)</div>
      <div class="form-group mb-1">
        <label class="form-label">Pilih Pelanggan Terdaftar (Opsional)</label>
        <select class="form-control" onchange="TMS.Rental.onCustomerSelect(this)">
          <option value="">-- Pilih Pelanggan Baru --</option>
          ${S.getAll('customers').map(c => `<option value="${c.id}">${c.name} (${c.customerCode})</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Nama Pemesan *</label><input class="form-control" name="customerName" id="customerName" value="${data.customerName || ''}" required placeholder="Nama lengkap sesuai identitas"></div>
        <div class="form-group"><label class="form-label">No. Identitas (KTP/Paspor)</label><input class="form-control" name="customerId" id="customerId" value="${data.customerId || ''}" placeholder="Nomor KTP / Paspor"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Email Pemesan *</label><input class="form-control" type="email" name="customerEmail" id="customerEmail" value="${data.customerEmail || ''}" required placeholder="email@domain.com"></div>
        <div class="form-group"><label class="form-label">Telepon Pemesan *</label><input class="form-control" name="customerPhone" id="customerPhone" value="${data.customerPhone || ''}" required placeholder="08xx-xxxx-xxxx"></div>
      </div>
      <div class="form-group mb-2">
        <label class="form-label">Alamat Lengkap</label>
        <textarea class="form-control" name="customerAddress" id="customerAddress" rows="2" placeholder="Alamat pengiriman / domisili">${data.customerAddress || ''}</textarea>
      </div>
      
      <div class="form-group mb-2" style="background:var(--bg-secondary); padding:0.75rem; border-radius:4px; border:1px solid var(--border-color);">
        <label style="display:flex; align-items:center; cursor:pointer; margin:0;">
          <input type="checkbox" id="copyToRenterBtn" onchange="TMS.Rental.copyCustomerToRenter(this.checked)" style="margin-right:8px; width:16px; height:16px;">
          <span style="font-weight:600; color:var(--text-color);">Pemesan juga sebagai Pengemudi Utama</span>
        </label>
      </div>

      <div class="form-section-title"><i data-lucide="users"></i> Data Pengemudi Utama / Penyewa</div>
      <div class="form-group mb-1">
        <label class="form-label">Tambahkan dari Pelanggan Terdaftar</label>
        <select class="form-control" onchange="TMS.Rental.onRenterSelect(this)">
          <option value="">-- Pilih untuk menambah pengemudi --</option>
          ${S.getAll('customers').map(c => `<option value="${c.id}">${c.name} (${c.customerCode})</option>`).join('')}
        </select>
      </div>
      <div class="form-row-3">
        <div class="form-group"><label class="form-label">Nama Penyewa *</label><input class="form-control" name="renterName" id="r_name" value="${data.renterName || ''}" required placeholder="Nama lengkap"></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-control" type="email" name="renterEmail" id="r_email" value="${data.renterEmail || ''}" placeholder="email@domain.com"></div>
        <div class="form-group"><label class="form-label">Telepon</label><input class="form-control" name="renterPhone" id="r_phone" value="${data.renterPhone || ''}" placeholder="08xx-xxxx-xxxx"></div>
      </div>
      <div class="form-group"><label class="form-label">No. SIM *</label><input class="form-control" name="licenseNumber" value="${data.licenseNumber || ''}" required placeholder="No. SIM"></div>
      <div class="form-section-title"><i data-lucide="car"></i> Detail Kendaraan</div>
      <div class="form-group">
        <label class="form-label">Pilih Mobil dari Database (Opsional)</label>
        <select class="form-control" onchange="TMS.Rental.onVehicleDbSelect(this)">
          <option value="">-- Input Manual / Bebas --</option>
          ${S.getAll('db_rentals').map(r => `<option value="${r.id}">${r.vehicleName} — ${r.vehicleType} (${r.licensePlate})</option>`).join('')}
        </select>
      </div>
      <div class="form-row-3">
        <div class="form-group"><label class="form-label">Tipe Kendaraan *</label>
          <select class="form-control" name="vehicleType" required>
            <option value="">Pilih tipe</option>
            <option ${data.vehicleType === 'SUV' ? 'selected' : ''}>SUV</option>
            <option ${data.vehicleType === 'MPV' ? 'selected' : ''}>MPV</option>
            <option ${data.vehicleType === 'Sedan' ? 'selected' : ''}>Sedan</option>
            <option ${data.vehicleType === 'Hatchback' ? 'selected' : ''}>Hatchback</option>
            <option ${data.vehicleType === 'City Car' ? 'selected' : ''}>City Car</option>
            <option ${data.vehicleType === 'Pick Up' ? 'selected' : ''}>Pick Up</option>
            <option ${data.vehicleType === 'Bus Mini' ? 'selected' : ''}>Bus Mini</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Nama Kendaraan *</label><input class="form-control" name="vehicleName" value="${data.vehicleName || ''}" required placeholder="Toyota Avanza 2023"></div>
        <div class="form-group"><label class="form-label">Plat Nomor</label><input class="form-control" name="licensePlate" value="${data.licensePlate || ''}" placeholder="B 1234 XYZ"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Termasuk Supir?</label>
          <select class="form-control" name="withDriver">
            <option value="Tanpa Supir" ${data.withDriver === 'Tanpa Supir' ? 'selected' : ''}>Lepas Kunci (Tanpa Supir)</option>
            <option value="Dengan Supir" ${data.withDriver === 'Dengan Supir' ? 'selected' : ''}>Dengan Supir</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Nomor Voucher Rental</label><input class="form-control" name="voucherNumber" value="${data.voucherNumber || ''}" placeholder="Contoh: RENT-123456"></div>
      </div>
      <div class="form-group"><label class="form-label">Fasilitas / Catatan Unit</label><input class="form-control" name="facilities" value="${data.facilities || ''}" placeholder="Contoh: AC dingin, Full Tank, Bersih"></div>
      <div class="form-section-title"><i data-lucide="map-pin"></i> Jadwal Rental</div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Tanggal Pickup *</label><input class="form-control" type="date" name="pickupDate" value="${data.pickupDate || ''}" required onchange="TMS.Rental.calcDays()"></div>
        <div class="form-group"><label class="form-label">Lokasi Pickup</label><input class="form-control" name="pickupLocation" value="${data.pickupLocation || ''}" placeholder="Bandara Soekarno-Hatta"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Tanggal Return *</label><input class="form-control" type="date" name="returnDate" value="${data.returnDate || ''}" required onchange="TMS.Rental.calcDays()"></div>
        <div class="form-group"><label class="form-label">Lokasi Return</label><input class="form-control" name="returnLocation" value="${data.returnLocation || ''}" placeholder="Bandara Soekarno-Hatta"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Jumlah Hari</label><div class="form-control" id="daysDisplay" style="color:var(--primary-light);font-weight:700;">0 hari</div><input type="hidden" name="days" id="daysInput" value="${data.days || 0}"></div>
      </div>
      <div class="form-section-title"><i data-lucide="dollar-sign"></i> Harga & Pembayaran Vendor</div>
      <div class="card p-1 mb-2" style="background:rgba(7,112,227,0.03); border:1px solid var(--primary-light);">
        <div class="form-group">
          <label class="form-label" style="color:var(--primary-light); font-weight:700;">Bayar Vendor Menggunakan Akun: *</label>
          <select class="form-control" name="paymentAccount" required style="border-color:var(--primary-light);">
            <option value="2-2000" ${data.paymentAccount === '2-2000' || !data.paymentAccount ? 'selected' : ''}>2-2000 - Utang Usaha (Belum Bayar)</option>
            ${S.getCOA().filter(a => a.type === 'asset' && (a.code.startsWith('1-10') || a.code.startsWith('1-13'))).sort((a, b) => a.code.localeCompare(b.code)).map(a => `<option value="${a.code}" ${data.paymentAccount === a.code ? 'selected' : ''}>${a.code} - ${a.name} (Saldo: ${S.formatCurrency(a.balance)})</option>`).join('')}
          </select>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Pilih akun kas/bank/deposit yang digunakan untuk membayar modal rental ke vendor.</div>
        </div>
      </div>
      <div class="form-row-3">
        <div class="form-group"><label class="form-label">Harga Modal / Beli (per hari) *</label><div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" name="costPricePerDay" value="${S.formatInt(data.costPricePerDay || '')}" required placeholder="0" oninput="TMS.App.formatNumberInput(this); TMS.Rental.calcTotal()"></div></div>
        <div class="form-group"><label class="form-label">Margin (per hari) *</label><div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" id="r_marginPerDay" name="marginPerDay" value="${S.formatInt((data.sellingPricePerDay !== undefined && data.costPricePerDay !== undefined) ? (data.sellingPricePerDay - data.costPricePerDay) : '')}" required placeholder="0" oninput="TMS.App.formatNumberInput(this); TMS.Rental.calcTotal()"></div></div>
        <div class="form-group"><label class="form-label">Harga Jual (per hari)</label><div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" id="r_sellingPricePerDay" name="sellingPricePerDay" value="${S.formatInt(data.sellingPricePerDay || '')}" readonly style="background:var(--bg-secondary);" placeholder="0"></div></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Total Harga Modal</label><div class="form-control" id="rentalTotalCostDisplay" style="color:var(--text-secondary);font-weight:700;">Rp 0</div><input type="hidden" name="costPrice" id="rentalCostPriceHidden" value="${data.costPrice || 0}"></div>
        <div class="form-group"><label class="form-label">Total Harga Jual</label><div class="form-control" id="rentalTotalSellDisplay" style="color:var(--primary-light);font-weight:700;">Rp 0</div><input type="hidden" name="sellingPrice" id="rentalSellingPriceHidden" value="${data.sellingPrice || 0}"></div>
        <div class="form-group"><label class="form-label">Estimasi Margin (Laba)</label><div class="form-control" id="rentalTotalMarginDisplay" style="background:var(--success-bg); color:var(--success); font-weight:800;">Rp 0</div></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="TMS.Rental.closeForm()">Batal</button>
        <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Terbitkan Voucher Rental</button>
      </div>
    </form>`;
  }

  function calcDays() {
    const pd = document.querySelector('[name="pickupDate"]')?.value;
    const rd = document.querySelector('[name="returnDate"]')?.value;
    if (!pd || !rd) return;
    const days = Math.max(0, Math.round((new Date(rd) - new Date(pd)) / 86400000));
    const el = document.getElementById('daysDisplay'); const inp = document.getElementById('daysInput');
    if (el) el.textContent = days + ' hari'; if (inp) inp.value = days;
    calcTotal();
  }

  function calcTotal() {
    const days = parseInt(document.getElementById('daysInput')?.value) || 0;
    const costPD = S.parseNumber(document.querySelector('[name="costPricePerDay"]')?.value) || 0;
    const marginPD = S.parseNumber(document.querySelector('[name="marginPerDay"]')?.value) || 0;
    const sellPD = costPD + marginPD;

    const sellPDInput = document.getElementById('r_sellingPricePerDay');
    if (sellPDInput) sellPDInput.value = S.formatInt(sellPD);

    const totalCost = costPD * days; 
    const totalSell = sellPD * days; 
    const totalMargin = totalSell - totalCost;

    const tmEl = document.getElementById('rentalTotalMarginDisplay');
    if (tmEl) { tmEl.textContent = S.formatCurrency(totalMargin); tmEl.style.color = totalMargin >= 0 ? 'var(--success)' : 'var(--danger)'; }

    const tcEl = document.getElementById('rentalTotalCostDisplay'); if (tcEl) tcEl.textContent = S.formatCurrency(totalCost);
    const tsEl = document.getElementById('rentalTotalSellDisplay'); if (tsEl) tsEl.textContent = S.formatCurrency(totalSell);
    const chEl = document.getElementById('rentalCostPriceHidden'); if (chEl) chEl.value = totalCost;
    const shEl = document.getElementById('rentalSellingPriceHidden'); if (shEl) shEl.value = totalSell;
  }

  function showForm(id = null) { 
    const modal = document.getElementById('rentalModal');
    if (id) {
      const r = S.getById('rentals', id);
      if (!r) return;
      modal.querySelector('.modal-title').textContent = 'Edit Voucher Rental Mobil';
      modal.querySelector('.modal-body').innerHTML = renderForm(r);
      modal.classList.add('active'); 
      calcDays();
    } else {
      modal.querySelector('.modal-title').textContent = 'Buat Voucher Rental Mobil';
      modal.querySelector('.modal-body').innerHTML = renderForm();
      modal.classList.add('active'); 
    }
    if (window.lucide) lucide.createIcons(); 
  }
  function closeForm() { document.getElementById('rentalModal').classList.remove('active'); }

  function showDetail(id) {
    const r = S.getById('rentals', id);
    if (!r) return;
    const modal = document.getElementById('rentalModal');
    modal.querySelector('.modal-title').textContent = 'Detail Voucher Rental';
    modal.querySelector('.modal-body').innerHTML = renderDetail(r);
    modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function renderDetail(r) {
    return `
    <div class="detail-view">
      <div class="detail-header mb-2" style="border-bottom:1px solid var(--border-color);padding-bottom:1rem;">
        <div class="flex-between">
          <div>
            <h3 class="mb-0" style="color:var(--primary-light);">${r.vehicleName}</h3>
            <div class="text-muted">${r.vehicleType} • ${r.licensePlate || '-'}</div>
          </div>
          <div class="text-right">
            <span class="badge ${r.paymentStatus === 'paid' ? 'badge-success' : 'badge-danger'}">${r.paymentStatus === 'paid' ? 'LUNAS' : 'BELUM LUNAS'}</span>
            <div class="font-mono mt-1" style="font-weight:700;">${r.bookingCode}</div>
          </div>
        </div>
      </div>

      <div class="form-row mb-2">
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">PICKUP</div>
          <div class="font-bold" style="font-size:16px;">${S.formatDate(r.pickupDate)}</div>
          <div class="text-muted">${r.pickupLocation || '-'}</div>
        </div>
        <div style="display:flex;align-items:center;padding:0 1rem;"><i data-lucide="arrow-right" class="text-primary"></i></div>
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">RETURN</div>
          <div class="font-bold" style="font-size:16px;">${S.formatDate(r.returnDate)}</div>
          <div class="text-muted">${r.returnLocation || '-'}</div>
        </div>
      </div>

      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="user" style="width:14px;height:14px;vertical-align:middle;"></i> DATA PEMESAN</div>
      <div class="card mb-2 p-1" style="background:var(--bg-secondary);">
        <div class="flex-between mb-1"><span>Nama Lengkap</span><strong>${r.customerName || r.renterName || '-'}</strong></div>
        <div class="flex-between mb-1"><span>Kontak</span><strong>${r.customerEmail || '-'} | ${r.customerPhone || '-'}</strong></div>
      </div>

      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="info" style="width:14px;height:14px;vertical-align:middle;"></i> DETAIL PENYEWA & UNIT</div>
      <div class="card mb-2 p-1" style="background:var(--bg-secondary);">
        <div class="flex-between mb-1"><span>Pengemudi Utama</span><strong>${r.renterName}</strong></div>
        <div class="flex-between mb-1"><span>No. SIM</span><strong>${r.licenseNumber}</strong></div>
        <div class="flex-between mb-1"><span>Supir</span><strong>${r.withDriver}</strong></div>
        <div class="flex-between mb-1"><span>Lama Sewa</span><strong>${r.days} hari</strong></div>
        <div class="flex-between"><span>No. Voucher Rental</span><strong class="font-mono text-primary">${r.voucherNumber || '-'}</strong></div>
      </div>

      ${r.facilities ? `
      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="sparkles" style="width:14px;height:14px;vertical-align:middle;"></i> FASILITAS / CATATAN UNIT</div>
      <div class="card mb-2 p-1" style="background:rgba(0,196,140,0.05);border-left:3px solid var(--success);">
        ${r.facilities}
      </div>` : ''}

      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="dollar-sign" style="width:14px;height:14px;vertical-align:middle;"></i> RINCIAN BIAYA & PEMBAYARAN</div>
      <div class="card p-1" style="background:var(--bg-secondary);">
        <div class="flex-between mb-1"><span>Harga Modal Total</span><span class="font-mono">${S.formatCurrency(r.costPrice)}</span></div>
        <div class="flex-between mb-1"><span>Sumber Dana / Akun</span><span class="badge badge-outline" style="font-family:monospace;">${r.paymentAccount || '2-2000'}</span></div>
        <div class="flex-between mb-1"><span>Harga Jual Total</span><span class="font-mono" style="color:var(--primary-light);font-weight:700;">${S.formatCurrency(r.sellingPrice)}</span></div>
        <div class="flex-between border-top pt-1 mt-1" style="border-top:1px dashed var(--border-color) !important;">
          <span style="font-weight:700;">Margin Total</span>
          <span class="font-mono ${r.sellingPrice - r.costPrice >= 0 ? 'text-success' : 'text-danger'}" style="font-weight:700;">${S.formatCurrency(r.sellingPrice - r.costPrice)}</span>
        </div>
      </div>
      
      <div class="form-actions mt-2">
        <button class="btn btn-outline" onclick="TMS.Rental.closeForm()">Tutup</button>
        <button class="btn btn-whatsapp" onclick="TMS.App.shareToWhatsApp('rental', '${r.id}')"><i data-lucide="message-square"></i> Kirim WhatsApp</button>
        <button class="btn btn-primary" onclick="TMS.Rental.download('${r.id}')"><i data-lucide="download"></i> Unduh Voucher</button>
      </div>
    </div>`;
  }

  function onCustomerSelect(sel) {
    const id = sel.value;
    if (!id) return;
    const c = S.getById('customers', id);
    if (!c) return;
    document.getElementById('customerName').value = c.name || '';
    document.getElementById('customerId').value = c.idNumber || '';
    document.getElementById('customerEmail').value = c.email || '';
    document.getElementById('customerPhone').value = c.phone || '';
    document.getElementById('customerAddress').value = c.address || '';
    
    const isChecked = document.getElementById('copyToRenterBtn')?.checked;
    if (isChecked) {
      copyCustomerToRenter(true);
    }
    sel.value = ""; // Reset select
  }

  function copyCustomerToRenter(isCopy) {
    const renterName = document.getElementById('r_name');
    const renterEmail = document.getElementById('r_email');
    const renterPhone = document.getElementById('r_phone');
    
    if (isCopy && renterName) {
      renterName.value = document.getElementById('customerName')?.value || '';
      if(renterEmail) renterEmail.value = document.getElementById('customerEmail')?.value || '';
      if(renterPhone) renterPhone.value = document.getElementById('customerPhone')?.value || '';
    }
  }

  function onRenterSelect(sel) {
    const id = sel.value;
    if (!id) return;
    const c = S.getById('customers', id);
    if (!c) return;
    document.getElementById('r_name').value = c.name || '';
    document.getElementById('r_email').value = c.email || '';
    document.getElementById('r_phone').value = c.phone || '';
    sel.value = "";
  }

  function save(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    const booking = { ...data };
    booking.costPrice = S.parseNumber(booking.costPrice) || 0;
    booking.sellingPrice = S.parseNumber(booking.sellingPrice) || 0;
    booking.costPricePerDay = S.parseNumber(booking.costPricePerDay) || 0;
    booking.sellingPricePerDay = S.parseNumber(booking.sellingPricePerDay) || 0;
    booking.marginPerDay = S.parseNumber(booking.marginPerDay) || 0;
    booking.days = parseInt(booking.days) || 0;

    const isEdit = !!data.id;
    let existing = null;
    let isPaid = false;
    if (isEdit) {
      existing = S.getById('rentals', data.id);
      if (existing) {
        isPaid = existing.paymentStatus === 'paid';
        // Clean up financial data associated with old bookingCode/bookingId
        const invoices = S.getAll('invoices').filter(inv => inv.bookingId === data.id);
        invoices.forEach(inv => {
          const payments = S.getAll('payments');
          payments.forEach(p => { if (p.invoiceId === inv.id) S.remove('payments', p.id); });
          S.remove('invoices', inv.id);
        });
        const journals = S.getAll('journals');
        journals.forEach(j => {
          if (j.reference === existing.bookingCode) S.remove('journals', j.id);
        });
      }
    }

    let savedObj = null;
    if (isEdit && existing) {
      booking.bookingCode = existing.bookingCode;
      booking.paymentStatus = existing.paymentStatus || 'unpaid';
      S.update('rentals', data.id, booking);
      savedObj = S.getById('rentals', data.id);
      TMS.App.toast('Voucher Rental berhasil diperbarui!', 'success');
    } else {
      booking.bookingCode = S.generateCode('rental'); 
      booking.paymentStatus = 'unpaid';
      savedObj = S.add('rentals', booking);
      TMS.App.toast('Voucher Rental berhasil diterbitkan!', 'success');
    }

    createJournal(savedObj);
    const inv = createInvoice(savedObj);

    if (isEdit && isPaid) {
      S.update('rentals', savedObj.id, { paymentStatus: 'paid' });
      S.update('invoices', inv.id, { paymentStatus: 'paid', paidAt: existing.paidAt || new Date().toISOString() });
      const j = {
        journalNumber: S.generateCode('journal'),
        date: new Date().toISOString().split('T')[0],
        description: `Penerimaan Kas - ${savedObj.bookingCode}`,
        reference: savedObj.bookingCode,
        type: 'payment_received',
        entries: [
          { accountCode: '1-1000', accountName: 'Kas', debit: inv.total, credit: 0 },
          { accountCode: '1-1100', accountName: 'Piutang Usaha', debit: 0, credit: inv.total }
        ]
      };
      S.add('journals', j);
      S.recalculateCOA();
    }

    closeForm();
    TMS.App.navigate('rentals');
  }

  function markPaid(id) {
    const r = S.getById('rentals', id); if (!r) return;
    S.update('rentals', id, { paymentStatus: 'paid' });
    const inv = S.getAll('invoices').find(i => i.bookingId === id);
    if (inv) {
      S.update('invoices', inv.id, { paymentStatus: 'paid', paidAt: new Date().toISOString() });
      const j = { journalNumber: S.generateCode('journal'), date: new Date().toISOString().split('T')[0], description: `Penerimaan Kas - ${r.bookingCode}`, reference: r.bookingCode, type: 'payment_received', entries: [{ accountCode: '1-1000', accountName: 'Kas', debit: inv.total, credit: 0 }, { accountCode: '1-1100', accountName: 'Piutang Usaha', debit: 0, credit: inv.total }] };
      S.add('journals', j); S.recalculateCOA();
    }
    TMS.App.navigate('rentals'); TMS.App.toast('Status pembayaran: LUNAS', 'success');
  }

  function del(id) {
    if (!confirm('Hapus voucher rental ini? Seluruh invoice dan laporan keuangan terkait juga akan dihapus.')) return;
    const r = S.getById('rentals', id);
    if (!r) return;

    // 1. Hapus Invoice & Pembayaran terkait
    const invoices = S.getAll('invoices').filter(inv => inv.bookingId === id);
    invoices.forEach(inv => {
      const payments = S.getAll('payments');
      payments.forEach(p => { if (p.invoiceId === inv.id) S.remove('payments', p.id); });
      S.remove('invoices', inv.id);
    });

    // 2. Hapus Jurnal terkait (berdasarkan bookingCode)
    const journals = S.getAll('journals');
    journals.forEach(j => {
      if (j.reference === r.bookingCode) S.remove('journals', j.id);
    });

    // 3. Hapus Data Rental
    S.remove('rentals', id);

    // 4. Rekalkulasi COA
    S.recalculateCOA();

    TMS.App.navigate('rentals');
    TMS.App.toast('Voucher dan data keuangan terkait dihapus', 'warning');
  }

  function search(q) {
    const rentals = S.getAll('rentals').filter(r => !q || (r.customerName||'').toLowerCase().includes(q.toLowerCase()) || (r.renterName||'').toLowerCase().includes(q.toLowerCase()) || r.bookingCode?.toLowerCase().includes(q.toLowerCase()));
    document.getElementById('rentalBody').innerHTML = renderRows(getSortedRentals(rentals));
    if (window.lucide) lucide.createIcons();
  }

  function download(id) {
    const r = S.getById('rentals', id);
    if (r) TMS.PDF.generateRentalVoucher(r);
  }

  function onVehicleDbSelect(sel) {
    const id = sel.value;
    if (!id) return;
    const r = S.getById('db_rentals', id);
    if (!r) return;

    const typeInp = document.querySelector('[name="vehicleType"]');
    const nameInp = document.querySelector('[name="vehicleName"]');
    const plateInp = document.querySelector('[name="licensePlate"]');
    const costInp = document.querySelector('[name="costPricePerDay"]');
    const marginInp = document.querySelector('[name="marginPerDay"]');

    if (typeInp) typeInp.value = r.vehicleType;
    if (nameInp) nameInp.value = r.vehicleName;
    if (plateInp) plateInp.value = r.licensePlate;
    if (costInp) costInp.value = r.dailyPrice;
    if (marginInp) {
      marginInp.value = Math.round(r.dailyPrice * 0.15); // Suggest 15% margin
    }
    calcTotal();
  }

  return { renderList, sortTable, showForm, closeForm, save, markPaid, delete: del, search, calcDays, calcTotal, onCustomerSelect, copyCustomerToRenter, onRenterSelect, onVehicleDbSelect, showDetail, download };
})();
