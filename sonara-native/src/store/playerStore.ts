import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer, { State, RepeatMode as RNRepeatMode } from 'react-native-track-player';
import { getPlayerData } from '../lib/innertube';
import { resolveStreamFromHarmonySources } from '../lib/stream-source';

export interface Track {
  videoId: string;
  name: string;
  artist: { name: string; artistId?: string } | { name: string; artistId?: string }[];
  thumbnails: { url: string; width: number; height: number }[];
  duration?: number;
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  repeatMode: 'none' | 'one' | 'all';
  isShuffled: boolean;
  
  playTrack: (track: Track, queue?: Track[]) => Promise<void>;
  togglePlay: () => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrev: () => Promise<void>;
  setRepeatMode: (mode: 'none' | 'one' | 'all') => void;
  toggleShuffle: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      queue: [],
      isPlaying: false,
      repeatMode: 'none',
      isShuffled: false,

      playTrack: async (track, newQueue) => {
        try {
          // 1. Resolve Stream URL
          const streamData = await resolveStreamFromHarmonySources(track.videoId);
          if (!streamData?.url) throw new Error('No stream URL');

          // 2. Prepare TrackPlayer
          await TrackPlayer.reset();
          
          const trackToPlay = {
            id: track.videoId,
            url: streamData.url,
            title: track.name,
            artist: Array.isArray(track.artist) ? track.artist[0].name : track.artist.name,
            artwork: track.thumbnails[track.thumbnails.length - 1]?.url,
            duration: track.duration,
          };

          await TrackPlayer.add([trackToPlay]);
          
          // 3. Update Store
          set({ 
            currentTrack: track, 
            queue: newQueue || [track],
            isPlaying: true 
          });

          await TrackPlayer.play();

          // 4. Handle auto-queue (SimpMusic Style)
          if (!newQueue || newQueue.length <= 1) {
            // Fetch similar tracks in background
            fetch(`https://musicapp-lime.vercel.app/api/next?id=${track.videoId}`)
              .then(res => res.json())
              .then(async (data) => {
                if (data.tracks) {
                  const nextTracks = data.tracks.map((t: any) => ({
                    id: t.videoId,
                    url: '', // Will be resolved when needed (TrackPlayer handles this via lazy-load if we wrap it, 
                             // but for now we'll just add basic info)
                    title: t.name,
                    artist: t.artist?.name || 'Unknown',
                    artwork: t.thumbnails?.[0]?.url,
                  }));
                  // Note: In a production app, we'd resolve URLs on the fly using a TrackPlayer capability
                  set(state => ({ queue: [...state.queue, ...data.tracks] }));
                }
              });
          }
        } catch (e) {
          console.error('PlayTrack Error:', e);
        }
      },

      togglePlay: async () => {
        const state = await TrackPlayer.getPlaybackState();
        if (state.state === State.Playing) {
          await TrackPlayer.pause();
          set({ isPlaying: false });
        } else {
          await TrackPlayer.play();
          set({ isPlaying: true });
        }
      },

      skipNext: async () => {
        await TrackPlayer.skipToNext();
      },

      skipPrev: async () => {
        await TrackPlayer.skipToPrevious();
      },

      setRepeatMode: (mode) => {
        let rnMode = RNRepeatMode.Off;
        if (mode === 'one') rnMode = RNRepeatMode.Track;
        if (mode === 'all') rnMode = RNRepeatMode.Queue;
        TrackPlayer.setRepeatMode(rnMode);
        set({ repeatMode: mode });
      },

      toggleShuffle: () => {
        // TrackPlayer handles shuffle complexly, usually we manage the queue order
        set(state => ({ isShuffled: !state.isShuffled }));
      },
    }),
    {
      name: 'sonara-player-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        repeatMode: state.repeatMode,
        isShuffled: state.isShuffled
      }),
    }
  )
);
