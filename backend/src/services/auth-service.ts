import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import type { Papel } from '../dominio/valores.js';
import type { UsuarioRepository, UsuarioSessao } from '../repositories/usuario-repository.js';

/** Usuário autenticado, como as rotas o enxergam (sem hash de senha). */
export interface UsuarioAutenticado {
  id: number;
  nome: string;
  email: string;
  papel: Papel;
}

/** Só usuário ativo e aprovado tem sessão (ADR 0008: docente pendente não loga). */
export function podeTerSessao(usuario: Pick<UsuarioSessao, 'ativo' | 'status_aprovacao'>): boolean {
  return usuario.ativo && usuario.status_aprovacao === 'aprovado';
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

function paraAutenticado(usuario: UsuarioSessao): UsuarioAutenticado {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel as Papel,
  };
}

/**
 * Regras de login e sessão. Não conhece HTTP: as rotas convertem `null` no 401 genérico.
 */
export class AuthService {
  private hashIsca: Promise<string> | undefined;

  constructor(private readonly usuarios: UsuarioRepository) {}

  /**
   * Hash argon2id de uma senha aleatória, usado quando o e-mail não existe.
   * Assim todo login roda exatamente um argon2.verify e o tempo de resposta não revela se a conta existe.
   */
  private obterHashIsca(): Promise<string> {
    this.hashIsca ??= argon2.hash(randomBytes(32).toString('hex'), { type: argon2.argon2id });
    return this.hashIsca;
  }

  /** Pré-calcula o hash isca (chamado na subida da API). */
  async aquecer(): Promise<void> {
    await this.obterHashIsca();
  }

  /**
   * Devolve o usuário se a credencial for válida e ele puder ter sessão; senão, `null`.
   * Todos os motivos de falha (e-mail inexistente, senha errada, pendente, bloqueado, inativo)
   * dão o mesmo `null`, de propósito.
   */
  async autenticar(email: string, senha: string): Promise<UsuarioAutenticado | null> {
    const usuario = await this.usuarios.buscarPorEmail(normalizarEmail(email));
    const hash = usuario?.senha ?? (await this.obterHashIsca());

    // Hash corrompido no banco: trata como credencial inválida, sem detalhar.
    const senhaConfere = await argon2.verify(hash, senha).catch(() => false);

    if (!usuario || !senhaConfere || !podeTerSessao(usuario)) {
      return null;
    }
    return paraAutenticado(usuario);
  }

  /** Revalida a sessão a cada requisição: usuário bloqueado ou inativado perde o acesso na hora. */
  async obterSessao(id: number): Promise<UsuarioAutenticado | null> {
    const usuario = await this.usuarios.buscarPorId(id);
    if (!usuario || !podeTerSessao(usuario)) {
      return null;
    }
    return paraAutenticado(usuario);
  }
}
