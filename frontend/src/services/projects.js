import api from './api';

export const projectsService = {
    getAll: (filters) => api.get('/projects', { params: filters }),
    getById: (id) => api.get(`/projects/${id}`),
    create: (data) => api.post('/projects', data),
    update: (id, data) => api.put(`/projects/${id}`, data),
    delete: (id) => api.delete(`/projects/${id}`),
    generateFloorPlan: (id) => api.post(`/projects/${id}/generate-floor-plan`),
    generateStructural: (id) => api.post(`/projects/${id}/generate-structural`),
    generateMEP: (id) => api.post(`/projects/${id}/generate-mep`),
    generateSchedule: (id) => api.post(`/projects/${id}/generate-schedule`),
    getCostEstimate: (id) => api.get(`/projects/${id}/cost-estimate`),
};

export default projectsService;
