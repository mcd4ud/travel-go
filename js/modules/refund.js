/* ========================================
   TMS - Refund & Void Tracker Module (Multi-Type Edition)
   ======================================== */
TMS.Refund = (() => {
  const S = TMS.Store;

  function createRefundJournal(refund) {
    let originalBooking = null;
    let bType = refund.bookingType || 'flight';
    
    let originalCost = 0;
    let originalRevenue = 0;
    let bookingCode = '';
    let payAccCode = '2-2000';
    
    // Tentukan akun COA berdasarkan jenis reservasi
    let revenueAccountCode = '4-4000';
    let revenueAccountName = 'Pendapatan Tiket Pesawat';
    let cogsAccountCode = '5-5000';
    let cogsAccountName = 'BPP Tiket Pesawat';

    if (bType === 'flight') {
      originalBooking = S.getById('flights', refund.bookingId);
      if (originalBooking) {
        originalCost = originalBooking.costPrice || 0;
        originalRevenue = originalBooking.sellingPrice || 0;
        bookingCode = originalBooking.bookingCode;
        payAccCode = originalBooking.paymentAccount || '2-2000';
      }
    } else if (bType === 'hotel') {
      originalBooking = S.getById('hotels', refund.bookingId);
      if (originalBooking) {
        originalCost = originalBooking.costPrice || 0;
        originalRevenue = originalBooking.sellingPrice || 0;
        bookingCode = originalBooking.bookingCode;
        payAccCode = originalBooking.paymentAccount || '2-2000';
      }
      revenueAccountCode = '4-4100';
      revenueAccountName = 'Pendapatan Voucher Hotel';
      cogsAccountCode = '5-5100';
      cogsAccountName = 'BPP Voucher Hotel';
    } else if (bType === 'rental') {
      originalBooking = S.getById('rentals', refund.bookingId);
      if (originalBooking) {
        originalCost = originalBooking.costPrice || 0;
        originalRevenue = originalBooking.sellingPrice || 0;
        bookingCode = originalBooking.bookingCode;
        payAccCode = originalBooking.paymentAccount || '2-2000';
      }
      revenueAccountCode = '4-4200';
      revenueAccountName = 'Pendapatan Rental Mobil';
      cogsAccountCode = '5-5200';
      cogsAccountName = 'BPP Rental Mobil';
    }

    if (!originalBooking) return null;
    const payAccName = S.getCOAByCode(payAccCode)?.name || 'Utang Usaha';
    
    const bankCode = refund.bankAccount || '1-1001';
    const bankName = S.getCOAByCode(bankCode)?.name || 'Bank';

    const journal = {
      journalNumber: S.generateCode('journal'),
      date: refund.processDate || new Date().toISOString().split('T')[0],
      description: `Penyelesaian Refund ${bType.toUpperCase()} - ${bookingCode} - RFD: ${refund.refundCode}`,
      reference: refund.refundCode,
      type: `${bType}_refund`,
      entries: [
        // 1. Penerimaan Refund dari Vendor (Cost)
        { accountCode: bankCode, accountName: bankName, debit: refund.refundCost, credit: 0 },
        { accountCode: cogsAccountCode, accountName: cogsAccountName, debit: refund.cancellationFee, credit: 0 },
        { accountCode: payAccCode, accountName: payAccName, debit: 0, credit: originalCost },

        // 2. Pengembalian Dana Bersih ke Pelanggan & Keuntungan Biaya Jasa Admin
        { accountCode: '1-1100', accountName: 'Piutang Usaha', debit: originalRevenue, credit: 0 },
        { accountCode: bankCode, accountName: bankName, debit: 0, credit: refund.refundCustomer },
        { accountCode: '4-4400', accountName: 'Pendapatan Lain-lain', debit: 0, credit: refund.adminFee }
      ]
    };

    S.add('journals', journal);
    S.recalculateCOA();
    return journal;
  }

  function renderList() {
    const refunds = S.getAll('refunds');
    return `
    <div class="fade-in">
      <div class="toolbar">
        <div class="search-box">
          <i data-lucide="search"></i>
          <input type="text" id="refundSearch" placeholder="Cari kode booking, nama, maskapai, hotel..." oninput="TMS.Refund.search(this.value)">
        </div>
        <div class="btn-group">
          <button class="btn btn-primary" onclick="TMS.Refund.showForm()"><i data-lucide="plus"></i> Ajukan Refund / Void</button>
        </div>
      </div>
      
      <div class="card">
        <div class="table-container">
          <table id="refundTable">
            <thead>
              <tr>
                <th>Kode Refund</th>
                <th>Tipe</th>
                <th>Kode Booking</th>
                <th>Penumpang / Tamu</th>
                <th>Tgl Pengajuan</th>
                <th>Detail Reservasi</th>
                <th>Pengembalian Vendor</th>
                <th>Pengembalian Pelanggan</th>
                <th>Admin Agen</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody id="refundBody">${renderRows(refunds)}</tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Form Refund -->
    <div class="modal-overlay" id="refundModal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <span class="modal-title" id="refundModalTitle">Ajukan Refund / Void</span>
          <button class="modal-close" onclick="TMS.Refund.closeForm()">✕</button>
        </div>
        <div class="modal-body" id="refundModalBody">${renderForm()}</div>
      </div>
    </div>`;
  }

  function renderRows(refunds) {
    if (!refunds.length) {
      return `<tr><td colspan="11" class="table-empty"><i data-lucide="rotate-ccw" style="width:32px;height:32px;display:block;margin:0 auto 8px;opacity:.3;"></i>Belum ada pengajuan refund / void</td></tr>`;
    }

    return refunds.map(r => {
      let statusBadge = '';
      if (r.status === 'pending_gds') {
        statusBadge = '<span class="badge badge-danger badge-dot">Pending GDS</span>';
      } else if (r.status === 'approved') {
        statusBadge = '<span class="badge badge-outline badge-dot" style="color:var(--primary-light);border-color:var(--primary-light);">Approved</span>';
      } else if (r.status === 'paid_to_agent') {
        statusBadge = '<span class="badge badge-success badge-dot">Paid to Agent</span>';
      } else if (r.status === 'refunded_to_customer') {
        statusBadge = '<span class="badge badge-success" style="background:var(--success);color:#fff;border-radius:12px;padding:2px 8px;font-weight:700;">Lunas (Refunded)</span>';
      }

      let typeIcon = 'plane';
      let typeText = 'Pesawat';
      if (r.bookingType === 'hotel') {
        typeIcon = 'hotel';
        typeText = 'Hotel';
      } else if (r.bookingType === 'rental') {
        typeIcon = 'car';
        typeText = 'Rental';
      }

      return `<tr>
        <td><strong class="text-primary font-mono">${r.refundCode}</strong></td>
        <td>
          <span class="badge badge-outline flex-inline align-items-center gap-1" style="font-size:10px;text-transform:uppercase;">
            <i data-lucide="${typeIcon}" style="width:10px;height:10px;"></i> ${typeText}
          </span>
        </td>
        <td><strong class="font-mono text-muted">${r.bookingCode}</strong></td>
        <td><strong>${r.passengerName}</strong></td>
        <td>${S.formatDate(r.requestDate)}</td>
        <td><span style="font-size:12px;font-weight:600;">${r.airline}</span><br><span class="text-muted" style="font-size:11px;">${r.route}</span></td>
        <td>
          <span style="font-size:12px;color:var(--text-muted);">Modal: ${S.formatCurrency(r.costPrice)}</span><br>
          <span class="amount-positive" style="font-weight:700;">Est. Ref: ${S.formatCurrency(r.refundCost)}</span>
        </td>
        <td>
          <span style="font-size:12px;color:var(--text-muted);">Jual: ${S.formatCurrency(r.sellingPrice)}</span><br>
          <strong class="text-primary" style="font-weight:700;">Est. Ref: ${S.formatCurrency(r.refundCustomer)}</strong>
        </td>
        <td><strong class="amount-positive">${S.formatCurrency(r.adminFee)}</strong></td>
        <td>${statusBadge}</td>
        <td>
          <div class="btn-group">
            <button class="btn btn-sm btn-outline" onclick="TMS.Refund.showDetail('${r.id}')" title="Detail"><i data-lucide="eye"></i></button>
            ${r.status !== 'refunded_to_customer' ? `<button class="btn btn-sm btn-success" onclick="TMS.Refund.openStatusModal('${r.id}')" title="Proses / Update Status"><i data-lucide="check-circle"></i></button>` : ''}
            <button class="btn btn-sm btn-danger" onclick="TMS.Refund.delete('${r.id}')" title="Hapus"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function renderForm(selectedType = 'flight') {
    const generatedCode = S.generateCode('refund');
    
    let bookings = [];
    if (selectedType === 'flight') {
      bookings = S.getAll('flights');
    } else if (selectedType === 'hotel') {
      bookings = S.getAll('hotels');
    } else if (selectedType === 'rental') {
      bookings = S.getAll('rentals');
    }

    // Filter out already refunded completed
    bookings = bookings.filter(b => {
      const existing = S.getAll('refunds').find(r => r.bookingId === b.id && r.status === 'refunded_to_customer');
      return !existing;
    });

    return `
    <form id="refundForm" onsubmit="TMS.Refund.save(event)">
      <div class="form-section-title"><i data-lucide="hash"></i> Administrasi Refund</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Kode Refund</label>
          <input class="form-control font-mono" name="refundCode" value="${generatedCode}" readonly style="background:var(--bg-secondary);">
        </div>
        <div class="form-group">
          <label class="form-label">Tanggal Pengajuan *</label>
          <input class="form-control" type="date" name="requestDate" value="${new Date().toISOString().split('T')[0]}" required>
        </div>
      </div>

      <div class="form-section-title"><i data-lucide="layers"></i> Tipe & Reservasi Asli</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tipe Reservasi *</label>
          <select class="form-control" name="bookingType" id="ref_typeSelect" required onchange="TMS.Refund.onTypeSelect(this.value)">
            <option value="flight" ${selectedType === 'flight' ? 'selected' : ''}>✈ Tiket Pesawat</option>
            <option value="hotel" ${selectedType === 'hotel' ? 'selected' : ''}>🏨 Voucher Hotel</option>
            <option value="rental" ${selectedType === 'rental' ? 'selected' : ''}>🚗 Voucher Rental Mobil</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Pilih Transaksi Aktif *</label>
          <select class="form-control font-mono" name="bookingId" id="ref_bookingSelect" required onchange="TMS.Refund.onBookingSelect(this)">
            <option value="">-- Pilih Transaksi --</option>
            ${bookings.map(b => {
              if (selectedType === 'flight') {
                return `<option value="${b.id}">${b.bookingCode} — ${b.passengerName} (${b.airline} ${b.departureCity}➔${b.arrivalCity})</option>`;
              } else if (selectedType === 'hotel') {
                return `<option value="${b.id}">${b.bookingCode} — ${b.guestName} (${b.hotelName} - ${b.roomType})</option>`;
              } else if (selectedType === 'rental') {
                return `<option value="${b.id}">${b.bookingCode} — ${b.renterName} (${b.vehicleName} - ${b.licensePlate})</option>`;
              }
            }).join('')}
          </select>
        </div>
      </div>

      <div class="card p-1 mb-2" style="background:var(--bg-secondary); border:1px solid var(--border-color);">
        <div style="font-size:11px;font-weight:700;color:var(--primary-light);margin-bottom:8px;text-transform:uppercase;">Data Asli Transaksi</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Harga Modal Asli</label>
            <div class="form-control text-muted" id="ref_origCostDisplay">Rp 0</div>
            <input type="hidden" name="costPrice" id="ref_costPriceInput">
          </div>
          <div class="form-group">
            <label class="form-label">Harga Jual Asli</label>
            <div class="form-control text-muted" id="ref_origSellDisplay">Rp 0</div>
            <input type="hidden" name="sellingPrice" id="ref_sellingPriceInput">
          </div>
        </div>
      </div>

      <div class="form-section-title"><i data-lucide="dollar-sign"></i> Kriteria Pengembalian (Refund)</div>
      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">Potongan Vendor (Cancel Fee) *</label>
          <div class="input-group">
            <span class="input-prefix">Rp</span>
            <input class="form-control" type="number" name="cancellationFee" id="ref_cancelInput" value="0" required oninput="TMS.Refund.recalc()">
          </div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Biaya denda potong dari maskapai/hotel/rental</div>
        </div>
        <div class="form-group">
          <label class="form-label">Biaya Admin Jasa Agen *</label>
          <div class="input-group">
            <span class="input-prefix">Rp</span>
            <input class="form-control" type="number" name="adminFee" id="ref_adminInput" value="50000" required oninput="TMS.Refund.recalc()">
          </div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Biaya administrasi keuntungan agen travel</div>
        </div>
        <div class="form-group">
          <label class="form-label">Akun Pembayaran Kas/Bank *</label>
          <select class="form-control" name="bankAccount" required>
            ${S.getCOA().filter(a => a.type === 'asset' && (a.code.startsWith('1-10') || a.code.startsWith('1-13'))).sort((a, b) => a.code.localeCompare(b.code)).map(a => `<option value="${a.code}">${a.code} - ${a.name}</option>`).join('')}
          </select>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Akun kas/bank untuk mutasi pengembalian</div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" style="font-weight:700;">Estimasi Pengembalian Vendor (Kredit)</label>
          <div class="form-control amount-positive font-bold" id="ref_estVendorDisplay" style="font-size:16px;">Rp 0</div>
          <input type="hidden" name="refundCost" id="ref_refundCostInput">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight:700;color:var(--primary-light);">Estimasi Kembalikan ke Pelanggan</label>
          <div class="form-control font-bold" id="ref_estCustomerDisplay" style="font-size:16px;background:rgba(7,112,227,0.04);border:1px solid var(--primary-light);color:var(--primary-light);">Rp 0</div>
          <input type="hidden" name="refundCustomer" id="ref_refundCustomerInput">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Alasan / Catatan Pembatalan</label>
        <input class="form-control" name="reason" placeholder="Contoh: Permintaan pelanggan / kendala force majeure / kesalahan jadwal" required>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="TMS.Refund.closeForm()">Batal</button>
        <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Ajukan Pengajuan Refund</button>
      </div>
    </form>`;
  }

  function showForm() {
    document.getElementById('refundModalTitle').textContent = 'Ajukan Refund / Void';
    document.getElementById('refundModalBody').innerHTML = renderForm();
    document.getElementById('refundModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function closeForm() {
    document.getElementById('refundModal').classList.remove('active');
  }

  function onTypeSelect(type) {
    let bookings = [];
    if (type === 'flight') {
      bookings = S.getAll('flights');
    } else if (type === 'hotel') {
      bookings = S.getAll('hotels');
    } else if (type === 'rental') {
      bookings = S.getAll('rentals');
    }

    bookings = bookings.filter(b => {
      const existing = S.getAll('refunds').find(r => r.bookingId === b.id && r.status === 'refunded_to_customer');
      return !existing;
    });

    const select = document.getElementById('ref_bookingSelect');
    if (select) {
      let html = `<option value="">-- Pilih Transaksi --</option>`;
      bookings.forEach(b => {
        if (type === 'flight') {
          html += `<option value="${b.id}">${b.bookingCode} — ${b.passengerName} (${b.airline} ${b.departureCity}➔${b.arrivalCity})</option>`;
        } else if (type === 'hotel') {
          html += `<option value="${b.id}">${b.bookingCode} — ${b.guestName} (${b.hotelName} - ${b.roomType})</option>`;
        } else if (type === 'rental') {
          html += `<option value="${b.id}">${b.bookingCode} — ${b.renterName} (${b.vehicleName} - ${b.licensePlate})</option>`;
        }
      });
      select.innerHTML = html;
    }
    resetCalculations();
  }

  function onBookingSelect(sel) {
    const id = sel.value;
    const type = document.getElementById('ref_typeSelect').value;
    
    if (!id || !type) {
      resetCalculations();
      return;
    }

    let b = null;
    if (type === 'flight') b = S.getById('flights', id);
    else if (type === 'hotel') b = S.getById('hotels', id);
    else if (type === 'rental') b = S.getById('rentals', id);

    if (!b) return;

    document.getElementById('ref_origCostDisplay').textContent = S.formatCurrency(b.costPrice);
    document.getElementById('ref_origSellDisplay').textContent = S.formatCurrency(b.sellingPrice);
    document.getElementById('ref_costPriceInput').value = b.costPrice || 0;
    document.getElementById('ref_sellingPriceInput').value = b.sellingPrice || 0;

    recalc();
  }

  function recalc() {
    const cost = parseFloat(document.getElementById('ref_costPriceInput').value) || 0;
    const sell = parseFloat(document.getElementById('ref_sellingPriceInput').value) || 0;
    const cancel = parseFloat(document.getElementById('ref_cancelInput').value) || 0;
    const admin = parseFloat(document.getElementById('ref_adminInput').value) || 0;

    const refundVendor = Math.max(0, cost - cancel);
    const refundCustomer = Math.max(0, sell - cancel - admin);

    document.getElementById('ref_estVendorDisplay').textContent = S.formatCurrency(refundVendor);
    document.getElementById('ref_estCustomerDisplay').textContent = S.formatCurrency(refundCustomer);

    document.getElementById('ref_refundCostInput').value = refundVendor;
    document.getElementById('ref_refundCustomerInput').value = refundCustomer;
  }

  function resetCalculations() {
    document.getElementById('ref_origCostDisplay').textContent = 'Rp 0';
    document.getElementById('ref_origSellDisplay').textContent = 'Rp 0';
    document.getElementById('ref_costPriceInput').value = 0;
    document.getElementById('ref_sellingPriceInput').value = 0;
    document.getElementById('ref_estVendorDisplay').textContent = 'Rp 0';
    document.getElementById('ref_estCustomerDisplay').textContent = 'Rp 0';
    document.getElementById('ref_refundCostInput').value = 0;
    document.getElementById('ref_refundCustomerInput').value = 0;
  }

  function save(e) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const r = Object.fromEntries(fd.entries());

    const type = r.bookingType;
    let booking = null;
    
    if (type === 'flight') booking = S.getById('flights', r.bookingId);
    else if (type === 'hotel') booking = S.getById('hotels', r.bookingId);
    else if (type === 'rental') booking = S.getById('rentals', r.bookingId);

    if (!booking) return;

    r.bookingCode = booking.bookingCode;
    r.passengerName = booking.passengerName || booking.guestName || booking.renterName || '';
    r.status = 'pending_gds';

    if (type === 'flight') {
      r.airline = booking.airline;
      r.route = `${booking.departureCity} → ${booking.arrivalCity}`;
    } else if (type === 'hotel') {
      r.airline = booking.hotelName;
      r.route = `${booking.roomType} (${booking.nights} malam)`;
    } else if (type === 'rental') {
      r.airline = booking.vehicleName;
      r.route = `${booking.vehicleType} (${booking.days} hari) • ${booking.licensePlate || '-'}`;
    }

    // Parsing number fields
    r.costPrice = parseFloat(r.costPrice) || 0;
    r.sellingPrice = parseFloat(r.sellingPrice) || 0;
    r.cancellationFee = parseFloat(r.cancellationFee) || 0;
    r.adminFee = parseFloat(r.adminFee) || 0;
    r.refundCost = parseFloat(r.refundCost) || 0;
    r.refundCustomer = parseFloat(r.refundCustomer) || 0;

    S.add('refunds', r);
    closeForm();
    TMS.App.navigate('refunds');
    TMS.App.toast('Pengajuan refund berhasil didaftarkan!', 'success');
  }

  function openStatusModal(id) {
    const r = S.getById('refunds', id);
    if (!r) return;

    document.getElementById('refundModalTitle').textContent = 'Update Status Refund';
    document.getElementById('refundModalBody').innerHTML = `
      <div style="padding: 10px 0;">
        <p style="margin-bottom: 15px;">Pilih status terbaru untuk pengajuan refund <strong>${r.refundCode}</strong> (${r.passengerName}):</p>
        <div class="form-group">
          <label class="form-label">Status Terbaru</label>
          <select class="form-control" id="ref_newStatusSelect">
            <option value="pending_gds" ${r.status === 'pending_gds' ? 'selected' : ''}>Pending GDS (Menunggu persetujuan vendor)</option>
            <option value="approved" ${r.status === 'approved' ? 'selected' : ''}>Approved by Vendor (Disetujui Vendor/Hotel/Rental)</option>
            <option value="paid_to_agent" ${r.status === 'paid_to_agent' ? 'selected' : ''}>Paid to Agent (Uang cair ke rekening agen)</option>
            <option value="refunded_to_customer" ${r.status === 'refunded_to_customer' ? 'selected' : ''}>Refunded & Completed (Dana cair ke pelanggan & Posting Jurnal)</option>
          </select>
        </div>
        <div style="font-size:12px;color:var(--text-muted);background:var(--bg-secondary);padding:10px;border-radius:8px;border:1px solid var(--border-color);margin-top:15px;line-height:1.4;">
          ⚠️ <strong>Catatan Akuntansi:</strong> Status <em>Refunded & Completed</em> akan memposting transaksi penyesuaian dana kas, utang usaha vendor, piutang usaha pelanggan, dan pendapatan biaya jasa admin secara otomatis ke Jurnal Umum Akuntansi.
        </div>
        <div class="form-actions mt-3">
          <button class="btn btn-outline" onclick="TMS.Refund.closeForm()">Tutup</button>
          <button class="btn btn-primary" onclick="TMS.Refund.updateStatus('${r.id}')"><i data-lucide="check"></i> Simpan Status</button>
        </div>
      </div>
    `;
    document.getElementById('refundModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function updateStatus(id) {
    const newStatus = document.getElementById('ref_newStatusSelect').value;
    const r = S.getById('refunds', id);
    if (!r) return;

    const updates = { status: newStatus };
    if (newStatus === 'refunded_to_customer') {
      updates.processDate = new Date().toISOString().split('T')[0];
    }

    S.update('refunds', id, updates);

    if (newStatus === 'refunded_to_customer') {
      createRefundJournal({ ...r, ...updates });
    }

    closeForm();
    TMS.App.navigate('refunds');
    TMS.App.toast('Status pengajuan refund diperbarui!', 'success');
  }

  function showDetail(id) {
    const r = S.getById('refunds', id);
    if (!r) return;

    let statusText = '';
    if (r.status === 'pending_gds') statusText = 'Pending Vendor';
    else if (r.status === 'approved') statusText = 'Approved by Vendor';
    else if (r.status === 'paid_to_agent') statusText = 'Paid to Agent';
    else if (r.status === 'refunded_to_customer') statusText = 'Refunded & Completed';

    let typeText = 'Penerbangan';
    let paxLabel = 'Nama Penumpang';
    let detailLabel = 'Maskapai / Detail';
    if (r.bookingType === 'hotel') {
      typeText = 'Hotel';
      paxLabel = 'Nama Tamu Utama';
      detailLabel = 'Nama Hotel';
    } else if (r.bookingType === 'rental') {
      typeText = 'Rental Mobil';
      paxLabel = 'Nama Penyewa';
      detailLabel = 'Kendaraan';
    }

    document.getElementById('refundModalTitle').textContent = 'Detail Pengajuan Refund';
    document.getElementById('refundModalBody').innerHTML = `
      <div class="detail-view">
        <div class="detail-header mb-2" style="border-bottom:1px solid var(--border-color);padding-bottom:1rem;">
          <div class="flex-between">
            <div>
              <h3 class="mb-0" style="color:var(--primary-light);">${r.refundCode}</h3>
              <div class="text-muted">Kode Booking: <strong>${r.bookingCode}</strong> - ${typeText}</div>
            </div>
            <div class="text-right">
              <span class="badge ${r.status === 'refunded_to_customer' ? 'badge-success' : 'badge-danger'}">${statusText.toUpperCase()}</span>
              <div class="text-muted mt-1" style="font-size:11px;">Tgl Pengajuan: ${S.formatDate(r.requestDate)}</div>
            </div>
          </div>
        </div>

        <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="user" style="width:14px;height:14px;vertical-align:middle;"></i> DETAIL RESERVASI & PELANGGAN</div>
        <div class="card mb-2 p-1" style="background:var(--bg-secondary);">
          <div class="flex-between mb-1"><span>${paxLabel}</span><strong>${r.passengerName}</strong></div>
          <div class="flex-between mb-1"><span>${detailLabel}</span><strong>${r.airline}</strong></div>
          <div class="flex-between mb-1"><span>Keterangan / Rincian</span><strong>${r.route}</strong></div>
          <div class="flex-between mb-1"><span>Alasan Pembatalan</span><strong>${r.reason || '-'}</strong></div>
          ${r.processDate ? `<div class="flex-between"><span>Tanggal Selesai</span><strong>${S.formatDate(r.processDate)}</strong></div>` : ''}
        </div>

        <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="dollar-sign" style="width:14px;height:14px;vertical-align:middle;"></i> DETAIL PENYESUAIAN KEUANGAN</div>
        <div class="card p-1" style="background:var(--bg-secondary);">
          <div class="flex-between mb-1"><span>Harga Modal Asli</span><span class="font-mono">${S.formatCurrency(r.costPrice)}</span></div>
          <div class="flex-between mb-1"><span>Potongan Vendor (Denda)</span><span class="font-mono text-danger" style="font-weight:600;">-${S.formatCurrency(r.cancellationFee)}</span></div>
          <div class="flex-between mb-1" style="border-bottom:1px dashed var(--border-color);padding-bottom:6px;margin-bottom:6px;">
            <span><strong>Bersih dari Vendor</strong></span>
            <span class="font-mono text-success" style="font-weight:700;">${S.formatCurrency(r.refundCost)}</span>
          </div>
          
          <div class="flex-between mb-1"><span>Harga Jual Asli</span><span class="font-mono">${S.formatCurrency(r.sellingPrice)}</span></div>
          <div class="flex-between mb-1"><span>Jasa Keuntungan Agen (Admin Fee)</span><span class="font-mono text-success" style="font-weight:600;">+${S.formatCurrency(r.adminFee)}</span></div>
          <div class="flex-between" style="border-top:1px solid var(--border-color);padding-top:6px;margin-top:6px;">
            <span><strong>Dana Dikembalikan ke Pelanggan</strong></span>
            <span class="font-mono text-primary" style="font-weight:800;font-size:15px;">${S.formatCurrency(r.refundCustomer)}</span>
          </div>
        </div>

        <div class="form-actions mt-2">
          <button class="btn btn-outline" onclick="TMS.Refund.closeForm()">Tutup</button>
        </div>
      </div>
    `;
    document.getElementById('refundModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function del(id) {
    if (!confirm('Batalkan pengajuan refund ini?')) return;
    
    const r = S.getById('refunds', id);
    if (r && r.status === 'refunded_to_customer') {
      const journals = S.getAll('journals');
      journals.forEach(j => {
        if (j.reference === r.refundCode) S.remove('journals', j.id);
      });
      S.recalculateCOA();
    }

    S.remove('refunds', id);
    TMS.App.navigate('refunds');
    TMS.App.toast('Pengajuan refund dibatalkan dan dihapus!', 'warning');
  }

  function search(q) {
    const refunds = S.getAll('refunds').filter(r => {
      return !q || 
        r.refundCode?.toLowerCase().includes(q.toLowerCase()) || 
        r.bookingCode?.toLowerCase().includes(q.toLowerCase()) || 
        r.passengerName?.toLowerCase().includes(q.toLowerCase()) ||
        r.airline?.toLowerCase().includes(q.toLowerCase()) ||
        r.bookingType?.toLowerCase().includes(q.toLowerCase());
    });
    document.getElementById('refundBody').innerHTML = renderRows(refunds);
    if (window.lucide) lucide.createIcons();
  }

  // Quick link dari modul flight.js, hotel.js, rental.js
  function launchRefund(bookingId, bookingType = 'flight') {
    TMS.App.navigate('refunds');
    setTimeout(() => {
      document.getElementById('refundModalTitle').textContent = 'Ajukan Refund / Void';
      document.getElementById('refundModalBody').innerHTML = renderForm(bookingType);
      document.getElementById('refundModal').classList.add('active');
      
      const typeSelect = document.getElementById('ref_typeSelect');
      if (typeSelect) {
        typeSelect.value = bookingType;
      }
      
      const select = document.getElementById('ref_bookingSelect');
      if (select) {
        select.value = bookingId;
        onBookingSelect(select);
      }
      
      if (window.lucide) lucide.createIcons();
    }, 150);
  }

  return { 
    renderList, 
    showForm, 
    closeForm, 
    onTypeSelect,
    onBookingSelect, 
    recalc, 
    save, 
    openStatusModal, 
    updateStatus, 
    showDetail, 
    delete: del, 
    search, 
    launchRefund 
  };
})();
