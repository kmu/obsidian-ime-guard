export interface Entry {
  /** performance.now() when it happened, in milliseconds. */
  time: number;
  kind: string;
  text: string;
}

/** The latest `size` entries, oldest first. */
export class LogBuffer {
  private items: Entry[] = [];
  dropped = 0;

  constructor(private readonly size: number) {}

  add(time: number, kind: string, text: string) {
    this.items.push({ time, kind, text });
    if (this.items.length > this.size) {
      this.items.shift();
      this.dropped++;
    }
  }

  entries(): readonly Entry[] {
    return this.items;
  }

  clear() {
    this.items = [];
    this.dropped = 0;
  }
}

/** Text in quotes with escapes, so spaces and newlines show; long text keeps its two ends. */
export function show(text: string | null | undefined, max = 80): string {
  if (text === null || text === undefined) return String(text);
  const chars = [...text];
  const cut = chars.length > max ? `${chars.slice(0, max / 2).join("")}…${chars.slice(-max / 2).join("")}` : text;
  return JSON.stringify(cut);
}

/** The saved note: the environment as a list, then the entries with milliseconds since the first one. */
export function formatLog(environment: readonly string[], entries: readonly Entry[], dropped: number): string {
  const start = entries[0]?.time ?? 0;
  const lines = entries.map((e) => `${String(Math.round(e.time - start)).padStart(6)} ${e.kind} ${e.text}`);
  return [
    "# IME Guard input log",
    "",
    ...environment.map((line) => `- ${line}`),
    `- Earlier entries dropped: ${dropped}`,
    "",
    "````",
    ...lines,
    "````",
    "",
  ].join("\n");
}

/** Local "YYYY-MM-DD HH:MM:SS"; `sep` goes between the parts of the time. */
export function stamp(d: Date, sep = ":"): string {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${[d.getHours(), d.getMinutes(), d.getSeconds()].map(two).join(sep)}`;
}
