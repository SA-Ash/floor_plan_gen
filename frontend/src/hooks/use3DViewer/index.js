import { useRef, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setViewMode, setZoom, setPan } from '../../store/slices/viewerSlice';

export default function use3DViewer(containerRef) {
    const dispatch = useDispatch();
    const viewer = useSelector(state => state.viewer);

    const handleZoom = useCallback((delta) => {
        dispatch(setZoom(Math.max(0.1, Math.min(5, viewer.zoom + delta))));
    }, [dispatch, viewer.zoom]);

    const handlePan = useCallback((dx, dy) => {
        dispatch(setPan({ x: viewer.pan.x + dx, y: viewer.pan.y + dy }));
    }, [dispatch, viewer.pan]);

    const switchMode = useCallback((mode) => {
        dispatch(setViewMode(mode));
    }, [dispatch]);

    return { ...viewer, handleZoom, handlePan, switchMode };
}
