"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group, Mesh, ShaderMaterial } from "three";
import type { ZoneDef } from "@/config/types";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { live, useWorldStore } from "@/store/world-store";
import { createBeamMaterial, toneColor } from "./assets";

interface ZoneMarkerProps {
  zone: ZoneDef;
  /** marker height above the landmark */
  height?: number;
}

/**
 * The beacon over every landmark: a light pillar you can see from
 * anywhere on the island, a spinning diamond, and a DOM label that
 * doubles as the click target (walk there → panel opens on arrival).
 */
export function ZoneMarker({ zone, height = 7 }: ZoneMarkerProps) {
  const color = toneColor[zone.tone];
  const beam = useMemo(() => createBeamMaterial(color), [color]);
  const gem = useRef<Mesh>(null);
  const beamMesh = useRef<Mesh>(null);
  const holder = useRef<Group>(null);
  const label = useRef<HTMLDivElement>(null);
  const visited = useWorldStore((s) => s.visited.includes(zone.id));
  const near = useWorldStore((s) => s.nearZone === zone.id);
  const open = useWorldStore((s) => s.panel === zone.id);
  const phase = useWorldStore((s) => s.phase);
  const goTo = useWorldStore((s) => s.goTo);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // the beam dims as the Hunter arrives — no pillar in your face
    const d = Math.hypot(live.hunter.x - zone.position[0], live.hunter.z - zone.position[1]);
    const strength = Math.min(1, Math.max(0.15, (d - zone.radius) / 12));
    const mat = beamMesh.current?.material as ShaderMaterial | undefined;
    if (mat) mat.uniforms.uStrength.value = open ? 0 : strength;
    if (gem.current) {
      gem.current.rotation.y = t * 1.2;
      gem.current.position.y = height + Math.sin(t * 1.6 + zone.position[0]) * 0.25;
    }
    if (label.current) label.current.style.opacity = open ? "0" : "1";
  });

  const Icon = zone.icon;

  return (
    <group ref={holder} position={[zone.position[0], 0, zone.position[1]]}>
      <mesh ref={beamMesh} position={[0, 11, 0]} material={beam}>
        <cylinderGeometry args={[0.9, 1.6, 22, 24, 1, true]} />
      </mesh>
      <mesh ref={gem} position={[0, height, 0]}>
        <octahedronGeometry args={[0.45, 0]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {phase === "world" && (
        <Html position={[0, height + 1.3, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div ref={label} className="transition-opacity duration-300">
            <button
              type="button"
              onClick={() => {
                play("click");
                goTo(zone.id);
              }}
              onPointerEnter={() => play("hover")}
              className={cn(
                "zone-tag pointer-events-auto group flex items-center gap-2 whitespace-nowrap px-3 py-1.5",
                near && "zone-tag--near",
              )}
              style={{ ["--tone" as string]: color }}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="font-display text-[10px] tracking-[0.2em]">{zone.name.toUpperCase()}</span>
              {!visited && <span className="zone-tag__new">NEW</span>}
            </button>
          </div>
        </Html>
      )}
    </group>
  );
}
