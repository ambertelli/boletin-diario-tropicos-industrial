# Diário de Produção (Boletim Conversão) + Programação Diária

Como a programação diária não existe neste app, ela será criada aqui junto com o diário, e cada boletim lançado debita automaticamente dela.

## Turnos (escala 6x1, 24h)
- 4 turmas: A, B, C, D
- 4 horários fixos de 6h: 00:00–06:00, 06:00–12:00, 12:00–18:00, 18:00–24:00
- No boletim, o líder escolhe a turma e o horário (a escala 6x1 faz a turma do horário mudar ao longo dos dias)

## Telas
1. **Entrar** – login por e-mail e senha para cada líder.
2. **Painel do dia** – data, programação do dia com Programado / Produzido / Saldo por produto, barra de progresso, total do dia e acumulado do mês, e os 4 horários com status (lançado ou pendente).
3. **Programação diária** – cadastrar por data os itens: Marca + Formato + Metros/Folhas + Quantidade programada.
4. **Novo boletim** – fiel ao modelo enviado:
   - Cabeçalho: Turma, Horário, Data, Líder
   - Embaladeiras 1 (4 rolos), 2 (12/16), 3 (8 rolos), 4 (12/16), 5 (Toalha 2 rolos): linhas de Marca, Formato, Metros, Produção
   - Total do boletim, Acumulado/dia, Acumulado mês (automáticos)
   - Segunda escolha, Guardanapos, Rolão, Interfolhas
   - Paradas de máquinas (máquina, nº, início, fim, descrição)
   - Ocorrências com funcionários
   - Acidente de trabalho
   - Observações
   - Ao escolher Marca/Formato/Metros, mostra o saldo restante da programação
5. **Histórico** – lista de boletins por data/turma, abrir, editar e imprimir no layout do modelo.
6. **Cadastros** – marcas, formatos e máquinas para escolher em listas.

## Regra de débito
- Cada linha de produção com Marca + Formato + Metros igual a um item da programação do mesmo dia debita aquela quantidade.
- Saldo = Programado − soma das produções lançadas no dia (todas as turmas).
- Produção sem item programado aparece como "fora da programação".
- Editar ou excluir um boletim recalcula o saldo na hora.

## Visual
Cores da marca Trópico's (laranja claro nos títulos de seção como no modelo), layout tipo planilha, pensado para tablet/computador.

## Detalhes técnicos
- Lovable Cloud: login, banco de dados com tabelas de programação, boletins, linhas de produção, paradas, ocorrências, acidentes e cadastros; perfis em tabela de papéis (líder / administrador).
- Saldo calculado por consulta agregada (não armazenado), evitando divergência.
- Testes para a regra de débito (programado 2.000, lançado 432 → saldo 1.568) e totais dia/mês.
