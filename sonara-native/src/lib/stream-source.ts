// Re-written for React Native (Expo) compatibility
// Removes Next.js server-side features (revalidate, etc.)

type PipedInstanceRecord = Record<string, unknown>;
type PipedStreamsPayload = Record<string, unknown>;
type PipedAudioStream = Record<string, unknown>;

const INSTANCE_LIST_URL = 'https://piped-instances.kavin.rocks/';
const DEFAULT_PIPED_APIS = ['https://pipedapi.kavin.rocks'];
const INSTANCE_CACHE_TTL = 30 * 60 * 1000;

let instanceCache: {
  fetchedAt: number;
  urls: string[];
} = {
  fetchedAt: 0,
  urls: [],
};

export type StreamResolution = {
  api: string;
  provider: 'piped';
  url: string;
  mimeType: string | null;
  bitrate: number | null;
  codec: string | null;
  duration: number | null;
  relatedTracks: any[];
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
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

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

function cleanApiUrl(url: string) {
  return url.replace(/\/+$/, '');
}

async function fetchJson<T>(url: string, timeoutMs: number) {
  const response = await withTimeout(
    fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'Sonara-Native/1.0',
      },
    }),
    timeoutMs,
    url
  );

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function listPipedApis() {
  const now = Date.now();
  if (instanceCache.urls.length && now - instanceCache.fetchedAt < INSTANCE_CACHE_TTL) {
    return instanceCache.urls;
  }

  try {
    const payload = await fetchJson<any>(INSTANCE_LIST_URL, 3000);
    const instanceUrls = Array.isArray(payload)
      ? payload
          .filter((entry): entry is PipedInstanceRecord => Boolean(entry) && typeof entry === 'object')
          .map((entry) => cleanApiUrl(firstString(entry.api_url, entry.apiUrl, entry.url)))
          .filter(Boolean)
      : [];

    const urls = [...new Set([...DEFAULT_PIPED_APIS, ...instanceUrls])];
    instanceCache = { fetchedAt: now, urls };
    return urls;
  } catch {
    return DEFAULT_PIPED_APIS;
  }
}

function scoreAudioStream(stream: PipedAudioStream) {
  const bitrate = toNumber(stream.bitrate) || 0;
  const mimeType = firstString(stream.mimeType, stream.contentType).toLowerCase();
  let score = bitrate;
  if (mimeType.includes('audio/mp4')) score += 3000;
  if (mimeType.includes('audio/webm')) score += 1200;
  return score;
}

function pickBestAudioStream(streams: unknown[]) {
  return streams
    .filter((stream): stream is PipedAudioStream => Boolean(stream) && typeof stream === 'object')
    .filter((stream) => {
      const url = firstString(stream.url);
      const videoOnly = Boolean(stream.videoOnly);
      return Boolean(url) && !videoOnly;
    })
    .sort((a, b) => scoreAudioStream(b) - scoreAudioStream(a))[0] || null;
}

export async function resolveStreamFromHarmonySources(videoId: string) {
  const apis = await listPipedApis();
  for (let index = 0; index < apis.length; index += 3) {
    const batch = apis.slice(index, index + 3);
    const result = await Promise.any(
      batch.map((api) => 
        fetchJson<PipedStreamsPayload>(`${api}/streams/${encodeURIComponent(videoId)}`, 3500)
          .then(payload => {
            const bestStream = pickBestAudioStream(Array.isArray(payload.audioStreams) ? payload.audioStreams : []);
            if (!bestStream) throw new Error('No stream');
            return {
              api,
              provider: 'piped' as const,
              url: firstString(bestStream.url),
              mimeType: firstString(bestStream.mimeType, bestStream.contentType) || null,
              bitrate: toNumber(bestStream.bitrate),
              codec: firstString(bestStream.codec, bestStream.audioCodec) || null,
              duration: toNumber(payload.duration),
              relatedTracks: [], // Simplified for now
            };
          })
      )
    ).catch(() => null);

    if (result) return result;
  }
  return null;
}
