import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Check, Copy, Expand, Mic, MicOff, Settings, UserX } from 'lucide-react';
import Chat from '../Chat';
import PingIndicator from '../PingIndicator';
import VolumeKnob from '../VolumeKnob';
import { QRCodeSVG } from 'qrcode.react';
import AnimatedBackground from '../AnimatedBackground';
import ConfirmActionModal from '../ConfirmActionModal';
import { normalizeAvatarObject, resolvePresetPath } from '../../utils/avatarObject';

// Styled Glass Button Component
const GlassStartButton = styled.button`
  perspective: 1000px;
  width: auto;
  border-radius: 24px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.2),
    rgba(139, 92, 246, 0.1),
    rgba(255, 255, 255, 0.08)
  );
  box-shadow:
    inset 0 1px 2px rgba(255, 255, 255, 0.5),
    inset 0 -1px 2px rgba(0, 0, 0, 0.3),
    0 8px 16px rgba(0, 0, 0, 0.3),
    0 0 30px rgba(255, 255, 255, 0.15),
    0 0 50px rgba(139, 92, 246, 0.2);
  transform: rotateX(15deg) translateZ(0);
  transition: all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
  position: relative;
  cursor: pointer;
  animation: glassButtonPulse 2s infinite ease-in-out;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  font-weight: 900;
  padding: 12px 28px;
  font-size: 15px;
  font-family: Outfit, sans-serif;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: -50px;
    width: 50px;
    height: 100%;
    background: linear-gradient(
      to right,
      transparent,
      rgba(255, 255, 255, 0.1),
      rgba(255, 255, 255, 0.2),
      rgba(255, 255, 255, 0.1),
      transparent
    );
    transform: skewX(-25deg);
    animation: glassShine 3s infinite linear;
    pointer-events: none;
    z-index: 1;
  }

  &::after {
    content: "";
    position: absolute;
    bottom: -8px;
    left: 10%;
    width: 80%;
    height: 8px;
    background: radial-gradient(
      ellipse at center,
      rgba(0, 0, 0, 0.3) 0%,
      transparent 70%
    );
    z-index: -1;
  }

  &:hover {
    /* No jump - same transform, just enhanced glow */
    transform: rotateX(15deg) translateZ(0);
    box-shadow:
      inset 0 1px 2px rgba(255, 255, 255, 0.5),
      inset 0 -1px 2px rgba(0, 0, 0, 0.3),
      0 12px 24px rgba(0, 0, 0, 0.4),
      0 0 60px rgba(255, 255, 255, 0.3),
      0 0 80px rgba(139, 92, 246, 0.3);
    border-color: rgba(139, 92, 246, 0.4);
  }

  &:active {
    transform: rotateX(15deg) translateZ(0) scale(0.98);
    box-shadow:
      inset 0 1px 2px rgba(255, 255, 255, 0.4),
      inset 0 -1px 2px rgba(0, 0, 0, 0.2),
      0 2px 4px rgba(0, 0, 0, 0.2),
      0 0 10px rgba(255, 255, 255, 0.1);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @keyframes glassButtonPulse {
    0%, 100% {
      box-shadow:
        inset 0 1px 2px rgba(255, 255, 255, 0.5),
        inset 0 -1px 2px rgba(0, 0, 0, 0.3),
        0 8px 16px rgba(0, 0, 0, 0.3),
        0 0 30px rgba(255, 255, 255, 0.15),
        0 0 50px rgba(139, 92, 246, 0.2);
    }
    50% {
      box-shadow:
        inset 0 1px 2px rgba(255, 255, 255, 0.5),
        inset 0 -1px 2px rgba(0, 0, 0, 0.3),
        0 8px 16px rgba(0, 0, 0, 0.3),
        0 0 50px rgba(255, 255, 255, 0.25),
        0 0 80px rgba(139, 92, 246, 0.3);
    }
  }

  @keyframes glassShine {
    0% {
      left: -50px;
    }
    100% {
      left: 250px;
    }
  }
`;

// Styled Glass Button with Rose Accent (for END GAME)
export default function HostLobbyView({
  handleBack,
  onEndGameRequest,
  isEndGameModalOpen,
  endGameConfirmChecked,
  setEndGameConfirmChecked,
  onEndGameCancel,
  onEndGameConfirm,
  isLeaveHostModalOpen,
  leaveHostConfirmChecked,
  setLeaveHostConfirmChecked,
  onLeaveHostCancel,
  onLeaveHostConfirm,
  isDeleteDraftModalOpen,
  deleteDraftConfirmChecked,
  setDeleteDraftConfirmChecked,
  deleteDraftTargetTitle,
  onDeleteDraftCancel,
  onDeleteDraftConfirm,
  hostSocket,
  joinUrl,
  copied,
  setCopied,
  isQrFullscreenOpen,
  setIsQrFullscreenOpen,
  isDragging,
  handleDragOver,
  handleDragLeave,
  handleFileDrop,
  deckLabel,
  studioDeckQuery,
  setStudioDeckQuery,
  setShowDraftManager,
  setManageNotice,
  selectedDeckKey,
  handleDeckSelection,
  availableDecks,
  isLoadingBundledDecks,
  studioQuestions,
  filteredStudioDecks,
  studioDecks,
  selectedDeckSource,
  selectedDeckCount,
  bundledDecksError,
  dropNotice,
  loadBundledDecks,
  hasFetchedCloudCatalog,
  isOnline,
  handleLoadMoreCloudDecks,
  cloudStatus,
  cloudError,
  cloudDecks,
  handleDownloadCloudDeck,
  downloadingCloudDeckId,
  hostToken,
  players,
  recentlyUpdatedPlayerIds,
  mutedSet,
  handleUnmute,
  handleMute,
  handleKick,
  startReady,
  isStartingGame,
  isReadyMode,
  isCountdownActive,
  countdownSeconds,
  handleStart,
  startButtonLabel,
  startStatusText,
  answerMode,
  answerModeOptions,
  answerModeLabels,
  syncAnswerMode,
  questionTimer,
  syncTimer,
  gameDifficulty,
  syncDifficulty,
  maxPlayers,
  effectiveMaxPlayers,
  syncMaxPlayers,
  modeOptions,
  syncChatMode,
  chatMode,
  modeLabels,
  newAllowedText,
  setNewAllowedText,
  addAllowedMessage,
  allowedList,
  removeAllowedMessage,
  socket,
  roomId,
  roomName,
  onHostAnnouncement,
  gameMode,
  gameModeOptions,
  gameModeLabels,
  syncGameMode,
}) {
  void [
    onEndGameRequest,
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleFileDrop,
    deckLabel,
    studioDeckQuery,
    setStudioDeckQuery,
    setShowDraftManager,
    setManageNotice,
    isLoadingBundledDecks,
    studioQuestions,
    filteredStudioDecks,
    selectedDeckSource,
    selectedDeckCount,
    bundledDecksError,
    dropNotice,
    loadBundledDecks,
    hasFetchedCloudCatalog,
    isOnline,
    handleLoadMoreCloudDecks,
    cloudStatus,
    cloudError,
    cloudDecks,
    handleDownloadCloudDeck,
    downloadingCloudDeckId,
    hostToken,
    startReady,
    isReadyMode,
    startButtonLabel,
    roomName,
    gameMode,
    gameModeOptions,
    gameModeLabels,
    syncGameMode,
  ];
  const roomGameMode = chatMode === 'RESTRICTED' ? 'guided' : 'open';
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementFeedback, setAnnouncementFeedback] = useState('');
  const [isChatSettingsOpen, setIsChatSettingsOpen] = useState(false);
  const [isRoomSettingsOpen, setIsRoomSettingsOpen] = useState(false);
  const [pendingDeckKey, setPendingDeckKey] = useState('');
  const [pendingTimer, setPendingTimer] = useState(30);
  const [pendingDifficulty, setPendingDifficulty] = useState('Normal');
  const [pendingMaxPlayers, setPendingMaxPlayers] = useState(20);
  const playerListEndRef = useRef(null);

  const answerModeSettingOptions = answerModeOptions.filter((mode) => mode === 'auto' || mode === 'type_guess');

  const deckOptions = [
    ...(Array.isArray(availableDecks)
      ? availableDecks.map((deck) => ({
          value: `server:${deck.file}`,
          label: `${deck.name} (${deck.count})`,
        }))
      : []),
    ...(Array.isArray(studioDecks)
      ? studioDecks.map((deck) => ({
          value: `studio:${deck.id}`,
          label: `${deck.title || 'Untitled'} (${Array.isArray(deck.slides) ? deck.slides.length : 0})`,
        }))
      : []),
  ];

  const renderLobbyAvatar = (player) => {
    const avatarObject = normalizeAvatarObject(player?.avatarObject);
    return (
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-600/60 bg-linear-to-br from-slate-800 to-slate-700 p-0.5 shadow-md shadow-black/30">
        <img
          src={resolvePresetPath(avatarObject.value)}
          alt={`${player?.name || 'Player'} avatar`}
          onError={(event) => {
            event.currentTarget.style.display = 'none';
            const fallback = event.currentTarget.nextElementSibling;
            if (fallback) fallback.style.opacity = '1';
          }}
          className="h-full w-full rounded-full object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-violet-200 opacity-0 transition-opacity duration-200">
          {player?.name?.charAt(0)?.toUpperCase() || '?'}
        </span>
      </div>
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      console.error('copy failed', e);
    }
  };

  const handleSendAnnouncement = () => {
    const text = announcementText.trim();
    if (!text || !onHostAnnouncement) return;
    const formattedText = text.startsWith('[HOST]') ? text : `[HOST] ${text}`;
    onHostAnnouncement(formattedText, (ack) => {
      if (!ack?.ok) {
        setAnnouncementFeedback('Could not send announcement.');
        return;
      }
      setAnnouncementText('');
      setAnnouncementFeedback('Announcement sent.');
      window.setTimeout(() => setAnnouncementFeedback(''), 1800);
    });
  };

  const handleOpenRoomSettings = () => {
    setPendingDeckKey(selectedDeckKey || deckOptions[0]?.value || '');
    setPendingTimer(questionTimer || 30);
    setPendingDifficulty(gameDifficulty || 'Normal');
    setPendingMaxPlayers(Number(maxPlayers) || 20);
    setIsRoomSettingsOpen(true);
  };

  const handleSaveRoomSettings = () => {
    if (pendingDeckKey) {
      handleDeckSelection({ target: { value: pendingDeckKey } });
    }
    syncTimer(pendingTimer);
    syncDifficulty(pendingDifficulty);
    syncMaxPlayers(pendingMaxPlayers);
    setIsRoomSettingsOpen(false);
  };

  useEffect(() => {
    playerListEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [players]);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-slate-950 text-white animate-phase-in z-0">
      <AnimatedBackground />

      {/* ── Sticky Header Bar ── */}
      <div className="sticky top-0 z-50 mb-6 border-b border-white/10 bg-[#161B22]/95 backdrop-blur-xl shadow-lg shadow-black/40">
        <header className="mx-auto flex w-full items-center justify-between gap-3 px-4 py-2.5 md:px-8">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-700/70 bg-[#1C2128] px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-100 transition hover:border-violet-300/45 hover:bg-[#22272E]"
          >
            ← Leave Lobby
          </button>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="flex items-center gap-1 scale-75 md:scale-100">
              <VolumeKnob />
              <PingIndicator socket={hostSocket} />
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-linear-to-br from-emerald-500/15 to-emerald-500/5 px-3 py-1.5 backdrop-blur-sm shadow-lg shadow-emerald-500/10">
              <span className="text-[11px] font-bold text-emerald-300 font-outfit tracking-wide">Live Lobby</span>
            </div>
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-bold text-cyan-200">
              Capacity {players.length}/{effectiveMaxPlayers}
            </div>
            <button
              onClick={handleOpenRoomSettings}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-violet-400/35 bg-violet-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-violet-100 transition hover:border-violet-300/60 hover:bg-violet-500/20"
            >
              <Settings size={14} />
              Settings
            </button>
          </div>
        </header>
      </div>

      <div className="p-4 md:p-8">
        <div className="panel-elevated relative z-10 mx-auto max-w-420 rounded-4xl border border-slate-700/65 bg-[#11161D]/88 p-4 shadow-2xl shadow-black/40 md:p-5 xl:p-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(360px,1.05fr)_minmax(460px,1.25fr)_minmax(400px,1.1fr)]">
          {/* Left Column: Gateway */}
          <section className="flex flex-col rounded-3xl border border-slate-700/35 bg-transparent p-5 shadow-[0_0_45px_rgba(45,212,191,0.07)]">
            <div className="mb-4 section-header">The Gateway</div>
            <p className="mb-4 text-xs text-slate-400">Scan to join instantly</p>

            <div className="relative mb-5 rounded-3xl border border-cyan-400/35 bg-[#0D1117] p-4 shadow-[0_0_45px_rgba(34,211,238,0.22)]">
              <button
                onClick={() => setIsQrFullscreenOpen(true)}
                aria-label="Open fullscreen QR"
                title="Fullscreen QR"
                className="absolute right-4 top-4 z-10 inline-flex items-center justify-center rounded-xl border border-slate-700/70 bg-[#1C2128]/90 p-2 text-slate-100 transition hover:border-violet-500/50 hover:bg-[#22272E]"
              >
                <Expand size={16} />
              </button>
              <div className="qr-gradient-border mx-auto w-full max-w-sm">
                <div className="flex items-center justify-center rounded-2xl bg-white p-3">
                  <QRCodeSVG value={joinUrl} size={320} level="H" includeMargin className="h-auto w-full max-w-[320px]" />
                </div>
              </div>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={copyLink}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  copyLink();
                }
              }}
              className="mb-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-700/40 bg-[#0D1117] px-4 py-3 transition hover:border-emerald-400/60"
            >
              <div className="min-w-0">
                <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">Join URL</p>
                <p className="break-all text-base font-black tracking-tight text-cyan-300 font-outfit">{joinUrl}</p>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold ${copied ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200' : 'border-slate-600/70 bg-slate-900/60 text-slate-200'}`}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </span>
            </div>
          </section>

          {/* Center Column: Hype Zone */}
          <section className="flex min-h-170 flex-col rounded-3xl border border-slate-700/35 bg-transparent p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="section-header">Players Joined: {players.length}</p>
              <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-200">Hype Zone</span>
            </div>

            <div className="min-h-0 flex-1 rounded-2xl border border-slate-800/70 bg-[#0D1117]/80 p-4">
              {players.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <p className="text-base font-bold text-slate-300 font-outfit">No players yet</p>
                  <p className="mt-2 text-sm text-slate-500">Share the QR and watch the roster light up.</p>
                </div>
              ) : (
                <div className="grid max-h-full grid-cols-1 gap-3 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition-all ${recentlyUpdatedPlayerIds.has(player.id)
                        ? 'border-violet-400/70 bg-violet-500/20 shadow-[0_0_18px_rgba(139,92,246,0.24)]'
                        : 'border-slate-700/70 bg-slate-800/55'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {renderLobbyAvatar(player)}
                        <p className="truncate text-sm font-bold text-slate-100">{player.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleKick(player.id)}
                          className="inline-flex items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/10 p-2 transition hover:bg-rose-500/20"
                          title="Kick"
                          aria-label="Kick player"
                        >
                          <UserX size={16} />
                        </button>
                        <button
                          onClick={() => (mutedSet.has(player.id) ? handleUnmute(player.id) : handleMute(player.id))}
                          className={`inline-flex items-center justify-center rounded-xl border p-2 transition ${mutedSet.has(player.id)
                            ? 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20'
                            : 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20'
                          }`}
                          title={mutedSet.has(player.id) ? 'Unmute' : 'Mute'}
                          aria-label={mutedSet.has(player.id) ? 'Unmute player' : 'Mute player'}
                        >
                          {mutedSet.has(player.id) ? <Mic size={16} /> : <MicOff size={16} />}
                        </button>
                      </div>
                    </div>
                  ))}
                  <div ref={playerListEndRef} />
                </div>
              )}
            </div>

            <div className="mt-auto pt-5">
              <button
                onClick={handleStart}
                disabled={players.length === 0 || isStartingGame || isCountdownActive}
                className={`w-full rounded-2xl px-6 py-5 text-lg font-black tracking-wide transition-all duration-200 ${players.length === 0 || isStartingGame || isCountdownActive
                  ? 'cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-400'
                  : 'border border-emerald-300/40 bg-linear-to-r from-emerald-400 to-teal-300 text-slate-950 shadow-[0_0_55px_rgba(16,185,129,0.35)] hover:-translate-y-0.5 hover:shadow-[0_0_70px_rgba(16,185,129,0.42)]'
                }`}
              >
                {isStartingGame && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {isCountdownActive ? `Starting in ${countdownSeconds}s` : 'START GAME'}
              </button>
              <p className="mt-2 text-center text-xs text-slate-500">
                {players.length === 0 ? 'At least one player must join before starting.' : startStatusText}
              </p>
            </div>
          </section>

          {/* Right Column: Social Hub */}
          <section className="flex min-h-170 flex-col rounded-3xl border border-slate-700/35 bg-transparent p-4">
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <div className="min-w-0 flex-1">
                <p className="section-header">Room Chat</p>
                <p className="text-xs text-slate-400">Unified social hub</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {modeOptions.map((mode) => (
                    <button
                      key={`chat-quick-${mode}`}
                      onClick={() => syncChatMode(mode)}
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] transition-all duration-150 ${chatMode === mode
                        ? 'bg-emerald-400 text-black shadow-md shadow-emerald-500/20'
                        : 'border border-slate-700/70 bg-[#0D1117] text-slate-400 hover:border-slate-500 hover:text-slate-200'
                      }`}
                    >
                      {modeLabels[mode]}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setIsChatSettingsOpen(true)}
                className="inline-flex items-center justify-center rounded-xl border border-slate-700/60 bg-[#1C2128] p-2 text-sm font-bold text-slate-200 transition hover:border-violet-500/40 hover:bg-[#22272E]"
                aria-label="Open chat settings"
                title="Chat settings"
              >
                <Settings size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-2">
              <Chat
                socket={socket}
                roomPin={roomId}
                readOnly
                title="Room Chat"
                lobbyPillFeed
                initialMode={chatMode}
                initialAllowed={allowedList}
                allowHostActions
                onHostMute={handleMute}
                mutedSet={mutedSet}
                showMeta={false}
                showModeBadge={false}
              />
            </div>

            <div className="mt-3 border-t border-slate-800/80 pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-300">Host Message</p>
              <div className="flex gap-2">
                <input
                  value={announcementText}
                  onChange={(event) => setAnnouncementText(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleSendAnnouncement()}
                  placeholder="Send a room announcement..."
                  className="flex-1 rounded-xl border border-slate-700/50 bg-[#0D1117] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none transition-colors"
                  maxLength={280}
                />
                <button
                  onClick={handleSendAnnouncement}
                  disabled={!announcementText.trim()}
                  className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  Send
                </button>
              </div>
              {announcementFeedback && <p className="mt-2 text-xs text-emerald-300">{announcementFeedback}</p>}
            </div>
          </section>
          </div>
        </div>
      </div>

      {/* Chat Settings Modal */}
      {isChatSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <button
            aria-label="Close chat settings"
            onClick={() => setIsChatSettingsOpen(false)}
            className="absolute inset-0"
          />
          <div className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-700/60 bg-[#11161D] p-5 shadow-2xl shadow-black/60">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="section-header">Chat Settings</p>
                <p className="mt-1 text-xs text-slate-400">{roomGameMode === 'guided' ? 'Guided Mode' : 'Open Mode'}</p>
              </div>
              <button
                onClick={() => setIsChatSettingsOpen(false)}
                className="rounded-xl border border-slate-700/60 bg-[#1C2128] px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-[#22272E]"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {modeOptions.map((mode) => (
                <button
                  key={mode}
                  onClick={() => syncChatMode(mode)}
                  className={`rounded-xl px-4 py-2.5 text-[11px] font-black tracking-wide transition-all duration-150 ${chatMode === mode
                    ? 'bg-emerald-400 text-black shadow-md shadow-emerald-500/20'
                    : 'bg-[#0D1117] text-slate-400 hover:bg-[#1C2128] hover:text-white'
                  }`}
                >
                  {modeLabels[mode]}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800/60 bg-[#0D1117]/60 p-3.5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400 font-outfit">Answer Mode</p>
              <div className="grid grid-cols-2 gap-2">
                {answerModeSettingOptions.map((mode) => (
                  <button
                    key={mode}
                    onClick={() => syncAnswerMode(mode)}
                    className={`rounded-xl px-4 py-2.5 text-[11px] font-black tracking-wide transition-all duration-150 ${answerMode === mode
                      ? 'bg-violet-500 text-white shadow-md shadow-violet-500/20'
                      : 'bg-[#0D1117] text-slate-400 hover:bg-[#1C2128] hover:text-white'
                    }`}
                  >
                    {answerModeLabels[mode]}
                  </button>
                ))}
              </div>
            </div>

            {chatMode === 'RESTRICTED' && (
              <div className="mt-4 rounded-2xl border border-slate-800/60 bg-[#0D1117]/60 p-3.5">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400 font-outfit">Restricted Presets</p>
                <div className="mb-2 flex gap-2">
                  <input
                    value={newAllowedText}
                    onChange={(e) => setNewAllowedText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addAllowedMessage()}
                    placeholder="Add preset"
                    className="flex-1 rounded-xl border border-slate-700/50 bg-[#0D1117] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none transition-colors"
                  />
                  <button onClick={addAllowedMessage} className="rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-black text-black transition hover:bg-emerald-300">Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allowedList.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2 rounded-full border border-slate-700/50 bg-[#0D1117] px-3.5 py-2 text-xs text-slate-200">
                      <span>{entry.text}</span>
                      <button onClick={() => removeAllowedMessage(entry.id)} className="text-slate-500 transition hover:text-red-400">Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Room Settings Modal */}
      {isRoomSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <button
            aria-label="Close room settings"
            onClick={() => setIsRoomSettingsOpen(false)}
            className="absolute inset-0"
          />
          <div className="relative z-10 w-full max-w-xl rounded-3xl border border-slate-700/60 bg-[#11161D] p-6 shadow-2xl shadow-black/60">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="section-header">Room Settings</p>
                <p className="mt-1 text-xs text-slate-400">Change deck, timer, and difficulty.</p>
              </div>
              <button
                onClick={() => setIsRoomSettingsOpen(false)}
                className="rounded-xl border border-slate-700/60 bg-[#1C2128] px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-[#22272E]"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Deck</p>
                <select
                  value={pendingDeckKey}
                  onChange={(event) => setPendingDeckKey(event.target.value)}
                  className="w-full rounded-xl border border-slate-700/50 bg-[#0D1117] px-3.5 py-2.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none"
                >
                  {deckOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Question Timer</p>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 30, 60].map((time) => (
                    <button
                      key={time}
                      onClick={() => setPendingTimer(time)}
                      className={`rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${pendingTimer === time
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 border border-emerald-400'
                        : 'border border-slate-700/50 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:border-emerald-500/50'
                      }`}
                    >
                      {time}s
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Difficulty</p>
                <div className="grid grid-cols-3 gap-2">
                  {['Easy', 'Normal', 'Hard'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setPendingDifficulty(level)}
                      className={`rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${pendingDifficulty === level
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 border border-amber-400'
                        : 'border border-slate-700/50 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:border-amber-500/50'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Max Players</p>
                  <span className="text-xs font-bold text-cyan-300">{pendingMaxPlayers}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={250}
                  step={5}
                  value={pendingMaxPlayers}
                  onChange={(event) => setPendingMaxPlayers(Number(event.target.value))}
                  className="w-full accent-cyan-400"
                />
                <p className="mt-2 text-xs text-slate-400">
                  Effective on this network now: <span className="font-semibold text-slate-200">{effectiveMaxPlayers}</span>
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsRoomSettingsOpen(false)}
                className="rounded-xl border border-slate-700/60 bg-[#1C2128] px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-[#22272E]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoomSettings}
                className="rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-black text-black transition hover:bg-emerald-300"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen QR Modal ── */}
      {isQrFullscreenOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <button
            aria-label="Close fullscreen QR"
            onClick={() => setIsQrFullscreenOpen(false)}
            className="absolute inset-0"
          />
          <div className="relative z-10 w-full max-w-2xl panel-elevated p-6 shadow-2xl shadow-black/70">
            <div className="mb-4 flex items-center justify-between">
              <p className="section-header">Join QR Fullscreen</p>
              <button
                onClick={() => setIsQrFullscreenOpen(false)}
                className="rounded-xl border border-slate-700/50 bg-[#1C2128] px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-[#22272E]"
              >
                Close
              </button>
            </div>
            <div className="qr-gradient-border mx-auto w-full max-w-xl">
              <div className="flex items-center justify-center rounded-2xl bg-white p-4">
                <QRCodeSVG value={joinUrl} size={440} level="H" includeMargin className="h-auto w-full max-w-110" />
              </div>
            </div>
            <p className="mt-4 text-center text-lg font-black text-cyan-300 font-outfit break-all">{joinUrl}</p>
          </div>
        </div>
      )}

      <ConfirmActionModal
        open={isEndGameModalOpen}
        title="End Active Room"
        message="This will immediately end the live game and disconnect every player in this room."
        checkboxLabel="I understand all players will be removed from this active room."
        checked={endGameConfirmChecked}
        onCheckedChange={setEndGameConfirmChecked}
        onCancel={onEndGameCancel}
        onConfirm={onEndGameConfirm}
        confirmLabel="End Room"
      />

      <ConfirmActionModal
        open={isLeaveHostModalOpen}
        title="Exit Host Dashboard"
        message="Exiting host mode now will close the current room for all connected players."
        checkboxLabel="I understand leaving host mode will end the room for everyone."
        checked={leaveHostConfirmChecked}
        onCheckedChange={setLeaveHostConfirmChecked}
        onCancel={onLeaveHostCancel}
        onConfirm={onLeaveHostConfirm}
        confirmLabel="Exit Host"
      />

      <ConfirmActionModal
        open={isDeleteDraftModalOpen}
        title="Delete Studio Draft"
        message={`"${deleteDraftTargetTitle || 'this draft'}" will be removed from your local Studio library.`}
        checkboxLabel="I understand this draft delete cannot be undone."
        checked={deleteDraftConfirmChecked}
        onCheckedChange={setDeleteDraftConfirmChecked}
        onCancel={onDeleteDraftCancel}
        onConfirm={onDeleteDraftConfirm}
        confirmLabel="Delete Draft"
      />
    </div>
  );
}
