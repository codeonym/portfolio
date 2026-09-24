"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  AnimationMixer,
  LoopOnce,
  LoopRepeat,
  MeshStandardMaterial,
  type AnimationAction,
  type Group,
  type Mesh,
} from "three";
import { quests } from "@/config/quests.config";
import { world, zones } from "@/config/world.config";
import { footstep, play } from "@/lib/audio";
import { live, useWorldStore } from "@/store/world-store";
import { addRim, ASSETS, COLORS } from "./assets";
import { kickAberration } from "./follow-camera";
import { floorAt, graveColliders, resolveMove, type Circle } from "./layout";

useGLTF.preload(ASSETS.sung, ASSETS.draco);

/** Mixamo motion capture, retargeted onto Sung's rig (scripts/assets/retarget.py) */
type Clip = "Idle" | "Idle2" | "Walk" | "Run" | "Jump" | "Cast1H" | "Cast2H" | "Area" | "Kneel";

interface Rig {
  mixer: AnimationMixer;
  actions: Partial<Record<Clip, AnimationAction>>;
  current: Clip;
  /** a one-shot is playing — locomotion waits for it */
  busyUntil: number;
}

const BODY_RADIUS = 0.45;
/** Sung is modelled at 1.87 m; the world is scaled for a ~2.2-unit Hunter */
const SUNG_SCALE = 1.18;
/** how fast each in-place cycle travels at timeScale 1 (world units/s) — playback is matched to real speed so feet don't skate */
const NATURAL = { Walk: 1.9, Run: 4.9 };
const STEP_EVERY = 1.3;
/** stand idle this long and he shifts his weight / looks around */
const FIDGET_AFTER = 9;

function shortestAngle(from: number, to: number) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * The Hunter — Sung Jin-Woo, the Shadow Monarch, steered by the visitor.
 * Click-to-move, WASD/joystick relative to the camera, circle colliders
 * inside the hall, floor-following, and a small animation state machine
 * with speed-matched locomotion and one-shot reactions to world events
 * (ARISE → two-handed raise, opening a station → a summoning gesture,
 * level up → an area burst, fast travel → a landing).
 */
export function Hunter() {
  const group = useRef<Group>(null);
  const flash = useRef<Group>(null);
  const rig = useRef<Rig | null>(null);
  const speed = useRef(0);
  const stepAcc = useRef(0);
  const idleFor = useRef(0);
  const warpSeen = useRef(0);
  const flashT = useRef(1);

  const { scene, animations } = useGLTF(ASSETS.sung, ASSETS.draco);

  // keep his textures; a cold violet rim keeps the black outfit readable in the dark hall
  const model = useMemo(() => {
    scene.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      const src = mesh.material as MeshStandardMaterial;
      const m = new MeshStandardMaterial({ map: src.map, normalMap: src.normalMap, roughness: 0.6, metalness: 0.1, envMapIntensity: 0.5 });
      addRim(m, "#8f86ff", 0.35, 3.2);
      mesh.material = m;
      mesh.castShadow = true;
      mesh.frustumCulled = false;
    });
    return scene;
  }, [scene]);

  useEffect(() => {
    const mixer = new AnimationMixer(model);
    const actions: Rig["actions"] = {};
    for (const clip of animations) actions[clip.name as Clip] = mixer.clipAction(clip);
    actions.Idle?.play();
    rig.current = { mixer, actions, current: "Idle", busyUntil: 0 };
    return () => {
      mixer.stopAllAction();
      rig.current = null;
    };
  }, [model, animations]);

  // world events → one-shot gestures
  useEffect(() => {
    const oneShot = (clip: Clip, { fade = 0.25, cut = 0.25 } = {}) => {
      const r = rig.current;
      const action = r?.actions[clip];
      if (!r || !action) return;
      action.reset().setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      action.timeScale = 1;
      r.actions[r.current]?.fadeOut(fade);
      action.fadeIn(fade).play();
      r.current = clip;
      r.busyUntil = performance.now() + (action.getClip().duration - cut) * 1000;
    };
    return useWorldStore.subscribe((s, prev) => {
      if (s.rising && !prev.rising) oneShot("Cast2H");
      if (s.panel && s.panel !== prev.panel) oneShot("Cast1H", { fade: 0.2, cut: 0.9 });
      if (s.levelUp && s.levelUp !== prev.levelUp) oneShot("Area");
      if (s.warp.n !== prev.warp.n) oneShot("Jump", { fade: 0.1, cut: 0.6 });
    });
  }, []);

  useFrame(({ clock }, rawDelta) => {
    const g = group.current;
    const r = rig.current;
    if (!g || !r) return;
    const delta = Math.min(rawDelta, 0.05);
    const s = useWorldStore.getState();
    const now = performance.now();

    // fast travel: blink to the destination inside a burst of shadow
    if (s.warp.n !== warpSeen.current) {
      warpSeen.current = s.warp.n;
      if (s.warp.n > 0) {
        g.position.set(s.warp.to[0], floorAt(s.warp.to[0], s.warp.to[1]), s.warp.to[1]);
        flashT.current = 0;
        play("portal");
        kickAberration(1.2);
      }
    }

    // ── desired direction ──
    let dx = 0;
    let dz = 0;
    let run = live.input.run;
    const ix = live.input.x;
    const iz = live.input.z;
    const busy = now < r.busyUntil;
    if (Math.hypot(ix, iz) > 0.12 && !busy) {
      if (s.target) s.clearTarget();
      if (s.panel) s.closePanel();
      const yaw = live.cameraYaw;
      // forward = away from the camera, right = screen right
      dx = -Math.sin(yaw) * iz + Math.cos(yaw) * ix;
      dz = -Math.cos(yaw) * iz - Math.sin(yaw) * ix;
      // keyboard diagonals come in at √2 — cap analog magnitude at 1
      const len = Math.hypot(dx, dz);
      if (len > 1) {
        dx /= len;
        dz /= len;
      }
    } else if (s.target && !busy) {
      const tx = s.target[0] - g.position.x;
      const tz = s.target[1] - g.position.z;
      const dist = Math.hypot(tx, tz);
      if (dist < 0.25) {
        s.clearTarget();
      } else {
        dx = tx / dist;
        dz = tz / dist;
        run = run || dist > 6 || s.pending !== null;
        // ease in to the stop so the Hunter doesn't skid past the mark
        const ease = Math.min(1, dist / 1.1);
        dx *= ease;
        dz *= ease;
      }
    }

    const mag = Math.hypot(dx, dz);
    const topSpeed = run ? world.runSpeed : world.walkSpeed;
    speed.current += (mag * topSpeed - speed.current) * Math.min(1, delta * 7);

    if (mag > 0.01) {
      const nx = dx / mag;
      const nz = dz / mag;
      // the still-fallen knights block the way until they rise
      const extra: Circle[] = [];
      quests.forEach((q, i) => {
        if (!s.risen.includes(q.id) && s.rising !== q.id) extra.push(graveColliders[i % graveColliders.length]);
      });
      const [px, pz] = resolveMove(
        g.position.x + nx * speed.current * delta,
        g.position.z + nz * speed.current * delta,
        BODY_RADIUS,
        extra,
      );
      const moved = Math.hypot(px - g.position.x, pz - g.position.z);
      g.position.x = px;
      g.position.z = pz;
      const heading = Math.atan2(nx, nz);
      g.rotation.y += shortestAngle(g.rotation.y, heading) * Math.min(1, delta * 10);

      stepAcc.current += moved;
      if (stepAcc.current > STEP_EVERY * (run ? 1.3 : 0.8)) {
        stepAcc.current = 0;
        footstep();
      }
    }
    // follow the floor (sunken nave floors, dais steps)
    const fy = floorAt(g.position.x, g.position.z, g.position.y + 1);
    g.position.y += (fy - g.position.y) * Math.min(1, delta * 12);

    // ── locomotion (one-shots own the rig until they finish) ──
    if (!busy) {
      const v = speed.current;
      let want: Clip = v > world.walkSpeed * 1.15 ? "Run" : v > 0.3 ? "Walk" : "Idle";
      idleFor.current = want === "Idle" ? idleFor.current + delta : 0;
      if (want === "Idle" && idleFor.current > FIDGET_AFTER) {
        want = "Idle2";
        const fidget = r.actions.Idle2;
        if (fidget && r.current === "Idle2" && fidget.time > fidget.getClip().duration - 0.4) idleFor.current = 0;
      }
      if (want !== r.current) {
        const next = r.actions[want];
        r.actions[r.current]?.fadeOut(0.22);
        next?.reset().setLoop(want === "Idle2" ? LoopOnce : LoopRepeat, Infinity);
        if (next) next.clampWhenFinished = want === "Idle2";
        next?.fadeIn(0.22).play();
        r.current = want;
      }
      const action = r.actions[r.current];
      if (action && (r.current === "Walk" || r.current === "Run")) {
        action.timeScale = Math.min(1.6, Math.max(0.6, v / NATURAL[r.current]));
      }
    }
    r.mixer.update(delta);

    // ── proximity: which station is the Hunter standing at ──
    let near: (typeof zones)[number]["id"] | null = null;
    let best = Infinity;
    for (const z of zones) {
      const d = Math.hypot(g.position.x - z.position[0], g.position.z - z.position[1]);
      if (d < z.radius && d < best) {
        best = d;
        near = z.id;
      }
    }
    s.setNearZone(near);

    live.hunter.x = g.position.x;
    live.hunter.z = g.position.z;
    live.hunter.heading = g.rotation.y;
    live.moving = speed.current > 0.3;

    // warp burst: an expanding, fading ring of shadow
    if (flash.current) {
      flashT.current = Math.min(1, flashT.current + delta * 1.6);
      const t = flashT.current;
      flash.current.visible = t < 1;
      flash.current.scale.setScalar(0.5 + t * 5);
      flash.current.rotation.y = clock.elapsedTime * 2;
    }
  });

  return (
    <group ref={group} position={[world.spawn[0], 0, world.spawn[1]]} rotation={[0, Math.PI, 0]}>
      <primitive object={model} scale={SUNG_SCALE} />
      {/* the Monarch's lantern: a faint cold key so he reads in the dark */}
      <pointLight color={COLORS.arcaneHot} intensity={2.2} distance={5} decay={1.8} position={[0, 2.8, 1.2]} />
      <group ref={flash} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[0.8, 1, 48]} />
          <meshBasicMaterial color={COLORS.arcaneHot} transparent opacity={0.8} toneMapped={false} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
