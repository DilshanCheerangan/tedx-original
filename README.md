# TEDxCUSAT 2026 — ANOMALY

Official landing page for **TEDxCUSAT 2026: ANOMALY**.

Features an interactive WebGL kinetic dial puzzle with 12 concentric sliced rings, dual-point mouse alignment (Digital UI at X ≈ 28% and Physical World at X ≈ 72%), magnetic latch hold plateau, and interactive RandomLetterSwap kinetic buttons.

## Tech Stack
- **Framework:** Next.js (App Router, Turbopack)
- **Styling:** Tailwind CSS v4
- **Animation:** Framer Motion
- **Shader:** Custom WebGL 2.0 multi-pass pipeline (Texture Parallax + FBM noise distortion + Concentric Ring Dial & Dither)
- **Typography:** Arnprior Custom Font

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Build

```bash
npm run build
```
