import { useEffect, useRef, useState } from 'react';
import { createGameSocket } from '../backendUrl';

export default function usePing(socket, intervalMs = 2000) {
  const ownedSocketRef = useRef(null);
  const [latencyMs, setLatencyMs] = useState(null);
  const [connected, setConnected] = useState(Boolean(socket?.connected));

  useEffect(() => {
    const targetSocket = socket || createGameSocket();
    const isOwnedSocket = !socket;
    if (isOwnedSocket) {
      ownedSocketRef.current = targetSocket;
    }

    const sendPing = () => {
      if (!targetSocket.connected) return;
      const timestamp = Date.now();
      targetSocket.emit('client:ping', { timestamp }, (ack) => {
        const echoed = Number(ack?.timestamp);
        if (!Number.isFinite(echoed)) return;
        setLatencyMs(Math.max(0, Date.now() - echoed));
      });
    };

    const handleConnect = () => {
      setConnected(true);
      sendPing();
    };
    const handleDisconnect = () => {
      setConnected(false);
      setLatencyMs(null);
    };
    const handlePong = ({ timestamp }) => {
      const sentAt = Number(timestamp);
      if (!Number.isFinite(sentAt)) return;
      setLatencyMs(Math.max(0, Date.now() - sentAt));
    };

    targetSocket.on('connect', handleConnect);
    targetSocket.on('disconnect', handleDisconnect);
    targetSocket.on('server:pong', handlePong);

    if (targetSocket.connected) {
      window.setTimeout(() => {
        setConnected(true);
        sendPing();
      }, 0);
    }

    const timer = window.setInterval(() => {
      sendPing();
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
      targetSocket.off('connect', handleConnect);
      targetSocket.off('disconnect', handleDisconnect);
      targetSocket.off('server:pong', handlePong);
      if (isOwnedSocket) {
        targetSocket.disconnect();
      }
    };
  }, [socket, intervalMs]);

  return { latencyMs, connected };
}
