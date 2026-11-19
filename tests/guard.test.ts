import { describe, expect, it } from "vitest";
import { StaleTracker } from "../src/guard";

/** A document the tracker can read, standing in for the editor. */
function doc(text: string) {
  return (from: number, to: number) => text.slice(from, to);
}

describe("StaleTracker", () => {
  it("finds the leftover of a composition that restarted further on (the iPad log)", () => {
    // "…いえる。" ends at 6 here; the composition starts there
    let text = "abcdef";
    const t = new StaleTracker();
    t.start();
    t.update("s");
    t.beforeInput(6, 6, doc(text));
    text = "abcdefs";
    t.update("し");
    t.beforeInput(6, 7, doc(text));
    text = "abcdefし";
    t.update("しk");
    t.beforeInput(6, 7, doc(text));
    text = "abcdefしk";
    t.update("しき");
    t.beforeInput(6, 8, doc(text));
    // the editor never took in "しき"; the next update starts after the old "しk"
    t.update("しきい");
    t.beforeInput(8, 8, doc(text));
    text = "abcdefしkしきい";
    t.update("しきいち");
    t.beforeInput(8, 11, doc(text));
    t.end();
    expect(t.pending()).toEqual({ from: 6, to: 8, text: "しk" });
  });

  it("finds nothing in ordinary typing, where every update covers the same start", () => {
    const text = "xx";
    const t = new StaleTracker();
    t.start();
    for (const [data, to] of [["k", 2], ["こ", 3], ["こn", 3], ["この", 4]] as const) {
      t.update(data);
      t.beforeInput(2, to, doc(text));
    }
    t.end();
    expect(t.pending()).toBeNull();
  });

  it("does not touch text that is not a leftover of this composition", () => {
    // the start moved, but what lies behind is not something this composition showed
    const text = "abcdefXY";
    const t = new StaleTracker();
    t.start();
    t.update("し");
    t.beforeInput(6, 6, doc(text));
    t.update("しき");
    t.beforeInput(8, 8, doc(text));
    t.end();
    expect(t.pending()).toBeNull();
  });

  it("keeps the leftover's place when text before it changes", () => {
    const t = new StaleTracker();
    t.start();
    t.update("しk");
    t.beforeInput(6, 6, doc("abcdefしk"));
    t.update("しきい");
    t.beforeInput(8, 8, doc("abcdefしk"));
    t.end();
    // two characters inserted at the start of the line
    t.map((pos) => pos + 2);
    expect(t.pending()).toEqual({ from: 8, to: 10, text: "しk" });
  });

  it("forgets a leftover once it is cleared or a new tracking starts without one", () => {
    const t = new StaleTracker();
    t.start();
    t.update("しk");
    t.beforeInput(0, 0, doc("しk"));
    t.update("しきい");
    t.beforeInput(2, 2, doc("しk"));
    t.end();
    t.clear();
    expect(t.pending()).toBeNull();
  });

  it("keeps a found leftover through a following composition until it is cleared", () => {
    const t = new StaleTracker();
    t.start();
    t.update("しk");
    t.beforeInput(0, 0, doc("しk"));
    t.update("しきい");
    t.beforeInput(2, 2, doc("しk"));
    t.end();
    t.start();
    t.update("g");
    t.beforeInput(9, 9, doc("しkしきいちですg"));
    t.end();
    expect(t.pending()).toEqual({ from: 0, to: 2, text: "しk" });
  });

  it("leaves alone a first part the IME commits while it goes on composing the rest", () => {
    const t = new StaleTracker();
    t.start();
    t.update("このような");
    t.beforeInput(0, 0, doc("このような"));
    // the IME keeps "このような" and composes only the rest
    t.update("も");
    t.beforeInput(5, 5, doc("このような"));
    t.end();
    expect(t.pending()).toBeNull();
  });

  it("finds a confirmed text put after the composition instead of in its place (the second iPad log)", () => {
    // "…よりはh" ends at 4 here; the composition "はるかに" covers 4-8
    const text = "よりはhはるかに";
    const t = new StaleTracker();
    t.start();
    t.update("はるかに");
    t.beforeInput(4, 8, doc(text));
    t.deleteText(4, 8);
    // the confirmed text goes in at 8, after the composition, which was never removed
    t.confirm(8, "はるかに", doc(text));
    t.end();
    expect(t.pending()).toEqual({ from: 4, to: 8, text: "はるかに", repeat: true });
  });

  it("finds nothing when the confirmed text goes where the composition was, as usual", () => {
    const t = new StaleTracker();
    t.start();
    t.update("正当化");
    t.beforeInput(4, 7, doc("abcd正当化"));
    t.deleteText(4, 7);
    t.confirm(4, "正当化", doc("abcd正当化"));
    t.end();
    expect(t.pending()).toBeNull();
  });

  it("finds nothing when the confirmed text differs from the composition left in place", () => {
    const t = new StaleTracker();
    t.start();
    t.update("さr");
    t.deleteText(4, 6);
    t.confirm(6, "さr", doc("abcdされ"));
    t.end();
    expect(t.pending()).toBeNull();
  });
});
