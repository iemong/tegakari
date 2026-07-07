chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.tabs.sendMessage(tab.id, { type: "TEGAKARI_TOGGLE" })
  }
})

const CONTEXT_MENU_ID = "tegakari-select-element"

// Context menu entry to annotate the right-clicked element (#37). The menu is
// (re)created in onInstalled — calling `contextMenus.create` at the top level
// would throw "duplicate id" on every MV3 service-worker restart.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: "tegakari: この要素を選択",
      contexts: ["all"],
    })
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  // frameId 0 = top frame only. Right-clicks inside an iframe aren't observed
  // by the top-frame content script, so ignore them rather than annotate a
  // stale element from a previous top-frame right-click.
  if (
    info.menuItemId === CONTEXT_MENU_ID &&
    info.frameId === 0 &&
    tab?.id
  ) {
    chrome.tabs.sendMessage(tab.id, { type: "TEGAKARI_CONTEXT_SELECT" })
  }
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "TEGAKARI_OPEN_OPTIONS") {
    // `chrome.runtime.openOptionsPage()` silently no-ops in some Chromium
    // derivatives (notably Arc), even when `options_ui.open_in_tab` is true.
    // Opening the options page as a plain tab works uniformly across
    // Chrome / Arc / Edge / Brave.
    chrome.tabs.create({ url: chrome.runtime.getURL("options.html") })
    return false
  }
  if (message?.type === "TEGAKARI_CAPTURE") {
    chrome.tabs
      .captureVisibleTab({ format: "png" })
      .then((dataUrl) => {
        sendResponse({ success: true, dataUrl })
      })
      .catch((error) => {
        sendResponse({ success: false, error: String(error) })
      })
    return true // keep channel open for async response
  }
})
