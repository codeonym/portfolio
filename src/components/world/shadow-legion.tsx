"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, Sparkles, useGLTF } from "@react-three/drei";
import {
  AnimationMixer,
  Color,
  LoopOnce,
  LoopRepeat,
  MeshStandardMaterial,
  type AnimationAction,
  type Group,
  type Mesh,
  type Object3D,
  type ShaderMaterial,
} from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { quests } from "@/config/quests.config";
import type { Quest } from "@/config/types";
import { world } from "@/config/world.config";
import { duckMusic, play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { live, useWorldStore } from "@/store/world-store";
import { ASSETS, COLORS, createSigilMaterial, shaderTime } from "./assets";
import { addShake, kickAberration } from "./follow-camera";
import { floorAt, graves, resolveMove } from "./layout";

useGLTF.preload(ASSETS.knight, ASSETS.draco);

type State = "fallen" | "rising" | "risen";
type Clip = "Idle" | "IdleLook" | "IdlePose" | "Walk" | "Run" | "Slash" | "Slash2" | "Spin" | "PowerUp" | "Draw" | "Kneel" | "StandUp";

/** the knights stand a head over the Monarch */
const KNIGHT_SCALE = 1.36;
const KNIGHT_HEIGHT = 2.45;
/** ARISE timeline (seconds): the shadow climbs the statue, then it stands */
const SWEEP = 1.8;
const NATURAL = { Walk: 1.9, Run: 4.9 };
const BODY_RADIUS = 0.45;

const STONE = new Color("#8e8a9e");
const SHADOW = new Color("#0e0c15");
const IGRIS_TINT = new Color("#8a8090");
const EDGE = new Color(COLORS.arcaneHot).multiplyScalar(3);

/** V formation behind the Hunter, in the Hunter's local frame */
function slotOffset(slot: number): [number, number] {
  const rank = Math.floor(slot / 2) + 1;
  const side = slot % 2 === 0 ? -1 : 1;
  return [side * 1.35 * rank, -1.7 * rank];
}

function wrapAngle(d: number) {
  d %= Math.PI * 2;
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * The extraction material: one standard material that is stone below a
 * rising line and living shadow above it, with a burning violet seam
 * where they meet. `uRise` is the seam's world height.
 */
function createArmorUniforms() {
  return {
    uRise: { value: -10 },
    uEdge: { value: EDGE },
    uStone: { value: STONE },
    uGlow: { value: 0.9 },
    uTime: shaderTime,
  };
}
type Armor = ReturnType<typeof createArmorUniforms>;

interface Rig {
  mixer: AnimationMixer;
  actions: Partial<Record<Clip, AnimationAction>>;
  current: Clip;
  armor: Armor;
}

/** cross-fade a knight to `clip` (no-op if it is already playing) */
function playClip(rig: Rig, clip: Clip, { once = false, fade = 0.3 } = {}) {
  const next = rig.actions[clip];
  if (!next || rig.current === clip) return next;
  rig.actions[rig.current]?.fadeOut(fade);
  next.reset().setLoop(once ? LoopOnce : LoopRepeat, Infinity);
  next.clampWhenFinished = once;
  next.timeScale = 1;
  next.fadeIn(fade).play();
  rig.current = clip;
  return next;
}

function createArmor(src: MeshStandardMaterial, uniforms: Armor) {
  // Igris's own sword and plume (not the Paladin's plate) keep their colour — the red plume is his signature
  const igris = !/Paladin/i.test(src.name);
  const m = new MeshStandardMaterial({
    map: src.map,
    normalMap: src.normalMap,
    color: igris ? IGRIS_TINT : SHADOW,
    metalness: igris ? 0.3 : 0.55,
    roughness: igris ? 0.55 : 0.4,
    envMapIntensity: 0.25,
    emissive: new Color(COLORS.arcane),
    emissiveIntensity: 0,
  });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vRiseY;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvRiseY = (modelMatrix * vec4(transformed, 1.0)).y;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying float vRiseY;
        uniform float uRise; uniform vec3 uEdge; uniform vec3 uStone; uniform float uGlow; uniform float uTime;
        float rHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        float wobble = (rHash(floor(gl_FragCoord.xy / 3.0)) - 0.5) * 0.12 + sin(vRiseY * 9.0 + uTime * 3.0) * 0.04;
        float shadowed = step(vRiseY + wobble, uRise);
        float seam = smoothstep(0.16, 0.0, abs(vRiseY + wobble - uRise));
        // stone: the armour's own detail, bleached to granite
        float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
        vec3 stone = uStone * (0.55 + lum * 0.9);
        diffuseColor.rgb = mix(stone, diffuseColor.rgb, shadowed);`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\nroughnessFactor = mix(0.95, roughnessFactor, shadowed);",
      )
      .replace(
        "#include <metalnessmap_fragment>",
        "#include <metalnessmap_fragment>\nmetalnessFactor = mix(0.0, metalnessFactor, shadowed);",
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float rim = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.4);
        totalEmissiveRadiance += (vec3(0.45, 0.3, 1.0) * rim * uGlow * 0.7) * shadowed + uEdge * seam;`,
      );
  };
  m.customProgramCacheKey = () => "shadow-armor";
  return m;
}

function Soldier({ quest, index }: { quest: Quest; index: number }) {
  const { scene, animations } = useGLTF(ASSETS.knight, ASSETS.draco);
  const holder = useRef<Group>(null);
  const skin = useRef<Object3D>(null);
  const burst = useRef<Group>(null);
  const flare = useRef<Mesh>(null);
  const rig = useRef<Rig | null>(null);
  const riseT = useRef(-1);
  const standUntil = useRef(0);
  const speed = useRef(0);

  const risen = useWorldStore((s) => s.risen.includes(quest.id));
  const rising = useWorldStore((s) => s.rising === quest.id);
  // floating ARISE tags only while standing in the nave; the open panel has its own buttons
  const nearCrypt = useWorldStore((s) => s.nearZone === "crypt" && s.panel === null);
  const phase = useWorldStore((s) => s.phase);
  const [state, setState] = useState<State>(risen ? "risen" : "fallen");
  const stateRef = useRef<State>(state);
  const slot = useWorldStore((s) => s.risen.indexOf(quest.id));
  const grave = graves[index % graves.length];

  // one skinned clone per knight; all its materials read the same seam
  const body = useMemo(() => {
    const copy = cloneSkinned(scene);
    const armor = createArmorUniforms();
    const made = new Map<string, MeshStandardMaterial>();
    copy.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      const src = mesh.material as MeshStandardMaterial;
      let m = made.get(src.uuid);
      if (!m) {
        m = createArmor(src, armor);
        made.set(src.uuid, m);
      }
      mesh.material = m;
      mesh.castShadow = true;
      mesh.frustumCulled = false;
    });
    copy.userData.armor = armor;
    return copy;
  }, [scene]);

  const sigil = useMemo(() => createSigilMaterial(COLORS.arcane), []);

  // rig up, then kneel on the grave as a statue — or stand in formation after a reload
  useEffect(() => {
    const h = holder.current;
    const b = skin.current;
    if (!h || !b) return;
    const mixer = new AnimationMixer(b);
    const actions: Rig["actions"] = {};
    for (const clip of animations) actions[clip.name as Clip] = mixer.clipAction(clip);
    const armor = b.userData.armor as Armor;
    const r: Rig = { mixer, actions, current: "Kneel", armor };
    if (stateRef.current === "risen") {
      armor.uRise.value = 20;
      h.position.set(live.hunter.x + (index - 2.5) * 1.2, 0, live.hunter.z + 2.6);
      actions.Idle?.play();
      r.current = "Idle";
    } else {
      armor.uRise.value = -10;
      h.position.set(grave.x, floorAt(grave.x, grave.z), grave.z);
      h.rotation.y = grave.yaw;
      // a statue: the kneel, frozen mid-breath
      const kneel = actions.Kneel;
      if (kneel) {
        kneel.play();
        kneel.time = 1.2 + index * 0.35;
        kneel.timeScale = 0;
      }
    }
    rig.current = r;
    return () => {
      mixer.stopAllAction();
      rig.current = null;
    };
  }, [body, animations, grave, index]);

  // the store says ARISE — the shadow climbs the statue, and it stands
  useEffect(() => {
    if (!rising || stateRef.current !== "fallen") return;
    stateRef.current = "rising";
    setState("rising");
    play("arise");
    duckMusic(3.5);
    addShake(0.5);
    kickAberration(1.4);
    riseT.current = 0;
  }, [rising]);

  useFrame(({ clock }, raw) => {
    const h = holder.current;
    const r = rig.current;
    if (!h || !r) return;
    const delta = Math.min(raw, 0.05);
    const t = clock.elapsedTime;
    const st = stateRef.current;

    // ── the extraction ──
    if (st === "rising") {
      riseT.current += delta;
      const k = Math.min(1, riseT.current / SWEEP);
      const ease = k * k * (3 - 2 * k);
      r.armor.uRise.value = h.position.y - 0.2 + ease * (KNIGHT_HEIGHT + 0.6);
      if (k >= 1 && r.current === "Kneel") {
        const stand = playClip(r, "StandUp", { once: true, fade: 0.15 });
        addShake(0.35);
        standUntil.current = t + (stand ? stand.getClip().duration - 0.35 : 0);
      }
      if (r.current === "StandUp" && t >= standUntil.current) {
        r.armor.uRise.value = 20;
        stateRef.current = "risen";
        setState("risen");
        playClip(r, "Idle", { fade: 0.4 });
        useWorldStore.getState().finishRising();
      }
    }

    // a slow breath in the shadow's rim
    r.armor.uGlow.value = st === "fallen" ? 0 : 0.8 + 0.3 * Math.sin(t * 1.7 + index);

    // ── risen: march after the Monarch in formation ──
    if (st === "risen") {
      const [ox, oz] = slotOffset(Math.max(0, slot));
      const hd = live.hunter.heading;
      const tx = live.hunter.x + ox * Math.cos(hd) + oz * Math.sin(hd);
      const tz = live.hunter.z - ox * Math.sin(hd) + oz * Math.cos(hd);
      const dx = tx - h.position.x;
      const dz = tz - h.position.z;
      const dist = Math.hypot(dx, dz);
      let want = 0;
      if (dist > 0.3) {
        want = Math.min(world.runSpeed * 1.05, dist * 1.8);
        const step = Math.min(dist, speed.current * delta);
        const [px, pz] = resolveMove(h.position.x + (dx / dist) * step, h.position.z + (dz / dist) * step, BODY_RADIUS);
        h.position.x = px;
        h.position.z = pz;
        h.rotation.y += wrapAngle(Math.atan2(dx, dz) - h.rotation.y) * Math.min(1, delta * 8);
      } else {
        // at rest: face the way the Monarch faces
        h.rotation.y += wrapAngle(hd - h.rotation.y) * Math.min(1, delta * 3);
      }
      speed.current += (want - speed.current) * Math.min(1, delta * 5);
      const v = speed.current;
      const clip: Clip = v > world.walkSpeed * 1.2 ? "Run" : v > 0.35 ? "Walk" : "Idle";
      playClip(r, clip, { fade: 0.25 });
      const action = r.actions[clip];
      if (action && (clip === "Walk" || clip === "Run")) action.timeScale = Math.min(1.6, Math.max(0.6, v / NATURAL[clip]));
      h.position.y += (floorAt(h.position.x, h.position.z, h.position.y + 1) - h.position.y) * Math.min(1, delta * 10);
    }

    r.mixer.update(delta);

    // the extraction circle flares while rising (glow + bloom — no real light: one per knight costs ~9 fps on an iGPU)
    const on = st === "rising";
    const k = on ? Math.min(1, riseT.current / (SWEEP + 0.6)) : 1;
    const glow = on ? Math.sin(k * Math.PI) : 0;
    if (burst.current) {
      burst.current.visible = on;
      burst.current.scale.setScalar(0.6 + k * 1.4);
    }
    const fm = flare.current?.material as ShaderMaterial | undefined;
    if (fm) fm.uniforms.uStrength.value = glow * 3;
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6 || stateRef.current !== "fallen") return;
    e.stopPropagation();
    useWorldStore.getState().arise(quest.id);
  };

  return (
    <group ref={holder} onClick={onClick}>
      <primitive ref={skin} object={body} scale={KNIGHT_SCALE} />

      <group ref={burst} visible={false}>
        <mesh ref={flare} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} material={sigil}>
          <planeGeometry args={[3.4, 3.4]} />
        </mesh>
        <Sparkles count={40} scale={[1.6, 3, 1.6]} position={[0, 1.4, 0]} size={4} speed={1.4} color={COLORS.arcaneHot} />
      </group>
      {state === "fallen" && phase === "world" && nearCrypt && (
        <Html position={[0, KNIGHT_HEIGHT * 0.78, 0]} center zIndexRange={[20, 0]}>
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
    </group>
  );
}

/** the Shadow Legion — each project is a knight turned to stone until the visitor commands ARISE */
export function ShadowLegion() {
  return (
    <>
      {quests.map((q, i) => (
        <Soldier key={q.id} quest={q} index={i} />
      ))}
    </>
  );
}
