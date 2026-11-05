# ADR 0002: provedor de WhatsApp

- **Status:** Aceito
- **Data:** 04/11/2026
- **Prazo para decidir:** 05/11/2026 (original: 18/10/2026)
- **Quem decide:** aluno, por delegação do orientador
- **Tasks afetadas:** T19, T20, T42, T43

## Contexto

O envio por WhatsApp é parte do objetivo do projeto. Mensagem iniciada fora da janela de 24h exige template pré-aprovado, e o processo de aprovação pode atrasar a entrega.

## Opções

1. **Meta Cloud API:** integração direta com a API oficial; exige configuração da conta comercial.
2. **Twilio:** API oficial por intermediário; a integração pode ser mais simples, com custo por mensagem a verificar.
3. **Provedores não oficiais:** **descartados**, por não seguirem os canais oficiais.

Em qualquer caso, um `MockWhatsAppProvider` é obrigatório para CI e demo.

## Decisão

**Meta Cloud API, com o número de teste**, escolhida pelo aluno em 04/11/2026. O [orientador](../orientador/2026-11-03-resposta.md) definiu a página de administração e o uso de números próprios em sandbox/staging, e deixou a escolha do provedor com o aluno: "não tem caminho certo ou errado".

**Comparação que embasou a escolha (04/11/2026):**

| | Meta (número de teste) | Twilio (sandbox) |
|---|---|---|
| Destinatários | Até 5 verificados, segundo [fontes](https://help.wanotifier.com/en/article/test-phone-number-limitations-kt0ly2/) que citam a Meta; a documentação oficial consultada não traz o número: `[VERIFICAR]` | Quem enviar o código `join`; a adesão [expira em 3 dias](https://www.twilio.com/docs/whatsapp/sandbox) |
| Custo | Gratuito no número de teste, segundo as mesmas fontes: `[VERIFICAR]` | Preço padrão da Twilio, com cota de teste |
| Brasil | Sem restrição encontrada | A Twilio avisa que o Brasil pode estar temporariamente bloqueado |
| Mensagens | Template fora da [janela de 24h](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started); texto livre depois que o destinatário responde | Só templates prontos fora da janela |

Nos dois casos, o destinatário precisa responder para receber texto livre. Os limites do número de teste serão confirmados na T19. Se o envio real não ficar pronto, o Mock é aceito (ADR 0003).

## Consequências

- O `WhatsAppProvider` isola a escolha; trocar de provedor não afeta o domínio.
- O texto da IA entra numa variável do template.
- O prazo do template só pesa fora do número de teste, em uma eventual ida à produção; o risco de limitação do teste é o R03 em [riscos.md](../riscos.md).
