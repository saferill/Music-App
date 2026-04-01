'use client';

import { useEffect, useMemo, useState } from 'react';
import { Disc3, Loader2, Plus, Search, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { readTasteProfile, saveTasteProfile } from '@/lib/taste-profile';
import { getApiBaseUrl } from '@/lib/config';

const featuredArtists = [
  'Hindia',
  'Nadin Amizah',
  'Tulus',
  'Pamungkas',
  'Bernadya',
  'Juicy Luicy',
  'Taylor Swift',
  'The Weeknd',
  'Arctic Monkeys',
  'Kunto Aji',
  'Mahalini',
  'Ariana Grande',
];

const featuredGenres = [
  'Pop',
  'Indie',
  'Chill',
  'Rock',
  'R&B',
  'Jazz',
  'Acoustic',
  'Lo-fi',
  'EDM',
  'K-Pop',
  'Soundtrack',
  'Dangdut',
  'Alternative',
  'Metal',
  'Hip-Hop',
  'Folk',
  'Soul',
  'Ambient',
];

type ArtistSearchResult = {
  artistId?: string;
  name?: string;
};

function normalizeValue(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function hasValue(list: string[], value: string) {
  const normalized = normalizeValue(value).toLowerCase();
  return list.some((item) => normalizeValue(item).toLowerCase() === normalized);
}

function addValue(list: string[], value: string) {
  const normalized = normalizeValue(value);
  if (!normalized || hasValue(list, normalized)) return list;
  return [...list, normalized];
}

function toggleValue(list: string[], value: string) {
  const normalized = normalizeValue(value);
  if (!normalized) return list;

  if (hasValue(list, normalized)) {
    return list.filter((item) => normalizeValue(item).toLowerCase() !== normalized.toLowerCase());
  }

  return [...list, normalized];
}

export function OnboardingGate() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [artistQuery, setArtistQuery] = useState('');
  const [artistResults, setArtistResults] = useState<ArtistSearchResult[]>([]);
  const [artistLoading, setArtistLoading] = useState(false);
  const [genreQuery, setGenreQuery] = useState('');

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const profile = readTasteProfile();
      setOpen(!profile);
      setReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const query = normalizeValue(artistQuery);
    if (query.length < 2) {
      setArtistResults([]);
      setArtistLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setArtistLoading(true);

      try {
        const response = await fetch(`${getApiBaseUrl()}/api/search?q=${encodeURIComponent(query)}&type=artist`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (controller.signal.aborted) return;

        const artists = Array.isArray(data)
          ? data
              .filter((item): item is ArtistSearchResult => !!item && typeof item?.name === 'string')
              .map((artist) => ({ artistId: artist.artistId, name: normalizeValue(artist.name || '') }))
              .filter((artist) => artist.name)
          : [];

        setArtistResults(artists.slice(0, 12));
      } catch {
        if (!controller.signal.aborted) {
          setArtistResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setArtistLoading(false);
        }
      }
    }, 320);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [artistQuery]);

  const canContinue = selectedArtists.length >= 2 && selectedGenres.length >= 2;
  const normalizedGenreQuery = normalizeValue(genreQuery);
  const suggestedGenres = useMemo(() => {
    if (!normalizedGenreQuery) {
      return featuredGenres;
    }

    return featuredGenres.filter((genre) =>
      genre.toLowerCase().includes(normalizedGenreQuery.toLowerCase())
    );
  }, [normalizedGenreQuery]);

  const handleContinue = () => {
    if (!canContinue) return;

    saveTasteProfile({
      favoriteArtists: selectedArtists,
      favoriteGenres: selectedGenres,
      createdAt: Date.now(),
    });
    setOpen(false);
  };

  const handleArtistAdd = (value: string) => {
    setSelectedArtists((current) => addValue(current, value));
    setArtistQuery('');
    setArtistResults([]);
  };

  const handleGenreAdd = (value: string) => {
    setSelectedGenres((current) => addValue(current, value));
    setGenreQuery('');
  };

  if (!ready) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] overflow-y-auto bg-[#050409]/92 px-4 py-6 backdrop-blur-xl"
        >
          <div className="mx-auto flex min-h-full w-full max-w-3xl items-center">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20 }}
              className="glass-panel-strong w-full rounded-[36px] p-5 sm:p-8"
            >
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#FF7A59]/25 bg-[#FF7A59]/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[#FFD4C6]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Setup Awal
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-white/5 p-2 text-white/40 transition hover:bg-white/10 hover:text-white"
                  title="Lewati setup"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <h1 className="mt-4 text-3xl font-semibold text-white sm:text-5xl">
                Biar Sonara terasa kayak punyamu sendiri.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
                Cari artis favoritmu dari katalog yang jauh lebih luas, lalu tambahkan genre apa pun tanpa batas.
                Setelah ini beranda akan terasa lebih personal, dan layar setup ini tidak muncul lagi kecuali data
                browser kamu dihapus.
              </p>

              <section className="mt-8">
                <div className="flex items-center gap-3">
                  <Disc3 className="h-5 w-5 text-[#FF7A59]" />
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.28em] text-white/35">Pilih Artis</div>
                    <h2 className="mt-1 text-xl font-semibold text-white">Cari artis apa pun, minimal 2 pilihan</h2>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
                    <input
                      value={artistQuery}
                      onChange={(event) => setArtistQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleArtistAdd(artistQuery);
                        }
                      }}
                      placeholder="Cari artis favorit, misalnya Billie Eilish"
                      className="w-full rounded-[22px] border border-white/10 bg-white/6 py-3 pl-12 pr-4 text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-[#FF7A59]/40"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleArtistAdd(artistQuery)}
                    disabled={!normalizeValue(artistQuery)}
                    className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-[#FF7A59] px-4 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah
                  </button>
                </div>

                {selectedArtists.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedArtists.map((artist) => (
                      <button
                        key={artist}
                        type="button"
                        onClick={() => setSelectedArtists((current) => toggleValue(current, artist))}
                        className="inline-flex items-center gap-2 rounded-full border border-transparent bg-[#FF7A59] px-4 py-2 text-sm font-medium text-black"
                      >
                        <span>{artist}</span>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-4 rounded-[24px] border border-white/8 bg-white/[0.03] p-3">
                  <div className="text-[11px] uppercase tracking-[0.28em] text-white/35">
                    {normalizeValue(artistQuery) ? 'Hasil Pencarian' : 'Pilihan Cepat'}
                  </div>

                  <div className="mt-3 flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-1">
                    {artistLoading ? (
                      <div className="flex w-full items-center gap-2 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/65">
                        <Loader2 className="h-4 w-4 animate-spin text-[#FF7A59]" />
                        Mencari artis...
                      </div>
                    ) : normalizeValue(artistQuery) && artistResults.length > 0 ? (
                      artistResults.map((artist) => {
                        const artistName = artist.name || '';
                        const active = hasValue(selectedArtists, artistName);

                        return (
                          <button
                            key={artist.artistId || artistName}
                            type="button"
                            onClick={() => setSelectedArtists((current) => toggleValue(current, artistName))}
                            className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                              active
                                ? 'border-transparent bg-[#FF7A59] text-black'
                                : 'border-white/10 bg-white/5 text-white/78 hover:bg-white/10'
                            }`}
                          >
                            {artistName}
                          </button>
                        );
                      })
                    ) : normalizeValue(artistQuery) ? (
                      <button
                        type="button"
                        onClick={() => handleArtistAdd(artistQuery)}
                        className="rounded-full border border-dashed border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/78 transition hover:bg-white/10"
                      >
                        Tambah &quot;{normalizeValue(artistQuery)}&quot; sebagai artis
                      </button>
                    ) : (
                      featuredArtists.map((artist) => {
                        const active = hasValue(selectedArtists, artist);

                        return (
                          <button
                            key={artist}
                            type="button"
                            onClick={() => setSelectedArtists((current) => toggleValue(current, artist))}
                            className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                              active
                                ? 'border-transparent bg-[#FF7A59] text-black'
                                : 'border-white/10 bg-white/5 text-white/78 hover:bg-white/10'
                            }`}
                          >
                            {artist}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>

              <section className="mt-8">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-[#F6C567]" />
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.28em] text-white/35">Pilih Genre</div>
                    <h2 className="mt-1 text-xl font-semibold text-white">Genre bebas, tidak terbatas daftar</h2>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
                    <input
                      value={genreQuery}
                      onChange={(event) => setGenreQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleGenreAdd(genreQuery);
                        }
                      }}
                      placeholder="Tambah genre apa pun, misalnya Synthwave"
                      className="w-full rounded-[22px] border border-white/10 bg-white/6 py-3 pl-12 pr-4 text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-[#F6C567]/40"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGenreAdd(genreQuery)}
                    disabled={!normalizeValue(genreQuery)}
                    className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-[#F6C567] px-4 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah
                  </button>
                </div>

                {selectedGenres.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedGenres.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => setSelectedGenres((current) => toggleValue(current, genre))}
                        className="inline-flex items-center gap-2 rounded-full border border-transparent bg-[#F6C567] px-4 py-2 text-sm font-medium text-black"
                      >
                        <span>{genre}</span>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-4 rounded-[24px] border border-white/8 bg-white/[0.03] p-3">
                  <div className="text-[11px] uppercase tracking-[0.28em] text-white/35">
                    {normalizedGenreQuery ? 'Genre Terkait' : 'Mulai dari Sini'}
                  </div>

                  <div className="mt-3 flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-1">
                    {suggestedGenres.length > 0 ? (
                      suggestedGenres.map((genre) => {
                        const active = hasValue(selectedGenres, genre);

                        return (
                          <button
                            key={genre}
                            type="button"
                            onClick={() => setSelectedGenres((current) => toggleValue(current, genre))}
                            className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                              active
                                ? 'border-transparent bg-[#F6C567] text-black'
                                : 'border-white/10 bg-white/5 text-white/78 hover:bg-white/10'
                            }`}
                          >
                            {genre}
                          </button>
                        );
                      })
                    ) : normalizedGenreQuery ? (
                      <button
                        type="button"
                        onClick={() => handleGenreAdd(genreQuery)}
                        className="rounded-full border border-dashed border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/78 transition hover:bg-white/10"
                      >
                        Tambah &quot;{normalizedGenreQuery}&quot; sebagai genre
                      </button>
                    ) : null}
                  </div>
                </div>
              </section>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-white/50">
                  Terpilih: {selectedArtists.length} artis dan {selectedGenres.length} genre.
                </p>
                <button
                  onClick={handleContinue}
                  disabled={!canContinue}
                  className="rounded-full bg-[var(--accent)] px-8 py-4 text-lg font-bold text-black transition hover:scale-[1.02] shadow-[var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Simpan preferensi
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
