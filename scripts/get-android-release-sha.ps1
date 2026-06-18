$ErrorActionPreference = "Stop"
$androidDir = (Resolve-Path (Join-Path $PSScriptRoot "..\android")).Path
$propsPath = Join-Path $androidDir "keystore.properties"
$props = @{}
Get-Content $propsPath | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
        $props[$matches[1].Trim()] = $matches[2].Trim()
    }
}
$keystorePath = Join-Path $androidDir $props['storeFile']
$keytoolOut = & keytool -list -v `
    -keystore $keystorePath `
    -alias $props['keyAlias'] `
    -storepass $props['storePassword'] 2>&1 | Out-String
$sha1 = if ($keytoolOut -match 'SHA1:\s*([0-9A-F:]+)') { $matches[1] } else { $null }
$sha256 = if ($keytoolOut -match 'SHA256:\s*([0-9A-F:]+)') { $matches[1] } else { $null }
if (-not $sha1) { throw "Could not read SHA-1 from keystore" }
Write-Output "SHA1=$sha1"
Write-Output "SHA256=$sha256"
