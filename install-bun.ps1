# Install Bun on Windows
# Run this with: powershell -ExecutionPolicy Bypass -File install-bun.ps1

Write-Host "Installing Bun..." -ForegroundColor Cyan

# Download and install Bun
irm bun.sh/install.ps1 | iex

Write-Host "`nBun installation complete!" -ForegroundColor Green
Write-Host "`nIMPORTANT: Please restart your terminal for changes to take effect." -ForegroundColor Yellow
Write-Host "`nAfter restarting, verify with:" -ForegroundColor Cyan
Write-Host "  bun --version" -ForegroundColor White
Write-Host "`nThen install Churn dependencies with:" -ForegroundColor Cyan
Write-Host "  cd C:\Users\johns\OneDrive\Desktop\churn2.0" -ForegroundColor White
Write-Host "  bun install" -ForegroundColor White

Read-Host "`nPress Enter to exit"
