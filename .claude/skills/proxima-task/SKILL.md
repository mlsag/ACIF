---
name: proxima-task
description: Use para decidir qual task do ACIF fazer agora. Calcula as tasks elegíveis no backlog e recomenda uma, sem iniciar nada.
---

# /proxima-task

**Entrada:** nenhuma. **Saída:** 1 recomendação e até 2 alternativas.

## Passos

1. Leia `docs/backlog.yaml` e obtenha a data atual com `date +%F`.
2. Calcule as elegíveis: `status: todo`, com todas as tasks de `depende` em `done`. Uma dependência `cut` bloqueia a task até o aluno decidir.
3. Encontre o marco corrente: aquele cujo período contém a data atual. Em BUF ou ENT, considere o marco mais antigo com tasks abertas.
4. Identifique os marcos atrasados: `fim` anterior à data atual e tasks N1 ou IA ainda abertas. Calcule os dias de atraso.
5. Ordene as elegíveis por:
   1. marco mais antigo primeiro;
   2. nível: N1, depois IA, depois N2;
   3. número de tasks que ela destrava, direta e indiretamente, com peso para o caminho até a T41.
6. Exclua N3 e, se houver marco atrasado, exclua as N2.
7. Mostre a recomendação e até 2 alternativas, com: ID, título, marco, nível, agente, critérios de aceite, tasks destravadas e esforço estimado (P, M ou G, deixando claro que é estimativa).
8. Se houver atraso, alerte. Com mais de 2 dias, cite a regra de corte e indique `/status-marco`.
9. Pergunte se deve iniciar e, com a confirmação, indique `/executar-task <ID>`.

## Nunca

- Iniciar uma task, criar branch ou alterar o backlog sem confirmação.
- Recomendar N3.
- Inventar estimativas como se fossem medidas.
