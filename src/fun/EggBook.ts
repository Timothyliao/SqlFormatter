import { EGG_DEFINITIONS } from './EasterEgg';
import type { EasterEgg } from './EasterEgg';

/**
 * EggBook — easter egg collection panel.
 * Opened via custom event 'open-egg-book' dispatched by EvolutionWidget.
 */
export class EggBook {
  private panel: HTMLElement;
  private overlay: HTMLElement;
  private isOpen = false;

  constructor(private easterEgg: EasterEgg) {
    // Overlay backdrop
    this.overlay = document.createElement('div');
    this.overlay.className = 'eggbook-overlay';
    this.overlay.addEventListener('click', () => this.close());

    // Panel
    this.panel = document.createElement('div');
    this.panel.className = 'eggbook-panel';
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', '彩蛋图鉴');

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.panel);

    // Listen for open event from EvolutionWidget
    document.addEventListener('open-egg-book', () => this.open());
    // Listen for new discoveries while panel is open
    document.addEventListener('egg-discovered', () => { if (this.isOpen) this.render(); });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });
  }

  private open(): void {
    this.render();
    this.overlay.classList.add('eggbook-overlay--visible');
    this.panel.classList.add('eggbook-panel--visible');
    this.isOpen = true;
  }

  private close(): void {
    this.overlay.classList.remove('eggbook-overlay--visible');
    this.panel.classList.remove('eggbook-panel--visible');
    this.isOpen = false;
  }

  private render(): void {
    const discovered = this.easterEgg.getDiscovered();
    const total = EGG_DEFINITIONS.length;
    const found = discovered.size;
    const pct = Math.round((found / total) * 100);

    this.panel.innerHTML = `
      <div class="eggbook-header">
        <span class="eggbook-title">✦ 彩蛋图鉴</span>
        <button class="eggbook-close" aria-label="关闭">×</button>
      </div>
      <div class="eggbook-progress">
        <span class="eggbook-count">已发现 ${found} / ${total}</span>
        <div class="eggbook-bar">
          <div class="eggbook-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>
      <ul class="eggbook-list">
        ${EGG_DEFINITIONS.map(egg => {
          const found = discovered.has(egg.id);
          return `<li class="eggbook-item ${found ? 'eggbook-item--found' : ''}">
            <span class="eggbook-item-icon">${found ? '✅' : '❓'}</span>
            <span class="eggbook-item-name">${found ? egg.name : '???'}</span>
          </li>`;
        }).join('')}
      </ul>
    `;

    this.panel.querySelector('.eggbook-close')
      ?.addEventListener('click', () => this.close());
  }
}
