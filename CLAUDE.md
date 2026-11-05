# ACIF — App de Comunicação Interna Fatec

A Fatec Garça cadastra comunicados e os envia de forma centralizada aos alunos, por e-mail e WhatsApp.
A IA gera as duas versões do texto, sempre com fallback manual e revisão humana antes do disparo.
É um TCC de 1 desenvolvedor. **Entrega final: 30/11/2026. Congelamento de features: 21/11/2026.**

## Comece aqui

- Fonte de verdade das tasks: [docs/backlog.yaml](docs/backlog.yaml).
- Use a data atual do sistema. Escreva datas absolutas (DD/MM/AAAA).
- Documentação em português do Brasil. No código, nomes de domínio em português (`usuarios`, `comunicados`, `CanalEnvio`) e termos técnicos em inglês.
- Decisão pendente não vira fato: fica como ADR Proposto.

## Camadas

```
React → rotas (Zod, auth, rate limit) → services → repositories (Prisma) → PostgreSQL
                                           │
                                           ├─ CanalEnvio → EmailCanal, WhatsAppCanal → provedores
                                           └─ LlmProvider → provedor de LLM
```

São dois processos com um único código: **API** e **worker de envio**. A fila é a tabela `envios`. Tudo roda localmente em containers até a apresentação ([ADR 0005](docs/adr/0005-hospedagem.md)).

### Regras duras

1. **Rota não acessa Prisma.** Sempre `rota → service → repository`.
2. **Integrações só por porta:** `CanalEnvio` e `LlmProvider`.
3. **LLM nunca recebe dado de aluno.** Só o texto do docente.
4. **Placeholders só da whitelist:** `{nome_aluno}`, `{curso}`, `{prazo}`, `{termo}`.
5. **Logs sem PII.** Sem consentimento, o aluno não é cadastrado. Dados sintéticos, exceto na sessão de teste controlada.
6. **WhatsApp só por provedor oficial.** O Mock é obrigatório para CI e demo.
7. **Nunca mostrar número fictício**, inclusive os que aparecem nos protótipos.
8. **Sem over-engineering:** nada de microserviços, CQRS, DDD tático, Kubernetes ou Redis no N1.

## Fluxo ADD obrigatório

```
/proxima-task → /executar-task Txx → /revisar-task Txx → /fechar-task Txx
```

Uma task = uma branch `task/Txx-slug` = um PR. O merge é sempre do aluno.

## Definition of Done

- [ ] Todos os critérios de aceite têm evidência
- [ ] Testes e lint verdes
- [ ] Docs afetadas atualizadas
- [ ] `docs/backlog.yaml` atualizado
- [ ] Entrada em `docs/diario-add.md`

## Mudança de contrato

Só por `/mudanca-contrato`. Vale para `schema.prisma`, `openapi.yaml` e as interfaces `CanalEnvio` e `LlmProvider`.

## Escopo

| Nível | Conteúdo | Regra |
|---|---|---|
| N1 | Login, aprovação de docente, cadastro público de aluno, rascunho, destinatários, e-mail e WhatsApp, configuração pelo admin, status | Obrigatório |
| IA | Geração das 2 versões, edição, reescrita | Núcleo, sempre com fallback manual |
| N2 | QR code, histórico navegável, agendamento, busca, reenvio de falhas | Só se o marco estiver no prazo |
| N3 | Dashboard, taxa de leitura, múltiplos papéis | Fora desta entrega |

**Regra de corte:** se um marco atrasar mais de 2 dias, corte primeiro as N2 do marco seguinte. N3 nunca entra. Item fora do backlog só entra por ADR.

## Skills

| Comando | Quando usar |
|---|---|
| `/proxima-task` | Escolher a próxima task |
| `/executar-task <ID>` | Implementar a task, com plano aprovado, testes e PR |
| `/revisar-task <ID>` | Conferir critérios com evidência e dar veredito |
| `/fechar-task <ID>` | Encerrar a task aprovada e atualizar docs e diário |
| `/status-marco` | Ver progresso, bloqueios, caminho crítico e cortes |
| `/adr <título>` | Registrar uma decisão como Proposto |
| `/mudanca-contrato <descrição>` | Avaliar mudança em schema, OpenAPI ou porta |
| `/capitulo-tcc <marco\|tema>` | Redigir um capítulo a partir das evidências |
| `/relatorio-orientador` | Gerar o resumo semanal |
| `/simular-banca` | Treinar a defesa |

## Agentes (`.claude/agents/`)

| Agente | Quando usar |
|---|---|
| `arquiteto` | Contratos, estrutura, ADRs e parecer de mudança |
| `backend` | API, services, repositories, auth, cadastro, disparo e worker |
| `frontend` | Telas fiéis ao protótipo, cliente tipado e MSW |
| `integracao` | Canais, providers e Mock, LLM, prompts e renderizador |
| `qa` | Critérios com evidência, cenários de falha, E2E e matriz de testes |
| `documentacao` | Docs, diagramas, diário ADD e TCC, sem inventar resultados |

## Comandos do projeto

<!-- TODO(T01): substituir pelos comandos reais quando a T01 criá-los. -->

```
TODO: subir ambiente
TODO: lint
TODO: testes
TODO: migrations e seed
```

## Documentação

- [Arquitetura](docs/arquitetura.md)
- [Roadmap](docs/roadmap.md)
- [Backlog](docs/backlog.yaml)
- [ADRs](docs/adr/)
- [Riscos](docs/riscos.md)
- [Diário ADD](docs/diario-add.md)
- [Mapa do TCC](docs/tcc/mapa-capitulos.md)
- [Relatórios ao orientador](docs/orientador/)
- [Telas e design system](docs/design/telas/)
- [Diagramas originais](docs/design/diagramas/)
