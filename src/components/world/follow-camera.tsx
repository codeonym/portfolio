"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector2, Vector3, type PerspectiveCamera } from "three";
import { zoneById } from "@/config/world.config";
import { live, useWorldStore } from "@/store/world-store";

/** transient camera effects, decaying on their own — kicked by big moments */
const fx = { shake: 0, aberration: 0 };
export function addShake(amount: number) {
  fx.shake = Math.min(1.2, fx.shake + amount);
}

/** big moments smear the lens: read by the ChromaticAberration pass */
export const aberration = new Vector2(0.0004, 0.0004);
export function kickAberration(amount = 1) {
  fx.aberration = Math.min(2, fx.aberration + amount);
}

const MIN_DIST = 7;
const MAX_DIST = 22;

/**
 * Third-person camera with three moods:
 *  · title   — a slow high orbit around the island (attract mode)
 *  · explore — damped follow behind the Hunter; drag orbits, wheel zooms
 *  · focus   — a zone panel is open: frame its landmark, shifted clear
 *              of the panel with a view offset (right on desktop, below
 *              on touch, where the panel is a bottom sheet)
 */
export function FollowCamera() {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);

  const yaw = useRef(0);
  const pitch = useRef(0.5);
  const dist = useRef(13);
  const look = useRef(new Vector3(0, 1.5, 0));
  const desired = useRef(new Vector3());
  const desiredLook = useRef(new Vector3());
  const offset = useRef({ x: 0, y: 0 });

  // drag to orbit, wheel to zoom — bound to the canvas only, so HUD
  // panels keep their own scrolling and pointer handling
  useEffect(() => {
    const el = gl.domElement;
    let down: { x: number; y: number; id: number } | null = null;
    let dragging = false;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, id: e.pointerId };
      dragging = false;
    };
    const onMove = (e: PointerEvent) => {
      if (!down || e.pointerId !== down.id) return;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      if (!dragging && Math.hypot(dx, dy) > 6) dragging = true;
      if (!dragging) return;
      yaw.current -= e.movementX * 0.0055;
      pitch.current = Math.min(1.15, Math.max(0.18, pitch.current + e.movementY * 0.004));
    };
    const onUp = () => {
      down = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      dist.current = Math.min(MAX_DIST, Math.max(MIN_DIST, dist.current + e.deltaY * 0.012));
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  useFrame((state, rawDelta) => {
    const camera = state.camera as PerspectiveCamera;
    const clock = state.clock;
    const delta = Math.min(rawDelta, 0.05);
    const { phase, panel, touch, dialogueOpen, nearZone } = useWorldStore.getState();
    // speaking with THE SYSTEM at its wraith: frame it beside the dialogue
    const focus = panel ?? (dialogueOpen && nearZone === "awakening" ? "awakening" : null);
    const t = clock.elapsedTime;
    let damp = 3.2;
    let wantOffset = { x: 0, y: 0 };

    if (phase !== "world") {
      // attract mode: a lazy high orbit, the Gate always drifting through frame
      const a = t * 0.05 + 0.6;
      desired.current.set(Math.sin(a) * 46, 24 + Math.sin(t * 0.2) * 3, Math.cos(a) * 46);
      desiredLook.current.set(0, -2, -4);
      damp = 1.2;
    } else if (focus) {
      const zone = zoneById[focus];
      const [zx, zz] = zone.position;
      const len = Math.hypot(zx, zz);
      // stand between the landmark and the island center, a little above
      let ux = len < 1 ? 0 : -zx / len;
      let uz = len < 1 ? 1 : -zz / len;
      // swing ~35° off the approach axis so the Hunter (standing on it)
      // frames the landmark from the side instead of blocking it
      const swing = 0.6;
      const c = Math.cos(swing);
      const sn = Math.sin(swing);
      [ux, uz] = [ux * c - uz * sn, ux * sn + uz * c];
      const talking = !panel;
      const back = zone.radius + (focus === "gate" ? 12 : talking ? 6.5 : 8.5);
      desired.current.set(zx + ux * back, talking ? 6 : 7.5, zz + uz * back);
      desiredLook.current.set(zx, focus === "gate" ? 5.5 : talking ? 4.2 : 2, zz);
      // the zone panel sits right, the dialogue left (desktop); both are bottom sheets on touch
      wantOffset = touch ? { x: 0, y: size.height * 0.22 } : { x: size.width * (talking ? -0.17 : 0.2), y: 0 };
      damp = 2.4;
    } else {
      const h = live.hunter;
      const d = dist.current;
      const p = pitch.current;
      desired.current.set(
        h.x + Math.sin(yaw.current) * Math.cos(p) * d,
        1.6 + Math.sin(p) * d,
        h.z + Math.cos(yaw.current) * Math.cos(p) * d,
      );
      desiredLook.current.set(h.x, 1.6, h.z);
      damp = 4.5;
    }

    const k = 1 - Math.exp(-delta * damp);
    camera.position.lerp(desired.current, k);
    look.current.lerp(desiredLook.current, Math.min(1, k * 1.4));

    if (fx.shake > 0.001) {
      camera.position.x += (Math.random() - 0.5) * fx.shake * 0.5;
      camera.position.y += (Math.random() - 0.5) * fx.shake * 0.5;
      fx.shake *= Math.exp(-delta * 4);
    }
    camera.lookAt(look.current);

    fx.aberration *= Math.exp(-delta * 3);
    const ab = 0.0004 + fx.aberration * 0.004;
    aberration.set(ab, ab);

    // after a focus shot, resume following from wherever the camera ended up
    if (phase === "world" && focus) {
      const dx = camera.position.x - live.hunter.x;
      const dz = camera.position.z - live.hunter.z;
      yaw.current = Math.atan2(dx, dz);
    }
    live.cameraYaw = yaw.current;

    // slide the framing clear of the open panel
    offset.current.x += (wantOffset.x - offset.current.x) * k;
    offset.current.y += (wantOffset.y - offset.current.y) * k;
    if (Math.abs(offset.current.x) + Math.abs(offset.current.y) > 0.5) {
      camera.setViewOffset(size.width, size.height, offset.current.x, offset.current.y, size.width, size.height);
    } else if (camera.view?.enabled) {
      camera.clearViewOffset();
    }
  });

  return null;
}
