interface CfReadyThemeApi {
  get: () => string;
  set: (theme: "light" | "dark") => void;
  toggle: () => string;
  remount: () => void;
}

interface Window {
  cfReadyTheme?: CfReadyThemeApi;
}
