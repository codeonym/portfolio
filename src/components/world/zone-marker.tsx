"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Mesh } from "three";
import type { ZoneDef } from "@/config/types";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { useWorldStore } from "@/store/world-store";
import { toneColor } from "./assets";

interface ZoneMarkerProps {
  zone: ZoneDef;
  /** marker height above the landmark */
  height?: number;
}

/**
 * The marker over every station: a small spinning diamond and a DOM
 * label that doubles as the click target (walk there → panel opens on
 * arrival). The floor sigils do the rest of the wayfinding.
 */
export function ZoneMarker({ zone, height = 7 }: ZoneMarkerProps) {
  const color = toneColor[zone.tone];
  const gem = useRef<Mesh>(null);
  const label = useRef<HTMLDivElement>(null);
  const visited = useWorldStore((s) => s.visited.includes(zone.id));
  const near = useWorldStore((s) => s.nearZone === zone.id);
  const open = useWorldStore((s) => s.panel === zone.id);
  const phase = useWorldStore((s) => s.phase);
  const goTo = useWorldStore((s) => s.goTo);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (gem.current) {
      gem.current.visible = !open && phase === "world";
      gem.current.rotation.y = t * 1.2;
      gem.current.position.y = height + Math.sin(t * 1.6 + zone.position[0]) * 0.12;
    }
    if (label.current) label.current.style.opacity = open ? "0" : "1";
  });

  const Icon = zone.icon;

  return (
    <group position={[zone.position[0], 0, zone.position[1]]}>
      <mesh ref={gem} position={[0, height, 0]}>
        <octahedronGeometry args={[0.2, 0]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {phase === "world" && (
        <Html position={[0, height + 0.6, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
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
