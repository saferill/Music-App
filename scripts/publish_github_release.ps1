param (
    [string]$TagName = "v1.0.0",
    [string]$ReleaseName = "Sonara Music v1.0.0",
    [string]$Token = $env:GITHUB_TOKEN,
    [string]$Owner = "saferill",
    [string]$Repo = "Music-App",
    [string]$ApkDir = "androidApp/build/outputs/apk/release"
)

Write-Host "========================================"
Write-Host " Sonara Music -> Publish GitHub Release "
Write-Host "========================================"

$gitExe = "C:\Users\mochs\AppData\Local\Programs\MinGit\cmd\git.exe"

# Extract token from git remote if not provided
if (-not $Token) {
    $remoteUrl = & $gitExe remote get-url origin
    if ($remoteUrl -match 'https://[^:]+:([^@]+)@github\.com') {
        $Token = $Matches[1]
    }
}

if (-not $Token) {
    Write-Error "GitHub token not found. Please specify -Token or set GITHUB_TOKEN environment variable."
    exit 1
}

# 1. Tag & Push Tag if needed
Write-Host "Checking git tag $TagName..."
& $gitExe tag -f $TagName
& $gitExe push origin $TagName --force

$headers = @{
    "Authorization" = "token $Token"
    "Accept"        = "application/vnd.github.v3+json"
    "User-Agent"    = "SonaraMusic-ReleaseScript"
}

# 2. Check if release already exists
$releaseUrl = "https://api.github.com/repos/$Owner/$Repo/releases"
$existingReleases = try {
    Invoke-RestMethod -Uri $releaseUrl -Headers $headers -Method Get
} catch {
    @()
}

$targetRelease = $existingReleases | Where-Object { $_.tag_name -eq $TagName }

$bodyContent = @"
## 🎵 Sonara Music v1.0.0

A modern, fast, and feature-rich YouTube Music client built with Compose Multiplatform.

### 📦 Available Release APKs:
- **`Sonara Music.apk`**: Standalone universal release installer (Recommended)
- **`androidApp-arm64-v8a-release.apk`**: 64-bit ARM smartphones
- **`androidApp-armeabi-v7a-release.apk`**: 32-bit ARM devices
- **`androidApp-x86_64-release.apk`**: 64-bit Intel/AMD Chromebooks & Emulators
- **`androidApp-x86-release.apk`**: 32-bit x86 Emulators
- **`androidApp-universal-release.apk`**: Universal all-in-one APK

### ✨ Features:
- Stream and download music and podcasts
- Rich modern Material 3 Expressive UI with fluid animations
- Offline playback & synced / AI-translated lyrics
- Background playback and full media session controls
- No ads & privacy-focused
"@

if ($null -eq $targetRelease) {
    Write-Host "Creating new release for tag $TagName..."
    $releasePayload = @{
        tag_name         = $TagName
        target_commitish = "main"
        name             = $ReleaseName
        body             = $bodyContent
        draft            = $false
        prerelease       = $false
    } | ConvertTo-Json -Compress

    $targetRelease = Invoke-RestMethod -Uri $releaseUrl -Headers $headers -Method Post -Body $releasePayload -ContentType "application/json"
    Write-Host "Created release ID: $($targetRelease.id)"
} else {
    Write-Host "Found existing release ID: $($targetRelease.id)"
}

$uploadUrlTemplate = $targetRelease.upload_url -replace '\{\?name,label\}', ''

$apkFiles = Get-ChildItem -Path $ApkDir -Filter "*.apk"
Write-Host "`nFound $($apkFiles.Count) APK files to upload."

foreach ($apk in $apkFiles) {
    $fileName = $apk.Name
    Write-Host "`nUploading $fileName ($([math]::Round($apk.Length / 1MB, 2)) MB)..."

    # Check if asset already exists on release
    $existingAsset = $targetRelease.assets | Where-Object { $_.name -eq $fileName }
    if ($null -ne $existingAsset) {
        Write-Host "Asset $fileName already exists (ID: $($existingAsset.id)). Deleting old asset first..."
        $deleteUrl = "https://api.github.com/repos/$Owner/$Repo/releases/assets/$($existingAsset.id)"
        Invoke-RestMethod -Uri $deleteUrl -Headers $headers -Method Delete
    }

    $uploadUri = "$uploadUrlTemplate?name=$fileName"
    
    # Upload binary using curl.exe for speed and large file support
    $response = curl.exe -s -L -X POST "$uploadUri" `
        -H "Authorization: token $Token" `
        -H "Content-Type: application/vnd.android.package-archive" `
        --data-binary "@$($apk.FullName)"

    Write-Host "Uploaded $fileName successfully."
}

Write-Host "`n========================================"
Write-Host " Release Published Successfully!"
Write-Host " URL: $($targetRelease.html_url)"
Write-Host "========================================"
