/* ========================================
   TMS - Tour Package Module (With Itinerary Builder)
   ======================================== */
TMS.Tour = (() => {
  const S = TMS.Store;
  let activeTab = 'transactions'; // 'transactions' or 'catalog'
  let editTourData = null;

  const DEFAULT_TOUR_TERMS = `1. Pembayaran & Pendaftaran
- **DP (Uang Muka):** Wajib dibayarkan saat pendaftaran dan bersifat **Hangus (Non-Refundable)**.
- **Pelunasan:** Wajib dilakukan maksimal **14 hari** sebelum keberangkatan. Gagal melunasi berarti pendaftaran batal dan DP hangus.
- **Identitas:** Wajib melampirkan fotokopi KTP/Paspor yang masih berlaku saat mendaftar.

2. Harga Paket
- **Termasuk:** Penerbangan, hotel, transportasi lokal, tiket wisata, dan makan (sesuai itinerary).
- **Tidak Termasuk:** Visa, paspor, asuransi perjalanan, pengeluaran pribadi (laundry, telepon), dan tipping.
- **Catatan:** Harga dapat berubah sewaktu-waktu akibat fluktuasi kurs mata uang atau kenaikan tiket penerbangan sebelum pelunasan dilakukan.

3. Pembatalan & Refund
- **Setelah DP:** DP hangus (100% Non-Refundable).
- **15 - 30 hari sebelum berangkat:** Potongan 50% dari total harga.
- **Kurang dari 14 hari sebelum berangkat:** Potongan 100% (Tidak ada pengembalian dana).
- Fasilitas yang tidak digunakan oleh peserta selama tur tidak dapat diuangkan (No Refund).

4. Force Majeure & Tanggung Jawab
- Pihak travel agent dibebaskan dari segala tuntutan hukum atau refund jika peserta dideportasi/ditolak masuk oleh imigrasi negara setempat.
- Jadwal perjalanan dapat berubah sewaktu-waktu demi keselamatan jika terjadi Force Majeure (bencana alam, perang, pandemi, kebijakan maskapai/pemerintah).
- Kehilangan barang bawaan pribadi, kecelakaan, atau keterlambatan jadwal penerbangan di luar kendali agen menjadi tanggung jawab pribadi peserta atau asuransi perjalanan.`;

  function createJournal(booking) {
    const revenue = booking.sellingPrice || 0, cost = booking.costPrice || 0;
    const payAccCode = booking.paymentAccount || '2-2000';
    const payAccName = S.getCOAByCode(payAccCode)?.name || 'Utang Usaha';

    const j = { journalNumber: S.generateCode('journal'), date: booking.transactionDate || booking.departureDate || new Date().toISOString().split('T')[0], description: `Penjualan Paket Wisata - ${booking.bookingCode} - ${booking.tourName}`, reference: booking.bookingCode, type: 'tour_sale', entries: [{ accountCode: '1-1100', accountName: 'Piutang Usaha', debit: revenue, credit: 0 }, { accountCode: '4-4300', accountName: 'Pendapatan Paket Wisata', debit: 0, credit: revenue }, { accountCode: '5-5300', accountName: 'BPP Paket Wisata', debit: cost, credit: 0 }, { accountCode: payAccCode, accountName: payAccName, debit: 0, credit: cost }] };
    S.add('journals', j); S.recalculateCOA();
  }

  function createInvoice(booking) {
    const s = S.getSettings();
    const subtotal = booking.sellingPrice || 0;
    const taxRate = s.taxEnabled ? (s.taxRate || 0) : 0;
    const tax = Math.round(subtotal * taxRate / 100);
    const total = subtotal + tax;
    const inv = { invoiceNumber: S.generateCode('invoice'), bookingId: booking.id, bookingCode: booking.bookingCode, bookingType: 'tour', customerName: booking.customerName, customerEmail: booking.customerEmail, items: [{ description: `Paket Wisata: ${booking.tourName} (${booking.days} hari)`, qty: 1, unitPrice: subtotal, total: subtotal }], subtotal, taxRate, tax, total, paymentStatus: 'unpaid', dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], createdAt: booking.transactionDate || new Date().toISOString() };
    return S.add('invoices', inv);
  }

  let currentSort = { col: '', asc: true };

  function getSortedTours(dataList) {
    if (!currentSort.col) return dataList;
    return dataList.sort((a, b) => {
      let valA, valB;
      switch(currentSort.col) {
        case 'bookingCode': valA = (a.bookingCode||'').toLowerCase(); valB = (b.bookingCode||'').toLowerCase(); break;
        case 'tourName': valA = (a.tourName||'').toLowerCase(); valB = (b.tourName||'').toLowerCase(); break;
        case 'customerName': valA = (a.customerName||'').toLowerCase(); valB = (b.customerName||'').toLowerCase(); break;
        case 'departureDate': valA = a.departureDate||''; valB = b.departureDate||''; break;
        case 'days': valA = a.days||0; valB = b.days||0; break;
        case 'sellingPrice': valA = a.sellingPrice || 0; valB = b.sellingPrice || 0; break;
        case 'margin': valA = (a.sellingPrice||0)-(a.costPrice||0); valB = (b.sellingPrice||0)-(b.costPrice||0); break;
        case 'status': valA = (a.status==='quotation'?'quotation':a.paymentStatus||'').toLowerCase(); valB = (b.status==='quotation'?'quotation':b.paymentStatus||'').toLowerCase(); break;
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
    
    const searchInp = document.getElementById('tourSearch');
    if (searchInp && searchInp.value) search(searchInp.value);
    
    if (window.lucide) lucide.createIcons();
  }

  function renderList() {
    const getSortIcon = (col) => currentSort.col === col ? (currentSort.asc ? ' &uarr;' : ' &darr;') : '';
    return `
    <div class="fade-in">
      <div class="tabs-navigation mb-2" style="display:flex; gap:8px; border-bottom:2px solid var(--border-color); padding-bottom:0; margin-bottom: 20px;">
        <button class="tab-header-btn" onclick="TMS.Tour.setActiveTab('transactions')" style="padding:10px 20px; font-weight:700; border:none; background:none; color:${activeTab === 'transactions' ? 'var(--primary-light)' : 'var(--text-muted)'}; border-bottom:${activeTab === 'transactions' ? '3px solid var(--primary-light)' : 'none'}; cursor:pointer; font-size:14px; display:flex; align-items:center; gap:8px;">
          <i data-lucide="list"></i> 📋 Transaksi Rombongan
        </button>
        <button class="tab-header-btn" onclick="TMS.Tour.setActiveTab('catalog')" style="padding:10px 20px; font-weight:700; border:none; background:none; color:${activeTab === 'catalog' ? 'var(--primary-light)' : 'var(--text-muted)'}; border-bottom:${activeTab === 'catalog' ? '3px solid var(--primary-light)' : 'none'}; cursor:pointer; font-size:14px; display:flex; align-items:center; gap:8px;">
          <i data-lucide="folder"></i> 🗃️ Manajemen Master Paket
        </button>
      </div>
      ${activeTab === 'transactions' ? renderTransactionsTab() : renderCatalogTab()}
    </div>
    <div class="modal-overlay" id="tourModal">
      <div class="modal modal-full"><div class="modal-header"><span class="modal-title" id="tourModalTitle">Buat Paket Wisata</span><button class="modal-close" onclick="TMS.Tour.closeForm()">✕</button></div>
      <div class="modal-body" id="tourModalBody">${renderForm()}</div></div>
    </div>
    <div class="modal-overlay" id="catalogModal">
      <div class="modal modal-full"><div class="modal-header"><span class="modal-title" id="catalogModalTitle">Buat Master Paket</span><button class="modal-close" onclick="TMS.Tour.closeCatalogForm()">✕</button></div>
      <div class="modal-body" id="catalogModalBody">${renderCatalogForm()}</div></div>
    </div>`;
  }

  function renderTransactionsTab() {
    const tours = getSortedTours(S.getAll('tours'));
    const getSortIcon = (col) => currentSort.col === col ? (currentSort.asc ? ' &uarr;' : ' &darr;') : '';
    return `
      <div class="toolbar">
        <div class="search-box"><i data-lucide="search"></i><input type="text" id="tourSearch" placeholder="Cari paket, pelanggan..." oninput="TMS.Tour.search(this.value)"></div>
        <div class="btn-group">
          <button class="btn btn-secondary" onclick="TMS.Excel.triggerImport('tours')"><i data-lucide="upload"></i> Import</button>
          <button class="btn btn-secondary" onclick="TMS.Excel.exportData('tours')"><i data-lucide="download"></i> Export</button>
          <button class="btn btn-primary" onclick="TMS.Tour.showForm()"><i data-lucide="plus"></i> Buat Paket Wisata</button>
        </div>
      </div>
      <div class="card">
        <div class="table-container">
          <table class="table-sortable">
            <thead><tr>
              <th style="cursor:pointer;" onclick="TMS.Tour.sortTable('transactionDate')">Tgl Transaksi${getSortIcon('transactionDate')}</th>
              <th style="cursor:pointer;" onclick="TMS.Tour.sortTable('bookingCode')">Kode Booking${getSortIcon('bookingCode')}</th>
              <th style="cursor:pointer;" onclick="TMS.Tour.sortTable('tourName')">Nama Paket${getSortIcon('tourName')}</th>
              <th style="cursor:pointer;" onclick="TMS.Tour.sortTable('customerName')">Pelanggan${getSortIcon('customerName')}</th>
              <th style="cursor:pointer;" onclick="TMS.Tour.sortTable('departureDate')">Tgl Berangkat${getSortIcon('departureDate')}</th>
              <th style="cursor:pointer;" onclick="TMS.Tour.sortTable('days')">Durasi${getSortIcon('days')}</th>
              <th style="cursor:pointer;" onclick="TMS.Tour.sortTable('sellingPrice')">Harga Jual${getSortIcon('sellingPrice')}</th>
              <th style="cursor:pointer;" onclick="TMS.Tour.sortTable('margin')">Margin${getSortIcon('margin')}</th>
              <th style="cursor:pointer;" onclick="TMS.Tour.sortTable('status')">Status${getSortIcon('status')}</th>
              <th>Aksi</th>
            </tr></thead>
            <tbody id="tourBody">${renderRows(tours)}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderCatalogTab() {
    const catalogs = S.getAll('master_tours');
    return `
      <div class="toolbar">
        <div class="search-box"><i data-lucide="search"></i><input type="text" id="catalogSearch" placeholder="Cari master paket..." oninput="TMS.Tour.searchCatalog(this.value)"></div>
        <div class="btn-group">
          <button class="btn btn-primary" onclick="TMS.Tour.showCatalogForm()"><i data-lucide="plus"></i> Tambah Master Paket</button>
        </div>
      </div>
      <div class="card">
        <div class="table-container">
          <table>
            <thead><tr>
              <th>Kode Master</th>
              <th>Nama Paket</th>
              <th>Destinasi</th>
              <th>Durasi</th>
              <th>Harga Modal/Pax</th>
              <th>Harga Jual/Pax</th>
              <th>Margin/Pax</th>
              <th>Aksi</th>
            </tr></thead>
            <tbody id="catalogBody">${renderCatalogRows(catalogs)}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderRows(tours) {
    if (!tours.length) return `<tr><td colspan="10" class="table-empty"><i data-lucide="map" style="width:32px;height:32px;display:block;margin:0 auto 8px;opacity:.3;"></i>Belum ada paket wisata</td></tr>`;
    return tours.map(t => {
      const margin = (t.sellingPrice || 0) - (t.costPrice || 0);
      const isQuotation = t.status === 'quotation';
      const statusBadge = isQuotation 
        ? '<span class="badge badge-info badge-dot">Penawaran</span>' 
        : (t.paymentStatus === 'paid' ? '<span class="badge badge-success badge-dot">Lunas</span>' : '<span class="badge badge-danger badge-dot">Belum Lunas</span>');
      return `<tr>
        <td>${S.formatDate(t.transactionDate || t.createdAt)}</td>
        <td><span class="font-mono text-primary">${t.bookingCode}</span></td>
        <td><strong>${t.tourName}</strong></td>
        <td>${t.customerName}</td>
        <td>${S.formatDate(t.departureDate)}</td>
        <td>${t.days} hari</td>
        <td><strong>${S.formatCurrency(t.sellingPrice)}</strong></td>
        <td class="${margin >= 0 ? 'amount-positive' : 'amount-negative'}">${S.formatCurrency(margin)}</td>
        <td>${statusBadge}</td>
        <td><div class="btn-group">
          <button class="btn btn-sm btn-outline" onclick="TMS.Tour.showDetail('${t.id}')" title="Detail"><i data-lucide="eye"></i></button>
          <button class="btn btn-sm btn-outline" style="color:var(--primary-light);border-color:var(--primary-light);" onclick="TMS.Tour.showForm('${t.id}')" title="Edit"><i data-lucide="edit-3"></i></button>
          <button class="btn btn-sm btn-whatsapp" onclick="TMS.App.shareToWhatsApp('tour', '${t.id}')" title="Kirim WhatsApp"><i data-lucide="message-square"></i></button>
          <button class="btn btn-sm btn-secondary" onclick="TMS.Accounting.setSelectedGroupBookingId('${t.id}'); TMS.App.navigate('accounting/group-profitability')" title="Analisis Laba Rugi"><i data-lucide="line-chart" style="color:var(--primary); width:14px; height:14px;"></i></button>
          <button class="btn btn-sm btn-outline" onclick="TMS.Tour.downloadQuotation('${t.id}')" title="Unduh Penawaran"><i data-lucide="file-text"></i></button>
          ${isQuotation 
            ? `<button class="btn btn-sm btn-success" onclick="TMS.Tour.approveQuotation('${t.id}')" title="Setujui & Buat Voucher"><i data-lucide="check-square"></i></button>`
            : `<button class="btn btn-sm btn-primary" onclick="TMS.Tour.download('${t.id}')" title="Unduh Voucher"><i data-lucide="download"></i></button>`
          }
          <button class="btn btn-sm btn-danger" onclick="TMS.Tour.delete('${t.id}')" title="Hapus"><i data-lucide="trash-2"></i></button>
        </div></td>
      </tr>`;
    }).join('');
  }

  function renderCatalogRows(catalogs) {
    if (!catalogs.length) return `<tr><td colspan="8" class="table-empty"><i data-lucide="folder" style="width:32px;height:32px;display:block;margin:0 auto 8px;opacity:.3;"></i>Belum ada katalog master paket</td></tr>`;
    return catalogs.map(c => {
      const margin = (c.sellingPricePerPax || 0) - (c.costPricePerPax || 0);
      return `<tr>
        <td><span class="font-mono text-primary">${c.bookingCode || ''}</span></td>
        <td><strong>${c.tourName || ''}</strong></td>
        <td>${c.destination || ''}</td>
        <td>${c.days || 0} hari</td>
        <td>${S.formatCurrency(c.costPricePerPax || 0)}</td>
        <td><strong>${S.formatCurrency(c.sellingPricePerPax || 0)}</strong></td>
        <td class="${margin >= 0 ? 'amount-positive' : 'amount-negative'}">${S.formatCurrency(margin)}</td>
        <td><div class="btn-group">
          <button class="btn btn-sm btn-outline" onclick="TMS.Tour.showCatalogDetail('${c.id}')" title="Detail"><i data-lucide="eye"></i></button>
          <button class="btn btn-sm btn-outline" onclick="TMS.Tour.showCatalogForm('${c.id}')" title="Ubah"><i data-lucide="edit"></i></button>
          <button class="btn btn-sm btn-danger" onclick="TMS.Tour.deleteCatalog('${c.id}')" title="Hapus"><i data-lucide="trash-2"></i></button>
        </div></td>
      </tr>`;
    }).join('');
  }

  function renderForm(data = {}) {
    const generatedCode = S.generateCode('tour');
    return `
    <form id="tourForm" onsubmit="TMS.Tour.save(event)">
      <input type="hidden" name="id" value="${data.id || ''}">
      <div class="form-group mb-2" style="background:rgba(7,112,227,0.04); padding:1rem; border-radius:8px; border:1px solid var(--primary-light);">
        <label class="form-label" style="color:var(--primary-light); font-weight:700;"><i data-lucide="copy"></i> Salin Rincian dari Master Paket</label>
        <select class="form-control" onchange="TMS.Tour.copyMasterDetails(this)">
          <option value="">-- Pilih Master Paket (Katalog) --</option>
          ${S.getAll('master_tours').map(c => `<option value="${c.id}">${c.tourName} (${c.bookingCode}) - ${S.formatCurrency(c.sellingPricePerPax)}/pax</option>`).join('')}
        </select>
        <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Memilih master paket akan otomatis mengisi detail rincian, harga modal/jual, inclusions, dan baris itinerary.</div>
      </div>

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
        <select class="form-control" onchange="TMS.Tour.onCustomerSelect(this)">
          <option value="">-- Pilih Pelanggan Baru --</option>
          ${S.getAll('customers').map(c => `<option value="${c.id}">${c.name} (${c.customerCode})</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Nama Pemesan *</label><input class="form-control" name="customerName" id="t_name" value="${data.customerName || ''}" required placeholder="Nama lengkap sesuai identitas"></div>
        <div class="form-group"><label class="form-label">No. Identitas (KTP/Paspor)</label><input class="form-control" name="customerId" id="t_id" value="${data.customerId || ''}" placeholder="Nomor KTP / Paspor"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Email Pemesan *</label><input class="form-control" type="email" name="customerEmail" id="t_email" value="${data.customerEmail || ''}" required placeholder="email@domain.com"></div>
        <div class="form-group"><label class="form-label">Telepon Pemesan *</label><input class="form-control" name="customerPhone" id="t_phone" value="${data.customerPhone || ''}" required placeholder="08xx-xxxx-xxxx"></div>
      </div>
      <div class="form-group mb-2">
        <label class="form-label">Alamat Lengkap</label>
        <textarea class="form-control" name="customerAddress" id="t_address" rows="2" placeholder="Alamat pengiriman / domisili">${data.customerAddress || ''}</textarea>
      </div>

      <div class="form-group mb-2" style="background:var(--bg-secondary); padding:0.75rem; border-radius:4px; border:1px solid var(--border-color);">
        <label style="display:flex; align-items:center; cursor:pointer; margin:0;">
          <input type="checkbox" id="copyToLeaderBtn" onchange="TMS.Tour.copyCustomerToLeader(this.checked)" style="margin-right:8px; width:16px; height:16px;">
          <span style="font-weight:600; color:var(--text-color);">Pemesan juga sebagai Ketua Rombongan / Peserta 1</span>
        </label>
      </div>

      <div class="form-section-title"><i data-lucide="map"></i> Detail Paket Wisata</div>
      <div class="form-group"><label class="form-label">Nama Paket Wisata *</label><input class="form-control" name="tourName" value="${data.tourName || ''}" required placeholder="Bali Paradise 5D4N"></div>
      <div class="form-group"><label class="form-label">Destinasi *</label><input class="form-control" name="destination" value="${data.destination || ''}" required placeholder="Bali - Ubud - Kuta"></div>
      
      <div class="form-row-3">
        <div class="form-group"><label class="form-label">Tgl Berangkat *</label><input class="form-control" type="date" name="departureDate" value="${data.departureDate || ''}" required></div>
        <div class="form-group"><label class="form-label">Durasi (Hari) *</label><input class="form-control" type="number" name="days" id="tourDaysInput" required min="1" value="${data.days || 1}" oninput="TMS.Tour.generateItineraryRows()" onchange="TMS.Tour.generateItineraryRows()"></div>
        <div class="form-group"><label class="form-label">Jumlah Peserta *</label><input class="form-control" type="number" name="pax" id="tourPaxInput" required min="1" value="${data.pax || 1}" oninput="TMS.Tour.generateParticipantRows(); TMS.Tour.calcMargin()" onchange="TMS.Tour.generateParticipantRows(); TMS.Tour.calcMargin()"></div>
      </div>

      <!-- PARTICIPANTS LIST -->
      <div class="form-section-title" style="display:flex; justify-content:space-between; align-items:center;">
        <span><i data-lucide="users"></i> Daftar Nama & Telepon Peserta</span>
        <span style="font-size:11px; font-weight:normal; background:var(--primary); color:#fff; padding:2px 8px; border-radius:10px;">Sesuaikan jumlah peserta</span>
      </div>
      <div class="form-group mb-1 mt-1">
        <label class="form-label">Tambahkan dari Pelanggan Terdaftar ke Daftar Peserta</label>
        <select class="form-control" onchange="TMS.Tour.onParticipantSelect(this)">
          <option value="">-- Pilih untuk menambah peserta otomatis --</option>
          ${S.getAll('customers').map(c => `<option value="${c.id}">${c.name} (${c.customerCode})</option>`).join('')}
        </select>
      </div>
      <div id="participantsContainer" style="margin-bottom:24px; border:1px solid var(--border-color); border-radius:12px; padding:16px; background:var(--bg-secondary);">
        <!-- Dynamic rows generated by generateParticipantRows() -->
      </div>

      <!-- ITINERARY BUILDER -->
      <div class="form-section-title" style="display:flex; justify-content:space-between; align-items:center;">
        <span><i data-lucide="calendar"></i> Itinerary (Jadwal Per Hari)</span>
        <span style="font-size:11px; font-weight:normal; background:var(--primary); color:#fff; padding:2px 8px; border-radius:10px;">Otomatis sesuai durasi</span>
      </div>
      <div id="itineraryContainer" style="margin-bottom:24px; border:1px solid var(--border-color); border-radius:12px; padding:16px; background:var(--bg-secondary);">
        <!-- Rows generated by generateItineraryRows() -->
      </div>

      <div class="form-group"><label class="form-label">Inklusi (Fasilitas)</label>
        <textarea class="form-control" name="inclusions" rows="3" placeholder="Contoh: Tiket pesawat PP, Hotel bintang 4, Makan 3x sehari, Tour guide...">${data.inclusions || ''}</textarea>
      </div>

      <div class="form-group"><label class="form-label">Syarat & Ketentuan *</label>
        <textarea class="form-control" name="terms" rows="4" placeholder="Syarat & Ketentuan paket wisata...">${data.terms || DEFAULT_TOUR_TERMS}</textarea>
      </div>

      <div class="form-section-title"><i data-lucide="dollar-sign"></i> Harga & Pembayaran Vendor</div>
      <div class="card p-1 mb-2" style="background:rgba(7,112,227,0.03); border:1px solid var(--primary-light);">
        <div class="form-group">
          <label class="form-label" style="color:var(--primary-light); font-weight:700;">Bayar Vendor Menggunakan Akun: *</label>
          <select class="form-control" name="paymentAccount" required style="border-color:var(--primary-light);">
            <option value="2-2000" ${data.paymentAccount === '2-2000' || !data.paymentAccount ? 'selected' : ''}>2-2000 - Utang Usaha (Belum Bayar)</option>
            ${S.getCOA().filter(a => a.type === 'asset' && (a.code.startsWith('1-10') || a.code.startsWith('1-13'))).sort((a, b) => a.code.localeCompare(b.code)).map(a => `<option value="${a.code}" ${data.paymentAccount === a.code ? 'selected' : ''}>${a.code} - ${a.name} (Saldo: ${S.formatCurrency(a.balance)})</option>`).join('')}
          </select>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Pilih akun kas/bank/deposit yang digunakan untuk membayar modal paket ke vendor.</div>
        </div>
      </div>
      <div class="form-row-3">
        <div class="form-group"><label class="form-label">Harga Modal (per orang) *</label><div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" name="costPricePerPax" value="${S.formatInt(data.costPricePerPax || '')}" required placeholder="0" oninput="TMS.App.formatNumberInput(this); TMS.Tour.calcMargin()"></div></div>
        <div class="form-group"><label class="form-label">Margin Laba (per orang) *</label><div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" id="t_marginPerPax" name="marginPerPax" value="${S.formatInt(data.marginPerPax || '')}" required placeholder="0" oninput="TMS.App.formatNumberInput(this); TMS.Tour.calcMargin()"></div></div>
        <div class="form-group"><label class="form-label">Harga Jual (per orang)</label><div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" id="t_sellingPricePerPax" name="sellingPricePerPax" value="${S.formatInt(data.sellingPricePerPax || '')}" readonly style="background:var(--bg-secondary);" placeholder="0"></div></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Total Harga Modal</label><div class="form-control" id="tourTotalCostDisplay" style="color:var(--text-secondary);font-weight:700;">Rp 0</div><input type="hidden" name="costPrice" id="tourCostPriceHidden" value="${data.costPrice || ''}"></div>
        <div class="form-group"><label class="form-label">Total Harga Jual</label><div class="form-control" id="tourTotalSellDisplay" style="color:var(--primary-light);font-weight:700;">Rp 0</div><input type="hidden" name="sellingPrice" id="tourSellingPriceHidden" value="${data.sellingPrice || ''}"></div>
        <div class="form-group"><label class="form-label">Total Margin (Laba)</label><div class="form-control" id="tourTotalMarginDisplay" style="background:var(--success-bg); color:var(--success); font-weight:800;">Rp 0</div></div>
      </div>

      <div class="form-group mb-2" style="background:var(--bg-secondary); padding:0.75rem; border-radius:4px; border:1px solid var(--border-color);">
        <label style="display:flex; align-items:center; cursor:pointer; margin:0;">
          <input type="checkbox" name="saveAsMaster" style="margin-right:8px; width:16px; height:16px;">
          <span style="font-weight:600; color:var(--text-color);">Simpan juga rancangan ini sebagai Master Paket baru di Katalog</span>
        </label>
      </div>

      <input type="hidden" name="tourSaveType" id="tourSaveType" value="confirmed">
      ${data.id && data.status !== 'quotation' ? `
      <div class="form-actions" style="display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap;">
        <button type="button" class="btn btn-outline" onclick="TMS.Tour.closeForm()">Batal</button>
        <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Simpan Perubahan</button>
      </div>` : `
      <div class="form-actions" style="display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap;">
        <button type="button" class="btn btn-outline" onclick="TMS.Tour.closeForm()">Batal</button>
        <button type="button" class="btn btn-info" onclick="document.getElementById('tourSaveType').value='quotation'; document.getElementById('tourForm').requestSubmit()"><i data-lucide="file-text"></i> Simpan Penawaran</button>
        <button type="button" class="btn btn-primary" onclick="document.getElementById('tourSaveType').value='confirmed'; document.getElementById('tourForm').requestSubmit()"><i data-lucide="check-circle"></i> Terbitkan Voucher Langsung</button>
      </div>`}
    </form>`;
  }

  function generateItineraryRows() {
    const days = parseInt(document.getElementById('tourDaysInput')?.value) || 1;
    const container = document.getElementById('itineraryContainer');
    if (!container) return;
    
    // Save existing data first
    const existingData = [];
    const currentDays = container.querySelectorAll('.itinerary-row').length;
    for (let i = 1; i <= currentDays; i++) {
      existingData.push({
        title: document.querySelector(`[name="iti_title_${i}"]`)?.value || '',
        description: document.querySelector(`[name="iti_desc_${i}"]`)?.value || ''
      });
    }

    let html = '';
    for (let i = 1; i <= days; i++) {
      let titleVal = '';
      let descVal = '';
      if (existingData[i - 1]) {
        titleVal = existingData[i - 1].title;
        descVal = existingData[i - 1].description;
      } else if (editTourData && editTourData.itinerary && editTourData.itinerary[i - 1]) {
        titleVal = editTourData.itinerary[i - 1].title || '';
        descVal = editTourData.itinerary[i - 1].description || '';
      }
      html += `
      <div class="itinerary-row" style="margin-bottom:16px; padding-bottom:16px; border-bottom:1px dashed var(--border-color);">
        <div style="font-weight:700; font-size:12px; margin-bottom:8px; color:var(--primary);">HARI ${i}</div>
        <div class="form-group" style="margin-bottom:8px;">
          <input class="form-control form-control-sm" name="iti_title_${i}" value="${titleVal.replace(/"/g, '&quot;')}" placeholder="Judul aktivitas (misal: Penjemputan di Bandara)" required>
        </div>
        <div class="form-group">
          <textarea class="form-control form-control-sm" name="iti_desc_${i}" rows="2" placeholder="Detail kegiatan hari ini..." required>${descVal}</textarea>
        </div>
      </div>`;
    }
    container.innerHTML = html || '<p style="text-align:center; color:var(--text-muted); font-size:13px;">Masukkan durasi hari untuk membuat itinerary</p>';
    if (window.lucide) lucide.createIcons();
  }

  function generateParticipantRows() {
    const pax = parseInt(document.getElementById('tourPaxInput')?.value) || 1;
    const container = document.getElementById('participantsContainer');
    if (!container) return;

    // Save existing data
    const existingData = [];
    const currentPax = container.querySelectorAll('.participant-row').length;
    for(let i=1; i<=currentPax; i++) {
        existingData.push({
            name: document.querySelector(`[name="pax_name_${i}"]`)?.value || '',
            nik: document.querySelector(`[name="pax_nik_${i}"]`)?.value || '',
            phone: document.querySelector(`[name="pax_phone_${i}"]`)?.value || ''
        });
    }

    let html = '';
    for (let i = 1; i <= pax; i++) {
      let data = {name:'', nik:'', phone:''};
      if (existingData[i-1] && (existingData[i-1].name || existingData[i-1].nik || existingData[i-1].phone)) {
        data = existingData[i-1];
      } else if (editTourData && editTourData.participants && editTourData.participants[i-1]) {
        data = editTourData.participants[i-1];
      }
      html += `
      <div class="participant-row" style="margin-bottom:12px; padding-bottom:12px; border-bottom:1px dashed var(--border-color);">
        <div style="font-weight:700; font-size:12px; margin-bottom:6px; color:var(--primary);">PESERTA ${i}</div>
        <div class="form-row-3">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">Nama Lengkap *</label>
            <input class="form-control form-control-sm" name="pax_name_${i}" placeholder="Nama lengkap peserta ${i}" value="${data.name.replace(/"/g, '&quot;')}" required>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">No. Identitas (KTP/Paspor)</label>
            <input class="form-control form-control-sm" name="pax_nik_${i}" placeholder="NIK KTP atau Nomor Paspor" value="${data.nik.replace(/"/g, '&quot;')}">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">No. HP / Kontak</label>
            <input class="form-control form-control-sm" name="pax_phone_${i}" placeholder="No. HP peserta ${i}" value="${data.phone.replace(/"/g, '&quot;')}">
          </div>
        </div>
      </div>`;
    }
    container.innerHTML = html;
  }

  function showForm(id = null) { 
    const modal = document.getElementById('tourModal');
    if (id) {
      const t = S.getById('tours', id);
      if (!t) return;
      editTourData = t;
      modal.querySelector('.modal-title').textContent = 'Edit Paket Wisata';
      modal.querySelector('.modal-body').innerHTML = renderForm(t);
      modal.classList.add('active'); 
      generateItineraryRows();
      generateParticipantRows();
      calcMargin();
    } else {
      editTourData = null;
      modal.querySelector('.modal-title').textContent = 'Buat Paket Wisata';
      modal.querySelector('.modal-body').innerHTML = renderForm();
      modal.classList.add('active'); 
      generateItineraryRows();
      generateParticipantRows();
      calcMargin();
    }
    if (window.lucide) lucide.createIcons(); 
  }
  function closeForm() { document.getElementById('tourModal').classList.remove('active'); }

  function calcMargin() {
    const pax = parseInt(document.getElementById('tourPaxInput')?.value) || 1;
    const costPP = S.parseNumber(document.querySelector('[name="costPricePerPax"]')?.value) || 0;
    const marginPP = S.parseNumber(document.querySelector('[name="marginPerPax"]')?.value) || 0;
    const sellPP = costPP + marginPP;

    const sellPPInput = document.getElementById('t_sellingPricePerPax');
    if (sellPPInput) sellPPInput.value = S.formatInt(sellPP);

    const totalCost = costPP * pax;
    const totalSell = sellPP * pax;
    const totalMargin = totalSell - totalCost;

    const tcEl = document.getElementById('tourTotalCostDisplay'); if (tcEl) tcEl.textContent = S.formatCurrency(totalCost);
    const tsEl = document.getElementById('tourTotalSellDisplay'); if (tsEl) tsEl.textContent = S.formatCurrency(totalSell);
    const tmEl = document.getElementById('tourTotalMarginDisplay'); 
    if (tmEl) { 
        tmEl.textContent = S.formatCurrency(totalMargin);
        tmEl.style.color = totalMargin >= 0 ? 'var(--success)' : 'var(--danger)';
    }

    const chEl = document.getElementById('tourCostPriceHidden'); if (chEl) chEl.value = totalCost;
    const shEl = document.getElementById('tourSellingPriceHidden'); if (shEl) shEl.value = totalSell;
  }

  function onCustomerSelect(sel) {
    const id = sel.value;
    if (!id) return;
    const c = S.getById('customers', id);
    if (!c) return;
    document.getElementById('t_name').value = c.name || '';
    document.getElementById('t_id').value = c.idNumber || '';
    document.getElementById('t_email').value = c.email || '';
    document.getElementById('t_phone').value = c.phone || '';
    document.getElementById('t_address').value = c.address || '';
    
    const isChecked = document.getElementById('copyToLeaderBtn')?.checked;
    if (isChecked) {
      copyCustomerToLeader(true);
    }
    sel.value = "";
  }

  function copyCustomerToLeader(isCopy) {
    const paxName = document.querySelector('[name="pax_name_1"]');
    const paxPhone = document.querySelector('[name="pax_phone_1"]');
    if (isCopy && paxName) {
      paxName.value = document.getElementById('t_name')?.value || '';
      if(paxPhone) paxPhone.value = document.getElementById('t_phone')?.value || '';
    }
  }

  function onParticipantSelect(sel) {
    const id = sel.value;
    if (!id) return;
    const c = S.getById('customers', id);
    if (!c) return;
    
    const pax = parseInt(document.getElementById('tourPaxInput')?.value) || 1;
    let foundEmpty = false;
    for (let i = 1; i <= pax; i++) {
      const nameInput = document.querySelector(`[name="pax_name_${i}"]`);
      if (nameInput && !nameInput.value) {
        nameInput.value = c.name || '';
        const idInput = document.querySelector(`[name="pax_nik_${i}"]`);
        if(idInput && c.idNumber) idInput.value = c.idNumber;
        const phoneInput = document.querySelector(`[name="pax_phone_${i}"]`);
        if(phoneInput && c.phone) phoneInput.value = c.phone;
        foundEmpty = true;
        break;
      }
    }
    
    if (!foundEmpty) {
      // Create new row
      document.getElementById('tourPaxInput').value = pax + 1;
      generateParticipantRows();
      setTimeout(() => {
        const nameInput = document.querySelector(`[name="pax_name_${pax+1}"]`);
        if (nameInput) nameInput.value = c.name || '';
        const idInput = document.querySelector(`[name="pax_nik_${pax+1}"]`);
        if(idInput && c.idNumber) idInput.value = c.idNumber;
        const phoneInput = document.querySelector(`[name="pax_phone_${pax+1}"]`);
        if(phoneInput && c.phone) phoneInput.value = c.phone;
      }, 50);
    }
    sel.value = "";
  }

  function save(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const dataObj = Object.fromEntries(fd.entries());
    
    const saveType = dataObj.tourSaveType || 'confirmed';
    delete dataObj.tourSaveType;

    const saveAsMaster = dataObj.saveAsMaster === 'on';
    delete dataObj.saveAsMaster;

    // Extract Itinerary
    const itinerary = [];
    const days = parseInt(dataObj.days) || 1;
    for (let i = 1; i <= days; i++) {
      itinerary.push({
        day: i,
        title: dataObj[`iti_title_${i}`],
        description: dataObj[`iti_desc_${i}`]
      });
      // Clean up the object
      delete dataObj[`iti_title_${i}`];
      delete dataObj[`iti_desc_${i}`];
    }

    // Extract Participants
    const participants = [];
    const pax = parseInt(dataObj.pax) || 1;
    for (let i = 1; i <= pax; i++) {
      participants.push({
        name: dataObj[`pax_name_${i}`] || '',
        nik: dataObj[`pax_nik_${i}`] || '',
        phone: dataObj[`pax_phone_${i}`] || ''
      });
      // Clean up
      delete dataObj[`pax_name_${i}`];
      delete dataObj[`pax_nik_${i}`];
      delete dataObj[`pax_phone_${i}`];
    }
    
    const booking = {
      ...dataObj,
      itinerary,
      participants,
      costPricePerPax: S.parseNumber(dataObj.costPricePerPax) || 0,
      marginPerPax: S.parseNumber(dataObj.marginPerPax) || 0,
      sellingPricePerPax: S.parseNumber(dataObj.sellingPricePerPax) || 0,
      costPrice: S.parseNumber(dataObj.costPrice) || 0,
      sellingPrice: S.parseNumber(dataObj.sellingPrice) || 0,
      days: days,
      pax: pax,
    };
    
    const isEdit = !!dataObj.id;
    let existing = null;
    let isPaid = false;
    if (isEdit) {
      existing = S.getById('tours', dataObj.id);
      if (existing) {
        isPaid = existing.paymentStatus === 'paid';
        // Clean up financial data associated with old bookingCode/bookingId
        const invoices = S.getAll('invoices').filter(inv => inv.bookingId === dataObj.id);
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
      if (existing.status === 'quotation' && saveType === 'confirmed') {
        booking.status = 'confirmed';
      } else {
        booking.status = existing.status;
        if (saveType === 'quotation') booking.status = 'quotation';
      }
      S.update('tours', dataObj.id, booking);
      savedObj = S.getById('tours', dataObj.id);
      TMS.App.toast('Paket Wisata berhasil diperbarui!', 'success');
    } else {
      booking.bookingCode = S.generateCode('tour');
      booking.paymentStatus = 'unpaid';
      booking.status = saveType;
      savedObj = S.add('tours', booking);
      TMS.App.toast(saveType === 'quotation' ? 'Penawaran Paket Wisata berhasil disimpan!' : 'Paket Wisata dan Itinerary berhasil diterbitkan!', 'success');
    }

    if (savedObj.status === 'confirmed') {
      createJournal(savedObj);
      const inv = createInvoice(savedObj);

      if (isEdit && isPaid) {
        S.update('tours', savedObj.id, { paymentStatus: 'paid' });
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
    }
    if (saveAsMaster) {
      const masterData = {
        id: 'mstr_' + S.generateId(),
        bookingCode: 'MSTR-' + S.generateCode('tour'),
        tourName: booking.tourName,
        destination: booking.destination,
        days: booking.days,
        inclusions: booking.inclusions,
        costPricePerPax: booking.costPricePerPax,
        marginPerPax: booking.marginPerPax,
        sellingPricePerPax: booking.sellingPricePerPax,
        itinerary: booking.itinerary,
        terms: booking.terms
      };
      S.add('master_tours', masterData);
      TMS.App.toast('Master Paket baru otomatis ditambahkan ke Katalog!', 'success');
    }

    closeForm(); TMS.App.navigate('tours');
  }

  function markPaid(id) {
    const t = S.getById('tours', id); if (!t) return;
    S.update('tours', id, { paymentStatus: 'paid' });
    const inv = S.getAll('invoices').find(i => i.bookingId === id);
    if (inv) {
      S.update('invoices', inv.id, { paymentStatus: 'paid', paidAt: new Date().toISOString() });
      const j = { journalNumber: S.generateCode('journal'), date: new Date().toISOString().split('T')[0], description: `Penerimaan Kas - ${t.bookingCode}`, reference: t.bookingCode, type: 'payment_received', entries: [{ accountCode: '1-1000', accountName: 'Kas', debit: inv.total, credit: 0 }, { accountCode: '1-1100', accountName: 'Piutang Usaha', debit: 0, credit: inv.total }] };
      S.add('journals', j); S.recalculateCOA();
    }
    TMS.App.navigate('tours'); TMS.App.toast('Status pembayaran: LUNAS', 'success');
  }

  function showDetail(id) {
    const t = S.getById('tours', id);
    if (!t) return;
    const modal = document.getElementById('tourModal');
    modal.querySelector('.modal-title').textContent = 'Detail Paket Wisata';
    modal.querySelector('.modal-body').innerHTML = renderDetail(t);
    modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function renderDetail(t) {
    const itineraryHtml = (t.itinerary || []).map(iti => `
      <div style="display:flex; gap:16px; margin-bottom:16px;">
        <div style="flex-shrink:0; width:40px; height:40px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px; box-shadow:0 4px 8px rgba(5,17,57,0.2);">
          ${iti.day}
        </div>
        <div style="flex:1; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
          <div style="font-weight:700; color:var(--text-primary); font-size:15px; margin-bottom:4px;">${iti.title}</div>
          <div style="color:var(--text-secondary); font-size:13px; line-height:1.5;">${iti.description}</div>
        </div>
      </div>
    `).join('');

    return `
    <div class="detail-view">
      <div class="detail-header mb-2" style="border-bottom:1px solid var(--border-color);padding-bottom:1rem;">
        <div class="flex-between">
          <div>
            <h3 class="mb-0" style="color:var(--primary-light);">${t.tourName}</h3>
            <div class="text-muted">${t.destination}</div>
          </div>
          <div class="text-right">
            <span class="badge ${t.paymentStatus === 'paid' ? 'badge-success' : 'badge-danger'}">${t.paymentStatus === 'paid' ? 'LUNAS' : 'BELUM LUNAS'}</span>
            <div class="font-mono mt-1" style="font-weight:700;">${t.bookingCode}</div>
          </div>
        </div>
      </div>

      <div class="form-row mb-2">
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">KEBERANGKATAN</div>
          <div class="font-bold" style="font-size:16px;">${S.formatDate(t.departureDate)}</div>
        </div>
        <div style="display:flex;align-items:center;padding:0 1rem;"><i data-lucide="map" class="text-primary"></i></div>
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">DURASI & PESERTA</div>
          <div class="font-bold" style="font-size:16px;">${t.days} Hari • ${t.pax} Peserta</div>
        </div>
      </div>

      <!-- ITINERARY VIEW -->
      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light); margin-top:20px;"><i data-lucide="calendar" style="width:14px;height:14px;vertical-align:middle;"></i> JADWAL PERJALANAN (ITINERARY)</div>
      <div class="card mb-2" style="padding:24px 16px; background:var(--bg-secondary);">
        ${itineraryHtml || '<div class="table-empty">Belum ada data itinerary</div>'}
      </div>

      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="user" style="width:14px;height:14px;vertical-align:middle;"></i> DETAIL PELANGGAN UTAMA</div>
      <div class="card mb-2 p-1" style="background:var(--bg-secondary);">
        <div class="flex-between mb-1"><span>Nama Pelanggan</span><strong>${t.customerName}</strong></div>
        <div class="flex-between mb-1"><span>No. Telepon / HP</span><strong>${t.customerPhone || '-'}</strong></div>
        <div class="flex-between"><span>Email</span><strong>${t.customerEmail || '-'}</strong></div>
      </div>

      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="users" style="width:14px;height:14px;vertical-align:middle;"></i> DAFTAR PESERTA WISATA</div>
      <div class="card mb-2 p-1" style="background:var(--bg-secondary);">
        ${(t.participants || []).map((p, idx) => `
          <div class="mb-1" style="${idx > 0 ? 'border-top:1px dashed var(--border-color); padding-top:8px; margin-top:8px;' : ''}">
            <div class="flex-between">
              <span>Peserta ${idx+1}: <strong>${p.name || '-'}</strong></span>
              <span>Kontak: <strong>${p.phone || '-'}</strong></span>
            </div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">No. Identitas (KTP/Paspor): <strong>${p.nik || '-'}</strong></div>
          </div>
        `).join('') || '<div class="table-empty">Belum ada daftar peserta</div>'}
      </div>

      ${t.inclusions ? `
      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="check-square" style="width:14px;height:14px;vertical-align:middle;"></i> INKLUSI (FASILITAS)</div>
      <div class="card mb-2 p-1" style="background:rgba(7,112,227,0.05);border-left:3px solid var(--primary);">
        <div style="white-space:pre-line;">${t.inclusions}</div>
      </div>` : ''}

      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="dollar-sign" style="width:14px;height:14px;vertical-align:middle;"></i> RINCIAN BIAYA & PEMBAYARAN</div>
      <div class="card p-1" style="background:var(--bg-secondary);">
        <div class="flex-between mb-1"><span>Harga Modal Total</span><span class="font-mono">${S.formatCurrency(t.costPrice)}</span></div>
        <div class="flex-between mb-1"><span>Sumber Dana / Akun</span><span class="badge badge-outline" style="font-family:monospace;">${t.paymentAccount || '2-2000'}</span></div>
        <div class="flex-between mb-1"><span>Harga Jual Total</span><span class="font-mono" style="color:var(--primary-light);font-weight:700;">${S.formatCurrency(t.sellingPrice)}</span></div>
        <div class="flex-between border-top pt-1 mt-1" style="border-top:1px dashed var(--border-color) !important;">
          <span style="font-weight:700;">Margin Total</span>
          <span class="font-mono ${t.sellingPrice - t.costPrice >= 0 ? 'text-success' : 'text-danger'}" style="font-weight:700;">${S.formatCurrency(t.sellingPrice - t.costPrice)}</span>
        </div>
      </div>
      
      <div class="form-actions mt-2">
        <button class="btn btn-outline" onclick="TMS.Tour.closeForm()">Tutup</button>
        <button class="btn btn-whatsapp" onclick="TMS.App.shareToWhatsApp('tour', '${t.id}')"><i data-lucide="message-square"></i> Kirim WhatsApp</button>
      </div>
    </div>`;
  }

  function del(id) {
    if (!confirm('Hapus paket wisata ini? Seluruh invoice dan laporan keuangan terkait juga akan dihapus.')) return;
    const t = S.getById('tours', id);
    if (!t) return;
    const invoices = S.getAll('invoices').filter(inv => inv.bookingId === id);
    invoices.forEach(inv => {
      const payments = S.getAll('payments');
      payments.forEach(p => { if (p.invoiceId === inv.id) S.remove('payments', p.id); });
      S.remove('invoices', inv.id);
    });
    const journals = S.getAll('journals');
    journals.forEach(j => { if (j.reference === t.bookingCode) S.remove('journals', j.id); });
    S.remove('tours', id);
    S.recalculateCOA();
    TMS.App.navigate('tours');
    TMS.App.toast('Paket Wisata dan data keuangan terkait dihapus', 'warning');
  }

  function search(q) {
    const tours = S.getAll('tours').filter(t => !q || t.tourName?.toLowerCase().includes(q.toLowerCase()) || t.customerName?.toLowerCase().includes(q.toLowerCase()) || t.bookingCode?.toLowerCase().includes(q.toLowerCase()));
    document.getElementById('tourBody').innerHTML = renderRows(getSortedTours(tours));
    if (window.lucide) lucide.createIcons();
  }

  function download(id) {
    const t = S.getById('tours', id);
    if (t) TMS.PDF.generateTourVoucher(t);
  }

  function downloadQuotation(id) {
    const t = S.getById('tours', id);
    if (t) TMS.PDF.generateTourQuotation(t);
  }

  function approveQuotation(id) {
    if (!confirm('Apakah penawaran ini sudah disetujui pelanggan? Jika Ya, sistem akan membuat Invoice dan Pesanan Aktif (Voucher).')) return;
    const t = S.getById('tours', id);
    if (!t) return;
    
    S.update('tours', id, { status: 'confirmed' });
    const updatedTour = S.getById('tours', id);
    
    createJournal(updatedTour); 
    createInvoice(updatedTour);
    
    TMS.App.navigate('tours');
    TMS.App.toast('Penawaran berhasil disetujui! Voucher dan Invoice telah diterbitkan.', 'success');
  }

  function setActiveTab(tab) {
    activeTab = tab;
    const content = document.getElementById('pageContent');
    if (content) content.innerHTML = renderList();
    if (window.lucide) lucide.createIcons();
  }

  function showCatalogForm(id = null) {
    const modal = document.getElementById('catalogModal');
    const title = document.getElementById('catalogModalTitle');
    const body = document.getElementById('catalogModalBody');
    if (!modal || !title || !body) return;

    let data = {};
    if (id) {
      data = S.getById('master_tours', id);
      title.textContent = 'Ubah Master Paket';
    } else {
      title.textContent = 'Tambah Master Paket';
    }

    body.innerHTML = renderCatalogForm(data);
    modal.classList.add('active');

    generateCatalogItineraryRows(data.itinerary);
    calcCatalogMargin();
    if (window.lucide) lucide.createIcons();
  }

  function closeCatalogForm() {
    const modal = document.getElementById('catalogModal');
    if (modal) modal.classList.remove('active');
  }

  function calcCatalogMargin() {
    const cost = S.parseNumber(document.querySelector('#catalogForm [name="costPricePerPax"]')?.value) || 0;
    const margin = S.parseNumber(document.querySelector('#catalogForm [name="marginPerPax"]')?.value) || 0;
    const sell = cost + margin;

    const sellInput = document.getElementById('c_sellingPricePerPax');
    if (sellInput) sellInput.value = S.formatInt(sell);
  }

  function generateCatalogItineraryRows(existingItinerary = null) {
    const days = parseInt(document.getElementById('catalogDaysInput')?.value) || 1;
    const container = document.getElementById('catalogItineraryContainer');
    if (!container) return;

    let html = '';
    for (let i = 1; i <= days; i++) {
      const dayData = (existingItinerary && existingItinerary.find(item => item.day === i)) || { title: '', description: '' };
      html += `
      <div class="itinerary-row" style="margin-bottom:16px; padding-bottom:16px; border-bottom:1px dashed var(--border-color);">
        <div style="font-weight:700; font-size:12px; margin-bottom:8px; color:var(--primary-light);">HARI ${i}</div>
        <div class="form-group" style="margin-bottom:8px;">
          <input class="form-control form-control-sm" name="iti_title_${i}" value="${dayData.title || ''}" placeholder="Judul aktivitas (misal: Arrival & South Coast Tour)" required>
        </div>
        <div class="form-group">
          <textarea class="form-control form-control-sm" name="iti_desc_${i}" rows="2" placeholder="Detail kegiatan hari ini..." required>${dayData.description || ''}</textarea>
        </div>
      </div>`;
    }
    container.innerHTML = html;
  }

  function saveCatalog(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const dataObj = Object.fromEntries(fd.entries());

    const id = dataObj.id;
    delete dataObj.id;

    const days = parseInt(dataObj.days) || 1;
    const itinerary = [];
    for (let i = 1; i <= days; i++) {
      itinerary.push({
        day: i,
        title: dataObj[`iti_title_${i}`],
        description: dataObj[`iti_desc_${i}`]
      });
      delete dataObj[`iti_title_${i}`];
      delete dataObj[`iti_desc_${i}`];
    }

    const catalogData = {
      ...dataObj,
      days,
      itinerary,
      costPricePerPax: S.parseNumber(dataObj.costPricePerPax) || 0,
      marginPerPax: S.parseNumber(dataObj.marginPerPax) || 0,
      sellingPricePerPax: S.parseNumber(dataObj.sellingPricePerPax) || 0
    };

    if (id) {
      S.update('master_tours', id, catalogData);
      TMS.App.toast('Master Paket berhasil diperbarui!', 'success');
    } else {
      catalogData.id = 'mstr_' + S.generateId();
      S.add('master_tours', catalogData);
      TMS.App.toast('Master Paket berhasil disimpan!', 'success');
    }

    closeCatalogForm();
    const content = document.getElementById('pageContent');
    if (content) content.innerHTML = renderList();
    if (window.lucide) lucide.createIcons();
  }

  function deleteCatalog(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus Master Paket ini?')) return;
    S.remove('master_tours', id);
    TMS.App.toast('Master Paket berhasil dihapus', 'warning');
    const content = document.getElementById('pageContent');
    if (content) content.innerHTML = renderList();
    if (window.lucide) lucide.createIcons();
  }

  function searchCatalog(q) {
    const catalogs = S.getAll('master_tours').filter(c => !q || c.tourName?.toLowerCase().includes(q.toLowerCase()) || c.destination?.toLowerCase().includes(q.toLowerCase()) || c.bookingCode?.toLowerCase().includes(q.toLowerCase()));
    document.getElementById('catalogBody').innerHTML = renderCatalogRows(catalogs);
    if (window.lucide) lucide.createIcons();
  }

  function showCatalogDetail(id) {
    const c = S.getById('master_tours', id);
    if (!c) return;
    const modal = document.getElementById('tourModal');
    modal.querySelector('.modal-title').textContent = 'Detail Master Paket';
    modal.querySelector('.modal-body').innerHTML = renderCatalogDetail(c);
    modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function copyMasterDetails(select) {
    const id = select.value;
    if (!id) return;
    const c = S.getById('master_tours', id);
    if (!c) return;

    const form = document.getElementById('tourForm');
    if (!form) return;

    form.querySelector('[name="tourName"]').value = c.tourName || '';
    form.querySelector('[name="destination"]').value = c.destination || '';
    form.querySelector('[name="days"]').value = c.days || 1;
    form.querySelector('[name="inclusions"]').value = c.inclusions || '';
    const termsInput = form.querySelector('[name="terms"]');
    if (termsInput) termsInput.value = c.terms || DEFAULT_TOUR_TERMS;
    form.querySelector('[name="costPricePerPax"]').value = c.costPricePerPax || 0;
    form.querySelector('[name="marginPerPax"]').value = c.marginPerPax || 0;

    generateItineraryRows();

    if (c.itinerary && c.itinerary.length) {
      c.itinerary.forEach(iti => {
        const titleInput = form.querySelector(`[name="iti_title_${iti.day}"]`);
        const descInput = form.querySelector(`[name="iti_desc_${iti.day}"]`);
        if (titleInput) titleInput.value = iti.title || '';
        if (descInput) descInput.value = iti.description || '';
      });
    }

    calcMargin();
    select.value = '';
    TMS.App.toast('Rincian disalin dari master paket: ' + c.tourName, 'success');
  }

  function renderCatalogForm(data = {}) {
    const isEdit = !!data.id;
    return `
    <form id="catalogForm" onsubmit="TMS.Tour.saveCatalog(event)">
      <input type="hidden" name="id" value="${data.id || ''}">
      <div class="form-section-title"><i data-lucide="hash"></i> Administrasi Master</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Kode Master Paket *</label>
          <input class="form-control font-mono" name="bookingCode" required value="${data.bookingCode || ''}" placeholder="Contoh: TOR-PREM-BALI">
        </div>
        <div class="form-group">
          <label class="form-label">Nama Paket Wisata *</label>
          <input class="form-control" name="tourName" required value="${data.tourName || ''}" placeholder="Contoh: 3D2N Bali Premium Getaway">
        </div>
      </div>
      
      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">Destinasi *</label>
          <input class="form-control" name="destination" required value="${data.destination || ''}" placeholder="Contoh: Bali, Indonesia">
        </div>
        <div class="form-group">
          <label class="form-label">Durasi (Hari) *</label>
          <input class="form-control" type="number" name="days" id="catalogDaysInput" required min="1" value="${data.days || 1}" oninput="TMS.Tour.generateCatalogItineraryRows()" onchange="TMS.Tour.generateCatalogItineraryRows()">
        </div>
      </div>

      <div class="form-section-title"><i data-lucide="calendar"></i> Rencana Perjalanan (Itinerary) per Hari</div>
      <div id="catalogItineraryContainer" style="margin-bottom:24px; border:1px solid var(--border-color); border-radius:12px; padding:16px; background:var(--bg-secondary);">
        <!-- Rows generated dynamically -->
      </div>

      <div class="form-group"><label class="form-label">Inklusi (Fasilitas Default)</label>
        <textarea class="form-control" name="inclusions" rows="3" placeholder="Contoh: Tiket pesawat, Hotel, Makan...">${data.inclusions || ''}</textarea>
      </div>

      <div class="form-group"><label class="form-label">Syarat & Ketentuan Default *</label>
        <textarea class="form-control" name="terms" rows="6" placeholder="Syarat & Ketentuan default paket wisata...">${data.terms || DEFAULT_TOUR_TERMS}</textarea>
      </div>

      <div class="form-section-title"><i data-lucide="dollar-sign"></i> Struktur Harga (Per Pax)</div>
      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">Harga Modal (Pax) *</label>
          <div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" name="costPricePerPax" value="${S.formatInt(data.costPricePerPax || '')}" required placeholder="0" oninput="TMS.App.formatNumberInput(this); TMS.Tour.calcCatalogMargin()"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Margin Laba (Pax) *</label>
          <div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" id="c_marginPerPax" name="marginPerPax" value="${S.formatInt(data.marginPerPax || '')}" required placeholder="0" oninput="TMS.App.formatNumberInput(this); TMS.Tour.calcCatalogMargin()"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Harga Jual (Pax)</label>
          <div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" id="c_sellingPricePerPax" name="sellingPricePerPax" value="${S.formatInt(data.sellingPricePerPax || '')}" readonly style="background:var(--bg-secondary);"></div>
        </div>
      </div>

      <div class="form-actions" style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn btn-outline" onclick="TMS.Tour.closeCatalogForm()">Batal</button>
        <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> ${isEdit ? 'Simpan Perubahan' : 'Simpan Master Paket'}</button>
      </div>
    </form>
    `;
  }

  function renderCatalogDetail(c) {
    const itineraryHtml = (c.itinerary || []).map(iti => `
      <div style="display:flex; gap:16px; margin-bottom:16px;">
        <div style="flex-shrink:0; width:40px; height:40px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px; box-shadow:0 4px 8px rgba(5,17,57,0.2);">
          ${iti.day}
        </div>
        <div style="flex:1; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
          <div style="font-weight:700; color:var(--text-primary); font-size:15px; margin-bottom:4px;">${iti.title}</div>
          <div style="color:var(--text-secondary); font-size:13px; line-height:1.5;">${iti.description}</div>
        </div>
      </div>
    `).join('');

    return `
    <div class="detail-view">
      <div class="detail-header mb-2" style="border-bottom:1px solid var(--border-color);padding-bottom:1rem;">
        <div class="flex-between">
          <div>
            <h3 class="mb-0" style="color:var(--primary-light);">${c.tourName}</h3>
            <div class="text-muted">${c.destination}</div>
          </div>
          <div class="text-right">
            <span class="badge badge-info">Master Katalog</span>
            <div class="font-mono mt-1" style="font-weight:700;">${c.bookingCode || ''}</div>
          </div>
        </div>
      </div>

      <div class="form-row mb-2">
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">DURASI</div>
          <div class="font-bold" style="font-size:16px;">${c.days} Hari</div>
        </div>
        <div style="display:flex;align-items:center;padding:0 1rem;"><i data-lucide="map" class="text-primary"></i></div>
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">HARGA JUAL/PAX</div>
          <div class="font-bold" style="font-size:16px;color:var(--primary-light);">${S.formatCurrency(c.sellingPricePerPax)}</div>
        </div>
      </div>

      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light); margin-top:20px;"><i data-lucide="calendar" style="width:14px;height:14px;vertical-align:middle;"></i> DETAIL ITINERARY DEFAULT</div>
      <div class="card mb-2" style="padding:24px 16px; background:var(--bg-secondary);">
        ${itineraryHtml || '<div class="table-empty">Belum ada data itinerary</div>'}
      </div>

      ${c.inclusions ? `
      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="check-square" style="width:14px;height:14px;vertical-align:middle;"></i> INKLUSI DEFAULT</div>
      <div class="card mb-2 p-1" style="background:rgba(7,112,227,0.05);border-left:3px solid var(--primary);">
        <div style="white-space:pre-line;">${c.inclusions}</div>
      </div>` : ''}

      ${c.terms ? `
      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="file-text" style="width:14px;height:14px;vertical-align:middle;"></i> SYARAT & KETENTUAN DEFAULT</div>
      <div class="card mb-2 p-1" style="background:rgba(201,168,68,0.05);border-left:3px solid #c9a844;">
        <div style="white-space:pre-line;">${c.terms}</div>
      </div>` : ''}

      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="dollar-sign" style="width:14px;height:14px;vertical-align:middle;"></i> STRUKTUR BIAYA DEFAULT</div>
      <div class="card p-1" style="background:var(--bg-secondary);">
        <div class="flex-between mb-1"><span>Harga Modal Per Pax</span><span class="font-mono">${S.formatCurrency(c.costPricePerPax)}</span></div>
        <div class="flex-between mb-1"><span>Harga Jual Per Pax</span><span class="font-mono" style="color:var(--primary-light);font-weight:700;">${S.formatCurrency(c.sellingPricePerPax)}</span></div>
        <div class="flex-between border-top pt-1 mt-1" style="border-top:1px dashed var(--border-color) !important;">
          <span style="font-weight:700;">Margin Laba Per Pax</span>
          <span class="font-mono text-success" style="font-weight:700;">${S.formatCurrency(c.sellingPricePerPax - c.costPricePerPax)}</span>
        </div>
      </div>
      
      <div class="form-actions mt-2">
        <button class="btn btn-outline" onclick="TMS.Tour.closeForm()">Tutup</button>
      </div>
    </div>`;
  }

  return { 
    renderList, sortTable, showForm, closeForm, save, markPaid, delete: del, search, calcMargin, 
    onCustomerSelect, copyCustomerToLeader, onParticipantSelect, showDetail, download, 
    downloadQuotation, approveQuotation, generateItineraryRows, generateParticipantRows,
    
    // New tabbed catalog methods
    setActiveTab, renderTransactionsTab, renderCatalogTab, renderCatalogRows,
    showCatalogForm, closeCatalogForm, calcCatalogMargin, saveCatalog, deleteCatalog, 
    searchCatalog, showCatalogDetail, copyMasterDetails, generateCatalogItineraryRows
  };
})();

