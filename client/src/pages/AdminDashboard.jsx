import { useNavigate } from 'react-router-dom'
import { BookOpen, Gamepad2, Loader } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useHostToken } from '../context/HostTokenProvider'
import { createGameSocket } from '../backendUrl'
import { deckStudioDB } from '../deckStudio/db'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { setHostToken } = useHostToken()
  const [isGeneratingToken, setIsGeneratingToken] = useState(false)
  const [tokenError, setTokenError] = useState('')
  const [localDecks, setLocalDecks] = useState([])
  const [cloudDecks, setCloudDecks] = useState([])
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const [isLoadingCloud, setIsLoadingCloud] = useState(false)

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white flex flex-col items-center justify-center p-6 select-none">
      {/* Background blur effects */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(16,185,129,0.20),rgba(2,6,23,0)_70%)]" />
      <div className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-12 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />

      {/* Main container */}
      <div className="z-10 w-full max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.5em] text-emerald-400">Local Multiplayer Quiz</p>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight">LocalFlux</h1>
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
