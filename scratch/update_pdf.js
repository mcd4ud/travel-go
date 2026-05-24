const fs = require('fs');
const file = 'd:/Project/Travel Go/js/modules/pdf.js';
let content = fs.readFileSync(file, 'utf8');

// 1. FLIGHT
const flightSectionMatch = content.match(/const flightSection = \(label, opts\) => `[\s\S]*?`(?=;)/);
const invoiceFlightSectionRegex = /(const flightSection = \(label, opts\) => `[\s\S]*?`)(?=;[\s\S]*const depSection = flightSection)/;

if (flightSectionMatch && invoiceFlightSectionRegex.test(content)) {
  content = content.replace(invoiceFlightSectionRegex, flightSectionMatch[0]);
  
  // Also update the calls in generateInvoice
  content = content.replace(
    /seat: booking\.seatClass \|\| '-',\s*}\);/g,
    "seat: booking.seatClass || '-', terminal: booking.terminal || '-', baggage: booking.baggage || '20'\n      });"
  );
  content = content.replace(
    /seat: booking\.returnSeatClass \|\| '-',\s*}\) : '';/g,
    "seat: booking.returnSeatClass || '-', terminal: booking.returnTerminal || '-', baggage: booking.returnBaggage || '20'\n      }) : '';"
  );
} else {
  console.log("Flight section not matched");
}

// 2. HOTEL
const hotelVoucherMatch = content.match(/(<div style="background:#fff; border-radius:10px; overflow:hidden; margin-bottom:12px; box-shadow:0 2px 8px rgba\(0,0,0,0\.06\);">\s*<div style="background:#c9a844; padding:8px 16px;">\s*<div style="font-size:11px;font-weight:800;color:#1a2b5c;letter-spacing:1px;">DETAIL HOTEL & KAMAR[\s\S]*?<\/div>\s*<\/div>\s*<\/div>)/);
const hotelInvoiceMatch = content.match(/bookingCardHtml = `\s*(<div style="background:#fff; border-radius:10px; overflow:hidden; margin-top:20px; box-shadow:0 2px 8px rgba\(0,0,0,0\.06\); border:1px solid #d6bd96;">\s*<div style="background:#c9a844; padding:6px 12px;">\s*<div style="font-size:10px;font-weight:800;color:#1a2b5c;letter-spacing:1px;">DETAIL HOTEL & KAMAR[\s\S]*?<\/div>\s*<\/div>\s*<\/div>)\s*`;/);

if (hotelVoucherMatch && hotelInvoiceMatch) {
  let newHotelStr = hotelVoucherMatch[1].replace(/fmtDate/g, 'formatDate');
  content = content.replace(hotelInvoiceMatch[1], newHotelStr);
} else {
  console.log("Hotel section not matched");
}

// 3. RENTAL
const rentalVoucherMatch = content.match(/(<div style="background:#fff; border-radius:10px; overflow:hidden; margin-bottom:12px; box-shadow:0 2px 8px rgba\(0,0,0,0\.06\);">\s*<div style="background:#c9a844; padding:8px 16px;">\s*<div style="font-size:11px;font-weight:800;color:#1a2b5c;letter-spacing:1px;">DETAIL KENDARAAN & SEWA[\s\S]*?<\/div>\s*<\/div>\s*<\/div>)/);
const rentalInvoiceMatch = content.match(/bookingCardHtml = `\s*(<div style="background:#fff; border-radius:10px; overflow:hidden; margin-top:20px; box-shadow:0 2px 8px rgba\(0,0,0,0\.06\); border:1px solid #d6bd96;">\s*<div style="background:#c9a844; padding:6px 12px;">\s*<div style="font-size:10px;font-weight:800;color:#1a2b5c;letter-spacing:1px;">DETAIL KENDARAAN & SEWA[\s\S]*?<\/div>\s*<\/div>\s*<\/div>)\s*`;/);

if (rentalVoucherMatch && rentalInvoiceMatch) {
  let newRentalStr = rentalVoucherMatch[1].replace(/fmtDate/g, 'formatDate');
  content = content.replace(rentalInvoiceMatch[1], newRentalStr);
} else {
  console.log("Rental section not matched");
}

// 4. TOUR
const tourVoucherMatch = content.match(/(<div style="background:#fff; border-radius:10px; overflow:hidden; margin-bottom:12px; box-shadow:0 2px 8px rgba\(0,0,0,0\.06\);">\s*<div style="background:#c9a844; padding:8px 16px;">\s*<div style="font-size:11px;font-weight:800;color:#1a2b5c;letter-spacing:1px;">DETAIL PAKET & DESTINASI[\s\S]*?<\/div>\s*<\/div>\s*<\/div>)/);
const tourInvoiceMatch = content.match(/bookingCardHtml = `\s*(<div style="background:#fff; border-radius:10px; overflow:hidden; margin-top:20px; box-shadow:0 2px 8px rgba\(0,0,0,0\.06\); border:1px solid #d6bd96;">\s*<div style="background:#c9a844; padding:6px 12px;">\s*<div style="font-size:10px;font-weight:800;color:#1a2b5c;letter-spacing:1px;">DETAIL PAKET & DESTINASI[\s\S]*?<\/div>\s*<\/div>\s*<\/div>)\s*`;/);

if (tourVoucherMatch && tourInvoiceMatch) {
  let newTourStr = tourVoucherMatch[1].replace(/fmtDate/g, 'formatDate');
  content = content.replace(tourInvoiceMatch[1], newTourStr);
} else {
  console.log("Tour section not matched");
}

fs.writeFileSync(file, content);
console.log('PDF sync completed successfully.');
