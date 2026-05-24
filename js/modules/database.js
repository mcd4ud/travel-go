/* ========================================
   TMS - Master Database Module (Expanded v2)
   ======================================== */
TMS.Database = (() => {
  const S = TMS.Store;

  // Data default untuk melengkapi database kosong saat pertama kali diakses
  const DEFAULT_HOTELS = [
    { hotelCode: 'DBH-00001', name: 'Hotel Mulia Senayan', stars: 5, city: 'Jakarta', address: 'Jl. Asia Afrika, Senayan', phone: '(021) 5747777', roomTypes: 'Splendor, Executive Room, Suite', rating: 9.2 },
    { hotelCode: 'DBH-00002', name: 'Padma Resort Ubud', stars: 5, city: 'Bali', address: 'Banjar Carik, Desa Puhu, Ubud', phone: '(0361) 3011111', roomTypes: 'Deluxe Chalet, Premier Club, Suite', rating: 9.5 },
    { hotelCode: 'DBH-00003', name: 'Pullman Bandung Grand Central', stars: 5, city: 'Bandung', address: 'Jl. Diponegoro No.27, Cibeunying', phone: '(022) 86060800', roomTypes: 'Deluxe Room, Executive Room, Suite', rating: 9.0 },
    { hotelCode: 'DBH-00004', name: 'Hotel Tentrem Yogyakarta', stars: 5, city: 'Yogyakarta', address: 'Jl. P. Mangkubumi No.72A', phone: '(0274) 6415555', roomTypes: 'Deluxe, Premier, Executive Suite', rating: 9.3 }
  ];

  const DEFAULT_RENTALS = [
    { vehicleCode: 'DBR-00001', vehicleName: 'Toyota Avanza', vehicleType: 'MPV', transmission: 'Manual', capacity: 7, licensePlate: 'B 2345 SIF', dailyPrice: 350000 },
    { vehicleCode: 'DBR-00002', vehicleName: 'Mitsubishi Xpander', vehicleType: 'MPV', transmission: 'Automatic', capacity: 7, licensePlate: 'B 7890 KPA', dailyPrice: 450000 },
    { vehicleCode: 'DBR-00003', vehicleName: 'Toyota Fortuner VRZ', vehicleType: 'SUV', transmission: 'Automatic', capacity: 7, licensePlate: 'B 1010 VRZ', dailyPrice: 1200000 },
    { vehicleCode: 'DBR-00004', vehicleName: 'Honda Brio RS', vehicleType: 'Hatchback', transmission: 'Automatic', capacity: 5, licensePlate: 'B 1989 KLO', dailyPrice: 300000 }
  ];

  function checkInitData() {
    if (S.getAll('db_hotels').length === 0) {
      DEFAULT_HOTELS.forEach(h => S.add('db_hotels', h));
    }
    if (S.getAll('db_rentals').length === 0) {
      DEFAULT_RENTALS.forEach(r => S.add('db_rentals', r));
    }
    if (S.getAll('airlines').length === 0 && typeof TMS_AIRLINES !== 'undefined') {
      TMS_AIRLINES.forEach(a => S.add('airlines', a));
    }
    if (S.getAll('airports').length === 0 && typeof TMS_AIRPORTS !== 'undefined') {
      TMS_AIRPORTS.forEach(a => S.add('airports', a));
    }
  }

  function render() {
    checkInitData();
    return `
    <div class="fade-in">
      <div class="tabs mb-2">
        <button class="tab-btn active" id="tabAirlines" onclick="TMS.Database.switchTab('airlines')">
          <i data-lucide="plane"></i> Database Maskapai
        </button>
        <button class="tab-btn" id="tabAirports" onclick="TMS.Database.switchTab('airports')">
          <i data-lucide="map-pin"></i> Database Bandara
        </button>
        <button class="tab-btn" id="tabHotels" onclick="TMS.Database.switchTab('hotels')">
          <i data-lucide="hotel"></i> Database Hotel
        </button>
        <button class="tab-btn" id="tabRentals" onclick="TMS.Database.switchTab('rentals')">
          <i data-lucide="car"></i> Database Rental Mobil
        </button>
      </div>

      <div id="dbContent">
        ${renderAirlines()}
      </div>
    </div>
    
    <div class="modal-overlay" id="dbModal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <span class="modal-title" id="dbModalTitle">Form Database</span>
          <button class="modal-close" onclick="TMS.Database.closeForm()">✕</button>
        </div>
        <div class="modal-body" id="dbModalBody"></div>
      </div>
    </div>`;
  }

  function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (tab === 'airlines') {
      document.getElementById('tabAirlines').classList.add('active');
      document.getElementById('dbContent').innerHTML = renderAirlines();
    } else if (tab === 'airports') {
      document.getElementById('tabAirports').classList.add('active');
      document.getElementById('dbContent').innerHTML = renderAirports();
    } else if (tab === 'hotels') {
      document.getElementById('tabHotels').classList.add('active');
      document.getElementById('dbContent').innerHTML = renderHotels();
    } else if (tab === 'rentals') {
      document.getElementById('tabRentals').classList.add('active');
      document.getElementById('dbContent').innerHTML = renderRentals();
    }
    if (window.lucide) lucide.createIcons();
  }

  // --- AIRLINES SECTION ---
  function renderAirlines() {
    const airlines = S.getAll('airlines');
    const domestic = airlines.filter(a => a.type === 'Domestic');
    const international = airlines.filter(a => a.type === 'International');

    return `
    <div class="toolbar">
      <div class="search-box">
        <i data-lucide="search"></i>
        <input type="text" placeholder="Cari maskapai..." oninput="TMS.Database.searchAirlines(this.value)">
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="TMS.Database.showAirlineForm()">
          <i data-lucide="plus"></i> Tambah Maskapai
        </button>
        <button class="btn btn-outline" onclick="TMS.Database.syncAirlinesToVendors()">
          <i data-lucide="refresh-cw"></i> Jadikan Vendor
        </button>
        <button class="btn btn-ghost text-danger" onclick="TMS.Database.resetDatabase('airlines')">
          <i data-lucide="rotate-ccw"></i> Reset Default
        </button>
      </div>
    </div>

    <div class="section-title">Maskapai Domestik Indonesia (${domestic.length})</div>
    <div class="grid-4" id="airlineGridDomestic">
      ${domestic.map(a => renderAirlineCard(a)).join('')}
    </div>

    <div class="section-title mt-2">Maskapai Internasional (${international.length})</div>
    <div class="grid-4" id="airlineGridInternational">
      ${international.map(a => renderAirlineCard(a)).join('')}
    </div>`;
  }

  function renderAirlineCard(a) {
    return `
    <div class="card p-1 airline-card" data-name="${a.name.toLowerCase()}">
      <div class="flex-between mb-1">
        <span class="badge badge-outline" style="font-size:10px;">${a.type}</span>
        <div class="btn-group">
          <button class="btn btn-icon-sm" onclick="TMS.Database.showAirlineForm('${a.id}')"><i data-lucide="edit-2"></i></button>
          <button class="btn btn-icon-sm btn-danger" onclick="TMS.Database.deleteAirline('${a.id}')"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
      <div style="height: 60px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; background: #fff; border-radius: 8px; padding: 8px; border: 1px solid var(--border-color);">
        <img src="${a.logo}" alt="${a.name}" style="max-height: 100%; max-width: 100%; object-fit: contain;" onerror="this.src='https://via.placeholder.com/100x40?text=${a.name}'">
      </div>
      <div class="text-center">
        <div style="font-weight: 700; font-size: 14px; color: var(--primary-light);">${a.name}</div>
      </div>
    </div>`;
  }

  // --- AIRPORTS SECTION ---
  function renderAirports() {
    const airports = S.getAll('airports');
    const groups = {};
    airports.forEach(a => {
      if (!groups[a.country]) groups[a.country] = [];
      groups[a.country].push(a);
    });

    const countries = Object.keys(groups).sort((a, b) => {
      if (a === 'Indonesia') return -1;
      if (b === 'Indonesia') return 1;
      return a.localeCompare(b);
    });

    return `
    <div class="toolbar">
      <div class="search-box">
        <i data-lucide="search"></i>
        <input type="text" placeholder="Cari kota, kode, atau nama bandara..." oninput="TMS.Database.searchAirports(this.value)">
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="TMS.Database.showAirportForm()">
          <i data-lucide="plus"></i> Tambah Bandara
        </button>
        <button class="btn btn-ghost text-danger" onclick="TMS.Database.resetDatabase('airports')">
          <i data-lucide="rotate-ccw"></i> Reset Default
        </button>
      </div>
    </div>

    <div id="airportListContainer">
      ${countries.map(c => `
        <div class="section-title mt-2 country-section" data-country="${c.toLowerCase()}">${c.toUpperCase()} (${groups[c].length})</div>
        <div class="card p-0">
          <table class="table-sm">
            <thead>
              <tr>
                <th style="width: 80px;">Kode</th>
                <th>Kota</th>
                <th>Nama Bandara</th>
                <th style="width: 80px;">Aksi</th>
              </tr>
            </thead>
            <tbody class="airport-tbody" data-country="${c.toLowerCase()}">
              ${groups[c].map(a => `
                <tr class="airport-row" data-search="${a.city.toLowerCase()} ${a.code.toLowerCase()} ${a.name.toLowerCase()}">
                  <td><span class="badge badge-outline" style="font-family: monospace; font-weight: 700;">${a.code}</span></td>
                  <td><strong>${a.city}</strong></td>
                  <td class="text-muted">${a.name}</td>
                  <td>
                    <div class="btn-group">
                      <button class="btn btn-icon-sm" onclick="TMS.Database.showAirportForm('${a.id}')"><i data-lucide="edit-2"></i></button>
                      <button class="btn btn-icon-sm btn-danger" onclick="TMS.Database.deleteAirport('${a.id}')"><i data-lucide="trash-2"></i></button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `).join('')}
    </div>`;
  }

  // --- HOTELS SECTION ---
  function renderHotels() {
    const hotels = S.getAll('db_hotels');
    return `
    <div class="toolbar">
      <div class="search-box">
        <i data-lucide="search"></i>
        <input type="text" placeholder="Cari nama hotel, area, atau kota..." oninput="TMS.Database.searchHotels(this.value)">
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="TMS.Database.showHotelForm()">
          <i data-lucide="plus"></i> Tambah Hotel Baru
        </button>
        <button class="btn btn-outline" onclick="TMS.Database.syncHotelsToVendors()">
          <i data-lucide="refresh-cw"></i> Jadikan Vendor
        </button>
        <button class="btn btn-ghost text-danger" onclick="TMS.Database.resetDatabase('hotels')">
          <i data-lucide="rotate-ccw"></i> Reset Default
        </button>
      </div>
    </div>
    
    <div class="card p-0">
      <table class="table-sm">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama Hotel</th>
            <th>Bintang</th>
            <th>Kota</th>
            <th>Alamat</th>
            <th>No Telepon</th>
            <th>Tipe Kamar Default</th>
            <th>Rating</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody id="hotelDbBody">${renderHotelRows(hotels)}</tbody>
      </table>
    </div>`;
  }

  function renderHotelRows(hotels) {
    if (!hotels.length) return `<tr><td colspan="9" class="table-empty"><i data-lucide="hotel" style="width:32px;height:32px;display:block;margin:0 auto 8px;opacity:.3;"></i>Database hotel masih kosong</td></tr>`;
    return hotels.map(h => {
      let starsHtml = '';
      for (let i = 0; i < 5; i++) {
        starsHtml += i < (h.stars || 5) ? '<span style="color:#d6bd96;font-size:14px;">★</span>' : '<span style="color:#ccc;font-size:14px;">★</span>';
      }

      return `<tr class="hotel-db-row" data-search="${h.name.toLowerCase()} ${h.city.toLowerCase()} ${h.address.toLowerCase()}">
        <td><strong class="font-mono text-primary">${h.hotelCode}</strong></td>
        <td><strong>${h.name}</strong></td>
        <td><div>${starsHtml}</div></td>
        <td><strong>${h.city}</strong></td>
        <td><span class="text-muted" style="font-size:12px;">${h.address}</span></td>
        <td>${h.phone || '-'}</td>
        <td><span class="text-muted" style="font-size:12px;font-style:italic;">${h.roomTypes || '-'}</span></td>
        <td><span class="badge badge-success font-bold">${h.rating || '8.5'} / 10</span></td>
        <td>
          <div class="btn-group">
            <button class="btn btn-icon-sm" onclick="TMS.Database.showHotelForm('${h.id}')"><i data-lucide="edit-2"></i></button>
            <button class="btn btn-icon-sm btn-danger" onclick="TMS.Database.deleteHotel('${h.id}')"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  // --- RENTALS SECTION ---
  function renderRentals() {
    const rentals = S.getAll('db_rentals');
    return `
    <div class="toolbar">
      <div class="search-box">
        <i data-lucide="search"></i>
        <input type="text" placeholder="Cari model mobil, transmisi, plat..." oninput="TMS.Database.searchRentals(this.value)">
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="TMS.Database.showRentalForm()">
          <i data-lucide="plus"></i> Tambah Kendaraan
        </button>
        <button class="btn btn-ghost text-danger" onclick="TMS.Database.resetDatabase('rentals')">
          <i data-lucide="rotate-ccw"></i> Reset Default
        </button>
      </div>
    </div>
    
    <div class="card p-0">
      <table class="table-sm">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Model Mobil</th>
            <th>Tipe</th>
            <th>Transmisi</th>
            <th>Kapasitas</th>
            <th>No. Plat</th>
            <th>Harga Sewa Harian</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody id="rentalDbBody">${renderRentalRows(rentals)}</tbody>
      </table>
    </div>`;
  }

  function renderRentalRows(rentals) {
    if (!rentals.length) return `<tr><td colspan="8" class="table-empty"><i data-lucide="car" style="width:32px;height:32px;display:block;margin:0 auto 8px;opacity:.3;"></i>Database rental mobil masih kosong</td></tr>`;
    return rentals.map(r => {
      return `<tr class="rental-db-row" data-search="${r.vehicleName.toLowerCase()} ${r.licensePlate.toLowerCase()} ${r.vehicleType.toLowerCase()} ${r.transmission.toLowerCase()}">
        <td><strong class="font-mono text-primary">${r.vehicleCode}</strong></td>
        <td><strong>${r.vehicleName}</strong></td>
        <td><span class="badge badge-outline" style="font-size:11px;">${r.vehicleType}</span></td>
        <td><strong>${r.transmission}</strong></td>
        <td>${r.capacity} Kursi</td>
        <td><span class="font-mono" style="font-weight:700;background:var(--bg-secondary);padding:2px 8px;border-radius:4px;border:1px solid var(--border-color);">${r.licensePlate}</span></td>
        <td><strong class="amount-positive">${S.formatCurrency(r.dailyPrice)}</strong></td>
        <td>
          <div class="btn-group">
            <button class="btn btn-icon-sm" onclick="TMS.Database.showRentalForm('${r.id}')"><i data-lucide="edit-2"></i></button>
            <button class="btn btn-icon-sm btn-danger" onclick="TMS.Database.deleteRental('${r.id}')"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  // --- FORMS & ACTION HANDLERS ---
  
  // Airline Forms
  function showAirlineForm(id = null) {
    const a = id ? S.getById('airlines', id) : { name: '', logo: '', type: 'Domestic' };
    document.getElementById('dbModalTitle').textContent = id ? 'Edit Maskapai' : 'Tambah Maskapai';
    document.getElementById('dbModalBody').innerHTML = `
      <form onsubmit="TMS.Database.saveAirline(event, '${id||''}')">
        <div class="form-group mb-1">
          <label class="form-label">Nama Maskapai *</label>
          <input class="form-control" name="name" value="${a.name}" required>
        </div>
        <div class="form-group mb-1">
          <label class="form-label">URL Logo Maskapai</label>
          <input class="form-control" name="logo" value="${a.logo}" placeholder="https://...">
          <div class="form-help">Gunakan URL gambar logo asli maskapai.</div>
        </div>
        <div class="form-group mb-2">
          <label class="form-label">Tipe *</label>
          <select class="form-control" name="type" required>
            <option value="Domestic" ${a.type === 'Domestic' ? 'selected' : ''}>Domestic</option>
            <option value="International" ${a.type === 'International' ? 'selected' : ''}>International</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="TMS.Database.closeForm()">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan</button>
        </div>
      </form>`;
    document.getElementById('dbModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function saveAirline(e, id) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    if (id) S.update('airlines', id, data);
    else S.add('airlines', data);
    closeForm();
    switchTab('airlines');
    TMS.App.toast('Data maskapai berhasil disimpan', 'success');
  }

  function deleteAirline(id) {
    if (!confirm('Hapus maskapai ini dari database?')) return;
    S.remove('airlines', id);
    switchTab('airlines');
    TMS.App.toast('Maskapai dihapus', 'warning');
  }

  // Airport Forms
  function showAirportForm(id = null) {
    const a = id ? S.getById('airports', id) : { code: '', city: '', name: '', country: 'Indonesia' };
    document.getElementById('dbModalTitle').textContent = id ? 'Edit Bandara' : 'Tambah Bandara';
    document.getElementById('dbModalBody').innerHTML = `
      <form onsubmit="TMS.Database.saveAirport(event, '${id||''}')">
        <div class="form-row">
          <div class="form-group mb-1">
            <label class="form-label">Kode IATA *</label>
            <input class="form-control font-mono" name="code" value="${a.code}" required maxlength="3" style="text-transform: uppercase;">
          </div>
          <div class="form-group mb-1">
            <label class="form-label">Kota *</label>
            <input class="form-control" name="city" value="${a.city}" required>
          </div>
        </div>
        <div class="form-group mb-1">
          <label class="form-label">Nama Bandara *</label>
          <input class="form-control" name="name" value="${a.name}" required>
        </div>
        <div class="form-group mb-2">
          <label class="form-label">Negara *</label>
          <input class="form-control" name="country" value="${a.country}" required>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="TMS.Database.closeForm()">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan</button>
        </div>
      </form>`;
    document.getElementById('dbModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function saveAirport(e, id) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    data.code = data.code.toUpperCase();
    if (id) S.update('airports', id, data);
    else S.add('airports', data);
    closeForm();
    switchTab('airports');
    TMS.App.toast('Data bandara berhasil disimpan', 'success');
  }

  function deleteAirport(id) {
    if (!confirm('Hapus bandara ini dari database?')) return;
    S.remove('airports', id);
    switchTab('airports');
    TMS.App.toast('Bandara dihapus', 'warning');
  }

  // Hotel Forms & Actions
  function showHotelForm(id = null) {
    const generatedCode = S.generateCode('db_hotel');
    const h = id ? S.getById('db_hotels', id) : { hotelCode: generatedCode, name: '', stars: 5, city: '', address: '', phone: '', roomTypes: 'Standard, Deluxe Suite', rating: 9.0 };
    
    document.getElementById('dbModalTitle').textContent = id ? 'Edit Database Hotel' : 'Tambah Hotel ke Database';
    document.getElementById('dbModalBody').innerHTML = `
      <form onsubmit="TMS.Database.saveHotel(event, '${id||''}')">
        <div class="form-row">
          <div class="form-group mb-1">
            <label class="form-label">Kode Hotel</label>
            <input class="form-control font-mono" name="hotelCode" value="${h.hotelCode}" readonly style="background:var(--bg-secondary);">
          </div>
          <div class="form-group mb-1">
            <label class="form-label">Klasifikasi Bintang *</label>
            <select class="form-control" name="stars" required>
              <option value="5" ${h.stars === 5 ? 'selected' : ''}>★★★★★ (Bintang 5)</option>
              <option value="4" ${h.stars === 4 ? 'selected' : ''}>★★★★ (Bintang 4)</option>
              <option value="3" ${h.stars === 3 ? 'selected' : ''}>★★★ (Bintang 3)</option>
              <option value="2" ${h.stars === 2 ? 'selected' : ''}>★★ (Bintang 2)</option>
              <option value="1" ${h.stars === 1 ? 'selected' : ''}>★ (Bintang 1)</option>
            </select>
          </div>
        </div>

        <div class="form-group mb-1">
          <label class="form-label">Nama Hotel *</label>
          <input class="form-control" name="name" value="${h.name}" required placeholder="Contoh: Shangri-La Jakarta">
        </div>

        <div class="form-row">
          <div class="form-group mb-1">
            <label class="form-label">Kota *</label>
            <input class="form-control" name="city" value="${h.city}" required placeholder="Contoh: Jakarta / Bandung">
          </div>
          <div class="form-group mb-1">
            <label class="form-label">No. Telepon Hotel</label>
            <input class="form-control" name="phone" value="${h.phone}" placeholder="Contoh: (021) 123-4567">
          </div>
        </div>

        <div class="form-group mb-1">
          <label class="form-label">Alamat Lengkap Hotel *</label>
          <input class="form-control" name="address" value="${h.address}" required placeholder="Jl. Jenderal Sudirman No. 1...">
        </div>

        <div class="form-row">
          <div class="form-group mb-1">
            <label class="form-label">Tipe Kamar Default (Pisahkan dengan Koma) *</label>
            <input class="form-control" name="roomTypes" value="${h.roomTypes}" required placeholder="Standard, Deluxe, Executive Suite">
          </div>
          <div class="form-group mb-2">
            <label class="form-label">Rating Internal (Skala 1 - 10) *</label>
            <input class="form-control" type="number" step="0.1" max="10" min="1" name="rating" value="${h.rating}" required>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="TMS.Database.closeForm()">Batal</button>
          <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Simpan Data Hotel</button>
        </div>
      </form>`;
    document.getElementById('dbModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function saveHotel(e, id) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    data.stars = parseInt(data.stars) || 5;
    data.rating = parseFloat(data.rating) || 8.5;

    if (id) S.update('db_hotels', id, data);
    else S.add('db_hotels', data);

    closeForm();
    switchTab('hotels');
    TMS.App.toast('Data hotel disimpan ke master database!', 'success');
  }

  function deleteHotel(id) {
    if (!confirm('Hapus hotel ini dari master database?')) return;
    S.remove('db_hotels', id);
    switchTab('hotels');
    TMS.App.toast('Data hotel dihapus dari database', 'warning');
  }

  // Rental Vehicle Forms & Actions
  function showRentalForm(id = null) {
    const generatedCode = S.generateCode('db_rental');
    const r = id ? S.getById('db_rentals', id) : { vehicleCode: generatedCode, vehicleName: '', vehicleType: 'MPV', transmission: 'Automatic', capacity: 7, licensePlate: '', dailyPrice: 400000 };

    document.getElementById('dbModalTitle').textContent = id ? 'Edit Database Kendaraan' : 'Tambah Mobil ke Database';
    document.getElementById('dbModalBody').innerHTML = `
      <form onsubmit="TMS.Database.saveRental(event, '${id||''}')">
        <div class="form-row">
          <div class="form-group mb-1">
            <label class="form-label">Kode Kendaraan</label>
            <input class="form-control font-mono" name="vehicleCode" value="${r.vehicleCode}" readonly style="background:var(--bg-secondary);">
          </div>
          <div class="form-group mb-1">
            <label class="form-label">Tipe Mobil *</label>
            <select class="form-control" name="vehicleType" required>
              <option value="MPV" ${r.vehicleType === 'MPV' ? 'selected' : ''}>MPV (Family Car)</option>
              <option value="SUV" ${r.vehicleType === 'SUV' ? 'selected' : ''}>SUV (Sport Utility)</option>
              <option value="Sedan" ${r.vehicleType === 'Sedan' ? 'selected' : ''}>Sedan</option>
              <option value="Hatchback" ${r.vehicleType === 'Hatchback' ? 'selected' : ''}>Hatchback / City Car</option>
              <option value="Minibus" ${r.vehicleType === 'Minibus' ? 'selected' : ''}>Minibus / Van</option>
              <option value="Premium" ${r.vehicleType === 'Premium' ? 'selected' : ''}>Premium / Luxury Car</option>
            </select>
          </div>
        </div>

        <div class="form-group mb-1">
          <label class="form-label">Model & Merk Mobil *</label>
          <input class="form-control" name="vehicleName" value="${r.vehicleName}" required placeholder="Contoh: Mitsubishi Xpander Ultimate">
        </div>

        <div class="form-row-3">
          <div class="form-group mb-1">
            <label class="form-label">Transmisi *</label>
            <select class="form-control" name="transmission" required>
              <option value="Automatic" ${r.transmission === 'Automatic' ? 'selected' : ''}>Automatic (A/T)</option>
              <option value="Manual" ${r.transmission === 'Manual' ? 'selected' : ''}>Manual (M/T)</option>
            </select>
          </div>
          <div class="form-group mb-1">
            <label class="form-label">Kapasitas Kursi *</label>
            <input class="form-control" type="number" name="capacity" value="${r.capacity}" required min="1" placeholder="Contoh: 7">
          </div>
          <div class="form-group mb-1">
            <label class="form-label">Nomor Plat Mobil *</label>
            <input class="form-control font-mono" name="licensePlate" value="${r.licensePlate}" required placeholder="Contoh: B 1234 CDG" style="text-transform: uppercase;">
          </div>
        </div>

        <div class="form-group mb-2">
          <label class="form-label">Harga Sewa Harian Default *</label>
          <div class="input-group">
            <span class="input-prefix">Rp</span>
            <input class="form-control" type="number" name="dailyPrice" value="${r.dailyPrice}" required>
          </div>
          <div class="form-help">Tarif sewa mobil harian dasar sebelum markup keuntungan/promo.</div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="TMS.Database.closeForm()">Batal</button>
          <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Simpan Data Mobil</button>
        </div>
      </form>`;
    document.getElementById('dbModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function saveRental(e, id) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    data.capacity = parseInt(data.capacity) || 7;
    data.dailyPrice = parseFloat(data.dailyPrice) || 0;
    data.licensePlate = data.licensePlate.toUpperCase();

    if (id) S.update('db_rentals', id, data);
    else S.add('db_rentals', data);

    closeForm();
    switchTab('rentals');
    TMS.App.toast('Data kendaraan berhasil disimpan ke master database!', 'success');
  }

  function deleteRental(id) {
    if (!confirm('Hapus kendaraan ini dari master database?')) return;
    S.remove('db_rentals', id);
    switchTab('rentals');
    TMS.App.toast('Data mobil dihapus dari database', 'warning');
  }

  function closeForm() { document.getElementById('dbModal').classList.remove('active'); }

  // --- SEARCH FILTERS ---
  function searchAirlines(q) {
    const term = q.toLowerCase();
    document.querySelectorAll('.airline-card').forEach(card => {
      const name = card.getAttribute('data-name');
      card.style.display = name.includes(term) ? 'block' : 'none';
    });
  }

  function searchAirports(q) {
    const term = q.toLowerCase();
    document.querySelectorAll('.airport-row').forEach(row => {
      const text = row.getAttribute('data-search');
      row.style.display = text.includes(term) ? 'table-row' : 'none';
    });

    document.querySelectorAll('.airport-tbody').forEach(tbody => {
      const visibleRows = Array.from(tbody.querySelectorAll('.airport-row')).filter(r => r.style.display !== 'none');
      const country = tbody.getAttribute('data-country');
      const section = document.querySelector(`.country-section[data-country="${country}"]`);
      const table = tbody.closest('.card');
      
      if (visibleRows.length === 0) {
        if (section) section.style.display = 'none';
        if (table) table.style.display = 'none';
      } else {
        if (section) section.style.display = 'block';
        if (table) table.style.display = 'block';
      }
    });
  }

  function searchHotels(q) {
    const term = q.toLowerCase();
    document.querySelectorAll('.hotel-db-row').forEach(row => {
      const text = row.getAttribute('data-search');
      row.style.display = text.includes(term) ? 'table-row' : 'none';
    });
  }

  function searchRentals(q) {
    const term = q.toLowerCase();
    document.querySelectorAll('.rental-db-row').forEach(row => {
      const text = row.getAttribute('data-search');
      row.style.display = text.includes(term) ? 'table-row' : 'none';
    });
  }

  // --- RESETS & SYNC ---
  function syncAirlinesToVendors() {
    const airlines = S.getAll('airlines');
    const domesticAirlines = airlines.filter(a => a.type === 'Domestic');
    const vendors = S.getAll('vendors');
    let count = 0;

    domesticAirlines.forEach(a => {
      const exists = vendors.find(v => v.name.toLowerCase() === a.name.toLowerCase());
      if (!exists) {
        S.add('vendors', {
          name: a.name,
          category: 'Airline',
          contactPerson: 'Sales Department',
          email: 'info@' + a.name.toLowerCase().replace(/\s+/g, '') + '.co.id',
          phone: '-',
          address: 'Indonesia',
          balance: 0
        });
        count++;
      }
    });

    if (count > 0) {
      TMS.App.toast(`${count} Maskapai berhasil ditambahkan ke Manajemen Vendor!`, 'success');
    } else {
      TMS.App.toast('Semua maskapai sudah ada di daftar vendor.', 'warning');
    }
  }

  function syncHotelsToVendors() {
    const hotels = S.getAll('db_hotels');
    const vendors = S.getAll('vendors');
    let count = 0;

    hotels.forEach(h => {
      const exists = vendors.find(v => v.name.toLowerCase() === h.name.toLowerCase());
      if (!exists) {
        S.add('vendors', {
          name: h.name,
          category: 'Hotel',
          contactPerson: 'Reservation Desk',
          email: 'reservation@' + h.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') + '.com',
          phone: h.phone || '-',
          address: h.address || h.city,
          balance: 0
        });
        count++;
      }
    });

    if (count > 0) {
      TMS.App.toast(`${count} Hotel berhasil ditambahkan ke Manajemen Vendor!`, 'success');
    } else {
      TMS.App.toast('Semua hotel sudah ada di daftar vendor.', 'warning');
    }
  }

  function resetDatabase(type) {
    if (!confirm(`Apakah Anda yakin ingin mengembalikan database ${type.toUpperCase()} ke pengaturan awal? Semua data manual yang Anda tambahkan akan hilang.`)) return;
    
    if (type === 'airlines' && typeof TMS_AIRLINES !== 'undefined') {
      const resetData = TMS_AIRLINES.map(a => ({
        ...a,
        id: 'air-' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString()
      }));
      const current = S.getAll(type);
      current.forEach(item => S.remove(type, item.id));
      resetData.forEach(item => S.add(type, item));
      switchTab('airlines');
    } else if (type === 'airports' && typeof TMS_AIRPORTS !== 'undefined') {
      const resetData = TMS_AIRPORTS.map(a => ({
        ...a,
        id: 'apt-' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString()
      }));
      const current = S.getAll(type);
      current.forEach(item => S.remove(type, item.id));
      resetData.forEach(item => S.add(type, item));
      switchTab('airports');
    } else if (type === 'hotels') {
      const current = S.getAll('db_hotels');
      current.forEach(item => S.remove('db_hotels', item.id));
      DEFAULT_HOTELS.forEach(item => S.add('db_hotels', item));
      switchTab('hotels');
    } else if (type === 'rentals') {
      const current = S.getAll('db_rentals');
      current.forEach(item => S.remove('db_rentals', item.id));
      DEFAULT_RENTALS.forEach(item => S.add('db_rentals', item));
      switchTab('rentals');
    }
    TMS.App.toast('Database berhasil di-reset ke pengaturan awal.', 'success');
  }

  return { 
    render, 
    checkInitData,
    switchTab, 
    searchAirlines, 
    searchAirports, 
    searchHotels,
    searchRentals,
    syncAirlinesToVendors, 
    syncHotelsToVendors,
    resetDatabase, 
    showAirlineForm, 
    saveAirline, 
    deleteAirline, 
    showAirportForm, 
    saveAirport, 
    deleteAirport, 
    showHotelForm,
    saveHotel,
    deleteHotel,
    showRentalForm,
    saveRental,
    deleteRental,
    closeForm 
  };
})();
