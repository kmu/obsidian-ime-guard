import { Transaction, type Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { show, type LogBuffer } from "./log";

const now = () => performance.now();

/** Editor position of a DOM point, or "?" when CodeMirror cannot map it. */
function pos(view: EditorView, node: Node, offset: number): string {
  try {
    return String(view.posAtDOM(node, offset));
  } catch {
    return "?";
  }
}

/** Writes down the input events the editor receives and what they do to the text. It changes nothing. */
class Recorder {
  private readonly listeners: [string, (e: Event) => void][];

  constructor(private readonly view: EditorView, private readonly log: LogBuffer) {
    const record = (kind: string, text: string) => log.add(now(), kind, text);
    // keyCode is deprecated, but 229 is how a key that went to the IME shows
    this.listeners = [
      ["keydown", (e) => {
        const k = e as KeyboardEvent;
        record("keydown", `key=${show(k.key)} code=${k.code} keyCode=${k.keyCode} composing=${k.isComposing}`);
      }],
      ["keyup", (e) => {
        const k = e as KeyboardEvent;
        record("keyup", `key=${show(k.key)} keyCode=${k.keyCode} composing=${k.isComposing}`);
      }],
      ...(["compositionstart", "compositionupdate", "compositionend"] as const).map(
        (type): [string, (e: Event) => void] => [type, (e) => record(type, `data=${show((e as CompositionEvent).data)}`)],
      ),
      ["beforeinput", (e) => {
        const i = e as InputEvent;
        const ranges = i.getTargetRanges().map((r) => `${pos(view, r.startContainer, r.startOffset)}-${pos(view, r.endContainer, r.endOffset)}`);
        record("beforeinput", `type=${i.inputType} data=${show(i.data)} composing=${i.isComposing} ranges=[${ranges.join(",")}]`);
      }],
      ["input", (e) => {
        const i = e as InputEvent;
        record("input", `type=${i.inputType} data=${show(i.data)} composing=${i.isComposing}`);
      }],
    ];
    for (const [type, fn] of this.listeners) view.contentDOM.addEventListener(type, fn, { capture: true, passive: true });
    record("editor", `opened, ${view.state.doc.length} chars`);
  }

  update(update: ViewUpdate) {
    const { view } = this;
    if (!update.docChanged && !update.selectionSet) return;
    const head = update.state.selection.main.head;
    const line = update.state.doc.lineAt(head);
    const where = `composing=${view.composing} head=${head} line=${show(line.text, 60)}`;
    if (!update.docChanged) {
      this.log.add(now(), "select", where);
      return;
    }
    for (const tr of update.transactions) {
      const changes: string[] = [];
      tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => changes.push(`${fromA}-${toA}→${show(inserted.toString(), 40)}`));
      if (changes.length) this.log.add(now(), "doc", `${tr.annotation(Transaction.userEvent) ?? "-"} ${changes.join(" ")}`);
    }
    this.log.add(now(), "after", where);
  }

  destroy() {
    for (const [type, fn] of this.listeners) this.view.contentDOM.removeEventListener(type, fn, { capture: true });
  }
}

export function recorderExtension(log: LogBuffer): Extension {
  return ViewPlugin.define((view) => new Recorder(view, log));
}
