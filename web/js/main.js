// Wires the scene, widgets, app drawer and editor together and keeps your setup saved.
import { api, MONITOR, normalizeConfig, STANDALONE } from './config.js';
import { AppDrawer } from './drawer.js';
import { Editor } from './editor.js';
import { SceneView } from './scene.js';
import { SoundEngine } from './sound.js';
import { WidgetLayer } from './widgets.js';

const $ = sel => document.querySelector(sel);
let cfg;
let saveTimer;
const sound = new SoundEngine();

const scene = new SceneView($('#scene'), {
  onSelect: id => { editor.selectObject(id); scene.select(id); widgets.select(null); },
  onObjectMoved: (id, patch) => {
    const o = cfg.objects.find(x => x.id === id);
    if (!o) return;
    Object.assign(o, patch);
    changed();
    editor.render();
  },
  onAction: click => {
    if (click.type === 'app' && click.value) launch(click.value);
    if (click.type === 'url' && /^https?:\/\//i.test(click.value)) window.open(click.value, '_blank', 'noopener');
    if (click.type === 'drawer') drawer.show();
  },
  onPanoramaError: () => toast('Could not load that 360° picture'),
});

const widgets = new WidgetLayer($('#widgets'), {
  onSelect: id => { editor.selectWidget(id); widgets.select(id); scene.select(null); },
  onChange: (id, patch, opts = {}) => {
    const w = cfg.widgets.find(x => x.id === id);
    if (!w) return;
    Object.assign(w, patch);
    if (!opts.silent) widgets.apply(cfg);
    scheduleSave();
    if (!opts.silent) editor.render();
  },
  onLaunchError: msg => { sound.play('error'); toast(msg); },
  onLaunched: id => { sound.play('launch'); rememberLaunch(id); },
  onChime: () => sound.play('chime'),
  onOpenDrawer: () => drawer.show(),
  onTogglePin: id => togglePin(id),
});

const drawer = new AppDrawer($('#drawer'), {
  getApps: () => widgets.loadApps(),
  launch: id => launch(id),
  onOpen: () => { sound.play('open'); if (!editor.open) api.shell('front'); updatePause(); },
  onClose: () => { sound.play('close'); if (!editor.open) api.shell('back'); updatePause(); },
});

const editor = new Editor($('#editor'), {
  onChange: () => changed(),
  onClose: () => closeEditor(),
  onSelectObject: id => scene.select(id),
  onSelectWidget: id => widgets.select(id),
  getApps: () => widgets.apps,
  loadApps: () => widgets.loadApps(),
  refreshApps: () => widgets.loadApps(true),
  toast,
  sound: event => sound.play(event),
  saveNow: () => (STANDALONE ? Promise.resolve() : api.saveConfig(cfg).catch(() => null)),
  transition: fn => new Promise(resolve => {
    document.body.classList.add('switching');
    setTimeout(() => { fn(); requestAnimationFrame(() => { document.body.classList.remove('switching'); resolve(); }); }, 280);
  }),
});

function changed() {
  applyAll();
  scheduleSave();
}

function applyAll() {
  applyTheme(cfg);
  applyBackground(cfg.scene);
  scene.apply(cfg);
  widgets.apply(cfg);
  editor.setConfig(cfg);
  sound.configure(cfg.general.sound, cfg.scene.sound, MONITOR === 0);
}

function scheduleSave() {
  if (STANDALONE) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await api.saveConfig(cfg);
      api.shell('config-changed');
    } catch { toast('Could not save your changes'); }
  }, 600);
}

// ---- apps -------------------------------------------------------------------
async function launch(id) {
  const res = await api.launch(id);
  if (res.ok) { sound.play('launch'); rememberLaunch(id); } else { sound.play('error'); toast('Could not open that app'); }
}

function rememberLaunch(id) {
  cfg.general.recent = [id, ...(cfg.general.recent || []).filter(x => x !== id)].slice(0, 12);
  scheduleSave();
}

function togglePin(id) {
  const pinned = cfg.general.pinned || [];
  const on = pinned.includes(id);
  cfg.general.pinned = on ? pinned.filter(x => x !== id) : [...pinned, id];
  widgets.apply(cfg);
  scheduleSave();
  sound.play(on ? 'toggleOff' : 'toggleOn');
  toast(on ? 'Unpinned from the dock' : 'Pinned to the dock');
}

// ---- look -----------------------------------------------------------------
const FONT_STACKS = {
  sans: '"Fira Sans", "Inter", "Noto Sans", system-ui, sans-serif',
  serif: '"Noto Serif", "DejaVu Serif", Georgia, serif',
  mono: '"Fira Mono", "JetBrains Mono", "Noto Sans Mono", monospace',
  rounded: '"Nunito", "Comfortaa", "Fira Sans", system-ui, sans-serif',
  display: '"Orbitron", "Audiowide", "Fira Sans", system-ui, sans-serif',
  thin: '"Fira Sans", "Inter", "Noto Sans", system-ui, sans-serif',
};

function applyTheme(c) {
  const t = c.theme, root = document.documentElement, r = root.style;
  r.setProperty('--font', FONT_STACKS[t.font] || FONT_STACKS.sans);
  r.setProperty('--font-weight', t.font === 'thin' ? '200' : '300');
  r.setProperty('--accent', t.accent);
  r.setProperty('--text', t.text);
  r.setProperty('--card', hexToRgba(t.widgetBg, t.widgetOpacity));
  r.setProperty('--card-solid', hexToRgba(t.widgetBg, Math.max(0.85, t.widgetOpacity)));
  r.setProperty('--blur', t.blur + 'px');
  r.setProperty('--radius', t.radius + 'px');
  r.setProperty('--icon', t.iconSize + 'px');
  r.setProperty('--edge', t.border ? 'rgba(255,255,255,.16)' : 'transparent');
  r.setProperty('--shadow', t.shadow ? '0 20px 60px rgba(0,0,0,.35)' : 'none');
  r.setProperty('--glow', t.glow ? `0 0 18px ${t.accent}` : 'none');
  r.setProperty('--text-shadow', t.textShadow ? '0 2px 12px rgba(0,0,0,.35)' : 'none');
  const reduce = c.general.reducedMotion === 'on' || (c.general.reducedMotion === 'system' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  root.classList.toggle('reduce-motion', reduce);
  root.classList.toggle('no-entrance', !t.entrance);
}

function applyBackground(s) {
  const bg = s.background;
  const el = $('#bg');
  const video = $('#bg-video');
  el.style.background = '';
  el.dataset.type = bg.type;
  for (const [k, v] of Object.entries({ '--dim': bg.dim || 0, '--c1': bg.color1, '--c2': bg.color2, '--c3': bg.color3, '--speed': `${(28 / Math.max(0.1, bg.speed || 1)).toFixed(1)}s` })) {
    el.style.setProperty(k, v);
  }
  if (bg.type === 'gradient') el.style.background = `linear-gradient(${bg.angle}deg, ${bg.color1}, ${bg.color2})`;
  else if (bg.type === 'color') el.style.background = bg.color1;
  else if (bg.type === 'image' && bg.image) el.style.background = `center / cover no-repeat url("${bg.image}")`;
  if (bg.type === 'video' && bg.video) {
    if (video.getAttribute('src') !== bg.video) video.src = bg.video;
    video.hidden = false;
    video.play().catch(() => null);
  } else {
    video.hidden = true;
    video.pause();
  }
  const o = s.overlay || {};
  $('#vignette').style.opacity = o.vignette ?? 0;
  $('#grain').style.opacity = o.grain ?? 0;
}

function hexToRgba(hex, a) {
  const n = parseInt(String(hex).replace('#', ''), 16) || 0;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// Film grain texture, made once in code (no image files).
(function makeGrain() {
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  const g = c.getContext('2d');
  const img = g.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 40;
  }
  g.putImageData(img, 0, 0);
  $('#grain').style.backgroundImage = `url(${c.toDataURL()})`;
})();

// ---- editor open/close -------------------------------------------------------
function openEditor() {
  if (editor.open) return;
  drawer.hide();
  api.shell('front');
  scene.setEditMode(true);
  widgets.setEditMode(true);
  widgets.apply(cfg);
  editor.show();
  sound.play('open');
  updatePause();
  $('#edit-button').hidden = true;
  if (cfg.general.editorHint) { cfg.general.editorHint = false; scheduleSave(); }
}

function closeEditor() {
  if (!editor.open) return;
  editor.hide();
  scene.setEditMode(false);
  widgets.setEditMode(false);
  widgets.apply(cfg);
  $('#edit-button').hidden = false;
  sound.play('close');
  api.shell('back');
  updatePause();
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  t.classList.remove('pop');
  void t.offsetWidth;
  t.classList.add('pop');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

// ---- keyboard and hot corner -----------------------------------------------------
window.addEventListener('keydown', e => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') { e.preventDefault(); editor.open ? closeEditor() : openEditor(); }
  else if ((e.ctrlKey || e.metaKey) && e.key === ' ') { e.preventDefault(); drawer.open ? drawer.hide() : drawer.show(); }
  else if (e.key === 'Escape' && editor.open) { e.preventDefault(); closeEditor(); }
  else if (e.key === 'Delete' && editor.open && !typing) {
    if (widgets.selectedId) { cfg.widgets = cfg.widgets.filter(w => w.id !== widgets.selectedId); widgets.select(null); editor.selectWidget(null); changed(); }
    else if (scene.selectedId) { cfg.objects = cfg.objects.filter(o => o.id !== scene.selectedId); scene.select(null); editor.selectObject(null); changed(); }
  }
});

let cornerTimer;
window.addEventListener('pointermove', e => {
  const corner = cfg?.general.drawerCorner;
  if (!corner || corner === 'none' || editor.open || drawer.open) return;
  const top = e.clientY < 6, bottom = e.clientY > innerHeight - 6, left = e.clientX < 6, right = e.clientX > innerWidth - 6;
  const hit = { 'top-left': top && left, 'top-right': top && right, 'bottom-left': bottom && left, 'bottom-right': bottom && right }[corner];
  if (hit && !cornerTimer) cornerTimer = setTimeout(() => { drawer.show(); cornerTimer = null; }, 180);
  if (!hit && cornerTimer) { clearTimeout(cornerTimer); cornerTimer = null; }
});

// ---- pausing while you use an app (told by the desktop app, per screen) ----------------
let pauseWanted = false;
let paused = false;
function updatePause() {
  const now = pauseWanted && !editor.open && !drawer.open; // never while you're looking at it
  if (now === paused) return;
  paused = now;
  scene.setPaused(now);
  sound.setPaused(now);
  document.body.classList.toggle('paused', now);
  const video = $('#bg-video');
  if (!video.hidden) { if (now) video.pause(); else video.play().catch(() => null); }
}

// widgets drift with the camera
(function parallaxLoop() {
  if (paused) { requestAnimationFrame(parallaxLoop); return; }
  widgets.updateParallax(scene.pointerSmooth.x * (cfg?.camera.mode === 'fixed' ? 0 : cfg?.camera.strength ?? 1), scene.pointerSmooth.y * (cfg?.camera.strength ?? 1));
  requestAnimationFrame(parallaxLoop);
})();

$('#edit-button').addEventListener('click', openEditor);

// ---- interface sounds -----------------------------------------------------------------
$('#editor').addEventListener('click', e => {
  if (e.target.closest('.preset')) return; // presets play their own sound once applied
  if (e.target.closest('button, .tab, .upload')) sound.play('click');
});
$('#editor').addEventListener('change', e => {
  if (e.target.type === 'checkbox') sound.play(e.target.checked ? 'toggleOn' : 'toggleOff');
});
$('#widgets').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b && !b.closest('.app') && !b.classList.contains('app')) sound.play(b.classList.contains('app-star') ? 'toggleOn' : 'click');
});
$('#drawer').addEventListener('click', e => { if (e.target.closest('.app-cat')) sound.play('click'); });
let lastHover = null;
document.addEventListener('pointerover', e => {
  const app = e.target.closest?.('#widgets .app, #drawer .drawer-app');
  if (app && app !== lastHover) sound.play('hover');
  lastHover = app;
});

// Fade the soundscape out while music or a video is playing (checked only while ambient sound is on).
setInterval(async () => {
  const s = cfg?.general.sound;
  if (MONITOR !== 0 || !s?.ambient || !s.pauseForMusic || cfg.scene.sound === 'none' || STANDALONE) { sound.duck(false); return; }
  const np = await api.nowPlaying();
  sound.duck(np?.active && np.playing);
}, 5000);

window.deskscape = {
  setPaused(on) { pauseWanted = !!on; updatePause(); },
  openEditor,
  closeEditor,
  openDrawer: () => drawer.show(),
  async reloadConfig() {
    if (editor.open) return; // this window is the one being edited
    const saved = await api.loadConfig();
    if (saved) { cfg = normalizeConfig(saved); applyAll(); }
  },
};

// ---- start ----------------------------------------------------------------
(async function start() {
  cfg = normalizeConfig(await api.loadConfig());
  applyAll();
  document.body.dataset.monitor = MONITOR;
  if (cfg.general.editorHint && MONITOR === 0) {
    toast('Welcome to Deskscape — press Ctrl+E or the pencil button to customize');
  }
  if (STANDALONE) toast('Preview mode: changes are not saved');
  if (new URLSearchParams(location.search).get('edit') === '1') openEditor();
})();
