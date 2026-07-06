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

  private meshes: MeshState[] = [];
  private hotspots: HotspotState[] = [];

  private raf = 0;
  private running = false;
  private loaded = false;

  private explodeCur = 0;
  private explodeTarget = 0;

  /** Currently focused hotspot (datacenter click-to-focus), or null. */
  private focusKey: CompKey | null = null;

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

  private autoRotate: boolean;

  constructor(host: HTMLElement, autoRotate: boolean, model: ModelConfig, cb: SceneCallbacks) {
    this.host = host;
    this.autoRotate = autoRotate;
    this.model = model;
    this.cb = cb;
    this.init();
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
    scene.environment = this.pmrem.fromScene(new RoomEnvironment(), SCENE.envIntensity).texture;

    const camera = new THREE.PerspectiveCamera(SCENE.camera.fov, w / h, SCENE.camera.near, SCENE.camera.far);
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
        // Apply any focus that was requested before the model finished loading.
        if (this.focusKey) this.applyFocus();
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
    this.camera.updateProjectionMatrix();
  }

  // ---------- render loop ----------
  private loop = (): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);

    // Camera zoom-in tween (datacenter collapse). Runs with OrbitControls paused;
    // on completion, hand control back so the user can orbit the single rack.
    if (this.camAnimActive) {
      this.camAnimT = Math.min(1, this.camAnimT + 0.045);
      const e = this.easeInOut(this.camAnimT);
      this.camera.position.lerpVectors(this.camFrom, this.camTo, e);
      this.controls.target.lerpVectors(this.targetFrom, this.targetTo, e);
      if (this.camAnimT >= 1) {
        this.camAnimActive = false;
        this.controls.enabled = true;
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

  private projectMarkers(): void {
    // Stage 1 (two racks, not collapsed): suppress all hotspots so no buttons
    // show until a rack is clicked.
    if (!this.collapsed) {
      this.cb.onMarkers([]);
      return;
    }
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    const positions: MarkerPosition[] = this.hotspots.map((m) => {
      const p = m.v.clone().project(this.camera);
      const behind = p.z > 1;
      const x = (p.x * 0.5 + 0.5) * w;
      const y = (-p.y * 0.5 + 0.5) * h;
      return { key: m.key, x, y, visible: !behind };
    });
    this.cb.onMarkers(positions);
  }

  // ---------- external control ----------
  setAutoRotate(value: boolean): void {
    this.autoRotate = value;
    if (this.controls) this.controls.autoRotate = value;
  }

  setExploded(value: boolean): void {
    this.explodeTarget = value ? 1 : 0;
    // Hide the structural shell (case/door/glass/back) while exploded so they
    // don't obscure the fanned-out blades; restore them when collapsed back.
    for (const m of this.meshes) {
      if (DATACENTER_HIDE_ON_EXPLODE.includes(m.name)) m.mesh.visible = !value;
    }
  }

  /**
   * Click-to-focus. When `key` is a hotspot whose mapped mesh exists, that mesh
   * stays full-bright and every OTHER mesh drops to a translucent 0.15 opacity so
   * the focused part reads clearly. `null` restores every mesh to its baseline.
   */
  setFocus(key: CompKey | null): void {
    this.focusKey = key;
    if (!this.loaded) return;
    this.applyFocus();
  }

  private applyFocus(): void {
    const DIM = 0.15;
    const targetName = this.focusKey ? DATACENTER_PART_BY_COMP[this.focusKey] : undefined;
    for (const m of this.meshes) {
      const mat = m.mesh as unknown as { material?: THREE.MeshStandardMaterial };
      const material = mat.material;
      if (!material) continue;
      if (!targetName) {
        // Restore baseline.
        material.transparent = m.baseTransparent;
        material.opacity = m.baseOpacity;
      } else if (m.name === targetName) {
        // Focused mesh: full bright.
        material.transparent = m.baseTransparent;
        material.opacity = m.baseOpacity;
      } else {
        // Everything else: translucent.
        material.transparent = true;
        material.opacity = DIM;
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
   * Two-stage view control. `true` collapses to the single centered main rack
   * (+ hotspots); `false` shows both racks side by side (no hotspots).
   */
  setCollapsed(value: boolean): void {
    this.collapsed = value;
    this.applyRackLayout();
    // Expanding back to two racks: cancel any in-flight zoom tween, restore
    // orbit control, and clear focus dimming.
    if (!value) {
      this.camAnimActive = false;
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
    const targets: THREE.Object3D[] = [];
    if (this.rootGroup) targets.push(this.rootGroup);
    if (this.twinGroup) targets.push(this.twinGroup);
    const hits = this.raycaster.intersectObjects(targets, true);
    if (hits.length === 0) return;
    this.startZoomIn();
    this.cb.onRackClick?.();
  }

  /**
   * Begin the PURELY-VISUAL fly-in for the single-rack view. The animation ENDS
   * at the exact default resting pose (SCENE.camera.position looking at
   * SCENE.controls.target) — i.e. the same framing the single rack always had,
   * so there is NO net zoom / no lasting effect on the view. It merely STARTS a
   * bit pulled back and glides forward, as a transition flourish. Driven
   * per-frame in loop(); OrbitControls is paused while it runs.
   */
  private startZoomIn(): void {
    const endTarget = new THREE.Vector3(...SCENE.controls.target);
    const endPos = new THREE.Vector3(...SCENE.camera.position);
    // Start pulled ~35% further out along the same view direction; settle to the
    // canonical resting pose so the end state matches the pre-transition view.
    const back = endPos.clone().sub(endTarget).multiplyScalar(1.35).add(endTarget);
    this.camFrom.copy(back);
    this.camTo.copy(endPos);
    this.targetFrom.copy(endTarget);
    this.targetTo.copy(endTarget);
    this.camAnimT = 0;
    this.camAnimActive = true;
    this.controls.enabled = false;
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

    this.controls?.dispose();
    this.pmrem?.dispose();
    this.renderer?.dispose();
    if (this.renderer?.domElement?.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
