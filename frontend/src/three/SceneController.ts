/**
 * SceneController — framework-agnostic three.js setup for the rack detail view.
 *
 * Owns the renderer, camera, OrbitControls, lighting, grid, GLB model, the
 * explode animation, and per-frame hotspot projection. This is the part the
 * handoff says to lift closely; the React layer (see useScene) only mounts it,
 * forwards state (autoRotate / exploded), and renders the projected markers.
 *
 * Hotspot projection: each frame we project the COMPS world positions to 2D
 * screen coordinates and report them to a callback, which React uses to place
 * the HTML marker DOM. Markers behind the camera are reported as hidden.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SCENE, LIGHTS } from './sceneConstants';
import {
  COMPS,
  DATACENTER_PART_BY_COMP,
  DATACENTER_HIDE_ON_EXPLODE,
  type ModelConfig,
} from '@/config/components';
import type { CompKey } from '@/types';

/** Per-frame projected position of one hotspot. */
export interface MarkerPosition {
  key: CompKey;
  x: number;
  y: number;
  /** false when the point is behind the camera (marker should fade out) */
  visible: boolean;
  /**
   * Reveal opacity 0→1, ramped by the controller while the collapse fly-in plays
   * so hotspots fade in DURING the motion (not popped after). 1 at rest. Combined
   * with `visible` (behind-camera) by the React marker.
   */
  reveal: number;
}

export interface SceneCallbacks {
  onLoadProgress: (pct: number) => void;
  onLoaded: () => void;
  onError: (message: string) => void;
  onMarkers: (positions: MarkerPosition[]) => void;
  /** Fired when the user clicks either rack in the datacenter two-rack stage. */
  onRackClick?: () => void;
}

interface MeshState {
  mesh: THREE.Object3D;
  orig: THREE.Vector3;
  dir: THREE.Vector3;
  /** Mesh/node name, used to map a focused hotspot to its mesh (datacenter). */
  name: string;
  /** Baseline material opacity captured at load, restored when focus clears. */
  baseOpacity: number;
  baseTransparent: boolean;
}

interface HotspotState {
  key: CompKey;
  v: THREE.Vector3;
}

export class SceneController {
  private host: HTMLElement;
  private cb: SceneCallbacks;
  private model: ModelConfig;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private pmrem!: THREE.PMREMGenerator;
  private ro?: ResizeObserver;
  /**
   * GPU resources created outside the model groups, held so dispose() can free
   * them. The env render target (from PMREM) and the grid's geometry/material
   * are NOT reached by the rootGroup/twinGroup walk, so without these refs they
   * leaked VRAM on every scene teardown (mount/unmount + model swap).
   */
  private envRT?: THREE.WebGLRenderTarget;
  private grid?: THREE.GridHelper;

  private meshes: MeshState[] = [];
  private hotspots: HotspotState[] = [];

  private raf = 0;
  private running = false;
  private loaded = false;

  private explodeCur = 0;
  private explodeTarget = 0;

  /** Currently focused hotspot (datacenter click-to-focus), or null. */
  private focusKey: CompKey | null = null;
  /**
   * How the OTHER meshes behave while one component is focused. false (default)
   * = hidden entirely (only the focused component shows). true = kept visible
   * but faded translucent (the old ghost view). Toggled from the toolbar.
   */
  private fadeOthers = false;

  /** The main rack group and (datacenter only) its side-by-side twin group. */
  private rootGroup: THREE.Object3D | null = null;
  private twinGroup: THREE.Object3D | null = null;
  /** X offset of each rack in the two-rack stage; 0 when collapsed to one. */
  private mainOffsetX = 0;
  private twinOffsetX = 0;
  /** datacenter two-stage: false = both racks shown, true = single main rack. */
  private collapsed = false;

  /** Raycasting for rack clicks (datacenter two-rack stage). */
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  /** pointerdown position + button, to tell a click apart from an orbit-drag. */
  private downX = 0;
  private downY = 0;
  private downButton = -1;
  private onPointerDown?: (e: PointerEvent) => void;
  private onPointerUp?: (e: PointerEvent) => void;

  /** Camera "zoom-in" transition when collapsing to the single rack. */
  private camAnimActive = false;
  private camAnimT = 0;
  private camFrom = new THREE.Vector3();
  private camTo = new THREE.Vector3();
  private targetFrom = new THREE.Vector3();
  private targetTo = new THREE.Vector3();

  /**
   * Rack-collapse slide (Stage 1 → Stage 2). Runs alongside the camera tween:
   * the main rack slides from its side offset to center (x: mainOffsetX → 0) and
   * the twin fades out, instead of snapping. Progress 0→1 shared with the camera
   * tween so the whole motion reads as one continuous move. `collapseActive`
   * gates it; when it finishes the twin is hidden outright.
   */
  private collapseActive = false;
  private collapseFromX = 0;
  /**
   * Hotspots begin fading in once the collapse tween crosses this fraction, so
   * they appear WHILE the camera is still moving in (not popped after it lands).
   */
  private static readonly HOTSPOT_REVEAL_AT = 0.45;

  private autoRotate: boolean;

  /**
   * Widen the vertical FOV on narrow (portrait) viewports so the horizontal
   * extent stays roughly constant. Mobile only; `false` on desktop, where
   * `fovFor()` always returns the authored `SCENE.camera.fov` unchanged.
   */
  private fitWidth: boolean;

  constructor(
    host: HTMLElement,
    autoRotate: boolean,
    model: ModelConfig,
    cb: SceneCallbacks,
    fitWidth = false,
  ) {
    this.host = host;
    this.autoRotate = autoRotate;
    this.model = model;
    this.cb = cb;
    this.fitWidth = fitWidth;
    this.init();
  }

  /**
   * Vertical FOV for a given aspect. Solves `tan(v/2) * aspect = const` so the
   * horizontal half-angle matches what `refAspect` would have shown, then clamps
   * to `maxFov` to bound perspective distortion.
   *
   * Only the TWO-RACK stage needs the extra horizontal room — two racks side by
   * side on ±x are what portrait slices off. Once collapsed to the single centred
   * rack (and for the head-on component focus that follows), the authored 45°
   * already frames correctly at phone aspects, and widening would merely shrink
   * the subject. So the collapsed stage keeps desktop's exact framing.
   */
  private fovFor(aspect: number): number {
    const base = SCENE.camera.fov;
    if (!this.fitWidth || this.collapsed || !aspect || aspect >= SCENE.camera.refAspect) return base;
    const halfBase = THREE.MathUtils.degToRad(base) / 2;
    const needed = 2 * Math.atan((Math.tan(halfBase) * SCENE.camera.refAspect) / aspect);
    return Math.min(THREE.MathUtils.radToDeg(needed), SCENE.camera.maxFov);
  }

  /** Toggle portrait fit-width framing (called when the viewport tier changes). */
  setFitWidth(value: boolean): void {
    if (this.fitWidth === value) return;
    this.fitWidth = value;
    this.onResize();
  }

  // ---------- setup ----------
  private init(): void {
    const w = this.host.clientWidth || window.innerWidth;
    const h = this.host.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(SCENE.maxPixelRatio, window.devicePixelRatio || 1));
    renderer.setSize(w, h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = SCENE.toneMappingExposure;
    renderer.domElement.style.display = 'block';
    this.host.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(SCENE.fogColor, SCENE.fogNear, SCENE.fogFar);
    this.scene = scene;

    this.pmrem = new THREE.PMREMGenerator(renderer);
    // fromScene() builds a WebGLRenderTarget on the GPU; its .texture becomes the
    // scene environment map. Keep the target so dispose() can free it — pmrem's
    // own dispose() does NOT release this output target.
    this.envRT = this.pmrem.fromScene(new RoomEnvironment(), SCENE.envIntensity);
    scene.environment = this.envRT.texture;

    const camera = new THREE.PerspectiveCamera(this.fovFor(w / h), w / h, SCENE.camera.near, SCENE.camera.far);
    camera.position.set(...SCENE.camera.position);
    this.camera = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = SCENE.controls.dampingFactor;
    controls.target.set(...SCENE.controls.target);
    controls.minDistance = SCENE.controls.minDistance;
    controls.maxDistance = SCENE.controls.maxDistance;
    controls.maxPolarAngle = SCENE.controls.maxPolarAngle;
    controls.autoRotate = this.autoRotate;
    controls.autoRotateSpeed = SCENE.controls.autoRotateSpeed;
    controls.update();
    this.controls = controls;

    // lights
    scene.add(
      new THREE.HemisphereLight(LIGHTS.hemisphere.sky, LIGHTS.hemisphere.ground, LIGHTS.hemisphere.intensity),
    );
    const key = new THREE.DirectionalLight(LIGHTS.key.color, LIGHTS.key.intensity);
    key.position.set(...LIGHTS.key.position);
    scene.add(key);
    const fill = new THREE.DirectionalLight(LIGHTS.fill.color, LIGHTS.fill.intensity);
    fill.position.set(...LIGHTS.fill.position);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(LIGHTS.rim.color, LIGHTS.rim.intensity);
    rim.position.set(...LIGHTS.rim.position);
    scene.add(rim);

    // grid
    const grid = new THREE.GridHelper(
      SCENE.grid.size,
      SCENE.grid.divisions,
      SCENE.grid.colorCenter,
      SCENE.grid.colorGrid,
    );
    const gridMat = grid.material as THREE.Material;
    gridMat.transparent = true;
    gridMat.opacity = SCENE.grid.opacity;
    grid.position.y = 0;
    scene.add(grid);
    this.grid = grid;  // held so dispose() frees its geometry + material

    // hotspot world positions
    this.hotspots = COMPS.map((c) => ({ key: c.key, v: new THREE.Vector3(c.pos[0], c.pos[1], c.pos[2]) }));

    this.loadModel();

    // Two-rack stage: a genuine CLICK (not an orbit-drag) on either rack
    // collapses to one. We track pointerdown→pointerup movement so dragging to
    // rotate never counts as a click.
    {
      this.onPointerDown = (e: PointerEvent) => {
        this.downX = e.clientX;
        this.downY = e.clientY;
        this.downButton = e.button;
      };
      this.onPointerUp = (e: PointerEvent) => {
        // Left button only, and only if the pointer barely moved (a click, not a
        // drag). 6px tolerance absorbs tiny hand jitter without swallowing drags.
        const moved = Math.hypot(e.clientX - this.downX, e.clientY - this.downY);
        if (this.downButton === 0 && e.button === 0 && moved < 6) {
          this.handleRackClick(e);
        }
      };
      renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
      renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    }

    this.ro = new ResizeObserver(() => this.onResize());
    this.ro.observe(this.host);

    this.running = true;
    this.loop();
  }

  /**
   * Recenter + uniformly scale a freshly-loaded model into the scene's canonical
   * footprint, so a model authored at a wildly different scale/pivot (the
   * data-center rack: ~250 units deep, off-origin) lands where the default rack
   * sits and the hand-tuned COMPS hotspots still line up. Target: TARGET_HEIGHT
   * tall, base on the grid (y=0), centered on the orbit target in x/z. Applied
   * once, before any mesh/twin bookkeeping, so explode + hotspots see final
   * world positions. No-op for the default rack (normalize=false).
   */
  private normalizeModel(root: THREE.Object3D): void {
    const TARGET_HEIGHT = 4.9; // matches the default rack's rendered height
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = TARGET_HEIGHT / maxDim;
    root.scale.setScalar(scale);
    // After scaling, recenter: base to y=0, and x/z onto the orbit target so the
    // rack frames the same way the default one does.
    const [tx, , tz] = SCENE.controls.target;
    root.position.set(
      tx - center.x * scale,
      -box.min.y * scale,
      tz - center.z * scale,
    );
    root.updateMatrixWorld(true);
  }

  /**
   * Per-mesh explode direction. Fans meshes out RADIALLY from the rack's world
   * center: structural parts move outward along their own offset; the ~12 blades
   * that share one center get an index-based fan along depth so they separate
   * instead of staying stacked inside each other.
   */
  private explodeDir(mesh: THREE.Object3D, index: number, center: THREE.Vector3): THREE.Vector3 {
    const worldPos = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);
    const radial = worldPos.clone().sub(center);
    // Structural parts (case, door, glass, back) have a distinct offset from the
    // center → push them outward along it so they slide clear and reveal the
    // blades. The ~12 blades all share one center (≈zero radial), so instead
    // fan THEM out along depth (z), spaced by index, so they no longer overlap.
    if (radial.lengthSq() < 1e-3) {
      // Blade: spread front-to-back across the rack depth by index, plus a
      // lateral offset so adjacent blades don't align. Wide spacing so the
      // exploded view pulls the ~12 blades far apart (localhost-2 demo).
      const slot = (index % 12) - 5.5; // centered range ≈ [-5.5, +5.5]
      return new THREE.Vector3(((index % 2) - 0.5) * 2.6, 0, slot * 2.1);
    }
    // Structural part: move outward along its own radial direction — pushed far
    // so the case/door/back panel clear well away from the blades.
    return radial.normalize().multiplyScalar(SCENE.explodeStep * 2.8);
  }

  private loadModel(): void {
    const loader = new GLTFLoader();
    loader.load(
      this.model.url,
      (gltf) => {
        const root = gltf.scene;
        if (this.model.normalize) this.normalizeModel(root);
        this.scene.add(root);
        root.updateMatrixWorld(true);
        this.rootGroup = root;

        // Rack world center — the origin the data-center fan-out pushes away from.
        const box = new THREE.Box3().setFromObject(root);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = new THREE.Vector3();
        box.getSize(size);
        // Half the rack width plus a gap → side-by-side spacing for the two-rack
        // stage. The main rack shifts to −x, the twin to +x, so both are fully
        // visible and clickable from the camera's 3/4 angle.
        const halfSpan = size.x * 0.62 + 0.4;

        let i = 0;
        root.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh) {
            const orig = mesh.position.clone();
            const dir = this.explodeDir(mesh, i, center);
            // Clone the material so opacity/emissive edits for focus are safe to
            // mutate and restore without affecting other meshes sharing it.
            if (mesh.material) {
              const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
              mat.envMapIntensity = 0.9;
              mesh.material = mat;
            }
            const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
            this.meshes.push({
              mesh,
              orig,
              dir,
              name: mesh.name || o.name || '',
              baseOpacity: mat?.opacity ?? 1,
              baseTransparent: mat?.transparent ?? false,
            });
            i++;
          }
        });

        // Two identical racks SIDE BY SIDE (Stage 1). Clicking either collapses
        // to the single centered main rack (Stage 2). The twin SHARES the main
        // rack's geometries AND materials — clone(true) already shares geometry,
        // and the twin deliberately reuses materials too: focus dimming only runs
        // AFTER the view has collapsed and the twin is hidden, so there's nothing
        // to bleed into. Sharing halves the material GPU footprint and keeps
        // teardown simple (each unique resource is disposed exactly once).
        const twin = root.clone(true);
        this.twinGroup = twin;
        this.scene.add(twin);
        // Position both racks side by side; collapse handling recenters later.
        this.mainOffsetX = -halfSpan;
        this.twinOffsetX = halfSpan;
        this.applyRackLayout();

        this.loaded = true;
        this.explodeCur = 0;
        // Apply any focus / zoom requested before the model finished loading.
        if (this.focusKey) this.applyFocus();
        if (this.zoomKey) this.focusZoom(this.zoomKey);
        this.cb.onLoaded();
      },
      (p) => {
        if (p.total) this.cb.onLoadProgress(Math.round((p.loaded / p.total) * 100));
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error(err);
        this.cb.onError('Failed to load model');
      },
    );
  }

  private onResize(): void {
    if (!this.renderer || !this.camera) return;
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    // No-op on desktop (fitWidth=false ⇒ always SCENE.camera.fov).
    this.camera.fov = this.fovFor(w / h);
    this.camera.updateProjectionMatrix();
  }

  // ---------- render loop ----------
  private loop = (): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);

    // Camera zoom-in tween (datacenter collapse). Runs with OrbitControls paused;
    // on completion, hand control back so the user can orbit the single rack.
    // The rack-collapse slide (main rack → center, twin fade) rides the SAME
    // progress `e`, so camera fly-in and rack slide are one coordinated motion.
    if (this.camAnimActive) {
      this.camAnimT = Math.min(1, this.camAnimT + 0.045);
      const e = this.easeInOut(this.camAnimT);
      this.camera.position.lerpVectors(this.camFrom, this.camTo, e);
      this.controls.target.lerpVectors(this.targetFrom, this.targetTo, e);
      if (this.collapseActive) this.updateCollapseSlide(e);
      if (this.camAnimT >= 1) {
        this.camAnimActive = false;
        this.controls.enabled = true;
        if (this.collapseActive) this.finishCollapseSlide();
      }
    }
    this.controls.update();

    if (this.meshes.length) {
      this.explodeCur += (this.explodeTarget - this.explodeCur) * SCENE.explodeLerp;
      for (const m of this.meshes) {
        const off = m.dir.clone().multiplyScalar(this.explodeCur);
        m.mesh.position.copy(m.orig).add(off);
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.projectMarkers();
  };

  /** Smoothstep easing for the zoom tween (accelerate then decelerate). */
  private easeInOut(t: number): number {
    return t * t * (3 - 2 * t);
  }

  /**
   * Map collapse-tween progress `t` (0→1) to a hotspot reveal opacity: 0 until
   * HOTSPOT_REVEAL_AT, then smooth 0→1 over the remainder. Lets hotspots fade in
   * during the tail of the fly-in.
   */
  private rampReveal(t: number): number {
    const start = SceneController.HOTSPOT_REVEAL_AT;
    if (t <= start) return 0;
    return this.easeInOut(Math.min(1, (t - start) / (1 - start)));
  }

  private projectMarkers(): void {
    // Stage 1 (two racks, not collapsed): suppress all hotspots so no buttons
    // show until a rack is clicked.
    if (!this.collapsed) {
      this.cb.onMarkers([]);
      return;
    }
    // Reveal ramp: during the collapse fly-in, hotspots fade in from HOTSPOT_
    // REVEAL_AT → 1 of the motion, so they appear WHILE the camera is moving into
    // the clicked rack (not popped after it lands). 1 (fully shown) at rest.
    const reveal = this.collapseActive
      ? this.rampReveal(this.camAnimT)
      : 1;
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    const positions: MarkerPosition[] = this.hotspots.map((m) => {
      const p = m.v.clone().project(this.camera);
      const behind = p.z > 1;
      const x = (p.x * 0.5 + 0.5) * w;
      const y = (-p.y * 0.5 + 0.5) * h;
      return { key: m.key, x, y, visible: !behind, reveal };
    });
    this.cb.onMarkers(positions);
  }

  // ---------- external control ----------
  setAutoRotate(value: boolean): void {
    this.autoRotate = value;
    // While a component is zoomed-in we hold the rack still so it stays centered;
    // remember the user's choice but don't spin until zoom clears.
    if (this.controls) this.controls.autoRotate = this.zoomKey ? false : value;
  }

  setExploded(value: boolean): void {
    this.explodeTarget = value ? 1 : 0;
    // Hide the structural shell (case/door/glass/back) while exploded so they
    // don't obscure the fanned-out blades; restore them when collapsed back.
    for (const m of this.meshes) {
      if (DATACENTER_HIDE_ON_EXPLODE.includes(m.name)) m.mesh.visible = !value;
    }
    // Focus visibility is authoritative: if a component is focused, re-apply it
    // so toggling explode doesn't un-hide meshes the focus meant to hide.
    if (this.loaded && this.focusKey) this.applyFocus();
  }

  /**
   * Click-to-focus. When `key` is a hotspot whose mapped mesh exists, that mesh
   * stays full-bright and every OTHER mesh is HIDDEN (or, when fadeOthers is on,
   * dropped to a translucent 0.15 ghost). `null` restores every mesh to its
   * baseline (visible + baseline opacity).
   */
  setFocus(key: CompKey | null): void {
    this.focusKey = key;
    if (!this.loaded) return;
    this.applyFocus();
  }

  /**
   * Toggle how the non-focused meshes behave while one component is focused:
   * false = hidden (only the focused component shows), true = faded ghost. Re-
   * applies the current focus so the change is immediate.
   */
  setFadeOthers(value: boolean): void {
    this.fadeOthers = value;
    if (!this.loaded) return;
    this.applyFocus();
  }

  /**
   * Click-to-zoom. Tweens the camera to frame one component (`key`) head-on —
   * approaching from the DIRECTION THE COMPONENT FACES (outward from the rack
   * toward that component's front face), NOT from the current orbit angle. So
   * clicking a component always flies the camera to look at it straight on.
   * `null` returns to the default resting framing.
   *
   * Reuses the camera-tween machinery (camFrom→camTo / targetFrom→targetTo,
   * driven in loop()). Auto-rotate is paused while zoomed so the component stays
   * centered; the pause is lifted when zoom clears (unless a real setAutoRotate
   * call turned it on again meanwhile — see setAutoRotate).
   */
  private zoomKey: CompKey | null = null;
  /** Distance from the component when zoomed in (world units). */
  private static readonly ZOOM_DISTANCE = 3.6;

  focusZoom(key: CompKey | null): void {
    this.zoomKey = key;
    if (!this.loaded) return;

    const endTarget = new THREE.Vector3();
    const endPos = new THREE.Vector3();

    if (key) {
      // Target the ACTUAL highlighted mesh (the one applyFocus brightens), NOT
      // the hotspot label anchor — the two live at different spots on the model,
      // so zooming to the hotspot would frame empty rack while a blade elsewhere
      // lit up. Fall back to the hotspot position only when there's no mapped
      // mesh (e.g. the default rack, which has no DATACENTER_PART_BY_COMP entry).
      const focusPoint = this.componentWorldCenter(key);
      // Approach the component HEAD-ON from the front. The rack front faces +z,
      // so the camera sits straight in front of the focused mesh (same x/y as the
      // mesh center, pushed out along +z) and looks directly at it — not from the
      // component's side. This keeps every focused component framed dead-center,
      // face-on, regardless of how far left/right its blade sits on the rack. A
      // small +y keeps the natural slight downward tilt of the default framing.
      const dir = new THREE.Vector3(0, 0.32, 1).normalize();
      endTarget.copy(focusPoint);
      endPos.copy(focusPoint).add(dir.multiplyScalar(SceneController.ZOOM_DISTANCE));
      // Hold still while framed so the component stays centered.
      this.controls.autoRotate = false;
    } else {
      // Return to the default resting pose.
      endTarget.set(...SCENE.controls.target);
      endPos.set(...SCENE.camera.position);
      // Restore auto-rotate to the user's setting.
      this.controls.autoRotate = this.autoRotate;
    }

    this.camFrom.copy(this.camera.position);
    this.camTo.copy(endPos);
    this.targetFrom.copy(this.controls.target);
    this.targetTo.copy(endTarget);
    this.camAnimT = 0;
    this.camAnimActive = true;
    this.controls.enabled = false;
  }

  /**
   * World-space center of the component the given hotspot maps to — the SAME
   * mesh applyFocus() brightens (DATACENTER_PART_BY_COMP[key]). Uses the mesh's
   * current world bounding box, so it tracks the explode offset too. Falls back
   * to the authored hotspot position when no mesh is mapped/found (default rack).
   */
  private componentWorldCenter(key: CompKey): THREE.Vector3 {
    const targetName = DATACENTER_PART_BY_COMP[key];
    if (targetName) {
      const state = this.meshes.find((m) => m.name === targetName);
      if (state) {
        const center = new THREE.Vector3();
        new THREE.Box3().setFromObject(state.mesh).getCenter(center);
        return center;
      }
    }
    const hot = this.hotspots.find((h) => h.key === key);
    return hot ? hot.v.clone() : new THREE.Vector3(...SCENE.controls.target);
  }

  private applyFocus(): void {
    const DIM = 0.15;
    const targetName = this.focusKey ? DATACENTER_PART_BY_COMP[this.focusKey] : undefined;
    // While exploded, the structural shell meshes stay hidden regardless of
    // focus — restoring baseline visibility must respect that, not un-hide them.
    const exploded = this.explodeTarget > 0;
    for (const m of this.meshes) {
      const mat = m.mesh as unknown as { material?: THREE.MeshStandardMaterial };
      const material = mat.material;
      if (!material) continue;
      if (!targetName) {
        // No focus: restore baseline opacity + visibility. The only meshes that
        // stay hidden here are the shell meshes while the view is exploded.
        material.transparent = m.baseTransparent;
        material.opacity = m.baseOpacity;
        m.mesh.visible = exploded ? !DATACENTER_HIDE_ON_EXPLODE.includes(m.name) : true;
      } else if (m.name === targetName) {
        // Focused mesh: full bright and always visible.
        material.transparent = m.baseTransparent;
        material.opacity = m.baseOpacity;
        m.mesh.visible = true;
      } else if (this.fadeOthers) {
        // Ghost view: keep visible but translucent (unless hidden by explode).
        material.transparent = true;
        material.opacity = DIM;
        m.mesh.visible = exploded ? !DATACENTER_HIDE_ON_EXPLODE.includes(m.name) : true;
      } else {
        // Default: hide every non-focused mesh so only the focused one shows.
        m.mesh.visible = false;
      }
      material.needsUpdate = true;
    }
  }

  /**
   * Position the two racks. Stage 1 (not collapsed): main rack to −x, twin to
   * +x, both visible. Stage 2 (collapsed): main rack centered at x=0 (so
   * hotspots, which use fixed world positions, line up) and the twin hidden.
   */
  private applyRackLayout(): void {
    if (!this.rootGroup) return;
    if (this.collapsed) {
      this.rootGroup.position.x = 0;
      if (this.twinGroup) this.twinGroup.visible = false;
    } else {
      this.rootGroup.position.x = this.mainOffsetX;
      if (this.twinGroup) {
        this.twinGroup.visible = true;
        this.twinGroup.position.x = this.twinOffsetX;
      }
    }
    this.rootGroup.updateMatrixWorld(true);
  }

  /**
   * Per-frame collapse slide, driven by the eased camera-tween progress `e`
   * (0→1). Slides the main rack from its side offset to center and fades the twin
   * from opaque to transparent, so the two racks resolve into one WITHOUT a snap.
   */
  private updateCollapseSlide(e: number): void {
    if (this.rootGroup) {
      this.rootGroup.position.x = this.collapseFromX * (1 - e);
      this.rootGroup.updateMatrixWorld(true);
    }
    // Twin fades out over the first ~70% of the motion, then is hidden outright in
    // finishCollapseSlide. Fading (not an instant hide) removes the second "cut".
    if (this.twinGroup) {
      const fade = Math.max(0, 1 - e / 0.7);
      this.setTwinOpacity(fade);
    }
  }

  /** Land the collapse: rack exactly centered, twin hidden, layout authoritative. */
  private finishCollapseSlide(): void {
    this.collapseActive = false;
    this.restoreTwinOpacity();
    this.applyRackLayout();
  }

  /**
   * Set the twin's opacity for the collapse fade. The twin SHARES the main rack's
   * materials (see loadModel), so we must not lower opacity on those directly —
   * it would fade the main rack too. Instead, the first fade frame swaps each twin
   * mesh onto its OWN transparent material clone, remembering the shared original
   * so restoreTwinOpacity can put it back. Lazy, so the shared materials stay
   * shared for the whole two-rack stage (halved GPU footprint) until a fade runs.
   */
  private twinFadeEntries: { mesh: THREE.Mesh; original: THREE.Material | THREE.Material[]; clones: THREE.Material[] }[] | null = null;
  private setTwinOpacity(opacity: number): void {
    if (!this.twinGroup) return;
    if (!this.twinFadeEntries) {
      const entries: { mesh: THREE.Mesh; original: THREE.Material | THREE.Material[]; clones: THREE.Material[] }[] = [];
      this.twinGroup.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh || !mesh.material) return;
        const isArr = Array.isArray(mesh.material);
        const mats = (isArr ? mesh.material : [mesh.material]) as THREE.Material[];
        const clones = mats.map((m) => {
          const c = m.clone();
          c.transparent = true;
          return c;
        });
        entries.push({ mesh, original: mesh.material, clones });
        mesh.material = isArr ? clones : clones[0];
      });
      this.twinFadeEntries = entries;
    }
    for (const e of this.twinFadeEntries) for (const c of e.clones) c.opacity = opacity;
  }

  /**
   * Undo the fade: restore each twin mesh's shared original material and dispose
   * the temporary clones so they don't leak. Safe to call when no fade is active.
   * The twin returns to sharing the main rack's materials for any later re-fade.
   */
  private restoreTwinOpacity(): void {
    if (!this.twinFadeEntries) return;
    for (const e of this.twinFadeEntries) {
      e.mesh.material = e.original;
      for (const c of e.clones) c.dispose();
    }
    this.twinFadeEntries = null;
  }

  /**
   * Two-stage view control. `true` collapses to the single centered main rack
   * (+ hotspots); `false` shows both racks side by side (no hotspots).
   */
  setCollapsed(value: boolean): void {
    this.collapsed = value;
    // Mobile only: the stage decides the FOV (see fovFor) — the two-rack stage
    // widens to fit both racks, the single-rack stage keeps the authored 45°.
    // Re-apply before the early-return below so the narrowing rides the collapse
    // fly-in. Guarded so desktop never pays a redundant resize/reproject here.
    if (this.fitWidth) this.onResize();
    // Collapsing WITH an armed slide (a rack was clicked): don't snap the layout —
    // the loop drives the main rack from its offset to center and fades the twin
    // out over the same clock as the camera fly-in. applyRackLayout would jump the
    // rack to x=0 instantly (the "cut"), so skip it and let the tween land it.
    if (value && this.collapseActive) return;
    this.applyRackLayout();
    // Expanding back to two racks: cancel any in-flight zoom/slide tween, restore
    // orbit control, twin opacity, and clear focus dimming.
    if (!value) {
      this.camAnimActive = false;
      this.collapseActive = false;
      this.restoreTwinOpacity();
      if (this.controls) this.controls.enabled = true;
      this.focusKey = null;
      if (this.loaded) this.applyFocus();
    }
  }

  /**
   * Raycast the click against both racks; if it hits either, kick off the
   * zoom-in transition and notify React to collapse. Only active in Stage 1
   * (two racks). Ignored once collapsed so clicks in Stage 2 fall through to the
   * hotspot buttons / orbit controls.
   */
  private handleRackClick(e: PointerEvent): void {
    if (this.collapsed || !this.loaded) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    // Raycast each rack separately so we know WHICH one was clicked — the camera
    // then flies toward that rack as it slides to center.
    const rootHit = this.rootGroup
      ? this.raycaster.intersectObject(this.rootGroup, true).length > 0
      : false;
    const twinHit = this.twinGroup
      ? this.raycaster.intersectObject(this.twinGroup, true).length > 0
      : false;
    if (!rootHit && !twinHit) return;
    // The clicked rack's current x offset (main = mainOffsetX, twin = twinOffsetX).
    // rootGroup's own hit wins ties (it's the survivor either way); the offset
    // just decides which slot the surviving rack flies in FROM.
    const clickedOffsetX = rootHit ? this.mainOffsetX : this.twinOffsetX;
    this.startZoomIn(clickedOffsetX);
    this.cb.onRackClick?.();
  }

  /**
   * Begin the fly-in for the single-rack view, heading TOWARD the clicked rack.
   *
   * The animation ENDS at the exact default resting pose (SCENE.camera.position
   * looking at SCENE.controls.target) — the camera angle/framing the single rack
   * always had is kept unchanged, per the requested behaviour. What differs is
   * where the motion STARTS: pulled back AND shifted toward the clicked rack
   * (its x offset), so the camera visibly moves/zooms into the server that was
   * clicked before settling into the standard centered framing.
   *
   * Runs in lockstep with the rack-collapse slide (armed here): as the camera
   * flies in, the main rack slides from its side offset to center and the twin
   * fades out, and hotspots begin fading in partway through — one continuous
   * move with no snap/cut. Driven per-frame in loop(); OrbitControls is paused
   * while it runs.
   */
  private startZoomIn(clickedOffsetX = 0): void {
    const endTarget = new THREE.Vector3(...SCENE.controls.target);
    const endPos = new THREE.Vector3(...SCENE.camera.position);
    // Start EXACTLY from the camera's live pose at click time — no synthetic
    // pulled-back start. Jumping to a computed start pose on frame 1 is what read
    // as a cut; capturing the current position/target makes the tween glide
    // continuously from where the user was to the resting single-rack framing.
    this.camFrom.copy(this.camera.position);
    this.camTo.copy(endPos);
    this.targetFrom.copy(this.controls.target);
    this.targetTo.copy(endTarget);
    this.camAnimT = 0;
    this.camAnimActive = true;
    this.controls.enabled = false;

    // Arm the rack-collapse slide. The SURVIVING rack (rootGroup — it carries the
    // hotspots/focus/orbit) is snapped to the CLICKED rack's slot, then slides
    // from there to center; the other rack fades out. Because both racks are
    // pixel-identical and the one being faded is still fully opaque at this
    // instant, snapping rootGroup behind it is invisible — so it reads as "the
    // rack you clicked stayed and moved to center; the other disappeared".
    this.collapseActive = true;
    this.collapseFromX = clickedOffsetX;
    if (this.rootGroup) {
      this.rootGroup.position.x = clickedOffsetX;
      this.rootGroup.updateMatrixWorld(true);
    }
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  dispose(): void {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.ro) this.ro.disconnect();
    if (this.renderer?.domElement) {
      if (this.onPointerDown) {
        this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
      }
      if (this.onPointerUp) {
        this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
      }
    }

    // Release GPU memory. Geometries, materials, and their textures live in VRAM
    // and are NOT freed by JS garbage collection — three.js requires an explicit
    // dispose() on each. Walk both racks (the twin shares the main rack's
    // geometry + materials) and dispose each UNIQUE resource exactly once; the
    // Sets guard against double-disposing a shared geometry/material.
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    for (const group of [this.rootGroup, this.twinGroup]) {
      group?.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        if (mesh.geometry) geometries.add(mesh.geometry);
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) if (m) materials.add(m);
      });
    }
    for (const g of geometries) g.dispose();
    for (const m of materials) {
      // Free any textures the material references, then the material itself.
      for (const value of Object.values(m)) {
        if (value && (value as THREE.Texture).isTexture) (value as THREE.Texture).dispose();
      }
      m.dispose();
    }
    this.rootGroup = null;
    this.twinGroup = null;

    // Free the GPU resources created outside the model groups (see fields). The
    // group walk above never reaches these, so they must be disposed by hand.
    if (this.grid) {
      this.grid.geometry.dispose();
      const gm = this.grid.material;
      (Array.isArray(gm) ? gm : [gm]).forEach((m) => m.dispose());
      this.grid = undefined;
    }
    this.envRT?.dispose();  // the environment-map render target (from PMREM)
    this.envRT = undefined;

    this.controls?.dispose();
    this.pmrem?.dispose();
    this.renderer?.dispose();
    if (this.renderer?.domElement?.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
