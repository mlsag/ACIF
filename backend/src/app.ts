import fastifyRateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import type { ConfigAuth } from './config.js';
import { registrarAutenticacao } from './plugins/autenticacao.js';
import { rotasAuth } from './rotas/auth.js';
import { rotasComunicados } from './rotas/comunicados.js';
import { rotasDocentes } from './rotas/docentes.js';
import type { AuthService } from './services/auth-service.js';
import type { ComunicadoService } from './services/comunicado-service.js';
import type { DocenteService } from './services/docente-service.js';

export interface DependenciasAuth {
  config: ConfigAuth;
  authService: AuthService;
}

export interface OpcoesApp {
  /** true usa o logger padrão; um objeto permite injetar o destino (usado nos testes de PII). */
  logger?: boolean | Exclude<FastifyServerOptions['logger'], boolean | undefined>;
  /** Sem `auth`, a aplicação sobe só com /health (testes que não precisam de banco). */
  auth?: DependenciasAuth;
  /** Rotas de comunicados (T12); só são registradas junto com `auth`, que elas exigem. */
  comunicados?: { comunicadoService: ComunicadoService };
  /** Cadastro e aprovação de docentes (T07); só são registradas junto com `auth`. */
  docentes?: { docenteService: DocenteService };
}

/** URL sem query string: parâmetros de query nunca vão para o log. */
export function urlSemQuery(url: string): string {
  const fim = url.indexOf('?');
  return fim === -1 ? url : url.slice(0, fim);
}

function opcoesLogger(logger: OpcoesApp['logger']): FastifyServerOptions['logger'] {
  if (!logger) return false;
  return {
    ...(typeof logger === 'object' ? logger : {}),
    // Logs sem PII: a requisição registra só método e URL sem query (sem IP, host, headers ou corpo).
    serializers: {
      req: (req: { method: string; url: string }) => ({
        method: req.method,
        url: urlSemQuery(req.url),
      }),
    },
  };
}

/**
 * Cria a aplicação HTTP sem escutar em porta, para ser usada pelo server e pelos testes.
 * Rotas de negócio sempre como rota → service → repository.
 */
export function buildApp(opcoes: OpcoesApp = {}): FastifyInstance {
  const app = Fastify({ logger: opcoesLogger(opcoes.logger) });

  // Erros sem detalhes: a mensagem de validação ou do banco pode carregar dados da requisição.
  app.setErrorHandler(
    (erro: { statusCode?: number; code?: string; name?: string }, request, reply) => {
      const status = erro.statusCode && erro.statusCode >= 400 ? erro.statusCode : 500;
      if (status === 429) {
        return reply.code(429).send({
          erro: 'muitas_tentativas',
          mensagem: 'Muitas tentativas. Aguarde e tente de novo.',
        });
      }
      if (status < 500) {
        return reply
          .code(status)
          .send({ erro: 'requisicao_invalida', mensagem: 'Requisição inválida.' });
      }
      request.log.error({ erro: erro.name, codigo: erro.code }, 'erro interno');
      return reply.code(500).send({ erro: 'erro_interno', mensagem: 'Erro interno.' });
    },
  );

  app.get('/health', async () => ({ status: 'ok' }));

  if (opcoes.auth) {
    const { config, authService } = opcoes.auth;
    // global: false — só as rotas com config.rateLimit são limitadas (login e cadastro de docente).
    app.register(fastifyRateLimit, { global: false });
    registrarAutenticacao(app, config, authService);
    // Rotas dentro de um plugin: são registradas depois do rate limit, cujo hook onRoute precisa existir antes.
    app.register(async (instancia) => rotasAuth(instancia, config, authService));

    const comunicados = opcoes.comunicados;
    if (comunicados) {
      app.register(async (instancia) => rotasComunicados(instancia, comunicados.comunicadoService));
    }

    const docentes = opcoes.docentes;
    if (docentes) {
      app.register(async (instancia) => rotasDocentes(instancia, config, docentes.docenteService));
    }
  }

  return app;
}
