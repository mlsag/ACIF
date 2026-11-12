import { Prisma } from '../generated/prisma/client.js';
import type { StatusAprovacao } from '../dominio/valores.js';
import type { PrismaClient } from './prisma.js';

/** Dados do usuário que a auth precisa. Inclui o hash da senha: nunca sai do service. */
export interface UsuarioCredencial {
  id: number;
  nome: string;
  email: string;
  senha: string;
  ativo: boolean;
  papel: string;
  status_aprovacao: string;
}

/** Dados do usuário sem o hash da senha, para sessão e respostas. */
export type UsuarioSessao = Omit<UsuarioCredencial, 'senha'>;

/** Docente como o admin o enxerga (T07): sem senha, sem `ativo` e sem `aprovado_por`. */
export interface DocenteRegistro {
  id: number;
  nome: string;
  email: string;
  status_aprovacao: string;
  data_cadastro: Date;
}

/** Dados de um novo docente. O e-mail chega normalizado e a senha já como hash argon2id. */
export interface NovoDocente {
  nome: string;
  email: string;
  senhaHash: string;
}

export interface PaginaDocentes {
  itens: DocenteRegistro[];
  total: number;
}

export interface UsuarioRepository {
  /** O e-mail chega já normalizado (trim e minúsculas). */
  buscarPorEmail(email: string): Promise<UsuarioCredencial | null>;
  buscarPorId(id: number): Promise<UsuarioSessao | null>;
  /**
   * Cria um docente `pendente`. E-mail já cadastrado (inclusive numa corrida entre dois cadastros)
   * devolve `duplicado`, sem alterar a conta existente.
   */
  criarDocente(dados: NovoDocente): Promise<'criado' | 'duplicado'>;
  /** Só `papel = 'docente'`. Ordem: `data_cadastro` desc, `id` desc. */
  listarDocentes(
    status: StatusAprovacao | undefined,
    pular: number,
    quantidade: number,
  ): Promise<PaginaDocentes>;
  /** Só `papel = 'docente'`: id de admin devolve null. */
  buscarDocente(id: number): Promise<DocenteRegistro | null>;
  /**
   * Muda o status de um docente só se o status atual estiver em `origens`, num único UPDATE
   * condicionado, e grava `aprovado_por` com o admin da decisão. Devolve se alterou.
   */
  alterarStatusDocente(
    id: number,
    para: StatusAprovacao,
    origens: readonly StatusAprovacao[],
    idAdmin: number,
  ): Promise<boolean>;
}

const camposSessao = {
  id: true,
  nome: true,
  email: true,
  ativo: true,
  papel: true,
  status_aprovacao: true,
} as const;

const camposDocente = {
  id: true,
  nome: true,
  email: true,
  status_aprovacao: true,
  data_cadastro: true,
} as const;

export class PrismaUsuarioRepository implements UsuarioRepository {
  constructor(private readonly prisma: PrismaClient) {}

  buscarPorEmail(email: string): Promise<UsuarioCredencial | null> {
    return this.prisma.usuario.findUnique({
      where: { email },
      select: { ...camposSessao, senha: true },
    });
  }

  buscarPorId(id: number): Promise<UsuarioSessao | null> {
    return this.prisma.usuario.findUnique({ where: { id }, select: camposSessao });
  }

  async criarDocente(dados: NovoDocente): Promise<'criado' | 'duplicado'> {
    try {
      await this.prisma.usuario.create({
        data: {
          nome: dados.nome,
          email: dados.email,
          senha: dados.senhaHash,
          papel: 'docente',
          status_aprovacao: 'pendente',
          ativo: true,
        },
        select: { id: true },
      });
      return 'criado';
    } catch (erro) {
      // Violação da chave única de e-mail: não revela nada a quem chamou, só sinaliza ao service.
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        return 'duplicado';
      }
      throw erro;
    }
  }

  async listarDocentes(
    status: StatusAprovacao | undefined,
    pular: number,
    quantidade: number,
  ): Promise<PaginaDocentes> {
    const where = { papel: 'docente', ...(status ? { status_aprovacao: status } : {}) };
    const [itens, total] = await this.prisma.$transaction([
      this.prisma.usuario.findMany({
        where,
        orderBy: [{ data_cadastro: 'desc' }, { id: 'desc' }],
        skip: pular,
        take: quantidade,
        select: camposDocente,
      }),
      this.prisma.usuario.count({ where }),
    ]);
    return { itens, total };
  }

  buscarDocente(id: number): Promise<DocenteRegistro | null> {
    return this.prisma.usuario.findFirst({
      where: { id, papel: 'docente' },
      select: camposDocente,
    });
  }

  async alterarStatusDocente(
    id: number,
    para: StatusAprovacao,
    origens: readonly StatusAprovacao[],
    idAdmin: number,
  ): Promise<boolean> {
    const { count } = await this.prisma.usuario.updateMany({
      where: { id, papel: 'docente', status_aprovacao: { in: [...origens] } },
      data: { status_aprovacao: para, aprovado_por: idAdmin },
    });
    return count > 0;
  }
}
