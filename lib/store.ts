import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { normalizeTrack } from '@/lib/media';

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

  void fetch(`/api/lyrics?${params.toString()}`).catch(() => {
    prefetchedLyrics.delete(key);
  });
}

function primeQueueNeighbor(queue: Track[] | undefined, index: number) {
  if (!queue?.length) return;

  const nextTrack = queue[index + 1];
  if (nextTrack) {
    primeLyrics(nextTrack);
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
  
  playTrack: (track: Track, queue?: Track[], context?: 'playlist' | 'similar') => void;
  playNext: () => Promise<void>;
  playPrev: () => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setExpanded: (expanded: boolean) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  addToQueue: (track: Track) => void;
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

      playTrack: (rawTrack, rawQueue, context = 'similar') => {
        const track = sanitizeTrack(rawTrack);
        const queue = sanitizeQueue(rawQueue);
        const queueIndex = queue ? Math.max(0, queue.findIndex((t) => t.videoId === track.videoId)) : 0;

        const state = get();
        const newHistoryItem = { track, playedAt: Date.now() };
        
        const filteredHistory = state.history.filter(h => h.track.videoId !== track.videoId);
        const newHistory = [newHistoryItem, ...filteredHistory].slice(0, 500);
        
        const newPlayCounts = { ...state.playCounts };
        newPlayCounts[track.videoId] = (newPlayCounts[track.videoId] || 0) + 1;

        set({
          currentTrack: track,
          isPlaying: true,
          queue: queue || [track],
          queueIndex,
          progress: 0,
          playContext: context,
          history: newHistory,
          playCounts: newPlayCounts,
        });

        primeLyrics(track);
        primeQueueNeighbor(queue, queueIndex);
      },

      playNext: async () => {
        const { queue, queueIndex, playContext, currentTrack } = get();
        if (queueIndex < queue.length - 1) {
          const nextIndex = queueIndex + 1;
          const nextTrack = queue[nextIndex];
          
          const state = get();
          const newHistoryItem = { track: nextTrack, playedAt: Date.now() };
          const filteredHistory = state.history.filter(h => h.track.videoId !== nextTrack.videoId);
          const newHistory = [newHistoryItem, ...filteredHistory].slice(0, 500);
          
          const newPlayCounts = { ...state.playCounts };
          newPlayCounts[nextTrack.videoId] = (newPlayCounts[nextTrack.videoId] || 0) + 1;

          set({
            currentTrack: nextTrack,
            queueIndex: nextIndex,
            isPlaying: true,
            progress: 0,
            history: newHistory,
            playCounts: newPlayCounts,
          });

          primeLyrics(nextTrack);
          primeQueueNeighbor(queue, nextIndex);
        } else {
          if (playContext === 'similar' && currentTrack) {
            try {
              const res = await fetch(`/api/upnext?id=${currentTrack.videoId}`);
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                const nextTracks = data.filter((t: any) => t.videoId !== currentTrack.videoId);
                if (nextTracks.length > 0) {
                  const nextTrack = nextTracks[0];
                  
                  const state = get();
                  const newHistoryItem = { track: nextTrack, playedAt: Date.now() };
                  const filteredHistory = state.history.filter(h => h.track.videoId !== nextTrack.videoId);
                  const newHistory = [newHistoryItem, ...filteredHistory].slice(0, 500);
                  
                  const newPlayCounts = { ...state.playCounts };
                  newPlayCounts[nextTrack.videoId] = (newPlayCounts[nextTrack.videoId] || 0) + 1;

                  set({
                    queue: [...queue, ...nextTracks],
                    currentTrack: nextTrack,
                    queueIndex: queueIndex + 1,
                    isPlaying: true,
                    progress: 0,
                    history: newHistory,
                    playCounts: newPlayCounts,
                  });

                  primeLyrics(nextTrack);
                  primeLyrics(nextTracks[1]);
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
        const { queue, queueIndex, progress } = get();
        if (progress > 3) {
          set({ progress: 0 });
          return;
        }
        if (queueIndex > 0) {
          const prevIndex = queueIndex - 1;
          const prevTrack = queue[prevIndex];
          
          const state = get();
          const newHistoryItem = { track: prevTrack, playedAt: Date.now() };
          const filteredHistory = state.history.filter(h => h.track.videoId !== prevTrack.videoId);
          const newHistory = [newHistoryItem, ...filteredHistory].slice(0, 500);
          
          const newPlayCounts = { ...state.playCounts };
          newPlayCounts[prevTrack.videoId] = (newPlayCounts[prevTrack.videoId] || 0) + 1;

          set({
            currentTrack: prevTrack,
            queueIndex: prevIndex,
            isPlaying: true,
            progress: 0,
            history: newHistory,
            playCounts: newPlayCounts,
          });

          primeLyrics(prevTrack);
        }
      },

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
