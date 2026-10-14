"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, type Transition } from "framer-motion";

export interface RandomLetterSwapProps {
  label: string;
  reverse?: boolean;
  staggerDuration?: number;
  transition?: Transition;
  className?: string;
  onClick?: () => void;
}

export function RandomLetterSwap({
  label,
  reverse = false,
  staggerDuration = 0.02,
  transition = { type: "spring", duration: 0.65, bounce: 0.2 },
  className = "",
  onClick,
}: RandomLetterSwapProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);
  const containerRef = useRef<HTMLSpanElement>(null);

  // Generate randomized stagger indices for each letter
  const shuffledIndices = useMemo(() => {
    const indices = Array.from({ length: label.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [label, shuffleKey]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Attach to parent button if available so full button padding triggers hover
    const parentButton = el.closest("button");
    const target = parentButton || el;

    const handleMouseEnter = () => {
      setShuffleKey((prev) => prev + 1);
      setIsHovered(true);
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
    };

    target.addEventListener("mouseenter", handleMouseEnter);
    target.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      target.removeEventListener("mouseenter", handleMouseEnter);
      target.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const moveOutY = reverse ? "100%" : "-100%";
  const moveInY = reverse ? "-100%" : "100%";

  return (
    <span
      ref={containerRef}
      onClick={onClick}
      className={`inline-flex items-center overflow-hidden leading-none select-none ${className}`}
    >
      {label.split("").map((char, index) => {
        if (char === " ") {
          return (
            <span key={index} className="inline-block whitespace-pre">
              {" "}
            </span>
          );
        }

        const delay = (shuffledIndices[index] ?? index) * staggerDuration;

        return (
          <span
            key={`${index}-${char}`}
            className="relative inline-flex overflow-hidden"
          >
            {/* Primary Letter */}
            <motion.span
              animate={{
                y: isHovered ? moveOutY : "0%",
              }}
              transition={{
                ...transition,
                delay,
              }}
              className="inline-block"
            >
              {char}
            </motion.span>

            {/* Swapping Replacement Letter */}
            <motion.span
              aria-hidden="true"
              initial={{ y: moveInY }}
              animate={{
                y: isHovered ? "0%" : moveInY,
              }}
              transition={{
                ...transition,
                delay,
              }}
              className="absolute inset-0 inline-flex items-center justify-center"
            >
              {char}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}

export default RandomLetterSwap;
