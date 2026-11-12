// Critério 1 da T04: os tipos gerados do openapi.yaml barram, na compilação, o que está fora do
// contrato. As linhas com @ts-expect-error só compilam se o erro de tipo existir de fato
// (o `npm run typecheck` falha se o contrato passar a aceitá-las).

import { describe, expect, it } from 'vitest';
import { http } from '../mocks/handlers';
import { criarCliente } from './cliente';
import type { ComunicadoDetalhe, CorpoComunicado, NomeCanal } from './tipos';

describe('Tipos gerados do openapi.yaml (T04)', () => {
  it('o cliente e os mocks só aceitam caminhos, corpos e respostas do contrato', () => {
    const cliente = criarCliente('http://localhost/api');

    // Funções nunca chamadas: só a checagem de tipos importa.
    const chamadasInvalidas = () => {
      // @ts-expect-error caminho fora do contrato
      void cliente.GET('/nao-existe');
      // @ts-expect-error a operação exige o parâmetro de caminho id
      void cliente.GET('/comunicados/{id}');
    };
    const mocksInvalidos = () => [
      // @ts-expect-error UsuarioSessao exige nome, email e papel
      http.get('/auth/me', ({ response }) => response(200).json({ id: 1 })),
      // @ts-expect-error status 418 não está declarado na operação
      http.get('/health', ({ response }) => response(418).json({ status: 'ok' })),
    ];

    // @ts-expect-error canal fora do enum NomeCanal
    const canalInvalido: NomeCanal = 'sms';
    // @ts-expect-error id_usuario não faz parte do CorpoComunicado (o dono vem da sessão)
    const corpoInvalido: CorpoComunicado = { id_usuario: 1 };
    const corpo: CorpoComunicado = { titulo: null, canais: ['email', 'whatsapp'] };
    const status: ComunicadoDetalhe['status'] = 'rascunho';

    expect(typeof chamadasInvalidas).toBe('function');
    expect(typeof mocksInvalidos).toBe('function');
    expect(corpo.canais).toHaveLength(2);
    expect(status).toBe('rascunho');
    expect(canalInvalido).toBe('sms');
    expect(corpoInvalido).toEqual({ id_usuario: 1 });
  });
});
