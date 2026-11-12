import type {
  ComunicadoRegistro,
  ComunicadoRepository,
  DadosComunicado,
  PaginaRegistros,
} from '../../src/repositories/comunicado-repository.js';

type Linha = ComunicadoRegistro & { id_usuario: number };

/** Repositório falso de comunicados, com o mesmo filtro por dono do repositório Prisma. */
export class ComunicadoRepositoryMemoria implements ComunicadoRepository {
  readonly linhas = new Map<number, Linha>();
  private proximoId = 1;
  private relogio = Date.UTC(2026, 10, 10, 12, 0, 0);

  limpar(): void {
    this.linhas.clear();
    this.proximoId = 1;
  }

  /** Simula o disparo (T16) ou outro status, para testar o 409. */
  forcarStatus(id: number, status: string): void {
    const linha = this.linhas.get(id);
    if (!linha) throw new Error(`comunicado ${id} não existe`);
    linha.status = status;
  }

  /** Grava um jsonb inválido, para testar a revalidação na leitura. */
  corromper(id: number, campo: 'canais' | 'filtro_destinatarios' | 'variaveis'): void {
    const linha = this.linhas.get(id);
    if (!linha) throw new Error(`comunicado ${id} não existe`);
    linha[campo] = { invalido: true };
  }

  private aplicar(linha: Linha, dados: DadosComunicado): void {
    for (const [chave, valor] of Object.entries(dados)) {
      if (valor !== undefined) (linha as unknown as Record<string, unknown>)[chave] = valor;
    }
  }

  async criar(idUsuario: number, dados: DadosComunicado): Promise<ComunicadoRegistro> {
    this.relogio += 1000;
    const linha: Linha = {
      id: this.proximoId++,
      id_usuario: idUsuario,
      titulo: null,
      conteudo: null,
      prompt_original: null,
      status: 'rascunho',
      canais: [],
      filtro_destinatarios: null,
      variaveis: null,
      data_criacao: new Date(this.relogio),
      data_envio: null,
    };
    this.aplicar(linha, dados);
    this.linhas.set(linha.id, linha);
    return this.copia(linha);
  }

  async listar(idUsuario: number, pular: number, quantidade: number): Promise<PaginaRegistros> {
    const doUsuario = [...this.linhas.values()]
      .filter((l) => l.id_usuario === idUsuario)
      .sort((a, b) => b.data_criacao.getTime() - a.data_criacao.getTime() || b.id - a.id);
    return {
      itens: doUsuario.slice(pular, pular + quantidade).map((l) => ({
        id: l.id,
        titulo: l.titulo,
        status: l.status,
        canais: l.canais,
        data_criacao: l.data_criacao,
        data_envio: l.data_envio,
      })),
      total: doUsuario.length,
    };
  }

  async buscar(idUsuario: number, id: number): Promise<ComunicadoRegistro | null> {
    const linha = this.linhas.get(id);
    return linha && linha.id_usuario === idUsuario ? this.copia(linha) : null;
  }

  async atualizar(
    idUsuario: number,
    id: number,
    statusPermitidos: readonly string[],
    dados: DadosComunicado,
  ): Promise<boolean> {
    const linha = this.linhas.get(id);
    if (!linha || linha.id_usuario !== idUsuario || !statusPermitidos.includes(linha.status)) {
      return false;
    }
    this.aplicar(linha, dados);
    return true;
  }

  async excluir(
    idUsuario: number,
    id: number,
    statusPermitidos: readonly string[],
  ): Promise<boolean> {
    const linha = this.linhas.get(id);
    if (!linha || linha.id_usuario !== idUsuario || !statusPermitidos.includes(linha.status)) {
      return false;
    }
    this.linhas.delete(id);
    return true;
  }

  private copia(linha: Linha): ComunicadoRegistro {
    const { id_usuario: _dono, ...registro } = linha;
    void _dono;
    return structuredClone(registro);
  }
}
