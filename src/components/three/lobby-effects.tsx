"use client";

import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

/**
 * The lobby's light: bloom lifts every emissive — portal, mana
 * lamps, rune arcs, the core — into a glow, and the vignette pulls
 * the eye to center stage. Tuned subtle; the DOM HUD sits above
 * this canvas and must stay readable.
 */
export function LobbyEffects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        intensity={0.85}
        luminanceThreshold={0.25}
        luminanceSmoothing={0.4}
      />
      <Vignette offset={0.15} darkness={0.7} />
    </EffectComposer>
  );
}
