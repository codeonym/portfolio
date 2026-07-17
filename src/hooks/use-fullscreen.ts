"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  document.addEventListener("fullscreenchange", callback);
  return () => document.removeEventListener("fullscreenchange", callback);
}

function getSnapshot(): boolean {
  return document.fullscreenElement !== null;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Immersion mode — the System takes the whole display. Requests are
 * fire-and-forget: browsers may deny them outside a user gesture, and
 * fullscreen is decoration, never load-bearing.
 */
export function enterFullscreen() {
  if (typeof document === "undefined" || document.fullscreenElement) return;
  document.documentElement.requestFullscreen().catch(() => {});
}

export function exitFullscreen() {
  if (typeof document === "undefined" || !document.fullscreenElement) return;
  document.exitFullscreen().catch(() => {});
}

export function toggleFullscreen() {
  if (typeof document === "undefined") return;
  if (document.fullscreenElement) exitFullscreen();
  else enterFullscreen();
}

export function useFullscreen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
