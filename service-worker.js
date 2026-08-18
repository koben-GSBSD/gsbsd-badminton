// ═══════════════════════════════════════════════════════════════════
// HOSTMABAR — Service Worker (PWA / offline resilience)
//
// TUJUAN: kalau sinyal di GOR putus-nyambung dan halaman ini sampai perlu
// dimuat ulang (tab dibuang HP kehabisan RAM, refresh tidak sengaja, dst),
// halaman tetap terbuka dari cache device — bukan halaman "tidak ada
// koneksi" bawaan browser. Data pertandingan sendiri SUDAH aman di
// localStorage (lihat tracker.html) — service worker ini hanya menjaga
// supaya SHELL HALAMAN-nya (HTML/CSS/JS) juga selalu bisa dibuka.
//
// STRATEGI (diubah 2026-08-16, temuan bug "harus refresh/logout dulu baru
// lihat versi terbaru"): TADINYA stale-while-revalidate — selalu tampilkan
// versi cache INSTAN, baru diam-diam ambil versi baru di background untuk
// kunjungan BERIKUTNYA. Masalahnya: setiap kali salah satu halaman di-deploy,
// kunjungan PERTAMA sesudahnya selalu masih menampilkan versi LAMA (dari
// cache) — versi baru baru muncul di kunjungan KEDUA (persis gejala yang
// Koben laporan: Mode Turnamen masih nunjukin modal lama sampai di-refresh/
// logout-login ulang). Ini bukan bug khusus fitur Mode Turnamen — SEMUA
// perubahan ke 9 halaman ini kena efek yang sama, cuma yang paling kelihatan
// baru fitur ini karena sering diubah belakangan.
//
// SEKARANG: network-first dengan timeout, fallback ke cache. Selama jaringan
// hidup (walau lambat, asal < 4 detik), versi TERBARU selalu yang tampil —
// tidak pernah lagi "ketinggalan satu versi". Cache cuma dipakai kalau
// jaringan benar-benar mati/timeout (skenario asli tujuan service worker ini:
// sinyal GOR putus-nyambung) — jadi ketahanan offline yang sudah ada TETAP
// terjaga, cuma urutan prioritasnya dibalik.
//
// TIDAK disentuh: cuanmabar.html sengaja belum dimasukkan cache (produk
// terpisah, styling-nya masih bergantung CDN Tailwind — lihat catatan di
// project). Bisa ditambahkan menyusul kalau sudah dipindah ke CSS lokal.
// ═══════════════════════════════════════════════════════════════════

// PENTING: tetap naikkan angka ini tiap ada perubahan besar (mis. daftar
// APP_SHELL berubah) — dengan strategi network-first, versi konten HTML
// sendiri sudah otomatis selalu fresh selama online, tapi versi cache ini
// masih menentukan nama "kotak penyimpanan" cache-nya.
const CACHE_VERSION = 'hostmabar-v3';

const APP_SHELL = [
  '/tracker.html',
  '/dashboard.html',
  '/loginpage.html',
  '/homepage.html',
  '/mabarpro.html',
  '/badminton.html',
  '/padel.html',
  '/pickleball.html',
  '/tennis.html',
];

// ── INSTALL: simpan salinan awal semua halaman ke cache ──────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting(); // jangan tunggu tab lama ditutup — instal langsung siap
});

// ── ACTIVATE: buang cache versi lama supaya storage tidak menumpuk ───────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Bungkus fetch() dengan batas waktu — fetch() sendiri TIDAK pernah timeout
// otomatis (di sinyal "connecting..." yang lemot, bisa nge-hang lama sekali
// tanpa ini), jadi butuh race manual supaya fallback ke cache cepat kalau
// jaringan jelek, bukan menunggu browser yang menyerah duluan.
function fetchWithTimeout(req, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(req).then(
      (res) => { clearTimeout(timer); resolve(res); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

// ── FETCH: network-first (dengan timeout) + fallback ke cache, HANYA untuk
// navigasi/asset kita sendiri. Panggilan ke Supabase (fetch API biasa, bukan
// navigasi halaman) TIDAK disentuh sama sekali — lewat langsung ke jaringan
// seperti biasa, supaya logic online/offline yang sudah dibangun di tiap
// halaman tetap berlaku.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Hanya tangani request GET ke domain sendiri (halaman HTML kita).
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  const isAppShellPage = APP_SHELL.some((p) => url.pathname === p) || url.pathname === '/';
  if (!isAppShellPage) return; // biarkan request lain (gambar, dsb) apa adanya

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      try {
        // Coba jaringan DULU (maks 4 detik) — supaya versi yang tampil
        // selalu yang terbaru selama online, tidak pernah "ketinggalan
        // satu versi" seperti gejala stale-while-revalidate sebelumnya.
        const res = await fetchWithTimeout(req, 4000);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch (e) {
        // Jaringan mati/timeout → fallback ke cache (ketahanan offline,
        // tujuan asli service worker ini tetap terjaga).
        const cached = await cache.match(req);
        return cached || new Response(
          '<h1>📶 Sinyal terputus</h1><p>Halaman ini belum pernah dibuka sebelumnya di device ini, jadi belum ada salinan tersimpan. Coba lagi begitu sinyal kembali.</p>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })
  );
});

// ── Terima pesan "SKIP_WAITING" dari halaman (dipicu tombol di banner
// "Versi baru tersedia") supaya service worker baru langsung aktif.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
