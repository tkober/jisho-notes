chrome.runtime.onInstalled.addListener(() => {
    updateNoteCountLabel();
});

chrome.runtime.onStartup.addListener(() => {
    updateNoteCountLabel();
});

chrome.storage.local.onChanged.addListener(() => {
    updateNoteCountLabel();
})

function updateNoteCountLabel() {
    chrome.storage.local.get(["ankiNotes"], function(result) {

        let count = 0;
        if ('ankiNotes' in result) {
            count = result.ankiNotes.length;
        }

        chrome.action.setBadgeText({
            text: `${count}`
        });
    });
}

// https://developer.chrome.com/docs/extensions/reference/storage/#event-onChanged