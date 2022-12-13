const NOTE_TYPE_KANJI = 'kanji';
const NOTE_TYPE_VOCABULARY = 'vocabulary';
const NOTE_TYPE_CONJUGATION = 'conjugation';
const NOTE_TYPE_KANJI_READING = 'kanji-reading';

if (location.href.startsWith('https://jisho.org/word/')) {
    addSnackbar();
    addWordNoteButtons();

}

if (location.href.startsWith('https://jisho.org/search/') && location.href.endsWith('%20%23kanji')) {
    addSnackbar();
    addKanjiNoteButton()
}

function addSnackbar() {
    const snackbar = document.createElement('div');
    snackbar.id = 'snackbar';
    document.getElementsByTagName('body').item(0).append(snackbar);
}

function showSnackbar(message) {
    const snackbar = document.getElementById("snackbar");
    snackbar.textContent = message;
    snackbar.className = "show";
    setTimeout(
        () => { snackbar.className = snackbar.className.replace("show", ""); },
        3000
    );
}

function addWordNoteButtons() {
    const meaningsWrapper = document.getElementsByClassName('meanings-wrapper').item(0);

    if (meaningsWrapper) {
        childNodes = meaningsWrapper.childNodes
        for (let i = 0; i < childNodes.length; i += 2) {
            const tagsElement = childNodes.item(i);
            const meaningWrapperElement = childNodes.item(i+1);
            const meaningElement = meaningWrapperElement.getElementsByClassName('meaning-meaning').item(0);

            if (meaningElement) {
                const button = WordCardDropdown(
                    tagsElement,
                    meaningElement
                );
                meaningElement.insertAdjacentElement('beforebegin', button);
                meaningElement.parentElement.childNodes.forEach(child => {
                    child.className += ' vertical-align-middle';
                });
            }
        }
    }
}

function addKanjiNoteButton() {
    const meaningsElement = document.getElementsByClassName('kanji-details__main-meanings').item(0);
    const kanjiElement = document.getElementsByClassName('character').item(0);

    if (meaningsElement && kanjiElement) {
        const button = KanjiCardDropdown(
            kanjiElement.textContent,
            meaningsElement.textContent
        );
        meaningsElement.insertAdjacentElement('afterbegin', button);
    }
}

function WordCardDropdown(tagsElement, meaningElement) {
    return Dropdown([
        DropdownAction('Vocabulary Card', (() => { createWordNote(NOTE_TYPE_VOCABULARY, tagsElement, meaningElement) })),
        DropdownAction('Kanji Compound Card', (() => { createWordNote(NOTE_TYPE_KANJI_READING, tagsElement, meaningElement) })),
        DropdownAction('Conjugation Card', (() => { createWordNote(NOTE_TYPE_CONJUGATION, tagsElement, meaningElement) }))
    ]);
}

function KanjiCardDropdown(kanjiTextContent, meaningsTextContent) {
    return Dropdown([
        DropdownAction('Kanji Meaning Card', (() => { createKanjiNote(kanjiTextContent, meaningsTextContent) })),
        DropdownAction('Copy Stroke Order', (() => { copyStrokeOrderDiagramToClipboard() }))
    ]);
}

function Dropdown(actions) {
    const dropdown = document.createElement('div');
    dropdown.className = 'anki-dropdown';

    const dropdownButton = document.createElement('button');
    dropdownButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="#55d726" height="24" width="24">' +
        '<path d="m8.85 17.825 3.15-1.9 3.15 1.925-.825-3.6 2.775-2.4-3.65-.325-1.45-3.4-1.45 3.375-3.65.325' +
        ' 2.775 2.425ZM5.825 22l1.625-7.025L2 10.25l7.2-.625L12 3l2.8 6.625 7.2.625-5.45 4.725L18.175 22 12 ' +
        '18.275ZM12 13.25Z"/>' +
        '</svg>';
    dropdownButton.className = 'anki-dropdown-button';
    dropdown.insertAdjacentElement('afterbegin', dropdownButton);

    const dropdownContent = document.createElement('div')
    dropdownContent.className = 'anki-dropdown-content';
    dropdown.insertAdjacentElement('beforeend', dropdownContent);

    dropdownContent.append(...actions);

    return dropdown;
}

function DropdownAction(title, onClick) {
    const result = document.createElement('a');
    result.textContent = title;
    result.onclick = onClick;
    return result;
}

function createWordNote(noteType, tagsElement, meaningElement) {
    const representation = gatherJapanese();
    // 1. japanese
    const japanese = representation.withFurigana;
    // 2. english
    const english = meaningElement.textContent.trim();
    // 3. type
    const type = tagsElement.textContent.trim();
    // 4. jlpt-level
    const jlptLevel = getJlptLevel();

    const basicFields = `${japanese}\t${english}\t${type}\t${jlptLevel}`;
    let conjugations = [];
    if (NOTE_TYPE_CONJUGATION === noteType) {
        // 5... Conjugations
        const conjugationItems = gatherConjugations(type);
         conjugations = conjugationItems.join('\t');
        if (type.includes('verb')) {
            noteType = 'verb-'+ noteType;
        } else if (type.includes('adjective')) {
            noteType = 'adjective-'+ noteType;
        }
    }

    const csv = [basicFields, conjugations].join('\t').trimEnd();
    const url = `${location.href}#:~:text=${english}`
    const summary = `${representation.withoutFurigana} - ${english}`;
    saveNote(noteType, summary, url, csv)
}

function noteTypeFromTags(tags) {
    if (tags.toLocaleLowerCase().includes('adjective')) {
        'adjective'
    }

    if (tags.toLocaleLowerCase().includes('verb')) {
        'verb'
    }

    return 'word';
}

function trimString(string, limit) {
    return string.length > limit ?
        string.substring(0, limit - 3) + "..." :
        string;
}

function saveNote(noteType, summary, url, csv) {
    chrome.storage.local.get(["ankiNotes"], function(result) {

        let notes = [];
        if ('ankiNotes' in result) {
            notes = result.ankiNotes;
        }
        notes.push({
            'type': noteType,
            'summary': summary,
            'url': url,
            'csv': csv
        });

        chrome.storage.local.set({ "ankiNotes": notes }, function() {
            showSnackbar('Your note has been saved!');
        });
    });
}

function gatherJapanese() {
    const representationElement = document.getElementsByClassName('concept_light-representation').item(0);
    const furiganaElement = representationElement.getElementsByClassName('furigana').item(0);
    const furiganaSpanElements = furiganaElement.getElementsByTagName('span');
    const kanjiElement = representationElement.getElementsByClassName('text').item(0);
    const kanjis = [...kanjiElement.textContent.trim()];

    const result = [];
    for (let i = 0; i < kanjis.length; i++) {
        let furigana = furiganaSpanElements.item(i).textContent.trim();
        furigana = furigana.length === 0 ? ' ' : furigana;
        const kanji = kanjis[i]

        result.push(`${kanji}[${furigana}]`);
    }

    const withFurigana = result.join('');
    const withoutFurigana =  kanjis.join('');
    return { withFurigana, withoutFurigana };
}

function getJlptLevel() {
    const conceptTagElements = document.getElementsByClassName('concept_light-tag');
    for (let element of conceptTagElements) {

        if (element.textContent.trim().toLocaleLowerCase().startsWith('jlpt')) {
            return element.textContent.trim().slice(-2);
        }
    }

    return '';
}

function gatherConjugations(type) {
    const showInflectionsElement = document.getElementsByClassName('show_inflection_table').item(0);
    if (showInflectionsElement) {
        showInflectionsElement.click();

        let inflectionTableElement;
        while (!inflectionTableElement) {
            inflectionTableElement = document.getElementsByClassName('inflection_table').item(0);
        }
        const tableBodyElement = inflectionTableElement.getElementsByTagName('tbody').item(1);
        const tableRowElements = tableBodyElement.getElementsByTagName('tr');

        let result = [];
        for (let i = 0; i < tableRowElements.length; i++) {
            const japaneseElements = tableRowElements.item(i).getElementsByClassName('japanese');
            const affirmativeText = japaneseElements.item(0).getElementsByClassName('text').item(0).textContent;
            const negativeText = japaneseElements.item(1).getElementsByClassName('text').item(0).textContent;
            result.push(affirmativeText);
            result.push(negativeText);
        }

        if (type.includes('I-adjective')) {
            result = [
                // non-past-affirmative
                `${result[0]}です`,
                // non-past-negative
                `${result[1]}です`,
                // non-past-short-affirmative
                `${result[0]}`,
                // non-past-short-negative
                `${result[1]}`,
                // past-affirmative
                `${result[2]}です`,
                // past-negative
                `${result[3]}です`,
                // past-short-affirmative
                `${result[2]}`,
                // past-short-negative
                `${result[3]}`,
                // te-form
                `${result[0].slice(0, -1)}くて`
            ];
        }

        setTimeout(() => {
            closeConjugationsModal();
        }, 500);
        return result;
    } else {
        if (type.includes('Na-adjective')) {
            const representationElement = document.getElementsByClassName('concept_light-representation').item(0);
            const japaneseElement = representationElement.getElementsByClassName('text').item(0);
            const adjective = japaneseElement.textContent.trim();
            return [
                // non-past-affirmative
                `${adjective}です`,
                // non-past-negative
                `${adjective}じゃないです`,
                // non-past-short-affirmative
                `${adjective}だ`,
                // non-past-short-negative
                `${adjective}じゃない`,
                // past-affirmative
                `${adjective}でした`,
                // past-negative
                `${adjective}じゃなかったです`,
                // past-short-affirmative
                `${adjective}だった`,
                // past-short-negative
                `${adjective}じゃなかった`,
                // te-form
                `${adjective}で`
            ];
        }
        return [];
    }
}

function closeConjugationsModal() {
    const element = document.getElementsByClassName('close-reveal-modal').item(0);
    if (element) {
        element.click();
    }
}

function createKanjiNote(kanjiTextContent, meaningsTextContent) {
    // 1. kanji
    const kanji = kanjiTextContent.trim();
    // 2. meaning
    const meaning = meaningsTextContent.trim();
    // 3. jlpt-level
    const jlptLevel = getKanjiJlptLevel();
    // 4. stroke-order
    const strokeOrder = getStrokeOrderDiagram()

    getStrokeOrderDiagram();
    const csv = `${kanji}\t${meaning}\t${jlptLevel}\t${strokeOrder}`;
    const summary = `${kanji} - ${meaning}`;
    saveNote(NOTE_TYPE_KANJI, summary, location.href, csv)
}

function getKanjiJlptLevel() {
    const jlptElement = document.getElementsByClassName('jlpt').item(0);
    let result = '';
    if (jlptElement) {
        result = jlptElement.getElementsByTagName("strong").item(0).textContent.trim();
    }

    return result;
}

function getStrokeOrderDiagram() {
    const containerElement = document.getElementsByClassName('stroke_order_diagram--outer_container').item(0);
    return `<div class="stroke_order_diagram--outer_container">${containerElement.innerHTML.trim()}</div>`;
}

function copyStrokeOrderDiagramToClipboard() {
    const strokeOrder = getStrokeOrderDiagram();
    navigator.clipboard.writeText(strokeOrder).then(() => {
        showSnackbar('The stroke order SVG was copied to clipboard!');
    });
}