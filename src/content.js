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
    processSelection(window.getSelection());
}

window.addEventListener("mouseup", notifyExtension);
