export const WEBSITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://musicapp-lime.vercel.app';
export const GITHUB_OWNER = process.env.SONARA_GITHUB_OWNER || 'safe-rill';
export const GITHUB_REPO = process.env.SONARA_GITHUB_REPO || 'sonara-music';
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;
export const GITHUB_LATEST_RELEASE_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
export const ANDROID_LATEST_DOWNLOAD_PATH = '/download/android/latest';
export const DEVELOPER_GITHUB_URL =
  process.env.NEXT_PUBLIC_DEVELOPER_GITHUB_URL || `https://github.com/${GITHUB_OWNER}`;
export const DEVELOPER_INSTAGRAM_URL =
  process.env.NEXT_PUBLIC_DEVELOPER_INSTAGRAM_URL || 'https://instagram.com/safe_rill';

export const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return '';

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return '';
  }

  const isCapacitor = window.location.protocol === 'capacitor:';
  if (isCapacitor) return WEBSITE_URL;

  return '';
};
