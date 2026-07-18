"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { GridHelper } from "three";
import { SYSTEM_BLUE } from "./hologram-avatar";

/**
 * The legion's ground: the looping mana grid receding into fog.
 * (The v4.6 reflective slab was cut in v4.8 — it re-rendered the
 * whole scene every frame and the shadow army wants that budget.)
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
    <gridHelper
      ref={grid}
      args={[80, 40, SYSTEM_BLUE, "#1c2a45"]}
      position={[0, -2.99, 0]}
    />
  );
}
