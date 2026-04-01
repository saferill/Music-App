import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { normalizeTrack } from '@/lib/media';
import { getApiBaseUrl } from '@/lib/config';

export interface Track {
  videoId: string;
  name: string;
  artist: { name: string; artistId?: string } | { name: string; artistId?: string }[];
  thumbnails: { url: string; width: number; height: number }[];
  duration?: number;
  isExplicit?: boolean;
}

export interface HistoryItem {
  track: Track;
  playedAt: number;
}

const prefetchedLyrics = new Set<string>();
const prefetchedStreams = new Set<string>();

function getArtistLabel(track: Track) {
  return Array.isArray(track.artist)
    ? track.artist.map((artist) => artist.name).filter(Boolean).join(', ')
    : track.artist?.name || '';
}

function getLyricsPrefetchKey(track: Track) {
  return [track.videoId, track.name, getArtistLabel(track), track.duration || ''].join(':');
}

function primeLyrics(track?: Track | null) {
  if (typeof window === 'undefined' || !track?.videoId) return;

  const key = getLyricsPrefetchKey(track);
  if (prefetchedLyrics.has(key)) return;

  prefetchedLyrics.add(key);
  if (prefetchedLyrics.size > 500) prefetchedLyrics.clear();

  const params = new URLSearchParams({
    id: track.videoId,
    title: track.name,
    artist: getArtistLabel(track),
  });

  if (track.duration) {
    params.set('duration', String(track.duration));
  }

  void fetch(`${getApiBaseUrl()}/api/lyrics?${params.toString()}`).catch(() => {
    prefetchedLyrics.delete(key);
  });
}

function primeStream(track?: Track | null) {
  if (typeof window === 'undefined' || !track?.videoId) return;

  const key = track.videoId;
  if (prefetchedStreams.has(key)) return;

  prefetchedStreams.add(key);
  if (prefetchedStreams.size > 500) prefetchedStreams.clear();

  void fetch(`${getApiBaseUrl()}/api/stream?id=${encodeURIComponent(track.videoId)}`).catch(() => {
    prefetchedStreams.delete(key);
  });
}

function primeQueueNeighbor(queue: Track[] | undefined, index: number) {
  if (!queue?.length) return;

  const nextTrack = queue[index + 1];
  if (nextTrack) {
    primeLyrics(nextTrack);
    primeStream(nextTrack);
  }
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  isExpanded: boolean;
  volume: number;
  progress: number;
  duration: number;
  playContext: 'playlist' | 'similar';
  trackToAdd: Track | null;
  history: HistoryItem[];
  playCounts: Record<string, number>;
  dominantColor: string | null;
  
  repeatMode: 'none' | 'one' | 'all';
  isShuffled: boolean;
  shuffledQueue: Track[];
  
  playTrack: (track: Track, queue?: Track[], context?: 'playlist' | 'similar') => void;
  playNext: () => Promise<void>;
  playPrev: () => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setExpanded: (expanded: boolean) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  setRepeatMode: (mode: 'none' | 'one' | 'all') => void;
  addToQueue: (track: Track) => void;
  addToNext: (track: Track) => void;
  setTrackToAdd: (track: Track | null) => void;
  setDominantColor: (color: string | null) => void;
}

function sanitizeTrack(track: Track | Record<string, unknown>) {
  return normalizeTrack(track as Record<string, any>) as Track;
}

function sanitizeQueue(queue?: Track[]) {
  return queue?.map((track) => sanitizeTrack(track));
}

function sanitizeHistory(history?: HistoryItem[]) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item): item is HistoryItem => Boolean(item?.track))
    .map((item) => ({
      ...item,
      track: sanitizeTrack(item.track),
    }));
}

const syncNativeQueue = async (state: any) => {
  const { queue, queueIndex, isShuffled, shuffledQueue, currentTrack, isPlaying } = state;
  const activeQueue = isShuffled ? (shuffledQueue || []) : (queue || []);
  const activeIndex = isShuffled 
    ? (shuffledQueue || []).findIndex((t: any) => t.videoId === currentTrack?.videoId)
    : queueIndex;

  try {
    const { nativeAudio, isAndroidNativeAudio } = await import('./native-audio');
    if (!isAndroidNativeAudio()) return;

    // Cap at 100 for IPC stability, centered around current index
    const windowSize = 100;
    const start = Math.max(0, activeIndex - 10); 
    const end = Math.min(activeQueue.length, start + windowSize);
    const queueWindow = activeQueue.slice(start, end);
    const relativeIndex = activeIndex - start;

    const tracks = queueWindow.map((t: any) => ({
      trackId: t.videoId,
      url: t.videoId === currentTrack?.videoId ? '' : '', // URLs handled via primeStream
      title: t.name || t.title,
      artist: typeof t.artist === 'string' ? t.artist : t.artist?.name || 'Unknown',
      artworkUrl: (t.thumbnails && t.thumbnails.length > 0) ? t.thumbnails[t.thumbnails.length - 1].url : '',
    }));

    await nativeAudio.setQueue({
      tracks,
      startIndex: relativeIndex >= 0 ? relativeIndex : 0,
      autoplay: isPlaying,
    });
  } catch (e) {
    console.error('Failed to sync native queue', e);
  }
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      queue: [],
      queueIndex: -1,
      isPlaying: false,
      isExpanded: false,
      volume: 100,
      progress: 0,
      duration: 0,
      playContext: 'similar',
      trackToAdd: null,
      history: [],
      playCounts: {},
      dominantColor: null,
      repeatMode: 'none',
      isShuffled: false,
      shuffledQueue: [],

      playTrack: (rawTrack, rawQueue, context = 'similar') => {
        const track = sanitizeTrack(rawTrack);
        const queue = (rawQueue && rawQueue.length > 0) ? (sanitizeQueue(rawQueue) || [track]) : [track];
        const queueIndex = queue.findIndex((t) => t.videoId === track.videoId);
        const finalIndex = queueIndex >= 0 ? queueIndex : 0;

        const state = get();
        const newHistoryItem = { track, playedAt: Date.now() };
        const filteredHistory = state.history.filter(h => h.track.videoId !== track.videoId);
        const newHistory = [newHistoryItem, ...filteredHistory].slice(0, 500);
        
        const newPlayCounts = { ...state.playCounts };
        newPlayCounts[track.videoId] = (newPlayCounts[track.videoId] || 0) + 1;

        set({
          currentTrack: track,
          isPlaying: true,
          queue,
          queueIndex: finalIndex,
          progress: 0,
          playContext: context,
          history: newHistory,
          playCounts: newPlayCounts,
        });

        if (!track) return;
        primeLyrics(track);
        primeStream(track);
        primeQueueNeighbor(queue || [], finalIndex);

        // Sync to native queue immediately
        syncNativeQueue(get());

        // SimpMusic Concept: If playing a single track or at the end of a small queue,
        // automatically populate the next 50 tracks from the 'next' API (Automix/Radio)
        if (queue && queue.length <= 5 && context === 'similar' && track) {
          const trackId = track.videoId;
          fetch(`${getApiBaseUrl()}/api/next?id=${trackId}`)
            .then(res => res.json())
            .then(data => {
              if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
                const nextTracks = sanitizeQueue(data.tracks).filter(t => t.videoId !== track.videoId);
                set(s => ({
                  queue: [...s.queue, ...nextTracks]
                }));
              }
            }).catch(console.error);
        }
      },

      playNext: async () => {
        const { queue, queueIndex, playContext, currentTrack, repeatMode, isShuffled, shuffledQueue } = get();
        
        if (repeatMode === 'one' && currentTrack) {
          set({ progress: 0, isPlaying: true });
          return;
        }

        const activeQueue = isShuffled ? shuffledQueue : (queue || []);
        const activeIndex = isShuffled 
          ? (shuffledQueue || []).findIndex(t => t.videoId === currentTrack?.videoId)
          : queueIndex;

        if (activeIndex < activeQueue.length - 1) {
          const nextIndex = activeIndex + 1;
          const nextTrack = activeQueue[nextIndex];
          if (!nextTrack) return;
          
          const state = get();
          const newHistoryItem = { track: nextTrack, playedAt: Date.now() };
          const filteredHistory = state.history.filter(h => h.track.videoId !== nextTrack.videoId);
          const newHistory = [newHistoryItem, ...filteredHistory].slice(0, 500);
          
          const newPlayCounts = { ...state.playCounts };
          newPlayCounts[nextTrack.videoId] = (newPlayCounts[nextTrack.videoId] || 0) + 1;

          set({
            currentTrack: nextTrack,
            queueIndex: isShuffled ? (queue || []).findIndex(t => t.videoId === nextTrack.videoId) : nextIndex,
            isPlaying: true,
            progress: 0,
            history: newHistory,
            playCounts: newPlayCounts,
          });

          primeLyrics(nextTrack);
          primeStream(nextTrack);
          primeQueueNeighbor(activeQueue, nextIndex);
        } else {
          if (repeatMode === 'all' && activeQueue.length > 0) {
            const nextTrack = activeQueue[0];
            if (nextTrack) {
               set({
                currentTrack: nextTrack,
                queueIndex: isShuffled ? (queue || []).findIndex(t => t.videoId === nextTrack.videoId) : 0,
                isPlaying: true,
                progress: 0,
              });
              void syncNativeQueue(get());
            }
            return;
          }

          if (playContext === 'similar' && currentTrack?.videoId) {
            const trackId = currentTrack.videoId;
            // Don't stop playing while fetching to keep it smooth
            try {
              const res = await fetch(`${getApiBaseUrl()}/api/next?id=${trackId}`);
              const data = await res.json();
              if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
                const nextTracks = sanitizeQueue(data.tracks).filter((t) => t.videoId !== currentTrack.videoId);

                if (nextTracks.length > 0) {
                  const nextTrack = nextTracks[0];
                  
                  const activeState = get();
                  const newHistoryItem = { track: nextTrack, playedAt: Date.now() };
                  const filteredHistory = activeState.history.filter(h => h.track.videoId !== nextTrack.videoId);
                  const newHistory = [newHistoryItem, ...filteredHistory].slice(0, 500);
                  
                  const newPlayCounts = { ...activeState.playCounts };
                  newPlayCounts[nextTrack.videoId] = (newPlayCounts[nextTrack.videoId] || 0) + 1;

                  set({
                    queue: [...(queue || []), ...nextTracks],
                    currentTrack: nextTrack,
                    queueIndex: (queue || []).length, // It was at end, so new index is the old length
                    isPlaying: true,
                    progress: 0,
                    history: newHistory,
                    playCounts: newPlayCounts,
                  });

                  if (isShuffled) {
                    set(s => ({ shuffledQueue: [...(s.shuffledQueue || []), ...nextTracks] }));
                  }

                  primeLyrics(nextTrack);
                  primeStream(nextTrack);
                  void syncNativeQueue(get());
                  return;
                }
              }
            } catch (e) {
              console.error(e);
            }
          }
          set({ isPlaying: false, progress: 0 });
        }
      },

      playPrev: () => {
        const { queue, queueIndex, progress, isShuffled, shuffledQueue, currentTrack } = get();
        if (progress > 5) {
          set({ progress: 0 });
          return;
        }

        const activeQueue = isShuffled ? shuffledQueue : (queue || []);
        const activeIndex = isShuffled 
          ? (shuffledQueue || []).findIndex(t => t.videoId === currentTrack?.videoId)
          : queueIndex;

        if (activeIndex > 0) {
          const prevIndex = activeIndex - 1;
          const prevTrack = activeQueue[prevIndex];
          
          const state = get();
          const newHistoryItem = { track: prevTrack, playedAt: Date.now() };
          const filteredHistory = state.history.filter(h => h.track.videoId !== prevTrack.videoId);
          const newHistory = [newHistoryItem, ...filteredHistory].slice(0, 500);
          
          const newPlayCounts = { ...state.playCounts };
          newPlayCounts[prevTrack.videoId] = (newPlayCounts[prevTrack.videoId] || 0) + 1;

          set({
            currentTrack: prevTrack,
            queueIndex: isShuffled ? (queue || []).findIndex(t => t.videoId === prevTrack.videoId) : prevIndex,
            isPlaying: true,
            progress: 0,
            history: newHistory,
            playCounts: newPlayCounts,
          });

          primeLyrics(prevTrack);
          primeStream(prevTrack);
        } else {
          set({ progress: 0 });
        }
      },

      toggleShuffle: () => {
        set((state) => {
          let newState;
          if (state.isShuffled) {
            newState = { isShuffled: false, shuffledQueue: [] };
          } else {
            const shuffled = [...(state.queue || [])].sort(() => Math.random() - 0.5);
            newState = { isShuffled: true, shuffledQueue: shuffled };
          }
          const updatedState = { ...state, ...newState };
          void syncNativeQueue(updatedState);
          return newState;
        });
      },

      setRepeatMode: (mode) => set({ repeatMode: mode }),

      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setPlaying: (playing) => set({ isPlaying: playing }),
      setExpanded: (expanded) => set({ isExpanded: expanded }),
      setProgress: (progress) => set({ progress }),
      setDuration: (duration) => set({ duration }),
      setVolume: (volume) => set({ volume }),
      addToQueue: (rawTrack) => {
        const track = sanitizeTrack(rawTrack);
        set((state) => ({ queue: [...state.queue, track] }));
      },
      addToNext: (rawTrack) => {
        const track = sanitizeTrack(rawTrack);
        set((state) => {
          const newQueue = [...state.queue];
          newQueue.splice(state.queueIndex + 1, 0, track);
          return { queue: newQueue };
        });
      },
      setTrackToAdd: (rawTrack) => {
        const track = rawTrack ? sanitizeTrack(rawTrack) : null;
        set({ trackToAdd: track });
      },
      setDominantColor: (color) => set({ dominantColor: color }),
    }),
    {
      name: 'player-storage',
      partialize: (state) => ({ 
        history: state.history, 
        playCounts: state.playCounts,
        volume: state.volume
      }),
      merge: (persistedState, currentState) => {
        const typedState = (persistedState as Partial<PlayerState>) || {};

        return {
          ...currentState,
          ...typedState,
          history: sanitizeHistory(typedState.history),
          playCounts: typedState.playCounts || currentState.playCounts,
          volume: typedState.volume ?? currentState.volume,
        };
      },
    }
  )
);
