"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import type { GridHelper } from "three";
import { SYSTEM_BLUE } from "./hologram-avatar";

/**
 * The lobby ground: a dark reflective slab — windows, gate glow and
 * the mana core smear across it like polished dungeon stone — with
 * the looping mana grid etched on top.
 */
export function LobbyFloor() {
  const grid = useRef<GridHelper>(null);

  useFrame((_, delta) => {
    // floor slides toward the camera and loops, like moving through a gate
    if (grid.current) {
      grid.current.position.z = (grid.current.position.z + delta * 0.4) % 2;
    }
  });

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.02, -6]}>
        <planeGeometry args={[90, 70]} />
        <MeshReflectorMaterial
          resolution={512}
          blur={[280, 90]}
          mixBlur={0.85}
          mixStrength={2.2}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.6}
          mirror={0.55}
          color="#0a0e1a"
          metalness={0.55}
          roughness={0.75}
        />
      </mesh>
      <gridHelper
        ref={grid}
        args={[80, 40, SYSTEM_BLUE, "#1c2a45"]}
        position={[0, -2.99, 0]}
      />
    </>
  );
}
