/**
 * ResizableDivider — makes the panel divider draggable so users can adjust
 * the left/right split ratio.
 *
 * Constraints:
 *  - Min panel width: 20% of the layout container
 *  - Max panel width: 80% of the layout container
 *  - Mobile (< 768px): disabled (panels stack vertically)
 */
export class ResizableDivider {
  private divider: HTMLElement;
  private leftPanel: HTMLElement;
  private rightPanel: HTMLElement;
  private container: HTMLElement;

  private isDragging = false;
  private startX = 0;
  private startLeftWidth = 0;

  constructor(divider: HTMLElement, leftPanel: HTMLElement, rightPanel: HTMLElement, container: HTMLElement) {
    this.divider = divider;
    this.leftPanel = leftPanel;
    this.rightPanel = rightPanel;
    this.container = container;

    this.init();
  }

  private init(): void {
    // Style the divider to show it's interactive
    this.divider.classList.add('panel-divider--resizable');
    this.divider.setAttribute('role', 'separator');
    this.divider.setAttribute('aria-label', '拖拽调整面板宽度');
    this.divider.setAttribute('tabindex', '0');

    // Mouse events
    this.divider.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);

    // Touch events for tablet support
    this.divider.addEventListener('touchstart', this.onTouchStart, { passive: true });
    document.addEventListener('touchmove', this.onTouchMove, { passive: false });
    document.addEventListener('touchend', this.onTouchEnd);

    // Keyboard support: left/right arrow keys adjust by 2%
    this.divider.addEventListener('keydown', this.onKeyDown);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (window.innerWidth < 768) return;
    this.startDrag(e.clientX);
    e.preventDefault();
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;
    this.updateSplit(e.clientX);
  };

  private onMouseUp = (): void => {
    this.endDrag();
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (window.innerWidth < 768) return;
    const touch = e.touches[0];
    if (touch) this.startDrag(touch.clientX);
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (!this.isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) this.updateSplit(touch.clientX);
  };

  private onTouchEnd = (): void => {
    this.endDrag();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (window.innerWidth < 768) return;
    const containerWidth = this.container.getBoundingClientRect().width;
    const currentLeft = this.leftPanel.getBoundingClientRect().width;
    const currentPct = (currentLeft / containerWidth) * 100;

    let newPct = currentPct;
    if (e.key === 'ArrowLeft') newPct -= 2;
    else if (e.key === 'ArrowRight') newPct += 2;
    else return;

    e.preventDefault();
    this.applyRatio(Math.max(20, Math.min(80, newPct)));
  };

  private startDrag(clientX: number): void {
    this.isDragging = true;
    this.startX = clientX;
    this.startLeftWidth = this.leftPanel.getBoundingClientRect().width;
    this.divider.classList.add('panel-divider--dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  private updateSplit(clientX: number): void {
    const delta = clientX - this.startX;
    const containerWidth = this.container.getBoundingClientRect().width;
    const newLeftWidth = this.startLeftWidth + delta;
    const newPct = (newLeftWidth / containerWidth) * 100;
    this.applyRatio(Math.max(20, Math.min(80, newPct)));
  }

  private applyRatio(leftPct: number): void {
    this.leftPanel.style.flex = 'none';
    this.leftPanel.style.width = `${leftPct}%`;
    this.rightPanel.style.flex = '1';
    this.rightPanel.style.width = '';
  }

  private endDrag(): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.divider.classList.remove('panel-divider--dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  /** Clean up all event listeners */
  destroy(): void {
    this.divider.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    this.divider.removeEventListener('touchstart', this.onTouchStart);
    document.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('touchend', this.onTouchEnd);
    this.divider.removeEventListener('keydown', this.onKeyDown);
  }
}
