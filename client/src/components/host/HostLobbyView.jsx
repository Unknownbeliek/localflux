import Chat from '../Chat';
import PingIndicator from '../PingIndicator';
import { QRCodeSVG } from 'qrcode.react';

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
      <div className="relative mx-auto mb-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-600 bg-linear-to-br from-slate-900 to-slate-700 p-1">
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
        <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-emerald-200 opacity-0 transition-opacity duration-200">
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
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white p-4 md:p-6 animate-phase-in">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(16,185,129,0.15),rgba(2,6,23,0)_70%)]" />
      <div className="relative z-10 -mx-4 mb-4 border-y border-slate-800 bg-slate-900/70 px-4 py-4 md:-mx-6 md:px-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">Back</button>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-emerald-500" />
              <div className="text-xl font-black tracking-tight text-emerald-400">LocalFlux</div>
            </div>
            <div className="ml-4 text-xs uppercase tracking-[0.2em] text-slate-500">Host Dashboard</div>
          </div>
          <div className="flex items-center gap-2">
            <PingIndicator socket={hostSocket} />
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-300">Session Active</span>
            </div>
          </div>
        </header>
      </div>
      <div className="relative z-10 mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <div className="flex flex-col gap-4">
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="mb-4 text-[11px] uppercase tracking-[0.26em] text-slate-500">Join Link</div>
              <div className="mb-5 rounded-2xl border border-slate-700 bg-slate-950/80 p-4">
                <p className="mb-3 text-xs text-slate-500">Scan to Join</p>
                <div className="mx-auto flex w-full max-w-xs items-center justify-center rounded-2xl bg-white p-3 shadow-lg shadow-black/30">
                  <QRCodeSVG value={joinUrl} size={256} level="H" includeMargin className="h-56 w-56 md:h-64 md:w-64" />
                </div>
              </div>

              <p className="mb-5 text-center text-xs uppercase tracking-[0.22em] text-slate-500">
                Players join directly from the link or QR
              </p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button onClick={copyLink} className="w-full rounded-xl bg-emerald-400 px-3 py-3 text-sm font-black text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-emerald-300 active:translate-y-0 active:scale-95">
                  {copied ? 'Copied!' : 'Copy Join Link'}
                </button>
                <button
                  onClick={() => setIsQrFullscreenOpen(true)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm font-black text-slate-100 transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-400/50 hover:bg-slate-800 active:translate-y-0 active:scale-95"
                >
                  Fullscreen QR
                </button>
              </div>
            </div>

            <div
              className={`relative rounded-3xl border bg-slate-900/70 p-5 transition-all ${
                isDragging
                  ? 'border-emerald-400/70 ring-4 ring-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.25)]'
                  : 'border-slate-800'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleFileDrop}
            >
              {isDragging && (
                <div className="pointer-events-none absolute inset-2 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300/90 bg-emerald-500/10 px-4 text-center">
                  <p className="text-sm font-black tracking-wide text-emerald-200">Drop .json, .flux, or .csv to load instantly</p>
                </div>
              )}
              <div className="mb-4 text-[11px] uppercase tracking-[0.26em] text-slate-500">Choose Deck</div>
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
                <div className="text-sm font-semibold text-emerald-300">{deckLabel}</div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      value={studioDeckQuery}
                      onChange={(e) => setStudioDeckQuery(e.target.value)}
                      placeholder="Search studio drafts"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        setShowDraftManager(true);
                        setManageNotice('');
                      }}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-slate-800"
                    >
                      Manage
                    </button>
                  </div>
                  <label className="mb-2 block text-xs text-slate-500">Select Deck</label>
                  <select
                    value={selectedDeckKey}
                    onChange={handleDeckSelection}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-emerald-300 focus:border-emerald-500 focus:outline-none"
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
                    <p>Active source: <span className="text-slate-300">{selectedDeckSource}</span></p>
                    <p>Question count: <span className="text-slate-300">{selectedDeckCount ?? '--'}</span></p>
                    {bundledDecksError && <p className="text-amber-300">Bundled deck load failed: {bundledDecksError}</p>}
                    {dropNotice && <p className="text-emerald-300">{dropNotice}</p>}
                    <button
                      onClick={loadBundledDecks}
                      disabled={isLoadingBundledDecks}
                      className="mt-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isLoadingBundledDecks ? 'Refreshing decks...' : 'Refresh Bundled Decks'}
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Explore Cloud Decks</p>
                  {!hasFetchedCloudCatalog && isOnline && (
                    <button
                      onClick={handleLoadMoreCloudDecks}
                      disabled={cloudStatus === 'loading'}
                      className="mt-2 w-full rounded-lg border border-sky-400/40 bg-sky-400/10 px-2 py-2 text-xs font-semibold text-sky-200 transition hover:bg-sky-400/20 disabled:cursor-not-allowed disabled:opacity-60"
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
                      className="mt-2 w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-2 text-xs font-semibold text-slate-400"
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
                        <div key={deck.id} className="rounded-xl border border-slate-700 bg-slate-950 p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-semibold text-slate-200">{deck.title}</p>
                            {typeof deck.questionCount === 'number' && (
                              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                                {deck.questionCount}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{deck.description || 'Official cloud deck'}</p>
                          <button
                            onClick={() => handleDownloadCloudDeck(deck)}
                            disabled={downloadingCloudDeckId === deck.id}
                            className="mt-2 w-full rounded-lg border border-amber-400/40 bg-amber-400/10 px-2 py-1.5 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {downloadingCloudDeckId === deck.id ? 'Downloading...' : 'Download'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => { window.location.href = hostToken ? `/studio?token=${encodeURIComponent(hostToken)}` : '/studio'; }}
                    className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-400/20"
                  >
                    Open Studio (Build + Cloud)
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Players</span>
              <div className="rounded-full bg-emerald-400 px-2 py-1 text-xs font-black text-black tabular-nums">{players.length}</div>
            </div>

            {players.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 px-4 py-10 text-center">
                <p className="text-sm text-slate-400">No players yet</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="status-dot" />
                  <span className="status-dot" />
                  <span className="status-dot" />
                </div>
                <p className="mt-3 text-xs text-slate-500">Waiting for joins...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {players.map((p, i) => (
                  <div key={p.id} className="group relative animate-slide-in" style={{ animationDelay: `${i * 40}ms` }}>
                    <div className={`rounded-2xl border bg-slate-950/80 p-3 text-center transition-all duration-500 ease-out hover:-translate-y-0.5 ${
                      recentlyUpdatedPlayerIds.has(p.id)
                        ? 'border-emerald-400 ring-4 ring-emerald-500/30 shadow-[0_0_28px_rgba(16,185,129,0.25)] animate-pulse'
                        : 'border-slate-700 hover:border-emerald-500/50'
                    }`}>
                      {renderLobbyAvatar(p)}
                      <p className={`truncate text-sm font-semibold ${recentlyUpdatedPlayerIds.has(p.id) ? 'text-emerald-200' : 'text-slate-200'}`}>{p.name}</p>
                      <p className="mt-1 text-xs text-slate-500">#{i + 1}</p>
                      <div className="mt-3 flex items-center justify-center gap-2">
                        {mutedSet.has(p.id) ? (
                          <button onClick={() => handleUnmute(p.id)} className="rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 transition hover:bg-emerald-500/30">
                            Unmute
                          </button>
                        ) : (
                          <button onClick={() => handleMute(p.id)} className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-500/25">
                            Mute
                          </button>
                        )}
                        <button onClick={() => handleKick(p.id)} className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-200 transition hover:bg-rose-500/25">
                          Kick
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <footer className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <button
                  onClick={handleStart}
                  disabled={!startReady || isStartingGame}
                  className={`rounded-2xl px-8 py-4 text-lg font-black transition-all duration-150 ${
                    !startReady
                      ? 'cursor-not-allowed bg-slate-700 text-slate-500'
                      : isStartConfirmArmed
                        ? 'bg-amber-300 text-black shadow-[0_0_22px_rgba(252,211,77,0.35)] hover:-translate-y-0.5 hover:bg-amber-200 active:translate-y-0 active:scale-95'
                        : 'bg-emerald-400 text-black shadow-[0_0_18px_rgba(16,185,129,0.28)] hover:-translate-y-0.5 hover:bg-emerald-300 active:translate-y-0 active:scale-95'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {isStartingGame && <span className="h-3 w-3 animate-spin rounded-full border-2 border-black/40 border-t-black" />}
                    {startButtonLabel}
                  </span>
                </button>
                <p className={`mt-2 text-xs ${startReady ? 'text-emerald-300' : 'text-amber-300'}`}>{startStatusText}</p>
              </div>
              <p className="text-sm text-slate-400">Room ready. Once started, players enter timed questions instantly.</p>
            </div>
          </footer>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Chat Control</p>
                <p className="mt-1 text-xs text-slate-400">Switch player chat instantly.</p>
              </div>
              <span className="text-[11px] font-semibold tracking-[0.2em] text-emerald-300">LIVE</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {modeOptions.map((mode) => (
                <button
                  key={mode}
                  onClick={() => syncChatMode(mode)}
                  className={`rounded-xl px-3 py-2 text-[11px] font-black tracking-[0.2em] transition-all duration-150 ${
                    chatMode === mode
                      ? 'bg-emerald-400 text-black'
                      : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {modeLabels[mode]}
                </button>
              ))}
            </div>
            {chatMode === 'RESTRICTED' && (
              <details className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3" open>
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">More Options</summary>
                <div className="mt-3">
                <p className="mb-2 text-xs text-slate-500">Restricted presets</p>
                <div className="mb-2 flex gap-2">
                  <input
                    value={newAllowedText}
                    onChange={(e) => setNewAllowedText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addAllowedMessage()}
                    placeholder="Add preset"
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                  <button onClick={addAllowedMessage} className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-black text-black transition hover:bg-emerald-300">Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allowedList.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200">
                      <span>{entry.text}</span>
                      <button onClick={() => removeAllowedMessage(entry.id)} className="text-slate-500 transition hover:text-red-400">Remove</button>
                    </div>
                  ))}
                </div>
                </div>
              </details>
            )}
          </section>

          <section className="min-h-72 rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
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

      {isQrFullscreenOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <button
            aria-label="Close fullscreen QR"
            onClick={() => setIsQrFullscreenOpen(false)}
            className="absolute inset-0"
          />
          <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl shadow-black/70">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Join QR Fullscreen</p>
              <button
                onClick={() => setIsQrFullscreenOpen(false)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            <div className="mx-auto flex w-full max-w-xl items-center justify-center rounded-2xl bg-white p-4">
              <QRCodeSVG value={joinUrl} size={440} level="H" includeMargin className="h-auto w-full max-w-110" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
