import { useEffect, useRef, useState } from 'react';
import { createGameSocket } from '../backendUrl';

export default function usePing(socket, intervalMs = 2000) {
  const sentAtRef = useRef(0);
  const [latencyMs, setLatencyMs] = useState(null);
  const [connected, setConnected] = useState(Boolean(socket?.connected));

  useEffect(() => {
    const targetSocket = socket || createGameSocket();
    const isOwnedSocket = !socket;

    const onPong = () => {
      if (!sentAtRef.current) return;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      setLatencyMs(Math.max(0, Math.round(now - sentAtRef.current)));
    };

    const firePing = () => {
      if (!targetSocket.connected) return;
      sentAtRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
      targetSocket.emit('client_ping', { clientTime: Date.now() });
    };

    const handleConnect = () => {
      setConnected(true);
      firePing();
    };

    const handleDisconnect = () => {
      setConnected(false);
      sentAtRef.current = 0;
      setLatencyMs(null);
    };

    targetSocket.on('connect', handleConnect);
    targetSocket.on('disconnect', handleDisconnect);
    targetSocket.on('server_pong', onPong);

    if (targetSocket.connected) {
      firePing();
    }

    const timer = window.setInterval(firePing, intervalMs);

    return () => {
      window.clearInterval(timer);
      targetSocket.off('connect', handleConnect);
      targetSocket.off('disconnect', handleDisconnect);
      targetSocket.off('server_pong', onPong);
      if (isOwnedSocket) {
        targetSocket.disconnect();
      }
    };
  }, [socket, intervalMs]);

  return { latencyMs, connected };
}
