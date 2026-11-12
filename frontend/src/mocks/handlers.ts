// Handlers MSW tipados pelo openapi.yaml (T04), só das operações já implementadas na API.
// O `response(status).json(...)` do openapi-msw só compila com status e corpo do contrato.
// Sem estado entre requisições: respondem com os dados fixos de ./dados.

import { createOpenApiHttp } from 'openapi-msw';
import type { CorpoComunicado } from '../api/tipos';
import type { paths } from '../api/tipos';
import {
  COMUNICADOS_MOCK,
  DOCENTES_MOCK,
  ERROS_MOCK,
  SENHA_MOCK,
  USUARIO_MOCK,
  resumir,
} from './dados';

/** `*` casa qualquer origem: serve ao Vitest (Node) e ao navegador (/api do proxy do Vite). */
export const http = createOpenApiHttp<paths>({ baseUrl: '*/api' });

function comunicado(id: number) {
  return COMUNICADOS_MOCK.find((c) => c.id === id);
}

function aplicar(base: (typeof COMUNICADOS_MOCK)[number], corpo: CorpoComunicado | undefined) {
  return {
    ...base,
    ...(corpo?.titulo !== undefined && { titulo: corpo.titulo }),
    ...(corpo?.conteudo !== undefined && { conteudo: corpo.conteudo }),
    ...(corpo?.prompt_original !== undefined && { prompt_original: corpo.prompt_original }),
    ...(corpo?.canais !== undefined && { canais: corpo.canais }),
    ...(corpo?.filtro_destinatarios !== undefined && {
      filtro_destinatarios: corpo.filtro_destinatarios,
    }),
    ...(corpo?.variaveis !== undefined && { variaveis: corpo.variaveis }),
  };
}

async function corpoOpcional(request: Request): Promise<CorpoComunicado | undefined> {
  const texto = await request.text();
  return texto ? (JSON.parse(texto) as CorpoComunicado) : undefined;
}

export const handlers = [
  http.get('/health', ({ response }) => response(200).json({ status: 'ok' })),

  http.post('/auth/login', async ({ request, response }) => {
    const corpo = await request.json();
    if (corpo.senha !== SENHA_MOCK) return response(401).json(ERROS_MOCK.naoAutenticado);
    const { id, nome, papel } = USUARIO_MOCK;
    return response(200).json({ id, nome, papel });
  }),

  http.post('/auth/logout', ({ response }) => response(204).empty()),

  http.get('/auth/me', ({ response }) => response(200).json(USUARIO_MOCK)),

  http.post('/docentes/cadastro', ({ response }) =>
    response(202).json({
      mensagem: 'Solicitação recebida. O acesso será liberado após a aprovação da coordenação.',
    }),
  ),

  http.get('/docentes', ({ query, response }) => {
    const status = query.get('status');
    const itens = DOCENTES_MOCK.filter((d) => !status || d.status_aprovacao === status);
    return response(200).json({ itens, pagina: 1, por_pagina: 20, total: itens.length });
  }),

  http.post('/docentes/{id}/aprovar', ({ params, response }) => {
    const docente = DOCENTES_MOCK.find((d) => d.id === Number(params.id));
    if (!docente) return response(404).json(ERROS_MOCK.docenteNaoEncontrado);
    return response(200).json({ ...docente, status_aprovacao: 'aprovado' });
  }),

  http.post('/docentes/{id}/bloquear', ({ params, response }) => {
    const docente = DOCENTES_MOCK.find((d) => d.id === Number(params.id));
    if (!docente) return response(404).json(ERROS_MOCK.docenteNaoEncontrado);
    return response(200).json({ ...docente, status_aprovacao: 'bloqueado' });
  }),

  http.post('/comunicados', async ({ request, response }) => {
    const vazio = {
      ...COMUNICADOS_MOCK[0]!,
      id: 100,
      titulo: null,
      conteudo: null,
      prompt_original: null,
      canais: [],
      filtro_destinatarios: null,
      variaveis: null,
    };
    return response(201).json(aplicar(vazio, await corpoOpcional(request)));
  }),

  http.get('/comunicados', ({ response }) => {
    const itens = COMUNICADOS_MOCK.map(resumir);
    return response(200).json({ itens, pagina: 1, por_pagina: 20, total: itens.length });
  }),

  http.get('/comunicados/{id}', ({ params, response }) => {
    const atual = comunicado(Number(params.id));
    if (!atual) return response(404).json(ERROS_MOCK.naoEncontrado);
    return response(200).json(atual);
  }),

  http.patch('/comunicados/{id}', async ({ params, request, response }) => {
    const atual = comunicado(Number(params.id));
    if (!atual) return response(404).json(ERROS_MOCK.naoEncontrado);
    return response(200).json(aplicar(atual, await corpoOpcional(request)));
  }),

  http.delete('/comunicados/{id}', ({ params, response }) => {
    if (!comunicado(Number(params.id))) return response(404).json(ERROS_MOCK.naoEncontrado);
    return response(204).empty();
  }),
];
