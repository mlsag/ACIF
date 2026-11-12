// Auth (T06) contra o banco real: PrismaUsuarioRepository e login de ponta a ponta com o admin do seed.
// Roda contra TEST_DATABASE_URL (banco *_test). Não depende da ordem dos arquivos: aplica as migrations
// e o seed (ambos idempotentes) e apaga os usuários que cria.

import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import argon2 from 'argon2';
import type { FastifyInstance } from 'fastify';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { executarSeed } from '../../prisma/seed.js';
import { EMAIL_ADMIN_PADRAO, SENHA_ADMIN_DEV } from '../../prisma/seed-dados.js';
import { buildApp } from '../../src/app.js';
import { RESPOSTA_NAO_AUTENTICADO } from '../../src/plugins/autenticacao.js';
import { criarPrismaClient, type PrismaClient } from '../../src/repositories/prisma.js';
import { PrismaUsuarioRepository } from '../../src/repositories/usuario-repository.js';
import { AuthService } from '../../src/services/auth-service.js';

const execFileAsync = promisify(execFile);
const DIR_BACKEND = fileURLToPath(new URL('../..', import.meta.url));
const URL_TESTE = process.env.TEST_DATABASE_URL;
const TIMEOUT = 120_000;
const EMAIL_PENDENTE = 't06.pendente@example.com';
const SENHA_PENDENTE = 'senha-sintetica-pendente';

if (!URL_TESTE && process.env.CI) {
  throw new Error('TEST_DATABASE_URL é obrigatória no CI');
}
if (URL_TESTE && !new URL(URL_TESTE).pathname.endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL precisa apontar para um banco cujo nome termine em _test');
}

describe.skipIf(!URL_TESTE)('auth com banco real', () => {
  let prisma: PrismaClient;
  let repo: PrismaUsuarioRepository;
  let app: FastifyInstance;

  beforeAll(async () => {
    await execFileAsync('npx', ['prisma', 'migrate', 'deploy'], {
      cwd: DIR_BACKEND,
      env: { ...process.env, DATABASE_URL: URL_TESTE },
    });
    prisma = criarPrismaClient(URL_TESTE);
    await executarSeed(prisma, { env: {}, log: () => {} });
    await prisma.usuario.deleteMany({ where: { email: EMAIL_PENDENTE } });
    await prisma.usuario.create({
      data: {
        nome: 'Docente Pendente T06',
        email: EMAIL_PENDENTE,
        senha: await argon2.hash(SENHA_PENDENTE, { type: argon2.argon2id }),
        papel: 'docente',
      },
    });

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
    });
    await app.ready();
  }, TIMEOUT);

  afterAll(async () => {
    await app?.close();
    await prisma?.usuario.deleteMany({ where: { email: EMAIL_PENDENTE } });
    await prisma?.$disconnect();
  });

  it('buscarPorEmail traz o hash; buscarPorId não traz a senha', async () => {
    const admin = await repo.buscarPorEmail(EMAIL_ADMIN_PADRAO);
    expect(admin).toMatchObject({ papel: 'admin', status_aprovacao: 'aprovado', ativo: true });
    expect(admin?.senha).toMatch(/^\$argon2id\$/);

    const sessao = await repo.buscarPorId(admin!.id);
    expect(sessao).not.toHaveProperty('senha');
    expect(sessao).toMatchObject({ id: admin!.id, email: EMAIL_ADMIN_PADRAO });
  });

  it('e-mail ou id inexistente: null', async () => {
    expect(await repo.buscarPorEmail('ninguem@example.com')).toBeNull();
    expect(await repo.buscarPorId(999_999)).toBeNull();
  });

  it(
    'critério 1 e 2 de ponta a ponta: admin do seed loga e acessa /auth/me; logout encerra',
    async () => {
      const agente = request.agent(app.server);
      const entrada = await agente
        .post('/auth/login')
        .send({ email: EMAIL_ADMIN_PADRAO, senha: SENHA_ADMIN_DEV });
      expect(entrada.status).toBe(200);
      expect(entrada.body).toMatchObject({ papel: 'admin' });

      const sessao = await agente.get('/auth/me');
      expect(sessao.status).toBe(200);
      expect(sessao.body).toMatchObject({ email: EMAIL_ADMIN_PADRAO, papel: 'admin' });

      expect((await agente.post('/auth/logout')).status).toBe(204);
      const depois = await agente.get('/auth/me');
      expect(depois.status).toBe(401);
      expect(depois.body).toEqual(RESPOSTA_NAO_AUTENTICADO);
    },
    TIMEOUT,
  );

  it('critério 1: docente pendente no banco, com a senha certa, recebe o 401 genérico', async () => {
    const resposta = await request(app.server)
      .post('/auth/login')
      .send({ email: EMAIL_PENDENTE, senha: SENHA_PENDENTE });
    expect(resposta.status).toBe(401);
    expect(resposta.body).toEqual(RESPOSTA_NAO_AUTENTICADO);
  });

  it('critério 1: senha errada do admin do seed recebe o 401 genérico', async () => {
    const resposta = await request(app.server)
      .post('/auth/login')
      .send({ email: EMAIL_ADMIN_PADRAO, senha: 'senha-errada-qualquer' });
    expect(resposta.status).toBe(401);
    expect(resposta.body).toEqual(RESPOSTA_NAO_AUTENTICADO);
  });
});
