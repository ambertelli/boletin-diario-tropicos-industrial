# Espelhar o app "Programação Diária" (publicado) dentro do Boletim

## Situação atual
- O app [Programação Diária](/projects/28740b1a-a8b3-43a5-bd9e-062824a966a4) (rollomatic-planner) tem **banco de dados próprio**, separado deste Boletim.
- A aba "Programação de produção" daqui tentou recriar esse app com tabelas novas que nunca foram criadas neste banco, por isso aparece "Não foi possível carregar".

## O que vai ser feito
1. **No app Programação Diária** (feito no chat daquele projeto; eu te passo o texto pronto para colar lá): criar um endereço seguro, protegido por uma senha compartilhada, que entrega a programação de uma data: linha/embaladeira, prioridade, produto, formato, metragem, fardos programados.
2. **Neste Boletim**: guardar a mesma senha compartilhada e buscar essa programação pelo servidor (o navegador nunca vê a senha).
3. **A aba "Programação de produção" vira um espelho somente leitura**: mostra exatamente o que está programado no outro app para a data escolhida, agrupado por embaladeira e prioridade, com colunas Programado / Produzido / Saldo.
4. **Débito automático**: o "Produzido" vem dos boletins lançados no dia (todas as turmas), pela mesma regra já usada: mesma marca + formato + metros debita. Produção sem item programado aparece como "fora da programação".
5. **Painel do dia e Novo boletim** também passam a usar essa programação espelhada para o saldo, quando existir para a data (a programação manual antiga continua funcionando como reserva).
6. Remover da aba o cadastro rápido de produto, o "adicionar item" e o botão "Sincronizar" — tudo isso se edita só no app Programação Diária.
7. Sem internet: a última programação carregada fica guardada no aparelho.

## Pontos a confirmar durante a execução
- A unidade: o boletim lança produção em fardos? Se a produção for em pacotes, converto usando pacotes por fardo do cadastro do produto.
- Nomes de marca/formato precisam bater entre os dois apps; mostro os itens que não casarem para ajuste nos Cadastros.

## Detalhes técnicos
- Planner: rota `src/routes/api/public/programacao.ts` (GET `?data=YYYY-MM-DD`), valida header `x-sync-secret` contra segredo `BOLETIM_SYNC_SECRET`, lê com cliente admin e retorna DTO.
- Boletim: segredos `PLANNER_URL` e `PLANNER_SYNC_SECRET`; `createServerFn` autenticado (`requireSupabaseAuth`) faz o fetch; query `programacaoEspelhoQuery(data)` em `src/lib/dados.ts`, mapeada para `ItemProgramacao` e passada a `calcularSaldos`.
- Teste novo: item espelhado 100 fardos − 30 lançados = saldo 70.
- Migrações não aplicadas `supabase/migrations/2026102300*` ficam desativadas (comentadas) e o doc de integração é atualizado.
