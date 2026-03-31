import { NextResponse } from 'next/server';
import { resolveStreamFromHarmonySources, StreamResolution } from '@/lib/stream-source';
import { getPlayerData } from '@/lib/innertube';

const STREAM_CACHE_TTL = 5 * 60 * 1000;
const streamCache = new Map<
  string,
  {
    expiresAt: number;
    value: StreamResolution | null;
  }
>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id')?.trim();

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  const cached = streamCache.get(id);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(
      {
        stream: cached.value,
        fallback: !cached.value,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  }

  let stream: StreamResolution | null = null;

  try {
    // 1. Try InnerTube (SimpMusic Concept) - Most reliable for native apps
    const playerData = await getPlayerData(id);
    const streamingData = playerData?.streamingData;
    
    if (streamingData?.adaptiveFormats) {
      // Find best audio format (prioritize opus or m4a)
      const audioFormats = streamingData.adaptiveFormats
        .filter((f: any) => f.mimeType.startsWith('audio/'))
        .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

      const best = audioFormats[0];
      if (best && best.url) {
        stream = {
          api: 'innertube',
          provider: 'piped', // Reusing the type but labeling context
          url: best.url,
          mimeType: best.mimeType,
          bitrate: best.bitrate,
          codec: null,
          duration: parseInt(streamingData.expiresInSeconds || '3600'),
          relatedTracks: [],
        };
      }
    }
  } catch (error) {
    console.error('InnerTube stream error:', error);
  }

  // 2. Fallback to Piped harmony sources if InnerTube failed or track is protected
  if (!stream) {
    stream = await resolveStreamFromHarmonySources(id).catch(() => null);
  }

  streamCache.set(id, {
    expiresAt: Date.now() + STREAM_CACHE_TTL,
    value: stream,
  });

  if (streamCache.size > 500) {
    streamCache.clear();
  }

  return NextResponse.json(
    {
      stream,
      fallback: !stream,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
      },
    }
  );
}
