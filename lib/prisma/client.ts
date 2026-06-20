import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: connectionString ? new PrismaPg(new Pool({ connectionString })) : undefined,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  } as ConstructorParameters<typeof PrismaClient>[0]);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
