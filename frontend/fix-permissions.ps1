# Fix permissions script for TalkCart frontend
# This script helps resolve EPERM issues on Windows by resetting file permissions

Write-Host "Fixing permissions for TalkCart frontend..." -ForegroundColor Green

# Remove .next directory if it exists
if (Test-Path ".next") {
    Write-Host "Removing .next directory..." -ForegroundColor Yellow
    try {
        Remove-Item ".next" -Recurse -Force -ErrorAction Stop
        Write-Host "Successfully removed .next directory" -ForegroundColor Green
    } catch {
        Write-Host "Failed to remove .next directory: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Remove node_modules if needed (optional, uncomment if needed)
# if (Test-Path "node_modules") {
#     Write-Host "Removing node_modules directory..." -ForegroundColor Yellow
#     try {
#         Remove-Item "node_modules" -Recurse -Force -ErrorAction Stop
#         Write-Host "Successfully removed node_modules directory" -ForegroundColor Green
#     } catch {
#         Write-Host "Failed to remove node_modules directory: $($_.Exception.Message)" -ForegroundColor Red
#     }
# }

# Reset npm cache
Write-Host "Cleaning npm cache..." -ForegroundColor Yellow
try {
    npm cache clean --force
    Write-Host "Successfully cleaned npm cache" -ForegroundColor Green
} catch {
    Write-Host "Failed to clean npm cache: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Permission fix complete!" -ForegroundColor Green
Write-Host "You can now run 'npm run dev' to start the development server" -ForegroundColor Cyan