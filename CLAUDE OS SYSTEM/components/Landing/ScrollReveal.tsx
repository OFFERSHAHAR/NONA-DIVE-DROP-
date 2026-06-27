"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
}

export function ScrollReveal({ children, delay = 0 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref as any,
    offset: ["0 1", "1.33 1"],
  });

  const scaleProgress = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
  const opacityProgress = useTransform(scrollYProgress, [0, 1], [0.6, 1]);

  return (
    <motion.div
      ref={ref}
      style={{
        scale: scaleProgress,
        opacity: opacityProgress,
      }}
      transition={{
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}

export function TextReveal({ text, delay = 0 }: { text: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref as any,
    offset: ["0 1", "1.33 1"],
  });

  return (
    <div ref={ref} className="overflow-hidden">
      <motion.span
        style={{
          display: "inline-block",
          opacity: useTransform(scrollYProgress, [0, 1], [0, 1]),
          y: useTransform(scrollYProgress, [0, 1], [40, 0]),
        }}
        transition={{ delay }}
      >
        {text}
      </motion.span>
    </div>
  );
}
