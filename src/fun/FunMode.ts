/**
 * FunMode — global on/off switch for easter eggs and evolution widget.
 *
 * Default: enabled (true).
 * Future trigger logic (Konami code, logo click, URL param…) should call
 * FunMode.setEnabled(true/false) — nothing else needs to change.
 */
export class FunMode {
  private static _enabled = true;

  static isEnabled(): boolean {
    return FunMode._enabled;
  }

  static setEnabled(value: boolean): void {
    FunMode._enabled = value;
  }
}
