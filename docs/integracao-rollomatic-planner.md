# Integração Rollomatic Planner ao Boletim Diário

## Objetivo
O Boletim Diário e seu Supabase são a fonte principal. A programação avançada do Rollomatic foi incorporada como módulo do mesmo app, sem substituir nem apagar as tabelas existentes.

## Implementado no GitHub
- Tabelas isoladas `planner_qualities`, `planner_reembalagens`, `planner_products`, `planner_weights`, `planner_schedules` e `planner_items`.
- Tela de programação por data, linha/embaladeira, produto, fardos e quatro turnos.
- Publicação explícita dos fardos programados para o saldo usado pelo Boletim Diário, através da função `sync_planner_to_programacao(date)`.
- A publicação mantém os lançamentos manuais existentes e recusa sincronizar se encontrar uma linha manual com a mesma marca, formato e metragem, evitando sobrescrever programação sem confirmação.
- A publicação atualiza/remove apenas as linhas que ela própria criou, identificadas por `planner_sync_key`.
- A produção real continua a ser lançada nos boletins. Os quatro campos de turno do planner são planejamento/controle separado e não são copiados como produção efetiva.

## Preservação e segurança
- Não alterar nem apagar os dados atuais de `boletins`, `cadastros` e `programacao_itens`.
- As novas tabelas têm prefixo `planner_`; a única alteração aditiva na tabela antiga é a coluna nullable `planner_sync_key` e sua constraint UNIQUE.
- RLS limita programações aos usuários autenticados proprietários; os catálogos são compartilhados entre usuários autenticados.
- A sincronização é transacional no PostgreSQL e usa o usuário autenticado para selecionar a programação do dia.
- Nenhuma chave ou segredo foi adicionado ao repositório.

## Ainda necessário antes de produção
1. Aplicar, na ordem, as migrações `20261023000100_integracao_rollomatic_planner.sql` e `20261023000200_publicar_programacao_planner_no_boletim.sql` no projeto Supabase do Boletim Diário.
2. Validar a execução da migração e da RPC no banco real; não há acesso administrativo ao banco nesta sessão para aplicar ou testar as migrações diretamente.
3. Importar os catálogos e dados históricos reais do Rollomatic após exportação/backup validado do banco antigo. As migrations do repositório não contêm o catálogo completo de produção.
4. Testar com usuário operador e administrador, inclusive conflito com programação manual, exclusão de itens e atualização do saldo.
5. Confirmar o build e os fluxos na prévia antes de publicar para os usuários.

## Fluxo de uso após aplicar as migrações
1. Abra **Programação de produção** e cadastre os produtos necessários.
2. Lance os fardos por embaladeira e os valores por turno.
3. Use **Sincronizar com saldo do boletim** para publicar a meta diária.
4. Registre a produção real no boletim normalmente; o saldo será calculado pelo mecanismo existente.
