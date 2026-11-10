import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

describe('GET /health', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 200 com status ok', async () => {
    const resposta = await request(app.server).get('/health');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ status: 'ok' });
  });

  it('responde 404 para rota inexistente', async () => {
    const resposta = await request(app.server).get('/nao-existe');

    expect(resposta.status).toBe(404);
  });
});
