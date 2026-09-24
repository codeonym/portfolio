import { Raycaster, Vector3, type Object3D } from "three";
import { world, zoneById } from "@/config/world.config";
import type { ZoneId } from "@/config/types";

/**
 * ── THE TEMPLE LAYOUT ─────────────────────────────────────────
 * Everything spatial about the hall that isn't content: its walkable
 * floor, the blockers the Hunter slides around, where the fallen knights
 * kneel, and how the camera frames each station. Pure data + math, so
 * the store and the HUD can use it too.
 *
 * World axes: +x east, -z north (the throne), +z south (the Gate).
 */
export interface Circle {
  x: number;
  z: number;
  r: number;
}

const { halfWidth, north, south } = world.hall;
/** the apse narrows behind the dais like an octagon */
const APSE_START = -11;

/** half-width of the walkable floor at depth z */
export function hallHalfWidth(z: number) {
  if (z >= APSE_START) return halfWidth;
  return Math.max(4.2, halfWidth - (APSE_START - z) * 0.55);
}

/** the floor plan as a polygon of [x, z] — minimap and temple map draw it */
export const HALL_OUTLINE: [number, number][] = (() => {
  const apseEnd = APSE_START - (halfWidth - 4.2) / 0.55;
  const right: [number, number][] = [
    [halfWidth, south],
    [halfWidth, APSE_START],
    [4.2, apseEnd],
    [4.2, north],
  ];
  return [...right, ...right.map(([x, z]): [number, number] => [-x, z]).reverse()];
})();

/** middle of the hall along z — maps centre on it */
export const HALL_CENTER_Z = (north + south) / 2;

/** keep a point on the hall floor */
export function clampToHall(x: number, z: number, margin = 0): [number, number] {
  const cz = Math.min(south - margin, Math.max(north + margin, z));
  const hw = hallHalfWidth(cz) - margin;
  return [Math.min(hw, Math.max(-hw, x)), cz];
}

/** the fallen knights kneel in two ranks on the nave's side floors, facing the carpet */
export const graves: { x: number; z: number; yaw: number }[] = [
  { x: -4.7, z: 6, yaw: Math.PI / 2 },
  { x: 4.7, z: 6, yaw: -Math.PI / 2 },
  { x: -4.7, z: 11.5, yaw: Math.PI / 2 },
  { x: 4.7, z: 11.5, yaw: -Math.PI / 2 },
  { x: -4.7, z: 17, yaw: Math.PI / 2 },
  { x: 4.7, z: 17, yaw: -Math.PI / 2 },
];

/** the hall's own furniture: the throne dais, statue plinths, fire bowls */
const architecture: Circle[] = [
  { x: 0, z: -8.8, r: 3.3 },
  { x: -4.8, z: -11.8, r: 1.3 },
  { x: 4.8, z: -11.8, r: 1.3 },
  { x: -7.4, z: 2, r: 1.25 },
  { x: 7.4, z: 2, r: 1.25 },
  { x: -7.4, z: -8.2, r: 0.8 },
  { x: 7.4, z: -8.2, r: 0.8 },
];

/** each station's prop blocks a small circle around the zone position */
const stations: Circle[] = (["guild", "armory", "treasury"] as ZoneId[]).map((id) => ({
  x: zoneById[id].position[0],
  z: zoneById[id].position[1],
  r: 0.9,
}));

export const colliders: Circle[] = [...architecture, ...stations];

/** kneeling knights block too, until they rise */
export const graveColliders: Circle[] = graves.map((g) => ({ x: g.x, z: g.z, r: 0.75 }));

/**
 * Slide a proposed position around the blockers and keep it on the floor.
 * `extra` lets callers add dynamic blockers (the still-fallen knights).
 */
export function resolveMove(px: number, pz: number, radius: number, extra: Circle[] = []): [number, number] {
  for (const list of [colliders, extra]) {
    for (const c of list) {
      const ox = px - c.x;
      const oz = pz - c.z;
      const d = Math.hypot(ox, oz);
      const min = c.r + radius;
      if (d < min && d > 0.0001) {
        px = c.x + (ox / d) * min;
        pz = c.z + (oz / d) * min;
      }
    }
  }
  return clampToHall(px, pz, radius);
}

/**
 * Focus shots: where the camera stands (and looks) while a station's
 * panel is open. The panel covers one side of the screen; the camera's
 * view offset shifts the frame clear of it.
 */
export const shots: Record<ZoneId, { pos: [number, number, number]; look: [number, number, number] }> = {
  awakening: { pos: [4.2, 2.4, 3.2], look: [0, 6, -11] },
  guild: { pos: [1.2, 3.4, 20.2], look: [6.4, 1.3, 24.4] },
  crypt: { pos: [0, 5.2, 24], look: [0, 1, 10] },
  armory: { pos: [-2.4, 3.3, -7.2], look: [-6.3, 1.5, -2.2] },
  treasury: { pos: [-1.2, 3.4, 20.2], look: [-6.2, 0.8, 24.4] },
  gate: { pos: [3, 3.6, 17.5], look: [0, 3.8, 28.4] },
};

/* ── floor height ───────────────────────────────────────────────
 * The hall's floor isn't flat (the sunken nave floors, the apse steps).
 * hall.tsx registers the floor meshes here; walkers ray-cast down. */
const floors: Object3D[] = [];
const ray = new Raycaster();
const down = new Vector3(0, -1, 0);
const origin = new Vector3();

export function registerFloor(obj: Object3D) {
  floors.push(obj);
  return () => {
    const i = floors.indexOf(obj);
    if (i >= 0) floors.splice(i, 1);
  };
}

/** floor height under (x, z), searched from `from` units up; 0 when unknown */
export function floorAt(x: number, z: number, from = 1.2) {
  if (!floors.length) return 0;
  origin.set(x, from, z);
  ray.set(origin, down);
  ray.far = from + 2;
  const hit = ray.intersectObjects(floors, false)[0];
  return hit ? hit.point.y : 0;
}
