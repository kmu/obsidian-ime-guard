export type Locale = "en" | "ja";

const en = {
  "command.save": "Save input log to a note",
  "command.clear": "Clear input log",
  "notice.saved": "Saved the input log to {path}.",
  "notice.cleared": "Cleared the input log.",
} as const;

export type MessageKey = keyof typeof en;

const ja: Record<MessageKey, string> = {
  "command.save": "入力記録をノートに保存",
  "command.clear": "入力記録を消去",
  "notice.saved": "入力記録を {path} に保存しました。",
  "notice.cleared": "入力記録を消去しました。",
};

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = { en, ja };

/** Japanese for `ja` and its regional variants; English for everything else. */
export function pickLocale(lang: string | null | undefined): Locale {
  return typeof lang === "string" && (lang === "ja" || lang.startsWith("ja-")) ? "ja" : "en";
}

export function translate(locale: Locale, key: MessageKey, params?: Record<string, string | number>): string {
  let text = MESSAGES[locale][key];
  for (const [name, value] of Object.entries(params ?? {})) text = text.split(`{${name}}`).join(String(value));
  return text;
}
