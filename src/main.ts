import { Notice, Platform, Plugin, apiVersion, normalizePath } from "obsidian";
import { formatLog, LogBuffer, stamp } from "./log";
import { recorderExtension } from "./recorder";
import { t } from "./t";

/** About ten minutes of steady typing. */
const LOG_SIZE = 20000;

export default class ImeGuardPlugin extends Plugin {
  private readonly log = new LogBuffer(LOG_SIZE);

  onload() {
    this.registerEditorExtension(recorderExtension(this.log));
    this.addCommand({ id: "save-log", name: t("command.save"), callback: () => void this.saveLog() });
    this.addCommand({
      id: "clear-log",
      name: t("command.clear"),
      callback: () => {
        this.log.clear();
        new Notice(t("notice.cleared"));
      },
    });
  }

  private environment(): string[] {
    const kind = Platform.isIosApp ? "iOS app" : Platform.isAndroidApp ? "Android app" : "desktop";
    const size = Platform.isTablet ? "tablet" : Platform.isPhone ? "phone" : "";
    return [
      `IME Guard ${this.manifest.version}, Obsidian API ${apiVersion}`,
      `${kind} ${size}`.trim(),
      `Saved: ${stamp(new Date())}`,
    ];
  }

  private async saveLog() {
    const path = normalizePath(`IME log ${stamp(new Date(), "")}.md`);
    await this.app.vault.create(path, formatLog(this.environment(), this.log.entries(), this.log.dropped));
    new Notice(t("notice.saved", { path }));
  }
}
