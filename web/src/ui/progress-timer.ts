const BUSY_STATUSES = new Set(["importing", "extracting", "running"]);

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function processStatusLabel(status: string): string {
  switch (status) {
    case "importing":
      return "Đang import source…";
    case "extracting":
      return "Đang giải nén project…";
    case "running":
      return "Đang chạy lệnh…";
    default:
      return "Đang xử lý…";
  }
}

export function isBusyProcessStatus(status: string): boolean {
  return BUSY_STATUSES.has(status);
}

/** User-facing label for the header status pill. */
export function formatStatusPillLabel(status: string): string {
  switch (status) {
    case "done":
      return "Hoàn tất";
    case "idle":
      return "Sẵn sàng";
    case "importing":
      return "Đang import";
    case "extracting":
      return "Đang giải nén";
    case "running":
      return "Đang chạy";
    case "error":
      return "Lỗi";
    default:
      return status;
  }
}

export type ProgressTimerHandle = {
  start(status: string): void;
  stop(): void;
  isActive(): boolean;
};

export function mountProgressTimer(container: HTMLElement): ProgressTimerHandle {
  const root = document.createElement("div");
  root.className = "process-timer";
  root.id = "process-timer";
  root.hidden = true;
  root.setAttribute("role", "status");
  root.setAttribute("aria-live", "polite");
  root.innerHTML = `
    <div class="process-timer__row">
      <span class="process-timer__label">Đang xử lý…</span>
      <span class="process-timer__elapsed" aria-label="Elapsed time">00:00</span>
    </div>
    <div class="process-timer__track" aria-hidden="true">
      <div class="process-timer__bar"></div>
    </div>
  `;
  container.appendChild(root);

  const labelEl = root.querySelector(".process-timer__label") as HTMLElement;
  const elapsedEl = root.querySelector(".process-timer__elapsed") as HTMLElement;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let startedAt = 0;

  function tick() {
    elapsedEl.textContent = formatElapsed(Date.now() - startedAt);
  }

  return {
    start(status: string) {
      labelEl.textContent = processStatusLabel(status);
      root.hidden = false;
      if (!intervalId) {
        startedAt = Date.now();
        tick();
        intervalId = setInterval(tick, 1000);
      }
    },
    stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      root.hidden = true;
      elapsedEl.textContent = "00:00";
    },
    isActive() {
      return intervalId !== null;
    },
  };
}
