// Testes do renderizador de variáveis e da validação prévia do disparo (T14). Sem banco.
// Dados sintéticos; os marcadores provam que o resultado não ecoa texto do docente nem dado do aluno.

import { describe, expect, it } from 'vitest';
import {
  analisarTemplate,
  MAX_NOME_NO_ERRO,
  renderizar,
  validarDisparo,
  type DadosAlunoRender,
  type TextoParaEnvio,
} from '../src/dominio/renderizador.js';

const ALUNO: DadosAlunoRender = {
  nome: 'Aluno Sintético 01',
  curso: 'Curso Sintético',
  termo: '3',
};
const VARIAVEIS = { prazo: 'sexta, 23h59' };

const corpo = (texto: string, canal: TextoParaEnvio['canal'] = 'whatsapp'): TextoParaEnvio => ({
  canal,
  campo: 'corpo',
  texto,
});

describe('critério 1: variável desconhecida bloqueia o disparo', () => {
  it.each([
    ['{email_aluno}', 'email_aluno'],
    ['{Nome_Aluno}', 'Nome_Aluno'],
    ['{NOME_ALUNO}', 'NOME_ALUNO'],
    ['{ nome_aluno}', ' nome_aluno'],
    ['{nome_aluno }', 'nome_aluno '],
    ['{}', ''],
  ])('bloqueia %s como placeholder desconhecido', (template, nome) => {
    const resultado = validarDisparo({
      textos: [corpo(`Olá ${template}, entregue até {prazo}.`)],
      variaveis: VARIAVEIS,
      alunos: [ALUNO],
    });
    expect(resultado).toEqual({
      ok: false,
      erros: [
        {
          codigo: 'placeholder_desconhecido',
          placeholder: nome,
          canal: 'whatsapp',
          campo: 'corpo',
        },
      ],
    });
  });

  it.each([
    ['chave dupla', 'Olá {{prazo}}'],
    ['chave aberta solta', 'Olá { e mais nada'],
    ['chave fechada solta', 'Olá } e mais nada'],
    ['chave aninhada', 'Olá {nome_{curso}}'],
    ['chave aberta no fim', 'Prazo: {prazo'],
  ])('bloqueia %s como sintaxe inválida', (_caso, texto) => {
    const resultado = validarDisparo({
      textos: [corpo(texto)],
      variaveis: VARIAVEIS,
      alunos: [ALUNO],
    });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erros).toContainEqual({
      codigo: 'sintaxe_invalida',
      canal: 'whatsapp',
      campo: 'corpo',
    });
  });

  it('bloqueia erro só no assunto do e-mail', () => {
    const resultado = validarDisparo({
      textos: [
        { canal: 'email', campo: 'assunto', texto: 'Aviso para {aluno}' },
        { canal: 'email', campo: 'corpo', texto: 'Olá {nome_aluno}.' },
      ],
      variaveis: null,
      alunos: [ALUNO],
    });
    expect(resultado).toEqual({
      ok: false,
      erros: [
        {
          codigo: 'placeholder_desconhecido',
          placeholder: 'aluno',
          canal: 'email',
          campo: 'assunto',
        },
      ],
    });
  });

  it('bloqueia o disparo quando só uma das duas versões tem erro', () => {
    const resultado = validarDisparo({
      textos: [
        { canal: 'email', campo: 'assunto', texto: 'Projeto Integrador' },
        corpo('Olá {nome_aluno}, prazo {prazo}.', 'email'),
        corpo('Oi {nome}!', 'whatsapp'),
      ],
      variaveis: VARIAVEIS,
      alunos: [ALUNO],
    });
    expect(resultado).toEqual({
      ok: false,
      erros: [
        {
          codigo: 'placeholder_desconhecido',
          placeholder: 'nome',
          canal: 'whatsapp',
          campo: 'corpo',
        },
      ],
    });
  });

  it('não repete o mesmo erro e corta nomes longos', () => {
    const longo = 'x'.repeat(MAX_NOME_NO_ERRO + 30);
    const resultado = analisarTemplate(`{a} {a} } } {${longo}}`);
    expect(resultado).toEqual({
      ok: false,
      erros: [
        { codigo: 'placeholder_desconhecido', placeholder: 'a' },
        { codigo: 'sintaxe_invalida' },
        { codigo: 'placeholder_desconhecido', placeholder: 'x'.repeat(MAX_NOME_NO_ERRO) },
      ],
    });
  });
});

describe('critério 2: variável sem valor bloqueia o disparo', () => {
  it.each([
    ['sem variáveis', null],
    ['variáveis vazias', {}],
    ['prazo só com espaços', { prazo: '   ' }],
  ])('bloqueia {prazo} %s', (_caso, variaveis) => {
    const resultado = validarDisparo({
      textos: [corpo('Entregue até {prazo}.')],
      variaveis,
      alunos: [ALUNO],
    });
    expect(resultado).toEqual({
      ok: false,
      erros: [{ codigo: 'valor_ausente', placeholder: 'prazo' }],
    });
  });

  it('bloqueia o disparo inteiro quando algum aluno não tem o valor, com a contagem', () => {
    const resultado = validarDisparo({
      textos: [corpo('{nome_aluno}, do {termo}º termo de {curso}: prazo {prazo}.')],
      variaveis: VARIAVEIS,
      alunos: [ALUNO, { ...ALUNO, termo: '' }, { ...ALUNO, termo: '  ' }, { ...ALUNO, nome: ' ' }],
    });
    expect(resultado).toEqual({
      ok: false,
      erros: [
        { codigo: 'valor_ausente', placeholder: 'nome_aluno', alunos: 1 },
        { codigo: 'valor_ausente', placeholder: 'termo', alunos: 2 },
      ],
    });
  });

  it('não exige valor de placeholder que o texto não usa', () => {
    const resultado = validarDisparo({
      textos: [corpo('Olá {nome_aluno}, a aula de amanhã foi cancelada.')],
      variaveis: null,
      alunos: [{ ...ALUNO, termo: '' }],
    });
    expect(resultado).toEqual({ ok: true });
  });

  it('libera o disparo com todos os valores presentes', () => {
    const resultado = validarDisparo({
      textos: [
        { canal: 'email', campo: 'assunto', texto: 'Prazo {prazo}' },
        corpo('{nome_aluno} ({curso}, {termo}º termo): até {prazo}.', 'email'),
        corpo('Oi {nome_aluno}! Até {prazo}.'),
      ],
      variaveis: VARIAVEIS,
      alunos: [ALUNO, { nome: 'Aluno Sintético 02', curso: 'Outro Curso', termo: '1' }],
    });
    expect(resultado).toEqual({ ok: true });
  });

  it('junta erros de template e de valor numa resposta só', () => {
    const resultado = validarDisparo({
      textos: [corpo('{x} até {prazo}')],
      variaveis: null,
      alunos: [],
    });
    expect(resultado).toEqual({
      ok: false,
      erros: [
        { codigo: 'placeholder_desconhecido', placeholder: 'x', canal: 'whatsapp', campo: 'corpo' },
        { codigo: 'valor_ausente', placeholder: 'prazo' },
      ],
    });
  });
});

describe('analisarTemplate', () => {
  it('devolve os placeholders usados, sem repetição', () => {
    const resultado = analisarTemplate('{nome_aluno}, {nome_aluno}: {prazo}');
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect([...resultado.placeholders].sort()).toEqual(['nome_aluno', 'prazo']);
  });

  it('aceita texto sem placeholder', () => {
    expect(analisarTemplate('Sem variáveis.')).toEqual({ ok: true, placeholders: new Set() });
  });
});

describe('renderizar', () => {
  const contexto = { aluno: ALUNO, variaveis: VARIAVEIS };

  it('substitui todas as ocorrências, com valores sem espaços nas pontas', () => {
    const resultado = renderizar(
      '{nome_aluno}! {nome_aluno}, {curso}, {termo}º termo, até {prazo}.',
      {
        aluno: { ...ALUNO, nome: '  Aluno Sintético 01 ' },
        variaveis: VARIAVEIS,
      },
    );
    expect(resultado).toEqual({
      ok: true,
      texto: 'Aluno Sintético 01! Aluno Sintético 01, Curso Sintético, 3º termo, até sexta, 23h59.',
    });
  });

  it('devolve texto sem placeholder igual', () => {
    expect(renderizar('Aviso geral.', contexto)).toEqual({ ok: true, texto: 'Aviso geral.' });
  });

  it('não substitui de novo um valor que contém placeholder', () => {
    const resultado = renderizar('Olá {nome_aluno}', {
      aluno: { ...ALUNO, nome: '{prazo} {curso}' },
      variaveis: VARIAVEIS,
    });
    expect(resultado).toEqual({ ok: true, texto: 'Olá {prazo} {curso}' });
  });

  it('devolve ok:false sem lançar quando falta valor', () => {
    expect(() => renderizar('{prazo}', { aluno: ALUNO, variaveis: null })).not.toThrow();
    expect(renderizar('{prazo}', { aluno: ALUNO, variaveis: null })).toEqual({
      ok: false,
      erro: 'valor_ausente',
      placeholder: 'prazo',
    });
    expect(renderizar('Oi {termo}', { aluno: { ...ALUNO, termo: '' }, variaveis: null })).toEqual({
      ok: false,
      erro: 'valor_ausente',
      placeholder: 'termo',
    });
  });

  it('devolve ok:false sem lançar quando o template é inválido', () => {
    expect(renderizar('Oi {x}', contexto)).toEqual({ ok: false, erro: 'template_invalido' });
    expect(renderizar('Oi {{prazo}}', contexto)).toEqual({ ok: false, erro: 'template_invalido' });
  });
});

describe('sem PII no resultado', () => {
  const TEXTO_MARCADOR = 'Marcador Docente T14 Sintetico';
  const NOME_MARCADOR = 'Marcador Aluno T14 Sintetico';

  it('erros não trazem texto do docente nem dado do aluno', () => {
    const resultado = validarDisparo({
      textos: [corpo(`${TEXTO_MARCADOR} {nome_aluno} {x} } {prazo}`)],
      variaveis: null,
      alunos: [
        { nome: NOME_MARCADOR, curso: 'Curso Marcador T14', termo: '' },
        { nome: '', curso: 'Curso Marcador T14', termo: '2' },
      ],
    });
    expect(resultado.ok).toBe(false);
    const serializado = JSON.stringify(resultado);
    for (const marcador of [TEXTO_MARCADOR, NOME_MARCADOR, 'Curso Marcador T14']) {
      expect(serializado).not.toContain(marcador);
    }
  });
});
