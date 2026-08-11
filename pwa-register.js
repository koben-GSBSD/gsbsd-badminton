// ═══════════════════════════════════════════════════════════════════
// HOSTMABAR — Registrasi Service Worker + banner "Versi baru tersedia".
// Sengaja file terpisah, dipanggil dengan satu baris di tiap halaman:
//   <script src="pwa-register.js"></script>
// supaya tidak perlu duplikasi kode ini di 9 file HTML.
// ═══════════════════════════════════════════════════════════════════
(function () {
  if (!('serviceWorker' in navigator)) return; // browser lama — abaikan diam-diam

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then((reg) => {
      // Ada worker baru terpasang tapi menunggu (karena tab ini masih
      // dikendalikan worker lama) → tampilkan banner, JANGAN auto-reload
      // (bisa mengganggu kalau lagi tengah mencatat skor).
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(reg);
          }
        });
      });
    }).catch((e) => console.warn('SW register gagal:', e.message));
  });

  function showUpdateBanner(reg) {
    if (document.getElementById('pwaUpdateBanner')) return;
    const b = document.createElement('div');
    b.id = 'pwaUpdateBanner';
    b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#1E293B;color:#fff;font-family:"Plus Jakarta Sans",system-ui,sans-serif;font-size:13px;font-weight:700;padding:12px 16px;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;box-shadow:0 -4px 16px rgba(0,0,0,.15)';
    b.innerHTML = `<span>🔄 Versi baru HOSTMABAR tersedia</span>
      <button id="pwaUpdateBtn" style="background:linear-gradient(90deg,#F7941D,#E8174A);color:#fff;border:none;border-radius:8px;padding:7px 14px;font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit">Muat Ulang</button>`;
    document.body.appendChild(b);
    document.getElementById('pwaUpdateBtn').onclick = () => {
      reg.waiting && reg.waiting.postMessage('SKIP_WAITING');
      window.location.reload();
    };
  }
})();
