"use client";

import { useEffect, useRef, useState } from "react";
import { zones } from "@/config/world.config";
import { play } from "@/lib/audio";
import { live, useWorldStore } from "@/store/world-store";

const KEYS = {
  up: ["KeyW", "ArrowUp", "KeyZ"],
  down: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft", "KeyQ"],
  right: ["KeyD", "ArrowRight"],
};

function typing(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  return !!el?.closest("input, textarea, [contenteditable=true]");
}

/**
 * Keyboard → `live.input` (movement never touches React state) plus
 * the command keys: E interact · T speak with THE SYSTEM · M map · Esc
 * back · 1–6 walk to a zone.
 */
export function KeyboardInput() {
  useEffect(() => {
    const held = new Set<string>();
    const sync = () => {
      const has = (list: string[]) => list.some((k) => held.has(k));
      live.input.x = (has(KEYS.right) ? 1 : 0) - (has(KEYS.left) ? 1 : 0);
      live.input.z = (has(KEYS.up) ? 1 : 0) - (has(KEYS.down) ? 1 : 0);
      live.input.run = held.has("ShiftLeft") || held.has("ShiftRight");
    };
    const onDown = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useWorldStore.getState();
      if (s.phase !== "world") return;
      held.add(e.code);
      sync();
      if (e.repeat) return;
      if (e.code === "Escape") {
        if (s.cvOpen) return s.setCvOpen(false);
        if (s.inspect) return s.setInspect(null);
        if (s.mapOpen) return s.setMapOpen(false);
        if (s.panel) {
          play("close");
          return s.closePanel();
        }
        if (s.dialogueOpen) {
          play("close");
          return s.setDialogueOpen(false);
        }
      }
      if (e.code === "KeyT") {
        // speak with THE SYSTEM — the key itself must not land in the chat input
        e.preventDefault();
        if (!s.dialogueOpen) play("open");
        return s.setDialogueOpen(!s.dialogueOpen);
      }
      if (e.code === "KeyE" && s.nearZone && !s.panel) {
        play("open");
        return s.openPanel(s.nearZone);
      }
      if (e.code === "KeyM") {
        play(s.mapOpen ? "close" : "open");
        return s.setMapOpen(!s.mapOpen);
      }
      const slot = Number.parseInt(e.key, 10) - 1;
      if (slot >= 0 && slot < zones.length) {
        play("click");
        s.goTo(zones[slot].id);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      held.delete(e.code);
      sync();
    };
    const clear = () => {
      held.clear();
      sync();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
    };
  }, []);
  return null;
}

const STICK = 56;

/** thumb-stick for touch devices; pushing past 85% breaks into a run */
export function Joystick() {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);

  const release = () => {
    origin.current = null;
    setKnob({ x: 0, y: 0 });
    live.input.x = 0;
    live.input.z = 0;
    live.input.run = false;
  };

  return (
    <div
      className="pointer-events-auto relative grid size-[132px] touch-none place-items-center rounded-full border border-arcane/40 bg-void/40 backdrop-blur-md"
      onPointerDown={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        origin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, id: e.pointerId };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const o = origin.current;
        if (!o || e.pointerId !== o.id) return;
        let dx = e.clientX - o.x;
        let dy = e.clientY - o.y;
        const d = Math.hypot(dx, dy);
        if (d > STICK) {
          dx = (dx / d) * STICK;
          dy = (dy / d) * STICK;
        }
        setKnob({ x: dx, y: dy });
        live.input.x = dx / STICK;
        live.input.z = -dy / STICK;
        live.input.run = d > STICK * 0.85;
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div className="absolute inset-3 rounded-full border border-dashed border-arcane/25" />
      <div
        className="size-14 rounded-full border border-arcane-hot/70 bg-arcane/35 shadow-[0_0_24px_var(--arcane)]"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
}
