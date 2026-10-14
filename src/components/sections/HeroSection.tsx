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
import { useRef, useCallback } from "react";

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Scroll-linked dissolve ──────────────────────────────────────
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const buttonsOpacity  = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const titleOpacity    = useTransform(scrollYProgress, [0.05, 0.32], [1, 0]);
  const titleScroll     = useTransform(scrollYProgress, [0, 0.35], [1, 1.12]);
  const titleScrollY    = useTransform(scrollYProgress, [0, 0.35], [0, -40]);
  const crosshairOpacity = useTransform(scrollYProgress, [0.12, 0.45], [0.6, 0]);
  const statueOpacity   = useTransform(scrollYProgress, [0.22, 0.62], [1, 0]);
  const bgOpacity       = useTransform(scrollYProgress, [0.35, 0.78], [1, 0.05]);
  const vignetteOpacity = useTransform(scrollYProgress, [0.1, 0.8], [0, 1]);

  // ── Mouse parallax ─────────────────────────────────────────────
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  // BG layer — same direction and speed as hero
  const bgX = useSpring(useTransform(rawX, (v) => v * -0.022), { stiffness: 30, damping: 25 });
  const bgY = useSpring(useTransform(rawY, (v) => v * -0.022), { stiffness: 30, damping: 25 });

  // Statue layer — opposite direction, reduced movement
  const statueX = useSpring(useTransform(rawX, (v) => v * -0.022), { stiffness: 60, damping: 22 });
  const statueY = useSpring(useTransform(rawY, (v) => v * -0.022), { stiffness: 60, damping: 22 });

  // Title — stays fixed, no parallax
  const titleParallaxX = useSpring(useTransform(rawX, () => 0), { stiffness: 45, damping: 28 });
  const titleParallaxY = useSpring(useTransform(rawY, () => 0), { stiffness: 45, damping: 28 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    rawX.set(e.clientX - window.innerWidth / 2);
    rawY.set(e.clientY - window.innerHeight / 2);
  }, [rawX, rawY]);

  return (
    <div ref={containerRef} className="relative h-[200vh]">
      <div
        className="sticky top-0 h-screen w-full overflow-hidden"
        onMouseMove={handleMouseMove}
      >
        {/* ── LAYER 0: Background shader (locked still) ── */}
        <motion.div
          style={{ opacity: bgOpacity }}
          className="absolute inset-0 z-0"
        >
          <HeroShader layerMode="bg" />
        </motion.div>

        {/* Darkness vignette */}
        <motion.div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            opacity: vignetteOpacity,
            background: "radial-gradient(ellipse 120% 80% at 50% 120%, #000 0%, rgba(0,0,0,0.85) 40%, transparent 75%)",
          }}
        />

        {/* ── LAYER 1: Crosshairs (moved inside shader textCanvas so they rotate/cut with the puzzle) ── */}
        {false && (
          <motion.div style={{ opacity: crosshairOpacity }} className="absolute inset-0 z-10 pointer-events-none">
            <div className="absolute top-[51%] left-[8%] w-[84%] h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
            <div className="absolute top-[68%] left-[20%] w-[60%] h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-30" />
            <div className="absolute top-[25%] h-[50%] left-[16%] w-[1px] bg-gradient-to-b from-transparent via-white to-transparent" />
            <div className="absolute top-[35%] h-[35%] left-[38%] w-[1px] bg-gradient-to-b from-transparent via-white to-transparent opacity-50" />
            <div className="absolute top-[25%] h-[50%] left-[55%] w-[1px] bg-gradient-to-b from-transparent via-white to-transparent" />
            <div className="absolute top-[30%] h-[45%] left-[80%] w-[1px] bg-gradient-to-b from-transparent via-white to-transparent opacity-60" />
            <div className="absolute top-[51%] left-[16%] w-2 h-2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full blur-[2px]" />
            <div className="absolute top-[51%] left-[16%] w-1 h-1 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full" />
            <div className="absolute top-[51%] left-[38%] w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full blur-[1px] opacity-70" />
            <div className="absolute top-[51%] left-[55%] w-2 h-2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full blur-[2px]" />
            <div className="absolute top-[51%] left-[55%] w-1 h-1 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full" />
            <div className="absolute top-[51%] left-[80%] w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full blur-[1px] opacity-70" />
            <div className="absolute top-[20%] left-[44%] w-[5%] h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-60" />
            <div className="absolute top-[16%] h-[8%] left-[46.5%] w-[1px] bg-gradient-to-b from-transparent via-white to-transparent opacity-60" />
            <div className="absolute top-[20%] left-[46.5%] w-1 h-1 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full opacity-80" />
          </motion.div>
        )}

        {/* ── LAYER 2: Title (temporarily hidden for experiment) ── */}
        {false && (
          <motion.div
            style={{
              opacity: titleOpacity,
              scale: titleScroll,
              y: titleScrollY,
              x: titleParallaxX,
            }}
            className="absolute top-[46.5%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none w-full text-center"
          >
            <motion.div style={{ y: titleParallaxY }}>
              <h1 className="font-arnprior text-[18vw] leading-none tracking-tight flex items-center justify-center">
                <span className="bg-gradient-to-b from-red-500 from-5% via-white via-20% to-neutral-800 text-transparent bg-clip-text">A</span>
                <span className="bg-gradient-to-b from-red-400 from-5% via-red-600 via-20% to-neutral-900 text-transparent bg-clip-text">N</span>
                <span className="bg-gradient-to-b from-red-500 from-5% via-white via-20% to-neutral-800 text-transparent bg-clip-text">OMALY</span>
              </h1>
            </motion.div>
          </motion.div>
        )}

        {/* ── LAYER 3: Hero statue (locked still) ── */}
        <motion.div
          style={{ opacity: statueOpacity }}
          className="absolute inset-0 z-20 pointer-events-none"
        >
          <HeroShader layerMode="hero" />
        </motion.div>

        {/* ── 12 Concentric Circular Cuts Shadow Overlay (Radius = 50vh, Center = Screen Center) ── */}
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

        {/* ── Date text (aligned with title baseline) ── */}
        <motion.div
          style={{ opacity: buttonsOpacity }}
          className="absolute top-[62%] left-[10%] md:left-[16%] z-40 pointer-events-none"
        >
          <p className="text-white/80 text-sm md:text-lg tracking-[0.3em] uppercase font-light">on jan 31 2026</p>
        </motion.div>

        {/* ── CTA Action Buttons ── */}
        <motion.div
          style={{ opacity: buttonsOpacity }}
          className="absolute bottom-12 right-8 md:right-20 z-40 flex flex-col gap-5 pointer-events-auto w-[260px] md:w-[320px]"
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
        <nav className="absolute top-8 left-8 right-8 md:left-20 md:right-20 z-50 flex justify-between items-center pointer-events-auto">
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
        </nav>

        {/* Scroll indicator */}
        <motion.div
          style={{ opacity: buttonsOpacity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 pointer-events-none"
        >
          <span className="text-white/40 text-[10px] tracking-[0.3em] uppercase">Scroll</span>
          <div className="w-[1px] h-8 bg-gradient-to-b from-white/40 to-transparent" />
        </motion.div>
      </div>
    </div>
  );
}
