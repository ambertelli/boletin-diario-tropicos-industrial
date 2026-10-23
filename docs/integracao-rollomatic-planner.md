# Integração Rollomatic Planner ao Boletim Diário

## Objetivo
O projeto e banco Supabase do Boletim Diário são a fonte principal. A programação avançada será incorporada sem substituir nem migrar destrutivamente as tabelas atuais.

## Proteções adotadas
- Manter intactas as tabelas atuais `boletins`, `cadastros` e `programacao_itens`.
- Introduzir tabelas isoladas com prefixo `planner_` para produtos, qualidades, reembalagens, pesos, programações e itens/turnos.
- Aplicar RLS: programação e itens acessíveis apenas ao usuário autenticado proprietário; catálogos legíveis por usuários autenticados.
- Não importar dados do banco Rollomatic automaticamente: os dois projetos Supabase são diferentes e não há acesso comprovado a um dump/backup confiável.
- Não armazenar chaves ou segredos no repositório.

## Fases
1. **Preparação (esta branch):** migração aditiva, documentação e interface inicial de programação avançada.
2. **Catálogos:** revisar e importar produtos, qualidades, pesos e reembalagens após exportação validada do banco antigo.
3. **Integração do boletim:** mapear os itens programados aos registros de produção por data, linha, formato e metragem; garantir que não haja dupla contagem.
4. **Validação:** conferir RLS com perfis reais, compilar, testar os quatro turnos, testar edição/exclusão e conferir cálculo de saldo.
5. **Publicação:** só depois de backup, aplicação manual/validada da migração no Supabase do Boletim e aprovação da prévia.

## Atenção antes de produção
A migração SQL deve ser revisada e aplicada ao projeto Supabase do Boletim antes de usar a tela. Os catálogos começam vazios de propósito: dados do outro projeto não são copiados sem exportação e conferência. O modelo atual de boletim mede quantidades em unidades próprias; a equivalência entre fardos e quantidades do boletim precisa ser confirmada antes de ativar débito automático de saldo.
