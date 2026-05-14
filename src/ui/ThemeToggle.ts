import type { AppTheme } from '../types/index';

const STORAGE_KEY = 'sql-formatter-theme';

/**
 * ThemeToggle — pill-shaped checkbox switch.
 * The icon lives inside the sliding thumb: moon in dark mode, sun in light mode.
 */
export class ThemeToggle {
  private checkbox: HTMLInputElement;
  private thumbIcon: HTMLSpanElement;
  private current: AppTheme;
  private changeCallbacks: Array<(theme: AppTheme) => void> = [];

  private static readonly MOON_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"/>
  </svg>`;

  private static readonly SUN_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>
    <line x1="12" y1="2" x2="12" y2="5"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/>
    <line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
    <line x1="2" y1="12" x2="5" y2="12"/>
    <line x1="19" y1="12" x2="22" y2="12"/>
    <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/>
    <line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
  </svg>`;

  constructor(container: HTMLElement) {
    this.current = this.loadTheme();

    const label = document.createElement('label');
    label.className = 'theme-switch';
    label.title = '切换明亮 / 暗黑主题';

    // Hidden checkbox
    this.checkbox = document.createElement('input');
    this.checkbox.type = 'checkbox';
    this.checkbox.className = 'theme-switch-input';
    this.checkbox.setAttribute('aria-label', '切换明亮/暗黑主题');
    this.checkbox.checked = this.current === 'light';

    // Track
    const track = document.createElement('span');
    track.className = 'theme-switch-track';

    // Thumb with icon inside
    const thumb = document.createElement('span');
    thumb.className = 'theme-switch-thumb';

    this.thumbIcon = document.createElement('span');
    this.thumbIcon.className = 'theme-switch-thumb-icon';
    thumb.appendChild(this.thumbIcon);
    track.appendChild(thumb);

    label.appendChild(this.checkbox);
    label.appendChild(track);
    container.appendChild(label);

    this.applyTheme(this.current, false);

    this.checkbox.addEventListener('change', () => {
      this.applyTheme(this.checkbox.checked ? 'light' : 'dark', true);
    });
  }

  private applyTheme(theme: AppTheme, notify: boolean): void {
    this.current = theme;
    document.documentElement.setAttribute('data-theme', theme);
    this.checkbox.checked = theme === 'light';
    // Swap icon inside thumb
    this.thumbIcon.innerHTML =
      theme === 'dark' ? ThemeToggle.MOON_SVG : ThemeToggle.SUN_SVG;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch { /* ignore */ }
    if (notify) this.changeCallbacks.forEach((cb) => cb(theme));
  }

  private loadTheme(): AppTheme {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch { /* ignore */ }
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
  }

  getTheme(): AppTheme { return this.current; }

  onThemeChange(callback: (theme: AppTheme) => void): void {
    this.changeCallbacks.push(callback);
  }
}
