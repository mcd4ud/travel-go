/* ========================================
   TMS - Dashboard Module (Redesigned)
   ======================================== */
TMS.Dashboard = (() => {
  const { getStats, formatCurrency, formatDate, getAll } = TMS.Store;
  let revenueChart = null, statusChart = null;

  function render() {
    const stats = getStats();
    const user = TMS.Store.getCurrentUser();
    
    // PnL Calculations
    const expenses = getAll('expenses').reduce((sum, e) => sum + (e.amount || 0), 0);
    const pendapatan = stats.totalRevenue || 0;
    const hpp = stats.totalCost || 0;
    const labaRugi = pendapatan - hpp - expenses;
    const isLoss = labaRugi < 0;
    
    const flights = getAll('flights');
    const hotels = getAll('hotels');
    const rentals = getAll('rentals');
    const tours = getAll('tours');
    const recentAll = [...flights.map(f => ({ ...f, _type: 'flight' })),
      ...hotels.map(h => ({ ...h, _type: 'hotel' })),
      ...rentals.map(r => ({ ...r, _type: 'rental' })),
      ...tours.map(t => ({ ...t, _type: 'tour' }))]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

    const fraudAlerts = TMS.Store.getFraudAlert();
    const fraudBanner = fraudAlerts.length > 0 ? `
    <div style="background:var(--danger-bg);border:1px solid rgba(239,68,68,0.2);border-radius:16px;padding:16px;margin-bottom:28px;display:flex;align-items:center;gap:16px;animation:pulse 2s infinite;">
      <div style="width:48px;height:48px;background:var(--danger);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 8px 16px rgba(239,68,68,0.3);">
        <i data-lucide="shield-alert"></i>
      </div>
      <div>
        <div style="font-weight:800;color:var(--danger);font-size:16px;">${fraudAlerts.length} Aktivitas Mencurigakan Terdeteksi</div>
        <div style="color:var(--text-secondary);font-size:13px;">Segera verifikasi data pembayaran untuk menghindari kerugian.</div>
      </div>
      <button class="btn btn-danger" onclick="TMS.App.navigate('fraud')" style="margin-left:auto;">Periksa Log</button>
    </div>` : '';

    return `
    <div class="fade-in">
      <!-- Greeting Section -->
      <div style="margin-bottom:32px; display:flex; justify-content:space-between; align-items:flex-end;">
        <div>
          <h2 style="font-size:24px; font-weight:800; color:var(--text-primary); margin-bottom:4px;">Selamat Datang, ${user ? user.name : 'User'}!</h2>
          <p style="color:var(--text-secondary); font-size:14px;">Berikut adalah ringkasan operasional Travel Go hari ini.</p>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700; color:var(--primary); font-size:14px;">${(TMS.Store.getSettings() || {}).companyName || 'Travel Go'}</div>
          <div style="font-size:12px; color:var(--text-muted);" id="dashClock"></div>
        </div>
      </div>

      ${fraudBanner}

      <!-- Row 1: Key Statistics -->
      <div class="stat-grid" style="margin-bottom:32px;">
        <div class="stat-card blue">
          <div class="stat-icon blue"><i data-lucide="plane"></i></div>
          <div class="stat-value">${stats.totalFlights}</div>
          <div class="stat-label">Tiket Pesawat</div>
          <div class="stat-change up"><i data-lucide="trending-up"></i> Pertumbuhan Positif</div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon green"><i data-lucide="hotel"></i></div>
          <div class="stat-value">${stats.totalHotels}</div>
          <div class="stat-label">Voucher Hotel</div>
          <div class="stat-change up"><i data-lucide="check-circle"></i> Status Aktif</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-icon orange"><i data-lucide="car"></i></div>
          <div class="stat-value">${stats.totalRentals}</div>
          <div class="stat-label">Rental Mobil</div>
          <div class="stat-change up"><i data-lucide="clock"></i> On Schedule</div>
        </div>
        <div class="stat-card purple">
          <div class="stat-icon purple"><i data-lucide="map"></i></div>
          <div class="stat-value">${stats.totalTours || 0}</div>
          <div class="stat-label">Paket Wisata</div>
          <div class="stat-change up"><i data-lucide="users"></i> Grup Terdaftar</div>
        </div>
      </div>

      <!-- Row 2: Financial Widgets -->
      <div style="display:grid; grid-template-columns:1fr 2fr 1fr; gap:20px; margin-bottom:32px; align-items:stretch;">

        <!-- Widget: Total Piutang -->
        <div class="card" style="padding:24px; display:flex; flex-direction:column; justify-content:center;">
          <div class="stat-label" style="margin-bottom:12px; font-size:11px; letter-spacing:0.5px;">TOTAL PIUTANG (UNPAID)</div>
          <div style="font-size:30px; font-weight:800; color:var(--danger); line-height:1; margin-bottom:10px;">${formatCurrency(stats.unpaidAmount)}</div>
          <p style="font-size:12px; color:var(--text-muted); margin:0;">Dari ${stats.unpaidCount} invoice yang belum dilunasi.</p>
          <button class="btn btn-sm btn-outline" style="margin-top:16px; width:fit-content; font-size:11px;" onclick="TMS.App.navigate('invoices')">Lihat Invoice →</button>
        </div>

        <!-- Widget: Arus Kas Chart -->
        <div class="card" style="padding:20px; display:flex; flex-direction:column;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>
              <div style="font-weight:700; font-size:14px; color:var(--text-primary);">Arus Kas</div>
              <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Kas masuk & keluar 7 hari terakhir</div>
            </div>
            <div style="display:flex; gap:16px; font-size:11px; align-items:center;">
              <span style="display:flex; align-items:center; gap:5px; color:var(--text-secondary);"><span style="width:10px;height:10px;border-radius:2px;background:rgba(45,212,191,0.7);display:inline-block;"></span>Kas Masuk</span>
              <span style="display:flex; align-items:center; gap:5px; color:var(--text-secondary);"><span style="width:10px;height:10px;border-radius:2px;background:rgba(244,63,94,0.7);display:inline-block;"></span>Kas Keluar</span>
              <span style="display:flex; align-items:center; gap:5px; color:var(--text-secondary);"><span style="width:10px;height:10px;border-radius:50%;background:#3b82f6;display:inline-block;"></span>Net</span>
            </div>
          </div>
          <div style="flex:1; position:relative; min-height:160px;">
            <canvas id="cashFlowChart"></canvas>
          </div>
        </div>

        <!-- Widget: Laba/Rugi -->
        <div class="card" style="display:flex; flex-direction:column; padding:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:12px; margin-bottom:16px;">
            <div style="font-weight:700; font-size:14px; color:var(--text-primary);">Laba/Rugi Tahun ini</div>
            <div style="font-size:11px; color:var(--text-muted); display:flex; align-items:center; gap:4px;"><i data-lucide="calendar" style="width:14px;height:14px;"></i> Tahun Berjalan</div>
          </div>
          <div style="display:flex; align-items:center; gap:16px; flex:1;">
            <div style="width:100px; height:100px; position:relative; flex-shrink:0;">
              <canvas id="pnlChart"></canvas>
            </div>
            <div style="flex:1; display:flex; flex-direction:column; justify-content:center;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:11px;">
                <span style="display:flex; align-items:center; gap:6px; color:var(--text-secondary);"><span style="width:8px; height:8px; border-radius:50%; background:#2dd4bf;"></span>Pendapatan</span>
                <span style="font-weight:600; color:var(--text-primary); font-size:11px;">${formatCurrency(pendapatan)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:11px;">
                <span style="display:flex; align-items:center; gap:6px; color:var(--text-secondary);"><span style="width:8px; height:8px; border-radius:50%; background:#fbbf24;"></span>HPP</span>
                <span style="font-weight:600; color:var(--text-primary); font-size:11px;">${formatCurrency(hpp)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:11px;">
                <span style="display:flex; align-items:center; gap:6px; color:var(--text-secondary);"><span style="width:8px; height:8px; border-radius:50%; background:#f43f5e;"></span>Beban</span>
                <span style="font-weight:600; color:var(--text-primary); font-size:11px;">${formatCurrency(expenses)}</span>
              </div>
              <div style="border-top:1px solid var(--border-color); padding-top:10px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:800; font-size:13px; color:var(--text-primary);">${isLoss ? 'Rugi' : 'Laba'}</span>
                <span style="font-weight:800; font-size:14px; color:${isLoss ? '#f43f5e' : '#2dd4bf'};">${formatCurrency(Math.abs(labaRugi))}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Row 3: Charts & Recent Activity -->
      <div class="grid-3">
        <!-- Analytics -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Analisis Transaksi</div>
              <div class="card-subtitle">Tren penyelesaian pembayaran 7 hari terakhir</div>
            </div>
            <div class="badge badge-primary">Real-time</div>
          </div>
          <div class="chart-container" style="height:320px;"><canvas id="revenueChart"></canvas></div>
        </div>

        <!-- Recent Transactions -->
        <div class="card" style="display:flex; flex-direction:column;">
          <div class="card-header">
            <div class="card-title">Aktivitas Terakhir</div>
          </div>
          <div style="flex:1;">
            ${recentAll.length === 0 ? '<div class="table-empty">Belum ada data</div>' : 
              recentAll.map(b => `
                <div style="padding:12px 0; border-bottom:1px solid var(--border-color); display:flex; align-items:center; gap:12px;">
                  <div style="width:36px; height:36px; border-radius:10px; background:var(--bg-primary); display:flex; align-items:center; justify-content:center; color:var(--bg-sidebar); font-size:14px;">
                    <i data-lucide="${b._type === 'flight' ? 'plane' : b._type === 'hotel' ? 'hotel' : 'car'}" style="width:18px; height:18px;"></i>
                  </div>
                  <div style="flex:1;">
                    <div style="font-weight:700; font-size:13px; color:var(--text-primary);">${b.bookingCode}</div>
                    <div style="font-size:11px; color:var(--text-muted);">${b.passengerName || b.guestName || b.customerName}</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-weight:700; font-size:12px; color:var(--text-primary);">${formatCurrency(b.sellingPrice)}</div>
                    <div style="font-size:10px;">${statusBadge(b.paymentStatus)}</div>
                  </div>
                </div>
              `).join('')
            }
          </div>
          <button class="btn btn-ghost" style="width:100%; margin-top:16px; font-size:12px;" onclick="TMS.App.navigate('invoices')">Lihat Semua Transaksi →</button>
        </div>
      </div>
    </div>`;
  }

  function statusBadge(status) {
    return status === 'paid' ? '<span style="color:var(--success); font-weight:700;">Lunas</span>' : '<span style="color:var(--danger); font-weight:700;">Menunggu</span>';
  }

  function initCharts() {
    const invoices = getAll('invoices');
    const days = [];
    const paid = [], unpaid = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      days.push(label);
      const dayStr = d.toISOString().split('T')[0];
      paid.push(invoices.filter(inv => inv.paymentStatus === 'paid' && inv.createdAt?.startsWith(dayStr)).length);
      unpaid.push(invoices.filter(inv => inv.paymentStatus === 'unpaid' && inv.createdAt?.startsWith(dayStr)).length);
    }

    const rc = document.getElementById('revenueChart');
    if (!rc) return;

    if (revenueChart) revenueChart.destroy();

    // Chart colors for Light Navy & Gold theme
    const chartDefaults = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#475569', font: { family: 'Inter', size: 12, weight: '600' }, usePointStyle: true, padding: 20 }
        }
      },
      scales: {
        x: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { display: false } },
        y: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { color: '#f1f5f9' }, beginAtZero: true }
      }
    };

    revenueChart = new Chart(rc, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [
          { label: 'Lunas', data: paid, backgroundColor: '#051139', borderRadius: 6, barThickness: 20 },
          { label: 'Belum Lunas', data: unpaid, backgroundColor: '#B89E67', borderRadius: 6, barThickness: 20 }
        ]
      },
      options: chartDefaults
    });

    // --- Arus Kas Chart ---
    initCashFlowChart();

    const pc = document.getElementById('pnlChart');
    if (pc) {
      const stats = TMS.Store.getStats();
      const expenses = TMS.Store.getAll('expenses').reduce((sum, e) => sum + (e.amount || 0), 0);
      const pendapatan = stats.totalRevenue || 0;
      const hpp = stats.totalCost || 0;
      
      // Prevent chart from completely breaking if all are 0
      const hasData = (pendapatan + hpp + expenses) > 0;

      new Chart(pc, {
        type: 'doughnut',
        data: {
          labels: ['Pendapatan', 'Nilai HPP', 'Pengeluaran'],
          datasets: [{
            data: hasData ? [pendapatan, hpp, expenses] : [1],
            backgroundColor: hasData ? ['#2dd4bf', '#fbbf24', '#f43f5e'] : ['#e2e8f0'],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '75%',
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: hasData,
              callbacks: {
                label: function(context) {
                  return ' ' + context.label + ': ' + TMS.Store.formatCurrency(context.raw);
                }
              }
            }
          }
        }
      });
    }

    // Update Dashboard Clock
    const clock = document.getElementById('dashClock');
    if (clock) {
      const updateClock = () => {
        clock.textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
      };
      updateClock();
      setInterval(updateClock, 1000);
    }
  }

  function initCashFlowChart() {
    const cfCanvas = document.getElementById('cashFlowChart');
    if (!cfCanvas) return;

    const invoices = getAll('invoices');
    const journals = getAll('journals');
    const expenses = getAll('expenses');

    const labels = [];
    const kasInData = [];
    const kasOutData = [];
    const netData = [];

    const flights  = getAll('flights');
    const hotels   = getAll('hotels');
    const rentals  = getAll('rentals');
    const tours    = getAll('tours');

    // Helper: ambil tanggal layanan dari invoice (berdasarkan bookingType & bookingId)
    function getServiceDate(inv) {
      if (inv.bookingType === 'flight') {
        return flights.find(f => f.id === inv.bookingId)?.departureDate || '';
      } else if (inv.bookingType === 'hotel') {
        return hotels.find(h => h.id === inv.bookingId)?.checkIn || '';
      } else if (inv.bookingType === 'rental') {
        return rentals.find(r => r.id === inv.bookingId)?.pickupDate || '';
      } else if (inv.bookingType === 'tour') {
        return tours.find(t => t.id === inv.bookingId)?.departureDate || '';
      }
      return '';
    }

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const dayStr = d.toISOString().split('T')[0];
      labels.push(label);

      // ── KAS MASUK ──────────────────────────────────────────────────
      // Gunakan tanggal layanan booking (bukan paidAt/createdAt yg selalu = hari ini)
      const kasIn = invoices
        .filter(inv => inv.paymentStatus === 'paid' && getServiceDate(inv).startsWith(dayStr))
        .reduce((sum, inv) => sum + (inv.total || 0), 0);

      // ── KAS KELUAR ─────────────────────────────────────────────────
      // 1. Beban operasional: gunakan e.date (tanggal yg diinput user di form)
      const expOut = expenses
        .filter(e => (e.date || '').startsWith(dayStr))
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      // 2. Modal tiket/hotel/rental/tour (kas keluar ke vendor): gunakan tanggal layanan
      const bookingCostOut = [
        ...flights .filter(f => (f.departureDate || '').startsWith(dayStr)).map(f => f.costPrice || 0),
        ...hotels  .filter(h => (h.checkIn      || '').startsWith(dayStr)).map(h => h.costPrice || 0),
        ...rentals .filter(r => (r.pickupDate   || '').startsWith(dayStr)).map(r => r.costPrice || 0),
        ...tours   .filter(t => (t.departureDate|| '').startsWith(dayStr)).map(t => t.costPrice || 0),
      ].reduce((sum, v) => sum + v, 0);

      // 3. Jurnal manual (input langsung oleh user): gunakan j.date
      const journalOut = journals
        .filter(j => (j.date || '').startsWith(dayStr) &&
          ['purchase', 'cost', 'payment_vendor', 'vendor_payment'].includes(j.type))
        .reduce((sum, j) =>
          sum + (j.entries || [])
            .filter(en => en.credit > 0 && (en.accountCode || '').startsWith('1-1'))
            .reduce((s, en) => s + (en.credit || 0), 0)
        , 0);

      const kasOut = expOut + bookingCostOut + journalOut;

      kasInData.push(kasIn);
      kasOutData.push(kasOut);
      netData.push(kasIn - kasOut);
    }

    new Chart(cfCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Kas Masuk',
            data: kasInData,
            backgroundColor: 'rgba(45,212,191,0.65)',
            borderRadius: 4,
            barThickness: 18,
            order: 2
          },
          {
            label: 'Kas Keluar',
            data: kasOutData.map(v => -v),
            backgroundColor: 'rgba(244,63,94,0.65)',
            borderRadius: 4,
            barThickness: 18,
            order: 2
          },
          {
            label: 'Net',
            data: netData,
            type: 'line',
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.1)',
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#3b82f6',
            tension: 0.4,
            fill: false,
            order: 1,
            yAxisID: 'y'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${TMS.Store.formatCurrency(Math.abs(ctx.raw))}`
            }
          }
        },
        scales: {
          x: {
            stacked: false,
            ticks: { color: '#64748b', font: { size: 10 } },
            grid: { display: false }
          },
          y: {
            ticks: {
              color: '#64748b',
              font: { size: 10 },
              callback: v => {
                if (Math.abs(v) >= 1000000) return (v / 1000000).toFixed(1) + ' jt';
                if (Math.abs(v) >= 1000) return (v / 1000).toFixed(0) + ' rb';
                return v;
              }
            },
            grid: { color: '#f1f5f9' }
          }
        }
      }
    });
  }

  return { render, initCharts };
})();
