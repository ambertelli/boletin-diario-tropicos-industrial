# Suporte offline com sincronização automática

## O que o usuário vai ter
- Botão "Instalar app" no celular/tablet/PC (ícone na tela inicial).
- Sem internet, o app continua abrindo (painel, novo boletim, programação, histórico) mostrando os últimos dados vistos.
- Boletins salvos sem internet ficam numa fila no aparelho e são enviados sozinhos quando a conexão volta.
- Faixa no topo: "Sem conexão – X boletins aguardando envio" / "Sincronizando..." / "Tudo sincronizado".
- O saldo da programação no aparelho já desconta o boletim pendente, para o líder ver o efeito na hora.

## Limitações (importante)
- Funciona só no app publicado, não na pré-visualização do editor.
- O primeiro acesso (e o login) precisa de internet. Depois, a sessão fica guardada.
- Se dois líderes editarem o mesmo boletim offline, vale o último enviado.
- Cadastros e programação podem ser consultados offline, mas editá-los exige internet (evita conflitos).

## Etapas
1. Instalável: manifesto com nome, cores da Trópico's e ícones gerados.
2. Offline do app: guardar as telas e arquivos do app no aparelho (atualização automática a cada nova versão).
3. Dados offline: guardar no aparelho os dados já carregados (programação, boletins, cadastros) e reaproveitá-los sem conexão.
4. Fila de envio: ao salvar boletim sem conexão, gravar localmente e reenviar ao reconectar (e ao abrir o app), com aviso de sucesso/erro.
5. Indicador de conexão e pendências no topo.
6. Testes da fila (enfileira offline, envia ao reconectar, remove após sucesso).

## Detalhes técnicos
- `vite-plugin-pwa` com `generateSW`, `registerType: "autoUpdate"`, `injectRegister: null`, `devOptions.enabled: false`, SW em `/sw.js`; navegação `NetworkFirst`, assets com hash `CacheFirst`, `/~oauth` excluído.
- Wrapper único de registro que recusa dev, iframe, hosts de preview Lovable e `?sw=off` (e desregistra `/sw.js` nesses casos).
- Cache de dados: `@tanstack/react-query-persist-client` + persister IndexedDB (`idb-keyval`), `networkMode: "offlineFirst"`.
- Fila: IndexedDB com upsert por `id` gerado no cliente (UUID) para evitar duplicidade; disparo em `online` e no boot; respeita a regra de um boletim por horário/dia (conflito vira aviso ao líder).
- Saldo local: mesclar boletins pendentes nas queries de boletins do dia.
- Sessão de login já persiste no armazenamento do navegador; o guard de rotas usará `getSession()` quando offline para não redirecionar ao login.
