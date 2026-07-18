"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import type { Group, Mesh } from "three";

/** System blue / arcane purple as plain hex for three materials. */
export const SYSTEM_BLUE = "#5cb2f0";
export const ARCANE_PURPLE = "#9e6eff";

interface HologramAvatarProps {
  position?: [number, number, number];
}

/**
 * The Player's mana core: a slowly breathing wireframe icosahedron
 * wrapped in counter-rotating shells and orbit rings. Abstract on
 * purpose — the humanoid GLTF avatar replaces the core mesh later.
 */
export function HologramAvatar({ position = [0, 0, 0] }: HologramAvatarProps) {
  const group = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const shell = useRef<Mesh>(null);
  const ringA = useRef<Mesh>(null);
  const ringB = useRef<Mesh>(null);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (core.current) {
      core.current.rotation.y += delta * 0.4;
      const breathe = 1 + Math.sin(t * 1.2) * 0.05;
      core.current.scale.setScalar(breathe);
    }
    if (shell.current) {
      shell.current.rotation.y -= delta * 0.15;
      shell.current.rotation.x += delta * 0.05;
    }
    if (ringA.current) ringA.current.rotation.z += delta * 0.25;
    if (ringB.current) ringB.current.rotation.z -= delta * 0.18;
    if (group.current) group.current.position.y = Math.sin(t * 0.8) * 0.12;
  });

  return (
    <group position={position}>
      <group ref={group}>
        {/* inner mana core */}
        <mesh ref={core}>
          <icosahedronGeometry args={[0.85, 1]} />
          <meshBasicMaterial color={ARCANE_PURPLE} wireframe transparent opacity={0.85} />
        </mesh>
        {/* outer containment shell */}
        <mesh ref={shell}>
          <icosahedronGeometry args={[1.45, 1]} />
          <meshBasicMaterial color={SYSTEM_BLUE} wireframe transparent opacity={0.28} />
        </mesh>
        {/* orbit rings, tilted like a gyroscope */}
        <mesh ref={ringA} rotation={[Math.PI / 2.4, 0, 0]}>
          <torusGeometry args={[1.9, 0.012, 8, 96]} />
          <meshBasicMaterial color={SYSTEM_BLUE} transparent opacity={0.5} />
        </mesh>
        <mesh ref={ringB} rotation={[Math.PI / 1.8, Math.PI / 5, 0]}>
          <torusGeometry args={[2.25, 0.008, 8, 96]} />
          <meshBasicMaterial color={ARCANE_PURPLE} transparent opacity={0.35} />
        </mesh>
        {/* mana dust hugging the core */}
        <Sparkles count={40} scale={3.4} size={2.2} speed={0.35} color={ARCANE_PURPLE} opacity={0.7} />
        <pointLight color={ARCANE_PURPLE} intensity={6} distance={9} />
      </group>
    </group>
  );
}
