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
            <div class="form-actions">
              <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Simpan Perubahan</button>
            </div>
          </form>
        </div>

        <div>
          <div class="card mb-2">
            <div class="card-header"><div class="card-title"><i data-lucide="database"></i> Pemeliharaan Data</div></div>
            <div class="p-2">
              <p class="text-muted mb-2" style="font-size:13px;">Hapus data transaksi (Tiket, Hotel, Jurnal, dll) namun tetap simpan data perusahaan & COA.</p>
              <button class="btn btn-warning btn-block mb-1" onclick="TMS.Settings.clearTransactions()"><i data-lucide="trash-2"></i> Bersihkan Data Transaksi</button>
              <div style="border-top:1px dashed var(--border-color); margin:10px 0;"></div>
              <p class="text-muted mb-2" style="font-size:13px;">Hapus semua data termasuk pengaturan untuk kembali ke titik nol.</p>
              <button class="btn btn-danger btn-block" onclick="TMS.Settings.reset()"><i data-lucide="refresh-cw"></i> Reset Semua Data (Total)</button>
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
    
    // Disable button to prevent double clicks during network request
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<div style="width:16px;height:16px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;vertical-align:middle;margin-right:8px;"></div> Menyimpan...'; }

    await S.updateSettings(data);
    TMS.App.toast('Pengaturan berhasil disimpan', 'success');
    
    // Refresh the UI to reflect changes globally without hard reloading which might interrupt Firebase if not fully finished in background tasks
    setTimeout(() => location.reload(), 1500);
  }

  function reset() {
    if (!confirm('PERINGATAN: Semua data (termasuk profil perusahaan) akan dihapus permanen! Lanjutkan?')) return;
    if (!confirm('Konfirmasi terakhir: Anda yakin?')) return;
    S.resetData();
    TMS.App.toast('Sistem berhasil di-reset total', 'warning');
    setTimeout(() => location.reload(), 1000);
  }

  function clearTransactions() {
    if (!confirm('Hapus semua data transaksi? Profil perusahaan dan susunan akun (COA) akan tetap disimpan.')) return;
    S.clearAllData();
    TMS.App.toast('Data transaksi berhasil dibersihkan', 'success');
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

  return { render, save, reset, clearTransactions, handleLogo };
})();
