// admin-auth-guard.js
// Mengganti gate password kosmetik dengan sesi Supabase Auth asli.
// Memakai mekanisme yang sama dengan halaman lain: hm_session di localStorage
// (diisi oleh login.html setelah login berhasil lewat Supabase Auth).
(function () {
    function redirectToLogin() {
          try {
                  localStorage.removeItem('hm_session');
                  localStorage.removeItem('hm_komunitas');
                  sessionStorage.removeItem('hm_admin');
          } catch (e) {}
          window.location.href = 'login.html';
    }

   let session = null;
    try {
          session = JSON.parse(localStorage.getItem('hm_session') || 'null');
    } catch (e) {
          session = null;
    }

   const valid = !!(session && session.paket === 'admin' && session.expiresAt && Date.now() < session.expiresAt);

   if (!valid) {
         redirectToLogin();
   } else {
         const gate = document.getElementById('loginGate');
         const app = document.getElementById('mainApp');
         if (gate) gate.style.display = 'none';
         if (app) app.style.display = 'block';
         if (typeof window.loadAll === 'function') window.loadAll();

      window.adminLogout = function () {
              try {
                        localStorage.removeItem('hm_session');
                        localStorage.removeItem('hm_komunitas');
                        sessionStorage.removeItem('hm_admin');
              } catch (e) {}
              if (typeof db !== 'undefined' && db.auth) {
                        db.auth.signOut().finally(function () {
                                    window.location.href = 'login.html';
                        });
              } else {
                        window.location.href = 'login.html';
              }
      };
   }
})();
