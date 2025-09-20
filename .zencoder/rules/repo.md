---
description: Repository Information Overview
alwaysApply: true
---

# Repository Information Overview

## Repository Summary
TalkCart is a modern Web3 super application with social, marketplace, and DAO features. It consists of three main components: a Next.js frontend, an Express.js backend, and a Next.js super-admin dashboard.

## Repository Structure
- **frontend/**: Next.js application with TypeScript, Material-UI, and Tailwind CSS
- **backend/**: Express.js API server with MongoDB database
- **super-admin/**: Next.js admin dashboard with TypeScript and Material-UI

### Main Repository Components
- **Frontend**: User-facing web application with social, marketplace, and Web3 features
- **Backend**: RESTful API server with MongoDB database and Socket.IO for real-time features
- **Super Admin**: Administrative dashboard for managing users, content, and platform settings

## Projects

### Frontend
**Configuration File**: package.json

#### Language & Runtime
**Language**: TypeScript
**Version**: TypeScript 5.6.3
**Framework**: Next.js 15.5.2
**Build System**: Next.js
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- React 18.3.1
- Next.js 15.5.2
- Material-UI 6.1.6
- Tailwind CSS 3.4.14
- React Query 5.59.16
- Socket.IO Client 4.8.1
- Web3 Libraries: wagmi, viem, ethers, rainbowkit

#### Build & Installation
```bash
npm install
npm run dev     # Development server on port 4000
npm run build   # Production build
npm start       # Start production server
```

#### Docker
**Dockerfile**: frontend/Dockerfile
**Image**: node:18-alpine
**Configuration**: Multi-stage build with production optimization

#### Testing
**Framework**: Jest 30.0.5 with React Testing Library
**Test Location**: Implied to be in `__tests__` directories
**Configuration**: jest.config.js, jest.setup.js
**Run Command**:
```bash
npm test
npm run test:watch
npm run test:coverage
```

### Backend
**Configuration File**: package.json

#### Language & Runtime
**Language**: JavaScript (Node.js)
**Version**: Node.js 18+
**Framework**: Express 4.18.2
**Database**: MongoDB (mongoose 8.0.3)
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- Express 4.18.2
- Mongoose 8.0.3
- Socket.IO 4.8.1
- JWT Authentication (jsonwebtoken 9.0.2)
- Stripe 14.21.0
- Web3 Libraries: ethers 6.8.1, siwe 2.1.4

#### Build & Installation
```bash
npm install
npm run dev     # Development server with nodemon
npm start       # Production server
```

#### Docker
**Dockerfile**: backend/Dockerfile
**Image**: node:18-alpine
**Configuration**: Single-stage build with health check

#### Testing
**Framework**: Jest 30.0.5 with Supertest
**Test Location**: tests/ directory
**Naming Convention**: *.test.js
**Configuration**: jest.config.js
**Run Command**:
```bash
npm test
npm run test:watch
npm run test:coverage
```

### Super Admin
**Configuration File**: package.json

#### Language & Runtime
**Language**: TypeScript
**Version**: TypeScript 5.9.2
**Framework**: Next.js 15.5.2
**Build System**: Next.js
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- React 18.3.1
- Next.js 15.5.2
- Material-UI 6.1.6

#### Build & Installation
```bash
npm install
npm run dev     # Development server on port 4100
npm run build   # Production build
npm start       # Start production server
```