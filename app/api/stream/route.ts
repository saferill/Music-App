import { NextResponse } from 'next/server';
import { resolveStreamFromHarmonySources, StreamResolution } from '@/lib/stream-source';

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

  const stream = await resolveStreamFromHarmonySources(id).catch(() => null);

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
