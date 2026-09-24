"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles, useGLTF } from "@react-three/drei";
import {
  AdditiveBlending,
  Box3,
  Color,
  MeshStandardMaterial,
  Vector3,
  type Group,
  type Mesh,
} from "three";
import { zoneById } from "@/config/world.config";
import { live } from "@/store/world-store";
import { ASSETS, COLORS } from "../assets";
import { shrine } from "../colliders";
import { Forged, Prop } from "../models";

useGLTF.preload(ASSETS.wraith, ASSETS.draco);

const ZONE = zoneById.awakening;
const ALTAR_TOP = 1.9;
/** THE SYSTEM floats three times the Hunter's height — any taller and the follow camera crops its hood */
const WRAITH_HEIGHT = 6.4;
const WRAITH_HOVER = 0.4;

/**
 * THE SYSTEM's body — the Shadow Wraith, a giant hooded shadow hovering
 * over the altar. It slowly turns to watch the Hunter, and while the agent
 * is thinking its glow and the rune rings surge.
 */
function SystemWraith() {
  const root = useRef<Group>(null);
  const rings = useRef<Group>(null);
  const { scene } = useGLTF(ASSETS.wraith, ASSETS.draco);

  const { fit, mats } = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = WRAITH_HEIGHT / (size.y || 1);
    const list: MeshStandardMaterial[] = [];
    scene.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      const src = mesh.material as MeshStandardMaterial;
      // its own texture doubles as the glow mask: the pale seams and eyes burn violet
      const m = new MeshStandardMaterial({
        map: src.map,
        emissiveMap: src.map,
        color: new Color("#8f89b0"),
        emissive: new Color(COLORS.arcaneHot),
        emissiveIntensity: 0.55,
        roughness: 0.75,
        metalness: 0.2,
        side: src.side,
      });
      mesh.material = m;
      mesh.frustumCulled = false;
      list.push(m);
    });
    return {
      fit: { scale, offset: [-center.x * scale, -box.min.y * scale, -center.z * scale] as [number, number, number] },
      mats: list,
    };
  }, [scene]);

  // THE SYSTEM lives in this body: while the agent thinks, everything spins up
  const surge = useRef(1);
  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    surge.current += ((live.agentBusy ? 6 : 1) - surge.current) * Math.min(1, delta * 2.5);
    const k = surge.current;
    const g = root.current;
    if (g) {
      g.position.y = ALTAR_TOP + WRAITH_HOVER + Math.sin(t * 0.6 * Math.sqrt(k)) * 0.25 * Math.min(k, 2);
      // turn to watch the Hunter
      const want = Math.atan2(live.hunter.x - ZONE.position[0], live.hunter.z - ZONE.position[1]);
      let d = (want - g.rotation.y) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      g.rotation.y += d * Math.min(1, delta * 0.8);
    }
    for (const m of mats) m.setValues({ emissiveIntensity: 0.45 + 0.12 * Math.sin(t * 1.4) + (k - 1) * 0.18 });
    if (rings.current) {
      rings.current.children[0].rotation.z += delta * 0.3 * k;
      rings.current.children[1].rotation.z -= delta * 0.2 * k;
      rings.current.children[2].rotation.z += delta * 0.12 * k;
      rings.current.scale.setScalar(1 + (k - 1) * 0.03);
    }
  });

  return (
    <group ref={root} position={[0, ALTAR_TOP + WRAITH_HOVER, 0]}>
      <primitive object={scene} scale={fit.scale} position={fit.offset} />
      <group ref={rings} position={[0, WRAITH_HEIGHT * 0.42, 0]}>
        {[
          { r: 2.8, tilt: Math.PI / 2.3, c: COLORS.system, o: 0.5 },
          { r: 3.3, tilt: Math.PI / 1.75, c: COLORS.arcane, o: 0.38 },
          { r: 3.8, tilt: Math.PI / 2, c: COLORS.arcaneHot, o: 0.22 },
        ].map((ring, i) => (
          <mesh key={i} rotation={[ring.tilt, i * 0.6, 0]}>
            <torusGeometry args={[ring.r, 0.022, 8, 128]} />
            <meshBasicMaterial color={ring.c} transparent opacity={ring.o} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** rune sigil etched on the altar's top tier, counter-rotating arcs */
function Sigil({ radius = 2.45 }) {
  const a = useRef<Group>(null);
  const b = useRef<Group>(null);
  useFrame((_, delta) => {
    if (a.current) a.current.rotation.z += delta * 0.3;
    if (b.current) b.current.rotation.z -= delta * 0.2;
  });
  const mat = (color: string, opacity: number) => (
    <meshBasicMaterial color={color} transparent opacity={opacity} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
  );
  return (
    <group position={[0, 1.075, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[radius * 0.95, radius, 96]} />
        {mat(COLORS.system, 0.7)}
      </mesh>
      <group ref={a}>
        {[0, 2.1, 4.2].map((r) => (
          <mesh key={r} rotation={[0, 0, r]}>
            <torusGeometry args={[radius * 0.78, 0.02, 6, 48, 1.5]} />
            {mat(COLORS.arcaneHot, 0.9)}
          </mesh>
        ))}
      </group>
      <group ref={b}>
        {[0.6, 3.7].map((r) => (
          <mesh key={r} rotation={[0, 0, r]}>
            <torusGeometry args={[radius * 0.55, 0.018, 6, 40, 2.2]} />
            {mat(COLORS.system, 0.8)}
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** a brazier burning with the Monarch's violet fire (sprite flame — no real light) */
function Brazier({ x, z, yaw, seed }: { x: number; z: number; yaw: number; seed: number }) {
  const flame = useRef<Group>(null);
  useFrame(({ clock }) => {
    const f = flame.current;
    if (!f) return;
    const t = clock.elapsedTime * 8 + seed * 2.1;
    f.scale.set(1 + Math.sin(t) * 0.1, 1 + Math.sin(t * 1.6) * 0.22, 1 + Math.cos(t * 1.3) * 0.1);
  });
  return (
    <group position={[x, 0, z]}>
      <Prop name="brazier" height={1.25} rotation={yaw} />
      <group ref={flame} position={[0, 1.05, 0]}>
        <mesh position={[0, 0.42, 0]}>
          <coneGeometry args={[0.2, 0.95, 10, 1, true]} />
          <meshBasicMaterial color={COLORS.arcaneHot} transparent opacity={0.55} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <coneGeometry args={[0.12, 0.55, 8, 1, true]} />
          <meshBasicMaterial color={new Color(COLORS.system).multiplyScalar(2)} transparent opacity={0.8} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** the Double Dungeon's statues keep watch around the altar; braziers line every road */
function Shrine() {
  return (
    <>
      {shrine.angels.map((a, i) => (
        <Prop key={`a${i}`} name="angel" height={3.8} position={[a.x, 0, a.z]} rotation={a.yaw} />
      ))}
      {shrine.braziers.map((b, i) => (
        <Brazier key={`b${i}`} x={b.x} z={b.z} yaw={b.yaw} seed={i} />
      ))}
    </>
  );
}

export function AwakeningCircle() {
  return (
    <group position={[ZONE.position[0], 0, ZONE.position[1]]}>
      <Forged name="altar" />
      <Sigil />
      <SystemWraith />
      <Shrine />
      <Sparkles count={70} scale={[7, 11, 7]} position={[0, 6.5, 0]} size={3.4} speed={0.35} color={COLORS.arcaneHot} />
      <pointLight color={COLORS.arcane} intensity={40} distance={20} decay={1.6} position={[0, 5, 0]} />
    </group>
  );
}
