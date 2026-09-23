"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, Sparkles, useGLTF } from "@react-three/drei";
import {
  AdditiveBlending,
  AnimationMixer,
  Color,
  LoopOnce,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type AnimationAction,
  type AnimationClip,
  type Group,
  type Mesh,
  type Object3D,
} from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { quests } from "@/config/quests.config";
import type { Quest } from "@/config/types";
import { world } from "@/config/world.config";
import { duckMusic, play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { live, useWorldStore } from "@/store/world-store";
import { ASSETS, COLORS, type SkeletonKind } from "./assets";
import { zoneToWorld, zoneYaw } from "./colliders";
import { addShake, kickAberration } from "./follow-camera";

for (const url of Object.values(ASSETS.skeletons)) useGLTF.preload(url, ASSETS.draco);

type Clip =
  | "Skeletons_Inactive_Floor_Pose"
  | "Skeletons_Awaken_Floor_Long"
  | "Idle"
  | "Cheer"
  | "Taunt"
  | "Running_A"
  | "Walking_D_Skeletons";

type State = "fallen" | "rising" | "risen";

const BONE = new Color("#b9b3cc");
const SHADOW = new Color("#141026");
const GLOW = new Color(COLORS.arcane);

/** rank decides the body: S-rank quests rise as knights and mages */
function kindFor(quest: Quest, index: number): SkeletonKind {
  if (quest.rank === "S") return index % 2 === 0 ? "warrior" : "mage";
  if (quest.rank === "A") return "rogue";
  return "minion";
}

/** crypt-local resting places: two rows between the pillars */
const GRAVES: [number, number, number][] = [
  [-4, 1.9, 0.4],
  [0, 2.2, -0.2],
  [4, 1.9, 0.3],
  [-4, -1.7, -0.3],
  [0, -1.9, 0.2],
  [4, -1.7, -0.4],
];

/** V formation behind the Hunter, in the Hunter's local frame */
function slotOffset(slot: number): [number, number] {
  const rank = Math.floor(slot / 2) + 1;
  const side = slot % 2 === 0 ? -1 : 1;
  return [side * 1.5 * rank, -1.9 * rank];
}

interface Rig {
  mixer: AnimationMixer;
  actions: Partial<Record<Clip, AnimationAction>>;
  current: Clip;
  body: MeshStandardMaterial[];
  eyes: MeshBasicMaterial[];
}

function Fallen({ quest, index }: { quest: Quest; index: number }) {
  const kind = kindFor(quest, index);
  const { scene, animations } = useGLTF(ASSETS.skeletons[kind], ASSETS.draco);
  const clone = useMemo<Object3D>(() => cloneSkinned(scene), [scene]);
  const holder = useRef<Group>(null);
  const burst = useRef<Group>(null);
  const rig = useRef<Rig | null>(null);
  const progress = useRef(0);
  const burstT = useRef(1);

  const risen = useWorldStore((s) => s.risen.includes(quest.id));
  const rising = useWorldStore((s) => s.rising === quest.id);
  // floating ARISE tags only while exploring the crypt; the open panel has its own buttons
  const nearCrypt = useWorldStore((s) => s.nearZone === "crypt" && s.panel === null);
  const phase = useWorldStore((s) => s.phase);
  const [state, setState] = useState<State>(risen ? "risen" : "fallen");
  const stateRef = useRef<State>(state);
  const slot = useWorldStore((s) => s.risen.indexOf(quest.id));

  const grave = useMemo(() => {
    const [lx, lz, spin] = GRAVES[index % GRAVES.length];
    const [x, z] = zoneToWorld("crypt", lx, lz);
    return { x, z, yaw: zoneYaw("crypt") + spin };
  }, [index]);

  // build the rig + per-soldier materials once
  useEffect(() => {
    const body: MeshStandardMaterial[] = [];
    const eyes: MeshBasicMaterial[] = [];
    clone.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      if (mesh.name.toLowerCase().includes("eyes")) {
        const m = new MeshBasicMaterial({
          color: GLOW.clone().multiplyScalar(3),
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        });
        mesh.material = m;
        eyes.push(m);
        return;
      }
      const src = mesh.material as MeshStandardMaterial;
      const m = new MeshStandardMaterial({
        map: src.map,
        color: BONE.clone(),
        roughness: 0.75,
        metalness: 0.1,
        emissive: GLOW.clone(),
        emissiveIntensity: 0,
      });
      mesh.material = m;
      body.push(m);
    });
    const mixer = new AnimationMixer(clone);
    const actions: Rig["actions"] = {};
    for (const clip of animations as AnimationClip[]) actions[clip.name as Clip] = mixer.clipAction(clip);
    const start: Clip = stateRef.current === "risen" ? "Idle" : "Skeletons_Inactive_Floor_Pose";
    actions[start]?.play();
    // stagger so the legion never breathes in unison
    mixer.setTime(index * 0.37);
    rig.current = { mixer, actions, current: start, body, eyes };
    if (stateRef.current === "risen") progress.current = 1;
    return () => {
      mixer.stopAllAction();
      rig.current = null;
    };
  }, [clone, animations, index]);

  // spawn position: in the grave, or already in formation after a reload
  useEffect(() => {
    const h = holder.current;
    if (!h) return;
    if (stateRef.current === "risen") {
      h.position.set(live.hunter.x + (index - 2.5) * 1.2, 0, live.hunter.z + 2.5);
    } else {
      h.position.set(grave.x, 0, grave.z);
      h.rotation.y = grave.yaw;
    }
  }, [grave, index]);

  // the store says ARISE — play the awakening
  useEffect(() => {
    const r = rig.current;
    if (!rising || !r || stateRef.current !== "fallen") return;
    stateRef.current = "rising";
    setState("rising");
    play("arise");
    duckMusic(3.5);
    addShake(0.7);
    kickAberration(1.5);
    burstT.current = 0;
    const awaken = r.actions.Skeletons_Awaken_Floor_Long;
    if (!awaken) return;
    r.actions[r.current]?.fadeOut(0.1);
    awaken.reset().setLoop(LoopOnce, 1);
    awaken.clampWhenFinished = true;
    awaken.fadeIn(0.1).play();
    r.current = "Skeletons_Awaken_Floor_Long";
    const onDone = (e: { action: AnimationAction }) => {
      if (e.action !== awaken) return;
      r.mixer.removeEventListener("finished", onDone);
      const cheer = r.actions.Taunt;
      awaken.fadeOut(0.3);
      cheer?.reset().setLoop(LoopOnce, 1);
      if (cheer) {
        cheer.clampWhenFinished = true;
        cheer.fadeIn(0.3).play();
        r.current = "Taunt";
      }
      stateRef.current = "risen";
      setState("risen");
      useWorldStore.getState().finishRising();
    };
    r.mixer.addEventListener("finished", onDone);
    return () => r.mixer.removeEventListener("finished", onDone);
  }, [rising]);

  useFrame(({ clock }, raw) => {
    const r = rig.current;
    const h = holder.current;
    if (!r || !h) return;
    const delta = Math.min(raw, 0.05);
    const st = stateRef.current;

    // bone → shadow as the soldier rises
    if (st !== "fallen" && progress.current < 1) {
      progress.current = Math.min(1, progress.current + delta * 0.45);
    }
    const k = progress.current;
    for (const m of r.body) {
      m.color.copy(BONE).lerp(SHADOW, k);
      m.setValues({ emissiveIntensity: k * (0.55 + 0.25 * Math.sin(clock.elapsedTime * 2 + index)) });
    }
    for (const m of r.eyes) m.setValues({ opacity: k });

    if (st === "risen") {
      const busy = r.current === "Taunt" && (r.actions.Taunt?.isRunning() ?? false);
      const [ox, oz] = slotOffset(Math.max(0, slot));
      const hd = live.hunter.heading;
      const tx = live.hunter.x + ox * Math.cos(hd) + oz * Math.sin(hd);
      const tz = live.hunter.z - ox * Math.sin(hd) + oz * Math.cos(hd);
      const dx = tx - h.position.x;
      const dz = tz - h.position.z;
      const dist = Math.hypot(dx, dz);
      let want: Clip = "Idle";
      if (!busy && dist > 0.35) {
        const spd = Math.min(world.runSpeed * 1.1, dist * 2.2);
        const step = Math.min(dist, spd * delta);
        h.position.x += (dx / dist) * step;
        h.position.z += (dz / dist) * step;
        const target = Math.atan2(dx, dz);
        let d = (target - h.rotation.y) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        h.rotation.y += d * Math.min(1, delta * 8);
        want = spd > world.walkSpeed ? "Running_A" : spd > 0.9 ? "Walking_D_Skeletons" : "Idle";
      } else if (!busy) {
        // at rest: face the way the Monarch faces
        let d = (hd - h.rotation.y) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        h.rotation.y += d * Math.min(1, delta * 3);
      }
      if (!busy && want !== r.current) {
        r.actions[r.current]?.fadeOut(0.25);
        r.actions[want]?.reset().fadeIn(0.25).play();
        r.current = want;
      }
    }
    r.mixer.update(delta);

    if (burst.current) {
      burstT.current = Math.min(1, burstT.current + delta * 0.5);
      const t = burstT.current;
      burst.current.visible = t < 1;
      burst.current.scale.set(1 + t * 5, 1 + t * 1.5, 1 + t * 5);
      burst.current.position.set(grave.x, 0, grave.z);
      const mesh = burst.current.children[0] as Mesh;
      (mesh.material as MeshBasicMaterial).opacity = (1 - t) * 0.9;
    }
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6 || stateRef.current !== "fallen") return;
    e.stopPropagation();
    useWorldStore.getState().arise(quest.id);
  };

  return (
    <>
      <group ref={holder} onClick={onClick}>
        <primitive object={clone} />
        {state === "fallen" && phase === "world" && nearCrypt && (
          <Html position={[0, 1.4, 0]} center zIndexRange={[20, 0]}>
            <button
              type="button"
              onClick={() => useWorldStore.getState().arise(quest.id)}
              onPointerEnter={() => play("hover")}
              className={cn("arise-tag", quest.rank === "S" && "arise-tag--s")}
            >
              <span className="arise-tag__rank">{quest.rank}</span>
              <span className="arise-tag__name">{quest.name.replace(/ —.*/, "")}</span>
              <span className="arise-tag__cmd">{world.hud.arise}</span>
            </button>
          </Html>
        )}
        {state === "risen" && (
          <Sparkles count={10} scale={[1.2, 2.2, 1.2]} position={[0, 1.2, 0]} size={2} speed={0.5} color={COLORS.arcane} />
        )}
      </group>
      {/* the extraction: a column of shadow erupting from the grave */}
      <group ref={burst} visible={false}>
        <mesh position={[0, 3, 0]}>
          <cylinderGeometry args={[0.6, 1.1, 6, 24, 1, true]} />
          <meshBasicMaterial color={GLOW.clone().multiplyScalar(2)} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} side={2} />
        </mesh>
      </group>
    </>
  );
}

export function ShadowLegion() {
  return (
    <>
      {quests.map((q, i) => (
        <Fallen key={q.id} quest={q} index={i} />
      ))}
    </>
  );
}
