// Ready-made looks. Each one sets the scene, camera, 3D objects, widgets and card style, a
// soundscape, and a matching style for COSMIC's real taskbar (applied only if you agree).
import { deepMerge, defaultObject, defaultScene, defaultTheme, defaultWidget } from './config.js';

const obj = (shape, patch) => deepMerge(defaultObject(shape), patch);
const wid = (type, patch) => {
  const w = defaultWidget(type);
  return deepMerge(w, { ...patch, settings: deepMerge(w.settings, patch.settings || {}) });
};
const scene = patch => deepMerge(defaultScene(), patch);
const theme = patch => deepMerge(defaultTheme(), patch);
const camera = patch => deepMerge({ mode: 'parallax', strength: 1, smoothing: 0.06, fov: 50, distance: 9, drift: true }, patch);

export const PRESETS = {
  'Crystal Cove': {
    tagline: 'Glass crystals, warm dust, frosted cards',
    swatch: ['#0b1020', '#2a1240', '#ff9e3d'],
    taskbar: { layout: 'islands', look: { isDark: true, frostedPanel: true, panel: { background: '#1a1030' }, dock: { background: '#1a1030' } } },
    build: () => ({
      scene: scene({
        background: { type: 'mesh', color1: '#0b1020', color2: '#2a1240', color3: '#3a1d12', speed: 0.4 },
        particles: { style: 'dust', count: 1100, color: '#ffd7a3', size: 0.05, speed: 0.2 },
        sound: 'chimes',
      }),
      camera: camera({}),
      objects: [
        obj('icosahedron', { name: 'Crystal', color: '#ff9e3d', material: 'glass', position: { x: 2.8, y: 0.3, z: 0 }, scale: 1.7, interact: { hover: 'spin' } }),
        obj('octahedron', { name: 'Shard', color: '#ffc58a', material: 'glass', position: { x: 4.4, y: -1.6, z: -1.2 }, scale: 0.6, spin: { enabled: true, x: 0.3, y: 0.5, z: 0.1 } }),
        obj('knot', { name: 'Knot', color: '#7f5cff', material: 'metal', position: { x: -3.8, y: -1.7, z: -2.5 }, scale: 0.7, spin: { enabled: true, x: 0.2, y: 0.1, z: 0.15 } }),
        obj('octahedron', { name: 'Diamond', color: '#3fd0c9', material: 'emissive', glow: 0.7, position: { x: 4.8, y: 2.5, z: -3 }, scale: 0.45 }),
      ],
      widgets: [
        wid('clock', { x: 5, y: 9, depth: 0.6 }),
        wid('greeting', { x: 5, y: 27, depth: 0.5 }),
        wid('quote', { x: 5, y: 64, depth: 0.35 }),
        wid('system', { x: 77, y: 9, depth: 0.4 }),
      ],
      theme: theme({ cardStyle: 'liquid' }),
    }),
  },

  'Above the Clouds': {
    tagline: 'A real 360° sky you can look around in, with glass shapes',
    swatch: ['#6fa8dc', '#dbe9f6', '#ffffff'],
    sky: { id: 'kloofendal_48d_partly_cloudy_puresky', name: 'Kloofendal Partly Cloudy Sky', look: { blur: 0, brightness: 1, lighting: 1.1, rotation: 40 } },
    taskbar: { layout: 'islands', look: { isDark: false, frostedPanel: true, panel: { background: 'Light', opacity: 0.5 }, dock: { background: 'Light', opacity: 0.5 } } },
    build: () => ({
      scene: scene({
        background: { type: 'gradient', color1: '#4f8fd0', color2: '#dbe9f6', angle: 180 },
        fog: { enabled: false }, particles: { style: 'dust', count: 300, color: '#ffffff', size: 0.05, speed: 0.15 },
        light: { ambient: 0.7, color: '#fff6e8', intensity: 2.4, rim: '#bcd8ff' }, overlay: { vignette: 0.15, grain: 0.02 },
        sound: 'wind',
      }),
      camera: camera({ mode: 'orbit', strength: 0.9, smoothing: 0.03, fov: 55, distance: 10 }),
      objects: [
        obj('icosahedron', { name: 'Crystal', color: '#e6f3ff', material: 'glass', position: { x: 3, y: 0.4, z: 0 }, scale: 1.5 }),
        obj('knot', { name: 'Chrome knot', color: '#ffffff', material: 'metal', position: { x: -3.6, y: -1.4, z: -2 }, scale: 0.7, spin: { enabled: true, x: 0.15, y: 0.2, z: 0.1 } }),
        obj('sphere', { name: 'Pearl', color: '#ffffff', material: 'glossy', position: { x: 4.8, y: 2.2, z: -3 }, scale: 0.45 }),
      ],
      widgets: [
        wid('clock', { x: 6, y: 10, card: false, depth: 0.7, settings: { size: 120 }, w: 460, h: 180 }),
        wid('date', { x: 5, y: 30, card: false, depth: 0.6 }),
        wid('nowplaying', { x: 5, y: 70, depth: 0.35 }),
      ],
      theme: theme({ cardStyle: 'liquid', font: 'thin', widgetBg: '#16314d', widgetOpacity: 0.35, text: '#ffffff', accent: '#ffe7a8', widgetMotion: '3d' }),
    }),
  },

  'Ember Sky': {
    tagline: 'A blazing 360° sunset mirrored in chrome',
    swatch: ['#2a0d05', '#ff6a2b', '#ffd27a'],
    sky: { id: 'the_sky_is_on_fire', name: 'The Sky Is On Fire', look: { blur: 0, brightness: 0.9, lighting: 1.2, rotation: 180 } },
    taskbar: { layout: 'mac', look: { isDark: true, frostedPanel: true, panel: { background: '#1f0c06', opacity: 0.55 }, dock: { background: '#1f0c06', opacity: 0.5 } } },
    build: () => ({
      scene: scene({
        background: { type: 'mesh', color1: '#2a0d05', color2: '#ff6a2b', color3: '#5a1a2e', speed: 0.3 },
        fog: { enabled: false }, particles: { style: 'fireflies', count: 160, color: '#ffb36b', size: 0.07, speed: 0.2 },
        light: { ambient: 0.4, color: '#ffc58a', intensity: 2.6, rim: '#ff5a3d' }, overlay: { vignette: 0.45, grain: 0.04 },
        sound: 'wind',
      }),
      camera: camera({ mode: 'orbit', strength: 1, smoothing: 0.03, fov: 55, distance: 10 }),
      objects: [
        obj('sphere', { name: 'Chrome orb', color: '#ffffff', material: 'metal', position: { x: 2.8, y: 0.2, z: -1 }, scale: 1.6, spin: { enabled: false } }),
        obj('torus', { name: 'Gold ring', color: '#ffcf70', material: 'metal', position: { x: 2.8, y: 0.2, z: -1 }, scale: 2.2, rotation: { x: 70, y: 0, z: 0 }, spin: { enabled: true, x: 0, y: 0, z: 0.15 } }),
      ],
      widgets: [
        wid('clock', { x: 5, y: 10, card: false, settings: { size: 110 } }),
        wid('date', { x: 5, y: 29, card: false }),
        wid('quote', { x: 5, y: 64 }),
      ],
      theme: theme({ accent: '#ffb36b', font: 'serif', cardStyle: 'liquid', widgetBg: '#1f0c06', widgetOpacity: 0.3, widgetMotion: '3d' }),
    }),
  },

  'Milky Way': {
    tagline: 'A real 360° night sky full of stars, and crickets',
    swatch: ['#02030a', '#14204a', '#cfd8ff'],
    sky: { id: 'rogland_clear_night', name: 'Rogland Clear Night', look: { blur: 0, brightness: 1.4, lighting: 1, rotation: 0 } },
    taskbar: { layout: 'zen', look: { isDark: true, frostedPanel: true, panel: { background: '#05070f' }, dock: { background: '#05070f' } } },
    build: () => ({
      scene: scene({
        background: { type: 'aurora', color1: '#02030a', color2: '#1e2a6b', color3: '#3b1a5a', speed: 0.3 },
        fog: { enabled: false }, particles: { style: 'fireflies', count: 90, color: '#d9f7a0', size: 0.07, speed: 0.15 },
        light: { ambient: 0.35, color: '#cfd8ff', intensity: 1.6, rim: '#7f8cff' }, overlay: { vignette: 0.5, grain: 0.05 },
        sound: 'night',
      }),
      camera: camera({ mode: 'orbit', strength: 1.1, smoothing: 0.025, fov: 60, distance: 10 }),
      objects: [
        obj('octahedron', { name: 'Star shard', color: '#cfd8ff', material: 'glass', glow: 0.3, position: { x: 3.4, y: 1, z: -2 }, scale: 0.7 }),
      ],
      widgets: [
        wid('clock', { x: 5, y: 10, card: false, settings: { size: 110 } }),
        wid('moon', { x: 79, y: 8, card: false, w: 200, h: 220 }),
      ],
      theme: theme({ accent: '#cfd8ff', font: 'thin', cardStyle: 'clear', widgetMotion: '3d' }),
    }),
  },

  'Aurora': {
    tagline: 'Northern lights, snow and liquid glass',
    swatch: ['#03141c', '#1de9b6', '#7c4dff'],
    taskbar: { layout: 'mac', look: { isDark: true, frostedPanel: true, panel: { background: '#06202a', opacity: 0.5 }, dock: { background: '#06202a', opacity: 0.45 } } },
    build: () => ({
      scene: scene({
        background: { type: 'aurora', color1: '#020b12', color2: '#1de9b6', color3: '#7c4dff', speed: 0.8 },
        fog: { enabled: false }, particles: { style: 'snow', count: 800, color: '#e8fbff', size: 0.06, speed: 0.35 },
        light: { ambient: 0.6, rim: '#1de9b6' }, overlay: { vignette: 0.45, grain: 0.03 },
        sound: 'wind',
      }),
      camera: camera({ strength: 0.8, smoothing: 0.04 }),
      objects: [
        obj('sphere', { name: 'Moon', color: '#dff7ff', material: 'glossy', glow: 0.3, position: { x: 4.2, y: 2.4, z: -4 }, scale: 0.9, spin: { enabled: false } }),
        obj('cone', { name: 'Peak', color: '#0d2f3a', material: 'standard', position: { x: -4.5, y: -3.2, z: -3 }, scale: 2.2, spin: { enabled: false }, float: { enabled: false }, interact: { hover: 'none', dragRotate: false } }),
        obj('cone', { name: 'Far peak', color: '#0a2430', material: 'standard', position: { x: -1.8, y: -3.4, z: -5 }, scale: 1.8, spin: { enabled: false }, float: { enabled: false }, interact: { hover: 'none', dragRotate: false } }),
      ],
      widgets: [
        wid('clock', { x: 36, y: 26, w: 480, h: 190, card: false, depth: 0.7, settings: { size: 130 } }),
        wid('date', { x: 39, y: 48, card: false, depth: 0.6 }),
        wid('nowplaying', { x: 4, y: 70, depth: 0.3 }),
        wid('worldclock', { x: 79, y: 8, depth: 0.3 }),
      ],
      theme: theme({ cardStyle: 'liquid', accent: '#1de9b6', font: 'thin', widgetBg: '#06202a', widgetOpacity: 0.35 }),
    }),
  },

  'Neon Grid': {
    tagline: 'Synthwave sun, neon floor, mono type',
    swatch: ['#05010d', '#ff4fd8', '#2ef2ff'],
    taskbar: { layout: 'centered', look: { isDark: true, panel: { background: '#12021f', opacity: 0.85, radius: 0 } } },
    build: () => ({
      scene: scene({
        background: { type: 'gradient', color1: '#05010d', color2: '#2a0845', angle: 180 },
        fog: { enabled: true, color: '#12021f', density: 0.025 },
        particles: { style: 'stars', count: 600, color: '#ff4fd8', size: 0.05, speed: 0.4 },
        floor: { enabled: true, color: '#ff4fd8' }, light: { ambient: 0.3, color: '#ff9cf0', intensity: 2, rim: '#2ef2ff' },
        overlay: { vignette: 0.5, grain: 0.06 },
        sound: 'cyber',
      }),
      camera: camera({ strength: 1.4, smoothing: 0.05, fov: 55, distance: 10 }),
      objects: [
        obj('sphere', { name: 'Sun', color: '#ff3d8b', material: 'emissive', glow: 1.4, position: { x: 0.6, y: 0.4, z: -10 }, scale: 2.2, spin: { enabled: false }, float: { enabled: false } }),
        obj('ring', { name: 'Sun halo', color: '#ffb36b', material: 'emissive', glow: 1, position: { x: 0.6, y: 0.4, z: -9.5 }, scale: 2.9, spin: { enabled: true, x: 0, y: 0, z: 0.15 }, float: { enabled: false } }),
        obj('cube', { name: 'Neon cube', color: '#2ef2ff', material: 'wireframe', position: { x: 3.4, y: -0.6, z: 0 }, scale: 1.1 }),
        obj('octahedron', { name: 'Neon gem', color: '#ff4fd8', material: 'wireframe', position: { x: 1.4, y: -1.6, z: 1 }, scale: 0.6 }),
      ],
      widgets: [
        wid('clock', { x: 39, y: 7, depth: 0.7, settings: { seconds: true } }),
        wid('apps', { x: 3, y: 22, depth: 0.25 }),
        wid('nowplaying', { x: 74, y: 52, depth: 0.4 }),
        wid('graph', { x: 76, y: 72, depth: 0.4, settings: { metric: 'cpu' } }),
      ],
      theme: theme({ accent: '#ff4fd8', font: 'mono', glow: true, cardStyle: 'neon', radius: 4 }),
    }),
  },

  'Sunset Drive': {
    tagline: 'Golden hour sky, ocean breeze, warm glass',
    swatch: ['#ff8a5c', '#7b2d6b', '#ffd27a'],
    taskbar: { layout: 'centered', look: { isDark: true, frostedPanel: true, panel: { background: '#3a1430', opacity: 0.55, floating: true, radius: 16, margin: 8, stretch: true } } },
    build: () => ({
      scene: scene({
        background: { type: 'mesh', color1: '#ff8a5c', color2: '#7b2d6b', color3: '#2b1748', speed: 0.35 },
        fog: { enabled: true, color: '#5a2050', density: 0.03 },
        particles: { style: 'dust', count: 500, color: '#ffe0a8', size: 0.06, speed: 0.15 },
        floor: { enabled: true, color: '#ffb36b' }, light: { ambient: 0.6, color: '#ffd7b0', intensity: 2.2, rim: '#ff5fa2' },
        overlay: { vignette: 0.35, grain: 0.05 },
        sound: 'ocean',
      }),
      camera: camera({ strength: 1.1, smoothing: 0.04, fov: 52, distance: 10 }),
      objects: [
        obj('sphere', { name: 'Sun', color: '#ffb36b', material: 'emissive', glow: 1.3, position: { x: -2.5, y: 1.2, z: -8 }, scale: 2.2, spin: { enabled: false }, float: { enabled: false } }),
        obj('cone', { name: 'Hill', color: '#3b1440', material: 'standard', position: { x: 5.5, y: -3.8, z: -7 }, scale: 2, spin: { enabled: false }, float: { enabled: false }, interact: { hover: 'none', dragRotate: false } }),
        obj('cone', { name: 'Far hill', color: '#2b1036', material: 'standard', position: { x: -6.5, y: -4, z: -9 }, scale: 2.6, spin: { enabled: false }, float: { enabled: false }, interact: { hover: 'none', dragRotate: false } }),
        obj('ring', { name: 'Halo', color: '#ff9fd0', material: 'glass', position: { x: 4.6, y: 1.6, z: -2 }, scale: 1, spin: { enabled: true, x: 0.2, y: 0.4, z: 0 } }),
      ],
      widgets: [
        wid('clock', { x: 5, y: 9, card: false, settings: { format: '12', size: 110 } }),
        wid('date', { x: 5, y: 29, card: false }),
        wid('nowplaying', { x: 5, y: 66 }),
        wid('links', { x: 79, y: 9 }),
      ],
      theme: theme({ accent: '#ffd27a', font: 'rounded', cardStyle: 'liquid', widgetBg: '#3a1430', widgetOpacity: 0.35 }),
    }),
  },

  'Sakura': {
    tagline: 'Blossom pink, birdsong, serif type',
    swatch: ['#fde7ee', '#f7b2c8', '#9b4d6b'],
    taskbar: { layout: 'islands', look: { isDark: false, frostedPanel: true, panel: { background: 'Light', opacity: 0.6 }, dock: { background: 'Light', opacity: 0.6 } } },
    build: () => ({
      scene: scene({
        background: { type: 'mesh', color1: '#fff1f4', color2: '#f7c3d3', color3: '#ffe3c9', speed: 0.5 },
        fog: { enabled: false }, particles: { style: 'snow', count: 320, color: '#ff9fbf', size: 0.09, speed: 0.12 },
        light: { ambient: 0.9, color: '#fff4f6', intensity: 1.6, rim: '#ffb3c9' }, overlay: { vignette: 0.1, grain: 0.03 },
        sound: 'forest',
      }),
      camera: camera({ strength: 0.6, smoothing: 0.04, drift: false }),
      objects: [
        obj('torus', { name: 'Petal ring', color: '#f48fb1', material: 'toon', position: { x: 3.4, y: 0.6, z: -1 }, scale: 1.2, spin: { enabled: true, x: 0.15, y: 0.25, z: 0 } }),
        obj('sphere', { name: 'Pearl', color: '#fff7fa', material: 'glossy', position: { x: 5, y: -1.6, z: -2 }, scale: 0.6 }),
        obj('dodecahedron', { name: 'Blossom', color: '#ffc1d6', material: 'glass', position: { x: 1.6, y: 2.4, z: -3 }, scale: 0.5 }),
      ],
      widgets: [
        wid('clock', { x: 6, y: 12, card: false, settings: { format: '12' } }),
        wid('date', { x: 6, y: 30, card: false }),
        wid('quote', { x: 6, y: 60 }),
        wid('todo', { x: 75, y: 10 }),
      ],
      theme: theme({ text: '#4a2233', widgetBg: '#ffffff', widgetOpacity: 0.5, accent: '#d6457a', font: 'serif', cardStyle: 'liquid', textShadow: false }),
    }),
  },

  'Deep Ocean': {
    tagline: 'Bubbles rising through blue water',
    swatch: ['#001a2c', '#003f5c', '#00c2d1'],
    taskbar: { layout: 'zen', look: { isDark: true, frostedPanel: true, panel: { background: '#00141f' }, dock: { background: '#00141f' } } },
    build: () => ({
      scene: scene({
        background: { type: 'gradient', color1: '#00283d', color2: '#000a12', angle: 180 },
        fog: { enabled: true, color: '#001a2c', density: 0.06 },
        particles: { style: 'bubbles', count: 650, color: '#9be7ff', size: 0.07, speed: 0.5 },
        light: { ambient: 0.5, color: '#bdf3ff', intensity: 1.8, rim: '#00c2d1' },
        sound: 'ocean',
      }),
      camera: camera({ mode: 'orbit', strength: 0.7, smoothing: 0.03 }),
      objects: [
        obj('dodecahedron', { name: 'Reef stone', color: '#00c2d1', material: 'holo', position: { x: -3, y: -0.5, z: -1 }, scale: 1.1 }),
        obj('knot', { name: 'Kelp knot', color: '#2bd9a7', material: 'glass', position: { x: 3.5, y: 0.8, z: -2 }, scale: 0.8 }),
        obj('sphere', { name: 'Jelly', color: '#c084fc', material: 'glass', glow: 0.4, position: { x: 1, y: 2.6, z: -4 }, scale: 0.6, float: { enabled: true, amount: 0.5, speed: 0.3 } }),
      ],
      widgets: [
        wid('clock', { x: 5, y: 8, settings: { analog: true }, w: 220, h: 220 }),
        wid('worldclock', { x: 76, y: 8 }),
        wid('dock', { x: 35, y: 86 }),
      ],
      theme: theme({ accent: '#00c2d1', widgetBg: '#00141f', cardStyle: 'frosted' }),
    }),
  },

  'Forest Mist': {
    tagline: 'Fireflies and crickets in a green haze',
    swatch: ['#0c1a12', '#2f5d43', '#d9f99d'],
    taskbar: { layout: 'side', look: { isDark: true, panel: { background: '#0b1a10', opacity: 0.7 }, dock: { background: '#0b1a10', opacity: 0.6 } } },
    build: () => ({
      scene: scene({
        background: { type: 'gradient', color1: '#14281c', color2: '#050b07', angle: 175 },
        fog: { enabled: true, color: '#0c1a12', density: 0.07 },
        particles: { style: 'fireflies', count: 240, color: '#e6ff8a', size: 0.1, speed: 0.25 },
        light: { ambient: 0.4, color: '#e9ffe0', intensity: 1.6, rim: '#9be36d' }, overlay: { vignette: 0.55, grain: 0.04 },
        sound: 'night',
      }),
      camera: camera({ strength: 0.9, drift: true }),
      objects: [
        obj('cone', { name: 'Pine', color: '#2f5d43', material: 'toon', position: { x: 3.8, y: -1, z: -1 }, scale: 1.4, spin: { enabled: false }, float: { enabled: false } }),
        obj('cone', { name: 'Far pine', color: '#1f4030', material: 'toon', position: { x: 5.4, y: -1.4, z: -4 }, scale: 1.8, spin: { enabled: false }, float: { enabled: false } }),
        obj('sphere', { name: 'Lantern', color: '#e6ff8a', material: 'emissive', glow: 0.8, position: { x: 2.2, y: 1.4, z: -2 }, scale: 0.3 }),
      ],
      widgets: [
        wid('greeting', { x: 8, y: 10, card: false }),
        wid('timer', { x: 8, y: 28 }),
        wid('notes', { x: 74, y: 52 }),
        wid('moon', { x: 78, y: 10, w: 180, h: 200 }),
      ],
      theme: theme({ accent: '#c6f36d', font: 'rounded', widgetBg: '#0b1a10', widgetOpacity: 0.45 }),
    }),
  },

  'Rainy Window': {
    tagline: 'Rain on glass, lo-fi and a cup of focus',
    swatch: ['#0d1624', '#26364d', '#8fb3ff'],
    taskbar: { layout: 'mac', look: { isDark: true, frostedPanel: true, frostedWindows: true, panel: { background: '#0d1624', opacity: 0.55 }, dock: { background: '#0d1624', opacity: 0.5 } } },
    build: () => ({
      scene: scene({
        background: { type: 'gradient', color1: '#1a2638', color2: '#070b12', angle: 170 },
        fog: { enabled: true, color: '#0d1624', density: 0.05 },
        particles: { style: 'rain', count: 1600, color: '#a9c4ff', size: 0.03, speed: 1.1 },
        light: { ambient: 0.45, color: '#cfe0ff', intensity: 1.6, rim: '#8fb3ff' }, overlay: { vignette: 0.5, grain: 0.07 },
        sound: 'rain',
      }),
      camera: camera({ strength: 0.7, smoothing: 0.03, drift: true }),
      objects: [
        obj('capsule', { name: 'Raindrop', color: '#b8ceff', material: 'glass', position: { x: 3.4, y: 0.2, z: -2 }, scale: 0.55, rotation: { x: 0, y: 0, z: 0 }, spin: { enabled: true, x: 0, y: 0.2, z: 0 } }),
        obj('sphere', { name: 'Streetlight', color: '#ffcf8a', material: 'emissive', glow: 1, position: { x: -4.5, y: 2.6, z: -6 }, scale: 0.5, spin: { enabled: false } }),
      ],
      widgets: [
        wid('clock', { x: 6, y: 10, card: false, settings: { size: 104 } }),
        wid('date', { x: 6, y: 28, card: false }),
        wid('timer', { x: 6, y: 50 }),
        wid('nowplaying', { x: 74, y: 10 }),
        wid('todo', { x: 76, y: 36 }),
      ],
      theme: theme({ accent: '#8fb3ff', font: 'sans', cardStyle: 'liquid', widgetBg: '#0d1624', widgetOpacity: 0.4 }),
    }),
  },

  'Cyber HUD': {
    tagline: 'Hologram core, data hum and outlines',
    swatch: ['#010409', '#00ffd0', '#ff2e63'],
    taskbar: { layout: 'classic', look: { isDark: true, frostedPanel: false, panel: { background: '#010409', opacity: 0.92, radius: 0 } } },
    build: () => ({
      scene: scene({
        background: { type: 'gradient', color1: '#021018', color2: '#010409', angle: 200 },
        fog: { enabled: true, color: '#010409', density: 0.04 },
        particles: { style: 'rain', count: 1400, color: '#00ffd0', size: 0.03, speed: 1.2 },
        floor: { enabled: true, color: '#00ffd0' }, light: { ambient: 0.3, rim: '#ff2e63' }, overlay: { vignette: 0.5, grain: 0.06 },
        sound: 'cyber',
      }),
      camera: camera({ strength: 1.2, fov: 60 }),
      objects: [
        obj('icosahedron', { name: 'Core', color: '#00ffd0', material: 'holo', position: { x: 0, y: 0.6, z: -3 }, scale: 1.8, interact: { lookAtMouse: false, hover: 'spin', dragRotate: true } }),
        obj('ring', { name: 'Orbit', color: '#ff2e63', material: 'emissive', glow: 1, position: { x: 0, y: 0.6, z: -3 }, scale: 2.4, spin: { enabled: true, x: 0.4, y: 0.2, z: 0 } }),
        obj('ring', { name: 'Outer orbit', color: '#00ffd0', material: 'wireframe', position: { x: 0, y: 0.6, z: -3 }, scale: 3.1, spin: { enabled: true, x: -0.2, y: 0.3, z: 0.1 } }),
      ],
      widgets: [
        wid('clock', { x: 4, y: 6, settings: { seconds: true } }),
        wid('system', { x: 4, y: 26, settings: { network: true } }),
        wid('graph', { x: 77, y: 6, settings: { metric: 'network' } }),
        wid('graph', { x: 77, y: 24, settings: { metric: 'cpu' } }),
        wid('search', { x: 36, y: 78 }),
      ],
      theme: theme({ accent: '#00ffd0', font: 'mono', cardStyle: 'outline', glow: true, widgetBg: '#00141a', radius: 6 }),
    }),
  },

  'Cozy Night': {
    tagline: 'Crackling fire, lamp glow, crescent moon',
    swatch: ['#1b120c', '#5a3417', '#ffb86b'],
    taskbar: { layout: 'mac', look: { isDark: true, frostedPanel: true, panel: { background: '#1d140e', opacity: 0.7 }, dock: { background: '#1d140e', opacity: 0.65 } } },
    build: () => ({
      scene: scene({
        background: { type: 'mesh', color1: '#140c08', color2: '#3b2010', color3: '#1c1530', speed: 0.3 },
        fog: { enabled: false }, particles: { style: 'fireflies', count: 140, color: '#ffcf8a', size: 0.08, speed: 0.15 },
        light: { ambient: 0.5, color: '#ffd9a8', intensity: 2, rim: '#ff8a3d' }, overlay: { vignette: 0.55, grain: 0.05 },
        sound: 'fire',
      }),
      camera: camera({ strength: 0.7, smoothing: 0.03, drift: false }),
      objects: [
        obj('capsule', { name: 'Lamp', color: '#ffb86b', material: 'emissive', glow: 0.9, position: { x: 2.4, y: -1.2, z: -2 }, scale: 0.8, spin: { enabled: false } }),
        obj('sphere', { name: 'Ember', color: '#ff7a3d', material: 'emissive', glow: 1, position: { x: 3.4, y: -2.2, z: -1.5 }, scale: 0.18, float: { enabled: true, amount: 0.4, speed: 0.4 } }),
      ],
      widgets: [
        wid('clock', { x: 6, y: 10, card: false, settings: { format: '12', size: 96 } }),
        wid('moon', { x: 76, y: 8 }),
        wid('nowplaying', { x: 6, y: 70 }),
        wid('notes', { x: 76, y: 46 }),
      ],
      theme: theme({ accent: '#ffb86b', font: 'serif', widgetBg: '#1d140e', widgetOpacity: 0.6 }),
    }),
  },

  'Galaxy': {
    tagline: 'Deep space, slow drones, orbiting gems',
    swatch: ['#02010a', '#1a0b3d', '#a78bfa'],
    taskbar: { layout: 'zen', look: { isDark: true, frostedPanel: true, panel: { background: '#0b0720' }, dock: { background: '#0b0720' } } },
    build: () => ({
      scene: scene({
        background: { type: 'aurora', color1: '#02010a', color2: '#4c1d95', color3: '#0e7490', speed: 0.4 },
        fog: { enabled: false }, particles: { style: 'stars', count: 2200, color: '#ffffff', size: 0.04, speed: 0.05 },
        light: { ambient: 0.35, color: '#ffffff', intensity: 2.4, rim: '#a78bfa' }, overlay: { vignette: 0.6 },
        sound: 'space',
      }),
      camera: camera({ mode: 'orbit', strength: 1, smoothing: 0.04, distance: 11 }),
      objects: [
        obj('sphere', { name: 'Planet', color: '#a78bfa', material: 'metal', position: { x: 0, y: 0, z: -2 }, scale: 1.8, spin: { enabled: true, x: 0, y: 0.08, z: 0 } }),
        obj('ring', { name: 'Rings', color: '#fcd34d', material: 'emissive', glow: 0.5, position: { x: 0, y: 0, z: -2 }, rotation: { x: 70, y: 0, z: 0 }, scale: 2.4, spin: { enabled: false }, float: { enabled: false } }),
        obj('octahedron', { name: 'Moonlet', color: '#67e8f9', material: 'glass', position: { x: 4, y: 2, z: -1 }, scale: 0.4 }),
        obj('sphere', { name: 'Distant star', color: '#fde68a', material: 'emissive', glow: 1.2, position: { x: -6, y: 3, z: -8 }, scale: 0.3, spin: { enabled: false } }),
      ],
      widgets: [
        wid('clock', { x: 5, y: 8, card: false, settings: { size: 110 } }),
        wid('date', { x: 5, y: 26, card: false }),
        wid('dock', { x: 35, y: 86 }),
      ],
      theme: theme({ accent: '#a78bfa', font: 'thin', cardStyle: 'liquid', widgetBg: '#0b0720' }),
    }),
  },

  'Zen Garden': {
    tagline: 'Stones, sage and wind chimes',
    swatch: ['#e7ece4', '#b9c8b4', '#55705f'],
    taskbar: { layout: 'islands', look: { isDark: false, frostedPanel: true, panel: { background: 'Light', opacity: 0.55 }, dock: { background: 'Light', opacity: 0.55 } } },
    build: () => ({
      scene: scene({
        background: { type: 'mesh', color1: '#eef1ea', color2: '#c9d6c3', color3: '#e9e1d2', speed: 0.25 },
        fog: { enabled: false }, particles: { style: 'dust', count: 160, color: '#7c9585', size: 0.05, speed: 0.08 },
        light: { ambient: 0.9, color: '#ffffff', intensity: 1.5, rim: '#d8e6d0' }, overlay: { vignette: 0.05, grain: 0.04 },
        sound: 'chimes',
      }),
      camera: camera({ strength: 0.5, smoothing: 0.03, fov: 45, drift: false }),
      objects: [
        obj('sphere', { name: 'Stone', color: '#55705f', material: 'toon', position: { x: 3, y: -1.2, z: 0 }, scale: 1, spin: { enabled: false } }),
        obj('sphere', { name: 'Small stone', color: '#7f9a88', material: 'toon', position: { x: 4.4, y: -1.6, z: 0.4 }, scale: 0.55, spin: { enabled: false } }),
        obj('sphere', { name: 'Pebble', color: '#a8b8a0', material: 'toon', position: { x: 5.2, y: -1.8, z: 0.8 }, scale: 0.3, spin: { enabled: false } }),
        obj('ring', { name: 'Enso', color: '#2f3b33', material: 'standard', position: { x: 3.8, y: 1.6, z: -2 }, scale: 1.4, spin: { enabled: false }, float: { enabled: true, amount: 0.08, speed: 0.3 } }),
      ],
      widgets: [
        wid('clock', { x: 7, y: 14, card: false, settings: { size: 120 } }),
        wid('date', { x: 7, y: 34, card: false }),
        wid('timer', { x: 7, y: 54 }),
      ],
      theme: theme({ text: '#22302a', widgetBg: '#ffffff', widgetOpacity: 0.55, accent: '#55705f', font: 'thin', cardStyle: 'frosted', textShadow: false, shadow: false }),
    }),
  },

  'Minimal Mono': {
    tagline: 'Quiet greys, no clutter, hidden taskbar',
    swatch: ['#111214', '#2a2c31', '#e5e7eb'],
    taskbar: { layout: 'zen', look: { isDark: true, frostedPanel: false, panel: { background: 'Dark' }, dock: { background: 'Dark' } } },
    build: () => ({
      scene: scene({
        background: { type: 'gradient', color1: '#1b1c20', color2: '#0c0d0f', angle: 160 },
        fog: { enabled: false }, particles: { enabled: false }, overlay: { vignette: 0.25, grain: 0.05 },
        light: { ambient: 0.6, rim: '#9ca3af' },
      }),
      camera: camera({ strength: 0.5, drift: false }),
      objects: [obj('sphere', { name: 'Orb', color: '#e5e7eb', material: 'metal', position: { x: 3.6, y: 0, z: -1 }, scale: 1.3, spin: { enabled: false } })],
      widgets: [
        wid('clock', { x: 6, y: 32, w: 560, h: 200, card: false, settings: { size: 150 } }),
        wid('date', { x: 6, y: 56, card: false }),
      ],
      theme: theme({ accent: '#e5e7eb', font: 'thin', cardStyle: 'clear', tilt: false }),
    }),
  },

  'Calm Paper': {
    tagline: 'Light, airy and easy on the eyes',
    swatch: ['#f4efe6', '#dfe8e4', '#c8775a'],
    taskbar: { layout: 'cosmic', look: { isDark: false, frostedPanel: false, panel: { background: 'Light', opacity: 0.9 }, dock: { background: 'Light', opacity: 0.85, floating: true, radius: 16, margin: 6 } } },
    build: () => ({
      scene: scene({
        background: { type: 'gradient', color1: '#f4efe6', color2: '#dfe8e4', angle: 140 },
        fog: { enabled: false }, particles: { count: 180, color: '#93a69c', size: 0.06, speed: 0.1 },
        light: { ambient: 0.8, intensity: 1.6, rim: '#ffd9b0' }, overlay: { vignette: 0, grain: 0.04 },
        sound: 'wind',
      }),
      camera: camera({ strength: 0.6, smoothing: 0.04, fov: 45, drift: false }),
      objects: [
        obj('sphere', { name: 'Pebble', color: '#c8775a', material: 'toon', position: { x: 3, y: -0.8, z: 0 }, scale: 1.3, spin: { enabled: false } }),
        obj('dodecahedron', { name: 'Gem', color: '#5d8b7a', material: 'standard', position: { x: 4.6, y: 1.8, z: -2 }, scale: 0.6 }),
      ],
      widgets: [
        wid('clock', { x: 6, y: 12, card: false, settings: { format: '12' } }),
        wid('date', { x: 6, y: 30, card: false }),
        wid('notes', { x: 6, y: 48 }),
        wid('calendar', { x: 74, y: 8 }),
      ],
      theme: theme({ text: '#1f2a26', widgetBg: '#ffffff', widgetOpacity: 0.65, accent: '#c8775a', font: 'serif', textShadow: false }),
    }),
  },

  'Blank': {
    tagline: 'Start from nothing',
    swatch: ['#111418', '#1c2027', '#ff9e3d'],
    build: () => ({
      scene: scene({ background: { type: 'color', color1: '#111418' }, fog: { enabled: false }, particles: { enabled: false }, overlay: { vignette: 0, grain: 0 } }),
      camera: camera({ drift: false }),
      objects: [], widgets: [], theme: theme({}),
    }),
  },
};
