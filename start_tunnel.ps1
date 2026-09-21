# Auto-reconnecting tunnel daemon for external team review
while ($true) {
    Write-Host "[Tunnel] Connecting public tunnel on port 3000..."
    & npx.cmd localtunnel --port 3000 --subdomain bpp-scout-leads
    Start-Sleep -Seconds 3
}
