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
- [ ] Contas Associadas (em progresso) - vincular contas pai/filho

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

---

## O Que Foi Implementado (Março 2025)

### Estabilização da Aplicação ✅
- Corrigidas rotas em falta no App.js (Members, Championships, ChampionshipDetail, MatchStats, Attendance, Messages)
- Criada página Attendance.jsx completa
- Corrigido bug do Select component com valores vazios
- Corrigidos 5 endpoints com erro de serialização MongoDB ObjectId:
  - POST /api/championships
  - POST /api/events
  - POST /api/messages
  - POST /api/championships/{id}/matches
  - POST /api/convocations

### Funcionalidades Completas
1. **Dashboard** - Próximos eventos, convocatórias pendentes, estatísticas rápidas
2. **Calendário** - Visualização e criação de eventos
3. **Membros** - Gestão de plantel e staff técnico
4. **Campeonatos** - CRUD de campeonatos, jogos, resultados, classificação
5. **Presenças** - Assiduidade por jogador com filtros avançados
6. **Estatísticas** - Estatísticas individuais e da equipa
7. **Mensagens** - Chat por equipa com polling de 5s
8. **Definições** - Perfil do utilizador

### Status dos Testes
- Backend: 23/23 testes passados (100%)
- Frontend: Todas as páginas funcionais
- Navegação: Todos os links da sidebar funcionam

---

## Backlog Prioritizado

### P0 - Crítico (Próximas tarefas)
- [ ] Completar funcionalidade "Contas Associadas":
  - Permitir vincular contas (pai/filho)
  - UI de seleção de perfil no login
  - Alternar entre perfis no sidebar

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
│       └── test_api.py    # Testes pytest
├── frontend/
│   ├── src/
│   │   ├── App.js         # Router principal
│   │   ├── components/
│   │   │   ├── layout/    # AppLayout, Sidebar, Header
│   │   │   └── ui/        # Componentes Shadcn
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/         # Todas as páginas
│   │   ├── services/
│   │   │   └── api.js     # Cliente Axios
│   │   └── lib/
│   │       └── utils.js   # Helpers
│   └── package.json
└── memory/
    └── PRD.md             # Este ficheiro
```

### Credenciais de Teste
- Email: test@example.com
- Password: test123456
- Role: treinador

### Preview URL
https://roller-hockey-hub-1.preview.emergentagent.com

---

## Notas Importantes
- Emails estão **MOCKED** - para ativar, configurar RESEND_API_KEY no backend/.env
- MongoDB ObjectId deve ser excluído de todas as respostas (usar `.pop('_id', None)`)
- Frontend usa hot reload - reiniciar supervisor apenas para .env ou dependências
