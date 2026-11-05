---
name: capitulo-tcc
description: Use para redigir ou atualizar um capítulo do TCC do ACIF a partir das evidências do repositório, sem fabricar resultados. Recebe um marco ou tema.
argument-hint: <marco|tema>
---

# /capitulo-tcc

**Entrada:** marco ou tema. **Saída:** capítulo em `docs/tcc/` e lista de pendências.

## Passos

1. Encontre o capítulo e as fontes em `docs/tcc/mapa-capitulos.md`.
2. Delegue ao agente `documentacao` a leitura de `docs/`, ADRs, diário ADD, código e PRs relacionados.
3. Redija ou atualize o arquivo `docs/tcc/<slug>.md`, em português do Brasil.
4. Cite arquivos e PRs como evidência de cada afirmação técnica ou resultado.
5. Marque `[VERIFICAR]` onde faltar dado. Decisões em ADR Proposto aparecem como pendentes.
6. Liste no fim as pendências e as perguntas ao aluno.

## Nunca

- Fabricar resultados, números, depoimentos ou citações bibliográficas.
- Apresentar plano como se estivesse feito.
- Apresentar Mock como envio real.
