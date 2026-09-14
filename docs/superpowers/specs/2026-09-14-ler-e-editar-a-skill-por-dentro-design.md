# Ler e editar uma skill por dentro — design

**Data:** 2026-09-14
**Estado:** aprovado o desenho em conversa; falta revisão do documento

---

## O problema, medido

A tela **IA › Skills** deixa instalar do catálogo, enviar `.zip` e desinstalar.
Não deixa **ler** o que uma skill diz ao agente, e muito menos mudar. O rodapé
declara isso: *"Para personalizar uma skill instalada, basta reenviar um `.zip`
com o mesmo nome … Não há editor dentro do sistema nesta fase."*

**E ler é o que mais importa, porque a skill manda mais que o prompt da
empresa.** Medido nesta instalação, hoje:

```
skill        escopo       arquivos   tamanho do corpo
agendamento  PLATAFORMA          0      5.507 caracteres
objecao-preco PLATAFORMA         0      4.009
objecao-preco org                0      4.009
coleta-briefing org              0      3.179
```

Cinco mil e quinhentos caracteres de instrução que chegam ao cliente pelo
WhatsApp, que quem administra a organização **não tem como abrir**. Quando uma
regra da skill contradiz o prompt do agente, não há nem como descobrir que a
contradição existe — só o sintoma, na conversa com o cliente.

O caminho que existe hoje para mudar (reenviar um `.zip` com o mesmo nome) exige
ter o pacote, montar o zip e subir — e não serve de jeito nenhum para as skills
**pré-instaladas do catálogo**, que nunca estiveram na mão de ninguém.

## O que este desenho NÃO faz

- **Não edita o catálogo da plataforma.** A edição é **por organização**: cada
  tenant tem a sua, e são diferentes uma da outra. Editar a `agendamento` na
  PLJR não muda a `agendamento` de nenhum outro tenant, nem a do catálogo.
- **Não põe botão de "restaurar" dentro do editor.** Voltar ao original é
  reinstalar do catálogo, que já é um botão desta tela. Um segundo caminho para
  a mesma coisa é uma forma de os dois divergirem.
- **Não edita os arquivos anexos da skill.** Só o texto. Anexo continua entrando
  por `.zip`.

---

## O modelo já existe, e resolve o difícil sozinho

```sql
create table skill_versions (...)   -- body text not null
drop trigger if exists trg_skill_versions_immutable on skill_versions;
create trigger trg_skill_versions_immutable before update on skill_versions
  for each row execute function fn_agent_versions_immutable();
```

E a função diz o desenho em uma frase:

> `% é imutável: mudança = versão nova; rollback = mover o ponteiro (%)`

Então **editar não é `update`**. É:

1. inserir uma `skill_version` NOVA, da organização, com o texto novo e
   `forked_from_version_id` apontando para a versão de onde ela saiu;
2. mover o `skill_pointer` da organização para ela.

Três coisas saem de graça disso, e nenhuma precisa ser construída:

| Ganho | Por quê |
|---|---|
| histórico completo | nenhuma versão é sobrescrita |
| desfazer | o botão "Instalar" do catálogo já move o ponteiro de volta |
| a tela já sabe contar | `source` é derivado de `forked_from_version_id`: a editada aparece como `manual`, não mais `do catálogo` |

E o caminho "pegar a do catálogo e virar minha" **já está escrito**:
`installPlatformSkill` faz fork-on-install — copia `name`, `description`, `body`,
`matcher` e `manifest` da versão de plataforma para uma versão da org. Editar é
a mesma operação com o `body` trocado.

**Nenhuma migration. Nenhuma coluna nova. Nenhuma tabela nova.**

---

## A API

| Rota | Hoje | Fica |
|---|---|---|
| `GET /api/v1/ai/skills/[name]` | não existe | devolve a versão ativa: `name`, `description`, `body`, `matcher`, `source`, `version_id`, `updated_at` |
| `PATCH /api/v1/ai/skills/[name]` | não existe | grava = **insere versão nova + move o ponteiro**; devolve o novo `version_id` |
| `DELETE /api/v1/ai/skills/[name]` | desinstala | inalterado |

**Resolução do que ler.** A mesma que o resto da tela usa: ponteiro da
organização se existir; senão, ponteiro de plataforma (`organization_id is
null`). É por isso que uma skill **do catálogo** pode ser lida sem ter sido
instalada — e é exatamente o caso da `agendamento`, que hoje já atua no agente
sem aparecer como instalada.

**Gravar uma que só existe no catálogo forka primeiro.** Do lado de quem usa é
um botão só: salvar. Do lado do servidor são os dois passos que
`installPlatformSkill` já faz, com o `body` vindo do pedido em vez de vir da
versão de plataforma.

**`organization_id` NUNCA vem do corpo do pedido.** Vem do `requireRole`, como
nas quatro rotas de skill que já existem.

### Validação do que entra

`body` é `text not null check (length(body) > 0)` no banco. O Zod da rota cobra:

- não vazio depois de `trim`;
- teto de **1 MB**, que é o `MAX_FILE_BYTES` que o parser de pacote já aplica ao
  `SKILL.md` — mesmo número, para as duas portas não discordarem;
- `description` e `matcher` opcionais; ausentes, herdam da versão anterior.

---

## O detalhe que quase passa: os anexos

O runtime busca cada arquivo de uma skill em:

```
{organization_id}/{skill}/{versionId}/{caminho}      (bucket skill-assets)
```

**O `versionId` está no caminho.** Versão nova = pasta nova. Criar a versão
editada sem copiar os anexos os faz sumir em silêncio: a skill continua
funcionando, o `manifest` continua listando os arquivos, e o download falha na
hora em que o agente precisar de um.

Então o `PATCH` copia os objetos do caminho da versão anterior para o da nova,
**antes** de mover o ponteiro — a mesma ordem que `importSkillPackage` já usa
("a versão só fica visível ao runtime depois que todo o conteúdo já está no
bucket").

### O defeito latente que isto revela

`installPlatformSkill` copia o `manifest` e **não copia os objetos**. Uma skill
de catálogo com anexo, ao ser instalada, nasce com um manifesto apontando para
arquivos que não existem no caminho dela.

Ninguém sente hoje porque **as quatro skills desta instalação têm zero
arquivos** (medição no topo). A primeira que tiver, quebra.

Entra no mesmo PR como **commit próprio**, com teste — é defeito do produto, não
requisito desta feature, e merece poder ser revisado sozinho.

---

## A tela

Botão **"Ver"** em cada skill — instalada e do catálogo. Abre um painel com o
texto.

- Quem pode editar vê a área de texto e **"Salvar"**.
- Quem não pode, lê e não vê botão.
- Se a skill ainda é do catálogo, o painel avisa, **antes** de salvar, que a
  gravação cria a versão da organização e que o catálogo deixa de atualizá-la.
- O rodapé *"Não há editor dentro do sistema nesta fase"* sai, e a frase que
  ensina o `.zip` fica — o `.zip` continua sendo o caminho de quem traz anexo.

Espanhol acompanha: os dois guardiões de tradução cobram toda frase nova.

---

## Permissão: **admin do tenant**, e só

Decisão do dono do produto: ler e editar skill é do **administrador da
organização**. Não é `manager`, não é `agent`.

Isso é mais restrito do que a tela é hoje, e por isso mexe em **três** lugares
que precisam concordar — o modo de falha aqui é um deles ficar para trás e a
tela oferecer um botão que a rota recusa:

| Onde | Hoje | Fica |
|---|---|---|
| `hooks/auth/AuthProvider.tsx` — `"ai.skills.manage"` | `manager` | **`admin`** |
| `app/app/ai/skills/page.tsx` — o gate da página | `ROLE_RANK.manager` | inalterado: **ver a lista continua sendo de `manager`** |
| rotas `GET`/`PATCH` de `[name]` | — | `requireRole("admin", …)` |

A linha do meio é deliberada: quem é `manager` continua enxergando **quais**
skills existem (é a lista que a página já mostra), e passa a não poder abrir nem
editar o conteúdo. Fechar a página inteira em `admin` tiraria de quem opera uma
informação que ela já tem hoje, sem que ninguém tenha pedido.

**A rota é a autoridade, a tela é conveniência.** O `usePermission` esconde o
botão; quem chamar a rota direto recebe 403 do `requireRole`. As duas mudam
juntas neste PR, e um teste cobra o 403 para `manager` — senão a única prova
seria o botão escondido, que não é prova nenhuma.

### Auditoria

`ai.skill_edited`, ao lado de `ai.skill_imported` / `_installed` /
`_uninstalled`, com `resourceId` = o `version_id` novo. Mutação bem-sucedida
audita; leitura não.

---

## Como isto será provado

| Prova | O quê |
|---|---|
| unidade — rota `GET` | devolve o corpo da versão do ponteiro da org; cai no de plataforma quando a org não instalou; 404 para skill que não existe |
| unidade — rota `PATCH` | insere versão NOVA (a anterior continua no banco), move o ponteiro, audita; **forka** quando a origem era plataforma |
| unidade — permissão | `manager` recebe **403** nas duas rotas; `admin` passa |
| unidade — anexos | versão nova recebe cópia dos objetos; ponteiro só move depois |
| unidade — imutabilidade | escrever por cima da versão anterior é recusado pelo banco (controle: prova que o gatilho está de pé, e que o desenho não depende de eu lembrar disso) |
| sabotagem | reverter a linha que move o ponteiro deixa vermelho o caso que lê depois de salvar |
| tela (Playwright) | abrir a `agendamento` do catálogo, ler o corpo, salvar uma mudança, reabrir e ver a mudança; e o caminho do erro: salvar vazio recusa com frase legível |
| VPS | Paulo abre a `agendamento`, lê os 5.507 caracteres, muda uma linha, salva, e confere na conversa do agente |

**O que NÃO será medido aqui:** `test:db` e `test:e2e` não rodam nesta máquina
— o veredito vem do CI. E nenhuma skill desta instalação tem anexo, então a
cópia de objetos será provada em teste, não na VPS.

---

## Living System Checklist

| Invariante | Resposta |
|---|---|
| entrada | o `PATCH` da rota, acionado pelo painel da tela |
| saída | `skill_versions` nova + ponteiro movido; o runtime `loadSkills` passa a carregar o texto novo no turno seguinte |
| atividade / log | `api_audit_log` com `ai.skill_edited` |
| aparece na tela | a própria tela, que passa a mostrar `manual` em vez de `do catálogo` |
| porta na navegação | já existe: IA › Skills, no `lib/navigation/catalogo.ts` |
| anti-morte | a versão anterior nunca é apagada; desfazer é reinstalar do catálogo |
| laço de retorno | salvar errado tem duas saídas: reinstalar do catálogo devolve o original, e a auditoria diz quem mudou e quando |

---

## O que fica para depois

- **Editar o catálogo da plataforma** (mudaria para todos os tenants). Foi
  levantado e recusado nesta rodada; se voltar, é feature própria, com o raio
  discutido do zero.
- **Ver o histórico de versões e voltar para uma delas pela tela.** O banco já
  guarda tudo; falta só a tela. Não entra aqui para não misturar com o que
  motivou o pedido.
