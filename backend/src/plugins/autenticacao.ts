import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ConfigAuth } from '../config.js';
import type { Papel } from '../dominio/valores.js';
import type { AuthService, UsuarioAutenticado } from '../services/auth-service.js';

export const NOME_COOKIE_SESSAO = 'acif_sessao';

/** Corpo único de 401: login inválido e sessão ausente/inválida respondem igual, sem revelar o motivo. */
export const RESPOSTA_NAO_AUTENTICADO = {
  erro: 'nao_autenticado',
  mensagem: 'Credenciais inválidas ou sessão expirada.',
} as const;

/** O JWT leva só o id (sub) e o papel: sem e-mail, nome ou outro dado pessoal. */
export interface PayloadSessao {
  sub: string;
  papel: Papel;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: PayloadSessao;
    user: PayloadSessao;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Preenchido pelo hook `autenticar`; null em rota pública. */
    usuario: UsuarioAutenticado | null;
  }
  interface FastifyInstance {
    /** preHandler reutilizável: exige sessão válida de usuário ativo e aprovado. */
    autenticar: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export function opcoesCookieSessao(config: ConfigAuth) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: config.cookieSecure,
    path: '/',
  };
}

export function responderNaoAutenticado(reply: FastifyReply) {
  return reply.code(401).send(RESPOSTA_NAO_AUTENTICADO);
}

/**
 * Registra cookie e JWT na instância raiz e decora `app.autenticar`.
 * Registrado direto na raiz (sem encapsulamento) para que todas as rotas enxerguem os decorators.
 */
export function registrarAutenticacao(
  app: FastifyInstance,
  config: ConfigAuth,
  authService: AuthService,
): void {
  app.register(fastifyCookie);
  app.register(fastifyJwt, {
    secret: config.jwtSecret,
    cookie: { cookieName: NOME_COOKIE_SESSAO, signed: false },
    sign: { algorithm: 'HS256', expiresIn: `${config.sessaoHoras}h` },
    // Algoritmo fixo: rejeita alg "none" e qualquer outro.
    verify: { algorithms: ['HS256'], onlyCookie: true },
  });

  app.decorateRequest('usuario', null);

  app.decorate(
    'autenticar',
    async function autenticar(request: FastifyRequest, reply: FastifyReply) {
      let payload: PayloadSessao;
      try {
        payload = await request.jwtVerify<PayloadSessao>();
      } catch {
        // Sem cookie, token adulterado, outro segredo, outro algoritmo ou expirado: mesmo 401.
        return responderNaoAutenticado(reply);
      }

      const id = Number(payload.sub);
      if (!Number.isSafeInteger(id) || id <= 0) {
        return responderNaoAutenticado(reply);
      }

      const usuario = await authService.obterSessao(id);
      if (!usuario) {
        return responderNaoAutenticado(reply);
      }
      request.usuario = usuario;
    },
  );
}
