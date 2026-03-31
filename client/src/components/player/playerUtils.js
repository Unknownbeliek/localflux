import { getBackendUrl } from '../../backendUrl'

export const LAN_ROOM = 'local_flux_main'
export const PLAYER_SESSION_KEY = 'lf_player_session_id'
export const PLAYER_STATE_KEY = 'lf_player_state'
export const START_SPLASH_MIN_MS = 0
export const END_SPLASH_MIN_MS = 1400
export const MAX_CHAT_HISTORY = 300

export const PRESET_AVATARS = [
  'avatar01.jpg',
  'avatar02.jpg',
  'avatar03.jpg',
  'avatar04.jpg',
  'avatar05.jpg',
  'avatar06.jpg',
  'avatar07.jpg',
  'avatar08.jpg',
  'avatar09.jpg',
  'avatar10.jpg',
  'avatar11.jpg',
  'avatar12.jpg',
  'avatar13.avf',
  'avatar14.jpg',
]

function messageKey(message = {}) {
  return `${message.id || ''}|${message.ts || ''}|${message.from || ''}|${message.name || ''}|${message.text || ''}|${message.event || ''}|${message.cannedId || ''}|${message.isCorrectGuess ? '1' : '0'}`
}

export function mergeChatHistory(existing, incoming) {
  const base = Array.isArray(existing) ? existing : []
  const extra = Array.isArray(incoming) ? incoming : []
  if (extra.length === 0) return base.slice(-MAX_CHAT_HISTORY)

  const merged = [...base]
  const seen = new Set(base.map((item) => messageKey(item)))

  extra.forEach((item) => {
    const key = messageKey(item)
    if (seen.has(key)) return
    seen.add(key)
    merged.push(item)
  })

  return merged.slice(-MAX_CHAT_HISTORY)
}

export function resolveImageUrl(image) {
  if (!image) return null
  const trimmed = String(image).trim()
  if (!trimmed) return null
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  if (trimmed.startsWith('/uploads/')) return `${getBackendUrl()}${trimmed}`
  if (trimmed.includes('/')) return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `/deck-images/${trimmed}`
}

export function getOrCreatePlayerSessionId() {
  if (typeof window === 'undefined') return ''
  try {
    const fromStateRaw = window.localStorage.getItem(PLAYER_STATE_KEY)
    if (fromStateRaw) {
      const parsed = JSON.parse(fromStateRaw)
      const stateSession = String(parsed?.playerSessionId || '').trim()
      if (stateSession) {
        window.sessionStorage.setItem(PLAYER_SESSION_KEY, stateSession)
        return stateSession
      }
    }
  } catch {
    // ignore state parsing errors and continue with fallback key path
  }

  const existing = window.sessionStorage.getItem(PLAYER_SESSION_KEY)
  if (existing) return existing
  const next =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `ps_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  window.sessionStorage.setItem(PLAYER_SESSION_KEY, next)
  return next
}

export function readPlayerState() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(PLAYER_STATE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function persistPlayerState(next) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(next))
}

export function clearPlayerState() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(PLAYER_STATE_KEY)
  window.sessionStorage.removeItem(PLAYER_STATE_KEY)
}

export function displayRoomName(name) {
  const normalized = String(name || '').trim()
  if (!normalized || normalized.toLowerCase() === LAN_ROOM) {
    return 'LocalFlux Room'
  }
  return normalized
}

export function formatJoinFailure(res) {
  const reason = String(res?.reason || '').toLowerCase()
  if (reason === 'room_full') {
    const current = Number(res?.currentPlayers)
    const effective = Number(res?.effectiveMaxPlayers)
    if (Number.isFinite(current) && Number.isFinite(effective)) {
      return `Room is full (${current}/${effective}). Ask host to increase lobby size.`
    }
    return 'Room is full. Ask host to increase lobby size.'
  }

  return res?.error || 'Could not join game.'
}

export function isRoomUnavailableError(message) {
  const text = String(message || '').toLowerCase()
  return (
    text.includes('room is not created yet') ||
    text.includes('room has ended') ||
    text.includes('wait for the host to create a room') ||
    text.includes('wait for the host to create a new room') ||
    text.includes('room closed because the host disconnected')
  )
}
