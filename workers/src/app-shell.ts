/**
 * Client routes under /app/ stay on the Web Agent shell.
 * Missing files with an extension keep the real 404 page.
 */
export function isAppClientRoute(pathname: string): boolean {
  if (pathname !== "/app" && !pathname.startsWith("/app/")) return false;
  const last = pathname.slice(pathname.lastIndexOf("/") + 1);
  return !last.includes(".");
}

/** Directory index that html_handling serves as the /app/ document. */
export function appShellUrl(requestUrl: string): URL {
  const url = new URL(requestUrl);
  url.pathname = "/app/";
  url.search = "";
  url.hash = "";
  return url;
}
