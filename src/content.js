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

function clearSelection() {
    if (window.getSelection) { window.getSelection().removeAllRanges(); }
    else if (document.selection) { document.selection.empty(); }
}

function handleMouseUp(e) {
    var selectedText = window.getSelection().toString();

    var existingButton = document.querySelector("#linkding-highlight-button");
    console.log("Existing button", existingButton);

    // If the button exists and the click is not on the button, remove the button
    console.log("target", e.target);
    if (existingButton && e.target !== existingButton) {
        console.log("removing button")
        clearSelection()
        document.body.removeChild(existingButton);
        return
    }

    // otherwise, create the button
    if (selectedText.length > 0) {
        var button = document.createElement("button");
        var uniqueId = "linkding-highlight-button";
        button.id = uniqueId; // Assign the unique ID
        button.innerHTML = "Highlight";
        button.style.position = "fixed";
        button.style.top = e.clientY + "px";
        button.style.left = e.clientX + "px";
        button.addEventListener("click", function () {
            processSelection(window.getSelection());
            document.body.removeChild(button);
            clearSelection();
        });
        if (!existingButton) document.body.appendChild(button);
    }
}

document.addEventListener("mouseup", handleMouseUp);

// document.addEventListener("click", function(event) {
//     // event.preventDefault();
//     var button = document.querySelector("#linkding-highlight-button"); // Use the unique ID in the query selector
//     console.log(button);
//     if (button && !button.contains(event.target)) {
//         document.body.removeChild(button);
//     }
// });
