"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles, useAnimations, useGLTF } from "@react-three/drei";
import {
  AdditiveBlending,
  Box3,
  LoopOnce,
  MeshBasicMaterial,
  Vector3,
  type Group,
  type Mesh,
} from "three";
import { ARCANE_PURPLE, SYSTEM_BLUE } from "./hologram-avatar";

const MODEL = "/models/player.glb";
/** self-hosted draco decoder (copied from three's examples) */
const DRACO = "/draco/";
/** world height of the projected Player */
const TARGET_HEIGHT = 3.2;
/** seconds between random gesture breaks (min, spread) */
const GESTURE_EVERY = [12, 12] as const;
const GESTURES = ["Wave", "LookAround"] as const;

useGLTF.preload(MODEL, DRACO);

interface PlayerAvatarProps {
  /** floor point the Player stands on (the summon circle) */
  position?: [number, number, number];
}

/**
 * The Player: the Mixamo-rigged humanoid projected as a two-tone
 * wireframe hologram above the summon circle. Idles forever,
 * occasionally waving or glancing around, wrapped in the same
 * orbit rings the mana core wore.
 */
export function PlayerAvatar({ position = [0, 0, 0] }: PlayerAvatarProps) {
  const holo = useRef<Group>(null);
  const ringA = useRef<Mesh>(null);
  const ringB = useRef<Mesh>(null);

  const { scene, animations } = useGLTF(MODEL, DRACO);
  const { actions, mixer } = useAnimations(animations, scene);

  // normalize the rig: feet on y=0, TARGET_HEIGHT tall, holo materials
  const fit = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const scale = TARGET_HEIGHT / (size.y || 1);
    let tone = 0;
    scene.traverse((node) => {
      const mesh = node as Mesh;
      if (mesh.isMesh) {
        // two-tone hologram: surface arcane, joints system blue
        mesh.material = new MeshBasicMaterial({
          color: tone % 2 === 0 ? ARCANE_PURPLE : SYSTEM_BLUE,
          wireframe: true,
          transparent: true,
          opacity: tone % 2 === 0 ? 0.32 : 0.5,
          blending: AdditiveBlending,
          depthWrite: false,
        });
        tone += 1;
        // scaled skinned meshes get culled wrongly
        mesh.frustumCulled = false;
      }
    });
    return { scale, yOffset: -box.min.y * scale };
  }, [scene]);

  // idle loop + occasional one-shot gestures with crossfades
  useEffect(() => {
    const idle = actions.Idle;
    if (!idle) return;
    idle.reset().fadeIn(0.6).play();
    const onDone = () => {
      idle.reset().fadeIn(0.5).play();
    };
    mixer.addEventListener("finished", onDone);
    return () => {
      mixer.removeEventListener("finished", onDone);
      idle.fadeOut(0.3);
    };
  }, [actions, mixer]);

  // gesture breaks on a randomized timer; the "finished" listener
  // above fades the idle back in when a one-shot ends
  useEffect(() => {
    let timer: number;
    const schedule = () => {
      const wait = GESTURE_EVERY[0] + Math.random() * GESTURE_EVERY[1];
      timer = window.setTimeout(() => {
        const name = GESTURES[Math.floor(Math.random() * GESTURES.length)];
        const gesture = actions[name];
        const idle = actions.Idle;
        if (gesture && idle) {
          gesture.reset();
          gesture.setLoop(LoopOnce, 1);
          idle.fadeOut(0.4);
          gesture.fadeIn(0.4).play();
        }
        schedule();
      }, wait * 1000);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [actions]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (ringA.current) ringA.current.rotation.z += delta * 0.25;
    if (ringB.current) ringB.current.rotation.z -= delta * 0.18;
    // the projection breathes: a slight hover, like a hologram refresh
    if (holo.current) holo.current.position.y = Math.sin(t * 0.8) * 0.06;
  });

  return (
    <group position={position}>
      <group ref={holo}>
        <primitive
          object={scene}
          scale={fit.scale}
          position={[0, fit.yOffset, 0]}
        />
        {/* orbit rings around the torso, inherited from the mana core */}
        <group position={[0, 1.75, 0]}>
          <mesh ref={ringA} rotation={[Math.PI / 2.4, 0, 0]}>
            <torusGeometry args={[1.9, 0.012, 8, 96]} />
            <meshBasicMaterial color={SYSTEM_BLUE} transparent opacity={0.5} />
          </mesh>
          <mesh ref={ringB} rotation={[Math.PI / 1.8, Math.PI / 5, 0]}>
            <torusGeometry args={[2.25, 0.008, 8, 96]} />
            <meshBasicMaterial
              color={ARCANE_PURPLE}
              transparent
              opacity={0.35}
            />
          </mesh>
        </group>
        <Sparkles
          count={40}
          scale={[3, 4, 3]}
          position={[0, 1.7, 0]}
          size={2.2}
          speed={0.35}
          color={ARCANE_PURPLE}
          opacity={0.7}
        />
        <pointLight
          color={ARCANE_PURPLE}
          intensity={6}
          distance={9}
          position={[0, 1.7, 0]}
        />
      </group>
    </group>
  );
}
