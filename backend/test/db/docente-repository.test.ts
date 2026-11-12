// Docentes (T07) contra o banco real: PrismaUsuarioRepository (cadastro, listagem e decisões) e o
// fluxo de ponta a ponta da API. Roda contra TEST_DATABASE_URL (banco *_test). Aplica migrations e
// seed (idempotentes) e apaga os usuários sintéticos que cria.

import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import argon2 from 'argon2';
import type { FastifyInstance } from 'fastify';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { executarSeed } from '../../prisma/seed.js';
import { EMAIL_ADMIN_PADRAO, SENHA_ADMIN_DEV } from '../../prisma/seed-dados.js';
import { buildApp } from '../../src/app.js';
import { RESPOSTA_NAO_AUTENTICADO } from '../../src/plugins/autenticacao.js';
import { criarPrismaClient, type PrismaClient } from '../../src/repositories/prisma.js';
import { PrismaUsuarioRepository } from '../../src/repositories/usuario-repository.js';
import { AuthService } from '../../src/services/auth-service.js';
import { DocenteService, TRANSICOES } from '../../src/services/docente-service.js';

const execFileAsync = promisify(execFile);
const DIR_BACKEND = fileURLToPath(new URL('../..', import.meta.url));
const URL_TESTE = process.env.TEST_DATABASE_URL;
const TIMEOUT = 120_000;
const SENHA = 'senha-sintetica-t07';
const PREFIXO = 't07.db.';
const email = (nome: string) => `${PREFIXO}${nome}@example.com`;

if (!URL_TESTE && process.env.CI) {
  throw new Error('TEST_DATABASE_URL é obrigatória no CI');
}
if (URL_TESTE && !new URL(URL_TESTE).pathname.endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL precisa apontar para um banco cujo nome termine em _test');
}

describe.skipIf(!URL_TESTE)('docentes com banco real', () => {
  let prisma: PrismaClient;
  let repo: PrismaUsuarioRepository;
  let app: FastifyInstance;
  let idAdmin: number;
  let hash: string;

  const limpar = () => prisma.usuario.deleteMany({ where: { email: { startsWith: PREFIXO } } });

  async function criarPendente(nome: string): Promise<number> {
    expect(
      await repo.criarDocente({ nome: `Docente ${nome}`, email: email(nome), senhaHash: hash }),
    ).toBe('criado');
    return (await prisma.usuario.findUniqueOrThrow({ where: { email: email(nome) } })).id;
  }

  beforeAll(async () => {
    await execFileAsync('npx', ['prisma', 'migrate', 'deploy'], {
      cwd: DIR_BACKEND,
      env: { ...process.env, DATABASE_URL: URL_TESTE },
    });
    prisma = criarPrismaClient(URL_TESTE);
    await executarSeed(prisma, { env: {}, log: () => {} });
    await limpar();
    idAdmin = (await prisma.usuario.findUniqueOrThrow({ where: { email: EMAIL_ADMIN_PADRAO } })).id;
    hash = await argon2.hash(SENHA, { type: argon2.argon2id });

    repo = new PrismaUsuarioRepository(prisma);
    const authService = new AuthService(repo);
    await authService.aquecer();
    app = buildApp({
      auth: {
        config: {
          jwtSecret: 'segredo-de-teste-com-mais-de-32-caracteres',
          sessaoHoras: 8,
          cookieSecure: false,
          loginRateLimitMax: 1000,
          cadastroRateLimitMax: 1000,
          usandoSegredoDev: false,
        },
        authService,
      },
      docentes: { docenteService: new DocenteService(repo) },
    });
    await app.ready();
  }, TIMEOUT);

  beforeEach(async () => {
    await limpar();
  });

  afterAll(async () => {
    await app?.close();
    if (prisma) await limpar();
    await prisma?.$disconnect();
  });

  it('criarDocente grava docente pendente, ativo, sem aprovado_por e com data_cadastro', async () => {
    const id = await criarPendente('novo');
    const gravado = await prisma.usuario.findUniqueOrThrow({ where: { id } });
    expect(gravado).toMatchObject({
      papel: 'docente',
      status_aprovacao: 'pendente',
      ativo: true,
      aprovado_por: null,
      senha: hash,
    });
    expect(gravado.data_cadastro).toBeInstanceOf(Date);
  });

  it('e-mail duplicado (inclusive de admin) devolve duplicado, sem nova linha nem alteração', async () => {
    await criarPendente('dup');
    const antes = await prisma.usuario.count();
    expect(await repo.criarDocente({ nome: 'Outro', email: email('dup'), senhaHash: 'x' })).toBe(
      'duplicado',
    );
    expect(
      await repo.criarDocente({ nome: 'Outro', email: EMAIL_ADMIN_PADRAO, senhaHash: 'x' }),
    ).toBe('duplicado');
    expect(await prisma.usuario.count()).toBe(antes);
    expect(
      await prisma.usuario.findUniqueOrThrow({ where: { email: email('dup') } }),
    ).toMatchObject({ nome: 'Docente dup', senha: hash });
  });

  it('cadastros simultâneos com o mesmo e-mail: um criado, um duplicado, uma linha', async () => {
    const dados = { nome: 'Corrida', email: email('corrida'), senhaHash: hash };
    const resultados = await Promise.all([repo.criarDocente(dados), repo.criarDocente(dados)]);
    expect(resultados.sort()).toEqual(['criado', 'duplicado']);
    expect(await prisma.usuario.count({ where: { email: email('corrida') } })).toBe(1);
  });

  it('listarDocentes filtra por status, só traz docentes, sem senha, em ordem desc', async () => {
    const a = await criarPendente('lista.a');
    const b = await criarPendente('lista.b');
    await repo.alterarStatusDocente(a, 'aprovado', TRANSICOES.aprovado, idAdmin);

    const pendentes = await repo.listarDocentes('pendente', 0, 50);
    const ids = pendentes.itens.map((d) => d.id);
    expect(ids).toContain(b);
    expect(ids).not.toContain(a);
    expect(ids).not.toContain(idAdmin);
    expect(pendentes.itens.every((d) => d.status_aprovacao === 'pendente')).toBe(true);
    expect(pendentes.itens[0]).not.toHaveProperty('senha');

    const todos = await repo.listarDocentes(undefined, 0, 50);
    const nossos = todos.itens.filter((d) => d.email.startsWith(PREFIXO)).map((d) => d.id);
    expect(nossos).toEqual([b, a]);
    expect(todos.total).toBeGreaterThanOrEqual(2);

    const pagina = await repo.listarDocentes(undefined, 1, 1);
    expect(pagina.itens).toHaveLength(1);
    expect(pagina.total).toBe(todos.total);
  });

  it('buscarDocente não encontra admin', async () => {
    expect(await repo.buscarDocente(idAdmin)).toBeNull();
    expect(await repo.buscarDocente(999_999)).toBeNull();
  });

  it('alterarStatusDocente respeita as origens e grava aprovado_por (FK para o admin)', async () => {
    const id = await criarPendente('trans');
    expect(await repo.alterarStatusDocente(id, 'aprovado', TRANSICOES.aprovado, idAdmin)).toBe(
      true,
    );
    // Já aprovado: aprovado não está nas origens de "aprovado".
    expect(await repo.alterarStatusDocente(id, 'aprovado', TRANSICOES.aprovado, idAdmin)).toBe(
      false,
    );
    expect(await repo.alterarStatusDocente(id, 'bloqueado', TRANSICOES.bloqueado, idAdmin)).toBe(
      true,
    );
    expect(await prisma.usuario.findUniqueOrThrow({ where: { id } })).toMatchObject({
      status_aprovacao: 'bloqueado',
      aprovado_por: idAdmin,
    });
    // aprovado_por precisa ser um usuário existente.
    await expect(
      repo.alterarStatusDocente(id, 'aprovado', TRANSICOES.aprovado, 999_999),
    ).rejects.toThrow();
  });

  it('alterarStatusDocente nunca altera um admin', async () => {
    expect(await repo.alterarStatusDocente(idAdmin, 'bloqueado', ['aprovado'], idAdmin)).toBe(
      false,
    );
    expect(await prisma.usuario.findUniqueOrThrow({ where: { id: idAdmin } })).toMatchObject({
      status_aprovacao: 'aprovado',
    });
  });

  it('aprovar e bloquear em paralelo terminam num estado válido e coerente', async () => {
    const id = await criarPendente('paralelo');
    const service = new DocenteService(repo);
    const [aprov, bloq] = await Promise.all([
      service.aprovar(id, idAdmin),
      service.bloquear(id, idAdmin),
    ]);
    const final = await prisma.usuario.findUniqueOrThrow({ where: { id } });
    expect(['aprovado', 'bloqueado']).toContain(final.status_aprovacao);
    expect(final.aprovado_por).toBe(idAdmin);
    // Nenhuma das duas respostas é erro interno: ou ok, ou conflito explícito.
    for (const r of [aprov, bloq]) {
      expect(r.ok || r.erro === 'conflito').toBe(true);
    }
  });

  it(
    'critérios 1 e 2 de ponta a ponta: cadastro → 401 → admin aprova → login → bloqueio derruba a sessão → reativa',
    async () => {
      const api = () => request(app.server);
      const emailNovo = email('e2e');

      const cadastro = await api()
        .post('/docentes/cadastro')
        .send({ nome: 'Docente E2E Sintético', email: emailNovo, senha: SENHA });
      expect(cadastro.status).toBe(202);

      const pendente = await api().post('/auth/login').send({ email: emailNovo, senha: SENHA });
      expect(pendente.status).toBe(401);
      expect(pendente.body).toEqual(RESPOSTA_NAO_AUTENTICADO);

      const admin = request.agent(app.server);
      expect(
        (
          await admin
            .post('/auth/login')
            .send({ email: EMAIL_ADMIN_PADRAO, senha: SENHA_ADMIN_DEV })
        ).status,
      ).toBe(200);
      const lista = await admin.get('/docentes?status=pendente&por_pagina=50');
      expect(lista.status).toBe(200);
      const id = lista.body.itens.find((d: { email: string }) => d.email === emailNovo).id;

      expect((await admin.post(`/docentes/${id}/aprovar`)).status).toBe(200);
      const docente = request.agent(app.server);
      expect(
        (await docente.post('/auth/login').send({ email: emailNovo, senha: SENHA })).status,
      ).toBe(200);
      expect((await docente.get('/auth/me')).status).toBe(200);

      expect((await admin.post(`/docentes/${id}/bloquear`)).status).toBe(200);
      expect((await docente.get('/auth/me')).status).toBe(401);
      expect(await prisma.usuario.findUniqueOrThrow({ where: { id } })).toMatchObject({
        status_aprovacao: 'bloqueado',
        aprovado_por: idAdmin,
      });

      expect((await admin.post(`/docentes/${id}/aprovar`)).status).toBe(200);
      expect((await docente.get('/auth/me')).status).toBe(200);

      // O admin segue ativo e não pode ser alvo das decisões.
      expect((await admin.post(`/docentes/${idAdmin}/bloquear`)).status).toBe(404);
      expect((await admin.get('/auth/me')).status).toBe(200);
    },
    TIMEOUT,
  );
});
