package com.saferill.musicapp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;
import androidx.media3.ui.PlayerNotificationManager;

import com.getcapacitor.JSObject;

public class NativePlaybackService extends MediaSessionService {
    public static final String ACTION_SET_TRACK = "com.saferill.musicapp.native.SET_TRACK";
    public static final String ACTION_PLAY = "com.saferill.musicapp.native.PLAY";
    public static final String ACTION_PAUSE = "com.saferill.musicapp.native.PAUSE";
    public static final String ACTION_STOP = "com.saferill.musicapp.native.STOP";
    public static final String ACTION_SEEK = "com.saferill.musicapp.native.SEEK";

    private static final String EXTRA_TRACK_ID = "trackId";
    private static final String EXTRA_URL = "url";
    private static final String EXTRA_TITLE = "title";
    private static final String EXTRA_ARTIST = "artist";
    private static final String EXTRA_ARTWORK_URL = "artworkUrl";
    private static final String EXTRA_AUTOPLAY = "autoplay";
    private static final String EXTRA_POSITION = "position";

    private static final String CHANNEL_ID = "sonara_native_playback";
    private static final int NOTIFICATION_ID = 7301;

    private static JSObject lastSnapshot = new JSObject();

    private ExoPlayer player;
    private MediaSession mediaSession;
    private PlayerNotificationManager notificationManager;
    private boolean isForeground;

    private final Handler progressHandler = new Handler(Looper.getMainLooper());
    private final Runnable progressTicker = new Runnable() {
        @Override
        public void run() {
            emitPlaybackState("progress");
            progressHandler.postDelayed(this, 1000);
        }
    };

    public static Intent createActionIntent(android.content.Context context, String action) {
        Intent intent = new Intent(context, NativePlaybackService.class);
        intent.setAction(action);
        return intent;
    }

    public static Intent createSeekIntent(android.content.Context context, double positionSeconds) {
        Intent intent = createActionIntent(context, ACTION_SEEK);
        intent.putExtra(EXTRA_POSITION, positionSeconds);
        return intent;
    }

    public static Intent createSetTrackIntent(
        android.content.Context context,
        String trackId,
        String url,
        String title,
        String artist,
        String artworkUrl,
        boolean autoplay,
        double positionSeconds
    ) {
        Intent intent = createActionIntent(context, ACTION_SET_TRACK);
        intent.putExtra(EXTRA_TRACK_ID, trackId);
        intent.putExtra(EXTRA_URL, url);
        intent.putExtra(EXTRA_TITLE, title);
        intent.putExtra(EXTRA_ARTIST, artist);
        intent.putExtra(EXTRA_ARTWORK_URL, artworkUrl);
        intent.putExtra(EXTRA_AUTOPLAY, autoplay);
        intent.putExtra(EXTRA_POSITION, positionSeconds);
        return intent;
    }

    public static JSObject getSnapshot() {
        return lastSnapshot;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();

        player = new ExoPlayer.Builder(this).build();
        mediaSession = new MediaSession.Builder(this, player)
            .setSessionActivity(buildSessionActivity())
            .build();

        notificationManager = new PlayerNotificationManager.Builder(this, NOTIFICATION_ID, CHANNEL_ID)
            .setMediaDescriptionAdapter(new SonaraDescriptionAdapter())
            .setNotificationListener(new SonaraNotificationListener())
            .setSmallIconResourceId(R.mipmap.ic_launcher)
            .build();
        notificationManager.setPlayer(player);
        notificationManager.setUseNextAction(false);
        notificationManager.setUsePreviousAction(false);
        notificationManager.setUseFastForwardAction(false);
        notificationManager.setUseRewindAction(false);

        player.addListener(new Player.Listener() {
            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                emitPlaybackState("playback");
            }

            @Override
            public void onPlaybackStateChanged(int playbackState) {
                emitPlaybackState("state");
                if (playbackState == Player.STATE_ENDED && isForeground) {
                    stopForeground(false);
                    isForeground = false;
                }
            }

            @Override
            public void onMediaItemTransition(@Nullable MediaItem mediaItem, int reason) {
                emitPlaybackState("track");
            }
        });

        progressHandler.post(progressTicker);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        int result = super.onStartCommand(intent, flags, startId);
        handleCommand(intent);
        return START_STICKY;
    }

    @Nullable
    @Override
    public MediaSession onGetSession(@NonNull MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @Override
    public void onTaskRemoved(@Nullable Intent rootIntent) {
        if (player == null || !player.isPlaying()) {
            stopSelf();
        }
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        progressHandler.removeCallbacksAndMessages(null);
        if (notificationManager != null) {
            notificationManager.setPlayer(null);
        }
        if (mediaSession != null) {
            mediaSession.release();
            mediaSession = null;
        }
        if (player != null) {
            player.release();
            player = null;
        }
        if (isForeground) {
            stopForeground(true);
            isForeground = false;
        }
        super.onDestroy();
    }

    private void handleCommand(@Nullable Intent intent) {
        if (intent == null || player == null) return;

        String action = intent.getAction();
        if (ACTION_SET_TRACK.equals(action)) {
            handleSetTrack(intent);
        } else if (ACTION_PLAY.equals(action)) {
            player.play();
            emitPlaybackState("play");
        } else if (ACTION_PAUSE.equals(action)) {
            player.pause();
            emitPlaybackState("pause");
        } else if (ACTION_STOP.equals(action)) {
            player.stop();
            stopSelf();
            emitPlaybackState("stop");
        } else if (ACTION_SEEK.equals(action)) {
            double positionSeconds = intent.getDoubleExtra(EXTRA_POSITION, 0D);
            player.seekTo((long) Math.max(positionSeconds * 1000D, 0D));
            emitPlaybackState("seek");
        }
    }

    private void handleSetTrack(Intent intent) {
        if (player == null) return;

        String trackId = intent.getStringExtra(EXTRA_TRACK_ID);
        String url = intent.getStringExtra(EXTRA_URL);
        String title = intent.getStringExtra(EXTRA_TITLE);
        String artist = intent.getStringExtra(EXTRA_ARTIST);
        String artworkUrl = intent.getStringExtra(EXTRA_ARTWORK_URL);
        boolean autoplay = intent.getBooleanExtra(EXTRA_AUTOPLAY, true);
        double positionSeconds = intent.getDoubleExtra(EXTRA_POSITION, 0D);

        if (url == null || url.isEmpty()) {
            return;
        }

        MediaMetadata.Builder metadataBuilder = new MediaMetadata.Builder()
            .setTitle(title == null || title.isEmpty() ? "Sonara" : title)
            .setArtist(artist == null ? "" : artist);

        if (artworkUrl != null && !artworkUrl.isEmpty()) {
            metadataBuilder.setArtworkUri(Uri.parse(artworkUrl));
        }

        MediaItem mediaItem = new MediaItem.Builder()
            .setMediaId(trackId == null ? "" : trackId)
            .setUri(url)
            .setMediaMetadata(metadataBuilder.build())
            .build();

        boolean sameTrack = player.getCurrentMediaItem() != null
            && url.equals(String.valueOf(player.getCurrentMediaItem().localConfiguration != null
                ? player.getCurrentMediaItem().localConfiguration.uri
                : ""));

        if (!sameTrack) {
            player.setMediaItem(mediaItem);
            player.prepare();
        }

        long positionMs = (long) Math.max(positionSeconds * 1000D, 0D);
        if (positionMs > 0) {
            player.seekTo(positionMs);
        } else if (!sameTrack) {
            player.seekTo(0);
        }

        if (autoplay) {
            player.play();
        } else {
            player.pause();
        }

        emitPlaybackState("setTrack");
    }

    private PendingIntent buildSessionActivity() {
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launchIntent == null) {
            return null;
        }

        launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        return PendingIntent.getActivity(
            this,
            9200,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private void emitPlaybackState(String reason) {
        JSObject payload = new JSObject();
        payload.put("reason", reason);
        payload.put("isPlaying", player != null && player.isPlaying());
        payload.put("position", player != null ? Math.max(player.getCurrentPosition(), 0) / 1000D : 0D);
        payload.put("duration", player != null && player.getDuration() > 0 ? player.getDuration() / 1000D : 0D);
        payload.put("ended", player != null && player.getPlaybackState() == Player.STATE_ENDED);

        String trackId = "";
        if (player != null && player.getCurrentMediaItem() != null) {
            trackId = player.getCurrentMediaItem().mediaId;
        }
        payload.put("trackId", trackId);

        lastSnapshot = payload;
        NativeAudioPlugin.dispatchPlaybackState(payload);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Sonara Native Playback",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Kontrol pemutaran native Sonara");

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }

    private class SonaraDescriptionAdapter implements PlayerNotificationManager.MediaDescriptionAdapter {
        @Override
        public CharSequence getCurrentContentTitle(Player player) {
            MediaItem mediaItem = player.getCurrentMediaItem();
            CharSequence title = mediaItem != null ? mediaItem.mediaMetadata.title : null;
            return title != null ? title : "Sonara";
        }

        @Nullable
        @Override
        public PendingIntent createCurrentContentIntent(Player player) {
            return buildSessionActivity();
        }

        @Nullable
        @Override
        public CharSequence getCurrentContentText(Player player) {
            MediaItem mediaItem = player.getCurrentMediaItem();
            CharSequence artist = mediaItem != null ? mediaItem.mediaMetadata.artist : null;
            return artist != null ? artist : "";
        }

        @Nullable
        @Override
        public CharSequence getCurrentSubText(Player player) {
            return "Sonara";
        }

        @Nullable
        @Override
        public android.graphics.Bitmap getCurrentLargeIcon(Player player, PlayerNotificationManager.BitmapCallback callback) {
            return null;
        }
    }

    private class SonaraNotificationListener implements PlayerNotificationManager.NotificationListener {
        @Override
        public void onNotificationPosted(int notificationId, Notification notification, boolean ongoing) {
            if (!isForeground) {
                startForeground(notificationId, notification);
                isForeground = true;
                return;
            }

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.notify(notificationId, notification);
            }
        }

        @Override
        public void onNotificationCancelled(int notificationId, boolean dismissedByUser) {
            if (isForeground) {
                stopForeground(true);
                isForeground = false;
            }

            if (dismissedByUser && player != null) {
                player.pause();
            }
        }
    }
}
