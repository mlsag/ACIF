# Riscos do ACIF

Probabilidade e impacto são estimativas de planejamento, não medições. Revise este arquivo a cada `/relatorio-orientador`.

| ID | Risco | Prob. | Impacto | Mitigação | Sinal de alerta |
|---|---|---|---|---|---|
| R01 | Cronograma comprimido: cerca de 4 dias por marco para 1 dev, a partir de 03/11/2026 | Alta | Alto | Regra de corte; N2 são as primeiras a sair; `/status-marco` frequente; buffer em 29/11/2026 | Marco com mais de 2 dias de atraso |
| R02 | Prazo de 1 dev: doença, provas ou outras disciplinas tomam dias inteiros | Média | Alto | Tasks pequenas com PR próprio; caminho crítico sempre primeiro; vídeo de backup (T37) | Dia sem PR no caminho crítico |
| R03 | Limitações do número de teste da Meta impedem o envio real pelo WhatsApp, inclusive por templates e pela janela de 24h | Média | Médio | Confirmar os limites cedo; e-mail é o canal garantido; Mock aceito pelo orientador para a demo (ADR 0003) | Envio real sem funcionar no início do M3 (14/11/2026) |
| R04 | LLM alucina datas ou links | Média | Alto | Prompt proíbe inventar; Zod e whitelist; revisão humana obrigatória antes do disparo | Teste com prompts reais gera dado não informado |
| R05 | LLM fora do ar, lento ou com a cota gratuita esgotada, inclusive durante a demo | Média | Médio | Timeout; round robin entre Groq e Gemini; fallback manual (T23) | Erro, timeout ou limite em `/gerar` |
| R06 | Poucos alunos na sessão de teste presencial | Média | Alto | Marcar a sessão cedo; pedir apoio do orientador e da coordenação; não inflar números no relatório | Menos de 10 alunos confirmados no início do M5 (22/11/2026) |
| R07 | E-mail cai em spam ou os dados do TI demoram | Média | Alto | Provedor transacional; pedir os dados ao Prof. Cristian já; remetente neutro como fallback (ADR 0006); testar em contas reais | Mensagem de teste na caixa de spam |
| R08 | Vazamento de dados, inclusive por dado pessoal digitado no prompt de um LLM gratuito | Média | Alto | LLM só recebe o texto do docente; aviso na tela (T25); dados sintéticos fora da sessão de teste; logs sem PII; segredos criptografados; descarte (T44) | PII encontrada em log, teste ou prompt |
| R09 | Crescimento de escopo: já entraram T42, T43, T44 e o round robin; o protótipo traz mais ações fora do backlog | Alta | Alto | Item novo só por ADR; N3 nunca entra; congelamento em 21/11/2026; cortar N2 cedo | Pedido de mudança sem ADR |
| R11 | Texto do TCC não entregue até 25/11/2026 ou entregue tarde demais para as correções | Média | Alto | Escrever por marco com `/capitulo-tcc`, em paralelo ao código; entregar o quanto antes; marcar `[VERIFICAR]` nos resultados ainda sem dados | Capítulo atrasado em relação ao marco |
| R12 | Demo depende da máquina do aluno e da internet local para os provedores | Média | Alto | Um comando para subir tudo (T34); ensaios no local; Mocks; vídeo de backup (T37) | Falha ao subir o ambiente em um ensaio |
| R14 | Modelos gratuitos mudam ou são descontinuados, como o anúncio sobre o Llama no Groq | Média | Médio | Modelos em configuração; dois provedores; testar com chaves reais na T21 | Modelo configurado deixa de responder |
| R13 | Uso de IA questionado pela banca, ou aluno incapaz de explicar o código | Média | Alto | Diário ADD; seção "O que eu preciso saber explicar na banca"; `/simular-banca` | Task fechada sem o aluno saber explicá-la |
