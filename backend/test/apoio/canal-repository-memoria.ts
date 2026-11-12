import type { CanalRepository } from '../../src/repositories/canal-repository.js';

/** Repositório falso de canais: nome → ativo. */
export class CanalRepositoryMemoria implements CanalRepository {
  readonly canais = new Map<string, boolean>();

  constructor() {
    this.restaurar();
  }

  /** Volta ao estado do seed: email e whatsapp ativos. */
  restaurar(): void {
    this.canais.clear();
    this.canais.set('email', true);
    this.canais.set('whatsapp', true);
  }

  async buscarAtivosPorNome(nomes: readonly string[]): Promise<string[]> {
    return nomes.filter((nome) => this.canais.get(nome) === true);
  }
}
