chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.tabs.sendMessage(tab.id, { type: "TEGAKARI_TOGGLE" })
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
