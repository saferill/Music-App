'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Download,
  Heart,
  Music2,
  Plus,
  Play,
  Radio,
  Sparkles,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { db, SubscribedArtist } from '@/lib/db';
import { getApiBaseUrl } from '@/lib/config';
import { Track, usePlayerStore } from '@/lib/store';
import { TrackItem } from '@/components/TrackItem';
import { getHighResImage } from '@/lib/utils';

type LibraryTab = 'library' | 'playlists' | 'songs' | 'artists' | 'charts';

type PlaylistRecord = {
  id: string;
  name: string;
  img: string;
  tracks: Track[];
};

const tabs: Array<{ key: LibraryTab; label: string }> = [
  { key: 'library', label: 'Your library' },
  { key: 'playlists', label: 'Your playlists' },
  { key: 'songs', label: 'Favorite songs' },
  { key: 'artists', label: 'Followed artists' },
  { key: 'charts', label: 'Charts' },
];

export default function LibraryPage() {
  const router = useRouter();
  const playTrack = usePlayerStore((state) => state.playTrack);
  const history = usePlayerStore((state) => state.history);
  const [likedSongs, setLikedSongs] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistRecord[]>([]);
  const [subscribedArtists, setSubscribedArtists] = useState<SubscribedArtist[]>([]);
  const [chartPlaylists, setChartPlaylists] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<LibraryTab>('library');
  const [showCreate, setShowCreate] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistImg, setNewPlaylistImg] = useState('');

  const loadLibrary = async () => {
    const [liked, localPlaylists, artists] = await Promise.all([
      db.getLikedSongs(),
      db.getPlaylists(),
      db.getSubscribedArtists(),
    ]);

    setLikedSongs(liked);
    setPlaylists(localPlaylists as PlaylistRecord[]);
    setSubscribedArtists(artists);
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrapLibrary = async () => {
      const [liked, localPlaylists, artists] = await Promise.all([
        db.getLikedSongs(),
        db.getPlaylists(),
        db.getSubscribedArtists(),
      ]);

      if (cancelled) return;

      setLikedSongs(liked);
      setPlaylists(localPlaylists as PlaylistRecord[]);
      setSubscribedArtists(artists);
    };

    void bootstrapLibrary();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'charts') return;

    const fetchCharts = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/search?q=${encodeURIComponent('top hits playlist')}&type=playlist`);
        const data = await response.json();
        setChartPlaylists(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch (error) {
        console.error('Failed to load chart playlists:', error);
        setChartPlaylists([]);
      }
    };

    void fetchCharts();
  }, [activeTab]);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    const newPlaylist: PlaylistRecord = {
      id: Date.now().toString(),
      name: newPlaylistName.trim(),
      img: newPlaylistImg || '',
      tracks: [],
    };

    await db.addPlaylist(newPlaylist);
    setShowCreate(false);
    setNewPlaylistName('');
    setNewPlaylistImg('');
    await loadLibrary();
  };

  const handleDeletePlaylist = async (id: string) => {
    await db.deletePlaylist(id);
    await loadLibrary();
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewPlaylistImg(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const recentTracks = useMemo(
    () =>
      history
        .map((item) => item.track)
        .filter((track, index, array) => array.findIndex((entry) => entry.videoId === track.videoId) === index)
        .slice(0, 6),
    [history]
  );

  return (
    <main className="min-h-screen pb-32 md:pb-16">
      <div className="page-shell space-y-5 pt-4 md:space-y-6 md:pt-6">
        <section className="glass-panel-strong rounded-[30px] p-4 md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">Library</div>
              <h1 className="mt-2 text-3xl font-semibold text-white">Pustaka</h1>
              <p className="mt-2 text-sm leading-7 text-white/65">
                Struktur halaman ini sekarang mengikuti pola aplikasi: tile cepat di atas, chip filter, lalu daftar
                favorit, artis diikuti, playlist lokal, dan chart.
              </p>
            </div>

            <button
              onClick={() => router.push('/top50')}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black shadow-[var(--accent-glow)] transition hover:scale-[1.02]"
            >
              <TrendingUp className="h-4 w-4" />
              Lihat Top 50
            </button>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`m3-chip whitespace-nowrap ${activeTab === tab.key ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {activeTab === 'library' && (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <LibraryTile
                icon={Heart}
                title="Favorite"
                subtitle={`${likedSongs.length} lagu`}
                onClick={() => setActiveTab('songs')}
              />
              <LibraryTile
                icon={UserRound}
                title="Followed"
                subtitle={`${subscribedArtists.length} artis`}
                onClick={() => setActiveTab('artists')}
              />
              <LibraryTile
                icon={TrendingUp}
                title="Most played"
                subtitle="Lihat statistik"
                onClick={() => router.push('/top50')}
              />
              <LibraryTile
                icon={Download}
                title="Downloaded"
                subtitle="Riwayat & cache"
                onClick={() => router.push('/history')}
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
              <div className="glass-panel rounded-[28px] p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.28em] text-white/35">Your Playlists</div>
                    <h2 className="mt-1 text-2xl font-semibold text-white">Playlist lokal</h2>
                  </div>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10"
                  >
                    <Plus className="h-4 w-4" />
                    Buat baru
                  </button>
                </div>

                {playlists.length > 0 ? (
                  <div className="space-y-3">
                    {playlists.slice(0, 4).map((playlist) => (
                      <div
                        key={playlist.id}
                        className="flex items-center gap-3 rounded-2xl bg-black/20 p-3 transition hover:bg-black/30"
                      >
                        <button
                          onClick={() => router.push(`/playlist/${playlist.id}`)}
                          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/10"
                        >
                          {playlist.img ? (
                            <Image src={playlist.img} alt={playlist.name} fill sizes="56px" className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Music2 className="h-5 w-5 text-white/35" />
                            </div>
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => router.push(`/playlist/${playlist.id}`)}
                            className="block truncate text-left text-sm font-semibold text-white"
                          >
                            {playlist.name}
                          </button>
                          <div className="mt-1 text-xs text-white/50">{playlist.tracks.length} lagu</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (playlist.tracks.length > 0) {
                                playTrack(playlist.tracks[0], playlist.tracks, 'playlist');
                              }
                            }}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-black transition hover:scale-[1.02]"
                          >
                            <Play className="ml-0.5 h-4 w-4 fill-current" />
                          </button>
                          <button
                            onClick={() => void handleDeletePlaylist(playlist.id)}
                            className="rounded-full p-2 text-white/45 transition hover:bg-white/10 hover:text-white"
                          >
                            <Plus className="h-4 w-4 rotate-45" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-black/20 p-5 text-sm leading-7 text-white/55">
                    Belum ada playlist lokal. Buat playlist baru untuk meniru flow aplikasi saat menyimpan koleksi
                    favoritmu.
                  </div>
                )}
              </div>

              <div className="glass-panel rounded-[28px] p-4 md:p-5">
                <div className="mb-4">
                  <div className="text-[11px] uppercase tracking-[0.28em] text-white/35">Recently Added</div>
                  <h2 className="mt-1 text-2xl font-semibold text-white">Terakhir diputar</h2>
                </div>

                <div className="space-y-3">
                  {(recentTracks.length > 0 ? recentTracks : likedSongs.slice(0, 4)).map((track, index) => (
                    <button
                      key={`${track.videoId}-${index}`}
                      onClick={() => playTrack(track, undefined, 'similar')}
                      className="flex w-full items-center gap-3 rounded-2xl bg-black/20 p-3 text-left transition hover:bg-black/30"
                    >
                      <div className="relative h-14 w-14 overflow-hidden rounded-xl">
                        <Image
                          src={getHighResImage(track.thumbnails?.[track.thumbnails.length - 1]?.url, 280)}
                          alt={track.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">{track.name}</div>
                        <div className="mt-1 truncate text-xs text-white/50">
                          {Array.isArray(track.artist) ? track.artist.map((artist) => artist.name).join(', ') : track.artist?.name}
                        </div>
                      </div>
                      <Play className="h-4 w-4 shrink-0 fill-current text-white/45" />
                    </button>
                  ))}

                  {recentTracks.length === 0 && likedSongs.length === 0 && (
                    <div className="rounded-2xl bg-black/20 p-5 text-sm leading-7 text-white/55">
                      Koleksi pustaka masih kosong. Setelah kamu memutar atau menyukai lagu, rak ini akan terisi.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'songs' && (
          <section className="glass-panel rounded-[28px] p-2 sm:p-3">
            <div className="flex items-center justify-between px-3 py-2">
              <div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-white/35">Favorite</div>
                <h2 className="mt-1 text-2xl font-semibold text-white">Lagu disukai</h2>
              </div>
              {likedSongs.length > 0 && (
                <button
                  onClick={() => playTrack(likedSongs[0], likedSongs, 'playlist')}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-black transition hover:scale-[1.02]"
                >
                  <Play className="ml-0.5 h-5 w-5 fill-current" />
                </button>
              )}
            </div>

            {likedSongs.length > 0 ? (
              likedSongs.map((track) => <TrackItem key={track.videoId} track={track} queue={likedSongs} playMode="playlist" />)
            ) : (
              <div className="px-3 py-10 text-center text-white/50">Belum ada lagu yang disukai.</div>
            )}
          </section>
        )}

        {activeTab === 'artists' && (
          <section>
            <div className="mb-4">
              <div className="text-[11px] uppercase tracking-[0.28em] text-white/35">Followed</div>
              <h2 className="mt-1 text-2xl font-semibold text-white">Artis diikuti</h2>
            </div>

            {subscribedArtists.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {subscribedArtists.map((artist) => (
                  <button
                    key={artist.artistId}
                    onClick={() => router.push(`/artist/${artist.artistId}`)}
                    className="rounded-[28px] bg-[#181818] p-4 text-center transition hover:bg-[#202020]"
                  >
                    <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full">
                      <Image
                        src={getHighResImage(artist.thumbnails?.[artist.thumbnails.length - 1]?.url, 320)}
                        alt={artist.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>
                    <div className="mt-3 line-clamp-1 text-sm font-semibold text-white">{artist.name}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.24em] text-white/35">Artist</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="glass-panel rounded-[28px] p-8 text-center text-white/55">
                Belum ada artis yang diikuti.
              </div>
            )}
          </section>
        )}

        {activeTab === 'playlists' && (
          <section>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-white/35">Your Playlists</div>
                <h2 className="mt-1 text-2xl font-semibold text-white">Playlist lokal</h2>
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black transition hover:scale-[1.02]"
              >
                <Plus className="h-4 w-4" />
                Playlist baru
              </button>
            </div>

            {playlists.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {playlists.map((playlist) => (
                  <div key={playlist.id} className="glass-panel rounded-[28px] p-4">
                    <button
                      onClick={() => router.push(`/playlist/${playlist.id}`)}
                      className="relative aspect-square w-full overflow-hidden rounded-[22px] bg-white/10"
                    >
                      {playlist.img ? (
                        <Image src={playlist.img} alt={playlist.name} fill sizes="320px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Sparkles className="h-8 w-8 text-white/30" />
                        </div>
                      )}
                    </button>
                    <div className="mt-4">
                      <button
                        onClick={() => router.push(`/playlist/${playlist.id}`)}
                        className="line-clamp-2 text-left text-lg font-semibold text-white"
                      >
                        {playlist.name}
                      </button>
                      <div className="mt-1 text-sm text-white/50">{playlist.tracks.length} lagu</div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (playlist.tracks.length > 0) {
                            playTrack(playlist.tracks[0], playlist.tracks, 'playlist');
                          }
                        }}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-black transition hover:scale-[1.02]"
                      >
                        <Play className="ml-0.5 h-5 w-5 fill-current" />
                      </button>
                      <button
                        onClick={() => {
                          if (playlist.tracks.length > 0) {
                            playTrack(playlist.tracks[0], undefined, 'similar');
                          }
                        }}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
                      >
                        <Radio className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => void handleDeletePlaylist(playlist.id)}
                        className="rounded-full px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-panel rounded-[28px] p-8 text-center text-white/55">
                Belum ada playlist lokal.
              </div>
            )}
          </section>
        )}

        {activeTab === 'charts' && (
          <section>
            <div className="mb-4">
              <div className="text-[11px] uppercase tracking-[0.28em] text-white/35">Charts</div>
              <h2 className="mt-1 text-2xl font-semibold text-white">Playlist chart</h2>
            </div>

            {chartPlaylists.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {chartPlaylists.map((playlist, index) => (
                  <button
                    key={`${playlist.playlistId}-${index}`}
                    onClick={() => router.push(`/playlist/${playlist.playlistId}`)}
                    className="glass-panel rounded-[28px] p-4 text-left transition hover:bg-white/10"
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-[22px]">
                      <Image
                        src={getHighResImage(playlist.thumbnails?.[playlist.thumbnails.length - 1]?.url, 320)}
                        alt={playlist.name}
                        fill
                        sizes="320px"
                        className="object-cover"
                      />
                    </div>
                    <div className="mt-4 line-clamp-2 text-lg font-semibold text-white">{playlist.name}</div>
                    <div className="mt-1 text-sm text-white/50">{playlist.artist?.name || 'Playlist'}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="glass-panel rounded-[28px] p-8 text-center text-white/55">
                Chart sedang dimuat atau belum tersedia.
              </div>
            )}
          </section>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#171717] p-6">
            <h2 className="text-2xl font-semibold text-white">Playlist baru</h2>
            <p className="mt-2 text-sm leading-7 text-white/55">
              Web sekarang memakai flow pembuatan playlist yang sejalan dengan pustaka aplikasi.
            </p>

            <div className="mt-6 flex justify-center">
              <label className="relative flex h-32 w-32 cursor-pointer items-center justify-center overflow-hidden rounded-[24px] border border-dashed border-white/20 bg-white/5 transition hover:border-white/35">
                {newPlaylistImg ? (
                  <Image src={newPlaylistImg} alt="Preview playlist" fill sizes="128px" className="object-cover" />
                ) : (
                  <Plus className="h-8 w-8 text-white/40" />
                )}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>

            <input
              type="text"
              value={newPlaylistName}
              onChange={(event) => setNewPlaylistName(event.target.value)}
              placeholder="Nama playlist"
              className="mt-6 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/40"
            />

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-2xl bg-white/8 px-4 py-3 font-medium text-white transition hover:bg-white/12"
              >
                Batal
              </button>
              <button
                onClick={() => void handleCreatePlaylist()}
                disabled={!newPlaylistName.trim()}
                className="flex-1 rounded-2xl bg-[var(--accent)] px-4 py-3 font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function LibraryTile({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: typeof Heart;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="glass-panel flex items-center gap-4 rounded-[24px] p-4 text-left transition hover:bg-white/10"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)]/14 text-[var(--accent)]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-base font-semibold text-white">{title}</div>
        <div className="mt-1 text-xs uppercase tracking-[0.22em] text-white/35">{subtitle}</div>
      </div>
    </button>
  );
}
