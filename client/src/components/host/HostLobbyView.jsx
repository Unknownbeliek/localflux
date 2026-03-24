import Chat from '../Chat';
import PingIndicator from '../PingIndicator';
import { QRCodeSVG } from 'qrcode.react';
import AnimatedBackground from '../AnimatedBackground';

function normalizeAvatarObject(input) {
  if (!input || typeof input !== 'object') return { type: 'preset', value: '1.jpg' };
  const value = String(input.value || '').trim();
  if (input.type !== 'preset' || !value) return { type: 'preset', value: '1.jpg' };
  return { type: 'preset', value };
}

function presetPath(value) {
  const cleaned = String(value || '').trim();
  if (!cleaned) return '/avatars/1.png';
  return cleaned.includes('.') ? `/avatars/${cleaned}` : `/avatars/${cleaned}.png`;
}

export default function HostLobbyView({
  handleBack,
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
  isStartConfirmArmed,
  handleStart,
  startButtonLabel,
  startStatusText,
  answerMode,
  answerModeOptions,
  answerModeLabels,
  syncAnswerMode,
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
}) {
  const renderLobbyAvatar = (player) => {
    const avatarObject = normalizeAvatarObject(player?.avatarObject);
    return (
      <div className="relative mx-auto mb-2 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-slate-600/60 bg-linear-to-br from-slate-800 to-slate-700 p-0.5 shadow-md shadow-black/30">
        <img
          src={presetPath(avatarObject.value)}
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

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-slate-950 text-white p-4 md:p-8 animate-phase-in z-0">
      <AnimatedBackground />

      {/* ── Header Bar ── */}
      <div className="relative z-10 -mx-4 md:-mx-8 mb-6 border-b border-white/10 bg-[#161B22]/60 px-4 py-4 backdrop-blur-xl md:px-8 shadow-md shadow-black/30">
        <header className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-400 transition-all hover:bg-slate-800/70 hover:text-white">← Back</button>
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-emerald-400 shadow-md shadow-violet-500/20" />
              <div className="text-xl font-black tracking-tight text-gradient-brand font-outfit">LocalFlux</div>
            </div>
            <div className="ml-4 font-outfit text-xs font-semibold tracking-wide text-slate-500">Host Dashboard</div>
          </div>
          <div className="flex items-center gap-3">
            <PingIndicator socket={hostSocket} />
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3.5 py-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-emerald-300 font-outfit">Session Active</span>
            </div>
          </div>
        </header>
      </div>

      {/* ── Main Grid ── */}
      <div className="relative z-10 mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <div className="flex flex-col gap-5">

          {/* ── Row 1: Join Link + Choose Deck ── */}
          <section className="grid gap-5 md:grid-cols-2">

            {/* Join Link Panel */}
            <div className="panel-elevated p-6">
              <div className="section-header mb-4">Join Link</div>

              {/* QR Code with animated gradient border */}
              <div className="mb-5 rounded-2xl border border-slate-700/40 bg-[#0D1117] p-4">
                <p className="mb-3 text-xs font-medium text-slate-500">Scan to Join</p>
                <div className="mx-auto w-full max-w-xs">
                  <div className="qr-gradient-border mx-auto">
                    <div className="flex items-center justify-center rounded-2xl bg-white p-3">
                      <QRCodeSVG value={joinUrl} size={256} level="H" includeMargin className="h-56 w-56 md:h-64 md:w-64" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Join URL displayed prominently */}
              <div className="mb-4 rounded-xl border border-slate-700/30 bg-[#0D1117] px-4 py-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">Join URL</p>
                <p className="text-lg font-black text-cyan-300 font-outfit tracking-tight break-all">{joinUrl}</p>
              </div>

              <p className="mb-4 text-center text-xs text-slate-500">
                Players join directly from the link or QR
              </p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button onClick={copyLink} className="w-full rounded-xl bg-emerald-400 px-5 py-3.5 text-sm font-black text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-emerald-300 hover:shadow-lg hover:shadow-emerald-500/20 active:translate-y-0 active:scale-95">
                  {copied ? '✓ Copied!' : 'Copy Join Link'}
                </button>
                <button
                  onClick={() => setIsQrFullscreenOpen(true)}
                  className="w-full rounded-xl border border-slate-700/50 bg-[#1C2128] px-5 py-3.5 text-sm font-black text-slate-100 transition-all duration-150 hover:-translate-y-0.5 hover:border-violet-500/50 hover:bg-[#22272E] hover:shadow-lg hover:shadow-violet-500/10 active:translate-y-0 active:scale-95"
                >
                  Fullscreen QR
                </button>
              </div>
            </div>

            {/* Choose Deck Panel */}
            <div
              className={`relative panel-elevated p-6 transition-all ${isDragging
                  ? 'ring-2 ring-violet-500/40 shadow-[0_0_30px_rgba(139,92,246,0.2)]'
                  : ''
                }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleFileDrop}
            >
              {isDragging && (
                <div className="pointer-events-none absolute inset-2 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-violet-300/70 bg-violet-500/10 px-4 text-center">
                  <p className="text-sm font-black tracking-wide text-violet-200">Drop .json, .flux, or .csv to load instantly</p>
                </div>
              )}
              <div className="section-header mb-4">Choose Deck</div>
              <div className="mb-4 flex items-center gap-2.5">
                <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/40" />
                <div className="text-sm font-bold text-emerald-300 font-outfit">{deckLabel}</div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="mb-2.5 flex items-center gap-2">
                    <input
                      value={studioDeckQuery}
                      onChange={(e) => setStudioDeckQuery(e.target.value)}
                      placeholder="Search studio drafts"
                      className="w-full rounded-xl border border-slate-700/50 bg-[#0D1117] px-3.5 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none transition-colors"
                    />
                    <button
                      onClick={() => {
                        setShowDraftManager(true);
                        setManageNotice('');
                      }}
                      className="rounded-xl border border-slate-700/50 bg-[#1C2128] px-4 py-2.5 text-[11px] font-bold text-slate-200 transition hover:bg-[#22272E]"
                    >
                      Manage
                    </button>
                  </div>
                  <label className="mb-2 block text-xs text-slate-500 font-medium">Select Deck</label>
                  <select
                    value={selectedDeckKey}
                    onChange={handleDeckSelection}
                    className="w-full rounded-xl border border-slate-700/50 bg-[#0D1117] px-4 py-3.5 text-sm text-emerald-300 focus:border-violet-500 focus:outline-none transition-colors"
                  >
                    <option value="">Choose a deck...</option>
                    <optgroup label={`Bundled Decks (${availableDecks.length})`}>
                      {availableDecks.length === 0 && (
                        <option value="" disabled>
                          {isLoadingBundledDecks ? 'Loading bundled decks...' : 'No bundled decks found'}
                        </option>
                      )}
                      {availableDecks.map((deck) => (
                        <option key={deck.file} value={`server:${deck.file}`}>
                          {deck.name} ({deck.count} questions)
                        </option>
                      ))}
                    </optgroup>
                    {Array.isArray(studioQuestions) && studioQuestions.length > 0 && (
                      <optgroup label="Current Studio Launch">
                        <option value="studio:session">Studio Session ({studioQuestions.length} questions)</option>
                      </optgroup>
                    )}
                    <optgroup label={`Studio Drafts (${filteredStudioDecks.length})`}>
                      {studioDecks.length === 0 && <option value="studio:none" disabled>No local studio drafts found</option>}
                      {studioDecks.length > 0 && filteredStudioDecks.length === 0 && <option value="studio:none_query" disabled>No drafts match search</option>}
                      {filteredStudioDecks.map((draft) => (
                        <option key={draft.id} value={`studio:${draft.id}`}>
                          {(draft.title || 'Untitled')} ({Array.isArray(draft.slides) ? draft.slides.length : 0} questions)
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <div className="mt-3 space-y-1 text-xs text-slate-500">
                    <p>Active source: <span className="text-slate-300 font-medium">{selectedDeckSource}</span></p>
                    <p>Question count: <span className="text-slate-300 font-medium">{selectedDeckCount ?? '--'}</span></p>
                    {bundledDecksError && <p className="text-amber-300">{bundledDecksError}</p>}
                    {dropNotice && <p className="text-emerald-300">{dropNotice}</p>}
                    <button
                      onClick={loadBundledDecks}
                      disabled={isLoadingBundledDecks}
                      className="mt-1.5 rounded-xl border border-slate-700/50 bg-[#1C2128] px-4 py-2 text-[11px] font-bold text-slate-200 transition hover:bg-[#22272E] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isLoadingBundledDecks ? 'Refreshing decks...' : 'Refresh Bundled Decks'}
                    </button>
                  </div>
                </div>

                {/* Cloud Decks */}
                <div className="border-t border-slate-800/60 pt-4">
                  <p className="section-header">Explore Cloud Decks</p>
                  {!hasFetchedCloudCatalog && isOnline && (
                    <button
                      onClick={handleLoadMoreCloudDecks}
                      disabled={cloudStatus === 'loading'}
                      className="mt-3 w-full rounded-xl border border-sky-400/30 bg-sky-400/8 px-4 py-3 text-xs font-bold text-sky-200 transition hover:bg-sky-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="inline-flex items-center gap-2">
                        {cloudStatus === 'loading' && <span className="h-3 w-3 animate-spin rounded-full border-2 border-sky-200/40 border-t-sky-100" />}
                        {cloudStatus === 'loading' ? 'Loading Cloud Decks...' : '☁️ Load More from Cloud'}
                      </span>
                    </button>
                  )}
                  {!isOnline && (
                    <button
                      disabled
                      className="mt-3 w-full cursor-not-allowed rounded-xl border border-slate-700/40 bg-[#1C2128]/60 px-4 py-3 text-xs font-bold text-slate-400"
                    >
                      ☁️ Cloud Decks (No Internet Connection)
                    </button>
                  )}
                  {cloudStatus === 'loading' && <p className="mt-2 text-xs text-slate-500">Loading cloud catalog...</p>}
                  {cloudStatus === 'offline' && <p className="mt-2 text-xs text-amber-300">Offline mode: cloud decks unavailable.</p>}
                  {cloudStatus === 'error' && <p className="mt-2 text-xs text-rose-300">{cloudError}</p>}
                  {cloudStatus === 'ready' && cloudDecks.length === 0 && <p className="mt-2 text-xs text-slate-500">No cloud decks available.</p>}

                  {cloudStatus === 'ready' && cloudDecks.length > 0 && (
                    <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                      {cloudDecks.map((deck) => (
                        <div key={deck.id} className="rounded-xl border border-slate-700/40 bg-[#0D1117] p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-bold text-slate-200">{deck.title}</p>
                            {typeof deck.questionCount === 'number' && (
                              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                {deck.questionCount}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{deck.description || 'Official cloud deck'}</p>
                          <button
                            onClick={() => handleDownloadCloudDeck(deck)}
                            disabled={downloadingCloudDeckId === deck.id}
                            className="mt-2 w-full rounded-xl border border-amber-400/30 bg-amber-400/8 px-4 py-2.5 text-[11px] font-bold text-amber-200 transition hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {downloadingCloudDeckId === deck.id ? 'Downloading...' : 'Download'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => { window.location.href = hostToken ? `/studio?token=${encodeURIComponent(hostToken)}` : '/studio'; }}
                    className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/8 px-4 py-2.5 text-[11px] font-bold text-amber-200 transition hover:bg-amber-400/15"
                  >
                    Open Studio (Build + Cloud)
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ── Players Section ── */}
          <section className="panel-elevated p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="section-header">Players</span>
              <div className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2.5 py-1 text-xs font-black text-white tabular-nums shadow-md shadow-violet-500/20">{players.length}</div>
            </div>

            {players.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700/60 bg-[#0D1117]/60 px-4 py-12 text-center">
                <p className="text-base font-bold text-slate-400 font-outfit">No players yet</p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className="status-dot" />
                  <span className="status-dot" />
                  <span className="status-dot" />
                </div>
                <p className="mt-4 text-sm text-violet-300 animate-pulse-glow font-outfit font-semibold">Waiting for joins…</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {players.map((p, i) => (
                  <div key={p.id} className="group relative animate-player-enter" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className={`rounded-2xl border bg-[#0D1117]/80 p-3.5 text-center transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-lg ${recentlyUpdatedPlayerIds.has(p.id)
                        ? 'border-violet-400 ring-2 ring-violet-500/30 shadow-[0_0_28px_rgba(139,92,246,0.2)] animate-pulse'
                        : 'border-slate-700/50 hover:border-violet-500/40 hover:shadow-violet-500/10'
                      }`}>
                      {renderLobbyAvatar(p)}
                      <p className={`truncate text-sm font-bold font-outfit ${recentlyUpdatedPlayerIds.has(p.id) ? 'text-violet-200' : 'text-slate-200'}`}>{p.name}</p>
                      <p className="mt-1 text-xs text-slate-500">#{i + 1}</p>
                      <div className="mt-3 flex items-center justify-center gap-2">
                        {mutedSet.has(p.id) ? (
                          <button onClick={() => handleUnmute(p.id)} className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3.5 py-1.5 text-[11px] font-bold text-emerald-200 transition hover:bg-emerald-500/25">
                            Unmute
                          </button>
                        ) : (
                          <button onClick={() => handleMute(p.id)} className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-[11px] font-bold text-amber-200 transition hover:bg-amber-500/20">
                            Mute
                          </button>
                        )}
                        <button onClick={() => handleKick(p.id)} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-1.5 text-[11px] font-bold text-rose-200 transition hover:bg-rose-500/20">
                          Kick
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Footer: Start Game + Answer Mode ── */}
          <footer className="panel-elevated p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <button
                  onClick={handleStart}
                  disabled={!startReady || isStartingGame}
                  className={`rounded-2xl px-10 py-5 text-lg font-black transition-all duration-200 font-outfit ${!startReady
                      ? 'cursor-not-allowed bg-slate-700/60 text-slate-500'
                      : isStartConfirmArmed
                        ? 'bg-amber-300 text-black shadow-[0_0_30px_rgba(252,211,77,0.35)] hover:-translate-y-0.5 hover:bg-amber-200 active:translate-y-0 active:scale-95'
                        : 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 text-white shadow-[0_0_30px_rgba(139,92,246,0.35)] hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] active:translate-y-0 active:scale-95 animate-shimmer'
                    }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    {isStartingGame && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                    {startButtonLabel}
                  </span>
                </button>
                <p className={`mt-2.5 text-xs font-semibold font-outfit ${startReady ? 'text-violet-300' : 'text-amber-300'}`}>{startStatusText}</p>
              </div>
              <div>
                <p className="section-header mb-2.5">Answer Mode</p>
                <div className="grid grid-cols-2 gap-2">
                  {answerModeOptions.map((mode) => (
                    <button
                      key={mode}
                      onClick={() => syncAnswerMode(mode)}
                      className={`rounded-xl px-4 py-2.5 text-[11px] font-black tracking-wide transition-all duration-150 ${answerMode === mode
                          ? 'bg-emerald-400 text-black shadow-md shadow-emerald-500/20'
                          : 'bg-[#0D1117] text-slate-400 hover:bg-[#1C2128] hover:text-white'
                        }`}
                    >
                      {answerModeLabels[mode] || mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </footer>
        </div>

        {/* ── Sidebar: Chat Control + Chat Monitor ── */}
        <aside className="flex flex-col gap-5">
          <section className="panel-elevated p-5">
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="section-header">Chat Control</p>
                <p className="mt-1 text-xs text-slate-400">Switch player chat instantly.</p>
              </div>
              <span className="text-[11px] font-bold tracking-wide text-emerald-300 font-outfit">LIVE</span>
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
            {chatMode === 'RESTRICTED' && (
              <details className="mt-4 rounded-2xl border border-slate-800/60 bg-[#0D1117]/60 p-3.5" open>
                <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-slate-400 font-outfit">More Options</summary>
                <div className="mt-3">
                  <p className="mb-2 text-xs text-slate-500">Restricted presets</p>
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
              </details>
            )}
          </section>

          <section className="min-h-72 panel-elevated p-5">
            <Chat
              socket={socket}
              roomPin={roomId}
              readOnly
              title="Chat Monitor"
              allowHostActions
              onHostMute={handleMute}
              mutedSet={mutedSet}
            />
          </section>
        </aside>
      </div>

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
    </div>
  );
}
