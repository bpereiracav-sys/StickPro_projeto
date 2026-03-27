import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
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
  getStats: (id, championshipId) => api.get(`/teams/${id}/stats`, { params: { championship_id: championshipId } }),
  getAttendance: (id, params) => api.get(`/teams/${id}/attendance`, { params }),
  getAttendanceSummary: (id) => api.get(`/teams/${id}/attendance/summary`)
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
  updateMatchResult: (matchId, data) => api.put(`/championships/matches/${matchId}/result`, data),
  deleteMatch: (matchId) => api.delete(`/championships/matches/${matchId}`),
  getStandings: (id) => api.get(`/championships/${id}/standings`),
  getMatchPlayerStats: (matchId) => api.get(`/matches/${matchId}/player-stats`),
  createMatchPlayerStats: (matchId, data) => api.post(`/matches/${matchId}/player-stats`, data),
  // Match Lineups
  getMatchLineup: (matchId) => api.get(`/championships/matches/${matchId}/lineup`),
  saveMatchLineup: (matchId, data) => api.post(`/championships/matches/${matchId}/lineup`, data),
  deleteMatchLineup: (matchId) => api.delete(`/championships/matches/${matchId}/lineup`)
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
  createConvocation: (eventId, data) => api.post('/convocations', { event_id: eventId, ...data })
};

// Convocations API
export const convocationsApi = {
  getAll: (params) => api.get('/convocations', { params }),
  getMy: () => api.get('/convocations/my'),
  create: (data) => api.post('/convocations', data),
  updateAttendance: (id, data) => api.put(`/attendance/${id}`, data)
};

// Messages API
export const messagesApi = {
  getByTeam: (teamId, limit) => api.get(`/messages/${teamId}`, { params: { limit } }),
  send: (data) => api.post('/messages', data)
};

// Users API
export const usersApi = {
  getAll: (params) => api.get('/users', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  updateProfile: (id, profileData) => api.put(`/users/${id}`, { profile: profileData }),
  updateRole: (id, role) => api.put(`/users/${id}/role`, { role }),
  getConsolidatedStats: (id) => api.get(`/player-stats/${id}/consolidated`),
  getMatchStats: (id, championshipId) => api.get(`/players/${id}/match-stats`, { params: { championship_id: championshipId } }),
  // Associated accounts
  getAssociated: () => api.get('/users/associated'),
  searchToAssociate: (email) => api.post('/users/associate/search', null, { params: { email } }),
  associate: (childUserId, relationship) => api.post('/users/associate', { child_user_id: childUserId, relationship }),
  removeAssociation: (childId) => api.delete(`/users/associate/${childId}`)
};

// Auth API
export const authApi = {
  getProfiles: () => api.get('/auth/profiles'),
  switchProfile: (data) => api.post('/auth/switch-profile', data)
};

// Club API
export const clubApi = {
  getAll: () => api.get('/clubs'),
  getOne: (id) => api.get(`/clubs/${id}`),
  create: (data) => api.post('/clubs', data),
  update: (id, data) => api.put(`/clubs/${id}`, data),
  getMembers: (clubId) => api.get(`/clubs/${clubId}/members`)
};

// Members API
export const membersApi = {
  create: (data) => api.post('/members', data),
  import: (file, clubId, teamId) => {
    const formData = new FormData();
    formData.append('file', file);
    const params = new URLSearchParams();
    if (clubId) params.append('club_id', clubId);
    if (teamId) params.append('team_id', teamId);
    return api.post(`/members/import?${params.toString()}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  addToTeam: (memberId, teamId) => api.post(`/members/${memberId}/teams/${teamId}`),
  removeFromTeam: (memberId, teamId) => api.delete(`/members/${memberId}/teams/${teamId}`)
};

// Permissions API
export const permissionsApi = {
  getDefaults: () => api.get('/permissions/defaults'),
  getForUser: (userId) => api.get(`/permissions/${userId}`),
  updateForUser: (userId, permissions) => api.put(`/permissions/${userId}`, permissions)
};

// Unavailabilities API
export const unavailabilitiesApi = {
  getAll: (params) => api.get('/unavailabilities', { params }),
  getMy: () => api.get('/unavailabilities/my'),
  create: (data) => api.post('/unavailabilities', data),
  update: (id, data) => api.put(`/unavailabilities/${id}`, data),
  delete: (id) => api.delete(`/unavailabilities/${id}`),
  check: (playerIds, eventDate) => api.get('/unavailabilities/check', { 
    params: { player_ids: playerIds.join(','), event_date: eventDate } 
  }),
  getUpcomingWithoutConvocation: () => api.get('/events/upcoming-without-convocation')
};

// Dashboard API
export const dashboardApi = {
  get: () => api.get('/dashboard')
};

// Library API
export const libraryApi = {
  getAll: (params) => api.get('/library', { params }),
  getCategories: () => api.get('/library/categories'),
  create: (data) => api.post('/library', data),
  update: (id, data) => api.put(`/library/${id}`, data),
  delete: (id) => api.delete(`/library/${id}`)
};

// AI Assistant API
export const aiApi = {
  chat: (message, sessionId) => api.post('/ai/chat', { message, session_id: sessionId }),
  getHistory: (sessionId) => api.get('/ai/chat/history', { params: { session_id: sessionId } }),
  clearHistory: (sessionId) => api.delete('/ai/chat/history', { params: { session_id: sessionId } })
};

export default api;
