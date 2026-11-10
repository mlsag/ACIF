import Fastify, { type FastifyInstance } from 'fastify';

export interface OpcoesApp {
  logger?: boolean;
}

/**
 * Cria a aplicação HTTP sem escutar em porta, para ser usada pelo server e pelos testes.
 * Rotas de negócio entram nas próximas tasks, sempre como rota → service → repository.
 */
export function buildApp(opcoes: OpcoesApp = {}): FastifyInstance {
  const app = Fastify({
    logger: opcoes.logger
      ? {
          // Logs sem PII: a requisição registra só método e URL (sem IP, host ou headers).
          serializers: {
            req: (req) => ({ method: req.method, url: req.url }),
          },
        }
      : false,
  });

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
