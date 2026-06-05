/* ========================================
   TMS - Settings Module
   ======================================== */
TMS.Settings = (() => {
  const S = TMS.Store;

  function render() {
    const s = S.getSettings();
    return `
    <div class="fade-in">
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title"><i data-lucide="building"></i> Informasi Perusahaan</div></div>
          <form onsubmit="TMS.Settings.save(event)" class="p-2">
            <div class="form-group">
              <label class="form-label">Logo Perusahaan</label>
              <div style="display:flex;align-items:center;gap:15px;margin-bottom:10px;">
                <div id="logoPreview" style="width:80px;height:80px;border:2px dashed var(--border-color);border-radius:12px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fff;">
                  ${s.companyLogo ? `<img src="${s.companyLogo}" style="max-width:100%;max-height:100%;object-fit:contain;">` : '<i data-lucide="image" class="text-muted"></i>'}
                </div>
                <div style="flex:1;">
                  <input type="file" id="logoInput" accept="image/*" style="display:none;" onchange="TMS.Settings.handleLogo(this)">
                  <button type="button" class="btn btn-sm btn-outline" onclick="document.getElementById('logoInput').click()"><i data-lucide="upload"></i> Pilih Logo</button>
                  <div class="form-help">Rekomendasi: PNG/JPG transparan, maks 2MB.</div>
                </div>
              </div>
              <input type="hidden" name="companyLogo" id="companyLogoBase64" value="${s.companyLogo || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Nama Perusahaan</label>
              <input class="form-control" name="companyName" value="${s.companyName || ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Alamat</label>
              <textarea class="form-control" name="companyAddress" rows="3" required>${s.companyAddress || ''}</textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Email</label>
                <input class="form-control" type="email" name="companyEmail" value="${s.companyEmail || ''}">
              </div>
              <div class="form-group">
                <label class="form-label">Telepon</label>
                <input class="form-control" name="companyPhone" value="${s.companyPhone || ''}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Perpajakan</label>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;padding:12px;background:var(--bg-secondary);border-radius:10px;">
                <input type="checkbox" name="taxEnabled" value="true" ${s.taxEnabled ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer;" onchange="document.getElementById('taxRateGroup').style.opacity = this.checked ? '1' : '0.5'; document.getElementById('taxRateGroup').style.pointerEvents = this.checked ? 'auto' : 'none';">
                <span style="font-weight:600;font-size:14px;">Aktifkan Pajak (PPN) pada Invoice</span>
              </div>
            </div>
            <div class="form-group" id="taxRateGroup" style="${s.taxEnabled ? '' : 'opacity:0.5;pointer-events:none;'}">
              <label class="form-label">Tarif Pajak (PPN %)</label>
              <div class="input-group">
                <input class="form-control" type="number" name="taxRate" value="${s.taxRate || 11}" min="0" max="100">
                <span class="input-prefix" style="border-left:1px solid var(--border-color);border-right:none;padding-left:12px;">%</span>
              </div>
            </div>

            <!-- SEKSI PENGATURAN FORMAT PENOMORAN -->
            <div style="border-top:1px dashed var(--border-color); margin:20px 0; padding-top:15px;">
              <h4 style="font-size:14px; font-weight:700; color:var(--primary); margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                <i data-lucide="hash" style="width:16px;height:16px;"></i> Format Penomoran (Itinerary ID / Referensi)
              </h4>
              
              <div class="form-group">
                <label class="form-label">Tipe Format Penomoran</label>
                <select class="form-control" name="numberingFormat" onchange="TMS.Settings.toggleCustomNumbering(this.value)">
                  <option value="PREFIX-DDMMYYYYURUT" ${s.numberingFormat !== 'standar' ? 'selected' : ''}>Default Baru: PREFIX-DDMMYYYYxxxxx (Contoh: FLT-3105202600001)</option>
                  <option value="standar" ${s.numberingFormat === 'standar' ? 'selected' : ''}>Standar Lama: PREFIX-xxxxx (Contoh: FLT-00001)</option>
                </select>
                <div class="form-help">Mempengaruhi format kode pada Tiket Pesawat, Voucher Hotel, Rental Mobil, Paket Wisata, Umroh, Faktur, Jurnal Buku Besar, dll.</div>
              </div>

              <div id="customNumberingPanel" style="background:var(--bg-secondary); padding:12px; border-radius:10px; margin-bottom:15px; ${s.numberingFormat === 'standar' ? 'display:none;' : ''}">
                <div class="form-group" style="margin-bottom:10px;">
                  <label class="form-label" style="font-size:12px; font-weight: 600;">Komponen Suffix Tanggal:</label>
                  <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; margin-top:5px;">
                    <label style="display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer;">
                      <input type="checkbox" name="numberingIncludeDate" value="true" ${s.numberingIncludeDate !== false ? 'checked' : ''} style="width:16px;height:16px;">
                      Hari (DD)
                    </label>
                    <label style="display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer;">
                      <input type="checkbox" name="numberingIncludeMonth" value="true" ${s.numberingIncludeMonth !== false ? 'checked' : ''} style="width:16px;height:16px;">
                      Bulan (MM)
                    </label>
                    <label style="display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer;">
                      <input type="checkbox" name="numberingIncludeYear" value="true" ${s.numberingIncludeYear !== false ? 'checked' : ''} style="width:16px;height:16px;">
                      Tahun (YYYY)
                    </label>
                  </div>
                </div>

                <div class="form-row" style="margin-bottom:0;">
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label" style="font-size:12px; font-weight: 600;">Jumlah Digit Nomor Urut</label>
                    <select class="form-control" name="numberingDigits">
                      <option value="4" ${s.numberingDigits == 4 ? 'selected' : ''}>4 Digit (xxxx)</option>
                      <option value="5" ${s.numberingDigits == 5 || !s.numberingDigits ? 'selected' : ''}>5 Digit (xxxxx)</option>
                      <option value="6" ${s.numberingDigits == 6 ? 'selected' : ''}>6 Digit (xxxxxx)</option>
                      <option value="7" ${s.numberingDigits == 7 ? 'selected' : ''}>7 Digit (xxxxxxx)</option>
                    </select>
                  </div>

                  <div class="form-group" style="margin-bottom:0; display:flex; align-items:flex-end; padding-bottom:8px;">
                    <label style="display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer; user-select: none;">
                      <input type="checkbox" name="numberingResetYearly" value="true" ${s.numberingResetYearly !== false ? 'checked' : ''} style="width:16px;height:16px;">
                      Reset Urutan Tiap Tahun Baru
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-actions" style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
              <button type="button" class="btn btn-outline btn-danger" onclick="TMS.Settings.resetCompanyInfo()"><i data-lucide="refresh-cw"></i> Reset Info Perusahaan</button>
              <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Simpan Perubahan</button>
            </div>
          </form>
        </div>

        <div>
          <div class="card mb-2">
            <div class="card-header"><div class="card-title"><i data-lucide="database"></i> Pemeliharaan Data</div></div>
            <div class="p-2">
              <p class="text-muted mb-2" style="font-size:13px;">Hapus data transaksi (Tiket, Hotel, Jurnal, dll) namun tetap simpan data perusahaan & COA.</p>
              <button class="btn btn-warning btn-block" onclick="TMS.Settings.clearTransactions()"><i data-lucide="trash-2"></i> Bersihkan Data Transaksi</button>
            </div>
          </div>
          
          <div class="card">
            <div class="card-header"><div class="card-title"><i data-lucide="shield-check"></i> Keamanan & Enkripsi</div></div>
            <div class="p-2">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                <div style="width:40px;height:40px;background:var(--success-bg);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--success);">
                  <i data-lucide="lock"></i>
                </div>
                <div>
                  <div style="font-weight:600;font-size:14px;">Enkripsi Aktif</div>
                  <div class="text-muted" style="font-size:12px;">Data di localStorage dilindungi enkripsi AES-like.</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;background:var(--blue-bg);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--primary-light);">
                  <i data-lucide="hash"></i>
                </div>
                <div>
                  <div style="font-weight:600;font-size:14px;">Tokenisasi Rekening</div>
                  <div class="text-muted" style="font-size:12px;">Nomor rekening pelanggan tidak disimpan secara utuh.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  async function save(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    data.taxEnabled = fd.get('taxEnabled') === 'true';
    data.taxRate = parseFloat(data.taxRate) || 0;
    
    // Parse custom numbering checkbox states
    data.numberingIncludeDate = fd.get('numberingIncludeDate') === 'true';
    data.numberingIncludeMonth = fd.get('numberingIncludeMonth') === 'true';
    data.numberingIncludeYear = fd.get('numberingIncludeYear') === 'true';
    data.numberingResetYearly = fd.get('numberingResetYearly') === 'true';
    
    // Disable button to prevent double clicks during network request
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<div style="width:16px;height:16px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;vertical-align:middle;margin-right:8px;"></div> Menyimpan...'; }

    await S.updateSettings(data);
    TMS.App.toast('Pengaturan berhasil disimpan', 'success');
    
    // Refresh the UI to reflect changes globally without hard reloading which might interrupt Firebase if not fully finished in background tasks
    setTimeout(() => location.reload(), 1500);
  }

  async function resetCompanyInfo() {
    if (!confirm('Apakah Anda yakin ingin menghapus keseluruhan informasi perusahaan dan mengembalikannya ke kondisi kosong seperti awal?')) return;
    
    const btn = document.querySelector('button[onclick*="resetCompanyInfo"]');
    let originalHTML = '';
    if (btn) {
      originalHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-sm"></span> Mereset...';
    }
    
    const cleanSettings = {
      companyName: '',
      companyAddress: '',
      companyPhone: '',
      companyEmail: '',
      companyLogo: '',
      taxEnabled: true,
      taxRate: 11,
      numberingFormat: 'standar',
      numberingDigits: 5,
      numberingIncludeDate: false,
      numberingIncludeMonth: false,
      numberingIncludeYear: false,
      numberingResetYearly: false
    };

    try {
      await S.updateSettings(cleanSettings);
      TMS.App.toast('Informasi perusahaan berhasil di-reset ke kondisi kosong', 'success');
    } catch (err) {
      console.error(err);
      TMS.App.toast('Gagal melakukan reset informasi perusahaan: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }
    }
    
    setTimeout(() => location.reload(), 1000);
  }

  async function clearTransactions() {
    if (!confirm('Hapus semua data transaksi? Profil perusahaan dan susunan akun (COA) akan tetap disimpan.')) return;
    
    const btn = document.querySelector('button[onclick*="clearTransactions"]');
    let originalHTML = '';
    if (btn) {
      originalHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-sm"></span> Membersihkan...';
    }
    
    try {
      await S.clearAllData();
      TMS.App.toast('Data transaksi berhasil dibersihkan', 'success');
    } catch (err) {
      console.error(err);
      TMS.App.toast('Gagal membersihkan data transaksi: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }
    }
    
    setTimeout(() => location.reload(), 1000);
  }

  function handleLogo(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) { TMS.App.toast('Logo terlalu besar (maks 500KB untuk sinkronisasi Cloud)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      document.getElementById('companyLogoBase64').value = base64;
      document.getElementById('logoPreview').innerHTML = `<img src="${base64}" style="max-width:100%;max-height:100%;object-fit:contain;">`;
    };
    reader.readAsDataURL(file);
  }

  function toggleCustomNumbering(val) {
    const panel = document.getElementById('customNumberingPanel');
    if (panel) {
      panel.style.display = val === 'standar' ? 'none' : 'block';
    }
  }
 
  return { render, save, resetCompanyInfo, clearTransactions, handleLogo, toggleCustomNumbering };
})();
