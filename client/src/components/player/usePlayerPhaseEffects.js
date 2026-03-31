import { useEffect } from 'react';

export function usePlayerPhaseEffects({
  phase,
  questionEndsAt,
  setTimeLeft,
  timeLeft,
  setTimerDangerActive,
  prevTimeLeftRef,
  onTimerWarning,
  nextQuestionIn,
  setNextQuestionIn,
  setMusicPhase,
  streakCount,
  setShowFireIgnite,
  fireIgniteTimerRef,
}) {
  useEffect(() => {
    if (!(phase === 'question' || phase === 'answered') || !questionEndsAt) return undefined;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((questionEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, questionEndsAt, setTimeLeft]);

  useEffect(() => {
    if (!(phase === 'question' || phase === 'answered')) {
      setTimerDangerActive(false);
      return;
    }

    const prev = Number(prevTimeLeftRef.current || 0);
    const current = Number(timeLeft || 0);

    setTimerDangerActive(current > 0 && current <= 5);

    if (current > 0 && current <= 5 && current !== prev) {
      onTimerWarning(current);
    }

    prevTimeLeftRef.current = current;
  }, [phase, timeLeft, setTimerDangerActive, prevTimeLeftRef, onTimerWarning]);

  useEffect(() => {
    if (phase !== 'result' || nextQuestionIn <= 0) return undefined;
    const timer = window.setInterval(() => {
      setNextQuestionIn((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, nextQuestionIn, setNextQuestionIn]);

  useEffect(() => {
    const phaseToMusic = {
      joining: 'lobby',
      waiting: 'lobby',
      starting: 'gameplay',
      question: 'gameplay',
      answered: 'gameplay',
      result: 'gameplay',
      ending: 'podium',
      gameover: 'podium',
    };

    setMusicPhase(phaseToMusic[phase] || 'lobby');
  }, [phase, setMusicPhase]);

  useEffect(() => {
    if (streakCount >= 3) return;
    setShowFireIgnite(false);
    if (fireIgniteTimerRef.current) {
      window.clearTimeout(fireIgniteTimerRef.current);
      fireIgniteTimerRef.current = null;
    }
  }, [streakCount, setShowFireIgnite, fireIgniteTimerRef]);

  useEffect(() => {
    return () => {
      if (fireIgniteTimerRef.current) {
        window.clearTimeout(fireIgniteTimerRef.current);
        fireIgniteTimerRef.current = null;
      }
    };
  }, [fireIgniteTimerRef]);
}
