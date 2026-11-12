import type { PrismaClient } from './prisma.js';

export interface CanalRepository {
  /** Dos nomes pedidos, devolve só os que existem na tabela `canais` e estão ativos. */
  buscarAtivosPorNome(nomes: readonly string[]): Promise<string[]>;
}

export class PrismaCanalRepository implements CanalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarAtivosPorNome(nomes: readonly string[]): Promise<string[]> {
    const canais = await this.prisma.canal.findMany({
      where: { nome: { in: [...nomes] }, ativo: true },
      select: { nome: true },
    });
    return canais.map((c) => c.nome);
  }
}
