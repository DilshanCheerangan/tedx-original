"use client";

import HeroShader from "@/components/HeroShader";
import { RandomLetterSwap } from "@/components/ui/random-letter-swap";
import {
  useScroll,
  useTransform,
  motion,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { useRef, useCallback, useEffect, useState } from "react";

// ─── Intro animation timing (ms) ──────────────────────────────────
//  0ms        : phase 'aligned'  — holds hero/bg aligned (UI hidden)
//  600ms      : phase 'scatter'  — fluid cinematic sweep through scramble zone into solved Title
//  3200ms     : phase 'done'     — UI fades in, lever appears
const T_HOLD_START  = 600;
const T_SWEEP_DUR   = 2600;
const T_TOTAL       = T_HOLD_START + T_SWEEP_DUR; // 3200ms

// Position constants matching the shader's alignment points
const POS_ALIGNED = 0.72; // hero / bg aligned sweet spot
const POS_TITLE   = 0.22; // ANOMALY title aligned zone

type IntroPhase = "aligned" | "scatter" | "resolve" | "done";

function easeInOutSine(x: number): number {
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Intro state ───────────────────────────────────────────────────
  const [introPhase, setIntroPhase] = useState<IntroPhase>("aligned");
  // The virtual mouse X value — starts at "hero aligned" position
  const introMouseRef = useRef<number | null>(POS_ALIGNED);
  const introRAFRef = useRef<number>(0);

  // ── Circular Arc Lever State ──────────────────────────────────────
  // leverVal ranges from 0.0 (Left: Title) to 1.0 (Right: Statue)
  const [leverVal, setLeverVal] = useState<number>(0.0);
  const isDraggingLever = useRef<boolean>(false);
  const arcCenterRef = useRef<{ cx: number; cy: number }>({ cx: 0, cy: 0 });

  useEffect(() => {
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;

      if (elapsed < T_HOLD_START) {
        introMouseRef.current = POS_ALIGNED;
      } else if (elapsed < T_TOTAL) {
        const rawProgress = (elapsed - T_HOLD_START) / T_SWEEP_DUR;
        const easedProgress = easeInOutSine(rawProgress);
        introMouseRef.current = POS_ALIGNED + (POS_TITLE - POS_ALIGNED) * easedProgress;

        if (rawProgress > 0.65) {
          setIntroPhase("resolve");
        } else {
          setIntroPhase("scatter");
        }
      } else {
        // Intro complete! Lock virtual mouse to POS_TITLE so handoff is seamless
        introMouseRef.current = null;
        setIntroPhase("done");
        return; // stop RAF loop
      }

      introRAFRef.current = requestAnimationFrame(tick);
    }

    introRAFRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(introRAFRef.current);
  }, []);

  // Update shader mouse position from lever value
  // leverVal 0.0 -> POS_TITLE (0.22)
  // leverVal 1.0 -> POS_ALIGNED (0.72)
  const updateLeverPosition = useCallback((newVal: number) => {
    const clamped = Math.max(0, Math.min(1, newVal));
    setLeverVal(clamped);

    // Only override shader after intro is finished
    if (introPhase === "done") {
      const shaderX = POS_TITLE + (POS_ALIGNED - POS_TITLE) * clamped;
      // Dispatch a synthetic mousemove to notify HeroShader
      const clientX = shaderX * window.innerWidth;
      const clientY = window.innerHeight * 0.5;
      window.dispatchEvent(new MouseEvent("mousemove", { clientX, clientY }));
    }
  }, [introPhase]);

  // ── Arc Lever Drag Calculations ───────────────────────────────────
  // Arc spans an angle at the bottom of the circle: from 60deg to 120deg (or -30deg to +30deg around bottom 90deg)
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingLever.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    // Compute center of screen
    arcCenterRef.current = {
      cx: window.innerWidth / 2,
      cy: window.innerHeight / 2,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingLever.current) return;
    const { cx, cy } = arcCenterRef.current;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;

    // Angle in degrees around bottom center (down is 90 deg)
    // Angle offset from straight down (dy > 0): atan2(dx, dy)
    // At bottom center (dx=0, dy>0), angle = 0 rad
    // Moving left (dx < 0): angle is negative
    // Moving right (dx > 0): angle is positive
    const angleRad = Math.atan2(dx, dy); // rad: -PI/2 (left) to +PI/2 (right)
    const angleDeg = (angleRad * 180) / Math.PI;

    // We map -32 degrees (left: Title) to +32 degrees (right: Statue)
    const MAX_ARC_DEG = 32;
    const norm = (angleDeg - (-MAX_ARC_DEG)) / (MAX_ARC_DEG * 2);
    updateLeverPosition(norm);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingLever.current) return;
    isDraggingLever.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // ── Scroll-linked dissolve ──────────────────────────────────────
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const buttonsOpacity  = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const statueOpacity   = useTransform(scrollYProgress, [0.22, 0.62], [1, 0]);
  const bgOpacity       = useTransform(scrollYProgress, [0.35, 0.78], [1, 0.05]);
  const vignetteOpacity = useTransform(scrollYProgress, [0.1, 0.8], [0, 1]);

  // ── Mouse parallax (kept subtle for background depth) ───────────
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const bgX = useSpring(useTransform(rawX, (v) => v * -0.022), { stiffness: 30, damping: 25 });
  const bgY = useSpring(useTransform(rawY, (v) => v * -0.022), { stiffness: 30, damping: 25 });

  const statueX = useSpring(useTransform(rawX, (v) => v * -0.022), { stiffness: 60, damping: 22 });
  const statueY = useSpring(useTransform(rawY, (v) => v * -0.022), { stiffness: 60, damping: 22 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Only apply subtle parallax if not dragging the lever
    if (!isDraggingLever.current) {
      rawX.set(e.clientX - window.innerWidth / 2);
      rawY.set(e.clientY - window.innerHeight / 2);
    }
  }, [rawX, rawY]);

  // UI elements are invisible until intro is "done"
  const uiVisible = introPhase === "done";

  // Arc lever geometry
  // Rings are 100vh diameter, radius is 50vh.
  // The lever sits at radius = 52vh (just outside the 12th ring)
  const currentAngleDeg = -32 + leverVal * 64; // from -32deg to +32deg

  return (
    <div ref={containerRef} className="relative h-[200vh]">
      <div
        className="sticky top-0 h-screen w-full overflow-hidden"
        onMouseMove={handleMouseMove}
      >
        {/* ── LAYER 0: Background shader ── */}
        <motion.div
          style={{ opacity: bgOpacity }}
          className="absolute inset-0 z-0"
        >
          <HeroShader layerMode="bg" introOverride={introMouseRef} />
        </motion.div>

        {/* Darkness vignette */}
        <motion.div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            opacity: vignetteOpacity,
            background: "radial-gradient(ellipse 120% 80% at 50% 120%, #000 0%, rgba(0,0,0,0.85) 40%, transparent 75%)",
          }}
        />

        {/* ── LAYER 3: Hero statue with introOverride ── */}
        <motion.div
          style={{ opacity: statueOpacity }}
          className="absolute inset-0 z-20 pointer-events-none"
        >
          <HeroShader layerMode="hero" introOverride={introMouseRef} />
        </motion.div>

        {/* ── 12 Concentric Circular Cuts Shadow Overlay ── */}
        <motion.div
          style={{ opacity: statueOpacity }}
          className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center overflow-hidden"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((ring) => (
            <div
              key={ring}
              className="absolute rounded-full pointer-events-none shadow-[0_0_12px_rgba(0,0,0,0.85),inset_0_0_8px_rgba(0,0,0,0.65)]"
              style={{
                width: `${(ring * 100) / 12}vh`,
                height: `${(ring * 100) / 12}vh`,
              }}
            />
          ))}
        </motion.div>

        {/* ── OUTER CIRCLE ARC LEVER DIAL ── */}
        <motion.div
          className="absolute inset-0 z-35 pointer-events-none flex items-center justify-center overflow-hidden select-none"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: uiVisible ? 1 : 0, scale: uiVisible ? 1 : 0.96 }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.2 }}
        >
          {/* Circular SVG collar matching outer ring size (Radius = 52.5vh) */}
          <div className="relative w-[105vh] h-[105vh] pointer-events-none flex items-center justify-center">
            
            {/* SVG Arc Track at bottom of the circle */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 1000 1000"
            >
              <defs>
                <linearGradient id="arcGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#ffffff" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* Arc path: radius = 485, center = 500,500. Span from -34deg to +34deg around bottom (90deg) */}
              {/* Polar: 90 - 34 = 56 deg, 90 + 34 = 124 deg */}
              {/* x1 = 500 + 485*cos(124°), y1 = 500 + 485*sin(124°) */}
              {/* x2 = 500 + 485*cos(56°), y2 = 500 + 485*sin(56°) */}
              <path
                d="M 229 902 A 485 485 0 0 0 771 902"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="4"
                strokeDasharray="4 8"
              />
              <path
                d="M 229 902 A 485 485 0 0 0 771 902"
                fill="none"
                stroke="url(#arcGlow)"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* End notch markers */}
              <circle cx="229" cy="902" r="5" fill="#ef4444" />
              <circle cx="771" cy="902" r="5" fill="#ef4444" />
            </svg>

            {/* Draggable Lever Puck Container (Centered at screen, rotated by currentAngleDeg) */}
            <div
              className="absolute inset-0 flex items-end justify-center pointer-events-auto cursor-grab active:cursor-grabbing transition-transform duration-75"
              style={{
                transform: `rotate(${currentAngleDeg}deg)`,
                transformOrigin: "center center",
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {/* The mechanical Lever Handle attached to outer perimeter */}
              <div className="mb-[2.5vh] flex flex-col items-center group -translate-y-1">
                {/* Dial puck head */}
                <div className="w-10 h-7 rounded-full bg-gradient-to-b from-neutral-800 to-black border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.7)] flex items-center justify-center gap-1 group-hover:scale-110 group-active:scale-95 transition-transform">
                  <div className="w-1 h-3 rounded-full bg-white/70" />
                  <div className="w-1 h-3 rounded-full bg-red-500" />
                  <div className="w-1 h-3 rounded-full bg-white/70" />
                </div>
                {/* Pointer tooth locking into outer ring */}
                <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[6px] border-b-red-500 -mt-0.5" />
              </div>
            </div>

            {/* Clickable Terminal Labels on either side of the arc */}
            <div className="absolute bottom-[4.5vh] left-[20%] pointer-events-auto cursor-pointer group" onClick={() => updateLeverPosition(0)}>
              <span className={`text-xs md:text-sm font-mono tracking-[0.25em] font-bold transition-all ${leverVal < 0.25 ? "text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" : "text-white/40 hover:text-white/80"}`}>
                ◀ TITLE
              </span>
            </div>

            <div className="absolute bottom-[4.5vh] right-[20%] pointer-events-auto cursor-pointer group" onClick={() => updateLeverPosition(1)}>
              <span className={`text-xs md:text-sm font-mono tracking-[0.25em] font-bold transition-all ${leverVal > 0.75 ? "text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" : "text-white/40 hover:text-white/80"}`}>
                STATUE ▶
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Date text ── */}
        <motion.div
          style={{ opacity: uiVisible ? buttonsOpacity : undefined }}
          className="absolute top-[62%] left-[10%] md:left-[16%] z-40 pointer-events-none"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: uiVisible ? 1 : 0, y: uiVisible ? 0 : 12 }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.15 }}
        >
          <p className="text-white/80 text-sm md:text-lg tracking-[0.3em] uppercase font-light">on jan 31 2026</p>
        </motion.div>

        {/* ── CTA Action Buttons ── */}
        <motion.div
          style={{ opacity: uiVisible ? buttonsOpacity : undefined }}
          className="absolute bottom-12 right-8 md:right-20 z-40 flex flex-col gap-5 pointer-events-auto w-[260px] md:w-[320px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: uiVisible ? 1 : 0 }}
          transition={{ duration: 1.0, ease: "easeOut", delay: 0.1 }}
        >
          <button className="group relative w-full overflow-hidden rounded-full bg-red-600 px-6 md:px-8 py-4 md:py-5 text-lg md:text-xl font-bold uppercase tracking-widest text-white shadow-[0_0_30px_-10px_rgba(220,38,38,0.6)] transition-all duration-300 hover:scale-105 hover:bg-red-500 hover:shadow-[0_0_60px_-10px_rgba(220,38,38,1)] cursor-pointer">
            <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-700 group-hover:[transform:skew(-12deg)_translateX(150%)]">
              <div className="relative h-full w-12 bg-white/30 blur-[4px]" />
            </div>
            <span className="relative z-10 flex items-center justify-center gap-3 drop-shadow-md">
              <RandomLetterSwap
                label="Book Tickets"
                reverse={false}
                staggerDuration={0.02}
                transition={{ duration: 0.65, type: "spring" }}
              />
              <span className="text-xl md:text-2xl group-hover:translate-x-2 transition-transform duration-300">→</span>
            </span>
          </button>
          <button className="group relative w-full overflow-hidden rounded-full border-2 md:border-4 border-red-600 bg-black/40 px-6 md:px-8 py-3.5 md:py-4 text-lg md:text-xl font-bold uppercase tracking-widest text-red-500 backdrop-blur-md shadow-[0_0_20px_-10px_rgba(220,38,38,0.3)] transition-all duration-300 hover:scale-105 hover:bg-red-600/20 hover:text-red-400 hover:shadow-[0_0_40px_-5px_rgba(220,38,38,0.8)] hover:border-red-500 cursor-pointer">
            <span className="relative z-10 flex items-center justify-center gap-3">
              <RandomLetterSwap
                label="Buy Merch"
                reverse={false}
                staggerDuration={0.02}
                transition={{ duration: 0.65, type: "spring" }}
              />
              <span className="text-xl md:text-2xl group-hover:translate-x-2 transition-transform duration-300">→</span>
            </span>
          </button>
        </motion.div>

        {/* ── NAVBAR ── */}
        <motion.nav
          className="absolute top-8 left-8 right-8 md:left-20 md:right-20 z-50 flex justify-between items-center pointer-events-auto"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: uiVisible ? 1 : 0, y: uiVisible ? 0 : -16 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        >
          <div className="text-3xl md:text-4xl font-bold tracking-tighter flex items-center gap-1">
            <span className="text-red-600">TEDx</span>
            <span>CUSAT</span>
          </div>

          <div className="hidden lg:flex gap-14 text-xs font-semibold tracking-[0.25em] text-white/70">
            <a href="#about" className="hover:text-white transition">ABOUT</a>
            <a href="#speakers" className="hover:text-white transition">SPEAKERS</a>
            <a href="#schedule" className="hover:text-white transition">SCHEDULE</a>
            <a href="#contact" className="hover:text-white transition">CONTACT</a>
          </div>

          <div className="flex items-center gap-6">
            <span className="text-xs font-semibold tracking-[0.25em] text-red-600 hidden md:block">
              ANOMALY / 2026
            </span>

            <button className="flex flex-col gap-1.5 group" aria-label="Toggle menu">
              <span className="w-8 h-[2px] bg-white group-hover:bg-red-500 transition" />
              <span className="w-8 h-[2px] bg-white group-hover:bg-red-500 transition" />
            </button>
          </div>
        </motion.nav>
      </div>
    </div>
  );
}
