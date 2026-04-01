import { NextResponse } from 'next/server';
import { getAndroidRelease } from '@/lib/android-release';

export async function GET() {
  const release = await getAndroidRelease();

  return NextResponse.json(release, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
    },
  });
}
