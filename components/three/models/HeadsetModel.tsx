"use client";

import { useSatinMetal, useSilicone } from "./materials";

type Props = { color: string };

export function HeadsetModel({ color }: Props) {
  const shell = useSatinMetal(color);
  const strap = useSilicone("#2a2a2a");
  const lens = useSatinMetal("#111111");

  return (
    <group>
      <mesh material={shell} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[1.8, 0.7, 0.9]} />
      </mesh>
      <mesh position={[-0.35, 0.05, 0.46]} material={lens}>
        <circleGeometry args={[0.28, 32]} />
      </mesh>
      <mesh position={[0.35, 0.05, 0.46]} material={lens}>
        <circleGeometry args={[0.28, 32]} />
      </mesh>
      {/* head strap */}
      <mesh position={[0, 0.15, -0.7]} material={strap}>
        <torusGeometry args={[0.55, 0.06, 12, 32, Math.PI]} />
      </mesh>
    </group>
  );
}
