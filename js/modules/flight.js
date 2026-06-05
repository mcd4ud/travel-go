/* ========================================
   TMS - Flight E-Ticket Module
   ======================================== */
TMS.Flight = (() => {
  const S = TMS.Store;

  function createJournal(booking) {
    const revenue = booking.sellingPrice || 0;
    const cost = booking.costPrice || 0;
    const payAccCode = booking.paymentAccount || '2-2000';
    const payAccName = S.getCOAByCode(payAccCode)?.name || 'Utang Usaha';

    const journal = {
      journalNumber: S.generateCode('journal'),
      date: booking.transactionDate || booking.departureDate || new Date().toISOString().split('T')[0],
      description: `Penjualan Tiket - ${booking.bookingCode} - ${booking.passengerName}`,
      reference: booking.bookingCode,
      type: 'flight_sale',
      entries: [
        { accountCode: '1-1100', accountName: 'Piutang Usaha', debit: revenue, credit: 0 },
        { accountCode: '4-4000', accountName: 'Pendapatan Tiket Pesawat', debit: 0, credit: revenue },
        { accountCode: '5-5000', accountName: 'BPP Tiket Pesawat', debit: cost, credit: 0 },
        { accountCode: payAccCode, accountName: payAccName, debit: 0, credit: cost },
      ]
    };
    S.add('journals', journal);
    S.recalculateCOA();
    return journal;
  }

  function createInvoice(booking) {
    const s = S.getSettings();
    const subtotal = booking.sellingPrice || 0;
    const taxRate = s.taxEnabled ? (s.taxRate || 0) : 0;
    const tax = Math.round(subtotal * taxRate / 100);
    const total = subtotal + tax;
    const paxCount = booking.passengers?.length || 1;
    const paxDetails = (booking.passengers || []).map(p => `${p.name} (${p.category || 'Adult'})`).join(', ');

    let items = [];

    if (booking.tripType === 'round') {
      const sellDep = booking.sellingPriceDep || 0;
      const sellRet = booking.sellingPriceRet || 0;
      const unitPriceDep = Math.round(sellDep / paxCount);
      const unitPriceRet = Math.round(sellRet / paxCount);

      items = [
        {
          description: `✈ [PERGI] ${booking.airline} ${booking.flightNumber} — ${booking.departureCity} → ${booking.arrivalCity} (${booking.seatClass})\nTgl: ${booking.departureDate}${booking.departureTime ? ' ' + booking.departureTime : ''} | Penumpang: ${paxDetails}`,
          qty: paxCount,
          unitPrice: unitPriceDep,
          total: sellDep
        },
        {
          description: `✈ [PULANG] ${booking.returnAirline} ${booking.returnFlightNumber} — ${booking.arrivalCity} → ${booking.departureCity} (${booking.returnSeatClass})\nTgl: ${booking.returnDepartureDate}${booking.returnDepartureTime ? ' ' + booking.returnDepartureTime : ''}`,
          qty: paxCount,
          unitPrice: unitPriceRet,
          total: sellRet
        }
      ];
    } else {
      const unitPrice = Math.round(subtotal / paxCount);
      items = [{
        description: `✈ ${booking.airline} ${booking.flightNumber} — ${booking.departureCity} → ${booking.arrivalCity} (${booking.seatClass})\nTgl: ${booking.departureDate}${booking.departureTime ? ' ' + booking.departureTime : ''} | Penumpang: ${paxDetails}`,
        qty: paxCount,
        unitPrice: unitPrice,
        total: subtotal
      }];
    }

    const invoice = {
      invoiceNumber: S.generateCode('invoice'),
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      bookingType: 'flight',
      tripType: booking.tripType || 'oneway',
      customerName: booking.customerName || booking.passengerName,
      customerEmail: booking.customerEmail || booking.passengerEmail,
      items,
      subtotal, taxRate, tax, total,
      paymentStatus: 'unpaid',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      createdAt: booking.transactionDate || new Date().toISOString()
    };
    S.add('invoices', invoice);
    return invoice;
  }

  let currentSort = { col: '', asc: true };

  function getSortedFlights(dataList) {
    if (!currentSort.col) return dataList;
    return dataList.sort((a, b) => {
      let valA, valB;
      switch(currentSort.col) {
        case 'bookingCode': valA = (a.bookingCode||'').toLowerCase(); valB = (b.bookingCode||'').toLowerCase(); break;
        case 'passengerName': valA = (a.passengerName||'').toLowerCase(); valB = (b.passengerName||'').toLowerCase(); break;
        case 'route': valA = (a.departureCity||'').toLowerCase(); valB = (b.departureCity||'').toLowerCase(); break;
        case 'airline': valA = (a.airline||'').toLowerCase(); valB = (b.airline||'').toLowerCase(); break;
        case 'date': valA = a.departureDate||''; valB = b.departureDate||''; break;
        case 'sellingPrice': valA = a.sellingPrice || 0; valB = b.sellingPrice || 0; break;
        case 'costPrice': valA = a.costPrice || 0; valB = b.costPrice || 0; break;
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
    
    const searchInp = document.getElementById('flightSearch');
    if (searchInp && searchInp.value) search(searchInp.value);
    
    if (window.lucide) lucide.createIcons();
  }

  function renderList() {
    const flights = getSortedFlights(S.getAll('flights'));
    const getSortIcon = (col) => currentSort.col === col ? (currentSort.asc ? ' &uarr;' : ' &darr;') : '';

    return `
    <div class="fade-in">
      <div class="toolbar">
        <div class="search-box"><i data-lucide="search"></i><input type="text" id="flightSearch" placeholder="Cari nama pelanggan, kode booking..." oninput="TMS.Flight.search(this.value)"></div>
        <div class="btn-group">
          <button class="btn btn-secondary" onclick="TMS.Excel.triggerImport('flights')"><i data-lucide="upload"></i> Import</button>
          <button class="btn btn-secondary" onclick="TMS.Excel.exportData('flights')"><i data-lucide="download"></i> Export</button>
          <button class="btn btn-primary" onclick="TMS.Flight.showForm()"><i data-lucide="plus"></i> Buat E-Tiket</button>
        </div>
      </div>
      <div class="card">
        <div class="table-container">
          <table id="flightTable" class="table-sortable">
            <thead><tr>
              <th style="cursor:pointer;" onclick="TMS.Flight.sortTable('transactionDate')">Tgl Transaksi${getSortIcon('transactionDate')}</th>
              <th style="cursor:pointer;" onclick="TMS.Flight.sortTable('bookingCode')">Kode Booking${getSortIcon('bookingCode')}</th>
              <th style="cursor:pointer;" onclick="TMS.Flight.sortTable('passengerName')">Pelanggan${getSortIcon('passengerName')}</th>
              <th style="cursor:pointer;" onclick="TMS.Flight.sortTable('route')">Rute${getSortIcon('route')}</th>
              <th style="cursor:pointer;" onclick="TMS.Flight.sortTable('airline')">Maskapai${getSortIcon('airline')}</th>
              <th style="cursor:pointer;" onclick="TMS.Flight.sortTable('date')">Tgl Berangkat${getSortIcon('date')}</th>
              <th style="cursor:pointer;" onclick="TMS.Flight.sortTable('sellingPrice')">Harga Jual${getSortIcon('sellingPrice')}</th>
              <th style="cursor:pointer;" onclick="TMS.Flight.sortTable('costPrice')">Harga Modal${getSortIcon('costPrice')}</th>
              <th style="cursor:pointer;" onclick="TMS.Flight.sortTable('margin')">Margin${getSortIcon('margin')}</th>
              <th style="cursor:pointer;" onclick="TMS.Flight.sortTable('status')">Status${getSortIcon('status')}</th>
              <th>Aksi</th>
            </tr></thead>
            <tbody id="flightBody">${renderRows(flights)}</tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="modal-overlay" id="flightModal">
      <div class="modal modal-full">
        <div class="modal-header">
          <span class="modal-title" id="flightModalTitle">Buat E-Tiket Pesawat</span>
          <button class="modal-close" onclick="TMS.Flight.closeForm()">✕</button>
        </div>
        <div class="modal-body" id="flightModalBody">${renderForm()}</div>
      </div>
    </div>`;
  }

  function renderRows(flights) {
    if (!flights.length) return `<tr><td colspan="10" class="table-empty"><i data-lucide="plane" style="width:32px;height:32px;display:block;margin:0 auto 8px;opacity:.3;"></i>Belum ada e-tiket</td></tr>`;
    return flights.map(f => {
      const margin = (f.sellingPrice || 0) - (f.costPrice || 0);
      const tripType = f.tripType === 'round' ? '<span class="badge badge-outline">Round Trip</span>' : '<span class="badge badge-outline">One Way</span>';
      return `<tr>
        <td>${S.formatDate(f.transactionDate || f.createdAt)}</td>
        <td><span class="font-mono text-primary">${f.bookingCode}</span><br>${tripType}</td>
        <td><strong>${f.passengerName}</strong><br><span class="text-muted" style="font-size:11px;">${f.passengerEmail||''}</span></td>
        <td>${f.departureCity} ${f.tripType === 'round' ? '⇄' : '→'} ${f.arrivalCity}</td>
        <td>${f.airline} <span class="text-muted">${f.flightNumber}</span>${f.tripType === 'round' ? `<br><span class="text-muted" style="font-size:11px;">${f.returnAirline} ${f.returnFlightNumber}</span>` : ''}</td>
        <td>${S.formatDate(f.departureDate)}</td>
        <td><strong>${S.formatCurrency(f.sellingPrice)}</strong></td>
        <td class="text-muted">${S.formatCurrency(f.costPrice)}</td>
        <td class="${margin >= 0 ? 'amount-positive' : 'amount-negative'}">${S.formatCurrency(margin)}</td>
        <td>${f.paymentStatus === 'paid' ? '<span class="badge badge-success badge-dot">Lunas</span>' : '<span class="badge badge-danger badge-dot">Belum Lunas</span>'}</td>
        <td>
          <div class="btn-group">
            <button class="btn btn-sm btn-outline" onclick="TMS.Flight.showDetail('${f.id}')" title="Detail"><i data-lucide="eye"></i></button>
            <button class="btn btn-sm btn-outline" style="color:var(--primary-light);border-color:var(--primary-light);" onclick="TMS.Flight.showForm('${f.id}')" title="Edit"><i data-lucide="edit-3"></i></button>
            <button class="btn btn-sm btn-outline" style="color:var(--warning);border-color:var(--warning);" onclick="TMS.Refund.launchRefund('${f.id}', 'flight')" title="Ajukan Refund / Void"><i data-lucide="rotate-ccw"></i></button>
            <button class="btn btn-sm btn-whatsapp" onclick="TMS.App.shareToWhatsApp('flight', '${f.id}')" title="Kirim WhatsApp"><i data-lucide="message-square"></i></button>
            <button class="btn btn-sm btn-primary" onclick="TMS.Flight.download('${f.id}')" title="Unduh E-Tiket"><i data-lucide="download"></i></button>
            <button class="btn btn-sm btn-danger" onclick="TMS.Flight.delete('${f.id}')" title="Hapus"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function renderForm(data = {}) {
    const generatedCode = S.generateCode('flight');
    return `
    <div class="tabs mb-2" style="display:flex; background:var(--bg-secondary); border-radius:12px; padding:4px; border:1px solid var(--border-color); gap:4px; margin-bottom:16px;">
      <button type="button" class="tab-btn active" id="modalTabManual" onclick="TMS.Flight.switchModalTab('manual')" style="flex:1; padding:10px; border-radius:8px; border:0; font-weight:700; background:var(--primary); color:#fff; cursor:pointer; transition:all 0.2s; font-size:12px; display:flex; align-items:center; justify-content:center; gap:6px;">
        <i data-lucide="edit-3" style="width:14px;"></i> Input Manual
      </button>
      <button type="button" class="tab-btn" id="modalTabApi" onclick="TMS.Flight.switchModalTab('api')" style="flex:1; padding:10px; border-radius:8px; border:0; font-weight:700; background:transparent; color:var(--text-main); cursor:pointer; transition:all 0.2s; font-size:12px; display:flex; align-items:center; justify-content:center; gap:6px;">
        <i data-lucide="plane" style="width:14px;"></i> Cari Penerbangan Live (API)
      </button>
    </div>

    <!-- Live API Search Section -->
    <div id="modalApiSection" style="display:none; padding:16px; background:rgba(184,158,103,0.03); border-radius:12px; border:1px dashed var(--primary-light); margin-bottom:16px;">
      <div style="font-weight:800; font-size:13px; color:var(--primary); margin-bottom:12px; display:flex; align-items:center; gap:6px;">
        <i data-lucide="search" style="width:16px;"></i> CARI TIKET LIVE (API AGGREGATOR)
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Bandara Asal</label>
          <input class="form-control" id="apiOrigin" placeholder="Contoh: Jakarta (CGK)" list="apiAirportList">
        </div>
        <div class="form-group">
          <label class="form-label">Bandara Tujuan</label>
          <input class="form-control" id="apiDest" placeholder="Contoh: Denpasar (DPS)" list="apiAirportList">
        </div>
      </div>
      
      <datalist id="apiAirportList">
        ${S.getAll('airports').map(a => `<option value="${a.city} (${a.code})">${a.name} - ${a.country}</option>`).join('')}
      </datalist>

      <div class="form-row-3" id="apiSearchRow">
        <div class="form-group"><label class="form-label">Tgl Pergi</label><input class="form-control" type="date" id="apiDate" value="${new Date().toISOString().split('T')[0]}"></div>
        <div class="form-group" id="apiReturnDateGroup" style="display:none;"><label class="form-label">Tgl Pulang</label><input class="form-control" type="date" id="apiReturnDate" value="${new Date(Date.now() + 3*24*60*60*1000).toISOString().split('T')[0]}"></div>
        <div class="form-group"><label class="form-label">Jumlah Penumpang</label><input class="form-control" type="number" id="apiPassengers" value="1" min="1"></div>
        <div class="form-group">
          <label class="form-label">Tipe</label>
          <div class="flex-gap" style="margin-top:6px;">
            <label class="radio-label"><input type="radio" name="apiTripType" value="oneway" checked onchange="TMS.Flight.toggleApiTripType('oneway')"> One-Way</label>
            <label class="radio-label"><input type="radio" name="apiTripType" value="round" onchange="TMS.Flight.toggleApiTripType('round')"> Round-Trip</label>
          </div>
        </div>
      </div>
      
      <div style="text-align:right; margin-top:12px;">
        <button type="button" class="btn btn-primary" onclick="TMS.Flight.searchLiveApi()"><i data-lucide="search" style="width:14px; vertical-align:middle; margin-right:4px;"></i> Hubungkan & Cari Tiket</button>
      </div>

      <div id="apiSearchResults" class="mt-2"></div>
    </div>

    <!-- Manual Form Section -->
    <div id="modalManualSection">
      <form id="flightForm" onsubmit="TMS.Flight.save(event)">
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
        <div class="form-group">
          <label class="form-label">Kode Booking / PNR *</label>
          <input class="form-control font-mono" name="pnr" value="${data.pnr || ''}" required placeholder="Contoh: ABCDEF">
        </div>
      </div>
      <input type="hidden" name="bookingCode" value="${data.bookingCode || data.itineraryId || generatedCode}">

      <div class="form-section-title"><i data-lucide="user-check"></i> Data Pemesan (Customer)</div>
      <div class="form-group mb-1">
        <label class="form-label">Cari Pelanggan Terdaftar (Otomatis Isi)</label>
        <select class="form-control" onchange="TMS.Flight.onCustomerSelect(this)">
          <option value="">-- Pilih pelanggan --</option>
          ${S.getAll('customers').map(c => `<option value="${c.id}">${c.name} (${c.customerCode})</option>`).join('')}
        </select>
      </div>
      <div class="card mb-2 p-1" style="background:var(--bg-secondary);">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Nama Pemesan *</label><input class="form-control" name="customerName" id="customerName" value="${data.customerName||''}" required></div>
          <div class="form-group"><label class="form-label">No. Identitas *</label><input class="form-control" name="customerId" id="customerId" value="${data.customerId||''}" required></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Email</label><input class="form-control" name="customerEmail" id="customerEmail" type="email" value="${data.customerEmail||''}"></div>
          <div class="form-group"><label class="form-label">Telepon</label><input class="form-control" name="customerPhone" id="customerPhone" value="${data.customerPhone||''}"></div>
        </div>
        <div class="form-group"><label class="form-label">Alamat</label><input class="form-control" name="customerAddress" id="customerAddress" value="${data.customerAddress||''}"></div>
        <div class="form-group mt-1">
          <label class="checkbox-label" style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;font-size:12px;color:var(--primary);">
            <input type="checkbox" id="copyToPassengerBtn" onchange="TMS.Flight.copyCustomerToPassenger(this.checked)">
            Pemesan juga terbang (Salin to Penumpang 1)
          </label>
        </div>
      </div>

      <div class="form-section-title"><i data-lucide="users"></i> Daftar Penumpang</div>
      <div class="form-group mb-1">
        <label class="form-label">Tambahkan dari Pelanggan Terdaftar</label>
        <select class="form-control" onchange="TMS.Flight.onPassengerSelect(this)">
          <option value="">-- Pilih untuk menambah penumpang --</option>
          ${S.getAll('customers').map(c => `<option value="${c.id}">${c.name} (${c.customerCode})</option>`).join('')}
        </select>
      </div>

      <div id="passengerList">
        <div class="passenger-row card mb-1 p-1" style="background:var(--bg-secondary);">
          <div class="form-row">
            <div class="form-group"><label class="form-label">Nama Lengkap *</label><input class="form-control" name="p_name[]" value="${data.passengers && data.passengers[0] ? data.passengers[0].name : ''}" required placeholder="Sesuai ID"></div>
            <div class="form-group"><label class="form-label">Kategori *</label>
              <select class="form-control" name="p_cat[]" required>
                <option value="Adult" ${data.passengers && data.passengers[0]?.category === 'Adult' ? 'selected' : ''}>Dewasa (Adult)</option>
                <option value="Child" ${data.passengers && data.passengers[0]?.category === 'Child' ? 'selected' : ''}>Anak (Child)</option>
                <option value="Infant" ${data.passengers && data.passengers[0]?.category === 'Infant' ? 'selected' : ''}>Bayi (Infant)</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">No. Identitas *</label><input class="form-control" name="p_id[]" value="${data.passengers && data.passengers[0] ? data.passengers[0].idNumber : ''}" required placeholder="KTP/Paspor"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Email</label><input class="form-control" name="p_email[]" type="email" value="${data.passengers && data.passengers[0] ? (data.passengers[0].email || '') : ''}"></div>
            <div class="form-group"><label class="form-label">Telepon</label><input class="form-control" name="p_phone[]" value="${data.passengers && data.passengers[0] ? (data.passengers[0].phone || '') : ''}"></div>
          </div>
        </div>
      </div>
      
      <button type="button" class="btn btn-sm btn-outline mb-2" onclick="TMS.Flight.addPassengerRow()">
        <i data-lucide="user-plus"></i> Tambah Penumpang
      </button>

      <div class="form-section-title"><i data-lucide="plane"></i> Detail Penerbangan</div>
      <div class="form-group mb-2">
        <label class="form-label">Tipe Perjalanan</label>
        <div class="flex-gap">
          <label class="radio-label">
            <input type="radio" name="tripType" value="oneway" ${data.tripType !== 'round' ? 'checked' : ''} onchange="TMS.Flight.toggleTripType('oneway')"> One Way
          </label>
          <label class="radio-label">
            <input type="radio" name="tripType" value="round" ${data.tripType === 'round' ? 'checked' : ''} onchange="TMS.Flight.toggleTripType('round')"> Round Trip
          </label>
        </div>
      </div>
      
      <div class="flight-section departure-section p-2 mb-2" style="background:rgba(184,158,103,0.05);border-radius:12px;border:1px solid var(--border-color);">
        <div style="font-weight:700;font-size:12px;color:var(--primary);margin-bottom:12px;text-transform:uppercase;display:flex;align-items:center;gap:8px;">
          <i data-lucide="plane-takeoff" style="width:16px;"></i> Penerbangan Pergi (Departure)
        </div>
      <div class="form-row-3">
        <div class="form-group"><label class="form-label">Maskapai *</label>
          <input class="form-control" name="airline" value="${data.airline||''}" required placeholder="Cari maskapai..." list="airlineList">
          <datalist id="airlineList">
            ${S.getAll('airlines').map(a => `<option value="${a.name}">${a.type}</option>`).join('')}
          </datalist>
        </div>
        <div class="form-group"><label class="form-label">No. Penerbangan *</label><input class="form-control" name="flightNumber" value="${data.flightNumber||''}" required placeholder="GA-101"></div>
        <div class="form-group"><label class="form-label">Kelas</label>
          <select class="form-control" name="seatClass">
            <option value="Economy" ${data.seatClass === 'Economy' ? 'selected' : ''}>Economy</option>
            <option value="Business" ${data.seatClass === 'Business' ? 'selected' : ''}>Business</option>
            <option value="First Class" ${data.seatClass === 'First Class' ? 'selected' : ''}>First Class</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Kota Asal *</label>
          <input class="form-control" name="departureCity" value="${data.departureCity||''}" required placeholder="Cari Kota/Bandara Asal" list="airportList">
        </div>
        <div class="form-group">
          <label class="form-label">Kota Tujuan *</label>
          <input class="form-control" name="arrivalCity" value="${data.arrivalCity||''}" required placeholder="Cari Kota/Bandara Tujuan" list="airportList">
        </div>
      </div>

      <datalist id="airportList">
        ${S.getAll('airports').map(a => `<option value="${a.city} (${a.code})">${a.name} - ${a.country}</option>`).join('')}
      </datalist>
      <div class="form-row-3">
        <div class="form-group"><label class="form-label">Tanggal Berangkat *</label><input class="form-control" type="date" name="departureDate" value="${data.departureDate||''}" required></div>
        <div class="form-group"><label class="form-label">Waktu Berangkat</label><input class="form-control" type="time" name="departureTime" value="${data.departureTime||''}"></div>
        <div class="form-group"><label class="form-label">Bagasi (Departure)</label>
          <div class="input-group">
            <input class="form-control" type="number" name="departureBaggage" value="${data.departureBaggage !== undefined ? data.departureBaggage : '20'}" placeholder="20">
            <span class="input-suffix">kg</span>
          </div>
        </div>
      </div>
      <div class="form-row-3">
        <div class="form-group"><label class="form-label">Tanggal Tiba</label><input class="form-control" type="date" name="arrivalDate" value="${data.arrivalDate||''}"></div>
        <div class="form-group"><label class="form-label">Waktu Tiba</label><input class="form-control" type="time" name="arrivalTime" value="${data.arrivalTime||''}"></div>
        <div class="form-group"><label class="form-label">Terminal (Arr/Dep)</label><input class="form-control" name="departureTerminal" placeholder="T1 / T2 / T3" value="${data.departureTerminal||''}"></div>
      </div>
      </div>

      <div id="returnFlightSection" class="flight-section return-section p-2 mb-2 ${data.tripType === 'round' ? '' : 'hidden'}" style="background:rgba(5,17,57,0.03);border-radius:12px;border:1px solid var(--border-color);">
        <div style="font-weight:700;font-size:12px;color:var(--bg-sidebar);margin-bottom:12px;text-transform:uppercase;display:flex;align-items:center;gap:8px;">
          <i data-lucide="plane-landing" style="width:16px;"></i> Penerbangan Pulang (Return)
        </div>
        <div class="form-row-3">
          <div class="form-group"><label class="form-label">Maskapai Pulang *</label>
            <input class="form-control" name="returnAirline" value="${data.returnAirline||''}" placeholder="Cari maskapai..." list="airlineList">
          </div>
          <div class="form-group"><label class="form-label">No. Penerbangan Pulang *</label><input class="form-control" name="returnFlightNumber" value="${data.returnFlightNumber||''}" placeholder="GA-102"></div>
          <div class="form-group"><label class="form-label">Kelas Pulang</label>
            <select class="form-control" name="returnSeatClass">
              <option value="Economy" ${data.returnSeatClass === 'Economy' ? 'selected' : ''}>Economy</option>
              <option value="Business" ${data.returnSeatClass === 'Business' ? 'selected' : ''}>Business</option>
              <option value="First Class" ${data.returnSeatClass === 'First Class' ? 'selected' : ''}>First Class</option>
            </select>
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group"><label class="form-label">Tanggal Pulang *</label><input class="form-control" type="date" name="returnDepartureDate" value="${data.returnDepartureDate||''}"></div>
          <div class="form-group"><label class="form-label">Waktu Pulang</label><input class="form-control" type="time" name="returnDepartureTime" value="${data.returnDepartureTime||''}"></div>
          <div class="form-group"><label class="form-label">Bagasi (Return)</label>
            <div class="input-group">
              <input class="form-control" type="number" name="returnBaggage" value="${data.returnBaggage !== undefined ? data.returnBaggage : '20'}" placeholder="20">
              <span class="input-suffix">kg</span>
            </div>
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group"><label class="form-label">Tanggal Tiba Pulang</label><input class="form-control" type="date" name="returnArrivalDate" value="${data.returnArrivalDate||''}"></div>
          <div class="form-group"><label class="form-label">Waktu Tiba Pulang</label><input class="form-control" type="time" name="returnArrivalTime" value="${data.returnArrivalTime||''}"></div>
          <div class="form-group"><label class="form-label">Terminal (Arr/Dep)</label><input class="form-control" name="returnDepartureTerminal" value="${data.returnDepartureTerminal||''}" placeholder="T1 / T2 / T3"></div>
        </div>
      </div>
      
      <div class="form-section-title"><i data-lucide="dollar-sign"></i> Harga & Pembayaran Vendor</div>
      <div class="card p-1 mb-2" style="background:rgba(7,112,227,0.03); border:1px solid var(--primary-light);">
        <div class="form-group">
          <label class="form-label" style="color:var(--primary-light); font-weight:700;">Bayar Vendor Menggunakan Akun: *</label>
          <select class="form-control" name="paymentAccount" required style="border-color:var(--primary-light);">
            <option value="2-2000" ${data.paymentAccount === '2-2000' || !data.paymentAccount ? 'selected' : ''}>2-2000 - Utang Usaha (Belum Bayar)</option>
            ${S.getCOA().filter(a => a.type === 'asset' && (a.code.startsWith('1-10') || a.code.startsWith('1-13'))).sort((a, b) => a.code.localeCompare(b.code)).map(a => `<option value="${a.code}" ${data.paymentAccount === a.code ? 'selected' : ''}>${a.code} - ${a.name} (Saldo: ${S.formatCurrency(a.balance)})</option>`).join('')}
          </select>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Pilih akun kas/bank/deposit yang digunakan untuk membayar modal tiket ke vendor/maskapai.</div>
        </div>
      </div>

      <!-- ONE WAY price section -->
      <div id="priceOneway" ${data.tripType === 'round' ? 'style="display:none;"' : ''}>
        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">Harga Modal (Vendor) *</label>
            <div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" id="ow_costPriceDep" name="costPriceDep" placeholder="0" value="${S.formatInt(data.costPriceDep || data.costPrice || '')}" oninput="TMS.App.formatNumberInput(this); TMS.Flight.calcMargin()" ${data.tripType === 'round' ? 'disabled' : ''}></div>
          </div>
          <div class="form-group">
            <label class="form-label">Margin Laba Kotor *</label>
            <div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" id="ow_marginDep" placeholder="0" value="${S.formatInt((data.sellingPriceDep !== undefined && data.costPriceDep !== undefined) ? (data.sellingPriceDep - data.costPriceDep) : (data.sellingPrice !== undefined && data.costPrice !== undefined ? data.sellingPrice - data.costPrice : ''))}" oninput="TMS.App.formatNumberInput(this); TMS.Flight.calcMargin()" ${data.tripType === 'round' ? 'disabled' : ''}></div>
          </div>
          <div class="form-group">
            <label class="form-label">Harga Jual (Pelanggan)</label>
            <div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" id="ow_sellingPriceDep" name="sellingPriceDep" placeholder="0" value="${S.formatInt(data.sellingPriceDep || data.sellingPrice || '')}" readonly style="background:var(--bg-secondary);" ${data.tripType === 'round' ? 'disabled' : ''}></div>
          </div>
        </div>
      </div>

      <!-- ROUND TRIP price section -->
      <div id="priceRound" ${data.tripType === 'round' ? '' : 'style="display:none;"'}>
        <div class="p-2 mb-1" style="background:rgba(184,158,103,0.07);border-radius:10px;border:1px dashed var(--primary-light);">
          <div style="font-weight:700;font-size:11px;color:var(--primary-light);margin-bottom:10px;text-transform:uppercase;display:flex;align-items:center;gap:6px;"><i data-lucide="plane-takeoff" style="width:14px;"></i> PERGI (Departure)</div>
          <div class="form-row-3">
            <div class="form-group">
              <label class="form-label">Harga Modal Pergi *</label>
              <div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" id="rt_costPriceDep" name="costPriceDep" placeholder="0" value="${S.formatInt(data.costPriceDep || '')}" oninput="TMS.App.formatNumberInput(this); TMS.Flight.calcMargin()" ${data.tripType !== 'round' ? 'disabled' : ''}></div>
            </div>
            <div class="form-group">
              <label class="form-label">Margin Pergi *</label>
              <div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" id="rt_marginDep" placeholder="0" value="${S.formatInt((data.sellingPriceDep !== undefined && data.costPriceDep !== undefined) ? (data.sellingPriceDep - data.costPriceDep) : '')}" oninput="TMS.App.formatNumberInput(this); TMS.Flight.calcMargin()" ${data.tripType !== 'round' ? 'disabled' : ''}></div>
            </div>
            <div class="form-group">
              <label class="form-label">Harga Jual Pergi</label>
              <div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" id="rt_sellingPriceDep" name="sellingPriceDep" placeholder="0" value="${S.formatInt(data.sellingPriceDep || '')}" readonly style="background:var(--bg-secondary);" ${data.tripType !== 'round' ? 'disabled' : ''}></div>
            </div>
          </div>
        </div>
        <div class="p-2 mb-1" style="background:rgba(5,17,57,0.04);border-radius:10px;border:1px dashed var(--border-color);">
          <div style="font-weight:700;font-size:11px;color:var(--bg-sidebar);margin-bottom:10px;text-transform:uppercase;display:flex;align-items:center;gap:6px;"><i data-lucide="plane-landing" style="width:14px;"></i> PULANG (Return)</div>
          <div class="form-row-3">
            <div class="form-group">
              <label class="form-label">Harga Modal Pulang *</label>
              <div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" id="rt_costPriceRet" name="costPriceRet" placeholder="0" value="${S.formatInt(data.costPriceRet || '')}" oninput="TMS.App.formatNumberInput(this); TMS.Flight.calcMargin()" ${data.tripType !== 'round' ? 'disabled' : ''}></div>
            </div>
            <div class="form-group">
              <label class="form-label">Margin Pulang *</label>
              <div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" id="rt_marginRet" placeholder="0" value="${S.formatInt((data.sellingPriceRet !== undefined && data.costPriceRet !== undefined) ? (data.sellingPriceRet - data.costPriceRet) : '')}" oninput="TMS.App.formatNumberInput(this); TMS.Flight.calcMargin()" ${data.tripType !== 'round' ? 'disabled' : ''}></div>
            </div>
            <div class="form-group">
              <label class="form-label">Harga Jual Pulang</label>
              <div class="input-group"><span class="input-prefix">Rp</span><input class="form-control" type="text" id="rt_sellingPriceRet" name="sellingPriceRet" placeholder="0" value="${S.formatInt(data.sellingPriceRet || '')}" readonly style="background:var(--bg-secondary);" ${data.tripType !== 'round' ? 'disabled' : ''}></div>
            </div>
          </div>
        </div>
        <div class="form-row-3 p-1" style="background:var(--bg-secondary);border-radius:8px;">
          <div class="form-group"><label class="form-label" style="font-size:10px;">Total Modal (Pergi+Pulang)</label><div class="form-control" id="rt_totalCostDisplay" style="color:var(--text-secondary);font-weight:700;">Rp 0</div></div>
          <div class="form-group"><label class="form-label" style="font-size:10px;">Total Jual (Pergi+Pulang)</label><div class="form-control" id="rt_totalSellDisplay" style="color:var(--primary-light);font-weight:700;">Rp 0</div></div>
          <div class="form-group"><label class="form-label" style="font-size:10px;">Total Margin</label><div class="form-control" id="rt_totalMarginDisplay" style="background:rgba(0,196,140,0.08);color:var(--success);font-weight:800;">Rp 0</div></div>
        </div>
      </div>

      <!-- Hidden total fields used by save() -->
      <input type="hidden" name="costPrice" id="costPriceTotal">
      <input type="hidden" name="sellingPrice" id="sellingPriceTotal">

      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="TMS.Flight.closeForm()">Batal</button>
        <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Terbitkan E-Tiket</button>
      </div>
    </form>
    </div>`;
  }

  function addPassengerRow(pData = {}) {
    const container = document.getElementById('passengerList');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'passenger-row card mb-1 p-1';
    div.style.background = 'var(--bg-secondary)';
    div.innerHTML = `
      <div class="flex-between mb-1">
        <span style="font-size:11px;font-weight:600;color:var(--primary-light);">PENUMPANG TAMBAHAN</span>
        <button type="button" class="btn btn-sm btn-outline btn-danger" onclick="this.closest('.passenger-row').remove()" style="padding:2px 6px;">✕</button>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Nama Lengkap *</label><input class="form-control" name="p_name[]" value="${pData.name||''}" required></div>
        <div class="form-group"><label class="form-label">Kategori *</label>
          <select class="form-control" name="p_cat[]" required>
            <option value="Adult" ${pData.category === 'Adult' ? 'selected' : ''}>Dewasa (Adult)</option>
            <option value="Child" ${pData.category === 'Child' ? 'selected' : ''}>Anak (Child)</option>
            <option value="Infant" ${pData.category === 'Infant' ? 'selected' : ''}>Bayi (Infant)</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">No. Identitas *</label><input class="form-control" name="p_id[]" value="${pData.idNumber||''}" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Email</label><input class="form-control" name="p_email[]" type="email" value="${pData.email||''}"></div>
        <div class="form-group"><label class="form-label">Telepon</label><input class="form-control" name="p_phone[]" value="${pData.phone||''}"></div>
      </div>
    `;
    container.appendChild(div);
    if (window.lucide) lucide.createIcons();
  }

  function showForm(id = null) {
    if (id) {
      const f = S.getById('flights', id);
      if (!f) return;
      document.getElementById('flightModalTitle').textContent = 'Edit E-Tiket Pesawat';
      document.getElementById('flightModalBody').innerHTML = renderForm(f);
      document.getElementById('flightModal').classList.add('active');
      
      // Populate additional passengers if any
      if (f.passengers && f.passengers.length > 1) {
        for (let i = 1; i < f.passengers.length; i++) {
          addPassengerRow({
            name: f.passengers[i].name || '',
            category: f.passengers[i].category || 'Adult',
            idNumber: f.passengers[i].idNumber || '',
            email: f.passengers[i].email || '',
            phone: f.passengers[i].phone || ''
          });
        }
      }
      
      // Toggle leg displays and prices
      toggleTripType(f.tripType || 'oneway');
    } else {
      document.getElementById('flightModalTitle').textContent = 'Buat E-Tiket Pesawat';
      document.getElementById('flightModalBody').innerHTML = renderForm();
      document.getElementById('flightModal').classList.add('active');
    }
    if (window.lucide) lucide.createIcons();
  }

  function closeForm() { document.getElementById('flightModal').classList.remove('active'); }

  function showDetail(id) {
    const f = S.getById('flights', id);
    if (!f) return;
    document.getElementById('flightModalTitle').textContent = 'Detail E-Tiket';
    document.getElementById('flightModalBody').innerHTML = renderDetail(f);
    document.getElementById('flightModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function renderDetail(f) {
    return `
    <div class="detail-view">
      <div class="detail-header mb-2" style="border-bottom:1px solid var(--border-color);padding-bottom:1rem;">
        <div class="flex-between">
          <div>
            <h3 class="mb-0" style="color:var(--primary-light);">${f.airline} ${f.flightNumber}</h3>
            <div class="text-muted">${f.seatClass} Class - ${f.tripType === 'round' ? 'Round Trip' : 'One Way'}</div>
          </div>
          <div class="text-right">
            <span class="badge ${f.paymentStatus === 'paid' ? 'badge-success' : 'badge-danger'}">${f.paymentStatus === 'paid' ? 'LUNAS' : 'BELUM LUNAS'}</span>
            <div class="font-mono mt-1" style="font-weight:700;">${f.bookingCode}</div>
          </div>
        </div>
      </div>

      <div class="form-row mb-2">
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">KEBERANGKATAN</div>
          <div class="font-bold" style="font-size:16px;">${f.departureCity}</div>
          <div class="text-muted">${S.formatDate(f.departureDate)} ${f.departureTime || ''} ${f.departureTerminal ? '- '+f.departureTerminal : ''}</div>
        </div>
        <div style="display:flex;align-items:center;padding:0 1rem;"><i data-lucide="plane-takeoff" class="text-primary"></i></div>
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">KEDATANGAN</div>
          <div class="font-bold" style="font-size:16px;">${f.arrivalCity}</div>
          <div class="text-muted">${f.arrivalDate ? S.formatDate(f.arrivalDate) : ''} ${f.arrivalTime || ''} ${f.arrivalTerminal ? '- '+f.arrivalTerminal : ''}</div>
        </div>
      </div>
      
      ${f.tripType === 'round' ? `
      <div class="form-row mb-2">
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;border-left:4px solid var(--bg-sidebar);">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">KEBERANGKATAN PULANG</div>
          <div class="font-bold" style="font-size:16px;">${f.arrivalCity}</div>
          <div class="text-muted">${S.formatDate(f.returnDepartureDate)} ${f.returnDepartureTime || ''} ${f.returnDepartureTerminal ? '- '+f.returnDepartureTerminal : ''}</div>
          <div style="font-size:11px;margin-top:4px;"><strong>${f.returnAirline}</strong> ${f.returnFlightNumber}</div>
        </div>
        <div style="display:flex;align-items:center;padding:0 1rem;"><i data-lucide="plane-landing" style="color:var(--bg-sidebar);"></i></div>
        <div class="card p-1" style="background:var(--bg-secondary);flex:1;border-left:4px solid var(--bg-sidebar);">
          <div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">KEDATANGAN PULANG</div>
          <div class="font-bold" style="font-size:16px;">${f.departureCity}</div>
          <div class="text-muted">${f.returnArrivalDate ? S.formatDate(f.returnArrivalDate) : ''} ${f.returnArrivalTime || ''} ${f.returnArrivalTerminal ? '- '+f.returnArrivalTerminal : ''}</div>
        </div>
      </div>` : ''}

      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="user-check" style="width:14px;height:14px;vertical-align:middle;"></i> DATA PEMESAN</div>
      <div class="card p-1 mb-2" style="background:var(--bg-secondary);">
        <table class="table-sm" style="border:none;">
          <tr><td style="color:var(--text-muted);width:30%;">Nama</td><td><strong>${f.customerName || f.passengerName}</strong></td></tr>
          <tr><td style="color:var(--text-muted);">Kontak</td><td>${f.customerEmail || '-'} | ${f.customerPhone || '-'}</td></tr>
          <tr><td style="color:var(--text-muted);">Identitas</td><td>${f.customerId || '-'}</td></tr>
          <tr><td style="color:var(--text-muted);">Alamat</td><td>${f.customerAddress || '-'}</td></tr>
        </table>
      </div>

      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="users" style="width:14px;height:14px;vertical-align:middle;"></i> DAFTAR PENUMPANG</div>
      <div class="card mb-2" style="overflow:hidden;">
        <table class="table-sm">
          <thead style="background:var(--bg-secondary);"><tr><th>Nama</th><th>Kategori</th><th>Identitas</th><th>Kontak</th></tr></thead>
          <tbody>
            ${(f.passengers || []).map(p => `<tr><td><strong>${p.name}</strong></td><td><span class="badge badge-outline">${p.category || 'Adult'}</span></td><td>${p.idNumber}</td><td>${p.email || '-'}<br>${p.phone || '-'}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="section-title mb-1" style="font-weight:700;font-size:12px;color:var(--primary-light);"><i data-lucide="dollar-sign" style="width:14px;height:14px;vertical-align:middle;"></i> RINCIAN BIAYA & PEMBAYARAN</div>
      <div class="card p-1" style="background:var(--bg-secondary);">
        <div class="flex-between mb-1"><span>Sumber Dana / Akun</span><span class="badge badge-outline" style="font-family:monospace;">${f.paymentAccount || '2-2000'}</span></div>
        ${f.tripType === 'round' && f.costPriceDep !== undefined ? `
        <div style="border-top:1px dashed var(--border-color);padding-top:8px;margin-top:4px;">
          <div style="font-size:10px;font-weight:700;color:var(--primary-light);margin-bottom:6px;text-transform:uppercase;">✈ Pergi</div>
          <div class="flex-between mb-1"><span class="text-muted" style="font-size:12px;">Modal</span><span class="font-mono" style="font-size:12px;">${S.formatCurrency(f.costPriceDep)}</span></div>
          <div class="flex-between mb-1"><span class="text-muted" style="font-size:12px;">Jual</span><span class="font-mono" style="font-size:12px;color:var(--primary-light);font-weight:700;">${S.formatCurrency(f.sellingPriceDep)}</span></div>
          <div style="font-size:10px;font-weight:700;color:var(--bg-sidebar);margin-bottom:6px;margin-top:10px;text-transform:uppercase;">✈ Pulang</div>
          <div class="flex-between mb-1"><span class="text-muted" style="font-size:12px;">Modal</span><span class="font-mono" style="font-size:12px;">${S.formatCurrency(f.costPriceRet)}</span></div>
          <div class="flex-between mb-1"><span class="text-muted" style="font-size:12px;">Jual</span><span class="font-mono" style="font-size:12px;color:var(--primary-light);font-weight:700;">${S.formatCurrency(f.sellingPriceRet)}</span></div>
        </div>` : ''}
        <div style="border-top:1px solid var(--border-color);padding-top:8px;margin-top:6px;">
          <div class="flex-between mb-1"><span><strong>Total Modal</strong></span><span class="font-mono">${S.formatCurrency(f.costPrice)}</span></div>
          <div class="flex-between mb-1"><span><strong>Total Jual</strong></span><span class="font-mono" style="color:var(--primary-light);font-weight:700;">${S.formatCurrency(f.sellingPrice)}</span></div>
        </div>
        <div class="flex-between border-top pt-1 mt-1" style="border-top:1px dashed var(--border-color) !important;">
          <span style="font-weight:700;">Margin Laba Kotor</span>
          <span class="font-mono ${f.sellingPrice - f.costPrice >= 0 ? 'text-success' : 'text-danger'}" style="font-weight:700;">${S.formatCurrency(f.sellingPrice - f.costPrice)}</span>
        </div>
      </div>
      
      <div class="form-actions mt-2">
        <button class="btn btn-outline" onclick="TMS.Flight.closeForm()">Tutup</button>
        <button class="btn btn-whatsapp" onclick="TMS.App.shareToWhatsApp('flight', '${f.id}')"><i data-lucide="message-square"></i> Kirim WhatsApp</button>
        <button class="btn btn-primary" onclick="TMS.Flight.download('${f.id}')"><i data-lucide="download"></i> Unduh E-Tiket</button>
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
    
    const isChecked = document.getElementById('copyToPassengerBtn')?.checked;
    if (isChecked) {
      copyCustomerToPassenger(true);
    }
    sel.value = ""; // Reset select
  }

  function copyCustomerToPassenger(isCopy) {
    const firstRowName = document.querySelector('input[name="p_name[]"]');
    const firstRowId = document.querySelector('input[name="p_id[]"]');
    const firstRowEmail = document.querySelector('input[name="p_email[]"]');
    const firstRowPhone = document.querySelector('input[name="p_phone[]"]');
    
    if (isCopy && firstRowName) {
      firstRowName.value = document.getElementById('customerName')?.value || '';
      if(firstRowId) firstRowId.value = document.getElementById('customerId')?.value || '';
      if(firstRowEmail) firstRowEmail.value = document.getElementById('customerEmail')?.value || '';
      if(firstRowPhone) firstRowPhone.value = document.getElementById('customerPhone')?.value || '';
    }
  }

  function onPassengerSelect(sel) {
    const id = sel.value;
    if (!id) return;
    const c = S.getById('customers', id);
    if (!c) return;
    
    // Check if the first row is empty
    const firstRowName = document.querySelector('input[name="p_name[]"]');
    if (firstRowName && !firstRowName.value) {
      firstRowName.value = c.name || '';
      const firstRowId = document.querySelector('input[name="p_id[]"]');
      if (firstRowId) firstRowId.value = c.idNumber || '';
      const firstRowEmail = document.querySelector('input[name="p_email[]"]');
      if (firstRowEmail) firstRowEmail.value = c.email || '';
      const firstRowPhone = document.querySelector('input[name="p_phone[]"]');
      if (firstRowPhone) firstRowPhone.value = c.phone || '';
    } else {
      addPassengerRow({ name: c.name, idNumber: c.idNumber, email: c.email, phone: c.phone });
    }
    sel.value = ""; // Reset select
  }

  function calcMargin() {
    const isRound = document.getElementById('priceRound')?.style.display !== 'none';

    let costDep, sellDep, costRet = 0, sellRet = 0;
    let marginDep = 0, marginRet = 0;
    if (isRound) {
      costDep = S.parseNumber(document.getElementById('rt_costPriceDep')?.value) || 0;
      marginDep = S.parseNumber(document.getElementById('rt_marginDep')?.value) || 0;
      sellDep = costDep + marginDep;
      const elSellDep = document.getElementById('rt_sellingPriceDep');
      if (elSellDep) elSellDep.value = S.formatInt(sellDep);

      costRet = S.parseNumber(document.getElementById('rt_costPriceRet')?.value) || 0;
      marginRet = S.parseNumber(document.getElementById('rt_marginRet')?.value) || 0;
      sellRet = costRet + marginRet;
      const elSellRet = document.getElementById('rt_sellingPriceRet');
      if (elSellRet) elSellRet.value = S.formatInt(sellRet);
    } else {
      costDep = S.parseNumber(document.getElementById('ow_costPriceDep')?.value) || 0;
      marginDep = S.parseNumber(document.getElementById('ow_marginDep')?.value) || 0;
      sellDep = costDep + marginDep;
      const elSellDep = document.getElementById('ow_sellingPriceDep');
      if (elSellDep) elSellDep.value = S.formatInt(sellDep);
    }

    const totalCost = costDep + costRet;
    const totalSell = sellDep + sellRet;
    const totalMargin = totalSell - totalCost;

    // Update hidden totals for form submission
    const costHidden = document.getElementById('costPriceTotal');
    const sellHidden = document.getElementById('sellingPriceTotal');
    if (costHidden) costHidden.value = totalCost;
    if (sellHidden) sellHidden.value = totalSell;

    if (isRound) {
      // Totals summary row
      const elCost = document.getElementById('rt_totalCostDisplay');
      if (elCost) elCost.textContent = S.formatCurrency(totalCost);
      const elSell = document.getElementById('rt_totalSellDisplay');
      if (elSell) elSell.textContent = S.formatCurrency(totalSell);
      const elMargin = document.getElementById('rt_totalMarginDisplay');
      if (elMargin) { elMargin.textContent = S.formatCurrency(totalMargin); elMargin.style.color = totalMargin >= 0 ? 'var(--success)' : 'var(--danger)'; }
    }
  }

  function save(e) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const booking = Object.fromEntries(fd.entries());
    
    // Handle multiple passengers
    const names = fd.getAll('p_name[]');
    const cats = fd.getAll('p_cat[]');
    const ids = fd.getAll('p_id[]');
    const emails = fd.getAll('p_email[]');
    const phones = fd.getAll('p_phone[]');
    
    booking.passengers = names.map((name, i) => ({
      name, category: cats[i], idNumber: ids[i], email: emails[i], phone: phones[i]
    }));
    
    // Auto-detect airport names
    const airports = S.getAll('airports');
    const depAirport = (airports.find(a => booking.departureCity.includes(`(${a.code})`))?.name || '') + ' Intl';
    const arrAirport = (airports.find(a => booking.arrivalCity.includes(`(${a.code})`))?.name || '') + ' Intl';
    booking.departureAirport = depAirport;
    booking.arrivalAirport = arrAirport;

    // Primary customer for summary
    booking.passengerName = booking.customerName || booking.passengers[0].name;
    booking.passengerEmail = booking.customerEmail || booking.passengers[0].email;
    
    // Parse individual leg prices
    booking.costPriceDep = S.parseNumber(booking.costPriceDep) || 0;
    booking.sellingPriceDep = S.parseNumber(booking.sellingPriceDep) || 0;
    booking.costPriceRet = S.parseNumber(booking.costPriceRet) || 0;
    booking.sellingPriceRet = S.parseNumber(booking.sellingPriceRet) || 0;
    // Compute totals (hidden fields should already be set, but compute as fallback)
    booking.costPrice = booking.costPriceDep + booking.costPriceRet;
    booking.sellingPrice = booking.sellingPriceDep + booking.sellingPriceRet;
    
    const isEdit = !!booking.id;
    let existing = null;
    let isPaid = false;
    if (isEdit) {
      existing = S.getById('flights', booking.id);
      if (existing) {
        isPaid = existing.paymentStatus === 'paid';
        // Clean up financial data associated with old bookingCode/bookingId
        const invoices = S.getAll('invoices').filter(inv => inv.bookingId === booking.id);
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

    if (isEdit && existing) {
      booking.bookingCode = existing.bookingCode;
      booking.paymentStatus = existing.paymentStatus || 'unpaid';
      S.update('flights', booking.id, booking);
      TMS.App.toast('E-Tiket berhasil diperbarui!', 'success');
    } else {
      booking.bookingCode = booking.bookingCode || booking.itineraryId || generatedCode;
      booking.paymentStatus = 'unpaid';
      S.add('flights', booking);
      TMS.App.toast('E-Tiket berhasil diterbitkan!', 'success');
    }

    const saved = S.getById('flights', isEdit ? booking.id : booking.id || booking.bookingCode);
    createJournal(saved);
    const inv = createInvoice(saved);

    if (isEdit && isPaid) {
      S.update('flights', saved.id, { paymentStatus: 'paid' });
      S.update('invoices', inv.id, { paymentStatus: 'paid', paidAt: existing.paidAt || new Date().toISOString() });
      const j = {
        journalNumber: S.generateCode('journal'),
        date: new Date().toISOString().split('T')[0],
        description: `Penerimaan Kas - ${saved.bookingCode}`,
        reference: saved.bookingCode,
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
    TMS.App.navigate('flights');
  }

  function toggleTripType(type) {
    const section = document.getElementById('returnFlightSection');
    const priceOneway = document.getElementById('priceOneway');
    const priceRound = document.getElementById('priceRound');
    if (!section) return;
    if (type === 'round') {
      // Show return flight section
      section.classList.remove('hidden');
      section.querySelectorAll('input').forEach(i => { if(i.name !== 'returnArrivalDate' && i.name !== 'returnArrivalTerminal' && i.name !== 'returnArrivalTime' && i.name !== 'returnDepartureTerminal') i.required = true; });
      // Switch price sections
      if (priceOneway) { priceOneway.style.display = 'none'; priceOneway.querySelectorAll('input').forEach(i => i.disabled = true); }
      if (priceRound)  { priceRound.style.display = '';     priceRound.querySelectorAll('input').forEach(i => i.disabled = false); }
    } else {
      section.classList.add('hidden');
      section.querySelectorAll('input').forEach(i => i.required = false);
      if (priceOneway) { priceOneway.style.display = '';     priceOneway.querySelectorAll('input').forEach(i => i.disabled = false); }
      if (priceRound)  { priceRound.style.display = 'none'; priceRound.querySelectorAll('input').forEach(i => i.disabled = true); }
    }
    calcMargin();
  }

  function markPaid(id) {
    const f = S.getById('flights', id);
    if (!f) return;
    S.update('flights', id, { paymentStatus: 'paid' });
    const inv = S.getAll('invoices').find(i => i.bookingId === id);
    if (inv) {
      S.update('invoices', inv.id, { paymentStatus: 'paid', paidAt: new Date().toISOString() });
      const j = { journalNumber: S.generateCode('journal'), date: new Date().toISOString().split('T')[0], description: `Penerimaan Kas - ${f.bookingCode}`, reference: f.bookingCode, type: 'payment_received', entries: [{ accountCode: '1-1000', accountName: 'Kas', debit: inv.total, credit: 0 }, { accountCode: '1-1100', accountName: 'Piutang Usaha', debit: 0, credit: inv.total }] };
      S.add('journals', j); S.recalculateCOA();
    }
    TMS.App.navigate('flights');
    TMS.App.toast('Status pembayaran diperbarui: LUNAS', 'success');
  }

  function del(id) {
    if (!confirm('Hapus e-tiket ini? Seluruh invoice dan laporan keuangan terkait juga akan dihapus.')) return;
    const f = S.getById('flights', id);
    if (!f) return;

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
      if (j.reference === f.bookingCode) S.remove('journals', j.id);
    });

    // 3. Hapus Data Penerbangan
    S.remove('flights', id);

    // 4. Rekalkulasi COA
    S.recalculateCOA();

    TMS.App.navigate('flights');
    TMS.App.toast('E-Tiket dan data keuangan terkait dihapus', 'warning');
  }

  function search(q) {
    const flights = S.getAll('flights').filter(f => !q || f.passengerName?.toLowerCase().includes(q.toLowerCase()) || f.bookingCode?.toLowerCase().includes(q.toLowerCase()));
    document.getElementById('flightBody').innerHTML = renderRows(getSortedFlights(flights));
    if (window.lucide) lucide.createIcons();
  }

  function download(id) {
    const f = S.getById('flights', id);
    if (f) TMS.PDF.generateETicket(f);
  }

  let activeApiOffers = [];
  let activeOutboundOffers = [];
  let activeReturnOffers = [];
  let selectedOutboundOffer = null;
  let selectedReturnOffer = null;

  function switchModalTab(tab) {
    const manualBtn = document.getElementById('modalTabManual');
    const apiBtn = document.getElementById('modalTabApi');
    const manualSec = document.getElementById('modalManualSection');
    const apiSec = document.getElementById('modalApiSection');
    
    if (!manualBtn || !apiBtn || !manualSec || !apiSec) return;
    
    if (tab === 'api') {
      manualBtn.style.background = 'transparent';
      manualBtn.style.color = 'var(--text-main)';
      
      apiBtn.style.background = 'var(--primary)';
      apiBtn.style.color = '#fff';
      
      manualSec.style.display = 'none';
      apiSec.style.display = 'block';
      if (window.lucide) lucide.createIcons();
    } else {
      apiBtn.style.background = 'transparent';
      apiBtn.style.color = 'var(--text-main)';
      
      manualBtn.style.background = 'var(--primary)';
      manualBtn.style.color = '#fff';
      
      manualSec.style.display = 'block';
      apiSec.style.display = 'none';
    }
  }

  function toggleApiTripType(type) {
    const returnDateGroup = document.getElementById('apiReturnDateGroup');
    const searchRow = document.getElementById('apiSearchRow');
    if (!returnDateGroup || !searchRow) return;
    if (type === 'round') {
      returnDateGroup.style.display = 'block';
      searchRow.style.gridTemplateColumns = '1fr 1fr 1fr 1fr';
    } else {
      returnDateGroup.style.display = 'none';
      searchRow.style.gridTemplateColumns = '1fr 1fr 1fr';
    }
  }

  function searchLiveApi() {
    const originSel = document.getElementById('apiOrigin')?.value;
    const destSel = document.getElementById('apiDest')?.value;
    const dateVal = document.getElementById('apiDate')?.value;
    const passVal = parseInt(document.getElementById('apiPassengers')?.value) || 1;
    const tripType = document.querySelector('input[name="apiTripType"]:checked')?.value || 'oneway';
    const resultsContainer = document.getElementById('apiSearchResults');
    
    if (!originSel || !destSel || !dateVal) {
      alert('Mohon lengkapi Kota Asal, Kota Tujuan, dan Tanggal Berangkat!');
      return;
    }
    
    const originCode = originSel.includes('(') ? originSel.split('(')[1].split(')')[0] : originSel;
    const destCode = destSel.includes('(') ? destSel.split('(')[1].split(')')[0] : destSel;
    
    resultsContainer.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;padding:40px;flex-direction:column;gap:12px;">
        <div style="width:36px;height:36px;border:3px solid var(--primary);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></div>
        <div style="font-size:12px;color:var(--text-muted);">Menghubungkan ke API Aggregator Penerbangan...</div>
      </div>`;
      
    selectedOutboundOffer = null;
    selectedReturnOffer = null;
    activeOutboundOffers = [];
    activeReturnOffers = [];
      
    if (tripType === 'round') {
      const returnDateVal = document.getElementById('apiReturnDate')?.value;
      if (!returnDateVal) {
        alert('Mohon tentukan Tanggal Pulang untuk pencarian Round-Trip!');
        resultsContainer.innerHTML = '';
        return;
      }
      
      Promise.all([
        fetch(`/api/flights/live_search?origin=${originCode}&destination=${destCode}&date=${dateVal}&passengers=${passVal}&trip_type=oneway`).then(r => r.json()),
        fetch(`/api/flights/live_search?origin=${destCode}&destination=${originCode}&date=${returnDateVal}&passengers=${passVal}&trip_type=oneway`).then(r => r.json())
      ])
      .then(([outRes, retRes]) => {
        if (outRes.status === 'success' && outRes.data?.length > 0 && retRes.status === 'success' && retRes.data?.length > 0) {
          activeOutboundOffers = outRes.data;
          activeReturnOffers = retRes.data;
          renderRoundTripSelection(passVal);
        } else {
          resultsContainer.innerHTML = `<div class="p-3 text-center text-muted" style="font-size:12px;">Tidak ditemukan penerbangan pergi atau pulang untuk rute dan tanggal ini.</div>`;
        }
      })
      .catch(err => {
        console.error(err);
        resultsContainer.innerHTML = `<div class="p-3 text-center text-danger" style="font-size:12px;">Koneksi gagal ke API maskapai. Silakan coba lagi.</div>`;
      });
    } else {
      fetch(`/api/flights/live_search?origin=${originCode}&destination=${destCode}&date=${dateVal}&passengers=${passVal}&trip_type=oneway`)
        .then(r => r.json())
        .then(res => {
          if (res.status === 'success' && res.data && res.data.length > 0) {
            activeApiOffers = res.data;
            let html = '<div style="font-weight:700;font-size:12px;margin:12px 0 8px;color:var(--text-main);">Ditemukan Penerbangan Pilihan B2B:</div>';
            res.data.forEach(offer => {
              html += `
              <div class="card p-2 mb-2" style="border: 1px solid var(--border-color); background: var(--bg-card); transition: all 0.2s;">
                <div class="flex-between mb-1" style="border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <div style="background:var(--primary-light); color:#fff; font-weight:800; font-size:10px; padding:2px 6px; border-radius:4px;">${offer.code}</div>
                    <strong style="font-size:13px; color:var(--text-main);">${offer.airline}</strong>
                    <span class="text-muted" style="font-size:11px;">(${offer.flightNumber})</span>
                  </div>
                  <div style="font-size:11px; font-weight:600; color:var(--success); background:rgba(0,196,140,0.08); padding:2px 8px; border-radius:4px;">
                    Bagasi: ${offer.baggage}
                  </div>
                </div>
                
                <div style="margin-bottom:8px;">
                  <div style="font-weight:700;font-size:10px;color:var(--primary-light);margin-bottom:6px;text-transform:uppercase;display:flex;align-items:center;gap:6px;"><i data-lucide="plane-takeoff" style="width:12px;"></i> Penerbangan Pergi (Outbound Segment)</div>
                  <div class="form-row-3" style="align-items:center; gap:16px;">
                    <div>
                      <div style="font-size:10px; color:var(--text-muted);">Jadwal</div>
                      <div style="font-size:13px; font-weight:700; color:var(--primary);">${offer.departureTime} &rarr; ${offer.arrivalTime}</div>
                      <div style="font-size:10px; color:var(--text-muted);">${offer.origin} ke ${offer.destination} (${offer.duration})</div>
                    </div>
                    <div>
                      <div style="font-size:10px; color:var(--text-muted);">Tanggal Pergi</div>
                      <div style="font-size:12px; font-weight:600; color:var(--text-main);">${S.formatDate(offer.date)}</div>
                    </div>
                    <div>
                      <div style="font-size:10px; color:var(--text-muted);">No. Penerbangan</div>
                      <div style="font-size:12px; font-weight:600; color:var(--text-main);">${offer.flightNumber}</div>
                    </div>
                  </div>
                </div>
                
                <div class="flex-between mt-2 pt-2" style="border-top:1px solid var(--border-color); align-items:center;">
                  <div>
                    <div style="font-size:10px; color:var(--text-muted);">Total B2B Net (${passVal} Pax)</div>
                    <div style="font-size:15px; font-weight:800; color:var(--text-secondary);">${S.formatCurrency(offer.costPriceTotal)}</div>
                    <div style="font-size:10px; color:var(--text-muted);">Per Pax: ${S.formatCurrency(offer.costPricePerPassenger)}</div>
                  </div>
                  <div>
                    <button type="button" class="btn btn-sm btn-primary" onclick="TMS.Flight.selectApiOffer('${offer.id}', ${passVal}, 'oneway')" style="font-weight:700; display:flex; align-items:center; gap:4px;"><i data-lucide="check-circle" style="width:14px;"></i> Pilih & Isi Data</button>
                  </div>
                </div>
              </div>`;
            });
            resultsContainer.innerHTML = html;
            if (window.lucide) lucide.createIcons();
          } else {
            resultsContainer.innerHTML = `<div class="p-3 text-center text-muted" style="font-size:12px;">Tidak ditemukan penerbangan untuk rute dan tanggal ini.</div>`;
          }
        })
        .catch(err => {
          console.error(err);
          resultsContainer.innerHTML = `<div class="p-3 text-center text-danger" style="font-size:12px;">Koneksi gagal ke API maskapai. Silakan coba lagi.</div>`;
        });
    }
  }

  function renderRoundTripSelection(passengersCount) {
    const resultsContainer = document.getElementById('apiSearchResults');
    if (!resultsContainer) return;
    
    let html = `
    <div style="font-weight:700;font-size:12px;margin:16px 0 8px;color:var(--text-main);display:flex;align-items:center;gap:6px;"><i data-lucide="shuffle" style="width:16px;"></i> Silakan Pilih Maskapai Pergi & Pulang (Bisa Berbeda):</div>
    
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:16px;" id="roundTripSelectionLayout">
      <!-- Outbound Column -->
      <div>
        <div style="font-weight:700;font-size:11px;color:var(--primary);margin-bottom:8px;text-transform:uppercase;display:flex;align-items:center;gap:6px;">
          <i data-lucide="plane-takeoff" style="width:14px;"></i> 1. Penerbangan Pergi (Outbound)
        </div>
        <div id="outboundList" style="max-height: 400px; overflow-y: auto; padding-right: 4px;">
          ${activeOutboundOffers.map(offer => {
            const isSelected = selectedOutboundOffer && selectedOutboundOffer.id === offer.id;
            return `
            <div class="card p-2 mb-2" id="out_offer_${offer.id}" style="border: 2px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}; background: ${isSelected ? 'rgba(184,158,103,0.05)' : 'var(--bg-card)'}; cursor:pointer; transition:all 0.2s;" onclick="TMS.Flight.selectOutbound('${offer.id}', ${passengersCount})">
              <div class="flex-between mb-1" style="border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <strong style="font-size:12px; color:var(--text-main);">${offer.airline}</strong>
                  <span class="text-muted" style="font-size:10px;">(${offer.flightNumber})</span>
                </div>
                ${isSelected ? `<span class="badge badge-success" style="font-size:9px;"><i data-lucide="check" style="width:10px;height:10px;"></i> TERPILIH</span>` : ''}
              </div>
              <div style="font-size:11px;">
                <div style="font-weight:700; color:var(--primary);">${offer.departureTime} &rarr; ${offer.arrivalTime}</div>
                <div class="text-muted" style="font-size:9px;">${offer.origin} &rarr; ${offer.destination} (${offer.duration})</div>
                <div class="text-muted" style="font-size:9px;">Tgl: ${S.formatDate(offer.date)} | Bagasi: ${offer.baggage.split(' ')[0]}</div>
                <div style="font-weight:700; color:var(--text-secondary); margin-top:4px; font-size:11px;">B2B: ${S.formatCurrency(offer.costPriceTotal)}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
      
      <!-- Return Column -->
      <div>
        <div style="font-weight:700;font-size:11px;color:var(--bg-sidebar);margin-bottom:8px;text-transform:uppercase;display:flex;align-items:center;gap:6px;">
          <i data-lucide="plane-landing" style="width:14px;"></i> 2. Penerbangan Pulang (Return)
        </div>
        <div id="returnList" style="max-height: 400px; overflow-y: auto; padding-right: 4px;">
          ${activeReturnOffers.map(offer => {
            const isSelected = selectedReturnOffer && selectedReturnOffer.id === offer.id;
            return `
            <div class="card p-2 mb-2" id="ret_offer_${offer.id}" style="border: 2px solid ${isSelected ? 'var(--bg-sidebar)' : 'var(--border-color)'}; background: ${isSelected ? 'rgba(5,17,57,0.03)' : 'var(--bg-card)'}; cursor:pointer; transition:all 0.2s;" onclick="TMS.Flight.selectReturn('${offer.id}', ${passengersCount})">
              <div class="flex-between mb-1" style="border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <strong style="font-size:12px; color:var(--text-main);">${offer.airline}</strong>
                  <span class="text-muted" style="font-size:10px;">(${offer.flightNumber})</span>
                </div>
                ${isSelected ? `<span class="badge" style="font-size:9px; background:rgba(5,17,57,0.15); color:var(--bg-sidebar);"><i data-lucide="check" style="width:10px;height:10px;"></i> TERPILIH</span>` : ''}
              </div>
              <div style="font-size:11px;">
                <div style="font-weight:700; color:var(--bg-sidebar);">${offer.departureTime} &rarr; ${offer.arrivalTime}</div>
                <div class="text-muted" style="font-size:9px;">${offer.origin} &rarr; ${offer.destination} (${offer.duration})</div>
                <div class="text-muted" style="font-size:9px;">Tgl: ${S.formatDate(offer.date)} | Bagasi: ${offer.baggage.split(' ')[0]}</div>
                <div style="font-weight:700; color:var(--text-secondary); margin-top:4px; font-size:11px;">B2B: ${S.formatCurrency(offer.costPriceTotal)}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
    
    <!-- Summary Section -->
    <div id="roundTripSummaryContainer"></div>
    `;
    
    resultsContainer.innerHTML = html;
    if (window.lucide) lucide.createIcons();
    updateRoundTripSummary(passengersCount);
  }

  function selectOutbound(offerId, passengersCount) {
    const offer = activeOutboundOffers.find(o => o.id === offerId);
    if (!offer) return;
    selectedOutboundOffer = offer;
    renderRoundTripSelection(passengersCount);
  }

  function selectReturn(offerId, passengersCount) {
    const offer = activeReturnOffers.find(o => o.id === offerId);
    if (!offer) return;
    selectedReturnOffer = offer;
    renderRoundTripSelection(passengersCount);
  }

  function updateRoundTripSummary(passengersCount) {
    const container = document.getElementById('roundTripSummaryContainer');
    if (!container) return;
    
    if (!selectedOutboundOffer || !selectedReturnOffer) {
      container.innerHTML = `
      <div class="card p-2 text-center" style="background:var(--bg-secondary); border: 1px dashed var(--border-color); color:var(--text-muted); font-size:12px;">
        <i data-lucide="info" style="width:16px; vertical-align:middle; margin-right:4px;"></i> Mohon pilih satu Penerbangan Pergi DAN satu Penerbangan Pulang untuk melanjutkan.
      </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }
    
    const totalCost = selectedOutboundOffer.costPriceTotal + selectedReturnOffer.costPriceTotal;
    
    container.innerHTML = `
    <div class="card p-2" style="background:rgba(0,196,140,0.03); border:2px solid var(--success); border-radius:12px; margin-top:16px;">
      <div style="font-weight:800; font-size:13px; color:var(--success); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
        <i data-lucide="check-circle" style="width:16px;"></i> RINGKASAN PILIHAN RUTE (Kombinasi Sukses)
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:12px; border-bottom:1px dashed var(--border-color); padding-bottom:12px;">
        <div>
          <div style="font-size:10px; color:var(--text-muted); font-weight:700;">✈ PERGI: ${selectedOutboundOffer.airline} (${selectedOutboundOffer.flightNumber})</div>
          <div style="font-size:12px; font-weight:700; color:var(--primary); margin-top:2px;">${selectedOutboundOffer.departureTime} &rarr; ${selectedOutboundOffer.arrivalTime}</div>
          <div style="font-size:10px; color:var(--text-muted);">${selectedOutboundOffer.origin} ke ${selectedOutboundOffer.destination} | ${S.formatDate(selectedOutboundOffer.date)}</div>
          <div style="font-size:11px; font-weight:600; color:var(--text-secondary); margin-top:2px;">Cost: ${S.formatCurrency(selectedOutboundOffer.costPriceTotal)}</div>
        </div>
        <div>
          <div style="font-size:10px; color:var(--text-muted); font-weight:700;">✈ PULANG: ${selectedReturnOffer.airline} (${selectedReturnOffer.flightNumber})</div>
          <div style="font-size:12px; font-weight:700; color:var(--bg-sidebar); margin-top:2px;">${selectedReturnOffer.departureTime} &rarr; ${selectedReturnOffer.arrivalTime}</div>
          <div style="font-size:10px; color:var(--text-muted);">${selectedReturnOffer.origin} ke ${selectedReturnOffer.destination} | ${S.formatDate(selectedReturnOffer.date)}</div>
          <div style="font-size:11px; font-weight:600; color:var(--text-secondary); margin-top:2px;">Cost: ${S.formatCurrency(selectedReturnOffer.costPriceTotal)}</div>
        </div>
      </div>
      
      <div class="flex-between" style="align-items:center;">
        <div>
          <div style="font-size:10px; color:var(--text-muted);">Total B2B Net (${passengersCount} Pax)</div>
          <div style="font-size:16px; font-weight:800; color:var(--text-secondary);">${S.formatCurrency(totalCost)}</div>
          <div style="font-size:9px; color:var(--text-muted);">Per Pax: ${S.formatCurrency(totalCost / passengersCount)}</div>
        </div>
        <div>
          <button type="button" class="btn btn-success" onclick="TMS.Flight.confirmRoundTripSelection(${passengersCount})" style="font-weight:700; font-size:12px; display:flex; align-items:center; gap:4px; box-shadow:0 4px 10px rgba(5,150,105,0.25);"><i data-lucide="check-square"></i> Pilih Kombinasi & Isi Data</button>
        </div>
      </div>
    </div>`;
    if (window.lucide) lucide.createIcons();
  }

  function confirmRoundTripSelection(passengersCount) {
    if (!selectedOutboundOffer || !selectedReturnOffer) return;
    
    switchModalTab('manual');
    
    const pnrInp = document.querySelector('[name="pnr"]');
    if (pnrInp) {
      pnrInp.value = `API-RT-${Math.floor(1000+Math.random()*9000)}`;
    }
    
    const tripTypeRadios = document.querySelectorAll('[name="tripType"]');
    tripTypeRadios.forEach(radio => {
      if (radio.value === 'round') {
        radio.checked = true;
        TMS.Flight.toggleTripType('round');
      }
    });
    
    const airlineInp = document.querySelector('[name="airline"]');
    const flNumInp = document.querySelector('[name="flightNumber"]');
    const depCityInp = document.querySelector('[name="departureCity"]');
    const arrCityInp = document.querySelector('[name="arrivalCity"]');
    const depDateInp = document.querySelector('[name="departureDate"]');
    const depTimeInp = document.querySelector('[name="departureTime"]');
    const baggageInp = document.querySelector('[name="departureBaggage"]');
    
    const airports = S.getAll('airports');
    const outOriginAirport = airports.find(a => a.code === selectedOutboundOffer.origin);
    const outDestAirport = airports.find(a => a.code === selectedOutboundOffer.destination);
    
    if (airlineInp) airlineInp.value = selectedOutboundOffer.airline;
    if (flNumInp) flNumInp.value = selectedOutboundOffer.flightNumber;
    if (depCityInp) {
      depCityInp.value = outOriginAirport ? `${outOriginAirport.city} (${outOriginAirport.code})` : selectedOutboundOffer.origin;
    }
    if (arrCityInp) {
      arrCityInp.value = outDestAirport ? `${outDestAirport.city} (${outDestAirport.code})` : selectedOutboundOffer.destination;
    }
    if (depDateInp) depDateInp.value = selectedOutboundOffer.date;
    if (depTimeInp) depTimeInp.value = selectedOutboundOffer.departureTime;
    if (baggageInp) baggageInp.value = selectedOutboundOffer.baggage.includes('20') ? '20' : '0';
    
    const arrDateInp = document.querySelector('[name="arrivalDate"]');
    const arrTimeInp = document.querySelector('[name="arrivalTime"]');
    if (arrDateInp) arrDateInp.value = selectedOutboundOffer.date;
    if (arrTimeInp) arrTimeInp.value = selectedOutboundOffer.arrivalTime;
    
    const retAirlineInp = document.querySelector('[name="returnAirline"]');
    const retFlNumInp = document.querySelector('[name="returnFlightNumber"]');
    const retDepDateInp = document.querySelector('[name="returnDepartureDate"]');
    const retDepTimeInp = document.querySelector('[name="returnDepartureTime"]');
    const retArrTimeInp = document.querySelector('[name="returnArrivalTime"]');
    const retArrDateInp = document.querySelector('[name="returnArrivalDate"]');
    const retBaggageInp = document.querySelector('[name="returnBaggage"]');
    
    if (retAirlineInp) retAirlineInp.value = selectedReturnOffer.airline;
    if (retFlNumInp) retFlNumInp.value = selectedReturnOffer.flightNumber;
    if (retDepDateInp) retDepDateInp.value = selectedReturnOffer.date;
    if (retDepTimeInp) retDepTimeInp.value = selectedReturnOffer.departureTime;
    if (retArrTimeInp) retArrTimeInp.value = selectedReturnOffer.arrivalTime;
    if (retArrDateInp) retArrDateInp.value = selectedReturnOffer.date;
    if (retBaggageInp) retBaggageInp.value = selectedReturnOffer.baggage.includes('20') ? '20' : '0';
    
    const rtCostDep = document.getElementById('rt_costPriceDep');
    const rtMarginDep = document.getElementById('rt_marginDep');
    const rtCostRet = document.getElementById('rt_costPriceRet');
    const rtMarginRet = document.getElementById('rt_marginRet');
    
    const depCost = selectedOutboundOffer.costPriceTotal;
    const retCost = selectedReturnOffer.costPriceTotal;
    const depMargin = Math.round(depCost * 0.10);
    const retMargin = Math.round(retCost * 0.10);
    
    if (rtCostDep) rtCostDep.value = S.formatInt(depCost);
    if (rtMarginDep) rtMarginDep.value = S.formatInt(depMargin);
    if (rtCostRet) rtCostRet.value = S.formatInt(retCost);
    if (rtMarginRet) rtMarginRet.value = S.formatInt(retMargin);
    
    const pList = document.getElementById('passengerList');
    if (pList) {
      pList.innerHTML = '';
      for (let i = 1; i < passengersCount; i++) {
        addPassengerRow({ name: `Penumpang API ${i + 1}`, category: 'Adult' });
      }
    }
    
    calcMargin();
    
    const payAcc = document.querySelector('[name="paymentAccount"]');
    if (payAcc) {
      const firstBankOpt = Array.from(payAcc.options).find(opt => opt.value.startsWith('1-13') || opt.value.startsWith('1-10'));
      if (firstBankOpt) payAcc.value = firstBankOpt.value;
    }
    
    TMS.App.toast('Kombinasi rute (pergi & pulang) dari API berhasil dimuat. Lengkapi nama penumpang & klik Terbitkan!', 'success');
  }

  function selectApiOffer(offerId, passengersCount, tripType) {
    const offer = activeApiOffers.find(o => o.id === offerId);
    if (!offer) return;
    
    switchModalTab('manual');
    
    const pnrInp = document.querySelector('[name="pnr"]');
    if (pnrInp) pnrInp.value = `API-${offer.flightNumber.replace('-','')}-${Math.floor(100+Math.random()*900)}`;
    
    const tripTypeRadios = document.querySelectorAll('[name="tripType"]');
    tripTypeRadios.forEach(radio => {
      if (radio.value === tripType) {
        radio.checked = true;
        TMS.Flight.toggleTripType(tripType);
      }
    });
    
    const airlineInp = document.querySelector('[name="airline"]');
    const flNumInp = document.querySelector('[name="flightNumber"]');
    const depCityInp = document.querySelector('[name="departureCity"]');
    const arrCityInp = document.querySelector('[name="arrivalCity"]');
    const depDateInp = document.querySelector('[name="departureDate"]');
    const depTimeInp = document.querySelector('[name="departureTime"]');
    const baggageInp = document.querySelector('[name="departureBaggage"]');
    
    const airports = S.getAll('airports');
    const outOriginAirport = airports.find(a => a.code === offer.origin);
    const outDestAirport = airports.find(a => a.code === offer.destination);
    
    if (airlineInp) airlineInp.value = offer.airline;
    if (flNumInp) flNumInp.value = offer.flightNumber;
    if (depCityInp) {
      depCityInp.value = outOriginAirport ? `${outOriginAirport.city} (${outOriginAirport.code})` : offer.origin;
    }
    if (arrCityInp) {
      arrCityInp.value = outDestAirport ? `${outDestAirport.city} (${outDestAirport.code})` : offer.destination;
    }
    if (depDateInp) depDateInp.value = offer.date;
    if (depTimeInp) depTimeInp.value = offer.departureTime;
    if (baggageInp) baggageInp.value = offer.baggage.includes('20') ? '20' : '0';
    
    const arrDateInp = document.querySelector('[name="arrivalDate"]');
    const arrTimeInp = document.querySelector('[name="arrivalTime"]');
    if (arrDateInp) arrDateInp.value = offer.date;
    if (arrTimeInp) arrTimeInp.value = offer.arrivalTime;
    
    const owCost = document.getElementById('ow_costPriceDep');
    const owMargin = document.getElementById('ow_marginDep');
    const costPrice = offer.costPriceTotal;
    const defaultMargin = Math.round(costPrice * 0.10);
    if (owCost) owCost.value = S.formatInt(costPrice);
    if (owMargin) owMargin.value = S.formatInt(defaultMargin);
    
    const pList = document.getElementById('passengerList');
    if (pList) {
      pList.innerHTML = '';
      for (let i = 1; i < passengersCount; i++) {
        addPassengerRow({ name: `Penumpang API ${i + 1}`, category: 'Adult' });
      }
    }
    
    calcMargin();
    
    const payAcc = document.querySelector('[name="paymentAccount"]');
    if (payAcc) {
      const firstBankOpt = Array.from(payAcc.options).find(opt => opt.value.startsWith('1-13') || opt.value.startsWith('1-10'));
      if (firstBankOpt) payAcc.value = firstBankOpt.value;
    }
    
    TMS.App.toast('Penerbangan B2B dari API berhasil dimuat. Lengkapi nama penumpang & klik Terbitkan!', 'success');
  }

  return { renderList, sortTable, showForm, closeForm, save, markPaid, delete: del, search, calcMargin, onCustomerSelect, copyCustomerToPassenger, onPassengerSelect, addPassengerRow, showDetail, download, toggleTripType, switchModalTab, searchLiveApi, selectApiOffer, toggleApiTripType, selectOutbound, selectReturn, confirmRoundTripSelection };
})();
