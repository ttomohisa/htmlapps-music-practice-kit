$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$required = @(
  'AGENTS.md','APP_SPEC.md','README.md','README.ja.md','CHANGELOG.md','LICENSE','SECURITY.md',
  'app.config.json','dependencies.json','src\index.template.html','build-standalone.bat','build-standalone.ps1',
  'scripts\verify-standalone.ps1','.github\workflows\deploy-pages.yml'
)
$missing = @()
foreach ($item in $required) { if (-not (Test-Path (Join-Path $Root $item))) { $missing += $item } }
if ($missing.Count) { Write-Error ("Missing required files: " + ($missing -join ', ')); exit 1 }
$source = Get-Content -Raw -Encoding UTF8 (Join-Path $Root 'src\index.template.html')
foreach ($placeholder in @('__APP_CONFIG_JSON__','__BUILD_MANIFEST_JSON__','__EMBEDDED_ASSET_BUNDLE_BASE64__')) {
  $count = ([regex]::Matches($source,[regex]::Escape($placeholder))).Count
  if ($count -ne 1) { Write-Error "Placeholder $placeholder occurs $count times."; exit 1 }
}
if ($source -match '<script\s+[^>]*src\s*=|<link\s+[^>]*href\s*=\s*["'']https?://|@import\s+url|fetch\s*\(|XMLHttpRequest|WebSocket\s*\(') {
  Write-Error 'Source contains a disallowed runtime external-loading pattern.'; exit 1
}
& node --test (Join-Path $Root 'tests/metronome.test.cjs')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'Repository checks passed.'
