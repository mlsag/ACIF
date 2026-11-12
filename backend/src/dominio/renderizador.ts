// Renderizador de variáveis com whitelist e validação prévia do disparo (T14).
// Módulo puro: sem Prisma, sem rede e sem log. Regras em docs/arquitetura.md, "Renderizador (T14)".
//
// Sintaxe estrita: um placeholder é exatamente `{nome}`, com `nome` na whitelist (com diferença
// entre maiúsculas e minúsculas). Qualquer outra coisa entre chaves é desconhecida, e chave solta,
// dupla ou aninhada é sintaxe inválida. Não há escape: chave literal no texto não é suportada.

import type { VariaveisComunicado } from './comunicado.js';
import { PLACEHOLDERS, type NomeCanal, type Placeholder } from './valores.js';

/** Campo de uma versão de comunicado que pode conter placeholders. */
export type CampoTexto = 'assunto' | 'corpo';

/** Tamanho máximo do nome desconhecido devolvido no erro (o resto é cortado). */
export const MAX_NOME_NO_ERRO = 40;

export type ErroTemplate =
  { codigo: 'placeholder_desconhecido'; placeholder: string } | { codigo: 'sintaxe_invalida' };

/**
 * Erro da validação prévia. `valor_ausente` sem `alunos` vem do comunicado (`prazo`); com `alunos`,
 * é a quantidade de destinatários sem o valor. Nunca traz texto do docente nem dado do aluno.
 */
export type ErroDisparo =
  | (ErroTemplate & { canal: NomeCanal; campo: CampoTexto })
  | { codigo: 'valor_ausente'; placeholder: Placeholder; alunos?: number };

/** Só os campos do aluno que viram placeholder (minimização: sem e-mail, telefone ou RA). */
export interface DadosAlunoRender {
  nome: string;
  curso: string;
  termo: string;
}

export interface ContextoRender {
  aluno: DadosAlunoRender;
  variaveis: VariaveisComunicado | null;
}

/** Texto a enviar: `assunto` ou `corpo` de uma versão, com o canal dela. */
export interface TextoParaEnvio {
  canal: NomeCanal;
  campo: CampoTexto;
  texto: string;
}

export interface EntradaValidacao {
  textos: readonly TextoParaEnvio[];
  variaveis: VariaveisComunicado | null;
  /** Destinatários já resolvidos pelo filtro (T13). */
  alunos: readonly DadosAlunoRender[];
}

type Origem =
  | { de: 'aluno'; valor: (aluno: DadosAlunoRender) => string }
  | { de: 'comunicado'; valor: (variaveis: VariaveisComunicado | null) => string | undefined };

/**
 * De onde vem o valor de cada placeholder. O `satisfies` obriga a mapear toda entrada de
 * `PLACEHOLDERS`: um placeholder novo sem origem não compila.
 */
const ORIGENS = {
  nome_aluno: { de: 'aluno', valor: (a) => a.nome },
  curso: { de: 'aluno', valor: (a) => a.curso },
  termo: { de: 'aluno', valor: (a) => a.termo },
  prazo: { de: 'comunicado', valor: (v) => v?.prazo },
} as const satisfies Record<Placeholder, Origem>;

type Segmento = { tipo: 'texto'; texto: string } | { tipo: 'placeholder'; nome: Placeholder };

function ehPlaceholder(nome: string): nome is Placeholder {
  return (PLACEHOLDERS as readonly string[]).includes(nome);
}

function chaveDoErro(erro: ErroTemplate): string {
  return erro.codigo === 'placeholder_desconhecido' ? `d:${erro.placeholder}` : 's';
}

/** Divide o texto em trechos literais e placeholders, numa passada só. */
function tokenizar(texto: string): { segmentos: Segmento[]; erros: ErroTemplate[] } {
  const segmentos: Segmento[] = [];
  const erros = new Map<string, ErroTemplate>();
  const registrar = (erro: ErroTemplate) => erros.set(chaveDoErro(erro), erro);
  let literal = '';
  let i = 0;

  while (i < texto.length) {
    const c = texto[i]!;
    if (c === '}') {
      registrar({ codigo: 'sintaxe_invalida' });
      i += 1;
      continue;
    }
    if (c !== '{') {
      literal += c;
      i += 1;
      continue;
    }
    // Próxima chave depois da que abriu: tem de ser a que fecha.
    let fim = i + 1;
    while (fim < texto.length && texto[fim] !== '{' && texto[fim] !== '}') fim += 1;
    if (fim >= texto.length || texto[fim] === '{') {
      registrar({ codigo: 'sintaxe_invalida' });
      i += 1;
      continue;
    }
    const nome = texto.slice(i + 1, fim);
    if (ehPlaceholder(nome)) {
      if (literal) segmentos.push({ tipo: 'texto', texto: literal });
      literal = '';
      segmentos.push({ tipo: 'placeholder', nome });
    } else {
      registrar({
        codigo: 'placeholder_desconhecido',
        placeholder: nome.slice(0, MAX_NOME_NO_ERRO),
      });
    }
    i = fim + 1;
  }
  if (literal) segmentos.push({ tipo: 'texto', texto: literal });
  return { segmentos, erros: [...erros.values()] };
}

/** Trim; vazio ou só espaços conta como ausente. */
function limpar(bruto: string | undefined): string | undefined {
  const valor = bruto?.trim();
  return valor ? valor : undefined;
}

function valorDoComunicado(nome: Placeholder, variaveis: VariaveisComunicado | null) {
  const origem: Origem = ORIGENS[nome];
  return origem.de === 'comunicado' ? limpar(origem.valor(variaveis)) : undefined;
}

/** Valor do placeholder para o contexto, já limpo. */
function valorDe(nome: Placeholder, contexto: ContextoRender): string | undefined {
  const origem: Origem = ORIGENS[nome];
  return origem.de === 'aluno'
    ? limpar(origem.valor(contexto.aluno))
    : valorDoComunicado(nome, contexto.variaveis);
}

/** Confere a sintaxe e a whitelist de um texto e devolve os placeholders usados. */
export function analisarTemplate(
  texto: string,
): { ok: true; placeholders: Set<Placeholder> } | { ok: false; erros: ErroTemplate[] } {
  const { segmentos, erros } = tokenizar(texto);
  if (erros.length > 0) return { ok: false, erros };
  const placeholders = new Set<Placeholder>();
  for (const s of segmentos) if (s.tipo === 'placeholder') placeholders.add(s.nome);
  return { ok: true, placeholders };
}

/**
 * Validação prévia do disparo (T16, etapa 1). Bloqueia (`ok:false`) se algum texto tiver
 * placeholder desconhecido ou sintaxe inválida, se `{prazo}` for usado sem valor no comunicado,
 * ou se algum destinatário não tiver valor para um placeholder usado (o disparo inteiro para).
 */
export function validarDisparo(
  entrada: EntradaValidacao,
): { ok: true } | { ok: false; erros: ErroDisparo[] } {
  const erros: ErroDisparo[] = [];
  const usados = new Set<Placeholder>();

  for (const { canal, campo, texto } of entrada.textos) {
    const { segmentos, erros: errosTexto } = tokenizar(texto);
    for (const erro of errosTexto) erros.push({ ...erro, canal, campo });
    for (const s of segmentos) if (s.tipo === 'placeholder') usados.add(s.nome);
  }

  // Ordem fixa (a da whitelist), para a resposta ser estável.
  for (const nome of PLACEHOLDERS) {
    if (!usados.has(nome)) continue;
    const origem: Origem = ORIGENS[nome];
    if (origem.de === 'comunicado') {
      if (valorDoComunicado(nome, entrada.variaveis) === undefined) {
        erros.push({ codigo: 'valor_ausente', placeholder: nome });
      }
      continue;
    }
    const semValor = entrada.alunos.filter(
      (aluno) => valorDe(nome, { aluno, variaveis: entrada.variaveis }) === undefined,
    ).length;
    if (semValor > 0) erros.push({ codigo: 'valor_ausente', placeholder: nome, alunos: semValor });
  }

  return erros.length > 0 ? { ok: false, erros } : { ok: true };
}

/**
 * Renderiza um texto para um aluno (uso do worker, T17). Substitui todas as ocorrências numa
 * passada só: o valor inserido não é lido de novo. Não lança: template inválido ou valor ausente
 * (ex.: o cadastro mudou depois do disparo) viram `ok:false`, e o envio vira falha sem derrubar o lote.
 */
export function renderizar(
  texto: string,
  contexto: ContextoRender,
):
  | { ok: true; texto: string }
  | { ok: false; erro: 'template_invalido' }
  | { ok: false; erro: 'valor_ausente'; placeholder: Placeholder } {
  const { segmentos, erros } = tokenizar(texto);
  if (erros.length > 0) return { ok: false, erro: 'template_invalido' };
  let saida = '';
  for (const s of segmentos) {
    if (s.tipo === 'texto') {
      saida += s.texto;
      continue;
    }
    const valor = valorDe(s.nome, contexto);
    if (valor === undefined) return { ok: false, erro: 'valor_ausente', placeholder: s.nome };
    saida += valor;
  }
  return { ok: true, texto: saida };
}
