# ADR 0008: quem aprova docentes

- **Status:** Proposto
- **Data:** 03/11/2026
- **Prazo para decidir:** 05/11/2026 (original: 25/10/2026)
- **Quem decide:** orientador
- **Tasks afetadas:** T07, T10

## Contexto

Só usuários aprovados podem enviar comunicados. É preciso definir quem aprova e como, sem criar um sistema de permissões, já que múltiplos papéis são N3. A tela de login cita a Secretaria Acadêmica e o Suporte TI para primeiro acesso.

## Opções

1. **Flag simples de aprovação no N1:** um admin do seed aprova ou bloqueia; simples e suficiente.
2. **Aprovação pela coordenação de cada curso:** mais próximo da realidade, mas exige papéis por curso.
3. **Lista prévia de e-mails autorizados:** evita a etapa de aprovação, mas alguém precisa mantê-la.

## Decisão

Pendente. **Recomendação:** opção 1.

**Pergunta ao orientador:** quem deve ser o responsável pela aprovação?

## Consequências

- Usa `usuarios.status_aprovacao` e `usuarios.aprovado_por`.
- Docente pendente não loga.
- Um único admin é suficiente para o TCC, mas não reflete uma estrutura com vários responsáveis.
