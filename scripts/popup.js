document.getElementById('clear-all-button').onclick = clearAllNotes;

chrome.storage.local.get(["ankiNotes"], function(result) {
    let count = 0;
    if ('ankiNotes' in result && result.ankiNotes.length > 0) {
        let notes = result.ankiNotes;
        renderNotes(notes);
        renderDownloadActions(notes);
    } else {
        renderEmptyNotesList();
        disableDropdowns();
    }
});

function renderNotes(notes) {
    const notesList = document.getElementById('notes-list');
    notesList.innerHTML = '';

    const template = document.getElementById("li_template");
    const listItemElements = [];
    for (let i = 0; i < notes.length; i++) {
        const element = template.content.firstElementChild.cloneNode(true);
        element.querySelector('.note-type').textContent = notes[i].type;

        const summaryElement = element.querySelector('.summary');
        summaryElement.textContent = notes[i].summary;
        summaryElement.onclick = (() => { openNoteUrl(notes[i]) });

        const deleteElement = element.querySelector('.delete-note-action');
        deleteElement.onclick = (() => { deleteNote(notes, i) });

        listItemElements.push(element);
    }

    notesList.append(...listItemElements);
}

function renderDownloadActions(notes) {
    const notesList = document.getElementById('download-actions');
    let notesByType = groupNotesByType(notes);

    const actions = [
        DownloadAction(`Download All (${notes.length})`, (() => { downloadAll(notesByType); }))
    ];
    const groupNames = Object.keys(notesByType).sort();
    for (let groupName of groupNames) {
        const group = notesByType[groupName];
        const title = transformNoteTypeToTitle(groupName);
        actions.push(DownloadAction(`${title} (${group.length})`, (() => {
            downloadNotes(groupName, group);
        })));
    }

    notesList.append(...actions);
}

function transformNoteTypeToTitle(noteType) {
    let  parts = noteType.split('-');
    parts = parts.map(part => part.charAt(0).toUpperCase() + part.slice(1));
    return parts.join(' ').trim();
}

function DownloadAction(title, onClick) {
    const template = document.getElementById("download-action-template");
    const result = template.content.firstElementChild.cloneNode(true);
    result.textContent = title;
    result.onclick = onClick;

    return result;
}

function groupNotesByType(notes) {
    const result = {};
    for (let note of notes) {

        const type = note.type;
        if (!(type in result)) {
            result[type] = [];
        }
        result[type].push(note.csv);
    }
    return result;
}

function renderEmptyNotesList() {
    const notesList = document.getElementById('notes-list');
    const template = document.getElementById("empty-list-template");
    const element = template.content.firstElementChild.cloneNode(true);
    notesList.insertAdjacentElement('beforebegin', element);
}

function clearAllNotes() {
    if (confirm("Do you really want to delete all your saved notes?")) {
        chrome.storage.local.clear(function() {
            const error = chrome.runtime.lastError;
            location.reload();
            if (error) {
                console.error(error);
            }
        });
    }
}

function downloadAll(notesByType) {
    for (let type in notesByType) {
        downloadNotes(type, notesByType[type]);
    }
}

function downloadNotes(type, notes) {
    const blob = new Blob([notes.join('\n')], {type: "text/csv"});
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
        url: url,
        filename: `${type}.csv`
    });
}

function deleteNote(notes, indexToDelete) {
    const updated = notes.filter((_, index) => index !== indexToDelete);
    chrome.storage.local.set({ "ankiNotes": updated }, function() {
        location.reload();
    });
}

function openNoteUrl(note) {
    window.open(note.url);
}

function disableDropdowns() {
    const dropdowns = document.getElementsByClassName('dropbtn');
    for (let dropdown of dropdowns) {
        dropdown.disabled = true;
    }
}