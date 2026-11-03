## Mover "Saldo da programação do dia" para cima

No Boletim, o quadro **Saldo da programação do dia (com este boletim)**, que hoje fica no fim da folha, passa a aparecer logo abaixo do painel **TOTAL | Acumulado/dia | Acumulado mês**, antes do Controle de Produção Diária.

Nova ordem:
1. Turma / Horário / Data
2. Líder
3. TOTAL | Acumulado/dia | Acumulado mês
4. Saldo da programação do dia
5. Controle de Produção Diária (Embaladeiras, Guardanapos, Rolão, Interfolhas...)
6. Paradas, Ocorrências, Observações

Só muda a posição; os números continuam iguais e atualizam ao digitar.

### Técnico
Em `src/components/BoletimForm.tsx`, recortar o bloco da linha ~245 e inserir após o painel de totais (~linha 176). Atualizar a memória de ordem do boletim.
