// =====================================================================
//  R—K Hero Shader — GLSL Sources
//  Pipeline: Black BG → Portrait + DepthParallax → FBM → Dither
// =====================================================================

/** Passthrough vertex shader */
export const VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 p;
layout(location=1) in vec2 t;
out vec2 vUV;
void main(){ vUV=t; gl_Position=vec4(p,0,1); }`;

/** PASS 1 — Portrait + Depth-Map Parallax */
export const FS_IMAGE = `#version 300 es
precision highp float;
precision highp int;
in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uSourceImage;
uniform sampler2D uDepthMap;
uniform vec2 uResolution;
uniform vec2 uMousePos;     // depth parallax mouse (momentum 0.92)
uniform float uExposure;
uniform float uOpacity;
uniform float uIsOverlay;    // 0.0 = composite onto black, 1.0 = preserve alpha for layering
uniform float uScale;        // 1.0 = normal, >1.0 = smaller image
uniform float uOffsetY;      // vertical offset in UV space

// ── cover-fit UV (image fills entire canvas) ──
vec2 getCoverUV(vec2 uv, vec2 texSize, vec2 canvasSize) {
  float texAspect = texSize.x / texSize.y;
  float canAspect = canvasSize.x / canvasSize.y;
  vec2 c = uv;
  if (canAspect < texAspect) {
    float s = canAspect / texAspect;
    c.x = uv.x * s + (1.0 - s) * 0.5;
  } else {
    float s = texAspect / canAspect;
    c.y = uv.y * s + (1.0 - s) * 0.5;
  }
  return c;
}

// ── depth from depth-map (original) ──
float getDepth(vec2 uv) {
  vec2 texSize = vec2(textureSize(uDepthMap, 0));
  vec2 coverUV = getCoverUV(uv, texSize, uResolution);
  vec4 dc = texture(uDepthMap, coverUV);
  float d = dot(dc.rgb, vec3(0.299, 0.587, 0.114));
  return 1.0 - d;
}

// ── sample portrait with cover fit + Y flip (original image shader) ──
vec4 samplePortrait(vec2 uv) {
  vec2 texSize = vec2(textureSize(uSourceImage, 0));
  vec2 coverUV = getCoverUV(uv, texSize, uResolution);
  vec2 flippedUV = vec2(coverUV.x, 1.0 - coverUV.y);
  if (coverUV.x < 0.0 || coverUV.x > 1.0 || coverUV.y < 0.0 || coverUV.y > 1.0)
    return vec4(0.0);
  return textureLod(uSourceImage, flippedUV, 0.0);
}

uniform sampler2D uOutlineTex;

void main() {
  // Apply scale: >1.0 shrinks the image, centered + vertical offset
  vec2 uv = (vUV - 0.5) * uScale + 0.5 + vec2(0.0, uOffsetY);

  // ── Depth-map parallax occlusion ──
  // Reduced mouse offset multiplier from 0.35 to 0.12 to minimize stretching
  vec2 mouseOffset = (uMousePos - 0.5) * 0.12;
  vec2 parallaxDir = mouseOffset * 0.24 * 0.2;
  float layerDepth = 1.0 / 16.0 * 0.5;
  float currentLayerDepth = 0.0;

  vec2 currentUv = uv;
  vec2 prevUv = currentUv;
  float currentDepth = getDepth(currentUv);
  float prevDepth = currentDepth;

  for (int i = 0; i < 16; i++) {
    if (currentDepth < currentLayerDepth) break;
    currentLayerDepth += layerDepth;
    prevUv = currentUv;
    prevDepth = currentDepth;
    currentUv -= parallaxDir * layerDepth;
    currentDepth = getDepth(currentUv);
  }

  float beforeDepth = prevDepth - (currentLayerDepth - layerDepth);
  float afterDepth  = currentDepth - currentLayerDepth;
  float weight = beforeDepth / (beforeDepth - afterDepth + 1e-5);
  weight = clamp(weight, 0.0, 1.0);
  vec2 offsetUv = mix(prevUv, currentUv, weight);

  // ── Sample image at parallax-offset UV ──
  vec4 color = samplePortrait(offsetUv);

  // ── Exposure adjustment (original) ──
  if (uExposure != 0.0) {
    vec3 ec = clamp(color.rgb + uExposure, 0.0, 1.0);
    color.rgb = mix(color.rgb, ec, color.a);
  }
  color.rgb = clamp(color.rgb, 0.0, 1.0);
  color.rgb *= color.a;

  // ── Compositing ──
  if (uIsOverlay > 0.5) {
    // HERO LAYER
    // Outline text disabled for now
    // vec4 outline = texture(uOutlineTex, vUV);
    // outline.a *= color.a;
    // color.rgb = mix(color.rgb, outline.rgb, outline.a * 0.8);

    // Overlay mode: output premultiplied alpha for blending
    fragColor = vec4(color.rgb * uOpacity, color.a * uOpacity);
  } else {
    // Base mode: composite onto black background
    vec4 bg = vec4(0.0, 0.0, 0.0, 1.0);
    fragColor = mix(bg, color + bg * (1.0 - color.a), uOpacity);
  }
}`;

/** PASS 2 — Background Effect (Mosaic Ripple + Chromatic) */
export const FS_FBM = `#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uMixRadius;
uniform vec2 uMousePos;
uniform vec2 uResolution;

void main() {
  vec2 uv = vUV;
  float ar = uResolution.x / uResolution.y;
  
  // 1. RIPPLE ANIMATION (animStyle: ripple, animSpeed: 98, animIntensity: 60)
  // We fix the center to the middle of the screen
  vec2 center = vec2(0.5, 0.5);
  vec2 aspectUv = uv * vec2(ar, 1.0);
  vec2 aspectCenter = center * vec2(ar, 1.0);
  float dist = distance(aspectUv, aspectCenter);
  
  // Ripple disabled
  // float rippleSpeed = uTime * 4.0; 
  // float rippleAmount = sin(dist * 60.0 - rippleSpeed) * 0.015;
  vec2 dir = normalize(aspectUv - aspectCenter + 0.0001);
  // vec2 rippleUv = uv + (dir / vec2(ar, 1.0)) * rippleAmount;
  vec2 rippleUv = uv;

  // 2. MOSAIC / PIXELATION (cellSize: 13)
  float cellSize = 13.0;
  // Adjust grid based on the FBO resolution
  vec2 grid = uResolution / cellSize;
  // Mosaic disabled — use rippleUv directly
  // vec2 mosaicUv = floor(rippleUv * grid) / grid;
  vec2 mosaicUv = rippleUv;

  // 3. CHROMATIC ABERRATION (intensity: 15)
  // Chromatic shift pulls radially from the center
  vec2 chromOffset = (dir / vec2(ar, 1.0)) * (15.0 / uResolution.x);
  
  float r = texture(uTexture, mosaicUv + chromOffset).r;
  float g = texture(uTexture, mosaicUv).g;
  float b = texture(uTexture, mosaicUv - chromOffset).b;
  vec4 baseColor = texture(uTexture, mosaicUv); // Get original alpha
  vec3 color = vec3(r, g, b);

  // 4. BRIGHTNESS / CONTRAST (brightness: 12, contrast: 115)
  color = (color - 0.5) * 1.15 + 0.5; // Contrast
  color = color + 0.12;               // Brightness

  // 5. VIGNETTE (intensity: 38)
  float vigDist = distance(uv, vec2(0.5));
  float vignette = smoothstep(0.9, 0.3, vigDist * (1.0 + 0.38));
  color *= vignette;

  fragColor = vec4(clamp(color, 0.0, 1.0), baseColor.a);
}`;

/** PASS 3 — 10 Concentric Circular Cuts with Solved Hero & Unsolved Text Puzzle */
export const FS_DITHER = `#version 300 es
precision highp float;
precision highp int;
in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uTexture;     // Base layer (hero statue or bg) - SOLVED
uniform sampler2D uTextTex;     // Text layer (ANOMALY) - UNSOLVED
uniform float uHasText;         // 1.0 if hero layer has text texture ready
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMousePos;

void main() {
  vec2 uv = vUV;
  float ar = uResolution.x / uResolution.y;

  // Center of screen
  vec2 center = vec2(0.5, 0.5);
  vec2 aspectUv = uv * vec2(ar, 1.0);
  vec2 aspectCenter = center * vec2(ar, 1.0);
  float dist = distance(aspectUv, aspectCenter);

  // Maximum radius is half of the height of the screen (0.5)
  float maxRadius = 0.5;
  float ringStep = maxRadius / 12.0; // Exactly 12 rings inside 0.5 radius
  vec2 worldSampleUV = uv;
  vec2 textSampleUV = uv;

  // Inside the 12 concentric rings
  if (dist < maxRadius) {
    int ringIndex = int(clamp(floor(dist / ringStep), 0.0, 11.0));

    // Angle from center
    float angle = atan(aspectUv.y - aspectCenter.y, aspectUv.x - aspectCenter.x);

    // Moderate, elegant gear speeds across the 12 concentric rings
    float ringSpeeds[12] = float[12](
      0.6,   // Ring 0: slow, heavy central dial
      -3.8,  // Ring 1: gentle counter-clockwise
      1.8,   // Ring 2: medium clockwise
      -5.2,  // Ring 3: counter-clockwise
      1.1,   // Ring 4: sluggish glide clockwise
      -6.4,  // Ring 5: steady counter-clockwise
      2.4,   // Ring 6: moderate clockwise
      -4.9,  // Ring 7: smooth counter-clockwise
      0.8,   // Ring 8: heavy slow crawl clockwise
      -3.4,  // Ring 9: moderate counter-clockwise
      2.1,   // Ring 10: medium clockwise
      -4.2   // Ring 11: outer ring counter-clockwise
    );

    float speed = ringSpeeds[ringIndex];

    // Artistic imperfect micro-offsets (wabi-sabi 90% alignment)
    float textImperfect[12] = float[12](
      0.014,   // Ring 0
      -0.034,  // Ring 1
      0.040,   // Ring 2
      -0.025,  // Ring 3
      0.046,   // Ring 4
      -0.036,  // Ring 5
      0.030,   // Ring 6
      -0.043,  // Ring 7
      0.023,   // Ring 8
      -0.035,  // Ring 9
      0.038,   // Ring 10
      -0.028   // Ring 11
    );

    float heroImperfect[12] = float[12](
      -0.021,  // Ring 0
      0.033,   // Ring 1
      -0.039,  // Ring 2
      0.026,   // Ring 3
      -0.043,  // Ring 4
      0.034,   // Ring 5
      -0.028,  // Ring 6
      0.040,   // Ring 7
      -0.025,  // Ring 8
      0.031,   // Ring 9
      -0.042,  // Ring 10
      0.029    // Ring 11
    );

    // ── MAGNETIC SNAP SETTINGS (Tightened so resolution occurs precisely at endpoints) ──
    // Alignment holds strictly at the boundaries
    float holdRadius = 0.005;
    // Immediate response away from endpoints
    float easeRange = 0.025;

    // ── ALIGNMENT POINT 1: TEXT ALIGNED strictly at 0.0 -> 0.23 (Left / +40° Start Edge Zone) ──
    // Text resolves right at 0.0 progress (shader X <= 0.23)
    float rawDeltaText = max(0.0, uMousePos.x - 0.22);
    float tText = smoothstep(holdRadius, holdRadius + easeRange, rawDeltaText);
    float effectiveDeltaText = rawDeltaText * tText;
    float rotText = effectiveDeltaText * speed * 1.7 + textImperfect[ringIndex] * (1.0 - tText);

    // ── ALIGNMENT POINT 2: HERO STATUE ALIGNED strictly at 0.71 -> 1.0 (Right / -40° End Edge Zone) ──
    // Hero resolves right at 1.0 progress (shader X >= 0.71)
    float rawDeltaHero = max(0.0, 0.72 - uMousePos.x);
    float tHero = smoothstep(holdRadius, holdRadius + easeRange, rawDeltaHero);
    float effectiveDeltaHero = -rawDeltaHero * tHero;
    float rotHero = effectiveDeltaHero * speed * 1.7 + heroImperfect[ringIndex] * (1.0 - tHero);

    // 1. Digital UI sample UV (Text + Crosshairs, solves at Mouse X = 0.28)
    float textAngle = angle + rotText;
    vec2 rotatedAspectText = aspectCenter + vec2(cos(textAngle), sin(textAngle)) * dist;
    textSampleUV = vec2(rotatedAspectText.x / ar, rotatedAspectText.y);
    textSampleUV = clamp(textSampleUV, vec2(0.001), vec2(0.999));

    // 2. Physical World sample UV (Hero + Background, solves at Mouse X = 0.72)
    float worldAngle = angle + rotHero;
    vec2 rotatedAspectWorld = aspectCenter + vec2(cos(worldAngle), sin(worldAngle)) * dist;
    worldSampleUV = vec2(rotatedAspectWorld.x / ar, rotatedAspectWorld.y);
    worldSampleUV = clamp(worldSampleUV, vec2(0.001), vec2(0.999));
  }

  // 1. Base image (Hero statue and Background) sampled at worldSampleUV
  vec4 color = texture(uTexture, worldSampleUV);

  // 2. Digital UI overlay (ANOMALY text + Crosshairs) sampled at textSampleUV
  if (uHasText > 0.5) {
    vec4 textSample = texture(uTextTex, textSampleUV);
    if (textSample.a > 0.01) {
      color.rgb = mix(color.rgb, textSample.rgb, textSample.a);
      color.a = max(color.a, textSample.a);
    }
  }

  // 3. Subtle ambient occlusion / drop shadow between the 12 rings (no white outline lines)
  if (dist < maxRadius) {
    float ringFrac = fract(dist / ringStep);
    // Soft shadow gradient dipping near ring boundary seams
    float edgeShadow = smoothstep(0.0, 0.20, ringFrac) * smoothstep(1.0, 0.80, ringFrac);
    float ringShadow = mix(0.70, 1.0, edgeShadow);
    color.rgb *= ringShadow;
  }

  if (color.a == 0.0) {
    fragColor = vec4(0.0);
    return;
  }

  fragColor = color;
}`;
