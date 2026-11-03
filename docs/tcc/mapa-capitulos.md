# Mapa de capítulos do TCC

Liga cada capítulo ao marco e às fontes de evidência. O conteúdo é redigido com `/capitulo-tcc`, que marca `[VERIFICAR]` onde faltar evidência. A estrutura final deve ser confirmada com o orientador.

| Capítulo | Marco | Tasks principais | Fontes |
|---|---|---|---|
| Introdução, problema, objetivo | M0 | T01–T05 | `mvp tcc.odt`, `docs/design/diagramas/`, ADR 0007 |
| Metodologia ADD e requisitos | M1 | T06–T11, T15 | `docs/diario-add.md`, `CLAUDE.md`, `.claude/`, `docs/backlog.yaml`, ADRs 0008 e 0009 |
| Modelagem e arquitetura | M2 | T12–T14, T16–T18 | `docs/arquitetura.md`, `schema.prisma`, `openapi.yaml`, ADR 0001, código do worker |
| Integrações e IA | M3 | T19–T24 | ADRs 0002, 0003, 0004, 0006 e 0007; `/prompts`; código de `CanalEnvio` e `LlmProvider` |
| Telas e resultados parciais | M4 | T25–T32 | `docs/design/telas/`, código do front, E2E Playwright |
| Testes e resultados | M5 | T34–T38 | `docs/testes.md`, relatório da T36, checklist da T35, ADR 0005, CI |
| Conclusão | M6 | T39–T41 | Todos os anteriores, `docs/riscos.md`, `docs/roadmap.md`, `docs/diario-add.md` |

Regra: nenhum capítulo traz resultado, número ou citação sem fonte verificável.
