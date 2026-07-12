# Run after: npx netlify login
# Usage: powershell -ExecutionPolicy Bypass -File scripts/setup-netlify-env.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $ProjectRoot ".env.netlify"

if (-not (Test-Path $EnvFile)) {
  Write-Host "Missing .env.netlify - create it with DATABASE_URL from Neon" -ForegroundColor Red
  exit 1
}

Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '^\s*([^=]+)=(.*)$') { return }
  $name = $matches[1].Trim()
  $value = $matches[2].Trim().Trim('"')
  if ($value) { Set-Item -Path "env:$name" -Value $value }
}

if (-not $env:DATABASE_URL) {
  Write-Host "Missing DATABASE_URL in .env.netlify" -ForegroundColor Red
  exit 1
}

Write-Host "Setting Netlify environment variables..." -ForegroundColor Cyan
npx --yes netlify-cli@17 link --name dfusbb-home-inventory
npx --yes netlify-cli@17 env:set DATABASE_URL $env:DATABASE_URL --context all --force
npx --yes netlify-cli@17 env:set JWT_SECRET $env:JWT_SECRET --context all --force
npx --yes netlify-cli@17 env:set ADMIN_FAMILY_NAME $env:ADMIN_FAMILY_NAME --context all --force
npx --yes netlify-cli@17 env:set ADMIN_ADDRESS $env:ADMIN_ADDRESS --context all --force
npx --yes netlify-cli@17 env:set ADMIN_CODE $env:ADMIN_CODE --context all --force

Write-Host "Triggering production deploy..." -ForegroundColor Cyan
npx --yes netlify-cli@17 deploy --prod --build

Write-Host "Done." -ForegroundColor Green
