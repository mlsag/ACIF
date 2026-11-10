// Comunicados (T12) contra o banco real: PrismaComunicadoRepository, PrismaCanalRepository e a API
// de ponta a ponta. Roda contra TEST_DATABASE_URL (banco *_test). Aplica migrations e seed (idempotentes)
// e apaga os usuários sintéticos e os comunicados que cria.

import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import argon2 from 'argon2';
import type { FastifyInstance } from 'fastify';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { executarSeed } from '../../prisma/seed.js';
import { buildApp } from '../../src/app.js';
import { STATUS_EDITAVEIS } from '../../src/dominio/comunicado.js';
import { Prisma } from '../../src/generated/prisma/client.js';
import { PrismaCanalRepository } from '../../src/repositories/canal-repository.js';
import { PrismaComunicadoRepository } from '../../src/repositories/comunicado-repository.js';
import { criarPrismaClient, type PrismaClient } from '../../src/repositories/prisma.js';
import { PrismaUsuarioRepository } from '../../src/repositories/usuario-repository.js';
import { AuthService } from '../../src/services/auth-service.js';
import { ComunicadoService } from '../../src/services/comunicado-service.js';

const execFileAsync = promisify(execFile);
const DIR_BACKEND = fileURLToPath(new URL('../..', import.meta.url));
const URL_TESTE = process.env.TEST_DATABASE_URL;
const TIMEOUT = 120_000;
const SENHA = 'senha-sintetica-t12';
const EMAILS = ['t12.docente.a@example.com', 't12.docente.b@example.com'];

if (!URL_TESTE && process.env.CI) {
  throw new Error('TEST_DATABASE_URL é obrigatória no CI');
}
if (URL_TESTE && !new URL(URL_TESTE).pathname.endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL precisa apontar para um banco cujo nome termine em _test');
}

describe.skipIf(!URL_TESTE)('comunicados com banco real', () => {
  let prisma: PrismaClient;
  let repo: PrismaComunicadoRepository;
  let app: FastifyInstance;
  let idA: number;
  let idB: number;

  async function limpar() {
    const usuarios = await prisma.usuario.findMany({
      where: { email: { in: EMAILS } },
      select: { id: true },
    });
    const ids = usuarios.map((u) => u.id);
    await prisma.comunicadoVersao.deleteMany({
      where: { comunicado: { id_usuario: { in: ids } } },
    });
    await prisma.comunicado.deleteMany({ where: { id_usuario: { in: ids } } });
    await prisma.usuario.deleteMany({ where: { id: { in: ids } } });
  }

  beforeAll(async () => {
    await execFileAsync('npx', ['prisma', 'migrate', 'deploy'], {
      cwd: DIR_BACKEND,
      env: { ...process.env, DATABASE_URL: URL_TESTE },
    });
    prisma = criarPrismaClient(URL_TESTE);
    await executarSeed(prisma, { env: {}, log: () => {} });
    await limpar();

    const senha = await argon2.hash(SENHA, { type: argon2.argon2id });
    const criar = (email: string, nome: string) =>
      prisma.usuario.create({
        data: { nome, email, senha, papel: 'docente', status_aprovacao: 'aprovado' },
        select: { id: true },
      });
    idA = (await criar(EMAILS[0]!, 'Docente Sintético A')).id;
    idB = (await criar(EMAILS[1]!, 'Docente Sintético B')).id;

    repo = new PrismaComunicadoRepository(prisma);
    const authService = new AuthService(new PrismaUsuarioRepository(prisma));
    app = buildApp({
      auth: {
        config: {
          jwtSecret: 'segredo-de-teste-com-mais-de-32-caracteres',
          sessaoHoras: 8,
          cookieSecure: false,
          loginRateLimitMax: 1000,
          usandoSegredoDev: false,
        },
        authService,
      },
      comunicados: {
        comunicadoService: new ComunicadoService(repo, new PrismaCanalRepository(prisma)),
      },
    });
    await app.ready();
  }, TIMEOUT);

  afterAll(async () => {
    await app?.close();
    if (prisma) {
      await prisma.canal.updateMany({ data: { ativo: true } });
      await limpar();
      await prisma.$disconnect();
    }
  });

  it('jsonb faz ida e volta; null em filtro e variáveis vira SQL NULL', async () => {
    const completo = await repo.criar(idA, {
      titulo: 'Rascunho sintético',
      canais: ['email', 'whatsapp'],
      filtro_destinatarios: { curso: ['Gestão Empresarial'], termo: ['4'] },
      variaveis: { prazo: '20/11/2026' },
    });
    expect(completo).toMatchObject({
      status: 'rascunho',
      canais: ['email', 'whatsapp'],
      filtro_destinatarios: { curso: ['Gestão Empresarial'], termo: ['4'] },
      variaveis: { prazo: '20/11/2026' },
    });

    const vazio = await repo.criar(idA, {
      canais: [],
      filtro_destinatarios: null,
      variaveis: null,
    });
    expect(vazio).toMatchObject({ canais: [], filtro_destinatarios: null, variaveis: null });
    const nulos = await prisma.comunicado.count({
      where: {
        id: vazio.id,
        filtro_destinatarios: { equals: Prisma.DbNull },
        variaveis: { equals: Prisma.DbNull },
      },
    });
    expect(nulos).toBe(1);

    expect(await repo.atualizar(idA, completo.id, STATUS_EDITAVEIS, { variaveis: null })).toBe(
      true,
    );
    expect((await repo.buscar(idA, completo.id))?.variaveis).toBeNull();
  });

  it('critério 2: buscar, atualizar e excluir filtram pelo dono na consulta', async () => {
    const deA = await repo.criar(idA, { titulo: 'De A' });

    expect(await repo.buscar(idB, deA.id)).toBeNull();
    expect(await repo.atualizar(idB, deA.id, STATUS_EDITAVEIS, { titulo: 'Invasão' })).toBe(false);
    expect(await repo.excluir(idB, deA.id, STATUS_EDITAVEIS)).toBe(false);

    expect((await repo.buscar(idA, deA.id))?.titulo).toBe('De A');
    const listaB = await repo.listar(idB, 0, 50);
    expect(listaB.itens.some((c) => c.id === deA.id)).toBe(false);
  });

  it('lista do mais recente para o mais antigo, com total e paginação', async () => {
    const antes = await repo.listar(idB, 0, 50);
    const c1 = await repo.criar(idB, { titulo: 'B1' });
    const c2 = await repo.criar(idB, { titulo: 'B2' });
    const c3 = await repo.criar(idB, { titulo: 'B3' });

    const pagina = await repo.listar(idB, 0, 2);
    expect(pagina.total).toBe(antes.total + 3);
    expect(pagina.itens.map((c) => c.id)).toEqual([c3.id, c2.id]);
    expect((await repo.listar(idB, 2, 1)).itens.map((c) => c.id)).toEqual([c1.id]);
  });

  it('fora de rascunho, atualizar e excluir não fazem nada (nem apagam as versões)', async () => {
    const c = await repo.criar(idA, { titulo: 'Disparado' });
    const email = await prisma.canal.findUniqueOrThrow({ where: { nome: 'email' } });
    await prisma.comunicadoVersao.create({
      data: {
        id_comunicado: c.id,
        id_canal: email.id,
        corpo_template: 'Versão sintética',
        origem: 'manual',
      },
    });
    await prisma.comunicado.update({ where: { id: c.id }, data: { status: 'enviando' } });

    expect(await repo.atualizar(idA, c.id, STATUS_EDITAVEIS, { titulo: 'x' })).toBe(false);
    expect(await repo.excluir(idA, c.id, STATUS_EDITAVEIS)).toBe(false);
    expect((await repo.buscar(idA, c.id))?.titulo).toBe('Disparado');
    expect(await prisma.comunicadoVersao.count({ where: { id_comunicado: c.id } })).toBe(1);
  });

  it('excluir rascunho apaga também as versões (FK RESTRICT)', async () => {
    const c = await repo.criar(idA, { titulo: 'Com versão' });
    const email = await prisma.canal.findUniqueOrThrow({ where: { nome: 'email' } });
    await prisma.comunicadoVersao.create({
      data: {
        id_comunicado: c.id,
        id_canal: email.id,
        corpo_template: 'Versão sintética',
        origem: 'ia',
      },
    });

    expect(await repo.excluir(idA, c.id, STATUS_EDITAVEIS)).toBe(true);
    expect(await prisma.comunicado.count({ where: { id: c.id } })).toBe(0);
    expect(await prisma.comunicadoVersao.count({ where: { id_comunicado: c.id } })).toBe(0);
  });

  it('PrismaCanalRepository devolve só canais existentes e ativos', async () => {
    const canais = new PrismaCanalRepository(prisma);
    expect((await canais.buscarAtivosPorNome(['email', 'whatsapp', 'sms'])).sort()).toEqual([
      'email',
      'whatsapp',
    ]);
    await prisma.canal.update({ where: { nome: 'whatsapp' }, data: { ativo: false } });
    try {
      expect(await canais.buscarAtivosPorNome(['email', 'whatsapp'])).toEqual(['email']);
    } finally {
      await prisma.canal.update({ where: { nome: 'whatsapp' }, data: { ativo: true } });
    }
  });

  it(
    'ponta a ponta: CRUD pela API, isolamento entre docentes e canal inativo',
    async () => {
      const a = request.agent(app.server);
      const b = request.agent(app.server);
      expect((await a.post('/auth/login').send({ email: EMAILS[0], senha: SENHA })).status).toBe(
        200,
      );
      expect((await b.post('/auth/login').send({ email: EMAILS[1], senha: SENHA })).status).toBe(
        200,
      );

      const criado = await a.post('/comunicados').send({
        titulo: 'Entrega do projeto',
        canais: ['email'],
        filtro_destinatarios: { ids_alunos: [1, 2] },
        variaveis: { prazo: '20/11/2026' },
      });
      expect(criado.status).toBe(201);
      const id = criado.body.id;

      expect(
        (await a.get('/comunicados')).body.itens.some((c: { id: number }) => c.id === id),
      ).toBe(true);
      expect(
        (await b.get('/comunicados')).body.itens.some((c: { id: number }) => c.id === id),
      ).toBe(false);
      expect((await b.get(`/comunicados/${id}`)).status).toBe(404);
      expect((await b.patch(`/comunicados/${id}`).send({ titulo: 'x' })).status).toBe(404);
      expect((await b.delete(`/comunicados/${id}`)).status).toBe(404);

      await prisma.canal.update({ where: { nome: 'whatsapp' }, data: { ativo: false } });
      try {
        const inativo = await a.patch(`/comunicados/${id}`).send({ canais: ['whatsapp'] });
        expect(inativo.status).toBe(422);
      } finally {
        await prisma.canal.update({ where: { nome: 'whatsapp' }, data: { ativo: true } });
      }

      const alterado = await a.patch(`/comunicados/${id}`).send({ titulo: 'Entrega adiada' });
      expect(alterado.status).toBe(200);
      expect(alterado.body).toMatchObject({ titulo: 'Entrega adiada', canais: ['email'] });

      await prisma.comunicado.update({ where: { id }, data: { status: 'concluido' } });
      expect((await a.patch(`/comunicados/${id}`).send({ titulo: 'x' })).status).toBe(409);
      expect((await a.delete(`/comunicados/${id}`)).status).toBe(409);
      await prisma.comunicado.update({ where: { id }, data: { status: 'rascunho' } });

      expect((await a.delete(`/comunicados/${id}`)).status).toBe(204);
      expect((await a.get(`/comunicados/${id}`)).status).toBe(404);
    },
    TIMEOUT,
  );
});
