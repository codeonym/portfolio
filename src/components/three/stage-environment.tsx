"use client";

import { Sparkles } from "@react-three/drei";
import { ARCANE_PURPLE, SYSTEM_BLUE } from "./hologram-avatar";
import { GateArch } from "./gate-arch";
import { LobbyFloor } from "./lobby-floor";
import { PillarColonnade } from "./pillar-colonnade";
import { SummonCircle } from "./summon-circle";

/**
 * The game lobby around the Player: reflective floor, the Gate,
 * pillar colonnades receding into fog, a summoning circle under
 * the mana core, and two drifting mana-dust fields for parallax.
 */
export function StageEnvironment() {
  return (
    <>
      <LobbyFloor />
      <GateArch position={[3.4, -3, -11]} />
      <PillarColonnade />
      {/* sigil under the Player's core, just above the floor */}
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
