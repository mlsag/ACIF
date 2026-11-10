import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Cria o cliente Prisma (camada de dados). Só repositories e scripts de dados usam este módulo;
 * rotas nunca acessam o Prisma. O log de queries fica desligado para não expor PII.
 */
export function criarPrismaClient(
  url: string | undefined = process.env.DATABASE_URL,
): PrismaClient {
  if (!url) {
    throw new Error('DATABASE_URL não definida');
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

export type { PrismaClient };
