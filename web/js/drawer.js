// Full-screen app drawer: a glass overlay with search and categories, opened from the dock or a hot corner.
import { APP_CATEGORIES } from './config.js';

export class AppDrawer {
  constructor(root, callbacks) {
    this.root = root;
    this.cb = callbacks; // getApps(), launch(id), onOpen(), onClose()
    this.open = false;
    root.addEventListener('pointerdown', e => { if (e.target === root) this.hide(); });
    root.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); this.hide(); } });
  }

  async show() {
    if (this.open) return;
    this.open = true;
    this.cb.onOpen?.();
    const apps = await this.cb.getApps();
    this.render(apps);
    this.root.hidden = false;
    requestAnimationFrame(() => this.root.classList.add('shown'));
    setTimeout(() => this.root.querySelector('input')?.focus(), 60);
  }

  hide() {
    if (!this.open) return;
    this.open = false;
    this.root.classList.remove('shown');
    setTimeout(() => { if (!this.open) this.root.hidden = true; }, 220);
    this.cb.onClose?.();
  }

  render(apps) {
    let category = 'all';
    let query = '';
    const panel = el('div', 'drawer-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'All apps');

    const top = el('div', 'drawer-top');
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'Type to search your apps';
    search.setAttribute('aria-label', 'Search apps');
    const close = el('button', 'drawer-close', 'Close');
    close.addEventListener('click', () => this.hide());
    top.append(search, close);

    const cats = el('div', 'drawer-cats');
    cats.setAttribute('role', 'tablist');
    const present = new Set(apps.flatMap(a => a.categories));
    const grid = el('div', 'drawer-grid');
    grid.setAttribute('role', 'list');

    let shown = [];
    const fill = () => {
      shown = apps.filter(a => (category === 'all' || a.categories.includes(category))
        && (!query || a.name.toLowerCase().includes(query) || a.comment.toLowerCase().includes(query)));
      grid.replaceChildren(...shown.map((a, i) => {
        const b = el('button', 'drawer-app');
        b.style.animationDelay = `${Math.min(i, 40) * 8}ms`;
        b.setAttribute('role', 'listitem');
        b.setAttribute('aria-label', `Open ${a.name}`);
        b.title = a.comment || a.name;
        const icon = document.createElement(a.hasIcon ? 'img' : 'span');
        if (a.hasIcon) { icon.src = '/icon/' + encodeURIComponent(a.id); icon.alt = ''; icon.loading = 'lazy'; }
        else { icon.className = 'app-fallback'; icon.textContent = a.name.slice(0, 1); }
        b.append(icon, el('span', 'drawer-name', a.name));
        b.addEventListener('click', () => { this.cb.launch(a.id); this.hide(); });
        return b;
      }));
      if (!shown.length) grid.appendChild(el('div', 'empty', apps.length ? 'No apps match' : 'Loading apps…'));
    };
    for (const [key, label] of Object.entries(APP_CATEGORIES)) {
      if (key !== 'all' && !present.has(key)) continue;
      const t = el('button', 'app-cat' + (key === 'all' ? ' on' : ''), label);
      t.setAttribute('role', 'tab');
      t.setAttribute('aria-selected', String(key === 'all'));
      t.addEventListener('click', () => {
        category = key;
        cats.querySelectorAll('.app-cat').forEach(n => { n.classList.toggle('on', n === t); n.setAttribute('aria-selected', String(n === t)); });
        fill();
      });
      cats.appendChild(t);
    }
    search.addEventListener('input', () => { query = search.value.trim().toLowerCase(); fill(); });
    search.addEventListener('keydown', e => { if (e.key === 'Enter' && shown[0]) { this.cb.launch(shown[0].id); this.hide(); } });
    fill();
    panel.append(top, cats, grid);
    this.root.replaceChildren(panel);
  }
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
