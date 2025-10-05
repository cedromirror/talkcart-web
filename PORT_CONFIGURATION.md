# TalkCart Port Configuration

This document confirms the port configuration for the TalkCart application.

## Current Port Setup

### Frontend
- **Port**: 4000
- **Configuration**: 
  - `frontend/package.json` scripts use `-p 4000` flag
  - `frontend/Dockerfile` exposes port 4000
  - Environment variable `PORT=4000` in Dockerfile

### Backend
- **Port**: 8000
- **Configuration**:
  - `backend/.env` file sets `PORT=8000`
  - `backend/Dockerfile` exposes port 8000
  - `backend/server.js` uses `process.env.PORT || 8000`

## API Communication

The frontend is configured to communicate with the backend through:
- `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env`
- Proxy configuration in `frontend/next.config.js` that rewrites `/api/:path*` to `http://localhost:8000/api/:path*`

## Socket.IO Configuration

Socket.IO connections are properly configured:
- Frontend connects to `http://localhost:8000` for WebSocket communication
- Backend Socket.IO server listens on the same port (8000)

## CORS Configuration

Both frontend and backend are configured to allow cross-origin requests between:
- Frontend running on various localhost ports (3000, 4000, 4100)
- Backend running on port 8000

## Verification

All configuration files have been verified to maintain the required port setup:
- Frontend will continue to run on port 4000
- Backend will continue to run on port 8000
- No changes are needed to maintain this configuration

## Development Commands

To run the application with the current port configuration:

1. Start the backend:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

The application will be accessible at:
- Frontend: http://localhost:4000
- Backend API: http://localhost:8000