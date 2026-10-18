"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundFX } from "@/lib/soundFX";

interface OrbitalControllerProps {
  progress: number; // 0.0 (locked / title at angle +40°) to 1.0 (unlocked / statue reveal at angle -40°)
  onProgressChange: (newProgress: number) => void;
  uiVisible: boolean;
}

// Coordinate Axis System:
// Horizontal right line is 0° (the positive X axis).
// +40°: Below the horizontal axis (Title visible, starting position)
// -40°: Above the horizontal axis (Statue resolved, final position)
// Span is exactly 80° traversing counter-clockwise from +40° up to -40°
const START_ANGLE_DEG = 40;  // Progress = 0.0 (Title visible)
const END_ANGLE_DEG   = -40; // Progress = 1.0 (Statue resolved)
const TOTAL_SWEEP_DEG = START_ANGLE_DEG - END_ANGLE_DEG; // 80° sweep

export default function OrbitalController({
  progress,
  onProgressChange,
  uiVisible,
}: OrbitalControllerProps) {
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [demoOffset, setDemoOffset] = useState(0); // subtle initial wiggle in degrees
  const demoRan = useRef(false);

  // Accessible keyboard & snap handling
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      onProgressChange(Math.min(1, progress + 0.05));
    } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      onProgressChange(Math.max(0, progress - 0.05));
    }
  };

  // 1. Initial one-time demonstration wiggle on page load (subtle upward preview toward -40°, then ease back)
  useEffect(() => {
    if (!uiVisible || demoRan.current) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    demoRan.current = true;
    const timeout = setTimeout(() => {
      const startTime = performance.now();
      const dur = 1200; // ms

      function animateDemo(now: number) {
        const elapsed = now - startTime;
        if (elapsed < dur) {
          const t = elapsed / dur;
          // Smooth bell curve wiggle toward -40°: -sin(t * π) * 10°
          const wiggle = -Math.sin(t * Math.PI) * 10;
          setDemoOffset(wiggle);
          requestAnimationFrame(animateDemo);
        } else {
          setDemoOffset(0);
        }
      }
      requestAnimationFrame(animateDemo);
    }, 600);

    return () => clearTimeout(timeout);
  }, [uiVisible]);

  // Pointer drag calculation
  const updatePointerAngle = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = clientX - cx;
      const dy = clientY - cy;

      // Pointer angle in degrees [-180, 180] relative to horizontal axis
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

      // Progress maps +40° (0.0) -> -40° (1.0)
      // As angle decreases from +40 to -40, progress increases from 0.0 to 1.0:
      let rawProgress = (START_ANGLE_DEG - angleDeg) / TOTAL_SWEEP_DEG;
      rawProgress = Math.max(0, Math.min(1, rawProgress));

      // ── Subtle, gentle magnetic attraction to endpoints when very close ──
      // Attraction window: only within 3.5% of either end
      let attractedProgress = rawProgress;
      if (rawProgress < 0.035) {
        // Gentle pull toward 0.0
        attractedProgress = rawProgress * 0.7;
      } else if (rawProgress > 0.965) {
        // Gentle pull toward 1.0
        attractedProgress = 1.0 - (1.0 - rawProgress) * 0.7;
      }

      // Snap trigger strictly at the final 1.5% edge
      if (attractedProgress >= 0.985) {
        attractedProgress = 1.0;
        soundFX.playSnapLock("hero");
      } else if (attractedProgress <= 0.015) {
        attractedProgress = 0.0;
        soundFX.playSnapLock("title");
      }

      onProgressChange(attractedProgress);
    },
    [onProgressChange]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePointerAngle(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    updatePointerAngle(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    // Subtle snap on release only if right on the edge (within 4%)
    if (progress > 0.96) {
      onProgressChange(1.0);
      soundFX.playSnapLock("hero");
    } else if (progress < 0.04) {
      onProgressChange(0.0);
      soundFX.playSnapLock("title");
    }
  };

  // Current calculated knob angle
  // progress 0.0 -> +40°, progress 1.0 -> -40°
  const currentAngleDeg = START_ANGLE_DEG - progress * TOTAL_SWEEP_DEG + demoOffset;
  const currentAngleRad = (currentAngleDeg * Math.PI) / 180;

  // Track circle parameters (viewBox 0 0 1000 1000, Center = 500, 500)
  const TRACK_RADIUS = 492; // Slightly indented along outer stone ring bevel

  const isUnlocked = progress >= 0.98;

  // Key coordinates along the 80° arc (+40° down to -40° up on the right side):
  const startX = 500 + TRACK_RADIUS * Math.cos((START_ANGLE_DEG * Math.PI) / 180);
  const startY = 500 + TRACK_RADIUS * Math.sin((START_ANGLE_DEG * Math.PI) / 180);

  const endX = 500 + TRACK_RADIUS * Math.cos((END_ANGLE_DEG * Math.PI) / 180);
  const endY = 500 + TRACK_RADIUS * Math.sin((END_ANGLE_DEG * Math.PI) / 180);

  const currentX = 500 + TRACK_RADIUS * Math.cos(currentAngleRad);
  const currentY = 500 + TRACK_RADIUS * Math.sin(currentAngleRad);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-35 flex items-center justify-center pointer-events-none select-none overflow-hidden"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="slider"
      aria-label="Orbital puzzle controller"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
    >
      {/* 100vh × 100vh container locked to exact screen center and matching 12-ring diameter */}
      <div className="relative w-[100vh] h-[100vh] max-w-[100vw] max-h-[100vw] flex items-center justify-center pointer-events-none">
        
        {/* SVG Orbital Track & Glowing Crimson Fill */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          viewBox="0 0 1000 1000"
        >
          <defs>
            {/* Multi-layered crimson glow filter */}
            <filter id="crimsonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <linearGradient id="activeArcGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#85000C" />
              <stop offset="60%" stopColor="#FF1028" />
              <stop offset="100%" stopColor="#FF3045" />
            </linearGradient>
          </defs>

          {/* 1. Underlying unilluminated dark machined slot ONLY along the +40° to -40° arc */}
          <path
            d={`M ${startX} ${startY} A ${TRACK_RADIUS} ${TRACK_RADIUS} 0 0 0 ${endX} ${endY}`}
            fill="none"
            stroke="rgba(10, 10, 12, 0.85)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d={`M ${startX} ${startY} A ${TRACK_RADIUS} ${TRACK_RADIUS} 0 0 0 ${endX} ${endY}`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="2"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />

          {/* 2. Soft subtle guide glow along the active arc segment */}
          <path
            d={`M ${startX} ${startY} A ${TRACK_RADIUS} ${TRACK_RADIUS} 0 0 0 ${endX} ${endY}`}
            fill="none"
            stroke="rgba(133, 0, 12, 0.45)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Horizontal Reference Marker at 0° */}
          <line
            x1={500 + TRACK_RADIUS - 12}
            y1="500"
            x2={500 + TRACK_RADIUS + 12}
            y2="500"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="2"
          />

          {/* 3. Glowing Crimson-Red Dynamic Segment */}
          {progress > 0.005 && (
            <>
              {/* Soft bloom layer */}
              <path
                d={`M ${startX} ${startY} A ${TRACK_RADIUS} ${TRACK_RADIUS} 0 0 0 ${currentX} ${currentY}`}
                fill="none"
                stroke="#FF1028"
                strokeWidth="8"
                strokeLinecap="round"
                opacity={isUnlocked ? 0.95 : 0.65}
                filter="url(#crimsonGlow)"
              />
              {/* Sharp 2.5px intense crimson-red core */}
              <path
                d={`M ${startX} ${startY} A ${TRACK_RADIUS} ${TRACK_RADIUS} 0 0 0 ${currentX} ${currentY}`}
                fill="none"
                stroke="url(#activeArcGrad)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </>
          )}

          {/* Terminal Anchor Notch (Start: +40° / Title) */}
          <circle
            cx={startX}
            cy={startY}
            r="4.5"
            fill="#FF1028"
            opacity="0.85"
          />

          {/* Terminal Anchor Notch (Finish: -40° / Statue Resolved) */}
          <circle
            cx={endX}
            cy={endY}
            r="5.5"
            fill={isUnlocked ? "#FF3045" : "rgba(255,255,255,0.25)"}
            className="transition-colors duration-300"
          />
        </svg>

        {/* ── METALLIC MECHANICAL KNOB (Enlarged 72px desktop / 58px mobile) ── */}
        <div
          className="absolute pointer-events-auto cursor-grab active:cursor-grabbing z-40 touch-none flex items-center justify-center transition-[filter,transform] duration-75"
          style={{
            // Percentage from center:
            left: `${50 + (TRACK_RADIUS / 1000) * 100 * Math.cos(currentAngleRad)}%`,
            top: `${50 + (TRACK_RADIUS / 1000) * 100 * Math.sin(currentAngleRad)}%`,
            transform: "translate(-50%, -50%)",
            width: "72px",
            height: "72px",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Subtle Ambient Red Glow under the knob */}
          <div
            className={`absolute -inset-5 rounded-full transition-opacity duration-300 pointer-events-none ${
              isHovered || isDragging.current || isUnlocked
                ? "opacity-100 scale-110"
                : "opacity-45 scale-100"
            }`}
            style={{
              background:
                "radial-gradient(circle, rgba(255,16,40,0.6) 0%, rgba(133,0,12,0.25) 50%, transparent 70%)",
              filter: "blur(8px)",
            }}
          />

          {/* Photorealistic Gunmetal Knob Asset */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/orbital-knob.png"
            alt="Orbital Controller Knob"
            draggable={false}
            className={`w-full h-full object-contain select-none transition-transform duration-150 ${
              isHovered ? "brightness-110 scale-105" : "brightness-100"
            } ${isUnlocked ? "drop-shadow-[0_0_16px_rgba(255,48,69,0.95)]" : "drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"}`}
            style={{
              // Orient knob notch indicator pointing along tangential trajectory
              transform: `rotate(${currentAngleDeg - 90}deg)`,
            }}
          />

          {/* ── Top-down ambient key light: subtle white specular rim highlight ── */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 65% 35% at 50% 8%, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.25) 45%, transparent 85%)",
              boxShadow:
                "inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.65), inset 0 3px 5px -1px rgba(255, 255, 255, 0.25)",
            }}
          />

          {/* Delicate sharp glint reflection pin on the upper beveled lip */}
          <div
            className="absolute top-[3px] left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-white/90 blur-[0.4px] pointer-events-none"
          />
        </div>

        {/* ── INSTRUCTION / STATUS LABEL ── */}
        {/* Positioned comfortably near the +40° starting position */}
        <div
          className="absolute pointer-events-none transition-all duration-500 flex flex-col items-start gap-1"
          style={{
            left: `${50 + (TRACK_RADIUS / 1000) * 100 * Math.cos((START_ANGLE_DEG * Math.PI) / 180) + 3}%`,
            top: `${50 + (TRACK_RADIUS / 1000) * 100 * Math.sin((START_ANGLE_DEG * Math.PI) / 180) + 1}%`,
          }}
        >
          <AnimatePresence mode="wait">
            {!isUnlocked && (
              <motion.div
                key="drag-hint"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: uiVisible ? 0.8 : 0, x: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                <span className="text-[10px] md:text-xs font-mono font-medium tracking-[0.35em] text-neutral-300 uppercase select-none drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                  DRAG TO UNLOCK
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
