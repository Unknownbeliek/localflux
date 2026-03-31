const DEFAULT_AVATAR_OBJECT = { type: 'preset', value: '1.jpg' }

export function normalizeAvatarObject(input) {
  if (!input || typeof input !== 'object') return { ...DEFAULT_AVATAR_OBJECT }
  const value = String(input.value || '').trim()
  if (input.type !== 'preset' || !value) return { ...DEFAULT_AVATAR_OBJECT }
  return { type: 'preset', value }
}

export function resolvePresetPath(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return '/avatars/1.png'
  return trimmed.includes('.') ? `/avatars/${trimmed}` : `/avatars/${trimmed}.png`
}
