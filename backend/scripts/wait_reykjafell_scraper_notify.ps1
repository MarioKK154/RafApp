# Waits until no python.exe is running the Reykjafell Playwright backfill, then shows a message.
# Run manually:  powershell -ExecutionPolicy Bypass -File .\scripts\wait_reykjafell_scraper_notify.ps1
# Optional:      -PollSeconds 30

param(
    [int] $PollSeconds = 30
)

Add-Type -AssemblyName System.Windows.Forms

function Get-BackfillProcessCount {
    $procs = Get-CimInstance Win32_Process -Filter "name='python.exe'" -ErrorAction SilentlyContinue
    if (-not $procs) { return 0 }
    $n = 0
    foreach ($p in @($procs)) {
        if ($p.CommandLine -and $p.CommandLine -like '*backfill_reykjafell_product_pages_playwright*') {
            $n++
        }
    }
    return $n
}

Write-Host "Watching for Reykjafell scraper (python -m scripts.backfill_reykjafell_product_pages_playwright)..."
Write-Host "Poll every ${PollSeconds}s. Close this window to stop waiting (scraper keeps running)."

while ((Get-BackfillProcessCount) -gt 0) {
    Start-Sleep -Seconds $PollSeconds
}

[System.Windows.Forms.MessageBox]::Show(
    "Reykjafell product URL scraper has finished (no matching Python process).`n`nCheck the terminal log for Backfill finished / any errors.",
    "RafApp — Scraper done",
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Information
) | Out-Null
