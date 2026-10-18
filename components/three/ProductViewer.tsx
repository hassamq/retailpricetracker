"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  PresentationControls,
  useGLTF,
} from "@react-three/drei";
import type { Group } from "three";
import type { Model3dType } from "@/data/products";
import { ModelSwitcher } from "./models/ModelSwitcher";
import { ProductFallback } from "./ProductFallback";
import { motion as motionTokens } from "@/lib/brand";

type Props = {
  type: Model3dType;
  color: string;
  glbPath?: string;
  className?: string;
  autoRotate?: boolean;
  size?: "sm" | "md" | "lg";
};

function GlbModel({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  return <primitive object={scene.clone()} scale={1.2} />;
}

function Rotator({
  children,
  enabled,
}: {
  children: React.ReactNode;
  enabled: boolean;
}) {
  const ref = useRef<Group>(null);
  const interacting = useRef(false);
  const resumeAt = useRef(0);

  useFrame((_, delta) => {
    if (!ref.current || !enabled) return;
    if (interacting.current || Date.now() < resumeAt.current) return;
    ref.current.rotation.y += delta * 0.35;
  });

  return (
    <group
      ref={ref}
      onPointerDown={() => {
        interacting.current = true;
      }}
      onPointerUp={() => {
        interacting.current = false;
        resumeAt.current = Date.now() + motionTokens.idleResumeMs;
      }}
    >
      {children}
    </group>
  );
}

const heights = { sm: "h-28", md: "h-48", lg: "h-72" };

export function ProductViewer({
  type,
  color,
  glbPath,
  className,
  autoRotate = true,
  size = "md",
}: Props) {
  const [webglOk, setWebglOk] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const ok = !!(
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
      );
      setWebglOk(ok);
    } catch {
      setWebglOk(false);
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (!webglOk) {
    return (
      <div
        className={`${heights[size]} ${className ?? ""}`}
        role="img"
        aria-label={`${type} product model`}
      >
        <ProductFallback type={type} color={color} className="h-full" />
      </div>
    );
  }

  return (
    <div
      className={`${heights[size]} w-full ${className ?? ""}`}
      role="img"
      aria-label={`Interactive 3D ${type} model`}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.4, 4.2], fov: 35 }}
        frameloop={reducedMotion ? "demand" : "always"}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <ambientLight intensity={0.45} />
        <directionalLight position={[4, 6, 3]} intensity={1.1} />
        <directionalLight position={[-3, 2, -2]} intensity={0.35} />
        <Suspense fallback={null}>
          <PresentationControls
            global
            snap
            speed={1.2}
            zoom={0.9}
            polar={[-Math.PI / 6, Math.PI / 6]}
            azimuth={[-Math.PI / 3, Math.PI / 3]}
          >
            <Rotator enabled={autoRotate && !reducedMotion}>
              {glbPath ? (
                <GlbModel path={glbPath} />
              ) : (
                <ModelSwitcher type={type} color={color} />
              )}
            </Rotator>
          </PresentationControls>
          <ContactShadows
            position={[0, -1.2, 0]}
            opacity={0.35}
            scale={6}
            blur={2.5}
          />
          <Environment preset="studio" />
        </Suspense>
      </Canvas>
    </div>
  );
}
