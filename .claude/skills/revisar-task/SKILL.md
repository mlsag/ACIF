---
name: revisar-task
description: Use depois de /executar-task para o agente qa conferir uma task do ACIF com evidência e dar veredito aprovado ou reprovado. Recebe o ID da task.
argument-hint: <ID>
---

# /revisar-task

**Entrada:** ID da task em `in_progress`. **Saída:** veredito, evidências e lista do que corrigir.

## Passos

1. Leia a task em `docs/backlog.yaml` e confirme que está em `in_progress`, com branch.
2. Delegue ao agente `qa`, na branch da task, para:
   1. conferir cada critério de aceite com evidência: teste, comando ou saída;
   2. checar as regras de camada: rota sem Prisma e integrações só por porta;
   3. checar a LGPD: LLM sem dados de aluno, logs sem PII, consentimento;
   4. checar se contratos foram alterados sem `/mudanca-contrato`;
   5. rodar a suíte completa e o lint.
3. Mostre uma tabela: critério, resultado e evidência.
4. Dê o veredito:
   - **Aprovado**, só com todos os critérios comprovados e a suíte verde: marque `status: review`.
   - **Reprovado**: mantenha `status: in_progress` e liste o que corrigir.
5. Indique o próximo passo: `/fechar-task <ID>` ou a correção seguida de nova revisão.

## Nunca

- Aprovar sem evidência ou com teste vermelho.
- Corrigir código de aplicação durante a revisão.
- Marcar `done`.
