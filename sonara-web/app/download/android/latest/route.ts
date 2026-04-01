import { NextResponse } from 'next/server';
import { GITHUB_LATEST_RELEASE_API_URL, GITHUB_REPO_URL } from '@/lib/config';

export async function GET() {
  try {
    const response = await fetch(GITHUB_LATEST_RELEASE_API_URL, {
      next: { revalidate: 300 },
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });

    if (response.ok) {
      const release = await response.json();
      const apkAsset = release?.assets?.find(
        (asset: { name?: string; browser_download_url?: string }) =>
          typeof asset?.name === 'string' && asset.name.toLowerCase().endsWith('.apk'),
      );

      if (apkAsset?.browser_download_url) {
        return NextResponse.redirect(apkAsset.browser_download_url, 307);
      }
    }
  } catch (error) {
    console.error('Failed to resolve latest Android download:', error);
  }

  return NextResponse.redirect(`${GITHUB_REPO_URL}/releases/latest`, 307);
}
