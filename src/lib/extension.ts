export function isDevMode(): boolean {
  try {
    return !chrome.runtime.getManifest().update_url;
  } catch {
    return true;
  }
}
