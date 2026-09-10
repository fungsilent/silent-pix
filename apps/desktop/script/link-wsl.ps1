param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination
)

$ErrorActionPreference = 'Stop'

try {
    $sourceRoot = (Resolve-Path -LiteralPath $Source).ProviderPath
    $destinationRoot = [System.IO.Path]::GetFullPath($Destination)
    if ($destinationRoot -notmatch '^[A-Za-z]:\\') {
        throw 'Destination must be an absolute Windows drive path.'
    }

    $entries = @('src', 'script', 'capabilities', 'icons', 'Cargo.toml', 'build.rs', 'tauri.conf.json', 'package.json')
    foreach ($entry in $entries) {
        if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot $entry))) {
            throw "Source is missing $entry. Supply the apps/desktop directory."
        }
    }

    if (Test-Path -LiteralPath $destinationRoot) {
        $directory = Get-Item -LiteralPath $destinationRoot -Force
        if (-not $directory.PSIsContainer -or ($directory.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
            throw 'Destination must be a regular directory.'
        }
        if (@(Get-ChildItem -LiteralPath $destinationRoot -Force).Count -gt 0) {
            throw 'Destination is not empty. Choose a new directory; existing files will not be overwritten.'
        }
    } else {
        New-Item -ItemType Directory -Path $destinationRoot | Out-Null
    }

    foreach ($entry in $entries) {
        New-Item -ItemType SymbolicLink -Path (Join-Path $destinationRoot $entry) -Target (Join-Path $sourceRoot $entry) | Out-Null
    }

    # Keep the lockfile local: Cargo can replace it while resolving dependencies.
    $sourceLock = Join-Path $sourceRoot 'Cargo.lock'
    if (Test-Path -LiteralPath $sourceLock) {
        Copy-Item -LiteralPath $sourceLock -Destination (Join-Path $destinationRoot 'Cargo.lock')
    }

    Write-Host "Linked desktop source into $destinationRoot"
    Write-Host 'Run pnpm.cmd install there, start Vite in WSL, then run script\dev-wsl.bat.'
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host 'Symbolic links require suitable Windows permissions. Try an elevated PowerShell terminal.'
    Write-Host 'If links were partially created, inspect the destination and retry with a new empty directory.'
    exit 1
}
