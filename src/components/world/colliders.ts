import { world, zoneById, zones } from "@/config/world.config";
import type { ZoneId } from "@/config/types";

/**
 * Circle colliders the Hunter slides around. Landmarks are authored in
 * zone-local space (front = +z, facing the island center), so their
 * blockers are declared the same way and transformed here once.
 */
export interface Circle {
  x: number;
  z: number;
  r: number;
}

/** yaw that turns a zone's local +z toward the island center */
export function zoneYaw(zone: ZoneId) {
  const [x, z] = zoneById[zone].position;
  if (Math.hypot(x, z) < 1) return 0;
  return Math.atan2(-x, -z);
}

/** zone-local [x, z] → world [x, z] */
export function zoneToWorld(zone: ZoneId, lx: number, lz: number): [number, number] {
  const [x, z] = zoneById[zone].position;
  const yaw = zoneYaw(zone);
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [x + lx * c + lz * s, z - lx * s + lz * c];
}

/**
 * The Awakening Circle's shrine, in its local frame: a brazier on each side
 * of every road leaving the circle, and a Double Dungeon angel standing
 * between each pair of roads, all facing the altar.
 */
export const shrine = (() => {
  // rune roads radiate from the world origin (island.tsx), so aim from there
  const [cx, cz] = zoneById.awakening.position;
  const roads = [
    ...zones.filter((z) => z.id !== "awakening").map((z) => Math.atan2(z.position[0], z.position[1])),
    // the way in from the spawn stays open too
    Math.atan2(world.spawn[0], world.spawn[1]),
  ].sort((a, b) => a - b);
  // the point `r` from the altar along the ray at angle `a` from the origin
  const at = (a: number, r: number) => {
    const dx = Math.sin(a);
    const dz = Math.cos(a);
    const b = dx * -cx + dz * -cz;
    const t = -b + Math.sqrt(b * b - (cx * cx + cz * cz - r * r));
    const x = dx * t - cx;
    const z = dz * t - cz;
    // face the altar
    return { x, z, yaw: Math.atan2(-x, -z) };
  };
  const braziers = roads.flatMap((a) => [at(a - 0.22, 7.6), at(a + 0.22, 7.6)]);
  const angels = roads.map((a, i) => {
    const next = roads[(i + 1) % roads.length] + (i === roads.length - 1 ? Math.PI * 2 : 0);
    return at((a + next) / 2, 10);
  });
  return { braziers, angels };
})();

const local: Record<ZoneId, Circle[]> = {
  awakening: [
    { x: 0, z: 0, r: 5.9 },
    ...shrine.braziers.map((b) => ({ x: b.x, z: b.z, r: 0.5 })),
    ...shrine.angels.map((a) => ({ x: a.x, z: a.z, r: 1.1 })),
  ],
  guild: [
    { x: -4, z: -4.2, r: 2.3 },
    { x: 0, z: -4.2, r: 2.3 },
    { x: 4, z: -4.2, r: 2.3 },
    { x: -6.2, z: -1.2, r: 1.8 },
    { x: 6.2, z: -1.2, r: 1.8 },
    { x: -2.2, z: 0.2, r: 1.4 },
    { x: 2.2, z: 0.2, r: 1.4 },
  ],
  crypt: [
    { x: -5.5, z: -4.5, r: 1.2 },
    { x: 5.5, z: -4.5, r: 1.2 },
    { x: 0, z: -6.4, r: 2.1 },
  ],
  armory: [
    { x: -3, z: -4, r: 2.2 },
    { x: 3, z: -4, r: 2.2 },
    { x: -5.6, z: -0.5, r: 1.4 },
    { x: 5.6, z: -0.5, r: 1.4 },
  ],
  treasury: [
    { x: 0, z: -2.6, r: 1.6 },
    { x: -3.5, z: -2.8, r: 1.3 },
    { x: 3.5, z: -2.8, r: 1.3 },
    { x: 0, z: 0.8, r: 0.9 },
  ],
  gate: [
    { x: 0, z: -0.5, r: 4.8 },
    { x: -6.3, z: 3.4, r: 1 },
    { x: 6.3, z: 3.4, r: 1 },
    { x: -7.6, z: 0, r: 1.3 },
    { x: 7.6, z: 0, r: 1.3 },
  ],
};

export const colliders: Circle[] = (Object.keys(local) as ZoneId[]).flatMap((zone) =>
  local[zone].map((c) => {
    const [x, z] = zoneToWorld(zone, c.x, c.z);
    return { x, z, r: c.r };
  }),
);
