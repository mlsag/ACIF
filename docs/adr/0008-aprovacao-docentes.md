# ADR 0008: quem aprova docentes

- **Status:** Aceito
- **Data:** 03/11/2026
- **Prazo para decidir:** 05/11/2026 (original: 25/10/2026)
- **Quem decide:** orientador
- **Tasks afetadas:** T07, T10

## Contexto

Só usuários aprovados podem enviar comunicados. É preciso definir quem aprova e como, sem criar um sistema de permissões, já que múltiplos papéis são N3. A tela de login cita a Secretaria Acadêmica e o Suporte TI para primeiro acesso.

## Opções

1. **Flag simples de aprovação no N1:** um admin do seed aprova ou bloqueia; simples e suficiente.
2. **Aprovação pela coordenação de cada curso:** mais próximo da realidade, mas exige papéis por curso.
3. **Lista prévia de e-mails autorizados:** evita a etapa de aprovação, mas alguém precisa mantê-la.

## Decisão

**Decidido pelo orientador** ([resposta do orientador](../orientador/2026-11-03-resposta.md), registrada em 03/11/2026): o fluxo foi confirmado pela coordenação e será entregue assim. Entendido como a opção 1, a recomendada: flag simples de aprovação no N1. Outra forma de aprovar entra como mudança depois da banca.

**Responsável (2ª resposta, registrada em 04/11/2026):** a aprovação de docentes passa pelo admin do sistema, que é a coordenação; quem administra a coordenação é a diretoria. No sistema, isso é o papel de administrador, sem criar novos papéis: múltiplos papéis são N3.

## Consequências

- Usa `usuarios.status_aprovacao` e `usuarios.aprovado_por`.
- Docente pendente não loga.
- Um único papel de administrador atende à coordenação e à diretoria no TCC.
