const REDIRECT_STORAGE_KEY = "auth_redirect_url";

export function storeRedirectUrl(url: string): void {
  sessionStorage.setItem(REDIRECT_STORAGE_KEY, url);
}

export function getStoredRedirectUrl(): string | null {
  const url = sessionStorage.getItem(REDIRECT_STORAGE_KEY);
  if (url && url.startsWith("/")) {
    sessionStorage.removeItem(REDIRECT_STORAGE_KEY);
    return url;
  }
  return null;
}
