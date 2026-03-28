package com.saferill.musicapp;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PlaybackNotification")
public class PlaybackNotificationPlugin extends Plugin {
    public static final String EXTRA_ACTION = "sonaraPlaybackAction";
    private static final String CHANNEL_ID = "sonara_playback";
    private static final int NOTIFICATION_ID = 7101;
    private static volatile PlaybackNotificationPlugin instance;
    private static volatile String pendingAction;

    @Override
    public void load() {
        instance = this;
        createNotificationChannel();
    }

    @PluginMethod
    public void showNotification(PluginCall call) {
        String title = call.getString("title", "Sonara");
        String artist = call.getString("artist", "Siap diputar");
        boolean isPlaying = call.getBoolean("isPlaying", false);

        NotificationManagerCompat.from(getContext()).notify(
            NOTIFICATION_ID,
            buildNotification(title, artist, isPlaying)
        );
        call.resolve();
    }

    @PluginMethod
    public void hideNotification(PluginCall call) {
        NotificationManagerCompat.from(getContext()).cancel(NOTIFICATION_ID);
        call.resolve();
    }

    @PluginMethod
    public void consumePendingAction(PluginCall call) {
        JSObject result = new JSObject();
        if (pendingAction != null) {
            result.put("action", pendingAction);
            pendingAction = null;
        }
        call.resolve(result);
    }

    public static void captureIntentAction(Intent intent) {
        if (intent == null) return;

        String action = intent.getStringExtra(EXTRA_ACTION);
        if (action != null && !action.isEmpty()) {
            dispatchAction(action);
            intent.removeExtra(EXTRA_ACTION);
        }
    }

    public static void dispatchAction(String action) {
        pendingAction = action;

        PlaybackNotificationPlugin currentInstance = instance;
        if (currentInstance != null) {
            JSObject payload = new JSObject();
            payload.put("action", action);
            currentInstance.notifyListeners("playbackAction", payload, true);
        }
    }

    public static void dismiss(Context context) {
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID);
    }

    private NotificationCompat.Builder buildBaseBuilder(String title, String artist) {
        Intent openAppIntent = getContext()
            .getPackageManager()
            .getLaunchIntentForPackage(getContext().getPackageName());

        PendingIntent contentIntent = null;
        if (openAppIntent != null) {
            openAppIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            contentIntent = PendingIntent.getActivity(
                getContext(),
                9000,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
        }

        return new NotificationCompat.Builder(getContext(), CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(artist)
            .setSubText("Sonara")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setAutoCancel(false)
            .setContentIntent(contentIntent);
    }

    private android.app.Notification buildNotification(String title, String artist, boolean isPlaying) {
        PendingIntent playIntent = buildActionIntent(PlaybackActionReceiver.ACTION_PLAY);
        PendingIntent pauseIntent = buildActionIntent(PlaybackActionReceiver.ACTION_PAUSE);
        PendingIntent dismissIntent = buildActionIntent(PlaybackActionReceiver.ACTION_DISMISS);

        NotificationCompat.Builder builder = buildBaseBuilder(title, artist)
            .addAction(
                isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                isPlaying ? "Pause" : "Play",
                isPlaying ? pauseIntent : playIntent
            )
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Tutup", dismissIntent);

        builder.setOngoing(isPlaying);

        return builder.build();
    }

    private PendingIntent buildActionIntent(String action) {
        Intent intent = new Intent(getContext(), PlaybackActionReceiver.class);
        intent.setAction(action);
        intent.setPackage(getContext().getPackageName());

        return PendingIntent.getBroadcast(
            getContext(),
            action.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Sonara Playback",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Kontrol pemutaran Sonara");

        NotificationManager manager = getContext().getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }
}
