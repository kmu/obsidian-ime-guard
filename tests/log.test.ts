import { describe, expect, it } from "vitest";
import { formatLog, LogBuffer, show, stamp } from "../src/log";

describe("LogBuffer", () => {
  it("keeps entries in order and drops the oldest past its size", () => {
    const log = new LogBuffer(3);
    for (const n of [1, 2, 3, 4]) log.add(n, "key", `k${n}`);
    expect(log.entries().map((e) => e.text)).toEqual(["k2", "k3", "k4"]);
    expect(log.dropped).toBe(1);
  });

  it("can be cleared", () => {
    const log = new LogBuffer(3);
    log.add(1, "key", "a");
    log.clear();
    expect(log.entries()).toEqual([]);
    expect(log.dropped).toBe(0);
  });
});

describe("show", () => {
  it("quotes text so spaces, newlines and empty strings are visible", () => {
    expect(show("今日 は\n")).toBe('"今日 は\\n"');
    expect(show("")).toBe('""');
    expect(show(null)).toBe("null");
  });

  it("shortens long text, keeping both ends", () => {
    const long = "あ".repeat(50) + "い".repeat(50);
    const shown = show(long, 20);
    expect(shown.startsWith('"ああ')).toBe(true);
    expect(shown.endsWith('いい"')).toBe(true);
    expect(shown).toContain("…");
  });
});

describe("formatLog", () => {
  it("writes the environment, then one line per entry with time since the first", () => {
    const text = formatLog(["Obsidian 1.15.1", "iPadOS"], [
      { time: 1000, kind: "compositionstart", text: 'data=""' },
      { time: 1012.4, kind: "doc", text: 'insert 0-0 "きょ"' },
    ], 0);
    expect(text).toContain("- Obsidian 1.15.1\n- iPadOS");
    expect(text).toContain("     0 compositionstart data=\"\"");
    expect(text).toContain("    12 doc insert 0-0 \"きょ\"");
    expect(text).toMatch(/````\n[\s\S]*\n````/);
  });

  it("says how many early entries were dropped", () => {
    expect(formatLog([], [], 5)).toContain("5");
  });
});

describe("stamp", () => {
  it("writes a local date and time for file names and the log header", () => {
    const d = new Date(2026, 10, 19, 8, 5, 3);
    expect(stamp(d)).toBe("2026-11-19 08:05:03");
    expect(stamp(d, "")).toBe("2026-11-19 080503");
  });
});
