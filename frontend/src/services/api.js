import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

if (!BACKEND_URL) {
  console.error('REACT_APP_BACKEND_URL is not defined');
}

const API_URL = `${BACKEND_URL || ''}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Teams API
export const teamsApi = {
  getAll: () => api.get('/teams'),
  getOne: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post('/teams', data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  delete: (id) => api.delete(`/teams/${id}`),
  getMembers: (id) => api.get(`/teams/${id}/members`),
  getMembersForMessage: (id) => api.get(`/teams/${id}/members-for-message`),
  addMember: (teamId, data) => api.post(`/teams/${teamId}/members`, data),
  removeMember: (teamId, userId) => api.delete(`/teams/${teamId}/members/${userId}`),
  updateMemberRole: (teamId, userId, role) =>
    api.put(`/teams/${teamId}/members/${userId}/role`, { role }),
  getStats: (id, championshipId) =>
    api.get(`/teams/${id}/stats`, { params: { championship_id: championshipId } }),
  getAttendance: (id, params) => api.get(`/teams/${id}/attendance`, { params }),
  getAttendanceSummary: (id) => api.get(`/teams/${id}/attendance/summary`),
  searchAttendance: (id, query) =>
    api.get(`/teams/${id}/attendance/search`, { params: { query } }),
  getAttendanceUnavailabilities: (id) => api.get(`/teams/${id}/attendance/unavailabilities`),

  // Add existing club member to team
  addExistingMember: (teamId, memberId) =>
    api.post(`/teams/${teamId}/add-existing-member/${memberId}`),
};

// Championships API
export const championshipsApi = {
  getAll: (params) => api.get('/championships', { params }),
  getOne: (id) => api.get(`/championships/${id}`),
  create: (data) => api.post('/championships', data),
  update: (id, data) => api.put(`/championships/${id}`, data),
  delete: (id) => api.delete(`/championships/${id}`),
  getMatches: (id) => api.get(`/championships/${id}/matches`),
  createMatch: (id, data) => api.post(`/championships/${id}/matches`, data),
  updateMatch: (matchId, data) => api.put(`/championships/matches/${matchId}`, data),
  updateMatchResult: (matchId, data) =>
    api.put(`/championships/matches/${matchId}/result`, data),
  deleteMatch: (matchId) => api.delete(`/championships/matches/${matchId}`),
  getStandings: (id) => api.get(`/championships/${id}/standings`),
  getMatchPlayerStats: (matchId) => api.get(`/matches/${matchId}/player-stats`),
  createMatchPlayerStats: (matchId, data) =>
    api.post(`/matches/${matchId}/player-stats`, data),

  // Match Lineups
  getMatchLineup: (matchId) => api.get(`/championships/matches/${matchId}/lineup`),
  saveMatchLineup: (matchId, data) =>
    api.post(`/championships/matches/${matchId}/lineup`, data),
  deleteMatchLineup: (matchId) => api.delete(`/championships/matches/${matchId}/lineup`),

  // Competition Teams
  getCompetitionTeams: (championshipId) => api.get(`/championships/${championshipId}/teams`),
  createCompetitionTeam: (championshipId, data) =>
    api.post(`/championships/${championshipId}/teams`, data),
  updateCompetitionTeam: (teamId, data) =>
    api.put(`/championships/teams/${teamId}`, data),
  deleteCompetitionTeam: (teamId) => api.delete(`/championships/teams/${teamId}`),

  importCompetitionTeams: (championshipId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/championships/${championshipId}/teams/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Import matches from Excel/CSV
  importMatches: (championshipId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/championships/${championshipId}/matches/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Download import template
  downloadMatchesTemplate: () => {
    const baseUrl = BACKEND_URL || '';
    const token = localStorage.getItem('token');
    return `${baseUrl}/api/championships/matches/import-template?token=${token}`;
  },

  // Extract player stats from gamesheet URL
  extractGamesheetStats: (url) => api.post('/championships/extract-gamesheet-stats', { url }),

  // Get gamesheet stats for a match
  getMatchGamesheetStats: (matchId) =>
    api.get(`/championships/matches/${matchId}/gamesheet-stats`),

  // Save player match stats
  savePlayerMatchStats: (matchId, playerId, data) =>
    api.post(`/matches/${matchId}/player-stats`, {
      match_id: matchId,
      player_id: playerId,
      ...data,
    }),
};

// Events API
export const eventsApi = {
  getAll: (params) => api.get('/events', { params }),
  getOne: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  getAttendance: (id) => api.get(`/events/${id}/attendance`),
  getEventAttendance: (id) => api.get(`/events/${id}/attendance`),
  createConvocation: (eventId, data) =>
    api.post('/convocations', { event_id: eventId, ...data }),
  getConvocationStatus: (eventId) => api.get(`/events/${eventId}/convocation-status`),
  updateConvocationStatus: (eventId, playerId, status) =>
    api.put(`/events/${eventId}/convocation-status`, { player_id: playerId, status }),
  sendReminder: (eventId) => api.post(`/events/${eventId}/send-reminder`),
  autoMarkAbsent: (eventId) => api.post(`/events/${eventId}/auto-mark-absent`),
};

// Convocations API
export const convocationsApi = {
  getAll: (params) => api.get('/convocations', { params }),
  getMy: () => api.get('/convocations/my'),
  create: (data) => api.post('/convocations', data),
  updateAttendance: (id, data) => api.put(`/attendance/${id}`, data),
  getMyDetailed: () => api.get('/attendance/my/detailed'),
};

// Messages API
export const messagesApi = {
  getByTeam: (teamId, limit) => api.get(`/messages/${teamId}`, { params: { limit } }),
  send: (data) => api.post('/messages', data),
};

// Users API
export const usersApi = {
  getAll: (params) => api.get('/users', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  updateProfile: (id, profileData) => api.put(`/users/${id}`, { profile: profileData }),
  updateRole: (id, role) => api.put(`/users/${id}/role`, { role }),
  updateAdminRole: (id, isAdmin) => api.put(`/users/${id}/admin-role`, { is_admin: isAdmin }),
  getConsolidatedStats: (id) => api.get(`/player-stats/${id}/consolidated`),
  getMatchStats: (id, championshipId) =>
    api.get(`/players/${id}/match-stats`, { params: { championship_id: championshipId } }),

  // Associated accounts
  getAssociated: () => api.get('/users/associated'),
  searchToAssociate: (email) =>
    api.post('/users/associate/search', null, { params: { email } }),
  associate: (childUserId, relationship) =>
    api.post('/users/associate', { child_user_id: childUserId, relationship }),
  removeAssociation: (childId) => api.delete(`/users/associate/${childId}`),

  // Player linking for family accounts
  linkPlayer: (playerId) => api.post('/users/link-player', { player_id: playerId }),
  linkPlayers: (playerIds) => api.post('/users/link-players', { player_ids: playerIds }),
  unlinkPlayer: () => api.delete('/users/link-player'),
};

// Auth API
export const authApi = {
  getProfiles: () => api.get('/auth/profiles'),
  switchProfile: (data) => api.post('/auth/switch-profile', data),
  activateAccount: (token, password) =>
    api.post('/auth/activate', { token, password }),
};

// Club API
export const clubApi = {
  getAll: () => api.get('/clubs'),
  getOne: (id) => api.get(`/clubs/${id}`),
  create: (data) => api.post('/clubs', data),
  update: (id, data) => api.put(`/clubs/${id}`, data),
  getMembers: (clubId) => api.get(`/clubs/${clubId}/members`),
  searchMembers: (clubId, query) =>
    api.get(`/clubs/${clubId}/members/search`, { params: { query } }),
};

// Seasons API
export const seasonsApi = {
  getAll: (clubId) => api.get(`/clubs/${clubId}/seasons`),
  getActive: (clubId) => api.get(`/clubs/${clubId}/seasons/active`),
  create: (clubId, data) => api.post(`/clubs/${clubId}/seasons`, data),
  update: (clubId, seasonId, data) =>
    api.put(`/clubs/${clubId}/seasons/${seasonId}`, data),
  delete: (clubId, seasonId) => api.delete(`/clubs/${clubId}/seasons/${seasonId}`),
  activate: (clubId, seasonId) =>
    api.put(`/clubs/${clubId}/seasons/${seasonId}/activate`),
};

// Subscription API
export const subscriptionApi = {
  get: () => api.get('/subscription'),
  update: (data) => api.patch('/subscription', data),
  cancel: () => api.post('/subscription/cancel'),
  getInvoices: () => api.get('/subscription/invoices'),
  getInvoice: (invoiceId) => api.get(`/subscription/invoices/${invoiceId}`),
  createInvoice: (data) => api.post('/subscription/invoices', data),
  updateInvoice: (invoiceId, data) =>
    api.patch(`/subscription/invoices/${invoiceId}`, data),
  downloadInvoice: (invoiceId) =>
    api.get(`/subscription/invoices/${invoiceId}/download`),
};

// Permissions API
export const permissionsApi = {
  getDefaults: () => api.get('/permissions/defaults'),
  getForUser: (userId) => api.get(`/permissions/${userId}`),
  updateForUser: (userId, permissions) =>
    api.put(`/permissions/${userId}`, permissions),
};

// Unavailabilities API
export const unavailabilitiesApi = {
  getAll: (params) => api.get('/unavailabilities', { params }),
  getMy: () => api.get('/unavailabilities/my'),
  create: (data) => api.post('/unavailabilities', data),
  update: (id, data) => api.put(`/unavailabilities/${id}`, data),
  delete: (id) => api.delete(`/unavailabilities/${id}`),
  check: (playerIds, eventDate) =>
    api.get('/unavailabilities/check', {
      params: { player_ids: playerIds.join(','), event_date: eventDate },
    }),
  getUpcomingWithoutConvocation: () => api.get('/events/upcoming-without-convocation'),
};

// Payments API
export const paymentsApi = {
  getMy: () => api.get('/payments/my'),
  getStatus: () => api.get('/payments/status'),
  getAll: (params) => api.get('/payments/admin', { params }),
  getSummary: () => api.get('/payments/summary'),
  getUserPayments: (userId) => api.get(`/users/${userId}/payments`),
  exportExcel: (params) =>
    api.get('/payments/export', {
      params,
      responseType: 'blob',
    }),
  createMonthlyFee: (data) => api.post('/payments/monthly-fees', data),
  createBulkFees: (data) =>
    api.post('/payments/monthly-fees/bulk', null, { params: data }),
  importFees: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/payments/monthly-fees/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  createCustom: (data) => api.post('/payments/custom', data),
  markPaid: (type, id) => api.put(`/payments/${type}/${id}/mark-paid`),
  uploadProof: (type, id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.put(`/payments/${type}/${id}/upload-proof`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: (type, id) => api.delete(`/payments/${type}/${id}`),
  updateSettings: (userId, data) => api.put(`/users/${userId}/payment-settings`, data),
};

// Members API
export const membersApi = {
  getAll: (params) => api.get('/members', { params }),
  getArchived: (params) => api.get('/members/archived', { params }),
  getOne: (id) => api.get(`/members/${id}`),
  create: (data) => api.post('/members', data),
  update: (id, data) => api.put(`/members/${id}`, data),
  delete: (id) => api.delete(`/members/${id}`),
  archive: (id) => api.post(`/members/${id}/archive`),
  restore: (id, teamId) =>
    api.post(`/members/${id}/restore`, null, { params: { team_id: teamId } }),
  sendInvite: (id) => api.post(`/members/${id}/send-invite`),
  addToTeam: (memberId, teamId) => api.post(`/members/${memberId}/teams/${teamId}`),
  removeFromTeam: (memberId, teamId) =>
    api.delete(`/members/${memberId}/teams/${teamId}`),
  exportExcel: (params) =>
    api.get('/members/export', {
      params,
      responseType: 'blob',
    }),
  import: (file, clubId, teamId) => {
    const formData = new FormData();
    formData.append('file', file);
    const params = new URLSearchParams();
    if (clubId) params.append('club_id', clubId);
    if (teamId) params.append('team_id', teamId);
    return api.post(`/members/import?${params.toString()}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Dashboard API
export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

// Library API
export const libraryApi = {
  getAll: (params) => api.get('/library', { params }),
  getCategories: () => api.get('/library/categories'),
  create: (data) => api.post('/library', data),
  update: (id, data) => api.put(`/library/${id}`, data),
  delete: (id) => api.delete(`/library/${id}`),
};

// AI Assistant API
export const aiApi = {
  chat: (message, sessionId, language = 'pt') =>
    api.post('/ai/chat', {
      message,
      session_id: sessionId,
      language
    }),

  getHistory: (sessionId) =>
    api.get('/ai/chat/history', { params: { session_id: sessionId } }),

  clearHistory: (sessionId) =>
    api.delete('/ai/chat/history', { params: { session_id: sessionId } }),
};

// Guardian API
export const guardianApi = {
  getChildren: () => api.get('/guardian/children'),
  getChildTeams: (childId) => api.get(`/guardian/children/${childId}/teams`),
};

export default api;
