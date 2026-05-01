import { useEffect, useRef, useCallback } from 'react';
import websocketService from '../../services/websocket';

export default function useWebSocket(eventType, callback) {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        const handler = (payload) => callbackRef.current(payload);
        websocketService.on(eventType, handler);
        return () => websocketService.off(eventType, handler);
    }, [eventType]);

    const send = useCallback((type, payload) => {
        websocketService.send(type, payload);
    }, []);

    return { send };
}
