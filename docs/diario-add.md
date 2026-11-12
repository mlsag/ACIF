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

## T01 — Estrutura do repo, docker-compose, lint e GitHub Actions (10/11/2026)

- **PR:** #8 (aberto; o merge é do aluno). CI verde no run 42846111009, jobs `checks` e `compose`, commit 4e8c9a3.
- **O que a IA gerou:**
  - O agente `arquiteto` propôs o plano e verificou em container que a LTS ativa era o Node 26.13.0.
  - Implementou o esqueleto em npm workspaces, com backend Fastify e frontend React/Vite/Tailwind.
  - Criou o docker-compose com `db`, `api`, `worker` e `web`, a configuração de ESLint, Prettier, TypeScript e Vitest e o workflow de CI.
  - O agente `qa` revisou com evidências, incluindo um teste de falha derrubando o banco.
  - Desvios feitos pela IA por conta própria, aceitos pelo aluno: TypeScript 6.0.3 em vez do 7, porque o typescript-eslint ainda não suporta o 7; worker dividido em dois arquivos para ser testável; arquivos de configuração além dos previstos.
- **O que o aluno decidiu, corrigiu ou rejeitou:**
  - Aprovou o plano.
  - Escolheu usar `DOCKER_CONTEXT=default` sem mudar a configuração do Docker.
  - Escolheu o Node 26, com o 24 como plano B.
  - Dispensou o `act`: o workflow foi validado só com o actionlint.
  - Abriu o PR #8.
  - Nada foi rejeitado, segundo o aluno.
- **Prompts relevantes:** nenhum além dos comandos do fluxo (`/proxima-task`, `/executar-task`, `/revisar-task`, `/fechar-task`) e das respostas às perguntas de decisão.
- **Lições:**
  - Rodar as ferramentas em container evitou instalar Node na máquina do aluno.
  - Verificar a versão LTS em vez de presumi-la mudou a escolha do Node 20, previsto no plano original, para o 26.

## T03 — Schema Prisma, migration e seed (10/11/2026)

- **PR:** #9 (aberto; o merge é do aluno). CI verde no run 42863300892, jobs `checks` e `compose`, commit 4a5380f. O primeiro run do PR (42858251176, commit f3b09a4) falhou no job `compose`.
- **O que a IA gerou:**
  - O agente `backend` propôs o plano e verificou em container que o Prisma 7.10.1 e o argon2 0.45.2 funcionam no Node 26.
  - O mesmo agente apontou lacunas do ER sem decidi-las sozinho: status e papel, datas, obrigatoriedade de campos em `alunos`, `jsonb`, telefone e unicidade de `canais.nome`.
  - Implementou as 6 tabelas, a migration inicial e o seed idempotente, com 1 admin com senha argon2id, 20 alunos sintéticos com e-mails `@example.com` e 2 canais.
  - Criou o serviço `migrate` no docker-compose, o banco de teste no CI e testes por critério de aceite.
  - O agente `arquiteto` deu parecer, via `/mudanca-contrato`, aprovando a chave única em `canais.nome`, sem ADR.
  - O agente `qa` revisou com evidências.
  - Desvios aceitos pelo aluno: `migrate deploy` em vez de `reset` nos testes; geração automática do cliente Prisma antes de typecheck, testes e build; aviso de atualização do Prisma desligado, porque sugeria uma versão RC.
  - Erro da IA corrigido na revisão do plano: o agente afirmou que os comandos do `CLAUDE.md` estavam em TODO, mas eles já estavam preenchidos desde a T01.
  - Falha encontrada no CI e corrigida: o serviço `migrate` rodava com UID 1000, mas no runner do GitHub a pasta tem outro dono, o que gerava `EACCES` ao gravar o cliente Prisma. A falha foi reproduzida localmente com outro UID e corrigida passando `ACIF_UID` e `ACIF_GID` do runner no job `compose`.
- **O que o aluno decidiu, corrigiu ou rejeitou:**
  - Aceitou o pacote de preenchimento das lacunas do ER.
  - Aprovou a mudança de contrato que torna `canais.nome` único.
  - Escolheu o seed automático, desligável com `SEED_AUTO=false`.
  - Escolheu manter o `/health` sem mudança.
  - Abriu o PR #9.
  - Autorizou a correção do CI.
  - Nada foi rejeitado, segundo o aluno.
- **Prompts relevantes:** nenhum além dos comandos do fluxo (`/executar-task`, `/mudanca-contrato`, `/revisar-task`, `/fechar-task`) e das respostas às perguntas de decisão.
- **Lições:**
  - Verificar a versão do Prisma em vez de usar a tag `latest` evitou adotar uma versão RC.
  - O CI pegou uma falha de permissão que o ambiente local não mostrava; reproduzi-la com outro UID confirmou a causa antes da correção.

## T06 — Auth: login, hash, JWT httpOnly, middleware e logout (10/11/2026)

- **PR:** #11 (mergeado em 10/11/2026). CI verde no run 42874449069, incluindo o passo "Auth de ponta a ponta (T06)" no job `compose`, commit 326bfdf.
- **Desvio do fluxo:** o PR #11 foi mergeado antes do `/revisar-task`. A revisão do agente `qa` aprovou a task depois, sem correções, então não houve impacto; o fluxo prevê o merge só depois da revisão.
- **O que a IA gerou:**
  - O agente `backend` propôs o plano e verificou no container as versões de `@fastify/cookie`, `@fastify/jwt`, `@fastify/rate-limit` e `zod`.
  - Implementou `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` e o hook de autenticação reutilizável, em camadas `rota → AuthService → UsuarioRepository`.
  - Escreveu 45 testes de auth e testes com o banco real.
  - Acrescentou por conta própria: token aceito só pelo cookie, não pelo cabeçalho `Authorization`; handler global de erros que padroniza 400, 429 e 500 sem vazar detalhes.
  - O agente `qa` revisou com evidências nos testes e no compose real.
- **O que o aluno decidiu, corrigiu ou rejeitou:**
  - Escolheu sessão de 8h com checagem no banco a cada requisição.
  - Escolheu o proxy do Vite, sem CORS, para a T10.
  - Escolheu 400 para corpo malformado e 401 genérico para falha de credencial.
  - Escolheu o teste de ponta a ponta no CI.
  - Abriu e mergeou o PR #11.
  - Nada foi rejeitado, segundo o aluno.
- **Prompts relevantes:** nenhum além dos comandos do fluxo (`/executar-task`, `/revisar-task`, `/fechar-task`) e das respostas às perguntas de decisão.
- **Lições:**
  - A revisão encontrou um efeito colateral da decisão do proxy do Vite: o rate limit do login passaria a ser compartilhado por todos os usuários. Virou o risco R15, a tratar na T10.
  - Fazer o merge antes da revisão funcionou desta vez, mas tira da revisão o poder de barrar a entrada de um problema na `main`.

## T12 — API de comunicados: rascunho (título, conteúdo, canais, filtro, variáveis) (10/11/2026)

- **PR:** #13 (aberto; o merge é do aluno). CI verde no run 42886758588, commit e3d27f8.
- **O que a IA gerou:**
  - O agente `backend` propôs o plano e implementou `POST`, `GET` (lista paginada, no máximo 50 por página, em ordem decrescente), `GET /:id`, `PATCH` e `DELETE /comunicados`, em camadas `rota → ComunicadoService → ComunicadoRepository/CanalRepository`.
  - O dono vem sempre da sessão, e toda consulta do repositório filtra por `id_usuario`.
  - Edição e exclusão só em rascunho, de forma atômica, com 409 fora dele. Canal inexistente ou inativo dá 422.
  - Filtro por listas de turma ou por `ids_alunos` (1 a 500); nulo ou `{}` significa todos os alunos ativos. Variáveis: só `{prazo}`.
  - Escreveu 77 testes de rota e 7 com o banco real.
  - O agente `qa` revisou com evidências, incluindo teste de ponta a ponta no compose nos dois sentidos (admin e docente sintético), e aprovou sem correções.
  - Observações não bloqueantes da revisão: página além do total devolve lista vazia; os placeholders dentro do texto só serão validados na T14; o cookie continua válido após o logout até expirar (decisão da T06).
- **O que o aluno decidiu, corrigiu ou rejeitou:**
  - Escolheu 404 para comunicado de outro docente, idêntico ao de id inexistente.
  - Escolheu que o admin vê só os próprios comunicados.
  - Aceitou os formatos de canais, filtro e variáveis como propostos.
  - Deixou para a T13 a divergência dos períodos (`Manhã`/`Noite` no seed x `Matutino`/`Vespertino`/`Noturno` no protótipo).
  - Abriu o PR #13.
  - Nada foi rejeitado, segundo o aluno.
- **Prompts relevantes:** nenhum além dos comandos do fluxo (`/proxima-task`, `/executar-task`, `/revisar-task`, `/fechar-task`) e das respostas às perguntas de decisão.
- **Lições:**
  - Responder com o mesmo 404 para comunicado alheio e inexistente evita revelar a existência de comunicados de outros docentes.
  - Desta vez o fluxo seguiu a ordem prevista, com a revisão antes do merge, ao contrário da T06.

## T14 — Renderizador de variáveis (whitelist) + validação prévia (12/11/2026)

- **PR:** #14 (aberto; o merge é do aluno). CI verde no commit 35696f6, jobs `checks` e `compose`.
- **O que a IA gerou:**
  - O agente `integracao` propôs o plano e implementou o módulo puro `backend/src/dominio/renderizador.ts` (`analisarTemplate`, `validarDisparo`, `renderizar`), sem rota nova e sem mudança de contrato.
  - A origem de cada placeholder é tipada com `satisfies`: placeholder sem origem não compila.
  - A substituição é feita numa passada só, e os erros não trazem dado de aluno.
  - Escreveu 29 testes unitários.
  - Desvios do agente, aceitos pelo aluno: `renderizar` também devolve `template_invalido`; os erros indicam o `canal`.
  - O agente `qa` revisou com evidências e com casos adversos além dos testes (Unicode, `{__proto__}`, 100 mil ocorrências) e aprovou sem bloqueantes.
  - A revisão encontrou:
    - um teste instável da T06: a troca do último caractere da assinatura do JWT às vezes não altera o token (cerca de 1 em 16 execuções), a corrigir em separado;
    - duas imprecisões na doc da arquitetura, corrigidas no fechamento;
    - pontos para a T16: validar `variaveis` com Zod e tratar 0 destinatários.
- **O que o aluno decidiu, corrigiu ou rejeitou:**
  - Escolheu a sintaxe estrita, sem escape.
  - Escolheu validar só no disparo, não no rascunho.
  - Escolheu que aluno sem valor bloqueia o disparo inteiro, com a contagem de afetados.
  - Escolheu não criar endpoint novo de pré-validação.
  - Abriu o PR #14.
  - Nada foi rejeitado, segundo o aluno.
- **Prompts relevantes:** nenhum além dos comandos do fluxo (`/proxima-task`, `/executar-task`, `/revisar-task`, `/fechar-task`) e das respostas às perguntas de decisão.
- **Lições:**
  - Um módulo puro permitiu provar os critérios do disparo com testes unitários antes de a T16 existir.
  - Testar casos adversos fora da suíte revelou um teste instável antigo, que poderia derrubar o CI ao acaso.

## T07 — Cadastro de docente + aprovação (12/11/2026)

- **PR:** #16 (aberto; o merge é do aluno). CI verde no commit 1b986d5, jobs `checks` e `compose` (este inclui o passo novo "Docentes de ponta a ponta (T07)").
- **O que a IA gerou:**
  - O agente `backend` propôs o plano e implementou `POST /docentes/cadastro` (público, rate limit de 5 por hora por IP, conta nasce pendente, `202` idêntico para e-mail duplicado, para não enumerar contas).
  - Implementou também `GET /docentes`, `POST /docentes/:id/aprovar` e `POST /docentes/:id/bloquear`, só para admin (403 para docente), com a guarda `exigirAdmin`. As ações só alcançam o papel docente, então o id de um admin dá 404.
  - O bloqueio derruba a sessão aberta, pela checagem por requisição da T06. Os logs trazem só ids.
  - Escreveu 43 testes de rota, 9 com o banco real e o passo E2E no CI.
  - Desvios do agente, aceitos pelo aluno: o `docker-compose.yml` passa `CADASTRO_RATE_LIMIT_MAX`; `409 conflito` em corrida entre admins; exports de validadores em `rotas/comunicados.ts`; 4 testes antigos ganharam uma linha de config.
  - Riscos registrados: R15 ampliado, R16 (cadastro em massa) e R17 (sem exclusão de docente).
  - O agente `qa` revisou com evidências e com casos adversos (cadastro com o e-mail do admin não altera o admin; `__proto__` e `papel` no corpo dão 400; e-mail com maiúsculas não duplica a conta; a sessão aberta cai após o bloqueio) e aprovou sem bloqueantes.
  - Achados não bloqueantes da revisão:
    - o cadastro duplicado responde cerca de 10 ms mais rápido que o novo, e requisições 400 contam no rate limit; ambos documentados no fechamento (arquitetura e R15);
    - o passo E2E usa e-mail fixo e só passa num banco novo;
    - casos sem teste automatizado: `__proto__`, e-mail com maiúsculas no cadastro e senha fora do BMP.
- **O que o aluno decidiu, corrigiu ou rejeitou:**
  - Escolheu o cadastro público, com a conta nascendo pendente.
  - Escolheu não restringir o domínio do e-mail.
  - Escolheu senha de 12 a 128 caracteres, sem regras de composição.
  - Escolheu que `aprovado_por` guarda o admin da última decisão (aprovação ou bloqueio).
  - Abriu o PR #16.
  - Nada foi rejeitado, segundo o aluno.
- **Prompts relevantes:** nenhum além dos comandos do fluxo (`/proxima-task`, `/executar-task`, `/revisar-task`, `/fechar-task`) e das respostas às perguntas de decisão. A T13 foi pedida primeiro no `/proxima-task`, mas estava bloqueada pela cadeia T15 → T08 → T09; a T07 foi escolhida por não depender de conta externa.
- **Lições:**
  - Medir o tempo de resposta na revisão mostrou que a doc prometia mais do que o código entregava: o hash sempre executado aproxima os tempos, mas não os iguala.
  - Restringir as ações ao papel docente na própria consulta protege o admin por construção, sem uma checagem separada que pudesse ser esquecida.
