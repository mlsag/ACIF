---
name: status-marco
description: Use para ver o progresso do ACIF por marco contra as datas, as tasks bloqueadas, o caminho crítico e cortes propostos quando houver risco.
---

# /status-marco

**Entrada:** nenhuma. **Saída:** tabelas de progresso e propostas de corte.

## Passos

1. Leia `docs/backlog.yaml` e obtenha a data com `date +%F`. Calcule os dias restantes até 30/11/2026.
2. Monte uma tabela por marco: período, done/total, N1 + IA done/total, N2 done/total, cortadas e situação (no prazo, em risco, atrasado e dias de atraso).
3. Liste as tasks bloqueadas, com as dependências que faltam, incluindo os ADRs de `depende_adr` ainda não decididos.
4. Calcule o caminho crítico: a maior cadeia de dependências não concluídas até a T41. Mostre se ele cabe nos dias restantes.
5. Mostre as datas-chave: congelamento em 21/11/2026, texto aprovado em 25/11/2026 e entrega em 30/11/2026.
6. Liste os ADRs ainda Propostos em `docs/adr/` que estejam vencidos.
7. Se houver risco, proponha cortes concretos pela regra de corte: com mais de 2 dias de atraso, primeiro as N2 do marco seguinte. Para cada uma, mostre o que se perde e o que destrava. **Pergunte antes de aplicar.**

## Nunca

- Aplicar cortes sem o ok do aluno.
- Sugerir cortar N1 antes de esgotar as N2.
- Colocar N3 no escopo.
- Calcular progresso por outra fonte que não o backlog.
