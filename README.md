# IME Guard

Work in progress on a Japanese input problem in the Obsidian editor on iOS: with a hardware keyboard, once the text being converted gets long, what you typed is entered twice.

## What it does

- **Removes the duplicated text.** In ordinary typing, every step of a conversion starts at the same place. When the editor redraws in the middle of a conversion, iOS loses track of it and types the whole conversion again further on, leaving an earlier state of it behind (for example `しkしきい` instead of `しきい`). IME Guard notices when the start moves on like that and, once the conversion is done and typing has paused for a moment, deletes the part left behind. It never edits the note while a conversion is running.
- **Records** what happens, so a case it misses can be looked into.

## Recording a problem

1. Install with [BRAT](https://github.com/TfTHacker/obsidian42-brat) (`kmu/obsidian-ime-guard`) and turn the plugin on.
2. Run **Clear input log** from the command palette.
3. Open a note and type Japanese until the problem happens. The log holds what you type, so use text you are happy to share.
4. Run **Save input log to a note**. A note named `IME log <date time>.md` appears at the top of the vault.

The log keeps only the latest 20,000 events and stays in memory until you save it. Lines starting with `guard` show what IME Guard found and removed.

## Build

```sh
npm install
npm test
npm run lint
npm run build
```
