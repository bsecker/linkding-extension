import TurndownService from 'turndown';
import { getBrowser, getCurrentTabInfo } from './browser';

var turndownService = new TurndownService({
    headingStyle: "atx",
    hr: "---",
});

function getSelectionHtml() {
    var html = "";
    if (typeof window.getSelection != "undefined") {
        var sel = window.getSelection();
        if (sel.rangeCount) {
            var container = document.createElement("div");
            for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                container.appendChild(sel.getRangeAt(i).cloneContents());
            }
            html = container.innerHTML;
        }
    } else if (typeof document.selection != "undefined") {
        if (document.selection.type == "Text") {
            html = document.selection.createRange().htmlText;
        }
    }
    return html;
}

function processSelection(selection) {
    var selectedText = selection;
    if (selectedText.toString().length == 0) return;

    var markdown = turndownService.turndown(getSelectionHtml());
    getBrowser().runtime.sendMessage({ action: "highlight", markdown: markdown });
}

function notifyExtension(e) {
    var selectedText = window.getSelection().toString();
    if (selectedText.length > 0) {
        var button = document.createElement("button");
        var uniqueId = "linkding-highlight-button"; // Generate a unique ID
        button.id = uniqueId; // Set the ID of the button
        button.innerHTML = "Highlight";
        button.style.position = "fixed";
        button.style.top = e.clientY + "px";
        button.style.left = e.clientX + "px";
        button.addEventListener("click", function() {
            processSelection(window.getSelection());
            document.body.removeChild(button);
        });
        document.body.appendChild(button);
    }
}

window.addEventListener("mouseup", notifyExtension);

document.addEventListener("click", function(event) {
    var button = document.querySelector("#linkding-highlight-button"); // Use the unique ID in the query selector
    if (button && !button.contains(event.target)) {
        document.body.removeChild(button);
    }
});
