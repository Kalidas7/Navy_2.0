/**
 * three.js scene constants — lifted directly from the design handoff
 * ("three.js scene") so the camera framing, lighting and tone mapping match.
 */
export const SCENE = {
  fogColor: 0x06090b,
  fogNear: 16,
  fogFar: 42,
  envIntensity: 0.04,

  toneMappingExposure: 1.08,
  maxPixelRatio: 2,

  camera: {
    fov: 45,
    near: 0.1,
    far: 100,
    position: [5.6, 4.2, 8.2] as [number, number, number],
  },

  controls: {
    dampingFactor: 0.08,
    target: [0.69, 2.45, 0] as [number, number, number],
    minDistance: 4.5,
    maxDistance: 22,
    maxPolarAngle: 1.62,
    autoRotateSpeed: 0.9,
  },

  grid: {
    size: 60,
    divisions: 60,
    colorCenter: 0x2f7fc4,
    colorGrid: 0x123040,
    opacity: 0.32,
  },

  /** per-mesh explode lerp factor applied each frame */
  explodeLerp: 0.12,
  /** per-mesh explode direction scale: ((i-1) * step, 0, 0) */
  explodeStep: 3.4,
} as const;

export const LIGHTS = {
  hemisphere: { sky: 0x9fc6e6, ground: 0x05080a, intensity: 0.6 },
  key: { color: 0xffffff, intensity: 1.5, position: [6, 11, 8] as [number, number, number] },
  fill: { color: 0x88bbff, intensity: 0.5, position: [-8, 4, -3] as [number, number, number] },
  rim: { color: 0x2bf0a0, intensity: 0.55, position: [-4, 5, -9] as [number, number, number] },
} as const;
