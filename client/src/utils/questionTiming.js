export function resolveQuestionTiming({ durationMs, endsAt, serverNow, fallbackMs = 20000 }) {
  const parsedDuration = Number(durationMs);
  const normalizedMs = Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : fallbackMs;

  const parsedEndsAt = Number(endsAt);
  const parsedServerNow = Number(serverNow);
  const serverReferenceNow = Number.isFinite(parsedServerNow) ? parsedServerNow : Date.now();
  const remainingMsFromServer = Number.isFinite(parsedEndsAt) ? parsedEndsAt - serverReferenceNow : NaN;
  const remainingMs = Number.isFinite(remainingMsFromServer) && remainingMsFromServer > 0
    ? remainingMsFromServer
    : normalizedMs;

  return {
    normalizedMs,
    remainingMs,
    targetEndsAt: Date.now() + remainingMs,
  };
}
