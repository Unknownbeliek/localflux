const HAPTIC_PATTERNS = {
  light: 10,
  medium: 18,
  success: [18, 30, 22],
};

const INTERACTIVE_SELECTOR = [
  'button',
  '[role="button"]',
  'a[href]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'label[for]',
].join(',');

const HAPTICS_CLEANUP_KEY = '__localflux_haptics_cleanup__';

function isDisabledElement(element) {
  if (!element) return false;
  if (element.hasAttribute('disabled')) return true;
  return element.getAttribute('aria-disabled') === 'true';
}

function resolvePattern(pattern) {
  if (typeof pattern === 'number') return pattern;
  if (Array.isArray(pattern)) return pattern;
  return HAPTIC_PATTERNS[pattern] || HAPTIC_PATTERNS.light;
}

export function triggerHaptic(pattern = 'light') {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return false;
  }

  try {
    return navigator.vibrate(resolvePattern(pattern));
  } catch {
    return false;
  }
}

export function initGlobalHaptics() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return () => {};
  if (navigator.maxTouchPoints <= 0) return () => {};

  const existingCleanup = window[HAPTICS_CLEANUP_KEY];
  if (typeof existingCleanup === 'function') return existingCleanup;

  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse') return;

    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const interactive = target.closest(INTERACTIVE_SELECTOR);
    if (!interactive || isDisabledElement(interactive)) return;

    const hapticTarget = target.closest('[data-haptic]');
    const pattern = String(hapticTarget?.getAttribute('data-haptic') || 'light').trim().toLowerCase();
    if (pattern === 'off' || pattern === 'none') return;

    triggerHaptic(pattern || 'light');
  };

  document.addEventListener('pointerdown', handlePointerDown, true);

  const cleanup = () => {
    document.removeEventListener('pointerdown', handlePointerDown, true);
    if (window[HAPTICS_CLEANUP_KEY] === cleanup) {
      delete window[HAPTICS_CLEANUP_KEY];
    }
  };

  window[HAPTICS_CLEANUP_KEY] = cleanup;
  return cleanup;
}
