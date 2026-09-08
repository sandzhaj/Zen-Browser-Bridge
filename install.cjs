const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
if (process.platform !== "darwin") throw new Error("This installer currently supports macOS only.");
const directory = path.join(os.homedir(), ".zen-browser-bridge");
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
fs.copyFileSync(path.join(__dirname, "native/host.cjs"), path.join(directory, "host.cjs"));
const quote = (text) => "'" + text.replaceAll("'", "'\\''") + "'";
const launcher = path.join(directory, "launch");
fs.writeFileSync(launcher, `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(path.join(directory, "host.cjs"))}\n`, {
  mode: 0o700,
});
const manifests = path.join(os.homedir(), "Library/Application Support/Mozilla/NativeMessagingHosts");
fs.mkdirSync(manifests, { recursive: true });
fs.writeFileSync(
  path.join(manifests, "zen_browser_bridge.json"),
  JSON.stringify(
    {
      name: "zen_browser_bridge",
      description: "Zen Browser Bridge",
      path: launcher,
      type: "stdio",
      allowed_extensions: ["zen-browser-bridge@sandzhaj"],
    },
    null,
    2,
  ),
);
console.log("Native host installed. Load addon/manifest.json in Zen about:debugging for development.");
