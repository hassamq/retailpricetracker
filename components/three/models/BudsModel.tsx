"use client";

import { RoundedBox } from "@react-three/drei";
import { useSatinMetal, useSilicone } from "./materials";

type Props = { color: string };

export function BudsModel({ color }: Props) {
  const caseMat = useSatinMetal(color);
  const bud = useSilicone(color === "#F5F5F5" ? "#E8E8E8" : color);

  return (
    <group>
      <RoundedBox
        args={[1.4, 0.55, 0.9]}
        radius={0.18}
        smoothness={4}
        material={caseMat}
        position={[0, -0.05, 0]}
      />
      {/* lid slightly open */}
      <RoundedBox
        args={[1.38, 0.12, 0.88]}
        radius={0.1}
        smoothness={4}
        material={caseMat}
        position={[0, 0.32, -0.05]}
        rotation={[-0.35, 0, 0]}
      />
      <mesh position={[-0.32, 0.22, 0.05]} material={bud}>
        <sphereGeometry args={[0.18, 24, 24]} />
      </mesh>
      <mesh position={[0.32, 0.22, 0.05]} material={bud}>
        <sphereGeometry args={[0.18, 24, 24]} />
      </mesh>
    </group>
  );
}
