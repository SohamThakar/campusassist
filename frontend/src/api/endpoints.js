import api from './client';

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
};

export const complaintsAPI = {
  submit: (data) => api.post('/complaints', data),
  getById: (id) => api.get(`/complaints/${encodeURIComponent(id)}`),
  list: (params) => api.get('/complaints', { params }),
  uploadPhoto: (formData) => api.post('/complaints/upload', formData),
  uploadVideo: (formData) => api.post('/complaints/upload-video', formData),
  approve: (id, data) => api.post(`/complaints/${encodeURIComponent(id)}/approve`, data),
  reject: (id, data) => api.post(`/complaints/${encodeURIComponent(id)}/reject`, data),
  reassign: (id, data) => api.post(`/complaints/${encodeURIComponent(id)}/reassign`, data),
  // Student tracking
  listMine: () => api.get('/complaints/my'),
  getMineById: (id) => api.get(`/complaints/my/${encodeURIComponent(id)}`),
  // Duplicate & Master Issue endpoints
  confirmDuplicate: (id, data = {}) => api.post(`/complaints/${encodeURIComponent(id)}/confirm-duplicate`, data),
  dismissDuplicate: (id) => api.post(`/complaints/${encodeURIComponent(id)}/dismiss-duplicate`),
  listMasterIssues: () => api.get('/complaints/master-issues'),
  getMasterIssue: (id) => api.get(`/complaints/master-issues/${encodeURIComponent(id)}`),
  // Bulk delete by status: 'submitted' | 'approved' | 'rejected' | 'completed' | 'pending' | 'all'
  deleteAll: (statusFilter = 'pending') => api.delete('/complaints/all/clear', { params: { status_filter: statusFilter } }),
};

export const techniciansAPI = {
  list: (params) => api.get('/technicians', { params }),
  register: (data) => api.post('/technicians/register', data),
  verify: (id) => api.post(`/technicians/${id}/verify`),
  delete: (id) => api.delete(`/technicians/${id}`),
};

export const assignmentsAPI = {
  getMine: () => api.get('/assignments/mine'),
  accept: (id, data = {}) => api.post(`/assignments/${id}/accept`, data),
  reject: (id, data = {}) => api.post(`/assignments/${id}/reject`, data),
  complete: (id, data = {}) => api.post(`/assignments/${id}/complete`, data),
  delete: (id) => api.delete(`/assignments/${id}`),
  deleteAll: () => api.delete('/assignments/all/clear'),
};

export const analyticsAPI = {
  getPrincipal: () => api.get('/analytics/principal'),
  getAuthorityStats: () => api.get('/analytics/authority-stats'),
  getPrincipalReports: (params) => api.get('/analytics/principal-reports', { params }),
};
