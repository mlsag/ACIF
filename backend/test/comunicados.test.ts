// Testes da API de comunicados (T12) sem banco: repositórios em memória e login real (argon2).
// Os testes com o banco real ficam em test/db/comunicado-repository.test.ts.

import argon2 from 'argon2';
import type { FastifyInstance } from 'fastify';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import type { ConfigAuth } from '../src/config.js';
import { RESPOSTA_NAO_AUTENTICADO } from '../src/plugins/autenticacao.js';
import { RESPOSTA_CORPO_INVALIDO } from '../src/rotas/auth.js';
import { RESPOSTAS_ERRO_COMUNICADO } from '../src/rotas/comunicados.js';
import { AuthService } from '../src/services/auth-service.js';
import { ComunicadoService } from '../src/services/comunicado-service.js';
import { CanalRepositoryMemoria } from './apoio/canal-repository-memoria.js';
import { ComunicadoRepositoryMemoria } from './apoio/comunicado-repository-memoria.js';
import { UsuarioRepositoryMemoria } from './apoio/usuario-repository-memoria.js';

const TIMEOUT = 30_000;
const SENHA = 'senha-sintetica-de-teste';
const NAO_ENCONTRADO = RESPOSTAS_ERRO_COMUNICADO.nao_encontrado.corpo;
const NAO_EDITAVEL = RESPOSTAS_ERRO_COMUNICADO.nao_editavel.corpo;
const CANAL_INDISPONIVEL = RESPOSTAS_ERRO_COMUNICADO.canal_indisponivel.corpo;

// Marcadores para provar que título e conteúdo não vão para o log.
const TITULO_MARCADOR = 'Titulo Marcador T12 Sintetico';
const CONTEUDO_MARCADOR = 'Conteudo marcador T12 sintetico {nome_aluno}';

const configAuth: ConfigAuth = {
  jwtSecret: 'segredo-de-teste-com-mais-de-32-caracteres',
  sessaoHoras: 8,
  cookieSecure: false,
  loginRateLimitMax: 1000,
  cadastroRateLimitMax: 1000,
  usandoSegredoDev: false,
};

// Usuários sintéticos (example.com).
const DOCENTE_A = { id: 1, email: 'docente.a@example.com', nome: 'Docente Sintético A' };
const DOCENTE_B = { id: 2, email: 'docente.b@example.com', nome: 'Docente Sintético B' };
const ADMIN = { id: 3, email: 'admin.t12@example.com', nome: 'Admin Sintético' };

interface Contexto {
  app: FastifyInstance;
  comunicados: ComunicadoRepositoryMemoria;
  canais: CanalRepositoryMemoria;
  linhasLog: string[];
  cookieA: string;
  cookieB: string;
  cookieAdmin: string;
}

let hashSenha: string;

beforeAll(async () => {
  hashSenha = await argon2.hash(SENHA, { type: argon2.argon2id });
}, TIMEOUT);

function cookieDe(resposta: request.Response): string {
  const cabecalho = resposta.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = cabecalho?.find((c) => c.startsWith('acif_sessao='));
  if (!cookie) throw new Error('resposta sem cookie de sessão');
  return cookie.split(';')[0]!;
}

async function criarContexto(): Promise<Contexto> {
  const usuarios = new UsuarioRepositoryMemoria();
  for (const [u, papel] of [
    [DOCENTE_A, 'docente'],
    [DOCENTE_B, 'docente'],
    [ADMIN, 'admin'],
  ] as const) {
    usuarios.adicionar({
      ...u,
      senha: hashSenha,
      ativo: true,
      papel,
      status_aprovacao: 'aprovado',
    });
  }
  const authService = new AuthService(usuarios);
  const comunicados = new ComunicadoRepositoryMemoria();
  const canais = new CanalRepositoryMemoria();
  const linhasLog: string[] = [];
  const app = buildApp({
    logger: { level: 'info', stream: { write: (linha: string) => void linhasLog.push(linha) } },
    auth: { config: configAuth, authService },
    comunicados: { comunicadoService: new ComunicadoService(comunicados, canais) },
  });
  await app.ready();

  const entrar = async (email: string) =>
    cookieDe(await request(app.server).post('/auth/login').send({ email, senha: SENHA }));

  return {
    app,
    comunicados,
    canais,
    linhasLog,
    cookieA: await entrar(DOCENTE_A.email),
    cookieB: await entrar(DOCENTE_B.email),
    cookieAdmin: await entrar(ADMIN.email),
  };
}

const CORPO_COMPLETO = {
  titulo: TITULO_MARCADOR,
  conteudo: CONTEUDO_MARCADOR,
  prompt_original: 'Avisar sobre a entrega do projeto integrador',
  canais: ['email', 'whatsapp'],
  filtro_destinatarios: { curso: ['Gestão Empresarial'], periodo: ['Noite'], termo: ['4'] },
  variaveis: { prazo: '20/11/2026' },
};

describe('API de comunicados (T12)', () => {
  let ctx: Contexto;

  const api = (cookie?: string) => {
    const agente = request(ctx.app.server);
    const com = <T extends request.Test>(req: T) => (cookie ? req.set('Cookie', cookie) : req);
    return {
      post: (corpo?: unknown) => {
        const req = com(agente.post('/comunicados'));
        return corpo === undefined ? req : req.send(corpo as object);
      },
      listar: (query = '') => com(agente.get(`/comunicados${query}`)),
      obter: (id: number | string) => com(agente.get(`/comunicados/${id}`)),
      patch: (id: number | string, corpo: unknown) =>
        com(agente.patch(`/comunicados/${id}`)).send(corpo as object),
      excluir: (id: number | string) => com(agente.delete(`/comunicados/${id}`)),
    };
  };

  beforeAll(async () => {
    ctx = await criarContexto();
  }, TIMEOUT);

  // Estado limpo a cada teste, sem refazer os logins.
  beforeEach(() => {
    ctx.comunicados.limpar();
    ctx.canais.restaurar();
    ctx.linhasLog.length = 0;
  });

  afterAll(async () => {
    await ctx?.app.close();
  });

  describe('critério 1: o CRUD é validado', () => {
    it('cria um rascunho vazio com os padrões', async () => {
      const resposta = await api(ctx.cookieA).post({});
      expect(resposta.status).toBe(201);
      expect(resposta.body).toMatchObject({
        id: 1,
        titulo: null,
        conteudo: null,
        prompt_original: null,
        status: 'rascunho',
        canais: [],
        filtro_destinatarios: null,
        variaveis: null,
        data_envio: null,
      });
      expect(new Date(resposta.body.data_criacao).toString()).not.toBe('Invalid Date');
      expect(resposta.body).not.toHaveProperty('id_usuario');
      expect(ctx.comunicados.linhas.get(1)?.id_usuario).toBe(DOCENTE_A.id);
    });

    it('POST sem corpo também cria o rascunho', async () => {
      const resposta = await api(ctx.cookieA).post();
      expect(resposta.status).toBe(201);
    });

    it('cria com todos os campos e o GET devolve o mesmo comunicado', async () => {
      const criado = await api(ctx.cookieA).post(CORPO_COMPLETO);
      expect(criado.status).toBe(201);
      expect(criado.body).toMatchObject({ ...CORPO_COMPLETO, status: 'rascunho' });

      const lido = await api(ctx.cookieA).obter(criado.body.id);
      expect(lido.status).toBe(200);
      expect(lido.body).toEqual(criado.body);
    });

    it('normaliza: trim, texto vazio vira null, filtro e variáveis vazios viram null', async () => {
      const resposta = await api(ctx.cookieA).post({
        titulo: '  Título com espaços  ',
        conteudo: '   ',
        filtro_destinatarios: { curso: [], termo: [] },
        variaveis: {},
      });
      expect(resposta.status).toBe(201);
      expect(resposta.body).toMatchObject({
        titulo: 'Título com espaços',
        conteudo: null,
        filtro_destinatarios: null,
        variaveis: null,
      });
    });

    it('filtro {} = todos os alunos ativos (null); repetições somem', async () => {
      const todos = await api(ctx.cookieA).post({ filtro_destinatarios: {} });
      expect(todos.body.filtro_destinatarios).toBeNull();

      const individual = await api(ctx.cookieA).post({
        filtro_destinatarios: { ids_alunos: [3, 3, 7] },
      });
      expect(individual.status).toBe(201);
      expect(individual.body.filtro_destinatarios).toEqual({ ids_alunos: [3, 7] });
    });

    it('lista paginada, mais recente primeiro, só com o resumo', async () => {
      for (let i = 1; i <= 3; i++) await api(ctx.cookieA).post({ titulo: `Rascunho ${i}` });

      const primeira = await api(ctx.cookieA).listar('?pagina=1&por_pagina=2');
      expect(primeira.status).toBe(200);
      expect(primeira.body).toMatchObject({ pagina: 1, por_pagina: 2, total: 3 });
      expect(primeira.body.itens.map((c: { titulo: string }) => c.titulo)).toEqual([
        'Rascunho 3',
        'Rascunho 2',
      ]);
      expect(Object.keys(primeira.body.itens[0]).sort()).toEqual(
        ['canais', 'data_criacao', 'data_envio', 'id', 'status', 'titulo'].sort(),
      );

      const segunda = await api(ctx.cookieA).listar('?pagina=2&por_pagina=2');
      expect(segunda.body.itens.map((c: { titulo: string }) => c.titulo)).toEqual(['Rascunho 1']);

      const padrao = await api(ctx.cookieA).listar();
      expect(padrao.body).toMatchObject({ pagina: 1, por_pagina: 20, total: 3 });
    });

    it.each(['?por_pagina=51', '?por_pagina=0', '?pagina=0', '?pagina=abc', '?pagina=-1'])(
      'paginação inválida (%s) dá 400',
      async (query) => {
        const resposta = await api(ctx.cookieA).listar(query);
        expect(resposta.status).toBe(400);
        expect(resposta.body).toEqual(RESPOSTA_CORPO_INVALIDO);
      },
    );

    it('PATCH parcial altera só o que veio; null limpa o campo', async () => {
      const criado = await api(ctx.cookieA).post(CORPO_COMPLETO);
      const id = criado.body.id;

      const parcial = await api(ctx.cookieA).patch(id, { titulo: 'Novo título' });
      expect(parcial.status).toBe(200);
      expect(parcial.body).toMatchObject({ ...CORPO_COMPLETO, titulo: 'Novo título' });

      const limpo = await api(ctx.cookieA).patch(id, {
        conteudo: null,
        filtro_destinatarios: null,
        variaveis: null,
        canais: [],
      });
      expect(limpo.status).toBe(200);
      expect(limpo.body).toMatchObject({
        titulo: 'Novo título',
        conteudo: null,
        filtro_destinatarios: null,
        variaveis: null,
        canais: [],
        status: 'rascunho',
      });
    });

    it('DELETE de rascunho dá 204 e o GET seguinte dá 404', async () => {
      const criado = await api(ctx.cookieA).post({});
      const excluido = await api(ctx.cookieA).excluir(criado.body.id);
      expect(excluido.status).toBe(204);
      expect(excluido.text).toBe('');

      const depois = await api(ctx.cookieA).obter(criado.body.id);
      expect(depois.status).toBe(404);
      expect(depois.body).toEqual(NAO_ENCONTRADO);
    });

    const invalidos: [string, unknown][] = [
      ['título com mais de 200 caracteres', { titulo: 'x'.repeat(201) }],
      ['conteúdo com mais de 10.000 caracteres', { conteudo: 'x'.repeat(10_001) }],
      ['prompt com mais de 600 caracteres', { prompt_original: 'x'.repeat(601) }],
      ['título que não é texto', { titulo: 123 }],
      ['canal desconhecido', { canais: ['sms'] }],
      ['canal repetido', { canais: ['email', 'email'] }],
      ['canais nulo', { canais: null }],
      ['variável fora da whitelist', { variaveis: { data: '20/11/2026' } }],
      ['nome_aluno como variável (vem do cadastro)', { variaveis: { nome_aluno: 'x' } }],
      ['prazo vazio', { variaveis: { prazo: '  ' } }],
      ['prazo que não é texto', { variaveis: { prazo: 20 } }],
      [
        'filtro misturando turma e aluno',
        { filtro_destinatarios: { curso: ['x'], ids_alunos: [1] } },
      ],
      ['ids_alunos vazio (não pode virar "todos")', { filtro_destinatarios: { ids_alunos: [] } }],
      [
        'ids_alunos acima de 500',
        { filtro_destinatarios: { ids_alunos: Array.from({ length: 501 }, (_, i) => i + 1) } },
      ],
      ['id de aluno inválido', { filtro_destinatarios: { ids_alunos: [0] } }],
      ['campo de filtro desconhecido', { filtro_destinatarios: { email: ['x'] } }],
      ['valor de filtro vazio', { filtro_destinatarios: { curso: [''] } }],
      ['id_usuario no corpo', { id_usuario: DOCENTE_B.id }],
      ['status no corpo', { status: 'concluido' }],
      ['corpo que não é objeto', ['titulo']],
    ];

    it.each(invalidos)('POST com %s dá 400 genérico', async (_caso, corpo) => {
      const resposta = await api(ctx.cookieA).post(corpo);
      expect(resposta.status).toBe(400);
      expect(resposta.body).toEqual(RESPOSTA_CORPO_INVALIDO);
      expect(ctx.comunicados.linhas.size).toBe(0);
    });

    it.each(invalidos)('PATCH com %s dá 400 e não altera nada', async (_caso, corpo) => {
      const criado = await api(ctx.cookieA).post(CORPO_COMPLETO);
      const resposta = await api(ctx.cookieA).patch(criado.body.id, corpo);
      expect(resposta.status).toBe(400);
      expect(resposta.body).toEqual(RESPOSTA_CORPO_INVALIDO);
      expect((await api(ctx.cookieA).obter(criado.body.id)).body).toEqual(criado.body);
    });

    it.each(['abc', '0', '-1', '1.5', '1e3', '2147483648', '9999999999'])(
      'id inválido (%s) dá 400 nas rotas com id',
      async (id) => {
        for (const resposta of [
          await api(ctx.cookieA).obter(id),
          await api(ctx.cookieA).patch(id, { titulo: 'x' }),
          await api(ctx.cookieA).excluir(id),
        ]) {
          expect(resposta.status).toBe(400);
          expect(resposta.body).toEqual(RESPOSTA_CORPO_INVALIDO);
        }
      },
    );

    it('canal inativo dá 422 no POST e no PATCH', async () => {
      ctx.canais.canais.set('whatsapp', false);

      const post = await api(ctx.cookieA).post({ canais: ['email', 'whatsapp'] });
      expect(post.status).toBe(422);
      expect(post.body).toEqual(CANAL_INDISPONIVEL);
      expect(ctx.comunicados.linhas.size).toBe(0);

      const criado = await api(ctx.cookieA).post({ canais: ['email'] });
      expect(criado.status).toBe(201);
      const patch = await api(ctx.cookieA).patch(criado.body.id, { canais: ['whatsapp'] });
      expect(patch.status).toBe(422);
      expect(patch.body).toEqual(CANAL_INDISPONIVEL);
      expect((await api(ctx.cookieA).obter(criado.body.id)).body.canais).toEqual(['email']);
    });

    it('canal que não existe na tabela canais dá 422', async () => {
      ctx.canais.canais.delete('email');
      const resposta = await api(ctx.cookieA).post({ canais: ['email'] });
      expect(resposta.status).toBe(422);
      expect(resposta.body).toEqual(CANAL_INDISPONIVEL);
    });

    it.each(['pronto', 'enviando', 'concluido', 'agendado'])(
      'comunicado em %s: PATCH e DELETE dão 409 e nada muda; GET continua 200',
      async (status) => {
        const criado = await api(ctx.cookieA).post(CORPO_COMPLETO);
        ctx.comunicados.forcarStatus(criado.body.id, status);

        const patch = await api(ctx.cookieA).patch(criado.body.id, { titulo: 'Alterado' });
        expect(patch.status).toBe(409);
        expect(patch.body).toEqual(NAO_EDITAVEL);

        const excluir = await api(ctx.cookieA).excluir(criado.body.id);
        expect(excluir.status).toBe(409);
        expect(excluir.body).toEqual(NAO_EDITAVEL);

        const lido = await api(ctx.cookieA).obter(criado.body.id);
        expect(lido.status).toBe(200);
        expect(lido.body).toMatchObject({ titulo: TITULO_MARCADOR, status });
      },
    );

    it('jsonb corrompido no banco vira 500 genérico, sem ecoar o conteúdo', async () => {
      const criado = await api(ctx.cookieA).post({});
      ctx.comunicados.corromper(criado.body.id, 'filtro_destinatarios');
      const resposta = await api(ctx.cookieA).obter(criado.body.id);
      expect(resposta.status).toBe(500);
      expect(resposta.body).toEqual({ erro: 'erro_interno', mensagem: 'Erro interno.' });
    });

    it('sem sessão, todas as rotas dão 401 genérico', async () => {
      const semSessao = api();
      for (const resposta of [
        await semSessao.post({}),
        await semSessao.listar(),
        await semSessao.obter(1),
        await semSessao.patch(1, { titulo: 'x' }),
        await semSessao.excluir(1),
      ]) {
        expect(resposta.status).toBe(401);
        expect(resposta.body).toEqual(RESPOSTA_NAO_AUTENTICADO);
      }
      expect(ctx.comunicados.linhas.size).toBe(0);
    });

    it('sessão inválida (cookie adulterado) dá 401', async () => {
      const resposta = await api('acif_sessao=token.adulterado.x').listar();
      expect(resposta.status).toBe(401);
      expect(resposta.body).toEqual(RESPOSTA_NAO_AUTENTICADO);
    });

    it('logs sem PII: título, conteúdo e prompt não aparecem, nem em erro de validação', async () => {
      const criado = await api(ctx.cookieA).post(CORPO_COMPLETO);
      await api(ctx.cookieA).patch(criado.body.id, { titulo: TITULO_MARCADOR });
      await api(ctx.cookieA).post({ titulo: TITULO_MARCADOR, conteudo: CONTEUDO_MARCADOR, x: 1 });
      await api(ctx.cookieA).obter(criado.body.id);
      await api(ctx.cookieA).listar();
      ctx.comunicados.corromper(criado.body.id, 'variaveis');
      await api(ctx.cookieA).obter(criado.body.id);

      const log = ctx.linhasLog.join('\n');
      expect(log).toContain('/comunicados');
      expect(log).not.toContain('Marcador');
      expect(log).not.toContain('marcador');
      expect(log).not.toContain('projeto integrador');
      expect(log).not.toContain('20/11/2026');
    });
  });

  describe('critério 2: cada docente acessa só os seus comunicados', () => {
    it('B não lê, não edita e não exclui o comunicado de A: 404 idêntico ao de id inexistente', async () => {
      const deA = await api(ctx.cookieA).post(CORPO_COMPLETO);
      const id = deA.body.id;
      const inexistente = 999;

      const pares = [
        [await api(ctx.cookieB).obter(id), await api(ctx.cookieB).obter(inexistente)],
        [
          await api(ctx.cookieB).patch(id, { titulo: 'Invasão' }),
          await api(ctx.cookieB).patch(inexistente, { titulo: 'Invasão' }),
        ],
        [await api(ctx.cookieB).excluir(id), await api(ctx.cookieB).excluir(inexistente)],
      ];
      for (const [deOutro, naoExiste] of pares) {
        expect(deOutro!.status).toBe(404);
        expect(deOutro!.body).toEqual(NAO_ENCONTRADO);
        expect(
          JSON.stringify([deOutro!.status, deOutro!.text, deOutro!.headers['content-type']]),
        ).toBe(
          JSON.stringify([naoExiste!.status, naoExiste!.text, naoExiste!.headers['content-type']]),
        );
      }

      // O comunicado de A continua intacto.
      const lido = await api(ctx.cookieA).obter(id);
      expect(lido.status).toBe(200);
      expect(lido.body).toEqual(deA.body);
    });

    it('B recebe 404 (e não 422) mesmo pedindo um canal inativo no comunicado de A', async () => {
      const deA = await api(ctx.cookieA).post({});
      ctx.canais.canais.set('whatsapp', false);
      const resposta = await api(ctx.cookieB).patch(deA.body.id, { canais: ['whatsapp'] });
      expect(resposta.status).toBe(404);
      expect(resposta.body).toEqual(NAO_ENCONTRADO);
    });

    it('B recebe 404 (e não 409) num comunicado de A que já não é rascunho', async () => {
      const deA = await api(ctx.cookieA).post({});
      ctx.comunicados.forcarStatus(deA.body.id, 'concluido');
      expect((await api(ctx.cookieB).patch(deA.body.id, { titulo: 'x' })).status).toBe(404);
      expect((await api(ctx.cookieB).excluir(deA.body.id)).status).toBe(404);
    });

    it('a listagem de cada um só traz e só conta os próprios comunicados', async () => {
      await api(ctx.cookieA).post({ titulo: 'De A 1' });
      await api(ctx.cookieA).post({ titulo: 'De A 2' });
      await api(ctx.cookieB).post({ titulo: 'De B 1' });

      const listaA = await api(ctx.cookieA).listar();
      expect(listaA.body.total).toBe(2);
      expect(listaA.body.itens.map((c: { titulo: string }) => c.titulo)).toEqual([
        'De A 2',
        'De A 1',
      ]);

      const listaB = await api(ctx.cookieB).listar();
      expect(listaB.body.total).toBe(1);
      expect(listaB.body.itens.map((c: { titulo: string }) => c.titulo)).toEqual(['De B 1']);
    });

    it('o dono vem da sessão: id_usuario no corpo é rejeitado e nada é criado para A', async () => {
      const resposta = await api(ctx.cookieB).post({ id_usuario: DOCENTE_A.id, titulo: 'x' });
      expect(resposta.status).toBe(400);
      expect((await api(ctx.cookieA).listar()).body.total).toBe(0);
    });

    it('o comunicado criado por B pertence a B', async () => {
      const deB = await api(ctx.cookieB).post({});
      expect(ctx.comunicados.linhas.get(deB.body.id)?.id_usuario).toBe(DOCENTE_B.id);
    });

    it('o admin também só vê os próprios comunicados', async () => {
      const deA = await api(ctx.cookieA).post({ titulo: 'De A' });
      await api(ctx.cookieAdmin).post({ titulo: 'Do admin' });

      const lista = await api(ctx.cookieAdmin).listar();
      expect(lista.body.total).toBe(1);
      expect(lista.body.itens[0].titulo).toBe('Do admin');

      expect((await api(ctx.cookieAdmin).obter(deA.body.id)).status).toBe(404);
      expect((await api(ctx.cookieAdmin).patch(deA.body.id, { titulo: 'x' })).status).toBe(404);
      expect((await api(ctx.cookieAdmin).excluir(deA.body.id)).status).toBe(404);

      // E A não vê o do admin.
      expect((await api(ctx.cookieA).listar()).body.total).toBe(1);
    });
  });
});
