"use client";

import { Suspense } from "react";
import { Sparkles } from "@react-three/drei";
import { ARCANE_PURPLE, SYSTEM_BLUE } from "./hologram-avatar";
import { LobbyFloor } from "./lobby-floor";
import { ShadowArmy } from "./shadow-army";
import { SummonCircle } from "./summon-circle";

/**
 * The Monarch's stage: the mana grid floor, the summoning circle
 * under the Player, the shadow legion arrayed behind him, and two
 * drifting mana-dust fields for parallax. (The v4.6 gate, pillars
 * and reflective slab were traded for the army in v4.8.)
 */
export function StageEnvironment() {
  return (
    <>
      <LobbyFloor />
      {/* the legion rises once the shared rig streams in */}
      <Suspense fallback={null}>
        <ShadowArmy />
      </Suspense>
      {/* sigil under the Monarch, just above the floor */}
      <SummonCircle position={[-3.3, -2.96, 0]} radius={2.2} />
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
