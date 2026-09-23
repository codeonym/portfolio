"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles, useGLTF } from "@react-three/drei";
import {
  AdditiveBlending,
  AnimationMixer,
  Box3,
  LoopOnce,
  MeshBasicMaterial,
  Vector3,
  type AnimationAction,
  type Group,
  type Mesh,
} from "three";
import { zoneById } from "@/config/world.config";
import { live } from "@/store/world-store";
import { ASSETS, COLORS } from "../assets";
import { Forged } from "../models";

useGLTF.preload(ASSETS.hologram, ASSETS.draco);

const ZONE = zoneById.awakening;
const ALTAR_TOP = 1.9;
const HOLO_HEIGHT = 5.2;

/** the Player's own rig (Mixamo) projected above the altar as a two-tone hologram */
function PlayerHologram() {
  const holo = useRef<Group>(null);
  const rings = useRef<Group>(null);
  const mixer = useRef<AnimationMixer | null>(null);
  const { scene, animations } = useGLTF(ASSETS.hologram, ASSETS.draco);

  const fit = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const scale = HOLO_HEIGHT / (size.y || 1);
    let tone = 0;
    scene.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      mesh.material = new MeshBasicMaterial({
        color: tone % 2 === 0 ? COLORS.arcane : COLORS.system,
        wireframe: true,
        transparent: true,
        opacity: tone % 2 === 0 ? 0.34 : 0.55,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      mesh.frustumCulled = false;
      tone += 1;
    });
    return { scale, y: -box.min.y * scale };
  }, [scene]);

  // idle forever, with a wave or a glance around every 10–20 s
  useEffect(() => {
    const m = new AnimationMixer(scene);
    mixer.current = m;
    const actions: Record<string, AnimationAction> = {};
    for (const clip of animations) actions[clip.name] = m.clipAction(clip);
    actions.Idle?.play();
    const back = () => actions.Idle?.reset().fadeIn(0.5).play();
    m.addEventListener("finished", back);
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        const g = actions[Math.random() < 0.5 ? "Wave" : "LookAround"];
        if (g) {
          g.reset().setLoop(LoopOnce, 1);
          actions.Idle?.fadeOut(0.4);
          g.fadeIn(0.4).play();
        }
        schedule();
      }, 10000 + Math.random() * 10000);
    };
    schedule();
    return () => {
      window.clearTimeout(timer);
      m.removeEventListener("finished", back);
      m.stopAllAction();
      mixer.current = null;
    };
  }, [scene, animations]);

  // THE SYSTEM lives in this hologram: while the agent thinks, the rings spin up
  const surge = useRef(1);
  useFrame(({ clock }, delta) => {
    mixer.current?.update(Math.min(delta, 0.05));
    const t = clock.elapsedTime;
    surge.current += ((live.agentBusy ? 6 : 1) - surge.current) * Math.min(1, delta * 2.5);
    const k = surge.current;
    if (holo.current) holo.current.position.y = ALTAR_TOP + 0.3 + Math.sin(t * 0.8 * Math.sqrt(k)) * 0.12 * Math.min(k, 2);
    if (rings.current) {
      rings.current.children[0].rotation.z += delta * 0.3 * k;
      rings.current.children[1].rotation.z -= delta * 0.2 * k;
      rings.current.children[2].rotation.z += delta * 0.12 * k;
      rings.current.scale.setScalar(1 + (k - 1) * 0.03);
    }
  });

  return (
    <group ref={holo} position={[0, ALTAR_TOP, 0]} rotation={[0, 0, 0]}>
      <primitive object={scene} scale={fit.scale} position={[0, fit.y, 0]} />
      <group ref={rings} position={[0, HOLO_HEIGHT * 0.55, 0]}>
        {[
          { r: 2.6, tilt: Math.PI / 2.3, c: COLORS.system, o: 0.55 },
          { r: 3.1, tilt: Math.PI / 1.75, c: COLORS.arcane, o: 0.4 },
          { r: 3.6, tilt: Math.PI / 2, c: COLORS.arcaneHot, o: 0.25 },
        ].map((ring, i) => (
          <mesh key={i} rotation={[ring.tilt, i * 0.6, 0]}>
            <torusGeometry args={[ring.r, 0.018, 8, 128]} />
            <meshBasicMaterial color={ring.c} transparent opacity={ring.o} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** rune sigil etched on the altar's top tier, counter-rotating arcs */
function Sigil({ radius = 2.45 }) {
  const a = useRef<Group>(null);
  const b = useRef<Group>(null);
  useFrame((_, delta) => {
    if (a.current) a.current.rotation.z += delta * 0.3;
    if (b.current) b.current.rotation.z -= delta * 0.2;
  });
  const mat = (color: string, opacity: number) => (
    <meshBasicMaterial color={color} transparent opacity={opacity} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
  );
  return (
    <group position={[0, 1.075, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[radius * 0.95, radius, 96]} />
        {mat(COLORS.system, 0.7)}
      </mesh>
      <group ref={a}>
        {[0, 2.1, 4.2].map((r) => (
          <mesh key={r} rotation={[0, 0, r]}>
            <torusGeometry args={[radius * 0.78, 0.02, 6, 48, 1.5]} />
            {mat(COLORS.arcaneHot, 0.9)}
          </mesh>
        ))}
      </group>
      <group ref={b}>
        {[0.6, 3.7].map((r) => (
          <mesh key={r} rotation={[0, 0, r]}>
            <torusGeometry args={[radius * 0.55, 0.018, 6, 40, 2.2]} />
            {mat(COLORS.system, 0.8)}
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function AwakeningCircle() {
  return (
    <group position={[ZONE.position[0], 0, ZONE.position[1]]}>
      <Forged name="altar" />
      <Sigil />
      <PlayerHologram />
      <Sparkles count={50} scale={[5, 7, 5]} position={[0, 4.5, 0]} size={3} speed={0.35} color={COLORS.arcaneHot} />
      <pointLight color={COLORS.arcane} intensity={40} distance={20} decay={1.6} position={[0, 5, 0]} />
    </group>
  );
}
