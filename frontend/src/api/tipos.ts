// Tipos da API derivados do openapi.yaml (T04). Não edite schema.gerado.ts à mão:
// rode `npm run gerar:api -w frontend` depois de uma mudança de contrato aprovada.

import type { components, paths } from './schema.gerado';

export type { components, paths };

type Schemas = components['schemas'];

export type Papel = Schemas['Papel'];
export type NomeCanal = Schemas['NomeCanal'];
export type StatusComunicado = Schemas['StatusComunicado'];
export type StatusAprovacao = Schemas['StatusAprovacao'];
export type UsuarioLogin = Schemas['UsuarioLogin'];
export type UsuarioSessao = Schemas['UsuarioSessao'];
export type Docente = Schemas['Docente'];
export type PaginaDocentes = Schemas['PaginaDocentes'];
export type CorpoComunicado = Schemas['CorpoComunicado'];
export type ComunicadoDetalhe = Schemas['ComunicadoDetalhe'];
export type ComunicadoResumo = Schemas['ComunicadoResumo'];
export type PaginaComunicados = Schemas['PaginaComunicados'];
export type FiltroDestinatarios = Schemas['FiltroDestinatarios'];

/** Corpo de erro da API: sempre `{ erro, mensagem }`. */
export interface ErroApi {
  erro: string;
  mensagem: string;
}
