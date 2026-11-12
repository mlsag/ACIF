// Dados fixos dos mocks MSW (T04). Só dados sintéticos: e-mails @example.com, nomes
// "Sintético" e nenhum telefone ou número fictício (regra 7). Os tipos vêm do openapi.yaml.

import type {
  ComunicadoDetalhe,
  ComunicadoResumo,
  Docente,
  ErroApi,
  UsuarioSessao,
} from '../api/tipos';

/** Senha aceita pelo mock de login; qualquer outra dá o 401 genérico. */
export const SENHA_MOCK = 'senha-sintetica-mock';

export const USUARIO_MOCK: UsuarioSessao = {
  id: 1,
  nome: 'Docente Sintético',
  email: 'docente.mock@example.com',
  papel: 'docente',
};

export const DOCENTES_MOCK: Docente[] = [
  {
    id: 10,
    nome: 'Docente Pendente Sintético',
    email: 'pendente.mock@example.com',
    status_aprovacao: 'pendente',
    data_cadastro: '2026-11-12T10:00:00.000Z',
  },
];

export const COMUNICADOS_MOCK: ComunicadoDetalhe[] = [
  {
    id: 1,
    titulo: 'Entrega do Projeto Integrador',
    conteudo: 'Olá, {nome_aluno}! A entrega do Projeto Integrador vai até {prazo}.',
    prompt_original: 'Avisar sobre a entrega do projeto integrador até sexta 23h59',
    status: 'rascunho',
    canais: ['email', 'whatsapp'],
    filtro_destinatarios: { curso: ['Gestão Empresarial'], termo: ['4'] },
    variaveis: { prazo: '20/11/2026' },
    data_criacao: '2026-11-12T10:00:00.000Z',
    data_envio: null,
  },
];

export function resumir(c: ComunicadoDetalhe): ComunicadoResumo {
  return {
    id: c.id,
    titulo: c.titulo,
    status: c.status,
    canais: c.canais,
    data_criacao: c.data_criacao,
    data_envio: c.data_envio,
  };
}

export const ERROS_MOCK = {
  naoAutenticado: {
    erro: 'nao_autenticado',
    mensagem: 'Credenciais inválidas ou sessão expirada.',
  },
  naoEncontrado: { erro: 'nao_encontrado', mensagem: 'Comunicado não encontrado.' },
  docenteNaoEncontrado: { erro: 'nao_encontrado', mensagem: 'Docente não encontrado.' },
} as const satisfies Record<string, ErroApi>;
