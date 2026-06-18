# Creates release keystore + keystore.properties for Google Play signing.
# Run from repo root:  powershell -ExecutionPolicy Bypass -File scripts/setup-android-signing.ps1

$ErrorActionPreference = "Stop"
$rootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$androidDir = Join-Path $rootDir "android"
$keystorePath = Join-Path $androidDir "mahalak-release.keystore"
$propsPath = Join-Path $androidDir "keystore.properties"
$keyAlias = "mahalak"

function ConvertFrom-SecureStringPlain {
    param([Security.SecureString]$Secure)
    return [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure))
}

Write-Host ""
Write-Host "=== Mahalak Android Release Signing Setup ===" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $keystorePath) {
    Write-Host "Keystore already exists: $keystorePath" -ForegroundColor Yellow
} else {
    Write-Host "Create a NEW keystore for Google Play." -ForegroundColor White
    Write-Host "Use a strong password and SAVE IT - you cannot recover it if lost." -ForegroundColor Yellow
    Write-Host ""

    $storePass = Read-Host "Enter keystore password" -AsSecureString
    $keyPass = Read-Host "Re-enter key password (same as keystore is fine)" -AsSecureString

    $storePassPlain = ConvertFrom-SecureStringPlain $storePass
    $keyPassPlain = ConvertFrom-SecureStringPlain $keyPass

    $dname = "CN=Mahalak, OU=Mobile, O=Mahalak, L=Baghdad, ST=Baghdad, C=IQ"

    & keytool -genkey -v `
        -keystore $keystorePath `
        -alias $keyAlias `
        -keyalg RSA `
        -keysize 2048 `
        -validity 10000 `
        -storepass $storePassPlain `
        -keypass $keyPassPlain `
        -dname $dname

    if ($LASTEXITCODE -ne 0) {
        Write-Host "keytool failed. Is Java JDK installed?" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Keystore created: $keystorePath" -ForegroundColor Green
}

if (-not (Test-Path $propsPath)) {
    if (-not (Test-Path $keystorePath)) {
        Write-Host "No keystore found. Run this script again to create one." -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Creating keystore.properties..." -ForegroundColor White
    $storePass = Read-Host "Enter keystore password for keystore.properties" -AsSecureString
    $keyPass = Read-Host "Enter key password for keystore.properties" -AsSecureString

    $storePassPlain = ConvertFrom-SecureStringPlain $storePass
    $keyPassPlain = ConvertFrom-SecureStringPlain $keyPass

    $lines = @(
        "storeFile=mahalak-release.keystore",
        "storePassword=$storePassPlain",
        "keyAlias=$keyAlias",
        "keyPassword=$keyPassPlain"
    )
    Set-Content -Path $propsPath -Value ($lines -join [Environment]::NewLine) -Encoding Ascii

    Write-Host ("Created: " + $propsPath) -ForegroundColor Green
} else {
    Write-Host ("keystore.properties already exists: " + $propsPath) -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== SHA fingerprints (add release SHA-1 to Firebase iq.mahalak.app) ===" -ForegroundColor Cyan
& keytool -list -v -keystore $keystorePath -alias $keyAlias 2>&1 | Select-String -Pattern "SHA1:|SHA256:"

Write-Host ""
Write-Host "Next: npm run build:android:release" -ForegroundColor Green
Write-Host ""
