import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    projects: [],
    currentProject: null,
    loading: false,
    error: null,
    filters: { status: 'all', type: 'all', sort: 'newest' },
};

const projectSlice = createSlice({
    name: 'project',
    initialState,
    reducers: {
        setLoading: (state) => { state.loading = true; state.error = null; },
        setProjects: (state, action) => {
            state.projects = action.payload;
            state.loading = false;
        },
        setCurrentProject: (state, action) => {
            state.currentProject = action.payload;
            state.loading = false;
        },
        addProject: (state, action) => {
            state.projects.unshift(action.payload);
        },
        updateProject: (state, action) => {
            const idx = state.projects.findIndex(p => p.id === action.payload.id);
            if (idx !== -1) state.projects[idx] = { ...state.projects[idx], ...action.payload };
            if (state.currentProject?.id === action.payload.id) {
                state.currentProject = { ...state.currentProject, ...action.payload };
            }
        },
        deleteProject: (state, action) => {
            state.projects = state.projects.filter(p => p.id !== action.payload);
        },
        setFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        setError: (state, action) => {
            state.error = action.payload;
            state.loading = false;
        },
    },
});

export const {
    setLoading, setProjects, setCurrentProject, addProject,
    updateProject, deleteProject, setFilters, setError
} = projectSlice.actions;
export default projectSlice.reducer;
