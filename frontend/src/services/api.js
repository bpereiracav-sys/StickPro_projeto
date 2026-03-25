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
  updateMatchResult: (matchId, data) => api.put(`/championships/matches/${matchId}/result`, data),
  getStandings: (id) => api.get(`/championships/${id}/standings`),
  getMatchPlayerStats: (matchId) => api.get(`/matches/${matchId}/player-stats`),
  createMatchPlayerStats: (matchId, data) => api.post(`/matches/${matchId}/player-stats`, data)
};

// Events API
export const eventsApi = {
  getAll: (params) => api.get('/events', { params }),
  getOne: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  getAttendance: (id) => api.get(`/events/${id}/attendance`)
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
  getConsolidatedStats: (id) => api.get(`/player-stats/${id}/consolidated`),
  getMatchStats: (id, championshipId) => api.get(`/players/${id}/match-stats`, { params: { championship_id: championshipId } })
};

// Dashboard API
export const dashboardApi = {
  get: () => api.get('/dashboard')
};

export default api;
