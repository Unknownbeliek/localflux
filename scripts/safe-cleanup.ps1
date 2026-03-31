param(
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

function Resolve-RepoPath {
    param([string]$RelativePath)
    return [System.IO.Path]::GetFullPath((Join-Path $repoRoot $RelativePath))
}

function Assert-InsideRepo {
    param([string]$AbsolutePath)
    $normalizedRepo = [System.IO.Path]::GetFullPath($repoRoot)
    $normalizedTarget = [System.IO.Path]::GetFullPath($AbsolutePath)
    if (-not $normalizedTarget.StartsWith($normalizedRepo, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to touch path outside repo: $normalizedTarget"
    }
}

# Protected path guards
$protectedPrefixes = @(
    (Resolve-RepoPath 'client/dist'),
    (Resolve-RepoPath 'client/bin')
)

$protectedFiles = @(
    (Resolve-RepoPath 'package.json'),
    (Resolve-RepoPath 'client/package.json'),
    (Resolve-RepoPath 'landing/package.json'),
    (Resolve-RepoPath 'server/package.json'),
    (Resolve-RepoPath 'client/vite.config.js'),
    (Resolve-RepoPath 'landing/vite.config.js'),
    (Resolve-RepoPath '.gitignore'),
    (Resolve-RepoPath 'client/.gitignore'),
    (Resolve-RepoPath 'landing/.gitignore')
)

function Is-Protected {
    param([string]$AbsolutePath)

    foreach ($file in $protectedFiles) {
        if ($AbsolutePath.Equals($file, [System.StringComparison]::OrdinalIgnoreCase)) {
            return $true
        }
    }

    foreach ($prefix in $protectedPrefixes) {
        if ($AbsolutePath.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            return $true
        }
    }

    return $false
}

# Targeted cleanup paths from review
$explicitFiles = @(
    'landing/src/assets/react.svg',
    'landing/src/assets/vite.svg'
)

$targetGlobs = @(
    'client/public/avatars/backup_before_opt_20260331_192511/*',
    'server/public/uploads/*.webp',
    'server/public/uploads/magic/*'
)

$emptyDirs = @(
    'server/data/decks/assets/questionImg/audio'
)

$targets = New-Object System.Collections.Generic.List[string]

foreach ($relative in $explicitFiles) {
    $full = Resolve-RepoPath $relative
    if (Test-Path -LiteralPath $full -PathType Leaf) {
        $targets.Add($full)
    }
}

foreach ($glob in $targetGlobs) {
    $globPath = Join-Path $repoRoot $glob
    Get-ChildItem -Path $globPath -Force -File -ErrorAction SilentlyContinue | ForEach-Object {
        $targets.Add($_.FullName)
    }
}

$targets = $targets | Sort-Object -Unique

if ($targets.Count -eq 0) {
    Write-Host 'No cleanup targets found. Nothing to do.' -ForegroundColor Yellow
    exit 0
}

Write-Host "Repo root: $repoRoot" -ForegroundColor Cyan
Write-Host ''
Write-Host 'Planned file deletions:' -ForegroundColor Cyan
$targets | ForEach-Object { Write-Host " - $_" }
Write-Host ''

if (-not $Execute) {
    Write-Host 'Dry run only. Re-run with -Execute to delete these files.' -ForegroundColor Yellow
    exit 0
}

foreach ($path in $targets) {
    Assert-InsideRepo -AbsolutePath $path
    if (Is-Protected -AbsolutePath $path) {
        throw "Refusing to delete protected path: $path"
    }

    if (Test-Path -LiteralPath $path -PathType Leaf) {
        Remove-Item -LiteralPath $path -Force
        Write-Host "Deleted: $path" -ForegroundColor Green
    }
}

foreach ($relativeDir in $emptyDirs) {
    $dirPath = Resolve-RepoPath $relativeDir
    Assert-InsideRepo -AbsolutePath $dirPath

    if (Test-Path -LiteralPath $dirPath -PathType Container) {
        $remaining = Get-ChildItem -LiteralPath $dirPath -Force | Where-Object { $_.Name -ne '.gitkeep' }
        if (-not $remaining) {
            Remove-Item -LiteralPath $dirPath -Force
            Write-Host "Removed empty directory: $dirPath" -ForegroundColor Green
        } else {
            Write-Host "Skipped non-empty directory: $dirPath" -ForegroundColor Yellow
        }
    }
}

Write-Host ''
Write-Host 'Cleanup complete.' -ForegroundColor Cyan
