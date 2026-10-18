"use client";

import { RoundedBox } from "@react-three/drei";
import { useSatinMetal, useSilicone } from "./materials";

type Props = { color: string };

export function PenModel({ color }: Props) {
  const body = useSatinMetal(color);
  return (
    <group rotation={[0, 0, Math.PI / 8]}>
      <mesh material={body} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 2.2, 24]} />
      </mesh>
      <mesh position={[1.15, 0, 0]} material={body} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.06, 0.2, 16]} />
      </mesh>
    </group>
  );
}

export function ChargerModel({ color }: Props) {
  const body = useSatinMetal(color);
  return (
    <group>
      <RoundedBox args={[1, 1, 0.35]} radius={0.12} smoothness={4} material={body} />
      <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.08, 24]} />
        <meshStandardMaterial color="#222" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function CaseModel({ color }: Props) {
  const body = useSilicone(color === "#E8EEF4" ? "#d8dee6" : color);
  return (
    <group>
      <RoundedBox args={[1.5, 2.1, 0.12]} radius={0.1} smoothness={4} material={body} />
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[1.3, 1.9]} />
        <meshPhysicalMaterial
          color="#89a"
          transparent
          opacity={0.25}
          roughness={0.1}
          metalness={0.2}
        />
      </mesh>
    </group>
  );
}
