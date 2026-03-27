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

---

## PRÓXIMAS TAREFAS (Backlog)

### P1 - Próximas
- Notificação automática ao treinador 4h antes de evento sem convocatória (background job)
- Web Scraping APL (importar calendário de divisões)
- Configurar API Key Resend para emails reais (atualmente MOCKED)

### P2 - Futuro
- Dashboard com métricas e gráficos
- Exportar calendário em PDF
- Expandir traduções i18n para restantes páginas
- Refactoring: Dividir server.py (~3700 linhas) em routers modulares
