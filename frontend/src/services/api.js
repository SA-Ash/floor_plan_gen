import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 120000, // 2 minutes — AI pipeline can be slow
    headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach auth token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('bmh_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Response interceptor — handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Don't redirect — mock auth doesn't require login
            console.warn('[API] 401 received, ignoring for demo mode');
        }
        return Promise.reject(error);
    }
);

export default api;
