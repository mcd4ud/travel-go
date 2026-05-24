/* ========================================
   TMS - PDF Generator Module (Premium Redesign v3)
   ======================================== */
TMS.PDF = (() => {
  const { formatCurrency, formatDate, getSettings } = TMS.Store;

  function createDoc(orientation = 'portrait') {
    return new jspdf.jsPDF({ orientation, unit: 'mm', format: 'a4' });
  }

  // --- PREMIUM HEADER ---
  function addHeader(doc, title, subtitle) {
    const s = getSettings();
    
    // Draw blue wave/slant in top right
    doc.setFillColor(11, 26, 48);
    doc.triangle(150, 0, 210, 0, 210, 25, 'F');
    doc.rect(210, 0, 10, 25, 'F'); 

    // Main brand text (Left)
    doc.setTextColor(30, 30, 30);
    let textX = 14;
    if (s.companyLogo) {
      try {
        doc.addImage(s.companyLogo, 'PNG', 14, 10, 25, 25);
        textX = 45;
      } catch (e) {}
    }
    
    doc.setFontSize(18); doc.setFont(undefined, 'bold');
    doc.text(s.companyName, textX, 18);
    doc.setFontSize(8); doc.setFont(undefined, 'normal'); doc.setTextColor(100);
    doc.text(s.companyAddress, textX, 23, { maxWidth: 100 });
    doc.text(`${s.companyPhone} | ${s.companyEmail}`, textX, 32);

    // Document Title (Right)
    doc.setTextColor(214, 189, 150);
    doc.setFontSize(16); doc.setFont(undefined, 'bold');
    doc.text(title.toUpperCase(), 196, 40, { align: 'right' });
    if (subtitle) {
      doc.setFontSize(8); doc.setTextColor(150); doc.setFont(undefined, 'normal');
      doc.text(subtitle, 196, 45, { align: 'right' });
    }

    doc.setDrawColor(224, 230, 237);
    doc.line(14, 52, 196, 52);
    
    return 60;
  }

  function addPremiumFooter(doc) {
    const s = getSettings();
    const y = 255;
    doc.setDrawColor(224, 230, 237); doc.line(14, y, 196, y);
    doc.setFontSize(8); doc.setTextColor(11, 26, 48);
    doc.text(`Hubungi Kami: ${s.companyPhone} | ${s.companyEmail}`, 196, y + 8, { align: 'right' });
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7); doc.setTextColor(180);
      doc.text(`${s.companyName} — Halaman ${i} / ${pageCount}`, 105, 290, { align: 'center' });
    }
  }

  function addPaidStamp(doc, x, y) {
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.8 }));
    doc.setDrawColor(7, 112, 227); doc.setLineWidth(1); doc.circle(x, y, 15, 'S');
    doc.setFillColor(7, 112, 227); doc.rect(x - 18, y - 4, 36, 8, 'F');
    doc.setTextColor(255); doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.text('PAID', x, y + 2, { align: 'center' });
    doc.setTextColor(7, 112, 227); doc.setFontSize(6); doc.text('TRAVEL GO', x, y - 6, { align: 'center' }); doc.text('VERIFIED', x, y + 8, { align: 'center' });
    doc.restoreGraphicsState();
  }

  function addSectionHeader(doc, y, title) {
    doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(30);
    doc.text(title.toUpperCase(), 14, y);
    return y + 6;
  }

  function addKeyValue(doc, y, key, value, x1 = 14, x2 = 50) {
    doc.setFontSize(8); doc.setTextColor(120); doc.setFont(undefined, 'normal');
    doc.text(key, x1, y);
    doc.setTextColor(40); doc.setFont(undefined, 'bold');
    doc.text(': ' + String(value || '-'), x2, y);
    return y + 6;
  }


  const PREMIUM_CSS = `
    .pdf-wrap { width:800px; height:1131px; font-family:'Inter',sans-serif; background: linear-gradient(180deg, #eef2f7 0%, #d4e0eb 100%); position:relative; overflow:hidden; box-sizing:border-box; color:#333; }
    .pdf-header { background-color: #0b1a30; padding: 40px; color: #fff; height: 140px; box-sizing: border-box; position:relative; z-index:20; }
    .pdf-title { font-size: 38px; font-weight: 700; margin: 0; color:#fff; letter-spacing:-1px; }
    .pdf-subtitle { font-size: 18px; color: #d6bd96; margin-top: 5px; font-weight: 500; }
    .pdf-body { padding: 40px; position:relative; z-index:10; }
    .pdf-cloud-bg { position:absolute; bottom:120px; left:0; width:100%; height:400px; background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg"><path fill="%23ffffff" fill-opacity="0.9" d="M0,160L48,165.3C96,171,192,181,288,160C384,139,480,85,576,96C672,107,768,181,864,197.3C960,213,1056,171,1152,149.3C1248,128,1344,128,1392,128L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>') no-repeat bottom; background-size: cover; z-index: 1; }
    .pdf-footer { position:absolute; bottom:0; left:0; width:100%; height: 120px; background-color: #0b1a30; display:flex; padding: 25px 40px; box-sizing:border-box; color:#fff; z-index:10; align-items:center; gap:20px; }
    .flex-between { display: flex; justify-content: space-between; }
    .flex-col { display:flex; flex-direction:column; }
    .text-right { text-align: right; }
    .text-sm { font-size: 13px; color: #777; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; }
    .text-bold { font-weight: 700; color: #111; font-size: 16px; }
    .airline-logo { max-width: 140px; max-height: 45px; object-fit: contain; margin-bottom:10px; }
    .info-boxes { display: flex; gap: 15px; margin-top: 40px; }
    .info-box { flex:1; border: 2px solid #d6bd96; border-radius: 8px; padding: 15px; display:flex; align-items:center; gap:15px; background:rgba(255,255,255,0.6); }
    .info-icon { width:45px; height:45px; background:#0b1a30; color:#d6bd96; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:bold; flex-shrink:0; }
    .data-table { width: 100%; border-collapse: collapse; margin-top: 40px; background:rgba(255,255,255,0.9); position:relative; z-index:20;}
    .data-table th { background: #e0e5eb; padding: 15px; text-align: left; font-size: 14px; font-weight:700; color:#333; border-bottom:2px solid #d0d7e0; }
    .data-table td { padding: 15px; border-bottom: 1px solid #e0e5eb; font-size: 15px; color:#111; }
    .timeline { border-left: 2px solid #a0b2c6; padding-left: 30px; margin-left: 15px; position: relative; padding-bottom:10px;}
    .timeline::before { content:''; position:absolute; left:-8px; top:0; width:14px; height:14px; border-radius:50%; background:#0b1a30; }
    .timeline::after { content:''; position:absolute; left:-8px; bottom:0; width:10px; height:10px; border-radius:50%; border:2px solid #0b1a30; background:#eef2f7; }
    .brand-logo { position:absolute; top:35px; right:40px; height:50px; }
    .badge-red { background:#e74c3c; color:#fff; padding:4px 10px; border-radius:12px; font-size:11px; font-weight:bold; display:inline-block; margin-top:5px; }
    .pre-footer { position:absolute; bottom:120px; left:0; width:100%; padding:0 40px 15px; display:flex; justify-content:space-between; z-index:20; border-bottom:1px solid #d6bd96; margin-bottom:15px;}
  `;

  async function generateFromHTML(htmlContent, filename) {
    if (!window.html2canvas) {
      alert("Memuat engine PDF (html2canvas), silakan coba lagi dalam beberapa detik.");
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      document.head.appendChild(script);
      return;
    }
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    document.body.appendChild(container);
    try {
      const canvas = await html2canvas(container.firstElementChild, { 
        scale: 4, 
        useCORS: true, 
        allowTaint: true,
        logging: false,
        backgroundColor: null
      });
      const imgData = canvas.toDataURL('image/png');
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const doc = new jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, imgHeight]
      });
      
      doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      doc.save(filename);
    } catch(err) {
      console.error(err);
      alert('Gagal menghasilkan PDF');
    } finally {
      document.body.removeChild(container);
    }
  }

  async function generateMultiPageFromHTML(htmlContents, filename) {
    if (!window.html2canvas) {
      alert("Memuat engine PDF (html2canvas), silakan coba lagi dalam beberapa detik.");
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      document.head.appendChild(script);
      return;
    }
    
    const doc = new jspdf.jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    for (let i = 0; i < htmlContents.length; i++) {
      const container = document.createElement('div');
      container.innerHTML = htmlContents[i];
      document.body.appendChild(container);
      
      try {
        const canvas = await html2canvas(container.firstElementChild, { 
          scale: 4, 
          useCORS: true, 
          allowTaint: true,
          logging: false,
          backgroundColor: null
        });
        const imgData = canvas.toDataURL('image/png');
        
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (i > 0) doc.addPage();
        doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      } catch(err) {
        console.error(err);
      } finally {
        document.body.removeChild(container);
      }
    }
    
    doc.save(filename);
  }

  // --- E-TICKET (REDESIGN v4 - Nusantara Style) ---
  function generateETicket(booking) {
    const s = getSettings();

    const parseLoc = (str) => {
      if (!str) return { city: '', code: '' };
      const match = str.match(/(.*)\s\((.*)\)/);
      return match ? { city: match[1].trim(), code: match[2].trim() } : { city: str, code: str.substring(0,3).toUpperCase() };
    };

    const dep  = parseLoc(booking.departureCity);
    const arr  = parseLoc(booking.arrivalCity);

    const fmtDate = (d) => {
      if (!d) return '-';
      const dt = new Date(d);
      if (isNaN(dt)) return d;
      const months = ['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGT','SEP','OKT','NOV','DES'];
      return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
    };

    const isRound = booking.tripType === 'round' || (booking.returnFlightNumber && booking.returnDepartureDate);
    const pageHeight = isRound ? 1040 : 842;

    // Build passenger rows
    const firstPax = (booking.passengers && booking.passengers[0]) ? booking.passengers[0] : { name: booking.passengerName || '-' };
    const allPaxNames = (booking.passengers || [{ name: booking.passengerName || '-' }])
      .map((p, i) => `<div style="margin-bottom:4px;"><span style="color:#aaa;font-size:11px;">${i+1}.</span> <strong>${p.name}</strong> <span style="color:#999;font-size:11px;">(${p.category || 'Adult'})</span></div>`)
      .join('');

    // QR code
    const qrData = encodeURIComponent(`${booking.bookingCode}|${booking.pnr || ''}`);
    const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?data=${qrData}&size=100x100&color=1a2b5c`;

    // Flight section builder
    const flightSection = (label, opts) => `
      <div style="background:#c9a844;padding:8px 16px;">
        <div style="font-size:11px;font-weight:800;color:#1a2b5c;letter-spacing:1px;">${label}</div>
      </div>
      <div style="padding:14px 16px;background:#1a2b5c;color:#fff;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <!-- Origin -->
          <div style="min-width:90px;">
            <div style="font-size:10px;color:#a0b2c6;font-weight:600;text-transform:uppercase;">${opts.fromCity}</div>
            <div style="font-size:36px;font-weight:800;color:#fff;line-height:1;">${opts.fromCode}</div>
          </div>
          <!-- Middle -->
          <div style="flex:1;text-align:center;padding:0 10px;">
            <div style="font-size:10px;color:#d6bd96;font-weight:600;">${opts.airline}</div>
            <div style="font-size:24px;color:#fff;">✈</div>
            <div style="font-size:10px;color:#d6bd96;">${opts.flightNumber}</div>
          </div>
          <!-- Destination -->
          <div style="min-width:90px;text-align:right;">
            <div style="font-size:10px;color:#a0b2c6;font-weight:600;text-transform:uppercase;">${opts.toCity}</div>
            <div style="font-size:36px;font-weight:800;color:#fff;line-height:1;">${opts.toCode}</div>
          </div>
        </div>
        <!-- Info row -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px;border-top:1px dashed rgba(255,255,255,0.2);padding-top:10px;">
          <div>
            <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">DATE</div>
            <div style="font-size:11px;font-weight:700;color:#fff;">${opts.date}</div>
          </div>
          <div>
            <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">FLIGHT NO.</div>
            <div style="font-size:11px;font-weight:700;color:#fff;">${opts.flightNumber}</div>
          </div>
          <div>
            <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">GATES</div>
            <div style="font-size:11px;font-weight:700;color:#fff;">-</div>
          </div>
          <div>
            <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">CLASS</div>
            <div style="font-size:11px;font-weight:700;color:#fff;">${opts.seat || '-'}</div>
          </div>
          <div>
            <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">TIME</div>
            <div style="font-size:11px;font-weight:700;color:#fff;">${opts.depTime} - ${opts.arrTime}</div>
          </div>
          <div>
            <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">TERMINAL</div>
            <div style="font-size:11px;font-weight:700;color:#fff;">${opts.terminal || '-'}</div>
          </div>
          <div style="grid-column:span 2;">
            <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">BAGGAGE</div>
            <div style="font-size:11px;font-weight:700;color:#fff;">${opts.baggage || '20'} kg (Included)</div>
          </div>
        </div>
      </div>`;

    const depSection  = flightSection('PENERBANGAN PERGI / DEPARTURE FLIGHT', {
      fromCity: dep.city, fromCode: dep.code,
      toCity: arr.city,   toCode: arr.code,
      airline: booking.airline || '-', flightNumber: booking.flightNumber || '-',
      date: fmtDate(booking.departureDate),
      depTime: booking.departureTime || '--:--', arrTime: booking.arrivalTime || '--:--',
      terminal: booking.departureTerminal || '-',
      seat: booking.seatClass || (booking.passengers && booking.passengers[0]?.seat) || '-',
      baggage: booking.departureBaggage || '20'
    });

    const retSection = isRound ? flightSection('PENERBANGAN PULANG / RETURN FLIGHT', {
      fromCity: arr.city, fromCode: arr.code,
      toCity: dep.city,   toCode: dep.code,
      airline: booking.returnAirline || booking.airline || '-', flightNumber: booking.returnFlightNumber || '-',
      date: fmtDate(booking.returnDepartureDate),
      depTime: booking.returnDepartureTime || '--:--', arrTime: booking.returnArrivalTime || '--:--',
      terminal: booking.returnDepartureTerminal || '-',
      seat: booking.returnSeatClass || '-',
      baggage: booking.returnBaggage || '20'
    }) : '';

    const html = `
    <div style="position:fixed;top:-9999px;left:0;width:595px;font-family:'Inter',Arial,sans-serif;background:#f4f6f8;box-sizing:border-box;color:#111;">
      <div style="width:595px;min-height:${pageHeight}px;background:#f4f6f8;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;position:relative;">

        <!-- HEADER (Hotel Style) -->
        <div style="background:#0b1a30; height: 100px; padding: 25px 40px; justify-content: space-between; align-items: center; display: flex;">
          <div>
            <h1 style="font-weight: 300; font-size: 32px; color: #a0b2c6; margin: 0;">E-Ticket</h1>
            <div style="font-size: 16px; margin-top: 2px; color: #d6bd96;">Flight Itinerary Details</div>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="text-align:right;">
              <div style="font-size:16px; font-weight:700; color:#fff; line-height:1;">${s.companyName}</div>
              <div style="font-size:9px; color:#a0b2c6; margin-top:2px; font-weight:400;">Authorized Agent</div>
            </div>
            ${s.companyLogo ? `<img src="${s.companyLogo}" style="height:50px; object-fit:contain;">` : ''}
          </div>
        </div>

        <div style="padding:16px 24px 0;">

          <!-- BOOKING REFERENCE -->
          <div style="background:#fff; border: 1px solid #d6bd96; border-radius:10px; padding:10px 20px; margin-bottom:12px; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <div style="font-size:9px; color:#666; letter-spacing:2px; text-transform:uppercase; margin-bottom:4px;">KODE PEMESANAN / BOOKING REFERENCE:</div>
            <div style="font-size:28px; font-weight:900; color:#1a2b5c; letter-spacing:4px; line-height:1.2;">${booking.pnr || booking.bookingCode}</div>
          </div>

          <div style="display: flex; gap: 14px; margin-bottom: 12px;">
            <!-- PASSENGER DETAILS -->
            <div style="background:#fff; border-radius:10px; overflow:hidden; flex: 2; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
              <div style="background:#1a2b5c; padding:10px 16px; display:flex; align-items:center; gap:8px;">
                <span style="color:#c9a844; font-size:14px;">👤</span>
                <span style="font-size:11px; font-weight:800; color:#fff; letter-spacing:1px;">DETAIL PENUMPANG</span>
              </div>
              <div style="padding:14px 16px;">
                ${allPaxNames}
                <div style="margin-top:6px; font-size:11px; color:#555;">
                  <span style="color:#999;">NOMOR TIKET :</span> <strong>${booking.ticketNumber || booking.bookingCode}</strong>
                </div>
              </div>
            </div>
            
            <!-- QR CODE -->
            <div style="background:#fff; border-radius:10px; padding:16px; flex: 1; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,0.06); display:flex; flex-direction:column; align-items:center; justify-content:center;">
              <img src="${qrUrl}" width="80" height="80" style="border:2px solid #1a2b5c; border-radius:6px;">
              <div style="font-size:8px; color:#999; margin-top:8px; letter-spacing:1px;">SCAN FOR VERIFICATION</div>
            </div>
          </div>

          <!-- FLIGHT DETAILS -->
          <div style="background:#fff; border-radius:10px; overflow:hidden; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            ${depSection}
            ${retSection}
          </div>

          <!-- IMPORTANT INFO -->
          <div style="background:#fff; border-radius:10px; overflow:hidden; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="background:#1a2b5c; padding:10px 16px; display:flex; align-items:center; gap:8px;">
              <span style="color:#c9a844; font-size:14px;">ℹ</span>
              <span style="font-size:11px; font-weight:800; color:#fff; letter-spacing:1px;">INFORMASI PENTING / IMPORTANT INFO</span>
            </div>
            <div style="padding:14px 16px; display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <div style="width:32px; height:32px; background:#f0f4ff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">🕐</div>
                <div>
                  <div style="font-size:11px; font-weight:700; color:#1a2b5c;">Check-in Time</div>
                  <div style="font-size:10px; color:#666; line-height:1.4;">Check-in paling lambat 2 jam sebelum keberangkatan.</div>
                </div>
              </div>
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <div style="width:32px; height:32px; background:#f0f4ff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">🧳</div>
                <div>
                  <div style="font-size:11px; font-weight:700; color:#1a2b5c;">Baggage Policy</div>
                  <div style="font-size:10px; color:#666; line-height:1.4;">Pastikan bagasi Anda sesuai dengan jatah maskapai.</div>
                </div>
              </div>
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <div style="width:32px; height:32px; background:#f0f4ff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">📋</div>
                <div>
                  <div style="font-size:11px; font-weight:700; color:#1a2b5c;">Boarding Pass</div>
                  <div style="font-size:10px; color:#666; line-height:1.4;">Tunjukkan e-ticket ini saat check-in di bandara.</div>
                </div>
              </div>
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <div style="width:32px; height:32px; background:#f0f4ff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">🛡</div>
                <div>
                  <div style="font-size:11px; font-weight:700; color:#1a2b5c;">Valid Identity</div>
                  <div style="font-size:10px; color:#666; line-height:1.4;">Wajib membawa KTP/Paspor asli sesuai nama tiket.</div>
                </div>
              </div>
            </div>
          </div>

          <!-- CONTACT SUPPORT (Hotel Style) -->
          <div style="padding:0 15px 15px; display:flex; justify-content:space-between; align-items:flex-end; border-bottom:1px solid #d6bd96; margin-bottom:12px; box-sizing:border-box;">
            <div>
              <div style="font-size: 11px; font-weight: 600; color: #555; margin-bottom: 6px;">FOR ANY QUESTIONS, CONTACT OUR SUPPORT:</div>
              <div style="font-size: 12px; font-weight: 700; color: #111; display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:14px; color:#1a2b5c; width:16px; text-align:center;">📞</span>
                  <span>${s.companyPhone}</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:14px; color:#1a2b5c; width:16px; text-align:center;">✉</span>
                  <span>${s.companyEmail}</span>
                </div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; font-weight: 600; color: #555; margin-bottom: 6px;">Itinerary ID</div>
              <div style="font-size: 15px; font-weight: 700; color: #111; display:flex; align-items:center; justify-content:flex-end; gap:5px;">
                <span style="font-size:16px;">📄</span> ${booking.bookingCode}
              </div>
            </div>
          </div>

        </div><!-- /padding -->

        <!-- FOOTER (Full-bleed Navy Blue) -->
        <div style="padding: 24px 40px; background-color: #0b1a30; display: flex; align-items: flex-start; gap: 40px; width: 100%; box-sizing: border-box; margin-top: auto;">
          <!-- Item 1 -->
          <div style="display: flex; align-items: flex-start; gap: 15px; flex: 1;">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#d6bd96" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
              <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
            <div>
              <div style="font-weight: 700; color: #d6bd96; font-size: 12px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">No Need to Print</div>
              <div style="font-size: 10px; color: #a0b2c6; line-height: 1.5;">Access and manage your flight itinerary paperless anytime via the Travel Go app.</div>
            </div>
          </div>
          
          <!-- Item 2 -->
          <div style="display: flex; align-items: flex-start; gap: 15px; flex: 1;">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#d6bd96" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <div>
              <div style="font-weight: 700; color: #d6bd96; font-size: 12px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Real-Time Updates</div>
              <div style="font-size: 10px; color: #a0b2c6; line-height: 1.5;">Get live updates on flight schedules, terminal gates, and booking status in real-time.</div>
            </div>
          </div>
        </div>

      </div>
    </div>`;

    generateFromHTML(html, `E-Ticket_${booking.bookingCode}.pdf`);
  }

  // --- HOTEL VOUCHER ---

  function generateHotelVoucher(booking) {
    const s = getSettings();

    const fmtDate = (d) => {
      if (!d) return '-';
      const dt = new Date(d);
      if (isNaN(dt)) return d;
      const months = ['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGT','SEP','OKT','NOV','DES'];
      return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
    };

    // Build guest rows
    const allGuestNames = (booking.passengers || [{ name: booking.guestName || booking.passengerName || '-' }])
      .map((g, i) => `<div style="margin-bottom:4px;"><span style="color:#aaa;font-size:11px;">${i+1}.</span> <strong>${g.name}</strong> <span style="color:#999;font-size:11px;">(${g.category || 'Adult'})</span></div>`)
      .join('');

    // QR code
    const qrData = encodeURIComponent(`${booking.bookingCode}|${booking.confirmationNumber || ''}`);
    const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?data=${qrData}&size=100x100&color=1a2b5c`;

    const pageHeight = 842; // A4 standard

    const html = `
    <div style="position:fixed;top:-9999px;left:0;width:595px;font-family:'Inter',Arial,sans-serif;background:#f4f6f8;box-sizing:border-box;color:#111;">
      <div style="width:595px;min-height:${pageHeight}px;background:#f4f6f8;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;position:relative;">

        <!-- HEADER (Hotel Style) -->
        <div style="background:#0b1a30; height: 100px; padding: 25px 40px; justify-content: space-between; align-items: center; display: flex;">
          <div>
            <h1 style="font-weight: 300; font-size: 32px; color: #a0b2c6; margin: 0;">Hotel Voucher</h1>
            <div style="font-size: 16px; margin-top: 2px; color: #d6bd96;">Reservation Details</div>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="text-align:right;">
              <div style="font-size:16px; font-weight:700; color:#fff; line-height:1;">${s.companyName}</div>
              <div style="font-size:9px; color:#a0b2c6; margin-top:2px; font-weight:400;">Authorized Agent</div>
            </div>
            ${s.companyLogo ? `<img src="${s.companyLogo}" style="height:50px; object-fit:contain;">` : ''}
          </div>
        </div>

        <div style="padding:16px 24px 0;">

          <!-- CONFIRMATION REFERENCE -->
          <div style="background:#fff; border: 1px solid #d6bd96; border-radius:10px; padding:10px 20px; margin-bottom:12px; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <div style="font-size:9px; color:#666; letter-spacing:2px; text-transform:uppercase; margin-bottom:4px;">KODE KONFIRMASI / CONFIRMATION NUMBER:</div>
            <div style="font-size:28px; font-weight:900; color:#1a2b5c; letter-spacing:4px; line-height:1.2;">${booking.confirmationNumber || booking.bookingCode}</div>
          </div>

          <div style="display: flex; gap: 14px; margin-bottom: 12px;">
            <!-- GUEST DETAILS -->
            <div style="background:#fff; border-radius:10px; overflow:hidden; flex: 2; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
              <div style="background:#1a2b5c; padding:10px 16px; display:flex; align-items:center; gap:8px;">
                <span style="color:#c9a844; font-size:14px;">👤</span>
                <span style="font-size:11px; font-weight:800; color:#fff; letter-spacing:1px;">DETAIL TAMU / GUEST DETAILS</span>
              </div>
              <div style="padding:14px 16px;">
                ${allGuestNames}
                <div style="margin-top:6px; font-size:11px; color:#555;">
                  <span style="color:#999;">NOMOR VOUCHER :</span> <strong>${booking.bookingCode}</strong>
                </div>
              </div>
            </div>
            
            <!-- QR CODE -->
            <div style="background:#fff; border-radius:10px; padding:16px; flex: 1; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,0.06); display:flex; flex-direction:column; align-items:center; justify-content:center;">
              <img src="${qrUrl}" width="80" height="80" style="border:2px solid #1a2b5c; border-radius:6px;">
              <div style="font-size:8px; color:#999; margin-top:8px; letter-spacing:1px;">SCAN FOR VERIFICATION</div>
            </div>
          </div>

          <!-- HOTEL & ROOM DETAILS -->
          <div style="background:#fff; border-radius:10px; overflow:hidden; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="background:#c9a844; padding:8px 16px;">
              <div style="font-size:11px;font-weight:800;color:#1a2b5c;letter-spacing:1px;">DETAIL HOTEL & KAMAR / HOTEL & ROOM DETAILS</div>
            </div>
            <div style="padding:14px 16px;background:#1a2b5c;color:#fff;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <!-- Hotel Name -->
                <div style="flex: 2; min-width: 150px;">
                  <div style="font-size:10px;color:#a0b2c6;font-weight:600;text-transform:uppercase;">HOTEL NAME</div>
                  <div style="font-size:20px;font-weight:800;color:#fff;line-height:1.2;text-transform:uppercase;">${booking.hotelName}</div>
                  ${booking.roomNumber ? `<div style="font-size:11px;color:#d6bd96;font-weight:700;margin-top:4px;">🔑 NOMOR KAMAR: ${booking.roomNumber}</div>` : ''}
                  <div style="font-size:9px;color:#a0b2c6;margin-top:2px;">📍 ${booking.hotelAddress || '-'}</div>
                </div>
                <!-- Middle (Modern White Line Art Hotel SVG) -->
                <div style="flex:1;text-align:center;padding:0 10px;display:flex;align-items:center;justify-content:center;">
                  <svg viewBox="0 0 100 50" width="70" height="35" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <!-- Ground line -->
                    <line x1="5" y1="45" x2="95" y2="45" stroke="rgba(255,255,255,0.3)" stroke-width="1.2" />
                    <!-- Main building facade -->
                    <rect x="25" y="10" width="50" height="35" rx="2" />
                    <!-- Central premium entrance arch -->
                    <path d="M43 45 L43 35 C43 31, 57 31, 57 35 L57 45" />
                    <!-- Columns or decorative lines on side towers -->
                    <rect x="10" y="20" width="15" height="25" rx="1.5" />
                    <rect x="75" y="20" width="15" height="25" rx="1.5" />
                    <!-- Spire/Peak details for modern luxury look -->
                    <path d="M45 10 L50 2 L55 10" />
                    <path d="M17 20 L17.5 12 L18 20" />
                    <path d="M82 20 L82.5 12 L83 20" />
                    <!-- Detailed window grids (White lines) -->
                    <line x1="31" y1="16" x2="35" y2="16" stroke-width="1.2" />
                    <line x1="31" y1="22" x2="35" y2="22" stroke-width="1.2" />
                    <line x1="31" y1="28" x2="35" y2="28" stroke-width="1.2" />
                    <line x1="65" y1="16" x2="69" y2="16" stroke-width="1.2" />
                    <line x1="65" y1="22" x2="69" y2="22" stroke-width="1.2" />
                    <line x1="65" y1="28" x2="69" y2="28" stroke-width="1.2" />
                    <line x1="45" y1="22" x2="49" y2="22" stroke-width="1.2" />
                    <line x1="51" y1="22" x2="55" y2="22" stroke-width="1.2" />
                  </svg>
                </div>
                <!-- Room Type & Breakfast -->
                <div style="flex: 2; text-align:right; min-width: 150px; display:flex; flex-direction:column; gap:6px;">
                  <div>
                    <div style="font-size:9px;color:#a0b2c6;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">ROOM TYPE</div>
                    <div style="font-size:14px;font-weight:800;color:#fff;text-transform:uppercase;line-height:1.2;">${booking.roomType}</div>
                  </div>
                  <div>
                    <div style="font-size:9px;color:#a0b2c6;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">MEAL PLAN / SARAPAN</div>
                    <div style="font-size:14px;font-weight:800;color:#fff;text-transform:uppercase;line-height:1.2;">
                      ${booking.breakfast === 'Termasuk' || booking.breakfast === 'Breakfast Included' ? '🍳 Termasuk Sarapan' : '❌ Tanpa Sarapan'}
                    </div>
                  </div>
                </div>
              </div>
              <!-- Info row -->
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px;border-top:1px dashed rgba(255,255,255,0.2);padding-top:10px;">
                <div>
                  <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">CHECK-IN</div>
                  <div style="font-size:11px;font-weight:700;color:#fff;">${fmtDate(booking.checkIn)}</div>
                  <div style="font-size:9px;color:#a0b2c6;margin-top:2px;">14:00 WIB</div>
                </div>
                <div>
                  <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">CHECK-OUT</div>
                  <div style="font-size:11px;font-weight:700;color:#fff;">${fmtDate(booking.checkOut)}</div>
                  <div style="font-size:9px;color:#a0b2c6;margin-top:2px;">12:00 WIB</div>
                </div>
                <div>
                  <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">DURATION</div>
                  <div style="font-size:11px;font-weight:700;color:#fff;">${booking.nights || 1} Night(s)</div>
                </div>
                <div>
                  <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">CAPACITY</div>
                  <div style="font-size:11px;font-weight:700;color:#fff;">2 Adults</div>
                </div>
                <div style="grid-column:span 4;">
                  <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">CATATAN KHUSUS / SPECIAL REQUEST</div>
                  <div style="font-size:11px;font-weight:700;color:#fff;line-height:1.4;">
                    📌 Permintaan: ${booking.specialRequest || 'Tidak Ada Catatan Khusus'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- IMPORTANT INFO -->
          <div style="background:#fff; border-radius:10px; overflow:hidden; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="background:#1a2b5c; padding:10px 16px; display:flex; align-items:center; gap:8px;">
              <span style="color:#c9a844; font-size:14px;">ℹ</span>
              <span style="font-size:11px; font-weight:800; color:#fff; letter-spacing:1px;">INFORMASI PENTING / IMPORTANT INFO</span>
            </div>
            <div style="padding:14px 16px; display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <div style="width:32px; height:32px; background:#f0f4ff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">🕐</div>
                <div>
                  <div style="font-size:11px; font-weight:700; color:#1a2b5c;">Check-in Policy</div>
                  <div style="font-size:10px; color:#666; line-height:1.4;">Tunjukkan KTP/Paspor asli dan voucher ini saat check-in di resepsionis.</div>
                </div>
              </div>
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <div style="width:32px; height:32px; background:#f0f4ff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">💳</div>
                <div>
                  <div style="font-size:11px; font-weight:700; color:#1a2b5c;">Deposit Policy</div>
                  <div style="font-size:10px; color:#666; line-height:1.4;">Hotel memerlukan deposit jaminan (tunai/kartu) saat check-in.</div>
                </div>
              </div>
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <div style="width:32px; height:32px; background:#f0f4ff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">🛡</div>
                <div>
                  <div style="font-size:11px; font-weight:700; color:#1a2b5c;">Refund Policy</div>
                  <div style="font-size:10px; color:#666; line-height:1.4;">Pemesanan ini bersifat non-refundable (tidak dapat diuangkan kembali).</div>
                </div>
              </div>
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <div style="width:32px; height:32px; background:#f0f4ff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">📞</div>
                <div>
                  <div style="font-size:11px; font-weight:700; color:#1a2b5c;">Late Arrival</div>
                  <div style="font-size:10px; color:#666; line-height:1.4;">Hubungi pihak hotel terlebih dahulu jika Anda akan tiba terlambat.</div>
                </div>
              </div>
            </div>
          </div>

          <!-- CONTACT SUPPORT (Hotel Style) -->
          <div style="padding:0 15px 15px; display:flex; justify-content:space-between; align-items:flex-end; border-bottom:1px solid #d6bd96; margin-bottom:12px; box-sizing:border-box;">
            <div>
              <div style="font-size: 11px; font-weight: 600; color: #555; margin-bottom: 6px;">FOR ANY QUESTIONS, CONTACT OUR SUPPORT:</div>
              <div style="font-size: 12px; font-weight: 700; color: #111; display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:14px; color:#1a2b5c; width:16px; text-align:center;">📞</span>
                  <span>${s.companyPhone}</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:14px; color:#1a2b5c; width:16px; text-align:center;">✉</span>
                  <span>${s.companyEmail}</span>
                </div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; font-weight: 600; color: #555; margin-bottom: 6px;">Voucher ID</div>
              <div style="font-size: 15px; font-weight: 700; color: #111; display:flex; align-items:center; justify-content:flex-end; gap:5px;">
                <span style="font-size:16px;">📄</span> ${booking.bookingCode}
              </div>
            </div>
          </div>

        </div><!-- /padding -->

        <!-- FOOTER (Full-bleed Navy Blue) -->
        <div style="padding: 24px 40px; background-color: #0b1a30; display: flex; align-items: flex-start; gap: 40px; width: 100%; box-sizing: border-box; margin-top: auto;">
          <!-- Item 1 -->
          <div style="display: flex; align-items: flex-start; gap: 15px; flex: 1;">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#d6bd96" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
              <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
            <div>
              <div style="font-weight: 700; color: #d6bd96; font-size: 12px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">No Need to Print</div>
              <div style="font-size: 10px; color: #a0b2c6; line-height: 1.5;">Access and manage your hotel reservation paperless anytime via the Travel Go app.</div>
            </div>
          </div>
          
          <!-- Item 2 -->
          <div style="display: flex; align-items: flex-start; gap: 15px; flex: 1;">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#d6bd96" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <div>
              <div style="font-weight: 700; color: #d6bd96; font-size: 12px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Real-Time Updates</div>
              <div style="font-size: 10px; color: #a0b2c6; line-height: 1.5;">Get live updates on check-in schedules, booking confirmation status in real-time.</div>
            </div>
          </div>
        </div>

      </div>
    </div>`;

    generateFromHTML(html, `HotelVoucher_${booking.bookingCode}.pdf`);
  }

  // --- RENTAL VOUCHER ---
  function generateRentalVoucher(booking) {
    const s = getSettings();

    const fmtDate = (d) => {
      if (!d) return '-';
      const dt = new Date(d);
      if (isNaN(dt)) return d;
      const months = ['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGT','SEP','OKT','NOV','DES'];
      return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
    };

    // Build driver rows
    const allDriverNames = (booking.passengers || [{ name: booking.renterName || booking.passengerName || '-' }])
      .map((g, i) => `<div style="margin-bottom:4px;"><span style="color:#aaa;font-size:11px;">${i+1}.</span> <strong>${g.name}</strong> <span style="color:#999;font-size:11px;">(Primary Driver)</span></div>`)
      .join('');

    // QR code
    const qrData = encodeURIComponent(`${booking.bookingCode}|${booking.voucherNumber || ''}`);
    const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?data=${qrData}&size=100x100&color=1a2b5c`;

    const pageHeight = 842; // A4 standard

    const html = `
    <div style="position:fixed;top:-9999px;left:0;width:595px;font-family:'Inter',Arial,sans-serif;background:#f4f6f8;box-sizing:border-box;color:#111;">
      <div style="width:595px;min-height:${pageHeight}px;background:#f4f6f8;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;position:relative;">

        <!-- HEADER (Rental Style) -->
        <div style="background:#0b1a30; height: 100px; padding: 25px 40px; justify-content: space-between; align-items: center; display: flex;">
          <div>
            <h1 style="font-weight: 300; font-size: 32px; color: #a0b2c6; margin: 0;">Rental Voucher</h1>
            <div style="font-size: 16px; margin-top: 2px; color: #d6bd96;">Car Reservation Details</div>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="text-align:right;">
              <div style="font-size:16px; font-weight:700; color:#fff; line-height:1;">${s.companyName}</div>
              <div style="font-size:9px; color:#a0b2c6; margin-top:2px; font-weight:400;">Authorized Agent</div>
            </div>
            ${s.companyLogo ? `<img src="${s.companyLogo}" style="height:50px; object-fit:contain;">` : ''}
          </div>
        </div>

        <div style="padding:16px 24px 0;">

          <!-- CONFIRMATION REFERENCE -->
          <div style="background:#fff; border: 1px solid #d6bd96; border-radius:10px; padding:10px 20px; margin-bottom:12px; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <div style="font-size:9px; color:#666; letter-spacing:2px; text-transform:uppercase; margin-bottom:4px;">KODE KONFIRMASI / CONFIRMATION NUMBER:</div>
            <div style="font-size:28px; font-weight:900; color:#1a2b5c; letter-spacing:4px; line-height:1.2;">${booking.voucherNumber || booking.bookingCode}</div>
          </div>

          <div style="display: flex; gap: 14px; margin-bottom: 12px;">
            <!-- DRIVER DETAILS -->
            <div style="background:#fff; border-radius:10px; overflow:hidden; flex: 2; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
              <div style="background:#1a2b5c; padding:10px 16px; display:flex; align-items:center; gap:8px;">
                <span style="color:#c9a844; font-size:14px;">👤</span>
                <span style="font-size:11px; font-weight:800; color:#fff; letter-spacing:1px;">DETAIL PENGEMUDI / DRIVER DETAILS</span>
              </div>
              <div style="padding:14px 16px;">
                ${allDriverNames}
                <div style="margin-top:6px; font-size:11px; color:#555;">
                  <span style="color:#999;">NOMOR VOUCHER :</span> <strong>${booking.bookingCode}</strong>
                </div>
              </div>
            </div>
            
            <!-- QR CODE -->
            <div style="background:#fff; border-radius:10px; padding:16px; flex: 1; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,0.06); display:flex; flex-direction:column; align-items:center; justify-content:center;">
              <img src="${qrUrl}" width="80" height="80" style="border:2px solid #1a2b5c; border-radius:6px;">
              <div style="font-size:8px; color:#999; margin-top:8px; letter-spacing:1px;">SCAN FOR VERIFICATION</div>
            </div>
          </div>

          <!-- VEHICLE & RENTAL DETAILS -->
          <div style="background:#fff; border-radius:10px; overflow:hidden; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="background:#c9a844; padding:8px 16px;">
              <div style="font-size:11px;font-weight:800;color:#1a2b5c;letter-spacing:1px;">DETAIL KENDARAAN & SEWA / VEHICLE & RENTAL DETAILS</div>
            </div>
            <div style="padding:14px 16px;background:#1a2b5c;color:#fff;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <!-- Vehicle Name -->
                <div style="flex: 2; min-width: 150px;">
                  <div style="font-size:10px;color:#a0b2c6;font-weight:600;text-transform:uppercase;">VEHICLE MODEL</div>
                  <div style="font-size:20px;font-weight:800;color:#fff;line-height:1.2;text-transform:uppercase;">${booking.vehicleName}</div>
                  <div style="font-size:11px;color:#d6bd96;font-weight:700;margin-top:4px;">🚗 PLAT NOMOR: ${booking.licensePlate || '-'}</div>
                  <div style="font-size:9px;color:#a0b2c6;margin-top:2px;">Type: ${booking.vehicleType || 'SUV'}</div>
                </div>
                <!-- Middle (Modern White Line Art Car SVG) -->
                <div style="flex:1;text-align:center;padding:0 10px;display:flex;align-items:center;justify-content:center;">
                  <svg viewBox="0 0 100 50" width="70" height="35" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <!-- Sleek modern SUV/Sedan profile outline with white details -->
                    <path d="M5 38 C 5 38, 10 24, 20 24 C 25 24, 28 20, 34 13 C 40 5, 62 4, 72 13 C 78 19, 87 21, 91 27 C 94 30, 95 34, 95 36 C 95 38, 93 39, 88 39 L 77 39 C 75 33, 69 29, 63 29 C 57 29, 51 33, 49 39 L 33 39 C 31 33, 25 29, 19 29 C 13 29, 7 33, 5 39 Z" />
                    <!-- Windows -->
                    <path d="M37 15 L 52 15 C 57 15, 60 17, 60 21 L 60 25 L 35 25 L 31 19 C 33 16, 35 15, 37 15 Z" stroke-width="1.2" />
                    <path d="M63 15 L 70 15 C 74 15, 76 18, 77 22 C 78 24, 78 25, 78 25 L 63 25 Z" stroke-width="1.2" />
                    <!-- Wheels -->
                    <circle cx="19" cy="37" r="7" fill="#1a2b5c" stroke="#ffffff" stroke-width="1.8" />
                    <circle cx="19" cy="37" r="2.5" fill="#ffffff" />
                    <circle cx="63" cy="37" r="7" fill="#1a2b5c" stroke="#ffffff" stroke-width="1.8" />
                    <circle cx="63" cy="37" r="2.5" fill="#ffffff" />
                    <!-- Detail lines -->
                    <path d="M47 27 L 51 27" stroke-width="1.2" />
                    <path d="M62 27 L 66 27" stroke-width="1.2" />
                  </svg>
                </div>
                <!-- Pickup & Dropoff -->
                <div style="flex: 2; text-align:right; min-width: 150px; display:flex; flex-direction:column; gap:6px;">
                  <div>
                    <div style="font-size:9px;color:#a0b2c6;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">PICKUP LOCATION</div>
                    <div style="font-size:14px;font-weight:800;color:#fff;text-transform:uppercase;line-height:1.2;">${booking.pickupLocation || 'Main Office'}</div>
                  </div>
                  <div>
                    <div style="font-size:9px;color:#a0b2c6;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">DROP-OFF LOCATION</div>
                    <div style="font-size:14px;font-weight:800;color:#fff;text-transform:uppercase;line-height:1.2;">${booking.returnLocation || '-'}</div>
                  </div>
                </div>
              </div>
              <!-- Info row -->
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px;border-top:1px dashed rgba(255,255,255,0.2);padding-top:10px;">
                <div>
                  <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">PICK-UP DATE</div>
                  <div style="font-size:11px;font-weight:700;color:#fff;">${fmtDate(booking.pickupDate)}</div>
                  <div style="font-size:9px;color:#a0b2c6;margin-top:2px;">09:00 WIB</div>
                </div>
                <div>
                  <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">RETURN DATE</div>
                  <div style="font-size:11px;font-weight:700;color:#fff;">${fmtDate(booking.returnDate)}</div>
                  <div style="font-size:9px;color:#a0b2c6;margin-top:2px;">17:00 WIB</div>
                </div>
                <div>
                  <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">DURATION</div>
                  <div style="font-size:11px;font-weight:700;color:#fff;">${booking.nights || 1} Day(s)</div>
                </div>
                <div>
                  <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">TRANSMISSION</div>
                  <div style="font-size:11px;font-weight:700;color:#fff;">Automatic</div>
                </div>
                <div style="grid-column:span 4;">
                  <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">DRIVER STATUS & CATATAN UNIT</div>
                  <div style="font-size:11px;font-weight:700;color:#fff;line-height:1.4;">
                    📌 Supir: ${booking.withDriver || 'Lepas Kunci (Tanpa Supir)'} ${booking.facilities ? `<br>📝 Catatan Unit: ${booking.facilities}` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- IMPORTANT INFO -->
          <div style="background:#fff; border-radius:10px; overflow:hidden; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="background:#1a2b5c; padding:10px 16px; display:flex; align-items:center; gap:8px;">
              <span style="color:#c9a844; font-size:14px;">ℹ</span>
              <span style="font-size:11px; font-weight:800; color:#fff; letter-spacing:1px;">INFORMASI PENTING / IMPORTANT INFO</span>
            </div>
            <div style="padding:14px 16px; display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <div style="width:32px; height:32px; background:#f0f4ff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">📋</div>
                <div>
                  <div style="font-size:11px; font-weight:700; color:#1a2b5c;">Driver License</div>
                  <div style="font-size:10px; color:#666; line-height:1.4;">Wajib memiliki SIM A asli yang berlaku (atau SIM Internasional jika asing).</div>
                </div>
              </div>
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <div style="width:32px; height:32px; background:#f0f4ff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">🛡</div>
                <div>
                  <div style="font-size:11px; font-weight:700; color:#1a2b5c;">Rental Guarantee</div>
                  <div style="font-size:10px; color:#666; line-height:1.4;">Penyedia jasa sewa berhak menahan KTP asli atau deposit sebagai jaminan.</div>
                </div>
              </div>
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <div style="width:32px; height:32px; background:#f0f4ff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">🕐</div>
                <div>
                  <div style="font-size:11px; font-weight:700; color:#1a2b5c;">Overtime Policy</div>
                  <div style="font-size:10px; color:#666; line-height:1.4;">Kelebihan waktu sewa (overtime) akan dikenakan denda sesuai tarif berlaku.</div>
                </div>
              </div>
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <div style="width:32px; height:32px; background:#f0f4ff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">⭐</div>
                <div>
                  <div style="font-size:11px; font-weight:700; color:#1a2b5c;">Insurance Policy</div>
                  <div style="font-size:10px; color:#666; line-height:1.4;">Asuransi mencakup perlindungan dasar tabrakan dan kerusakan kendaraan sewa.</div>
                </div>
              </div>
            </div>
          </div>

          <!-- CONTACT SUPPORT (Rental Style) -->
          <div style="padding:0 15px 15px; display:flex; justify-content:space-between; align-items:flex-end; border-bottom:1px solid #d6bd96; margin-bottom:12px; box-sizing:border-box;">
            <div>
              <div style="font-size: 11px; font-weight: 600; color: #555; margin-bottom: 6px;">FOR ANY QUESTIONS, CONTACT OUR SUPPORT:</div>
              <div style="font-size: 12px; font-weight: 700; color: #111; display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:14px; color:#1a2b5c; width:16px; text-align:center;">📞</span>
                  <span>${s.companyPhone}</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:14px; color:#1a2b5c; width:16px; text-align:center;">✉</span>
                  <span>${s.companyEmail}</span>
                </div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; font-weight: 600; color: #555; margin-bottom: 6px;">Voucher ID</div>
              <div style="font-size: 15px; font-weight: 700; color: #111; display:flex; align-items:center; justify-content:flex-end; gap:5px;">
                <span style="font-size:16px;">📄</span> ${booking.bookingCode}
              </div>
            </div>
          </div>

        </div><!-- /padding -->

        <!-- FOOTER (Full-bleed Navy Blue) -->
        <div style="padding: 24px 40px; background-color: #0b1a30; display: flex; align-items: flex-start; gap: 40px; width: 100%; box-sizing: border-box; margin-top: auto;">
          <!-- Item 1 -->
          <div style="display: flex; align-items: flex-start; gap: 15px; flex: 1;">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#d6bd96" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
              <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
            <div>
              <div style="font-weight: 700; color: #d6bd96; font-size: 12px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">No Need to Print</div>
              <div style="font-size: 10px; color: #a0b2c6; line-height: 1.5;">Access and manage your car rental reservation paperless anytime via the Travel Go app.</div>
            </div>
          </div>
          
          <!-- Item 2 -->
          <div style="display: flex; align-items: flex-start; gap: 15px; flex: 1;">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#d6bd96" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <div>
              <div style="font-weight: 700; color: #d6bd96; font-size: 12px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Real-Time Updates</div>
              <div style="font-size: 10px; color: #a0b2c6; line-height: 1.5;">Get live updates on rental confirmation, pickup office coordinates in real-time.</div>
            </div>
          </div>
        </div>

      </div>
    </div>`;

    generateFromHTML(html, `RentalVoucher_${booking.bookingCode}.pdf`);
  }

  // --- INVOICE (RECEIPT) ---
  // --- INVOICE (RECEIPT) ---
  function generateInvoice(invoice, isReceipt = false) {
    const s = getSettings();
    const statusColor = invoice.paymentStatus === 'paid' ? '#27ae60' : (invoice.paymentStatus === 'pending_verification' ? '#f39c12' : '#e74c3c');
    const statusLabel = invoice.paymentStatus === 'paid' ? 'LUNAS' : (invoice.paymentStatus === 'pending_verification' ? 'VERIFIKASI' : 'BELUM LUNAS');
    const invoiceDate = formatDate(invoice.createdAt || new Date().toISOString());
    const dueDate = formatDate(invoice.dueDate || new Date().toISOString());
    const methodLabel = { cash:'Tunai (Cash)', bank:'Transfer Bank', va:'Virtual Account', cc:'Kartu Kredit' }[invoice.paymentMethod] || invoice.paymentMethod || '-';

    const docNumber = isReceipt ? invoice.invoiceNumber.replace('INV', 'REC') : invoice.invoiceNumber;

    const booking = TMS.Store.getById(invoice.bookingType + 's', invoice.bookingId);
    
    // Travelers parser
    let travelersHtml = '';
    if (booking) {
      const travelers = booking.passengers || booking.participants || [];
      if (travelers.length > 0) {
        travelersHtml = travelers.map((t, idx) => `
          <div style="margin-bottom:4px; font-size:12px; color:#111;">
            <span style="color:#aaa;">${idx+1}.</span> <strong>${t.name}</strong> 
            ${t.category ? `<span style="color:#777; font-size:10px;">(${t.category})</span>` : ''}
          </div>
        `).join('');
      } else {
        const guestName = booking.guestName || booking.renterName || booking.passengerName || invoice.customerName;
        travelersHtml = `
          <div style="margin-bottom:4px; font-size:12px; color:#111;">
            <span style="color:#aaa;">1.</span> <strong>${guestName}</strong>
          </div>
        `;
      }
    } else {
      travelersHtml = `
        <div style="margin-bottom:4px; font-size:12px; color:#111;">
          <span style="color:#aaa;">1.</span> <strong>${invoice.customerName}</strong>
        </div>
      `;
    }

    // Dynamic Booking Cards
    let bookingCardHtml = '';
    if (invoice.bookingType === 'flight' && booking) {
      const parseLoc = (str) => {
        if (!str) return { city: '', code: '' };
        const match = str.match(/(.*)\s\((.*)\)/);
        return match ? { city: match[1].trim(), code: match[2].trim() } : { city: str, code: str.substring(0,3).toUpperCase() };
      };
      const dep = parseLoc(booking.departureCity);
      const arr = parseLoc(booking.arrivalCity);
      const isRound = booking.tripType === 'round' || (booking.returnFlightNumber && booking.returnDepartureDate);
      
      const flightSection = (label, opts) => `
        <div style="background:#c9a844;padding:6px 12px;">
          <div style="font-size:10px;font-weight:800;color:#1a2b5c;letter-spacing:1px;">${label}</div>
        </div>
        <div style="padding:10px 12px;background:#1a2b5c;color:#fff;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="min-width:80px;">
              <div style="font-size:9px;color:#a0b2c6;font-weight:600;text-transform:uppercase;">${opts.fromCity}</div>
              <div style="font-size:28px;font-weight:800;color:#fff;line-height:1;">${opts.fromCode}</div>
            </div>
            <div style="flex:1;text-align:center;padding:0 8px;">
              <div style="font-size:9px;color:#d6bd96;font-weight:600;">${opts.airline}</div>
              <div style="font-size:18px;color:#fff;">✈</div>
              <div style="font-size:9px;color:#d6bd96;">${opts.flightNumber}</div>
            </div>
            <div style="min-width:80px;text-align:right;">
              <div style="font-size:9px;color:#a0b2c6;font-weight:600;text-transform:uppercase;">${opts.toCity}</div>
              <div style="font-size:28px;font-weight:800;color:#fff;line-height:1;">${opts.toCode}</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px;border-top:1px dashed rgba(255,255,255,0.2);padding-top:8px;">
            <div>
              <div style="font-size:8px;color:#a0b2c6;font-weight:700;">DATE</div>
              <div style="font-size:10px;font-weight:700;">${opts.date}</div>
            </div>
            <div>
              <div style="font-size:8px;color:#a0b2c6;font-weight:700;">FLIGHT NO.</div>
              <div style="font-size:10px;font-weight:700;">${opts.flightNumber}</div>
            </div>
            <div>
              <div style="font-size:8px;color:#a0b2c6;font-weight:700;">CLASS</div>
              <div style="font-size:10px;font-weight:700;">${opts.seat || '-'}</div>
            </div>
            <div>
              <div style="font-size:8px;color:#a0b2c6;font-weight:700;">TIME</div>
              <div style="font-size:10px;font-weight:700;">${opts.depTime} - ${opts.arrTime}</div>
            </div>
          </div>
        </div>`;

      const depSection = flightSection('PENERBANGAN PERGI / DEPARTURE FLIGHT', {
        fromCity: dep.city, fromCode: dep.code,
        toCity: arr.city, toCode: arr.code,
        airline: booking.airline || '-', flightNumber: booking.flightNumber || '-',
        date: formatDate(booking.departureDate),
        depTime: booking.departureTime || '--:--', arrTime: booking.arrivalTime || '--:--',
        seat: booking.seatClass || '-', terminal: booking.terminal || '-', baggage: booking.baggage || '20'
      });

      const retSection = isRound ? flightSection('PENERBANGAN PULANG / RETURN FLIGHT', {
        fromCity: arr.city, fromCode: arr.code,
        toCity: dep.city, toCode: dep.code,
        airline: booking.returnAirline || booking.airline || '-', flightNumber: booking.returnFlightNumber || '-',
        date: formatDate(booking.returnDepartureDate),
        depTime: booking.returnDepartureTime || '--:--', arrTime: booking.returnArrivalTime || '--:--',
        seat: booking.returnSeatClass || '-', terminal: booking.returnTerminal || '-', baggage: booking.returnBaggage || '20'
      }) : '';

      bookingCardHtml = `
        <div style="background:#fff; border-radius:10px; overflow:hidden; margin-top:20px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #d6bd96;">
          ${depSection}
          ${retSection}
        </div>
      `;
    } else if (invoice.bookingType === 'hotel' && booking) {
      bookingCardHtml = `
        <div style="background:#fff; border-radius:10px; overflow:hidden; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="background:#c9a844; padding:8px 16px;">
              <div style="font-size:11px;font-weight:800;color:#1a2b5c;letter-spacing:1px;">DETAIL HOTEL & KAMAR / HOTEL & ROOM DETAILS</div>
            </div>
            <div style="padding:14px 16px;background:#1a2b5c;color:#fff;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <!-- Hotel Name -->
                <div style="flex: 2; min-width: 150px;">
                  <div style="font-size:10px;color:#a0b2c6;font-weight:600;text-transform:uppercase;">HOTEL NAME</div>
                  <div style="font-size:20px;font-weight:800;color:#fff;line-height:1.2;text-transform:uppercase;">${booking.hotelName}</div>
                  ${booking.roomNumber ? `<div style="font-size:11px;color:#d6bd96;font-weight:700;margin-top:4px;">🔑 NOMOR KAMAR: ${booking.roomNumber}</div>` : ''}
                  <div style="font-size:9px;color:#a0b2c6;margin-top:2px;">📍 ${booking.hotelAddress || '-'}</div>
                </div>
                <!-- Middle (Modern White Line Art Hotel SVG) -->
                <div style="flex:1;text-align:center;padding:0 10px;display:flex;align-items:center;justify-content:center;">
                  <svg viewBox="0 0 100 50" width="70" height="35" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <!-- Ground line -->
                    <line x1="5" y1="45" x2="95" y2="45" stroke="rgba(255,255,255,0.3)" stroke-width="1.2" />
                    <!-- Main building facade -->
                    <rect x="25" y="10" width="50" height="35" rx="2" />
                    <!-- Central premium entrance arch -->
                    <path d="M43 45 L43 35 C43 31, 57 31, 57 35 L57 45" />
                    <!-- Columns or decorative lines on side towers -->
                    <rect x="10" y="20" width="15" height="25" rx="1.5" />
                    <rect x="75" y="20" width="15" height="25" rx="1.5" />
                    <!-- Spire/Peak details for modern luxury look -->
                    <path d="M45 10 L50 2 L55 10" />
                    <path d="M17 20 L17.5 12 L18 20" />
                    <path d="M82 20 L82.5 12 L83 20" />
                    <!-- Detailed window grids (White lines) -->
                    <line x1="31" y1="16" x2="35" y2="16" stroke-width="1.2" />
                    <line x1="31" y1="22" x2="35" y2="22" stroke-width="1.2" />
                    <line x1="31" y1="28" x2="35" y2="28" stroke-width="1.2" />
                    <line x1="65" y1="16" x2="69" y2="16" stroke-width="1.2" />
                    <line x1="65" y1="22" x2="69" y2="22" stroke-width="1.2" />
                    <line x1="65" y1="28" x2="69" y2="28" stroke-width="1.2" />
                    <line x1="45" y1="22" x2="49" y2="22" stroke-width="1.2" />
                    <line x1="51" y1="22" x2="55" y2="22" stroke-width="1.2" />
                  </svg>
                </div>
                <!-- Room Type & Breakfast -->
                <div style="flex: 2; text-align:right; min-width: 150px; display:flex; flex-direction:column; gap:6px;">
                  <div>
                    <div style="font-size:9px;color:#a0b2c6;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">ROOM TYPE</div>
                    <div style="font-size:14px;font-weight:800;color:#fff;text-transform:uppercase;line-height:1.2;">${booking.roomType}</div>
                  </div>
                  <div>
                    <div style="font-size:9px;color:#a0b2c6;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">MEAL PLAN / SARAPAN</div>
                    <div style="font-size:14px;font-weight:800;color:#fff;text-transform:uppercase;line-height:1.2;">
                      ${booking.breakfast === 'Termasuk' || booking.breakfast === 'Breakfast Included' ? '🍳 Termasuk Sarapan' : '❌ Tanpa Sarapan'}
                    </div>
                  </div>
                </div>
      `;
    } else if (invoice.bookingType === 'rental' && booking) {
      bookingCardHtml = `
        <div style="background:#fff; border-radius:10px; overflow:hidden; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="background:#c9a844; padding:8px 16px;">
              <div style="font-size:11px;font-weight:800;color:#1a2b5c;letter-spacing:1px;">DETAIL KENDARAAN & SEWA / VEHICLE & RENTAL DETAILS</div>
            </div>
            <div style="padding:14px 16px;background:#1a2b5c;color:#fff;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <!-- Vehicle Name -->
                <div style="flex: 2; min-width: 150px;">
                  <div style="font-size:10px;color:#a0b2c6;font-weight:600;text-transform:uppercase;">VEHICLE MODEL</div>
                  <div style="font-size:20px;font-weight:800;color:#fff;line-height:1.2;text-transform:uppercase;">${booking.vehicleName}</div>
                  <div style="font-size:11px;color:#d6bd96;font-weight:700;margin-top:4px;">🚗 PLAT NOMOR: ${booking.licensePlate || '-'}</div>
                  <div style="font-size:9px;color:#a0b2c6;margin-top:2px;">Type: ${booking.vehicleType || 'SUV'}</div>
                </div>
                <!-- Middle (Modern White Line Art Car SVG) -->
                <div style="flex:1;text-align:center;padding:0 10px;display:flex;align-items:center;justify-content:center;">
                  <svg viewBox="0 0 100 50" width="70" height="35" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <!-- Sleek modern SUV/Sedan profile outline with white details -->
                    <path d="M5 38 C 5 38, 10 24, 20 24 C 25 24, 28 20, 34 13 C 40 5, 62 4, 72 13 C 78 19, 87 21, 91 27 C 94 30, 95 34, 95 36 C 95 38, 93 39, 88 39 L 77 39 C 75 33, 69 29, 63 29 C 57 29, 51 33, 49 39 L 33 39 C 31 33, 25 29, 19 29 C 13 29, 7 33, 5 39 Z" />
                    <!-- Windows -->
                    <path d="M37 15 L 52 15 C 57 15, 60 17, 60 21 L 60 25 L 35 25 L 31 19 C 33 16, 35 15, 37 15 Z" stroke-width="1.2" />
                    <path d="M63 15 L 70 15 C 74 15, 76 18, 77 22 C 78 24, 78 25, 78 25 L 63 25 Z" stroke-width="1.2" />
                    <!-- Wheels -->
                    <circle cx="19" cy="37" r="7" fill="#1a2b5c" stroke="#ffffff" stroke-width="1.8" />
                    <circle cx="19" cy="37" r="2.5" fill="#ffffff" />
                    <circle cx="63" cy="37" r="7" fill="#1a2b5c" stroke="#ffffff" stroke-width="1.8" />
                    <circle cx="63" cy="37" r="2.5" fill="#ffffff" />
                    <!-- Detail lines -->
                    <path d="M47 27 L 51 27" stroke-width="1.2" />
                    <path d="M62 27 L 66 27" stroke-width="1.2" />
                  </svg>
                </div>
                <!-- Pickup & Dropoff -->
                <div style="flex: 2; text-align:right; min-width: 150px; display:flex; flex-direction:column; gap:6px;">
                  <div>
                    <div style="font-size:9px;color:#a0b2c6;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">PICKUP LOCATION</div>
                    <div style="font-size:14px;font-weight:800;color:#fff;text-transform:uppercase;line-height:1.2;">${booking.pickupLocation || 'Main Office'}</div>
                  </div>
                  <div>
                    <div style="font-size:9px;color:#a0b2c6;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">DROP-OFF LOCATION</div>
                    <div style="font-size:14px;font-weight:800;color:#fff;text-transform:uppercase;line-height:1.2;">${booking.returnLocation || '-'}</div>
                  </div>
                </div>
      `;
    } else if (invoice.bookingType === 'tour' && booking) {
      bookingCardHtml = `
        <div style="background:#fff; border-radius:10px; overflow:hidden; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="background:#c9a844; padding:8px 16px;">
              <div style="font-size:11px;font-weight:800;color:#1a2b5c;letter-spacing:1px;">DETAIL PAKET & DESTINASI / TOUR & DESTINATION DETAILS</div>
            </div>
            <div style="padding:14px 16px;background:#1a2b5c;color:#fff;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <!-- Tour Name -->
                <div style="flex: 2; min-width: 150px;">
                  <div style="font-size:10px;color:#a0b2c6;font-weight:600;text-transform:uppercase;">TOUR PACKAGE</div>
                  <div style="font-size:18px;font-weight:800;color:#fff;line-height:1.2;text-transform:uppercase;">${booking.tourName}</div>
                  <div style="font-size:11px;color:#d6bd96;font-weight:700;margin-top:4px;">📍 DESTINASI: ${booking.destination || '-'}</div>
                </div>
                <!-- Middle (Relaxing Palm Tree & Summer Sun SVG) -->
                <div style="flex:1;text-align:center;padding:0 10px;display:flex;align-items:center;justify-content:center;">
                  <svg viewBox="0 0 100 50" width="70" height="35" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="50" cy="20" r="10" stroke="rgba(255,255,255,0.35)" stroke-width="1.2" stroke-dasharray="2 1" />
                    <path d="M15 42 Q 25 38, 35 42 T 55 42 T 75 42 T 85 42" stroke="rgba(255,255,255,0.6)" stroke-width="1.2" />
                    <path d="M10 45 Q 22 41, 35 45 T 60 45 T 85 45" stroke="rgba(255,255,255,0.3)" stroke-width="1.0" />
                    <path d="M36 42 Q 43 30, 48 15" stroke="#ffffff" stroke-width="2.2" />
                    <path d="M48 15 Q 38 12, 30 18" />
                    <path d="M48 15 Q 40 7, 39 1" />
                    <path d="M48 15 Q 52 5, 60 4" />
                    <path d="M48 15 Q 58 10, 62 17" />
                    <path d="M48 15 Q 54 21, 51 28" />
                    <path d="M48 15 Q 43 21, 38 25" />
                    <path d="M72 42 Q 79 36, 86 42" stroke="rgba(255,255,255,0.7)" stroke-width="1.2" />
                  </svg>
                </div>
                <!-- Duration & Capacity Symmetrical -->
                <div style="flex: 2; text-align:right; min-width: 150px; display:flex; flex-direction:column; gap:6px;">
                  <div>
                    <div style="font-size:9px;color:#a0b2c6;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">TOUR DURATION</div>
                    <div style="font-size:14px;font-weight:800;color:#fff;text-transform:uppercase;line-height:1.2;">${booking.days || 1} DAY(S)</div>
                  </div>
                  <div>
                    <div style="font-size:9px;color:#a0b2c6;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">GROUP CAPACITY</div>
                    <div style="font-size:14px;font-weight:800;color:#fff;text-transform:uppercase;line-height:1.2;">👥 ${booking.pax || 1} PAX</div>
                  </div>
                </div>
      `;
    }

    // Receiving Account Card (with multi-bank support from central master data)
    let receivingAccountHtml = '';
    const paymentBanks = TMS.Store.getAll('payment_banks').filter(b => b.isActive !== false);
    
    if (paymentBanks.length > 0) {
      const bankRowsHtml = paymentBanks.map(b => `
        <tr style="border-bottom:1px solid #e0e5eb;">
          <td style="padding:10px 12px; font-size:12px; font-weight:800; color:#1a2b5c;">${b.bankName}</td>
          <td style="padding:10px 12px; font-size:13px; font-weight:800; color:#0b1a30; font-family:monospace; letter-spacing:0.5px;">${b.accountNo}</td>
          <td style="padding:10px 12px; font-size:12px; font-weight:700; color:#333;">${b.accountName}</td>
        </tr>
      `).join('');

      receivingAccountHtml = `
        <div style="background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #e0e5eb; height:100%; box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="background:#1a2b5c; padding:8px 12px; display:flex; align-items:center; gap:8px;">
              <span style="color:#c9a844; font-size:12px;">🏦</span>
              <span style="font-size:10px; font-weight:800; color:#fff; letter-spacing:0.5px; text-transform:uppercase;">PILIHAN REKENING PEMBAYARAN / BANK TRANSFER OPTIONS</span>
            </div>
            <table style="width:100%; border-collapse:collapse; background:#fff;">
              <thead>
                <tr style="background:#f4f6f8; border-bottom:1px solid #e0e5eb;">
                  <th style="padding:10px 12px; font-size:10px; font-weight:800; color:#333; text-align:left; border-bottom:2px solid #d0d7e0; width:30%;">Nama Bank</th>
                  <th style="padding:10px 12px; font-size:10px; font-weight:800; color:#333; text-align:left; border-bottom:2px solid #d0d7e0; width:40%;">Nomor Rekening</th>
                  <th style="padding:10px 12px; font-size:10px; font-weight:800; color:#333; text-align:left; border-bottom:2px solid #d0d7e0; width:30%;">Atas Nama</th>
                </tr>
              </thead>
              <tbody>
                ${bankRowsHtml}
              </tbody>
            </table>
          </div>
          <div style="padding:10px 12px; font-size:8.2px; color:#555; background:#fcfcfc; border-top:1px solid #e0e5eb; line-height:1.4; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            🔒 <em>Silakan transfer tepat sebesar <strong>${formatCurrency(invoice.total)}</strong> ke salah satu rekening di atas dan unggah bukti transfer.</em>
          </div>
        </div>
      `;
    } else if (invoice.receivingBankName && invoice.receivingAccountNo) {
      receivingAccountHtml = `
        <div style="background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #e0e5eb; height:100%; box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="background:#1a2b5c; padding:8px 12px; display:flex; align-items:center; gap:8px;">
              <span style="color:#c9a844; font-size:12px;">🏦</span>
              <span style="font-size:10px; font-weight:800; color:#fff; letter-spacing:0.5px; text-transform:uppercase;">REKENING PENERIMAAN PEMBAYARAN / BANK TRANSFER DETAILS</span>
            </div>
            <table style="width:100%; border-collapse:collapse; background:#fff;">
              <thead>
                <tr style="background:#f4f6f8; border-bottom:1px solid #e0e5eb;">
                  <th style="padding:10px 12px; font-size:10px; font-weight:800; color:#333; text-align:left; border-bottom:2px solid #d0d7e0; width:30%;">Nama Bank</th>
                  <th style="padding:10px 12px; font-size:10px; font-weight:800; color:#333; text-align:left; border-bottom:2px solid #d0d7e0; width:40%;">Nomor Rekening</th>
                  <th style="padding:10px 12px; font-size:10px; font-weight:800; color:#333; text-align:left; border-bottom:2px solid #d0d7e0; width:30%;">Atas Nama</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom:1px solid #e0e5eb;">
                  <td style="padding:10px 12px; font-size:12px; font-weight:800; color:#1a2b5c;">${invoice.receivingBankName}</td>
                  <td style="padding:10px 12px; font-size:13px; font-weight:800; color:#0b1a30; font-family:monospace; letter-spacing:0.5px;">${invoice.receivingAccountNo}</td>
                  <td style="padding:10px 12px; font-size:12px; font-weight:700; color:#333;">${invoice.receivingAccountName || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style="padding:10px 12px; font-size:8.2px; color:#555; background:#fcfcfc; border-top:1px solid #e0e5eb; line-height:1.4; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            🔒 <em>Silakan transfer tepat sebesar <strong>${formatCurrency(invoice.total)}</strong> ke rekening di atas dan unggah bukti transfer.</em>
          </div>
        </div>
      `;
    }

    const iRows = (invoice.items || []).map((item, i) => `
      <tr>
        <td style="width:40px;text-align:center;">${i+1}</td>
        <td>
          <div style="font-weight:700;color:#0b1a30;font-size:13px;">${item.description.replace(/\n/g, '<br>')}</div>
          <div style="font-size:10px;color:#777;margin-top:2px;">Service / Item Provided</div>
        </td>
        <td style="text-align:center;width:60px;">${item.qty || 1}</td>
        <td style="text-align:right;width:150px;font-weight:700;">${formatCurrency(item.total)}</td>
      </tr>
    `).join('');

    const html = `
    <div class="pdf-wrap" style="position:fixed;top:-9999px;left:0;width:800px;height:auto;min-height:1131px;font-family:'Inter',sans-serif;background:linear-gradient(180deg, #eef2f7 0%, #d4e0eb 100%);position:relative;overflow:hidden;box-sizing:border-box;color:#333;padding-bottom:140px;">
      <style>${PREMIUM_CSS}</style>
      
      <!-- HEADER (Modern Navy Style) -->
      <div class="pdf-header" style="background:#0b1a30; height: 140px; padding: 40px; justify-content: space-between; align-items: center; display: flex; color:#fff; position:relative; z-index:20; box-sizing:border-box;">
        <div>
          <h1 class="pdf-title" style="font-weight: 300; font-size: 38px; color: #fff; margin: 0; letter-spacing: -1px; line-height: 1;">${isReceipt ? 'BUKTI PEMBAYARAN' : 'INVOICE'}</h1>
          <div class="pdf-subtitle" style="font-size: 18px; margin-top: 5px; color: #d6bd96; font-weight:500;">${isReceipt ? 'Official Payment Receipt' : 'Official Billing Statement'}</div>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="text-align:right;">
            <div style="font-size:18px; font-weight:700; color:#fff; line-height:1;">${s.companyName}</div>
            <div style="font-size:10px; color:#a0b2c6; margin-top:2px; font-weight:400;">Travel & Tour Service</div>
          </div>
          ${s.companyLogo ? `<img src="${s.companyLogo}" style="height:45px; object-fit:contain;">` : ''}
        </div>
      </div>

      <div class="pdf-body" style="padding:40px; position:relative; z-index:10;">

        <!-- INVOICE & BOOKING REFERENCE BOX -->
        <div style="background:#fff; border: 1.5px solid #d6bd96; border-radius:10px; padding:15px; margin-bottom:20px; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <div style="font-size:10px; color:#666; letter-spacing:2px; text-transform:uppercase; margin-bottom:4px;">
            ${isReceipt ? 'NOMOR BUKTI' : 'NOMOR INVOICE'}: <span style="font-weight:700; color:#0b1a30;">${docNumber}</span> &nbsp;&bull;&nbsp; KODE BOOKING: <span style="font-weight:700; color:#0b1a30;">${invoice.bookingCode}</span>
          </div>
          <div style="font-size:28px; font-weight:900; color:#1a2b5c; letter-spacing:3px; line-height:1.2; text-transform:uppercase; margin: 0;">
            ${docNumber}
          </div>
        </div>

        <div style="display: flex; gap: 20px; margin-bottom: 12px; align-items: stretch;">
          <!-- CUSTOMER DETAILS -->
          <div style="background:#fff; border-radius:10px; overflow:hidden; flex: 1.3; box-shadow:0 2px 8px rgba(0,0,0,0.06); border: 1px solid #e0e5eb;">
            <div style="background:#1a2b5c; padding:8px 12px; display:flex; align-items:center; gap:8px;">
              <span style="color:#c9a844; font-size:12px;">👤</span>
              <span style="font-size:10px; font-weight:800; color:#fff; letter-spacing:0.5px; text-transform:uppercase;">DETAIL PELANGGAN & PESERTA</span>
            </div>
            <div style="padding:15px;">
              <div style="font-size:10px; color:#999; font-weight:600; text-transform:uppercase;">BILLED TO:</div>
              <div style="font-size:18px; font-weight:800; color:#0b1a30; margin-bottom:2px; letter-spacing:-0.5px;">${invoice.customerName}</div>
              <div style="font-size:13px; color:#555; margin-bottom:10px;">${invoice.customerEmail || '-'}</div>
              
              <div style="font-size:10px; color:#999; font-weight:600; text-transform:uppercase; margin-top:8px; margin-bottom:4px; border-top:1px dashed #eee; padding-top:6px;">DAFTAR TAMU / PENUMPANG:</div>
              ${travelersHtml}
            </div>
          </div>
          
          <!-- INVOICE METADATA -->
          <div style="background:#fff; border-radius:10px; overflow:hidden; flex: 1; box-shadow:0 2px 8px rgba(0,0,0,0.06); border: 1px solid #e0e5eb;">
            <div style="background:#1a2b5c; padding:8px 12px; display:flex; align-items:center; gap:8px;">
              <span style="color:#c9a844; font-size:12px;">📄</span>
              <span style="font-size:10px; font-weight:800; color:#fff; letter-spacing:0.5px; text-transform:uppercase;">INFO TRANSAKSI</span>
            </div>
            <div style="padding:15px; display:flex; flex-direction:column; gap:8px;">
              <div>
                <div style="font-size:9px; color:#999; font-weight:600; text-transform:uppercase;">TANGGAL INVOICE</div>
                <div style="font-size:12px; font-weight:700; color:#0b1a30;">${invoiceDate}</div>
              </div>
              <div>
                <div style="font-size:9px; color:#999; font-weight:600; text-transform:uppercase;">JATUH TEMPO</div>
                <div style="font-size:12px; font-weight:700; color:#0b1a30;">${dueDate}</div>
              </div>
              <div>
                <div style="font-size:9px; color:#999; font-weight:600; text-transform:uppercase;">METODE PEMBAYARAN</div>
                <div style="font-size:12px; font-weight:700; color:#0b1a30;">${methodLabel}</div>
              </div>
              <div>
                <div style="font-size:9px; color:#999; font-weight:600; text-transform:uppercase;">STATUS ${isReceipt ? 'PEMBAYARAN' : 'INVOICE'}</div>
                <div style="font-size:13px; font-weight:800; color:${statusColor};">${statusLabel}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- DETAILED BOOKING DETAILS CARD -->
        ${bookingCardHtml}

        <!-- BILLING DATA TABLE -->
        <div style="margin-top:20px; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #e0e5eb;">
          <div style="background:#1a2b5c; padding:8px 12px; display:flex; align-items:center; gap:8px;">
            <span style="color:#c9a844; font-size:12px;">📊</span>
            <span style="font-size:10px; font-weight:800; color:#fff; letter-spacing:0.5px; text-transform:uppercase;">RINCIAN BIAYA / ITEMIZED CHARGES</span>
          </div>
          <table style="width:100%; border-collapse:collapse; background:#fff;">
            <thead>
              <tr style="background:#f4f6f8; border-bottom:1px solid #e0e5eb;">
                <th style="padding:12px; font-size:11px; font-weight:800; color:#333; text-align:center; width:40px; border-bottom:2px solid #d0d7e0;">#</th>
                <th style="padding:12px; font-size:11px; font-weight:800; color:#333; text-align:left; border-bottom:2px solid #d0d7e0;">Deskripsi Item</th>
                <th style="padding:12px; font-size:11px; font-weight:800; color:#333; text-align:center; width:60px; border-bottom:2px solid #d0d7e0;">Qty</th>
                <th style="padding:12px; font-size:11px; font-weight:800; color:#333; text-align:right; width:150px; border-bottom:2px solid #d0d7e0;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${iRows}
            </tbody>
          </table>
        </div>

        <!-- PAYMENT BANKS & GRAND TOTAL GRID -->
        <div style="margin-top: 20px; display: flex; gap: 20px; align-items: stretch; justify-content: space-between;">
          <!-- Left: Pilihan Rekening Pembayaran (or fall back if not bank method) -->
          <div style="flex: 1.5; box-sizing: border-box;">
            ${receivingAccountHtml ? receivingAccountHtml : `
              <div style="background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #e0e5eb; padding:20px; height:100%; box-sizing:border-box; display:flex; flex-direction:column; justify-content:center;">
                <div style="font-size:12px;color:#1a2b5c;font-weight:800;margin-bottom:8px;letter-spacing:0.5px;text-transform:uppercase;">METODE PEMBAYARAN NON-TRANSFER / CASH & CARDS</div>
                <div style="font-size:11px;color:#666;line-height:1.5;">
                  Pemberitahuan: Tagihan ini dilunasi melalui metode pembayaran non-transfer bank (${methodLabel}). Konfirmasi pembayaran instan telah terekam secara aman pada sistem pembukuan ledger digital kami.
                </div>
              </div>
            `}
          </div>

          <!-- Right: Grand Total Card -->
          <div style="flex: 1; min-width: 260px; background:#fff; border: 1.5px solid #d6bd96; border-radius:10px; padding:15px; box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:11.5px; color:#666;">
              <span>Subtotal</span>
              <span style="font-weight:700;color:#0b1a30;">${formatCurrency(invoice.subtotal)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:11.5px; color:#666;">
              <span>PPN (${invoice.taxRate || 11}%)</span>
              <span style="font-weight:700;color:#0b1a30;">${formatCurrency(invoice.tax)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-top:1.5px dashed #d6bd96; padding-top:8px; margin-top:4px; align-items:center;">
              <span style="font-weight:800;font-size:12px;color:#0b1a30;letter-spacing:0.3px;">GRAND TOTAL</span>
              <span style="font-weight:900;font-size:18px;color:#1a2b5c;">${formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>

        <!-- IMPORTANT NOTES BANNER -->
        <div style="margin-top:20px; background: #fff; border-left: 4px solid #c9a844; border-radius: 4px; padding: 10px 15px; box-sizing: border-box; box-shadow: 0 1px 4px rgba(0,0,0,0.03);">
          <div style="font-size: 10px; color: #c9a844; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 2px;">INFORMASI & KETENTUAN UTAMA / IMPORTANT TERMS & CONDITIONS:</div>
          <div style="font-size: 10px; color: #555; line-height: 1.4;">
            &bull; Simpan dokumen billing ini sebagai bukti transaksi/reservasi yang valid. &bull; Seluruh pesanan bersifat final dan non-refundable. &bull; Layanan bantuan 24/7 hubungi: <strong>${s.companyPhone}</strong> / <strong>${s.companyEmail}</strong>.
          </div>
        </div>

        <!-- WATERMARK RECEIVED STAMP (if paid) -->
        ${invoice.paymentStatus === 'paid' ? `
          <div style="position:absolute; bottom:40px; left:60px; transform: rotate(-12deg); border:6px double #27ae60; color:#27ae60; padding:12px 35px; font-size:42px; font-weight:900; border-radius:18px; opacity:0.25; letter-spacing:8px; z-index:100; pointer-events:none;">PAID</div>
        ` : ''}

      </div><!-- /pdf-body -->
      
      <!-- FOOTER (Full-bleed Navy Blue with Clean SVGs) -->
      <div style="padding: 24px 40px; background-color: #0b1a30; display: flex; align-items: flex-start; gap: 40px; width: 100%; height: 140px; box-sizing: border-box; position:absolute; bottom:0; left:0; color:#fff; z-index:10;">
        <!-- Item 1 -->
        <div style="display: flex; align-items: flex-start; gap: 15px; flex: 1;">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#d6bd96" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
            <line x1="12" y1="18" x2="12.01" y2="18"></line>
          </svg>
          <div>
            <div style="font-weight: 700; color: #d6bd96; font-size: 12px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">No Need to Print</div>
            <div style="font-size: 10px; color: #a0b2c6; line-height: 1.5;">Access and manage your travel documents paperless anytime via the Travel Go app.</div>
          </div>
        </div>
        
        <!-- Item 2 -->
        <div style="display: flex; align-items: flex-start; gap: 15px; flex: 1;">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#d6bd96" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          <div>
            <div style="font-weight: 700; color: #d6bd96; font-size: 12px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Real-Time Updates</div>
            <div style="font-size: 10px; color: #a0b2c6; line-height: 1.5;">Get live updates on flight schedules, hotels, and booking status in real-time.</div>
          </div>
        </div>
      </div>

    </div>
    `;
    generateFromHTML(html, `${isReceipt ? 'Bukti_Pembayaran' : 'Invoice'}_${docNumber}.pdf`);
  }

  function generatePaymentReceipt(invoice) {
    generateInvoice(invoice, true);
  }

  function generateFinancialReport(title, tableHead, tableBody, subtitle) {
    const doc = createDoc();
    let y = addHeader(doc, title, subtitle);
    doc.autoTable({
      startY: y,
      head: [tableHead],
      body: tableBody,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [11, 26, 48], textColor: [214, 189, 150] },
    });
    addPremiumFooter(doc);
    doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
  }

  // --- TOUR VOUCHER ---
  function generateTourVoucher(booking) {
    const s = getSettings();

    const fmtDate = (d) => {
      if (!d) return '-';
      const dt = new Date(d);
      if (isNaN(dt)) return d;
      const months = ['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGT','SEP','OKT','NOV','DES'];
      return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
    };

    // Lead Traveler Name, Email & Phone
    const leadTraveler = booking.customerName || '-';
    const leadEmail    = booking.customerEmail || '-';
    const leadPhone    = booking.customerPhone || '-';

    // QR code
    const qrData = encodeURIComponent(`${booking.bookingCode}`);
    const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?data=${qrData}&size=100x100&color=1a2b5c`;

    const pageHeight = 842; // A4 standard

    const itineraryHtml = (booking.itinerary || []).map(iti => `
      <div style="margin-bottom: 10px; display: flex; gap: 12px; align-items: flex-start;">
        <div style="font-weight: 800; color: #0b1a30; font-size: 10px; background: #d6bd96; width: 45px; height: 18px; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">HARI ${iti.day}</div>
        <div>
          <div style="font-weight: 700; color: #111; font-size: 13px;">${iti.title}</div>
          <div style="font-size: 11px; color: #555; line-height: 1.4; margin-top: 2px;">${(iti.description||'').replace(/\\n/g, '<br>')}</div>
        </div>
      </div>
    `).join('') || '<div style="font-size: 11px; color: #777; padding: 10px 0;">Sesuai paket yang telah disepakati bersama.</div>';

    // Dynamic participants rows
    const participants = booking.participants || [];
    const allTravelerRows = participants.length > 0
      ? participants.map((p, i) => `
        <div style="margin-bottom: 6px; border-bottom: 1px dashed #eee; padding-bottom: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #111;">
            <div><span style="color: #c9a844; font-weight: 800; font-size: 10px; margin-right: 4px;">${i+1}.</span> <strong>${p.name || '-'}</strong></div>
            <div style="color: #555; font-size: 10px;">📞 ${p.phone || '-'}</div>
          </div>
          <div style="font-size: 9.5px; color: #777; margin-top: 2px; margin-left: 14px;">KTP/NIK: ${p.nik || '-'}</div>
        </div>
      `).join('')
      : `
        <div style="margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #111;">
          <div><span style="color: #c9a844; font-weight: 800; font-size: 10px; margin-right: 4px;">1.</span> <strong>${leadTraveler}</strong> <span style="color: #999; font-size: 9px;">(Utama)</span></div>
          <div style="color: #555; font-size: 10px;">📞 ${leadPhone}</div>
        </div>
      `;

    const html = `
    <div style="position:fixed;top:-9999px;left:0;width:595px;font-family:'Inter',Arial,sans-serif;background:#f4f6f8;box-sizing:border-box;color:#111;">
      <div style="width:595px;min-height:${pageHeight}px;background:#f4f6f8;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;position:relative;">

        <!-- HEADER (Tour Style) -->
        <div style="background:#0b1a30; height: 100px; padding: 25px 40px; justify-content: space-between; align-items: center; display: flex;">
          <div>
            <h1 style="font-weight: 300; font-size: 32px; color: #a0b2c6; margin: 0;">Tour Voucher</h1>
            <div style="font-size: 16px; margin-top: 2px; color: #d6bd96;">Tour Reservation Details</div>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="text-align:right;">
              <div style="font-size:16px; font-weight:700; color:#fff; line-height:1;">${s.companyName}</div>
              <div style="font-size:9px; color:#a0b2c6; margin-top:2px; font-weight:400;">Authorized Agent</div>
            </div>
            ${s.companyLogo ? `<img src="${s.companyLogo}" style="height:50px; object-fit:contain;">` : ''}
          </div>
        </div>

        <div style="padding:16px 24px 0;">

          <!-- CONFIRMATION REFERENCE -->
          <div style="background:#fff; border: 1px solid #d6bd96; border-radius:10px; padding:10px 20px; margin-bottom:12px; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <div style="font-size:9px; color:#666; letter-spacing:2px; text-transform:uppercase; margin-bottom:4px;">KODE KONFIRMASI / CONFIRMATION NUMBER:</div>
            <div style="font-size:28px; font-weight:900; color:#1a2b5c; letter-spacing:4px; line-height:1.2;">${booking.bookingCode}</div>
          </div>

          <div style="display: flex; gap: 14px; margin-bottom: 12px;">
            <!-- TRAVELER DETAILS -->
            <div style="background:#fff; border-radius:10px; overflow:hidden; flex: 2; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
              <div style="background:#1a2b5c; padding:10px 16px; display:flex; align-items:center; gap:8px;">
                <span style="color:#c9a844; font-size:14px;">👤</span>
                <span style="font-size:11px; font-weight:800; color:#fff; letter-spacing:1px;">DETAIL PESERTA / TRAVELER DETAILS</span>
              </div>
              <div style="padding:14px 16px; max-height:120px; overflow-y:auto;">
                ${allTravelerRows}
                <div style="margin-top:8px; font-size:10px; color:#555; display:flex; justify-content:space-between; align-items:center; border-top:1px solid #eee; padding-top:6px;">
                  <span><span style="color:#999; font-weight:600;">KONTAK UTAMA:</span> <strong>${leadPhone}</strong></span>
                  <span style="color:#777; font-size:9.5px;">Email: ${leadEmail}</span>
                </div>
              </div>
            </div>
            
            <!-- QR CODE -->
            <div style="background:#fff; border-radius:10px; padding:16px; flex: 1; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,0.06); display:flex; flex-direction:column; align-items:center; justify-content:center;">
              <img src="${qrUrl}" width="80" height="80" style="border:2px solid #1a2b5c; border-radius:6px;">
              <div style="font-size:8px; color:#999; margin-top:8px; letter-spacing:1px;">SCAN FOR VERIFICATION</div>
            </div>
          </div>

          <!-- TOUR & DESTINATION DETAILS -->
          <div style="background:#fff; border-radius:10px; overflow:hidden; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="background:#c9a844; padding:8px 16px;">
              <div style="font-size:11px;font-weight:800;color:#1a2b5c;letter-spacing:1px;">DETAIL PAKET & DESTINASI / TOUR & DESTINATION DETAILS</div>
            </div>
            <div style="padding:14px 16px;background:#1a2b5c;color:#fff;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <!-- Tour Name -->
                <div style="flex: 2; min-width: 150px;">
                  <div style="font-size:10px;color:#a0b2c6;font-weight:600;text-transform:uppercase;">TOUR PACKAGE</div>
                  <div style="font-size:18px;font-weight:800;color:#fff;line-height:1.2;text-transform:uppercase;">${booking.tourName}</div>
                  <div style="font-size:11px;color:#d6bd96;font-weight:700;margin-top:4px;">📍 DESTINASI: ${booking.destination || '-'}</div>
                </div>
                <!-- Middle (Relaxing Palm Tree & Summer Sun SVG) -->
                <div style="flex:1;text-align:center;padding:0 10px;display:flex;align-items:center;justify-content:center;">
                  <svg viewBox="0 0 100 50" width="70" height="35" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="50" cy="20" r="10" stroke="rgba(255,255,255,0.35)" stroke-width="1.2" stroke-dasharray="2 1" />
                    <path d="M15 42 Q 25 38, 35 42 T 55 42 T 75 42 T 85 42" stroke="rgba(255,255,255,0.6)" stroke-width="1.2" />
                    <path d="M10 45 Q 22 41, 35 45 T 60 45 T 85 45" stroke="rgba(255,255,255,0.3)" stroke-width="1.0" />
                    <path d="M36 42 Q 43 30, 48 15" stroke="#ffffff" stroke-width="2.2" />
                    <path d="M48 15 Q 38 12, 30 18" />
                    <path d="M48 15 Q 40 7, 39 1" />
                    <path d="M48 15 Q 52 5, 60 4" />
                    <path d="M48 15 Q 58 10, 62 17" />
                    <path d="M48 15 Q 54 21, 51 28" />
                    <path d="M48 15 Q 43 21, 38 25" />
                    <path d="M72 42 Q 79 36, 86 42" stroke="rgba(255,255,255,0.7)" stroke-width="1.2" />
                  </svg>
                </div>
                <!-- Duration & Capacity Symmetrical -->
                <div style="flex: 2; text-align:right; min-width: 150px; display:flex; flex-direction:column; gap:6px;">
                  <div>
                    <div style="font-size:9px;color:#a0b2c6;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">TOUR DURATION</div>
                    <div style="font-size:14px;font-weight:800;color:#fff;text-transform:uppercase;line-height:1.2;">${booking.days || 1} DAY(S)</div>
                  </div>
                  <div>
                    <div style="font-size:9px;color:#a0b2c6;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">GROUP CAPACITY</div>
                    <div style="font-size:14px;font-weight:800;color:#fff;text-transform:uppercase;line-height:1.2;">👥 ${booking.pax || 1} PAX</div>
                  </div>
                </div>
              </div>
              <!-- Info row -->
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px;border-top:1px dashed rgba(255,255,255,0.2);padding-top:10px;">
                <div>
                  <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">DEPARTURE DATE</div>
                  <div style="font-size:11px;font-weight:700;color:#fff;">${fmtDate(booking.departureDate)}</div>
                  <div style="font-size:9px;color:#a0b2c6;margin-top:2px;">08:00 WIB</div>
                </div>
                <div>
                  <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">TOTAL DURATION</div>
                  <div style="font-size:11px;font-weight:700;color:#fff;">${booking.days} Day(s)</div>
                </div>
                <div>
                  <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">GROUP SIZE</div>
                  <div style="font-size:11px;font-weight:700;color:#fff;">${booking.pax} Pax</div>
                </div>
                <div>
                  <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">REFUND POLICY</div>
                  <div style="font-size:11px;font-weight:700;color:#ff6b6b;">Non-Refundable</div>
                </div>
                <div style="grid-column:span 4;">
                  <div style="font-size:9px;color:#a0b2c6;font-weight:700;text-transform:uppercase;">FASILITAS & INKLUSI / INCLUSIONS</div>
                  <div style="font-size:11px;font-weight:700;color:#fff;line-height:1.4;">
                    📌 Inklusi: ${booking.inclusions ? booking.inclusions.replace(/\n/g, ', ') : 'Fasilitas standar paket wisata.'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- DAILY ITINERARY DETAILS -->
          <div style="background:#fff; border-radius:10px; overflow:hidden; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="background:#1a2b5c; padding:10px 16px; display:flex; align-items:center; gap:8px;">
              <span style="color:#c9a844; font-size:14px;">📅</span>
              <span style="font-size:11px; font-weight:800; color:#fff; letter-spacing:1px;">JADWAL PERJALANAN / DAILY ITINERARY</span>
            </div>
            <div style="padding:14px 16px; background:#fff; max-height:280px; overflow-y:auto;">
              ${itineraryHtml}
            </div>
          </div>

          <!-- IMPORTANT INFO -->
          <div style="background:#fff; border-radius:10px; overflow:hidden; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="background:#1a2b5c; padding:10px 16px; display:flex; align-items:center; gap:8px;">
              <span style="color:#c9a844; font-size:14px;">ℹ</span>
              <span style="font-size:11px; font-weight:800; color:#fff; letter-spacing:1px;">INFORMASI PENTING / IMPORTANT INFO</span>
            </div>
            <div style="padding:14px 16px; display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <div style="width:32px; height:32px; background:#f0f4ff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">🕐</div>
                <div>
                  <div style="font-size:11px; font-weight:700; color:#1a2b5c;">Meeting Point</div>
                  <div style="font-size:10px; color:#666; line-height:1.4;">Harap berkumpul di titik temu 30 menit sebelum jadwal keberangkatan.</div>
                </div>
              </div>
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <div style="width:32px; height:32px; background:#f0f4ff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">🛡</div>
                <div>
                  <div style="font-size:11px; font-weight:700; color:#1a2b5c;">Identification</div>
                  <div style="font-size:10px; color:#666; line-height:1.4;">Wajib membawa KTP/Paspor asli yang masih aktif untuk verifikasi tiket masuk.</div>
                </div>
              </div>
            </div>
          </div>

          <!-- CONTACT SUPPORT (Tour Style) -->
          <div style="padding:0 15px 15px; display:flex; justify-content:space-between; align-items:flex-end; border-bottom:1px solid #d6bd96; margin-bottom:12px; box-sizing:border-box;">
            <div>
              <div style="font-size: 11px; font-weight: 600; color: #555; margin-bottom: 6px;">FOR ANY QUESTIONS, CONTACT OUR SUPPORT:</div>
              <div style="font-size: 12px; font-weight: 700; color: #111; display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:14px; color:#1a2b5c; width:16px; text-align:center;">📞</span>
                  <span>${s.companyPhone}</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:14px; color:#1a2b5c; width:16px; text-align:center;">✉</span>
                  <span>${s.companyEmail}</span>
                </div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; font-weight: 600; color: #555; margin-bottom: 6px;">Voucher ID</div>
              <div style="font-size: 15px; font-weight: 700; color: #111; display:flex; align-items:center; justify-content:flex-end; gap:5px;">
                <span style="font-size:16px;">📄</span> ${booking.bookingCode}
              </div>
            </div>
          </div>

        </div><!-- /padding -->

        <!-- FOOTER (Full-bleed Navy Blue) -->
        <div style="padding: 24px 40px; background-color: #0b1a30; display: flex; align-items: flex-start; gap: 40px; width: 100%; box-sizing: border-box; margin-top: auto;">
          <!-- Item 1 -->
          <div style="display: flex; align-items: flex-start; gap: 15px; flex: 1;">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#d6bd96" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
              <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
            <div>
              <div style="font-weight: 700; color: #d6bd96; font-size: 12px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">No Need to Print</div>
              <div style="font-size: 10px; color: #a0b2c6; line-height: 1.5;">Access your daily tour itinerary and guides completely paperless inside the Travel Go app.</div>
            </div>
          </div>
          
          <!-- Item 2 -->
          <div style="display: flex; align-items: flex-start; gap: 15px; flex: 1;">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#d6bd96" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <div>
              <div style="font-weight: 700; color: #d6bd96; font-size: 12px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Real-Time Updates</div>
              <div style="font-size: 10px; color: #a0b2c6; line-height: 1.5;">Receive instant alerts regarding guide contacts, meeting point changes, and status updates.</div>
            </div>
          </div>
        </div>

      </div>
    </div>`;

    generateFromHTML(html, `TourVoucher_${booking.bookingCode}.pdf`);
  }

  function generateTourQuotation(booking) {
    const s = getSettings();
    const dateNow = new Date();
    const fmtDate = (d) => {
      if (!d) return '-';
      const dt = new Date(d);
      if (isNaN(dt)) return d;
      const months = ['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGT','SEP','OKT','NOV','DES'];
      return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
    };

    const quotationDate = fmtDate(dateNow);
    const validUntil = new Date(dateNow.getTime() + 7 * 86400000); // Valid for 7 days
    const dueDate = fmtDate(validUntil);

    const isTaxEnabled = s.taxEnabled;
    const taxRate = isTaxEnabled ? (s.taxRate || 0) : 0;
    const subtotal = booking.sellingPrice || 0;
    const tax = Math.round(subtotal * taxRate / 100);
    const total = subtotal + tax;

    // Split inclusions to add checkmarks
    const rawInclusions = booking.inclusions || 'Penerbangan PP\\nAkomodasi Hotel Bintang 4\\nTransportasi Private\\nTiket Masuk Wisata\\nGuide Berbahasa Indonesia';
    const inclusionsHtml = rawInclusions.split('\\n')
      .map(line => line.trim())
      .filter(line => line)
      .map(line => `
        <div style="padding: 6px 10px; background:#f4f6f8; border-radius:4px; border-left:3px solid #28a745; margin-bottom:6px;">
          <table style="width:100%; border:none; border-collapse:collapse;">
            <tr>
              <td style="width:18px; vertical-align:top; color:#28a745; font-weight:bold; font-size:12px; line-height:1;">✓</td>
              <td style="font-size:11px; color:#334155; line-height:1.3; font-weight:500;">${line}</td>
            </tr>
          </table>
        </div>
      `).join('');

    // Itinerary HTML (Table Format)
    const itineraryHtml = `
      <div style="border: 1px solid #d0d7e0; border-radius:8px; background:#fff; overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; background:#fff;">
          <thead>
            <tr style="background:#1a365d;">
              <th style="padding:14px 18px; font-size:11px; font-weight:700; color:#fff; text-align:center; letter-spacing:1px; text-transform:uppercase; width:80px;">Hari</th>
              <th style="padding:14px 18px; font-size:11px; font-weight:700; color:#fff; text-align:left; letter-spacing:1px; text-transform:uppercase;">Jadwal & Kegiatan Perjalanan</th>
            </tr>
          </thead>
          <tbody>
            ${(booking.itinerary || []).map(iti => `
              <tr>
                <td style="padding:12px; text-align:center; border-bottom: 1px solid #eee; vertical-align:top;">
                  <div style="font-weight: 800; color: #fff; font-size: 10px; background: #c9a844; padding:4px 0; border-radius: 4px; text-align: center; width: 50px; margin:0 auto; letter-spacing:1px;">HARI ${iti.day}</div>
                </td>
                <td style="padding:12px; border-bottom: 1px solid #eee; vertical-align:top;">
                  <div style="font-weight: 800; color: #1a365d; font-size: 12px; margin-bottom: 4px;">${iti.title}</div>
                  <div style="font-size: 11px; color: #555; line-height: 1.5;">${iti.description.replace(/\n/g, '<br>')}</div>
                </td>
              </tr>
            `).join('') || `<tr><td colspan="2" style="padding:12px; text-align:center; color:#777; font-size:11px;">Sesuai paket yang disepakati.</td></tr>`}
          </tbody>
        </table>
      </div>
    `;

    // PAGE 2: FULL Terms & Conditions
    const fullTermsHtml = `
      <div style="font-size: 14px; color: #1a365d; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 15px; border-bottom:2px solid #d6bd96; padding-bottom:8px;">SYARAT & KETENTUAN PAKET WISATA</div>
      <div style="font-size: 11.5px; color: #444; line-height: 1.6;">
        <p style="margin-top:0; margin-bottom:12px;">Dengan mendaftar, peserta dianggap setuju dengan seluruh syarat dan ketentuan berikut:</p>
        
        <strong style="color:#0b1a30; font-size:12px;">1. Pembayaran & Pendaftaran</strong>
        <ul style="margin-top:4px; margin-bottom:12px; padding-left:18px;">
          <li><strong>DP (Uang Muka):</strong> Wajib dibayarkan saat pendaftaran dan bersifat <strong>Hangus (Non-Refundable)</strong>.</li>
          <li><strong>Pelunasan:</strong> Wajib dilakukan maksimal <strong>14 hari</strong> sebelum keberangkatan. Gagal melunasi berarti pendaftaran batal dan DP hangus.</li>
          <li><strong>Identitas:</strong> Wajib melampirkan fotokopi KTP/Paspor yang masih berlaku saat mendaftar.</li>
        </ul>

        <strong style="color:#0b1a30; font-size:12px;">2. Harga Paket</strong>
        <ul style="margin-top:4px; margin-bottom:12px; padding-left:18px;">
          <li><strong>Termasuk:</strong> Penerbangan, hotel, transportasi lokal, tiket wisata, dan makan (sesuai itinerary).</li>
          <li><strong>Tidak Termasuk:</strong> Visa, paspor, asuransi perjalanan, pengeluaran pribadi (laundry, telepon), dan tipping (kecuali diatur lain).</li>
          <li style="color:#e74c3c; font-weight:600;">Catatan: Harga dapat berubah sewaktu-waktu akibat fluktuasi kurs mata uang atau kenaikan pajak/tiket penerbangan sebelum pelunasan dilakukan.</li>
        </ul>

        <strong style="color:#0b1a30; font-size:12px;">3. Pembatalan & Refund</strong>
        <ul style="margin-top:4px; margin-bottom:12px; padding-left:18px;">
          <li><strong>Setelah DP:</strong> DP hangus (100% Non-Refundable).</li>
          <li><strong>15 - 30 hari sebelum berangkat:</strong> Potongan 50% dari total harga.</li>
          <li><strong>Kurang dari 14 hari sebelum berangkat:</strong> Potongan 100% (Tidak ada pengembalian dana).</li>
          <li>Fasilitas yang tidak digunakan oleh peserta selama tur tidak dapat diuangkan (No Refund).</li>
        </ul>

        <strong style="color:#0b1a30; font-size:12px;">4. Visa & Imigrasi</strong>
        <ul style="margin-top:4px; margin-bottom:12px; padding-left:18px;">
          <li>Keputusan persetujuan Visa mutlak ada di tangan Kedutaan. Jika Visa ditolak, <strong>biaya Visa hangus</strong> dan biaya pembatalan tur tetap berlaku.</li>
          <li>Travel Agent dibebaskan dari segala tuntutan hukum atau refund jika peserta dideportasi atau ditolak masuk oleh imigrasi negara setempat.</li>
        </ul>

        <strong style="color:#0b1a30; font-size:12px;">5. Force Majeure & Perubahan Jadwal</strong>
        <ul style="margin-top:4px; margin-bottom:12px; padding-left:18px;">
          <li>Travel Agent berhak mengubah jadwal (itinerary) demi keamanan jika terjadi Force Majeure (bencana alam, perang, pandemi, kebijakan mendadak maskapai/pemerintah).</li>
          <li>Segala biaya tambahan akibat Force Majeure atau permintaan penyimpangan rute (Deviasi) oleh peserta menjadi tanggungan peserta sepenuhnya.</li>
        </ul>

        <strong style="color:#0b1a30; font-size:12px;">6. Tanggung Jawab</strong>
        <div style="margin-top:4px; margin-bottom:12px;">
          Travel agent <strong>tidak bertanggung jawab</strong> dan tidak dapat dituntut atas:
          <ol style="margin-top:4px; padding-left:18px;">
            <li>Kecelakaan, kehilangan barang bawaan, cedera, atau meninggal dunia.</li>
            <li>Penundaan/pembatalan penerbangan oleh pihak maskapai.</li>
            <li>Kerugian akibat kelalaian peserta atau ketidakpatuhan terhadap aturan lokal dan arahan pemandu wisata.</li>
          </ol>
        </div>
      </div>
    `;

    const page1Html = `
    <div class="pdf-wrap" style="position:fixed;top:-9999px;left:0;width:800px;height:auto;min-height:1131px;font-family:'Inter',sans-serif;background-color:#fff;position:relative;overflow:hidden;box-sizing:border-box;color:#333;display:flex;flex-direction:column;">
      <style>${PREMIUM_CSS}</style>
      
      <!-- HERO HEADER -->
      <div class="pdf-header" style="background-color: #0b1a30; padding: 30px 40px; display: flex; justify-content: space-between; align-items: center; color:#fff; position:relative; box-sizing:border-box;">
        <div style="width: 50%;">
          <h1 style="font-weight: 300; font-size: 38px; color: #fff; margin: 0; letter-spacing: 2px; line-height: 1;">QUOTATION</h1>
          <div style="font-size: 14px; margin-top: 8px; color: #d6bd96; font-weight:600; letter-spacing:4px; text-transform:uppercase;">Surat Penawaran Harga</div>
        </div>
        <div style="width: 50%; display:flex; align-items:center; justify-content:flex-end; gap:16px;">
          <div style="text-align:right;">
            <div style="font-size:20px; font-weight:800; color:#fff; line-height:1; letter-spacing:1px;">${s.companyName}</div>
            <div style="font-size:10px; color:#a0b2c6; margin-top:4px; font-weight:400; text-transform:uppercase; letter-spacing:1px;">Premium Tour Operator</div>
          </div>
          ${s.companyLogo ? `<img src="${s.companyLogo}" style="height:45px; object-fit:contain;">` : ''}
        </div>
      </div>

      <!-- GOLD DIVIDER -->
      <div style="height: 4px; background-color: #c9a844; width: 100%;"></div>

      <div class="pdf-body" style="padding:30px; position:relative; z-index:10; flex:1;">

        <!-- TOP METADATA & CUSTOMER CARDS -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 16px; width: 100%;">
          <!-- CUSTOMER -->
          <div style="width: 58%; background:#fff; border-radius:8px; padding:16px; border: 1px solid #d0d7e0;">
            <div style="font-size:10px; color:#999; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
              <span style="color:#1a365d;">👤</span> Ditawarkan Kepada
            </div>
            <div style="font-size:18px; font-weight:800; color:#0b1a30; margin-bottom:4px; letter-spacing:-0.5px;">${booking.customerName}</div>
            <div style="font-size:11px; color:#666; margin-bottom:2px;">${booking.customerEmail || '-'}</div>
            <div style="font-size:11px; color:#666;">Phone: ${booking.customerPhone || '-'}</div>
          </div>
          
          <!-- QUOTATION INFO -->
          <div style="width: 38%; background:#fff; border-radius:8px; padding:16px; border: 1px solid #d0d7e0;">
            <div style="font-size:10px; color:#999; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
              <span style="color:#1a365d;">📄</span> Informasi Dokumen
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:11px;">
              <tr>
                <td style="color:#666; padding-bottom:6px;">No. Referensi</td>
                <td style="text-align:right; font-weight:700; color:#0b1a30; padding-bottom:6px;">${booking.bookingCode}</td>
              </tr>
              <tr>
                <td style="color:#666; padding-bottom:6px;">Tgl. Penawaran</td>
                <td style="text-align:right; font-weight:700; color:#0b1a30; padding-bottom:6px;">${quotationDate}</td>
              </tr>
              <tr>
                <td style="color:#666; padding-bottom:6px;">Berlaku Hingga</td>
                <td style="text-align:right; font-weight:700; color:#c9a844; padding-bottom:6px;">${dueDate}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- TOUR DETAILS BANNER -->
        <div style="background-color: #1a365d; border-radius:8px; padding:16px; margin-bottom:16px; text-align:center;">
          <div style="font-size:10px; color:#c9a844; letter-spacing:3px; text-transform:uppercase; font-weight:700; margin-bottom:6px;">Program Tour</div>
          <div style="font-size:22px; font-weight:900; color:#fff; letter-spacing:1px; text-transform:uppercase; margin-bottom:8px;">${booking.tourName}</div>
          <div style="text-align:center; font-size:11px; color:#e2e8f0;">
            <span style="margin: 0 8px;"><span style="color:#c9a844;">📍</span> ${booking.destination || 'Multi Destination'}</span>
            <span style="margin: 0 8px;"><span style="color:#c9a844;">🗓</span> ${fmtDate(booking.departureDate)}</span>
            <span style="margin: 0 8px;"><span style="color:#c9a844;">⏱</span> ${booking.days} Hari</span>
            <span style="margin: 0 8px;"><span style="color:#c9a844;">👥</span> ${booking.pax} Pax</span>
          </div>
        </div>

        <!-- ITINERARY SECTION -->
        <div style="margin-bottom:16px;">
          ${itineraryHtml}
        </div>

        <!-- PRICING TABLE (Zebra stripes, minimalist) -->
        <div style="margin-bottom:16px;">
          <div style="border: 1px solid #d0d7e0; border-radius:8px; background:#fff; overflow:hidden;">
            <table style="width:100%; border-collapse:collapse; background:#fff;">
              <thead>
                <tr style="background:#1a365d;">
                  <th style="padding:10px 14px; font-size:10px; font-weight:700; color:#fff; text-align:left; letter-spacing:1px; text-transform:uppercase;">Deskripsi Penawaran</th>
                  <th style="padding:10px 14px; font-size:10px; font-weight:700; color:#fff; text-align:center; letter-spacing:1px; text-transform:uppercase; width:70px;">Jumlah</th>
                  <th style="padding:10px 14px; font-size:10px; font-weight:700; color:#fff; text-align:right; letter-spacing:1px; text-transform:uppercase; width:120px;">Harga per Pax</th>
                  <th style="padding:10px 14px; font-size:10px; font-weight:700; color:#fff; text-align:right; letter-spacing:1px; text-transform:uppercase; width:140px;">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding:14px; border-bottom: 1px solid #d0d7e0;">
                    <div style="font-weight:800; color:#0b1a30; font-size:13px;">Paket Tour ${booking.tourName}</div>
                    <div style="font-size:10px; color:#777; margin-top:4px;">Harga berlaku sesuai kesepakatan fasilitas terlampir.</div>
                  </td>
                  <td style="padding:14px; text-align:center; font-size:13px; font-weight:600; color:#333; border-bottom: 1px solid #d0d7e0;">${booking.pax} <span style="font-size:9px; color:#888;">Pax</span></td>
                  <td style="padding:14px; text-align:right; font-size:13px; color:#333; border-bottom: 1px solid #d0d7e0;">${formatCurrency(booking.sellingPricePerPax)}</td>
                  <td style="padding:14px; text-align:right; font-weight:800; font-size:13px; color:#0b1a30; border-bottom: 1px solid #d0d7e0;">${formatCurrency(subtotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- INCLUSIONS & TOTALS TABLE -->
        <table style="width:100%; border-collapse:collapse; border:none; margin-bottom:16px;">
          <tr>
            <!-- LEFT: INCLUSIONS -->
            <td style="width:55%; vertical-align:top; padding-right:16px;">
              <div style="background:#fff; border:1px solid #d0d7e0; border-radius:8px; padding:16px; box-sizing: border-box;">
                <div style="font-size:11px; color:#1a365d; font-weight:800; margin-bottom:12px; letter-spacing:1px; text-transform:uppercase;">
                  <span style="color:#c9a844; margin-right:6px;">✦</span> Rincian Fasilitas Paket
                </div>
                <div>
                  ${inclusionsHtml}
                </div>
              </div>
            </td>
            <!-- RIGHT: TOTALS -->
            <td style="width:45%; vertical-align:top;">
              <div style="background-color: #fdfbf5; border: 1.5px solid #c9a844; border-radius:8px; padding:20px; box-sizing: border-box;">
                <table style="width:100%; border:none; font-size:12px; color:#555;">
                  <tr>
                    <td style="padding-bottom:10px;">Subtotal</td>
                    <td style="text-align:right; font-weight:700; color:#0b1a30; padding-bottom:10px;">${formatCurrency(subtotal)}</td>
                  </tr>
                  ${isTaxEnabled ? `
                  <tr>
                    <td style="padding-bottom:12px;">PPN (${taxRate}%)</td>
                    <td style="text-align:right; font-weight:700; color:#0b1a30; padding-bottom:12px;">${formatCurrency(tax)}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td colspan="2"><div style="height:1px; background-color:#c9a844; margin: 0 0 12px 0;"></div></td>
                  </tr>
                  <tr>
                    <td>
                      <div style="font-weight:800; font-size:11px; color:#8a732b; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px;">Grand Total Estimasi</div>
                    </td>
                    <td style="text-align:right;">
                      <div style="font-weight:900; font-size:22px; color:#1a365d; line-height:1; letter-spacing:-0.5px;">${formatCurrency(total)}</div>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
        </table>
        
        <div style="margin-top:16px; text-align:center; font-size:10px; color:#666;">
          Lihat Halaman 2 untuk detail Syarat & Ketentuan Paket Wisata.
        </div>

      </div><!-- /pdf-body -->
      
      <!-- FOOTER -->
      <div style="padding: 24px 40px; background-color: #0b1a30; text-align: center; width: 100%; box-sizing: border-box; border-top: 4px solid #c9a844; margin-top: auto;">
        <div style="font-size:12px; font-weight:600; color:#d6bd96; margin-bottom:6px; letter-spacing:1px; text-transform:uppercase;">Terima kasih atas kepercayaan Anda - Halaman 1 / 2</div>
        <div style="font-size:10px; color:#8aa2be; line-height:1.5;">
          ${s.companyName} | ${s.companyAddress}<br>
          Phone: ${s.companyPhone} | Email: ${s.companyEmail}
        </div>
      </div>

    </div>
    `;

    const page2Html = `
    <div class="pdf-wrap" style="position:fixed;top:-9999px;left:0;width:800px;height:auto;min-height:1131px;font-family:'Inter',sans-serif;background-color:#fff;position:relative;overflow:hidden;box-sizing:border-box;color:#333;display:flex;flex-direction:column;">
      <style>${PREMIUM_CSS}</style>
      
      <!-- HERO HEADER -->
      <div class="pdf-header" style="background-color: #0b1a30; height: 160px; padding: 40px; display: flex; justify-content: space-between; align-items: center; color:#fff; position:relative; box-sizing:border-box;">
        <div style="width: 50%;">
          <h1 style="font-weight: 300; font-size: 38px; color: #fff; margin: 0; letter-spacing: 2px; line-height: 1;">TERMS & CONDITIONS</h1>
          <div style="font-size: 14px; margin-top: 8px; color: #d6bd96; font-weight:600; letter-spacing:4px; text-transform:uppercase;">Syarat dan Ketentuan</div>
        </div>
        <div style="width: 50%; display:flex; align-items:center; justify-content:flex-end; gap:16px;">
          <div style="text-align:right;">
            <div style="font-size:20px; font-weight:800; color:#fff; line-height:1; letter-spacing:1px;">${s.companyName}</div>
            <div style="font-size:10px; color:#a0b2c6; margin-top:4px; font-weight:400; text-transform:uppercase; letter-spacing:1px;">Premium Tour Operator</div>
          </div>
          ${s.companyLogo ? `<div style="background:#fff; padding:6px; border-radius:8px;"><img src="${s.companyLogo}" style="height:45px; object-fit:contain; display:block;"></div>` : ''}
        </div>
      </div>

      <!-- GOLD DIVIDER -->
      <div style="height: 4px; background-color: #c9a844; width: 100%;"></div>

      <div class="pdf-body" style="padding:40px; position:relative; z-index:10; flex:1;">
        <div style="background-color: #f4f6f8; border: 1px solid #d0d7e0; border-radius: 12px; padding: 30px; box-sizing: border-box;">
          ${fullTermsHtml}
        </div>
      </div>
      
      <!-- FOOTER -->
      <div style="padding: 24px 40px; background-color: #0b1a30; text-align: center; width: 100%; box-sizing: border-box; border-top: 4px solid #c9a844; margin-top: auto;">
        <div style="font-size:12px; font-weight:600; color:#d6bd96; margin-bottom:6px; letter-spacing:1px; text-transform:uppercase;">Terima kasih atas kepercayaan Anda - Halaman 2 / 2</div>
        <div style="font-size:10px; color:#8aa2be; line-height:1.5;">
          ${s.companyName} | ${s.companyAddress}<br>
          Phone: ${s.companyPhone} | Email: ${s.companyEmail}
        </div>
      </div>
    </div>
    `;

    if (typeof generateMultiPageFromHTML === 'function') {
      generateMultiPageFromHTML([page1Html, page2Html], `Penawaran_Tour_${booking.bookingCode}.pdf`);
    } else {
      generateFromHTML(page1Html, `Penawaran_Tour_${booking.bookingCode}.pdf`);
    }
  }

  return { generateETicket, generateHotelVoucher, generateRentalVoucher, generateTourVoucher, generateInvoice, generatePaymentReceipt, generateFinancialReport, generateTourQuotation };
})();
