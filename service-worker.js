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
// STRATEGI: stale-while-revalidate untuk 9 halaman utama HOSTMABAR —
// selalu tampilkan versi tersimpan INSTAN (cepat + jalan walau offline),
// sambil diam-diam ambil versi terbaru di background untuk pemuatan
// BERIKUTNYA. Tidak pernah memblokir tampilan demi menunggu jaringan.
//
// TIDAK disentuh: cuanmabar.html sengaja belum dimasukkan cache (produk
// terpisah, styling-nya masih bergantung CDN Tailwind — lihat catatan di
// project). Bisa ditambahkan menyusul kalau sudah dipindah ke CSS lokal.
// ═══════════════════════════════════════════════════════════════════

// PENTING: naikkan angka ini SETIAP KALI salah satu file di bawah diupdate
// di GitHub. Ini yang memicu service worker membuang cache lama dan
// mengambil versi baru — kalau lupa dinaikkan, user bisa terus melihat
// versi lama walau filenya sudah diganti di server.
const CACHE_VERSION = 'hostmabar-v2';

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

// ── FETCH: stale-while-revalidate, HANYA untuk navigasi/asset kita sendiri.
// Panggilan ke Supabase (fetch API biasa, bukan navigasi halaman) TIDAK
// disentuh sama sekali — lewat langsung ke jaringan seperti biasa, supaya
// logic online/offline yang sudah dibangun di tiap halaman tetap berlaku.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Hanya tangani request GET ke domain sendiri (halaman HTML kita).
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  const isAppShellPage = APP_SHELL.some((p) => url.pathname === p) || url.pathname === '/';
  if (!isAppShellPage) return; // biarkan request lain (gambar, dsb) apa adanya

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(req);

      // Ambil versi terbaru di background — tidak pernah ditunggu untuk
      // menampilkan halaman, hanya untuk MEMPERBARUI cache demi kunjungan
      // berikutnya.
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null); // sinyal mati total → biarkan gagal diam-diam

      // Kalau ada versi tersimpan, tampilkan itu SEKARANG JUGA (instan,
      // jalan walau offline). Kalau belum ada sama sekali (baru pertama
      // kali buka halaman ini), baru tunggu jaringan.
      return cached || (await networkFetch) || new Response(
        '<h1>📶 Sinyal terputus</h1><p>Halaman ini belum pernah dibuka sebelumnya di device ini, jadi belum ada salinan tersimpan. Coba lagi begitu sinyal kembali.</p>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    })
  );
});

// ── Terima pesan "SKIP_WAITING" dari halaman (dipicu tombol di banner
// "Versi baru tersedia") supaya service worker baru langsung aktif.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
