"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { VS, FS_IMAGE, FS_FBM, FS_DITHER } from "@/lib/shaders";
import { soundFX } from "@/lib/soundFX";

// =====================================================================
//  R—K Hero Shader — React Component
//  Pipeline:  Black BG → Portrait + DepthParallax → FBM → Dither
// =====================================================================

interface FBO {
  fb: WebGLFramebuffer;
  tex: WebGLTexture;
  w: number;
  h: number;
}

export default function HeroShader({
  layerMode = 'both',
  introOverride,
}: {
  layerMode?: 'bg' | 'hero' | 'both';
  introOverride?: React.RefObject<number | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const init = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: layerMode === 'hero',
      premultipliedAlpha: false,
    });
    if (!gl) {
      console.error("WebGL 2 required");
      return;
    }

    /* ─── helpers ────────────────────────────────────────────── */
    function compile(type: number, src: string): WebGLShader | null {
      const s = gl!.createShader(type);
      if (!s) return null;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
        console.error(gl!.getShaderInfoLog(s), "\n", src);
        return null;
      }
      return s;
    }

    function link(vs: string, fs: string): WebGLProgram | null {
      const p = gl!.createProgram();
      if (!p) return null;
      const vsShader = compile(gl!.VERTEX_SHADER, vs);
      const fsShader = compile(gl!.FRAGMENT_SHADER, fs);
      if (!vsShader || !fsShader) return null;
      gl!.attachShader(p, vsShader);
      gl!.attachShader(p, fsShader);
      gl!.linkProgram(p);
      if (!gl!.getProgramParameter(p, gl!.LINK_STATUS)) {
        console.error(gl!.getProgramInfoLog(p));
        return null;
      }
      return p;
    }

    function makeFBO(w: number, h: number): FBO {
      const tex = gl!.createTexture()!;
      gl!.bindTexture(gl!.TEXTURE_2D, tex);
      gl!.texImage2D(
        gl!.TEXTURE_2D, 0, gl!.RGBA8, w, h, 0,
        gl!.RGBA, gl!.UNSIGNED_BYTE, null
      );
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      const fb = gl!.createFramebuffer()!;
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, fb);
      gl!.framebufferTexture2D(
        gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, tex, 0
      );
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
      return { fb, tex, w, h };
    }

    function loadImg(url: string): Promise<HTMLImageElement> {
      return new Promise((res, rej) => {
        const i = new Image();
        i.crossOrigin = "";
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = url;
      });
    }

    function uploadTex(img: HTMLImageElement): WebGLTexture {
      const t = gl!.createTexture()!;
      gl!.bindTexture(gl!.TEXTURE_2D, t);
      // Do NOT flip — shader handles Y-flip explicitly like the original
      gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, false);
      gl!.texImage2D(
        gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, img
      );
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      return t;
    }

    /* ─── fullscreen quad ───────────────────────────────────── */
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
    gl.bindVertexArray(null);

    function quad() {
      gl!.bindVertexArray(vao);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    }

    /* ─── state ──────────────────────────────────────────────── */
    let W: number, H: number;
    let fboA: FBO, fboB: FBO;

    // Mouse: separate smooth values for depth (momentum 0.92) vs FBM (momentum 1.0)
    let rawMX = 0.5,
      rawMY = 0.5;
    let depthMX = 0.5,
      depthMY = 0.5; // momentum 0.92
    let fbmMX = 0.5,
      fbmMY = 0.5; // momentum 1.0

    let t0 = 0; // animation start time
    let lastNow = 0; // previous frame timestamp
    let fbmAccTime = 0; // accumulated FBM time (frame-count based)
    let ditherAccTime = 0; // accumulated dither time (frame-count based)
    let loaded = false;

    // Original scene FPS = 24
    const BASE_FPS = 24;

    let userEngaged = false;
    let initialUserX = -1;

    /* ─── mouse ──────────────────────────────────────────────── */
    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX / window.innerWidth;
      const newY = 1.0 - e.clientY / window.innerHeight; // flip Y for GL

      if (!userEngaged) {
        if (initialUserX < 0) {
          initialUserX = newX;
        } else if (Math.abs(newX - initialUserX) > 0.04) {
          // User intentionally moved cursor by >4% of screen width!
          userEngaged = true;
        }
      }

      if (userEngaged) {
        rawMX = newX;
      }
      rawMY = newY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      const newX = t.clientX / window.innerWidth;
      const newY = 1.0 - t.clientY / window.innerHeight;

      if (!userEngaged) {
        userEngaged = true; // Any touch is intentional
      }
      rawMX = newX;
      rawMY = newY;
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("touchmove", handleTouchMove, { passive: true });

    /* ─── compile programs ───────────────────────────────────── */
    const pImage = link(VS, FS_IMAGE)!;
    const pFBM = link(VS, FS_FBM)!;
    const pDither = link(VS, FS_DITHER)!;

    let texOutline: WebGLTexture | null = null;

    /* ─── resize ─────────────────────────────────────────────── */

    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      W = Math.floor(canvas!.clientWidth * dpr);
      H = Math.floor(canvas!.clientHeight * dpr);
      canvas!.width = W;
      canvas!.height = H;

      // FBM runs at 0.75× downsample (original userDownsample)
      const fbmW = Math.floor(W * 0.75);
      const fbmH = Math.floor(H * 0.75);

      if (fboA) {
        gl!.deleteFramebuffer(fboA.fb);
        gl!.deleteTexture(fboA.tex);
      }
      if (fboB) {
        gl!.deleteFramebuffer(fboB.fb);
        gl!.deleteTexture(fboB.tex);
      }
      fboA = makeFBO(W, H);
      fboB = makeFBO(fbmW, fbmH);

      if (layerMode === 'hero') {
        document.fonts.ready.then(() => {
          const textCanvas = document.createElement('canvas');
          textCanvas.width = W;
          textCanvas.height = H;
          const ctx = textCanvas.getContext('2d')!;
          
          if ('letterSpacing' in ctx) {
            (ctx as unknown as { letterSpacing: string }).letterSpacing = "-0.025em";
          }
          // ── Draw ANOMALY white outline title ──
          const fontSize = window.innerWidth * 0.15;
          ctx.font = `${fontSize}px Arnprior, serif`;
          ctx.textBaseline = 'middle';
          ctx.lineWidth = Math.max(1.8, W * 0.0018);
          ctx.textAlign = 'center';
          
          const text = "ANOMALY";
          const textY = H * 0.465;
          ctx.strokeStyle = '#ffffff';
          ctx.strokeText(text, W / 2, textY);
          
          if (!texOutline) texOutline = gl!.createTexture()!;
          gl!.bindTexture(gl!.TEXTURE_2D, texOutline);
          gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, true);
          gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, textCanvas);
          gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
          gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
          gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
          gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
          gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, false);
        });
      }
    }
    window.addEventListener("resize", resize);

    /* ─── easing functions ──────────────── */
    function easeOutQuart(s: number) {
      return 1 - Math.pow(1 - s, 4);
    }
    function easeInOutQuart(s: number) {
      return s < 0.5 ? 8 * s ** 4 : 1 - Math.pow(-2 * s + 2, 4) / 2;
    }
    function easeInOutCubic(s: number) {
      return s < 0.5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2;
    }
    function U(prog: WebGLProgram, name: string) {
      return gl!.getUniformLocation(prog, name);
    }

    resize();

    /* ─── load textures ──────────────────────────────────────── */
    let texBg: WebGLTexture | null = null;
    let texBgDepth: WebGLTexture | null = null;
    let texHero: WebGLTexture | null = null;
    let texHeroDepth: WebGLTexture | null = null;

    const promises = [];
    if (layerMode === 'bg' || layerMode === 'both') {
      promises.push(
        Promise.all([loadImg("/bg.png"), loadImg("/bgdepthmap.webp")]).then(([i1, i2]) => {
          texBg = uploadTex(i1);
          texBgDepth = uploadTex(i2);
        })
      );
    }
    if (layerMode === 'hero' || layerMode === 'both') {
      promises.push(
        Promise.all([loadImg("/hero.png"), loadImg("/depthmap.webp")]).then(([i1, i2]) => {
          texHero = uploadTex(i1);
          texHeroDepth = uploadTex(i2);
        })
      );
    }
    await Promise.all(promises);

    t0 = performance.now();
    lastNow = t0;
    loaded = true;

    /* ─── render loop ────────────────────────────────────────── */
    function frame(now: number) {
      rafRef.current = requestAnimationFrame(frame);
      if (!loaded) return;

      const dt = lastNow ? Math.min((now - lastNow) / 1000, 0.1) : 1 / 60;
      lastNow = now;
      const sec = (now - t0) / 1000;

      // ── Mouse momentum smoothing (silky, weighted mechanical dial response) ──
      const virtualMX = introOverride?.current ?? null;
      const prevDepthMX = depthMX;

      if (virtualMX !== null) {
        // While intro is running, anchor internal mouse tracking to the virtual position
        depthMX = virtualMX;
        rawMX = virtualMX;

        // Intro sounds: ratchet clicks and lock chimes
        const delta = Math.abs(depthMX - prevDepthMX);
        if (delta > 0.001) {
          soundFX.playRatchetClick(1.1);
        }
        if (depthMX <= 0.28 && prevDepthMX > 0.28) {
          soundFX.playSnapLock("title");
        }
      } else if (!userEngaged) {
        // Intro just finished! Keep depthMX anchored at the solved Title position (e.g. 0.20)
        // until the user deliberately moves their cursor (>4% screen threshold)
      } else {
        // User intentionally engaged: smoothly interpolate toward their actual mouse position
        depthMX += (rawMX - depthMX) * 0.12;

        // Interactive sounds
        const delta = Math.abs(depthMX - prevDepthMX);
        if (delta > 0.0012) {
          soundFX.playRatchetClick(0.95);
        }

        // Magnetic snap lock sounds
        if (depthMX <= 0.28) {
          soundFX.playSnapLock("title");
        } else if (depthMX >= 0.72) {
          soundFX.playSnapLock("hero");
        } else {
          soundFX.resetSnapState();
        }
      }

      depthMY += (rawMY - depthMY) * 0.12;
      fbmMX += (rawMX - fbmMX) * 0.05;
      fbmMY += (rawMY - fbmMY) * 0.05;

      // ── Appear animations ──
      const opP = Math.min(Math.max(sec - 0.1, 0) / 0.5, 1);
      const opacity = easeOutQuart(opP);

      const exP = Math.min(sec / 0.8, 1);
      const exposure = -0.5 + 0.5 * easeInOutQuart(exP);

      const mrP = Math.min(sec / 1.0, 1);
      const mixRadius = 1.0 + (0.44 - 1.0) * easeInOutCubic(mrP);

      const spP = Math.min(sec / 0.9, 1);
      const speed = 0.35 + (0.12 - 0.35) * easeInOutQuart(spP);

      fbmAccTime += speed * dt * BASE_FPS;
      ditherAccTime += 0.5 * dt * BASE_FPS;

      const clearA = layerMode === 'hero' ? 0.0 : 1.0;

      // ═══════ PASS 1 — Background + Hero Layered → FBO A ═══════
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, fboA.fb);
      gl!.viewport(0, 0, fboA.w, fboA.h);
      gl!.clearColor(0, 0, 0, clearA);
      gl!.clear(gl!.COLOR_BUFFER_BIT);

      gl!.useProgram(pImage);

      if (layerMode === 'bg' || layerMode === 'both') {
        gl!.activeTexture(gl!.TEXTURE0);
        gl!.bindTexture(gl!.TEXTURE_2D, texBg!);
        gl!.uniform1i(U(pImage, "uSourceImage"), 0);
        gl!.activeTexture(gl!.TEXTURE1);
        gl!.bindTexture(gl!.TEXTURE_2D, texBgDepth!);
        gl!.uniform1i(U(pImage, "uDepthMap"), 1);
        gl!.uniform2f(U(pImage, "uResolution"), fboA.w, fboA.h);
        gl!.uniform2f(U(pImage, "uMousePos"), 0.5, 0.5);
        gl!.uniform1f(U(pImage, "uExposure"), exposure);
        gl!.uniform1f(U(pImage, "uOpacity"), opacity);
        gl!.uniform1f(U(pImage, "uIsOverlay"), 0.0);
        gl!.uniform1f(U(pImage, "uScale"), 1.0);
        gl!.uniform1f(U(pImage, "uOffsetY"), 0.0);
        quad();
      }

      if (layerMode === 'hero' || layerMode === 'both') {
        if (layerMode === 'both') {
          gl!.enable(gl!.BLEND);
          gl!.blendFunc(gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA);
        }
        gl!.activeTexture(gl!.TEXTURE0);
        gl!.bindTexture(gl!.TEXTURE_2D, texHero!);
        gl!.uniform1i(U(pImage, "uSourceImage"), 0);
        gl!.activeTexture(gl!.TEXTURE1);
        gl!.bindTexture(gl!.TEXTURE_2D, texHeroDepth!);
        gl!.uniform1i(U(pImage, "uDepthMap"), 1);
        
        gl!.activeTexture(gl!.TEXTURE2);
        gl!.bindTexture(gl!.TEXTURE_2D, texOutline || texBg!); // Fallback to any valid texture until outline is ready
        gl!.uniform1i(U(pImage, "uOutlineTex"), 2);
        
        gl!.uniform2f(U(pImage, "uResolution"), fboA.w, fboA.h);
        gl!.uniform2f(U(pImage, "uMousePos"), 0.5, 0.5);
        gl!.uniform1f(U(pImage, "uExposure"), exposure);
        gl!.uniform1f(U(pImage, "uOpacity"), opacity);
        gl!.uniform1f(U(pImage, "uIsOverlay"), 1.0); // Always output alpha for hero
        gl!.uniform1f(U(pImage, "uScale"), 1.43);
        gl!.uniform1f(U(pImage, "uOffsetY"), 0.215);
        quad();
        if (layerMode === 'both') {
          gl!.disable(gl!.BLEND);
        }
      }

      // ═══════ PASS 2 — FBM Distortion → FBO B ═══════
      if (layerMode !== 'hero') {
        gl!.bindFramebuffer(gl!.FRAMEBUFFER, fboB.fb);
        gl!.viewport(0, 0, fboB.w, fboB.h);
        gl!.clearColor(0, 0, 0, clearA);
        gl!.clear(gl!.COLOR_BUFFER_BIT);

        gl!.useProgram(pFBM);
        gl!.activeTexture(gl!.TEXTURE0);
        gl!.bindTexture(gl!.TEXTURE_2D, fboA.tex);
        gl!.uniform1i(U(pFBM, "uTexture"), 0);
        gl!.uniform2f(U(pFBM, "uResolution"), fboB.w, fboB.h);
        gl!.uniform2f(U(pFBM, "uMousePos"), fbmMX, fbmMY);
        gl!.uniform1f(U(pFBM, "uTime"), fbmAccTime);
        gl!.uniform1f(U(pFBM, "uMixRadius"), mixRadius);
        quad();
      }

      // ═══════ PASS 3 — Dither → Screen ═══════
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
      gl!.viewport(0, 0, W, H);
      gl!.clearColor(0, 0, 0, clearA);
      gl!.clear(gl!.COLOR_BUFFER_BIT);

      gl!.useProgram(pDither);
      gl!.activeTexture(gl!.TEXTURE0);
      // If hero layer, skip FBM and read straight from Pass 1 (fboA)
      gl!.bindTexture(gl!.TEXTURE_2D, layerMode === 'hero' ? fboA.tex : fboB.tex);
      gl!.uniform1i(U(pDither, "uTexture"), 0);

      gl!.activeTexture(gl!.TEXTURE1);
      gl!.bindTexture(gl!.TEXTURE_2D, texOutline || fboA.tex);
      gl!.uniform1i(U(pDither, "uTextTex"), 1);
      gl!.uniform1f(U(pDither, "uHasText"), (layerMode === 'hero' && texOutline) ? 1.0 : 0.0);

      gl!.uniform1f(U(pDither, "uTime"), ditherAccTime);
      gl!.uniform2f(U(pDither, "uResolution"), W, H);
      const effectiveMX = virtualMX !== null ? virtualMX : depthMX;
      gl!.uniform2f(U(pDither, "uMousePos"), effectiveMX, depthMY);
      quad();
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("resize", resize);

      gl!.deleteBuffer(vb);
      gl!.deleteVertexArray(vao);
      gl!.deleteProgram(pImage);
      gl!.deleteProgram(pFBM);
      gl!.deleteProgram(pDither);
      if (texBg) gl!.deleteTexture(texBg);
      if (texBgDepth) gl!.deleteTexture(texBgDepth);
      if (texHero) gl!.deleteTexture(texHero);
      if (texHeroDepth) gl!.deleteTexture(texHeroDepth);
      if (texOutline) gl!.deleteTexture(texOutline);
      if (fboA) { gl!.deleteFramebuffer(fboA.fb); gl!.deleteTexture(fboA.tex); }
      if (fboB) { gl!.deleteFramebuffer(fboB.fb); gl!.deleteTexture(fboB.tex); }
    };
  }, [layerMode]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    init().then((cleanupFn) => { cleanup = cleanupFn; });
    return () => { if (cleanup) cleanup(); else cancelAnimationFrame(rafRef.current); };
  }, [init]);

  return <canvas ref={canvasRef} className="block w-screen h-screen" />;
}
