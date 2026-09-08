# Privacy

Zen Browser Bridge sends nonprivate tab URLs, titles, tab/window identifiers, and pinned status to its local native host when a local client requests a tab list. This is declared as browsing activity and website content in the browser installation consent. The bridge does not send data to a remote service or include analytics.

The host makes this information available through a Unix socket to applications running as the same operating-system user. Only use clients you trust. The host does not persist tab lists; the add-on keeps first-observed pinned titles in memory until a tab closes, is unpinned, or the add-on restarts. Private tabs are excluded.

Remove the add-on to stop access. Remove the native host using the README instructions to remove the local integration.
