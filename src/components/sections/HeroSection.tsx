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
//  0ms        : phase 'aligned'  — rings aligned (hero side), UI hidden
//  700ms      : phase 'scatter'  — rings scatter over 1100ms  (0.72 → 0.0)
//  1800ms     : phase 'resolve'  — rings resolve over 1600ms  (0.0 → 0.28)
//  3400ms     : phase 'done'     — hand back to mouse, UI fades in
const T_SCATTER_START = 700;
const T_SCATTER_DUR   = 1100;
const T_RESOLVE_START = 1800;
const T_RESOLVE_DUR   = 1600;
const T_DONE          = 3400;

// Position constants matching the shader's alignment points
const POS_ALIGNED = 0.72; // hero / bg aligned
const POS_SCATTER = 0.02; // fully dis-aligned
const POS_TITLE   = 0.28; // ANOMALY title aligned

type IntroPhase = "aligned" | "scatter" | "resolve" | "done";

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Intro state ───────────────────────────────────────────────────
  const [introPhase, setIntroPhase] = useState<IntroPhase>("aligned");
  // The virtual mouse X value — starts at "hero aligned" position
  const introMouseRef = useRef<number | null>(POS_ALIGNED);
  // RAF handle for the smooth animation loop
  const introRAFRef = useRef<number>(0);

  useEffect(() => {
    const startTime = performance.now();
    let phase: IntroPhase = "aligned";

    function tick(now: number) {
      const elapsed = now - startTime;

      if (elapsed < T_SCATTER_START) {
        // Hold perfectly aligned
        introMouseRef.current = POS_ALIGNED;
        phase = "aligned";
      } else if (elapsed < T_RESOLVE_START) {
        // Scatter: ease from POS_ALIGNED → POS_SCATTER
        const t = Math.min((elapsed - T_SCATTER_START) / T_SCATTER_DUR, 1);
        introMouseRef.current = POS_ALIGNED + (POS_SCATTER - POS_ALIGNED) * easeInOutCubic(t);
        if (phase !== "scatter") {
          phase = "scatter";
          setIntroPhase("scatter");
        }
      } else if (elapsed < T_DONE) {
        // Resolve: ease from POS_SCATTER → POS_TITLE
        const t = Math.min((elapsed - T_RESOLVE_START) / T_RESOLVE_DUR, 1);
        introMouseRef.current = POS_SCATTER + (POS_TITLE - POS_SCATTER) * easeOutQuart(t);
        if (phase !== "resolve") {
          phase = "resolve";
          setIntroPhase("resolve");
        }
      } else {
        // Done — hand control back to real mouse
        introMouseRef.current = null;
        setIntroPhase("done");
        return; // stop RAF
      }

      introRAFRef.current = requestAnimationFrame(tick);
    }

    introRAFRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(introRAFRef.current);
  }, []);

  // ── Scroll-linked dissolve ──────────────────────────────────────
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const buttonsOpacity  = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const statueOpacity   = useTransform(scrollYProgress, [0.22, 0.62], [1, 0]);
  const bgOpacity       = useTransform(scrollYProgress, [0.35, 0.78], [1, 0.05]);
  const vignetteOpacity = useTransform(scrollYProgress, [0.1, 0.8], [0, 1]);

  // ── Mouse parallax ─────────────────────────────────────────────
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const bgX = useSpring(useTransform(rawX, (v) => v * -0.022), { stiffness: 30, damping: 25 });
  const bgY = useSpring(useTransform(rawY, (v) => v * -0.022), { stiffness: 30, damping: 25 });

  const statueX = useSpring(useTransform(rawX, (v) => v * -0.022), { stiffness: 60, damping: 22 });
  const statueY = useSpring(useTransform(rawY, (v) => v * -0.022), { stiffness: 60, damping: 22 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    rawX.set(e.clientX - window.innerWidth / 2);
    rawY.set(e.clientY - window.innerHeight / 2);
  }, [rawX, rawY]);

  // UI elements are invisible until intro is "done"
  const uiVisible = introPhase === "done";

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

        {/* ── Date text ── */}
        <motion.div
          style={{ opacity: buttonsOpacity }}
          className="absolute top-[62%] left-[10%] md:left-[16%] z-40 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: uiVisible ? 1 : 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
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

          <div className="flex items-center gap-8">
            <span className="text-xs font-semibold tracking-[0.25em] text-red-600 hidden md:block">
              ANOMALY / 2026
            </span>
            <button className="flex flex-col gap-1.5 group" aria-label="Toggle menu">
              <span className="w-8 h-[2px] bg-white group-hover:bg-red-500 transition" />
              <span className="w-8 h-[2px] bg-white group-hover:bg-red-500 transition" />
            </button>
          </div>
        </motion.nav>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: uiVisible ? 1 : 0 }}
          transition={{ duration: 1.0, ease: "easeOut", delay: 0.2 }}
        >
          <span className="text-white/40 text-[10px] tracking-[0.3em] uppercase">Scroll</span>
          <div className="w-[1px] h-8 bg-gradient-to-b from-white/40 to-transparent" />
        </motion.div>
      </div>
    </div>
  );
}
