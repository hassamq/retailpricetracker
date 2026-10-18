"use client";

import { useGlass, useSatinMetal, useSilicone } from "./materials";

type Props = { color: string };

export function WatchModel({ color }: Props) {
  const caseMat = useSatinMetal(color);
  const glass = useGlass("#0d1117");
  const strap = useSilicone("#1c1c1c");

  return (
    <group>
      <mesh material={caseMat}>
        <cylinderGeometry args={[0.55, 0.55, 0.22, 48]} />
      </mesh>
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} material={glass}>
        <circleGeometry args={[0.48, 48]} />
      </mesh>
      {/* crown */}
      <mesh position={[0.58, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={caseMat}>
        <cylinderGeometry args={[0.06, 0.06, 0.08, 16]} />
      </mesh>
      {/* straps */}
      <mesh position={[0, 0, 0.85]} material={strap}>
        <boxGeometry args={[0.42, 0.08, 0.7]} />
      </mesh>
      <mesh position={[0, 0, -0.85]} material={strap}>
        <boxGeometry args={[0.42, 0.08, 0.7]} />
      </mesh>
    </group>
  );
}
