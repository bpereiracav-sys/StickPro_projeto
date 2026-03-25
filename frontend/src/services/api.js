import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
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
  addMember: (teamId, data) => api.post(`/teams/${teamId}/members`, data),
  removeMember: (teamId, userId) => api.delete(`/teams/${teamId}/members/${userId}`),
  getStats: (id) => api.get(`/teams/${id}/stats`)
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
  getStats: (id, teamId) => api.get(`/player-stats/${id}`, { params: { team_id: teamId } }),
  getConsolidatedStats: (id) => api.get(`/player-stats/${id}/consolidated`)
};

// Game Stats API
export const gameStatsApi = {
  get: (eventId) => api.get(`/game-stats/${eventId}`),
  create: (data) => api.post('/game-stats', data)
};

// Dashboard API
export const dashboardApi = {
  get: () => api.get('/dashboard')
};

export default api;
