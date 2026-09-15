/* global browser */
const session = crypto.randomUUID();
const markedTabs = new Map();

async function handleRequest(request) {
  if (request.method === "list") {
    const tabs = await browser.tabs.query(
      typeof request.pinned === "boolean" ? { pinned: request.pinned } : {},
    );
    return Promise.all(
      tabs
        .filter((tab) => !tab.incognito && tab.id != null)
        .map(async (tab) => {
          const id = `${session}:${tab.id}`;
          if (tab.pinned) {
            if (!markedTabs.has(tab.id)) {
              const marking = browser.sessions
                .setTabValue(tab.id, "bridge-tab-id", id)
                .catch(() => {
                  markedTabs.delete(tab.id);
                });
              markedTabs.set(tab.id, marking);
            }
            await markedTabs.get(tab.id);
          }
          return {
            id: `${session}:${tab.id}`,
            session,
            tabId: tab.id,
            url: tab.url || "about:blank",
            title: tab.title || tab.url || "Tab",
            pageTitle: tab.title || "",
            pinned: tab.pinned,
            windowId: tab.windowId,
          };
        }),
    );
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

browser.tabs.onRemoved.addListener((tabId) => markedTabs.delete(tabId));
browser.tabs.onUpdated.addListener((tabId, change) => {
  if (change.pinned === false) markedTabs.delete(tabId);
});

function connect() {
  const port = browser.runtime.connectNative("zen_browser_bridge");
  port.onMessage.addListener(async (request) => {
    try {
      port.postMessage({
        id: request.id,
        result: await handleRequest(request),
      });
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
