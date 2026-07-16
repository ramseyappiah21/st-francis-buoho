(() => {
  const AUTH_KEY = "stmary-portal-auth-v2";
  const SESSION_KEY = "stmary-portal-session-v2";
  const DEFAULT_PASSWORD = "MaryBuoho1";

  async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hash)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function passwordMeetsRules(password) {
    const value = String(password || "");
    if (value.length < 8) {
      return {
        ok: false,
        error: "Password must be at least 8 characters and include a number.",
      };
    }
    if (!/\d/.test(value)) {
      return {
        ok: false,
        error: "Password must include at least one number.",
      };
    }
    return { ok: true };
  }

  function getAuthConfig() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async function ensureAuthConfig() {
    const existing = getAuthConfig();
    if (existing?.passwordHash) return existing;

    const config = {
      passwordHash: await sha256(DEFAULT_PASSWORD),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(config));
    return config;
  }

  function isAuthenticated() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      const session = JSON.parse(raw);
      return Boolean(session?.ok);
    } catch {
      return false;
    }
  }

  function createSession() {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ ok: true, at: new Date().toISOString() })
    );
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function unlockPortal() {
    const gate = document.getElementById("loginGate");
    const app = document.getElementById("portalApp");
    if (gate) gate.hidden = true;
    if (app) app.hidden = false;
    document.body.classList.remove("portal-locked");
    document.body.classList.add("portal-unlocked");
    window.dispatchEvent(new Event("parish-portal-unlocked"));
  }

  function lockPortal() {
    clearSession();
    const gate = document.getElementById("loginGate");
    const app = document.getElementById("portalApp");
    if (gate) gate.hidden = false;
    if (app) app.hidden = true;
    document.body.classList.add("portal-locked");
    document.body.classList.remove("portal-unlocked");
  }

  async function verifyPassword(password) {
    const config = await ensureAuthConfig();
    const hash = await sha256(password);
    return hash === config.passwordHash;
  }

  async function changePassword(currentPassword, newPassword) {
    const valid = await verifyPassword(currentPassword);
    if (!valid) return { ok: false, error: "Current password is incorrect." };
    const rules = passwordMeetsRules(newPassword);
    if (!rules.ok) return rules;
    localStorage.setItem(
      AUTH_KEY,
      JSON.stringify({
        passwordHash: await sha256(newPassword),
        updatedAt: new Date().toISOString(),
      })
    );
    return { ok: true };
  }

  async function resetToDefaultPassword() {
    const config = {
      passwordHash: await sha256(DEFAULT_PASSWORD),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(config));
    localStorage.removeItem("stfrancis-portal-auth");
    localStorage.removeItem("stmary-portal-auth-v1");
    clearSession();
    return config;
  }

  window.ParishAuth = {
    isAuthenticated,
    verifyPassword,
    changePassword,
    passwordMeetsRules,
    resetToDefaultPassword,
    createSession,
    clearSession,
    unlockPortal,
    lockPortal,
  };

  document.addEventListener("DOMContentLoaded", async () => {
    localStorage.removeItem("stfrancis-portal-auth");
    localStorage.removeItem("stmary-portal-auth-v1");
    await ensureAuthConfig();

    const gate = document.getElementById("loginGate");
    const app = document.getElementById("portalApp");
    const form = document.getElementById("loginForm");
    const errorEl = document.getElementById("loginError");
    const logoutBtn = document.getElementById("logoutBtn");
    const changePassBtn = document.getElementById("changePassBtn");
    const changeForm = document.getElementById("changePassForm");
    const changeError = document.getElementById("changePassError");
    const changeModal = document.getElementById("changePassModal");
    const changePassClose = document.getElementById("changePassClose");
    const changePassCancel = document.getElementById("changePassCancel");

    function closeChangePasswordModal() {
      if (changeModal?.open) changeModal.close();
      if (changeForm) {
        changeForm.reset();
        changeForm.querySelectorAll("input").forEach((input) => {
          input.type = "password";
        });
        changeForm.querySelectorAll("[data-toggle-password]").forEach((btn) => {
          btn.textContent = "Show";
          btn.setAttribute("aria-pressed", "false");
        });
      }
      if (changeError) changeError.textContent = "";
    }

    function openChangePasswordModal() {
      if (!changeModal) return;
      if (changeError) changeError.textContent = "";
      if (typeof changeModal.showModal === "function") changeModal.showModal();
    }

    document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const input = document.getElementById(btn.getAttribute("data-toggle-password"));
        if (!input) return;
        const showing = input.type === "text";
        input.type = showing ? "password" : "text";
        btn.textContent = showing ? "Show" : "Hide";
        btn.setAttribute("aria-pressed", showing ? "false" : "true");
      });
    });

    if (isAuthenticated()) {
      unlockPortal();
    } else {
      document.body.classList.add("portal-locked");
      if (gate) gate.hidden = false;
      if (app) app.hidden = true;
    }

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const password = String(new FormData(form).get("password") || "");
        const ok = await verifyPassword(password);
        if (!ok) {
          if (errorEl) errorEl.textContent = "Incorrect password. Try again.";
          return;
        }
        if (errorEl) errorEl.textContent = "";
        createSession();
        unlockPortal();
        form.reset();
        const loginInput = document.getElementById("loginPassword");
        const loginToggle = document.querySelector('[data-toggle-password="loginPassword"]');
        if (loginInput) loginInput.type = "password";
        if (loginToggle) {
          loginToggle.textContent = "Show";
          loginToggle.setAttribute("aria-pressed", "false");
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        lockPortal();
        if (errorEl) errorEl.textContent = "";
      });
    }

    if (changePassBtn) {
      changePassBtn.addEventListener("click", openChangePasswordModal);
    }
    changePassClose?.addEventListener("click", closeChangePasswordModal);
    changePassCancel?.addEventListener("click", closeChangePasswordModal);
    changeModal?.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeChangePasswordModal();
    });

    if (changeForm) {
      changeForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = new FormData(changeForm);
        const result = await changePassword(
          String(data.get("currentPassword") || ""),
          String(data.get("newPassword") || "")
        );
        if (!result.ok) {
          if (changeError) changeError.textContent = result.error;
          return;
        }
        closeChangePasswordModal();
        alert("Password updated. Use the new password next time you sign in.");
      });
    }
  });
})();
