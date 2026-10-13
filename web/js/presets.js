// Five ready-made looks. Each one sets the scene, camera, 3D objects, widgets and card style, a
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
const still = { spin: { enabled: false }, float: { enabled: false }, interact: { hover: 'none', dragRotate: false } };

export const PRESETS = {
  'Golden Meadow': {
    tagline: 'Sunflowers to the horizon, swaying in a warm breeze',
    swatch: ['#6aa7de', '#f6d9a8', '#f7c51e'],
    sky: { id: 'kloofendal_48d_partly_cloudy_puresky', name: 'Kloofendal Partly Cloudy Sky', look: { blur: 0, brightness: 1.05, lighting: 1, rotation: 120 } },
    taskbar: { layout: 'islands', look: { isDark: false, frostedPanel: true, panel: { background: 'Light', opacity: 0.5 }, dock: { background: 'Light', opacity: 0.5 } } },
    build: () => ({
      scene: scene({
        background: { type: 'gradient', color1: '#5b9ad8', color2: '#f8dcae', angle: 180 },
        fog: { enabled: true, color: '#f1dcc0', density: 0.016 },
        particles: { style: 'dust', count: 320, color: '#ffe58a', size: 0.04, speed: 0.12 },
        light: { ambient: 0.75, color: '#fff0d2', intensity: 2.7, rim: '#ffcf7a' }, overlay: { vignette: 0.14, grain: 0.025 },
        field: { type: 'sunflowers', count: 1900, wind: 1, ground: '#4c5e22' },
        sound: 'forest',
      }),
      camera: camera({ strength: 0.8, smoothing: 0.03, fov: 55, distance: 9 }),
      objects: [
        obj('sphere', { name: 'Sun', color: '#fff1c9', material: 'emissive', glow: 1.3, position: { x: 3.6, y: 2.4, z: -18 }, scale: 1.5, ...still }),
      ],
      widgets: [
        wid('clock', { x: 5, y: 8, card: false, depth: 0.6, settings: { size: 112 }, w: 440, h: 170 }),
        wid('date', { x: 5.3, y: 27, card: false, depth: 0.5 }),
        wid('nowplaying', { x: 74, y: 8, depth: 0.35 }),
      ],
      theme: theme({ cardStyle: 'liquid', font: 'rounded', widgetBg: '#2d3a16', widgetOpacity: 0.35, text: '#ffffff', accent: '#ffd23a', widgetMotion: '3d' }),
    }),
  },

  'Northern Lights': {
    tagline: 'Aurora over snowy peaks, falling snow, liquid glass',
    swatch: ['#03141c', '#1de9b6', '#7c4dff'],
    taskbar: { layout: 'mac', look: { isDark: true, frostedPanel: true, panel: { background: '#06202a', opacity: 0.5 }, dock: { background: '#06202a', opacity: 0.45 } } },
    build: () => ({
      scene: scene({
        background: { type: 'aurora', color1: '#020b12', color2: '#1de9b6', color3: '#7c4dff', speed: 0.7 },
        fog: { enabled: true, color: '#04141c', density: 0.03 },
        particles: { style: 'snow', count: 900, color: '#e8fbff', size: 0.055, speed: 0.32 },
        light: { ambient: 0.55, color: '#dff6ff', intensity: 1.8, rim: '#1de9b6' }, overlay: { vignette: 0.5, grain: 0.03 },
        sound: 'wind',
      }),
      camera: camera({ strength: 0.8, smoothing: 0.035, fov: 50 }),
      objects: [
        obj('sphere', { name: 'Moon', color: '#e6f7ff', material: 'emissive', glow: 0.7, position: { x: 5.6, y: 3.1, z: -8 }, scale: 0.6, ...still }),
        obj('cone', { name: 'Peak', color: '#0e2a36', material: 'standard', position: { x: -4.2, y: -3.1, z: -3 }, scale: 2.3, ...still }),
        obj('cone', { name: 'Far peak', color: '#0b2230', material: 'standard', position: { x: -1.2, y: -3.6, z: -6 }, scale: 2, ...still }),
        obj('cone', { name: 'Right peak', color: '#0c2532', material: 'standard', position: { x: 5.6, y: -3.4, z: -5 }, scale: 2.1, ...still }),
      ],
      widgets: [
        wid('clock', { x: 36, y: 22, w: 480, h: 190, card: false, depth: 0.7, settings: { size: 132 } }),
        wid('date', { x: 40.5, y: 44, card: false, depth: 0.6 }),
        wid('worldclock', { x: 77, y: 8, depth: 0.3 }),
      ],
      theme: theme({ cardStyle: 'liquid', accent: '#1de9b6', font: 'thin', widgetBg: '#06202a', widgetOpacity: 0.35, widgetMotion: '3d' }),
    }),
  },

  'Neon Nights': {
    tagline: 'A synthwave sun, a glowing grid and neon edges',
    swatch: ['#05010d', '#ff4fd8', '#2ef2ff'],
    taskbar: { layout: 'centered', look: { isDark: true, panel: { background: '#12021f', opacity: 0.85, radius: 0 } } },
    build: () => ({
      scene: scene({
        background: { type: 'gradient', color1: '#05010d', color2: '#2a0845', angle: 180 },
        fog: { enabled: true, color: '#12021f', density: 0.025 },
        particles: { style: 'stars', count: 600, color: '#ff8be8', size: 0.05, speed: 0.4 },
        floor: { enabled: true, color: '#ff4fd8' }, light: { ambient: 0.3, color: '#ff9cf0', intensity: 2, rim: '#2ef2ff' },
        overlay: { vignette: 0.5, grain: 0.06 },
        sound: 'cyber',
      }),
      camera: camera({ strength: 1.3, smoothing: 0.05, fov: 55, distance: 10 }),
      objects: [
        obj('sphere', { name: 'Sun', color: '#ff5c7a', material: 'emissive', glow: 0.55, position: { x: 0.6, y: 0.2, z: -12 }, scale: 2.6, ...still }),
        obj('ring', { name: 'Sun halo', color: '#ff4fd8', material: 'emissive', glow: 1.2, position: { x: 0.6, y: 0.2, z: -11.5 }, scale: 3.4, spin: { enabled: true, x: 0, y: 0, z: 0.15 }, float: { enabled: false } }),
        obj('cube', { name: 'Neon cube', color: '#2ef2ff', material: 'wireframe', position: { x: 3.6, y: -0.6, z: 0 }, scale: 1.1 }),
        obj('octahedron', { name: 'Neon gem', color: '#ff4fd8', material: 'wireframe', position: { x: -3.8, y: 0.4, z: -1 }, scale: 0.8 }),
      ],
      widgets: [
        wid('clock', { x: 40, y: 7, depth: 0.7, settings: { seconds: true } }),
        wid('apps', { x: 3, y: 22, depth: 0.25 }),
        wid('nowplaying', { x: 74, y: 56, depth: 0.4 }),
        wid('graph', { x: 76, y: 76, depth: 0.4, settings: { metric: 'cpu' } }),
      ],
      theme: theme({ accent: '#ff4fd8', font: 'mono', glow: true, cardStyle: 'neon', radius: 6, widgetMotion: '3d' }),
    }),
  },

  'Deep Space': {
    tagline: 'A ringed planet, drifting stars and a slow space hum',
    swatch: ['#02010a', '#1a0b3d', '#a78bfa'],
    taskbar: { layout: 'zen', look: { isDark: true, frostedPanel: true, panel: { background: '#0b0720' }, dock: { background: '#0b0720' } } },
    build: () => ({
      scene: scene({
        background: { type: 'aurora', color1: '#02010a', color2: '#4c1d95', color3: '#0e7490', speed: 0.35 },
        fog: { enabled: false }, particles: { style: 'stars', count: 2400, color: '#ffffff', size: 0.04, speed: 0.05 },
        light: { ambient: 0.3, color: '#ffffff', intensity: 2.6, rim: '#a78bfa' }, overlay: { vignette: 0.6, grain: 0.03 },
        sound: 'space',
      }),
      camera: camera({ mode: 'orbit', strength: 1, smoothing: 0.035, distance: 11 }),
      objects: [
        obj('sphere', { name: 'Planet', color: '#a78bfa', material: 'metal', position: { x: 1.2, y: 0, z: -2 }, scale: 1.9, spin: { enabled: true, x: 0, y: 0.08, z: 0 }, float: { enabled: false } }),
        obj('ring', { name: 'Rings', color: '#fcd34d', material: 'emissive', glow: 0.5, position: { x: 1.2, y: 0, z: -2 }, rotation: { x: 72, y: 0, z: 12 }, scale: 2.6, ...still }),
        obj('octahedron', { name: 'Moonlet', color: '#67e8f9', material: 'glass', position: { x: 5, y: 2.1, z: -1 }, scale: 0.4 }),
        obj('sphere', { name: 'Distant star', color: '#fde68a', material: 'emissive', glow: 1.2, position: { x: -6, y: 3, z: -8 }, scale: 0.3, ...still }),
      ],
      widgets: [
        wid('clock', { x: 5, y: 8, card: false, settings: { size: 110 }, w: 440, h: 170 }),
        wid('date', { x: 5.3, y: 26, card: false }),
        wid('dock', { x: 35, y: 86 }),
      ],
      theme: theme({ accent: '#a78bfa', font: 'thin', cardStyle: 'liquid', widgetBg: '#0b0720', widgetMotion: '3d' }),
    }),
  },

  'Zen Garden': {
    tagline: 'Smooth stones, soft sage light and wind chimes',
    swatch: ['#e7ece4', '#b9c8b4', '#55705f'],
    taskbar: { layout: 'islands', look: { isDark: false, frostedPanel: true, panel: { background: 'Light', opacity: 0.55 }, dock: { background: 'Light', opacity: 0.55 } } },
    build: () => ({
      scene: scene({
        background: { type: 'mesh', color1: '#eef1ea', color2: '#c9d6c3', color3: '#ece3d3', speed: 0.25 },
        fog: { enabled: false }, particles: { style: 'dust', count: 160, color: '#7c9585', size: 0.05, speed: 0.08 },
        light: { ambient: 0.9, color: '#ffffff', intensity: 1.6, rim: '#d8e6d0' }, overlay: { vignette: 0.06, grain: 0.04 },
        sound: 'chimes',
      }),
      camera: camera({ strength: 0.5, smoothing: 0.03, fov: 45, drift: false }),
      objects: [
        obj('sphere', { name: 'Stone', color: '#55705f', material: 'toon', position: { x: 3, y: -1.2, z: 0 }, scale: 1, ...still }),
        obj('sphere', { name: 'Small stone', color: '#7f9a88', material: 'toon', position: { x: 4.4, y: -1.6, z: 0.4 }, scale: 0.55, ...still }),
        obj('sphere', { name: 'Pebble', color: '#a8b8a0', material: 'toon', position: { x: 5.2, y: -1.8, z: 0.8 }, scale: 0.3, ...still }),
        obj('ring', { name: 'Enso', color: '#4a5a50', material: 'standard', position: { x: 4.6, y: 1.9, z: -4 }, scale: 1, spin: { enabled: false }, float: { enabled: true, amount: 0.08, speed: 0.3 } }),
      ],
      widgets: [
        wid('clock', { x: 7, y: 14, card: false, settings: { size: 120 }, w: 460, h: 180 }),
        wid('date', { x: 7.3, y: 34, card: false }),
        wid('timer', { x: 7, y: 54 }),
      ],
      theme: theme({ text: '#22302a', widgetBg: '#ffffff', widgetOpacity: 0.55, accent: '#55705f', font: 'thin', cardStyle: 'frosted', textShadow: false, shadow: false }),
    }),
  },
};
