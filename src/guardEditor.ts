import type { Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { StaleTracker } from "./guard";
import { show, type LogBuffer } from "./log";

/** Wait this long after a composition ends, so a composition that follows at once can begin. */
const SETTLE_MS = 150;

/** Removes the text the iOS duplication leaves in front of a composition, once typing settles. */
class Guard {
  private readonly tracker = new StaleTracker();
  private readonly listeners: [string, (e: Event) => void][];
  private timer = 0;

  constructor(private readonly view: EditorView, private readonly log: LogBuffer) {
    const textAt = (from: number, to: number) => view.state.doc.sliceString(from, to);
    this.listeners = [
      ["compositionstart", () => this.tracker.start()],
      ["compositionupdate", (e) => this.tracker.update((e as CompositionEvent).data)],
      ["beforeinput", (e) => {
        const input = e as InputEvent;
        const range = input.getTargetRanges()[0];
        if (!range) return;
        const from = this.pos(range.startContainer, range.startOffset);
        const to = this.pos(range.endContainer, range.endOffset);
        if (from === null || to === null) return;
        const before = this.tracker.pending();
        if (input.inputType === "insertCompositionText") this.tracker.beforeInput(from, to, textAt);
        else if (input.inputType === "deleteCompositionText") this.tracker.deleteText(from, to);
        else if (input.inputType === "insertFromComposition") this.tracker.confirm(from, input.data ?? "", textAt);
        else return;
        const found = this.tracker.pending();
        if (found && found !== before) log.add(performance.now(), "guard", `leftover ${found.from}-${found.to} ${show(found.text)}`);
      }],
      ["compositionend", () => {
        this.tracker.end();
        window.clearTimeout(this.timer);
        this.timer = window.setTimeout(() => this.fix(), SETTLE_MS);
      }],
    ];
    for (const [type, fn] of this.listeners) view.contentDOM.addEventListener(type, fn, { capture: true, passive: true });
  }

  private pos(node: Node, offset: number): number | null {
    try {
      return this.view.posAtDOM(node, offset);
    } catch {
      return null;
    }
  }

  update(update: ViewUpdate) {
    if (update.docChanged) this.tracker.map((pos, assoc) => update.changes.mapPos(pos, assoc));
  }

  private fix() {
    const leftover = this.tracker.pending();
    // still composing: the compositionend of that one tries again
    if (!leftover || this.view.composing) return;
    this.tracker.clear();
    const doc = this.view.state.doc;
    const after = leftover.to + leftover.text.length;
    const twice = after <= doc.length && doc.sliceString(leftover.to, after) === leftover.text;
    if (doc.sliceString(leftover.from, leftover.to) !== leftover.text || (leftover.repeat && !twice)) {
      this.log.add(performance.now(), "guard", `skipped, text at ${leftover.from}-${leftover.to} changed`);
      return;
    }
    this.view.dispatch({ changes: { from: leftover.from, to: leftover.to }, userEvent: "delete.ime-guard" });
    this.log.add(performance.now(), "guard", `removed ${leftover.from}-${leftover.to} ${show(leftover.text)}`);
  }

  destroy() {
    window.clearTimeout(this.timer);
    for (const [type, fn] of this.listeners) this.view.contentDOM.removeEventListener(type, fn, { capture: true });
  }
}

export function guardExtension(log: LogBuffer): Extension {
  return ViewPlugin.define((view) => new Guard(view, log));
}
