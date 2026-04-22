import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import projectReducer from './slices/projectSlice';
import uiReducer from './slices/uiSlice';
import viewerReducer from './slices/viewerSlice';

const store = configureStore({
    reducer: {
        auth: authReducer,
        project: projectReducer,
        ui: uiReducer,
        viewer: viewerReducer,
    },
});

export default store;
