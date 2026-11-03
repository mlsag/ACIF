# ADR 0006: remetente do e-mail

- **Status:** Proposto
- **Data:** 03/11/2026
- **Prazo para decidir:** 05/11/2026 (original: 18/10/2026)
- **Quem decide:** orientador
- **Tasks afetadas:** T08, T15

## Contexto

O protótipo mostra `coordenacao.ads@fatec.sp.gov.br` como remetente, mas enviar por esse domínio exige SPF/DKIM no DNS institucional. A T15 foi antecipada para o M1, então esta decisão afeta a confirmação de e-mail dos alunos.

## Opções

1. **Domínio `@fatec.sp.gov.br`:** mais confiável para o aluno, mas depende do setor de TI institucional.
2. **Remetente neutro + reply-to institucional:** independe do DNS institucional, mas parece menos oficial.

## Decisão

Pendente. **Recomendação:** tentar a opção 1 se o acesso sair logo; caso contrário, opção 2.

**Pergunta ao orientador:** quem administra o DNS de `fatec.sp.gov.br`? É viável configurar SPF/DKIM antes do M1 (06/11/2026)?

## Consequências

- A opção 2 exige avisar os alunos sobre o remetente e testar a entrega (R07 em [riscos.md](../riscos.md)).
- A tela de revisão deve mostrar o remetente real, não o do protótipo.
