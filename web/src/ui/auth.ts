import { githubLoginUrl, googleLoginUrl, type AuthProviderConfig } from "../api/auth.js";

export function renderLoginScreen(config: AuthProviderConfig, authError?: string | null): string {
  const hasProviders = config.google || config.github;

  const errorBanner = authError
    ? `<div class="auth-setup auth-setup--error" role="alert">
        <strong>Sign-in unavailable</strong>
        <p>${escapeHtml(authErrorMessage(authError))}</p>
      </div>`
    : "";

  const googleBtn = config.google
    ? `<a class="auth-btn auth-btn--google" href="${googleLoginUrl("/app/")}">
        <span class="auth-btn__icon" aria-hidden="true">G</span>
        Continue with Google
      </a>`
    : "";

  const githubBtn = config.github
    ? `<a class="auth-btn auth-btn--github" href="${githubLoginUrl("/app/")}">
        <span class="auth-btn__icon" aria-hidden="true">⌘</span>
        Continue with GitHub
      </a>`
    : "";

  const setupNotice =
    hasProviders || authError
      ? ""
      : `<div class="auth-setup" role="alert">
        <strong>Sign-in is not configured yet</strong>
        <p>Add Worker secrets via GitHub Actions or <code>wrangler secret put</code>:</p>
        <ul class="auth-setup__list">
          <li><code>GITHUB_CLIENT_ID</code> + <code>GITHUB_CLIENT_SECRET</code></li>
          <li><code>GOOGLE_CLIENT_ID</code> + <code>GOOGLE_CLIENT_SECRET</code></li>
        </ul>
        <p class="auth-setup__callback">GitHub callback:<br /><code>${escapeHtml(config.githubCallbackUrl)}</code></p>
        <p class="auth-setup__callback">Google callback:<br /><code>${escapeHtml(config.googleCallbackUrl)}</code></p>
      </div>`;

  return `
    <div class="auth-screen">
      <div class="auth-card">
        <div class="auth-card__brand">
          <div class="auth-card__logo" aria-hidden="true">☁</div>
          <h1>CF Ready Agent</h1>
          <p>Sign in to scan projects, save reports, and connect GitHub repos.</p>
        </div>

        ${errorBanner}
        ${setupNotice}

        <div class="auth-actions">
          ${googleBtn}
          ${githubBtn}
        </div>

        <p class="auth-footnote">
          New accounts are created automatically on first sign-in.
          GitHub connection can also authorize private repository imports.
        </p>

        <a class="auth-link" href="/">← Back to docs</a>
      </div>
    </div>
  `;
}

export function renderLoginLoading(): string {
  return `
    <div class="auth-screen">
      <div class="auth-card auth-card--loading">
        <p>Loading sign-in options…</p>
      </div>
    </div>
  `;
}

export function renderUserMenu(name: string, email: string, avatarUrl: string | null): string {
  const initial = (name || email).charAt(0).toUpperCase();
  const avatar = avatarUrl
    ? `<img class="user-menu__avatar" src="${avatarUrl}" alt="" width="28" height="28" />`
    : `<span class="user-menu__initial" aria-hidden="true">${initial}</span>`;

  return `
    <div class="user-menu" id="user-menu">
      <button type="button" class="user-menu__trigger" id="user-menu-trigger" aria-haspopup="true" aria-expanded="false">
        ${avatar}
        <span class="user-menu__name">${escapeHtml(name || email)}</span>
      </button>
      <div class="user-menu__dropdown" id="user-menu-dropdown" hidden>
        <p class="user-menu__email">${escapeHtml(email)}</p>
        <button type="button" class="user-menu__logout" id="logout-btn">Sign out</button>
      </div>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function authErrorMessage(code: string): string {
  if (code === "google_not_configured") {
    return "Google sign-in is not configured on the server. The operator must set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.";
  }
  if (code === "github_not_configured") {
    return "GitHub sign-in is not configured on the server. The operator must set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.";
  }
  return "Sign-in provider is not available.";
}

export function mountUserMenu(root: HTMLElement, onLogout: () => void): void {
  const trigger = root.querySelector("#user-menu-trigger");
  const dropdown = root.querySelector("#user-menu-dropdown");
  const logoutBtn = root.querySelector("#logout-btn");
  if (!trigger || !dropdown || !logoutBtn) return;

  trigger.addEventListener("click", () => {
    const open = dropdown.hasAttribute("hidden");
    dropdown.toggleAttribute("hidden", !open);
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
  });

  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Node)) return;
    if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.setAttribute("hidden", "");
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  logoutBtn.addEventListener("click", () => {
    void onLogout();
  });
}
