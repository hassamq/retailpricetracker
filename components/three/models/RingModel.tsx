"use client";

import { useSatinMetal } from "./materials";

type Props = { color: string };

export function RingModel({ color }: Props) {
  const outer = useSatinMetal(color);
  const inner = useSatinMetal("#8a8a8a");

  return (
    <group rotation={[Math.PI / 2.4, 0.3, 0]}>
      <mesh material={outer}>
        <torusGeometry args={[0.7, 0.14, 32, 64]} />
      </mesh>
      <mesh material={inner} scale={[0.92, 0.92, 1.05]}>
        <torusGeometry args={[0.7, 0.08, 24, 64]} />
      </mesh>
    </group>
  );
}
