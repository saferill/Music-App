'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpLeft,
  Disc3,
  History,
  ListMusic,
  Mic2,
  Search as SearchIcon,
  UserRound,
  Video,
  X,
} from 'lucide-react';
import { SearchSkeleton } from '@/components/SearchSkeleton';
import { TrackItem } from '@/components/TrackItem';
import { ArtistItem } from '@/components/ArtistItem';
import { db, RecentSearch } from '@/lib/db';
import { getApiBaseUrl } from '@/lib/config';
import { getHighResImage } from '@/lib/utils';

type SearchType = 'all' | 'song' | 'video' | 'album' | 'artist' | 'playlist';

type SearchResults = Record<SearchType, any[]>;

const tabs: Array<{ label: string; key: SearchType; icon: ComponentType<{ className?: string }> }> = [
  { label: 'Semua', key: 'all', icon: SearchIcon },
  { label: 'Lagu', key: 'song', icon: Mic2 },
  { label: 'Video', key: 'video', icon: Video },
  { label: 'Album', key: 'album', icon: Disc3 },
  { label: 'Artis', key: 'artist', icon: UserRound },
  { label: 'Playlist', key: 'playlist', icon: ListMusic },
];

const emptyResults: SearchResults = {
  all: [],
  song: [],
  video: [],
  album: [],
  artist: [],
  playlist: [],
};

async function fetchSearchType(query: string, type: Exclude<SearchType, 'all'>) {
  const response = await fetch(`${getApiBaseUrl()}/api/search?q=${encodeURIComponent(query)}&type=${type}`);
  if (!response.ok) {
    return [];
  }

  return response.json();
}

function formatSubtitle(item: any) {
  if (item?.type === 'ALBUM') {
    return item.artist?.name || 'Album';
  }

  if (item?.type === 'PLAYLIST') {
    return item.artist?.name || 'Playlist';
  }

  return '';
}

function getEntityHref(item: any) {
  if (item?.type === 'ALBUM') return `/album/${item.albumId}`;
  if (item?.type === 'PLAYLIST') return `/playlist/${item.playlistId}`;
  return '#';
}

export default function SearchPage() {
  const router = useRouter();
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchType>('all');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const loadRecentSearches = async () => {
      const searches = await db.getRecentSearches();
      setRecentSearches(searches);
    };

    void loadRecentSearches();

    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!query.trim()) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await fetch(`${getApiBaseUrl()}/api/suggest?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      }
    };

    const timer = setTimeout(() => {
      void fetchSuggestions();
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const loadRecents = async () => {
    const searches = await db.getRecentSearches();
    setRecentSearches(searches);
  };

  const handleSearch = async (searchQuery: string) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    setLoading(true);
    setIsFocused(false);

    await db.addRecentSearch(trimmedQuery);
    await loadRecents();

    try {
      const [songs, videos, albums, artists, playlists] = await Promise.all([
        fetchSearchType(trimmedQuery, 'song'),
        fetchSearchType(trimmedQuery, 'video'),
        fetchSearchType(trimmedQuery, 'album'),
        fetchSearchType(trimmedQuery, 'artist'),
        fetchSearchType(trimmedQuery, 'playlist'),
      ]);

      setResults({
        song: Array.isArray(songs) ? songs : [],
        video: Array.isArray(videos) ? videos : [],
        album: Array.isArray(albums) ? albums : [],
        artist: Array.isArray(artists) ? artists : [],
        playlist: Array.isArray(playlists) ? playlists : [],
        all: [
          ...(Array.isArray(songs) ? songs.slice(0, 4) : []),
          ...(Array.isArray(artists) ? artists.slice(0, 4) : []),
          ...(Array.isArray(albums) ? albums.slice(0, 4) : []),
          ...(Array.isArray(playlists) ? playlists.slice(0, 4) : []),
          ...(Array.isArray(videos) ? videos.slice(0, 4) : []),
        ],
      });
    } catch (error) {
      console.error('Search failed:', error);
      setResults(emptyResults);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRecentSearch = async (searchQuery: string) => {
    await db.removeRecentSearch(searchQuery);
    await loadRecents();
  };

  const handleSuggestionPick = (searchQuery: string) => {
    const nextQuery = searchQuery.trim();
    if (!nextQuery) return;

    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    setQuery(nextQuery);
    setSuggestions([]);
    void handleSearch(nextQuery);
  };

  const activeResults = results[activeTab];
  const hasAnyResults = Object.values(results).some((entries) => entries.length > 0);

  return (
    <main className="min-h-screen pb-32 md:pb-16">
      <div className="page-shell pt-4 md:pt-6">
        <section className="glass-panel-strong sticky top-3 z-20 rounded-[28px] p-3 md:static md:p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-full p-2 text-white transition hover:bg-white/10"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleSearch(query);
              }}
              className="relative flex-1"
            >
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/45" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => {
                  if (blurTimeoutRef.current) {
                    clearTimeout(blurTimeoutRef.current);
                    blurTimeoutRef.current = null;
                  }
                  setIsFocused(true);
                }}
                onBlur={() => {
                  blurTimeoutRef.current = setTimeout(() => setIsFocused(false), 140);
                }}
                placeholder="Cari lagu, video, album, artis, atau playlist"
                autoFocus
                className="w-full rounded-[22px] border border-white/8 bg-white/6 py-3 pl-12 pr-11 text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/40"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setResults(emptyResults);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 transition hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </form>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activeTab === tab.key
                    ? 'border-transparent bg-[var(--accent)] text-black shadow-[var(--accent-glow)]'
                    : 'border-white/10 bg-transparent text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </section>

        {query && isFocused && suggestions.length > 0 && (
          <div className="glass-panel mt-4 overflow-hidden rounded-[24px]">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion}-${index}`}
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-white/5"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSuggestionPick(suggestion)}
              >
                <div className="flex items-center gap-4">
                  <SearchIcon className="h-5 w-5 text-white/50" />
                  <span className="text-base text-white">{suggestion}</span>
                </div>
                <ArrowUpLeft className="h-5 w-5 text-white/50" />
              </button>
            ))}
          </div>
        )}

        {!query && recentSearches.length > 0 && (
          <section className="glass-panel mt-4 overflow-hidden rounded-[24px]">
            <div className="border-b border-white/5 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.28em] text-white/35">Recent Search</div>
              <h2 className="mt-1 text-lg font-semibold text-white">Pencarian terbaru</h2>
            </div>

            {recentSearches.map((search) => (
              <div
                key={search.query}
                className="flex items-center justify-between px-4 py-3 transition hover:bg-white/5"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSuggestionPick(search.query)}
              >
                <div className="flex items-center gap-4">
                  <History className="h-5 w-5 text-white/45" />
                  <div>
                    <div className="text-sm font-medium text-white">{search.query}</div>
                    <div className="text-xs text-white/40">Tap untuk cari lagi</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleRemoveRecentSearch(search.query);
                    }}
                    className="rounded-full p-2 text-white/45 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setQuery(search.query);
                      setIsFocused(true);
                    }}
                    className="rounded-full p-2 text-white/45 transition hover:bg-white/10 hover:text-white"
                  >
                    <ArrowUpLeft className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        <div className="mt-4">
          {loading ? (
            <SearchSkeleton />
          ) : activeResults.length > 0 ? (
            <div className="glass-panel rounded-[28px] p-2 sm:p-3">
              {activeResults.map((item, index) => {
                if (item?.type === 'ARTIST') {
                  return <ArtistItem key={`${item.artistId}-${index}`} artist={item} />;
                }

                if (item?.type === 'ALBUM' || item?.type === 'PLAYLIST') {
                  return <BrowseEntityItem key={`${item.type}-${item.albumId || item.playlistId}-${index}`} item={item} />;
                }

                return <TrackItem key={`${item.videoId}-${index}`} track={item} playMode="similar" />;
              })}
            </div>
          ) : query ? (
            <EmptyState
              icon={SearchIcon}
              title="Tidak ada hasil yang cocok"
              description="Coba ganti kata kunci atau pindah tab untuk melihat kategori lain."
            />
          ) : recentSearches.length === 0 ? (
            <EmptyState
              icon={SearchIcon}
              title="Semua yang kamu butuhkan"
              description="Cari lagu, video, album, artis, dan playlist dari satu tempat seperti di aplikasi."
            />
          ) : !hasAnyResults ? null : null}
        </div>
      </div>
    </main>
  );
}

function BrowseEntityItem({ item }: { item: any }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(getEntityHref(item))}
      className="flex w-full items-center gap-4 rounded-xl p-3 text-left transition hover:bg-white/5"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/10">
        <Image
          src={getHighResImage(item.thumbnails?.[item.thumbnails.length - 1]?.url, 200)}
          alt={item.name || 'Item'}
          fill
          sizes="48px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1 border-b border-white/5 pb-3">
        <div className="truncate text-sm font-medium text-white">{item.name || 'Untitled'}</div>
        <div className="mt-1 truncate text-xs text-white/45">
          {item.type === 'ALBUM' ? 'Album' : 'Playlist'}
          {formatSubtitle(item) ? ` • ${formatSubtitle(item)}` : ''}
        </div>
      </div>
    </button>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="mt-20 flex flex-col items-center justify-center text-center text-white/50">
      <Icon className="mb-4 h-16 w-16 opacity-20" />
      <p className="text-lg font-medium text-white/75">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-7">{description}</p>
    </div>
  );
}
