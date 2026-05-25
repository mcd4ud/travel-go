/* ========================================
   TMS - Application Router & Core
   ======================================== */
window.TMS = window.TMS || {};

TMS.App = (() => {
  const PAGES = {
    'dashboard': { title: 'Dashboard', icon: 'layout-dashboard', module: 'Dashboard' },
    'flights': { title: 'E-Tiket Pesawat', icon: 'plane', module: 'Flight' },
    'refunds': { title: 'Refund & Void Tracker', icon: 'rotate-ccw', module: 'Refund' },
    'hotels': { title: 'Voucher Hotel', icon: 'hotel', module: 'Hotel' },
    'rentals': { title: 'Voucher Rental', icon: 'car', module: 'Rental' },
    'tours': { title: 'Paket Wisata', icon: 'map', module: 'Tour' },
    'invoices': { title: 'Manajemen Invoice', icon: 'file-text', module: 'Invoice' },
    'customers': { title: 'Manajemen Pelanggan', icon: 'users', module: 'Customer' },
    'vendors': { title: 'Manajemen Vendor & Deposit', icon: 'building-2', module: 'Vendor' },
    'coa': { title: 'Chart of Accounts', icon: 'book', module: 'COA' },
    'expenses': { title: 'Beban Operasional', icon: 'trending-down', module: 'Expenses' },
    'accounting': { title: 'Laporan Keuangan', icon: 'bar-chart-2', module: 'Accounting' },
    'accounting/income': { title: 'Laba Rugi', icon: 'bar-chart-2', module: 'Accounting' },
    'accounting/balance': { title: 'Neraca', icon: 'bar-chart-2', module: 'Accounting' },
    'accounting/cashflow': { title: 'Arus Kas', icon: 'bar-chart-2', module: 'Accounting' },
    'accounting/ledger': { title: 'Buku Besar', icon: 'bar-chart-2', module: 'Accounting' },
    'journals': { title: 'Jurnal Umum', icon: 'clipboard-list', module: 'Accounting' },
    'verify': { title: 'Verifikasi Pembayaran', icon: 'shield-check', module: 'Payment' },
    'fraud': { title: 'Fraud Management', icon: 'shield-alert', module: 'Payment' },
    'settings': { title: 'Pengaturan Sistem', icon: 'settings', module: 'Settings' },
    'users': { title: 'Manajemen User & Akses', icon: 'user-cog', module: 'UserMgmt' },
    'database': { title: 'Database Maskapai & Bandara', icon: 'database', module: 'Database' },
    'superadmin': { title: 'Super Admin Dashboard', icon: 'shield', module: 'SuperAdmin' },
  };

  function navigate(page) {
    const user = TMS.Store.getCurrentUser();
    if (!user) {
      handleRoute(); // Paksa tampilkan login
      return;
    }

    if (page === 'dashboard') {
      if (window.history && window.history.pushState) {
        history.pushState('', document.title, window.location.pathname + window.location.search);
        handleRoute();
      } else {
        window.location.hash = '';
      }
      return;
    }

    if (window.location.hash === '#' + page) {
      handleRoute();
    } else {
      window.location.hash = page;
    }
  }

  function handleRoute() {
    const user = TMS.Store.getCurrentUser();
    const content = document.getElementById('pageContent');
    const appLayout = document.querySelector('.app-layout');

    // 1. Jika belum login, tampilkan layar login
    if (!user) {
      if (appLayout) appLayout.classList.add('hidden');
      
      let loginCont = document.getElementById('loginContainer');
      if (!loginCont) {
        loginCont = document.createElement('div');
        loginCont.id = 'loginContainer';
        document.body.appendChild(loginCont);
      }
      loginCont.classList.remove('hidden');
      loginCont.innerHTML = TMS.Auth.renderLogin();
      
      if (window.lucide) lucide.createIcons();
      return;
    }

    // Jika sudah login, bersihkan tampilan login
    if (appLayout) appLayout.classList.remove('hidden');
    const loginCont = document.getElementById('loginContainer');
    if (loginCont) {
      loginCont.innerHTML = '';
      loginCont.classList.add('hidden');
    }

    // 2. Update UI User di Topbar
    updateUserUI(user);
    updateBrandUI();

    // 3. Update Sidebar (Sembunyikan menu yang tidak diizinkan)
    updateSidebar(user);

    let hash = window.location.hash.replace('#', '');
    if (!hash) {
      if (user && user.role === 'superadmin') {
        hash = 'superadmin';
      } else {
        hash = 'dashboard';
      }
    }
    const page = PAGES[hash] || (user && user.role === 'superadmin' ? PAGES['superadmin'] : PAGES['dashboard']);

    // 4. Cek Hak Akses Halaman
    const baseHash = hash.split('/')[0];
    const baseModule = page.module.toLowerCase();
    const isDashboard = baseHash === 'dashboard';
    
    if (!isDashboard && !TMS.Auth.checkAccess(baseHash) && !TMS.Auth.checkAccess(baseModule)) {
      TMS.App.toast('Anda tidak memiliki akses ke modul ini!', 'error');
      if (window.history && window.history.pushState) {
        history.pushState('', document.title, window.location.pathname + window.location.search);
        handleRoute();
      } else {
        window.location.hash = '';
      }
      return;
    }
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navEl = document.querySelector(`[data-page="${baseHash}"]`);
    if (navEl) navEl.classList.add('active');

    // Update topbar
    const topbarTitle = document.getElementById('topbarTitle');
    if (topbarTitle) topbarTitle.textContent = page.title;

    // Render content
    if (!content) return;

    let html = '';
    const mod = TMS[page.module];

    if (hash === 'dashboard') {
      html = TMS.Dashboard.render();
    } else if (hash === 'flights') {
      html = TMS.Flight.renderList();
    } else if (hash === 'refunds') {
      html = TMS.Refund.renderList();
    } else if (hash === 'hotels') {
      html = TMS.Hotel.renderList();
    } else if (hash === 'rentals') {
      html = TMS.Rental.renderList();
    } else if (hash === 'tours') {
      html = TMS.Tour.renderList();
    } else if (hash === 'invoices') {
      html = TMS.Invoice.renderList();
    } else if (hash === 'customers') {
      html = TMS.Customer.renderList();
    } else if (hash === 'vendors') {
      html = TMS.Vendor.render();
    } else if (hash === 'coa') {
      html = TMS.COA.renderList();
    } else if (hash === 'expenses') {
      html = TMS.Expenses.renderList();
    } else if (hash === 'journals') {
      html = TMS.Accounting.render('journals');
    } else if (hash.startsWith('accounting')) {
      const sub = hash.split('/')[1] || 'income';
      html = TMS.Accounting.render(sub);
    } else if (hash === 'verify') {
      html = TMS.Payment.renderPendingVerifications();
    } else if (hash === 'fraud') {
      html = TMS.Payment.renderFraudMonitor();
    } else if (hash === 'settings') {
      html = TMS.Settings.render();
    } else if (hash === 'users') {
      const u = TMS.Store.getCurrentUser();
      // Superadmin atau Admin perusahaan bisa akses
      if (u && (u.role === 'superadmin' || TMS.Auth.checkAccess('users'))) {
        html = TMS.UserMgmt.render();
      } else {
        html = `
          <div style="text-align:center; padding:40px;">
            <i data-lucide="shield-alert" style="width:48px;height:48px;color:var(--danger);margin-bottom:16px;"></i>
            <h3>Akses Ditolak</h3>
            <p>Anda tidak memiliki akses ke halaman ini.</p>
          </div>
        `;
      }
    } else if (hash === 'database') {
      html = TMS.Database.render();
    } else if (hash === 'superadmin') {
      html = TMS.SuperAdmin ? TMS.SuperAdmin.render() : '<h3>SuperAdmin module not found</h3>';
    }

    content.innerHTML = html;
    window.scrollTo(0, 0);

    // Re-init icons
    if (window.lucide) lucide.createIcons();

    // Init charts for dashboard
    if (hash === 'dashboard') {
      setTimeout(() => TMS.Dashboard.initCharts(), 100);
    }

    // Update invoice badge
    updateBadge();
  }

  function updateBadge() {
    const unpaid = TMS.Store.getAll('invoices').filter(i => i.paymentStatus === 'unpaid').length;
    const badge = document.getElementById('invoiceBadge');
    if (badge) {
      badge.textContent = unpaid;
      badge.style.display = unpaid > 0 ? 'inline-block' : 'none';
    }
    
    const pending = TMS.Store.getAll('payments').filter(p => p.status === 'pending').length;
    const verifyBadge = document.getElementById('verifyBadge');
    if (verifyBadge) {
      verifyBadge.textContent = pending;
      verifyBadge.style.display = pending > 0 ? 'inline-block' : 'none';
    }
  }

  function updateUserUI(user) {
    const nameEl = document.getElementById('userNameDisplay');
    const roleEl = document.getElementById('userRoleDisplay');
    const initialEl = document.getElementById('userInitial');
    
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role.toUpperCase();
    if (initialEl) initialEl.textContent = user.name.charAt(0).toUpperCase();
  }

  function updateBrandUI() {
    try {
      const s = TMS.Store.getSettings() || {};
      const user = TMS.Store.getCurrentUser();
      const titleEl = document.getElementById('appSidebarTitle');
      const footerCompany = document.getElementById('footerCompanyText');
      const logoImg = document.getElementById('appSidebarLogo');
      const breadcrumb = document.querySelector('.topbar-breadcrumb');
      
      let companyName = s.companyName || 'Travel Go';
      if (user && user.role === 'superadmin') {
        companyName = 'Super Admin TMS';
      }

      if (titleEl) titleEl.textContent = 'Travel Go';
      if (footerCompany) footerCompany.textContent = companyName;
      if (breadcrumb) breadcrumb.textContent = companyName + ' • Sistem Manajemen Perjalanan';
      document.title = companyName + ' — Travel Management System';

      if (logoImg) {
        logoImg.src = 'img/logo.png';
      }
    } catch(e) {
      console.error('Error updating brand UI:', e);
    }
  }

  function updateSidebar(user) {
    const isSuperAdmin = user && user.role === 'superadmin';
    
    // Hide nav-section headers for superadmin
    document.querySelectorAll('.nav-section').forEach(section => {
      section.style.display = isSuperAdmin ? 'none' : 'block';
    });

    document.querySelectorAll('.nav-item').forEach(item => {
      const pageKey = item.getAttribute('data-page');
      if (!pageKey) return;
      
      // Khusus superadmin, sembunyikan semua kecuali superadmin, users, dan dashboard
      if (isSuperAdmin) {
        if (pageKey === 'superadmin' || pageKey === 'users' || pageKey === 'dashboard') item.style.display = 'flex';
        else item.style.display = 'none';
        return;
      }
      
      // Dashboard selalu boleh dilihat user biasa
      if (pageKey === 'dashboard') {
        item.style.display = 'flex';
        return;
      }

      // Jangan tampilkan menu superadmin untuk user biasa
      if (pageKey === 'superadmin') {
        item.style.display = 'none';
        return;
      }
      
      // Cek akses dengan pageKey langsung
      const hasAccess = TMS.Auth.checkAccess(pageKey);
      item.style.display = hasAccess ? 'flex' : 'none';
    });
  }

  function toast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = { success: '✓', error: '✕', warning: '⚠' };
    const colors = { success: 'var(--success)', error: 'var(--danger)', warning: 'var(--warning)' };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span style="color:${colors[type]};font-size:16px;">${icons[type]}</span><span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(100px)'; el.style.transition = 'all .3s ease'; setTimeout(() => el.remove(), 300); }, 3500);
  }

  function shareToWhatsApp(type, id) {
    const S = TMS.Store;
    const settings = S.getSettings() || {};
    const companyName = settings.companyName || 'Travel Go';
    
    let booking = null;
    let phone = '';
    let name = '';
    let message = '';
    
    if (type === 'flight') {
      booking = S.getById('flights', id);
      if (!booking) return;
      phone = booking.passengers?.[0]?.phone || booking.passengerPhone || '';
      name = booking.passengers?.[0]?.name || booking.passengerName || '';
      
      const paxDetails = (booking.passengers || []).map(p => `   - ${p.name} (${p.category || 'Adult'})`).join('\n');
      
      message = `Halo *${name}*,\n\n`;
      message += `Terima kasih telah memesan tiket di *${companyName}*.\n\n`;
      message += `Berikut rincian E-Tiket Pesawat Anda:\n`;
      message += `✈ *Kode Booking / PNR:* ${booking.pnr || booking.bookingCode}\n`;
      message += `✈ *Maskapai:* ${booking.airline} ${booking.flightNumber} (${booking.seatClass})\n`;
      message += `✈ *Rute:* ${booking.departureCity} ➔ ${booking.arrivalCity}\n`;
      message += `✈ *Keberangkatan:* ${S.formatDate(booking.departureDate)} ${booking.departureTime || ''}\n`;
      if (booking.tripType === 'round') {
        message += `✈ *Kepulangan:* ${S.formatDate(booking.returnDepartureDate)} ${booking.returnDepartureTime || ''}\n`;
        message += `✈ *Maskapai Pulang:* ${booking.returnAirline} ${booking.returnFlightNumber} (${booking.returnSeatClass || 'Economy'})\n`;
      }
      message += `👥 *Daftar Penumpang:*\n${paxDetails}\n\n`;
      message += `Dokumen E-Tiket resmi Anda akan segera dikirimkan oleh staf kami.\n`;
      message += `Semoga penerbangan Anda menyenangkan! ✈✨`;
      
    } else if (type === 'hotel') {
      booking = S.getById('hotels', id);
      if (!booking) return;
      phone = booking.guestPhone || '';
      name = booking.guestName || '';
      
      message = `Halo *${name}*,\n\n`;
      message += `Terima kasih telah memesan hotel di *${companyName}*.\n\n`;
      message += `Berikut rincian Voucher Hotel Anda:\n`;
      message += `🏨 *Kode Booking:* ${booking.bookingCode}\n`;
      message += `🏨 *Hotel:* ${booking.hotelName}\n`;
      message += `🏨 *Tipe Kamar:* ${booking.roomType}\n`;
      message += `🏨 *Check-in:* ${S.formatDate(booking.checkIn)}\n`;
      message += `🏨 *Check-out:* ${S.formatDate(booking.checkOut)}\n`;
      message += `🏨 *Durasi:* ${booking.nights} Malam\n`;
      message += `🏨 *Sarapan:* ${booking.breakfast || 'Tidak Termasuk'}\n\n`;
      if (booking.specialRequest) {
        message += `📝 *Catatan Khusus:* _"${booking.specialRequest}"_\n\n`;
      }
      message += `Semoga masa inap Anda menyenangkan! 🏨✨`;
      
    } else if (type === 'rental') {
      booking = S.getById('rentals', id);
      if (!booking) return;
      phone = booking.renterPhone || '';
      name = booking.renterName || '';
      
      message = `Halo *${name}*,\n\n`;
      message += `Terima kasih telah memesan rental mobil di *${companyName}*.\n\n`;
      message += `Berikut rincian Rental Mobil Anda:\n`;
      message += `🚗 *Kode Booking:* ${booking.bookingCode}\n`;
      message += `🚗 *Kendaraan:* ${booking.vehicleName} (${booking.vehicleType})\n`;
      message += `🚗 *No. Plat:* ${booking.licensePlate || '-'}\n`;
      message += `🚗 *Layanan:* ${booking.withDriver}\n`;
      message += `🚗 *Pickup:* ${S.formatDate(booking.pickupDate)} (${booking.pickupLocation || '-'})\n`;
      message += `🚗 *Return:* ${S.formatDate(booking.returnDate)} (${booking.returnLocation || '-'})\n`;
      message += `🚗 *Durasi:* ${booking.days} Hari\n\n`;
      message += `Semoga perjalanan Anda aman, nyaman, dan menyenangkan! 🚗✨`;
      
    } else if (type === 'tour') {
      booking = S.getById('tours', id);
      if (!booking) return;
      phone = booking.customerPhone || '';
      name = booking.customerName || '';
      
      message = `Halo *${name}*,\n\n`;
      message += `Terima kasih telah memesan paket wisata di *${companyName}*.\n\n`;
      message += `Berikut rincian Paket Wisata Anda:\n`;
      message += `🗺 *Kode Booking:* ${booking.bookingCode}\n`;
      message += `🗺 *Paket Wisata:* ${booking.tourName}\n`;
      message += `🗺 *Destinasi:* ${booking.destination}\n`;
      message += `🗺 *Keberangkatan:* ${S.formatDate(booking.departureDate)}\n`;
      message += `🗺 *Durasi:* ${booking.days} Hari\n`;
      message += `🗺 *Jumlah Peserta:* ${booking.pax} Pax\n\n`;
      
      if (booking.inclusions) {
        message += `✅ *Fasilitas Termasuk:* \n${booking.inclusions}\n\n`;
      }
      message += `Selamat menikmati liburan seru Anda bersama kami! 🗺✨`;
      
    } else if (type === 'invoice') {
      const invoice = S.getById('invoices', id);
      if (!invoice) return;
      name = invoice.customerName || '';
      
      if (invoice.bookingType === 'flight') {
        const b = S.getById('flights', invoice.bookingId);
        phone = b?.passengers?.[0]?.phone || b?.passengerPhone || '';
      } else if (invoice.bookingType === 'hotel') {
        const b = S.getById('hotels', invoice.bookingId);
        phone = b?.guestPhone || '';
      } else if (invoice.bookingType === 'rental') {
        const b = S.getById('rentals', invoice.bookingId);
        phone = b?.renterPhone || '';
      } else if (invoice.bookingType === 'tour') {
        const b = S.getById('tours', invoice.bookingId);
        phone = b?.customerPhone || '';
      }
      
      if (!phone) {
        const c = S.getAll('customers').find(cust => cust.name === name);
        phone = c?.phone || '';
      }
      
      const typeMap = { flight: 'Tiket Pesawat', hotel: 'Voucher Hotel', rental: 'Rental Mobil', tour: 'Paket Wisata' };
      const services = typeMap[invoice.bookingType] || invoice.bookingType;
      
      message = `Halo *${name}*,\n\n`;
      message += `Berikut adalah tagihan (Invoice) untuk pemesanan *${services}* Anda di *${companyName}*:\n\n`;
      message += `📄 *No. Invoice:* ${invoice.invoiceNumber}\n`;
      message += `📄 *Kode Booking:* ${invoice.bookingCode}\n`;
      message += `📄 *Tanggal Tagihan:* ${S.formatDate(invoice.createdAt)}\n`;
      message += `📄 *Jatuh Tempo:* ${S.formatDate(invoice.dueDate)}\n\n`;
      message += `💰 *TOTAL TAGIHAN: ${S.formatCurrency(invoice.total)}*\n\n`;
      message += `Status Pembayaran: *${invoice.paymentStatus === 'paid' ? 'LUNAS' : 'BELUM LUNAS'}*\n\n`;
      
      if (invoice.paymentStatus !== 'paid') {
        if (invoice.paymentMethod === 'bank' && invoice.receivingBankName) {
          message += `🏦 *Metode Pembayaran (Transfer Bank):*\n`;
          message += `   - Bank: ${invoice.receivingBankName}\n`;
          message += `   - No Rekening: ${invoice.receivingAccountNo}\n`;
          message += `   - Atas Nama: ${invoice.receivingAccountName}\n\n`;
        }
        message += `Silakan lakukan pembayaran sebelum tanggal jatuh tempo. Jika sudah melakukan transfer, harap kirimkan bukti pembayaran kepada kami. Terima kasih! 🙏✨`;
      } else {
        message += `Terima kasih banyak atas pembayaran Anda! 🙏✨`;
      }
    }
    
    let cleanPhone = '';
    if (phone) {
      cleanPhone = phone.replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '62' + cleanPhone.slice(1);
      }
    }
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  }

  function init() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();

    // Mobile sidebar toggle
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    if (menuBtn && sidebar) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('open');
      });
    }
    
    // Auto close sidebar on mobile when clicking nav items or main content
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 768 && sidebar) sidebar.classList.remove('open');
      });
    });
    if (mainContent && sidebar) {
      mainContent.addEventListener('click', () => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
          sidebar.classList.remove('open');
        }
      });
    }
  }

  return { navigate, init, toast, updateBadge, handleRoute, shareToWhatsApp };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  if (window.TMS && window.TMS.Firebase) {
    window.TMS.Firebase.init();
    if (TMS.Store && TMS.Store.initFirebase) {
      await TMS.Store.initFirebase();
    }
  }
  if (TMS.Database && TMS.Database.checkInitData) {
    TMS.Database.checkInitData();
  }
  TMS.App.init();
});
