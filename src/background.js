import { getBrowser, getCurrentTabInfo, showBadge, removeBadge } from "./browser";
import { loadTabMetadata } from "./cache";
import { getConfiguration, isConfigurationComplete } from "./configuration";
import { LinkdingApi } from "./linkding";

const browser = getBrowser();
let api = null;
let configuration = null;
let hasCompleteConfiguration = false;

let highlightingEnabled = false;

async function initApi() {
  if (api) {
    return true;
  }

  configuration = await getConfiguration();
  hasCompleteConfiguration = isConfigurationComplete(configuration);

  if (hasCompleteConfiguration) {
    api = new LinkdingApi(configuration);
  } else {
    api = null;
  }

  return api !== null;
}

/* Dynamic badge */
async function setDynamicBadge(tabId, tabMetadata) {
  // Set badge if tab is bookmarked
  if (tabMetadata?.bookmark) {
    showBadge(tabId);
  } else {
    removeBadge(tabId);
  }
}

/* Omnibox / Search integration */

browser.omnibox.onInputStarted.addListener(async () => {
  const isReady = await initApi();
  const description = isReady
    ? "Search bookmarks in linkding"
    : "⚠️ Please configure the linkding extension first";

  browser.omnibox.setDefaultSuggestion({ description });
});

browser.omnibox.onInputChanged.addListener((text, suggest) => {
  if (!api) {
    return;
  }

  api
    .search(text, { limit: 5 })
    .then((results) => {
      const bookmarkSuggestions = results.map((bookmark) => ({
        content: bookmark.url,
        description: bookmark.title || bookmark.website_title || bookmark.url,
      }));
      suggest(bookmarkSuggestions);
    })
    .catch((error) => {
      console.error(error);
    });
});

browser.omnibox.onInputEntered.addListener(async (content, disposition) => {
  if (!hasCompleteConfiguration || !content) {
    return;
  }

  const isUrl = /^http(s)?:\/\//.test(content);
  const url = isUrl
    ? content
    : `${configuration.baseUrl}/bookmarks?q=${encodeURIComponent(content)}`;

  // Edge doesn't allow updating the New Tab Page (tested with version 117).
  // Trying to do so will throw: "Error: Cannot update NTP tab."
  // As a workaround, open a new tab instead.
  if (disposition === "currentTab") {
    const tabInfo = await getCurrentTabInfo();
    if (tabInfo.url === "edge://newtab/") {
      disposition = "newForegroundTab";
    }
  }

  switch (disposition) {
    case "currentTab":
      browser.tabs.update({ url });
      break;
    case "newForegroundTab":
      browser.tabs.create({ url });
      break;
    case "newBackgroundTab":
      browser.tabs.create({ url, active: false });
      break;
  }
});

/* Precache bookmark / website metadata when tab or URL changes */

browser.tabs.onActivated.addListener(async (activeInfo) => {
  const tabInfo = await getCurrentTabInfo();
  let tabMetadata = await loadTabMetadata(tabInfo.url, true);
  setDynamicBadge(activeInfo.tabId, tabMetadata);
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only interested in URL changes
  // Ignore URL changes in non-active tabs
  if (!changeInfo.url || !tab.active) {
    return;
  }

  let tabMetadata = await loadTabMetadata(tab.url, true);
  setDynamicBadge(tabId, tabMetadata);
});

browser.runtime.onMessage.addListener((message, sender) => {
  return new Promise(async (resolve) => {
    if (message.action === "highlight") {
      console.log("Sending highlight to linkding: ", message.markdown);

      const conf = await getConfiguration();
      hasCompleteConfiguration = isConfigurationComplete(conf);

      if (!hasCompleteConfiguration) {
        console.log("Highlighting not enabled: Incomplete configuration")
        return resolve();
      }

      const ld = new LinkdingApi(conf);
      const active = await ld.getActiveNote();

      if (!active) {
        console.log("No active bookmark")
        return resolve();
      }

      const response = await ld.updateBookmark(active.id, {
        notes: `${active.notes}\n\nFrom ${message.url}:\n\n> ${message.markdown}`
      });

      console.log("response", response);
    }
    else if (message.action === "getHighlightingEnabled") {
      return resolve({ enabled: highlightingEnabled });
    }
    else if (message.action === "toggleHighlighting") {
      highlightingEnabled = !highlightingEnabled;
      return resolve({ enabled: highlightingEnabled })
    }

    resolve();
  });
});
