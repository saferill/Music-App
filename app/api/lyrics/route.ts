import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import YTMusic from 'ytmusic-api';
import { LyricsPayload, parseLrcLyrics, splitPlainLyrics } from '@/lib/lyrics';

const ytmusic = new YTMusic();
let initializePromise: Promise<unknown> | null = null;
const lyricsCache = new Map<string, LyricsPayload | null>();
const pendingLyricsRequests = new Map<string, Promise<LyricsPayload | null>>();
const KUGOU_SECRET = 'LnT6xpN3khm36zse0QzvmgTZ3waWdRSA';
const KUGOU_KRC_KEY = Buffer.from([
  0x40,
  0x47,
  0x61,
  0x77,
  0x5e,
  0x32,
  0x74,
  0x47,
  0x51,
  0x36,
  0x31,
  0x2d,
  0xce,
  0xd2,
  0x6e,
  0x69,
]);

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

function md5Hex(value: string) {
  return createHash('md5').update(value).digest('hex');
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
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

function formatLrcTimestamp(totalMs: number) {
  const safeMs = Math.max(0, Math.floor(totalMs));
  const minutes = Math.floor(safeMs / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const hundredths = Math.floor((safeMs % 1000) / 10);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
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
      source === 'ytmusic'
        ? 'YouTube Music'
        : source === 'lrclib'
          ? 'LRCLIB'
          : source === 'kugou'
            ? 'KuGou'
            : 'Lyrics.ovh',
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
      'User-Agent': 'Sonara/1.0',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(3200),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

async function fetchSong(id: string) {
  if (!id || id.length !== 11) return null;

  await withTimeout(ensureInitialized(), 3200, 'YouTube Music init');
  return (await withTimeout(
    ytmusic.getSong(id) as Promise<Record<string, unknown>>,
    3600,
    'YouTube Music song lookup'
  )) as Record<string, unknown>;
}

async function fetchDirectYtMusicLyrics(id: string, preloadedSong?: Record<string, unknown> | null) {
  if (!id || id.length !== 11) return null;

  const song = preloadedSong || (await fetchSong(id));
  const lyricsId = firstString(song?.lyricsId);

  if (!lyricsId) return null;

  const lyrics = await withTimeout(
    ytmusic.getLyrics(lyricsId),
    3600,
    'YouTube Music lyrics lookup'
  );
  return toLyricsPayload(lyrics, 'ytmusic');
}

async function fetchFromAlternativeYtMusic(title: string, artist: string) {
  await withTimeout(ensureInitialized(), 3200, 'YouTube Music init');

  const results = await withTimeout(
    ytmusic.searchSongs(`${artist} ${title}`).catch(() => []),
    3600,
    'YouTube Music search'
  );
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
            signal: AbortSignal.timeout(3000),
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

type KuGouSong = {
  id: number;
  hash: string;
  title: string;
  artists: string[];
  album: string;
  durationMs: number;
};

type KuGouLyricCandidate = {
  id: number;
  accesskey: string;
  durationMs: number;
  score: number;
};

function buildKuGouSignature(params: Record<string, string>, data = '') {
  const sortedKeys = Object.keys(params).sort();
  const value = [
    KUGOU_SECRET,
    ...sortedKeys.map((key) => `${key}=${params[key]}`),
    data,
    KUGOU_SECRET,
  ].join('');

  return md5Hex(value);
}

function decodeKuGouKrc(content: Buffer) {
  if (content.length <= 4) return '';

  const encrypted = content.subarray(4);
  const decoded = Buffer.allocUnsafe(encrypted.length);

  for (let index = 0; index < encrypted.length; index += 1) {
    decoded[index] = encrypted[index] ^ KUGOU_KRC_KEY[index % KUGOU_KRC_KEY.length];
  }

  return inflateSync(decoded).toString('utf8');
}

function extractKrcPlainLyrics(krc: string) {
  return krc
    .split(/\r?\n/)
    .map((row) => {
      const match = row.trim().match(/^\[(\d+),(\d+)\](.*)$/);
      if (!match) return '';

      return match[3]
        .replace(/<\d+,\d+,\d+>/g, '')
        .replace(/\[[^\]]+\]/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    })
    .filter(Boolean)
    .join('\n')
    .trim();
}

function convertKrcToLrc(krc: string) {
  return krc
    .split(/\r?\n/)
    .map((row) => {
      const match = row.trim().match(/^\[(\d+),(\d+)\](.*)$/);
      if (!match) return '';

      const startTime = Number(match[1] || 0);
      const text = match[3]
        .replace(/<\d+,\d+,\d+>/g, '')
        .replace(/\[[^\]]+\]/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

      if (!text) return '';
      return `[${formatLrcTimestamp(startTime)}] ${text}`;
    })
    .filter(Boolean)
    .join('\n')
    .trim();
}

async function fetchKuGouJson(
  url: string,
  paramsIn: Record<string, string>,
  module: 'Lyric' | 'SearchSong',
  extraHeaders: Record<string, string> = {}
) {
  const mid = md5Hex(String(Date.now()));
  const headers = {
    'User-Agent': `Android14-1070-11070-201-0-${module}-wifi`,
    Connection: 'Keep-Alive',
    'KG-Rec': '1',
    'KG-RC': '1',
    'KG-CLIENTTIMEMS': String(Date.now()),
    mid,
    ...extraHeaders,
  };

  const params: Record<string, string> =
    module === 'Lyric'
      ? {
          appid: '3116',
          clientver: '11070',
          ...paramsIn,
        }
      : {
          userid: '0',
          appid: '3116',
          token: '',
          clienttime: String(Math.floor(Date.now() / 1000)),
          iscorrection: '1',
          uuid: '-',
          mid,
          dfid: '-',
          clientver: '11070',
          platform: 'AndroidFilter',
          ...paramsIn,
        };

  params.signature = buildKuGouSignature(params);

  const requestUrl = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    requestUrl.searchParams.set(key, value);
  });

  const response = await fetch(requestUrl, {
    headers,
    signal: AbortSignal.timeout(3200),
  });

  if (!response.ok) {
    throw new Error(`KuGou request failed: ${response.status}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const errorCode = Number(payload.error_code ?? 0);

  if (![0, 200].includes(errorCode)) {
    throw new Error(`KuGou API error: ${errorCode}`);
  }

  return payload;
}

async function searchKuGouSongs(keyword: string) {
  const payload = await fetchKuGouJson(
    'http://complexsearch.kugou.com/v2/search/song',
    {
      sorttype: '0',
      keyword,
      pagesize: '20',
      page: '1',
    },
    'SearchSong',
    { 'x-router': 'complexsearch.kugou.com' }
  );

  const list = Array.isArray((payload.data as Record<string, unknown> | undefined)?.lists)
    ? (((payload.data as Record<string, unknown>).lists as unknown[]) ?? [])
    : [];

  return list
    .map((entry) => {
      const item = entry as Record<string, unknown>;
      const singers = Array.isArray(item.Singers) ? item.Singers : [];

      return {
        id: Number(item.ID ?? 0),
        hash: firstString(item.FileHash),
        title: firstString(item.SongName),
        artists: singers
          .map((singer) => firstString((singer as Record<string, unknown>).name))
          .filter(Boolean),
        album: firstString(item.AlbumName),
        durationMs: Number(item.Duration ?? 0) * 1000,
      } satisfies KuGouSong;
    })
    .filter((song) => song.id && song.hash && song.title);
}

async function getKuGouLyricCandidates(song: KuGouSong) {
  const keyword = `${song.artists.join('、') || ''} - ${song.title}`.trim();
  const payload = await fetchKuGouJson(
    'https://lyrics.kugou.com/v1/search',
    {
      album_audio_id: String(song.id),
      duration: String(song.durationMs || 0),
      hash: song.hash,
      keyword,
      lrctxt: '1',
      man: 'no',
    },
    'Lyric'
  );

  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];

  return candidates
    .map((entry) => {
      const item = entry as Record<string, unknown>;

      return {
        id: Number(item.id ?? 0),
        accesskey: firstString(item.accesskey),
        durationMs: Number(item.duration ?? 0),
        score: Number(item.score ?? 0),
      } satisfies KuGouLyricCandidate;
    })
    .filter((candidate) => candidate.id && candidate.accesskey)
    .sort((left, right) => right.score - left.score);
}

async function downloadKuGouLyrics(candidate: KuGouLyricCandidate) {
  const payload = await fetchKuGouJson(
    'http://lyrics.kugou.com/download',
    {
      accesskey: candidate.accesskey,
      charset: 'utf8',
      client: 'mobi',
      fmt: 'krc',
      id: String(candidate.id),
      ver: '1',
    },
    'Lyric'
  );

  const content = firstString(payload.content);
  if (!content) return null;

  const rawBytes = Buffer.from(content, 'base64');
  const contentType = Number(payload.contenttype ?? 0);

  if (contentType === 2) {
    return toLyricsPayload(
      {
        plainLyrics: rawBytes.toString('utf8'),
      },
      'kugou'
    );
  }

  const decrypted = decodeKuGouKrc(rawBytes);
  const syncedLyrics = convertKrcToLrc(decrypted);
  const plainLyrics = extractKrcPlainLyrics(decrypted);

  return toLyricsPayload(
    {
      syncedLyrics,
      plainLyrics,
    },
    'kugou'
  );
}

async function fetchFromKuGou(title: string, artist: string, duration?: number) {
  const searchQueries = unique([
    `${artist} ${title}`,
    `${artist} - ${title}`,
    `${title} ${artist}`,
    title,
  ]);

  const searchResults = await Promise.all(
    searchQueries.slice(0, 4).map((query) => searchKuGouSongs(query).catch(() => []))
  );

  const candidateSongs = searchResults
    .flat()
    .map((song) => ({
      song,
      score: scoreMatch(
        {
          title: song.title,
          artistName: song.artists.join(', '),
          duration: song.durationMs / 1000,
        },
        title,
        artist,
        duration
      ),
    }))
    .filter((entry) => entry.score >= 24)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);

  for (const candidateSong of candidateSongs) {
    try {
      const lyricCandidates = await getKuGouLyricCandidates(candidateSong.song);
      if (!lyricCandidates.length) continue;

      const payload = await downloadKuGouLyrics(lyricCandidates[0]);
      if (payload) return payload;
    } catch {
      continue;
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

async function resolveLyricsPayload(
  id: string | null,
  titleParam: string,
  artistParam: string,
  durationParam: string | null
) {
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
      () => fetchFromKuGou(title, artist, duration),
      () => fetchFromAlternativeYtMusic(title, artist),
      () => fetchFromLyricsOvh(title, artist)
    );
  }

  return findFirstTruthy(tasks);
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

  if (cacheKey && pendingLyricsRequests.has(cacheKey)) {
    return createResponse((await pendingLyricsRequests.get(cacheKey)) || null);
  }

  const requestPromise = resolveLyricsPayload(id, titleParam, artistParam, durationParam);
  if (cacheKey) {
    pendingLyricsRequests.set(cacheKey, requestPromise);
  }

  try {
    const payload = await requestPromise;
    if (payload) {
      if (cacheKey) lyricsCache.set(cacheKey, payload);
      if (lyricsCache.size > 300) lyricsCache.clear();
      return createResponse(payload);
    }
  } catch (error: any) {
    console.error(`Lyrics error for id ${id}:`, error?.message || error);
  } finally {
    if (cacheKey) pendingLyricsRequests.delete(cacheKey);
  }

  if (cacheKey) lyricsCache.set(cacheKey, null);
  return createResponse(null);
}
