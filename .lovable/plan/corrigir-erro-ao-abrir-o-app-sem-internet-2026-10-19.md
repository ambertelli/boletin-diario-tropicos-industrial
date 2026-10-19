# Corrigir erro ao abrir o app sem internet

## Problema
Sem internet, o app mostra erro em vez de abrir com os dados guardados. A causa exata ainda não foi confirmada; o primeiro passo é reproduzir o erro no app publicado com a internet desligada.

## Causas prováveis (a confirmar)
1. Uma tela que nunca foi aberta com internet não fica guardada. Sem internet, o navegador não tem o que mostrar.
2. As telas carregam dados ao abrir. Sem internet e sem dados guardados, isso vira a página de erro.
3. O teste foi feito na pré-visualização do editor, onde o modo offline fica desligado de propósito.

## O que será feito
1. Reproduzir: publicar, abrir as telas, desligar a internet e recarregar. Anotar onde dá erro.
2. Guardar uma "tela base" do app no aparelho já na primeira visita. Assim qualquer tela abre offline, mesmo que nunca tenha sido aberta.
3. Fazer as telas abrirem mesmo sem dados guardados: mostrar o aviso "Sem conexão – sem dados guardados para esta tela" em vez da página de erro.
4. Traduzir a página de erro para português, com o botão "Tentar novamente".
5. Repetir o teste offline e confirmar que painel, novo boletim, programação e histórico abrem.

## Detalhes técnicos
- Workbox: guardar uma página base (rota pública leve) na instalação e usá-la como reserva das navegações que falharem (`NetworkFirst` com fallback via `setCatchHandler`), sem atingir `/~oauth`.
- Loaders: trocar `ensureQueryData` por uma busca que, offline e sem cache, não lança exceção (prefetch + estado vazio na tela).
- `_authenticated` já usa `getSession()` offline; manter.
- Teste: Playwright com `context.set_offline(True)` contra o build de produção.
