// Ready-made layouts for COSMIC's real panel and dock, and a tiny drawing of each.
const A = id => 'com.system76.' + id;
const TRAY = [A('CosmicAppletStatusArea'), A('CosmicAppletAudio'), A('CosmicAppletNetwork'), A('CosmicAppletBluetooth'), A('CosmicAppletBattery'), A('CosmicAppletNotifications')];
const BAR = { opacity: 1, autohide: 'Never', floating: false, stretch: true, radius: 0, margin: 0, padding: 0, spacing: 0, background: 'ThemeDefault', normalOnMaximize: true };

/** Each layout is the full change sent to COSMIC: which bars exist, where they sit and what they hold. */
export const TASKBAR_LAYOUTS = {
  cosmic: {
    name: 'COSMIC', tagline: 'Top panel and a dock, as Pop!_OS ships',
    panel: { ...BAR, enabled: true, anchor: 'Top', size: 'XS', left: [A('CosmicPanelWorkspacesButton'), A('CosmicPanelAppButton')], center: [A('CosmicAppletTime')], right: [A('CosmicAppletInputSources'), A('CosmicAppletA11y'), ...TRAY.slice(0, 1), A('CosmicAppletTiling'), ...TRAY.slice(1), A('CosmicAppletPower')] },
    dock: { ...BAR, enabled: true, anchor: 'Bottom', size: 'L', stretch: false, radius: 12, padding: 4, left: [], right: [], center: [A('CosmicPanelLauncherButton'), A('CosmicPanelWorkspacesButton'), A('CosmicPanelAppButton'), A('CosmicAppList'), A('CosmicAppletMinimize')] },
  },
  classic: {
    name: 'Classic taskbar', tagline: 'One bar at the bottom: apps left, clock and tray right',
    panel: { ...BAR, enabled: true, anchor: 'Bottom', size: 'M', padding: 2, spacing: 2, left: [A('CosmicPanelLauncherButton'), A('CosmicPanelWorkspacesButton'), A('CosmicAppList')], center: [], right: [...TRAY, A('CosmicAppletTime'), A('CosmicAppletPower')] },
    dock: { enabled: false },
  },
  centered: {
    name: 'Centered taskbar', tagline: 'Bottom bar with your apps in the middle',
    panel: { ...BAR, enabled: true, anchor: 'Bottom', size: 'M', padding: 2, spacing: 4, left: [A('CosmicPanelWorkspacesButton')], center: [A('CosmicPanelLauncherButton'), A('CosmicAppList')], right: [...TRAY, A('CosmicAppletTime')] },
    dock: { enabled: false },
  },
  mac: {
    name: 'Menu bar and dock', tagline: 'Slim top bar, floating dock that hides behind windows',
    panel: { ...BAR, enabled: true, anchor: 'Top', size: 'XS', opacity: 0.75, left: [A('CosmicPanelAppButton'), A('CosmicPanelWorkspacesButton')], center: [], right: [...TRAY, A('CosmicAppletTime'), A('CosmicAppletPower')] },
    dock: { ...BAR, enabled: true, anchor: 'Bottom', size: 'L', opacity: 0.7, autohide: 'OnOverlap', floating: true, stretch: false, radius: 20, margin: 6, padding: 6, spacing: 4, left: [], right: [], center: [A('CosmicPanelLauncherButton'), A('CosmicAppList'), A('CosmicAppletMinimize')] },
  },
  islands: {
    name: 'Floating islands', tagline: 'Rounded glass pills that float off the edges',
    panel: { ...BAR, enabled: true, anchor: 'Top', size: 'S', opacity: 0.55, floating: true, stretch: false, radius: 18, margin: 8, padding: 4, spacing: 6, left: [A('CosmicPanelWorkspacesButton')], center: [A('CosmicAppletTime')], right: TRAY.slice(1) },
    dock: { ...BAR, enabled: true, anchor: 'Bottom', size: 'M', opacity: 0.55, autohide: 'OnOverlap', floating: true, stretch: false, radius: 22, margin: 10, padding: 6, spacing: 6, left: [], right: [], center: [A('CosmicPanelLauncherButton'), A('CosmicAppList')] },
  },
  side: {
    name: 'Side dock', tagline: 'Top bar and a full-height dock on the left',
    panel: { ...BAR, enabled: true, anchor: 'Top', size: 'XS', left: [A('CosmicPanelWorkspacesButton')], center: [A('CosmicAppletTime')], right: [...TRAY, A('CosmicAppletPower')] },
    dock: { ...BAR, enabled: true, anchor: 'Left', size: 'M', opacity: 0.9, stretch: true, padding: 4, spacing: 2, left: [], right: [A('CosmicPanelAppButton')], center: [A('CosmicAppList')] },
  },
  zen: {
    name: 'Zen', tagline: 'Nothing on screen until you reach an edge',
    panel: { ...BAR, enabled: true, anchor: 'Top', size: 'XS', opacity: 0.8, autohide: 'Always', floating: true, stretch: false, radius: 14, margin: 6, padding: 2, left: [], center: [A('CosmicAppletTime')], right: TRAY.slice(1) },
    dock: { ...BAR, enabled: true, anchor: 'Bottom', size: 'M', opacity: 0.7, autohide: 'Always', floating: true, stretch: false, radius: 18, margin: 8, padding: 6, left: [], right: [], center: [A('CosmicPanelLauncherButton'), A('CosmicAppList')] },
  },
};

/** A little picture of a layout: a screen with its bars. Works for the live look too. */
export function layoutPreview(look) {
  const screen = document.createElement('div');
  screen.className = 'tb-screen';
  screen.setAttribute('aria-hidden', 'true');
  for (const bar of ['panel', 'dock']) {
    const b = look[bar];
    if (!b || b.enabled === false) continue;
    const n = document.createElement('div');
    const vertical = b.anchor === 'Left' || b.anchor === 'Right';
    const thick = { XS: 7, S: 8, M: 10, L: 12, XL: 14 }[b.size] || 9;
    n.className = `tb-bar tb-${(b.anchor || 'Top').toLowerCase()}` + (b.stretch ? ' tb-stretch' : '') + (b.floating ? ' tb-float' : '') + (b.autohide === 'Always' ? ' tb-hidden' : '');
    n.style.setProperty('--thick', thick + 'px');
    n.style.setProperty('--r', Math.min(6, (b.radius || 0) / 3) + 'px');
    n.style.opacity = 0.35 + 0.65 * (b.opacity ?? 1);
    if (b.background && b.background.startsWith('#')) n.style.background = b.background;
    else if (b.background === 'Light') { n.style.background = '#e8e8ee'; n.dataset.light = ''; }
    if (b.background?.startsWith('#') && isLight(b.background)) n.dataset.light = '';
    const zones = vertical ? [b.left, b.center, b.right] : [b.left, b.center, b.right];
    for (const z of zones) {
      const zone = document.createElement('span');
      zone.className = 'tb-zone';
      for (let i = 0; i < Math.min(6, (z || []).length); i++) zone.appendChild(document.createElement('i'));
      n.appendChild(zone);
    }
    screen.appendChild(n);
  }
  return screen;
}

export function appletName(applets, id) {
  return applets.find(a => a.id === id)?.name || id.replace(/^com\.system76\.Cosmic(Applet|Panel)?/, '');
}

/** A preset's taskbar: its layout with the preset's colors and glass on top. */
export function presetTaskbar(preset) {
  const t = preset.taskbar;
  const base = TASKBAR_LAYOUTS[t.layout] || TASKBAR_LAYOUTS.cosmic;
  const { name, tagline, ...layout } = base;
  const look = t.look || {};
  const out = { ...look, ...JSON.parse(JSON.stringify(layout)) };
  for (const bar of ['panel', 'dock']) {
    if (out[bar]?.enabled !== false && look[bar]) out[bar] = { ...out[bar], ...look[bar] };
  }
  return out;
}

function isLight(hex) {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16 & 255) * 0.299 + (n >> 8 & 255) * 0.587 + (n & 255) * 0.114) > 150;
}
