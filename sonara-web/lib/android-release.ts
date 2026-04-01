import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ANDROID_LATEST_DOWNLOAD_PATH, GITHUB_LATEST_RELEASE_API_URL, GITHUB_REPO_URL } from '@/lib/config';

export type AndroidReleasePayload = {
  versionCode: number;
  versionName: string;
  downloadPath: string;
  releaseNotes: string[];
};

const FALLBACK_RELEASE_NOTES = [
  'Splash screen Android sekarang tampil lebih rapi dengan identitas Sonara Music.',
  'Login lama disembunyikan dari antarmuka agar pengalaman lebih sederhana.',
  'Link unduhan APK sekarang memakai route latest yang otomatis mengikuti rilis GitHub terbaru.',
];

function readAndroidVersionInfo() {
  const tomlPath = path.resolve(process.cwd(), '..', 'gradle', 'libs.versions.toml');
  const fallback = { versionCode: 48, versionName: '1.1.1' };

  if (!existsSync(tomlPath)) {
    return fallback;
  }

  const content = readFileSync(tomlPath, 'utf8');
  const versionName = content.match(/version-name\s*=\s*"([^"]+)"/)?.[1] || fallback.versionName;
  const versionCode = Number(content.match(/version-code\s*=\s*"([^"]+)"/)?.[1] || fallback.versionCode);

  return { versionCode, versionName };
}

function normalizeReleaseNotes(body?: string | null) {
  const lines =
    body
      ?.split('\n')
      .map((line) => line.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 3) || [];

  return lines.length ? lines : FALLBACK_RELEASE_NOTES;
}

export async function getAndroidRelease(): Promise<AndroidReleasePayload> {
  const versionInfo = readAndroidVersionInfo();

  try {
    const response = await fetch(GITHUB_LATEST_RELEASE_API_URL, {
      next: { revalidate: 300 },
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });

    if (response.ok) {
      const release = await response.json();
      const versionName =
        typeof release?.tag_name === 'string' ? release.tag_name.replace(/^v/i, '') : versionInfo.versionName;

      return {
        versionCode: versionInfo.versionCode,
        versionName,
        downloadPath: ANDROID_LATEST_DOWNLOAD_PATH,
        releaseNotes: normalizeReleaseNotes(release?.body),
      };
    }
  } catch (error) {
    console.error('Failed to fetch latest Android release metadata:', error);
  }

  return {
    versionCode: versionInfo.versionCode,
    versionName: versionInfo.versionName,
    downloadPath: ANDROID_LATEST_DOWNLOAD_PATH,
    releaseNotes: [
      ...FALLBACK_RELEASE_NOTES,
      `Rilis GitHub terbaru akan tersedia di ${GITHUB_REPO_URL}/releases.`,
    ],
  };
}
