export interface LyricLine {
  text: string;
  startTime?: number;
}

export interface LyricsPayload {
  source: 'ytmusic' | 'lrclib' | 'lyricsovh' | 'kugou';
  providerLabel: string;
  text: string;
  lines: LyricLine[];
  synced: boolean;
}

export function splitPlainLyrics(input?: string | null): LyricLine[] {
  if (!input) return [];

  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => ({ text }));
}

export function parseLrcLyrics(input?: string | null): LyricLine[] {
  if (!input) return [];

  const lines: LyricLine[] = [];
  const rows = input.split(/\r?\n/);

  rows.forEach((row) => {
    const matches = [...row.matchAll(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g)];
    const text = row
      .replace(/\[[^\]]+\]/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!matches.length || !text) return;

    matches.forEach((match) => {
      const minutes = Number(match[1] || 0);
      const seconds = Number(match[2] || 0);
      const fraction = match[3] || '0';
      const milliseconds =
        fraction.length === 3 ? Number(fraction) : Number(fraction.padEnd(3, '0'));

      lines.push({
        text,
        startTime: minutes * 60 + seconds + milliseconds / 1000,
      });
    });
  });

  return lines.sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
}
