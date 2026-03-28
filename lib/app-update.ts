import { Capacitor, registerPlugin } from '@capacitor/core';

interface NativeAppInfo {
  versionName: string;
  versionCode: number;
  packageName: string;
}

interface AppUpdatePlugin {
  getAppInfo(): Promise<NativeAppInfo>;
  openUrl(options: { url: string }): Promise<void>;
  showUpdateNotification(options: { title: string; message: string; url: string }): Promise<void>;
}

const appUpdatePlugin = registerPlugin<AppUpdatePlugin>('AppUpdate');

export const isAndroidApp = () => Capacitor.getPlatform() === 'android';

export async function getNativeAppInfo() {
  if (!isAndroidApp()) return null;
  return appUpdatePlugin.getAppInfo();
}

export async function openNativeUpdateUrl(url: string) {
  if (!isAndroidApp()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  await appUpdatePlugin.openUrl({ url });
}

export async function showNativeUpdateNotification(title: string, message: string, url: string) {
  if (!isAndroidApp()) return;
  await appUpdatePlugin.showUpdateNotification({ title, message, url });
}
