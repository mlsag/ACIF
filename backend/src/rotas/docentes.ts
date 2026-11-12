import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { ConfigAuth } from '../config.js';
import { STATUS_APROVACAO } from '../dominio/valores.js';
import type { DocenteService, ErroDocente, ResultadoDocente } from '../services/docente-service.js';
import { RESPOSTA_CORPO_INVALIDO } from './auth.js';
import { esquemaParamId, esquemaQueryLista } from './comunicados.js';

export const SENHA_MIN = 12;
export const SENHA_MAX = 128;

/**
 * Corpo do cadastro público. Objeto estrito: `papel`, `status_aprovacao` ou qualquer outra chave
 * dá 400. Papel e status são sempre definidos pelo servidor.
 */
export const esquemaCadastroDocente = z.strictObject({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  // Sem regras de composição (NIST 800-63B); o teto evita abuso do argon2.
  senha: z.string().min(SENHA_MIN).max(SENHA_MAX),
});

/** Mesma resposta para cadastro novo e e-mail já cadastrado: não revela se a conta existe. */
export const RESPOSTA_CADASTRO_RECEBIDO = {
  mensagem: 'Solicitação recebida. O acesso será liberado após a aprovação da coordenação.',
} as const;

export const RESPOSTAS_ERRO_DOCENTE: Record<
  ErroDocente,
  { status: number; corpo: { erro: string; mensagem: string } }
> = {
  // Igual para id inexistente e id de admin: as decisões só alcançam docentes.
  nao_encontrado: {
    status: 404,
    corpo: { erro: 'nao_encontrado', mensagem: 'Docente não encontrado.' },
  },
  conflito: {
    status: 409,
    corpo: {
      erro: 'conflito',
      mensagem: 'O status do docente mudou durante a operação. Recarregue e tente de novo.',
    },
  },
};

const esquemaQueryDocentes = esquemaQueryLista.extend({
  status: z.enum(STATUS_APROVACAO).optional(),
});

function invalido(reply: FastifyReply) {
  // Sem detalhar o campo: o corpo pode conter nome, e-mail ou senha.
  return reply.code(400).send(RESPOSTA_CORPO_INVALIDO);
}

/** Cadastro público (T07) e decisões do admin. Validam a entrada e traduzem o service em HTTP. */
export function rotasDocentes(
  app: FastifyInstance,
  config: ConfigAuth,
  service: DocenteService,
): void {
  const soAdmin = { preHandler: [app.autenticar, app.exigirAdmin] };

  app.post(
    '/docentes/cadastro',
    { config: { rateLimit: { max: config.cadastroRateLimitMax, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const corpo = esquemaCadastroDocente.safeParse(request.body);
      if (!corpo.success) return invalido(reply);

      await service.cadastrar(corpo.data.nome, corpo.data.email, corpo.data.senha);
      return reply.code(202).send(RESPOSTA_CADASTRO_RECEBIDO);
    },
  );

  app.get('/docentes', soAdmin, async (request, reply) => {
    const query = esquemaQueryDocentes.safeParse(request.query ?? {});
    if (!query.success) return invalido(reply);
    return service.listar(query.data.status, query.data.pagina, query.data.por_pagina);
  });

  async function decidir(
    request: FastifyRequest,
    reply: FastifyReply,
    acao: 'aprovar' | 'bloquear',
  ) {
    const params = esquemaParamId.safeParse(request.params);
    if (!params.success) return invalido(reply);

    const idAdmin = request.usuario!.id;
    const resultado: ResultadoDocente = await service[acao](params.data.id, idAdmin);
    if (!resultado.ok) {
      const { status, corpo } = RESPOSTAS_ERRO_DOCENTE[resultado.erro];
      return reply.code(status).send(corpo);
    }
    if (resultado.alterado) {
      // Só ids: nunca nome ou e-mail do docente.
      request.log.info(
        {
          evento: `docente_${resultado.valor.status_aprovacao}`,
          id_docente: params.data.id,
          id_admin: idAdmin,
        },
        'decisão sobre docente',
      );
    }
    return resultado.valor;
  }

  app.post('/docentes/:id/aprovar', soAdmin, (request, reply) =>
    decidir(request, reply, 'aprovar'),
  );
  app.post('/docentes/:id/bloquear', soAdmin, (request, reply) =>
    decidir(request, reply, 'bloquear'),
  );
}
