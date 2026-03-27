'use client';

import { useState, useEffect } from 'react';
import { db, RecentSearch } from '@/lib/db';
import { TrackItem } from '@/components/TrackItem';
import { ArtistItem } from '@/components/ArtistItem';
import { Search as SearchIcon, ArrowLeft, X, ArrowUpLeft, History } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SearchSkeleton } from '@/components/SearchSkeleton';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Semua');
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  const tabs = ['Semua', 'Lagu', 'Video', 'Album', 'Artis', 'Daftar putar'];

  useEffect(() => {
    const loadRecentSearches = async () => {
      const searches = await db.getRecentSearches();
      setRecentSearches(searches);
    };

    loadRecentSearches();
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.trim()) {
        try {
          const res = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`);
          const data = await res.json();
          setSuggestions(data);
        } catch (error) {
          console.error('Error fetching suggestions:', error);
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setIsFocused(false);

    await db.addRecentSearch(searchQuery);
    const searches = await db.getRecentSearches();
    setRecentSearches(searches);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleRemoveRecentSearch = async (e: React.MouseEvent, queryToRemove: string) => {
    e.stopPropagation();
    await db.removeRecentSearch(queryToRemove);
    const searches = await db.getRecentSearches();
    setRecentSearches(searches);
  };

  const filteredResults = results.filter((item) => {
    if (activeTab === 'Semua') return true;
    if (activeTab === 'Lagu') return item.type === 'SONG';
    if (activeTab === 'Video') return item.type === 'VIDEO';
    if (activeTab === 'Artis') return item.type === 'ARTIST';
    return false;
  });

  return (
    <main className="min-h-screen pb-32 md:pb-16">
      <div className="page-shell pt-4 md:pt-6">
        <section className="glass-panel-strong sticky top-3 z-20 rounded-[28px] p-3 md:static md:p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-full p-2 text-white transition-colors hover:bg-white/10"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>

            <form onSubmit={onSubmit} className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/45" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                placeholder="Cari lagu, artis, atau playlist"
                autoFocus
                className="w-full rounded-[22px] border border-white/8 bg-white/6 py-3 pl-12 pr-11 text-white placeholder:text-white/35 transition-all focus:outline-none focus:ring-1 focus:ring-[#FF7A59]/40"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </form>
          </div>
        </section>

        <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors snap-center ${
                activeTab === tab
                  ? 'border-transparent bg-[#FF7A59] text-black'
                  : 'border-white/10 bg-transparent text-white/70 hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {query && isFocused && suggestions.length > 0 && (
          <div className="glass-panel mt-4 overflow-hidden rounded-[24px]">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-white/5"
                onClick={() => {
                  setQuery(suggestion);
                  handleSearch(suggestion);
                }}
              >
                <div className="flex items-center gap-4">
                  <SearchIcon className="h-5 w-5 text-white/50" />
                  <span className="text-base text-white">{suggestion}</span>
                </div>
                <ArrowUpLeft className="h-5 w-5 text-white/50" />
              </div>
            ))}
          </div>
        )}

        {!query && !loading && results.length === 0 && recentSearches.length > 0 && (
          <div className="glass-panel mt-4 overflow-hidden rounded-[24px]">
            {recentSearches.map((search, index) => (
              <div
                key={`recent-${index}`}
                className="flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-white/5"
                onClick={() => {
                  setQuery(search.query);
                  handleSearch(search.query);
                }}
              >
                <div className="flex items-center gap-4">
                  <History className="h-5 w-5 text-white/50" />
                  <span className="text-base text-white">{search.query}</span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={(e) => handleRemoveRecentSearch(e, search.query)}
                    className="p-1 text-white/50 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuery(search.query);
                      setIsFocused(true);
                    }}
                    className="p-1 text-white/50 hover:text-white"
                  >
                    <ArrowUpLeft className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          {loading ? (
            <SearchSkeleton />
          ) : filteredResults.length > 0 ? (
            <div className="glass-panel rounded-[28px] p-2 sm:p-3">
              {filteredResults.map((item, index) =>
                item.type === 'ARTIST' ? (
                  <ArtistItem key={`artist-${item.artistId}-${index}`} artist={item} />
                ) : (
                  <TrackItem
                    key={`track-${item.videoId}-${index}`}
                    track={item}
                    playMode="similar"
                  />
                )
              )}
            </div>
          ) : query ? (
            <div className="mt-20 flex flex-col items-center justify-center text-white/50">
              <SearchIcon className="mb-4 h-16 w-16 opacity-20" />
              <p>Tidak ada hasil yang ditemukan</p>
            </div>
          ) : recentSearches.length === 0 ? (
            <div className="mt-20 flex flex-col items-center justify-center text-white/50">
              <SearchIcon className="mb-4 h-16 w-16 opacity-20" />
              <p>Cari lagu, album, atau artis</p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
