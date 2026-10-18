"use client";

import { motion, useReducedMotion } from "framer-motion";
import { motion as tokens } from "@/lib/brand";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function FadeIn({ children, className, delay = 0 }: Props) {
  const reduced = useReducedMotion();
  if (reduced) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: tokens.fadeUpY }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: tokens.fadeUpMs / 1000,
        ease: tokens.ease,
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}
