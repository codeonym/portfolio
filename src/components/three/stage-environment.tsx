"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import type { GridHelper } from "three";
import { ARCANE_PURPLE, SYSTEM_BLUE } from "./hologram-avatar";

/**
 * The void around the Player: a grid floor receding into fog and
 * two drifting mana-dust fields (blue near, purple far) that give
 * the stage its parallax depth.
 */
export function StageEnvironment() {
  const grid = useRef<GridHelper>(null);

  useFrame((_, delta) => {
    // floor slides toward the camera and loops, like moving through a gate
    if (grid.current) {
      grid.current.position.z = (grid.current.position.z + delta * 0.4) % 2;
    }
  });

  return (
    <>
      <gridHelper
        ref={grid}
        args={[80, 40, SYSTEM_BLUE, "#1c2a45"]}
        position={[0, -3, 0]}
      />
      <Sparkles
        count={140}
        scale={[26, 12, 14]}
        size={1.6}
        speed={0.25}
        color={SYSTEM_BLUE}
        opacity={0.5}
      />
      <Sparkles
        count={60}
        scale={[30, 14, 20]}
        size={2.4}
        speed={0.15}
        color={ARCANE_PURPLE}
        opacity={0.35}
      />
    </>
  );
}
