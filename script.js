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
        // html[x] = '<ins style="background-color: #62ff62; color:black">' + text + '</ins>';
        html[x] = '<ins style="color:#62ff62">' + text + '</ins>';
        break;
      case DIFF_DELETE:
        // html[x] = '<del style="background-color: #ff5151; color:black">' + text + '</del>';
        html[x] = '<del style="color:#ff5151">' + text + '</del>';
        break;
      case DIFF_EQUAL:
        html[x] = '<span>' + text + '</span>';
        break;
    }
  }
  return html.join('');
};

var isReceiverTab = false;

var selectedText = "";
var watch = 0;
var cursor;
function sendToGPT(prompt, text) {
  const ctext = "<p>" + prompt + ":</p><p>" + text + "</p>";
  chrome.runtime.sendMessage({ action: "textSelected", text: ctext });
  console.log(`${ctext} message sent`);
}
function popupDiv(e) {
  if ($("#popup-div").length == 0) {
    let popupDiv = $("<div id='popup-div' class='bg-white shadow-lg rounded p-2'></div>");
    popupDiv.css({
      position: "absolute",
      zIndex: 1000,
      display: "flex",
      flexDirection: "column",
      gap: "2px"
    });

    let sharedStyle = 'padding: 0px 5px; margin: 2px 0; border-radius: 4px;';
    // Button configurations
    const buttons = [
      { id: 'check-grammar-button', text: 'Check Grammar', style: 'background-color: #3b82f6; color: white;' + sharedStyle },
      { id: 'refine-button', text: 'Refine', style: 'background-color: #10b981; color: white;' + sharedStyle },
      { id: 'make-concise-button', text: 'Make Concise', style: 'background-color: #f97316; color: white;' + sharedStyle },
    ];

    // Create buttons dynamically
    buttons.forEach(({ id, text, style }) => {
      let button = $(`<button id='${id}'>${text}</button>`);
      button.attr('style', style); // Apply inline styles directly
      button.data('action', text); // Store action in data attribute
      popupDiv.append(button);
    });

    $("body").append(popupDiv);
  }

  let popupDiv = $("#popup-div");
  popupDiv.css({
    left: e.pageX + "px",
    top: e.pageY + "px",
  });
  popupDiv.show();
  // show the popup, and fade out after 5 seconds if the cursor is not on the popup
  setTimeout(function() {
    popupDiv.fadeOut(200);
  }, 3000);

  // Add a single click event listener for all buttons
  $("#popup-div button").off("click").click(function() {
    sendToGPT($(this).data('action'), selectedText);
    popupDiv.hide();
  });
}
$(document).ready(function() {
  const enableMouse = false;
  if (enableMouse) {
    $(document).mousemove(function(e) {
      if (watch == 1) {
        // check if cursor has moved down for 50pixels
        if (e.pageY - cursor.pageY > 30) {
          watch = 0;
          popupDiv(e);
        }
      }
    });

    $(document).mouseup(function(e) {
      // if the url doesn't contain overleaf.com or v26, return
      if (!window.location.href.includes("overleaf.com") && !window.location.href.includes("v26")) {
        return;
      }

      selectedText = "";
      if (window.getSelection) {
        selectedText = window.getSelection().toString();
      } else if (document.selection && document.selection.type != "Control") {
        selectedText = document.selection.createRange().text;
      }
      console.log("selected text:", selectedText);
      if (selectedText.length > 10) {
        watch = 1;
        cursor = e;
        setTimeout(function() {
          watch = 0;
        }, 1000);
      }
    }); 

    $(document).mousedown(function(e) {
      // if it's not clicking on the popup div, hide it
      if (!$(e.target).closest("#popup-div").length) {
        $("#popup-div").hide();
      }
    });
  }
  //
  $(document).keydown(function(e) {
    if (e.key === 'M' && e.shiftKey && e.ctrlKey) {
      // Prevent default action to avoid any conflict with browser shortcuts
      // e.preventDefault();
      // Send a message to the background script to mark this tab as the receiver
      // console.log("mark target");
      chrome.runtime.sendMessage({ action: "markReceiver", tabId: e.target });
      // toggle the receiver tab
      isReceiverTab = !isReceiverTab;
      console.log(isReceiverTab ? "Receiver tab marked" : "Receiver tab unmarked");
    }
    // if ctrl+s or ctrl+r or ctrl+c
    if (e.ctrlKey && (e.key === 's' || e.key === 'r' || e.key === 'c')) {
      var sel = "";
      if (window.getSelection) {
        sel = window.getSelection().toString();
      } else if (document.selection && document.selection.type != "Control") {
        sel = document.selection.createRange().text;
      }
      if (e.key === 's') {
        sendToGPT("make concise", sel);
      } else if (e.key == 'r') {
        sendToGPT("refine", sel); 
      } else if (e.key == 'c') {
        sendToGPT("check grammar", sel);
      }
    }
    // if (e.key === 'c' && e.ctrlKey) {
      // popupDiv(e);
    // }
  });


  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("message received", request);
    if (request.action === "insertText") {
      var textbox = $("#prompt-textarea");
      $(textbox).html(request.text);
      // add 0.5 delay before sending the message
      setTimeout(function() {
        $("button[data-testid='send-button']").click();
      }, 100);
    }
  });


  function updateDiff() {
    // iterate over all div[data-message-author-role='assistant']
    // let div = $("div[data-message-author-role='assistant']");
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
        // let currentblock = $(div[i]).closest("li").prev();

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
        console.log(usertext);
        usertext = usertext.substring(usertext.lastIndexOf(":\n") + 1);
        // usertext = usertext.substring(usertext.lastIndexOf(":") + 1);

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
  console.log("start");
  const observer = new MutationObserver((mutations) => {
    // reset timer and start count down again
    clearTimeout(timer);
    timer = setTimeout(() => {
      console.log("update");
      updateDiff();
    }, 1000);
  });

  observer.observe(document.body, { childList: true, subtree: true });

});
