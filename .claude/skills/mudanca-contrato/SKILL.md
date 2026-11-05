---
name: mudanca-contrato
description: Use antes de alterar schema.prisma, openapi.yaml ou as interfaces CanalEnvio e LlmProvider do ACIF. O agente arquiteto avalia o impacto e libera a mudança. Recebe a descrição.
argument-hint: <descrição>
---

# /mudanca-contrato

**Entrada:** descrição da mudança. **Saída:** parecer e, se aprovada, liberação da alteração.

## Passos

1. Delegue ao agente `arquiteto` para identificar o contrato afetado e confirmar se a mudança é necessária.
2. Liste as tasks impactadas em `docs/backlog.yaml` e as telas em `docs/design/telas/`.
3. Verifique os efeitos em LGPD e nas regras de camada.
4. Dê o parecer: **aprovada** ou **recusada**, com o motivo. Em mudança estrutural ou de escopo, crie um ADR com `/adr`, que fica como Proposto até a decisão.
5. **Espere o ok do aluno.**
6. Com o ok, atualize o ER e os diagramas Mermaid em `docs/arquitetura.md` e os critérios afetados no backlog.
7. Só então libere a alteração do contrato e devolva o controle à task em andamento.

## Nunca

- Alterar um contrato antes do parecer e do ok.
- Omitir tasks ou telas impactadas.
- Aceitar uma mudança que envie dado de aluno ao LLM.
