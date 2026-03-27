import { NextResponse } from 'next/server';
import YTMusic from 'ytmusic-api';

const ytmusic = new YTMusic();
let initialized = false;

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/\[[^\]]+\]|\([^\)]+\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(official|video|audio|lyrics?|visualizer|live|mv)\b/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  
  try {
    if (!initialized) {
      await ytmusic.initialize();
      initialized = true;
    }

    const currentSong = await ytmusic.getSong(id).catch(() => null) as any;
    const currentTitle = normalizeTitle(firstString(currentSong?.name, currentSong?.title));
    const upNext = await ytmusic.getUpNexts(id);
    const seenTitles = new Set<string>();
    const filteredUpNext = Array.isArray(upNext)
      ? upNext.filter((track: any) => {
          if (!track?.videoId || track.videoId === id) return false;

          const normalizedTitle = normalizeTitle(firstString(track.name, track.title));
          if (!normalizedTitle) return true;
          if (normalizedTitle === currentTitle) return false;
          if (seenTitles.has(normalizedTitle)) return false;

          seenTitles.add(normalizedTitle);
          return true;
        })
      : [];

    return NextResponse.json(filteredUpNext, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json([]);
    }
    if (error?.message?.includes('Invalid videoId') || (error?.isAxiosError && error?.response?.status === 400)) {
      return NextResponse.json([]);
    }
    console.error(`UpNext error for id ${id}:`, error?.message || error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
