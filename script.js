prettyHtml = function(diffs) {
  var html = [];
  var pattern_amp = /&/g;
  var pattern_lt = /</g;
  var pattern_gt = />/g;
  var pattern_para = /\n/g;
  for (var x = 0; x < diffs.length; x++) {
    var op = diffs[x][0];    // Operation (insert, delete, equal)
    var data = diffs[x][1];  // Text of change.
    var text = data.replace(pattern_amp, '&amp;').replace(pattern_lt, '&lt;')
        .replace(pattern_gt, '&gt;').replace(pattern_para, '<br>');
    switch (op) {
      case DIFF_INSERT:
        html[x] = '<ins style="color:#00BB00">' + text + '</ins>';
        break;
      case DIFF_DELETE:
        html[x] = '<del style="color:red">' + text + '</del>';
        break;
      case DIFF_EQUAL:
        html[x] = '<span>' + text + '</span>';
        break;
    }
  }
  return html.join('');
};

var isReceiverTab = false;

$(document).ready(function() {
  $(document).mouseup(function(e) {
    if (!isReceiverTab) 
      return;

    var selectedText = "";
    if (window.getSelection) {
      selectedText = window.getSelection().toString();
    } else if (document.selection && document.selection.type != "Control") {
      selectedText = document.selection.createRange().text;
    }
    if (selectedText.length > 0) {
      // chrome.runtime.sendMessage({ action: "textSelected", text: selectedText });
      // console.log("message sent");
      clipboard.copy("check grammar: " + selectedText);
    }
  });

  $(document).keydown(function(e) {
    if (e.key === 'M' && e.shiftKey && e.ctrlKey) {
      // Prevent default action to avoid any conflict with browser shortcuts
      // e.preventDefault();
      // Send a message to the background script to mark this tab as the receiver
      // console.log("mark target");
      // chrome.runtime.sendMessage({ action: "markReceiver", tabId: e.target });
      // toggle the receiver tab
      isReceiverTab = !isReceiverTab;
      console.log(isReceiverTab ? "Receiver tab marked" : "Receiver tab unmarked");
    }
  });


  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "insertText") {
      console.log("in");
      var textbox = $("#prompt-textarea");
      // console.log($('td[_key="."]'));
      // $('td[_key="."]').click();
      console.log(textbox);
      console.log(textbox.text());
      if (textbox && textbox.text() === ".") {
        console.log("t", textbox);
        $(textbox).html('check grammar: \n' + request.text);
        $(textbox).focus();
        $(textbox).parent().find("button[data-testid='send-button']").mousedown().mouseup();
        // $(textbox).parents().append(html);
      }
    }
  });


  function updateDiff() {
    // iterate over all div[data-message-author-role='assistant']
    let div = $("div[data-message-author-role='assistant']");
    // for each div, repeat its text
    for (let i = 0; i < div.length; i++) {
      // check if div has the word "<END>", if so replace it with "REPLACED
      let text = $(div[i]).text();
      let hotword = "<END>";
      if (text.includes(hotword)) {
        // get "revised" text between "REVISED:" and "<END>"
        let revised = text.substring(text.indexOf("REVISED:") + 8, text.indexOf(hotword));

        let currentblock = $(div[i]).closest("article.text-token-text-primary").prev();

        const userdiv = "div[data-message-author-role='user']";
        // if  doesn't exist or doesn't contain the symbol ":", keep going up
        while (currentblock.find(userdiv).length === 0 || currentblock.find(userdiv).text().indexOf(":") === -1) {
          currentblock = currentblock.prev();
          if (currentblock.length === 0) {
            break;
          }
        }
        if (currentblock.length === 0) {
          continue;
        }
        let usertext = currentblock.find(userdiv).text();

        // find the string after the last ':'
        usertext = usertext.substring(usertext.lastIndexOf(":") + 1);

        text = text.replace(hotword.trim(), usertext.trim());

        var dmp = new diff_match_patch();
        var diff = dmp.diff_main(usertext, revised);
        dmp.diff_cleanupSemantic(diff);
        let html = prettyHtml(diff);
        $(div[i]).html($(div[i]).html().replace("&lt;END&gt;", ""));
        $(div[i]).append('<div class="markdown prose w-full break-words dark:prose-invert dark">DIFF:' + html + '</div>');
      }
    }
  }

  // wait 5 seconds before calling
  // setTimeout(function() {
  // }, 5000);
  var timer;
  const observer = new MutationObserver((mutations) => {
    // reset timer and start count down again
    clearTimeout(timer);
    timer = setTimeout(() => {
      updateDiff();
    }, 1000);
  });

  observer.observe(document.body, { childList: true, subtree: true });

});
