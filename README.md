# Zen Browser Bridge

A standalone WebExtension and Native Messaging host exposing browser tabs to local applications. Raycast is one client; scripts, launchers, and other local tools can use the same protocol. No Raycast libraries or installation are required.

## Install (macOS)

Run `node install.cjs` from this directory, then load `addon/manifest.json` using Zen's `about:debugging` page. Temporary add-ons must be loaded again after restarting Zen. Permanent installation requires a signed XPI. The installer records the current Node executable path; run it again if Node moves.

Upgrading from Zen Raycast Bridge: remove the old temporary add-on, install this host, then load the new manifest. After the old add-on is removed, the old `~/.zen-raycast-bridge` directory and `~/Library/Application Support/Mozilla/NativeMessagingHosts/zen_raycast_bridge.json` can be deleted. No legacy transport fallback is included.

## Protocol (0.2)

Discover `*.sock` files in `~/.zen-browser-bridge`. Each connected browser profile has its own socket. Stale sockets can remain after a crash: ignore connection failures. Connect using a Unix socket, send one UTF-8 JSON object followed by a newline, and read one newline-terminated JSON response. Use a timeout (7 seconds recommended). Requests and responses must fit within 1 MiB. The connection closes after the response.

Requests:

- `{"method":"list"}` — all nonprivate tabs.
- `{"method":"list","pinned":true}` — only pinned tabs; `false` selects unpinned tabs.
- `{"method":"activate","session":"SESSION_FROM_LIST","tabId":123}` — activate an existing nonprivate tab and focus its window. Send to the socket that supplied that tab.

Success: `{"id":"TRANSPORT_ID","result":...}`. Failure: `{"id":"TRANSPORT_ID","error":"message"}` (transport validation failures may omit `id`). The host generates `id`; clients do not need to send it.

List results contain `id` (session-qualified tab identity), `session`, `tabId`, `windowId`, `pinned`, `title`, and `url`. Activation returns `true`. Session identifiers prevent reuse of stale results after browser restart. Closed tabs return an error; no new tab is created. Activation and window focus are sequential: a focus failure can be reported after the tab has already activated.

Example with Node.js, passing a discovered socket path as the argument:

```sh
node -e 'const s=require("node:net").createConnection(process.argv[1]); s.setTimeout(7000,()=>s.destroy()); s.on("connect",()=>s.write(JSON.stringify({method:"list"})+"\n")); s.on("data",b=>process.stdout.write(b)); s.on("error",console.error)' "$SOCKET_PATH"
```

The bridge exposes only listing and activation. Titles come from the standard browser API; Zen-specific workspace names and sidebar aliases are not exposed. Private tabs are excluded. Local processes running as your user can use the bridge; directory/socket permissions restrict access by other users. No TCP listener, remote access, UI automation, or browser-profile editing is involved.

Pinned titles: `title` preserves the first nonempty title observed for each pinned tab during the companion session. `pageTitle` always contains the current API title. This prevents page loading from overwriting an initially visible pinned name. It cannot recover an alias already missing from the API at first observation, and resets when the companion restarts. Unpinning or closing the tab clears its preserved title. Sidebar renames after first observation are not detected by this mechanism.

## Development

Requires Node.js 22 or newer. Run `npm ci`, `npm test`, `npm run lint`, and `npm run build`. Tests use Node's test runner and a real native-host subprocess; they do not need a browser. Build output in `web-ext-artifacts` is unsigned. Load `addon/manifest.json` in Zen to test browser-specific behavior manually.

## Automated publication

The `Test and publish` GitHub Actions workflow runs tests, Mozilla's extension validator, and packaging on Linux and macOS for pull requests and pushes to `main`. After successful checks on `main`, it submits a **listed** version to Mozilla Add-ons (AMO). Manual runs on `main` are also supported. Mozilla review can delay or reject publication; a successful upload is not a promise of immediate store availability.

One-time setup:

1. Sign in to [Mozilla Add-ons Developer Hub](https://addons.mozilla.org/developers/) and accept its developer agreement.
2. Generate [AMO API credentials](https://addons.mozilla.org/developers/addon/api/key/).
3. In this GitHub repository's **Settings → Secrets and variables → Actions**, add `AMO_JWT_ISSUER` and `AMO_JWT_SECRET`. Never commit these values.
4. Merge into `main` or launch the workflow manually on `main`.

The first submission creates the listing using `amo-metadata.json`; further submissions update the same extension ID. CI assigns a unique `0.2.RUN_NUMBER.RUN_ATTEMPT` manifest version without committing generated versions. Reruns create another version; rerun only the latest main publication to avoid submitting an older version after a newer one. Download the exact unsigned submission ZIP from the workflow artifact. The signed store version is distributed by AMO.

The native host is **not** installed by AMO or bundled into the browser add-on ZIP. Users must clone this repository and run `npm run host:install` separately. Host changes require reinstalling the host. Browser add-on updates keep the same extension ID and native host name.

The store manifest requires Firefox/Gecko 142+ to use the built-in data-transmission consent (including Zen versions based on compatible Gecko). URLs and titles go to local clients, so the manifest declares that transmission even though the bridge has no remote server. See [PRIVACY.md](PRIVACY.md).
