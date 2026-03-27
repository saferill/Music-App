'use client';

import { useState, useEffect } from 'react';
import { Track } from '@/lib/store';
import { db, RecentSearch } from '@/lib/db';
import { TrackItem } from '@/components/TrackItem';
import { ArtistItem } from '@/components/ArtistItem';
import { Search as SearchIcon, Loader2, ArrowLeft, X, ArrowUpLeft, History } from 'lucide-react';
import { motion } from 'motion/react';
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
    
    // Save to recent searches
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

  return (
    <main className="min-h-screen pt-6 pb-24">
      <div className="px-4 mb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white hover:bg-white/10 p-2 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <form onSubmit={onSubmit} className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder="Mencari"
            autoFocus
            className="w-full bg-[#2A2A2A] text-white rounded-full py-2.5 px-4 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all border border-white/5"
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
              <X className="w-5 h-5" />
            </button>
          )}
        </form>
      </div>

      <div className="flex overflow-x-auto no-scrollbar gap-3 mb-6 px-4 snap-x snap-mandatory scroll-smooth">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-colors border snap-center ${
              activeTab === tab 
                ? 'bg-white/20 text-white border-white/20' 
                : 'bg-transparent text-white/70 border-white/10 hover:bg-white/5'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {query && isFocused && (
        <div className="mb-6">
          {suggestions.map((suggestion, index) => (
            <div 
              key={index}
              className="flex items-center justify-between px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors"
              onClick={() => {
                setQuery(suggestion);
                handleSearch(suggestion);
              }}
            >
              <div className="flex items-center gap-4">
                <SearchIcon className="w-5 h-5 text-white/50" />
                <span className="text-white text-base">{suggestion}</span>
              </div>
              <ArrowUpLeft className="w-5 h-5 text-white/50" />
            </div>
          ))}
        </div>
      )}

      {!query && !loading && results.length === 0 && recentSearches.length > 0 && (
        <div className="mb-6">
          {recentSearches.map((search, index) => (
            <div 
              key={`recent-${index}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors"
              onClick={() => {
                setQuery(search.query);
                handleSearch(search.query);
              }}
            >
              <div className="flex items-center gap-4">
                <History className="w-6 h-6 text-white/50" />
                <span className="text-white text-base">{search.query}</span>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={(e) => handleRemoveRecentSearch(e, search.query)}
                  className="text-white/50 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuery(search.query);
                    setIsFocused(true);
                  }}
                  className="text-white/50 hover:text-white p-1"
                >
                  <ArrowUpLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-4">
        {loading ? (
          <SearchSkeleton />
        ) : results.length > 0 ? (
          <div className="space-y-1 border-t border-white/10 pt-4">
            {results.filter(item => {
              if (activeTab === 'Semua') return true;
              if (activeTab === 'Lagu') return item.type === 'SONG';
              if (activeTab === 'Video') return item.type === 'VIDEO';
              if (activeTab === 'Artis') return item.type === 'ARTIST';
              return false;
            }).map((item, index) => (
              item.type === 'ARTIST' 
                ? <ArtistItem key={`artist-${item.artistId}-${index}`} artist={item} />
                : <TrackItem key={`track-${item.videoId}-${index}`} track={item} queue={results.filter(r => r.type !== 'ARTIST')} />
            ))}
          </div>
        ) : query ? (
          <div className="flex flex-col items-center justify-center mt-20 text-white/50">
            <SearchIcon className="w-16 h-16 mb-4 opacity-20" />
            <p>Tidak ada hasil yang ditemukan</p>
          </div>
        ) : recentSearches.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 text-white/50">
            <SearchIcon className="w-16 h-16 mb-4 opacity-20" />
            <p>Cari lagu, album, atau artis</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
