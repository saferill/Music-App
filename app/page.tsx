'use client';

import { useEffect, useState } from 'react';
import { Track, usePlayerStore } from '@/lib/store';
import { Loader2, History, Cast, User, Play, MoreVertical } from 'lucide-react';
import Image from 'next/image';
import { HorizontalScroll } from '@/components/HorizontalScroll';
import { CommunityPlaylistCard } from '@/components/CommunityPlaylistCard';
import { getHighResImage } from '@/lib/utils';
import { motion } from 'motion/react';
import Link from 'next/link';

import { HomeSkeleton } from '@/components/HomeSkeleton';

const pills = ['Chill', 'Focus', 'Commute', 'Gaming', 'Energize', 'Party', 'Feel good', 'Romance', 'Workout', 'Sleep', 'Sad', 'Happy', 'Nostalgia', 'Acoustic', 'Pop', 'Rock'];

export default function Home() {
  const [heroTracks, setHeroTracks] = useState<Track[]>([]);
  const [speedDialTracks, setSpeedDialTracks] = useState<Track[]>([]);
  const [quickPicksTracks, setQuickPicksTracks] = useState<Track[]>([]);
  const [communityPlaylists, setCommunityPlaylists] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ title: string; tracks: Track[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [filterData, setFilterData] = useState<{ title: string; tracks: Track[] }[]>([]);
  const [loadingFilter, setLoadingFilter] = useState(false);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const history = usePlayerStore((state) => state.history);

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
    const fetchHomeData = async () => {
      try {
        const queries: { key: string; title?: string; q: string; type?: string }[] = [
          { key: 'hero', q: 'dave how i met my ex', type: 'song' },
          { key: 'speedDial', q: 'top hits 2024', type: 'song' },
          { key: 'quickPicks', q: 'viral hits indonesia', type: 'song' },
          { key: 'community', q: 'chill playlists', type: 'playlist' },
          { key: 'artists', q: 'artis indonesia populer', type: 'artist' },
        ];

        // Add default categories
        const defaultCategories = [
          { key: 'cat0', title: 'Trending Now', q: 'lagu indonesia hits terbaru', type: 'song' },
          { key: 'cat1', title: 'New Releases', q: 'lagu pop indonesia rilis terbaru', type: 'song' },
          { key: 'cat2', title: 'Top 50 Indonesia', q: 'top 50 indonesia playlist update', type: 'song' },
          { key: 'cat3', title: 'Viral on TikTok', q: 'lagu fyp tiktok viral', type: 'song' },
          { key: 'cat4', title: 'For Eid Getaways', q: 'lagu lebaran idul fitri', type: 'song' },
          { key: 'cat5', title: 'Surrender to the Beat', q: 'lagu edm jedag jedug', type: 'song' },
          { key: 'cat6', title: 'Fun throwbacks', q: 'lagu nostalgia 2000an indonesia', type: 'song' },
          { key: 'cat7', title: 'Feel-good rock', q: 'lagu rock indonesia terbaik', type: 'song' },
          { key: 'cat8', title: 'Acoustic Chill', q: 'lagu akustik cafe santai', type: 'song' },
        ];
        
        queries.push(...defaultCategories);

        // Process in chunks of 3 to avoid 403 errors from too many parallel requests
        const results = [];
        for (let i = 0; i < queries.length; i += 3) {
          const chunk = queries.slice(i, i + 3);
          const chunkResults = await Promise.all(
            chunk.map(async ({ key, title, q, type }) => {
              try {
                const url = type 
                  ? `/api/search?q=${encodeURIComponent(q)}&type=${type}`
                  : `/api/search?q=${encodeURIComponent(q)}`;
                const res = await fetch(url);
                if (!res.ok) return { key, title, data: [] };
                const data = await res.json();
                return { key, title, data };
              } catch (e) {
                return { key, title, data: [] };
              }
            })
          );
          results.push(...chunkResults);
        }

        const cats: { title: string; tracks: Track[] }[] = [];

        results.forEach(({ key, title, data }) => {
          if (!data || data.length === 0) return;
          if (key === 'hero') setHeroTracks(data.slice(0, 3));
          else if (key === 'speedDial') setSpeedDialTracks(data.slice(0, 45));
          else if (key === 'quickPicks') setQuickPicksTracks(data.slice(0, 20));
          else if (key === 'community') setCommunityPlaylists(data.slice(0, 10));
          else if (key === 'artists') setArtists(data.slice(0, 10));
          else if (key.startsWith('cat') && title) cats.push({ title, tracks: data.slice(0, 10) });
        });

        setCategories(cats);
      } catch (error) {
        console.error('Failed to fetch home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
    
    const handleFocus = () => {
      fetchHomeData();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [history[0]?.track?.videoId]);

  return (
    <main className="min-h-screen pt-6 pb-24">
      <div className="flex items-center justify-between px-4 mb-4">
        <h1 className="text-2xl font-bold text-white">Beranda</h1>
        <div className="flex items-center gap-4 text-white/80">
          <Link href="/history" className="hover:text-white transition-colors">
            <History className="w-6 h-6" />
          </Link>
          <Cast className="w-6 h-6" />
          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center relative">
            <Image src="https://f.top4top.io/p_3733w0g4e0.jpg" alt="Developer Profile" fill sizes="32px" className="object-cover" />
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto no-scrollbar gap-3 px-4 mb-4 snap-x snap-mandatory scroll-smooth">
        {pills.map((pill) => (
          <button 
            key={pill} 
            onClick={() => setActiveFilter(activeFilter === pill ? null : pill)}
            className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-colors border snap-center ${
              activeFilter === pill 
                ? 'bg-white text-black border-white' 
                : 'bg-white/10 hover:bg-white/20 text-white border-white/5'
            }`}
          >
            {pill}
          </button>
        ))}
      </div>

      {loading || (activeFilter && loadingFilter) ? (
        <HomeSkeleton />
      ) : activeFilter ? (
        <div className="space-y-10">
          {filterData.map((cat, i) => (
            <HorizontalScroll key={i} title={cat.title} tracks={cat.tracks} />
          ))}
          
          <div className="px-4 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Suasana Hati dan Genre</h2>
            <div className="grid grid-rows-2 grid-flow-col gap-3 overflow-x-auto no-scrollbar pb-4 snap-x snap-mandatory">
              {pills.map((p) => (
                <button
                  key={p}
                  onClick={() => setActiveFilter(p)}
                  className="bg-[#1C1C1E] hover:bg-white/10 text-white font-medium py-3 px-4 rounded-lg text-left transition-colors border border-white/5 min-w-[160px] snap-center"
                >
                  <span className="text-sm">{p}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {heroTracks.length > 0 && (
            <div className="flex overflow-x-auto no-scrollbar gap-4 px-4 snap-x snap-mandatory scroll-smooth pb-4">
              {heroTracks.map((track, i) => (
                <motion.div 
                  key={`hero-${track.videoId}-${i}`}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="relative w-[85vw] sm:w-[400px] shrink-0 aspect-[4/5] sm:aspect-video rounded-3xl overflow-hidden cursor-pointer group shadow-2xl snap-center hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200"
                  onClick={() => playTrack(track, heroTracks, 'similar')}
                >
                  <Image 
                    src={getHighResImage(track.thumbnails?.[track.thumbnails.length - 1]?.url, 800)} 
                    alt={track.name} 
                    fill 
                    sizes="(max-width: 640px) 85vw, 400px"
                    className="object-cover group-hover:scale-105 transition-transform duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute top-4 left-4 right-4">
                    <h2 className="text-2xl font-bold text-white drop-shadow-lg">{track.name}</h2>
                    <p className="text-white/80 font-medium drop-shadow-md">
                      {Array.isArray(track.artist) ? track.artist.map(a => a.name).join(', ') : track.artist?.name}
                    </p>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                    <p className="text-sm text-white/60 truncate pr-4">Sounds like Raindance • Dave, Tems</p>
                    <div className="w-12 h-12 bg-[#FA243C] rounded-full flex items-center justify-center shadow-lg shadow-[#FA243C]/30 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <Play className="w-6 h-6 text-white ml-1 fill-current" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {speedDialTracks.length > 0 && (
            <div className="px-4">
              <h2 className="text-2xl font-bold text-white mb-4">Speed dial</h2>
              <div className="flex overflow-x-auto no-scrollbar gap-4 snap-x snap-mandatory scroll-smooth pb-4">
                {Array.from({ length: Math.ceil(speedDialTracks.length / 9) }).map((_, i) => {
                  const chunk = speedDialTracks.slice(i * 9, i * 9 + 9);
                  return (
                    <motion.div 
                      key={`speeddial-chunk-${i}`}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.1 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="w-[85vw] sm:w-[400px] shrink-0 snap-center grid grid-cols-3 gap-2"
                    >
                      {chunk.map((track, j) => (
                        <div 
                          key={`speeddial-${track.videoId}-${j}`}
                          className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200"
                          onClick={() => playTrack(track, speedDialTracks, 'similar')}
                        >
                          <Image src={getHighResImage(track.thumbnails?.[track.thumbnails.length - 1]?.url, 200)} alt={track.name} fill sizes="64px" className="object-cover" />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                          <div className="absolute bottom-2 left-2 right-2">
                            <p className="text-white text-xs font-medium truncate drop-shadow-md">{track.name}</p>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {quickPicksTracks.length > 0 && (
            <div className="px-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Pilihan cepat</h2>
                <button 
                  className="text-sm font-medium text-white/80 hover:text-white border border-white/20 rounded-full px-4 py-1.5 transition-colors"
                  onClick={() => playTrack(quickPicksTracks[0], quickPicksTracks, 'similar')}
                >
                  Putar semua
                </button>
              </div>
              <div className="flex overflow-x-auto no-scrollbar gap-4 snap-x snap-mandatory scroll-smooth pb-4">
                {Array.from({ length: Math.ceil(quickPicksTracks.length / 4) }).map((_, i) => {
                  const chunk = quickPicksTracks.slice(i * 4, i * 4 + 4);
                  return (
                    <motion.div 
                      key={`quickpicks-chunk-${i}`}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.1 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="w-[85vw] sm:w-[400px] shrink-0 snap-center flex flex-col gap-3"
                    >
                      {chunk.map((track, j) => (
                        <div 
                          key={`quickpicks-${track.videoId}-${j}`}
                          className="flex items-center gap-3 cursor-pointer group hover:bg-white/5 p-2 -mx-2 rounded-xl active:scale-[0.98] transition-all duration-200"
                          onClick={() => playTrack(track, quickPicksTracks, 'similar')}
                        >
                          <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0">
                            <Image src={getHighResImage(track.thumbnails?.[track.thumbnails.length - 1]?.url, 100)} alt={track.name} fill sizes="48px" className="object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="w-5 h-5 text-white fill-current" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-medium truncate text-base">{track.name}</h3>
                            <p className="text-white/60 text-sm truncate">
                              {Array.isArray(track.artist) ? track.artist.map(a => a.name).join(', ') : track.artist?.name}
                            </p>
                          </div>
                          <button className="p-2 text-white/60 hover:text-white transition-colors">
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {communityPlaylists.length > 0 && (
            <div className="px-4">
              <h2 className="text-2xl font-bold text-[#81B29A] mb-4">From the community</h2>
              <div className="flex overflow-x-auto no-scrollbar gap-4 snap-x snap-mandatory scroll-smooth pb-4">
                {communityPlaylists.map((playlist, i) => {
                  const id = playlist.playlistId;
                  if (!id) return null;
                  return <CommunityPlaylistCard key={`community-playlist-${id}-${i}`} playlistId={id} />;
                })}
              </div>
            </div>
          )}

          {artists.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4 px-4">Tetap mendengarkan</h2>
              <div className="flex overflow-x-auto no-scrollbar gap-6 px-4 pb-4 snap-x snap-mandatory scroll-smooth">
                {artists.map((artist, i) => {
                  const artistName = artist.name || 'Artist';
                  return (
                    <Link href={`/artist/${artist.artistId}`} key={`artist-${artist.artistId}-${i}`}>
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.1 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="flex flex-col items-center gap-3 cursor-pointer group shrink-0 snap-center hover:scale-105 active:scale-95 transition-transform duration-200"
                      >
                        <div className="relative w-28 h-28 rounded-full overflow-hidden shadow-lg transition-transform duration-300">
                          <Image src={getHighResImage(artist.thumbnails?.[artist.thumbnails.length - 1]?.url, 400)} alt={artistName} fill sizes="144px" className="object-cover" />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="w-8 h-8 text-white fill-current" />
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-white line-clamp-1">{artistName}</div>
                          <div className="text-xs text-white/50">Artis</div>
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {categories.map((cat, i) => (
            <HorizontalScroll key={i} title={cat.title} tracks={cat.tracks} />
          ))}
        </div>
      )}
    </main>
  );
}
