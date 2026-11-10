# ADR 0004: provedor de LLM

- **Status:** Aceito
- **Data:** 04/11/2026
- **Prazo para decidir:** 05/11/2026 (original: 18/10/2026)
- **Quem decide:** orientador
- **Tasks afetadas:** T21, T22, T23, T25

## Contexto

A IA gera as versões de WhatsApp e e-mail numa única chamada, em PT-BR, com saída JSON. O protótipo exibe "GPT-4o Fatec", mas isso é só uma ilustração e não representa uma escolha.

## Opções

Qualquer provedor pode ficar atrás do `LlmProvider`. A comparação deve usar 5 prompts reais em PT-BR e avaliar:

- JSON válido e placeholders preservados;
- ausência de datas e links inventados;
- qualidade do tom institucional;
- custo, latência e termos de uso de dados.

Os candidatos serão listados aqui com os resultados. `[VERIFICAR]`: a comparação ainda não foi feita.

## Decisão

**Decidido pelo orientador** ([resposta do orientador](../orientador/2026-11-03-resposta.md), 2ª resposta, registrada em 04/11/2026): usar duas IAs gratuitas em round robin já nesta entrega, Groq e Gemini, sempre atrás do `LlmProvider`. A OpenAI entraria se a API fosse gratuita, mas a pesquisa de 04/11/2026 indica que não é.

**Pesquisa em fontes oficiais (04/11/2026):**

| Provedor | Gratuito? | Observações |
|---|---|---|
| OpenAI | **Não** para geração de texto | A [tabela de preços](https://developers.openai.com/api/docs/pricing) não lista plano gratuito, teste ou crédito inicial. O tier "Free" das [regras de limite](https://developers.openai.com/api/docs/guides/rate-limits) é uma faixa de uso de US$ 100/mês, sem modelos gratuitos indicados |
| Groq | Sim, [plano Free](https://console.groq.com/settings/billing/plans) | **Conflito sobre o Llama:** as [descontinuações](https://console.groq.com/docs/deprecations) anunciam o fim de `llama-3.3-70b-versatile` e `llama-3.1-8b-instant` em 16/08/2026 nos planos free e developer, mas a [lista de modelos](https://console.groq.com/docs/models) ainda os mostra. Substituto indicado: `openai/gpt-oss-120b`. Limites só no painel da conta |
| Gemini | Sim, com vários [modelos gratuitos](https://aistudio.google.com/docs/pricing) | Brasil está nas [regiões disponíveis](https://aistudio.google.com/docs/available-regions). Limites só no [AI Studio](https://aistudio.google.com/docs/rate-limits). `gemini-2.5-*` será redirecionado em 01/12/2026 |

**Pendente de verificação na T21:** testar com chaves reais qual modelo do Groq responde no plano Free, comparar os modelos com os 5 prompts reais e confirmar os limites diários no painel: `[VERIFICAR]`. Os nomes dos modelos ficam em configuração, nunca fixos no código.

**Round robin:** uma implementação de `LlmProvider` alterna entre os dois provedores. O retry já previsto vai para o outro provedor; se os dois falharem, vale o fallback manual.

## Consequências

- Trocar de provedor não afeta o domínio.
- O LLM recebe só o texto do docente, nunca dados de aluno.
- **Atenção à LGPD:** no plano gratuito, o [Gemini](https://aistudio.google.com/docs/terms) usa o conteúdo para melhorar produtos, com revisão humana, e pede para não enviar dados pessoais. O [Groq](https://console.groq.com/docs/your-data) não retém por padrão, mas pode guardar por até 30 dias em investigações; os termos sobre treinamento não foram verificados: `[VERIFICAR]`. Como o docente pode digitar o nome de um aluno no prompt, a tela de criação precisa avisar que não se deve incluir dados pessoais.
- Limites diários gratuitos podem acabar durante a demo, o que torna o fallback manual ainda mais importante.
- O sistema continua funcionando sem o LLM (ADR 0007).
