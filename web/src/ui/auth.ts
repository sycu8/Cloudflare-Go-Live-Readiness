import { githubLoginUrl, googleLoginUrl } from "../api/auth.js";

export function renderLoginScreen(): string {
  return `
    <div class="auth-screen">
      <div class="auth-card">
        <div class="auth-card__brand">
          <div class="auth-card__logo" aria-hidden="true">☁</div>
          <h1>CF Ready Agent</h1>
          <p>Sign in to scan projects, save reports, and connect GitHub repos.</p>
        </div>

        <div class="auth-actions">
          <a class="auth-btn auth-btn--google" href="${googleLoginUrl("/app/")}">
            <span class="auth-btn__icon" aria-hidden="true">G</span>
            Continue with Google
          </a>
          <a class="auth-btn auth-btn--github" href="${githubLoginUrl("/app/")}">
            <span class="auth-btn__icon" aria-hidden="true">⌘</span>
            Continue with GitHub
          </a>
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
