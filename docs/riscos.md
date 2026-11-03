# Riscos do ACIF

Probabilidade e impacto são estimativas de planejamento, não medições. Revise este arquivo a cada `/relatorio-orientador`.

| ID | Risco | Prob. | Impacto | Mitigação | Sinal de alerta |
|---|---|---|---|---|---|
| R01 | Cronograma comprimido: cerca de 4 dias por marco para 1 dev, a partir de 03/11/2026 | Alta | Alto | Regra de corte; N2 são as primeiras a sair; `/status-marco` frequente; buffer em 29/11/2026 | Marco com mais de 2 dias de atraso |
| R02 | Prazo de 1 dev: doença, provas ou outras disciplinas tomam dias inteiros | Média | Alto | Tasks pequenas com PR próprio; caminho crítico sempre primeiro; vídeo de backup (T37) | Dia sem PR no caminho crítico |
| R03 | Atraso na aprovação do template do WhatsApp | Alta | Alto | Iniciar logo após o ADR 0002; e-mail é o canal garantido; Mock para CI e demo; ADR 0003 define o plano B | Template não aprovado até o início do M3 (14/11/2026) |
| R04 | LLM alucina datas ou links | Média | Alto | Prompt proíbe inventar; Zod e whitelist; revisão humana obrigatória antes do disparo | Teste com prompts reais gera dado não informado |
| R05 | LLM fora do ar ou lento | Média | Médio | Timeout; 1 retry; fallback manual (T23) | Erro ou timeout em `/gerar` |
| R06 | Poucos alunos cadastrados para o teste real | Média | Alto | QR code se houver tempo (T11); pedir apoio do orientador e da coordenação; não inflar números no relatório | Menos de 10 alunos no início do M5 (22/11/2026) |
| R07 | E-mail cai em spam | Média | Alto | Provedor transacional; SPF/DKIM ou remetente neutro + reply-to (ADR 0006); testar em contas reais | Mensagem de teste na caixa de spam |
| R08 | Vazamento de dados de alunos | Baixa | Alto | LLM só recebe o texto do docente; logs sem PII; rate limit; checklist da T35; segredos fora do Git | PII encontrada em log, teste ou payload do LLM |
| R09 | Crescimento de escopo, inclusive por ações do protótipo fora do backlog | Alta | Alto | Item novo só por ADR; N3 nunca entra; congelamento em 21/11/2026 | Pedido de mudança sem ADR |
| R10 | Decisões do orientador demoram (ADRs vencem em 05/11/2026) | Média | Alto | Enviar os ADRs com recomendação pronta; seguir com abstrações e Mock; registrar qualquer premissa | ADR Proposto depois do prazo |
| R11 | Texto do TCC não aprovado até 25/11/2026, pois o tempo de revisão é curto | Média | Alto | Confirmar a data com o orientador; escrever por marco com `/capitulo-tcc`, sem deixar para o fim | Capítulo atrasado em relação ao marco |
| R12 | Plano gratuito hiberna o worker ou a API | Média | Médio | Avaliar no ADR 0005; testar por 24h (T34); vídeo de backup | Envios parados com o worker inativo |
| R13 | Uso de IA questionado pela banca, ou aluno incapaz de explicar o código | Média | Alto | Diário ADD; seção "O que eu preciso saber explicar na banca"; `/simular-banca` | Task fechada sem o aluno saber explicá-la |
