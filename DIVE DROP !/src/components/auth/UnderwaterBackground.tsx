'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Bubble {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
}

interface Fish {
  id: number;
  y: number;
  duration: number;
  delay: number;
  speed: number;
}

export function UnderwaterBackground() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [fish, setFish] = useState<Fish[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Generate bubbles
    const newBubbles = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 20 + 5,
      duration: Math.random() * 4 + 4,
      delay: Math.random() * 2,
    }));
    setBubbles(newBubbles);

    // Generate fish
    const newFish = Array.from({ length: 3 }, (_, i) => ({
      id: i,
      y: Math.random() * 60 + 20,
      duration: Math.random() * 6 + 8,
      delay: Math.random() * 3,
      speed: Math.random() * 0.5 + 0.5,
    }));
    setFish(newFish);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a2342] via-[#0d3b66] to-[#051c30]" />

      {/* Light rays */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <linearGradient id="ray-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Animated light rays */}
        <motion.g>
          {[0, 25, 50, 75].map((offset) => (
            <motion.line
              key={`ray-${offset}`}
              x1={`${offset}%`}
              y1="0"
              x2={`${offset}%`}
              y2="100%"
              stroke="url(#ray-gradient)"
              strokeWidth="20"
              opacity="0.3"
              animate={{
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 4,
                delay: offset / 100,
                repeat: Infinity,
              }}
            />
          ))}
        </motion.g>
      </svg>

      {/* Bubbles */}
      {bubbles.map((bubble) => (
        <motion.div
          key={`bubble-${bubble.id}`}
          className="absolute rounded-full border border-cyan-300 opacity-60"
          style={{
            width: bubble.size,
            height: bubble.size,
            left: `${bubble.x}%`,
            bottom: '-20px',
            boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
          }}
          animate={{
            y: [-20, -window.innerHeight - 20],
            opacity: [0, 0.6, 0],
            scale: [0.8, 1, 0.9],
          }}
          transition={{
            duration: bubble.duration,
            delay: bubble.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Fish */}
      {fish.map((f) => (
        <motion.svg
          key={`fish-${f.id}`}
          className="absolute"
          width="40"
          height="30"
          viewBox="0 0 40 30"
          style={{
            top: `${f.y}%`,
            left: '-50px',
          }}
          animate={{
            x: [0, window.innerWidth + 100],
          }}
          transition={{
            duration: f.duration / f.speed,
            delay: f.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <defs>
            <linearGradient id={`fish-gradient-${f.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00d4ff" />
              <stop offset="100%" stopColor="#0099cc" />
            </linearGradient>
          </defs>
          {/* Fish body */}
          <ellipse
            cx="20"
            cy="15"
            rx="15"
            ry="8"
            fill={`url(#fish-gradient-${f.id})`}
            opacity="0.8"
          />
          {/* Fish tail */}
          <polygon
            points="35,15 50,8 50,22"
            fill={`url(#fish-gradient-${f.id})`}
            opacity="0.7"
          />
          {/* Fish eye */}
          <circle cx="8" cy="12" r="2" fill="#ffffff" />
        </motion.svg>
      ))}

      {/* Floating particles/sand */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute rounded-full opacity-20"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            background: '#00d4ff',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, Math.random() * 50 - 25],
            x: [0, Math.random() * 30 - 15],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: Math.random() * 8 + 6,
            delay: Math.random() * 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
