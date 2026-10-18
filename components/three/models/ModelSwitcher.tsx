"use client";

import type { Model3dType } from "@/data/products";
import { TabletModel } from "./TabletModel";
import { WatchModel } from "./WatchModel";
import { BudsModel } from "./BudsModel";
import { RingModel } from "./RingModel";
import { HeadsetModel } from "./HeadsetModel";
import { PenModel, ChargerModel, CaseModel } from "./AccessoryModels";

type Props = {
  type: Model3dType;
  color: string;
};

export function ModelSwitcher({ type, color }: Props) {
  switch (type) {
    case "tablet":
      return <TabletModel color={color} />;
    case "watch":
      return <WatchModel color={color} />;
    case "buds":
      return <BudsModel color={color} />;
    case "ring":
      return <RingModel color={color} />;
    case "headset":
      return <HeadsetModel color={color} />;
    case "pen":
      return <PenModel color={color} />;
    case "charger":
      return <ChargerModel color={color} />;
    case "case":
      return <CaseModel color={color} />;
    default:
      return <TabletModel color={color} />;
  }
}
