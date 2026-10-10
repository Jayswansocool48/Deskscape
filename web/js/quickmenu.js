// Right-click the desktop for quick actions, without opening the editor.
// Keyboard: the menu takes focus, arrows move, Enter picks, Esc closes.

export class QuickMenu {
  constructor(root) {
    this.root = root;
    this.root.setAttribute('role', 'menu');
    this.root.hidden = true;
    addEventListener('pointerdown', e => { if (!this.root.hidden && !this.root.contains(e.target)) this.hide(); }, true);
    addEventListener('blur', () => this.hide());
    this.root.addEventListener('keydown', e => this.keys(e));
  }

  /** items: [{label, hint?, run?, items?: [...], danger?, checked?}] or '-' for a divider */
  show(x, y, items, title) {
    this.root.replaceChildren();
    if (title) this.root.appendChild(el('div', 'qm-title', title));
    this.fill(this.root, items);
    this.root.hidden = false;
    const r = this.root.getBoundingClientRect();
    this.root.style.left = Math.min(x, innerWidth - r.width - 8) + 'px';
    this.root.style.top = Math.min(y, innerHeight - r.height - 8) + 'px';
    this.root.querySelector('button')?.focus();
  }

  fill(box, items) {
    for (const item of items) {
      if (item === '-') { box.appendChild(el('div', 'qm-sep')); continue; }
      const b = el('button', 'qm-item' + (item.danger ? ' danger' : '') + (item.items ? ' has-sub' : ''));
      b.type = 'button';
      b.setAttribute('role', item.checked === undefined ? 'menuitem' : 'menuitemcheckbox');
      if (item.checked !== undefined) b.setAttribute('aria-checked', String(!!item.checked));
      b.append(el('span', 'qm-label', item.label));
      if (item.hint) b.append(el('span', 'qm-hint', item.hint));
      if (item.items) {
        b.setAttribute('aria-haspopup', 'menu');
        const sub = el('div', 'qm-sub');
        sub.setAttribute('role', 'menu');
        this.fill(sub, item.items);
        b.appendChild(sub);
        b.addEventListener('click', e => { if (e.target === b || b.firstChild.contains(e.target)) b.classList.toggle('open'); });
      } else {
        b.addEventListener('click', e => { e.stopPropagation(); this.hide(); item.run?.(); });
      }
      box.appendChild(b);
    }
  }

  keys(e) {
    const buttons = [...this.root.querySelectorAll('button')].filter(b => b.offsetParent);
    const i = buttons.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); this.hide(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); buttons[(i + 1) % buttons.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); buttons[(i - 1 + buttons.length) % buttons.length]?.focus(); }
    else if (e.key === 'ArrowRight' && document.activeElement?.classList.contains('has-sub')) {
      e.preventDefault();
      document.activeElement.classList.add('open');
      document.activeElement.querySelector('.qm-sub button')?.focus();
    } else if (e.key === 'ArrowLeft') {
      const parent = document.activeElement?.closest('.has-sub.open');
      if (parent) { e.preventDefault(); parent.classList.remove('open'); parent.focus(); }
    }
  }

  hide() { this.root.hidden = true; }
  get open() { return !this.root.hidden; }
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
