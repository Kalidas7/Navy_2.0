/**
 * three.js scene constants — lifted directly from the design handoff
 * ("three.js scene") so the camera framing, lighting and tone mapping match.
 */
export const SCENE = {
  // Light scene: fog matches the CSS backdrop (#e6e9ee-ish) so the dark rack
  // fades into a light haze at distance, not a dark halo. Pushed farther out so
  // the rack itself stays crisp.
  fogColor: 0xe9ecf1,
  fogNear: 22,
  fogFar: 60,
  // Brighter neutral image-based light so the dark charcoal rack reads with
  // clean reflections against the bright background (was 0.04 for the dark scene).
  envIntensity: 0.6,

  // Slightly lower exposure so metal highlights don't blow out on the bright bg.
  toneMappingExposure: 1.0,
  maxPixelRatio: 2,

  camera: {
    fov: 45,
    near: 0.1,
    far: 100,
    position: [5.6, 4.2, 8.2] as [number, number, number],

    /**
     * Portrait framing (mobile only — see SceneController.fitWidth).
     *
     * `fov` is a VERTICAL angle, and the pose above is a wide landscape 3/4 shot.
     * As the viewport narrows, the horizontal field collapses (at 390×844 it is
     * ~22°, and the two-rack stage is sliced off at the screen edge) while
     * `minDistance` forbids pinching out to recover it.
     *
     * So on narrow viewports we widen the VERTICAL fov to hold the horizontal
     * extent roughly constant — a fit-width camera. `refAspect` is the aspect the
     * pose was authored at; `maxFov` caps the widening, because a true fit at
     * aspect 0.6 would demand ~95° and the perspective distortion would be worse
     * than the clipping it fixed.
     */
    refAspect: 1.6,
    maxFov: 65,
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
    // Neutral grey floor lines visible on a light background (were navy/dark).
    colorCenter: 0x9aa3af,
    colorGrid: 0xd5dae1,
    opacity: 0.5,
  },

  /** per-mesh explode lerp factor applied each frame */
  explodeLerp: 0.12,
  /** per-mesh explode direction scale: ((i-1) * step, 0, 0) */
  explodeStep: 3.4,
} as const;

export const LIGHTS = {
  // Light-theme rig: bright neutral hemisphere with a light floor-bounce so the
  // dark rack separates from the light scene; white key from upper-front; a
  // near-white fill (was blue) and a subtle cool rim (was tactical green) so
  // edges read against the bright background without a coloured cast.
  hemisphere: { sky: 0xffffff, ground: 0xdfe3e9, intensity: 0.9 },
  key: { color: 0xffffff, intensity: 1.6, position: [6, 11, 8] as [number, number, number] },
  fill: { color: 0xf2f5f8, intensity: 0.6, position: [-8, 4, -3] as [number, number, number] },
  rim: { color: 0xbcd0e6, intensity: 0.5, position: [-4, 5, -9] as [number, number, number] },
} as const;
