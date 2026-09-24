"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, Sparkles, useGLTF } from "@react-three/drei";
import {
  AdditiveBlending,
  Box3,
  Color,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
  type Group,
  type Mesh,
  type Object3D,
} from "three";
import { quests } from "@/config/quests.config";
import type { Quest } from "@/config/types";
import { world } from "@/config/world.config";
import { duckMusic, play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { live, useWorldStore } from "@/store/world-store";
import { ASSETS, COLORS, createGlowMaterial } from "./assets";
import { zoneToWorld, zoneYaw } from "./colliders";
import { addShake, kickAberration } from "./follow-camera";

useGLTF.preload(ASSETS.igris, ASSETS.draco);

type State = "fallen" | "rising" | "risen";
/** the two materials each soldier mesh swaps between, kept on mesh.userData */
type Looks = { stone: MeshStandardMaterial; shadow: MeshStandardMaterial };

/** Igris towers a head over the Monarch */
const IGRIS_HEIGHT = 2.7;
/** the extraction: sink into the shadow, then rise from it */
const SINK = 0.9;
const RISE = 1.6;

const STONE = new Color("#8d8a9c");
const SHADOW = new Color("#5a5378");
const GLOW = new Color(COLORS.arcane);

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
  return [side * 1.8 * rank, -2.1 * rank];
}

function wrapAngle(d: number) {
  d %= Math.PI * 2;
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** scale + offset that stand Igris on the ground at IGRIS_HEIGHT, centered */
function useIgrisFit(scene: Object3D) {
  return useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = IGRIS_HEIGHT / (size.y || 1);
    return { scale, offset: [-center.x * scale, -box.min.y * scale, -center.z * scale] as [number, number, number] };
  }, [scene]);
}

function Soldier({ quest, index }: { quest: Quest; index: number }) {
  const { scene } = useGLTF(ASSETS.igris, ASSETS.draco);
  const fit = useIgrisFit(scene);
  const holder = useRef<Group>(null);
  const body = useRef<Group>(null);
  const burst = useRef<Group>(null);
  /** 0 = stone, 1 = shadow */
  const progress = useRef(0);
  const riseT = useRef(-1);
  const burstT = useRef(1);
  const speed = useRef(0);

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

  // one clone per soldier with two looks: an untextured stone statue while
  // fallen, and the shadow knight (its own texture, seams burning violet) once risen
  const clone = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      const src = mesh.material as MeshStandardMaterial;
      const stone = new MeshStandardMaterial({ color: STONE, roughness: 0.95, metalness: 0, side: src.side });
      const shadow = new MeshStandardMaterial({
        map: src.map,
        emissiveMap: src.map,
        color: SHADOW,
        roughness: 0.5,
        metalness: 0.4,
        emissive: GLOW,
        emissiveIntensity: 0,
        side: src.side,
      });
      mesh.castShadow = true;
      mesh.material = stone;
      mesh.userData.looks = { stone, shadow } satisfies Looks;
    });
    return copy;
  }, [scene]);
  const pool = useMemo(() => createGlowMaterial("#1a0f3a", 1.6), []);

  // spawn position: on its grave, or already in formation after a reload
  useEffect(() => {
    const h = holder.current;
    if (!h) return;
    if (stateRef.current === "risen") {
      progress.current = 1;
      h.position.set(live.hunter.x + (index - 2.5) * 1.4, 0, live.hunter.z + 2.8);
    } else {
      h.position.set(grave.x, 0, grave.z);
      h.rotation.y = grave.yaw;
    }
  }, [grave, index]);

  // the store says ARISE — sink into the shadow and come back as one
  useEffect(() => {
    if (!rising || stateRef.current !== "fallen") return;
    stateRef.current = "rising";
    setState("rising");
    play("arise");
    duckMusic(3.5);
    addShake(0.7);
    kickAberration(1.5);
    burstT.current = 0;
    riseT.current = 0;
  }, [rising]);

  useFrame(({ clock }, raw) => {
    const h = holder.current;
    const b = body.current;
    if (!h || !b) return;
    const delta = Math.min(raw, 0.05);
    const t = clock.elapsedTime;
    const st = stateRef.current;

    // ── the extraction ──
    if (st === "rising") {
      riseT.current += delta;
      const r = riseT.current;
      if (r < SINK) {
        const k = r / SINK;
        b.position.y = -IGRIS_HEIGHT * 1.05 * k * k;
        b.position.x = Math.sin(r * 60) * 0.03;
      } else {
        // below ground it has already become a shadow
        progress.current = 1;
        const k = Math.min(1, (r - SINK) / RISE);
        const ease = 1 - Math.pow(1 - k, 3);
        b.position.y = -IGRIS_HEIGHT * 1.05 * (1 - ease);
        b.position.x = 0;
        if (k >= 1) {
          stateRef.current = "risen";
          setState("risen");
          addShake(0.35);
          useWorldStore.getState().finishRising();
        }
      }
    }

    // stone until it has passed through the shadow, then a slow breathing glow
    const shadowed = progress.current >= 1;
    b.traverse((node) => {
      const mesh = node as Mesh;
      const looks = mesh.userData.looks as Looks | undefined;
      if (!looks) return;
      const m = shadowed ? looks.shadow : looks.stone;
      if (mesh.material !== m) mesh.material = m;
      if (shadowed) m.setValues({ emissiveIntensity: 0.9 + 0.35 * Math.sin(t * 2 + index) });
    });

    // ── risen: glide after the Monarch in formation ──
    if (st === "risen") {
      const [ox, oz] = slotOffset(Math.max(0, slot));
      const hd = live.hunter.heading;
      const tx = live.hunter.x + ox * Math.cos(hd) + oz * Math.sin(hd);
      const tz = live.hunter.z - ox * Math.sin(hd) + oz * Math.cos(hd);
      const dx = tx - h.position.x;
      const dz = tz - h.position.z;
      const dist = Math.hypot(dx, dz);
      let want = 0;
      if (dist > 0.35) {
        want = Math.min(world.runSpeed * 1.1, dist * 2.2);
        const step = Math.min(dist, want * delta);
        h.position.x += (dx / dist) * step;
        h.position.z += (dz / dist) * step;
        h.rotation.y += wrapAngle(Math.atan2(dx, dz) - h.rotation.y) * Math.min(1, delta * 8);
      } else {
        // at rest: face the way the Monarch faces
        h.rotation.y += wrapAngle(hd - h.rotation.y) * Math.min(1, delta * 3);
      }
      speed.current += (want - speed.current) * Math.min(1, delta * 5);
      // shadows don't walk — they hover and lean into the glide
      b.position.y = 0.18 + Math.sin(t * 1.8 + index * 1.3) * 0.07;
      b.rotation.x = Math.min(0.28, speed.current * 0.035);
      b.rotation.z = Math.sin(t * 1.1 + index) * 0.025;
    }

    if (burst.current) {
      burstT.current = Math.min(1, burstT.current + delta * 0.5);
      const bt = burstT.current;
      burst.current.visible = bt < 1;
      burst.current.scale.set(1 + bt * 5, 1 + bt * 1.5, 1 + bt * 5);
      burst.current.position.set(grave.x, 0, grave.z);
      const mesh = burst.current.children[0] as Mesh;
      (mesh.material as MeshBasicMaterial).opacity = (1 - bt) * 0.9;
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
        <group ref={body}>
          <primitive object={clone} scale={fit.scale} position={fit.offset} />
        </group>
        {/* the pool of shadow every soldier stands in */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} material={pool}>
          <planeGeometry args={[3, 3]} />
        </mesh>
        {state === "fallen" && phase === "world" && nearCrypt && (
          <Html position={[0, IGRIS_HEIGHT + 0.4, 0]} center zIndexRange={[20, 0]}>
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
          <Sparkles count={12} scale={[1.4, 2.8, 1.4]} position={[0, 1.4, 0]} size={2.2} speed={0.5} color={COLORS.arcane} />
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

/** the Shadow Legion — each project is a fallen knight until the visitor commands ARISE */
export function ShadowLegion() {
  return (
    <>
      {quests.map((q, i) => (
        <Soldier key={q.id} quest={q} index={i} />
      ))}
    </>
  );
}
