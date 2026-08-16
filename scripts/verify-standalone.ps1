$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$HtmlPath = Join-Path $Root 'dist\index.html'
$SelfPath = Join-Path $Root 'dist\index.self-extract.html'
if (-not (Test-Path $HtmlPath)) { Write-Error 'dist/index.html was not generated.'; exit 1 }
if (-not (Test-Path $SelfPath)) { Write-Error 'dist/index.self-extract.html was not generated.'; exit 1 }
$html = Get-Content -Raw -Encoding UTF8 $HtmlPath
foreach ($placeholder in @('__APP_CONFIG_JSON__','__BUILD_MANIFEST_JSON__','__EMBEDDED_ASSET_BUNDLE_BASE64__')) {
  if ($html.Contains($placeholder)) { Write-Error "Unresolved placeholder: $placeholder"; exit 1 }
}
if ($html -notmatch "connect-src\s+'none'") { Write-Error "CSP must contain connect-src 'none'."; exit 1 }
$badPatterns = @(
  '<script\s+[^>]*src\s*=\s*["'']https?://',
  '<link\s+[^>]*href\s*=\s*["'']https?://',
  '<iframe\s+[^>]*src\s*=\s*["'']https?://',
  '@import\s+url\s*\(\s*["'']?https?://'
)
foreach ($pattern in $badPatterns) { if ($html -match $pattern) { Write-Error "External runtime reference found: $pattern"; exit 1 } }
if ((Get-Item $HtmlPath).Length -lt 20000) { Write-Error 'Generated HTML is unexpectedly small.'; exit 1 }
Write-Host 'Standalone verification passed.'
