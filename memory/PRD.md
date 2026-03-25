# Roller Hockey Hub - Product Requirements Document

## Declaração do Problema Original
Construir uma aplicação web para gestão de equipas de hóquei em patins, similar ao SportEasy.

## User Personas
- **Jogador**: Consulta calendário, confirma presenças, vê estatísticas pessoais
- **Treinador/Adjunto**: Gere equipas, cria eventos, convocatórias (sem acesso a dados familiares)
- **Delegado**: Apoia o treinador na gestão administrativa (sem acesso a dados familiares)
- **Responsável/Encarregado**: Acompanha os filhos/atletas
- **Administrador do Clube**: Gestão global, define permissões, acesso total

---

## FASE 1 - Sistema de Permissões ✅ CONCLUÍDO

### Perfis Implementados:
| Perfil | Acesso | Edição |
|--------|--------|--------|
| **Admin** | Total | Total + Define permissões |
| **Treinador** | Equipa | Equipa (sem dados familiares) |
| **Treinador Adjunto** | Equipa | Equipa (sem dados familiares) |
| **Delegado** | Equipa | Equipa (sem dados familiares) |
| **Jogador** | Equipa (leitura) | Apenas próprio perfil |
| **Responsável** | Filhos | Dados familiares |

### Endpoints Implementados:
- `GET /api/permissions/defaults` - Ver permissões por defeito (admin)
- `GET /api/permissions/{user_id}` - Ver permissões de utilizador
- `PUT /api/permissions/{user_id}` - Modificar permissões (admin)

---

## FASE 2 - Novo Layout e Navegação ✅ CONCLUÍDO

### Barra de Navegação Superior (TopNavBar):
- **Meu Clube** - Página do clube com logo e informações
- **Minhas Equipas** - Dropdown com lista de equipas do utilizador
- **Equipas dos Meus Filhos** - Só aparece se tiver contas associadas
- **Meu Perfil** - Acesso rápido ao perfil

### Página do Clube (/club):
- Logo do clube (URL)
- Nome, Morada, Cidade, País
- Ano de Fundação
- Website, Email, Telefone
- Admin pode criar/editar, outros só visualizam

### Página de Perfil Completa (/profile):

**Tab 1 - Identidade:**
- Foto (URL)
- Nome, Apelido, Alcunha
- Email da conta
- Data de nascimento
- Licença FPP

**Tab 2 - Familiares:**
- Pai/Responsável 1 (nome, apelido, email, telefone)
- Pai/Responsável 2 (nome, apelido, email, telefone)
- Outros familiares (adicionar/remover)

**Tab 3 - Dados Biométricos:**
- Peso (kg)
- Altura (cm)
- Tamanho do calçado (texto livre)

**Tab 4 - Informação Desportiva:**
- Ano de chegada ao clube
- Nº da FPP
- Função (Jogador/Treinador/Treinador Adjunto/Delegado)
- Posição (GR/JC)
- Nº da camisola

**Tab 5 - Equipamento:**
- Tamanho kit de treino
- Tamanho fato de treino
- Tamanho polo de saída
- Tamanho meia de treino

---

## FUNCIONALIDADES ANTERIORES ✅

### Contas Associadas
- Vincular contas pai/filho
- Seleção de perfil no login
- Alternar perfis no sidebar

### Autenticação
- JWT login (email/password)
- Registo com seleção de role

### Gestão de Equipas
- Criar/editar equipas
- Adicionar/remover membros
- Seletor de equipa no sidebar

### Calendário & Eventos
- Criar eventos (treinos, jogos)
- Dashboard com próximos eventos

### Convocatórias
- Criar e responder a convocatórias
- Dashboard com pendentes

### Campeonatos
- Criar campeonatos por época
- Registar resultados
- Tabela classificativa

### Estatísticas
- Stats por jogador
- Stats consolidadas

### Presenças
- Vista por equipa
- Filtros por mês/evento

### Mensagens
- Chat por equipa

---

## PRÓXIMAS FASES (A Implementar)

### FASE 3 - Membros Expandido
- Já implementado através da página de Perfil

### FASE 4 - Calendário Avançado
- Vistas: Diária, Semanal, Mensal
- Tipos: Treino, Jogo Campeonato, Amigável, Torneio, Outros
- Convocatórias: Escolher jogadores, enviar mensagem, visibilidade
- Edição: Alterar data/hora/local, adiar, cancelar
- Exportar PDF

### FASE 5 - Presenças Avançadas
- Filtros: Época, Evento (CN 1ª fase, etc.)
- Vistas: Por evento, semana, mês, época

### FASE 6 - Estatísticas Completas
- Seletor de época e evento
- Classificação do campeonato
- Stats consolidadas

### FASE 7 - Campeonatos Expandido
- Formato (5x5/3x3)
- Convocatória automática/manual

---

## Arquitetura Técnica

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
│   ├── tests/
│   │   ├── test_phase1_phase2.py
│   └── requirements.txt
├── frontend/src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TopNavBar.jsx    # NOVO
│   │   │   ├── Sidebar.jsx
│   │   │   └── AppLayout.jsx
│   │   ├── profile/
│   │   │   └── ProfileSelectionModal.jsx
│   │   └── ui/
│   ├── pages/
│   │   ├── ClubPage.jsx         # NOVO
│   │   ├── ProfilePage.jsx      # NOVO
│   │   └── ...
│   └── services/api.js
└── memory/PRD.md
```

### Credenciais de Teste
- **Admin**: admin@example.com / test123456
- **Treinador**: test@example.com / test123456
- **Filho**: filho@example.com / test123456

### Preview URL
https://roller-hockey-hub-1.preview.emergentagent.com

---

## Testes Realizados

### Iteração 4 (Fase 1 & 2):
- Backend: 16/16 testes (100%)
- Frontend: 100% funcional

### Funcionalidades Verificadas:
- TopNavBar com 4 menus
- ClubPage (criar/editar como admin)
- ProfilePage com 5 tabs
- Sistema de permissões
- Menu "Equipas dos Meus Filhos" condicional

---

## Notas
- Emails **MOCKED** (Resend não configurado)
- Tamanhos de equipamento são texto livre (S/M/L ou 8/10/12)
