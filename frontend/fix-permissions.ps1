# Fix Next.js permissions script
# Run this if you encounter EPERM errors with .next directory

Write-Host "Fixing Next.js permissions..." -ForegroundColor Yellow

# Stop any running Node processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "Stopped Node processes" -ForegroundColor Green

# Remove .next directory
if (Test-Path ".next") {
    Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Removed .next directory" -ForegroundColor Green
}

# Clear npm cache
npm cache clean --force 2>$null
Write-Host "Cleared npm cache" -ForegroundColor Green

# Set environment variables to reduce file system stress
$env:NEXT_TELEMETRY_DISABLED = "1"
$env:NODE_OPTIONS = "--max-old-space-size=4096"

Write-Host "Environment variables set" -ForegroundColor Green
Write-Host "You can now run 'npm run dev' safely" -ForegroundColor Cyan

# Optional: Set folder permissions (uncomment if needed)
# icacls ".\" /grant Everyone:F /T /C /Q 2>$null