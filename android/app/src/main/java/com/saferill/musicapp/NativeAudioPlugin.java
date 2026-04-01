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
    public void setQueue(PluginCall call) {
        com.getcapacitor.JSArray tracks = call.getArray("tracks");
        int startIndex = call.getInt("startIndex", 0);
        boolean autoplay = call.getBoolean("autoplay", true);
        double position = call.getDouble("position", 0D);

        if (tracks == null || tracks.length() == 0) {
            call.reject("Tracks array is required");
            return;
        }

        try {
            int len = tracks.length();
            String[] urls = new String[len];
            String[] titles = new String[len];
            String[] artists = new String[len];
            String[] artworkUrls = new String[len];
            String[] trackIds = new String[len];

            for (int i = 0; i < len; i++) {
                JSObject track = tracks.getObject(i);
                urls[i] = track.getString("url", "");
                titles[i] = track.getString("title", "Sonara");
                artists[i] = track.getString("artist", "");
                artworkUrls[i] = track.getString("artworkUrl", "");
                trackIds[i] = track.getString("trackId", "");
            }

            Intent intent = NativePlaybackService.createActionIntent(getContext(), NativePlaybackService.ACTION_SET_QUEUE);
            intent.putExtra("urls", urls);
            intent.putExtra("titles", titles);
            intent.putExtra("artists", artists);
            intent.putExtra("artworkUrls", artworkUrls);
            intent.putExtra("trackIds", trackIds);
            intent.putExtra("startIndex", startIndex);
            intent.putExtra("autoplay", autoplay);
            intent.putExtra("position", position);

            startPlaybackService(intent, autoplay);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void setTrack(PluginCall call) {
        // Reuse setQueue logic for a single track to keep it robust
        com.getcapacitor.JSArray tracks = new com.getcapacitor.JSArray();
        tracks.put(call.getData());
        call.getData().put("tracks", tracks);
        setQueue(call);
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
    public void setShuffle(PluginCall call) {
        boolean shuffle = call.getBoolean("shuffle", false);
        Intent intent = NativePlaybackService.createActionIntent(getContext(), NativePlaybackService.ACTION_SET_SHUFFLE);
        intent.putExtra("shuffle", shuffle);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void removeTrack(PluginCall call) {
        int index = call.getInt("index", -1);
        Intent intent = NativePlaybackService.createActionIntent(getContext(), NativePlaybackService.ACTION_REMOVE_TRACK);
        intent.putExtra("position", index); // Reusing EXTRA_POSITION
        getContext().startService(intent);
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
