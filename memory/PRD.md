# Roller Hockey Hub - PRD

## Problem Statement
Construir uma aplicação semelhante ao SportEasy mas exclusivamente para hóquei em patins.

## User Personas
1. **Administrador** - Gestão completa do clube
2. **Treinador** - Gestão de equipas, convocatórias, estatísticas
3. **Delegado** - Staff técnico, gestão de eventos (sem composição de equipas)
4. **Jogador** - Confirmar presenças, ver calendário, chat
5. **Responsável/Pai** - Acompanhar jogadores

## Core Requirements
- Autenticação JWT (email/password)
- Gestão de equipas e jogadores
- Calendário de jogos e treinos
- Sistema de convocatórias com confirmação de presença
- Chat de equipa
- Estatísticas de jogos (golos, assistências, cartões)
- Notificações por email (MOCK - configurar Resend)

## What's Been Implemented (Jan 2026)

### Backend (FastAPI + MongoDB)
- ✅ Auth: Register, Login, JWT tokens
- ✅ Users: CRUD, roles, profiles
- ✅ Teams: Create, manage members, stats
- ✅ Events: Games & trainings calendar
- ✅ Convocations: Create, confirm attendance
- ✅ Messages: Team chat
- ✅ Game Stats: Track player performance
- ✅ Dashboard: Aggregated data

### Frontend (React + Tailwind + Shadcn/UI)
- ✅ Landing page with hero section
- ✅ Auth pages (Login/Register)
- ✅ Dashboard with stats and events
- ✅ Teams management
- ✅ Team detail with roster & stats
- ✅ Calendar with event creation
- ✅ Convocations with attendance
- ✅ Team chat
- ✅ Settings page

## Architecture
- Backend: FastAPI on port 8001
- Frontend: React on port 3000
- Database: MongoDB
- Auth: JWT tokens

## P0/P1/P2 Features

### P0 (Done)
- User auth
- Team management
- Calendar
- Convocations
- Chat

### P1 (Next)
- Email notifications (configure Resend API)
- Game detail page with live stats entry
- Player profile page with full stats

### P2 (Backlog)
- Push notifications
- Export stats to PDF
- Photo gallery per team
- Season standings
