param (
    [string]$ApiKey = "e049677c-39ba-4e86-b756-0f1cf4a29a37",
    [string]$ApkPath = "Release-APKs/androidApp-universal-release.apk"
)

Write-Host "========================================"
Write-Host " Sonara Music -> Auto Publish to Aptoide "
Write-Host "========================================"

if (-not (Test-Path $ApkPath)) {
    Write-Error "APK file not found at $ApkPath. Please build the APK first."
    exit 1
}

$resolvedApk = (Resolve-Path $ApkPath).Path
Write-Host "Uploading $resolvedApk to Aptoide..."

$response = curl.exe -s -L -X POST "https://webservices.aptoide.com/webservices/3/uploadApp" `
    -H "Authorization: Bearer $ApiKey" `
    -F "apk=@$resolvedApk" `
    -F "mode=json"

Write-Host "Aptoide API Response:"
Write-Host $response
Write-Host "`nPublish process completed!"
