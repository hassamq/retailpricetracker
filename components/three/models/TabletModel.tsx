"use client";

import { RoundedBox } from "@react-three/drei";
import { useGlass, useSatinMetal } from "./materials";

type Props = { color: string };

export function TabletModel({ color }: Props) {
  const body = useSatinMetal(color);
  const screen = useGlass("#111318");
  const cam = useSatinMetal("#1a1a1a");

  return (
    <group>
      <RoundedBox args={[1.6, 2.2, 0.08]} radius={0.08} smoothness={4} material={body} />
      <mesh position={[0, 0, 0.042]} material={screen}>
        <planeGeometry args={[1.42, 2.02]} />
      </mesh>
      <mesh position={[-0.55, 0.95, 0.05]} material={cam}>
        <cylinderGeometry args={[0.04, 0.04, 0.02, 24]} />
      </mesh>
      <mesh position={[-0.55, 0.95, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.025, 0.038, 24]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}
