# Boas práticas aplicadas

Este texto resume, com palavras próprias, o que sistemas de acompanhamento de auditoria costumam herdar do Instituto de Auditores Internos (IIA), da ISO 19011, do COSO e do ciclo constatação → recomendação → plano de ação → evidência → validação. Não reproduz o texto das normas.

## O que cada referência pede na prática

O IIA trata a auditoria interna como atividade independente e objetiva, baseada em evidência, com acompanhamento depois do relatório. Uma constatação boa separa quatro coisas: o critério (o que deveria acontecer), a condição (o que aconteceu), a causa e o efeito. Sem essa separação, o plano de ação ataca o sintoma e a validação vira opinião.

A ISO 19011 organiza a auditoria em princípios e em processo. Os princípios que mudam o desenho deste sistema são integridade, apresentação justa, zelo profissional, confidencialidade, independência e abordagem baseada em evidência. O processo não termina no relatório: o acompanhamento verifica se a ação foi implementada e se ela trata a constatação.

O COSO lembra que controle interno é processo, não um relatório. Avaliação de risco, atividade de controle, informação e monitoramento se encontram aqui no plano de ação: alguém é dono da correção, existe prazo, existe evidência e alguém que não é o dono confirma se o controle passou a existir.

O ciclo usado na tela é o seguinte.

1. **Constatação**, com critério, condição, causa, efeito e classificação.
2. **Recomendação**, que diz o que a auditoria espera, com prioridade e prazo sugerido.
3. **Plano de ação**, com responsável, prazo, situação e uma resposta explícita: atende integralmente, atende parcialmente ou não atende. Resposta parcial ou negativa exige justificativa. Isso evita “plano cumprido” que não cobre o que foi pedido.
4. **Evidência**, registrada por quem executa. Aceitar um plano sem evidência não é permitido.
5. **Validação** por outra pessoa. Quem é responsável pelo plano não valida a própria entrega. Aceite com ressalva ou rejeição exige comentário. Rejeição devolve o plano para andamento.
6. **Escalonamento** quando o prazo aperta: aos 15 dias o aviso é do responsável, aos 7 dias sobe para a área de riscos, e o vencimento sobe para a administração.

## Como isso virou regra no sistema

| Prática | Onde está |
| --- | --- |
| Critério, condição, causa e efeito | Tabela `constatacoes` e a ficha da auditoria |
| Recomendação separada do plano da gestão | Tabela `recomendacoes` |
| Dono, prazo e grau de atendimento | Tabela `planos_acao`, com trava no banco para a justificativa |
| Evidência antes do aceite | Regra de validação na ação do servidor |
| Segregação de quem faz e quem valida | Bloqueio de autovalidação |
| Independência do auditor externo | Papel `auditor`, somente leitura, por auditoria atribuída |
| Confidencialidade | Notas sigilosas cifradas; e-mail sem condição, efeito ou nota |
| Rastreabilidade | Trigger em `trilha_auditoria`; log de acesso à parte |
| Monitoramento do prazo | Alertas `d15`, `d7` e `vencido`, únicos por plano |
| Prestação de contas do acesso | Aprovação, revogação e expiração do auditor |

## Papéis

A administração (Tony) governa quem entra, aprova o auditor externo, pode revogar a qualquer momento e define expiração. A área de riscos conduz o acompanhamento: registra o plano, a evidência e a validação. O auditor externo não altera nada. Ele só lê as auditorias que lhe foram atribuídas, e só enquanto o perfil e a atribuição estiverem aprovados, não revogados e dentro da data.

Auditor externo pendente não vê dado de auditoria. A política de linha no Postgres repete essa regra; a tela não é a única barreira.

## Alertas

O aviso não substitui o acompanhamento. Ele marca três momentos e para. O mesmo plano não recebe dois e-mails de “7 dias”. Se o prazo for alterado, os alertas daquele plano são apagados pelo servidor e o ciclo recomeça. Plano concluído ou cancelado sai da fila. O e-mail leva código da auditoria, código da constatação, prazo e um resumo do plano, com o responsável em cópia direta e os administradores em cópia oculta. Condição, efeito e nota sigilosa ficam no sistema.

## O que ficou de fora de propósito

Isto não é um sistema de papéis de trabalho, nem um GRC completo, nem um repositório de arquivos de evidência. A evidência é uma referência (protocolo, caminho ou link), não um anexo binário. Também não há cadastro público: a conta nasce de um convite do administrador.
