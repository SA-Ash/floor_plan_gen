const WebSocket = require('ws');

let wss = null;

function initWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    console.log('[WS] Client connected');

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        console.log('[WS] Received:', msg.type);
        // Handle incoming messages if needed
      } catch (e) { /* ignore */ }
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
    });

    // Send welcome
    ws.send(JSON.stringify({ type: 'connected', payload: { message: 'Connected to Build My Home' } }));
  });

  // Heartbeat every 30s
  setInterval(() => {
    if (!wss) return;
    wss.clients.forEach(ws => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  console.log('[WS] WebSocket server initialized');
}

function broadcastToAll(message) {
  if (!wss) return;
  const data = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

module.exports = { initWebSocket, broadcastToAll };
