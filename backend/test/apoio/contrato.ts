// Validação de respostas reais contra o openapi.yaml (T04). Usado só em testes.
// Há uma cópia equivalente em frontend/src/test/contrato.ts, para os mocks MSW.

import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
import { parse } from 'yaml';

type Objeto = Record<string, unknown>;

export const METODOS = ['get', 'post', 'put', 'patch', 'delete'] as const;

const ID_SPEC = 'openapi';

// ajv-formats é CommonJS: em ESM o default pode vir aninhado.
const addFormats = ((addFormatsModule as unknown as { default?: unknown }).default ??
  addFormatsModule) as (ajv: Ajv2020) => Ajv2020;

export const spec = parse(
  readFileSync(new URL('../../../openapi.yaml', import.meta.url), 'utf8'),
) as Objeto;

const ajv = new Ajv2020({ strict: false, allErrors: true, validateSchema: false });
addFormats(ajv);
ajv.addSchema({ ...spec, $id: ID_SPEC });

function ponteiro(...partes: string[]): string {
  return partes.map((p) => p.replaceAll('~', '~0').replaceAll('/', '~1')).join('/');
}

function caminhos(): Record<string, Objeto> {
  return spec.paths as Record<string, Objeto>;
}

/** Operações com `x-acif-status: implementado`, como "GET /comunicados/{id}". */
export function operacoesImplementadas(): string[] {
  const lista: string[] = [];
  for (const [caminho, item] of Object.entries(caminhos())) {
    for (const metodo of METODOS) {
      const operacao = item[metodo] as Objeto | undefined;
      if (operacao?.['x-acif-status'] === 'implementado') {
        lista.push(`${metodo.toUpperCase()} ${caminho}`);
      }
    }
  }
  return lista.sort();
}

/**
 * Confere uma resposta contra o contrato. Devolve a lista de problemas (vazia se está conforme).
 * `aceitarDefault` permite cair na resposta `default` quando o status não está declarado.
 */
export function validarResposta(
  metodo: string,
  caminho: string,
  status: number,
  corpo: unknown,
  aceitarDefault = false,
): string[] {
  const operacao = caminhos()[caminho]?.[metodo.toLowerCase()] as Objeto | undefined;
  if (!operacao) return [`operação ${metodo} ${caminho} não existe no openapi.yaml`];

  const respostas = operacao.responses as Record<string, Objeto>;
  let chave = String(status);
  if (!respostas[chave]) {
    if (!aceitarDefault || !respostas.default) {
      return [`status ${status} não declarado em ${metodo} ${caminho}`];
    }
    chave = 'default';
  }

  let resposta = respostas[chave]!;
  let base = `#/${ponteiro('paths', caminho, metodo.toLowerCase(), 'responses', chave)}`;
  const ref = resposta.$ref as string | undefined;
  if (ref) {
    const nome = ref.split('/').pop()!;
    resposta = (spec.components as { responses: Record<string, Objeto> }).responses[nome]!;
    base = ref;
  }

  const conteudo = resposta.content as Record<string, unknown> | undefined;
  if (!conteudo) {
    // O supertest entrega `{}` como corpo de uma resposta vazia.
    const semCorpo =
      corpo === undefined ||
      corpo === null ||
      corpo === '' ||
      (typeof corpo === 'object' && Object.keys(corpo).length === 0);
    return semCorpo ? [] : [`${metodo} ${caminho} ${status} não deveria ter corpo`];
  }
  if (!conteudo['application/json']) {
    return [`${metodo} ${caminho} ${status} sem application/json no contrato`];
  }

  const validar = ajv.getSchema(
    `${ID_SPEC}${base}/${ponteiro('content', 'application/json', 'schema')}`,
  );
  if (!validar) return [`schema de ${metodo} ${caminho} ${status} não encontrado`];
  if (validar(corpo)) return [];
  return (validar.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? ''}`.trim());
}
