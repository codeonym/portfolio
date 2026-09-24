"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles, useGLTF } from "@react-three/drei";
import {
  AnimationMixer,
  Color,
  LoopOnce,
  MeshStandardMaterial,
  type AnimationAction,
  type Group,
  type Mesh,
} from "three";
import { world, zones } from "@/config/world.config";
import { footstep, play } from "@/lib/audio";
import { live, useWorldStore } from "@/store/world-store";
import { ASSETS, COLORS } from "./assets";
import { colliders } from "./colliders";
import { kickAberration } from "./follow-camera";

useGLTF.preload(ASSETS.sung, ASSETS.draco);

type Clip =
  | "Idle"
  | "Walking_A"
  | "Running_A"
  | "Spellcast_Long"
  | "Spellcast_Raise"
  | "Dualwield_Melee_Attack_Slice"
  | "Cheer"
  | "Interact"
  | "Jump_Full_Short";

interface Rig {
  mixer: AnimationMixer;
  actions: Partial<Record<Clip, AnimationAction>>;
  current: Clip;
  /** a one-shot is playing — locomotion waits for it */
  busyUntil: number;
}

const BODY_RADIUS = 0.6;
/** Sung is modelled at 1.87 m; the world is scaled for a ~2.2-unit Hunter */
const SUNG_SCALE = 1.18;
const STEP_EVERY = 1.55;

function shortestAngle(from: number, to: number) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * The Hunter — Sung Jin-Woo, the Shadow Monarch, steered by the visitor.
 * His rig carries the KayKit Hunter's clips, retargeted offline
 * (scripts/assets/retarget.py). Click-to-move, WASD/joystick relative to
 * the camera, circle colliders, and a small animation state machine with
 * one-shot reactions to world events (ARISE → raise spell, opening a zone
 * → interact, level up → cheer).
 */
export function Hunter() {
  const group = useRef<Group>(null);
  const flash = useRef<Group>(null);
  const rig = useRef<Rig | null>(null);
  const speed = useRef(0);
  const stepAcc = useRef(0);
  const warpSeen = useRef(0);
  const flashT = useRef(1);

  const { scene, animations } = useGLTF(ASSETS.sung, ASSETS.draco);

  // night pass: keep his textures, lift them a touch and add a violet
  // undertone so the black outfit still reads against the dark island
  const model = useMemo(() => {
    scene.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      const src = mesh.material as MeshStandardMaterial;
      mesh.material = new MeshStandardMaterial({
        map: src.map,
        color: new Color("#c9c3e6"),
        roughness: 0.62,
        metalness: 0.1,
        emissive: new Color("#1d1040"),
        emissiveIntensity: 0.7,
      });
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
    const oneShot = (clip: Clip, sound?: Parameters<typeof play>[0]) => {
      const r = rig.current;
      const action = r?.actions[clip];
      if (!r || !action) return;
      action.reset().setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      r.actions[r.current]?.fadeOut(0.2);
      action.fadeIn(0.2).play();
      r.current = clip;
      r.busyUntil = performance.now() + action.getClip().duration * 1000 - 200;
      if (sound) play(sound);
    };
    return useWorldStore.subscribe((s, prev) => {
      if (s.rising && !prev.rising) oneShot("Spellcast_Raise");
      if (s.panel && s.panel !== prev.panel) oneShot("Interact");
      if (s.levelUp && s.levelUp !== prev.levelUp) oneShot("Cheer");
      if (s.warp.n !== prev.warp.n) oneShot("Jump_Full_Short");
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
        g.position.set(s.warp.to[0], 0, s.warp.to[1]);
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
      if (dist < 0.3) {
        s.clearTarget();
      } else {
        dx = tx / dist;
        dz = tz / dist;
        run = run || dist > 7 || s.pending !== null;
        // ease in to the stop so the Hunter doesn't skid past the mark
        const ease = Math.min(1, dist / 1.2);
        dx *= ease;
        dz *= ease;
      }
    }

    const mag = Math.hypot(dx, dz);
    const topSpeed = run ? world.runSpeed : world.walkSpeed;
    speed.current += (mag * topSpeed - speed.current) * Math.min(1, delta * 8);

    if (mag > 0.01) {
      const nx = dx / mag;
      const nz = dz / mag;
      let px = g.position.x + nx * speed.current * delta;
      let pz = g.position.z + nz * speed.current * delta;
      // slide around landmarks
      for (const c of colliders) {
        const ox = px - c.x;
        const oz = pz - c.z;
        const d = Math.hypot(ox, oz);
        const min = c.r + BODY_RADIUS;
        if (d < min && d > 0.0001) {
          px = c.x + (ox / d) * min;
          pz = c.z + (oz / d) * min;
        }
      }
      // stay on the island
      const rr = Math.hypot(px, pz);
      const edge = world.islandRadius - 1.6;
      if (rr > edge) {
        px *= edge / rr;
        pz *= edge / rr;
      }
      const moved = Math.hypot(px - g.position.x, pz - g.position.z);
      g.position.x = px;
      g.position.z = pz;
      const heading = Math.atan2(nx, nz);
      g.rotation.y += shortestAngle(g.rotation.y, heading) * Math.min(1, delta * 12);

      stepAcc.current += moved;
      if (stepAcc.current > STEP_EVERY * (run ? 1.25 : 0.85)) {
        stepAcc.current = 0;
        footstep();
      }
    }

    // ── locomotion clips (one-shots own the rig until they finish) ──
    if (!busy) {
      const want: Clip =
        speed.current > world.walkSpeed * 1.08
          ? "Running_A"
          : speed.current > 0.35
            ? "Walking_A"
            : "Idle";
      if (want !== r.current) {
        r.actions[r.current]?.fadeOut(0.18);
        r.actions[want]?.reset().fadeIn(0.18).play();
        r.current = want;
      }
    }
    r.mixer.update(delta);

    // ── proximity: which zone is the Hunter standing in ──
    let near: (typeof zones)[number]["id"] | null = null;
    let best = Infinity;
    for (const z of zones) {
      const d = Math.hypot(g.position.x - z.position[0], g.position.z - z.position[1]);
      if (d < z.radius + 2.2 && d < best) {
        best = d;
        near = z.id;
      }
    }
    s.setNearZone(near);

    live.hunter.x = g.position.x;
    live.hunter.z = g.position.z;
    live.hunter.heading = g.rotation.y;
    live.moving = speed.current > 0.35;

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
      {/* the Monarch's aura: rising motes + a lantern so he reads at night */}
      <Sparkles count={24} scale={[1.6, 2.6, 1.6]} position={[0, 1.2, 0]} size={2.4} speed={0.6} color={COLORS.arcaneHot} opacity={0.8} />
      <pointLight color={COLORS.arcane} intensity={9} distance={7} decay={1.6} position={[0, 2.6, 0.6]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[0.9, 32]} />
        <meshBasicMaterial color={COLORS.void} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <group ref={flash} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[0.8, 1, 48]} />
          <meshBasicMaterial color={COLORS.arcaneHot} transparent opacity={0.8} toneMapped={false} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
