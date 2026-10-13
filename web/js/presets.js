// Eight ready-made looks. Each one sets the scene, camera, 3D objects, widgets and card style, a
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
  'Lavender Dusk': {
    tagline: 'Rows of lavender under a peach and violet sunset',
    swatch: ['#5b4a9e', '#f4a6a0', '#b08ae8'],
    taskbar: { layout: 'islands', look: { isDark: true, frostedPanel: true, panel: { background: '#2b2147', opacity: 0.45 }, dock: { background: '#2b2147', opacity: 0.45 } } },
    build: () => ({
      scene: scene({
        background: { type: 'gradient', color1: '#3d3478', color2: '#f7b39a', angle: 180 },
        fog: { enabled: true, color: '#e6a3a6', density: 0.022 },
        particles: { style: 'fireflies', count: 140, color: '#ffd59e', size: 0.06, speed: 0.25 },
        light: { ambient: 0.7, color: '#ffc9a8', intensity: 2.2, rim: '#c59cff' }, overlay: { vignette: 0.3, grain: 0.03 },
        field: { type: 'lavender', count: 3400, wind: 0.8, ground: '#6b5a78' },
        sound: 'night',
      }),
      camera: camera({ strength: 0.7, smoothing: 0.03, fov: 52, distance: 9 }),
      objects: [
        obj('sphere', { name: 'Setting sun', color: '#ffd1a1', material: 'emissive', glow: 1.1, position: { x: -3.8, y: 0.1, z: -24 }, scale: 2.4, ...still }),
      ],
      widgets: [
        wid('clock', { x: 6, y: 9, card: false, depth: 0.6, settings: { size: 118 }, w: 460, h: 175 }),
        wid('date', { x: 6.3, y: 29, card: false, depth: 0.5 }),
        wid('quote', { x: 66, y: 9, depth: 0.35 }),
      ],
      theme: theme({ cardStyle: 'frosted', font: 'serif', widgetBg: '#2b2147', widgetOpacity: 0.35, text: '#fff7f0', accent: '#ffb48a', widgetMotion: '3d' }),
    }),
  },

  'Sea Breeze': {
    tagline: 'A pastel ocean, a little lighthouse and rolling waves',
    swatch: ['#8ecae6', '#ffe5d0', '#2a7fa6'],
    taskbar: { layout: 'mac', look: { isDark: false, frostedPanel: true, panel: { background: 'Light', opacity: 0.5 }, dock: { background: 'Light', opacity: 0.5 } } },
    build: () => ({
      scene: scene({
        background: { type: 'gradient', color1: '#7fbde4', color2: '#ffe3d3', angle: 180 },
        fog: { enabled: true, color: '#f4dcd2', density: 0.018 },
        particles: { style: 'dust', count: 120, color: '#ffffff', size: 0.05, speed: 0.1 },
        light: { ambient: 0.85, color: '#fff3e2', intensity: 2.4, rim: '#bfe6ff' }, overlay: { vignette: 0.12, grain: 0.02 },
        field: { type: 'water', wind: 1, ground: '#3b8fb3' },
        sound: 'ocean',
      }),
      camera: camera({ strength: 0.7, smoothing: 0.03, fov: 50, distance: 9 }),
      objects: [
        obj('rock', { name: 'Island', color: '#8a7f72', material: 'standard', position: { x: 3.8, y: -2.5, z: -6 }, scale: 1.6, ...still }),
        obj('cylinder', { name: 'Lighthouse', color: '#fbf6ee', material: 'standard', position: { x: 3.6, y: -0.6, z: -6 }, rotation: { x: 0, y: 0, z: 0 }, scale: 0.75, ...still }),
        obj('sphere', { name: 'Lamp', color: '#fff2b0', material: 'emissive', glow: 1.4, position: { x: 3.6, y: 0.33, z: -6 }, scale: 0.24, ...still }),
        obj('cone', { name: 'Lighthouse roof', color: '#e05a4f', material: 'standard', position: { x: 3.6, y: 0.86, z: -6 }, rotation: { x: 0, y: 45, z: 0 }, scale: 0.5, ...still }),
        obj('sphere', { name: 'Sun', color: '#fff4dc', material: 'emissive', glow: 1, position: { x: -5, y: 3.4, z: -22 }, scale: 1.3, ...still }),
      ],
      widgets: [
        wid('clock', { x: 6, y: 10, card: false, depth: 0.6, settings: { size: 112 }, w: 440, h: 170 }),
        wid('date', { x: 6.3, y: 29, card: false, depth: 0.5 }),
        wid('dock', { x: 31, y: 86, depth: 0.3 }),
      ],
      theme: theme({ cardStyle: 'liquid', font: 'rounded', widgetBg: '#1f5f7d', widgetOpacity: 0.3, text: '#ffffff', accent: '#ff8a7a', widgetMotion: '3d' }),
    }),
  },

  'Winter Pines': {
    tagline: 'A snowy pine forest, soft blue light and drifting snow',
    swatch: ['#a9bcd0', '#eef3f8', '#2f5a3e'],
    taskbar: { layout: 'cosmic', look: { isDark: false, frostedPanel: true, panel: { background: 'Light', opacity: 0.6 }, dock: { background: 'Light', opacity: 0.6 } } },
    build: () => ({
      scene: scene({
        background: { type: 'gradient', color1: '#93abc6', color2: '#eef2f6', angle: 180 },
        fog: { enabled: true, color: '#dfe7ef', density: 0.035 },
        particles: { style: 'snow', count: 1100, color: '#ffffff', size: 0.06, speed: 0.35 },
        light: { ambient: 1, color: '#eaf2ff', intensity: 1.8, rim: '#ffffff' }, overlay: { vignette: 0.18, grain: 0.03 },
        field: { type: 'pines', count: 900, wind: 0.3, ground: '#f2f5f8' },
        sound: 'wind',
      }),
      camera: camera({ strength: 0.6, smoothing: 0.03, fov: 50, distance: 9 }),
      objects: [
        obj('sphere', { name: 'Pale sun', color: '#fffaf0', material: 'emissive', glow: 0.7, position: { x: 4.5, y: 3, z: -20 }, scale: 1.1, ...still }),
      ],
      widgets: [
        wid('clock', { x: 36, y: 14, w: 480, h: 190, card: false, depth: 0.7, settings: { size: 132 } }),
        wid('date', { x: 40.5, y: 36, card: false, depth: 0.6 }),
        wid('calendar', { x: 77, y: 8, depth: 0.35 }),
      ],
      theme: theme({ cardStyle: 'frosted', font: 'thin', widgetBg: '#ffffff', widgetOpacity: 0.45, text: '#1d2b38', accent: '#2f6b8f', textShadow: false, widgetMotion: '3d' }),
    }),
  },

  'Blossom Park': {
    tagline: 'Cherry trees in bloom with petals drifting by',
    swatch: ['#fde2ec', '#f6a5c0', '#7fb069'],
    taskbar: { layout: 'islands', look: { isDark: false, frostedPanel: true, panel: { background: 'Light', opacity: 0.55 }, dock: { background: 'Light', opacity: 0.55 } } },
    build: () => ({
      scene: scene({
        background: { type: 'mesh', color1: '#cfe7fb', color2: '#fde2ec', color3: '#fff4e6', speed: 0.3 },
        fog: { enabled: true, color: '#fbe6ee', density: 0.02 },
        particles: { style: 'petals', count: 260, color: '#f7a8c4', size: 0.07, speed: 0.4 },
        light: { ambient: 0.95, color: '#fff6f0', intensity: 2, rim: '#ffd3e2' }, overlay: { vignette: 0.1, grain: 0.02 },
        field: { type: 'grass', count: 1500, wind: 0.7, ground: '#7aa15a' },
        sound: 'forest',
      }),
      camera: camera({ strength: 0.7, smoothing: 0.03, fov: 50, distance: 9 }),
      objects: [
        obj('tree', { name: 'Cherry tree', color: '#f7b2c8', material: 'standard', position: { x: 4.4, y: -1.2, z: -3 }, scale: 1.7, ...still }),
        obj('tree', { name: 'Far cherry tree', color: '#f4a0bd', material: 'standard', position: { x: -5.6, y: -1.3, z: -6 }, scale: 1.5, ...still }),
        obj('tree', { name: 'Distant tree', color: '#fbc6d6', material: 'standard', position: { x: 0.8, y: -1.4, z: -14 }, scale: 1.3, ...still }),
      ],
      widgets: [
        wid('greeting', { x: 6, y: 9, card: false, depth: 0.6 }),
        wid('clock', { x: 6, y: 19, card: false, depth: 0.55, settings: { size: 96 }, w: 400, h: 150 }),
        wid('todo', { x: 76, y: 8, depth: 0.35 }),
      ],
      theme: theme({ cardStyle: 'frosted', font: 'rounded', widgetBg: '#ffffff', widgetOpacity: 0.55, text: '#4a2a3a', accent: '#e0648f', textShadow: false, widgetMotion: '3d' }),
    }),
  },

  'Midnight City': {
    tagline: 'Rain over a city of lit windows, deep blue and magenta',
    swatch: ['#0a0f24', '#3a1d5c', '#ffcc7a'],
    taskbar: { layout: 'classic', look: { isDark: true, panel: { background: '#0b1022', opacity: 0.85 } } },
    build: () => ({
      scene: scene({
        background: { type: 'gradient', color1: '#060a1c', color2: '#4a2063', angle: 180 },
        fog: { enabled: true, color: '#2a1a4a', density: 0.03 },
        particles: { style: 'rain', count: 1400, color: '#a9c4ff', size: 0.05, speed: 1 },
        light: { ambient: 0.35, color: '#9fb4ff', intensity: 1.2, rim: '#ff5fa2' }, overlay: { vignette: 0.45, grain: 0.05 },
        sound: 'rain',
      }),
      camera: camera({ strength: 0.9, smoothing: 0.04, fov: 55, distance: 10 }),
      objects: [
        // a back row of tall towers across the skyline, and closer, darker ones at the sides
        ...[[-15, 3.4], [-11.5, 4.2], [-8, 3], [-4.6, 4.6], [-1.2, 3.6], [2.2, 4.9], [5.6, 3.3], [9, 4.4], [12.5, 3.1], [16, 4]].map(([x, h], i) => obj('tower', {
          name: `Skyline tower ${i + 1}`, color: '#222b48', material: 'standard', position: { x, y: -12 + 1.5 * h, z: -16 }, scale: h, ...still,
        })),
        ...[[-7.4, 2.6], [-4.8, 1.9], [5.2, 2.2], [7.8, 2.9]].map(([x, h], i) => obj('tower', {
          name: `Near tower ${i + 1}`, color: '#151b2e', material: 'standard', position: { x, y: -7.5 + 1.5 * h, z: -5 }, scale: h, rotation: { x: 0, y: 25 * (i % 2 ? 1 : -1), z: 0 }, ...still,
        })),
        obj('sphere', { name: 'Moon', color: '#ffe0f0', material: 'emissive', glow: 1.2, position: { x: -2.6, y: 5.2, z: -24 }, scale: 1.4, ...still }),
      ],
      widgets: [
        wid('clock', { x: 38, y: 8, card: false, depth: 0.7, settings: { size: 104 }, w: 420, h: 160 }),
        wid('nowplaying', { x: 72, y: 74, depth: 0.4 }),
        wid('system', { x: 4, y: 64, depth: 0.35 }),
      ],
      theme: theme({ cardStyle: 'frosted', font: 'sans', widgetBg: '#0b1022', widgetOpacity: 0.5, text: '#f0f3ff', accent: '#ffcc7a', widgetMotion: '3d' }),
    }),
  },

  'Crystal Nebula': {
    tagline: 'Glass crystals floating through a pink and teal nebula',
    swatch: ['#12061f', '#ff7ac6', '#3de0d0'],
    taskbar: { layout: 'zen', look: { isDark: true, frostedPanel: true, panel: { background: '#150a26' }, dock: { background: '#150a26' } } },
    build: () => ({
      scene: scene({
        background: { type: 'mesh', color1: '#12061f', color2: '#6a1f6e', color3: '#0f5c66', speed: 0.4 },
        fog: { enabled: false },
        particles: { style: 'stars', count: 1600, color: '#ffe3f6', size: 0.045, speed: 0.05 },
        light: { ambient: 0.4, color: '#ffd6f0', intensity: 2.6, rim: '#3de0d0' }, overlay: { vignette: 0.55, grain: 0.03 },
        sound: 'space',
      }),
      camera: camera({ mode: 'orbit', strength: 0.9, smoothing: 0.035, distance: 10 }),
      objects: [
        obj('icosahedron', { name: 'Heart crystal', color: '#ff9ad5', material: 'glass', glow: 0.3, position: { x: 2.2, y: 0.2, z: -1 }, scale: 1.5, spin: { enabled: true, x: 0.05, y: 0.18, z: 0 }, float: { enabled: true, amount: 0.2, speed: 0.4 } }),
        obj('octahedron', { name: 'Teal shard', color: '#3de0d0', material: 'glass', glow: 0.4, position: { x: 5.2, y: 1.9, z: -3 }, scale: 0.7, spin: { enabled: true, x: 0.1, y: 0.3, z: 0 } }),
        obj('octahedron', { name: 'Violet shard', color: '#a98bff', material: 'glass', glow: 0.4, position: { x: -1.2, y: -1.8, z: -2 }, scale: 0.55, spin: { enabled: true, x: 0.2, y: 0.25, z: 0 } }),
        obj('dodecahedron', { name: 'Small gem', color: '#ffd38a', material: 'glass', glow: 0.5, position: { x: 4.6, y: -1.7, z: 0 }, scale: 0.38 }),
        obj('ring', { name: 'Orbit', color: '#ff7ac6', material: 'emissive', glow: 0.8, position: { x: 2.2, y: 0.2, z: -1 }, rotation: { x: 68, y: 0, z: -18 }, scale: 2.1, spin: { enabled: true, x: 0, y: 0, z: 0.08 }, float: { enabled: false } }),
      ],
      widgets: [
        wid('clock', { x: 5, y: 8, card: false, settings: { size: 110 }, w: 440, h: 170 }),
        wid('date', { x: 5.3, y: 26, card: false }),
        wid('moon', { x: 6, y: 62 }),
      ],
      theme: theme({ cardStyle: 'liquid', font: 'thin', widgetBg: '#150a26', widgetOpacity: 0.4, accent: '#ff7ac6', widgetMotion: '3d' }),
    }),
  },

  'Desert Dunes': {
    tagline: 'Golden dunes and desert rocks as the first stars come out',
    swatch: ['#1e2a4a', '#f08a4b', '#e3b06f'],
    taskbar: { layout: 'centered', look: { isDark: true, panel: { background: '#2a1c22', opacity: 0.7 } } },
    build: () => ({
      scene: scene({
        background: { type: 'gradient', color1: '#1c2748', color2: '#f39a5c', angle: 180 },
        fog: { enabled: true, color: '#e9936a', density: 0.018 },
        particles: { style: 'stars', count: 500, color: '#fff2dc', size: 0.04, speed: 0.05 },
        light: { ambient: 0.6, color: '#ffb27a', intensity: 2.6, rim: '#7a8cff' }, overlay: { vignette: 0.35, grain: 0.04 },
        field: { type: 'dunes', wind: 1, ground: '#e0a46a' },
        sound: 'wind',
      }),
      camera: camera({ strength: 0.7, smoothing: 0.03, fov: 50, distance: 9 }),
      objects: [
        obj('sphere', { name: 'Moon', color: '#fff0d6', material: 'emissive', glow: 0.8, position: { x: 4.6, y: 3.2, z: -18 }, scale: 0.9, ...still }),
        obj('rock', { name: 'Big rock', color: '#a0573a', material: 'standard', position: { x: -4.6, y: -1.9, z: -4 }, scale: 1.4, ...still }),
        obj('rock', { name: 'Small rock', color: '#b8653f', material: 'standard', position: { x: -2.9, y: -2.3, z: -2.5 }, scale: 0.6, ...still }),
        obj('rock', { name: 'Far mesa', color: '#8f4a34', material: 'standard', position: { x: 5.5, y: -1.4, z: -14 }, scale: 2.8, ...still }),
      ],
      widgets: [
        wid('clock', { x: 36, y: 12, w: 480, h: 190, card: false, depth: 0.7, settings: { size: 128 } }),
        wid('date', { x: 40.5, y: 33, card: false, depth: 0.6 }),
        wid('worldclock', { x: 77, y: 70, depth: 0.3 }),
      ],
      theme: theme({ cardStyle: 'liquid', font: 'display', widgetBg: '#2a1c22', widgetOpacity: 0.35, text: '#fff6ea', accent: '#ffb062', widgetMotion: '3d' }),
    }),
  },

  'Lantern Lake': {
    tagline: 'Paper lanterns drifting over a calm lake at night',
    swatch: ['#0b1026', '#3b2a5a', '#ffb347'],
    taskbar: { layout: 'mac', look: { isDark: true, frostedPanel: true, panel: { background: '#0e1330', opacity: 0.5 }, dock: { background: '#0e1330', opacity: 0.45 } } },
    build: () => {
      const lantern = (name, x, y, z, scale, speed) => obj('lantern', {
        name, color: '#ff9a3c', material: 'emissive', glow: 0.45, position: { x, y, z }, scale: scale * 1.4,
        spin: { enabled: false }, float: { enabled: true, amount: 0.25, speed }, interact: { hover: 'grow', dragRotate: false },
      });
      return {
        scene: scene({
          background: { type: 'gradient', color1: '#070b1f', color2: '#3d2b5c', angle: 180 },
          fog: { enabled: true, color: '#241d45', density: 0.016 },
          particles: { style: 'fireflies', count: 220, color: '#ffc46b', size: 0.06, speed: 0.2 },
          light: { ambient: 0.5, color: '#ffb877', intensity: 2.2, rim: '#8f7bff' }, overlay: { vignette: 0.45, grain: 0.03 },
          field: { type: 'water', wind: 0.45, ground: '#2a3a7a' },
          sound: 'night',
        }),
        camera: camera({ strength: 0.8, smoothing: 0.035, fov: 52, distance: 9 }),
        objects: [
          obj('sphere', { name: 'Moon', color: '#fbf4ff', material: 'emissive', glow: 1.6, position: { x: 1.2, y: 4.2, z: -17 }, scale: 1.1, ...still }),
          lantern('Lantern', 3.4, 0.4, -2, 0.36, 0.35),
          lantern('High lantern', 5.6, 2.3, -5, 0.3, 0.28),
          lantern('Low lantern', 1.4, -1.3, -0.5, 0.26, 0.4),
          lantern('Right lantern', 7.2, 0.2, -7, 0.3, 0.33),
          lantern('Far lantern', -1.8, 1.6, -9, 0.34, 0.3),
          lantern('Distant lantern', -5.8, 0.4, -12, 0.34, 0.25),
          lantern('Faint lantern', 0.6, 3.2, -15, 0.32, 0.32),
          lantern('Tiny lantern', -3.6, 3.6, -18, 0.3, 0.27),
          lantern('Last lantern', 9.5, 3.4, -16, 0.3, 0.3),
        ],
        widgets: [
          wid('clock', { x: 5, y: 9, card: false, depth: 0.6, settings: { size: 112 }, w: 440, h: 170 }),
          wid('date', { x: 5.3, y: 28, card: false, depth: 0.5 }),
          wid('notes', { x: 5, y: 56, depth: 0.35 }),
        ],
        theme: theme({ cardStyle: 'liquid', font: 'serif', widgetBg: '#0e1330', widgetOpacity: 0.45, text: '#fff4e6', accent: '#ffb347', widgetMotion: '3d' }),
      };
    },
  },
};
