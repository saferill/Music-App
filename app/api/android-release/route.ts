import { NextResponse } from 'next/server';
import { ANDROID_RELEASE } from '@/lib/android-release';

export async function GET() {
  return NextResponse.json(ANDROID_RELEASE, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
    },
  });
}
