# TalkCart Test Credentials

This document contains the test credentials for the TalkCart application during development.

## Available Test Users

### Admin User
- **Email:** `test@admin.com`
- **Password:** `admin123`
- **Username:** `testadmin`
- **Role:** Admin
- **Description:** Administrator account with full privileges

### Regular User
- **Email:** `test@example.com`
- **Password:** `testpassword123`
- **Username:** `testuser`
- **Role:** User
- **Description:** Standard user account for testing user features

### Service User
- **Email:** `talkcartservice@gmail.com`
- **Password:** `service123`
- **Username:** `talkcartprovider`
- **Role:** User
- **Description:** Service provider account

## Setting Up Test Users

To ensure all test users are properly configured with the correct passwords, run:

```bash
cd backend
npm run setup-test-users
```

This script will:
- Create missing test users
- Update existing test users with correct passwords
- Ensure all users are verified and active

## Development Login Helper

In development mode, the login page displays clickable test credentials that automatically fill the login form. This feature is only visible when `NODE_ENV=development`.

## Troubleshooting Login Issues

If you encounter "Invalid email or password" errors:

1. **Check if backend is running:** The backend should be running on port 8000
2. **Verify test users exist:** Run `npm run setup-test-users` in the backend directory
3. **Check database connection:** Ensure MongoDB is running and accessible
4. **Use exact credentials:** Copy the credentials exactly as shown above

## Troubleshooting Registration Issues

If you encounter "Invalid request format detected" or browser extension interference errors:

### Quick Solutions:
1. **Use Incognito/Private Window:** This disables most browser extensions
2. **Disable Password Managers:** Temporarily disable LastPass, 1Password, Dashlane, etc.
3. **Disable Form-Filling Extensions:** Turn off auto-fill and form-filling browser extensions
4. **Try Different Browser:** Use Chrome, Firefox, Safari, or Edge

### Technical Solution:
If you're still having issues, you can disable the browser extension interference check:

1. Open `backend/.env`
2. Change `BLOCK_EXTENSION_INTERFERENCE=true` to `BLOCK_EXTENSION_INTERFERENCE=false`
3. Restart the backend server

### Common Culprits:
- **Password Managers:** LastPass, 1Password, Dashlane, Bitwarden
- **Form Fillers:** Auto-fill extensions, form completion tools
- **Security Extensions:** Some security extensions modify form data
- **Developer Tools:** Browser extensions that modify HTTP requests

## API Testing

You can test the login API directly using curl or PowerShell:

```powershell
# PowerShell example
Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"test@admin.com","password":"admin123"}'
```

```bash
# Curl example
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@admin.com","password":"admin123"}'
```

## Security Note

⚠️ **Important:** These are development-only credentials. Never use these credentials in production environments.