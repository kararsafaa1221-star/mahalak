# Build signed AAB for Google Play.
# Prerequisites: android/keystore.properties + android/mahalak-release.keystore

$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot ".." | Resolve-Path
$androidDir = Join-Path $root "android"
$keystoreProps = Join-Path $androidDir "keystore.properties"
$keystoreFile = Join-Path $androidDir "mahalak-release.keystore"
$aabPath = Join-Path $androidDir "app\build\outputs\bundle\release\app-release.aab"

if (-not (Test-Path $keystoreProps)) {
    Write-Host "Missing android/keystore.properties" -ForegroundColor Red
    Write-Host "Run: powershell -ExecutionPolicy Bypass -File scripts/setup-android-signing.ps1"
    exit 1
}

if (-not (Test-Path $keystoreFile)) {
    Write-Host "Missing android/mahalak-release.keystore" -ForegroundColor Red
    Write-Host "Run: powershell -ExecutionPolicy Bypass -File scripts/setup-android-signing.ps1"
    exit 1
}

Push-Location $root
try {
    Write-Host "Building web assets..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    Write-Host "Syncing Capacitor..." -ForegroundColor Cyan
    npx cap sync android
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    Write-Host "Building signed AAB..." -ForegroundColor Cyan
    Push-Location $androidDir
    .\gradlew.bat bundleRelease
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Pop-Location

    if (Test-Path $aabPath) {
        Write-Host ""
        Write-Host "Success! Upload this file to Google Play:" -ForegroundColor Green
        Write-Host $aabPath
        Write-Host ""
    } else {
        Write-Host "Build finished but AAB not found at expected path." -ForegroundColor Yellow
        exit 1
    }
} finally {
    Pop-Location
}
