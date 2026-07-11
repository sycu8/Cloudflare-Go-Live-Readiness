export const ONBOARDING_STORAGE_KEY = "cf-ready-onboarding-v1";

export type OnboardingTab = "project" | "workspace" | "results";

export type OnboardingStep = {
  id: string;
  title: string;
  body: string;
  tab?: OnboardingTab;
  workspaceView?: "chat" | "cli";
  highlight?: string;
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Chào mừng đến CF Ready Agent",
    body: "Công cụ kiểm tra độ sẵn sàng go-live trên Cloudflare. Làm theo 4 bước đơn giản bên dưới để bắt đầu.",
  },
  {
    id: "import",
    title: "Bước 1 · Import project",
    body: "Upload file ZIP hoặc dán link GitHub. Source được lưu trên cloud — không cần cài đặt gì trên máy bạn.",
    tab: "project",
    highlight: "#dropzone",
  },
  {
    id: "scan",
    title: "Bước 2 · Chạy scan",
    body: "Mở tab Workspace, gõ scan trong CLI hoặc nhắn chat \"scan project\". Lần đầu có thể mất vài phút — thanh đếm thời gian sẽ hiện phía trên.",
    tab: "workspace",
    workspaceView: "cli",
    highlight: "#chips",
  },
  {
    id: "results",
    title: "Bước 3 · Xem kết quả",
    body: "Tab Results hiển thị điểm tổng, blockers và khuyến nghị. Tải PDF report khi scan hoàn tất.",
    tab: "results",
    highlight: "#results-panel",
  },
  {
    id: "tips",
    title: "Bước 4 · Mẹo sử dụng",
    body: "F5 cùng tab vẫn giữ session. Nếu vô tình reload khi đang scan, server vẫn chạy — mở lại tab Results sau vài phút hoặc gõ scan lại.",
    tab: "workspace",
    workspaceView: "chat",
  },
];

export function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "done";
  } catch {
    return false;
  }
}

export function markOnboardingComplete(): void {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "done");
  } catch {
    /* private browsing */
  }
}

export function resetOnboarding(): void {
  try {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export type OnboardingHandle = {
  open(step?: number): void;
  close(): void;
  isOpen(): boolean;
};

type MountOptions = {
  onNavigateTab?: (tab: OnboardingTab) => void;
  onNavigateWorkspace?: (view: "chat" | "cli") => void;
  onComplete?: () => void;
};

export function mountOnboarding(root: HTMLElement, options: MountOptions = {}): OnboardingHandle {
  const overlay = document.createElement("div");
  overlay.className = "onboarding-overlay";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "onboarding-title");
  overlay.innerHTML = `
    <div class="onboarding-backdrop" data-action="backdrop"></div>
    <div class="onboarding-card">
      <div class="onboarding-card__head">
        <span class="onboarding-step-badge" id="onboarding-step-badge">1 / ${ONBOARDING_STEPS.length}</span>
        <button type="button" class="onboarding-close" aria-label="Đóng hướng dẫn" data-action="close">✕</button>
      </div>
      <div class="onboarding-dots" id="onboarding-dots" aria-hidden="true"></div>
      <h2 class="onboarding-title" id="onboarding-title"></h2>
      <p class="onboarding-body" id="onboarding-body"></p>
      <div class="onboarding-actions">
        <button type="button" class="ghost onboarding-skip" data-action="skip">Bỏ qua</button>
        <div class="onboarding-actions__main">
          <button type="button" class="ghost" data-action="prev" id="onboarding-prev">Trước</button>
          <button type="button" class="primary" data-action="next" id="onboarding-next">Tiếp</button>
        </div>
      </div>
    </div>
    <div class="onboarding-highlight" id="onboarding-highlight" hidden aria-hidden="true"></div>
  `;
  root.appendChild(overlay);

  const titleEl = overlay.querySelector("#onboarding-title") as HTMLElement;
  const bodyEl = overlay.querySelector("#onboarding-body") as HTMLElement;
  const badgeEl = overlay.querySelector("#onboarding-step-badge") as HTMLElement;
  const dotsEl = overlay.querySelector("#onboarding-dots") as HTMLElement;
  const prevBtn = overlay.querySelector("#onboarding-prev") as HTMLButtonElement;
  const nextBtn = overlay.querySelector("#onboarding-next") as HTMLButtonElement;
  const highlightEl = overlay.querySelector("#onboarding-highlight") as HTMLElement;

  dotsEl.innerHTML = ONBOARDING_STEPS.map(
    (_, i) => `<span class="onboarding-dot" data-dot="${i}"></span>`,
  ).join("");

  let currentStep = 0;
  let highlightTarget: HTMLElement | null = null;

  function clearHighlight() {
    highlightTarget?.classList.remove("onboarding-target");
    highlightTarget = null;
    highlightEl.hidden = true;
  }

  function positionHighlight(target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    const pad = 8;
    highlightEl.style.top = `${Math.max(0, rect.top - pad)}px`;
    highlightEl.style.left = `${Math.max(0, rect.left - pad)}px`;
    highlightEl.style.width = `${rect.width + pad * 2}px`;
    highlightEl.style.height = `${rect.height + pad * 2}px`;
    highlightEl.hidden = false;
  }

  function renderStep(index: number) {
    currentStep = Math.max(0, Math.min(index, ONBOARDING_STEPS.length - 1));
    const step = ONBOARDING_STEPS[currentStep];

    titleEl.textContent = step.title;
    bodyEl.textContent = step.body;
    badgeEl.textContent = `${currentStep + 1} / ${ONBOARDING_STEPS.length}`;

    dotsEl.querySelectorAll(".onboarding-dot").forEach((dot, i) => {
      dot.classList.toggle("active", i === currentStep);
      dot.classList.toggle("done", i < currentStep);
    });

    prevBtn.hidden = currentStep === 0;
    nextBtn.textContent = currentStep === ONBOARDING_STEPS.length - 1 ? "Bắt đầu" : "Tiếp";

    if (step.tab) options.onNavigateTab?.(step.tab);
    if (step.workspaceView) options.onNavigateWorkspace?.(step.workspaceView);

    clearHighlight();
    if (step.highlight) {
      requestAnimationFrame(() => {
        const target = root.querySelector(step.highlight!) as HTMLElement | null;
        if (target) {
          highlightTarget = target;
          target.classList.add("onboarding-target");
          target.scrollIntoView({ block: "nearest", behavior: "smooth" });
          positionHighlight(target);
        }
      });
    }
  }

  function open(step = 0) {
    overlay.hidden = false;
    document.body.classList.add("onboarding-open");
    renderStep(step);
    nextBtn.focus();
  }

  function close() {
    overlay.hidden = true;
    document.body.classList.remove("onboarding-open");
    clearHighlight();
  }

  function complete() {
    markOnboardingComplete();
    close();
    options.onComplete?.();
  }

  overlay.addEventListener("click", (event) => {
    const action = (event.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
    if (!action) return;
    const kind = action.dataset.action;
    if (kind === "backdrop" || kind === "close" || kind === "skip") {
      complete();
      return;
    }
    if (kind === "prev") {
      renderStep(currentStep - 1);
      return;
    }
    if (kind === "next") {
      if (currentStep >= ONBOARDING_STEPS.length - 1) complete();
      else renderStep(currentStep + 1);
    }
  });

  window.addEventListener(
    "resize",
    () => {
      if (!overlay.hidden && highlightTarget) positionHighlight(highlightTarget);
    },
    { passive: true },
  );

  return { open, close, isOpen: () => !overlay.hidden };
}
