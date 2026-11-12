// Testes de auth (T06) sem banco: repositório em memória e argon2 real.
// O teste com o banco real e o admin do seed fica em test/db/usuario-repository.test.ts.

import { createHmac } from 'node:crypto';
import argon2 from 'argon2';
import type { FastifyInstance } from 'fastify';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import { lerConfigAuth, type ConfigAuth } from '../src/config.js';
import { RESPOSTA_NAO_AUTENTICADO } from '../src/plugins/autenticacao.js';
import type { UsuarioCredencial } from '../src/repositories/usuario-repository.js';
import { AuthService } from '../src/services/auth-service.js';
import { UsuarioRepositoryMemoria } from './apoio/usuario-repository-memoria.js';

const SEGREDO_TESTE = 'segredo-de-teste-com-mais-de-32-caracteres';
const SENHA = 'senha-sintetica-de-teste';
const TIMEOUT = 30_000;

const configBase: ConfigAuth = {
  jwtSecret: SEGREDO_TESTE,
  sessaoHoras: 8,
  cookieSecure: false,
  loginRateLimitMax: 1000,
  cadastroRateLimitMax: 1000,
  usandoSegredoDev: false,
};

// Usuários sintéticos (example.com). ids: 1 aprovado, 2 pendente, 3 bloqueado, 4 inativo.
const USUARIOS: Omit<UsuarioCredencial, 'senha'>[] = [
  {
    id: 1,
    nome: 'Docente Aprovado',
    email: 'aprovado@example.com',
    ativo: true,
    papel: 'docente',
    status_aprovacao: 'aprovado',
  },
  {
    id: 2,
    nome: 'Docente Pendente',
    email: 'pendente@example.com',
    ativo: true,
    papel: 'docente',
    status_aprovacao: 'pendente',
  },
  {
    id: 3,
    nome: 'Docente Bloqueado',
    email: 'bloqueado@example.com',
    ativo: true,
    papel: 'docente',
    status_aprovacao: 'bloqueado',
  },
  {
    id: 4,
    nome: 'Docente Inativo',
    email: 'inativo@example.com',
    ativo: false,
    papel: 'docente',
    status_aprovacao: 'aprovado',
  },
];

let hashSenha: string;

beforeAll(async () => {
  hashSenha = await argon2.hash(SENHA, { type: argon2.argon2id });
}, TIMEOUT);

function criarRepositorio(): UsuarioRepositoryMemoria {
  const repo = new UsuarioRepositoryMemoria();
  for (const u of USUARIOS) repo.adicionar({ ...u, senha: hashSenha });
  return repo;
}

interface Contexto {
  app: FastifyInstance;
  repo: UsuarioRepositoryMemoria;
  linhasLog: string[];
}

async function criarContexto(config: Partial<ConfigAuth> = {}): Promise<Contexto> {
  const repo = criarRepositorio();
  const authService = new AuthService(repo);
  await authService.aquecer();
  const linhasLog: string[] = [];
  const app = buildApp({
    logger: { level: 'info', stream: { write: (linha: string) => void linhasLog.push(linha) } },
    auth: { config: { ...configBase, ...config }, authService },
  });
  await app.ready();
  return { app, repo, linhasLog };
}

function login(app: FastifyInstance, corpo: unknown) {
  return request(app.server)
    .post('/auth/login')
    .send(corpo as object);
}

function cookieDe(resposta: request.Response): string {
  const cabecalho = resposta.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = cabecalho?.find((c) => c.startsWith('acif_sessao='));
  if (!cookie) throw new Error('resposta sem cookie de sessão');
  return cookie;
}

function tokenDe(resposta: request.Response): string {
  return cookieDe(resposta).split(';')[0]!.slice('acif_sessao='.length);
}

const b64url = (valor: object | string) =>
  Buffer.from(typeof valor === 'string' ? valor : JSON.stringify(valor)).toString('base64url');

/** Monta um JWT HS256 à mão (para simular token forjado com outro segredo ou alg none). */
function jwtManual(header: object, payload: object, segredo?: string): string {
  const base = `${b64url(header)}.${b64url(payload)}`;
  if (!segredo) return `${base}.`;
  return `${base}.${createHmac('sha256', segredo).update(base).digest('base64url')}`;
}

function me(app: FastifyInstance, token?: string) {
  const req = request(app.server).get('/auth/me');
  return token === undefined ? req : req.set('Cookie', `acif_sessao=${token}`);
}

describe('critério 1: credencial inválida dá 401 genérico', () => {
  let ctx: Contexto;

  beforeAll(async () => {
    ctx = await criarContexto();
  }, TIMEOUT);

  afterAll(async () => {
    await ctx.app.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('login válido responde 200 e define o cookie httpOnly, SameSite=Strict, com expiração e sem Secure local', async () => {
    const resposta = await login(ctx.app, { email: 'aprovado@example.com', senha: SENHA });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ id: 1, nome: 'Docente Aprovado', papel: 'docente' });
    const cookie = cookieDe(resposta);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Max-Age=28800/);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).not.toMatch(/Secure/);
  });

  it('o e-mail é normalizado (espaços e maiúsculas)', async () => {
    const resposta = await login(ctx.app, { email: '  APROVADO@Example.com ', senha: SENHA });
    expect(resposta.status).toBe(200);
  });

  it('o JWT leva só sub, papel, iat e exp (sem e-mail ou nome)', async () => {
    const resposta = await login(ctx.app, { email: 'aprovado@example.com', senha: SENHA });
    const [header, payload] = tokenDe(resposta)
      .split('.')
      .slice(0, 2)
      .map((parte) => JSON.parse(Buffer.from(parte, 'base64url').toString()));
    expect(header.alg).toBe('HS256');
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'papel', 'sub']);
    expect(payload).toMatchObject({ sub: '1', papel: 'docente' });
    expect(payload.exp - payload.iat).toBe(8 * 3600);
  });

  const falhas: [string, { email: string; senha: string }][] = [
    ['e-mail inexistente', { email: 'ninguem@example.com', senha: SENHA }],
    ['senha errada', { email: 'aprovado@example.com', senha: 'senha-errada-qualquer' }],
    ['docente pendente', { email: 'pendente@example.com', senha: SENHA }],
    ['docente bloqueado', { email: 'bloqueado@example.com', senha: SENHA }],
    ['usuário inativo', { email: 'inativo@example.com', senha: SENHA }],
  ];

  it.each(falhas)('%s: 401 com o corpo genérico e sem cookie', async (_caso, corpo) => {
    const resposta = await login(ctx.app, corpo);

    expect(resposta.status).toBe(401);
    expect(resposta.body).toEqual(RESPOSTA_NAO_AUTENTICADO);
    expect(resposta.headers['set-cookie']).toBeUndefined();
  });

  it('todas as falhas de credencial têm resposta idêntica (status, corpo e content-type)', async () => {
    const respostas = await Promise.all(falhas.map(([, corpo]) => login(ctx.app, corpo)));
    const assinaturas = respostas.map((r) =>
      JSON.stringify([r.status, r.text, r.headers['content-type']]),
    );
    expect(new Set(assinaturas).size).toBe(1);
  });

  it.each(falhas)(
    '%s: roda exatamente um argon2.verify (tempo constante)',
    async (_caso, corpo) => {
      const verify = vi.spyOn(argon2, 'verify');
      await login(ctx.app, corpo);
      expect(verify).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    ['sem corpo', undefined],
    ['sem senha', { email: 'aprovado@example.com' }],
    ['senha vazia', { email: 'aprovado@example.com', senha: '' }],
    ['senha com mais de 128 caracteres', { email: 'aprovado@example.com', senha: 'x'.repeat(129) }],
    ['e-mail malformado', { email: 'nao-e-email', senha: SENHA }],
    [
      'e-mail com mais de 254 caracteres',
      { email: `${'a'.repeat(250)}@example.com`, senha: SENHA },
    ],
  ])('corpo malformado (%s) responde 400 sem detalhar o campo', async (_caso, corpo) => {
    const resposta = await login(ctx.app, corpo);
    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({
      erro: 'requisicao_invalida',
      mensagem: 'Requisição inválida.',
    });
  });

  it('JSON inválido responde 400 sem ecoar o corpo', async () => {
    const resposta = await request(ctx.app.server)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "aprovado@example.com", "senha": ');
    expect(resposta.status).toBe(400);
    expect(resposta.text).not.toContain('aprovado@example.com');
  });

  it('logs não contêm e-mail, senha, token nem query string', async () => {
    const ok = await login(ctx.app, { email: 'aprovado@example.com', senha: SENHA });
    const token = tokenDe(ok);
    await login(ctx.app, { email: 'ninguem@example.com', senha: 'senha-errada-qualquer' });
    await me(ctx.app, token);
    await request(ctx.app.server).get('/auth/me?email=aprovado@example.com&token=abc');

    const log = ctx.linhasLog.join('\n');
    expect(ctx.linhasLog.length).toBeGreaterThan(0);
    for (const proibido of [
      '@example.com',
      SENHA,
      'senha-errada-qualquer',
      token,
      'acif_sessao',
      'email=',
      'token=abc',
    ]) {
      expect(log).not.toContain(proibido);
    }
    expect(log).toContain('"url":"/auth/me"');
  });
});

describe('critério 1: rate limit no login', () => {
  let ctx: Contexto;

  beforeAll(async () => {
    ctx = await criarContexto({ loginRateLimitMax: 10 });
  }, TIMEOUT);

  afterAll(async () => {
    await ctx.app.close();
  });

  it(
    'a 11ª tentativa no mesmo minuto responde 429; outras rotas não são limitadas',
    async () => {
      for (let i = 0; i < 10; i += 1) {
        const r = await login(ctx.app, { email: 'ninguem@example.com', senha: SENHA });
        expect(r.status).toBe(401);
      }
      const bloqueada = await login(ctx.app, { email: 'aprovado@example.com', senha: SENHA });
      expect(bloqueada.status).toBe(429);
      expect(bloqueada.body).toEqual({
        erro: 'muitas_tentativas',
        mensagem: 'Muitas tentativas. Aguarde e tente de novo.',
      });

      const health = await request(ctx.app.server).get('/health');
      expect(health.status).toBe(200);
    },
    TIMEOUT,
  );
});

describe('critério 2: rota protegida bloqueia sem sessão', () => {
  let ctx: Contexto;
  let tokenValido: string;

  beforeAll(async () => {
    ctx = await criarContexto();
    tokenValido = tokenDe(await login(ctx.app, { email: 'aprovado@example.com', senha: SENHA }));
  }, TIMEOUT);

  afterAll(async () => {
    await ctx.app.close();
  });

  afterEach(() => {
    vi.useRealTimers();
    ctx.repo.atualizar(1, { ativo: true, status_aprovacao: 'aprovado' });
  });

  async function esperar401(resposta: request.Response | Promise<request.Response>) {
    const r = await resposta;
    expect(r.status).toBe(401);
    expect(r.body).toEqual(RESPOSTA_NAO_AUTENTICADO);
  }

  it('com sessão válida, GET /auth/me responde 200 com o usuário', async () => {
    const resposta = await me(ctx.app, tokenValido);
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({
      id: 1,
      nome: 'Docente Aprovado',
      email: 'aprovado@example.com',
      papel: 'docente',
    });
  });

  it('sem cookie: 401', async () => {
    await esperar401(me(ctx.app));
  });

  it('cookie vazio: 401', async () => {
    await esperar401(me(ctx.app, ''));
  });

  it('token adulterado (payload trocado, assinatura original): 401', async () => {
    const [header, , assinatura] = tokenValido.split('.');
    const payloadAdmin = b64url({ sub: '1', papel: 'admin', iat: 1, exp: 9_999_999_999 });
    await esperar401(me(ctx.app, `${header}.${payloadAdmin}.${assinatura}`));
  });

  it('token com a assinatura alterada: 401', async () => {
    // Altera o 1º caractere da assinatura, não o último: no HS256 (43 caracteres base64url), os
    // 2 bits mais baixos do último caractere são enchimento, e trocá-lo às vezes não muda os bytes.
    const [header, payload, assinatura] = tokenValido.split('.') as [string, string, string];
    const primeiro = assinatura[0] === 'A' ? 'B' : 'A';
    const alterado = `${header}.${payload}.${primeiro}${assinatura.slice(1)}`;
    expect(alterado).not.toBe(tokenValido);
    await esperar401(me(ctx.app, alterado));
  });

  it('token assinado com outro segredo: 401', async () => {
    const agora = Math.floor(Date.now() / 1000);
    const forjado = jwtManual(
      { alg: 'HS256', typ: 'JWT' },
      { sub: '1', papel: 'docente', iat: agora, exp: agora + 3600 },
      'outro-segredo-com-mais-de-32-caracteres!!',
    );
    await esperar401(me(ctx.app, forjado));
  });

  it('token com alg none: 401', async () => {
    const agora = Math.floor(Date.now() / 1000);
    const semAssinatura = jwtManual(
      { alg: 'none', typ: 'JWT' },
      { sub: '1', papel: 'docente', iat: agora, exp: agora + 3600 },
    );
    await esperar401(me(ctx.app, semAssinatura));
  });

  it('token expirado (depois de 8h): 401', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 8 * 3600 * 1000 + 1000);
    await esperar401(me(ctx.app, tokenValido));
  });

  it('token no cabeçalho Authorization, sem cookie: 401 (só cookie é aceito)', async () => {
    await esperar401(
      request(ctx.app.server).get('/auth/me').set('Authorization', `Bearer ${tokenValido}`),
    );
  });

  it('token de usuário que não existe mais: 401', async () => {
    const token = ctx.app.jwt.sign({ sub: '999', papel: 'docente' });
    await esperar401(me(ctx.app, token));
  });

  it('token com sub não numérico: 401', async () => {
    const token = ctx.app.jwt.sign({ sub: 'abc', papel: 'docente' });
    await esperar401(me(ctx.app, token));
  });

  it.each([
    ['bloqueado depois do login', { status_aprovacao: 'bloqueado' }],
    ['voltou a pendente depois do login', { status_aprovacao: 'pendente' }],
    ['inativado depois do login', { ativo: false }],
  ])('token válido de usuário %s: 401 na hora (checagem no banco)', async (_caso, mudanca) => {
    ctx.repo.atualizar(1, mudanca);
    await esperar401(me(ctx.app, tokenValido));
  });

  it('fluxo completo: login → /auth/me 200 → logout 204 limpa o cookie → sem cookie 401', async () => {
    const agente = request.agent(ctx.app.server);
    const entrada = await agente
      .post('/auth/login')
      .send({ email: 'aprovado@example.com', senha: SENHA });
    expect(entrada.status).toBe(200);
    expect((await agente.get('/auth/me')).status).toBe(200);

    const saida = await agente.post('/auth/logout');
    expect(saida.status).toBe(204);
    const limpeza = cookieDe(saida);
    expect(limpeza).toMatch(/^acif_sessao=;/);
    expect(limpeza).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(limpeza).toMatch(/HttpOnly/);

    await esperar401(agente.get('/auth/me'));
  });

  it('logout sem sessão também responde 204 (idempotente)', async () => {
    const resposta = await request(ctx.app.server).post('/auth/logout');
    expect(resposta.status).toBe(204);
  });
});

describe('cookie Secure fora do ambiente local', () => {
  it(
    'com cookieSecure=true, o cookie de sessão sai com Secure',
    async () => {
      const ctx = await criarContexto({ cookieSecure: true });
      const resposta = await login(ctx.app, { email: 'aprovado@example.com', senha: SENHA });
      expect(cookieDe(resposta)).toMatch(/Secure/);
      await ctx.app.close();
    },
    TIMEOUT,
  );
});

describe('configuração de auth (lerConfigAuth)', () => {
  it('em produção, sem JWT_SECRET, recusa subir', () => {
    expect(() => lerConfigAuth({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET é obrigatório/);
  });

  it('em produção, recusa o segredo de desenvolvimento e liga o Secure', () => {
    const segredo = 'x'.repeat(40);
    expect(lerConfigAuth({ NODE_ENV: 'production', JWT_SECRET: segredo })).toMatchObject({
      jwtSecret: segredo,
      cookieSecure: true,
      usandoSegredoDev: false,
    });
  });

  it('recusa segredo curto sem mostrar o valor na mensagem', () => {
    expect(() => lerConfigAuth({ JWT_SECRET: 'curto-demais' })).toThrow(/ao menos 32/);
    try {
      lerConfigAuth({ JWT_SECRET: 'curto-demais' });
    } catch (erro) {
      expect((erro as Error).message).not.toContain('curto-demais');
    }
  });

  it('em desenvolvimento, usa os padrões: 8h, sem Secure, 10 tentativas por minuto', () => {
    expect(lerConfigAuth({})).toMatchObject({
      sessaoHoras: 8,
      cookieSecure: false,
      loginRateLimitMax: 10,
      usandoSegredoDev: true,
    });
  });

  it('valor inválido de variável gera erro só com o nome dela', () => {
    expect(() => lerConfigAuth({ SESSAO_HORAS: 'muitas' })).toThrow(/SESSAO_HORAS/);
  });
});
