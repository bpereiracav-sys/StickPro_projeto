# Roller Hockey Hub - Product Requirements Document

## Declaração do Problema Original
Construir uma aplicação web para gestão de equipas de hóquei em patins, similar ao SportEasy.

## User Personas
- **Jogador**: Consulta calendário, confirma presenças, vê estatísticas pessoais
- **Treinador**: Gere equipas, cria eventos, convocatórias, regista estatísticas
- **Delegado**: Apoia o treinador na gestão administrativa
- **Responsável/Encarregado**: Acompanha os filhos/atletas
- **Administrador do Clube**: Gestão global de todas as equipas

## Requisitos Core

### Autenticação
- [x] JWT-based login (email/password)
- [x] Registo de utilizadores com role selection
- [x] **Contas Associadas** - vincular contas pai/filho ✅ NOVO

### Gestão de Equipas
- [x] Criar/editar equipas com nome, categoria, época
- [x] Adicionar/remover membros (treinadores, delegados, jogadores)
- [x] Seletor de equipa no sidebar

### Calendário & Eventos
- [x] Criar eventos (treinos, jogos, campeonatos)
- [x] Visualização de calendário
- [x] Dashboard com próximos eventos

### Convocatórias
- [x] Criar convocatórias para eventos
- [x] Jogadores confirmam/recusam presença
- [x] Dashboard mostra convocatórias pendentes

### Módulo de Campeonatos
- [x] Criar campeonatos por época
- [x] Agendar jogos (casa/fora/neutro)
- [x] Registar resultados
- [x] Tabela classificativa automática (V=3pts, E=1pt, D=0pts + bónus/penalização)

### Estatísticas Detalhadas por Jogo
- [x] Posição (GR/JC)
- [x] Minutos jogados
- [x] Golos e assistências
- [x] Penaltis (marcados/falhados/defendidos/sofridos)
- [x] Livres diretos (marcados/falhados/defendidos/sofridos)
- [x] Defesas (guarda-redes)
- [x] Cartões (azul, amarelo, branco, vermelho)

### Presenças
- [x] Vista de presenças por equipa
- [x] Filtros por mês, tipo de evento, campeonato
- [x] Taxa de assiduidade por jogador

### Estatísticas
- [x] Estatísticas individuais por jogador
- [x] Estatísticas consolidadas (agregadas de múltiplas equipas)
- [x] Ranking de marcadores e assistências

### Mensagens
- [x] Chat por equipa
- [x] Envio de mensagens em tempo real (polling)
- [ ] Anexos de ficheiros (futuro)
- [ ] Envio por email (MOCKED - requer API key Resend)

### Contas Associadas ✅ NOVO
- [x] Pesquisar utilizador por email para associar
- [x] Vincular conta filho a responsável
- [x] Lista de contas associadas na página de Definições
- [x] Remover associação
- [x] Modal de seleção de perfil após login (quando há múltiplos perfis)
- [x] Alternar entre perfis no menu do sidebar
- [x] Banner visual quando a ver como responsável
- [x] Botão "Voltar" para retornar ao perfil original

---

## O Que Foi Implementado

### 25 Março 2025 - Contas Associadas ✅
**Backend (server.py):**
- `GET /api/users/associated` - Lista contas associadas
- `POST /api/users/associate` - Associar conta filho
- `POST /api/users/associate/search?email=X` - Pesquisar por email
- `DELETE /api/users/associate/{child_id}` - Remover associação
- `POST /api/auth/switch-profile` - Alternar perfil

**Frontend:**
- `ProfileSelectionModal.jsx` - Modal de seleção após login
- `Settings.jsx` - Secção de gestão de contas associadas
- `Sidebar.jsx` - Profile switcher no menu do utilizador + banner amarelo
- `AuthContext.jsx` - Estado de perfil ativo, switching, localStorage

**Testes:**
- Backend: 16/16 testes passados (100%)
- Frontend: Todas as funcionalidades verificadas

### 25 Março 2025 - Estabilização
- Corrigidas rotas em falta no App.js
- Criada página Attendance.jsx
- Corrigidos 5 bugs de serialização MongoDB ObjectId
- Backend: 23/23 testes passados (100%)

---

## Backlog Prioritizado

### P0 - Crítico
- ✅ Contas Associadas (CONCLUÍDO)

### P1 - Alta Prioridade
- [ ] Configurar API Resend para emails reais
- [ ] Implementar anexos de ficheiros nas mensagens
- [ ] Melhorar UI de estatísticas do jogo (MatchStats)

### P2 - Média Prioridade
- [ ] Notificações push para convocatórias
- [ ] Exportar estatísticas para PDF/Excel
- [ ] Histórico de épocas anteriores

### P3 - Baixa Prioridade
- [ ] App mobile (React Native)
- [ ] Modo escuro
- [ ] Dashboard administrativo do clube

---

## Arquitetura Técnica

### Stack
- **Frontend**: React 18, TailwindCSS, Shadcn/UI, React Router
- **Backend**: FastAPI, Python 3.11
- **Database**: MongoDB (Motor async driver)
- **Auth**: JWT tokens (24h expiration)

### Estrutura de Ficheiros
```
/app
├── backend/
│   ├── server.py          # FastAPI app, todos os endpoints
│   ├── requirements.txt
│   └── tests/
│       └── test_associated_accounts.py
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.jsx
│   │   │   │   ├── Sidebar.jsx    # Profile switcher
│   │   │   │   └── Header.jsx
│   │   │   ├── profile/
│   │   │   │   └── ProfileSelectionModal.jsx
│   │   │   └── ui/
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Profile state management
│   │   ├── pages/
│   │   │   ├── Settings.jsx       # Associated accounts section
│   │   │   └── ...
│   │   └── services/
│   │       └── api.js
│   └── package.json
└── memory/
    └── PRD.md
```

### Credenciais de Teste
- **Responsável:** test@example.com / test123456
- **Filho associado:** filho@example.com / test123456

### Preview URL
https://roller-hockey-hub-1.preview.emergentagent.com

---

## Notas Importantes
- Emails estão **MOCKED** - para ativar, configurar RESEND_API_KEY no backend/.env
- MongoDB ObjectId deve ser excluído de todas as respostas
- Contas associadas permitem ao responsável ver as atividades do filho
