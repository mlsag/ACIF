// Teste de contrato (T04): as rotas reais seguem o openapi.yaml. Sem banco: repositórios em memória.
// 1) As rotas registradas são exatamente as operações `implementado` do spec.
// 2) As respostas reais (sucesso e erros) têm status declarado e corpo válido contra o schema.

import argon2 from 'argon2';
import type { FastifyInstance } from 'fastify';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import type { ConfigAuth } from '../src/config.js';
import { AuthService } from '../src/services/auth-service.js';
import { ComunicadoService } from '../src/services/comunicado-service.js';
import { DocenteService } from '../src/services/docente-service.js';
import { CanalRepositoryMemoria } from './apoio/canal-repository-memoria.js';
import { ComunicadoRepositoryMemoria } from './apoio/comunicado-repository-memoria.js';
import { operacoesImplementadas, validarResposta } from './apoio/contrato.js';
import { UsuarioRepositoryMemoria } from './apoio/usuario-repository-memoria.js';

const TIMEOUT = 30_000;
const SENHA = 'senha-sintetica-de-teste';

// Usuários sintéticos (example.com).
const DOCENTE = { id: 1, email: 'docente.contrato@example.com', nome: 'Docente Sintético' };
const ADMIN = { id: 2, email: 'admin.contrato@example.com', nome: 'Admin Sintético' };
const PENDENTE = { id: 3, email: 'pendente.contrato@example.com', nome: 'Docente Pendente' };

const configBase: ConfigAuth = {
  jwtSecret: 'segredo-de-teste-com-mais-de-32-caracteres',
  sessaoHoras: 8,
  cookieSecure: false,
  loginRateLimitMax: 1000,
  cadastroRateLimitMax: 1000,
  usandoSegredoDev: false,
};

interface Contexto {
  app: FastifyInstance;
  comunicados: ComunicadoRepositoryMemoria;
  canais: CanalRepositoryMemoria;
}

async function criarApp(hash: string, config: ConfigAuth): Promise<Contexto> {
  const usuarios = new UsuarioRepositoryMemoria();
  usuarios.adicionar({
    ...DOCENTE,
    senha: hash,
    ativo: true,
    papel: 'docente',
    status_aprovacao: 'aprovado',
  });
  usuarios.adicionar({
    ...ADMIN,
    senha: hash,
    ativo: true,
    papel: 'admin',
    status_aprovacao: 'aprovado',
  });
  usuarios.adicionar({
    ...PENDENTE,
    senha: hash,
    ativo: true,
    papel: 'docente',
    status_aprovacao: 'pendente',
  });
  const comunicados = new ComunicadoRepositoryMemoria();
  const canais = new CanalRepositoryMemoria();
  const app = buildApp({
    auth: { config, authService: new AuthService(usuarios) },
    comunicados: { comunicadoService: new ComunicadoService(comunicados, canais) },
    docentes: { docenteService: new DocenteService(usuarios) },
  });
  await app.ready();
  return { app, comunicados, canais };
}

function cookieDe(resposta: request.Response): string {
  const cabecalho = resposta.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = cabecalho?.find((c) => c.startsWith('acif_sessao='));
  if (!cookie) throw new Error('resposta sem cookie de sessão');
  return cookie.split(';')[0]!;
}

/**
 * Rotas do Fastify como "MÉTODO /caminho/{param}", sem as HEAD automáticas. Lê a árvore do
 * printRoutes: cada nível recua 4 caracteres e o caminho é a soma dos trechos dos ancestrais.
 */
function rotasRegistradas(app: FastifyInstance): string[] {
  const rotas: string[] = [];
  const trechos: string[] = [];
  for (const linha of app.printRoutes({ commonPrefix: false }).split('\n')) {
    const achado = /^(.*?)[├└]── (\S+)(?: \(([^)]+)\))?$/.exec(linha);
    if (!achado) continue;
    trechos.length = achado[1]!.length / 4;
    trechos.push(achado[2]!);
    if (!achado[3]) continue;
    const caminho = trechos.join('').replace(/:(\w+)/g, '{$1}');
    for (const metodo of achado[3].split(',').map((m) => m.trim())) {
      if (metodo !== 'HEAD') rotas.push(`${metodo} ${caminho}`);
    }
  }
  return rotas.sort();
}

describe('Contrato openapi.yaml x rotas reais (T04)', () => {
  let hash: string;
  let ctx: Contexto;
  let cookieDocente: string;
  let cookieAdmin: string;
  const exercitadas = new Set<string>();

  /** Valida a resposta contra o spec e registra a operação como exercitada. */
  function conferir(
    metodo: string,
    caminho: string,
    resposta: request.Response,
    statusEsperado: number,
    aceitarDefault = false,
  ): void {
    expect(resposta.status, `${metodo} ${caminho}`).toBe(statusEsperado);
    expect(
      validarResposta(metodo, caminho, resposta.status, resposta.body, aceitarDefault),
      `${metodo} ${caminho} ${resposta.status}`,
    ).toEqual([]);
    exercitadas.add(`${metodo} ${caminho}`);
  }

  beforeAll(async () => {
    hash = await argon2.hash(SENHA, { type: argon2.argon2id });
    ctx = await criarApp(hash, configBase);
    const entrar = async (email: string) =>
      cookieDe(await request(ctx.app.server).post('/auth/login').send({ email, senha: SENHA }));
    cookieDocente = await entrar(DOCENTE.email);
    cookieAdmin = await entrar(ADMIN.email);
  }, TIMEOUT);

  afterAll(async () => {
    await ctx.app.close();
  });

  it('as rotas registradas são exatamente as operações implementadas do spec', () => {
    expect(rotasRegistradas(ctx.app)).toEqual(operacoesImplementadas());
  });

  it('health e auth', async () => {
    const api = request(ctx.app.server);
    conferir('GET', '/health', await api.get('/health'), 200);

    const login = await api.post('/auth/login').send({ email: DOCENTE.email, senha: SENHA });
    conferir('POST', '/auth/login', login, 200);
    expect(login.headers['set-cookie']).toBeDefined();
    conferir('POST', '/auth/login', await api.post('/auth/login').send({}), 400);
    conferir(
      'POST',
      '/auth/login',
      await api.post('/auth/login').send({ email: DOCENTE.email, senha: 'senha-errada' }),
      401,
    );

    conferir('GET', '/auth/me', await api.get('/auth/me').set('Cookie', cookieDocente), 200);
    conferir('GET', '/auth/me', await api.get('/auth/me'), 401);
    conferir('POST', '/auth/logout', await api.post('/auth/logout'), 204);
  });

  it('docentes', async () => {
    const api = request(ctx.app.server);
    conferir(
      'POST',
      '/docentes/cadastro',
      await api.post('/docentes/cadastro').send({
        nome: 'Docente Novo Sintético',
        email: 'novo.contrato@example.com',
        senha: 'senha-sintetica-longa',
      }),
      202,
    );
    conferir(
      'POST',
      '/docentes/cadastro',
      await api
        .post('/docentes/cadastro')
        .send({ nome: 'X', email: 'x', senha: 'curta', papel: 'admin' }),
      400,
    );

    conferir(
      'GET',
      '/docentes',
      await api.get('/docentes?status=pendente').set('Cookie', cookieAdmin),
      200,
    );
    conferir(
      'GET',
      '/docentes',
      await api.get('/docentes?status=x').set('Cookie', cookieAdmin),
      400,
    );
    conferir('GET', '/docentes', await api.get('/docentes'), 401);
    conferir('GET', '/docentes', await api.get('/docentes').set('Cookie', cookieDocente), 403);

    const aprovar = '/docentes/{id}/aprovar';
    conferir(
      'POST',
      aprovar,
      await api.post(`/docentes/${PENDENTE.id}/aprovar`).set('Cookie', cookieAdmin),
      200,
    );
    conferir(
      'POST',
      aprovar,
      await api.post(`/docentes/${ADMIN.id}/aprovar`).set('Cookie', cookieAdmin),
      404,
    );
    conferir(
      'POST',
      aprovar,
      await api.post('/docentes/abc/aprovar').set('Cookie', cookieAdmin),
      400,
    );

    const bloquear = '/docentes/{id}/bloquear';
    conferir(
      'POST',
      bloquear,
      await api.post(`/docentes/${PENDENTE.id}/bloquear`).set('Cookie', cookieAdmin),
      200,
    );
    conferir(
      'POST',
      bloquear,
      await api.post(`/docentes/${PENDENTE.id}/bloquear`).set('Cookie', cookieDocente),
      403,
    );
  });

  it('comunicados', async () => {
    const api = request(ctx.app.server);
    const com = <T extends request.Test>(req: T) => req.set('Cookie', cookieDocente);
    const corpo = {
      titulo: 'Entrega do Projeto Integrador',
      conteudo: 'Olá, {nome_aluno}! A entrega vai até {prazo}.',
      prompt_original: 'Avisar sobre a entrega do projeto integrador',
      canais: ['email', 'whatsapp'],
      filtro_destinatarios: { curso: ['Gestão Empresarial'], termo: ['4'] },
      variaveis: { prazo: '20/11/2026' },
    };

    const criado = await com(api.post('/comunicados')).send(corpo);
    conferir('POST', '/comunicados', criado, 201);
    const id = (criado.body as { id: number }).id;
    conferir('POST', '/comunicados', await com(api.post('/comunicados')), 201);
    conferir(
      'POST',
      '/comunicados',
      await com(api.post('/comunicados')).send({ status: 'pronto' }),
      400,
    );
    conferir('POST', '/comunicados', await api.post('/comunicados').send(corpo), 401);
    // 415 do Fastify (Content-Type não suportado) cai na resposta `default`.
    conferir(
      'POST',
      '/comunicados',
      await com(api.post('/comunicados')).set('Content-Type', 'application/xml').send('<x/>'),
      415,
      true,
    );

    conferir('GET', '/comunicados', await com(api.get('/comunicados')), 200);
    conferir('GET', '/comunicados', await com(api.get('/comunicados?por_pagina=51')), 400);

    const item = '/comunicados/{id}';
    conferir('GET', item, await com(api.get(`/comunicados/${id}`)), 200);
    conferir('GET', item, await com(api.get('/comunicados/999')), 404);
    conferir('PATCH', item, await com(api.patch(`/comunicados/${id}`)).send({ titulo: null }), 200);

    ctx.canais.canais.set('whatsapp', false);
    conferir(
      'PATCH',
      item,
      await com(api.patch(`/comunicados/${id}`)).send({ canais: ['whatsapp'] }),
      422,
    );
    conferir(
      'POST',
      '/comunicados',
      await com(api.post('/comunicados')).send({ canais: ['whatsapp'] }),
      422,
    );
    ctx.canais.restaurar();

    ctx.comunicados.forcarStatus(id, 'enviando');
    conferir('PATCH', item, await com(api.patch(`/comunicados/${id}`)).send({ titulo: 'x' }), 409);
    conferir('DELETE', item, await com(api.delete(`/comunicados/${id}`)), 409);

    const outro = (await com(api.post('/comunicados'))).body as { id: number };
    ctx.comunicados.corromper(outro.id, 'canais');
    conferir('GET', item, await com(api.get(`/comunicados/${outro.id}`)), 500);
    conferir('DELETE', item, await com(api.delete(`/comunicados/${outro.id}`)), 204);
    conferir('DELETE', item, await com(api.delete(`/comunicados/${outro.id}`)), 404);
  });

  it(
    '429 do rate limit segue o contrato',
    async () => {
      const limitado = await criarApp(hash, {
        ...configBase,
        loginRateLimitMax: 1,
        cadastroRateLimitMax: 1,
      });
      try {
        const api = request(limitado.app.server);
        await api.post('/auth/login').send({});
        conferir('POST', '/auth/login', await api.post('/auth/login').send({}), 429);
        await api.post('/docentes/cadastro').send({});
        conferir('POST', '/docentes/cadastro', await api.post('/docentes/cadastro').send({}), 429);
      } finally {
        await limitado.app.close();
      }
    },
    TIMEOUT,
  );

  it('toda operação implementada foi exercitada', () => {
    expect([...exercitadas].sort()).toEqual(operacoesImplementadas());
  });
});
