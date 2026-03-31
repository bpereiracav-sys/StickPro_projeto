import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDateTime(date) {
  if (!date) return '';
  return `${formatDate(date)} às ${formatTime(date)}`;
}

export function getInitials(name) {
  if (!name) return '??';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Internal role keys mapping (for backwards compatibility)
export const ROLE_INTERNAL_KEYS = {
  // Portuguese (legacy DB values)
  admin: 'admin',
  gestor_desportivo: 'sports_manager',
  treinador: 'coach',
  treinador_adjunto: 'assistant_coach',
  delegado: 'delegate',
  jogador: 'player',
  responsavel: 'guardian',
  // English internal keys
  sports_manager: 'sports_manager',
  sports_director: 'sports_director',
  coach: 'coach',
  assistant_coach: 'assistant_coach',
  delegate: 'delegate',
  player: 'player',
  guardian: 'guardian',
};

// Role groups for team view
export const ROLE_GROUPS = {
  players: ['player', 'jogador'],
  staff: ['coach', 'assistant_coach', 'delegate', 'sports_director', 'sports_manager', 'treinador', 'treinador_adjunto', 'delegado', 'gestor_desportivo', 'admin']
};

// Check if role is staff
export function isStaffRole(role) {
  return ROLE_GROUPS.staff.includes(role);
}

// Check if role is player
export function isPlayerRole(role) {
  return ROLE_GROUPS.players.includes(role);
}

// Normalize role to internal key
export function normalizeRole(role) {
  if (!role) return 'player';
  const lowerRole = role.toLowerCase().trim();
  return ROLE_INTERNAL_KEYS[lowerRole] || lowerRole;
}

// Get role name (fallback for non-translated contexts)
export function getRoleName(role, translations = null) {
  // If translations provided, use them
  if (translations?.roles?.[role]) {
    return translations.roles[role];
  }
  
  // Fallback to static mapping (Portuguese)
  const roles = {
    admin: 'Administrador',
    gestor_desportivo: 'Gestor Desportivo',
    sports_manager: 'Gestor Desportivo',
    sports_director: 'Diretor Desportivo',
    treinador: 'Treinador',
    coach: 'Treinador',
    treinador_adjunto: 'Treinador Adjunto',
    assistant_coach: 'Treinador Adjunto',
    delegado: 'Delegado',
    delegate: 'Delegado',
    jogador: 'Jogador',
    player: 'Jogador',
    responsavel: 'Responsável',
    guardian: 'Responsável'
  };
  return roles[role] || role;
}

export function getEventTypeName(type) {
  const types = {
    jogo: 'Jogo',
    treino: 'Treino',
    campeonato: 'Campeonato'
  };
  return types[type] || type;
}

export function getStatusName(status) {
  const statuses = {
    confirmado: 'Confirmado',
    ausente: 'Ausente',
    pendente: 'Pendente'
  };
  return statuses[status] || status;
}

export function getStatusColor(status) {
  const colors = {
    confirmado: 'status-confirmed',
    ausente: 'status-absent',
    pendente: 'status-pending'
  };
  return colors[status] || '';
}

export function getRoleColor(role) {
  const colors = {
    admin: 'role-admin',
    treinador: 'role-coach',
    delegado: 'role-delegate',
    jogador: 'role-player',
    responsavel: 'role-parent'
  };
  return colors[role] || '';
}
