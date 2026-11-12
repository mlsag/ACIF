import {
  esquemaCanais,
  esquemaFiltro,
  esquemaVariaveis,
  normalizarFiltro,
  normalizarVariaveis,
  STATUS_EDITAVEIS,
  type CanaisComunicado,
  type FiltroDestinatarios,
  type VariaveisComunicado,
} from '../dominio/comunicado.js';
import type { CanalRepository } from '../repositories/canal-repository.js';
import type {
  ComunicadoRegistro,
  ComunicadoRepository,
  DadosComunicado,
  ResumoComunicadoRegistro,
} from '../repositories/comunicado-repository.js';

/** Comunicado como a API o devolve (sem `id_usuario`: o dono é sempre quem pede). */
export interface ComunicadoDetalhe {
  id: number;
  titulo: string | null;
  conteudo: string | null;
  prompt_original: string | null;
  status: string;
  canais: CanaisComunicado;
  filtro_destinatarios: FiltroDestinatarios | null;
  variaveis: VariaveisComunicado | null;
  data_criacao: Date;
  data_envio: Date | null;
}

export interface ComunicadoResumo {
  id: number;
  titulo: string | null;
  status: string;
  canais: CanaisComunicado;
  data_criacao: Date;
  data_envio: Date | null;
}

export interface PaginaComunicados {
  itens: ComunicadoResumo[];
  pagina: number;
  por_pagina: number;
  total: number;
}

/**
 * - `nao_encontrado`: não existe ou é de outro usuário (indistinguíveis de propósito);
 * - `nao_editavel`: o status não é editável (já disparado);
 * - `canal_indisponivel`: canal inexistente na tabela ou inativo.
 */
export type ErroComunicado = 'nao_encontrado' | 'nao_editavel' | 'canal_indisponivel';
export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: ErroComunicado };

const falha = (erro: ErroComunicado): { ok: false; erro: ErroComunicado } => ({ ok: false, erro });

function editavel(status: string): boolean {
  return (STATUS_EDITAVEIS as readonly string[]).includes(status);
}

// Os jsonb são revalidados na leitura: dado corrompido vira erro interno, sem ecoar o conteúdo.
function paraResumo(r: ResumoComunicadoRegistro): ComunicadoResumo {
  return {
    id: r.id,
    titulo: r.titulo,
    status: r.status,
    canais: esquemaCanais.parse(r.canais),
    data_criacao: r.data_criacao,
    data_envio: r.data_envio,
  };
}

function paraDetalhe(r: ComunicadoRegistro): ComunicadoDetalhe {
  return {
    id: r.id,
    titulo: r.titulo,
    conteudo: r.conteudo,
    prompt_original: r.prompt_original,
    status: r.status,
    canais: esquemaCanais.parse(r.canais),
    filtro_destinatarios: esquemaFiltro.nullable().parse(r.filtro_destinatarios ?? null),
    variaveis: esquemaVariaveis.nullable().parse(r.variaveis ?? null),
    data_criacao: r.data_criacao,
    data_envio: r.data_envio,
  };
}

/** Normaliza o que veio da rota; campos ausentes continuam ausentes (PATCH parcial). */
function normalizar(dados: DadosComunicado): DadosComunicado {
  const resultado: DadosComunicado = { ...dados };
  if (dados.filtro_destinatarios !== undefined) {
    resultado.filtro_destinatarios = normalizarFiltro(dados.filtro_destinatarios);
  }
  if (dados.variaveis !== undefined) {
    resultado.variaveis = normalizarVariaveis(dados.variaveis);
  }
  return resultado;
}

/**
 * Rascunhos de comunicado (T12). Não conhece HTTP. O `idUsuario` vem sempre da sessão, e o
 * repository filtra por ele em toda consulta: o admin também só enxerga os próprios comunicados.
 */
export class ComunicadoService {
  constructor(
    private readonly comunicados: ComunicadoRepository,
    private readonly canais: CanalRepository,
  ) {}

  private async canaisDisponiveis(canais: CanaisComunicado | undefined): Promise<boolean> {
    if (!canais || canais.length === 0) return true;
    const ativos = new Set(await this.canais.buscarAtivosPorNome(canais));
    return canais.every((nome) => ativos.has(nome));
  }

  async criar(idUsuario: number, dados: DadosComunicado): Promise<Resultado<ComunicadoDetalhe>> {
    if (!(await this.canaisDisponiveis(dados.canais))) return falha('canal_indisponivel');
    const registro = await this.comunicados.criar(idUsuario, {
      ...normalizar(dados),
      canais: dados.canais ?? [],
    });
    return { ok: true, valor: paraDetalhe(registro) };
  }

  async listar(idUsuario: number, pagina: number, porPagina: number): Promise<PaginaComunicados> {
    const { itens, total } = await this.comunicados.listar(
      idUsuario,
      (pagina - 1) * porPagina,
      porPagina,
    );
    return { itens: itens.map(paraResumo), pagina, por_pagina: porPagina, total };
  }

  async obter(idUsuario: number, id: number): Promise<Resultado<ComunicadoDetalhe>> {
    const registro = await this.comunicados.buscar(idUsuario, id);
    return registro ? { ok: true, valor: paraDetalhe(registro) } : falha('nao_encontrado');
  }

  async atualizar(
    idUsuario: number,
    id: number,
    dados: DadosComunicado,
  ): Promise<Resultado<ComunicadoDetalhe>> {
    const atual = await this.comunicados.buscar(idUsuario, id);
    if (!atual) return falha('nao_encontrado');
    if (!editavel(atual.status)) return falha('nao_editavel');
    if (!(await this.canaisDisponiveis(dados.canais))) return falha('canal_indisponivel');

    // Atualização condicionada ao status: se o disparo (T16) acontecer no meio, nada é alterado.
    const alterou = await this.comunicados.atualizar(
      idUsuario,
      id,
      STATUS_EDITAVEIS,
      normalizar(dados),
    );
    const depois = await this.comunicados.buscar(idUsuario, id);
    if (!depois) return falha('nao_encontrado');
    if (!alterou) return falha('nao_editavel');
    return { ok: true, valor: paraDetalhe(depois) };
  }

  async excluir(idUsuario: number, id: number): Promise<Resultado<null>> {
    if (await this.comunicados.excluir(idUsuario, id, STATUS_EDITAVEIS)) {
      return { ok: true, valor: null };
    }
    // Não excluiu: separa "não existe ou não é seu" (404) de "não é mais rascunho" (409).
    const atual = await this.comunicados.buscar(idUsuario, id);
    return falha(atual ? 'nao_editavel' : 'nao_encontrado');
  }
}
