// Jest setup: mock environment vars and common modules
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/talkcart_test';
process.env.FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || 'flw_test_secret_key';

// Avoid real DB connections in unit tests; we'll mock models per test
jest.mock('../config/database', () => jest.fn());

// Mock socket service access on app
const express = require('express');
const app = express();
app.set('socketService', { broadcastRefundSubmitted: jest.fn(), broadcastRefundFailed: jest.fn() });
module.exports.app = app;