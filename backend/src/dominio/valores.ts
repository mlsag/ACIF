// Valores aceitos nas colunas varchar de status e papel (docs/arquitetura.md, seção 4).
// O banco guarda varchar; a validação acontece no código (Zod nos services, a partir das próximas tasks).

export const PAPEIS = ['admin', 'docente'] as const;
export type Papel = (typeof PAPEIS)[number];

export const STATUS_APROVACAO = ['pendente', 'aprovado', 'bloqueado'] as const;
export type StatusAprovacao = (typeof STATUS_APROVACAO)[number];

/** `agendado` é N2. */
export const STATUS_COMUNICADO = [
  'rascunho',
  'pronto',
  'enviando',
  'concluido',
  'agendado',
] as const;
export type StatusComunicado = (typeof STATUS_COMUNICADO)[number];

export const ORIGENS_VERSAO = ['ia', 'manual'] as const;
export type OrigemVersao = (typeof ORIGENS_VERSAO)[number];

export const STATUS_ENVIO = ['pendente', 'enviado', 'falha'] as const;
export type StatusEnvio = (typeof STATUS_ENVIO)[number];

/** Nomes em `canais.nome`, que são as chaves do registry de CanalEnvio. */
export const NOMES_CANAIS = ['email', 'whatsapp'] as const;
export type NomeCanal = (typeof NOMES_CANAIS)[number];

/**
 * Whitelist de placeholders (sem chaves). A sintaxe, a validação prévia do disparo e a
 * renderização ficam em `dominio/renderizador.ts` (T14), que mapeia a origem de cada valor.
 */
export const PLACEHOLDERS = ['nome_aluno', 'curso', 'prazo', 'termo'] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];
