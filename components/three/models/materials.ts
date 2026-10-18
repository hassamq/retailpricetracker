"use client";

import { useMemo } from "react";
import * as THREE from "three";

export function useSatinMetal(color: string) {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(color),
        metalness: 0.85,
        roughness: 0.35,
        clearcoat: 0.2,
        clearcoatRoughness: 0.4,
      }),
    [color],
  );
}

export function useGlass(color = "#0a0a0a") {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(color),
        metalness: 0.1,
        roughness: 0.05,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        reflectivity: 0.9,
      }),
    [color],
  );
}

export function useSilicone(color: string) {
  return useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        metalness: 0.05,
        roughness: 0.85,
      }),
    [color],
  );
}
