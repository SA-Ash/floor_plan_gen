import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    mode: '2d',          // '2d' | '3d'
    selectedFloor: 0,
    selectedRoom: null,
    showGrid: true,
    showLabels: true,
    showStructural: false,
    showMEP: false,
    zoom: 1,
    pan: { x: 0, y: 0 },
};

const viewerSlice = createSlice({
    name: 'viewer',
    initialState,
    reducers: {
        setViewMode: (state, action) => { state.mode = action.payload; },
        setSelectedFloor: (state, action) => { state.selectedFloor = action.payload; },
        setSelectedRoom: (state, action) => { state.selectedRoom = action.payload; },
        toggleGrid: (state) => { state.showGrid = !state.showGrid; },
        toggleLabels: (state) => { state.showLabels = !state.showLabels; },
        toggleStructural: (state) => { state.showStructural = !state.showStructural; },
        toggleMEP: (state) => { state.showMEP = !state.showMEP; },
        setZoom: (state, action) => { state.zoom = action.payload; },
        setPan: (state, action) => { state.pan = action.payload; },
        resetViewer: () => initialState,
    },
});

export const {
    setViewMode, setSelectedFloor, setSelectedRoom,
    toggleGrid, toggleLabels, toggleStructural, toggleMEP,
    setZoom, setPan, resetViewer
} = viewerSlice.actions;
export default viewerSlice.reducer;
