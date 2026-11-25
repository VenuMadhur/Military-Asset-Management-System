import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');

if (process.env.NODE_ENV !== 'production') {
  const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env.development';
  dotenv.config({ path: path.join(backendRoot, '.env') });
  dotenv.config({ path: path.join(backendRoot, envFile), override: false });
} else {
  dotenv.config();
}

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).toLowerCase() === 'true';
};

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
if (isTest && !process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is required when NODE_ENV=test; refusing to fall back to DATABASE_URL');
}
if (isTest && process.env.DATABASE_URL && process.env.TEST_DATABASE_URL === process.env.DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL must be distinct from DATABASE_URL in test mode');
}

const rawClientUrl = isProduction
  ? (process.env.CLIENT_URL || '')
  : (process.env.CLIENT_URL || 'http://localhost:5173');

const clientUrls = rawClientUrl
  .split(',')
  .map((u) => u.trim().replace(/\/+$/, ''))
  .filter(Boolean);

if (isProduction && clientUrls.length === 0) {
  throw new Error('Missing required environment variable in production: CLIENT_URL');
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,
  isTest,
  port: Number(process.env.PORT) || 5000,
  clientUrls,
  databaseUrl: isTest ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-jwt-secret' : ''),
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === 'test' ? 'test-jwt-refresh-secret' : ''),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  logisticsGlobalScope: parseBoolean(process.env.LOGISTICS_GLOBAL_SCOPE, true),
  seedEnableDevAccounts: parseBoolean(process.env.SEED_ENABLE_DEV_ACCOUNTS, false),
};

if (!env.databaseUrl) {
  throw new Error('Missing required environment variable: DATABASE_URL');
}
if (!env.jwtSecret || !env.jwtRefreshSecret) {
  throw new Error('Missing required JWT secrets: JWT_SECRET and JWT_REFRESH_SECRET');
}

export default env;
