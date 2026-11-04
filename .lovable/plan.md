## Linhas 6, 7 e 8 na mesma grade das embaladeiras

No Boletim, Guardanapo, Rolão e Interfolha passam a ficar em caixas lado a lado, iguais às embaladeiras, continuando a numeração:

1. Embaladeira Nº 1 - 4 Rolos
2. Embaladeira Nº 2 - 12/16 Rolos
3. Embaladeira Nº 3 - 8 Rolos
4. Embaladeira Nº 4 - 12/16 Rolos
5. Embaladeira Nº 5 - Toalha 2 Rolos
6. Linha 6 - Guardanapo
7. Linha 7 - Rolão
8. Linha 8 - Interfolha

- Cada caixa tem as mesmas colunas: Marca, Produção e Saldo prog.
- **Segunda Escolha** fica como está hoje (faixa separada embaixo), com lançamento livre, sem depender da programação diária.
- O TOTAL continua somando só as embaladeiras 1 a 5, como hoje.

### Técnico
- `src/lib/producao.ts`: renomear títulos de guardanapo/rolao/interfolha para "Linha 6 - Guardanapo", "Linha 7 - Rolão", "Linha 8 - Interfolha".
- `src/components/BoletimForm.tsx`: a grade `md:grid-cols-2` passa a renderizar todas as seções exceto `segunda`; `segunda` continua no bloco de faixa larga. Datalists de linhas 6–8 usam embaladeira 6/7/8 da programação.
