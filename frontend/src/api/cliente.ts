// Cliente HTTP tipado pelo openapi.yaml (T04). Caminhos, parâmetros, corpos e respostas vêm de
// `paths`: chamar algo fora do contrato não compila.

import createClient from 'openapi-fetch';
import type { paths } from './tipos';

/** O front fala com a API pelo proxy do Vite em /api (mesma origem, sem CORS; T10). */
export const BASE_API = '/api';

export function criarCliente(baseUrl: string = BASE_API) {
  return createClient<paths>({
    baseUrl,
    // O cookie de sessão (httpOnly, SameSite=Strict) segue nas requisições da mesma origem.
    credentials: 'same-origin',
    // fetch lido a cada chamada: o openapi-fetch guardaria o global da criação, e o MSW o troca
    // depois (testes e mocks no navegador).
    fetch: (requisicao) => globalThis.fetch(requisicao),
  });
}
