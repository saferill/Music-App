import { NextResponse } from 'next/server';
import YTMusic from 'ytmusic-api';
import { normalizeNamedEntity, normalizeTrack } from '@/lib/media';

const ytmusic = new YTMusic();
let initializePromise: Promise<void> | null = null;

async function ensureInitialized() {
  if (!initializePromise) {
    initializePromise = ytmusic
      .initialize()
      .then(() => undefined)
      .catch((error) => {
        initializePromise = null;
        throw error;
      });
  }

  return initializePromise;
}

function normalizeHomeItem(item: Record<string, unknown>) {
  const type = typeof item.type === 'string' ? item.type : '';

  if (type === 'ALBUM') {
    return normalizeNamedEntity(item, 'Album');
  }

  if (type === 'PLAYLIST') {
    return normalizeNamedEntity(item, 'Playlist');
  }

  return normalizeTrack(item);
}

export async function GET() {
  try {
    await ensureInitialized();
    const sections = await ytmusic.getHomeSections();

    const normalizedSections = sections
      .map((section) => ({
        title: section.title,
        contents: section.contents
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
          .map((item) => normalizeHomeItem(item))
          .filter(Boolean),
      }))
      .filter((section) => section.title && section.contents.length > 0);

    return NextResponse.json(
      {
        sections: normalizedSections,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    console.error('Home feed error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
