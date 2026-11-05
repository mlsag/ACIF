# ADR 0003: WhatsApp no N1 ou como fallback

- **Status:** Aceito
- **Data:** 03/11/2026
- **Prazo para decidir:** 05/11/2026 (original: 18/10/2026)
- **Quem decide:** orientador
- **Tasks afetadas:** T19, T20, T24

## Contexto

O objetivo do TCC cita e-mail e WhatsApp, mas a entrega do WhatsApp depende de terceiros. É preciso definir o que acontece se a integração real não ficar pronta.

## Opções

1. **N1 com 3–5 números de teste:** cumpre o objetivo com escopo controlado.
2. **WhatsApp real para todos os alunos:** maior alcance, com mais custo, risco e tempo.
3. **Só e-mail real, WhatsApp apenas com Mock:** elimina a dependência, mas enfraquece o objetivo do TCC.

## Decisão

**Decidido pelo orientador** ([resposta do orientador](../orientador/2026-11-03-resposta.md), registrada em 03/11/2026): WhatsApp no N1, com 1 número para envio e ao menos 3 para teste, em sandbox/staging, usando os números dos envolvidos (aluno, orientador, Rafael e Coordenação). O e-mail segue como canal garantido.

**Mock:** o orientador aceitou a demonstração com Mock se o WhatsApp real não ficar pronto; a correção fica para uma eventual ida à produção (2ª resposta, registrada em 04/11/2026).

Os números de telefone nunca entram no Git; ficam só na configuração local.

## Consequências

- O resultado do TCC deve declarar com clareza o alcance real do WhatsApp.
- Se o plano B for usado, a demo identifica o Mock como Mock.
