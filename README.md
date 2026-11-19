# IME Guard

Work in progress on a Japanese input problem in the Obsidian editor on iOS: with a hardware keyboard, once the text being converted gets long, what you typed is entered twice.

This first version only **records** what happens. It does not change how typing works.

## Recording the problem

1. Install with [BRAT](https://github.com/TfTHacker/obsidian42-brat) (`kmu/obsidian-ime-guard`) and turn the plugin on.
2. Run **Clear input log** from the command palette.
3. Open a note and type Japanese until the duplication happens. The log holds what you type, so use text you are happy to share.
4. Run **Save input log to a note**. A note named `IME log <date time>.md` appears at the top of the vault.

The log keeps only the latest 20,000 events and stays in memory until you save it.

## Build

```sh
npm install
npm test
npm run lint
npm run build
```
