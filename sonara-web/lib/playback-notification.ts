import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

type PlaybackAction = 'play' | 'pause';

type ShowNotificationOptions = {
  title: string;
  artist: string;
  isPlaying: boolean;
};

type PlaybackActionEvent = {
  action: PlaybackAction;
};

interface PlaybackNotificationPlugin {
  showNotification(options: ShowNotificationOptions): Promise<void>;
  hideNotification(): Promise<void>;
  consumePendingAction(): Promise<{ action?: PlaybackAction }>;
  addListener(
    eventName: 'playbackAction',
    listenerFunc: (event: PlaybackActionEvent) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
}

const playbackNotificationPlugin = registerPlugin<PlaybackNotificationPlugin>('PlaybackNotification');

export const isAndroidNative = () => Capacitor.getPlatform() === 'android';

export const playbackNotification = {
  async sync(options: ShowNotificationOptions | null) {
    if (!isAndroidNative()) return;

    if (!options) {
      await playbackNotificationPlugin.hideNotification();
      return;
    }

    await playbackNotificationPlugin.showNotification(options);
  },
  async consumePendingAction() {
    if (!isAndroidNative()) return {};
    return playbackNotificationPlugin.consumePendingAction();
  },
  addListener(listener: (event: PlaybackActionEvent) => void) {
    if (!isAndroidNative()) {
      return {
        remove: async () => {},
      } satisfies PluginListenerHandle;
    }

    return playbackNotificationPlugin.addListener('playbackAction', listener);
  },
};
