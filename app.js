// ==========================================================================
// HNX QUANTUM - SHARED APPLICATION UTILITIES (app.js)
// Used by: dashboard.html, strategy.html, order-history.html, settings.html
// ==========================================================================

const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://localhost:8000"
  : `${window.location.origin}/api`;
let jwtToken = localStorage.getItem("token") || null;
let apiConnected = false;
let userEmail = localStorage.getItem("user_email") || "";

// --------------------------------------------------------------------------
// AUTH GUARD — Call at top of every protected page
// --------------------------------------------------------------------------
function requireAuth() {
  if (!jwtToken) {
    window.location.href = "index.html";
  }
}

// --------------------------------------------------------------------------
// BACKEND CONNECTION CHECK
// --------------------------------------------------------------------------
async function checkBackendConnection() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      apiConnected = true;
      showToast("Backend connected!");
    }
  } catch {
    apiConnected = false;
    showToast("Backend offline. Simulator mode active.");
  }
}

// --------------------------------------------------------------------------
// USER PROFILE
// --------------------------------------------------------------------------
async function loadUserProfile() {
  if (!jwtToken) return;
  const dName  = document.getElementById("dropdown-user-name");
  const dEmail = document.getElementById("dropdown-user-email");
  const dPhone = document.getElementById("dropdown-user-phone");
  const avatar = document.getElementById("profile-avatar-btn");

  if (apiConnected) {
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        headers: { "Authorization": `Bearer ${jwtToken}` }
      });
      if (res.ok) {
        const u = await res.json();
        if (dName)  dName.innerText  = u.full_name;
        if (dEmail) dEmail.innerText = u.email;
        if (dPhone) dPhone.innerText = u.mobile_no;
        if (avatar) avatar.innerText = u.full_name.charAt(0).toUpperCase();
        return;
      }
    } catch {}
  }
  // Fallback
  const name = localStorage.getItem("reg_name") || "Trader";
  if (dName)  dName.innerText  = name;
  if (dEmail) dEmail.innerText = userEmail;
  if (avatar) avatar.innerText = name.charAt(0).toUpperCase();
}

// --------------------------------------------------------------------------
// BROKER STATUS
// --------------------------------------------------------------------------
async function syncBrokerStatus() {
  if (!apiConnected) { updateBrokerStatus(false); return; }
  try {
    const res = await fetch(`${API_BASE}/brokers/zerodha/status`, {
      headers: { "Authorization": `Bearer ${jwtToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      updateBrokerStatus(data.session_active);
      return data;
    }
  } catch {}
  updateBrokerStatus(false);
  return null;
}

function updateBrokerStatus(linked) {
  const badge      = document.getElementById("ip-status-badge");
  const margin     = document.getElementById("margin-value");
  const connectBtn = document.getElementById("connect-broker-btn");

  if (badge) {
    badge.innerText   = linked ? "Zerodha Linked" : "Zerodha Not Linked";
    badge.className   = `status-pill ${linked ? "status-linked" : "status-unlinked"}`;
  }
  if (margin)     margin.innerText = linked ? "Fetching..." : "₹0.00";
  if (connectBtn) {
    connectBtn.innerText = linked ? "CONNECTED" : "CONNECT";
    linked ? connectBtn.classList.add("linked") : connectBtn.classList.remove("linked");
  }
  if (typeof lucide !== "undefined") lucide.createIcons();
  // Fetch real margin if linked
  if (linked) fetchRealMargin();
}

// Fetch REAL available margin from Zerodha via backend
async function fetchRealMargin() {
  if (!apiConnected || !jwtToken) return;
  const marginEl = document.getElementById("margin-value");
  try {
    const res = await fetch(`${API_BASE}/user/margin`, {
      headers: { "Authorization": `Bearer ${jwtToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      const available = data.available || 0;
      if (marginEl) {
        marginEl.innerText = `₹${Number(available).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }
  } catch (e) {
    console.warn("Could not fetch real margin:", e);
  }
}

// --------------------------------------------------------------------------
// TOAST NOTIFICATION
// --------------------------------------------------------------------------
function showToast(message) {
  const toast = document.getElementById("notification-toast");
  if (!toast) return;
  toast.innerText = message;
  toast.classList.remove("hidden");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add("hidden"), 3000);
}

// --------------------------------------------------------------------------
// LOGOUT
// --------------------------------------------------------------------------
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user_email");
  jwtToken = null;
  window.location.href = "index.html";
}

// Sync logout across all open tabs in real-time
window.addEventListener("storage", (e) => {
  if (e.key === "token" && !e.newValue) {
    window.location.href = "index.html";
  }
});

// --------------------------------------------------------------------------
// HAMBURGER SIDEBAR
// --------------------------------------------------------------------------
function initHamburgerMenu() {
  const hamburgerBtn   = document.getElementById("hamburger-btn");
  const sidebarDrawer  = document.getElementById("sidebar-drawer");
  const sidebarOverlay = document.getElementById("sidebar-overlay");
  const closeBtn       = document.getElementById("close-sidebar-btn");
  const logoutBtn      = document.getElementById("sidebar-logout-btn");

  function open() {
    sidebarDrawer?.classList.add("open");
    sidebarOverlay?.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
  function close() {
    sidebarDrawer?.classList.remove("open");
    sidebarOverlay?.classList.add("hidden");
    document.body.style.overflow = "";
  }

  hamburgerBtn?.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  sidebarOverlay?.addEventListener("click", close);
  logoutBtn?.addEventListener("click", logout);
}

function setActiveSidebarLink(pageName) {
  document.querySelectorAll(".sidebar-link[data-page]").forEach(link => {
    if (link.getAttribute("data-page") === pageName) link.classList.add("active");
  });
}

// --------------------------------------------------------------------------
// PROFILE DROPDOWN
// --------------------------------------------------------------------------
function initProfileDropdown() {
  const avatarBtn = document.getElementById("profile-avatar-btn");
  const dropdown  = document.getElementById("profile-dropdown-menu");
  const logoutBtn = document.getElementById("logout-btn");

  avatarBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown?.classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!avatarBtn?.contains(e.target) && !dropdown?.contains(e.target)) {
      dropdown?.classList.add("hidden");
    }
  });
  logoutBtn?.addEventListener("click", (e) => { e.preventDefault(); logout(); });
}

// --------------------------------------------------------------------------
// EYE TOGGLE (password visibility)
// --------------------------------------------------------------------------
function initEyeToggles() {
  document.querySelectorAll(".eye-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = btn.previousElementSibling;
      if (!input) return;
      if (input.type === "password") {
        input.type = "text";
        btn.innerHTML = `<i data-lucide="eye-off"></i>`;
      } else {
        input.type = "password";
        btn.innerHTML = `<i data-lucide="eye"></i>`;
      }
      lucide.createIcons();
    });
  });
}

// --------------------------------------------------------------------------
// CHANGE PASSWORD MODAL
// --------------------------------------------------------------------------
function initChangePasswordModal() {
  const trigger   = document.getElementById("change-password-trigger");
  const modal     = document.getElementById("change-password-modal");
  const closeBtn  = document.getElementById("close-change-pass-btn");
  const dropdown  = document.getElementById("profile-dropdown-menu");

  trigger?.addEventListener("click", (e) => {
    e.preventDefault();
    dropdown?.classList.add("hidden");
    modal?.classList.remove("hidden");
  });
  closeBtn?.addEventListener("click", () => {
    modal?.classList.add("hidden");
    resetChangePassForm();
  });
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) { modal.classList.add("hidden"); resetChangePassForm(); }
  });

  // Live validation
  const newInput   = document.getElementById("change-new-password");
  const rLen       = document.getElementById("change-rule-length");
  const rNum       = document.getElementById("change-rule-number");
  const rSpec      = document.getElementById("change-rule-special");

  newInput?.addEventListener("input", () => {
    const v = newInput.value;
    setRule(rLen,  v.length >= 8,             "Minimum 8 characters");
    setRule(rNum,  /\d/.test(v),              "At least 1 number");
    setRule(rSpec, /[!@#$%^&*(),.?":{}|<>]/.test(v), "At least 1 special character");
  });

  // Form submit
  const form = document.getElementById("change-password-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const cur  = document.getElementById("change-curr-password").value;
    const nw   = document.getElementById("change-new-password").value;
    const conf = document.getElementById("change-conf-password").value;

    if (nw.length < 8 || !/\d/.test(nw) || !/[!@#$%^&*(),.?":{}|<>]/.test(nw)) {
      return showToast("Password doesn't meet all requirements!");
    }
    if (nw !== conf) return showToast("Passwords do not match!");

    if (apiConnected) {
      try {
        const res = await fetch(`${API_BASE}/auth/change-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${jwtToken}` },
          body: JSON.stringify({ current_password: cur, new_password: nw })
        });
        if (res.ok) {
          showToast("Password updated successfully!");
          modal.classList.add("hidden");
          resetChangePassForm();
        } else {
          const err = await res.json();
          showToast(err.detail || "Failed to update password");
        }
      } catch { showToast("Server connection failed."); }
    } else {
      showToast("Simulation: Password changed!");
      modal.classList.add("hidden");
      resetChangePassForm();
    }
  });
}

function setRule(el, pass, label) {
  if (!el) return;
  el.className = pass ? "valid" : "invalid";
  el.innerHTML = (pass ? "✓ " : "❌ ") + label;
}

function resetChangePassForm() {
  document.getElementById("change-password-form")?.reset();
  setRule(document.getElementById("change-rule-length"), false, "Minimum 8 characters");
  setRule(document.getElementById("change-rule-number"), false, "At least 1 number");
  setRule(document.getElementById("change-rule-special"), false, "At least 1 special character");
}

// --------------------------------------------------------------------------
// SHARED PAGE BOOTSTRAP — Call in every dashboard page
// --------------------------------------------------------------------------
async function bootPage(pageName) {
  requireAuth();
  lucide.createIcons();
  initHamburgerMenu();
  setActiveSidebarLink(pageName);
  initProfileDropdown();
  initEyeToggles();
  initChangePasswordModal();
  await checkBackendConnection();
  await loadUserProfile();
  await syncBrokerStatus();
}
