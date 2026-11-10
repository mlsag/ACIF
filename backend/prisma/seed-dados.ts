// Dados do seed: funções puras, testáveis sem banco.
// Só dados sintéticos (ADR 0009): domínio reservado example.com (RFC 2606), nomes "Aluno Sintético NN",
// RA com prefixo SINT e telefone nulo (não há faixa de telefone reservada; regra 7 do CLAUDE.md).

import { NOMES_CANAIS, type NomeCanal } from '../src/dominio/valores.js';

export const DOMINIO_SINTETICO = 'example.com';
export const QUANTIDADE_ALUNOS = 20;
export const EMAIL_ADMIN_PADRAO = `admin@${DOMINIO_SINTETICO}`;
/** Senha padrão só para desenvolvimento local. Em produção, SEED_ADMIN_SENHA é obrigatória. */
export const SENHA_ADMIN_DEV = 'acif-dev-somente-local';
const TAMANHO_MINIMO_SENHA = 12;

const CURSOS = [
  'Análise e Desenvolvimento de Sistemas',
  'Gestão Empresarial',
  'Mecatrônica Industrial',
] as const;
const PERIODOS = ['Manhã', 'Noite'] as const;
const TERMOS = ['1', '2', '3', '4', '5', '6'] as const;

export interface AlunoSintetico {
  ra: string;
  nome: string;
  email: string;
  telefone: null;
  curso: string;
  turma: string | null;
  periodo: string;
  termo: string;
}

export interface CanalInicial {
  nome: NomeCanal;
  ativo: boolean;
}

export interface DadosAdmin {
  nome: string;
  email: string;
  senha: string;
}

export const CANAIS_INICIAIS: readonly CanalInicial[] = NOMES_CANAIS.map((nome) => ({
  nome,
  ativo: true,
}));

function escolher<T>(lista: readonly T[], indice: number): T {
  return lista[indice % lista.length] as T;
}

/** Gera alunos determinísticos e claramente fictícios. */
export function gerarAlunosSinteticos(quantidade = QUANTIDADE_ALUNOS): AlunoSintetico[] {
  return Array.from({ length: quantidade }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return {
      ra: `SINT${String(i + 1).padStart(4, '0')}`,
      nome: `Aluno Sintético ${n}`,
      email: `aluno.sintetico${n}@${DOMINIO_SINTETICO}`,
      telefone: null,
      curso: escolher(CURSOS, i),
      turma: i % 4 === 0 ? null : escolher(['A', 'B'], i),
      periodo: escolher(PERIODOS, i),
      termo: escolher(TERMOS, i),
    };
  });
}

/** Trava do seed: recusa qualquer aluno que não seja claramente sintético. */
export function garantirAlunoSintetico(aluno: AlunoSintetico): void {
  const sintetico =
    aluno.email.endsWith(`@${DOMINIO_SINTETICO}`) &&
    /^Aluno Sintético \d{2,}$/.test(aluno.nome) &&
    /^SINT\d{4}$/.test(aluno.ra) &&
    aluno.telefone === null;
  if (!sintetico) {
    throw new Error('seed recusado: aluno fora do padrão de dados sintéticos');
  }
}

/** Lê os dados do admin do ambiente; a senha padrão só vale fora de produção. */
export function lerDadosAdmin(env: NodeJS.ProcessEnv = process.env): DadosAdmin {
  const email = env.SEED_ADMIN_EMAIL?.trim() || EMAIL_ADMIN_PADRAO;
  const senhaInformada = env.SEED_ADMIN_SENHA?.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('SEED_ADMIN_EMAIL inválido');
  }
  if (!senhaInformada && env.NODE_ENV === 'production') {
    throw new Error('SEED_ADMIN_SENHA é obrigatória em produção');
  }
  const senha = senhaInformada || SENHA_ADMIN_DEV;
  if (senha.length < TAMANHO_MINIMO_SENHA) {
    throw new Error(`SEED_ADMIN_SENHA precisa de ao menos ${TAMANHO_MINIMO_SENHA} caracteres`);
  }

  return { nome: 'Administrador', email, senha };
}
