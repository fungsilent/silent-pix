$ErrorActionPreference = 'Stop'
$checks = @()
$desktopPackage = Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\package.json') -Raw | ConvertFrom-Json
$minimumPnpmVersion = [version]$desktopPackage.engines.pnpm.Substring(1)

foreach ($tool in @('node.exe', 'pnpm.cmd', 'cargo.exe', 'rustc.exe', 'rustup.exe')) {
    $detail = 'Not found on PATH'
    $ready = $false
    if (Get-Command $tool -ErrorAction SilentlyContinue) {
        try {
            # Windows PowerShell treats redirected native stderr as errors, even for exit code 0.
            $output = & { $ErrorActionPreference = 'Continue'; & $tool --version 2>&1 }
            $ready = $LASTEXITCODE -eq 0
            $detail = ($output | ForEach-Object { $_.ToString() }) -join ' '
            if ($ready -and $tool -eq 'node.exe') {
                'process.exit(typeof process.loadEnvFile === "function" ? 0 : 1)' | & $tool
                $ready = $LASTEXITCODE -eq 0
                if (-not $ready) { $detail += ' - requires process.loadEnvFile; install a current Node.js LTS' }
            }
            if ($ready -and $tool -eq 'pnpm.cmd') {
                $installedPnpmVersion = [version]$detail
                $ready = $installedPnpmVersion -ge $minimumPnpmVersion -and $installedPnpmVersion.Major -eq $minimumPnpmVersion.Major
                if (-not $ready) { $detail += " - requires pnpm $($desktopPackage.engines.pnpm)" }
            }
            if ($ready -and $tool -eq 'rustc.exe') {
                $hostInfo = & $tool -vV 2>&1
                $ready = $LASTEXITCODE -eq 0 -and [bool]($hostInfo -match '^host: .*windows-msvc$')
                if (-not $ready) { $detail += ' - run: rustup default stable-msvc' }
            }
        } catch {
            $ready = $false
            $detail = $_.Exception.Message
        }
    }
    $checks += [pscustomobject]@{ Dependency = $tool; Ready = $ready; Detail = $detail }
}

$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$visualStudio = @()
if (Test-Path -LiteralPath $vswhere) {
    $visualStudio = @(& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath)
    if ($LASTEXITCODE -ne 0) { $visualStudio = @() }
}
$checks += [pscustomobject]@{
    Dependency = 'MSVC Build Tools'; Ready = $visualStudio.Count -gt 0
    Detail = $(if ($visualStudio.Count) { $visualStudio -join ', ' } else { 'Install Desktop development with C++ using Visual Studio Installer' })
}

$kits = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows Kits\Installed Roots' -ErrorAction SilentlyContinue
$sdkHeaders = @()
if ($kits -and $kits.KitsRoot10) {
    $sdkHeaders = @(Get-ChildItem -Path (Join-Path $kits.KitsRoot10 'Include\*\um\Windows.h') -ErrorAction SilentlyContinue)
}
$checks += [pscustomobject]@{
    Dependency = 'Windows SDK'; Ready = $sdkHeaders.Count -gt 0
    Detail = $(if ($sdkHeaders.Count) { ($sdkHeaders | Select-Object -Last 1).FullName } else { 'Install Windows SDK using Visual Studio Installer' })
}

# Microsoft documents machine-wide and per-user EdgeUpdate runtime registrations.
$webViewVersion = $null
foreach ($registryRoot in @('HKLM:\SOFTWARE\WOW6432Node', 'HKLM:\SOFTWARE', 'HKCU:\SOFTWARE')) {
    $runtime = Get-ItemProperty "$registryRoot\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction SilentlyContinue
    if ($runtime -and $runtime.pv -and $runtime.pv -ne '0.0.0.0') {
        $webViewVersion = $runtime.pv
        break
    }
}
$checks += [pscustomobject]@{
    Dependency = 'WebView2 Runtime'; Ready = [bool]$webViewVersion
    Detail = $(if ($webViewVersion) { $webViewVersion } else { 'Install Microsoft Edge WebView2 Evergreen Runtime' })
}

$checks | Format-Table Dependency, Ready, Detail -AutoSize -Wrap
Write-Host 'Read-only prerequisite checks; no software was installed.'
Write-Host 'MSVC/SDK detection does not replace a native build. Start Vite separately in WSL.'
if ($checks.Ready -contains $false) { exit 1 }
exit 0
