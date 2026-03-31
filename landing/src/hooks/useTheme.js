import { useCallback, useEffect, useState } from "react";

const THEME_STORAGE_KEY = "theme";
const DARK_THEME = "dark";
const LIGHT_THEME = "light";

function isTheme(value) {
  return value === DARK_THEME || value === LIGHT_THEME;
}

export function getInitialTheme() {
  if (typeof window === "undefined") {
    return DARK_THEME;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isTheme(storedTheme) ? storedTheme : DARK_THEME;
}

export function applyTheme(theme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle("dark", theme === DARK_THEME);
}

export function initializeTheme() {
  const theme = getInitialTheme();
  applyTheme(theme);
  return theme;
}

export function useTheme() {
  const [theme, setTheme] = useState(() => getInitialTheme());

  useEffect(() => {
    const syncTheme = (nextTheme) => {
      if (isTheme(nextTheme)) {
        setTheme(nextTheme);
      }
    };

    const handleStorage = (event) => {
      if (event.key === THEME_STORAGE_KEY) {
        syncTheme(event.newValue);
      }
    };

    const handleThemeChange = (event) => {
      syncTheme(event.detail);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("localflux-theme-change", handleThemeChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("localflux-theme-change", handleThemeChange);
    };
  }, []);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.dispatchEvent(
      new CustomEvent("localflux-theme-change", {
        detail: theme,
      })
    );
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) =>
      currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME
    );
  }, []);

  return {
    theme,
    isDark: theme === DARK_THEME,
    toggleTheme,
  };
}
