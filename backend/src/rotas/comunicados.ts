import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  esquemaCanais,
  esquemaFiltro,
  esquemaVariaveis,
  MAX_ID_INT4,
} from '../dominio/comunicado.js';
import type { ComunicadoService, ErroComunicado } from '../services/comunicado-service.js';
import { RESPOSTA_CORPO_INVALIDO } from './auth.js';

export const POR_PAGINA_PADRAO = 20;
export const POR_PAGINA_MAX = 50;
const PAGINA_MAX = 100_000;

export const RESPOSTAS_ERRO_COMUNICADO: Record<
  ErroComunicado,
  { status: number; corpo: { erro: string; mensagem: string } }
> = {
  // Igual para id inexistente e comunicado de outro usuário: não revela a existência.
  nao_encontrado: {
    status: 404,
    corpo: { erro: 'nao_encontrado', mensagem: 'Comunicado não encontrado.' },
  },
  nao_editavel: {
    status: 409,
    corpo: {
      erro: 'comunicado_nao_editavel',
      mensagem: 'Só comunicados em rascunho podem ser alterados ou excluídos.',
    },
  },
  canal_indisponivel: {
    status: 422,
    corpo: { erro: 'canal_indisponivel', mensagem: 'Canal inexistente ou inativo.' },
  },
};

/** Texto opcional do rascunho: trim; string vazia vira null. */
const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

/**
 * Corpo do POST e do PATCH. Objeto estrito: `id_usuario`, `status` ou qualquer outra chave dá 400.
 * O dono vem sempre da sessão.
 */
export const esquemaCorpoComunicado = z.strictObject({
  titulo: textoOpcional(200),
  conteudo: textoOpcional(10_000),
  prompt_original: textoOpcional(600),
  canais: esquemaCanais.optional(),
  filtro_destinatarios: esquemaFiltro.nullable().optional(),
  variaveis: esquemaVariaveis.nullable().optional(),
});

/** Inteiro positivo em texto, sem sinal, espaço, decimal ou notação científica. */
export const inteiroTexto = (max: number) =>
  z
    .string()
    .regex(/^[1-9]\d{0,9}$/)
    .transform(Number)
    .pipe(z.number().max(max));

export const esquemaParamId = z.object({ id: inteiroTexto(MAX_ID_INT4) });

export const esquemaQueryLista = z.object({
  pagina: inteiroTexto(PAGINA_MAX).default(1),
  por_pagina: inteiroTexto(POR_PAGINA_MAX).default(POR_PAGINA_PADRAO),
});

function responderErro(reply: FastifyReply, erro: ErroComunicado) {
  const { status, corpo } = RESPOSTAS_ERRO_COMUNICADO[erro];
  return reply.code(status).send(corpo);
}

function corpoInvalido(reply: FastifyReply) {
  // Sem detalhar o campo: a mensagem do Zod pode ecoar o texto do comunicado.
  return reply.code(400).send(RESPOSTA_CORPO_INVALIDO);
}

/** Rotas de comunicados (T12): validam a entrada e traduzem o resultado do service em HTTP. */
export function rotasComunicados(app: FastifyInstance, service: ComunicadoService): void {
  app.addHook('preHandler', app.autenticar);

  app.post('/comunicados', async (request, reply) => {
    const corpo = esquemaCorpoComunicado.safeParse(request.body ?? {});
    if (!corpo.success) return corpoInvalido(reply);

    const resultado = await service.criar(request.usuario!.id, corpo.data);
    if (!resultado.ok) return responderErro(reply, resultado.erro);
    return reply.code(201).send(resultado.valor);
  });

  app.get('/comunicados', async (request, reply) => {
    const query = esquemaQueryLista.safeParse(request.query ?? {});
    if (!query.success) return corpoInvalido(reply);
    return service.listar(request.usuario!.id, query.data.pagina, query.data.por_pagina);
  });

  app.get('/comunicados/:id', async (request, reply) => {
    const params = esquemaParamId.safeParse(request.params);
    if (!params.success) return corpoInvalido(reply);

    const resultado = await service.obter(request.usuario!.id, params.data.id);
    if (!resultado.ok) return responderErro(reply, resultado.erro);
    return resultado.valor;
  });

  app.patch('/comunicados/:id', async (request, reply) => {
    const params = esquemaParamId.safeParse(request.params);
    const corpo = esquemaCorpoComunicado.safeParse(request.body ?? {});
    if (!params.success || !corpo.success) return corpoInvalido(reply);

    const resultado = await service.atualizar(request.usuario!.id, params.data.id, corpo.data);
    if (!resultado.ok) return responderErro(reply, resultado.erro);
    return resultado.valor;
  });

  app.delete('/comunicados/:id', async (request, reply) => {
    const params = esquemaParamId.safeParse(request.params);
    if (!params.success) return corpoInvalido(reply);

    const resultado = await service.excluir(request.usuario!.id, params.data.id);
    if (!resultado.ok) return responderErro(reply, resultado.erro);
    return reply.code(204).send();
  });
}
