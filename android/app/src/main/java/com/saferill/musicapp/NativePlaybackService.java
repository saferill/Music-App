package com.saferill.musicapp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;
import androidx.media3.ui.PlayerNotificationManager;

import com.getcapacitor.JSObject;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@UnstableApi
public class NativePlaybackService extends MediaSessionService {
    public static final String ACTION_SET_QUEUE = "com.saferill.musicapp.native.SET_QUEUE";
    public static final String ACTION_ADD_TRACK = "com.saferill.musicapp.native.ADD_TRACK";
    public static final String ACTION_REMOVE_TRACK = "com.saferill.musicapp.native.REMOVE_TRACK";
    public static final String ACTION_SET_SHUFFLE = "com.saferill.musicapp.native.SET_SHUFFLE";
    public static final String ACTION_SET_REPEAT = "com.saferill.musicapp.native.SET_REPEAT";
    public static final String ACTION_PLAY = "com.saferill.musicapp.native.PLAY";
    public static final String ACTION_PAUSE = "com.saferill.musicapp.native.PAUSE";
    public static final String ACTION_STOP = "com.saferill.musicapp.native.STOP";
    public static final String ACTION_SEEK = "com.saferill.musicapp.native.SEEK";
    public static final String ACTION_PREV = "com.saferill.musicapp.native.PREV";
    public static final String ACTION_NEXT = "com.saferill.musicapp.native.NEXT";

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
    private final ExecutorService artworkExecutor = Executors.newSingleThreadExecutor();

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

        AudioAttributes audioAttributes = new AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .build();

        player = new ExoPlayer.Builder(this)
            .setAudioAttributes(audioAttributes, true)
            .setHandleAudioBecomingNoisy(true) // Pause on headphones unplugged
            .setWakeMode(C.WAKE_MODE_NETWORK) // Use WakeLock to keep CPU/Wifi alive
            .build();

        mediaSession = new MediaSession.Builder(this, player)
            .setSessionActivity(buildSessionActivity())
            .build();

        notificationManager = new PlayerNotificationManager.Builder(this, NOTIFICATION_ID, CHANNEL_ID)
            .setMediaDescriptionAdapter(new SonaraDescriptionAdapter())
            .setNotificationListener(new SonaraNotificationListener())
            .setSmallIconResourceId(R.mipmap.ic_launcher)
            .build();
        
        notificationManager.setPlayer(player);
        notificationManager.setUseNextAction(true);
        notificationManager.setUsePreviousAction(true);
        notificationManager.setUseFastForwardAction(false);
        notificationManager.setUseRewindAction(false);
        notificationManager.setPriority(Notification.PRIORITY_MAX);

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
        super.onStartCommand(intent, flags, startId);
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
        artworkExecutor.shutdownNow();
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
        if (ACTION_SET_TRACK.equals(action) || ACTION_SET_QUEUE.equals(action)) {
            handleSetQueue(intent);
        } else if (ACTION_ADD_TRACK.equals(action)) {
            handleAddTrack(intent);
        } else if (ACTION_REMOVE_TRACK.equals(action)) {
            int index = intent.getIntExtra(EXTRA_POSITION, -1);
            if (index >= 0 && player.getMediaItemCount() > index) {
                player.removeMediaItem(index);
            }
        } else if (ACTION_SET_SHUFFLE.equals(action)) {
            boolean shuffle = intent.getBooleanExtra("shuffle", false);
            player.setShuffleModeEnabled(shuffle);
        } else if (ACTION_NEXT.equals(action)) {
            if (player.hasNextMediaItem()) {
                player.seekToNext();
            }
        } else if (ACTION_PREV.equals(action)) {
            if (player.hasPreviousMediaItem()) {
                player.seekToPrevious();
            }
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

    private void handleSetQueue(Intent intent) {
        if (player == null) return;

        // Extract multiple tracks if present
        String[] urls = intent.getStringArrayExtra("urls");
        String[] titles = intent.getStringArrayExtra("titles");
        String[] artists = intent.getStringArrayExtra("artists");
        String[] artworkUrls = intent.getStringArrayExtra("artworkUrls");
        String[] trackIds = intent.getStringArrayExtra("trackIds");
        int startIndex = intent.getIntExtra("startIndex", 0);
        boolean autoplay = intent.getBooleanExtra(EXTRA_AUTOPLAY, true);
        double positionSeconds = intent.getDoubleExtra(EXTRA_POSITION, 0D);

        if (urls == null || urls.length == 0) {
            // Fallback to single track if sent via old intent format
            String singleUrl = intent.getStringExtra(EXTRA_URL);
            if (singleUrl != null) {
                urls = new String[]{singleUrl};
                titles = new String[]{intent.getStringExtra(EXTRA_TITLE)};
                artists = new String[]{intent.getStringExtra(EXTRA_ARTIST)};
                artworkUrls = new String[]{intent.getStringExtra(EXTRA_ARTWORK_URL)};
                trackIds = new String[]{intent.getStringExtra(EXTRA_TRACK_ID)};
            } else {
                return;
            }
        }

        java.util.List<MediaItem> mediaItems = new java.util.ArrayList<>();
        for (int i = 0; i < urls.length; i++) {
            MediaMetadata.Builder metadataBuilder = new MediaMetadata.Builder()
                .setTitle(titles[i] == null || titles[i].isEmpty() ? "Sonara" : titles[i])
                .setArtist(artists[i] == null ? "" : artists[i]);

            if (artworkUrls[i] != null && !artworkUrls[i].isEmpty()) {
                metadataBuilder.setArtworkUri(Uri.parse(artworkUrls[i]));
            }

            mediaItems.add(new MediaItem.Builder()
                .setMediaId(trackIds[i] == null ? "" : trackIds[i])
                .setUri(urls[i])
                .setMediaMetadata(metadataBuilder.build())
                .build());
        }

        player.setMediaItems(mediaItems, startIndex, (long) (positionSeconds * 1000L));
        player.prepare();
        
        if (autoplay) {
            player.play();
        } else {
            player.pause();
        }

        emitPlaybackState("setQueue");
    }

    private void handleAddTrack(Intent intent) {
        if (player == null) return;
        String url = intent.getStringExtra(EXTRA_URL);
        if (url == null) return;

        MediaMetadata metadata = new MediaMetadata.Builder()
            .setTitle(intent.getStringExtra(EXTRA_TITLE))
            .setArtist(intent.getStringExtra(EXTRA_ARTIST))
            .setArtworkUri(Uri.parse(intent.getStringExtra(EXTRA_ARTWORK_URL)))
            .build();

        MediaItem item = new MediaItem.Builder()
            .setMediaId(intent.getStringExtra(EXTRA_TRACK_ID))
            .setUri(url)
            .setMediaMetadata(metadata)
            .build();

        player.addMediaItem(item);
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
        channel.setShowBadge(false);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

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
        public Bitmap getCurrentLargeIcon(Player player, PlayerNotificationManager.BitmapCallback callback) {
            MediaItem mediaItem = player.getCurrentMediaItem();
            if (mediaItem != null && mediaItem.mediaMetadata.artworkUri != null) {
                String artworkUrl = mediaItem.mediaMetadata.artworkUri.toString();
                artworkExecutor.execute(() -> {
                    try {
                        URL url = new URL(artworkUrl);
                        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                        connection.setDoInput(true);
                        connection.connect();
                        InputStream input = connection.getInputStream();
                        Bitmap bitmap = BitmapFactory.decodeStream(input);
                        new Handler(Looper.getMainLooper()).post(() -> callback.onBitmap(bitmap));
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                });
            }
            return null;
        }
    }

    private class SonaraNotificationListener implements PlayerNotificationManager.NotificationListener {
        @Override
        public void onNotificationPosted(int notificationId, Notification notification, boolean ongoing) {
            if (ongoing && !isForeground) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    startForeground(notificationId, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
                } else {
                    startForeground(notificationId, notification);
                }
                isForeground = true;
            } else if (!ongoing && isForeground) {
                stopForeground(false);
                isForeground = false;
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
