'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Download, RefreshCcw, X } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/config';
import { getNativeAppInfo, isAndroidApp, openNativeUpdateUrl, showNativeUpdateNotification } from '@/lib/app-update';

type AndroidReleasePayload = {
  versionCode: number;
  versionName: string;
  downloadPath: string;
  releaseNotes?: string[];
};

const STORAGE_KEYS = {
  notifiedVersion: 'sonara:update-notified-version',
  dismissedVersion: 'sonara:update-dismissed-version',
};

export function AppUpdateNotifier() {
  const [release, setRelease] = useState<AndroidReleasePayload | null>(null);
  const [currentVersionCode, setCurrentVersionCode] = useState<number | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!isAndroidApp()) return;

    const checkForUpdate = async () => {
      try {
        const apiBaseUrl = getApiBaseUrl();
        const [appInfo, response] = await Promise.all([
          getNativeAppInfo(),
          fetch(`${apiBaseUrl}/api/android-release`),
        ]);

        if (!appInfo || !response.ok) return;

        const payload = (await response.json()) as AndroidReleasePayload;
        const absoluteUrl = new URL(payload.downloadPath, apiBaseUrl || window.location.origin).toString();
        const normalizedPayload = {
          ...payload,
          downloadPath: absoluteUrl,
        };

        setCurrentVersionCode(appInfo.versionCode);
        setRelease(normalizedPayload);

        if (normalizedPayload.versionCode <= appInfo.versionCode) return;

        const dismissedVersion = Number(window.localStorage.getItem(STORAGE_KEYS.dismissedVersion) || 0);
        const notifiedVersion = Number(window.localStorage.getItem(STORAGE_KEYS.notifiedVersion) || 0);

        if (dismissedVersion < normalizedPayload.versionCode) {
          setShowPrompt(true);
        }

        if (notifiedVersion < normalizedPayload.versionCode) {
          await showNativeUpdateNotification(
            `Update Sonara ${normalizedPayload.versionName} tersedia`,
            'Buka Sonara untuk unduh APK terbaru dan pasang versinya.',
            normalizedPayload.downloadPath
          );
          window.localStorage.setItem(STORAGE_KEYS.notifiedVersion, String(normalizedPayload.versionCode));
        }
      } catch (error) {
        console.error('Failed to check Android app update:', error);
      }
    };

    void checkForUpdate();
  }, []);

  const hasUpdate = useMemo(() => {
    if (!release || currentVersionCode == null) return false;
    return release.versionCode > currentVersionCode;
  }, [currentVersionCode, release]);

  if (!hasUpdate || !release || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 120, opacity: 0 }}
        className="fixed bottom-[calc(11rem+env(safe-area-inset-bottom))] left-4 right-4 z-[80] md:bottom-8 md:left-auto md:right-8 md:w-[380px]"
      >
        <div className="glass-panel-strong relative rounded-[28px] border border-[#FF7A59]/20 p-5 shadow-2xl">
          <button
            onClick={() => {
              window.localStorage.setItem(STORAGE_KEYS.dismissedVersion, String(release.versionCode));
              setShowPrompt(false);
            }}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FF7A59] text-black">
              <RefreshCcw className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1 pr-8">
              <div className="text-[11px] uppercase tracking-[0.28em] text-[#FFD4C6]">Update App</div>
              <h3 className="mt-2 text-base font-bold text-white">Sonara {release.versionName} siap dipasang</h3>
              <p className="mt-2 text-sm leading-6 text-white/65">
                Ada versi Android yang lebih baru untuk aplikasimu. Tekan update untuk unduh APK terbaru.
              </p>
              {release.releaseNotes?.length ? (
                <div className="mt-3 space-y-1 text-xs text-white/55">
                  {release.releaseNotes.slice(0, 2).map((note) => (
                    <div key={note}>{note}</div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              onClick={() => {
                window.localStorage.setItem(STORAGE_KEYS.dismissedVersion, String(release.versionCode));
                setShowPrompt(false);
              }}
              className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Nanti saja
            </button>
            <button
              onClick={() => openNativeUpdateUrl(release.downloadPath)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#FF7A59] px-4 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
            >
              <Download className="h-4 w-4" />
              Update sekarang
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
