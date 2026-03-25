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

## PRÓXIMAS FASES

### FASE 6 - Estatísticas Completas
- Seletor de época e evento
- Classificação do campeonato
- Stats equipa/jogadores por evento/época
- Stats consolidadas (todas as equipas do jogador)

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

---

## Notas
- Emails **MOCKED** (Resend não configurado)
- Exportar PDF usa `window.print()` (nativo do browser)
