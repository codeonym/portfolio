"use client";

import { useLayoutEffect, useRef } from "react";
import { Object3D, type InstancedMesh } from "three";
import { ARCANE_PURPLE, SYSTEM_BLUE } from "./hologram-avatar";

/** two rows of hexagonal pillars receding into the fog */
const PILLARS: Array<{ x: number; z: number }> = [];
for (let i = 0; i < 6; i += 1) {
  const z = -4 - i * 3.4;
  PILLARS.push({ x: -8.2, z }, { x: 8.2, z });
}
const PILLAR_HEIGHT = 7;
/** floor level the colonnade stands on */
const FLOOR_Y = -3;

/**
 * The lobby colonnade: dark tapered hex pillars with a faint
 * wireframe lattice and a mana lamp burning at each tip — depth
 * markers that make the fog read as distance, not emptiness.
 */
export function PillarColonnade() {
  const solid = useRef<InstancedMesh>(null);
  const lattice = useRef<InstancedMesh>(null);
  const lamps = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const dummy = new Object3D();
    PILLARS.forEach(({ x, z }, i) => {
      dummy.position.set(x, FLOOR_Y + PILLAR_HEIGHT / 2, z);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      solid.current?.setMatrixAt(i, dummy.matrix);
      lattice.current?.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, FLOOR_Y + PILLAR_HEIGHT + 0.35, z);
      dummy.updateMatrix();
      lamps.current?.setMatrixAt(i, dummy.matrix);
    });
    for (const mesh of [solid, lattice, lamps]) {
      if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true;
    }
  }, []);

  return (
    <>
      <instancedMesh ref={solid} args={[undefined, undefined, PILLARS.length]}>
        <cylinderGeometry args={[0.45, 0.75, PILLAR_HEIGHT, 6]} />
        <meshBasicMaterial color="#0b101d" />
      </instancedMesh>
      <instancedMesh
        ref={lattice}
        args={[undefined, undefined, PILLARS.length]}
      >
        <cylinderGeometry args={[0.452, 0.752, PILLAR_HEIGHT, 6, 3]} />
        <meshBasicMaterial
          color={SYSTEM_BLUE}
          wireframe
          transparent
          opacity={0.14}
        />
      </instancedMesh>
      <instancedMesh ref={lamps} args={[undefined, undefined, PILLARS.length]}>
        <octahedronGeometry args={[0.18, 0]} />
        <meshBasicMaterial color={ARCANE_PURPLE} transparent opacity={0.9} />
      </instancedMesh>
    </>
  );
}
