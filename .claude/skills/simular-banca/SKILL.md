---
name: simular-banca
description: Use para treinar a defesa do TCC do ACIF. Gera 15 perguntas prováveis da banca e sabatina o aluno uma por uma, avaliando as respostas.
---

# /simular-banca

**Entrada:** nenhuma. **Saída:** sabatina interativa e balanço final.

## Passos

1. Leia `docs/arquitetura.md`, `docs/adr/`, `docs/diario-add.md`, `docs/riscos.md`, `docs/backlog.yaml` e o estado real do código.
2. Gere 15 perguntas específicas sobre o ACIF, cobrindo arquitetura, escolhas, LGPD, uso de IA e limitações. Inclua por que o escopo mudou e o que foi cortado.
3. Mostre **uma pergunta por vez** e espere a resposta.
4. Avalie cada resposta: o que ficou bom, o que faltou e como melhorar, citando o arquivo de referência. Corrija erros factuais.
5. No fim, mostre os pontos fortes, os pontos a estudar e os arquivos a rever.

## Nunca

- Mostrar todas as perguntas de uma vez.
- Responder pelo aluno antes de ele tentar.
- Elogiar uma resposta errada.
- Basear uma pergunta em funcionalidade que não existe sem deixar isso claro.
