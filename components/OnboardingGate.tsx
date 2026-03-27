'use client';

import { useEffect, useState } from 'react';
import { Disc3, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { readTasteProfile, saveTasteProfile } from '@/lib/taste-profile';

const artistOptions = [
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

const genreOptions = [
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
];

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function OnboardingGate() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const profile = readTasteProfile();
      setOpen(!profile);
      setReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const canContinue = selectedArtists.length >= 2 && selectedGenres.length >= 2;

  const handleContinue = () => {
    if (!canContinue) return;

    saveTasteProfile({
      favoriteArtists: selectedArtists,
      favoriteGenres: selectedGenres,
      createdAt: Date.now(),
    });
    setOpen(false);
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
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FF7A59]/25 bg-[#FF7A59]/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[#FFD4C6]">
                <Sparkles className="h-3.5 w-3.5" />
                Setup Awal
              </div>

              <h1 className="mt-4 text-3xl font-semibold text-white sm:text-5xl">
                Biar Sonara terasa kayak punyamu sendiri.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
                Pilih artis dan genre favoritmu dulu. Setelah ini beranda akan lebih personal, dan layar setup ini
                tidak muncul lagi kecuali data browser kamu dihapus.
              </p>

              <section className="mt-8">
                <div className="flex items-center gap-3">
                  <Disc3 className="h-5 w-5 text-[#FF7A59]" />
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.28em] text-white/35">Pilih Artis</div>
                    <h2 className="mt-1 text-xl font-semibold text-white">Minimal 2 artis favorit</h2>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {artistOptions.map((artist) => {
                    const active = selectedArtists.includes(artist);
                    return (
                      <button
                        key={artist}
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
                  })}
                </div>
              </section>

              <section className="mt-8">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-[#F6C567]" />
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.28em] text-white/35">Pilih Genre</div>
                    <h2 className="mt-1 text-xl font-semibold text-white">Minimal 2 genre favorit</h2>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {genreOptions.map((genre) => {
                    const active = selectedGenres.includes(genre);
                    return (
                      <button
                        key={genre}
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
                  })}
                </div>
              </section>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-white/50">
                  Terpilih: {selectedArtists.length} artis dan {selectedGenres.length} genre.
                </p>
                <button
                  onClick={handleContinue}
                  disabled={!canContinue}
                  className="rounded-full bg-[#FF7A59] px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-45"
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
