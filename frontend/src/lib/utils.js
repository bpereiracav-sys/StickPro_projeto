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

export function getRoleName(role) {
  const roles = {
    admin: 'Administrador',
    treinador: 'Treinador',
    delegado: 'Delegado',
    jogador: 'Jogador',
    responsavel: 'Responsável'
  };
  return roles[role] || role;
}

export function getEventTypeName(type) {
  const types = {
    jogo: 'Jogo',
    treino: 'Treino'
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
