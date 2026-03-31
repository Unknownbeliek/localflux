import { useCallback } from 'react';
import { playGameSfx } from '../../utils/gameFeel';

export function usePlayerAnswerActions({
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
}) {
  const handleAnswer = useCallback((opt) => {
    if (selected || isSubmitting) return;

    const socket = socketRef.current;
    if (!socket) return;

    setIsSubmitting(true);
    setSelected(opt);
    setAnsweredCorrect(null);
    setGuessFeedback('');
    setPhase('answered');

    socket.emit('submit_answer', { answer: opt }, (res) => {
      if (res?.success && typeof res.correct === 'boolean') {
        setAnsweredCorrect(res.correct);
        if (res.correct) {
          const nextStreak = streakCount + 1;
          setStreakCount(nextStreak);
          celebrateCorrect({ wasStreak: nextStreak >= 3 });
          if (nextStreak === 3) triggerFireIgnite();
        } else {
          setStreakCount(0);
          playGameSfx('wrong', { intensity: 0.8 });
        }
      } else {
        // Roll back optimistic UI when backend rejects the answer.
        setSelected(null);
        setAnsweredCorrect(null);
        setPhase('question');
        if (res?.error === 'Already answered.') {
          setGuessFeedback('You already answered this round.');
        } else {
          setGuessFeedback(res?.error || 'Answer was not accepted. Please try again.');
        }
      }
      setIsSubmitting(false);
    });
  }, [
    selected,
    isSubmitting,
    socketRef,
    setIsSubmitting,
    setSelected,
    setAnsweredCorrect,
    setGuessFeedback,
    setPhase,
    streakCount,
    setStreakCount,
    celebrateCorrect,
    triggerFireIgnite,
  ]);

  const handleGuessSubmit = useCallback(() => {
    const payload = String(guessText || '').trim();
    const socket = socketRef.current;
    if (!payload || !socket || isSubmitting) return;

    setIsSubmitting(true);
    setGuessFeedback('');

    socket.emit('player:chat_guess', { text: payload }, (res) => {
      setIsSubmitting(false);
      if (!res?.ok) {
        if (res?.reason === 'already_answered') {
          setGuessFeedback('You already submitted your answer this round.');
          return;
        }
        setGuessFeedback('Could not submit guess. Try again.');
        return;
      }

      if (res.matched) {
        const nextStreak = streakCount + 1;
        setStreakCount(nextStreak);
        celebrateCorrect({ wasStreak: nextStreak >= 3 });
        if (nextStreak === 3) triggerFireIgnite();
        setSelected(payload);
        setAnsweredCorrect(true);
        setGuessText('');
        setPhase('answered');
        const points = res.scoreAwarded || 100;
        setGuessFeedback(`That is correct! +${points} pts`);
        return;
      }

      setStreakCount(0);
      playGameSfx('wrong', { intensity: 0.7 });
      setAnsweredCorrect(null);
      setGuessText('');
      setGuessFeedback('');
      if (chatMode !== 'FREE') {
        setPrivateGuessHistory((prev) => [payload, ...prev].slice(0, 6));
      }
    });
  }, [
    guessText,
    socketRef,
    isSubmitting,
    setIsSubmitting,
    setGuessFeedback,
    streakCount,
    setStreakCount,
    celebrateCorrect,
    triggerFireIgnite,
    setSelected,
    setAnsweredCorrect,
    setGuessText,
    setPhase,
    chatMode,
    setPrivateGuessHistory,
  ]);

  const handleReusePrivateGuess = useCallback((entry) => {
    const value = String(entry || '').trim();
    if (!value || answeredCorrect === true) return;

    setGuessText(value);

    const isMobileViewport =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    const inputEl = isMobileViewport ? mobileGuessInputRef.current : desktopGuessInputRef.current;
    inputEl?.focus();
    inputEl?.setSelectionRange(value.length, value.length);
  }, [answeredCorrect, setGuessText, mobileGuessInputRef, desktopGuessInputRef]);

  return {
    handleAnswer,
    handleGuessSubmit,
    handleReusePrivateGuess,
  };
}
