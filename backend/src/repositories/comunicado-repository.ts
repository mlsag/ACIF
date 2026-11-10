import { Prisma } from '../generated/prisma/client.js';
import type {
  CanaisComunicado,
  FiltroDestinatarios,
  VariaveisComunicado,
} from '../dominio/comunicado.js';
import type { PrismaClient } from './prisma.js';

/** Campos que o docente grava no rascunho. `undefined` não altera; `null` limpa. */
export interface DadosComunicado {
  titulo?: string | null;
  conteudo?: string | null;
  prompt_original?: string | null;
  canais?: CanaisComunicado;
  filtro_destinatarios?: FiltroDestinatarios | null;
  variaveis?: VariaveisComunicado | null;
}

/** Linha de `comunicados` como sai do banco. Os jsonb chegam sem tipo e o service os valida. */
export interface ComunicadoRegistro {
  id: number;
  titulo: string | null;
  conteudo: string | null;
  prompt_original: string | null;
  status: string;
  canais: unknown;
  filtro_destinatarios: unknown;
  variaveis: unknown;
  data_criacao: Date;
  data_envio: Date | null;
}

export type ResumoComunicadoRegistro = Pick<
  ComunicadoRegistro,
  'id' | 'titulo' | 'status' | 'canais' | 'data_criacao' | 'data_envio'
>;

export interface PaginaRegistros {
  itens: ResumoComunicadoRegistro[];
  total: number;
}

/**
 * Acesso a `comunicados`. Todo método recebe o `idUsuario` dono e filtra por ele na própria
 * consulta: não existe busca só por id (critério 2 da T12).
 */
export interface ComunicadoRepository {
  criar(idUsuario: number, dados: DadosComunicado): Promise<ComunicadoRegistro>;
  listar(idUsuario: number, pular: number, quantidade: number): Promise<PaginaRegistros>;
  buscar(idUsuario: number, id: number): Promise<ComunicadoRegistro | null>;
  /** Atualiza só se o status estiver entre `statusPermitidos`, de forma atômica. */
  atualizar(
    idUsuario: number,
    id: number,
    statusPermitidos: readonly string[],
    dados: DadosComunicado,
  ): Promise<boolean>;
  /** Exclui (com as versões) só se o status estiver entre `statusPermitidos`, numa transação. */
  excluir(idUsuario: number, id: number, statusPermitidos: readonly string[]): Promise<boolean>;
}

const camposCompletos = {
  id: true,
  titulo: true,
  conteudo: true,
  prompt_original: true,
  status: true,
  canais: true,
  filtro_destinatarios: true,
  variaveis: true,
  data_criacao: true,
  data_envio: true,
} as const;

const camposResumo = {
  id: true,
  titulo: true,
  status: true,
  canais: true,
  data_criacao: true,
  data_envio: true,
} as const;

/** `null` em jsonb opcional vira SQL NULL (Prisma.DbNull); `undefined` não altera a coluna. */
function jsonOpcional(valor: object | null | undefined) {
  if (valor === undefined) return undefined;
  return valor === null ? Prisma.DbNull : (valor as Prisma.InputJsonValue);
}

function paraDadosPrisma(dados: DadosComunicado) {
  return {
    titulo: dados.titulo,
    conteudo: dados.conteudo,
    prompt_original: dados.prompt_original,
    canais: dados.canais as Prisma.InputJsonValue | undefined,
    filtro_destinatarios: jsonOpcional(dados.filtro_destinatarios),
    variaveis: jsonOpcional(dados.variaveis),
  };
}

/** Sinaliza o rollback da exclusão quando o comunicado não pode mais ser excluído. */
class ExclusaoNegada extends Error {}

export class PrismaComunicadoRepository implements ComunicadoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  criar(idUsuario: number, dados: DadosComunicado): Promise<ComunicadoRegistro> {
    return this.prisma.comunicado.create({
      data: { ...paraDadosPrisma(dados), id_usuario: idUsuario, status: 'rascunho' },
      select: camposCompletos,
    });
  }

  async listar(idUsuario: number, pular: number, quantidade: number): Promise<PaginaRegistros> {
    const where = { id_usuario: idUsuario };
    const [itens, total] = await this.prisma.$transaction([
      this.prisma.comunicado.findMany({
        where,
        orderBy: [{ data_criacao: 'desc' }, { id: 'desc' }],
        skip: pular,
        take: quantidade,
        select: camposResumo,
      }),
      this.prisma.comunicado.count({ where }),
    ]);
    return { itens, total };
  }

  buscar(idUsuario: number, id: number): Promise<ComunicadoRegistro | null> {
    return this.prisma.comunicado.findFirst({
      where: { id, id_usuario: idUsuario },
      select: camposCompletos,
    });
  }

  async atualizar(
    idUsuario: number,
    id: number,
    statusPermitidos: readonly string[],
    dados: DadosComunicado,
  ): Promise<boolean> {
    const { count } = await this.prisma.comunicado.updateMany({
      where: { id, id_usuario: idUsuario, status: { in: [...statusPermitidos] } },
      data: paraDadosPrisma(dados),
    });
    return count > 0;
  }

  async excluir(
    idUsuario: number,
    id: number,
    statusPermitidos: readonly string[],
  ): Promise<boolean> {
    const alvo = { id, id_usuario: idUsuario, status: { in: [...statusPermitidos] } };
    try {
      await this.prisma.$transaction(async (tx) => {
        // As FKs são RESTRICT: as versões (T22) saem antes do comunicado.
        await tx.comunicadoVersao.deleteMany({ where: { id_comunicado: id, comunicado: alvo } });
        const { count } = await tx.comunicado.deleteMany({ where: alvo });
        // Status mudou no meio (ex.: disparo da T16): desfaz a remoção das versões.
        if (count === 0) throw new ExclusaoNegada();
      });
      return true;
    } catch (erro) {
      if (erro instanceof ExclusaoNegada) return false;
      throw erro;
    }
  }
}
