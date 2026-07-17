"use client";

import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { ParticleField } from "@/components/system/particle-field";
import { CameraRig } from "./camera-rig";
import { HologramAvatar } from "./hologram-avatar";
import { StageEnvironment } from "./stage-environment";

/**
 * The immersive 3D void behind the OS chrome: hologram avatar on the
 * left third (under the DOM caption), grid floor, mana dust, fog and
 * a pointer-swayed camera. Degrades to the 2D ParticleField when
 * WebGL is unavailable; reduced motion freezes to a single frame.
 */
export function SystemScene() {
  const reduced = useReducedMotion();

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <Canvas
        fallback={<ParticleField />}
        frameloop={reduced ? "demand" : "always"}
        camera={{ position: [0, 0.2, 8.5], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        eventSource={typeof document !== "undefined" ? document.body : undefined}
      >
        <fog attach="fog" args={["#0e1220", 9, 26]} />
        <CameraRig frozen={!!reduced} />
        <HologramAvatar position={[-3.3, 0.1, 0]} />
        <StageEnvironment />
      </Canvas>
    </div>
  );
}
