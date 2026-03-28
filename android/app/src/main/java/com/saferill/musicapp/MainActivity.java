package com.saferill.musicapp;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdatePlugin.class);
        registerPlugin(NativeAudioPlugin.class);
        registerPlugin(PlaybackNotificationPlugin.class);
        super.onCreate(savedInstanceState);
        PlaybackNotificationPlugin.captureIntentAction(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        PlaybackNotificationPlugin.captureIntentAction(intent);
    }
}
