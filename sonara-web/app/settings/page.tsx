'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Github,
  HardDriveDownload,
  History,
  Instagram,
  Library,
  RefreshCcw,
  UserRound,
} from 'lucide-react';
import { db } from '@/lib/db';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { getApiBaseUrl, ANDROID_LATEST_DOWNLOAD_PATH, DEVELOPER_GITHUB_URL, DEVELOPER_INSTAGRAM_URL } from '@/lib/config';
import { isAndroidApp, openNativeUpdateUrl } from '@/lib/app-update';

type Stats = {
  likedSongs: number;
  playlists: number;
  followedArtists: number;
  recentSearches: number;
};

export default function SettingsPage() {
  const router = useRouter();
  const { isInstallable, installPWA } = usePWAInstall();
  const [stats, setStats] = useState<Stats>({
    likedSongs: 0,
    playlists: 0,
    followedArtists: 0,
    recentSearches: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      const [likedSongs, playlists, followedArtists, recentSearches] = await Promise.all([
        db.getLikedSongs(),
        db.getPlaylists(),
        db.getSubscribedArtists(),
        db.getRecentSearches(),
      ]);

      setStats({
        likedSongs: likedSongs.length,
        playlists: playlists.length,
        followedArtists: followedArtists.length,
        recentSearches: recentSearches.length,
      });
    };

    void loadStats();
  }, []);

  const handleAndroidDownload = () => {
    const absoluteApkUrl = new URL(ANDROID_LATEST_DOWNLOAD_PATH, getApiBaseUrl() || window.location.origin).toString();

    if (isAndroidApp()) {
      void openNativeUpdateUrl(absoluteApkUrl);
      return;
    }

    window.open(absoluteApkUrl, '_blank', 'noopener,noreferrer');
  };

  const clearRecentSearches = async () => {
    await db.clearRecentSearches();
    setStats((current) => ({
      ...current,
      recentSearches: 0,
    }));
  };

  return (
    <main className="min-h-screen pb-32 md:pb-16">
      <div className="page-shell space-y-6 pt-4 md:space-y-8 md:pt-6">
        <section className="glass-panel-strong rounded-[30px] p-4 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                onClick={() => router.back()}
                className="rounded-full p-2 text-white transition hover:bg-white/10"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">Settings</div>
                <h1 className="mt-2 text-3xl font-semibold text-white">Pengaturan</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
                  Halaman ini merangkum aksi penting web player: instalasi PWA, update Android, statistik pustaka
                  lokal, dan akses cepat ke info project.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SettingsStat icon={Library} label="Lagu disukai" value={stats.likedSongs} />
          <SettingsStat icon={HardDriveDownload} label="Playlist lokal" value={stats.playlists} />
          <SettingsStat icon={UserRound} label="Artis diikuti" value={stats.followedArtists} />
          <SettingsStat icon={History} label="Pencarian terbaru" value={stats.recentSearches} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="glass-panel rounded-[28px] p-5">
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/35">Actions</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Aksi cepat</h2>

            <div className="mt-5 space-y-3">
              <button
                onClick={handleAndroidDownload}
                className="flex w-full items-center justify-between rounded-2xl bg-[var(--accent)] px-4 py-4 text-left text-black transition hover:scale-[1.01]"
              >
                <div>
                  <div className="text-sm font-semibold">Download Android terbaru</div>
                  <div className="mt-1 text-xs text-black/70">Pakai link stabil yang sama dengan tombol update.</div>
                </div>
                <Download className="h-5 w-5" />
              </button>

              {isInstallable && (
                <button
                  onClick={installPWA}
                  className="flex w-full items-center justify-between rounded-2xl bg-white/6 px-4 py-4 text-left transition hover:bg-white/10"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">Instal versi web</div>
                    <div className="mt-1 text-xs text-white/50">Tambahkan Sonara ke homescreen seperti aplikasi.</div>
                  </div>
                  <Download className="h-5 w-5 text-white" />
                </button>
              )}

              <button
                onClick={() => void clearRecentSearches()}
                className="flex w-full items-center justify-between rounded-2xl bg-white/6 px-4 py-4 text-left transition hover:bg-white/10"
              >
                <div>
                  <div className="text-sm font-semibold text-white">Bersihkan pencarian terbaru</div>
                  <div className="mt-1 text-xs text-white/50">Mengosongkan riwayat query yang disimpan di browser.</div>
                </div>
                <RefreshCcw className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          <div className="glass-panel rounded-[28px] p-5">
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/35">Project</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Tentang Sonara</h2>
            <p className="mt-3 text-sm leading-7 text-white/60">
              Sonara memadukan aplikasi Android dan web player dengan sumber katalog yang sama. Halaman ini jadi
              jembatan kecil agar versi web tetap terasa dekat dengan aplikasi utama.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <a
                href={DEVELOPER_GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl bg-white/6 px-4 py-4 transition hover:bg-white/10"
              >
                <Github className="h-5 w-5 text-white" />
                <span className="text-sm font-medium text-white">GitHub</span>
              </a>
              <a
                href={DEVELOPER_INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl bg-white/6 px-4 py-4 transition hover:bg-white/10"
              >
                <Instagram className="h-5 w-5 text-white" />
                <span className="text-sm font-medium text-white">Instagram</span>
              </a>
            </div>

            <div className="mt-5 rounded-2xl bg-black/20 p-4">
              <div className="text-sm font-semibold text-white">Butuh halaman lama?</div>
              <p className="mt-2 text-sm leading-7 text-white/55">
                Bagian profil developer lama masih tersedia dan tetap bisa diakses kalau dibutuhkan.
              </p>
              <Link
                href="/developer"
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10"
              >
                Buka halaman developer
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SettingsStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Library;
  label: string;
  value: number;
}) {
  return (
    <div className="glass-panel rounded-[24px] p-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)]/14 text-[var(--accent)]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 text-3xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-sm text-white/55">{label}</div>
    </div>
  );
}
