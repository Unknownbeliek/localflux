import { useNavigate } from 'react-router-dom'
import { BookOpen, Gamepad2, Loader } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useHostToken } from '../context/HostTokenProvider'
import { createGameSocket } from '../backendUrl'
import { deckStudioDB } from '../deckStudio/db'
import { fetchCloudDecks, downloadDeckToLocal } from '../deckStudio/cloudCatalog'
import AnimatedBackground from '../components/AnimatedBackground'

const LIBRARY_GRADIENTS = [
  'from-emerald-400 to-blue-500',
  'from-amber-400 to-orange-500',
  'from-cyan-400 to-teal-500',
  'from-rose-400 to-fuchsia-500',
  'from-lime-400 to-emerald-500',
]


function DeckCard({ deck, index, buttonLabel, onAction }) {
  const gradient = LIBRARY_GRADIENTS[index % LIBRARY_GRADIENTS.length]
  const questionCount = typeof deck?.questionCount === 'number' ? deck.questionCount : Array.isArray(deck?.slides) ? deck.slides.length : 0

  return (
    <article className="group snap-start min-w-[260px] max-w-[260px] rounded-2xl border border-slate-700 bg-slate-900/70 p-3 transition-all duration-200 hover:-translate-y-1 hover:border-slate-500 hover:shadow-xl hover:shadow-black/35">
      <div className={`h-28 rounded-xl bg-gradient-to-br ${gradient} p-3`}> 
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">Deck</p>
        <p className="mt-3 line-clamp-2 text-lg font-black tracking-tight text-white">{deck?.title || 'Untitled Deck'}</p>
      </div>
      <div className="mt-3">
        <p className="truncate text-sm font-semibold text-slate-100">{deck?.title || 'Untitled Deck'}</p>
        <p className="mt-1 text-xs text-slate-400">{questionCount} questions</p>
      </div>
      <button
        onClick={onAction}
        className="mt-3 w-full rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
      >
        {buttonLabel}
      </button>
    </article>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { setHostToken } = useHostToken()
  const [isGeneratingToken, setIsGeneratingToken] = useState(false)
  const [tokenError, setTokenError] = useState('')
  const [localDecks, setLocalDecks] = useState([])
  const [cloudDecks, setCloudDecks] = useState([])
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const [isLoadingCloud, setIsLoadingCloud] = useState(false)
  const [cloudError, setCloudError] = useState('')
  const [hasFetchedCloud, setHasFetchedCloud] = useState(false)
  const [downloadingCloudDeckId, setDownloadingCloudDeckId] = useState('')

  useEffect(() => {
    let active = true

    deckStudioDB.drafts
      .orderBy('updatedAt')
      .reverse()
      .toArray()
      .then((drafts) => {
        if (!active) return
        setLocalDecks(Array.isArray(drafts) ? drafts : [])
      })
      .catch((err) => {
        console.error('[AdminDashboard] Failed to load local decks:', err)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const requestHostToken = async () => {
    const socket = createGameSocket()

    if (!socket.connected) {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.disconnect()
          reject(new Error('Connection timeout'))
        }, 5000)

        socket.on('connect', () => {
          clearTimeout(timeout)
          resolve()
        })
      })
    }

    const tokenRes = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Token generation timeout'))
      }, 5000)

      socket.emit('admin:generate-host-token', {}, (res) => {
        clearTimeout(timeout)
        socket.disconnect()

        if (res?.success && res?.token) {
          resolve(res)
        } else {
          reject(new Error(res?.error || 'Failed to generate token'))
        }
      })
    })

    return tokenRes
  }

  /**
   * Handle "Launch Game Screen" click.
   * Generates a host token and navigates to /host with token in URL.
   */
  const handleLaunchGame = async () => {
    setIsGeneratingToken(true)
    setTokenError('')

    try {
      const tokenRes = await requestHostToken()

      // Store token in context and navigate to /host with token in URL
      setHostToken(tokenRes.token, tokenRes.ttlMs)
      navigate(`/host?token=${encodeURIComponent(tokenRes.token)}`)
    } catch (err) {
      console.error('[AdminDashboard] Token generation error:', err)
      setTokenError(err.message || 'Failed to generate token. Try again.')
      setIsGeneratingToken(false)
    }
  }

  const handleOpenStudio = async () => {
    setIsGeneratingToken(true)
    setTokenError('')

    try {
      const tokenRes = await requestHostToken()
      setHostToken(tokenRes.token, tokenRes.ttlMs)
      navigate(`/studio?token=${encodeURIComponent(tokenRes.token)}`)
    } catch (err) {
      console.error('[AdminDashboard] Studio token error:', err)
      setTokenError(err.message || 'Failed to open Deck Studio. Try again.')
      setIsGeneratingToken(false)
    }
  }

  const handleHostDeck = async (deckId) => {
    if (!deckId) return

    setIsGeneratingToken(true)
    setTokenError('')

    try {
      const tokenRes = await requestHostToken()
      setHostToken(tokenRes.token, tokenRes.ttlMs)
      navigate(`/host?token=${encodeURIComponent(tokenRes.token)}&deckId=${encodeURIComponent(deckId)}`)
    } catch (err) {
      console.error('[AdminDashboard] Host deck token error:', err)
      setTokenError(err.message || 'Failed to host selected deck. Try again.')
      setIsGeneratingToken(false)
    }
  }

  const handleLoadCloudDecks = async () => {
    if (!isOnline || isLoadingCloud) return

    setIsLoadingCloud(true)
    setCloudError('')

    try {
      const fetchedDecks = await fetchCloudDecks()
      setCloudDecks((prev) => {
        const byId = new Map(prev.map((deck) => [deck.id, deck]))
        fetchedDecks.forEach((deck) => byId.set(deck.id, deck))
        return Array.from(byId.values())
      })
      setHasFetchedCloud(true)
    } catch {
      setCloudError('Failed to reach cloud catalog.')
      setHasFetchedCloud(true)
    } finally {
      setIsLoadingCloud(false)
    }
  }

  const handleDownloadAndHost = async (cloudDeck) => {
    if (!cloudDeck?.deckUrl || !cloudDeck?.id || downloadingCloudDeckId) return

    setDownloadingCloudDeckId(cloudDeck.id)
    setIsGeneratingToken(true)
    setTokenError('')

    try {
      const savedDeck = await downloadDeckToLocal(cloudDeck.deckUrl)
      setLocalDecks((prev) => {
        const remaining = prev.filter((deck) => deck.id !== savedDeck.id)
        return [savedDeck, ...remaining]
      })

      const tokenRes = await requestHostToken()
      setHostToken(tokenRes.token, tokenRes.ttlMs)
      navigate(`/host?token=${encodeURIComponent(tokenRes.token)}&deckId=${encodeURIComponent(savedDeck.id)}`)
    } catch (err) {
      console.error('[AdminDashboard] Download and host error:', err)
      setTokenError(err.message || 'Failed to download and host cloud deck. Try again.')
      setIsGeneratingToken(false)
    } finally {
      setDownloadingCloudDeckId('')
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white flex flex-col items-center justify-center p-6 select-none">
      {/* ── Animated Background ── */}
      <div className="animated-bg">
        {/* Floating gradient orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />

        {/* Slowly rotating dot grid */}
        <div className="dot-grid" />

        {/* Shimmer particles */}
        <div className="particles">
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
          <div className="particle" />
        </div>

        {/* Soft vignette */}
        <div className="vignette" />
      </div>

      {/* Main container */}
      <div className="z-10 w-full max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.5em] text-emerald-400">Local Multiplayer Quiz</p>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight title-glow">LocalFlux</h1>
          <p className="mt-3 max-w-2xl text-slate-300 text-sm md:text-base">
            Start a room in seconds, pick a deck from your library, and run a polished couch-multiplayer quiz night.
          </p>
        </div>

        {/* Hero actions */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
          <button
            onClick={handleLaunchGame}
            disabled={isGeneratingToken}
            className={`group relative overflow-hidden rounded-3xl border p-8 md:p-10 text-left transition-all duration-200 ${
              isGeneratingToken
                ? 'cursor-not-allowed border-emerald-500/20 bg-emerald-500/10 opacity-70'
                : 'border-emerald-400/40 bg-gradient-to-br from-emerald-400/20 via-teal-400/10 to-cyan-500/10 hover:-translate-y-1 hover:border-emerald-300/70 hover:shadow-[0_18px_50px_rgba(16,185,129,0.25)] active:translate-y-0 active:scale-[0.99]'
            }`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_90%_at_0%_0%,rgba(255,255,255,0.16),transparent_70%)]" />
            <div className="relative">
              <p className="text-xs uppercase tracking-[0.22em] text-emerald-200/80">Quick Start</p>
              <h2 className="mt-2 text-3xl md:text-5xl font-black tracking-tight text-white">
                {isGeneratingToken ? 'Generating Token...' : 'Quick Host (Empty Room)'}
              </h2>
              <p className="mt-3 text-sm md:text-base text-emerald-100/80">Create a live room instantly and let players join from /play.</p>
              <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-black/20 bg-black/20 px-4 py-2 text-sm font-semibold text-emerald-100">
                {isGeneratingToken ? <Loader className="h-5 w-5 animate-spin" strokeWidth={2} /> : <Gamepad2 className="h-5 w-5" strokeWidth={2} />}
                <span>{isGeneratingToken ? 'Preparing Host Session' : 'Launch Game Screen'}</span>
              </div>
            </div>
          </button>

          <button
            onClick={handleOpenStudio}
            disabled={isGeneratingToken}
            className="group rounded-3xl border border-slate-600 bg-slate-900/60 p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:border-amber-300/70 hover:bg-slate-900 active:translate-y-0 active:scale-[0.99]"
          >
            <div className="mb-4 inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 p-2.5 text-amber-300">
              <BookOpen className="h-5 w-5" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-black tracking-tight text-amber-100">Open Deck Studio</h3>
            <p className="mt-2 text-sm text-slate-300">Create, edit, and tune decks before going live.</p>
          </button>
        </div>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight text-white">Your Library</h2>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{localDecks.length} decks</p>
          </div>

          {localDecks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-400">
              No local decks yet. Open Deck Studio to create one.
            </div>
          ) : (
            <div className="flex snap-x overflow-x-auto gap-4 pb-4">
              {localDecks.map((deck, index) => (
                <DeckCard
                  key={deck.id || `${deck.title}_${index}`}
                  deck={deck}
                  index={index}
                  buttonLabel="Host This"
                  onAction={() => handleHostDeck(deck.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight text-white">Discover (Cloud)</h2>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Progressive loading</p>
          </div>

          {!hasFetchedCloud && isOnline && (
            <button
              onClick={handleLoadCloudDecks}
              disabled={isLoadingCloud}
              className="mb-4 inline-flex items-center gap-2 rounded-xl border border-sky-400/40 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingCloud && <Loader className="h-4 w-4 animate-spin" strokeWidth={2} />}
              {isLoadingCloud ? 'Loading Cloud Decks...' : '☁️ Load More from Cloud'}
            </button>
          )}

          {!isOnline && (
            <div className="mb-4 rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-slate-400">
              Offline: cloud catalog is unavailable.
            </div>
          )}

          {cloudError && (
            <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
              {cloudError}
            </div>
          )}

          {hasFetchedCloud && cloudDecks.length === 0 && !cloudError && (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-400">
              No cloud decks are available right now.
            </div>
          )}

          {cloudDecks.length > 0 && (
            <div className="flex snap-x overflow-x-auto gap-4 pb-4">
              {cloudDecks.map((deck, index) => (
                <DeckCard
                  key={deck.id || `${deck.title}_${index}`}
                  deck={deck}
                  index={index}
                  buttonLabel={downloadingCloudDeckId === deck.id ? 'Downloading...' : 'Download & Host'}
                  onAction={() => handleDownloadAndHost(deck)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Error message */}
        {tokenError && (
          <div className="mt-6 rounded-lg border border-rose-400/50 bg-rose-950/30 p-4 backdrop-blur-sm">
            <p className="text-center text-sm text-rose-200">{tokenError}</p>
          </div>
        )}

        {/* Optional: Info section */}
        <div className="mt-12 rounded-2xl border border-slate-700/50 bg-slate-900/30 p-6 backdrop-blur-sm">
          <p className="text-center text-sm text-slate-400">
            Players can join via <span className="font-semibold text-slate-300">/play</span> once a game is hosting.
          </p>
        </div>
      </div>
    </div>
  )
}
