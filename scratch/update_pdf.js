const fs = require('fs');
const file = 'd:/Project/Travel Go/js/modules/pdf.js';
let content = fs.readFileSync(file, 'utf8');

function extractBlock(startMarker, endMarker) {
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) throw new Error("Start marker not found: " + startMarker);
  const endIdx = content.indexOf(endMarker, startIdx);
  if (endIdx === -1) throw new Error("End marker not found: " + endMarker);
  
  const divStartIdx = content.indexOf('<div', startIdx);
  return content.substring(divStartIdx, endIdx).trim();
}

try {
  // 1. FLIGHT
  const flightSectionRegex = /const flightSection = \(label, opts\) => `[\s\S]*?`(?=;)/;
  const flightSectionMatch = content.match(flightSectionRegex);
  const invoiceFlightSectionRegex = /(const flightSection = \(label, opts\) => `[\s\S]*?`)(?=;[\s\S]*const depSection = flightSection)/;
  
  if (flightSectionMatch && invoiceFlightSectionRegex.test(content)) {
    content = content.replace(invoiceFlightSectionRegex, flightSectionMatch[0]);
    content = content.replace(
      /seat: booking\.seatClass \|\| '-',\s*}\);/g,
      "seat: booking.seatClass || '-', terminal: booking.terminal || '-', baggage: booking.baggage || '20'\n      });"
    );
    content = content.replace(
      /seat: booking\.returnSeatClass \|\| '-',\s*}\) : '';/g,
      "seat: booking.returnSeatClass || '-', terminal: booking.returnTerminal || '-', baggage: booking.returnBaggage || '20'\n      }) : '';"
    );
  }

  // 2. HOTEL
  const hotelBlock = extractBlock('<!-- HOTEL & ROOM DETAILS -->', '<!-- IMPORTANT INFO -->');
  const hotelInvoiceRegex = /bookingCardHtml = `\s*(<div style="background:#fff; border-radius:10px; overflow:hidden; margin-top:20px; box-shadow:0 2px 8px rgba\(0,0,0,0\.06\); border:1px solid #d6bd96;">\s*<div style="background:#c9a844; padding:6px 12px;">\s*<div style="font-size:10px;font-weight:800;color:#1a2b5c;letter-spacing:1px;">DETAIL HOTEL & KAMAR[\s\S]*?)\s*`;/;
  let newHotelStr = hotelBlock.replace(/fmtDate/g, 'formatDate');
  content = content.replace(hotelInvoiceRegex, `bookingCardHtml = \`\n        ${newHotelStr}\n      \`;`);

  // 3. RENTAL
  const rentalBlock = extractBlock('<!-- VEHICLE & RENTAL DETAILS -->', '<!-- IMPORTANT INFO -->');
  const rentalInvoiceRegex = /bookingCardHtml = `\s*(<div style="background:#fff; border-radius:10px; overflow:hidden; margin-top:20px; box-shadow:0 2px 8px rgba\(0,0,0,0\.06\); border:1px solid #d6bd96;">\s*<div style="background:#c9a844; padding:6px 12px;">\s*<div style="font-size:10px;font-weight:800;color:#1a2b5c;letter-spacing:1px;">DETAIL KENDARAAN & SEWA[\s\S]*?)\s*`;/;
  let newRentalStr = rentalBlock.replace(/fmtDate/g, 'formatDate');
  content = content.replace(rentalInvoiceRegex, `bookingCardHtml = \`\n        ${newRentalStr}\n      \`;`);

  // 4. TOUR
  const tourBlock = extractBlock('<!-- TOUR & DESTINATION DETAILS -->', '<!-- DAILY ITINERARY DETAILS -->');
  const tourInvoiceRegex = /bookingCardHtml = `\s*(<div style="background:#fff; border-radius:10px; overflow:hidden; margin-top:20px; box-shadow:0 2px 8px rgba\(0,0,0,0\.06\); border:1px solid #d6bd96;">\s*<div style="background:#c9a844; padding:6px 12px;">\s*<div style="font-size:10px;font-weight:800;color:#1a2b5c;letter-spacing:1px;">DETAIL PAKET & DESTINASI[\s\S]*?)\s*`;/;
  let newTourStr = tourBlock.replace(/fmtDate/g, 'formatDate');
  content = content.replace(tourInvoiceRegex, `bookingCardHtml = \`\n        ${newTourStr}\n      \`;`);

  fs.writeFileSync(file, content);
  console.log('PDF sync completed successfully.');
} catch (e) {
  console.error(e);
}
