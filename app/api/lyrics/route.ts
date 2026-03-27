import { NextResponse } from 'next/server';
import YTMusic from 'ytmusic-api';
import { LyricsPayload, parseLrcLyrics, splitPlainLyrics } from '@/lib/lyrics';

const ytmusic = new YTMusic();
let initializePromise: Promise<unknown> | null = null;
const lyricsCache = new Map<string, LyricsPayload | null>();

async function ensureInitialized() {
  if (!initializePromise) {
    initializePromise = ytmusic.initialize();
  }

  return initializePromise;
}

function createResponse(lyrics: LyricsPayload | null, status = 200) {
  return NextResponse.json(
    { lyrics },
    {
      status,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  );
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function getArtistName(input: unknown): string {
  if (!input) return '';

  if (Array.isArray(input)) {
    return input
      .map((entry) => getArtistName(entry))
      .filter(Boolean)
      .join(', ');
  }

  if (typeof input === 'string') return input.trim();

  if (typeof input === 'object') {
    const value = input as Record<string, unknown>;
    return firstString(
      value.name,
      value.artistName,
      value.author,
      getArtistName(value.artist),
      getArtistName(value.artists)
    );
  }

  return '';
}

function parseDuration(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1000 ? value / 1000 : value;
  }

  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const numeric = Number(trimmed);
    return numeric > 1000 ? numeric / 1000 : numeric;
  }

  const parts = trimmed.split(':').map(Number);
  if (parts.some((part) => Number.isNaN(part))) return undefined;

  return parts.reduce((total, part) => total * 60 + part, 0);
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeTitle(title: string) {
  return title
    .replace(/\[[^\]]*(official|audio|video|lyrics?|visualizer|mv|live session)[^\]]*\]/gi, '')
    .replace(/\([^\)]*(official|audio|video|lyrics?|visualizer|mv|live session)[^\)]*\)/gi, '')
    .replace(/\s+-\s+(official.*|audio|lyrics?|video.*|visualizer.*)$/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeCompare(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|official|video|audio|lyrics?|visualizer|hd|remastered)\b/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function buildTitleCandidates(title: string) {
  const cleanTitle = normalizeTitle(title);
  const withoutFeaturing = cleanTitle.replace(/\s+(feat\.?|ft\.?|featuring)\s+.+$/i, '').trim();

  return unique([title, cleanTitle, withoutFeaturing]);
}

function buildArtistCandidates(artist: string) {
  const primaryArtist = artist.split(/,|&| x | feat\.?|ft\.?|featuring/gi)[0]?.trim() || artist;

  return unique([artist, primaryArtist]);
}

function toLyricsPayload(raw: unknown, source: LyricsPayload['source']): LyricsPayload | null {
  if (!raw || typeof raw !== 'object') return null;

  const payload = raw as Record<string, unknown>;
  const syncedLyrics = typeof payload.syncedLyrics === 'string' ? payload.syncedLyrics.trim() : '';
  const plainLyrics = firstString(payload.plainLyrics, payload.lyrics);
  const syncedLines = parseLrcLyrics(syncedLyrics);
  const lines = syncedLines.length ? syncedLines : splitPlainLyrics(plainLyrics);
  const text = plainLyrics || lines.map((line) => line.text).join('\n').trim();

  if (!lines.length || !text) return null;

  return {
    source,
    providerLabel:
      source === 'ytmusic' ? 'YouTube Music' : source === 'lrclib' ? 'LRCLIB' : 'Lyrics.ovh',
    text,
    lines,
    synced: syncedLines.length > 0,
  };
}

function scoreMatch(
  result: Record<string, unknown>,
  trackName: string,
  artistName: string,
  duration?: number
) {
  const expectedTrack = normalizeCompare(trackName);
  const expectedArtist = normalizeCompare(artistName);
  const resultTrack = normalizeCompare(firstString(result.trackName, result.name, result.title));
  const resultArtist = normalizeCompare(firstString(result.artistName, result.artist));
  let score = 0;

  if (resultTrack === expectedTrack) score += 45;
  else if (resultTrack.includes(expectedTrack) || expectedTrack.includes(resultTrack)) score += 28;

  if (resultArtist === expectedArtist) score += 35;
  else if (resultArtist.includes(expectedArtist) || expectedArtist.includes(resultArtist)) score += 20;

  if (duration) {
    const resultDuration = parseDuration(result.duration);
    const diff = typeof resultDuration === 'number' ? Math.abs(resultDuration - duration) : 999;

    if (diff <= 2) score += 12;
    else if (diff <= 6) score += 6;
  }

  if (typeof result.syncedLyrics === 'string' && result.syncedLyrics.trim()) score += 6;
  if (typeof result.plainLyrics === 'string' && result.plainLyrics.trim()) score += 4;

  return score;
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Melolo Player/1.0',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(4500),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

async function fetchSong(id: string) {
  if (!id || id.length !== 11) return null;

  await ensureInitialized();
  return (await ytmusic.getSong(id)) as Record<string, unknown>;
}

async function fetchDirectYtMusicLyrics(id: string, preloadedSong?: Record<string, unknown> | null) {
  if (!id || id.length !== 11) return null;

  const song = preloadedSong || (await fetchSong(id));
  const lyricsId = firstString(song?.lyricsId);

  if (!lyricsId) return null;

  const lyrics = await ytmusic.getLyrics(lyricsId);
  return toLyricsPayload(lyrics, 'ytmusic');
}

async function fetchFromAlternativeYtMusic(title: string, artist: string) {
  await ensureInitialized();

  const results = await ytmusic.searchSongs(`${artist} ${title}`).catch(() => []);
  const candidates = Array.isArray(results) ? results.slice(0, 4) : [];

  for (const candidate of candidates) {
    const videoId = typeof candidate?.videoId === 'string' ? candidate.videoId : '';
    if (!videoId) continue;

    try {
      const payload = await fetchDirectYtMusicLyrics(videoId);
      if (payload) return payload;
    } catch {
      continue;
    }
  }

  return null;
}

async function fetchFromLrcLib(title: string, artist: string, duration?: number) {
  const titleCandidates = buildTitleCandidates(title);
  const artistCandidates = buildArtistCandidates(artist);

  for (const trackName of titleCandidates) {
    for (const artistName of artistCandidates) {
      const params = new URLSearchParams({
        track_name: trackName,
        artist_name: artistName,
      });

      if (duration) {
        params.set('duration', String(Math.round(duration)));
      }

      try {
        const directMatch = await fetchJson(`https://lrclib.net/api/get?${params.toString()}`);
        const payload = toLyricsPayload(directMatch, 'lrclib');
        if (payload) return payload;
      } catch {
        // Try broader search when exact lookup misses.
      }

      try {
        const searchResults = await fetchJson(`https://lrclib.net/api/search?${params.toString()}`);
        if (!Array.isArray(searchResults)) continue;

        const match = searchResults
          .filter((entry) => typeof entry === 'object' && entry)
          .map((entry) => ({
            entry: entry as Record<string, unknown>,
            score: scoreMatch(entry as Record<string, unknown>, trackName, artistName, duration),
          }))
          .sort((a, b) => b.score - a.score)[0];

        if (match && match.score >= 24) {
          const payload = toLyricsPayload(match.entry, 'lrclib');
          if (payload) return payload;
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

async function fetchFromLyricsOvh(title: string, artist: string) {
  const titleCandidates = buildTitleCandidates(title);
  const artistCandidates = buildArtistCandidates(artist);

  for (const artistName of artistCandidates) {
    for (const trackName of titleCandidates) {
      try {
        const response = await fetch(
          `https://api.lyrics.ovh/v1/${encodeURIComponent(artistName)}/${encodeURIComponent(trackName)}`,
          {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(4500),
          }
        );

        if (!response.ok) continue;

        const payload = await response.json();
        const lyrics = toLyricsPayload(payload, 'lyricsovh');
        if (lyrics) return lyrics;
      } catch {
        continue;
      }
    }
  }

  return null;
}

async function findFirstTruthy(tasks: Array<() => Promise<LyricsPayload | null>>) {
  if (!tasks.length) return null;

  return new Promise<LyricsPayload | null>((resolve) => {
    let pending = tasks.length;
    let resolved = false;

    tasks.forEach((task) => {
      task()
        .then((result) => {
          if (result && !resolved) {
            resolved = true;
            resolve(result);
          }
        })
        .catch(() => null)
        .finally(() => {
          pending -= 1;
          if (!pending && !resolved) {
            resolve(null);
          }
        });
    });
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const titleParam = searchParams.get('title') || '';
  const artistParam = searchParams.get('artist') || '';
  const durationParam = searchParams.get('duration');
  const cacheKey = [id || 'no-id', normalizeCompare(titleParam), normalizeCompare(artistParam), durationParam || '']
    .filter(Boolean)
    .join(':');

  if (!id && (!titleParam || !artistParam)) {
    return createResponse(null, 400);
  }

  if (cacheKey && lyricsCache.has(cacheKey)) {
    return createResponse(lyricsCache.get(cacheKey) || null);
  }

  try {
    let song: Record<string, unknown> | null = null;

    if (id && id.length === 11 && (!titleParam || !artistParam || !durationParam)) {
      song = await fetchSong(id).catch(() => null);
    }

    const title = firstString(
      titleParam,
      song?.name,
      song?.title,
      song?.videoDetails && (song.videoDetails as Record<string, unknown>).title
    );
    const artist = firstString(
      artistParam,
      getArtistName(song?.artist),
      getArtistName(song?.artists),
      song?.videoDetails && getArtistName((song.videoDetails as Record<string, unknown>).author)
    );
    const duration =
      parseDuration(durationParam) ??
      parseDuration(song?.duration) ??
      parseDuration(song?.duration_seconds) ??
      parseDuration(song?.lengthSeconds);

    const tasks: Array<() => Promise<LyricsPayload | null>> = [];

    if (id && id.length === 11) {
      tasks.push(() => fetchDirectYtMusicLyrics(id, song));
    }

    if (title && artist) {
      tasks.push(
        () => fetchFromLrcLib(title, artist, duration),
        () => fetchFromAlternativeYtMusic(title, artist),
        () => fetchFromLyricsOvh(title, artist)
      );
    }

    const payload = await findFirstTruthy(tasks);

    if (payload) {
      if (cacheKey) lyricsCache.set(cacheKey, payload);
      if (lyricsCache.size > 300) lyricsCache.clear();
      return createResponse(payload);
    }
  } catch (error: any) {
    console.error(`Lyrics error for id ${id}:`, error?.message || error);
  }

  if (cacheKey) lyricsCache.set(cacheKey, null);
  return createResponse(null);
}
