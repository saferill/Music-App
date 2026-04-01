import { normalizeTrackList } from '@/lib/media';

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
  relatedTracks: ReturnType<typeof normalizeTrackList>;
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
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }

  return null;
}

function cleanApiUrl(url: string) {
  return url.replace(/\/+$/, '');
}

function readInstanceApiUrl(instance: PipedInstanceRecord) {
  return firstString(
    instance.api_url,
    instance.apiUrl,
    instance.api,
    instance.url
  );
}

async function fetchJson<T>(url: string, timeoutMs: number) {
  const response = await withTimeout(
    fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'Sonara/1.1',
      },
      next: { revalidate: 300 },
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
    const payload = await fetchJson<unknown>(INSTANCE_LIST_URL, 3000);
    const instanceUrls = Array.isArray(payload)
      ? payload
          .filter((entry): entry is PipedInstanceRecord => Boolean(entry) && typeof entry === 'object')
          .map((entry) => cleanApiUrl(readInstanceApiUrl(entry)))
          .filter(Boolean)
      : [];

    const urls = [...new Set([...DEFAULT_PIPED_APIS, ...instanceUrls])];
    instanceCache = {
      fetchedAt: now,
      urls,
    };

    return urls;
  } catch {
    return DEFAULT_PIPED_APIS;
  }
}

function scoreAudioStream(stream: PipedAudioStream) {
  const bitrate = toNumber(stream.bitrate) || 0;
  const codec = firstString(stream.codec, stream.audioCodec).toLowerCase();
  const format = firstString(stream.format, stream.container).toLowerCase();
  const mimeType = firstString(stream.mimeType, stream.contentType).toLowerCase();

  let score = bitrate;

  if (mimeType.includes('audio/mp4') || format.includes('m4a')) score += 3000;
  if (codec.includes('mp4a') || codec.includes('aac')) score += 2000;
  if (mimeType.includes('audio/webm')) score += 1200;
  if (codec.includes('opus')) score += 900;

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

function extractVideoId(url: string) {
  if (!url) return '';

  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch?.[1]) return watchMatch[1];

  const shortMatch = url.match(/youtu\.be\/([^?&/]+)/);
  if (shortMatch?.[1]) return shortMatch[1];

  return '';
}

function normalizeRelatedTracks(payload: PipedStreamsPayload) {
  const relatedStreams = Array.isArray(payload.relatedStreams) ? payload.relatedStreams : [];

  return normalizeTrackList(
    relatedStreams.map((entry) => {
      if (!entry || typeof entry !== 'object') return null;

      const stream = entry as PipedAudioStream;
      const videoId = extractVideoId(firstString(stream.url));
      const thumbnail = firstString(stream.thumbnail, stream.thumbnailUrl);
      const uploader = firstString(stream.uploaderName, stream.uploader, stream.author);

      return {
        ...stream,
        videoId,
        name: firstString(stream.title, stream.name),
        title: firstString(stream.title, stream.name),
        artist: uploader ? { name: uploader } : undefined,
        author: uploader,
        duration: toNumber(stream.duration) ?? undefined,
        thumbnails: thumbnail
          ? [
              {
                url: thumbnail,
                width: 0,
                height: 0,
              },
            ]
          : [],
      };
    })
  ).filter((track) => track.videoId);
}

async function resolveStreamWithApi(api: string, videoId: string): Promise<StreamResolution | null> {
  const payload = await fetchJson<PipedStreamsPayload>(
    `${cleanApiUrl(api)}/streams/${encodeURIComponent(videoId)}`,
    3500
  );
  const audioStreams = Array.isArray(payload.audioStreams) ? payload.audioStreams : [];
  const bestStream = pickBestAudioStream(audioStreams);

  if (!bestStream) {
    return null;
  }

  return {
    api: cleanApiUrl(api),
    provider: 'piped',
    url: firstString(bestStream.url),
    mimeType: firstString(bestStream.mimeType, bestStream.contentType) || null,
    bitrate: toNumber(bestStream.bitrate),
    codec: firstString(bestStream.codec, bestStream.audioCodec) || null,
    duration: toNumber(payload.duration),
    relatedTracks: normalizeRelatedTracks(payload),
  };
}

async function firstSuccessful<T>(tasks: Array<() => Promise<T | null>>) {
  if (!tasks.length) return null;

  return new Promise<T | null>((resolve) => {
    let pending = tasks.length;

    tasks.forEach((task) => {
      void task()
        .then((result) => {
          if (result) {
            resolve(result);
            return;
          }

          pending -= 1;
          if (pending === 0) resolve(null);
        })
        .catch(() => {
          pending -= 1;
          if (pending === 0) resolve(null);
        });
    });
  });
}

export async function resolveStreamFromHarmonySources(videoId: string) {
  const apis = await listPipedApis();

  for (let index = 0; index < apis.length; index += 3) {
    const batch = apis.slice(index, index + 3);
    const result = await firstSuccessful(
      batch.map((api) => () => resolveStreamWithApi(api, videoId))
    );

    if (result) return result;
  }

  return null;
}
