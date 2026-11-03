# ADR 0005: hospedagem

- **Status:** Proposto
- **Data:** 03/11/2026
- **Prazo para decidir:** 05/11/2026 (original: 18/10/2026)
- **Quem decide:** orientador
- **Tasks afetadas:** T34

## Contexto

O sistema precisa de uma URL pública estável, com API, worker, front e PostgreSQL. Um plano gratuito pode hibernar processos, o que pararia o worker.

## Opções

1. **Infraestrutura da Fatec:** se existir; custo e acesso a confirmar.
2. **Render, Railway ou Fly + Neon ou Supabase:** configuração rápida; limites dos planos gratuitos a verificar.

## Decisão

Pendente. **Recomendação:** plano gratuito, com atenção à hibernação do worker, salvo se a Fatec oferecer infraestrutura.

**Pergunta ao orientador:** a Fatec oferece infraestrutura para o projeto?

## Consequências

- A T34 exige o worker ativo sem cair por 24h, o que testa a escolha.
- Dados de alunos ficam num serviço terceiro se a infraestrutura for externa; isso se liga ao ADR 0009.
