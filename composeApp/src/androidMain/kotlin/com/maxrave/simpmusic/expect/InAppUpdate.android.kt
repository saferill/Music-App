package com.maxrave.simpmusic.expect

import com.maxrave.simpmusic.update.InAppUpdateManager
import org.koin.mp.KoinPlatform.getKoin

actual fun startInAppUpdate(
    url: String,
    fileName: String,
): Boolean {
    val context = getKoin().get<androidx.appcompat.app.AppCompatActivity>()
    return InAppUpdateManager.startUpdate(context, url, fileName)
}
