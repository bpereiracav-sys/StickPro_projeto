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
