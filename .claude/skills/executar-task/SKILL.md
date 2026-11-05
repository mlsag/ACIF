---
name: executar-task
description: Use para implementar uma task do backlog do ACIF, de ponta a ponta, com branch própria, plano aprovado, testes e PR. Recebe o ID da task.
argument-hint: <ID>
---

# /executar-task

**Entrada:** ID da task. **Saída:** branch, commits, PR (ou texto do PR) e a seção da banca.

## Passos

1. **Validar.** Leia `docs/backlog.yaml` e obtenha a data com `date +%F`. Pare se:
   - a task não existe, não está `todo` ou tem dependência fora de `done`;
   - algum ADR de `depende_adr` ainda não está Aceito ou Rejeitado;
   - é N3 (nunca entra);
   - é N2 e há marco atrasado (`fim` anterior à data atual, com N1 ou IA abertas): recuse e cite a regra de corte;
   - é uma feature nova depois do congelamento de 21/11/2026: peça decisão do aluno;
   - o repositório tem alterações pendentes não relacionadas.
2. **Preparar.** A partir da `main` atualizada, crie `task/<ID>-slug` e marque `status: in_progress` e `branch` no backlog.
3. **Planejar.** Delegue ao subagente em `agente`. Ele **primeiro apresenta um plano**: arquivos, teste por critério de aceite e riscos. **Espere o ok do aluno.**
4. **Implementar.** Com o ok, o subagente implementa com testes. Depois, rode lint e testes e relate o resultado real.
5. **Contrato.** Se tocar `schema.prisma`, `openapi.yaml` ou uma interface de porta, **pause** e chame `/mudanca-contrato`.
6. **Publicar.** Faça o commit em Conventional Commits e abra o PR com `.github/pull_request_template.md`, via `gh` se disponível. Sem `gh`, faça o push se o aluno autorizar e imprima o texto do PR. Grave `pr` no backlog quando houver número.
7. **Encerrar** com a seção **"O que eu preciso saber explicar na banca"**: 3 a 5 pontos sobre o que mudou e por quê. Indique `/revisar-task <ID>`.

## Nunca

- Implementar antes do ok ao plano.
- Marcar `review` ou `done`: isso é de `/revisar-task` e `/fechar-task`.
- Fazer merge do PR.
- Alterar contrato sem `/mudanca-contrato`.
- Dizer que os testes passaram sem tê-los executado.
- Colocar segredo ou PII em commit.
