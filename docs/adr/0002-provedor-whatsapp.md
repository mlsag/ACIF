# ADR 0002: provedor de WhatsApp

- **Status:** Proposto
- **Data:** 03/11/2026
- **Prazo para decidir:** 05/11/2026 (original: 18/10/2026)
- **Quem decide:** orientador
- **Tasks afetadas:** T19, T20

## Contexto

O envio por WhatsApp é parte do objetivo do projeto. Mensagem iniciada fora da janela de 24h exige template pré-aprovado, e o processo de aprovação pode atrasar a entrega.

## Opções

1. **Meta Cloud API:** integração direta com a API oficial; exige configuração da conta comercial.
2. **Twilio:** API oficial por intermediário; a integração pode ser mais simples, com custo por mensagem a verificar.
3. **Provedores não oficiais:** **descartados**, por não seguirem os canais oficiais.

Em qualquer caso, um `MockWhatsAppProvider` é obrigatório para CI e demo.

## Decisão

Pendente. **Recomendação:** API oficial (Meta Cloud ou Twilio) + Mock, escolhendo a que aprovar o template mais rápido com 3–5 números de teste.

**Pergunta ao orientador:** a Fatec tem conta comercial ou número que possa ser usado? Há verba para custo por mensagem?

## Consequências

- O `WhatsAppProvider` isola a escolha; trocar de provedor não afeta o domínio.
- O texto da IA entra numa variável do template.
- O prazo de aprovação do template é um risco (R03 em [riscos.md](../riscos.md)).
