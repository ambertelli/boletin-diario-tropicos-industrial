# Entrar no app sem internet

## Problema
Sem internet, o app cai na tela de login e mostra "E-mail ou senha inválidos", mesmo com a senha certa. A senha não está errada: sem internet o login não consegue falar com o servidor, e o app mostra a mensagem errada.

Ele cai no login porque o acesso guardado no aparelho expira a cada hora. Com internet ele se renova sozinho. Sem internet a renovação falha, e o app trata o líder como "não logado".

## O que será feito
1. **Manter o líder dentro do app sem internet:** se já entrou neste aparelho antes, o app abre direto no painel, mesmo com o acesso vencido. Quando a internet voltar, o acesso é renovado sozinho e a fila de boletins é enviada.
2. **Tela de login sem internet:**
   - Se já existe um acesso guardado no aparelho, vai direto para o painel.
   - Se não existe, mostra um aviso claro: "Sem internet. O primeiro acesso neste aparelho precisa de conexão." O botão Entrar fica desativado.
   - A mensagem "E-mail ou senha inválidos" só aparece quando a senha está mesmo errada.
3. **Botão Sair sem internet:** pede confirmação e avisa que, sem internet, só será possível entrar de novo quando a conexão voltar.
4. **Envio da fila:** se o acesso estiver vencido quando a internet voltar, renova primeiro e depois envia os boletins pendentes.

## Limitação
- Cada líder precisa ter entrado pelo menos uma vez **com internet** naquele aparelho. Não é possível verificar a senha sem internet.

## Detalhes técnicos
- Guard `_authenticated`: offline, ler a sessão gravada pelo cliente direto do armazenamento (chave `sb-<ref>-auth-token`), aceitando-a mesmo expirada, em vez de `getSession()`, que tenta renovar e devolve `null` quando falha.
- `/auth`: usar a mesma leitura para redirecionar; usar `navigator.onLine` e o tipo de erro (`AuthRetryableFetchError`/status 0) para distinguir falta de rede de credencial inválida.
- `sync.ts`: antes de enviar, chamar `supabase.auth.refreshSession()` quando o token estiver expirado.
- Helper compartilhado `sessaoGuardada()` em `src/lib/` + teste unitário (sessão expirada offline é aceita; sem sessão volta para login).
