'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Clock3,
  History,
  Play,
  Search,
  Settings2,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { HomeSkeleton } from '@/components/HomeSkeleton';
import { HorizontalScroll } from '@/components/HorizontalScroll';
import { getApiBaseUrl } from '@/lib/config';
import { readTasteProfile, TasteProfile } from '@/lib/taste-profile';
import { Track, usePlayerStore } from '@/lib/store';
import { getHighResImage } from '@/lib/utils';

type HomeEntity = Record<string, any>;
type HomeShelf = {
  title: string;
  contents: HomeEntity[];
};

const moodPills = [
  'All',
  'Relax',
  'Sleep',
  'Energize',
  'Sad',
  'Romance',
  'Feel good',
  'Workout',
  'Party',
  'Commute',
  'Focus',
];

const moodQueries: Record<string, string[]> = {
  Relax: ['relaxing songs', 'lofi chill mix', 'soft acoustic songs'],
  Sleep: ['sleep music', 'ambient sleep songs', 'late night calm songs'],
  Energize: ['energetic songs', 'workout pump songs', 'morning boost mix'],
  Sad: ['sad songs', 'melancholy ballads', 'heartbreak songs'],
  Romance: ['romantic songs', 'love ballads', 'date night music'],
  'Feel good': ['feel good songs', 'happy hits', 'sunny day songs'],
  Workout: ['workout songs', 'gym motivation music', 'running songs'],
  Party: ['party hits', 'dance songs', 'club mix songs'],
  Commute: ['commute songs', 'driving playlist songs', 'city pop drive'],
  Focus: ['focus music', 'study songs', 'deep work playlist'],
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 6 && hour <= 12) return 'Selamat pagi';
  if (hour >= 13 && hour <= 17) return 'Selamat siang';
  if (hour >= 18 && hour <= 23) return 'Selamat malam';
  return 'Masih terjaga';
}

function getArtistName(track?: Track | null) {
  if (!track) return 'Unknown Artist';

  return Array.isArray(track.artist)
    ? track.artist.map((artist) => artist.name).join(', ')
    : track.artist?.name || 'Unknown Artist';
}

function getTrackTitle(track?: Track | null) {
  return track?.name?.trim() || 'Lagu tanpa judul';
}

function formatPlayedAt(timestamp: number) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return '';

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function isTrackItem(item: HomeEntity): item is Track {
  return Boolean(item?.videoId);
}

function isEntityType(item: HomeEntity, type: string) {
  return item?.type === type;
}

function getEntityHref(item: HomeEntity) {
  if (isEntityType(item, 'ALBUM')) {
    return `/album/${item.albumId}`;
  }

  if (isEntityType(item, 'PLAYLIST')) {
    return `/playlist/${item.playlistId}`;
  }

  return '#';
}

function getEntityMeta(item: HomeEntity) {
  if (isEntityType(item, 'ALBUM')) {
    return item.artist?.name || 'Album';
  }

  if (isEntityType(item, 'PLAYLIST')) {
    return item.artist?.name || 'Playlist';
  }

  return '';
}

async function fetchTypedResults(query: string, type: string) {
  const response = await fetch(`${getApiBaseUrl()}/api/search?q=${encodeURIComponent(query)}&type=${type}`);
  if (!response.ok) {
    return [];
  }

  return response.json();
}

export default function Home() {
  const playTrack = usePlayerStore((state) => state.playTrack);
  const history = usePlayerStore((state) => state.history);
  const [tasteProfile, setTasteProfile] = useState<TasteProfile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [shelves, setShelves] = useState<HomeShelf[]>([]);
  const [playlistHighlights, setPlaylistHighlights] = useState<HomeEntity[]>([]);
  const [artistHighlights, setArtistHighlights] = useState<HomeEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMood, setActiveMood] = useState('All');
  const [filteredShelves, setFilteredShelves] = useState<Array<{ title: string; tracks: Track[] }>>([]);
  const [filterLoading, setFilterLoading] = useState(false);
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
    if (!profileReady) return;

    const fetchHomeData = async () => {
      setLoading(true);

      try {
        const artistSeed =
          tasteProfile?.favoriteArtists.slice(0, 2).join(' ') ||
          getArtistName(history[0]?.track) ||
          'Hindia Nadin Amizah';
        const genreSeed = tasteProfile?.favoriteGenres.slice(0, 2).join(' ') || 'musik indonesia';

        const [homeResponse, playlistResponse, artistResponse] = await Promise.all([
          fetch(`${getApiBaseUrl()}/api/home`),
          fetchTypedResults(`${genreSeed} top playlist`, 'playlist'),
          fetchTypedResults(`${artistSeed} artist`, 'artist'),
        ]);

        const homePayload = homeResponse.ok ? await homeResponse.json() : { sections: [] };
        setShelves(Array.isArray(homePayload.sections) ? homePayload.sections : []);
        setPlaylistHighlights(Array.isArray(playlistResponse) ? playlistResponse.slice(0, 6) : []);
        setArtistHighlights(Array.isArray(artistResponse) ? artistResponse.slice(0, 6) : []);
      } catch (error) {
        console.error('Failed to fetch home data:', error);
        setShelves([]);
        setPlaylistHighlights([]);
        setArtistHighlights([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchHomeData();
  }, [history, latestHistoryTrackId, profileReady, tasteProfile]);

  useEffect(() => {
    if (activeMood === 'All') {
      setFilteredShelves([]);
      return;
    }

    const queries = moodQueries[activeMood] || [];
    if (queries.length === 0) {
      setFilteredShelves([]);
      return;
    }

    const fetchMoodShelves = async () => {
      setFilterLoading(true);

      try {
        const results = await Promise.all(
          queries.map(async (query) => {
            const data = await fetchTypedResults(query, 'song');
            return {
              title: query,
              tracks: (Array.isArray(data) ? data : []).filter(isTrackItem).slice(0, 10),
            };
          })
        );

        setFilteredShelves(
          results.map((result) => ({
            title: result.title
              .split(' ')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' '),
            tracks: result.tracks,
          }))
        );
      } catch (error) {
        console.error('Failed to fetch mood shelves:', error);
        setFilteredShelves([]);
      } finally {
        setFilterLoading(false);
      }
    };

    void fetchMoodShelves();
  }, [activeMood]);

  const quickPicks = useMemo(
    () => shelves.find((shelf) => shelf.contents.some(isTrackItem))?.contents.filter(isTrackItem).slice(0, 8) || [],
    [shelves]
  );

  const songShelves = useMemo(
    () =>
      shelves
        .map((shelf) => ({
          title: shelf.title,
          tracks: shelf.contents.filter(isTrackItem),
        }))
        .filter((shelf) => shelf.tracks.length > 0),
    [shelves]
  );

  const albumShelves = useMemo(
    () => shelves.filter((shelf) => shelf.contents.some((item) => isEntityType(item, 'ALBUM'))),
    [shelves]
  );

  const playlistShelves = useMemo(
    () => shelves.filter((shelf) => shelf.contents.some((item) => isEntityType(item, 'PLAYLIST'))),
    [shelves]
  );

  const recentHistory = history.slice(0, 4);
  const continueListening =
    history.map((item) => item.track).filter((track, index, array) => array.findIndex((entry) => entry.videoId === track.videoId) === index).slice(0, 6) ||
    [];
  const discoveryShelves = songShelves.slice(1, 5);
  const moodAndMomentShelf = playlistShelves[0] || albumShelves[0] || null;

  if (!profileReady || loading || (activeMood !== 'All' && filterLoading)) {
    return (
      <main className="min-h-screen pb-32 md:pb-16">
        <div className="page-shell pt-4 md:pt-6">
          <HomeSkeleton />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-32 md:pb-16">
      <div className="page-shell space-y-6 pt-4 md:space-y-8 md:pt-6">
        <section className="glass-panel-strong rounded-[30px] p-4 md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <div className="text-[11px] uppercase tracking-[0.32em] text-white/45">Sonara Music</div>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">{getGreeting()}</h1>
              <p className="mt-3 text-sm leading-7 text-white/70 sm:text-base">
                Struktur beranda web sekarang mengikuti alur aplikasi: quick picks, moods, library, riwayat, dan rak
                rekomendasi yang lebih padat.
              </p>
              {tasteProfile && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  {tasteProfile.favoriteArtists[0] || tasteProfile.favoriteGenres[0] || 'Personalized'}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
              <HeaderAction href="/search" icon={Search} label="Cari" />
              <HeaderAction href="/history" icon={History} label="Riwayat" />
              <HeaderAction href="/settings" icon={Settings2} label="Pengaturan" />
            </div>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {moodPills.map((pill) => (
              <button
                key={pill}
                onClick={() => setActiveMood(pill)}
                className={`m3-chip whitespace-nowrap ${activeMood === pill ? 'active' : ''}`}
              >
                {pill}
              </button>
            ))}
          </div>
        </section>

        {activeMood !== 'All' ? (
          <section className="space-y-10">
            <div className="glass-panel rounded-[28px] p-5">
              <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">Mood Aktif</div>
              <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{activeMood}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
                Mode ini menyesuaikan rak lagu agar lebih mirip filter mood di aplikasi. Antrean tetap memakai radio
                otomatis saat kamu memutar salah satu track.
              </p>
            </div>

            {filteredShelves.map((shelf) => (
              <HorizontalScroll key={shelf.title} title={shelf.title} tracks={shelf.tracks} />
            ))}
          </section>
        ) : (
          <>
            <section>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">Mari Mulai Dengan Radio</div>
                  <h2 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">Quick picks</h2>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {quickPicks.map((track, index) => (
                  <motion.button
                    key={`${track.videoId}-${index}`}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    onClick={() => playTrack(track, undefined, 'similar')}
                    className="flex items-center gap-3 rounded-[24px] bg-white/6 p-3 text-left transition hover:bg-white/10"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
                      <Image
                        src={getHighResImage(track.thumbnails?.[track.thumbnails.length - 1]?.url, 320)}
                        alt={getTrackTitle(track)}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{getTrackTitle(track)}</div>
                      <div className="mt-1 truncate text-xs text-white/55">{getArtistName(track)}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.24em] text-white/35">
                        {formatDuration(track.duration) || 'Radio Mix'}
                      </div>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-black shadow-[var(--accent-glow)]">
                      <Play className="ml-0.5 h-4 w-4 fill-current" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="glass-panel rounded-[30px] p-5">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">Lanjutkan Mendengar</div>
                    <h2 className="mt-1 text-2xl font-semibold text-white">For you</h2>
                  </div>
                  <Link href="/library" className="text-sm font-medium text-white/60 transition hover:text-white">
                    Buka pustaka
                  </Link>
                </div>

                <div className="space-y-3">
                  {(continueListening.length > 0 ? continueListening : quickPicks.slice(0, 6)).map((track, index) => (
                    <button
                      key={`${track.videoId}-${index}`}
                      onClick={() => playTrack(track, undefined, 'similar')}
                      className="flex w-full items-center gap-3 rounded-2xl bg-black/20 p-3 text-left transition hover:bg-black/30"
                    >
                      <div className="relative h-14 w-14 overflow-hidden rounded-xl">
                        <Image
                          src={getHighResImage(track.thumbnails?.[track.thumbnails.length - 1]?.url, 280)}
                          alt={getTrackTitle(track)}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">{getTrackTitle(track)}</div>
                        <div className="mt-1 truncate text-xs text-white/55">{getArtistName(track)}</div>
                      </div>
                      <Play className="h-4 w-4 shrink-0 fill-current text-white/45" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[30px] bg-[linear-gradient(180deg,rgba(255,122,89,0.18),#121212)] p-5">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">Recently Added</div>
                    <h2 className="mt-1 text-2xl font-semibold text-white">Riwayat terbaru</h2>
                  </div>
                  <Link href="/history" className="text-sm font-medium text-white/70 transition hover:text-white">
                    Lihat semua
                  </Link>
                </div>

                <div className="space-y-3">
                  {recentHistory.length > 0 ? (
                    recentHistory.map((item) => (
                      <button
                        key={`${item.track.videoId}-${item.playedAt}`}
                        onClick={() => playTrack(item.track, history.map((entry) => entry.track), 'similar')}
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
                          <div className="truncate text-sm font-semibold text-white">{getTrackTitle(item.track)}</div>
                          <div className="mt-1 truncate text-xs text-white/55">{getArtistName(item.track)}</div>
                          <div className="mt-1 text-[11px] uppercase tracking-[0.24em] text-white/35">
                            {formatPlayedAt(item.playedAt)}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-black/20 p-5 text-sm leading-7 text-white/55">
                      Belum ada lagu yang diputar. Saat kamu mulai mendengar musik, daftar terbaru akan muncul di sini
                      seperti di aplikasi.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {moodAndMomentShelf && (
              <EntityShelf
                title={moodAndMomentShelf.title}
                subtitle="Moods & moments"
                items={moodAndMomentShelf.contents.slice(0, 8)}
              />
            )}

            {(playlistHighlights.length > 0 || artistHighlights.length > 0) && (
              <section className="space-y-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.32em] text-white/40">Chart</div>
                    <h2 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">Pilihan populer</h2>
                  </div>
                  <Link href="/top50" className="inline-flex items-center gap-2 text-sm font-medium text-white/60 transition hover:text-white">
                    <TrendingUp className="h-4 w-4" />
                    Statistikmu
                  </Link>
                </div>

                {playlistHighlights.length > 0 && (
                  <EntityShelf title="Playlist chart" subtitle="Chart playlists" items={playlistHighlights.slice(0, 6)} />
                )}

                {artistHighlights.length > 0 && (
                  <section>
                    <div className="mb-4">
                      <div className="text-[11px] uppercase tracking-[0.32em] text-white/40">Top Artists</div>
                      <h3 className="mt-1 text-2xl font-semibold text-white">Artis populer</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                      {artistHighlights.map((artist, index) => (
                        <Link
                          key={`${artist.artistId}-${index}`}
                          href={`/artist/${artist.artistId}`}
                          className="rounded-[26px] bg-[#181818] p-4 text-center transition hover:bg-[#202020]"
                        >
                          <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full">
                            <Image
                              src={getHighResImage(artist.thumbnails?.[artist.thumbnails.length - 1]?.url, 400)}
                              alt={artist.name || 'Artist'}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          </div>
                          <div className="mt-3 line-clamp-1 text-sm font-semibold text-white">{artist.name}</div>
                          <div className="mt-1 text-[11px] uppercase tracking-[0.24em] text-white/35">Artist</div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </section>
            )}

            <section className="space-y-10">
              {discoveryShelves.map((shelf) => (
                <HorizontalScroll key={shelf.title} title={shelf.title} tracks={shelf.tracks.slice(0, 10)} />
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function HeaderAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Search;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </Link>
  );
}

function EntityShelf({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: HomeEntity[];
}) {
  return (
    <section>
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.32em] text-white/40">{subtitle}</div>
        <h2 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{title}</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-3 no-scrollbar md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {items.map((item, index) => (
          <Link
            key={`${item.type || 'item'}-${item.playlistId || item.albumId || index}`}
            href={getEntityHref(item)}
            className="glass-panel flex w-40 shrink-0 flex-col rounded-[28px] p-3 transition hover:bg-white/10 md:w-auto"
          >
            <div className="relative aspect-square overflow-hidden rounded-[22px]">
              <Image
                src={getHighResImage(item.thumbnails?.[item.thumbnails.length - 1]?.url, 400)}
                alt={item.name || 'Item'}
                fill
                sizes="160px"
                className="object-cover"
              />
            </div>
            <div className="mt-3 line-clamp-2 text-sm font-semibold text-white">{item.name || 'Untitled'}</div>
            <div className="mt-1 line-clamp-2 text-xs text-white/50">{getEntityMeta(item)}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
