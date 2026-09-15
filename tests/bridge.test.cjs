const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const os = require("node:os");
const net = require("node:net");
const { spawn } = require("node:child_process");
const { once } = require("node:events");

function addon() {
  const calls = [];
  const markers = [];
  const tabs = [
    {
      id: 5,
      windowId: 2,
      pinned: true,
      title: "Custom title",
      url: "https://example.com",
    },
    { id: 6, pinned: true, incognito: true },
    { id: 7, windowId: 2, pinned: false, title: "Ordinary tab" },
  ];
  const context = vm.createContext({
    crypto: { randomUUID: () => "session-1" },
    setTimeout,
    browser: {
      sessions: { setTabValue: async (...args) => markers.push(args) },
      tabs: {
        onRemoved: { addListener() {} },
        onUpdated: { addListener() {} },
        query: async (query) =>
          tabs.filter(
            (tab) => query.pinned === undefined || tab.pinned === query.pinned,
          ),
        get: async (id) => tabs.find((tab) => tab.id === id),
        update: async (...args) => calls.push(["tab", ...args]),
      },
      windows: { update: async (...args) => calls.push(["window", ...args]) },
      runtime: {
        connectNative: () => ({
          onMessage: { addListener() {} },
          onDisconnect: { addListener() {} },
        }),
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../addon/background.js"), "utf8"),
    context,
  );
  return {
    request: (value) => context.handleRequest(value),
    calls,
    tabs,
    markers,
  };
}

test("lists nonprivate pins and activates the exact existing ID without navigation", async () => {
  const { request, calls } = addon();
  const tabs = await request({ method: "list", pinned: true });
  assert.equal(tabs.length, 1);
  assert.equal(tabs[0].title, "Custom title");
  await request({
    method: "activate",
    session: tabs[0].session,
    tabId: tabs[0].tabId,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ["tab", 5, { active: true }],
    ["window", 2, { focused: true }],
  ]);
});

test("rejects stale sessions and private tabs without activation", async () => {
  const { request, calls } = addon();
  await assert.rejects(
    request({ method: "activate", session: "old", tabId: 5 }),
    /expired/,
  );
  await assert.rejects(
    request({ method: "activate", session: "session-1", tabId: 6 }),
    /not available/,
  );
  assert.equal(calls.length, 0);
});

test(
  "native host round trip over private socket and fragmented native frames",
  { timeout: 10000 },
  async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "zr-"));
    const child = spawn(
      process.execPath,
      [path.join(__dirname, "../native/host.cjs")],
      {
        env: { ...process.env, HOME: home },
      },
    );
    try {
      const directory = path.join(home, ".zen-browser-bridge");
      let socketPath;
      for (let i = 0; i < 100; i++) {
        const files = fs.existsSync(directory) ? fs.readdirSync(directory) : [];
        if (files.length) {
          socketPath = path.join(directory, files[0]);
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      assert.ok(socketPath);
      assert.equal(fs.statSync(socketPath).mode & 0o777, 0o600);
      const socket = net.createConnection(socketPath);
      const response = new Promise((resolve, reject) => {
        socket.once("data", resolve);
        socket.once("error", reject);
      });
      socket.write('{"method":"list"}\n');
      let buffer = Buffer.alloc(0);
      const request = await new Promise((resolve) =>
        child.stdout.on("data", (chunk) => {
          buffer = Buffer.concat([buffer, chunk]);
          if (buffer.length >= 4 && buffer.length >= 4 + buffer.readUInt32LE(0))
            resolve(JSON.parse(buffer.subarray(4).toString()));
        }),
      );
      assert.equal(request.method, "list");
      const body = Buffer.from(
        JSON.stringify({ id: request.id, result: [{ tabId: 5 }] }),
      );
      const header = Buffer.alloc(4);
      header.writeUInt32LE(body.length);
      child.stdin.write(header.subarray(0, 2));
      child.stdin.write(Buffer.concat([header.subarray(2), body]));
      assert.equal(JSON.parse((await response).toString()).result[0].tabId, 5);
      socket.destroy();
      const exited = once(child, "exit");
      child.stdin.end();
      await exited;
      assert.equal(fs.existsSync(socketPath), false);
    } finally {
      child.kill();
      fs.rmSync(home, { recursive: true, force: true });
    }
  },
);

test("generic clients can list and activate ordinary tabs", async () => {
  const { request, calls } = addon();
  assert.equal((await request({ method: "list" })).length, 2);
  const tabs = await request({ method: "list", pinned: false });
  assert.equal(tabs.length, 1);
  assert.equal(tabs[0].tabId, 7);
  await request({ method: "activate", session: tabs[0].session, tabId: 7 });
  assert.equal(calls[0][1], 7);
});

test("marks only nonprivate pinned tabs once with exact live identity", async () => {
  const { request, markers } = addon();
  await request({ method: "list" });
  await request({ method: "list" });
  assert.deepEqual(markers, [[5, "bridge-tab-id", "session-1:5"]]);
});
