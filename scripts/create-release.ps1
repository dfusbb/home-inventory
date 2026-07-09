# Create cloud ZIP package and try APK build
# Run: powershell -ExecutionPolicy Bypass -File scripts/create-release.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ReleaseDir = Join-Path $ProjectRoot "release"
$ZipName = "home-inventory-cloud.zip"
$ZipPath = Join-Path $ReleaseDir $ZipName
$StagingDir = Join-Path $env:TEMP "home-inventory-staging-$(Get-Random)"

Write-Host "Creating release package..." -ForegroundColor Cyan

if (Test-Path $ReleaseDir) { Remove-Item $ReleaseDir -Recurse -Force }
New-Item -ItemType Directory -Path $ReleaseDir -Force | Out-Null
New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null

$ExcludeDirs = @(
    "node_modules", ".next", "release", ".git", "android\.gradle",
    "android\app\build", ".capacitor", "prisma\dev.db", "prisma\dev.db-journal"
)

function ShouldExclude($relativePath) {
    foreach ($ex in $ExcludeDirs) {
        if ($relativePath -like "$ex*") { return $true }
    }
    if ($relativePath -like "public\uploads\*" -and $relativePath -notlike "public\uploads\.gitkeep") {
        return $true
    }
    return $false
}

Get-ChildItem -Path $ProjectRoot -Recurse -Force | ForEach-Object {
    $rel = $_.FullName.Substring($ProjectRoot.Length + 1)
    if ($rel -eq "") { return }
    if (ShouldExclude $rel) { return }

    $dest = Join-Path $StagingDir $rel
    if ($_.PSIsContainer) {
        New-Item -ItemType Directory -Path $dest -Force | Out-Null
    } else {
        $parent = Split-Path $dest -Parent
        if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        Copy-Item $_.FullName $dest -Force
    }
}

$quickStartSrc = Join-Path $ProjectRoot "NETLIFY-QUICKSTART.md"
if (Test-Path $quickStartSrc) {
    Copy-Item $quickStartSrc (Join-Path $StagingDir "NETLIFY-QUICKSTART.md") -Force
}

Compress-Archive -Path "$StagingDir\*" -DestinationPath $ZipPath -Force
Remove-Item $StagingDir -Recurse -Force

$zipSize = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
Write-Host "ZIP created: $ZipPath ($zipSize MB)" -ForegroundColor Green

$ApkPath = Join-Path $ReleaseDir "home-inventory.apk"
$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
if (-not (Test-Path $sdkPath)) {
    $sdkPath = "$env:USERPROFILE\AppData\Local\Android\Sdk"
}

if (Test-Path $sdkPath) {
    Write-Host "Android SDK found - building APK..." -ForegroundColor Cyan
    $sdkEscaped = $sdkPath -replace '\\', '\\'
    "sdk.dir=$sdkEscaped" | Set-Content (Join-Path $ProjectRoot "android\local.properties") -Encoding ASCII
    Push-Location (Join-Path $ProjectRoot "android")
    try {
        & .\gradlew.bat assembleDebug
        $built = Join-Path $ProjectRoot "android\app\build\outputs\apk\debug\app-debug.apk"
        if (Test-Path $built) {
            Copy-Item $built $ApkPath -Force
            Write-Host "APK created: $ApkPath" -ForegroundColor Green
        }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "Android SDK not installed - APK not built locally." -ForegroundColor Yellow
    Copy-Item (Join-Path $ProjectRoot "BUILD-APK.md") (Join-Path $ReleaseDir "BUILD-APK.md") -Force -ErrorAction SilentlyContinue
}

Write-Host "Done. Output folder: $ReleaseDir" -ForegroundColor Cyan
