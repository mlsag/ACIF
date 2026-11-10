# Diário da metodologia ADD

Registro do uso de IA no desenvolvimento do ACIF: matéria-prima do capítulo de metodologia e transparência para a banca. Registre só o que aconteceu. Onde faltar evidência, marque `[VERIFICAR]`.

Cada task fechada com `/fechar-task` gera uma entrada neste formato:

```markdown
## Txx — título (DD/MM/AAAA)

- **PR:** #n
- **O que a IA gerou:**
- **O que o aluno decidiu, corrigiu ou rejeitou:**
- **Prompts relevantes:**
- **Lições:**
```

---

## Bootstrap da governança (03/11/2026)

Não é uma task do backlog. Preparou o repositório para o fluxo ADD.

- **PR:** #4 (mergeado em 04/11/2026)
- **O que a IA gerou:** documentação de arquitetura, roadmap, riscos, ADRs Propostos, backlog, subagentes, skills e template de PR.
- **O que o aluno decidiu, corrigiu ou rejeitou:**
  - Definiu o escopo, a arquitetura e o backlog inicial no prompt de bootstrap.
  - Escolheu replanejar os marcos para 03/11–30/11/2026, depois de a IA apontar que as datas originais já tinham passado.
  - Escolheu manter 41 tasks e ajustar T05, T08, T10 e T15, depois de a IA apontar lacunas no backlog.
  - Adicionou os diagramas originais ao repositório e aprovou o tratamento das divergências em relação a eles.
  - Levou as decisões ao orientador e registrou as respostas, que trouxeram mudanças além das recomendações da IA: hospedagem local, telas de configuração e duas IAs gratuitas em round robin.
  - Escolheu a Meta Cloud API e aprovou a ampliação do backlog para 44 tasks, em 04/11/2026.
- **Prompts relevantes:** `prompt-bootstrap-acif.md` (não versionado).
- **Lições:** ler o repositório antes de gerar a documentação expôs conflitos de datas e de modelagem que, de outra forma, virariam fatos na documentação.

## T05 — Levar ADRs 0001-0009 ao orientador e registrar o resultado (10/11/2026)

- **PR:** #5 (mergeado em 10/11/2026). O registro original das decisões entrou no PR #4.
- **O que a IA gerou:**
  - Redigiu os ADRs 0001-0009 a partir das respostas do orientador.
  - Em 04/11/2026, pesquisou em fontes oficiais os provedores OpenAI, Groq, Gemini, Meta e Twilio e concluiu que a API da OpenAI não tem uso gratuito para texto.
  - Apontou ambiguidades nas respostas: o momento do round robin e os ADRs 0007 e 0008, aceitos por interpretação.
  - Propôs e aplicou ajustes de coerência nos ADRs 0002, 0004 e 0005.
- **O que o aluno decidiu, corrigiu ou rejeitou:**
  - Levou o relatório ao orientador e trouxe as 2 respostas, de 03/11/2026 e 04/11/2026.
  - Escolheu a Meta Cloud API, por delegação do orientador.
  - Pediu os ajustes de coerência nos 3 ADRs (0002, 0004 e 0005); a IA havia recomendado ajustar só o 0005.
  - Aprovou os ajustes.
  - Nada foi rejeitado, segundo o aluno.
  - O round robin já nesta entrega foi decisão do orientador, contra a recomendação inicial da IA de deixá-lo para depois.
- **Prompts relevantes:** as 2 respostas do orientador, coladas na sessão e guardadas em [docs/orientador/2026-11-03-resposta.md](orientador/2026-11-03-resposta.md).
- **Lições:**
  - Vale conferir em fonte oficial se uma orientação é viável antes de registrá-la: foi essa pesquisa que mostrou que a API da OpenAI não tem uso gratuito para texto.
  - Marcar como interpretação o que não foi dito de forma explícita, como os ADRs 0007 e 0008 e o momento do round robin, deixa claro o que ainda precisa da confirmação do orientador.
