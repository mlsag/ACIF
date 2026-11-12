// Formatos dos campos jsonb de `comunicados` (docs/arquitetura.md, subseção "Comunicados (T12)").
// Ficam no domínio para a T13 (destinatários), a T14 (renderizador) e a T16 (disparo) reaproveitarem.

import { z } from 'zod';
import { NOMES_CANAIS, type StatusComunicado } from './valores.js';

/** Só rascunho pode ser editado ou excluído. A T16 tira o comunicado deste status ao disparar. */
export const STATUS_EDITAVEIS = ['rascunho'] as const satisfies readonly StatusComunicado[];

/** Maior valor de uma coluna int4 (ids do PostgreSQL). Acima disso, o Prisma falharia. */
export const MAX_ID_INT4 = 2_147_483_647;
export const MAX_IDS_ALUNOS = 500;
/** Teto de valores por campo do filtro por turma (evita corpo abusivo). */
const MAX_VALORES_FILTRO = 50;

const idInt4 = z.number().int().min(1).max(MAX_ID_INT4);

/** Canais escolhidos no rascunho: nomes de `canais.nome`, sem repetição. Vazio é aceito no rascunho. */
export const esquemaCanais = z
  .array(z.enum(NOMES_CANAIS))
  .max(NOMES_CANAIS.length)
  .refine((lista) => new Set(lista).size === lista.length);
export type CanaisComunicado = z.infer<typeof esquemaCanais>;

const listaValores = (max: number) =>
  z.array(z.string().trim().min(1).max(max)).max(MAX_VALORES_FILTRO);

/** Filtro por turma: campos combinados com E; valores dentro de um campo combinados com OU. */
export const esquemaFiltroTurma = z.strictObject({
  curso: listaValores(120).optional(),
  periodo: listaValores(20).optional(),
  turma: listaValores(20).optional(),
  termo: listaValores(20).optional(),
});

/** Aluno individual: só ids. Lista vazia é rejeitada, para não virar "todos os alunos". */
export const esquemaFiltroAlunos = z.strictObject({
  ids_alunos: z.array(idInt4).min(1).max(MAX_IDS_ALUNOS),
});

/** Objetos estritos: misturar turma com ids_alunos não casa com nenhuma das formas. */
export const esquemaFiltro = z.union([esquemaFiltroAlunos, esquemaFiltroTurma]);
export type FiltroDestinatarios = z.infer<typeof esquemaFiltro>;

/**
 * Valores por comunicado. Só `prazo`: `nome_aluno`, `curso` e `termo` vêm do cadastro do aluno
 * na renderização (T14). Qualquer outra chave é rejeitada (whitelist).
 */
export const esquemaVariaveis = z.strictObject({
  prazo: z.string().trim().min(1).max(100).optional(),
});
export type VariaveisComunicado = z.infer<typeof esquemaVariaveis>;

function semRepetir<T>(lista: readonly T[]): T[] {
  return [...new Set(lista)];
}

/**
 * Forma canônica do filtro: tira campos vazios e repetições. Sem nenhum critério, devolve `null`,
 * que significa todos os alunos ativos.
 */
export function normalizarFiltro(
  filtro: FiltroDestinatarios | null | undefined,
): FiltroDestinatarios | null {
  if (!filtro) return null;
  if ('ids_alunos' in filtro) {
    return { ids_alunos: semRepetir(filtro.ids_alunos) };
  }
  const resultado: z.infer<typeof esquemaFiltroTurma> = {};
  for (const campo of ['curso', 'periodo', 'turma', 'termo'] as const) {
    const valores = filtro[campo];
    if (valores && valores.length > 0) resultado[campo] = semRepetir(valores);
  }
  return Object.keys(resultado).length > 0 ? resultado : null;
}

/** Sem nenhuma variável, guarda `null`. */
export function normalizarVariaveis(
  variaveis: VariaveisComunicado | null | undefined,
): VariaveisComunicado | null {
  if (!variaveis || variaveis.prazo === undefined) return null;
  return { prazo: variaveis.prazo };
}
