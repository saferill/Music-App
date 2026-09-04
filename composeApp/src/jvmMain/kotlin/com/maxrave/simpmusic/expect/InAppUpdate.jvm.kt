package com.maxrave.simpmusic.expect

actual fun startInAppUpdate(
    url: String,
    fileName: String,
): Boolean {
    openUrl(url)
    return false
}
