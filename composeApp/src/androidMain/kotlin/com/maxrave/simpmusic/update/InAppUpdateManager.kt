package com.maxrave.simpmusic.update

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Environment
import android.provider.Settings
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import java.io.File

object InAppUpdateManager {
    private const val PREFS_NAME = "in_app_update"
    private const val KEY_DOWNLOAD_ID = "download_id"

    private val receiver =
        object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (intent.action != DownloadManager.ACTION_DOWNLOAD_COMPLETE) return
                val downloadId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L)
                if (downloadId <= 0L) return
                val storedId =
                    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                        .getLong(KEY_DOWNLOAD_ID, -1L)
                if (downloadId != storedId) return
                installDownloadedApk(context, downloadId)
            }
        }

    fun register(context: Context) {
        val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
        ContextCompat.registerReceiver(
            context,
            receiver,
            filter,
            ContextCompat.RECEIVER_NOT_EXPORTED,
        )
    }

    fun startUpdate(context: Context, url: String, fileName: String): Boolean {
        if (url.isBlank()) return false
        return try {
            val request =
                DownloadManager.Request(Uri.parse(url))
                    .setTitle("Sonara Music update")
                    .setDescription("Downloading update")
                    .setAllowedOverMetered(true)
                    .setAllowedOverRoaming(true)
                    .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    .setDestinationInExternalFilesDir(
                        context,
                        Environment.DIRECTORY_DOWNLOADS,
                        fileName,
                    )
            val downloadManager =
                context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            val downloadId = downloadManager.enqueue(request)
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putLong(KEY_DOWNLOAD_ID, downloadId)
                .apply()
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun installDownloadedApk(context: Context, downloadId: Long) {
        val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val query = DownloadManager.Query().setFilterById(downloadId)
        val cursor = downloadManager.query(query) ?: return
        cursor.use {
            if (!it.moveToFirst()) return
            val status = it.getInt(it.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
            if (status != DownloadManager.STATUS_SUCCESSFUL) return
            val localUri = it.getString(it.getColumnIndexOrThrow(DownloadManager.COLUMN_LOCAL_URI)) ?: return
            val file = File(Uri.parse(localUri).path ?: return)
            launchInstall(context, file)
        }
    }

    private fun launchInstall(context: Context, apkFile: File) {
        if (!apkFile.exists()) return
        if (!context.packageManager.canRequestPackageInstalls()) {
            val settingsIntent =
                Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:${context.packageName}"),
                ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(settingsIntent)
            return
        }
        val uri =
            FileProvider.getUriForFile(
                context,
                "${context.packageName}.FileProvider",
                apkFile,
            )
        val installIntent =
            Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        context.startActivity(installIntent)
    }
}
