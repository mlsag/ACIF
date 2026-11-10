import { describe, expect, it } from 'vitest';
import {
  CANAIS_INICIAIS,
  EMAIL_ADMIN_PADRAO,
  SENHA_ADMIN_DEV,
  garantirAlunoSintetico,
  gerarAlunosSinteticos,
  lerDadosAdmin,
} from '../prisma/seed-dados.js';

describe('dados do seed (critério 3: apenas dados sintéticos)', () => {
  const alunos = gerarAlunosSinteticos();

  it('gera 20 alunos com RA e e-mail únicos', () => {
    expect(alunos).toHaveLength(20);
    expect(new Set(alunos.map((a) => a.ra)).size).toBe(20);
    expect(new Set(alunos.map((a) => a.email)).size).toBe(20);
  });

  it('usa só o domínio reservado example.com, nomes sintéticos, RA SINT e telefone nulo', () => {
    for (const aluno of alunos) {
      expect(aluno.email).toMatch(/^aluno\.sintetico\d{2}@example\.com$/);
      expect(aluno.nome).toMatch(/^Aluno Sintético \d{2}$/);
      expect(aluno.ra).toMatch(/^SINT\d{4}$/);
      expect(aluno.telefone).toBeNull();
      expect(() => garantirAlunoSintetico(aluno)).not.toThrow();
    }
  });

  it('preenche os campos obrigatórios e varia curso, período e termo', () => {
    for (const aluno of alunos) {
      expect(aluno.curso).not.toBe('');
      expect(aluno.periodo).not.toBe('');
      expect(aluno.termo).not.toBe('');
    }
    expect(new Set(alunos.map((a) => a.curso)).size).toBeGreaterThan(1);
    expect(new Set(alunos.map((a) => a.periodo)).size).toBeGreaterThan(1);
    expect(new Set(alunos.map((a) => a.termo)).size).toBeGreaterThan(1);
  });

  it('a trava recusa aluno com e-mail fora do domínio reservado ou com telefone', () => {
    const base = alunos[0]!;
    expect(() => garantirAlunoSintetico({ ...base, email: 'fulano@outro-dominio.test' })).toThrow(
      /sintéticos/,
    );
    expect(() => garantirAlunoSintetico({ ...base, nome: 'Nome Fora do Padrao' })).toThrow(
      /sintéticos/,
    );
    expect(() =>
      garantirAlunoSintetico({ ...base, telefone: 'telefone-qualquer' as unknown as null }),
    ).toThrow(/sintéticos/);
  });

  it('define os 2 canais: email e whatsapp', () => {
    expect(CANAIS_INICIAIS.map((c) => c.nome)).toEqual(['email', 'whatsapp']);
  });
});

describe('dados do admin', () => {
  it('usa admin@example.com e a senha de desenvolvimento quando o ambiente não define', () => {
    expect(lerDadosAdmin({})).toEqual({
      nome: 'Administrador',
      email: EMAIL_ADMIN_PADRAO,
      senha: SENHA_ADMIN_DEV,
    });
  });

  it('usa as variáveis de ambiente quando definidas', () => {
    const dados = lerDadosAdmin({
      SEED_ADMIN_EMAIL: 'coordenacao@example.com',
      SEED_ADMIN_SENHA: 'outra-senha-local-123',
    });
    expect(dados.email).toBe('coordenacao@example.com');
    expect(dados.senha).toBe('outra-senha-local-123');
  });

  it('exige SEED_ADMIN_SENHA em produção', () => {
    expect(() => lerDadosAdmin({ NODE_ENV: 'production' })).toThrow(/obrigatória em produção/);
  });

  it('recusa senha curta e e-mail inválido', () => {
    expect(() => lerDadosAdmin({ SEED_ADMIN_SENHA: 'curta' })).toThrow(/12 caracteres/);
    expect(() => lerDadosAdmin({ SEED_ADMIN_EMAIL: 'sem-arroba' })).toThrow(/inválido/);
  });
});
