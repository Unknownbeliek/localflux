import { useCallback } from 'react';

export function usePlayerProfile({
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
}) {
  const handleSaveProfile = useCallback(() => {
    const newName = String(name || '').trim();
    if (!newName) {
      setError('Display name cannot be empty.');
      return;
    }

    const markProfileSaved = () => {
      setName(newName);
      setHasEditedProfile(true);
      setProfileSaved(true);
      setIsEditingName(false);
      window.setTimeout(() => setProfileSaved(false), 1800);
    };

    const canSyncToServer = socketRef.current?.connected && !awaitingRoomCreation && phase !== 'joining';
    if (!canSyncToServer) {
      setError('');
      markProfileSaved();
      return;
    }

    setError('');
    socketRef.current.emit('player:updateProfile', { newName, avatarObject }, (res) => {
      if (!res?.success) {
        const reason = String(res?.error || '').toLowerCase();
        const shouldFallbackToLocal =
          reason.includes('not in an active room') ||
          reason.includes('player not found');

        if (shouldFallbackToLocal) {
          setError('');
          markProfileSaved();
          return;
        }

        setError(res?.error || 'Could not save profile.');
        return;
      }
      setAvatarObject(normalizeAvatarObject(res.player?.avatarObject || avatarObject));
      markProfileSaved();
    });
  }, [
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
  ]);

  return {
    handleSaveProfile,
  };
}
