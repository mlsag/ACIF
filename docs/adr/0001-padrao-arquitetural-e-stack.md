# ADR 0001: padrão arquitetural e stack

- **Status:** Aceito
- **Data:** 03/11/2026
- **Prazo para decidir:** 05/11/2026 (original: 18/10/2026)
- **Quem decide:** orientador
- **Tasks afetadas:** T01, T03, T04 e, indiretamente, todas as de implementação

## Contexto

Um único desenvolvedor precisa entregar até 30/11/2026 uma API com envio assíncrono, um front e integrações externas. A arquitetura precisa ser simples, testável e fácil de defender na banca.

## Opções

1. **Monolito modular em camadas, com API e worker:** um só código e deploy simples; exige disciplina nas camadas.
2. **Microserviços ou CQRS:** isolamento maior, mas custo operacional incompatível com o prazo.
3. **Monolito sem worker, enviando na própria requisição:** mais simples, porém perde retry e pode estourar o timeout em lotes.

## Decisão

**Aprovada pelo orientador** ([resposta do orientador](../orientador/2026-11-03-resposta.md), registrada em 03/11/2026): monolito modular com processo de envio separado, usando Node (LTS), TypeScript, PostgreSQL e React.

A resposta se refere à stack da seção 1.2 de `RESPOSTA 1.odt`, conferida com [arquitetura.md](../arquitetura.md) em 04/11/2026: Fastify, Zod, Prisma, Vite, Tailwind, TanStack Query, JWT em cookie httpOnly, Vitest, Supertest, Playwright e GitHub Actions.

**Diferenças em relação ao arquivo:**
- **Node:** o arquivo diz Node 20; vale "Node (LTS)", como escreveu o orientador.
- **Hospedagem:** o arquivo cita serviços em nuvem; vale o [ADR 0005](0005-hospedagem.md), tudo local.
- **Provedores de WhatsApp e LLM:** o arquivo os deixa em aberto; seguem nos ADRs [0002](0002-provedor-whatsapp.md) e [0004](0004-provedor-llm.md).

## Consequências

- `rota → service → repository`, sem acesso direto ao Prisma pela rota.
- Portas só em `CanalEnvio` e `LlmProvider`.
- A própria tabela `envios` serve de fila; não há Redis no N1.
- Dois processos para hospedar (ver ADR 0005).
