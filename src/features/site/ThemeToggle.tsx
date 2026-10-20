"use client";
/** 🌙 / ☀️ button in the header: switches the whole site between light and dark (remembered in this browser). */
import { useEffect, useState } from "react";

export const THEME_KEY = "learn-app:theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.dataset.theme === "dark"), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // storage blocked: the choice lasts until the page is closed
    }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "Chuyển sang nền sáng" : "Chuyển sang nền tối"}
      title={dark ? "Nền sáng" : "Nền tối"}
      className="grid size-10 shrink-0 place-items-center rounded-md text-lg hover:bg-stone-100"
    >
      <span aria-hidden>{dark ? "☀️" : "🌙"}</span>
    </button>
  );
}
