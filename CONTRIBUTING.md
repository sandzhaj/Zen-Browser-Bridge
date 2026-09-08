# Contributing

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

## Migrating from Zen Raycast Bridge

Remove the old temporary add-on, install this host, then load `addon/manifest.json`. After removing the old add-on, you can delete `~/.zen-raycast-bridge` and `~/Library/Application Support/Mozilla/NativeMessagingHosts/zen_raycast_bridge.json`.
