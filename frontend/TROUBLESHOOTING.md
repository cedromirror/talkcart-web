# 🔧 TalkCart Frontend Troubleshooting Guide

## 🚨 Common Issues and Solutions

### 1. EPERM: operation not permitted, open '.next\trace'

**Problem:** Windows permission error when Next.js tries to write trace files.

**Solutions:**

#### Quick Fix (Recommended)
```bash
# Stop development server (Ctrl+C)
npm run clean:next
npm run dev
```

#### Alternative Methods
```bash
# Method 1: Use the clean dev script
npm run dev:clean

# Method 2: Use the PowerShell fix script
npm run fix-permissions

# Method 3: Manual cleanup
# Stop all Node processes first, then:
rmdir /s /q .next
npm run dev
```

#### PowerShell Script (Automated)
```powershell
# Run the included script
.\fix-permissions.ps1
```

#### Batch File (Windows)
```cmd
# Double-click or run
fix-permissions.bat
```

### 2. Port Already in Use

**Problem:** Port 4000 is already occupied.

**Solution:**
```bash
# Find and kill process using port 4000
netstat -ano | findstr :4000
taskkill /PID <PID_NUMBER> /F

# Or use a different port
next dev -p 3000
```

### 3. Module Parse Failed / Duplicate Exports

**Problem:** Duplicate function declarations or import issues.

**Solution:**
```bash
# Clear Next.js cache and restart
npm run clean:next
npm run dev
```

### 4. File System Watching Issues

**Problem:** Hot reload not working or file watching errors.

**Solutions:**
```bash
# Increase file watcher limit (if on WSL/Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf

# For Windows, restart with clean cache
npm run dev:clean
```

### 5. Memory Issues

**Problem:** JavaScript heap out of memory.

**Solution:**
```bash
# Set Node.js memory limit
set NODE_OPTIONS=--max-old-space-size=4096
npm run dev

# Or add to package.json scripts (already included)
```

### 6. TypeScript Compilation Errors

**Problem:** Type checking failures.

**Solutions:**
```bash
# Check types without running dev server
npm run type-check

# Fix common issues
npm run lint:fix
```

## 🛠️ Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run dev:clean` - Clean .next and start dev server
- `npm run dev:turbo` - Start with Turbo mode (experimental)

### Cleaning
- `npm run clean` - Remove .next, out, and node_modules
- `npm run clean:next` - Remove only .next directory

### Fixing Issues
- `npm run fix-permissions` - Run PowerShell permission fix script
- `.\fix-permissions.ps1` - PowerShell script for permission issues
- `fix-permissions.bat` - Batch file for permission issues

### Building & Testing
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Check code style
- `npm run type-check` - Check TypeScript types

## 🔍 Debugging Steps

### 1. Check Server Status
```bash
# Check if port 4000 is in use
netstat -ano | findstr :4000

# Check running Node processes
tasklist | findstr node.exe
```

### 2. Clear All Caches
```bash
# Clear npm cache
npm cache clean --force

# Clear Next.js cache
npm run clean:next

# Clear browser cache (Ctrl+Shift+R)
```

### 3. Restart Everything
```bash
# Stop all Node processes
taskkill /f /im node.exe

# Clean and restart
npm run dev:clean
```

### 4. Check File Permissions
```bash
# Check if you can write to the directory
echo test > test.txt
del test.txt

# If permission denied, run as administrator or use fix scripts
```

## 🚀 Performance Optimization

### Environment Variables
Add these to your environment or .env.local:
```env
NEXT_TELEMETRY_DISABLED=1
NODE_OPTIONS=--max-old-space-size=4096
```

### Windows-Specific Optimizations
```bash
# Disable Windows Defender real-time scanning for node_modules
# Add exclusion for: D:\talkcart\frontend\node_modules

# Use Windows Terminal or PowerShell instead of CMD
# Enable Developer Mode in Windows Settings
```

## 📞 When to Seek Help

Contact support if you encounter:
- Persistent permission errors after trying all fixes
- Memory issues that persist after increasing Node memory
- TypeScript errors that don't resolve with type-check
- Build failures that don't resolve with clean builds

## 🔄 Prevention Tips

1. **Regular Cleanup:** Run `npm run clean:next` weekly
2. **Proper Shutdown:** Always use Ctrl+C to stop dev server
3. **Avoid Force Kills:** Don't force-kill Node processes unless necessary
4. **Keep Updated:** Regularly update dependencies
5. **Use Scripts:** Use the provided npm scripts instead of manual commands

## 📝 Log Collection

If you need to report an issue, collect these logs:
```bash
# Development server logs
npm run dev > dev.log 2>&1

# Build logs
npm run build > build.log 2>&1

# System info
node --version > system-info.txt
npm --version >> system-info.txt
```

This troubleshooting guide should help resolve most common issues with the TalkCart frontend development environment.