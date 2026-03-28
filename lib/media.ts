export type NormalizedArtist = {
  name: string;
  artistId?: string;
};

export type NormalizedThumbnail = {
  url: string;
  width: number;
  height: number;
};

function readText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const joined = value
      .map((entry) => readText(entry))
      .filter(Boolean)
      .join(', ')
      .trim();

    return joined;
  }

  if (!value || typeof value !== 'object') {
    return '';
  }

  const record = value as Record<string, unknown>;

  if (Array.isArray(record.runs)) {
    const runsText = record.runs
      .map((entry) => readText(entry))
      .join('')
      .trim();

    if (runsText) return runsText;
  }

  return [
    record.text,
    record.name,
    record.title,
    record.artistName,
    record.author,
    record.label,
  ]
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .find(Boolean) || '';
}

export function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = readText(value);
    if (text) return text;
  }

  return '';
}

function uniqueArtists(artists: NormalizedArtist[]) {
  const seen = new Set<string>();

  return artists.filter((artist) => {
    const key = artist.name.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeArtists(input: unknown): NormalizedArtist[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    return uniqueArtists(input.flatMap((entry) => normalizeArtists(entry)));
  }

  if (typeof input === 'string') {
    const name = input.trim();
    return name ? [{ name }] : [];
  }

  if (typeof input !== 'object') {
    return [];
  }

  const record = input as Record<string, unknown>;
  const artists = [
    ...normalizeArtists(record.artist),
    ...normalizeArtists(record.artists),
  ];

  const directName = firstText(record.name, record.artistName, record.author, record.title);
  if (directName) {
    artists.unshift({
      name: directName,
      artistId: firstText(record.artistId, record.browseId, record.channelId, record.id) || undefined,
    });
  }

  return uniqueArtists(artists);
}

export function normalizeThumbnails(input: unknown): NormalizedThumbnail[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input.flatMap((entry) => normalizeThumbnails(entry));
  }

  if (typeof input !== 'object') {
    return [];
  }

  const record = input as Record<string, unknown>;
  if (Array.isArray(record.thumbnails)) {
    return normalizeThumbnails(record.thumbnails);
  }

  const url = firstText(record.url);
  if (!url) return [];

  return [
    {
      url,
      width: typeof record.width === 'number' ? record.width : 0,
      height: typeof record.height === 'number' ? record.height : 0,
    },
  ];
}

export function parseDurationSeconds(value: unknown): number | undefined {
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

export function normalizeTrack<T extends Record<string, any>>(rawTrack: T) {
  const title =
    firstText(
      rawTrack?.name,
      rawTrack?.title,
      rawTrack?.trackName,
      rawTrack?.videoDetails?.title,
      rawTrack?.song
    ) || 'Lagu tanpa judul';

  const artists = uniqueArtists([
    ...normalizeArtists(rawTrack?.artist),
    ...normalizeArtists(rawTrack?.artists),
    ...normalizeArtists(rawTrack?.author),
    ...normalizeArtists(rawTrack?.videoDetails?.author),
  ]);

  const thumbnails = normalizeThumbnails(rawTrack?.thumbnails || rawTrack?.thumbnail);
  const duration =
    parseDurationSeconds(rawTrack?.duration) ??
    parseDurationSeconds(rawTrack?.duration_seconds) ??
    parseDurationSeconds(rawTrack?.lengthSeconds) ??
    parseDurationSeconds(rawTrack?.videoDetails?.lengthSeconds);

  return {
    ...rawTrack,
    videoId: firstText(rawTrack?.videoId, rawTrack?.id, rawTrack?.videoDetails?.videoId),
    name: title,
    title,
    artist:
      artists.length > 1
        ? artists
        : artists[0] || {
            name: 'Unknown Artist',
          },
    artists,
    thumbnails,
    duration,
    isExplicit: Boolean(rawTrack?.isExplicit ?? rawTrack?.explicit),
  };
}

export function normalizeTrackList(input: unknown) {
  if (!Array.isArray(input)) return [];

  return input
    .filter((entry): entry is Record<string, any> => Boolean(entry) && typeof entry === 'object')
    .map((track) => normalizeTrack(track));
}

export function normalizeArtistEntity<T extends Record<string, any>>(rawArtist: T) {
  const name = firstText(rawArtist?.name, rawArtist?.title, rawArtist?.author) || 'Artist';

  return {
    ...rawArtist,
    name,
    artistId: firstText(rawArtist?.artistId, rawArtist?.browseId, rawArtist?.channelId, rawArtist?.id),
    thumbnails: normalizeThumbnails(rawArtist?.thumbnails || rawArtist?.thumbnail),
  };
}

export function normalizeNamedEntity<T extends Record<string, any>>(rawEntity: T, fallbackName = 'Item') {
  const name =
    firstText(
      rawEntity?.name,
      rawEntity?.title,
      rawEntity?.playlistName,
      rawEntity?.albumName,
      rawEntity?.videoDetails?.title
    ) || fallbackName;

  return {
    ...rawEntity,
    name,
    title: name,
    thumbnails: normalizeThumbnails(rawEntity?.thumbnails || rawEntity?.thumbnail),
  };
}
