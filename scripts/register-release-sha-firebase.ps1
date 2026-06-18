$ErrorActionPreference = "Stop"
$shaScript = Join-Path $PSScriptRoot "get-android-release-sha.ps1"
$lines = & powershell -NoProfile -ExecutionPolicy Bypass -File $shaScript
$sha1 = ($lines | Where-Object { $_ -like 'SHA1=*' }) -replace '^SHA1=', ''
$sha256 = ($lines | Where-Object { $_ -like 'SHA256=*' }) -replace '^SHA256=', ''
$sha1Hex = ($sha1 -replace ':', '').ToLower()
$sha256Hex = ($sha256 -replace ':', '').ToLower()
$appId = "1:405501753361:android:056a09f4c568b8a798d9b0"
$project = "mahalak-0"

function Add-ShaIfMissing($hash) {
    $existing = firebase apps:android:sha:list $appId --project $project 2>&1 | Out-String
    if ($existing -match [regex]::Escape($hash)) {
        Write-Host "Already registered: $hash"
        return
    }
    firebase apps:android:sha:create $appId $hash --project $project
}

Add-ShaIfMissing $sha1Hex
Add-ShaIfMissing $sha256Hex
Write-Host "Release SHA registered for iq.mahalak.app"
