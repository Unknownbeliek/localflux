import { useState, useEffect, useRef, useCallback } from 'react';
import Chat from './Chat';
import AnimatedBackground from './AnimatedBackground';
import LeaderboardResultsCard from './leaderboard/LeaderboardResultsCard';
import { resolveQuestionTiming } from '../utils/questionTiming';
import ConfirmActionModal from './ConfirmActionModal';
import { useBgm } from '../context/BgmProvider';
import { triggerHaptic } from '../utils/haptics';
import { playGameSfx } from '../utils/gameFeel';
import { normalizeAvatarObject, resolvePresetPath } from '../utils/avatarObject';
import {
  LAN_ROOM,
  START_SPLASH_MIN_MS,
  END_SPLASH_MIN_MS,
  PRESET_AVATARS,
  MAX_CHAT_HISTORY,
  mergeChatHistory,
  resolveImageUrl,
  getOrCreatePlayerSessionId,
  readPlayerState,
  persistPlayerState,
  clearPlayerState,
  displayRoomName,
  formatJoinFailure,
  isRoomUnavailableError,
} from './player/playerUtils';
import { usePlayerPhaseEffects } from './player/usePlayerPhaseEffects';
import { usePlayerJoinFlow } from './player/usePlayerJoinFlow';
import { usePlayerSocketLifecycle } from './player/usePlayerSocketLifecycle';
import { usePlayerAnswerActions } from './player/usePlayerAnswerActions';
import { usePlayerProfile } from './player/usePlayerProfile';
import { AvatarBadge, StreakBadge, PlayerTopBar } from './player/PlayerChrome';

function isSameAvatarObject(a, b) {
  const left = normalizeAvatarObject(a);
  const right = normalizeAvatarObject(b);
  return left.type === right.type && left.value === right.value;
}


export default function Player({ onBack }) {
  const { setMusicPhase } = useBgm();
  const savedPlayerState = readPlayerState();
  const savedStateSessionId = String(savedPlayerState?.playerSessionId || '').trim();
  const playerSessionIdRef = useRef(getOrCreatePlayerSessionId());
  const shouldTryResumeRef = useRef(Boolean(savedStateSessionId));
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [chatSocket, setChatSocket] = useState(null);
  const [selfPlayerId, setSelfPlayerId] = useState('');
  const [name, setName] = useState(savedPlayerState?.name || 'Guest');
  const [avatarObject, setAvatarObject] = useState(normalizeAvatarObject(savedPlayerState?.avatarObject));
  const [isEditingName, setIsEditingName] = useState(false);
  const [hiddenPresetPaths, setHiddenPresetPaths] = useState(() => new Set());
  const [error, setError] = useState('');
  const [roomName, setRoomName] = useState(savedPlayerState?.roomName || '');
  const [profileSaved, setProfileSaved] = useState(false);
  const [hasEditedProfile, setHasEditedProfile] = useState(Boolean(savedPlayerState?.profileEdited));

  const [phase, setPhase] = useState(() => (savedPlayerState?.roomName ? 'waiting' : 'joining'));
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [guessText, setGuessText] = useState('');
  const [guessFeedback, setGuessFeedback] = useState('');
  const [answeredCorrect, setAnsweredCorrect] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privateGuessHistory, setPrivateGuessHistory] = useState([]);
  const [myScore, setMyScore] = useState(0);
  const [resultData, setResultData] = useState(null);
  const [finalScores, setFinalScores] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatMode, setChatMode] = useState('FREE');
  const [chatAllowed, setChatAllowed] = useState([]);
  const [isLobbyDeckReady, setIsLobbyDeckReady] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeTotal, setTimeTotal] = useState(0);
  const [questionEndsAt, setQuestionEndsAt] = useState(0);
  const [nextQuestionIn, setNextQuestionIn] = useState(0);
  const [joinRetryIn, setJoinRetryIn] = useState(0);
  const [awaitingRoomCreation, setAwaitingRoomCreation] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveConfirmChecked, setLeaveConfirmChecked] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [correctBurstTick, setCorrectBurstTick] = useState(0);
  const [timerDangerActive, setTimerDangerActive] = useState(false);
  const [fireIgniteTick, setFireIgniteTick] = useState(0);
  const [showFireIgnite, setShowFireIgnite] = useState(false);
  const roomDisplayName = displayRoomName(roomName);
  const latestNameRef = useRef(name);
  const latestAvatarRef = useRef(avatarObject);
  const hasEditedProfileRef = useRef(Boolean(savedPlayerState?.profileEdited));
  const startSplashUntilRef = useRef(0);
  const pendingQuestionRef = useRef(null);
  const startSplashTimerRef = useRef(null);
  const pendingFinalScoresRef = useRef(null);
  const endSplashTimerRef = useRef(null);
  const desktopGuessInputRef = useRef(null);
  const mobileGuessInputRef = useRef(null);
  const prevTimeLeftRef = useRef(0);
  const fireIgniteTimerRef = useRef(null);
  const attemptEntryRef = useRef(() => {});
  const applyNextQuestionRef = useRef(() => {});

  const celebrateCorrect = ({ wasStreak = false } = {}) => {
    setCorrectBurstTick((value) => value + 1);
    playGameSfx(wasStreak ? 'streak' : 'correct', { intensity: wasStreak ? 1 : 0.8 });
    triggerHaptic(wasStreak ? 'success' : 'medium');
  };

  const triggerFireIgnite = () => {
    setFireIgniteTick((value) => value + 1);
    setShowFireIgnite(true);
    if (fireIgniteTimerRef.current) {
      window.clearTimeout(fireIgniteTimerRef.current);
    }
    fireIgniteTimerRef.current = window.setTimeout(() => {
      setShowFireIgnite(false);
      fireIgniteTimerRef.current = null;
    }, 1200);
  };

  const applyNextQuestion = ({ question: nextQuestion, durationMs, endsAt, serverNow }) => {
    setQuestion(nextQuestion);
    setSelected(null);
    setGuessText('');
    setGuessFeedback('');
    setAnsweredCorrect(null);
    setIsSubmitting(false);
    setPrivateGuessHistory([]);
    setResultData(null);
    setNextQuestionIn(0);
    setTimerDangerActive(false);
    const fallbackMs = Number(nextQuestion?.time_limit_ms) || 20000;
    const { normalizedMs, remainingMs, targetEndsAt } = resolveQuestionTiming({
      durationMs,
      endsAt,
      serverNow,
      fallbackMs,
    });
    setTimeTotal(Math.ceil(normalizedMs / 1000));
    setQuestionEndsAt(targetEndsAt);
    setTimeLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
    prevTimeLeftRef.current = Math.max(0, Math.ceil(remainingMs / 1000));
    setPhase('question');
  };

  const applyResumePayload = (res) => {
    setError('');
    setJoinRetryIn(0);
    setAwaitingRoomCreation(false);
    setRoomName(res.roomName || 'LocalFlux Game');
    if (res.chatMode) setChatMode(res.chatMode);
    if (Array.isArray(res.chatAllowed)) setChatAllowed(res.chatAllowed);
    if (Array.isArray(res.chatHistory)) setChatHistory(res.chatHistory.slice(-MAX_CHAT_HISTORY));
    setIsLobbyDeckReady(Boolean(res.deckSelected));
    setMyScore(Number(res.myScore) || 0);

    const phaseFromServer = String(res.phase || res.status || '').toLowerCase();
    if (phaseFromServer === 'lobby') {
      setQuestion(null);
      setResultData(null);
      setSelected(null);
      setStreakCount(0);
      setPhase('waiting');
      return;
    }

    if (phaseFromServer === 'started' && res.activeQuestion) {
      const { question: activeQuestion, durationMs, endsAt, serverNow } = res.activeQuestion;
      const hasAnswered = Boolean(res.hasAnswered);
      setQuestion(activeQuestion);
      setResultData(null);
      setSelected(hasAnswered ? res.answeredValue ?? null : null);
      setGuessText('');
      setGuessFeedback('');
      setPrivateGuessHistory([]);
      const isTypeGuessQuestion = activeQuestion?.answer_mode === 'type_guess';
      if (hasAnswered && isTypeGuessQuestion) {
        setAnsweredCorrect(true);
      } else {
        setAnsweredCorrect(null);
      }
      setPhase(hasAnswered ? 'answered' : 'question');
      const fallbackMs = Number(activeQuestion?.time_limit_ms) || 20000;
      const { normalizedMs, remainingMs, targetEndsAt } = resolveQuestionTiming({
        durationMs,
        endsAt,
        serverNow,
        fallbackMs,
      });
      setTimeTotal(Math.ceil(normalizedMs / 1000));
      setQuestionEndsAt(targetEndsAt);
      setTimeLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
      return;
    }

    setPhase('waiting');
  };

  const processJoinSuccess = (res) => {
    setError('');
    setJoinRetryIn(0);
    setAwaitingRoomCreation(false);
    shouldTryResumeRef.current = true;
    const serverName = String(res.playerName || '').trim();
    const serverAvatar = normalizeAvatarObject(res.avatarObject);
    const localName = String(latestNameRef.current || '').trim() || 'Guest';
    const localAvatar = normalizeAvatarObject(latestAvatarRef.current);
    const shouldKeepLocalProfile = hasEditedProfileRef.current;

    if (!shouldKeepLocalProfile) {
      if (serverName) {
        setName(serverName);
      }
      if (res.avatarObject && typeof res.avatarObject === 'object') {
        setAvatarObject(serverAvatar);
      }
    } else if (socketRef.current?.connected && (serverName !== localName || !isSameAvatarObject(serverAvatar, localAvatar))) {
      socketRef.current.emit('player:updateProfile', { newName: localName, avatarObject: localAvatar }, () => {});
    }
    setRoomName(res.roomName || 'LocalFlux Game');
    if (res.chatMode) setChatMode(res.chatMode);
    if (Array.isArray(res.chatAllowed)) setChatAllowed(res.chatAllowed);
    if (Array.isArray(res.chatHistory)) setChatHistory(res.chatHistory.slice(-MAX_CHAT_HISTORY));
    setIsLobbyDeckReady(Boolean(res.deckSelected));
    setMyScore(Number(res.myScore) || 0);
    setStreakCount(0);
    setPhase('waiting');
  };

  const { emitJoin, attemptEntry } = usePlayerJoinFlow({
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
  });

  useEffect(() => {
    applyNextQuestionRef.current = applyNextQuestion;
  }, [applyNextQuestion]);

  useEffect(() => {
    latestNameRef.current = name;
  }, [name]);

  useEffect(() => {
    latestAvatarRef.current = avatarObject;
  }, [avatarObject]);

  useEffect(() => {
    hasEditedProfileRef.current = hasEditedProfile;
  }, [hasEditedProfile]);

  useEffect(() => {
    if (!name.trim() && !roomName.trim()) return;
    persistPlayerState({
      name: name.trim(),
      avatarObject,
      roomName: roomName.trim(),
      profileEdited: hasEditedProfile,
      playerSessionId: String(playerSessionIdRef.current || '').trim(),
      updatedAt: Date.now(),
    });
  }, [name, avatarObject, roomName, hasEditedProfile]);

  usePlayerSocketLifecycle({
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
  });

  const handleTimerWarning = useCallback((current) => {
    playGameSfx('timer_warning', { intensity: current <= 2 ? 1 : 0.7 });
    triggerHaptic(current <= 2 ? 'medium' : 'light');
  }, []);

  usePlayerPhaseEffects({
    phase,
    questionEndsAt,
    setTimeLeft,
    timeLeft,
    setTimerDangerActive,
    prevTimeLeftRef,
    onTimerWarning: handleTimerWarning,
    nextQuestionIn,
    setNextQuestionIn,
    setMusicPhase,
    streakCount,
    setShowFireIgnite,
    fireIgniteTimerRef,
  });

  const handleBack = () => {
    clearPlayerState();
    onBack?.();
  };

  const handleExitToPlay = () => {
    clearPlayerState();
    if (typeof window !== 'undefined') {
      window.location.assign('/play');
      return;
    }
    onBack?.();
  };

  const openLeaveGameModal = () => {
    setIsLeaveModalOpen(true);
    setLeaveConfirmChecked(false);
  };

  const closeLeaveGameModal = () => {
    setIsLeaveModalOpen(false);
    setLeaveConfirmChecked(false);
  };

  const handleLeaveGame = () => {
    if (!leaveConfirmChecked) {
      setError('Leave cancelled. Please tick the confirmation box.');
      return;
    }

    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('player:leave', () => {
        closeLeaveGameModal();
        handleExitToPlay();
      });
      return;
    }

    closeLeaveGameModal();
    handleExitToPlay();
  };

  const handleBackToLobby = () => {
    if (!socketRef.current?.connected) {
      setError('Not connected. Please retry in a moment.');
      return;
    }

    setError('');

    setFinalScores([]);
    setQuestion(null);
    setSelected(null);
    setPrivateGuessHistory([]);
    setResultData(null);

    emitJoin({
      onSuccess: processJoinSuccess,
      onUnavailable: () => {
        setRoomName('LocalFlux Room');
        setAwaitingRoomCreation(true);
        setJoinRetryIn(3);
        setError('Host is setting up a fresh room. We will auto-join you soon.');
        setPhase('waiting');
      },
      onFailure: (res) => {
        setError(formatJoinFailure(res));
      },
    });
  };

  const {
    handleAnswer,
    handleGuessSubmit,
    handleReusePrivateGuess,
  } = usePlayerAnswerActions({
    socketRef,
    selected,
    isSubmitting,
    setIsSubmitting,
    setSelected,
    setAnsweredCorrect,
    setGuessFeedback,
    setPhase,
    streakCount,
    setStreakCount,
    celebrateCorrect,
    triggerFireIgnite,
    guessText,
    setGuessText,
    chatMode,
    setPrivateGuessHistory,
    answeredCorrect,
    desktopGuessInputRef,
    mobileGuessInputRef,
  });

  const { handleSaveProfile } = usePlayerProfile({
    socketRef,
    name,
    avatarObject,
    awaitingRoomCreation,
    phase,
    normalizeAvatarObject,
    setError,
    setName,
    setHasEditedProfile,
    setProfileSaved,
    setIsEditingName,
    setAvatarObject,
  });

  const timerTone =
    timeTotal > 0 && timeLeft <= Math.ceil(timeTotal * 0.25)
      ? 'text-red-400'
      : timeTotal > 0 && timeLeft <= Math.ceil(timeTotal * 0.5)
        ? 'text-amber-300'
        : 'text-emerald-300';

  if (phase === 'gameover') {
    const myEntry = finalScores.find(p => p.id === selfPlayerId);
    const myRank = finalScores.findIndex(p => p.id === selfPlayerId) + 1;

    return (
      <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-white animate-phase-in">
        <AnimatedBackground />
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center p-4 md:p-8">
          <div className="relative w-full max-w-3xl">
            <PlayerTopBar showLeaveButton onLeaveGame={openLeaveGameModal} socket={chatSocket} />
            <LeaderboardResultsCard
              finalScores={finalScores}
              highlightPlayerId={selfPlayerId}
              pretitle="Game Over"
              title="Leaderboard"
              subtitle={myEntry ? `You placed #${myRank} with ${myEntry.score} pts` : ''}
            />

            {error && (
              <p className="mt-4 rounded-xl border border-rose-500/50 bg-rose-500/20 px-4 py-3 text-sm font-medium text-rose-200 backdrop-blur-md">
                {error}
              </p>
            )}

            <div className="flex items-center justify-center gap-3 md:gap-4 mt-10 md:mt-12">
              <button
                onClick={handleBackToLobby}
                className="rounded-xl bg-emerald-400 px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-black text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-emerald-300 active:translate-y-0 active:scale-95"
              >
                BACK TO LOBBY
              </button>
              <button
                onClick={handleExitToPlay}
                className="rounded-xl border border-slate-700 bg-slate-900 px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-black text-white transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-slate-800 active:translate-y-0 active:scale-95"
              >
                EXIT
              </button>
            </div>

            <ConfirmActionModal
              open={isLeaveModalOpen}
              title="Leave Current Game"
              message="You will leave the active room immediately and return to Play screen."
              checkboxLabel="I understand I may lose my current round progress and place in the room."
              checked={leaveConfirmChecked}
              onCheckedChange={setLeaveConfirmChecked}
              onCancel={closeLeaveGameModal}
              onConfirm={handleLeaveGame}
              confirmLabel="Leave Game"
            />
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'ending') {
    return (
      <div className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white flex items-center justify-center p-6 animate-phase-in z-0">
        <AnimatedBackground />
        <div className="relative w-full max-w-md rounded-3xl border border-sky-500/30 bg-slate-900/80 px-6 py-10 text-center shadow-2xl shadow-black/40">
          <div className="mx-auto mb-5 h-16 w-16 rounded-full border-2 border-sky-400/60 border-t-sky-200 animate-spin" />
          <p className="text-xs uppercase tracking-[0.28em] text-sky-300/80">Round Complete</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-white">Game Ended</h2>
          <p className="mt-3 text-sm text-slate-300">Final standings up next.</p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-300 animate-pulse" />
            <span className="h-2.5 w-2.5 rounded-full bg-sky-300 animate-pulse [animation-delay:160ms]" />
            <span className="h-2.5 w-2.5 rounded-full bg-sky-300 animate-pulse [animation-delay:320ms]" />
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'result' && resultData) {
    const correctAnswer = resultData.correct_answer || resultData.correctAnswer || '';
    const hasAnswered = Boolean(selected);
    const isTypeGuessQuestion = question?.answer_mode === 'type_guess';
    return (
      <div className="relative z-0 flex h-screen w-screen overflow-hidden bg-slate-950 text-white animate-phase-in">
        <AnimatedBackground />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 px-4 pt-4 md:px-8 md:pt-6">
            <PlayerTopBar showLeaveButton onLeaveGame={openLeaveGameModal} socket={chatSocket} />
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{roomDisplayName}</p>
                  <StreakBadge streakCount={streakCount} showFireIgnite={showFireIgnite} fireIgniteTick={fireIgniteTick} />
                </div>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-right">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Next</p>
                <p className="text-2xl font-black tabular-nums text-emerald-300">{nextQuestionIn > 0 ? `${nextQuestionIn}s` : '...'}</p>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-4 md:p-8">
            <div className="shrink-0 rounded-3xl border border-white/10 bg-slate-950/40 px-6 py-6 shadow-2xl shadow-black/50 backdrop-blur-xl">
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300/80">Answer Reveal</p>
              <p className="text-2xl md:text-3xl font-black leading-tight text-white/90 drop-shadow-md text-center">{question?.prompt}</p>
            </div>

            {question?.image && (
              <div className="mt-4 flex min-h-0 flex-1 items-center justify-center">
                <img
                  src={resolveImageUrl(question.image)}
                  alt="Question visual"
                  className="max-h-full max-w-full rounded-2xl object-contain opacity-95 shadow-2xl shadow-black/50 ring-1 ring-white/10"
                />
              </div>
            )}

            <div className="mt-4 shrink-0">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300/90">Answer</p>
                  <p className="mt-1 text-xl font-black text-emerald-100">{correctAnswer || 'Not available'}</p>
                </div>
                <div className={`rounded-2xl border px-5 py-5 ${hasAnswered ? 'border-sky-400/60 bg-sky-500/10' : 'border-slate-700 bg-slate-900/70'}`}>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300">
                    {isTypeGuessQuestion ? 'Your Guess' : 'Your Answer'}
                  </p>
                  <p className="mt-1 text-lg font-black text-white">{hasAnswered ? selected : 'No answer submitted'}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 shrink-0 text-center">
              <p className="text-sm font-semibold text-slate-300">
                {hasAnswered ? 'Answer submitted. Review shown above.' : 'You did not submit an answer this round.'}
              </p>
              <p className="mt-2 font-mono text-sm tabular-nums">Score: <span className="font-black text-amber-300">{myScore}</span></p>
              <p className="mt-2 text-xs uppercase tracking-[0.24em] text-white/60">
                {nextQuestionIn > 0 ? `Next question in ${nextQuestionIn}s` : 'Preparing next question'}
              </p>
            </div>
          </div>
        </div>

        <aside className="hidden lg:flex w-80 lg:w-96 flex-col border-l border-white/10 bg-black/20 backdrop-blur-xl relative z-10">
          <div className="shrink-0 border-b border-white/10 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300/80">Room Chat</p>
            <p className="mt-1 text-[11px] text-slate-400">{roomDisplayName}</p>
          </div>
          <div className="min-h-0 flex-1 p-3">
            <div className="h-full rounded-2xl border border-white/10 bg-black/25 p-2 overflow-hidden">
              <Chat
                socket={chatSocket}
                roomPin={LAN_ROOM}
                title="Room Chat"
                initialMode={chatMode}
                initialAllowed={chatAllowed}
                initialMessages={chatHistory}
                suppressFreeComposer={isTypeGuessQuestion}
                showMeta={!isTypeGuessQuestion}
                showModeBadge={!isTypeGuessQuestion}
              />
            </div>
          </div>
        </aside>

        <ConfirmActionModal
          open={isLeaveModalOpen}
          title="Leave Room"
          message={`You are about to leave ${roomDisplayName} and return to the Play screen.`}
          checkboxLabel="I understand I may lose my score progress in this match."
          checked={leaveConfirmChecked}
          onCheckedChange={setLeaveConfirmChecked}
          onCancel={closeLeaveGameModal}
          onConfirm={handleLeaveGame}
          confirmLabel="Leave Game"
        />

      </div>
    );
  }

  if (phase === 'starting') {
    return (
      <div className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white flex items-center justify-center p-6 animate-phase-in z-0">
        <AnimatedBackground />
        <div className="relative w-full max-w-md rounded-3xl border border-emerald-500/30 bg-slate-900/80 px-6 py-10 text-center shadow-2xl shadow-black/40">
          <div className="mx-auto mb-5 h-16 w-16 rounded-full border-2 border-emerald-400/60 border-t-emerald-200 animate-spin" />
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-300/80">Match Started</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-white">Get Ready...</h2>
          <p className="mt-3 text-sm text-slate-300">Host started the game. Your first question is loading.</p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 animate-pulse" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 animate-pulse [animation-delay:160ms]" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 animate-pulse [animation-delay:320ms]" />
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'answered') {
    return (
      <div className="relative z-0 flex min-h-[100dvh] w-screen overflow-y-auto scroll-smooth bg-slate-950 text-white animate-phase-in [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:h-screen lg:overflow-hidden">
        <AnimatedBackground />

        <div className="relative z-10 flex w-full flex-1 flex-col p-4 md:p-8">
          <PlayerTopBar showLeaveButton onLeaveGame={openLeaveGameModal} socket={chatSocket} />
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
                <div className="flex items-center">
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/50">{roomDisplayName}</p>
                  <StreakBadge streakCount={streakCount} showFireIgnite={showFireIgnite} fireIgniteTick={fireIgniteTick} />
                </div>
            </div>
            <div
              className={`rounded-2xl border-2 px-4 py-2 text-right transition-colors duration-300 backdrop-blur-md shadow-xl ${timerDangerActive ? 'animate-timer-danger' : ''} ${
                timeLeft <= 2
                  ? 'border-red-500/60 bg-red-500/10'
                  : timeLeft <= 5
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : 'border-slate-800 bg-slate-900'
              }`}
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Timer</p>
              <p className={`text-2xl font-black tabular-nums ${timeLeft <= 5 ? 'animate-pulse' : ''} ${timeLeft <= 2 ? 'text-red-300' : timerTone}`}>{timeLeft}s</p>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-3xl flex-1 items-start justify-center pt-2 lg:items-center lg:pt-0">
            <div className="w-full rounded-3xl border border-white/10 bg-black/35 p-6 text-center shadow-2xl shadow-black/40 backdrop-blur-xl md:p-8">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Answer Submitted</p>
              <p className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-4 text-2xl font-black text-emerald-200 shadow-lg shadow-emerald-900/30">
                {selected}
              </p>
              {answeredCorrect === true && (
                <div key={correctBurstTick} className="mt-4 flex items-center justify-center">
                  <div className="animate-correct-burst rounded-full border border-emerald-300/80 bg-emerald-400/20 px-4 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,0.35)]">
                    Perfect hit{streakCount >= 3 ? ` · Streak x${streakCount}` : ''}
                  </div>
                </div>
              )}
              <p
                className={`mt-4 text-base font-black uppercase tracking-[0.16em] ${
                  answeredCorrect === true
                    ? 'text-emerald-300'
                    : answeredCorrect === false
                      ? 'text-rose-300'
                      : 'text-amber-300'
                }`}
              >
                {answeredCorrect === true ? 'Correct' : answeredCorrect === false ? 'Wrong' : 'Checking...'}
              </p>
              <div className="mt-3 flex items-center justify-center">
                {answeredCorrect === true ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-emerald-200">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/25">
                      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                        <path d="M4.5 10.5L8.3 14.2L15.5 6.8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    Right Answer
                  </span>
                ) : answeredCorrect === false ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/50 bg-rose-500/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-rose-200">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-400/25">
                      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                        <path d="M6 6L14 14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                        <path d="M14 6L6 14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                      </svg>
                    </span>
                    Wrong Answer
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-amber-200">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/25">
                      <span className="h-2 w-2 rounded-full bg-amber-200 animate-pulse" />
                    </span>
                    Verifying
                  </span>
                )}
              </div>
              <p className="mt-4 text-sm text-slate-400">You can chat while waiting for other players to submit.</p>
              <div className="mt-4 flex justify-center gap-2">
                <span className="status-dot" />
                <span className="status-dot" />
                <span className="status-dot" />
              </div>
            </div>
          </div>

          <div className="mt-4 lg:hidden">
            <div className="h-[42dvh] min-h-[260px] rounded-2xl border border-white/10 bg-black/25 p-2">
              <Chat
                socket={chatSocket}
                roomPin={LAN_ROOM}
                title="Room Chat"
                initialMode={chatMode}
                initialAllowed={chatAllowed}
                initialMessages={chatHistory}
              />
            </div>
          </div>
        </div>

        <aside className="hidden lg:flex w-80 lg:w-96 flex-col border-l border-white/10 bg-black/20 backdrop-blur-xl relative z-10">
          <div className="shrink-0 border-b border-white/10 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300/80">Room Chat</p>
            <p className="mt-1 text-[11px] text-slate-400">{roomDisplayName}</p>
          </div>
          <div className="min-h-0 flex-1 p-3">
            <div className="h-full rounded-2xl border border-white/10 bg-black/25 p-2 overflow-hidden">
              <Chat
                socket={chatSocket}
                roomPin={LAN_ROOM}
                title="Room Chat"
                initialMode={chatMode}
                initialAllowed={chatAllowed}
                initialMessages={chatHistory}
              />
            </div>
          </div>
        </aside>

        <ConfirmActionModal
          open={isLeaveModalOpen}
          title="Leave Room"
          message={`You are about to leave ${roomDisplayName} and return to the Play screen.`}
          checkboxLabel="I understand I may lose my score progress in this match."
          checked={leaveConfirmChecked}
          onCheckedChange={setLeaveConfirmChecked}
          onCancel={closeLeaveGameModal}
          onConfirm={handleLeaveGame}
          confirmLabel="Leave Game"
        />
      </div>
    );
  }

  if (phase === 'question' && question) {
    const progress = timeTotal > 0 ? Math.max(0, Math.round((timeLeft / timeTotal) * 100)) : 0;
    const isTypeGuessQuestion = question?.answer_mode === 'type_guess';
    const answerControlMinHeight = 'clamp(68px, 10vh, 112px)';
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-background bg-slate-950 text-foreground text-white animate-phase-in">
        <AnimatedBackground />

        <div className="relative z-10 flex flex-1 flex-col">
          <div className="shrink-0 px-4 pt-4 md:px-8 md:pt-6">
            <PlayerTopBar showLeaveButton onLeaveGame={openLeaveGameModal} socket={chatSocket} />
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center">
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/50">{roomDisplayName}</p>
                  <StreakBadge streakCount={streakCount} showFireIgnite={showFireIgnite} fireIgniteTick={fireIgniteTick} />
                </div>
              </div>
              <div
                className={`rounded-2xl border-2 px-4 py-2 text-right transition-colors duration-300 backdrop-blur-md shadow-xl ${timerDangerActive ? 'animate-timer-danger' : ''} ${
                  timeLeft <= 2
                    ? 'border-red-500/60 bg-red-500/10'
                    : timeLeft <= 5
                      ? 'border-amber-500/50 bg-amber-500/10'
                      : 'border-slate-800 bg-slate-900'
                }`}
              >
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Timer</p>
                <p className={`text-2xl font-black tabular-nums ${timeLeft <= 5 ? 'animate-pulse' : ''} ${timeLeft <= 2 ? 'text-red-300' : timerTone}`}>{timeLeft}s</p>
              </div>
            </div>
          </div>

          <div className="shrink-0 px-4 pb-2 pt-3 md:px-8">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progress <= 25 ? 'bg-red-400' : progress <= 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-1 min-h-0 flex-col items-center justify-center p-4 md:p-8">
              {question.image ? (
                <>
                  <p className="w-full max-w-5xl text-center text-2xl font-black leading-tight text-white/95 drop-shadow-md md:text-4xl">
                    {question.prompt}
                  </p>
                  <div className="mt-4 flex min-h-0 w-full flex-1 items-center justify-center">
                    <img
                      src={resolveImageUrl(question.image)}
                      alt="Question visual"
                      className="max-h-full max-w-full rounded-lg object-contain shadow-xl"
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center p-8">
                  <p className="text-center text-3xl font-bold text-white md:text-5xl lg:text-6xl">
                    {question.prompt}
                  </p>
                </div>
              )}
            </div>

            {isTypeGuessQuestion ? (
              <div className="relative z-10 mx-auto grid w-full max-w-5xl shrink-0 grid-cols-1 gap-3 p-4 md:p-8">
                {chatMode !== 'FREE' && privateGuessHistory.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {privateGuessHistory.map((entry, idx) => (
                      <button
                        key={`${entry}_${idx}`}
                        type="button"
                        onClick={() => handleReusePrivateGuess(entry)}
                        title={entry}
                        disabled={answeredCorrect === true || isSubmitting}
                        className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/80 transition-all hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span className="block max-w-36 truncate">{entry}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={desktopGuessInputRef}
                    type="text"
                    value={guessText}
                    onChange={(e) => setGuessText(e.target.value.slice(0, 180))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !answeredCorrect && !isSubmitting) handleGuessSubmit();
                    }}
                    placeholder={answeredCorrect ? 'Answer submitted' : 'Type your guess here...'}
                    disabled={answeredCorrect === true || isSubmitting}
                    className={`flex-1 rounded-xl border border-white/20 bg-slate-950/60 px-5 py-3 text-base font-semibold text-white shadow-inner placeholder:text-slate-400 focus:border-emerald-400/80 focus:ring-2 focus:ring-emerald-400/30 focus:outline-none transition-all ${(answeredCorrect === true || isSubmitting) ? 'cursor-not-allowed opacity-40' : ''}`}
                    style={{ minHeight: answerControlMinHeight }}
                  />
                  <button
                    onClick={handleGuessSubmit}
                    data-haptic="medium"
                    className="rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 px-6 py-3 text-sm font-black tracking-wide text-teal-950 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                    style={{ minHeight: answerControlMinHeight }}
                    disabled={!guessText.trim() || answeredCorrect === true || isSubmitting}
                  >
                    {isSubmitting ? '...' : 'GUESS'}
                  </button>
                </div>
                {guessFeedback && <p className="text-xs font-semibold text-emerald-300">{guessFeedback}</p>}
              </div>
            ) : (
              <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-8 shrink-0">
                {question.options.map((opt, idx) => {
                  const colorClass =
                    idx % 4 === 0
                      ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white'
                      : idx % 4 === 1
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                        : idx % 4 === 2
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                          : 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white';

                  return (
                    <button
                      key={`${question?.q_id || 'q'}_${idx}_${opt}`}
                      onClick={() => handleAnswer(opt)}
                      data-haptic="medium"
                      disabled={isSubmitting}
                      className={`rounded-xl px-6 py-4 text-left text-lg font-black transition-transform hover:scale-[1.02] active:scale-95 md:py-6 md:text-xl disabled:cursor-not-allowed disabled:opacity-60 ${colorClass}`}
                      style={{ minHeight: answerControlMinHeight }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="hidden lg:flex w-80 lg:w-96 flex-col border-l border-white/10 bg-black/20 backdrop-blur-xl relative z-10">
          <div className="shrink-0 border-b border-white/10 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300/80">Room Chat</p>
            <p className="mt-1 text-[11px] text-slate-400">{roomDisplayName}</p>
          </div>
          <div className="min-h-0 flex-1 p-3">
            <div className="h-full rounded-2xl border border-white/10 bg-black/25 p-2 overflow-hidden">
              <Chat
                socket={chatSocket}
                roomPin={LAN_ROOM}
                title="Room Chat"
                initialMode={chatMode}
                initialAllowed={chatAllowed}
                initialMessages={chatHistory}
                suppressFreeComposer={isTypeGuessQuestion}
                showMeta={!isTypeGuessQuestion}
                showModeBadge={!isTypeGuessQuestion}
              />
            </div>
          </div>
        </aside>

        <ConfirmActionModal
          open={isLeaveModalOpen}
          title="Leave Room"
          message={`You are about to leave ${roomDisplayName} and return to the Play screen.`}
          checkboxLabel="I understand I may lose my score progress in this match."
          checked={leaveConfirmChecked}
          onCheckedChange={setLeaveConfirmChecked}
          onCancel={closeLeaveGameModal}
          onConfirm={handleLeaveGame}
          confirmLabel="Leave Game"
        />
      </div>
    );
  }

  if (phase === 'waiting' || awaitingRoomCreation) {
    return (
      <div className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white flex flex-col items-center justify-start gap-4 p-5 pt-8 animate-phase-in z-0">
        <AnimatedBackground />
        <div className="relative z-10 w-full max-w-5xl">
          <PlayerTopBar showLeaveButton onLeaveGame={openLeaveGameModal} socket={chatSocket} />
        </div>
        <p className="text-3xl md:text-4xl font-black tracking-tight drop-shadow-md">{roomDisplayName}</p>
        <p className="text-white/50 text-sm font-medium">
          {awaitingRoomCreation ? 'Host is setting up the room. You will join automatically.' : 'Host is getting everyone ready. Game starts soon.'}
        </p>
        <p className={`text-xs font-black uppercase tracking-[0.15em] ${isLobbyDeckReady ? 'text-emerald-300' : 'text-amber-300'}`}>
          {awaitingRoomCreation
            ? `Auto-join is on. We check every ${joinRetryIn || 1}s${connected ? '' : ' once connection returns'}`
            : isLobbyDeckReady
              ? 'Deck selected. You are all set.'
              : 'Host is choosing the deck. Chat while you wait.'}
        </p>
        <p className={`text-xs font-mono mt-1 ${connected ? 'text-emerald-400' : 'text-amber-300'}`}>
          {connected ? 'connected' : 'reconnecting...'}
        </p>

        <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 gap-4 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] lg:items-stretch">
          <section className="rounded-3xl border border-white/10 bg-black/30 backdrop-blur-2xl p-4 shadow-[0_0_40px_rgba(0,0,0,0.5)] lg:p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/80">Player Profile</p>
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 lg:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Display Name</p>
                  <p className="text-lg font-black text-emerald-200 drop-shadow-sm">{name || 'Player'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingName((v) => !v)}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-white/80 transition-all hover:bg-white/10 hover:text-white"
                  >
                    {isEditingName ? 'Done' : 'Edit Profile'}
                  </button>
                  <AvatarBadge avatarValue={avatarObject.value} />
                </div>
              </div>

              {isEditingName && (
                <>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 24))}
                    placeholder="Your hacker alias"
                    className="w-full rounded-full border border-white/15 bg-black/30 px-5 py-3 text-sm font-semibold text-white placeholder-white/30 transition-all focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20 focus:outline-none"
                  />
                </>
              )}

              {isEditingName ? (
                <>
                  <div className="mt-4 mb-2 grid grid-cols-4 gap-2">
                    {PRESET_AVATARS.map((presetId) => (
                      hiddenPresetPaths.has(presetId) ? null :
                      <button
                        key={presetId}
                        onClick={() => setAvatarObject({ type: 'preset', value: presetId })}
                        className={`rounded-2xl border-2 p-1.5 transition-all duration-200 ${
                          avatarObject.value === presetId
                            ? 'border-emerald-400 ring-2 ring-emerald-500/30 shadow-[0_0_12px_rgba(52,211,153,0.25)] scale-105'
                            : 'border-white/10 hover:border-white/30 hover:scale-105'
                        }`}
                        style={{ background: 'linear-gradient(145deg, rgba(15,23,42,0.8) 0%, rgba(30,41,59,0.6) 100%)' }}
                      >
                        <img
                          src={resolvePresetPath(presetId)}
                          alt={`Avatar preset ${presetId}`}
                          onError={() => {
                            setHiddenPresetPaths((prev) => {
                              const next = new Set(prev);
                              next.add(presetId);
                              return next;
                            });
                          }}
                          className="h-14 w-full rounded-xl object-contain p-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] overflow-hidden"
                        />
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    className="mt-4 w-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 py-3.5 text-sm font-black tracking-[0.16em] text-teal-950 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] active:translate-y-0 active:scale-95"
                  >
                    SAVE PROFILE
                  </button>
                </>
              ) : (
                <p className="mt-3 text-xs text-white/40">Select Edit Profile to update your display name and avatar.</p>
              )}
            {profileSaved && (
              <p className="mt-3 text-center text-xs font-bold text-emerald-300">Profile saved.</p>
            )}
            </div>
          </section>

          <section className="min-h-0 overflow-hidden rounded-3xl border border-white/10 bg-black/30 backdrop-blur-xl p-3 shadow-xl shadow-black/40 lg:p-4">
            <div className="h-[46dvh] min-h-[340px] sm:h-[50dvh] lg:h-full lg:min-h-[520px]">
              <Chat
                socket={chatSocket}
                roomPin={LAN_ROOM}
                title="Lobby Chat"
                initialMode={chatMode}
                initialAllowed={chatAllowed}
                initialMessages={chatHistory}
              />
            </div>
          </section>
        </div>

        <ConfirmActionModal
          open={isLeaveModalOpen}
          title="Leave Waiting Lobby"
          message={`You are about to leave ${roomDisplayName} and return to the Play screen.`}
          checkboxLabel="I understand I will stop waiting for this host room."
          checked={leaveConfirmChecked}
          onCheckedChange={setLeaveConfirmChecked}
          onCancel={closeLeaveGameModal}
          onConfirm={handleLeaveGame}
          confirmLabel="Leave Game"
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white flex flex-col items-center justify-center p-6 z-0">
      <AnimatedBackground />
      <button onClick={handleBack} className="absolute top-5 left-5 z-20 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-2 text-sm font-semibold text-white/60 transition-all hover:bg-white/10 hover:text-white">← back</button>
      <div className="z-10 w-full max-w-sm animate-phase-in rounded-3xl border border-white/10 bg-black/40 backdrop-blur-2xl p-8 shadow-[0_0_60px_rgba(0,0,0,0.6)]">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6 drop-shadow-md">
          {awaitingRoomCreation ? 'Almost There' : 'Joining Game'}
        </h1>
        <div className="w-full flex flex-col gap-4 items-center justify-center">
          <p className="text-white/50 font-medium">
            {awaitingRoomCreation
              ? 'Your host is warming things up. We will pull you in as soon as the room opens.'
              : 'One moment...'}
          </p>
          {error && !awaitingRoomCreation && (
            <p className="rounded-2xl border border-rose-500/40 bg-rose-500/15 backdrop-blur-md px-4 py-3 text-xs font-semibold text-rose-200 w-full text-center shadow-[0_0_15px_rgba(244,63,94,0.15)]">
              {error}
            </p>
          )}
          {awaitingRoomCreation && (
            <p className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-xs font-semibold text-cyan-100 w-full text-center">
              New session? Ask the host to resend the latest invite link or room code.
            </p>
          )}
          {connected && phase === 'joining' && (
            <p className="text-xs font-mono text-white/40">Auto retry in {joinRetryIn || 1}s</p>
          )}
          {connected && awaitingRoomCreation && (
            <p className="text-xs font-mono text-white/40">Checking room status every {joinRetryIn || 1}s</p>
          )}
          <button
            onClick={() => {
              attemptEntry();
              setJoinRetryIn(3);
            }}
            disabled={!connected}
            className="mt-1 w-full rounded-full border-2 border-white/15 bg-white/5 px-4 py-3.5 text-sm font-black tracking-[0.1em] text-white/90 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:shadow-[0_0_15px_rgba(52,211,153,0.2)] active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {awaitingRoomCreation ? 'CHECK AGAIN' : 'RETRY NOW'}
          </button>
          <div className={`flex items-center justify-center gap-2 text-xs font-bold ${connected ? 'text-emerald-400' : 'text-amber-300'}`}>
            {connected ? (
              <span>connected</span>
            ) : (
              <>
                <span>connecting</span>
                <span className="status-dot" />
                <span className="status-dot" />
                <span className="status-dot" />
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmActionModal
        open={isLeaveModalOpen}
        title="Leave Room"
        message="You are about to leave before joining fully and return to the Play screen."
        checkboxLabel="I understand this will cancel my current join attempt."
        checked={leaveConfirmChecked}
        onCheckedChange={setLeaveConfirmChecked}
        onCancel={closeLeaveGameModal}
        onConfirm={handleLeaveGame}
        confirmLabel="Leave Game"
      />
    </div>
  );
}