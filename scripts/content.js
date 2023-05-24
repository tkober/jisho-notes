const NOTE_TYPE_KANJI = 'kanji';
const NOTE_TYPE_VOCABULARY = 'vocabulary';
const NOTE_TYPE_CONJUGATION = 'conjugation';
const NOTE_TYPE_KANJI_READING = 'kanji-reading';
const NOTE_TYPE_KEIGO = 'keigo';

if (location.href.startsWith('https://jisho.org/search/') && location.href.endsWith('%20%23kanji')) {
    addSnackbar();
    addKanjiNoteButton()
} else if (location.href.startsWith('https://jisho.org/word/') || location.href.startsWith('https://jisho.org/search/')) {
    addSnackbar();
    addNoteButtonsToAllConcepts();
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
        () => {
            snackbar.className = snackbar.className.replace("show", "");
        },
        3000
    );
}


function addNoteButtonsToAllConcepts() {
    const conceptElements = document.getElementsByClassName('concept_light');

    for (let conceptElement of conceptElements) {
        addWordNoteButtonsToConcept(conceptElement)
    }
}

function addWordNoteButtonsToConcept(conceptElement) {
    const meaningsWrapper = conceptElement.getElementsByClassName('meanings-wrapper').item(0);
    if (meaningsWrapper) {
        childNodes = meaningsWrapper.childNodes
        for (let i = 0; i < childNodes.length; i += 2) {
            const tagsElement = childNodes.item(i);
            const meaningWrapperElement = childNodes.item(i + 1);
            const meaningElement = meaningWrapperElement.getElementsByClassName('meaning-meaning').item(0);

            if (isOtherForms(tagsElement) || isWikipediaDefinition(tagsElement)) {
                continue;
            }

            if (meaningElement) {
                const button = WordCardDropdown(
                    conceptElement,
                    tagsElement,
                    meaningElement,
                    meaningWrapperElement
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

function WordCardDropdown(conceptElement, tagsElement, meaningElement, meaningsWrapper) {
    let actions = [
        DropdownAction('Vocabulary Note', (() => {
            createWordNote(NOTE_TYPE_VOCABULARY, conceptElement, tagsElement, meaningElement, meaningsWrapper)
        })),
        DropdownAction('Kanji Compound Note', (() => {
            createWordNote(NOTE_TYPE_KANJI_READING, conceptElement, tagsElement, meaningElement, meaningsWrapper)
        }))
    ]

    if (isConjugation(tagsElement)) {
        actions.push(
            DropdownAction('Conjugation Note', (() => {
                createWordNote(NOTE_TYPE_CONJUGATION, conceptElement, tagsElement, meaningElement, meaningsWrapper)
            }))
        );
    }

    if (isKeigo(meaningsWrapper)) {
        actions.push(
            DropdownAction('Keigo Note', (() => {
                createWordNote(NOTE_TYPE_KEIGO, conceptElement, tagsElement, meaningElement, meaningsWrapper)
            }))
        );
    }

    return Dropdown(actions);
}

function KanjiCardDropdown(kanjiTextContent, meaningsTextContent) {
    return Dropdown([
        DropdownAction('Kanji Note', (() => {
            createKanjiNote(kanjiTextContent, meaningsTextContent)
        })),
        DropdownAction('Copy Stroke Order', (() => {
            copyStrokeOrderDiagramToClipboard()
        }))
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

function createWordNote(noteType, conceptElement, tagsElement, meaningElement, meaningsWrapper) {
    const representation = gatherJapanese(conceptElement);
    // 1. japanese
    let japanese = representation.withFurigana;
    // 2. english
    const english = meaningElement.textContent.trim();
    // 3. type
    const type = tagsElement.textContent.trim();
    // 4. jlpt-level
    const jlptLevel = ''
    // 5. supplemental-information
    const supplementalInformation = getSupplementalInformation(meaningsWrapper);

    let additionalFields = [];
    if (NOTE_TYPE_CONJUGATION === noteType) {
        // 6... Conjugations
        const conjugationItems = gatherConjugations(type, conceptElement);
        additionalFields = conjugationItems.join('\t');
        if (type.includes('verb')) {
            noteType = 'verb-' + noteType;
            if (type.toLowerCase().includes('suru verb') && !japanese.endsWith('する')) {
                japanese += 'する';
            }
            if (type.toLowerCase().includes('kuru verb') && !japanese.endsWith('くる')) {
                japanese += 'くる';
            }
        } else if (type.includes('adjective')) {
            noteType = 'adjective-' + noteType;
            if (type.toLowerCase().includes('na-adjective')) {
                japanese += ' (な)';
            }
        }
    }


    if (NOTE_TYPE_KEIGO) {
        if (supplementalInformation.toLowerCase().includes('sonkeigo')) {
            additionalFields = ['Sonkeigo', 'Honorific/Respectful'].join('\t');
        }
        if (supplementalInformation.toLowerCase().includes('kenjougo')) {
            additionalFields = ['Kenjougo', 'Humble'].join('\t');
        }
    }

    const basicFields = `${japanese}\t${english}\t${type}\t${jlptLevel}\t${supplementalInformation}`;
    const csv = [basicFields, additionalFields].join('\t');

    const url = `${location.href}#:~:text=${english}`
    const summary = `${representation.withoutFurigana} - ${english}`;
    saveNote(noteType, summary, url, csv)
}

function saveNote(noteType, summary, url, csv) {
    chrome.storage.local.get(["ankiNotes"], function (result) {

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

        chrome.storage.local.set({"ankiNotes": notes}, function () {
            showSnackbar('Your note has been saved!');
        });
    });
}

function gatherJapanese(conceptElement) {
    const representationElement = conceptElement.getElementsByClassName('concept_light-representation').item(0);
    const furiganaElement = representationElement.getElementsByClassName('furigana').item(0);
    const furiganaSpanElements = furiganaElement.getElementsByTagName('span');
    const kanjiElement = representationElement.getElementsByClassName('text').item(0);
    const kanjis = [...kanjiElement.textContent.trim()];

    const result = [];
    for (let i = 0; i < kanjis.length; i++) {
        let furigana = '';
        if (i < furiganaSpanElements.length) {
            furigana = furiganaSpanElements.item(i).textContent.trim();
        }
        furigana = furigana.length === 0 ? ' ' : furigana;
        const kanji = kanjis[i]

        result.push(`${kanji}[${furigana}]`);
    }

    const withFurigana = result.join('');
    const withoutFurigana = kanjis.join('');
    return {withFurigana, withoutFurigana};
}

function getSupplementalInformation(meaningsWrapper) {
    const element = meaningsWrapper.getElementsByClassName('supplemental_info');
    if (element.length > 0) {
        return element.item(0).textContent.trim();
    }
    return '';
}

function gatherConjugations(type, conceptElement) {
    const showInflectionsElement = conceptElement.getElementsByClassName('show_inflection_table').item(0);
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

        if (type.toLowerCase().includes('i-adjective')) {
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
        const representationElement = conceptElement.getElementsByClassName('concept_light-representation').item(0);
        const japaneseElement = representationElement.getElementsByClassName('text').item(0);
        const japanese = japaneseElement.textContent.trim();

        if (type.toLowerCase().includes('na-adjective')) {
            return naAdjectiveConjugation(japanese);
        }

        if (type.toLowerCase().includes('suru verb')) {
            return suruVerbConjugation(japanese);
        }

        if (type.toLowerCase().includes('kuru verb')) {
            return kuruVerbConjugation(japanese);
        }

        return [];
    }
}

function suruVerbConjugation(japanese) {
    let checked = japanese;
    if (japanese.endsWith('する')) {
        checked = japanese.slice(0, -2);
    }

    return [
        // non-past-affirmative
        `${checked}する`,
        // non-past-negative
        `${checked}しない`,
        // non-past-polite-affirmative
        `${checked}します`,
        // non-past-polite-negative
        `${checked}しません`,
        // past-affirmative
        `${checked}した`,
        // past-negative
        `${checked}しなかった`,
        // past-polite-affirmative
        `${checked}しました`,
        // past-polite-negative
        `${checked}しませんでした`,
        // te-form-affirmative
        `${checked}して`,
        // te-form-negative
        `${checked}しなくて`,
        // potential-affirmative
        `${checked}できる`,
        // potential-negative
        `${checked}できない`,
        // passive-affirmative
        `${checked}される`,
        // passive-negative
        `${checked}されない`,
        // causative-affirmative
        `${checked}させる`,
        // causative-negative
        `${checked}させない`,
        // causative-passive-affirmative
        `${checked}させられる`,
        // causative-passive-negative
        `${checked}させられない`,
        // imperative-affirmative
        `${checked}しる`,
        // imperative-negative
        `${checked}するな`,
    ];
}

function kuruVerbConjugation(japanese) {
    let checked = japanese;
    if (japanese.endsWith('する')) {
        checked = japanese.slice(0, -2);
    }

    return [
        // non-past-affirmative
        `${checked}くる`,
        // non-past-negative
        `${checked}こない`,
        // non-past-polite-affirmative
        `${checked}きます`,
        // non-past-polite-negative
        `${checked}きません`,
        // past-affirmative
        `${checked}きた`,
        // past-negative
        `${checked}こなかった`,
        // past-polite-affirmative
        `${checked}きました`,
        // past-polite-negative
        `${checked}きませんでした`,
        // te-form-affirmative
        `${checked}きて`,
        // te-form-negative
        `${checked}こなくて`,
        // potential-affirmative
        `${checked}こられる`,
        // potential-negative
        `${checked}こられない`,
        // passive-affirmative
        `${checked}こられる`,
        // passive-negative
        `${checked}こられない`,
        // causative-affirmative
        `${checked}こさせる`,
        // causative-negative
        `${checked}こさせない`,
        // causative-passive-affirmative
        `${checked}こさせられる`,
        // causative-passive-negative
        `${checked}こさせられない`,
        // imperative-affirmative
        `${checked}こい`,
        // imperative-negative
        `${checked}くるな`,
    ];
}

function naAdjectiveConjugation(japanese) {
    return [
        // non-past-affirmative
        `${japanese}です`,
        // non-past-negative
        `${japanese}じゃないです`,
        // non-past-short-affirmative
        `${japanese}だ`,
        // non-past-short-negative
        `${japanese}じゃない`,
        // past-affirmative
        `${japanese}でした`,
        // past-negative
        `${japanese}じゃなかったです`,
        // past-short-affirmative
        `${japanese}だった`,
        // past-short-negative
        `${japanese}じゃなかった`,
        // te-form
        `${japanese}で`
    ];
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
    const containerElement = document.getElementsByClassName('stroke_order_diagram--outer_container').item(0)
    const style = '<style>.stroke_order_diagram--outer_container {width: 100%;overflow-x: auto;overflow-y: hidden } ' +
        '.stroke_order_diagram--guide_line {fill: none;stroke: #ddd;stroke-width: 2;stroke-linecap: square;' +
        'stroke-linejoin: square;stroke-dasharray: 5, 5 } .stroke_order_diagram--bounding_box {fill: none;stroke: ' +
        '#ddd;stroke-width: 2;stroke-linecap: square;stroke-linejoin: square } .stroke_order_diagram--current_path {' +
        'fill: none;stroke: #000;stroke-width: 3;stroke-linecap: round;stroke-linejoin: round } ' +
        '.stroke_order_diagram--existing_path {fill: none;stroke: #aaa;stroke-width: 3;stroke-linecap: round;' +
        'stroke-linejoin: round } .stroke_order_diagram--path_start {fill: rgba(255, 0, 0, 0.7);stroke: none}</style>';
    return `${style.trim()}<div class="stroke_order_diagram--outer_container">${containerElement.innerHTML.trim()}</div>`;
}

function copyStrokeOrderDiagramToClipboard() {
    const strokeOrder = getStrokeOrderDiagram();
    navigator.clipboard.writeText(strokeOrder).then(() => {
        showSnackbar('The stroke order SVG was copied to clipboard!');
    });
}

function isConjugation(tagsElement) {
    return tagsElement.textContent.toLowerCase().includes('adjective') || tagsElement.textContent.toLowerCase().includes('verb');
}

function isKeigo(meaningsWrapper) {
    const supplementalInformation = getSupplementalInformation(meaningsWrapper);
    return supplementalInformation.includes('sonkeigo') || supplementalInformation.includes('kenjougo');
}

function isOtherForms(tagsElement) {
    return tagsElement.textContent.trim().toLowerCase() === 'other forms';
}

function isWikipediaDefinition(tagsElement) {
    return tagsElement.textContent.trim().toLowerCase() === 'wikipedia definition';
}
