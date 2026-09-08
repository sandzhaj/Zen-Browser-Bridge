# Local bridge protocol

Protocol version: 0.2

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

