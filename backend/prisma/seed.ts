// Seed do ACIF: 1 admin, 20 alunos sintéticos e 2 canais. Pode rodar de novo sem duplicar (upserts).
// O log mostra só contagens: nunca nomes, e-mails ou senha.

import { pathToFileURL } from 'node:url';
import argon2 from 'argon2';
import { criarPrismaClient, type PrismaClient } from '../src/repositories/prisma.js';
import {
  CANAIS_INICIAIS,
  garantirAlunoSintetico,
  gerarAlunosSinteticos,
  lerDadosAdmin,
} from './seed-dados.js';

export interface ContagensSeed {
  admins: number;
  alunos: number;
  canais: number;
}

export interface OpcoesSeed {
  env?: NodeJS.ProcessEnv;
  log?: (linha: string) => void;
  agora?: Date;
}

export async function executarSeed(
  prisma: PrismaClient,
  opcoes: OpcoesSeed = {},
): Promise<ContagensSeed> {
  const { env = process.env, log = console.log, agora = new Date() } = opcoes;
  const admin = lerDadosAdmin(env);
  const alunos = gerarAlunosSinteticos();
  alunos.forEach(garantirAlunoSintetico);

  // Hash fora da transação: argon2id com os parâmetros padrão da biblioteca.
  const hashSenha = await argon2.hash(admin.senha, { type: argon2.argon2id });

  await prisma.$transaction(async (tx) => {
    for (const canal of CANAIS_INICIAIS) {
      await tx.canal.upsert({ where: { nome: canal.nome }, update: {}, create: canal });
    }

    // update vazio: rodar o seed de novo não troca a senha de um admin existente.
    await tx.usuario.upsert({
      where: { email: admin.email },
      update: {},
      create: {
        nome: admin.nome,
        email: admin.email,
        senha: hashSenha,
        papel: 'admin',
        status_aprovacao: 'aprovado',
        ativo: true,
      },
    });

    for (const aluno of alunos) {
      await tx.aluno.upsert({
        where: { ra: aluno.ra },
        update: {},
        create: { ...aluno, consentimento_lgpd_em: agora, email_confirmado_em: agora },
      });
    }
  });

  const contagens: ContagensSeed = {
    admins: await prisma.usuario.count({ where: { papel: 'admin' } }),
    alunos: await prisma.aluno.count(),
    canais: await prisma.canal.count(),
  };
  log(JSON.stringify({ evento: 'seed_concluido', ...contagens }));
  return contagens;
}

async function main(): Promise<void> {
  const prisma = criarPrismaClient();
  try {
    await executarSeed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((erro: unknown) => {
    // Só a mensagem: o erro do seed não carrega dados de aluno.
    console.error(
      JSON.stringify({
        evento: 'seed_falhou',
        erro: erro instanceof Error ? erro.message : String(erro),
      }),
    );
    process.exit(1);
  });
}
