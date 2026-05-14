import type { PreviewPanel } from './PreviewPanel';

/**
 * CopyButton — renders a "复制" button adjacent to the Preview Panel header.
 * Writes the plain-text formatted SQL to the system clipboard.
 */
export class CopyButton {
  private button: HTMLButtonElement;
  private feedbackTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    container: HTMLElement,
    private previewPanel: PreviewPanel,
  ) {
    this.button = document.createElement('button');
    this.button.className = 'copy-btn';
    this.button.textContent = '复制';
    this.button.setAttribute('aria-label', '复制格式化后的 SQL');
    this.button.setAttribute('type', 'button');

    container.appendChild(this.button);

    this.button.addEventListener('click', () => {
      void this.handleClick();
    });
  }

  private async handleClick(): Promise<void> {
    const text = this.previewPanel.getPlainText();
    if (!text || text === '格式化结果将在此处显示…') return;

    try {
      await navigator.clipboard.writeText(text);
      this.showSuccess();
    } catch {
      this.showError();
    }
  }

  private showSuccess(): void {
    this.setFeedback('已复制 ✓', 'copy-btn--success', 2000);
  }

  private showError(): void {
    this.setFeedback('复制失败，请手动选择', 'copy-btn--error', 3000);
  }

  private setFeedback(label: string, cssClass: string, duration: number): void {
    if (this.feedbackTimeout !== null) {
      clearTimeout(this.feedbackTimeout);
    }

    this.button.textContent = label;
    this.button.classList.add(cssClass);
    this.button.disabled = true;

    this.feedbackTimeout = setTimeout(() => {
      this.button.textContent = '复制';
      this.button.classList.remove(cssClass);
      this.button.disabled = false;
      this.feedbackTimeout = null;
    }, duration);
  }
}
