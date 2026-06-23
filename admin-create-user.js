(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var uidInput = document.getElementById("f-uid");
    if (!uidInput) return;

    var container = uidInput;
    for (var i = 0; i < 3; i++) {
      if (container.parentElement && container.parentElement.children.length <= 4) {
        container = container.parentElement;
      } else {
        break;
      }
    }
    container.style.display = "none";

    var wrap = document.createElement("div");
    wrap.style.marginBottom = "14px";
    wrap.innerHTML =
      '<div style="font-size:12px;color:#9898b0;margin-bottom:6px;">Akun baru (dibuat otomatis di Supabase Auth)</div>' +
      '<input type="email" id="f-email" placeholder="Email user baru" class="' + uidInput.className + '" style="margin-bottom:8px;width:100%;">' +
      '<input type="password" id="f-password" placeholder="Password (min. 6 karakter)" class="' + uidInput.className + '" style="width:100%;">';

    container.parentElement.insertBefore(wrap, container);

    window.upsertUser = async function () {
      var emailEl = document.getElementById("f-email");
      var pwEl = document.getElementById("f-password");
      var email = ((emailEl && emailEl.value) || "").trim();
      var password = (pwEl && pwEl.value) || "";

      function fail(msg) {
        if (typeof showToast === "function") showToast(msg);
        else alert(msg);
      }

      if (!email || email.indexOf("@") === -1) {
        fail("Email tidak valid");
        return;
      }
      if (!password || password.length < 6) {
        fail("Password minimal 6 karakter");
        return;
      }

      var get = function (id) {
        var el = document.getElementById(id);
        return el ? el.value : "";
      };

      var body = {
        email: email,
        password: password,
        nama: get("f-nama"),
        paket: get("f-paket"),
        redirect: get("f-redirect"),
        aktif: get("f-aktif"),
        exp: get("f-exp"),
      };

      try {
        var res = await db.functions.invoke("admin-create-user", { body: body });
        var data = res.data;
        var error = res.error;

        if (error || !data || data.success === false) {
          var msg = (data && data.error) || (error && error.message) || "Gagal membuat user";
          fail(msg);
          return;
        }

        if (typeof showToast === "function") showToast("User baru berhasil dibuat");
        if (emailEl) emailEl.value = "";
        if (pwEl) pwEl.value = "";
        if (typeof clearForm === "function") clearForm();
        if (typeof loadProfiles === "function") loadProfiles();
      } catch (e) {
        fail("Gagal menghubungi server: " + (e && e.message ? e.message : e));
      }
    };
  });
})();
