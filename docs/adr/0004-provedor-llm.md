# ADR 0004: provedor de LLM

- **Status:** Proposto
- **Data:** 03/11/2026
- **Prazo para decidir:** 05/11/2026 (original: 18/10/2026)
- **Quem decide:** orientador
- **Tasks afetadas:** T21, T22, T23

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

Pendente. **Recomendação:** escolher pelo resultado da comparação, sempre atrás do `LlmProvider`.

**Pergunta ao orientador:** há provedor preferido ou verba para a API? O uso de um serviço externo só com o texto do docente é aceitável?

## Consequências

- Trocar de provedor não afeta o domínio.
- O LLM recebe só o texto do docente, nunca dados de aluno.
- O sistema continua funcionando sem o LLM (ADR 0007).
