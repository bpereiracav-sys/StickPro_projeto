export const DEFAULT_ROTATION_PLAN = [
  { segment: 1, label: '1.ª parte - período 1', players: [] },
  { segment: 2, label: '1.ª parte - período 2', players: [] },
  { segment: 3, label: '2.ª parte - período 1', players: [] },
  { segment: 4, label: '2.ª parte - período 2', players: [] },
];

export const STATUS_LABELS = {
  draft: 'Rascunho',
  prepared: 'Preparado',
  confirmed: 'Confirmado',
  official: 'Oficial',
  archived: 'Arquivado',
};

export function getPlayerName(player) {
  return player?.name || 'Jogador';
}

export function getJerseyNumber(player) {
  return (
    player?.profile?.sports_info?.jersey_number ||
    player?.profile?.jersey_number ||
    '-'
  );
}

export function isGoalkeeper(player) {
  const position =
    player?.profile?.sports_info?.position ||
    player?.profile?.position ||
    '';

  return (
    position.toLowerCase().includes('gr') ||
    position.toLowerCase().includes('guarda') ||
    position.toLowerCase().includes('redes')
  );
}

export function buildPlayerMap(members) {
  const map = new Map();
  members.forEach((player) => map.set(player.id, player));
  return map;
}

export function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}
