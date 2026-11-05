# ADR 0007: IA como núcleo com fallback

- **Status:** Aceito
- **Data:** 03/11/2026
- **Prazo para decidir:** 05/11/2026 (original: 18/10/2026)
- **Quem decide:** orientador
- **Tasks afetadas:** T21, T22, T23, T25, T26

## Contexto

As telas colocam a geração por IA no centro do fluxo, mas o `mvp tcc.odt` define como núcleo o cadastro e o envio de comunicados. Um LLM pode falhar ou gerar conteúdo incorreto.

## Opções

1. **IA como núcleo do produto, sempre com fallback manual:** mantém o diferencial e o sistema funciona sem o LLM.
2. **IA como extra opcional:** reduz o risco, mas afasta o produto das telas.
3. **IA obrigatória, sem fallback:** fluxo mais simples, mas o sistema para se o LLM falhar.

## Decisão

**Decidido pelo orientador** ([resposta do orientador](../orientador/2026-11-03-resposta.md), registrada em 03/11/2026): a IA é usada sempre com revisão humana e opção de escrita manual.

A resposta tratou "central" como depender de uma única IA e pede múltiplas IAs gratuitas, o que está resolvido no [ADR 0004](0004-provedor-llm.md). A pergunta original, sobre a IA como parte central do trabalho, foi entendida como respondida de forma implícita.

## Consequências

- A revisão humana antes do disparo é obrigatória.
- A T23 é N1: o fluxo completo precisa funcionar sem LLM.
- O capítulo de resultados deve avaliar a IA e o fallback.
