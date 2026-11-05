# ADR 0006: remetente do e-mail

- **Status:** Aceito
- **Data:** 03/11/2026
- **Prazo para decidir:** 05/11/2026 (original: 18/10/2026)
- **Quem decide:** orientador
- **Tasks afetadas:** T08, T15, T42, T43

## Contexto

O protótipo mostra `coordenacao.ads@fatec.sp.gov.br` como remetente, mas enviar por esse domínio exige SPF/DKIM no DNS institucional. A T15 foi antecipada para o M1, então esta decisão afeta a confirmação de e-mail dos alunos.

## Opções

1. **Domínio `@fatec.sp.gov.br`:** mais confiável para o aluno, mas depende do setor de TI institucional.
2. **Remetente neutro + reply-to institucional:** independe do DNS institucional, mas parece menos oficial.

## Decisão

**Decidido pelo orientador** ([resposta do orientador](../orientador/2026-11-03-resposta.md), registrada em 03/11/2026):
- Uma tela administrativa permite cadastrar os dados de disparo de e-mail.
- O aluno solicita os dados ao Prof. Cristian, do TI da Fatec.
- Se os dados demorarem, usa-se um remetente neutro como fallback.

**Nota técnica:** a tela guarda os dados de SMTP e de remetente. SPF e DKIM são configurados no DNS do domínio, não no sistema, e por isso continuam dependendo do TI.

## Consequências

- A opção 2 exige avisar os alunos sobre o remetente e testar a entrega (R07 em [riscos.md](../riscos.md)).
- A tela de revisão deve mostrar o remetente real, não o do protótipo.
