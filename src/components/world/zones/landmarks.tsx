"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { Color, MeshStandardMaterial, type Group, type Mesh, type ShaderMaterial } from "three";
import { skillCategories } from "@/config/skills.config";
import type { ZoneId } from "@/config/types";
import { zoneById } from "@/config/world.config";
import { play } from "@/lib/audio";
import { useWorldStore } from "@/store/world-store";
import { COLORS, createGlowMaterial, createPortalMaterial, forgedMaterials, toneColor } from "../assets";
import { zoneYaw } from "../colliders";
import { Forged, Kit, Prop, useForged } from "../models";

/** places children in a zone's local frame: origin at the zone, +z facing the island center */
function ZoneFrame({ zone, children }: { zone: ZoneId; children: ReactNode }) {
  const [x, z] = zoneById[zone].position;
  return (
    <group position={[x, 0, z]} rotation={[0, zoneYaw(zone), 0]}>
      {children}
    </group>
  );
}

/** click anything in a landmark → walk there / open its panel */
function useZoneClick(zone: ZoneId) {
  const goTo = useWorldStore((s) => s.goTo);
  return (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    play("click");
    goTo(zone);
  };
}

function Floor({ cols, rows, piece = "floor_tile_large" }: { cols: number[]; rows: number[]; piece?: string }) {
  return (
    <>
      {cols.flatMap((x) => rows.map((z) => <Kit key={`${x}:${z}`} name={piece} position={[x, 0.02, z]} />))}
    </>
  );
}

/** mounted torch with a flickering flame sprite (no real light — lights are budgeted) */
function Torch({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const flame = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const f = flame.current;
    if (!f) return;
    const t = clock.elapsedTime * 9 + position[0] * 3;
    f.scale.set(1 + Math.sin(t) * 0.12, 1 + Math.sin(t * 1.7) * 0.2, 1);
  });
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Kit name="torch_mounted" />
      <mesh ref={flame} position={[0, 0.85, 0.42]}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshBasicMaterial color={new Color(COLORS.arcaneHot).multiplyScalar(3)} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** a pool of light on the floor (and a soft haze above it) instead of a real light */
function LightPool({ color, radius = 7, strength = 1, position = [0, 0, 0] }: { color: string; radius?: number; strength?: number; position?: [number, number, number] }) {
  const mat = useMemo(() => createGlowMaterial(color, strength), [color, strength]);
  return (
    <mesh position={[position[0], 0.07, position[2]]} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
      <planeGeometry args={[radius * 2, radius * 2]} />
    </mesh>
  );
}

/* ── GUILD HALL — Experience & Education ───────────────────── */
export function GuildHall() {
  const onClick = useZoneClick("guild");
  const crest = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!crest.current) return;
    crest.current.rotation.y = clock.elapsedTime * 0.6;
    crest.current.position.y = 6.2 + Math.sin(clock.elapsedTime) * 0.2;
  });
  return (
    <ZoneFrame zone="guild">
      <group onClick={onClick}>
        <Floor cols={[-4, 0, 4]} rows={[-2, 2]} />
        <Kit name="wall_arched" position={[-4, 0, -4.5]} />
        <Kit name="wall" position={[0, 0, -4.5]} />
        <Kit name="wall_arched" position={[4, 0, -4.5]} />
        <Kit name="banner_triple_white" position={[0, 0.2, -4.4]} />
        <Kit name="banner_thin_white" position={[-4, 0.2, -4.4]} />
        <Kit name="banner_thin_white" position={[4, 0.2, -4.4]} />
        <Kit name="pillar_decorated" position={[-6.2, 0, -4.5]} />
        <Kit name="pillar_decorated" position={[6.2, 0, -4.5]} />
        <Kit name="wall_broken" position={[-6.4, 0, -1.4]} rotation={Math.PI / 2} />
        <Kit name="wall_cracked" position={[6.4, 0, -1.4]} rotation={-Math.PI / 2} />
        <Kit name="table_long_tablecloth_decorated_A" position={[-2.2, 0, 0.2]} />
        <Kit name="table_long_decorated_A" position={[2.2, 0, 0.2]} />
        {[-1.2, 1.2].map((z) => (
          <group key={z}>
            <Kit name="chair" position={[-3.5, 0, z]} rotation={Math.PI / 2} />
            <Kit name="chair" position={[3.5, 0, z]} rotation={-Math.PI / 2} />
          </group>
        ))}
        <Kit name="shelves" position={[-2, 0, -4]} />
        <Kit name="shelf_small_candles" position={[2, 2, -4]} />
      </group>
      <Torch position={[-2, 2.6, -4]} />
      <Torch position={[2, 2.6, -4]} />
      {/* the guild's crest, turning above the hall */}
      <group ref={crest} position={[0, 6.2, -4.5]}>
        <mesh material={forgedMaterials.gold}>
          <octahedronGeometry args={[0.7, 0]} />
        </mesh>
        <mesh material={forgedMaterials.gold} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.2, 0.07, 8, 48]} />
        </mesh>
      </group>
      <LightPool color={COLORS.gold} radius={8} position={[0, 0, -1]} />
      <Sparkles count={30} scale={[10, 5, 7]} position={[0, 3, -1]} size={2} speed={0.2} color={COLORS.gold} opacity={0.6} />
    </ZoneFrame>
  );
}

/* ── SHADOW CRYPT — the set; the fallen themselves live in shadow-legion ── */
export function CryptSet() {
  const onClick = useZoneClick("crypt");
  return (
    <ZoneFrame zone="crypt">
      <group onClick={onClick}>
        <Floor cols={[-4, 0, 4]} rows={[-2]} piece="floor_tile_big_grate" />
        <Floor cols={[-4, 0, 4]} rows={[2]} />
        <Kit name="pillar_decorated" position={[-5.5, 0, -4.5]} />
        <Kit name="pillar_decorated" position={[5.5, 0, -4.5]} />
        {/* the Shadow Monarch's throne, waiting at the head of the crypt */}
        <Prop name="throne" height={3.8} position={[0, 0, -6.4]} />
        <Kit name="rubble_large" position={[-2.6, 0, -6.8]} scale={0.6} />
        <Kit name="wall_broken" position={[-4.8, 0, -6.2]} rotation={0.3} />
        <Kit name="wall_cracked" position={[4.8, 0, -6.2]} rotation={-0.3} />
        {[
          [-6.4, 1.5],
          [6.4, 1.5],
          [-6.2, -2.5],
          [6.2, -2.5],
        ].map(([x, z]) => (
          <Kit key={`${x}${z}`} name="candle_triple" position={[x, 0, z]} />
        ))}
      </group>
      <LightPool color={COLORS.arcane} radius={9} strength={1.2} />
      {/* grave-mist rising off the grates */}
      <Sparkles count={70} scale={[12, 2.5, 10]} position={[0, 0.8, 0]} size={5} speed={0.15} color="#5b3fa8" opacity={0.45} />
    </ZoneFrame>
  );
}

/* ── ARMORY — Skills; one mana crystal per job-skill category ── */
function SkillCrystal({ index, total, tone }: { index: number; total: number; tone: string }) {
  const cluster = useForged("crystal_cluster");
  const ref = useRef<Group>(null);
  const mat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color(tone).multiplyScalar(0.45),
        emissive: new Color(tone),
        emissiveIntensity: 1.5,
        roughness: 0.12,
        metalness: 0.3,
        transparent: true,
        opacity: 0.92,
      }),
    [tone],
  );
  useMemo(() => {
    cluster?.traverse((n) => {
      if ((n as Mesh).isMesh) (n as Mesh).material = mat;
    });
  }, [cluster, mat]);
  const a = -0.9 + (index / (total - 1)) * 1.8;
  const x = Math.sin(a) * 4.2;
  const z = 1.2 - Math.cos(a) * 1.4;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.position.y = 0.6 + Math.sin(t * 1.3 + index) * 0.18;
    ref.current.rotation.y = t * 0.25 + index;
  });
  if (!cluster) return null;
  return (
    <group position={[x, 0, z]}>
      <Kit name="column" scale={[1, 0.4, 1]} />
      <group ref={ref} scale={0.55}>
        <primitive object={cluster} />
      </group>
    </group>
  );
}

export function Armory() {
  const onClick = useZoneClick("armory");
  const jobCats = skillCategories.filter((c) => c.set === "job");
  return (
    <ZoneFrame zone="armory">
      <group onClick={onClick}>
        <Floor cols={[-4, 0, 4]} rows={[-2, 2]} />
        <Kit name="wall" position={[-4, 0, -4.5]} />
        <Kit name="wall_pillar" position={[0, 0, -4.5]} />
        <Kit name="wall" position={[4, 0, -4.5]} />
        <Kit name="sword_shield_gold" position={[0, 2.4, -3.8]} />
        <Kit name="sword_shield" position={[-4, 2.3, -3.9]} />
        <Kit name="sword_shield" position={[4, 2.3, -3.9]} />
        <Kit name="barrel_large" position={[-5.6, 0, -0.5]} />
        <Kit name="crates_stacked" position={[5.6, 0, -0.5]} rotation={0.4} />
        <Kit name="box_stacked" position={[-6.4, 0, -3.2]} rotation={0.2} scale={0.7} />
        {jobCats.map((c, i) => (
          <SkillCrystal key={c.id} index={i} total={jobCats.length} tone={toneColor[c.tone]} />
        ))}
      </group>
      <Torch position={[-2, 2.6, -4]} />
      <Torch position={[2, 2.6, -4]} />
      <LightPool color={COLORS.ember} radius={8} position={[0, 0, -0.5]} />
    </ZoneFrame>
  );
}

/* ── TREASURY — Inventory & CV; the Hunter's License floats on a plinth ── */
export function Treasury() {
  const onClick = useZoneClick("treasury");
  const card = useRef<Group>(null);
  const nearZone = useWorldStore((s) => s.nearZone);
  const goTo = useWorldStore((s) => s.goTo);
  const openPanel = useWorldStore((s) => s.openPanel);
  const setInspect = useWorldStore((s) => s.setInspect);
  useFrame(({ clock }) => {
    if (!card.current) return;
    const t = clock.elapsedTime;
    card.current.rotation.y = t * 0.7;
    card.current.position.y = 2.7 + Math.sin(t * 1.4) * 0.15;
  });
  const onLicense = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    play("coins");
    if (nearZone !== "treasury") return goTo("treasury");
    openPanel("treasury");
    setInspect({ kind: "item", id: "hunter-license" });
  };
  return (
    <ZoneFrame zone="treasury">
      <group onClick={onClick}>
        <Floor cols={[-2, 2]} rows={[-2, 2]} />
        <Kit name="chest_gold" position={[0, 0, -2.6]} />
        <Kit name="chest" position={[-3.5, 0, -2.8]} rotation={0.35} />
        <Kit name="chest" position={[3.5, 0, -2.8]} rotation={-0.35} />
        <Kit name="coin_stack_large" position={[-1.9, 0, -3.4]} />
        <Kit name="coin_stack_medium" position={[1.9, 0, -3.2]} />
        <Kit name="coin_stack_medium" position={[-4.6, 0, -0.6]} />
        <Kit name="trunk_large_A" position={[4.6, 0, -0.4]} rotation={-0.6} />
        <Kit name="keyring_hanging" position={[0, 3.2, -3.4]} />
      </group>
      <group onClick={onLicense} position={[0, 0, 0.8]}>
        <Kit name="column" />
        <group ref={card} position={[0, 2.7, 0]}>
          <Forged name="license" scale={0.9} />
        </group>
      </group>
      <LightPool color={COLORS.gold} radius={7} strength={1.2} position={[0, 0, -1]} />
      <Sparkles count={40} scale={[8, 4, 6]} position={[0, 2, -1.5]} size={2.6} speed={0.3} color={COLORS.gold} />
    </ZoneFrame>
  );
}

/* ── SHADOW GATE — Contact; the forged rift with a vortex shader ── */
export function ShadowGate() {
  const onClick = useZoneClick("gate");
  const portal = useForged("gate_portal");
  const mat = useMemo(() => createPortalMaterial(), []);
  const open = useWorldStore((s) => s.panel === "gate");
  const rift = useRef<Group>(null);
  useMemo(() => {
    portal?.traverse((n) => {
      if ((n as Mesh).isMesh) (n as Mesh).material = mat;
    });
  }, [portal, mat]);
  // the rift flares while the Gate's panel is open
  useFrame((_, delta) => {
    const mesh = rift.current?.getObjectByProperty("isMesh", true) as Mesh | undefined;
    const u = (mesh?.material as ShaderMaterial | undefined)?.uniforms;
    if (!u) return;
    u.uPulse.value += ((open ? 1 : 0) - u.uPulse.value) * Math.min(1, delta * 2);
  });
  return (
    <ZoneFrame zone="gate">
      <group onClick={onClick}>
        <Forged name="gate" />
        <Prop name="gargoyle" height={2.6} position={[-6.3, 0, 3.4]} rotation={0.25} />
        <Prop name="gargoyle" height={2.6} position={[6.3, 0, 3.4]} rotation={-0.25} />
        <group ref={rift}>{portal && <primitive object={portal} />}</group>
      </group>
      <Sparkles count={90} scale={[10, 13, 4]} position={[0, 7.4, 1]} size={4} speed={0.8} color={COLORS.arcaneHot} />
      <pointLight color={COLORS.arcane} intensity={60} distance={26} decay={1.5} position={[0, 7, 3]} />
    </ZoneFrame>
  );
}
