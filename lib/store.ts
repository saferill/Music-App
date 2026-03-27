import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
        const track = {
          videoId: rawTrack.videoId,
          name: rawTrack.name,
          artist: rawTrack.artist,
          thumbnails: rawTrack.thumbnails,
          duration: rawTrack.duration,
          isExplicit: rawTrack.isExplicit,
        };
        const queue = rawQueue ? rawQueue.map(t => ({
          videoId: t.videoId,
          name: t.name,
          artist: t.artist,
          thumbnails: t.thumbnails,
          duration: t.duration,
          isExplicit: t.isExplicit,
        })) : undefined;

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
          queueIndex: queue ? queue.findIndex((t) => t.videoId === track.videoId) : 0,
          progress: 0,
          playContext: context,
          history: newHistory,
          playCounts: newPlayCounts,
        });
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
        }
      },

      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setPlaying: (playing) => set({ isPlaying: playing }),
      setExpanded: (expanded) => set({ isExpanded: expanded }),
      setProgress: (progress) => set({ progress }),
      setDuration: (duration) => set({ duration }),
      setVolume: (volume) => set({ volume }),
      addToQueue: (rawTrack) => {
        const track = {
          videoId: rawTrack.videoId,
          name: rawTrack.name,
          artist: rawTrack.artist,
          thumbnails: rawTrack.thumbnails,
          duration: rawTrack.duration,
          isExplicit: rawTrack.isExplicit,
        };
        set((state) => ({ queue: [...state.queue, track] }));
      },
      setTrackToAdd: (rawTrack) => {
        const track = rawTrack ? {
          videoId: rawTrack.videoId,
          name: rawTrack.name,
          artist: rawTrack.artist,
          thumbnails: rawTrack.thumbnails,
          duration: rawTrack.duration,
          isExplicit: rawTrack.isExplicit,
        } : null;
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
    }
  )
);
