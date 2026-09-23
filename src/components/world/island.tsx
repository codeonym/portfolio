"use client";

import { useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Sparkles, useTexture } from "@react-three/drei";
import {
  DoubleSide,
  RepeatWrapping,
  SRGBColorSpace,
  type Group,
  type Mesh,
} from "three";
import { world, zones } from "@/config/world.config";
import { useWorldStore, approachPoint } from "@/store/world-store";
import {
  ASSETS,
  COLORS,
  createPathMaterial,
  createPortalMaterial,
  toneColor,
} from "./assets";
import { Forged, useForged } from "./models";

const TOP_RADIUS = 32.4;

/** stone plateau — the only walkable surface; clicks here move the Hunter */
function Plateau() {
  const moveTo = useWorldStore((s) => s.moveTo);
  const tex = useTexture(ASSETS.stone, (loaded) => {
    for (const t of Object.values(loaded)) {
      t.wrapS = t.wrapT = RepeatWrapping;
      t.repeat.set(14, 14);
      t.anisotropy = 8;
    }
    loaded.map.colorSpace = SRGBColorSpace;
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    // a drag that ends on the ground is a camera orbit, not a move order
    if (e.delta > 6) return;
    e.stopPropagation();
    moveTo(e.point.x, e.point.z);
  };

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={onClick}>
      <circleGeometry args={[TOP_RADIUS, 96]} />
      <meshStandardMaterial
        {...tex}
        color="#6f6a88"
        roughness={1}
        metalness={0}
        normalScale={[1.2, 1.2]}
      />
    </mesh>
  );
}

/** the pulsing ring where the Hunter was ordered to walk */
function MoveMarker() {
  const target = useWorldStore((s) => s.target);
  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    const k = (clock.elapsedTime * 1.6) % 1;
    ring.current.scale.setScalar(0.6 + k * 0.8);
    (ring.current.material as { opacity: number }).opacity = 1 - k;
  });
  if (!target) return null;
  return (
    <mesh ref={ring} position={[target[0], 0.06, target[1]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.55, 0.7, 40]} />
      <meshBasicMaterial color={COLORS.system} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

/** rune roads: energy flowing from the Awakening Circle out to every zone */
function RuneRoads() {
  const roads = useMemo(
    () =>
      zones
        .filter((z) => z.id !== "awakening")
        .map((z) => {
          const [ex, ez] = approachPoint(z.id);
          const len0 = Math.hypot(ex, ez);
          // start at the altar's edge
          const sx = (ex / len0) * 7.2;
          const sz = (ez / len0) * 7.2;
          const dx = ex - sx;
          const dz = ez - sz;
          const mat = createPathMaterial(toneColor[z.tone]);
          mat.side = DoubleSide;
          return {
            id: z.id,
            mid: [(sx + ex) / 2, 0.04, (sz + ez) / 2] as [number, number, number],
            yaw: Math.atan2(dx, dz),
            length: Math.hypot(dx, dz),
            mat,
          };
        }),
    [],
  );
  return (
    <>
      {roads.map((r) => (
        <group key={r.id} position={r.mid} rotation={[0, r.yaw, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={r.mat}>
            <planeGeometry args={[1.3, r.length]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** obelisks around the rim, every one humming at its own pace */
function RimObelisks() {
  const count = 14;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + 0.11;
        const r = world.islandRadius + 0.2;
        return (
          <Forged
            key={i}
            name="obelisk"
            position={[Math.sin(a) * r, 0, Math.cos(a) * r]}
            rotation={a}
            scale={0.75 + ((i * 37) % 5) * 0.08}
          />
        );
      })}
    </>
  );
}

/** debris ripped up with the island, drifting in slow orbits */
function Debris() {
  const group = useRef<Group>(null);
  const rocks = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2 + Math.sin(i * 12.9) * 0.3;
        const r = 38 + ((i * 53) % 17);
        return {
          name: ["rock_a", "rock_b", "rock_c"][i % 3],
          x: Math.sin(a) * r,
          z: Math.cos(a) * r,
          y: -6 + ((i * 29) % 16),
          s: 1.2 + ((i * 17) % 7) * 0.45,
          phase: i * 1.7,
        };
      }),
    [],
  );
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.rotation.y = t * 0.012;
    g.children.forEach((child, i) => {
      const rock = rocks[i];
      child.position.y = rock.y + Math.sin(t * 0.4 + rock.phase) * 0.8;
      child.rotation.y = t * 0.05 + rock.phase;
    });
  });
  return (
    <group ref={group}>
      {rocks.map((r, i) => (
        <Forged key={i} name={r.name} position={[r.x, r.y, r.z]} scale={r.s} />
      ))}
    </group>
  );
}

/** a colossal Gate torn open in the northern sky — the world's backdrop */
function SkyRift() {
  const portal = useForged("gate_portal");
  const mat = useMemo(() => createPortalMaterial("#6d28d9", "#f0abfc", 0.35), []);
  useMemo(() => {
    portal?.traverse((n) => {
      if ((n as Mesh).isMesh) (n as Mesh).material = mat;
    });
  }, [portal, mat]);
  if (!portal) return null;
  return <primitive object={portal} position={[20, 40, -170]} scale={[7, 5.5, 7]} rotation={[0.18, -0.12, 0.35]} />;
}

export function Island({ motes = 160 }: { motes?: number }) {
  return (
    <group>
      <Plateau />
      <Forged name="island_rock" position={[0, -0.02, 0]} />
      <Forged name="island_veins" position={[0, -0.02, 0]} />
      <MoveMarker />
      <RuneRoads />
      <RimObelisks />
      <Debris />
      <SkyRift />
      <Sparkles count={motes} scale={[70, 14, 70]} position={[0, 5, 0]} size={3} speed={0.25} color={COLORS.arcaneHot} opacity={0.55} />
      <Sparkles count={Math.round(motes / 3)} scale={[60, 6, 60]} position={[0, 1.5, 0]} size={1.6} speed={0.4} color={COLORS.system} opacity={0.5} />
    </group>
  );
}
