# Completes push notification backend setup: secrets + sequential function deploys.
# Requires MAHALAK_ONESIGNAL_CUSTOMER_REST_KEY in environment (or pass -CustomerRestApiKey).

param(
  [string]$CustomerRestApiKey = $env:MAHALAK_ONESIGNAL_CUSTOMER_REST_KEY,
  [string]$MerchantRestApiKey = $env:MAHALAK_ONESIGNAL_MERCHANT_REST_KEY
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

if (-not $CustomerRestApiKey) {
  Write-Error "Set MAHALAK_ONESIGNAL_CUSTOMER_REST_KEY or pass -CustomerRestApiKey"
}

Write-Host "`n==> 1/3 OneSignal Firebase secrets`n"
$setupArgs = @{
  CustomerRestApiKey = $CustomerRestApiKey
}
if ($MerchantRestApiKey) {
  $setupArgs.MerchantRestApiKey = $MerchantRestApiKey
}
& "$root\scripts\setup-onesignal-secrets.ps1" @setupArgs"

Write-Host "`n==> 2/3 Deploy push-related Cloud Functions (sequential)`n"
$pushFunctions = @(
  "onNotificationCreated",
  "onPromoCodeCreated",
  "dispatchOneSignalPush",
  "sendPushNotification"
)

foreach ($fn in $pushFunctions) {
  Write-Host "--- deploying $fn ---"
  npx firebase deploy --only "functions:$fn"
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "$fn deploy failed — waiting 45s before retry..."
    Start-Sleep -Seconds 45
    npx firebase deploy --only "functions:$fn"
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "$fn still failed (Cloud Run CPU quota). Retry later."
    }
  }
  Start-Sleep -Seconds 20
}

Write-Host "`n==> 3/3 Verification`n"
npm run verify:android
npm run verify:ios

Write-Host "`nDone. If merchant pushes fail, create REST API key in OneSignal merchant app and re-run setup.`n"
