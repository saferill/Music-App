'use client';

import { useEffect, useState } from 'react';
import { Track, usePlayerStore } from '@/lib/store';
import { History, MoreVertical, Play, Search, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { CommunityPlaylistCard } from '@/components/CommunityPlaylistCard';
import { HomeSkeleton } from '@/components/HomeSkeleton';
import { HorizontalScroll } from '@/components/HorizontalScroll';
import { getHighResImage } from '@/lib/utils';
import { readTasteProfile, TasteProfile } from '@/lib/taste-profile';

const pills = ['Chill', 'Focus', 'Commute', 'Gaming', 'Energize', 'Party', 'Feel good', 'Romance', 'Workout', 'Sleep', 'Sad', 'Happy', 'Nostalgia', 'Acoustic', 'Pop', 'Rock'];

const getArtistName = (track?: Track) =>
  !track ? 'Unknown Artist' : Array.isArray(track.artist) ? track.artist.map((artist) => artist.name).join(', ') : track.artist?.name || 'Unknown Artist';

const getTrackTitle = (track?: Track) => track?.name?.trim() || 'Lagu tanpa judul';

const formatPlayedAt = (timestamp: number) =>
  new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(timestamp);

const buildHomeQueries = (profile: TasteProfile | null) => {
  const artistSeeds = profile?.favoriteArtists.slice(0, 2) || [];
  const genreSeeds = profile?.favoriteGenres.slice(0, 3) || [];
  const artistQuery = artistSeeds.join(' ');
  const genreQuery = genreSeeds.join(' ');
  const primaryGenre = genreSeeds[0] || 'Pop';
  const secondaryGenre = genreSeeds[1] || 'Indie';
  const primaryArtist = artistSeeds[0] || 'Hindia';
  const secondaryArtist = artistSeeds[1] || 'Nadin Amizah';

  return [
    { key: 'speedDial', q: artistQuery ? `${artistQuery} top songs` : 'top hits 2024', type: 'song' },
    { key: 'quickPicks', q: genreQuery ? `${genreQuery} songs` : 'viral hits indonesia', type: 'song' },
    { key: 'community', q: `${primaryGenre} playlists`, type: 'playlist' },
    { key: 'artists', q: `${primaryArtist} ${secondaryArtist} artist`, type: 'artist' },
    { key: 'cat0', title: `${primaryGenre} picks`, q: `${primaryGenre} best songs`, type: 'song' },
    { key: 'cat1', title: `${secondaryGenre} vibes`, q: `${secondaryGenre} playlist songs`, type: 'song' },
    { key: 'cat2', title: `${primaryArtist} essentials`, q: `${primaryArtist} hits`, type: 'song' },
    { key: 'cat3', title: `${secondaryArtist} favorites`, q: `${secondaryArtist} best songs`, type: 'song' },
    { key: 'cat4', title: 'Mix for you', q: `${primaryArtist} ${primaryGenre} mix songs`, type: 'song' },
  ];
};

export default function Home() {
  const [speedDialTracks, setSpeedDialTracks] = useState<Track[]>([]);
  const [quickPicksTracks, setQuickPicksTracks] = useState<Track[]>([]);
  const [communityPlaylists, setCommunityPlaylists] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ title: string; tracks: Track[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [filterData, setFilterData] = useState<{ title: string; tracks: Track[] }[]>([]);
  const [loadingFilter, setLoadingFilter] = useState(false);
  const [tasteProfile, setTasteProfile] = useState<TasteProfile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const history = usePlayerStore((state) => state.history);
  const latestHistoryTrackId = history[0]?.track?.videoId;

  useEffect(() => {
    const syncProfile = () => {
      setTasteProfile(readTasteProfile());
      setProfileReady(true);
    };

    syncProfile();
    window.addEventListener('melolo:taste-profile-updated', syncProfile);
    return () => window.removeEventListener('melolo:taste-profile-updated', syncProfile);
  }, []);

  useEffect(() => {
    if (!activeFilter) return;

    const fetchFilterData = async () => {
      setLoadingFilter(true);
      try {
        const queries = [
          { title: `Feeling ${activeFilter.toLowerCase()}`, q: `${activeFilter} mood songs` },
          { title: `${activeFilter} hits`, q: `top ${activeFilter} songs` },
          { title: `More like ${activeFilter}`, q: `best ${activeFilter} tracks` },
        ];

        const results = [];
        for (const { title, q } of queries) {
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=song`);
          const data = await res.json();
          results.push({ title, tracks: data.slice(0, 10) });
        }

        setFilterData(results);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingFilter(false);
      }
    };

    fetchFilterData();
  }, [activeFilter]);

  useEffect(() => {
    if (!profileReady) return;

    const fetchHomeData = async () => {
      setLoading(true);
      try {
        const queries: { key: string; title?: string; q: string; type?: string }[] = buildHomeQueries(tasteProfile);

        const results = [];
        for (let i = 0; i < queries.length; i += 3) {
          const chunk = queries.slice(i, i + 3);
          const chunkResults = await Promise.all(
            chunk.map(async ({ key, title, q, type }) => {
              try {
                const url = type ? `/api/search?q=${encodeURIComponent(q)}&type=${type}` : `/api/search?q=${encodeURIComponent(q)}`;
                const res = await fetch(url);
                if (!res.ok) return { key, title, data: [] };
                const data = await res.json();
                return { key, title, data };
              } catch {
                return { key, title, data: [] };
              }
            })
          );
          results.push(...chunkResults);
        }

        const nextCategories: { title: string; tracks: Track[] }[] = [];

        results.forEach(({ key, title, data }) => {
          if (!data?.length) return;
          if (key === 'speedDial') setSpeedDialTracks(data.slice(0, 45));
          else if (key === 'quickPicks') setQuickPicksTracks(data.slice(0, 20));
          else if (key === 'community') setCommunityPlaylists(data.slice(0, 6));
          else if (key === 'artists') setArtists(data.slice(0, 6));
          else if (key.startsWith('cat') && title) nextCategories.push({ title, tracks: data.slice(0, 10) });
        });

        setCategories(nextCategories);
      } catch (error) {
        console.error('Failed to fetch home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
    const handleFocus = () => fetchHomeData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [latestHistoryTrackId, profileReady, tasteProfile]);

  const quickLaunch = speedDialTracks.slice(0, 6);
  const recommendedTracks = quickPicksTracks.slice(0, 6);
  const recentHistory = history.slice(0, 4);
  const topArtists = artists.slice(0, 6);

  if (!profileReady || loading || (activeFilter && loadingFilter)) {
    return (
      <main className="min-h-screen pb-32 md:pb-16">
        <div className="page-shell pt-4 md:pt-6">
          <HomeSkeleton />
        </div>
      </main>
    );
  }

  if (activeFilter) {
    return (
      <main className="min-h-screen pb-32 md:pb-16">
        <div className="page-shell space-y-6 pt-4 md:space-y-8 md:pt-6">
          <section className="glass-panel-strong rounded-[28px] p-5 md:rounded-[32px] md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FF7A59]/30 bg-[#FF7A59]/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-[#FFD4C6]">
              <Sparkles className="h-3.5 w-3.5" />
              Mood Mix
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl md:text-5xl">Suasana {activeFilter} sedang aktif.</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/70">
              Saya tampilkan rak lagu yang lebih ringkas dan fokus ke musik, tanpa banner besar di bagian atas.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => setActiveFilter(null)}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Kembali ke beranda
              </button>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-full bg-[#FF7A59] px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
              >
                <Search className="h-4 w-4" />
                Cari lagu lain
              </Link>
            </div>
          </section>

          <section className="glass-panel rounded-[24px] p-4 md:rounded-[28px] md:p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">Ganti Mood</div>
                <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">Pilih kategori lain</h2>
              </div>
              <Link href="/search" className="hidden text-sm font-medium text-[#FFD4C6] md:inline">
                Buka pencarian
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {pills.map((pill) => (
                <button
                  key={pill}
                  onClick={() => setActiveFilter(activeFilter === pill ? null : pill)}
                  className={`whitespace-nowrap rounded-full border px-5 py-2.5 text-sm font-medium transition-colors ${
                    activeFilter === pill
                      ? 'border-transparent bg-[#FF7A59] text-black'
                      : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {pill}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-10">
            {filterData.map((cat, index) => (
              <HorizontalScroll key={`${cat.title}-${index}`} title={cat.title} tracks={cat.tracks} />
            ))}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-32 md:pb-16">
      <div className="page-shell space-y-6 pt-4 md:space-y-8 md:pt-6">
        <section className="glass-panel-strong rounded-[28px] p-4 md:rounded-[32px] md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FF7A59]/30 bg-[#FF7A59]/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-[#FFD4C6]">
                <Sparkles className="h-3.5 w-3.5" />
                Sonara Picks
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl md:text-5xl">Beranda</h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-white/70">
                Temukan lagu, playlist, dan artis favoritmu dengan tampilan yang lebih bersih, tanpa banner besar di bagian atas.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/history"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <History className="h-4 w-4" />
                Riwayat
              </Link>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-full bg-[#FF7A59] px-4 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02]"
              >
                <Search className="h-4 w-4" />
                Cari lagu
              </Link>
            </div>
          </div>

          <div className="mt-5 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {pills.map((pill) => (
              <button
                key={pill}
                onClick={() => setActiveFilter(activeFilter === pill ? null : pill)}
                className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:border-transparent hover:bg-[#FF7A59] hover:text-black"
              >
                {pill}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.32em] text-white/40">Mainkan Cepat</div>
              <h2 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">Langsung putar</h2>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {quickLaunch.map((track, index) => (
              <motion.button
                key={`quick-launch-${track.videoId}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onClick={() => playTrack(track, speedDialTracks, 'similar')}
                className="group flex items-center gap-4 overflow-hidden rounded-2xl bg-white/8 p-2 pr-4 text-left transition hover:bg-white/12"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                    <Image
                      src={getHighResImage(track.thumbnails?.[track.thumbnails.length - 1]?.url, 320)}
                      alt={getTrackTitle(track)}
                      fill
                      sizes="64px"
                      className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-white">{getTrackTitle(track)}</div>
                  <div className="mt-1 truncate text-xs text-white/55">{getArtistName(track)}</div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FF7A59] text-black shadow-lg transition group-hover:scale-[1.04]">
                  <Play className="ml-0.5 h-4 w-4 fill-current" />
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[26px] bg-[#121212] p-4 md:rounded-[30px] md:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">Untuk Kamu</div>
                <h2 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">Lanjutkan mendengar</h2>
              </div>
            </div>

            <div className="space-y-3">
              {recommendedTracks.map((track, index) => (
                <motion.div
                  key={`recommended-${track.videoId}-${index}`}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="flex items-center gap-3 rounded-2xl bg-white/6 p-3 transition hover:bg-white/10"
                >
                  <button
                    onClick={() => playTrack(track, quickPicksTracks, 'similar')}
                    className="relative h-14 w-14 overflow-hidden rounded-xl"
                  >
                    <Image
                      src={getHighResImage(track.thumbnails?.[track.thumbnails.length - 1]?.url, 280)}
                      alt={getTrackTitle(track)}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white">{getTrackTitle(track)}</div>
                    <div className="mt-1 truncate text-xs text-white/55">{getArtistName(track)}</div>
                  </div>
                  <button
                    onClick={() => playTrack(track, quickPicksTracks, 'similar')}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF7A59] text-black transition hover:scale-[1.03]"
                  >
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                  </button>
                  <button className="text-white/45 transition hover:text-white">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] bg-[linear-gradient(180deg,rgba(255,122,89,0.18),#121212)] p-4 md:rounded-[30px] md:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">Terakhir Diputar</div>
                <h2 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">Riwayat singkat</h2>
              </div>
              <Link href="/history" className="text-sm font-semibold text-white/70 transition hover:text-white">
                Lihat semua
              </Link>
            </div>

            <div className="space-y-3">
              {recentHistory.length > 0 ? (
                recentHistory.map((item) => (
                  <button
                    key={item.track.videoId}
                    onClick={() => playTrack(item.track, recentHistory.map((entry) => entry.track), 'similar')}
                    className="flex w-full items-center gap-3 rounded-2xl bg-black/20 p-3 text-left transition hover:bg-black/30"
                  >
                    <div className="relative h-14 w-14 overflow-hidden rounded-xl">
                      <Image
                        src={getHighResImage(item.track.thumbnails?.[item.track.thumbnails.length - 1]?.url, 280)}
                        alt={getTrackTitle(item.track)}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-white">{getTrackTitle(item.track)}</div>
                      <div className="mt-1 truncate text-xs text-white/55">{getArtistName(item.track)}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.24em] text-white/35">{formatPlayedAt(item.playedAt)}</div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl bg-black/20 p-5 text-sm leading-7 text-white/55">
                  Belum ada lagu yang diputar. Setelah kamu memutar lagu, riwayat akan muncul di sini.
                </div>
              )}
            </div>
          </div>
        </section>

        {topArtists.length > 0 && (
          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.32em] text-white/40">Popular Artists</div>
                <h2 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">Artis populer</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {topArtists.map((artist, index) => {
                const artistName = artist.name || 'Artist';
                return (
                  <Link href={`/artist/${artist.artistId}`} key={`artist-${artist.artistId}-${index}`}>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.15 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="rounded-[26px] bg-[#181818] p-4 text-center transition hover:bg-[#222]"
                    >
                      <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full shadow-xl">
                        <Image
                          src={getHighResImage(artist.thumbnails?.[artist.thumbnails.length - 1]?.url, 400)}
                          alt={artistName}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      </div>
                      <div className="mt-3 text-sm font-bold text-white line-clamp-1">{artistName}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.24em] text-white/35">Artist</div>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {communityPlaylists.length > 0 && (
          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.32em] text-white/40">Community Picks</div>
                <h2 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">Playlist pilihan</h2>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {communityPlaylists.map((playlist, index) => {
                const id = playlist.playlistId;
                if (!id) return null;
                return <CommunityPlaylistCard key={`community-playlist-${id}-${index}`} playlistId={id} />;
              })}
            </div>
          </section>
        )}

        <section className="space-y-10">
          {categories.map((cat, index) => (
            <HorizontalScroll key={`${cat.title}-${index}`} title={cat.title} tracks={cat.tracks} />
          ))}
        </section>
      </div>
    </main>
  );
}
