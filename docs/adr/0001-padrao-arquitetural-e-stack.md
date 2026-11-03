# ADR 0001: padrão arquitetural e stack

- **Status:** Proposto
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

Pendente. **Recomendação:** opção 1, com a stack de [arquitetura.md](../arquitetura.md).

**Ponto de atenção:** a stack inicial previa Node 20, que deixou de receber suporte em 04/2026. A recomendação é usar a versão LTS ativa na T01.

**Pergunta ao orientador:** aprova o padrão e a stack? Há alguma tecnologia exigida ou vetada?

## Consequências

- `rota → service → repository`, sem acesso direto ao Prisma pela rota.
- Portas só em `CanalEnvio` e `LlmProvider`.
- A própria tabela `envios` serve de fila; não há Redis no N1.
- Dois processos para hospedar (ver ADR 0005).
