'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '@/lib/store';
import { db } from '@/lib/db';
import YouTube from 'react-youtube';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Heart,
  ChevronDown,
  ListMusic,
  Mic2,
  Shuffle,
  Repeat,
  MoreVertical,
  Cast,
  ListPlus,
  User,
  Music,
  Loader2,
  Share2,
} from 'lucide-react';
import { cn, getHighResImage } from '@/lib/utils';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LyricsPayload } from '@/lib/lyrics';
import { getApiBaseUrl } from '@/lib/config';
import { playbackNotification } from '@/lib/playback-notification';
import { isAndroidNativeAudio, nativeAudio } from '@/lib/native-audio';
import { SleepTimerDialog } from './SleepTimerDialog';
import { useSleepTimerStore } from '@/lib/sleep-timer';
import { EqualizerDialog } from './EqualizerDialog';
import { useEqStore } from '@/lib/equalizer';

type LyricsStatus = 'idle' | 'loading' | 'ready' | 'unavailable';
type StreamStatus = 'idle' | 'loading' | 'ready' | 'fallback';
type StreamState = {
  trackId: string | null;
  url: string | null;
  status: StreamStatus;
};

export function Player() {
  const router = useRouter();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isExpanded = usePlayerStore((state) => state.isExpanded);
  const progress = usePlayerStore((state) => state.progress);
  const duration = usePlayerStore((state) => state.duration);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const setPlaying = usePlayerStore((state) => state.setPlaying);
  const setExpanded = usePlayerStore((state) => state.setExpanded);
  const setProgress = usePlayerStore((state) => state.setProgress);
  const setDuration = usePlayerStore((state) => state.setDuration);
  const playNext = usePlayerStore((state) => state.playNext);
  const playPrev = usePlayerStore((state) => state.playPrev);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const setRepeatMode = usePlayerStore((state) => state.setRepeatMode);
  const isShuffled = usePlayerStore((state) => state.isShuffled);
  const queue = usePlayerStore((state) => state.queue);
  const queueIndex = usePlayerStore((state) => state.queueIndex);
  const shuffledQueue = usePlayerStore((state) => state.shuffledQueue);
  const playContext = usePlayerStore((state) => state.playContext);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const setTrackToAdd = usePlayerStore((state) => state.setTrackToAdd);
  const dominantColor = usePlayerStore((state) => state.dominantColor);

  const [isLiked, setIsLiked] = useState(false);
  const [lyricsState, setLyricsState] = useState<{
    trackId: string | null;
    data: LyricsPayload | null;
    status: LyricsStatus;
  }>({
    trackId: null,
    data: null,
    status: 'idle',
  });
  const [activeView, setActiveView] = useState<'artwork' | 'lyrics' | 'queue'>('artwork');
  const [imageErrorTrackId, setImageErrorTrackId] = useState<string | null>(null);
  const [sponsorSegments, setSponsorSegments] = useState<Array<{ start: number; end: number }>>([]);
  const playerRef = useRef<any>(null);
  const [streamState, setStreamState] = useState<StreamState>({
    trackId: null,
    url: null,
    status: 'idle',
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nativeTrackKeyRef = useRef<string | null>(null);
  const lyricLineRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const isBackgrounded = useRef(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<any[]>([]);
  const { gains } = useEqStore();
  const lyrics =
    currentTrack && lyricsState.trackId === currentTrack.videoId ? lyricsState.data : null;
  const lyricsStatus: LyricsStatus =
    currentTrack && lyricsState.trackId === currentTrack.videoId ? lyricsState.status : 'idle';
  const imageError = currentTrack ? imageErrorTrackId === currentTrack.videoId : false;
  const isDirectStreamReady = Boolean(
    currentTrack &&
      streamState.trackId === currentTrack.videoId &&
      streamState.status === 'ready' &&
      streamState.url
  );
  const useYoutubeFallback = Boolean(
    currentTrack &&
      streamState.trackId === currentTrack.videoId &&
      streamState.status === 'fallback'
  );
  const useNativeDirectPlayback = isAndroidNativeAudio() && isDirectStreamReady;
  const useWebDirectPlayback = isDirectStreamReady && !useNativeDirectPlayback;
  const activeQueue = isShuffled ? shuffledQueue : queue;
  const activeQueueIndex = isShuffled
    ? activeQueue.findIndex((track: any) => track.videoId === currentTrack?.videoId)
    : queueIndex;

  const { stopAtEndOfTrack, clearTimer } = useSleepTimerStore();
  
  const lastNextCallRef = useRef<number>(0);
  const safePlayNext = useCallback(() => {
    if (stopAtEndOfTrack) {
      setPlaying(false);
      clearTimer();
      return;
    }

    const now = Date.now();
    if (now - lastNextCallRef.current > 2000) {
      lastNextCallRef.current = now;
      void playNext();
    }
  }, [playNext, stopAtEndOfTrack, setPlaying, clearTimer]);

  useEffect(() => {
    if (currentTrack) {
      db.isLiked(currentTrack.videoId).then(setIsLiked);
    } else if (isAndroidNativeAudio()) {
      nativeTrackKeyRef.current = null;
      void nativeAudio.stop();
    }
  }, [currentTrack]);

  useEffect(() => {
    if (!currentTrack) {
      return;
    }

    if (!currentTrack.videoId) {
      queueMicrotask(() => {
        setStreamState({
          trackId: null,
          url: null,
          status: 'fallback',
        });
      });
      return;
    }

    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 2800);

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }

    if (playerRef.current && typeof playerRef.current.stopVideo === 'function') {
      playerRef.current.stopVideo();
    }

    queueMicrotask(() => {
      if (controller.signal.aborted) return;

      setProgress(0);
      setDuration(currentTrack.duration || 0);
      setStreamState({
        trackId: currentTrack.videoId,
        url: null,
        status: 'loading',
      });
    });

    fetch(`${getApiBaseUrl()}/api/stream?id=${encodeURIComponent(currentTrack.videoId)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (controller.signal.aborted) return;

        if (typeof data?.stream?.url === 'string' && data.stream.url) {
          setStreamState({
            trackId: currentTrack.videoId,
            url: data.stream.url,
            status: 'ready',
          });
          return;
        }

        setStreamState({
          trackId: currentTrack.videoId,
          url: null,
          status: 'fallback',
        });
      })
      .catch(() => {
        if (controller.signal.aborted && !timedOut) return;

        setStreamState({
          trackId: currentTrack.videoId,
          url: null,
          status: 'fallback',
        });
      });

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [currentTrack, setDuration, setProgress]);

  // SponsorBlock Fetching
  useEffect(() => {
    if (!currentTrack || !currentTrack.videoId) {
      queueMicrotask(() => {
        setSponsorSegments([]);
      });
      return;
    }

    const controller = new AbortController();
    fetch(`${getApiBaseUrl()}/api/sponsorblock?id=${encodeURIComponent(currentTrack.videoId)}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!controller.signal.aborted) {
          setSponsorSegments(data.segments || []);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSponsorSegments([]);
        }
      });

    return () => controller.abort();
  }, [currentTrack]);

  useEffect(() => {
    if (!isAndroidNativeAudio()) return;

    const listener = nativeAudio.addListener((event) => {
      if (typeof event.position === 'number') {
        setProgress(event.position);
      }

      if (typeof event.duration === 'number' && event.duration > 0) {
        setDuration(event.duration);
      }

      if (typeof event.isPlaying === 'boolean') {
        setPlaying(event.isPlaying);
      }

      if (event.trackId && event.trackId !== currentTrack?.videoId) {
        // Native player transitioned to a new track automatically (e.g. background)
        const state = usePlayerStore.getState();
        const activeQueue = state.isShuffled ? state.shuffledQueue : state.queue;
        const newTrack = activeQueue?.find((t: any) => t.videoId === event.trackId);
        
        if (newTrack) {
          usePlayerStore.setState({ 
            currentTrack: newTrack,
            queueIndex: activeQueue?.findIndex((t: any) => t.videoId === event.trackId) ?? 0,
            progress: event.position || 0,
            duration: event.duration || 0,
            isPlaying: event.isPlaying
          });
        }
      }

      if (event.ended && currentTrack?.videoId && event.trackId === currentTrack.videoId) {
        safePlayNext();
      }

      // Check SponsorBlock for Native
      const position = event.position;
      if (typeof position === 'number' && sponsorSegments.length > 0) {
        const matchingSegment = sponsorSegments.find(s => position >= s.start && position < s.end);
        if (matchingSegment) {
          void nativeAudio.seekTo(matchingSegment.end);
        }
      }
    });

    void nativeAudio.getState().then((state) => {
      if (typeof state.position === 'number') {
        setProgress(state.position);
      }
      if (typeof state.duration === 'number' && state.duration > 0) {
        setDuration(state.duration);
      }
      if (typeof state.isPlaying === 'boolean') {
        setPlaying(state.isPlaying);
      }
    });

    return () => {
      void listener.remove();
    };
  }, [currentTrack?.videoId, playNext, setDuration, setPlaying, setProgress, sponsorSegments]);

  useEffect(() => {
    if (!useNativeDirectPlayback || !currentTrack || !streamState.url) return;

    const artistLabel = Array.isArray(currentTrack.artist)
      ? currentTrack.artist.map((artist) => artist.name).join(', ')
      : currentTrack.artist?.name || 'Unknown Artist';
    const artworkUrl = currentTrack.thumbnails?.[currentTrack.thumbnails.length - 1]?.url;
    const trackKey = `${currentTrack.videoId}:${streamState.url}`;

    if (nativeTrackKeyRef.current === trackKey) return;

    nativeTrackKeyRef.current = trackKey;

    void nativeAudio.setTrack({
      trackId: currentTrack.videoId,
      url: streamState.url,
      title: currentTrack.name?.trim() || 'Unknown',
      artist: artistLabel,
      artworkUrl,
      autoplay: isPlaying,
      position: 0,
    });
  }, [currentTrack, isPlaying, streamState.url, useNativeDirectPlayback]);

  useEffect(() => {
    if (!currentTrack) return;

    const artistLabel = Array.isArray(currentTrack.artist)
      ? currentTrack.artist.map((artist) => artist.name).join(', ')
      : currentTrack.artist?.name || '';
    const controller = new AbortController();
    const params = new URLSearchParams({
      id: currentTrack.videoId,
      title: currentTrack.name?.trim() || 'Unknown',
      artist: artistLabel,
    });

    if (currentTrack.duration) {
      params.set('duration', String(currentTrack.duration));
    }

    lyricLineRefs.current = [];
    queueMicrotask(() => {
      if (controller.signal.aborted) return;

      setLyricsState({
        trackId: currentTrack.videoId,
        data: null,
        status: 'loading',
      });
    });

    fetch(`${getApiBaseUrl()}/api/lyrics?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (controller.signal.aborted) return;

        if (data?.lyrics?.lines?.length) {
          setLyricsState({
            trackId: currentTrack.videoId,
            data: data.lyrics,
            status: 'ready',
          });
        } else {
          setLyricsState({
            trackId: currentTrack.videoId,
            data: null,
            status: 'unavailable',
          });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLyricsState({
            trackId: currentTrack.videoId,
            data: null,
            status: 'unavailable',
          });
        }
      });

    return () => controller.abort();
  }, [currentTrack]);

  const handleLike = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (!currentTrack) return;
      if (isLiked) {
        await db.removeLikedSong(currentTrack.videoId);
        setIsLiked(false);
      } else {
        await db.addLikedSong(currentTrack);
        setIsLiked(true);
      }
    },
    [currentTrack, isLiked]
  );

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentTrack) return;

    const artistLabel = Array.isArray(currentTrack.artist)
      ? currentTrack.artist.map((a) => a.name).join(', ')
      : currentTrack.artist?.name || 'Unknown Artist';

    const shareData = {
      title: currentTrack.name,
      text: `Dengarkan "${currentTrack.name}" oleh ${artistLabel} di Sonara`,
      url: `${window.location.origin}/search?q=${encodeURIComponent(currentTrack.name + ' ' + artistLabel)}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert('Link disalin ke clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  }, [currentTrack]);

  const handleQueueTrackSelect = useCallback(
    (track: any) => {
      if (!track) return;

      const queueForPlayback = activeQueue.length > 0 ? activeQueue : [track];
      const context = queueForPlayback.length > 1 ? 'playlist' : playContext;
      usePlayerStore.getState().playTrack(track, queueForPlayback, context);
    },
    [activeQueue, playContext]
  );

  const onReady = useCallback(
    (event: any) => {
      playerRef.current = event.target;
      if (isPlaying) {
        try {
          event.target.playVideo();
        } catch (e) {
          console.warn('onReady playVideo error', e);
        }
      }
    },
    [isPlaying]
  );

  const onStateChange = useCallback(
    async (event: any) => {
      if (event.data === YouTube.PlayerState.PLAYING) {
        setPlaying(true);
        try {
           const duration = await event.target.getDuration();
           setDuration(duration || 0);
        } catch (e) {
           console.warn('getDuration error', e);
        }
      } else if (event.data === YouTube.PlayerState.PAUSED) {
        // Reflect the real playback state so Android notification can show a Play action
        // when the WebView or iframe pauses playback in background.
        setPlaying(false);
      } else if (event.data === YouTube.PlayerState.ENDED) {
        safePlayNext();
      }
    },
    [setPlaying, setDuration, safePlayNext]
  );

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && useYoutubeFallback) {
      interval = setInterval(async () => {
        const player = playerRef.current;
        // CRITICAL GUARD: Ensure player and iframe are still alive
        if (player && typeof player.getCurrentTime === 'function' && player.getIframe()) {
          try {
            const time = await player.getCurrentTime();
            const playerState = await player.getPlayerState();
            setProgress(time || 0);

            // Robust background ending check
            if (time > 0 && duration > 0 && time >= duration - 1 && playerState !== YouTube.PlayerState.PLAYING) {
              safePlayNext();
            }

            // Check SponsorBlock
            if (sponsorSegments.length > 0) {
              const matchingSegment = sponsorSegments.find(s => time >= s.start && time < s.end);
              if (matchingSegment) {
                player.seekTo(matchingSegment.end, true);
                setProgress(matchingSegment.end);
              }
            }
          } catch (e) {
            // Silently ignore if player is in a weird state
          }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, useYoutubeFallback, setProgress, duration, safePlayNext, sponsorSegments]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      const resolvedDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(resolvedDuration || currentTrack?.duration || 0);
    };

    const handleDurationChange = () => {
      const resolvedDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
      if (resolvedDuration > 0) {
        setDuration(resolvedDuration);
      }
    };

    const handleTimeUpdate = () => {
      const time = audio.currentTime || 0;
      setProgress(time);

      // Check SponsorBlock for Web Audio
      if (sponsorSegments.length > 0) {
        const matchingSegment = sponsorSegments.find(s => time >= s.start && time < s.end);
        if (matchingSegment) {
          audio.currentTime = matchingSegment.end;
          setProgress(matchingSegment.end);
        }
      }
    };

    const handlePlayEvent = () => {
      if (useWebDirectPlayback) {
        setPlaying(true);
      }
    };

    const handlePauseEvent = () => {
      if (useWebDirectPlayback && !audio.ended) {
        setPlaying(false);
      }
    };

    const handleEnded = () => {
      safePlayNext();
    };

    const handleError = () => {
      if (!currentTrack) return;

      setStreamState((state) => {
        if (state.trackId !== currentTrack.videoId) return state;

        return {
          trackId: currentTrack.videoId,
          url: null,
          status: 'fallback',
        };
      });
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlayEvent);
    audio.addEventListener('pause', handlePauseEvent);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlayEvent);
      audio.removeEventListener('pause', handlePauseEvent);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [currentTrack, useWebDirectPlayback, safePlayNext, setDuration, setPlaying, setProgress, sponsorSegments]);

  useEffect(() => {
    const audio = audioRef.current;

    if (useWebDirectPlayback && audio && streamState.url) {
      if (audio.src !== streamState.url) {
        audio.src = streamState.url;
        audio.load();
      }

      if (isPlaying) {
        void audio.play().catch(() => {
          setPlaying(false);
        });
      } else {
        audio.pause();
      }

      if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        playerRef.current.pauseVideo();
      }

      return;
    }

    if (audio) {
      audio.pause();
    }

    if (useYoutubeFallback && playerRef.current) {
      try {
        if (isPlaying) {
          if (typeof playerRef.current.playVideo === 'function') {
            playerRef.current.playVideo();
          }
        } else if (typeof playerRef.current.pauseVideo === 'function') {
          playerRef.current.pauseVideo();
        }
      } catch (e) {
        console.warn('YouTube Player API Error (play/pause):', e);
      }
    }
  }, [useWebDirectPlayback, useYoutubeFallback, streamState.url, isPlaying, setPlaying]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl || useNativeDirectPlayback) return;
    
    const initAudio = () => {
      try {
        if (!audioContextRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContextClass) return;
          const ctx = new AudioContextClass();
          audioContextRef.current = ctx;
          
          sourceNodeRef.current = ctx.createMediaElementSource(audioEl);
          const freqs = [60, 230, 910, 3600, 14000];
          
          const filters = freqs.map((freq, i) => {
            const filter = ctx.createBiquadFilter();
            filter.type = i === 0 ? 'lowshelf' : i === freqs.length - 1 ? 'highshelf' : 'peaking';
            filter.frequency.value = freq;
            if (filter.type === 'peaking') filter.Q.value = 1;
            filter.gain.value = gains[i] || 0;
            return filter;
          });
          filtersRef.current = filters;

          sourceNodeRef.current.connect(filters[0]);
          for (let i = 0; i < filters.length - 1; i++) {
            filters[i].connect(filters[i + 1]);
          }
          filters[filters.length - 1].connect(ctx.destination);
        } else if (audioContextRef.current.state === 'suspended') {
          void audioContextRef.current.resume();
        }
      } catch (e) {
        console.error("Audio Routing error", e);
      }
    };
    
    audioEl.addEventListener('play', initAudio);
    return () => audioEl.removeEventListener('play', initAudio);
  }, [useNativeDirectPlayback]); 

  // Fast equalizer gain updates without re-instantiation
  useEffect(() => {
    if (filtersRef.current.length === gains.length) {
      gains.forEach((gain, i) => {
        if (filtersRef.current[i]) {
          filtersRef.current[i].gain.value = gain;
        }
      });
    }
  }, [gains]);

  useEffect(() => {
    if (!useNativeDirectPlayback) return;

    if (isPlaying) {
      void nativeAudio.play();
    } else {
      void nativeAudio.pause();
    }
  }, [isPlaying, useNativeDirectPlayback]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const hidden = document.visibilityState === 'hidden';
      isBackgrounded.current = hidden;

      if (!hidden && isPlaying && useYoutubeFallback && playerRef.current) {
        const state = playerRef.current.getPlayerState?.();
        if (state !== YouTube.PlayerState.PLAYING) {
          playerRef.current.playVideo();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying, useYoutubeFallback]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setProgress(newTime);
    if (useNativeDirectPlayback) {
      void nativeAudio.seekTo(newTime);
    } else if (useWebDirectPlayback && audioRef.current) {
      audioRef.current.currentTime = newTime;
    } else if (playerRef.current) {
      playerRef.current.seekTo(newTime, true);
    }
  };
  const activeLyricIndex = lyrics?.synced
    ? lyrics.lines.reduce((matchIndex, line, index) => {
        if (typeof line.startTime === 'number' && progress >= line.startTime) {
          return index;
        }
        return matchIndex;
      }, -1)
    : -1;

  useEffect(() => {
    if (activeView !== 'lyrics' || activeLyricIndex < 0) return;

    lyricLineRefs.current[activeLyricIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [activeLyricIndex, activeView]);

  useEffect(() => {
    if (activeView !== 'lyrics' || !currentTrack) return;

    lyricLineRefs.current = [];
    lyricsContainerRef.current?.scrollTo({
      top: 0,
      behavior: 'auto',
    });
  }, [currentTrack, activeView]);

  // Update Media Session Metadata
  useEffect(() => {
    if (!currentTrack || typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const trackTitle = currentTrack.name?.trim() || 'Unknown';
    const thumbnail = getHighResImage(currentTrack.thumbnails?.[currentTrack.thumbnails.length - 1]?.url, 800);
    const artistName = Array.isArray(currentTrack.artist)
      ? currentTrack.artist.map((a) => a.name).join(', ')
      : currentTrack.artist?.name || 'Unknown Artist';

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: trackTitle,
        artist: artistName,
        album: 'Sonara',
        artwork: [
          { src: getHighResImage(thumbnail, 96), sizes: '96x96', type: 'image/jpeg' },
          { src: getHighResImage(thumbnail, 128), sizes: '128x128', type: 'image/jpeg' },
          { src: getHighResImage(thumbnail, 192), sizes: '192x192', type: 'image/jpeg' },
          { src: getHighResImage(thumbnail, 256), sizes: '256x256', type: 'image/jpeg' },
          { src: getHighResImage(thumbnail, 384), sizes: '384x384', type: 'image/jpeg' },
          { src: getHighResImage(thumbnail, 512), sizes: '512x512', type: 'image/jpeg' },
        ],
      });
    } catch (e) {
      console.error('Failed to update MediaSession metadata:', e);
    }
  }, [currentTrack]);

  // Handle Media Session Actions
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const skipTime = 10;

    navigator.mediaSession.setActionHandler('play', () => {
      setPlaying(true);
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      setPlaying(false);
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      playPrev();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      safePlayNext();
    });
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime === undefined) return;

      if (useNativeDirectPlayback) {
        void nativeAudio.seekTo(details.seekTime);
        setProgress(details.seekTime);
      } else if (useWebDirectPlayback && audioRef.current) {
        audioRef.current.currentTime = details.seekTime;
        setProgress(details.seekTime);
      } else if (playerRef.current) {
        playerRef.current.seekTo(details.seekTime, true);
        setProgress(details.seekTime);
      }
    });
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const skip = details.seekOffset || skipTime;
      const newTime = Math.max(progress - skip, 0);
      if (useNativeDirectPlayback) {
        void nativeAudio.seekTo(newTime);
        setProgress(newTime);
      } else if (useWebDirectPlayback && audioRef.current) {
        audioRef.current.currentTime = newTime;
        setProgress(newTime);
      } else if (playerRef.current) {
        playerRef.current.seekTo(newTime, true);
        setProgress(newTime);
      }
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const skip = details.seekOffset || skipTime;
      const newTime = Math.min(progress + skip, duration);
      if (useNativeDirectPlayback) {
        void nativeAudio.seekTo(newTime);
        setProgress(newTime);
      } else if (useWebDirectPlayback && audioRef.current) {
        audioRef.current.currentTime = newTime;
        setProgress(newTime);
      } else if (playerRef.current) {
        playerRef.current.seekTo(newTime, true);
        setProgress(newTime);
      }
    });

    return () => {
      const handlers = ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto', 'seekbackward', 'seekforward'];
      handlers.forEach(h => {
        try { navigator.mediaSession.setActionHandler(h as any, null); } catch(e) {}
      });
    };
  }, [useNativeDirectPlayback, useWebDirectPlayback, setPlaying, playPrev, safePlayNext, setProgress, progress, duration, playerRef]);

  useEffect(() => {
    if (useNativeDirectPlayback) {
      void playbackNotification.sync(null);
      return;
    }

    const listener = playbackNotification.addListener(({ action }) => {
      if (action === 'play') {
        setPlaying(true);
        if (useWebDirectPlayback && audioRef.current) {
          void audioRef.current.play().catch(() => {
            setPlaying(false);
          });
        } else if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
          playerRef.current.playVideo();
        }
      } else if (action === 'pause') {
        setPlaying(false);
        if (isDirectStreamReady && audioRef.current) {
          audioRef.current.pause();
        } else if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
          playerRef.current.pauseVideo();
        }
      }
    });

    void playbackNotification.consumePendingAction().then(({ action }) => {
      if (action === 'play') {
        setPlaying(true);
      } else if (action === 'pause') {
        setPlaying(false);
      } else if (action === 'next') {
        safePlayNext();
      } else if (action === 'previous') {
        setPlaying(false);
      }
    });

    return () => {
      void listener.remove();
    };
  }, [isDirectStreamReady, useNativeDirectPlayback, useWebDirectPlayback, setPlaying]);

  // Update Media Session Playback State and Position
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (e) {
      console.error('Error setting playback state:', e);
    }
    
    // Update position state for consistent progress on lock screen
    if ('setPositionState' in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration || 0,
          playbackRate: 1,
          position: progress || 0,
        });
      } catch (e) {
        console.error('Error setting position state:', e);
      }
    }
  }, [isPlaying, duration, progress]);

  // Dynamic Theme Color
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', dominantColor || '#120f18');
    }
  }, [dominantColor]);

  useEffect(() => {
    if (!currentTrack) {
      void playbackNotification.sync(null);
      return;
    }

    if (useNativeDirectPlayback) {
      void playbackNotification.sync(null);
      return;
    }

    const title = currentTrack.name?.trim() || 'Unknown';
    const artist = Array.isArray(currentTrack.artist)
      ? currentTrack.artist.map((entry) => entry.name).filter(Boolean).join(', ')
      : currentTrack.artist?.name || 'Unknown Artist';

    void playbackNotification.sync({
      title,
      artist,
      isPlaying,
    });
  }, [currentTrack, isPlaying, useNativeDirectPlayback]);

  if (!currentTrack) return null;

  const trackTitle = currentTrack.name?.trim() || 'Unknown';
  const thumbnail = getHighResImage(currentTrack.thumbnails?.[currentTrack.thumbnails.length - 1]?.url, 800);
  const artistName = Array.isArray(currentTrack.artist)
    ? currentTrack.artist.map((a) => a.name).join(', ')
    : currentTrack.artist?.name || 'Unknown Artist';

  return (
    <>
      <audio
        ref={audioRef}
        preload="auto"
        playsInline
        className="hidden"
      />
      <div 
        className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden"
        style={{ visibility: 'hidden', width: '1px', height: '1px' }}
      >
        {useYoutubeFallback && (
          <YouTube
            videoId={currentTrack.videoId}
            opts={{
              height: '1',
              width: '1',
              playerVars: {
                autoplay: 1,
                controls: 0,
                playsinline: 1,
                rel: 0,
                modestbranding: 1,
                enablejsapi: 1,
                origin: typeof window !== 'undefined' ? window.location.origin : '',
              },
            }}
            onReady={onReady}
            onStateChange={onStateChange}
            onError={(e) => {
               console.error("YouTube Player Error code:", e.data);
               // If video is unplayable (e.g. 150 = restrictions, 100 = not found)
               // Automatically skip to the next
               setTimeout(() => playNext(), 1500);
            }}
          />
        )}
      </div>

      <AnimatePresence>
        {!isExpanded && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-[calc(5.6rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 flex cursor-pointer items-center rounded-[28px] border border-white/10 bg-[#1C1C1E]/95 p-2 pr-3 shadow-2xl backdrop-blur-md md:bottom-6 md:left-6 md:right-auto md:w-[420px] md:rounded-full md:pr-4"
            onClick={() => setExpanded(true)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTrack.videoId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex min-w-0 flex-1 items-center"
              >
                <div className="relative mr-3 h-12 w-12 shrink-0">
                  <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="4"
                      strokeDasharray={`${2 * Math.PI * 46}`}
                      strokeDashoffset={`${2 * Math.PI * 46 * (1 - (duration > 0 ? progress / duration : 0))}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <div className="absolute inset-1 overflow-hidden rounded-full bg-[#222]">
                    {!imageError ? (
                      <Image
                        src={thumbnail}
                        alt={trackTitle}
                        fill
                        sizes="(max-width: 640px) 100vw, 500px"
                        className="object-cover"
                        onError={() => setImageErrorTrackId(currentTrack.videoId)}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#333] to-[#222]">
                        <Music className="h-4 w-4 text-gray-500" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <div className="truncate text-sm font-semibold text-white">{trackTitle}</div>
                  <div className="flex items-center gap-1 truncate text-xs text-white/60">
                    {currentTrack.isExplicit && (
                      <span className="rounded-sm bg-white/20 px-1 text-[8px] text-white">E</span>
                    )}
                    {artistName}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="ml-2 flex shrink-0 items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white transition-colors hover:bg-white/10"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 fill-current" />
                ) : (
                  <Play className="ml-0.5 h-5 w-5 fill-current" />
                )}
              </button>
              <button
                onClick={handleLike}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white transition-colors hover:bg-white/10"
              >
                <Heart className={cn('h-5 w-5 transition-colors', isLiked && 'fill-[var(--accent)] text-[var(--accent)]')} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.8 }}
            onDragEnd={(e, info) => {
              if (info.offset.y > 150 || info.velocity.y > 500) {
                setExpanded(false);
              }
            }}
            className="fixed inset-0 z-[100] flex flex-col bg-black overflow-hidden"
          >
            {/* Haze Effect Background */}
            <div className="absolute inset-0 pointer-events-none z-0">
               {!imageError && (
                 <Image
                   src={thumbnail}
                   alt="background"
                   fill
                   sizes="100vw"
                   className="object-cover opacity-50 blur-[60px] saturate-200 scale-125 transition-all duration-1000 ease-in-out"
                 />
               )}
               <div className="absolute inset-0 bg-black/60" />
               <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </div>
            <div className="relative z-10 flex h-full flex-col px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 sm:p-6 sm:pb-[calc(1.75rem+env(safe-area-inset-bottom))]">
              <div className="mb-5 flex items-center justify-between sm:mb-8">
                <button onClick={() => setExpanded(false)} className="-ml-2 p-2 text-white">
                  <ChevronDown className="h-7 w-7 sm:h-8 sm:w-8" />
                </button>
                <div className="flex gap-2 sm:gap-4">
                  <button onClick={handleShare} className="p-2 text-white">
                    <Share2 className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                  <button className="p-2 text-white">
                    <Cast className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                  <EqualizerDialog />
                  <SleepTimerDialog />
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col justify-center">
                {activeView === 'lyrics' ? (
                  <div
                    ref={lyricsContainerRef}
                    className="glass-panel flex-1 overflow-y-auto rounded-[28px] px-4 py-5 no-scrollbar sm:px-6 sm:py-6"
                  >
                    {lyricsStatus === 'loading' ? (
                      <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-white/60">
                        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
                        <p className="text-sm sm:text-base">Sonara lagi cari lirik terbaik untuk lagu ini.</p>
                      </div>
                    ) : lyrics ? (
                      <div className="space-y-4 text-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/60">
                          <Mic2 className="h-3.5 w-3.5 text-[var(--accent)]" />
                          {lyrics.providerLabel}
                          {lyrics.synced ? ' synced' : ' lyrics'}
                        </div>
                        <div className="space-y-3 pb-6 pt-1">
                          {lyrics.lines.map((line, index) => {
                            const isActive = lyrics.synced && index === activeLyricIndex;

                            return (
                              <p
                                key={`${line.text}-${index}`}
                                ref={(node) => {
                                  lyricLineRefs.current[index] = node;
                                }}
                                className={cn(
                                  'whitespace-pre-wrap text-[22px] font-bold leading-[1.4] transition-all duration-300 sm:text-[28px]',
                                  isActive
                                    ? 'scale-[1.02] text-white opacity-100'
                                    : lyrics.synced
                                      ? 'blur-[0.5px] text-white/30 sm:blur-[1px]'
                                      : 'text-white/90',
                                  isActive && 'drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                                )}
                              >
                                {line.text}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center text-center text-sm leading-7 text-white/55 sm:text-base">
                        Lirik untuk {trackTitle} dari {artistName} belum ketemu. Sonara sudah coba cari dari beberapa
                        sumber, jadi kalau provider menambah data lagu ini nanti tombol lirik akan ikut hidup.
                      </div>
                    )}
                  </div>
                ) : activeView === 'queue' ? (
                  <div className="glass-panel flex-1 overflow-y-auto rounded-[28px] px-3 py-3 no-scrollbar sm:px-4 sm:py-4">
                    <div className="mb-4 flex items-center justify-between px-2">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">Up Next</div>
                        <h3 className="mt-1 text-lg font-semibold text-white sm:text-xl">Antrean aktif</h3>
                      </div>
                      <div className="text-xs uppercase tracking-[0.22em] text-white/35">
                        {Math.max(activeQueue.length, 0)} track
                      </div>
                    </div>

                    {activeQueue.length > 0 ? (
                      <div className="space-y-2 pb-2">
                        {activeQueue.map((track: any, index: number) => {
                          const queueArtist = Array.isArray(track.artist)
                            ? track.artist.map((artist: any) => artist.name).join(', ')
                            : track.artist?.name || 'Unknown Artist';
                          const isActive = track.videoId === currentTrack.videoId;

                          return (
                            <button
                              key={`${track.videoId}-${index}`}
                              onClick={() => handleQueueTrackSelect(track)}
                              className={cn(
                                'flex w-full items-center gap-3 rounded-2xl p-3 text-left transition',
                                isActive ? 'bg-white/10' : 'bg-black/20 hover:bg-black/30'
                              )}
                            >
                              <div className="w-7 shrink-0 text-center text-xs font-semibold text-white/40">
                                {index + 1}
                              </div>
                              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                                <Image
                                  src={getHighResImage(track.thumbnails?.[track.thumbnails.length - 1]?.url, 220)}
                                  alt={track.name || 'Track'}
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className={cn('truncate text-sm font-semibold', isActive ? 'text-white' : 'text-white/85')}>
                                  {track.name || 'Lagu tanpa judul'}
                                </div>
                                <div className="mt-1 truncate text-xs text-white/45">{queueArtist}</div>
                              </div>
                              {isActive && (
                                <div className="rounded-full border border-[var(--accent)]/35 bg-[var(--accent)]/15 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
                                  Sedang diputar
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center px-4 text-center text-sm leading-7 text-white/55">
                        Antrean belum tersedia. Putar lagu dari beranda, pencarian, album, atau playlist untuk melihat
                        daftar lagu berikutnya di sini.
                      </div>
                    )}
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentTrack.videoId}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: isPlaying ? 1 : 0.95 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                      className="mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-[28px] bg-[#222] shadow-2xl sm:max-w-[360px]"
                    >
                      {!imageError ? (
                        <Image
                          src={thumbnail}
                          alt={trackTitle}
                          width={500}
                          height={500}
                          className="h-full w-full object-cover"
                          onError={() => setImageErrorTrackId(currentTrack.videoId)}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#333] to-[#222]">
                          <Music className="h-20 w-20 text-gray-600" />
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>

              <div className="mt-6 sm:mt-8">
                <div className="mb-5 flex items-start justify-between gap-4 sm:mb-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentTrack.videoId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="min-w-0 flex-1 pr-4"
                    >
                      <h2 className="truncate text-xl font-bold text-white sm:text-2xl">{trackTitle}</h2>
                      <p className="truncate text-sm text-white/60 sm:text-lg">{artistName}</p>
                    </motion.div>
                  </AnimatePresence>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <button
                      onClick={() => setTrackToAdd(currentTrack)}
                      className="p-2 text-white/80 transition hover:text-white"
                    >
                      <ListPlus className="h-6 w-6 sm:h-7 sm:w-7" />
                    </button>
                    <button onClick={handleLike} className="p-2 text-white transition">
                      <Heart className={cn('h-6 w-6 sm:h-7 sm:w-7', isLiked && 'fill-white')} />
                    </button>
                  </div>
                </div>

                <div className="mb-5 sm:mb-6">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={progress || 0}
                    onChange={handleSeek}
                    className="h-1 w-full appearance-none rounded-full bg-white/20 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-gradient-to-r [&::-webkit-slider-runnable-track]:from-[var(--accent)] [&::-webkit-slider-runnable-track]:to-white/20"
                  />
                  <div className="mt-2 flex justify-between font-mono text-xs text-white/50">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="mb-6 flex items-center justify-between px-1 sm:mb-8 sm:px-2">
                  <button 
                    onClick={() => toggleShuffle()} 
                    className={cn("transition hover:text-white", isShuffled ? "text-[var(--accent)]" : "text-white/80")}
                  >
                    <Shuffle className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                  <button onClick={playPrev} className="text-white transition hover:text-white">
                    <SkipBack className="h-8 w-8 fill-current sm:h-10 sm:w-10" />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)] text-black transition-transform hover:scale-105 sm:h-20 sm:w-20 shadow-[var(--accent-glow)]"
                  >
                    {isPlaying ? (
                      <Pause className="h-8 w-8 fill-current sm:h-10 sm:w-10" />
                    ) : (
                      <Play className="ml-1 h-8 w-8 fill-current sm:h-10 sm:w-10" />
                    )}
                  </button>
                  <button onClick={playNext} className="text-white transition hover:text-white">
                    <SkipForward className="h-8 w-8 fill-current sm:h-10 sm:w-10" />
                  </button>
                  <button 
                    onClick={() => {
                      const modes: ('none' | 'one' | 'all')[] = ['none', 'all', 'one'];
                      const nextMode = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
                      setRepeatMode(nextMode);
                    }} 
                    className={cn("transition hover:text-white relative", repeatMode !== 'none' ? "text-[var(--accent)]" : "text-white/80")}
                  >
                    <Repeat className="h-5 w-5 sm:h-6 sm:w-6" />
                    {repeatMode === 'one' && (
                      <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-[var(--accent)] text-[8px] font-bold text-black">
                        1
                      </span>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-3 items-center gap-2 rounded-[24px] bg-white/5 px-3 py-3 sm:flex sm:justify-between sm:px-6 sm:py-4">
                  <button
                    onClick={() => setActiveView('queue')}
                    className={cn(
                      'flex flex-col items-center gap-1 transition',
                      activeView === 'queue' ? 'text-white' : 'text-white/80 hover:text-white'
                    )}
                  >
                    <ListMusic className="h-5 w-5" />
                    <span className="text-[10px] uppercase tracking-wider">Up Next</span>
                  </button>
                  <button
                    onClick={() => setActiveView(activeView === 'lyrics' ? 'artwork' : 'lyrics')}
                    className={cn(
                      'flex flex-col items-center gap-1 transition',
                      activeView === 'lyrics' ? 'text-white' : 'text-white/80 hover:text-white'
                    )}
                  >
                    <Mic2 className="h-5 w-5" />
                    <span className="text-[10px] uppercase tracking-wider">Lirik</span>
                  </button>
                  <button
                    onClick={() => {
                      const artistId = Array.isArray(currentTrack.artist)
                        ? currentTrack.artist[0]?.artistId
                        : currentTrack.artist?.artistId;
                      if (artistId) {
                        setExpanded(false);
                        router.push(`/artist/${artistId}`);
                      }
                    }}
                    className="flex flex-col items-center gap-1 text-white/80 transition hover:text-white"
                  >
                    <User className="h-5 w-5" />
                    <span className="text-[10px] uppercase tracking-wider">Lihat Artis</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
