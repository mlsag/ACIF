# ADR 0005: hospedagem

- **Status:** Aceito
- **Data:** 03/11/2026
- **Prazo para decidir:** 05/11/2026 (original: 18/10/2026)
- **Quem decide:** orientador
- **Tasks afetadas:** T11, T34, T36

## Contexto

O sistema precisa de uma URL pública estável, com API, worker, front e PostgreSQL. Um plano gratuito pode hibernar processos, o que pararia o worker.

## Opções

1. **Infraestrutura da Fatec:** se existir; custo e acesso a confirmar.
2. **Render, Railway ou Fly + Neon ou Supabase:** configuração rápida; limites dos planos gratuitos a verificar.

## Decisão

**Decidido pelo orientador** ([resposta do orientador](../orientador/2026-11-03-resposta.md), registrada em 03/11/2026): tudo local, em container na máquina do aluno, até a apresentação. Produção está fora do escopo do TCC e seria outra decisão, com a coordenação, se a Fatec quiser adotar o sistema.

## Consequências

- A T34 deixa de ter URL pública e HTTPS: entrega containers locais e backup.
- Alunos não alcançam o formulário de fora da máquina, então a sessão de teste (T36) é presencial, na mesma rede.
- A demo depende da máquina do aluno, o que reforça o vídeo de backup (R12 em [riscos.md](../riscos.md)).
- Os dados de alunos ficam só nessa máquina (ver ADR 0009).
