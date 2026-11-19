export interface Leftover {
  from: number;
  to: number;
  text: string;
}

/**
 * Watches one composition at a time for the iOS duplication: in ordinary typing every
 * composition update covers the same start, but when the editor redraws mid-composition
 * the browser starts the composition again after the text the editor still shows. That
 * text (an earlier state of the composition) is left behind in front of the new one.
 */
export class StaleTracker {
  private composing = false;
  private start_: number | null = null;
  private shown = new Set<string>();
  private latest = "";
  private found: Leftover | null = null;

  start() {
    this.composing = true;
    this.start_ = null;
    this.shown.clear();
    this.latest = "";
  }

  /** The composition text, from each compositionupdate. */
  update(data: string) {
    if (!this.composing) return;
    this.shown.add(data);
    this.latest = data;
  }

  /** The target range of an insertCompositionText beforeinput; `textAt` reads the editor's text. */
  beforeInput(from: number, _to: number, textAt: (from: number, to: number) => string) {
    if (!this.composing) return;
    if (this.start_ === null || from < this.start_) {
      this.start_ = from;
      return;
    }
    if (from === this.start_ || this.found) return;
    const text = textAt(this.start_, from);
    // A redraw makes the browser send the whole composition again, so the new text starts
    // like the leftover; a first part the IME committed on its own would not come again.
    if (text && this.shown.has(text) && this.latest.startsWith(text.charAt(0))) this.found = { from: this.start_, to: from, text };
    this.start_ = from;
  }

  end() {
    this.composing = false;
  }

  /** The leftover to remove once no composition is running, or null. */
  pending(): Leftover | null {
    return this.found;
  }

  /** Follow edits made since, with a position mapping such as ChangeSet.mapPos. */
  map(mapPos: (pos: number, assoc: number) => number) {
    if (!this.found) return;
    const from = mapPos(this.found.from, 1);
    const to = mapPos(this.found.to, -1);
    this.found = to - from === this.found.to - this.found.from ? { ...this.found, from, to } : null;
    if (this.start_ !== null) this.start_ = mapPos(this.start_, 1);
  }

  clear() {
    this.found = null;
  }
}
