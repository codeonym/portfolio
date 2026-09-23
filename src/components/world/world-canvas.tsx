"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, PerformanceMonitor, Preload, Stars } from "@react-three/drei";
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Vignette,
} from "@react-three/postprocessing";
import type { DirectionalLight } from "three";
import { zones } from "@/config/world.config";
import { live, useWorldStore, type Quality } from "@/store/world-store";
import { ASSETS, COLORS, shaderTime } from "./assets";
import { aberration, FollowCamera } from "./follow-camera";
import { Hunter } from "./hunter";
import { Island } from "./island";
import { ShadowLegion } from "./shadow-legion";
import { ZoneMarker } from "./zone-marker";
import { AwakeningCircle } from "./zones/awakening";
import { Armory, CryptSet, GuildHall, ShadowGate, Treasury } from "./zones/landmarks";

/** advances the shared shader clock once per frame */
function ShaderClock() {
  useFrame(({ clock }) => {
    shaderTime.value = clock.elapsedTime;
  });
  return null;
}

const DPR: Record<Quality, [number, number]> = {
  high: [1, 2],
  medium: [1, 1.5],
  low: [0.75, 1],
};

/** moonlight that tracks the Hunter so the shadow map stays tight and sharp */
function Moon({ shadows }: { shadows: boolean }) {
  const light = useRef<DirectionalLight>(null);
  useFrame(() => {
    const l = light.current;
    if (!l) return;
    l.position.set(live.hunter.x - 14, 26, live.hunter.z + 10);
    l.target.position.set(live.hunter.x, 0, live.hunter.z);
    l.target.updateMatrixWorld();
  });
  return (
    <directionalLight
      ref={light}
      color="#9db4ff"
      intensity={1.3}
      castShadow={shadows}
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-22}
      shadow-camera-right={22}
      shadow-camera-top={22}
      shadow-camera-bottom={-22}
      shadow-camera-near={1}
      shadow-camera-far={70}
      shadow-bias={-0.0004}
      shadow-normalBias={0.04}
    />
  );
}

function Effects({ quality }: { quality: Quality }) {
  if (quality === "low") return null;
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={quality === "high" ? 1.1 : 0.8} luminanceThreshold={0.62} luminanceSmoothing={0.3} />
      <ChromaticAberration offset={aberration} radialModulation modulationOffset={0.25} />
      <Vignette offset={0.18} darkness={0.78} />
    </EffectComposer>
  );
}

export function WorldCanvas() {
  const quality = useWorldStore((s) => s.quality);
  const setQuality = useWorldStore((s) => s.setQuality);
  const touch = useWorldStore((s) => s.touch);

  // first visit on a phone/tablet starts at medium; the monitor adjusts from there
  useEffect(() => {
    if (touch && useWorldStore.getState().quality === "high") setQuality("medium");
  }, [touch, setQuality]);

  const shadows = quality === "high";

  return (
    <div className="fixed inset-0 bg-[var(--void)]">
      <Canvas
        shadows={shadows}
        dpr={DPR[quality]}
        camera={{ position: [40, 26, 40], fov: 50, near: 0.3, far: 600 }}
        gl={{ antialias: quality !== "low", powerPreference: "high-performance" }}
      >
        <PerformanceMonitor
          flipflops={2}
          onDecline={() => {
            const q = useWorldStore.getState().quality;
            setQuality(q === "high" ? "medium" : "low");
          }}
        />
        <color attach="background" args={[COLORS.void]} />
        <fogExp2 attach="fog" args={[COLORS.fog, 0.0105]} />
        <hemisphereLight args={["#4b3d8f", "#07050f", 0.55]} />
        <ambientLight intensity={0.18} color="#6d5bd0" />
        <Moon shadows={shadows} />
        <ShaderClock />
        <FollowCamera />
        <Stars radius={260} depth={60} count={quality === "low" ? 1500 : 4000} factor={5} saturation={0.6} fade speed={0.4} />

        <Suspense fallback={null}>
          <Environment
            files={ASSETS.hdri}
            background
            backgroundIntensity={0.28}
            environmentIntensity={0.35}
            backgroundBlurriness={0.02}
          />
          <Island motes={quality === "low" ? 60 : 160} />
          <AwakeningCircle />
          <GuildHall />
          <CryptSet />
          <Armory />
          <Treasury />
          <ShadowGate />
          <ShadowLegion />
          <Hunter />
          {zones.map((z) => (
            <ZoneMarker key={z.id} zone={z} height={z.id === "gate" ? 16 : z.id === "awakening" ? 10 : 8} />
          ))}
          <Preload all />
        </Suspense>

        <Effects quality={quality} />
      </Canvas>
    </div>
  );
}
