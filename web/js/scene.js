// The 3D layer: camera that follows the mouse, objects you can spin and grab, particles and a floor grid.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/addons/GLTFLoader.js';
import { RGBELoader } from '../vendor/addons/RGBELoader.js';
import { mergeGeometries } from '../vendor/addons/BufferGeometryUtils.js';

const tmpV = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export class SceneView {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.cb = callbacks; // onSelect(id), onObjectMoved(id, patch), onAction(click)
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.loader = new GLTFLoader();
    this.modelCache = new Map();

    this.pointer = new THREE.Vector2(0, 0);        // raw, -1..1
    this.pointerSmooth = new THREE.Vector2(0, 0);  // eased, used by camera and widgets
    this.objects = new Map();                      // id -> { cfg, outer, inner, mesh, state }
    this.editMode = false;
    this.selectedId = null;
    this.reducedMotion = false;
    this.lastFrame = 0;
    this.holoMaterials = HOLO_MATERIALS;

    this.ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.key = new THREE.DirectionalLight(0xffffff, 2);
    this.key.position.set(4, 6, 8);
    this.rim = new THREE.PointLight(0x7f5cff, 30, 40);
    this.rim.position.set(-6, 3, -4);
    this.scene.add(this.ambient, this.key, this.rim);
    this.objectRoot = new THREE.Group();
    this.scene.add(this.objectRoot);

    this.selectionBox = new THREE.BoxHelper(undefined, 0xffffff);
    this.selectionBox.visible = false;
    this.scene.add(this.selectionBox);

    this.roomEnvironment = buildEnvironment(this.renderer);
    this.scene.environment = this.roomEnvironment;
    this.panoramas = new Map();   // url -> Promise<texture>
    this.paused = false;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindPointer();
    this.renderer.setAnimationLoop(t => this.frame(t));
  }

  // ---- config ---------------------------------------------------------
  apply(cfg) {
    this.cfg = cfg;
    const s = cfg.scene;
    const motionPref = cfg.general?.reducedMotion || 'system';
    this.reducedMotion = motionPref === 'on' || (motionPref === 'system' && matchMedia('(prefers-reduced-motion: reduce)').matches);

    this.scene.fog = s.fog.enabled ? new THREE.FogExp2(s.fog.color, s.fog.density) : null;
    this.applyPanorama(s.background);
    this.ambient.intensity = s.light.ambient;
    this.key.color.set(s.light.color);
    this.key.intensity = s.light.intensity;
    this.rim.color.set(s.light.rim);

    this.camera.fov = cfg.camera.fov;
    this.camera.updateProjectionMatrix();

    const pKey = JSON.stringify(s.particles), fKey = JSON.stringify(s.floor);
    if (pKey !== this.pKey) { this.pKey = pKey; this.buildParticles(s.particles); }
    if (fKey !== this.fKey) { this.fKey = fKey; this.buildFloor(s.floor); }
    const fieldShape = JSON.stringify({ type: s.field?.type, count: s.field?.count });
    if (fieldShape !== this.fieldKey) { this.fieldKey = fieldShape; this.buildField(s.field || {}); }
    if (this.field) {
      this.field.userData.ground.material.color.set(s.field.ground || '#3d5a1e');
      this.fieldUniforms.uWind.value = s.field.wind ?? 1;
    }
    this.syncObjects(cfg.objects);
  }

  /** A 360° picture (equirectangular .jpg/.png/.webp or .hdr) all around the scene; it also lights the objects. */
  applyPanorama(bg) {
    const url = bg.type === 'panorama' ? bg.panorama : '';
    this.scene.backgroundBlurriness = bg.blur ?? 0;
    this.scene.backgroundIntensity = bg.brightness ?? 1;
    this.scene.environmentIntensity = url ? (bg.lighting ?? 1) : 1;
    const yaw = THREE.MathUtils.degToRad(bg.rotation || 0);
    this.scene.backgroundRotation.set(0, yaw, 0);
    this.scene.environmentRotation.set(0, yaw, 0);
    if (url === this.panoramaUrl) return;
    this.panoramaUrl = url;
    if (!url) {
      this.scene.background = null;
      this.scene.environment = this.roomEnvironment;
      return;
    }
    if (!this.panoramas.has(url)) {
      const hdr = /\.hdr(\?|$)/i.test(url);
      this.panoramas.set(url, (hdr ? new RGBELoader() : new THREE.TextureLoader()).loadAsync(url).then(tex => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        if (!hdr) tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        return tex;
      }));
    }
    this.panoramas.get(url).then(tex => {
      if (this.panoramaUrl !== url) return;
      this.scene.background = tex;
      this.scene.environment = tex;
    }).catch(() => {
      this.panoramas.delete(url);
      this.cb.onPanoramaError?.(url);
    });
  }

  /** Stops drawing while a window covers the desktop, like Wallpaper Engine. */
  setPaused(on) {
    this.paused = on;
    if (!on) this.clock.getDelta(); // don't jump ahead by the paused time
  }

  buildParticles(p) {
    if (this.particles) { this.scene.remove(this.particles); this.particles.geometry.dispose(); this.particles.material.dispose(); }
    this.particles = null;
    if (!p.enabled) return;
    const style = PARTICLE_STYLE_IDS[p.style] ?? 0;
    const count = Math.max(0, Math.min(5000, p.count | 0));
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const far = p.style === 'stars';
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * (far ? 60 : 30);
      pos[i * 3 + 1] = (Math.random() - 0.5) * (far ? 36 : 18);
      pos[i * 3 + 2] = far ? -12 - Math.random() * 20 : (Math.random() - 0.5) * 20 - 3;
      seed[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uColor: { value: new THREE.Color(p.color) }, uSize: { value: p.size * 70 },
        uStyle: { value: style }, uPixelRatio: { value: this.renderer.getPixelRatio() },
      },
      vertexShader: PARTICLE_VERTEX, fragmentShader: PARTICLE_FRAGMENT,
      transparent: true, depthWrite: false,
      blending: ['bubbles', 'snow', 'petals'].includes(p.style) ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    this.particles = new THREE.Points(geo, mat);
    this.particles.userData = { speed: p.speed, style: p.style || 'dust', seed };
    this.scene.add(this.particles);
  }

  /** Ground cover made in code: flowers, grass or pines swaying in the wind, or a moving ocean or dunes. */
  buildField(f) {
    if (this.field) {
      this.scene.remove(this.field);
      this.field.traverse(o => { o.geometry?.dispose(); if (o.material && !o.material.userData.shared) o.material.dispose(); });
      this.field = null;
    }
    if (!f.type || f.type === 'none') return;
    this.fieldUniforms ||= { uTime: { value: 0 }, uWind: { value: 1 } };
    const group = new THREE.Group();
    if (SURFACES[f.type]) {
      // a moving surface instead of plants: low-poly ocean waves or slowly shifting sand dunes
      const spec = SURFACES[f.type];
      const geo = new THREE.PlaneGeometry(240, 150, spec.segments[0], spec.segments[1]);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshStandardMaterial({ color: f.ground || spec.color, roughness: spec.roughness, metalness: spec.metalness, flatShading: true });
      mat.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, this.fieldUniforms);
        shader.vertexShader = 'uniform float uTime; uniform float uWind;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          ${spec.wave}`);
      };
      const surface = new THREE.Mesh(geo, mat);
      surface.position.set(0, FIELD_Y + spec.lift, -55);
      group.add(surface);
      group.userData.ground = surface;
      this.field = group;
      this.scene.add(group);
      return;
    }
    const ground = new THREE.Mesh(new THREE.CircleGeometry(90, 48), new THREE.MeshStandardMaterial({ color: f.ground || '#3d5a1e', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = FIELD_Y;
    group.add(ground);
    group.userData.ground = ground;
    const count = Math.max(50, Math.min(6000, f.count | 0));
    const parts = FIELD_PARTS[f.type]();
    const matrices = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      // denser and wider toward the horizon, a clear patch right in front of the camera
      const z = 4 - Math.pow(Math.random(), 0.7) * 60;
      const spread = 9 + (4 - z) * 0.9;
      const x = (Math.random() - 0.5) * 2 * spread;
      if (z > -1 && Math.abs(x) < 3.5) { i--; continue; }
      const size = parts.size * (0.75 + Math.random() * 0.5);
      e.set((Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * parts.turn, (Math.random() - 0.5) * 0.12);
      m.compose(v.set(x, FIELD_Y, z), q.setFromEuler(e), sc.set(size, size * (0.85 + Math.random() * 0.3), size));
      matrices.push(m.clone());
    }
    for (const part of parts.meshes) {
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide });
      mat.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, this.fieldUniforms);
        shader.vertexShader = 'uniform float uTime; uniform float uWind;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          float h = max(position.y, 0.0);
          vec3 base = instanceMatrix[3].xyz;
          float gust = sin(uTime * 0.6 + base.x * 0.05 + base.z * 0.04) * 0.5 + 0.5;
          float sway = sin(uTime * 1.7 + base.x * 0.4 + base.z * 0.3) * (0.03 + 0.05 * gust) * uWind * h * h;
          transformed.x += sway;
          transformed.z += sway * 0.35;`);
      };
      const mesh = new THREE.InstancedMesh(part.geometry, mat, matrices.length);
      matrices.forEach((mx, i) => mesh.setMatrixAt(i, mx));
      if (part.colors) {
        const c = new THREE.Color();
        for (let i = 0; i < matrices.length; i++) mesh.setColorAt(i, c.set(part.colors[Math.floor(Math.random() * part.colors.length)]));
      }
      mesh.frustumCulled = false;
      group.add(mesh);
    }
    this.field = group;
    this.scene.add(group);
  }

  buildFloor(f) {
    if (this.floor) { this.scene.remove(this.floor); this.floor.geometry.dispose(); this.floor.material.dispose(); }
    this.floor = null;
    if (!f.enabled) return;
    this.floor = new THREE.GridHelper(80, 40, f.color, f.color);
    this.floor.material.transparent = true;
    this.floor.material.opacity = 0.55;
    this.floor.position.y = -3.2;
    this.scene.add(this.floor);
  }

  syncObjects(list) {
    const keep = new Set(list.map(o => o.id));
    for (const [id, entry] of this.objects) {
      if (!keep.has(id)) { this.objectRoot.remove(entry.outer); disposeTree(entry.outer); this.objects.delete(id); }
    }
    for (const cfg of list) {
      const entry = this.objects.get(cfg.id);
      const shapeKey = cfg.shape + '|' + cfg.model + '|' + cfg.material + '|' + cfg.color + '|' + cfg.glow;
      if (entry && entry.shapeKey === shapeKey) { entry.cfg = cfg; this.placeObject(entry); continue; }
      if (entry) { this.objectRoot.remove(entry.outer); disposeTree(entry.outer); }
      const outer = new THREE.Group();
      const inner = new THREE.Group();
      outer.add(inner);
      const fresh = {
        cfg, outer, inner, shapeKey,
        state: { hover: 0, spinBoost: 0, dragVel: new THREE.Vector2(), manual: new THREE.Euler() },
      };
      this.buildMesh(fresh);
      this.objects.set(cfg.id, fresh);
      this.objectRoot.add(outer);
      this.placeObject(fresh);
    }
    this.updateSelectionBox();
  }

  buildMesh(entry) {
    const { cfg, inner } = entry;
    inner.clear();
    if (cfg.shape === 'model') {
      if (!cfg.model) { inner.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: cfg.color, wireframe: true }))); return; }
      this.loadModel(cfg.model).then(src => {
        if (this.objects.get(cfg.id) !== entry) return;
        const model = src.clone(true);
        if (cfg.material !== 'original') model.traverse(o => { if (o.isMesh) o.material = makeMaterial(cfg); });
        inner.add(model);
        this.updateSelectionBox();
      }).catch(() => inner.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ff4444', wireframe: true }))));
      return;
    }
    const geometry = makeGeometry(cfg.shape);
    const material = makeMaterial(cfg);
    if (geometry.attributes.color && 'vertexColors' in material && !material.isShaderMaterial) material.vertexColors = true; // trees: brown trunk, tinted leaves
    if (cfg.shape === 'rock' && 'flatShading' in material) material.flatShading = true;
    if (geometry.attributes.aGlow && !material.isShaderMaterial && !material.wireframe) {
      // lit windows glow warm on their own, whatever color the building is
      material.onBeforeCompile = shader => {
        shader.vertexShader = 'attribute float aGlow;\nvarying float vGlow;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vGlow = aGlow;');
        shader.fragmentShader = 'varying float vGlow;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vec3(1.0, 0.55, 0.2) * vGlow * 1.1;');
      };
    }
    const mesh = new THREE.Mesh(geometry, material);
    inner.add(mesh);
    const glow = cfg.material === 'emissive' ? Math.max(0.6, cfg.glow || 0) : cfg.glow || 0;
    if (glow > 0.05 && cfg.material !== 'wireframe') {
      // a soft halo around glowing objects (works over any background, unlike a bloom pass)
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: haloTexture(), color: cfg.color, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: Math.min(0.85, glow * 0.55),
      }));
      halo.scale.setScalar(3.4);
      halo.userData.halo = true;
      halo.raycast = () => {}; // clicks and hover only count on the object itself
      inner.add(halo);
    }
    if (cfg.material === 'glass' || cfg.material === 'wireframe') {
      // a faint edge outline keeps glass and wireframe readable on any background
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 20),
        new THREE.LineBasicMaterial({ color: cfg.color, transparent: true, opacity: cfg.material === 'glass' ? 0.35 : 0.9 }));
      inner.add(edges);
    }
  }

  async loadModel(url) {
    if (!this.modelCache.has(url)) {
      this.modelCache.set(url, this.loader.loadAsync(url).then(gltf => {
        const root = gltf.scene;
        root.traverse(o => { o.userData.shared = true; });
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3()).length() || 1;
        const center = box.getCenter(new THREE.Vector3());
        root.position.sub(center);
        const wrap = new THREE.Group();
        wrap.add(root);
        wrap.scale.setScalar(2.4 / size);
        return wrap;
      }));
    }
    return this.modelCache.get(url);
  }

  placeObject(entry) {
    const { cfg, outer, inner } = entry;
    outer.visible = cfg.visible !== false;
    outer.position.set(cfg.position.x, cfg.position.y, cfg.position.z);
    outer.scale.setScalar(cfg.scale);
    entry.base = new THREE.Euler(
      THREE.MathUtils.degToRad(cfg.rotation.x), THREE.MathUtils.degToRad(cfg.rotation.y), THREE.MathUtils.degToRad(cfg.rotation.z));
    if (!cfg.spin.enabled) inner.rotation.copy(entry.base);
  }

  setEditMode(on) {
    this.editMode = on;
    if (!on) this.select(null);
  }

  select(id) {
    this.selectedId = id;
    this.updateSelectionBox();
  }

  updateSelectionBox() {
    const entry = this.selectedId && this.objects.get(this.selectedId);
    this.selectionBox.visible = !!(entry && this.editMode);
    if (this.selectionBox.visible) this.selectionBox.setFromObject(entry.outer);
  }

  // ---- input ----------------------------------------------------------
  bindPointer() {
    const toNdc = e => new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    window.addEventListener('pointermove', e => {
      const n = toNdc(e);
      this.pointer.copy(n);
      if (this.drag) return this.onDrag(e, n);
      const hit = this.pick(n);
      this.hoverId = hit?.cfg.id || null;
      const interactive = hit && (this.editMode || hit.cfg.interact.dragRotate || hit.cfg.click.type !== 'none');
      this.canvas.style.cursor = interactive ? (this.editMode ? 'move' : hit.cfg.click.type !== 'none' ? 'pointer' : 'grab') : '';
    });
    this.canvas.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const n = toNdc(e);
      const hit = this.pick(n);
      if (!hit) { if (this.editMode) this.cb.onSelect?.(null); return; }
      if (this.editMode) this.cb.onSelect?.(hit.cfg.id);
      if (!this.editMode && !hit.cfg.interact.dragRotate && hit.cfg.click.type === 'none') return;
      this.canvas.setPointerCapture(e.pointerId);
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        this.camera.getWorldDirection(new THREE.Vector3()).negate(), hit.outer.position);
      this.drag = { entry: hit, start: n.clone(), last: { x: e.clientX, y: e.clientY }, moved: 0, plane,
        offset: hit.outer.position.clone().sub(this.planePoint(n, plane) || hit.outer.position) };
      if (!this.editMode) this.canvas.style.cursor = 'grabbing';
    });
    const end = e => {
      if (!this.drag) return;
      const { entry, moved } = this.drag;
      this.drag = null;
      this.canvas.style.cursor = '';
      if (this.editMode) {
        const p = entry.outer.position;
        this.cb.onObjectMoved?.(entry.cfg.id, { position: { x: round(p.x), y: round(p.y), z: round(p.z) } });
      } else if (moved < 6 && entry.cfg.click.type !== 'none') {
        entry.state.spinBoost = 6;
        this.cb.onAction?.(entry.cfg.click);
      }
      try { this.canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
    this.canvas.addEventListener('wheel', e => {
      if (!this.editMode) return;
      const hit = this.objects.get(this.selectedId);
      if (!hit) return;
      e.preventDefault();
      const scale = Math.min(10, Math.max(0.1, hit.cfg.scale * (e.deltaY < 0 ? 1.08 : 1 / 1.08)));
      this.cb.onObjectMoved?.(hit.cfg.id, { scale: round(scale) });
    }, { passive: false });
  }

  onDrag(e, n) {
    const d = this.drag;
    const dx = e.clientX - d.last.x, dy = e.clientY - d.last.y;
    d.last = { x: e.clientX, y: e.clientY };
    d.moved += Math.abs(dx) + Math.abs(dy);
    if (this.editMode) {
      const p = this.planePoint(n, d.plane);
      if (p) d.entry.outer.position.copy(p.add(d.offset));
      this.updateSelectionBox();
    } else if (d.entry.cfg.interact.dragRotate) {
      const st = d.entry.state;
      st.manual.y += dx * 0.01;
      st.manual.x += dy * 0.01;
      st.dragVel.set(dx * 0.01, dy * 0.01);
    }
  }

  planePoint(n, plane) {
    this.raycaster.setFromCamera(n, this.camera);
    return this.raycaster.ray.intersectPlane(plane, new THREE.Vector3());
  }

  pick(n) {
    this.raycaster.setFromCamera(n, this.camera);
    const hits = this.raycaster.intersectObjects([...this.objects.values()].filter(o => o.outer.visible).map(o => o.outer), true);
    for (const h of hits) {
      if (h.object.isLineSegments) continue;
      let node = h.object;
      while (node && node.parent !== this.objectRoot) node = node.parent;
      for (const entry of this.objects.values()) if (entry.outer === node) return entry;
    }
    return null;
  }

  // ---- loop -----------------------------------------------------------
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  frame(ms) {
    if (!this.cfg || document.hidden || this.paused) return;
    const fps = this.cfg.general?.fps || 60;
    if (ms - this.lastFrame < 1000 / fps - 2) return;
    this.lastFrame = ms;
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const t = this.clock.elapsedTime;
    const cam = this.cfg.camera;
    const still = this.reducedMotion;

    // camera follows the mouse
    const k = 1 - Math.pow(1 - THREE.MathUtils.clamp(cam.smoothing, 0.005, 1), dt * 60);
    this.pointerSmooth.lerp(still || cam.mode === 'fixed' ? new THREE.Vector2() : this.pointer, k);
    const px = this.pointerSmooth.x * cam.strength, py = this.pointerSmooth.y * cam.strength;
    const driftX = cam.drift && !still ? Math.sin(t * 0.15) * 0.35 : 0;
    const driftY = cam.drift && !still ? Math.cos(t * 0.11) * 0.2 : 0;
    if (cam.mode === 'orbit') {
      const yaw = px * 0.6 + driftX * 0.2, pitch = py * 0.25 + driftY * 0.1;
      this.camera.position.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(cam.distance);
      this.camera.lookAt(0, 0, 0);
    } else {
      this.camera.position.set(px * 1.6 + driftX, py * 1.0 + driftY, cam.distance);
      this.camera.lookAt(px * 0.4, py * 0.25, 0);
    }

    // objects
    for (const entry of this.objects.values()) {
      const { cfg, inner, outer, state } = entry;
      const dragging = this.drag?.entry === entry;
      if (!(this.editMode && dragging)) {
        const bob = cfg.float.enabled && !still ? Math.sin(t * cfg.float.speed * 2 + hashPhase(cfg.id)) * cfg.float.amount : 0;
        outer.position.set(cfg.position.x, cfg.position.y + bob, cfg.position.z);
      }
      const hovered = this.hoverId === cfg.id && !this.editMode;
      state.hover += ((hovered ? 1 : 0) - state.hover) * Math.min(1, dt * 8);
      const grow = cfg.interact.hover === 'grow' ? 1 + state.hover * 0.12 : 1;
      outer.scale.setScalar(cfg.scale * grow);
      state.spinBoost = Math.max(0, state.spinBoost - dt * 4);
      const boost = 1 + state.spinBoost + (cfg.interact.hover === 'spin' ? state.hover * 4 : 0);

      if (!dragging && !still) {
        state.manual.y += state.dragVel.x; state.manual.x += state.dragVel.y;
        state.dragVel.multiplyScalar(Math.pow(0.04, dt)); // inertia after letting go
      }
      if (cfg.interact.lookAtMouse && !this.editMode) {
        tmpV.set(this.pointerSmooth.x * 8, this.pointerSmooth.y * 5, cam.distance).sub(outer.position);
        const target = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(), tmpV, UP));
        target.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)));
        inner.quaternion.slerp(target, Math.min(1, dt * 4));
      } else {
        if (cfg.spin.enabled && !still) {
          entry.spinAcc = entry.spinAcc || new THREE.Vector3();
          entry.spinAcc.x += cfg.spin.x * dt * boost; entry.spinAcc.y += cfg.spin.y * dt * boost; entry.spinAcc.z += cfg.spin.z * dt * boost;
        }
        const acc = entry.spinAcc || new THREE.Vector3();
        inner.rotation.set(entry.base.x + acc.x + state.manual.x, entry.base.y + acc.y + state.manual.y, entry.base.z + acc.z);
      }
    }

    // particles: each style moves its own way, then wraps around
    if (this.particles) {
      this.particles.material.uniforms.uTime.value = t;
      if (!still) moveParticles(this.particles, dt, t);
    }
    for (const m of this.holoMaterials) m.uniforms.uTime.value = t;
    if (this.floor && !still) this.floor.position.z = (t * 1.2) % 2;
    if (this.field && !still) this.fieldUniforms.uTime.value = t;
    if (this.selectionBox.visible) this.updateSelectionBox();
    this.renderer.render(this.scene, this.camera);
  }
}

// ---- particles --------------------------------------------------------------
const PARTICLE_STYLE_IDS = { dust: 0, stars: 1, fireflies: 2, snow: 3, rain: 4, bubbles: 5, petals: 6 };

const PARTICLE_VERTEX = `
  attribute float aSeed;
  uniform float uTime, uSize, uPixelRatio, uStyle;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float size = uSize * (0.5 + aSeed);
    float a = 0.85;
    if (uStyle == 1.0) { a = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (1.0 + aSeed * 3.0) + aSeed * 40.0)); size *= 0.7; }
    if (uStyle == 2.0) { a = pow(0.5 + 0.5 * sin(uTime * (0.8 + aSeed) + aSeed * 30.0), 3.0); size *= 1.6; }
    if (uStyle == 4.0) { size *= 1.8; a = 0.55; }
    if (uStyle == 5.0) { size *= 1.5; a = 0.7; }
    if (uStyle == 6.0) { size *= 1.7; a = 0.9; }
    vAlpha = a;
    gl_PointSize = size * uPixelRatio * (12.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;

const PARTICLE_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uStyle;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float alpha;
    if (uStyle == 4.0) {            // rain: a thin falling streak
      alpha = (1.0 - smoothstep(0.02, 0.06, abs(c.x))) * (1.0 - smoothstep(0.2, 0.5, abs(c.y)));
    } else if (uStyle == 5.0) {     // bubbles: a ring with a highlight
      alpha = smoothstep(0.5, 0.42, d) * smoothstep(0.3, 0.42, d) + 0.6 * smoothstep(0.12, 0.0, length(c - vec2(-0.15, -0.15)));
    } else if (uStyle == 6.0) {     // petals: a tilted oval with a soft paler middle
      vec2 r = mat2(0.8, -0.6, 0.6, 0.8) * c;
      float e = length(vec2(r.x * 1.9, r.y));
      alpha = smoothstep(0.5, 0.38, e);
      gl_FragColor = vec4(mix(vec3(1.0), uColor, 0.55 + 0.45 * smoothstep(0.0, 0.4, e)), alpha * vAlpha);
      if (alpha < 0.01) discard;
      return;
    } else if (uStyle == 3.0) {     // snow: soft round flake
      alpha = smoothstep(0.5, 0.15, d);
    } else {                        // dust, stars, fireflies: glowing dot
      alpha = pow(smoothstep(0.5, 0.0, d), 1.6);
    }
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uColor, alpha * vAlpha);
  }`;

function moveParticles(points, dt, t) {
  const { speed, style, seed } = points.userData;
  const pos = points.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const s = seed[i];
    let x = pos.getX(i), y = pos.getY(i);
    switch (style) {
      case 'stars': continue;
      case 'snow': y -= dt * speed * (0.4 + s); x += Math.sin(t * 0.8 + s * 30) * dt * 0.3; break;
      case 'petals': y -= dt * speed * (0.35 + s * 0.5); x += (Math.sin(t * 0.7 + s * 40) * 0.6 + 0.5) * dt * speed * 0.9; break;
      case 'rain': y -= dt * speed * (8 + s * 6); x -= dt * speed * 0.8; break;
      case 'fireflies': x += Math.sin(t * 0.4 + s * 50) * dt * speed * 1.2; y += Math.cos(t * 0.33 + s * 70) * dt * speed * 1.2; break;
      case 'bubbles': y += dt * speed * (0.6 + s); x += Math.sin(t * 1.5 + s * 20) * dt * 0.25; break;
      default: y += dt * speed * (0.3 + s); x += Math.sin(t * 0.5 + s * 20) * dt * speed * 0.2;
    }
    if (y > 9) y = -9; else if (y < -9) y = 9;
    if (x > 15) x = -15; else if (x < -15) x = 15;
    pos.setXY(i, x, y);
  }
  pos.needsUpdate = true;
}

// ---- hologram material ---------------------------------------------------------
const HOLO_MATERIALS = new Set();
function holoMaterial(color) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: color } },
    vertexShader: `
      varying vec3 vNormal; varying vec3 vView; varying float vY;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal); vView = normalize(-mv.xyz); vY = position.y;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uColor;
      varying vec3 vNormal; varying vec3 vView; varying float vY;
      void main() {
        float rim = pow(1.0 - abs(dot(vNormal, vView)), 2.0);
        float lines = 0.5 + 0.5 * sin(vY * 40.0 - uTime * 4.0);
        float a = clamp(rim * 1.4 + lines * 0.18, 0.0, 1.0);
        gl_FragColor = vec4(uColor * (0.6 + rim), a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  HOLO_MATERIALS.add(m);
  m.addEventListener('dispose', () => HOLO_MATERIALS.delete(m));
  return m;
}

// ---- builders -----------------------------------------------------------
function makeGeometry(shape) {
  switch (shape) {
    case 'cube': return new THREE.BoxGeometry(1.5, 1.5, 1.5, 2, 2, 2);
    case 'sphere': return new THREE.SphereGeometry(1, 64, 32);
    case 'torus': return new THREE.TorusGeometry(1, 0.35, 32, 96);
    case 'knot': return new THREE.TorusKnotGeometry(0.9, 0.28, 200, 24);
    case 'octahedron': return new THREE.OctahedronGeometry(1.1);
    case 'dodecahedron': return new THREE.DodecahedronGeometry(1);
    case 'cone': return new THREE.ConeGeometry(1, 1.8, 4);
    case 'cylinder': return new THREE.CylinderGeometry(0.6, 0.6, 2, 48);
    case 'capsule': return new THREE.CapsuleGeometry(0.6, 1.1, 12, 32);
    case 'ring': return new THREE.TorusGeometry(1.2, 0.06, 16, 128);
    case 'tree': return treeGeometry();
    case 'pine': return pineGeometry();
    case 'rock': return rockGeometry();
    case 'tower': return towerGeometry();
    case 'lantern': return new THREE.CylinderGeometry(0.5, 0.36, 1.1, 14);
    case 'icosahedron':
    default: return new THREE.IcosahedronGeometry(1, 0);
  }
}

function makeMaterial(cfg) {
  const color = new THREE.Color(cfg.color);
  const glow = cfg.glow || 0;
  switch (cfg.material) {
    case 'glossy': return new THREE.MeshPhysicalMaterial({ color, roughness: 0.15, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.1, emissive: color, emissiveIntensity: glow, flatShading: true });
    case 'metal': return new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 1, emissive: color, emissiveIntensity: glow });
    case 'glass': return new THREE.MeshPhysicalMaterial({ color, roughness: 0.08, metalness: 0.1, transmission: 1, thickness: 0.6, ior: 1.45, iridescence: 0.4, specularIntensity: 1, envMapIntensity: 1.6, emissive: color, emissiveIntensity: glow * 0.5, flatShading: true });
    case 'toon': return new THREE.MeshToonMaterial({ color, emissive: color, emissiveIntensity: glow });
    case 'wireframe': return new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.5 });
    case 'holo': return holoMaterial(color);
    case 'emissive': return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: Math.max(0.6, glow * 2), roughness: 0.4 });
    case 'standard':
    default: return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, emissive: color, emissiveIntensity: glow });
  }
}

// A soft studio "room" so metal and glass have something to reflect, made in code (no image files).
function buildEnvironment(renderer) {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = mix(vec3(0.05,0.04,0.09), vec3(0.55,0.5,0.65), smoothstep(-0.4,1.0,h)); gl_FragColor = vec4(c,1.0); }',
  }));
  env.add(room);
  const panel = (x, y, z, w, h, c) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  panel(0, 8, 2, 8, 3, 0xffffff);
  panel(-8, 2, 3, 3, 6, 0xffe2c4);
  panel(8, 1, -3, 3, 6, 0xc9d6ff);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.04).texture;
  pmrem.dispose();
  return tex;
}

// ---- fields of flowers and grass ---------------------------------------------------------
const FIELD_Y = -2.4;

/** Paints every vertex of a geometry one color (fields use vertex colors so one mesh holds many parts). */
function painted(geo, hex, top) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(hex), c2 = new THREE.Color(top || hex);
  const pos = g.attributes.position;
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) { minY = Math.min(minY, pos.getY(i)); maxY = Math.max(maxY, pos.getY(i)); }
  const colors = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    tmp.copy(c).lerp(c2, maxY > minY ? (pos.getY(i) - minY) / (maxY - minY) : 0);
    colors.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.deleteAttribute('uv');
  return g;
}

function flowerHead({ petals, petalW, petalL, radius, disc, discColor, petalColor, y, tilt }) {
  const pieces = [];
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const p = new THREE.PlaneGeometry(petalW, petalL, 1, 2);
    p.translate(0, radius + petalL / 2, 0);
    p.rotateX(0.18 * (i % 2 ? 1 : -1)); // a slight cup, alternating rows
    p.rotateZ(a);
    pieces.push(painted(p, petalColor));
  }
  const d = new THREE.CylinderGeometry(disc, disc * 0.9, disc * 0.35, 18);
  d.rotateX(Math.PI / 2);
  pieces.push(painted(d, discColor));
  const head = mergeGeometries(pieces);
  head.rotateX(-tilt);
  head.translate(0, y, 0.05);
  return head;
}

function stemAndLeaves(height, stemColor, leafColor, leaves) {
  const pieces = [];
  const stem = new THREE.CylinderGeometry(0.022, 0.034, height, 5, 4);
  stem.translate(0, height / 2, 0);
  pieces.push(painted(stem, stemColor));
  for (let i = 0; i < leaves; i++) {
    const leaf = new THREE.PlaneGeometry(0.34, 0.14, 2, 1);
    leaf.translate(0.17, 0, 0);
    leaf.rotateZ(0.35);
    leaf.rotateY(i * 2.3);
    leaf.translate(0, height * (0.3 + 0.45 * (i / Math.max(1, leaves - 1))), 0);
    pieces.push(painted(leaf, leafColor));
  }
  return mergeGeometries(pieces);
}

function grassTuft(blades, height, spread) {
  const parts = [];
  for (let i = 0; i < blades; i++) {
    const b = new THREE.ConeGeometry(0.035, height, 3, 3, true);
    b.translate(0, height / 2, 0);
    b.rotateZ((Math.random() - 0.5) * 0.5);
    b.translate((Math.random() - 0.5) * spread, 0, (Math.random() - 0.5) * spread);
    parts.push(painted(b, '#2f4f17', '#a7c45a'));
  }
  return mergeGeometries(parts);
}

// moving surfaces: the wave is GLSL added to the vertex shader (position is the flat plane)
const SURFACES = {
  water: {
    color: '#2a6f8f', roughness: 0.18, metalness: 0.35, lift: 0.2, segments: [150, 95],
    wave: `float tw = uTime * (0.6 + 0.4 * uWind);
          float a = 0.22 * uWind;
          transformed.y += a * (sin(position.x * 0.32 + tw * 1.1) * 0.9 + sin(position.z * 0.45 - tw * 0.8) * 0.7
            + sin((position.x + position.z) * 0.9 + tw * 1.6) * 0.35);`,
  },
  dunes: {
    color: '#d9a066', roughness: 1, metalness: 0, lift: -0.4, segments: [120, 80],
    wave: `float tw = uTime * 0.03 * uWind;
          transformed.y += 1.4 * sin(position.x * 0.09 + position.z * 0.05 + tw) * cos(position.z * 0.11 - tw * 0.7)
            + 0.5 * sin(position.x * 0.23 - position.z * 0.17 + tw * 1.3) + 0.12 * sin(position.x * 0.9 + position.z * 0.3);`,
  },
};

function treeGeometry() {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.11, 0.17, 1.4, 7);
  trunk.translate(0, 0.7, 0);
  parts.push(painted(trunk, '#5b4434'));
  const blobs = [[0, 1.75, 0, 0.75], [0.5, 1.5, 0.15, 0.55], [-0.45, 1.55, -0.1, 0.55], [0.1, 2.25, -0.1, 0.5], [-0.15, 1.45, 0.45, 0.45]];
  for (const [x, y, z, r] of blobs) {
    const b = new THREE.IcosahedronGeometry(r, 1);
    b.translate(x, y, z);
    parts.push(painted(b, '#e8e8e8', '#ffffff'));
  }
  const g = mergeGeometries(parts);
  g.translate(0, -1.2, 0);
  return g;
}

function pineGeometry({ leaf = '#d0d0d0', tip = '#ffffff', trunk: bark = '#7a5a40' } = {}, height = 1) {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.08, 0.12, 0.6 * height, 6);
  trunk.translate(0, 0.3 * height, 0);
  parts.push(painted(trunk, bark));
  for (let i = 0; i < 3; i++) {
    const r = (0.75 - i * 0.18) * height, h = (1.1 - i * 0.15) * height;
    const c = new THREE.ConeGeometry(r, h, 8);
    c.translate(0, (0.55 + i * 0.55) * height + h / 2, 0);
    parts.push(painted(c, leaf, tip));
  }
  return mergeGeometries(parts);
}

function towerGeometry() {
  const parts = [];
  const add = (geo, glow) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.deleteAttribute('uv');
    g.setAttribute('aGlow', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(glow), 1));
    parts.push(g);
  };
  add(new THREE.BoxGeometry(1, 3, 1), 0);
  const roof = new THREE.BoxGeometry(0.55, 0.25, 0.55);
  roof.translate(0, 1.62, 0);
  add(roof, 0);
  for (let side = 0; side < 4; side++) {
    for (let row = 0; row < 11; row++) {
      for (let col = 0; col < 3; col++) {
        const w = new THREE.PlaneGeometry(0.2, 0.13);
        w.translate(-0.3 + col * 0.3, -1.25 + row * 0.25, 0.505);
        w.rotateY(side * Math.PI / 2);
        const h = Math.sin(side * 91.7 + row * 12.9898 + col * 78.233) * 43758.5453, r = h - Math.floor(h); // same windows lit every time
        add(w, r < 0.45 ? 0.6 + r * 0.8 : 0.04);
      }
    }
  }
  return mergeGeometries(parts);
}

function rockGeometry() {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const pos = g.attributes.position;
  const seen = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    // the same bumps every time (so a rock keeps its shape when you recolor it)
    if (!seen.has(key)) { const h = Math.sin(pos.getX(i) * 12.9898 + pos.getY(i) * 78.233 + pos.getZ(i) * 37.719) * 43758.5453; seen.set(key, 0.8 + (h - Math.floor(h)) * 0.35); }
    const k = seen.get(key);
    pos.setXYZ(i, pos.getX(i) * k * 1.2, pos.getY(i) * k * 0.7, pos.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

const FIELD_PARTS = {
  lavender: () => {
    const head = [];
    for (let i = 0; i < 7; i++) {
      const bud = new THREE.SphereGeometry(0.045 - i * 0.003, 6, 4);
      bud.scale(1, 1.6, 1);
      bud.translate((i % 2 ? 0.02 : -0.02), 0.62 + i * 0.07, 0);
      head.push(painted(bud, '#ffffff'));
    }
    return {
      size: 1.25, turn: 3,
      meshes: [
        { geometry: grassTuft(6, 0.62, 0.12) },
        { geometry: mergeGeometries(head), colors: ['#8e6bd6', '#7a5cc4', '#a27ce0', '#6c55b8', '#b08ae8'] },
      ],
    };
  },
  pines: () => ({ size: 1.15, turn: 3, meshes: [{ geometry: pineGeometry({ leaf: '#24513a', tip: '#e4edf0', trunk: '#5a4232' }), colors: ['#ffffff', '#e2efe4', '#d2e4d8', '#f0f4ee'] }] }),
  sunflowers: () => ({
    size: 1, turn: 0.7,
    meshes: [
      { geometry: stemAndLeaves(1.75, '#3e6b20', '#4f8a2a', 3) },
      { geometry: flowerHead({ petals: 22, petalW: 0.1, petalL: 0.26, radius: 0.15, disc: 0.17, discColor: '#4a2a10', petalColor: '#ffffff', y: 1.78, tilt: 0.3 }),
        colors: ['#f7c51e', '#f5b70f', '#ffd23a', '#f2a90c'] },
    ],
  }),
  wildflowers: () => ({
    size: 0.95, turn: 3,
    meshes: [
      { geometry: grassTuft(4, 0.55, 0.45) },
      { geometry: stemAndLeaves(0.9, '#4b7a2a', '#5c9234', 2) },
      { geometry: flowerHead({ petals: 6, petalW: 0.08, petalL: 0.12, radius: 0.04, disc: 0.05, discColor: '#f2d45c', petalColor: '#ffffff', y: 0.92, tilt: 1.1 }),
        colors: ['#ffffff', '#f7a8d8', '#b48cf2', '#ffd447', '#ff7a6b', '#8fb8ff'] },
    ],
  }),
  grass: () => ({ size: 1.1, turn: 3, meshes: [{ geometry: grassTuft(5, 1, 0.3) }] }),
};

let HALO;
function haloTexture() {
  if (HALO) return HALO;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  HALO = new THREE.CanvasTexture(c);
  HALO.userData.shared = true;
  return HALO;
}

function disposeTree(root) {
  root.traverse(o => {
    if (o.userData.shared) return; // belongs to a cached model that other objects reuse
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
  });
}

function hashPhase(id) { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0; return (h % 628) / 100; }
const round = v => Math.round(v * 100) / 100;
