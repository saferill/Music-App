package com.saferill.musicapp;

import android.content.Intent;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeAudio")
public class NativeAudioPlugin extends Plugin {
    private static volatile NativeAudioPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    @PluginMethod
    public void setTrack(PluginCall call) {
        String trackId = call.getString("trackId", "");
        String url = call.getString("url", "");
        String title = call.getString("title", "Sonara");
        String artist = call.getString("artist", "");
        String artworkUrl = call.getString("artworkUrl", null);
        boolean autoplay = call.getBoolean("autoplay", true);
        double position = call.getDouble("position", 0D);

        if (url == null || url.isEmpty()) {
            call.reject("Track URL is required");
            return;
        }

        Intent intent = NativePlaybackService.createSetTrackIntent(
            getContext(),
            trackId,
            url,
            title,
            artist,
            artworkUrl,
            autoplay,
            position
        );
        startPlaybackService(intent, autoplay);
        call.resolve();
    }

    @PluginMethod
    public void play(PluginCall call) {
        startPlaybackService(NativePlaybackService.createActionIntent(getContext(), NativePlaybackService.ACTION_PLAY), true);
        call.resolve();
    }

    @PluginMethod
    public void pause(PluginCall call) {
        getContext().startService(NativePlaybackService.createActionIntent(getContext(), NativePlaybackService.ACTION_PAUSE));
        call.resolve();
    }

    @PluginMethod
    public void seekTo(PluginCall call) {
        double position = call.getDouble("position", 0D);
        getContext().startService(NativePlaybackService.createSeekIntent(getContext(), position));
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().startService(NativePlaybackService.createActionIntent(getContext(), NativePlaybackService.ACTION_STOP));
        call.resolve();
    }

    @PluginMethod
    public void getState(PluginCall call) {
        call.resolve(NativePlaybackService.getSnapshot());
    }

    private void startPlaybackService(Intent intent, boolean foreground) {
        if (foreground) {
            ContextCompat.startForegroundService(getContext(), intent);
        } else {
            getContext().startService(intent);
        }
    }

    static void dispatchPlaybackState(JSObject payload) {
        NativeAudioPlugin currentInstance = instance;
        if (currentInstance != null) {
            currentInstance.notifyListeners("playbackState", payload, true);
        }
    }
}
