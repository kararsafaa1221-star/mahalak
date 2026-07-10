# Creates a NEW release keystore for the merchant app (iq.mahalak.merchant).
# Independent from apps/customer/android/ — do not share keystores.
# Run from repo root:
#   powershell -ExecutionPolicy Bypass -File scripts/setup-merchant-android-signing.ps1

$ErrorActionPreference = "Stop"
$rootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$androidDir = Join-Path $rootDir "apps\merchant\android"
$keystorePath = Join-Path $androidDir "mahalak-merchant.jks"
$propsPath = Join-Path $androidDir "keystore.properties"
$keyAlias = "mahalak-merchant"

function ConvertFrom-SecureStringPlain {
    param([Security.SecureString]$Secure)
    return [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure))
}

Write-Host ""
Write-Host "=== Mahalak MERCHANT Android Signing (new app) ===" -ForegroundColor Cyan
Write-Host "Folder: $androidDir" -ForegroundColor DarkGray
Write-Host ""

if (Test-Path $keystorePath) {
    Write-Host "Keystore already exists: $keystorePath" -ForegroundColor Yellow
} else {
    Write-Host "Creating NEW keystore for Google Play listing: iq.mahalak.merchant" -ForegroundColor White
    Write-Host "Save passwords securely — they cannot be recovered if lost." -ForegroundColor Yellow
    Write-Host ""

    $storePass = Read-Host "Enter keystore password" -AsSecureString
    $keyPass = Read-Host "Re-enter key password (same as keystore is fine)" -AsSecureString

    $storePassPlain = ConvertFrom-SecureStringPlain $storePass
    $keyPassPlain = ConvertFrom-SecureStringPlain $keyPass

    $dname = "CN=Mahalak Merchant, OU=Mobile, O=Mahalak, L=Baghdad, ST=Baghdad, C=IQ"

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
        "storeFile=mahalak-merchant.jks",
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
Write-Host "=== SHA fingerprints (add release SHA-1 to Firebase iq.mahalak.merchant) ===" -ForegroundColor Cyan
Write-Host "Run manually if needed:" -ForegroundColor DarkGray
Write-Host "  keytool -list -v -keystore `"$keystorePath`" -alias $keyAlias" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Next:" -ForegroundColor Green
Write-Host "  npm run cap:sync:merchant" -ForegroundColor White
Write-Host "  cd apps/merchant/android && .\gradlew.bat bundleRelease" -ForegroundColor White
Write-Host ""
