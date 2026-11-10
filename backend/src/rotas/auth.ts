import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ConfigAuth } from '../config.js';
import {
  NOME_COOKIE_SESSAO,
  opcoesCookieSessao,
  responderNaoAutenticado,
} from '../plugins/autenticacao.js';
import type { AuthService } from '../services/auth-service.js';

/** Dados só no corpo JSON, nunca na query (a URL vai para o log). */
export const esquemaLogin = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  // Teto de tamanho: evita abuso do argon2 com senhas enormes.
  senha: z.string().min(1).max(128),
});

export const RESPOSTA_CORPO_INVALIDO = {
  erro: 'requisicao_invalida',
  mensagem: 'Requisição inválida.',
} as const;

/** Rotas de auth: só validam a entrada e traduzem o resultado do AuthService em HTTP. */
export function rotasAuth(
  app: FastifyInstance,
  config: ConfigAuth,
  authService: AuthService,
): void {
  const cookie = opcoesCookieSessao(config);

  app.post(
    '/auth/login',
    { config: { rateLimit: { max: config.loginRateLimitMax, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const entrada = esquemaLogin.safeParse(request.body);
      if (!entrada.success) {
        // Sem detalhar o campo: o corpo pode conter a senha.
        return reply.code(400).send(RESPOSTA_CORPO_INVALIDO);
      }

      const usuario = await authService.autenticar(entrada.data.email, entrada.data.senha);
      if (!usuario) {
        return responderNaoAutenticado(reply);
      }

      const token = await reply.jwtSign({ sub: String(usuario.id), papel: usuario.papel });
      return reply
        .setCookie(NOME_COOKIE_SESSAO, token, { ...cookie, maxAge: config.sessaoHoras * 3600 })
        .code(200)
        .send({ id: usuario.id, nome: usuario.nome, papel: usuario.papel });
    },
  );

  // Idempotente: limpa o cookie mesmo sem sessão. O JWT não tem estado; o que barra um token
  // copiado é a expiração e a checagem no banco do hook `autenticar`.
  app.post('/auth/logout', async (_request, reply) => {
    return reply.clearCookie(NOME_COOKIE_SESSAO, cookie).code(204).send();
  });

  app.get('/auth/me', { preHandler: app.autenticar }, async (request) => {
    const usuario = request.usuario!;
    return { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel };
  });
}
