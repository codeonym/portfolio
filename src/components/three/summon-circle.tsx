"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, type Group } from "three";
import { ARCANE_PURPLE, SYSTEM_BLUE } from "./hologram-avatar";

interface SummonCircleProps {
  position?: [number, number, number];
  radius?: number;
}

/**
 * A summoning circle etched into the floor under the Player:
 * concentric rings with counter-rotating rune arcs, the classic
 * "the System is holding something here" floor sigil.
 */
export function SummonCircle({
  position = [0, 0, 0],
  radius = 2.2,
}: SummonCircleProps) {
  const arcsA = useRef<Group>(null);
  const arcsB = useRef<Group>(null);

  useFrame((_, delta) => {
    if (arcsA.current) arcsA.current.rotation.z += delta * 0.35;
    if (arcsB.current) arcsB.current.rotation.z -= delta * 0.22;
  });

  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]}>
      {/* faint filled base */}
      <mesh>
        <circleGeometry args={[radius, 64]} />
        <meshBasicMaterial
          color={ARCANE_PURPLE}
          transparent
          opacity={0.05}
          depthWrite={false}
        />
      </mesh>
      {/* fixed boundary rings */}
      <mesh>
        <ringGeometry args={[radius * 0.96, radius, 96]} />
        <meshBasicMaterial
          color={SYSTEM_BLUE}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <ringGeometry args={[radius * 0.62, radius * 0.645, 96]} />
        <meshBasicMaterial
          color={ARCANE_PURPLE}
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      </mesh>
      {/* rotating rune arcs */}
      <group ref={arcsA}>
        {[0, 2.1, 4.2].map((angle) => (
          <mesh key={angle} rotation={[0, 0, angle]}>
            <torusGeometry args={[radius * 0.8, 0.014, 6, 48, 1.5]} />
            <meshBasicMaterial
              color={ARCANE_PURPLE}
              transparent
              opacity={0.75}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
        ))}
      </group>
      <group ref={arcsB}>
        {[0.6, 3.7].map((angle) => (
          <mesh key={angle} rotation={[0, 0, angle]}>
            <torusGeometry args={[radius * 0.5, 0.012, 6, 40, 2.2]} />
            <meshBasicMaterial
              color={SYSTEM_BLUE}
              transparent
              opacity={0.65}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
        ))}
      </group>
      {/* rune studs around the outer band */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(a) * radius * 0.88,
              Math.sin(a) * radius * 0.88,
              0.01,
            ]}
          >
            <octahedronGeometry args={[0.05, 0]} />
            <meshBasicMaterial
              color={SYSTEM_BLUE}
              transparent
              opacity={0.8}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
