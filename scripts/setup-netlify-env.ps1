# Run after: npx netlify login
# Usage: powershell -ExecutionPolicy Bypass -File scripts/setup-netlify-env.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $ProjectRoot ".env.netlify"

if (-not (Test-Path $EnvFile)) {
  Write-Host "יוצר קובץ .env.netlify..." -ForegroundColor Yellow
  @"
DATABASE_URL=
JWT_SECRET=home-inventory-jwt-secret-2026-change-me
ADMIN_FAMILY_NAME=admin
ADMIN_ADDRESS=admin
ADMIN_CODE=1234
"@ | Set-Content -Path $EnvFile -Encoding UTF8
  Write-Host "ערכו את $EnvFile והדביקו את DATABASE_URL מ-Neon, ואז הריצו שוב." -ForegroundColor Red
  exit 1
}

Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '^\s*([^=]+)=(.*)$') { return }
  $name = $matches[1].Trim()
  $value = $matches[2].Trim().Trim('"')
  if ($value) { Set-Item -Path "env:$name" -Value $value }
}

if (-not $env:DATABASE_URL) {
  Write-Host "חסר DATABASE_URL ב-.env.netlify" -ForegroundColor Red
  exit 1
}

Write-Host "מגדיר משתני סביבה ב-Netlify..." -ForegroundColor Cyan
npx --yes netlify-cli@17 link --name dfusbb-home-inventory
npx --yes netlify-cli@17 env:set DATABASE_URL $env:DATABASE_URL --context production --force
npx --yes netlify-cli@17 env:set JWT_SECRET $env:JWT_SECRET --context production --force
npx --yes netlify-cli@17 env:set ADMIN_FAMILY_NAME $env:ADMIN_FAMILY_NAME --context production --force
npx --yes netlify-cli@17 env:set ADMIN_ADDRESS $env:ADMIN_ADDRESS --context production --force
npx --yes netlify-cli@17 env:set ADMIN_CODE $env:ADMIN_CODE --context production --force

Write-Host "מפעיל פריסה..." -ForegroundColor Cyan
npx --yes netlify-cli@17 deploy --prod --build

Write-Host "סיום." -ForegroundColor Green
