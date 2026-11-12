import argon2 from 'argon2';
import type { StatusAprovacao } from '../dominio/valores.js';
import type { DocenteRegistro, UsuarioRepository } from '../repositories/usuario-repository.js';
import { normalizarEmail } from './auth-service.js';

/** Docente na resposta da API: `data_cadastro` sai como ISO 8601 na serialização. */
export type DocenteResumo = DocenteRegistro;

export interface PaginaDocentesResposta {
  itens: DocenteResumo[];
  pagina: number;
  por_pagina: number;
  total: number;
}

export type ErroDocente = 'nao_encontrado' | 'conflito';
export type ResultadoDocente =
  { ok: true; valor: DocenteResumo; alterado: boolean } | { ok: false; erro: ErroDocente };

/** Decisões do admin e os status de onde cada uma parte (ADR 0008). Não há volta para pendente. */
export const TRANSICOES: Record<'aprovado' | 'bloqueado', readonly StatusAprovacao[]> = {
  // De bloqueado para aprovado é a reativação.
  aprovado: ['pendente', 'bloqueado'],
  bloqueado: ['pendente', 'aprovado'],
};

/**
 * Cadastro público e aprovação de docentes (T07). Não conhece HTTP.
 * As decisões só alcançam `papel = 'docente'`: o admin não bloqueia a si mesmo nem outro admin.
 */
export class DocenteService {
  constructor(private readonly usuarios: UsuarioRepository) {}

  /**
   * Cadastra o docente como `pendente`. Não devolve se o e-mail já existia: o hash roda sempre,
   * antes de tentar gravar, para aproximar o tempo de resposta (resta uma diferença pequena; ver
   * "Docentes (T07)" em docs/arquitetura.md).
   */
  async cadastrar(nome: string, email: string, senha: string): Promise<void> {
    const senhaHash = await argon2.hash(senha, { type: argon2.argon2id });
    await this.usuarios.criarDocente({ nome, email: normalizarEmail(email), senhaHash });
  }

  async listar(
    status: StatusAprovacao | undefined,
    pagina: number,
    porPagina: number,
  ): Promise<PaginaDocentesResposta> {
    const { itens, total } = await this.usuarios.listarDocentes(
      status,
      (pagina - 1) * porPagina,
      porPagina,
    );
    return { itens, pagina, por_pagina: porPagina, total };
  }

  aprovar(id: number, idAdmin: number): Promise<ResultadoDocente> {
    return this.decidir(id, 'aprovado', idAdmin);
  }

  bloquear(id: number, idAdmin: number): Promise<ResultadoDocente> {
    return this.decidir(id, 'bloqueado', idAdmin);
  }

  private async decidir(
    id: number,
    para: 'aprovado' | 'bloqueado',
    idAdmin: number,
  ): Promise<ResultadoDocente> {
    // UPDATE condicionado ao status atual: atômico, sem ler antes de escrever.
    const alterou = await this.usuarios.alterarStatusDocente(id, para, TRANSICOES[para], idAdmin);
    const atual = await this.usuarios.buscarDocente(id);
    if (!atual) return { ok: false, erro: 'nao_encontrado' };
    if (alterou) return { ok: true, valor: atual, alterado: true };
    // Já estava no status pedido: idempotente, sem nova escrita.
    if (atual.status_aprovacao === para) return { ok: true, valor: atual, alterado: false };
    // Outro admin mudou o status entre o UPDATE e a leitura (ou o valor no banco é desconhecido).
    return { ok: false, erro: 'conflito' };
  }
}
