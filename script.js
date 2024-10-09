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

$(document).ready(function() {
  // $("form").keypress(function(event) {
  // if (event.keyCode == 13 && !event.shiftKey) {
  // console.log("done");
  // submitForm(); //Submit your form here
  // return false;
  // }
  // });
  $(document).mouseup(function(e) {
    var selectedText = "";
    if (window.getSelection) {
      selectedText = window.getSelection().toString();
    } else if (document.selection && document.selection.type != "Control") {
      selectedText = document.selection.createRange().text;
    }
    if (selectedText.length > 0) {
      chrome.runtime.sendMessage({ action: "textSelected", text: selectedText });
      console.log("message sent");
    }
  });

  $(document).keydown(function(e) {
    if (e.key === 'M' && e.shiftKey && e.ctrlKey) {
      // Prevent default action to avoid any conflict with browser shortcuts
      e.preventDefault();
      // Send a message to the background script to mark this tab as the receiver
      console.log("mark target");
      chrome.runtime.sendMessage({ action: "markReceiver", tabId: e.target });
    }
  });


  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "insertText") {
      var textbox = $("#prompt-textarea");
      // console.log($('td[_key="."]'));
      // $('td[_key="."]').click();
      if (textbox && textbox.text() === ".") {
        $(textbox).val('check grammar: \n' + request.text);
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
        let usertext = $(div[i]).closest("article.text-token-text-primary").prev().find("div[data-message-author-role='user']").text();
        usertext = usertext.substring(usertext.indexOf(":") + 1);

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
