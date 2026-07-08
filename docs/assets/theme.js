(function () {
  const STORAGE_KEY = "cf-ready-theme";

  function systemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0f172a" : "#f8fafc");
    document.querySelectorAll(".theme-toggle").forEach(updateToggleButton);
    window.dispatchEvent(new CustomEvent("cf-ready-theme-change", { detail: { theme } }));
  }

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }

  function setTheme(theme) {
    if (theme !== "light" && theme !== "dark") return;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
    applyTheme(theme);
  }

  function toggleTheme() {
    setTheme(currentTheme() === "dark" ? "light" : "dark");
    return currentTheme();
  }

  function updateToggleButton(btn) {
    const theme = currentTheme();
    const isDark = theme === "dark";
    btn.setAttribute("aria-pressed", isDark ? "true" : "false");
    btn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    btn.title = isDark ? "Light mode" : "Dark mode";
    const icon = btn.querySelector(".theme-toggle__icon");
    if (icon) icon.textContent = isDark ? "☀" : "☾";
  }

  function createToggleButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-toggle";
    btn.innerHTML = '<span class="theme-toggle__icon" aria-hidden="true">☾</span>';
    btn.addEventListener("click", () => toggleTheme());
    updateToggleButton(btn);
    return btn;
  }

  function mountToggles() {
    const hosts = document.querySelectorAll(".nav-links, .header-actions");
    hosts.forEach((host) => {
      if (host.querySelector(".theme-toggle")) return;
      host.insertBefore(createToggleButton(), host.firstChild);
    });
  }

  // Apply before paint
  let initial = systemTheme();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") initial = stored;
  } catch {
    /* ignore */
  }
  applyTheme(initial);

  window.cfReadyTheme = { get: currentTheme, set: setTheme, toggle: toggleTheme, remount: mountToggles };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountToggles);
  } else {
    mountToggles();
  }

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    applyTheme(event.matches ? "dark" : "light");
  });
})();
