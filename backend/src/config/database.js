import { PrismaClient } from '@prisma/client';
import env from './env.js';

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__mamsPrisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: env.databaseUrl,
      },
    },
    log: env.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
  });

if (!env.isProduction) {
  globalForPrisma.__mamsPrisma = prisma;
}

export default prisma;
