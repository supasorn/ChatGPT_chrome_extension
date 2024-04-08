let receiverTabId = null; 
// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // Check if the received message is the selected text
  if (request.action === "textSelected") {
    console.log("Selected text:", request.text);
    if (receiverTabId) {
      chrome.tabs.sendMessage(receiverTabId, {action: "insertText", text: request.text});
    }

  } else if (request.action === "markReceiver") {
    receiverTabId = sender.tab.id;
    console.log("Receiver tab marked:", receiverTabId);
  }
});
