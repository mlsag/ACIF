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
