# Zen Browser Bridge

**Your Zen tabs, connected to your favorite tools.**

Bring [Zen Browser](https://zen-browser.app/) into your workflow. Zen Browser Bridge lets local apps, launchers, and scripts find your open tabs and switch straight to them — including pinned tabs — without opening duplicates or typing into the address bar.

Built for **Zen Browser on macOS**. Firefox is not a supported target; Mozilla Add-ons provides the distribution channel for Zen's Firefox-based extension system.

## What you can do

- **Jump to an existing tab.** Activate the tab you already have open and bring its window into focus.
- **Find pinned tabs.** Let compatible tools list pinned tabs alongside their own search results.
- **Choose your tools.** Use it with Raycast or build your own integration. Raycast is optional.
- **Keep the connection local.** No cloud account, remote server, or analytics. Private tabs are excluded.

This is a bridge for other apps, so it does not add a search panel inside Zen. A compatible client provides the search and controls.

## Install (macOS)

You need [Zen Browser](https://zen-browser.app/), Node.js 22 or newer, and a compatible local client. Installation has two parts: the browser add-on and a small local helper that connects it to your apps.

### 1. Install the local helper

```sh
git clone https://github.com/sandzhaj/Zen-Browser-Bridge.git
cd Zen-Browser-Bridge
node install.cjs
```

The helper needs no administrator access. Run the installer again if you move or upgrade your Node.js installation, or update the helper's code.

### 2. Load the browser add-on

For the current development version, open `about:debugging#/runtime/this-firefox` in **Zen**, choose **Load Temporary Add-on**, and select `addon/manifest.json` from the cloned repository.

Temporary add-ons need to be loaded again after restarting Zen. A permanent installation requires a Mozilla-signed release. Installing the browser add-on alone does not install the local helper.

### 3. Connect your tools

Open your compatible client and use its tab search. For the Raycast integration, open **Search Bookmarks** to find pinned tabs alongside ordinary bookmarks.

## Privacy

Tab URLs and titles are shared with local applications running as your macOS user. Use clients you trust. Zen will ask you to approve this data transmission when installing the add-on, even though the bridge sends nothing to a remote server.

Read the [privacy details](PRIVACY.md).

## Good to know

- Pinned names are read from Zen’s saved session using a per-tab marker stored through the `sessions` API. Renames appear after Zen saves its session and the client refreshes its list. Until an exact match is available, the current page title is shown. The default macOS Zen Profiles directory is supported; custom profile locations are not yet supported.
- Workspace names and the distinction between Essentials and other pinned tabs are not exposed. Essentials appear when Zen reports them as pinned.
- Zen handles workspace selection and sidebar behavior when a tab is activated.

## Build an integration

Any local client that can connect to a Unix socket can use the bridge. See the [protocol and example](docs/PROTOCOL.md) or the [development guide](CONTRIBUTING.md).

## Uninstall

Remove the add-on from Zen and close Zen. Then delete `~/.zen-browser-bridge` and `~/Library/Application Support/Mozilla/NativeMessagingHosts/zen_browser_bridge.json`.

---

An independent community project, not affiliated with Zen Browser or Mozilla. [MIT licensed](LICENSE).
