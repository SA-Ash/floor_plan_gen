import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    sidebarOpen: false,
    theme: 'dark',
    notifications: [],
    globalLoading: false,
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
        setSidebarOpen: (state, action) => { state.sidebarOpen = action.payload; },
        setTheme: (state, action) => { state.theme = action.payload; },
        addNotification: (state, action) => {
            state.notifications.push({ id: Date.now(), ...action.payload });
        },
        removeNotification: (state, action) => {
            state.notifications = state.notifications.filter(n => n.id !== action.payload);
        },
        setGlobalLoading: (state, action) => { state.globalLoading = action.payload; },
    },
});

export const {
    toggleSidebar, setSidebarOpen, setTheme,
    addNotification, removeNotification, setGlobalLoading
} = uiSlice.actions;
export default uiSlice.reducer;
