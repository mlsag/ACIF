import { z } from 'zod';

/** Segredo padrão só para desenvolvimento local. Em produção, JWT_SECRET é obrigatório. */
export const JWT_SECRET_DEV = 'acif-dev-somente-local-jwt-secret-nao-usar-em-producao';
const TAMANHO_MINIMO_SEGREDO = 32;

export interface ConfigAuth {
  jwtSecret: string;
  sessaoHoras: number;
  cookieSecure: boolean;
  loginRateLimitMax: number;
  /** Cadastros públicos de docente por hora, por IP (T07). */
  cadastroRateLimitMax: number;
  /** true quando o segredo é o padrão de desenvolvimento (o server avisa no log). */
  usandoSegredoDev: boolean;
}

const booleano = z.enum(['true', 'false']).transform((v) => v === 'true');

const esquemaEnv = z.object({
  NODE_ENV: z.string().optional(),
  JWT_SECRET: z.string().trim().optional(),
  SESSAO_HORAS: z.coerce.number().int().min(1).max(24).default(8),
  COOKIE_SECURE: booleano.optional(),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
  CADASTRO_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(5),
});

/** Lê e valida a configuração de auth. Variáveis vazias contam como ausentes. */
export function lerConfigAuth(env: NodeJS.ProcessEnv = process.env): ConfigAuth {
  const limpo = Object.fromEntries(
    Object.entries(env).filter(([, v]) => v !== undefined && v !== ''),
  );
  const resultado = esquemaEnv.safeParse(limpo);
  if (!resultado.success) {
    // Só os nomes das variáveis: nunca o valor (pode ser o segredo).
    const nomes = resultado.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`configuração de auth inválida: ${nomes}`);
  }
  const dados = resultado.data;
  const producao = dados.NODE_ENV === 'production';

  if (!dados.JWT_SECRET && producao) {
    throw new Error('JWT_SECRET é obrigatório em produção');
  }
  const jwtSecret = dados.JWT_SECRET || JWT_SECRET_DEV;
  if (jwtSecret.length < TAMANHO_MINIMO_SEGREDO) {
    throw new Error(`JWT_SECRET precisa de ao menos ${TAMANHO_MINIMO_SEGREDO} caracteres`);
  }
  if (producao && jwtSecret === JWT_SECRET_DEV) {
    throw new Error('JWT_SECRET de desenvolvimento não pode ser usado em produção');
  }

  return {
    jwtSecret,
    sessaoHoras: dados.SESSAO_HORAS,
    cookieSecure: dados.COOKIE_SECURE ?? producao,
    loginRateLimitMax: dados.LOGIN_RATE_LIMIT_MAX,
    cadastroRateLimitMax: dados.CADASTRO_RATE_LIMIT_MAX,
    usandoSegredoDev: jwtSecret === JWT_SECRET_DEV,
  };
}
