package com.saferill.musicapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class PlaybackActionReceiver extends BroadcastReceiver {
    public static final String ACTION_PLAY = "com.saferill.musicapp.action.PLAY";
    public static final String ACTION_PAUSE = "com.saferill.musicapp.action.PAUSE";
    public static final String ACTION_DISMISS = "com.saferill.musicapp.action.DISMISS";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;
        if (action == null) return;

        if (ACTION_DISMISS.equals(action)) {
            PlaybackNotificationPlugin.dismiss(context);
            return;
        }

        String mappedAction = ACTION_PLAY.equals(action) ? "play" : "pause";
        PlaybackNotificationPlugin.dispatchAction(mappedAction);

        if (ACTION_PLAY.equals(action)) {
            Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                launchIntent.putExtra(PlaybackNotificationPlugin.EXTRA_ACTION, mappedAction);
                context.startActivity(launchIntent);
            }
        }
    }
}
