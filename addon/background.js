/* global browser */
const session = crypto.randomUUID();
// Preserve the first observed pinned title before loading replaces it with the page title.
// Scope to the live tab ID, never the URL (different pins may share a URL).
const pinnedTitles = new Map();

async function handleRequest(request) {
  if (request.method === "list") {
    const tabs = await browser.tabs.query(typeof request.pinned === "boolean" ? { pinned: request.pinned } : {});
    return tabs
      .filter((tab) => !tab.incognito && tab.id != null)
      .map((tab) => {
        if (tab.pinned && tab.title && !pinnedTitles.has(tab.id)) pinnedTitles.set(tab.id, tab.title);
        return {
          id: `${session}:${tab.id}`,
          session,
          tabId: tab.id,
          url: tab.url || "about:blank",
          title: (tab.pinned && pinnedTitles.get(tab.id)) || tab.title || tab.url || "Tab",
          pageTitle: tab.title || "",
          pinned: tab.pinned,
          windowId: tab.windowId,
        };
      });
  }
  if (request.method === "activate") {
    if (request.session !== session || !Number.isInteger(request.tabId)) {
      throw new Error("Tab list expired. Request a fresh list.");
    }
    const tab = await browser.tabs.get(request.tabId);
    if (tab.incognito) throw new Error("This tab is not available.");
    await browser.tabs.update(tab.id, { active: true });
    await browser.windows.update(tab.windowId, { focused: true });
    return true;
  }
  throw new Error("Unknown bridge command.");
}

browser.tabs.onRemoved.addListener((tabId) => pinnedTitles.delete(tabId));
browser.tabs.onUpdated.addListener((tabId, change) => {
  if (change.pinned === false) pinnedTitles.delete(tabId);
});

function connect() {
  const port = browser.runtime.connectNative("zen_browser_bridge");
  port.onMessage.addListener(async (request) => {
    try {
      port.postMessage({ id: request.id, result: await handleRequest(request) });
    } catch (error) {
      port.postMessage({ id: request.id, error: error.message });
    }
  });
  port.onDisconnect.addListener(() => {
    // Reading lastError suppresses Firefox's unhandled disconnect warning.
    void browser.runtime.lastError;
    setTimeout(connect, 5000);
  });
}
connect();
