(function () {
  const MOBILE_MQ = window.matchMedia("(max-width: 960px)");

  function isMobile() {
    return MOBILE_MQ.matches;
  }

  function setOpen(state) {
    document.body.classList.toggle("nav-open", state);
    document.querySelectorAll("[data-docs-menu], [data-site-menu]").forEach((btn) => {
      btn.setAttribute("aria-expanded", state ? "true" : "false");
      btn.setAttribute("aria-label", state ? "Close menu" : btn.dataset.defaultLabel || "Open menu");
    });
    const overlay = document.querySelector(".nav-overlay");
    if (overlay) overlay.hidden = !state;
    if (!state) {
      document.querySelectorAll(".docs-nav.is-open, .nav-links.is-open").forEach((el) => {
        el.classList.remove("is-open");
      });
    }
  }

  function closeMenu() {
    setOpen(false);
  }

  function openPanel(panel) {
    setOpen(true);
    panel.classList.add("is-open");
    const overlay = document.querySelector(".nav-overlay");
    if (overlay) overlay.hidden = false;
  }

  function bindMenuButton(btn, panel) {
    if (!btn || !panel || btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    if (!btn.dataset.defaultLabel) {
      btn.dataset.defaultLabel = btn.getAttribute("aria-label") || "Open menu";
    }
    btn.addEventListener("click", () => {
      if (document.body.classList.contains("nav-open") && panel.classList.contains("is-open")) {
        closeMenu();
      } else {
        openPanel(panel);
      }
    });
    panel.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (isMobile()) closeMenu();
      });
    });
  }

  function initHeaderNav() {
    const headerInner = document.querySelector(".site-header .header-inner");
    const navLinks = headerInner?.querySelector(".nav-links");
    if (!headerInner || !navLinks || document.querySelector(".docs-layout")) return;

    navLinks.id = navLinks.id || "site-nav";
    navLinks.classList.add("nav-links--drawer");

    let btn = headerInner.querySelector("[data-site-menu]");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "nav-menu-btn nav-menu-btn--site";
      btn.dataset.siteMenu = "1";
      btn.setAttribute("aria-controls", navLinks.id);
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-label", "Open site menu");
      btn.innerHTML =
        '<span class="nav-menu-btn__bars" aria-hidden="true">' +
        '<span class="nav-menu-btn__bar"></span><span class="nav-menu-btn__bar"></span><span class="nav-menu-btn__bar"></span>' +
        "</span><span class=\"nav-menu-btn__label\">Menu</span>";
      headerInner.insertBefore(btn, navLinks);
    }

    bindMenuButton(btn, navLinks);
  }

  function initDocsNav() {
    const docsNav = document.querySelector(".docs-layout .docs-nav");
    const headerInner = document.querySelector(".site-header .header-inner");
    if (!docsNav || !headerInner) return;

    document.body.classList.add("docs-page");
    docsNav.id = docsNav.id || "docs-sidebar";
    docsNav.classList.add("docs-nav--drawer");

    if (!docsNav.querySelector(".docs-nav__title")) {
      const title = document.createElement("div");
      title.className = "docs-nav__title";
      title.textContent = "Browse docs";
      docsNav.insertBefore(title, docsNav.firstChild);
    }

    if (!docsNav.querySelector(".docs-nav__footer")) {
      const footer = document.createElement("div");
      footer.className = "docs-nav__footer";
      footer.innerHTML =
        '<a href="/">Home</a><a href="/app/" class="btn btn-primary docs-nav__cta">Web Agent</a>';
      docsNav.appendChild(footer);
    }

    const btn = headerInner.querySelector("[data-docs-menu]");
    bindMenuButton(btn, docsNav);

    const layout = document.querySelector(".docs-layout");
    if (layout && !layout.querySelector(".docs-skip-content")) {
      const jump = document.createElement("a");
      jump.href = "#main-content";
      jump.className = "docs-skip-content";
      jump.textContent = "Skip to content";
      layout.prepend(jump);
    }
  }

  function initMainLandmark() {
    const content = document.querySelector(".docs-content");
    if (content && !content.id) {
      content.id = "main-content";
      content.setAttribute("tabindex", "-1");
    }
  }

  function initOverlay() {
    if (document.querySelector(".nav-overlay")) return;
    const overlay = document.createElement("div");
    overlay.className = "nav-overlay";
    overlay.hidden = true;
    overlay.addEventListener("click", closeMenu);
    document.body.appendChild(overlay);
  }

  function initThemeOnDocsHeader() {
    const headerActions = document.querySelector(".site-header .header-actions");
    if (!headerActions || !window.cfReadyTheme?.remount) return;
    window.cfReadyTheme.remount();
  }

  function init() {
    initOverlay();
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
    MOBILE_MQ.addEventListener("change", () => {
      if (!isMobile()) closeMenu();
    });
    initMainLandmark();
    initDocsNav();
    initHeaderNav();
    initThemeOnDocsHeader();
    document.body.classList.add("js-nav-ready");
    closeMenu();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
