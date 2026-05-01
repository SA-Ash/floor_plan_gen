import api from './api';

export const aiModelsService = {
    parseRequirements: (text) => api.post('/ai/parse-requirements', { text }),
    getFloorPlanStatus: (jobId) => api.get(`/ai/floor-plan/status/${jobId}`),
    getStructuralDesign: (projectId) => api.get(`/ai/structural/${projectId}`),
    getMEPLayout: (projectId) => api.get(`/ai/mep/${projectId}`),
    predictCost: (projectId) => api.post(`/ai/predict-cost/${projectId}`),
    getWorkerTasks: (projectId) => api.get(`/ai/worker-tasks/${projectId}`),
};

export default aiModelsService;
