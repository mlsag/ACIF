---
name: adr
description: Use para registrar uma nova decisão arquitetural ou de escopo do ACIF, criando o próximo ADR numerado com status Proposto. Recebe o título.
argument-hint: <título>
---

# /adr

**Entrada:** título. **Saída:** `docs/adr/NNNN-slug.md` com status Proposto.

## Passos

1. Liste `docs/adr/` e calcule o próximo número.
2. Copie `docs/adr/_template.md` para `docs/adr/NNNN-slug.md`.
3. Preencha contexto, opções reais e recomendação com o que o aluno informou e com o repositório. Na data, use `date '+%d/%m/%Y'`.
4. Identifique as tasks afetadas em `docs/backlog.yaml` e ligue-as no campo **Tasks afetadas**.
5. Se a decisão incluir item novo no backlog, descreva a mudança no ADR, mas só altere o backlog depois de aceita.
6. Mostre o ADR e pergunte o que falta.

## Nunca

- Criar um ADR com status Aceito.
- Registrar como decisão algo que ainda está pendente.
- Renumerar ou reescrever ADRs existentes.
