@echo off
echo Fixing permissions for TalkCart frontend...

echo Removing .next directory...
if exist ".next" (
    rmdir /s /q ".next"
    echo Successfully removed .next directory
) else (
    echo .next directory not found
)

echo Cleaning npm cache...
npm cache clean --force

echo Permission fix complete!
echo You can now run 'npm run dev' to start the development server
pause