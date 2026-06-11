# StickPro - Product Requirements Document

## Declaração do Problema Original
Construir uma aplicação web para gestão de equipas de hóquei em patins, similar ao SportEasy.

## Branding
- **Nome**: StickPro
- **Tagline**: Gestão de Hóquei
- **Logo**: Logo verde transparente com adaptação ao tema (brightness filter no modo escuro)
- **URL Logo**: https://customer-assets.emergentagent.com/job_roller-hockey-hub-1/artifacts/6xtd360b_logoVerdTransp.png
- **Atualizado**: 26 Mar 2026 - Logo verde personalizado em toda a aplicação (Sidebar, TopNavBar, Login, Landing)

---

## ÚLTIMAS ATUALIZAÇÕES

### ✅ Phase O1: Admin Onboarding Wizard — Shell & Routing (11 Jun 2026) - COMPLETO
**Status:** Implementado, testado (11 pytest + 9 Jest a passar), em branch `feature/onboarding-o1-shell`.

**O que foi entregue:**
- Backend: `User.onboarding_completed_at` (Optional[datetime]) + endpoints
  `GET /api/onboarding/status` e `POST /api/onboarding/complete` (admin/gestor_desportivo, idempotente). Campo agora exposto em `/api/auth/me`.
- Frontend: nova rota `/onboarding` (sem AppLayout) com `WizardShell` (6 passos placeholder: welcome, club, season, teams, members, summary), `useOnboardingState` hook, e redirect automático em `AppLayout` para admins com onboarding por completar.
- i18n: chaves `onboarding.*` em PT/EN/ES/FR/IT (parity test verde).
- Testes: `backend/tests/test_onboarding_o1.py` (auth, RBAC, idempotência, exposição em `/auth/me`).
- E2E browser: Login → /onboarding → Next x5 → Finish → /dashboard → re-visitar /onboarding mostra "Onboarding already completed".

**Próximas fases (P0):**
- O2: Club + Season setup forms (substitui placeholder dos passos 2 e 3).
- O3: Teams + Members setup forms (passos 4 e 5).
- O4: Invitations settings + Completion summary real (passo 6) + permitir tornar persistência por-passo.

---

### ✅ Correção da Importação de Estatísticas de Fichas de Jogo (31 Mar 2026) - COMPLETO
**Status:** 100% corrigido e funcional

**Problema Reportado:**
- Ao importar estatísticas do URL da APL (partido2.asp?id=8670), apenas 2 golos do António Pereira apareciam
- Os restantes jogadores (Benedita Machado, Vasco Fraústo, André Faria, Lourenço Silva) não tinham estatísticas

**Causas Identificadas:**
1. **Encoding Incorreto**: O servidor da APL usa Windows-1252, mas o código estava a usar UTF-8 por defeito. Caracteres como `Ç`, `Ú`, `Ã` apareciam como `?`
2. **API Endpoint em Falta**: `savePlayerMatchStats` não existia no api.js do frontend
3. **Modelo Pydantic Rígido**: `PlayerMatchStatsCreate` exigia `position` obrigatório

**Soluções Implementadas:**
1. **Corrigido Encoding** em `server.py`:
   ```python
   html = response.content.decode('windows-1252')
   ```
2. **Adicionado Endpoint** em `api.js`:
   ```javascript
   savePlayerMatchStats: (matchId, playerId, data) => api.post(`/matches/${matchId}/player-stats`, {...})
   ```
3. **Tornados Campos Opcionais** nos modelos `PlayerMatchStatsCreate` e `PlayerMatchStats`:
   - `position: Optional[PlayerPosition] = None`
   - Adicionados campos: `started_match`, `own_goals`, `direct_free_kicks`

4. **Adicionada Funcionalidade de Importação de URL** em `MatchStats.jsx`:
   - Botão "Importar de URL" abre diálogo modal
   - Extrai estatísticas automaticamente do URL da APL
   - Associa jogadores extraídos aos membros da equipa por nome
   - Mostra resumo de jogadores encontrados e não encontrados
   - Preenche automaticamente a tabela de estatísticas

**Resultado:**
- ✅ Lourenço Silva: 1 golo
- ✅ António Pereira: 2 golos
- ✅ Vasco Fraústo: 3 golos
- ✅ André Faria: 1 golo
- ✅ Benedita Machado: 2 golos
- **Total: 9 golos** (corresponde ao resultado 9-0)

---

### ✅ Calendário com Convocatórias - Estado de Jogadores (31 Mar 2026) - COMPLETO
**Status:** 100% implementado e testado (iteration_39.json - 15/15 testes passaram)

**Funcionalidades Implementadas:**
1. **Endpoints de Estado de Convocatórias**
   - `GET /api/events/{event_id}/convocation-status` - Obtém estado de todos os jogadores
   - `PUT /api/events/{event_id}/convocation-status` - Atualiza estado de um jogador
   - `POST /api/events/{event_id}/send-reminder` - Envia lembrete aos pendentes

2. **UI de Estado de Convocatórias (Calendar.jsx)**
   - Componente `PlayerStatusRow` para exibir/editar estado
   - Diálogo de estado com 3 secções: Presentes, Ausentes, Pendentes
   - Dropdown para alterar estado (Admin/Treinador)
   - Botão de enviar lembrete para jogadores pendentes
   - Badges coloridos por estado

3. **Traduções Multilingue (5 idiomas)**
   - `attendance.present/absent/pending`
   - `attendance.presentPlayers/absentPlayers/pendingPlayers`
   - `attendance.noPlayersInThisSection/sendReminder/reminderSent`

**Testes:** `/app/test_reports/iteration_39.json`

---

### 🔧 Refatoração do Backend - Fase 1 (31 Mar 2026) - EM PROGRESSO
**Status:** Estrutura criada, migração pendente

**Trabalho Concluído:**
1. **Módulo Core criado**
   - `/app/backend/core/database.py` - Conexão MongoDB
   - `/app/backend/core/security.py` - Utilitários JWT
   - `/app/backend/core/config.py` - Configurações

2. **Templates de Rotas**
   - `/app/backend/routes/auth.py` - Documentado e preparado
   - Guia de refatoração: `/app/backend/REFACTORING_GUIDE.md`

**Próximos Passos:**
- Migrar rotas de auth para módulo separado
- Migrar rotas de teams, events, members
- Reduzir server.py de 8036 linhas para < 500

---

### ✅ Extração de Estatísticas de Fichas de Jogo (31 Mar 2026) - COMPLETO
**Status:** 100% implementado e testado (16/16 testes passaram)

**Funcionalidades Implementadas:**
1. **Endpoint de Extração de Estatísticas**
   - `POST /api/championships/extract-gamesheet-stats`
   - Extrai estatísticas de jogadores a partir de URL de ficha de jogo (APL)
   - Suporte multilingue para deteção de idioma

2. **Schema de Output por Jogador**
   | Campo | Tipo | Descrição |
   |-------|------|-----------|
   | player_name | str | Nome do jogador (sem marcador de capitão ©) |
   | player_name_normalized | str | Nome normalizado (sem acentos, minúsculas) |
   | team | str | Nome da equipa |
   | jersey_number | str | Número da camisola |
   | G | int | Golos |
   | AG | int | Assistências |
   | D | int | Defesas |
   | PM | int | Penáltis Marcados |
   | PF | int | Penáltis Falhados |
   | LDM | int | Livres Diretos Marcados |
   | LDF | int | Livres Diretos Falhados |
   | yellow | int | Cartões Amarelos |
   | blue | int | Cartões Azuis |
   | red | int | Cartões Vermelhos |

3. **Parsing de Formato X/Y**
   - Penáltis: `1/2` → PM=1 (marcados), PF=1 (falhados = 2-1)
   - Livres Diretos: `1/3` → LDM=1 (marcados), LDF=2 (falhados = 3-1)
   - `0/0` → 0, 0
   - `--` ou vazio → 0, 0

4. **Regras de Parsing**
   - Remove marcador de capitão (©) dos nomes
   - Salta staff técnico (T, T2, MAS, MEC, D)
   - Normaliza nomes (remove acentos para fuzzy matching)
   - Validação: PM/PF/LDM/LDF >= 0

5. **Traduções Multilingue (5 idiomas)**
   - statHeaders completos em PT, ES, FR, IT, EN

**Testes:** `/app/test_reports/iteration_38.json`

---

### ✅ Módulo de Competições Melhorado (31 Mar 2026) - COMPLETO
**Status:** 100% implementado e testado (16/16 testes passaram)

**Funcionalidades Implementadas:**
1. **Correção de Bug - Criação de Equipa**
   - Corrigido modelo `CompetitionTeamCreate` (removido `championship_id` do body)
   - Equipa criada é imediatamente disponível nos formulários de jogos

2. **Importação de Jogos via Excel/CSV**
   - Endpoint: `POST /api/championships/{id}/matches/import`
   - Suporte a 5 idiomas nos headers: PT, ES, FR, IT, EN
   - Campos: Equipa Casa, Adversário, Data, Hora, Local, Jornada

3. **Campo match_time Adicionado**
   - Novo campo para hora do jogo (HH:MM)
   - Guardado e retornado na API
   - Usado para ordenação mais precisa

4. **Ordenação de Jogos**
   - Jogos ordenados por data E hora dentro de cada jornada
   - Auto-refresh após criar/editar/importar

5. **Lógica Home vs Away**
   - Home team sempre apresentado primeiro
   - Formato: "Home Team vs Away Team"

6. **Traduções Multilingue**
   - Todas as mensagens em 5 idiomas
   - Chaves: sameTeamError, importMatches, teamCreated, matchCreated, resultUpdated

**Endpoints:**
- `POST /api/championships/{id}/teams` - Criar equipa
- `POST /api/championships/{id}/matches` - Criar jogo (com match_time)
- `POST /api/championships/{id}/matches/import` - Importar jogos
- `PUT /api/championships/matches/{id}/result` - Atualizar resultado

**Testes:** `/app/test_reports/iteration_37.json`

---

### ✅ Módulo de Membros Multilingue (31 Mar 2026) - COMPLETO
**Status:** 100% implementado e testado (18/18 testes passaram)

**Funcionalidades Implementadas:**
1. **Eliminação Permanente de Membros**
   - Endpoint: `DELETE /api/members/{member_id}`
   - Apenas admin pode eliminar
   - Remove todos os dados relacionados (presenças, estatísticas, pagamentos, etc.)
   - Não permite eliminar própria conta ou outras contas admin
   - Dialog de confirmação com aviso de ação irreversível

2. **Suporte Multilingue Completo (5 idiomas)**
   - PT, ES, FR, IT, EN suportados
   - Headers de Excel/CSV aceites em qualquer idioma
   - Roles traduzidos na UI

3. **Agrupamento de Membros**
   - Vista de equipa: Staff e Jogadores separados com cabeçalhos
   - Vista admin/clube: Lista única ordenada por nome

4. **Mapeamento de Roles Multilingue**
   | Internal Key | PT | ES | FR | IT | EN |
   |--------------|----|----|----|----|-----|
   | admin | Administrador | Administrador | Administrateur | Amministratore | Administrator |
   | sports_manager | Gestor Desportivo | Gestor Deportivo | Responsable Sportif | Responsabile Sportivo | Sports Manager |
   | coach | Treinador | Entrenador | Entraîneur | Allenatore | Coach |
   | assistant_coach | Treinador Adjunto | Entrenador Asistente | Entraîneur Adjoint | Allenatore in Seconda | Assistant Coach |
   | delegate | Delegado | Delegado | Délégué | Delegato | Delegate |
   | player | Jogador | Jugador | Joueur | Giocatore | Player |
   | guardian | Responsável | Responsable | Responsable | Responsabile | Guardian |

**Ficheiros Atualizados:**
- `/app/backend/server.py` - Endpoint DELETE, mapeamento multilingue
- `/app/frontend/src/pages/Members.jsx` - MemberRow, agrupamento, diálogo delete
- `/app/frontend/src/i18n/translations.js` - Secções roles e groups em 5 idiomas
- `/app/frontend/src/lib/utils.js` - ROLE_GROUPS, isStaffRole

**Testes:** `/app/test_reports/iteration_36.json`

---

## FUNCIONALIDADES IMPLEMENTADAS

### FASE 1 - Sistema de Permissões RBAC ✅ COMPLETO (27 Mar 2026)

**Status:** ✅ Backend 100% implementado e testado (25/25 testes passaram)

**Roles do Sistema:**
| Role | Nome PT | Acesso |
|------|---------|--------|
| admin | Administrador | Total - todas as equipas e dados |
| treinador | Treinador | Equipas atribuídas |
| treinador_adjunto | Treinador Adjunto | Equipas atribuídas |
| delegado | Delegado | Equipas atribuídas |
| jogador | Jogador | Próprios dados + contexto da equipa |
| responsavel | Responsável/Familiar | Dados do jogador vinculado |

**Permissões por Role:**
| Permissão | Admin | Treinador | Adjunto | Delegado | Jogador | Responsável |
|-----------|-------|-----------|---------|----------|---------|-------------|
| Ver todas equipas | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gerir membros | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gerir eventos | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Gerir estatísticas | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gerir presenças | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Criar convocatórias | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Gerir lineups | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Importar dados | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gerir clube | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Backend (permissions.py):**
- `PermissionChecker` - Classe reutilizável para verificar permissões
- `get_permission_checker()` - Factory function
- `@require_permission()` - Decorator para rotas
- `@require_role()` - Decorator para verificar roles
- `@require_team_access()` - Decorator para acesso a equipas

**Módulos com RBAC Aplicado:**
- ✅ Teams (criar, editar, eliminar, gerir membros)
- ✅ Events (CRUD completo com verificação de equipa)
- ✅ Championships (CRUD + matches com verificação de equipa)
- ✅ Convocations (criar requer staff, verificação de equipa)
- ✅ Attendance (jogadores podem atualizar própria presença, staff pode atualizar qualquer)
- ✅ Members (criar, importar, adicionar/remover de equipas)
- ✅ Lineups (apenas treinadores podem gerir)
- ✅ Library (criar/editar/eliminar requer can_manage_team)
- ✅ Player Stats (gerir requer can_manage_stats)
- ✅ Notifications (enviar requer can_create_convocations)
- ✅ APL Import (importar requer can_import_data)

**Frontend (PermissionsContext.jsx):**
- `usePermissions()` - Hook para aceder às permissões
- `canAccessTeam()` - Verificar acesso a equipa
- `canAccessUser()` - Verificar acesso a utilizador
- `canEditUser()` - Verificar se pode editar
- `hasPermission()` - Verificar permissão específica
- **Status:** ✅ UI implementada em Calendar, Members, ChampionshipDetail (100% testado)

**Componentes com RBAC Frontend:**
- ✅ Calendar.jsx - Botões criar/editar/eliminar eventos e convocatórias
- ✅ Members.jsx - Botões importar/criar membros
- ✅ ChampionshipDetail.jsx - Botões jogos, resultados, stats, lineups
- ✅ Sidebar.jsx - "Definições Clube" apenas para admin

**Endpoints RBAC:**
- `GET /api/auth/permissions` - Obter permissões do utilizador atual
- `POST /api/users/link-player` - Vincular familiar a jogador
- `DELETE /api/users/link-player` - Remover vínculo

**Modelo User (campos novos):**
- `linked_player_id` - ID do jogador vinculado (para responsáveis)
- `club_id` - ID do clube do utilizador
- `additional_roles` - Roles adicionais

**Testes:**
- `/app/backend/tests/test_rbac_permissions.py` - 25 testes backend
- `/app/test_reports/iteration_13.json` - Backend RBAC completo
- `/app/test_reports/iteration_14.json` - Frontend RBAC completo (16/16 testes)

### FASE 2 - Novo Layout e Navegação ✅
- **TopNavBar**: Meu Clube, Minhas Equipas, Equipas dos Meus Filhos, Meu Perfil
- **Página do Clube**: Logo URL, info completa
- **Página de Perfil**: 5 tabs (Identidade, Familiares, Biométricos, Desportivo, Equipamento)

### FASE 4 - Calendário Avançado ✅

**Vistas de Calendário:**
- Dia - Vista detalhada do dia selecionado
- Semana - 7 colunas com eventos compactos
- Mês - Grelha mensal completa

**Tipos de Evento:**
| Tipo | Ícone | Cor |
|------|-------|-----|
| Treino | Dumbbell | Azul |
| Jogo Campeonato | Trophy | Âmbar |
| Jogo Amigável | Swords | Verde |
| Torneio | Flag | Roxo |
| Outro | HelpCircle | Cinza |

**Funcionalidades:**
- Criar evento com: equipa, tipo, título, adversário, data, hora início/fim, local, descrição
- Editar evento (alterar todos os campos)
- Estados: Agendado, Adiado, Cancelado
- Eliminar evento (com confirmação)
- Convocatória: selecionar jogadores, visibilidade, mensagem
- Exportar/Imprimir calendário

**Endpoints:**
- `POST /api/events` - Criar evento
- `GET /api/events` - Listar eventos
- `PUT /api/events/{id}` - Atualizar evento
- `DELETE /api/events/{id}` - Eliminar evento

---

### FASE 5 - Presenças Avançadas ✅ NOVO (25 Mar 2026)

**Filtros:**
- Equipa - Seletor de equipa
- Época - 2023/2024, 2024/2025, 2025/2026
- Mês - Janeiro a Dezembro
- Tipo de Evento - Treino, Jogo Campeonato, Jogo Amigável, Torneio, Outro

**Vistas de Presenças:**
| Vista | Descrição |
|-------|-----------|
| Por Jogador | Tabela com Total, Confirmado, Ausente, Pendente, Taxa |
| Por Evento | Lista de eventos com contagem de presenças |
| Por Semana | Últimas 8 semanas com taxa de presença |
| Por Mês | Últimos 6 meses com taxa de presença |

**Cards de Resumo:**
- Total Registos
- Confirmados (verde)
- Ausentes (vermelho)
- Taxa Presença (âmbar)

**Resumo por Tipo de Evento:**
- Treinos
- Jogos Campeonato
- Torneios

**Endpoints:**
- `GET /api/teams/{team_id}/attendance` - Presenças por equipa (com filtros)
- `GET /api/teams/{team_id}/attendance/summary` - Resumo de presenças
- `GET /api/events/{event_id}/attendance` - Presenças por evento

---

### FASE 12 - Melhorias UI/UX ✅ (26 Mar 2026)

**Logo e Branding:**
- Logo verde transparente (`logoVerdTransp.png`) em toda a aplicação
- Adaptação automática ao tema (brightness filter no modo escuro)
- Localizações: Sidebar, TopNavBar, Login, Landing

**Internacionalização:**
- Seletor de idioma na página de Login (dropdown)
- Idiomas disponíveis: Português (🇵🇹) e English (🇬🇧)
- Mudança dinâmica de idioma

**Calendário - Funcionalidades Avançadas:**
- Menu dropdown em cada evento com opções:
  - Editar
  - Convocar Jogadores
  - Ver Estado Convocatória (mostra presentes/ausentes/pendentes)
  - Adiar/Cancelar/Eliminar
- Diálogo de estado da convocatória com:
  - Cards de resumo (presentes, ausentes, pendentes)
  - Lista de jogadores com estado

**Competições - Melhorias:**
- Campo "Jornada" ao criar/editar jogo
- Ordenação automática dos jogos por jornada
- Badge visual "J1", "J2", etc. na lista de jogos

**Estatísticas:**
- Coluna 5I (5 Iniciais) removida da tabela de estatísticas individuais
- Legenda atualizada

**Dashboard:**
- Badge de notificações no menu Home (Sidebar)
- Mostra contagem de convocatórias pendentes

---

### Funcionalidades Anteriores ✅
- Contas Associadas (vincular pai/filho)
- Autenticação JWT
- Gestão de Equipas
- Convocatórias
- Campeonatos básicos (criar, jogos, classificação)
- Estatísticas por jogador
- Presenças básicas
- Mensagens/Chat

---

### FASE 7 - Campeonatos Expandido ✅ NOVO (25 Mar 2026)

**Formatos de Campeonato:**
| Formato | Descrição |
|---------|-----------|
| 5x5 | Campo Inteiro (padrão) |
| 3x3 | Meio Campo |

**Tipos de Convocatória:**
| Tipo | Descrição |
|------|-----------|
| Manual | Seleção manual de jogadores |
| Automática | Convocatória automática |

**Gestão de Jogos:**
- Criar jogo com: adversário, data/hora, local (casa/fora/neutro), pavilhão
- Editar jogo (alterar todos os campos)
- Eliminar jogo (com confirmação)
- Inserir resultado (golos casa/fora, pontos bónus, penalização)

**Cards de Campeonato:**
- Badge de formato (5x5/3x3)
- Badge de convocatória (Manual/Auto)
- Época
- Número de equipas

**Endpoints:**
- `POST /api/championships/{id}/matches` - Criar jogo
- `PUT /api/championships/matches/{id}` - Editar jogo
- `DELETE /api/championships/matches/{id}` - Eliminar jogo
- `PUT /api/championships/matches/{id}/result` - Inserir resultado

---

### FASE 6 - Estatísticas Completas ✅ NOVO (25 Mar 2026)

**Filtros:**
- Equipa - Seletor de equipa
- Época - 2023/2024, 2024/2025, 2025/2026
- Campeonato - Todos ou específico

**Tabs:**
| Tab | Descrição |
|-----|-----------|
| Jogadores | Estatísticas individuais por jogador |
| Classificação | Tabela classificativa do campeonato |

**Cards de Resumo:**
- Golos Marcados
- Assistências
- Jogadores
- Total Jogos

**Tabela de Classificação:**
- Posição, Equipa, Jogos, Vitórias, Empates, Derrotas, GM, GS, DG, Pontos
- Destaque visual para a equipa selecionada

**Melhores Jogadores:**
- Top 5 Marcadores
- Top 5 Assistências

---

## PRÓXIMAS FASES

### Funcionalidades Implementadas ✅
Todas as fases principais foram concluídas!

---

## Arquitetura

### Stack
- **Frontend**: React 18, TailwindCSS, Shadcn/UI
- **Backend**: FastAPI, Python 3.11
- **Database**: MongoDB
- **Auth**: JWT (24h)

### Estrutura
```
/app
├── backend/
│   ├── server.py
│   └── tests/
│       ├── test_phase1_phase2.py
│       └── test_phase4_calendar.py
├── frontend/src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TopNavBar.jsx    # Barra superior
│   │   │   ├── Sidebar.jsx      # Menu lateral
│   │   │   └── AppLayout.jsx
│   │   └── ui/
│   ├── pages/
│   │   ├── Calendar.jsx         # NOVO - Calendário avançado
│   │   ├── ClubPage.jsx
│   │   ├── ProfilePage.jsx
│   │   └── ...
│   └── services/api.js
└── memory/PRD.md
```

### Credenciais de Teste
- **Admin**: admin@example.com / test123456
- **Treinador**: test@example.com / test123456

### Preview URL
https://roller-hockey-hub-1.preview.emergentagent.com

---

## Testes

### Iteração 7 (Fase 7 - Campeonatos Expandido):
- Backend: 100% (17/17 testes)
- Frontend: 100%

### Iteração 6 (Fase 5 - Presenças Avançadas):
- Backend: 100% (13/13 testes)
- Frontend: 100%

### Iteração 5 (Fase 4):
- Backend: 85% (11/13 - 2 são comportamento esperado)
- Frontend: 100%

### Funcionalidades Verificadas:
- StickPro branding (SP logo)
- 3 vistas de calendário
- 5 tipos de evento
- CRUD de eventos
- Estados de evento (adiar/cancelar)
- Convocatórias
- Exportar
- Presenças avançadas com 4 filtros e 4 vistas
- Campeonatos com formato (5x5/3x3) e tipo de convocatória
- Editar e eliminar jogos de campeonato
- Estatísticas com filtros e classificação

---

## Notas
- Emails **MOCKED** (Resend não configurado)
- Exportar PDF usa `window.print()` (nativo do browser)
- **PWA Implementado** - App instalável em telemóveis

### PWA (Progressive Web App) ✅
- Manifest.json configurado
- Service Worker para cache offline
- Ícones em múltiplos tamanhos (72x72 a 512x512)
- Prompt de instalação automático
- Funciona em Android e iOS
- Atalhos rápidos: Calendário, Presenças

### Melhorias Recentes (25 Mar 2026) ✅
- **Calendário:** Filtro por tipo de evento, texto preto nos eventos
- **Membros:** Importar via Excel/CSV, criar membro individual, remover da equipa preservando stats
- **Logo:** Corrigido "RH" → "SP" em todas as páginas
- **Upload de Imagens:** Fotos carregadas do PC/smartphone em vez de URL
- **Importação Ficha de Jogo APL:** Integração com boletim eletrónico
  - Matching de nomes com normalização de acentos e primeiro+último nome
  - Guarda dados raw da ficha mesmo sem correspondência de jogadores
- **Internacionalização (i18n):** Suporte a 5 idiomas (PT, ES, FR, IT, EN)
- **Gestão de Equipas:** Nova página /teams-management
  - Criar/Editar/Eliminar equipas com nome, escalão, época e foto
  - Endpoints: PUT /api/teams/{id}, DELETE /api/teams/{id}
- **TopNavBar Reestruturado:**
  - "Meu Clube" → Seleciona todas as equipas (dados agregados) com ✓
  - "Minhas Equipas" → Dropdown com seleção de equipa específica
  - "Os Meus Filhos" → Acesso a contas associadas (/children)
  - "Meu Perfil" → Perfil do utilizador
- **Contexto de Equipa (TeamContext):** 
  - Filtrar dados por equipa selecionada em toda a app
  - Persistência da seleção em localStorage
- **Filtro por Equipa nas Páginas:** ✅ IMPLEMENTADO
  - Calendar: Filtra eventos pela equipa selecionada
  - Members: Mostra membros da equipa selecionada
  - Championships: Filtra campeonatos pela equipa selecionada
  - Stats: Estatísticas filtradas por equipa
  - Attendance: Presenças filtradas por equipa

### Novas Funcionalidades (25 Mar 2026) ✅
- **Biblioteca de Recursos (Library):** Nova página /library
  - CRUD completo para documentos, vídeos e links
  - Tipos: PDF, Vídeo (YouTube/Vimeo), Link
  - Categorias: Regras, Táticas, Treino, Técnica Individual, etc.
  - Filtros por categoria e tipo
  - Upload de PDFs até 10MB
  - Geração automática de thumbnails para vídeos YouTube/Vimeo
  - Endpoints: GET/POST/PUT/DELETE /api/library
- **Assistente de IA (AI Assistant):** 
  - Botão flutuante no canto inferior direito
  - Chat em tempo real com GPT-4o-mini via emergentintegrations
  - Especializado em hóquei em patins e ajuda com a app
  - Histórico de conversas persistente por sessão
  - Limpar histórico disponível
  - Endpoints: POST /api/ai/chat, GET/DELETE /api/ai/chat/history
- **Temas Personalizados (Theme Colors):**
  - 8 paletas de cores predefinidas no ClubPage
  - Verde Clássico, Azul Real, Vermelho Paixão, Verde Lima
  - Roxo Elegante, Azul Celeste, Laranja Vibrante, Rosa Moderno
  - Cores aplicadas globalmente via ThemeContext
  - Conversão automática HEX→HSL para CSS variables
  - Persistência em localStorage para carregamento rápido

### Funcionalidades de Gestão Avançada (25 Mar 2026) ✅
- **Gestão de Permissões de Utilizadores:**
  - Admin pode alterar role de qualquer membro via dropdown no PlayerProfile
  - 6 roles disponíveis: Admin, Treinador, Treinador Adjunto, Delegado, Jogador, Responsável
  - Confirmação obrigatória antes de alterar permissões
  - Endpoint: PUT /api/users/{id}/role
- **Mensagens com Destinatários:**
  - Dropdown "Enviar para" na página de Chat
  - Opções: "Toda a equipa" (broadcast) ou "Membro específico" (privado)
  - Mensagens privadas marcadas com badge "Privada"
  - Filtro de mensagens por relevância (broadcast + privadas para mim)
- **Editor de Line-ups por Período:**
  - Novo botão "Line-up" em cada jogo do campeonato
  - Interface visual com campo de hóquei em patins (CORRIGIDO)
  - 5 posições: GR, DE, DD, AE, AD
  - Navegação por períodos (1ª Parte, 2ª Parte, + Período)
  - Arrastar jogadores para posições
  - Apenas visível para Treinadores e Admins
  - Endpoints: GET/POST/DELETE /api/championships/matches/{id}/lineup
- **Mobile Menu Melhorado:**
  - Link "Definições Clube" acessível no menu lateral mobile
  - Apenas visível para Admins
  - Hamburger menu funcional em smartphones
- **Notificações Push para Convocatórias:**
  - Service Worker com suporte a push notifications
  - Botão "Ativar Notificações" na página de Settings
  - Envio automático quando nova convocatória é criada
  - Subscrição VAPID com chaves únicas
  - Endpoints: GET /api/notifications/vapid-public-key, POST /api/notifications/subscribe, DELETE /api/notifications/unsubscribe
- **Imagens Corrigidas:**
  - Página de Login: imagem de roller hockey (hóquei em patins)
  - Editor de Line-up: campo de hóquei em patins (retangular com áreas semicirculares)

### Melhorias de Competições e Membros (26 Mar 2026) ✅
- **Nomenclatura Atualizada:**
  - "Campeonatos" renomeado para "Competições" em toda a app
- **Criação de Competição - Novos Campos:**
  - Época (dropdown com anos)
  - Escalão (Sub-7 a Seniores/Veteranos)
  - Tipo de Competição (Campeonato Distrital, Nacional, Taça, Torneio, etc.)
- **Jogos entre Outras Equipas (Externos):** ✅ TESTADO
  - Permitir criar jogos entre quaisquer equipas (não só a do clube)
  - Campo `is_club_match` para distinguir jogos da equipa vs jogos de outras equipas
  - Badge "Externo" visível na lista de jogos
  - Classificação atualizada automaticamente com todas as equipas
  - Útil para manter classificação correta quando a equipa folga
- **Penalizações e Bonificações:**
  - Campos `bonus_points` e `penalty_points` por jogo
- **Import de Membros via Excel:**
  - Campos obrigatórios: Nome, Apelido, Data de Nascimento, Email, Função
  - Suporta múltiplos formatos de cabeçalhos
  - Normalização automática de funções (jogador, treinador, etc.)
- **Emails Duplicados Permitidos:**
  - Mesmo email pode ser usado para múltiplas contas
  - Útil para pais/responsáveis com vários filhos menores
- **Estatísticas - Formato Boletim de Jogo:** ✅ TESTADO
  - Colunas: N.º | 5I | Nome | G | AG | D | Pe | LD | 🟨 | 🔵 | 🟥
  - Cartões representados como retângulos coloridos
  - Legenda explicativa incluída
- **UI Mobile Responsiva para Competições:** ✅ TESTADO
  - Layout adaptável para smartphones (375px)
  - Botões compactos com ícones
  - Nomes de equipas com truncate
  - Flex-wrap nos badges do header

### Melhorias Estatísticas e Pavilhão (26 Mar 2026) ✅
- **Menu Estatísticas - Novos Campos:** ✅ TESTADO
  - Card "Golos Sofridos" (vermelho com ícone Shield)
  - Secção "Últimos 5 Jogos" com círculos coloridos V/E/D
  - Círculos clicáveis que navegam para página de stats do jogo
  - Formato Pe (Penáltis) como "marcados/tentativas"
  - Formato LD (Livres Diretos) como "marcados/tentativas"
- **Definições do Clube - Pavilhão:** ✅ TESTADO
  - Campo "Nome do Pavilhão"
  - Campo "Localização do Pavilhão"
  - Exibição na secção "PAVILHÃO" da página do clube

### Tema Escuro "Neon Dark" e Navegação Mobile (26 Mar 2026) ✅
- **Tema Escuro "Neon Dark":** ✅ TESTADO
  - Fundo preto (#111111)
  - Menus e cards em cinza escuro
  - Texto e ícones em verde fluorescente (#39ff14)
  - Suporta modo claro/escuro via `theme_mode` no modelo Club
- **Cards com Faixa Colorida:** ✅ TESTADO
  - Componente `CardWithStripe` criado
  - Faixa de cor no topo de cada card para evidenciar título
  - Cores diferentes por tipo: primary, secondary, amber, purple, etc.
- **Barra de Navegação Mobile Fixa:** ✅ TESTADO
  - Componente `BottomNav` criado
  - Ícones: Calendário, Mensagens, Membros, Estatísticas, Perfil
  - Fixa no fundo do ecrã em smartphones
  - Safe area para dispositivos com notch
- **Ajustes de Cores no Tema Escuro:** ✅
  - Apenas títulos (h1-h6, font-heading) em verde neon
  - Texto normal em branco para melhor legibilidade
  - Badge "Made with Emergent" oculto em mobile, movido para topo em desktop
  - Barra superior com fundo claro e texto preto
  - Logo "SP" com letras pretas no fundo verde
- **Campo Sexo no Perfil:** ✅
  - Dropdown com opções: Masculino, Feminino
  - Campo `gender` adicionado ao modelo UserProfile
- **Estatísticas Jogo - Formato APL:** ✅
  - Página MatchStats reformulada para formato Boletim de Jogo APLisboa
  - Colunas: N.º | 5I | Nome | G | AG | D | PM | PF | LDM | LDF | Cartões
  - Inputs separados para Penáltis/Livres Marcados e Falhados
  - Compatível com importação do boletim eletrónico APL

### Fluxo de Membros: Clube → Equipas (26 Mar 2026) ✅
- **Membros agora pertencem ao Clube** (campo `club_id`)
- **Modo "Meu Clube":** Mostra todos os membros registados no clube
- **Modo "Equipa Específica":** Mostra apenas os membros dessa equipa
- **Criar membro:** Cria ao nível do clube, opcionalmente adiciona a uma equipa
- **Importar Excel:** Importa para o clube, opcionalmente adiciona a uma equipa
- **"Adicionar a Equipa":** Permite associar membros do clube a equipas
- **Indicadores visuais:**
  - "Sem equipa" (laranja) - membro não associado a nenhuma equipa
  - "X equipa(s)" - número de equipas do membro
- **Novos endpoints:**
  - `GET /api/clubs/{club_id}/members` - Listar membros do clube
  - `POST /api/members/{member_id}/teams/{team_id}` - Adicionar a equipa
  - `DELETE /api/members/{member_id}/teams/{team_id}` - Remover de equipa

### Indisponibilidades e Convocatórias Avançadas (27 Mar 2026) ✅
- **Períodos de Indisponibilidade:**
  - CRUD completo para jogadores, treinadores e delegados
  - Motivos: Férias, Lesão, Trabalho, Pessoal, Outro
  - Notas opcionais
  - Treinadores notificados quando jogador fica indisponível
  - **Endpoints:** `/api/unavailabilities`, `/api/unavailabilities/my`, `/api/unavailabilities/check`
  - **Frontend:** Botão "Indisponibilidade" no Calendário com dialog completo
- **Visibilidade de Convocatórias:**
  - Opções: "Todos", "Apenas Jogadores", "Apenas Delegados"
  - Campo `visibility` no modelo Convocation
  - Dropdown no dialog de convocação
- **Integração Indisponibilidade/Convocatória:**
  - Jogadores indisponíveis marcados com badge "Indisponível" durante convocação
  - Jogadores indisponíveis automaticamente excluídos da convocatória
  - Resposta inclui `skipped_unavailable_players`
- **Eventos Sem Convocatória:**
  - Endpoint `/api/events/upcoming-without-convocation` para alertas aos treinadores
  - Retorna eventos nas próximas 24h sem convocatória criada
- **Testes:** 13/13 passaram (`/app/test_reports/iteration_15.json`)

### Sistema Automático de Lembretes (27 Mar 2026) ✅
- **Background Scheduler:**
  - Tarefa assíncrona que corre a cada 30 minutos
  - Verifica eventos entre 3.5h e 4.5h antes do início (janela de 1h para tolerância)
  - Inicia automaticamente com a aplicação
- **Lógica de Lembretes:**
  - Apenas eventos sem convocatória são processados
  - Prevenção de duplicados via collection `event_reminders`
  - Notifica apenas treinadores (via `team.coach_ids` + users com role `treinador`/`treinador_adjunto`)
- **Modelo EventReminder:**
  - `event_id`, `team_id`, `reminder_type`, `sent_at`, `notified_user_ids`
  - `reminder_type`: "no_convocation_4h"
- **Endpoints:**
  - `POST /api/reminders/process` - Disparo manual (admin only)
  - `GET /api/reminders/status` - Histórico de lembretes enviados
  - `GET /api/reminders/pending` - Eventos próximos sem convocatória
- **Notificações:**
  - Push notification aos treinadores
  - Email com detalhes do evento (MOCKED - aguarda Resend API Key)
- **Testes:** 14/14 passaram (`/app/test_reports/iteration_16.json`)

### Módulo de Presenças Melhorado (27 Mar 2026) ✅
- **Novo Estado de Presença:** `faltou_sem_aviso` (Faltou sem aviso)
- **Estados disponíveis:** `confirmado`, `ausente`, `pendente`, `faltou_sem_aviso`
- **Pesquisa por Nome:**
  - Endpoint `GET /api/teams/{id}/attendance/search?query=nome`
  - RBAC: Jogadores só pesquisam próprios dados
  - Campo de pesquisa no frontend
- **Restrições de Edição:**
  - Após início do evento (`event_started=True`):
    - Jogadores e familiares **não podem** editar
    - Apenas admin e treinadores podem editar
  - Flag `can_edit` retornada no endpoint `/api/attendance/my/detailed`
- **Integração de Indisponibilidades:**
  - Endpoint `GET /api/teams/{id}/attendance/unavailabilities`
  - Secção de indisponibilidades na página de presenças
  - RBAC: Jogadores veem apenas próprias, staff vê da equipa
- **Visibilidade RBAC:**
  - Admin: Todas as presenças
  - Treinador/Delegado: Presenças das suas equipas
  - Jogador: Apenas próprias presenças
  - Familiar: Presenças do jogador vinculado
- **Testes:** 18/18 passaram (`/app/test_reports/iteration_17.json`)

### Módulo de Membros Melhorado (27 Mar 2026) ✅
- **Paginação:**
  - 20 membros por página
  - Controles de página (anterior/próximo)
  - Contador total de membros
  - Endpoint: `GET /api/members?page=1&per_page=20`
- **Pesquisa por Nome:**
  - Campo de pesquisa no frontend
  - Pesquisa case-insensitive
  - Endpoint: `GET /api/members?search=nome`
- **Ordenação Alfabética:**
  - Lista ordenada por nome (A-Z)
  - Aplicado no backend via MongoDB sort
- **Bandeiras de Nacionalidade:**
  - Até 2 nacionalidades por membro
  - Exibição com emojis de bandeiras
  - Campo `nationalities` no modelo
- **Status de Ativação (Admin):**
  - Indicador verde = Conta ativada
  - Indicador amarelo = Aguarda ativação
  - Visível apenas para admin
- **Arquivamento de Membros:**
  - Arquivar membro sem perder estatísticas
  - Restaurar membro com histórico intacto
  - Lista de membros arquivados
  - Reatribuir a equipa ao restaurar
  - Endpoints: `POST /api/members/{id}/archive`, `POST /api/members/{id}/restore`
- **Lembrete de Ativação:**
  - Enviar push/email para ativar conta
  - Endpoint: `POST /api/members/{id}/send-activation-reminder`
- **RBAC:**
  - Admin: Todas as ações
  - Staff: Editar membros da equipa (exceto role/archive)
  - Jogador: Editar apenas próprio perfil
- **Testes:** 16/16 passaram (`/app/test_reports/iteration_18.json`)

---

### Módulo de Estatísticas Melhorado (27 Mar 2026) ✅
- **Pesquisa por Nome:**
  - Campo de pesquisa em tempo real na tabela de jogadores
  - Filtro case-insensitive
  - data-testid='player-search'
- **Colunas Ordenáveis:**
  - Clicar nos cabeçalhos ordena asc/desc
  - Colunas: N.º, Nome, G, AG, D, Cartões
  - Ícones de setas indicam direção
- **Cartões (4 Tipos):**
  - Azul, Amarelo, Vermelho, Branco
  - Secção "DISCIPLINA - CARTÕES" com totais
  - Indicadores visuais na tabela individual
- **Bolas Paradas:**
  - Secção "BOLAS PARADAS"
  - Penáltis Marcados/Defendidos
  - Livres Diretos Marcados/Defendidos
  - Top jogadores por categoria
- **Destaque de Guarda-Redes:**
  - Card "MELHORES GUARDA-REDES"
  - Badge "GR" na tabela para jogadores GR
  - Fundo azul para linhas de GR
- **Renomeação:**
  - "Melhores Assistências" → "MAIS ASSISTÊNCIAS"
- **Toggle Bónus/Penalizações:**
  - Switch na tab Classificação
  - Colunas B e P visíveis quando ativo
  - Cálculo de pontos ajustado
  - data-testid='bonus-penalty-toggle'
- **RBAC Mantido:**
  - Filtros de equipa funcionais
  - Filtros de época e campeonato
- **Testes:** 100% (9/9 funcionalidades) - `/app/test_reports/iteration_19.json`

---

## PRÓXIMAS TAREFAS (Backlog)

### P1 - Próximas
- Web Scraping APL (importar calendário de divisões)
- Configurar API Key Resend para emails reais (atualmente MOCKED)

### P2 - Futuro
- Dashboard com métricas e gráficos
- Exportar calendário/presenças em PDF
- Expandir traduções i18n para restantes páginas
- Refactoring: Dividir server.py (~5000 linhas) em routers modulares

---

### Módulo de Competições Melhorado (27 Mar 2026) ✅
- **Visualização por Jornada:**
  - Jogos agrupados usando Accordion
  - Badge com número da jornada (J1, J2, S/J)
  - Contagem de jogos por jornada
  - Ordenação por data dentro de cada jornada
- **Tab de Equipas Participantes:**
  - Criação manual de equipas com cores de equipamento
  - Campos: nome, pavilhão, morada
  - 12 seletores de cor (6 jogador campo + 6 guarda-redes)
  - Cores: camisola, calções, meias (1ª/2ª)
  - Edição e eliminação de equipas
  - Importação via Excel/CSV
  - Endpoints: GET/POST /championships/{id}/teams
- **Line-up com Visibilidade:**
  - Campo de hóquei em patins (roller hockey rink)
  - 5 posições: GR, DE, DD, AE, AD
  - Dropdown de visibilidade:
    - Só Treinador
    - Treinador Adjunto
    - Delegado
    - Adjunto e Delegado
  - Persistência da visibilidade no MongoDB
- **RBAC mantido** em todas as operações
- **Testes:** 100% (13/13 backend + frontend) - `/app/test_reports/iteration_20.json`

---

### Módulo de Perfil - Indisponibilidades (27 Mar 2026) ✅
- **Nova Tab "Ausências":**
  - Disponível para jogadores, treinadores e delegados
  - Gestão de períodos de indisponibilidade
  - data-testid='unavailability-tab'
- **Criação de Indisponibilidade:**
  - Campos: data início, data fim, motivo, notas
  - 4 motivos estruturados:
    - Férias (ícone palmeira)
    - Doença/Consulta Médica (estetoscópio)
    - Atividades Escolares (boné formatura)
    - Outro Motivo (alerta)
  - Notas livres opcionais
  - Notificação automática ao treinador
- **Lista de Indisponibilidades:**
  - Secção "ATIVAS / FUTURAS" (com badge "Agora" se atual)
  - Secção "HISTÓRICO" (últimas 5)
  - Editar e eliminar disponíveis
  - Ícones coloridos por tipo de motivo
- **Integração:**
  - Indisponibilidades aparecem no calendário da equipa
  - Bloqueio automático de convocação
  - Treinador notificado via push
- **Endpoints:**
  - GET /api/unavailabilities/my
  - POST/PUT/DELETE /api/unavailabilities/{id}
- **Testes:** 100% (15/15 backend + frontend) - `/app/test_reports/iteration_21.json`

---

### Módulo de Pagamentos e Mensalidades (27 Mar 2026) ✅
- **Controlo de Acesso:**
  - Admin: acesso total (criar, editar, eliminar, importar)
  - Jogador: ver e gerir apenas os seus pagamentos
  - Treinador/Delegado: sem acesso a este módulo
- **Funcionalidades Admin:**
  - Criar mensalidade individual (jogador, mês, ano, valor, vencimento)
  - Criar mensalidades em massa (todos jogadores ativos)
  - Importar mensalidades via Excel/CSV
  - Criar pagamento personalizado (título, descrição, valor, vencimento)
  - Marcar pagamento como pago
  - Filtrar por estado (Todos, Pagos, Pendentes, Atrasados)
  - Pesquisar por nome/email
  - Desativar pagamentos por jogador
- **Funcionalidades Jogador:**
  - Ver lista de pagamentos próprios
  - Upload de comprovativo (PDF, JPG, PNG)
  - Ver histórico e estado atual
- **Estados de Pagamento:**
  - Verde: Pago
  - Amarelo: Pendente
  - Vermelho: Atrasado (após vencimento)
- **Indicador no Dashboard:**
  - Card colorido com estado geral
  - Link para página de pagamentos
  - Mostra total em atraso se aplicável
- **Notificações:**
  - Push ao jogador quando pagamento criado
- **Endpoints:**
  - GET /api/payments/my
  - GET /api/payments/status
  - GET /api/payments/admin (admin only)
  - GET /api/payments/summary (admin only)
  - POST /api/payments/monthly-fees
  - POST /api/payments/monthly-fees/bulk
  - POST /api/payments/monthly-fees/import
  - POST /api/payments/custom
  - PUT /api/payments/{type}/{id}/mark-paid
  - PUT /api/payments/{type}/{id}/upload-proof
  - DELETE /api/payments/{type}/{id}
- **Testes:** 100% (26/26 backend + frontend) - `/app/test_reports/iteration_22.json`

---

### Integração Resend para Emails Reais (27 Mar 2026) ✅
- **Configuração:**
  - Usa variáveis de ambiente: `RESEND_API_KEY`, `SENDER_EMAIL`
  - Default sender: `onboarding@resend.dev` (para testes)
  - Sistema funciona sem chave (faz log warning, não quebra)
- **Função send_email_notification:**
  - Usa Resend API v2.26.0
  - Non-blocking com asyncio.to_thread
  - Error handling graceful (log erro, continua fluxo)
  - Suporta anexos (base64)
- **Função build_email_template:**
  - Template HTML profissional e responsivo
  - Branding StickPro (header gradiente cyan)
  - Layout table-based para compatibilidade email clients
  - Título, conteúdo e footer customizáveis
- **Emails Implementados:**
  - Ativação de conta (POST /api/members/{id}/send-activation-reminder)
  - Novo pagamento criado (POST /api/payments/custom)
  - Confirmação de pagamento (PUT /api/payments/{type}/{id}/mark-paid)
  - Indisponibilidade (POST /api/unavailabilities - notifica treinadores)
  - Lembrete evento sem convocatória (background task 4h antes)
- **Resiliência:**
  - Sem RESEND_API_KEY: log WARNING, app continua
  - Erros capturados e logados sem quebrar fluxo
  - Endpoints funcionais independente de email
- **Testes:** 100% (16/16 backend) - `/app/test_reports/iteration_23.json`
- **NOTA:** Emails MOCKED até user adicionar RESEND_API_KEY aos secrets



---

### UI/UX Polish Completo (27 Mar 2026) ✅
- **Tipografia:**
  - Fonte headings: Outfit (substituiu Bebas Neue)
  - Fonte body: Manrope (mantido)
  - Fonte mono: JetBrains Mono (mantido)
  - Letter-spacing: tracking-tight em todos os headings
  - Títulos em Title Case (não mais ALL CAPS)
- **Cores e Temas:**
  - Primary: Cyan (hsl(187 94% 43%))
  - Secondary: Green (hsl(160 84% 39%))
  - Radius aumentado para 0.5rem
  - Variáveis CSS atualizadas em :root
- **Branding StickPro:**
  - Logo: "Stick" + "Pro" em cyan
  - Subtítulo: "Gestão Desportiva"
  - Watermark sutil no desktop (Activity icon com opacity 3%)
  - Badge "Made with Emergent" escondido via CSS
- **Sidebar:**
  - Item ativo: borda esquerda cyan + fundo cyan/10
  - Hover suave em todos os items
  - Team selector com ícone em rounded-lg
  - User menu com avatar e dropdown
- **Cards:**
  - Border radius mais arredondado (rounded-lg)
  - Card stripe com h-1 (mais fino)
  - Classe card-hover com efeito elevação e glow
  - Empty states com ícones em opacity 30%
- **Responsividade Mobile:**
  - Header mobile com branding StickPro
  - Bottom navigation (5 items)
  - Cards em grid 2-column no mobile
  - Fonts ajustadas (text-2xl sm:text-3xl lg:text-4xl)
- **Estados e Feedback:**
  - Loading skeletons mantidos
  - Toast notifications funcionais
  - Empty states com ícones e CTAs
- **Páginas Atualizadas:**
  - Login, Dashboard, Members, Stats, Payments
  - Calendar, Championships, Attendance
  - Settings, ProfilePage, TeamDetail
- **Testes:** 100% Frontend - `/app/test_reports/iteration_24.json`

---

## PRÓXIMAS TAREFAS (BACKLOG)

### P1 - Em Espera
1. **APL Web Scraping** - Endpoint `/api/championships/scrape/apl` (pausado)
2. **Finalizar Excel Import** - Mapeamento de campos para Members/Teams

### P2 - Futuro
1. **Exportação PDF** - Calendário e convocatórias
2. **Expansão i18n** - Traduções restantes
3. **Notificações Push** - Web push notifications

### P0 - Refactoring (Tech Debt CRÍTICO)
1. **Dividir server.py** (~5800 linhas) em routers modulares:
   - routes/auth.py
   - routes/members.py
   - routes/payments.py
   - routes/events.py
   - routes/championships.py
   - routes/teams.py
   - routes/notifications.py


---

### Bug Fixes (28 Mar 2026) ✅
- **Bug 1 - Members Navigation**: Corrigido ordem dos itens no dropdown - "Ver Estatísticas" navega para /players/:id, "Ver Perfil" abre modal de detalhes
- **Bug 2 - Attendance Export**: Implementada função handleExportExcel() que exporta dados de presenças para CSV com suporte UTF-8
- **Bug 3 - Language Translations**: Adicionadas chaves de tradução em falta (loginButton, loggingIn, createAccount, hasAccount, loginHere) e corrigido Login.jsx para usar sistema de traduções
- **Bug 4 - Profile Mobile**: Implementado layout responsivo com flex-col sm:flex-row, tabs visíveis em mobile, botões alinhados, sem overflow
- **Testes:** 100% Frontend - `/app/test_reports/iteration_25.json`

### Excel Export para Payments (28 Mar 2026) ✅
- **Backend**: Endpoint `/api/payments/export` com filtros completos (status, type, user_id, team_id, season, date ranges, search)
- **Frontend**: Método `paymentsApi.exportExcel()` com responseType blob
- **Colunas Excel**: Nome, Data Nascimento, Equipa, Época, Tipo, Descrição, Valor, Data Criação, Data Vencimento, Estado, Data Pagamento, Comprovativo, Notas
- **Segurança**: Apenas admin pode exportar (RBAC enforced)

### Excel Export Completo (28 Mar 2026) ✅
- **Members Export**:
  - Endpoint: `/api/members/export`
  - Formato: XLSX
  - Colunas: Nome, Email, Equipa(s), Função, Nacionalidade, Data de Nascimento, Telefone, Número de Jogador, Posição
  - Filtros: team_id, role, search
- **Payments Export**:
  - Endpoint: `/api/payments/export`
  - Formato: XLSX
  - Colunas: Nome do Jogador, Data Nascimento, Equipa, Época, Tipo, Descrição, Valor, Data Criação, Data Vencimento, Estado, Data Pagamento, Comprovativo, Notas
  - Filtros: status, payment_type, user_id, team_id, season, date ranges, search
- **Attendance Export**:
  - Geração: Client-side CSV
  - Colunas: Jogador, Email, Eventos, Presenças, Ausências, Pendentes, Taxa Presença (%)
- **Segurança**: Todos os exports apenas para admin (RBAC enforced, botões escondidos para não-admin)
- **Testes:** 100% Backend e Frontend - `/app/test_reports/iteration_26.json`


### Gestão de Utilizadores e Roles Melhorada (28 Mar 2026) ✅
- **Multi-role por equipa**:
  - Novo campo `team_roles: Dict[str, UserRole]` no modelo User
  - Mapeia team_id -> role (ex: `{"team1": "treinador", "team2": "jogador"}`)
  - Role global `admin` permanece no campo `role`
- **Seleção de role ao adicionar membro**:
  - 5 roles disponíveis: Jogador, Treinador Principal, Treinador Adjunto, Delegado, Responsável/Familiar
  - Endpoints: `PUT /teams/{team_id}/members/{user_id}/role`
- **Gestão de Admin**:
  - Endpoint: `PUT /users/{user_id}/admin-role`
  - Admin pode conceder/remover role de admin a outros utilizadores
  - Admin não pode remover próprio role de admin (proteção)
  - Menu dropdown com opção "Tornar Admin" / "Remover Admin"
- **Perfil - Nacionalidade**:
  - Campo `nationality` adicionado ao UserProfile
  - Visível em Profile > tab Identidade
  - data-testid: `profile-nationality-input`
- **Contas Familiares**:
  - Novo campo `linked_player_ids: List[str]` para múltiplos jogadores
  - Endpoint: `POST /users/link-players`
  - Família tem acesso a equipas de todos os jogadores ligados
- **RBAC**: Sistema mantido e funcional - non-admin não pode alterar roles
- **Testes:** 100% Backend e Frontend - `/app/test_reports/iteration_27.json`



### Temas Dinâmicos e Melhorias de Autenticação (28 Mar 2026) ✅

**Temas Dinâmicos da UI:**
- **5 Temas disponíveis**:
  - `light-default` - Claro (Padrão) - Verde StickPro, modo claro
  - `dark-default` - Escuro (Padrão) - Cyan/verde, modo escuro
  - `blue` - Azul - Tons de azul, modo claro
  - `green` - Verde - Verde lima, modo claro
  - `red` - Vermelho - Tons de vermelho, modo claro
- **Implementação**:
  - `ThemeContext.jsx` - Export `THEME_PRESETS` e função `setThemePreset()`
  - Cada tema define: primary, secondary, accent, mode, sidebar colors
  - Aplicação imediata via CSS variables
  - Persistência em localStorage
- **Componentes atualizados**: Sidebar adapta cores conforme tema

**Páginas de Autenticação Melhoradas:**
- **Login.jsx**:
  - Logo StickPro (verde transparente)
  - Carrossel de 7 imagens de hóquei em patins
  - Indicadores de imagem interativos
  - Seletor de idioma no canto superior direito
- **Register.jsx**:
  - Mesmo estilo do Login
  - Carrossel de imagens à esquerda
  - Formulário completo com seleção de role
  - Seletor de idioma

**Suporte a 5 Idiomas (i18n):**
- Português (PT) - Default
- Español (ES)
- Français (FR)
- Italiano (IT)
- English (EN)
- **Traduções completas para**: auth, settings, common, nav, dashboard, calendar, members, championships, attendance, stats, profile, messages, time, seasons

**Settings Consolidado:**
- **4 Tabs**:
  1. Profile - Informações da conta, foto, nome, telefone, idioma
  2. Appearance - Seleção de tema com pré-visualização
  3. Notifications - Configuração de notificações push
  4. Associated Accounts - Gestão de contas associadas (filhos)
- **data-testid**: `tab-profile`, `tab-appearance`, `tab-notifications`, `tab-accounts`

**Menu de Utilizador Simplificado:**
- TopNavBar dropdown apenas com opção "Logout"
- Removidos: Profile, Settings (acessíveis pela Sidebar)
- **data-testid**: `logout-menu-btn`

**Ícone e Manifest:**
- `manifest.json` - theme_color atualizado para `#006D5B` (verde StickPro)
- `index.html` - meta theme-color atualizado

**Testes:** 100% Frontend - `/app/test_reports/iteration_28.json`

### Correção da Navegação dos Membros (28 Mar 2026) ✅

**Problema:** Ao clicar num membro na lista, era redirecionado para estatísticas em vez de dados pessoais.

**Solução Implementada:**
- **Nova página MemberProfilePage.jsx**:
  - Rota: `/members/:memberId/profile`
  - 5 tabs: Identidade, Familiares, Biométricos, Desportivo, Equipamento
  - Botão "Ver Estatísticas" para navegar para `/players/{id}`
  - Botão "Guardar" para admin/treinador guardar alterações
  - Botão "Voltar aos Membros" para voltar à lista
  - Modo visualização para utilizadores sem permissão de edição

- **Atualização Members.jsx**:
  - Clicar no nome do membro → `/members/{id}/profile` (perfil)
  - "Ver Perfil" no dropdown → `/members/{id}/profile` (perfil)
  - "Ver Estatísticas" no dropdown → `/players/{id}` (estatísticas)

- **Nova rota em App.js**:
  - `/members/:memberId/profile` → MemberProfilePage

**data-testid:**
- `member-profile-page`
- `member-profile-link-{id}`
- `view-profile-{id}`
- `view-stats-{id}`
- `save-member-profile-btn`
- `back-to-members-btn`
- `view-stats-btn`

**Testes:** 100% Frontend - `/app/test_reports/iteration_29.json`

---

### Paleta de Cores para Item Ativo da Sidebar (29 Mar 2026) ✅

**Funcionalidade:** Seletor de 20 cores para personalizar a cor do texto do item de menu ativo na sidebar.

**Cores Disponíveis (20):**
| Nome | Hex |
|------|-----|
| Ciano | #22d3ee |
| Azul Claro | #60a5fa |
| Azul | #3b82f6 |
| Índigo | #818cf8 |
| Violeta | #a78bfa |
| Roxo | #c084fc |
| Fúcsia | #e879f9 |
| Rosa | #f472b6 |
| Vermelho | #f87171 |
| Laranja | #fb923c |
| Âmbar | #fbbf24 |
| Amarelo | #facc15 |
| Lima | #a3e635 |
| Verde Claro | #4ade80 |
| Verde | #22c55e |
| Esmeralda | #34d399 |
| Teal | #2dd4bf |
| Branco | #ffffff |
| Cinza Claro | #d1d5db |
| Dourado | #ffd700 |

**Implementação:**
- **Backend**: Campo `sidebar_accent_color` no modelo `Club` (server.py linha 335)
- **Frontend**: 
  - `ClubPage.jsx` - UI do seletor na aba "Definições"
  - `Sidebar.jsx` - Aplica `var(--sidebar-active-text)` ao item ativo
  - `ThemeContext.jsx` - Gere a variável CSS e persistência

**Comportamento:**
- Auto-save imediato ao clicar numa cor (sem botão guardar)
- Toast de confirmação: "Cor atualizada com sucesso"
- Indicador de checkmark na cor selecionada
- Preview em tempo real antes de guardar
- Persistência no servidor (DB) e localStorage

**CSS Variable:**
- `--sidebar-active-text` - Define a cor do texto e borda do item ativo

**data-testid:**
- `sidebar-color-picker` - Container do seletor
- `sidebar-color-{hex}` - Botões individuais (ex: `sidebar-color-22d3ee`)

**Traduções:** PT, ES, FR, IT, EN (club.sidebarActiveColor, etc.)

**Testes:** 100% Frontend - `/app/test_reports/iteration_30.json`

---

### Sistema de Aparência Unificado - Sidebar Adaptativa (29 Mar 2026) ✅

**Funcionalidade:** A sidebar agora adapta o background conforme o tema selecionado, mantendo a cor do item ativo independente e configurável pelo utilizador.

**Comportamento:**
- **Tema** controla: Background da sidebar, cor do texto inativo, bordas, hover
- **Cor Ativa** (Club Settings) controla: Texto e borda do item de menu ativo

**Temas e Cores da Sidebar:**
| Tema | Background Sidebar | Modo |
|------|-------------------|------|
| Claro (Padrão) | `#0f172a` (azul escuro) | Light |
| Escuro (Padrão) | `#0f172a` (azul escuro) | Dark |
| Azul | `#1e3a5f` (azul médio) | Light |
| Verde | `#14532d` (verde escuro) | Light |
| Vermelho | `#7f1d1d` (vermelho escuro) | Light |

**Variáveis CSS:**
- `--sidebar-bg`: Background da sidebar (HSL)
- `--sidebar-text`: Texto principal (`#f8fafc`)
- `--sidebar-muted`: Itens inativos
- `--sidebar-border`: Bordas e separadores
- `--sidebar-hover`: Background no hover
- `--sidebar-active-text`: Cor do item ativo (definida pelo utilizador)

**Preservação de Configuração:**
- A cor do item ativo é preservada ao mudar de tema
- Tema e cor ativa persistem no localStorage
- Cor ativa carrega do servidor (Club.sidebar_accent_color)

**Ficheiros Alterados:**
- `/app/frontend/src/context/ThemeContext.jsx` - `setThemePreset()` preserva cor ativa
- `/app/frontend/src/components/layout/Sidebar.jsx` - Usa variáveis CSS dinâmicas
- `/app/frontend/src/index.css` - Valores padrão das variáveis

**Acessibilidade:**
- Texto branco (`#f8fafc`) em backgrounds escuros = excelente contraste
- Cor ativa destacada com borda lateral colorida

**Testes:** 100% Frontend - `/app/test_reports/iteration_31.json`

---

### Novo Papel: Gestor Desportivo (29 Mar 2026) ✅

**Funcionalidade:** Adicionado novo papel `gestor_desportivo` com as mesmas permissões que `admin`.

**Roles Administrativos:**
| Role | Permissões |
|------|------------|
| `admin` | Acesso total |
| `gestor_desportivo` | Acesso total (igual a admin) |

**Verificação de Permissões:**
```javascript
// Frontend
const ADMIN_ROLES = ['admin', 'gestor_desportivo'];
const isAdmin = ADMIN_ROLES.includes(user.role);

// Backend
ADMIN_ROLES = ["admin", "gestor_desportivo"]
def is_admin_role(role: str) -> bool:
    return role in ADMIN_ROLES
```

**Acesso Garantido:**
- ✅ Club settings (criar, editar, visualizar)
- ✅ Members (criar, editar, arquivar)
- ✅ Teams (criar, editar, eliminar)
- ✅ Subscription (visualizar, cancelar)
- ✅ Invoices (criar, editar)
- ✅ Permissions (visualizar, modificar)
- ✅ Import/Export (Excel, APL)

**Ficheiros Alterados:**
- `/app/backend/server.py` - `ADMIN_ROLES`, `is_admin_role()`
- `/app/backend/permissions.py` - `ADMIN_LEVEL_ROLES`, `Role.SPORTS_MANAGER`
- `/app/frontend/src/context/PermissionsContext.jsx` - `ADMIN_ROLES`, `ROLE_NAMES`
- `/app/frontend/src/context/AuthContext.jsx` - `isAdmin` check
- `/app/frontend/src/lib/utils.js` - `getRoleName()`
- `/app/frontend/src/i18n/translations.js` - Traduções

**Traduções:**
| Língua | Tradução |
|--------|----------|
| PT | Gestor Desportivo |
| ES | Gestor Deportivo |
| FR | Gestionnaire Sportif |
| IT | Direttore Sportivo |
| EN | Sports Manager |

**Conta de Teste:**
- Email: `gestor@example.com`
- Password: `test123456`

**Testes:** 100% Backend + Frontend - `/app/test_reports/iteration_32.json`

---

### Filtragem do Dashboard por Papel (29 Mar 2026) ✅

**Problema Corrigido:** O dashboard mostrava todos os eventos do clube para todos os utilizadores. Agora filtra automaticamente baseado no papel.

**Lógica de Filtragem:**
| Papel | Eventos Visíveis | Teams Count |
|-------|------------------|-------------|
| Admin / Gestor Desportivo | TODOS os eventos do clube | Total de equipas |
| Treinador / Delegado / Jogador | Apenas eventos das suas equipas | Nº das suas equipas |
| Responsável (Pai/Familiar) | Eventos das equipas dos filhos ligados | Nº equipas dos filhos |

**Implementação Backend:**
```python
# Endpoint: GET /api/dashboard
if is_admin_role(user_role):
    # Admin/Gestor: ver todos (sem filtro de team_id)
    pass
elif user_role == 'responsavel':
    # Responsável: buscar equipas dos filhos ligados
    for player_id in linked_player_ids:
        player = await db.users.find_one({"id": player_id})
        child_team_ids.update(player['team_ids'])
    query["team_id"] = {"$in": list(child_team_ids)}
else:
    # Staff/Jogador: apenas as suas equipas
    query["team_id"] = {"$in": user_teams}
```

**Frontend:**
- `Dashboard.jsx` usa `dashboardApi.get()` sem filtragem manual
- Backend envia dados já filtrados

**Campos Utilizados:**
- `user.team_ids`: Equipas do utilizador
- `user.linked_player_ids` / `user.linked_player_id`: IDs dos filhos (para responsáveis)

**Segurança:**
- ✅ Nenhuma fuga de dados entre equipas
- ✅ Responsáveis só veem eventos dos filhos ligados
- ✅ Jogadores não podem ver eventos de outras equipas

**Contas de Teste:**
| Email | Password | Papel | Equipa |
|-------|----------|-------|--------|
| player.escolares@test.com | test123456 | Jogador | Escolares |
| player.sub13@test.com | test123456 | Jogador | Sub-13 |
| parent.sub13@test.com | test123456 | Responsável | (filho na Sub-13) |

**Testes:** 100% Backend + Frontend (17 pytest tests) - `/app/test_reports/iteration_33.json`

---

### Secção "Os Meus Filhos" para Responsáveis (29 Mar 2026) ✅

**Funcionalidade:** Nova secção integrada na página "As minhas equipas e os meus clubes" que permite aos responsáveis (pais/familiares) verem as equipas e clubes dos seus filhos.

**Tabs Implementados:**
| Tab | Descrição |
|-----|-----------|
| As minhas equipas | Equipas do próprio utilizador |
| Os meus clubes | Clubes do próprio utilizador |
| Os meus filhos | Equipas/clubes dos filhos (só visível para `responsavel`) |

**UI - Seletor de Filhos:**
- Botões circulares com avatar
- Formato: "Nome (nº equipas)" (ex: "António (3)")
- Clique filtra os cards para mostrar apenas equipas desse filho

**Cards de Equipa/Clube:**
- Badge "EQUIPA DO CLUBE" ou "CLUBE"
- Título com nome do filho (ex: "Sub-13 (António)")
- Desporto: "Hóquei em patins"
- Papel: "Jogador", "Treinador", etc.
- Ícones: Chat, Menu de opções

**Endpoints Backend:**
```
GET /api/guardian/children
→ Lista de filhos com: id, name, avatar_url, teams_count

GET /api/guardian/children/:id/teams
→ Equipas do filho com: teams[], club, child.name
```

**Permissões:**
- ✅ Apenas `responsavel` pode aceder aos endpoints
- ✅ Responsável só pode ver filhos ligados à sua conta
- ✅ Responsáveis só podem **visualizar**, sem acções de edição
- ❌ Admin/outros papéis recebem 403

**Campos Utilizados:**
- `user.linked_player_ids`: IDs dos filhos ligados
- `user.linked_player_id`: ID do filho (retrocompatibilidade)

**Ficheiros:**
- `/app/frontend/src/pages/MyTeamsPage.jsx` - Nova página com 3 tabs
- `/app/frontend/src/services/api.js` - `guardianApi` adicionado
- `/app/backend/server.py` - Endpoints Guardian Routes

**Rota:** `/my-teams` (com `?tab=children` para ir directo ao tab filhos)

**Conta de Teste:**
- Email: `parent.sub13@test.com`
- Password: `test123456`
- Filhos: Jogador Sub-13, Jogador Escolares

**Testes:** 100% Backend + Frontend (10 testes) - `/app/test_reports/iteration_34.json`

---

### Novo Logo + Notificações para Responsáveis + Estrutura Modular (29 Mar 2026) ✅

**1. Novo Logo Atualizado:**
- URL: `https://customer-assets.emergentagent.com/job_roller-hockey-hub-1/artifacts/e8f8q5qy_logoBranco2.png`
- Logo branco com fundo preto circular
- Atualizado em: Sidebar, TopNavBar, Login, Register, Landing

**2. Notificações para Responsáveis:**
Quando um evento é criado para uma equipa, os responsáveis dos atletas dessa equipa são notificados automaticamente.

Tipos de notificação:
- **Email**: Envia email personalizado com detalhes do evento e nome dos filhos
- **Push**: Notificação push para dispositivos com subscrição

Template do email:
```
Assunto: Novo [Treino/Jogo] - [Nome da Equipa]

Olá [Nome do Pai],
Foi criado um novo evento para a equipa [Equipa]:
- Tipo: [Treino/Jogo/Torneio]
- Título: [Título do Evento]
- Data/Hora: [Data]

Aceda à aplicação para confirmar a presença de [Nome do Filho].
```

Função implementada: `notify_guardians_of_team_event()`
- Localiza membros da equipa via `team_ids` dos utilizadores
- Encontra responsáveis com `linked_player_ids` correspondentes
- Envia email e push notification em background (não bloqueia resposta)

**3. Estrutura Modular do Backend Preparada:**
```
/app/backend/
├── models/
│   └── __init__.py      # Pydantic models, types, permissions
├── routes/
│   ├── __init__.py      # Package docs
│   ├── auth.py          # Template - Authentication
│   ├── teams.py         # Template - Teams
│   ├── events.py        # Template - Events
│   ├── clubs.py         # Template - Clubs
│   └── guardian.py      # Template - Guardian
├── utils/
│   └── __init__.py      # Utility functions
└── server.py            # Main server (~7100 linhas - para migração incremental)
```

**Nota sobre Refactoring:**
O `server.py` mantém-se funcional com todas as rotas. A estrutura modular foi criada como templates para migração incremental futura. Recomendação: migrar uma rota de cada vez, testando cada migração antes de prosseguir.

---

## TAREFAS PENDENTES

### P1 - APL Web Scraping (Em Pausa)
- Endpoint `/api/championships/scrape/apl` existe
- Aguarda implementação de scraping de calendários de divisões

### ✅ P0 - Excel Import Mapping (29 Mar 2026) - CONCLUÍDO
**Funcionalidade:** Import completo de membros via CSV e Excel (.xlsx)

**Colunas Suportadas (10):**
| Coluna | Obrigatória | Descrição |
|--------|-------------|-----------|
| Nome | ✅ | Primeiro nome |
| Apelido | ❌ | Sobrenome |
| Data de Nascimento | ❌ | Formato: YYYY-MM-DD |
| Email | ✅ | Email único |
| Função | ❌ | Role do utilizador |
| Número | ❌ | Número da camisola |
| Posição | ❌ | GR ou JC |
| Telefone | ❌ | Contacto |
| Nacionalidade | ❌ | País (convertido para ISO) |
| Sexo | ❌ | Masculino ou Feminino |

**Mapeamento de Funções (PT/EN/ES):**
| Input | Role |
|-------|------|
| jogador, atleta, player, jugador | jogador |
| treinador, coach, entrenador | treinador |
| treinador adjunto, adjunto, assistant coach | treinador_adjunto |
| delegado, delegate, team manager | delegado |
| responsavel, pai, mãe, guardian, parent | responsavel |
| gestor desportivo, sports manager | gestor_desportivo |
| admin, administrador | admin |

**Normalização de Posições:**
| Input | Posição |
|-------|---------|
| guarda-redes, gr, goalkeeper, portero | GR |
| jogador de campo, jc, field player | JC |

**Conversão de Nacionalidades (20+ países):**
- Portuguesa/Portugal/PT → PT (🇵🇹)
- Brasileira/Brasil/BR → BR (🇧🇷)
- Espanhola/Espanha/ES → ES (🇪🇸)
- E mais: FR, IT, DE, GB, US, AO, MZ, CV, GW, ST, NL, BE, CH, AR, MA, RO

**Funcionalidades:**
- ✅ Import para clube (club_id)
- ✅ Import para equipa específica (team_id)
- ✅ Aviso de emails duplicados (permite criar)
- ✅ Template CSV descarregável
- ✅ Passwords temporárias geradas automaticamente
- ✅ Bandeiras de nacionalidade na lista de membros

**Endpoint:** `POST /api/members/import`
- Query params: `team_id` (opcional), `club_id` (opcional)
- Body: form-data com `file` (CSV ou XLSX)

**Testes:** 100% (21/21) - `/app/test_reports/iteration_35.json`

### P2 - PDF Export para Calendário
- Exportar calendário em formato PDF

### P0 - REFACTORING (CRÍTICO)
- `/app/backend/server.py` tem ~6300 linhas
- Dividir em routers modulares:
  - `routes/auth.py`
  - `routes/members.py`
  - `routes/payments.py`
  - `routes/events.py`
  - `routes/teams.py`
  - `routes/championships.py`
  - `routes/attendance.py`
  - etc.
