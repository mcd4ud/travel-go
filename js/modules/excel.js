/* ========================================
   TMS - Excel Import & Export Module
   ======================================== */
window.TMS = window.TMS || {};

TMS.Excel = (() => {

  const colMapping = {
    flights: ['id', 'bookingCode', 'guestName', 'airline', 'flightNumber', 'departureCity', 'arrivalCity', 'departureDate', 'seatClass', 'status', 'totalPrice'],
    hotels: ['id', 'bookingCode', 'guestName', 'hotelName', 'hotelAddress', 'roomType', 'checkIn', 'checkOut', 'nights', 'status', 'totalPrice'],
    rentals: ['id', 'bookingCode', 'renterName', 'vehicleName', 'pickupDate', 'returnDate', 'withDriver', 'status', 'totalPrice'],
    tours: ['id', 'bookingCode', 'leadTraveler', 'tourName', 'destination', 'departureDate', 'days', 'pax', 'status', 'totalPrice'],
    umroh: ['id', 'bookingCode', 'customerName', 'packageName', 'departureDate', 'days', 'pax', 'mutawwif', 'status', 'sellingPrice'],
    expenses: ['id', 'date', 'code', 'name', 'amount', 'notes'] // For accounting module
  };

  function exportData(collectionName) {
    if (typeof XLSX === 'undefined') {
      alert("SheetJS library is not loaded.");
      return;
    }

    const data = TMS.Store.getAll(collectionName) || [];
    const mapping = colMapping[collectionName];
    if (!mapping) {
      console.warn("No column mapping defined for", collectionName);
      return;
    }

    // Convert data array to worksheet
    const wsData = data.map(item => {
      let row = {};
      mapping.forEach(key => {
        row[key] = item[key] !== undefined ? item[key] : '';
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    
    // Download
    XLSX.writeFile(workbook, `${collectionName}_export.xlsx`);
    TMS.App.toast(`Berhasil mengekspor data ${collectionName}`);
  }

  function triggerImport(collectionName) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls, .csv';
    input.style.display = 'none';
    
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleImport(file, collectionName);
      }
    });

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  function handleImport(file, collectionName) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (!json || json.length === 0) {
          TMS.App.toast('File kosong atau format salah.', 'error');
          return;
        }

        let importCount = 0;
        let updateCount = 0;

        json.forEach(row => {
          if (!row.id) {
            // New record
            row.id = 'ID-' + Math.random().toString(36).substr(2, 9);
            row.createdAt = new Date().toISOString();
            importCount++;
          } else {
            // Update existing or add if ID provided but doesn't exist
            row.updatedAt = new Date().toISOString();
            updateCount++;
          }
          // Default formatting if parsing missed something
          if (row.totalPrice) row.totalPrice = Number(row.totalPrice) || 0;
          if (row.amount) row.amount = Number(row.amount) || 0;
          
          const existing = TMS.Store.getById(collectionName, row.id);
          if (existing) {
            TMS.Store.update(collectionName, row.id, row);
          } else {
            TMS.Store.add(collectionName, row);
          }
        });

        TMS.App.toast(`Impor selesai: ${importCount} baru, ${updateCount} diupdate.`);
        
        // Refresh views
        if (collectionName === 'flights' && TMS.Flight) TMS.Flight.renderList();
        if (collectionName === 'hotels' && TMS.Hotel) TMS.Hotel.renderList();
        if (collectionName === 'rentals' && TMS.Rental) TMS.Rental.renderList();
        if (collectionName === 'tours' && TMS.Tour) TMS.Tour.renderList();
        if (collectionName === 'umroh' && TMS.Umroh) TMS.Umroh.renderList();
        if (collectionName === 'expenses' && TMS.Accounting) TMS.Accounting.init();
      } catch (err) {
        console.error(err);
        TMS.App.toast('Gagal memproses file Excel.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function exportReport(title, headers, rows) {
    if (typeof XLSX === 'undefined') {
      alert("SheetJS library is not loaded.");
      return;
    }
    const wsData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_')}.xlsx`);
    TMS.App.toast(`Berhasil mengekspor ${title}`);
  }

  return { exportData, triggerImport, exportReport };
})();
