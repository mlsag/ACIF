// Testes com banco real. Rodam contra TEST_DATABASE_URL, que precisa apontar para um banco *_test,
// porque o teste apaga o schema public e aplica as migrations do zero.
// Sem TEST_DATABASE_URL, os testes são pulados localmente e falham no CI.

import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import argon2 from 'argon2';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { executarSeed } from '../../prisma/seed.js';
import { SENHA_ADMIN_DEV } from '../../prisma/seed-dados.js';
import { criarPrismaClient, type PrismaClient } from '../../src/repositories/prisma.js';

const execFileAsync = promisify(execFile);
const DIR_BACKEND = fileURLToPath(new URL('../..', import.meta.url));
const URL_TESTE = process.env.TEST_DATABASE_URL;
const TIMEOUT = 120_000;

if (!URL_TESTE && process.env.CI) {
  throw new Error('TEST_DATABASE_URL é obrigatória no CI');
}
if (URL_TESTE && !new URL(URL_TESTE).pathname.endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL precisa apontar para um banco cujo nome termine em _test');
}
if (!URL_TESTE) {
  console.warn('TEST_DATABASE_URL ausente: testes com banco pulados');
}

function prismaCli(...args: string[]) {
  return execFileAsync('npx', ['prisma', ...args], {
    cwd: DIR_BACKEND,
    env: { ...process.env, DATABASE_URL: URL_TESTE },
  });
}

describe.skipIf(!URL_TESTE)('banco de teste', () => {
  let prisma: PrismaClient;
  const linhasLog: string[] = [];

  beforeAll(async () => {
    prisma = criarPrismaClient(URL_TESTE);
    // Banco limpo: sem tabelas e sem histórico de migrations.
    await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS public CASCADE');
    await prisma.$executeRawUnsafe('CREATE SCHEMA public');
  }, TIMEOUT);

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  describe('critério 1: a migration roda do zero', () => {
    it(
      'prisma migrate deploy aplica a migration inicial num banco vazio',
      async () => {
        const deploy = await prismaCli('migrate', 'deploy');
        expect(deploy.stdout).toMatch(
          /successfully applied|All migrations have been successfully applied/,
        );

        const status = await prismaCli('migrate', 'status');
        expect(status.stdout).toMatch(/Database schema is up to date/);
      },
      TIMEOUT,
    );

    it('cria as 6 tabelas do ER', async () => {
      const tabelas = await prisma.$queryRaw<{ table_name: string }[]>`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'
        ORDER BY table_name`;
      expect(tabelas.map((t) => t.table_name)).toEqual([
        'alunos',
        'canais',
        'comunicado_versoes',
        'comunicados',
        'envios',
        'usuarios',
      ]);
    });

    it('cria as chaves únicas do ER', async () => {
      const indices = await prisma.$queryRaw<{ indexdef: string }[]>`
        SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexdef LIKE 'CREATE UNIQUE%'`;
      const defs = indices.map((i) => i.indexdef).join('\n');
      expect(defs).toContain('ON public.usuarios USING btree (email)');
      expect(defs).toContain('ON public.alunos USING btree (ra)');
      expect(defs).toContain('ON public.alunos USING btree (email)');
      expect(defs).toContain('ON public.canais USING btree (nome)');
      expect(defs).toContain('ON public.comunicado_versoes USING btree (id_comunicado, id_canal)');
      expect(defs).toContain('ON public.envios USING btree (id_comunicado, id_aluno, id_canal)');
    });

    it('usa timestamptz nas datas e jsonb em comunicados', async () => {
      const colunas = await prisma.$queryRaw<
        { table_name: string; column_name: string; data_type: string }[]
      >`
        SELECT table_name, column_name, data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'`;
      const datas = colunas.filter((c) => /^data_|_em$|^proxima_tentativa$/.test(c.column_name));
      expect(datas.length).toBeGreaterThan(0);
      for (const c of datas) expect(c.data_type).toBe('timestamp with time zone');
      for (const nome of ['variaveis', 'filtro_destinatarios', 'canais']) {
        expect(
          colunas.find((c) => c.table_name === 'comunicados' && c.column_name === nome)?.data_type,
        ).toBe('jsonb');
      }
    });
  });

  describe('critério 2: o seed cria 1 admin, cerca de 20 alunos e 2 canais', () => {
    it(
      'cria as contagens esperadas',
      async () => {
        const contagens = await executarSeed(prisma, { env: {}, log: (l) => linhasLog.push(l) });
        expect(contagens).toEqual({ admins: 1, alunos: 20, canais: 2 });

        const canais = await prisma.canal.findMany({ orderBy: { nome: 'asc' } });
        expect(canais.map((c) => [c.nome, c.ativo])).toEqual([
          ['email', true],
          ['whatsapp', true],
        ]);
      },
      TIMEOUT,
    );

    it('o admin está aprovado e ativo, com a senha em hash argon2id', async () => {
      const admin = await prisma.usuario.findFirstOrThrow({ where: { papel: 'admin' } });
      expect(admin.status_aprovacao).toBe('aprovado');
      expect(admin.ativo).toBe(true);
      expect(admin.senha).toMatch(/^\$argon2id\$/);
      expect(admin.senha).not.toContain(SENHA_ADMIN_DEV);
      expect(await argon2.verify(admin.senha, SENHA_ADMIN_DEV)).toBe(true);
    });

    it(
      'rodar o seed de novo não duplica nada nem troca a senha do admin',
      async () => {
        const antes = await prisma.usuario.findFirstOrThrow({ where: { papel: 'admin' } });
        const contagens = await executarSeed(prisma, {
          env: { SEED_ADMIN_SENHA: 'senha-diferente-local' },
          log: (l) => linhasLog.push(l),
        });
        expect(contagens).toEqual({ admins: 1, alunos: 20, canais: 2 });
        const depois = await prisma.usuario.findFirstOrThrow({ where: { papel: 'admin' } });
        expect(depois.senha).toBe(antes.senha);
      },
      TIMEOUT,
    );
  });

  describe('critério 3: o seed usa apenas dados sintéticos', () => {
    it('todos os alunos no banco são sintéticos, com consentimento registrado', async () => {
      const alunos = await prisma.aluno.findMany();
      expect(alunos).toHaveLength(20);
      for (const aluno of alunos) {
        expect(aluno.email).toMatch(/@example\.com$/);
        expect(aluno.nome).toMatch(/^Aluno Sintético \d{2}$/);
        expect(aluno.ra).toMatch(/^SINT\d{4}$/);
        expect(aluno.telefone).toBeNull();
        expect(aluno.consentimento_lgpd_em).toBeInstanceOf(Date);
      }
      const usuarios = await prisma.usuario.findMany();
      for (const u of usuarios) expect(u.email).toMatch(/@example\.com$/);
    });

    it('o log do seed traz só contagens, sem nomes, e-mails ou senha', () => {
      expect(linhasLog.length).toBeGreaterThan(0);
      for (const linha of linhasLog) {
        expect(JSON.parse(linha)).toEqual({
          evento: 'seed_concluido',
          admins: 1,
          alunos: 20,
          canais: 2,
        });
        expect(linha).not.toMatch(/@|Sintético|SINT|senha/i);
      }
    });
  });

  describe('restrições usadas pelas próximas tasks', () => {
    it('a chave única de envios impede envio duplicado (idempotência do disparo)', async () => {
      const admin = await prisma.usuario.findFirstOrThrow({ where: { papel: 'admin' } });
      const aluno = await prisma.aluno.findFirstOrThrow();
      const canal = await prisma.canal.findUniqueOrThrow({ where: { nome: 'email' } });
      const comunicado = await prisma.comunicado.create({ data: { id_usuario: admin.id } });
      expect(comunicado.status).toBe('rascunho');
      expect(comunicado.titulo).toBeNull();
      expect(comunicado.canais).toEqual([]);

      const envio = { id_comunicado: comunicado.id, id_aluno: aluno.id, id_canal: canal.id };
      await prisma.envio.create({ data: envio });
      await expect(prisma.envio.create({ data: envio })).rejects.toMatchObject({ code: 'P2002' });
    });

    it('a chave única de canais.nome impede canal duplicado', async () => {
      await expect(prisma.canal.create({ data: { nome: 'email' } })).rejects.toMatchObject({
        code: 'P2002',
      });
    });

    it('ON DELETE Restrict: não apaga aluno que tem envios', async () => {
      const envio = await prisma.envio.findFirstOrThrow();
      await expect(prisma.aluno.delete({ where: { id: envio.id_aluno } })).rejects.toThrow();
    });
  });
});
