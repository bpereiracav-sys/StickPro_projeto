# StickPro - Product Requirements Document

## Declaração do Problema Original
Construir uma aplicação web para gestão de equipas de hóquei em patins, similar ao SportEasy.

## Branding
- **Nome**: StickPro
- **Tagline**: Gestão de Hóquei
- **Logo**: Stick de hóquei azul estilizado
- **URL Logo**: https://static.prod-images.emergentagent.com/jobs/d39c85da-551e-47cd-abe4-e0c16122ddb6/images/0327f0512a725879e3e9730c371dab74d12bc7910dd11250c0a4a7862d160c05.png

---

## FUNCIONALIDADES IMPLEMENTADAS

### FASE 1 - Sistema de Permissões ✅
| Perfil | Acesso | Edição |
|--------|--------|--------|
| Admin | Total | Total + Define permissões |
| Treinador/Adjunto | Equipa | Equipa (sem dados familiares) |
| Delegado | Equipa | Equipa (sem dados familiares) |
| Jogador | Equipa (leitura) | Apenas próprio perfil |
| Responsável | Filhos | Dados familiares |

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

---

## PRÓXIMAS TAREFAS (Backlog)

### P1 - Pendente
- Configurar API Key Resend para emails reais (atualmente MOCKED)
- Atualizar Import Excel com campos: Nome, Apelido, Data Nascimento, Email, Função
- Web Scraping Opção A (divisões específicas APL)

### P2 - Futuro
- Dashboard com métricas e gráficos
- Exportar calendário em PDF
- Expandir traduções i18n para restantes páginas
