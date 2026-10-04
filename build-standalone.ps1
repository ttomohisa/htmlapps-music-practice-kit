param(
  [switch]$ForceDownload
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigPath = Join-Path $Root 'app.config.json'
$DependenciesPath = Join-Path $Root 'dependencies.json'
$SourcePath = Join-Path $Root 'src\index.template.html'
$DistDir = Join-Path $Root 'dist'
$OutputPath = Join-Path $DistDir 'index.html'
$SelfExtractPath = Join-Path $DistDir 'index.self-extract.html'
$ManifestPath = Join-Path $DistDir 'dependency-manifest.json'

function Write-Utf8NoBom([string]$Path, [string]$Text) {
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Text, $encoding)
}

function ConvertTo-CompactJson($Object) {
  return ($Object | ConvertTo-Json -Depth 20 -Compress)
}

function ConvertTo-Base64Utf8([string]$Text) {
  return [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Text))
}

if (-not (Test-Path $ConfigPath)) { throw "Missing app.config.json" }
if (-not (Test-Path $DependenciesPath)) { throw "Missing dependencies.json" }
if (-not (Test-Path $SourcePath)) { throw "Missing src/index.template.html" }

$config = Get-Content -Raw -Encoding UTF8 $ConfigPath | ConvertFrom-Json
$dependencies = Get-Content -Raw -Encoding UTF8 $DependenciesPath | ConvertFrom-Json
$source = Get-Content -Raw -Encoding UTF8 $SourcePath

if ($dependencies.dependencies.Count -gt 0) {
  throw 'This app currently expects dependencies.json to stay empty. Add template dependency fetching before adding third-party packages.'
}

$placeholders = @('__APP_CONFIG_JSON__', '__BUILD_MANIFEST_JSON__', '__EMBEDDED_ASSET_BUNDLE_BASE64__')
foreach ($placeholder in $placeholders) {
  $matches = ([regex]::Matches($source, [regex]::Escape($placeholder))).Count
  if ($matches -ne 1) { throw "Expected exactly one $placeholder placeholder, found $matches." }
}

$generatedAt = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
$buildManifest = [ordered]@{
  appName = $config.name
  appVersion = $config.version
  generatedAtUtc = $generatedAt
  dependencyCount = 0
  dependencies = @()
}
$assetBundle = [ordered]@{ dependencies = [ordered]@{} }

$configJson = ConvertTo-CompactJson $config
$manifestJson = ConvertTo-CompactJson $buildManifest
$assetBundleBase64 = ConvertTo-Base64Utf8 (ConvertTo-CompactJson $assetBundle)

$output = $source.Replace('__APP_CONFIG_JSON__', $configJson).Replace('__BUILD_MANIFEST_JSON__', $manifestJson).Replace('__EMBEDDED_ASSET_BUNDLE_BASE64__', $assetBundleBase64)

New-Item -ItemType Directory -Force -Path $DistDir | Out-Null
Write-Utf8NoBom $OutputPath $output
# Browser Kitty reads this root alias; keep it generated from the same source.
Write-Utf8NoBom (Join-Path $Root 'music-practice-kit.html') $output
Write-Utf8NoBom $ManifestPath (ConvertTo-CompactJson $buildManifest)
Write-Utf8NoBom (Join-Path $DistDir '.nojekyll') ''

# Generate gzip self-extracting HTML compatible with the template release model.
$inputBytes = [Text.Encoding]::UTF8.GetBytes($output)
$memory = New-Object IO.MemoryStream
$gzip = New-Object IO.Compression.GZipStream($memory, [IO.Compression.CompressionMode]::Compress, $true)
$gzip.Write($inputBytes, 0, $inputBytes.Length)
$gzip.Dispose()
$compressed = $memory.ToArray()
$memory.Dispose()
$gzipBase64 = [Convert]::ToBase64String($compressed)

$selfExtract = @"
<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="light">
<title>$($config.name)</title>
<style>html,body{margin:0;min-height:100%;background:#f5f5f2;color:#20211f;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{display:grid;place-items:center}.loader{padding:24px;text-align:center}.spinner{width:32px;height:32px;margin:0 auto 12px;border:3px solid #dadbd6;border-top-color:#16624f;border-radius:50%;animation:r .8s linear infinite}@keyframes r{to{transform:rotate(360deg)}}</style>
</head>
<body><div class="loader"><div class="spinner"></div><div>Opening Music Practice Kit…</div></div>
<script>
(async()=>{const b='$gzipBase64';try{if(!('DecompressionStream'in self))throw new Error('DecompressionStream is not supported');const bin=atob(b);const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));const html=await new Response(stream).text();document.open();document.write(html);document.close()}catch(e){document.body.innerHTML='<div class="loader"><strong>Could not open the self-extracting build.</strong><p>Please use dist/index.html in this browser.</p></div>';console.error(e)}})();
</script></body></html>
"@
Write-Utf8NoBom $SelfExtractPath $selfExtract

& powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root 'scripts\verify-standalone.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Built: $OutputPath"
Write-Host "Built: $SelfExtractPath"
