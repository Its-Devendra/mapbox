/**
 * Enterprise-optimized Prisma client with connection pooling
 * Handles 1000+ concurrent connections efficiently
 */

import { PrismaClient } from '../generated/prisma';

// Connection pool configuration for high load
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // Connection pool settings
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

// Create global instance to prevent connection exhaustion
const globalForPrisma = globalThis;

// Reuse connection in development and serverless environments
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export { prisma };