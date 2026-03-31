import { useCallback, useEffect } from 'react';

const RETRY_SECONDS = 3;

export function usePlayerJoinFlow({
  socketRef,
  latestNameRef,
  playerSessionIdRef,
  shouldTryResumeRef,
  attemptEntryRef,
  connected,
  phase,
  awaitingRoomCreation,
  setError,
  setRoomName,
  setAwaitingRoomCreation,
  setJoinRetryIn,
  setPhase,
  formatJoinFailure,
  isRoomUnavailableError,
  processJoinSuccess,
  applyResumePayload,
}) {
  const emitJoin = useCallback(({
    onSuccess,
    onUnavailable,
    onFailure,
  } = {}) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      setError('Connecting to server...');
      return;
    }

    socket.emit(
      'join',
      {
        playerName: latestNameRef.current || 'Guest',
        playerSessionId: playerSessionIdRef.current,
      },
      (res) => {
        if (!res?.success) {
          if (isRoomUnavailableError(res?.error)) {
            onUnavailable?.(res);
            return;
          }
          onFailure?.(res);
          return;
        }

        onSuccess?.(res);
      }
    );
  }, [
    socketRef,
    latestNameRef,
    playerSessionIdRef,
    setError,
    isRoomUnavailableError,
  ]);

  const attemptJoinRoom = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      setError('Connecting to server...');
      return;
    }

    emitJoin({
      onSuccess: processJoinSuccess,
      onUnavailable: () => {
        setRoomName('LocalFlux Room');
        setAwaitingRoomCreation(true);
        setJoinRetryIn(RETRY_SECONDS);
        setError('Host is setting up a fresh room. We will auto-join you soon.');
        setPhase('waiting');
      },
      onFailure: (res) => setError(formatJoinFailure(res)),
    });
  }, [
    socketRef,
    setError,
    emitJoin,
    processJoinSuccess,
    setRoomName,
    setAwaitingRoomCreation,
    setJoinRetryIn,
    setPhase,
    formatJoinFailure,
  ]);

  const attemptResumeRoom = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      setError('Connecting to server...');
      return;
    }

    const sessionId = String(playerSessionIdRef.current || '').trim();
    if (!sessionId) {
      shouldTryResumeRef.current = false;
      attemptJoinRoom();
      return;
    }

    socket.emit('player:resume', { sessionId }, (res) => {
      if (!res?.success) {
        shouldTryResumeRef.current = false;
        attemptJoinRoom();
        return;
      }

      applyResumePayload(res);
    });
  }, [
    socketRef,
    setError,
    playerSessionIdRef,
    shouldTryResumeRef,
    attemptJoinRoom,
    applyResumePayload,
  ]);

  const attemptEntry = useCallback(() => {
    if (shouldTryResumeRef.current) {
      attemptResumeRoom();
      return;
    }
    attemptJoinRoom();
  }, [shouldTryResumeRef, attemptResumeRoom, attemptJoinRoom]);

  useEffect(() => {
    attemptEntryRef.current = attemptEntry;
  }, [attemptEntryRef, attemptEntry]);

  useEffect(() => {
    if (phase !== 'joining' || !connected) return undefined;

    let remaining = RETRY_SECONDS;
    const kickoffTimer = window.setTimeout(() => {
      attemptEntryRef.current();
      setJoinRetryIn(remaining);
    }, 0);

    const retryTimer = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        attemptEntryRef.current();
        remaining = RETRY_SECONDS;
      }
      setJoinRetryIn(remaining);
    }, 1000);

    return () => {
      window.clearTimeout(kickoffTimer);
      window.clearInterval(retryTimer);
    };
  }, [phase, connected, attemptEntryRef, setJoinRetryIn]);

  useEffect(() => {
    if (!awaitingRoomCreation || !connected) return undefined;

    let remaining = RETRY_SECONDS;
    const kickoffTimer = window.setTimeout(() => {
      emitJoin({
        onSuccess: processJoinSuccess,
        onUnavailable: () => {
          setError('Host is setting up a fresh room. We will auto-join you soon.');
          setPhase('waiting');
        },
        onFailure: (res) => {
          setError(formatJoinFailure(res));
        },
      });
      setJoinRetryIn(remaining);
    }, 0);

    const retryTimer = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        emitJoin({
          onSuccess: processJoinSuccess,
          onUnavailable: () => {
            setError('Host is setting up a fresh room. We will auto-join you soon.');
            setPhase('waiting');
          },
          onFailure: (res) => {
            setError(formatJoinFailure(res));
          },
        });
        remaining = RETRY_SECONDS;
      }
      setJoinRetryIn(remaining);
    }, 1000);

    return () => {
      window.clearTimeout(kickoffTimer);
      window.clearInterval(retryTimer);
    };
  }, [
    awaitingRoomCreation,
    connected,
    emitJoin,
    processJoinSuccess,
    setError,
    setPhase,
    formatJoinFailure,
    setJoinRetryIn,
  ]);

  return {
    emitJoin,
    attemptEntry,
  };
}
