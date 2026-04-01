import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

type NativePlaybackState = {
  reason?: string;
  isPlaying?: boolean;
  position?: number;
  duration?: number;
  trackId?: string;
  ended?: boolean;
};

type NativeTrackOptions = {
  trackId: string;
  url: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  autoplay?: boolean;
  position?: number;
};

interface NativeAudioPlugin {
  setTrack(options: NativeTrackOptions): Promise<void>;
  setQueue(options: {
    tracks: NativeTrackOptions[];
    startIndex?: number;
    autoplay?: boolean;
    position?: number;
  }): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seekTo(options: { position: number }): Promise<void>;
  stop(): Promise<void>;
  getState(): Promise<NativePlaybackState>;
  setShuffle(options: { shuffle: boolean }): Promise<void>;
  removeTrack(options: { index: number }): Promise<void>;
  addListener(
    eventName: 'playbackState',
    listenerFunc: (event: NativePlaybackState) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
}

const nativeAudioPlugin = registerPlugin<NativeAudioPlugin>('NativeAudio');

export const isAndroidNativeAudio = () => Capacitor.getPlatform() === 'android';

export const nativeAudio = {
  async setTrack(options: NativeTrackOptions) {
    if (!isAndroidNativeAudio()) return;
    await nativeAudioPlugin.setTrack(options);
  },
  async setQueue(options: {
    tracks: NativeTrackOptions[];
    startIndex?: number;
    autoplay?: boolean;
    position?: number;
  }) {
    if (!isAndroidNativeAudio()) return;
    await nativeAudioPlugin.setQueue(options);
  },
  async play() {
    if (!isAndroidNativeAudio()) return;
    await nativeAudioPlugin.play();
  },
  async pause() {
    if (!isAndroidNativeAudio()) return;
    await nativeAudioPlugin.pause();
  },
  async seekTo(position: number) {
    if (!isAndroidNativeAudio()) return;
    await nativeAudioPlugin.seekTo({ position });
  },
  async stop() {
    if (!isAndroidNativeAudio()) return;
    await nativeAudioPlugin.stop();
  },
  async getState() {
    if (!isAndroidNativeAudio()) return {};
    return nativeAudioPlugin.getState();
  },
  async setShuffle(shuffle: boolean) {
    if (!isAndroidNativeAudio()) return;
    await nativeAudioPlugin.setShuffle({ shuffle });
  },
  async removeTrack(index: number) {
    if (!isAndroidNativeAudio()) return;
    await nativeAudioPlugin.removeTrack({ index });
  },
  addListener(listener: (event: NativePlaybackState) => void) {
    if (!isAndroidNativeAudio()) {
      return {
        remove: async () => {},
      } satisfies PluginListenerHandle;
    }

    return nativeAudioPlugin.addListener('playbackState', listener);
  },
};
