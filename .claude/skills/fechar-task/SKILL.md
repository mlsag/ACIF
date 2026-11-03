---
name: fechar-task
description: Use depois de uma revisão aprovada para encerrar uma task do ACIF, atualizar backlog, docs e diário ADD e mostrar o que foi destravado. Recebe o ID da task.
argument-hint: <ID>
---

# /fechar-task

**Entrada:** ID da task. **Saída:** task `done`, docs atualizadas e tasks destravadas.

## Passos

1. Leia `docs/backlog.yaml`. Só continue se `status: review`, que indica revisão aprovada. Caso contrário, indique `/revisar-task <ID>`.
2. Confira os dados do PR. Se faltar o número, peça ao aluno.
3. Pergunte ao aluno o que ele decidiu, corrigiu ou rejeitou, e quais prompts foram relevantes.
4. Marque `status: done`, `concluida_em` com `date +%F`, `branch` e `pr`.
5. Peça ao agente `documentacao` para atualizar as docs afetadas e escrever a entrada em `docs/diario-add.md`.
6. Grave essas alterações na branch da task, com commit e push se o aluno autorizar.
7. Mostre as tasks destravadas: as que passaram a ter todas as dependências em `done`.
8. Lembre que o merge do PR é do aluno e indique `/proxima-task`.

## Nunca

- Fechar sem revisão aprovada.
- Inventar conteúdo do diário: use `[VERIFICAR]` no que o aluno não informar.
- Fazer merge do PR.
