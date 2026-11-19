---
impacto: capacidade_nova
secao: adicionado
titulo: Rotas de agenda aceitam token de integração (mcp:read/mcp:write)
---

As rotas de agenda passaram a aceitar Bearer `dsk_…` (linha de `api_tokens`) além da sessão de cookie, por `resolveAuthDual`. O token precisa de `mcp:read` nos GET e `mcp:write` nas escritas, com o papel da sessão (`viewer` lê, `agent` escreve). Ficam só de sessão: PATCH de `agenda/configuracao` (`fn_agenda_settings` exige `auth.uid()`) e POST de `agenda/excecoes` (`calendar_availability_exceptions.user_id` é NOT NULL com `auth.uid()`).
