"use client";

import {
  Suspense,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Canvas } from "@react-three/fiber";
import {
  View,
  PerspectiveCamera,
  Environment,
  ContactShadows,
} from "@react-three/drei";
import type { Model3dType } from "@/data/products";
import { ModelSwitcher } from "./models/ModelSwitcher";

type ViewItem = {
  id: string;
  type: Model3dType;
  color: string;
  track: RefObject<HTMLElement | null>;
};

type SharedCanvasContextValue = {
  register: (item: ViewItem) => void;
  unregister: (id: string) => void;
};

const SharedCanvasContext = createContext<SharedCanvasContextValue | null>(
  null,
);

export function useSharedCanvas() {
  return useContext(SharedCanvasContext);
}

export function SharedCanvasProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ViewItem[]>([]);
  const mapRef = useRef(new Map<string, ViewItem>());

  const api = useMemo<SharedCanvasContextValue>(
    () => ({
      register: (item) => {
        mapRef.current.set(item.id, item);
        setItems(Array.from(mapRef.current.values()));
      },
      unregister: (id) => {
        mapRef.current.delete(id);
        setItems(Array.from(mapRef.current.values()));
      },
    }),
    [],
  );

  return (
    <SharedCanvasContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[5]">
        <Canvas
          eventSource={
            typeof document !== "undefined"
              ? document.documentElement
              : undefined
          }
          eventPrefix="client"
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
          style={{ pointerEvents: "none" }}
        >
          <Suspense fallback={null}>
            {items.map((item) => (
              <View
                key={item.id}
                track={item.track as RefObject<HTMLElement>}
              >
                <PerspectiveCamera makeDefault position={[0, 0.3, 4]} fov={35} />
                <ambientLight intensity={0.5} />
                <directionalLight position={[3, 4, 2]} intensity={1} />
                <ModelSwitcher type={item.type} color={item.color} />
                <ContactShadows
                  position={[0, -1.1, 0]}
                  opacity={0.3}
                  scale={5}
                  blur={2}
                />
                <Environment preset="studio" />
              </View>
            ))}
          </Suspense>
        </Canvas>
      </div>
    </SharedCanvasContext.Provider>
  );
}

export function GridModelSlot({
  id,
  type,
  color,
  className,
}: {
  id: string;
  type: Model3dType;
  color: string;
  className?: string;
}) {
  const ctx = useSharedCanvas();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ctx) return;
    ctx.register({ id, type, color, track: ref });
    return () => ctx.unregister(id);
  }, [ctx, id, type, color]);

  return <div ref={ref} className={className} />;
}
