"use client";

const KEY = "chat-hanif:theme";

export function getTheme() {
  if (typeof window === "undefined") return "dark";
  try {
    return localStorage.getItem(KEY) || "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(pref) {
  if (pref === "light" || pref === "dark") return pref;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(pref) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(pref);
  const root = document.documentElement;
  if (resolved === "light") {
    root.classList.add("theme-light");
    root.classList.remove("theme-dark");
  } else {
    root.classList.add("theme-dark");
    root.classList.remove("theme-light");
  }
  root.dataset.theme = resolved;
}

export function setTheme(pref) {
  if (typeof window === "undefined") return;
  try {
    if (pref === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {}
  applyTheme(pref);
}

export function watchSystemTheme(cb) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  const handler = () => cb();
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
