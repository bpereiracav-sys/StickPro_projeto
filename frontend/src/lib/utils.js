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
    year: 'numeric',
  });
}

export function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
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
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Canonical role keys used by the app.
 * We keep support for legacy/internal English values for backwards compatibility.
 */
export const ROLE_CANONICAL_KEYS = {
  admin: 'admin',
  gestor_desportivo: 'gestor_desportivo',
  treinador: 'treinador',
  treinador_adjunto: 'treinador_adjunto',
  delegado: 'delegado',
  jogador: 'jogador',
  responsavel: 'responsavel',
};

/**
 * Legacy/internal role aliases -> canonical role keys
 */
export const ROLE_ALIASES = {
  admin: 'admin',

  // Portuguese
  gestor_desportivo: 'gestor_desportivo',
  treinador: 'treinador',
  treinador_adjunto: 'treinador_adjunto',
  delegado: 'delegado',
  jogador: 'jogador',
  responsavel: 'responsavel',

  // English / legacy internal
  sports_manager: 'gestor_desportivo',
  sports_director: 'gestor_desportivo',
  coach: 'treinador',
  assistant_coach: 'treinador_adjunto',
  delegate: 'delegado',
  player: 'jogador',
  guardian: 'responsavel',
};

/**
 * Role groups based on canonical keys
 */
export const ROLE_GROUPS = {
  players: ['jogador'],
  staff: [
    'admin',
    'gestor_desportivo',
    'treinador',
    'treinador_adjunto',
    'delegado',
  ],
};

export function normalizeRole(role) {
  if (!role) return 'jogador';
  const lowerRole = String(role).toLowerCase().trim();
  return ROLE_ALIASES[lowerRole] || lowerRole;
}

export function isStaffRole(role) {
  return ROLE_GROUPS.staff.includes(normalizeRole(role));
}

export function isPlayerRole(role) {
  return ROLE_GROUPS.players.includes(normalizeRole(role));
}

/**
 * Get translated role name when translations are provided.
 * Falls back to Portuguese labels.
 */
export function getRoleName(role, translations = null) {
  const normalizedRole = normalizeRole(role);

  if (translations?.roles?.[normalizedRole]) {
    return translations.roles[normalizedRole];
  }

  const fallbackRoles = {
    admin: 'Administrador',
    gestor_desportivo: 'Gestor Desportivo',
    treinador: 'Treinador',
    treinador_adjunto: 'Treinador Adjunto',
    delegado: 'Delegado',
    jogador: 'Jogador',
    responsavel: 'Responsável',
  };

  return fallbackRoles[normalizedRole] || normalizedRole;
}

export function getEventTypeName(type) {
  const types = {
    jogo: 'Jogo',
    treino: 'Treino',
    campeonato: 'Campeonato',
  };
  return types[type] || type;
}

export function getStatusName(status) {
  const statuses = {
    confirmado: 'Confirmado',
    ausente: 'Ausente',
    pendente: 'Pendente',
  };
  return statuses[status] || status;
}

export function getStatusColor(status) {
  const colors = {
    confirmado: 'status-confirmed',
    ausente: 'status-absent',
    pendente: 'status-pending',
  };
  return colors[status] || '';
}

export function getRoleColor(role) {
  const normalizedRole = normalizeRole(role);

  const colors = {
    admin: 'role-admin',
    gestor_desportivo: 'role-admin',
    treinador: 'role-coach',
    treinador_adjunto: 'role-coach',
    delegado: 'role-delegate',
    jogador: 'role-player',
    responsavel: 'role-parent',
  };

  return colors[normalizedRole] || '';
}
