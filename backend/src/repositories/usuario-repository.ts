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

export interface UsuarioRepository {
  /** O e-mail chega já normalizado (trim e minúsculas). */
  buscarPorEmail(email: string): Promise<UsuarioCredencial | null>;
  buscarPorId(id: number): Promise<UsuarioSessao | null>;
}

const camposSessao = {
  id: true,
  nome: true,
  email: true,
  ativo: true,
  papel: true,
  status_aprovacao: true,
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
}
