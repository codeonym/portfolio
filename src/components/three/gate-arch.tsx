"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { AdditiveBlending, type ShaderMaterial } from "three";
import { ARCANE_PURPLE, SYSTEM_BLUE } from "./hologram-avatar";

const PORTAL_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// spiral mana bands swirling into the gate's dark center
const PORTAL_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float a = atan(p.y, p.x);
    float swirl = sin(a * 3.0 - uTime * 0.9 + r * 9.0);
    float bands = smoothstep(0.15, 0.95, swirl);
    float edge = smoothstep(1.0, 0.72, r);      // fade at the rim
    float throat = smoothstep(0.5, 0.05, r);    // dark center well
    vec3 blue = vec3(0.36, 0.70, 0.94);
    vec3 purple = vec3(0.62, 0.43, 1.0);
    vec3 col = mix(purple, blue, smoothstep(0.2, 1.0, r));
    float alpha = (bands * 0.30 + throat * 0.45) * edge;
    gl_FragColor = vec4(col, alpha);
  }
`;

interface GateArchProps {
  position?: [number, number, number];
}

/**
 * The Gate: a half-torus arch rising from the lobby floor with a
 * swirling portal shader inside it — the dungeon entrance every
 * lobby needs. Sits on the floor plane (group y = floor level).
 */
export function GateArch({ position = [3.4, -3, -11] }: GateArchProps) {
  const portal = useRef<ShaderMaterial>(null);

  useFrame(({ clock }) => {
    if (portal.current) {
      portal.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <group position={position}>
      {/* outer arch frame */}
      <mesh>
        <torusGeometry args={[3.6, 0.16, 12, 80, Math.PI]} />
        <meshBasicMaterial color={SYSTEM_BLUE} transparent opacity={0.55} />
      </mesh>
      {/* inner arcane lining */}
      <mesh>
        <torusGeometry args={[3.25, 0.06, 8, 80, Math.PI]} />
        <meshBasicMaterial color={ARCANE_PURPLE} transparent opacity={0.7} />
      </mesh>
      {/* pylon feet anchoring the arch to the floor */}
      {[-3.6, 3.6].map((x) => (
        <mesh key={x} position={[x, 0.5, 0]}>
          <boxGeometry args={[0.5, 1, 0.5]} />
          <meshBasicMaterial color="#101627" />
        </mesh>
      ))}
      {/* the portal surface */}
      <mesh position={[0, 0.4, -0.1]}>
        <circleGeometry args={[3.1, 64]} />
        <shaderMaterial
          ref={portal}
          vertexShader={PORTAL_VERTEX}
          fragmentShader={PORTAL_FRAGMENT}
          uniforms={{ uTime: { value: 0 } }}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      {/* mana leaking out of the gate */}
      <Sparkles
        count={50}
        scale={[6, 4.5, 2]}
        position={[0, 1.6, 0.6]}
        size={2.4}
        speed={0.5}
        color={ARCANE_PURPLE}
        opacity={0.7}
      />
      <pointLight
        color={ARCANE_PURPLE}
        intensity={9}
        distance={16}
        position={[0, 1.6, 1]}
      />
    </group>
  );
}
