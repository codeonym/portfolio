import { zoneById } from "@/config/world.config";
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

const local: Record<ZoneId, Circle[]> = {
  awakening: [{ x: 0, z: 0, r: 5.9 }],
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
    { x: 0, z: -6.5, r: 2.5 },
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
