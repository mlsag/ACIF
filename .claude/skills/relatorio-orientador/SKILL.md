---
name: relatorio-orientador
description: Use para gerar o resumo semanal do ACIF ao orientador, em arquivo e em versão curta para o Slack, incluindo as decisões pedidas.
---

# /relatorio-orientador

**Entrada:** nenhuma. **Saída:** `docs/orientador/AAAA-MM-DD.md` e versão curta impressa na conversa.

## Passos

1. Obtenha a data com `date +%F` e localize o relatório anterior em `docs/orientador/`.
2. Leia `docs/backlog.yaml`, `docs/adr/`, `docs/riscos.md` e o `git log` desde o relatório anterior.
3. Gere o arquivo com as seções:
   1. **Feito:** tasks e PRs;
   2. **A seguir:** próximas tasks;
   3. **Bloqueios;**
   4. **Decisões pedidas:** ADRs Propostos, com a pergunta, a recomendação e o prazo;
   5. **Riscos:** os mais relevantes no momento.
4. Escreva datas como DD/MM/AAAA e use linguagem para o orientador, sem jargão do fluxo interno.
5. Imprima a versão curta para colar no Slack, com até 10 linhas.
6. Mostre os dois textos para o aluno revisar antes de enviar.

## Nunca

- Enviar a mensagem por conta própria.
- Marcar como feito o que não está `done`.
- Inventar progresso ou omitir atrasos.
- Incluir dados pessoais de alunos.
