// Trình xem máy 3D (three.js): nạp GLB theo manifest (hoặc placeholder), gắn node chuyển động với
// m.getVisual().parts, LED cảm biến, đèn tháp, băng tải cuộn texture, vật liệu procedural, camera quỹ đạo.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { NODE_DEFS } from './nodes.js';
import { buildPlaceholder } from './placeholder.js';
import { ItemLayer } from './items.js';

let manifestP = null;
export function loadManifest() {
  if (!manifestP) manifestP = fetch('assets/models/manifest.json').then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return manifestP;
}

const axisToThree = (a) => new THREE.Vector3(a[0], a[2], -a[1]).normalize();
const BELT_PERIOD = 0.08; // m giữa 2 vạch trên băng tải

function stripeTexture(base) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const x = c.getContext('2d');
  const col = new THREE.Color(base);
  x.fillStyle = '#' + col.getHexString(); x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#' + col.clone().multiplyScalar(0.72).getHexString(); x.fillRect(0, 0, 10, 64);
  x.fillStyle = 'rgba(255,255,255,0.06)'; x.fillRect(30, 0, 4, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class MachineViewer {
  constructor(container, { machineId, inputTags = [] } = {}) {
    this.container = container; this.machineId = machineId; this.inputTags = inputTags;
    this.source = null; this.disposed = false; this.isPlaceholder = false;
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.domElement.className = 'viewer-canvas';
    r.domElement.setAttribute('aria-label', 'Mô hình 3D của máy');
    r.domElement.setAttribute('role', 'img');
    container.appendChild(r.domElement);

    const s = (this.scene = new THREE.Scene());
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.02, 60);
    this.controls = new OrbitControls(this.camera, r.domElement);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.12; this.controls.maxPolarAngle = Math.PI * 0.495;

    s.add(new THREE.HemisphereLight(0xf3f6fa, 0x5b6168, 1.1));
    const sun = (this.sun = new THREE.DirectionalLight(0xffffff, 1.8));
    sun.position.set(2.5, 4.5, 3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.01;
    s.add(sun, sun.target);
    const fill = new THREE.DirectionalLight(0xdfe8ff, 0.5); fill.position.set(-3, 2, -2); s.add(fill);

    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0xc9cfd6, roughness: 0.95 }));
    this.ground.rotation.x = -Math.PI / 2; this.ground.receiveShadow = true; s.add(this.ground);
    this.grid = new THREE.GridHelper(20, 40, 0x8a949e, 0xaab2ba); this.grid.position.y = 0.001; this.grid.material.transparent = true; this.grid.material.opacity = 0.35; s.add(this.grid);

    this.machine = new THREE.Group(); s.add(this.machine);
    this.items = new ItemLayer(s);
    this.bindings = []; this.belts = []; this.leds = new Map(); this.lamps = {};
    this.applyTheme();

    this._ro = new ResizeObserver(() => this.resize()); this._ro.observe(container);
    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
  }

  applyTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    this.scene.background = new THREE.Color(dark ? 0x1b2229 : 0xe4e9ee);
    this.scene.fog = new THREE.Fog(this.scene.background, 12, 30);
    this.ground.material.color.set(dark ? 0x2a323b : 0xcfd5db);
    this.grid.material.opacity = dark ? 0.2 : 0.35;
  }

  async load() {
    const manifest = await loadManifest();
    const entry = manifest?.machines?.[this.machineId];
    this.manifest = entry || null;
    let root = null;
    if (entry?.file) {
      try {
        const gltf = await new GLTFLoader().loadAsync('assets/models/' + entry.file);
        root = gltf.scene;
      } catch (e) { console.info('[viewer] không nạp được GLB, dùng placeholder:', e?.message || e); }
    }
    if (this.disposed) return;
    if (!root) { root = buildPlaceholder(this.machineId); this.isPlaceholder = true; }
    this.machine.add(root);
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.bind(root, { ...(NODE_DEFS[this.machineId] || {}), ...(entry?.nodes || {}) });
    this.frame();
    this.setView('iso');
  }

  bind(root, defs) {
    // 1) cha–con (vd. cyl_2A_rod gắn trên slide_1A)
    for (const [name, d] of Object.entries(defs)) {
      if (!d.parent) continue;
      const o = root.getObjectByName(name), p = root.getObjectByName(d.parent);
      if (o && p && o.parent !== p) p.attach(o);
    }
    // 2) kính trong suốt
    root.traverse((o) => {
      let n = o; let glass = false;
      while (n && n !== root) { if (/^glass_/i.test(n.name)) { glass = true; break; } n = n.parent; }
      if (glass && o.isMesh) {
        o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.22; o.material.depthWrite = false; o.castShadow = false;
      }
    });
    // 3) node chuyển động, băng tải, cảm biến, đèn
    for (const [name, d] of Object.entries(defs)) {
      const o = root.getObjectByName(name);
      if (!o) continue;
      const type = d.type || (/^belt_/.test(name) ? 'belt' : /^sen_/.test(name) ? 'sensor' : 'static');
      if (type === 'translate' || type === 'rotate') {
        this.bindings.push({ name, o, type, axis: axisToThree(d.axisFC || [1, 0, 0]), travel: +d.travel || 0, restP: o.position.clone(), restQ: o.quaternion.clone() });
      } else if (type === 'belt' || type === 'rollers') {
        this.setupBelt(name, o, d);
      } else if (name === 'pallet') {
        this.pallet = o;
      }
    }
    root.traverse((o) => {
      const m = /^sen_(.+)$/.exec(o.name);
      if (m && !this.leds.has(m[1])) this.setupSensor(m[1], o);
      const l = /^static_lamp_(green|amber|red)/.exec(o.name);
      if (l && !this.lamps[l[1]]) this.setupLamp(l[1], o, defs[o.name]?.signal);
    });
    if (!this.leds.size) this.fallbackLeds(root);
  }

  setupBelt(name, o, d) {
    const axis = d.uvAxisFC || [1, 0, 0];
    o.traverse((c) => {
      if (!c.isMesh) return;
      const base = c.material?.color ? '#' + c.material.color.getHexString() : '#2e7d4f';
      const tex = stripeTexture(base); tex.repeat.set(1 / BELT_PERIOD, 1 / BELT_PERIOD);
      c.material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
      const g = c.geometry;
      if (!g.attributes.uv) {
        const pos = g.attributes.position; const uv = new Float32Array(pos.count * 2);
        const ax = axisToThree(axis);
        const perp = new THREE.Vector3(-ax.z, 0, ax.x);
        const v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); uv[i * 2] = v.dot(ax); uv[i * 2 + 1] = v.dot(perp) + v.y; }
        g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      }
      this.belts.push({ name, tex });
    });
  }

  setupSensor(tag, o) {
    const m = new THREE.MeshStandardMaterial({ color: 0x3a424b, emissive: 0x000000, roughness: 0.4 });
    let any = false;
    o.traverse((c) => { if (c.isMesh) { c.material = m; c.castShadow = false; any = true; } });
    if (!any) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 8), m); o.add(s); }
    this.leds.set(tag, { m, on: null });
  }
  setupLamp(color, o, signal) {
    const hex = { green: 0x2fd15a, amber: 0xffb020, red: 0xff3b30 }[color];
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).multiplyScalar(0.35), emissive: 0x000000, transparent: true, opacity: 0.92 });
    o.traverse((c) => { if (c.isMesh) c.material = m; });
    this.lamps[color] = { m, hex, on: null, signal: signal || { green: 'H_Run', amber: 'H_Warn', red: 'H_Fault' }[color] };
  }
  /** Placeholder không có node sen_: tạo hàng LED ở mép trước máy. */
  fallbackLeds(root) {
    const box = new THREE.Box3().setFromObject(root);
    const tags = this.inputTags.filter((t) => !/^(Start|Stop|Reset|EStop|AutoMan)$/.test(t));
    if (!tags.length || box.isEmpty()) return;
    const x0 = box.min.x + 0.05, x1 = box.max.x - 0.05;
    tags.forEach((tag, i) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.014, 14, 10));
      s.position.set(tags.length > 1 ? x0 + ((x1 - x0) * i) / (tags.length - 1) : (x0 + x1) / 2, 0.86, box.max.z + 0.04);
      s.name = 'sen_' + tag; this.machine.add(s);
      this.setupSensor(tag, s);
    });
  }

  frame() {
    const box = new THREE.Box3().setFromObject(this.machine);
    if (box.isEmpty()) box.set(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 1.5, 1));
    this.box = box;
    const c = box.getCenter(new THREE.Vector3()); const size = box.getSize(new THREE.Vector3());
    const R = Math.max(size.x, size.y, size.z) * 0.8 + 0.3;
    const sc = this.sun.shadow.camera; sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 0.1; sc.far = R * 6; sc.updateProjectionMatrix();
    this.sun.position.copy(c).add(new THREE.Vector3(R * 0.8, R * 2, R * 1.2)); this.sun.target.position.copy(c);
    this.ground.position.set(c.x, Math.min(0, box.min.y) - 0.002, c.z);
    this.grid.position.set(c.x, Math.min(0, box.min.y) + 0.001, c.z);
  }

  setView(name) {
    if (!this.box) return;
    const c = this.box.getCenter(new THREE.Vector3()); const size = this.box.getSize(new THREE.Vector3());
    const d = Math.max(size.x, size.y * 1.3, size.z) * 1.35 + 0.6;
    let pos;
    if (name === 'iso' && this.manifest?.camera?.pos) {
      pos = new THREE.Vector3(...this.manifest.camera.pos); c.set(...this.manifest.camera.target);
      if (this.manifest.camera.fov) { this.camera.fov = this.manifest.camera.fov; this.camera.updateProjectionMatrix(); }
    } else {
      pos = {
        iso: new THREE.Vector3(c.x + d * 0.55, c.y + d * 0.55, c.z + d * 0.85),
        front: new THREE.Vector3(c.x, c.y + d * 0.15, c.z + d),
        side: new THREE.Vector3(c.x + d, c.y + d * 0.2, c.z),
        top: new THREE.Vector3(c.x, c.y + d * 1.1, c.z + 0.001),
      }[name] || new THREE.Vector3(c.x + d, c.y + d, c.z + d);
    }
    this.camera.position.copy(pos); this.controls.target.copy(c); this.controls.update();
  }

  setSource(fn) { this.source = fn; }

  apply(v) {
    if (!v) return;
    const parts = v.parts || {};
    for (const b of this.bindings) {
      const val = +parts[b.name] || 0;
      if (b.type === 'translate') b.o.position.copy(b.restP).addScaledVector(b.axis, (b.travel / 1000) * val);
      else b.o.quaternion.copy(b.restQ).premultiply(new THREE.Quaternion().setFromAxisAngle(b.axis, THREE.MathUtils.degToRad(b.travel * val)));
    }
    if (this.pallet && 'pallet_visible' in parts) this.pallet.visible = !!parts.pallet_visible;
    for (const bt of this.belts) {
      let off = v.belts?.[bt.name];
      if (off === undefined && parts[bt.name] !== undefined) off = parts[bt.name] / 1000; // shim: mm
      if (off !== undefined) bt.tex.offset.x = -(off / BELT_PERIOD) % 1;
    }
    const leds = v.leds || {};
    for (const [tag, L] of this.leds) {
      const on = !!leds[tag];
      if (on !== L.on) { L.on = on; L.m.color.set(on ? 0x6dff8a : 0x3a424b); L.m.emissive.set(on ? 0x22c040 : 0x000000); L.m.emissiveIntensity = on ? 1.4 : 0; }
    }
    const outs = this.getOutputs?.() || {};
    for (const L of Object.values(this.lamps)) {
      const on = L.signal === 'H_Run' ? !!(v.lamps?.run ?? outs.H_Run) : L.signal === 'H_Fault' ? !!(v.lamps?.fault ?? outs.H_Fault) || !!v.crashed
        : L.signal in outs ? !!outs[L.signal] : !!v.crashed;
      if (on !== L.on) { L.on = on; L.m.emissive.set(on ? L.hex : 0x000000); L.m.emissiveIntensity = on ? 1.6 : 0; }
    }
    this.items.update(v.items || []);
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  _loop() {
    if (this.disposed) return;
    this._raf = requestAnimationFrame(this._loop);
    if (!this.container.isConnected || !this.container.clientWidth) return;
    if (this.source) { try { this.apply(this.source()); } catch (e) { if (!this._warned) { console.warn('[viewer]', e); this._warned = true; } } }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this._raf);
    this._ro.disconnect();
    this.controls.dispose();
    this.scene.traverse((o) => { if (o.isMesh) { o.geometry?.dispose(); } });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
