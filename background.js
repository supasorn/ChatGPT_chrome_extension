chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // Check if the received message is the selected text
  if (request.action === "textSelected") {
    console.log("Selected text:", request.text);
    chrome.storage.local.get("receiverTabId", (data) => {
      if (data.receiverTabId) {
        chrome.tabs.sendMessage(data.receiverTabId, { action: "insertText", text: request.text });
      } else {
        console.log("No receiver tab marked.");
      }
    });

  } else if (request.action === "markReceiver") {
    const receiverTabId = sender.tab.id;
    chrome.storage.local.set({ receiverTabId: receiverTabId }, () => {
      console.log("Receiver tab marked:", receiverTabId);
    });
  }
});
