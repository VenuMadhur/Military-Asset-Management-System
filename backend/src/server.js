import app from './app.js';
import prisma from './config/database.js';
import env from './config/env.js';

let server;

async function startServer() {
  try {
    await prisma.$connect();
    server = app.listen(env.port, '0.0.0.0', () => {
      console.log(`MAMS Backend running in ${env.nodeEnv} mode on 0.0.0.0:${env.port}`);
    });
  } catch (err) {
    console.error('Failed to connect to PostgreSQL on startup:', err.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      await prisma.$disconnect();
      console.log('HTTP server and database connections closed.');
      process.exit(0);
    });
    setTimeout(async () => {
      console.error('Forced shutdown after timeout.');
      await prisma.$disconnect();
      process.exit(1);
    }, 10000).unref();
  } else {
    await prisma.$disconnect();
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
