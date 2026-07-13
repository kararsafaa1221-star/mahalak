# Sets OneSignal secrets in Firebase (Google Cloud Secret Manager).
# Usage:
#   .\scripts\setup-onesignal-secrets.ps1 -CustomerRestApiKey "os_v2_app_..."
# Optional merchant key (generate in OneSignal merchant app Keys and IDs):
#   .\scripts\setup-onesignal-secrets.ps1 -CustomerRestApiKey "..." -MerchantRestApiKey "os_v2_app_..."

param(
  [string]$CustomerRestApiKey = $env:MAHALAK_ONESIGNAL_CUSTOMER_REST_KEY,
  [string]$MerchantRestApiKey = $env:MAHALAK_ONESIGNAL_MERCHANT_REST_KEY,
  [string]$AdminRestApiKey = $env:MAHALAK_ONESIGNAL_ADMIN_REST_KEY,
  [string]$CustomerAppId = "72e9bba5-accd-4ee9-aa87-11d883b55748",
  [string]$MerchantAppId = "7d625bd6-2545-488d-8324-84aa0d4faecf",
  [string]$AdminAppId = $env:MAHALAK_ONESIGNAL_ADMIN_APP_ID
)

if (-not $CustomerRestApiKey) {
  Write-Error "CustomerRestApiKey is required. Pass -CustomerRestApiKey or set MAHALAK_ONESIGNAL_CUSTOMER_REST_KEY."
}

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

function Set-FirebaseSecret {
  param([string]$Name, [string]$Value)
  $tmp = [System.IO.Path]::GetTempFileName()
  try {
    [System.IO.File]::WriteAllText($tmp, $Value, [System.Text.UTF8Encoding]::new($false))
    npx firebase functions:secrets:set $Name --data-file $tmp --force
    Write-Host "OK: $Name"
  } finally {
    Remove-Item -Force $tmp -ErrorAction SilentlyContinue
  }
}

Write-Host ""
Write-Host "==> Setting OneSignal Firebase secrets (project: mahalak-0)"
Write-Host ""

Set-FirebaseSecret -Name "ONESIGNAL_APP_ID" -Value $CustomerAppId
Set-FirebaseSecret -Name "ONESIGNAL_REST_API_KEY" -Value $CustomerRestApiKey
Set-FirebaseSecret -Name "MERCHANT_ONESIGNAL_APP_ID" -Value $MerchantAppId

$merchantKey = $MerchantRestApiKey
if (-not $merchantKey) {
  Write-Host "WARN: MERCHANT_ONESIGNAL_REST_API_KEY not set - using customer key as placeholder."
  Write-Host "      Generate a merchant app key in OneSignal and re-run with -MerchantRestApiKey."
  $merchantKey = $CustomerRestApiKey
}
Set-FirebaseSecret -Name "MERCHANT_ONESIGNAL_REST_API_KEY" -Value $merchantKey

if ($AdminAppId -and $AdminRestApiKey) {
  Set-FirebaseSecret -Name "ADMIN_ONESIGNAL_APP_ID" -Value $AdminAppId
  Set-FirebaseSecret -Name "ADMIN_ONESIGNAL_REST_API_KEY" -Value $AdminRestApiKey
  Write-Host "OK: ADMIN_ONESIGNAL_* (add both to ONESIGNAL_SECRETS in functions/index.js then redeploy)"
} else {
  Write-Host "SKIP: ADMIN_ONESIGNAL_* (optional — for server push to admin staff)"
}

Write-Host ""
Write-Host "Done. Deploy with: npm run deploy:functions"
Write-Host ""
