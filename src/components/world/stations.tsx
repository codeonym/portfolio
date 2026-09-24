"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles, useGLTF } from "@react-three/drei";
import {
  AnimationMixer,
  Box3,
  Color,
  LoopOnce,
  Vector3,
  type AnimationAction,
  type Group,
  type Material,
  type Mesh,
  type Object3D,
  type ShaderMaterial,
} from "three";
import type { ZoneId } from "@/config/types";
import { zoneById } from "@/config/world.config";
import { useWorldStore } from "@/store/world-store";
import { ASSETS, COLORS, createPortalMaterial, createSigilMaterial, toneColor, type PropName } from "./assets";

for (const url of Object.values(ASSETS.props)) useGLTF.preload(url, ASSETS.draco);

type Vec3 = [number, number, number];
const PROP_TINT = new Color("#b4aecb");
const tinted = new WeakSet<Object3D>();

/** fit a prop to `height`, standing on its footprint's centre */
function useFitted(name: PropName, height: number) {
  const { scene, animations } = useGLTF(ASSETS.props[name], ASSETS.draco);
  return useMemo(() => {
    if (!tinted.has(scene)) {
      tinted.add(scene);
      scene.traverse((node) => {
        const mesh = node as Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mat = mesh.material as Material & { color?: Color };
        mat.color?.multiply(PROP_TINT);
      });
    }
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const s = height / (size.y || 1);
    return { scene, animations, scale: s, offset: [-center.x * s, -box.min.y * s, -center.z * s] as Vec3 };
  }, [scene, animations, height]);
}

function Prop({ name, height, position, rotation = [0, 0, 0] }: { name: PropName; height: number; position?: Vec3; rotation?: Vec3 }) {
  const fit = useFitted(name, height);
  return (
    <group position={position} rotation={rotation}>
      <primitive object={fit.scene} scale={fit.scale} position={fit.offset} />
    </group>
  );
}

/** the rune circle every station stands on, brighter while the Hunter is near */
function Sigil({ zone, size = 3.6 }: { zone: ZoneId; size?: number }) {
  const mat = useMemo(() => createSigilMaterial(toneColor[zoneById[zone].tone]), [zone]);
  const mesh = useRef<Mesh>(null);
  useFrame((_, delta) => {
    const m = mesh.current?.material as ShaderMaterial | undefined;
    if (!m) return;
    const { nearZone, panel } = useWorldStore.getState();
    const want = panel === zone ? 1.8 : nearZone === zone ? 1.3 : 0.55;
    m.uniforms.uStrength.value += (want - m.uniforms.uStrength.value) * Math.min(1, delta * 3);
  });
  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} material={mat} renderOrder={3}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
}

function at(zone: ZoneId): Vec3 {
  const [x, z] = zoneById[zone].position;
  return [x, 0, z];
}

/** Guild Hall — the ledger of every contract, open on a marble lectern */
function Guild() {
  return (
    <group position={at("guild")} rotation={[0, -Math.PI / 2 - 0.35, 0]}>
      <Sigil zone="guild" />
      <Prop name="lectern" height={1.55} />
      <Sparkles count={14} scale={[0.9, 0.6, 0.9]} position={[0, 1.8, 0]} size={2} speed={0.4} color="#ffd9a0" />
    </group>
  );
}

/** Armory — a relic blade turning slowly above its circle */
function Armory() {
  const blade = useRef<Group>(null);
  useFrame(({ clock }) => {
    const b = blade.current;
    if (!b) return;
    const t = clock.elapsedTime;
    b.rotation.y = t * 0.35;
    b.position.y = 1.45 + Math.sin(t * 1.1) * 0.08;
  });
  return (
    <group position={at("armory")}>
      <Sigil zone="armory" />
      <group ref={blade}>
        {/* point down, hilt up — a sword offered, not drawn */}
        <Prop name="sword" height={2.3} position={[0, -1.1, 0]} />
      </group>
    </group>
  );
}

/** Treasury — the chest opens while its panel is open */
function Treasury() {
  const chest = useFitted("chest", 1.05);
  const lid = useRef<Group>(null);
  const rig = useRef<{ mixer: AnimationMixer; action: AnimationAction | null; dir: number } | null>(null);

  // the lid's clip is played forward to open and backward to close
  useEffect(() => {
    const root = lid.current;
    const clip = chest.animations[0];
    if (!root) return;
    const mixer = new AnimationMixer(root);
    const action = clip ? mixer.clipAction(clip, root.children[0]) : null;
    action?.setLoop(LoopOnce, 1).play();
    if (action) {
      action.clampWhenFinished = true;
      action.paused = true;
    }
    rig.current = { mixer, action, dir: -1.5 };
    return () => {
      mixer.stopAllAction();
      rig.current = null;
    };
  }, [chest]);

  useFrame((_, delta) => {
    const r = rig.current;
    if (!r?.action) return;
    const want = useWorldStore.getState().panel === "treasury" ? 1 : -1.5;
    if (r.dir !== want) {
      r.dir = want;
      r.action.paused = false;
      r.action.timeScale = want;
      r.action.play();
    }
    r.mixer.update(delta);
  });

  return (
    <group position={at("treasury")} rotation={[0, Math.PI / 2 + 0.35, 0]}>
      <Sigil zone="treasury" />
      <group ref={lid}>
        <primitive object={chest.scene} scale={chest.scale} position={chest.offset} />
      </group>
      <Prop name="coins" height={0.32} position={[0.2, 0, 0.95]} rotation={[0, 0.8, 0]} />
    </group>
  );
}

/** the Shadow Gate — a rift filling the temple's south doorway; step close to reach the Player */
function Gate() {
  const portal = useMemo(() => createPortalMaterial(COLORS.arcane, COLORS.system, 0.6), []);
  const rift = useRef<Mesh>(null);
  useFrame((_, delta) => {
    const m = rift.current?.material as ShaderMaterial | undefined;
    if (!m) return;
    const near = useWorldStore.getState().nearZone === "gate";
    const u = m.uniforms.uPulse;
    u.value += ((near ? 0.6 : 0) - u.value) * Math.min(1, delta * 2);
  });
  const [x, , z] = at("gate");
  return (
    <group position={[x, 0, z]}>
      <mesh ref={rift} position={[0, 4.4, 0.6]} scale={[6.6, 8.6, 1]} material={portal} renderOrder={4}>
        <circleGeometry args={[0.5, 64]} />
      </mesh>
      <group position={[0, 0, -2.8]}>
        <Sigil zone="gate" size={4.4} />
      </group>
      <pointLight color={COLORS.arcane} intensity={24} distance={14} decay={1.6} position={[0, 3.5, -1.2]} />
      <Sparkles count={50} scale={[6, 8, 2]} position={[0, 4.2, 0]} size={3} speed={0.6} color={COLORS.system} />
    </group>
  );
}

/** the dais sigil under the throne — where the Hunter speaks with THE SYSTEM */
function Dais() {
  const [x, , z] = at("awakening");
  return (
    <group position={[x, 0, z + 4.1]}>
      <Sigil zone="awakening" size={3.2} />
    </group>
  );
}

/** every station — lit by the hall's torches and their own sigils; no extra real lights (the big fill cost) */
export function Stations() {
  return (
    <>
      <Guild />
      <Armory />
      <Treasury />
      <Gate />
      <Dais />
    </>
  );
}
