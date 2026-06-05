/* ========================================
   TMS - Umroh & Hajj Package Module
   ======================================== */
TMS.Umroh = (() => {
  const S = TMS.Store;
  let activeTab = 'transactions'; // 'transactions' or 'catalog'
  let editUmrohData = null;

  const DEFAULT_UMROH_TERMS = `1. Pendaftaran & Pelunasan
- **Uang Muka (DP):** Uang muka pendaftaran (DP) bersifat **Non-Refundable (tidak dapat dikembalikan)**.
- **Pelunasan:** Pelunasan biaya paket wajib diselesaikan paling lambat **30 hari** sebelum jadwal keberangkatan.
- **Dokumen:** Menyerahkan dokumen paspor asli dengan nama minimal 2 suku kata yang masih berlaku minimal 7 bulan.

2. Harga Paket
- **Termasuk:** Tiket pesawat PP kelas ekonomi, akomodasi hotel Makkah & Madinah, visa umroh, makan 3x sehari (catering), mutawwif pembimbing ibadah, bus AC premium, air zam-zam (jika diperbolehkan maskapai).
- **Tidak Termasuk:** Pembuatan paspor, buku kuning meningitis, pengeluaran pribadi (laundry, telepon, kelebihan bagasi), dan tips guide/driver.
- **Catatan:** Harga dapat berubah sewaktu-waktu menyesuaikan fluktuasi kurs mata uang asing dan kebijakan pemerintah Indonesia/Arab Saudi.

3. Pembatalan & Pengembalian
- Pembatalan setelah pendaftaran dikenakan potongan biaya sesuai ketentuan vendor (tiket pesawat, hotel, dan visa yang sudah diterbitkan).
- Pengembalian dana sisa pembatalan dihitung setelah dikurangi biaya administratif dan denda pembatalan maskapai/hotel.`;

  function createJournal(booking) {
    const revenue = booking.sellingPrice || 0, cost = booking.costPrice || 0;
    const payAccCode = booking.paymentAccount || '2-2000';
    const payAccName = S.getCOAByCode(payAccCode)?.name || 'Utang Usaha';

    const j = { 
      journalNumber: S.generateCode('journal'), 
      date: booking.transactionDate || booking.departureDate || new Date().toISOString().split('T')[0], 
      description: `Penjualan Paket Umroh & Haji - ${booking.bookingCode} - ${booking.packageName}`, 
      reference: booking.bookingCode, 
      type: 'umroh_sale', 
      entries: [
        { accountCode: '1-1100', accountName: 'Piutang Usaha', debit: revenue, credit: 0 }, 
        { accountCode: '4-4350', accountName: 'Pendapatan Paket Umroh & Haji', debit: 0, credit: revenue }, 
        { accountCode: '5-5350', accountName: 'BPP Paket Umroh & Haji', debit: cost, credit: 0 }, 
        { accountCode: payAccCode, accountName: payAccName, debit: 0, credit: cost }
      ] 
    };
    S.add('journals', j); S.recalculateCOA();
  }

  function createInvoice(booking) {
    const s = S.getSettings();
    const subtotal = booking.sellingPrice || 0;
    const taxRate = s.taxEnabled ? (s.taxRate || 0) : 0;
    const tax = Math.round(subtotal * taxRate / 100);
    const total = subtotal + tax;
    const inv = { 
      invoiceNumber: S.generateCode('invoice'), 
      bookingId: booking.id, 
      bookingCode: booking.bookingCode, 
      bookingType: 'umroh', 
      customerName: booking.customerName, 
      customerEmail: booking.customerEmail, 
      items: [{ description: `Paket Umroh & Haji: ${booking.packageName} (${booking.days} hari)`, qty: 1, unitPrice: subtotal, total: subtotal }], 
      subtotal, 
      taxRate, 
      tax, 
      total, 
      paymentStatus: 'unpaid', 
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], 
      createdAt: booking.transactionDate || new Date().toISOString() 
    };
    return S.add('invoices', inv);
  }

  let currentSort = { col: '', asc: true };
  let isAddingInventoryItem = false;

  function getSortedUmroh(dataList) {
    if (!currentSort.col) return dataList;
    return dataList.sort((a, b) => {
      let valA, valB;
      switch(currentSort.col) {
        case 'bookingCode': valA = (a.bookingCode||'').toLowerCase(); valB = (b.bookingCode||'').toLowerCase(); break;
        case 'packageName': valA = (a.packageName||'').toLowerCase(); valB = (b.packageName||'').toLowerCase(); break;
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
    
    const searchInp = document.getElementById('umrohSearch');
    if (searchInp && searchInp.value) search(searchInp.value);
    
    if (window.lucide) lucide.createIcons();
  }

  function renderList() {
    return `
    <div class="fade-in">
      <div class="tabs-navigation mb-2" style="display:flex; gap:8px; border-bottom:2px solid var(--border-color); padding-bottom:0; margin-bottom: 20px;">
        <button class="tab-header-btn" onclick="TMS.Umroh.setActiveTab('transactions')" style="padding:10px 20px; font-weight:700; border:none; background:none; color:${activeTab === 'transactions' ? 'var(--primary-light)' : 'var(--text-muted)'}; border-bottom:${activeTab === 'transactions' ? '3px solid var(--primary-light)' : 'none'}; cursor:pointer; font-size:14px; display:flex; align-items:center; gap:8px;">
          <i data-lucide="list"></i> 📋 Transaksi & Rombongan
        </button>
        <button class="tab-header-btn" onclick="TMS.Umroh.setActiveTab('catalog')" style="padding:10px 20px; font-weight:700; border:none; background:none; color:${activeTab === 'catalog' ? 'var(--primary-light)' : 'var(--text-muted)'}; border-bottom:${activeTab === 'catalog' ? '3px solid var(--primary-light)' : 'none'}; cursor:pointer; font-size:14px; display:flex; align-items:center; gap:8px;">
          <i data-lucide="folder"></i> 🗃️ Manajemen Master Paket
        </button>
      </div>
      ${activeTab === 'transactions' ? renderTransactionsTab() : renderCatalogTab()}
    </div>
    <div class="modal-overlay" id="umrohModal">
      <div class="modal modal-full"><div class="modal-header"><span class="modal-title" id="umrohModalTitle">Rancang Paket Umroh & Haji</span><button class="modal-close" onclick="TMS.Umroh.closeForm()">✕</button></div>
      <div class="modal-body" id="umrohModalBody">${renderForm()}</div></div>
    </div>
    <div class="modal-overlay" id="umrohCatalogModal">
      <div class="modal modal-full"><div class="modal-header"><span class="modal-title" id="umrohCatalogModalTitle">Buat Master Paket Umroh</span><button class="modal-close" onclick="TMS.Umroh.closeCatalogForm()">✕</button></div>
      <div class="modal-body" id="umrohCatalogModalBody">${renderCatalogForm()}</div></div>
    </div>`;
  }

  function renderTransactionsTab() {
    const umrohs = getSortedUmroh(S.getAll('umroh'));
    const getSortIcon = (col) => currentSort.col === col ? (currentSort.asc ? ' &uarr;' : ' &darr;') : '';
    return `
      <div class="toolbar">
        <div class="search-box"><i data-lucide="search"></i><input type="text" id="umrohSearch" placeholder="Cari paket, jemaah..." oninput="TMS.Umroh.search(this.value)"></div>
        <div class="btn-group">
          <button class="btn btn-secondary" onclick="TMS.Excel.triggerImport('umroh')"><i data-lucide="upload"></i> Import</button>
          <button class="btn btn-secondary" onclick="TMS.Excel.exportData('umroh')"><i data-lucide="download"></i> Export</button>
          <button class="btn btn-secondary" onclick="TMS.Umroh.openInventoryModal()"><i data-lucide="package"></i> Inventori Logistik</button>
          <button class="btn btn-primary" onclick="TMS.Umroh.showForm()"><i data-lucide="plus"></i> Rancang Paket Umroh & Haji</button>
        </div>
      </div>
      <div class="card">
        <div class="table-container">
          <table class="table-sortable">
            <thead><tr>
              <th style="cursor:pointer;" onclick="TMS.Umroh.sortTable('transactionDate')">Tgl Transaksi${getSortIcon('transactionDate')}</th>
              <th style="cursor:pointer;" onclick="TMS.Umroh.sortTable('bookingCode')">Kode Booking${getSortIcon('bookingCode')}</th>
              <th style="cursor:pointer;" onclick="TMS.Umroh.sortTable('packageName')">Paket Umroh & Haji${getSortIcon('packageName')}</th>
              <th style="cursor:pointer;" onclick="TMS.Umroh.sortTable('customerName')">Jemaah Hubungan${getSortIcon('customerName')}</th>
              <th style="cursor:pointer;" onclick="TMS.Umroh.sortTable('departureDate')">Tgl Berangkat${getSortIcon('departureDate')}</th>
              <th style="cursor:pointer;" onclick="TMS.Umroh.sortTable('days')">Durasi${getSortIcon('days')}</th>
              <th style="cursor:pointer;" onclick="TMS.Umroh.sortTable('sellingPrice')">Harga Jual${getSortIcon('sellingPrice')}</th>
              <th style="cursor:pointer;" onclick="TMS.Umroh.sortTable('margin')">Margin${getSortIcon('margin')}</th>
              <th style="cursor:pointer;" onclick="TMS.Umroh.sortTable('status')">Status${getSortIcon('status')}</th>
              <th>Aksi</th>
            </tr></thead>
            <tbody id="umrohBody">${renderRows(umrohs)}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderCatalogTab() {
    const catalogs = S.getAll('master_umrohs');
    return `
      <div class="toolbar">
        <div class="search-box"><i data-lucide="search"></i><input type="text" id="umrohCatalogSearch" placeholder="Cari master paket..." oninput="TMS.Umroh.searchCatalog(this.value)"></div>
        <div class="btn-group">
          <button class="btn btn-primary" onclick="TMS.Umroh.showCatalogForm()"><i data-lucide="plus"></i> Tambah Master Paket</button>
        </div>
      </div>
      <div class="card">
        <div class="table-container">
          <table>
            <thead><tr>
              <th>Kode Master</th>
              <th>Nama Program</th>
              <th>Maskapai</th>
              <th>Hotel Makkah/Madinah</th>
              <th>Durasi</th>
              <th>Harga Modal/Pax</th>
              <th>Harga Jual/Pax</th>
              <th>Margin/Pax</th>
              <th>Aksi</th>
            </tr></thead>
            <tbody id="umrohCatalogBody">${renderCatalogRows(catalogs)}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderRows(umrohs) {
    if (!umrohs.length) return `<tr><td colspan="10" class="table-empty"><i data-lucide="palmtree" style="width:32px;height:32px;display:block;margin:0 auto 8px;opacity:.3;"></i>Belum ada paket umroh & haji</td></tr>`;
    return umrohs.map(u => {
      const margin = (u.sellingPrice || 0) - (u.costPrice || 0);
      const isQuotation = u.status === 'quotation';
      const statusBadge = isQuotation 
        ? '<span class="badge badge-info badge-dot">Penawaran</span>' 
        : (u.paymentStatus === 'paid' ? '<span class="badge badge-success badge-dot">Lunas</span>' : '<span class="badge badge-danger badge-dot">Belum Lunas</span>');
      return `<tr>
        <td>${S.formatDate(u.transactionDate || u.createdAt)}</td>
        <td><span class="font-mono text-primary">${u.bookingCode}</span></td>
        <td><strong>${u.packageName}</strong></td>
        <td>${u.customerName}</td>
        <td>${S.formatDate(u.departureDate)}</td>
        <td>${u.days} hari</td>
        <td><strong>${S.formatCurrency(u.sellingPrice)}</strong></td>
        <td class="${margin >= 0 ? 'amount-positive' : 'amount-negative'}">${S.formatCurrency(margin)}</td>
        <td>${statusBadge}</td>
        <td><div class="btn-group">
          <button class="btn btn-sm btn-outline" onclick="TMS.Umroh.showDetail('${u.id}')" title="Detail"><i data-lucide="eye"></i></button>
          <button class="btn btn-sm btn-outline" style="color:var(--primary-light);border-color:var(--primary-light);" onclick="TMS.Umroh.showForm('${u.id}')" title="Edit"><i data-lucide="edit-3"></i></button>
          <button class="btn btn-sm btn-whatsapp" onclick="TMS.App.shareToWhatsApp('umroh', '${u.id}')" title="Kirim WhatsApp"><i data-lucide="message-square"></i></button>
          <button class="btn btn-sm btn-secondary" onclick="TMS.Accounting.setSelectedGroupBookingId('${u.id}'); TMS.App.navigate('accounting/group-profitability')" title="Analisis Laba Rugi"><i data-lucide="line-chart" style="color:var(--primary); width:14px; height:14px;"></i></button>
          <button class="btn btn-sm btn-outline" onclick="TMS.Umroh.downloadQuotation('${u.id}')" title="Unduh Penawaran"><i data-lucide="file-text"></i></button>
          ${isQuotation 
            ? `<button class="btn btn-sm btn-success" onclick="TMS.Umroh.approveQuotation('${u.id}')" title="Setujui & Buat Voucher"><i data-lucide="check-square"></i></button>`
            : `<button class="btn btn-sm btn-primary" onclick="TMS.Umroh.download('${u.id}')" title="Unduh Voucher"><i data-lucide="download"></i></button>`
          }
          <button class="btn btn-sm btn-danger" onclick="TMS.Umroh.delete('${u.id}')" title="Hapus"><i data-lucide="trash-2"></i></button>
        </div></td>
      </tr>`;
    }).join('');
  }

  function renderCatalogRows(catalogs) {
    if (!catalogs.length) return `<tr><td colspan="9" class="table-empty"><i data-lucide="folder" style="width:32px;height:32px;display:block;margin:0 auto 8px;opacity:.3;"></i>Belum ada katalog master paket umroh</td></tr>`;
    return catalogs.map(c => {
      const margin = (c.sellingPricePerPax || 0) - (c.costPricePerPax || 0);
      return `<tr>
        <td><span class="font-mono text-primary">${c.bookingCode || ''}</span></td>
        <td><strong>${c.packageName || ''}</strong></td>
        <td>${c.airline || ''}</td>
        <td>Makkah: ${c.hotelMakkah || '-'}<br>Madinah: ${c.hotelMadinah || '-'}</td>
        <td>${c.days || 0} hari</td>
        <td>${S.formatCurrency(c.costPricePerPax || 0)}</td>
        <td><strong>${S.formatCurrency(c.sellingPricePerPax || 0)}</strong></td>
        <td class="${margin >= 0 ? 'amount-positive' : 'amount-negative'}">${S.formatCurrency(margin)}</td>
        <td><div class="btn-group">
          <button class="btn btn-sm btn-outline" onclick="TMS.Umroh.showCatalogDetail('${c.id}')" title="Detail"><i data-lucide="eye"></i></button>
          <button class="btn btn-sm btn-outline" onclick="TMS.Umroh.showCatalogForm('${c.id}')" title="Ubah"><i data-lucide="edit"></i></button>
          <button class="btn btn-sm btn-danger" onclick="TMS.Umroh.deleteCatalog('${c.id}')" title="Hapus"><i data-lucide="trash-2"></i></button>
        </div></td>
      </tr>`;
    }).join('');
  }

  function renderForm(data = {}) {
    const generatedCode = S.generateCode('umroh');
    return `
    <form id="umrohForm" onsubmit="TMS.Umroh.save(event)">
      <input type="hidden" name="id" value="${data.id || ''}">
      <div class="form-group mb-2" style="background:rgba(184,158,103,0.06); padding:1rem; border-radius:8px; border:1px solid var(--primary-light);">
        <label class="form-label" style="color:var(--primary-light); font-weight:700;"><i data-lucide="copy"></i> Salin Rincian dari Master Paket Umroh</label>
        <select class="form-control" onchange="TMS.Umroh.copyMasterDetails(this)">
          <option value="">-- Pilih Master Paket (Katalog) --</option>
          ${S.getAll('master_umrohs').map(c => `<option value="${c.id}">${c.packageName} (${c.bookingCode}) - ${S.formatCurrency(c.sellingPricePerPax)}/pax</option>`).join('')}
        </select>
        <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Memilih master paket akan otomatis mengisi detail rencana program, hotel, mutawwif, airline, inclusions, harga, dan itinerary.</div>
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

      <div class="form-section-title"><i data-lucide="user"></i> Kontak Utama Jemaah (Pemesan)</div>
      <div class="form-group mb-1">
        <label class="form-label">Pilih Jemaah Terdaftar (Opsional)</label>
        <select class="form-control" onchange="TMS.Umroh.onCustomerSelect(this)">
          <option value="">-- Pilih Jemaah Baru --</option>
          ${S.getAll('customers').map(c => `<option value="${c.id}">${c.name} (${c.customerCode})</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Nama Pemesan *</label><input class="form-control" name="customerName" id="um_name" value="${data.customerName || ''}" required placeholder="Nama lengkap sesuai identitas"></div>
        <div class="form-group"><label class="form-label">No. Identitas (KTP/Paspor)</label><input class="form-control" name="customerId" id="um_id" value="${data.customerId || ''}" placeholder="Nomor KTP / Paspor"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Email Pemesan *</label><input class="form-control" type="email" name="customerEmail" id="um_email" value="${data.customerEmail || ''}" required placeholder="email@domain.com"></div>
        <div class="form-group"><label class="form-label">Telepon Pemesan *</label><input class="form-control" name="customerPhone" id="um_phone" value="${data.customerPhone || ''}" required placeholder="08xx-xxxx-xxxx"></div>
      </div>
      <div class="form-group mb-2">
        <label class="form-label">Alamat Lengkap</label>
        <textarea class="form-control" name="customerAddress" id="um_address" rows="2" placeholder="Alamat pengiriman / domisili">${data.customerAddress || ''}</textarea>
      </div>

      <div class="form-group mb-2" style="background:var(--bg-secondary); padding:0.75rem; border-radius:4px; border:1px solid var(--border-color);">
        <label style="display:flex; align-items:center; cursor:pointer; margin:0;">
          <input type="checkbox" id="copyToLeaderBtnUmroh" onchange="TMS.Umroh.copyCustomerToLeader(this.checked)" style="margin-right:8px; width:16px; height:16px;">
          <span style="font-weight:600; color:var(--text-color);">Pemesan juga sebagai Ketua Rombongan / Peserta 1</span>
        </label>
      </div>

      <div class="form-section-title"><i data-lucide="palmtree"></i> Kelengkapan Paket Umroh & Haji</div>
      <div class="form-group"><label class="form-label">Nama Program Paket *</label><input class="form-control" name="packageName" value="${data.packageName || ''}" required placeholder="Umroh Akbar Syawal 9 Hari"></div>
      
      <div class="form-row">
        <div class="form-group"><label class="form-label">Pembimbing Ibadah (Mutawwif) *</label><input class="form-control" name="mutawwif" value="${data.mutawwif || ''}" required placeholder="Ustadz Pembimbing Rombongan"></div>
        <div class="form-group"><label class="form-label">Maskapai & Rute Penerbangan *</label><input class="form-control" name="airline" value="${data.airline || ''}" required placeholder="Saudia Airlines (CGK - JED Direct)"></div>
      </div>
      
      <div class="form-row">
        <div class="form-group"><label class="form-label">Hotel Makkah *</label><input class="form-control" name="hotelMakkah" value="${data.hotelMakkah || ''}" required placeholder="Pullman Zamzam / Tower (Bintang 5 - Jarak 50m)"></div>
        <div class="form-group"><label class="form-label">Hotel Madinah *</label><input class="form-control" name="hotelMadinah" value="${data.hotelMadinah || ''}" required placeholder="Grand Plaza Al Madina (Bintang 4 - Jarak 100m)"></div>
      </div>
      
      <div class="form-row-3">
        <div class="form-group"><label class="form-label">Tgl Berangkat *</label><input class="form-control" type="date" name="departureDate" value="${data.departureDate || ''}" required></div>
        <div class="form-group"><label class="form-label">Durasi Hari *</label><input class="form-control" type="number" name="days" id="umrohDaysInput" required min="1" value="${data.days || 9}" oninput="TMS.Umroh.generateItineraryRows()" onchange="TMS.Umroh.generateItineraryRows()"></div>
        <div class="form-group"><label class="form-label">Jumlah Jemaah *</label><input class="form-control" type="number" name="pax" id="umrohPaxInput" required min="1" value="${data.pax || 1}" oninput="TMS.Umroh.generateParticipantRows(); TMS.Umroh.calcMargin()" onchange="TMS.Umroh.generateParticipantRows(); TMS.Umroh.calcMargin()"></div>
      </div>

      <!-- PARTICIPANTS LIST -->
      <div class="form-section-title" style="display:flex; justify-content:space-between; align-items:center;">
        <span><i data-lucide="users"></i> Berkas & Logistik Jemaah (Per Orang)</span>
        <span style="font-size:11px; font-weight:normal; background:var(--primary); color:#fff; padding:2px 8px; border-radius:10px;">Sesuaikan jumlah jemaah</span>
      </div>
      <div class="form-group mb-1 mt-1">
        <label class="form-label">Tambahkan dari Jemaah Terdaftar ke Rombongan</label>
        <select class="form-control" onchange="TMS.Umroh.onParticipantSelect(this)">
          <option value="">-- Pilih untuk menambah jemaah otomatis --</option>
          ${S.getAll('customers').map(c => `<option value="${c.id}">${c.name} (${c.customerCode})</option>`).join('')}
        </select>
      </div>
      <div id="umrohParticipantsContainer" style="margin-bottom:24px; border:1px solid var(--border-color); border-radius:12px; padding:16px; background:var(--bg-secondary);">
        <!-- Dynamic rows generated by generateParticipantRows() -->
      </div>

      <!-- ITINERARY BUILDER -->
      <div class="form-section-title" style="display:flex; justify-content:space-between; align-items:center;">
        <span><i data-lucide="calendar"></i> Jadwal Perjalanan (Itinerary Harian)</span>
        <span style="font-size:11px; font-weight:normal; background:var(--primary); color:#fff; padding:2px 8px; border-radius:10px;">Otomatis sesuai durasi</span>
      </div>
      <div id="umrohItineraryContainer" style="margin-bottom:24px; border:1px solid var(--border-color); border-radius:12px; padding:16px; background:var(--bg-secondary);">
        <!-- Rows generated by generateItineraryRows() -->
      </div>

      <div class="form-group"><label class="form-label">Fasilitas Tambahan & Inklusi</label>
        <textarea class="form-control" name="inclusions" rows="3" placeholder="Contoh: Manasik umroh gratis, Air zam-zam 5L, Muthawwif berpengalaman, Ziarah kota suci...">${data.inclusions || ''}</textarea>
      </div>

      <div class="form-group"><label class="form-label">Syarat & Ketentuan *</label>
        <textarea class="form-control" name="terms" rows="4" placeholder="Syarat & Ketentuan paket umroh...">${data.terms || DEFAULT_UMROH_TERMS}</textarea>
      </div>

      <div class="form-section-title"><i data-lucide="dollar-sign"></i> Rincian Harga & Akuntansi</div>
      <div class="card p-1 mb-2" style="background:rgba(7,112,227,0.03); border:1px solid var(--primary-light);">
        <div class="form-group">
          <label class="form-label" style="color:var(--primary-light); font-weight:700;">Bayar Vendor Menggunakan Akun: *</label>
          <select class="form-control" name="paymentAccount" required style="border-color:var(--primary-light);">
            <option value="2-2000" ${data.paymentAccount === '2-2000' || !data.paymentAccount ? 'selected' : ''}>2-2000 - Utang Usaha (Belum Bayar)</option>
            ${S.getCOA().filter(a => a.type === 'asset' && (a.code.startsWith('1-10') || a.code.startsWith('1-13'))).sort((a, b) => a.code.localeCompare(b.code)).map(a => `<option value="${a.code}" ${data.paymentAccount === a.code ? 'selected' : ''}>${a.code} - ${a.name} (Saldo: ${S.formatCurrency(a.balance)})</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row-3">
        <div class="form-group"><label class="form-label">Harga Modal Jemaah *</label><div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" name="costPricePerPax" value="${S.formatInt(data.costPricePerPax || '')}" required placeholder="0" oninput="TMS.App.formatNumberInput(this); TMS.Umroh.calcMargin()"></div></div>
        <div class="form-group"><label class="form-label">Margin Laba Jemaah *</label><div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" id="um_marginPerPax" name="marginPerPax" value="${S.formatInt(data.marginPerPax || '')}" required placeholder="0" oninput="TMS.App.formatNumberInput(this); TMS.Umroh.calcMargin()"></div></div>
        <div class="form-group"><label class="form-label">Harga Jual Jemaah</label><div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" id="um_sellingPricePerPax" name="sellingPricePerPax" value="${S.formatInt(data.sellingPricePerPax || '')}" readonly style="background:var(--bg-secondary);" placeholder="0"></div></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Total Harga Modal</label><div class="form-control" id="umTotalCostDisplay" style="color:var(--text-secondary);font-weight:700;">Rp 0</div><input type="hidden" name="costPrice" id="umCostPriceHidden" value="${data.costPrice || ''}"></div>
        <div class="form-group"><label class="form-label">Total Harga Jual</label><div class="form-control" id="umTotalSellDisplay" style="color:var(--primary-light);font-weight:700;">Rp 0</div><input type="hidden" name="sellingPrice" id="umSellingPriceHidden" value="${data.sellingPrice || ''}"></div>
        <div class="form-group"><label class="form-label">Total Margin (Laba)</label><div class="form-control" id="umTotalMarginDisplay" style="background:var(--success-bg); color:var(--success); font-weight:800;">Rp 0</div></div>
      </div>

      <div class="form-group mb-2" style="background:var(--bg-secondary); padding:0.75rem; border-radius:4px; border:1px solid var(--border-color);">
        <label style="display:flex; align-items:center; cursor:pointer; margin:0;">
          <input type="checkbox" name="saveAsMaster" style="margin-right:8px; width:16px; height:16px;">
          <span style="font-weight:600; color:var(--text-color);">Simpan juga rancangan ini sebagai Master Paket baru di Katalog</span>
        </label>
      </div>

      <input type="hidden" name="umrohSaveType" id="umrohSaveType" value="confirmed">
      ${data.id && data.status !== 'quotation' ? `
      <div class="form-actions" style="display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap;">
        <button type="button" class="btn btn-outline" onclick="TMS.Umroh.closeForm()">Batal</button>
        <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Simpan Perubahan</button>
      </div>` : `
      <div class="form-actions" style="display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap;">
        <button type="button" class="btn btn-outline" onclick="TMS.Umroh.closeForm()">Batal</button>
        <button type="button" class="btn btn-info" onclick="document.getElementById('umrohSaveType').value='quotation'; document.getElementById('umrohForm').requestSubmit()"><i data-lucide="file-text"></i> Simpan Penawaran</button>
        <button type="button" class="btn btn-primary" onclick="document.getElementById('umrohSaveType').value='confirmed'; document.getElementById('umrohForm').requestSubmit()"><i data-lucide="check-circle"></i> Terbitkan Voucher Langsung</button>
      </div>`}
    </form>`;
  }

  function generateItineraryRows() {
    const days = parseInt(document.getElementById('umrohDaysInput')?.value) || 9;
    const container = document.getElementById('umrohItineraryContainer');
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
      } else if (editUmrohData && editUmrohData.itinerary && editUmrohData.itinerary[i - 1]) {
        titleVal = editUmrohData.itinerary[i - 1].title || '';
        descVal = editUmrohData.itinerary[i - 1].description || '';
      }
      html += `
      <div class="itinerary-row" style="margin-bottom:16px; padding-bottom:16px; border-bottom:1px dashed var(--border-color);">
        <div style="font-weight:700; font-size:12px; margin-bottom:8px; color:var(--primary);">HARI ${i}</div>
        <div class="form-group" style="margin-bottom:8px;">
          <input class="form-control form-control-sm" name="iti_title_${i}" value="${titleVal.replace(/"/g, '&quot;')}" placeholder="Judul kegiatan (misal: Ziarah Raudhah & Masjid Nabawi)" required>
        </div>
        <div class="form-group">
          <textarea class="form-control form-control-sm" name="iti_desc_${i}" rows="2" placeholder="Detail kegiatan jemaah hari ini..." required>${descVal}</textarea>
        </div>
      </div>`;
    }
    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
  }

  function generateParticipantRows() {
    const pax = parseInt(document.getElementById('umrohPaxInput')?.value) || 1;
    const container = document.getElementById('umrohParticipantsContainer');
    if (!container) return;

    // Save existing data
    const existingData = [];
    const currentPax = container.querySelectorAll('.participant-row').length;
    for(let i=1; i<=currentPax; i++) {
        existingData.push({
            name: document.querySelector(`[name="pax_name_${i}"]`)?.value || '',
            nik: document.querySelector(`[name="pax_nik_${i}"]`)?.value || '',
            phone: document.querySelector(`[name="pax_phone_${i}"]`)?.value || '',
            passport: document.querySelector(`[name="pax_passport_${i}"]`)?.value || '',
            passportExpiry: document.querySelector(`[name="pax_passport_expiry_${i}"]`)?.value || '',
            roomSharing: document.querySelector(`[name="pax_room_${i}"]`)?.value || 'quad',
            physPass: document.querySelector(`[name="pax_physpass_${i}"]`)?.checked || false,
            physVacc: document.querySelector(`[name="pax_physvacc_${i}"]`)?.checked || false,
            physPhoto: document.querySelector(`[name="pax_physphoto_${i}"]`)?.checked || false,
            visaStatus: document.querySelector(`[name="pax_visastatus_${i}"]`)?.value || 'unprocessed',
            ihramSerah: document.querySelector(`[name="pax_ihramserah_${i}"]`)?.checked || false,
            koperSerah: document.querySelector(`[name="pax_koperserah_${i}"]`)?.checked || false,
            batikSerah: document.querySelector(`[name="pax_batikserah_${i}"]`)?.checked || false
        });
    }

    const inventory = S.getAll('inventory') || [];
    const stockIhram = inventory.find(item => item.code === 'INV-IHRAM')?.stock || 0;
    const stockKoper = inventory.find(item => item.code === 'INV-KOPER')?.stock || 0;
    const stockBatik = inventory.find(item => item.code === 'INV-BATIK')?.stock || 0;

    let html = '';
    for (let i = 1; i <= pax; i++) {
      let data = {name:'', nik:'', phone:'', passport:'', passportExpiry:'', roomSharing:'quad', physPass:false, physVacc:false, physPhoto:false, visaStatus:'unprocessed', ihramSerah:false, koperSerah:false, batikSerah:false};
      if (existingData[i-1] && (existingData[i-1].name || existingData[i-1].passport)) {
        data = existingData[i-1];
      } else if (editUmrohData && editUmrohData.participants && editUmrohData.participants[i-1]) {
        data = editUmrohData.participants[i-1];
      }
      
      const labelIhram = stockIhram <= 0 && !data.ihramSerah
        ? `<span style="color:var(--danger); font-weight:700;">(Stok Habis!)</span>`
        : `<span style="color:var(--text-muted); font-weight:500;">(Sisa: ${stockIhram})</span>`;
      const labelKoper = stockKoper <= 0 && !data.koperSerah
        ? `<span style="color:var(--danger); font-weight:700;">(Stok Habis!)</span>`
        : `<span style="color:var(--text-muted); font-weight:500;">(Sisa: ${stockKoper})</span>`;
      const labelBatik = stockBatik <= 0 && !data.batikSerah
        ? `<span style="color:var(--danger); font-weight:700;">(Stok Habis!)</span>`
        : `<span style="color:var(--text-muted); font-weight:500;">(Sisa: ${stockBatik})</span>`;

      html += `
      <div class="participant-row" style="margin-bottom:16px; padding-bottom:16px; border-bottom:1px dashed var(--border-color);">
        <div style="font-weight:700; font-size:12px; margin-bottom:6px; color:var(--primary);">JEMAAH ${i}</div>
        <div class="form-row-3">
          <div class="form-group" style="margin-bottom:4px;">
            <label class="form-label" style="font-size:11px;">Nama Lengkap (Sesuai Paspor) *</label>
            <input class="form-control form-control-sm" name="pax_name_${i}" placeholder="Nama lengkap jemaah ${i}" value="${data.name.replace(/"/g, '&quot;')}" required>
          </div>
          <div class="form-group" style="margin-bottom:4px;">
            <label class="form-label" style="font-size:11px;">No. KTP / NIK</label>
            <input class="form-control form-control-sm" name="pax_nik_${i}" placeholder="16 digit NIK" value="${data.nik.replace(/"/g, '&quot;')}">
          </div>
          <div class="form-group" style="margin-bottom:4px;">
            <label class="form-label" style="font-size:11px;">No. HP / WhatsApp</label>
            <input class="form-control form-control-sm" name="pax_phone_${i}" placeholder="No. HP jemaah" value="${data.phone.replace(/"/g, '&quot;')}">
          </div>
        </div>
        <div class="form-row-3" style="margin-top:8px;">
          <div class="form-group" style="margin-bottom:4px;">
            <label class="form-label" style="font-size:11px;">No. Paspor *</label>
            <input class="form-control form-control-sm" name="pax_passport_${i}" placeholder="B 1234567" value="${data.passport.replace(/"/g, '&quot;')}">
          </div>
          <div class="form-group" style="margin-bottom:4px;">
            <label class="form-label" style="font-size:11px;">Masa Berlaku Paspor *</label>
            <input class="form-control form-control-sm" type="date" name="pax_passport_expiry_${i}" value="${data.passportExpiry}">
          </div>
          <div class="form-group" style="margin-bottom:4px;">
            <label class="form-label" style="font-size:11px;">Tipe Kamar / Sharing *</label>
            <select class="form-control form-control-sm" name="pax_room_${i}">
              <option value="quad" ${data.roomSharing === 'quad' ? 'selected' : ''}>Quad (Kamar 4 Orang)</option>
              <option value="triple" ${data.roomSharing === 'triple' ? 'selected' : ''}>Triple (Kamar 3 Orang)</option>
              <option value="double" ${data.roomSharing === 'double' ? 'selected' : ''}>Double (Kamar 2 Orang)</option>
            </select>
          </div>
        </div>
        
        <!-- DOCUMENT TRACKING & LOGISTICS -->
        <div style="margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:16px; padding:10px; background:rgba(184,158,103,0.03); border:1px solid rgba(184,158,103,0.15); border-radius:6px;">
          <div>
            <div style="font-size:10px; font-weight:700; color:var(--primary); margin-bottom:6px; letter-spacing:0.5px;">🗂 DOKUMEN FISIK JEMAAH</div>
            <div style="display:flex; flex-direction:column; gap:6px; font-size:11px;">
              <label style="display:flex; align-items:center; cursor:pointer;"><input type="checkbox" name="pax_physpass_${i}" style="margin-right:6px;" ${data.physPass ? 'checked' : ''}> Paspor Fisik Diterima</label>
              <label style="display:flex; align-items:center; cursor:pointer;"><input type="checkbox" name="pax_physvacc_${i}" style="margin-right:6px;" ${data.physVacc ? 'checked' : ''}> Buku Vaksin Meningitis Diterima</label>
              <label style="display:flex; align-items:center; cursor:pointer;"><input type="checkbox" name="pax_physphoto_${i}" style="margin-right:6px;" ${data.physPhoto ? 'checked' : ''}> Foto 4x6 Background Putih</label>
              <div style="margin-top:4px; display:flex; align-items:center; gap:6px;">
                <span>Status Visa:</span>
                <select class="form-control form-control-xs" name="pax_visastatus_${i}" style="width:auto; padding:2px 6px; height:auto; font-size:10px;">
                  <option value="unprocessed" ${data.visaStatus === 'unprocessed' ? 'selected' : ''}>Belum Proses</option>
                  <option value="processing" ${data.visaStatus === 'processing' ? 'selected' : ''}>Dalam Proses</option>
                  <option value="issued" ${data.visaStatus === 'issued' ? 'selected' : ''}>Visa Terbit (Issued)</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <div style="font-size:10px; font-weight:700; color:var(--primary); margin-bottom:6px; letter-spacing:0.5px;">📦 LOGISTIK / PERLENGKAPAN</div>
            <div style="display:flex; flex-direction:column; gap:6px; font-size:11px;">
              <label style="display:flex; align-items:center; cursor:pointer;"><input type="checkbox" name="pax_ihramserah_${i}" style="margin-right:6px;" ${data.ihramSerah ? 'checked' : ''} ${stockIhram <= 0 && !data.ihramSerah ? 'disabled' : ''}> Kain Ihram / Mukena diserahkan ${labelIhram}</label>
              <label style="display:flex; align-items:center; cursor:pointer;"><input type="checkbox" name="pax_koperserah_${i}" style="margin-right:6px;" ${data.koperSerah ? 'checked' : ''} ${stockKoper <= 0 && !data.koperSerah ? 'disabled' : ''}> Koper Kustom Travel diserahkan ${labelKoper}</label>
              <label style="display:flex; align-items:center; cursor:pointer;"><input type="checkbox" name="pax_batikserah_${i}" style="margin-right:6px;" ${data.batikSerah ? 'checked' : ''} ${stockBatik <= 0 && !data.batikSerah ? 'disabled' : ''}> Bahan Seragam Batik diserahkan ${labelBatik}</label>
            </div>
          </div>
        </div>
      </div>`;
    }
    container.innerHTML = html;
  }

  function showForm(id = null) { 
    const modal = document.getElementById('umrohModal');
    if (id) {
      const u = S.getById('umroh', id);
      if (!u) return;
      editUmrohData = u;
      modal.querySelector('.modal-title').textContent = 'Edit Paket Umroh & Haji';
      modal.querySelector('.modal-body').innerHTML = renderForm(u);
      modal.classList.add('active'); 
      generateItineraryRows();
      generateParticipantRows();
      calcMargin();
    } else {
      editUmrohData = null;
      modal.querySelector('.modal-title').textContent = 'Rancang Paket Umroh & Haji';
      modal.querySelector('.modal-body').innerHTML = renderForm();
      modal.classList.add('active'); 
      generateItineraryRows();
      generateParticipantRows();
      calcMargin();
    }
    if (window.lucide) lucide.createIcons(); 
  }
  function closeForm() { document.getElementById('umrohModal').classList.remove('active'); }

  function calcMargin() {
    const pax = parseInt(document.getElementById('umrohPaxInput')?.value) || 1;
    const costPP = S.parseNumber(document.querySelector('[name="costPricePerPax"]')?.value) || 0;
    const marginPP = S.parseNumber(document.querySelector('[name="marginPerPax"]')?.value) || 0;
    const sellPP = costPP + marginPP;

    const sellPPInput = document.getElementById('um_sellingPricePerPax');
    if (sellPPInput) sellPPInput.value = S.formatInt(sellPP);

    const totalCost = costPP * pax;
    const totalSell = sellPP * pax;
    const totalMargin = totalSell - totalCost;

    const tcEl = document.getElementById('umTotalCostDisplay'); if (tcEl) tcEl.textContent = S.formatCurrency(totalCost);
    const tsEl = document.getElementById('umTotalSellDisplay'); if (tsEl) tsEl.textContent = S.formatCurrency(totalSell);
    const tmEl = document.getElementById('umTotalMarginDisplay'); 
    if (tmEl) { 
        tmEl.textContent = S.formatCurrency(totalMargin);
        tmEl.style.color = totalMargin >= 0 ? 'var(--success)' : 'var(--danger)';
    }

    const chEl = document.getElementById('umCostPriceHidden'); if (chEl) chEl.value = totalCost;
    const shEl = document.getElementById('umSellingPriceHidden'); if (shEl) shEl.value = totalSell;
  }

  function onCustomerSelect(sel) {
    const id = sel.value;
    if (!id) return;
    const c = S.getById('customers', id);
    if (!c) return;
    document.getElementById('um_name').value = c.name || '';
    document.getElementById('um_id').value = c.idNumber || '';
    document.getElementById('um_email').value = c.email || '';
    document.getElementById('um_phone').value = c.phone || '';
    document.getElementById('um_address').value = c.address || '';
    
    const isChecked = document.getElementById('copyToLeaderBtnUmroh')?.checked;
    if (isChecked) {
      copyCustomerToLeader(true);
    }
    sel.value = "";
  }

  function copyCustomerToLeader(isCopy) {
    const paxName = document.querySelector('[name="pax_name_1"]');
    const paxPhone = document.querySelector('[name="pax_phone_1"]');
    if (isCopy && paxName) {
      paxName.value = document.getElementById('um_name')?.value || '';
      if(paxPhone) paxPhone.value = document.getElementById('um_phone')?.value || '';
    }
  }

  function onParticipantSelect(sel) {
    const id = sel.value;
    if (!id) return;
    const c = S.getById('customers', id);
    if (!c) return;
    
    const pax = parseInt(document.getElementById('umrohPaxInput')?.value) || 1;
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
      document.getElementById('umrohPaxInput').value = pax + 1;
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
    
    const saveType = dataObj.umrohSaveType || 'confirmed';
    delete dataObj.umrohSaveType;

    const saveAsMaster = dataObj.saveAsMaster === 'on';
    delete dataObj.saveAsMaster;

    // Extract Itinerary
    const itinerary = [];
    const days = parseInt(dataObj.days) || 9;
    for (let i = 1; i <= days; i++) {
      itinerary.push({
        day: i,
        title: dataObj[`iti_title_${i}`],
        description: dataObj[`iti_desc_${i}`]
      });
      delete dataObj[`iti_title_${i}`];
      delete dataObj[`iti_desc_${i}`];
    }

    // Extract Participants (Jemaah)
    const participants = [];
    const pax = parseInt(dataObj.pax) || 1;
    for (let i = 1; i <= pax; i++) {
      participants.push({
        name: dataObj[`pax_name_${i}`] || '',
        nik: dataObj[`pax_nik_${i}`] || '',
        phone: dataObj[`pax_phone_${i}`] || '',
        passport: dataObj[`pax_passport_${i}`] || '',
        passportExpiry: dataObj[`pax_passport_expiry_${i}`] || '',
        roomSharing: dataObj[`pax_room_${i}`] || 'quad',
        physPass: dataObj[`pax_physpass_${i}`] === 'on',
        physVacc: dataObj[`pax_physvacc_${i}`] === 'on',
        physPhoto: dataObj[`pax_physphoto_${i}`] === 'on',
        visaStatus: dataObj[`pax_visastatus_${i}`] || 'unprocessed',
        ihramSerah: dataObj[`pax_ihramserah_${i}`] === 'on',
        koperSerah: dataObj[`pax_koperserah_${i}`] === 'on',
        batikSerah: dataObj[`pax_batikserah_${i}`] === 'on'
      });
      delete dataObj[`pax_name_${i}`];
      delete dataObj[`pax_nik_${i}`];
      delete dataObj[`pax_phone_${i}`];
      delete dataObj[`pax_passport_${i}`];
      delete dataObj[`pax_passport_expiry_${i}`];
      delete dataObj[`pax_room_${i}`];
      delete dataObj[`pax_physpass_${i}`];
      delete dataObj[`pax_physvacc_${i}`];
      delete dataObj[`pax_physphoto_${i}`];
      delete dataObj[`pax_visastatus_${i}`];
      delete dataObj[`pax_ihramserah_${i}`];
      delete dataObj[`pax_koperserah_${i}`];
      delete dataObj[`pax_batikserah_${i}`];
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
      existing = S.getById('umroh', dataObj.id);
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
      adjustInventoryOnSave(existing, booking);
      booking.bookingCode = existing.bookingCode;
      booking.paymentStatus = existing.paymentStatus || 'unpaid';
      if (existing.status === 'quotation' && saveType === 'confirmed') {
        booking.status = 'confirmed';
      } else {
        booking.status = existing.status;
        if (saveType === 'quotation') booking.status = 'quotation';
      }
      S.update('umroh', dataObj.id, booking);
      savedObj = S.getById('umroh', dataObj.id);
      TMS.App.toast('Paket Umroh & Haji berhasil diperbarui!', 'success');
    } else {
      adjustInventoryOnSave(null, booking);
      booking.bookingCode = S.generateCode('umroh');
      booking.paymentStatus = 'unpaid';
      booking.status = saveType;
      savedObj = S.add('umroh', booking);
      TMS.App.toast(saveType === 'quotation' ? 'Penawaran Paket Umroh & Haji berhasil disimpan!' : 'Paket Umroh & Haji berhasil diterbitkan!', 'success');
    }

    if (savedObj.status === 'confirmed') {
      createJournal(savedObj);
      const inv = createInvoice(savedObj);

      if (isEdit && isPaid) {
        S.update('umroh', savedObj.id, { paymentStatus: 'paid' });
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
        bookingCode: 'MSTR-' + S.generateCode('umroh'),
        packageName: booking.packageName,
        mutawwif: booking.mutawwif,
        airline: booking.airline,
        hotelMakkah: booking.hotelMakkah,
        hotelMadinah: booking.hotelMadinah,
        days: booking.days,
        inclusions: booking.inclusions,
        costPricePerPax: booking.costPricePerPax,
        marginPerPax: booking.marginPerPax,
        sellingPricePerPax: booking.sellingPricePerPax,
        itinerary: booking.itinerary,
        terms: booking.terms
      };
      S.add('master_umrohs', masterData);
      TMS.App.toast('Master Paket baru otomatis ditambahkan ke Katalog!', 'success');
    }

    closeForm(); TMS.App.navigate('umroh');
  }

  function markPaid(id) {
    const u = S.getById('umroh', id); if (!u) return;
    S.update('umroh', id, { paymentStatus: 'paid' });
    const inv = S.getAll('invoices').find(i => i.bookingId === id);
    if (inv) {
      S.update('invoices', inv.id, { paymentStatus: 'paid', paidAt: new Date().toISOString() });
      const j = { journalNumber: S.generateCode('journal'), date: new Date().toISOString().split('T')[0], description: `Penerimaan Kas Umroh - ${u.bookingCode}`, reference: u.bookingCode, type: 'payment_received', entries: [{ accountCode: '1-1000', accountName: 'Kas', debit: inv.total, credit: 0 }, { accountCode: '1-1100', accountName: 'Piutang Usaha', debit: 0, credit: inv.total }] };
      S.add('journals', j); S.recalculateCOA();
    }
    TMS.App.navigate('umroh'); TMS.App.toast('Status pembayaran: LUNAS', 'success');
  }

  function showDetail(id) {
    const u = S.getById('umroh', id);
    if (!u) return;
    const modal = document.getElementById('umrohModal');
    if (!modal || !modal.querySelector) return;
    modal.querySelector('.modal-title').textContent = 'Detail Paket Umroh & Haji';
    modal.querySelector('.modal-body').innerHTML = renderDetail(u);
    modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function renderDetail(u) {
    const itineraryHtml = (u.itinerary || []).map(iti => `
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

    const visaMap = { unprocessed: '🔴 Belum Proses', processing: '🟡 Dalam Proses', issued: '🟢 Visa Terbit (Issued)' };

    return `
    <div class="detail-view">
      <div class="detail-header mb-2" style="border-bottom:1px solid var(--border-color);padding-bottom:1rem;">
        <div class="flex-between">
          <div>
            <h3 class="mb-0" style="color:var(--primary-light);">${u.packageName}</h3>
            <div class="text-muted"><i data-lucide="palmtree"></i> Rute: ${u.airline}</div>
          </div>
          <div class="text-right">
            <span class="badge ${u.paymentStatus === 'paid' ? 'badge-success' : 'badge-danger'}">${u.paymentStatus === 'paid' ? 'LUNAS' : 'BELUM LUNAS'}</span>
            <div class="font-mono mt-1" style="font-weight:700;">${u.bookingCode}</div>
          </div>
        </div>
      </div>

      <div class="form-row mb-2">
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">KEBERANGKATAN & PEMBIMBING</div>
          <div class="font-bold" style="font-size:14px;">✈️ ${S.formatDate(u.departureDate)}</div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">👳 Mutawwif: ${u.mutawwif}</div>
        </div>
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">DURASI & PROGRAM</div>
          <div class="font-bold" style="font-size:14px;">⏱️ ${u.days} Hari • ${u.pax} Jemaah</div>
        </div>
      </div>

      <div class="form-row mb-2">
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">🕋 AKOMODASI MAKKAH</div>
          <div class="font-bold" style="font-size:12px;">${u.hotelMakkah}</div>
        </div>
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">🕌 AKOMODASI MADINAH</div>
          <div class="font-bold" style="font-size:12px;">${u.hotelMadinah}</div>
        </div>
      </div>

      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="users" style="width:14px;height:14px;vertical-align:middle;"></i> DAFTAR MANIFEST BERKAS & LOGISTIK JEMAAH</div>
      <div class="card mb-2 p-1" style="background:var(--bg-secondary);">
        ${(u.participants || []).map((p, idx) => `
          <div class="mb-1" style="${idx > 0 ? 'border-top:1px dashed var(--border-color); padding-top:12px; margin-top:12px;' : ''}">
            <div class="flex-between" style="align-items: center;">
              <span style="font-size:13px;">
                Jemaah ${idx+1}: <strong>${p.name || '-'}</strong>
                <button class="btn btn-xs btn-whatsapp" onclick="TMS.App.shareToWhatsApp('umroh', '${u.id}', ${idx})" title="Kirim Pengingat WA" style="padding: 2px 6px; font-size: 10px; display: inline-flex; align-items: center; gap: 4px; margin-left: 8px;">
                  <i data-lucide="bell" style="width:10px; height:10px;"></i> Pengingat WA
                </button>
              </span>
              <span class="badge badge-outline" style="font-size:10px;">Kamar: ${p.roomSharing?.toUpperCase() || 'QUAD'}</span>
            </div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:4px; display:grid; grid-template-columns:1fr 1fr; gap:10px; background:rgba(255,255,255,0.4); padding:8px; border-radius:6px;">
              <div>
                <strong>🗂 Dokumen Jemaah:</strong><br>
                • Paspor: <strong>${p.passport || '-'}</strong> (Expired: ${S.formatDate(p.passportExpiry)})<br>
                • Buku Kuning Vaksin: <strong>${p.physVacc ? '✅ Diterima' : '❌ Belum Diterima'}</strong><br>
                • Paspor Fisik: <strong>${p.physPass ? '✅ Diterima' : '❌ Belum Diterima'}</strong><br>
                • Foto Putih 4x6: <strong>${p.physPhoto ? '✅ Diterima' : '❌ Belum Diterima'}</strong><br>
                • Status Visa: <strong>${visaMap[p.visaStatus] || p.visaStatus}</strong>
              </div>
              <div>
                <strong>📦 Perlengkapan / Logistik:</strong><br>
                • Kain Ihram/Mukena: <strong>${p.ihramSerah ? '✅ Diserahkan' : '❌ Belum'}</strong><br>
                • Koper Kustom Travel: <strong>${p.koperSerah ? '✅ Diserahkan' : '❌ Belum'}</strong><br>
                • Seragam Batik Travel: <strong>${p.batikSerah ? '✅ Diserahkan' : '❌ Belum'}</strong>
              </div>
            </div>
          </div>
        `).join('') || '<div class="table-empty">Belum ada manifest jemaah</div>'}
      </div>

      <!-- ITINERARY VIEW -->
      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light); margin-top:20px;"><i data-lucide="calendar" style="width:14px;height:14px;vertical-align:middle;"></i> RENCANA ITINERARY HARIAN</div>
      <div class="card mb-2" style="padding:24px 16px; background:var(--bg-secondary);">
        ${itineraryHtml || '<div class="table-empty">Belum ada data itinerary</div>'}
      </div>

      ${u.inclusions ? `
      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="check-square" style="width:14px;height:14px;vertical-align:middle;"></i> FASILITAS TAMBAHAN & INKLUSI</div>
      <div class="card mb-2 p-1" style="background:rgba(7,112,227,0.05);border-left:3px solid var(--primary);">
        <div style="white-space:pre-line;">${u.inclusions}</div>
      </div>` : ''}

      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="dollar-sign" style="width:14px;height:14px;vertical-align:middle;"></i> BIAYA & POSISI KEUANGAN (AKUNTANSI)</div>
      <div class="card p-1" style="background:var(--bg-secondary);">
        <div class="flex-between mb-1"><span>Modal / HPP Jemaah (BPP)</span><span class="font-mono">${S.formatCurrency(u.costPrice)}</span></div>
        <div class="flex-between mb-1"><span>Sumber Dana Pembayaran Vendor</span><span class="badge badge-outline" style="font-family:monospace;">${u.paymentAccount || '2-2000'}</span></div>
        <div class="flex-between mb-1"><span>Harga Jual Total Rombongan</span><span class="font-mono" style="color:var(--primary-light);font-weight:700;">${S.formatCurrency(u.sellingPrice)}</span></div>
        <div class="flex-between border-top pt-1 mt-1" style="border-top:1px dashed var(--border-color) !important;">
          <span style="font-weight:700;">Margin Bersih Umroh</span>
          <span class="font-mono ${u.sellingPrice - u.costPrice >= 0 ? 'text-success' : 'text-danger'}" style="font-weight:700;">${S.formatCurrency(u.sellingPrice - u.costPrice)}</span>
        </div>
      </div>
      
      <div class="form-actions mt-2">
        <button class="btn btn-outline" onclick="TMS.Umroh.closeForm()">Tutup</button>
        <button class="btn btn-secondary" onclick="TMS.Umroh.openRoomingBuilder('${u.id}')" style="display:flex;align-items:center;gap:6px;"><i data-lucide="bed" style="width:16px;height:16px;"></i> Pembagian Kamar (Rooming List)</button>
        <button class="btn btn-whatsapp" onclick="TMS.App.shareToWhatsApp('umroh', '${u.id}')"><i data-lucide="message-square"></i> Hubungi Ketua (Rekap Rombongan)</button>
      </div>
    </div>`;
  }

  function del(id) {
    if (!confirm('Hapus paket umroh & haji ini? Seluruh invoice dan laporan keuangan terkait juga akan dihapus.')) return;
    const u = S.getById('umroh', id);
    if (!u) return;
    const invoices = S.getAll('invoices').filter(inv => inv.bookingId === id);
    invoices.forEach(inv => {
      const payments = S.getAll('payments');
      payments.forEach(p => { if (p.invoiceId === inv.id) S.remove('payments', p.id); });
      S.remove('invoices', inv.id);
    });
    const journals = S.getAll('journals');
    journals.forEach(j => { if (j.reference === u.bookingCode) S.remove('journals', j.id); });
    S.remove('umroh', id);
    S.recalculateCOA();
    TMS.App.navigate('umroh');
    TMS.App.toast('Paket Umroh & Haji dan data keuangan terkait dihapus', 'warning');
  }

  function search(q) {
    const umrohs = S.getAll('umroh').filter(u => !q || u.packageName?.toLowerCase().includes(q.toLowerCase()) || u.customerName?.toLowerCase().includes(q.toLowerCase()) || u.bookingCode?.toLowerCase().includes(q.toLowerCase()));
    document.getElementById('umrohBody').innerHTML = renderRows(getSortedUmroh(umrohs));
    if (window.lucide) lucide.createIcons();
  }

  function download(id) {
    const u = S.getById('umroh', id);
    if (u) TMS.PDF.generateUmrohVoucher(u);
  }

  function downloadQuotation(id) {
    const u = S.getById('umroh', id);
    if (u) TMS.PDF.generateUmrohQuotation(u);
  }

  function approveQuotation(id) {
    if (!confirm('Apakah penawaran ini sudah disetujui pelanggan/jemaah? Jika Ya, sistem akan membuat Invoice dan Pesanan Aktif (Voucher).')) return;
    const u = S.getById('umroh', id);
    if (!u) return;
    
    S.update('umroh', id, { status: 'confirmed' });
    const updatedUmroh = S.getById('umroh', id);
    
    createJournal(updatedUmroh); 
    createInvoice(updatedUmroh);
    
    TMS.App.navigate('umroh');
    TMS.App.toast('Penawaran berhasil disetujui! Voucher dan Invoice telah diterbitkan.', 'success');
  }

  let activeRoomingList = [];

  function openRoomingBuilder(id) {
    const u = S.getById('umroh', id);
    if (!u) return;
    activeRoomingList = JSON.parse(JSON.stringify(u.roomingList || []));
    const modal = document.getElementById('umrohModal');
    modal.querySelector('.modal-title').textContent = `Pembagian Kamar (Rooming List) - ${u.packageName}`;
    renderRoomingBuilderContent(id);
    modal.classList.add('active');
  }

  function renderRoomingBuilderContent(id) {
    const u = S.getById('umroh', id);
    if (!u) return;
    const participants = u.participants || [];
    
    const getParticipantRoom = (name) => {
      for (let rIdx = 0; rIdx < activeRoomingList.length; rIdx++) {
        const room = activeRoomingList[rIdx];
        if ((room.participants || []).includes(name)) {
          return { roomName: room.roomName, index: rIdx };
        }
      }
      return null;
    };

    const unassignedJemaah = participants.filter(p => !getParticipantRoom(p.name));
    
    let jemaahHtml = '<div style="margin-bottom:12px; font-weight:700; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted);"><i data-lucide="users" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> Jemaah Rombongan</div>';
    if (participants.length === 0) {
      jemaahHtml += '<div class="table-empty">Belum ada jemaah terdaftar</div>';
    } else {
      jemaahHtml += '<div style="display:flex; flex-direction:column; gap:8px;">';
      participants.forEach(p => {
        const roomInfo = getParticipantRoom(p.name);
        const prefMap = { quad: 'Quad (Kamar 4)', triple: 'Triple (Kamar 3)', double: 'Double (Kamar 2)' };
        const prefText = prefMap[p.roomSharing] || p.roomSharing;
        
        jemaahHtml += `
        <div style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:${roomInfo ? 'rgba(0,184,140,0.03)' : 'rgba(100,116,139,0.03)'}; display:flex; flex-direction:column; gap:4px;">
          <div style="font-weight:700; font-size:13px; color:var(--text-primary);">${p.name}</div>
          <div style="font-size:10px; color:var(--text-muted);">${prefText}</div>
          <div style="margin-top:2px;">
            ${roomInfo 
              ? `<span style="font-size:10px; font-weight:700; color:var(--success); background:rgba(0,184,140,0.08); padding:2px 6px; border-radius:4px;">🔑 ${roomInfo.roomName}</span>` 
              : `<span style="font-size:10px; font-weight:700; color:var(--text-muted); background:rgba(100,116,139,0.08); padding:2px 6px; border-radius:4px;">Belum Berkamar</span>`
            }
          </div>
        </div>`;
      });
      jemaahHtml += '</div>';
    }

    let roomsHtml = '<div style="margin-bottom:12px; font-weight:700; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted);"><i data-lucide="home" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> Tata Ruang Kamar Hotel</div>';
    if (activeRoomingList.length === 0) {
      roomsHtml += '<div class="table-empty" style="padding:40px;"><i data-lucide="bed" style="width:32px; height:32px; display:block; margin:0 auto 8px; opacity:0.3;"></i>Kamar belum diatur. Klik "Auto-Generate" untuk membagi secara otomatis.</div>';
    } else {
      roomsHtml += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; width:100%;">';
      activeRoomingList.forEach((room, rIdx) => {
        const capacityMap = { quad: 4, triple: 3, double: 2 };
        const capacity = capacityMap[room.roomType] || 2;
        const borderColors = { quad: 'var(--bg-sidebar)', triple: 'var(--info)', double: 'var(--primary)' };
        const titleColors = { quad: 'var(--bg-sidebar)', triple: '#0284c7', double: '#b89e67' };
        
        roomsHtml += `
        <div style="border:1px solid var(--border-color); border-top: 4px solid ${borderColors[room.roomType]}; border-radius:12px; padding:12px; background:var(--bg-card); display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:6px;">
            <div style="font-weight:800; font-size:12px; color:${titleColors[room.roomType]}; text-transform:uppercase;">${room.roomName}</div>
            <button type="button" onclick="TMS.Umroh.deleteRoom('${id}', ${rIdx})" style="background:transparent; border:none; color:var(--danger); cursor:pointer; font-weight:700; font-size:11px;">Hapus</button>
          </div>
          <div style="display:flex; flex-direction:column; gap:6px;">`;
          
          for (let sIdx = 0; sIdx < capacity; sIdx++) {
            const occupant = room.participants[sIdx];
            roomsHtml += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-primary); padding:6px 8px; border-radius:6px; min-height:28px; font-size:11px;">
              ${occupant 
                ? `<span style="font-weight:600; color:var(--text-primary);">${occupant}</span>
                   <button type="button" onclick="TMS.Umroh.unassignJemaahFromRoom('${id}', ${rIdx}, '${occupant}')" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; font-weight:700; font-size:10px; padding:0 2px;">✕</button>` 
                : `<select onchange="TMS.Umroh.assignJemaahToRoom('${id}', ${rIdx}, ${sIdx}, this.value)" style="width:100%; background:transparent; border:none; color:var(--text-muted); font-size:11px; cursor:pointer;">
                     <option value="">-- Isi Slot Kosong ${sIdx+1} --</option>
                     ${unassignedJemaah.map(jg => `<option value="${jg.name}">${jg.name} (${jg.roomSharing.toUpperCase()})</option>`).join('')}
                   </select>`
              }
            </div>`;
          }
          
        roomsHtml += `
          </div>
        </div>`;
      });
      roomsHtml += '</div>';
    }

    const html = `
    <div style="display:flex; flex-direction:column; gap:20px; width:100%;">
      <!-- Top Action Toolbar -->
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(184,158,103,0.03); border:1px solid rgba(184,158,103,0.15); border-radius:12px; padding:12px; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button type="button" class="btn btn-sm btn-secondary" onclick="TMS.Umroh.autoGenerateRooms('${id}')" style="font-weight:700; display:flex; align-items:center; gap:6px;"><i data-lucide="wand-2" style="width:14px;height:14px;"></i> Auto-Generate Kamar</button>
          <div style="position:relative; display:inline-block;">
            <button type="button" class="btn btn-sm btn-outline" onclick="document.getElementById('saAddRoomDropdown').classList.toggle('hidden')" style="font-weight:700; display:flex; align-items:center; gap:6px;"><i data-lucide="plus" style="width:14px;height:14px;"></i> Tambah Kamar Manual</button>
            <div id="saAddRoomDropdown" class="card hidden" style="position:absolute; top:36px; left:0; z-index:100; min-width:180px; padding:8px; display:flex; flex-direction:column; gap:6px; box-shadow:var(--shadow-md);">
              <button type="button" class="btn btn-sm btn-ghost" onclick="TMS.Umroh.addCustomRoom('${id}', 'quad'); document.getElementById('saAddRoomDropdown').classList.add('hidden')" style="text-align:left; justify-content:flex-start; width:100%;">Quad (Kamar 4 Orang)</button>
              <button type="button" class="btn btn-sm btn-ghost" onclick="TMS.Umroh.addCustomRoom('${id}', 'triple'); document.getElementById('saAddRoomDropdown').classList.add('hidden')" style="text-align:left; justify-content:flex-start; width:100%;">Triple (Kamar 3 Orang)</button>
              <button type="button" class="btn btn-sm btn-ghost" onclick="TMS.Umroh.addCustomRoom('${id}', 'double'); document.getElementById('saAddRoomDropdown').classList.add('hidden')" style="text-align:left; justify-content:flex-start; width:100%;">Double (Kamar 2 Orang)</button>
            </div>
          </div>
        </div>
        <div>
          <button type="button" class="btn btn-sm btn-outline" onclick="TMS.Umroh.downloadRoomingPDF('${id}')" style="font-weight:700; display:flex; align-items:center; gap:6px;"><i data-lucide="download" style="width:14px;height:14px;"></i> Cetak Rooming List</button>
        </div>
      </div>

      <!-- Main Layout Columns -->
      <div style="display:flex; gap:20px; flex-wrap:wrap;">
        <!-- Left Panel: Jemaah List -->
        <div class="card" style="flex:1; min-width:240px; max-height:400px; overflow-y:auto; padding:16px; border:1px solid var(--border-color); border-radius:12px; background:var(--bg-card);">
          ${jemaahHtml}
        </div>

        <!-- Right Panel: Room Grid -->
        <div class="card" style="flex:2.2; min-width:320px; max-height:400px; overflow-y:auto; padding:16px; border:1px solid var(--border-color); border-radius:12px; background:var(--bg-card);">
          ${roomsHtml}
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="form-actions" style="margin-top:10px; display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap;">
        <button type="button" class="btn btn-outline" onclick="TMS.Umroh.showDetail('${id}')">Kembali Ke Detail</button>
        <button type="button" class="btn btn-primary" onclick="TMS.Umroh.saveRoomingList('${id}')" style="display:flex;align-items:center;gap:6px;"><i data-lucide="save" style="width:16px;height:16px;"></i> Simpan Pembagian Kamar</button>
      </div>
    </div>`;

    const modalBody = document.getElementById('umrohModalBody');
    if (modalBody) modalBody.innerHTML = html;
    if (window.lucide) lucide.createIcons();
  }

  function autoGenerateRooms(id) {
    const u = S.getById('umroh', id);
    if (!u) return;
    const participants = u.participants || [];
    
    const quadGroup = participants.filter(p => p.roomSharing === 'quad');
    const tripleGroup = participants.filter(p => p.roomSharing === 'triple');
    const doubleGroup = participants.filter(p => p.roomSharing === 'double');
    
    const rooms = [];
    
    // Group Quad
    for (let i = 0; i < quadGroup.length; i += 4) {
      const roomNum = Math.floor(i / 4) + 1;
      const roomParts = quadGroup.slice(i, i + 4).map(p => p.name);
      rooms.push({ roomName: `Kamar Q-${roomNum} (Quad)`, roomType: 'quad', participants: roomParts });
    }
    
    // Group Triple
    for (let i = 0; i < tripleGroup.length; i += 3) {
      const roomNum = Math.floor(i / 3) + 1;
      const roomParts = tripleGroup.slice(i, i + 3).map(p => p.name);
      rooms.push({ roomName: `Kamar T-${roomNum} (Triple)`, roomType: 'triple', participants: roomParts });
    }
    
    // Group Double
    for (let i = 0; i < doubleGroup.length; i += 2) {
      const roomNum = Math.floor(i / 2) + 1;
      const roomParts = doubleGroup.slice(i, i + 2).map(p => p.name);
      rooms.push({ roomName: `Kamar D-${roomNum} (Double)`, roomType: 'double', participants: roomParts });
    }
    
    activeRoomingList = rooms;
    renderRoomingBuilderContent(id);
    TMS.App.toast('Pembagian kamar otomatis berhasil diinisialisasi!', 'success');
  }

  function addCustomRoom(id, type) {
    const counts = activeRoomingList.filter(r => r.roomType === type).length;
    const typeLabel = { quad: 'Q', triple: 'T', double: 'D' };
    const typeLabelFull = { quad: 'Quad', triple: 'Triple', double: 'Double' };
    const name = `Kamar ${typeLabel[type]}-${counts + 1} (${typeLabelFull[type]})`;
    
    activeRoomingList.push({ roomName: name, roomType: type, participants: [] });
    renderRoomingBuilderContent(id);
  }

  function deleteRoom(id, roomIdx) {
    activeRoomingList.splice(roomIdx, 1);
    renderRoomingBuilderContent(id);
  }

  function assignJemaahToRoom(id, roomIdx, slotIdx, jemaahName) {
    if (!jemaahName) return;
    
    // Ensure participant isn't already assigned elsewhere (safety check)
    activeRoomingList.forEach(room => {
      room.participants = (room.participants || []).filter(name => name !== jemaahName);
    });
    
    activeRoomingList[roomIdx].participants[slotIdx] = jemaahName;
    renderRoomingBuilderContent(id);
  }

  function unassignJemaahFromRoom(id, roomIdx, jemaahName) {
    activeRoomingList[roomIdx].participants = (activeRoomingList[roomIdx].participants || []).filter(name => name !== jemaahName);
    renderRoomingBuilderContent(id);
  }

  function saveRoomingList(id) {
    // Filter out undefined/empty slots in each room
    activeRoomingList.forEach(room => {
      room.participants = (room.participants || []).filter(name => name !== null && name !== undefined && name !== '');
    });
    
    S.update('umroh', id, { roomingList: activeRoomingList });
    TMS.App.toast('Pembagian kamar jemaah berhasil disimpan!', 'success');
    showDetail(id);
  }

  function downloadRoomingPDF(id) {
    const u = S.getById('umroh', id);
    if (u) {
      const tempBooking = { ...u, roomingList: activeRoomingList };
      TMS.PDF.generateUmrohRoomingList(tempBooking);
    }
  }

  function adjustInventoryOnSave(existingBooking, newBooking) {
    const newParticipants = newBooking.participants || [];
    if (!existingBooking) {
      newParticipants.forEach(p => {
        if (p.ihramSerah) S.updateInventoryStock('INV-IHRAM', -1);
        if (p.koperSerah) S.updateInventoryStock('INV-KOPER', -1);
        if (p.batikSerah) S.updateInventoryStock('INV-BATIK', -1);
      });
      return;
    }

    const oldParticipants = existingBooking.participants || [];
    const maxLen = Math.max(oldParticipants.length, newParticipants.length);
    for (let i = 0; i < maxLen; i++) {
      const oldP = oldParticipants[i];
      const newP = newParticipants[i];

      if (!oldP && newP) {
        if (newP.ihramSerah) S.updateInventoryStock('INV-IHRAM', -1);
        if (newP.koperSerah) S.updateInventoryStock('INV-KOPER', -1);
        if (newP.batikSerah) S.updateInventoryStock('INV-BATIK', -1);
      } else if (oldP && !newP) {
        if (oldP.ihramSerah) S.updateInventoryStock('INV-IHRAM', 1);
        if (oldP.koperSerah) S.updateInventoryStock('INV-KOPER', 1);
        if (oldP.batikSerah) S.updateInventoryStock('INV-BATIK', 1);
      } else if (oldP && newP) {
        if (!oldP.ihramSerah && newP.ihramSerah) S.updateInventoryStock('INV-IHRAM', -1);
        else if (oldP.ihramSerah && !newP.ihramSerah) S.updateInventoryStock('INV-IHRAM', 1);
        
        if (!oldP.koperSerah && newP.koperSerah) S.updateInventoryStock('INV-KOPER', -1);
        else if (oldP.koperSerah && !newP.koperSerah) S.updateInventoryStock('INV-KOPER', 1);
        
        if (!oldP.batikSerah && newP.batikSerah) S.updateInventoryStock('INV-BATIK', -1);
        else if (oldP.batikSerah && !newP.batikSerah) S.updateInventoryStock('INV-BATIK', 1);
      }
    }
  }

  function openInventoryModal() {
    const modal = document.getElementById('umrohModal');
    if (!modal) return;
    const titleEl = modal.querySelector('.modal-title');
    const bodyEl = modal.querySelector('.modal-body');
    if (titleEl) titleEl.textContent = 'Manajemen Inventori Logistik';
    if (bodyEl) bodyEl.innerHTML = renderInventoryModalContent();
    modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function renderInventoryModalContent() {
    const inventory = S.getAll('inventory') || [];
    const rows = inventory.map(item => {
      const isLow = (item.stock || 0) <= (item.minThreshold || 0);
      const statusBadge = isLow 
        ? `<span class="badge badge-danger">⚠️ Stok Kritis</span>`
        : `<span class="badge badge-success">✅ Cukup</span>`;
        
      return `
      <tr>
        <td style="font-weight:700; color:var(--primary); font-size:13px; text-align:left; padding:10px;">${item.code}</td>
        <td style="font-size:13px; font-weight:600; text-align:left; padding:10px;">${item.name}</td>
        <td style="padding:10px;">
          <input class="form-control form-control-sm" type="number" id="inv_stock_${item.code}" value="${item.stock || 0}" style="width:90px; text-align:center; font-weight:700; margin:0 auto;" min="0">
        </td>
        <td style="padding:10px;">
          <input class="form-control form-control-sm" type="number" id="inv_threshold_${item.code}" value="${item.minThreshold || 0}" style="width:90px; text-align:center; font-weight:700; margin:0 auto;" min="0">
        </td>
        <td style="padding:10px;">${statusBadge}</td>
      </tr>
      `;
    }).join('');

    const toggleButton = !isAddingInventoryItem ? `
    <button class="btn btn-sm btn-outline" onclick="TMS.Umroh.toggleAddInventoryForm(true)" style="margin-bottom:16px; font-size:11px; display:inline-flex; align-items:center; gap:6px;">
      <i data-lucide="plus-circle" style="width:14px; height:14px; color:var(--primary);"></i>
      Tambah Barang Logistik Baru
    </button>
    ` : '';

    const addFormHtml = isAddingInventoryItem ? `
    <div style="background:rgba(11,26,48,0.02); border:1px solid var(--border-color); border-radius:8px; padding:16px; margin-bottom:20px; text-align:left;">
      <div style="font-weight:800; font-size:12px; color:var(--primary); margin-bottom:12px; display:flex; align-items:center; gap:6px;">
        <i data-lucide="plus-circle" style="width:14px; height:14px;"></i>
        Tambah Barang Logistik Baru
      </div>
      <div style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap:12px; margin-bottom:12px;">
        <div class="form-group">
          <label style="font-size:10px; font-weight:700; color:var(--text-secondary); margin-bottom:4px; display:block;">Nama Barang *</label>
          <input class="form-control form-control-sm" type="text" id="new_inv_name" placeholder="Contoh: Sajadah Travel, Al-Qur'an" required>
        </div>
        <div class="form-group">
          <label style="font-size:10px; font-weight:700; color:var(--text-secondary); margin-bottom:4px; display:block;">Stok Awal *</label>
          <input class="form-control form-control-sm" type="number" id="new_inv_stock" value="100" min="0" required>
        </div>
        <div class="form-group">
          <label style="font-size:10px; font-weight:700; color:var(--text-secondary); margin-bottom:4px; display:block;">Batas Minimum *</label>
          <input class="form-control form-control-sm" type="number" id="new_inv_threshold" value="15" min="0" required>
        </div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="btn btn-sm btn-outline" style="font-size:11px;" onclick="TMS.Umroh.toggleAddInventoryForm(false)">Batal</button>
        <button class="btn btn-sm btn-primary" style="font-size:11px;" onclick="TMS.Umroh.submitNewInventoryItem()"><i data-lucide="check"></i> Simpan Barang</button>
      </div>
    </div>
    ` : '';

    return `
    <div style="padding:16px;">
      <div style="background:rgba(11,26,48,0.03); border-left:4px solid var(--primary); padding:12px; margin-bottom:20px; border-radius:4px; text-align:left;">
        <p style="margin:0; font-size:13px; color:var(--text-secondary); line-height:1.5;">
          <strong>Informasi Logistik</strong>: Level persediaan perlengkapan bawaan rombongan jemaah. Sistem akan secara otomatis memotong stok barang setiap kali perlengkapan diserahkan kepada jemaah pada formulir manifes pendaftaran, dan mengembalikannya jika dibatalkan.
        </p>
      </div>
      
      <div style="display:flex; justify-content:flex-start; align-items:center;">
        ${toggleButton}
      </div>
      
      ${addFormHtml}
      
      <table class="table" style="width:100%; border-collapse:collapse; margin-bottom:24px; text-align:center;">
        <thead>
          <tr style="background:rgba(184,158,103,0.1); border-bottom:2px solid var(--primary-light);">
            <th style="padding:10px; text-align:left;">Kode Barang</th>
            <th style="padding:10px; text-align:left;">Nama Barang</th>
            <th style="padding:10px; text-align:center; width:110px;">Stok Fisik</th>
            <th style="padding:10px; text-align:center; width:110px;">Batas Minimum</th>
            <th style="padding:10px; text-align:left;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      
      <div style="display:flex; justify-content:flex-end; gap:12px;">
        <button class="btn btn-outline" onclick="TMS.Umroh.closeForm()">Batal</button>
        <button class="btn btn-primary" onclick="TMS.Umroh.saveInventory()"><i data-lucide="save"></i> Simpan Penyesuaian</button>
      </div>
    </div>
    `;
  }

  function toggleAddInventoryForm(show) {
    isAddingInventoryItem = show;
    const modal = document.getElementById('umrohModal');
    if (modal) {
      const bodyEl = modal.querySelector('.modal-body');
      if (bodyEl) bodyEl.innerHTML = renderInventoryModalContent();
      if (window.lucide) lucide.createIcons();
    }
  }

  function submitNewInventoryItem() {
    const nameEl = document.getElementById('new_inv_name');
    const stockEl = document.getElementById('new_inv_stock');
    const thresholdEl = document.getElementById('new_inv_threshold');
    
    if (!nameEl || !nameEl.value.trim()) {
      TMS.App.toast('Nama barang tidak boleh kosong!', 'danger');
      return;
    }
    
    const name = nameEl.value.trim();
    const stock = parseInt(stockEl?.value) || 0;
    const threshold = parseInt(thresholdEl?.value) || 0;
    
    const codeSuffix = name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6);
    const code = `INV-${codeSuffix || Date.now().toString(36).toUpperCase()}`;
    
    const inventory = S.getAll('inventory') || [];
    if (inventory.find(i => i.code === code)) {
      TMS.App.toast('Barang dengan kode/nama serupa sudah terdaftar!', 'danger');
      return;
    }
    
    const newItem = {
      id: 'inv-' + Date.now().toString(36),
      code,
      name,
      stock,
      minThreshold: threshold,
      updatedAt: new Date().toISOString()
    };
    
    S.add('inventory', newItem);
    TMS.App.toast('Barang logistik baru berhasil ditambahkan!', 'success');
    
    isAddingInventoryItem = false;
    
    const modal = document.getElementById('umrohModal');
    if (modal) {
      const bodyEl = modal.querySelector('.modal-body');
      if (bodyEl) bodyEl.innerHTML = renderInventoryModalContent();
      if (window.lucide) lucide.createIcons();
    }
  }

  function saveInventory() {
    const inventory = S.getAll('inventory') || [];
    inventory.forEach(item => {
      const stockInput = document.getElementById(`inv_stock_${item.code}`);
      const thresholdInput = document.getElementById(`inv_threshold_${item.code}`);
      if (stockInput && thresholdInput) {
        const stock = parseInt(stockInput.value) || 0;
        const threshold = parseInt(thresholdInput.value) || 0;
        S.setInventoryStockAndThreshold(item.code, stock, threshold);
      }
    });
    
    TMS.App.toast('Penyesuaian stok logistik berhasil disimpan!', 'success');
    closeForm();
    
    // Refresh list view to propagate any changes if needed
    const content = document.getElementById('pageContent');
    if (content) content.innerHTML = renderList();
    if (window.lucide) lucide.createIcons();
  }

  function setActiveTab(tab) {
    activeTab = tab;
    const content = document.getElementById('pageContent');
    if (content) content.innerHTML = renderList();
    if (window.lucide) lucide.createIcons();
  }

  function showCatalogForm(id = null) {
    const modal = document.getElementById('umrohCatalogModal');
    const title = document.getElementById('umrohCatalogModalTitle');
    const body = document.getElementById('umrohCatalogModalBody');
    if (!modal || !title || !body) return;

    let data = {};
    if (id) {
      data = S.getById('master_umrohs', id);
      title.textContent = 'Ubah Master Paket Umroh';
    } else {
      title.textContent = 'Tambah Master Paket Umroh';
    }

    body.innerHTML = renderCatalogForm(data);
    modal.classList.add('active');

    generateCatalogItineraryRows(data.itinerary);
    calcCatalogMargin();
    if (window.lucide) lucide.createIcons();
  }

  function closeCatalogForm() {
    const modal = document.getElementById('umrohCatalogModal');
    if (modal) modal.classList.remove('active');
  }

  function calcCatalogMargin() {
    const cost = S.parseNumber(document.querySelector('#umrohCatalogForm [name="costPricePerPax"]')?.value) || 0;
    const margin = S.parseNumber(document.querySelector('#umrohCatalogForm [name="marginPerPax"]')?.value) || 0;
    const sell = cost + margin;

    const sellInput = document.getElementById('uc_sellingPricePerPax');
    if (sellInput) sellInput.value = S.formatInt(sell);
  }

  function generateCatalogItineraryRows(existingItinerary = null) {
    const days = parseInt(document.getElementById('catalogDaysInput')?.value) || 9;
    const container = document.getElementById('catalogItineraryContainer');
    if (!container) return;

    let html = '';
    for (let i = 1; i <= days; i++) {
      const dayData = (existingItinerary && existingItinerary.find(item => item.day === i)) || { title: '', description: '' };
      html += `
      <div class="itinerary-row" style="margin-bottom:16px; padding-bottom:16px; border-bottom:1px dashed var(--border-color);">
        <div style="font-weight:700; font-size:12px; margin-bottom:8px; color:var(--primary-light);">HARI ${i}</div>
        <div class="form-group" style="margin-bottom:8px;">
          <input class="form-control form-control-sm" name="iti_title_${i}" value="${dayData.title || ''}" placeholder="Judul aktivitas (misal: Ziarah Raudhah & Nabawi)" required>
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

    const days = parseInt(dataObj.days) || 9;
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
      S.update('master_umrohs', id, catalogData);
      TMS.App.toast('Master Paket berhasil diperbarui!', 'success');
    } else {
      catalogData.id = 'mstr_' + S.generateId();
      S.add('master_umrohs', catalogData);
      TMS.App.toast('Master Paket berhasil disimpan!', 'success');
    }

    closeCatalogForm();
    const content = document.getElementById('pageContent');
    if (content) content.innerHTML = renderList();
    if (window.lucide) lucide.createIcons();
  }

  function deleteCatalog(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus Master Paket Umroh ini?')) return;
    S.remove('master_umrohs', id);
    TMS.App.toast('Master Paket berhasil dihapus', 'warning');
    const content = document.getElementById('pageContent');
    if (content) content.innerHTML = renderList();
    if (window.lucide) lucide.createIcons();
  }

  function searchCatalog(q) {
    const catalogs = S.getAll('master_umrohs').filter(c => !q || c.packageName?.toLowerCase().includes(q.toLowerCase()) || c.bookingCode?.toLowerCase().includes(q.toLowerCase()));
    document.getElementById('umrohCatalogBody').innerHTML = renderCatalogRows(catalogs);
    if (window.lucide) lucide.createIcons();
  }

  function showCatalogDetail(id) {
    const c = S.getById('master_umrohs', id);
    if (!c) return;
    const modal = document.getElementById('umrohModal');
    modal.querySelector('.modal-title').textContent = 'Detail Master Paket Umroh';
    modal.querySelector('.modal-body').innerHTML = renderCatalogDetail(c);
    modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function copyMasterDetails(select) {
    const id = select.value;
    if (!id) return;
    const c = S.getById('master_umrohs', id);
    if (!c) return;

    const form = document.getElementById('umrohForm');
    if (!form) return;

    form.querySelector('[name="packageName"]').value = c.packageName || '';
    form.querySelector('[name="mutawwif"]').value = c.mutawwif || '';
    form.querySelector('[name="airline"]').value = c.airline || '';
    form.querySelector('[name="hotelMakkah"]').value = c.hotelMakkah || '';
    form.querySelector('[name="hotelMadinah"]').value = c.hotelMadinah || '';
    form.querySelector('[name="days"]').value = c.days || 9;
    form.querySelector('[name="inclusions"]').value = c.inclusions || '';
    const termsInput = form.querySelector('[name="terms"]');
    if (termsInput) termsInput.value = c.terms || DEFAULT_UMROH_TERMS;
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
    TMS.App.toast('Rincian disalin dari master paket: ' + c.packageName, 'success');
  }

  function renderCatalogForm(data = {}) {
    const isEdit = !!data.id;
    return `
    <form id="umrohCatalogForm" onsubmit="TMS.Umroh.saveCatalog(event)">
      <input type="hidden" name="id" value="${data.id || ''}">
      <div class="form-section-title"><i data-lucide="hash"></i> Administrasi Master</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Kode Master Paket Umroh *</label>
          <input class="form-control font-mono" name="bookingCode" required value="${data.bookingCode || ''}" placeholder="Contoh: UMR-PREM-9D">
        </div>
        <div class="form-group">
          <label class="form-label">Nama Program Paket *</label>
          <input class="form-control" name="packageName" required value="${data.packageName || ''}" placeholder="Contoh: Umroh Akbar Syawal 9 Hari">
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Pembimbing Ibadah (Mutawwif) *</label>
          <input class="form-control" name="mutawwif" required value="${data.mutawwif || ''}" placeholder="👳 Ustadz Rombongan">
        </div>
        <div class="form-group">
          <label class="form-label">Maskapai & Rute Penerbangan *</label>
          <input class="form-control" name="airline" required value="${data.airline || ''}" placeholder="✈️ Saudia Airlines (CGK - JED Direct)">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Hotel Makkah *</label>
          <input class="form-control" name="hotelMakkah" required value="${data.hotelMakkah || ''}" placeholder="🕋 Pullman Zamzam (Bintang 5)">
        </div>
        <div class="form-group">
          <label class="form-label">Hotel Madinah *</label>
          <input class="form-control" name="hotelMadinah" required value="${data.hotelMadinah || ''}" placeholder="🕌 Grand Plaza Al Madina (Bintang 4)">
        </div>
      </div>

      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">Durasi (Hari) *</label>
          <input class="form-control" type="number" name="days" id="catalogDaysInput" required min="1" value="${data.days || 9}" oninput="TMS.Umroh.generateCatalogItineraryRows()" onchange="TMS.Umroh.generateCatalogItineraryRows()">
        </div>
      </div>

      <div class="form-section-title"><i data-lucide="calendar"></i> Rencana Perjalanan (Itinerary) per Hari</div>
      <div id="catalogItineraryContainer" style="margin-bottom:24px; border:1px solid var(--border-color); border-radius:12px; padding:16px; background:var(--bg-secondary);">
        <!-- Rows generated dynamically -->
      </div>

      <div class="form-group"><label class="form-label">Fasilitas Tambahan & Inklusi Default</label>
        <textarea class="form-control" name="inclusions" rows="3" placeholder="Contoh: Manasik umroh gratis, Air zam-zam 5L, Muthawwif...">${data.inclusions || ''}</textarea>
      </div>

      <div class="form-group"><label class="form-label">Syarat & Ketentuan Default *</label>
        <textarea class="form-control" name="terms" rows="6" placeholder="Syarat & Ketentuan default paket umroh...">${data.terms || DEFAULT_UMROH_TERMS}</textarea>
      </div>

      <div class="form-section-title"><i data-lucide="dollar-sign"></i> Struktur Harga (Per Pax)</div>
      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">Harga Modal (Pax) *</label>
          <div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" name="costPricePerPax" value="${S.formatInt(data.costPricePerPax || '')}" required placeholder="0" oninput="TMS.App.formatNumberInput(this); TMS.Umroh.calcCatalogMargin()"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Margin Laba (Pax) *</label>
          <div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" id="uc_marginPerPax" name="marginPerPax" value="${S.formatInt(data.marginPerPax || '')}" required placeholder="0" oninput="TMS.App.formatNumberInput(this); TMS.Umroh.calcCatalogMargin()"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Harga Jual (Pax)</label>
          <div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" id="uc_sellingPricePerPax" name="sellingPricePerPax" value="${S.formatInt(data.sellingPricePerPax || '')}" readonly style="background:var(--bg-secondary);"></div>
        </div>
      </div>

      <div class="form-actions" style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn btn-outline" onclick="TMS.Umroh.closeCatalogForm()">Batal</button>
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
            <h3 class="mb-0" style="color:var(--primary-light);">${c.packageName}</h3>
            <div class="text-muted"><i data-lucide="palmtree"></i> Rute: ${c.airline}</div>
          </div>
          <div class="text-right">
            <span class="badge badge-info">Master Katalog Umroh</span>
            <div class="font-mono mt-1" style="font-weight:700;">${c.bookingCode || ''}</div>
          </div>
        </div>
      </div>

      <div class="form-row mb-2">
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">KEBERANGKATAN & PEMBIMBING</div>
          <div class="font-bold" style="font-size:14px;">👳 Mutawwif: ${c.mutawwif || '-'}</div>
        </div>
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">DURASI</div>
          <div class="font-bold" style="font-size:14px;">⏱️ ${c.days} Hari</div>
        </div>
      </div>

      <div class="form-row mb-2">
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">🕋 AKOMODASI MAKKAH</div>
          <div class="font-bold" style="font-size:12px;">${c.hotelMakkah}</div>
        </div>
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">🕌 AKOMODASI MADINAH</div>
          <div class="font-bold" style="font-size:12px;">${c.hotelMadinah}</div>
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
        <button class="btn btn-outline" onclick="TMS.Umroh.closeForm()">Tutup</button>
      </div>
    </div>`;
  }

  return { renderList, sortTable, showForm, closeForm, save, markPaid, delete: del, search, calcMargin, onCustomerSelect, copyCustomerToLeader, onParticipantSelect, showDetail, download, downloadQuotation, approveQuotation, generateItineraryRows, generateParticipantRows, openRoomingBuilder, renderRoomingBuilderContent, autoGenerateRooms, addCustomRoom, deleteRoom, assignJemaahToRoom, unassignJemaahFromRoom, saveRoomingList, downloadRoomingPDF, adjustInventoryOnSave, openInventoryModal, saveInventory, toggleAddInventoryForm, submitNewInventoryItem, 
    // Expose new catalog methods
    setActiveTab, renderTransactionsTab, renderCatalogTab, renderCatalogRows, showCatalogForm, closeCatalogForm, calcCatalogMargin, saveCatalog, deleteCatalog, searchCatalog, showCatalogDetail, copyMasterDetails, generateCatalogItineraryRows
  };
})();
