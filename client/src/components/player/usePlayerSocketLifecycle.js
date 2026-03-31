import { useEffect } from 'react';
import { createGameSocket } from '../../backendUrl';
import { playGameSfx } from '../../utils/gameFeel';
import { triggerHaptic } from '../../utils/haptics';
import { START_SPLASH_MIN_MS, END_SPLASH_MIN_MS } from './playerUtils';

function isSameAvatarObject(a, b, normalizeAvatarObject) {
  const left = normalizeAvatarObject(a);
  const right = normalizeAvatarObject(b);
  return left.type === right.type && left.value === right.value;
}

export function usePlayerSocketLifecycle({
  socketRef,
  attemptEntryRef,
  applyNextQuestionRef,
  latestNameRef,
  latestAvatarRef,
  hasEditedProfileRef,
  startSplashUntilRef,
  pendingQuestionRef,
  startSplashTimerRef,
  pendingFinalScoresRef,
  endSplashTimerRef,
  clearPlayerState,
  normalizeAvatarObject,
  mergeChatHistory,
  setChatSocket,
  setConnected,
  setSelfPlayerId,
  setJoinRetryIn,
  setAwaitingRoomCreation,
  setName,
  setAvatarObject,
  setChatMode,
  setChatAllowed,
  setChatHistory,
  setIsLobbyDeckReady,
  setError,
  setPhase,
  setRoomName,
  setStreakCount,
  setResultData,
  setMyScore,
  setNextQuestionIn,
  setFinalScores,
}) {
  useEffect(() => {
    const socket = createGameSocket();
    socketRef.current = socket;

    const chatSocketTimer = window.setTimeout(() => {
      setChatSocket(socket);
    }, 0);

    socket.on('connect', () => {
      setConnected(true);
      setSelfPlayerId(socket.id || '');
      attemptEntryRef.current();
    });

    socket.on('disconnect', () => {
      setConnected(false);
      setJoinRetryIn(0);
      setAwaitingRoomCreation(false);
    });

    socket.on('player:profileUpdated', ({ player }) => {
      if (!player || player.id !== socket.id) return;
      const incomingName = String(player.name || '').trim();
      const incomingAvatar = normalizeAvatarObject(player.avatarObject);
      const localName = String(latestNameRef.current || '').trim();
      const localAvatar = normalizeAvatarObject(latestAvatarRef.current);

      if (hasEditedProfileRef.current) {
        if (incomingName === localName && isSameAvatarObject(incomingAvatar, localAvatar, normalizeAvatarObject)) {
          if (incomingName) setName(incomingName);
          setAvatarObject(incomingAvatar);
        }
        return;
      }

      if (incomingName) setName(incomingName);
      setAvatarObject(incomingAvatar);
    });

    socket.on('chat:mode', ({ mode, allowed }) => {
      if (mode) setChatMode(mode);
      if (Array.isArray(allowed)) setChatAllowed(allowed);
    });

    socket.on('chat:history', ({ messages }) => {
      if (!Array.isArray(messages)) return;
      setChatHistory((current) => mergeChatHistory(current, messages));
    });

    socket.on('chat:message', (message) => {
      if (!message || typeof message !== 'object') return;
      setChatHistory((current) => mergeChatHistory(current, [message]));
    });

    socket.on('room:deck_updated', ({ selected }) => {
      if (typeof selected === 'boolean') {
        setIsLobbyDeckReady(selected);
        return;
      }
      setIsLobbyDeckReady(true);
    });

    socket.on('room_closed', () => {
      setError('Host is setting up a fresh room. We will auto-join you soon.');
      setAwaitingRoomCreation(true);
      setJoinRetryIn(3);
      setPhase('waiting');
      setRoomName('');
      setChatHistory([]);
      setStreakCount(0);
      pendingFinalScoresRef.current = null;
      if (endSplashTimerRef.current) {
        window.clearTimeout(endSplashTimerRef.current);
        endSplashTimerRef.current = null;
      }
      clearPlayerState();
    });

    socket.on('game_started', () => {
      playGameSfx('round_start', { intensity: 0.9 });
      triggerHaptic('medium');
      setStreakCount(0);
      setPhase('starting');
      startSplashUntilRef.current = Date.now() + START_SPLASH_MIN_MS;
      pendingQuestionRef.current = null;
      if (startSplashTimerRef.current) {
        window.clearTimeout(startSplashTimerRef.current);
        startSplashTimerRef.current = null;
      }
    });

    socket.on('next_question', (payload) => {
      const remainingSplashMs = startSplashUntilRef.current - Date.now();
      if (remainingSplashMs > 0) {
        pendingQuestionRef.current = payload;
        if (startSplashTimerRef.current) {
          window.clearTimeout(startSplashTimerRef.current);
        }
        startSplashTimerRef.current = window.setTimeout(() => {
          if (!pendingQuestionRef.current) return;
          const nextPayload = pendingQuestionRef.current;
          pendingQuestionRef.current = null;
          startSplashTimerRef.current = null;
          applyNextQuestionRef.current(nextPayload);
        }, remainingSplashMs);
        return;
      }

      applyNextQuestionRef.current(payload);
    });

    socket.on('question_result', (data) => {
      setResultData(data);
      const me = data.scores.find((p) => p.id === socket.id);
      if (me) setMyScore(me.score);
      setPhase('result');
    });

    socket.on('round:transition', ({ nextInMs }) => {
      const seconds = Math.max(0, Math.ceil(Number(nextInMs || 0) / 1000));
      setNextQuestionIn(seconds);
    });

    socket.on('game_over', ({ scores }) => {
      setNextQuestionIn(0);
      setPhase('ending');
      pendingFinalScoresRef.current = Array.isArray(scores) ? scores : [];
      if (endSplashTimerRef.current) {
        window.clearTimeout(endSplashTimerRef.current);
      }
      endSplashTimerRef.current = window.setTimeout(() => {
        setFinalScores(Array.isArray(pendingFinalScoresRef.current) ? pendingFinalScoresRef.current : []);
        pendingFinalScoresRef.current = null;
        endSplashTimerRef.current = null;
        setPhase('gameover');
      }, END_SPLASH_MIN_MS);
    });

    return () => {
      window.clearTimeout(chatSocketTimer);
      if (startSplashTimerRef.current) {
        window.clearTimeout(startSplashTimerRef.current);
        startSplashTimerRef.current = null;
      }
      if (endSplashTimerRef.current) {
        window.clearTimeout(endSplashTimerRef.current);
        endSplashTimerRef.current = null;
      }
      socket.off('chat:mode');
      socket.off('chat:history');
      socket.off('chat:message');
      setChatSocket(null);
      socket.disconnect();
    };
  }, [
    socketRef,
    attemptEntryRef,
    applyNextQuestionRef,
    latestNameRef,
    latestAvatarRef,
    hasEditedProfileRef,
    startSplashUntilRef,
    pendingQuestionRef,
    startSplashTimerRef,
    pendingFinalScoresRef,
    endSplashTimerRef,
    clearPlayerState,
    normalizeAvatarObject,
    mergeChatHistory,
    setChatSocket,
    setConnected,
    setSelfPlayerId,
    setJoinRetryIn,
    setAwaitingRoomCreation,
    setName,
    setAvatarObject,
    setChatMode,
    setChatAllowed,
    setChatHistory,
    setIsLobbyDeckReady,
    setError,
    setPhase,
    setRoomName,
    setStreakCount,
    setResultData,
    setMyScore,
    setNextQuestionIn,
    setFinalScores,
  ]);
}
