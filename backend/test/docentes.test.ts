// Testes de cadastro e aprovação de docentes (T07) sem banco: repositório em memória e argon2 real.
// Os testes com o banco real ficam em test/db/docente-repository.test.ts.

import argon2 from 'argon2';
import type { FastifyInstance } from 'fastify';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import { lerConfigAuth, type ConfigAuth } from '../src/config.js';
import { RESPOSTA_ACESSO_NEGADO, RESPOSTA_NAO_AUTENTICADO } from '../src/plugins/autenticacao.js';
import { RESPOSTA_CORPO_INVALIDO } from '../src/rotas/auth.js';
import { RESPOSTA_CADASTRO_RECEBIDO, RESPOSTAS_ERRO_DOCENTE } from '../src/rotas/docentes.js';
import { AuthService } from '../src/services/auth-service.js';
import { DocenteService } from '../src/services/docente-service.js';
import { UsuarioRepositoryMemoria } from './apoio/usuario-repository-memoria.js';

const TIMEOUT = 30_000;
const SENHA = 'senha-sintetica-de-teste';
const NAO_ENCONTRADO = RESPOSTAS_ERRO_DOCENTE.nao_encontrado.corpo;

const configBase: ConfigAuth = {
  jwtSecret: 'segredo-de-teste-com-mais-de-32-caracteres',
  sessaoHoras: 8,
  cookieSecure: false,
  loginRateLimitMax: 1000,
  cadastroRateLimitMax: 1000,
  usandoSegredoDev: false,
};

// Usuários sintéticos (example.com). ids: 1 e 2 admins, 3 docente aprovado (usado no 403).
const ADMIN = { id: 1, email: 'admin.t07@example.com', nome: 'Admin Sintético T07' };
const ADMIN_2 = { id: 2, email: 'admin2.t07@example.com', nome: 'Admin Sintético 2' };
const DOCENTE = { id: 3, email: 'docente.t07@example.com', nome: 'Docente Sintético T07' };

let hashSenha: string;

beforeAll(async () => {
  hashSenha = await argon2.hash(SENHA, { type: argon2.argon2id });
}, TIMEOUT);

interface Contexto {
  app: FastifyInstance;
  repo: UsuarioRepositoryMemoria;
  linhasLog: string[];
}

async function criarContexto(config: Partial<ConfigAuth> = {}): Promise<Contexto> {
  const repo = new UsuarioRepositoryMemoria();
  for (const admin of [ADMIN, ADMIN_2]) {
    repo.adicionar({
      ...admin,
      senha: hashSenha,
      ativo: true,
      papel: 'admin',
      status_aprovacao: 'aprovado',
    });
  }
  repo.adicionar({
    ...DOCENTE,
    senha: hashSenha,
    ativo: true,
    papel: 'docente',
    status_aprovacao: 'aprovado',
  });
  const authService = new AuthService(repo);
  await authService.aquecer();
  const linhasLog: string[] = [];
  const app = buildApp({
    logger: { level: 'info', stream: { write: (linha: string) => void linhasLog.push(linha) } },
    auth: { config: { ...configBase, ...config }, authService },
    docentes: { docenteService: new DocenteService(repo) },
  });
  await app.ready();
  return { app, repo, linhasLog };
}

function cadastrar(app: FastifyInstance, corpo: unknown) {
  return request(app.server)
    .post('/docentes/cadastro')
    .send(corpo as object);
}

function login(app: FastifyInstance, email: string, senha = SENHA) {
  return request(app.server).post('/auth/login').send({ email, senha });
}

function cookieDe(resposta: request.Response): string {
  const cabecalho = resposta.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = cabecalho?.find((c) => c.startsWith('acif_sessao='));
  if (!cookie) throw new Error('resposta sem cookie de sessão');
  return cookie.split(';')[0]!;
}

async function cookieDeLogin(app: FastifyInstance, email: string): Promise<string> {
  const resposta = await login(app, email);
  expect(resposta.status).toBe(200);
  return cookieDe(resposta);
}

function idPorEmail(repo: UsuarioRepositoryMemoria, email: string): number {
  const usuario = [...repo.usuarios.values()].find((u) => u.email === email);
  if (!usuario) throw new Error('usuário não encontrado');
  return usuario.id;
}

const novoDocente = (email: string) => ({ nome: 'Docente Novo Sintético', email, senha: SENHA });

describe('critério 1: docente pendente não loga', () => {
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

  it('cadastro público responde 202 e grava docente pendente, ativo, com e-mail em minúsculas e hash argon2id', async () => {
    const resposta = await cadastrar(ctx.app, {
      nome: '  Docente Cadastro Sintético  ',
      email: '  Cadastro.T07@Example.com ',
      senha: SENHA,
    });

    expect(resposta.status).toBe(202);
    expect(resposta.body).toEqual(RESPOSTA_CADASTRO_RECEBIDO);
    expect(resposta.headers['set-cookie']).toBeUndefined();

    const gravado = [...ctx.repo.usuarios.values()].find(
      (u) => u.email === 'cadastro.t07@example.com',
    );
    expect(gravado).toMatchObject({
      nome: 'Docente Cadastro Sintético',
      papel: 'docente',
      status_aprovacao: 'pendente',
      ativo: true,
      aprovado_por: null,
    });
    expect(gravado!.senha).toMatch(/^\$argon2id\$/);
    expect(gravado!.senha).not.toContain(SENHA);
  });

  it('docente recém-cadastrado, com a senha certa, recebe o 401 genérico, idêntico ao de senha errada', async () => {
    await cadastrar(ctx.app, novoDocente('pendente.t07@example.com'));

    const pendente = await login(ctx.app, 'pendente.t07@example.com');
    const errada = await login(ctx.app, DOCENTE.email, 'senha-errada-qualquer');

    expect(pendente.status).toBe(401);
    expect(pendente.body).toEqual(RESPOSTA_NAO_AUTENTICADO);
    expect(pendente.headers['set-cookie']).toBeUndefined();
    expect(JSON.stringify([pendente.status, pendente.text, pendente.headers['content-type']])).toBe(
      JSON.stringify([errada.status, errada.text, errada.headers['content-type']]),
    );
  });

  it('e-mail duplicado: mesma resposta 202, um argon2.hash, sem criar outra conta nem trocar a senha', async () => {
    const email = 'duplicado.t07@example.com';
    const hash = vi.spyOn(argon2, 'hash');
    const primeira = await cadastrar(ctx.app, novoDocente(email));
    const senhaOriginal = ctx.repo.usuarios.get(idPorEmail(ctx.repo, email))!.senha;
    const total = ctx.repo.usuarios.size;

    const segunda = await cadastrar(ctx.app, {
      nome: 'Outro Nome Sintético',
      email: email.toUpperCase(),
      senha: 'outra-senha-sintetica',
    });

    expect(hash).toHaveBeenCalledTimes(2);
    expect(JSON.stringify([segunda.status, segunda.text, segunda.headers['content-type']])).toBe(
      JSON.stringify([primeira.status, primeira.text, primeira.headers['content-type']]),
    );
    expect(ctx.repo.usuarios.size).toBe(total);
    const conta = ctx.repo.usuarios.get(idPorEmail(ctx.repo, email))!;
    expect(conta.senha).toBe(senhaOriginal);
    expect(conta.nome).toBe('Docente Novo Sintético');
  });

  it('e-mail de um admin existente: 202 genérico e o admin segue intacto', async () => {
    const resposta = await cadastrar(ctx.app, novoDocente(ADMIN.email));
    expect(resposta.status).toBe(202);
    expect(ctx.repo.usuarios.get(ADMIN.id)).toMatchObject({ papel: 'admin', senha: hashSenha });
  });

  it.each([
    ['sem corpo', undefined],
    ['sem nome', { email: 'x.t07@example.com', senha: SENHA }],
    ['nome com 1 caractere', { nome: ' A ', email: 'x.t07@example.com', senha: SENHA }],
    [
      'nome com mais de 120 caracteres',
      { nome: 'N'.repeat(121), email: 'x.t07@example.com', senha: SENHA },
    ],
    ['e-mail malformado', { nome: 'Docente', email: 'nao-e-email', senha: SENHA }],
    [
      'e-mail com mais de 254 caracteres',
      { nome: 'Docente', email: `${'a'.repeat(250)}@example.com`, senha: SENHA },
    ],
    [
      'senha com 11 caracteres',
      { nome: 'Docente', email: 'x.t07@example.com', senha: 'x'.repeat(11) },
    ],
    [
      'senha com 129 caracteres',
      { nome: 'Docente', email: 'x.t07@example.com', senha: 'x'.repeat(129) },
    ],
    ['papel no corpo', { ...novoDocente('x.t07@example.com'), papel: 'admin' }],
    ['status no corpo', { ...novoDocente('x.t07@example.com'), status_aprovacao: 'aprovado' }],
  ])('corpo inválido (%s): 400 genérico e nada gravado', async (_caso, corpo) => {
    const antes = ctx.repo.usuarios.size;
    const resposta = await cadastrar(ctx.app, corpo);
    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual(RESPOSTA_CORPO_INVALIDO);
    expect(ctx.repo.usuarios.size).toBe(antes);
  });

  it('senha de exatamente 12 e de 128 caracteres é aceita', async () => {
    const curta = await cadastrar(ctx.app, {
      ...novoDocente('s12.t07@example.com'),
      senha: 'x'.repeat(12),
    });
    const longa = await cadastrar(ctx.app, {
      ...novoDocente('s128.t07@example.com'),
      senha: 'y'.repeat(128),
    });
    expect([curta.status, longa.status]).toEqual([202, 202]);
  });

  it('logs do cadastro e do login não contêm nome, e-mail nem senha', async () => {
    await cadastrar(ctx.app, {
      nome: 'Nome Marcador Log T07',
      email: 'marcador.log.t07@example.com',
      senha: 'senha-marcador-log-t07',
    });
    await login(ctx.app, 'marcador.log.t07@example.com', 'senha-marcador-log-t07');

    const log = ctx.linhasLog.join('\n');
    expect(log).toContain('"url":"/docentes/cadastro"');
    for (const proibido of ['Nome Marcador Log T07', '@example.com', 'senha-marcador-log-t07']) {
      expect(log).not.toContain(proibido);
    }
  });
});

describe('critério 1: rate limit do cadastro público', () => {
  let ctx: Contexto;

  beforeAll(async () => {
    ctx = await criarContexto({ cadastroRateLimitMax: 5 });
  }, TIMEOUT);

  afterAll(async () => {
    await ctx.app.close();
  });

  it(
    'o 6º cadastro na mesma hora responde 429 sem gravar; o login não é afetado',
    async () => {
      for (let i = 0; i < 5; i += 1) {
        const r = await cadastrar(ctx.app, novoDocente(`limite${i}.t07@example.com`));
        expect(r.status).toBe(202);
      }
      const antes = ctx.repo.usuarios.size;
      const bloqueada = await cadastrar(ctx.app, novoDocente('limite5.t07@example.com'));
      expect(bloqueada.status).toBe(429);
      expect(bloqueada.body).toMatchObject({ erro: 'muitas_tentativas' });
      expect(ctx.repo.usuarios.size).toBe(antes);

      expect((await login(ctx.app, ADMIN.email)).status).toBe(200);
    },
    TIMEOUT,
  );

  it('CADASTRO_RATE_LIMIT_MAX tem padrão 5 e aceita outro valor', () => {
    expect(lerConfigAuth({}).cadastroRateLimitMax).toBe(5);
    expect(lerConfigAuth({ CADASTRO_RATE_LIMIT_MAX: '20' }).cadastroRateLimitMax).toBe(20);
    expect(() => lerConfigAuth({ CADASTRO_RATE_LIMIT_MAX: '0' })).toThrow(
      /CADASTRO_RATE_LIMIT_MAX/,
    );
  });
});

describe('critério 2: o responsável aprova ou bloqueia', () => {
  let ctx: Contexto;
  let cookieAdmin: string;
  let cookieDocente: string;
  let idNovo: number;
  const EMAIL_NOVO = 'fluxo.t07@example.com';

  beforeAll(async () => {
    ctx = await criarContexto();
    cookieAdmin = await cookieDeLogin(ctx.app, ADMIN.email);
    cookieDocente = await cookieDeLogin(ctx.app, DOCENTE.email);
  }, TIMEOUT);

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    // Cada teste parte de um docente recém-cadastrado (pendente).
    for (const [id, u] of ctx.repo.usuarios)
      if (u.email === EMAIL_NOVO) ctx.repo.usuarios.delete(id);
    expect((await cadastrar(ctx.app, novoDocente(EMAIL_NOVO))).status).toBe(202);
    idNovo = idPorEmail(ctx.repo, EMAIL_NOVO);
  });

  const comoAdmin = (metodo: 'get' | 'post', caminho: string, cookie = cookieAdmin) =>
    request(ctx.app.server)[metodo](caminho).set('Cookie', cookie);

  it('o admin lista os pendentes, sem senha e sem admins', async () => {
    const resposta = await comoAdmin('get', '/docentes?status=pendente');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ pagina: 1, por_pagina: 20 });
    const ids = resposta.body.itens.map((d: { id: number }) => d.id);
    expect(ids).toContain(idNovo);
    expect(ids).not.toContain(DOCENTE.id);
    expect(ids).not.toContain(ADMIN.id);
    const item = resposta.body.itens.find((d: { id: number }) => d.id === idNovo);
    expect(Object.keys(item).sort()).toEqual([
      'data_cadastro',
      'email',
      'id',
      'nome',
      'status_aprovacao',
    ]);
    expect(item).toMatchObject({ email: EMAIL_NOVO, status_aprovacao: 'pendente' });
    expect(resposta.text).not.toContain('argon2');
  });

  it('sem filtro, lista todos os docentes com o total; paginação respeita por_pagina', async () => {
    const todos = await comoAdmin('get', '/docentes');
    expect(todos.status).toBe(200);
    expect(todos.body.total).toBe(2);
    const pagina = await comoAdmin('get', '/docentes?pagina=2&por_pagina=1');
    expect(pagina.body).toMatchObject({ pagina: 2, por_pagina: 1, total: 2 });
    expect(pagina.body.itens).toHaveLength(1);
  });

  it.each([
    ['status desconhecido', '/docentes?status=ativo'],
    ['pagina zero', '/docentes?pagina=0'],
    ['por_pagina acima de 50', '/docentes?por_pagina=51'],
  ])('query inválida (%s): 400', async (_caso, caminho) => {
    const resposta = await comoAdmin('get', caminho);
    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual(RESPOSTA_CORPO_INVALIDO);
  });

  it('aprovar: 200 com o docente, aprovado_por = admin, e o docente passa a logar', async () => {
    const resposta = await comoAdmin('post', `/docentes/${idNovo}/aprovar`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ id: idNovo, status_aprovacao: 'aprovado' });
    expect(ctx.repo.usuarios.get(idNovo)!.aprovado_por).toBe(ADMIN.id);
    expect((await login(ctx.app, EMAIL_NOVO)).status).toBe(200);
  });

  it('bloquear um pendente (rejeitar): 200; o login segue com 401', async () => {
    const resposta = await comoAdmin('post', `/docentes/${idNovo}/bloquear`);
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ status_aprovacao: 'bloqueado' });
    expect(ctx.repo.usuarios.get(idNovo)!.aprovado_por).toBe(ADMIN.id);
    expect((await login(ctx.app, EMAIL_NOVO)).status).toBe(401);
  });

  it('bloquear um aprovado derruba na hora a sessão aberta; reativar devolve o acesso', async () => {
    await comoAdmin('post', `/docentes/${idNovo}/aprovar`);
    const cookieNovo = await cookieDeLogin(ctx.app, EMAIL_NOVO);
    const me = () => request(ctx.app.server).get('/auth/me').set('Cookie', cookieNovo);
    expect((await me()).status).toBe(200);

    // Outro admin bloqueia: aprovado_por passa a ser o admin da última decisão.
    const cookieAdmin2 = await cookieDeLogin(ctx.app, ADMIN_2.email);
    const bloqueio = await comoAdmin('post', `/docentes/${idNovo}/bloquear`, cookieAdmin2);
    expect(bloqueio.status).toBe(200);
    expect(ctx.repo.usuarios.get(idNovo)!.aprovado_por).toBe(ADMIN_2.id);

    const derrubada = await me();
    expect(derrubada.status).toBe(401);
    expect(derrubada.body).toEqual(RESPOSTA_NAO_AUTENTICADO);
    expect((await login(ctx.app, EMAIL_NOVO)).status).toBe(401);

    const reativacao = await comoAdmin('post', `/docentes/${idNovo}/aprovar`);
    expect(reativacao.status).toBe(200);
    expect(reativacao.body).toMatchObject({ status_aprovacao: 'aprovado' });
    expect(ctx.repo.usuarios.get(idNovo)!.aprovado_por).toBe(ADMIN.id);
    expect((await me()).status).toBe(200);
  });

  it('repetir a decisão é idempotente: 200, sem nova escrita (aprovado_por mantido)', async () => {
    await comoAdmin('post', `/docentes/${idNovo}/aprovar`);
    const cookieAdmin2 = await cookieDeLogin(ctx.app, ADMIN_2.email);
    const repetida = await comoAdmin('post', `/docentes/${idNovo}/aprovar`, cookieAdmin2);
    expect(repetida.status).toBe(200);
    expect(repetida.body).toMatchObject({ status_aprovacao: 'aprovado' });
    expect(ctx.repo.usuarios.get(idNovo)!.aprovado_por).toBe(ADMIN.id);

    await comoAdmin('post', `/docentes/${idNovo}/bloquear`);
    expect((await comoAdmin('post', `/docentes/${idNovo}/bloquear`)).status).toBe(200);
  });

  it('o admin não bloqueia a si mesmo nem outro admin: 404 idêntico ao de id inexistente', async () => {
    const inexistente = await comoAdmin('post', '/docentes/999999/bloquear');
    expect(inexistente.status).toBe(404);
    expect(inexistente.body).toEqual(NAO_ENCONTRADO);

    for (const id of [ADMIN.id, ADMIN_2.id]) {
      for (const acao of ['bloquear', 'aprovar']) {
        const resposta = await comoAdmin('post', `/docentes/${id}/${acao}`);
        expect(resposta.status).toBe(404);
        expect(resposta.text).toBe(inexistente.text);
      }
    }
    expect(ctx.repo.usuarios.get(ADMIN.id)).toMatchObject({
      papel: 'admin',
      status_aprovacao: 'aprovado',
      aprovado_por: null,
    });
    // O admin segue com acesso.
    expect((await comoAdmin('get', '/docentes')).status).toBe(200);
  });

  it('status desconhecido no banco: 409 sem alterar', async () => {
    ctx.repo.atualizar(idNovo, { status_aprovacao: 'corrompido' });
    const resposta = await comoAdmin('post', `/docentes/${idNovo}/aprovar`);
    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual(RESPOSTAS_ERRO_DOCENTE.conflito.corpo);
    expect(ctx.repo.usuarios.get(idNovo)!.status_aprovacao).toBe('corrompido');
  });

  it.each(['abc', '0', '-1', '1.5', '2147483648'])('id inválido (%s): 400', async (id) => {
    const resposta = await comoAdmin('post', `/docentes/${id}/aprovar`);
    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual(RESPOSTA_CORPO_INVALIDO);
  });

  it.each([
    ['get', '/docentes'],
    ['post', '/docentes/1/aprovar'],
    ['post', '/docentes/1/bloquear'],
  ] as const)('docente aprovado em %s %s: 403 sem alterar nada', async (metodo, caminho) => {
    const resposta = await comoAdmin(metodo, caminho.replace('/1/', `/${idNovo}/`), cookieDocente);
    expect(resposta.status).toBe(403);
    expect(resposta.body).toEqual(RESPOSTA_ACESSO_NEGADO);
    expect(ctx.repo.usuarios.get(idNovo)!.status_aprovacao).toBe('pendente');
  });

  it.each([
    ['get', '/docentes'],
    ['post', '/docentes/1/aprovar'],
    ['post', '/docentes/1/bloquear'],
  ] as const)('sem sessão em %s %s: 401', async (metodo, caminho) => {
    const resposta = await request(ctx.app.server)[metodo](caminho);
    expect(resposta.status).toBe(401);
    expect(resposta.body).toEqual(RESPOSTA_NAO_AUTENTICADO);
  });

  it('JWT com papel admin forjado por um docente não passa: o papel vem do banco', async () => {
    const token = ctx.app.jwt.sign({ sub: String(DOCENTE.id), papel: 'admin' });
    const resposta = await comoAdmin('post', `/docentes/${idNovo}/aprovar`, `acif_sessao=${token}`);
    expect(resposta.status).toBe(403);
  });

  it('admin bloqueado perde o acesso às rotas de admin na hora', async () => {
    const cookieAdmin2 = await cookieDeLogin(ctx.app, ADMIN_2.email);
    ctx.repo.atualizar(ADMIN_2.id, { ativo: false });
    try {
      expect((await comoAdmin('get', '/docentes', cookieAdmin2)).status).toBe(401);
    } finally {
      ctx.repo.atualizar(ADMIN_2.id, { ativo: true });
    }
  });

  it('logs das decisões têm só ids e evento, sem nome nem e-mail', async () => {
    ctx.linhasLog.length = 0;
    await comoAdmin('post', `/docentes/${idNovo}/aprovar`);
    await comoAdmin('post', `/docentes/${idNovo}/bloquear`);
    await comoAdmin('get', '/docentes?status=bloqueado');

    const eventos = ctx.linhasLog
      .map((l) => JSON.parse(l) as Record<string, unknown>)
      .filter((l) => typeof l.evento === 'string');
    expect(eventos.map((e) => [e.evento, e.id_docente, e.id_admin])).toEqual([
      ['docente_aprovado', idNovo, ADMIN.id],
      ['docente_bloqueado', idNovo, ADMIN.id],
    ]);
    const log = ctx.linhasLog.join('\n');
    for (const proibido of ['@example.com', 'Docente Novo Sintético', 'argon2']) {
      expect(log).not.toContain(proibido);
    }
  });
});
