export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * SaveButton — mirrors CopyButton's style and pattern.
 * No icon, text-only, same .copy-btn base class with state modifiers.
 */
export class SaveButton {
  private btn: HTMLButtonElement;
  private revertTimer: ReturnType<typeof setTimeout> | null = null;
  private clickCallbacks: Array<() => void> = [];

  private static readonly LABELS: Record<SaveState, string> = {
    idle:   '保存',
    saving: '保存中…',
    saved:  '已保存 ✓',
    error:  '保存失败',
  };

  constructor(container: HTMLElement) {
    this.btn = document.createElement('button');
    this.btn.setAttribute('aria-label', '保存文档 (Ctrl+S)');
    this.btn.setAttribute('type', 'button');
    this.btn.title = 'Ctrl+S';
    container.appendChild(this.btn);

    this.setState('idle');

    this.btn.addEventListener('click', () => {
      this.clickCallbacks.forEach((cb) => cb());
    });
  }

  onClick(callback: () => void): void {
    this.clickCallbacks.push(callback);
  }

  setState(state: SaveState): void {
    if (this.revertTimer !== null) {
      clearTimeout(this.revertTimer);
      this.revertTimer = null;
    }

    // Reset to base class, then apply state modifier
    this.btn.className = 'copy-btn';
    this.btn.textContent = SaveButton.LABELS[state];
    this.btn.disabled = state === 'saving';

    if (state === 'saved') {
      this.btn.classList.add('copy-btn--success');
      this.revertTimer = setTimeout(() => this.setState('idle'), 1500);
    } else if (state === 'error') {
      this.btn.classList.add('copy-btn--error');
      this.revertTimer = setTimeout(() => this.setState('idle'), 2500);
    }
  }
}
