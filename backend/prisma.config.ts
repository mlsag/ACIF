import { defineConfig } from 'prisma/config';

// O Prisma 7 não lê o .env: DATABASE_URL vem do ambiente (compose ou CI).
// Lido de process.env (e não com env()) para que `prisma generate` funcione sem banco.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
