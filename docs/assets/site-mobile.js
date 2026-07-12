(function () {
  const MOBILE_MQ = window.matchMedia("(max-width: 768px)");

  function isMobile() {
    return MOBILE_MQ.matches;
  }

  function createMenuButton(label, controlsId, extraClass) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `nav-menu-btn${extraClass ? ` ${extraClass}` : ""}`;
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", controlsId);
    btn.setAttribute("aria-label", label);
    btn.dataset.defaultLabel = label;
    btn.innerHTML =
      '<span class="nav-menu-btn__bar" aria-hidden="true"></span>' +
      '<span class="nav-menu-btn__bar" aria-hidden="true"></span>' +
      '<span class="nav-menu-btn__bar" aria-hidden="true"></span>';
    return btn;
  }

  function createOverlay() {
    const el = document.createElement("div");
    el.className = "nav-overlay";
    el.hidden = true;
    return el;
  }

  function setOpen(state) {
    document.body.classList.toggle("nav-open", state);
    document.querySelectorAll(".nav-menu-btn").forEach((btn) => {
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
    closeMenu();
    setOpen(true);
    panel.classList.add("is-open");
    const overlay = document.querySelector(".nav-overlay");
    if (overlay) overlay.hidden = false;
  }

  function initHeaderNav() {
    const headerInner = document.querySelector(".site-header .header-inner");
    const navLinks = headerInner?.querySelector(".nav-links");
    if (!headerInner || !navLinks || document.querySelector(".docs-layout")) return;

    navLinks.id = navLinks.id || "site-nav";
    navLinks.classList.add("nav-links--drawer");

    const btn = createMenuButton("Open site menu", navLinks.id);
    btn.addEventListener("click", () => {
      if (document.body.classList.contains("nav-open") && navLinks.classList.contains("is-open")) {
        closeMenu();
      } else {
        openPanel(navLinks);
      }
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (isMobile()) closeMenu();
      });
    });

    headerInner.insertBefore(btn, navLinks);
  }

  function initDocsNav() {
    const docsNav = document.querySelector(".docs-layout .docs-nav");
    const headerInner = document.querySelector(".site-header .header-inner");
    if (!docsNav || !headerInner) return;

    document.body.classList.add("docs-page");
    docsNav.id = docsNav.id || "docs-sidebar";
    docsNav.classList.add("docs-nav--drawer");

    const title = document.createElement("div");
    title.className = "docs-nav__title";
    title.textContent = "Browse docs";
    docsNav.insertBefore(title, docsNav.firstChild);

    const footer = document.createElement("div");
    footer.className = "docs-nav__footer";
    footer.innerHTML = '<a href="/">← Home</a><a href="/app/" class="btn btn-primary docs-nav__cta">Web Agent</a>';
    docsNav.appendChild(footer);

    const btn = createMenuButton("Open documentation menu", docsNav.id, "nav-menu-btn--docs");
    btn.addEventListener("click", () => {
      if (document.body.classList.contains("nav-open") && docsNav.classList.contains("is-open")) {
        closeMenu();
      } else {
        openPanel(docsNav);
      }
    });

    docsNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (isMobile()) closeMenu();
      });
    });

    const logo = headerInner.querySelector(".logo");
    if (logo?.nextSibling) {
      headerInner.insertBefore(btn, logo.nextSibling);
    } else {
      headerInner.appendChild(btn);
    }

    const jump = document.createElement("a");
    jump.href = "#main-content";
    jump.className = "docs-skip-content";
    jump.textContent = "Skip to content";
    document.querySelector(".docs-layout")?.prepend(jump);
  }

  function initMainLandmark() {
    const content = document.querySelector(".docs-content");
    if (content && !content.id) {
      content.id = "main-content";
      content.setAttribute("tabindex", "-1");
    }
  }

  function initOverlay() {
    const overlay = createOverlay();
    overlay.addEventListener("click", closeMenu);
    document.body.appendChild(overlay);
  }

  function initEscape() {
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  function initResize() {
    MOBILE_MQ.addEventListener("change", () => {
      if (!isMobile()) closeMenu();
    });
  }

  function init() {
    initOverlay();
    initEscape();
    initResize();
    initMainLandmark();
    initDocsNav();
    initHeaderNav();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
