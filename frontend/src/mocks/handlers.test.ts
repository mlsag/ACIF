// @vitest-environment node
// Critério 2 da T04: os mocks MSW seguem o openapi.yaml. Cada handler é chamado pelo cliente
// tipado, e a resposta (status e corpo) é validada contra o schema do spec.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarCliente } from '../api/cliente';
import { METODOS, operacoesImplementadas, spec, validarResposta } from '../test/contrato';
import { SENHA_MOCK, USUARIO_MOCK } from './dados';
import { handlers } from './handlers';
import { servidorMock } from './node';

const cliente = criarCliente('http://localhost/api');

interface Resultado {
  data?: unknown;
  error?: unknown;
  response: Response;
}

function conferir(metodo: string, caminho: string, resultado: Resultado, status: number): void {
  expect(resultado.response.status, `${metodo} ${caminho}`).toBe(status);
  const corpo = resultado.data ?? resultado.error;
  expect(validarResposta(metodo, caminho, status, corpo), `${metodo} ${caminho} ${status}`).toEqual(
    [],
  );
}

describe('Mocks MSW x openapi.yaml (T04)', () => {
  beforeAll(() => servidorMock.listen({ onUnhandledFrame: 'error' }));
  afterAll(() => servidorMock.close());

  it('há um handler para cada operação implementada, e só para elas', () => {
    const doSpec = operacoesImplementadas().map((op) => {
      const [metodo, caminho] = op.split(' ');
      return `${metodo} */api${caminho!.replace(/\{(\w+)\}/g, ':$1')}`;
    });
    const dosHandlers = handlers.map((h) => `${h.info.method} ${String(h.info.path)}`);
    expect(dosHandlers.sort()).toEqual(doSpec.sort());
  });

  it('o spec só usa métodos que o validador conhece', () => {
    for (const item of Object.values(spec.paths as Record<string, object>)) {
      for (const chave of Object.keys(item)) {
        expect([...METODOS, 'parameters']).toContain(chave);
      }
    }
  });

  it('auth e health respondem conforme o contrato', async () => {
    conferir('GET', '/health', await cliente.GET('/health'), 200);
    conferir(
      'POST',
      '/auth/login',
      await cliente.POST('/auth/login', { body: { email: USUARIO_MOCK.email, senha: SENHA_MOCK } }),
      200,
    );
    conferir(
      'POST',
      '/auth/login',
      await cliente.POST('/auth/login', { body: { email: USUARIO_MOCK.email, senha: 'outra' } }),
      401,
    );
    conferir('POST', '/auth/logout', await cliente.POST('/auth/logout'), 204);
    conferir('GET', '/auth/me', await cliente.GET('/auth/me'), 200);
  });

  it('docentes respondem conforme o contrato', async () => {
    conferir(
      'POST',
      '/docentes/cadastro',
      await cliente.POST('/docentes/cadastro', {
        body: {
          nome: 'Docente Novo Sintético',
          email: 'novo.mock@example.com',
          senha: 'senha-sintetica-longa',
        },
      }),
      202,
    );
    conferir(
      'GET',
      '/docentes',
      await cliente.GET('/docentes', { params: { query: { status: 'pendente' } } }),
      200,
    );
    const aprovar = '/docentes/{id}/aprovar' as const;
    const bloquear = '/docentes/{id}/bloquear' as const;
    conferir('POST', aprovar, await cliente.POST(aprovar, { params: { path: { id: 10 } } }), 200);
    conferir('POST', aprovar, await cliente.POST(aprovar, { params: { path: { id: 99 } } }), 404);
    conferir('POST', bloquear, await cliente.POST(bloquear, { params: { path: { id: 10 } } }), 200);
  });

  it('comunicados respondem conforme o contrato', async () => {
    conferir(
      'POST',
      '/comunicados',
      await cliente.POST('/comunicados', {
        body: { titulo: 'Aviso sintético', canais: ['email'], variaveis: { prazo: '20/11/2026' } },
      }),
      201,
    );
    conferir('POST', '/comunicados', await cliente.POST('/comunicados'), 201);
    conferir('GET', '/comunicados', await cliente.GET('/comunicados'), 200);

    const item = '/comunicados/{id}' as const;
    const id = (n: number) => ({ params: { path: { id: n } } });
    conferir('GET', item, await cliente.GET(item, id(1)), 200);
    conferir('GET', item, await cliente.GET(item, id(99)), 404);
    conferir('PATCH', item, await cliente.PATCH(item, { ...id(1), body: { titulo: null } }), 200);
    conferir('DELETE', item, await cliente.DELETE(item, id(1)), 204);
    conferir('DELETE', item, await cliente.DELETE(item, id(99)), 404);
  });
});
