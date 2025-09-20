// TalkCart Super Admin Configuration
// Centralized configuration using environment variables

export const config = {
  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
    socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000',
    timeout: parseInt(process.env.NEXT_PUBLIC_REQUEST_TIMEOUT || '30000'),
  },

  // Application Configuration
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'TalkCart Super Admin',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
    port: parseInt(process.env.NEXT_PUBLIC_ADMIN_PORT || '4100'),
  },

  // URLs
  urls: {
    frontend: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:4000',
    superAdmin: process.env.NEXT_PUBLIC_SUPER_ADMIN_URL || 'http://localhost:4100',
  },

  // Authentication Configuration
  auth: {
    sessionTimeout: parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT || '3600000'), // 1 hour
    autoRefreshInterval: parseInt(process.env.NEXT_PUBLIC_AUTO_REFRESH_INTERVAL || '300000'), // 5 minutes
    defaultAdminEmail: process.env.NEXT_PUBLIC_DEFAULT_ADMIN_EMAIL || 'admin@talkcart.com',
    defaultAdminPassword: process.env.NEXT_PUBLIC_DEFAULT_ADMIN_PASSWORD || 'admin123',
  },

  // OAuth Configuration
  oauth: {
    googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    appleClientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '',
  },

  // Cloudinary Configuration
  cloudinary: {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '',
    uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '',
  },

  // Stripe Configuration
  stripe: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  },

  // Feature Flags
  features: {
    analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    realTime: process.env.NEXT_PUBLIC_ENABLE_REAL_TIME === 'true',
    notifications: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS === 'true',
    advancedFeatures: process.env.NEXT_PUBLIC_ENABLE_ADVANCED_FEATURES === 'true',
    devTools: process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === 'true',
    mockData: process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === 'true',
  },

  // Development Configuration
  dev: {
    debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
    logLevel: process.env.NEXT_PUBLIC_LOG_LEVEL || 'info',
    enableConsoleLogs: process.env.NEXT_PUBLIC_ENABLE_CONSOLE_LOGS === 'true',
  },

  // UI Configuration
  ui: {
    themeMode: process.env.NEXT_PUBLIC_THEME_MODE || 'light',
    enableAnimations: process.env.NEXT_PUBLIC_ENABLE_ANIMATIONS !== 'false',
    enableSound: process.env.NEXT_PUBLIC_ENABLE_SOUND === 'true',
  },
};

// Helper functions
export const isProduction = () => config.app.environment === 'production';
export const isDevelopment = () => config.app.environment === 'development';
export const isDebugMode = () => config.dev.debugMode;

// API endpoints builder
export const buildApiUrl = (endpoint: string) => {
  return `${config.api.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
};

// Validation function
export const validateConfig = () => {
  const errors: string[] = [];

  if (!config.api.baseUrl) {
    errors.push('API base URL is required');
  }

  if (!config.api.backendUrl) {
    errors.push('Backend URL is required');
  }

  if (config.features.analytics && !config.api.baseUrl) {
    errors.push('Analytics feature requires API base URL');
  }

  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    return false;
  }

  if (config.dev.debugMode) {
    console.log('✅ Configuration validation passed');
    console.log('📊 Current configuration:', {
      environment: config.app.environment,
      apiUrl: config.api.baseUrl,
      backendUrl: config.api.backendUrl,
      features: Object.entries(config.features)
        .filter(([, enabled]) => enabled)
        .map(([feature]) => feature),
    });
  }

  return true;
};

// Initialize configuration
if (typeof window !== 'undefined') {
  validateConfig();
}

export default config;
