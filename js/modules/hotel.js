/* ========================================
   TMS - Hotel Voucher Module
   ======================================== */
TMS.Hotel = (() => {
  const S = TMS.Store;

  function createJournal(booking) {
    const revenue = booking.sellingPrice || 0;
    const cost = booking.costPrice || 0;
    const payAccCode = booking.paymentAccount || '2-2000';
    const payAccName = S.getCOAByCode(payAccCode)?.name || 'Utang Usaha';

    const j = { journalNumber: S.generateCode('journal'), date: booking.transactionDate || booking.checkIn || new Date().toISOString().split('T')[0], description: `Penjualan Voucher Hotel - ${booking.bookingCode} - ${booking.guestName}`, reference: booking.bookingCode, type: 'hotel_sale', entries: [{ accountCode: '1-1100', accountName: 'Piutang Usaha', debit: revenue, credit: 0 }, { accountCode: '4-4100', accountName: 'Pendapatan Voucher Hotel', debit: 0, credit: revenue }, { accountCode: '5-5100', accountName: 'BPP Voucher Hotel', debit: cost, credit: 0 }, { accountCode: payAccCode, accountName: payAccName, debit: 0, credit: cost }] };
    S.add('journals', j); S.recalculateCOA();
  }

  function createInvoice(booking) {
    const s = S.getSettings();
    const subtotal = booking.sellingPrice || 0;
    const taxRate = s.taxEnabled ? (s.taxRate || 0) : 0;
    const tax = Math.round(subtotal * taxRate / 100);
    const total = subtotal + tax;
    const inv = { invoiceNumber: S.generateCode('invoice'), bookingId: booking.id, bookingCode: booking.bookingCode, bookingType: 'hotel', customerName: booking.customerName || booking.guestName, customerEmail: booking.customerEmail || booking.guestEmail, items: [{ description: `Voucher Hotel ${booking.hotelName} - ${booking.roomType} (${booking.nights} malam)\nTamu: ${booking.guestName} (${booking.guestCategory || 'Adult'})`, qty: booking.nights, unitPrice: Math.round(subtotal / (booking.nights || 1)), total: subtotal }], subtotal, taxRate, tax, total, paymentStatus: 'unpaid', dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], createdAt: booking.transactionDate || new Date().toISOString() };
    S.add('invoices', inv);
  }

  let currentSort = { col: '', asc: true };

  function getSortedHotels(dataList) {
    if (!currentSort.col) return dataList;
    return dataList.sort((a, b) => {
      let valA, valB;
      switch(currentSort.col) {
        case 'bookingCode': valA = (a.bookingCode||'').toLowerCase(); valB = (b.bookingCode||'').toLowerCase(); break;
        case 'customerName': valA = (a.customerName||a.guestName||'').toLowerCase(); valB = (b.customerName||b.guestName||'').toLowerCase(); break;
        case 'hotelName': valA = (a.hotelName||'').toLowerCase(); valB = (b.hotelName||'').toLowerCase(); break;
        case 'checkIn': valA = a.checkIn||''; valB = b.checkIn||''; break;
        case 'checkOut': valA = a.checkOut||''; valB = b.checkOut||''; break;
        case 'nights': valA = a.nights||0; valB = b.nights||0; break;
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
    
    const searchInp = document.getElementById('hotelSearch');
    if (searchInp && searchInp.value) search(searchInp.value);
    
    if (window.lucide) lucide.createIcons();
  }

  function renderList() {
    const hotels = getSortedHotels(S.getAll('hotels'));
    const getSortIcon = (col) => currentSort.col === col ? (currentSort.asc ? ' &uarr;' : ' &darr;') : '';
    return `
    <div class="fade-in">
      <div class="toolbar">
        <div class="search-box"><i data-lucide="search"></i><input type="text" id="hotelSearch" placeholder="Cari pelanggan, kode booking..." oninput="TMS.Hotel.search(this.value)"></div>
        <div class="btn-group">
          <button class="btn btn-secondary" onclick="TMS.Excel.triggerImport('hotels')"><i data-lucide="upload"></i> Import</button>
          <button class="btn btn-secondary" onclick="TMS.Excel.exportData('hotels')"><i data-lucide="download"></i> Export</button>
          <button class="btn btn-primary" onclick="TMS.Hotel.showForm()"><i data-lucide="plus"></i> Buat Voucher Hotel</button>
        </div>
      </div>
      <div class="card">
        <div class="table-container">
          <table class="table-sortable">
            <thead><tr>
              <th style="cursor:pointer;" onclick="TMS.Hotel.sortTable('transactionDate')">Tgl Transaksi${getSortIcon('transactionDate')}</th>
              <th style="cursor:pointer;" onclick="TMS.Hotel.sortTable('bookingCode')">Kode Booking${getSortIcon('bookingCode')}</th>
              <th style="cursor:pointer;" onclick="TMS.Hotel.sortTable('customerName')">Pelanggan${getSortIcon('customerName')}</th>
              <th style="cursor:pointer;" onclick="TMS.Hotel.sortTable('hotelName')">Hotel${getSortIcon('hotelName')}</th>
              <th style="cursor:pointer;" onclick="TMS.Hotel.sortTable('checkIn')">Check-in${getSortIcon('checkIn')}</th>
              <th style="cursor:pointer;" onclick="TMS.Hotel.sortTable('checkOut')">Check-out${getSortIcon('checkOut')}</th>
              <th style="cursor:pointer;" onclick="TMS.Hotel.sortTable('nights')">Malam${getSortIcon('nights')}</th>
              <th style="cursor:pointer;" onclick="TMS.Hotel.sortTable('sellingPrice')">Harga Jual${getSortIcon('sellingPrice')}</th>
              <th style="cursor:pointer;" onclick="TMS.Hotel.sortTable('margin')">Margin${getSortIcon('margin')}</th>
              <th style="cursor:pointer;" onclick="TMS.Hotel.sortTable('status')">Status${getSortIcon('status')}</th>
              <th>Aksi</th>
            </tr></thead>
            <tbody id="hotelBody">${renderRows(hotels)}</tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="modal-overlay" id="hotelModal">
      <div class="modal modal-full"><div class="modal-header"><span class="modal-title" id="hotelModalTitle">Buat Voucher Hotel</span><button class="modal-close" onclick="TMS.Hotel.closeForm()">✕</button></div>
      <div class="modal-body" id="hotelModalBody">${renderForm()}</div></div>
    </div>`;
  }

  function renderRows(hotels) {
    if (!hotels.length) return `<tr><td colspan="10" class="table-empty"><i data-lucide="hotel" style="width:32px;height:32px;display:block;margin:0 auto 8px;opacity:.3;"></i>Belum ada voucher hotel</td></tr>`;
    return hotels.map(h => {
      const margin = (h.sellingPrice || 0) - (h.costPrice || 0);
      return `<tr>
        <td>${S.formatDate(h.transactionDate || h.createdAt)}</td>
        <td><span class="font-mono text-primary">${h.bookingCode}</span></td>
        <td><strong>${h.customerName || h.guestName}</strong><br><span class="text-muted" style="font-size:11px;">${h.customerEmail || ''}</span></td>
        <td>${h.hotelName}<br><span class="text-muted" style="font-size:11px;">${h.roomType}</span></td>
        <td>${S.formatDate(h.checkIn)}</td>
        <td>${S.formatDate(h.checkOut)}</td>
        <td>${h.nights} malam</td>
        <td><strong>${S.formatCurrency(h.sellingPrice)}</strong></td>
        <td class="${margin >= 0 ? 'amount-positive' : 'amount-negative'}">${S.formatCurrency(margin)}</td>
        <td>${h.paymentStatus === 'paid' ? '<span class="badge badge-success badge-dot">Lunas</span>' : '<span class="badge badge-danger badge-dot">Belum Lunas</span>'}</td>
        <td><div class="btn-group">
          <button class="btn btn-sm btn-outline" onclick="TMS.Hotel.showDetail('${h.id}')" title="Detail"><i data-lucide="eye"></i></button>
          <button class="btn btn-sm btn-outline" style="color:var(--primary-light);border-color:var(--primary-light);" onclick="TMS.Hotel.showForm('${h.id}')" title="Edit"><i data-lucide="edit-3"></i></button>
          <button class="btn btn-sm btn-outline" style="color:var(--warning);border-color:var(--warning);" onclick="TMS.Refund.launchRefund('${h.id}', 'hotel')" title="Ajukan Refund / Void"><i data-lucide="rotate-ccw"></i></button>
          <button class="btn btn-sm btn-whatsapp" onclick="TMS.App.shareToWhatsApp('hotel', '${h.id}')" title="Kirim WhatsApp"><i data-lucide="message-square"></i></button>
          <button class="btn btn-sm btn-primary" onclick="TMS.Hotel.download('${h.id}')" title="Unduh Voucher"><i data-lucide="download"></i></button>
          <button class="btn btn-sm btn-danger" onclick="TMS.Hotel.delete('${h.id}')" title="Hapus"><i data-lucide="trash-2"></i></button>
        </div></td>
      </tr>`;
    }).join('');
  }

  function renderForm(data = {}) {
    const generatedCode = S.generateCode('hotel');
    return `
    <form id="hotelForm" onsubmit="TMS.Hotel.save(event)">
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
        <select class="form-control" onchange="TMS.Hotel.onCustomerSelect(this)">
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
          <input type="checkbox" id="copyToGuestBtn" onchange="TMS.Hotel.copyCustomerToGuest(this.checked)" style="margin-right:8px; width:16px; height:16px;">
          <span style="font-weight:600; color:var(--text-color);">Pemesan juga sebagai Tamu yang Menginap</span>
        </label>
      </div>

      <div class="form-section-title"><i data-lucide="users"></i> Data Tamu Menginap</div>
      <div class="form-group mb-1">
        <label class="form-label">Tambahkan dari Pelanggan Terdaftar</label>
        <select class="form-control" onchange="TMS.Hotel.onGuestSelect(this)">
          <option value="">-- Pilih untuk menambah tamu --</option>
          ${S.getAll('customers').map(c => `<option value="${c.id}">${c.name} (${c.customerCode})</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Nama Tamu *</label><input class="form-control" name="guestName" id="h_name" value="${data.guestName || ''}" required placeholder="Nama lengkap"></div>
        <div class="form-group"><label class="form-label">Kategori *</label>
          <select class="form-control" name="guestCategory" required>
            <option value="Adult" ${data.guestCategory === 'Adult' ? 'selected' : ''}>Dewasa (Adult)</option>
            <option value="Child" ${data.guestCategory === 'Child' ? 'selected' : ''}>Anak (Child)</option>
            <option value="Infant" ${data.guestCategory === 'Infant' ? 'selected' : ''}>Bayi (Infant)</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Email</label><input class="form-control" type="email" name="guestEmail" id="h_email" value="${data.guestEmail || ''}" placeholder="email@domain.com"></div>
        <div class="form-group"><label class="form-label">Telepon</label><input class="form-control" name="guestPhone" id="h_phone" value="${data.guestPhone || ''}" placeholder="08xx-xxxx-xxxx"></div>
      </div>
      <div class="form-section-title"><i data-lucide="hotel"></i> Detail Hotel</div>
      <div class="form-group">
        <label class="form-label">Pilih Hotel dari Database (Opsional)</label>
        <select class="form-control" onchange="TMS.Hotel.onHotelDbSelect(this)">
          <option value="">-- Input Manual / Bebas --</option>
          ${S.getAll('db_hotels').map(h => `<option value="${h.id}">${h.name} — ${h.city} (${h.stars}★)</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Nama Hotel *</label><input class="form-control" name="hotelName" value="${data.hotelName || ''}" required placeholder="The Ritz-Carlton Bali"></div>
      <div class="form-group"><label class="form-label">Alamat Hotel</label><input class="form-control" name="hotelAddress" value="${data.hotelAddress || ''}" placeholder="Jl. Raya Nusa Dua Selatan Lot III, Nusa Dua, Bali"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Tipe Kamar *</label>
          <select class="form-control" name="roomType" required>
            <option value="">Pilih tipe kamar</option>
            <option ${data.roomType === 'Deluxe Room' ? 'selected' : ''}>Deluxe Room</option>
            <option ${data.roomType === 'Superior Room' ? 'selected' : ''}>Superior Room</option>
            <option ${data.roomType === 'Suite Room' ? 'selected' : ''}>Suite Room</option>
            <option ${data.roomType === 'Standard Room' ? 'selected' : ''}>Standard Room</option>
            <option ${data.roomType === 'Junior Suite' ? 'selected' : ''}>Junior Suite</option>
            <option ${data.roomType === 'Presidential Suite' ? 'selected' : ''}>Presidential Suite</option>
            <option ${data.roomType === 'Family Room' ? 'selected' : ''}>Family Room</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Nomor Konfirmasi (Voucher)</label><input class="form-control" name="confirmationNumber" value="${data.confirmationNumber || ''}" placeholder="Contoh: 123456789"></div>
      </div>
      <div class="form-row-3">
        <div class="form-group"><label class="form-label">Nomor Kamar</label><input class="form-control" name="roomNumber" value="${data.roomNumber || ''}" placeholder="201"></div>
        <div class="form-group"><label class="form-label">Check-in *</label><input class="form-control" type="date" name="checkIn" value="${data.checkIn || ''}" required onchange="TMS.Hotel.calcNights()"></div>
        <div class="form-group"><label class="form-label">Check-out *</label><input class="form-control" type="date" name="checkOut" value="${data.checkOut || ''}" required onchange="TMS.Hotel.calcNights()"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Sarapan?</label>
          <select class="form-control" name="breakfast">
            <option value="Termasuk" ${data.breakfast === 'Termasuk' ? 'selected' : ''}>Termasuk Sarapan</option>
            <option value="Tidak Termasuk" ${data.breakfast === 'Tidak Termasuk' ? 'selected' : ''}>Tanpa Sarapan</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Jumlah Malam</label><div class="form-control" id="nightsDisplay" style="color:var(--primary-light);font-weight:700;">0 malam</div><input type="hidden" name="nights" id="nightsInput" value="${data.nights || 0}"></div>
      </div>
      <div class="form-group"><label class="form-label">Catatan Khusus</label><input class="form-control" name="specialRequest" value="${data.specialRequest || ''}" placeholder="Permintaan khusus..."></div>
      <div class="form-section-title"><i data-lucide="dollar-sign"></i> Harga & Pembayaran Vendor</div>
      <div class="card p-1 mb-2" style="background:rgba(7,112,227,0.03); border:1px solid var(--primary-light);">
        <div class="form-group">
          <label class="form-label" style="color:var(--primary-light); font-weight:700;">Bayar Vendor Menggunakan Akun: *</label>
          <select class="form-control" name="paymentAccount" required style="border-color:var(--primary-light);">
            <option value="2-2000" ${data.paymentAccount === '2-2000' || !data.paymentAccount ? 'selected' : ''}>2-2000 - Utang Usaha (Belum Bayar)</option>
            ${S.getCOA().filter(a => a.type === 'asset' && (a.code.startsWith('1-10') || a.code.startsWith('1-13'))).sort((a, b) => a.code.localeCompare(b.code)).map(a => `<option value="${a.code}" ${data.paymentAccount === a.code ? 'selected' : ''}>${a.code} - ${a.name} (Saldo: ${S.formatCurrency(a.balance)})</option>`).join('')}
          </select>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Pilih akun kas/bank/deposit yang digunakan untuk membayar modal hotel ke vendor.</div>
        </div>
      </div>
      <div class="form-row-3">
        <div class="form-group"><label class="form-label">Harga Modal / Beli (per malam) *</label><div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" name="costPricePerNight" value="${S.formatInt(data.costPricePerNight || '')}" required placeholder="0" oninput="TMS.App.formatNumberInput(this); TMS.Hotel.calcTotal()"></div></div>
        <div class="form-group"><label class="form-label">Margin (per malam) *</label><div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" id="h_marginPerNight" name="marginPerNight" value="${S.formatInt((data.sellingPricePerNight !== undefined && data.costPricePerNight !== undefined) ? (data.sellingPricePerNight - data.costPricePerNight) : '')}" required placeholder="0" oninput="TMS.App.formatNumberInput(this); TMS.Hotel.calcTotal()"></div></div>
        <div class="form-group"><label class="form-label">Harga Jual (per malam)</label><div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" id="h_sellingPricePerNight" name="sellingPricePerNight" value="${S.formatInt(data.sellingPricePerNight || '')}" readonly style="background:var(--bg-secondary);" placeholder="0"></div></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Total Harga Modal</label><div class="form-control" id="totalCostDisplay" style="color:var(--text-secondary);font-weight:700;">Rp 0</div><input type="hidden" name="costPrice" id="costPriceHidden" value="${data.costPrice || 0}"></div>
        <div class="form-group"><label class="form-label">Total Harga Jual</label><div class="form-control" id="totalSellDisplay" style="color:var(--primary-light);font-weight:700;">Rp 0</div><input type="hidden" name="sellingPrice" id="sellingPriceHidden" value="${data.sellingPrice || 0}"></div>
        <div class="form-group"><label class="form-label">Estimasi Margin (Laba)</label><div class="form-control" id="hotelMarginDisplay" style="background:var(--success-bg); color:var(--success); font-weight:800;">Rp 0</div></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="TMS.Hotel.closeForm()">Batal</button>
        <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Terbitkan Voucher Hotel</button>
      </div>
    </form>`;
  }

  function calcNights() {
    const ci = document.querySelector('[name="checkIn"]')?.value;
    const co = document.querySelector('[name="checkOut"]')?.value;
    if (!ci || !co) return;
    const nights = Math.max(0, Math.round((new Date(co) - new Date(ci)) / 86400000));
    const el = document.getElementById('nightsDisplay');
    const inp = document.getElementById('nightsInput');
    if (el) el.textContent = nights + ' malam';
    if (inp) inp.value = nights;
    calcTotal();
  }

  function calcTotal() {
    const nights = parseInt(document.getElementById('nightsInput')?.value) || 0;
    const costPN = S.parseNumber(document.querySelector('[name="costPricePerNight"]')?.value) || 0;
    const marginPN = S.parseNumber(document.querySelector('[name="marginPerNight"]')?.value) || 0;
    const sellPN = costPN + marginPN;

    const sellPNInp = document.getElementById('h_sellingPricePerNight');
    if (sellPNInp) sellPNInp.value = S.formatInt(sellPN);

    const totalCost = costPN * nights; 
    const totalSell = sellPN * nights;
    const totalMargin = totalSell - totalCost;

    const marginTotalEl = document.getElementById('hotelMarginDisplay');
    if (marginTotalEl) {
      marginTotalEl.textContent = S.formatCurrency(totalMargin);
      marginTotalEl.style.color = totalMargin >= 0 ? 'var(--success)' : 'var(--danger)';
    }

    document.getElementById('totalCostDisplay').textContent = S.formatCurrency(totalCost);
    document.getElementById('totalSellDisplay').textContent = S.formatCurrency(totalSell);
    document.getElementById('costPriceHidden').value = totalCost;
    document.getElementById('sellingPriceHidden').value = totalSell;
  }

  function showForm(id = null) { 
    const modal = document.getElementById('hotelModal');
    if (id) {
      const h = S.getById('hotels', id);
      if (!h) return;
      modal.querySelector('.modal-title').textContent = 'Edit Voucher Hotel';
      modal.querySelector('.modal-body').innerHTML = renderForm(h);
      modal.classList.add('active'); 
      calcNights();
    } else {
      modal.querySelector('.modal-title').textContent = 'Buat Voucher Hotel';
      modal.querySelector('.modal-body').innerHTML = renderForm();
      modal.classList.add('active'); 
    }
    if (window.lucide) lucide.createIcons(); 
  }
  function closeForm() { document.getElementById('hotelModal').classList.remove('active'); }

  function showDetail(id) {
    const h = S.getById('hotels', id);
    if (!h) return;
    const modal = document.getElementById('hotelModal');
    modal.querySelector('.modal-title').textContent = 'Detail Voucher Hotel';
    modal.querySelector('.modal-body').innerHTML = renderDetail(h);
    modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function renderDetail(h) {
    return `
    <div class="detail-view">
      <div class="detail-header mb-2" style="border-bottom:1px solid var(--border-color);padding-bottom:1rem;">
        <div class="flex-between">
          <div>
            <h3 class="mb-0" style="color:var(--primary-light);">${h.hotelName}</h3>
            <div class="text-muted">${h.hotelAddress || '-'}</div>
          </div>
          <div class="text-right">
            <span class="badge ${h.paymentStatus === 'paid' ? 'badge-success' : 'badge-danger'}">${h.paymentStatus === 'paid' ? 'LUNAS' : 'BELUM LUNAS'}</span>
            <div class="font-mono mt-1" style="font-weight:700;">${h.bookingCode}</div>
          </div>
        </div>
      </div>

      <div class="form-row mb-2">
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">CHECK-IN</div>
          <div class="font-bold" style="font-size:16px;">${S.formatDate(h.checkIn)}</div>
        </div>
        <div style="display:flex;align-items:center;padding:0 1rem;"><i data-lucide="calendar" class="text-primary"></i></div>
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">CHECK-OUT</div>
          <div class="font-bold" style="font-size:16px;">${S.formatDate(h.checkOut)}</div>
        </div>
      </div>

      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="user" style="width:14px;height:14px;vertical-align:middle;"></i> DATA PEMESAN</div>
      <div class="card mb-2 p-1" style="background:var(--bg-secondary);">
        <div class="flex-between mb-1"><span>Nama Lengkap</span><strong>${h.customerName || h.guestName || '-'}</strong></div>
        <div class="flex-between mb-1"><span>Kontak</span><strong>${h.customerEmail || '-'} | ${h.customerPhone || '-'}</strong></div>
      </div>

      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="info" style="width:14px;height:14px;vertical-align:middle;"></i> DETAIL KAMAR & TAMU</div>
      <div class="card mb-2 p-1" style="background:var(--bg-secondary);">
        <div class="flex-between mb-1"><span>Nama Tamu Utama</span><strong>${h.guestName} (${h.guestCategory || 'Adult'})</strong></div>
        <div class="flex-between mb-1"><span>Tipe Kamar</span><strong>${h.roomType}</strong></div>
        <div class="flex-between mb-1"><span>Nomor Kamar</span><strong>${h.roomNumber || '-'}</strong></div>
        <div class="flex-between mb-1"><span>Sarapan</span><strong>${h.breakfast}</strong></div>
        <div class="flex-between mb-1"><span>Jumlah Malam</span><strong>${h.nights} malam</strong></div>
        <div class="flex-between"><span>No. Konfirmasi</span><strong class="font-mono text-primary">${h.confirmationNumber || '-'}</strong></div>
      </div>

      ${h.specialRequest ? `
      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="message-square" style="width:14px;height:14px;vertical-align:middle;"></i> CATATAN KHUSUS</div>
      <div class="card mb-2 p-1" style="background:rgba(255,193,7,0.05);border-left:3px solid #ffc107;">
        ${h.specialRequest}
      </div>` : ''}

      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="dollar-sign" style="width:14px;height:14px;vertical-align:middle;"></i> RINCIAN BIAYA & PEMBAYARAN</div>
      <div class="card p-1" style="background:var(--bg-secondary);">
        <div class="flex-between mb-1"><span>Harga Modal Total</span><span class="font-mono">${S.formatCurrency(h.costPrice)}</span></div>
        <div class="flex-between mb-1"><span>Sumber Dana / Akun</span><span class="badge badge-outline" style="font-family:monospace;">${h.paymentAccount || '2-2000'}</span></div>
        <div class="flex-between mb-1"><span>Harga Jual Total</span><span class="font-mono" style="color:var(--primary-light);font-weight:700;">${S.formatCurrency(h.sellingPrice)}</span></div>
        <div class="flex-between border-top pt-1 mt-1" style="border-top:1px dashed var(--border-color) !important;">
          <span style="font-weight:700;">Margin Total</span>
          <span class="font-mono ${h.sellingPrice - h.costPrice >= 0 ? 'text-success' : 'text-danger'}" style="font-weight:700;">${S.formatCurrency(h.sellingPrice - h.costPrice)}</span>
        </div>
      </div>
      
      <div class="form-actions mt-2">
        <button class="btn btn-outline" onclick="TMS.Hotel.closeForm()">Tutup</button>
        <button class="btn btn-whatsapp" onclick="TMS.App.shareToWhatsApp('hotel', '${h.id}')"><i data-lucide="message-square"></i> Kirim WhatsApp</button>
        <button class="btn btn-primary" onclick="TMS.Hotel.download('${h.id}')"><i data-lucide="download"></i> Unduh Voucher</button>
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
    
    const isChecked = document.getElementById('copyToGuestBtn')?.checked;
    if (isChecked) {
      copyCustomerToGuest(true);
    }
    sel.value = ""; // Reset select
  }

  function copyCustomerToGuest(isCopy) {
    const guestName = document.getElementById('h_name');
    const guestEmail = document.getElementById('h_email');
    const guestPhone = document.getElementById('h_phone');
    
    if (isCopy && guestName) {
      guestName.value = document.getElementById('customerName')?.value || '';
      if(guestEmail) guestEmail.value = document.getElementById('customerEmail')?.value || '';
      if(guestPhone) guestPhone.value = document.getElementById('customerPhone')?.value || '';
    }
  }

  function onGuestSelect(sel) {
    const id = sel.value;
    if (!id) return;
    const c = S.getById('customers', id);
    if (!c) return;
    document.getElementById('h_name').value = c.name || '';
    document.getElementById('h_email').value = c.email || '';
    document.getElementById('h_phone').value = c.phone || '';
    sel.value = "";
  }

  function save(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    const booking = { ...data };
    booking.costPrice = S.parseNumber(booking.costPrice) || 0;
    booking.sellingPrice = S.parseNumber(booking.sellingPrice) || 0;
    booking.nights = parseInt(booking.nights) || 0;
    booking.costPricePerNight = S.parseNumber(booking.costPricePerNight) || 0;
    booking.sellingPricePerNight = S.parseNumber(booking.sellingPricePerNight) || 0;
    booking.marginPerNight = S.parseNumber(booking.marginPerNight) || 0;
    
    const isEdit = !!data.id;
    let existing = null;
    let isPaid = false;
    if (isEdit) {
      existing = S.getById('hotels', data.id);
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
      S.update('hotels', data.id, booking);
      savedObj = S.getById('hotels', data.id);
      TMS.App.toast('Voucher Hotel berhasil diperbarui!', 'success');
    } else {
      booking.bookingCode = S.generateCode('hotel'); 
      booking.paymentStatus = 'unpaid';
      savedObj = S.add('hotels', booking);
      TMS.App.toast('Voucher Hotel berhasil diterbitkan!', 'success');
    }

    createJournal(savedObj);
    const inv = createInvoice(savedObj);

    if (isEdit && isPaid) {
      S.update('hotels', savedObj.id, { paymentStatus: 'paid' });
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
    TMS.App.navigate('hotels');
  }

  function markPaid(id) {
    const h = S.getById('hotels', id); if (!h) return;
    S.update('hotels', id, { paymentStatus: 'paid' });
    const inv = S.getAll('invoices').find(i => i.bookingId === id);
    if (inv) {
      S.update('invoices', inv.id, { paymentStatus: 'paid', paidAt: new Date().toISOString() });
      const j = { journalNumber: S.generateCode('journal'), date: new Date().toISOString().split('T')[0], description: `Penerimaan Kas - ${h.bookingCode}`, reference: h.bookingCode, type: 'payment_received', entries: [{ accountCode: '1-1000', accountName: 'Kas', debit: inv.total, credit: 0 }, { accountCode: '1-1100', accountName: 'Piutang Usaha', debit: 0, credit: inv.total }] };
      S.add('journals', j); S.recalculateCOA();
    }
    TMS.App.navigate('hotels'); TMS.App.toast('Status pembayaran: LUNAS', 'success');
  }

  function del(id) {
    if (!confirm('Hapus voucher hotel ini? Seluruh invoice dan laporan keuangan terkait juga akan dihapus.')) return;
    const h = S.getById('hotels', id);
    if (!h) return;

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
      if (j.reference === h.bookingCode) S.remove('journals', j.id);
    });

    // 3. Hapus Data Hotel
    S.remove('hotels', id);

    // 4. Rekalkulasi COA
    S.recalculateCOA();

    TMS.App.navigate('hotels');
    TMS.App.toast('Voucher dan data keuangan terkait dihapus', 'warning');
  }

  function search(q) {
    const hotels = S.getAll('hotels').filter(h => !q || (h.customerName||'').toLowerCase().includes(q.toLowerCase()) || (h.guestName||'').toLowerCase().includes(q.toLowerCase()) || h.bookingCode?.toLowerCase().includes(q.toLowerCase()) || h.hotelName?.toLowerCase().includes(q.toLowerCase()));
    document.getElementById('hotelBody').innerHTML = renderRows(getSortedHotels(hotels));
    if (window.lucide) lucide.createIcons();
  }

  function download(id) {
    const h = S.getById('hotels', id);
    if (h) TMS.PDF.generateHotelVoucher(h);
  }

  function onHotelDbSelect(sel) {
    const id = sel.value;
    if (!id) return;
    const h = S.getById('db_hotels', id);
    if (!h) return;

    const nameInp = document.querySelector('[name="hotelName"]');
    const addrInp = document.querySelector('[name="hotelAddress"]');
    if (nameInp) nameInp.value = h.name;
    if (addrInp) addrInp.value = h.address;
  }

  return { renderList, sortTable, showForm, closeForm, save, markPaid, delete: del, search, calcNights, calcTotal, onCustomerSelect, copyCustomerToGuest, onGuestSelect, onHotelDbSelect, showDetail, download };
})();
