"use client";

import { Suspense, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor, Preload } from "@react-three/drei";
import {
  Bloom,
  BrightnessContrast,
  ChromaticAberration,
  EffectComposer,
  HueSaturation,
  N8AO,
  Noise,
  SMAA,
  Vignette,
} from "@react-three/postprocessing";
import { ACESFilmicToneMapping } from "three";
import { zones } from "@/config/world.config";
import { useWorldStore, type Quality } from "@/store/world-store";
import { COLORS, shaderTime } from "./assets";
import { aberration, FollowCamera } from "./follow-camera";
import { Hall } from "./hall";
import { Hunter } from "./hunter";
import { ShadowLegion } from "./shadow-legion";
import { Stations } from "./stations";
import { Wraith } from "./wraith";
import { ZoneMarker } from "./zone-marker";

/** advances the shared shader clock once per frame */
function ShaderClock() {
  useFrame(({ clock }) => {
    shaderTime.value = clock.elapsedTime;
  });
  return null;
}

/** `?quality=high|medium|low` pins the tier and turns the auto-tuner off (for profiling) */
function pinnedQuality(): Quality | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search).get("quality");
  return q === "high" || q === "medium" || q === "low" ? q : null;
}

const DPR: Record<Quality, [number, number]> = {
  high: [1, 2],
  medium: [1, 1.5],
  low: [0.75, 1],
};

/**
 * Moonlight through the east windows: one shadow-casting key light, so the
 * walls throw the window shapes across the floor. The shadow camera covers
 * the whole hall once — it never has to follow anyone.
 */
function Moon({ shadows }: { shadows: boolean }) {
  return (
    <directionalLight
      color="#9fb0ff"
      intensity={1.6}
      position={[18, 24, 2]}
      castShadow={shadows}
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-30}
      shadow-camera-right={30}
      shadow-camera-top={30}
      shadow-camera-bottom={-30}
      shadow-camera-near={1}
      shadow-camera-far={80}
      shadow-bias={-0.0005}
      shadow-normalBias={0.05}
    />
  );
}

/** reflections only: a dark studio of cold strips, so armour and stone catch highlights */
function Reflections() {
  return (
    <Environment resolution={128} frames={1}>
      <color attach="background" args={["#05040b"]} />
      <Lightformer intensity={0.6} color="#8f96c8" position={[0, 10, -20]} scale={[20, 6, 1]} />
      <Lightformer intensity={0.7} color="#9fb4ff" position={[20, 8, 0]} rotation-y={-Math.PI / 2} scale={[40, 3, 1]} />
      <Lightformer intensity={0.6} color="#ff9a5a" position={[-20, 4, 0]} rotation-y={Math.PI / 2} scale={[40, 2, 1]} />
    </Environment>
  );
}

function Effects({ quality }: { quality: Quality }) {
  if (quality === "low") return null;
  const high = quality === "high";
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {/* contact shadows under every statue and step — the priciest pass, so high only, at half resolution */}
      {high ? <N8AO aoRadius={1.2} intensity={2.4} distanceFalloff={0.6} quality="performance" halfRes /> : <></>}
      <Bloom mipmapBlur intensity={high ? 0.9 : 0.75} luminanceThreshold={0.72} luminanceSmoothing={0.25} radius={0.7} />
      <HueSaturation saturation={-0.12} />
      <BrightnessContrast brightness={0.02} contrast={0.12} />
      <ChromaticAberration offset={aberration} radialModulation modulationOffset={0.3} />
      <Vignette offset={0.22} darkness={0.72} />
      <Noise opacity={0.035} premultiply />
      {high ? <SMAA /> : <></>}
    </EffectComposer>
  );
}

export function WorldCanvas() {
  const quality = useWorldStore((s) => s.quality);
  const setQuality = useWorldStore((s) => s.setQuality);
  const touch = useWorldStore((s) => s.touch);
  const phase = useWorldStore((s) => s.phase);

  // first visit on a phone/tablet starts at medium; the monitor adjusts from there
  useEffect(() => {
    const pinned = pinnedQuality();
    if (pinned) setQuality(pinned);
    else if (touch && useWorldStore.getState().quality === "high") setQuality("medium");
  }, [touch, setQuality]);

  const shadows = quality !== "low";

  return (
    <div className="fixed inset-0 bg-[var(--void)]">
      <Canvas
        shadows={shadows}
        dpr={DPR[quality]}
        camera={{ position: [0, 3.6, 21], fov: 48, near: 0.2, far: 160 }}
        gl={{ antialias: false, powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        {/* judged only in the world: shader compiles while loading are not the GPU's steady state.
            Steps down only under ~35 fps — a steady 45 on high is a fine experience. */}
        {phase === "world" && !pinnedQuality() && (
          <PerformanceMonitor
            flipflops={2}
            bounds={() => [35, 60]}
            onDecline={() => {
              // a backgrounded tab starves rAF — that is not the GPU struggling
              if (document.hidden) return;
              const q = useWorldStore.getState().quality;
              setQuality(q === "high" ? "medium" : "low");
            }}
          />
        )}
        <color attach="background" args={[COLORS.void]} />
        <fogExp2 attach="fog" args={["#07060f", 0.024]} />
        <hemisphereLight args={["#2c3060", "#0a0710", 0.3]} />
        <Moon shadows={shadows} />
        <ShaderClock />
        <FollowCamera />

        <Suspense fallback={null}>
          <Reflections />
          <Hall quality={quality} />
          <Wraith />
          <Stations />
          <ShadowLegion />
          <Hunter />
          {zones.map((z) => (
            <ZoneMarker key={z.id} zone={z} height={z.id === "gate" ? 9.6 : z.id === "awakening" ? 9.8 : 3.4} />
          ))}
          <Preload all />
        </Suspense>

        <Effects quality={quality} />
      </Canvas>
    </div>
  );
}
